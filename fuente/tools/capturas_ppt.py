"""Captura cada lámina (y los pasos que cambian lo que se ve) para la versión en PowerPoint.

Uso: python3 -I tools/capturas_ppt.py <raiz_web> <dir_salida>
"""
import os
import re
import subprocess
import sys

raiz, salida = sys.argv[1], sys.argv[2]
idx = os.path.abspath(os.path.join(raiz, 'dist', 'local.html'))
ids = re.findall(r'<section class="lamina[^"]*" id="([^"]+)"', open(idx, encoding='utf-8').read())
PASOS = {'vocacion': [0, 1], 'conciencia': [0, 1, 2, 3], 'milagros': [0, 1]}
os.makedirs(salida, exist_ok=True)
chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
n = 0
for i in ids:
    for paso in PASOS.get(i, [None]):
        n += 1
        nombre = '%02d_%s%s.png' % (n, i, '' if paso is None else '_p%d' % paso)
        png = os.path.abspath(os.path.join(salida, nombre))
        q = '?captura' + ('' if paso is None else '&paso=%d' % paso)
        subprocess.run([chrome, '--headless=new', '--hide-scrollbars', '--allow-file-access-from-files',
                        '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-prefers-reduced-motion',
                        '--virtual-time-budget=8000', '--window-size=1920,1080', '--force-device-scale-factor=1',
                        '--screenshot=' + png, 'file://' + idx + q + '#' + i],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
        print(nombre, 'ok' if os.path.exists(png) else 'FALLÓ')
