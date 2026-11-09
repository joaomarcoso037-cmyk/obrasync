import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, CircleDollarSign, FileText, MessageCircle, Phone, Plus, Search, Users } from 'lucide-react';
import { Cabecalho, Numero, Vazio } from '../components/ui';
import { SeloObra, SeloOrcamento } from '../components/selos';
import { FormCliente } from '../components/formularios';
import { resumoCliente, totalOrcamento } from '../lib/calculos';
import { dinheiro, linkWhatsApp } from '../lib/formato';
import { useDados } from '../lib/store';

export function Clientes() {
  const d = useDados();
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const lista = [...d.clientes]
    .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || c.telefone.includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <Cabecalho
        titulo="Clientes"
        subtitulo="Contato e histórico de cada cliente"
        acao={<button className="botao principal" onClick={() => setNovo(true)}><Plus size={18} aria-hidden="true" /> Novo cliente</button>}
      />
      {d.clientes.length > 0 && (
        <label className="campo">
          <span style={{ position: 'absolute', left: -9999 }}>Buscar cliente</span>
          <input type="search" placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      )}
      {lista.length === 0 ? (
        <section className="cartao">
          {d.clientes.length === 0
            ? <Vazio icone={Users} titulo="Nenhum cliente ainda" texto="Cadastre seus clientes para guardar o histórico de cada um." />
            : <Vazio icone={Search} titulo="Nenhum cliente encontrado" />}
        </section>
      ) : (
        <div className="grade-lista">
          {lista.map((c) => {
            const r = resumoCliente(d, c.id);
            return (
              <Link className="cartao ficha" key={c.id} to={`/clientes/${c.id}`}>
                <div className="ficha-topo"><strong>{c.nome}</strong></div>
                <small>{c.telefone || 'Sem telefone'}</small>
                <small>{r.obras.length} {r.obras.length === 1 ? 'obra' : 'obras'}{r.pendente > 0 ? ` · pendente ${dinheiro(r.pendente)}` : ''}</small>
              </Link>
            );
          })}
        </div>
      )}
      {novo && <FormCliente onFechar={() => setNovo(false)} />}
    </>
  );
}

export function ClienteDetalhe() {
  const d = useDados();
  const { id } = useParams();
  const navegar = useNavigate();
  const [editando, setEditando] = useState(false);
  const cliente = d.clientes.find((c) => c.id === id);

  if (!cliente) {
    return <section className="cartao"><Vazio icone={Users} titulo="Cliente não encontrado" acao={<Link className="botao" to="/clientes">Voltar para clientes</Link>} /></section>;
  }

  const r = resumoCliente(d, cliente.id);
  const whatsapp = linkWhatsApp(cliente.telefone);

  return (
    <>
      <Cabecalho
        titulo={cliente.nome}
        subtitulo={cliente.endereco}
        voltar="/clientes"
        acao={<button className="botao" onClick={() => setEditando(true)}>Editar cliente</button>}
      />

      {cliente.telefone && (
        <div className="botoes">
          <a className="botao" href={`tel:${cliente.telefone.replace(/[^\d+]/g, '')}`}><Phone size={18} aria-hidden="true" /> {cliente.telefone}</a>
          {whatsapp && <a className="botao destaque" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> WhatsApp</a>}
        </div>
      )}

      <section className="numeros tres" aria-label="Resumo do cliente">
        <Numero icone={Building2} valor={String(r.obras.length).padStart(2, '0')} rotulo="Obras" />
        <Numero icone={FileText} valor={String(r.orcamentos.length).padStart(2, '0')} rotulo="Orçamentos" />
        <Numero icone={CircleDollarSign} valor={dinheiro(r.pendente)} rotulo="Pendente de pagamento" />
      </section>

      {cliente.observacoes && <section className="cartao"><p>{cliente.observacoes}</p></section>}

      <div className="grade-2">
        <section className="cartao">
          <h2 style={{ marginBottom: 8 }}>Obras e serviços</h2>
          {r.obras.length === 0 ? <Vazio icone={Building2} titulo="Nenhuma obra" /> : (
            <div className="lista">
              {r.obras.map((o) => (
                <Link className="linha" key={o.id} to={`/obras/${o.id}`}>
                  <span className="linha-corpo"><strong>{o.nome}</strong><small>{dinheiro(o.valorContratado)}</small></span>
                  <span className="linha-fim"><SeloObra status={o.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="cartao">
          <h2 style={{ marginBottom: 8 }}>Orçamentos enviados</h2>
          {r.orcamentos.length === 0 ? <Vazio icone={FileText} titulo="Nenhum orçamento" /> : (
            <div className="lista">
              {r.orcamentos.map((o) => (
                <Link className="linha" key={o.id} to={`/orcamentos/${o.id}`}>
                  <span className="linha-corpo"><strong>{o.titulo}</strong><small>{dinheiro(totalOrcamento(o))}</small></span>
                  <span className="linha-fim"><SeloOrcamento status={o.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {editando && <FormCliente inicial={cliente} onFechar={() => setEditando(false)} onExcluido={() => navegar('/clientes')} />}
    </>
  );
}
