// Mede quanto tempo cada frase pede num ritmo de anúncio, usando a voz do Windows só como régua.
// Esse áudio NÃO entra no vídeo: serve para definir as vagas de tempo.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRASES, textoFalado } from './cenas.mjs';
import { lerWav } from './wav.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const pasta = join(process.env.TRABALHO, 'guia');
mkdirSync(pasta, { recursive: true });
const falas = FRASES.map(textoFalado);
const lista = join(pasta, 'falas.json');
writeFileSync(lista, JSON.stringify(falas), 'utf8');
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(AQUI, 'voz.ps1'), '-Lista', lista, '-Pasta', pasta, '-Voz', 'Daniel', '-Taxa', '1.3'], { stdio: 'inherit' });

const tempos = falas.map((_, i) => {
  const w = lerWav(readFileSync(join(pasta, `${i}.wav`)));
  const n = w.dados.length / 2;
  let ini = 0;
  while (ini < n && Math.abs(w.dados.readInt16LE(ini * 2)) < 300) ini += 1;
  let fim = n - 1;
  while (fim > 0 && Math.abs(w.dados.readInt16LE(fim * 2)) < 300) fim -= 1;
  return Math.round(((fim - ini) / w.taxa + 0.1) * 100) / 100;
});
writeFileSync(join(pasta, 'tempos.json'), JSON.stringify(tempos));
const total = tempos.reduce((t, d) => t + d, 0);
console.log(`vagas: ${tempos.join(' ')}`);
console.log(`total ${total.toFixed(1)}s, ${(falas.join(' ').split(/\s+/).length / total * 60).toFixed(0)} palavras por minuto`);
