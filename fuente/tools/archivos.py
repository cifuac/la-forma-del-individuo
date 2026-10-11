"""Imprime el mapa de archivos (img/...) que usa dist/index.html, en JSON, para publicar."""
import json
import os
import re
import sys

raiz = sys.argv[1]
s = open(os.path.join(raiz, 'dist', 'index.html'), encoding='utf-8').read()
refs = sorted(set(re.findall(r'="(img/[^"]+)"', s)) | set(re.findall(r'url\((?:"|\x27)?(img/[^"\x27)]+)', s)))
print(json.dumps({r: r for r in refs}, ensure_ascii=False))
print(len(refs), 'archivos,', sum(os.path.getsize(os.path.join(raiz, 'dist', r)) for r in refs) // 1024, 'KB', file=sys.stderr)
