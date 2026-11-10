import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Download, HardHat, Info, LogOut, Settings, Upload, Users } from 'lucide-react';
import { Cabecalho, Campo } from '../components/ui';
import { SecaoAssinatura } from '../components/Assinatura';
import { dadosDeExemplo } from '../lib/exemplo';
import { hoje } from '../lib/formato';
import { nuvemAtiva, supabase } from '../lib/nuvem';
import { VAZIO, baixarBackup, lerBackup } from '../lib/regras';
import { mudar, substituirDados, useDados } from '../lib/store';

const LINKS = [
  { para: '/clientes', rotulo: 'Clientes', icone: Users },
  { para: '/equipe', rotulo: 'Equipe', icone: HardHat },
  { para: '/agenda', rotulo: 'Agenda', icone: CalendarDays },
  { para: '/ajustes', rotulo: 'Ajustes', icone: Settings },
];

export function Mais() {
  return (
    <>
      <Cabecalho titulo="Mais" />
      <section className="cartao">
        <div className="lista">
          {LINKS.map(({ para, rotulo, icone: Icone }) => (
            <Link className="linha" key={para} to={para}>
              <span className="icone-caixa"><Icone size={18} aria-hidden="true" /></span>
              <span className="linha-corpo"><strong>{rotulo}</strong></span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function Ajustes() {
  const d = useDados();
  const [empresa, setEmpresa] = useState(d.empresa);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);
  const set = (p: Partial<typeof empresa>) => { setSalvo(false); setEmpresa((a) => ({ ...a, ...p })); };

  function salvarEmpresa(e: FormEvent) {
    e.preventDefault();
    mudar((x) => ({ ...x, empresa }));
    setSalvo(true);
  }

  async function restaurar(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErro('');
    let lido = null;
    try {
      lido = lerBackup(JSON.parse(await f.text()));
    } catch {
      lido = null;
    }
    if (!lido) return setErro('Esse arquivo não é um backup do ObraSync. Nada foi alterado.');
    if (!window.confirm('Restaurar este backup? Tudo o que está no app agora será substituído.')) return;
    substituirDados(lido);
    setEmpresa(lido.empresa);
  }

  function carregarExemplo() {
    if (!window.confirm('Carregar dados de exemplo? Tudo o que está no app agora será substituído.')) return;
    const dados = dadosDeExemplo();
    substituirDados(dados);
    setEmpresa(dados.empresa);
  }

  function apagarTudo() {
    if (!window.confirm('Apagar todos os dados do ObraSync? Isso não pode ser desfeito.')) return;
    substituirDados(VAZIO);
    setEmpresa(VAZIO.empresa);
  }

  return (
    <>
      <Cabecalho titulo="Ajustes" subtitulo="Sua empresa e a segurança dos seus dados" />

      {nuvemAtiva && <SecaoAssinatura />}

      <section className="cartao">
        <h2 style={{ marginBottom: 4 }}>Minha empresa</h2>
        <p style={{ color: 'var(--suave)', marginBottom: 12 }}>Esses dados aparecem nos orçamentos que você envia.</p>
        <form className="form" onSubmit={salvarEmpresa}>
          <Campo rotulo="Nome da empresa"><input value={empresa.nome} onChange={(e) => set({ nome: e.target.value })} /></Campo>
          <div className="form-2">
            <Campo rotulo="Telefone"><input type="tel" value={empresa.telefone} onChange={(e) => set({ telefone: e.target.value })} /></Campo>
            <Campo rotulo="CPF ou CNPJ"><input value={empresa.documento} onChange={(e) => set({ documento: e.target.value })} /></Campo>
          </div>
          <Campo rotulo="Endereço"><input value={empresa.endereco} onChange={(e) => set({ endereco: e.target.value })} /></Campo>
          <div className="botoes" style={{ alignItems: 'center' }}>
            <button className="botao principal" type="submit">Salvar</button>
            {salvo && <span role="status" style={{ fontWeight: 600 }}>Salvo.</span>}
          </div>
        </form>
      </section>

      <section className="cartao pilha">
        <h2>Backup</h2>
        <div className="aviso">
          <Info size={20} aria-hidden="true" />
          {nuvemAtiva
            ? 'Seus dados ficam salvos na sua conta. O backup é uma cópia extra que fica com você.'
            : 'Seus dados ficam só neste navegador, neste aparelho. Baixe um backup com frequência: limpar os dados do navegador apaga tudo.'}
        </div>
        {erro && <div className="aviso ruim" role="alert">{erro}</div>}
        <div className="botoes">
          <button className="botao principal" onClick={() => baixarBackup(d, hoje())}><Download size={18} aria-hidden="true" /> Baixar backup</button>
          <button className="botao" onClick={() => arquivo.current?.click()}><Upload size={18} aria-hidden="true" /> Restaurar backup</button>
          <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={restaurar} />
        </div>
      </section>

      <section className="cartao pilha">
        <h2>Dados do app</h2>
        <div className="botoes">
          <button className="botao" onClick={carregarExemplo}>Carregar dados de exemplo</button>
          <button className="botao perigo" onClick={apagarTudo}>Apagar todos os dados</button>
        </div>
      </section>

      {nuvemAtiva && (
        <section className="cartao pilha">
          <h2>Conta</h2>
          <div className="botoes">
            <button className="botao" onClick={() => void supabase!.auth.signOut()}><LogOut size={18} aria-hidden="true" /> Sair da conta</button>
          </div>
        </section>
      )}
    </>
  );
}
