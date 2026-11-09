// Roteiro do vídeo: cada "beat" é uma frase narrada + o que acontece na tela enquanto ela é dita.
// `texto` vai na legenda. `fala` (opcional) é o que a voz lê, quando o texto escrito soa errado.
// Todos os nomes, telefones e valores são fictícios.

const barra = (F, nome) => F.locator('.barra a', { hasText: nome });
const linha = (F, nome) => F.locator('a.linha', { hasText: nome });
const modal = (F) => F.locator('dialog.modal');
// Um <select> dentro do <label> soma o texto das opções ao rótulo, então getByLabel exato não acha.
const lista = (F, rotulo) => F.locator('label.campo').filter({ has: F.getByText(rotulo, { exact: true }) }).locator('select');
const salvarModal = (F) => modal(F).getByRole('button', { name: 'Salvar', exact: true });

export const CENAS = [
  {
    cartao: 'abertura',
    beats: [
      { texto: 'Oi! Em poucos minutos você vai aprender a usar o ObraSync.' },
      { texto: 'Pode pausar quando quiser e ir fazendo junto no seu celular.' },
      { texto: 'Os nomes e valores deste vídeo são só de exemplo.' },
    ],
  },
  {
    titulo: 'Entre na sua conta',
    tela: 'login',
    beats: [
      { texto: 'Abra o link que você recebeu junto com este vídeo.' },
      {
        texto: 'Digite o e-mail e a senha que mandamos para você.',
        faz: async (a, F) => {
          await a.digitar(F.getByLabel('E-mail'), 'seunome@email.com');
          await a.digitar(F.getByLabel('Senha'), 'minhasenha');
        },
      },
      {
        texto: 'Sua conta já está pronta. Toque em Entrar, e não em Criar conta.',
        // Só aponta: o formulário nunca é enviado, a gravação não fala com o servidor.
        faz: async (a, F) => {
          await a.aponta(F.getByRole('button', { name: 'Entrar', exact: true }), 2600);
          await a.tocarSemClicar(F.getByRole('button', { name: 'Entrar', exact: true }));
        },
      },
    ],
  },
  {
    titulo: 'Coloque o nome da empresa',
    tela: 'app',
    beats: [
      { texto: 'Sua conta começa vazia, e só você vê o que colocar aqui.' },
      {
        texto: 'Para conhecer antes, toque em Ver com dados de exemplo. Depois é só apagar em Ajustes.',
        faz: async (a, F) => a.aponta(F.getByRole('button', { name: 'Ver com dados de exemplo' })),
      },
      {
        texto: 'Vamos começar do zero. Toque em Mais e depois em Ajustes.',
        faz: async (a, F) => {
          await a.espera(1500);
          await a.toque(barra(F, 'Mais'));
          await a.toque(linha(F, 'Ajustes'));
        },
      },
      {
        texto: 'Coloque o nome da sua empresa. Ele vai aparecer nos seus orçamentos.',
        faz: async (a, F) => a.digitar(F.getByLabel('Nome da empresa'), 'Minha Empreiteira'),
      },
      {
        texto: 'Toque em Salvar.',
        // Rola o mínimo: abaixo fica o aviso de backup do modo local, que é diferente do que o cliente vê.
        faz: async (a, F) => a.toque(F.getByRole('button', { name: 'Salvar', exact: true }), 'end'),
      },
    ],
  },
  {
    titulo: 'Cadastre sua primeira obra',
    beats: [
      {
        texto: 'Na tela inicial, toque em Cadastrar primeira obra.',
        faz: async (a, F) => {
          await a.toque(barra(F, 'Início'));
          await a.toque(F.getByRole('button', { name: 'Cadastrar primeira obra' }));
        },
      },
      {
        texto: 'Dê um nome para a obra.',
        faz: async (a, F) => a.digitar(F.getByLabel('Nome da obra'), 'Reforma da casa do Carlos'),
      },
      {
        texto: 'Escolha o cliente. Se ele for novo, toque em Novo cliente e digite o nome.',
        faz: async (a, F) => {
          await a.selecionar(lista(F, 'Cliente'), '+ Novo cliente');
          await a.digitar(F.getByLabel('Nome do novo cliente'), 'Carlos Henrique');
        },
      },
      {
        texto: 'Coloque o endereço e o valor que você fechou com o cliente.',
        faz: async (a, F) => {
          await a.digitar(F.getByLabel('Endereço da obra'), 'Rua das Palmeiras, 120');
          await a.digitar(F.getByLabel('Valor contratado'), '12.500,00');
        },
      },
      {
        texto: 'Se quiser, coloque a previsão de entrega.',
        faz: async (a, F) => a.dataEm(F.getByLabel('Previsão de conclusão'), 45),
      },
      {
        texto: 'Toque em Salvar. Sua obra já aparece na tela inicial.',
        faz: async (a, F) => {
          await a.toque(salvarModal(F));
          await a.espera(500);
          await a.aponta(linha(F, 'Reforma da casa do Carlos').first());
        },
      },
    ],
  },
  {
    titulo: 'Controle o dinheiro da obra',
    beats: [
      {
        texto: 'Toque na obra para abrir.',
        faz: async (a, F) => a.toque(linha(F, 'Reforma da casa do Carlos').first()),
      },
      {
        texto: 'Para atualizar o andamento, é só arrastar a barra.',
        faz: async (a, F) => a.arrastar(F.locator('input[type=range]'), 4),
      },
      {
        texto: 'Recebeu do cliente? Toque em Recebimento, coloque o valor e salve.',
        faz: async (a, F) => {
          await a.toque(F.getByRole('button', { name: '+ Recebimento' }));
          await a.digitar(F.getByLabel('Descrição'), 'Sinal da reforma');
          await a.digitar(F.getByLabel('Valor', { exact: true }), '5.000,00');
          await a.toque(salvarModal(F));
        },
      },
      {
        texto: 'Comprou material? Toque em Gasto e faça a mesma coisa.',
        faz: async (a, F) => {
          await a.toque(F.getByRole('button', { name: '+ Gasto' }));
          await a.digitar(F.getByLabel('Descrição'), 'Cimento e areia');
          await a.digitar(F.getByLabel('Valor', { exact: true }), '1.850,00');
          await a.toque(salvarModal(F));
        },
      },
      {
        texto: 'O ObraSync faz a conta: quanto falta receber, quanto gastou e quanto deve sobrar.',
        faz: async (a, F) => a.aponta(F.getByLabel('Dinheiro da obra')),
      },
    ],
  },
  {
    titulo: 'Veja o dinheiro do negócio',
    beats: [
      {
        texto: 'No Financeiro você vê o dinheiro de todas as obras juntas.',
        faz: async (a, F) => {
          await a.toque(barra(F, 'Financeiro'));
          await a.aponta(F.getByLabel('Situação geral'));
        },
      },
      {
        texto: 'Saldo em caixa é o que já entrou menos o que já saiu. Ao lado, o que ainda vai receber.',
        faz: async (a, F) => {
          await a.aponta(F.locator('.numero', { hasText: 'Saldo em caixa' }), 3200);
          await a.aponta(F.locator('.numero', { hasText: 'A receber' }));
        },
      },
      {
        texto: 'Tem uma conta para pagar depois? Toque em Lançar dinheiro.',
        faz: async (a, F) => a.toque(F.getByRole('button', { name: 'Lançar dinheiro' })),
      },
      {
        texto: 'Escreva o que é e coloque o valor.',
        faz: async (a, F) => {
          await a.digitar(F.getByLabel('Descrição'), 'Fatura da loja de materiais');
          await a.digitar(F.getByLabel('Valor', { exact: true }), '640,00');
        },
      },
      {
        texto: 'Desmarque Já paguei e escolha o vencimento. A conta fica guardada como a pagar.',
        faz: async (a, F) => {
          await a.toque(F.getByLabel('Já paguei'));
          await a.dataEm(F.getByLabel('Vencimento'), 10);
        },
      },
      {
        texto: 'Escolha a obra e salve.',
        faz: async (a, F) => {
          await a.selecionar(lista(F, 'Obra'), 'Reforma da casa do Carlos');
          await a.toque(salvarModal(F));
        },
      },
      {
        texto: 'Quando pagar, toque no sinal de visto e pronto.',
        faz: async (a, F) => a.aponta(F.getByRole('button', { name: /Marcar como pago/ }).first()),
      },
    ],
  },
  {
    titulo: 'Salve o telefone do cliente',
    beats: [
      {
        texto: 'Seus clientes ficam em Mais, Clientes.',
        faz: async (a, F) => {
          await a.toque(barra(F, 'Mais'));
          await a.toque(linha(F, 'Clientes'));
        },
      },
      {
        texto: 'Abra o cliente, toque em Editar e coloque o telefone.',
        faz: async (a, F) => {
          await a.toque(F.locator('a.ficha', { hasText: 'Carlos Henrique' }));
          await a.toque(F.getByRole('button', { name: 'Editar cliente' }));
          await a.digitar(F.getByLabel('Telefone'), '(11) 90000-0001');
          await a.toque(salvarModal(F));
        },
      },
      {
        texto: 'Agora dá para ligar ou chamar no WhatsApp com um toque.',
        faz: async (a, F) => a.aponta(F.getByRole('link', { name: 'WhatsApp' })),
      },
    ],
  },
  {
    titulo: 'Faça um orçamento',
    beats: [
      {
        texto: 'Em Orçamentos, toque em Novo orçamento.',
        faz: async (a, F) => {
          await a.toque(barra(F, 'Orçamentos'));
          await a.toque(F.getByRole('button', { name: 'Novo orçamento' }));
        },
      },
      {
        texto: 'Dê um título e escolha o cliente.',
        faz: async (a, F) => {
          await a.digitar(F.getByLabel('Título do orçamento'), 'Reforma de cozinha');
          await a.selecionar(lista(F, 'Cliente'), 'Carlos Henrique');
        },
      },
      {
        texto: 'Agora coloque o serviço, a quantidade e o preço.',
        faz: async (a, F) => {
          const item = F.locator('.item').nth(0);
          await a.digitar(item.getByLabel('Descrição'), 'Assentamento de piso (m²)');
          await a.digitar(item.getByLabel('Qtd.'), '18');
          await a.digitar(item.getByLabel('Preço unitário'), '65,00');
        },
      },
      {
        texto: 'Para colocar material, toque no botão Material e preencha igual.',
        faz: async (a, F) => {
          await a.toque(F.getByRole('button', { name: '+ Material' }));
          const item = F.locator('.item').nth(1);
          await a.digitar(item.getByLabel('Descrição'), 'Porcelanato (m²)');
          await a.digitar(item.getByLabel('Qtd.'), '20');
          await a.digitar(item.getByLabel('Preço unitário'), '79,00');
        },
      },
      {
        texto: 'O total é somado sozinho. Toque em Salvar orçamento.',
        faz: async (a, F) => {
          await a.aponta(F.locator('.totais .final'), 1800);
          await a.toque(F.getByRole('button', { name: 'Salvar orçamento' }));
        },
      },
      {
        texto: 'Pronto. O orçamento sai com o nome da sua empresa.',
        faz: async (a, F) => {
          await a.espera(300);
          await a.aponta(F.locator('.doc-topo h2').first());
        },
      },
      {
        texto: 'Você pode salvar em PDF ou enviar no WhatsApp.',
        faz: async (a, F) => {
          await a.aponta(F.getByRole('button', { name: 'Imprimir ou salvar PDF' }), 1700);
          await a.aponta(F.getByRole('link', { name: 'Enviar no WhatsApp' }));
        },
      },
      {
        texto: 'Cliente aprovou? Toque em Aprovar e criar obra, e ela entra na sua lista.',
        faz: async (a, F) => {
          await a.espera(1200);
          await a.toque(F.getByRole('button', { name: 'Aprovar e criar obra' }));
        },
      },
    ],
  },
  {
    titulo: 'Organize sua equipe',
    beats: [
      {
        texto: 'A equipe fica em Mais, Equipe. Toque em Novo funcionário.',
        faz: async (a, F) => {
          await a.toque(barra(F, 'Mais'));
          await a.toque(linha(F, 'Equipe'));
          await a.toque(F.getByRole('button', { name: 'Novo funcionário' }));
        },
      },
      {
        texto: 'Coloque o nome, a função e marque a obra em que a pessoa trabalha.',
        faz: async (a, F) => {
          await a.digitar(F.getByLabel('Nome', { exact: true }), 'José Almeida');
          await a.digitar(F.getByLabel('Função'), 'Pedreiro');
          await a.toque(F.getByLabel('Reforma da casa do Carlos'));
          await a.toque(salvarModal(F));
        },
      },
      {
        texto: 'Para lançar um pagamento, abra a pessoa e toque em Pagamento.',
        faz: async (a, F) => {
          await a.toque(F.locator('a.ficha', { hasText: 'José Almeida' }));
          await a.toque(F.getByRole('button', { name: '+ Pagamento' }));
        },
      },
      {
        texto: 'Coloque o valor e salve. Ele entra no histórico da pessoa e no Financeiro.',
        faz: async (a, F) => {
          await a.digitar(F.getByLabel('Valor', { exact: true }), '1.500,00');
          await a.toque(salvarModal(F));
        },
      },
    ],
  },
  {
    titulo: 'Use a agenda',
    beats: [
      {
        texto: 'Na Agenda, as entregas de obra e as contas a pagar aparecem sozinhas.',
        faz: async (a, F) => {
          await a.toque(barra(F, 'Mais'));
          await a.toque(linha(F, 'Agenda'));
        },
      },
      {
        texto: 'Para marcar uma visita, toque em Novo compromisso.',
        faz: async (a, F) => a.toque(F.getByRole('button', { name: 'Novo compromisso' })),
      },
      {
        texto: 'Escreva o que é, escolha o dia e a hora, e salve.',
        faz: async (a, F) => {
          await a.digitar(F.getByLabel('O que é'), 'Visita à obra com Carlos');
          await a.dataEm(F.getByLabel('Data'), 1);
          await a.horaEm(F.getByLabel('Hora'), '09:00');
          await a.toque(salvarModal(F));
        },
      },
    ],
  },
  {
    cartao: 'fim',
    beats: [
      { texto: 'Esse é o básico. O ObraSync funciona no celular, no tablet e no computador.' },
      { texto: 'Agora faça o teste com uma obra de verdade sua.' },
      { texto: 'Achou algo confuso? Responda a mensagem em que recebeu este vídeo.' },
      { texto: 'Sua opinião vai ajudar a melhorar o ObraSync. Obrigado!' },
    ],
  },
];

/** O que a voz lê. Escritos normalmente, a voz soletra "ObraSync" e erra "WhatsApp". */
export function textoFalado(beat) {
  return (beat.fala ?? beat.texto)
    .replaceAll('ObraSync', 'Obra Sinque')
    .replaceAll('WhatsApp', 'uatsápi')
    .replaceAll('PDF', 'pê dê éfe');
}
