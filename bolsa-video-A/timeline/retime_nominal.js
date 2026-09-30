// Recalcula los tiempos NOMINALES (t) de cada cue en docs/04_escenas.json a un ritmo dado.
// Solo sirve mientras no hay voz: con la voz real, manda la voz (Fase 4).
//   node timeline/retime_nominal.js 135
const fs = require('fs');
const path = require('path');

const WPM = parseFloat(process.argv[2] || 135);
const GAP_CUE = 0.3;     // respiro entre frases
const GAP_SCENE = 0.6;   // respiro entre escenas
const p = path.join(__dirname, '../docs/04_escenas.json');
const src = JSON.parse(fs.readFileSync(p, 'utf8'));

const cueDur = text => {
  let d = 0;
  const re = /\[pausa(?:\s+([\d.]+)\s*s)?\]|\([^)]*\)|\[[^\]]*\]|([^\s]+)/gi;
  let m;
  while ((m = re.exec(text))) {
    if (/^\[pausa/i.test(m[0])) d += parseFloat(m[1] || 1);
    else if (m[2] && m[2].replace(/[*«»¿?¡!.,:;—]/g, '')) d += 60 / WPM;
  }
  return d;
};

let t = 0;
src.escenas.forEach((s, i) => {
  if (i) t += GAP_SCENE;
  for (const c of s.cues) { c.t = +t.toFixed(1); t += cueDur(c.text) + GAP_CUE; }
});
const v = src.video;
const pf = src.escenas.flatMap(s => s.cues).find(c => c.id === v.pantalla_final.inicio_cue);
v.duracion_nominal_s = Math.ceil(Math.max(pf.t + v.pantalla_final.duracion_max_s, t));
v.ritmo_nominal_wpm = WPM;
fs.writeFileSync(p, JSON.stringify(src, null, 2) + '\n');
console.log(`${WPM} palabras/min → voz termina en ${t.toFixed(1)} s; video ${v.duracion_nominal_s} s`);
