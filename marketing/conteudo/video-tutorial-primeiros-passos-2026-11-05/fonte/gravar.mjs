// Grava o tutorial no app rodando localmente, com a internet bloqueada no navegador.
//
//   node gravar.mjs ensaio    testa todos os passos e tira uma foto ao fim de cada frase
//   node gravar.mjs gravar    grava de verdade (precisa de voz/duracoes.json)
//
// Variáveis: TRABALHO = pasta dos arquivos temporários; PLAYWRIGHT = caminho do playwright-core.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CENAS } from './cenas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const TRABALHO = process.env.TRABALHO;
const modo = process.argv[2] ?? 'ensaio';
const gravando = modo === 'gravar';
const { chromium } = createRequire(join(TRABALHO, 'package.json'))('playwright-core');

const APP = 'http://localhost:4310/';
const LOGIN = 'http://localhost:4311/';
const PALCO = 'http://localhost:4312/';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const FOLGA_ENTRE_FRASES = 350;
const TOTAL = CENAS.filter((c) => c.titulo).length;

const pastaFotos = join(TRABALHO, 'ensaio');
const pastaQuadros = join(TRABALHO, 'quadros');
rmSync(gravando ? pastaQuadros : pastaFotos, { recursive: true, force: true });
mkdirSync(gravando ? pastaQuadros : pastaFotos, { recursive: true });
const duracoes = gravando ? JSON.parse(readFileSync(join(TRABALHO, 'voz', 'duracoes.json'), 'utf8')) : {};

// O palco precisa vir de um servidor real: o Chrome bloqueia iframe local em página simulada.
const servidor = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(readFileSync(join(AQUI, 'palco.html')));
}).listen(4312);

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const contexto = await navegador.newContext({
  viewport: { width: 1080, height: 1920 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  colorScheme: 'light',
});
// Nada sai da máquina: nem Supabase, nem site publicado.
await contexto.route('**/*', (rota) => (new URL(rota.request().url()).hostname === 'localhost' ? rota.continue() : rota.abort()));

const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) erros.push(m.text()); });
// Nenhum diálogo do navegador deveria aparecer neste roteiro.
page.on('dialog', async (d) => { erros.push(`diálogo inesperado: ${d.message()}`); await d.dismiss(); });

await page.goto(PALCO);
await page.evaluate(() => document.fonts.ready);
await page.evaluate((t) => window.T.etapa(0, t), TOTAL);
const F = page.frameLocator('#app');
const T = (nome, ...args) => page.evaluate(([n, a]) => window.T[n](...a), [nome, args]);

async function trocarTela(url) {
  await page.evaluate((u) => new Promise((pronto) => {
    const f = document.querySelector('#app');
    f.addEventListener('load', pronto, { once: true });
    f.src = u;
  }), url);
}

const centro = (b) => [b.x + b.width / 2, b.y + b.height / 2];

/** Rola só se o alvo estiver fora da área visível, como uma pessoa faria. */
async function trazer(alvo, bloco = 'center') {
  await alvo.waitFor({ state: 'visible', timeout: 8000 });
  const rolou = await alvo.evaluate((el, bloco) => {
    if (el.closest('.barra')) return false;
    const r = el.getBoundingClientRect();
    const dentro = r.top >= 64 && r.bottom <= innerHeight - (el.closest('dialog') ? 12 : 84);
    if (dentro) return false;
    el.style.scrollMarginBottom = '92px';
    el.scrollIntoView({ block: bloco, behavior: 'smooth' });
    return true;
  }, bloco);
  if (rolou) await espera(520);
}

const a = {
  espera,
  async ir(alvo, bloco) {
    await trazer(alvo, bloco);
    const c = centro(await alvo.boundingBox());
    await T('dedo', ...c);
    await espera(440);
    return c;
  },
  async tocarSemClicar(alvo, bloco) {
    const c = await a.ir(alvo, bloco);
    await T('toque', ...c);
    await espera(240);
  },
  async toque(alvo, bloco) {
    await a.tocarSemClicar(alvo, bloco);
    await alvo.click({ timeout: 8000 });
    await page.mouse.move(1, 1);
    await espera(320);
  },
  async digitar(alvo, texto) {
    await a.toque(alvo);
    await alvo.press('Control+A');
    await alvo.pressSequentially(texto, { delay: 42 });
    await espera(180);
  },
  async selecionar(alvo, rotulo) {
    await a.tocarSemClicar(alvo);
    await espera(220);
    await alvo.selectOption({ label: rotulo });
    await espera(300);
  },
  async dataEm(alvo, dias) {
    await a.tocarSemClicar(alvo);
    const valor = await page.evaluate((n) => {
      const d = new Date(Date.now() + n * 864e5);
      return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    }, dias);
    await alvo.fill(valor);
    await espera(300);
  },
  async horaEm(alvo, hora) {
    await a.tocarSemClicar(alvo);
    await alvo.fill(hora);
    await espera(300);
  },
  /** Barra de progresso: cada passo são 5%. */
  async arrastar(alvo, passos) {
    await trazer(alvo);
    const b = await alvo.boundingBox();
    const x = b.x + 22;
    const y = b.y + b.height / 2;
    await T('dedo', x, y);
    await espera(440);
    await T('toque', x, y);
    await alvo.focus();
    for (let i = 1; i <= passos; i += 1) {
      await alvo.press('ArrowRight');
      await T('dedo', x + (b.width - 44) * (i * 0.05), y);
      await espera(190);
    }
  },
  /** Contorna um elemento. Sem `ms`, fica até o fim da frase. */
  async aponta(alvo, ms) {
    await trazer(alvo);
    await espera(120);
    const b = await alvo.boundingBox();
    await T('anel', b.x - 14, b.y - 14, b.width + 28, b.height + 28);
    if (ms) {
      await espera(ms);
      await T('semAnel');
      await espera(160);
    }
  },
};

// Captura: cada quadro vem com a hora exata em que foi desenhado.
const quadros = [];
const cdp = gravando ? await contexto.newCDPSession(page) : null;
if (cdp) {
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const nome = `${String(quadros.length).padStart(6, '0')}.jpg`;
    writeFileSync(join(pastaQuadros, nome), Buffer.from(data, 'base64'));
    quadros.push({ nome, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, everyNthFrame: 1 });
  await espera(300);
}

const linhaDoTempo = [];
const atrasadas = [];
let indice = 0;
let passo = 0;

async function frase(beat) {
  const chave = String(indice);
  const inicio = Date.now() / 1000;
  linhaDoTempo.push({ indice, t: inicio, texto: beat.texto });
  await T('legenda', beat.texto);
  if (beat.faz) await beat.faz(a, F);
  const gasto = Date.now() / 1000 - inicio;
  const falta = (duracoes[chave] ?? 0) - gasto;
  if (gravando && falta < 0) atrasadas.push(`#${indice} passou ${(-falta).toFixed(1)}s da fala: ${beat.texto}`);
  if (falta > 0) await espera(falta * 1000);
  if (gravando) await espera(FOLGA_ENTRE_FRASES);
  await T('semAnel');
  if (!gravando) await page.screenshot({ path: join(pastaFotos, `${String(indice).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
  indice += 1;
}

const HTML_ABERTURA = '{marca}<h1>Como usar o ObraSync</h1><p>Do primeiro acesso ao primeiro orçamento</p>';
const HTML_FIM = '{marca}<h1>Agora é com você</h1><p>Dúvida ou sugestão? Responda a mensagem em que recebeu este vídeo.</p>';

for (const cena of CENAS) {
  if (cena.cartao) {
    await T('legenda', '');
    await T('cartao', cena.cartao === 'abertura' ? HTML_ABERTURA : HTML_FIM);
    if (gravando) await espera(900);
    if (cena.cartao === 'fim') await T('etapa', 0, TOTAL);
    for (const beat of cena.beats) await frase(beat);
    if (gravando) await espera(1200);
    continue;
  }

  passo += 1;
  await T('legenda', '');
  await T('cartao', `<small>PASSO ${passo} DE ${TOTAL}</small><h1>${cena.titulo}</h1>`);
  if (gravando) await espera(350);
  if (cena.tela) await trocarTela(cena.tela === 'login' ? LOGIN : APP);
  await T('etapa', passo, TOTAL, cena.titulo);
  if (gravando) await espera(1100);
  await T('cartao', null);
  if (gravando) await espera(420);
  for (const beat of cena.beats) await frase(beat);
}

if (cdp) {
  await espera(300);
  await cdp.send('Page.stopScreencast');
  writeFileSync(join(TRABALHO, 'quadros.json'), JSON.stringify(quadros));
  writeFileSync(join(TRABALHO, 'linha-do-tempo.json'), JSON.stringify(linhaDoTempo, null, 1));
}

await navegador.close();
servidor.close();
console.log(`frases: ${indice}  quadros: ${quadros.length}`);
if (gravando && quadros.length) {
  const dur = quadros.at(-1).t - quadros[0].t;
  console.log(`duração: ${dur.toFixed(1)}s  média ${(quadros.length / dur).toFixed(1)} quadros/s`);
}
if (atrasadas.length) console.log(`Frases em que a ação demorou mais que a fala:\n${atrasadas.join('\n')}`);
if (erros.length) console.log(`Erros do app:\n${erros.join('\n')}`);
