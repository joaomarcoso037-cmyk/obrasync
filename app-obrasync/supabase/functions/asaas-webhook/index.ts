// Recebe os avisos do Asaas (pagamento feito, vencido, estornado, assinatura removida)
// e atualiza a assinatura da conta. Publicar com --no-verify-jwt: quem chama é o Asaas, não o app.
import { banco, fimDoDia, somarCiclo } from '../_shared/comum.ts';

interface Evento {
  id: string;
  event: string;
  payment?: { id: string; subscription?: string; dueDate: string; status: string; invoiceUrl?: string };
  subscription?: { id: string };
}

const ok = () => new Response('ok', { status: 200 });

async function atualizar(filtro: { coluna: string; valor: string }, campos: Record<string, unknown>) {
  const { error } = await banco
    .from('assinaturas')
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq(filtro.coluna, filtro.valor);
  if (error) throw error;
}

async function tratarCobranca(evento: Evento) {
  const p = evento.payment!;
  if (!p.subscription) return; // cobrança avulsa, fora da mensalidade
  const { data: linha, error } = await banco
    .from('assinaturas')
    .select('user_id, plano, pago_ate')
    .eq('asaas_assinatura', p.subscription)
    .maybeSingle();
  if (error) throw error;
  if (!linha) return; // assinatura antiga, já trocada ou cancelada
  const conta = { coluna: 'user_id', valor: linha.user_id as string };

  switch (evento.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      // Cartão avisa CONFIRMED na hora e RECEIVED semanas depois; Pix avisa só RECEIVED.
      // Os dois levam ao mesmo resultado, então o segundo aviso não muda nada.
      const { data: plano } = await banco.from('planos').select('ciclo').eq('id', linha.plano).single();
      const cobre = fimDoDia(somarCiclo(p.dueDate, plano?.ciclo ?? 'MONTHLY'));
      const atual = linha.pago_ate as string | null;
      const pagoAte = atual && new Date(atual) > new Date(cobre) ? atual : cobre;
      await atualizar(conta, { pago_ate: pagoAte, situacao: 'ativa', link_pagamento: null });
      break;
    }
    case 'PAYMENT_CREATED':
    case 'PAYMENT_UPDATED':
      if (p.status === 'PENDING' && p.invoiceUrl) await atualizar(conta, { link_pagamento: p.invoiceUrl });
      break;
    case 'PAYMENT_OVERDUE':
      await atualizar(conta, { situacao: 'atrasada', link_pagamento: p.invoiceUrl ?? null });
      break;
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED': {
      // Dinheiro devolvido: o período dessa cobrança deixa de estar pago.
      const ate = fimDoDia(p.dueDate);
      const atual = linha.pago_ate as string | null;
      if (atual && new Date(atual) > new Date(ate)) await atualizar(conta, { pago_ate: ate, situacao: 'atrasada' });
      break;
    }
  }
}

async function tratar(evento: Evento) {
  if (evento.payment) return tratarCobranca(evento);
  if (evento.subscription && (evento.event === 'SUBSCRIPTION_DELETED' || evento.event === 'SUBSCRIPTION_INACTIVATED')) {
    // Assinatura removida pelo painel do Asaas. O tempo já pago continua valendo.
    await atualizar({ coluna: 'asaas_assinatura', valor: evento.subscription.id }, {
      situacao: 'cancelada', asaas_assinatura: null, link_pagamento: null,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  const segredo = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
  if (!segredo || req.headers.get('asaas-access-token') !== segredo) return new Response('', { status: 401 });

  const evento = (await req.json().catch(() => null)) as Evento | null;
  if (!evento?.id || !evento.event) return ok();

  // O Asaas pode mandar o mesmo aviso mais de uma vez.
  const { data: visto } = await banco.from('eventos_asaas').select('id').eq('id', evento.id).maybeSingle();
  if (visto) return ok();

  try {
    await tratar(evento);
  } catch (erro) {
    // Resposta de erro faz o Asaas tentar de novo mais tarde.
    console.error('Falha ao tratar', evento.event, evento.id, erro);
    return new Response('erro', { status: 500 });
  }
  await banco.from('eventos_asaas').insert({ id: evento.id, tipo: evento.event, dados: evento });
  return ok();
});
