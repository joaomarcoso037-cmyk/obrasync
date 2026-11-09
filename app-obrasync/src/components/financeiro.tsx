import { Check } from 'lucide-react';
import { SeloLancamento } from './selos';
import { dataCurta, dinheiro, hoje } from '../lib/formato';
import { salvar, useDados } from '../lib/store';
import type { Lancamento } from '../lib/tipos';

export const marcarPago = (l: Lancamento) => salvar('lancamentos', { ...l, pago: true, data: hoje() });

export function ListaLancamentos({ itens, onEditar, mostrarObra = true }: { itens: Lancamento[]; onEditar: (l: Lancamento) => void; mostrarObra?: boolean }) {
  const { obras } = useDados();
  return (
    <div className="lista">
      {itens.map((l) => {
        const obra = mostrarObra ? obras.find((o) => o.id === l.obraId)?.nome : '';
        return (
          <div className="linha lanc" key={l.id}>
            <button type="button" className="linha-botao" onClick={() => onEditar(l)}>
              <span className="linha-corpo">
                <strong>{l.descricao}</strong>
                <small>{[dataCurta(l.data), l.categoria, obra].filter(Boolean).join(' · ')}</small>
                <SeloLancamento l={l} />
              </span>
            </button>
            <div className="linha-fim">
              <span className={`valor ${l.tipo === 'entrada' ? 'entra' : 'sai'}`}>
                {l.tipo === 'entrada' ? '+' : '−'} {dinheiro(l.valor)}
              </span>
              {!l.pago && (
                <button type="button" className="icone-botao mini" title={l.tipo === 'entrada' ? 'Marcar como recebido' : 'Marcar como pago'} aria-label={`${l.tipo === 'entrada' ? 'Marcar como recebido' : 'Marcar como pago'}: ${l.descricao}`} onClick={() => marcarPago(l)}>
                  <Check size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
