// Código compartilhado pelas funções do servidor (rodam na Supabase, em Deno).
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Acesso total ao banco. Só existe no servidor; nunca vai para o app. */
export const banco = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

// Começa no ambiente de testes do Asaas. Para cobrar de verdade, troque ASAAS_URL para https://api.asaas.com/v3
const ASAAS_URL = Deno.env.get('ASAAS_URL') ?? 'https://api-sandbox.asaas.com/v3';
const ASAAS_CHAVE = Deno.env.get('ASAAS_API_KEY') ?? '';

export class ErroAsaas extends Error {}

export async function asaas<T = Record<string, unknown>>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(`${ASAAS_URL}${caminho}`, {
    method: metodo,
    headers: {
      access_token: ASAAS_CHAVE,
      'Content-Type': 'application/json',
      // Obrigatório para contas Asaas criadas a partir de 13/06/2024.
      'User-Agent': 'ObraSync',
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  const json = texto ? JSON.parse(texto) : {};
  if (!resposta.ok) {
    const descricao = json?.errors?.[0]?.description as string | undefined;
    console.error('Asaas', metodo, caminho, resposta.status, texto);
    throw new ErroAsaas(descricao ?? `O Asaas recusou o pedido (${resposta.status}).`);
  }
  return json as T;
}

export interface CobrancaAsaas {
  id: string;
  status: string;
  dueDate: string;
  invoiceUrl: string;
  subscription?: string;
}

/** Próxima cobrança em aberto da assinatura (a mais antiga), com o link de pagamento. */
export async function cobrancaAberta(assinatura: string): Promise<CobrancaAsaas | null> {
  const { data } = await asaas<{ data: CobrancaAsaas[] }>('GET', `/subscriptions/${assinatura}/payments`);
  const abertas = data.filter((c) => c.status === 'PENDING' || c.status === 'OVERDUE');
  abertas.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return abertas[0] ?? null;
}

/** Data de hoje no horário de Brasília, no formato do Asaas (AAAA-MM-DD). */
export function hojeBrasil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** Soma 1 mês ou 1 ano a uma data AAAA-MM-DD. 31/01 + 1 mês vira 28/02 (ou 29/02). */
export function somarCiclo(data: string, ciclo: string): string {
  const [a, m, d] = data.split('-').map(Number);
  const meses = ciclo === 'YEARLY' ? 12 : 1;
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

/** Fim do dia AAAA-MM-DD no horário de Brasília. */
export const fimDoDia = (data: string) => `${data}T23:59:59-03:00`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export const preflight = () => new Response('ok', { headers: CORS });
