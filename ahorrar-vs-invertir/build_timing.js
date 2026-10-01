// Genera timing.json ESTIMADO (sin audio real) a partir de la columna «Tiempo» del guion
// y de los tiempos de subtitulos_prueba.json. Las palabras se reparten dentro de cada grupo
// en proporción a su largo (equivale a ~150 palabras por minuto con pausas).
const fs = require('fs');
const path = require('path');
const guion = fs.readFileSync(path.join(__dirname, 'fuentes/guion-ahorrar-vs-invertir.md'), 'utf8');
const subs = JSON.parse(fs.readFileSync(path.join(__dirname, 'fuentes/subtitulos_prueba.json'), 'utf8'));

const mmss = s => { const [m, x] = s.split(':').map(Number); return m * 60 + x; };
const bloques = [];
for (const line of guion.split('\n')) {
  const m = line.match(/^\| \*\*(\d+) · (\d+:\d\d)–(\d+:\d\d)\*\*\s*([^|]*?)\s*\| (.*?) \| (.*) \|$/);
  if (!m) continue;
  bloques.push({ n: +m[1], etiqueta: m[4].trim() || null, t_in: mmss(m[2]), t_out: mmss(m[3]), voz: m[5].trim() });
}
if (bloques.length !== 30) throw new Error('Se esperaban 30 bloques, hay ' + bloques.length);

// El último grupo de subtítulos sale en 358.2 s; el bloque 30 se alarga a ese punto (ver problemas).
const ultimo = subs.grupos[subs.grupos.length - 1];
if (ultimo.t_salida > bloques[29].t_out) bloques[29].t_out = ultimo.t_salida;

const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const palabras = [];
for (const g of subs.grupos) {
  const ws = g.lineas.join(' ').split(/\s+/).filter(Boolean);
  const pesos = ws.map(w => w.length + 1), total = pesos.reduce((a, b) => a + b, 0);
  let t = g.t_entrada;
  ws.forEach((w, i) => {
    const d = (g.t_salida - g.t_entrada) * pesos[i] / total;
    palabras.push({ w, k: norm(w), bloque: g.bloque, grupo: g.n, t0: +t.toFixed(3), t1: +(t + d).toFixed(3) });
    t += d;
  });
}

const out = {
  estado: 'ESTIMADO, sin audio real',
  nota: 'Tiempos de bloque tomados de la columna «Tiempo» del guion; tiempos de palabra repartidos dentro de cada grupo de subtitulos_prueba.json (~150 palabras por minuto con pausas). Se reemplaza al transcribir la voz real.',
  fps: 30,
  duracion: bloques[29].t_out,
  bloques: bloques.map(({ voz, ...b }) => ({ ...b, palabras: palabras.filter(p => p.bloque === b.n).length })),
  palabras,
};
fs.writeFileSync(path.join(__dirname, 'timing.json'), JSON.stringify(out, null, 1));
console.log('timing.json:', bloques.length, 'bloques,', palabras.length, 'palabras, duración', out.duracion, 's');
