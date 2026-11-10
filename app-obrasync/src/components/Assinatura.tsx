import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CreditCard, Download, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { Campo, Marca } from './ui';
import {
  assinar, calcularAcesso, cancelarAssinatura, carregarAssinatura, documentoValido, esquecerAssinatura,
  useAssinatura, usePlanos, valorPorMes, type Assinatura,
} from '../lib/assinatura';
import { dataCurta, dinheiro, hoje } from '../lib/formato';
import { nuvemAtiva, supabase } from '../lib/nuvem';
import { baixarBackup } from '../lib/regras';
import { useDados } from '../lib/store';

const data = (d: Date) => dataCurta(hoje(d));

/** Escolha do plano e dados de quem paga. Devolve o link da página de pagamento do Asaas. */
function FormAssinar({ planoAtual, onCancelar }: { planoAtual?: string | null; onCancelar?: () => void }) {
  const planos = usePlanos();
  const { empresa } = useDados();
  const [plano, setPlano] = useState(planoAtual ?? 'mensal');
  const [nome, setNome] = useState(empresa.nome);
  const [documento, setDocumento] = useState(empresa.documento);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');
  const mensal = planos.find((p) => p.ciclo === 'MONTHLY');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setMensagem('');
    if (!documentoValido(documento)) return setErro('Confira o CPF ou CNPJ. Algum número está errado.');
    setOcupado(true);
    try {
      const r = await assinar(plano, nome, documento);
      setLink(r.link ?? null);
      setMensagem(r.mensagem ?? '');
    } catch (falha) {
      setErro((falha as Error).message);
    }
    setOcupado(false);
  }

  if (link) {
    return (
      <div className="pilha">
        <div className="aviso neutro" role="status">Pagamento gerado. Na próxima página você escolhe Pix, boleto ou cartão.</div>
        <a className="botao destaque" href={link} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={18} aria-hidden="true" /> Abrir página de pagamento
        </a>
        <p style={{ color: 'var(--suave)' }}>Pix libera o acesso na hora. Boleto pode levar até 3 dias úteis para ser confirmado. O link também foi para o seu e-mail.</p>
      </div>
    );
  }

  if (!planos.length) return <div className="aviso ruim" role="alert">Não foi possível carregar os planos. Confira sua internet e tente de novo.</div>;

  return (
    <form className="form" onSubmit={enviar}>
      <fieldset className="planos">
        <legend>Plano</legend>
        {planos.map((p) => {
          const desconto = mensal && p.ciclo === 'YEARLY' ? Math.round((1 - p.valorCentavos / (mensal.valorCentavos * 12)) * 100) : 0;
          return (
            <label className="plano" key={p.id}>
              <input type="radio" name="plano" value={p.id} checked={plano === p.id} onChange={() => setPlano(p.id)} />
              <span>{p.nome}</span>
              <strong>{dinheiro(p.valorCentavos)}{p.ciclo === 'YEARLY' ? ' por ano' : ' por mês'}</strong>
              {p.ciclo === 'YEARLY' && <small>Sai {dinheiro(valorPorMes(p))} por mês</small>}
              {desconto > 0 && <span className="selo bom">Economize {desconto}%</span>}
            </label>
          );
        })}
      </fieldset>
      <Campo rotulo="Nome ou razão social" ajuda="Aparece no recibo.">
        <input value={nome} autoComplete="name" onChange={(e) => setNome(e.target.value)} required minLength={2} />
      </Campo>
      <Campo rotulo="CPF ou CNPJ" ajuda="Pedido pelo Asaas, que faz a cobrança.">
        <input value={documento} inputMode="numeric" onChange={(e) => setDocumento(e.target.value)} required />
      </Campo>
      {erro && <div className="aviso ruim" role="alert">{erro}</div>}
      {mensagem && <div className="aviso neutro" role="status">{mensagem}</div>}
      <div className="botoes">
        <button className="botao principal" type="submit" disabled={ocupado}>
          <CreditCard size={18} aria-hidden="true" /> {ocupado ? 'Gerando pagamento...' : 'Continuar para o pagamento'}
        </button>
        {onCancelar && <button className="botao" type="button" onClick={onCancelar}>Voltar</button>}
      </div>
    </form>
  );
}

function TelaBloqueio({ a }: { a: Assinatura }) {
  const d = useDados();
  const [atualizando, setAtualizando] = useState(false);
  const nuncaPagou = !a.pagoAte;

  async function atualizar() {
    setAtualizando(true);
    await carregarAssinatura().catch(() => undefined);
    setAtualizando(false);
  }

  return (
    <main className="portao">
      <div className="portao-marca"><Marca /></div>
      <section className="portao-cartao">
        <h1>{nuncaPagou ? 'Seu teste grátis terminou' : 'Seu acesso está pausado'}</h1>
        <p>
          {nuncaPagou
            ? 'Gostou do ObraSync? Escolha um plano para continuar. Tudo o que você lançou está guardado.'
            : 'A mensalidade está em atraso há mais de 7 dias. Seus dados estão guardados: assim que o pagamento for confirmado, você continua de onde parou.'}
        </p>
        {a.linkPagamento && a.assinou ? (
          <a className="botao destaque" href={a.linkPagamento} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={18} aria-hidden="true" /> Pagar mensalidade em aberto
          </a>
        ) : (
          <FormAssinar planoAtual={a.plano} />
        )}
        <div className="portao-links">
          <button type="button" onClick={atualizar} disabled={atualizando}>
            <RefreshCw size={16} aria-hidden="true" /> {atualizando ? 'Conferindo...' : 'Já paguei'}
          </button>
          <button type="button" onClick={() => baixarBackup(d, hoje())}>
            <Download size={16} aria-hidden="true" /> Baixar meus dados
          </button>
          <button type="button" onClick={() => void supabase!.auth.signOut()}>
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </div>
      </section>
    </main>
  );
}

/** Depois do login: libera o app ou mostra a tela de pagamento quando o acesso está bloqueado. */
export function PortaoAssinatura({ children }: { children: ReactNode }) {
  const a = useAssinatura();

  useEffect(() => {
    void carregarAssinatura().catch(() => undefined);
    // Volta da página de pagamento ou de outra aba: confere de novo.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void carregarAssinatura().catch(() => undefined);
    };
    window.addEventListener('focus', aoVoltar);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.removeEventListener('focus', aoVoltar);
      document.removeEventListener('visibilitychange', aoVoltar);
      esquecerAssinatura();
    };
  }, []);

  if (a === undefined) {
    return <main className="portao"><div className="portao-marca"><Marca /><p role="status">Carregando sua conta...</p></div></main>;
  }
  if (a && calcularAcesso(a).estado === 'bloqueada') return <TelaBloqueio a={a} />;
  return <>{children}</>;
}

/** Faixa no topo das telas quando o teste está acabando ou a mensalidade venceu. */
export function AvisoAssinatura() {
  const a = useAssinatura();
  if (!nuvemAtiva || !a) return null;
  const acesso = calcularAcesso(a);

  if (acesso.estado === 'teste' && acesso.dias <= 5 && !a.assinou) {
    return (
      <div className="aviso" role="status">
        <AlertTriangle size={20} aria-hidden="true" />
        <span>
          {acesso.dias === 1 ? 'Seu teste grátis termina hoje.' : `Faltam ${acesso.dias} dias do seu teste grátis.`}{' '}
          <Link to="/ajustes">Escolher um plano</Link>
        </span>
      </div>
    );
  }
  if (acesso.estado === 'atrasada') {
    return (
      <div className="aviso ruim" role="alert">
        <AlertTriangle size={20} aria-hidden="true" />
        <span>
          Mensalidade em atraso. Pague até {data(acesso.bloqueiaEm)} para não perder o acesso.{' '}
          {a.linkPagamento
            ? <a href={a.linkPagamento} target="_blank" rel="noopener noreferrer">Pagar agora</a>
            : <Link to="/ajustes">Pagar agora</Link>}
        </span>
      </div>
    );
  }
  return null;
}

/** Seção "Assinatura" em Ajustes. */
export function SecaoAssinatura() {
  const a = useAssinatura();
  const planos = usePlanos();
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  if (a === undefined) return null;
  if (a === null) {
    return (
      <section className="cartao pilha">
        <h2>Assinatura</h2>
        <p style={{ color: 'var(--suave)' }}>Não foi possível ver sua assinatura agora. Confira sua internet.</p>
      </section>
    );
  }

  const acesso = calcularAcesso(a);
  const plano = planos.find((p) => p.id === a.plano);

  let selo: ReactNode = null;
  let texto = '';
  if (acesso.estado === 'teste') {
    selo = <span className="selo atencao">Teste grátis</span>;
    texto = a.assinou
      ? `Plano ${plano?.nome ?? ''} escolhido. A primeira cobrança vence em ${data(acesso.ate)}, quando termina o teste.`
      : `Você pode usar tudo até ${data(acesso.ate)}. Depois disso, é preciso escolher um plano.`;
  } else if (acesso.estado === 'em-dia') {
    selo = a.cancelada ? <span className="selo">Cancelada</span> : <span className="selo bom">Em dia</span>;
    texto = a.cancelada
      ? `Você usa até ${data(acesso.ate)}. Depois disso o acesso é bloqueado, mas seus dados ficam guardados.`
      : `Plano ${plano?.nome ?? ''}. Próximo vencimento em ${data(acesso.ate)}.`;
  } else if (acesso.estado === 'atrasada') {
    selo = <span className="selo ruim">Em atraso</span>;
    texto = `O acesso será bloqueado em ${data(acesso.bloqueiaEm)} se o pagamento não for feito.`;
  }

  async function cancelar() {
    const ate = acesso.estado === 'em-dia' ? ` Você continua usando até ${data(acesso.ate)}.` : '';
    if (!window.confirm(`Cancelar a assinatura?${ate} Depois disso o acesso é bloqueado, mas seus dados ficam guardados.`)) return;
    setErro('');
    setOcupado(true);
    try {
      await cancelarAssinatura();
    } catch (falha) {
      setErro((falha as Error).message);
    }
    setOcupado(false);
  }

  const mostrarForm = !a.assinou || trocando;

  return (
    <section className="cartao pilha">
      <div className="assinatura-linha">
        <h2>Assinatura</h2>
        {selo}
      </div>
      <p>{texto}</p>
      {a.linkPagamento && a.assinou && !trocando && (
        <a className="botao destaque" href={a.linkPagamento} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start' }}>
          <ExternalLink size={18} aria-hidden="true" /> Pagar mensalidade
        </a>
      )}
      {mostrarForm ? (
        <FormAssinar planoAtual={a.plano} onCancelar={trocando ? () => setTrocando(false) : undefined} />
      ) : (
        <div className="botoes">
          <button className="botao" onClick={() => setTrocando(true)}>Trocar de plano</button>
          <button className="botao perigo" onClick={cancelar} disabled={ocupado}>Cancelar assinatura</button>
        </div>
      )}
      {erro && <div className="aviso ruim" role="alert">{erro}</div>}
    </section>
  );
}
