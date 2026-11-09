// Junta quadros + narração no MP4 final, no tempo exato registrado na gravação.
//   node montar.mjs <arquivo-de-saida.mp4>     (precisa da variável TRABALHO)
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerWav } from './wav.mjs';

const TRABALHO = process.env.TRABALHO;
const saida = process.argv[2];
const ffmpeg = createRequire(join(TRABALHO, 'package.json'))('ffmpeg-static');
const ler = (n) => JSON.parse(readFileSync(join(TRABALHO, n), 'utf8'));

const quadros = ler('quadros.json');
const linha = ler('linha-do-tempo.json');
const trechos = ler('voz/trechos.json');
const t0 = quadros[0].t;
const fimVideo = quadros.at(-1).t - t0 + 0.5;

// Lista de quadros com a duração real de cada um; tela parada não gera quadro novo.
const lista = ['ffconcat version 1.0'];
quadros.forEach((q, i) => {
  const dur = i + 1 < quadros.length ? quadros[i + 1].t - q.t : 0.5;
  lista.push(`file 'quadros/${q.nome}'`, `duration ${dur.toFixed(5)}`);
});
lista.push(`file 'quadros/${quadros.at(-1).nome}'`);
writeFileSync(join(TRABALHO, 'quadros.ffconcat'), lista.join('\n'));

// Narração: cada frase entra no instante em que apareceu na tela.
const taxa = 16000;
const mix = Buffer.alloc(Math.ceil(fimVideo * taxa) * 2);
const sobreposicoes = [];
let ate = 0;
for (const b of linha) {
  const w = lerWav(readFileSync(join(TRABALHO, 'voz', `${b.indice}.wav`)));
  const [ini, fim] = trechos[b.indice];
  const base = Math.round((b.t - t0) * taxa);
  if (base < ate) sobreposicoes.push(`#${b.indice}`);
  w.dados.copy(mix, base * 2, ini * 2, fim * 2);
  ate = base + (fim - ini);
}
const cabecalho = Buffer.alloc(44);
cabecalho.write('RIFF', 0, 'latin1'); cabecalho.writeUInt32LE(36 + mix.length, 4);
cabecalho.write('WAVEfmt ', 8, 'latin1'); cabecalho.writeUInt32LE(16, 16);
cabecalho.writeUInt16LE(1, 20); cabecalho.writeUInt16LE(1, 22);
cabecalho.writeUInt32LE(taxa, 24); cabecalho.writeUInt32LE(taxa * 2, 28);
cabecalho.writeUInt16LE(2, 32); cabecalho.writeUInt16LE(16, 34);
cabecalho.write('data', 36, 'latin1'); cabecalho.writeUInt32LE(mix.length, 40);
writeFileSync(join(TRABALHO, 'narracao.wav'), Buffer.concat([cabecalho, mix]));
if (sobreposicoes.length) console.log(`Falas sobrepostas: ${sobreposicoes.join(', ')}`);

execFileSync(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-safe', '0', '-f', 'concat', '-i', join(TRABALHO, 'quadros.ffconcat'),
  '-i', join(TRABALHO, 'narracao.wav'),
  '-vf', 'fps=30,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
  '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000',
  '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
  '-movflags', '+faststart', '-shortest', saida,
], { stdio: 'inherit' });
console.log(`pronto: ${saida}  (${fimVideo.toFixed(1)}s)`);
