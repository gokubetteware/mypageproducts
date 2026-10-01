# Compara los pares true/false: fuera de la caja de subtítulo no debe cambiar nada.
# Se tolera ruido de antialias del navegador (diferencia ≤ 40/255), que aparece igual al repetir un mismo cuadro.
import json, sys
from PIL import Image, ImageChops
D = sys.argv[1]
pares = json.load(open(f'{D}/pares.json'))
malos = []
for p in pares:
    a = Image.open(f"{D}/true_{p['t']:.1f}.png").convert('RGB'); b = Image.open(f"{D}/false_{p['t']:.1f}.png").convert('RGB')
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 40 else 0)
    c = p['caja']
    if c:
        d.paste(0, (c['x0'] - 2, c['y0'] - 2, c['x1'] + 2, c['y1'] + 2))
    bb = d.getbbox()
    if bb: malos.append((p['t'], bb))
print(f"pares: {len(pares)} · con subtítulo: {sum(1 for p in pares if p['caja'])} · diferencias fuera de la caja: {len(malos)}", malos)
