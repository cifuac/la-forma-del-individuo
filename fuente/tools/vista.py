"""Captura láminas de dist/index.html con Chrome sin interfaz (control de calidad local).

Uso: python3 -I tools/vista.py <raiz_web> <dir_salida> id1 id2 ...   (o 'todas')
"""
import os
import re
import subprocess
import sys

raiz, salida = sys.argv[1], sys.argv[2]
ids = sys.argv[3:]
idx = os.path.abspath(os.path.join(raiz, 'dist', 'local.html'))
if ids == ['todas']:
    ids = re.findall(r'<section class="lamina[^"]*" id="([^"]+)"', open(idx, encoding='utf-8').read())
os.makedirs(salida, exist_ok=True)
chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
for i in ids:
    png = os.path.abspath(os.path.join(salida, i + '.png'))
    if os.path.exists(png):
        os.remove(png)
    subprocess.run([chrome, '--headless=new', '--hide-scrollbars', '--allow-file-access-from-files',
                    '--disable-gpu',
                    '--virtual-time-budget=7000', '--window-size=1920,1080', '--force-device-scale-factor=1',
                    '--screenshot=' + png, 'file://' + idx + '?captura#' + i],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    print(i, 'ok' if os.path.exists(png) else 'FALLÓ')
