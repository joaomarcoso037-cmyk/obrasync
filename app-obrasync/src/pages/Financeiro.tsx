import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CircleDollarSign, Landmark, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Cabecalho, Numero, Vazio } from '../components/ui';
import { ListaLancamentos } from '../components/financeiro';
import { FormLancamento } from '../components/formularios';
import { resumoGeral, resumoMes } from '../lib/calculos';
import { dinheiro, hoje, nomeMes, somarMeses } from '../lib/formato';
import { useDados } from '../lib/store';
import type { Lancamento } from '../lib/tipos';

type Filtro = 'mes' | 'receber' | 'pagar' | 'atrasados';

const FILTROS: [Filtro, string][] = [['mes', 'Tudo do mês'], ['receber', 'A receber'], ['pagar', 'A pagar'], ['atrasados', 'Atrasados']];

export function Financeiro() {
  const d = useDados();
  const [busca] = useSearchParams();
  const inicial = busca.get('filtro');
  const [filtro, setFiltro] = useState<Filtro>(FILTROS.some(([k]) => k === inicial) ? (inicial as Filtro) : 'mes');
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [form, setForm] = useState<{ inicial?: Lancamento } | null>(null);

  const agora = hoje();
  const geral = resumoGeral(d);
  const doMes = resumoMes(d, mes);

  const lista = d.lancamentos
    .filter((l) => {
      if (filtro === 'mes') return l.data.startsWith(mes);
      if (filtro === 'atrasados') return !l.pago && l.data < agora;
      return !l.pago && l.tipo === (filtro === 'receber' ? 'entrada' : 'saida');
    })
    .sort((a, b) => (filtro === 'mes' ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data)));

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        subtitulo="Quanto entra, quanto sai e quanto realmente sobra"
        acao={<button className="botao principal" onClick={() => setForm({})}><Plus size={18} aria-hidden="true" /> Lançar dinheiro</button>}
      />

      <section className="numeros" aria-label="Situação geral">
        <Numero icone={Landmark} valor={dinheiro(geral.saldo)} rotulo="Saldo em caixa" negativo={geral.saldo < 0} />
        <Numero icone={CircleDollarSign} valor={dinheiro(geral.aReceber)} rotulo="A receber" />
        <Numero icone={Wallet} valor={dinheiro(geral.aPagar)} rotulo="A pagar" />
        <Numero icone={TrendingUp} valor={dinheiro(geral.saldo + geral.aReceber - geral.aPagar)} rotulo="Resultado estimado" negativo={geral.saldo + geral.aReceber - geral.aPagar < 0} />
      </section>

      <section className="cartao pilha">
        <div className="cartao-topo" style={{ marginBottom: 0 }}>
          <h2>Movimento</h2>
          <div className="mes">
            <button className="icone-botao" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}><ChevronLeft size={20} aria-hidden="true" /></button>
            <strong>{nomeMes(mes)}</strong>
            <button className="icone-botao" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
        </div>

        <div className="numeros tres" aria-label="Resumo do mês">
          <Numero icone={TrendingUp} valor={dinheiro(doMes.entrou)} rotulo="Entrou no mês" />
          <Numero icone={TrendingDown} valor={dinheiro(doMes.saiu)} rotulo="Saiu no mês" />
          <Numero icone={Wallet} valor={dinheiro(doMes.sobrou)} rotulo="Sobrou no mês" negativo={doMes.sobrou < 0} />
        </div>

        <div className="chips" role="group" aria-label="Filtrar lançamentos">
          {FILTROS.map(([k, v]) => <button key={k} className={`chip${filtro === k ? ' ativo' : ''}`} onClick={() => setFiltro(k)}>{v}</button>)}
        </div>

        {lista.length === 0
          ? <Vazio icone={Wallet} titulo="Nada por aqui" texto="Lance entradas e saídas para ver o dinheiro do negócio." />
          : <ListaLancamentos itens={lista} onEditar={(l) => setForm({ inicial: l })} />}
      </section>

      {form && <FormLancamento inicial={form.inicial} onFechar={() => setForm(null)} />}
    </>
  );
}
