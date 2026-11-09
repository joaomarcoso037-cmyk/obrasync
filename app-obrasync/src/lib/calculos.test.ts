import { describe, expect, it } from 'vitest';
import { eventosAgenda, resumoFuncionario, resumoGeral, resumoMes, resumoObra, totalOrcamento } from './calculos';
import { dataAmigavel, hoje, linkWhatsApp, lerDinheiro, somarDias, somarMeses } from './formato';
import { bloqueioCliente, bloqueioFuncionario, lerBackup, semObra, VAZIO } from './regras';
import type { Dados, Lancamento, Obra } from './tipos';

const obra = (p: Partial<Obra> = {}): Obra => ({
  id: 'o1', nome: 'Obra', endereco: '', clienteId: 'c1', valorContratado: 100000, inicio: '', previsao: '',
  status: 'andamento', progresso: 0, observacoes: '', ...p,
});

const lanc = (p: Partial<Lancamento>): Lancamento => ({
  id: crypto.randomUUID(), tipo: 'entrada', descricao: 'x', valor: 0, data: '2026-11-10', pago: true,
  categoria: '', obraId: '', funcionarioId: '', ...p,
});

const dados = (p: Partial<Dados> = {}): Dados => ({ ...VAZIO, ...p });

describe('lerDinheiro', () => {
  it.each([
    ['1.250,50', 125050], ['1250,5', 125050], ['R$ 800', 80000], ['1.250', 125000],
    ['1.250.000', 125000000], ['12.5', 1250], ['0,01', 1], ['', 0], ['19,99', 1999],
  ])('%s', (texto, esperado) => expect(lerDinheiro(texto)).toBe(esperado));

  it.each(['abc', '12,3,4', '-5'])('recusa %s', (texto) => expect(lerDinheiro(texto)).toBeNull());
});

describe('orçamento', () => {
  const itens = [
    { id: '1', tipo: 'servico' as const, descricao: '', quantidade: 2.5, precoUnitario: 1001 },
    { id: '2', tipo: 'material' as const, descricao: '', quantidade: 3, precoUnitario: 1000 },
  ];

  it('soma itens e aplica desconto', () => expect(totalOrcamento({ itens, desconto: 503 })).toBe(5000));
  it('desconto maior que o subtotal não fica negativo', () => expect(totalOrcamento({ itens, desconto: 99999 })).toBe(0));
});

describe('resumoObra', () => {
  it('parcela aberta não é somada duas vezes ao saldo do contrato', () => {
    const o = obra();
    const d = dados({ obras: [o], lancamentos: [lanc({ obraId: 'o1', valor: 30000 }), lanc({ obraId: 'o1', valor: 40000, pago: false })] });
    expect(resumoObra(d, o)).toMatchObject({ recebido: 30000, aReceber: 70000 });
  });

  it('aditivo acima do contrato conta como a receber', () => {
    const o = obra();
    const d = dados({ obras: [o], lancamentos: [lanc({ obraId: 'o1', valor: 100000 }), lanc({ obraId: 'o1', valor: 20000, pago: false })] });
    expect(resumoObra(d, o).aReceber).toBe(20000);
  });

  it('recebeu mais que o contrato: nada a receber, sem valor negativo', () => {
    const o = obra();
    const d = dados({ obras: [o], lancamentos: [lanc({ obraId: 'o1', valor: 120000 })] });
    expect(resumoObra(d, o).aReceber).toBe(0);
  });

  it('resultado desconta gastos pagos e previstos', () => {
    const o = obra();
    const d = dados({ obras: [o], lancamentos: [lanc({ obraId: 'o1', tipo: 'saida', valor: 30000 }), lanc({ obraId: 'o1', tipo: 'saida', valor: 10000, pago: false })] });
    expect(resumoObra(d, o).resultadoEstimado).toBe(60000);
  });
});

describe('resumo geral e do mês', () => {
  const o = obra();
  const d = dados({
    obras: [o],
    lancamentos: [
      lanc({ obraId: 'o1', valor: 40000, data: '2026-11-02' }),
      lanc({ tipo: 'saida', valor: 15000, data: '2026-11-03' }),
      lanc({ tipo: 'saida', valor: 5000, data: '2026-10-30' }),
      lanc({ tipo: 'saida', valor: 7000, pago: false, data: '2026-11-20' }),
      lanc({ valor: 9000, pago: false, data: '2026-11-21' }),
    ],
  });

  it('saldo só conta o que foi pago de verdade', () => expect(resumoGeral(d).saldo).toBe(20000));
  it('a receber soma saldo de obras e entradas avulsas', () => expect(resumoGeral(d).aReceber).toBe(69000));
  it('a pagar soma saídas abertas', () => expect(resumoGeral(d).aPagar).toBe(7000));
  it('mês isola o período e ignora pendências', () => expect(resumoMes(d, '2026-11')).toEqual({ entrou: 40000, saiu: 15000, sobrou: 25000 }));
});

describe('funcionário', () => {
  it('separa pago de devido', () => {
    const d = dados({ lancamentos: [lanc({ tipo: 'saida', funcionarioId: 'f1', valor: 100 }), lanc({ tipo: 'saida', funcionarioId: 'f1', valor: 50, pago: false }), lanc({ tipo: 'saida', funcionarioId: 'f2', valor: 9 })] });
    expect(resumoFuncionario(d, 'f1')).toMatchObject({ pago: 100, devido: 50 });
  });
});

describe('agenda', () => {
  it('reúne compromissos, entregas e contas, ordenados, sem o que já acabou', () => {
    const d = dados({
      obras: [obra({ previsao: '2026-12-01' }), obra({ id: 'o2', previsao: '2026-11-01', status: 'concluida' })],
      lancamentos: [lanc({ pago: false, data: '2026-11-15', descricao: 'Parcela' }), lanc({ data: '2026-11-16' })],
      compromissos: [
        { id: 'c', titulo: 'Visita', tipo: 'visita', data: '2026-11-15', hora: '08:00', obraId: '', observacoes: '', concluido: false },
        { id: 'd', titulo: 'Feita', tipo: 'outro', data: '2026-11-14', hora: '', obraId: '', observacoes: '', concluido: true },
      ],
    });
    expect(eventosAgenda(d).map((e) => e.titulo)).toEqual(['Visita', 'Receber: Parcela', 'Entrega: Obra']);
  });
});

describe('datas', () => {
  it('hoje usa o dia local, inclusive de noite', () => expect(hoje(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05'));
  it('soma dias virando o mês', () => expect(somarDias('2026-01-31', 1)).toBe('2026-02-01'));
  it('soma meses virando o ano', () => expect(somarMeses('2026-12', 1)).toBe('2027-01'));
  it('fala amanhã', () => expect(dataAmigavel('2026-11-06', '2026-11-05')).toBe('Amanhã'));
});

describe('whatsapp', () => {
  it('adiciona 55 ao celular', () => expect(linkWhatsApp('(11) 91234-5678')).toBe('https://wa.me/5511912345678'));
  it('não duplica o 55', () => expect(linkWhatsApp('+55 11 91234-5678')).toBe('https://wa.me/5511912345678'));
  it('recusa número incompleto', () => expect(linkWhatsApp('1234')).toBeNull());
});

describe('integridade', () => {
  it('excluir obra mantém o dinheiro no financeiro e solta os vínculos', () => {
    const d = dados({
      obras: [obra()],
      lancamentos: [lanc({ obraId: 'o1' })],
      funcionarios: [{ id: 'f', nome: '', funcao: '', telefone: '', obraIds: ['o1', 'o2'], ativo: true }],
    });
    const r = semObra(d, 'o1');
    expect(r.obras).toHaveLength(0);
    expect(r.lancamentos[0].obraId).toBe('');
    expect(r.funcionarios[0].obraIds).toEqual(['o2']);
  });

  it('impede excluir cliente com obra', () => expect(bloqueioCliente(dados({ obras: [obra()] }), 'c1')).toBeTruthy());
  it('impede excluir funcionário com pagamento', () => expect(bloqueioFuncionario(dados({ lancamentos: [lanc({ funcionarioId: 'f' })] }), 'f')).toBeTruthy());
  it('recusa backup que não é do ObraSync', () => {
    expect(lerBackup({ foo: 1 })).toBeNull();
    expect(lerBackup(null)).toBeNull();
    expect(lerBackup({ ...VAZIO })).not.toBeNull();
  });
});
