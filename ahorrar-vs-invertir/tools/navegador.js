// Abre la escena en Chromium y espera a que cargue (fuentes incluidas).
const { chromium } = require('playwright');
const servir = require('./servidor');
module.exports = async function abrir({ escala = 1 } = {}) {
  const { srv, url } = await servir();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: escala });
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) errores.push(r.status() + ' ' + r.url()); });
  await page.goto(url + '/escena/index.html');
  const info = await page.evaluate(() => window.READY.then(x => x, () => ({ error: window.ERROR })));
  if (info.error || errores.length) throw new Error('La escena no cargó: ' + (info.error || errores.join('\n')));
  const cerrar = async () => { await browser.close(); srv.close(); };
  return { page, info, cerrar, errores };
};
