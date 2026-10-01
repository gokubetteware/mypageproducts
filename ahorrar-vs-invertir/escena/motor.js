/* Motor de la escena. Determinista: seek(t) siempre da el mismo cuadro.
   Sin requestAnimationFrame propio ni Math.random: todo depende solo de t. */
(function (root) {
  const PISO = 820, S = 2; // 1 unidad del rig = 2 px → MICHI mide ~400 px de orejas a piso
  const FONDOS = {
    arcilla: ['#EDD2BC', '#E1BEA3'], agua: ['#B7D3CF', '#9FC2BD'], petroleo: ['#1E5652', '#1E5652'],
  };
  const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
  const $ = id => document.getElementById(id);

  const E = {
    PISO, S, cfg: null, timing: null, subs: null, emociones: null,
    elementos: [], fondos: [], michi: [], gatitos: [], tl: null, avisos: [],
  };

  // ---------- tiempos ----------
  E.B = n => E.timing.bloques[n - 1];
  function buscar(b, frase) {
    const ws = E.timing.palabras.filter(p => p.bloque === b), q = frase.split(/\s+/).map(norm).filter(Boolean);
    for (let i = 0; i + q.length <= ws.length; i++) if (q.every((k, j) => ws[i + j].k === k)) return [ws[i], ws[i + q.length - 1]];
    throw new Error(`Ancla no encontrada en bloque ${b}: «${frase}»`);
  }
  E.T = (b, frase) => buscar(b, frase)[0].t0;   // la voz empieza a decirlo
  E.Tf = (b, frase) => buscar(b, frase)[1].t1;  // la voz termina de decirlo

  // ---------- elementos ----------
  function nodo(html, o) {
    const d = document.createElement('div');
    d.className = 'abs ' + (o.cls || '');
    d.style.left = o.x + 'px'; d.style.top = o.y + 'px';
    if (o.w) d.style.width = o.w + 'px';
    if (o.h) d.style.height = o.h + 'px';
    if (o.style) d.style.cssText += o.style;
    d.innerHTML = html;
    if (o.qa) d.dataset.qa = o.qa;
    if (o.nombre) d.dataset.nombre = o.nombre;
    $('escena').appendChild(d);
    return d;
  }
  // Un elemento visible en [tin, tout). Entra y sale por corte.
  E.el = (html, o, tin, tout) => {
    const d = nodo(html, o);
    E.elementos.push({ d, tin, tout });
    return d;
  };
  // Objeto con lienzo del Michiverso (viewBox 40 -110 70 115, piso en y = 0). x0 = posición de x = 40.
  E.objMichi = (svg, x0, s, tin, tout, nombre) =>
    E.el(svg, { x: x0, y: PISO - 110 * s, w: 70 * s, h: 115 * s, qa: 'objeto', nombre }, tin, tout);
  // Objeto propio apoyado en el piso.
  E.objPiso = (svg, x, w, h, tin, tout, nombre) => E.el(svg, { x, y: PISO - h, w, h, qa: 'objeto', nombre }, tin, tout);
  // Marca ámbar de 400 ms, de izquierda a derecha.
  E.marca = (el, t) => {
    const m = el.querySelector('.marca');
    E.tl.fromTo(m, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'none', immediateRender: false }, t);
    gsap.set(m, { scaleX: 0 });
  };

  E.fondo = (t, tipo) => E.fondos.push({ t, tipo });

  // ---------- MICHI ----------
  // pista: [t, clave, nivel, {gaze:[x,y], x}] · clave null = MICHI fuera de cuadro.
  E.michiEn = (t, clave, nivel, extra) => E.michi.push({ t, clave, nivel: nivel || 2, ...(extra || {}) });

  function parpadeos(dur) {
    let s = 7, t = 1.3; const out = [];
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    while (t < dur) { out.push(t); t += 3.2 + rnd() * 2.2; }
    return out;
  }
  let PARP = [];

  function poseMichi(t) {
    const pista = E.michi; let i = -1;
    for (let k = 0; k < pista.length; k++) if (pista[k].t <= t) i = k;
    if (i < 0 || !pista[i].clave) return null;
    const cur = pista[i];
    // El neutro es el punto de regreso: 3 cuadros de neutro entre dos expresiones distintas.
    let clave = cur.clave, nivel = cur.nivel;
    const prev = i > 0 ? pista[i - 1] : null;
    if (prev && prev.clave && prev.clave !== clave && prev.clave !== 'neutro' && clave !== 'neutro' && t - cur.t < 0.1) { clave = 'neutro'; nivel = 1; }
    const est = E.emociones.states.find(s => s.key === clave);
    if (!est) throw new Error('Expresión inexistente: ' + clave);
    const p = Object.assign({}, est.levels[Math.min(nivel, est.levels.length) - 1]);
    if (cur.gaze && clave === cur.clave) { p.gazeX = cur.gaze[0]; p.gazeY = cur.gaze[1]; }
    p.bodySy *= 1 + 0.01 * Math.sin(2 * Math.PI * t / 4);           // respiración ±1 % cada 4 s
    if (p.closed < 0.5) for (const b of PARP) {                       // parpadeo parcial de 170 ms
      const u = (t - b) / 0.17;
      if (u >= 0 && u < 1) { const c = 0.68 * Math.sin(Math.PI * u); p.lidTopL = Math.max(p.lidTopL, c); p.lidTopR = Math.max(p.lidTopR, c); }
    }
    return { p, x: cur.x || 1440, clave, nivel };
  }

  // ---------- gatitos ----------
  const EXPR = ['neutro', 'alegria', 'sorpresa', 'preocupacion', 'duda', 'alivio'];
  // g: {g, x, tin, tout, expr: [[t, expr]], obj: [[t, svg|null]]}
  E.gatito = g => {
    const c = nodo('', { x: g.x - 116 * S, y: PISO - 228 * S, w: 232 * S, h: 266 * S, qa: 'personaje', nombre: g.g });
    c.dataset.ox = g.x;
    c.style.visibility = 'hidden';
    const imgs = {};
    for (const e of EXPR) {
      const im = document.createElement('img');
      im.src = `/assets/gatitos/svg/${g.g}/${g.g}_${e}.svg`;
      im.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;transform-origin:50% 85.7%';
      c.appendChild(im); imgs[e] = im;
    }
    const objs = (g.obj || []).map(([t, svg]) => {
      const d = svg ? nodo(svg, { x: g.x + 40 * S, y: PISO - 110 * S, w: 70 * S, h: 115 * S, qa: 'objeto', nombre: g.g + '_objeto' }) : null;
      return { t, d };
    });
    E.gatitos.push({ ...g, c, imgs, objs });
  };

  function pintarGatitos(t) {
    for (const g of E.gatitos) {
      const vis = t >= g.tin && t < g.tout;
      g.c.style.visibility = vis ? 'visible' : 'hidden';
      let e = 'neutro';
      for (const [te, ex] of g.expr) if (te <= t) e = ex;
      for (const k of EXPR) {
        g.imgs[k].style.display = k === e ? 'block' : 'none';
        g.imgs[k].style.transform = `scaleY(${1 + 0.01 * Math.sin(2 * Math.PI * (t + g.x / 300) / 4)})`;
      }
      let act = null;
      for (const o of g.objs) if (o.t <= t) act = o;
      for (const o of g.objs) if (o.d) o.d.style.visibility = vis && o === act ? 'visible' : 'hidden';
    }
  }

  // ---------- subtítulos de prueba (capa aparte) ----------
  let capa = null, caja = null;
  function crearCapa() {
    capa = document.createElement('div');
    capa.id = 'capa-subtitulos';
    caja = document.createElement('div');
    caja.className = 'caja';
    capa.appendChild(caja);
    $('stage').appendChild(capa); // último hijo: encima de toda la escena
  }
  function pintarSubs(t) {
    const g = E.subs.grupos.find(x => t >= x.t_entrada && t < x.t_salida);
    if (!g) { caja.style.display = 'none'; caja.dataset.grupo = ''; return; }
    caja.style.display = 'block';
    if (caja.dataset.grupo === String(g.n)) return;
    caja.dataset.grupo = g.n;
    caja.innerHTML = g.lineas.map(l => `<div>${l}</div>`).join('');
    let fs = 46;
    const fit = () => { caja.style.fontSize = fs + 'px'; caja.style.lineHeight = Math.round(fs * 56 / 46) + 'px'; };
    fit();
    const ancho = () => Math.max(...[...caja.children].map(c => c.scrollWidth));
    while (ancho() > 832 && fs > 42) { fs--; fit(); }
    if (ancho() > 832) E.avisos.push(`Subtítulo ${g.n}: no cabe ni a 42 px`);
    caja.dataset.fs = fs;
  }

  // ---------- seek ----------
  function seek(t) {
    let f = 'arcilla';
    for (const x of E.fondos) if (x.t <= t) f = x.tipo;
    $('muro').style.background = FONDOS[f][0];
    $('piso').style.background = FONDOS[f][1];
    $('stage').dataset.fondo = f;
    for (const x of E.elementos) x.d.style.visibility = t >= x.tin && t < x.tout ? 'visible' : 'hidden';
    E.tl.seek(t, false);
    const m = poseMichi(t), md = $('michi');
    if (m) {
      md.style.visibility = 'visible';
      md.style.left = (m.x - 116 * S) + 'px';
      md.innerHTML = MichiRig.render(m.p, { id: 'mi', highlight: '#FFFFFF' });
      md.dataset.expr = m.clave + ' ' + m.nivel;
    } else { md.style.visibility = 'hidden'; md.dataset.expr = '— (sin MICHI)'; }
    pintarGatitos(t);
    if (capa) pintarSubs(t);
  }

  // Cajas visibles para el control de encimados.
  function cajas() {
    const out = [];
    const vis = el => { for (let e = el; e && e.id !== 'stage'; e = e.parentElement) if (getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none') return false; return true; };
    document.querySelectorAll('[data-qa]').forEach(el => {
      if (!vis(el)) return;
      let r;
      if (el.dataset.qa === 'texto') { const rg = document.createRange(); rg.selectNodeContents(el); r = rg.getBoundingClientRect(); }
      else if (el.dataset.qa === 'personaje') { const ox = +el.dataset.ox; r = { left: ox - 62, right: ox + 105, top: PISO - 311, bottom: PISO }; }
      else r = el.getBoundingClientRect();
      out.push({ qa: el.dataset.qa, nombre: el.dataset.nombre || el.textContent.trim().slice(0, 40), x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom) });
    });
    const md = $('michi');
    if (md.style.visibility !== 'hidden') { const x = parseFloat(md.style.left) + 116 * S; out.push({ qa: 'personaje', nombre: 'MICHI', x0: x - 80, x1: x + 150, y0: PISO - 400, y1: PISO }); }
    if (caja && caja.style.display === 'block') { const r = caja.getBoundingClientRect(); out.push({ qa: 'subtitulo', nombre: 'grupo ' + caja.dataset.grupo, x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom), fs: +caja.dataset.fs }); }
    return out;
  }

  async function iniciar() {
    const j = u => fetch(u).then(r => r.json());
    E.cfg = await j('/config.json');
    E.timing = await j('/timing.json');
    E.subs = await j('/fuentes/subtitulos_prueba.json');
    E.emociones = await j('/lib/michi_emotions.json');
    await OBJ.load();
    PARP = parpadeos(E.timing.duracion + 1);
    E.tl = gsap.timeline({ paused: true });
    // Cabecera y MICHI viven en la escena; los define bloques.js.
    nodo('', { x: 0, y: PISO - 228 * S, w: 232 * S, h: 266 * S, qa: 'michi-host' }).id = 'michi';
    $('michi').style.visibility = 'hidden';
    root.BLOQUES(E);
    $('escena').appendChild($('michi'));
    if (E.cfg.subtitulos === true) crearCapa();   // con false la capa no se crea
    // Fuentes: si una no carga, se detiene la exportación.
    const caras = ['400 20px "Instrument Serif"', '400 20px Archivo', '600 20px Archivo', '700 20px Archivo', '600 20px Figtree', '700 20px Figtree', '400 20px "Permanent Marker"'];
    await Promise.all(caras.map(c => document.fonts.load(c)));
    await new Promise(r => setTimeout(r, 1500));
    const faltan = caras.filter(c => !document.fonts.check(c));
    if (faltan.length) throw new Error('Fuentes sin cargar: ' + faltan.join(', '));
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    seek(0);
    return { duracion: E.timing.duracion, subtitulos: !!capa };
  }

  root.E = E;
  root.seek = t => { seek(t); return document.getElementById('michi').dataset.expr || ''; };
  root.cajas = cajas;
  root.READY = iniciar().catch(e => { root.ERROR = String(e && e.stack || e); throw e; });
})(window);
