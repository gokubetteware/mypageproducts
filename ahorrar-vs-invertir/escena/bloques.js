/* «¿Primero ahorras o primero inviertes? Hagamos la cuenta» — los 30 bloques del guion.
   Textos, cifras y tarjetas copiados del guion (fuente de verdad). Tiempos: timing.json (ESTIMADO).
   Cada ancla E.T(bloque, «palabras») es el momento en que la voz empieza a decir esas palabras. */
window.BLOQUES = function (E) {
  const { T, B } = E, O = OBJ, C = O.P;
  const fin = n => B(n).t_out;
  const MENOS = '−';
  const CX = 800;           // la cuenta: centro arriba, a la derecha de la tarjeta de definición
  const G1 = 260, G2 = 700; // gatito 1 y gatito 2 (origen = centro de la base)
  const FIN = E.timing.duracion;

  const txt = (html, cls, x, y, tin, tout, o = {}) => E.el(html, { x, y, cls, qa: 'texto', ...o }, tin, tout);
  // Operación por corte; cada parte entra cuando la voz la dice.
  function op(partes, x, y, tout, cls = 'operacion tnum') {
    const t0 = partes[0][1];
    const d = E.el('', { x, y, cls, qa: 'texto' }, t0, tout);
    for (const [h, t, c] of partes) {
      const s = document.createElement('span');
      s.innerHTML = h; if (c) s.className = c;
      d.appendChild(s);
      if (t > t0) { s.style.visibility = 'hidden'; E.elementos.push({ d: s, tin: t, tout }); }
    }
    return d;
  }
  const pie = (texto, tin, tout) => txt(texto, 'pie', 96, 996, tin, tout, { nombre: 'pie' });
  const EQUIV = '1 CATPESO = 1 peso mexicano';
  function tarjeta(n, termino, signif, t, tout) {
    const d = txt(`<div class="etq">PALABRA ${n} DE 3</div><div class="termino">${termino}<div class="marca"></div></div><div class="signif">${signif}</div>`,
      'tarjeta-def', 96, 150, t, tout, { nombre: 'tarjeta ' + n });
    E.marca(d, t);
    return d;
  }
  // Lista «en orden» con sus 3 casillas. llenas[i]: tiempo en que se llena (null = ya llena, undefined = vacía).
  function lista(tin, tout, llenas) {
    const etiquetas = ['La deuda cara', 'El colchón', 'Lo que crece'];
    const filas = etiquetas.map((l, i) =>
      `<div class="fila" style="justify-content:flex-start;align-items:center;gap:20px;height:84px">` +
      `<span class="casilla"><span class="chk" style="position:absolute;inset:4px;visibility:hidden">${O.palomita()}</span></span>` +
      `<span class="dato">${i + 1}. <span class="lbl" style="visibility:hidden">${l}</span></span></div>`).join('');
    const d = E.el(filas, { x: 96, y: 170, w: 560, cls: 'panel', qa: 'texto', nombre: 'lista en orden' }, tin, tout);
    [...d.querySelectorAll('.fila')].forEach((f, i) => {
      if (llenas[i] === undefined) return;
      const t = llenas[i] === null ? tin : llenas[i];
      for (const s of f.querySelectorAll('.chk, .lbl')) E.elementos.push({ d: s, tin: t, tout });
    });
    return d;
  }
  const filaTabla = (a, b, y, tin, tout, cls = '') =>
    E.el(`<span>${a}</span><span class="tnum ${cls}">${b}</span>`, { x: 640, y, w: 700, cls: 'panel fila dato', qa: 'texto', style: 'display:flex;height:72px;align-items:center;margin:0' }, tin, tout);
  const img = src => `<img src="${src}" style="width:100%;height:100%;display:block">`;
  const icono = (svg, w = 70, h = 115) => `<span style="display:inline-block;width:${w}px;height:${h}px;vertical-align:bottom">${svg}</span>`;

  // ---------- fondos y cabecera ----------
  E.fondo(0, 'arcilla'); E.fondo(B(12).t_in, 'agua'); E.fondo(B(18).t_in, 'arcilla');
  E.fondo(B(28).t_in, 'petroleo'); E.fondo(B(29).t_in, 'arcilla');
  const cab = '<div>CCM</div><div class="tema">Ahorrar vs invertir</div>';
  txt(cab, 'cabecera', 96, 56, B(4).t_in, B(28).t_in, { nombre: 'cabecera' });
  txt(cab, 'cabecera sobre-petroleo', 96, 56, B(28).t_in, B(29).t_in, { nombre: 'cabecera' });
  txt(cab, 'cabecera', 96, 56, B(29).t_in, FIN, { nombre: 'cabecera' });

  // ---------- 1 · GANCHO (arcilla, sin cabecera) ----------
  txt('50,000', 'cifra tnum', 96, 170, 0, fin(1));
  txt('CATPESOS', 'etiqueta', 104, 400, 0, fin(1));
  for (let i = 0; i < 5; i++) E.el(img('/assets/catpesos/b1000.png'), { x: 230 + i * 12, y: 820 - 140 - i * 22, w: 280, h: 140, qa: 'objeto', nombre: 'pila de catpesos' }, 0, fin(1));
  txt('¿Primero ahorro o<br>primero invierto?', 'titulo', 760, 170, 5.0, fin(2));
  pie(EQUIV, 0, fin(1));
  E.michiEn(0, 'curiosidad', 2);

  // ---------- 2 · Guárdalo / Inviértelo ----------
  E.objMichi(O.objeto('canela'), 200, 3, T(2, 'Uno te dice'), fin(3), 'frasco cerrado');
  txt('Guárdalo', 'dato', 236, 520, T(2, 'Uno te dice'), fin(3));
  E.objMichi(O.maceta(false), 520, 3, T(2, 'Otro te dice'), fin(3), 'maceta');
  txt('Inviértelo', 'dato', 556, 512, T(2, 'Otro te dice'), fin(3));
  E.michiEn(T(2, 'Uno te dice'), 'duda', 2, { gaze: [-1, 0.2] });
  E.michiEn(T(2, 'Otro te dice'), 'duda', 2, { gaze: [-0.45, 0.2] });

  // ---------- 3 · ¿En qué orden? ----------
  E.objMichi(O.objeto('tigrillo'), 840, 3, B(3).t_in + 0.5, fin(3), 'tarjeta');
  txt('¿En qué orden?', 'titulo', 96, 170, T(3, 'el orden'), fin(3));
  txt([1, 2, 3].map(n => `<span class="operacion" style="font-size:80px;line-height:96px">${n}</span> <span class="casilla" style="width:80px;height:80px;margin:0 28px 0 8px"></span>`).join(''),
    '', 96, 296, T(3, 'el orden'), fin(3), { nombre: 'casillas 1 2 3' });
  txt(`+ ${MENOS} × ÷`, 'operacion', 800, 290, T(3, 'tres cuentas'), fin(3));
  E.michiEn(T(3, 'Al final'), 'confianza', 2);

  // ---------- 4 · PLANTEAR LA CUENTA ----------
  filaTabla('Tienes', '50,000', 170, T(4, 'Tienes'), fin(4));
  filaTabla('Gastas al mes', '10,000', 241, T(4, 'Gastas'), fin(4));
  filaTabla('Debes en la tarjeta', MENOS + '10,000', 312, T(4, 'traes una deuda'), fin(4), 'rojo');
  E.objPiso(O.bolsaDespensa(), 150, 200, 240, T(4, 'despensa'), fin(4), 'bolsa de despensa');
  E.objPiso(O.ticketLuz(), 380, 120, 180, T(4, 'luz'), fin(4), 'ticket de luz');
  pie(EQUIV, B(4).t_in, fin(4));
  E.michiEn(B(4).t_in, 'tranquilidad', 2);

  // ---------- 5–10 · IDEA 1: la deuda (arcilla, Tigrillo) ----------
  E.gatito({ g: 'tigrillo', x: G1, tin: B(5).t_in, tout: fin(10),
    expr: [[B(5).t_in, 'neutro'], [T(6, 'seis mil'), 'preocupacion'], [T(10, 'Por eso'), 'alivio']],
    obj: [[B(5).t_in, O.objeto('tigrillo')], [T(10, 'Por eso'), O.tarjetaPartida()]] });
  E.michiEn(B(5).t_in, 'preocupacion', 1);
  op([['60 % = 60 por cada 100', T(5, 'Sesenta por ciento quiere')]], CX, 170, T(6, 'Diez mil son'));
  pie('Tasa de ejemplo', T(5, 'Digamos'), fin(5));

  // 6
  op([['10,000 = 100 × 100', T(6, 'Diez mil son')]], CX, 170, fin(7));
  op([['100 × 60 = ', T(6, 'Cien veces sesenta')], ['6,000', T(6, 'seis mil')]], CX, 290, fin(7));
  E.objPiso(O.recibo(MENOS + '6,000', C.rojo), 500, 150, 190, T(6, 'seis mil'), fin(7), 'recibo −6,000');
  E.michiEn(T(6, 'seis mil') - 0.5, 'sorpresa', 2);
  pie(EQUIV, B(6).t_in, fin(9));

  // 7 · PALABRA 1 DE 3
  tarjeta(1, 'Tasa', 'Lo que te cobran o te pagan por cada 100, en un año.', T(7, 'tasa'), fin(7));
  E.michiEn(T(7, 'tasa'), 'me-di-cuenta', 2);

  // 8
  E.gatito({ g: 'bosco', x: G2, tin: T(8, 'metes esos'), tout: fin(9),
    expr: [[0, 'alegria'], [T(9, 'menos cinco'), 'sorpresa']], obj: [[0, O.maceta(false)]] });
  E.michiEn(B(8).t_in, 'curiosidad', 2);
  op([['8 % = 8 por cada 100', T(8, 'Ocho pesos')]], CX, 170, T(9, 'Ochocientos menos'));
  op([['100 × 8 = ', T(8, 'Cien veces ocho')], ['800', T(8, 'ochocientos pesos')]], CX, 290, T(9, 'Ochocientos menos'));
  E.objPiso(O.recibo('+800', C.verde), 950, 150, 190, T(8, 'ochocientos pesos'), fin(9), 'recibo +800');

  // 9
  op([[`800 ${MENOS} 6,000 = `, T(9, 'Ochocientos menos')], [MENOS + '5,200', T(9, 'menos cinco'), 'rojo']], CX, 170, T(10, 'Por eso'));
  E.michiEn(T(9, 'menos cinco') - 0.5, 'sorpresa', 3);

  // 10
  E.objPiso(O.cubeta(), 560, 252, 306, T(10, 'cubeta'), fin(10), 'cubeta');
  lista(T(10, 'Por eso'), fin(10), [T(10, 'va primero')]);
  E.michiEn(T(10, 'Por eso'), 'alivio', 2);
  pie('Ejemplo hipotético', B(10).t_in, fin(10));

  // ---------- 11 · RE-ENGANCHE 1 (arcilla, sin gatito) ----------
  op([[`50,000 ${MENOS} 10,000 = `, B(11).t_in], ['40,000', T(11, 'cuarenta')]], 96, 170, fin(11));
  txt('¿Ahora sí, a invertir?', 'titulo', 96, 330, T(11, 'Ahora sí'), fin(11));
  pie(EQUIV, B(11).t_in, fin(11));
  E.michiEn(T(11, 'Ahora sí'), 'duda', 2, { gaze: [0, 0] });

  // ---------- 12–17 · IDEA 2: el colchón (agua, Canela) ----------
  E.gatito({ g: 'canela', x: G1, tin: B(12).t_in, tout: fin(17),
    expr: [[0, 'preocupacion'], [T(15, 'tres meses'), 'alegria']],
    obj: [[0, O.frasco(0)], [T(15, 'tres meses'), O.frasco(1 / 3)], [T(15, 'Tú gastas'), O.frasco(2 / 3)], [T(15, 'treinta mil'), O.frasco(1)]] });
  E.michiEn(B(12).t_in, 'preocupacion', 1);
  E.objPiso(O.ticketTaller(), 470, 150, 168, T(12, 'Ocho mil pesos'), T(16, 'Está ahí para que'), 'ticket taller');

  // 13
  E.gatito({ g: 'tigrillo', x: G2, tin: T(13, 'Con la tarjeta'), tout: T(14, 'Volviste'),
    expr: [[0, 'neutro']], obj: [[0, O.objeto('tigrillo')]] });
  E.michiEn(B(13).t_in, 'preocupacion', 2);
  op([['8,000 = 80 × 100', T(13, 'Ocho mil son')]], CX, 170, fin(14));
  op([['80 × 60 = ', T(13, 'Ochenta veces')], ['4,800', T(13, 'cuatro mil')]], CX, 290, fin(14));
  E.objPiso(O.recibo(MENOS + '4,800', C.rojo), 950, 150, 190, T(13, 'cuatro mil'), T(14, 'Volviste'), 'recibo −4,800');
  pie('Si la pagas en un año', T(13, 'Ocho mil son'), fin(14));

  // 14 · PALABRA 2 DE 3
  tarjeta(2, 'Fondo de emergencia', 'Dinero guardado para lo que no planeaste, listo para sacarlo el mismo día.', T(14, 'fondo'), fin(14));
  E.michiEn(T(14, 'fondo'), 'me-di-cuenta', 2);

  // 15
  op([['3 × 10,000 = ', T(15, 'Tres por')], ['30,000', T(15, 'treinta mil')]], CX, 170, T(16, 'Está ahí para que'));
  pie('Criterio general, no regla fija', B(15).t_in, fin(15));
  E.michiEn(B(15).t_in, 'neutro', 1);

  // 16
  E.objPiso(O.ticketTaller(), 700, 150, 168, T(16, 'Está ahí para que'), fin(16), 'ticket taller pagado');
  E.el(O.palomita(), { x: 800, y: 820 - 168 - 40, w: 64, h: 64, qa: 'objeto', nombre: 'palomita' }, T(16, 'Está ahí para que'), fin(16));
  E.objPiso(O.llanta(), 470, 200, 200, T(16, 'llanta'), fin(16), 'llanta');
  lista(T(16, 'Así que'), fin(16), [null, T(16, 'primero el colchón')]);
  E.michiEn(B(16).t_in, 'alivio', 2);

  // 17 · RE-ENGANCHE 2
  op([['10,000 + 30,000 = 40,000', T(17, 'diez para la deuda')]], 96, 170, T(17, 'cuándo los'));
  op([[`50,000 ${MENOS} 40,000 = `, T(17, 'Te quedan')], ['10,000', T(17, 'quedan diez')]], 96, 290, T(17, 'cuándo los'));
  txt('¿Cuándo los vas a necesitar?', 'titulo', 96, 170, T(17, 'cuándo los'), fin(17));
  pie(EQUIV, B(17).t_in, fin(17));
  E.michiEn(B(17).t_in, 'curiosidad', 2);

  // ---------- 18–22 · IDEA 3: el tiempo (arcilla, Bosco) ----------
  E.gatito({ g: 'bosco', x: G1, tin: B(18).t_in, tout: fin(23),
    expr: [[0, 'neutro'], [T(19, 'bajan'), 'preocupacion'], [B(20).t_in, 'neutro'], [T(20, 'catorce'), 'alegria'], [B(23).t_in, 'neutro']],
    obj: [[0, O.maceta(false)], [T(20, 'catorce'), O.maceta(true)]] });
  E.michiEn(B(18).t_in, 'tranquilidad', 2);
  const meses = ['+', MENOS, '+', '+', MENOS, '+', MENOS, '+', '+', MENOS, '+', '+'];
  E.el(`<div style="height:36px;background:${C.tinta}"></div><div style="display:grid;grid-template-columns:repeat(4,100px);gap:8px;padding:12px">` +
    meses.map(m => `<div style="height:64px;background:${C.hondo};display:flex;align-items:center;justify-content:center" class="dato ${m === '+' ? 'verde' : 'rojo'}">${m}</div>`).join('') + '</div>',
    { x: 96, y: 170, cls: 'panel', qa: 'objeto', nombre: 'calendario' }, T(18, 'Una inversión'), T(20, 'cinco años'));

  // 19
  op([['10 % de 10,000 = ', T(19, 'diez por ciento de')], ['1,000', T(19, 'son mil')]], CX, 170, T(20, 'cinco años'));
  op([[`10,000 ${MENOS} 1,000 = `, T(19, 'Sacas')], ['9,000', T(19, 'nueve mil')]], CX, 290, T(20, 'cinco años'));
  E.objPiso(O.recibo(MENOS + '1,000', C.rojo), 500, 150, 190, T(19, 'son mil'), fin(19), 'recibo −1,000');
  pie('Ejemplo hipotético', B(19).t_in, fin(19));
  E.michiEn(B(19).t_in, 'preocupacion', 1);

  // 20
  E.el(`<div style="height:36px;background:${C.tinta}"></div><div style="height:224px;display:flex;align-items:center;padding:0 40px" class="operacion">5 años</div>`,
    { x: 96, y: 170, w: 448, cls: 'panel', qa: 'objeto', nombre: 'calendario 5 años' }, T(20, 'cinco años'), T(21, 'plazo'));
  E.michiEn(T(20, 'nadie lo garantiza'), 'duda', 2);
  op([['10,000 → ', T(20, 'tus diez mil')], ['14,693', T(20, 'catorce')]], CX, 170, fin(21));
  E.michiEn(T(20, 'catorce') - 0.5, 'sorpresa', 2);
  pie('8 % fijo, de ejemplo', T(20, 'Con el ocho'), fin(21));

  // 21 · PALABRA 3 DE 3
  tarjeta(3, 'Plazo', 'El tiempo que vas a dejar tu dinero sin tocarlo.', T(21, 'plazo'), fin(21));
  E.michiEn(T(21, 'plazo'), 'me-di-cuenta', 2);

  // 22
  lista(B(22).t_in, fin(22), [null, null, T(22, 'puede invertirse')]);
  filaTabla('Lo necesito este año → ahorro', '', 170, T(22, 'Dinero que vas'), fin(22)).style.left = CX + 'px';
  filaTabla('No lo toco en años → puede invertirse', '', 241, T(22, 'Dinero que no'), fin(22)).style.left = CX + 'px';
  E.michiEn(B(22).t_in, 'confianza', 2);

  // ---------- 23 · ¡OJO! ----------
  E.gatito({ g: 'tigrillo', x: G2, tin: T(23, 'La tasa real'), tout: fin(23), expr: [[0, 'neutro']], obj: [[0, O.objeto('tigrillo')]] });
  txt('Ejemplos', 'titulo', 96, 150, T(23, 'ejemplos'), fin(23));
  txt('<div class="rotulo">¡OJO!</div><div class="acl">60 % y 8 % son ejemplos, no tasas de un producto real.</div>', 'alerta', 96, 268, T(23, 'Pero ojo'), fin(23), { nombre: 'caja ¡OJO!' });
  E.michiEn(B(23).t_in, 'duda', 2);

  // ---------- 24–27 · MOMENTO FUERTE: al revés vs en orden ----------
  E.el('', { x: 960, y: 150, w: 1, h: 670, style: `background:${C.apoyo}`, qa: 'linea', nombre: 'división' }, B(24).t_in, fin(26));
  txt('Al revés', 'dato', 96, 150, B(24).t_in, fin(26));
  txt('En orden', 'dato', 1000, 150, B(24).t_in, fin(26));
  E.gatito({ g: 'tigrillo', x: 220, tin: B(24).t_in, tout: fin(26),
    expr: [[0, 'neutro'], [T(25, 'menos dos'), 'preocupacion']], obj: [[0, O.objeto('tigrillo')]] });
  E.objMichi(O.maceta(false), 456, 4, B(24).t_in, fin(26), 'maceta grande');
  E.objMichi(O.tarjetaPartida(), 980, 2, B(24).t_in, fin(26), 'tarjeta partida');
  E.objMichi(O.frasco(1), 1060, 2, B(24).t_in, fin(26), 'frasco lleno');
  E.objMichi(O.maceta(false), 1150, 2, B(24).t_in, fin(26), 'maceta chica');
  E.michiEn(B(24).t_in, 'curiosidad', 2);

  // 25
  op([['50,000 = 500 × 100', B(25).t_in]], 96, 250, T(25, 'Quinientas veces'));
  op([['500 × 8 = ', T(25, 'Quinientas veces')], ['4,000', T(25, 'cuatro mil')]], 96, 250, T(25, 'Cuatro mil menos'));
  op([[`4,000 ${MENOS} 6,000 =`, T(25, 'Cuatro mil menos')]], 96, 250, fin(26));
  op([[MENOS + '2,000', T(25, 'menos dos')]], 96, 370, fin(26), 'operacion tnum rojo');
  E.objMichi(O.frasco(0), 700, 2, T(25, 'sin colchón'), fin(26), 'frasco vacío');
  E.michiEn(T(25, 'menos dos') - 0.5, 'sorpresa', 2);

  // 26
  txt('+800', 'operacion tnum verde', 1000, 250, T(26, 'Ganas ochocientos'), fin(26));
  txt('Sin deuda ·<br>Colchón 30,000', 'dato tnum', 1000, 390, T(26, 'sin deuda'), fin(26));
  E.michiEn(B(26).t_in, 'alivio', 2);
  pie(EQUIV, B(25).t_in, fin(26));

  // 27
  op([['50,000 ÷ 10,000 = 5', B(27).t_in]], 560, 220, fin(27));
  E.michiEn(B(27).t_in, 'confianza', 2);

  // ---------- 28 · PETRÓLEO (sin personajes) ----------
  E.michiEn(B(28).t_in, null);
  const pap = `color:${C.papel}`;
  txt('<span style="position:relative;display:inline-block">Primero<span class="marca" style="position:absolute;left:0;right:0;bottom:-2px;height:12px;background:#E8C46A;transform-origin:left center"></span></span> lo que te cobra.',
    'titulo', 96, 300, T(28, 'Primero'), fin(28), { style: pap + ';isolation:isolate', nombre: 'frase petróleo 1' });
  E.marca(E.elementos[E.elementos.length - 1].d, T(28, 'Primero'));
  txt('Luego lo que te cuida.', 'titulo', 96, 412, T(28, 'Luego'), fin(28), { style: pap });
  txt('Al final, lo que crece.', 'titulo', 96, 524, T(28, 'Al final'), fin(28), { style: pap });

  // ---------- 29 · LAS 3 IDEAS (arcilla) ----------
  const fila3 = (svg, n, texto, y, t) => txt(`${icono(svg)}<span class="operacion" style="font-size:80px;line-height:80px;margin:0 16px 0 28px">${n}.</span><span class="dato">${texto}</span>`,
    '', 96, y, t, fin(29), { style: 'display:flex;align-items:flex-end;height:120px' });
  fila3(O.tarjetaPartida(), 1, 'Paga la deuda cara', 190, T(29, 'Uno'));
  fila3(O.frasco(1), 2, 'Junta tu fondo de emergencia', 340, T(29, 'Dos'));
  fila3(O.maceta(false), 3, 'Lo que no tocarás en años, a crecer', 490, T(29, 'Tres'));
  E.michiEn(B(29).t_in, 'satisfaccion', 2);

  // ---------- 30 · TARJETA FINAL (arcilla, mitad izquierda) ----------
  txt('Pon tu dinero<br>en orden.', 'titulo', 96, 150, B(30).t_in, FIN);
  txt('@omar.vizu', 'contacto', 96, 366, B(30).t_in, FIN);
  E.el(img('/assets/qr-instagram-omar-vizu.svg'), { x: 96, y: 470, w: 360, h: 360, qa: 'objeto', nombre: 'QR' }, B(30).t_in, FIN);
  txt('Escanea para ir a Instagram', 'dato', 96, 846, B(30).t_in, FIN, { style: 'font-size:28px;line-height:34px' });
  E.michiEn(B(30).t_in, 'tranquilidad', 2, { x: 640 });
};
