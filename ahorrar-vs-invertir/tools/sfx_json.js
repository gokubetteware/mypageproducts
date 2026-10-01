// Arma sfx.json: un efecto por cambio visual como máximo, nunca encima de una palabra clave.
// Tiempos tomados de timing.json (hoy ESTIMADO, sin audio real): se recalcula igual cuando exista la voz.
const fs = require('fs'), path = require('path');
const R = p => path.resolve(__dirname, '..', p);
const timing = JSON.parse(fs.readFileSync(R('timing.json')));
const cat = JSON.parse(fs.readFileSync(R('../assets/sfx/catalogo.json')));
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const W = timing.palabras;
const B = n => timing.bloques[n - 1];
function buscar(b, frase) {
  const ws = W.filter(p => p.bloque === b), q = frase.split(/\s+/).map(norm);
  for (let i = 0; i + q.length <= ws.length; i++) if (q.every((k, j) => ws[i + j].k === k)) return [ws[i], ws[i + q.length - 1]];
  throw new Error(`no está «${frase}» en el bloque ${b}`);
}
const T = (b, f) => buscar(b, f)[0].t0;
// Palabras clave: cifras y los tres términos (más «orden», la respuesta del video).
const CLAVE = new Set(('cero uno dos tres cuatro cinco seis siete ocho nueve diez cien ciento quinientas ochocientos seiscientos doscientos ' +
  'mil sesenta ochenta noventa treinta cuarenta cincuenta catorce tasa fondo emergencia plazo orden').split(' '));
const claves = W.filter(p => CLAVE.has(p.k));
const tocaClave = (a, b) => claves.find(k => a < k.t1 && b > k.t0);
const enPausa = (a, b) => !W.some(p => a < p.t1 && b > p.t0);

// [bloque, efecto, t del cambio visual, cambio visual, palabra clave cercana, modo]
// modo «antes»: el efecto termina justo antes de la palabra clave · «aqui»: empieza en el cambio visual (MICHI, bloques)
const C = [
  [4, 'whoosh_suave', B(4).t_in, 'Transición: entra la cabecera y la tabla del ejemplo', 'cincuenta mil', 'antes_bloque'],
  [5, 'whoosh_suave', B(5).t_in, 'Transición a la idea 1: entra Tigrillo con su tarjeta', 'deuda', 'antes_bloque'],
  [6, 'pop_suave', T(6, 'seis mil') - 0.5, 'MICHI en sorpresa', 'seis mil', 'antes_pop'],
  [6, 'tono_descendente', T(6, 'seis mil'), 'Resultado 6,000 y recibo −6,000 en rojo', 'seis mil', 'antes'],
  [7, 'tic_suave', T(7, 'tasa'), 'Entra la tarjeta PALABRA 1 DE 3 · Tasa', 'tasa', 'antes'],
  [8, 'campanita_ascendente', T(8, 'ochocientos pesos'), 'Resultado 800 y +800 en verde', 'ochocientos', 'antes'],
  [9, 'pop_suave', T(9, 'menos cinco') - 0.5, 'MICHI en sorpresa', 'menos cinco mil doscientos', 'antes_pop'],
  [9, 'tono_descendente', T(9, 'menos cinco'), 'Resultado −5,200 en rojo', 'menos cinco mil doscientos', 'antes'],
  [10, 'tick', T(10, 'va primero'), 'Se llena la casilla «1. La deuda cara»', 'primero', 'antes'],
  [11, 'whoosh_suave', B(11).t_in, 'Transición al re-enganche 1 (sin gatito)', 'cuarenta mil', 'antes_bloque'],
  [11, 'tick', T(11, 'cuarenta'), 'Resultado 40,000', 'cuarenta mil', 'antes'],
  [12, 'whoosh_suave', B(12).t_in, 'Transición a la idea 2: fondo agua y entra Canela', 'colchón', 'antes_bloque'],
  [13, 'tono_descendente', T(13, 'cuatro mil'), 'Resultado 4,800 y recibo −4,800 en rojo', 'cuatro mil ochocientos', 'antes'],
  [14, 'tic_suave', T(14, 'fondo'), 'Entra la tarjeta PALABRA 2 DE 3 · Fondo de emergencia', 'fondo', 'antes'],
  [15, 'tick', T(15, 'treinta mil'), 'Resultado 30,000 y el frasco se llena', 'treinta mil', 'antes'],
  [16, 'tick', T(16, 'primero el colchón'), 'Se llena la casilla «2. El colchón»', 'colchón', 'antes'],
  [17, 'tick', T(17, 'quedan diez'), 'Resultado 10,000', 'diez mil', 'antes'],
  [18, 'whoosh_suave', B(18).t_in, 'Transición a la idea 3: fondo arcilla y entra Bosco', 'tiempo', 'antes_bloque'],
  [19, 'tono_descendente', T(19, 'son mil'), 'Resultado 1,000 y −1,000 en rojo', 'mil', 'antes'],
  [19, 'tick', T(19, 'nueve mil'), 'Resultado 9,000', 'nueve mil', 'antes'],
  [20, 'pop_suave', T(20, 'catorce') - 0.5, 'MICHI en sorpresa', 'catorce mil seiscientos noventa y tres', 'antes_pop'],
  [20, 'campanita_ascendente', T(20, 'catorce'), 'Resultado 14,693 y el brote crece', 'catorce mil', 'antes'],
  [21, 'tic_suave', T(21, 'plazo'), 'Entra la tarjeta PALABRA 3 DE 3 · Plazo', 'plazo', 'antes'],
  [22, 'tick', T(22, 'puede invertirse'), 'Se llena la casilla «3. Lo que crece»', 'invertirse', 'antes'],
  [23, 'golpe_seco', T(23, 'Pero ojo'), 'Entra la caja ¡OJO!', 'ojo', 'antes'],
  [24, 'whoosh_suave', B(24).t_in, 'Transición al momento fuerte: pantalla partida', 'al revés', 'antes_bloque'],
  [25, 'tick', T(25, 'cuatro mil'), 'Resultado 4,000', 'cuatro mil', 'antes'],
  [25, 'pop_suave', T(25, 'menos dos') - 0.5, 'MICHI en sorpresa', 'menos dos mil', 'antes_pop'],
  [25, 'tono_descendente', T(25, 'menos dos'), 'Resultado −2,000 en rojo', 'menos dos mil', 'antes'],
  [26, 'campanita_ascendente', T(26, 'Ganas ochocientos'), 'Entra +800 en verde', 'ochocientos', 'antes'],
  [27, 'tick', B(27).t_in, 'Resultado 50,000 ÷ 10,000 = 5', 'cinco veces menos', 'antes_bloque'],
  [28, 'acorde_suave', B(28).t_in + 0.5, 'Pantalla petróleo (0.5 s de silencio y acorde suave)', 'primero', 'aqui'],
  [29, 'whoosh_suave', B(29).t_in, 'Transición a las 3 ideas (vuelve arcilla)', 'primero ahorras o primero inviertes', 'antes_bloque'],
  [30, 'cierre_suave', B(30).t_in, 'Tarjeta final (el QR no lleva sonido)', '¿quieres hacer esta cuenta?', 'aqui'],
];

// Prioridad: si dos efectos chocan, gana el más importante.
const PRIO = { tic_suave: 0, golpe_seco: 0, acorde_suave: 0, cierre_suave: 0, tono_descendente: 1, campanita_ascendente: 1, tick: 2, whoosh_suave: 3, pop_suave: 4 };
const orden = C.map((c, i) => ({ c, i })).sort((x, y) => PRIO[x.c[1]] - PRIO[y.c[1]] || x.i - y.i);
const ok = [], fuera = [], usados = [];
const libre = (a, b) => !usados.some(u => a < u[1] + 0.05 && b > u[0] - 0.05);
for (const { c: [bloque, efecto, tv, cambio, kw, modo] } of orden) {
  const d = cat[efecto].duracion_s, pruebas = [];
  // 1) en el cambio visual · 2) hasta 0.4 s antes · 3) hasta 1.5 s después (no para MICHI) · 4) hasta 1 s antes
  if (modo === 'aqui' || modo === 'antes_bloque') pruebas.push([tv, 'en']);
  for (let s = 0.03; s <= 0.4; s += 0.01) pruebas.push([tv - d - s, 'antes']);
  if (modo !== 'aqui' && modo !== 'antes_pop') for (let s = 0.03; s <= 1.5; s += 0.01) pruebas.push([tv + s, 'despues']);
  for (let s = 0.41; s <= 1.0; s += 0.01) pruebas.push([tv - d - s, 'antes']);
  let t = null, donde = null, motivoFuera = '';
  for (const [p, w] of pruebas) {
    const a = +p.toFixed(3), b = a + d;
    if (!libre(a, b)) { motivoFuera = 'se encimaría con un efecto más importante'; continue; }
    const k = tocaClave(a, b);
    if (k) { motivoFuera = `en ±1.5 s no hay hueco sin palabra clave (choca con «${k.w.replace(/[^\p{L}\p{N}]/gu, '')}»)`; continue; }
    t = a; donde = w; break;
  }
  if (t === null) { fuera.push({ bloque, efecto, cambio_visual: cambio, t_cambio_visual: +tv.toFixed(2), motivo: motivoFuera }); continue; }
  const b = t + d; usados.push([t, b]);
  const sig = claves.find(k => k.t0 >= b - 0.001);
  const colocacion = enPausa(t, b) ? 'pausa' : donde === 'despues' ? 'despues_de_palabra_clave' : 'antes_de_palabra_clave';
  const motivo = {
    whoosh_suave: 'Cambio de bloque o de idea; marca el paso sin tapar la voz.', tic_suave: 'Entra una tarjeta de palabra.',
    tick: 'Resultado de una cuenta.', campanita_ascendente: 'Cifra a favor (verde, +).', tono_descendente: 'Cifra en contra (rojo, −): suena seria, no de susto.',
    golpe_seco: 'Caja ¡OJO!.', acorde_suave: 'Pantalla petróleo, la única del video.', pop_suave: 'MICHI cambia a sorpresa antes de la cifra.',
    cierre_suave: 'Tarjeta final.',
  }[efecto];
  const desfase = +(t - tv).toFixed(2);
  ok.push({ efecto, t, d, bloque, cambio, colocacion, kw: donde === 'despues' ? kw : (sig ? sig.w.replace(/[^\p{L}\p{N}]/gu, '') : kw), motivo:
    motivo + (desfase < -0.05 ? ` Suena ${-desfase} s antes del cambio visual para no pisar una palabra clave.` : desfase > 0.05 ? ` Suena ${desfase} s después del cambio visual: antes no había hueco sin cifras.` : '') });
}
ok.sort((x, y) => x.t - y.t); fuera.sort((x, y) => x.t_cambio_visual - y.t_cambio_visual);
const sfx = {
  estado: 'ESTIMADO, sin audio real: tiempos de timing.json estimado. Recalcular con node tools/sfx_json.js cuando exista voz.mp3.',
  reglas: ['máximo 1 s por efecto', 'pico −16 dBFS (≥ 12 dB bajo la voz)', 'un efecto por cambio visual como máximo', 'nunca encima de una palabra clave', 'malas noticias serias, no de susto', 'el QR no lleva sonido'],
  efectos: ok.map((e, i) => ({
    id: `sfx_${String(i + 1).padStart(2, '0')}`, t: e.t, efecto: e.efecto, archivo: cat[e.efecto].archivo, duracion_s: e.d,
    bloque: e.bloque, cambio_visual: e.cambio, colocacion: e.colocacion, palabra_clave_cercana: e.kw,
    motivo: e.motivo + (e.adelanto > 0.05 ? ` Suena ${e.adelanto} s antes del cambio visual para no pisar la palabra clave.` : ''),
    ...(e.efecto === 'acorde_suave' ? { silencio_previo_s: 0.5 } : {}),
  })),
  descartados: fuera,
};
fs.writeFileSync(R('sfx.json'), JSON.stringify(sfx, null, 1));
const porMin = {};
for (const e of ok) { const m = Math.floor(e.t / 60); porMin[m] = (porMin[m] || 0) + 1; }
console.log('efectos:', ok.length, '· descartados:', fuera.length);
console.log('por minuto:', Object.entries(porMin).map(([m, n]) => `${m}:00 → ${n}`).join(' · '));
for (const e of sfx.efectos) console.log(e.id, e.t.toFixed(2), e.efecto, 'b' + e.bloque, e.colocacion, '·', e.palabra_clave_cercana);
for (const f of fuera) console.log('DESCARTADO b' + f.bloque, f.efecto, f.t_cambio_visual, '·', f.motivo);
