// Trilha original gerada por código, sem amostras de terceiros: não depende de licença.
// Antes da virada só há tensão (teclado e batida leve). Na virada entra a batida completa.
const SR = 44100;
const BPM = 112;
const B = 60 / BPM;
const COMPASSO = 4 * B;
const ACORDES = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]]; // Am F C G
const ARPEJO = [1, 2, 3, 2, 1, 3, 2, 3];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function ruido(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

const coef = (fc) => 1 - Math.exp((-2 * Math.PI * fc) / SR);
const mod = (a, n) => ((a % n) + n) % n;

/** Devolve [esquerda, direita] em Float32Array. Tempos em segundos. */
export function gerarTrilha({ duracao, virada, toques, cortes }) {
  const n = Math.ceil(duracao * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rnd = ruido(20261105);
  const fases = new Float64Array(8);
  const pl = [0, 0];
  let hpEstado = 0;
  let riserLp = 0;
  let faseKick = 0;
  let faseBaixo = 0;
  let fasePluck = 0;
  const atrasoN = Math.round(B * 0.75 * SR);
  const ecoL = new Float32Array(atrasoN);
  const ecoR = new Float32Array(atrasoN);

  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const u = t - virada; // tempo relativo à virada: a grade musical nasce nela
    const depois = u >= 0;
    const cA = Math.floor(u / COMPASSO);
    const acorde = ACORDES[mod(cA, 4)];
    const dtCompasso = mod(u, COMPASSO);
    const nBatida = Math.floor(u / B);
    const dtB = mod(u, B);
    const n8 = Math.floor(u / (B / 2));
    const dt8 = mod(u, B / 2);

    // Bombeio: o teclado abaixa a cada bumbo, como em música de anúncio.
    const bomba = depois ? 1 - 0.62 * Math.exp(-dtB / 0.11) : 1;

    // Teclado de fundo: dente de serra desafinada, abafada por filtro.
    const corte = depois ? 2100 : 420 + 1100 * Math.max(0, 1 + u / (COMPASSO * 4));
    const a = coef(corte);
    const env = Math.min(1, dtCompasso / 0.05) * Math.min(1, (COMPASSO - dtCompasso) / 0.08);
    let esq = 0;
    let dir = 0;
    for (let v = 0; v < 3; v += 1) {
      const f = hz(acorde[v + 1]);
      fases[v * 2] = (fases[v * 2] + (f * 1.0035) / SR) % 1;
      fases[v * 2 + 1] = (fases[v * 2 + 1] + (f * 0.9965) / SR) % 1;
      esq += 2 * fases[v * 2] - 1;
      dir += 2 * fases[v * 2 + 1] - 1;
    }
    pl[0] += a * (esq - pl[0]);
    pl[1] += a * (dir - pl[1]);
    let sl = pl[0] * env * bomba * (depois ? 0.095 : 0.11);
    let sr = pl[1] * env * bomba * (depois ? 0.095 : 0.11);

    // Notas curtas em arpejo, com eco.
    const fp = hz(acorde[ARPEJO[mod(n8, 8)]] + 12);
    fasePluck = (fasePluck + fp / SR) % 1;
    const tri = 4 * Math.abs(fasePluck - 0.5) - 1;
    const pluck = tri * Math.exp(-dt8 / 0.16) * (depois ? 0.12 : 0.1);
    const j = i % atrasoN;
    const eL = ecoL[j];
    const eR = ecoR[j];
    ecoL[j] = pluck * 0.6 + eR * 0.34;
    ecoR[j] = pluck * 0.25 + eL * 0.34;
    sl += pluck * 0.8 + eL * 0.55;
    sr += pluck * 0.8 + eR * 0.55;

    // Bumbo: firme depois da virada; antes, só uma pulsação a cada dois tempos.
    const temKick = depois || mod(nBatida, 2) === 0;
    if (dtB < 0.002) faseKick = 0;
    if (temKick && dtB < 0.26) {
      const f = 46 + 95 * Math.exp(-dtB / 0.032);
      faseKick = (faseKick + f / SR) % 1;
      const k = Math.sin(2 * Math.PI * faseKick) * Math.exp(-dtB / 0.09) * (depois ? 0.72 : 0.3);
      sl += k;
      sr += k;
    }

    // Ruído com o grave retirado, base da palma, do chimbal e do ataque.
    const bruto = rnd();
    hpEstado += coef(2600) * (bruto - hpEstado);
    const agudo = bruto - hpEstado;

    if (depois) {
      const f = hz(acorde[0]) * (mod(n8, 8) === 7 ? 1.5 : 1);
      faseBaixo = (faseBaixo + f / SR) % 1;
      const b = (Math.sin(2 * Math.PI * faseBaixo) + 0.3 * Math.sin(4 * Math.PI * faseBaixo)) * Math.exp(-dt8 / 0.17) * bomba * 0.25;
      sl += b;
      sr += b;
      if (mod(nBatida, 2) === 1) {
        const p = agudo * Math.exp(-dtB / 0.075) * 0.13;
        sl += p;
        sr += p;
      }
      if (mod(n8, 2) === 1) {
        const h = agudo * Math.exp(-dt8 / 0.022) * 0.065;
        sl += h;
        sr += h;
      }
      // Impacto no instante da virada.
      if (u < 3) {
        const boom = Math.sin(2 * Math.PI * 52 * u) * Math.exp(-u / 0.5) * 0.42;
        const prato = agudo * Math.exp(-u / 0.55) * 0.17;
        sl += boom + prato;
        sr += boom + prato;
      }
    } else if (u > -2 * COMPASSO) {
      // Subida de tensão nos dois compassos antes da virada.
      const p = 1 + u / (2 * COMPASSO);
      riserLp += coef(300 + 7000 * p * p) * (bruto - riserLp);
      const r = riserLp * p * p * 0.3;
      sl += r;
      sr += r;
    }

    L[i] = sl;
    R[i] = sr;
  }

  // Efeitos: clique de toque e passagem de cena.
  for (const t of toques) {
    const ini = Math.round(t * SR);
    for (let k = 0; k < SR * 0.06 && ini + k < n; k += 1) {
      const d = k / SR;
      const c = Math.sin(2 * Math.PI * 1500 * d) * Math.exp(-d / 0.011) * 0.13;
      L[ini + k] += c;
      R[ini + k] += c;
    }
  }
  const rnd2 = ruido(7);
  for (const t of cortes) {
    const ini = Math.round((t - 0.05) * SR);
    const dur = 0.5;
    let lp = 0;
    for (let k = 0; k < SR * dur && ini + k < n; k += 1) {
      const p = k / (SR * dur);
      lp += coef(500 + 5000 * Math.sin(Math.PI * p)) * (rnd2() - lp);
      const w = lp * Math.sin(Math.PI * p) ** 2 * 0.3;
      L[ini + k] += w * (1 - p);
      R[ini + k] += w * p;
    }
  }

  // Saída suave no fim e limitador para não estourar.
  const queda = Math.floor(SR * 1.8);
  let pico = 0;
  for (let i = 0; i < n; i += 1) {
    const g = i > n - queda ? (n - i) / queda : 1;
    L[i] = Math.tanh(L[i] * 1.15) * g;
    R[i] = Math.tanh(R[i] * 1.15) * g;
    pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.92 / pico;
  for (let i = 0; i < n; i += 1) {
    L[i] *= norm;
    R[i] *= norm;
  }
  return [L, R];
}

/** Grava estéreo em WAV PCM de 16 bits. */
export function wavEstereo(L, R) {
  const n = L.length;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(36 + n * 4, 4);
  b.write('WAVEfmt ', 8, 'latin1'); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36, 'latin1'); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i += 1) {
    b.writeInt16LE(Math.round(L[i] * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(R[i] * 32767), 46 + i * 4);
  }
  return b;
}
