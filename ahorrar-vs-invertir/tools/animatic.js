// Paso 2: animatic mudo a 960×540, 30 fps, sin audio. Lee la bandera "subtitulos" de config.json.
// Uso: node tools/animatic.js salida.mp4 [t0] [t1]
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const abrir = require('./navegador');
(async () => {
  const salida = path.resolve(process.argv[2]);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const { page, info, cerrar } = await abrir({ escala: 0.5 });
  console.log('cargado · subtítulos =', info.subtitulos);
  const t0 = +(process.argv[3] || 0), t1 = +(process.argv[4] || info.duracion), fps = 30;
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((t1 - t0) * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.seek(t), t0 + i / fps);
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 1500 === 0) console.log(`${path.basename(salida)}: ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await cerrar();
  console.log('listo', salida);
})().catch(e => { console.error(e); process.exit(1); });
