// Gera uma narração WAV por frase e mede a duração de cada uma.
//   node voz.mjs [Maria|Daniel]     (precisa da variável TRABALHO)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CENAS, textoFalado } from './cenas.mjs';
import { lerWav } from './wav.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const pasta = join(process.env.TRABALHO, 'voz');
mkdirSync(pasta, { recursive: true });
const falas = CENAS.flatMap((c) => c.beats).map(textoFalado);
const lista = join(pasta, 'falas.json');
writeFileSync(lista, JSON.stringify(falas), 'utf8');
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(AQUI, 'voz.ps1'), '-Lista', lista, '-Pasta', pasta, '-Voz', process.argv[2] ?? 'Maria'], { stdio: 'inherit' });

// A voz do Windows deixa cerca de 1s de silêncio em cada arquivo: corta para o vídeo não ficar parado.
const LIMIAR = 300;
const duracoes = {};
const trechos = {};
falas.forEach((_, i) => {
  const w = lerWav(readFileSync(join(pasta, `${i}.wav`)));
  const n = w.dados.length / 2;
  let ini = 0;
  while (ini < n && Math.abs(w.dados.readInt16LE(ini * 2)) < LIMIAR) ini += 1;
  let fim = n - 1;
  while (fim > 0 && Math.abs(w.dados.readInt16LE(fim * 2)) < LIMIAR) fim -= 1;
  const folga = Math.round(w.taxa * 0.04);
  trechos[i] = [Math.max(0, ini - folga), Math.min(n, fim + folga)];
  duracoes[i] = (trechos[i][1] - trechos[i][0]) / w.taxa;
});
writeFileSync(join(pasta, 'duracoes.json'), JSON.stringify(duracoes, null, 1));
writeFileSync(join(pasta, 'trechos.json'), JSON.stringify(trechos));
const total = Object.values(duracoes).reduce((t, d) => t + d, 0);
const palavras = falas.join(' ').split(/\s+/).length;
console.log(`${falas.length} falas, ${total.toFixed(1)}s de voz, ${(palavras / total * 60).toFixed(0)} palavras por minuto`);
