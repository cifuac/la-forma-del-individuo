"""Genera la lámina de cronología: cuatro hilos de contexto que se dibujan de izquierda a derecha y,
hacia 1719, sueltan hebras que se anudan en un quinto hilo (la novela). Coloca las etiquetas sin choques.

Uso: python3 -I cronologia.py <salida.html>
"""
import sys

X0, X1, A0, A1 = 330, 1770, 1660, 1752


def x(a):
    return X0 + (a - A0) * (X1 - X0) / (A1 - A0)


CARRILES = [
    ('Pensamiento', 372, '#2E5C8A', [(1660, 'Royal Society'), (1690, 'Locke, Ensayo'), (1713, 'Berkeley, Diálogos'), (1739, 'Hume, Tratado')]),
    ('Religión', 490, '#3E6E9C', [(1662, 'Acta de Uniformidad'), (1678, 'Bunyan, El progreso del peregrino'), (1689, 'Acta de Tolerancia')]),
    ('Economía y política', 608, '#143A5F', [(1688, 'Revolución Gloriosa'), (1694, 'Banco de Inglaterra'), (1720, 'Burbuja de los Mares del Sur')]),
    ('Prensa y libro', 726, '#5B86B3', [(1695, 'Fin de la censura previa'), (1710, 'Ley de la Reina Ana'), (1711, 'The Spectator'), (1731, "Gentleman's Magazine")]),
]
NOVELA_Y = 872
NUDO = 1719
ANCHO_CAR = 12.4  # ancho medio de un carácter a 24 px (IBM Plex Sans)
DUR = 2.6  # segundos que tarda el trazo en cruzar el eje


def tirón(i):
    return 16 + i * 4


def y_en(i, xq):
    """Altura del hilo i en la abscisa xq (sigue la curva que se acerca al nudo)."""
    y = CARRILES[i][1]
    xn, pull = x(NUDO), tirón(i)
    tramos = [((xn - 260, y), (xn - 140, y), (xn - 90, y + pull), (xn, y + pull)),
              ((xn, y + pull), (xn + 90, y + pull), (xn + 140, y), (xn + 260, y))]
    for p0, p1, p2, p3 in tramos:
        if p0[0] <= xq <= p3[0]:
            lo, hi = 0.0, 1.0
            for _ in range(40):
                t = (lo + hi) / 2
                bx = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t ** 3 * p3[0]
                lo, hi = (t, hi) if bx < xq else (lo, t)
            t = (lo + hi) / 2
            return (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t ** 3 * p3[1]
    return y


def retardo(a):
    return 300 + (x(a) - X0) / (X1 - X0) * DUR * 1000


def colocar():
    """Elige fila (arriba/abajo, 1 o 2) y anclaje de cada etiqueta evitando choques."""
    cajas = []
    res = []
    for i, (nombre, y0, color, evs) in enumerate(CARRILES):
        for a, txt in evs:
            texto = f'{a} {txt}'
            w = len(texto) * ANCHO_CAR
            cx = x(a)
            y = y_en(i, cx)
            mejor = None
            for fila, dy in [('a1', -27), ('b1', 46), ('a2', -56), ('b2', 76)]:
                for anc in ['start', 'end', 'middle']:
                    l = cx - 6 if anc == 'start' else cx - w + 6 if anc == 'end' else cx - w / 2
                    if l < X0 - 20 or l + w > 1800:
                        continue
                    caja = (l - 8, y + dy - 22, l + w + 8, y + dy + 6)
                    if any(not (caja[2] < c[0] or caja[0] > c[2] or caja[3] < c[1] or caja[1] > c[3]) for c in cajas):
                        continue
                    mejor = (fila, dy, anc, caja)
                    break
                if mejor:
                    break
            if not mejor:
                raise SystemExit(f'sin lugar para {texto}')
            cajas.append(mejor[3])
            res.append((nombre, y, color, a, txt, mejor))
    return res


def main(salida):
    et = colocar()
    p = []
    p.append('<svg class="crono-svg" viewBox="0 0 1920 1080" aria-label="Cronología 1660–1750: cuatro hilos de contexto que se anudan en la novela hacia 1719">')
    p.append('<defs>')
    for i, (nombre, y, color, _) in enumerate(CARRILES):
        p.append(f'<linearGradient id="hilo{i}" x1="0" x2="1"><stop offset="0" stop-color="{color}" stop-opacity=".35"/><stop offset=".55" stop-color="{color}"/><stop offset="1" stop-color="{color}" stop-opacity=".8"/></linearGradient>')
    p.append(f'<linearGradient id="hilo-novela" gradientUnits="userSpaceOnUse" x1="{x(NUDO):.1f}" y1="0" x2="{X1}" y2="0"><stop offset="0" stop-color="#EDBF4B"/><stop offset="1" stop-color="#F6D16E"/></linearGradient>')
    p.append('</defs>')
    # eje de años
    for a in range(1660, 1751, 10):
        p.append(f'<line x1="{x(a):.1f}" y1="318" x2="{x(a):.1f}" y2="900" class="crono-reja"/>')
        p.append(f'<text x="{x(a):.1f}" y="302" class="crono-anio" text-anchor="middle">{a}</text>')
    # franja del nudo
    p.append(f'<rect x="{x(1710):.1f}" y="318" width="{x(1722) - x(1710):.1f}" height="582" class="crono-franja"/>')
    # hilos de contexto
    xn = x(NUDO)
    for i, (nombre, y, color, evs) in enumerate(CARRILES):
        # curva suave que se acerca al nudo
        pull = tirón(i)
        d = (f'M{X0},{y} L{xn - 260:.1f},{y} C{xn - 140:.1f},{y} {xn - 90:.1f},{y + pull} {xn:.1f},{y + pull} '
             f'S{xn + 140:.1f},{y} {xn + 260:.1f},{y} L{X1},{y}')
        p.append(f'<path d="{d}" class="trazo crono-hilo" stroke="url(#hilo{i})" pathLength="1" style="--retardo:300ms; --dur:{DUR}s"/>')
        p.append(f'<text x="{X0 - 22}" y="{y + 8}" class="crono-carril" text-anchor="end">{nombre}</text>')
        # hebra hacia la novela
        hx = xn - 30 + i * 20
        p.append(f'<path d="M{hx:.1f},{y + pull} C{hx:.1f},{y + 90} {xn:.1f},{NOVELA_Y - 110} {xn:.1f},{NOVELA_Y}" class="trazo crono-hebra" pathLength="1" style="--retardo:{retardo(NUDO) + 150 + i * 90:.0f}ms; --dur:.9s"/>')
    # resplandor del nudo (acuarela de Affinity)
    p.append('</svg>')
    svg_fondo = ''.join(p)
    q = []
    q.append('<svg class="crono-svg" viewBox="0 0 1920 1080" aria-hidden="true">')
    # hilo de la novela
    q.append(f'<path d="M{xn:.1f},{NOVELA_Y} L{X1},{NOVELA_Y}" class="trazo crono-novela" pathLength="1" style="--retardo:{retardo(NUDO) + 700:.0f}ms; --dur:1.6s"/>')
    q.append(f'<text x="{X0 - 22}" y="{NOVELA_Y + 8}" class="crono-carril novela" text-anchor="end">Novela</text>')
    # perlas de contexto
    for nombre, y, color, a, txt, (fila, dy, anc, caja) in et:
        pull = 0
        r = retardo(a)
        q.append(f'<circle cx="{x(a):.1f}" cy="{y:.1f}" r="9" class="perla crono-perla" style="--retardo:{r:.0f}ms"/>')
        tx = x(a) - 6 if anc == 'start' else x(a) + 6 if anc == 'end' else x(a)
        q.append(f'<text x="{tx:.1f}" y="{y + dy:.1f}" text-anchor="{anc}" class="crono-txt" style="--retardo:{r + 120:.0f}ms"><tspan class="a">{a}</tspan> {txt}</text>')
    # novela
    for a, t, anc, dx in [(1719, 'Robinson Crusoe', 'end', 8), (1722, 'Moll Flanders', 'start', -8)]:
        r = retardo(NUDO) + 800 + (a - NUDO) * 60
        q.append(f'<circle cx="{x(a):.1f}" cy="{NOVELA_Y}" r="13" class="perla crono-perla-novela" style="--retardo:{r:.0f}ms"/>')
        q.append(f'<text x="{x(a) + dx:.1f}" y="{NOVELA_Y + 46}" text-anchor="{anc}" class="crono-txt novela" style="--retardo:{r + 100:.0f}ms"><tspan class="a">{a}</tspan> {t}</text>')
    r = retardo(1740) + 900
    q.append(f'<rect x="{x(1740) - 12:.1f}" y="{NOVELA_Y - 11}" width="{x(1749) - x(1740) + 24:.1f}" height="22" rx="11" class="perla crono-tramo" style="--retardo:{r:.0f}ms"/>')
    for a in (1740, 1742, 1747.5, 1749):
        q.append(f'<circle cx="{x(a):.1f}" cy="{NOVELA_Y}" r="4" class="perla crono-punto" style="--retardo:{r + 150:.0f}ms"/>')
    q.append(f'<text x="{X1 + 10}" y="{NOVELA_Y - 54}" text-anchor="end" class="crono-txt novela" style="--retardo:{r + 100:.0f}ms"><tspan class="a">1740–1749</tspan> Richardson y Fielding</text>')
    q.append(f'<text x="{X1 + 10}" y="{NOVELA_Y - 24}" text-anchor="end" class="crono-txt fino" style="--retardo:{r + 200:.0f}ms">Pamela · Joseph Andrews · Clarissa · Tom Jones</text>')
    q.append('</svg>')
    svg_frente = ''.join(q)

    xr = x(NUDO)
    html = f'''<section class="lamina cronologia" id="cronologia" data-titulo="Cinco hilos, un nudo" data-seccion="Apertura">
  <div class="capa" style="left:{xr - 290:.0f}px; top:{NOVELA_Y - 400}px; --prof:-6"><img class="mancha" data-src="img/mancha_amarilla_a.webp" alt="" style="width:560px; --rot:8deg; --retardo:{retardo(NUDO) + 300:.0f}ms; --op:.95"></div>
  {svg_fondo}
  {svg_frente}
  <div class="contenido" style="bottom:auto">
    <p class="etiqueta" data-anim="subir">1660–1750</p>
    <h2 class="titulo" data-anim="subir" style="--retardo:90ms; margin-top:14px">Cinco hilos, un nudo</h2>
  </div>
  <div class="pie"><span>Los cuatro hilos se tensan hacia 1710–1722; de ese nudo sale la novela.</span><span class="num"></span></div>
  <aside class="notas">Lectura de la línea de tiempo. Cuatro procesos corren en paralelo y se tensan hacia 1710–1722, donde aparece la novela de Defoe.
Pensamiento: la Royal Society (1660) institucionaliza la ciencia experimental; el Ensayo sobre el entendimiento humano de Locke (1690) funda el empirismo; en los Tres diálogos de Berkeley (1713) Philonous afirma que todo lo que existe es particular (Watt cap. I); Hume publica el Tratado de la naturaleza humana (1739).
Religión: el Acta de Uniformidad (1662) deja fuera de la Iglesia oficial a los disidentes, el medio protestante del que vienen Bunyan y Defoe; El progreso del peregrino (1678); el Acta de Tolerancia (1689).
Economía y política: la Revolución Gloriosa (1688), la fundación del Banco de Inglaterra (1694) y la burbuja de los Mares del Sur (1720), la primera gran crisis especulativa: el capitalismo financiero entra en la vida cotidiana.
Prensa y libro: en 1695 no se renueva la Licensing Act y termina la censura previa; Defoe publica la Review (1704–1713); la Ley de la Reina Ana (1710) crea el derecho de autor; The Spectator (1711) y el Gentleman's Magazine (1731) forman al público lector (Watt, cap. II, pp. 51–52).
Novela: Robinson Crusoe (1719) y Moll Flanders (1722); en la década de 1740, Richardson y Fielding: Pamela (1740), Joseph Andrews (1742), Clarissa (1747–48) y Tom Jones (1749).</aside>
</section>
'''
    open(salida, 'w', encoding='utf-8').write(html)
    print('ok', len(et), 'etiquetas')
    for e in et:
        print(e[0][:10], e[3], e[5][0], e[5][2])


if __name__ == '__main__':
    main(sys.argv[1])
