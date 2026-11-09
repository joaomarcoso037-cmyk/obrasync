import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, Check, CircleDollarSign, Flag, Plus, Wallet, type LucideIcon } from 'lucide-react';
import { Cabecalho, Vazio } from '../components/ui';
import { FormCompromisso } from '../components/formularios';
import { eventosAgenda, type Evento, type TipoEvento } from '../lib/calculos';
import { dataAmigavel, hoje } from '../lib/formato';
import { salvar, useDados } from '../lib/store';
import type { Compromisso } from '../lib/tipos';

const ICONES: Record<TipoEvento, LucideIcon> = {
  compromisso: CalendarDays,
  inicio: Building2,
  entrega: Flag,
  receber: CircleDollarSign,
  pagar: Wallet,
};

export function Agenda() {
  const d = useDados();
  const [form, setForm] = useState<{ inicial?: Compromisso } | null>(null);
  const agora = hoje();
  const eventos = eventosAgenda(d);
  const atrasados = eventos.filter((e) => e.data < agora);

  const dias = new Map<string, Evento[]>();
  for (const e of eventos.filter((x) => x.data >= agora)) dias.set(e.data, [...(dias.get(e.data) ?? []), e]);

  function linha(e: Evento) {
    const Icone = ICONES[e.tipo];
    const corpo = (
      <>
        <span className="icone-caixa"><Icone size={18} aria-hidden="true" /></span>
        <span className="linha-corpo">
          <strong>{e.titulo}</strong>
          <small>{[e.hora, e.detalhe].filter(Boolean).join(' · ') || ' '}</small>
        </span>
      </>
    );
    const compromisso = e.tipo === 'compromisso' ? d.compromissos.find((c) => c.id === e.id) : undefined;
    if (!compromisso) return <Link className="linha" style={{ justifyContent: 'flex-start' }} key={e.id} to={e.link}>{corpo}</Link>;
    return (
      <div className="linha" key={e.id}>
        <button type="button" className="linha-botao" onClick={() => setForm({ inicial: compromisso })}>
          {corpo}
        </button>
        <button type="button" className="icone-botao mini" title="Marcar como feito" aria-label={`Marcar como feito: ${e.titulo}`} onClick={() => salvar('compromissos', { ...compromisso, concluido: true })}>
          <Check size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        subtitulo="Visitas, prazos, entregas e pagamentos num lugar só"
        acao={<button className="botao principal" onClick={() => setForm({})}><Plus size={18} aria-hidden="true" /> Novo compromisso</button>}
      />

      {eventos.length === 0 && (
        <section className="cartao"><Vazio icone={CalendarDays} titulo="Agenda livre" texto="Entregas de obras e contas a pagar aparecem aqui sozinhas." /></section>
      )}

      {atrasados.length > 0 && (
        <section className="cartao">
          <h2 style={{ marginBottom: 6, color: 'var(--perigo)' }}>Atrasados</h2>
          <div className="lista">{atrasados.map(linha)}</div>
        </section>
      )}

      {[...dias.entries()].map(([data, itens]) => (
        <section className="cartao" key={data}>
          <h2 className="dia" style={{ marginBottom: 6 }}>{dataAmigavel(data, agora)}</h2>
          <div className="lista">{itens.map(linha)}</div>
        </section>
      ))}

      {form && <FormCompromisso inicial={form.inicial} onFechar={() => setForm(null)} />}
    </>
  );
}
