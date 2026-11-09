import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, FileText, MessageCircle, Plus, Printer, Trash2 } from 'lucide-react';
import { Cabecalho, Campo, CampoDinheiro, Vazio } from '../components/ui';
import { SeloOrcamento } from '../components/selos';
import { SeletorCliente, resolverCliente } from '../components/formularios';
import { subtotalOrcamento, totalOrcamento, valorItem } from '../lib/calculos';
import { dataCurta, dinheiro, hoje, linkWhatsApp, novoId, somarDias } from '../lib/formato';
import { criarObraDoOrcamento, remover, salvar, salvarOrcamento, useDados } from '../lib/store';
import { STATUS_ORCAMENTO, type ItemOrcamento, type Orcamento, type StatusOrcamento, type TipoItem } from '../lib/tipos';

const numeroDoc = (n: number) => `Nº ${String(n).padStart(4, '0')}`;
const vencido = (o: Orcamento) => o.status === 'enviado' && !!o.validade && o.validade < hoje();

export function Orcamentos() {
  const d = useDados();
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState<StatusOrcamento | 'todos'>('todos');
  const lista = d.orcamentos.filter((o) => filtro === 'todos' || o.status === filtro);
  const filtros: [StatusOrcamento | 'todos', string][] = [['todos', 'Todos'], ...(Object.entries(STATUS_ORCAMENTO) as [StatusOrcamento, string][])];

  return (
    <>
      <Cabecalho
        titulo="Orçamentos"
        subtitulo="Propostas com cara profissional, prontas para enviar"
        acao={<button className="botao principal" onClick={() => navegar('/orcamentos/novo')}><Plus size={18} aria-hidden="true" /> Novo orçamento</button>}
      />
      <div className="chips" role="group" aria-label="Filtrar orçamentos">
        {filtros.map(([k, v]) => <button key={k} className={`chip${filtro === k ? ' ativo' : ''}`} onClick={() => setFiltro(k)}>{v}</button>)}
      </div>
      {lista.length === 0 ? (
        <section className="cartao"><Vazio icone={FileText} titulo="Nenhum orçamento aqui" texto="Monte um orçamento com serviços e materiais, e envie ao cliente." /></section>
      ) : (
        <div className="grade-lista">
          {lista.map((o) => (
            <Link className="cartao ficha" key={o.id} to={`/orcamentos/${o.id}`}>
              <div className="ficha-topo"><strong>{o.titulo}</strong><SeloOrcamento status={o.status} /></div>
              <small>{numeroDoc(o.numero)} · {d.clientes.find((c) => c.id === o.clienteId)?.nome}</small>
              <div className="ficha-topo">
                <span className="valor">{dinheiro(totalOrcamento(o))}</span>
                {vencido(o) ? <span className="selo ruim">Vencido</span> : <small>Válido até {dataCurta(o.validade)}</small>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

const itemNovo = (tipo: TipoItem): ItemOrcamento => ({ id: novoId(), tipo, descricao: '', quantidade: 1, precoUnitario: 0 });

export function OrcamentoEditor() {
  const d = useDados();
  const { id } = useParams();
  const navegar = useNavigate();
  const existente = d.orcamentos.find((o) => o.id === id);
  const [f, setF] = useState<Orcamento>(existente ?? {
    id: novoId(), numero: 0, titulo: '', clienteId: '', obraId: '', data: hoje(), validade: somarDias(hoje(), 15),
    itens: [itemNovo('servico')], desconto: 0, status: 'rascunho', observacoes: '',
  });
  const [novoNome, setNovoNome] = useState('');
  const set = (p: Partial<Orcamento>) => setF((a) => ({ ...a, ...p }));
  const setItem = (idItem: string, p: Partial<ItemOrcamento>) => set({ itens: f.itens.map((i) => (i.id === idItem ? { ...i, ...p } : i)) });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!f.itens.some((i) => valorItem(i) > 0)) return window.alert('Adicione pelo menos um item com preço.');
    const salvo = salvarOrcamento({ ...f, clienteId: resolverCliente(f.clienteId, novoNome) });
    navegar(`/orcamentos/${salvo.id}`, { replace: true });
  }

  return (
    <>
      <Cabecalho titulo={existente ? 'Editar orçamento' : 'Novo orçamento'} voltar={existente ? `/orcamentos/${existente.id}` : '/orcamentos'} />
      <form className="pilha" onSubmit={enviar}>
        <section className="cartao form">
          <Campo rotulo="Título do orçamento"><input value={f.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="Ex.: Reforma de cozinha" required autoFocus /></Campo>
          <SeletorCliente valor={f.clienteId} onChange={(clienteId) => set({ clienteId })} novoNome={novoNome} onNovoNome={setNovoNome} />
          <div className="form-2">
            <Campo rotulo="Data"><input type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} required /></Campo>
            <Campo rotulo="Válido até"><input type="date" value={f.validade} min={f.data} onChange={(e) => set({ validade: e.target.value })} required /></Campo>
          </div>
        </section>

        <section className="cartao">
          <h2 style={{ marginBottom: 6 }}>Serviços e materiais</h2>
          {f.itens.map((i) => (
            <div className="item" key={i.id}>
              <div className="item-tipo">
                <Campo rotulo="Tipo">
                  <select value={i.tipo} onChange={(e) => setItem(i.id, { tipo: e.target.value as TipoItem })}>
                    <option value="servico">Serviço</option>
                    <option value="material">Material</option>
                  </select>
                </Campo>
              </div>
              <div className="item-descricao">
                <Campo rotulo="Descrição"><input value={i.descricao} onChange={(e) => setItem(i.id, { descricao: e.target.value })} required /></Campo>
              </div>
              <Campo rotulo="Qtd.">
                <input type="number" min="0.01" step="any" inputMode="decimal" value={i.quantidade} onChange={(e) => setItem(i.id, { quantidade: Number(e.target.value) })} required />
              </Campo>
              <CampoDinheiro rotulo="Preço unitário" valor={i.precoUnitario} onChange={(precoUnitario) => setItem(i.id, { precoUnitario })} />
              <div className="total-item" aria-label="Total do item">{dinheiro(valorItem(i))}</div>
              <button
                type="button"
                className="icone-botao mini item-remover"
                aria-label={`Remover ${i.descricao || 'item'}`}
                disabled={f.itens.length === 1}
                onClick={() => set({ itens: f.itens.filter((x) => x.id !== i.id) })}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="botoes" style={{ marginTop: 12 }}>
            <button type="button" className="botao mini" onClick={() => set({ itens: [...f.itens, itemNovo('servico')] })}>+ Serviço</button>
            <button type="button" className="botao mini" onClick={() => set({ itens: [...f.itens, itemNovo('material')] })}>+ Material</button>
          </div>
        </section>

        <section className="cartao form">
          <CampoDinheiro rotulo="Desconto" valor={f.desconto} onChange={(desconto) => set({ desconto })} />
          <Campo rotulo="Condições e observações"><textarea value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })} placeholder="Ex.: 40% de sinal e o restante na entrega" /></Campo>
          <div className="totais">
            <div><span>Subtotal</span><span>{dinheiro(subtotalOrcamento(f))}</span></div>
            <div><span>Desconto</span><span>− {dinheiro(f.desconto)}</span></div>
            <div className="final"><span>Total</span><span>{dinheiro(totalOrcamento(f))}</span></div>
          </div>
          {f.desconto > subtotalOrcamento(f) && <div className="aviso">O desconto é maior que o subtotal.</div>}
          <div className="form-rodape">
            <div className="direita">
              <Link className="botao" to={existente ? `/orcamentos/${existente.id}` : '/orcamentos'}>Cancelar</Link>
              <button type="submit" className="botao principal">Salvar orçamento</button>
            </div>
          </div>
        </section>
      </form>
    </>
  );
}

export function OrcamentoVer() {
  const d = useDados();
  const { id } = useParams();
  const navegar = useNavigate();
  const o = d.orcamentos.find((x) => x.id === id);

  if (!o) {
    return <section className="cartao"><Vazio icone={FileText} titulo="Orçamento não encontrado" acao={<Link className="botao" to="/orcamentos">Voltar para orçamentos</Link>} /></section>;
  }

  const cliente = d.clientes.find((c) => c.id === o.clienteId);
  const total = totalOrcamento(o);
  const mensagem = `Olá, ${cliente?.nome ?? ''}! Segue o orçamento "${o.titulo}" (${numeroDoc(o.numero)}) no valor de ${dinheiro(total)}, válido até ${dataCurta(o.validade)}.`;
  const whatsapp = linkWhatsApp(cliente?.telefone ?? '', mensagem);

  function excluir() {
    if (!window.confirm(`Excluir o orçamento "${o!.titulo}"?`)) return;
    remover('orcamentos', o!.id);
    navegar('/orcamentos');
  }

  function aprovarECriarObra() {
    navegar(`/obras/${criarObraDoOrcamento(o!, total)}`);
  }

  return (
    <>
      <div className="nao-imprimir pilha">
        <Cabecalho
          titulo={o.titulo}
          subtitulo={`${numeroDoc(o.numero)} · ${cliente?.nome ?? ''}`}
          voltar="/orcamentos"
          acao={<SeloOrcamento status={o.status} />}
        />

        {!d.empresa.nome && (
          <div className="aviso">O documento ainda está sem o nome da sua empresa. <Link to="/ajustes">Preencher em Ajustes</Link></div>
        )}
        {vencido(o) && <div className="aviso ruim">A validade deste orçamento já passou.</div>}

        <div className="botoes">
          <button className="botao principal" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> Imprimir ou salvar PDF</button>
          {whatsapp && (
            <a className="botao destaque" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => o.status === 'rascunho' && salvar('orcamentos', { ...o, status: 'enviado' })}>
              <MessageCircle size={18} aria-hidden="true" /> Enviar no WhatsApp
            </a>
          )}
          <Link className="botao" to={`/orcamentos/${o.id}/editar`}>Editar</Link>
        </div>

        <section className="cartao">
          <div className="form-2">
            <Campo rotulo="Situação">
              <select value={o.status} onChange={(e) => salvar('orcamentos', { ...o, status: e.target.value as StatusOrcamento })}>
                {Object.entries(STATUS_ORCAMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
            <div className="campo" style={{ justifyContent: 'flex-end' }}>
              {o.obraId ? (
                <Link className="botao" to={`/obras/${o.obraId}`}><Building2 size={18} aria-hidden="true" /> Ver obra</Link>
              ) : (
                <button className="botao" onClick={aprovarECriarObra} disabled={o.status === 'recusado'}>
                  <Building2 size={18} aria-hidden="true" /> Aprovar e criar obra
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      <article className="documento">
        <header className="doc-topo">
          <div>
            <h2>{d.empresa.nome || 'Sua empresa'}</h2>
            {d.empresa.documento && <small>{d.empresa.documento}</small>}
            {d.empresa.telefone && <small>{d.empresa.telefone}</small>}
            {d.empresa.endereco && <small>{d.empresa.endereco}</small>}
          </div>
          <div className="doc-numero">
            <h2>Orçamento</h2>
            <small>{numeroDoc(o.numero)}</small>
            <small>Emitido em {dataCurta(o.data)}</small>
            <small>Válido até {dataCurta(o.validade)}</small>
          </div>
        </header>

        <div>
          <h3>{o.titulo}</h3>
          <p>Cliente: {cliente?.nome}</p>
          {cliente?.endereco && <p>{cliente.endereco}</p>}
        </div>

        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr><th>Descrição</th><th>Tipo</th><th className="dir">Qtd.</th><th className="dir">Preço unit.</th><th className="dir">Total</th></tr>
            </thead>
            <tbody>
              {o.itens.map((i) => (
                <tr key={i.id}>
                  <td>{i.descricao}</td>
                  <td>{i.tipo === 'servico' ? 'Serviço' : 'Material'}</td>
                  <td className="dir">{i.quantidade.toLocaleString('pt-BR')}</td>
                  <td className="dir">{dinheiro(i.precoUnitario)}</td>
                  <td className="dir">{dinheiro(valorItem(i))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totais">
          <div><span>Subtotal</span><span>{dinheiro(subtotalOrcamento(o))}</span></div>
          {o.desconto > 0 && <div><span>Desconto</span><span>− {dinheiro(o.desconto)}</span></div>}
          <div className="final"><span>Total</span><span>{dinheiro(total)}</span></div>
        </div>

        {o.observacoes && <div><h3>Condições</h3><p style={{ whiteSpace: 'pre-wrap' }}>{o.observacoes}</p></div>}
      </article>

      <div className="nao-imprimir">
        <button className="botao perigo" onClick={excluir}>Excluir orçamento</button>
      </div>
    </>
  );
}
