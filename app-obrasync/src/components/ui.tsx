import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, type LucideIcon } from 'lucide-react';
import { dinheiroEditavel, lerDinheiro } from '../lib/formato';

export function Marca() {
  return (
    <span className="marca">
      <svg viewBox="0 0 402 425" aria-hidden="true">
        <g fill="#A3D65C">
          <polygon points="217,0 400,105 400,173 217,70 63,160 63,245 2,210 2,125" />
          <polygon points="127,165 203,123 203,320 127,277" />
          <polygon points="2,250 203,365 203,425 2,310" />
        </g>
        <polygon fill="#F5F7F5" points="235,130 400,223 400,305 235,400 235,335 347,263 235,195" />
      </svg>
      <span className="marca-nome">Obra<span>Sync</span></span>
    </span>
  );
}

export function Cabecalho({ titulo, subtitulo, voltar, acao }: { titulo: string; subtitulo?: string; voltar?: string; acao?: ReactNode }) {
  return (
    <>
      <header className="cabecalho">
        <div>
          {voltar && (
            <Link className="voltar nao-imprimir" to={voltar}>
              <ArrowLeft size={16} aria-hidden="true" /> Voltar
            </Link>
          )}
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {acao}
      </header>
    </>
  );
}

export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d || d.open) return;
    d.showModal();
    // showModal foca o primeiro botão, que seria o de fechar.
    d.querySelector<HTMLElement>('.modal-corpo input, .modal-corpo select, .modal-corpo textarea')?.focus();
  }, []);
  return (
    <dialog ref={ref} className="modal" aria-label={titulo} onCancel={(e) => { e.preventDefault(); onFechar(); }}>
      <div className="modal-topo">
        <h2>{titulo}</h2>
        <button type="button" className="icone-botao mini" aria-label="Fechar" onClick={onFechar}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="modal-corpo">{children}</div>
    </dialog>
  );
}

export function Campo({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {ajuda && <small>{ajuda}</small>}
    </label>
  );
}

/** Campo de dinheiro: o usuário digita como escreveria ("1.250,50"); o app guarda centavos. */
export function CampoDinheiro({ rotulo, valor, onChange, ajuda, obrigatorio }: {
  rotulo: string;
  valor: number;
  onChange: (centavos: number) => void;
  ajuda?: string;
  obrigatorio?: boolean;
}) {
  const [texto, setTexto] = useState(valor ? dinheiroEditavel(valor) : '');
  const invalido = lerDinheiro(texto) === null;
  const ref = useRef<HTMLInputElement>(null);
  // Valor inválido bloqueia o envio, em vez de salvar o último número válido.
  useEffect(() => ref.current?.setCustomValidity(invalido ? 'Digite só o valor. Exemplo: 1.250,50' : ''), [invalido]);
  return (
    <Campo rotulo={rotulo} ajuda={invalido ? 'Digite só o valor. Exemplo: 1.250,50' : ajuda}>
      <input
        ref={ref}
        inputMode="decimal"
        placeholder="0,00"
        value={texto}
        required={obrigatorio}
        aria-invalid={invalido}
        onChange={(e) => {
          setTexto(e.target.value);
          const lido = lerDinheiro(e.target.value);
          if (lido !== null) onChange(lido);
        }}
        onBlur={() => {
          const lido = lerDinheiro(texto);
          if (lido !== null && texto) setTexto(dinheiroEditavel(lido));
        }}
      />
    </Campo>
  );
}

export function Vazio({ icone: Icone, titulo, texto, acao }: { icone: LucideIcon; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <span className="icone-caixa"><Icone size={22} aria-hidden="true" /></span>
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {acao}
    </div>
  );
}

export function Numero({ icone: Icone, valor, rotulo, negativo, para }: { icone: LucideIcon; valor: string; rotulo: string; negativo?: boolean; para?: string }) {
  const corpo = (
    <>
      <span className="numero-topo"><span className="icone-caixa"><Icone size={18} aria-hidden="true" /></span></span>
      <strong>{valor}</strong>
      <span className="rotulo">{rotulo}</span>
    </>
  );
  const classe = `numero${negativo ? ' negativo' : ''}`;
  return para ? <Link className={classe} to={para}>{corpo}</Link> : <div className={classe}>{corpo}</div>;
}

export const Progresso = ({ valor }: { valor: number }) => (
  <div className="progresso" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da obra">
    <div style={{ width: `${valor}%` }} />
  </div>
);

export function RodapeForm({ onCancelar, onExcluir, salvar = 'Salvar' }: { onCancelar: () => void; onExcluir?: () => void; salvar?: string }) {
  return (
    <div className="form-rodape">
      {onExcluir && <button type="button" className="botao perigo" onClick={onExcluir}>Excluir</button>}
      <div className="direita">
        <button type="button" className="botao" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="botao principal">{salvar}</button>
      </div>
    </div>
  );
}
