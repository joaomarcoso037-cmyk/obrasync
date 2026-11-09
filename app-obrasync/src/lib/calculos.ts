import type { Dados, ItemOrcamento, Lancamento, Obra, Orcamento } from './tipos';

const somar = (ls: Lancamento[]) => ls.reduce((t, l) => t + l.valor, 0);

export const valorItem = (i: ItemOrcamento) => Math.round(i.quantidade * i.precoUnitario);

export const subtotalOrcamento = (o: Pick<Orcamento, 'itens'>) => o.itens.reduce((t, i) => t + valorItem(i), 0);

export const totalOrcamento = (o: Pick<Orcamento, 'itens' | 'desconto'>) => Math.max(0, subtotalOrcamento(o) - o.desconto);

export interface ResumoObra {
  contratado: number;
  recebido: number;
  aReceber: number;
  gastoPago: number;
  gastoPrevisto: number;
  resultadoEstimado: number;
}

export function resumoObra(d: Dados, obra: Obra): ResumoObra {
  const ls = d.lancamentos.filter((l) => l.obraId === obra.id);
  const recebido = somar(ls.filter((l) => l.tipo === 'entrada' && l.pago));
  const parcelasAbertas = somar(ls.filter((l) => l.tipo === 'entrada' && !l.pago));
  const gastoPago = somar(ls.filter((l) => l.tipo === 'saida' && l.pago));
  const gastoPrevisto = somar(ls.filter((l) => l.tipo === 'saida' && !l.pago));
  // Parcelas lançadas fazem parte do contrato; só passam dele quando há aditivo.
  const aReceber = Math.max(obra.valorContratado - recebido, parcelasAbertas);
  return {
    contratado: obra.valorContratado,
    recebido,
    aReceber,
    gastoPago,
    gastoPrevisto,
    resultadoEstimado: recebido + aReceber - gastoPago - gastoPrevisto,
  };
}

export interface ResumoGeral {
  saldo: number;
  aReceber: number;
  aPagar: number;
}

export function resumoGeral(d: Dados): ResumoGeral {
  const entradasAvulsas = d.lancamentos.filter((l) => l.tipo === 'entrada' && !l.pago && !l.obraId);
  const aReceberObras = d.obras.reduce((t, o) => t + resumoObra(d, o).aReceber, 0);
  const pagos = d.lancamentos.filter((l) => l.pago);
  return {
    saldo: somar(pagos.filter((l) => l.tipo === 'entrada')) - somar(pagos.filter((l) => l.tipo === 'saida')),
    aReceber: aReceberObras + somar(entradasAvulsas),
    aPagar: somar(d.lancamentos.filter((l) => l.tipo === 'saida' && !l.pago)),
  };
}

export interface ResumoMes {
  entrou: number;
  saiu: number;
  sobrou: number;
}

export function resumoMes(d: Dados, mes: string): ResumoMes {
  const pagos = d.lancamentos.filter((l) => l.pago && l.data.startsWith(mes));
  const entrou = somar(pagos.filter((l) => l.tipo === 'entrada'));
  const saiu = somar(pagos.filter((l) => l.tipo === 'saida'));
  return { entrou, saiu, sobrou: entrou - saiu };
}

export function resumoCliente(d: Dados, clienteId: string) {
  const obras = d.obras.filter((o) => o.clienteId === clienteId);
  return {
    obras,
    orcamentos: d.orcamentos.filter((o) => o.clienteId === clienteId),
    pendente: obras.reduce((t, o) => t + resumoObra(d, o).aReceber, 0),
  };
}

export function resumoFuncionario(d: Dados, funcionarioId: string) {
  const pagamentos = d.lancamentos
    .filter((l) => l.funcionarioId === funcionarioId)
    .sort((a, b) => b.data.localeCompare(a.data));
  return {
    pagamentos,
    pago: somar(pagamentos.filter((l) => l.pago)),
    devido: somar(pagamentos.filter((l) => !l.pago)),
  };
}

export type TipoEvento = 'compromisso' | 'inicio' | 'entrega' | 'receber' | 'pagar';

export interface Evento {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  detalhe: string;
  data: string;
  hora: string;
  link: string;
}

/**
 * Tudo que tem data no negócio, num lugar só. Início e entrega de obra e contas
 * abertas entram sozinhos, sem o usuário precisar cadastrar duas vezes.
 */
export function eventosAgenda(d: Dados): Evento[] {
  const obra = (id: string) => d.obras.find((o) => o.id === id);
  const eventos: Evento[] = [];
  for (const c of d.compromissos) {
    if (c.concluido) continue;
    eventos.push({ id: c.id, tipo: 'compromisso', titulo: c.titulo, detalhe: obra(c.obraId)?.nome ?? '', data: c.data, hora: c.hora, link: '/agenda' });
  }
  for (const o of d.obras) {
    if (o.status === 'concluida') continue;
    if (o.status === 'planejada' && o.inicio) {
      eventos.push({ id: `i-${o.id}`, tipo: 'inicio', titulo: `Início: ${o.nome}`, detalhe: '', data: o.inicio, hora: '', link: `/obras/${o.id}` });
    }
    if (o.previsao) {
      eventos.push({ id: `e-${o.id}`, tipo: 'entrega', titulo: `Entrega: ${o.nome}`, detalhe: '', data: o.previsao, hora: '', link: `/obras/${o.id}` });
    }
  }
  for (const l of d.lancamentos) {
    if (l.pago) continue;
    const tipo = l.tipo === 'entrada' ? 'receber' : 'pagar';
    const rotulo = l.tipo === 'entrada' ? 'Receber' : 'Pagar';
    eventos.push({ id: l.id, tipo, titulo: `${rotulo}: ${l.descricao}`, detalhe: obra(l.obraId)?.nome ?? '', data: l.data, hora: '', link: '/financeiro' });
  }
  return eventos.sort((a, b) => (a.data + (a.hora || '99')).localeCompare(b.data + (b.hora || '99')));
}
