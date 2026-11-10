// Chamada pelo app quando o empreiteiro assina, troca de plano, quer o link para pagar ou cancela.
// Fala com o Asaas usando a chave secreta, que nunca sai do servidor.
import { asaas, banco, cobrancaAberta, ErroAsaas, hojeBrasil, preflight, responder } from '../_shared/comum.ts';

class ErroUsuario extends Error {}

interface Linha {
  user_id: string;
  plano: string | null;
  teste_ate: string;
  pago_ate: string | null;
  situacao: string;
  asaas_cliente: string | null;
  asaas_assinatura: string | null;
}

const dataBrasil = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

async function lerLinha(userId: string): Promise<Linha> {
  const { data, error } = await banco.from('assinaturas').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) return data as Linha;
  // Conta criada antes da cobrança existir e sem linha: recebe o teste normal.
  const { data: nova, error: erro } = await banco.from('assinaturas').insert({ user_id: userId }).select('*').single();
  if (erro) throw erro;
  return nova as Linha;
}

async function gravar(userId: string, campos: Record<string, unknown>) {
  const { error } = await banco.from('assinaturas').update({ ...campos, atualizado_em: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw error;
}

async function assinar(user: { id: string; email?: string }, corpo: Record<string, unknown>) {
  const { data: plano } = await banco.from('planos').select('*').eq('id', String(corpo.plano ?? '')).eq('ativo', true).maybeSingle();
  if (!plano) throw new ErroUsuario('Escolha um plano.');

  const linha = await lerLinha(user.id);
  const nome = String(corpo.nome ?? '').trim().slice(0, 100);
  const documento = String(corpo.documento ?? '').replace(/\D/g, '');
  const dadosOk = nome.length >= 2 && (documento.length === 11 || documento.length === 14);

  let cliente = linha.asaas_cliente;
  if (!cliente) {
    if (!dadosOk) throw new ErroUsuario('Preencha o nome e um CPF ou CNPJ válido.');
    const novo = await asaas<{ id: string }>('POST', '/customers', {
      name: nome, cpfCnpj: documento, email: user.email, externalReference: user.id,
    });
    cliente = novo.id;
    await gravar(user.id, { asaas_cliente: cliente });
  } else if (dadosOk) {
    await asaas('PUT', `/customers/${cliente}`, { name: nome, cpfCnpj: documento });
  }

  // Mesmo plano já assinado: só devolve o link da cobrança em aberto.
  if (linha.asaas_assinatura && linha.plano === plano.id) {
    const aberta = await cobrancaAberta(linha.asaas_assinatura);
    await gravar(user.id, { link_pagamento: aberta?.invoiceUrl ?? null });
    return aberta ? { link: aberta.invoiceUrl } : { link: null, mensagem: 'Sua mensalidade está em dia. Nada a pagar agora.' };
  }

  // Troca de plano: encerra a assinatura antiga. O tempo já pago continua valendo.
  if (linha.asaas_assinatura) await asaas('DELETE', `/subscriptions/${linha.asaas_assinatura}`);

  // A primeira cobrança vence no fim do teste ou do período já pago, para ninguém pagar duas vezes.
  const vencimento = [hojeBrasil(), dataBrasil(linha.teste_ate), linha.pago_ate ? dataBrasil(linha.pago_ate) : '']
    .sort()
    .at(-1)!;

  const nova = await asaas<{ id: string }>('POST', '/subscriptions', {
    customer: cliente,
    billingType: 'UNDEFINED', // o empreiteiro escolhe Pix, boleto ou cartão na página de pagamento
    value: plano.valor_centavos / 100,
    nextDueDate: vencimento,
    cycle: plano.ciclo,
    description: `ObraSync, plano ${plano.nome}`,
    externalReference: user.id,
  });

  const aberta = await cobrancaAberta(nova.id).catch(() => null);
  await gravar(user.id, {
    plano: plano.id,
    asaas_assinatura: nova.id,
    link_pagamento: aberta?.invoiceUrl ?? null,
    situacao: linha.situacao === 'cancelada' ? 'ativa' : linha.situacao,
  });
  return aberta
    ? { link: aberta.invoiceUrl }
    : { link: null, mensagem: 'Assinatura criada. O link de pagamento chega no seu e-mail em alguns minutos.' };
}

async function cancelar(userId: string) {
  const linha = await lerLinha(userId);
  if (linha.asaas_assinatura) await asaas('DELETE', `/subscriptions/${linha.asaas_assinatura}`);
  await gravar(userId, { situacao: 'cancelada', asaas_assinatura: null, link_pagamento: null });
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return responder(405, { erro: 'Método não aceito.' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data } = await banco.auth.getUser(token);
  if (!data.user) return responder(401, { erro: 'Sua sessão expirou. Entre na conta de novo.' });

  const corpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    if (corpo.acao === 'cancelar') return responder(200, await cancelar(data.user.id));
    return responder(200, await assinar(data.user, corpo));
  } catch (erro) {
    if (erro instanceof ErroUsuario || erro instanceof ErroAsaas) return responder(400, { erro: erro.message });
    console.error(erro);
    return responder(500, { erro: 'Não foi possível concluir agora. Tente de novo em alguns minutos.' });
  }
});
