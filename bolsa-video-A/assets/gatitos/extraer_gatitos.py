# Extrae los gatitos del PDF «Personajes secundarios para Michi» (bocetos v0.1, 30 sep 2026)
# como SVG vectoriales limpios: los trazos originales, sin fondos, textos ni marcos.
# No se redibuja nada: cada <path> es un trazo del PDF, con su color, grosor y opacidad.
#   python3 assets/gatitos/extraer_gatitos.py <pdf>
import sys, os, json
import pymupdf as fitz

PDF = sys.argv[1]
OUT = os.path.dirname(os.path.abspath(__file__))
doc = fitz.open(PDF)
BG = ['#ECD1BC', '#E1BEA2', '#B6D3CF', '#9EC2BD', '#EDD2BC', '#E1BEA3', '#B7D3CF', '#9FC2BD']
is_bg = lambda h: any(all(abs(int(h[i:i + 2], 16) - int(b[i:i + 2], 16)) <= 4 for i in (1, 3, 5)) for b in BG)
hexc = lambda c: '#%02X%02X%02X' % tuple(round(v * 255) for v in c)
f2 = lambda v: f'{v:.2f}'.rstrip('0').rstrip('.')

def path_d(items):
    d, cur = [], None
    for it in items:
        k = it[0]
        if k == 'l':
            a, b = it[1], it[2]
            if cur is None or abs(cur.x - a.x) > 1e-3 or abs(cur.y - a.y) > 1e-3:
                d.append(f'M{f2(a.x)} {f2(a.y)}')
            d.append(f'L{f2(b.x)} {f2(b.y)}'); cur = b
        elif k == 'c':
            a, c1, c2, b = it[1:5]
            if cur is None or abs(cur.x - a.x) > 1e-3 or abs(cur.y - a.y) > 1e-3:
                d.append(f'M{f2(a.x)} {f2(a.y)}')
            d.append(f'C{f2(c1.x)} {f2(c1.y)} {f2(c2.x)} {f2(c2.y)} {f2(b.x)} {f2(b.y)}'); cur = b
        elif k == 're':
            r = it[1]
            d.append(f'M{f2(r.x0)} {f2(r.y0)}H{f2(r.x1)}V{f2(r.y1)}H{f2(r.x0)}Z'); cur = None
        elif k == 'qu':
            q = it[1]
            d.append(f'M{f2(q.ul.x)} {f2(q.ul.y)}L{f2(q.ur.x)} {f2(q.ur.y)}L{f2(q.lr.x)} {f2(q.lr.y)}L{f2(q.ll.x)} {f2(q.ll.y)}Z'); cur = None
    return ''.join(d)

def extract(pn, clip, name, filt=None):
    page = doc[pn]
    clip = fitz.Rect(clip)
    parts = []
    box = None
    for dr in page.get_drawings():
        r = dr['rect']
        if not clip.contains(r) and not (clip & r).get_area() > 0.9 * max(r.get_area(), 1e-6):
            continue
        fill = dr.get('fill')
        if fill is not None and ((is_bg(hexc(fill)) and r.width > 40 and r.height > 25) or (clip & r).get_area() > 0.85 * clip.get_area()):
            continue                                   # fondo de la lámina
        if filt and not filt(dr):
            continue
        box = r if box is None else box | r
        d = path_d(dr['items'])
        if dr.get('closePath') and not d.endswith('Z'):
            d += 'Z'
        attrs = []
        if dr['type'] in ('f', 'fs') and fill is not None:
            attrs.append(f'fill="{hexc(fill)}"')
            if dr.get('fill_opacity', 1) < 0.999: attrs.append(f'fill-opacity="{dr["fill_opacity"]:.3f}"')
            if dr.get('even_odd'): attrs.append('fill-rule="evenodd"')
        else:
            attrs.append('fill="none"')
        if dr['type'] in ('s', 'fs') and dr.get('color') is not None:
            attrs.append(f'stroke="{hexc(dr["color"])}" stroke-width="{f2(dr.get("width") or 1)}"')
            if dr.get('stroke_opacity', 1) < 0.999: attrs.append(f'stroke-opacity="{dr["stroke_opacity"]:.3f}"')
            lc = dr.get('lineCap'); lj = dr.get('lineJoin')
            if lc: attrs.append(f'stroke-linecap="{["butt", "round", "square"][max(lc) if isinstance(lc, (list, tuple)) else lc]}"')
            if lj is not None: attrs.append(f'stroke-linejoin="{["miter", "round", "bevel"][int(lj)]}"')
            if dr.get('dashes') and dr['dashes'] not in ('[] 0', '[] 0.0'):
                continue                                   # líneas punteadas de guía: fuera
        parts.append(f'<path d="{d}" {" ".join(attrs)}/>')
    # recorte ajustado a lo dibujado
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f2(clip.x0)} {f2(clip.y0)} {f2(clip.width)} {f2(clip.height)}">'
           + ''.join(parts) + '</svg>')
    open(os.path.join(OUT, name + '.svg'), 'w').write(svg)
    META[name] = {'viewBox': [round(clip.x0, 2), round(clip.y0, 2), round(clip.width, 2), round(clip.height, 2)],
                  'bbox': [round(box.x0, 2), round(box.y0, 2), round(box.x1, 2), round(box.y1, 2)], 'paths': len(parts)}
    return len(parts)
META = {}

FICHAS = {4: 'canela', 5: 'mango', 6: 'rayitas', 7: 'tigrillo', 8: 'bosco'}
EXPR = ['neutro', 'alegria', 'sorpresa', 'preocupacion', 'duda', 'alivio']
BOXES = [(39, 458, 160, 551), (167, 458, 289, 551), (296, 458, 417, 551), (424, 458, 546, 551), (554, 458, 674, 551), (682, 458, 803, 551)]
report = {}
for pn, name in FICHAS.items():
    for e, box in zip(EXPR, BOXES):
        report[f'{name}_{e}'] = extract(pn, box, f'{name}_{e}')
    report[f'{name}_ficha'] = extract(pn, (39, 94, 416, 384), f'{name}_ficha')
    # su objeto solo (frasco, ticket, tarjeta, maceta): rellenos a la derecha del gatito en la ficha
    report[f'{name}_objeto'] = extract(pn, (39, 94, 416, 384), f'{name}_objeto', lambda dr: dr['type'] == 'f' and dr['rect'].x0 >= 248)
json.dump(META, open(os.path.join(OUT, 'gatitos_meta.json'), 'w'), indent=1)
json.dump(report, open(os.path.join(OUT, 'extraccion.json'), 'w'), indent=1)
print(json.dumps(report))
