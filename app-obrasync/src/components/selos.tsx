import { STATUS_OBRA, STATUS_ORCAMENTO, type Lancamento, type StatusObra, type StatusOrcamento } from '../lib/tipos';
import { hoje } from '../lib/formato';

const TOM_OBRA: Record<StatusObra, string> = { planejada: '', andamento: 'bom', pausada: 'atencao', concluida: '' };
const TOM_ORCAMENTO: Record<StatusOrcamento, string> = { rascunho: '', enviado: 'atencao', aprovado: 'bom', recusado: 'ruim' };

export const SeloObra = ({ status }: { status: StatusObra }) => <span className={`selo ${TOM_OBRA[status]}`}>{STATUS_OBRA[status]}</span>;

export const SeloOrcamento = ({ status }: { status: StatusOrcamento }) => <span className={`selo ${TOM_ORCAMENTO[status]}`}>{STATUS_ORCAMENTO[status]}</span>;

export function SeloLancamento({ l }: { l: Lancamento }) {
  if (l.pago) return <span className="selo bom">{l.tipo === 'entrada' ? 'Recebido' : 'Pago'}</span>;
  if (l.data < hoje()) return <span className="selo ruim">Atrasado</span>;
  return <span className="selo atencao">{l.tipo === 'entrada' ? 'A receber' : 'A pagar'}</span>;
}
