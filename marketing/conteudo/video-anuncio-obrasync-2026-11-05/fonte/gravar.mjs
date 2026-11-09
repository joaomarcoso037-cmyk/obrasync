// Grava o anúncio no app local, com a internet bloqueada no navegador.
//   node gravar.mjs ensaio   mesma temporização, com uma foto ao fim de cada frase
//   node gravar.mjs gravar   captura os quadros
// A duração de cada frase vem de guia/tempos.json: assim a voz final entra sem regravar.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRASES } from './cenas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const TRABALHO = process.env.TRABALHO;
const gravando = process.argv[2] === 'gravar';
const { chromium } = createRequire(join(TRABALHO, 'package.json'))('playwright-core');
const APP = 'http://localhost:4310/';
const PALCO = 'http://localhost:4312/';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const FOLGA = 120;

const pastaFotos = join(TRABALHO, 'anuncio-ensaio');
const pastaQuadros = join(TRABALHO, 'anuncio-quadros');
rmSync(gravando ? pastaQuadros : pastaFotos, { recursive: true, force: true });
mkdirSync(gravando ? pastaQuadros : pastaFotos, { recursive: true });
const tempos = JSON.parse(readFileSync(join(TRABALHO, 'guia', 'tempos.json'), 'utf8'));

const servidor = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(readFileSync(join(AQUI, 'palco.html')));
}).listen(4312);

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const contexto = await navegador.newContext({ viewport: { width: 1080, height: 1920 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', colorScheme: 'light' });
await contexto.route('**/*', (r) => (new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort()));
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) erros.push(m.text()); });
page.on('dialog', async (d) => { erros.push(`diálogo inesperado: ${d.message()}`); await d.dismiss(); });

await page.goto(PALCO);
await page.evaluate(() => document.fonts.ready);
const F = page.frameLocator('#app');
const T = (nome, ...args) => page.evaluate(([n, x]) => window.T[n](...x), [nome, args]);

// Preparação fora da gravação: o cartão cobre a tela enquanto o app recebe os dados de exemplo.
await page.evaluate((u) => new Promise((ok) => {
  document.querySelector('#aparelho').classList.remove('fora'); // fora da tela, o clique rolaria o palco
  const f = document.querySelector('#app');
  f.addEventListener('load', ok, { once: true });
  f.src = u;
}), APP);
// O cartão cobre a tela nesta etapa, então o clique é disparado direto no botão, dentro do app.
const empresa = F.getByRole('heading', { name: 'Construtora Exemplo' });
for (let i = 0; i < 20 && !(await empresa.isVisible()); i += 1) {
  await F.getByRole('button', { name: 'Ver com dados de exemplo' }).evaluate((el) => el.click(), undefined, { timeout: 20000 });
  await espera(500);
}
await empresa.waitFor({ timeout: 3000 });
await page.evaluate(() => {
  const ap = document.querySelector('#aparelho');
  ap.style.transition = 'none';
  ap.classList.add('fora');
  void ap.offsetWidth;
  ap.style.transition = '';
  scrollTo(0, 0);
});
await espera(400);

const eventos = { toques: [], cortes: [], marcas: {} };
const agora = () => Date.now() / 1000;
const centro = (b) => [b.x + b.width / 2, b.y + b.height / 2];

async function trazer(alvo) {
  await alvo.waitFor({ state: 'visible', timeout: 8000 });
  const rolou = await alvo.evaluate((el) => {
    if (el.closest('.barra')) return false;
    const r = el.getBoundingClientRect();
    if (r.top >= 64 && r.bottom <= innerHeight - (el.closest('dialog') ? 12 : 84)) return false;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  });
  if (rolou) await espera(380);
}

const a = {
  espera,
  gancho: (h) => T('gancho', h),
  pergunta: (h) => T('pergunta', h),
  logo: () => T('logo'),
  chamada: () => T('chamada'),
  async fechamento(h, s, ms) {
    await T('fecha', h);
    await espera(ms);
    await T('sub', s);
  },
  passo: (n, t) => T('passo', n, t),
  async mostrarAparelho() {
    await T('semCartao');
    await T('aparelho');
  },
  async corte(rota) {
    eventos.cortes.push(agora());
    await T('corte');
    await espera(205);
    await T('semZoom');
    await F.locator('body').evaluate((_, h) => { location.hash = h; scrollTo(0, 0); }, rota);
    await espera(250);
  },
  async tocarSemClicar(alvo) {
    await trazer(alvo);
    const c = centro(await alvo.boundingBox());
    await T('dedo', ...c);
    await espera(250);
    eventos.toques.push(agora());
    await T('toque', ...c);
    await espera(120);
  },
  async toque(alvo) {
    await a.tocarSemClicar(alvo);
    await alvo.click({ timeout: 8000 });
    await page.mouse.move(1, 1);
    await espera(160);
  },
  async digitar(alvo, texto) {
    await a.toque(alvo);
    await alvo.press('Control+A');
    await alvo.pressSequentially(texto, { delay: 14 });
    await espera(90);
  },
  async arrastar(alvo, passos) {
    await trazer(alvo);
    const b = await alvo.boundingBox();
    const x = b.x + 22;
    const y = b.y + b.height / 2;
    await T('dedo', x, y);
    await espera(250);
    await alvo.focus();
    for (let i = 1; i <= passos; i += 1) {
      await alvo.press('ArrowRight');
      await T('dedo', x + (b.width - 44) * (i * 0.05), y);
      await espera(110);
    }
  },
  /** Move o contorno para outro elemento, sem mexer na câmera. */
  async anelEm(alvo, ms) {
    const b = await alvo.boundingBox();
    await T('anel', b.x - 10, b.y - 10, b.width + 20, b.height + 20);
    if (ms) await espera(ms);
  },
  /** Aproxima a câmera do elemento e contorna. Sem `ms`, fica até o fim da frase. */
  async destaca(alvo, escala, ms) {
    await trazer(alvo);
    const [cx, cy] = await alvo.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    await T('semAnel');
    await T('zoom', cx, cy, escala);
    await espera(440);
    const b = await alvo.boundingBox();
    await T('anel', b.x - 12, b.y - 12, b.width + 24, b.height + 24);
    if (ms) {
      await espera(ms);
      await T('semAnel');
    }
  },
};

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
  await espera(250);
}

const linha = [];
const atrasadas = [];
for (const [i, frase] of FRASES.entries()) {
  const inicio = agora();
  linha.push({ indice: i, t: inicio, vaga: tempos[i] });
  if (frase.marca) eventos.marcas[frase.marca] = inicio;
  if (frase.titulo) await T('titulo', frase.titulo);
  await T('legenda', frase.semLegenda ? '' : frase.texto);
  await frase.faz(a, F);
  const falta = tempos[i] - (agora() - inicio);
  if (falta < 0) atrasadas.push(`#${i} passou ${(-falta).toFixed(2)}s: ${frase.texto}`);
  if (falta > 0) await espera(falta * 1000);
  await espera(FOLGA);
  if (!gravando) await page.screenshot({ path: join(pastaFotos, `${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 72 });
  await T('semAnel');
  await T('semZoom');
}
await espera(2600);

if (cdp) {
  await cdp.send('Page.stopScreencast');
  writeFileSync(join(TRABALHO, 'anuncio-quadros.json'), JSON.stringify(quadros));
  writeFileSync(join(TRABALHO, 'anuncio-linha.json'), JSON.stringify({ linha, eventos }));
}
await navegador.close();
servidor.close();
console.log(`frases ${linha.length}  duração ${(agora() - linha[0].t).toFixed(1)}s  quadros ${quadros.length}`);
if (atrasadas.length) console.log(`Ação maior que a vaga:\n${atrasadas.join('\n')}`);
if (erros.length) console.log(`Erros do app:\n${erros.join('\n')}`);
