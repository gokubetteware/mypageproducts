// Única fuente de las cifras en pantalla. Cada cifra se calcula aquí, se compara
// con la tabla del guion (docs/02) con assert y se escribe en timeline/numeros.json.
// El HTML nunca escribe una cifra a mano: la pide por su clave con N('clave').
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const fmt = n => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US');
const sgn = n => (n > 0 ? '+' : '−') + Math.abs(n).toLocaleString('en-US');

const base = {
  taqueria_valor: 100000, taqueria_acciones: 100,
  venta_acciones: 20,
  ganancia_hoy: 10000, ganancia_esperada: 15000, multiplo: 10,
  papeleria_valor: 50000, papeleria_acciones: 50,
  papeleria_ganancia_hoy: 5000, papeleria_ganancia_esperada: 3000,
};

// [clave, cuenta, resultado esperado según la tabla del guion]
const cuentas = [
  ['c1_precio_accion', b => b.taqueria_valor / b.taqueria_acciones, 1000],
  ['c2_venta', (b, r) => b.venta_acciones * r.c1_precio_accion, 20000],
  ['c3_quedan', b => b.taqueria_acciones - b.venta_acciones, 80],
  ['c4_toca_hoy', b => b.ganancia_hoy / b.taqueria_acciones, 100],
  ['c5_toca_esperado', b => b.ganancia_esperada / b.taqueria_acciones, 150],
  ['c5b_mas_que_hoy', (b, r) => r.c5_toca_esperado - r.c4_toca_hoy, 50],
  ['c6_precio_antes', (b, r) => r.c4_toca_hoy * b.multiplo, 1000],
  ['c7_precio_despues', (b, r) => r.c5_toca_esperado * b.multiplo, 1500],
  ['c7b_delta_taqueria', (b, r) => r.c7_precio_despues - r.c6_precio_antes, 500],
  ['c8_papeleria_accion', b => b.papeleria_valor / b.papeleria_acciones, 1000],
  ['c9_papeleria_toca_hoy', b => b.papeleria_ganancia_hoy / b.papeleria_acciones, 100],
  ['c10_papeleria_toca_esperado', b => b.papeleria_ganancia_esperada / b.papeleria_acciones, 60],
  ['c11_papeleria_precio', (b, r) => r.c10_papeleria_toca_esperado * b.multiplo, 600],
  ['c11b_delta_papeleria', (b, r) => r.c11_papeleria_precio - r.c8_papeleria_accion, -400],
];

const r = {};
for (const [k, f, esperado] of cuentas) {
  r[k] = f(base, r);
  assert.strictEqual(r[k], esperado, `${k}: da ${r[k]}, el guion dice ${esperado}`);
}
// El gancho de S01 usa el mismo precio que la cuenta de expectativas.
assert.strictEqual(r.c6_precio_antes, r.c1_precio_accion);

const valores = { ...base, ...r };
const texto = {};
for (const [k, v] of Object.entries(valores)) texto[k] = fmt(v);
texto.c7b_delta_taqueria = sgn(r.c7b_delta_taqueria);
texto.c11b_delta_papeleria = sgn(r.c11b_delta_papeleria);
texto.c5b_delta = sgn(r.c5b_mas_que_hoy);

fs.writeFileSync(path.join(__dirname, 'numeros.json'),
  JSON.stringify({ generado: 'timeline/build_numeros.js', valores, texto }, null, 1) + '\n');
console.log(`numeros.json: ${cuentas.length} asserts OK`);
