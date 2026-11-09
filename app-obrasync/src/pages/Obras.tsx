import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, CalendarDays, CircleDollarSign, FileText, HardHat, Plus, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { Cabecalho, Numero, Progresso, Vazio } from '../components/ui';
import { SeloObra, SeloOrcamento } from '../components/selos';
import { ListaLancamentos } from '../components/financeiro';
import { FormCompromisso, FormLancamento, FormObra } from '../components/formularios';
import { resumoObra, totalOrcamento } from '../lib/calculos';
import { dataAmigavel, dataCurta, dinheiro, hoje } from '../lib/formato';
import { salvar, useDados } from '../lib/store';
import { STATUS_OBRA, type Lancamento, type Obra, type StatusObra } from '../lib/tipos';

type Filtro = 'ativas' | StatusObra;

export function Obras() {
  const d = useDados();
  const [novo, setNovo] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('ativas');

  const lista = d.obras.filter((o) => (filtro === 'ativas' ? o.status !== 'concluida' : o.status === filtro));
  const filtros: [Filtro, string][] = [['ativas', 'Ativas'], ...(Object.entries(STATUS_OBRA) as [StatusObra, string][])];

  return (
    <>
      <Cabecalho
        titulo="Obras"
        subtitulo="Como está cada obra, sem procurar em vários lugares"
        acao={<button className="botao principal" onClick={() => setNovo(true)}><Plus size={18} aria-hidden="true" /> Nova obra</button>}
      />
      <div className="chips" role="group" aria-label="Filtrar obras">
        {filtros.map(([k, v]) => <button key={k} className={`chip${filtro === k ? ' ativo' : ''}`} onClick={() => setFiltro(k)}>{v}</button>)}
      </div>
      {lista.length === 0 ? (
        <section className="cartao"><Vazio icone={Building2} titulo="Nenhuma obra aqui" texto="Cadastre uma obra para acompanhar andamento e dinheiro." /></section>
      ) : (
        <div className="grade-lista">
          {lista.map((o) => {
            const r = resumoObra(d, o);
            return (
              <Link className="cartao ficha" key={o.id} to={`/obras/${o.id}`}>
                <div className="ficha-topo"><strong>{o.nome}</strong><SeloObra status={o.status} /></div>
                <small>{d.clientes.find((c) => c.id === o.clienteId)?.nome}{o.previsao ? ` · entrega ${dataCurta(o.previsao)}` : ''}</small>
                <Progresso valor={o.progresso} />
                <small>{o.progresso}% concluída · falta receber <b>{dinheiro(r.aReceber)}</b></small>
              </Link>
            );
          })}
        </div>
      )}
      {novo && <FormObra onFechar={() => setNovo(false)} />}
    </>
  );
}

export function ObraDetalhe() {
  const d = useDados();
  const { id } = useParams();
  const navegar = useNavigate();
  const obra = d.obras.find((o) => o.id === id);
  const [editando, setEditando] = useState(false);
  const [lancamento, setLancamento] = useState<{ inicial?: Lancamento; tipo?: Lancamento['tipo'] } | null>(null);
  const [compromisso, setCompromisso] = useState(false);

  if (!obra) {
    return <section className="cartao"><Vazio icone={Building2} titulo="Obra não encontrada" acao={<Link className="botao" to="/obras">Voltar para obras</Link>} /></section>;
  }

  const r = resumoObra(d, obra);
  const cliente = d.clientes.find((c) => c.id === obra.clienteId);
  const lancamentos = d.lancamentos.filter((l) => l.obraId === obra.id).sort((a, b) => b.data.localeCompare(a.data));
  const equipe = d.funcionarios.filter((f) => f.obraIds.includes(obra.id));
  const orcamentos = d.orcamentos.filter((o) => o.obraId === obra.id);
  const compromissos = d.compromissos.filter((c) => c.obraId === obra.id && !c.concluido);
  const atualizar = (p: Partial<Obra>) => salvar('obras', { ...obra, ...p });
  const atrasada = obra.status !== 'concluida' && obra.previsao && obra.previsao < hoje();

  return (
    <>
      <Cabecalho
        titulo={obra.nome}
        subtitulo={[cliente?.nome, obra.endereco].filter(Boolean).join(' · ')}
        voltar="/obras"
        acao={<button className="botao" onClick={() => setEditando(true)}>Editar obra</button>}
      />

      <section className="cartao ficha">
        <div className="ficha-topo">
          <span><SeloObra status={obra.status} /> {atrasada && <span className="selo ruim">Entrega atrasada</span>}</span>
          <small>{dataCurta(obra.inicio)} até {dataCurta(obra.previsao)}</small>
        </div>
        <label className="campo">
          <span>Progresso: {obra.progresso}%</span>
          <input type="range" min={0} max={100} step={5} value={obra.progresso} onChange={(e) => atualizar({ progresso: Number(e.target.value) })} />
        </label>
        {obra.observacoes && <small>{obra.observacoes}</small>}
      </section>

      <section className="numeros" aria-label="Dinheiro da obra">
        <Numero icone={Wallet} valor={dinheiro(r.contratado)} rotulo="Valor contratado" />
        <Numero icone={CircleDollarSign} valor={dinheiro(r.aReceber)} rotulo={`Falta receber (recebido ${dinheiro(r.recebido)})`} />
        <Numero icone={Receipt} valor={dinheiro(r.gastoPago + r.gastoPrevisto)} rotulo="Gastos da obra" />
        <Numero icone={TrendingUp} valor={dinheiro(r.resultadoEstimado)} rotulo="Sobra estimada" negativo={r.resultadoEstimado < 0} />
      </section>

      <section className="cartao">
        <div className="cartao-topo">
          <h2>Dinheiro da obra</h2>
          <div className="botoes">
            <button className="botao mini" onClick={() => setLancamento({ tipo: 'entrada' })}>+ Recebimento</button>
            <button className="botao mini" onClick={() => setLancamento({ tipo: 'saida' })}>+ Gasto</button>
          </div>
        </div>
        {lancamentos.length === 0 ? (
          <Vazio icone={Wallet} titulo="Nada lançado nesta obra" />
        ) : (
          <ListaLancamentos itens={lancamentos} mostrarObra={false} onEditar={(l) => setLancamento({ inicial: l })} />
        )}
      </section>

      <div className="grade-2">
        <section className="cartao">
          <div className="cartao-topo"><h2>Equipe na obra</h2><Link to="/equipe" className="botao mini">Ver equipe</Link></div>
          {equipe.length === 0 ? <Vazio icone={HardHat} titulo="Ninguém ligado a esta obra" /> : (
            <div className="lista">
              {equipe.map((f) => (
                <Link className="linha" key={f.id} to={`/equipe/${f.id}`}>
                  <span className="linha-corpo"><strong>{f.nome}</strong><small>{f.funcao}</small></span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <div className="pilha">
          <section className="cartao">
            <div className="cartao-topo"><h2>Compromissos</h2><button className="botao mini" onClick={() => setCompromisso(true)}>+ Marcar</button></div>
            {compromissos.length === 0 ? <Vazio icone={CalendarDays} titulo="Nada marcado" /> : (
              <div className="lista">
                {compromissos.map((c) => (
                  <Link className="linha" key={c.id} to="/agenda">
                    <span className="linha-corpo"><strong>{c.titulo}</strong><small>{dataAmigavel(c.data)}{c.hora ? ` às ${c.hora}` : ''}</small></span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          {orcamentos.length > 0 && (
            <section className="cartao">
              <h2 style={{ marginBottom: 8 }}><FileText size={16} aria-hidden="true" /> Orçamentos</h2>
              <div className="lista">
                {orcamentos.map((o) => (
                  <Link className="linha" key={o.id} to={`/orcamentos/${o.id}`}>
                    <span className="linha-corpo"><strong>{o.titulo}</strong><small>{dinheiro(totalOrcamento(o))}</small></span>
                    <span className="linha-fim"><SeloOrcamento status={o.status} /></span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {editando && <FormObra inicial={obra} onFechar={() => setEditando(false)} onExcluido={() => navegar('/obras')} />}
      {lancamento && (
        <FormLancamento
          inicial={lancamento.inicial}
          preset={{ tipo: lancamento.tipo, obraId: obra.id }}
          onFechar={() => setLancamento(null)}
        />
      )}
      {compromisso && <FormCompromisso preset={{ obraId: obra.id }} onFechar={() => setCompromisso(false)} />}
    </>
  );
}
