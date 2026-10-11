"""Convierte las acuarelas generadas en Affinity (pigmento sobre papel blanco) en manchas RGBA.

Separa pigmento y papel: con a = densidad normalizada y Q = 1 - (1 - C)/a, el resultado sobre blanco
reproduce el original, y sobre fondos oscuros el pigmento se puede sumar como luz.
Uso: python3 -I manchas.py <dir_origen> <dir_destino> nombre:matiz ...   (matiz: amarillo | azul | ninguno)
"""
import colorsys
import os
import subprocess
import sys

import numpy as np
from PIL import Image


def procesar(src, dst, matiz):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64) / 255.0
    h, w, _ = im.shape
    borde = np.concatenate([im[:24].reshape(-1, 3), im[-24:].reshape(-1, 3), im[:, :24].reshape(-1, 3), im[:, -24:].reshape(-1, 3)])
    papel = np.median(borde, axis=0)
    c = np.clip(im / papel, 0, 1)
    d = 1 - c.min(axis=2)
    d_borde = 1 - np.clip(borde / papel, 0, 1).min(axis=1)
    d0 = np.percentile(d_borde, 99.5) + 0.012
    dmax = max(np.percentile(d, 99.7), d0 + 0.05)
    a = np.clip((d - d0) / (dmax - d0), 0, 1)
    a = a * a * (3 - 2 * a) * 0.35 + a * 0.65
    q = 1 - (1 - c) / np.maximum(a, 1e-3)[..., None]
    q = np.clip(q, 0, 1)
    if matiz != 'ninguno':
        flat = q.reshape(-1, 3)
        hsv = np.array([colorsys.rgb_to_hsv(*p) for p in flat[::1]]) if False else None
        r, g, b = flat[:, 0], flat[:, 1], flat[:, 2]
        mx, mn = flat.max(1), flat.min(1)
        v = mx
        s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
        if matiz == 'amarillo':
            hue, smax, vmin = 46 / 360, 0.6, 0.93
        else:
            hue, smax, vmin = 211 / 360, 0.92, 0.0
        s = np.minimum(s, smax)
        v = np.maximum(v, vmin)
        out = np.array([colorsys.hsv_to_rgb(hue, si, vi) for si, vi in zip(s, v)])
        q = out.reshape(h, w, 3)
    ys, xs = np.where(a > 0.02)
    m = 24
    y0, y1 = max(0, ys.min() - m), min(h, ys.max() + m)
    x0, x1 = max(0, xs.min() - m), min(w, xs.max() + m)
    rgba = np.dstack([q, a])[y0:y1, x0:x1]
    img = Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA')
    png = dst[:-5] + '.png'
    img.save(png)
    subprocess.run(['cwebp', '-quiet', '-q', '86', '-alpha_q', '92', '-m', '6', png, '-o', dst], check=True)
    os.remove(png)
    return img


if __name__ == '__main__':
    o, dd = sys.argv[1], sys.argv[2]
    hechos = []
    for arg in sys.argv[3:]:
        nombre, matiz = arg.split(':')
        img = procesar(os.path.join(o, nombre + '.png'), os.path.join(dd, nombre + '.webp'), matiz)
        hechos.append(img)
        print(nombre, img.size, os.path.getsize(os.path.join(dd, nombre + '.webp')) // 1024, 'KB')
    # Hoja de control sobre papel claro y sobre azul noche
    W = 380
    filas = []
    for fondo in [(250, 250, 247), (10, 31, 51)]:
        fila = Image.new('RGB', (W * len(hechos), W), fondo)
        for k, img in enumerate(hechos):
            t = img.copy()
            t.thumbnail((W - 20, W - 20))
            capa = Image.new('RGB', t.size, fondo)
            if fondo[0] < 100:
                arr = np.asarray(t).astype(np.float64) / 255
                base = np.array(fondo, dtype=np.float64) / 255
                scr = 1 - (1 - base) * (1 - arr[..., :3])
                comp = base * (1 - arr[..., 3:4]) + scr * arr[..., 3:4]
                capa = Image.fromarray((comp * 255).astype(np.uint8))
            else:
                capa.paste(t, (0, 0), t)
            fila.paste(capa, (k * W + 10, 10))
        filas.append(fila)
    hoja = Image.new('RGB', (W * len(hechos), 2 * W))
    hoja.paste(filas[0], (0, 0))
    hoja.paste(filas[1], (0, W))
    hoja.save(os.path.join(os.path.dirname(dd.rstrip('/')), 'control_manchas.jpg'), quality=82)
