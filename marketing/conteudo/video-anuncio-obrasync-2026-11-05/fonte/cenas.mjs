// Roteiro do anúncio. Cada frase: texto (legenda e narração) + o que acontece na tela.
// Os dados vêm do botão "Ver com dados de exemplo" do próprio app, todos fictícios.
const salvarModal = (F) => F.locator('dialog.modal').getByRole('button', { name: 'Salvar', exact: true });

export const FRASES = [
  {
    texto: 'Obra no caderno. Dinheiro no WhatsApp. Conta de cabeça.',
    semLegenda: true,
    faz: async (a) => {
      await a.gancho('Obra no <b>caderno.</b>');
      await a.espera(1150);
      await a.gancho('Dinheiro no <b>WhatsApp.</b>');
      await a.espera(1150);
      await a.gancho('Conta de <b>cabeça.</b>');
    },
  },
  {
    texto: 'No fim do mês, quanto sobrou de verdade?',
    semLegenda: true,
    faz: async (a) => a.pergunta('No fim do mês, quanto <b>sobrou de verdade?</b>'),
  },
  {
    texto: 'Com o ObraSync, você sabe na hora.',
    marca: 'virada',
    faz: async (a) => a.logo(),
  },
  {
    titulo: 'Tudo na <b>palma da mão</b>',
    texto: 'Abriu o app, viu tudo: suas obras, o que tem a receber e o que está vencendo.',
    faz: async (a, F) => {
      await a.mostrarAparelho();
      await a.espera(700);
      await a.destaca(F.locator('section.numeros'), 2.05, 1900);
      await a.destaca(F.locator('.aviso.ruim'), 2.05);
    },
  },
  {
    titulo: 'Cada obra <b>no detalhe</b>',
    texto: 'Toque na obra: andamento, o que falta receber e quanto deve sobrar.',
    faz: async (a, F) => {
      await a.corte('#/obras');
      await a.toque(F.locator('a.ficha', { hasText: 'Reforma residencial' }));
      await a.arrastar(F.locator('input[type=range]'), 3);
      await a.destaca(F.getByLabel('Dinheiro da obra'), 2.05);
    },
  },
  {
    titulo: 'Lançou, <b>a conta fecha</b>',
    texto: 'Comprou material? Lança em segundos, e a conta se faz sozinha.',
    faz: async (a, F) => {
      await a.toque(F.getByRole('button', { name: '+ Gasto' }));
      await a.digitar(F.getByLabel('Descrição'), 'Piso e argamassa');
      await a.digitar(F.getByLabel('Valor', { exact: true }), '980,00');
      await a.toque(salvarModal(F));
      await a.destaca(F.locator('.numero', { hasText: 'Gastos da obra' }), 2.6);
    },
  },
  {
    titulo: 'Orçamento <b>profissional</b>',
    texto: 'Monte o orçamento com o nome da sua empresa.',
    faz: async (a, F) => {
      await a.corte('#/orcamentos');
      await a.toque(F.locator('a.ficha', { hasText: 'Reforma de cozinha' }));
      await a.destaca(F.locator('.doc-topo'), 2.05);
    },
  },
  {
    texto: 'Mande direto no WhatsApp do cliente.',
    faz: async (a, F) => a.destaca(F.getByRole('link', { name: 'Enviar no WhatsApp' }), 2.5),
  },
  {
    texto: 'Aprovou? Com um toque, vira obra.',
    faz: async (a, F) => a.toque(F.getByRole('button', { name: 'Aprovar e criar obra' })),
  },
  {
    titulo: 'Dinheiro <b>sob controle</b>',
    texto: 'Saldo, a receber, a pagar. Você vê quanto sobra antes do mês acabar.',
    faz: async (a, F) => {
      await a.corte('#/financeiro');
      await a.destaca(F.getByLabel('Situação geral'), 2.05, 0);
      for (const [rotulo, ms] of [['Saldo em caixa', 650], ['A receber', 650], ['A pagar', 750], ['Resultado estimado', 0]]) {
        await a.anelEm(F.locator('.numero', { hasText: rotulo }), ms);
      }
    },
  },
  {
    texto: 'E conta atrasada não passa batido.',
    faz: async (a, F) => {
      await a.toque(F.getByRole('button', { name: 'Atrasados' }));
      await a.destaca(F.locator('.linha.lanc').first(), 2.1);
    },
  },
  {
    titulo: 'Equipe e agenda <b>em dia</b>',
    texto: 'Veja quanto cada funcionário tem a receber.',
    faz: async (a, F) => {
      await a.corte('#/equipe');
      await a.destaca(F.locator('a.ficha', { hasText: 'José Almeida' }), 2.05);
    },
  },
  {
    texto: 'Entregas e contas entram na agenda sozinhas.',
    faz: async (a, F) => {
      await a.corte('#/agenda');
      await a.destaca(F.locator('section.cartao').first(), 2.05);
    },
  },
  {
    texto: 'Sem sistema complicado. Feito para quem trabalha com obra.',
    semLegenda: true,
    faz: async (a) => a.fechamento('Sem sistema <b>complicado.</b>', 'Feito para quem trabalha com obra.', 1750),
  },
  {
    texto: 'No celular, no tablet e no computador.',
    semLegenda: true,
    faz: async (a) => a.fechamento('Celular, tablet e <b>computador.</b>', 'A mesma conta em todos eles.', 1000),
  },
  {
    texto: 'Seu acesso já está pronto. Abra o link, toque em Entrar e teste com uma obra sua.',
    semLegenda: true,
    faz: async (a) => {
      await a.chamada();
      await a.espera(1900);
      await a.passo(1, 'Abra o link');
      await a.espera(900);
      await a.passo(2, 'Toque em Entrar');
      await a.espera(1000);
      await a.passo(3, 'Teste com uma obra sua');
    },
  },
];

/** O que a voz lê: escritos normalmente, a voz erra esses nomes. */
export function textoFalado(frase) {
  return frase.texto.replaceAll('ObraSync', 'Obra Sinque').replaceAll('WhatsApp', 'uatsápi');
}
