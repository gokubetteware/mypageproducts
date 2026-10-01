# Efectos de sonido generados por código (numpy), sin descargas. Catálogo base del manual maestro, sección 2b.
# Todos duran 1 s o menos y salen con pico de −16 dBFS (≥ 12 dB bajo una voz que pique en −3 dBFS o más).
# Uso: python3 tools/sfx_generar.py ../assets/sfx
import sys, os, wave, json, numpy as np
OUT = sys.argv[1]; SR = 48000; PICO_DB = -16.0
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)  # semilla fija: siempre el mismo archivo
T = lambda d: np.arange(int(d * SR)) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def lp(x, fc):  # paso bajo de un polo, en bucle simple (archivos cortos)
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y

def fade(x, fi=0.004, fo=0.02):
    n = len(x); a = int(fi * SR); b = int(fo * SR)
    x[:a] *= np.linspace(0, 1, a); x[n - b:] *= np.linspace(1, 0, b); return x

def campana(f, d, tau):
    t = T(d); return (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*2.76*f*t)*np.exp(-t/(tau/3))) * np.exp(-t/tau)

def whoosh():  # ruido filtrado con barrido de volumen, 0.5 s
    t = T(0.5); n = rng.standard_normal(len(t))
    e = np.sin(np.pi * t / 0.5) ** 2
    return lp(lp(n, 900), 1400) * e

def tic_suave():  # tic de madera suave, 0.09 s
    t = T(0.09); return np.sin(2*np.pi*hz(84)*t) * np.exp(-t/0.012) + 0.3*lp(rng.standard_normal(len(t)), 3000)*np.exp(-t/0.004)

def tick():  # tick corto y seco, 0.06 s
    t = T(0.06); return np.sin(2*np.pi*hz(91)*t) * np.exp(-t/0.006)

def campanita_ascendente():  # dos notas que suben (buena noticia), 0.6 s
    x = np.zeros(int(0.6 * SR)); a = campana(hz(79), 0.6, 0.18); b = campana(hz(84), 0.45, 0.2)
    x += a; x[int(0.15*SR):] += b[:len(x) - int(0.15*SR)]; return x

def tono_descendente():  # tono suave que baja (mala noticia, serio, no de susto), 0.7 s
    t = T(0.7); f = hz(64) * 2 ** (-(5/12) * t / 0.7)
    ph = 2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph) + 0.25*np.sin(2*ph)) * np.minimum(1, t/0.03) * np.exp(-t/0.35)

def golpe_seco():  # golpe grave corto para ¡OJO!, 0.18 s
    t = T(0.18); f = 140 * np.exp(-t/0.05) + 60
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t/0.05) + 0.2*lp(rng.standard_normal(len(t)), 1200)*np.exp(-t/0.01)

def acorde_suave():  # acorde de pad para la pantalla petróleo, 1.0 s (va después de 0.5 s de silencio)
    t = T(1.0); e = np.minimum(1, t/0.25) * np.exp(-np.maximum(0, t-0.4)/0.25)
    return sum(np.sin(2*np.pi*hz(m)*t) for m in (57, 60, 64, 67)) * e

def pop_suave():  # pop corto para MICHI en sorpresa, 0.12 s
    t = T(0.12); f = 500 + 700 * np.exp(-t/0.02)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t/0.03)

def cierre_suave():  # resolución suave para la tarjeta final, 1.0 s
    x = np.zeros(int(1.0*SR))
    for k, m in enumerate((72, 76, 79)):
        c = campana(hz(m), 1.0, 0.45); i = int(k*0.08*SR); x[i:] += c[:len(x)-i] * 0.8
    return x

EF = {'whoosh_suave': whoosh, 'tic_suave': tic_suave, 'tick': tick, 'campanita_ascendente': campanita_ascendente,
      'tono_descendente': tono_descendente, 'golpe_seco': golpe_seco, 'acorde_suave': acorde_suave,
      'pop_suave': pop_suave, 'cierre_suave': cierre_suave}
info = {}
for nombre, fn in EF.items():
    x = fade(fn().astype(np.float64))
    x = x / np.abs(x).max() * 10 ** (PICO_DB / 20)
    with wave.open(f'{OUT}/{nombre}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
    info[nombre] = {'archivo': f'assets/sfx/{nombre}.wav', 'duracion_s': round(len(x) / SR, 3), 'pico_dbfs': PICO_DB}
json.dump(info, open(f'{OUT}/catalogo.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(info, ensure_ascii=False, indent=1))
