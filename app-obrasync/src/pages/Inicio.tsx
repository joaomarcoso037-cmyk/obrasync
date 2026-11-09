import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarDays, CheckCircle2, CircleDollarSign, Receipt, Zap } from 'lucide-react';
import { Cabecalho, Numero, Progresso, Vazio } from '../components/ui';
import { SeloObra } from '../components/selos';
import { FormCliente, FormLancamento, FormObra } from '../components/formularios';
import { eventosAgenda, resumoGeral, resumoMes } from '../lib/calculos';
import { dadosDeExemplo } from '../lib/exemplo';
import { dataAmigavel, dinheiro, hoje } from '../lib/formato';
import { substituirDados, useDados } from '../lib/store';

export function Inicio() {
  const d = useDados();
  const navegar = useNavigate();
  const [modal, setModal] = useState<'obra' | 'cliente' | 'lancamento' | null>(null);

  const agora = hoje();
  const geral = resumoGeral(d);
  const mes = resumoMes(d, agora.slice(0, 7));
  const andamento = d.obras.filter((o) => o.status === 'andamento');
  const concluidas = d.obras.filter((o) => o.status === 'concluida');
  const recentes = [...andamento, ...d.obras.filter((o) => o.status === 'planejada' || o.status === 'pausada')].slice(0, 3);
  const eventos = eventosAgenda(d);
  const proximos = eventos.filter((e) => e.data >= agora).slice(0, 4);
  const atrasadas = d.lancamentos.filter((l) => !l.pago && l.data < agora);
  const novo = d.obras.length === 0 && d.clientes.length === 0;

  return (
    <>
      <Cabecalho titulo={d.empresa.nome || 'Início'} subtitulo={dataAmigavel(agora, '')} />

      {novo && (
        <section className="cartao">
          <Vazio
            icone={Building2}
            titulo="Vamos colocar seu negócio aqui"
            texto="Cadastre sua primeira obra ou veja o ObraSync funcionando com dados de exemplo."
            acao={
              <div className="botoes" style={{ justifyContent: 'center', marginTop: 8 }}>
                <button className="botao principal" onClick={() => setModal('obra')}>Cadastrar primeira obra</button>
                <button className="botao" onClick={() => substituirDados(dadosDeExemplo())}>Ver com dados de exemplo</button>
              </div>
            }
          />
        </section>
      )}

      {atrasadas.length > 0 && (
        <div className="aviso ruim" role="status">
          <AlertTriangle size={20} aria-hidden="true" />
          <span>
            {atrasadas.length === 1 ? '1 conta atrasada' : `${atrasadas.length} contas atrasadas`}.{' '}
            <Link to="/financeiro?filtro=atrasados">Ver no financeiro</Link>
          </span>
        </div>
      )}

      <section className="numeros" aria-label="Resumo">
        <Numero icone={Building2} valor={String(andamento.length).padStart(2, '0')} rotulo="Obras em andamento" para="/obras" />
        <Numero icone={CheckCircle2} valor={String(concluidas.length).padStart(2, '0')} rotulo="Obras concluídas" para="/obras" />
        <Numero icone={CircleDollarSign} valor={dinheiro(geral.aReceber)} rotulo="Total a receber" para="/financeiro" />
        <Numero icone={Receipt} valor={dinheiro(mes.saiu)} rotulo="Despesas do mês" para="/financeiro" />
      </section>

      <div className="grade-2">
        <section className="cartao">
          <div className="cartao-topo">
            <h2>Obras recentes</h2>
            <Link to="/obras" style={{ fontWeight: 700, fontSize: '0.9rem' }}>Ver todas →</Link>
          </div>
          {recentes.length === 0 ? (
            <Vazio icone={Building2} titulo="Nenhuma obra em andamento" />
          ) : (
            <div className="lista">
              {recentes.map((o) => (
                <Link className="linha" key={o.id} to={`/obras/${o.id}`}>
                  <span className="linha-corpo">
                    <strong>{o.nome}</strong>
                    <small>{d.clientes.find((c) => c.id === o.clienteId)?.nome} · {dinheiro(o.valorContratado)}</small>
                    <span style={{ display: 'block', marginTop: 8 }}><Progresso valor={o.progresso} /></span>
                  </span>
                  <span className="linha-fim"><SeloObra status={o.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="pilha">
          <section className="cartao">
            <div className="cartao-topo">
              <h2>Próximos compromissos</h2>
              <Link to="/agenda" style={{ fontWeight: 700, fontSize: '0.9rem' }}>Agenda →</Link>
            </div>
            {proximos.length === 0 ? (
              <Vazio icone={CalendarDays} titulo="Nada marcado" />
            ) : (
              <div className="lista">
                {proximos.map((e) => (
                  <Link className="linha" key={e.id} to={e.link}>
                    <span className="linha-corpo">
                      <strong>{e.titulo}</strong>
                      <small>{dataAmigavel(e.data, agora)}{e.hora ? ` às ${e.hora}` : ''}</small>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="acoes-rapidas">
            <h2><Zap size={18} aria-hidden="true" /> Ações rápidas</h2>
            <div className="botoes">
              <button className="botao sutil" onClick={() => setModal('obra')}>Nova obra</button>
              <button className="botao sutil" onClick={() => setModal('cliente')}>Novo cliente</button>
              <button className="botao sutil" onClick={() => navegar('/orcamentos/novo')}>Novo orçamento</button>
              <button className="botao destaque" onClick={() => setModal('lancamento')}>Lançar dinheiro</button>
            </div>
          </section>
        </div>
      </div>

      {modal === 'obra' && <FormObra onFechar={() => setModal(null)} />}
      {modal === 'cliente' && <FormCliente onFechar={() => setModal(null)} />}
      {modal === 'lancamento' && <FormLancamento onFechar={() => setModal(null)} />}
    </>
  );
}
