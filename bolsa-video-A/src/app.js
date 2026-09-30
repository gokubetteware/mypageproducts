/* Video A — motor de escenas. Todo es función del tiempo: window.seek(t).
   Una sola gsap.timeline pausada; MICHI se recalcula en cada cuadro desde el rig.
   Sin setTimeout, sin Date.now, sin requestAnimationFrame libre, sin azar. */
(function () {
  'use strict';
  const FPS = 30;
  const EASE = 'power2.inOut';
  const MOVE = 0.6;                     // duración estándar de un movimiento (0.5–0.9 s)
  const FLOOR_Y = 820;

  const fail = msg => { throw new Error(msg); };
  const $ = sel => document.querySelector(sel);

  async function load() {
    const get = u => fetch(u).then(r => r.ok ? r.json() : fail('no se pudo leer ' + u));
    const GMETA = await get('../assets/gatitos/gatitos_meta.json');
    const GSVG = {};
    await Promise.all(Object.keys(GMETA).map(k => fetch(`../assets/gatitos/${k}.svg`).then(r => r.ok ? r.text() : fail('falta ' + k)).then(s => { GSVG[k] = s; })));
    const [TL, NUM, EMO] = await Promise.all([
      fetch('../timeline/timeline_final.json').then(r => (r.ok ? r.json() : get('../timeline/timeline_nominal.json'))),
      get('../timeline/numeros.json'),
      get('../assets/michi/michi_emotions.json'),
    ]);
    // Sin sustituciones silenciosas: si una letra no carga, se detiene la exportación.
    const faces = ['400 40px "Instrument Serif"', '700 40px "Archivo"', '600 40px "Archivo"', '800 40px "Archivo"', '600 40px "Figtree"', '700 40px "Figtree"', '600 40px "Caveat"'];
    await Promise.all(faces.map(f => document.fonts.load(f)));
    for (const f of faces) if (!document.fonts.check(f)) fail('fuente no cargada: ' + f);
    return { TL, NUM, EMO, GMETA, GSVG };
  }

  function build({ TL, NUM, EMO, GMETA, GSVG }) {
    const R = window.MichiRig;
    const tl = gsap.timeline({ paused: true, defaults: { ease: EASE, duration: MOVE } });

    // ---- Datos ----
    const N = k => (k in NUM.texto ? NUM.texto[k] : fail('cifra sin clave en numeros.json: ' + k));
    const V = k => (k in NUM.valores ? NUM.valores[k] : fail('valor sin clave en numeros.json: ' + k));
    const EV = id => TL.eventos.find(e => e.id === id) || fail('evento no existe: ' + id);
    const T = id => EV(id).t;
    // Toda cifra escrita en un evento del JSON debe coincidir con numeros.json.
    const assertNums = (id, ...keys) => {
      const e = EV(id);
      const found = (JSON.stringify([e.texto, e.delta, e.props]).match(/[+−-]?\d[\d,]*/g) || [])
        .map(s => s.replace('-', '−'));
      const want = keys.map(N);
      for (const w of want) if (!found.includes(w)) fail(`${id}: la cifra ${w} no coincide con el evento (${found})`);
    };

    $('#header .h2').textContent = TL.cabecera.linea2;
    const layer = $('#layer');
    let bucket = [];                       // nodos de la escena en curso
    const el = (html, style, cls) => {
      const d = document.createElement('div');
      d.className = 'abs ' + (cls || '');
      Object.assign(d.style, style || {});
      d.innerHTML = html;
      layer.appendChild(d);
      bucket.push(d);
      return d;
    };
    // Al cerrar una escena se desvanece todo lo suyo (lo que ya estaba oculto no cambia).
    const endScene = t => { const b = bucket; bucket = []; tl.to(b, { opacity: 0, duration: 0.35, ease: 'none' }, t - 0.35); };
    const SC = id => TL.escenas.find(s => s.id === id) || fail('escena no existe: ' + id);
    // Fondo: ruta «Arcilla y petróleo». Apertura y cierre en arcilla; explicación en agua.
    const BG = { arcilla: ['#EDD2BC', '#E1BEA3'], agua: ['#B7D3CF', '#9FC2BD'] };
    const bg = (name, t) => { tl.set('#wall', { backgroundColor: BG[name][0] }, t); tl.set('#floor', { backgroundColor: BG[name][1] }, t); };
    const txt = s => String(s).replace(/\s+/g, ' ').trim();
    const assertEq = (id, got, want) => { if (txt(got) !== txt(want)) fail(`${id}: «${got}» no coincide con el evento («${want}»)`); };
    const show = (node, t, from) => tl.fromTo(node, { autoAlpha: 0, y: 24, ...from }, { autoAlpha: 1, x: 0, y: 0 }, t);
    const hide = (node, t, d) => tl.to(node, { autoAlpha: 0, duration: d || 0.4 }, t);
    const cut = (node, t) => tl.fromTo(node, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' }, t);
    // «tic» suave: cada cifra nueva que aparece deja su tiempo en TICS (pista aparte, tic_track.wav).
    const TICS = [];
    const cutN = (node, t) => { TICS.push(t); return cut(node, t); };

    // Catpesos: solo los archivos originales; el valor se arma con billetes existentes.
    const BILLS = [1000, 500, 200, 100, 50, 20];
    const billsFor = v => { const out = []; for (const b of BILLS) while (v >= b) { out.push(b); v -= b; } if (v) fail('sin billete para ' + v); return out; };
    const billImg = (b, w) => `<img src="../assets/catpesos/billete_${b}.png" style="width:${w}px;display:block">`;

    // Pedacito de la taquería de doña Lupe (plano, sin logos).
    const tileSVG = s => `<svg width="${s}" height="${s}" viewBox="0 0 300 300">
      <rect x="2" y="2" width="296" height="296" fill="#F3EFE6" stroke="#05070A" stroke-width="4"/>
      ${[0, 1, 2, 3, 4].map(i => `<path d="M${2 + i * 59.2} 2h59.2v70a29.6 18 0 0 1-59.2 0z" fill="${i % 2 ? '#F3EFE6' : '#1E5652'}"/>`).join('')}
      <rect x="2" y="2" width="296" height="70" fill="none" stroke="#05070A" stroke-width="4"/>
      <rect x="40" y="130" width="220" height="110" fill="#E3DDD0" stroke="#05070A" stroke-width="3"/>
      <rect x="40" y="228" width="220" height="12" fill="#05070A"/>
      <line x1="150" y1="130" x2="150" y2="228" stroke="#05070A" stroke-width="3"/>
    </svg>`;

    // ---- MICHI ----
    const MSTATE = {
      tranquilo: ['tranquilidad', 1], confiado: ['confianza', 1], sorprendido: ['sorpresa', 2],
      preocupado: ['preocupacion', 1], aliviado: ['alivio', 2],
    };
    const stateOf = name => {
      const [key, lv] = MSTATE[name] || fail('estado de MICHI sin mapeo: ' + name);
      const st = EMO.states.find(s => s.key === key) || fail('estado no existe en el rig: ' + key);
      return { p: st.levels[lv], micro: st.micro || {} };
    };
    const michiEvents = TL.eventos.filter(e => e.do === 'michi').map(e => ({ t: e.t, ...stateOf(e.estado) }));
    const BLEND = 0.4;
    const MICHI = { x: 1580, h: 400 };
    const easeIO = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

    // Parpadeos: mismo patrón que el panel del rig (cada 3.2–5.4 s, 170 ms, cierre parcial 0.68),
    // pero con una secuencia fija (hash del índice) en lugar de Math.random: render determinista.
    const hash01 = i => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
    const BLINKS = [];
    for (let s = 2.3, i = 0; s < TL.duracion_s + 6; i++) { BLINKS.push(s); s += 3.2 + 2.2 * hash01(i); }
    const BLINK_DUR = 0.17;

    // Microanimación del panel del rig («reposo vivo»): respiración según el estado,
    // cola y cabeza con movimiento muy sutil. «freeze» (sorpresa) congela el cuerpo.
    const MICHI_QUIET = [];
    const quiet = t => { let f = 1; for (const [a, b] of MICHI_QUIET) f = Math.min(f, Math.min(1, Math.max(a - t, t - b, 0) / 0.3)); return f; };
    const micro = (p, m, t, inBlend) => {
      const ms = t * 1000;
      const q = quiet(t);                   // 0 = una ilustración se mueve: MICHI quieto
      if (!m.freeze && q > 0) {
        const br = m.breath === 'rapida' ? [0.02, 700] : m.breath === 'lenta' ? [0.007, 5200] : [0.003, 3600];
        // respiración visible pero tranquila: se usa al menos 1.2 % de amplitud
        p.bodySy *= 1 + q * Math.max(br[0], 0.012) * Math.sin(2 * Math.PI * ms / Math.max(br[1], 3600));
        p.tailWag = (p.tailWag || 0) + q * Math.sin(ms / 370) * 0.45;
        p.headDy = (p.headDy || 0) + q * Math.sin(ms / 1250) * 0.14;
        p.gazeX = Math.max(-1, Math.min(1, (p.gazeX || 0) + q * Math.sin(ms / 1700) * 0.012));
        if (m.tailWag || p.tail === 'agitada') p.tailWag += q * 5 * Math.sin(2 * Math.PI * ms / 560);
      }
      if (!m.freeze && !inBlend && q >= 1 && p.closed < 0.5) {
        const b0 = BLINKS.find(b => t >= b && t < b + BLINK_DUR);
        if (b0 != null) {
          const c = 0.68 * Math.sin(Math.PI * (t - b0) / BLINK_DUR);
          p.lidTopL = Math.max(p.lidTopL, c);
          p.lidTopR = Math.max(p.lidTopR, c);
        }
      }
      return p;
    };
    const michiAt = t => {
      let prev = stateOf('tranquilo'), cur = prev, t0 = -1;
      for (const m of michiEvents) { if (m.t > t) break; prev = cur; cur = m; t0 = m.t; }
      const k = t0 < 0 ? 1 : Math.min(1, (t - t0) / BLEND);
      const p = R.normalize(k >= 1 ? cur.p : R.lerp(prev.p, cur.p, easeIO(k)));
      micro(p, cur.micro, t, k < 1);
      // MICHI mira un objeto (p. ej. la cifra en la pausa de predicción): gazeX con entrada y salida suaves.
      for (const g of GAZE) {
        const w = Math.min(1, Math.max(0, (t - g.t0) / 0.3), Math.max(0, (g.t1 - t) / 0.3));
        if (w > 0) p.gazeX = p.gazeX + (g.x - p.gazeX) * easeIO(w);
      }
      return p;
    };
    const GAZE = [];
    const michiG = $('#michi-g');
    michiG.setAttribute('transform', `translate(${MICHI.x} ${FLOOR_Y}) scale(${MICHI.h / 199})`);
    const drawMichi = t => { michiG.innerHTML = R.render(michiAt(t), { bare: true, id: 'mc' }); };

    // ---- Cámara (zoom a MICHI, render 4K) ----
    const zoom = (id, fx, fy, s) => {
      const e = EV(id);
      if (e.render !== 'ZOOM MICHI — render 4K') fail(id + ': zoom sin marca 4K');
      const to = { scale: s, x: 960 - fx * s, y: 540 - fy * s };
      tl.fromTo('#world', { scale: 1, x: 0, y: 0 }, { ...to, duration: MOVE }, e.t);
      tl.to('#world', { scale: 1, x: 0, y: 0, duration: MOVE }, e.t + e.dur_s - MOVE);
    };


    // =====================================================================================
    //  v2 · UNA sola cosa manda. Tres capas como máximo: ilustración + 1 elemento principal + MICHI.
    //  - Todo texto, bloque de números o callout es un «principal» (main): entra uno y el anterior sale.
    //  - Las ilustraciones (taquería, personas, dinero) son la capa de fondo; mientras una se mueve,
    //    MICHI no hace microanimación (solo se mueve uno a la vez).
    //  - Avisos ¡OJO! legales: momento propio de ≥ 2 s, sin otro texto.
    // =====================================================================================
    const TOP = 215;
    const STAGE_FLOOR = FLOOR_Y;
    const ILUS_MOVES = [];                                   // intervalos en que una ilustración se mueve
    const moving = (t, d) => { ILUS_MOVES.push([t, t + d]); };
    const ilus = (html, style) => el(html, style, 'ilus');
    const showI = (node, t, from, d) => { moving(t, d || MOVE); return tl.fromTo(node, { autoAlpha: 0, y: 20, ...from }, { autoAlpha: 1, x: 0, y: 0, duration: d || MOVE }, t); };
    const hideI = (node, t, d) => { moving(t, d || 0.4); return tl.to(node, { autoAlpha: 0, duration: d || 0.4 }, t); };
    const toI = (node, vars, t) => { moving(t, vars.duration || MOVE); return tl.to(node, vars, t); };

    // ---- Espacio principal ----
    const MAINS = [];
    const DELAYS = [];
    const mainEl = (html, style, cls) => el(html, { left: '96px', top: TOP + 'px', ...style }, 'main ' + (cls || ''));
    // o.hold: tiempo mínimo a la vista; o.parts: [{node, t, tic, out}] que se revelan dentro del bloque;
    // o.legal: aviso con momento propio; o.until: fin explícito.
    const main = (node, t, o) => { const m = { node, t0: t, hold: 2, parts: [], ...(o || {}) }; MAINS.push(m); return m; };
    const opMain = (idOp, idRes, expr, res, t0, extra) => {
      assertEq(idOp, expr, EV(idOp).expr);
      assertEq(idRes, '= ' + res, EV(idRes).resultado);
      const d = mainEl(`<div class="serif op-e">${expr}</div><div class="serif op-r">= ${res}</div>${extra || ''}`, { left: '560px' });
      const tOp = t0 == null ? T(idOp) : t0;
      return main(d, tOp, { hold: Math.max(2, T(idRes) - tOp + 1.5), parts: [{ node: d.querySelector('.op-r'), t: T(idRes), tic: true }] });
    };
    const callout = (html, t, o) => main(mainEl(`<div class="rotulo">${html}</div>`), t, { hold: 2, ...(o || {}) });
    const legal = (html, t) => main(mainEl(`<div class="alerta"><b>¡OJO!</b> ${html}</div>`), t, { hold: 2.2, legal: true });
    const headline = (text, t, o) => main(mainEl(`<div class="serif headline">${text}</div>`), t, { hold: 2, ...(o || {}) });
    const numBlock = (html, x, y, t, o) => main(el(html, { left: x + 'px', top: y + 'px' }, 'main'), t, { hold: 1.5, tic: true, ...(o || {}) });

    // Tarjeta de definición: palabra + definición corta (sin «Ejemplo»), en la franja superior,
    // que nunca toca ilustraciones (y ≥ 500) ni a MICHI (x ≥ 1440).
    const cards = TL.eventos.filter(e => e.do === 'card');
    const cardMain = id => {
      const e = EV(id);
      const n = cards.indexOf(e) + 1;
      const d = mainEl(`
        <div class="card-k">PALABRA ${n} DE ${cards.length}</div>
        <div class="card-t">${e.palabra.charAt(0) + e.palabra.slice(1).toLowerCase()}</div>
        <div class="card-d">${e.def}${e.nota_tarjeta ? ` ${e.nota_tarjeta}.` : ''}</div>`, {}, 'defcard');
      return main(d, e.t, { hold: 3 });
    };

    // Personas (siluetas planas, sin rostro) y objetos
    const personSVG = (h, hat, fill) => {
      fill = fill || '#5E5A52';
      return `<svg width="${h * 0.42}" height="${h}" viewBox="0 0 84 200">
        ${hat ? `<path d="M14 40h56v-6H58l-4-22H30l-4 22H14z" fill="${fill}"/>` : ''}
        <circle cx="42" cy="${hat ? 52 : 36}" r="22" fill="${fill}"/>
        <path d="M4 200V116c0-30 16-46 38-46s38 16 38 46v84z" fill="${fill}"/>
      </svg>`;
    };
    const person = (x, h, hat) => ilus(personSVG(h, hat), { left: x + 'px', top: (STAGE_FLOOR - h) + 'px' });
    const token = s => `<div style="width:${s}px;height:${s}px;background:#1E5652;border:3px solid #05070A"></div>`;
    const dashedTile = s => `<svg width="${s}" height="${s}" viewBox="0 0 300 300"><g fill="none" stroke="#05070A" stroke-width="5" stroke-dasharray="18 12">
      <rect x="3" y="3" width="294" height="294"/><path d="M3 72h294"/><rect x="40" y="130" width="220" height="110"/></g></svg>`;
    const papSVG = (s, fill) => `<svg width="${s}" height="${s}" viewBox="0 0 300 300">
      <rect x="2" y="2" width="296" height="296" fill="${fill || '#F3EFE6'}" stroke="#05070A" stroke-width="4"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${2 + i * 49.3}" y="2" width="49.3" height="62" fill="${i % 2 ? '#F3EFE6' : '#5E5A52'}"/>`).join('')}
      <rect x="2" y="2" width="296" height="62" fill="none" stroke="#05070A" stroke-width="4"/>
      <rect x="36" y="110" width="100" height="130" fill="#E3DDD0" stroke="#05070A" stroke-width="3"/>
      <rect x="170" y="110" width="94" height="186" fill="#E3DDD0" stroke="#05070A" stroke-width="3"/>
      <path d="M60 150h52M60 175h52M60 200h40" stroke="#05070A" stroke-width="4"/>
    </svg>`;
    const gridIlus = (x, s, cols, rows) => {
      const g = ilus(`<div class="grid10" style="width:100%;height:100%;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">${Array.from({ length: cols * rows }, () => '<div class="cell"></div>').join('')}</div>`,
        { left: x + 'px', top: (STAGE_FLOOR - s) + 'px', width: s + 'px', height: s + 'px' });
      return [g, [...g.querySelectorAll('.cell')]];
    };
    const popCell = (c, t) => { tl.set(c, { zIndex: 2, position: 'relative' }, t); toI(c, { scale: 1.8, boxShadow: '0 0 0 4px #E8C46A', duration: 0.5 }, t); tl.set(c, { scale: 1, boxShadow: '0 0 0 0px #E8C46A' }, 0); };
    const unpopCell = (c, t) => toI(c, { scale: 1, boxShadow: '0 0 0 0px #E8C46A', duration: 0.4 }, t);
    const big = (n, extra) => `<span class="serif" style="font-size:130px;line-height:136px;white-space:nowrap">${n}</span>${extra || ''}`;
    const cue = id => TL.cues.find(c => c.id === id) || fail('cue no existe: ' + id);

    // Cabecera «CCM / tema»: fija todo el video (decisión de Omar: no es invasiva).

    // ---- Gatitos del Michiverso: el MISMO rig de MICHI, recoloreado, con su rasgo propio ----
    // Paleta y rasgos: PDF «Personajes secundarios» (v0.1). Todos comparten los 51 estados de MICHI.
    // 78 % de la altura de MICHI (Rayitas 86 %). Máximo 2 junto a MICHI. No hablan: reaccionan.
    // Nunca ámbar ni negro con ojos ámbar (eso es solo de MICHI). Planos, sin sombras ni contornos.
    const GATS = {
      canela:   { k: 0.78, pelaje: '#A68F6E', ojos: '#1E5652', linea: '#05070A',
        cuerpo: '<ellipse cx="0" cy="-38" rx="15" ry="36" fill="#F3EFE6"/>',
        cuello: '<rect x="-30" y="-101" width="60" height="12" rx="6" fill="#2F6B4F"/><path d="M8 -92 l10 30 l-10 3 l-7 -31z" fill="#2F6B4F"/>',
        cabeza: '<path d="M-13 -112 q13 7 26 0 q-2 9 -13 9 q-11 0 -13 -9z" fill="#F3EFE6"/>' },
      mango:    { k: 0.78, pelaje: '#9A7F5F', ojos: '#9FC2BD', linea: '#05070A',
        cuerpo: '<circle cx="15" cy="-30" r="17" fill="#5E5A52"/>',
        cuello: '',
        cabeza: '<circle cx="-36" cy="-166" r="13" fill="#5E5A52"/><path d="M-40 -170 C-38 -196 38 -196 40 -170 Z" fill="#7A5518"/><rect x="18" y="-173" width="44" height="7" rx="3.5" fill="#7A5518"/>' },
      rayitas:  { k: 0.86, pelaje: '#8C8577', ojos: '#E3DDD0', linea: '#F3EFE6',
        cuerpo: '<path d="M-37 -60h13M-38 -46h13M-38 -32h13M24 -60h13M25 -46h13M25 -32h13" stroke="#5E5A52" stroke-width="5" stroke-linecap="round"/>',
        cuello: '',
        cabeza: '<g fill="none" stroke="#05070A" stroke-width="3.4"><circle cx="-18.24" cy="-135.95" r="15"/><circle cx="18.24" cy="-135.95" r="15"/><path d="M-3.2 -137h6.4"/></g><path d="M-30 -156l15 -3M30 -156l-15 -3" stroke="#F3EFE6" stroke-width="3.6" stroke-linecap="round"/>' },
      tigrillo: { k: 0.78, pelaje: '#5F6664', ojos: '#E1BEA3', linea: '#F3EFE6',
        cuerpo: '<path d="M-37 -58h12M-38 -44h12M-38 -30h12M25 -58h12M26 -44h12M26 -30h12" stroke="#8C8577" stroke-width="5" stroke-linecap="round"/>',
        cuello: '<rect x="-27" y="-98" width="54" height="8" rx="4" fill="#9A3B2E"/><circle cx="0" cy="-86" r="5.5" fill="#7A5518"/>',
        cabeza: '' },
      bosco:    { k: 0.78, pelaje: '#5E5A52', ojos: '#B7D3CF', linea: '#F3EFE6',
        cuerpo: '<ellipse cx="0" cy="-36" rx="15" ry="36" fill="#E3DDD0"/><ellipse cx="-20" cy="-3" rx="11" ry="5" fill="#E3DDD0"/><ellipse cx="20" cy="-3" rx="11" ry="5" fill="#E3DDD0"/>',
        cuello: '<path d="M-27 -99 L27 -99 L0 -72 Z" fill="#1E5652"/>',
        cabeza: '<path d="M-13 -112 q13 7 26 0 q-2 9 -13 9 q-11 0 -13 -9z" fill="#E3DDD0"/>' },
    };
    const GOLD = /#E8C46A/gi, INK = '#05070A';
    const gatitoSVG = (name, p, uid) => {
      const G2 = GATS[name];
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      box.innerHTML = R.render(p, { bare: true, id: uid });
      for (const n of box.querySelectorAll('*')) {
        const layerOf = n.closest('[data-layer]');
        const lay = n.getAttribute('data-layer') || (layerOf && layerOf.getAttribute('data-layer')) || '';
        const isPupil = /PUPIL/.test(lay);
        for (const at of ['fill', 'stroke']) {
          const v = (n.getAttribute(at) || '').toUpperCase();
          if (v === INK && !isPupil) n.setAttribute(at, G2.pelaje);
          else if (v === '#E8C46A') {
            if (/IRIS/.test(lay)) n.setAttribute(at, G2.ojos);
            else { n.setAttribute(at, G2.linea); }
          }
        }
      }
      const body = box.querySelector('[data-layer="MICHI_BODY"]');
      // rasgos del cuerpo recortados a la silueta del cuerpo (no se salen)
      if (body) body.insertAdjacentHTML('beforeend', `<clipPath id="${uid}-cb"><path d="${R.G.body}"/></clipPath><g clip-path="url(#${uid}-cb)">${G2.cuerpo}</g>${G2.cuello}`);
      const head = box.querySelector('[data-layer="MICHI_HEAD"]');
      if (head && G2.cabeza) head.insertAdjacentHTML('beforeend', G2.cabeza);
      return box.innerHTML;
    };
    const GAT_EVENTS = [];                       // [{g, t, p}] cambios de estado (se mezclan como en MICHI)
    const gatitos = [];
    const MICHI_BUSY = () => michiEvents.map(m => [m.t - 0.05, m.t + BLEND + 0.05]);
    const freeAt = (t, d) => { let x = t; for (let k = 0; k < 6; k++) { const hit = MICHI_BUSY().find(([a, b]) => x < b && x + d > a); if (!hit) break; x = hit[1]; } return x; };
    const gstate = (key, lv) => {
      const st = EMO.states.find(s => s.key === key) || fail('estado no existe en el rig: ' + key);
      return st.levels[Math.min(lv == null ? 1 : lv, st.levels.length - 1)];
    };
    // Objeto de su ficha (frasco, ticket, tarjeta, maceta), a escala del gatito.
    const objSVG = (name, Hpx) => {
      const cat = GMETA[name + '_ficha'].bbox, ob = GMETA[name + '_objeto'].bbox;
      const k = Hpx / (cat[3] - cat[1]);
      const vb = [ob[0] - 1, ob[1] - 1, ob[2] - ob[0] + 2, ob[3] - ob[1] + 2];
      return { html: GSVG[name + '_objeto'].replace(/viewBox="[^"]*"/, `viewBox="${vb.join(' ')}"`).replace('<svg ', `<svg width="${vb[2] * k}" height="${vb[3] * k}" style="display:block" `),
        dx: (ob[0] - (cat[0] + cat[2]) / 2) * k, dy: (ob[3] - cat[3]) * k };
    };
    // gatito(nombre, x del centro, { objeto, espejo })
    const gatito = (name, cx, o) => {
      o = o || {};
      const G2 = GATS[name] || fail('gatito desconocido: ' + name);
      const Hpx = MICHI.h * G2.k, sc = Hpx / 199;
      const ob = o.objeto ? objSVG(name, Hpx) : null;
      const d = el(`<svg class="gsvg" viewBox="0 0 1920 1080" width="1920" height="1080" style="position:absolute;left:0;top:0;overflow:visible">
          <g transform="translate(${cx} ${STAGE_FLOOR}) scale(${o.espejo ? -sc : sc} ${sc})"><g class="gr"></g></g></svg>
          ${ob ? `<div style="position:absolute;left:${cx + (o.espejo ? -1 : 1) * Math.abs(ob.dx) * 0 + ob.dx}px;top:${STAGE_FLOOR - parseFloat(ob.html.match(/height="([\d.]+)"/)[1]) + ob.dy}px">${ob.html}</div>` : ''}`,
        { left: '0px', top: '0px', width: '1920px', height: '1080px', pointerEvents: 'none' }, 'ilus gatito');
      const g = { node: d, name, grp: d.querySelector('.gr'), uid: 'g' + gatitos.length, evs: [{ t: -1, p: gstate('neutro', 0) }] };
      tl.set(d, { autoAlpha: 0 }, 0);
      g.entra = (t, desde) => { const tt = freeAt(t, 0.7); moving(tt, 0.7); tl.fromTo(d, { autoAlpha: 0, x: desde == null ? 60 : desde }, { autoAlpha: 1, x: 0, duration: 0.7 }, tt); return g; };
      g.sale = (t, hacia) => { const tt = freeAt(t, 0.5); moving(tt, 0.5); tl.to(d, { autoAlpha: 0, x: hacia == null ? 60 : hacia, duration: 0.5 }, tt); return g; };
      g.cara = (key, t, lv) => { const tt = freeAt(t, BLEND); moving(tt, BLEND); g.evs.push({ t: tt, p: gstate(key, lv) }); g.evs.sort((a, b) => a.t - b.t); return g; };
      gatitos.push(g);
      return g;
    };
    const drawGatitos = t => {
      for (const g of gatitos) {
        if (+getComputedStyle(g.node).opacity < 0.01) continue;
        let prev = g.evs[0], cur = prev;
        for (const e of g.evs) { if (e.t > t) break; prev = cur; cur = e; }
        const k = cur.t < 0 ? 1 : Math.min(1, (t - cur.t) / BLEND);
        const p = R.normalize(k >= 1 ? cur.p : R.lerp(prev.p, cur.p, easeIO(k)));
        g.grp.innerHTML = gatitoSVG(g.name, p, g.uid);
      }
    };

    // ================= S01 · Sorpresa + Promesa + Compromiso =================
    bg('arcilla', 0);
    (function S01() {
      assertNums('e004', 'c1_precio_accion');
      assertNums('e005', 'c7_precio_despues', 'c7b_delta_taqueria');
      // Título: presenta el tema, como lo dice la voz («Hoy vas a entender qué es la bolsa de valores»)
      const title = el(`<div class="serif" style="font-size:150px;line-height:146px">${EV('e000').texto.replace(' de valores', '<br>de valores')}</div>`,
        { left: '140px', top: '250px' }, 'main');
      main(title, T('e000'), { hold: 3, until: T('e001') });
      // «con una taquería»: la taquería completa
      const shop = ilus(tileSVG(300), { left: '1060px', top: (STAGE_FLOOR - 300) + 'px' });
      showI(shop, T('e000b'));
      // «Mira este pedacito»: la taquería va a la izquierda, se cuadricula y se resalta un pedacito
      toI(shop, { x: -800, duration: 0.8 }, T('e001'));
      const [grid0, cells0] = gridIlus(260, 300, 10, 10);
      tl.set(grid0, { autoAlpha: 0 }, 0);
      tl.set(grid0, { autoAlpha: 1 }, T('e001') + 0.85);
      moving(T('e001') + 0.85, 0.5);
      tl.fromTo(cells0, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', stagger: { each: 0.004, grid: [10, 10], from: 'start' } }, T('e001') + 0.85);
      popCell(cells0[44], T('e001') + 1.4);
      // «Ayer valía 1,000» · «Hoy vale 1,500» (+500): un solo bloque, con sus billetes CATPESOS
      const rows = el(`
        <div style="display:flex;gap:70px">
          <div><div class="lbl">Ayer</div>${big(N('c1_precio_accion'))}<div class="lbl">catpesos</div>
            <div style="margin-top:18px">${billsFor(V('c1_precio_accion')).map(b => billImg(b, 240)).join('')}</div></div>
          <div class="hoy"><div class="lbl">Hoy</div><div style="display:flex;gap:22px;align-items:baseline">${big(N('c7_precio_despues'))}
            <span class="serif pos" style="font-size:96px">${N('c7b_delta_taqueria')}</span></div><div class="lbl">catpesos</div>
            <div style="margin-top:18px;display:flex;gap:12px">${billsFor(V('c1_precio_accion')).concat(billsFor(V('c7_precio_despues') - V('c1_precio_accion'))).map(b => billImg(b, 200)).join('')}</div></div>
        </div>`, { left: '640px', top: '250px' }, 'main');
      main(rows, T('e004'), { tic: true, hold: 3, parts: [{ node: rows.querySelector('.hoy'), t: T('e005'), tic: true }] });
      const tile = shop;
      // «La bolsa subió»: titular genérico de periódico (sans; sin logos)
      hideI([tile, grid0], T('e007') - 0.45);
      const news = el(`
        <div style="font-family:Archivo;font-weight:800;font-size:96px;line-height:100px">${EV('e007').texto}</div>
        <div style="margin-top:30px;display:grid;gap:16px">
          ${[820, 780, 800, 500].map(w => `<div style="height:10px;width:${w}px;background:#8C8577"></div>`).join('')}
        </div>`, { left: '140px', top: '260px', width: '920px', padding: '44px 50px', background: '#F3EFE6', border: '2px solid #05070A' }, 'main');
      main(news, T('e007'), { hold: 3 });
      // Bosco (inversión) oyó «la bolsa subió» y se quedó igual
      const bosco = gatito('bosco', 1230);
      bosco.entra(T('e007') + 0.2).cara('duda', T('e007') + 2.2);
      bosco.sale(T('e010') - 0.6);
      // Pregunta principal (titular de la escena) con el pedacito y su «?»
      const qTile = ilus(`${tileSVG(240)}<div class="serif" style="position:absolute;left:84px;top:-150px;font-size:150px;line-height:150px">?</div>`, { left: '300px', top: (STAGE_FLOOR - 240) + 'px' });
      showI(qTile, T('e009'));
      headline(EV('e009').texto, T('e009'), { hold: 3 });
      // Tres pasos (un solo bloque; entra un paso a la vez)
      hideI(qTile, T('e010') - 0.45);
      const steps = el(['e010', 'e011', 'e012'].map((id, i) => {
        const [n, t] = EV(id).texto.split(' · ');
        return `<div class="step s${i}"><div class="serif" style="font-size:96px;line-height:92px">${n}</div><div class="step-t">${t}</div></div>`;
      }).join(''), { left: '96px', top: '400px', display: 'flex', gap: '30px' }, 'main');
      main(steps, T('e010'), { hold: 3, parts: [
        { node: steps.querySelector('.s1'), t: T('e011') }, { node: steps.querySelector('.s2'), t: T('e012') }] });
      tl.set([steps.querySelector('.s0')], { autoAlpha: 1 }, 0);
    })();
    endScene(SC('S02').start);

    // ================= S02 · B1 Base =================
    bg('agua', SC('S02').start);
    (function S02() {
      assertNums('e030', 'c2_venta');
      assertEq('e026', `1 de ${N('taqueria_acciones')}`, EV('e026').texto);
      if (V('taqueria_acciones') !== 100) fail('la cuadrícula es 10×10: se esperaban 100 acciones');
      const facade = ilus(tileSVG(300), { left: '150px', top: (STAGE_FLOOR - 300) + 'px' });
      showI(facade, T('e020'));
      const [grid, cells] = gridIlus(150, 300, 10, 10);
      tl.set(grid, { autoAlpha: 0 }, 0);
      tl.set(grid, { autoAlpha: 1 }, T('e022'));
      moving(T('e022'), 0.9);
      tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', stagger: { each: 0.006, grid: [10, 10], from: 'start' } }, T('e022'));

      const name = el(`<div class="serif" style="font-size:72px;line-height:80px">Taquería de doña Lupe</div>
        <div style="display:flex;gap:24px;align-items:baseline;margin-top:8px">${big(N('taqueria_valor'))}<span class="lbl">catpesos</span></div>`,
        { left: '520px', top: (STAGE_FLOOR - 250) + 'px' }, 'main');
      main(name, T('e020'), { hold: 3, tic: true });
      opMain('e023', 'e024', `${N('taqueria_valor')} ÷ ${N('taqueria_acciones')}`, N('c1_precio_accion'));
      popCell(cells[44], T('e026'));
      numBlock(`<div class="serif" style="font-size:110px;line-height:110px">1 de ${N('taqueria_acciones')}</div>`, 520, STAGE_FLOOR - 190, T('e026'), { tic: false });
      cardMain('e027');
      unpopCell(cells[44], T('e029') - 0.45);
      const second = ilus(dashedTile(200), { left: '520px', top: (STAGE_FLOOR - 200) + 'px' });
      showI(second, T('e029'));
      numBlock(`<div class="lbl">Necesita</div><div style="display:flex;gap:20px;align-items:baseline">${big(N('c2_venta'))}<span class="lbl">catpesos</span></div>`, 760, STAGE_FLOOR - 200, T('e030'));
      const sold = cells.slice(100 - V('venta_acciones'));
      moving(T('e031'), 0.9);
      tl.to(sold, { backgroundColor: '#1E5652', duration: 0.5, stagger: 0.02 }, T('e031'));
      opMain('e032', 'e033', `${N('venta_acciones')} × ${N('c1_precio_accion')}`, N('c2_venta'));
      const second2 = ilus(tileSVG(200), { left: '520px', top: (STAGE_FLOOR - 200) + 'px' });
      tl.set(second2, { autoAlpha: 0 }, 0);
      hideI(second, T('e034'), 0.5);
      toI(second2, { autoAlpha: 1, duration: 0.5 }, T('e034'));
      opMain('e035', 'e036', `${N('taqueria_acciones')} − ${N('venta_acciones')}`, N('c3_quedan'));
      // Vecinos del Michiverso: carita de gato (genérica, plana) en cada cuadrito vendido
      sold.forEach(c => { c.innerHTML = `<svg viewBox="0 0 30 30"><path d="M8 9l1-6 5 4h2l5-4 1 6c1 1 2 3 2 6 0 6-4 10-9 10s-9-4-9-10c0-3 1-5 2-6z" fill="#F3EFE6"/></svg>`; });
      const people = sold.map(c => c.querySelector('svg'));
      tl.set(people, { autoAlpha: 0 }, 0);
      moving(T('e037'), 0.8);
      tl.to(people, { autoAlpha: 1, duration: 0.4, stagger: 0.02 }, T('e037'));
      // Los vecinos que compraron las 20 acciones: Canela (con su frasco de ahorro) y Bosco
      const canela = gatito('canela', 880, { objeto: true });
      const bosco = gatito('bosco', 1190);
      canela.entra(T('e037') + 0.4);
      bosco.entra(T('e037') + 1.2);
      canela.cara('alegria', cue('c019').t + 1.0);
      bosco.cara('alegria', cue('c019').t + 1.6);
      cardMain('e038');
    })();
    endScene(SC('S03').start);

    // ================= S03 · Re-enganche 1 + B2 =================
    (function S03() {
      assertNums('e062', 'c1_precio_accion');
      assertNums('e063', 'c1_precio_accion');
      assertNums('e064', 'c1_precio_accion');
      if (EV('e071').de !== V('c1_precio_accion') || EV('e071').a !== V('c7_precio_despues') || EV('e071').delta !== N('c7b_delta_taqueria')) fail('e071: cifras no coinciden');
      const RX = 200, H = 215;
      const ramiro = person(RX, H, true);
      const tk = ilus(token(48), { left: (RX + 84) + 'px', top: (STAGE_FLOOR - 120) + 'px' });
      showI([ramiro, tk], T('e052'));
      headline(EV('e053').texto, T('e053'), { hold: 2.5 });
      callout(EV('e054').texto.replace('UNA', '<b>UNA</b>'), T('e054'));
      const crowd = [620, 740, 860, 980, 1100, 1220].map((x, i) => person(x, 190 + (i % 3) * 10, false));
      moving(T('e055'), 1.3);
      tl.fromTo(crowd, { autoAlpha: 0, x: 160 }, { autoAlpha: 1, x: 0, duration: 0.9, stagger: 0.08 }, T('e055'));
      cardMain('e056');
      assertEq('e058', 'BOLSA = el lugar donde se compran y venden acciones', EV('e058').texto);
      callout('<b>BOLSA</b> = el lugar donde se compran y venden acciones', T('e058'), { hold: EV('e058').min_s });
      const t60 = T('e060');
      hideI(crowd.slice(1), t60, 0.5);
      toI(crowd[0], { x: -140, duration: 0.8 }, t60);
      toI(tk, { x: 196, duration: 0.9 }, t60 + 0.9);
      const tClear = cue('c029').t;
      hideI([ramiro, tk, crowd[0]], tClear - 0.45);

      // Comprador y vendedor aceptan 1,000 (un bloque; el vendedor entra al decirlo)
      assertEq('e062', `Comprador acepta ${N('c1_precio_accion')}`, EV('e062').texto);
      assertEq('e063', `Vendedor acepta ${N('c1_precio_accion')}`, EV('e063').texto);
      const deal = el(['Comprador', 'Vendedor'].map((q, i) => `<div class="w${i}" style="display:flex;gap:22px;align-items:flex-end">${personSVG(150)}
        <div><div class="lbl">${q} acepta</div><div class="serif" style="font-size:110px;line-height:110px">${N('c1_precio_accion')}</div></div></div>`).join(''),
        { left: '120px', top: (STAGE_FLOOR - 170) + 'px', display: 'flex', gap: '120px' }, 'main');
      main(deal, T('e062'), { parts: [{ node: deal.querySelector('.w1'), t: T('e063') }] });
      tl.set(deal.querySelector('.w0'), { autoAlpha: 1 }, 0);
      assertEq('e064', `Precio: ${N('c1_precio_accion')} catpesos`, EV('e064').texto);
      numBlock(`<div class="lbl">Precio</div>${big(N('c1_precio_accion'))}<div class="lbl">catpesos</div>`, 540, STAGE_FLOOR - 280, T('e064'));
      callout(EV('e067').texto.replace('UNA', '<b>UNA</b>'), T('e067'));
      const buyers = [96, 186, 276, 366].map(x => person(x, 220));
      const sell1 = person(1250, 220);
      moving(T('e068'), 1.0);
      tl.fromTo(buyers, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.08 }, T('e068'));
      tl.fromTo(sell1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, T('e068') + 0.4);
      // Predicción → Sube → 1,500 +500 → Baja: un solo bloque que cambia
      const pq = el(`<div class="lbl">Precio</div>
        <div style="display:flex;gap:28px;align-items:baseline;position:relative">
          <span class="serif" style="font-size:150px;line-height:150px;position:relative;display:inline-block;min-width:330px">
            <span class="p0">${N('c1_precio_accion')}</span><span class="p1" style="position:absolute;left:0;top:0">${N('c7_precio_despues')}</span></span>
          <span class="pd serif pos" style="font-size:110px">${N('c7b_delta_taqueria')}</span>
          <span class="qm serif" style="font-size:150px;line-height:150px">?</span>
          <span class="up big-lbl">Sube ↑</span><span class="dn big-lbl">· Baja ↓</span></div>
        <div class="lbl">catpesos</div>`, { left: '540px', top: (STAGE_FLOOR - 280) + 'px' }, 'main');
      if (T('e070') - T('e069') < EV('e069').hold_s) fail('e069: la pausa de predicción dura menos de 3 s');
      main(pq, T('e069'), { hold: T('e073') - T('e069') + 2, tic: false, parts: [
        { node: pq.querySelector('.up'), t: T('e070'), out: pq.querySelector('.qm') },
        { node: pq.querySelector('.p1'), t: T('e071'), out: pq.querySelector('.p0'), tic: true },
        { node: pq.querySelector('.pd'), t: T('e071') },
        { node: pq.querySelector('.dn'), t: T('e073') }] });
      tl.set([pq.querySelector('.p0'), pq.querySelector('.qm')], { autoAlpha: 1 }, 0);
      GAZE.push({ t0: T('e069'), t1: T('e070'), x: -0.9 });
      hideI([...buyers, sell1], T('e073') - 0.45);
    })();
    endScene(SC('S04').start);

    // ================= S04 · Re-enganche 2 + B3 (expectativas) =================
    (function S04() {
      assertNums('e083', 'ganancia_hoy');
      assertNums('e094', 'ganancia_esperada');
      if (EV('e097').de !== V('c4_toca_hoy') || EV('e097').a !== V('c5_toca_esperado') || EV('e097').delta !== N('c5b_delta')) fail('e097: cifras no coinciden');
      const facade = ilus(tileSVG(300), { left: '150px', top: (STAGE_FLOOR - 300) + 'px' });
      const [grid, cells] = gridIlus(150, 300, 10, 10);
      showI([facade, grid], SC('S04').start);
      // Ganancia 10,000 + qué es la ganancia (un solo bloque)
      assertEq('e083', `Ganancia: ${N('ganancia_hoy')} catpesos al año`, EV('e083').texto);
      const gan = el(`<div class="lbl">Ganancia</div><div style="display:flex;gap:24px;align-items:baseline">${big(N('ganancia_hoy'))}<span class="lbl">catpesos al año</span></div>
        <div class="gdef rotulo wrap" style="margin-top:14px;width:820px">${EV('e084').texto}</div>`, { left: '520px', top: (STAGE_FLOOR - 470) + 'px' }, 'main');
      main(gan, T('e083'), { hold: 3.5, tic: true, parts: [{ node: gan.querySelector('.gdef'), t: T('e084') }] });
      headline(EV('e085').texto, T('e085'));
      opMain('e086', 'e087', `${N('ganancia_hoy')} ÷ ${N('taqueria_acciones')}`, N('c4_toca_hoy'));
      popCell(cells[44], T('e088'));
      unpopCell(cells[44], T('e089') - 0.45);
      const second = ilus(tileSVG(200), { left: '520px', top: (STAGE_FLOOR - 200) + 'px' });
      showI(second, T('e089'));
      const thinkers = [780, 880, 980].map(x => person(x, 170));
      const bubble = ilus(`<div class="bubble">${EV('e090').texto}</div>`, { left: '760px', top: (STAGE_FLOOR - 250) + 'px' });
      showI([...thinkers, bubble], T('e090'));
      cardMain('e091');
      hideI([...thinkers, bubble], T('e094') - 0.45);
      assertEq('e094', `Se espera: ${N('ganancia_esperada')} catpesos al año`, EV('e094').texto);
      numBlock(`<div class="lbl">Se espera</div>${big(N('ganancia_esperada'))}<div class="lbl">catpesos al año</div>`, 780, STAGE_FLOOR - 300, T('e094'));
      opMain('e095', 'e096', `${N('ganancia_esperada')} ÷ ${N('taqueria_acciones')}`, N('c5_toca_esperado'));
      numBlock(`<div class="lbl">Le toca al año</div><div style="display:flex;gap:28px;align-items:baseline">${big(`${N('c4_toca_hoy')} → ${N('c5_toca_esperado')}`)}
        <span class="serif pos" style="font-size:110px">${N('c5b_delta')}</span></div>`, 780, STAGE_FLOOR - 300, T('e097'));
      assertEq('e098', `Ejemplo: se paga ${N('multiplo')} veces lo que le toca en un año`, EV('e098').texto);
      callout(EV('e098').texto, T('e098'), { hold: 3 });
      // Tabla lado a lado: el bloque principal; las filas entran con la voz
      hideI([facade, grid, second], T('e099') - 0.45);
      const cellsT = { e099: N('c4_toca_hoy'), e100: N('c5_toca_esperado'), e101: '×' + N('multiplo'), e102: '×' + N('multiplo'), e103: N('c6_precio_antes'), e104: N('c7_precio_despues') };
      for (const [id, v] of Object.entries(cellsT)) assertEq(id, v, EV(id).texto);
      if (EV('e104').delta !== N('c7b_delta_taqueria')) fail('e104: delta');
      const tb = el(`<table class="tabla">
        <tr><th></th><th>Antes</th><th>Se espera</th></tr>
        <tr class="r1"><td class="rt">${EV('e099').fila_titulo}</td><td class="c99">${cellsT.e099}</td><td class="c100">${cellsT.e100}</td></tr>
        <tr class="r2"><td class="rt">${EV('e101').fila_titulo}</td><td class="c101">${cellsT.e101}</td><td class="c102">${cellsT.e102}</td></tr>
        <tr class="r3"><td class="rt">${EV('e103').fila_titulo}</td><td class="c103">${cellsT.e103}</td><td class="c104">${cellsT.e104} <span class="pos" style="font-size:80px">${N('c7b_delta_taqueria')}</span></td></tr>
      </table>`, { left: '96px', top: '300px' }, 'main');
      const q = s => tb.querySelector(s);
      tl.set([q('.r1 .rt'), q('.c99')], { autoAlpha: 1 }, 0);
      main(tb, T('e099'), { hold: T('e104') - T('e099') + 1.5, tic: true, parts: [
        { node: q('.c100'), t: T('e100'), tic: true },
        { node: [q('.r2 .rt'), q('.c101')], t: T('e101') }, { node: q('.c102'), t: T('e102') },
        { node: [q('.r3 .rt'), q('.c103')], t: T('e103'), tic: true }, { node: q('.c104'), t: T('e104'), tic: true }] });
      assertEq('e106', 'cambiaron las expectativas', EV('e106').texto);
      callout(`${EV('e085').texto} → <b>Cambiaron las expectativas.</b>`, T('e106'));
      assertEq('e107', `El ${N('multiplo')} es un número de ejemplo`, EV('e107').texto);
      legal(EV('e107').texto + '.', T('e107'));
    })();
    endScene(SC('S05').start);

    // ================= S05 · Papelería + trampa =================
    (function S05() {
      assertNums('e122', 'papeleria_valor');
      assertNums('e131', 'papeleria_ganancia_hoy');
      assertNums('e132', 'papeleria_ganancia_esperada');
      if (EV('e137').de !== V('c8_papeleria_accion') || EV('e137').a !== V('c11_papeleria_precio') || EV('e137').delta !== N('c11b_delta_papeleria')) fail('e137: cifras no coinciden');
      if (V('papeleria_acciones') !== 50) fail('la cuadrícula de la papelería es 5×10: se esperaban 50 acciones');
      callout(EV('e120').texto, T('e120'));
      const pap = ilus(papSVG(300), { left: '150px', top: (STAGE_FLOOR - 300) + 'px' });
      showI(pap, T('e121'));
      numBlock(`<div class="lbl">Papelería</div>${big(N('papeleria_valor'))}<div class="lbl">catpesos</div>`, 520, STAGE_FLOOR - 300, T('e122'));
      const [grid, cells] = gridIlus(150, 300, 10, 5);
      tl.set(grid, { autoAlpha: 0 }, 0);
      tl.set(grid, { autoAlpha: 1 }, T('e123'));
      moving(T('e123'), 0.8);
      tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.01 }, T('e123'));
      void cells;
      opMain('e124', 'e125', `${N('papeleria_valor')} ÷ ${N('papeleria_acciones')}`, N('c8_papeleria_accion'), Math.max(T('e124'), T('e123') + 0.6));
      opMain('e126', 'e127', `${N('papeleria_ganancia_hoy')} ÷ ${N('papeleria_acciones')}`, N('c9_papeleria_toca_hoy'), null,
        `<div class="nota" style="margin-top:6px">${EV('e128').texto}</div>`);
      const bigPap = ilus(papSVG(280, '#E3DDD0'), { left: '1110px', top: (STAGE_FLOOR - 280) + 'px' });
      showI(bigPap, T('e130'));
      assertEq('e131', `Hoy gana: ${N('papeleria_ganancia_hoy')}`, EV('e131').texto);
      assertEq('e132', `Se espera: ${N('papeleria_ganancia_esperada')}`, EV('e132').texto);
      const hs = el(`<div class="a"><div class="lbl">Hoy gana</div><span class="serif" style="font-size:100px;line-height:106px">${N('papeleria_ganancia_hoy')}</span></div>
        <div class="b" style="margin-top:10px"><div class="lbl">Se espera</div><span class="serif" style="font-size:100px;line-height:106px">${N('papeleria_ganancia_esperada')}</span></div>`,
        { left: '520px', top: (STAGE_FLOOR - 310) + 'px' }, 'main');
      main(hs, T('e131'), { tic: true, parts: [{ node: hs.querySelector('.b'), t: T('e132'), tic: true }] });
      opMain('e133', 'e134', `${N('papeleria_ganancia_esperada')} ÷ ${N('papeleria_acciones')}`, N('c10_papeleria_toca_esperado'));
      opMain('e135', 'e136', `${N('c10_papeleria_toca_esperado')} × ${N('multiplo')}`, N('c11_papeleria_precio'));
      hideI(bigPap, T('e137') - 0.45);
      numBlock(`<div class="lbl">Precio por acción</div><div style="display:flex;gap:28px;align-items:baseline">${big(`${N('c8_papeleria_accion')} → ${N('c11_papeleria_precio')}`)}
        <span class="serif neg" style="font-size:110px">${N('c11b_delta_papeleria')}</span></div>`, 520, STAGE_FLOOR - 300, T('e137'), { hold: 2 });
      hideI([pap, grid], T('e139') - 0.45);
      const cas = el(`<div class="serif" style="font-size:180px;line-height:180px;position:relative;display:inline-block">${EV('e139').texto}<div class="strike"></div></div>`,
        { left: '420px', top: (STAGE_FLOOR - 400) + 'px' }, 'main');
      main(cas, T('e139'), { hold: 3, parts: [{ node: cas.querySelector('.strike'), t: T('e139') + 1.2, grow: true }] });
      callout(EV('e141').texto, T('e141'));
      legal(EV('e142').texto + '.', T('e142'));
    })();
    endScene(SC('S06').start);

    // ================= S06 · «Ya entendí» (vuelve la escena inicial; zoom 3/3) =================
    bg('arcilla', SC('S06').start);
    (function S06() {
      assertEq('e151', `${N('c1_precio_accion')} → ${N('c7_precio_despues')}`, EV('e151').texto);
      if (EV('e151').delta !== N('c7b_delta_taqueria')) fail('e151: delta');
      const tile = ilus(tileSVG(300), { left: '260px', top: '300px' });
      showI(tile, T('e150'));
      numBlock(`<div style="display:flex;gap:28px;align-items:baseline"><span class="serif" style="font-size:128px;line-height:136px;white-space:nowrap">${N('c1_precio_accion')} → ${N('c7_precio_despues')}</span>
        <span class="serif pos" style="font-size:110px">${N('c7b_delta_taqueria')}</span></div><div class="lbl" style="margin-top:8px">catpesos</div>`, 610, 330, T('e151'), { hold: 3 });
      callout(EV('e154').texto + '.', T('e154'), { hold: 3 });
      hideI(tile, T('e155') - 0.45);
      const ideas = el(`<div class="serif headline">${EV('e155').texto}</div><div class="i2 serif headline">${EV('e156').texto}</div>`, { left: '96px', top: '330px' }, 'main');
      main(ideas, T('e155'), { hold: 4, parts: [{ node: ideas.querySelector('.i2'), t: T('e156') }] });
    })();
    endScene(SC('S07').start);

    // ================= S07 · Salida + pantalla final =================
    (function S07() {
      const te = T('e170');
      const words = 'Hagamos la siguiente cuenta.'.split(' ');
      const end = el(`<div class="serif end-t">${words.map((w, i) => `<span class="w${i}">${w}</span>`).join(' ')}</div>
        <div class="btn" style="margin-top:40px"><div class="cta">Sígueme para la siguiente cuenta</div><div class="handle">@omar.vizu</div></div>`,
        { left: '96px', top: TOP + 'px' }, 'main');
      tl.set(end.querySelector('.w0'), { autoAlpha: 1 }, 0);
      main(end, te, { hold: 99, parts: [...words.slice(1).map((w, i) => ({ node: end.querySelector('.w' + (i + 1)), t: te + 0.45 * (i + 1) })),
        { node: end.querySelector('.btn'), t: te + 0.45 * words.length + 0.3 }] });
    })();
    michiEvents.push({ t: T('e170'), ...stateOf('confiado') });
    michiEvents.sort((a, b) => a.t - b.t);

    // ---- Resolver el espacio principal: uno a la vez, con su tiempo mínimo; el legal va solo ----
    const sceneEndAt = t => { const s = TL.escenas.find(x => t >= x.start - 0.01 && t < x.end); return s ? s.end : TL.duracion_s; };
    MAINS.sort((a, b) => a.t0 - b.t0);
    const IN = 0.35, OUT = 0.3;
    MAINS.forEach((m, i) => {
      const p = MAINS[i - 1];
      m.t = m.t0;
      if (p) {
        const pMin = Math.max(p.hold, p.legal ? 2.2 : 0, 1.2);
        const pEnd = p.t + pMin;
        if (pEnd > m.t && sceneEndAt(p.t) > m.t0) m.t = pEnd;          // no pisar al anterior
      }
      if (m.t - m.t0 > 0.15) DELAYS.push({ id: m.node.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), de: +m.t0.toFixed(2), a: +m.t.toFixed(2) });
    });
    MAINS.forEach((m, i) => {
      const n = MAINS[i + 1];
      const cap = sceneEndAt(m.t);
      m.end = Math.min(n ? n.t : Infinity, cap, m.until || Infinity);
      tl.fromTo(m.node, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: IN }, m.t);
      tl.to(m.node, { autoAlpha: 0, duration: OUT }, Math.max(m.t + IN, m.end - OUT));
      if (m.tic) TICS.push(m.t);
      for (const pt of m.parts) {
        const t = Math.max(pt.t, m.t + IN + 0.1);
        if (t > m.end - OUT) { DELAYS.push({ id: 'PARTE PERDIDA: ' + (pt.node.textContent || '').trim().slice(0, 30), de: pt.t, a: null }); continue; }
        if (pt.grow) { tl.set(pt.node, { scaleX: 0 }, 0); tl.to(pt.node, { scaleX: 1, duration: 0.8 }, t); continue; }
        tl.set(pt.node, { autoAlpha: 0 }, 0);
        tl.to(pt.node, { autoAlpha: 1, duration: 0.2, ease: 'none' }, t);
        if (pt.out) { tl.set(pt.out, { autoAlpha: 1 }, 0); tl.to(pt.out, { autoAlpha: 0, duration: 0.2, ease: 'none' }, t); }
        if (pt.tic) TICS.push(t);
      }
    });
    window.DELAYS = DELAYS;
    // Microanimación de MICHI apagada mientras una ilustración se mueve.
    MICHI_QUIET.push(...ILUS_MOVES);

    zoom('e002', 990, 560, 1.3);
    zoom('e082', 990, 560, 1.3);
    zoom('e153', 990, 560, 1.3);

    // Capas visibles en el tiempo actual (para el control de calidad): MICHI + ilustración + principales + cabecera.
    window.countLayers = () => {
      const vis = n => { const cs = getComputedStyle(n); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
      const kids = [...layer.children].filter(vis);
      const il = kids.some(k => k.classList.contains('ilus')) ? 1 : 0;
      const mains = kids.filter(k => !k.classList.contains('ilus')).length;
      const head = vis($('#header')) ? 1 : 0;
      const gat = kids.filter(k => k.classList.contains('gatito')).length;
      return { total: 1 + il + mains, michi: 1, ilustracion: il, principal: mains, cabecera: head, gatitos: gat };
    };

    const dur = TL.duracion_s;
    tl.set({}, {}, dur);
    window.DUR = dur;
    window.FPS = FPS;
    window.ZOOMS = TL.eventos.filter(e => e.do === 'zoom_michi').map(e => [e.t, e.t + e.dur_s]);
    window.TICS = [...new Set(TICS.map(x => +x.toFixed(3)))].sort((a, b) => a - b);
    window.seek = t => { tl.time(t, false); drawMichi(t); drawGatitos(t); };
    window.seek(0);
  }

  window.appReady = load().then(build);
})();
