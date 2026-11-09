/** Lê um WAV PCM de 16 bits e devolve as amostras por canal intercalado. */
export function lerWav(b) {
  let p = 12;
  let canais; let taxa; let bits; let dados;
  while (p + 8 <= b.length) {
    const id = b.toString('latin1', p, p + 4);
    const tam = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { canais = b.readUInt16LE(p + 10); taxa = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    if (id === 'data') { dados = b.subarray(p + 8, p + 8 + tam); }
    p += 8 + tam + (tam % 2);
  }
  if (bits !== 16) throw new Error(`WAV de ${bits} bits não previsto`);
  return { canais, taxa, dados, duracao: dados.length / (2 * canais * taxa) };
}
