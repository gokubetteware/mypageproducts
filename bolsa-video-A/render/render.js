// Render determinista: Playwright fija window.seek(t) cuadro por cuadro y ffmpeg codifica.
// Los tramos de ZOOM MICHI se capturan con deviceScaleFactor 2 (3840×2160) y se reducen
// a 1920×1080 con lanczos. Uso:
//   node render/render.js [--from s] [--to s] [--out archivo.mp4] [--workers n] [--stills t1,t2,...]
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1]]);
  return a;
}, []));
const FPS = 30;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function openPage(browser, port, dsf) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dsf });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/src/index.html`);
  await page.evaluate(() => window.appReady);
  if (errors.length) throw new Error('errores en la página: ' + errors.join(' | '));
  return page;
}

function encoder(out, dsf) {
  const vf = dsf === 2 ? ['-vf', 'scale=1920:1080:flags=lanczos'] : [];
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...vf, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium',
    '-r', String(FPS), '-an', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  return { ff, done };
}

async function renderSegment(browser, port, seg, out) {
  const page = await openPage(browser, port, seg.dsf);
  const { ff, done } = encoder(out, seg.dsf);
  for (let f = seg.f0; f < seg.f1; f++) {
    await page.evaluate(t => window.seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  await page.close();
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await pw.chromium.launch();
  try {
    const probe = await openPage(browser, port, 1);
    const { DUR, ZOOMS } = await probe.evaluate(() => ({ DUR: window.DUR, ZOOMS: window.ZOOMS }));

    if (args.stills) {
      // Cuadros sueltos para revisión: normales a 1080p y, si caen en zoom, también a 4K.
      const dir = args.dir || path.join(ROOT, 'render/cuadros');
      fs.mkdirSync(dir, { recursive: true });
      const p4k = await openPage(browser, port, 2);
      for (const s of args.stills.split(',')) {
        const t = parseFloat(s);
        const inZoom = ZOOMS.some(([a, b]) => t >= a && t < b);
        const pg = inZoom ? p4k : probe;
        await pg.evaluate(x => window.seek(x), t);
        const name = `t${t.toFixed(2).padStart(6, '0')}${inZoom ? '_4k' : ''}.png`;
        await pg.screenshot({ path: path.join(dir, name) });
        console.log(name);
      }
      return;
    }

    const from = Math.round(parseFloat(args.from || 0) * FPS);
    const to = Math.round(Math.min(parseFloat(args.to || DUR), DUR) * FPS);
    const out = path.resolve(args.out || path.join(ROOT, 'render/bolsa_A_silencioso.mp4'));
    const workers = parseInt(args.workers || 3, 10);
    await probe.close();

    // Cortes: tramos de zoom a DSF 2; el resto se reparte en trozos para los workers.
    const cuts = [];
    let f = from;
    const zf = ZOOMS.map(([a, b]) => [Math.round(a * FPS), Math.round(b * FPS)]).filter(([a, b]) => b > from && a < to);
    for (const [a, b] of zf) {
      if (a > f) cuts.push({ f0: f, f1: Math.min(a, to), dsf: 1 });
      cuts.push({ f0: Math.max(a, from), f1: Math.min(b, to), dsf: 2 });
      f = Math.min(b, to);
    }
    if (f < to) cuts.push({ f0: f, f1: to, dsf: 1 });
    const CHUNK = 600;
    const segs = cuts.flatMap(c => {
      if (c.dsf === 2) return [c];
      const r = [];
      for (let s = c.f0; s < c.f1; s += CHUNK) r.push({ ...c, f0: s, f1: Math.min(s + CHUNK, c.f1) });
      return r;
    });

    const tmp = fs.mkdtempSync(path.join(ROOT, 'render/.seg-'));
    segs.forEach((s, i) => { s.out = path.join(tmp, `seg${String(i).padStart(4, '0')}.mp4`); });
    const queue = segs.slice();
    const t0 = process.hrtime.bigint();
    await Promise.all(Array.from({ length: workers }, async () => {
      while (queue.length) {
        const s = queue.shift();
        await renderSegment(browser, port, s, s.out);
        process.stdout.write(`  segmento ${path.basename(s.out)} [${s.f0}-${s.f1}) dsf=${s.dsf}\n`);
      }
    }));
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, segs.map(s => `file '${s.out}'`).join('\n'));
    execSync(`ffmpeg -loglevel error -y -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${out}"`);
    fs.rmSync(tmp, { recursive: true, force: true });
    const secs = Number(process.hrtime.bigint() - t0) / 1e9;
    console.log(`listo: ${out} (${(to - from)} cuadros en ${secs.toFixed(0)} s)`);
  } finally {
    await browser.close();
    srv.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
