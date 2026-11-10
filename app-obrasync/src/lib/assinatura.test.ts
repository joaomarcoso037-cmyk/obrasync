import { describe, expect, it } from 'vitest';
import { calcularAcesso, documentoValido, valorPorMes, type Assinatura } from './assinatura';

const agora = new Date('2026-11-10T12:00:00-03:00');
const dia = (n: number) => new Date(agora.getTime() + n * 86400000).toISOString();
const conta = (p: Partial<Assinatura>): Assinatura => ({
  plano: null, testeAte: dia(14), pagoAte: null, cancelada: false, assinou: false, linkPagamento: null, ...p,
});

describe('acesso', () => {
  it('conta nova fica em teste por 14 dias', () => {
    expect(calcularAcesso(conta({}), agora)).toMatchObject({ estado: 'teste', dias: 14 });
  });

  it('teste que termina em algumas horas ainda conta 1 dia', () => {
    expect(calcularAcesso(conta({ testeAte: dia(0.2) }), agora)).toMatchObject({ estado: 'teste', dias: 1 });
  });

  it('teste acabado sem pagamento bloqueia na hora', () => {
    expect(calcularAcesso(conta({ testeAte: dia(-1) }), agora).estado).toBe('bloqueada');
  });

  it('quem pagou durante o teste já aparece em dia', () => {
    expect(calcularAcesso(conta({ testeAte: dia(5), pagoAte: dia(35) }), agora).estado).toBe('em-dia');
  });

  it('mensalidade vencida libera por mais 7 dias', () => {
    expect(calcularAcesso(conta({ testeAte: dia(-40), pagoAte: dia(-2) }), agora)).toMatchObject({ estado: 'atrasada', dias: 5 });
  });

  it('bloqueia depois dos 7 dias de atraso', () => {
    expect(calcularAcesso(conta({ testeAte: dia(-40), pagoAte: dia(-7.01) }), agora).estado).toBe('bloqueada');
  });

  it('cancelada continua liberada até o fim do período pago', () => {
    expect(calcularAcesso(conta({ testeAte: dia(-40), pagoAte: dia(10), cancelada: true }), agora).estado).toBe('em-dia');
  });
});

describe('CPF e CNPJ', () => {
  it.each(['529.982.247-25', '52998224725', '11.222.333/0001-81', '11444777000161'])('aceita %s', (d) => {
    expect(documentoValido(d)).toBe(true);
  });

  it.each(['', '123', '529.982.247-24', '111.111.111-11', '11.222.333/0001-80', '00000000000000'])('recusa %s', (d) => {
    expect(documentoValido(d)).toBe(false);
  });
});

it('plano anual mostra quanto sai por mês', () => {
  expect(valorPorMes({ id: 'anual', nome: 'Anual', valorCentavos: 59900, ciclo: 'YEARLY' })).toBe(4992);
  expect(valorPorMes({ id: 'mensal', nome: 'Mensal', valorCentavos: 5990, ciclo: 'MONTHLY' })).toBe(5990);
});
