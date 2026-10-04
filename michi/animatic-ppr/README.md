# Animatic de prueba · Plan de retiro («restar no es regalar»)

Animatic silencioso del short de 45 s de Cuentas Claras con MICHI. **Los tiempos son provisionales** (125 ppm, columna «Texto de voz» del guion). Cuando exista la voz real se reajustan.

| Archivo | Qué es |
|---|---|
| `animatic-ppr.html` | El animatic. No depende de nada externo (tipografías, rig de MICHI y Canela van dentro). Se abre en el navegador: espacio = reproducir o pausar; ← → = un cuadro; Shift + ← → = 1 s; botón «Zona segura» = guía de 250 px. |
| `animatic-ppr.mp4` | Lo mismo grabado: 1080 × 1920, 30 fps, 45 s, sin audio. |
| `render.mjs` | Vuelve a grabar el MP4 desde el HTML (`node render.mjs`, necesita Playwright y ffmpeg). Se detiene si una tipografía no carga. |

## Cómo reajustar con el audio real

Todos los tiempos están en las listas del bloque «Pistas de la línea de tiempo» dentro de `animatic-ppr.html`, en segundos:

- `VOZ`: grupos de texto de voz (1 a 3 palabras). `null` = sin grupo (la cifra la muestra el panel, o es pausa).
- `PANEL`: cuándo entra cada panel de cifra (`PANELS` tiene su contenido).
- `MICHI`: expresión de MICHI en cada momento.
- `BG`, `PIE`, `IMPACTO`, `CANDADO`: fondo, pie, pantalla de impacto y candado.

Cambia los números, guarda y vuelve a correr `node render.mjs`.
