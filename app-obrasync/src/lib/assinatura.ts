import { useSyncExternalStore } from 'react';
import { supabase } from './nuvem';

/** Dias de tolerância depois do vencimento antes de bloquear. A mesma regra está em supabase/assinaturas.sql. */
export const TOLERANCIA_DIAS = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

export interface Plano {
  id: 'mensal' | 'anual';
  nome: string;
  valorCentavos: number;
  ciclo: 'MONTHLY' | 'YEARLY';
}

export interface Assinatura {
  plano: string | null;
  testeAte: string;
  pagoAte: string | null;
  cancelada: boolean;
  assinou: boolean;
  linkPagamento: string | null;
}

export type Acesso =
  | { estado: 'teste'; dias: number; ate: Date }
  | { estado: 'em-dia'; ate: Date }
  | { estado: 'atrasada'; dias: number; bloqueiaEm: Date }
  | { estado: 'bloqueada' };

const diasAte = (data: Date, agora: Date) => Math.max(1, Math.ceil((data.getTime() - agora.getTime()) / DIA_MS));

/** Decide se a conta pode usar o app. `dias` conta o dia de hoje: termina amanhã = 1. */
export function calcularAcesso(a: Assinatura, agora: Date = new Date()): Acesso {
  const teste = new Date(a.testeAte);
  const pago = a.pagoAte ? new Date(a.pagoAte) : null;
  if (pago && pago > agora) return { estado: 'em-dia', ate: pago };
  if (teste > agora) return { estado: 'teste', dias: diasAte(teste, agora), ate: teste };
  if (pago) {
    const bloqueiaEm = new Date(pago.getTime() + TOLERANCIA_DIAS * DIA_MS);
    if (bloqueiaEm > agora) return { estado: 'atrasada', dias: diasAte(bloqueiaEm, agora), bloqueiaEm };
  }
  return { estado: 'bloqueada' };
}

/** Confere os dígitos verificadores de um CPF (11 dígitos) ou CNPJ (14 dígitos). */
export function documentoValido(texto: string): boolean {
  const n = texto.replace(/\D/g, '');
  if (n.length !== 11 && n.length !== 14) return false;
  if (/^(\d)\1+$/.test(n)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = pesos.reduce((s, p, i) => s + Number(base[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  if (n.length === 11) {
    const d1 = digito(n, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = digito(n, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === Number(n[9]) && d2 === Number(n[10]);
  }
  const d1 = digito(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(n[12]) && d2 === Number(n[13]);
}

/** Valor de cada mês no plano anual, para comparar com o mensal. */
export const valorPorMes = (p: Plano) => (p.ciclo === 'YEARLY' ? Math.round(p.valorCentavos / 12) : p.valorCentavos);

// --- Leitura da assinatura da conta, compartilhada entre as telas ---

let atual: Assinatura | null | undefined;
let planos: Plano[] = [];
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());
const inscrever = (o: () => void) => {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
};

/** `undefined` enquanto carrega, `null` quando não deu para ler (sem internet). */
export const useAssinatura = () => useSyncExternalStore(inscrever, () => atual);
export const usePlanos = () => useSyncExternalStore(inscrever, () => planos);

export async function carregarAssinatura(): Promise<void> {
  const [linha, lista] = await Promise.all([
    supabase!.from('assinaturas').select('plano, teste_ate, pago_ate, situacao, asaas_assinatura, link_pagamento').maybeSingle(),
    planos.length ? null : supabase!.from('planos').select('id, nome, valor_centavos, ciclo').order('valor_centavos'),
  ]);
  if (lista && !lista.error) {
    planos = (lista.data ?? []).map((p) => ({ id: p.id, nome: p.nome, valorCentavos: p.valor_centavos, ciclo: p.ciclo }));
  }
  if (linha.error || !linha.data) {
    // Sem internet não bloqueia: o banco já impede gravar quando a conta está bloqueada.
    if (atual === undefined) atual = null;
  } else {
    const d = linha.data;
    atual = {
      plano: d.plano,
      testeAte: d.teste_ate,
      pagoAte: d.pago_ate,
      cancelada: d.situacao === 'cancelada',
      assinou: !!d.asaas_assinatura,
      linkPagamento: d.link_pagamento,
    };
  }
  avisar();
}

export function esquecerAssinatura() {
  atual = undefined;
  avisar();
}

async function chamar(corpo: Record<string, unknown>): Promise<{ link?: string | null; mensagem?: string }> {
  const { data, error } = await supabase!.functions.invoke('assinatura', { body: corpo });
  if (error) {
    const resposta = (error as { context?: Response }).context;
    const detalhe = await resposta?.json?.().catch(() => null);
    throw new Error(detalhe?.erro ?? 'Não foi possível concluir agora. Confira sua internet e tente de novo.');
  }
  return data;
}

/** Cria ou troca a assinatura e devolve o link da página de pagamento do Asaas. */
export async function assinar(plano: string, nome: string, documento: string) {
  const r = await chamar({ plano, nome, documento });
  await carregarAssinatura();
  return r;
}

export async function cancelarAssinatura() {
  await chamar({ acao: 'cancelar' });
  await carregarAssinatura();
}
