// Lee docs/04_escenas.json y escribe timeline/timeline_nominal.json con el tiempo
// absoluto (s y cuadro) de cada evento: t = t(cue[, palabra]) + off.
// Los tiempos de palabra son una ESTIMACIÓN a WPM constante más las pausas marcadas;
// en la Fase 4 se reemplazan por los tiempos reales de la voz (timeline_final.json).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const FPS = 30;
const WPM = 110;
const SEC_PER_WORD = 60 / WPM;

const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[«»¿?¡!.,:;*"“”()]/g, '').replace(/(\d),(\d)/g, '$1$2');

// Tokeniza el texto de un cue en palabras habladas y pausas.
function tokenize(text) {
  const out = [];
  const re = /\[pausa(?:\s+([\d.]+)\s*s)?\]|\([^)]*\)|\[[^\]]*\]|([^\s]+)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[0].startsWith('[pausa')) out.push({ pause: m[1] ? parseFloat(m[1]) : 1 });
    else if (m[2]) {
      const w = norm(m[2]);
      if (w) out.push({ word: w, raw: m[2].replace(/\*/g, '') });
    }
  }
  return out;
}

// Estima el inicio y el fin de cada palabra dentro del cue. Si a ese ritmo el cue
// no cabe antes del siguiente (tiempos nominales de docs/04), se comprime parejo.
function wordTimes(cue, windowEnd) {
  const toks = tokenize(cue.text);
  const natural = toks.reduce((s, k) => s + (k.pause || SEC_PER_WORD), 0);
  const k = windowEnd != null && cue.t + natural > windowEnd ? (windowEnd - cue.t) / natural : 1;
  let t = cue.t;
  const words = [];
  for (const tok of toks) {
    if (tok.pause) { t += tok.pause * k; continue; }
    words.push({ word: tok.word, raw: tok.raw, start: +t.toFixed(3), end: +(t + SEC_PER_WORD * k).toFixed(3) });
    t += SEC_PER_WORD * k;
  }
  return { words, end: t, compress: +k.toFixed(3) };
}

function build() {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/04_escenas.json'), 'utf8'));
  const cues = {};
  const flat = src.escenas.flatMap(s => s.cues.map(c => ({ c, s })));
  flat.forEach(({ c, s }, i) => {
    const next = flat[i + 1];
    const wt = wordTimes(c, next ? next.c.t - 0.3 : null);
    cues[c.id] = { id: c.id, scene: s.id, t: c.t, end: +wt.end.toFixed(3), compress: wt.compress, words: wt.words, text: c.text };
  });

  const events = [];
  let zooms = 0;
  for (const s of src.escenas) for (const e of s.eventos) {
    const cue = cues[e.cue];
    assert(cue, `${e.id}: cue ${e.cue} no existe`);
    let base = cue.t;
    if (e.word) {
      const target = norm(e.word);
      const hit = cue.words.find(w => w.word === target) || cue.words.find(w => w.word.startsWith(target));
      assert(hit, `${e.id}: la palabra «${e.word}» no está en ${e.cue}`);
      base = hit.start;
    }
    const t = Math.max(0, base + (e.off || 0));
    if (e.do === 'zoom_michi') {
      zooms++;
      assert.strictEqual(e.render, 'ZOOM MICHI — render 4K', `${e.id}: zoom sin marca 4K`);
    }
    events.push({ ...e, scene: s.id, t: +t.toFixed(3), frame: Math.round(t * FPS) });
  }
  assert(zooms <= 3, `hay ${zooms} zooms; el máximo es 3`);
  events.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));

  const scenes = src.escenas.map((s, i) => {
    const next = src.escenas[i + 1];
    const last = cues[s.cues[s.cues.length - 1].id];
    return { id: s.id, start: s.cues[0].t, end: next ? next.cues[0].t : Math.max(last.end + 1, src.video.duracion_max_s) };
  });
  const duration = Math.min(src.video.duracion_max_s, scenes[scenes.length - 1].end);
  assert(duration <= 480, 'la duración pasa de 8:00');

  const out = {
    generado: 'timeline/build_timeline.js · tiempos NOMINALES (estimación a ' + WPM + ' palabras/min)',
    fps: FPS, duracion_s: duration, frames: Math.round(duration * FPS),
    cabecera: src.video.cabecera,
    escenas: scenes, cues: Object.values(cues), eventos: events,
  };
  fs.writeFileSync(path.join(__dirname, 'timeline_nominal.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`timeline_nominal.json: ${events.length} eventos, ${zooms} zooms, ${duration} s`);
}

build();
