/* ============================================================================
   js/accordion.js — ACORDEÓN DE PRODUCTOS (propietario: accordion)
   Puerto de AccordionGallery (React Bits): mismo reparto de flexGrow, misma
   inclinación 3D de los cerrados y el mismo parallax del medio. Sin imports
   (lee window.SAPHI.M si existe; si no, usa los mismos valores de respaldo).

   v2 · «un timbre, una respuesta»: el panel que se abre es la respuesta.
     · Intención de hover: pasar de largo no abre nada; detenerse sí (M.intent).
       Foco, teclado, clic y toque abren al instante.
     · Retargeting: un solo gsap.to por panel con overwrite:'auto'. Invertir a
       media animación continúa desde el valor actual (antes: matar y reconstruir
       ~36 tweens por cambio).
     · El atenuado (.ag-dim), la etiqueta vertical y la cascada del contenido son
       CSS puro (css/motion-accordion.css): GSAP solo mueve flex-grow, rotateY y
       el parallax del medio.
     · Estado accesible: aria-current + aria-expanded + inert en el cuerpo de los
       cerrados (Shift+Tab ya no aterriza en enlaces invisibles).
     · Altura de la fila = lo que pida el contenido más alto (el CTA no se recorta
       en 1366×768, 1280×720 ni iPad horizontal).
     · Huella de voz: se dibuja cada vez que abre su panel (solo el activo).
     · Recorrido guiado: una vez por sesión, ver iniciarRecorrido().
     · Contrato con gl.js: 'ag:active' { index, id, el } cada vez que cambia el
       panel activo, una vez al iniciar, y con index:-1 en vista apilada.
   ============================================================================ */
(function () {
  'use strict';
  var root = document.getElementById('agRow');
  if (!root) return;
  var panels = Array.prototype.slice.call(root.querySelectorAll('.ag-panel'));
  if (!panels.length) return;

  var html = document.documentElement;
  var S = window.SAPHI || {};
  var COUNT = panels.length;
  var EXPAND = 0.52, GAP = 10, TILT = 8, PARALLAX = 0.5, DEFAULT_INDEX = 0;
  var TOUR_KEY = 'saphi:ag-tour';
  var RECORRIDO = true;                                    /* false apaga el recorrido guiado (G-22) sin tocar nada más */

  /* Tokens: SAPHI.M (leído de css/motion.css) con los mismos valores de respaldo */
  var M = S.M || {};
  var D = M.dur || {}, IN = M.intent || {};
  var DUR = D.layout || 0.44, EASE = (M.ease && M.ease.brand) || 'power3.out';
  var T_DELAY = IN.delay || 90, T_SWEEP = IN.sweep || 140, T_SPEED = IN.speed || 0.6;   /* ms, ms, px/ms */
  var T_CUE = DUR * 0.35;                                                               /* la cascada del CSS arranca al 35 % del layout */

  var hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap) { try { if (window.DrawSVGPlugin) window.gsap.registerPlugin(window.DrawSVGPlugin); } catch (e) {} }
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqStack = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
  var mqHover = window.matchMedia ? window.matchMedia('(hover: hover)') : null;
  function reduced() { return !!(mqReduce && mqReduce.matches); }
  /* lista apilada: ≤900 px, sin GSAP (core pone m-nogsap) o sin JS */
  function apilado() { return !!(mqStack && mqStack.matches) || html.classList.contains('m-nogsap') || !html.classList.contains('js'); }

  var medios = panels.map(function (p) { return p.querySelector('.ag-media'); });
  var cuerpos = panels.map(function (p) { return p.querySelector('.ag-body'); });
  var huellas = panels.map(function (p) { return p.querySelector('.mini-line path'); });

  var activo = Math.min(Math.max(DEFAULT_INDEX, 0), COUNT - 1);
  var mediaSize = 700, lastW = 0, vistaApilada = null, ignoraFoco = false, tocoReciente = 0;
  var r = Math.min(Math.max(EXPAND, 0.2), 0.9);
  var grow = COUNT > 1 ? (r * (COUNT - 1)) / (1 - r) : 1;

  /* ── Aviso a gl.js (y a core): bubbles → llega a document y a window ───────── */
  function avisar(index) {
    var el = index >= 0 ? panels[index] : null;
    root.dispatchEvent(new window.CustomEvent('ag:active', {
      bubbles: true, detail: { index: index, id: el ? el.getAttribute('data-p') : null, el: el }
    }));
  }

  /* ── Huella de voz: DrawSVG reiniciado, por panel, solo el activo ──────────── */
  var puedeDibujar = function () { return hasGsap && !!window.DrawSVGPlugin && !reduced(); };
  var huellaViva = [];
  function huella(i, abre) {
    var p = huellas[i];
    if (!p || !hasGsap || !window.DrawSVGPlugin) return;
    huellaViva[i] = abre;
    window.gsap.killTweensOf(p);
    if (abre) {
      if (!puedeDibujar()) { window.gsap.set(p, { drawSVG: '100%' }); return; }
      /* arranca con la cascada (--i:0) y es su primer paso */
      window.gsap.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: DUR, delay: T_CUE, ease: EASE, overwrite: 'auto' });
    } else if (puedeDibujar()) {
      /* se reinicia cuando el contenido ya salió (M.dur.enter × M.dur.exit) */
      window.gsap.to(p, { drawSVG: '0%', duration: 0.001, delay: (D.enter || 0.28) * (D.exit || 0.6) + 0.02, overwrite: 'auto' });
    } else { window.gsap.set(p, { drawSVG: '100%' }); }
  }

  /* ── Estado accesible de un panel ───────────────────────────────────────────── */
  function marcar(i, esActivo) {
    var panel = panels[i], cuerpo = cuerpos[i];
    panel.classList.toggle('ag-panel--active', esActivo);
    panel.setAttribute('aria-current', esActivo ? 'true' : 'false');
    panel.setAttribute('aria-expanded', esActivo ? 'true' : 'false');
    if (cuerpo) {
      if (esActivo) cuerpo.removeAttribute('inert');
      else {
        /* si el foco estaba dentro (enlace del panel que se cierra), pasa al panel para no perderlo */
        if (cuerpo.contains(document.activeElement)) { ignoraFoco = true; panel.focus({ preventScroll: true }); ignoraFoco = false; }
        cuerpo.setAttribute('inert', '');
      }
    }
  }

  /* ── Reparto de anchos: un gsap.to por panel, overwrite:'auto' ──────────────── */
  var moviendo = null;
  function aplicar(animar) {
    if (apilado()) { aplicarLista(); return; }
    var venia = vistaApilada === true;                      /* de lista apilada a acordeón: gl.js debe saber cuál quedó abierto */
    vistaApilada = false;
    var instante = !animar || !hasGsap || reduced();
    var g = hasGsap ? window.gsap : null;
    if (moviendo) { moviendo.kill(); moviendo = null; }
    if (animar && !instante) {
      root.classList.add('ag-moving');                     /* will-change solo en vuelo (CSS) */
      moviendo = g.delayedCall(DUR + 0.06, function () { root.classList.remove('ag-moving'); moviendo = null; });
    } else root.classList.remove('ag-moving');

    panels.forEach(function (panel, i) {
      var esActivo = i === activo;
      marcar(i, esActivo);
      var rot = esActivo ? 0 : (i < activo ? TILT : -TILT);
      var medio = medios[i];
      var arrastre = Math.max(-1.5, Math.min(1.5, activo - i));
      var desplaza = esActivo || reduced() ? 0 : arrastre * PARALLAX * mediaSize * 0.06;

      if (!g) {                                            /* sin GSAP: se aplica sin transición */
        panel.style.flexGrow = esActivo ? grow : 1;
        return;
      }
      if (instante) {
        g.killTweensOf(panel); g.set(panel, { flexGrow: esActivo ? grow : 1, rotateY: reduced() ? 0 : rot });
        if (medio) { g.killTweensOf(medio); g.set(medio, { xPercent: -50, yPercent: -50, x: desplaza }); }
      } else {
        g.to(panel, { flexGrow: esActivo ? grow : 1, rotateY: rot, duration: DUR, ease: EASE, overwrite: 'auto' });
        if (medio) g.to(medio, { xPercent: -50, yPercent: -50, x: desplaza, duration: DUR, ease: EASE, overwrite: 'auto' });
      }
    });
    if (venia) avisar(activo);
  }

  /* Vista apilada: todo abierto, sin panel activo (gl.js decide por visibilidad) */
  function aplicarLista() {
    var cambio = vistaApilada !== true;
    vistaApilada = true;
    if (moviendo) { moviendo.kill(); moviendo = null; }
    root.classList.remove('ag-moving');
    panels.forEach(function (panel, i) {
      panel.classList.remove('ag-panel--active');
      panel.removeAttribute('aria-current');
      panel.setAttribute('aria-expanded', 'true');
      if (cuerpos[i]) cuerpos[i].removeAttribute('inert');
      if (hasGsap) {                                       /* limpia lo que dejó la vista de escritorio (sin tocar --ag-accent / --ag-tint del style) */
        window.gsap.killTweensOf([panel, medios[i], huellas[i]].filter(Boolean));
        window.gsap.set(panel, { clearProps: 'flexGrow,transform' });
        if (medios[i]) window.gsap.set(medios[i], { clearProps: 'transform,translate' });
        if (huellas[i]) window.gsap.set(huellas[i], { clearProps: 'strokeDasharray,strokeDashoffset' });
      }
    });
    if (cambio) { avisar(-1); dibujarApilado(); }
  }

  /* En la lista apilada cada huella se dibuja una vez al llegar a la pantalla (como en el original) */
  var ioHuellas = null;
  function dibujarApilado() {
    if (!puedeDibujar() || !('IntersectionObserver' in window)) return;
    if (!ioHuellas) {
      ioHuellas = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting || !apilado() || reduced()) return;
          var p = e.target.querySelector('.mini-line path');
          ioHuellas.unobserve(e.target);
          if (p) window.gsap.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: DUR * 1.6, ease: EASE, overwrite: 'auto' });
        });
      }, { threshold: 0.35 });
    }
    panels.forEach(function (p) { if (p.querySelector('.mini-line path')) ioHuellas.observe(p); });
  }

  /* ── Medidas: tamaño del medio, ancho del cuerpo y ALTO de la fila ──────────── */
  var altoTimer = 0, refTimer = 0;
  function medir(forzar) {
    var caja = root.getBoundingClientRect();
    var total = caja.width;
    if (!total) return;
    if (!forzar && Math.abs(total - lastW) < 0.5 && vistaApilada === apilado()) return;   /* solo cambios de ancho */
    lastW = total;
    var util = Math.max(total - GAP * (COUNT - 1), 120);
    mediaSize = Math.max(160, util * r * 1.22);
    root.style.setProperty('--ag-media-size', Math.round(mediaSize) + 'px');
    root.style.setProperty('--ag-body-w', Math.round(Math.max(280, util * r)) + 'px');
    aplicar(false);
    medirAlto();
  }
  /* El panel recorta su contenido (overflow:hidden). La fila toma la altura del contenido más
     alto de los seis (no del activo: así no salta al cambiar de panel) más un respiro mínimo
     arriba y abajo (--sp-24); el relleno del cuerpo (26-44 px) queda como holgura extra. */
  function medirAlto() {
    if (apilado()) { if (root.style.getPropertyValue('--ag-need')) root.style.removeProperty('--ag-need'); return; }
    var need = 0, respiro = parseFloat(window.getComputedStyle(html).getPropertyValue('--sp-24')) || 24;
    cuerpos.forEach(function (b) {
      var c = b && b.querySelector('.tool-content');
      if (c) need = Math.max(need, c.offsetHeight + 2 * respiro);
    });
    var valor = Math.ceil(need) + 1;
    var previo = parseFloat(root.style.getPropertyValue('--ag-need')) || 0;
    if (Math.abs(valor - previo) < 1) return;
    cancelAnimationFrame(altoTimer);
    altoTimer = requestAnimationFrame(function () {         /* fuera del ResizeObserver: sin «loop» */
      root.style.setProperty('--ag-need', valor + 'px');
      if (document.readyState === 'complete' && window.ScrollTrigger) {   /* lo de abajo (pin de Casos) cambió de lugar */
        clearTimeout(refTimer);
        refTimer = setTimeout(function () { window.ScrollTrigger.refresh(); }, 220);
      }
    });
  }

  /* ── Activar un panel ───────────────────────────────────────────────────────── */
  var intento = null;                                       /* { i, t } hover pendiente */
  function cancelarIntento() { if (intento) { clearTimeout(intento.t); intento = null; } }
  function activar(i, opt) {
    opt = opt || {};
    cancelarIntento();
    if (!opt.recorrido) detenerRecorrido(opt.restaura ? 'restaura' : 'usuario');
    if (apilado() || i === activo || i < 0 || i >= COUNT) return;
    var previo = activo;
    activo = i;
    aplicar(opt.animar !== false);
    huella(previo, false);                                 /* solo dos huellas cambian: la que sale y la que entra */
    huella(activo, true);
    avisar(activo);
  }

  /* ── Intención de hover ───────────────────────────────────────────────────────
     pointerenter espera M.intent.delay (o M.intent.sweep si el puntero va rápido);
     pointerleave cancela. Solo con (hover:hover) y mouse/lápiz. */
  var muestras = [];                                        /* últimas 3 posiciones del puntero */
  function muestrear(e) {
    muestras.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (muestras.length > 3) muestras.shift();
  }
  function velocidad() {
    if (muestras.length < 2) return 0;
    var a = muestras[0], b = muestras[muestras.length - 1], dt = b.t - a.t;
    return dt > 0 ? Math.hypot(b.x - a.x, b.y - a.y) / dt : 0;
  }
  function hoverValido(e) { return (e.pointerType === 'mouse' || e.pointerType === 'pen' || !e.pointerType) && (!mqHover || mqHover.matches); }
  function encolar(i, e) {
    if (apilado() || i === activo || recorrido) { cancelarIntento(); return; }
    if (intento && intento.i === i) return;
    cancelarIntento();
    var espera = velocidad() > T_SPEED ? T_SWEEP : T_DELAY;
    intento = { i: i, t: setTimeout(function () { intento = null; activar(i); }, espera) };
  }

  panels.forEach(function (panel, i) {
    panel.addEventListener('pointerenter', function (e) { if (!hoverValido(e)) return; muestrear(e); encolar(i, e); });
    panel.addEventListener('pointerleave', function () { if (intento && intento.i === i) cancelarIntento(); });
    /* el foco abre al instante (también con movimiento reducido) */
    panel.addEventListener('focusin', function (e) {
      if (!ignoraFoco) activar(i);
      /* un enlace enfocado no espera su turno en la cascada: quien tabula rápido nunca aterriza en un botón a medio aparecer.
         (una transición en curso hacia el mismo valor no se cancela con CSS, de ahí el estilo en línea mientras dura el foco) */
      var t = e.target;
      if (t !== panel && t.parentElement && t.parentElement.classList.contains('tool-content')) {
        t.style.transitionProperty = 'color, border-color, translate, scale'; t.style.opacity = '1'; t.style.transform = 'none';
      }
    });
    panel.addEventListener('focusout', function (e) {
      var t = e.target;
      if (t !== panel && t.style && t.style.opacity === '1' && t.style.transitionProperty) { t.style.removeProperty('transition-property'); t.style.removeProperty('opacity'); t.style.removeProperty('transform'); }
    });
    panel.addEventListener('click', function (e) {
      if (performance.now() - tocoReciente < 450) { e.preventDefault(); return; }   /* el deslizamiento no es un clic */
      /* primer clic abre el panel; con el panel ya abierto, el enlace de su contenido hace lo suyo */
      if (i !== activo && !apilado()) { e.preventDefault(); activar(i); }
    });
    panel.addEventListener('keydown', function (e) {
      var k = e.key, siguiente = -1;
      if (k === 'ArrowRight' || k === 'ArrowDown') siguiente = (i + 1) % COUNT;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') siguiente = (i - 1 + COUNT) % COUNT;
      else if (k === 'Home') siguiente = 0;
      else if (k === 'End') siguiente = COUNT - 1;
      if (siguiente >= 0) { e.preventDefault(); activar(siguiente); panels[siguiente].focus(); return; }
      /* Enter / Espacio sobre el panel lo abren sin seguir ningún enlace; sobre el enlace, Enter lo sigue */
      if ((k === 'Enter' || k === ' ' || k === 'Spacebar') && e.target === panel) {
        e.preventDefault();
        activar(i);
      }
    });
  });

  /* pointermove: velocidad, y también abre si el puntero se detiene dentro de un panel cerrado
     (p. ej. tras un scroll que ya consumió su pointerenter) */
  root.addEventListener('pointermove', function (e) {
    if (!hoverValido(e)) return;
    muestrear(e);
    var p = e.target && e.target.closest ? e.target.closest('.ag-panel') : null;
    if (!p) return;
    var i = panels.indexOf(p);
    if (i >= 0 && i !== activo && !intento) encolar(i, e);
  }, { passive: true });

  /* ── Gesto táctil horizontal (≥901 px con táctil; touch-action: pan-y en CSS) ── */
  var swipe = null;
  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    swipe = apilado() ? null : { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  root.addEventListener('pointerup', function (e) {
    var s = swipe; swipe = null;
    if (!s || s.id !== e.pointerId) return;
    var dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
      tocoReciente = performance.now();
      activar(Math.max(0, Math.min(COUNT - 1, activo + (dx < 0 ? 1 : -1))));
    }
  });
  /* el navegador tomó el gesto (scroll vertical) o soltó la captura: se limpia el estado */
  root.addEventListener('pointercancel', function () { swipe = null; });
  root.addEventListener('lostpointercapture', function () { swipe = null; });

  /* ── Recorrido guiado inicial (una sola vez) ───────────────────────────────────
     Cuando la fila llega al 60 % de la pantalla: panel 2, panel 3 y de vuelta al 1,
     ≈2.4 s en total. No corre con movimiento reducido, si ya hubo pointermove en la
     fila, en la segunda visita (sessionStorage) ni con ≤900 px. Cualquier interacción
     lo cancela y deja el estado actual. */
  var recorrido = null, recorridoListo = false, hayMovimiento = false, esperaRec = 0;
  var PASO = 0.8, PAUSA = 700;                             /* s entre paneles (0.8 + 0.8 + 0.44 + cascada ≈ 2.4 s) y ms de calma tras llegar */
  function yaVisto() {
    try { return window.sessionStorage.getItem(TOUR_KEY) === '1'; } catch (e) { return false; }
  }
  function marcarVisto() { recorridoListo = true; try { window.sessionStorage.setItem(TOUR_KEY, '1'); } catch (e) {} }
  function puedeRecorrer() {
    return RECORRIDO && hasGsap && !reduced() && !apilado() && !recorridoListo && !hayMovimiento && !yaVisto() && !document.hidden;
  }
  /* Cada paso espera su tiempo completo contando desde que el anterior terminó (un tirón del navegador no se come un panel) */
  function iniciarRecorrido() {
    if (!puedeRecorrer() || recorrido) return;
    marcarVisto();
    var pasos = [1, 2, DEFAULT_INDEX];
    var tour = recorrido = { t: 0, kill: function () { clearTimeout(this.t); } };
    (function siguiente() {
      if (recorrido !== tour) return;
      var i = pasos.shift();
      activar(i, { recorrido: true });
      if (pasos.length) tour.t = setTimeout(siguiente, PASO * 1000);
      else tour.t = setTimeout(function () { if (recorrido === tour) recorrido = null; }, PASO * 1000);
    })();
  }
  /* razon 'usuario': deja el panel actual. 'restaura': (la fila salió de pantalla) vuelve al predeterminado */
  function detenerRecorrido(razon) {
    clearTimeout(esperaRec); esperaRec = 0;
    recorridoListo = true;                                  /* una interacción también agota la oportunidad */
    if (!recorrido) return;
    recorrido.kill(); recorrido = null;
    if (razon === 'restaura') activar(DEFAULT_INDEX, { animar: false, restaura: true, recorrido: true });
  }
  function interaccion(e) {
    if (e && e.type === 'pointermove' && !e.movementX && !e.movementY) return;   /* los «mover falsos» del layout no cuentan */
    if (e && e.type === 'pointermove') hayMovimiento = true;
    if (recorrido || esperaRec) detenerRecorrido('usuario');
  }
  ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    root.addEventListener(ev, interaccion, { passive: true });
  });
  window.addEventListener('keydown', function (e) { if (recorrido && (e.key === 'Tab' || e.key.indexOf('Arrow') === 0)) detenerRecorrido('usuario'); }, true);
  if (mqReduce && mqReduce.addEventListener) mqReduce.addEventListener('change', function () {
    if (recorrido) detenerRecorrido('usuario');
    aplicar(false);                                         /* limpia inclinación y parallax al reducir */
    huellas.forEach(function (p, k) { if (k === activo && huellaViva[k]) huella(k, true); });
  });
  /* Una sola IO sobre la fila (al 60 % de la pantalla): primera vista y recorrido */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      if (e.isIntersecting) {
        if (!apilado() && !huellaViva[activo]) huella(activo, true);     /* el panel predeterminado dibuja su huella al llegar */
        if (!recorridoListo && !esperaRec && !recorrido && !yaVisto()) {
          esperaRec = setTimeout(function () { esperaRec = 0; if (puedeRecorrer()) iniciarRecorrido(); }, PAUSA);
        }
      } else {
        clearTimeout(esperaRec); esperaRec = 0;
        if (recorrido) detenerRecorrido('restaura');
      }
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0 }).observe(root);
  }

  /* ── Arranque ─────────────────────────────────────────────────────────────────── */
  root.classList.add('ag-live', 'ag-init');                 /* ag-init: sin transiciones en el primer reparto */
  if (window.ResizeObserver) new ResizeObserver(function () { medir(false); }).observe(root);
  else window.addEventListener('resize', function () { medir(false); });
  if (mqStack && mqStack.addEventListener) mqStack.addEventListener('change', function () { medir(true); });

  huellas.forEach(function (p) { if (p && hasGsap && window.DrawSVGPlugin) window.gsap.set(p, { drawSVG: '0%' }); });
  medir(true);
  if (!apilado()) avisar(activo);                           /* a la lista apilada la avisa aplicarLista() */
  void root.offsetWidth;                                    /* el primer estado se asienta sin transición */
  root.classList.remove('ag-init');

  /* las fuentes cambian la altura del texto: se mide de nuevo (y una sola vez más al cargar todo) */
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(function () { medir(true); });
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { medir(true); });
  }

  /* los enlaces del menú y del hero a un producto abren su panel */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id) setTimeout(function () { window.__agAbrir(id); }, 0);
  }, true);

  /* apertura por id, para el menú, el #hash y las pruebas */
  window.__agAbrir = function (id) {
    var i = panels.findIndex(function (p) { return p.getAttribute('data-p') === id; });
    if (i < 0) return false;
    activar(i);
    return true;
  };
})();
