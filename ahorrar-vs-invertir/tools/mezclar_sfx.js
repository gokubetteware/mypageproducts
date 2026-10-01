// Mezcla música + efectos de sfx.json en el audio de un video (el video se copia sin recodificar).
// Uso: node tools/mezclar_sfx.js entrada.mp4 salida.mp4
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const R = p => path.resolve(__dirname, '..', p);
const sfx = JSON.parse(fs.readFileSync(R('sfx.json')));
const [ent, sal] = process.argv.slice(2);
const args = ['-loglevel', 'error', '-y', '-i', ent, '-i', R('audio/musica_tranquila.wav')];
const filtros = [];
let silencios = '';
sfx.efectos.forEach((e, i) => {
  args.push('-i', R('../' + e.archivo));
  const ms = Math.round(e.t * 1000);
  filtros.push(`[${i + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms}[s${i}]`);
  if (e.silencio_previo_s) silencios += `,volume=enable='between(t,${(e.t - e.silencio_previo_s).toFixed(3)},${e.t.toFixed(3)})':volume=0`;
});
filtros.unshift(`[1:a]aformat=sample_rates=48000:channel_layouts=stereo${silencios}[m]`);
filtros.push(`[m]${sfx.efectos.map((_, i) => `[s${i}]`).join('')}amix=inputs=${sfx.efectos.length + 1}:duration=first:normalize=0[a]`);
args.push('-filter_complex', filtros.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', sal);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log('listo', sal, '·', sfx.efectos.length, 'efectos');
