# 01 · PROMPT MAESTRO PARA CLAUDE CODE
Proyecto: Video A «Qué es la bolsa de valores (explicado con una taquería)» · Canal «Cuentas Claras con MICHI»

## 1. Tu rol
Eres el director técnico de animación del canal. Vas a construir CON CÓDIGO un video horizontal de YouTube (16:9) SIN VOZ, con animaciones limpias, calmadas y fáciles de seguir. Después, cuando yo te entregue la voz grabada, sincronizarás video y audio con precisión de cuadro.

Meta del video: que cualquier persona, sin saber nada de bolsa, entienda a la primera vista qué es una acción y por qué su precio sube o baja. El video explica con calma; no compite por adrenalina.

## 2. Qué debes entregar
1. `render/bolsa_A_silencioso.mp4`: 1920×1080, 30 fps, H.264, sin audio, duración nominal 8:00 (máximo 8:00 incluyendo pantalla final).
2. `render/tic_track.wav`: pista de audio APARTE con el «tic» suave de cada número que aparece (generada a partir de los eventos, no horneada en el video).
3. Proyecto reproducible: `src/` (HTML + SVG + GSAP), `timeline/timeline_nominal.json`, `timeline/numeros.json`, scripts de render y `render/README.md` con los comandos exactos.
4. En la Fase 4 (cuando yo entregue la voz): `render/bolsa_A_final.mp4`, `render/capitulos.txt` con tiempos reales y `render/qa_report.md`.

## 3. Archivos que debes leer (en este orden)
1. `docs/02_GUION_MAESTRO_VIDEO_A.md`: qué se dice y qué se ve. El texto y las cifras NO se modifican.
2. `docs/03_ESPECIFICACION_VISUAL.md`: estilo, layout, reglas de animación y de MICHI.
3. `docs/04_escenas.json`: línea de tiempo estructurada (cues de voz + eventos visuales). Es tu fuente de verdad para el orden y la sincronía.
4. `docs/05_SINCRONIZACION_AUDIO.md`: cómo se sincronizará después. Diseña desde ya el motor pensando en esto.
5. `docs/06_CHECKLIST_QA.md`: revisión antes de entregar.

## 4. Reglas duras (no negociables)
- Video SIN VOZ. Sin narración sintética. No generes voz.
- No inventes datos, cifras ni ejemplos. Todo dato es del guion. Todo es ejemplo hipotético y va marcado «Ejemplo» donde lo indica el guion.
- El dinero en pantalla es el CATPESO. Nunca billetes reales. Singular solo para uno («1 catpeso»); desde dos, plural («2 catpesos», «100 catpesos»).
- MICHI sale SIEMPRE del rig oficial (`assets/michi/michi_rig.js` y `michi_emotions.json`). Nunca lo redibujes ni lo reinterpretes. Un solo MICHI en pantalla. Negro plano, sin grises. MICHI no habla ni da consejos.
- ZOOM A MICHI: máximo 3 en todo el video (S01, S04 y S06 según `04_escenas.json`), siempre en 4K real (ver sección 6).
- UNA cosa nueva a la vez. Una operación por pantalla. Nunca aparece una cifra nueva mientras la voz aún explica la anterior.
- Cada número que aparece en pantalla nace de `timeline/numeros.json` y se verifica con `assert` en código. Nada de números escritos a mano en el HTML.
- Verde y rojo SOLO en cifras con signo (+ / −).
- Sin whoosh, sin alarmas, sin shake. Solo un «tic» suave al aparecer cada número.
- Cero logo, saludo o intro animada en los primeros 30 s. Cero marcas reales.
- Tarjetas de significado: mínimo 5 s en pantalla, desde el momento en que se dice la palabra.
- Ningún silencio visual muerto: siempre hay algo a la vista (la cifra, MICHI, el resultado quieto).
- No cambies el guion. Si crees que algo falla (un número, un orden, una frase), avísame y espera mi respuesta.

## 5. Stack recomendado
- Motor: HTML + SVG + GSAP. Una `gsap.timeline({ paused: true })` maestra. Toda animación es función del tiempo: `render(t)`. Prohibido `setTimeout`, `Date.now()`, animaciones CSS autónomas o `requestAnimationFrame` libre.
- Captura: Playwright (Chromium) controlando `timeline.time(t)` cuadro por cuadro, y ffmpeg por `image2pipe` (o PNG temporales). Render determinista: mismo JSON = mismo video.
- Fuentes locales embebidas (sin CDN durante el render).
- Render en paralelo por rangos de tiempo (varios workers) si la máquina lo permite, y luego concatenar.
- Si ya tengo montado otro motor (por ejemplo Remotion) en la carpeta, dímelo y propón cuál usar; no cambies de motor sin preguntar.

## 6. ZOOM A MICHI en 4K real
- MICHI se dibuja como VECTOR desde el rig. Nunca como bitmap escalado ni como video escalado.
- Los segmentos con zoom se capturan con viewport 1920×1080 y `deviceScaleFactor: 2` (equivale a 3840×2160) y luego se reducen a 1920×1080 con ffmpeg (`scale=1920:1080:flags=lanczos`).
- Verifica un cuadro del zoom al 100 % (bordes nítidos, sin pixelado) y muéstramelo.
- Cada zoom queda marcado en `timeline_nominal.json` con `"render": "ZOOM MICHI — render 4K"`.
- Si el rig NO es vectorial (por ejemplo, son PNG), DETENTE y pregúntame.

## 7. Fases y puntos de control

### Fase 0 — Verificación (sin animar todavía)
Revisa y repórtame en una lista corta:
1. ¿Existen `assets/michi/michi_rig.js` y `michi_emotions.json`? ¿El rig es vectorial? Lista los estados que existen.
2. Mapea estos 5 estados del guion a los nombres reales del rig: tranquilo, confiado, sorprendido, preocupado, aliviado. Si alguno se llama distinto, usa el equivalente y dímelo. Si falta uno sin equivalente, PREGÚNTAME.
3. ¿Algún estado del rig usa grises (ojos, brillos, sombras)? Si sí, avísame.
4. Versiones de Node, Playwright/Chromium y ffmpeg. Si falta algo, dime el comando para instalarlo.
5. Confirma cuántos núcleos/RAM hay para decidir el render paralelo.
6. Lee `docs/03`: ¿hay campos de estilo vacíos o contradictorios? Pregúntamelos.
7. Cuenta las palabras habladas de `docs/04_escenas.json` (quitando marcas) y repórtalo. Rango objetivo: 840–920.
8. Verifica con código todas las cuentas de la tabla de números del guion.
Entrégame ese reporte y ESPERA mi «adelante».

### Fase 1 — Esqueleto y animatic
- Motor de timeline que lee `docs/04_escenas.json` y genera `timeline/timeline_nominal.json` (tiempos absolutos por evento).
- Layout base (canvas, tira de hilo, zona de MICHI, zonas seguras) según `docs/03`.
- Render de prueba de 20 s (S01 completa) con MICHI real. Muéstrame 6–8 cuadros clave (imágenes) y el mp4.
- ESPERA mi aprobación.

### Fase 2 — Escenas
- Construye S02 a S07 en orden, siguiendo `docs/04_escenas.json` evento por evento.
- Después de cada 2 escenas, entrégame una contact sheet (cuadros en los momentos clave: cada número, cada tarjeta, cada reacción de MICHI) y la lista de dudas.
- Sin aprobación no avances más de 2 escenas.

### Fase 3 — Export silencioso y QA técnico
- Render final `render/bolsa_A_silencioso.mp4` y `render/tic_track.wav`.
- Ejecuta `docs/06_CHECKLIST_QA.md` y entrega `render/qa_report.md`.
- Verifica: duración ≤ 480 s, 1920×1080, 30 fps, sin audio, sin cuadros negros, sin frames duplicados por errores de captura.

### Fase 4 — Sincronización con la voz (solo cuando yo entregue audio en `voz/`)
Sigue `docs/05_SINCRONIZACION_AUDIO.md`. Antes de re-renderizar, entrégame el INFORME DE ALINEACIÓN y espera mi visto bueno.

## 8. Cómo trabajar conmigo
- Soy directo y práctico. Reportes cortos: qué hiciste, qué evidencia hay (imágenes/mp4), qué decisión necesito de mí.
- Si algo no está claro o falta información, PREGÚNTAME antes de asumir. Cuando preguntes, dame 2–3 opciones comparadas y tu recomendación.
- Si algo no se puede hacer como pide el documento, dilo de inmediato y propón la alternativa más simple.
- No entregues «terminado» sin evidencia visual (cuadros) y sin haber corrido los `assert` de números.
- Un cambio a la vez cuando me muestres correcciones: dime exactamente qué cambió.

## 9. Definición de terminado
El video está listo cuando:
1. Todas las escenas S01–S07 existen y siguen `04_escenas.json`.
2. Todas las cifras coinciden con la tabla de números del guion (asserts en verde).
3. Los 4 conceptos difíciles (acción, accionista, empresa pública, expectativas) tienen su tarjeta ≥ 5 s. «Bolsa» tiene su etiqueta ≥ 5 s.
4. Solo hay 3 zooms a MICHI, los 3 en 4K real.
5. La duración total es ≤ 8:00 y, tras la Fase 4, el video queda alineado a la voz real con tolerancia ≤ 1 cuadro (33 ms) en cada número y tarjeta.
6. `06_CHECKLIST_QA.md` está completo y firmado por mí.
