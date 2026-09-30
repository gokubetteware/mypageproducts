# 03 · ESPECIFICACIÓN VISUAL
Video A «Qué es la bolsa de valores» · Canal «Cuentas Claras con MICHI»

> Los valores marcados como **[POR DEFECTO]** son una propuesta para que Claude Code pueda arrancar. Omar los reemplaza con su estilo definitivo en la sección 10. Si algo está vacío o se contradice, Claude Code PREGUNTA antes de construir.

## 1. Principios
- Calma: se sorprende, no se espanta. Movimientos suaves, sin gritos visuales.
- Claridad: una cosa nueva a la vez, una operación por pantalla.
- Respeto: nada que haga sentir tonto al espectador. Nada de lujo ni dinero real.
- Los cambios visuales ACOMPAÑAN a la voz; nunca la adelantan.

## 2. Lienzo y cuadros
- 1920×1080, 16:9, 30 fps. Salida H.264 (High), yuv420p.
- Márgenes seguros: 96 px a cada lado (5 %). Todo texto importante dentro.
- Sin subtítulos en esta versión.

## 3. Layout base (1920×1080)
- **Tira de hilo:** una sola línea de texto, alineada a la izquierda, en la esquina superior izquierda (x=96, y=72), alto de letra 40 px. Se va completando: «La taquería → Acciones → Accionistas → Empresa pública → Bolsa → Precio → Expectativas». La palabra vigente resaltada.
- **Zona principal (escena):** rectángulo central de ~1300×700 px para la taquería, cuadrícula, operaciones, tablas.
- **Zona MICHI:** esquina inferior derecha (~380 px de alto). En zoom se acerca a primer plano.
- **Zona de tarjetas y etiquetas:** franja inferior centrada, ancho ~1300 px, alto ~220 px.
- **Zona de operaciones:** centro de la zona principal; una operación por pantalla; cifras ≥ 96 px.
- **Pantalla final (últimos ≈14 s):** dejar libres dos zonas para elementos de final de pantalla de YouTube: (a) círculo/botón de suscripción y (b) rectángulo de video sugerido. Sobre ellas no va texto importante.

## 4. Color **[POR DEFECTO]**
| Uso | HEX |
|---|---|
| Fondo (crema; MICHI es negro y necesita fondo claro) | #F5EFE3 |
| Texto / tinta | #1E1E24 |
| MICHI (negro plano, sin grises) | #000000 |
| Acento principal (piezas de Lupe, botones) | #2F7F7A |
| Acento secundario (piezas de vecinos/compradores) | #D9683B |
| Resaltado de «el pedacito» | #F2C14E (solo como contorno/halo suave) |
| Positivo (+) | #2E9E5B |
| Negativo (−) | #D64545 |

- Verde y rojo SOLO en cifras con signo (+500, −400) y su flecha. Nada más va en verde o rojo.
- Fondo liso; sin degradados fuertes, sin ruido, sin brillos.

## 5. Tipografía **[POR DEFECTO]**
- Familia: Nunito (o Plus Jakarta Sans si Omar prefiere). Embebida localmente.
- Cifras de operación: ExtraBold, ≥ 96 px, números tabulares.
- Etiquetas y rótulos: SemiBold, ≥ 44 px.
- Tira de hilo: 40 px. Mínimo absoluto de cualquier texto: 40 px.
- Máximo 2 líneas de texto por rótulo; nada de párrafos en pantalla.

## 6. Elementos recurrentes
- **Catpeso:** moneda redonda plana con silueta de orejas de gato y «$». Nunca billetes reales. Singular para 1 («1 catpeso»), plural desde 2 («2 catpesos», «100 catpesos»).
- **Taquería de doña Lupe:** dibujo plano, sin logos ni marcas reales, con letrero «Taquería de doña Lupe» y una plancha. Al «partirse», se convierte en cuadrícula 10×10 de cuadritos iguales (100 acciones).
  - Cuadritos de Lupe: acento principal. Cuadritos vendidos a vecinos: acento secundario con silueta de persona. Cuadrito «resaltado»: contorno amarillo.
- **Segunda taquería:** silueta punteada cuando es plan; sólida cuando abre.
- **Papelería:** dibujo plano equivalente, cuadrícula 5×10 (50 acciones).
- **Siluetas de personas:** planas, sin rostro, sin rasgos que identifiquen a nadie. Don Ramiro es una silueta con sombrero, solo eso.
- **Etiqueta de valor:** cápsula redonda con la cifra y «catpesos»; es la protagonista de las escenas de precio.
- **Rótulo «Ejemplo»:** pequeño, discreto, visible siempre que haya cifras hipotéticas.
- **Íconos 1-2-3:** en S01, tres íconos simples que entran al ritmo de la voz.

## 7. Operaciones y números
- Una operación por pantalla. Aparece por pasos: la operación («100,000 ÷ 100»), luego el resultado («= 1,000»). La voz lee cada paso.
- El resultado queda QUIETO en pantalla mínimo 1.5–2 s, aunque la voz siga.
- Cada cifra nace de `timeline/numeros.json` con `assert`. Nada de cifras escritas a mano.
- Nunca un porcentaje solo: siempre traducido a pesos (en este video no hay porcentajes).
- Tablas: máximo 3 columnas y 4 filas visibles a la vez. Las filas entran por corte, al ritmo de la voz, y las anteriores se quedan.
- Lado a lado: cuando se compara, ambas cosas juntas en pantalla y cambia UNA sola variable.

## 8. Tarjetas de significado y etiquetas
- Tarjeta: palabra (72 px, ExtraBold) + una línea corta (44 px) + un ejemplo cotidiano (40 px). Franja inferior.
- Entra exactamente cuando la voz dice la palabra y permanece mínimo 5 s (si la voz sigue hablando de eso, se queda).
- Después de definir una palabra, la tira de hilo y los rótulos usan SIEMPRE la misma palabra (sin sinónimos).
- «BOLSA»: etiqueta ≥ 5 s, sin tarjeta completa (para no pasar de 4 palabras difíciles).
- Tarjeta «Empresa pública»: lleva la nota «No es del gobierno».

## 9. Movimiento, música y sonido
- Curvas suaves (`power2.inOut` o equivalente), 0.5–0.9 s por movimiento. Sin rebotes exagerados, sin shake, sin parpadeos.
- Sin whoosh ni alarmas. Único sonido: un «tic» suave al aparecer cada número. Se genera como pista aparte (`tic_track.wav`).
- Música: la aporta Omar (opcional) en `assets/musica/`. Suave y constante. Cambia de energía SIN volverse agresiva en los dos re-enganches (2:14 y 4:05 nominales).
- Toda animación es función del tiempo (`render(t)`), determinista, sin efectos aleatorios.

### MICHI
- Solo desde el rig oficial. Estados usados: **tranquilo, confiado, sorprendido, preocupado, aliviado.** Si en `michi_emotions.json` se llaman distinto, usar el equivalente y avisar.
- Mudo, sin consejos. Lo que «piensa» va en texto corto (por ejemplo «¿más ganancia?») o en voz en off.
- Reacciona MEDIO SEGUNDO ANTES de que se revele la cifra.
- Un solo MICHI en pantalla. Negro plano, sin grises.
- **Zoom a MICHI:** máximo 3 (S01 al inicio, S04 en «10,000», S06 en la respuesta final). Siempre 4K real vectorial (`deviceScaleFactor: 2` a 3840×2160 y reducción a 1080p). Etiqueta de escena: `zoom: "ZOOM MICHI — render 4K"`.

## 10. TU ESTILO (Omar rellena o reemplaza; Claude Code respeta esta sección por encima de la 4 y la 5)
- Paleta:
- Tipografía:
- Referencias visuales (enlaces o capturas):
- Qué NO quiero que se vea:
- Otros cambios:

Si esta sección queda vacía, Claude Code usa los valores POR DEFECTO de arriba.
