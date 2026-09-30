# 06 · CHECKLIST DE CALIDAD (antes de publicar)
Claude Code marca cada punto con evidencia (cuadro, número, comando). Omar da el visto bueno final.

## A. Comprensión
- [ ] Ninguna palabra, cifra o idea aparece antes de explicarse.
- [ ] Nunca entran dos cosas nuevas al mismo tiempo (separación ≥ 0.6 s).
- [ ] Cada operación nueva cumple los 4 pasos: se anuncia, se muestra, queda quieta (pausa), se traduce.
- [ ] Ninguna frase con más de 2 cifras.
- [ ] Ejemplo hilo (taquería), 3 anclas, pausa de predicción, segundo ejemplo (papelería) y trampa común («¿casino?») presentes.
- [ ] Alguien que se distrajo 5 s puede retomar el hilo con la tira de hilo o la ancla.

## B. Guion y datos
- [ ] Ningún cambio al texto de la voz respecto al guion.
- [ ] Todas las cuentas de la tabla de números coinciden (asserts en verde).
- [ ] Cantidades redondas; sin porcentajes solos (aquí no hay porcentajes).
- [ ] «Ejemplo» visible donde hay cifras hipotéticas. Ningún dato real inventado.
- [ ] Cada palabra difícil tiene su tarjeta ≥ 5 s desde que se dice; «bolsa» tiene su etiqueta ≥ 5 s.
- [ ] Después de definir, se usa siempre la misma palabra.
- [ ] Todas las preguntas abiertas se responden (principal + 2 secundarias).

## C. MICHI
- [ ] Solo estados existentes en el rig oficial; mapeo de los 5 estados documentado.
- [ ] Un solo MICHI en pantalla, negro plano, sin grises.
- [ ] MICHI no habla ni da consejos.
- [ ] Reacciona ≈ 0.5 s antes de cada cifra que revela.
- [ ] Máximo 3 zooms, los 3 marcados «ZOOM MICHI — render 4K» y verificados al 100 % (bordes nítidos).

## D. Visual y sonido
- [ ] Verde y rojo solo en cifras con signo (+500, −400).
- [ ] El dinero es catpeso (singular solo para 1; plural desde 2). Cero billetes reales.
- [ ] Cero logos, saludo o intro animada en los primeros 30 s.
- [ ] Tablas ≤ 3 columnas y ≤ 4 filas visibles.
- [ ] Texto ≥ 40 px, dentro de zonas seguras; pantalla final con zonas libres para YouTube.
- [ ] Sin whoosh, alarmas ni shake. Solo el «tic» al aparecer cada número.
- [ ] Nunca aparece una cifra nueva mientras la voz explica la anterior.

## E. Técnico
- [ ] Duración total ≤ 10:00 (600 s), incluida la pantalla final.
- [ ] 1920×1080, 30 fps, H.264, yuv420p, `faststart`.
- [ ] Sin cuadros negros, sin frames duplicados por errores de captura, sin parpadeos.
- [ ] Audio sincronizado: cada cifra y tarjeta dentro de ±1 cuadro respecto a la palabra de la voz.
- [ ] Voz sin cortes bruscos ni ruidos; loudness ≈ −16 LUFS, pico ≤ −1 dBTP.
- [ ] `capitulos.txt` con tiempos reales (mínimo 3 capítulos de ≥ 10 s, el primero en 00:00).

## F. Publicación
- [ ] Título: «Qué es la bolsa de valores (explicado con una taquería)».
- [ ] Miniatura acorde a la promesa (sin flechas rojas ni alarma).
- [ ] Descripción con aviso de que los ejemplos son hipotéticos y no son recomendación de inversión.
- [ ] Pantalla final configurada en YouTube Studio (botón de seguir + siguiente video).

## G. Medición
- Retención ≥ 50 % a los 30 s frente a tus últimos 10 videos de duración similar.
- Prueba de comprensión con 3 personas sin ayuda: que expliquen la idea con sus palabras. El bloque donde se traben es el que se ralentiza o se parte.

Firma final: ____________________   Fecha: ____________
