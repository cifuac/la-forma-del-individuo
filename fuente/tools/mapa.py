"""Genera la lámina de correspondencias entre el realismo filosófico y los rasgos del realismo formal:
dos columnas de nodos unidas por curvas que se dibujan; al pasar el puntero por un nodo se iluminan sus curvas.

Uso: python3 -I mapa.py <salida.html>
"""
import sys

FIL = [
    ('La verdad la descubre el individuo', 'Descartes, 1637'),
    ('«Todo lo que existe es particular»', 'Berkeley, 1713'),
    ('Identidad: conciencia que dura', 'Locke, 1690 · Hume, 1739'),
    ('Individuar: un lugar y un momento', 'Locke, 1690'),
    ('¿Corresponden palabras y cosas?', 'semántica de Locke'),
]
NOV = [
    ('Tramas no tradicionales, originales', 'Defoe, Richardson'),
    ('Personajes particulares, no tipos', 'cap. I, b'),
    ('Nombres propios corrientes', 'cap. I, c'),
    ('Tiempo: causa, memoria, desarrollo', 'cap. I, d'),
    ('Un entorno físico concreto', 'cap. I, e'),
    ('Lenguaje referencial, sin ornato', 'cap. I, f'),
]
ARISTAS = [(0, 0), (1, 1), (2, 2), (2, 3), (3, 3), (3, 4), (4, 5)]
XL, WL = 128, 560
XR, WR = 1232, 560
YF = [336, 460, 584, 708, 832]
YN = [322, 428, 534, 640, 746, 852]
H = 84


def main(salida):
    svg = ['<svg class="mapa-svg" viewBox="0 0 1920 1080" aria-hidden="true">']
    for k, (i, j) in enumerate(ARISTAS):
        y0, y1 = YF[i] + H / 2, YN[j] + H / 2
        x0, x1 = XL + WL + 12, XR - 12
        d = f'M{x0},{y0:.0f} C{x0 + 220},{y0:.0f} {x1 - 220},{y1:.0f} {x1},{y1:.0f}'
        svg.append(f'<path d="{d}" class="trazo mapa-curva c-f{i} c-n{j}" pathLength="1" style="--retardo:{700 + k * 260}ms; --dur:1.4s"/>')
        svg.append(f'<circle cx="{x0}" cy="{y0:.0f}" r="7" class="mapa-ext"/><circle cx="{x1}" cy="{y1:.0f}" r="7" class="mapa-ext"/>')
    svg.append('</svg>')
    nodos = []
    for i, (t, a) in enumerate(FIL):
        nodos.append(f'<div class="mapa-nodo fil n-f{i}" style="left:{XL}px; top:{YF[i]}px; width:{WL}px; --retardo:{300 + i * 120}ms"><b>{t}</b><span>{a}</span></div>')
    for j, (t, a) in enumerate(NOV):
        nodos.append(f'<div class="mapa-nodo nov n-n{j}" style="left:{XR}px; top:{YN[j]}px; width:{WR}px; --retardo:{900 + j * 160}ms"><b>{t}</b><span>{a}</span></div>')
    # resaltado al pasar el puntero (una regla por nodo)
    css = []
    for i in range(len(FIL)):
        css.append(f'.mapa:has(.n-f{i}:hover) .c-f{i}')
    for j in range(len(NOV)):
        css.append(f'.mapa:has(.n-n{j}:hover) .c-n{j}')
    regla = ',\n'.join(css) + ' { stroke: var(--napoles-hondo); stroke-width: 6; opacity: 1; }'
    html = f'''<section class="lamina mapa" id="mapa" data-titulo="Del pensamiento a la forma" data-seccion="V. Realismo formal">
  <style>{regla}</style>
  <div class="capa" style="left:820px; top:430px; --prof:-6"><img class="mancha" data-src="img/mancha_amarilla_a.webp" alt="" style="width:300px; --rot:20deg; --retardo:1200ms; --op:.75"></div>
  {"".join(svg)}
  {"".join(nodos)}
  <p class="mapa-centro" data-anim="aparecer" style="--retardo:2400ms">analogías, no causas</p>
  <div class="contenido" style="bottom:auto">
    <p class="etiqueta" data-anim="subir">Correspondencias</p>
    <h2 class="titulo" data-anim="subir" style="--retardo:90ms; margin-top:16px">Del pensamiento a la forma</h2>
  </div>
  <p class="mapa-col izq">Realismo filosófico</p>
  <p class="mapa-col der">Rasgos del realismo formal</p>
  <div class="pie"><span>Watt, cap. I, secciones a–f · pasa el puntero por un rasgo para ver sus vínculos</span><span class="num"></span></div>
  <aside class="notas">Interacción: al pasar el puntero por un rasgo se iluminan sus correspondencias.
Watt (cap. I) recorre las analogías entre el realismo filosófico y la forma novela. (a) Descartes y Locke hacen de la búsqueda de la verdad un asunto individual, independiente de la tradición; la novela es la primera forma que rechaza las tramas tradicionales (de la mitología, la historia o la leyenda) y hace de la originalidad un valor: Defoe y Richardson son los primeros grandes escritores ingleses que no toman sus tramas de la literatura anterior. (b) El rechazo de los universales y la atención a lo particular (Berkeley: todo lo que existe es particular) corresponden a personajes particulares en circunstancias particulares. (c) El problema de la identidad personal tiene su análogo en los nombres propios. (d) La identidad como conciencia que dura en la memoria (Locke, Hume) corresponde al tiempo de la novela: causalidad, desarrollo, escala minuciosa. (e) El principio de individuación (un lugar y un momento) corresponde al entorno físico particularizado. (f) La preocupación semántica corresponde a una prosa más referencial, que produce su efecto por presentación exhaustiva más que por concentración elegante.
Advertencia de Watt: la filosofía es una cosa y la literatura otra; las analogías no suponen que la filosofía causó la novela. Ambas son manifestaciones paralelas de un cambio más amplio: la sustitución de la visión unificada del mundo medieval por la de individuos particulares que tienen experiencias particulares en momentos y lugares particulares.</aside>
</section>
'''
    open(salida, 'w', encoding='utf-8').write(html)
    print('ok')


if __name__ == '__main__':
    main(sys.argv[1])
