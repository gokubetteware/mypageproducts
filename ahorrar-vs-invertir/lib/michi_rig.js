/* Extraído sin cambios de assets/michi/michi-panel.html (script 1: rig v1.0). */

/* MICHI — rig 2D paramétrico (v1.0)
   Geometría: extraída de los trazos vectoriales del PDF «Diseño gatito y dinero final» (p.11 dibujo maestro; p.16 orejas y colas; p.18 poses base v01).
   Unidades: 1 u = 1 pt del PDF p.11. Origen (0,0) = centro de la base de la campana (piso). X → derecha del espectador, Y → abajo (SVG).
   Ángulos: grados. Positivo = sentido horario en pantalla, salvo orejas (positivo = hacia afuera) y párpado (positivo = extremo exterior más bajo = tristeza).
   Porcentajes de párpado: fracción del diámetro del ojo cubierta (0 = abierto, 1 = cerrado). */
(function (root) {
  const C = { black: '#05070A', gold: '#E8C46A', paper: '#F3EFE6', white: '#FFFFFF', bg: '#0B0D11', wall: '#1A2029', surface: '#2B3442', cold: '#7FA7C4' };

  // ---- Geometría (PDF) ----
  const G = {
    earL: [[-36.47, -150.87], [-43.11, -198.95], [-1.66, -172.42]],
    earPivot: [-19.07, -161.65],            // punto medio de la base de la oreja; verificado contra p.16 («relajadas», error < 0.2 u)
    head: { x: -41.45, y: -175.74, w: 82.9, h: 76.27, r: 24.87 },
    eyeX: 18.24, eyeY: -135.95, eyeR: 11.605, eyeRSorpresa: 14.08,
    pupil: { rx: 2.985, ry: 7.46 },
    hl: { dx: -3.31, dy: -4.14, r: 2.32 },
    nose: 'M0 -114.4L6.22 -121.86L-6.22 -121.86Z', noseOp: 0.6,
    mouthL: 'M0 -114.4C-4.97 -109.42 -9.67 -108.87 -14.09 -112.74',
    mouthR: 'M0 -114.4C4.97 -109.42 9.67 -108.87 14.09 -112.74',
    mouthW: 2.98, lineOp: 0.502,
    whiskL: ['M-36.47 -125.17L-66.32 -131.8', 'M-36.47 -118.54L-64.66 -109.42'],
    whiskR: ['M36.47 -125.17L66.32 -131.8', 'M36.47 -118.54L64.66 -109.42'],
    whiskW: 2.49,
    body: 'M-38.13 0C-38.13 -56.37 -23.21 -89.53 0 -89.53C23.21 -89.53 38.13 -56.37 38.13 0Z',
    bodyTop: [0, -89.53], neck: [0, -94.5], tailRoot: [36.5, -14], tailW: 12.43,
    closedL: 'M-10.04 -0.45C-3.38 5.1 3.28 5.1 9.94 -0.45', closedW: 4.15, // p.18 DORMIDO, relativo al centro del ojo
    pawW: 13.27,
  };

  // Colas: p.16 (nueve trazos) reescaladas al dibujo maestro. front = se dibuja delante del cuerpo.
  const TAILS = {
    relajada:   { d: 'M38.13 -11.61C71.29 -9.95 79.58 -36.47 67.97 -56.37', src: 'p.11 / p.16' },
    envolvente: { d: 'M33.2 -5C41.4 13.3 -9.9 14.9 -33.2 -1.7', front: true, src: 'p.16' },
    caida:      { d: 'M38.1 -6.6C59.7 -1.7 76.3 1.6 89.5 3.3', src: 'p.16' },
    arriba:     { d: 'M34.8 -23.2C59.7 -31.5 64.7 -69.6 58 -97.8', src: 'p.16' },
    rigida:     { d: 'M34.8 -23.2L64.7 -94.5', src: 'p.16' },
    pregunta:   { d: 'M34.8 -23.2C63 -34.8 66.3 -73 54.7 -86.2C46.4 -96.2 58 -109.4 69.6 -101.1', src: 'p.16' },
    agitada:    { d: 'M34.8 -19.9C63 -14.9 48.1 -46.4 72.9 -56.4C86.2 -63 79.6 -79.6 89.5 -87.9', src: 'p.16' },
    erizada:    { d: 'M34.8 -23.2L50.9 -98.8', src: 'PROPUESTA: p.16 la engrosa ×1.6 (viola grosor constante). Aquí: trayectoria rígida casi vertical, mismo grosor. PENDIENTE' },
    escondida:  { d: null, src: 'p.16 (sin trazo visible)' },
  };

  // Patas: solo «señala» viene del PDF (p.18). El resto son propuestas del sistema (p.64: «solo en señala, celebra, sostiene, cubre»).
  const PAWS = {
    none: [],
    senala: [{ side: -1, d: 'M-33.18 -46.4C-56.4 -49.72 -66.36 -67.99 -61.35 -86.21', src: 'p.18' }],
    sostener: [{ side: -1, d: 'M-31 -42C-25 -31 -15 -28 -8 -33' }, { side: 1, d: 'M31 -42C25 -31 15 -28 8 -33' }],
    arriba: [{ side: -1, d: 'M-31 -52C-50 -60 -58 -80 -52 -98' }, { side: 1, d: 'M31 -52C50 -60 58 -80 52 -98' }],
    cubrir: [{ side: -1, d: 'M-30 -58C-40 -84 -34 -116 -20 -134' }, { side: 1, d: 'M30 -58C40 -84 34 -116 20 -134' }],
  };

  const POSES = {
    sentado: { eyeScale: 1, pupilH: 1, closed: 0, paws: 'none' },
    senala: { eyeScale: 1, pupilH: 1, closed: 0, paws: 'senala' },
    sorpresa: { eyeScale: G.eyeRSorpresa / G.eyeR, pupilH: 1.10, closed: 0, paws: 'none' }, // p.18: ojo 14.08 u, pupila 9.95 u
    dormido: { eyeScale: 1, pupilH: 1, closed: 1, paws: 'none' },
  };

  const NEUTRAL = {
    pose: 'sentado', eyeScale: 1, gazeX: 0, gazeY: 0, pupilW: 1, pupilH: 1,
    lidTopL: 0, lidTopR: 0, lidTiltL: 0, lidTiltR: 0, lidBotL: 0, lidBotR: 0, closed: 0,
    earL: 0, earR: 0, earLiftL: 0, earLiftR: 0, head: 0, headDy: 0,
    bodySx: 1, bodySy: 1, lean: 0, bodyDx: 0, tailWag: 0,
    tail: 'relajada', paws: 'none', tears: 'none',
  };
  // Límites de transformación (propuestos) que protegen la anatomía.
  const LIMITS = {
    gazeX: [-1, 1], gazeY: [-1, 1], pupilW: [0.28, 2], pupilH: [0.38, 1.6],
    lidTopL: [0, 1], lidTopR: [0, 1], lidTiltL: [-26, 26], lidTiltR: [-26, 26], lidBotL: [0, 0.6], lidBotR: [0, 0.6], closed: [0, 1],
    earL: [-8, 55], earR: [-8, 55], earLiftL: [0, 6], earLiftR: [0, 6], head: [-18, 18], headDy: [-4, 8],
    bodySx: [0.94, 1.08], bodySy: [0.86, 1.08], lean: [-7, 7], bodyDx: [-9, 9], eyeScale: [1, 1.2133], tailWag: [-8, 8],
  };
  const NUM = Object.keys(LIMITS);
  const DISCRETE = ['pose', 'tail', 'paws', 'tears'];

  function normalize(q) {
    const p = Object.assign({}, NEUTRAL, q || {});
    for (const k of NUM) { const [a, b] = LIMITS[k]; p[k] = Math.min(b, Math.max(a, +p[k] || 0)); }
    if (!TAILS[p.tail]) p.tail = 'relajada';
    if (!PAWS[p.paws]) p.paws = 'none';
    return p;
  }
  // Interpolación entre dos estados: numéricos lineales; discretos cambian en t=0.5 («cambio controlado», sin morphing).
  function lerp(a, b, t) {
    a = normalize(a); b = normalize(b); const o = {};
    for (const k of NUM) o[k] = a[k] + (b[k] - a[k]) * t;
    for (const k of DISCRETE) o[k] = t < 0.5 ? a[k] : b[k];
    return o;
  }

  const f = n => (Math.round(n * 100) / 100);
  let uid = 0;

  function drop(x, y, s) {
    return `M${f(x)} ${f(y - 3.2 * s)}C${f(x + 2.3 * s)} ${f(y - 0.3 * s)} ${f(x + 2.3 * s)} ${f(y + 2.4 * s)} ${f(x)} ${f(y + 2.4 * s)}C${f(x - 2.3 * s)} ${f(y + 2.4 * s)} ${f(x - 2.3 * s)} ${f(y - 0.3 * s)} ${f(x)} ${f(y - 3.2 * s)}Z`;
  }

  function eye(p, side, id, nm, hlColor) {
    const sg = side === 'L' ? -1 : 1, ex = sg * G.eyeX, ey = G.eyeY, r = G.eyeR * p.eyeScale;
    const rx = G.pupil.rx * p.pupilW * p.eyeScale, ry = G.pupil.ry * p.pupilH * p.eyeScale;
    const tx = Math.max(1.2, r - rx - 1.4), ty = Math.max(1, r - ry - 0.6);
    const px = ex + p.gazeX * tx, py = ey + p.gazeY * ty;
    const top = Math.max(p['lidTop' + side], p.closed), tilt = p['lidTilt' + side], bot = p['lidBot' + side];
    const yT = ey - r + top * 2 * r, yB = ey + r - bot * 2 * r, bulge = Math.min(bot, 0.5) * r * 0.55;
    const x0 = ex - r - 8, x1 = ex + r + 8, cid = `${id}-eye${side}`;
    const tears = p.tears, wet = tears === 'humedos' || tears === 'acumuladas' || tears === 'llanto';
    let s = `<g${nm('MICHI_EYE_' + side)}><clipPath id="${cid}"><circle cx="${f(ex)}" cy="${f(ey)}" r="${f(r)}"/></clipPath>`;
    const eyeClosed = p.closed >= 0.97 || top >= 0.97;
    if (!eyeClosed) {
      s += `<g clip-path="url(#${cid})">`;
      s += `<circle${nm('MICHI_IRIS_' + side)} cx="${f(ex)}" cy="${f(ey)}" r="${f(r)}" fill="${C.gold}"/>`;
      s += `<ellipse${nm('MICHI_PUPIL_' + side)} cx="${f(px)}" cy="${f(py)}" rx="${f(rx)}" ry="${f(ry)}" fill="${C.black}"/>`;
      const hr = G.hl.r * p.eyeScale * (wet ? 1.45 : 1);
      s += `<circle${nm('MICHI_HIGHLIGHT_' + side)} cx="${f(ex + G.hl.dx * p.eyeScale)}" cy="${f(ey + G.hl.dy * p.eyeScale)}" r="${f(hr)}" fill="${hlColor}"/>`;
      s += `<path${nm('MICHI_LID_BOTTOM_' + side)} d="M${f(x0)} ${f(yB + bulge)}Q${f(ex)} ${f(yB - bulge)} ${f(x1)} ${f(yB + bulge)}L${f(x1)} ${f(ey + r + 20)}L${f(x0)} ${f(ey + r + 20)}Z" fill="${C.black}"/>`;
      if (wet) s += `<path d="M${f(x0)} ${f(yB + bulge - 1.1)}Q${f(ex)} ${f(yB - bulge - 1.1)} ${f(x1)} ${f(yB + bulge - 1.1)}" fill="none" stroke="${C.paper}" stroke-width="1.3" stroke-opacity="0.9"/>`;
      if (tears === 'acumuladas' || tears === 'llanto') s += `<path d="M${f(x0)} ${f(yB + bulge)}Q${f(ex)} ${f(yB - bulge)} ${f(x1)} ${f(yB + bulge)}L${f(x1)} ${f(yB + bulge - 3.6)}Q${f(ex)} ${f(yB - bulge - 3.6)} ${f(x0)} ${f(yB + bulge - 3.6)}Z" fill="${C.paper}" fill-opacity="0.92"/>`;
      s += `<rect${nm('MICHI_LID_TOP_' + side)} x="${f(x0)}" y="${f(ey - r - 40)}" width="${f(x1 - x0)}" height="${f(yT - (ey - r - 40))}" fill="${C.black}" transform="rotate(${f(sg * tilt)} ${f(ex)} ${f(yT)})"/>`;
      s += `</g>`;
    } else {
      s += `<path d="${G.closedL}" transform="translate(${f(ex)} ${f(ey)})${sg > 0 ? ' scale(-1 1)' : ''}" fill="none" stroke="${C.gold}" stroke-opacity="${G.lineOp}" stroke-width="${G.closedW}" stroke-linecap="round"/>`;
    }
    return s + `</g>`;
  }

  function tearsLayer(p, side, nm) {
    const sg = side === 'L' ? -1 : 1, ex = sg * G.eyeX, r = G.eyeR * p.eyeScale, yb = G.eyeY + r;
    const t = p.tears, P = C.paper; let s = '';
    const D = (x, y, k) => `<path d="${drop(x, y, k)}" fill="${P}"/>`;
    if (t === 'una' && side === 'L') s += D(ex + sg * r * 0.4, yb + 5, 0.9);
    if (t === 'dos') s += D(ex + sg * r * 0.4, yb + 5, 0.9);
    if (t === 'pocas') { if (side === 'L') { s += D(ex + sg * r * 0.42, yb + 2.5, 0.7) + D(ex + sg * r * 0.5, yb + 13, 0.95); } else s += D(ex + sg * r * 0.4, yb + 5, 0.85); }
    if (t === 'llanto') s += `<path d="M${f(ex + sg * r * 0.35)} ${f(yb - 2)}C${f(ex + sg * r * 0.4)} ${f(yb + 8)} ${f(ex + sg * r * 0.3)} ${f(yb + 16)} ${f(ex + sg * r * 0.36)} ${f(yb + 22)}" fill="none" stroke="${P}" stroke-width="2.6" stroke-linecap="round"/>` + D(ex + sg * r * 0.36, yb + 27, 1.05);
    return `<g${nm('MICHI_TEARS_' + side)}>${s}</g>`;
  }

  /* render(params, opts) → string SVG.
     opts: id (prefijo único de máscaras), layerIds (ids reales de capa, solo para una instancia), silhouette (contorno puro),
           highlight (#FFFFFF canónico p.11 | #F3EFE6), viewBox, width, height, jitter [dx,dy], bare (sin <svg>), title */
  function render(q, o) {
    o = o || {}; const p = normalize(q); const id = o.id || ('mi' + (++uid));
    const nm = n => o.layerIds ? ` id="${n}"` : ` data-layer="${n}"`;
    const B = C.black, hlc = o.highlight || C.white, sil = !!o.silhouette;
    const a = p.lean * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const M = (x, y) => [p.bodyDx + ca * x * p.bodySx - sa * y * p.bodySy, sa * x * p.bodySx + ca * y * p.bodySy];
    const sh = pt => { const m = M(pt[0], pt[1]); return [m[0] - pt[0], m[1] - pt[1]]; };
    const hs = sh(G.bodyTop), ts = sh(G.tailRoot);
    const tail = TAILS[p.tail];
    const tailEl = tail.d ? `<g${nm('MICHI_TAIL')} transform="translate(${f(ts[0])} ${f(ts[1])}) rotate(${f(p.lean + p.tailWag)} ${G.tailRoot[0]} ${G.tailRoot[1]})"><path d="${tail.d}" fill="none" stroke="${B}" stroke-width="${G.tailW}" stroke-linecap="round" stroke-linejoin="round"/></g>` : `<g${nm('MICHI_TAIL')}></g>`;
    const pawEls = PAWS[p.paws].map(pw => { const anc = [pw.side * 32, -48], t = sh(anc); return `<g transform="translate(${f(t[0])} ${f(t[1])}) rotate(${f(p.lean)} ${anc[0]} ${anc[1]})"><path d="${pw.d}" fill="none" stroke="${B}" stroke-width="${G.pawW}" stroke-linecap="round" stroke-linejoin="round"/></g>`; }).join('');
    const earT = s => { const sg = s === 'L' ? -1 : 1; return `translate(0 ${f(-p['earLift' + s])}) rotate(${f(sg * p['ear' + s])} ${f(sg * -G.earPivot[0])} ${G.earPivot[1]})`; };
    const earPath = s => { const sg = s === 'L' ? 1 : -1; return 'M' + G.earL.map(([x, y]) => `${f(x * sg)} ${y}`).join('L') + 'Z'; };
    const H = G.head;
    let face = '';
    if (!sil) {
      const wl = (arr) => arr.map(d => `<path d="${d}" fill="none" stroke="${C.gold}" stroke-opacity="${G.lineOp}" stroke-width="${G.whiskW}" stroke-linecap="round"/>`).join('');
      face += `<g${nm('MICHI_WHISKERS_L')}>${wl(G.whiskL)}</g><g${nm('MICHI_WHISKERS_R')}>${wl(G.whiskR)}</g>`;
      face += eye(p, 'L', id, nm, hlc) + eye(p, 'R', id, nm, hlc);
      face += `<path${nm('MICHI_NOSE')} d="${G.nose}" fill="${C.gold}" fill-opacity="${G.noseOp}"/>`;
      face += `<g${nm('MICHI_MOUTH')}><path d="${G.mouthL}" fill="none" stroke="${C.gold}" stroke-opacity="${G.lineOp}" stroke-width="${G.mouthW}" stroke-linecap="round"/><path d="${G.mouthR}" fill="none" stroke="${C.gold}" stroke-opacity="${G.lineOp}" stroke-width="${G.mouthW}" stroke-linecap="round"/></g>`;
      face += tearsLayer(p, 'L', nm) + tearsLayer(p, 'R', nm);
    }
    const head = `<g${nm('MICHI_HEAD')} transform="translate(${f(hs[0])} ${f(hs[1])}) rotate(${f(p.lean + p.head)} ${G.neck[0]} ${G.neck[1]}) translate(0 ${f(p.headDy)})">`
      + `<g${nm('MICHI_EAR_L')} transform="${earT('L')}"><path d="${earPath('L')}" fill="${B}"/></g>`
      + `<g${nm('MICHI_EAR_R')} transform="${earT('R')}"><path d="${earPath('R')}" fill="${B}"/></g>`
      + `<rect${nm('MICHI_HEAD_SHAPE')} x="${H.x}" y="${H.y}" width="${H.w}" height="${H.h}" rx="${H.r}" fill="${B}"/>`
      + face + `</g>`;
    const body = `<g${nm('MICHI_BODY')} transform="translate(${f(p.bodyDx)} 0) rotate(${f(p.lean)}) scale(${f(p.bodySx)} ${f(p.bodySy)})"><path d="${G.body}" fill="${B}"/></g>`;
    const j = o.jitter || [0, 0];
    const inner = `<g${nm('MICHI_ROOT')} transform="translate(${f(j[0])} ${f(j[1])})">`
      + (tail.front ? '' : tailEl) + `<g${nm('MICHI_PAWS_BACK')}></g>` + body + (tail.front ? tailEl : '') + head
      + `<g${nm('MICHI_PAWS_FRONT')}>${pawEls}</g></g>`;
    if (o.bare) return inner;
    const vb = o.viewBox || VIEWBOX;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${o.width ? ` width="${o.width}"` : ''}${o.height ? ` height="${o.height}"` : ''} style="display:block;overflow:visible">${o.title ? `<title>${o.title}</title>` : ''}${inner}</svg>`;
  }
  const VIEWBOX = '-116 -228 232 266';

  // ---- Objetos del universo (fuera de la geometría del personaje). Coordenadas de escena. ----
  const OBJ = {
    head(x, y, s, eyeFill, pupil, whisk) { // retrato plano de MICHI
      const e = [[-18.24, -135.95], [18.24, -135.95]];
      let g = `<g transform="translate(${x} ${y}) scale(${s}) translate(0 137)">`;
      g += `<path d="M-36.47 -150.87L-43.11 -198.95L-1.66 -172.42Z" fill="${C.black}"/><path d="M36.47 -150.87L43.11 -198.95L1.66 -172.42Z" fill="${C.black}"/>`;
      g += `<rect x="-41.45" y="-175.74" width="82.9" height="76.27" rx="24.87" fill="${C.black}"/>`;
      if (whisk) g += ['M-36 -125L-72 -133', 'M-36 -118L-70 -108', 'M36 -125L72 -133', 'M36 -118L70 -108'].map(d => `<path d="${d}" stroke="${whisk}" stroke-width="3.2" stroke-linecap="round"/>`).join('');
      g += e.map(([ex, ey]) => `<circle cx="${ex}" cy="${ey}" r="12.5" fill="${eyeFill}"/>` + (pupil ? `<circle cx="${ex}" cy="${ey}" r="5" fill="${C.black}"/>` : '')).join('');
      return g + `</g>`;
    },
    coin(x, y, r) {
      return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${C.gold}" stroke="#141820" stroke-width="${f(r * 0.06)}"/><circle cx="${x}" cy="${y}" r="${f(r * 0.84)}" fill="none" stroke="#141820" stroke-opacity="0.55" stroke-width="${f(r * 0.022)}" stroke-dasharray="${f(r * 0.06)} ${f(r * 0.05)}"/>`
        + `<text x="${x}" y="${f(y - r * 0.42)}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="${f(r * 0.34)}" fill="#141820">1</text>`
        + OBJ.head(x, y + r * 0.06, r * 0.0052, C.gold, false)
        + (r > 18 ? `<text x="${x}" y="${f(y + r * 0.66)}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" letter-spacing="${f(r * 0.03)}" font-size="${f(r * 0.15)}" fill="#141820">CATCOIN</text>` : '') + `</g>`;
    },
    coinSide(x, y, w) { // moneda de canto, para pilas
      const h = w * 0.16;
      return `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" rx="${f(h * 0.45)}" fill="${C.gold}" stroke="#141820" stroke-opacity="0.6" stroke-width="${f(w * 0.018)}"/>`;
    },
    stack(x, y, w, n) { let s = '<g>'; const h = w * 0.16; for (let i = 0; i < n; i++) s += OBJ.coinSide(x + ((i * 37) % 5 - 2) * w * 0.012, y - i * h * 0.92, w); return s + '</g>'; },
    bill(x, y, w, v) {
      const h = w * 0.47, x0 = x - w / 2, y0 = y - h / 2, k = w / 100;
      return `<g><rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" rx="${f(3 * k)}" fill="${C.paper}" stroke="#141820" stroke-width="${f(1.8 * k)}"/>`
        + `<rect x="${f(x0 + 4.5 * k)}" y="${f(y0 + 4.5 * k)}" width="${f(w - 9 * k)}" height="${f(h - 9 * k)}" rx="${f(2 * k)}" fill="none" stroke="#8C8A84" stroke-width="${f(0.7 * k)}"/>`
        + `<text x="${f(x0 + 10 * k)}" y="${f(y0 + 13 * k)}" font-family="Archivo, sans-serif" font-weight="700" font-size="${f(4.6 * k)}" fill="${C.gold}">$$$</text>`
        + `<text x="${f(x0 + w - 10 * k)}" y="${f(y0 + h - 8 * k)}" text-anchor="end" font-family="Archivo, sans-serif" font-weight="700" font-size="${f(4.6 * k)}" fill="${C.gold}">$$$</text>`
        + `<text x="${f(x0 + 11 * k)}" y="${f(y0 + 30 * k)}" font-family="Anton, Impact, sans-serif" font-size="${f(18 * k)}" fill="#141820">${v || 100}</text>`
        + `<text x="${f(x0 + 12 * k)}" y="${f(y0 + 38.5 * k)}" font-family="Archivo, sans-serif" font-weight="700" letter-spacing="${f(0.9 * k)}" font-size="${f(3.6 * k)}" fill="#3A3F48">CATDÓLARES</text>`
        + `<circle cx="${f(x0 + 69 * k)}" cy="${f(y0 + h / 2)}" r="${f(15 * k)}" fill="none" stroke="#8C8A84" stroke-width="${f(0.9 * k)}"/>`
        + OBJ.head(x0 + 69 * k, y0 + h / 2 + 1.5 * k, 0.1 * k, C.paper, true, '#3A3F48') + `</g>`;
    },
    box(x, y, w, h, label) {
      return `<g><rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${C.surface}"/><rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h * 0.08)}" fill="#3A4556"/>`
        + (label ? `<text x="${x}" y="${f(y - h * 0.45)}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" letter-spacing="${f(w * 0.02)}" font-size="${f(w * 0.12)}" fill="${C.paper}" fill-opacity="0.7">${label}</text>` : '') + `</g>`;
    },
    jar(x, y, w, fill) {
      const h = w * 1.25; let s = `<g><rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" rx="${f(w * 0.14)}" fill="${C.cold}" fill-opacity="0.12" stroke="${C.cold}" stroke-width="${f(w * 0.03)}"/><rect x="${f(x - w * 0.36)}" y="${f(y - h - w * 0.1)}" width="${f(w * 0.72)}" height="${f(w * 0.12)}" rx="2" fill="${C.surface}"/>`;
      const n = Math.round(fill * 7); for (let i = 0; i < n; i++) s += OBJ.coinSide(x + (i % 2 ? 0.08 : -0.08) * w, y - w * 0.06 - i * w * 0.14, w * 0.7);
      return s + '</g>';
    },
    phone(x, y, w) { const h = w * 1.9; return `<g><rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" rx="${f(w * 0.14)}" fill="#11151B" stroke="${C.surface}" stroke-width="${f(w * 0.04)}"/><rect x="${f(x - w * 0.4)}" y="${f(y - h + w * 0.14)}" width="${f(w * 0.8)}" height="${f(h - w * 0.28)}" rx="${f(w * 0.06)}" fill="${C.cold}"/><text x="${x}" y="${f(y - h * 0.46)}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="${f(w * 0.34)}" fill="#11151B">−12</text></g>`; },
    calendar(x, y, w) { const h = w * 0.95; let s = `<g><rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" rx="${f(w * 0.04)}" fill="${C.paper}"/><rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h * 0.18)}" fill="${C.surface}"/>`;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const lit = r === 2 && c === 3; s += `<rect x="${f(x - w * 0.42 + c * w * 0.17)}" y="${f(y - h * 0.74 + r * h * 0.17)}" width="${f(w * 0.13)}" height="${f(h * 0.12)}" fill="${lit ? C.gold : '#D8D3C8'}"/>`; }
      return s + '</g>'; },
    ticket(x, y, w, len) { let s = `<g><path d="M${f(x - w / 2)} ${f(y - len)}L${f(x + w / 2)} ${f(y - len)}L${f(x + w / 2)} ${f(y)}`; const z = 6; for (let i = z; i >= 0; i--) s += `L${f(x - w / 2 + i * w / z)} ${f(y + (i % 2 ? 3 : 0))}`; s += `Z" fill="${C.paper}"/>`;
      for (let i = 1; i * 9 < len - 6; i++) s += `<rect x="${f(x - w * 0.35)}" y="${f(y - len + i * 9)}" width="${f(w * (i % 3 ? 0.7 : 0.45))}" height="1.6" fill="#A9A49A"/>`; return s + '</g>'; },
    bag(x, y, w, full) { const h = w * (full ? 1.05 : 0.7); return `<g><path d="M${f(x - w / 2)} ${f(y)}L${f(x - w * 0.44)} ${f(y - h)}L${f(x + w * 0.44)} ${f(y - h)}L${f(x + w / 2)} ${f(y)}Z" fill="#D9CBB0"/><path d="M${f(x - w * 0.44)} ${f(y - h)}L${f(x + w * 0.44)} ${f(y - h)}L${f(x + w * 0.4)} ${f(y - h - w * 0.08)}L${f(x - w * 0.4)} ${f(y - h - w * 0.08)}Z" fill="#C4B596"/></g>`; },
    glass(x, y, w, h) { return `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${C.cold}" fill-opacity="0.08" stroke="${C.cold}" stroke-opacity="0.7" stroke-width="1.5"/>`; },
    words(x, y, s, txt) { return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="${s}" fill="${C.paper}" fill-opacity="0.9">${txt}</text>`; },
  };

  /* Escena: fondo en tres planos + una luz (en el muro, nunca en el gato) + una sombra dura. */
  function scene(opts) {
    const W = opts.w || 320, H = opts.h || 200, floor = opts.floor || H * 0.8, id = opts.id || ('sc' + (++uid));
    const light = opts.light == null ? W * 0.5 : opts.light;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="display:block;width:100%;height:auto"><rect width="${W}" height="${H}" fill="${C.bg}"/>`;
    s += `<rect y="0" width="${W}" height="${floor}" fill="${C.wall}"/>`;
    if (opts.cold) s += `<rect x="${opts.cold[0]}" y="${opts.cold[1]}" width="${opts.cold[2]}" height="${opts.cold[3]}" fill="${C.cold}" fill-opacity="0.10"/>`;
    else s += `<ellipse cx="${light}" cy="${floor * 0.55}" rx="${W * 0.2}" ry="${floor * 0.46}" fill="${C.gold}" fill-opacity="0.13"/>`;
    s += `<rect y="${floor}" width="${W}" height="${H - floor}" fill="#141920"/>`;
    s += (opts.back || '');
    (opts.michis || []).forEach((m, i) => {
      const k = m.h / 199, sx = m.x, sy = floor;
      s += `<ellipse cx="${f(sx + (sx < light ? -1 : 1) * m.h * 0.28)}" cy="${f(sy + 1)}" rx="${f(m.h * 0.34)}" ry="${f(m.h * 0.035)}" fill="#000" fill-opacity="0.55"/>`;
      s += `<g transform="translate(${f(sx)} ${f(sy)}) scale(${f(k * (m.flip ? -1 : 1))} ${f(k)})">${render(m.p, { bare: true, id: id + 'm' + i })}</g>`;
    });
    s += (opts.front || '');
    return s + '</svg>';
  }

  const api = { C, G, TAILS, PAWS, POSES, NEUTRAL, LIMITS, NUM, DISCRETE, VIEWBOX, normalize, lerp, render, scene, OBJ };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MichiRig = api;
})(typeof window !== 'undefined' ? window : globalThis);

