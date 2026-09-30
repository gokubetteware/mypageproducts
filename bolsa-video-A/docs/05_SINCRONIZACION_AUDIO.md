# 05 · SINCRONIZACIÓN DE AUDIO Y VIDEO
Cómo juntar la voz grabada por Omar con el video, con precisión de cuadro (≤ 33 ms a 30 fps).

## 1. Idea central
El video se construyó con tiempos NOMINALES (estimados). La voz real durará distinto. Por eso cada evento visual de `04_escenas.json` está atado a una FRASE de voz (`cue`) y, si hace falta, a una PALABRA de esa frase, más un desplazamiento (`off`, en segundos).

Sincronizar = averiguar cuándo dice Omar cada frase/palabra en el audio real, recalcular el tiempo de cada evento, y re-renderizar (el render es determinista, así que es barato repetirlo).

```
tiempo_evento = tiempo_real(cue, palabra) + off
```
Ejemplo: MICHI reacciona `off: -0.5` respecto a la palabra «1,500» (medio segundo antes de la cifra).

## 2. Cómo grabar (recomendaciones para Omar)
- Guion: `07_TEXTO_PARA_GRABAR_VOZ.md`. Respeta las marcas: `[pausa]` ≈ 1 s, `[pausa n s]` = n segundos, `(más lento)`, `(bajar la voz)`, `(sonrisa)`, *énfasis*.
- Formato: WAV 48 kHz, 24 bits, mono, sin compresión. Sin música ni efectos.
- Opción A (recomendada): un archivo por escena (`voz/S01.wav` … `voz/S07.wav`), con ~1 s de silencio ambiente al inicio y al final.
- Opción B: un solo archivo `voz/voz_completa.wav`.
- Si repites una frase, deja la mejor toma; no montes dos tomas con pausas raras.
- Mantén la velocidad ~105–115 palabras por minuto. Más lento a propósito.
- Guarda el original; nunca sobrescribas. Todo lo que se procese va a `voz/proc/`.

## 3. Flujo que debe ejecutar Claude Code (Fase 4)

### Paso 1 — Preparar audio
- Convierte a WAV 48 kHz mono en `voz/proc/`. Si hay un archivo por escena, concatena en orden S01→S07 añadiendo 0.3 s entre escenas y guarda el mapa de desplazamientos.
- NO recortes silencios ni cambies la velocidad de la voz.

### Paso 2 — Transcribir con tiempos por palabra
- Usa faster-whisper (modelo `large-v3` o el más grande que la máquina soporte), idioma `es`, `word_timestamps=True`. Salida: `voz/proc/voz_words.json` (lista de `{word, start, end}`).
- Si no se puede instalar, dime el error y propón alternativa (whisper-timestamped, aeneas, MFA).

### Paso 3 — Alinear cues con la transcripción
- Del guion: por cada `cue`, toma el texto hablado. Limpia marcas: quita `[…]`, `(…)`, `*…*`, minúsculas, sin acentos ni puntuación.
- Números: normaliza ambos lados a palabras en español («1,500» ↔ «mil quinientos»; «10,000» ↔ «diez mil») con `num2words(lang='es')`.
- Alinea las dos secuencias de palabras con programación dinámica (Needleman–Wunsch) o `difflib.SequenceMatcher`. El orden de los cues es fijo, así que solo se alinea hacia adelante.
- Resultado: `voz/proc/cues_reales.json` con `start` y `end` reales de cada cue y de cada palabra ancla.
- Calidad: por cada cue calcula el porcentaje de palabras alineadas. < 80 % = «revisar a mano».

### Paso 4 — INFORME DE ALINEACIÓN (obligatorio, antes de re-renderizar)
Entrega a Omar, corto:
1. Duración total real de la voz y compárala con el tope de 8:00 (480 s), incluida la pantalla final (≈14 s bajo la última frase).
2. Cues con alineación < 80 %.
3. Pausas marcadas que la voz real NO cumple (por ejemplo, `[pausa 2 s]` en c015 midió 0.8 s).
4. Silencios de más de 3 s fuera de pausas marcadas (advertencia) y de más de 5 s (error).
5. Cues cuya velocidad se sale de 95–125 palabras/min (aviso).
6. Si la duración total > 8:00, la lista de recortes sugeridos (guion, «Qué se recorta primero»). NO recortes automáticamente.
Espera el visto bueno de Omar.

### Paso 5 — Recalcular la línea de tiempo
Para cada evento de `04_escenas.json`:
`t = tiempo_real(cue[, palabra]) + off`

Aplica estas reglas en orden, en `timeline/timeline_final.json`:
1. **Números:** ninguna cifra aparece antes de que la voz la diga (excepción marcada: el gancho de S01, evento `e003`). MICHI puede adelantarse 0.5 s (`off` negativo).
2. **Resultado quieto:** tras cada resultado, se mantiene visible ≥ 1.5–2 s (según el evento). Si el siguiente evento llega antes, se RETRASA el siguiente; nunca se acorta la espera.
3. **Tarjetas de significado:** entran en la palabra y duran ≥ 5 s. Si otro evento choca, se retrasa el otro o se apila.
4. **Pausa de predicción:** ≥ 3 s con la respuesta oculta y MICHI mirando la cifra. Si la voz deja menos de 3 s, se alarga la escena en el video (mantener el cuadro) y se marca en el informe.
5. **Una cosa nueva a la vez:** dos eventos «nuevos» no pueden caer a menos de 0.6 s uno del otro; se separa el segundo.
6. **Zooms a MICHI:** máximo 3; duración según el evento; vuelven a plano general antes del siguiente número.
7. **Música:** los dos re-enganches caen en los cues indicados (`c022` y `c038`).
8. Convierte todo a cuadros: `frame = round(t × 30)`.

### Paso 6 — Re-render
- Renderiza de nuevo (mismo motor, mismo `deviceScaleFactor` en zooms).
- Regenera `tic_track.wav` con los nuevos tiempos.
- Duración del video = duración del audio (redondeada hacia arriba al siguiente cuadro). Si el video sale más corto, se congela el último cuadro; si sale más largo, avísame.

### Paso 7 — Mezcla y muxeo
Mezcla sugerida (ajustable por Omar):
- Voz: pista principal, normalizada a ≈ −16 LUFS integrados, pico ≤ −1 dBTP.
- «Tic»: −18 dB respecto a la voz.
- Música (opcional): −20 dB respecto a la voz, con ducking suave bajo la voz.
Muxeo (ejemplo):
```
ffmpeg -i render/bolsa_A_video.mp4 -i voz/proc/mezcla.wav \
  -c:v copy -c:a aac -b:a 320k -movflags +faststart \
  render/bolsa_A_final.mp4
```
Formato final: H.264 High, yuv420p, 1920×1080, 30 fps, CRF 16–18, AAC 320 kbps.

### Paso 8 — Capítulos
Genera `render/capitulos.txt` con los tiempos reales de los cues `c001`, `c008`, `c024`, `c038`, `c054`, `c061`, `c064` (nombres del guion, ver sección «Capítulos»). Mínimo 3 capítulos, cada uno ≥ 10 s, el primero en 00:00.

### Paso 9 — QA de sincronía
- Contact sheet con un cuadro en cada aparición de número, tarjeta y reacción de MICHI.
- Comprobación automática: en cada número, |t_cifra − t_palabra| ≤ 1 cuadro. Reacciones de MICHI entre 0.4 y 0.6 s antes de su cifra.
- Verificación de oído con el «tic»: debe caer en la cifra, no antes.
- Entrega `render/qa_report.md`.

## 4. Si algo no cuadra
- Regrabar UNA frase es más barato que deformar el video: dime qué cue y cómo debería sonar (por ejemplo, alargar la pausa).
- Si la voz real dura mucho más de 8:00, se aplican primero los recortes del guion; después se le pide a Omar decidir.
- Claude Code NUNCA cambia la velocidad de la voz para que quepa.
