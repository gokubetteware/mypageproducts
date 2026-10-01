/* ============================================================================
   js/sections.js — SECCIONES Y SU MOVIMIENTO v2 (propietario: sections)
   Llegadas por IO (.m-arrive), «Las 23:07», marquesina, manifiesto, Casos, proceso,
   cierre y footer. Importa solo de core.js (contrato en js/CONTRATO.md, «v2 · núcleo»).

   Reglas que sigue este módulo:
   · Nunca aborta con reduce ni sin GSAP: lo básico (llegadas, estado de Casos, teclado)
     corre siempre; el movimiento va bajo mode.motion y bajo mm.add.
   · ScrollTrigger solo para scrub y pin. Las llegadas son CSS + el IO de core.
   · Todo bucle pasa por ambient(): fuera de pantalla, con la pestaña oculta o con reduce, cero.
   · Tiempos, curvas y distancias salen de M / --m-*. Los periodos de ambiente (AMB) no son
     tokens de interfaz y se nombran aquí.
   · Nada se escribe ni se lee por tick de scroll salvo aritmética sobre geometría ya cacheada.
   ============================================================================ */
import { H, M, mode, mm, safe, ambient, arrive, ioReveal, splitHeading, makePulse, setScroll, tokens, lenis } from './core.js';

const DESK = '(min-width: 901px) and (prefers-reduced-motion: no-preference)';
const PIN = DESK + ' and (hover: hover) and (pointer: fine)';   /* el pin de Casos es de ratón: en táctil es scroll nativo con snap (E.2) */
const MOB = '(max-width: 900px) and (prefers-reduced-motion: no-preference)';
const AMB = { morph: 2.6, orbMorph: 2.7 };   /* periodo de cada forma de los blobs (s): ambiente, no es un token de interfaz */
const PAR = 14;                              /* parallax de los blobs: % de su alto, solo translateY */
const CASES_RATIO = 1.15;                    /* recorrido de scroll por px de carril horizontal */

const $ = (id) => document.getElementById(id);
const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mqOK = (q) => window.matchMedia(q).matches;

/* IO de un solo disparo con margen propio. cb(el, pasado): pasado = el nodo ya quedó arriba del viewport
   (ancla lejana, recarga a media página): quien llama debe dejar el estado final sin actuarlo. */
function once(el, margin, cb) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { cb(el, false); return; }
  const io = new IntersectionObserver((es) => {
    es.forEach((en) => {
      const passed = !en.isIntersecting && en.boundingClientRect.bottom <= 0;
      if (!en.isIntersecting && !passed) return;
      io.disconnect(); cb(en.target, passed);
    });
  }, { rootMargin: margin });
  io.observe(el);
}

/* «Sonar»: un anillo que se abre y se apaga UNA vez (nunca en bucle). Sin movimiento no existe. */
function ring(el, dur) {
  if (!el || !mode.motion) return null;
  dur = dur || M.dur.ring;
  return gsap.timeline()
    .set(el, { scale: 0.12, opacity: 0 })
    .to(el, { scale: 1, duration: dur, ease: M.ease.cine }, 0)
    .to(el, { opacity: 0.85, duration: dur * 0.09, ease: 'none' }, 0)
    .to(el, { opacity: 0, duration: dur * 0.56, ease: M.ease.exit }, dur * 0.35);
}

/* ═══ LLEGADAS (G-09) ═══════════════════════════════════════════════════════
   Los .js-fade y .js-words pasan a .m-arrive (CSS + el IO de core): cero ScrollTriggers, cero
   letras ni palabras partidas. Corre siempre (también sin GSAP); con reduce los bloques ya están a
   la vista desde el primer cuadro (motion-sections.css) y no se desplaza nada. */
function initArrivals() {
  const stagedFlow = !!(mode.motion && H.DrawSVGPlugin && $('flowPath') && mqOK('(min-width: 901px)'));
  const list = [];
  $$('.js-fade').forEach((el) => {
    el.classList.add('m-arrive');
    if (el.classList.contains('chart-card')) el.classList.add('m-arrive--1');   /* 12 px: su disparador de scrub mide su posición */
    if (stagedFlow && el.classList.contains('flow-step')) el.setAttribute('data-arrive', 'manual');   /* los lleva el flujo */
    list.push(el);
  });
  $$('.js-words').forEach((p) => { p.classList.add('m-arrive', 'm-arrive--1'); list.push(p); });
  $$('.step').forEach((s, i) => { s.style.setProperty('--m-i', i * 2); });   /* 80 ms entre pasos (tope 240) */
  $$('.js-draw').forEach((h) => { h.classList.add('m-draw'); list.push(h); });
  const first = $$('.data-card').filter((c) => c.querySelector('.dc-old'))[0];
  if (first) first.classList.add('m-strike');                                 /* «42 h» tachado → «1er timbre» (CSS) */
  const bars = $$('.bar-fill');
  bars.forEach((b) => { b.classList.add('m-bar'); });
  arrive(list);
  ioReveal(bars, (b) => { b.classList.add('m-in'); });                        /* la barra crece con el mismo IO */
}

/* Titulares: máscara por línea al llegar (core); solo con movimiento */
function initHeadings() {
  if (!mode.motion) return;
  $$('.js-mask').forEach((h) => { safe('titular', () => splitHeading(h)); });
}

/* ═══ MARQUESINA (G-14) ═════════════════════════════════════════════════════
   WAAPI: cero JS por cuadro en reposo, pausada fuera de pantalla (ambient). Acople al scroll:
   una lerp de la velocidad de reproducción con updatePlaybackRate, sin crear tweens. */
function initMarquee() {
  const track = $('marquee');
  if (!track || !track.animate) return;
  const band = track.parentNode;
  const dur = M.ambient.marquee * 1000;
  const h = ambient(band, () => {
    const a = track.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(calc(-50% - var(--mq-half-gap, 38px)))' }],   /* un periodo exacto: copia + una separación */
      { duration: dur, iterations: Infinity, easing: 'linear' });
    a.currentTime = dur * 50;   /* margen para que una velocidad negativa nunca llegue a 0 y la termine */
    return a;
  });
  if (mqOK('(hover: none) and (pointer: coarse)')) return;   /* en táctil la velocidad de scroll no es fiable */

  let vel = 0, rate = 1, applied = 1, ticking = false, lastY = window.scrollY, lastT = performance.now();
  function step() {
    ticking = false;
    const a = h.instance;
    if (!a || !h.running) { vel = 0; rate = 1; applied = 1; return; }
    vel *= 0.9;                                           /* decae entre eventos de scroll */
    const target = clamp(1 + vel / 260, -4, 4);
    rate += (target - rate) * (Math.abs(target - 1) > Math.abs(rate - 1) ? 0.25 : 0.08);   /* sube rápido, regresa a 1 con lerp .08 */
    if (Math.abs(rate - 1) < 0.02 && Math.abs(vel) < 8) { rate = 1; vel = 0; }
    if (Math.abs(rate - applied) > 0.01 || (rate === 1 && applied !== 1)) { a.updatePlaybackRate(rate); applied = rate; }
    if (rate !== 1 || vel !== 0) wake();                  /* en reposo (rate 1) el bucle se detiene solo */
  }
  function wake() { if (!ticking) { ticking = true; requestAnimationFrame(step); } }
  window.addEventListener('scroll', () => {
    const t = performance.now(), y = window.scrollY, dt = t - lastT;
    if (dt > 0) vel = (y - lastY) / dt * 1000;
    lastY = y; lastT = t;
    if (h.live) wake();
  }, { passive: true });
}

/* ═══ «LAS 23:07» — momento focal 2 (G-13) ══════════════════════════════════
   Tres golpes finitos y ningún bucle: (1) anillo único en la marca de las 23:07, (2) «42 h»
   tachado y «1er timbre» (CSS, ver motion-sections.css), (3) el flujo: el trazo pasa por cada
   paso, el paso contesta y una sola pasada de luz cierra. Después, todo quieto. */
const DELAY_SOFIA = 0.18;   /* la línea de Sofía arranca un poco después de la manual (unidades del scrub) */

function chartParts() {
  return { lines: ['#cAManual', '#cASofia', '#cASofiaGlow'], area: $('cAArea'), mark: $('cAMark'), ring: $('markRing') };
}
function markIn(c) {
  gsap.to(c.mark, { opacity: 1, scale: 1, duration: M.dur.enter, ease: M.ease.brand, overwrite: 'auto' });   /* sin overshoot */
  gsap.to(c.area, { opacity: 0.07, duration: M.dur.reveal, ease: M.ease.brand, overwrite: 'auto' });
  ring(c.ring);
}
function markOut(c) {
  const d = M.dur.enter * M.dur.exit;
  gsap.to(c.mark, { opacity: 0, scale: 0.6, duration: d, ease: M.ease.exit, overwrite: 'auto' });
  gsap.to(c.area, { opacity: 0, duration: d, ease: M.ease.exit, overwrite: 'auto' });
}
function chartReset(c) {
  gsap.set(c.lines, { drawSVG: '0%' });
  gsap.set(c.area, { opacity: 0 });
  gsap.set(c.mark, { opacity: 0, scale: 0.6, transformOrigin: '92% 20%' });
}

/* escritorio: las dos líneas se dibujan con el scroll (el scroll ES el día); la marca suena al llegar a las 23:07 */
function chartScrub() {
  const c = chartParts();
  if (!H.DrawSVGPlugin || !$('chartA') || !c.mark) return;
  chartReset(c);
  const bb = $('cASofia').getBBox(), dot = c.mark.querySelector('.cA-dot');
  const frac = clamp(((dot ? +dot.getAttribute('cx') : 754) - bb.x) / (bb.width || 1), 0, 1);
  const markAt = (DELAY_SOFIA + frac) / (1 + DELAY_SOFIA) - 0.015;   /* progreso en que el trazo toca la marca */
  let on = false;
  gsap.timeline({
    scrollTrigger: {
      trigger: '#chartPlot', start: 'top 84%', end: 'top 32%', scrub: true,
      onUpdate: (self) => {                            /* solo compara contra un umbral: escribe al cruzarlo, no por tick */
        if (!on && self.progress >= markAt) { on = true; markIn(c); }
        else if (on && self.progress < markAt - 0.06) { on = false; markOut(c); }
      }
    }
  })
    .to('#cAManual', { drawSVG: '100%', duration: 1, ease: 'none' }, 0)
    .to(['#cASofiaGlow', '#cASofia'], { drawSVG: '100%', duration: 1, ease: 'none' }, DELAY_SOFIA);
}

/* móvil: sin scrub, una pasada al llegar */
function chartPass() {
  const c = chartParts();
  if (!H.DrawSVGPlugin || !$('chartA') || !c.mark) return;
  chartReset(c);
  const T = M.dur.focal * 1.6;
  once($('chartPlot'), '0px 0px ' + M.io.revealMargin + ' 0px', (el, passed) => {
    if (passed) { gsap.set(c.lines, { drawSVG: '100%' }); gsap.set(c.area, { opacity: 0.07 }); gsap.set(c.mark, { opacity: 1, scale: 1 }); return; }
    gsap.timeline()
      .to('#cAManual', { drawSVG: '100%', duration: T, ease: M.ease.cine }, 0)
      .to(['#cASofiaGlow', '#cASofia'], { drawSVG: '100%', duration: T, ease: M.ease.cine }, T * 0.27)
      .call(() => { markIn(c); }, null, T * 1.2);
  });
}

/* escritorio: el trazo del flujo recorre los cuatro pasos y cada uno «contesta» cuando el trazo pasa por él */
function flowStaged() {
  const path = $('flowPath'), flow = $('flowRec');
  if (!H.DrawSVGPlugin || !path || !flow) return;
  const steps = $$('.flow-step', flow);
  const revealAll = () => { steps.forEach((s) => { arrive.reveal(s, 0); }); };
  try {
    const total = M.dur.focal * 1.75;
    const pulse = makePulse(path, M.dur.focal * 1.5, { once: true });
    gsap.set(path, { drawSVG: '0%' });
    const ease = gsap.parseEase(M.ease.cine);
    const at = (f) => { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (ease(m) < f) lo = m; else hi = m; } return hi * total; };
    const tl = gsap.timeline({ paused: true });
    tl.to(path, { drawSVG: '100%', duration: total, ease: M.ease.cine }, 0);
    steps.forEach((s, i) => {
      tl.call(() => { arrive.reveal(s, 0); ring(s.querySelector('.m-ring--step'), M.dur.ring * 0.55); }, null, at((i + 0.5) / steps.length));
    });
    if (pulse) tl.call(() => { pulse(); }, null, total);
    once(flow, '0px 0px -40% 0px', (el, passed) => {
      if (passed) { gsap.set(path, { drawSVG: '100%' }); revealAll(); return; }
      tl.play();
    });
  } catch (e) { revealAll(); throw e; }
}

/* Hallazgo: la línea «Con Sofía» nunca se pintó en el original. Su degradado (gLineH) usa objectBoundingBox y el
   trazo es horizontal (caja de alto 0), así que el navegador no lo dibuja. Un degradado en coordenadas de usuario,
   con las mismas paradas, la devuelve. No cambia colores ni datos. */
function fixSofiaStroke() {
  const svg = $('chartA'), src = $('gLineH'), a = $('cASofia'), g = $('cASofiaGlow');
  if (!svg || !src || !a || !a.getBBox) return;
  const NS = 'http://www.w3.org/2000/svg', bb = a.getBBox();
  const defs = document.createElementNS(NS, 'defs'), lg = document.createElementNS(NS, 'linearGradient');
  lg.setAttribute('id', 'gLineChart'); lg.setAttribute('gradientUnits', 'userSpaceOnUse');
  lg.setAttribute('x1', bb.x); lg.setAttribute('x2', bb.x + bb.width); lg.setAttribute('y1', 0); lg.setAttribute('y2', 0);
  Array.prototype.forEach.call(src.children, (st) => { lg.appendChild(st.cloneNode(true)); });
  defs.appendChild(lg); svg.insertBefore(defs, svg.firstChild);
  [a, g].forEach((p) => { if (p) p.style.stroke = 'url(#gLineChart)'; });
}

function initDatos() {
  safe('linea-sofia', fixSofiaStroke);   /* siempre: también con reduce */
  if (!mode.motion) return;
  mm.add(DESK, () => {
    safe('grafica', chartScrub);
    safe('flujo', flowStaged);
    return () => { $$('.flow-step').forEach((s) => { arrive.reveal(s, 0); }); };   /* al cruzar el breakpoint nada queda oculto */
  });
  mm.add(MOB, () => { safe('grafica-movil', chartPass); });
}

/* ═══ CÓMO TRABAJO (G-19) ═══════════════════════════════════════════════════
   Una línea corre por los 4 pasos con el scroll y cada paso se enciende cuando la línea lo alcanza
   (un solo trigger de scrub). En móvil se enciende por IO; con reduce, todo encendido. */
function initProceso() {
  const ol = document.querySelector('#proceso .steps');
  if (!ol) return;
  const steps = $$('.step', ol), n = steps.length;
  if (!mode.motion) { steps.forEach((s) => { s.classList.add('is-on'); }); return; }
  ol.classList.add('m-live');
  mm.add(DESK, () => {
    const line = document.createElement('span');
    line.className = 'steps-line'; line.setAttribute('aria-hidden', 'true');
    ol.appendChild(line);
    const setX = gsap.quickSetter(line, 'scaleX');
    setX(0);
    let lit = -1;
    const p = { v: 0 };
    gsap.to(p, {
      v: 1, ease: 'none',
      scrollTrigger: { trigger: ol, start: 'top 78%', end: 'bottom 52%', scrub: M.scrub },
      onUpdate: () => {
        setX(p.v);
        const k = clamp(Math.floor(p.v * n + 0.85) - 1, -1, n - 1);   /* el paso se enciende al llegarle la línea */
        if (k !== lit) { lit = k; steps.forEach((s, i) => { s.classList.toggle('is-on', i <= k); }); }
      }
    });
    return () => { line.remove(); steps.forEach((s) => { s.classList.add('is-on'); }); };
  });
  mm.add(MOB, () => {
    steps.forEach((s) => { once(s, '0px 0px -35% 0px', () => { s.classList.add('is-on'); }); });
  });
}

/* ═══ MANIFIESTO (G-18) ═════════════════════════════════════════════════════
   Karaoke: cada palabra pasa de --ink-25 a --ink con el scroll (es la voz que lee contigo).
   Corrige P1-2 (con la fuente web, autoSplit re-divide el texto y el scrub quedaba sobre nodos
   huérfanos): el trigger es UNO y estable y la línea de tiempo se reconstruye dentro de onSplit,
   en el progreso donde estaba el scroll. Corrige P1-3: aria 'none' (el párrafo conserva su texto). */
const ORB_SHAPES = [
  'M183.2,100.0 C186.5,106.6 189.8,114.8 190.1,122.2 C190.4,129.6 188.6,138.2 185.0,144.6 C181.3,151.0 174.7,156.8 168.2,160.4 C161.7,164.0 153.1,165.6 145.8,166.4 C138.6,167.2 131.1,165.8 124.8,165.4 C118.4,164.9 113.2,163.6 107.7,163.7 C102.3,163.8 97.7,164.8 92.0,166.0 C86.2,167.1 80.1,169.7 73.2,170.6 C66.3,171.5 58.0,172.8 50.7,171.5 C43.3,170.2 34.9,167.3 29.1,162.8 C23.3,158.3 18.1,151.2 15.7,144.2 C13.3,137.3 13.3,128.4 14.5,121.1 C15.8,113.7 19.8,106.2 23.2,100.0 C26.5,93.8 31.4,88.9 34.7,83.9 C38.1,79.0 41.0,75.2 43.3,70.2 C45.6,65.3 46.5,60.2 48.4,54.3 C50.4,48.4 51.7,41.1 54.9,34.7 C58.2,28.3 62.5,20.7 68.0,15.8 C73.6,10.8 81.2,6.3 88.5,4.9 C95.7,3.5 104.4,4.5 111.3,7.1 C118.2,9.8 124.9,15.6 130.0,21.0 C135.0,26.5 138.4,33.8 141.6,39.8 C144.7,45.7 146.2,51.7 148.9,56.7 C151.5,61.7 153.9,65.5 157.4,69.9 C160.9,74.2 165.6,77.8 169.9,82.8 C174.2,87.8 179.8,93.4 183.2,100.0 Z',
  'M196.4,100.0 C199.2,107.4 201.1,117.1 199.0,124.4 C196.8,131.7 189.7,138.7 183.6,143.9 C177.5,149.1 169.0,151.9 162.6,155.4 C156.1,159.0 150.9,162.6 145.0,165.1 C139.0,167.7 133.1,170.9 126.9,170.9 C120.7,170.9 113.5,167.9 107.9,165.2 C102.3,162.5 98.0,156.9 93.3,154.8 C88.7,152.8 85.2,152.7 80.0,152.8 C74.7,153.0 67.7,156.0 61.7,155.5 C55.6,155.1 48.7,153.2 43.5,150.0 C38.4,146.8 35.2,141.2 31.0,136.2 C26.7,131.3 22.6,126.2 18.0,120.2 C13.5,114.2 6.4,107.4 3.6,100.0 C0.8,92.6 -1.1,82.9 1.0,75.6 C3.2,68.3 10.3,61.3 16.4,56.1 C22.5,50.9 31.0,48.1 37.4,44.6 C43.9,41.0 49.1,37.4 55.0,34.9 C61.0,32.3 66.9,29.1 73.1,29.1 C79.3,29.1 86.5,32.1 92.1,34.8 C97.7,37.5 102.0,43.1 106.7,45.2 C111.3,47.2 114.8,47.3 120.0,47.2 C125.3,47.0 132.3,44.0 138.3,44.5 C144.4,44.9 151.3,46.8 156.5,50.0 C161.6,53.2 164.8,58.8 169.0,63.8 C173.3,68.7 177.4,73.8 182.0,79.8 C186.5,85.8 193.6,92.6 196.4,100.0 Z',
  'M189.7,100.0 C192.5,106.8 193.4,116.0 190.6,122.3 C187.8,128.7 179.1,134.1 172.9,138.2 C166.6,142.4 158.2,143.3 153.1,147.0 C147.9,150.8 145.6,155.0 141.9,160.8 C138.3,166.5 136.1,176.2 131.0,181.6 C125.9,187.1 118.2,192.8 111.3,193.3 C104.5,193.7 95.9,188.8 89.7,184.5 C83.6,180.3 79.5,171.8 74.4,167.6 C69.3,163.4 65.4,161.1 59.1,159.2 C52.8,157.3 43.7,158.7 36.7,156.1 C29.7,153.5 20.5,149.5 16.9,143.6 C13.2,137.8 13.2,128.3 14.7,121.0 C16.2,113.8 23.0,106.3 25.7,100.0 C28.5,93.7 31.1,89.4 31.4,83.1 C31.7,76.8 27.8,69.5 27.7,62.0 C27.5,54.6 26.8,44.3 30.3,38.3 C33.8,32.2 41.7,27.4 48.8,25.8 C55.9,24.1 65.7,27.5 72.8,28.3 C79.9,29.1 85.4,31.5 91.6,30.5 C97.7,29.4 102.7,24.4 109.5,21.7 C116.3,19.0 125.4,13.8 132.5,14.3 C139.6,14.7 147.8,18.7 152.3,24.3 C156.8,29.8 157.8,40.1 159.4,47.3 C161.1,54.5 159.7,61.7 162.1,67.4 C164.5,73.2 169.3,76.3 173.9,81.8 C178.6,87.2 187.0,93.2 189.7,100.0 Z',
  'M195.3,100.0 C197.4,107.4 198.4,116.4 196.5,123.8 C194.6,131.1 189.6,138.7 184.1,144.1 C178.5,149.5 170.2,153.1 163.3,156.1 C156.5,159.2 149.2,160.2 143.0,162.3 C136.8,164.4 131.7,166.4 126.1,168.8 C120.5,171.2 115.3,175.0 109.3,177.0 C103.4,178.9 96.4,181.2 90.2,180.7 C84.0,180.1 77.0,177.5 72.1,173.5 C67.2,169.6 63.4,162.7 60.7,156.9 C58.1,151.1 57.6,144.1 56.3,138.7 C54.9,133.4 54.5,129.1 52.5,124.9 C50.6,120.7 47.4,117.9 44.4,113.7 C41.4,109.6 36.8,105.1 34.7,100.0 C32.5,94.9 30.8,88.5 31.6,83.1 C32.3,77.8 35.5,72.2 39.1,68.0 C42.7,63.9 48.5,61.2 53.0,58.4 C57.5,55.6 62.2,54.1 66.3,51.1 C70.3,48.1 73.3,44.6 77.4,40.4 C81.5,36.1 85.5,30.0 91.0,25.8 C96.5,21.5 103.5,16.6 110.3,14.9 C117.2,13.2 125.4,13.5 131.9,15.8 C138.4,18.0 144.5,23.5 149.4,28.5 C154.2,33.5 157.3,40.3 161.0,46.0 C164.6,51.7 167.5,57.0 171.3,62.6 C175.2,68.1 180.1,73.0 184.1,79.3 C188.1,85.5 193.2,92.6 195.3,100.0 Z',
  'M195.3,100.0 C193.1,107.2 186.4,114.4 181.2,120.0 C176.0,125.6 168.7,129.1 164.0,133.6 C159.3,138.1 156.2,141.6 153.2,147.1 C150.2,152.6 149.3,159.9 146.0,166.7 C142.7,173.4 138.9,182.4 133.2,187.5 C127.5,192.5 119.1,196.8 111.8,197.1 C104.5,197.5 95.7,193.7 89.1,189.5 C82.6,185.4 77.5,177.5 72.6,172.2 C67.8,166.9 65.0,161.4 60.2,157.7 C55.4,153.9 50.2,152.5 43.9,149.7 C37.6,146.9 28.7,145.2 22.4,140.8 C16.0,136.3 8.6,130.1 5.6,123.3 C2.7,116.5 2.5,107.2 4.7,100.0 C6.9,92.8 13.6,85.6 18.8,80.0 C24.0,74.4 31.3,70.9 36.0,66.4 C40.7,61.9 43.8,58.4 46.8,52.9 C49.8,47.4 50.7,40.1 54.0,33.3 C57.3,26.6 61.1,17.6 66.8,12.5 C72.5,7.5 80.9,3.2 88.2,2.9 C95.5,2.5 104.3,6.3 110.9,10.5 C117.4,14.6 122.5,22.5 127.4,27.8 C132.2,33.1 135.0,38.6 139.8,42.3 C144.6,46.1 149.8,47.5 156.1,50.3 C162.4,53.1 171.3,54.8 177.6,59.2 C184.0,63.7 191.4,69.9 194.4,76.7 C197.3,83.5 197.5,92.8 195.3,100.0 Z',
  'M190.7,100.0 C191.5,106.5 184.6,113.8 181.5,120.1 C178.5,126.4 174.3,131.0 172.3,138.0 C170.3,144.9 173.0,155.4 169.7,161.7 C166.4,168.1 159.5,174.3 152.4,175.9 C145.3,177.5 134.3,171.9 127.0,171.3 C119.8,170.7 114.9,170.9 108.8,172.3 C102.7,173.6 96.1,180.2 90.4,179.5 C84.6,178.8 78.3,173.0 74.1,168.2 C70.0,163.3 69.5,154.1 65.2,150.4 C60.9,146.7 54.4,148.0 48.2,145.9 C41.9,143.8 31.6,142.5 27.7,137.9 C23.9,133.4 25.4,124.8 24.9,118.5 C24.5,112.2 26.9,106.7 24.9,100.0 C22.9,93.3 14.8,86.0 13.1,78.6 C11.5,71.2 11.1,61.2 15.1,55.4 C19.0,49.7 30.4,47.8 37.0,44.2 C43.6,40.6 49.2,38.4 54.5,34.0 C59.7,29.6 62.8,20.2 68.8,17.6 C74.7,15.0 83.6,15.7 90.1,18.5 C96.6,21.4 102.3,31.4 108.0,34.5 C113.6,37.6 117.8,36.9 123.8,37.3 C129.7,37.7 138.7,34.3 143.6,36.8 C148.5,39.4 151.0,47.2 153.4,52.7 C155.9,58.1 154.2,64.8 158.1,69.5 C162.0,74.2 171.3,76.0 176.7,81.1 C182.2,86.2 189.9,93.5 190.7,100.0 Z',
  'M192.3,100.0 C194.2,106.7 191.6,115.7 187.4,121.5 C183.2,127.4 172.1,130.5 166.8,135.1 C161.5,139.7 158.3,142.9 155.5,149.2 C152.8,155.5 154.0,166.5 150.2,172.8 C146.5,179.1 139.8,186.0 133.0,187.1 C126.3,188.2 116.6,182.0 109.6,179.4 C102.7,176.8 97.8,171.9 91.3,171.6 C84.8,171.4 77.9,177.0 70.4,177.9 C63.0,178.9 52.3,180.9 46.6,177.3 C40.9,173.8 38.0,163.8 36.2,156.5 C34.4,149.3 37.7,140.0 35.7,133.7 C33.7,127.4 28.7,124.3 24.1,118.7 C19.4,113.1 9.7,106.7 7.7,100.0 C5.8,93.3 8.4,84.3 12.6,78.5 C16.8,72.6 27.9,69.5 33.2,64.9 C38.5,60.3 41.7,57.1 44.5,50.8 C47.2,44.5 46.0,33.5 49.8,27.2 C53.5,20.9 60.2,14.0 67.0,12.9 C73.7,11.8 83.4,18.0 90.4,20.6 C97.3,23.2 102.2,28.1 108.7,28.4 C115.2,28.6 122.1,23.0 129.6,22.1 C137.0,21.1 147.7,19.1 153.4,22.7 C159.1,26.2 162.0,36.2 163.8,43.5 C165.6,50.7 162.3,60.0 164.3,66.3 C166.3,72.6 171.3,75.7 175.9,81.3 C180.6,86.9 190.3,93.3 192.3,100.0 Z',
  'M189.5,100.0 C189.7,106.6 186.4,114.8 181.5,120.1 C176.7,125.4 166.7,128.6 160.4,131.7 C154.0,134.8 147.4,134.9 143.6,138.6 C139.7,142.3 139.5,147.4 137.2,153.8 C134.8,160.3 133.6,171.0 129.3,177.2 C124.9,183.5 117.7,190.0 111.1,191.5 C104.5,192.9 95.9,189.4 89.6,185.9 C83.3,182.4 78.3,175.1 73.2,170.7 C68.1,166.3 64.0,162.9 58.8,159.7 C53.6,156.5 46.9,155.1 42.1,151.3 C37.4,147.4 32.2,142.3 30.3,136.6 C28.3,130.9 29.8,123.2 30.6,117.1 C31.5,111.0 35.2,105.6 35.5,100.0 C35.7,94.4 33.9,89.9 32.0,83.2 C30.1,76.6 24.6,67.9 24.0,60.1 C23.4,52.3 24.0,42.0 28.3,36.5 C32.6,31.0 42.0,27.6 49.7,27.1 C57.4,26.6 67.5,31.3 74.7,33.2 C81.8,35.1 87.0,38.6 92.5,38.6 C98.1,38.5 102.3,35.0 108.1,33.0 C114.0,31.0 121.4,26.7 127.8,26.7 C134.2,26.7 141.3,29.2 146.3,33.0 C151.2,36.7 154.0,43.8 157.4,49.2 C160.8,54.5 162.8,59.9 166.6,65.0 C170.4,70.2 176.3,74.4 180.2,80.2 C184.0,86.1 189.2,93.4 189.5,100.0 Z'
];

function manifiesto(cfg) {
  const mf = $('manifestoText');
  if (!mf || !H.SplitText) return;
  const endEl = $('mfEnd');
  if (endEl) { endEl.removeAttribute('id'); endEl.classList.add('mf-end'); }   /* SplitText clona el span por línea: sin id duplicado (P3-4) */
  const dial = cfg.extras ? $('mfDial') : null, pctEl = cfg.extras ? $('mfPct') : null, dialWrap = cfg.extras ? document.querySelector('.mf-dial') : null;
  const C = 2 * Math.PI * 28;
  const INK = tokens.DARK.ink;
  const ramp = gsap.utils.interpolate(['#8B6DE8', '#D3C8F6']);
  let setDial = null;
  if (dial) { gsap.set(dial, { strokeDasharray: C, strokeDashoffset: C }); setDial = gsap.quickSetter(dial, 'strokeDashoffset'); }

  let tl = null, plain = [], grad = [], units = [], prog = 0, lastLive = null, lastPct = -1, done = false, pass = null;
  const rampAt = (i) => ramp(grad.length > 1 ? i / (grad.length - 1) : 0);

  const build = (self) => {
    if (pass) { pass.kill(); pass = null; }
    plain = []; grad = [];
    self.words.forEach((w) => { (w.closest('.mf-end') ? grad : plain).push(w); });
    units = plain.concat(grad);
    lastLive = null;
    gsap.set(units, { y: M.dist.d1 });                  /* cada palabra sube un pelo al encenderse */
    const t = gsap.timeline({ paused: true });
    t.to(plain, { color: INK, y: 0, duration: 1, ease: 'none', stagger: { each: 1 } }, 0);
    grad.forEach((w, i) => { t.to(w, { color: rampAt(i), y: 0, duration: 1, ease: 'none' }, plain.length + i); });
    t.progress(prog);                                   /* se restablece donde estaba el scroll */
    tl = t;
    return t;                                           /* SplitText la revierte antes de cada re-división */
  };

  function finalPass() {                                /* UNA pasada de brillo en la frase final y se queda en su acento */
    if (pass) pass.revert();
    pass = gsap.timeline()
      .to(grad, { color: '#EDE7FB', duration: M.dur.enter, ease: M.ease.state, stagger: { each: M.stagger.words } }, 0)
      .to(grad, { color: (i) => rampAt(i), duration: M.dur.reveal, ease: M.ease.brand, stagger: { each: M.stagger.words } }, M.dur.enter * 0.6);
  }
  function apply(p) {
    prog = p;
    const isDone = p > 0.985;
    if (isDone !== done) {
      done = isDone;
      if (dialWrap) dialWrap.classList.toggle('done', done);
      if (done) { if (tl) tl.progress(1); finalPass(); }
      else if (pass) { pass.revert(); pass = null; }
    }
    if (tl && !done) tl.progress(p);
    if (setDial) setDial(C * (1 - p));
    if (pctEl) { const pc = Math.round(p * 100); if (pc !== lastPct) { lastPct = pc; pctEl.textContent = pc; } }
    /* karaoke: la palabra bajo la aguja del scroll resplandece */
    const live = (p > 0.015 && p < 0.985 && units.length) ? units[Math.min(units.length - 1, Math.floor(p * units.length))] : null;
    if (live !== lastLive) { if (lastLive) lastLive.classList.remove('w-live'); if (live) live.classList.add('w-live'); lastLive = live; }
  }

  SplitText.create(mf, { type: 'lines,words', wordsClass: 'word', linesClass: 'mf-line', autoSplit: true, aria: 'none', onSplit: build });
  ScrollTrigger.create({ trigger: cfg.trigger, start: cfg.start, end: cfg.end, onUpdate: (self) => { apply(self.progress); }, onRefresh: (self) => { apply(self.progress); } });
}

/* orbe: el morph de 8 estados vive en ambient(); la deriva es UNA animación CSS (31 s) que también se pausa */
function manifiestoOrb() {
  const orb = document.querySelector('.mf-orb'), p = $('orbPath');
  if (!orb || !p || !H.MorphSVGPlugin) return null;
  orb.setAttribute('data-ambient', '');                 /* la deriva CSS corre solo con .is-live */
  ambient.css(orb.parentNode);
  return ambient(orb, () => {
    const t = gsap.timeline({ repeat: -1, defaults: { duration: AMB.orbMorph, ease: 'sine.inOut' } });
    for (let i = 0; i < ORB_SHAPES.length; i++) t.to(p, { morphSVG: ORB_SHAPES[(i + 1) % ORB_SHAPES.length] });
    return t;
  });
}

function initManifiesto() {
  if (!mode.motion) return;
  mm.add(DESK, () => {
    safe('manifiesto', () => { manifiesto({ trigger: '.manifesto', start: 'top top', end: 'bottom bottom', extras: true }); });
    let orbH = null;
    safe('orbe', () => { orbH = manifiestoOrb(); });
    return () => { if (orbH) orbH.destroy(); const o = document.querySelector('.mf-orb'); if (o) { o.removeAttribute('data-ambient'); o.classList.remove('is-live'); } };
  });
  /* móvil: scrub SIN pin (la sección ya es flujo normal por CSS); sin dial ni orbe */
  mm.add(MOB, () => {
    safe('manifiesto-movil', () => { manifiesto({ trigger: '#manifestoText', start: 'top 82%', end: 'bottom 46%', extras: false }); });
  });
}

/* ═══ CASOS (G-12) ══════════════════════════════════════════════════════════
   El único pin del sitio. Base accesible: el carril es scroll horizontal nativo en todos los anchos
   (corrige P1-1: 761–900 px y reduce); solo con movimiento, ≥901 px y puntero fino JS lo ancla (.is-pinned).
   Tarjeta activa por índice (se escribe solo al cambiar), segmentos sin texto y flechas = una tarjeta.
   La vista previa que persigue al cursor y la elevación por hover viven en ui.js / motion-ui.css (puntero
   fino, sin lecturas de rect por cuadro): aquí solo se le da foco a la tarjeta activa tras una flecha, y la
   vista previa se ancla a ella con su propio manejador de foco. */
function initCasos() {
  const vp = $('casesViewport'), track = $('casesTrack'), shell = $('casesShell');
  if (!vp || !track || !shell) return;
  const cards = $$('.case-card', track), n = cards.length;
  if (!n) return;

  /* segmentos de avance (sin texto) */
  const prog = document.querySelector('.cases-progress'), segs = [];
  if (prog) {
    prog.classList.add('is-segs');
    for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.className = 'cs'; prog.appendChild(s); segs.push(s); }
  }
  let active = -1, pinned = false, casesST = null, max = 0;
  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((c, k) => { c.classList.toggle('is-active', k === i); });
    segs.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-past', k < i); });
  }
  setActive(0);

  /* modo nativo: el progreso es scrollLeft / recorrido; el recorrido se cachea (no se lee por tick) */
  const measure = () => { max = Math.max(0, vp.scrollWidth - vp.clientWidth); };
  measure();
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(measure); ro.observe(vp); ro.observe(track); } else window.addEventListener('resize', measure);
  vp.addEventListener('scroll', () => { if (!pinned) setActive(max ? clamp(Math.round(vp.scrollLeft / max * (n - 1)), 0, n - 1) : 0); }, { passive: true });

  /* teclado: ← → desplazan una tarjeta; Inicio/Fin van a los extremos. Al asentarse el scroll el foco pasa a la
     tarjeta activa (con tabindex solo mientras la tiene): el lector la anuncia y la vista previa se ancla a ella. */
  if (mqOK('(any-hover: none) and (any-pointer: coarse)')) vp.removeAttribute('tabindex');   /* sin teclado, sin parada de tab */
  let kbT = 0;
  function goTo(i) {
    const f = n > 1 ? i / (n - 1) : 0;
    if (pinned && casesST) setScroll(casesST.start + f * (casesST.end - casesST.start));
    else vp.scrollTo({ left: f * max, behavior: mode.reduced ? 'auto' : 'smooth' });
  }
  cards.forEach((c) => { c.addEventListener('focusout', () => { if (c.hasAttribute('data-kbfocus')) { c.removeAttribute('data-kbfocus'); c.removeAttribute('tabindex'); } }); });
  vp.addEventListener('keydown', (e) => {
    const onCard = e.target.closest && e.target.closest('.case-card');
    if ((e.target !== vp && !onCard) || e.altKey || e.ctrlKey || e.metaKey) return;
    let i = active;
    if (e.key === 'ArrowRight') i++; else if (e.key === 'ArrowLeft') i--; else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = n - 1; else return;
    e.preventDefault();
    goTo(clamp(i, 0, n - 1));
    clearTimeout(kbT);
    kbT = setTimeout(() => { const c = cards[active]; c.setAttribute('tabindex', '0'); c.setAttribute('data-kbfocus', ''); c.focus({ preventScroll: true }); }, 420);   /* tabindex 0 (no -1): el anillo de foco de motion.css lo suprime en -1 */
  });

  /* anclaje: solo con movimiento, ≥901 px y puntero fino; en táctil el carril sigue siendo scroll nativo con snap */
  if (!mode.motion) return;
  mm.add(PIN, () => {
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    vp.classList.add('is-pinned'); pinned = true;
    const tw = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: shell, start: 'center center', end: () => '+=' + Math.max(1, dist() * CASES_RATIO),
        pin: true, scrub: M.scrub, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => { setActive(clamp(Math.round(self.progress * (n - 1)), 0, n - 1)); }
      }
    });
    casesST = tw.scrollTrigger;
    /* arrastre: mueve la POSICIÓN DE SCROLL (un solo dueño del transform), solo con ratón */
    if (H.Draggable) {
      const proxy = document.createElement('div');
      let startScroll = 0, startX = 0;
      const apply = (d) => { if (casesST) setScroll(clamp(startScroll - (d.x - startX) * CASES_RATIO, casesST.start, casesST.end), true); };
      Draggable.create(proxy, {
        type: 'x', trigger: vp, inertia: H.InertiaPlugin, cursor: 'grab', activeCursor: 'grabbing',
        onPress() { startX = this.x; startScroll = lenis ? lenis.scroll : window.scrollY; },
        onDrag() { apply(this); }, onThrowUpdate() { apply(this); }
      });
    }
    return () => { vp.classList.remove('is-pinned'); pinned = false; casesST = null; };
  });
}

/* ═══ PESO POR LETRA DEL TITULAR (G-17) ═════════════════════════════════════
   Instrument Sans variable: cada letra engorda según la distancia al cursor. Antes subía el layout
   36× (0.16 → 5.75 ms por cuadro) porque cada cambio de peso reflujaba la línea. Ahora: al entrar el
   cursor se miden las letras UNA vez (geometría cacheada), se fija el ancho de cada una (el reflujo
   ya no se propaga y el grosor crece desde el centro) y por cuadro solo se escribe el peso de las que
   cambian, a ≤30 Hz y en pasos de 10. Se apaga a --m-ambient-idle sin movimiento y no existe antes
   de que el intro termine ni sin puntero fino. */
function initProximity() {
  if (!mode.motion || !mqOK('(pointer: fine)')) return;
  mm.add(DESK, () => {
    const display = $('heroDisplay'), hero = $('hero');
    const chars = $$('#heroDisplay .char');
    if (!display || !hero || !chars.length) return;
    const R = 260, MAXW = 700;
    let armed = false, raf = 0, last = 0, idleT = 0, offT = 0, mx = 0, my = 0, rects = [], restW = 600;
    const settled = () => document.documentElement.classList.contains('m-hero-done');

    function arm() {
      clearTimeout(offT);
      if (armed) return;
      const sy = window.scrollY;
      restW = parseFloat(window.getComputedStyle(chars[0]).fontWeight) || 600;
      rects = chars.map((c) => { const r = c.getBoundingClientRect(); return { c, x: r.left + r.width / 2, y: r.top + sy + r.height / 2, w: r.width, h: r.height, cur: restW }; });
      rects.forEach((o) => { o.c.style.width = o.w + 'px'; o.c.style.height = o.h + 'px'; });
      display.classList.remove('is-unweighing'); display.classList.add('is-weighing');
      armed = true;
    }
    function frame(t) {
      raf = 0;
      if (!armed) return;
      if (t - last >= 33) {                              /* ≤30 Hz */
        last = t;
        for (let i = 0; i < rects.length; i++) {
          const o = rects[i], d = Math.hypot(mx - o.x, my - o.y);
          const w = d < R ? Math.round((restW + (1 - d / R) * (MAXW - restW)) / 10) * 10 : restW;
          if (w !== o.cur) { o.cur = w; o.c.style.fontWeight = w; }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function disarm() {
      clearTimeout(idleT);
      if (!armed) return;
      armed = false; cancelAnimationFrame(raf); raf = 0;
      display.classList.add('is-unweighing');            /* el peso regresa con una transición corta (CSS) */
      rects.forEach((o) => { o.c.style.fontWeight = ''; });
      offT = setTimeout(() => {
        rects.forEach((o) => { o.c.style.width = ''; o.c.style.height = ''; });
        display.classList.remove('is-weighing', 'is-unweighing');
        rects = [];
      }, M.dur.base * 1000 + 60);
    }
    const onMove = (e) => {
      if ((e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') || !settled()) return;
      mx = e.clientX; my = e.clientY + window.scrollY;
      clearTimeout(idleT); idleT = setTimeout(disarm, M.ambient.idle);
      arm();
      if (!raf) raf = requestAnimationFrame(frame);
    };
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', disarm);
    window.addEventListener('resize', disarm);
    ScrollTrigger.addEventListener('refresh', disarm);
    return () => {
      hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', disarm);
      window.removeEventListener('resize', disarm); ScrollTrigger.removeEventListener('refresh', disarm);
      disarm();
    };
  });
}

/* ═══ BLOBS DE AMBIENTE Y FOOTER (G-03, G-23) ═══════════════════════════════
   Parallax solo de translateY (sin rotación). Un solo blob con morph (el del cierre), dentro de
   ambient(): se pausa fuera de pantalla. El wordmark gigante sube con scrub y suena UNA vez
   (distorsión líquida, 600 ms); en el logo del header y del pie ya no hay filtro al hover. */
function initAmbient() {
  if (!mode.motion) return;
  mm.add(DESK, () => {
    $$('.js-parallax').forEach((b, i) => {
      const d = i % 2 === 0 ? 1 : -1;
      gsap.fromTo(b, { yPercent: -PAR * d }, {
        yPercent: PAR * d, ease: 'none',
        scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: M.scrub }
      });
    });
    let h = null;
    const morphPath = document.querySelector('.amb-cierre path');
    if (H.MorphSVGPlugin && morphPath) {
      const shapes = ['#bs1', '#bs2', '#bs3', '#bs4', '#bs5', '#bs6'];
      h = ambient(morphPath.ownerSVGElement, () => {
        const tl = gsap.timeline({ repeat: -1, defaults: { duration: AMB.morph, ease: 'sine.inOut' } });
        for (let s = 0; s < shapes.length; s++) tl.to(morphPath, { morphSVG: shapes[(s + 1) % shapes.length] });
        tl.progress(gsap.utils.random(0, 1));
        return tl;
      });
    }
    return () => { if (h) h.destroy(); };
  });
}

function initFooter() {
  if (!mode.motion) return;
  mm.add(DESK, () => {
    const giant = $('footGiant'), disp = $('liqDisp');
    if (!giant) return;
    let rippled = false;
    const ripple = () => {
      if (!disp) return;
      const o = { v: 0 }, u = () => { disp.setAttribute('scale', o.v.toFixed(1)); };
      giant.classList.add('liquid-on');                  /* el filtro existe solo mientras suena */
      gsap.timeline({ onComplete: () => { giant.classList.remove('liquid-on'); disp.setAttribute('scale', '0'); } })
        .to(o, { v: 16, duration: M.dur.enter, ease: M.ease.brand, onUpdate: u })
        .to(o, { v: 0, duration: M.dur.enter * 1.2, ease: M.ease.exit, onUpdate: u });
    };
    gsap.from(giant, {
      yPercent: 100, ease: 'none',
      scrollTrigger: {
        trigger: '.footer-giant', start: 'top bottom', end: 'bottom bottom', scrub: M.scrub,
        onUpdate: (self) => { if (!rippled && self.progress >= 0.85) { rippled = true; ripple(); } }   /* una sola vez, con el gigante ya a la vista */
      }
    });
  });
}

/* ═══ ARRANQUE ══════════════════════════════════════════════════════════════ */
safe('llegadas', initArrivals);       /* siempre */
safe('casos', initCasos);             /* base siempre; ancla solo con movimiento */
safe('proceso', initProceso);         /* siempre (con reduce: todo encendido) */
safe('titulares', initHeadings);
safe('marquesina', initMarquee);
safe('datos', initDatos);
safe('manifiesto', initManifiesto);
safe('proximidad', initProximity);
safe('ambiente', initAmbient);
safe('footer', initFooter);

/* Refresh de ScrollTrigger tras carga y tras cada tanda de fuentes (el intro ya hace el suyo al terminar).
   Las fuentes web pueden llegar tarde y autoSplit re-divide los titulares: una pasada, no una por evento. */
if (mode.gsap) {
  let rt = 0;
  const later = (ms) => { clearTimeout(rt); rt = setTimeout(() => { ScrollTrigger.refresh(); }, ms); };
  if (document.readyState === 'complete') later(60); else window.addEventListener('load', () => { later(60); }, { once: true });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { later(250); });
}
