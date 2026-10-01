/* ============================================================================
   js/core.js — NÚCLEO v2 (propietario: núcleo)
   Tokens de movimiento (objeto M, leído de css/motion.css), modos (mode), estado
   que corre SIEMPRE (tema, sección activa, header, progreso, llegadas, contadores,
   foco) y movimiento que corre solo con GSAP y sin «reducir movimiento» (Lenis,
   intro «Primer timbre»). Contrato completo en js/CONTRATO.md, «v2 · núcleo».

   Dos funciones separan lo que nunca debe faltar de lo que es movimiento:
     initState()   siempre: html.m-ready, estados, aria, contadores en su valor final
     initMotion()  solo con GSAP y sin reduce: Lenis y el intro del hero
   Así el menú, el formulario, las anclas y el tema ya no dependen de GSAP ni de
   la preferencia de movimiento (en el original un `return` temprano los borraba).

   Orden de dependencia: core no importa a nadie. Sin GSAP ni reduce el módulo
   exporta lo mismo (con valores neutros), así que ui.js / sections.js no se rompen.
   ============================================================================ */

const root = document.documentElement;
const $ = (id) => document.getElementById(id);

/* ── Capacidades y modos ─────────────────────────────────────────────────
   gsap y ScrollTrigger son obligatorios para el movimiento. Los demás plugins
   son opcionales: si uno no baja se apaga SOLO ese efecto. */
export const H = {};
['gsap', 'ScrollTrigger', 'SplitText', 'MorphSVGPlugin', 'DrawSVGPlugin', 'Draggable', 'InertiaPlugin', 'CustomEase', 'Lenis']
  .forEach((n) => { H[n] = typeof window[n] !== 'undefined'; });

const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reduce = mql.matches;                      /* valor al cargar; el vivo está en mode.reduced */
export const mode = {
  gsap: !!(H.gsap && H.ScrollTrigger),                  /* hay motor de animación */
  reduced: reduce,                                      /* prefers-reduced-motion (se actualiza en vivo) */
  motion: false                                         /* gsap && !reduced: se puede mover */
};
mode.motion = mode.gsap && !mode.reduced;
export const active = mode.motion;                      /* alias heredado de mode.motion */

/* ── Tokens: el CSS manda, M es su espejo ─────────────────────────────────
   Los valores de respaldo son idénticos a los de css/motion.css; si alguien
   cambia uno de los dos, falla la prueba de paridad (T-1). */
const cs = getComputedStyle(root);
const raw = (n, d) => (cs.getPropertyValue(n).trim() || d);
const num = (n, d) => { const v = parseFloat(raw(n, d)); return isNaN(v) ? parseFloat(d) : v; };
const sec = (n, d) => {                                  /* tiempo → segundos (GSAP) */
  let v = raw(n, d), x = parseFloat(v);
  if (isNaN(x)) { v = d; x = parseFloat(d); }
  return /ms\s*$/.test(v) ? x / 1000 : x;
};
const bez = (n, d) => raw(n, d).replace(/cubic-bezier\(|\)|\s/g, '');   /* ".2,.7,.2,1" */

const hasCE = mode.gsap && H.CustomEase;
export const M = {
  dur: {
    fast: sec('--m-dur-fast', '120ms'), base: sec('--m-dur-base', '180ms'), enter: sec('--m-dur-enter', '280ms'),
    layout: sec('--m-dur-layout', '440ms'), reveal: sec('--m-dur-reveal', '640ms'), focal: sec('--m-dur-focal', '800ms'),
    ring: sec('--m-dur-ring', '1100ms'), count: sec('--m-dur-count', '900ms'), exit: num('--m-exit', '.6')
  },
  dist: {
    d1: num('--m-dist-1', '12px'), d2: num('--m-dist-2', '16px'), d3: num('--m-dist-3', '24px'),
    lift: num('--m-lift', '-6px'), press: num('--m-press', '.97')
  },
  ease: {
    brand: hasCE ? 'saphi' : 'power3.out', exit: hasCE ? 'saphiExit' : 'power2.in', cine: hasCE ? 'saphiCine' : 'power3.inOut', state: 'power1.out',
    bezier: { brand: bez('--m-ease', '.2,.7,.2,1'), exit: bez('--m-ease-exit', '.4,0,1,1'), cine: bez('--m-ease-cine', '.7,0,.15,1') }
  },
  stagger: {
    each: sec('--m-stagger-each', '40ms'), words: sec('--m-stagger-words', '60ms'), lines: sec('--m-stagger-lines', '80ms'),
    max: sec('--m-stagger-max', '240ms'), beat: sec('--m-beat', '280ms')
  },
  io: { revealMargin: raw('--m-reveal-margin', '-12%'), ambientMargin: raw('--m-ambient-margin', '120px') },
  intent: { delay: num('--m-intent', '90ms'), sweep: num('--m-intent-sweep', '140ms'), speed: num('--m-intent-speed', '.6') },
  nav: { hideAfter: num('--m-hide-after', '320'), hideDelta: num('--m-hide-delta', '24'), showDelta: num('--m-show-delta', '8') },
  magnet: { r: num('--m-magnet-r', '120'), k: num('--m-magnet-k', '.3') },
  scrub: num('--m-scrub', '.4'),
  ambient: { idle: num('--m-ambient-idle', '1500ms'), marquee: num('--m-marquee', '40s') },
  travel: { min: sec('--m-travel-min', '700ms'), max: sec('--m-travel-max', '1600ms') }
};

/* Un stagger nunca supera el tope total: each = min(each, max / (n−1)) */
export const stag = (n, each) => {
  const e = each == null ? M.stagger.each : each;
  return { each: Math.min(e, M.stagger.max / Math.max(1, n - 1)) };
};

/* Plugins, curvas de marca y defaults (sin rebote: ninguna curva pasa de 1) */
if (mode.gsap) {
  gsap.registerPlugin(ScrollTrigger);
  if (H.SplitText) gsap.registerPlugin(SplitText);
  if (H.MorphSVGPlugin) gsap.registerPlugin(MorphSVGPlugin);
  if (H.DrawSVGPlugin) gsap.registerPlugin(DrawSVGPlugin);
  if (H.Draggable) gsap.registerPlugin(Draggable);
  if (H.InertiaPlugin) gsap.registerPlugin(InertiaPlugin);
  if (hasCE) {
    gsap.registerPlugin(CustomEase);
    CustomEase.create('saphi', M.ease.bezier.brand);
    CustomEase.create('saphiExit', M.ease.bezier.exit);
    CustomEase.create('saphiCine', M.ease.bezier.cine);
  }
  gsap.defaults({ ease: M.ease.brand, duration: M.dur.reveal });
}

/* ── Loader: capa sólida (sin mosaico) que se desvanece ───────────────────── */
export const loader = $('loader');
export function killLoader() {
  document.body.classList.remove('is-loading');
  if (!loader || loader.dataset.done) return;
  loader.dataset.done = '1';                            /* CSS: html.js #loader[data-done] → opacity 0 */
  const gone = () => { loader.style.display = 'none'; };            /* el nodo se queda (vacío, 0 hijos): herramientas y pruebas lo consultan */
  loader.addEventListener('transitionend', gone, { once: true });
  setTimeout(gone, M.dur.base * 1000 + 80);
}

/* ── Scroll: Lenis solo con movimiento; sin él, scroll nativo ──────────────── */
export let lenis = null;
export function setScroll(v, immediate) {
  if (lenis) lenis.scrollTo(v, { immediate: !!immediate, force: true });
  else window.scrollTo(0, v);
}
function initLenis() {
  if (!H.Lenis) return;
  /* Integración canónica: ScrollTrigger se entera en cada frame de Lenis y el rAF de Lenis
     lo maneja el ticker de GSAP, para que ambos corran en el mismo frame. Sin normalizeScroll
     (pelea con Lenis por el evento de rueda). Ya NO se llama a lenis.stop() esperando a `load`. */
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true, syncTouch: false, touchMultiplier: 1.6
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { if (lenis) lenis.raf(time * 1000); });
  window.__saphiLenis = lenis;                          /* lo lee el listón y la onda de CTA */
  gsap.ticker.lagSmoothing(0);
}

/* ═══ LLEGADAS: un solo IntersectionObserver ═════════════════════════════════
   .m-arrive (CSS) + .m-in (aquí). ScrollTrigger se reserva para scrub y pin. */
const pending = new Set();                              /* nodos aún por revelar */
const revealCb = new WeakMap();
const seen = new WeakSet();
let revealIO = null;

function fireReveal(el, rank) {
  if (!pending.has(el)) return;
  pending.delete(el); revealIO.unobserve(el);
  const cb = revealCb.get(el); revealCb.delete(el);
  let n = 0;
  if (rank) { const p = el.parentNode; n = rank.get(p) || 0; rank.set(p, n + 1); }   /* posición entre hermanos que entran juntos */
  if (cb) cb(el, n);
}
function watch(el, cb) {
  if (!('IntersectionObserver' in window)) { cb(el, 0); return; }
  if (!revealIO) {
    revealIO = new IntersectionObserver((entries) => {
      const rank = new Map();
      entries.forEach((en) => { if (en.isIntersecting) fireReveal(en.target, rank); });
    }, { rootMargin: '0px 0px ' + M.io.revealMargin + ' 0px' });
  }
  pending.add(el); revealCb.set(el, cb); revealIO.observe(el);
}
/* Un IO no avisa de lo que se salta de golpe (ancla lejana, recarga a media página): al
   quedar quieto el scroll se revela lo que ya quedó arriba del viewport. Una pasada, no por tick. */
let sweepTimer = 0;
function sweep() {
  pending.forEach((el) => { const r = el.getBoundingClientRect(); if (r.height && r.bottom < 0) fireReveal(el, null); });
}
function scheduleSweep() { if (pending.size) { clearTimeout(sweepTimer); sweepTimer = setTimeout(sweep, 220); } }

function revealNode(el, rank) {
  if (rank != null && el.style.getPropertyValue('--m-i') === '') el.style.setProperty('--m-i', Math.min(rank, 6));   /* --m-i escrito a mano manda */
  el.classList.add('m-in');
}
/* arrive()            → todos los .m-arrive del documento (menos data-arrive="manual")
   arrive(elemento)    → ese nodo y sus .m-arrive internos
   arrive(NodeList|[]|selector) → esos nodos */
export function arrive(target) {
  let list;
  if (!target) list = document.querySelectorAll('.m-arrive');
  else if (typeof target === 'string') list = document.querySelectorAll(target);
  else if (target.nodeType === 1) list = [target].concat(Array.prototype.slice.call(target.querySelectorAll('.m-arrive')));
  else list = target;
  Array.prototype.forEach.call(list, (el) => {
    if (!el || seen.has(el) || el.classList.contains('m-in') || el.dataset.arrive === 'manual') return;
    seen.add(el);
    watch(el, revealNode);
  });
}
arrive.reveal = (el, rank) => { seen.add(el); if (pending.has(el)) { pending.delete(el); revealIO.unobserve(el); } revealNode(el, rank); };

/* ioReveal(nodos, build): API heredida para la rama móvil; mismo margen que el resto */
export function ioReveal(nodes, build) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      build(en.target);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px ' + M.io.revealMargin + ' 0px' });
  Array.prototype.forEach.call(nodes, (n) => { io.observe(n); });
  return io;
}

/* Titular de sección: máscara por LÍNEA (no letra por letra). Entra una vez, al llegar. */
export function splitHeading(el) {
  if (!mode.gsap || !H.SplitText) return null;          /* sin SplitText el titular queda legible tal cual */
  let shown = false, anim = null;
  const sp = SplitText.create(el, {
    type: 'lines', linesClass: 'split-line', mask: 'lines', autoSplit: true, aria: 'auto',
    onSplit: (self) => {
      if (shown) return;                                /* re-división tras cargar la fuente: ya se vio, queda en su sitio */
      anim = gsap.from(self.lines, {
        yPercent: 118, duration: M.dur.reveal, ease: M.ease.brand,
        stagger: stag(self.lines.length, M.stagger.lines), paused: true
      });
      return anim;
    }
  });
  watch(el, () => { shown = true; if (anim) anim.play(); });
  return sp;
}

/* ═══ AMBIENTE: ningún bucle corre fuera de pantalla, con la pestaña oculta ni con reduce ═══
   ambient(host, fuente, { margin })
     host    Element cuya visibilidad gobierna el bucle (null = solo la pestaña)
     fuente  · función que CREA el bucle y devuelve algo con play()/pause() (tween o timeline de
               GSAP, Animation de WAAPI) o con start()/stop() (bucle WebGL propio). Se llama
               perezosamente la primera vez que el host es visible, nunca con reduce;
             · el propio objeto { start, stop } / { play, pause };
             · nada: el bucle es CSS ([data-ambient]) y solo se conmuta la clase .is-live.
   Devuelve { start, stop, destroy, live, running, instance }. */
const ambientSet = new Set();
export function ambient(host, source, opt) {
  opt = opt || {};
  let inst = null, live = !host, enabled = true, running = false, dead = false, io = null;
  const canRun = () => enabled && live && !document.hidden && !mode.reduced && !dead;
  const playInst = (i) => { if (i.play) i.play(); else if (i.start) i.start(); };
  const pauseInst = (i) => { if (!i) return; if (i.pause) i.pause(); else if (i.stop) i.stop(); };
  function sync() {
    if (dead) return;
    const go = canRun();
    if (source == null) { if (host) host.classList.toggle('is-live', go); return; }
    if (go && !running) {
      if (!inst) {
        inst = typeof source === 'function' ? source() : source;
        if (inst && typeof source === 'function') pauseInst(inst);   /* un tween recién creado ya corre: lo gobierna sync() */
      }
      if (inst) { playInst(inst); running = true; }
    } else if (!go && running) { pauseInst(inst); running = false; }
  }
  if (host && 'IntersectionObserver' in window) {
    io = new IntersectionObserver((es) => { live = es[es.length - 1].isIntersecting; sync(); },
                                  { rootMargin: opt.margin || M.io.ambientMargin });
    io.observe(host);
  }
  const handle = {
    start() { enabled = true; sync(); },
    stop() { enabled = false; sync(); },
    destroy() {
      dead = true; if (io) io.disconnect(); ambientSet.delete(handle);
      if (inst) { pauseInst(inst); const k = inst.kill || inst.cancel || inst.destroy; if (k) k.call(inst); }
      if (host && source == null) host.classList.remove('is-live');
      running = false; inst = null;
    },
    get live() { return live; },
    get running() { return running; },
    get instance() { return inst; },
    _sync: sync
  };
  ambientSet.add(handle);
  sync();
  return handle;
}
document.addEventListener('visibilitychange', () => { ambientSet.forEach((h) => h._sync()); });

/* Bucles CSS: un IO compartido pone .is-live a los [data-ambient] visibles */
const cssHosts = new WeakMap();
let cssIO = null;
function cssSync(el) { el.classList.toggle('is-live', !!cssHosts.get(el) && !document.hidden && !mode.reduced); }
ambient.css = (scope) => {
  if (!('IntersectionObserver' in window)) return;
  if (!cssIO) {
    cssIO = new IntersectionObserver((es) => { es.forEach((en) => { cssHosts.set(en.target, en.isIntersecting); cssSync(en.target); }); },
                                     { rootMargin: M.io.ambientMargin });
  }
  Array.prototype.forEach.call((scope || document).querySelectorAll('[data-ambient]'), (el) => {
    if (!cssHosts.has(el)) { cssHosts.set(el, false); cssIO.observe(el); }
  });
};
document.addEventListener('visibilitychange', () => {
  Array.prototype.forEach.call(document.querySelectorAll('[data-ambient]'), (el) => { if (cssHosts.has(el)) cssSync(el); });
});

/* ═══ PULSO VIAJERO ══════════════════════════════════════════════════════════
   Clona un trazo ya dibujado y hace correr por él un paquete de luz. Por defecto en
   bucle, pero gobernado por ambient() (se pausa fuera de pantalla). Con { once:true }
   hace UNA pasada (es lo que pide «Las 23:07») y se apaga. */
export function makePulse(sourcePath, dur, opts) {
  if (!sourcePath || !mode.gsap) return null;
  opts = opts || {};
  /* Idempotente: un contexto de breakpoint (mm.add) vuelve a llamar a makePulse cada vez que se cruza el umbral; sin esto
     cada vuelta a escritorio dejaba un clon más (.line-pulse 1 → 3 tras 1440→800→1440→800→1440). */
  Array.prototype.slice.call(sourcePath.parentNode.querySelectorAll('.line-pulse')).forEach((g) => {
    if (g.__pulseOf === sourcePath) { gsap.killTweensOf(g); g.remove(); }
  });
  const ghost = sourcePath.cloneNode(false);
  ghost.removeAttribute('id');
  ghost.setAttribute('class', 'line-pulse');
  ghost.__pulseOf = sourcePath;
  sourcePath.parentNode.appendChild(ghost);
  const L = ghost.getTotalLength();
  gsap.set(ghost, { strokeDasharray: (L * 0.07) + ' ' + L, strokeDashoffset: 0 });
  return function start() {
    if (opts.once) {
      return gsap.timeline()
        .to(ghost, { opacity: 0.85, duration: M.dur.enter })
        .to(ghost, { strokeDashoffset: -(L * 1.07), duration: dur, ease: 'none' }, 0)
        .to(ghost, { opacity: 0, duration: M.dur.enter }, '>-' + M.dur.enter);
    }
    gsap.to(ghost, { opacity: 0.85, duration: M.dur.reveal });
    return ambient(sourcePath.ownerSVGElement || sourcePath,
      () => gsap.to(ghost, { strokeDashoffset: -(L * 1.07), duration: dur, ease: 'none', repeat: -1 }));
  };
}

/* Un error en un efecto jamás debe tumbar a los que siguen */
export function safe(name, fn) {
  try { fn(); } catch (e) {
    if (window.console && console.warn) console.warn('[fx:' + name + ']', e);
  }
}

/* matchMedia de GSAP: cada módulo registra sus contextos con mm.add. Sin GSAP, un sustituto
   inerte (no hay movimiento que registrar). */
export const mm = mode.gsap ? gsap.matchMedia() : { add() { return null; }, revert() {}, kill() {} };

/* ═══ CONTADORES ═══════════════════════════════════════════════════════════
   Los del hero los dispara el intro; los demás, un IO al llegar. Con reduce o sin GSAP
   se escribe el valor final de golpe. El cuarto del hero («0») no cuenta: es un cero fijo. */
function countTo(el) {
  if (el.dataset.counted) return;
  el.dataset.counted = '1';
  const target = parseInt(el.getAttribute('data-count'), 10);
  if (isNaN(target)) return;
  const sfx = el.getAttribute('data-suffix') || '';
  if (!mode.motion) { el.textContent = target + sfx; return; }
  const o = { v: 0 };
  gsap.to(o, {
    v: target, duration: M.dur.count, ease: M.ease.brand,
    onUpdate: () => { el.textContent = Math.round(o.v) + sfx; },
    onComplete: () => { el.textContent = target + sfx; }
  });
}
export const counters = {
  run: countTo,
  /* valor final de golpe (reduce, sin GSAP, o cuando el intro se salta) */
  final(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-count]'), (el) => {
      el.dataset.counted = '1';
      el.textContent = parseInt(el.getAttribute('data-count'), 10) + (el.getAttribute('data-suffix') || '');
    });
  },
  watch(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-count]'), (el) => {
      if (el.dataset.counted || el.closest('#hero')) return;       /* los del hero los lleva el intro */
      watch(el, countTo);
    });
  }
};

/* ═══ TEMA, SECCIÓN ACTIVA, HEADER Y PROGRESO ═════════════════════════════
   Un solo manejador de scroll, sin lecturas de geometría: las posiciones se cachean
   en refresh / resize / cambio de alto del documento y por tick solo se hace aritmética. */
const DARK  = { bg: '#0A0A0A', ink: '#EDEAF3', ink50: '#8B849B', ink25: '#3A3448', line: '#2A2634', panel: '#111014', header: 'rgba(10,10,10,0.92)' };
const LIGHT = { bg: '#F7F0E8', ink: '#0A0A0A', ink50: '#6E655C', ink25: '#CFC2B1', line: '#E3D8CA', panel: '#FFFFFF', header: 'rgba(247,240,232,0.92)' };
const VAR = { bg: '--bg', ink: '--ink', ink50: '--ink-50', ink25: '--ink-25', line: '--line', panel: '--panel', header: '--header-bg' };

/* Mezcla de color propia (hex y rgba): el tema funciona también sin GSAP */
function parseColor(c) {
  if (c.charAt(0) === '#') { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  const m = c.match(/[\d.]+/g).map(Number);
  return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
}
function mixer(a, b) {
  const A = parseColor(a), B = parseColor(b), alpha = A[3] !== 1 || B[3] !== 1;
  return (t) => {
    const r = Math.round(A[0] + (B[0] - A[0]) * t), g = Math.round(A[1] + (B[1] - A[1]) * t), bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return alpha ? 'rgba(' + r + ',' + g + ',' + bl + ',' + (A[3] + (B[3] - A[3]) * t).toFixed(3) + ')' : 'rgb(' + r + ',' + g + ',' + bl + ')';
  };
}
const mixers = {};
Object.keys(VAR).forEach((k) => { mixers[k] = mixer(DARK[k], LIGHT[k]); });

const rootStyle = root.style;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lightZone = $('lightZone');
const header = $('siteHeader');
const progressEl = $('progress');
const secIndexEls = Array.prototype.slice.call(document.querySelectorAll('.sec-index i'));

let vh = window.innerHeight, docMax = 1, zoneTop = 0, zoneBottom = 0;   /* geometría cacheada */
let lastL = -1, lastY = window.scrollY, stuck = false, hidden = false, acc = 0, holdUntil = 0, measureQueued = false;
let setProgress = (v) => { if (progressEl) progressEl.style.transform = 'scaleX(' + v + ')'; };

function applyTheme(L) {
  if (Math.abs(L - lastL) <= 0.002) return;
  lastL = L;
  for (const k in VAR) rootStyle.setProperty(VAR[k], mixers[k](L));
}
function lightAt(y) {
  if (!lightZone) return 0;
  const top = zoneTop - y, bottom = zoneBottom - y;
  const enter = clamp01((vh * 0.88 - top) / (vh * 0.5));
  const exit = clamp01((vh * 0.62 - bottom) / (vh * 0.5));
  return clamp01(enter - exit);
}
/* La única lectura de geometría: una vez por refresh/resize, no por tick */
function measure() {
  measureQueued = false;
  const y = window.scrollY;
  vh = window.innerHeight;
  docMax = Math.max(1, root.scrollHeight - vh);
  if (lightZone) { const r = lightZone.getBoundingClientRect(); zoneTop = r.top + y; zoneBottom = r.bottom + y; }
  applyTheme(lightAt(y));
  setProgress(clamp01(y / docMax));
}
function scheduleMeasure() { if (!measureQueued) { measureQueued = true; requestAnimationFrame(measure); } }

const menuOpen = () => { const o = $('navOverlay'); return !!(o && o.classList.contains('open')); };
function setHidden(h) {
  if (h) {
    if (!header || mode.reduced || menuOpen() || performance.now() < holdUntil) return;
    if (header.contains(document.activeElement)) return;           /* foco dentro: no se esconde (2.4.11) */
  }
  if (h === hidden || !header) return;
  hidden = h;
  header.classList.toggle('is-hidden', h);
}
/* Header por intención: se esconde tras 320 px y 24 px acumulados hacia abajo; vuelve con 8 px hacia arriba */
function headerIntent(y, dy) {
  const st = y > 40;
  if (st !== stuck && header) { stuck = st; header.classList.toggle('stuck', st); }
  if (y <= M.nav.hideAfter) { acc = 0; setHidden(false); return; }
  if (dy > 0) acc = acc > 0 ? acc + dy : dy; else if (dy < 0) acc = acc < 0 ? acc + dy : dy;
  if (acc >= M.nav.hideDelta) setHidden(true);
  else if (acc <= -M.nav.showDelta) setHidden(false);
}
function onScroll() {
  const y = window.scrollY, dy = y - lastY;
  if (dy === 0) return;
  lastY = y;
  applyTheme(lightAt(y));
  setProgress(clamp01(y / docMax));
  headerIntent(y, dy);
  scheduleSweep();
}
export const headerApi = {
  show() { acc = 0; setHidden(false); },
  hide() { setHidden(true); },
  /* mantiene el header visible durante ms (viaje a un ancla) */
  hold(ms) { holdUntil = performance.now() + (ms || 0); setHidden(false); }
};

/* Sección activa: un IO sobre las secciones con data-sec (franja delgada al 45 % de la altura) */
let currentSection = null;
function syncNav() {
  let target = currentSection;
  if (target === 'voz') { const p = document.querySelector('.ag-panel[aria-current="true"]'); target = p ? p.id : 'voz'; }
  Array.prototype.forEach.call(document.querySelectorAll('.nav-links a, .ov-item'), (a) => {
    const on = a.getAttribute('href') === '#' + target;
    if (a.closest('.nav-links')) a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
}
function setSection(id) {
  if (id === currentSection) return;
  currentSection = id;
  secIndexEls.forEach((n) => { n.classList.toggle('on', n.getAttribute('data-sec') === id); });
  syncNav();
  document.dispatchEvent(new CustomEvent('saphi:section', { detail: { id } }));
}
function initSections() {
  const secs = Array.prototype.slice.call(document.querySelectorAll('main [data-sec]'));
  if (!secs.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => {
    let id = null;
    es.forEach((en) => { if (en.isIntersecting) id = en.target.getAttribute('data-sec'); });
    if (id) setSection(id);
  }, { rootMargin: '-45% 0px -54% 0px' });
  secs.forEach((el) => { io.observe(el); });
  document.addEventListener('ag:active', () => { requestAnimationFrame(syncNav); });   /* el acordeón avisa qué panel quedó abierto */
}

/* ═══ INTRO «PRIMER TIMBRE» (solo con movimiento) ═══════════════════════════
   Un timbre (anillo) → «Atiende a todos.» responde en máscara → pausa de 280 ms →
   «Siempre.» responde como un corte de izquierda a derecha → subtítulo y CTA.
   Sin blur, sin mosaico, sin brillo infinito. Cualquier gesto lo salta. */
export const heroTl = mode.gsap
  ? gsap.timeline({ paused: true })
  : { isActive: () => false, progress: () => 1, totalProgress: () => 1, paused: () => true, play() { return this; }, pause() { return this; }, eventCallback() { return this; }, kill() {} };
export const heroBlobs = Array.prototype.slice.call(document.querySelectorAll('.hero-blobs .blob'));   /* siempre vacío: código muerto conservado por contrato */
export const haloNodes = Array.prototype.slice.call(document.querySelectorAll('#blobDefs feDropShadow')); /* idem */

const heroState = { running: false, done: false, shown: false };
const heroItems = () => Array.prototype.slice.call(document.querySelectorAll('#hero [data-arrive="manual"]'));
const RAMP_END = '#D3C8F6';
const RAMP = ['#8B6DE8', RAMP_END];                              /* degradado de marca de «Siempre.», letra por letra */
const CLIP_HIDE = 'inset(-30% 100% -30% -10%)', CLIP_SHOW = 'inset(-30% -10% -30% -10%)';
const SKIP_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
let skipIntro = null, heroMasks = [], heroWords = [], heroSplit = null;

/* Se parte el titular al EVALUAR el módulo (como en el original), no al arrancar el intro: ui.js y sections.js
   (efecto de peso por letra) buscan #heroDisplay .char en su propia evaluación. El titular sigue oculto por CSS
   (html.js:not(.m-hero-in)) hasta que arranca el intro; las palabras se colocan entonces, en el mismo tick. */
function prepareHero() {
  const display = $('heroDisplay');
  if (!mode.motion || !display || !H.SplitText) return;
  try {
    heroSplit = SplitText.create(display, { type: 'words,chars', mask: 'words', wordsClass: 'word', charsClass: 'char', aria: 'auto' });
    heroWords = heroSplit.words; heroMasks = heroSplit.masks || [];
  } catch (e) { heroSplit = null; if (window.console && console.warn) console.warn('[fx:hero-split]', e); }
}
/* colores finales de «Siempre.» (sin animar): para el camino sin intro o tras un fallo */
function finalRamp() {
  if (!mode.gsap) return;
  const g = document.querySelector('#heroDisplay .grad-chars'); if (!g) return;
  const cs = g.querySelectorAll('.char'), ramp = gsap.utils.interpolate(RAMP);
  cs.forEach((c, i) => { c.style.color = ramp(cs.length > 1 ? i / (cs.length - 1) : 0); });
}

/* Espera a las fuentes con tope: el intro arranca en fonts.ready o a los 1,200 ms desde el inicio de la
   navegación, lo que ocurra primero. La hoja de Google Fonts llega async (preload + onload): se espera
   a que se aplique antes de preguntar por las caras. */
function fontsReady(cap) {
  return new Promise((resolve) => {
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    const left = cap - performance.now();
    if (left <= 0 || !document.fonts || !document.fonts.load) { fin(); return; }
    setTimeout(fin, left);
    const go = () => {
      Promise.all([document.fonts.load('600 1em "Instrument Sans"'), document.fonts.load('400 1em "Instrument Sans"')])
        .then(() => document.fonts.ready).then(fin, fin);
    };
    const link = document.querySelector('link[data-fonts]');
    if (link && link.hasAttribute('data-err')) { fin(); return; }                 /* la hoja falló antes de que llegáramos (onerror en el marcado) */
    if (!link || (link.rel === 'stylesheet' && link.sheet)) { go(); return; }
    link.addEventListener('load', () => { if (link.rel === 'stylesheet' && link.sheet) go(); });
    link.addEventListener('error', fin);
  });
}

function revealHero(list) { list.forEach((el) => { arrive.reveal(el); }); }
function heroCounterNodes() { return Array.prototype.slice.call(document.querySelectorAll('#hero [data-count]')); }

/* Sin movimiento (reduce, sin GSAP) o si algo falló: titular a fundido, subtítulo y CTA a +120 ms */
function heroStatic() {
  if (heroState.shown && !heroState.running) return;
  root.classList.add('m-hero-in');
  killLoader();
  const ring = $('heroRing'); if (ring) ring.remove();             /* sin timbre: ni el nodo */
  const items = heroItems();
  const sub = items.filter((e) => e.classList.contains('hero-sub'));
  const cta = items.filter((e) => e.classList.contains('hero-cta'));
  const rest = items.filter((e) => sub.indexOf(e) < 0 && cta.indexOf(e) < 0);
  finalRamp();
  revealHero(sub);
  setTimeout(() => revealHero(cta), 120);
  setTimeout(() => { revealHero(rest); counters.final(document.getElementById('hero')); }, 200);
  heroState.shown = true;
}

function finishIntro() {
  if (heroState.done) return;
  heroState.done = true; heroState.running = false;
  if (skipIntro) SKIP_EVENTS.forEach((ev) => window.removeEventListener(ev, skipIntro));
  revealHero(heroItems());
  if (mode.gsap) {
    if (heroWords.length) gsap.set(heroWords, { clearProps: 'transform,clipPath' });
    if (document.querySelector('.hero-silk')) gsap.set('.hero-silk', { clearProps: 'opacity' });
  }
  heroMasks.forEach((m) => { m.style.overflow = 'visible'; });      /* la máscara solo hacía falta al entrar */
  const ring = $('heroRing'); if (ring) ring.remove();
  root.classList.remove('m-intro');
  root.classList.add('m-hero-done');
  heroCounterNodes().forEach(countTo);
  document.dispatchEvent(new CustomEvent('saphi:intro-done'));
  /* una sola pasada de refresh con el titular asentado: lo que cachea geometría en 'refresh' (peso por letra) ya la ve bien */
  if (mode.gsap) setTimeout(() => { ScrollTrigger.refresh(); }, 60);
}

function startIntro() {
  const display = $('heroDisplay'), ring = $('heroRing'), silk = document.querySelector('.hero-silk');
  const items = heroItems();
  const sub = items.filter((e) => e.classList.contains('hero-sub'));
  const cta = items.filter((e) => e.classList.contains('hero-cta'));
  const rest = items.filter((e) => sub.indexOf(e) < 0 && cta.indexOf(e) < 0);
  const E = M.ease;
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const tl = heroTl;

  heroState.running = true; heroState.shown = true;
  root.classList.add('m-intro');
  killLoader();                                                    /* t = 0: el loader se desvanece */

  let w1 = [], w2 = null, c2 = [];
  if (!heroSplit) prepareHero();
  if (display && heroSplit) {
    heroSplit.words.forEach((w) => { if (w.closest('.grad-chars')) w2 = w; else w1.push(w); });
    if (w2) c2 = Array.prototype.slice.call(w2.querySelectorAll('.char'));
    if (ring) {                                                    /* se mide ANTES de mover las palabras: el timbre nace en el arranque de la primera línea */
      const pr = ring.parentElement.getBoundingClientRect();
      const fr = (heroMasks[0] || w1[0] || display).getBoundingClientRect();
      gsap.set(ring, { x: fr.left - pr.left + 24, y: fr.top - pr.top + fr.height * 0.35, scale: 0.12, opacity: 0 });
    }
    gsap.set(w1, { yPercent: 130 });
    if (w2) { gsap.set(w2, { clipPath: CLIP_HIDE }); gsap.set(c2, { color: RAMP_END }); }
  } else if (display) {
    gsap.set(display, { opacity: 0, y: M.dist.d2 });
  }
  if (silk) gsap.set(silk, { opacity: 0 });
  root.classList.add('m-hero-in');                                 /* se libera el titular en el mismo tick que la división */

  const ramp = gsap.utils.interpolate(RAMP);
  const n1 = Math.max(1, w1.length), each = stag(n1, M.stagger.words).each;
  const P1 = 0.36;                                                 /* respuesta 1 */
  const P2 = P1 + M.dur.reveal * 0.55 + (n1 - 1) * each + M.stagger.beat;   /* respuesta 2, tras la pausa del timbre */

  tl.clear();
  tl.eventCallback('onComplete', finishIntro);
  if (silk) tl.to(silk, { opacity: 1, duration: M.dur.reveal, ease: E.brand }, 0);
  if (ring) {
    tl.to(ring, { scale: 1, duration: M.dur.ring, ease: E.cine }, 0.12)
      .to(ring, { opacity: 0.85, duration: 0.1, ease: 'none' }, 0.12)
      .to(ring, { opacity: 0, duration: 0.62, ease: E.exit }, 0.5);
  }
  if (w1.length) tl.to(w1, { yPercent: 0, duration: M.dur.reveal, ease: E.brand, stagger: each }, P1);
  else if (display) tl.to(display, { opacity: 1, y: 0, duration: M.dur.reveal, ease: E.brand }, P1);
  if (w2) tl.to(w2, { clipPath: CLIP_SHOW, duration: M.dur.focal, ease: E.cine }, P2);
  if (c2.length) tl.to(c2, { color: (i) => ramp(c2.length > 1 ? i / (c2.length - 1) : 0), duration: M.dur.reveal, ease: E.brand, stagger: { amount: 0.24 } }, P2 + 0.1);
  tl.call(() => revealHero(sub), null, P2 + 0.05)
    .call(() => revealHero(cta), null, P2 + 0.13)
    .call(() => { revealHero(rest); heroCounterNodes().forEach(countTo); }, null, P2 + 0.21);
  if (mobile) tl.timeScale(1.15);                                  /* misma secuencia, un poco más corta */

  /* Cualquier entrada del usuario salta el intro (≤100 ms) */
  skipIntro = () => { if (!heroState.done) { if (tl.progress() < 1) tl.progress(1); else finishIntro(); } };
  SKIP_EVENTS.forEach((ev) => window.addEventListener(ev, skipIntro, { passive: true }));

  /* Recarga a media página o ancla lejana: el hero no se ve, no hay nada que actuar */
  if (window.scrollY > window.innerHeight * 0.6) tl.progress(1);
  else tl.play(0);
}

/* Sin movimiento no se espera a nadie (ni a las fuentes ni a gl.js): el hero sale en cuanto hubo un cuadro */
function heroStaticSoon() {
  let fired = false;
  const go = () => { if (!fired) { fired = true; heroStatic(); } };
  requestAnimationFrame(() => requestAnimationFrame(go));
  setTimeout(go, 120);
}
let booted = false;
function bootHero() {
  if (!mode.motion) { booted = true; heroStaticSoon(); }
  const run = () => {
    if (booted) return;
    booted = true;
    fontsReady(1200).then(() => {
      if (heroState.shown) return;                                 /* la red de seguridad de 3 s ya liberó el hero */
      try { startIntro(); } catch (e) {
        if (window.console && console.warn) console.warn('[fx:hero]', e);
        heroStatic();
        finishIntro();
      }
    });
  };
  /* Los módulos corren antes de DOMContentLoaded: se espera a que todos (también gl.js, que compila shaders)
     hayan terminado para que el intro no arranque justo antes de una tarea larga */
  if (document.readyState === 'complete') run();
  else { document.addEventListener('DOMContentLoaded', run, { once: true }); window.addEventListener('load', run, { once: true }); }
  /* red de seguridad: si por lo que sea el hero no salió, se libera a los 3 s (el script temprano quita html.js a los 4 s) */
  setTimeout(() => { if (!root.classList.contains('m-hero-in')) heroStatic(); }, 3000);
}

/* ═══ ARRANQUE ═══════════════════════════════════════════════════════════════ */

/* Estado: corre SIEMPRE (con GSAP, sin GSAP, con reduce) */
function initState() {
  root.classList.add('m-ready');
  if (mode.reduced) root.classList.add('m-reduced');
  if (!mode.gsap) root.classList.add('m-nogsap');

  /* progreso: quickSetter si hay GSAP, escritura directa si no */
  if (progressEl && mode.gsap) setProgress = gsap.quickSetter(progressEl, 'scaleX');

  /* tema + progreso + header, con geometría cacheada */
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('load', () => { scheduleMeasure(); setTimeout(sweep, 400); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);
  if (mode.gsap) ScrollTrigger.addEventListener('refresh', scheduleMeasure);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMeasure).observe(document.body);
  if (header) header.addEventListener('focusin', () => { acc = 0; setHidden(false); });

  initSections();
  arrive();
  ambient.css();

  /* Plan B del acordeón: si accordion.js no llegó a los 4.5 s (red caída, error), los paneles se quedarían en el estado de
     site.css con el cuerpo oculto (la copia de producto invisible). html.m-noag los pasa a lista apilada; si el módulo llega
     tarde, quita la clase y toma el control (js/accordion.js). */
  setTimeout(() => { const r = $('agRow'); if (r && !r.classList.contains('ag-live')) root.classList.add('m-noag'); }, 4500);
  if (mode.motion) counters.watch(); else counters.final(document.querySelector('main'));

  /* preferencia de movimiento en vivo: se apaga lo que se mueve; la página sigue funcional */
  const onPref = (e) => {
    mode.reduced = e.matches;
    mode.motion = mode.gsap && !e.matches;
    root.classList.toggle('m-reduced', e.matches);
    if (e.matches) {
      if (lenis) { lenis.destroy(); lenis = null; window.__saphiLenis = undefined; }
      if (heroState.running) { try { heroTl.progress(1); } catch (er) { /* sin timeline */ } }
      setHidden(false);
    }
    ambientSet.forEach((h) => h._sync());
    Array.prototype.forEach.call(document.querySelectorAll('[data-ambient]'), (el) => { if (cssHosts.has(el)) cssSync(el); });
    document.dispatchEvent(new CustomEvent('saphi:mode', { detail: { reduced: mode.reduced, motion: mode.motion } }));
  };
  if (mql.addEventListener) mql.addEventListener('change', onPref); else if (mql.addListener) mql.addListener(onPref);
}

/* Movimiento: solo con GSAP y sin reduce */
function initMotion() {
  initLenis();
  prepareHero();
  bootHero();
}

initState();
if (mode.motion) initMotion(); else bootHero();

/* ── Superficie global para el resto del equipo ──────────────────────────────
   (window.__saphiLenis ya lo publica initLenis, igual que el original) */
export const tokens = { DARK, LIGHT, VAR };
window.SAPHI = {
  M, stag, ambient, arrive, counters, mode, tokens,
  H, setScroll, heroTl, mm, safe,
  io: ioReveal, splitHeading, makePulse, killLoader, header: headerApi,
  get section() { return currentSection; }
};
Object.defineProperty(window.SAPHI, 'reduced', { get() { return mode.reduced; }, enumerable: true });
Object.defineProperty(window.SAPHI, 'lenis', { get() { return lenis; }, enumerable: true });
