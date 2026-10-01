/* Objetos de escena.
   - Los objetos de los gatitos salen de sus SVG originales (assets/gatitos/svg/<gatito>/<gatito>_objeto.svg).
     Los estados «frasco lleno», «tarjeta partida» y «brote que crece» se arman encima del mismo archivo,
     sin redibujarlo.
   - Los objetos que no venían en ./assets (cubeta, llanta, bolsa de despensa, tickets) se dibujan aquí:
     planos, geométricos y solo con la paleta de marca. */
(function (root) {
  const P = {
    papel: '#F3EFE6', hondo: '#E3DDD0', tinta: '#05070A', calido: '#5E5A52', apoyo: '#8C8577',
    verde: '#2F6B4F', rojo: '#9A3B2E', ocre: '#7A5518', aguaMuro: '#B7D3CF', aguaPiso: '#9FC2BD',
  };
  const raw = {};
  let uid = 0;

  async function load() {
    for (const g of ['tigrillo', 'canela', 'bosco']) {
      raw[g] = await (await fetch(`/assets/gatitos/svg/${g}/${g}_objeto.svg`)).text();
    }
  }
  const inner = s => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const wrap = (body, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb || '40 -110 70 115'}" style="overflow:visible;width:100%;height:100%">${body}</svg>`;

  // Objeto original, tal cual.
  const objeto = g => wrap(inner(raw[g]));

  // Frasco de Canela con nivel de llenado (0, 1/3, 2/3, 1). El relleno va detrás de la etiqueta.
  function frasco(nivel) {
    const id = 'fr' + (++uid), h = 58 * nivel;
    let s = inner(raw.canela);
    const cuerpo = '<rect x="52" y="-64" width="42" height="64" rx="9" fill="#E3DDD0"/>';
    const relleno = nivel > 0
      ? `<clipPath id="${id}"><rect x="52" y="-64" width="42" height="64" rx="9"/></clipPath><rect x="52" y="${-h}" width="42" height="${h}" fill="${P.apoyo}" clip-path="url(#${id})"/>`
      : '';
    return wrap(s.replace(cuerpo, cuerpo + relleno));
  }

  // Tarjeta de Tigrillo partida a la mitad: el mismo dibujo, recortado en dos y separado.
  function tarjetaPartida() {
    const a = 'tpA' + (++uid), b = 'tpB' + uid, t = inner(raw.tigrillo);
    return wrap(
      `<clipPath id="${a}"><rect x="30" y="-120" width="46" height="140"/></clipPath>` +
      `<clipPath id="${b}"><rect x="76" y="-120" width="60" height="140"/></clipPath>` +
      `<g transform="translate(-6 2) rotate(-10 76 -8)"><g clip-path="url(#${a})">${t}</g></g>` +
      `<g transform="translate(6 2) rotate(10 76 -8)"><g clip-path="url(#${b})">${t}</g></g>`);
  }

  // Maceta de Bosco con el brote crecido (mismo tallo y hojas, escalados desde la base del tallo).
  function maceta(crecido) {
    let s = inner(raw.bosco);
    if (!crecido) return wrap(s);
    const i = s.indexOf('<rect');
    return wrap(`<g transform="translate(77 -34) scale(1.75) translate(-77 34)">${s.slice(0, i)}</g>${s.slice(i)}`);
  }

  // ---- Objetos nuevos (no venían en ./assets) ----
  const recibo = (texto, color, w = 150, h = 190) => wrap(
    `<path d="M0 0H${w}V${h - 12}l-12.5 12-12.5-12-12.5 12-12.5-12-12.5 12-12.5-12-12.5 12-12.5-12-12.5 12-12.5-12-12.5 12-12.5-12Z" fill="${P.papel}"/>` +
    `<rect x="18" y="22" width="${w - 36}" height="6" fill="${P.apoyo}"/><rect x="18" y="40" width="${(w - 36) * .6}" height="6" fill="${P.apoyo}"/>` +
    `<text x="${w / 2}" y="${h * .66}" text-anchor="middle" font-family="Archivo" font-weight="700" font-size="40" fill="${color}" style="font-variant-numeric:tabular-nums">${texto}</text>`,
    `0 0 ${w} ${h}`);

  const ticketTaller = () => wrap(
    `<path d="M0 0H170V178l-14.2 12-14.2-12-14.2 12-14.2-12-14.2 12-14.2-12-14.2 12-14.2-12-14.2 12-14.2-12-14.2 12L0 178Z" fill="${P.papel}"/>` +
    `<text x="18" y="52" font-family="Archivo" font-weight="600" font-size="34" fill="${P.tinta}">Taller</text>` +
    `<rect x="18" y="72" width="134" height="4" fill="${P.apoyo}"/>` +
    `<text x="18" y="134" font-family="Archivo" font-weight="700" font-size="44" fill="${P.tinta}" style="font-variant-numeric:tabular-nums">8,000</text>`,
    '0 0 170 190');

  const palomita = () => wrap(`<path d="M8 34L26 52L58 12" fill="none" stroke="${P.tinta}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`, '0 0 64 64');

  const ticketLuz = () => wrap(
    `<path d="M0 0H120V168l-12 12-12-12-12 12-12-12-12 12-12-12-12 12-12-12-12 12-12-12Z" fill="${P.papel}"/>` +
    `<circle cx="60" cy="58" r="24" fill="none" stroke="${P.tinta}" stroke-width="6"/>` +
    `<rect x="49" y="84" width="22" height="16" fill="${P.tinta}"/>` +
    `<rect x="18" y="120" width="84" height="6" fill="${P.apoyo}"/><rect x="18" y="138" width="54" height="6" fill="${P.apoyo}"/>`,
    '0 0 120 180');

  const bolsaDespensa = () => wrap(
    `<ellipse cx="62" cy="38" rx="20" ry="34" fill="${P.verde}" transform="rotate(-18 62 38)"/>` +
    `<ellipse cx="98" cy="30" rx="16" ry="30" fill="${P.verde}" transform="rotate(14 98 30)"/>` +
    `<rect x="118" y="6" width="22" height="70" rx="8" fill="${P.ocre}" transform="rotate(12 129 41)"/>` +
    `<path d="M20 60H180L196 240H4Z" fill="${P.hondo}"/>` +
    `<rect x="20" y="60" width="160" height="22" fill="${P.apoyo}"/>`,
    '0 0 200 240');

  // Cubeta con un agujero más grande que la llave.
  const cubeta = () => wrap(
    `<rect x="0" y="0" width="120" height="22" fill="${P.tinta}"/><rect x="98" y="0" width="22" height="58" fill="${P.tinta}"/>` +
    `<rect x="104" y="58" width="10" height="92" fill="${P.aguaMuro}"/>` +
    `<path d="M70 150Q140 70 210 150" fill="none" stroke="${P.tinta}" stroke-width="8"/>` +
    `<path d="M50 150H230L210 340H70Z" fill="${P.apoyo}"/>` +
    `<rect x="42" y="142" width="196" height="18" fill="${P.calido}"/>` +
    `<circle cx="182" cy="292" r="26" fill="${P.tinta}"/>` +
    `<path d="M196 300C246 304 262 322 266 340H214C212 326 204 316 196 312Z" fill="${P.aguaMuro}"/>`,
    '0 0 280 340');

  const llanta = () => wrap(
    `<circle cx="110" cy="110" r="110" fill="${P.tinta}"/><circle cx="110" cy="110" r="66" fill="${P.calido}"/>` +
    `<circle cx="110" cy="110" r="30" fill="${P.hondo}"/>` +
    [0, 72, 144, 216, 288].map(a => { const r = a * Math.PI / 180; return `<circle cx="${(110 + 48 * Math.sin(r)).toFixed(1)}" cy="${(110 - 48 * Math.cos(r)).toFixed(1)}" r="7" fill="${P.tinta}"/>`; }).join(''),
    '0 0 220 220');

  root.OBJ = { load, objeto, frasco, tarjetaPartida, maceta, recibo, ticketTaller, ticketLuz, bolsaDespensa, cubeta, llanta, palomita, P };
})(window);
