/** Valores em dinheiro são sempre centavos inteiros. Datas são 'AAAA-MM-DD'. */

export interface Empresa {
  nome: string;
  telefone: string;
  documento: string;
  endereco: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  observacoes: string;
}

export type StatusObra = 'planejada' | 'andamento' | 'pausada' | 'concluida';

export interface Obra {
  id: string;
  nome: string;
  endereco: string;
  clienteId: string;
  valorContratado: number;
  inicio: string;
  previsao: string;
  status: StatusObra;
  progresso: number;
  observacoes: string;
}

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
export type TipoItem = 'servico' | 'material';

export interface ItemOrcamento {
  id: string;
  tipo: TipoItem;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
}

export interface Orcamento {
  id: string;
  numero: number;
  titulo: string;
  clienteId: string;
  obraId: string;
  data: string;
  validade: string;
  itens: ItemOrcamento[];
  desconto: number;
  status: StatusOrcamento;
  observacoes: string;
}

export type TipoLancamento = 'entrada' | 'saida';

/** Dinheiro que entrou ou saiu. `pago: false` é conta a receber ou a pagar. */
export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  pago: boolean;
  categoria: string;
  obraId: string;
  funcionarioId: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  funcao: string;
  telefone: string;
  obraIds: string[];
  ativo: boolean;
}

export type TipoCompromisso = 'visita' | 'reuniao' | 'prazo' | 'outro';

export interface Compromisso {
  id: string;
  titulo: string;
  tipo: TipoCompromisso;
  data: string;
  hora: string;
  obraId: string;
  observacoes: string;
  concluido: boolean;
}

export interface Dados {
  versao: 1;
  empresa: Empresa;
  clientes: Cliente[];
  obras: Obra[];
  orcamentos: Orcamento[];
  lancamentos: Lancamento[];
  funcionarios: Funcionario[];
  compromissos: Compromisso[];
  proximoOrcamento: number;
}

export type Colecao = 'clientes' | 'obras' | 'orcamentos' | 'lancamentos' | 'funcionarios' | 'compromissos';

export const STATUS_OBRA: Record<StatusObra, string> = {
  planejada: 'Planejada',
  andamento: 'Em andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

export const STATUS_ORCAMENTO: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export const TIPOS_COMPROMISSO: Record<TipoCompromisso, string> = {
  visita: 'Visita',
  reuniao: 'Reunião',
  prazo: 'Prazo',
  outro: 'Outro',
};

export const CATEGORIAS_SAIDA = ['Material', 'Mão de obra', 'Transporte', 'Aluguel de equipamento', 'Impostos e taxas', 'Outros'];
export const CATEGORIAS_ENTRADA = ['Pagamento de cliente', 'Adiantamento', 'Outros'];
