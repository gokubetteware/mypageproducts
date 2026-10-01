/* ============================================================================
   js/ui.js — INTERACCIÓN DE INTERFAZ (propietario: ui)
   Roll de texto, anclas, menú, formulario, onda de CTA, cursor, imanes y vista
   previa de casos. Lo visual vive en css/motion-ui.css; aquí solo el estado.

   Dos capas (CONTRATO, «v2 · núcleo»):
     · BÁSICO, siempre (con GSAP, sin GSAP y con «reducir movimiento»): menú,
       formulario, anclas, #hash, foco y roll. No usa GSAP para nada esencial.
     · MOVIMIENTO, solo con mode.motion: viaje suave con Lenis, onda de CTA,
       cursor propio, imanes y vista previa.
   Importa de core; no toca secciones.
   ============================================================================ */
import { H, M, mode, lenis, safe, headerApi } from './core.js';

/* ═══════════════════════════════════════════════════════════
   EDITA AQUÍ — a dónde llegan los mensajes del formulario
   Sin endpoint, el botón abre tu correo con todo prellenado, así
   que funciona desde hoy. Cuando crees un formulario gratis en
   formspree.io o web3forms.com, pega aquí su URL y los mensajes
   te llegan solos, sin que el visitante vea su cliente de correo.
   ═══════════════════════════════════════════════════════════ */
var FORM_ENDPOINT = '';                       // ej: 'https://formspree.io/f/xxxxxxx'
var FORM_EMAIL    = 'sayisless@gmail.com';    // respaldo mientras no haya endpoint

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const ms = (s) => Math.round(s * 1000);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cubic = (b) => 'cubic-bezier(' + b + ')';
const SVG_NS = 'http://www.w3.org/2000/svg';

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const wideScreen = window.matchMedia('(min-width: 901px)');
const onChange = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };

/* Modalidad de entrada: el anillo doble de los campos solo aparece al navegar con teclado
   (en un campo de texto :focus-visible también cuenta al hacer clic). */
function initModality() {
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab' || (e.key && e.key.indexOf('Arrow') === 0)) root.classList.add('ui-kbd'); }, true);
  window.addEventListener('pointerdown', () => { root.classList.remove('ui-kbd'); }, true);
}

/* ═══ Anillo de «sonar» (WAAPI): se abre y se apaga, una sola vez ═════════════ */
function sonar(ring, iterations) {
  if (!ring || !ring.animate || mode.reduced) return null;
  return ring.animate([
    { opacity: 0, transform: 'scale(.12)' },
    { opacity: 0.85, offset: 0.12 },
    { opacity: 0.85, offset: 0.4 },
    { opacity: 0, transform: 'scale(1)' }
  ], { duration: ms(M.dur.ring), easing: cubic(M.ease.bezier.cine), iterations: iterations || 1 });
}

/* Palomita dibujada: el trazo se normaliza con pathLength (CSS anima stroke-dashoffset) */
function makeCheck() {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ui-check');
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5'); p.setAttribute('pathLength', '1');
  s.appendChild(p);
  return s;
}
function showCheck(svg) {
  svg.classList.remove('on');
  requestAnimationFrame(() => { requestAnimationFrame(() => { svg.classList.add('on'); }); });   /* un cuadro después de insertarla, para que el trazo arranque */
}

/* ═══ ROLL — el texto queda UNA vez para lectores; las copias visuales van aria-hidden ═══
   Solo con puntero fino y sin «reducir movimiento»: en táctil el roll no existe. */
function buildRoll(el) {
  const txt = el.getAttribute('data-roll');
  if (!txt || el.querySelector('.roll')) return;
  Array.prototype.slice.call(el.childNodes).forEach((n) => { if (n.nodeType === 3) el.removeChild(n); });
  const sr = document.createElement('span');
  sr.className = 'roll-sr'; sr.textContent = txt;
  const wrap = document.createElement('span');
  wrap.className = 'roll'; wrap.setAttribute('aria-hidden', 'true');
  const step = M.stagger.each / 4, cap = M.stagger.max / 2;       /* 10 ms por letra, tope 120 ms */
  [0, 1].forEach(() => {
    const s = document.createElement('span');
    txt.split('').forEach((ch, j) => {
      const c = document.createElement('span');
      c.className = 'rc';
      c.textContent = ch === ' ' ? ' ' : ch;
      c.style.transitionDelay = Math.min(j * step, cap).toFixed(3) + 's';
      s.appendChild(c);
    });
    wrap.appendChild(s);
  });
  el.insertBefore(wrap, el.firstChild);
  el.insertBefore(sr, el.firstChild);
}
function initRoll() {
  if (mode.reduced || !finePointer.matches) return;
  document.querySelectorAll('[data-roll]').forEach(buildRoll);
}

/* ═══ MENÚ (burger + overlay) ═════════════════════════════════════════════════
   Visual 100 % CSS (clase .open); el estado y el foco se resuelven aquí. */
const menu = { isOpen: false, open() {}, close() {} };
function initMenu() {
  const burger = $('burger'), overlay = $('navOverlay'), ovClose = $('ovClose'), ovHit = $('ovHit');
  if (!burger || !overlay) return;
  const labelOpen = burger.getAttribute('aria-label') || '';
  const labelClose = (ovClose && ovClose.getAttribute('aria-label')) || labelOpen;
  const backdrop = Array.prototype.slice.call(document.querySelectorAll('body > header, body > .banner, body > main, body > footer'));

  /* Diálogo modal con nombre sacado del texto que ya existe («Abrir menú» → «menú») */
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const name = labelOpen.replace(/^\S+\s+/, '');
  if (name) overlay.setAttribute('aria-label', name);
  burger.setAttribute('aria-controls', 'navOverlay');

  const focusables = () => Array.prototype.slice.call(overlay.querySelectorAll('a[href], button:not([disabled])'));
  const setInert = (on) => { backdrop.forEach((n) => { n.inert = on; }); };

  menu.open = function () {
    if (menu.isOpen) return;
    menu.isOpen = true;
    overlay.classList.add('open'); burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    if (labelClose) burger.setAttribute('aria-label', labelClose);
    root.classList.add('ui-menu-open');
    if (lenis) lenis.stop();
    headerApi.show();
    const first = overlay.querySelector('.ov-item');
    if (first) first.focus({ preventScroll: true });                /* sin scroll: li recorta y un foco ahí lo desplazaría */
    setInert(true);                                                  /* después de mover el foco, para no perderlo */
  };
  menu.close = function (opts) {
    if (!menu.isOpen) return;
    menu.isOpen = false;
    setInert(false);
    overlay.classList.remove('open'); burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    if (labelOpen) burger.setAttribute('aria-label', labelOpen);
    root.classList.remove('ui-menu-open');
    if (lenis) lenis.start();
    if (!opts || opts.restoreFocus !== false) burger.focus({ preventScroll: true });
  };

  burger.addEventListener('click', () => { if (menu.isOpen) menu.close(); else menu.open(); });
  if (ovClose) ovClose.addEventListener('click', () => { menu.close(); });
  if (ovHit) ovHit.addEventListener('click', () => { menu.close(); });
  document.addEventListener('keydown', (e) => {
    if (!menu.isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); menu.close(); return; }
    if (e.key !== 'Tab') return;
    const list = focusables();                                       /* el foco no sale del menú (el fondo ya es inert; esto cubre el borde del documento) */
    if (!list.length) return;
    const a = document.activeElement, i = list.indexOf(a);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); list[list.length - 1].focus(); }
    else if (!e.shiftKey && (i === list.length - 1 || i < 0)) { e.preventDefault(); list[0].focus(); }
  });

  /* Escalón de entrada de los ítems (CSS usa --k × --m-stagger-each, con tope) */
  overlay.querySelectorAll('.ov-item').forEach((n, k) => { n.style.setProperty('--k', k); });
  const mail = overlay.querySelector('.ov-mail');
  if (mail) mail.style.setProperty('--k', overlay.querySelectorAll('.ov-item').length);
}

/* ═══ ANCLAS: viaje con duración por distancia, #hash, foco y teclado ═════════ */
const ANCHOR_OFFSET = 72;                                            /* alto del header: el destino queda justo debajo */
function anchorTarget(hash) {
  if (!hash || hash.length < 2) return null;
  let id; try { id = decodeURIComponent(hash.slice(1)); } catch (e) { id = hash.slice(1); }
  return document.getElementById(id);
}
function targetY(el, hash) {
  if (hash === '#top') return 0;
  return Math.max(0, Math.round(el.getBoundingClientRect().top + window.pageYOffset - ANCHOR_OFFSET));
}
const travelEase = H.gsap ? gsap.parseEase(M.ease.brand) : null;
function travel(y, o) {
  o = o || {};
  const dy = y - window.pageYOffset;
  if (o.instant || mode.reduced || Math.abs(dy) < 2) {               /* con reducido el salto es directo */
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    if (H.ScrollTrigger) ScrollTrigger.update();
    return;
  }
  const d = clamp(0.35 + Math.abs(dy) / 3200, M.travel.min, M.travel.max);
  headerApi.hold(ms(d) + 250);                                       /* el header no se esconde durante el viaje */
  /* onComplete: la cola de la curva de marca llega después de `d` (más con cuadros lentos); sin esto el header se escondía justo al llegar */
  if (lenis) lenis.scrollTo(y, { duration: d, easing: travelEase || undefined, force: true, onComplete: () => { headerApi.hold(350); } });
  else window.scrollTo({ top: y, behavior: 'smooth' });
}
function focusTarget(el) {
  const tag = el.tagName;
  if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(tag)) el.setAttribute('tabindex', '-1');
  try { el.focus({ preventScroll: true }); } catch (e) { /* sin foco programático */ }
}
function pushHash(hash) {
  if (window.location.hash === hash) return;
  try { history.pushState(null, '', hash); } catch (e) { /* sandbox sin historial */ }
}
function go(el, hash, o) {
  o = o || {};
  travel(targetY(el, hash), o);
  if (o.focus !== false) focusTarget(el);
  if (o.push !== false) pushHash(hash);
}

let wave = null;
function initAnchors() {
  /* Un solo delegado en captura: menú, enlaces y CTA pasan por aquí */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const hash = a.getAttribute('href');
    const el = anchorTarget(hash);
    if (!el) return;
    e.preventDefault();
    const fromMenu = menu.isOpen;
    menu.close({ restoreFocus: false });                             /* el menú se cierra antes de viajar */
    /* La onda es solo de «Agendar demo» (los pill-grad de destino #…), con mouse; «Ver productos» y el táctil viajan normal */
    if (wave && !fromMenu && a.matches('a.pill-grad') && mode.motion && finePointer.matches) {
      if (wave.busy) return;
      wave.run(a, () => { go(el, hash, { instant: true }); });
      return;
    }
    go(el, hash);
  }, true);

  /* Atrás / adelante entre anclas y hash escrito a mano */
  window.addEventListener('hashchange', () => {
    const el = anchorTarget(window.location.hash);
    if (el) go(el, window.location.hash, { push: false });
  });

  /* #hash al cargar: el pin de Casos y las fuentes mueven el documento, así que se alinea de nuevo
     (una sola vez, y solo si la persona todavía no se movió por su cuenta) */
  if (anchorTarget(window.location.hash)) {
    let moved = false;
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => { window.addEventListener(ev, () => { moved = true; }, { passive: true, once: true }); });
    const realign = () => {
      const hash = window.location.hash, el = anchorTarget(hash);
      if (moved || !el) return;
      travel(targetY(el, hash), { instant: true });
      if (el.classList.contains('ag-panel') && window.__agAbrir) window.__agAbrir(el.id);
    };
    const later = () => setTimeout(realign, 450);
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
    document.addEventListener('saphi:intro-done', () => { setTimeout(realign, 200); }, { once: true });
  }
}

/* ═══ ONDA DE CTA (solo «Agendar demo») ═══════════════════════════════════════
   Un círculo coral cubre la pantalla desde el botón, el salto ocurre debajo y un
   hueco lo descubre. 0.85 s en total; el candado nunca pasa de 0.9 s. */
function initWave() {
  if (!H.gsap) return null;
  const TOTAL = 0.85, GAP = 0.06;
  const REVEAL = M.dur.layout, COVER = TOTAL - REVEAL - GAP;         /* 0.35 s cubre · 0.06 s pausa · 0.44 s descubre */
  const fx = document.createElement('div');
  fx.id = 'waveFx'; fx.setAttribute('aria-hidden', 'true');
  document.body.appendChild(fx);
  let busy = false, failSafe = 0, pending = null, reveal = null;

  const circle = (x, y, r) => 'circle(' + r.toFixed(1) + 'px at ' + x.toFixed(1) + 'px ' + y.toFixed(1) + 'px)';
  const maxR = (x, y) => Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const clearMask = () => { fx.style.webkitMaskImage = ''; fx.style.maskImage = ''; };
  function flush() { if (!pending) return; const fn = pending; pending = null; try { fn(); } catch (err) { /* el salto es lo importante */ } }
  function finish() {
    if (failSafe) { clearTimeout(failSafe); failSafe = 0; }
    flush();                                                          /* el salto ocurre aunque el navegador congele la animación */
    if (reveal) { reveal.kill(); reveal = null; }
    gsap.killTweensOf(fx);
    clearMask();
    fx.style.display = 'none';
    busy = false;
  }
  function run(fromEl, between) {
    if (busy) return;
    busy = true;
    gsap.killTweensOf(fx); clearMask();
    pending = between || null;
    const b = fromEl.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    fx.style.display = 'block';
    failSafe = setTimeout(finish, ms(TOTAL));                        /* candado duro: 0.85 s con cualquier tasa de cuadros */
    gsap.fromTo(fx, { clipPath: circle(x, y, 0) }, {
      clipPath: circle(x, y, maxR(x, y) * 1.02), duration: COVER, ease: M.ease.cine, overwrite: 'auto',
      onComplete() {
        flush();
        setTimeout(() => {
          if (!busy) return;
          const p = { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
          gsap.set(fx, { clipPath: 'none' });
          const hole = { r: 1 }, HR = maxR(p.x, p.y) * 1.04;
          const paint = () => {
            const m = 'radial-gradient(circle at ' + p.x.toFixed(1) + 'px ' + p.y.toFixed(1) + 'px, rgba(0,0,0,0) ' + Math.max(0, hole.r - 1).toFixed(1) + 'px, #000 ' + hole.r.toFixed(1) + 'px)';
            fx.style.webkitMaskImage = m; fx.style.maskImage = m;
          };
          paint();
          reveal = gsap.to(hole, { r: HR, duration: REVEAL, ease: M.ease.brand, onUpdate: paint, onComplete: finish });
        }, ms(GAP));
      }
    });
  }
  window.__waveDebug = () => ({ busy, display: fx.style.display });
  return { run, get busy() { return busy; } };
}

/* ═══ FORMULARIO ══════════════════════════════════════════════════════════════
   Sin backend. Con FORM_ENDPOINT envía por fetch; sin él, arma un mailto con
   todo prellenado. La validación y los estados no usan GSAP. */
const RULES = {
  nombre:   { text: 'Me falta tu nombre.',                           ok: (v) => !!v },
  /* 10 dígitos ignorando espacios y guiones: así no se rechaza a quien escribe 782 123 4567 */
  whatsapp: { text: 'El WhatsApp necesita 10 dígitos.',               ok: (v) => v.replace(/[^0-9]/g, '').length >= 10 },
  correo:   { text: 'Revisa el correo, algo no cuadra.',              ok: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) },
  consent:  { text: 'Necesito tu visto bueno para poder contactarte.', ok: (v, el) => el.checked }
};
const REQUIRED = ['nombre', 'whatsapp', 'correo', 'consent'];
const SEND_TIMEOUT = 8000;                                           /* ms: pasado este tiempo, error */
const SENT_LOCK = 6000;                                              /* ms que el formulario queda inerte tras el éxito */
const OK_HOLD = 2400;                                                /* ms que el botón muestra la palomita */

function initForm() {
  const form = $('form');
  if (!form) return;
  const msg = $('cfMsg'), btn = form.querySelector('.cf-send');
  let sending = false, locked = false, submitted = false;
  const dirty = {};

  /* Marcado esperado (index.html): un <p.cf-err#err-*> por campo obligatorio. Si falta, se crea. */
  function errEl(name) {
    let err = $('err-' + name);
    const input = form.elements[name];
    if (!err && input) {
      err = document.createElement('p');
      err.className = 'cf-err'; err.id = 'err-' + name; err.setAttribute('role', 'alert');
      const host = input.closest('.cf-cell') || input.closest('.cf-field, .cf-consent');
      host.appendChild(err);
    }
    if (err && input) {
      const ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (ids.indexOf(err.id) < 0) { ids.push(err.id); input.setAttribute('aria-describedby', ids.join(' ')); }
    }
    return err;
  }
  const cellOf = (input) => input.closest('.cf-field, .cf-consent');

  function nudge(cell) {
    if (mode.reduced) return;                                         /* sin movimiento: el estado lo dan el color y el mensaje */
    cell.classList.remove('nudge');
    void cell.offsetWidth;                                            /* reinicia la animación si ya estaba puesta */
    cell.classList.add('nudge');
  }
  function setInvalid(name) {
    const input = form.elements[name], err = errEl(name), cell = cellOf(input);
    if (err) err.textContent = RULES[name].text;
    input.setAttribute('aria-invalid', 'true');
    cell.classList.add('bad');
  }
  function clearInvalid(name) {
    const input = form.elements[name], err = errEl(name), cell = cellOf(input);
    if (err) err.textContent = '';
    input.removeAttribute('aria-invalid');
    cell.classList.remove('bad', 'nudge');
  }
  const valueOf = (name) => (name === 'consent' ? '' : (form.elements[name].value || '').trim());
  function validate(name) {
    const input = form.elements[name];
    if (RULES[name].ok(valueOf(name), input)) { clearInvalid(name); return true; }
    setInvalid(name);
    return false;
  }

  /* Estado del mensaje general (#cfMsg: «Enviando…», éxito y errores de red) */
  function setMsg(text, kind) {
    msg.textContent = text || '';
    msg.classList.remove('bad', 'ok');
    if (kind) msg.classList.add(kind);
  }

  /* Botón: cargando (anillo dentro), éxito (palomita sobre la flecha) */
  const arrow = btn && btn.querySelector('.pill-arrow');
  let ringBtn = null, checkBtn = null, ringAnim = null, okTimer = 0;
  if (arrow) {
    ringBtn = document.createElement('span');
    ringBtn.className = 'm-ring m-ring--btn'; ringBtn.setAttribute('aria-hidden', 'true');
    checkBtn = makeCheck();
    arrow.appendChild(ringBtn); arrow.appendChild(checkBtn);
  }
  function setBusy(on) {
    sending = on;
    if (on) { form.setAttribute('aria-busy', 'true'); if (btn) btn.setAttribute('aria-busy', 'true'); }
    else { form.removeAttribute('aria-busy'); if (btn) btn.removeAttribute('aria-busy'); }
    Array.prototype.forEach.call(form.querySelectorAll('input:not([type=checkbox]), textarea'), (f) => { f.readOnly = on; });
    if (ringAnim) { ringAnim.cancel(); ringAnim = null; }
    if (on) ringAnim = sonar(ringBtn, 3);                             /* un timbre cada 1,100 ms, máximo tres */
  }
  function buttonOk() {
    if (!btn) return;
    clearTimeout(okTimer);
    btn.setAttribute('data-state', 'ok');
    if (checkBtn) showCheck(checkBtn);
    okTimer = setTimeout(() => { btn.removeAttribute('data-state'); if (checkBtn) checkBtn.classList.remove('on'); }, OK_HOLD);
  }

  /* Anillo local: sale del botón y se apaga (nunca mayor de 220 px) */
  function ringFromButton() {
    if (!btn || mode.reduced) return;
    const ring = document.createElement('span');
    ring.className = 'm-ring m-ring--send'; ring.setAttribute('aria-hidden', 'true');
    ring.style.left = (btn.offsetLeft + btn.offsetWidth / 2) + 'px';
    ring.style.top = (btn.offsetTop + btn.offsetHeight / 2) + 'px';
    form.appendChild(ring);
    const a = sonar(ring, 1);
    if (a) a.onfinish = () => { ring.remove(); }; else ring.remove();
  }

  function lockFields() {
    locked = true;
    form.classList.add('is-sent');
    Array.prototype.forEach.call(form.children, (c) => { if (c !== btn && c !== msg && !c.classList.contains('m-ring')) c.inert = true; });
    if (btn && form.contains(document.activeElement) && document.activeElement !== btn) btn.focus({ preventScroll: true });   /* el foco no se pierde al volverse inerte su campo */
    setTimeout(() => {
      Array.prototype.forEach.call(form.children, (c) => { c.inert = false; });
      form.reset(); submitted = false;
      Object.keys(dirty).forEach((k) => { delete dirty[k]; });
      form.classList.remove('is-sent');
      locked = false;
    }, SENT_LOCK);
  }

  function done(d) {
    setMsg('Listo, ' + d.nombre.split(' ')[0] + '. Te contesto en menos de 24 horas.', 'ok');
    const check = makeCheck();
    msg.insertBefore(check, msg.firstChild);                          /* el texto accesible sigue siendo solo el mensaje */
    showCheck(check);
    ringFromButton();
    buttonOk();
    lockFields();
  }
  function netFail() { setMsg('No salio. Escribeme a ' + FORM_EMAIL, 'bad'); }

  form.addEventListener('submit', (e) => {
    e.preventDefault();                                               /* jamás un GET nativo con los datos en la URL */
    if (sending || locked) return;
    submitted = true;
    setMsg('');
    let first = null;
    REQUIRED.forEach((k) => { if (!validate(k) && !first) first = form.elements[k]; });
    if (first) {
      first.focus();
      nudge(cellOf(first));
      return;
    }

    const d = {};
    ['nombre', 'negocio', 'whatsapp', 'correo', 'mensaje'].forEach((k) => { d[k] = (form.elements[k].value || '').trim(); });
    const cuerpo = 'Nombre: ' + d.nombre + '\nNegocio: ' + (d.negocio || '-') +
                   '\nWhatsApp: ' + d.whatsapp + '\nCorreo: ' + d.correo +
                   '\n\n' + (d.mensaje || '(sin mensaje)');

    if (FORM_ENDPOINT) {
      setBusy(true); setMsg('Enviando...');
      const ctl = window.AbortController ? new AbortController() : null;
      const to = setTimeout(() => { if (ctl) ctl.abort(); }, SEND_TIMEOUT);
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
        signal: ctl ? ctl.signal : undefined
      }).then((r) => {
        clearTimeout(to); setBusy(false);
        if (r.ok) done(d); else netFail();
      }).catch(() => { clearTimeout(to); setBusy(false); netFail(); });
    } else {
      window.location.href = 'mailto:' + FORM_EMAIL +
        '?subject=' + encodeURIComponent('Demo para ' + (d.negocio || d.nombre)) +
        '&body=' + encodeURIComponent(cuerpo);
      done(d);
    }
  });

  /* Validación al salir del campo (si ya escribió algo o ya intentó enviar) y corrección en vivo */
  form.addEventListener('input', (e) => {
    const n = e.target && e.target.name;
    if (!n) return;
    dirty[n] = true;
    if (RULES[n] && e.target.getAttribute('aria-invalid') === 'true') validate(n);
  });
  form.addEventListener('change', (e) => {
    const n = e.target && e.target.name;
    if (n === 'consent' && e.target.getAttribute('aria-invalid') === 'true') validate('consent');
  });
  form.addEventListener('focusout', (e) => {
    const n = e.target && e.target.name;
    if (!n || !RULES[n] || n === 'consent' || locked || sending) return;
    if (dirty[n] || submitted) validate(n);
  });
  REQUIRED.forEach((k) => { if (form.elements[k]) errEl(k); });       /* asegura contenedor y aria-describedby desde el inicio */
}

/* ═══ PUNTERO: cursor propio, imanes, vista previa de casos y origen del relleno ═══
   UN solo pointermove (con rAF) para todo. El cursor nativo nunca se oculta salvo
   sobre .case-card y [data-cursor="drag"]; sin punto y sin mix-blend-mode. */
function initPointer() {
  const ring = $('cursorRing'), label = $('curLabel'), preview = $('preview');                  /* sin punto (#cursorDot ya no existe en el marcado): nativo + anillo */
  const pvArt = $('pvArt'), pvLabel = $('pvLabel');

  const discs = {};
  if (ring) {
    ['base', 'link', 'drag'].forEach((k, i) => {
      const d = document.createElement('i');
      d.className = 'cur-d cur-d' + (i + 1);
      discs[k] = d; ring.appendChild(d);
    });
    discs.link.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (label) { label.textContent = H.Draggable ? 'Arrastra' : 'Ver'; discs.drag.appendChild(label); }
    ring.setAttribute('data-state', 'hidden');
  }

  const magnets = Array.prototype.slice.call(document.querySelectorAll('.magnetic.pill-grad'))   /* los tres CTA principales */
    .map((el) => ({ el, cx: 0, cy: 0, ox: 0, oy: 0 }));
  let magDirty = true;

  let on = false, seen = false, raf = 0, px = 0, py = 0, tgt = null, lastTgt = null, state = 'hidden', curCard = null;
  let rx = null, ry = null, vx = null, vy = null, pvW = 300, pvH = 200;

  function setState(s) {
    if (!ring || s === state) return;
    state = s;
    ring.setAttribute('data-state', s);
  }
  function resolve(t) {
    if (!t || !t.closest) return 'base';
    if (t.closest('.case-card, [data-cursor="drag"]')) return 'drag';
    if (t.closest('input, textarea, select, [contenteditable="true"], label')) return 'text';
    if (t.closest('a, button, .pill, [role="button"], summary')) return 'link';
    return 'base';
  }

  /* Vista previa de casos */
  function showPreview(card) {
    if (!preview || !card) return;
    const cols = (card.getAttribute('data-pv') || '#511BDB,#BDA8F1').split(',');
    pvArt.style.background = 'linear-gradient(120deg,' + cols[0] + ',' + cols[1] + ',' + cols[0] + ')';
    pvArt.style.backgroundSize = '300% 300%';
    pvLabel.textContent = card.getAttribute('data-pvlabel') || '';
    preview.classList.add('is-on');
  }
  function hidePreview() { if (preview) preview.classList.remove('is-on'); }
  const pvPos = (x, y) => ({
    x: (x + 26 + pvW > window.innerWidth) ? x - 26 - pvW : x + 26,   /* junto al borde derecho se voltea */
    y: clamp(y - 100, 8, window.innerHeight - pvH - 8)
  });

  function measureMagnets() {
    magnets.forEach((m) => {
      const r = m.el.getBoundingClientRect();
      m.cx = r.left + r.width / 2 - m.ox; m.cy = r.top + r.height / 2 - m.oy;   /* centro sin el desplazamiento actual */
    });
    magDirty = false;
  }
  function pullMagnets(x, y) {
    if (magDirty) measureMagnets();
    for (let i = 0; i < magnets.length; i++) {
      const m = magnets[i], dx = x - m.cx, dy = y - m.cy, d = Math.hypot(dx, dy);
      let ox = 0, oy = 0;
      if (d < M.magnet.r) { const p = (1 - d / M.magnet.r) * M.magnet.k; ox = dx * p; oy = dy * p; }
      if (Math.abs(ox - m.ox) < 0.05 && Math.abs(oy - m.oy) < 0.05) continue;   /* sin escrituras de más */
      m.ox = ox; m.oy = oy;
      m.el.style.translate = (ox || oy) ? ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px' : '';   /* CSS suaviza; no hay quickTo que se desincronice */
    }
  }
  function releaseMagnets() { magnets.forEach((m) => { m.ox = 0; m.oy = 0; m.el.style.translate = ''; }); }

  function tick() {
    raf = 0;
    const t = tgt && tgt.nodeType === 1 ? tgt : null;
    /* lecturas primero */
    let spot = null, sr = null;
    if (!mode.reduced && t) {
      spot = t.closest('.spot, .pill');
      if (spot) sr = spot.getBoundingClientRect();
    }
    if (on && magnets.length && magDirty) measureMagnets();
    /* escrituras */
    if (spot && sr) { spot.style.setProperty('--mx', (px - sr.left) + 'px'); spot.style.setProperty('--my', (py - sr.top) + 'px'); }
    if (!on) return;
    if (ring && rx) {
      if (!seen) { gsap.set(ring, { x: px, y: py }); seen = true; ring.classList.add('is-on'); }
      else { rx(px); ry(py); }
    }
    pullMagnets(px, py);
    if (t !== lastTgt) {
      lastTgt = t;
      setState(resolve(t));
      const card = t && t.closest ? t.closest('.case-card') : null;
      if (card !== curCard) { curCard = card; if (card) showPreview(card); else hidePreview(); }
    }
    if (curCard && vx) { const q = pvPos(px, py); vx(q.x); vy(q.y); }
  }
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    px = e.clientX; py = e.clientY; tgt = e.target;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  /* Presión y salida de la ventana */
  window.addEventListener('pointerdown', () => { if (on && ring) ring.classList.add('is-down'); }, { passive: true });
  ['pointerup', 'pointercancel', 'dragend'].forEach((ev) => { window.addEventListener(ev, () => { if (ring) ring.classList.remove('is-down'); }, { passive: true }); });
  root.addEventListener('mouseleave', () => { setState('hidden'); lastTgt = null; releaseMagnets(); hidePreview(); curCard = null; });
  window.addEventListener('scroll', () => { magDirty = true; }, { passive: true });   /* solo marca: se vuelve a medir con el siguiente movimiento */
  window.addEventListener('resize', () => { magDirty = true; });
  document.addEventListener('saphi:intro-done', () => { magDirty = true; });

  /* Foco de teclado en un caso: la vista previa se ancla a la tarjeta */
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (on && t && t.closest) {
      const card = t.closest('.case-card');
      if (card && preview && vx) {
        const r = card.getBoundingClientRect();
        gsap.set(preview, { x: clamp(r.left + 24, 8, window.innerWidth - pvW - 8), y: clamp(r.top - pvH - 8, 8, window.innerHeight - pvH - 8) });
        curCard = card; showPreview(card);
      }
    }
    /* el relleno nace del centro cuando el foco llega por teclado (paridad con el hover) */
    if (t && t.matches && t.matches('.pill') && t.matches(':focus-visible')) { t.style.setProperty('--mx', '50%'); t.style.setProperty('--my', '50%'); }
  });
  document.addEventListener('focusout', (e) => {
    if (curCard && e.target && e.target.closest && e.target.closest('.case-card') === curCard && !e.relatedTarget) { curCard = null; hidePreview(); }
  });

  function enable() {
    if (on) return;
    on = true; seen = false; lastTgt = null;
    document.body.classList.add('has-cursor');
    if (ring && !rx) {
      rx = gsap.quickTo(ring, 'x', { duration: M.dur.layout, ease: M.ease.brand });
      ry = gsap.quickTo(ring, 'y', { duration: M.dur.layout, ease: M.ease.brand });
    }
    if (preview && !vx) {
      vx = gsap.quickTo(preview, 'x', { duration: M.dur.reveal, ease: M.ease.brand });
      vy = gsap.quickTo(preview, 'y', { duration: M.dur.reveal, ease: M.ease.brand });
    }
    if (preview) { pvW = preview.offsetWidth || pvW; pvH = preview.offsetHeight || pvH; }
  }
  function disable() {
    if (!on) return;
    on = false;
    document.body.classList.remove('has-cursor');                     /* cursor nativo de vuelta (P1-11) */
    if (ring) { ring.classList.remove('is-on', 'is-down'); setState('hidden'); }
    releaseMagnets(); hidePreview(); curCard = null;
  }
  /* Existe solo con puntero fino, pantalla ancha y movimiento permitido; se reevalúa al cambiar cualquiera */
  function sync() { if (mode.motion && finePointer.matches && wideScreen.matches) enable(); else disable(); }
  onChange(finePointer, sync); onChange(wideScreen, sync);
  document.addEventListener('saphi:mode', sync);
  sync();
}

/* ═══ Arranque: lo básico siempre; el movimiento, cada uno aislado con safe() ═══ */
initModality();
safe('roll', initRoll);
safe('menu', initMenu);
safe('onda', () => { wave = initWave(); });
safe('anclas', initAnchors);
safe('formulario', initForm);
safe('puntero', initPointer);
