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

---

## Actualización 2 · rig recibido y cabecera (30 sep 2026)

### Rig de MICHI: desbloqueado ✓
- Venía dentro de `michi-panel.html`. Lo separé en tres archivos dentro de `assets/michi/`:
  - `michi_rig.js`: rig 2D paramétrico **vectorial** (SVG).
  - `michi_recipes.js`: las recetas de las emociones.
  - `michi_emotions.json`: 51 estados con 4 niveles cada uno.
- `MichiRecipes.build(MichiRig)` genera exactamente el mismo JSON que trae el panel, así que es reproducible ✓.
- **Colores:** el SVG usa solo 3 colores, `#05070A`, `#E8C46A` y `#FFFFFF` (el brillo del ojo). **No hay grises** ✓. Los tonos olivas que se veían en las láminas son la nariz y la boca en ámbar con opacidad 0.5–0.6.
- **Mapeo final:**

  | Guion | Estado del rig | Nivel |
  |---|---|---|
  | tranquilo | `tranquilidad` | N2 |
  | confiado | `confianza` | N2 |
  | sorprendido | `sorpresa` | N3 |
  | preocupado | `preocupacion` | N2 |
  | aliviado | `alivio` | N3 |

- Prueba a 4K real (`deviceScaleFactor: 2`): `render/fase0_estados_4k.png`. Los bordes salen nítidos.
- Nota: la función `scene()` del rig dibuja un fondo oscuro, un halo y una sombra. **No la voy a usar**, porque el manual pide fondos claros y cero sombras. Solo uso `render()` (el personaje sin fondo), sentado sobre la línea de piso.

### Cabecera (regla del canal)
- Arriba siempre «**CCM**» y abajo siempre **el tema del video**. En este video: «BOLSA DE VALORES».
- Estilo copiado del video de interés compuesto: línea 1 en tinta; línea 2 en gris cálido, un poco más chica.
- La tira de hilo baja a y≈150 para no chocar con la cabecera.
- Queda escrito en `docs/03` (sección 3) y en `04_escenas.json` (`video.cabecera`).

### Lo que falta para arrancar la Fase 1
- Los archivos de los CATPESOS. Si no llegan, en la Fase 1 dibujo la etiqueta de valor sin billetes ni monedas, y los agrego cuando los mandes.
- Tu «adelante» al estilo del manual (puntos B–H y J).

---

# Fase 1 · Esqueleto y animatic (S01)

## Qué hay
- **Motor.** `timeline/build_timeline.js` lee `docs/04` y genera `timeline_nominal.json` (124 eventos, 3 zooms). `timeline/build_numeros.js` hace las 14 cuentas con assert y genera `numeros.json`. `src/` tiene el HTML, el SVG y GSAP. `render/render.js` hace la captura con Playwright y la codificación con ffmpeg.
- **Estilo del manual aplicado:**
  - Muro y piso arcilla, con MICHI sentado sobre la línea de piso.
  - Instrument Serif en cifras y titulares, Archivo en rótulos.
  - Cabecera «CCM / BOLSA DE VALORES».
  - Billetes CATPESOS originales: 1,000 = billete de 1000; 1,500 = billetes de 1000 + 500.
  - Pie: «Ejemplo hipotético · 1 CATPESO = 1 peso mexicano».
  - Verde solo en «+500».
- **Render de prueba:** `render/fase1_S01.mp4`. Son 48 s, 1920×1080, 30 fps, 1440 cuadros, sin cuadros negros. Tardó 84 s con 3 procesos, así que el video completo tardará unos 14 min.
- **Zoom 1/3 en 4K real:** `render/fase1/zoom_4k_100pct.png`, un recorte al 100 % del cuadro 3840×2160. Los bordes salen nítidos.
- **Hoja de cuadros clave:** `render/fase1/contact_sheet_S01.png`.

## Decisiones que tomé (dime si alguna no te gusta)
1. La cabecera se ve desde el segundo 0. No es logo ni saludo, es contexto.
2. No hay caja de subtítulos: el doc 03 dice «sin subtítulos en esta versión», aunque el video de interés compuesto sí los tenía. ¿Los quieres?
3. En el zoom del gancho (0.8–3.0 s) la cámara se acerca a 1.3× y deja a la vista tanto a MICHI como la etiqueta, para que se vea el cambio 1,000 → 1,500.
4. MICHI cambia de estado con un fundido de 0.4 s entre poses del rig. La cola y la pose cambian a la mitad del fundido, porque así lo hace el rig. Todavía no hay microanimación (respirar o parpadear).

## ⚠️ Duración: hace falta decidir antes de que grabes
- Son 915 palabras más 37.5 s de pausas marcadas.
- A 105–115 palabras/min, la voz dura **8:35–9:20**, más la pantalla final. El tope es 8:00.
- Los tiempos de `docs/04` dan por hecho unas 130 palabras/min: 54 de los 71 cues no caben a 110 palabras/min.
- Opciones:
  - **(a)** Leer a unas 130 palabras/min.
  - **(b)** Recortar unas 110–120 palabras.
  - **(c)** Permitir que el video dure unos 9:00.
- Recomiendo **(b)**, porque un ritmo calmado es la promesa del canal. Si me dices que sí, te propongo los recortes sin tocar ninguna cifra.

---

## Actualización 3 · decisiones de Omar sobre la Fase 1
- **Subtítulos: sí**, como en el video de interés compuesto:
  - Caja papel centrada sobre el piso, Figtree 700 de 48 px, en una sola línea.
  - La caja toma el ancho de la frase completa y cada palabra aparece cuando se dice.
  - Los grupos se arman solos en `timeline/build_timeline.js`: 192 grupos, de 10 palabras o 42 caracteres como máximo, cortados por sentido.
  - En la Fase 4 se vuelven a sincronizar con la voz real, palabra por palabra.
- **Duración: opción C.**
  - Recalculé los tiempos nominales a 110 palabras/min, con las pausas marcadas: la voz termina a ≈ 9:18 y el video completo dura **9:32** con la pantalla final.
  - El tope quedó en 10:00. Actualicé los docs 00, 01, 02, 05, 06 y 07.
  - Ahora ningún cue queda comprimido.
- Nuevo render: `render/fase1_S01.mp4` (0–56.7 s, 1701 cuadros, sin cuadros negros).

---

# Fase 2 · S02 y S03 (y ajustes de Omar)

## Decisiones de Omar aplicadas
- **Duración:** mínimo 6:00 y máximo 8:00, como regla del canal.
  - Los tiempos nominales quedaron a **≈140 palabras/min**, con todas las pausas marcadas. La voz termina a ≈ 7:34 y el video completo dura **7:39**.
  - Así los subtítulos también van más rápido.
  - Los docs 00, 01, 02, 05, 06 y 07 dicen ahora «grabar a ≈135–140 palabras/min».
  - `timeline/retime_nominal.js` recalcula los tiempos a otro ritmo si hace falta.
- **Cabecera** desde el segundo 0 y **zoom a 1.3×**: aprobados.
- **MICHI respira y parpadea:**
  - Es la misma microanimación del panel del rig: respiración según el estado, cola y cabeza con movimiento muy sutil, y un parpadeo parcial de 170 ms cada 3.2–5.4 s.
  - Es determinista: no usa `Math.random`, así que dos renders salen iguales.
  - En «sorpresa» el rig congela el cuerpo, igual que en el panel.
- **Pie «Ejemplo hipotético · 1 CATPESO = 1 peso mexicano»: eliminado.** El aviso va en la descripción del video.

## S02 (taquería → acción → accionista) y S03 (empresa pública → bolsa → precio)
- **Fondo:** cambia a agua en la explicación, según la ruta del manual.
- **Tira de hilo:** va debajo de la cabecera. La palabra vigente sale en tinta y las anteriores en gris; en las anclas toda la tira pasa a tinta y se subraya.
- **Zonas:** arriba van operaciones, rótulos, preguntas y tarjetas; abajo, sobre el piso, van los objetos y las personas. Nunca se enciman.
- **Tarjetas de definición:** en petróleo («PALABRA n DE 4»), cada una ≥ 5 s: Acción, Accionista y Empresa pública (con «No es del gobierno»).
- **«BOLSA = el lugar donde se compran y venden acciones»:** rótulo ≥ 5 s, sin tarjeta.
- **Cuadrícula 10×10 sobre la taquería:**
  - El cuadrito «1 de 100» se agranda con contorno ámbar.
  - Los 20 cuadritos vendidos pasan a petróleo, con una silueta de vecino en cada uno.
- **Operaciones:** una por pantalla, primero la cuenta y luego «= resultado», que se queda quieto ≥ 1.5–2 s.
- **Personas:** siluetas grises sin rostro; Don Ramiro es la única con sombrero.
- **Pausa de predicción:** «PRECIO 1,000» con «?» durante ≥ 3 s, sin respuesta, y MICHI mira la cifra.
- **Asserts:** todas las cifras y textos de S02–S03 se comparan con el JSON y con `numeros.json`.
- **Render:** `render/fase2_S01-S03.mp4` (0–227.8 s, 6834 cuadros, sin cuadros negros).
- **Hoja de cuadros:** `render/fase2/contact_sheet_S02_S03.png`, con 16 momentos clave.

## Dudas para Omar
1. En S03, MICHI se queda **preocupado** desde «Pero hay un problema» hasta que el precio sube (≈ 75 s), porque el JSON no trae otro estado en medio. ¿Lo paso a **tranquilo** cuando aparece la tarjeta «Empresa pública» (≈ 2:30)?
2. «Sube ↑ / Baja ↓» van en texto grande arriba, en tinta (el verde y el rojo quedan solo para cifras con signo). ¿Te gusta así?

---

# Video completo (sin voz) · S01–S07

- **`render/bolsa_A_silencioso.mp4`:**
  - Formato: 7:39, 1920×1080, 30 fps, H.264, yuv420p, sin audio y con faststart.
  - Son 13 773 cuadros, sin cuadros negros.
  - Los 3 zooms a MICHI están renderizados en 4K real.
- **`render/tic_track.wav`:** pista aparte con 30 «tics», uno por cada cifra nueva. Los tiempos están en `tic_track.json`. Se regenera con `node render/render.js --tics true` y no se sube a git porque pesa 44 MB.
- **`render/bolsa_A_preview_con_tic.mp4`:** es el mismo video con el «tic» ya mezclado, solo para revisar.
- **S04 (expectativas):**
  - Ganancia de 10,000 con el zoom 2/3, seguida de la nota que explica qué es la ganancia.
  - Operación 10,000 ÷ 100, cuadrito resaltado y segunda taquería.
  - La gente piensa «¿más ganancia?»; aparece la tarjeta 4 «Expectativas».
  - Operación 15,000 ÷ 100 y el cambio 100 → 150 +50.
  - Tabla lado a lado (Antes / Se espera) cuyas filas entran al ritmo de la voz.
  - Rótulo «Cambiaron las expectativas.» y alerta «¡OJO! El 10 es un número de ejemplo.».
- **S05 (papelería):**
  - La papelería vale 50,000 y se divide en una cuadrícula de 5×10.
  - Operaciones 50,000 ÷ 50 y 5,000 ÷ 50, con la nota «la misma cuenta de antes».
  - Llega la papelería grande enfrente: «Hoy gana 5,000» y «Se espera 3,000».
  - Operaciones 3,000 ÷ 50 y 60 × 10; el precio pasa de 1,000 a 600 con −400 en rojo.
  - «¿Casino?» se tacha, y aparecen «Razón: lo que se espera» y la alerta «¡OJO! Nadie puede prometer que subirá.».
- **S06 (ya entendí):**
  - El fondo vuelve a arcilla con la escena del inicio: 1,000 → 1,500 +500.
  - Zoom 3/3 con MICHI aliviado y la respuesta a la pregunta principal.
  - Las dos ideas centrales, «Acción = …» y «Precio = …».
- **S07 (cierre):**
  - Vuelve la ficha «Papelería 1,000 → 600 −400», sin «tic».
  - Pantalla final: «Hagamos la siguiente cuenta.» se escribe palabra por palabra.
  - Botón «Sígueme para la siguiente cuenta» y @omar.vizu, con MICHI en confianza.
- **Ajustes de tiempo (una cosa nueva a la vez):**
  - Cuando dos cosas nuevas caían a menos de 0.6 s, o antes de que terminara la pausa de un resultado, retrasé la segunda: +50 en S04, op06 y op07 en S05, y las celdas de la tabla.
  - En S05, la cuenta 50,000 ÷ 50 aparece después de que la voz dice las cifras y no antes, como estaba en el JSON.

---

# v2 · Limpieza visual + narración real (prueba de 60 s)

## Voz
- **Archivo:** `voz/voz_completa.mp3` (ElevenLabs, 5:14.7).
- **Transcripción:** ElevenLabs Scribe no alcanzó por créditos (hacían falta 1,731 y había 1,516). La hice en local con sherpa-onnx: VAD silero + whisper-small, bajados de GitHub (script en `timeline/asr_sherpa.py`).
- **Alineación** (`timeline/align_voice.py`): 859 de 907 palabras del guion (94.7 %) empatan con lo que dice la voz. El resto se interpola dentro de su tramo de voz.
  - Cues con menos de 80 %: c015, c017, c023, c043 y c060. Son cuentas o preguntas cortas que Whisper oyó distinto («120.000», «100 - 20», «¿Quién»). Su tiempo cae entre las palabras vecinas, que sí están bien alineadas.
- **La narración usa el cierre ORIGINAL** («En el siguiente video vemos cómo mirar la bolsa completa… Sigue el canal… Nos vemos allá»). El video sigue a la voz: se quitó la ficha de la papelería del cierre.
- **Duración:** el video dura **5:21** (321 s = voz + pantalla final). Queda debajo del mínimo de 6:00 que pusiste; como el audio no se toca, este video usa un mínimo de 5:00.

## Reglas aplicadas (motor v2)
- **Espacio principal único:** todo texto, bloque de números o callout pasa por `main()`. Cuando entra uno, el anterior sale, así que nunca hay dos a la vez.
- **Ilustraciones** (taquería, cuadrícula, personas, dinero) como capa aparte; MICHI es la tercera. Máximo 3 capas: el barrido de las 1,284 muestras (cada 0.25 s) da **máx. 3, 0 cuadros con más**.
- **Micromovimiento de MICHI:** se apaga (respiración, cola y parpadeo) mientras una ilustración se mueve. Sus reacciones de estado sí se mantienen.
- **Avisos ¡OJO! legales:** momento propio de ≥ 2.2 s, sin otro texto antes ni después.
- **Subtítulos: opción B.** Fuera del video; `render/bolsa_A.srt` trae 178 líneas, 176 de 4 a 6 palabras, una de 3 y una de 7.

---

# v3 · Michiverso (gatitos secundarios) · Parte 1 (S01–S02)

- **Gatitos:** `assets/gatitos/extraer_gatitos.py` saca del PDF «Personajes secundarios» (v0.1) los trazos vectoriales originales.
  - Son 5 gatitos × 6 expresiones, su ficha y su objeto, todo en SVG, sin fondos ni textos y sin redibujar.
- **Reglas del documento aplicadas:**
  - Altura: 78 % de MICHI (Rayitas 86 %), sentados en el piso.
  - Máximo 2 gatitos por plano: el barrido da 2 como máximo.
  - No hablan; cambian de expresión y nunca se mueven al mismo tiempo que MICHI (`freeAt`).
- **Cabecera «CCM / BOLSA DE VALORES»:** fija todo el video, al tamaño original. El conteo de capas la reporta aparte: el contenido llega a 3 capas como máximo (MICHI + ilustración + principal).
- **Personas → gatitos.** En la cuadrícula, los 20 vecinos pasan a ser caritas de gato genéricas.
- **Reparto en la Parte 1:**
  - S01: Bosco (inversión) oyó «la bolsa subió» y pone cara de duda.
  - S02: los vecinos accionistas son Canela (ahorro, con su frasco) y Bosco; se alegran al volverse dueños.
- **Render:** `render/parte1_S01-S02_con_voz.mp4` (0:00–1:28, con voz y «tic»). Hoja de cuadros: `render/parte1/hoja_parte1.png`.

## v3.1 · Inicio conforme al audio + gatitos con el rig de MICHI
- **Inicio** (eventos e000, e000b, e001, e002, e002b en `docs/04`):
  - 0.2 s: título «¿Qué es la bolsa de valores?».
  - 3.4 s («con una taquería»): entra la taquería.
  - 4.6 s («Mira este pedacito»): la taquería se cuadricula y se resalta un pedacito.
  - 7.3 s: aparece «Ayer 1,000» con su billete.
  - 9.5 s: «Hoy 1,500 +500»; MICHI se sorprende 0.5 s antes y entra el zoom 1/3.
  - Ya no aparece ninguna cifra antes de que la voz la diga (se quitó la excepción del gancho).
- **Gatitos:** ahora son el MISMO rig de MICHI (`michi_rig.js`), recoloreado por gatito (pelaje, ojos, líneas) y con su rasgo propio encima (bufanda, gorra y mancha, lentes y cejas, collar y chapa, pañoleta, pecho, rayas).
  - Tienen las mismas orejas, la misma geometría y **los mismos 51 estados** que MICHI.
  - Muestra de los 5 gatitos en 8 estados: `render/lamina_gatitos.png`.

## v3.2 · Doña Lupe, Mango y Tigrillo · música y efectos
- **Doña Lupe (gatito nuevo, propuesta):** rig de MICHI; pelaje #8A7A68, ojos #B7D3CF, mandil papel con bolsillo petróleo. Está junto a su taquería en S02 y es accionista junto a Canela.
- **S03:**
  - Don Ramiro = **Tigrillo** (deuda: necesita dinero). Le vende su acción a **Mango** (tentación).
  - «Cualquier persona» y «muchos compradores» se muestran con siluetas de gato genéricas (rig en modo silueta, gris de apoyo, sin cara). No cuentan como personajes.
  - En el precio: Mango es la compradora (impaciente → sorpresa) y Tigrillo el vendedor (duda → alegría).
- **MICHI** pasa a «tranquilo» con la tarjeta de empresa pública (e056b).
- **Música y efectos: SINTETIZADOS en `render/audio_mix.py`** (sin muestras ni archivos de terceros, así que sin copyright ajeno). Es determinista.
  - **Música:** Do mayor, 72 bpm (Cmaj9 · Am9 · Fmaj9 · G6); pad, bajo y piano en arpegio.
  - Sube un poco de pulso en los re-enganches (S03 y S04) y se calma en S06.
  - Baja ~9 dB cuando habla la voz (ducking) y queda a −31 LUFS contra −16 de la voz.
  - **Efectos:** el motor los registra al ocurrir (`window.SFX`, `render/sfx_eventos.json`): moneda, sube, baja, pop, pasos, tarjeta, suave, pregunta, ojo, zoom, blip, cuadrícula, elige, lápiz, intro y outro. Todos suaves, sin alarmas.
  - La moneda reemplaza al «tic».
- **Render:** `render/partes1-2_S01-S03_final.mp4` (0:00–2:39, con voz, música y efectos).

- **v3.3 (decisión de Omar): sin música.** Mezcla = voz + efectos, normalizada a −16 LUFS con pico −1.5 dBTP. La música sigue disponible con `--con-musica`.

- **v3.4 · Corrección de audio:** `loudnorm` entrega 192 kHz y el script lo leía como 48 kHz, así que la voz sonaba 4 veces más lenta en las entregas v3.2 y v3.3. Ahora se re-muestrea después de `loudnorm` y hay un assert de duración contra el mp3 original. Verificado por correlación con el original: 0.98, desfase 5 ms.
