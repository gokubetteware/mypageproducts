/* ============================================================================
   js/ui.js — INTERACCION DE INTERFAZ (propietario: ui)
   Botones roll, anclas con latigazo (P8), menu movil, formulario, cursor /
   imanes / spotlight / preview de casos y onda de CTA. Ver js/CONTRATO.md.
   Importa de core; no toca secciones. Con plan B (sin GSAP o movimiento
   reducido) el bloque principal no corre, igual que el `return` del original.
   ============================================================================ */
import { H, active, lenis, mm, safe } from './core.js';

(function () {
if (!active) return;   /* GLUE: el original hacia `return` en el plan B */

/* ═══════════════════════════════════════════════════════════
   EDITA AQUÍ — a dónde llegan los mensajes del formulario
   Sin endpoint, el botón abre tu correo con todo prellenado, así
   que funciona desde hoy. Cuando crees un formulario gratis en
   formspree.io o web3forms.com, pega aquí su URL y los mensajes
   te llegan solos, sin que el visitante vea su cliente de correo.
   ═══════════════════════════════════════════════════════════ */
var FORM_ENDPOINT = '';                       // ej: 'https://formspree.io/f/xxxxxxx'
var FORM_EMAIL    = 'sayisless@gmail.com';    // respaldo mientras no haya endpoint

/* ── P8: latigazo al usar un ancla ───────────────────────── */
var whipEl = document.getElementById('top');
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var hash = a.getAttribute('href');
    if (hash.length < 2) return;
    var el = document.querySelector(hash);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    gsap.timeline()
      .to(whipEl, { skewY: 2.2, duration: 0.22, ease: 'power2.out' })
      .to(whipEl, { skewY: 0, duration: 1.1, ease: 'gk' }, 0.3);
    if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 72, behavior: 'smooth' });
  });
});

/* ═══ P3: roll carácter por carácter ══════════════════════
   El texto queda en el HTML; esto solo lo duplica y le pone un
   retraso escalonado a cada letra. Si el JS muere, el enlace
   sigue leyéndose igual. */
function buildRoll(el) {
  var txt = el.getAttribute('data-roll');
  if (!txt) return;
  Array.prototype.slice.call(el.childNodes).forEach(function (n) { if (n.nodeType === 3) el.removeChild(n); });
  var wrap = document.createElement('span');
  wrap.className = 'roll';
  [0, 1].forEach(function (i) {
    var s = document.createElement('span');
    if (i === 1) s.setAttribute('aria-hidden', 'true');
    txt.split('').forEach(function (ch, j) {
      var c = document.createElement('span');
      c.className = 'rc';
      c.textContent = ch === ' ' ? '\u00a0' : ch;
      c.style.transitionDelay = (j * 0.016) + 's';
      s.appendChild(c);
    });
    wrap.appendChild(s);
  });
  el.insertBefore(wrap, el.firstChild);
}
document.querySelectorAll('[data-roll]').forEach(buildRoll);

/* ═══ FORMULARIO DE CONTACTO ══════════════════════════════
   Sin backend. Con FORM_ENDPOINT configurado envía por fetch; sin
   él, arma un mailto con todo prellenado — así el formulario sirve
   desde el primer día en Vercel y mejora cuando pegues la URL. */
(function () {
  var form = document.getElementById('form');
  if (!form) return;
  var msg = document.getElementById('cfMsg');

  function fail(el, text) {
    el.closest('.cf-field').classList.add('bad');
    msg.textContent = text; msg.classList.add('bad');
    el.focus();
    gsap.fromTo(form, { x: -7 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.35)' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.querySelectorAll('.cf-field').forEach(function (f) { f.classList.remove('bad'); });
    msg.classList.remove('bad'); msg.textContent = '';

    var d = {};
    ['nombre', 'negocio', 'whatsapp', 'correo', 'mensaje'].forEach(function (k) {
      d[k] = (form.elements[k].value || '').trim();
    });
    if (!d.nombre) { fail(form.elements.nombre, 'Me falta tu nombre.'); return; }
    /* 10 dígitos ignorando espacios y guiones: así no se rechaza a
       quien escribe 782 123 4567 */
    if (d.whatsapp.replace(/[^0-9]/g, '').length < 10) { fail(form.elements.whatsapp, 'El WhatsApp necesita 10 dígitos.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) { fail(form.elements.correo, 'Revisa el correo, algo no cuadra.'); return; }
    if (!form.elements.consent.checked) {
      msg.textContent = 'Necesito tu visto bueno para poder contactarte.';
      msg.classList.add('bad');
      return;
    }

    var btn = form.querySelector('.cf-send');
    var cuerpo = 'Nombre: ' + d.nombre + '\nNegocio: ' + (d.negocio || '-') +
                 '\nWhatsApp: ' + d.whatsapp + '\nCorreo: ' + d.correo +
                 '\n\n' + (d.mensaje || '(sin mensaje)');

    function listo() {
      msg.textContent = 'Listo, ' + d.nombre.split(' ')[0] + '. Te contesto en menos de 24 horas.';
      gsap.fromTo(msg, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
      form.reset();
    }

    if (FORM_ENDPOINT) {
      btn.disabled = true; msg.textContent = 'Enviando...';
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(d)
      }).then(function (r) {
        btn.disabled = false;
        if (r.ok) listo();
        else { msg.textContent = 'No salio. Escribeme a ' + FORM_EMAIL; msg.classList.add('bad'); }
      }).catch(function () {
        btn.disabled = false;
        msg.textContent = 'No salio. Escribeme a ' + FORM_EMAIL; msg.classList.add('bad');
      });
    } else {
      window.location.href = 'mailto:' + FORM_EMAIL +
        '?subject=' + encodeURIComponent('Demo para ' + (d.negocio || d.nombre)) +
        '&body=' + encodeURIComponent(cuerpo);
      listo();
    }
  });
})();

/* ═══ MENÚ MÓVIL (M7) ═════════════════════════════════════ */
var burger = document.getElementById('burger');
var overlay = document.getElementById('navOverlay');
var menuOpen = false;
function openMenu() {
  menuOpen = true;
  overlay.classList.add('open');
  burger.classList.add('open');
  burger.setAttribute('aria-expanded', 'true');
  if (lenis) lenis.stop();
  gsap.timeline()
    .fromTo('.ov-pre1', { x: 0, xPercent: 102 }, { x: 0, xPercent: 0, duration: 0.5, ease: 'expo.inOut' }, 0)
    .fromTo('.ov-pre2', { x: 0, xPercent: 102 }, { x: 0, xPercent: 0, duration: 0.5, ease: 'expo.inOut' }, 0.08)
    .fromTo('.ov-panel', { x: 0, xPercent: 102 }, { x: 0, xPercent: 0, duration: 0.55, ease: 'expo.inOut' }, 0.16)
    .fromTo(overlay.querySelectorAll('.ov-item'),
      { yPercent: 120, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.055 }, 0.42)
    .fromTo('.ov-mail', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.75);
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  if (lenis) lenis.start();
  gsap.to(['.ov-panel', '.ov-pre2', '.ov-pre1'], {
    x: 0, xPercent: 102, duration: 0.45, ease: 'expo.in', stagger: 0.06,
    onComplete: function () { overlay.classList.remove('open'); }
  });
}
document.getElementById('ovHit').addEventListener('click', closeMenu);
document.getElementById('ovClose').addEventListener('click', closeMenu);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
if (burger) burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });

/* ── Escritorio: partes de UI que viven en matchMedia y no dependen de secciones ──
   (en el original eran tres bloques safe() dentro del mm.add de escritorio; aqui
   tienen su propio contexto con la MISMA consulta) */
mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', function () {

  safe('preview', function () {
  /* ═══ G6 — PREVIEW que persigue al cursor ═══ */
  var preview = document.getElementById('preview');
  var pvArt = document.getElementById('pvArt');
  var pvLabel = document.getElementById('pvLabel');
  if (preview) {
    var px = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
    var py = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { px(e.clientX + 26); py(e.clientY - 100); }, { passive: true });

    document.querySelectorAll('.case-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        var cols = (card.getAttribute('data-pv') || '#511BDB,#BDA8F1').split(',');
        /* Sin assets: un degradado animado con la paleta del caso.
           Se prefirió CSS sobre canvas para no meter un segundo rAF
           compitiendo con el ticker de GSAP. */
        pvArt.style.background = 'linear-gradient(120deg,' + cols[0] + ',' + cols[1] + ',' + cols[0] + ')';
        pvArt.style.backgroundSize = '300% 300%';
        pvLabel.textContent = card.getAttribute('data-pvlabel') || '';
        gsap.fromTo(preview,
          { clipPath: 'inset(50% 0% 50% 0%)', scale: 0.8, opacity: 0 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, opacity: 1, duration: 0.6, ease: 'gk', overwrite: 'auto' });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(preview, { clipPath: 'inset(50% 0% 50% 0%)', scale: 0.8, opacity: 0, duration: 0.4, overwrite: 'auto' });
      });
    });
  }


  });

  safe('spot', function () {
  /* ═══ P1 + spotlight + elevación de tarjetas ═══ */
  document.querySelectorAll('.spot, .pill').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  document.querySelectorAll('.case-card').forEach(function (card) {
    card.addEventListener('mouseenter', function () { gsap.to(card, { y: -8, duration: 0.5, overwrite: 'auto' }); });
    card.addEventListener('mouseleave', function () { gsap.to(card, { y: 0, duration: 0.5, overwrite: 'auto' }); });
  });


  });

  safe('cursor', function () {
  /* ═══ P2 — CURSOR QUE MORFEA ═══ */
  if (window.matchMedia('(pointer: fine)').matches) {
    document.body.classList.add('has-cursor');
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    var label = document.getElementById('curLabel');
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    var dx = gsap.quickTo(dot, 'x', { duration: 0.05, ease: 'none' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.05, ease: 'none' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3' });

    var magnets = [];
    function buildMagnets() {
      magnets = [];
      document.querySelectorAll('.magnetic').forEach(function (el) {
        magnets.push({ el: el, rect: el.getBoundingClientRect(),
          x: gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' }) });
      });
    }
    buildMagnets();
    window.addEventListener('resize', buildMagnets);
    window.addEventListener('scroll', function () {
      magnets.forEach(function (m) { m.rect = m.el.getBoundingClientRect(); });
    }, { passive: true });

    window.addEventListener('mousemove', function (e) {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      for (var i = 0; i < magnets.length; i++) {
        var m = magnets[i], r = m.rect;
        var ddx = e.clientX - (r.left + r.width / 2), ddy = e.clientY - (r.top + r.height / 2);
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < 120) { var p = (1 - d / 120) * 0.42; m.x(ddx * p); m.y(ddy * p); }
        else { m.x(0); m.y(0); }
      }
    }, { passive: true });

    var STATES = {
      card: { width: 84, height: 84, borderRadius: '50%', text: H.Draggable ? 'Arrastra' : 'Ver' },
      pill: { width: 46, height: 46, borderRadius: '50%', text: '→' },
      base: { width: 36, height: 36, borderRadius: '50%', text: '' }
    };
    var curState = 'base';
    function setCursor(name) {
      if (name === curState) return;
      curState = name;
      var s = STATES[name];
      label.textContent = s.text;
      gsap.to(ring, { width: s.width, height: s.height, borderRadius: s.borderRadius, duration: 0.4, overwrite: 'auto' });
      gsap.to(label, { opacity: s.text ? 1 : 0, duration: 0.3, overwrite: 'auto' });
    }
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (t.closest('.case-card')) setCursor('card');
      else if (t.closest('.pill, a, button')) setCursor('pill');
      else setCursor('base');
    });
  }


  });

  return function () { /* GSAP revierte lo de este contexto solo */ };
});

})();

/* ══ Onda de CTA ═══════════════════════════════════════════════
   Clic en un CTA: un círculo coral se expande desde el botón, cubre
   la pantalla, el salto a la sección ocurre debajo, y el círculo se
   disuelve dejando los tonos normales. En "Enviar" la onda regresa
   al propio botón al confirmarse el envío. Si no hay GSAP o el
   usuario pide menos movimiento, los botones se comportan como hoy. */
(function () {
  if (!window.gsap) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var fx = document.createElement('div');
  fx.id = 'waveFx'; fx.setAttribute('aria-hidden', 'true');
  document.body.appendChild(fx);
  var busy = false;

  function circle(x, y, r) { return 'circle(' + r.toFixed(1) + 'px at ' + x.toFixed(1) + 'px ' + y.toFixed(1) + 'px)'; }
  function maxR(x, y) { return Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)); }

  /* Dos tweens encadenados (sin timeline): imposible dejar el candado puesto.
     El failsafe de 3s desbloquea aunque un tween muera por causas externas. */
  var failSafe = null, pendingBetween = null;
  function flushBetween() {
    if (!pendingBetween) return;
    var fn = pendingBetween; pendingBetween = null;
    try { fn(); } catch (err) {}
  }
  var revealTween = null;
  function clearMask() {
    fx.style.webkitMaskImage = ''; fx.style.maskImage = '';
  }
  function finish() {
    if (failSafe) { clearTimeout(failSafe); failSafe = null; }
    flushBetween(); /* el salto ocurre aunque el navegador haya congelado la animación */
    if (revealTween) { revealTween.kill(); revealTween = null; }
    gsap.killTweensOf(fx);
    clearMask();
    fx.style.display = 'none';
    busy = false;
  }
  function runWave(fromEl, between, revealFrom) {
    if (busy) return; busy = true;
    if (revealTween) { revealTween.kill(); revealTween = null; }
    gsap.killTweensOf(fx);
    clearMask();
    pendingBetween = between || null;
    var b = fromEl.getBoundingClientRect();
    var x = b.left + b.width / 2, y = b.top + b.height / 2;
    fx.style.display = 'block';
    failSafe = setTimeout(finish, 3000);
    gsap.fromTo(fx, { clipPath: circle(x, y, 0) }, {
      clipPath: circle(x, y, maxR(x, y) * 1.02),
      duration: 0.5, ease: 'power3.in', overwrite: 'auto',
      onComplete: function () {
        flushBetween();
        /* pequeña pausa para que el salto pinte; setTimeout sigue corriendo aunque la pestaña pierda foco */
        setTimeout(function () {
          var p;
          if (revealFrom === 'button') {
            var r2 = fromEl.getBoundingClientRect();
            p = { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
          } else {
            p = { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
          }
          /* Regreso en espejo: la pantalla nueva aparece desde el medio —
             un hueco crece en el coral (máscara radial) hasta que se va. */
          gsap.set(fx, { clipPath: 'none' });
          var hole = { r: 1 }, HR = maxR(p.x, p.y) * 1.04;
          function paintHole() {
            var m = 'radial-gradient(circle at ' + p.x.toFixed(1) + 'px ' + p.y.toFixed(1) + 'px, rgba(0,0,0,0) ' + Math.max(0, hole.r - 1).toFixed(1) + 'px, #000 ' + hole.r.toFixed(1) + 'px)';
            fx.style.webkitMaskImage = m; fx.style.maskImage = m;
          }
          paintHole();
          revealTween = gsap.to(hole, {
            r: HR, duration: 0.65, ease: 'power3.inOut',
            onUpdate: paintHole, onComplete: finish
          });
        }, 60);
      }
    });
  }
  window.__waveDebug = function () { return { busy: busy, display: fx.style.display }; };

  /* CTAs de viaje: Agendar demo (header y hero) y Ver productos (hero) */
  var navTargets = [];
  document.querySelectorAll('a.pill-grad[href^="#"], .hero a.pill[href^="#"]').forEach(function (a) {
    if (navTargets.indexOf(a) < 0) navTargets.push(a);
  });
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a || navTargets.indexOf(a) < 0) return;
    var el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    if (busy) return;
    runWave(a, function () {
      var ln = window.__saphiLenis;
      if (ln) ln.scrollTo(el, { offset: -72, immediate: true, force: true });
      else window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset - 72);
      if (window.ScrollTrigger) ScrollTrigger.update();
    }, 'center');
  }, true);

  /* Enviar: la onda sale y regresa al botón cuando el envío se confirma */
  var msgEl = document.getElementById('cfMsg');
  var sendBtn = document.querySelector('.cf-send');
  if (msgEl && sendBtn && window.MutationObserver) {
    new MutationObserver(function () {
      if (msgEl.classList.contains('bad')) return;
      if ((msgEl.textContent || '').indexOf('Listo,') === 0) runWave(sendBtn, null, 'button');
    }).observe(msgEl, { childList: true, characterData: true, subtree: true });
  }
})();
