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

## 0. v2 · núcleo (VIGENTE: manda sobre §1, §2 y §4 donde se contradigan)

Lo que sigue lo escribió el dueño de `core.js`, `css/motion.css`, `index.html` y este archivo. Los demás módulos lo leen y solo se salen de él avisándolo en su informe. Las secciones 1 a 5 describen el **port original** (paridad con `original.html`); siguen siendo útiles para saber de dónde viene cada bloque, pero el comportamiento de plan B, la lista de exports vacíos con `reduce` y el modo de falla de §4.6 **ya no son así**.

### 0.1 Reglas nuevas para todos

1. **Ya no existe «plan B por `return`».** `core.js` exporta siempre lo mismo, con valores neutros cuando no hay GSAP o hay movimiento reducido. **`ui.js` y `sections.js` NO deben abortar** con `reduce` ni sin GSAP: su parte básica (menú, formulario, anclas, tema, estados) corre siempre; solo el movimiento se condiciona:

   ```js
   import { mode, mm, lenis, safe /* … */ } from './core.js';
   (function () {
     /* 1. BÁSICO, siempre: no usa gsap, ni lenis, ni mm */
     initMenu(); initForm(); initAnchors();
     /* 2. MOVIMIENTO, solo con GSAP y sin reduce */
     if (!mode.motion) return;
     mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => { … });
   })();
   ```
   `active` sigue exportándose, pero es un **alias de `mode.motion`** (no se use para decidir lo básico). Esa guarda era la causa raíz de los dos P0 de accesibilidad [04, P0-1 y P0-2].
2. **Tokens únicos.** Todo valor de tiempo, curva, distancia, stagger o umbral sale de `--m-*` (CSS) o del objeto `M` (JS). Prohibido en JS y en CSS de movimiento: `elastic`, `back`, `bounce`, la curva `gk`, números de duración sueltos.
3. **`will-change` solo en vuelo.** `motion.css` anula los estáticos de `site.css`; si hace falta, ponlo al empezar a animar y quítalo al terminar.
4. **Bucles solo por `SAPHI.ambient()`** (GSAP, WAAPI o WebGL) o por `[data-ambient]` (CSS). Nada crea `repeat:-1` ni `requestAnimationFrame` perpetuos por su cuenta.
5. **Llegadas por `.m-arrive`** (CSS + un IO); ScrollTrigger solo para `scrub` y `pin`.
6. **Contenido visible por defecto.** Los estados ocultos viven bajo `html.js`; si `core.js` no arranca, el script temprano quita `js` a los 4 s y todo se ve.

### 0.2 Modos

`export const mode` (el mismo objeto en `window.SAPHI.mode`):

| Campo | Significa | Cuándo es `true` |
|---|---|---|
| `mode.gsap` | hay motor de animación | `gsap` y `ScrollTrigger` cargaron |
| `mode.reduced` | movimiento reducido | `prefers-reduced-motion: reduce` (**se actualiza en vivo**; evento `saphi:mode`) |
| `mode.motion` | se puede mover | `gsap && !reduced` |

`export const reduce` conserva el valor **al cargar** (boolean). Qué valen los exports en cada modo:

| Export | Con movimiento | Con `reduce` (hay GSAP) | Sin GSAP |
|---|---|---|---|
| `H`, `M`, `stag`, `mode`, `tokens`, `safe`, `loader`, `killLoader`, `arrive`, `ambient`, `counters`, `ioReveal`, `headerApi` | reales | reales | reales |
| `lenis` | instancia | `null` | `null` |
| `setScroll(v, immediate)` | Lenis | `window.scrollTo` | `window.scrollTo` |
| `mm` | `gsap.matchMedia()` | `gsap.matchMedia()` | **sustituto inerte** `{add(){return null}, revert(){}, kill(){}}` |
| `heroTl` | timeline del intro (pausado hasta que arranca) | timeline vacío | **sustituto inerte** (`isActive()` → `false`, `progress()` → `1`) |
| `splitHeading(el)` | SplitText por línea | SplitText por línea (úsese solo bajo `mode.motion`) | `null` |
| `makePulse(path, dur, opts)` | función `start()` | función `start()` | `null` |
| `heroBlobs`, `haloNodes` | `[]` (código muerto conservado por contrato) | `[]` | `[]` |

Con `reduce` **GSAP existe** (plugins registrados, curvas definidas) pero ningún módulo debe animar espacio; sin GSAP `window.gsap` no existe: no lo uses en la parte básica.

### 0.3 `core.js` — exports

| Export | Qué es |
|---|---|
| `H` | capacidades: `H.gsap`, `H.ScrollTrigger`, `H.SplitText`, `H.MorphSVGPlugin`, `H.DrawSVGPlugin`, `H.Draggable`, `H.InertiaPlugin`, `H.CustomEase`, `H.Lenis` |
| `mode`, `active`, `reduce` | ver 0.2 |
| `M` | tokens en JS (0.4) |
| `stag(n, each?)` | `{ each }` tope: `min(each, M.stagger.max / (n-1))`. `each` por defecto `M.stagger.each`. Úsese como `stagger: stag(items.length, M.stagger.words)` |
| `ambient(host, fuente, {margin})` | bucle gobernado por visibilidad (0.5) |
| `arrive(destino?)` | IO de llegadas (0.6) |
| `counters` | `{run(el), final(scope), watch(scope)}` (0.7) |
| `loader`, `killLoader()` | `#loader` y su retiro (fundido de `--m-dur-base`; el nodo queda con `display:none`, vacío); idempotente |
| `lenis`, `setScroll` | ver 0.2 |
| `heroTl` | timeline del intro: `heroTl.isActive()` es `true` mientras corre; `progress(1)` lo salta |
| `mm`, `safe(name, fn)` | igual que antes |
| `ioReveal(nodos, build)` | revelado por IO, API heredada (usa `M.io.revealMargin`) |
| `splitHeading(el)` | **cambió**: máscara por **línea** (antes por letra), entra una vez al llegar (IO, no ScrollTrigger), `M.dur.reveal` + `saphi`, `stagger` por `stag(líneas, M.stagger.lines)`; `autoSplit` + `onSplit` (se rehace solo si carga la fuente). Ya no crea `.char` ni `.word` |
| `makePulse(path, dur, opts?)` | clona el trazo y corre un paquete de luz. **Cambió**: `start()` devuelve el handle de `ambient()` (el bucle se pausa fuera de pantalla). `opts.once = true` → UNA pasada (devuelve el timeline) |
| `headerApi` | `{show(), hide(), hold(ms)}`; `hold` mantiene visible el header durante `ms` (viaje a un ancla) |
| `tokens` | `{DARK, LIGHT, VAR}`: paletas del motor de tema (ahora con `--header-bg` a .92) |
| `heroBlobs`, `haloNodes` | `[]`, ver 0.2 |

### 0.4 `window.SAPHI`

```js
window.SAPHI = { M, stag, ambient, arrive, counters, mode, tokens,
                 H, setScroll, heroTl, mm, safe, io /* = ioReveal */, splitHeading, makePulse,
                 killLoader, header /* = headerApi */,
                 get section(), get reduced(), get lenis() };
```
`SAPHI.section` es la sección activa (`'top' | 'manifiesto' | 'voz' | 'casos' | 'proceso' | 'contacto'`). `window.__saphiLenis` y las demás globales de §2 siguen igual. Lo lee `gl.js` (sin imports): `SAPHI.M`, `SAPHI.ambient`, `SAPHI.mode`.

**El objeto `M`** (se lee de `css/motion.css` al arrancar; los valores de respaldo son idénticos; la prueba T-1 verifica la paridad de 32 valores):

| `M.…` | Token | Valor |
|---|---|---|
| `dur.fast / base / enter / layout / reveal / focal / ring / count` | `--m-dur-*` | 0.12 / 0.18 / 0.28 / 0.44 / 0.64 / 0.8 / 1.1 / 0.9 s |
| `dur.exit` | `--m-exit` | .6 (salida = .6 × entrada) |
| `dist.d1 / d2 / d3 / lift / press` | `--m-dist-*`, `--m-lift`, `--m-press` | 12 / 16 / 24 / −6 px / .97 |
| `ease.brand / exit / cine / state` | `--m-ease*` | `'saphi'`, `'saphiExit'`, `'saphiCine'`, `'power1.out'` (con `CustomEase`; sin él, `power3.out` / `power2.in` / `power3.inOut`) |
| `ease.bezier.brand / exit / cine` | idem | `".2,.7,.2,1"`, `".4,0,1,1"`, `".7,0,.15,1"` |
| `stagger.each / words / lines / max / beat` | `--m-stagger-*`, `--m-beat` | 0.04 / 0.06 / 0.08 / 0.24 / 0.28 s |
| `io.revealMargin / ambientMargin` | `--m-reveal-margin`, `--m-ambient-margin` | `'-12%'`, `'120px'` |
| `intent.delay / sweep / speed` | `--m-intent*` | 90 / 140 ms, .6 px/ms |
| `nav.hideAfter / hideDelta / showDelta` | `--m-hide-*`, `--m-show-delta` | 320 / 24 / 8 px |
| `magnet.r / k` | `--m-magnet-*` | 120 px / .3 |
| `scrub` | `--m-scrub` | .4 |
| `ambient.idle / marquee` | `--m-ambient-idle`, `--m-marquee` | 1500 ms / 40 s |
| `travel.min / max` | `--m-travel-*` | 0.7 / 1.6 s |

Con `reduce`, el CSS pone las distancias en 0 y las duraciones largas en `--m-dur-base`; como `M` lee el CSS, **ya viene reducido** (no hay que volver a decidirlo). `gsap.defaults()` = `{ ease: saphi, duration: M.dur.reveal }`. Curvas registradas: `saphi`, `saphiExit`, `saphiCine` (`saphi(.5)` = 0.929). `--m-dur-count` es el único token que **no** está en la especificación B.1 (los contadores necesitaban 900 ms sin número suelto).

### 0.5 `ambient(host, fuente, opt)` — bucles

| Argumento | |
|---|---|
| `host` | Element cuya visibilidad gobierna el bucle (`IntersectionObserver` con `M.io.ambientMargin`); `null` = solo pestaña |
| `fuente` | **función** que CREA el bucle y devuelve algo con `play()/pause()` (tween/timeline de GSAP, `Animation` de WAAPI) o `start()/stop()` (WebGL). Se llama **perezosamente** la primera vez que el host es visible y **nunca con `reduce`**. También vale pasar el propio objeto `{start, stop}`. Sin `fuente`: bucle CSS, solo conmuta `.is-live` en `host` |
| devuelve | `{ start(), stop(), destroy(), live, running, instance }`. `start/stop` son el interruptor manual (el bucle solo corre si además es visible, la pestaña está visible y no hay `reduce`) |

Condición de marcha: `enabled && visible && !document.hidden && !mode.reduced`. Cambios de pestaña y de preferencia se reevalúan solos. `ambient.css(scope?)` observa los `[data-ambient]` nuevos (core ya lo llama una vez al cargar).

```js
// WebGL (gl.js, sin imports): SAPHI.ambient(canvasHost, { start: loop.start, stop: loop.stop });
// GSAP:  SAPHI.ambient(el, () => gsap.to(el, { rotate: 360, duration: 31, ease: 'none', repeat: -1 }));
// CSS:   <div data-ambient>…</div>   (el CSS ya pausa su animación hasta .is-live)
```

### 0.6 `arrive()` — llegadas

- Marcado: `class="m-arrive"` (+ `m-arrive--1` para 12 px, `m-arrive--3` para 24 px). CSS (`motion.css`): oculto bajo `html.js`, `transition` de `--m-dur-enter`, retraso `min(--m-i, 6) × --m-stagger-each`.
- `arrive()` observa todos los `.m-arrive` del documento (core lo llama al cargar); `arrive(elemento)` también los añadidos después. Pone `.m-in` al llegar (`rootMargin` inferior `--m-reveal-margin`, uno solo para todos).
- `--m-i`: si el nodo ya trae `--m-i` en su `style`, **manda**; si no, se asigna **al revelar** según su orden entre hermanos que entran en el mismo lote (0, 1, 2…, tope 6). Así una lista que entra junta se escalona y un elemento suelto no espera.
- `data-arrive="manual"`: el IO lo ignora; lo revela quien lo dirige con `arrive.reveal(el, rank?)` (los elementos del hero los revela el intro).
- Si un salto de scroll deja nodos por encima del viewport sin revelar, una pasada al quedar quieto el scroll (220 ms) los revela. Es la única lectura de geometría de las llegadas y no ocurre por tick.

### 0.7 Contadores, tema, sección activa, header, progreso

- **Contadores: los lleva core.** Todo `[data-count]` (`data-suffix` opcional): los del hero los dispara el intro (a +0.21 s de la respuesta 2), los demás un IO al llegar; `--m-dur-count` con `saphi`; con `reduce` o sin GSAP, valor final de golpe. **`sections.js` debe borrar los suyos** (`gsap.utils.toArray('[data-count]')` y los de `ioReveal(counters…)`): si no, dos animaciones escriben el mismo `textContent` a la vez y el número parpadea. `font-variant-numeric: tabular-nums` ya viene en `motion.css`.
- **Tema:** mismo motor (un escalar L → 7 variables en `:root`), pero con geometría cacheada (`measure()` en refresh / resize / `fonts.ready` / cambio de alto del documento) y mezcla de color propia: **funciona sin GSAP y con `reduce`**. Ya no escribe `--grain-op`, ni `flood-opacity`, ni lee geometría por tick.
- **Sección activa:** un IO (`rootMargin: -45% 0px -54% 0px`) sobre `main [data-sec]`. Pone `.on` en `.sec-index i`, `.active` en `.nav-links a` y `aria-current="true"` en `.nav-links a` y `.ov-item` (para `voz` marca el enlace del panel abierto del acordeón: `.ag-panel[aria-current="true"]`, se reevalúa con `ag:active`). `.nav-links` es `display:none` en todos los anchos; el atributo sirve al menú abierto.
- **Header:** clase `.is-hidden` (CSS: `transform` con `--m-dur-layout` y `--m-ease`; salida `× --m-exit` con `--m-ease-exit`); se esconde tras 320 px y 24 px acumulados hacia abajo, vuelve con 8 px hacia arriba; **nunca** con foco dentro (`:focus-within` y comprobación en JS), con el menú abierto (`#navOverlay.open`), con `reduce`, ni durante `SAPHI.header.hold(ms)`. Clase `.stuck` a 40 px. **Sin `backdrop-filter`.**
- **Progreso:** `#progress` por `gsap.quickSetter(…, 'scaleX')` (escritura directa sin GSAP).

### 0.8 Clases de `<html>`

| Clase | La pone | Significa |
|---|---|---|
| `js` | script temprano (inline) | JS habilitado; solo bajo ella existen estados ocultos. Se **quita** a los 4 s si no hay `m-ready` |
| `m-ready` | `core.js`, al evaluarse | el núcleo tomó el control (el script temprano no quita `js`) |
| `m-reduced` | core | `prefers-reduced-motion: reduce` (en vivo) |
| `m-nogsap` | core | sin GSAP/ScrollTrigger: `motion.css` deja el contenido visible y el acordeón en lista |
| `m-intro` | core | mientras corre el intro (el hero recorta el anillo con `overflow: clip`). Quien dibuja WebGL en el hero puede esperar a que se vaya |
| `m-hero-in` | core | el titular se libera (antes está en `opacity:0`) |
| `m-hero-done` | core | el intro terminó o se saltó |
| `lenis`, `lenis-smooth`, … | Lenis | igual que antes |

### 0.9 Eventos

| Evento (en `document`) | Lo emite | `detail` |
|---|---|---|
| `saphi:section` | core | `{ id }` al cambiar la sección activa |
| `saphi:intro-done` | core | — al terminar o saltarse el intro; 60 ms después core hace **un** `ScrollTrigger.refresh()` para que lo que cachea geometría en `'refresh'` (peso por letra del titular) la vea con el titular asentado |
| `saphi:mode` | core | `{ reduced, motion }` cuando cambia la preferencia con la página abierta (core ya destruyó Lenis y saltó el intro; los bucles `ambient()` se pausan solos; volver a movimiento exige recargar) |
| `ag:active` | **accordion** | core lo **escucha** solo para refrescar `aria-current` del enlace de producto; no lee `detail` (recomendado `{ id, index }`) |

### 0.10 Contratos CSS (`css/motion.css` y las cuatro hojas vacías)

Orden de carga en `index.html`: `site.css` → `motion.css` → `motion-ui.css` → `motion-sections.css` → `motion-accordion.css` → `motion-gl.css`. Cada dueño edita **solo** la suya; `motion.css` es del núcleo. Todas ganan a `site.css` por orden (misma especificidad).

| Contrato | Qué hace |
|---|---|
| `--m-*` | tokens (0.4); con `reduce` las distancias valen 0 y las duraciones largas = `--m-dur-base` |
| `.m-arrive`, `--1`, `--3`, `.m-in`, `--m-i` | 0.6 |
| `.m-ring` | el anillo de «sonar»: `position:absolute`, `border: 2px var(--m-ring-color, var(--ink))`, `--ring-size` (900 px; 640 en ≤760), `opacity:0; transform:scale(.12)`; **sin `will-change` fijo** (GSAP promueve la capa al animar); `display:none` con `reduce`. Variantes: `.m-ring--mark` (marca de las 23:07, `left:94.25%; top:18.67%` dentro de `#chartPlot`) y `.m-ring--step` (paso del flujo, dentro de cada `.flow-step`, que ya es `position:relative`) |
| `[data-ambient]` / `.is-live` | las animaciones CSS del nodo, de sus descendientes y de sus pseudoelementos están **pausadas** salvo con `.is-live`; core lo pone cuando el nodo es visible, la pestaña está visible y no hay `reduce` |
| `data-sec` | atributo de sección (0.11) |
| `header.is-hidden`, `header.stuck` | 0.7 |
| `.cf-cell`, `.cf-err` | formulario (0.11); `.cf-err:not(:empty)` añade 6 px, vacío no ocupa nada |
| Foco | `:where(a, button, [tabindex]):focus-visible { outline: 2px solid transparent; box-shadow: var(--m-focus) }` (doble anillo `--bg`/`--ink`; el outline transparente se ve en alto contraste). `.ag-panel:focus-visible` también (en `site.css` apuntaba a `--lila`, que no existe). Los campos del formulario quedan fuera: los resuelve `motion-ui.css` |
| `will-change` | `motion.css` pone `auto` a las reglas estáticas de `site.css` (`.word, .char, .blob, .au, .marquee-track, .cases-track, .ov-*, #preview, #waveFx, .ag-panel, .ag-media, header…`). Quien necesite promover una capa lo hace en vuelo (inline) |
| Efectos retirados | `.grain` (`display:none`), `backdrop-filter` del header, aurora (`display:none`), `.grad-shine .char` (sin animación) |
| `body.is-loading` | ya **no bloquea** el scroll (sin JS la página se recorre; el intro se salta con cualquier gesto) |
| Movimiento reducido | **sustituye** al `* { transition-duration: .01ms !important }` de `site.css`: transiciones solo de `color, background-color, border-color, outline-color, text-decoration-color, opacity, box-shadow, fill, stroke, -webkit-text-fill-color` a `--m-dur-base`, sin retraso (`!important`; **no se transiciona `transform`**); `[data-ambient]` sin animación; `.m-ring` oculto; `.manifesto { height:auto }`; Casos como carril de scroll nativo. Si tu módulo necesita otra cosa con `reduce`, usa `!important` más específico en tu hoja |
| `html.m-nogsap` | contenido visible: `.js-fade`/`.js-words` a opacidad 1, manifiesto sin sticky, barras llenas, Casos con scroll nativo, acordeón en lista |
| Aliases viejos | `site.css` conserva reglas muertas (`.grain`, `.lo-px`, `.hero-aurora`…); no se borran aquí (G-26) |

### 0.11 Marcado nuevo en `index.html` (dueño único: núcleo)

| Qué | Detalle |
|---|---|
| Fuentes | `<link rel="preload" as="style" data-fonts … onload="this.onload=null;this.rel='stylesheet'" onerror="this.setAttribute('data-err','1')">` + `<noscript>` de respaldo. `font-display:swap` ya está en la URL. core espera a las fuentes **máximo hasta 1,200 ms desde el inicio de la navegación** antes del intro (`onerror` deja una marca para que no espere de más) |
| Script temprano | añade `js`; a los 4 s: `if (!html.m-ready) quita js`, y retira el loader si nadie lo hizo |
| Hojas | las 6 de 0.10 |
| `#loader` | un `div` sólido vacío, `aria-hidden` (sin `#loPx` ni los 345 `<i>`). `data-done` lo desvanece |
| Nodos eliminados | `.grain`, `.hero-blobs--back/--front` (vacíos), los 4 filtros `halo*` de `#blobDefs` (nadie los referenciaba). **Se conservan** `.hero-aurora` (display:none) y todo lo que `sections.js` aún toca, hasta que su dueño lo retire |
| Hero | `<span class="m-ring" id="heroRing" aria-hidden>` dentro de `.hero-inner`; `.hero-sub`, `.hero-cta`, los 4 `.hero-meta > div` y `.scroll-cue` son `.m-arrive.m-arrive--1[data-arrive="manual"]` con `--m-i` 0, 0, 0–3, 4 (ya **no** llevan `js-hero`; `.scroll-cue` lleva `data-ambient`). `#heroDisplay` queda **partido en `.word-mask > .word > .char` desde la evaluación de core** (solo con movimiento) y oculto por CSS hasta `html.m-hero-in`: `ui.js`/`sections.js` pueden buscar `#heroDisplay .char` al evaluarse (el peso por letra funciona), pero su geometría solo es fiable tras `saphi:intro-done` |
| `data-sec` | `hero`, `.marquee-band` y `#datos` → `top`; `#manifiesto` → `manifiesto`; `#productos` → `voz`; `#casos` → `casos`; `#proceso` → `proceso`; `#contacto` → `contacto` (los ids de `.sec-index i[data-sec]`). El pie no lleva |
| Acordeón | los hijos de cada `.ag-body .tool-content` **ya no llevan** `js-fade`, `js-mask`, `js-list` ni `js-punch`; cada uno lleva `style="--i:N"` por posición (mini-onda 0, estado 1, categoría 2, título 3, descripción 4, lista 5, remate 6 si existe, enlace 7, o 6 si no hay remate). Los `.tag-status` «En producción» llevan `data-ambient` (las barras `eq` solo corren con el acordeón visible). **Pendiente del dueño del acordeón:** los remates `.punch` ahora son texto plano (no hay `.char` que brillen) en `--ink`; elegir su color en `motion-accordion.css` |
| Datos | `.chart-card` envuelve el `svg#chartA` en `<div class="chart-plot" id="chartPlot">` (misma caja) y añade `#markRing` (`.m-ring--mark`); cada `.flow-step` empieza con un `.m-ring--step`; `.bf-sof` lleva `data-ambient` |
| Casos | `h2#casosTitulo`; `#casesViewport` → `role="region" aria-labelledby="casosTitulo" tabindex="0"` (sections.js: flechas ←/→ y quitar el tab stop si no hay teclado) |
| Formulario | cada campo obligatorio vive en `<div class="cf-cell">` con su `<p class="cf-err" id="err-nombre|err-whatsapp|err-correo|err-consent" role="alert">` vacío, y el `input` trae `aria-describedby` a ese id. `#cfMsg` (`role="status" aria-live="polite"`) se conserva para «Enviando…», éxito y errores de red. **Falta (ui.js):** poner `aria-invalid` y escribir el texto en `#err-*` |
| Textos nuevos | ninguno |

### 0.12 Qué le toca a cada dueño (resumen)

- **`ui.js`**: quitar `if (!active) return;`; menú, formulario y anclas fuera de la guarda (nada de `gsap` en lo básico; con `reduce` se abre con clase y fundido de opacidad); usar `#err-*`; quitar `'gk'` y `'elastic.out'`; anclas con `SAPHI.header.hold(ms)`; el cursor propio se crea solo con `mode.motion`.
- **`sections.js`**: quitar `if (!active) return;` (envolver solo los bloques con GSAP en `mode.motion`); **borrar los contadores** (los lleva core); `makePulse` ya se gobierna sola (usar `{once:true}` para una pasada); `splitHeading` ya es por línea; quitar `back.out(2)`; los remates ya no se parten; `.js-fade`/`.js-words` se pueden pasar a `.m-arrive` desde JS (`el.classList.add('m-arrive'); SAPHI.arrive(el)`) o pedirle al núcleo que lo haga en el marcado.
- **`gl.js`**: usar `SAPHI.ambient(host, {start, stop})` en vez de IO propios; no dibujar la iridiscente mientras `html.m-intro`; con `mode.reduced`, un cuadro estático y **cero contextos**.
- **`accordion.js`**: emitir `ag:active` (en `document`, `detail: { id, index }`); `--i` y `data-ambient` ya están en el marcado; pausar las barras `eq` de los paneles cerrados con CSS.

### 0.13 Pruebas (en `scratchpad/tools/`)

`found-sync.sh` arma `scratchpad/v2-found/` con los archivos del núcleo y los demás módulos **tal como estaban en el último commit**, para medir sin contaminarse con el trabajo en curso. Luego: `found-load.cjs` (consola, exports, paridad de tokens T-1), `found-hero.cjs` (intro: hitos desde `load`, `html.m-intro` y la navegación; capturas con `--frames`), `found-checks.cjs` (`skip` T-10, `scroll`, `func`, `reduced`, `nogsap`, `mobile`, `nojs`), `found-unit.cjs` (`ambient`, `arrive`, `counters`, `heading`, `failsafe`, `ui-noguard`), `found-fonts.cjs`, `found-layout.cjs` (23 geometrías idénticas al original), `perf.cjs` + `found-perfcmp.py`. Resultados en `reports/06-fundacion.md`.

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

> **Obsoleto en v2.** Esta sección describe el port original. Los exports y `window.SAPHI` vigentes están en §0.3 y §0.4; ya no hay plan B por `return`.

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
6. **(RESUELTO en v2: el script temprano quita `html.js` a los 4 s si core no llegó a poner `html.m-ready`; ver §0.8 y §0.11)** **Nuevo modo de falla: que `js/core.js` no baje.** El monolito no dependía
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
