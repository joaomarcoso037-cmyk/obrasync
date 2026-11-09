import type { Dados } from './tipos';

export const VAZIO: Dados = {
  versao: 1,
  empresa: { nome: '', telefone: '', documento: '', endereco: '' },
  clientes: [],
  obras: [],
  orcamentos: [],
  lancamentos: [],
  funcionarios: [],
  compromissos: [],
  proximoOrcamento: 1,
};

const LISTAS = ['clientes', 'obras', 'orcamentos', 'lancamentos', 'funcionarios', 'compromissos'] as const;

/** Valida um backup antes de ele substituir os dados. Devolve null se não for do ObraSync. */
export function lerBackup(bruto: unknown): Dados | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const b = bruto as Partial<Dados>;
  if (b.versao !== 1 || !LISTAS.every((k) => Array.isArray(b[k]))) return null;
  return { ...VAZIO, ...b, empresa: { ...VAZIO.empresa, ...b.empresa } };
}

/** Motivo que impede excluir o cliente, ou null se puder. */
export function bloqueioCliente(d: Dados, id: string): string | null {
  if (d.obras.some((o) => o.clienteId === id)) return 'Este cliente tem obras cadastradas. Exclua as obras primeiro.';
  if (d.orcamentos.some((o) => o.clienteId === id)) return 'Este cliente tem orçamentos cadastrados. Exclua os orçamentos primeiro.';
  return null;
}

/** Motivo que impede excluir o funcionário, ou null se puder. */
export function bloqueioFuncionario(d: Dados, id: string): string | null {
  if (d.lancamentos.some((l) => l.funcionarioId === id)) {
    return 'Este funcionário tem pagamentos no histórico. Marque como inativo para preservar o financeiro.';
  }
  return null;
}

/** Exclui a obra; o dinheiro já lançado continua no financeiro, só perde o vínculo. */
export function semObra(d: Dados, id: string): Dados {
  return {
    ...d,
    obras: d.obras.filter((o) => o.id !== id),
    lancamentos: d.lancamentos.map((l) => (l.obraId === id ? { ...l, obraId: '' } : l)),
    compromissos: d.compromissos.map((c) => (c.obraId === id ? { ...c, obraId: '' } : c)),
    orcamentos: d.orcamentos.map((o) => (o.obraId === id ? { ...o, obraId: '' } : o)),
    funcionarios: d.funcionarios.map((f) => ({ ...f, obraIds: f.obraIds.filter((x) => x !== id) })),
  };
}
