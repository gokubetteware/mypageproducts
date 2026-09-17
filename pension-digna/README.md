# ¿Cómo conseguir una pensión digna? · Presentación web

Presentación web interactiva (18 diapositivas, 16:9) construida a partir del PDF
*Cómo conseguir una pensión digna* de Skal Patrimonial · agencia exclusiva de Skandia.
El contenido, cifras, fuentes y orden narrativo son los del PDF; la ejecución visual,
las animaciones y la interacción se diseñaron de cero para proyección.

## Punto de entrada

`pension-digna/index.html`

## Cómo ejecutarla

No requiere build ni dependencias. Dos opciones:

1. Abrir `index.html` directamente en Chrome, Edge, Firefox o Safari (funciona sin
   conexión: fuentes y GSAP están incluidos en el proyecto).
2. O servirla localmente, por ejemplo:

   ```bash
   cd pension-digna
   python3 -m http.server 8080
   # http://localhost:8080
   ```

Pulsa `F` para pantalla completa antes de presentar.

## Controles

| Tecla / gesto | Acción |
| --- | --- |
| `→` `↓` `Espacio` `Enter` `PageDown` · clic · swipe izq. | Siguiente paso o diapositiva |
| `←` `↑` `Backspace` `PageUp` · swipe der. | Paso o diapositiva anterior |
| `Home` / `End` | Primera / última diapositiva |
| `F` | Pantalla completa |
| `1`–`5` (en Autoevaluación) | Marcar / desmarcar cada respuesta |
| Pasar el cursor o clic en la tabla (Lo que cuesta esperar) | Cambia las barras al 6 %, 8 % o 10 % |

El número de diapositiva y una línea de progreso aparecen en la parte inferior;
la URL guarda la posición (`#7`) para retomar donde se dejó. Al retroceder, la
diapositiva anterior se muestra completa (sin repetir su animación).

## Arquitectura

```
pension-digna/
├── index.html          Las 18 diapositivas (HTML semántico) + chrome del deck
├── css/
│   ├── tokens.css      Colores, escala tipográfica, espaciado, temas dark/light
│   ├── fonts.css       @font-face (Cormorant Garamond y Montserrat, variables)
│   ├── deck.css        Escenario 1920×1080 escalado, cabecera, pie, progreso, navegación
│   └── slides.css      Componentes compartidos y composición de cada diapositiva
├── js/
│   ├── deck.js         Motor: navegación, pasos (builds), teclado, hash, transiciones
│   ├── animate.js      Animaciones declarativas (data-anim / data-step) y contadores
│   ├── charts.js       Gráficos: waffle 10×10 y área de interés compuesto (SVG)
│   ├── slides.js       Hooks por diapositiva: portada, swap de la 03, waffles, gráfico 09,
│   │                   selector de tasa (10), morph de fórmula (14), autoevaluación (16)
│   └── main.js         Arranque (espera las fuentes)
├── assets/fonts, assets/img   Fuentes woff2, logotipo Skandia, QR de WhatsApp
└── vendor/gsap.min.js  GSAP 3.12.5
```

Principios:

- **Escenario fijo 1920×1080** escalado con `transform` para que la composición
  sea idéntica en cualquier pantalla, sin scroll ni desbordes.
- **Animación declarativa**: cada elemento indica su entrada con `data-anim`
  (`rise`, `fade`, `line`, `bar`, `bar-y`, `count`, `lines`) y su paso de
  construcción con `data-step`. Los tiempos se ajustan con `data-at` y `data-dur`.
- **Estados reversibles**: `prime()` deja la diapositiva en estado inicial,
  `settle()` en estado final; la navegación rápida mata las líneas de tiempo en curso.
- **Datos**: los valores de los gráficos provienen del propio marcado; la curva de
  interés compuesto se calcula con los supuestos que el PDF declara
  ($3,500/mes, 8 % anual neto, capitalización mensual) y las etiquetas usan las
  cifras exactas del PDF.

Para cambiar colores o tipografías edita `css/tokens.css`; para cambiar textos,
`index.html`; para cambiar tiempos, los atributos `data-at`/`data-dur` o las
duraciones por defecto en `js/animate.js`.

## Limitaciones conocidas

- Las barras de "Levanta la mano si…" reproducen las proporciones ilustrativas del
  PDF (no hay datos numéricos detrás), igual que en el original.
- El símbolo "≈" no existe en Cormorant Garamond y se resuelve con la fuente serif
  de respaldo del sistema, como ya ocurría en el PDF.
- La presentación está optimizada para 16:9; en pantallas con otra proporción se
  muestra centrada con bandas del color de fondo.
