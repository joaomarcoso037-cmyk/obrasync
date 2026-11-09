# Roteiro do vídeo tutorial

Duração: 4min41. Formato vertical (1080×1920). Todos os nomes e valores são fictícios.

## Abertura

- Oi! Em poucos minutos você vai aprender a usar o ObraSync.
- Pode pausar quando quiser e ir fazendo junto no seu celular.
- Os nomes e valores deste vídeo são só de exemplo.

## Passo 1: Entre na sua conta

- Abra o link que você recebeu junto com este vídeo.
- Digite o e-mail e a senha que mandamos para você.
- Sua conta já está pronta. Toque em Entrar, e não em Criar conta.

## Passo 2: Coloque o nome da empresa

- Sua conta começa vazia, e só você vê o que colocar aqui.
- Para conhecer antes, toque em Ver com dados de exemplo. Depois é só apagar em Ajustes.
- Vamos começar do zero. Toque em Mais e depois em Ajustes.
- Coloque o nome da sua empresa. Ele vai aparecer nos seus orçamentos.
- Toque em Salvar.

## Passo 3: Cadastre sua primeira obra

- Na tela inicial, toque em Cadastrar primeira obra.
- Dê um nome para a obra.
- Escolha o cliente. Se ele for novo, toque em Novo cliente e digite o nome.
- Coloque o endereço e o valor que você fechou com o cliente.
- Se quiser, coloque a previsão de entrega.
- Toque em Salvar. Sua obra já aparece na tela inicial.

## Passo 4: Controle o dinheiro da obra

- Toque na obra para abrir.
- Para atualizar o andamento, é só arrastar a barra.
- Recebeu do cliente? Toque em Recebimento, coloque o valor e salve.
- Comprou material? Toque em Gasto e faça a mesma coisa.
- O ObraSync faz a conta: quanto falta receber, quanto gastou e quanto deve sobrar.

## Passo 5: Veja o dinheiro do negócio

- No Financeiro você vê o dinheiro de todas as obras juntas.
- Saldo em caixa é o que já entrou menos o que já saiu. Ao lado, o que ainda vai receber.
- Tem uma conta para pagar depois? Toque em Lançar dinheiro.
- Escreva o que é e coloque o valor.
- Desmarque Já paguei e escolha o vencimento. A conta fica guardada como a pagar.
- Escolha a obra e salve.
- Quando pagar, toque no sinal de visto e pronto.

## Passo 6: Salve o telefone do cliente

- Seus clientes ficam em Mais, Clientes.
- Abra o cliente, toque em Editar e coloque o telefone.
- Agora dá para ligar ou chamar no WhatsApp com um toque.

## Passo 7: Faça um orçamento

- Em Orçamentos, toque em Novo orçamento.
- Dê um título e escolha o cliente.
- Agora coloque o serviço, a quantidade e o preço.
- Para colocar material, toque no botão Material e preencha igual.
- O total é somado sozinho. Toque em Salvar orçamento.
- Pronto. O orçamento sai com o nome da sua empresa.
- Você pode salvar em PDF ou enviar no WhatsApp.
- Cliente aprovou? Toque em Aprovar e criar obra, e ela entra na sua lista.

## Passo 8: Organize sua equipe

- A equipe fica em Mais, Equipe. Toque em Novo funcionário.
- Coloque o nome, a função e marque a obra em que a pessoa trabalha.
- Para lançar um pagamento, abra a pessoa e toque em Pagamento.
- Coloque o valor e salve. Ele entra no histórico da pessoa e no Financeiro.

## Passo 9: Use a agenda

- Na Agenda, as entregas de obra e as contas a pagar aparecem sozinhas.
- Para marcar uma visita, toque em Novo compromisso.
- Escreva o que é, escolha o dia e a hora, e salve.

## Encerramento

- Esse é o básico. O ObraSync funciona no celular, no tablet e no computador.
- Agora faça o teste com uma obra de verdade sua.
- Achou algo confuso? Responda a mensagem em que recebeu este vídeo.
- Sua opinião vai ajudar a melhorar o ObraSync. Obrigado!

## Para gerar de novo

1. Numa pasta de trabalho: `npm init -y && npm i playwright-core ffmpeg-static`. Aponte a variável `TRABALHO` para ela.
2. Em `app-obrasync/`: `npx vite --port 4310 --strictPort` e, em outro terminal, `npx vite --mode supabase --port 4311 --strictPort`.
3. Em `fonte/`: `node voz.mjs Maria` (ou `Daniel`), `node gravar.mjs gravar` e `node montar.mjs saida.mp4`.

O texto fica em `fonte/cenas.mjs`. A gravação bloqueia a internet no navegador e nunca envia o formulário de login.
