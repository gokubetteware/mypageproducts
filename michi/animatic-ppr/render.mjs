const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
import { fileURLToPath } from 'url';
import path from 'path';
const DIR = path.dirname(fileURLToPath(import.meta.url));
import { spawn } from 'child_process';
const FPS = 30, DUR = 45, N = FPS * DUR;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + DIR + '/animatic-ppr.html?capture=1');
if (!(await p.evaluate(() => window.fontsOK))) { console.error('Tipografía no cargada: exportación detenida'); process.exit(1); }
const ff = spawn('ffmpeg', ['-loglevel','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-',
  '-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium','-movflags','+faststart','-r',String(FPS),path.join(DIR, 'animatic-ppr.mp4')], { stdio: ['pipe','inherit','inherit'] });
for (let i = 0; i < N; i++) {
  await p.evaluate(t => window.renderAt(t), i / FPS);
  const buf = await p.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log('frame', i);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await b.close();
