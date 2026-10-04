// Graba un MP4 mudo desde un HTML del proyecto, cuadro por cuadro (render determinista).
// Uso: F=montaje-ppr.html OUT=montaje-ppr.mp4 SCALE=2 WORKERS=4 node render.mjs
//   SCALE=2 → 2160×3840 nativo (el navegador dibuja al doble; no se escala un video de 1080p). SCALE=1 → 1080×1920.
//   WORKERS = tramos que se graban en paralelo y luego se unen sin recodificar.
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { spawn, spawnSync } from 'child_process';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.F || 'animatic-ppr.html', OUT = path.join(DIR, process.env.OUT || 'animatic-ppr.mp4');
const SCALE = +(process.env.SCALE || 1), WORKERS = +(process.env.WORKERS || 1), FPS = 30;

const b = await chromium.launch();
async function page() {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: SCALE });
  await p.goto('file://' + path.join(DIR, FILE) + '?capture=1');
  if (!(await p.evaluate(() => window.fontsOK))) { console.error('Tipografía no cargada: exportación detenida'); process.exit(1); }
  return p;
}
const probe = await page();
const DUR = await probe.evaluate(() => window.ANIMATIC_DUR);
await probe.close();
const N = Math.round(FPS * DUR), per = Math.ceil(N / WORKERS);

async function segment(w) {
  const a = w * per, z = Math.min(N, a + per), file = `${OUT}.part${w}.mp4`, p = await page();
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = a; i < z; i++) {
    await p.evaluate(t => window.renderAt(t), i / FPS);
    const buf = await p.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 150 === 0) console.log(`tramo ${w}: cuadro ${i}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await p.close();
  return file;
}
const parts = await Promise.all(Array.from({ length: WORKERS }, (_, w) => segment(w)));
await b.close();
const list = `${OUT}.txt`;
fs.writeFileSync(list, parts.map(f => `file '${f}'`).join('\n'));
spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
for (const f of [...parts, list]) fs.unlinkSync(f);
console.log('Listo:', OUT);
