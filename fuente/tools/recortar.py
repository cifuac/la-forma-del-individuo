"""Separa una figura grabada de su fondo blanco: relleno por inundación desde los bordes (el fondo
conectado se vuelve transparente) y borde suavizado. Uso: python3 -I recortar.py <entrada> <salida.png> [umbral]
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
umbral = int(sys.argv[3]) if len(sys.argv) > 3 else 38
im = Image.open(src).convert('RGB')
w, h = im.size
marca = im.copy()
for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
    if sum(marca.getpixel(p)) > 600:
        ImageDraw.floodfill(marca, p, (255, 0, 255), thresh=umbral)
m = np.asarray(marca)
fondo = (m[..., 0] == 255) & (m[..., 1] == 0) & (m[..., 2] == 255)
alfa = Image.fromarray(np.where(fondo, 0, 255).astype(np.uint8))
alfa = alfa.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
out = im.convert('RGBA')
out.putalpha(alfa)
bbox = out.getbbox()
out = out.crop(bbox)
out.save(dst)
print(dst, out.size)
