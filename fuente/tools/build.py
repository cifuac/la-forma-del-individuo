"""Arma dist/index.html a partir de src/ (plantilla, CSS, JS y una lámina por archivo, en orden de nombre).

Uso: python3 -I tools/build.py <raiz_web>
"""
import glob
import os
import re
import sys

raiz = sys.argv[1]
src = os.path.join(raiz, 'src')
dist = os.path.join(raiz, 'dist')


def leer(*p):
    with open(os.path.join(src, *p), encoding='utf-8') as f:
        return f.read()


laminas = sorted(glob.glob(os.path.join(src, 'slides', '*.html')))
html = '\n'.join(open(f, encoding='utf-8').read().strip() for f in laminas)
import json
# Figuras animadas (prensa, balanza, banco óptico): un solo kit y un bloque de código por figura
COMUN = '''
.FIG .iso-figure{margin:0}
.FIG .iso-plate{padding:64px 28px;background:#FAFAF7;box-shadow:0 0 0 1.5px #C9D6E3}
.FIG .iso-plate-corners{inset:22px 26px}
.FIG .iso-plate-corner{font-size:18px;letter-spacing:.04em}
.FIG .iso-legend{margin-top:16px;font:400 22px/1.35 var(--f-rotulo);color:var(--texto)}
.FIG .iso-keys{display:flex;flex-direction:column;gap:6px}
.FIG .iso-key{display:flex;align-items:center;gap:10px}
.FIG .iso-swatch{width:26px;height:16px}
.FIG .iso-caption{display:none}
.FIG .iso-stage{cursor:ew-resize;touch-action:none;outline:none}
'''
FIGS = [
    ('prensa', 'left:1088px;top:92px;width:732px', ''),
    ('balanza', 'left:1004px;top:80px;width:786px', '.balanza-figura .iso-plate{padding:52px 24px}'),
    ('banco', 'left:962px;top:150px;width:830px', '.banco-figura .iso-plate{padding:52px 24px}'),
]
def figura(nombre):
    ruta = os.path.join(src, 'fig_%s.json' % nombre)
    return json.load(open(ruta, encoding='utf-8')) if os.path.exists(ruta) else None
kit = figura('prensa')
FIG_CSS, FIG_JS = kit['isoCss'], kit['kit']
for nombre, pos, extra in FIGS:
    f = figura(nombre)
    marca = '{{FIG_%s}}' % nombre.upper()
    if not f or marca not in html:
        continue
    clase = '.%s-figura' % nombre
    FIG_CSS += f['css'] + COMUN.replace('.FIG', clase) + '%s{position:absolute;%s}\n%s\n' % (clase, pos, extra)
    FIG_JS += '\n{\n' + f['live'] + '\n}\n'
    html = html.replace(marca, '<div class="%s-figura iso %s-tema" data-theme="light">%s</div>' % (nombre, nombre, f['body']))
out = (leer('index.tpl.html')
       .replace('{{CSS}}', leer('deck.css') + FIG_CSS)
       .replace('{{SLIDES}}', html)
       .replace('{{GLIFOS}}', leer('glifos.json'))
       .replace('{{G3D}}', leer('g3d.js'))
       .replace('{{JS}}', leer('deck.js')))
out = out + '\n<script type="module">\n' + FIG_JS.replace('</script', '<\\/script') + '\n</script>\n'

refs = set(re.findall(r'="(img/[^"]+)"', out))
refs |= set(re.findall(r'url\(["\']?(img/[^"\')]+)', out))
faltan = sorted(r for r in refs if not os.path.exists(os.path.join(dist, r)))
ids = re.findall(r'<section class="lamina[^"]*" id="([^"]+)"', out)
dup = sorted({i for i in ids if ids.count(i) > 1})
with open(os.path.join(dist, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(out)
# Copia autónoma (con su propio esqueleto) para abrir en local
local = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
         '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
         '<style>[hidden]{display:none!important}img{max-width:100%}</style>\n</head>\n<body>\n' + out + '\n</body>\n</html>\n')
with open(os.path.join(dist, 'local.html'), 'w', encoding='utf-8') as f:
    f.write(local)
usadas = sorted(refs)
print(f'{len(laminas)} láminas, {len(out) // 1024} KB, {len(usadas)} imágenes referidas')
print('ids:', ' '.join(ids))
if faltan:
    print('FALTAN:', faltan)
if dup:
    print('IDS DUPLICADOS:', dup)
