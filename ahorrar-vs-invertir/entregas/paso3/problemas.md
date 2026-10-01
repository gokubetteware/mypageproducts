# Paso 3 · Lista de problemas · «Ahorrar vs invertir» (prueba sin audio)

Fecha: 1 oct 2026 · Tiempos: **ESTIMADOS, sin audio real** · Controles automáticos en `qa.json` (`node tools/qa.js` y `python3 tools/bandera.py entregas/paso3/bandera`).

## A. Subtítulos de prueba (lo que pediste reportar)

| Control | Resultado |
|---|---|
| Grupos que tapan a MICHI, un gatito, un objeto o el pie | **Ninguno** (118 grupos revisados cada 0.1 s) |
| Borde superior ≥ y 860 · inferior en y 1040 · x entre 520 y 1400 | Se cumple en los 118 |
| Tamaño de letra | 46 px en todos; ninguno tuvo que bajar a 42 |
| Duración mínima 1.2 s y cero encimados | Se cumple; no reescalé ningún bloque |
| Bandera `"subtitulos": false` | La capa `#capa-subtitulos` no existe en el DOM. En 60 pares de cuadros true/false, fuera de la caja no cambia ningún píxel (se tolera ruido de antialias ≤ 40/255) |

1. **Bloque 30 alargado 0.2 s.** El último grupo (118) sale en 358.2 s y el guion cierra en 5:58 (358.0 s). Dejé el bloque 30 en 346.0–358.2 s en lugar de recortar el grupo.
2. Esta capa contradice dos reglas de marca: el texto va centrado y YouTube no lleva subtítulos. Ya estaba previsto en el guion. Para el video final va `"subtitulos": false`, que es como quedó `config.json`.

## B. Contra el manual maestro o el guion

3. **Ritmo alto.** Cambios visuales por minuto (entradas, cambios de fondo, expresiones y objetos): 0:00 → 15 · 1:00 → 21 · 2:00 → 17 · 3:00 → 21 · 4:00 → 19 · 5:00 → 12. La regla pide 8 a 10. Lo que más suma: cada cifra entra en dos cortes (operación y luego resultado), las expresiones de MICHI y los gatitos cambian seguido, y en las cuentas en cadena hay dos operaciones por pantalla. Propuesta: que la operación entre completa cuando la voz dice el resultado, y quitar expresiones intermedias de los gatitos.
4. **Resultados que se ven menos de 2 s:** «50,000 = 500 × 100» (bloque 25, 1.1 s; lo reemplaza la siguiente operación), «+ − × ÷» (bloque 3, 1.7 s), «¿Cuándo los vas a necesitar?» (bloque 17, 1.9 s), y las casillas «2. El colchón» y «3. Lo que crece» (1.4 s y 1.3 s, porque se llenan al final de su bloque). Con el audio real se puede alargar la pausa o adelantar la entrada.
5. **Duración 5:58**, abajo del mínimo de 6 a 8 min del manual. Además, los re-enganches caen en 1:57 y 3:10, no cerca de 2:45 y 4:15 como pide el manual. Lo decide el guion; con el audio real puede cambiar.
6. **La cabecera entra en 0:29**, al empezar el bloque 4. El guion pide los primeros 30 s sin cabecera, así que entra 1 s antes. Puedo moverla a 0:30.
7. **Flechas «→» en el bloque 22** («Lo necesito este año → ahorro»). El manual solo permite → entre dos cifras. El texto viene así del guion y no lo cambié.
8. **Texto del pie.** El guion dice «1 CATPESO = 1 peso mexicano»; el manual maestro, «… en este ejemplo» (más de las 6 palabras que permite el pie). Usé el del guion. Cuando un bloque trae su propio pie («Tasa de ejemplo», «Ejemplo hipotético», «Si la pagas en un año», «Criterio general, no regla fija», «8 % fijo, de ejemplo»), se ve ese pie en lugar de la equivalencia, porque cabe un solo pie a la vez.
9. **Aviso de información general:** el manual lo pide cuando se habla de invertir, y el guion no lo trae en voz ni en pantalla. Va en la descripción, pero falta decidir si también sale en el pie.
10. **Marca ámbar del bloque 28:** la puse como franja debajo de «Primero» con la letra en papel. El ejemplo del manual la pone detrás de la palabra y con la letra oscura, pero así quedaba tinta sobre petróleo, que está prohibido.
11. **Escala de los objetos sin gatito:** en los bloques 2 y 3, el frasco, la maceta y la tarjeta van al 150 % de su tamaño junto al gatito, y la «maceta grande» del bloque 24 al 200 %. Lo hice para que se lean solos, pero no hay regla para esto.

## C. Assets y rig

12. **La cola de MICHI baja del piso** en tres poses del rig: Tranquilidad 2 y Satisfacción 2 (20 px), Preocupación 2 (9 px) y Curiosidad 2 (7 px). La cola se enrosca en las patas. Choca con «todos se sientan sobre la línea del piso». No toqué el rig.
13. **Falta `michi_rig.js`** como archivo suelto (el prompt del manual lo menciona). Usé el rig y las 51 expresiones que vienen dentro de `michi-panel.html`, extraídos sin cambios a `lib/`.
14. **Los gatitos no parpadean.** Son SVG fijos por expresión; solo tienen la respiración de ±1 %. Para que parpadeen habría que tener un rig de gatitos.
15. **El «frasco vacío» trae dos monedas** dibujadas en el fondo (así viene `canela_objeto.svg`). En los bloques 12 y 25 se lee como «casi vacío».
16. **Determinismo:** el estado de la escena en cada `t` es idéntico, pero Chromium a veces dibuja distinto el borde de MICHI al volver a un mismo cuadro (antialias ≤ 29/255). A la vista no se nota y no afecta la bandera.

## D. Decisiones mías para confirmar

17. **Preocupación 1 y 2:** la misma expresión «Preocupación» del panel, en sus niveles 1 y 2 (sin dibujo nuevo).
18. **Neutro entre expresiones:** 3 cuadros (0.1 s) de neutro entre dos expresiones distintas de MICHI.
19. **Bloque 15:** MICHI en neutro, porque el guion no indica expresión.
20. **Bloque 16:** el ticket del taller se muestra pagado (con palomita) junto al frasco lleno; la tarjeta no aparece.
21. **Bloque 23:** título «Ejemplos» arriba y, debajo, la caja «¡OJO!» con la aclaración.
22. **Bloque 26:** «−2,000» va en su propia línea, debajo de «4,000 − 6,000 =», porque no cabía en la mitad izquierda.
23. **Cubeta del bloque 10:** la llave sale de un tubo que baja de arriba; se ve algo suelta. Puedo apoyarla en una pared.
24. **Holgura con MICHI:** la segunda línea de operación (y 290–410) queda a unos 10 px de las orejas de MICHI en los bloques 6, 7, 13, 14 y 19. No se tocan, pero está justo.
