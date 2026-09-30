// Lee docs/04_escenas.json y escribe timeline/timeline_nominal.json con el tiempo
// absoluto (s y cuadro) de cada evento: t = t(cue[, palabra]) + off.
// Los tiempos de palabra son una ESTIMACIÓN a WPM constante más las pausas marcadas;
// en la Fase 4 se reemplazan por los tiempos reales de la voz (timeline_final.json).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const FPS = 30;
const WPM = 140;
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
  let afterPause = false;
  for (const tok of toks) {
    if (tok.pause) { t += tok.pause * k; afterPause = true; continue; }
    words.push({ word: tok.word, raw: tok.raw, start: +t.toFixed(3), end: +(t + SEC_PER_WORD * k).toFixed(3), afterPause });
    afterPause = false;
    t += SEC_PER_WORD * k;
  }
  return { words, end: t, compress: +k.toFixed(3) };
}

// Subtítulos (caja de subtítulo del manual): una línea, ≤ 10 palabras y ≤ 42 caracteres,
// cortes por sentido. 1) frases: se corta en fin de oración, en pausa marcada y en coma;
// 2) frases cortas seguidas por coma se juntan si caben; 3) las largas se parten parejo.
// Las palabras aparecen al decirse (start de cada palabra).
const SUB_MAX_CHARS = 42;
const SUB_MAX_WORDS = 10;
const SUB_TAIL = 0.6;
const joinLen = ws => ws.reduce((n, w) => n + w.raw.length, 0) + ws.length - 1;
function subtitleGroups(cueList) {
  const groups = [];
  for (const c of cueList) {
    const phrases = [];
    let cur = [];
    c.words.forEach((w, i) => {
      if (cur.length && w.afterPause) { phrases.push({ ws: cur, soft: false }); cur = []; }
      cur.push(w);
      const next = c.words[i + 1];
      if (/[.?!:;]»?$/.test(w.raw)) { phrases.push({ ws: cur, soft: false }); cur = []; }
      else if (/,$/.test(w.raw) && next && !next.afterPause) { phrases.push({ ws: cur, soft: true }); cur = []; }
    });
    if (cur.length) phrases.push({ ws: cur, soft: false });
    // juntar frases cortadas por coma si caben en una línea
    const merged = [];
    for (const ph of phrases) {
      const last = merged[merged.length - 1];
      if (last && last.soft && joinLen([...last.ws, ...ph.ws]) <= SUB_MAX_CHARS && last.ws.length + ph.ws.length <= SUB_MAX_WORDS) {
        last.ws.push(...ph.ws); last.soft = ph.soft;
      } else merged.push({ ws: [...ph.ws], soft: ph.soft });
    }
    for (const { ws } of merged) {
      const n = Math.max(Math.ceil(joinLen(ws) / SUB_MAX_CHARS), Math.ceil(ws.length / SUB_MAX_WORDS));
      const target = joinLen(ws) / n;
      let chunk = [];
      const flush = () => { if (chunk.length) groups.push({ cue: c.id, ws: chunk }); chunk = []; };
      for (const w of ws) {
        const len = joinLen([...chunk, w]);
        if (chunk.length && (len > SUB_MAX_CHARS || chunk.length >= SUB_MAX_WORDS ||
            (joinLen(chunk) >= target && len - target > target - joinLen(chunk)))) flush();
        chunk.push(w);
      }
      flush();
    }
  }
  return groups.map((g, i) => {
    const next = groups[i + 1];
    const lastEnd = g.ws[g.ws.length - 1].end;
    const end = next ? Math.min(lastEnd + SUB_TAIL, next.ws[0].start) : lastEnd + SUB_TAIL;
    return { cue: g.cue, text: g.ws.map(w => w.raw).join(' '), start: g.ws[0].start, end: +end.toFixed(3),
      words: g.ws.map(w => ({ raw: w.raw, start: w.start })) };
  });
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

  // El video termina cuando acaba la pantalla final (≤ 14 s desde su cue), o con la voz si dura más.
  const pf = src.video.pantalla_final;
  const lastCue = cues[src.escenas[src.escenas.length - 1].cues.slice(-1)[0].id];
  const videoEnd = Math.max(cues[pf.inicio_cue].t + pf.duracion_max_s, lastCue.end + 0.5);
  const scenes = src.escenas.map((s, i) => {
    const next = src.escenas[i + 1];
    return { id: s.id, start: s.cues[0].t, end: next ? next.cues[0].t : videoEnd };
  });
  const duration = +videoEnd.toFixed(3);
  assert(duration <= src.video.duracion_max_s && duration >= src.video.duracion_min_s, `la duración (${duration} s) está fuera de ${src.video.duracion_min_s}–${src.video.duracion_max_s} s`);

  const out = {
    generado: 'timeline/build_timeline.js · tiempos NOMINALES (estimación a ' + WPM + ' palabras/min)',
    fps: FPS, duracion_s: duration, frames: Math.round(duration * FPS),
    cabecera: src.video.cabecera,
    escenas: scenes, cues: Object.values(cues), eventos: events,
    subtitulos: subtitleGroups(Object.values(cues)),
  };
  fs.writeFileSync(path.join(__dirname, 'timeline_nominal.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`timeline_nominal.json: ${events.length} eventos, ${zooms} zooms, ${duration} s`);
}

build();
