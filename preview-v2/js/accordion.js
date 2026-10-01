/* ══ Acordeón de productos ═════════════════════════════════════════════════════
   Puerto a JavaScript plano del componente AccordionGallery (React Bits), con la
   misma matemática de reparto (flexGrow), la misma inclinación 3D de los paneles
   cerrados, el mismo arrastre de parallax del medio y el mismo revelado de la
   etiqueta. Diferencias deliberadas, todas pedidas: el medio es el gradiente
   granulado del producto en vez de una foto; el panel abierto despliega el
   detalle completo; los cerrados conservan su color atenuado en vez de irse a
   gris; y los cerrados muestran su nombre en vertical para saber qué vas a abrir.
   Sin GSAP o con prefers-reduced-motion el reparto se aplica sin transición. */
(function () {
  var root = document.getElementById('agRow');
  if (!root) return;
  var panels = Array.prototype.slice.call(root.querySelectorAll('.ag-panel'));
  if (!panels.length) return;

  var COUNT = panels.length;
  var EXPAND = 0.52, GAP = 10, TILT = 8, PARALLAX = 0.5, DUR = 0.6, EASE = 'power3.out', STAGGER = 0.06;
  var DEFAULT_INDEX = 0;

  var hasGsap = typeof window.gsap !== 'undefined';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var apilado = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

  var medios = panels.map(function (p) { return p.querySelector('.ag-media'); });
  var cuerpos = panels.map(function (p) { return p.querySelector('.ag-body'); });
  var lomos = panels.map(function (p) { return p.querySelector('.ag-spine'); });

  var activo = Math.min(Math.max(DEFAULT_INDEX, 0), COUNT - 1);
  var mediaSize = 700, tl = null, primera = true;

  var r = Math.min(Math.max(EXPAND, 0.2), 0.9);
  var grow = COUNT > 1 ? (r * (COUNT - 1)) / (1 - r) : 1;

  function enMovil() { return !!(apilado && apilado.matches); }

  function aplicar(animar) {
    if (enMovil()) return;   /* en móvil manda el CSS: lista con todo a la vista */
    var dur = (animar && hasGsap && !reduce) ? DUR : 0;
    if (tl) tl.kill();
    if (!hasGsap) { aplicarSinGsap(); return; }
    tl = gsap.timeline();

    panels.forEach(function (panel, i) {
      var esActivo = i === activo;
      panel.classList.toggle('ag-panel--active', esActivo);
      panel.setAttribute('aria-current', esActivo ? 'true' : 'false');

      var rot = esActivo ? 0 : (i < activo ? TILT : -TILT);
      tl.to(panel, { flexGrow: esActivo ? grow : 1, rotateY: rot, '--ag-dim': esActivo ? 0.06 : 0.5, duration: dur, ease: EASE }, 0);

      var medio = medios[i];
      if (medio) {
        var arrastre = Math.max(-1.5, Math.min(1.5, activo - i));
        var desplaza = arrastre * PARALLAX * mediaSize * 0.06;
        tl.to(medio, {
          xPercent: -50, yPercent: -50, x: esActivo ? 0 : desplaza,
          duration: dur, ease: EASE
        }, 0);
      }

      var lomo = lomos[i];
      if (lomo) tl.to(lomo, { opacity: esActivo ? 0 : 1, duration: dur * 0.6, ease: EASE }, 0);

      var cuerpo = cuerpos[i];
      if (cuerpo) {
        if (esActivo) tl.to(cuerpo, { opacity: 1, x: 0, duration: dur, ease: EASE, delay: reduce ? 0 : STAGGER }, 0);
        else tl.to(cuerpo, { opacity: 0, x: -14, duration: dur * 0.6, ease: EASE }, 0);
      }
    });
  }

  /* Plan B sin GSAP: el acordeón sigue funcionando, solo sin transición */
  function aplicarSinGsap() {
    panels.forEach(function (panel, i) {
      var esActivo = i === activo;
      panel.classList.toggle('ag-panel--active', esActivo);
      panel.setAttribute('aria-current', esActivo ? 'true' : 'false');
      panel.style.flexGrow = esActivo ? grow : 1;
      panel.style.setProperty('--ag-dim', esActivo ? '0.06' : '0.5');
      if (lomos[i]) lomos[i].style.opacity = esActivo ? '0' : '1';
      if (cuerpos[i]) cuerpos[i].style.opacity = esActivo ? '1' : '0';
    });
  }

  function medir() {
    var caja = root.getBoundingClientRect();
    var total = caja.width;
    if (!total) return;
    var util = Math.max(total - GAP * (COUNT - 1), 120);
    mediaSize = Math.max(160, util * r * 1.22);
    root.style.setProperty('--ag-media-size', Math.round(mediaSize) + 'px');
    root.style.setProperty('--ag-body-w', Math.round(Math.max(280, util * r)) + 'px');
    aplicar(!primera);
  }

  function activar(i, animar) {
    if (i === activo || enMovil()) return;
    activo = i;
    aplicar(animar !== false);
  }

  panels.forEach(function (panel, i) {
    panel.addEventListener('mouseenter', function () { activar(i); });
    panel.addEventListener('focus', function () { activar(i); });
    panel.addEventListener('click', function (e) {
      /* primer clic abre el panel; con el panel ya abierto, el enlace de su
         contenido hace lo suyo sin que el acordeón se meta */
      if (i !== activo && !enMovil()) { e.preventDefault(); activar(i); }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); activar((i + 1) % COUNT); panels[(i + 1) % COUNT].focus(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); var p = (i - 1 + COUNT) % COUNT; activar(p); panels[p].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); activar(0); panels[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); activar(COUNT - 1); panels[COUNT - 1].focus(); }
    });
  });

  if (window.ResizeObserver) new ResizeObserver(medir).observe(root);
  else window.addEventListener('resize', medir);
  if (apilado && apilado.addEventListener) apilado.addEventListener('change', function () { medir(); });

  medir();
  primera = false;

  /* los enlaces del menú y del hero a un producto abren su panel */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id) setTimeout(function () { window.__agAbrir(id); }, 0);
  }, true);

  /* apertura por id, para el menú y para pruebas */
  window.__agAbrir = function (id) {
    var i = panels.findIndex(function (p) { return p.getAttribute('data-p') === id; });
    if (i < 0) return false;
    activar(i);
    return true;
  };
})();
