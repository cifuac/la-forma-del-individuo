"""Renderiza cada objeto 3D en reposo con Chrome sin interfaz (WebGL por software) y guarda una imagen
de respaldo con transparencia: se ve mientras carga three.js o si el equipo no tiene WebGL.

Uso: python3 -I tools/respaldo3d.py <raiz_web>
"""
import html
import os
import re
import subprocess
import sys

from PIL import Image

raiz = os.path.abspath(sys.argv[1])
src, dist = os.path.join(raiz, 'src'), os.path.join(raiz, 'dist')
indice = open(os.path.join(dist, 'index.html'), encoding='utf-8').read()
g3d = open(os.path.join(src, 'g3d.js'), encoding='utf-8').read()
glifos = open(os.path.join(src, 'glifos.json'), encoding='utf-8').read()
chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

for m in re.finditer(r'<div class="escena3d" style="([^"]+)"([^>]*)>\s*<img class="respaldo" (?:data-src|src)="img/([^"]+)"', indice):
    estilo, attrs, salida = m.group(1), m.group(2), m.group(3)
    w = int(re.search(r'width:(\d+)px', estilo).group(1))
    h = int(re.search(r'height:(\d+)px', estilo).group(1))
    pagina = f'''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;background:transparent}}
.escena3d{{position:absolute;left:0;top:0;width:{w}px;height:{h}px}}
.escena3d canvas{{position:absolute;inset:0;width:100%;height:100%}}
</style></head><body><div class="lamina"><div class="escena3d"{attrs}></div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>window.GLIFOS={glifos};
{g3d}
const L=document.querySelector('.lamina');G3D.escala(1);G3D.montar(L,null);
const paso=()=>{{for(let i=0;i<90;i++)G3D.cuadro(performance.now(),0,0);if(!document.querySelector('.gl-listo'))requestAnimationFrame(paso);}};paso();
</script></body></html>'''
    tmp = os.path.join(dist, '_respaldo.html')
    open(tmp, 'w', encoding='utf-8').write(pagina)
    png = os.path.join(raiz, '_respaldo.png')
    if os.path.exists(png):
        os.remove(png)
    subprocess.run([chrome, '--headless=new', '--hide-scrollbars', '--allow-file-access-from-files',
                    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
                    '--default-background-color=00000000', '--virtual-time-budget=6000',
                    f'--window-size={w},{h}', '--force-device-scale-factor=1',
                    '--screenshot=' + png, 'file://' + tmp + '?captura'],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    os.remove(tmp)
    if not os.path.exists(png):
        print(salida, 'FALLÓ')
        continue
    im = Image.open(png).convert('RGBA')
    destino = os.path.join(dist, 'img', salida)
    tmp_png = destino[:-5] + '.png'
    im.save(tmp_png)
    subprocess.run(['cwebp', '-quiet', '-q', '86', '-alpha_q', '92', '-m', '6', tmp_png, '-o', destino], check=True)
    os.remove(tmp_png)
    a = im.getchannel('A').getextrema()
    print(salida, im.size, 'alfa', a, os.path.getsize(destino) // 1024, 'KB')
