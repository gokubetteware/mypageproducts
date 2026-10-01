/* ============================================================================
   js/gl.js — LOS CUATRO SHADERS WEBGL2 (propietario: gl)
   Grainient por producto, iridiscente del titular, seda del hero y listón de
   scroll. Cada uno es su IIFE tal cual el original; ninguno importa de core.
   El listón lee window.__saphiLenis (lo publica core.js). Ver js/CONTRATO.md.
   ============================================================================ */

/* ══ Grainient por producto ════════════════════════════════════
   Puerto a WebGL2 puro del componente Grainient (React Bits): un
   canvas por sección de producto, cada uno con su color y su propio
   carácter de movimiento. Se pausa fuera de pantalla; con
   prefers-reduced-motion pinta un solo cuadro estático; sin WebGL2
   queda el tinte sólido de siempre. */
(function () {
  var hosts = document.querySelectorAll('.grainient[data-g]');
  if (!hosts.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CFG = {
    voz:          { c: ['#F5A623', '#6E4B10', '#1A1206'], ts: .22, bal: -.12, wst: 1,   wf: 5,   wsp: 1.6, wam: 50, ang: 0,   soft: .12, rot: 500, ns: 2,   gr: .10, gs: 2.4, ga: 0, con: 1.35, cx: 0,    cy: 0,   zm: .9 },
    whatsapp:     { c: ['#3B82F6', '#1B3B6F', '#0A1322'], ts: .30, bal: -.18, wst: 1,   wf: 7.5, wsp: 2.4, wam: 70, ang: 35,  soft: .08, rot: 320, ns: 2,   gr: .12, gs: 2,   ga: 0, con: 1.4,  cx: .12,  cy: 0,   zm: 1.15 },
    inmobiliaria: { c: ['#14B8C4', '#095358', '#07181A'], ts: .14, bal: -.10, wst: .6,  wf: 3,   wsp: 1.1, wam: 90, ang: -25, soft: .2,  rot: 240, ns: 1.6, gr: .08, gs: 2.2, ga: 0, con: 1.3,  cx: 0,    cy: .05, zm: 1 },
    web:          { c: ['#F5487F', '#6E2039', '#200E14'], ts: .34, bal: -.20, wst: 1.2, wf: 8.5, wsp: 3.2, wam: 40, ang: 65,  soft: .06, rot: 720, ns: 2.4, gr: .11, gs: 1.8, ga: 0, con: 1.45, cx: 0,    cy: .08, zm: .8 },
    salud:        { c: ['#F100CB', '#6C005B', '#20081C'], ts: .26, bal: -.22, wst: 1.4, wf: 11,  wsp: 2.8, wam: 30, ang: 90,  soft: .05, rot: 420, ns: 3,   gr: .14, gs: 1.6, ga: 1, con: 1.4,  cx: -.05, cy: 0,   zm: .95 },
    videos:       { c: ['#A855F7', '#4B266F', '#150E20'], ts: .18, bal: -.08, wst: .8,  wf: 4,   wsp: 1.4, wam: 65, ang: -60, soft: .3,  rot: 380, ns: 1.8, gr: .09, gs: 2.6, ga: 0, con: 1.3,  cx: -.1,  cy: 0,   zm: 1.05 }
  };

  var VERT = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  var FRAG = '#version 300 es\n' +
'precision highp float;\n' +
'uniform vec2 iResolution;uniform float iTime;uniform float uTimeSpeed;uniform float uColorBalance;uniform float uWarpStrength;uniform float uWarpFrequency;uniform float uWarpSpeed;uniform float uWarpAmplitude;uniform float uBlendAngle;uniform float uBlendSoftness;uniform float uRotationAmount;uniform float uNoiseScale;uniform float uGrainAmount;uniform float uGrainScale;uniform float uGrainAnimated;uniform float uContrast;uniform float uGamma;uniform float uSaturation;uniform vec2 uCenterOffset;uniform float uZoom;uniform vec3 uColor1;uniform vec3 uColor2;uniform vec3 uColor3;uniform float uLightMode;out vec4 fragColor;\n' +
'#define S(a,b,t) smoothstep(a,b,t)\n' +
'mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}\n' +
'vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}\n' +
'float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}\n' +
'void main(){\n' +
'  float t=iTime*uTimeSpeed;\n' +
'  vec2 uv=gl_FragCoord.xy/iResolution.xy;\n' +
'  float ratio=iResolution.x/iResolution.y;\n' +
'  vec2 tuv=uv-0.5+uCenterOffset;\n' +
'  tuv/=max(uZoom,0.001);\n' +
'  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);\n' +
'  tuv.y*=1.0/ratio;\n' +
'  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));\n' +
'  tuv.y*=ratio;\n' +
'  float frequency=uWarpFrequency;\n' +
'  float ws=max(uWarpStrength,0.001);\n' +
'  float amplitude=uWarpAmplitude/ws;\n' +
'  float warpTime=t*uWarpSpeed;\n' +
'  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;\n' +
'  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);\n' +
'  vec3 colLav=uColor1;vec3 colOrg=uColor2;vec3 colDark=uColor3;\n' +
'  float b=uColorBalance;float s=max(uBlendSoftness,0.0);\n' +
'  mat2 blendRot=Rot(radians(uBlendAngle));\n' +
'  float blendX=(tuv*blendRot).x;\n' +
'  float edge0=-0.3-b-s;float edge1=0.2-b+s;\n' +
'  float v0=0.5-b+s;float v1=-0.3-b-s;\n' +
'  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));\n' +
'  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));\n' +
'  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));\n' +
'  vec2 grainUv=uv*max(uGrainScale,0.001);\n' +
'  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}\n' +
'  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);\n' +
'  col+=(grain-0.5)*uGrainAmount;\n' +
'  col=(col-0.5)*uContrast+0.5;\n' +
'  float luma=dot(col,vec3(0.2126,0.7152,0.0722));\n' +
'  col=mix(vec3(luma),col,uSaturation);\n' +
'  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));\n' +
'  col=clamp(col,0.0,1.0);\n' +
'  fragColor=vec4(col,1.0);\n' +
'}';

  function hx(h) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
  }

  hosts.forEach(function (host) {
    var cfg = CFG[host.getAttribute('data-g')];
    if (!cfg) return;
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return; /* plan B: tinte sólido */
    host.insertBefore(canvas, host.firstChild);

    function sh(type, src) {
      var o = gl.createShader(type);
      gl.shaderSource(o, src); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.error('grainient shader:', gl.getShaderInfoLog(o)); return null; }
      return o;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prg = gl.createProgram();
    gl.attachShader(prg, vs); gl.attachShader(prg, fs); gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { console.error('grainient link:', gl.getProgramInfoLog(prg)); return; }
    gl.useProgram(prg);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prg, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    function U(n) { return gl.getUniformLocation(prg, n); }
    var uT = U('iTime'), uR = U('iResolution');
    gl.uniform1f(U('uTimeSpeed'), cfg.ts);       gl.uniform1f(U('uColorBalance'), cfg.bal);
    gl.uniform1f(U('uWarpStrength'), cfg.wst);   gl.uniform1f(U('uWarpFrequency'), cfg.wf);
    gl.uniform1f(U('uWarpSpeed'), cfg.wsp);      gl.uniform1f(U('uWarpAmplitude'), cfg.wam);
    gl.uniform1f(U('uBlendAngle'), cfg.ang);     gl.uniform1f(U('uBlendSoftness'), cfg.soft);
    gl.uniform1f(U('uRotationAmount'), cfg.rot); gl.uniform1f(U('uNoiseScale'), cfg.ns);
    gl.uniform1f(U('uGrainAmount'), cfg.gr);     gl.uniform1f(U('uGrainScale'), cfg.gs);
    gl.uniform1f(U('uGrainAnimated'), cfg.ga);   gl.uniform1f(U('uContrast'), cfg.con);
    gl.uniform1f(U('uGamma'), 1);                gl.uniform1f(U('uSaturation'), 1.05);
    gl.uniform2f(U('uCenterOffset'), cfg.cx, cfg.cy);
    gl.uniform1f(U('uZoom'), cfg.zm);            gl.uniform1f(U('uLightMode'), 0);
    gl.uniform3fv(U('uColor1'), hx(cfg.c[0]));
    gl.uniform3fv(U('uColor2'), hx(cfg.c[1]));
    gl.uniform3fv(U('uColor3'), hx(cfg.c[2]));

    var SCALE = Math.min(window.devicePixelRatio || 1, 1.5) * 0.66;
    function draw(t) {
      gl.uniform1f(uT, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function size() {
      var w = Math.max(1, Math.floor(host.clientWidth * SCALE));
      var h = Math.max(1, Math.floor(host.clientHeight * SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uR, w, h);
      }
      draw(reduce ? 6 : lastT);
    }
    var lastT = 0, raf = 0, visible = false, t0 = performance.now();
    function loop(now) {
      lastT = (now - t0) / 1000;
      draw(lastT);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && visible && !reduce) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    new ResizeObserver(size).observe(host);
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { if (reduce) { size(); } else { start(); } } else { stop(); }
    }, { rootMargin: '80px' }).observe(host);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); canvas.style.display = 'none'; });
    size();
  });
})();

/* ══ Iridiscente del titular ═══════════════════════════════════
   Puerto a WebGL2 puro del componente Iridescence (React Bits).
   En vez de ir de tapiz detrás del texto (donde se comía la
   legibilidad del titular blanco), el lienzo se multiplica SOBRE
   el titular: el negro sigue negro y solo las letras se llenan de
   nácar. La salida del shader se remapea a la paleta de marca
   (morado oscuro → morado → lila → blanco), así nunca aparece el
   verde que el sistema prohíbe, y lleva un piso de luminosidad
   para que ninguna letra caiga por debajo del contraste legible.
   Sin WebGL2 el titular queda blanco como siempre. */
(function () {
  var host = document.querySelector('.hero-irid');
  if (!host) return;
  var canvas = document.createElement('canvas'), gl = null;
  try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' }); } catch (e) {}
  if (!gl) return;
  host.appendChild(canvas);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = 1.0, AMPLITUDE = 0.1;   /* mouseReact desactivado: uMouse se queda en el centro */

  var VERT = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  var FRAG = '#version 300 es\n' +
'precision highp float;\n' +
'uniform float uTime;uniform vec2 uResolution;uniform vec2 uMouse;uniform float uAmplitude;uniform float uSpeed;out vec4 fragColor;\n' +
'void main(){\n' +
'  float mr=min(uResolution.x,uResolution.y);\n' +
'  vec2 vUv=gl_FragCoord.xy/uResolution;\n' +
'  vec2 uv=(vUv*2.0-1.0)*uResolution/mr;\n' +
'  uv+=(uMouse-vec2(0.5))*uAmplitude;\n' +
'  float d=-uTime*0.5*uSpeed;\n' +
'  float a=0.0;\n' +
'  for(float i=0.0;i<8.0;++i){\n' +
'    a+=cos(i-d-a*uv.x);\n' +
'    d+=sin(uv.y*i+a);\n' +
'  }\n' +
'  d+=uTime*0.5*uSpeed;\n' +
'  vec3 col=vec3(cos(uv*vec2(d,a))*0.6+0.4,cos(a+d)*0.5+0.5);\n' +
'  col=cos(col*cos(vec3(d,a,2.5))*0.5+0.5);\n' +
'  vec3 MOR_OSC=vec3(0.180,0.043,0.541);\n' +
'  vec3 MORADO=vec3(0.318,0.106,0.859);\n' +
'  vec3 LILA=vec3(0.545,0.427,0.910);\n' +
'  vec3 BLANCO=vec3(1.0,0.98,1.0);\n' +
'  vec3 c=mix(MOR_OSC,MORADO,clamp(col.r,0.0,1.0));\n' +
'  c=mix(c,LILA,clamp(col.g,0.0,1.0));\n' +
'  c=mix(c,BLANCO,pow(clamp(col.b,0.0,1.0),2.2)*0.62);\n' +
'  c=0.40+clamp(c,0.0,1.0)*0.52;\n' +
'  fragColor=vec4(clamp(c,0.0,1.0),1.0);\n' +
'}';

  function sh(t, src) {
    var o = gl.createShader(t);
    gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.error('iridiscente shader:', gl.getShaderInfoLog(o)); return null; }
    return o;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prg = gl.createProgram();
  gl.attachShader(prg, vs); gl.attachShader(prg, fs); gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { console.error('iridiscente link:', gl.getProgramInfoLog(prg)); return; }
  gl.useProgram(prg);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prg, 'position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  function U(n) { return gl.getUniformLocation(prg, n); }
  var uTime = U('uTime'), uRes = U('uResolution');
  gl.uniform2f(U('uMouse'), 0.5, 0.5);
  gl.uniform1f(U('uAmplitude'), AMPLITUDE);
  gl.uniform1f(U('uSpeed'), SPEED);

  var t = 0, raf = 0, visible = false, t0 = performance.now();
  var SCALE = Math.min(window.devicePixelRatio || 1, 2) * 0.5;   /* campo suave: se puede pintar a media resolución */
  function frame() { gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function size() {
    var w = Math.max(1, Math.round(host.clientWidth * SCALE));
    var h = Math.max(1, Math.round(host.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    frame();
  }
  function loop(now) { t = (now - t0) / 1000; frame(); raf = requestAnimationFrame(loop); }
  function start() { if (!raf && visible && !reduce && !document.hidden) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  new ResizeObserver(size).observe(host);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { rootMargin: '80px' }).observe(host);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); canvas.style.display = 'none'; });
  size();
})();

/* ══ Seda del hero ═════════════════════════════════════════════
   Puerto a WebGL2 puro del componente Silk (React Bits), con el
   shader original tal cual (patrón de seda por senos + grano por
   píxel). Va de telón DETRÁS de las letras: el titular completo
   se mezcla encima en "lighten", así que su caja negra desaparece
   en la seda y solo las letras (con piso de luminosidad 0.40)
   quedan flotando. Por eso el color de la seda es un morado
   profundo con tope 0.369 por canal: matemáticamente nunca puede
   tocar una letra. Sin WebGL2 el hero queda negro como siempre;
   con movimiento reducido se pinta un solo cuadro estático. */
(function () {
  var host = document.querySelector('.hero-silk');
  if (!host) return;
  var canvas = document.createElement('canvas'), gl = null;
  try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' }); } catch (e) {}
  if (!gl) return;
  host.appendChild(canvas);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Parámetros del componente original: speed 5, scale 1, rotation 0,
     noiseIntensity 1.5. Solo cambia el color: #26095E, morado profundo. */
  var SPEED = 5.0, SCALE_P = 1.0, ROT = 0.0, NOISE = 1.5;
  var COLOR = [0.149, 0.035, 0.369];

  var VERT = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  var FRAG = '#version 300 es\n' +
'precision highp float;\n' +
'uniform float uTime;uniform vec2 uResolution;uniform vec3 uColor;uniform float uSpeed;uniform float uScale;uniform float uRotation;uniform float uNoiseIntensity;out vec4 fragColor;\n' +
'const float e = 2.71828182845904523536;\n' +
'float noise(vec2 texCoord){\n' +
'  float G = e;\n' +
'  vec2 r = (G * sin(G * texCoord));\n' +
'  return fract(r.x * r.y * (1.0 + texCoord.x));\n' +
'}\n' +
'vec2 rotateUvs(vec2 uv, float angle){\n' +
'  float c = cos(angle);\n' +
'  float s = sin(angle);\n' +
'  mat2 rot = mat2(c, -s, s, c);\n' +
'  return rot * uv;\n' +
'}\n' +
'void main(){\n' +
'  vec2 vUv = gl_FragCoord.xy / uResolution;\n' +
'  float rnd = noise(gl_FragCoord.xy);\n' +
'  vec2 uv = rotateUvs(vUv * uScale, uRotation);\n' +
'  vec2 tex = uv * uScale;\n' +
'  float tOffset = uSpeed * uTime;\n' +
'  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);\n' +
'  float pattern = 0.6 +\n' +
'                  0.4 * sin(5.0 * (tex.x + tex.y +\n' +
'                                   cos(3.0 * tex.x + 5.0 * tex.y) +\n' +
'                                   0.02 * tOffset) +\n' +
'                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));\n' +
'  float grain = rnd / 15.0 * uNoiseIntensity;\n' +
'  vec3 result = uColor * pattern - vec3(grain);\n' +
'  fragColor = vec4(clamp(result, 0.0, 1.0), 1.0);\n' +
'}';

  function sh(t, src) {
    var o = gl.createShader(t);
    gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.error('seda shader:', gl.getShaderInfoLog(o)); return null; }
    return o;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prg = gl.createProgram();
  gl.attachShader(prg, vs); gl.attachShader(prg, fs); gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { console.error('seda link:', gl.getProgramInfoLog(prg)); return; }
  gl.useProgram(prg);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prg, 'position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  function U(n) { return gl.getUniformLocation(prg, n); }
  var uTime = U('uTime'), uRes = U('uResolution');
  gl.uniform3f(U('uColor'), COLOR[0], COLOR[1], COLOR[2]);
  gl.uniform1f(U('uSpeed'), SPEED);
  gl.uniform1f(U('uScale'), SCALE_P);
  gl.uniform1f(U('uRotation'), ROT);
  gl.uniform1f(U('uNoiseIntensity'), NOISE);

  /* el original avanza uTime a 0.1 × segundos reales */
  var t = 0, last = 0, raf = 0, visible = false;
  var SCALE = Math.min(window.devicePixelRatio || 1, 2) * 0.5;   /* campo suave: media resolución basta */
  function frame() { gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function size() {
    var w = Math.max(1, Math.round(host.clientWidth * SCALE));
    var h = Math.max(1, Math.round(host.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    frame();
  }
  function loop(now) {
    if (last) t += Math.min((now - last), 100) * 0.0001;
    last = now;
    frame();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && visible && !reduce && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  new ResizeObserver(size).observe(host);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { rootMargin: '80px' }).observe(host);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); canvas.style.display = 'none'; });
  size();
})();


/* ══ Listón de scroll ══════════════════════════════════════════
   Puerto a WebGL2 puro del componente Ribbons (React Bits), con
   su misma física (resorte + fricción en la cabeza, lerp con
   envejecimiento en la cola) y su mismo shader de polilínea con
   grosor en espacio de pantalla. Diferencias deliberadas, todas
   al servicio del scroll: la cabeza no sigue al mouse sino tu
   posición en la página (arriba = arriba); la velocidad del
   scroll agranda el vaivén; el desvanecido corre a lo LARGO del
   listón (vUV.x) para que la cola se apague, no a lo ancho; y
   cada listón se dibuja dos veces (halo grueso translúcido +
   trazo fino) para que brille sobre el negro y el crema.
   Con movimiento reducido o sin WebGL2 no hay listón: el índice
   01-06 de la izquierda ya marca la posición. */
(function () {
  var host = document.querySelector('.scroll-ribbon');
  if (!host) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { host.parentNode.removeChild(host); return; }
  var canvas = document.createElement('canvas'), gl = null;
  try { gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: true, powerPreference: 'low-power' }); } catch (e) {}
  if (!gl) { host.parentNode.removeChild(host); return; }
  host.appendChild(canvas);

  /* Constantes del componente original (baseSpring 0.03, baseFriction 0.9,
     offsetFactor 0.05, maxAge 500, pointCount 50, speedMultiplier 0.6). */
  var BASE_SPRING = 0.03, BASE_FRICTION = 0.9, OFFSET = 0.05;
  var MAX_AGE = 500, COUNT = 50, SPEED_MULT = 0.6;
  /* Envergadura estructural: el original vive de la velocidad del mouse; una
     cabeza de scroll casi quieta colapsaría los 50 puntos en uno (distancia 0
     → el shader anula el grosor). Cada punto cuelga a altura fija sobre el
     anterior: serpentina vertical siempre visible, la física pone el latigazo. */
  var LEN = 0.85, SPACING = LEN / (COUNT - 1);
  var RIBBONS = [
    { color: [0.545, 0.427, 0.910], thickness: 64 },   /* lila  #8B6DE8 */
    { color: [0.318, 0.106, 0.859], thickness: 46 }    /* morado #511BDB */
  ];
  var GLOW_SCALE = 5.0, GLOW_OPACITY = 0.16, CORE_OPACITY = 0.9;
  /* Onda viajera a lo largo del listón: ondula aun con el scroll quieto y,
     con fase distinta por listón, el lila y el morado se trenzan entre sí.
     La amplitud crece hacia la cola: la cabeza sigue marcando la posición. */
  var WAVE_AMP = 0.10, WAVE_K = 0.30, WAVE_SPEED = 2.2;

  var VERT =
'precision highp float;\n' +
'attribute vec3 position;\n' +
'attribute vec3 next;\n' +
'attribute vec3 prev;\n' +
'attribute vec2 uv;\n' +
'attribute float side;\n' +
'uniform vec2 uResolution;\n' +
'uniform float uDPR;\n' +
'uniform float uThickness;\n' +
'varying vec2 vUV;\n' +
'vec4 getPosition() {\n' +
'    vec4 current = vec4(position, 1.0);\n' +
'    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);\n' +
'    vec2 nextScreen = next.xy * aspect;\n' +
'    vec2 prevScreen = prev.xy * aspect;\n' +
'    vec2 tangent = normalize(nextScreen - prevScreen);\n' +
'    vec2 normal = vec2(-tangent.y, tangent.x);\n' +
'    normal /= aspect;\n' +
'    normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));\n' +
'    float dist = length(nextScreen - prevScreen);\n' +
'    normal *= smoothstep(0.0, 0.02, dist);\n' +
'    float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);\n' +
'    float pixelWidth = current.w * pixelWidthRatio;\n' +
'    normal *= pixelWidth * uThickness;\n' +
'    current.xy -= normal * side;\n' +
'    return current;\n' +
'}\n' +
'void main() {\n' +
'    vUV = uv;\n' +
'    gl_Position = getPosition();\n' +
'}';
  var FRAG =
'precision highp float;\n' +
'uniform vec3 uColor;\n' +
'uniform float uOpacity;\n' +
'varying vec2 vUV;\n' +
'void main() {\n' +
'    float fadeFactor = 1.0 - smoothstep(0.35, 1.0, vUV.x);\n' +
'    gl_FragColor = vec4(uColor, uOpacity * fadeFactor);\n' +
'}';

  function sh(t, src) {
    var o = gl.createShader(t);
    gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.error('listón shader:', gl.getShaderInfoLog(o)); return null; }
    return o;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prg = gl.createProgram();
  gl.attachShader(prg, vs); gl.attachShader(prg, fs); gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { console.error('listón link:', gl.getProgramInfoLog(prg)); return; }
  gl.useProgram(prg);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  /* ── Geometría de polilínea: 2 vértices por punto, como ogl ── */
  var V = COUNT * 2;
  var aPos = new Float32Array(V * 2), aPrev = new Float32Array(V * 2), aNext = new Float32Array(V * 2);
  var aUv = new Float32Array(V * 2), aSide = new Float32Array(V);
  for (var i = 0; i < COUNT; i++) {
    var x = i / (COUNT - 1);
    aUv.set([x, 0, x, 1], i * 4);
    aSide[i * 2] = 1; aSide[i * 2 + 1] = -1;
  }
  var idx = new Uint16Array((COUNT - 1) * 6);
  for (i = 0; i < COUNT - 1; i++) {
    idx.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3], i * 6);
  }
  function makeBuf(data, dyn) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    return b;
  }
  function attr(name, buf, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    var l = gl.getAttribLocation(prg, name);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
  }
  var bPos = makeBuf(aPos, true), bPrev = makeBuf(aPrev, true), bNext = makeBuf(aNext, true);
  attr('position', bPos, 2); attr('prev', bPrev, 2); attr('next', bNext, 2);
  attr('uv', makeBuf(aUv, false), 2); attr('side', makeBuf(aSide, false), 1);
  var bIdx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bIdx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  function U(n) { return gl.getUniformLocation(prg, n); }
  var uRes = U('uResolution'), uDPR = U('uDPR'), uTh = U('uThickness'), uCol = U('uColor'), uOp = U('uOpacity');

  /* ── Estado físico: igual que el original, con azar por listón ── */
  var center = (RIBBONS.length - 1) / 2;
  var lines = RIBBONS.map(function (r, index) {
    var pts = [];
    for (var k = 0; k < COUNT; k++) pts.push({ x: 0, y: 0 });
    return {
      color: r.color, thickness: r.thickness + (Math.random() - 0.5) * 3,
      spring: BASE_SPRING + (Math.random() - 0.5) * 0.05,
      friction: BASE_FRICTION + (Math.random() - 0.5) * 0.05,
      offX: (index - center) * OFFSET + (Math.random() - 0.5) * 0.01,
      offY: (Math.random() - 0.5) * 0.1,
      phase: index * 1.7,
      velX: 0, velY: 0, points: pts
    };
  });

  /* La cabeza sigue tu posición de scroll; el vaivén crece con la velocidad */
  function progreso() {
    var L = window.__saphiLenis;
    if (L && typeof L.progress === 'number' && isFinite(L.progress)) return Math.max(0, Math.min(1, L.progress));
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(1, (window.scrollY || 0) / max));
  }
  function velocidad() {
    var L = window.__saphiLenis;
    return (L && isFinite(L.velocity)) ? Math.abs(L.velocity) : 0;
  }
  var p0 = progreso(), y0 = 0.80 - p0 * 1.68;
  lines.forEach(function (l) { l.points.forEach(function (p) { p.x = l.offX; p.y = y0 + l.offY; }); });

  var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  function size() {
    var w = Math.max(1, Math.round(host.clientWidth * dpr));
    var h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  var gx = new Float32Array(COUNT), gy = new Float32Array(COUNT);
  function updateGeometry(l) {
    var pts = l.points, n = pts.length, k;
    for (k = 0; k < n; k++) {
      var onda = Math.sin(t * WAVE_SPEED + k * WAVE_K + l.phase) * WAVE_AMP * (0.2 + 0.8 * k / (n - 1));
      gx[k] = pts[k].x + onda; gy[k] = pts[k].y + k * SPACING;
    }
    for (k = 0; k < n; k++) {
      var pvx = k > 0 ? gx[k - 1] : 2 * gx[0] - gx[1];
      var pvy = k > 0 ? gy[k - 1] : 2 * gy[0] - gy[1];
      var nxx = k < n - 1 ? gx[k + 1] : 2 * gx[n - 1] - gx[n - 2];
      var nxy = k < n - 1 ? gy[k + 1] : 2 * gy[n - 1] - gy[n - 2];
      aPos.set([gx[k], gy[k], gx[k], gy[k]], k * 4);
      aPrev.set([pvx, pvy, pvx, pvy], k * 4);
      aNext.set([nxx, nxy, nxx, nxy], k * 4);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, bPrev); gl.bufferSubData(gl.ARRAY_BUFFER, 0, aPrev);
    gl.bindBuffer(gl.ARRAY_BUFFER, bNext); gl.bufferSubData(gl.ARRAY_BUFFER, 0, aNext);
  }
  function drawLine(l) {
    updateGeometry(l);
    gl.uniform3f(uCol, l.color[0], l.color[1], l.color[2]);
    gl.uniform1f(uTh, l.thickness * GLOW_SCALE); gl.uniform1f(uOp, GLOW_OPACITY);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    gl.uniform1f(uTh, l.thickness); gl.uniform1f(uOp, CORE_OPACITY);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }

  var raf = 0, last = performance.now(), visible = true, t = 0;
  var segDelay = MAX_AGE / (COUNT - 1);
  function step(dt) {
    t += Math.min(dt, 100) * 0.001;

    var pr = progreso(), vel = velocidad();
    var sway = 0.15 + Math.min(0.32, vel * 0.010);
    var tx = Math.sin(t * 0.9) * sway + Math.sin(t * 0.53 + 1.4) * sway * 0.6;
    /* de +0.80 (bajo el header) a -0.88; la cola cuelga hacia arriba */
    var ty = 0.80 - pr * 1.68 + Math.sin(t * 0.7 + 0.6) * 0.02;

    lines.forEach(function (l) {
      /* física original: resorte a la cabeza, fricción, lerp envejecido */
      var fx = (tx + l.offX - l.points[0].x) * l.spring;
      var fy = (ty + l.offY - l.points[0].y) * l.spring;
      l.velX = (l.velX + fx) * l.friction;
      l.velY = (l.velY + fy) * l.friction;
      l.points[0].x += l.velX; l.points[0].y += l.velY;
      var alpha = Math.min(1, (dt * SPEED_MULT) / segDelay);
      for (var k = 1; k < l.points.length; k++) {
        l.points[k].x += (l.points[k - 1].x - l.points[k].x) * alpha;
        l.points[k].y += (l.points[k - 1].y - l.points[k].y) * alpha;
      }
    });

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uDPR, dpr);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawLine(lines[1]);   /* morado detrás */
    drawLine(lines[0]);   /* lila al frente */
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = now - last; last = now;
    step(dt);
  }
  function start() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  new ResizeObserver(size).observe(host);
  /* display:none del media query ≤1180px también apaga el bucle */
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(host);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); canvas.style.display = 'none'; });
  size();
  start();
  step(16.7);   /* primer cuadro síncrono: en entornos sin rAF el listón existe igual */
  window.__saphiRibbonTick = step;   /* para pruebas, como __agAbrir */
})();

