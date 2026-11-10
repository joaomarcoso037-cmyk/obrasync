# ObraSync

Aplicativo web de gestão para empreiteiros e prestadores de serviços da construção civil: obras, clientes, orçamentos, financeiro, equipe e agenda. Funciona no computador, tablet e celular.

## Como abrir

No Windows, dê dois cliques em `abrir-obrasync.bat`. O app abre em http://localhost:4173. Deixe a janela preta aberta enquanto usa.

Pelo terminal:

```bash
npm install
npm run dev      # para desenvolver
npm test         # testes dos cálculos
npm run build    # confere os tipos e gera a versão final em dist/
```

## Onde ficam os dados

O app tem dois modos, definidos na hora de gerar a versão final:

- **Sem login (`npm run build`):** usado pelo atalho `abrir-obrasync.bat` e pelos testes. Tudo fica no navegador do aparelho (`localStorage`), no endereço `localhost:4173`. Por isso a porta é fixa: mudar a porta faz o app abrir vazio. Use **Ajustes > Baixar backup** com frequência.
- **Com login (`npx vite build --mode supabase`):** lê `.env.supabase` e guarda os dados de cada conta na tabela `espacos` da Supabase, definida em `supabase/schema.sql`. Cada conta acessa só a própria linha, regra garantida no banco.

Os dados do modo sem login não passam sozinhos para o modo com login.

O login depende de um envio de e-mail próprio (SMTP) para receber clientes: o envio padrão da Supabase só entrega para a equipe do projeto.

## Mensalidade (Asaas)

Só existe no modo com login. A cobrança é feita pelo Asaas: o empreiteiro escolhe o plano no app e paga por Pix (só Pix, sem boleto nem cartão) na página do Asaas. O acesso libera assim que o Pix cai.

- **Teste grátis:** toda conta nova ganha 14 dias, sem cartão. Contas que já existiam ganham 14 dias contados da instalação.
- **Planos:** mensal e anual, com preços na tabela `planos` da Supabase (valores em centavos). Mensal: R$ 97,99. Anual: R$ 959,99, que sai R$ 80,00 por mês (18% de economia). Um preço novo vale só para quem assinar depois.
- **Atraso:** aviso no topo das telas assim que vence. Depois de 7 dias, só a tela de pagamento abre. Os dados não são apagados e podem ser baixados nessa tela.
- **Troca de plano e cancelamento:** em Ajustes > Assinatura. O tempo já pago continua valendo.
- **Segurança:** o app só lê a assinatura. Quem grava é o servidor, quando o Asaas avisa do pagamento. O banco também recusa gravar dados de conta bloqueada.

Peças:

```
supabase/assinaturas.sql                tabelas, teste de 14 dias e regra de bloqueio
supabase/functions/assinatura/          cria a assinatura no Asaas e devolve o link de pagamento
supabase/functions/asaas-webhook/       recebe do Asaas os avisos de pagamento
src/lib/assinatura.ts                   regra de acesso no app (com testes)
src/components/Assinatura.tsx           escolha do plano, tela de bloqueio e avisos
```

Para ligar, nesta ordem:

1. Criar conta no Asaas. Para testar, usar o ambiente de testes (sandbox.asaas.com), onde o dinheiro é de mentira.
2. No SQL Editor da Supabase, rodar `supabase/assinaturas.sql`.
3. Dar dois cliques em `configurar-cobranca.bat` e seguir a janela. No fim, ela mostra a URL e o token do webhook.
4. No Asaas, em Integrações > Webhooks, cadastrar essa URL e esse token, com os eventos de Cobranças e de Assinaturas.
5. Publicar o site de novo com `publicar-login.bat`.

Para passar a cobrar de verdade, rodar `configurar-cobranca.bat` de novo com a chave da conta real e cadastrar o webhook também nessa conta.

## Regras de cálculo

Ficam em `src/lib/calculos.ts`, cobertas por testes em `src/lib/calculos.test.ts`.

- Dinheiro é guardado em centavos inteiros, nunca em número decimal.
- **A receber de uma obra:** o maior valor entre o saldo do contrato e as parcelas abertas. Assim, uma parcela lançada não conta duas vezes, e um aditivo acima do contrato continua aparecendo.
- **Saldo em caixa:** só o que foi marcado como pago ou recebido.
- **Resultado estimado:** saldo + a receber − a pagar.
- **Pagamento de funcionário** é uma saída do financeiro ligada à pessoa, então aparece nos dois lugares sem cadastro duplicado.
- **Agenda:** início e entrega de obras e contas abertas entram sozinhos.

## Estrutura

```
src/lib/          tipos, cálculos, regras de exclusão, armazenamento e dados de exemplo
src/components/   interface compartilhada e formulários
src/pages/        uma tela por módulo
```
