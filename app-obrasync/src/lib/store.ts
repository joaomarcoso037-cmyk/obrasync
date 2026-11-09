import { useSyncExternalStore } from 'react';
import { semObra, VAZIO } from './regras';
import type { Cliente, Colecao, Dados, Obra, Orcamento } from './tipos';
import { hoje, novoId } from './formato';

let estado: Dados = VAZIO;
let aoMudar: ((d: Dados) => void) | null = null;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((o) => o());

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Abre os dados de uma conta. Daqui em diante, cada mudança vai para `observador`. */
export function abrirDados(dados: Dados, observador: (d: Dados) => void) {
  estado = dados;
  aoMudar = observador;
  avisar();
}

/** Limpa a memória ao sair, para a próxima conta no aparelho não ver nada da anterior. */
export function fecharDados() {
  estado = VAZIO;
  aoMudar = null;
  avisar();
}

/** Dados vindos de outro aparelho: mostra na tela sem mandar de volta para a nuvem. */
export function receberDados(dados: Dados) {
  estado = dados;
  avisar();
}

export function mudar(fn: (d: Dados) => Dados) {
  estado = fn(estado);
  aoMudar?.(estado);
  avisar();
}

export const useDados = () => useSyncExternalStore(assinar, () => estado);

export function salvar<C extends Colecao>(colecao: C, item: Dados[C][number]) {
  mudar((d) => {
    const lista = d[colecao] as { id: string }[];
    const existe = lista.some((x) => x.id === item.id);
    return { ...d, [colecao]: existe ? lista.map((x) => (x.id === item.id ? item : x)) : [item, ...lista] };
  });
}

export function remover(colecao: Colecao, id: string) {
  mudar((d) => (colecao === 'obras' ? semObra(d, id) : { ...d, [colecao]: (d[colecao] as { id: string }[]).filter((x) => x.id !== id) }));
}

export function novoCliente(nome: string): string {
  const cliente: Cliente = { id: novoId(), nome: nome.trim(), telefone: '', endereco: '', observacoes: '' };
  salvar('clientes', cliente);
  return cliente.id;
}

/** Reserva o número do orçamento só ao salvar, para rascunho cancelado não pular número. */
export function salvarOrcamento(o: Orcamento): Orcamento {
  let salvo = o;
  mudar((d) => {
    if (d.orcamentos.some((x) => x.id === o.id)) {
      return { ...d, orcamentos: d.orcamentos.map((x) => (x.id === o.id ? o : x)) };
    }
    salvo = { ...o, numero: d.proximoOrcamento };
    return { ...d, orcamentos: [salvo, ...d.orcamentos], proximoOrcamento: d.proximoOrcamento + 1 };
  });
  return salvo;
}

/** Orçamento aprovado vira obra, já com cliente e valor; os dois ficam ligados. */
export function criarObraDoOrcamento(o: Orcamento, valor: number): string {
  const obra: Obra = {
    id: novoId(),
    nome: o.titulo,
    endereco: '',
    clienteId: o.clienteId,
    valorContratado: valor,
    inicio: hoje(),
    previsao: '',
    status: 'planejada',
    progresso: 0,
    observacoes: '',
  };
  mudar((d) => ({
    ...d,
    obras: [obra, ...d.obras],
    orcamentos: d.orcamentos.map((x) => (x.id === o.id ? { ...x, obraId: obra.id, status: 'aprovado' } : x)),
  }));
  return obra.id;
}

export const substituirDados = (d: Dados) => mudar(() => d);
