/* Genera un enlace de cobro con tarjeta (Stripe Checkout). Solo responde si llega la clave privada
   ADMIN_TOKEN; sin ella no crea nada. La llave de Stripe vive en las variables de entorno de Vercel,
   nunca en el código. Variables: STRIPE_SECRET_KEY, ADMIN_TOKEN. */
const crypto = require('crypto');

const SITIO = 'https://www.saphiless.com';
const fallos = new Map(); // ip -> { n, hasta }  (freno básico; se reinicia con cada arranque)

function igual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método no permitido' }); }

  const esperado = process.env.ADMIN_TOKEN, llave = process.env.STRIPE_SECRET_KEY;
  if (!esperado || !llave) return res.status(500).json({ error: 'Falta configurar ADMIN_TOKEN o STRIPE_SECRET_KEY en Vercel.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const f = fallos.get(ip);
  if (f && f.n >= 5 && Date.now() < f.hasta) return res.status(429).json({ error: 'Demasiados intentos. Espera 10 minutos.' });

  if (!igual(req.headers['x-admin-token'] || '', esperado)) {
    const n = (f && Date.now() < f.hasta ? f.n : 0) + 1;
    fallos.set(ip, { n, hasta: Date.now() + 10 * 60 * 1000 });
    return res.status(401).json({ error: 'No autorizado' });
  }
  fallos.delete(ip);

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const concepto = String(b.concepto || '').trim().slice(0, 120);
  const monto = Math.round(Number(b.monto) * 100);
  const correo = String(b.correo || '').trim();
  const horas = Math.min(24, Math.max(1, Math.round(Number(b.horas) || 24)));
  if (concepto.length < 3) return res.status(400).json({ error: 'Escribe el concepto del cobro.' });
  const moneda = String(b.moneda || 'mxn').toLowerCase();
  if (moneda !== 'mxn' && moneda !== 'usd') return res.status(400).json({ error: 'Moneda no permitida.' });
  if (!Number.isFinite(monto) || monto < 1000 || monto > 20000000) return res.status(400).json({ error: 'El monto debe estar entre 10 y 200,000 (en la moneda elegida).' });
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return res.status(400).json({ error: 'El correo no es válido.' });

  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('line_items[0][quantity]', '1');
  p.set('line_items[0][price_data][currency]', moneda);
  p.set('line_items[0][price_data][unit_amount]', String(monto));
  p.set('line_items[0][price_data][product_data][name]', concepto);
  p.set('success_url', SITIO + '/pago-listo.html');
  p.set('cancel_url', SITIO + '/pago-cancelado.html');
  p.set('expires_at', String(Math.floor(Date.now() / 1000) + horas * 3600));
  p.set('metadata[origen]', 'saphiless-privado');
  if (correo) p.set('customer_email', correo);

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + llave, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString(),
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Stripe rechazó el cobro: ' + ((d.error && d.error.message) || r.status) });
    return res.status(200).json({ url: d.url, expira: d.expires_at, id: d.id });
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo hablar con Stripe.' });
  }
};
