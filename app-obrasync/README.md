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
