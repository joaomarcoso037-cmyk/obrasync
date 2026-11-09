import { useSyncExternalStore } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { lerBackup, VAZIO } from './regras';
import { abrirDados, fecharDados, receberDados } from './store';
import type { Dados } from './tipos';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Sem as variáveis, o app roda só no navegador. É o modo dos testes automáticos. */
export const nuvemAtiva = !!url && !!chave;
export const supabase: SupabaseClient | null = nuvemAtiva
  ? createClient(url!, chave!, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
  : null;

export type Situacao = 'ok' | 'salvando' | 'offline' | 'conflito';

const ESPERA_MS = 800;
const NOVA_TENTATIVA_MS = 5000;
const CHAVE_LOCAL = 'obrasync:v1';
const chaveCache = (id: string) => `obrasync:conta:${id}`;

interface Cache {
  dados: Dados;
  versao: number;
  pendente: boolean;
}

let situacao: Situacao = 'ok';
let conta: { id: string; versao: number } | null = null;
let pendente: Dados | null = null;
let enviando = false;
let relogio: ReturnType<typeof setTimeout> | undefined;
const ouvintes = new Set<() => void>();

function mudarSituacao(s: Situacao) {
  situacao = s;
  ouvintes.forEach((o) => o());
}

export const useSituacao = () => useSyncExternalStore((o) => {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}, () => situacao);

function lerCache(id: string): Cache | null {
  try {
    const texto = localStorage.getItem(chaveCache(id));
    if (!texto) return null;
    const bruto = JSON.parse(texto) as Cache;
    const dados = lerBackup(bruto.dados);
    return dados ? { dados, versao: bruto.versao, pendente: bruto.pendente } : null;
  } catch {
    return null;
  }
}

function gravarCache() {
  if (!conta) return;
  try {
    const dados = pendente ?? cacheAtual;
    localStorage.setItem(chaveCache(conta.id), JSON.stringify({ dados, versao: conta.versao, pendente: !!pendente }));
  } catch {
    // Sem espaço no aparelho: a cópia da nuvem continua valendo.
  }
}

let cacheAtual: Dados = VAZIO;

function agendar(dados: Dados) {
  pendente = dados;
  cacheAtual = dados;
  gravarCache();
  mudarSituacao('salvando');
  clearTimeout(relogio);
  relogio = setTimeout(enviar, ESPERA_MS);
}

async function buscar(id: string) {
  const { data, error } = await supabase!.from('espacos').select('dados, versao').eq('user_id', id).maybeSingle();
  if (error) throw error;
  return data as { dados: unknown; versao: number } | null;
}

/**
 * Grava só se ninguém mexeu desde a última leitura (coluna `versao`). Se outro
 * aparelho salvou antes, a versão dele vale e o usuário é avisado.
 */
async function enviar() {
  if (enviando || !conta || !pendente) return;
  enviando = true;
  const eu = conta;
  const envio = pendente;
  try {
    const { data, error } = await supabase!
      .from('espacos')
      .update({ dados: envio, versao: eu.versao + 1, atualizado_em: new Date().toISOString() })
      .eq('user_id', eu.id)
      .eq('versao', eu.versao)
      .select('versao')
      .maybeSingle();
    if (error) throw error;
    if (conta !== eu) return;

    if (!data) {
      const remoto = await buscar(eu.id);
      const dados = lerBackup(remoto?.dados);
      if (remoto && dados) {
        eu.versao = remoto.versao;
        pendente = null;
        cacheAtual = dados;
        gravarCache();
        receberDados(dados);
        mudarSituacao('conflito');
      }
      return;
    }

    eu.versao = data.versao as number;
    if (pendente === envio) {
      pendente = null;
      gravarCache();
      mudarSituacao('ok');
    } else {
      relogio = setTimeout(enviar, 0);
    }
  } catch {
    if (conta === eu) {
      mudarSituacao('offline');
      relogio = setTimeout(enviar, NOVA_TENTATIVA_MS);
    }
  } finally {
    enviando = false;
  }
}

/** Traz o que outro aparelho salvou quando o usuário volta para o app. */
async function atualizarDoServidor() {
  const eu = conta;
  if (!eu || pendente || enviando || document.visibilityState !== 'visible') return;
  try {
    const remoto = await buscar(eu.id);
    const dados = lerBackup(remoto?.dados);
    if (conta !== eu || pendente || !remoto || !dados || remoto.versao === eu.versao) return;
    eu.versao = remoto.versao;
    cacheAtual = dados;
    gravarCache();
    receberDados(dados);
  } catch {
    // Sem internet: tenta de novo na próxima volta ao app.
  }
}

function aoReconectar() {
  if (pendente) void enviar();
  else void atualizarDoServidor();
}

function avisarSaida(e: BeforeUnloadEvent) {
  if (pendente) e.preventDefault();
}

/** Abre os dados da conta, criando o espaço dela no primeiro acesso. */
export async function abrirConta(id: string) {
  const cache = lerCache(id);
  let dados = cache?.dados ?? VAZIO;
  let versao = cache?.versao ?? 0;
  let aEnviar: Dados | null = null;

  try {
    const remoto = await buscar(id);
    if (!remoto) {
      const { error } = await supabase!.from('espacos').insert({ user_id: id, dados: VAZIO, versao: 1 });
      if (error) throw error;
      dados = VAZIO;
      versao = 1;
    } else if (cache?.pendente && cache.versao === remoto.versao) {
      aEnviar = cache.dados;
    } else {
      dados = lerBackup(remoto.dados) ?? VAZIO;
      versao = remoto.versao;
    }
  } catch (erro) {
    if (!cache) throw erro;
    aEnviar = cache.pendente ? cache.dados : null;
    mudarSituacao('offline');
  }

  conta = { id, versao };
  cacheAtual = dados;
  pendente = null;
  gravarCache();
  abrirDados(dados, agendar);
  if (aEnviar) agendar(aEnviar);

  window.addEventListener('online', aoReconectar);
  window.addEventListener('focus', aoReconectar);
  document.addEventListener('visibilitychange', aoReconectar);
  window.addEventListener('beforeunload', avisarSaida);
}

/** Sai da conta e apaga do aparelho tudo o que era dela. */
export async function fecharConta() {
  window.removeEventListener('online', aoReconectar);
  window.removeEventListener('focus', aoReconectar);
  document.removeEventListener('visibilitychange', aoReconectar);
  window.removeEventListener('beforeunload', avisarSaida);
  clearTimeout(relogio);
  const eu = conta;
  conta = null;
  pendente = null;
  cacheAtual = VAZIO;
  if (eu) {
    try {
      localStorage.removeItem(chaveCache(eu.id));
    } catch {
      // Nada a limpar.
    }
  }
  fecharDados();
  mudarSituacao('ok');
}

/** Modo sem nuvem: dados só neste navegador. */
export function abrirLocal() {
  let dados: Dados = VAZIO;
  try {
    const texto = localStorage.getItem(CHAVE_LOCAL);
    if (texto) dados = lerBackup(JSON.parse(texto)) ?? VAZIO;
  } catch {
    dados = VAZIO;
  }
  abrirDados(dados, (d) => {
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(d));
    } catch {
      mudarSituacao('offline');
    }
  });
}
