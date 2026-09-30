// Subtítulos activables para YouTube (opción B): render/bolsa_A.srt
// Frases de 4 a 6 palabras, una línea, con el texto del GUION y los tiempos reales de la voz.
// Programación dinámica: se prefiere cortar en puntuación y nunca a través de una pausa larga.
const fs = require('fs');
const path = require('path');
const TL = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline_final.json'), 'utf8'));
const words = TL.cues.flatMap(c => c.words.map(w => ({ raw: w.raw, start: w.start, end: w.end })));
const n = words.length;
const punct = w => /[.?!:;»]$/.test(w.raw) ? 0 : /,$/.test(w.raw) ? 0.6 : 2.5;
const gapCost = (a, b) => { let c = 0; for (let k = a; k < b - 1; k++) if (words[k + 1].start - words[k].end > 0.7) c += 5; return c; };
const sizeCost = s => (s >= 4 && s <= 6 ? 0 : s === 3 || s === 7 ? 4 : Infinity);
const f = Array(n + 1).fill(Infinity), back = Array(n + 1).fill(-1);
f[0] = 0;
for (let i = 1; i <= n; i++) {
  for (let s = 3; s <= 7 && s <= i; s++) {
    const j = i - s, sc = sizeCost(s);
    if (!isFinite(sc) || !isFinite(f[j])) continue;
    const c = f[j] + sc + (i === n ? 0 : punct(words[i - 1])) + gapCost(j, i);
    if (c < f[i]) { f[i] = c; back[i] = j; }
  }
}
const groups = [];
for (let i = n; i > 0; i = back[i]) groups.unshift([back[i], i]);
const ts = x => { const ms = Math.round(x * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
let out = '', sizes = {};
groups.forEach(([a, b], k) => {
  const next = groups[k + 1];
  const st = words[a].start, en = Math.min(words[b - 1].end + 0.3, next ? words[next[0]].start - 0.04 : Infinity);
  const text = words.slice(a, b).map(w => w.raw).join(' ');
  sizes[b - a] = (sizes[b - a] || 0) + 1;
  out += `${k + 1}\n${ts(st)} --> ${ts(Math.max(en, st + 0.8))}\n${text}\n\n`;
});
const dst = path.join(__dirname, '../render/bolsa_A.srt');
fs.writeFileSync(dst, out);
console.log(`bolsa_A.srt: ${groups.length} subtítulos · palabras por línea ${JSON.stringify(sizes)}`);
