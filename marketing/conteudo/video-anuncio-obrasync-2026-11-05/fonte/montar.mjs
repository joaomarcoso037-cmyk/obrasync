// Junta imagem, trilha e, se houver, narração.
//   node montar.mjs <saida.mp4>                  só imagem e música
//   node montar.mjs <saida.mp4> <pasta-da-voz>   com narração: 0.wav, 1.wav, ... um por frase
// A música abaixa sozinha enquanto a voz fala. Fala maior que a vaga é acelerada até caber.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gerarTrilha, wavEstereo } from './musica.mjs';
import { lerWav } from './wav.mjs';

const TRABALHO = process.env.TRABALHO;
const [saida, pastaVoz] = process.argv.slice(2);
const ffmpeg = createRequire(join(TRABALHO, 'package.json'))('ffmpeg-static');
const ler = (n) => JSON.parse(readFileSync(join(TRABALHO, n), 'utf8'));
const roda = (args) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args], { stdio: 'inherit' });

const quadros = ler('anuncio-quadros.json');
const { linha, eventos } = ler('anuncio-linha.json');
const t0 = quadros[0].t;
// Tela parada não gera quadro: o fim vem da linha do tempo, não do último quadro.
const ultima = linha.at(-1);
const fim = ultima.t + ultima.vaga + 2.7;
const duracao = fim - t0;

const lista = ['ffconcat version 1.0'];
quadros.forEach((q, i) => {
  const dur = (i + 1 < quadros.length ? quadros[i + 1].t : fim) - q.t;
  lista.push(`file 'anuncio-quadros/${q.nome}'`, `duration ${dur.toFixed(5)}`);
});
lista.push(`file 'anuncio-quadros/${quadros.at(-1).nome}'`);
const concat = join(TRABALHO, 'anuncio.ffconcat');
writeFileSync(concat, lista.join('\n'));

const [L, R] = gerarTrilha({
  duracao,
  virada: eventos.marcas.virada - t0,
  toques: eventos.toques.map((t) => t - t0),
  cortes: eventos.cortes.map((t) => t - t0),
});
const trilha = join(TRABALHO, 'anuncio-trilha.wav');
writeFileSync(trilha, wavEstereo(L, R));

const video = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30'];
const audio = ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-shortest'];

if (!pastaVoz) {
  roda(['-safe', '0', '-f', 'concat', '-i', concat, '-i', trilha, '-vf', 'fps=30', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', ...video, ...audio, saida]);
} else {
  // Cada fala entra no instante da sua frase; se passar da vaga, acelera.
  const pasta = join(TRABALHO, 'voz-ajustada');
  mkdirSync(pasta, { recursive: true });
  const TAXA = 44100;
  const faixa = Buffer.alloc(Math.ceil(duracao * TAXA) * 2);
  for (const b of linha) {
    const dest = join(pasta, `${b.indice}.wav`);
    // Primeiro tira o silêncio das pontas; só depois mede se a fala cabe na vaga.
    const limpo = join(pasta, `${b.indice}-limpo.wav`);
    roda(['-i', join(pastaVoz, `${b.indice}.wav`), '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', String(TAXA), '-ac', '1', '-c:a', 'pcm_s16le', limpo]);
    const velocidade = Math.max(1, lerWav(readFileSync(limpo)).duracao / (b.vaga + 0.1));
    if (velocidade > 1.2) console.log(`Frase ${b.indice}: precisou acelerar ${velocidade.toFixed(2)}x`);
    roda(['-i', limpo, '-af', `atempo=${velocidade.toFixed(4)}`, '-c:a', 'pcm_s16le', dest]);
    const w = lerWav(readFileSync(dest));
    w.dados.copy(faixa, Math.round((b.t - t0) * TAXA) * 2);
  }
  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0, 'latin1'); cab.writeUInt32LE(36 + faixa.length, 4);
  cab.write('WAVEfmt ', 8, 'latin1'); cab.writeUInt32LE(16, 16);
  cab.writeUInt16LE(1, 20); cab.writeUInt16LE(1, 22);
  cab.writeUInt32LE(TAXA, 24); cab.writeUInt32LE(TAXA * 2, 28);
  cab.writeUInt16LE(2, 32); cab.writeUInt16LE(16, 34);
  cab.write('data', 36, 'latin1'); cab.writeUInt32LE(faixa.length, 40);
  const voz = join(TRABALHO, 'anuncio-voz.wav');
  writeFileSync(voz, Buffer.concat([cab, faixa]));
  roda(['-safe', '0', '-f', 'concat', '-i', concat, '-i', trilha, '-i', voz, '-filter_complex',
    '[2:a]aformat=channel_layouts=stereo,acompressor=threshold=0.12:ratio=3:attack=8:release=120,volume=2.2,asplit=2[v1][v2];'
    + '[1:a]volume=0.5[m];[m][v1]sidechaincompress=threshold=0.015:ratio=10:attack=12:release=280[baixa];'
    + '[baixa][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a];[0:v]fps=30[v]',
    '-map', '[v]', '-map', '[a]', ...video, ...audio, saida]);
}
console.log(`pronto: ${saida}  (${duracao.toFixed(1)}s)`);
