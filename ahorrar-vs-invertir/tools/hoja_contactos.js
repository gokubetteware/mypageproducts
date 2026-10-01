// Paso 1: un cuadro por bloque (1920×1080) y la hoja de contactos.
// Uso: node tools/hoja_contactos.js [carpeta-salida]
const fs = require('fs'), path = require('path');
const abrir = require('./navegador');
const SALIDA = path.resolve(__dirname, '..', process.argv[2] || 'entregas/paso1');
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

(async () => {
  fs.mkdirSync(path.join(SALIDA, 'cuadros'), { recursive: true });
  const { page, info, cerrar } = await abrir();
  const timing = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../timing.json'), 'utf8'));
  const fichas = [];
  for (const b of timing.bloques) {
    const t = +(Math.max(b.t_in, b.t_out - 0.3)).toFixed(3);
    const expr = await page.evaluate(t => window.seek(t), t);
    const cajas = await page.evaluate(() => window.cajas());
    const archivo = `bloque_${String(b.n).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(SALIDA, 'cuadros', archivo), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    fichas.push({ n: b.n, t, etiqueta: b.etiqueta, rango: `${mmss(b.t_in)}–${mmss(b.t_out)}`, michi: expr || '—', archivo, cajas });
  }
  // Hoja: 5 columnas × 6 filas, miniaturas de 576×324 con su rótulo.
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#E3DDD0;font:600 18px Archivo,sans-serif;color:#05070A}
    .h{padding:28px 32px 8px;font:400 44px 'Instrument Serif',serif}.s{padding:0 32px 20px;font:400 18px Archivo}
    .g{display:grid;grid-template-columns:repeat(5,576px);gap:20px 16px;padding:0 32px 32px}
    img{width:576px;height:324px;display:block;outline:1px solid #8C8577}.r{padding-top:6px}.r b{font-weight:700}.r i{font-style:normal;color:#5E5A52}
  </style><div class="h">Hoja de contactos · «¿Primero ahorras o primero inviertes?»</div>
  <div class="s">Prueba SIN audio · 1 cuadro por bloque (0.3 s antes del final del bloque) · tiempos ESTIMADOS, sin audio real · sin subtítulos · ${new Date().toISOString().slice(0, 10)}</div>
  <div class="g">${fichas.map(f => `<div><img src="cuadros/${f.archivo}"><div class="r"><b>${f.n}</b> · ${f.rango}${f.etiqueta ? ' · ' + f.etiqueta : ''}<br><i>MICHI: ${f.michi}</i></div></div>`).join('')}</div>`;
  fs.writeFileSync(path.join(SALIDA, 'hoja.html'), html);
  const p2 = await page.context().browser().newPage();
  await p2.setViewportSize({ width: 5 * 576 + 4 * 16 + 64, height: 800 });
  await p2.goto('file://' + path.join(SALIDA, 'hoja.html'));
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: path.join(SALIDA, 'hoja_contactos.png'), fullPage: true });
  fs.writeFileSync(path.join(SALIDA, 'cuadros.json'), JSON.stringify({ subtitulos: info.subtitulos, fichas }, null, 1));
  fs.unlinkSync(path.join(SALIDA, 'hoja.html'));
  await cerrar();
  console.log('Listo:', path.relative(process.cwd(), SALIDA), '· subtítulos =', info.subtitulos);
})().catch(e => { console.error(e); process.exit(1); });
