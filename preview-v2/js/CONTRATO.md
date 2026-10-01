# CONTRATO de módulos — preview-v2 (v2 consolidado en la integración · informe 07)

Fuente de verdad del reparto del código del preview. **Cada archivo tiene un dueño y un solo sentido de dependencia:** `ui.js` y `sections.js` importan de `core.js`; `core.js` no importa a nadie; `ui.js` y `sections.js` no se importan entre sí; `gl.js` y `accordion.js` no importan nada y hablan con el resto por `window.SAPHI`, por eventos y por atributos del DOM. Eso último es lo que este documento hace explícito (§5).

El original monolítico es `original.html` (copia intacta de `index.html`, 3,641 líneas); las **líneas de origen** del apéndice A se refieren a él. Producción (`/index.html`, `ppruts.html`) no se toca.

**Índice**

| § | Qué | 
|---|---|
| 0 | Núcleo (`core.js`, `css/motion.css`, `index.html`): reglas comunes, modos, tokens, `ambient`, `arrive`, clases, eventos, marcado, orden de carga y pruebas |
| 1 | `ui.js` |
| 2 | `sections.js` |
| 3 | `accordion.js` |
| 4 | `gl.js` |
| 5 | **Dependencias ocultas entre módulos** (clases, eventos, atributos, globales) y la prueba que guarda cada una |
| 6 | Hojas CSS: dueños, orden y reglas para no pisarse |
| 7 | Plan B: qué pasa cuando falla cada módulo o cada plugin (medido) |
| 8 | Decisiones que siguen pendientes de Emmanuel |
| A | Apéndice: el port original (de dónde viene cada bloque; obsoleto en comportamiento) |

---
## 0. Núcleo y reglas comunes (v2)

Lo que sigue lo escribió el dueño de `core.js`, `css/motion.css`, `index.html` y este archivo (ahora consolidado por la integración). Los demás módulos lo leen y solo se salen de él avisándolo en su informe. El apéndice A describe el **port original** (paridad con `original.html`): sirve para saber de dónde viene cada bloque, pero el plan B por `return`, la lista de exports vacíos con `reduce` y el modo de falla de su §4.6 **ya no son así**.

### 0.1 Reglas para todos

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
7. **El copy visible no cambia** (ni una palabra) y no se agregan textos visibles; los nombres accesibles nuevos se derivan de textos que ya existían. La suite lo comprueba contra `original.html` (`COPY-*`).
8. **Cero rebote** (`elastic`, `back`, `bounce`, la curva `gk`) y **cero `mix-blend-mode`** distinto de `normal` en el código nuevo (`T2-*`).
9. **Un `<script type="module">` por módulo** (0.13): ningún módulo puede suponer que otro llegó, salvo que importe de `core.js`.

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
| `m-noag` | core | `accordion.js` no puso `.ag-live` a los 4.5 s: el acordeón pasa a lista apilada (lo quita `accordion.js` si llega tarde) |
| `gl-nacre`, `gl-nacre-on` | `gl.js` | titular con el color medio del campo / relleno del DOM transparente porque la capa nacarada pinta las letras (§4.3) |
| `ui-kbd`, `ui-menu-open` | `ui.js` | modalidad de teclado (anillo doble en campos) / menú abierto (sin scroll de fondo, también sin Lenis) |
| `body.has-cursor`, `body.is-loading` | `ui.js`, marcado | cursor propio activo (el nativo sigue visible salvo sobre las tarjetas) / carga (ya no bloquea el scroll) |
| `lenis`, `lenis-smooth`, … | Lenis | igual que antes |

### 0.9 Eventos

| Evento (en `document`) | Lo emite | `detail` |
|---|---|---|
| `saphi:section` | core | `{ id }` al cambiar la sección activa |
| `saphi:intro-done` | core | — al terminar o saltarse el intro; 60 ms después core hace **un** `ScrollTrigger.refresh()` para que lo que cachea geometría en `'refresh'` (peso por letra del titular) la vea con el titular asentado |
| `saphi:mode` | core | `{ reduced, motion }` cuando cambia la preferencia con la página abierta (core ya destruyó Lenis y saltó el intro; los bucles `ambient()` se pausan solos; volver a movimiento exige recargar) |
| `ag:active` | **accordion** (sobre `#agRow`, `bubbles: true`; llega a `document` y a `window`) | `{ index, id, el }`; `index: -1, id: null, el: null` en vista apilada. Lo **escuchan** `core.js` (en `document`: `aria-current` del menú) y `gl.js` (en `window`, captura: qué grainient dibuja). Ver §3.2 |

### 0.10 Contratos CSS (`css/motion.css` y las cuatro hojas vacías)

Orden de carga en `index.html`: `site.css` → `motion.css` → `motion-ui.css` → `motion-sections.css` → `motion-accordion.css` → `motion-gl.css`. Cada dueño edita **solo** la suya; `motion.css` es del núcleo. Todas ganan a `site.css` por orden (misma especificidad).

| Contrato | Qué hace |
|---|---|
| `--m-*` | tokens (0.4); con `reduce` las distancias valen 0 y las duraciones largas = `--m-dur-base`. `--m-err` (color de error, D-7: decisión de marca pendiente) es el único color del bloque |
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
| Nodos eliminados | `.grain`, `.hero-blobs--back/--front` (vacíos), los 4 filtros `halo*` de `#blobDefs` (nadie los referenciaba). **Se conservan** `.hero-aurora` (display:none) y todo lo que `sections.js` aún toca, hasta que su dueño lo retire. Integración: también `#cursorDot` |
| Hero | `<span class="m-ring" id="heroRing" aria-hidden>` dentro de `.hero-inner`; `.hero-sub`, `.hero-cta`, los 4 `.hero-meta > div` y `.scroll-cue` son `.m-arrive.m-arrive--1[data-arrive="manual"]` con `--m-i` 0, 0, 0–3, 4 (ya **no** llevan `js-hero`; `.scroll-cue` lleva `data-ambient`). `#heroDisplay` queda **partido en `.word-mask > .word > .char` desde la evaluación de core** (solo con movimiento) y oculto por CSS hasta `html.m-hero-in`: `ui.js`/`sections.js` pueden buscar `#heroDisplay .char` al evaluarse (el peso por letra funciona), pero su geometría solo es fiable tras `saphi:intro-done` |
| `data-sec` | `hero`, `.marquee-band` y `#datos` → `top`; `#manifiesto` → `manifiesto`; `#productos` → `voz`; `#casos` → `casos`; `#proceso` → `proceso`; `#contacto` → `contacto` (los ids de `.sec-index i[data-sec]`). El pie no lleva |
| Acordeón | los hijos de cada `.ag-body .tool-content` **ya no llevan** `js-fade`, `js-mask`, `js-list` ni `js-punch`; cada uno lleva `style="--i:N"` por posición (mini-onda 0, estado 1, categoría 2, título 3, descripción 4, lista 5, remate 6 si existe, enlace 7, o 6 si no hay remate). Los `.tag-status` «En producción» llevan `data-ambient` (las barras `eq` solo corren con el acordeón visible). **Pendiente del dueño del acordeón:** los remates `.punch` ahora son texto plano (no hay `.char` que brillen) en `--ink`; elegir su color en `motion-accordion.css`. Los paneles son `role="listitem"` **sin** `aria-expanded` (§3.1) |
| Datos | `.chart-card` envuelve el `svg#chartA` en `<div class="chart-plot" id="chartPlot">` (misma caja) y añade `#markRing` (`.m-ring--mark`); cada `.flow-step` empieza con un `.m-ring--step`; `.bf-sof` lleva `data-ambient` |
| Casos | `h2#casosTitulo`; `#casesViewport` → `role="region" aria-labelledby="casosTitulo" tabindex="0"` (sections.js: flechas ←/→ y quitar el tab stop si no hay teclado) |
| Formulario | `<form id="form" novalidate method="post" action="mailto:sayisless@gmail.com" enctype="text/plain">` (sin JavaScript nunca un GET con los datos en la URL; con JS el `submit` siempre hace `preventDefault()`). Cada campo obligatorio vive en `<div class="cf-cell">` con su `<p class="cf-err" id="err-nombre\|err-whatsapp\|err-correo\|err-consent" role="alert">` vacío y el `input` trae `aria-describedby` a ese id; `ui.js` pone `aria-invalid` y escribe el texto en `#err-*`. `#cfMsg` (`role="status" aria-live="polite"`) queda para «Enviando…», éxito y errores de red |
| Textos nuevos | ninguno |

### 0.12 Estado de los avisos entre dueños (cerrados en la integración)

Las notas «qué le toca a cada dueño» de la fundación se cumplieron; lo que cruzaba módulos y quedó por resolver se cerró en el informe 07:

| Aviso | Resultado |
|---|---|
| `ui.js` sin la guarda `if (!active) return;`, errores en `#err-*`, sin `'gk'` ni `elastic` | hecho (06-ui) |
| `sections.js` sin guarda, sin contadores, sin `back.out`, `makePulse` con `{once:true}` | hecho (06-secciones) |
| `gl.js` con `SAPHI.ambient`, cero contextos en reducido, sin esperar al intro | hecho (06-gl) |
| `accordion.js` emite `ag:active` (ahora en `#agRow` con `bubbles`, `detail: { index, id, el }`) | hecho; ver §3.2 |
| Elevación de tarjetas de Casos: la misma propiedad (`translate`) declarada en `motion-ui.css` (hover) y en `motion-sections.css` (activa), con dos `transition` distintas; bastaba que alguien usara `transform` en una para que se sumaran (−12 px) | un solo dueño (`motion-sections.css`, solo `translate`, activa y `:hover`); `INT-casos-lift` falla si aparece `transform` o una suma; §5, §6 |
| Hover líquido del `.wordmark` | el manejador ya no existía en `sections.js` (06-secciones); en la integración se retiró también la regla de `motion-ui.css` que lo anulaba (`.wordmark.liquid-on { filter:none }`, ya sin objeto). `INT-wordmark` falla si un `.wordmark` recibe `liquid-on` |
| `#cursorDot` ya no hace falta | quitado de `index.html` |
| Pie bajo 44 px en táctil | CSS táctil en `motion-ui.css` (solo bajo 901 px o puntero táctil: el pie de escritorio mide lo mismo que el original) |
| `ui.js` leía `var(--m-err, #FF6B4A)` y el token no existía | `--m-err: #FF6B4A` en `motion.css` («D-7: decisión de marca pendiente»); lo usan `motion.css`, `motion-ui.css` y `motion-sections.css` |
| Sin JavaScript el formulario hacía GET con los datos en la URL | `method="post" enctype="text/plain" action="mailto:…"` (el mismo `FORM_EMAIL`) |
| `aria-expanded` sobre `role="listitem"` (ARIA 1.2 no lo admite) | retirado; ver §3.1 |
| `makePulse` dejaba un clon `.line-pulse` por cada vuelta al breakpoint de escritorio | idempotente |
| `once()` de sections no resolvía lo saltado de golpe | barrido a los 220 ms de quedar quieto el scroll |
| Un `sections.js` o `ui.js` caído tumbaba también a `core.js` (los tres colgaban de `main.js`) | un `<script type="module">` por módulo; ver 0.13 |
| `accordion.js` caído dejaba la copia de producto oculta | `html.m-noag` (core, a los 4.5 s) pasa a lista apilada; ver 0.13 |

### 0.13 Orden de carga y plan B

`index.html` (scripts al final del `<body>`, tras los 9 de `vendor/`):

```html
<script type="module" src="js/core.js"></script>
<script type="module" src="js/ui.js"></script>
<script type="module" src="js/sections.js"></script>
<script type="module" src="js/gl.js"></script>
<script type="module" src="js/accordion.js"></script>
```

* **Un módulo por `<script>` (antes los tres primeros colgaban de `js/main.js`).** Un `import` que falla tumba todo el grafo del script; con `main.js`, que `sections.js` o `ui.js` no bajara también anulaba `core.js` (sin intro, sin tema, sin sección activa) y dejaba el loader tapando 4 s. Ahora cada módulo falla solo. `ui.js` y `sections.js` importan `./core.js` con la **misma URL** que el `<script>` de `core.js`, así que se evalúa una sola vez (prueba `INT-orden-evaluacion` y `INT-orden-descargas`). `js/main.js` se conserva en disco solo porque algunas herramientas lo copian; no se carga.
* **Orden de ejecución** (módulos diferidos, en orden de documento y antes de `DOMContentLoaded`): `core` (publica `window.SAPHI`, parte el titular, programa el intro) → `ui` → `sections` → `gl` (lee `window.SAPHI` y `window.__saphiLenis`) → `accordion` (despacha el primer `ag:active` cuando `gl.js` ya escucha). Requieren http(s): con `file://` el navegador bloquea los `import`.
* **Plan B declarativo** (sin que ningún módulo tenga que cooperar): el script temprano quita `html.js` a los 4 s si falta `html.m-ready` (todo visible, loader fuera); `html.js .js-fade:not(.m-arrive)` se muestra a los 4.5 s por una animación de CSS de `motion-sections.css`; `html.m-nogsap` (sin GSAP o sin ScrollTrigger) deja contenido y acordeón en lista; `html.m-noag` (core, a los 4.5 s sin `.ag-live`) hace lo mismo con el acordeón. La matriz medida de qué sigue vivo y qué se ve cuando falla cada módulo o cada plugin está en §7.
* **Fuentes:** el intro espera a `document.fonts` como máximo hasta 1,200 ms desde el inicio de la navegación; `font-display: swap` se queda (pasar a `optional` es decisión de marca y de autoalojamiento).

### 0.14 Pruebas

`scratchpad/tools/v2-suite.sh` (o `node v2-suite.cjs`) corre contra `preview-v2/` (o `--dir=<otro>`) la suite unificada: tokens T-1/T-2, intro T-10, ScrollTriggers T-9, ambiente T-3, reducido T-4, cursor T-5, formulario T-6, objetivos táctiles T-8, acordeón (`ag-*`), presupuesto de GL, consola y peticiones en escritorio/móvil/reducido/sin GSAP/sin JS, y la integración (módulos bloqueados uno por uno, plugins ausentes, `ag:active`, breakpoints y rotación en vivo, reducido conmutado en vivo, bfcache, hojas de estilo, ARIA, copy). `--quick` omite lo pesado. Salida: tabla PASA/FALLA y `reports/v2-suite-<etiqueta>.{md,json,log}`. `a11y-v2.cjs` es `a11y.cjs` con los falsos negativos de la propia sonda corregidos (cursor sin punto, menú abierto en `rm`, errores en `#err-*`, titular con capa nacarada, gesto de Casos dentro del viewport). Resultados de cada dueño: `reports/06-*.md`; de la integración: `reports/07-integracion.md`.

---

## 1. `js/ui.js` — interacción de interfaz (dueño: ui)

**Qué hace.** Roll de texto, menú (burger + overlay), anclas y `#hash`, formulario, onda de CTA, cursor propio, imanes, vista previa de Casos, relleno de botones desde el punto de entrada y modalidad de teclado. Lo visual vive en `css/motion-ui.css`; aquí solo el estado y el foco.

**Dos capas** (regla 0.1): lo **básico corre siempre** (con GSAP, sin GSAP y con «reducir movimiento»): menú, formulario, anclas, `#hash`, foco, roll de texto con puntero fino. El **movimiento** (Lenis en el viaje a un ancla, onda de CTA, cursor, imanes, vista previa) se condiciona a `mode.motion`. Cada bloque va aislado con `safe()`: si uno falla, los demás siguen.

**Importa de `core.js`:** `H, M, mode, lenis` (enlace vivo: `lenis` pasa a `null` si el usuario activa «reducir movimiento»), `safe, headerApi`. No toca secciones.

### 1.1 Bloques

| Bloque | Qué hace | Condición | Salidas visibles para otros |
|---|---|---|---|
| `initModality` | marca la modalidad de teclado | siempre | `html.ui-kbd` (Tab o flechas; se quita con `pointerdown`); lo lee `motion-ui.css` para el anillo doble de los campos |
| `initRoll` | duplica el texto de `[data-roll]` en dos capas de letras `aria-hidden` y deja el texto UNA vez en `.roll-sr` | puntero fino y sin reducido **al cargar** | `.roll`, `.rc`, `.roll-sr` (23 enlaces en escritorio, 0 en táctil) |
| `initMenu` | overlay de dos capas: foco al primer `.ov-item`, `inert` en `header`, `.banner`, `main`, `footer`, Tab atrapado, Esc, clic en «Cerrar» o en el fondo, foco de vuelta a `#burger` | siempre | `#navOverlay.open`, `#burger.open`, `aria-expanded`, `aria-label` («Abrir menú» ↔ «Cerrar menú»: ambos ya existían), `role="dialog"`, `aria-modal`, `aria-label="menú"` en el overlay (derivado de «Abrir menú»), `aria-controls`, `html.ui-menu-open` (bloquea el scroll también sin Lenis), `--k` en cada `.ov-item` |
| `initWave` | onda de CTA: círculo que cubre, salto debajo, hueco que descubre. 0.85 s con candado por temporizador | `H.gsap`; solo corre con `mode.motion`, puntero fino y `a.pill-grad` de destino `#…` fuera del menú | nodo `#waveFx` (uno, en `body`), `window.__waveDebug()` |
| `initAnchors` | un delegado en captura para `a[href^="#"]`: viaje con Lenis (`duración = clamp(0.35 + |Δy|/3200, M.travel.min, M.travel.max)`), salto directo con reducido, `history.pushState`, foco al destino (`tabindex="-1"` si hace falta), `hashchange`, y alineación del `#hash` inicial tras `load` y `saphi:intro-done` | siempre | `SAPHI.header.hold(ms)` durante el viaje; `window.__agAbrir(id)` si el destino es un panel del acordeón |
| `initForm` | validación en línea (`#err-*` + `aria-invalid` + `aria-describedby`), foco al primer inválido, casilla de 44×44, estado «enviando» (solo con `FORM_ENDPOINT`), éxito con palomita y anillo local, campos inertes 6 s | siempre | `.cf-field.bad`, `.cf-consent.bad`, `.nudge`, `.cform.is-sent`, `#cfMsg.ok/.bad`, `.ui-check`, `.m-ring--btn` (dentro de `.cf-send .pill-arrow`), `.m-ring--send` |
| `initPointer` | un solo `pointermove` (con rAF) para el anillo, los imanes, la vista previa y el origen del relleno de botones | cursor/imanes: `mode.motion` + puntero fino + ≥901 px (se reevalúa con `saphi:mode` y con cada `matchMedia`) | `body.has-cursor`, `#cursorRing[data-state]` con tres discos `.cur-d`, `#preview.is-on`, `translate` en los 3 CTA `.magnetic.pill-grad`, `--mx/--my` en `.spot` y `.pill` |

### 1.2 Contratos que otros módulos leen

* **`FORM_ENDPOINT` y `FORM_EMAIL`** (constantes al inicio de `ui.js`): ahí se cambia a dónde llega el formulario. El `action` de `<form id="form">` en `index.html` repite el correo (`mailto:…`) para el caso **sin JavaScript** (`method="post" enctype="text/plain"`: nunca un GET con los datos en la URL). Si cambia `FORM_EMAIL`, cambia también el `action`; la prueba `T6-correo` de la suite lo vigila.
* **El `submit` siempre hace `preventDefault()`**: con JS jamás hay navegación nativa.
* **Cursor «Arrastra»:** el rótulo es «Arrastra» solo si `H.Draggable`; el arrastre real (`Draggable`) lo crea `sections.js` únicamente con `PIN` (≥901 px + movimiento + `hover:hover` + `pointer:fine`), exactamente las mismas condiciones que `ui.js` usa para encender el cursor. Si se cambian unas, hay que cambiar las otras.
* **Elevación de las tarjetas de Casos:** NO es de este módulo. `motion-sections.css` es el único dueño de `translate` en `.case-card` (activa y `:hover`); ver §5. La vista previa (`#preview`) sí es de `ui.js`: se ancla a `.case-card:focus-within` y `sections.js` le da foco a la tarjeta activa tras una flecha.
* **`#cursorDot` ya no existe** en el marcado; `ui.js` no lo busca.
* **Color de error:** `var(--m-err)` (token de `motion.css`, D-7). `ui.js` no lo lee.
* **Hover líquido del logo:** retirado. `.wordmark` ya no recibe ningún filtro; el único `.liquid-on` es el de `#footGiant`, una pasada, lo pone `sections.js`.
* **`window.__waveDebug`** y **`window.__agAbrir`** (de `accordion.js`) son ganchos de prueba / compatibilidad, no interfaz de producto.

### 1.3 Plan B

Sin `ui.js`: el menú no abre (la hamburguesa no hace nada; los enlaces `#…` del hero y del pie saltan con el comportamiento nativo y `scroll-padding-top`), el formulario valida con el `action` mailto del marcado (sin JS: `post` + `text/plain`), no hay cursor propio. Nada queda oculto. Con `ui.js` y `core.js` sin GSAP todo lo básico sigue (prueba `T6-nogsap`). Ver §7.

### 1.4 Decisiones y pendientes de este módulo

* Roll solo con puntero fino y sin reducido (en táctil no existe: ahorra ≈500 nodos). **No se reconstruye si la preferencia cambia en vivo** (reduce → normal): quedan sin roll hasta recargar.
* Los imanes son 3 (`.magnetic.pill-grad`), con `translate` y transición de CSS (sin `quickTo`: ya no hay aviso «not eligible for reset»).
* Estado «enviando» solo existe con `FORM_ENDPOINT`; sin endpoint el envío es un `mailto:` (D-5, decisión de Emmanuel).
* El enlace «Aviso de privacidad» apunta a `aviso-privacidad.html`, que no existe (D-6, decisión de Emmanuel).

---

## 2. `js/sections.js` — secciones y su movimiento (dueño: sections)

**Qué hace.** Llegadas de bloques, «Las 23:07» (gráfica, tachado de «42 h», flujo), marquesina, manifiesto, Casos, «Cómo trabajo», peso por letra del titular, blobs ambientales y el wordmark gigante del pie. Estilos en `css/motion-sections.css`.

**Importa de `core.js`:** `H, M, mode, mm, safe, ambient, arrive, ioReveal, splitHeading, makePulse, setScroll, tokens, lenis`. No importa `ui.js`.

**Reglas que sigue:** nunca aborta con reducido ni sin GSAP (lo básico —llegadas, estado de Casos, teclado, proceso— corre siempre; el movimiento va bajo `mode.motion` y `mm.add`); ScrollTrigger solo para `scrub` y `pin`; todo bucle pasa por `ambient()`; tiempos y distancias salen de `M` / `--m-*`; nada se lee ni se escribe por tick de scroll salvo aritmética sobre geometría ya cacheada.

### 2.1 Bloques (anexo de `06-secciones.md`, vigente)

| Bloque | Qué hace | Contrato |
|---|---|---|
| `initArrivals` | marca `.js-fade`, `.js-words`, `.js-draw` y `.bar-fill` y arranca `arrive()` / `ioReveal`; `--m-i` 0,2,4,6 en los pasos; `.m-strike` en la tarjeta de «42 h» | siempre. Clases nuevas: `.m-arrive` (`--1`), `.m-draw`, `.m-bar`, `.m-strike`. Los `.flow-step` llevan `data-arrive="manual"` solo con el flujo coreografiado (`stagedFlow`) |
| `initHeadings` | `splitHeading` (máscara por línea) en cada `.js-mask` | solo `mode.motion` |
| `initMarquee` | WAAPI infinita + `ambient()` + lerp de `updatePlaybackRate`; `--mq-half-gap` | pausada fuera de pantalla; reducido: una copia que envuelve (CSS) |
| `initDatos` | `fixSofiaStroke` (siempre); `chartScrub` y `flowStaged` (≥901 y movimiento); `chartPass` (≤900) | `#gLineChart` (degradado en coordenadas de usuario) para la línea «Con Sofía»; `flowStaged` crea un `.line-pulse` por `makePulse` (idempotente) |
| `initProceso` | línea `.steps-line` por scrub (≥901) o IO por paso (≤900); `is-on`; `.steps.m-live` | reducido: todo `is-on` |
| `initManifiesto` | `manifiesto()` con `onSplit` (≥901 con dial; ≤900 sin dial ni pin) + orbe en `ambient()` | `aria:'none'`; clase `.mf-end` en vez de `#mfEnd`; `.w-live`; el dial `.mf-dial.done` |
| `initCasos` | segmentos `.cs` (5), `.is-active` / `.is-past`, scroll nativo, teclado (← → Inicio Fin), foco rodante; pin con `.is-pinned` y `Draggable` | un solo pin; sin lecturas de rect; el carril es scroll nativo en todos los anchos y solo con `PIN` se ancla |
| `initProximity` | peso por letra armado al entrar el cursor al hero | `.is-weighing` / `.is-unweighing` en `#heroDisplay`; solo tras `m-hero-done` y con puntero fino |
| `initAmbient`, `initFooter` | parallax de `translateY`, un morph en `ambient()` (el del cierre), footer con scrub y una pasada líquida | `.liquid-on` solo en `#footGiant` y solo mientras suena |

### 2.2 Contratos que otros módulos leen o dependen de él

* **Peso por letra ↔ titular nacarado (`gl.js`).** `initProximity` pone `is-weighing` (y luego `is-unweighing`) en `#heroDisplay` y escribe `style.width/height/fontWeight` en las `.char`. `gl.js` observa esas clases con un `MutationObserver` para que la máscara del titular siga al DOM. Si se renombran, el titular nacarado deja de seguir el efecto.
* **`#heroDisplay .char` debe existir al evaluarse el módulo.** Lo parte `core.js` al evaluarse (no al arrancar el intro). Si se cambia, el efecto de peso se instala sin letras y no avisa. La geometría solo es fiable tras `saphi:intro-done`.
* **Elevación de las tarjetas de Casos:** `motion-sections.css` es el único dueño. Tarjeta activa (`.is-active`) y `:hover` suben `--m-lift` con la propiedad `translate`; nadie más declara `translate` ni `transform` sobre `.case-card`. Con «reducir movimiento» `--m-lift` vale `0px`.
* **Foco a la tarjeta:** tras una flecha, a los 420 ms el foco pasa a la tarjeta activa (`tabindex="0"` solo mientras la tiene). `ui.js` ancla la vista previa a `.case-card:focus-within` con su propio `focusin`.
* **`once(el, margen, cb)`** (IO de un disparo): además del IO, al quedar quieto el scroll (220 ms) resuelve lo que ya quedó arriba del viewport sin haber intersectado (salto instantáneo: la onda de CTA, `Fin`, un `#hash` lejano). Sin esto, el flujo de «Las 23:07» quedaba oculto tras un salto largo hasta volver a pasar por él.
* **Contadores:** NO viven aquí (los lleva `core.js`). Si se reintroduce un tween sobre `[data-count]`, dos animaciones escribirán el mismo `textContent` y el número parpadeará.
* **Hoja de seguridad:** `html.js .js-fade:not(.m-arrive) { animation: secFailsafe 0s linear 4.5s forwards }`. Si este módulo no llega, los `.js-fade` se muestran a los 4.5 s; en cuanto los marca, el selector deja de aplicar.
* **Periodos de ambiente** (`AMB` en el JS, `--sec-orb-period` en el CSS) no son tokens de interfaz; viven junto al bucle que gobiernan.

### 2.3 Plan B

Sin `sections.js` (con `core.js` vivo): `.js-fade` se muestran a los 4.5 s, Casos es scroll nativo, no hay peso por letra ni scrubs. Sin GSAP: lo básico corre (`initArrivals`, `initCasos` sin pin, `initProceso` encendido). Con reducido: bloques a la vista desde el primer cuadro, sin transform animado, gráfica y flujo completos. Ver §7.

### 2.4 Decisiones y pendientes

* La línea «Con Sofía» ahora se pinta (en el original nunca se veía: degradado `objectBoundingBox` sobre un trazo horizontal). Para revertir basta quitar `fixSofiaStroke()`.
* Un solo blob con morph (el del cierre); los otros 5 quedan quietos con parallax vertical.
* Manifiesto móvil por palabra (no por oraciones). Contador «02 / 05» de Casos: no hecho (D-4, es texto nuevo).
* WCAG 2.2.2: la marquesina (40 s) y el orbe (31 s) corren >5 s sin control de pausa; un botón de pausa es UI y copy nuevos: decisión de Emmanuel.

---

## 3. `js/accordion.js` — acordeón de productos (dueño: accordion)

**Qué hace.** Reparto de anchos de los 6 paneles (`flex-grow`, `rotateY` de los cerrados y parallax del medio con GSAP), intención de hover, teclado, gesto táctil, huella de voz (DrawSVG), recorrido guiado inicial y estado accesible. Todo lo demás (atenuado, etiqueta vertical, cuerpo, cascada del contenido, velo de lectura) es CSS en `css/motion-accordion.css`. **Sin imports**: lee `window.SAPHI.M` (con los mismos valores de respaldo si no existe) y usa `window.gsap` si está.

### 3.1 Estado y atributos que produce

| Qué | Dónde | Quién lo lee |
|---|---|---|
| `aria-current="true"` en el panel abierto (y `"false"` en los cerrados; ausente en lista apilada) | `.ag-panel` | `core.js` (`syncNav`: marca en el menú el producto abierto), `gl.js` (respaldo por `MutationObserver`), pruebas |
| `.ag-panel--active` | `.ag-panel` | CSS (todo el estado visual), `gl.js` (respaldo) |
| `inert` en el `.ag-body` de los cerrados (+ `visibility:hidden` por CSS) | `.ag-body` | teclado y lectores: Tab y Shift+Tab no aterrizan en enlaces invisibles |
| `.ag-live` (y `.ag-init` durante el primer reparto, `.ag-moving` durante el cambio) | `#agRow` | CSS: los estados ocultos solo existen bajo `.ag-live`; `will-change: transform` solo con `.ag-moving` |
| `--ag-media-size`, `--ag-body-w`, `--ag-need` | `#agRow` | CSS (alto de la fila = el cuerpo más alto de los seis + 24 px arriba y abajo) |
| `window.__agAbrir(id)` | global | `ui.js` (`#hash` inicial y viajes), pruebas |
| `sessionStorage['saphi:ag-tour']` | sesión | el recorrido guiado corre una sola vez por sesión |

**ARIA (decisión de la integración).** Los paneles son `role="listitem"` dentro de `role="list"`. ARIA 1.2 no admite `aria-expanded` en `listitem`, así que **se retiró**: el estado lo dan `aria-current` (cuál está abierto), `inert` en los cuerpos cerrados (su contenido no se expone) y el nombre de cada panel. Se eligió esto frente a las alternativas (cambiar a `tablist`/`tab`/`tabpanel`, o agregar un `<button aria-expanded>` por panel) porque conserva el teclado (cada panel es `tabindex="0"`; flechas, Inicio, Fin, Enter y Espacio) y la lectura sin tocar el marcado ni el copy. `a11y.cjs` conserva un aviso P2 (`sem.accordion-pattern`) porque no es el patrón botón + `aria-controls` de la APG.

### 3.2 Evento `ag:active`

`root.dispatchEvent(new CustomEvent('ag:active', { bubbles: true, detail: { index, id, el } }))` sobre `#agRow`; con `bubbles` llega a `document` (lo escucha `core.js`) y a `window` (lo escucha `gl.js` en captura). Se despacha **una vez al iniciar** (panel por defecto), **en cada cambio**, **al volver de la lista apilada** y con `index: -1, id: null, el: null` **al entrar en vista apilada**. Hay que conservar `bubbles: true`.

### 3.3 Intención y accesibilidad

* `pointerenter` (solo mouse o lápiz, solo con `(hover:hover)`) espera `M.intent.delay` (90 ms), o `M.intent.sweep` (140 ms) si el puntero va rápido (> `M.intent.speed`). Foco, flechas, Inicio, Fin, Enter, Espacio, clic y toque abren al instante.
* Reducido: el foco abre el panel, el reparto de anchos cambia en la misma tarea, sin inclinación ni parallax, con fundido de 180/120 ms.
* Lista apilada (≤900 px, sin GSAP o sin `html.js`): todo abierto, sin `aria-current`, sin `inert`; las huellas se dibujan una vez al llegar cada tarjeta.
* Recorrido guiado: constante `RECORRIDO = true` (false lo apaga); `PASO = 0.8` s. No corre con reducido, con `pointermove` previo, en la segunda visita ni con ≤900 px; cualquier interacción lo cancela. La sensación de movimiento no se puede juzgar con capturas: pendiente de revisión en pantalla real.
* El alto de la fila crece con el contenido; si cambia con la página ya cargada, `ScrollTrigger.refresh()` una vez (220 ms de debounce) porque el pin de Casos queda más abajo.

### 3.4 Velo de lectura (costo visual que se conserva a propósito)

El contraste del texto de producto sobre los shaders era 1.1–2.9:1 (mediana). Se resolvió con un pozo oscuro detrás de estado/categoría (`--ag-pool: .82`), un baño suave arriba (`--ag-wash: .34`), gris más claro para descripción y estado, y el remate aclarado 22 %. **Efecto medido:** la luminancia media del panel abierto baja 66 % (0.0444 → 0.0150). Los dos números están en `css/motion-accordion.css` §4 y se afinan ahí; hay que volver a correr `ag-contrast.cjs` (la suite lo hace) tras cualquier cambio. Es decisión de legibilidad, pero con efecto de marca (D-A de `06-acordeon.md`).

### 3.5 Plan B

Sin `accordion.js`: `site.css` deja el estado original (paneles iguales); `core.js` no marca ningún producto en el menú; `gl.js` dibuja por visibilidad (respaldo del DOM, por defecto `voz`). Ver el resultado medido en §7.

---

## 4. `js/gl.js` — WebGL2 del preview (dueño: gl)

**Qué hace.** Cuatro efectos con **un solo bucle de `requestAnimationFrame`** (`sched`): la seda del hero (`.hero-silk`), el titular nacarado (`.hero-irid`, un lienzo ENCIMA del `<h1>`), un grainient por producto (`.grainient[data-g]`, 6) y el listón de scroll (`.scroll-ribbon`). **Sin imports**: lee `window.SAPHI` (`M`, `ambient`, `mode`) y, si no existe, usa versiones mínimas con las mismas condiciones. Estilos en `css/motion-gl.css`.

### 4.1 Presupuesto (medido con los cinco módulos juntos, `v2-suite.cjs`)

| Escena | Límite | Cómo se cumple |
|---|---|---|
| Carga (escritorio, 8 s) | ≤3 contextos | seda, nacarado y listón; los dos últimos nacen tras el intro; los 6 grainient no se crean al cargar |
| Hero en reposo | ≤3 lienzos dibujando | seda y titular (el listón duerme a los 1.5 s sin scroll) |
| Acordeón en reposo | 1 | solo el panel activo dibuja; los cerrados conservan su último cuadro |
| Cambio de panel | ≤2 | el que se cierra (`M.dur.layout` + 60 ms) y el que abre |
| Vista apilada | ≤2 | manda la visibilidad por fracción visible |
| Pestaña oculta / reducido | 0 dibujos / 0 contextos | `ambient()`; los cuadros estáticos salen de un puerto 2D de los mismos shaders |

Los campos ambientales van a 30 fps y a UN dibujo pesado por cuadro (se alternan). Los 6 contextos de grainient se piden **uno por tarea** al acercarse a 600 px: en hardware real no cuestan; con WebGL por software (SwiftShader) cada `getContext` espera a un proceso GPU saturado y aparecen tareas largas al llegar al acordeón (documentado, `GL-tareas-largas`; alternativa diferida: contexto compartido).

### 4.2 Contratos que lee de otros módulos (ocultos)

* **`ag:active { index, id, el }`** en `window` (captura). Sin el evento, respalda con un `MutationObserver` sobre `#agRow` (`aria-current` o `.ag-panel--active`); por defecto el panel `voz`.
* **Titular nacarado:** lee del DOM (1) el `style.color` inline de cada `.char` de «Siempre.» (la rampa, la pone `core.js`; las letras sin color en línea se dibujan en `#fff`), (2) las clases `is-weighing` / `is-unweighing` de `#heroDisplay` (las pone `sections.js`), (3) la posición de cada carácter (un `Range` por carácter). Si cualquiera cambia, la rampa se pintaría blanca o la máscara dejaría de seguir al efecto de peso. La capa espera a `html.m-hero-in` sin `html.m-intro` (o `saphi:intro-done`) y a `document.fonts.ready`.
* **`window.__saphiLenis`** (de `core.js`): lo lee el listón para seguir la posición.
* **`saphi:intro-done`, `saphi:mode`, `visibilitychange`** (y `matchMedia` de reducido y de compacto).

### 4.3 Estado que produce

| Qué | Significado | Quién lo lee |
|---|---|---|
| `html.gl-nacre` | el titular se ve con el color medio del campo (`--gl-nacre-mean`) hasta que la capa entra | `motion-gl.css` |
| `html.gl-nacre-on` | el relleno del DOM del `<h1>` pasa a transparente (la capa pinta las letras). Solo la pone `gl.js` y la quita ante **cualquier** fallo (contexto perdido, métricas de fuente distintas, error) | `motion-gl.css`, **sondas de contraste**: deben quitar la capa (`.hero-irid`) para aislar el texto |
| `canvas.gl-ready` | primer cuadro dibujado (la opacidad del lienzo transiciona a `--m-dur-base`) | `motion-gl.css` |
| `.gl-still` | cuadro 2D estático (reducido, sin WebGL2, contexto perdido) | `motion-gl.css` |
| `window.__saphiGL` (`live()`, `contexts()`, `stills()`, `active()`, `sched()`), `__saphiNacre`, `__saphiRibbonTick`, `window.__SAPHI_GL` (opciones de prueba: `fps`, `silk`, `nacre`, `ribbon`…) | ganchos de prueba, **no son interfaz de producto** | la suite |

### 4.4 Plan B y robustez

Con reducido o sin WebGL2: cero contextos y cuadros 2D. Con `webglcontextlost` en cualquiera de los cuatro efectos: el lienzo se oculta, el titular vuelve a su texto del DOM y todo reanuda al restaurarse. Sin GSAP y sin `core.js` el titular nacarado y la seda siguen funcionando (prueba `GL-sin-core`). **`mix-blend-mode`:** ninguno (ni `darken` ni `lighten`); la única composición `darken` es INTERNA del lienzo 2D de la máscara (`min(color de la letra, campo)`), no del DOM.

### 4.5 Pendiente

Contexto compartido de grainient (de 6 contextos a 1) y, con él, precalentarlos sin tareas largas.

---

## 5. Dependencias ocultas entre módulos

Lo que un módulo **produce** y otro **consume** sin que aparezca en un `import`. Si cambias el nombre, el momento o el valor de cualquiera de estos contratos, cambia también a su consumidor; la columna «Lo guarda» es la prueba de la suite (`v2-suite.cjs`, ver §0.14) que se rompe si se rompe.

| Contrato | Lo produce | Lo consume | Qué se rompe si cambia | Lo guarda |
|---|---|---|---|---|
| `html.m-ready` | `core.js` al evaluarse | script temprano del `<head>` (si falta a los 4 s, quita `html.js`) | página con estados ocultos para siempre | `INT-orden-sin-core` |
| `html.js` | script temprano | todo estado oculto de CSS (`html.js .m-arrive`, `.js-fade`, `#loader`, `ag-live`…); `accordion.js` (`apilado()`) | contenido oculto sin JS | `C-nojs-contenido` |
| `html.m-nogsap`, `html.m-reduced` | `core.js` | `motion*.css`, `accordion.js` (lista apilada), `gl.js` (ribbon) | plan B sin GSAP / reducido | `C-nogsap`, `T4-*`, `GL-reducido` |
| `html.m-intro` → `m-hero-in` → `m-hero-done`, evento `saphi:intro-done` | `core.js` | `gl.js` (la capa nacarada y el listón esperan), `sections.js` (`initProximity` solo tras `m-hero-done`), `ui.js` (`realign` del `#hash`, imanes), `motion.css` (`#hero` recorta con `overflow: clip` durante el intro) | el efecto de peso no se instala, el titular nacarado entra durante el intro | `GL-intro`, `T10-*`, `INT-nacre-contrato` |
| `#heroDisplay .word > .char` partidos **al evaluar `core.js`** | `core.js` (`prepareHero`) | `sections.js` (`initProximity`), `gl.js` (máscara del titular) | peso por letra muerto sin avisar | `INT-nacre-contrato`, `GL-peso` |
| `style.color` inline en las `.char` de «Siempre.» | `core.js` (`finalRamp`, intro) | `gl.js` (`inkOf`) | la rampa se pinta blanca | `INT-nacre-contrato` |
| `#heroDisplay.is-weighing` / `.is-unweighing`, `style.width/height/fontWeight` en las `.char` | `sections.js` | `gl.js` (`MutationObserver`: la máscara sigue al DOM), `motion-sections.css` (`inline-flex`) | la máscara se desfasa durante el efecto | `GL-peso`, `INT-nacre-contrato` |
| `html.gl-nacre`, `html.gl-nacre-on` | `gl.js` | `motion-gl.css`; sondas de contraste de `a11y-v2.cjs` | texto del `<h1>` transparente sin capa | `GL-perdido`, `INT-orden-sin-gl` |
| evento `ag:active { index, id, el }` en `#agRow` con `bubbles` | `accordion.js` | `core.js` (`document`: `aria-current` del menú), `gl.js` (`window`, captura: qué grainient dibuja) | el menú no marca el producto; se dibujan 6 shaders | `INT-agactive-*`, `GL-evento` |
| `aria-current` / `.ag-panel--active` en `.ag-panel` | `accordion.js` | `core.js` (`syncNav`), `gl.js` (respaldo), CSS | idem | `INT-agactive-core`, `INT-aria-acordeon` |
| `.ag-live`, `--ag-need` en `#agRow` | `accordion.js` | `motion-accordion.css` (estados ocultos solo bajo `.ag-live`; alto de la fila) | CTA recortado / cuerpo oculto sin script | `AG-ag-fit`, `INT-orden-sin-accordion` |
| `window.__agAbrir(id)` | `accordion.js` | `ui.js` (`#hash` y viajes a un panel) | el `#hash` de un producto no abre su panel | `UI-anclas` |
| `SAPHI.header.hold(ms)` | `core.js` | `ui.js` (viaje a un ancla: el header no se esconde) | el header se esconde durante el viaje | `UI-anclas` |
| `SAPHI.M`, `SAPHI.ambient`, `SAPHI.mode` | `core.js` | `accordion.js` y `gl.js` (sin imports) | tiempos de respaldo / bucles sin gobierno | `T1-*`, `T3-*` |
| `window.__saphiLenis` | `core.js` | `gl.js` (listón), `ui.js` (onda de CTA) | listón sin seguir el scroll | `GL-liston` |
| `lenis` (enlace vivo) | `core.js` | `ui.js` (menú: `lenis.stop()`; viaje), `sections.js` (`setScroll`, arrastre de Casos) | scroll bloqueado tras abrir el menú; viaje sin suavizado | `INT-rv-*`, `UI-menu` |
| `html.ui-kbd`, `html.ui-menu-open`, `body.has-cursor` | `ui.js` | `motion-ui.css` (anillo de campos, bloqueo del scroll, `cursor:none` solo en tarjetas) | cursor nativo oculto en todo | `T5-*` |
| `.m-arrive` / `.m-in`, `--m-i`, `data-arrive="manual"` | `core.js` (IO), `sections.js` (marca) | `motion.css`, `sections.js` (`flowStaged` revela los `.flow-step` a mano) | bloques ocultos o sin escalón | `T-ST`, `INT-orden-seguridad-fade` |
| `[data-ambient]` / `.is-live` | `core.js` (`ambient.css`) | `motion.css` (pausa las animaciones CSS fuera de pantalla), `sections.js` (orbe), marcado | bucles CSS corriendo fuera de pantalla | `T3-*` |
| `.line-pulse` (clon del trazo) | `core.js` (`makePulse`, idempotente) | `sections.js` (`flowStaged`) | un clon más por cada vuelta a escritorio | `INT-bp-clones` |
| `.case-card` + `translate` (activa y `:hover`) | `motion-sections.css` (único dueño) | `ui.js` (vista previa), usuario | elevación de −12 px si alguien suma `transform` | `INT-casos-lift`, `SEC-casos-elevacion` |
| `--m-err` | `motion.css` | `motion-ui.css`, `motion-sections.css` | color de error en 4 sitios distintos (D-7) | `T1-err` |
| `#err-*` + `aria-describedby` en los campos | `index.html` | `ui.js` (escribe el texto, `aria-invalid`) | errores sin anunciar | `T6-vacio` |
| `FORM_EMAIL` ↔ `action="mailto:…"` del `<form>` | `ui.js` / `index.html` | formulario sin JavaScript | correo distinto con y sin JS | `T6-correo`, `T6-nojs` |
| `Draggable` solo con `PIN` | `sections.js` | `ui.js` (rótulo «Arrastra») | cursor «Arrastra» sin arrastre | `T5-movil`, `SEC-casos-arrastre` |

---

## 6. Hojas CSS: dueños, orden y guardia contra pisadas

Orden de carga (el que fija `index.html` y vigila `INT-estilos-orden`): `site.css` → `motion.css` → `motion-ui.css` → `motion-sections.css` → `motion-accordion.css` → `motion-gl.css`. Todas ganan a `site.css` por orden (misma especificidad); `site.css` conserva reglas muertas del port (se retiran en G-26, no aquí).

| Hoja | Dueño | Qué es suyo |
|---|---|---|
| `motion.css` | núcleo | tokens `--m-*` (incluido `--m-err`, D-7), `.m-arrive`, `.m-ring` (base), `[data-ambient]`, foco global, intro del hero, header, `.cf-err` (base **y color**), bloque de movimiento reducido (sustituye al `* {transition-duration:.01ms}` de `site.css`), plan B `html.m-nogsap` |
| `motion-ui.css` | ui | botones, roll, cursor, vista previa (`#preview`), menú, formulario (campos, casilla, éxito), objetivos táctiles (incluye los enlaces del pie bajo 901 px) |
| `motion-sections.css` | sections | llegadas (`.m-draw`, `.m-bar`, hoja de seguridad), marquesina, «Las 23:07», proceso, manifiesto, **Casos (incluida la elevación `translate` de las tarjetas)**, peso por letra, desbordes |
| `motion-accordion.css` | accordion | cascada del contenido, estados del panel, foco, velo de lectura, alto de la fila, lista apilada |
| `motion-gl.css` | gl | capas WebGL, titular nacarado, cuadros estáticos |

**Reglas para no pisarse** (las comprueba `INT-estilos-pisadas`, que recorre el CSSOM de las seis hojas en escritorio, móvil y reducido y resuelve la cascada por especificidad y orden):

1. **Un selector con una propiedad, un dueño.** Cero declaraciones duplicadas del mismo selector y propiedad en hojas de dueños distintos. En la integración se retiraron: `.cf-err` / `.closing .cf-err` (color) de `motion-ui.css` (queda en `motion.css`) y `.case-card:hover` / `.case-card { transition }` de `motion-ui.css` (queda en `motion-sections.css`).
2. **Modificador sobre una base** (`.m-ring--btn`, `.m-ring--mark` sobre `.m-ring`) sí puede vivir en otra hoja: el modificador gana por especificidad, a propósito.
3. **El bloque de movimiento reducido de `motion.css`** (`*, *::before, *::after { transition-… !important }`) lo vencen por especificidad los bloques reducidos de las otras hojas cuando necesitan otra duración (accordion, ui). Es intencional y está listado en `pisadas.json` como «reducido».
4. `translate`, `rotate`, `scale` (propiedades individuales) para imanes, presión, elevación, deriva del orbe y vista previa: no pisan al `transform` que anima GSAP. **Nadie debe declarar `transform` sobre `.case-card`.**
5. `will-change` solo en vuelo (`motion.css` anula los estáticos de `site.css`; `accordion.js` lo pone con `.ag-moving`).

---

## 7. Plan B: qué pasa cuando algo falla (medido con la suite, no supuesto)

Cada fila es una prueba de `v2-suite.cjs`: se bloquea el archivo (o se retrasa) y se recorre toda la página. «Legible» = nada de texto oculto tras recorrerla, el loader no tapa, la página se recorre y 0 errores de consola que no sean la propia petición bloqueada.

### 7.1 Un módulo no baja (`INT-orden-sin-*`)

| Falta | Siguen vivos | Qué ve la persona |
|---|---|---|
| `core.js` | `gl`, `accordion` (no importan nada; `ui` y `sections` sí importan `core` y caen con él) | A los 4 s el script temprano quita `html.js` y retira el loader: página estática, todo visible, sin intro, sin tema ni sección activa, sin menú ni validación en línea. Los shaders y el acordeón siguen |
| `ui.js` | `core`, `sections`, `gl`, `accordion` | Todo menos: menú (la hamburguesa no abre), cursor propio, imanes, roll, onda y formulario con validación en línea; el formulario conserva el `action` mailto |
| `sections.js` | `core`, `ui`, `gl`, `accordion` | `.js-fade` se muestran a los 4.5 s (`INT-orden-seguridad-fade`); Casos es scroll nativo; sin scrubs, sin peso por letra |
| `gl.js` | `core`, `ui`, `sections`, `accordion` | Titular en su color de texto (`rgb(237,234,243)`, no nacarado), sin seda ni shaders de panel (queda el tinte `--ag-tint`) |
| `accordion.js` | `core`, `ui`, `sections`, `gl` | A los 4.5 s `html.m-noag` pasa los productos a lista apilada con todo su contenido (6 títulos visibles). Si el módulo llega después, quita `m-noag` y toma el control |

### 7.2 Un plugin de GSAP no baja (`INT-plugin-sin-*`)

| Falta | Efecto | Resultado medido |
|---|---|---|
| `ScrollTrigger` | `mode.gsap = false` → `html.m-nogsap` (plan B completo sin GSAP) | legible; párrafo del manifiesto en `--ink` |
| `SplitText` | sin titulares por línea, sin manifiesto por palabra, hero con fundido | legible; el párrafo del manifiesto conserva el color de tinta completo |
| `DrawSVGPlugin`, `MorphSVGPlugin`, `Draggable`, `InertiaPlugin`, `CustomEase`, `Lenis` | solo se apaga su efecto (trazos, orbe, arrastre, inercia, curvas de marca → `power3`, scroll suave → nativo) | legible, 0 errores |

### 7.3 Llegadas tardías (`INT-tardio-*`)

`sections.js` 3 s tarde; `gl.js` 3 s y `accordion.js` 6 s tarde (después de la red de 4.5 s); todos 0.8 s más lentos con la CPU ×4: todos los módulos terminan vivos, nada oculto, el acordeón toma el control (`m-noag` fuera), `gl.js` sigue a `ag:active`. **`core.js` 5 s tarde** (después del script temprano de 4 s) es la excepción asumida: la página ya se rindió a su versión estática (sin `html.js`, acordeón en lista) y así se queda, legible y sin errores.

### 7.4 Otras degradaciones (medidas en sus grupos)

| Condición | Prueba | Resultado |
|---|---|---|
| Sin GSAP (`vendor/gsap.min.js` abortado) | `C-nogsap`, `T6-nogsap`, `GL-sin-gsap` | menú, formulario, anclas y titular nacarado funcionan; acordeón y Casos en lista/scroll nativo |
| Sin JavaScript (CSP `script-src 'none'`) | `C-nojs`, `C-nojs-contenido`, `T6-nojs` | nada oculto, se recorre hasta el pie, el formulario no filtra datos en la URL |
| Movimiento reducido (al cargar y en vivo) | `T4-*`, `GL-reducido`, `INT-rv-*` | contenido visible, 0 contextos WebGL, sin Lenis ni ScrollTriggers; al volver a «sin preferencia» se reactivan los contextos de `sections`/`ui` pero **no** Lenis ni el intro (el scroll queda nativo hasta recargar) |
| Sin WebGL2 / contexto perdido | `GL-sin-webgl2`, `GL-perdido` | cuadros 2D estáticos; el titular vuelve a su texto del DOM |
| Fuentes bloqueadas | `fonts: block` en las pruebas manuales | el intro no espera más de 1.2 s; el titular se reacomoda sin romper líneas al llegar la fuente |
| Volver con Atrás (bfcache) | `INT-bf-*` | la página restaurada conserva ScrollTriggers, scroll y Lenis, sin contextos perdidos, y los lienzos reanudan |

---

## 8. Decisiones que siguen pendientes de Emmanuel (no resueltas aquí)

| # | Qué | Estado en el código |
|---|---|---|
| 1 | **Control de pausa WCAG 2.2.2** para la marquesina (40 s) y el orbe (31 s) | no existe (UI y copy nuevos). `a11y` mantiene `motion.222-no-control` y `motion.5s-cap` en FALLA P1, documentados |
| 2 | «Siempre.» / «24/7» en el copy | sin cambios |
| 3 | Correo `sayisless@gmail.com` (posible errata) | sin cambios; es `FORM_EMAIL` y el `action` sin JS |
| 4 | `aviso-privacidad.html` no existe | el enlace sigue ahí; ya mide 44 px de alto en táctil |
| 5 | Color coral `#FF6B4A` y color de error (D-7) | un solo token, `--m-err` |
| 6 | Contador «02 / 05» de Casos (D-4, texto nuevo) | no hecho |
| 7 | Cuánto color se sacrifica por legibilidad en el acordeón (`--ag-pool` .82, `--ag-wash` .34) | valores medidos, un solo lugar; costo visible documentado (§3.4) |
| 8 | Recorrido guiado del acordeón (`PASO` 0.8 s, `RECORRIDO`) | activo; no se puede juzgar con capturas |
| 9 | `font-display: optional` + autoalojar Instrument Sans | no hecho |

---

## A. Apéndice: el port original (obsoleto en comportamiento; vigente como mapa de procedencia)

Las líneas de origen son las de `original.html`. Los puntos 4.5 (listeners al cruzar el breakpoint) y 4.6 (que `core.js` no baje) de abajo **se resolvieron** (0.13 y la prueba `INT-bp-listeners`); el resto describe cómo se cortó el monolito.

## A.1 Orden de carga del port original (`index.html` + `main.js`; el vigente está en 0.13)

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

## A.2 `core.js` — exports (port)

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

## A.3 Dueño de cada bloque del original

### A.3.1 `index.html`
| Bloque | Origen |
|--------|--------|
| `<head>` (meta, favicons, fuentes) | 1-19 y 20-24 (+ `robots noindex,nofollow` y `canonical`, nuevos) |
| Script temprano (html.js + failsafe 4 s) | 25-34 |
| Marcado del body (loader, defs SVG, header, hero, secciones, footer) | 881-1443, verbatim |
| Vendor (9 `<script src>`) | 1445-1453 → `vendor/…` |
| `<div class="scroll-ribbon">` | 3385 |

### A.3.2 `css/site.css`
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

## A.4 Diferencias conocidas respecto al original (de orden y de entrega; ninguna de lógica)

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

## A.5 Código muerto encontrado (conservado a propósito)

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
