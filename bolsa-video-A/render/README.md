# Render · Video A

## Requisitos
- Node 22, Playwright global con Chromium (`/opt/pw-browsers`), ffmpeg (`apt-get install -y ffmpeg`).
- `npm install` (instala GSAP). Las fuentes ya están en `src/fonts/`: no se usa CDN durante el render.

## Comandos
```
npm run numeros      # timeline/numeros.json: 14 cuentas con assert
npm run timeline     # timeline/timeline_nominal.json desde docs/04_escenas.json
node render/render.js --stills 1.2,12,35                     # cuadros sueltos en render/cuadros/
node render/render.js --from 0 --to 48 --out render/fase1_S01.mp4   # un tramo
npm run render                                               # video completo -> render/bolsa_A_silencioso.mp4
```
Opciones: `--workers 3` (procesos en paralelo; la máquina tiene 4 núcleos).

## Cómo funciona
- `src/app.js` arma una sola `gsap.timeline({ paused: true })`; `window.seek(t)` pone todo en el tiempo `t` y vuelve a dibujar a MICHI desde el rig (`assets/michi/michi_rig.js`). No usa temporizadores ni azar, así que el render es determinista.
- Las cifras salen de `timeline/numeros.json`. Si una cifra de un evento no coincide, la página lanza un error y el render se detiene. Lo mismo pasa si falta una fuente.
- Los tramos «ZOOM MICHI — render 4K» se capturan con `deviceScaleFactor: 2` (3840×2160) y ffmpeg los reduce con `scale=1920:1080:flags=lanczos`.
- Salida: H.264 High, yuv420p, 30 fps, CRF 16, sin audio y con `+faststart`.
