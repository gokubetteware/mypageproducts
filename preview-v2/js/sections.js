/* ============================================================================
   js/sections.js — SECCIONES Y SU MOVIMIENTO (propietario: sections)
   Marquesina, demo de llamada (codigo muerto), escritorio / movil / movimiento
   reducido (matchMedia) y refresh final. Ver js/CONTRATO.md.
   Importa de core. Con plan B no hace nada, igual que el `return` del original.
   ============================================================================ */
import { H, active, lenis, setScroll, heroTl, heroBlobs, mm, safe, ioReveal, splitHeading, makePulse, killLoader } from './core.js';

(function () {
if (!active) return;   /* GLUE: el original hacia `return` en el plan B */

/* ═══ M5: MARQUEE ═════════════════════════════════════════ */
var track = document.getElementById('marquee'), mq = null;
function buildMarquee() {
  if (!track) return;
  if (mq) mq.kill();
  gsap.set(track, { x: 0 });
  mq = gsap.to(track, { x: -track.scrollWidth / 2, duration: 26, ease: 'none', repeat: -1 });
}
buildMarquee();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildMarquee);

/* Dirección Y velocidad: el timeScale sigue a la rueda y regresa
   a 1 con un tween corto en vez de quedarse acelerado. */
var mqTS = { t: 1 };
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: function (self) {
    if (!mq) return;
    var v = self.getVelocity();
    var target = gsap.utils.clamp(-6, 6, v / 260 || (self.direction === 1 ? 1 : -1));
    if (Math.abs(target) < 1) target = self.direction;
    gsap.to(mqTS, {
      t: target, duration: 0.25, overwrite: true,
      onUpdate: function () { mq.timeScale(mqTS.t); },
      onComplete: function () {
        gsap.to(mqTS, { t: self.direction, duration: 1.2, onUpdate: function () { mq.timeScale(mqTS.t); } });
      }
    });
  }
});

/* ═══ DEMO DE LLAMADA — Sofía contestando ═══════════════════
   El HTML trae la llamada TERMINADA (transcripción completa y
   cita creada): sin JS o con movimiento reducido eso es lo que
   se ve. El motor solo rebobina y la actúa: timbra, contesta,
   escribe, agenda. Está rotulada "Demo simulada" a propósito —
   no se finge una llamada real. */
var callTl = null, autoReplay = null;
function playCall() {
  var card = document.getElementById('callCard');
  if (!card) return;
  var bars = card.querySelectorAll('#ccWave span');
  var lines = Array.prototype.slice.call(card.querySelectorAll('.cl'));
  var texts = lines.map(function (l) { return l.getAttribute('data-full') || l.querySelector('.tx').textContent; });
  lines.forEach(function (l, i) { l.setAttribute('data-full', texts[i]); });
  var status = document.getElementById('ccStatus');
  var timerEl = document.getElementById('ccTimer');
  var chip = document.getElementById('ccChip');
  var replay = document.getElementById('ccReplay');
  var speakTween = null;

  function speak(on) {
    if (speakTween) { speakTween.kill(); speakTween = null; }
    if (on) {
      speakTween = gsap.to(bars, {
        scaleY: function () { return gsap.utils.random(0.15, 1); },
        duration: 0.13, ease: 'sine.inOut', repeat: -1, repeatRefresh: true,
        stagger: { each: 0.015, from: 'random' }
      });
    } else {
      /* En reposo no se apaga: respira bajito. Una tarjeta de "voz
         en vivo" con la onda plana parece descompuesta. */
      speakTween = gsap.to(bars, {
        scaleY: function () { return gsap.utils.random(0.08, 0.26); },
        duration: 0.5, ease: 'sine.inOut', repeat: -1, repeatRefresh: true,
        stagger: { each: 0.03, from: 'random' }
      });
    }
  }
  function typeLine(i) {
    var span = lines[i].querySelector('.tx'), full = texts[i], o = { n: 0 };
    return gsap.to(o, {
      n: full.length, duration: full.length * 0.026, ease: 'none',
      onStart: function () { gsap.set(lines[i], { autoAlpha: 1, y: 0 }); },
      onUpdate: function () { span.textContent = full.slice(0, Math.round(o.n)); }
    });
  }

  if (callTl) callTl.kill();
  if (autoReplay) { autoReplay.kill(); autoReplay = null; }
  speak(false);
  lines.forEach(function (l) { l.querySelector('.tx').textContent = ''; gsap.set(l, { autoAlpha: 0, y: 8 }); });
  gsap.set(chip, { autoAlpha: 0, y: 6 });
  gsap.set(replay, { autoAlpha: 0 });
  replay.style.display = 'none';
  card.classList.add('ringing');
  status.textContent = 'Llamada entrante…';
  timerEl.textContent = '00:00';
  var t = { s: 0 };

  callTl = gsap.timeline();
  callTl
    .call(function () { card.classList.remove('ringing'); status.textContent = 'En llamada'; }, null, 1.4)
    .to(t, { s: 18, duration: 9.5, ease: 'none',
      onUpdate: function () { timerEl.textContent = '00:' + String(Math.round(t.s)).padStart(2, '0'); } }, 1.4)
    .add(typeLine(0), 1.7)
    .call(function () { speak(true); status.textContent = 'Sofía está hablando…'; }, null, '>0.15')
    .add(typeLine(1), '<')
    .call(function () { speak(false); status.textContent = 'En llamada'; }, null, '>0.1')
    .add(typeLine(2), '>0.3')
    .call(function () { speak(true); status.textContent = 'Sofía está hablando…'; }, null, '>0.15')
    .add(typeLine(3), '<')
    .call(function () { speak(false); status.textContent = 'Cita agendada'; }, null, '>0.2')
    .to(chip, { autoAlpha: 1, y: 0, duration: 0.5 }, '>0.1')
    .call(function () { replay.style.display = 'inline-block'; }, null, '>0.3')
    .to(replay, { autoAlpha: 1, duration: 0.4 }, '<')
    /* Bucle largo: la conversación se repite sola cada 7 s */
    .call(function () { autoReplay = gsap.delayedCall(7, playCall); }, null, '>0.1');
}
(function () {
  var replay = document.getElementById('ccReplay');
  if (replay) replay.addEventListener('click', playCall);
  if (document.getElementById('callCard')) {
    ScrollTrigger.create({
      trigger: '#callCard', start: 'top 88%', once: true,
      onEnter: function () { gsap.delayedCall(2.8, playCall); }
    });
  }
})();

/* ═══════════════════════════════════════════════════════════
   matchMedia: tres contextos. GSAP revierte solo lo que se creó
   dentro de cada uno al cambiar de breakpoint, así que un giro de
   tablet no deja pins huérfanos ni triggers zombis.
   ═══════════════════════════════════════════════════════════ */

/* ─────────── DESKTOP ─────────── */
mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', function () {

  document.querySelectorAll('.js-mask').forEach(splitHeading);

  document.querySelectorAll('.js-words').forEach(function (p) {
    if (!H.SplitText) { gsap.to(p, { opacity: 1, scrollTrigger: { trigger: p, start: 'top 88%', once: true } }); return; }
    SplitText.create(p, {
      type: 'lines,words', wordsClass: 'word', autoSplit: true, aria: 'auto',
      onSplit: function (self) {
        gsap.set(p, { opacity: 1 });
        return gsap.from(self.words, {
          opacity: 0, y: 18, duration: 0.8, stagger: 0.022,
          scrollTrigger: { trigger: p, start: 'top 88%', once: true }
        });
      }
    });
  });

  gsap.set('.js-fade', { y: 32 });
  ScrollTrigger.batch('.js-fade', {
    start: 'top 90%', once: true,
    onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 0.95, stagger: 0.06, overwrite: 'auto' }); }
  });

  /* P9 — los items entran recortados desde la izquierda y su
     cuadrito gira 90° al aterrizar */
  document.querySelectorAll('.js-list').forEach(function (ul) {
    var items = ul.querySelectorAll('li');
    gsap.fromTo(items,
      { clipPath: 'inset(0% 100% 0% 0%)', x: -14 },
      {
        clipPath: 'inset(0% 0% 0% 0%)', x: 0, duration: 0.75, stagger: 0.07,
        scrollTrigger: { trigger: ul, start: 'top 88%', once: true }
      });
    ScrollTrigger.create({
      trigger: ul, start: 'top 88%', once: true,
      onEnter: function () {
        items.forEach(function (li, k) { setTimeout(function () { li.classList.add('in'); }, k * 70); });
      }
    });
  });

  /* M6 — hairlines dibujadas con DrawSVG y scrub */
  document.querySelectorAll('.js-draw line').forEach(function (ln) {
    if (H.DrawSVGPlugin) {
      gsap.fromTo(ln, { drawSVG: '0%' }, {
        drawSVG: '100%', ease: 'none',
        scrollTrigger: { trigger: ln.parentNode, start: 'top 95%', end: 'top 55%', scrub: true }
      });
    } else {
      gsap.fromTo(ln.parentNode, { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left', ease: 'none',
        scrollTrigger: { trigger: ln.parentNode, start: 'top 95%', end: 'top 55%', scrub: true } });
    }
  });

  safe('datos', function () {
  /* FIX: los contadores del hero solo estaban cableados en móvil;
     en desktop se quedaban en 0 para siempre. */
  gsap.utils.toArray('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var sfx = el.getAttribute('data-suffix') || '';
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: function () {
        var o = { v: 0 };
        gsap.to(o, { v: target, duration: 1.6, ease: 'power3.out',
          onUpdate: function () { el.textContent = Math.round(o.v) + sfx; } });
      }
    });
  });

  /* ═══ GRÁFICA DEL DÍA ═══
     Las dos líneas se dibujan con scrub — el scroll ES el día
     transcurriendo. El marcador de las 23:07 y las barras entran
     una sola vez, cuando la gráfica ya se armó. */
  if (H.DrawSVGPlugin && document.getElementById('chartA')) {
    var chartPulse = makePulse(document.getElementById('cASofia'), 3.6);
    gsap.set(['#cAManual', '#cASofia', '#cASofiaGlow'], { drawSVG: '0%' });
    gsap.set('#cAArea', { opacity: 0 });
    gsap.set('#cAMark', { opacity: 0, scale: 0.6, transformOrigin: '92% 20%' });
    gsap.timeline({
      scrollTrigger: { trigger: '#chartA', start: 'top 84%', end: 'top 32%', scrub: true }
    })
      .to('#cAManual', { drawSVG: '100%', ease: 'none' }, 0)
      .to(['#cASofiaGlow', '#cASofia'], { drawSVG: '100%', ease: 'none' }, 0.18);
    ScrollTrigger.create({
      trigger: '#chartA', start: 'top 40%', once: true,
      onEnter: function () {
        gsap.to('#cAArea', { opacity: 0.07, duration: 0.8 });
        gsap.to('#cAMark', { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' });
        /* y a partir de aquí, la gráfica queda VIVA en bucle */
        gsap.to('#cAArea', { opacity: 0.12, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 });
        var ring = document.querySelector('#cAMark .cA-dot');
        if (ring) {
          var pulseRing = ring.cloneNode(false);
          pulseRing.setAttribute('class', 'cA-dot');
          pulseRing.setAttribute('fill', 'none');
          pulseRing.setAttribute('stroke', '#8B6DE8');
          ring.parentNode.appendChild(pulseRing);
          gsap.fromTo(pulseRing, { attr: { r: 5 }, opacity: 0.8 },
            { attr: { r: 16 }, opacity: 0, duration: 1.9, ease: 'power1.out', repeat: -1 });
        }
        if (chartPulse) chartPulse();
      }
    });
  }
  gsap.utils.toArray('.bar-fill').forEach(function (b) {
    ScrollTrigger.create({
      trigger: b, start: 'top 90%', once: true,
      onEnter: function () { gsap.to(b, { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }); }
    });
  });
  if (H.DrawSVGPlugin && document.getElementById('flowPath')) {
    var flowPulse = makePulse(document.getElementById('flowPath'), 4.2);
    gsap.set('#flowPath', { drawSVG: '0%' });
    ScrollTrigger.create({
      trigger: '#flowRec', start: 'top 82%', once: true,
      onEnter: function () {
        gsap.to('#flowPath', {
          drawSVG: '100%', duration: 1.6, ease: 'power2.inOut',
          onComplete: function () { if (flowPulse) flowPulse(); }
        });
      }
    });
  }


  });

  safe('voz', function () {
  /* ═══ HUELLA DE VOZ de cada producto ═══
     (la línea de voz por sección se retiró: la firma la lleva
     ahora el listón de scroll WebGL de la orilla derecha) */
  if (H.DrawSVGPlugin) {
    /* Huella de voz de cada producto: se dibuja al activarse su
       tarjeta, en el color del producto */
    document.querySelectorAll('.mini-line path').forEach(function (mp) {
      gsap.set(mp, { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: mp.closest('.stack-slot') || mp, start: 'top 55%', once: true,
        onEnter: function () { gsap.to(mp, { drawSVG: '100%', duration: 1.3, ease: 'power2.inOut' }); }
      });
    });
  }


  });

  safe('remates', function () {
  /* ═══ REMATES: entran letra por letra y quedan brillando ═══ */
  document.querySelectorAll('.js-punch').forEach(function (el) {
    if (!H.SplitText) return;
    SplitText.create(el, {
      type: 'lines,chars', charsClass: 'char', linesClass: 'split-line',
      mask: 'lines', autoSplit: true, aria: 'auto',
      onSplit: function (self) {
        return gsap.from(self.chars, {
          yPercent: 115, opacity: 0, duration: 0.85, ease: 'expo.out',
          stagger: { each: 0.025 },
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      }
    });
  });


  });

  safe('proximidad', function () {
  /* ═══ TEXTO QUE REACCIONA AL CURSOR ═══
     Instrument Sans cargada como variable: cada letra del titular
     engorda según la distancia al mouse. Coordenadas de página,
     no de viewport, para que el caché sobreviva al scroll. */
  (function () {
    var chars = gsap.utils.toArray('#heroDisplay .char');
    var hero = document.getElementById('hero');
    if (!chars.length || !hero || !window.matchMedia('(pointer: fine)').matches) return;
    var rects = [];
    function cache() {
      var sy = window.pageYOffset;
      rects = chars.map(function (c) {
        var r = c.getBoundingClientRect();
        return { c: c, x: r.left + r.width / 2, y: r.top + sy + r.height / 2 };
      });
    }
    ScrollTrigger.addEventListener('refresh', cache);
    var raf = false, mx = 0, my = 0, over = false;
    hero.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY + window.pageYOffset; over = true;
      if (!raf) { raf = true; requestAnimationFrame(apply); }
    });
    hero.addEventListener('mouseleave', function () {
      over = false;
      chars.forEach(function (c) { c.style.fontWeight = ''; });
    });
    function apply() {
      raf = false;
      if (!over || heroTl.isActive()) return;
      if (!rects.length) cache();
      for (var i = 0; i < rects.length; i++) {
        var d = Math.hypot(mx - rects[i].x, my - rects[i].y);
        rects[i].c.style.fontWeight = d < 260 ? Math.round(600 + (1 - d / 260) * 100) : 600; /* Instrument Sans variable llega a 700 */
      }
    }
  })();


  });

  safe('liquido-morph', function () {
  /* ═══ DISTORSIÓN LÍQUIDA ═══
     El displacement vive en 0 (gratis) y solo sube en ráfagas de
     medio segundo: el costo del filtro existe únicamente mientras
     se ve. Wordmark al hover; el gigante del footer, una vez. */
  (function () {
    var disp = document.getElementById('liqDisp');
    if (!disp) return;
    var busy = false;
    function ripple(el, max) {
      if (busy) return;
      busy = true;
      el.classList.add('liquid-on');
      var o = { v: 0 };
      function u() { disp.setAttribute('scale', o.v.toFixed(1)); }
      gsap.timeline({ onComplete: function () { el.classList.remove('liquid-on'); busy = false; } })
        .to(o, { v: max, duration: 0.28, ease: 'power2.out', onUpdate: u })
        .to(o, { v: 0, duration: 0.6, ease: 'power2.inOut', onUpdate: u });
    }
    document.querySelectorAll('.wordmark').forEach(function (w) {
      w.addEventListener('mouseenter', function () { ripple(w, 22); });
    });
    ScrollTrigger.create({
      trigger: '#footGiant', start: 'top 96%', once: true,
      onEnter: function () { ripple(document.getElementById('footGiant'), 32); }
    });
  })();

  /* G4 — morph infinito con tiempos desfasados por blob */
  if (H.MorphSVGPlugin) {
    var shapes = ['#bs1', '#bs2', '#bs3', '#bs4', '#bs5', '#bs6'];
    document.querySelectorAll('[data-morph] path').forEach(function (p, i) {
      var tl = gsap.timeline({ repeat: -1, defaults: { duration: 2.6 + (i % 3) * 0.5, ease: 'sine.inOut' } });
      for (var s = 0; s < shapes.length; s++) tl.to(p, { morphSVG: shapes[(i + s + 1) % shapes.length] });
      tl.progress(gsap.utils.random(0, 1));   /* desfase para que no latan al unísono */
    });
  }


  });

  safe('parallax', function () {
  /* Parallax de los blobs que no son del hero */
  gsap.utils.toArray('.js-parallax').forEach(function (b, i) {
    var d = i % 2 === 0 ? 1 : -1;
    gsap.fromTo(b, { yPercent: -14 * d, rotate: -12 * d }, {
      yPercent: 14 * d, rotate: 12 * d, ease: 'none',
      scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
  });

  /* Deriva orbital de los blobs: dos ejes con periodos distintos
     (16–33 s) — órbitas largas que nunca se sienten repetidas.
     El scaleX/Y por velocidad lo escribe el observador global. */
  heroBlobs.forEach(function (b, i) {
    var d = i % 2 === 0 ? 1 : -1;
    gsap.to(b, { x: 34 * d, duration: 16 + i * 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3 });
    gsap.to(b, { y: -26 * d, duration: 21 + i * 4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3.6 });
    gsap.to(b, { rotate: 8 * d, duration: 27 + i * 5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });

  /* Aurora del fondo: ciclos de 38–52 s */
  gsap.to('.au1', { x: 120, y: 60, duration: 46, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.au2', { x: -90, y: 80, duration: 38, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.au3', { x: 70, y: -70, duration: 52, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.au', { scale: 1.18, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 3.5 });


  });

  safe('manifiesto', function () {
  /* ═══ G2 — MANIFIESTO ═══
     El anclaje lo hace `position: sticky` desde CSS. Aquí solo va
     el barrido de color, siempre con scrub: es el scroll el que
     conduce la iluminación, no un disparo. */
  var mfText = document.getElementById('manifestoText');
  if (mfText && H.SplitText) {
    var mfSplit = SplitText.create(mfText, { type: 'lines,words', wordsClass: 'word', autoSplit: true, aria: 'auto' });
    var endEl = document.getElementById('mfEnd');
    var mfDialEl = document.querySelector('.mf-dial');
    var dialC = 2 * Math.PI * 28;
    gsap.set('#mfDial', { strokeDasharray: dialC, strokeDashoffset: dialC });
    var plain = [], grad = [];
    mfSplit.words.forEach(function (w) { (endEl && endEl.contains(w) ? grad : plain).push(w); });
    var units = plain.concat(grad);
    var gRamp = gsap.utils.interpolate(['#8B6DE8', '#D3C8F6']);
    var lastLive = null;

    gsap.set(units, { y: 12 });   /* cada palabra sube un pelo al encenderse */

    var mfTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.manifesto', start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: function (self) {
          document.getElementById('mfPct').textContent = Math.round(self.progress * 100);
          gsap.set('#mfDial', { strokeDashoffset: dialC * (1 - self.progress) });
          /* Karaoke: la palabra bajo la aguja del scroll resplandece */
          var i = Math.min(units.length - 1, Math.floor(self.progress * units.length));
          var live = (self.progress > 0.015 && self.progress < 0.985) ? units[i] : null;
          if (live !== lastLive) {
            if (lastLive) lastLive.classList.remove('w-live');
            if (live) live.classList.add('w-live');
            lastLive = live;
          }
          /* Al 100%: el número se enciende y la frase final queda
             brillando en bucle. Reversible si el usuario regresa. */
          var done = self.progress > 0.985;
          if (mfDialEl) mfDialEl.classList.toggle('done', done);
          if (endEl) endEl.classList.toggle('mf-shine', done);
        }
      }
    });
    mfTl.to(plain, { color: '#EDEAF3', y: 0, duration: 1, ease: 'none', stagger: { each: 1 } }, 0);
    grad.forEach(function (w, i) {
      mfTl.to(w, { color: gRamp(grad.length > 1 ? i / (grad.length - 1) : 0), y: 0, duration: 1, ease: 'none' }, plain.length + i);
    });

    /* Ondas de voz en bucle infinito: dos capas a distinta velocidad
       y respiración vertical desfasada — la sección nunca está quieta */
    gsap.to('.mf-wave.w1', { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
    gsap.to('.mf-wave.w2', { xPercent: -50, duration: 44, ease: 'none', repeat: -1 });
    gsap.to('.mf-wave.w1', { y: 16, duration: 5.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.mf-wave.w2', { y: -14, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2 });

    /* Blob gigante: 8 estados orgánicos, ciclo ~34 s, NUNCA se para.
       Dos capas de movimiento: el morph deforma el contorno y un
       transform de deriva lo pasea; periodos distintos para que
       nunca se sienta que se repite. */
    if (H.MorphSVGPlugin) {
      var orbP = document.getElementById('orbPath');
      if (orbP) {
        var orbShapes = [
          'M183.2,100.0 C186.5,106.6 189.8,114.8 190.1,122.2 C190.4,129.6 188.6,138.2 185.0,144.6 C181.3,151.0 174.7,156.8 168.2,160.4 C161.7,164.0 153.1,165.6 145.8,166.4 C138.6,167.2 131.1,165.8 124.8,165.4 C118.4,164.9 113.2,163.6 107.7,163.7 C102.3,163.8 97.7,164.8 92.0,166.0 C86.2,167.1 80.1,169.7 73.2,170.6 C66.3,171.5 58.0,172.8 50.7,171.5 C43.3,170.2 34.9,167.3 29.1,162.8 C23.3,158.3 18.1,151.2 15.7,144.2 C13.3,137.3 13.3,128.4 14.5,121.1 C15.8,113.7 19.8,106.2 23.2,100.0 C26.5,93.8 31.4,88.9 34.7,83.9 C38.1,79.0 41.0,75.2 43.3,70.2 C45.6,65.3 46.5,60.2 48.4,54.3 C50.4,48.4 51.7,41.1 54.9,34.7 C58.2,28.3 62.5,20.7 68.0,15.8 C73.6,10.8 81.2,6.3 88.5,4.9 C95.7,3.5 104.4,4.5 111.3,7.1 C118.2,9.8 124.9,15.6 130.0,21.0 C135.0,26.5 138.4,33.8 141.6,39.8 C144.7,45.7 146.2,51.7 148.9,56.7 C151.5,61.7 153.9,65.5 157.4,69.9 C160.9,74.2 165.6,77.8 169.9,82.8 C174.2,87.8 179.8,93.4 183.2,100.0 Z',
          'M196.4,100.0 C199.2,107.4 201.1,117.1 199.0,124.4 C196.8,131.7 189.7,138.7 183.6,143.9 C177.5,149.1 169.0,151.9 162.6,155.4 C156.1,159.0 150.9,162.6 145.0,165.1 C139.0,167.7 133.1,170.9 126.9,170.9 C120.7,170.9 113.5,167.9 107.9,165.2 C102.3,162.5 98.0,156.9 93.3,154.8 C88.7,152.8 85.2,152.7 80.0,152.8 C74.7,153.0 67.7,156.0 61.7,155.5 C55.6,155.1 48.7,153.2 43.5,150.0 C38.4,146.8 35.2,141.2 31.0,136.2 C26.7,131.3 22.6,126.2 18.0,120.2 C13.5,114.2 6.4,107.4 3.6,100.0 C0.8,92.6 -1.1,82.9 1.0,75.6 C3.2,68.3 10.3,61.3 16.4,56.1 C22.5,50.9 31.0,48.1 37.4,44.6 C43.9,41.0 49.1,37.4 55.0,34.9 C61.0,32.3 66.9,29.1 73.1,29.1 C79.3,29.1 86.5,32.1 92.1,34.8 C97.7,37.5 102.0,43.1 106.7,45.2 C111.3,47.2 114.8,47.3 120.0,47.2 C125.3,47.0 132.3,44.0 138.3,44.5 C144.4,44.9 151.3,46.8 156.5,50.0 C161.6,53.2 164.8,58.8 169.0,63.8 C173.3,68.7 177.4,73.8 182.0,79.8 C186.5,85.8 193.6,92.6 196.4,100.0 Z',
          'M189.7,100.0 C192.5,106.8 193.4,116.0 190.6,122.3 C187.8,128.7 179.1,134.1 172.9,138.2 C166.6,142.4 158.2,143.3 153.1,147.0 C147.9,150.8 145.6,155.0 141.9,160.8 C138.3,166.5 136.1,176.2 131.0,181.6 C125.9,187.1 118.2,192.8 111.3,193.3 C104.5,193.7 95.9,188.8 89.7,184.5 C83.6,180.3 79.5,171.8 74.4,167.6 C69.3,163.4 65.4,161.1 59.1,159.2 C52.8,157.3 43.7,158.7 36.7,156.1 C29.7,153.5 20.5,149.5 16.9,143.6 C13.2,137.8 13.2,128.3 14.7,121.0 C16.2,113.8 23.0,106.3 25.7,100.0 C28.5,93.7 31.1,89.4 31.4,83.1 C31.7,76.8 27.8,69.5 27.7,62.0 C27.5,54.6 26.8,44.3 30.3,38.3 C33.8,32.2 41.7,27.4 48.8,25.8 C55.9,24.1 65.7,27.5 72.8,28.3 C79.9,29.1 85.4,31.5 91.6,30.5 C97.7,29.4 102.7,24.4 109.5,21.7 C116.3,19.0 125.4,13.8 132.5,14.3 C139.6,14.7 147.8,18.7 152.3,24.3 C156.8,29.8 157.8,40.1 159.4,47.3 C161.1,54.5 159.7,61.7 162.1,67.4 C164.5,73.2 169.3,76.3 173.9,81.8 C178.6,87.2 187.0,93.2 189.7,100.0 Z',
          'M195.3,100.0 C197.4,107.4 198.4,116.4 196.5,123.8 C194.6,131.1 189.6,138.7 184.1,144.1 C178.5,149.5 170.2,153.1 163.3,156.1 C156.5,159.2 149.2,160.2 143.0,162.3 C136.8,164.4 131.7,166.4 126.1,168.8 C120.5,171.2 115.3,175.0 109.3,177.0 C103.4,178.9 96.4,181.2 90.2,180.7 C84.0,180.1 77.0,177.5 72.1,173.5 C67.2,169.6 63.4,162.7 60.7,156.9 C58.1,151.1 57.6,144.1 56.3,138.7 C54.9,133.4 54.5,129.1 52.5,124.9 C50.6,120.7 47.4,117.9 44.4,113.7 C41.4,109.6 36.8,105.1 34.7,100.0 C32.5,94.9 30.8,88.5 31.6,83.1 C32.3,77.8 35.5,72.2 39.1,68.0 C42.7,63.9 48.5,61.2 53.0,58.4 C57.5,55.6 62.2,54.1 66.3,51.1 C70.3,48.1 73.3,44.6 77.4,40.4 C81.5,36.1 85.5,30.0 91.0,25.8 C96.5,21.5 103.5,16.6 110.3,14.9 C117.2,13.2 125.4,13.5 131.9,15.8 C138.4,18.0 144.5,23.5 149.4,28.5 C154.2,33.5 157.3,40.3 161.0,46.0 C164.6,51.7 167.5,57.0 171.3,62.6 C175.2,68.1 180.1,73.0 184.1,79.3 C188.1,85.5 193.2,92.6 195.3,100.0 Z',
          'M195.3,100.0 C193.1,107.2 186.4,114.4 181.2,120.0 C176.0,125.6 168.7,129.1 164.0,133.6 C159.3,138.1 156.2,141.6 153.2,147.1 C150.2,152.6 149.3,159.9 146.0,166.7 C142.7,173.4 138.9,182.4 133.2,187.5 C127.5,192.5 119.1,196.8 111.8,197.1 C104.5,197.5 95.7,193.7 89.1,189.5 C82.6,185.4 77.5,177.5 72.6,172.2 C67.8,166.9 65.0,161.4 60.2,157.7 C55.4,153.9 50.2,152.5 43.9,149.7 C37.6,146.9 28.7,145.2 22.4,140.8 C16.0,136.3 8.6,130.1 5.6,123.3 C2.7,116.5 2.5,107.2 4.7,100.0 C6.9,92.8 13.6,85.6 18.8,80.0 C24.0,74.4 31.3,70.9 36.0,66.4 C40.7,61.9 43.8,58.4 46.8,52.9 C49.8,47.4 50.7,40.1 54.0,33.3 C57.3,26.6 61.1,17.6 66.8,12.5 C72.5,7.5 80.9,3.2 88.2,2.9 C95.5,2.5 104.3,6.3 110.9,10.5 C117.4,14.6 122.5,22.5 127.4,27.8 C132.2,33.1 135.0,38.6 139.8,42.3 C144.6,46.1 149.8,47.5 156.1,50.3 C162.4,53.1 171.3,54.8 177.6,59.2 C184.0,63.7 191.4,69.9 194.4,76.7 C197.3,83.5 197.5,92.8 195.3,100.0 Z',
          'M190.7,100.0 C191.5,106.5 184.6,113.8 181.5,120.1 C178.5,126.4 174.3,131.0 172.3,138.0 C170.3,144.9 173.0,155.4 169.7,161.7 C166.4,168.1 159.5,174.3 152.4,175.9 C145.3,177.5 134.3,171.9 127.0,171.3 C119.8,170.7 114.9,170.9 108.8,172.3 C102.7,173.6 96.1,180.2 90.4,179.5 C84.6,178.8 78.3,173.0 74.1,168.2 C70.0,163.3 69.5,154.1 65.2,150.4 C60.9,146.7 54.4,148.0 48.2,145.9 C41.9,143.8 31.6,142.5 27.7,137.9 C23.9,133.4 25.4,124.8 24.9,118.5 C24.5,112.2 26.9,106.7 24.9,100.0 C22.9,93.3 14.8,86.0 13.1,78.6 C11.5,71.2 11.1,61.2 15.1,55.4 C19.0,49.7 30.4,47.8 37.0,44.2 C43.6,40.6 49.2,38.4 54.5,34.0 C59.7,29.6 62.8,20.2 68.8,17.6 C74.7,15.0 83.6,15.7 90.1,18.5 C96.6,21.4 102.3,31.4 108.0,34.5 C113.6,37.6 117.8,36.9 123.8,37.3 C129.7,37.7 138.7,34.3 143.6,36.8 C148.5,39.4 151.0,47.2 153.4,52.7 C155.9,58.1 154.2,64.8 158.1,69.5 C162.0,74.2 171.3,76.0 176.7,81.1 C182.2,86.2 189.9,93.5 190.7,100.0 Z',
          'M192.3,100.0 C194.2,106.7 191.6,115.7 187.4,121.5 C183.2,127.4 172.1,130.5 166.8,135.1 C161.5,139.7 158.3,142.9 155.5,149.2 C152.8,155.5 154.0,166.5 150.2,172.8 C146.5,179.1 139.8,186.0 133.0,187.1 C126.3,188.2 116.6,182.0 109.6,179.4 C102.7,176.8 97.8,171.9 91.3,171.6 C84.8,171.4 77.9,177.0 70.4,177.9 C63.0,178.9 52.3,180.9 46.6,177.3 C40.9,173.8 38.0,163.8 36.2,156.5 C34.4,149.3 37.7,140.0 35.7,133.7 C33.7,127.4 28.7,124.3 24.1,118.7 C19.4,113.1 9.7,106.7 7.7,100.0 C5.8,93.3 8.4,84.3 12.6,78.5 C16.8,72.6 27.9,69.5 33.2,64.9 C38.5,60.3 41.7,57.1 44.5,50.8 C47.2,44.5 46.0,33.5 49.8,27.2 C53.5,20.9 60.2,14.0 67.0,12.9 C73.7,11.8 83.4,18.0 90.4,20.6 C97.3,23.2 102.2,28.1 108.7,28.4 C115.2,28.6 122.1,23.0 129.6,22.1 C137.0,21.1 147.7,19.1 153.4,22.7 C159.1,26.2 162.0,36.2 163.8,43.5 C165.6,50.7 162.3,60.0 164.3,66.3 C166.3,72.6 171.3,75.7 175.9,81.3 C180.6,86.9 190.3,93.3 192.3,100.0 Z',
          'M189.5,100.0 C189.7,106.6 186.4,114.8 181.5,120.1 C176.7,125.4 166.7,128.6 160.4,131.7 C154.0,134.8 147.4,134.9 143.6,138.6 C139.7,142.3 139.5,147.4 137.2,153.8 C134.8,160.3 133.6,171.0 129.3,177.2 C124.9,183.5 117.7,190.0 111.1,191.5 C104.5,192.9 95.9,189.4 89.6,185.9 C83.3,182.4 78.3,175.1 73.2,170.7 C68.1,166.3 64.0,162.9 58.8,159.7 C53.6,156.5 46.9,155.1 42.1,151.3 C37.4,147.4 32.2,142.3 30.3,136.6 C28.3,130.9 29.8,123.2 30.6,117.1 C31.5,111.0 35.2,105.6 35.5,100.0 C35.7,94.4 33.9,89.9 32.0,83.2 C30.1,76.6 24.6,67.9 24.0,60.1 C23.4,52.3 24.0,42.0 28.3,36.5 C32.6,31.0 42.0,27.6 49.7,27.1 C57.4,26.6 67.5,31.3 74.7,33.2 C81.8,35.1 87.0,38.6 92.5,38.6 C98.1,38.5 102.3,35.0 108.1,33.0 C114.0,31.0 121.4,26.7 127.8,26.7 C134.2,26.7 141.3,29.2 146.3,33.0 C151.2,36.7 154.0,43.8 157.4,49.2 C160.8,54.5 162.8,59.9 166.6,65.0 C170.4,70.2 176.3,74.4 180.2,80.2 C184.0,86.1 189.2,93.4 189.5,100.0 Z'
        ];
        var orbTl = gsap.timeline({ repeat: -1, defaults: { duration: 2.7, ease: 'sine.inOut' } });
        for (var oi = 0; oi < orbShapes.length; oi++) {
          orbTl.to(orbP, { morphSVG: orbShapes[(oi + 1) % orbShapes.length] });
        }
        /* Deriva: dos ejes + rotación + escala, todos desfasados */
        gsap.to('.mf-orb', { x: 36, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to('.mf-orb', { y: -28, duration: 23, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });
        gsap.to('.mf-orb', { rotate: 14, duration: 31, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to('.mf-orb', { scale: 1.08, duration: 13, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 4 });
      }
    }
  } else if (mfText) {
    gsap.to(mfText, { color: '#EDEAF3', scrollTrigger: { trigger: '.manifesto', start: 'top center', once: true } });
  }


  });

  safe('stack', function () {
  /* ═══ G5 — PRODUCTOS APILADOS ═══
     El pin es `position: sticky` (CSS): no genera pin-spacers, no
     hay que recalcular en resize y no pelea con Lenis. ScrollTrigger
     solo maneja el clip-path de entrada y el hundimiento de la
     tarjeta anterior. */
  var slots = gsap.utils.toArray('.stack-slot');
  slots.forEach(function (slot, i) {
    var item = slot.querySelector('.stack-item');
    if (i > 0) {
      gsap.fromTo(item, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: slot, start: 'top bottom', end: 'top top', scrub: true }
      });
      var prev = slots[i - 1].querySelector('.stack-item');
      gsap.to(prev, {
        scale: 0.92, opacity: 0.4, ease: 'none',
        scrollTrigger: { trigger: slot, start: 'top bottom', end: 'top top', scrub: true }
      });
    }
  });


  });

  safe('casos', function () {
  /* ═══ CASOS: pin horizontal + M2 arrastre ═══ */
  var casesTrack = document.getElementById('casesTrack');
  var casesShell = document.getElementById('casesShell');
  var casesBar = document.getElementById('casesBar');
  var casesST = null;
  if (casesTrack && casesShell) {
    var dist = function () { return Math.max(0, casesTrack.scrollWidth - window.innerWidth); };
    var tween = gsap.to(casesTrack, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: casesShell, start: 'center center',
        end: function () { return '+=' + (dist() * 1.15); },
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (self) { gsap.set(casesBar, { scaleX: self.progress }); }
      }
    });
    casesST = tween.scrollTrigger;

    /* M2 — Draggable NO toca la x del track: el pin ya es su dueño
       y los dos escribiendo el mismo transform se pelean (al soltar,
       el scroll lo regresaba de un tirón). En vez de eso el arrastre
       mueve la POSICIÓN DE SCROLL, y el scrub del pin traduce eso a
       desplazamiento horizontal. Un solo dueño, cero conflicto. */
    if (H.Draggable) {
      var proxy = document.createElement('div');
      var startScroll = 0, startX = 0;
      var RATIO = 1.15;   /* misma relación que el `end` del pin */

      Draggable.create(proxy, {
        type: 'x',
        trigger: document.getElementById('casesViewport'),
        inertia: H.InertiaPlugin,
        cursor: 'grab', activeCursor: 'grabbing',
        onPress: function () {
          startX = this.x;
          startScroll = lenis ? lenis.scroll : window.scrollY;
        },
        onDrag: function () { applyDrag(this); },
        onThrowUpdate: function () { applyDrag(this); }
      });

      function applyDrag(d) {
        if (!casesST) return;
        var target = gsap.utils.clamp(casesST.start, casesST.end, startScroll - (d.x - startX) * RATIO);
        setScroll(target, true);
      }
    }
  }


  });

  safe('footer', function () {
  /* ═══ P7 — wordmark gigante del footer ═══ */
  gsap.from('#footGiant', {
    yPercent: 100, ease: 'none',
    scrollTrigger: { trigger: '.footer-giant', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  });


  return function () { /* GSAP revierte lo de este contexto solo */ };
});

/* ─────────── MÓVIL ───────────
   Aquí NO se usa ScrollTrigger.batch: crea un trigger por elemento
   y con ~50 nodos revelables el conteo se dispararía muy por encima
   del tope de 10. IntersectionObserver hace lo mismo con cero
   triggers y lo descarga el propio navegador. Cero pins. */
mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', function () {

  var fades = Array.prototype.slice.call(document.querySelectorAll('.js-fade'));
  gsap.set(fades, { y: 26 });
  ioReveal(fades, function (el) { gsap.to(el, { opacity: 1, y: 0, duration: 0.8 }); });

  var heads = Array.prototype.slice.call(document.querySelectorAll('.js-mask'));
  ioReveal(heads, function (el) {
    if (!H.SplitText) { gsap.from(el, { opacity: 0, y: 24, duration: 0.8 }); return; }
    var s = SplitText.create(el, { type: 'lines', linesClass: 'split-line', mask: 'lines', aria: 'auto' });
    gsap.from(s.lines, { yPercent: 115, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' });
  });

  ioReveal(Array.prototype.slice.call(document.querySelectorAll('.js-punch')), function (el) {
    gsap.from(el, { opacity: 0, y: 16, duration: 0.7 });
  });

  var paras = Array.prototype.slice.call(document.querySelectorAll('.js-words'));
  ioReveal(paras, function (el) { gsap.to(el, { opacity: 1, y: 0, duration: 0.8 }); });
  gsap.set(paras, { y: 20 });

  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  ioReveal(counters, function (el) {
    var o = { v: 0 }, target = parseInt(el.getAttribute('data-count'), 10), sfx = el.getAttribute('data-suffix') || '';
    gsap.to(o, { v: target, duration: 1.5, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v) + sfx; } });
  });

  ioReveal(Array.prototype.slice.call(document.querySelectorAll('.js-draw')), function (el) {
    var ln = el.querySelector('line');
    if (H.DrawSVGPlugin && ln) gsap.fromTo(ln, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1 });
  });

  if (H.DrawSVGPlugin && document.getElementById('chartA')) {
    gsap.set(['#cAManual', '#cASofia', '#cASofiaGlow'], { drawSVG: '0%' });
    gsap.set('#cAArea', { opacity: 0 });
    gsap.set('#cAMark', { opacity: 0 });
    ioReveal([document.getElementById('chartA')], function () {
      var mPulse = makePulse(document.getElementById('cASofia'), 3.6);
      gsap.timeline()
        .to('#cAManual', { drawSVG: '100%', duration: 1.3, ease: 'power2.inOut' }, 0)
        .to(['#cASofiaGlow', '#cASofia'], { drawSVG: '100%', duration: 1.3, ease: 'power2.inOut' }, 0.35)
        .to('#cAArea', { opacity: 0.07, duration: 0.7 }, 1.2)
        .to('#cAMark', { opacity: 1, duration: 0.6 }, 1.4)
        .call(function () { if (mPulse) mPulse(); }, null, 1.9);
    });
  }
  ioReveal(Array.prototype.slice.call(document.querySelectorAll('.bar-fill')), function (b) {
    gsap.to(b, { scaleX: 1, duration: 1, ease: 'power3.inOut' });
  });

  if (H.DrawSVGPlugin) {
    var minis = Array.prototype.slice.call(document.querySelectorAll('.mini-line'));
    minis.forEach(function (sv) { gsap.set(sv.querySelector('path'), { drawSVG: '0%' }); });
    ioReveal(minis, function (sv) {
      gsap.to(sv.querySelector('path'), { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' });
    });
  }

  /* Un morph mucho más lento y solo en los blobs del hero: en
     móvil el resto no se ve lo suficiente para pagar el costo. */
  if (H.MorphSVGPlugin) {
    var sh = ['#bs1', '#bs2', '#bs3', '#bs4', '#bs5', '#bs6'];
    document.querySelectorAll('.hero-blobs [data-morph] path').forEach(function (p, i) {
      var tl = gsap.timeline({ repeat: -1, defaults: { duration: 4.2, ease: 'sine.inOut' } });
      for (var s = 0; s < sh.length; s++) tl.to(p, { morphSVG: sh[(i + s + 1) % sh.length] });
      tl.progress(gsap.utils.random(0, 1));
    });
  }

  /* El barrido palabra por palabra es de desktop: en móvil la frase
     ocupa casi toda la pantalla y el efecto se pierde. Entra completa. */
  var mfText2 = document.getElementById('manifestoText');
  if (mfText2) {
    gsap.set(mfText2, { opacity: 0, y: 22 });
    ioReveal([mfText2], function (el) { gsap.to(el, { opacity: 1, y: 0, duration: 0.9 }); });
  }

  return function () {};
});

/* ─────────── MOVIMIENTO REDUCIDO ───────────
   No se crea nada. La CSS ya dejó todo visible y estático. */
mm.add('(prefers-reduced-motion: reduce)', function () {
  document.querySelectorAll('.js-fade, .js-words, .js-hero').forEach(function (el) { el.style.opacity = 1; });
  killLoader();
  return function () {};
});

/* ── Refresh tras fuentes e imágenes ── */
window.addEventListener('load', function () { ScrollTrigger.refresh(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

})();
