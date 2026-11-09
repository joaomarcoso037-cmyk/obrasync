# Roteiro de locução do anúncio

Duração: 58 segundos. Tom: direto e com energia, sem exagero. Cada frase tem um tempo máximo para caber no vídeo.

| # | Frase | Tempo máximo |
|---|---|---|
| 1 | Obra no caderno. Dinheiro no WhatsApp. Conta de cabeça. | 4.5s |
| 2 | No fim do mês, quanto sobrou de verdade? | 2.5s |
| 3 | Com o ObraSync, você sabe na hora. | 2.2s |
| 4 | Abriu o app, viu tudo: suas obras, o que tem a receber e o que está vencendo. | 4.5s |
| 5 | Toque na obra: andamento, o que falta receber e quanto deve sobrar. | 4.0s |
| 6 | Comprou material? Lança em segundos, e a conta se faz sozinha. | 4.4s |
| 7 | Monte o orçamento com o nome da sua empresa. | 2.4s |
| 8 | Mande direto no WhatsApp do cliente. | 2.0s |
| 9 | Aprovou? Com um toque, vira obra. | 3.0s |
| 10 | Saldo, a receber, a pagar. Você vê quanto sobra antes do mês acabar. | 5.2s |
| 11 | E conta atrasada não passa batido. | 2.1s |
| 12 | Veja quanto cada funcionário tem a receber. | 2.5s |
| 13 | Entregas e contas entram na agenda sozinhas. | 2.5s |
| 14 | Sem sistema complicado. Feito para quem trabalha com obra. | 4.1s |
| 15 | No celular, no tablet e no computador. | 2.4s |
| 16 | Seu acesso já está pronto. Abra o link, toque em Entrar e teste com uma obra sua. | 5.5s |

Pronúncia: ObraSync = "Obra Sinque".

## Para gerar de novo

1. Numa pasta de trabalho: `npm init -y && npm i playwright-core ffmpeg-static`. Aponte a variável `TRABALHO` para ela.
2. Em `app-obrasync/`: `npx vite --port 4310 --strictPort`.
3. Em `fonte/`: `node guia.mjs`, `node gravar.mjs gravar` e `node montar.mjs saida.mp4 <pasta-da-voz>`.

A pasta da voz leva um WAV por frase: `0.wav`, `1.wav` e assim por diante. Sem pasta, sai só com música. O áudio do `guia.mjs` serve só para medir o tempo e não entra no vídeo.
