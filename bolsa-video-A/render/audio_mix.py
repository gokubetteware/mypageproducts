# Audio del video: música ambiental + efectos de sonido, SINTETIZADOS aquí (sin muestras ni
# archivos de terceros: 100 % propios, sin copyright ajeno), mezclados con la voz.
#   python3 render/audio_mix.py [--hasta S]      → render/musica.wav, render/sfx_track.wav, render/mezcla.wav
# Determinista: misma entrada = mismo audio (semilla fija).
import json, os, sys, subprocess
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.join(os.path.dirname(__file__), '..')
SR = 48000
args = sys.argv[1:]
HASTA = float(args[args.index('--hasta') + 1]) if '--hasta' in args else None
TL = json.load(open(os.path.join(ROOT, 'timeline/timeline_final.json')))
SFXJ = json.load(open(os.path.join(ROOT, 'render/sfx_eventos.json')))
DUR = HASTA or TL['duracion_s']
N = int(DUR * SR) + SR
rng = np.random.default_rng(2026)
t_ = lambda d: np.arange(int(d * SR)) / SR
db = lambda x: 10 ** (x / 20)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def env(n, a, r):                       # ataque lineal + caída exponencial
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def put(buf, x, t0, g=1.0):
    i = int(t0 * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += x * g

# ---------------------------------------------------------------- música
# Do mayor, 72 bpm, cálida y tranquila: Cmaj9 · Am9 · Fmaj9 · G6, dos compases cada uno.
BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT
CH = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 55, 57], [43, 50, 55, 57, 59]]
esc = {e['id']: e for e in TL['escenas']}
S03, S04 = esc['S03']['start'], esc['S04']['start']
S06 = esc['S06']['start']
endscreen = next(e['t'] for e in TL['eventos'] if e['do'] == 'cut_to_end_screen')

def pad(notes, d):
    t = t_(d); s = np.zeros_like(t)
    for m in notes[1:]:
        for det in (-0.08, 0.08):
            f = hz(m + 12) * 2 ** (det / 12)
            for k, a in ((1, 1), (2, .35), (3, .18), (4, .08)):
                s += a * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28))
    a = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.2)
    return lp(s * a, 1400) / 18
def keys(m, d, vel):
    t = t_(d); f = hz(m)
    s = np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) + .06 * np.sin(2 * np.pi * 3 * f * t)
    return s * env(len(t), .006, .55) * vel * .22
def bass(m, d):
    t = t_(d); f = hz(m - 12)
    return (np.sin(2 * np.pi * f * t) + .15 * np.sin(4 * np.pi * f * t)) * env(len(t), .02, 1.4) * .30
def shaker(d):
    x = hp(rng.standard_normal(int(d * SR)), 6000) * env(int(d * SR), .002, .03)
    return x * .035

musica = np.zeros(N)
bar = 0; tb = 0.0
PAT = [0, 2, 3, 1, 4, 2, 3, 1]               # arpegio (índices del acorde)
while tb < DUR:
    ch = CH[(bar // 2) % 4]
    if bar % 2 == 0: put(musica, pad(ch, 2 * BAR + 1.2), tb)
    put(musica, bass(ch[0], BAR), tb)
    energia = 1 if tb < S03 else 2 if tb < S04 else 3 if tb < S06 else 1
    for i in range(8):                           # corcheas
        ts = tb + i * BEAT / 2
        if energia == 1 and i % 2 == 1: continue # base: negras, muy espaciado
        if rng.random() < (0.25 if energia == 1 else 0.15): continue
        vel = .55 + .25 * rng.random()
        put(musica, keys(ch[PAT[i]] + 12, 1.2, vel), ts)
        if energia >= 2 and i % 2 == 1: put(musica, shaker(.1), ts)   # re-enganche: un poco más de pulso
    tb += BAR; bar += 1
fade = np.ones(N); tt = np.arange(N) / SR
fade *= np.clip(tt / 2.0, 0, 1)                                  # entrada suave
fade *= np.clip((min(DUR, endscreen + 14) - tt) / 3.0, 0, 1)     # salida al final
musica = lp(musica * fade, 5000)

# ---------------------------------------------------------------- efectos (suaves, nada de alarmas)
def bell(m, d=.45, a=.35):
    t = t_(d); f = hz(m)
    return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .08)) * env(len(t), .002, d / 3) * a
def marimba(m, d=.35, a=.4):
    t = t_(d); f = hz(m)
    return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .02)) * env(len(t), .001, d / 3.5) * a
def noise(d): return rng.standard_normal(int(d * SR))
def cat(*xs, gap=0.0):
    out = np.zeros(int(sum(len(x) for x in xs) + gap * SR * len(xs)) + 1); i = 0
    for x in xs: out[i:i + len(x)] += x; i += len(x) + int(gap * SR)
    return out
def mix_at(parts):
    L = max(int(t0 * SR) + len(x) for t0, x in parts); out = np.zeros(L)
    for t0, x in parts: out[int(t0 * SR):int(t0 * SR) + len(x)] += x
    return out
FX = {
    'moneda': lambda: mix_at([(0, bell(96, .25, .25) + bell(103, .25, .12)), (.05, bell(100, .2, .1))]),
    'sube': lambda: mix_at([(0, bell(88, .5, .3)), (.11, bell(95, .6, .3))]),
    'baja': lambda: mix_at([(0, marimba(69, .45, .35)), (.14, marimba(64, .55, .35))]),
    'pop': lambda: (lambda t: np.sin(2 * np.pi * (900 * np.exp(-t / .03) + 260) * t) * env(len(t), .002, .04) * .35)(t_(.12)),
    'pasos': lambda: mix_at([(k * .13, lp(noise(.03), 900) * env(int(.03 * SR), .001, .01) * .5) for k in range(3)]),
    'tarjeta': lambda: bp(noise(.28), 1800, 5000) * np.sin(np.linspace(0, np.pi, int(.28 * SR))) * .06,
    'suave': lambda: marimba(84, .2, .22),
    'pregunta': lambda: mix_at([(0, marimba(72, .35, .3)), (.16, marimba(79, .5, .3))]),
    'ojo': lambda: mix_at([(0, marimba(67, .4, .38)), (.2, marimba(74, .5, .38))]),
    'zoom': lambda: (lambda t: bp(noise(.7), 400, 3000) * (t / .7) ** 2 * np.exp(-np.maximum(0, t - .6) / .05) * .05)(t_(.7)),
    'blip': lambda: (lambda t: np.sin(2 * np.pi * (1100 + 600 * t / .08) * t) * env(len(t), .002, .03) * .22)(t_(.09)),
    'cuadricula': lambda: mix_at([(k * .06, marimba(96 + (k % 3), .06, .08)) for k in range(10)]),
    'elige': lambda: mix_at([(0, bell(91, .3, .18)), (.07, bell(95, .3, .18)), (.14, bell(98, .4, .18))]),
    'lapiz': lambda: bp(noise(.8), 2500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t_(.8))) * np.sin(np.linspace(0, np.pi, int(.8 * SR))) * .05,
    'intro': lambda: mix_at([(k * .09, bell(m, 1.2, .16)) for k, m in enumerate([72, 76, 79, 83, 86])]),
    'outro': lambda: mix_at([(k * .12, bell(m, 1.6, .18)) for k, m in enumerate([79, 76, 72, 84])]),
}
sfx = np.zeros(N)
usados = {}
for e in SFXJ['eventos']:
    if e['t'] >= DUR: continue
    if e['k'] not in FX: raise SystemExit('efecto sin sonido definido: ' + e['k'])
    put(sfx, FX[e['k']](), e['t'])
    usados[e['k']] = usados.get(e['k'], 0) + 1

# ---------------------------------------------------------------- voz + mezcla con «ducking»
vpath = os.path.join(ROOT, 'render/.voz48.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(ROOT, 'voz/voz_completa.mp3'), '-af',
                'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000', '-ar', '48000', '-ac', '1', '-f', 'f32le', vpath], check=True)
voz = np.fromfile(vpath, dtype=np.float32).astype(np.float64); os.remove(vpath)
# control: la voz procesada debe durar lo mismo que el archivo original (loudnorm sube a 192 kHz si no se re-muestrea)
dur_orig = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
    os.path.join(ROOT, 'voz/voz_completa.mp3')], capture_output=True, text=True).stdout)
assert abs(len(voz) / SR - dur_orig) < 0.1, f'la voz procesada dura {len(voz) / SR:.2f} s y el original {dur_orig:.2f} s'
voz = np.pad(voz, (0, max(0, N - len(voz))))[:N]
# envolvente de la voz → la música baja ~9 dB cuando hay voz (ataque 80 ms, salida 450 ms)
e = np.sqrt(np.maximum(0, lp(voz ** 2, 12)))
e = np.clip(e / (np.percentile(e[e > 1e-4], 90) + 1e-9), 0, 1)
g = np.empty_like(e); cur = 0.0
aa, rr = np.exp(-1 / (0.08 * SR)), np.exp(-1 / (0.45 * SR))
for i in range(len(e)):
    k = aa if e[i] > cur else rr
    cur = k * cur + (1 - k) * e[i]; g[i] = cur
duck = db(-9) + (1 - db(-9)) * (1 - g)
MUS, FXG = db(-14), db(-8)
# Decisión de Omar (30 sep): SIN música. Solo voz + efectos. (Para volver a ponerla: --con-musica)
CON_MUSICA = '--con-musica' in args
mezcla = voz + (musica * MUS * duck if CON_MUSICA else 0) + sfx * FXG
out = lambda name, x: subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-',
    '-af', 'alimiter=limit=0.89:level=false', '-c:a', 'pcm_s24le', os.path.join(ROOT, 'render', name)], input=x[:int(DUR * SR)].astype(np.float64).tobytes(), check=True)
out('musica.wav', musica * MUS)
out('sfx_track.wav', sfx * FXG)
out('mezcla_cruda.wav', mezcla)
# la voz manda: la mezcla final queda en −16 LUFS integrados y pico ≤ −1 dBTP (como pide 05_SINCRONIZACION)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(ROOT, 'render/mezcla_cruda.wav'), '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11:linear=true,aresample=48000', '-c:a', 'pcm_s24le', os.path.join(ROOT, 'render/mezcla.wav')], check=True)
os.remove(os.path.join(ROOT, 'render/mezcla_cruda.wav'))
print(f'audio: {DUR:.1f} s · efectos {sum(usados.values())} {json.dumps(usados)} · música: {"sí" if CON_MUSICA else "no"}')
