# Animatic de prueba · Plan de retiro («restar no es regalar»)

Animatic silencioso del short de 45 s de Cuentas Claras con MICHI. **Los tiempos son provisionales** (125 ppm, columna «Texto de voz» del guion). Cuando exista la voz real se reajustan.

| Archivo | Qué es |
|---|---|
| `animatic-ppr.html` | El animatic. No depende de nada externo (tipografías, rig de MICHI y Canela van dentro). Se abre en el navegador: espacio = reproducir o pausar; ← → = un cuadro; Shift + ← → = 1 s; botón «Zona segura» = guía de 250 px. |
| `animatic-ppr.mp4` | Lo mismo grabado: 1080 × 1920, 30 fps, 45 s, sin audio. |
| `montaje-ppr.html` · `montaje-ppr.mp4` | **Versión vigente.** Short de 45 s con montaje: gancho con la pregunta «¿Aportas 10 mil y te devuelven 10 mil?», ejemplo con monedas y etiquetas (aportación, base, reducción del impuesto), respuesta y cierre con «¿Qué condiciones debes revisar antes de aportar?». La narración para ElevenLabs va en el comentario al inicio del HTML. MP4 nativo en 2160 × 3840, 30 fps, sin audio. |
| `render.mjs` | Graba el MP4 desde el HTML (necesita Playwright y ffmpeg). Vigente en 4K: `F=montaje-ppr.html OUT=montaje-ppr.mp4 SCALE=2 WORKERS=4 node render.mjs` (`SCALE=1` = 1080 × 1920). Se detiene si una tipografía no carga. |

## Cómo reajustar con el audio real

En `montaje-ppr.html` todos los tiempos están en el bloque «Línea de tiempo», en segundos: `HEADS` (pregunta del gancho y del cierre), `FRASES` (texto de voz; `WORD` = segundos por palabra de la voz, `REVEAL` = qué tan antes aparecen las palabras), `INS` (insertos: detalles y primeros planos), `MICHI`, `CANELA`, `PANEL`, `BG`, `CHIP` («Ejemplo hipotético»), `PIE` e `IMPACTO`.

En `animatic-ppr.html` (versión anterior) las listas del bloque «Pistas de la línea de tiempo» son:

- `FRASES`: texto de voz. Cada frase tiene `segs` (segundo en que empieza y sus palabras) y `end` (cuándo se desenfoca y sale). Las palabras entran una a una cada `WORD` segundos (0.48 s = 125 ppm). En el texto: `/` = salto de línea, `~palabra` = remate en Instrument Serif itálica, `*palabra` = marcador ámbar.
- `PANEL`: cuándo entra cada panel de cifra (`PANELS` tiene su contenido y sus animaciones de entrada).
- `MICHI`: expresión de MICHI (estado del rig, nivel y si mira a la izquierda). `MICHI_HOPS`: saltos.
- `CANELA`, `CANELA_HOPS`: expresión y saltos de Canela. `COIN`: el CATPESO que mete al frasco. `JAR_WOBBLE`, `CANDADO_T`: frasco y candado.
- `BG`, `PIE`, `IMPACTO`: fondo (se abre en círculo desde el personaje), pie y pantalla de impacto.

Todo se calcula a partir del segundo, así que el MP4 sale igual a lo que se ve en el navegador.

Cambia los números, guarda y vuelve a correr `node render.mjs`.
