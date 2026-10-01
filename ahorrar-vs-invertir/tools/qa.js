// Paso 3: controles automáticos. Abre la escena dos veces (bandera true y false) y compara.
const fs = require('fs'), path = require('path');
const abrir = require('./navegador');
const CFG = path.resolve(__dirname, '../config.json');
const setFlag = v => fs.writeFileSync(CFG, JSON.stringify({ subtitulos: v }, null, 2) + '\n');
const choca = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;
(async () => {
  const original = fs.readFileSync(CFG, 'utf8');
  setFlag(true); const A = await abrir();
  setFlag(false); const Bf = await abrir();
  fs.writeFileSync(CFG, original);
  const out = { subtitulos: [], bandera: {}, ritmo: [], duraciones_cortas: [], silencios: [], gatitos: [] };
  const subs = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fuentes/subtitulos_prueba.json')));
  const timing = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../timing.json')));

  // 1 · Subtítulos: tiempos, posición, tamaño y choques (se revisa cada 0.1 s de cada grupo).
  for (let i = 0; i < subs.grupos.length; i++) {
    const g = subs.grupos[i], sig = subs.grupos[i + 1], r = { n: g.n, bloque: g.bloque, dur: +(g.t_salida - g.t_entrada).toFixed(2), problemas: [] };
    if (r.dur < 1.2) r.problemas.push(`dura ${r.dur} s (< 1.2 s)`);
    if (sig && sig.t_entrada < g.t_salida) r.problemas.push('se encima con el grupo ' + sig.n);
    const tapados = new Set();
    for (let t = g.t_entrada + 0.05; t < g.t_salida; t += 0.1) {
      await A.page.evaluate(t => window.seek(t), t);
      const cs = await A.page.evaluate(() => window.cajas());
      const sb = cs.find(c => c.qa === 'subtitulo');
      if (!sb) { r.problemas.push('no se dibuja en ' + t.toFixed(2)); break; }
      r.caja = sb; r.fs = sb.fs;
      for (const c of cs) if (c !== sb && ['personaje', 'objeto'].includes(c.qa) && choca(sb, c)) tapados.add(c.nombre);
      for (const c of cs) if (c.nombre === 'pie' && choca(sb, c)) tapados.add('pie');
    }
    if (r.caja) {
      if (r.caja.y0 < 860) r.problemas.push(`borde superior en y=${r.caja.y0} (< 860)`);
      if (Math.abs(r.caja.y1 - 1040) > 1) r.problemas.push(`borde inferior en y=${r.caja.y1}`);
      if (r.caja.x0 < 520 || r.caja.x1 > 1400) r.problemas.push(`sale de x 520–1400 (${r.caja.x0}–${r.caja.x1})`);
      if (r.fs < 46) r.problemas.push(`letra reducida a ${r.fs} px`);
    }
    if (tapados.size) r.problemas.push('tapa: ' + [...tapados].join(', '));
    out.subtitulos.push(r);
  }

  // 2 · Bandera: se guardan pares de cuadros (true/false) y tools/bandera.py los compara píxel a píxel.
  const DIR = path.resolve(__dirname, '../entregas/paso3/bandera'); fs.mkdirSync(DIR, { recursive: true });
  const pares = [];
  for (let t = 0.5; t < timing.duracion; t += 6) {
    await A.page.evaluate(t => window.seek(t), t); await Bf.page.evaluate(t => window.seek(t), t);
    const sb = (await A.page.evaluate(() => window.cajas())).find(c => c.qa === 'subtitulo') || null;
    const k = t.toFixed(1);
    await A.page.screenshot({ path: `${DIR}/true_${k}.png` }); await Bf.page.screenshot({ path: `${DIR}/false_${k}.png` });
    pares.push({ t: +k, caja: sb });
  }
  fs.writeFileSync(`${DIR}/pares.json`, JSON.stringify(pares));
  out.bandera = { pares: pares.length, capa_existe_con_false: await Bf.page.evaluate(() => !!document.getElementById('capa-subtitulos')), capa_existe_con_true: await A.page.evaluate(() => !!document.getElementById('capa-subtitulos')) };

  // 3 · Ritmo: cambios visuales por minuto (entradas de elementos, fondos, expresiones y objetos).
  const ev = await A.page.evaluate(() => {
    const E = window.E, ts = [];
    for (const x of E.elementos) ts.push(x.tin);
    for (const f of E.fondos) ts.push(f.t);
    for (const m of E.michi) ts.push(m.t);
    for (const g of E.gatitos) { ts.push(g.tin); g.expr.forEach(e => ts.push(Math.max(e[0], g.tin))); g.objs.forEach(o => ts.push(Math.max(o.t, g.tin))); }
    const u = [...new Set(ts.map(t => Math.round(t * 10) / 10))].sort((a, b) => a - b);
    const cortos = E.elementos.filter(x => x.tout - x.tin < 2).map(x => ({ t: x.tin, dur: +(x.tout - x.tin).toFixed(2), texto: (x.d.textContent || x.d.dataset.nombre || '').trim().slice(0, 40) }));
    const gat = [];
    for (let t = 0; t < E.timing.duracion; t += 0.5) { const n = E.gatitos.filter(g => t >= g.tin && t < g.tout).length; if (n > 2) gat.push(t); }
    return { u, cortos, gat };
  });
  for (let m = 0; m * 60 < timing.duracion; m++) out.ritmo.push({ minuto: m, cambios: ev.u.filter(t => t >= m * 60 && t < (m + 1) * 60).length });
  out.duraciones_cortas = ev.cortos.filter(c => c.texto);
  out.gatitos = ev.gat;
  // 4 · Silencios de más de 5 s (según los tiempos estimados).
  const P = timing.palabras;
  for (let i = 1; i < P.length; i++) if (P[i].t0 - P[i - 1].t1 > 5) out.silencios.push({ desde: P[i - 1].t1, hasta: P[i].t0 });
  if (timing.duracion - P[P.length - 1].t1 > 5) out.silencios.push({ desde: P[P.length - 1].t1, hasta: timing.duracion });

  fs.mkdirSync(path.resolve(__dirname, '../entregas/paso3'), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, '../entregas/paso3/qa.json'), JSON.stringify(out, null, 1));
  await A.cerrar(); await Bf.cerrar();
  const conProb = out.subtitulos.filter(s => s.problemas.length);
  console.log('Subtítulos con problemas:', conProb.length); conProb.forEach(s => console.log(' ', s.n, '(b' + s.bloque + ')', s.problemas.join(' | ')));
  console.log('Bandera:', JSON.stringify(out.bandera));
  console.log('Ritmo:', out.ritmo.map(r => r.minuto + ':' + r.cambios).join(' '));
  console.log('Cortos (<2 s):', JSON.stringify(out.duraciones_cortas));
  console.log('>2 gatitos:', out.gatitos.length, '· silencios >5 s:', JSON.stringify(out.silencios));
  console.log('Tamaños de letra:', [...new Set(out.subtitulos.map(s => s.fs))].join(', '));
})().catch(e => { console.error(e); process.exit(1); });
