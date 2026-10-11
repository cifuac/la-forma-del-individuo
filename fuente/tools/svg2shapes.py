"""Convierte los contornos SVG exportados por Affinity (M/L/C/Z absolutos) en formas para THREE.Shape.

Uso: python3 -I svg2shapes.py <salida.json> nombre=archivo.svg ...
Cada forma: {"outer": [cmds], "holes": [[cmds], ...]}; cmds = ["M",x,y] | ["L",x,y] | ["C",x1,y1,x2,y2,x,y].
Coordenadas centradas en la caja del glifo y con el eje Y hacia arriba (convención de three.js).
"""
import json
import re
import sys


def parse(path):
    src = open(path, encoding="utf-8").read()
    tx, ty = 0.0, 0.0
    m = re.search(r'matrix\(1,0,0,1,([-\d.]+),([-\d.]+)\)', src)
    if m:
        tx, ty = float(m.group(1)), float(m.group(2))
    subpaths = []
    for d in re.findall(r'<path d="([^"]+)"', src):
        toks = re.findall(r'[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?', d)
        i, cur, cmd = 0, None, None
        while i < len(toks):
            t = toks[i]
            if t in 'MLCZ':
                cmd = t
                i += 1
                if cmd == 'Z':
                    if cur:
                        subpaths.append(cur)
                    cur = None
                    continue
            n = {'M': 2, 'L': 2, 'C': 6}[cmd]
            vals = [float(v) for v in toks[i:i + n]]
            i += n
            pts = [(vals[k] + tx, vals[k + 1] + ty) for k in range(0, n, 2)]
            if cmd == 'M':
                if cur:
                    subpaths.append(cur)
                cur = [['M', *pts[0]]]
                cmd = 'L'
            elif cmd == 'L':
                cur.append(['L', *pts[0]])
            else:
                cur.append(['C', *pts[0], *pts[1], *pts[2]])
        if cur:
            subpaths.append(cur)
    return subpaths


def sample(sp):
    pts, last = [], None
    for c in sp:
        if c[0] in 'ML':
            last = (c[1], c[2])
            pts.append(last)
        else:
            x0, y0 = last
            for k in range(1, 9):
                t = k / 8
                a, b, cc, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
                pts.append((a * x0 + b * c[1] + cc * c[3] + d * c[5], a * y0 + b * c[2] + cc * c[4] + d * c[6]))
            last = (c[5], c[6])
    return pts


def area(p):
    return 0.5 * sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))


def inside(pt, poly):
    x, y, c = pt[0], pt[1], False
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def build(path):
    sps = parse(path)
    polys = [sample(s) for s in sps]
    xs = [p[0] for poly in polys for p in poly]
    ys = [p[1] for poly in polys for p in poly]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    depth = []
    for i, poly in enumerate(polys):
        depth.append(sum(1 for j, q in enumerate(polys) if j != i and abs(area(q)) > abs(area(poly)) and inside(poly[0], q)))

    def tr(sp):
        out = []
        for c in sp:
            v = c[1:]
            nv = []
            for k in range(0, len(v), 2):
                nv += [round(v[k] - cx, 2), round(-(v[k + 1] - cy), 2)]
            out.append([c[0], *nv])
        return out

    shapes = []
    for i, sp in enumerate(sps):
        if depth[i] % 2 == 0:
            holes = [tr(sps[j]) for j in range(len(sps)) if depth[j] == depth[i] + 1 and inside(polys[j][0], polys[i])]
            shapes.append({"outer": tr(sp), "holes": holes})
    return {"w": round(w, 1), "h": round(h, 1), "shapes": shapes}


if __name__ == '__main__':
    res = {}
    for arg in sys.argv[2:]:
        name, f = arg.split('=', 1)
        res[name] = build(f)
        print(name, res[name]['w'], res[name]['h'], len(res[name]['shapes']), [len(s['holes']) for s in res[name]['shapes']])
    json.dump(res, open(sys.argv[1], 'w'), separators=(',', ':'))
