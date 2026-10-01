/* ============================================================================
   js/gl.js — WEBGL2 DEL PREVIEW v2 (propietario: gl)
   Seda del hero, titular nacarado, listón de scroll y un grainient por producto.
   Sin imports: lee window.SAPHI (core.js) y escucha el evento ag:active del acordeón.

   Reglas de esta versión (informe 01 §6, especificación 03 D.2 y G-03/04/08/21):
     · Un solo bucle de rAF (sched) para todos los shaders; cada efecto se gobierna con
       SAPHI.ambient(host, { start, stop }): pausa fuera de pantalla, con la pestaña oculta
       y con «reducir movimiento». Los campos ambientales se limitan a 30 fps y a UN dibujo pesado por
       cuadro (se alternan en vez de coincidir).
     · Campos suaves (seda, nacarado) calculados en los vértices de una malla; por píxel solo el grano
       y la máscara del titular. Mismo aspecto (diferencia media < 0.2 de 255), una fracción del costo.
     · Grainient: los contextos se crean al acercarse (IO a 600 px), uno por tarea, el del
       panel activo primero. En escritorio SOLO dibuja el panel activo (y el que se cierra,
       mientras dura su cierre); los demás quedan en su último cuadro, que el canvas conserva.
       En vista apilada o si el evento nunca llega, manda la visibilidad con tope de 2.
     · Movimiento reducido: cero contextos. Los cuadros estáticos salen de un puerto 2D de los
       mismos shaders (también sirve sin WebGL2 o con el contexto perdido).
     · Titular: la capa nacarada es un lienzo ENCIMA del texto, con la forma de las letras como
       máscara; ya no hay mix-blend-mode (ni darken ni lighten). Ver «Titular nacarado».
     · Listón: se detiene tras M.ambient.idle (1.5 s) sin scroll y se reanuda al desplazarse.
     · Robustez: webglcontextlost/restored, sin WebGL2 queda el fondo CSS, sin contextos de más.
   ============================================================================ */

const root = document.documentElement;
const SAPHI = window.SAPHI || null;
const TEST = window.__SAPHI_GL || {};                 /* ganchos de prueba (fps, nacre:false…); no hay UI para esto */
const qs = (s, c) => (c || document).querySelector(s);
const qsa = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));

/* Tiempos del sistema: los mismos números que css/motion.css (respaldo idéntico si falta core) */
const TK = {
  idle: SAPHI && SAPHI.M ? SAPHI.M.ambient.idle : 1500,          /* ms de quietud antes de detener el listón */
  base: SAPHI && SAPHI.M ? SAPHI.M.dur.base * 1000 : 180,
  layout: SAPHI && SAPHI.M ? SAPHI.M.dur.layout * 1000 : 440
};
/* Campos ambientales (seda, nacarado, grainient): 30 fps. Su movimiento es lento (≤1 rad/s); a 60 Hz
   medio cuadro de cada dos era GPU pura sin diferencia visible. El listón va a la cadencia nativa. */
const FIELD_FPS = TEST.fps != null ? TEST.fps : 30;
const FRAME_MS = FIELD_FPS > 0 ? 1000 / FIELD_FPS : 0;

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqCompact = window.matchMedia('(max-width: 900px)');
const mqRibbon = window.matchMedia('(min-width: 1181px)');           /* el listón es display:none por debajo */
const reducedNow = () => (SAPHI && SAPHI.mode ? SAPHI.mode.reduced : mqReduce.matches);
const HAS_GL2 = typeof WebGL2RenderingContext !== 'undefined';
const dprNow = () => window.devicePixelRatio || 1;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const idle = (fn, ms) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: ms || 500 }) : setTimeout(fn, 32));
const warn = (tag, e) => { if (window.console && console.warn) console.warn('[gl:' + tag + ']', e); };
const mqOn = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };

/* ── Bucle único ─────────────────────────────────────────────────────────────
   Cada tarea { draw(now, dt), interval, heavy } se agrega y quita desde start/stop de ambient().
   El rAF corre solo mientras haya tareas; con la pestaña oculta no dibuja nada.
   Reparto de cuadros: a lo más UNA tarea «heavy» (campo de pantalla/capa grande) por cuadro. Con dos campos a
   30 fps sobre una pantalla de 60 Hz, la seda y el nacarado caerían en el MISMO cuadro (un cuadro doble de GPU, el
   siguiente vacío); así se alternan (seda en los pares, nacarado en los impares) y cada cuadro cuesta lo mismo. */
const sched = (function () {
  const tasks = new Set(); let raf = 0;
  function glTick(now) {
    raf = 0;
    if (!document.hidden) {
      const due = [];
      tasks.forEach((task) => { if (!task.interval || !task.prev || now - task.prev >= task.interval - 1.5) due.push(task); });
      if (due.length > 1) due.sort((a, b) => a.prev - b.prev);                   /* primero el que lleva más sin dibujar */
      let heavy = 0;
      for (let k = 0; k < due.length; k++) {
        const task = due[k];
        if (task.heavy) { if (heavy) continue; heavy++; }
        const prev = task.prev;
        task.prev = now;
        try { task.draw(now, prev ? now - prev : 16.7); } catch (e) { tasks.delete(task); warn(task.tag || 'tarea', e); if (task.fail) task.fail(e); }
      }
    }
    if (tasks.size) raf = requestAnimationFrame(glTick);
  }
  return {
    add(task) { if (tasks.has(task)) return; task.prev = 0; tasks.add(task); if (!raf) raf = requestAnimationFrame(glTick); },
    remove(task) { tasks.delete(task); if (!tasks.size && raf) { cancelAnimationFrame(raf); raf = 0; } },
    get size() { return tasks.size; }
  };
})();

/* ambient() de core; sin core, una versión mínima con las mismas condiciones de marcha */
function ambient(host, loop) {
  if (SAPHI && SAPHI.ambient) return SAPHI.ambient(host, loop);
  let enabled = true, live = !host || !('IntersectionObserver' in window), on = false;
  const sync = () => {
    const go = enabled && live && !document.hidden && !reducedNow();
    if (go && !on) { on = true; loop.start(); } else if (!go && on) { on = false; loop.stop(); }
  };
  if (host && 'IntersectionObserver' in window) new IntersectionObserver((es) => { live = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: '120px' }).observe(host);
  document.addEventListener('visibilitychange', sync);
  sync();
  return { start() { enabled = true; sync(); }, stop() { enabled = false; sync(); }, get running() { return on; } };
}

/* ── Utilidades de WebGL ───────────────────────────────────────────────────── */
const VERT_TRI = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';

function getGL(canvas, attrs) { try { return canvas.getContext('webgl2', attrs); } catch (e) { return null; } }
function program(gl, vsSrc, fsSrc, tag) {
  function sh(type, src) {
    const o = gl.createShader(type);
    gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { warn(tag, 'shader: ' + gl.getShaderInfoLog(o)); return null; }
    return o;
  }
  const vs = sh(gl.VERTEX_SHADER, vsSrc), fs = sh(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prg = gl.createProgram();
  gl.attachShader(prg, vs); gl.attachShader(prg, fs); gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { warn(tag, 'enlace: ' + gl.getProgramInfoLog(prg)); return null; }
  gl.deleteShader(vs); gl.deleteShader(fs);
  return prg;
}
function triangle(gl, prg) {                                    /* un triángulo que cubre la pantalla */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prg, 'position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}
/* Malla cols×rows sobre la pantalla (aPos en 0..1, y hacia arriba). Los campos SUAVES (seda, nacarado) se evalúan
   en los vértices y se interpolan: la longitud de onda mínima de esos campos es de cientos de píxeles, así que una celda
   de ~8 px los reproduce sin diferencia visible y el fragment shader queda para lo que SÍ es por píxel (grano, máscara). */
function gridMesh(gl, prg, cols, rows) {
  const pos = [], idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) pos.push(i / cols, j / rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prg, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  return idx.length;
}
/* Aparición suave del lienzo sobre el tinte CSS (la clase la lee motion-gl.css) */
function reveal(canvas) {
  if (!canvas) return;
  requestAnimationFrame(() => { canvas.classList.add('gl-ready'); });
}

/* ── Campo de pantalla completa (seda y grainient) ───────────────────────────
   Un lienzo con un fragment shader sobre un triángulo (grainient) o sobre una malla cuyo vértice calcula el campo
   suave (seda). build() crea programa y buffers y vuelve a correr tras webglcontextrestored; size() ajusta el
   lienzo (resolución escalada) y redibuja un cuadro. */
function Field(host, def) {
  const f = { host: host, canvas: null, gl: null, ready: false, lost: false, t: 0, w: 0, h: 0, ro: null, onLost: null, onRestored: null };
  let uT = null, uR = null, count = 0;

  function build() {
    const gl = f.gl;
    const prg = program(gl, def.vert || VERT_TRI, def.frag, def.tag);
    if (!prg) return false;
    gl.useProgram(prg);
    if (def.grid) count = gridMesh(gl, prg, def.grid[0], def.grid[1]); else triangle(gl, prg);
    const U = (n) => gl.getUniformLocation(prg, n);
    uT = U(def.uTime); uR = U(def.uRes);
    def.setup(gl, U);
    if (f.w) { gl.viewport(0, 0, f.w, f.h); gl.uniform2f(uR, f.w, f.h); }
    return true;
  }
  function paint() {
    const gl = f.gl;
    gl.uniform1f(uT, f.t);
    if (def.grid) gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0); else gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  f.create = function () {
    if (f.canvas) return f.ready;
    const canvas = document.createElement('canvas');
    const gl = getGL(canvas, { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return false;
    f.canvas = canvas; f.gl = gl;
    canvas.addEventListener('webglcontextlost', (e) => {            /* preventDefault: el navegador podrá restaurarlo */
      e.preventDefault(); f.lost = true; f.ready = false; canvas.style.visibility = 'hidden';   /* un lienzo perdido queda negro: se oculta */
      if (f.onLost) f.onLost(f);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      f.lost = false; f.ready = build();
      if (f.ready) { canvas.style.visibility = ''; paint(); if (f.onRestored) f.onRestored(f); } else if (f.onLost) f.onLost(f);
    });
    if (!build()) { f.canvas = null; f.gl = null; return false; }
    if (def.first) host.insertBefore(canvas, host.firstChild); else host.appendChild(canvas);
    f.ready = true;
    f.size();
    if (def.fade) reveal(canvas);
    if ('ResizeObserver' in window) { f.ro = new ResizeObserver(() => f.size()); f.ro.observe(host); }
    return true;
  };
  f.size = function () {
    if (!f.ready) return;
    const sc = def.scale();
    const w = Math.max(1, Math.floor(host.clientWidth * sc)), h = Math.max(1, Math.floor(host.clientHeight * sc));
    if (f.canvas.width !== w || f.canvas.height !== h) {
      f.canvas.width = w; f.canvas.height = h; f.w = w; f.h = h;
      f.gl.viewport(0, 0, w, h);
      f.gl.uniform2f(uR, w, h);
    }
    paint();                                                    /* cambiar el tamaño borra el búfer: se repinta en el mismo cuadro */
  };
  f.draw = function (now, dt) {
    if (!f.ready || f.lost) return;
    def.advance(f, now, dt);
    paint();
  };
  f.destroy = function () {
    if (f.ro) f.ro.disconnect();
    f.ready = false;
    if (f.canvas && f.canvas.parentNode) f.canvas.parentNode.removeChild(f.canvas);
    const ext = f.gl && f.gl.getExtension && f.gl.getExtension('WEBGL_lose_context');
    if (ext) { try { ext.loseContext(); } catch (e) { /* ya perdido */ } }
    f.canvas = null; f.gl = null;
  };
  return f;
}

/* ══ Puerto 2D de los shaders (cuadros estáticos sin contexto WebGL) ════════════
   Misma matemática que el GLSL, evaluada en CPU sobre una rejilla pequeña (el campo es suave) y
   estirada por el navegador. El grano se agrega con un mosaico de ruido. Solo corre con movimiento
   reducido, sin WebGL2 o con el contexto perdido: nunca en el camino normal. */
function fract(x) { return x - Math.floor(x); }
function smooth(e0, e1, x) { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
function hexRGB(h) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
}
function hash2(px, py, out) {
  const sa = Math.sin(px * 2127.1 + py * 81.17) * 43758.5453, sb = Math.sin(px * 1269.5 + py * 283.37) * 43758.5453;
  out[0] = sa - Math.floor(sa); out[1] = sb - Math.floor(sb);
}
const _h = [0, 0];
function vnoise(px, py) {
  const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  hash2(ix, iy, _h); const n00 = (-1 + 2 * _h[0]) * fx + (-1 + 2 * _h[1]) * fy;
  hash2(ix + 1, iy, _h); const n10 = (-1 + 2 * _h[0]) * (fx - 1) + (-1 + 2 * _h[1]) * fy;
  hash2(ix, iy + 1, _h); const n01 = (-1 + 2 * _h[0]) * fx + (-1 + 2 * _h[1]) * (fy - 1);
  hash2(ix + 1, iy + 1, _h); const n11 = (-1 + 2 * _h[0]) * (fx - 1) + (-1 + 2 * _h[1]) * (fy - 1);
  const a = n00 + (n10 - n00) * ux, b = n01 + (n11 - n01) * ux;
  return 0.5 + 0.5 * (a + (b - a) * uy);
}
/* Un campo evaluado por píxel → lienzo pequeño fuera de pantalla */
function evalField(w, h, px) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); if (!ctx) return null;
  const img = ctx.createImageData(w, h), d = img.data, rgb = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    px(x, y, rgb);
    const o = (y * w + x) * 4;
    d[o] = clamp01(rgb[0]) * 255; d[o + 1] = clamp01(rgb[1]) * 255; d[o + 2] = clamp01(rgb[2]) * 255; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
/* Mosaico de ruido en gris medio (para mezclar con overlay/multiply): el grano de los shaders */
let _noiseTile = null;
function noiseTile() {
  if (_noiseTile) return _noiseTile;
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'), img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) { const v = 128 + (Math.random() - 0.5) * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return (_noiseTile = c);
}
/* Crea (una vez) el lienzo 2D estático dentro de un host y lo pinta con paint(ctx, w, h) */
function Still(host, k, paint) {
  const s = { host: host, canvas: null, k: k, redo: 0 };
  s.draw = function () {
    const W = Math.max(2, Math.round(host.clientWidth * k)), Hh = Math.max(2, Math.round(host.clientHeight * k));
    if (host.clientWidth < 2) return;
    if (!s.canvas) { s.canvas = document.createElement('canvas'); s.canvas.className = 'gl-still'; host.insertBefore(s.canvas, host.firstChild); }
    if (s.canvas.width !== W || s.canvas.height !== Hh) { s.canvas.width = W; s.canvas.height = Hh; }
    const ctx = s.canvas.getContext('2d'); if (!ctx) return;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    try { paint(ctx, W, Hh); } catch (e) { warn('cuadro', e); return; }
    reveal(s.canvas);
  };
  s.remove = function () { if (s.ro) s.ro.disconnect(); if (s.canvas && s.canvas.parentNode) s.canvas.parentNode.removeChild(s.canvas); s.canvas = null; };
  if ('ResizeObserver' in window) { s.ro = new ResizeObserver(() => { clearTimeout(s.redo); s.redo = setTimeout(s.draw, 120); }); s.ro.observe(host); }
  s.draw();
  return s;
}
function grainOverlay(ctx, w, h, mode, alpha) {                 /* grano: el mosaico de ruido mezclado sobre el cuadro */
  const pat = ctx.createPattern(noiseTile(), 'repeat'); if (!pat) return;
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = alpha; ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); ctx.restore();
}

/* ══ Seda del hero ═══════════════════════════════════════════════
   Puerto a WebGL2 puro del componente Silk (React Bits), con el shader original tal cual (patrón de
   seda por senos + grano por píxel). Va de telón DETRÁS del titular. Color: morado profundo #26095E
   con tope 0.369 por canal. Campo suave: el patrón se calcula en los vértices (malla 96×54) y el
   fragment shader solo pone el grano por píxel; lienzo a media resolución. Sin WebGL2 o con movimiento
   reducido: cuadro estático 2D, sin contexto. */
const SILK_COLOR = [0.149, 0.035, 0.369];
const SILK_VERT = '#version 300 es\n' +
'precision highp float;\n' +
'in vec2 aPos;uniform float uTime;uniform float uSpeed;uniform float uScale;out float vPattern;\n' +
'void main(){\n' +
'  vec2 tex = aPos * uScale * uScale;\n' +                         /* rotación 0 del original: identidad */
'  float tOffset = uSpeed * uTime;\n' +
'  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);\n' +
'  vPattern = 0.6 +\n' +
'             0.4 * sin(5.0 * (tex.x + tex.y +\n' +
'                              cos(3.0 * tex.x + 5.0 * tex.y) +\n' +
'                              0.02 * tOffset) +\n' +
'                       sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));\n' +
'  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);\n' +
'}';
const SILK_FRAG = '#version 300 es\n' +
'precision highp float;\n' +
'in float vPattern;uniform vec3 uColor;uniform float uNoiseIntensity;out vec4 fragColor;\n' +
'const float e = 2.71828182845904523536;\n' +
'float noise(vec2 texCoord){\n' +
'  float G = e;\n' +
'  vec2 r = (G * sin(G * texCoord));\n' +
'  return fract(r.x * r.y * (1.0 + texCoord.x));\n' +
'}\n' +
'void main(){\n' +
'  float rnd = noise(gl_FragCoord.xy);\n' +                        /* el grano SÍ es por píxel */
'  float grain = rnd / 15.0 * uNoiseIntensity;\n' +
'  vec3 result = uColor * vPattern - vec3(grain);\n' +
'  fragColor = vec4(clamp(result, 0.0, 1.0), 1.0);\n' +
'}';
const SILK_DEF = {
  tag: 'seda', vert: SILK_VERT, frag: SILK_FRAG, uTime: 'uTime', uRes: 'uResolution', fade: false, grid: [96, 54],
  scale: () => Math.min(dprNow(), 2) * (TEST.silk || 0.5),          /* media resolución; 0.35 en móvil ahorraba 14 % de GPU pero engrosaba el grano (informe 06-gl §3.4) */
  setup(gl, U) {
    gl.uniform3f(U('uColor'), SILK_COLOR[0], SILK_COLOR[1], SILK_COLOR[2]);
    gl.uniform1f(U('uSpeed'), 5.0);                              /* parámetros del original: speed 5, scale 1, rotation 0, noise 1.5 */
    gl.uniform1f(U('uScale'), 1.0);
    gl.uniform1f(U('uNoiseIntensity'), 1.5);
  },
  advance(f, now, dt) { f.t += Math.min(dt, 100) * 0.0001; }     /* el original avanza uTime a 0.1 × segundos reales */
};
function silkStill(host) {
  return Still(host, 0.5, (ctx, W, Hh) => {
    const w = Math.max(8, Math.round(W / 2)), h = Math.max(8, Math.round(Hh / 2));
    const F = evalField(w, h, (x, y, rgb) => {
      const ux = (x + 0.5) / w, uy = 1 - (y + 0.5) / h;
      const ty = uy + 0.03 * Math.sin(8 * ux);
      const p = 0.6 + 0.4 * Math.sin(5 * (ux + ty + Math.cos(3 * ux + 5 * ty)) + Math.sin(20 * (ux + ty)));
      rgb[0] = SILK_COLOR[0] * p; rgb[1] = SILK_COLOR[1] * p; rgb[2] = SILK_COLOR[2] * p;
    });
    if (!F) return;
    ctx.drawImage(F, 0, 0, W, Hh);
    grainOverlay(ctx, W, Hh, 'multiply', 0.35);
  });
}
(function silk() {
  const host = qs('.hero-silk');
  if (!host || TEST.silkOff === true) return;
  let still = null;
  const toStill = () => { if (!still) still = silkStill(host); };
  if (!HAS_GL2 || reducedNow()) { idle(toStill, 800); return; }
  const f = Field(host, SILK_DEF);
  if (!f.create()) { toStill(); return; }
  const task = { tag: 'seda', interval: FRAME_MS, heavy: true, draw: (now, dt) => f.draw(now, dt) };
  let amb = null;
  f.onLost = () => { sched.remove(task); toStill(); };
  f.onRestored = () => { if (still) { still.remove(); still = null; } if (amb && amb.running) sched.add(task); };
  amb = ambient(host, { start() { if (f.ready) sched.add(task); }, stop() { sched.remove(task); } });
})();

/* ══ Titular nacarado ═══════════════════════════════════════════
   Antes: un lienzo iridiscente DEBAJO del titular y dos mix-blend-mode (darken sobre el h1 con caja
   negra; lighten sobre la seda). Costaba +33 % de fps de reposo en el hero (informe 01, H2).
   Ahora: el lienzo va ENCIMA del texto y solo pinta dentro de las letras:
     1. La máscara es un lienzo 2D donde se dibuja cada carácter del h1 con su fuente, su peso y su
        color (la rampa de «Siempre.») en la posición que da el navegador (Range por carácter). El h1
        sigue en el DOM, seleccionable y legible para lectores de pantalla; solo su relleno pasa a
        transparente cuando la capa está encendida (html.gl-nacre-on).
     2. El campo nacarado (el mismo del shader original) se evalúa en los VÉRTICES de una malla de
        96×54 y se interpola: es un campo suave, así que cuesta ~30× menos que evaluarlo por píxel y
        el fragment shader solo lee la máscara a resolución completa (bordes nítidos sin escalar).
     3. Salida = min(color de la letra, nacarado) — exactamente el darken anterior — premultiplicada,
        con composición normal: ningún mix-blend-mode.
   Durante el intro la capa espera (el texto se ve con el color medio del campo, --gl-nacre-mean) y
   entra con un fundido al terminar. Con el peso por letra del cursor (is-weighing) la máscara sigue
   al DOM. Reducido o sin WebGL2: la misma máscara con el campo evaluado una vez en CPU. */
const NACRE_VERT = '#version 300 es\n' +
'precision highp float;\n' +
'in vec2 aPos;uniform float uTime;uniform vec2 uSize;out vec2 vUv;out vec3 vNacre;\n' +
'void main(){\n' +
'  vUv=aPos;\n' +
'  float mr=min(uSize.x,uSize.y);\n' +
'  vec2 uv=(aPos*2.0-1.0)*uSize/mr;\n' +
'  float d=-uTime*0.5;float a=0.0;\n' +
'  for(float i=0.0;i<8.0;++i){a+=cos(i-d-a*uv.x);d+=sin(uv.y*i+a);}\n' +
'  d+=uTime*0.5;\n' +
'  vec3 col=vec3(cos(uv*vec2(d,a))*0.6+0.4,cos(a+d)*0.5+0.5);\n' +
'  col=cos(col*cos(vec3(d,a,2.5))*0.5+0.5);\n' +
'  vec3 MOR_OSC=vec3(0.180,0.043,0.541);vec3 MORADO=vec3(0.318,0.106,0.859);vec3 LILA=vec3(0.545,0.427,0.910);vec3 BLANCO=vec3(1.0,0.98,1.0);\n' +
'  vec3 c=mix(MOR_OSC,MORADO,clamp(col.r,0.0,1.0));\n' +
'  c=mix(c,LILA,clamp(col.g,0.0,1.0));\n' +
'  c=mix(c,BLANCO,pow(clamp(col.b,0.0,1.0),2.2)*0.62);\n' +
'  vNacre=0.40+clamp(c,0.0,1.0)*0.52;\n' +   /* piso de luminosidad 0.40: ninguna letra cae bajo el contraste legible */
'  gl_Position=vec4(aPos*2.0-1.0,0.0,1.0);\n' +
'}';
const NACRE_FRAG = '#version 300 es\n' +
'precision highp float;\n' +
'in vec2 vUv;in vec3 vNacre;uniform sampler2D uMask;out vec4 fragColor;\n' +
'void main(){\n' +
'  vec4 m=texture(uMask,vec2(vUv.x,1.0-vUv.y));\n' +
'  if(m.a<=0.002){fragColor=vec4(0.0);return;}\n' +
'  vec3 ink=m.rgb/m.a;\n' +
'  fragColor=vec4(min(ink,vNacre)*m.a,m.a);\n' +
'}';
/* El mismo campo en CPU (cuadro estático) */
function nacreAt(ux, uy, T, out) {
  let d = -T * 0.5, a = 0;
  for (let i = 0; i < 8; i++) { a += Math.cos(i - d - a * ux); d += Math.sin(uy * i + a); }
  d += T * 0.5;
  let r = Math.cos(ux * d) * 0.6 + 0.4, g = Math.cos(uy * a) * 0.6 + 0.4, b = Math.cos(a + d) * 0.5 + 0.5;
  r = Math.cos(r * Math.cos(d) * 0.5 + 0.5); g = Math.cos(g * Math.cos(a) * 0.5 + 0.5); b = Math.cos(b * Math.cos(2.5) * 0.5 + 0.5);
  r = clamp01(r); g = clamp01(g); b = clamp01(b);
  const k = Math.pow(b, 2.2) * 0.62;
  let cr = 0.180 + (0.318 - 0.180) * r, cg = 0.043 + (0.106 - 0.043) * r, cb = 0.541 + (0.859 - 0.541) * r;
  cr += (0.545 - cr) * g; cg += (0.427 - cg) * g; cb += (0.910 - cb) * g;
  cr += (1.0 - cr) * k; cg += (0.98 - cg) * k; cb += (1.0 - cb) * k;
  out[0] = 0.40 + clamp01(cr) * 0.52; out[1] = 0.40 + clamp01(cg) * 0.52; out[2] = 0.40 + clamp01(cb) * 0.52;
}

(function heroNacre() {
  const title = qs('.hero-title'), h1 = document.getElementById('heroDisplay'), host = qs('.hero-irid');
  if (!title || !h1 || !host || TEST.nacre === false) return;

  const GRID_X = 96, GRID_Y = 54;
  const mask = document.createElement('canvas'), mctx = mask.getContext('2d');
  if (!mctx) return;
  const st = { kind: null, canvas: null, gl: null, ready: false, on: false, lost: false, started: false,
               box: null, sx: 1, sy: 1, cssW: 0, cssH: 0, layoutDirty: true, maskDirty: true, dynamic: false,
               chars: null, t: 0, amb: null, ro: null, mo: null, fix: 0, pending: 0 };
  let prg = null, uTime = null, uSize = null, tex = null, idxCount = 0;
  const task = { tag: 'nacarado', interval: FRAME_MS, heavy: true, draw: (now, dt) => paintGL(now, dt), fail: () => turnOff() };

  /* El color medio del campo hasta que la capa entre (CSS: html.gl-nacre #heroDisplay) */
  root.classList.add('gl-nacre');

  /* ── Texto → máscara ── */
  function collect() {
    const out = [], tw = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) { const s = n.nodeValue; for (let i = 0; i < s.length; i++) { if (/\s/.test(s[i])) continue; out.push({ n: n, i: i, ch: s[i] }); } }
    return out;
  }
  function inkOf(el) {                                           /* la rampa de «Siempre.» va en style.color de cada letra (core) */
    for (let e = el; e && e !== title; e = e.parentElement) if (e.style && e.style.color) return e.style.color;
    return '#fff';
  }
  const rg = document.createRange();
  function rects() {
    const out = [];
    for (let k = 0; k < st.chars.length; k++) {
      const c = st.chars[k];
      if (!c.n.parentNode) continue;
      rg.setStart(c.n, c.i); rg.setEnd(c.n, c.i + 1);
      const r = rg.getBoundingClientRect();
      if (r.width || r.height) out.push({ c: c, l: r.left, t: r.top, w: r.width, h: r.height });
    }
    return out;
  }
  /* Caja del lienzo = unión de las letras + margen; el h1 tiene sangría negativa, no sirve de referencia */
  function layout(rs) {
    if (!rs.length) return false;
    let L = 1e9, T = 1e9, R = -1e9, B = -1e9;
    rs.forEach((r) => { L = Math.min(L, r.l); T = Math.min(T, r.t); R = Math.max(R, r.l + r.w); B = Math.max(B, r.t + r.h); });
    const F = parseFloat(getComputedStyle(h1).fontSize) || 100;
    const px = Math.ceil(F * 0.14) + 12, py = Math.ceil(F * 0.10);
    const tb = title.getBoundingClientRect();
    const x = L - tb.left - px, y = T - tb.top - py, w = (R - L) + 2 * px, h = (B - T) + 2 * py;
    const s = host.style;
    s.left = x.toFixed(1) + 'px'; s.top = y.toFixed(1) + 'px'; s.width = w.toFixed(1) + 'px'; s.height = h.toFixed(1) + 'px';
    const dpr = Math.min(dprNow(), 2);
    const cw = Math.max(2, Math.round(w * dpr)), ch = Math.max(2, Math.round(h * dpr));
    st.cssW = w; st.cssH = h; st.sx = cw / w; st.sy = ch / h;
    if (mask.width !== cw || mask.height !== ch) { mask.width = cw; mask.height = ch; }
    if (st.canvas && (st.canvas.width !== cw || st.canvas.height !== ch)) {
      st.canvas.width = cw; st.canvas.height = ch;
      if (st.gl) { st.gl.viewport(0, 0, cw, ch); st.gl.uniform2f(uSize, w, h); }
    }
    st.layoutDirty = false;
    return true;
  }
  const ascents = {};
  function raster(rs) {
    const B = host.getBoundingClientRect();                      /* mismo instante que los Range: el scroll se cancela */
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, mask.width, mask.height);
    mctx.setTransform(st.sx, 0, 0, st.sy, 0, 0);
    mctx.textBaseline = 'alphabetic'; mctx.textAlign = 'left';
    const cache = new Map();
    for (let k = 0; k < rs.length; k++) {
      const r = rs[k], el = r.c.n.parentElement;
      let s = cache.get(el);
      if (!s) { const cs = getComputedStyle(el); s = { font: cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, ink: inkOf(el) }; cache.set(el, s); }
      mctx.font = s.font;
      let asc = ascents[s.font];
      if (asc == null) { asc = mctx.measureText('H').fontBoundingBoxAscent; ascents[s.font] = asc; }
      mctx.fillStyle = s.ink;
      mctx.fillText(r.c.ch, r.l - B.left, r.t - B.top + asc);
    }
    st.maskDirty = false;
  }
  function refresh() {                                           /* geometría + máscara al día */
    if (!st.chars) st.chars = collect();
    const rs = rects();
    if (st.layoutDirty || !st.box) { if (!layout(rs)) return false; st.box = true; }
    raster(rs);
    return true;
  }
  function dirtyDynamic() { return h1.classList.contains('is-weighing') || h1.classList.contains('is-unweighing'); }

  /* ── Camino WebGL ── */
  function buildGL() {
    const gl = st.gl;
    prg = program(gl, NACRE_VERT, NACRE_FRAG, 'nacarado');
    if (!prg) return false;
    gl.useProgram(prg);
    idxCount = gridMesh(gl, prg, GRID_X, GRID_Y);
    uTime = gl.getUniformLocation(prg, 'uTime'); uSize = gl.getUniformLocation(prg, 'uSize');
    gl.uniform1i(gl.getUniformLocation(prg, 'uMask'), 0);
    tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);     /* el 2D ya es premultiplicado: no se pierde el borde */
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (st.canvas.width > 1) { gl.viewport(0, 0, st.canvas.width, st.canvas.height); gl.uniform2f(uSize, st.cssW, st.cssH); }
    gl.clearColor(0, 0, 0, 0);
    return true;
  }
  function upload() {
    const gl = st.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
  }
  function paintGL(now, dt) {
    if (!st.ready || st.lost) return;
    if (dt) st.t += Math.min(dt, 100) / 1000;                    /* reloj acumulado: al volver al hero el campo sigue donde se quedó */
    const dyn = dirtyDynamic();
    if (st.layoutDirty || st.maskDirty || dyn || st.dynamic) {
      if (!refresh()) return;
      upload();
      st.dynamic = dyn;                                          /* un último repintado al salir de is-unweighing */
    }
    drawGL();
  }
  function drawGL() {
    const gl = st.gl;
    gl.uniform1f(uTime, st.t);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, idxCount, gl.UNSIGNED_SHORT, 0);
  }

  /* ── Camino 2D (reducido, sin WebGL2 o contexto perdido): campo evaluado una vez, máscara encima ── */
  function paint2D() {
    const ctx = st.canvas && st.canvas.getContext('2d'); if (!ctx) return;
    const f = evalField(GRID_X, GRID_Y, (x, y, rgb) => {
      const ux = (x / (GRID_X - 1) * 2 - 1) * st.cssW / Math.min(st.cssW, st.cssH), uy = ((1 - y / (GRID_Y - 1)) * 2 - 1) * st.cssH / Math.min(st.cssW, st.cssH);
      nacreAt(ux, uy, 0, rgb);
    });
    if (!f) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, st.canvas.width, st.canvas.height);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(f, 0, 0, st.canvas.width, st.canvas.height);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0);           /* solo dentro de las letras */
    ctx.globalCompositeOperation = 'darken'; ctx.drawImage(mask, 0, 0);                   /* min(color de la letra, campo) */
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ── Encendido y apagado: nunca dejar el titular sin texto visible ── */
  function show() {                                              /* fundido de la capa; después el texto del DOM deja de pintarse */
    reveal(st.canvas);
    clearTimeout(st.fix);
    st.fix = setTimeout(() => { if (st.ready && !st.lost) { root.classList.add('gl-nacre-on'); st.on = true; } }, TK.base + 60);
  }
  function turnOff() {                                           /* cualquier fallo: vuelve el texto del DOM */
    clearTimeout(st.fix);
    root.classList.remove('gl-nacre-on'); st.on = false;
    if (st.canvas) st.canvas.classList.remove('gl-ready');
  }
  function markLayout() { st.layoutDirty = true; st.maskDirty = true; redrawSoon(); }
  function redrawSoon() {                                        /* un repintado si el bucle no está corriendo */
    if (!st.ready || st.lost || document.hidden || st.pending) return;
    st.pending = requestAnimationFrame(() => {
      st.pending = 0;
      if (st.kind === 'gl') { paintGL(performance.now(), 0); } else if (st.kind === '2d' && refresh()) paint2D();
    });
  }

  function setup2D() {
    st.kind = '2d'; st.gl = null;
    if (st.canvas && st.canvas.parentNode) st.canvas.parentNode.removeChild(st.canvas);
    st.canvas = document.createElement('canvas');
    host.appendChild(st.canvas);
    if (!refresh()) { host.removeChild(st.canvas); st.canvas = null; return false; }
    st.ready = true;
    paint2D(); show();
    return true;
  }
  function setupGL() {
    const canvas = document.createElement('canvas');
    const gl = getGL(canvas, { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return false;
    st.kind = 'gl'; st.canvas = canvas; st.gl = gl;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); st.lost = true; st.ready = false; sched.remove(task); turnOff();            /* vuelve el texto del DOM */
    });
    canvas.addEventListener('webglcontextrestored', () => {
      st.lost = false;
      if (!buildGL()) { fallback2D(); return; }
      st.ready = true; st.layoutDirty = true; st.maskDirty = true;
      if (refresh()) { upload(); drawGL(); show(); }
      if (st.amb && st.amb.running && !mqCompact.matches) sched.add(task);
    });
    host.appendChild(canvas);
    if (!refresh()) { host.removeChild(canvas); st.canvas = null; st.gl = null; return false; }    /* sin letras medibles: nada que hacer */
    st.t = 0;
    if (!buildGL()) { host.removeChild(canvas); st.canvas = null; st.gl = null; return false; }
    st.ready = true;
    upload(); drawGL(); show();
    return true;
  }
  function fallback2D() { sched.remove(task); st.gl = null; st.ready = false; st.lost = false; setup2D(); }

  function activate() {
    if (st.started) return; st.started = true;
    if (!st.chars) st.chars = collect();
    if (!st.chars.length) { turnOff(); return; }
    /* La máscara supone que la caja de cada letra mide ascenso + descenso de la fuente (así la da Range en Chromium).
       Si el navegador la mide distinto (o no da métricas), el texto del DOM se queda como está: mejor un titular
       sin iridiscencia que uno corrido. */
    mctx.font = (function () { const cs = getComputedStyle(h1); return cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; })();
    const probe = mctx.measureText('H');
    if (probe.fontBoundingBoxAscent == null) return;
    const r0 = rects()[0], F0 = parseFloat(getComputedStyle(h1).fontSize) || 100;
    if (!r0 || Math.abs(r0.h - (probe.fontBoundingBoxAscent + probe.fontBoundingBoxDescent)) > Math.max(2, F0 * 0.03)) { warn('nacarado', 'métricas de fuente distintas: se conserva el texto del DOM'); return; }
    if (HAS_GL2 && !reducedNow() && TEST.nacre2d !== true) {
      if (!setupGL()) setup2D();
    } else setup2D();
    if (!st.ready) return;
    /* Re-medir cuando cambia lo que mueve las letras */
    if ('ResizeObserver' in window) { st.ro = new ResizeObserver(markLayout); st.ro.observe(title); st.ro.observe(h1); }
    window.addEventListener('resize', markLayout);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', markLayout);
    if ('MutationObserver' in window) {
      st.mo = new MutationObserver((ms) => {
        let re = false;
        ms.forEach((m) => { if (m.type === 'childList') re = true; });
        if (re) { st.chars = null; markLayout(); } else { st.maskDirty = true; redrawSoon(); }       /* is-weighing / is-unweighing */
      });
      st.mo.observe(h1, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    }
    if (st.kind === 'gl') {
      st.amb = ambient(title, {
        start() { if (mqCompact.matches) redrawSoon(); else sched.add(task); },       /* compacto: un cuadro (≤1 lienzo animado en el hero) */
        stop() { sched.remove(task); }
      });
      mqOn(mqCompact, () => { if (st.amb && st.amb.running) { if (mqCompact.matches) { sched.remove(task); redrawSoon(); } else sched.add(task); } });
    }
  }
  /* Cuando el titular está asentado: sin intro (reducido, sin GSAP) basta m-hero-in; con intro, saphi:intro-done */
  function settled() { return (root.classList.contains('m-hero-in') && !root.classList.contains('m-intro')) || !root.classList.contains('js'); }   /* sin core, el script temprano quita html.js a los 4 s y el titular queda visible */
  function whenReady() {
    const go = () => { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => idle(activate, 300)); else idle(activate, 300); };
    if (settled()) { go(); return; }
    let done = false;
    const once = () => { if (done || !settled()) return; done = true; obs.disconnect(); document.removeEventListener('saphi:intro-done', once); go(); };
    const obs = new MutationObserver(once);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('saphi:intro-done', once);
    setTimeout(() => { if (!done && root.classList.contains('m-hero-done')) once(); }, 6000);
  }
  whenReady();
  window.__saphiNacre = { state: () => ({ kind: st.kind, ready: st.ready, on: st.on, lost: st.lost, box: [st.cssW, st.cssH], dyn: st.dynamic }), refresh: markLayout };
})();

/* ══ Listón de scroll ══════════════════════════════════════════
   Puerto a WebGL2 puro del componente Ribbons (React Bits), con su misma física (resorte + fricción en
   la cabeza, lerp con envejecimiento en la cola) y su mismo shader de polilínea con grosor en espacio
   de pantalla. La cabeza sigue tu posición en la página; la velocidad del scroll agranda el vaivén; el
   desvanecido corre a lo largo del listón; cada listón se dibuja dos veces (halo + trazo).
   Cambios de esta versión: el contexto se crea después del intro y solo si el listón se ve (≥1181 px,
   sin movimiento reducido); se detiene tras M.ambient.idle sin scroll y se reanuda al desplazarse
   (G-21: en reposo ya no dibuja); contexto perdido y restaurado. Reducido o sin WebGL2: no hay
   listón; el índice 01-06 de la izquierda ya marca la posición. */
(function ribbon() {
  const host = qs('.scroll-ribbon');
  if (!host || TEST.ribbon === false) return;
  if (reducedNow() || !HAS_GL2) { if (host.parentNode) host.parentNode.removeChild(host); return; }

  /* Constantes del componente original (baseSpring 0.03, baseFriction 0.9, offsetFactor 0.05, maxAge 500,
     pointCount 50, speedMultiplier 0.6). */
  const BASE_SPRING = 0.03, BASE_FRICTION = 0.9, OFFSET = 0.05;
  const MAX_AGE = 500, COUNT = 50, SPEED_MULT = 0.6;
  /* Envergadura estructural: cada punto cuelga a altura fija sobre el anterior (serpentina vertical
     siempre visible); la física pone el latigazo. */
  const LEN = 0.85, SPACING = LEN / (COUNT - 1);
  const RIBBONS = [
    { color: [0.545, 0.427, 0.910], thickness: 64 },   /* lila  #8B6DE8 */
    { color: [0.318, 0.106, 0.859], thickness: 46 }    /* morado #511BDB */
  ];
  const GLOW_SCALE = 5.0, GLOW_OPACITY = 0.16, CORE_OPACITY = 0.9;
  /* Onda viajera: ondula aun con el scroll quieto y, con fase distinta por listón, se trenzan entre sí */
  const WAVE_AMP = 0.10, WAVE_K = 0.30, WAVE_SPEED = 2.2;

  const VERT =
'precision highp float;\n' +
'attribute vec3 position;\n' +
'attribute vec3 next;\n' +
'attribute vec3 prev;\n' +
'attribute vec2 uv;\n' +
'attribute float side;\n' +
'uniform vec2 uResolution;\n' +
'uniform float uDPR;\n' +
'uniform float uThickness;\n' +
'varying vec2 vUV;\n' +
'vec4 getPosition() {\n' +
'    vec4 current = vec4(position, 1.0);\n' +
'    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);\n' +
'    vec2 nextScreen = next.xy * aspect;\n' +
'    vec2 prevScreen = prev.xy * aspect;\n' +
'    vec2 tangent = normalize(nextScreen - prevScreen);\n' +
'    vec2 normal = vec2(-tangent.y, tangent.x);\n' +
'    normal /= aspect;\n' +
'    normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));\n' +
'    float dist = length(nextScreen - prevScreen);\n' +
'    normal *= smoothstep(0.0, 0.02, dist);\n' +
'    float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);\n' +
'    float pixelWidth = current.w * pixelWidthRatio;\n' +
'    normal *= pixelWidth * uThickness;\n' +
'    current.xy -= normal * side;\n' +
'    return current;\n' +
'}\n' +
'void main() {\n' +
'    vUV = uv;\n' +
'    gl_Position = getPosition();\n' +
'}';
  const FRAG =
'precision highp float;\n' +
'uniform vec3 uColor;\n' +
'uniform float uOpacity;\n' +
'varying vec2 vUV;\n' +
'void main() {\n' +
'    float fadeFactor = 1.0 - smoothstep(0.35, 1.0, vUV.x);\n' +
'    gl_FragColor = vec4(uColor, uOpacity * fadeFactor);\n' +
'}';

  /* ── Estado físico: igual que el original, con azar por listón ── */
  const center = (RIBBONS.length - 1) / 2;
  const lines = RIBBONS.map((r, index) => {
    const pts = [];
    for (let k = 0; k < COUNT; k++) pts.push({ x: 0, y: 0 });
    return {
      color: r.color, thickness: r.thickness + (Math.random() - 0.5) * 3,
      spring: BASE_SPRING + (Math.random() - 0.5) * 0.05,
      friction: BASE_FRICTION + (Math.random() - 0.5) * 0.05,
      offX: (index - center) * OFFSET + (Math.random() - 0.5) * 0.01,
      offY: (Math.random() - 0.5) * 0.1,
      phase: index * 1.7,
      velX: 0, velY: 0, points: pts
    };
  });
  function progreso() {                                          /* la cabeza sigue tu posición de scroll */
    const L = window.__saphiLenis;
    if (L && typeof L.progress === 'number' && isFinite(L.progress)) return Math.max(0, Math.min(1, L.progress));
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(1, (window.scrollY || 0) / max));
  }
  function velocidad() { const L = window.__saphiLenis; return (L && isFinite(L.velocity)) ? Math.abs(L.velocity) : 0; }
  const p0 = progreso(), y0 = 0.80 - p0 * 1.68;
  lines.forEach((l) => { l.points.forEach((p) => { p.x = l.offX; p.y = y0 + l.offY; }); });

  const V = COUNT * 2;
  const aPos = new Float32Array(V * 2), aPrev = new Float32Array(V * 2);
  const aNext = new Float32Array(V * 2);
  const aUv = new Float32Array(V * 2), aSide = new Float32Array(V);
  for (let i = 0; i < COUNT; i++) { const x = i / (COUNT - 1); aUv.set([x, 0, x, 1], i * 4); aSide[i * 2] = 1; aSide[i * 2 + 1] = -1; }
  const idx = new Uint16Array((COUNT - 1) * 6);
  for (let i = 0; i < COUNT - 1; i++) idx.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3], i * 6);
  const gx = new Float32Array(COUNT), gy = new Float32Array(COUNT);

  let canvas = null, gl = null, prg = null, bPos, bPrev, bNext, uRes, uDPR, uTh, uCol, uOp;
  let t = 0, last = 0, awake = true, lastMove = 0, wanted = false, ready = false, lost = false, ro = null, amb = null, dpr = 1;
  const segDelay = MAX_AGE / (COUNT - 1);
  const task = { tag: 'liston', interval: 0, draw: (now, dt) => frame(now, dt), fail: () => { ready = false; if (canvas) canvas.style.visibility = 'hidden'; } };

  function build() {
    prg = program(gl, VERT, FRAG, 'liston');
    if (!prg) return false;
    gl.useProgram(prg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    const makeBuf = (data, dyn) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); return b; };
    const attr = (name, buf, size) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); const l = gl.getAttribLocation(prg, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); };
    bPos = makeBuf(aPos, true); bPrev = makeBuf(aPrev, true); bNext = makeBuf(aNext, true);
    attr('position', bPos, 2); attr('prev', bPrev, 2); attr('next', bNext, 2);
    attr('uv', makeBuf(aUv, false), 2); attr('side', makeBuf(aSide, false), 1);
    const bIdx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    const U = (n) => gl.getUniformLocation(prg, n);
    uRes = U('uResolution'); uDPR = U('uDPR'); uTh = U('uThickness'); uCol = U('uColor'); uOp = U('uOpacity');
    if (canvas.width > 1) gl.viewport(0, 0, canvas.width, canvas.height);
    return true;
  }

  function updateGeometry(l) {
    const pts = l.points, n = pts.length;
    for (let k = 0; k < n; k++) {
      const onda = Math.sin(t * WAVE_SPEED + k * WAVE_K + l.phase) * WAVE_AMP * (0.2 + 0.8 * k / (n - 1));
      gx[k] = pts[k].x + onda; gy[k] = pts[k].y + k * SPACING;
    }
    for (let k = 0; k < n; k++) {
      const pvx = k > 0 ? gx[k - 1] : 2 * gx[0] - gx[1];
      const pvy = k > 0 ? gy[k - 1] : 2 * gy[0] - gy[1];
      const nxx = k < n - 1 ? gx[k + 1] : 2 * gx[n - 1] - gx[n - 2];
      const nxy = k < n - 1 ? gy[k + 1] : 2 * gy[n - 1] - gy[n - 2];
      aPos.set([gx[k], gy[k], gx[k], gy[k]], k * 4);
      aPrev.set([pvx, pvy, pvx, pvy], k * 4);
      aNext.set([nxx, nxy, nxx, nxy], k * 4);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, bPrev); gl.bufferSubData(gl.ARRAY_BUFFER, 0, aPrev);
    gl.bindBuffer(gl.ARRAY_BUFFER, bNext); gl.bufferSubData(gl.ARRAY_BUFFER, 0, aNext);
  }
  function drawLine(l) {
    updateGeometry(l);
    gl.uniform3f(uCol, l.color[0], l.color[1], l.color[2]);
    gl.uniform1f(uTh, l.thickness * GLOW_SCALE); gl.uniform1f(uOp, GLOW_OPACITY);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    gl.uniform1f(uTh, l.thickness); gl.uniform1f(uOp, CORE_OPACITY);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }
  function render() {                                            /* un cuadro con la física tal como está */
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uDPR, dpr);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawLine(lines[1]);                                          /* morado detrás */
    drawLine(lines[0]);                                          /* lila al frente */
  }
  function step(dt) {
    t += Math.min(dt, 100) * 0.001;
    const pr = progreso(), vel = velocidad();
    const sway = 0.15 + Math.min(0.32, vel * 0.010);
    const tx = Math.sin(t * 0.9) * sway + Math.sin(t * 0.53 + 1.4) * sway * 0.6;
    const ty = 0.80 - pr * 1.68 + Math.sin(t * 0.7 + 0.6) * 0.02;      /* de +0.80 (bajo el header) a -0.88; la cola cuelga hacia arriba */
    lines.forEach((l) => {
      const fx = (tx + l.offX - l.points[0].x) * l.spring;
      const fy = (ty + l.offY - l.points[0].y) * l.spring;
      l.velX = (l.velX + fx) * l.friction;
      l.velY = (l.velY + fy) * l.friction;
      l.points[0].x += l.velX; l.points[0].y += l.velY;
      const alpha = Math.min(1, (dt * SPEED_MULT) / segDelay);
      for (let k = 1; k < l.points.length; k++) {
        l.points[k].x += (l.points[k - 1].x - l.points[k].x) * alpha;
        l.points[k].y += (l.points[k - 1].y - l.points[k].y) * alpha;
      }
    });
    render();
  }
  function frame(now, dt) {
    if (!ready || lost) return;
    step(dt);
    if (now - lastMove > TK.idle) { awake = false; sched.remove(task); }            /* G-21: sin scroll durante M.ambient.idle, se detiene */
  }
  function kick() { if (wanted && awake && ready && !lost) sched.add(task); }
  function wake() {                                              /* el scroll lo reanuda */
    lastMove = performance.now();
    if (!awake) { awake = true; kick(); }
  }
  function size() {
    if (!ready) return;
    dpr = Math.min(dprNow(), 1.75);
    const w = Math.max(1, Math.round(host.clientWidth * dpr)), h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); render(); }
  }

  function create() {
    if (canvas || reducedNow() || !mqRibbon.matches) return;
    canvas = document.createElement('canvas');
    gl = getGL(canvas, { alpha: true, premultipliedAlpha: false, antialias: true, powerPreference: 'low-power' });
    if (!gl) { canvas = null; if (host.parentNode) host.parentNode.removeChild(host); return; }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; ready = false; sched.remove(task); });
    canvas.addEventListener('webglcontextrestored', () => {
      lost = false; ready = build();
      if (ready) { size(); render(); reveal(canvas); kick(); }
    });
    if (!build()) { canvas = null; gl = null; return; }
    host.appendChild(canvas);
    ready = true;
    dpr = Math.min(dprNow(), 1.75);
    size();
    lastMove = performance.now();
    step(16.7);                                                  /* primer cuadro síncrono: el listón existe aunque el bucle no corra */
    reveal(canvas);
    window.__saphiRibbonTick = step;                             /* para pruebas, como __agAbrir */
    if ('ResizeObserver' in window) { ro = new ResizeObserver(size); ro.observe(host); }
    window.addEventListener('scroll', wake, { passive: true });
    amb = ambient(host, {                                        /* display:none (≤1180 px) también apaga el bucle */
      start() { wanted = true; kick(); },
      stop() { wanted = false; sched.remove(task); }
    });
  }
  /* El contexto nace después del intro (no compite con él) y nunca con la página oculta del todo */
  function afterIntro() {
    const go = () => idle(create, 1500);
    if (root.classList.contains('m-hero-done') || (root.classList.contains('m-hero-in') && !root.classList.contains('m-intro'))) { go(); return; }
    let fired = false;
    const once = () => { if (fired) return; fired = true; document.removeEventListener('saphi:intro-done', once); go(); };
    document.addEventListener('saphi:intro-done', once);
    setTimeout(once, 7000);
  }
  afterIntro();
  mqOn(mqRibbon, () => { if (mqRibbon.matches && !canvas) afterIntro(); });
})();

/* ══ Grainient por producto ═════════════════════════════════════
   Puerto a WebGL2 puro del componente Grainient (React Bits): un canvas por producto, cada uno con su
   color y su carácter de movimiento. Cómo se reparte el trabajo (G-03):
     · Crear: un IO a 600 px pide el contexto; se crea uno por tarea (idle), el del panel activo antes.
     · Dibujar: escritorio → solo el panel activo (y el que se cierra, hasta que termina su cierre:
       ≤2 durante un cambio, 1 en reposo). Los demás conservan su último cuadro (el canvas no se borra
       si nadie dibuja). Vista apilada (≤900 px) o sin evento ag:active → manda la visibilidad, tope 2.
     · Pausar: pestaña oculta, fuera de pantalla y movimiento reducido pasan por ambient() de core.
     · Reducido / sin WebGL2 / contexto perdido: cuadro estático 2D (puerto de este mismo shader). */
const GRAIN_CFG = {
  voz:          { c: ['#F5A623', '#6E4B10', '#1A1206'], ts: .22, bal: -.12, wst: 1,   wf: 5,   wsp: 1.6, wam: 50, ang: 0,   soft: .12, rot: 500, ns: 2,   gr: .10, gs: 2.4, ga: 0, con: 1.35, cx: 0,    cy: 0,   zm: .9 },
  whatsapp:     { c: ['#3B82F6', '#1B3B6F', '#0A1322'], ts: .30, bal: -.18, wst: 1,   wf: 7.5, wsp: 2.4, wam: 70, ang: 35,  soft: .08, rot: 320, ns: 2,   gr: .12, gs: 2,   ga: 0, con: 1.4,  cx: .12,  cy: 0,   zm: 1.15 },
  inmobiliaria: { c: ['#14B8C4', '#095358', '#07181A'], ts: .14, bal: -.10, wst: .6,  wf: 3,   wsp: 1.1, wam: 90, ang: -25, soft: .2,  rot: 240, ns: 1.6, gr: .08, gs: 2.2, ga: 0, con: 1.3,  cx: 0,    cy: .05, zm: 1 },
  web:          { c: ['#F5487F', '#6E2039', '#200E14'], ts: .34, bal: -.20, wst: 1.2, wf: 8.5, wsp: 3.2, wam: 40, ang: 65,  soft: .06, rot: 720, ns: 2.4, gr: .11, gs: 1.8, ga: 0, con: 1.45, cx: 0,    cy: .08, zm: .8 },
  salud:        { c: ['#F100CB', '#6C005B', '#20081C'], ts: .26, bal: -.22, wst: 1.4, wf: 11,  wsp: 2.8, wam: 30, ang: 90,  soft: .05, rot: 420, ns: 3,   gr: .14, gs: 1.6, ga: 1, con: 1.4,  cx: -.05, cy: 0,   zm: .95 },
  videos:       { c: ['#A855F7', '#4B266F', '#150E20'], ts: .18, bal: -.08, wst: .8,  wf: 4,   wsp: 1.4, wam: 65, ang: -60, soft: .3,  rot: 380, ns: 1.8, gr: .09, gs: 2.6, ga: 0, con: 1.3,  cx: -.1,  cy: 0,   zm: 1.05 }
};
const GRAIN_FRAG = '#version 300 es\n' +
'precision highp float;\n' +
'uniform vec2 iResolution;uniform float iTime;uniform float uTimeSpeed;uniform float uColorBalance;uniform float uWarpStrength;uniform float uWarpFrequency;uniform float uWarpSpeed;uniform float uWarpAmplitude;uniform float uBlendAngle;uniform float uBlendSoftness;uniform float uRotationAmount;uniform float uNoiseScale;uniform float uGrainAmount;uniform float uGrainScale;uniform float uGrainAnimated;uniform float uContrast;uniform float uGamma;uniform float uSaturation;uniform vec2 uCenterOffset;uniform float uZoom;uniform vec3 uColor1;uniform vec3 uColor2;uniform vec3 uColor3;uniform float uLightMode;out vec4 fragColor;\n' +
'#define S(a,b,t) smoothstep(a,b,t)\n' +
'mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}\n' +
'vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}\n' +
'float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}\n' +
'void main(){\n' +
'  float t=iTime*uTimeSpeed;\n' +
'  vec2 uv=gl_FragCoord.xy/iResolution.xy;\n' +
'  float ratio=iResolution.x/iResolution.y;\n' +
'  vec2 tuv=uv-0.5+uCenterOffset;\n' +
'  tuv/=max(uZoom,0.001);\n' +
'  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);\n' +
'  tuv.y*=1.0/ratio;\n' +
'  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));\n' +
'  tuv.y*=ratio;\n' +
'  float frequency=uWarpFrequency;\n' +
'  float ws=max(uWarpStrength,0.001);\n' +
'  float amplitude=uWarpAmplitude/ws;\n' +
'  float warpTime=t*uWarpSpeed;\n' +
'  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;\n' +
'  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);\n' +
'  vec3 colLav=uColor1;vec3 colOrg=uColor2;vec3 colDark=uColor3;\n' +
'  float b=uColorBalance;float s=max(uBlendSoftness,0.0);\n' +
'  mat2 blendRot=Rot(radians(uBlendAngle));\n' +
'  float blendX=(tuv*blendRot).x;\n' +
'  float edge0=-0.3-b-s;float edge1=0.2-b+s;\n' +
'  float v0=0.5-b+s;float v1=-0.3-b-s;\n' +
'  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));\n' +
'  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));\n' +
'  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));\n' +
'  vec2 grainUv=uv*max(uGrainScale,0.001);\n' +
'  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}\n' +
'  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);\n' +
'  col+=(grain-0.5)*uGrainAmount;\n' +
'  col=(col-0.5)*uContrast+0.5;\n' +
'  float luma=dot(col,vec3(0.2126,0.7152,0.0722));\n' +
'  col=mix(vec3(luma),col,uSaturation);\n' +
'  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));\n' +
'  col=clamp(col,0.0,1.0);\n' +
'  fragColor=vec4(col,1.0);\n' +
'}';
function grainDef(cfg) {
  return {
    tag: 'grainient', frag: GRAIN_FRAG, uTime: 'iTime', uRes: 'iResolution', first: true, fade: true,
    scale: () => Math.min(dprNow(), 1.5) * 0.66,
    setup(gl, U) {
      gl.uniform1f(U('uTimeSpeed'), cfg.ts);       gl.uniform1f(U('uColorBalance'), cfg.bal);
      gl.uniform1f(U('uWarpStrength'), cfg.wst);   gl.uniform1f(U('uWarpFrequency'), cfg.wf);
      gl.uniform1f(U('uWarpSpeed'), cfg.wsp);      gl.uniform1f(U('uWarpAmplitude'), cfg.wam);
      gl.uniform1f(U('uBlendAngle'), cfg.ang);     gl.uniform1f(U('uBlendSoftness'), cfg.soft);
      gl.uniform1f(U('uRotationAmount'), cfg.rot); gl.uniform1f(U('uNoiseScale'), cfg.ns);
      gl.uniform1f(U('uGrainAmount'), cfg.gr);     gl.uniform1f(U('uGrainScale'), cfg.gs);
      gl.uniform1f(U('uGrainAnimated'), cfg.ga);   gl.uniform1f(U('uContrast'), cfg.con);
      gl.uniform1f(U('uGamma'), 1);                gl.uniform1f(U('uSaturation'), 1.05);
      gl.uniform2f(U('uCenterOffset'), cfg.cx, cfg.cy);
      gl.uniform1f(U('uZoom'), cfg.zm);            gl.uniform1f(U('uLightMode'), 0);
      gl.uniform3fv(U('uColor1'), hexRGB(cfg.c[0]));
      gl.uniform3fv(U('uColor2'), hexRGB(cfg.c[1]));
      gl.uniform3fv(U('uColor3'), hexRGB(cfg.c[2]));
    },
    advance(f, now, dt) { f.t += Math.min(dt, 100) / 1000; }       /* reloj propio: al reabrir un panel sigue donde se quedó (sin salto de patrón) */
  };
}
/* Cuadro estático 2D del grainient (el shader evaluado en CPU a un cuarto de resolución, t = 6 s como antes) */
function grainStill(host, cfg) {
  const c1 = hexRGB(cfg.c[0]), c2 = hexRGB(cfg.c[1]), c3 = hexRGB(cfg.c[2]);
  return Still(host, 0.5, (ctx, W, Hh) => {
    const w = Math.max(8, Math.round(W / 2)), h = Math.max(8, Math.round(Hh / 2)), ratio = w / h, T = 6, t = T * cfg.ts;
    const ba = cfg.ang * Math.PI / 180, bc = Math.cos(ba), bs = Math.sin(ba);
    const b = cfg.bal, sft = Math.max(cfg.soft, 0), e0 = -0.3 - b - sft, e1 = 0.2 - b + sft, v0 = 0.5 - b + sft, v1 = -0.3 - b - sft;
    const ws = Math.max(cfg.wst, 0.001), amp = cfg.wam / ws, wt = t * cfg.wsp;
    const F = evalField(w, h, (x, y, rgb) => {
      const ux = (x + 0.5) / w, uy = 1 - (y + 0.5) / h;
      let tx = (ux - 0.5 + cfg.cx) / Math.max(cfg.zm, 0.001), ty = (uy - 0.5 + cfg.cy) / Math.max(cfg.zm, 0.001);
      const degree = vnoise(t * 0.1 * cfg.ns, tx * ty * cfg.ns);
      ty *= 1 / ratio;
      const a = ((degree - 0.5) * cfg.rot + 180) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const rx = tx * ca - ty * sa, ry = tx * sa + ty * ca;
      tx = rx; ty = ry * ratio;
      tx += Math.sin(ty * cfg.wf + wt) / amp;
      ty += Math.sin(tx * (cfg.wf * 1.5) + wt) / (amp * 0.5);
      const bx = tx * bc - ty * bs;
      const sx = smooth(e0, e1, bx), sy = smooth(v0, v1, ty);
      for (let k = 0; k < 3; k++) {
        const l1 = c3[k] + (c2[k] - c3[k]) * sx, l2 = c2[k] + (c1[k] - c2[k]) * sx;
        let col = l1 + (l2 - l1) * sy;
        col = (col - 0.5) * cfg.con + 0.5;
        rgb[k] = col;
      }
      const luma = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      for (let k = 0; k < 3; k++) rgb[k] = clamp01(luma + (rgb[k] - luma) * 1.05);
    });
    if (!F) return;
    ctx.drawImage(F, 0, 0, W, Hh);
    grainOverlay(ctx, W, Hh, 'overlay', Math.min(1, cfg.gr * 3.2));
  });
}

(function grainients() {
  const hosts = qsa('.grainient[data-g]');
  if (!hosts.length || TEST.grain === false) return;
  const items = [], byId = {}, byHost = new Map();
  hosts.forEach((host, i) => {
    const id = host.getAttribute('data-g'), cfg = GRAIN_CFG[id];
    if (!cfg) return;
    const g = { host: host, i: i, id: id, cfg: cfg, field: null, still: null, amb: null, running: false, queued: false, urgent: false,
                near: !('IntersectionObserver' in window), ratio: 0, linger: 0, task: null };
    g.task = { tag: 'grainient:' + id, interval: FRAME_MS, heavy: true, draw: (now, dt) => { if (g.field) g.field.draw(now, dt); }, fail: () => { g.running = false; showStill(g); } };
    items.push(g); byId[id] = g; byHost.set(host, g);
  });
  if (!items.length) return;

  /* ── estado compartido ── */
  const agRow = document.getElementById('agRow');
  let activeId = (function () {
    const p = agRow && agRow.querySelector('.ag-panel[aria-current="true"], .ag-panel--active');
    const id = p && p.getAttribute('data-p');
    return id && byId[id] ? id : (byId.voz ? 'voz' : items[0].id);
  })();
  let agSeen = false, stackedByEvent = false;
  const stacked = () => mqCompact.matches || stackedByEvent;

  function sync(g) {                                             /* ¿corre el bucle de este panel? */
    const on = g.running && g.field && g.field.ready && !document.hidden;
    if (on) sched.add(g.task); else sched.remove(g.task);
  }
  function showStill(g) { if (!g.still) g.still = grainStill(g.host, g.cfg); }
  function dropStill(g) { if (g.still) { g.still.remove(); g.still = null; } }

  /* ── creación de contextos: uno por tarea ── */
  const queue = []; let pumping = false, pend = null;
  const order = (a, b) => (b.urgent - a.urgent) || ((a.id === activeId ? 0 : 1) - (b.id === activeId ? 0 : 1)) || (a.i - b.i);
  function enqueue(g, urgent) {
    if (g.field) return;
    if (g.queued) {
      if (urgent && !g.urgent) { g.urgent = true; queue.sort(order); if (pend && !pend.urgent) { pend.cancel(); pumping = false; pump(); } }   /* lo urgente no espera al idle */
      return;
    }
    g.queued = true; g.urgent = !!urgent;
    queue.push(g); queue.sort(order);
    if (urgent && pend && !pend.urgent) { pend.cancel(); pumping = false; }
    pump();
  }
  function pump() {
    if (pumping || !queue.length) return;
    pumping = true;
    const urgent = queue[0].urgent;
    const run = () => {
      pend = null;
      const g = queue.shift(); if (g) { g.queued = false; try { build(g); } catch (e) { warn('grainient', e); } }
      if (urgent) { pumping = false; pump(); } else setTimeout(() => { pumping = false; pump(); }, 150);   /* entre contextos de fondo, un respiro */
    };
    if (urgent) { const h = setTimeout(run, 0); pend = { urgent: true, cancel: () => clearTimeout(h) }; }
    else { const h = idle(run, 500); pend = { urgent: false, cancel: () => { if ('cancelIdleCallback' in window) window.cancelIdleCallback(h); else clearTimeout(h); } }; }
  }
  function build(g) {
    if (g.field) return;
    if (!HAS_GL2 || reducedNow()) { showStill(g); return; }       /* cero contextos: cuadro estático 2D */
    const f = Field(g.host, grainDef(g.cfg));
    if (!f.create()) { showStill(g); return; }
    f.onLost = () => { sync(g); showStill(g); };
    f.onRestored = () => { dropStill(g); sync(g); };
    g.field = f;
    dropStill(g);
    sync(g);
  }

  /* ── quién dibuja ── */
  function wantSet() {
    const set = new Set();
    if (reducedNow() || document.hidden) return set;
    if (!stacked()) {
      const a = byId[activeId]; if (a) set.add(a);
      const now = performance.now();
      items.forEach((g) => { if (g.linger > now && set.size < 2 && g !== a) set.add(g); });
    } else {
      items.filter((g) => g.ratio > 0).sort((a, b) => b.ratio - a.ratio).slice(0, 2).forEach((g) => set.add(g));
    }
    return set;
  }
  let polTimer = 0;
  function policy() {
    polTimer = 0;
    const set = wantSet();
    items.forEach((g) => {
      if (set.has(g)) { if (g.near && !g.field) enqueue(g, true); g.amb.start(); } else g.amb.stop();
    });
  }
  function policySoon() { if (!polTimer) polTimer = setTimeout(policy, 0); }
  function setActive(id) {
    if (!id || !byId[id] || id === activeId) { policySoon(); return; }
    const prev = byId[activeId];
    if (prev && !stacked()) { prev.linger = performance.now() + TK.layout + 60; setTimeout(policySoon, TK.layout + 100); }
    items.forEach((g) => { if (g !== prev && g.id !== id) g.linger = 0; });   /* a lo más un panel en cierre */
    activeId = id;
    policy();
  }

  items.forEach((g) => {
    g.amb = ambient(g.host, { start() { g.running = true; sync(g); }, stop() { g.running = false; sync(g); } });
    g.amb.stop();                                                /* el interruptor manual lo mueve policy() */
  });

  /* Contrato con accordion.js: ag:active { index, id, el }; index -1 = vista apilada. Dispatch en window o document
     (la fase de captura en window recibe ambos). */
  window.addEventListener('ag:active', (e) => {
    agSeen = true;
    const d = e.detail || {};
    stackedByEvent = d.index === -1;
    let id = d.id || (d.el && d.el.getAttribute && d.el.getAttribute('data-p'));
    if (!id && typeof d.index === 'number' && items[d.index]) id = items[d.index].id;
    if (stackedByEvent) { policySoon(); return; }
    setActive(id);
  }, true);
  /* Sin el evento (acordeón aún sin emitirlo): se lee el panel abierto del propio DOM */
  if (agRow && 'MutationObserver' in window) {
    new MutationObserver(() => {
      if (agSeen) return;
      const p = agRow.querySelector('.ag-panel[aria-current="true"], .ag-panel--active');
      if (p) setActive(p.getAttribute('data-p'));
    }).observe(agRow, { subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] });
  }

  /* Visibilidad: contexto a 600 px; en vista apilada, el ranking por fracción visible */
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const g = byHost.get(e.target); near.unobserve(e.target);
        g.near = true;
        enqueue(g, wantSet().has(g));
      });
    }, { rootMargin: '600px 0px' });
    const rank = new IntersectionObserver((es) => {
      es.forEach((e) => { const g = byHost.get(e.target); if (g) g.ratio = e.isIntersecting ? e.intersectionRatio : 0; });
      if (stacked()) policySoon();
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    items.forEach((g) => { near.observe(g.host); rank.observe(g.host); });
  } else items.forEach((g) => enqueue(g, false));

  mqOn(mqCompact, policySoon);
  document.addEventListener('visibilitychange', policySoon);
  document.addEventListener('saphi:mode', policySoon);
  policy();

  window.__saphiGL = {                                           /* para pruebas */
    live: () => items.filter((g) => g.running && g.field && g.field.ready).map((g) => g.id),
    contexts: () => items.filter((g) => g.field).map((g) => g.id),
    stills: () => items.filter((g) => g.still).map((g) => g.id),
    active: () => activeId,
    sched: () => sched.size
  };
})();
