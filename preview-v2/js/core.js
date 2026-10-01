/* ============================================================================
   js/core.js — MOTOR COMPARTIDO (propietario: core)
   Origen: script principal del original (1455-2766), tramos de core. Ver js/CONTRATO.md.

   El cuerpo vive en una IIFE (igual que el original) para conservar EXACTO el
   alcance de las variables. Lo unico nuevo es el pegamento: el `return {…}` del
   final, los `export` y window.SAPHI. Si no hay GSAP o hay movimiento reducido
   (plan B), la IIFE devuelve { active:false } y ui.js / sections.js no hacen nada.
   ============================================================================ */
var C = (function () {
'use strict';

/* ── Detección de capacidades ────────────────────────────────
   gsap y ScrollTrigger son obligatorios. Los demás plugins son
   opcionales: si uno no baja del CDN se apaga SOLO ese efecto y
   el resto del sitio sigue vivo. Un único `if` gigante haría que
   un 404 en DrawSVG dejara la página estática. */
var H = {};
['gsap','ScrollTrigger','SplitText','MorphSVGPlugin','DrawSVGPlugin','Draggable','InertiaPlugin','CustomEase','Lenis']
  .forEach(function (n) { H[n] = typeof window[n] !== 'undefined'; });

var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var core = H.gsap && H.ScrollTrigger;
var loader = document.getElementById('loader');

function killLoader() {
  if (!loader) return;
  loader.dataset.done = '1';
  loader.style.display = 'none';
  document.body.classList.remove('is-loading');
}

/* ── PLAN B: sin GSAP o con movimiento reducido ──────────── */
if (!core || reduce) {
  killLoader();
  document.querySelectorAll('.js-fade, .js-words, .js-hero').forEach(function (el) { el.style.opacity = 1; });
  document.querySelectorAll('.hairline-svg line').forEach(function (el) { el.style.stroke = 'var(--ink-25)'; });
  document.querySelectorAll('[data-count]').forEach(function (el) {
    el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
  });
  return { active: false, H: H, reduce: reduce, killLoader: killLoader }; /* GLUE: en el original era `return;` */
}

gsap.registerPlugin(ScrollTrigger);
if (H.SplitText) gsap.registerPlugin(SplitText);
if (H.MorphSVGPlugin) gsap.registerPlugin(MorphSVGPlugin);
if (H.DrawSVGPlugin) gsap.registerPlugin(DrawSVGPlugin);
if (H.Draggable) gsap.registerPlugin(Draggable);
if (H.InertiaPlugin) gsap.registerPlugin(InertiaPlugin);
if (H.CustomEase) gsap.registerPlugin(CustomEase);

/* ── M1: una sola curva de marca ─────────────────────────────
   Salida muy rápida con un pelo de overshoot al final. Todo el
   sitio se mueve con esta curva; los power3/expo genéricos se
   quedan solo donde hace falta un frenado más largo. */
if (H.CustomEase) {
  CustomEase.create('gk', 'M0,0 C0.12,0 0.14,0.62 0.31,0.86 0.44,1.04 0.6,1.02 0.74,1.005 0.86,0.995 0.92,1 1,1');
  gsap.defaults({ ease: 'gk', duration: 0.8 });
} else {
  gsap.defaults({ ease: 'power3.out', duration: 0.8 });
}

/* ═══ LENIS ═══════════════════════════════════════════════
   Integración canónica: ScrollTrigger se entera en cada frame de
   Lenis, y el rAF de Lenis lo maneja el ticker de GSAP para que
   ambos corran en el mismo frame. Sin normalizeScroll: pelea con
   Lenis porque los dos quieren dueño del evento de rueda. */
var lenis = null;
if (H.Lenis) {
  lenis = new Lenis({
    duration: 1.15,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.6
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  window.__saphiLenis = lenis; /* expuesto para la onda de CTA */
  gsap.ticker.lagSmoothing(0);
}
function setScroll(v, immediate) {
  if (lenis) lenis.scrollTo(v, { immediate: !!immediate, force: true });
  else window.scrollTo(0, v);
}

/* ═══ MOTOR DE TEMA ═══════════════════════════════════════
   Toda la hoja usa variables semánticas (--bg, --ink, --line…).
   Aquí se interpolan entre el set oscuro y el crema con UN solo
   escalar L, calculado de la geometría de #lightZone en cada
   tick. No hay onEnter/onLeave por sección, así que no puede
   haber carreras entre bloques contiguos: gana la geometría.
   Los tintes de producto y del cierre NO pasan por aquí — cada
   bloque lleva su propio background-color, que además es lo que
   lo hace ocluir a la tarjeta anterior en el apilado. */
var DARK  = { bg:'#0A0A0A', ink:'#EDEAF3', ink50:'#8B849B', ink25:'#3A3448', line:'#2A2634', panel:'#111014', header:'rgba(10,10,10,0.82)' };
var LIGHT = { bg:'#F7F0E8', ink:'#0A0A0A', ink50:'#6E655C', ink25:'#CFC2B1', line:'#E3D8CA', panel:'#FFFFFF', header:'rgba(247,240,232,0.85)' };
var VAR = { bg:'--bg', ink:'--ink', ink50:'--ink-50', ink25:'--ink-25', line:'--line', panel:'--panel', header:'--header-bg' };
var mixers = {};
Object.keys(VAR).forEach(function (k) { mixers[k] = gsap.utils.interpolate(DARK[k], LIGHT[k]); });

var rootStyle = document.documentElement.style;
var lightZone = document.getElementById('lightZone');
var clamp01 = gsap.utils.clamp(0, 1);
var lastL = -1, lastGrain = '', lastV = -1;

function applyTheme(L, grainBoost) {
  if (Math.abs(L - lastL) > 0.002) {
    lastL = L;
    Object.keys(VAR).forEach(function (k) { rootStyle.setProperty(VAR[k], mixers[k](L)); });
  }
  /* P6 — el grano baja en zona clara y sube con la velocidad */
  var g = (0.038 + (0.02 - 0.038) * L + grainBoost * 0.032).toFixed(4);
  if (g !== lastGrain) { lastGrain = g; rootStyle.setProperty('--grain-op', g); }
}

function lightProgress() {
  if (!lightZone) return 0;
  var r = lightZone.getBoundingClientRect(), vh = window.innerHeight;
  var enter = clamp01((vh * 0.88 - r.top) / (vh * 0.5));
  var exit  = clamp01((vh * 0.62 - r.bottom) / (vh * 0.5));
  return clamp01(enter - exit);
}

/* ═══ OBSERVADOR GLOBAL ═══════════════════════════════════
   Un solo ScrollTrigger resuelve tema, grano, barra de progreso,
   link activo, índice lateral y la velocidad que alimenta skew y
   halos. En móvil esto es prácticamente el único trigger que
   existe — así se cumple el tope de ~10 sin renunciar a nada. */
var progressEl = document.getElementById('progress');
var secIndex = Array.prototype.slice.call(document.querySelectorAll('.sec-index i'));
var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
var velo = { v: 0 };
var haloNodes = Array.prototype.slice.call(document.querySelectorAll('#blobDefs feDropShadow'));
var heroBlobs = Array.prototype.slice.call(document.querySelectorAll('.hero-blobs .blob'));

ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: function (self) {
    var vmag = Math.min(1, Math.abs(self.getVelocity()) / 2600);
    velo.v = vmag;
    applyTheme(lightProgress(), vmag);
    gsap.set(progressEl, { scaleX: self.progress });

    /* Halo (P5) y estiramiento (G4) solo cuando la velocidad cambió
       de verdad: tocar un atributo de filtro SVG obliga a rasterizar
       de nuevo, así que escribirlo con el scroll quieto es caro y
       además invisible. */
    if (Math.abs(vmag - lastV) > 0.02) {
      lastV = vmag;
      for (var h = 0; h < haloNodes.length; h++) {
        haloNodes[h].setAttribute('flood-opacity', (0.4 + vmag * 0.45).toFixed(3));
      }
      for (var b = 0; b < heroBlobs.length; b++) {
        gsap.set(heroBlobs[b], { scaleY: 1 + vmag * 0.28, scaleX: 1 - vmag * 0.12 });
      }
    }

    /* Link activo + índice lateral, en el mismo barrido */
    var mid = window.innerHeight * 0.45, activeId = null;
    for (var i = 0; i < secIndex.length; i++) {
      var sec = document.getElementById(secIndex[i].getAttribute('data-sec'));
      if (!sec) continue;
      var r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { activeId = secIndex[i].getAttribute('data-sec'); break; }
    }
    secIndex.forEach(function (n) { n.classList.toggle('on', n.getAttribute('data-sec') === activeId); });
    navAnchors.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + activeId); });
  }
});

/* ── Header: borde al despegar + se esconde al bajar ─────── */
var header = document.getElementById('siteHeader');
var navHidden = false;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: function (self) {
    header.classList.toggle('stuck', self.scroll() > 40);
    if (document.getElementById('navOverlay').classList.contains('open')) return;
    var hide = self.direction === 1 && self.scroll() > 320;
    if (hide === navHidden) return;
    navHidden = hide;
    gsap.to(header, { yPercent: hide ? -130 : 0, duration: 0.45, overwrite: true });
  }
});

/* ═══ M8: INTRO de 6 columnas ═════════════════════════════ */
var heroTl = gsap.timeline({ paused: true });

function buildHero() {
  var display = document.getElementById('heroDisplay');
  if (!display) return;

  var chars;
  if (H.SplitText) {
    /* Sin mask: los caracteres llegan desde ±60vw y una máscara de
       línea los mantendría invisibles hasta el último instante,
       que es justo lo contrario del ensamblaje. */
    var sp = SplitText.create(display, { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'auto' });
    chars = sp.chars;
  } else {
    heroTl.from(display, { opacity: 0, y: 40, duration: 1 });
    chars = [];
  }
  if (!chars.length) { addHeroRest(); return; }

  /* Degradado de marca repartido letra por letra. background-clip
     no sirve: un .char con transform crea su propio contexto de
     pintado y deja de recortar el fondo del padre. */
  var gradEnd = display.querySelector('.grad-chars');
  if (gradEnd) {
    var gc = gradEnd.querySelectorAll('.char');
    var ramp = gsap.utils.interpolate(['#8B6DE8', '#D3C8F6']);
    gc.forEach(function (c, i) { c.style.color = ramp(gc.length > 1 ? i / (gc.length - 1) : 0); });
  }

  var last = [], rest = [];
  chars.forEach(function (c) { (c.closest('.grad-chars') ? last : rest).push(c); });

  var vw = window.innerWidth, vh = window.innerHeight;
  var scatter = {
    x: function () { return gsap.utils.random(-0.6 * vw, 0.6 * vw); },
    y: function () { return gsap.utils.random(-0.6 * vh, 0.6 * vh); },
    rotate: function () { return gsap.utils.random(-180, 180); },
    scale: function () { return gsap.utils.random(0.3, 2); },
    opacity: 0
  };
  gsap.set(chars, scatter);
  gsap.set(chars, { filter: 'blur(12px)' });

  var land = { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.5, ease: 'expo.out' };

  heroTl
    /* El blur se despeja pronto y aparte: son ~20 filtros vivos a
       la vez y cada uno se rasteriza por frame. Que duren 0.9s en
       vez de 2.6s es la diferencia entre fluido y a tirones. */
    .to(chars, { filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' }, 0.15)
    .to(rest, Object.assign({ stagger: { from: 'random', amount: 1.1 } }, land), 0)
    /* "Siempre." aterriza sola, medio segundo después del resto */
    .to(last, Object.assign({ stagger: { from: 'start', amount: 0.25 } }, land), 1.6)
    /* micro-settle: rotación residual que se acomoda */
    .to(chars, { rotate: function () { return gsap.utils.random(-2, 2); }, duration: 0.35, stagger: { amount: 0.3, from: 'random' } }, 3.05)
    .to(chars, { rotate: 0, duration: 0.7 }, 3.5);

  addHeroRest();
}

function addHeroRest() {
  gsap.set('.js-hero', { opacity: 0, y: 26 });
  heroTl
    .to('.hero-sub', { opacity: 1, y: 0, duration: 0.9 }, 1.9)
    .to('.hero-cta', { opacity: 1, y: 0, duration: 0.9 }, 2.05)
    .to('.hero-meta .js-hero', { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 }, 2.15)
    .to('.scroll-cue', { opacity: 1, y: 0, duration: 0.7 }, 2.5);
  heroTl.call(function () {
    var g = document.querySelector('#heroDisplay .grad-chars');
    if (!g) return;
    g.querySelectorAll('.char').forEach(function (c, i) { c.style.animationDelay = (i * 0.13) + 's'; });
    g.classList.add('grad-shine');
  }, null, 5.3);
}

buildHero();

function buildLoaderGrid() {
  var host = document.getElementById('loPx');
  if (!host) return [];
  var w = window.innerWidth, h = window.innerHeight, px = 64;
  while (Math.ceil(w / px) * Math.ceil(h / px) > 700) px = Math.round(px * 1.5);
  var cols = Math.ceil(w / px), rows = Math.ceil(h / px);
  host.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  host.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';
  var cells = [], frag = document.createDocumentFragment();
  var ACC = ['#511BDB', '#8B6DE8', '#2E0B8A'];
  for (var i = 0; i < cols * rows; i++) {
    var cell = document.createElement('i');
    if (Math.random() < 0.16) cell.dataset.acc = ACC[(Math.random() * ACC.length) | 0];
    frag.appendChild(cell); cells.push(cell);
  }
  host.appendChild(frag);
  return cells;
}
function revealSite() {
  /* Cortina de píxeles: un pestañeo de mosaico morado/lila y los
     cuadros se disuelven en orden aleatorio revelando el hero. */
  var cells = buildLoaderGrid();
  if (!cells.length) { killLoader(); heroTl.play(0); return; }
  gsap.timeline()
    .add(function () {
      loader.style.background = 'transparent';
      document.body.classList.remove('is-loading');
      cells.forEach(function (c) { if (c.dataset.acc) c.style.background = c.dataset.acc; });
    }, 0.15)
    .to(cells, {
      scale: 0.35, opacity: 0, duration: 0.45, ease: 'power2.in',
      stagger: { amount: 0.95, from: 'random' }
    }, 0.2)
    .add(function () { killLoader(); ScrollTrigger.refresh(); })
    .call(function () { heroTl.play(0); }, null, 0.9);
}

if (lenis) lenis.stop();
function boot() { if (lenis) lenis.start(); revealSite(); }
if (document.readyState === 'complete') boot();
else window.addEventListener('load', boot);

/* ═══ HELPERS DE REVELADO ═════════════════════════════════ */
function splitHeading(el) {
  if (!H.SplitText) return null;
  return SplitText.create(el, {
    type: 'lines,words,chars', linesClass: 'split-line', wordsClass: 'word', charsClass: 'char',
    mask: 'lines', autoSplit: true, aria: 'auto',
    onSplit: function (self) {
      return gsap.from(self.chars, {
        yPercent: 118, opacity: 0, duration: 1.05, ease: 'expo.out',
        stagger: { each: 0.014 },
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    }
  });
}

/* Marcadores para el fallback de IntersectionObserver en móvil */
function ioReveal(nodes, build) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      build(en.target);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  nodes.forEach(function (n) { io.observe(n); });
  return io;
}

/* ═══ PULSO VIAJERO ══════════════════════════════════════════
   Clona un trazo ya dibujado y hace correr por él un paquete de
   luz en bucle — la voz sigue viajando aunque nadie haga scroll.
   Es lo que mantiene vivas las gráficas después de su entrada. */
function makePulse(sourcePath, dur) {
  if (!sourcePath) return null;
  var ghost = sourcePath.cloneNode(false);
  ghost.removeAttribute('id');
  ghost.setAttribute('class', 'line-pulse');
  sourcePath.parentNode.appendChild(ghost);
  var L = ghost.getTotalLength();
  gsap.set(ghost, { strokeDasharray: (L * 0.07) + ' ' + L, strokeDashoffset: 0 });
  return function start() {
    gsap.to(ghost, { opacity: 0.85, duration: 0.6 });
    gsap.to(ghost, { strokeDashoffset: -(L * 1.07), duration: dur, ease: 'none', repeat: -1 });
  };
}

/* Un error en un efecto jamás debe tumbar a los que siguen:
   cada módulo corre aislado; si falla, avisa y la página sigue. */
function safe(name, fn) {
  try { fn(); } catch (e) {
    if (window.console && console.warn) console.warn('[fx:' + name + ']', e);
  }
}

var mm = gsap.matchMedia();

/* ── GLUE: lo que core entrega a los demas modulos ─────────────────────── */
return {
  active: true,
  H: H, reduce: reduce, loader: loader,
  lenis: lenis, setScroll: setScroll,
  heroTl: heroTl, heroBlobs: heroBlobs, haloNodes: haloNodes,
  mm: mm, safe: safe, ioReveal: ioReveal, splitHeading: splitHeading, makePulse: makePulse,
  killLoader: killLoader,
  tokens: { DARK: DARK, LIGHT: LIGHT, VAR: VAR }
};
})();

/* ── GLUE: exports (enlaces ES) ─────────────────────────────────────────── */
export var active       = C.active;
export var H            = C.H;
export var reduce       = C.reduce;
export var loader       = C.loader;
export var killLoader   = C.killLoader;
export var lenis        = C.lenis;
export var setScroll    = C.setScroll;
export var heroTl       = C.heroTl;
export var heroBlobs    = C.heroBlobs;
export var haloNodes    = C.haloNodes;
export var mm           = C.mm;
export var safe         = C.safe;
export var ioReveal     = C.ioReveal;
export var splitHeading = C.splitHeading;
export var makePulse    = C.makePulse;
export var tokens       = C.tokens;

/* ── GLUE: superficie global para el resto del equipo ─────────────────────
   (window.__saphiLenis ya lo publica el bloque de Lenis, tal cual el original) */
window.SAPHI = {
  H: H, reduced: reduce, lenis: lenis, setScroll: setScroll, heroTl: heroTl, mm: mm,
  safe: safe, io: ioReveal, splitHeading: splitHeading, makePulse: makePulse,
  killLoader: killLoader, tokens: tokens
};

