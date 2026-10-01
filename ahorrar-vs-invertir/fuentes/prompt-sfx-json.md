# Prompt para Claude Code · sfx.json (Cuentas Claras con MICHI)

Úsalo DESPUÉS de tener: voz.mp3 real (ElevenLabs), el guion y la hoja de contactos aprobada.

```
Ya tienes voz.mp3 (audio real de ElevenLabs), el guion y la hoja de contactos aprobada. Genera sfx.json siguiendo la sección 2b del manual maestro.

Para cada cambio visual decide qué efecto le toca según el catálogo base (transición, tarjeta de palabra, resultado de cuenta, cifra verde +, cifra roja −, caja ¡OJO!, pantalla petróleo, MICHI en sorpresa, tarjeta final; el QR no lleva sonido). Sin música.

Cada entrada lleva: id, t (segundos, tomado de timing.json del audio real), efecto, archivo, duracion_s, bloque, cambio_visual, colocacion (pausa o antes_de_palabra_clave), palabra_clave_cercana y motivo.

Reglas: máximo 1 s por efecto; pico al menos 12 dB bajo la voz; un efecto por cambio visual como máximo; nunca encima de una palabra clave; las malas noticias suenan serias, no de susto. Genera los sonidos por código (numpy/ffmpeg) en ./assets/sfx, sin descargar de sitios sin licencia.

Al final dime cuántos efectos hay por minuto y cuáles descartaste. NO renderices: entrégame sfx.json y espera mi OK.
```

## Catálogo base (manual maestro, sección 2b)
| Momento | Efecto |
|---|---|
| Transición entre bloques | whoosh suave y corto |
| Entra tarjeta de palabra | tic suave |
| Resultado de una cuenta | tick |
| Cifra que sube / buena noticia (verde, +) | campanita ascendente breve |
| Cifra que baja / mala noticia (rojo, −) | tono descendente suave |
| Caja ¡OJO! | golpe seco corto |
| Pantalla petróleo | 0.5 s de silencio y acorde suave |
| MICHI en sorpresa | pop suave |
| Tarjeta final | cierre suave |
| QR | sin sonido |
