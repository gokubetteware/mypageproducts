# Fase 0 · Reporte de verificación — Video A «Qué es la bolsa de valores»

Fecha: 30 sep 2026. Todavía no se ha animado nada. Espero tu «adelante».

## Resultado en una línea
El guion y las cuentas están bien, y las herramientas se pueden instalar. **Estoy bloqueado por dos cosas:** (1) no tengo el rig de MICHI y (2) el paquete del video contradice el Manual de marca v1.1 en el dinero, los colores, la tipografía y el cierre.

## 1. Rig de MICHI — BLOQUEANTE
- `assets/michi/michi_rig.js` y `michi_emotions.json` **no vienen** en el zip ni en ningún otro archivo.
- El PDF «Todas sus expresiones» trae láminas **raster** (PNG de 320×367 px, con fondo papel opaco). **No son vectoriales.** La regla del doc 01 §6 dice que en este caso me detenga y te pregunte.
- La referencia web (`michi-emociones…chatgpt.site`) está bloqueada desde este entorno (403).
- El catálogo sí me sirvió: 51 entradas (neutro + 50 estados) con 4 niveles cada una (N1 Sutil → N4 Extrema).

## 2. Mapeo de los 5 estados (con los nombres del catálogo)
| Guion | Key del rig | Nivel que propongo |
|---|---|---|
| tranquilo | `tranquilidad` | N1–N2 |
| confiado | `confianza` | N2 |
| sorprendido | `sorpresa` | N2 (N3 en los zooms) |
| preocupado | `preocupacion` | N2 |
| aliviado | `alivio` | N2–N3 |

Los 5 existen, así que no hace falta inventar ninguno. **Falta confirmarlo contra `michi_emotions.json`.**

## 3. ¿Hay grises en el rig?
- Colores oficiales de MICHI: cuerpo `#05070A`, ojos `#E8C46A` y brillo `#FFFFFF`. **Es casi negro, pero no es `#000000`** como pide el doc 03. Además, el manual prohíbe `#000`.
- En las láminas hay pocos píxeles grises (`#646462`, `#A4A19C`, `#CAC7C0`). Pueden ser suavizado de bordes o una sombra de piso. Solo lo puedo confirmar con el rig.
- Los bigotes son color ámbar claro y la boca es oliva. No son grises.

## 4. Herramientas
| Herramienta | Estado |
|---|---|
| Node | v22.22.2 ✓ |
| Playwright + Chromium | 1.56.1 ✓ (`/opt/pw-browsers`) |
| ffmpeg | ✗ no está en el sistema → `apt-get install -y ffmpeg` (6.1.1 disponible) o `pip install imageio-ffmpeg` |
| GSAP | npm accesible (3.15.0) → `npm i gsap` |
| Fuentes | Google Fonts accesible → se descargan y se embeben de forma local |

## 5. Máquina
4 núcleos y 15 GB de RAM → **render en 3 workers en paralelo** (uno queda libre para ffmpeg).

## 6. Contradicciones: doc 03 y guion vs. Manual de marca v1.1
El manual dice: «si un documento anterior contradice este manual, manda este manual». Necesito tu decisión en cada punto:

| # | Tema | Paquete del video | Manual v1.1 | Qué recomiendo |
|---|---|---|---|---|
| A | **Dinero** | «catpeso»: moneda con orejas y «$». Aparece en la **voz** | «Michipesos y cascabeles», con archivos oficiales. Hay que declarar «1 michipeso = 1 peso» | Decides tú: si cambias a michipesos hay que tocar la voz (71 frases), así que lo hago **antes** de que grabes. Los archivos de michipesos tampoco vienen en el paquete |
| B | Negro de MICHI | `#000000` | `#05070A` con ojos ámbar | Usar el manual (el rig manda) |
| C | Paleta | Crema `#F5EFE3`, verde azulado, naranja, verde `#2E9E5B`, rojo `#D64545` | Arcilla, agua y petróleo; verde `#2F6B4F`, rojo `#9A3B2E` | Usar el manual: arcilla para abrir y cerrar, agua para explicar |
| D | Tipografía | Nunito | Instrument Serif (titulares y cifras), Archivo (tablas), Figtree (definición) | Usar el manual |
| E | Texto mínimo | 40 px | Cabecera 24 px, pie 22 px | 40 px para todo lo que explica; permitir 24 px solo en la cabecera y el pie de marca |
| F | Tarjeta de definición | Franja inferior, 72 / 44 / 40 px | Tarjeta **petróleo**, Instrument Serif 80 + Figtree 38. Nunca con MICHI encima | Tarjeta petróleo que ocupa todo el ancho, con MICHI a un lado y fuera de la tarjeta |
| G | Escena | Fondo liso, MICHI en una esquina | Muro + piso, MICHI **sentado sobre la línea de piso** | Usar el manual |
| H | Esquina superior izquierda | Tira de hilo | Cabecera «CUENTAS CLARAS CON MICHI» | La cabecera arriba y la tira de hilo justo debajo |
| I | Cierre y CTA | «Sigue el canal para no perdértelo» | «Sígueme para la siguiente cuenta» + @omar.vizu | Decides tú: cambia la voz de c070 |
| J | Rótulo | «Ejemplo» | Pie «Ejemplo hipotético» en tinta | Usar el manual |

La sección 10 del doc 03 («TU ESTILO») está vacía. Si apruebas las recomendaciones, la lleno con los valores del manual.

## 7. Conteo de palabras habladas
Se contó con un script sobre `04_escenas.json`, sin marcas: **907 palabras** (el rango es de 840 a 920) ✓.
Por escena: S01 91 · S02 159 · S03 213 · S04 217 · S05 127 · S06 74 · S07 26. Son 71 frases (c001–c071), 122 eventos y exactamente 3 zooms (e002, e082, e153).

## 8. Cuentas del guion
Las 14 cuentas de la tabla (11 operaciones y 3 diferencias) pasaron con `assert` ✓. El singular y el plural de «catpeso(s)» también son correctos en todas las frases ✓.

## Lo que necesito de ti
1. **El rig:** `michi_rig.js` + `michi_emotions.json` (o `michi_master.svg`), en `assets/michi/`.
2. **Dinero:** ¿catpesos (como está el guion) o michipesos y cascabeles (como dice el manual)? Si eliges michipesos, pásame los archivos.
3. **Estilo:** ¿apruebo los puntos B–H y J según el manual (lo que recomiendo)?
4. **Cierre:** ¿mantengo la frase del guion o uso la del manual?

---

## Actualización · decisiones de Omar (30 sep 2026)

### Dinero y cierre
- **Dinero:** se usan **CATPESOS**. El manual v1.0 que me mandaste (sección 17, «Economía: CATPESOS») lo confirma, así que el guion no cambia. Pendiente: poner en pantalla el pie «1 CATPESO = 1 peso mexicano en este ejemplo» y usar los archivos oficiales de los catpesos (billetes de 20 a 1000; monedas de 1, 2, 5 y 10). Esos archivos todavía no los tengo.
- **Cierre (lo elegí yo, con la estructura del video de deudas):**
  - c070 · «¿Y si todas tus acciones fueran de una sola empresa, [pausa] y te tocara la papelería?»
  - c071 · «En el siguiente video hacemos la cuenta para no depender de una sola empresa. [pausa] Sígueme para la siguiente cuenta.»
  - En pantalla: vuelve la ficha «Papelería: 1,000 → 600 −400». No es una cifra nueva y no lleva «tic». Luego viene la pantalla final en arcilla: «Hagamos la siguiente cuenta.», el botón «Sígueme para la siguiente cuenta» y «@omar.vizu».
  - Palabras: 907 → **915** (dentro del rango de 840 a 920).
  - Se quita «Nos vemos allá.».
- **Manuales:** el manual v1.0 dice que el cierre lleva «Cuentas claras, decisiones tranquilas.». Aquí se usa la fórmula del video que aprobaste, que coincide con el manual v1.1.

### Lo que sigue pendiente
- **Bloqueante:** los archivos vectoriales de MICHI (carpeta «MICHI-rig-y-expresiones»: `michi_rig.js` + `michi_emotions.json`).
- Los archivos de los CATPESOS.
- Tu visto bueno a las recomendaciones de estilo B–H y J.
