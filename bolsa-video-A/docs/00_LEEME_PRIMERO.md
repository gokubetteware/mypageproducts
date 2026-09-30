# 00 · LÉEME PRIMERO — Paquete para Claude Code
Video A: «Qué es la bolsa de valores (explicado con una taquería)»
Canal: Cuentas Claras con MICHI · Formato YouTube 16:9 · Video SIN VOZ (la voz se graba aparte y se sincroniza después)

## Qué contiene el paquete

| Archivo | Para qué sirve |
|---|---|
| 01_PROMPT_CLAUDE_CODE.md | Instrucciones maestras: qué construir, con qué stack, en qué fases y con qué reglas. |
| 02_GUION_MAESTRO_VIDEO_A.md | El guion completo (voz + visual), números verificados, tarjetas de significado, capítulos y descripción. |
| 03_ESPECIFICACION_VISUAL.md | Estilo, colores, tipografía, zonas seguras, reglas de animación y de MICHI. Aquí pones TU estilo. |
| 04_escenas.json | La línea de tiempo en formato máquina: frases de voz (cues) y eventos visuales atados a esas frases. |
| 05_SINCRONIZACION_AUDIO.md | Cómo juntar tu voz con el video de forma precisa (transcripción con tiempos + re-render). |
| 06_CHECKLIST_QA.md | Revisión final antes de publicar. |
| 07_TEXTO_PARA_GRABAR_VOZ.md | Solo lo que Omar tiene que decir, limpio y con marcas de lectura, para grabar. |

## Estructura de carpeta recomendada

```
bolsa-video-A/
  docs/                      <- pon aquí los archivos 00 a 07
  assets/
    michi/
      michi_rig.js           <- TU rig oficial (obligatorio)
      michi_emotions.json    <- TU archivo de estados (obligatorio)
    musica/                  <- opcional
  voz/                       <- aquí va tu audio cuando lo tengas
  render/                    <- Claude Code escribe aquí
```

## Pasos

1. Crea la carpeta y copia los archivos como se ve arriba. Copia tu rig de MICHI a `assets/michi/`.
2. Abre Claude Code dentro de `bolsa-video-A/`.
3. Pega EXACTAMENTE este prompt:

```
Lee completo docs/01_PROMPT_CLAUDE_CODE.md y síguelo al pie de la letra.
Después lee docs/02, docs/03, docs/04 y docs/05 en ese orden.
Empieza SOLO por la Fase 0 (verificación). No pases a la Fase 1 hasta que yo te confirme.
Si algo no está claro, pregúntame antes de asumir.
```

4. Cuando Claude Code te entregue el video silencioso y lo apruebes, graba la voz con `07_TEXTO_PARA_GRABAR_VOZ.md`.
5. Deja el audio en `voz/` y pega este prompt:

```
Ya tengo la voz en voz/. Ejecuta la Fase 4 de docs/01_PROMPT_CLAUDE_CODE.md
siguiendo docs/05_SINCRONIZACION_AUDIO.md. Reporta primero el informe de alineación
antes de re-renderizar.
```

## Importante

- Los tiempos del guion son una ESTIMACIÓN (≈105–115 palabras por minuto). Manda tu voz real; el video se reajusta a ella.
- Duración (decisión de Omar, opción C): nominal ≈ 9:30; tope 10:00 en total (incluye la pantalla final).
- Si Claude Code te hace una pregunta, contéstala: es mejor que asumir.
