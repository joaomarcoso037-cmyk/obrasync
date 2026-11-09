import { hoje, novoId, somarDias } from './formato';
import { VAZIO } from './regras';
import type { Dados, Lancamento } from './tipos';

/** Dados fictícios para conhecer o app. Todas as datas são relativas a hoje. */
export function dadosDeExemplo(): Dados {
  const dia = (n: number) => somarDias(hoje(), n);
  const inicioDoMes = `${hoje().slice(0, 7)}-01`;
  const [carlos, marcos, ana] = [novoId(), novoId(), novoId()];
  const [reforma, pintura, telhado] = [novoId(), novoId(), novoId()];
  const [jose, paulo] = [novoId(), novoId()];

  const l = (p: Partial<Lancamento> & Pick<Lancamento, 'tipo' | 'descricao' | 'valor' | 'data' | 'pago'>): Lancamento => ({
    id: novoId(),
    categoria: p.tipo === 'entrada' ? 'Pagamento de cliente' : 'Material',
    obraId: '',
    funcionarioId: '',
    ...p,
  });

  return {
    ...VAZIO,
    empresa: { nome: 'Construtora Exemplo', telefone: '(11) 90000-0000', documento: '', endereco: '' },
    clientes: [
      { id: carlos, nome: 'Carlos Henrique', telefone: '(11) 90000-0001', endereco: 'Rua das Palmeiras, 120', observacoes: '' },
      { id: marcos, nome: 'Marcos Silva', telefone: '(11) 90000-0002', endereco: 'Av. Central, 800', observacoes: '' },
      { id: ana, nome: 'Ana Paula Souza', telefone: '(11) 90000-0003', endereco: 'Rua do Sol, 45', observacoes: '' },
    ],
    obras: [
      { id: reforma, nome: 'Reforma residencial', endereco: 'Rua das Palmeiras, 120', clienteId: carlos, valorContratado: 1250000, inicio: dia(-30), previsao: dia(25), status: 'andamento', progresso: 60, observacoes: '' },
      { id: pintura, nome: 'Pintura comercial', endereco: 'Av. Central, 800', clienteId: marcos, valorContratado: 480000, inicio: dia(-10), previsao: dia(12), status: 'andamento', progresso: 35, observacoes: '' },
      { id: telhado, nome: 'Troca de telhado', endereco: 'Rua do Sol, 45', clienteId: ana, valorContratado: 920000, inicio: dia(-90), previsao: dia(-40), status: 'concluida', progresso: 100, observacoes: '' },
    ],
    funcionarios: [
      { id: jose, nome: 'José Almeida', funcao: 'Pedreiro', telefone: '(11) 90000-0004', obraIds: [reforma], ativo: true },
      { id: paulo, nome: 'Paulo Ramos', funcao: 'Pintor', telefone: '(11) 90000-0005', obraIds: [pintura], ativo: true },
    ],
    lancamentos: [
      l({ tipo: 'entrada', descricao: 'Sinal da reforma', valor: 500000, data: dia(-28), pago: true, obraId: reforma }),
      l({ tipo: 'entrada', descricao: 'Segunda parcela da reforma', valor: 400000, data: dia(5), pago: false, obraId: reforma }),
      l({ tipo: 'saida', descricao: 'Cimento e areia', valor: 185000, data: dia(-20), pago: true, obraId: reforma }),
      l({ tipo: 'saida', descricao: 'Pagamento quinzena', valor: 150000, data: inicioDoMes, pago: true, obraId: reforma, funcionarioId: jose, categoria: 'Mão de obra' }),
      l({ tipo: 'saida', descricao: 'Pagamento quinzena', valor: 150000, data: dia(9), pago: false, obraId: reforma, funcionarioId: jose, categoria: 'Mão de obra' }),
      l({ tipo: 'entrada', descricao: 'Sinal da pintura', valor: 150000, data: inicioDoMes, pago: true, obraId: pintura }),
      l({ tipo: 'saida', descricao: 'Tinta e massa', valor: 92000, data: inicioDoMes, pago: true, obraId: pintura }),
      l({ tipo: 'saida', descricao: 'Fatura da loja de materiais', valor: 64000, data: dia(-2), pago: false, obraId: pintura }),
      l({ tipo: 'entrada', descricao: 'Pagamento final do telhado', valor: 920000, data: dia(-40), pago: true, obraId: telhado }),
      l({ tipo: 'saida', descricao: 'Telhas e madeiramento', valor: 410000, data: dia(-70), pago: true, obraId: telhado }),
    ],
    compromissos: [
      { id: novoId(), titulo: 'Visita à obra com Carlos', tipo: 'visita', data: dia(1), hora: '09:00', obraId: reforma, observacoes: '', concluido: false },
      { id: novoId(), titulo: 'Reunião sobre orçamento da cozinha', tipo: 'reuniao', data: dia(3), hora: '14:30', obraId: '', observacoes: '', concluido: false },
    ],
    orcamentos: [
      {
        id: novoId(),
        numero: 1,
        titulo: 'Reforma de cozinha',
        clienteId: ana,
        obraId: '',
        data: dia(-3),
        validade: dia(12),
        desconto: 20000,
        status: 'enviado',
        observacoes: 'Pagamento: 40% de sinal e o restante na entrega.',
        itens: [
          { id: novoId(), tipo: 'servico', descricao: 'Demolição e retirada de entulho', quantidade: 1, precoUnitario: 120000 },
          { id: novoId(), tipo: 'servico', descricao: 'Assentamento de piso (m²)', quantidade: 18, precoUnitario: 6500 },
          { id: novoId(), tipo: 'material', descricao: 'Porcelanato (m²)', quantidade: 20, precoUnitario: 7900 },
        ],
      },
    ],
    proximoOrcamento: 2,
  };
}
