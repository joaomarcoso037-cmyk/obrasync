import { useState, type FormEvent } from 'react';
import { Campo, CampoDinheiro, Modal, RodapeForm } from './ui';
import { dataCurta, hoje, novoId } from '../lib/formato';
import { bloqueioCliente, bloqueioFuncionario } from '../lib/regras';
import { novoCliente, remover, salvar, useDados } from '../lib/store';
import {
  CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, STATUS_OBRA, TIPOS_COMPROMISSO,
  type Cliente, type Compromisso, type Funcionario, type Lancamento, type Obra, type StatusObra, type TipoCompromisso, type TipoLancamento,
} from '../lib/tipos';

const NOVO = '__novo';

interface PropsForm<T> {
  inicial?: T;
  onFechar: () => void;
  onExcluido?: () => void;
}

/** Escolher cliente ou criar um ali mesmo, sem sair do que está fazendo. */
export function SeletorCliente({ valor, onChange, novoNome, onNovoNome }: {
  valor: string;
  onChange: (id: string) => void;
  novoNome: string;
  onNovoNome: (nome: string) => void;
}) {
  const { clientes } = useDados();
  return (
    <>
      <Campo rotulo="Cliente">
        <select value={valor} onChange={(e) => onChange(e.target.value)} required>
          <option value="" disabled>Escolha o cliente</option>
          {[...clientes].sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          <option value={NOVO}>+ Novo cliente</option>
        </select>
      </Campo>
      {valor === NOVO && (
        <Campo rotulo="Nome do novo cliente">
          <input value={novoNome} onChange={(e) => onNovoNome(e.target.value)} required autoFocus />
        </Campo>
      )}
    </>
  );
}

export const resolverCliente = (id: string, novoNome: string) => (id === NOVO ? novoCliente(novoNome) : id);

export function FormCliente({ inicial, onFechar, onExcluido }: PropsForm<Cliente>) {
  const dados = useDados();
  const [f, setF] = useState<Cliente>(inicial ?? { id: novoId(), nome: '', telefone: '', endereco: '', observacoes: '' });
  const set = (p: Partial<Cliente>) => setF((a) => ({ ...a, ...p }));

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar('clientes', f);
    onFechar();
  }

  function excluir() {
    const motivo = bloqueioCliente(dados, f.id);
    if (motivo) return window.alert(motivo);
    if (!window.confirm(`Excluir o cliente ${f.nome}?`)) return;
    remover('clientes', f.id);
    onExcluido?.();
    onFechar();
  }

  return (
    <Modal titulo={inicial ? 'Editar cliente' : 'Novo cliente'} onFechar={onFechar}>
      <form className="form" onSubmit={enviar}>
        <Campo rotulo="Nome"><input value={f.nome} onChange={(e) => set({ nome: e.target.value })} required autoFocus /></Campo>
        <Campo rotulo="Telefone"><input type="tel" value={f.telefone} onChange={(e) => set({ telefone: e.target.value })} placeholder="(11) 91234-5678" /></Campo>
        <Campo rotulo="Endereço"><input value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} /></Campo>
        <Campo rotulo="Observações"><textarea value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></Campo>
        <RodapeForm onCancelar={onFechar} onExcluir={inicial ? excluir : undefined} />
      </form>
    </Modal>
  );
}

export function FormObra({ inicial, onFechar, onExcluido }: PropsForm<Obra>) {
  const [f, setF] = useState<Obra>(inicial ?? {
    id: novoId(), nome: '', endereco: '', clienteId: '', valorContratado: 0, inicio: hoje(), previsao: '', status: 'andamento', progresso: 0, observacoes: '',
  });
  const [novoNome, setNovoNome] = useState('');
  const set = (p: Partial<Obra>) => setF((a) => ({ ...a, ...p }));

  function enviar(e: FormEvent) {
    e.preventDefault();
    const progresso = f.status === 'concluida' ? 100 : f.progresso;
    salvar('obras', { ...f, progresso, clienteId: resolverCliente(f.clienteId, novoNome) });
    onFechar();
  }

  function excluir() {
    if (!window.confirm(`Excluir a obra ${f.nome}? Os lançamentos continuam no financeiro, sem vínculo com a obra.`)) return;
    remover('obras', f.id);
    onExcluido?.();
    onFechar();
  }

  return (
    <Modal titulo={inicial ? 'Editar obra' : 'Nova obra'} onFechar={onFechar}>
      <form className="form" onSubmit={enviar}>
        <Campo rotulo="Nome da obra"><input value={f.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Reforma da casa do Carlos" required autoFocus /></Campo>
        <SeletorCliente valor={f.clienteId} onChange={(clienteId) => set({ clienteId })} novoNome={novoNome} onNovoNome={setNovoNome} />
        <Campo rotulo="Endereço da obra"><input value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} /></Campo>
        <CampoDinheiro rotulo="Valor contratado" valor={f.valorContratado} onChange={(valorContratado) => set({ valorContratado })} />
        <div className="form-2">
          <Campo rotulo="Início"><input type="date" value={f.inicio} onChange={(e) => set({ inicio: e.target.value })} /></Campo>
          <Campo rotulo="Previsão de conclusão"><input type="date" value={f.previsao} min={f.inicio} onChange={(e) => set({ previsao: e.target.value })} /></Campo>
        </div>
        <Campo rotulo="Situação">
          <select value={f.status} onChange={(e) => set({ status: e.target.value as StatusObra })}>
            {Object.entries(STATUS_OBRA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Observações"><textarea value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></Campo>
        <RodapeForm onCancelar={onFechar} onExcluir={inicial ? excluir : undefined} />
      </form>
    </Modal>
  );
}

export function FormLancamento({ inicial, preset, onFechar }: PropsForm<Lancamento> & { preset?: Partial<Lancamento> }) {
  const { obras, funcionarios } = useDados();
  const [f, setF] = useState<Lancamento>(inicial ?? {
    id: novoId(), tipo: 'saida', descricao: '', valor: 0, data: hoje(), pago: true, categoria: '', obraId: '', funcionarioId: '', ...preset,
  });
  const set = (p: Partial<Lancamento>) => setF((a) => ({ ...a, ...p }));
  const entrada = f.tipo === 'entrada';
  const categorias = entrada ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (f.valor <= 0) return window.alert('Informe um valor maior que zero.');
    salvar('lancamentos', { ...f, categoria: f.categoria || categorias[0], funcionarioId: entrada ? '' : f.funcionarioId });
    onFechar();
  }

  function excluir() {
    if (!window.confirm(`Excluir "${f.descricao}"?`)) return;
    remover('lancamentos', f.id);
    onFechar();
  }

  const titulo = inicial ? 'Editar lançamento' : entrada ? 'Nova entrada' : 'Nova saída';
  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      <form className="form" onSubmit={enviar}>
        {!preset?.tipo && !inicial && (
          <div className="chips" role="group" aria-label="Tipo">
            {(['entrada', 'saida'] as TipoLancamento[]).map((t) => (
              <button key={t} type="button" className={`chip${f.tipo === t ? ' ativo' : ''}`} onClick={() => set({ tipo: t, categoria: '' })}>
                {t === 'entrada' ? 'Entrada de dinheiro' : 'Saída de dinheiro'}
              </button>
            ))}
          </div>
        )}
        <Campo rotulo="Descrição"><input value={f.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder={entrada ? 'Ex.: Segunda parcela' : 'Ex.: Cimento e areia'} required autoFocus /></Campo>
        <div className="form-2">
          <CampoDinheiro rotulo="Valor" valor={f.valor} onChange={(valor) => set({ valor })} obrigatorio />
          <Campo rotulo={f.pago ? (entrada ? 'Recebido em' : 'Pago em') : 'Vencimento'}><input type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} required /></Campo>
        </div>
        <label className="marcar">
          <input type="checkbox" checked={f.pago} onChange={(e) => set({ pago: e.target.checked })} />
          {entrada ? 'Já recebi esse dinheiro' : 'Já paguei'}
        </label>
        <Campo rotulo="Categoria">
          <select value={f.categoria || categorias[0]} onChange={(e) => set({ categoria: e.target.value })}>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Obra">
          <select value={f.obraId} onChange={(e) => set({ obraId: e.target.value })}>
            <option value="">Sem obra (despesa geral)</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </Campo>
        {!entrada && (
          <Campo rotulo="Funcionário" ajuda="Se for pagamento de alguém da equipe, ele entra no histórico da pessoa.">
            <select value={f.funcionarioId} onChange={(e) => set({ funcionarioId: e.target.value, categoria: e.target.value ? 'Mão de obra' : f.categoria })}>
              <option value="">Nenhum</option>
              {funcionarios.filter((x) => x.ativo || x.id === f.funcionarioId).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
        )}
        <RodapeForm onCancelar={onFechar} onExcluir={inicial ? excluir : undefined} />
      </form>
    </Modal>
  );
}

export function FormFuncionario({ inicial, onFechar, onExcluido }: PropsForm<Funcionario>) {
  const dados = useDados();
  const [f, setF] = useState<Funcionario>(inicial ?? { id: novoId(), nome: '', funcao: '', telefone: '', obraIds: [], ativo: true });
  const set = (p: Partial<Funcionario>) => setF((a) => ({ ...a, ...p }));
  const obras = dados.obras.filter((o) => o.status !== 'concluida' || f.obraIds.includes(o.id));

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar('funcionarios', f);
    onFechar();
  }

  function excluir() {
    const motivo = bloqueioFuncionario(dados, f.id);
    if (motivo) return window.alert(motivo);
    if (!window.confirm(`Excluir ${f.nome}?`)) return;
    remover('funcionarios', f.id);
    onExcluido?.();
    onFechar();
  }

  return (
    <Modal titulo={inicial ? 'Editar funcionário' : 'Novo funcionário'} onFechar={onFechar}>
      <form className="form" onSubmit={enviar}>
        <Campo rotulo="Nome"><input value={f.nome} onChange={(e) => set({ nome: e.target.value })} required autoFocus /></Campo>
        <div className="form-2">
          <Campo rotulo="Função"><input value={f.funcao} onChange={(e) => set({ funcao: e.target.value })} placeholder="Ex.: Pedreiro" /></Campo>
          <Campo rotulo="Telefone"><input type="tel" value={f.telefone} onChange={(e) => set({ telefone: e.target.value })} /></Campo>
        </div>
        {obras.length > 0 && (
          <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
            <span>Obras em que trabalha</span>
            {obras.map((o) => (
              <label key={o.id} className="marcar">
                <input
                  type="checkbox"
                  checked={f.obraIds.includes(o.id)}
                  onChange={(e) => set({ obraIds: e.target.checked ? [...f.obraIds, o.id] : f.obraIds.filter((x) => x !== o.id) })}
                />
                {o.nome}
              </label>
            ))}
          </fieldset>
        )}
        {inicial && (
          <label className="marcar">
            <input type="checkbox" checked={f.ativo} onChange={(e) => set({ ativo: e.target.checked })} />
            Funcionário ativo
          </label>
        )}
        <RodapeForm onCancelar={onFechar} onExcluir={inicial ? excluir : undefined} />
      </form>
    </Modal>
  );
}

export function FormCompromisso({ inicial, preset, onFechar }: PropsForm<Compromisso> & { preset?: Partial<Compromisso> }) {
  const { obras } = useDados();
  const [f, setF] = useState<Compromisso>(inicial ?? {
    id: novoId(), titulo: '', tipo: 'visita', data: hoje(), hora: '', obraId: '', observacoes: '', concluido: false, ...preset,
  });
  const set = (p: Partial<Compromisso>) => setF((a) => ({ ...a, ...p }));

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar('compromissos', f);
    onFechar();
  }

  function excluir() {
    if (!window.confirm(`Excluir "${f.titulo}" (${dataCurta(f.data)})?`)) return;
    remover('compromissos', f.id);
    onFechar();
  }

  return (
    <Modal titulo={inicial ? 'Editar compromisso' : 'Novo compromisso'} onFechar={onFechar}>
      <form className="form" onSubmit={enviar}>
        <Campo rotulo="O que é"><input value={f.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="Ex.: Visita à obra com Carlos" required autoFocus /></Campo>
        <Campo rotulo="Tipo">
          <select value={f.tipo} onChange={(e) => set({ tipo: e.target.value as TipoCompromisso })}>
            {Object.entries(TIPOS_COMPROMISSO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <div className="form-2">
          <Campo rotulo="Data"><input type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} required /></Campo>
          <Campo rotulo="Hora"><input type="time" value={f.hora} onChange={(e) => set({ hora: e.target.value })} /></Campo>
        </div>
        <Campo rotulo="Obra">
          <select value={f.obraId} onChange={(e) => set({ obraId: e.target.value })}>
            <option value="">Nenhuma</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Observações"><textarea value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></Campo>
        <RodapeForm onCancelar={onFechar} onExcluir={inicial ? excluir : undefined} />
      </form>
    </Modal>
  );
}
