# Música tranquila sintetizada (pieza original, sin derechos de terceros) para la prueba sin voz.
# Pad suave + bajo + notas de piano espaciadas, 72 BPM, progresión Fmaj7 – Em7 – Dm7 – Cmaj7.
# Uso: python3 tools/musica.py <duración_s> <salida.wav>
import sys, wave, numpy as np
DUR, OUT, SR = float(sys.argv[1]), sys.argv[2], 48000
BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT
n = int(DUR * SR); t = np.arange(n) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]  # F, Em, Dm, C (con séptima)
L = np.zeros(n); R = np.zeros(n)

def env(start, dur, a, r):
    i0 = int(start * SR); i1 = min(n, int((start + dur + r) * SR))
    if i0 >= n: return None, None
    tt = np.arange(i1 - i0) / SR
    e = np.minimum(1, tt / a) * np.where(tt < dur, 1, np.exp(-(tt - dur) / (r / 4)))
    return slice(i0, i1), (tt, e)

bar = 0
while bar * BAR < DUR:
    ch = CHORDS[bar % 4]; s0 = bar * BAR
    sl, (tt, e) = env(s0, BAR, 1.4, 1.6)
    if sl is None: break
    for k, m in enumerate(ch):  # pad: dos osciladores levemente desafinados por nota
        f = hz(m)
        v = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.003 * tt + k) + 0.15 * np.sin(4 * np.pi * f * tt)) * e * 0.045
        L[sl] += v * (1 - 0.15 * (k % 2)); R[sl] += v * (0.85 + 0.15 * (k % 2))
    sl2, (tb, eb) = env(s0, BAR * 0.9, 0.3, 1.0)  # bajo
    b = np.sin(2 * np.pi * hz(ch[0] - 12) * tb) * eb * 0.07
    L[sl2] += b; R[sl2] += b
    # piano: 3 notas por compás, patrón que cambia cada 4 compases
    pat = [[0, 2, 3], [3, 1, 2], [2, 3, 1], [1, 2, 0]][(bar // 4) % 4]
    for j, beat in enumerate([0.0, 1.5, 3.0]):
        if (bar // 8) % 2 == 1 and j == 1: continue  # más aire en algunas secciones
        m = ch[pat[j]] + 12; st = s0 + beat * BEAT
        i0 = int(st * SR)
        if i0 >= n: continue
        i1 = min(n, i0 + int(3.5 * SR)); tp = np.arange(i1 - i0) / SR
        ep = np.minimum(1, tp / 0.008) * np.exp(-tp / 0.9)
        f = hz(m)
        v = (np.sin(2 * np.pi * f * tp) + 0.3 * np.sin(4 * np.pi * f * tp) * np.exp(-tp / 0.3)) * ep * 0.06
        pan = 0.35 + 0.3 * (j / 2)
        L[i0:i1] += v * (1 - pan); R[i0:i1] += v * pan
    bar += 1

# eco suave y filtro paso bajo de un polo (sonido cálido)
d = int(0.42 * SR)
L[d:] += 0.22 * R[:-d]; R[d:] += 0.22 * L[:-d]
x = np.stack([L, R], 1)
x = x / (np.abs(x).max() + 1e-9) * 0.8
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype('<i2').tobytes())
print('escrito', OUT, f'{DUR:.1f} s')
