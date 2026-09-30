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
    const el = (html, style, cls) => {
      const d = document.createElement('div');
      d.className = 'abs ' + (cls || '');
      Object.assign(d.style, style || {});
      d.innerHTML = html;
      layer.appendChild(d);
      return d;
    };
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
    const pose = name => {
      const [key, lv] = MSTATE[name] || fail('estado de MICHI sin mapeo: ' + name);
      const st = EMO.states.find(s => s.key === key) || fail('estado no existe en el rig: ' + key);
      return st.levels[lv];
    };
    const michiEvents = TL.eventos.filter(e => e.do === 'michi').map(e => ({ t: e.t, p: pose(e.estado) }));
    const BLEND = 0.4;
    const MICHI = { x: 1580, h: 400 };
    const easeIO = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const michiAt = t => {
      let prev = pose('tranquilo'), cur = prev, t0 = -1;
      for (const m of michiEvents) { if (m.t > t) break; prev = cur; cur = m.p; t0 = m.t; }
      const k = t0 < 0 ? 1 : Math.min(1, (t - t0) / BLEND);
      return k >= 1 ? cur : R.lerp(prev, cur, easeIO(k));
    };
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

    // ---- Pie de ejemplo ----
    const pie = $('#pie');
    pie.textContent = 'Ejemplo hipotético · 1 CATPESO = 1 peso mexicano';

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
      show(pie, T('e001'));

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
      tl.to(pie, { autoAlpha: 0, duration: 0.4 }, T('e010') - 0.45);
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

    zoom('e002', 990, 560, 1.3);

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
