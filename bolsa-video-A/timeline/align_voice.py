# Fase 4 · Alinea el guion (docs/04_escenas.json) con la voz real.
# Entrada: voz/proc/asr_segmentos.json (tramos de voz con su texto, de timeline/asr_sherpa.py:
#          VAD silero + whisper-small, sherpa-onnx; los tramos traen inicio/fin reales).
# Dentro de cada tramo, cada palabra reconocida recibe un tiempo proporcional a su posición
# en caracteres. Luego las palabras del GUION se emparejan con las reconocidas (difflib) y
# heredan su tiempo; las que no empatan se interpolan entre vecinas del mismo tramo.
# Salida: voz/proc/cues_reales.json  { cue_id: { start, end, words: [{word, raw, start, end, afterPause}] } }
#         voz/proc/alineacion.json    (informe por cue: % de palabras alineadas)
# El TEXTO siempre es el del guion; la transcripción solo aporta tiempos.
import json, re, unicodedata, difflib, os, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
src = json.load(open(os.path.join(ROOT, 'docs/04_escenas.json')))
segs = json.load(open(os.path.join(ROOT, 'voz/proc/asr_segmentos.json')))

def strip_acc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

UNITS = {'un': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cinco': 5, 'diez': 10, 'veinte': 20, 'cincuenta': 50, 'cien': 100, 'ciento': 100}

def norm_tokens(text):
    """Texto → lista de tokens normalizados (minúsculas, sin acentos, números en dígitos)."""
    t = strip_acc(text.lower())
    t = re.sub(r'(\d)[.,](\d{3})', r'\1\2', t)
    t = re.sub(r'(\d)[.,](\d{3})', r'\1\2', t)
    t = t.replace('cat pesos', 'catpesos').replace('cad pesos', 'catpesos')
    raw = re.findall(r'[a-zñ]+|\d+', t)
    out = []
    for w in raw:
        if w == 'mil':
            if out and out[-1].isdigit():
                out[-1] = str(int(out[-1]) * 1000)
            else:
                out.append('1000')
            continue
        out.append(w)
    return out

# 1) palabras reconocidas con tiempo (proporcional a caracteres dentro de su tramo)
asr = []
for si, s in enumerate(segs):
    toks = norm_tokens(s['text'])
    if not toks:
        continue
    lens = [len(x) + 1 for x in toks]
    tot = sum(lens)
    dur = s['end'] - s['start']
    acc = 0
    for w, L in zip(toks, lens):
        st = s['start'] + dur * acc / tot
        acc += L
        asr.append({'w': w, 'start': round(st, 3), 'end': round(s['start'] + dur * acc / tot, 3), 'seg': si})

# 2) palabras del guion
PAUSE = re.compile(r'\[pausa(?:\s+([\d.]+)\s*s)?\]|\([^)]*\)|\[[^\]]*\]|([^\s]+)', re.I)
script = []
for sc in src['escenas']:
    for c in sc['cues']:
        after = False
        for m in PAUSE.finditer(c['text']):
            if m.group(0).lower().startswith('[pausa'):
                after = True
                continue
            if not m.group(2):
                continue
            raw = m.group(2).replace('*', '')
            toks = norm_tokens(raw)
            if not toks:
                continue
            script.append({'cue': c['id'], 'raw': raw, 'n': toks[0], 'afterPause': after, 'extra': toks[1:]})
            after = False

# secuencia plana del guion para comparar (una palabra del guion puede dar 2 tokens: «100,000» no, «1,500» no)
sflat = [s['n'] for s in script]
aflat = [a['w'] for a in asr]
sm = difflib.SequenceMatcher(a=sflat, b=aflat, autojunk=False)
match = {}
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        match[blk.a + k] = blk.b + k

# 3) tiempos: empatadas heredan; las demás se interpolan entre la anterior y la siguiente empatadas
N = len(script)
starts = [None] * N
ends = [None] * N
for i, j in match.items():
    starts[i] = asr[j]['start']
    ends[i] = asr[j]['end']
known = [i for i in range(N) if starts[i] is not None]
for i in range(N):
    if starts[i] is not None:
        continue
    prev = max((k for k in known if k < i), default=None)
    nxt = min((k for k in known if k > i), default=None)
    if prev is None:
        t0, t1, a, b = 0.0, starts[nxt], -1, nxt
    elif nxt is None:
        t0, t1, a, b = ends[prev], segs[-1]['end'], prev, N
    else:
        t0, t1, a, b = ends[prev], starts[nxt], prev, nxt
    span = b - a
    starts[i] = round(t0 + (t1 - t0) * (i - a - 1) / max(1, span - 1), 3) if span > 1 else t0
    ends[i] = round(starts[i] + min(0.35, max(0.12, (t1 - t0) / max(1, span - 1))), 3)

# 4) por cue
cues = {}
report = {}
for i, s in enumerate(script):
    c = cues.setdefault(s['cue'], {'words': []})
    c['words'].append({'word': s['n'], 'raw': s['raw'], 'start': starts[i], 'end': max(ends[i], starts[i] + 0.05), 'afterPause': s['afterPause']})
    r = report.setdefault(s['cue'], [0, 0])
    r[1] += 1
    if i in match:
        r[0] += 1
for cid, c in cues.items():
    c['start'] = c['words'][0]['start']
    c['end'] = c['words'][-1]['end']
os.makedirs(os.path.join(ROOT, 'voz/proc'), exist_ok=True)
json.dump(cues, open(os.path.join(ROOT, 'voz/proc/cues_reales.json'), 'w'), ensure_ascii=False, indent=1)
rep = {cid: {'alineadas': a, 'total': t, 'pct': round(100 * a / t)} for cid, (a, t) in report.items()}
json.dump(rep, open(os.path.join(ROOT, 'voz/proc/alineacion.json'), 'w'), ensure_ascii=False, indent=1)
tot_a = sum(a for a, t in report.values()); tot = sum(t for a, t in report.values())
low = [f"{cid} {v['pct']}%" for cid, v in rep.items() if v['pct'] < 80]
print(f'palabras del guion alineadas: {tot_a}/{tot} ({100*tot_a/tot:.1f} %)')
print('cues < 80 %:', ', '.join(low) or 'ninguno')
print('voz: primera palabra', starts[0], '· última', ends[-1])
