import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Campo, Marca } from './ui';
import { abrirConta, abrirLocal, fecharConta, nuvemAtiva, supabase } from '../lib/nuvem';

const TAMANHO_SENHA = 8;

function mensagemDeErro(erro: { code?: string; message?: string }): string {
  switch (erro.code) {
    case 'invalid_credentials': return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed': return 'Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.';
    case 'user_already_exists': return 'Já existe uma conta com esse e-mail. Use a opção Entrar.';
    case 'weak_password': return `Escolha uma senha mais forte, com pelo menos ${TAMANHO_SENHA} caracteres.`;
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    default: return 'Não foi possível concluir agora. Confira sua internet e tente de novo.';
  }
}

type Modo = 'entrar' | 'criar' | 'esqueci';

function Login() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    setOcupado(true);
    const auth = supabase!.auth;
    if (modo === 'entrar') {
      const { error } = await auth.signInWithPassword({ email, password: senha });
      if (error) setErro(mensagemDeErro(error));
    } else if (modo === 'criar') {
      const { data, error } = await auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin } });
      if (error) setErro(mensagemDeErro(error));
      else if (!data.session) setAviso('Conta criada. Enviamos um link de confirmação para o seu e-mail.');
    } else {
      const { error } = await auth.resetPasswordForEmail(email, { redirectTo: location.origin });
      if (error) setErro(mensagemDeErro(error));
      else setAviso('Se esse e-mail tiver conta, você vai receber um link para criar uma nova senha.');
    }
    setOcupado(false);
  }

  function trocar(novo: Modo) {
    setModo(novo);
    setErro('');
    setAviso('');
  }

  const textos = {
    entrar: { titulo: 'Entrar', botao: 'Entrar' },
    criar: { titulo: 'Criar conta', botao: 'Criar conta' },
    esqueci: { titulo: 'Recuperar senha', botao: 'Enviar link' },
  }[modo];

  return (
    <main className="portao">
      <div className="portao-marca">
        <Marca />
        <p>Gestão inteligente de obras</p>
      </div>
      <section className="portao-cartao">
        <h1>{textos.titulo}</h1>
        <form className="form" onSubmit={enviar}>
          <Campo rotulo="E-mail">
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>
          {modo !== 'esqueci' && (
            <Campo rotulo="Senha" ajuda={modo === 'criar' ? `Pelo menos ${TAMANHO_SENHA} caracteres.` : undefined}>
              <input
                type="password"
                autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                minLength={TAMANHO_SENHA}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </Campo>
          )}
          {erro && <div className="aviso ruim" role="alert">{erro}</div>}
          {aviso && <div className="aviso neutro" role="status">{aviso}</div>}
          <button className="botao principal" type="submit" disabled={ocupado}>{ocupado ? 'Aguarde...' : textos.botao}</button>
        </form>
        <div className="portao-links">
          {modo === 'entrar' && (
            <>
              <button type="button" onClick={() => trocar('criar')}>Criar conta</button>
              <button type="button" onClick={() => trocar('esqueci')}>Esqueci a senha</button>
            </>
          )}
          {modo !== 'entrar' && <button type="button" onClick={() => trocar('entrar')}>Voltar para Entrar</button>}
        </div>
      </section>
    </main>
  );
}

function NovaSenha({ onConcluir }: { onConcluir: () => void }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase!.auth.updateUser({ password: senha });
    if (error) setErro(mensagemDeErro(error));
    else onConcluir();
  }

  return (
    <main className="portao">
      <div className="portao-marca"><Marca /></div>
      <section className="portao-cartao">
        <h1>Criar nova senha</h1>
        <form className="form" onSubmit={enviar}>
          <Campo rotulo="Nova senha" ajuda={`Pelo menos ${TAMANHO_SENHA} caracteres.`}>
            <input type="password" autoComplete="new-password" minLength={TAMANHO_SENHA} value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Campo>
          {erro && <div className="aviso ruim" role="alert">{erro}</div>}
          <button className="botao principal" type="submit">Salvar senha</button>
        </form>
      </section>
    </main>
  );
}

const Carregando = ({ texto }: { texto: string }) => (
  <main className="portao"><div className="portao-marca"><Marca /><p role="status">{texto}</p></div></main>
);

/** Só mostra o app para quem entrou e depois que os dados da conta chegaram. */
export function Portao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null | undefined>(nuvemAtiva ? undefined : null);
  const [recuperando, setRecuperando] = useState(false);
  const [pronto, setPronto] = useState(!nuvemAtiva);
  const [falha, setFalha] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const idConta = sessao?.user.id;

  useEffect(() => {
    if (!nuvemAtiva) {
      abrirLocal();
      return;
    }
    supabase!.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase!.auth.onAuthStateChange((evento, nova) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSessao(nova);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!idConta) return;
    let ativo = true;
    setFalha(false);
    abrirConta(idConta)
      .then(() => { if (ativo) setPronto(true); })
      .catch(() => { if (ativo) setFalha(true); });
    return () => {
      ativo = false;
      setPronto(false);
      void fecharConta();
    };
  }, [idConta, tentativa]);

  if (!nuvemAtiva) return <>{children}</>;
  if (sessao === undefined) return <Carregando texto="Abrindo..." />;
  if (recuperando) return <NovaSenha onConcluir={() => setRecuperando(false)} />;
  if (!sessao) return <Login />;
  if (falha) {
    return (
      <main className="portao">
        <div className="portao-marca"><Marca /></div>
        <section className="portao-cartao">
          <h1>Não foi possível abrir seus dados</h1>
          <p>Confira sua internet e tente de novo.</p>
          <button className="botao principal" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</button>
        </section>
      </main>
    );
  }
  if (!pronto) return <Carregando texto="Carregando seus dados..." />;
  return <>{children}</>;
}
