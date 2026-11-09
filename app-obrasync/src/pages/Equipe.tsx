import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, CircleDollarSign, HardHat, MessageCircle, Plus, Wallet } from 'lucide-react';
import { Cabecalho, Numero, Vazio } from '../components/ui';
import { ListaLancamentos } from '../components/financeiro';
import { FormFuncionario, FormLancamento } from '../components/formularios';
import { resumoFuncionario } from '../lib/calculos';
import { dinheiro, linkWhatsApp } from '../lib/formato';
import { useDados } from '../lib/store';
import type { Lancamento } from '../lib/tipos';

export function Equipe() {
  const d = useDados();
  const [novo, setNovo] = useState(false);
  const ativos = d.funcionarios.filter((f) => f.ativo);
  const inativos = d.funcionarios.filter((f) => !f.ativo);
  const devidoTotal = ativos.reduce((t, f) => t + resumoFuncionario(d, f.id).devido, 0);

  const ficha = (f: (typeof d.funcionarios)[number]) => {
    const r = resumoFuncionario(d, f.id);
    return (
      <Link className="cartao ficha" key={f.id} to={`/equipe/${f.id}`}>
        <div className="ficha-topo">
          <strong>{f.nome}</strong>
          {r.devido > 0 ? <span className="selo atencao">Deve {dinheiro(r.devido)}</span> : <span className="selo bom">Em dia</span>}
        </div>
        <small>{f.funcao || 'Sem função definida'}</small>
        <small>{f.obraIds.length === 1 ? '1 obra' : `${f.obraIds.length} obras`}</small>
      </Link>
    );
  };

  return (
    <>
      <Cabecalho
        titulo="Equipe"
        subtitulo={ativos.length ? `Total a pagar à equipe: ${dinheiro(devidoTotal)}` : 'Quem trabalha com você e quanto cada um tem a receber'}
        acao={<button className="botao principal" onClick={() => setNovo(true)}><Plus size={18} aria-hidden="true" /> Novo funcionário</button>}
      />
      {d.funcionarios.length === 0 ? (
        <section className="cartao"><Vazio icone={HardHat} titulo="Nenhum funcionário ainda" texto="Cadastre a equipe para controlar pagamentos sem confusão." /></section>
      ) : (
        <div className="grade-lista">{ativos.map(ficha)}</div>
      )}
      {inativos.length > 0 && (
        <>
          <h2>Inativos</h2>
          <div className="grade-lista">{inativos.map(ficha)}</div>
        </>
      )}
      {novo && <FormFuncionario onFechar={() => setNovo(false)} />}
    </>
  );
}

export function FuncionarioDetalhe() {
  const d = useDados();
  const { id } = useParams();
  const navegar = useNavigate();
  const [editando, setEditando] = useState(false);
  const [pagamento, setPagamento] = useState<{ inicial?: Lancamento } | null>(null);
  const f = d.funcionarios.find((x) => x.id === id);

  if (!f) {
    return <section className="cartao"><Vazio icone={HardHat} titulo="Funcionário não encontrado" acao={<Link className="botao" to="/equipe">Voltar para equipe</Link>} /></section>;
  }

  const r = resumoFuncionario(d, f.id);
  const obras = d.obras.filter((o) => f.obraIds.includes(o.id));
  const whatsapp = linkWhatsApp(f.telefone);

  return (
    <>
      <Cabecalho
        titulo={f.nome}
        subtitulo={[f.funcao, f.ativo ? '' : 'Inativo'].filter(Boolean).join(' · ')}
        voltar="/equipe"
        acao={<button className="botao" onClick={() => setEditando(true)}>Editar</button>}
      />

      {whatsapp && (
        <div className="botoes">
          <a className="botao destaque" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> WhatsApp</a>
        </div>
      )}

      <section className="numeros tres" aria-label="Pagamentos">
        <Numero icone={Wallet} valor={dinheiro(r.pago)} rotulo="Já pago" />
        <Numero icone={CircleDollarSign} valor={dinheiro(r.devido)} rotulo="Ainda devido" />
        <Numero icone={Building2} valor={String(obras.length).padStart(2, '0')} rotulo="Obras" />
      </section>

      <div className="grade-2">
        <section className="cartao">
          <div className="cartao-topo">
            <h2>Pagamentos</h2>
            <button className="botao mini" onClick={() => setPagamento({})}>+ Pagamento</button>
          </div>
          {r.pagamentos.length === 0
            ? <Vazio icone={Wallet} titulo="Nenhum pagamento registrado" />
            : <ListaLancamentos itens={r.pagamentos} onEditar={(l) => setPagamento({ inicial: l })} />}
        </section>
        <section className="cartao">
          <h2 style={{ marginBottom: 8 }}>Obras em que trabalha</h2>
          {obras.length === 0 ? <Vazio icone={Building2} titulo="Nenhuma obra ligada" /> : (
            <div className="lista">
              {obras.map((o) => (
                <Link className="linha" key={o.id} to={`/obras/${o.id}`}>
                  <span className="linha-corpo"><strong>{o.nome}</strong></span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {editando && <FormFuncionario inicial={f} onFechar={() => setEditando(false)} onExcluido={() => navegar('/equipe')} />}
      {pagamento && (
        <FormLancamento
          inicial={pagamento.inicial}
          preset={{ tipo: 'saida', funcionarioId: f.id, categoria: 'Mão de obra', pago: false, descricao: `Pagamento de ${f.nome}`, obraId: obras.length === 1 ? obras[0].id : '' }}
          onFechar={() => setPagamento(null)}
        />
      )}
    </>
  );
}
