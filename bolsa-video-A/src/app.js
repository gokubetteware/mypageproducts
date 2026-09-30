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
    const [TL, NUM, EMO] = await Promise.all([
      get('../timeline/timeline_nominal.json'),
      get('../timeline/numeros.json'),
      get('../assets/michi/michi_emotions.json'),
    ]);
    // Sin sustituciones silenciosas: si una letra no carga, se detiene la exportación.
    const faces = ['400 40px "Instrument Serif"', '700 40px "Archivo"', '600 40px "Archivo"', '700 40px "Figtree"'];
    await Promise.all(faces.map(f => document.fonts.load(f)));
    for (const f of faces) if (!document.fonts.check(f)) fail('fuente no cargada: ' + f);
    return { TL, NUM, EMO };
  }

  function build({ TL, NUM, EMO }) {
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
    const micro = (p, m, t, inBlend) => {
      const ms = t * 1000;
      if (!m.freeze) {
        const br = m.breath === 'rapida' ? [0.02, 700] : m.breath === 'lenta' ? [0.007, 5200] : [0.003, 3600];
        // respiración visible pero tranquila: se usa al menos 1.2 % de amplitud
        p.bodySy *= 1 + Math.max(br[0], 0.012) * Math.sin(2 * Math.PI * ms / Math.max(br[1], 3600));
        p.tailWag = (p.tailWag || 0) + Math.sin(ms / 370) * 0.45;
        p.headDy = (p.headDy || 0) + Math.sin(ms / 1250) * 0.14;
        p.gazeX = Math.max(-1, Math.min(1, (p.gazeX || 0) + Math.sin(ms / 1700) * 0.012));
        if (m.tailWag || p.tail === 'agitada') p.tailWag += 5 * Math.sin(2 * Math.PI * ms / 560);
      }
      if (!m.freeze && !inBlend && p.closed < 0.5) {
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


    // ================= S01 · Sorpresa + Promesa + Compromiso =================
    (function S01() {
      assertNums('e003'); // de/a numéricos: se comparan abajo
      if (EV('e003').de !== V('c1_precio_accion') || EV('e003').a !== V('c7_precio_despues')) fail('e003: de/a no coinciden con numeros.json');
      if (EV('e003').delta !== N('c7b_delta_taqueria')) fail('e003: delta no coincide');
      assertNums('e004', 'c1_precio_accion');
      assertNums('e005', 'c7_precio_despues', 'c7b_delta_taqueria');

      const P = { x: 260, y: 300 };               // pedacito
      const tile = el(tileSVG(300), { left: P.x + 'px', top: P.y + 'px' });
      show(tile, T('e001'));

      // Etiqueta de valor (gancho): 1,000 → 1,500 con +500
      const tag = el(`
        <div class="serif" style="font-size:150px;line-height:150px;position:relative;height:150px">
          <span id="v0" style="position:absolute;left:0;top:0">${N('c1_precio_accion')}</span>
          <span id="v1" style="position:absolute;left:0;top:0;visibility:hidden">${N('c7_precio_despues')}</span>
        </div>
        <div class="lbl" style="margin-top:8px">catpesos</div>`,
        { left: '610px', top: '310px', width: '420px' });
      show(tag, T('e001'));
      const bills0 = el(billsFor(V('c1_precio_accion')).map(b => billImg(b, 260)).join(''), { left: '620px', top: '560px' });
      show(bills0, T('e001'));
      const delta = el(`<span class="serif pos" style="font-size:110px">${N('c7b_delta_taqueria')}</span>`,
        { left: '1000px', top: '330px' });
      const t3 = T('e003');
      tl.to('#v0', { autoAlpha: 0, duration: 0.25, ease: 'none' }, t3);
      tl.fromTo('#v1', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'none' }, t3);
      cut(delta, t3);
      const extra = billsFor(V('c7_precio_despues') - V('c1_precio_accion'));
      const bills1 = el(extra.map(b => billImg(b, 260)).join(''), { left: '910px', top: '560px' });
      show(bills1, t3, { x: 40, y: 0 });

      // Ayer / Hoy (la voz lo dice): la etiqueta pasa a dos filas
      const t4 = T('e004'), t5 = T('e005');
      tl.to([tag, delta, bills0, bills1], { autoAlpha: 0, duration: 0.4 }, t4 - 0.45);
      const row = (dia, key, d) => el(`
        <div class="lbl">${dia}</div>
        <div class="serif" style="font-size:150px;line-height:160px">${N(key)}</div>
        <div class="lbl">catpesos</div>
        ${d ? `<div class="serif pos" style="font-size:110px;line-height:130px;margin-top:10px">${N(d)}</div>` : ''}`,
        { left: dia === 'Ayer' ? '620px' : '1010px', top: '300px', width: '380px' });
      const rAyer = row('Ayer', 'c1_precio_accion');
      const rHoy = row('Hoy', 'c7_precio_despues', 'c7b_delta_taqueria');
      cut(rAyer, t4);
      cut(rHoy, t5);

      // Titular genérico «La bolsa subió» (sin logos ni marcas)
      const t7 = T('e007');
      tl.to([tile, rAyer, rHoy], { autoAlpha: 0, duration: 0.4 }, t7 - 0.45);
      const news = el(`
        <div class="serif" style="font-size:120px;line-height:120px">${EV('e007').texto}</div>
        <div style="margin-top:34px;display:grid;gap:18px">
          ${[860, 820, 840, 520].map(w => `<div style="height:10px;width:${w}px;background:#8C8577"></div>`).join('')}
        </div>`, { left: '300px', top: '250px', width: '960px', padding: '48px 50px', background: '#F3EFE6', border: '2px solid #05070A' });
      show(news, t7);

      // Pregunta principal abierta: el pedacito 1,000 → 1,500 con «?»
      const t9 = T('e009');
      tl.to(news, { autoAlpha: 0, duration: 0.4 }, t9 - 0.45);
      const q = el(`<div class="serif" style="font-size:96px;line-height:100px">${EV('e009').texto}</div>`,
        { left: '96px', top: '170px', width: '1300px' });
      const qTile = el(tileSVG(220), { left: '300px', top: '480px' });
      const qTag = el(`
        <div class="serif" style="font-size:110px;line-height:120px">${N('c1_precio_accion')} → ${N('c7_precio_despues')}</div>
        <div style="display:flex;gap:24px;align-items:baseline"><span class="lbl">catpesos</span>
        <span class="serif pos" style="font-size:96px">${N('c7b_delta_taqueria')}</span></div>`,
        { left: '580px', top: '490px' });
      const qMark = el(`<div class="serif" style="font-size:160px;line-height:160px">?</div>`, { left: '385px', top: '315px' });
      show(q, t9);
      tl.fromTo([qTile, qTag, qMark], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'none' }, t9);

      // Tres pasos
      tl.to([qTile, qTag, qMark], { autoAlpha: 0, duration: 0.4 }, T('e010') - 0.45);
      ['e010', 'e011', 'e012'].forEach((id, i) => {
        const [n, txt] = EV(id).texto.split(' · ');
        const card = el(`
          <div class="serif" style="font-size:110px;line-height:100px">${n}</div>
          <div style="font-weight:600;font-size:40px;line-height:48px;margin-top:18px">${txt}</div>`,
          { left: 96 + i * 440 + 'px', top: '400px', width: '410px', height: '300px', padding: '30px 34px',
            background: '#F3EFE6', border: '2px solid #05070A' });
        show(card, T(id));
      });
    })();


    // ================= Elementos comunes (S02 en adelante) =================
    // Zonas: franja SUPERIOR (y 215–495, x 96–1400) para textos, operaciones, tarjetas y rótulos;
    // ESCENARIO (y 500–820, sobre el piso) para objetos y personas. MICHI a la derecha (x ≈ 1440–1720).
    const TOP = 215;
    const STAGE_FLOOR = FLOOR_Y;

    // Tira de hilo: debajo de la cabecera; la palabra vigente en tinta, las anteriores en gris cálido.
    const thread = document.createElement('div');
    thread.id = 'thread';
    $('#stage').appendChild(thread);
    const threadEvents = TL.eventos.filter(e => e.do === 'thread');
    const allItems = threadEvents.reduce((a, e) => (e.items.length > a.length ? e.items : a), []);
    thread.innerHTML = allItems.map((w, i) => `<span data-i="${i}">${i ? '<i> → </i>' : ''}${w}</span>`).join('');
    const tspans = [...thread.querySelectorAll('span')];
    tl.set(tspans, { display: 'none' }, 0);
    for (const e of threadEvents) {
      e.items.forEach((w, i) => { if (allItems[i] !== w) fail(`${e.id}: la tira de hilo cambió de palabra (${w})`); });
      tspans.forEach((s, i) => tl.set(s, { display: i < e.items.length ? 'inline' : 'none', color: i === e.activo ? '#05070A' : '#5E5A52' }, e.t));
    }
    // Anclas: la tira completa en tinta mientras dura la frase del ancla.
    for (const e of TL.eventos.filter(x => x.do === 'anchor')) {
      const cue = TL.cues.find(c => c.id === e.cue);
      const last = threadEvents.filter(x => x.t <= e.t).pop();
      tl.set(tspans, { color: '#05070A' }, e.t);
      tl.fromTo(thread, { '--u': 0 }, { '--u': 1, duration: MOVE }, e.t);
      if (last) tspans.forEach((s, i) => tl.set(s, { color: i === last.activo ? '#05070A' : '#5E5A52' }, cue.end));
      tl.to(thread, { '--u': 0, duration: 0.3 }, cue.end);
    }

    // Tarjeta de definición (manual: rectángulo petróleo; término Instrument Serif; significado Figtree).
    const cards = TL.eventos.filter(e => e.do === 'card');
    const card = (id, until) => {
      const e = EV(id);
      const n = cards.indexOf(e) + 1;
      const d = el(`
        <div class="card-k">PALABRA ${n} DE ${cards.length}</div>
        <div class="card-t">${e.palabra.charAt(0) + e.palabra.slice(1).toLowerCase()}</div>
        <div class="card-d">${e.def}${e.nota_tarjeta ? ` <b>${e.nota_tarjeta}.</b>` : ''}</div>
        <div class="card-e">Ejemplo: ${e.ejemplo}</div>`,
        { left: '96px', top: TOP + 'px', width: '1300px' }, 'defcard');
      tl.fromTo(d, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5 }, e.t);
      const end = Math.max(until, e.t + e.min_s);
      tl.to(d, { autoAlpha: 0, duration: 0.35 }, end);
      return end + 0.35;
    };
    // Rótulo (papel con filete de tinta): «Cambia UNA cosa…», «BOLSA = …».
    const label = (html, t, style) => {
      const d = el(`<div class="rotulo">${html}</div>`, { left: '96px', top: TOP + 'px', ...style });
      show(d, t);
      return d;
    };
    // Operación: una por pantalla. Línea 1 la cuenta; línea 2 «= resultado» (queda quieto).
    const op = (idOp, idRes, expr, res) => {
      assertEq(idOp, expr, EV(idOp).expr);
      assertEq(idRes, '= ' + res, EV(idRes).resultado);
      const d = el(`<div class="serif op-e">${expr}</div><div class="serif op-r">= ${res}</div>`, { left: '560px', top: TOP + 'px' });
      show(d, T(idOp));
      cut(d.querySelector('.op-r'), T(idRes));
      tl.set(d.querySelector('.op-r'), { autoAlpha: 0 }, 0);
      return d;
    };
    const holdUntil = id => T(id) + (EV(id).hold_s || 1.5);
    const hideAfterHold = (node, id, t) => { const h = Math.max(t, holdUntil(id)); hide(node, h); return h; };

    // Personas: siluetas planas, sin rostro (Don Ramiro: la única con sombrero).
    const personSVG = (h, hat, fill) => {
      fill = fill || '#5E5A52';
      return `<svg width="${h * 0.42}" height="${h}" viewBox="0 0 84 200">
        ${hat ? `<path d="M14 40h56v-6H58l-4-22H30l-4 22H14z" fill="${fill}"/>` : ''}
        <circle cx="42" cy="${hat ? 52 : 36}" r="22" fill="${fill}"/>
        <path d="M4 200V116c0-30 16-46 38-46s38 16 38 46v84z" fill="${fill}"/>
      </svg>`;
    };
    const token = s => `<div style="width:${s}px;height:${s}px;background:#1E5652;border:3px solid #05070A"></div>`;
    const person = (x, h, hat) => el(personSVG(h, hat), { left: x + 'px', top: (STAGE_FLOOR - h) + 'px' });

    // Taquería (fachada) y cuadrícula 10×10 = 100 acciones.
    const dashedTile = s => `<svg width="${s}" height="${s}" viewBox="0 0 300 300"><g fill="none" stroke="#05070A" stroke-width="5" stroke-dasharray="18 12">
      <rect x="3" y="3" width="294" height="294"/><path d="M3 72h294"/><rect x="40" y="130" width="220" height="110"/></g></svg>`;

    // ================= S02 · B1 Base =================
    bg('arcilla', 0);
    endScene(SC('S02').start);
    bg('agua', SC('S02').start);
    (function S02() {
      assertNums('e030', 'c2_venta');
      assertEq('e026', `1 de ${N('taqueria_acciones')}`, EV('e026').texto);
      if (V('taqueria_acciones') !== 100) fail('la cuadrícula es 10×10: se esperaban 100 acciones');
      const G = { x: 150, y: STAGE_FLOOR - 300, s: 300 };
      const facade = el(tileSVG(G.s), { left: G.x + 'px', top: G.y + 'px' });
      show(facade, T('e020'));
      const name = el(`
        <div class="serif" style="font-size:72px;line-height:80px">Taquería de doña Lupe</div>
        <div style="display:flex;gap:24px;align-items:baseline;margin-top:12px">
          <span class="serif" style="font-size:120px;line-height:120px">${N('taqueria_valor')}</span><span class="lbl">catpesos</span></div>`,
        { left: '520px', top: (STAGE_FLOOR - 250) + 'px' });
      show(name, T('e020'));

      // Cuadrícula: las líneas aparecen sobre la fachada (una sola vez, fila por fila).
      const grid = el(`<div class="grid10">${Array.from({ length: 100 }, (_, i) => `<div class="cell" data-i="${i}"></div>`).join('')}</div>`,
        { left: G.x + 'px', top: G.y + 'px', width: G.s + 'px', height: G.s + 'px' });
      const cells = [...grid.querySelectorAll('.cell')];
      tl.fromTo(grid, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' }, T('e022'));
      tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', stagger: { each: 0.006, grid: [10, 10], from: 'start' } }, T('e022'));

      // op01: 100,000 ÷ 100 = 1,000
      hide(name, T('e023') - 0.45);
      const op1 = op('e023', 'e024', `${N('taqueria_valor')} ÷ ${N('taqueria_acciones')}`, N('c1_precio_accion'));

      // 1 de 100: se resalta un cuadrito (contorno ámbar)
      const t26 = T('e026');
      hideAfterHold(op1, 'e024', t26 - 0.45);
      const hl = cells[44];
      tl.set(hl, { zIndex: 2, position: 'relative' }, t26);
      tl.fromTo(hl, { scale: 1, boxShadow: '0 0 0 0px #E8C46A' }, { scale: 1.8, boxShadow: '0 0 0 4px #E8C46A', duration: 0.5 }, t26);
      const oneOf = el(`<div class="serif" style="font-size:110px;line-height:110px">1 de ${N('taqueria_acciones')}</div>`,
        { left: '520px', top: (STAGE_FLOOR - 190) + 'px' });
      show(oneOf, t26);

      // Tarjeta 1: ACCIÓN
      card('e027', T('e027') + 5);
      hide(oneOf, T('e029') - 0.45);
      tl.to(hl, { scale: 1, boxShadow: '0 0 0 0px #E8C46A', duration: 0.4 }, T('e029') - 0.45);

      // Segunda taquería (plan: punteada) y lo que necesita
      const second = el(dashedTile(200), { left: '520px', top: (STAGE_FLOOR - 200) + 'px' });
      show(second, T('e029'));
      const need = el(`<div class="lbl">Necesita</div>
        <div style="display:flex;gap:20px;align-items:baseline"><span class="serif" style="font-size:110px;line-height:120px">${N('c2_venta')}</span><span class="lbl">catpesos</span></div>`,
        { left: '760px', top: (STAGE_FLOOR - 200) + 'px' });
      show(need, T('e030'));

      // Vende 20 cuadritos (los dos últimos renglones)
      const sold = cells.slice(100 - V('venta_acciones'));
      tl.to(sold, { backgroundColor: '#1E5652', duration: 0.5, stagger: 0.02 }, T('e031'));

      // op02: 20 × 1,000 = 20,000
      hide(need, T('e032') - 0.45);
      const op2 = op('e032', 'e033', `${N('venta_acciones')} × ${N('c1_precio_accion')}`, N('c2_venta'));
      // la segunda taquería abre (sólida)
      const second2 = el(tileSVG(200), { left: '520px', top: (STAGE_FLOOR - 200) + 'px' });
      tl.set(second2, { autoAlpha: 0 }, 0);
      tl.to(second, { autoAlpha: 0, duration: 0.5 }, T('e034'));
      tl.to(second2, { autoAlpha: 1, duration: 0.5 }, T('e034'));

      // op03: 100 − 20 = 80
      hideAfterHold(op2, 'e033', T('e035') - 0.45);
      const op3 = op('e035', 'e036', `${N('taqueria_acciones')} − ${N('venta_acciones')}`, N('c3_quedan'));

      // Vecinos: silueta en cada cuadrito vendido
      sold.forEach(c => { c.innerHTML = `<svg viewBox="0 0 30 30"><circle cx="15" cy="10" r="5" fill="#F3EFE6"/><path d="M6 28v-6c0-5 4-8 9-8s9 3 9 8v6z" fill="#F3EFE6"/></svg>`; });
      const people = sold.map(c => c.querySelector('svg'));
      tl.set(people, { autoAlpha: 0 }, 0);
      tl.to(people, { autoAlpha: 1, duration: 0.4, stagger: 0.02 }, T('e037'));

      // Tarjeta 2: ACCIONISTA (la operación se va antes)
      hideAfterHold(op3, 'e036', T('e038') - 0.45);
      card('e038', T('e038') + 5);
    })();

    // ================= S03 · Re-enganche 1 + B2 =================
    endScene(SC('S03').start);
    (function S03() {
      assertNums('e062', 'c1_precio_accion');
      assertNums('e063', 'c1_precio_accion');
      assertNums('e064', 'c1_precio_accion');
      if (EV('e071').de !== V('c1_precio_accion') || EV('e071').a !== V('c7_precio_despues') || EV('e071').delta !== N('c7b_delta_taqueria')) fail('e071: cifras no coinciden');

      // Don Ramiro con su acción
      const RX = 200, H = 215;
      const ramiro = person(RX, H, true);
      show(ramiro, T('e052'));
      const tk = el(token(48), { left: (RX + 84) + 'px', top: (STAGE_FLOOR - 120) + 'px' });
      show(tk, T('e052'));

      // Pregunta secundaria 1 (abierta)
      const q1 = el(`<div class="serif" style="font-size:96px;line-height:100px">${EV('e053').texto}</div>`, { left: '96px', top: TOP + 'px' });
      show(q1, T('e053'));
      const l1 = label(EV('e054').texto.replace('UNA', '<b>UNA</b>'), T('e054'), { top: (TOP + 130) + 'px' });

      // Multitud: cualquier persona se acerca
      const crowdX = [620, 740, 860, 980, 1100, 1220];
      const crowd = crowdX.map((x, i) => person(x, 190 + (i % 3) * 10, false));
      tl.fromTo(crowd, { autoAlpha: 0, x: 160 }, { autoAlpha: 1, x: 0, duration: 0.9, stagger: 0.08 }, T('e055'));

      // Tarjeta 3: EMPRESA PÚBLICA (con «No es del gobierno»)
      hide([q1, l1], T('e056') - 0.45);
      const cEnd = card('e056', TL.cues.find(c => c.id === 'c026').end);

      // BOLSA: etiqueta ≥ 5 s, sin tarjeta
      const tBolsa = Math.max(T('e058'), cEnd + 0.1);
      const bolsa = label(`<b>BOLSA</b> = el lugar donde se compran y venden acciones`, tBolsa);
      assertEq('e058', 'BOLSA = el lugar donde se compran y venden acciones', EV('e058').texto);
      // Don Ramiro entrega su acción a un comprador; los demás se van
      const t60 = T('e060');
      tl.to(crowd.slice(1), { autoAlpha: 0, duration: 0.5 }, t60);
      tl.to(crowd[0], { x: -140, duration: 0.8 }, t60);
      tl.to(tk, { x: 196, duration: 0.9 }, t60 + 0.4);
      const ok1 = el(`<div class="rotulo small">¿A quién? ✓</div>`, { left: '470px', top: (STAGE_FLOOR - 400) + 'px' });
      show(ok1, T('e061'));
      const tClear = TL.cues.find(c => c.id === 'c029').t;
      hide(bolsa, Math.max(tBolsa + EV('e058').min_s, tClear));
      hide([ramiro, tk, ok1, crowd[0]], tClear);

      // Precio: comprador y vendedor aceptan 1,000 → «Precio: 1,000 catpesos»
      const who = (quien, x) => el(`
        <div style="display:flex;gap:22px;align-items:flex-end">${personSVG(150)}
        <div><div class="lbl">${quien} acepta</div><div class="serif" style="font-size:110px;line-height:110px">${N('c1_precio_accion')}</div></div></div>`,
        { left: x + 'px', top: (STAGE_FLOOR - 170) + 'px' });
      assertEq('e062', `Comprador acepta ${N('c1_precio_accion')}`, EV('e062').texto);
      assertEq('e063', `Vendedor acepta ${N('c1_precio_accion')}`, EV('e063').texto);
      const buyer = who('Comprador', 120), seller = who('Vendedor', 760);
      show(buyer, T('e062'));
      show(seller, T('e063'));
      const t64 = T('e064');
      tl.to(buyer, { x: 200, autoAlpha: 0, duration: 0.5 }, t64 - 0.5);
      tl.to(seller, { x: -200, autoAlpha: 0, duration: 0.5 }, t64 - 0.5);
      const price = el(`
        <div class="lbl">Precio</div>
        <div style="display:flex;gap:28px;align-items:baseline;position:relative">
          <span class="serif" style="font-size:150px;line-height:150px;position:relative;display:inline-block;min-width:330px">
            <span id="p0">${N('c1_precio_accion')}</span><span id="p1" style="position:absolute;left:0;top:0">${N('c7_precio_despues')}</span></span>
          <span id="pd" class="serif pos" style="font-size:110px">${N('c7b_delta_taqueria')}</span></div>
        <div class="lbl">catpesos</div>`,
        { left: '540px', top: (STAGE_FLOOR - 280) + 'px' });
      assertEq('e064', `Precio: ${N('c1_precio_accion')} catpesos`, EV('e064').texto);
      tl.set(['#p1', '#pd'], { autoAlpha: 0 }, 0);
      cut(price, t64);
      const ok2 = el(`<div class="rotulo small">¿A qué precio? ✓</div>`, { left: '540px', top: (STAGE_FLOOR - 350) + 'px' });
      const t66 = Math.max(T('e066'), t64 + 0.6);
      show(ok2, t66);

      // Cambia UNA cosa: cuánta gente quiere comprar
      const t67 = Math.max(T('e067'), t66 + 0.6);
      hide(ok2, T('e068') - 0.45);
      const l2 = label(EV('e067').texto.replace('UNA', '<b>UNA</b>'), t67);
      const buyers = [96, 186, 276, 366].map(x => person(x, 220));
      const sell1 = person(1250, 220);
      tl.fromTo(buyers, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.08 }, T('e068'));
      tl.fromTo(sell1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, T('e068') + 0.4);

      // Pausa de predicción: la cifra con «?», respuesta oculta ≥ 3 s, MICHI mira la cifra
      const qm = el(`<div class="serif" style="font-size:180px;line-height:160px">?</div>`, { left: '930px', top: (STAGE_FLOOR - 330) + 'px' });
      show(qm, T('e069'));
      GAZE.push({ t0: T('e069'), t1: T('e070'), x: -0.9 });
      if (T('e070') - T('e069') < EV('e069').hold_s) fail('e069: la pausa de predicción dura menos de 3 s');

      // Sube
      hide([l2, qm], T('e070') - 0.45);
      const up = el(`<div class="serif" style="font-size:120px;line-height:120px">Sube ↑</div>`, { left: '96px', top: TOP + 'px' });
      show(up, T('e070'));
      const t71 = T('e071');
      tl.to('#p0', { autoAlpha: 0, duration: 0.25, ease: 'none' }, t71);
      tl.to(['#p1', '#pd'], { autoAlpha: 1, duration: 0.25, ease: 'none' }, t71);

      // Y al revés: baja (flecha, sin cifra nueva)
      const t73 = T('e073');
      hide([...buyers, sell1], t73 - 0.45);
      const down = el(`<div class="serif" style="font-size:120px;line-height:120px">Baja ↓</div>`, { left: '520px', top: TOP + 'px' });
      show(down, t73);
    })();
    endScene(SC('S04').start);

    zoom('e002', 990, 560, 1.3);

    // ---- Subtítulos: grupos y tiempos por palabra desde timeline (nominal o voz real) ----
    const subs = $('#subs');
    const endScreen = TL.eventos.find(e => e.do === 'cut_to_end_screen');
    for (const g of TL.subtitulos) {
      if (endScreen && g.start >= endScreen.t) continue;   // la pantalla final va sin subtítulo
      const box = document.createElement('div');
      box.className = 'sub';
      box.innerHTML = g.words.map(w => `<span>${w.raw}</span>`).join(' ');
      subs.appendChild(box);
      tl.set(box, { autoAlpha: 1 }, g.start);
      box.querySelectorAll('span').forEach((s, i) => tl.set(s, { visibility: 'visible' }, g.words[i].start));
      tl.set(box, { autoAlpha: 0 }, endScreen ? Math.min(g.end, endScreen.t) : g.end);
    }

    const dur = TL.duracion_s;
    tl.set({}, {}, dur);
    window.DUR = dur;
    window.FPS = FPS;
    window.ZOOMS = TL.eventos.filter(e => e.do === 'zoom_michi').map(e => [e.t, e.t + e.dur_s]);
    window.seek = t => { tl.time(t, false); drawMichi(t); };
    window.seek(0);
  }

  window.appReady = load().then(build);
})();
