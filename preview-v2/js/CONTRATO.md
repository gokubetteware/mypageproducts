# CONTRATO de módulos — preview-v2

Fuente de verdad del reparto del JS del preview. El original monolítico es
`original.html` (copia intacta de `index.html`, 3,641 líneas); **todas las líneas
de origen de este documento se refieren a él**. Los módulos se generaron cortando
por rangos de línea (sin re-teclear código) y agregando solo pegamento
(`import` / `export`, `window.SAPHI`, la guarda `active`). No hay refactor de
lógica ni renombres.

Regla de oro para no pisarse: **cada archivo tiene un dueño y un solo sentido de
dependencia**: `ui.js` y `sections.js` importan de `core.js`; `core.js` no importa
a nadie; `ui.js` y `sections.js` no se importan entre sí; `gl.js` y `accordion.js`
no importan nada.

---

## 1. Orden de carga (`index.html`)

| # | Qué | Tipo | Notas |
|---|-----|------|-------|
| 1 | `<script>` temprano inline (orig. 25-34) | clásico, inline | Agrega `html.js` y quita el loader a los 4 s si nada lo quitó antes. Se queda inline a propósito: debe correr antes del primer pintado. |
| 2 | `css/site.css` (orig. 37-879, **verbatim**) | `<link rel=stylesheet>` | Bloquea el render igual que el `<style>` de antes. |
| 3 | `vendor/gsap.min.js`, `ScrollTrigger`, `SplitText`, `MorphSVGPlugin`, `DrawSVGPlugin`, `Draggable`, `InertiaPlugin`, `CustomEase`, `lenis.min.js` | clásicos, al final del body | Mismo orden que el CDN del original. Publican `gsap`, `ScrollTrigger`, …, `Lenis` como globales. Sin CDN. |
| 4 | `js/main.js` | `type="module"` | Solo imports, en orden: `core.js` → `ui.js` → `sections.js`. |
| 5 | `js/gl.js` | `type="module"` | Los 4 shaders. Va después de `main.js` porque el listón lee `window.__saphiLenis`, que publica `core.js`. |
| 6 | `js/accordion.js` | `type="module"` | Acordeón de productos. Independiente. |

Los módulos son diferidos: corren después de parsear el documento y antes de
`DOMContentLoaded`; el evento `load` los espera. Por eso el `load` de `boot()`
(loader) y del refresh final se comportan igual que antes. **Requieren http(s):
con `file://` el navegador bloquea los `import`.** Se sirven con cualquier
servidor estático.

Orden de ejecución dentro de `main.js`: `core.js` (motor, observador, hero,
loader) → `ui.js` (roll, anclas, formulario, menú, cursor/imanes/preview, onda
CTA) → `sections.js` (marquesina, escritorio/móvil/reducido, refresh final).

---

## 2. `core.js` — exports

El cuerpo de `core.js` vive dentro de una IIFE (igual que el script original) para
conservar exacto el alcance de las variables; al final devuelve un objeto y el
módulo lo re-exporta. Con plan B (sin GSAP / ScrollTrigger, o con
`prefers-reduced-motion: reduce`) la IIFE devuelve solo
`{ active:false, H, reduce, killLoader }`: **el resto de los exports valen
`undefined`** y `ui.js` / `sections.js` no ejecutan nada (hacían `return` en el
original). Por eso ambos empiezan con `if (!active) return;`.

| Export | Tipo | Qué es | Origen (orig.) | Lo usan |
|--------|------|--------|----------------|---------|
| `active` | boolean | `true` si hay GSAP+ScrollTrigger y no hay movimiento reducido. **Guarda obligatoria** de todo código que use GSAP. | glue (equivale al `return` de 1497) | ui, sections |
| `H` | objeto | Capacidades detectadas: `H.gsap`, `H.ScrollTrigger`, `H.SplitText`, `H.MorphSVGPlugin`, `H.DrawSVGPlugin`, `H.Draggable`, `H.InertiaPlugin`, `H.CustomEase`, `H.Lenis` (booleanos). | 1474-1476 | ui (cursor), sections |
| `reduce` | boolean | `matchMedia('(prefers-reduced-motion: reduce)')` al cargar. (En `window.SAPHI` se llama `reduced`.) | 1478 | — |
| `loader` | Element | `#loader` | 1480 | — |
| `killLoader()` | fn | Quita el loader y `is-loading`. Idempotente. | 1482-1487 | sections (bloque reducido) |
| `lenis` | Lenis \| null | Instancia de Lenis (también `window.__saphiLenis`). | 1524-1537 | ui (menú, anclas), sections (casos) |
| `setScroll(v, immediate)` | fn | Posiciona el scroll vía Lenis (o `window.scrollTo`). | 1538-1541 | sections (casos/Draggable) |
| `heroTl` | Timeline | Timeline pausado del intro del hero; lo reproduce `boot()`. | 1688 | sections (proximidad) |
| `heroBlobs` | Element[] | `.hero-blobs .blob` (**hoy vacío**, ver §5). | 1635 | sections (parallax) |
| `haloNodes` | Element[] | `#blobDefs feDropShadow` (filtros sin uso, ver §5). | 1634 | — (lo usa el observador dentro de core) |
| `mm` | `gsap.matchMedia()` | Única instancia de matchMedia. Cada módulo registra sus contextos con `mm.add`. | 2092 | ui, sections |
| `safe(name, fn)` | fn | Aísla un efecto: si falla, `console.warn('[fx:name]')` y sigue. | 2084-2090 | ui, sections |
| `ioReveal(nodes, build)` | fn | Revelado con IntersectionObserver (móvil). Devuelve el observer. | 1824-1834 | sections |
| `splitHeading(el)` | fn | SplitText de titular con máscara + entrada por scroll. | 1808-1821 | sections |
| `makePulse(path, dur)` | fn | Clona un trazo y hace correr un paquete de luz; devuelve `start()`. | 1976-1988 | sections |
| `tokens` | objeto | `{ DARK, LIGHT, VAR }`: las paletas que interpola el motor de tema (`--bg`, `--ink`, `--ink-50`, `--ink-25`, `--line`, `--panel`, `--header-bg`). Son las únicas "tokens" que viven en JS. | 1596-1598 | — |

Funciones y variables de core que **no** se exportan (internas): `applyTheme`,
`lightProgress`, `velo`, `buildHero`, `addHeroRest`, `buildLoaderGrid`,
`revealSite`, `boot`, `header`/`navHidden`, `progressEl`, `secIndex`, `navAnchors`.
Si otro módulo las necesita, se agrega al `return` de la IIFE, al bloque de
`export` y a esta tabla en el mismo cambio.

### `window.SAPHI`

Publicado por `core.js` al final de su evaluación (existe también en plan B,
con `undefined` donde corresponda):

```js
window.SAPHI = { H, reduced, lenis, setScroll, heroTl, mm, safe,
                 io /* = ioReveal */, splitHeading, makePulse, killLoader, tokens };
```

Otras globales que ya existían y **siguen igual**: `window.__saphiLenis` (Lenis,
lo lee el listón y la onda CTA), `window.__waveDebug` (onda CTA),
`window.__agAbrir(id)` (acordeón), `window.__saphiRibbonTick` (listón).

---

## 3. Dueño de cada bloque del original

### `index.html`
| Bloque | Origen |
|--------|--------|
| `<head>` (meta, favicons, fuentes) | 1-19 y 20-24 (+ `robots noindex,nofollow` y `canonical`, nuevos) |
| Script temprano (html.js + failsafe 4 s) | 25-34 |
| Marcado del body (loader, defs SVG, header, hero, secciones, footer) | 881-1443, verbatim |
| Vendor (9 `<script src>`) | 1445-1453 → `vendor/…` |
| `<div class="scroll-ribbon">` | 3385 |

### `css/site.css`
Hoja completa: 37-879, verbatim.

### `js/core.js` (dueño: core)
| Bloque | Origen |
|--------|--------|
| Detección de capacidades `H`, `reduce`, `core`, `loader` | 1469-1480 |
| `killLoader` | 1482-1487 |
| Plan B (sin GSAP o movimiento reducido) | 1489-1498 |
| Registro de plugins, curva `gk` (CustomEase), defaults | 1500-1517 |
| Lenis, `setScroll`, `__saphiLenis` | 1519-1541 |
| Motor de tema (`DARK`/`LIGHT`, `applyTheme`, `lightProgress`) | 1587-1623 |
| Observador global (tema, grano, progreso, link activo, índice lateral, velocidad) | 1625-1670 |
| Header (borde al despegar, se esconde al bajar) | 1672-1685 |
| Intro del hero y loader (`heroTl`, `buildHero`, `addHeroRest`, `buildLoaderGrid`, `revealSite`, `boot`) | 1687-1805 |
| Helpers `splitHeading`, `ioReveal` | 1807-1834 |
| Helper `makePulse` | 1972-1988 |
| Helper `safe`, instancia `mm` | 2084-2090, 2092 |

### `js/ui.js` (dueño: ui)
| Bloque | Origen |
|--------|--------|
| `FORM_ENDPOINT` / `FORM_EMAIL` (configuración del formulario) | 1459-1467 |
| P8 anclas con latigazo | 1543-1559 |
| P3 botones roll (`buildRoll`) | 1561-1585 |
| Formulario de contacto | 1867-1935 |
| Menú móvil (`openMenu`/`closeMenu`) | 1937-1970 |
| Escritorio — G6 preview de casos que persigue al cursor | 2541-2571 |
| Escritorio — P1 spotlight + elevación de tarjetas | 2573-2588 |
| Escritorio — P2 cursor que morfea + imanes | 2590-2653 |
| Onda de CTA (IIFE independiente, con sus propias guardas `window.gsap` / reduced) | 2770-2881 |

Los tres bloques de escritorio viven ahora en un `mm.add` propio de `ui.js` con la
**misma consulta** que el de `sections.js`
(`(min-width: 901px) and (prefers-reduced-motion: no-preference)`).

### `js/sections.js` (dueño: sections)
| Bloque | Origen |
|--------|--------|
| Marquesina (M5) + timeScale por scroll | 1836-1865 |
| Demo de llamada "Sofía" (`playCall`) — **código muerto** | 1990-2077 |
| matchMedia escritorio: apertura, `.js-mask`, `.js-words`, `.js-fade` (batch), `.js-list`, `.js-draw` | 2094-2148 |
| `safe('datos')` — contadores, gráfica del día, barras, flujo | 2150-2222 |
| `safe('voz')` — huella de voz por producto | 2224-2241 |
| `safe('remates')` — `.js-punch` | 2243-2261 |
| `safe('proximidad')` — peso de letra del titular según el cursor | 2263-2302 |
| `safe('liquido-morph')` — distorsión líquida + morph de blobs | 2304-2343 |
| `safe('parallax')` — parallax, deriva orbital, aurora | 2345-2372 |
| `safe('manifiesto')` — barrido palabra por palabra + orbe | 2374-2461 |
| `safe('stack')` — productos apilados | 2463-2486 |
| `safe('casos')` — pin horizontal + Draggable | 2488-2539 |
| `safe('footer')` — wordmark gigante | 2655-2662 |
| matchMedia móvil (IntersectionObserver, cero pins) | 2668-2751 |
| matchMedia movimiento reducido | 2753-2759 |
| Refresh tras `load` y `fonts.ready` | 2761-2763 |

### `js/gl.js` (dueño: gl) — sin imports
| Shader (cada uno en su IIFE) | Origen |
|------------------------------|--------|
| Grainient por producto (un canvas por `.grainient[data-g]`) | 2885-3028 |
| Iridiscente del titular (`.hero-irid`) | 3032-3126 |
| Seda del hero (`.hero-silk`) | 3272-3383 |
| Listón de scroll (`.scroll-ribbon`, lee `window.__saphiLenis`) | 3387-3638 |

### `js/accordion.js` (dueño: accordion) — sin imports
Acordeón de productos (`#agRow`): 3129-3268.

### `js/main.js`
Solo `import './core.js'; import './ui.js'; import './sections.js';`.

---

## 4. Diferencias conocidas respecto al original (de orden y de entrega; ninguna de lógica)

1. **Módulos diferidos.** Antes los scripts corrían al leerse al final del body;
   ahora corren al terminar el parseo (antes de `DOMContentLoaded`). Observable:
   nada, salvo milisegundos en el primer pintado.
2. **Estricto en todo el JS.** Los scripts de shaders, acordeón y onda CTA eran
   "sloppy"; un módulo siempre es estricto. ESLint (`no-undef`, `no-redeclare`)
   da 0 hallazgos: ninguno asignaba a variables sin declarar.
3. **Orden entre bloques.** P8/roll/formulario/menú corren ahora *después* de
   core (hero, observadores, loader) y no antes; el `mm.add` de escritorio se
   parte en dos (UI primero, secciones después); la onda CTA corre antes del
   bloque de secciones; el acordeón corre después de los 4 shaders. Ningún
   bloque depende del orden: ninguno de los movidos crea ScrollTriggers (la
   lista de 101 triggers sale idéntica y en el mismo orden). El único que mide
   layout al iniciar es `buildMagnets` (imanes del cursor, dentro de `ui.js`), y
   sus rectángulos se vuelven a medir en cada scroll y resize.
4. **`url(#id)` en CSS externo.** `css/site.css` conserva `filter: url(#liquid)`
   y `stroke: url(#gLine)` / `url(#gLineH)` (referencias de fragmento). Las
   referencias de solo-fragmento se resuelven contra el documento en Chromium
   (verificado). **Pendiente verificar en Firefox y Safari antes de producción**:
   si alguno las resolviera contra `css/site.css`, el remedio mínimo es mover
   esas 4 reglas a un `<style>` inline o usar atributos SVG.
5. **Listeners duplicados al cruzar el breakpoint.** Igual que en el original,
   los `addEventListener` dentro de `mm.add` no se revierten al cambiar de
   breakpoint (GSAP solo revierte tweens y triggers), así que ir y volver de
   escritorio a móvil los duplica (por lectura de código; no se midió). Se
   conserva tal cual; es deuda, no regresión.
6. **Nuevo modo de falla: que `js/core.js` no baje.** El monolito no dependía
   de la red para su lógica; ahora sí. Medido: con `js/core.js` bloqueado, el
   script temprano quita el loader a los 4 s, pero todo lo marcado `.js-fade`
   queda en `opacity: 0` (`html.js .js-fade`), o sea, secciones sin texto. **No
   se corrigió** porque el encargo fija que el script temprano se queda como
   está; queda como decisión de Emmanuel. Remedio de una línea, validado en el navegador (quitar la clase
   `js` devuelve `opacity: 1` a todo): en el `setTimeout` de 4 s del script
   temprano, agregar `if (!window.SAPHI) document.documentElement.classList.remove('js');`.

---

## 5. Código muerto encontrado (conservado a propósito)

| Qué | Dónde (orig.) | Por qué está muerto |
|-----|----------------|---------------------|
| `#callCard` y sus ids `#ccWave`, `#ccStatus`, `#ccTimer`, `#ccChip`, `#ccReplay` | `playCall` + ST de `#callCard` en 1990-2077 (`sections.js`) | Ninguno existe en el HTML: `playCall` retorna en la primera línea, el ScrollTrigger de `#callCard` nunca se crea, el listener de `#ccReplay` nunca se ata. |
| `.stack-slot` / `.stack-item` | `safe('stack')` 2463-2486; `mp.closest('.stack-slot') \|\| mp` en 2234 | Ninguna clase existe en el HTML: `slots` es un arreglo vacío (no se crea ningún ScrollTrigger de apilado) y el trigger de `.mini-line path` siempre cae al propio `path`. |
| `.hero-blobs .blob` → `heroBlobs` | 1635; usos en 1654-1656 (observador, `core.js`) y 2358-2363 (deriva orbital, `sections.js`) | Los contenedores `.hero-blobs--back` / `--front` existen (HTML 1031, 1039) pero están vacíos: el arreglo es `[]` y los bucles no hacen nada. |
| `haloNodes` (`#blobDefs feDropShadow`) | 1634; escritura en 1651-1653 (observador) | Los 4 filtros `#haloMix/#haloOrange/#haloLilac/#haloGreen` existen pero ningún elemento los referencia (`filter="url(#halo…)"`): el observador reescribe `flood-opacity` en nodos que no se pintan cada vez que cambia la velocidad. |
| Bloque `mm.add('(prefers-reduced-motion: reduce)')` | 2753-2759 | Solo se alcanza si `reduce` era falso al cargar; con `reduce` verdadero el plan B ya retornó (1497) y este contexto nunca se registra. Solo corre si el usuario activa movimiento reducido con la página ya abierta. |

Ojo con el nombre: dentro de `core.js`, `core` (1479) es la bandera
`H.gsap && H.ScrollTrigger`, no el módulo.

Nada de esto se borró ni se renombró; cualquier limpieza debe hacerse como
cambio aparte, con paridad medida.
