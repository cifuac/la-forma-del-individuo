"""Genera la lámina «La jornada de un hombre común»: reloj de 24 horas con el reparto del día que
Crusoe describe en su diario (horario aproximado), el grabado de la isla al centro y una leyenda.

Uso: python3 -I jornada.py <salida.html>
"""
import math
import sys

CX, CY = 1190, 548
R1, R2 = 214, 300  # anillo de actividades
TRAMOS = [
    # (inicio, fin, clave)
    (6.0, 6.5, 'esc'), (6.5, 9.5, 'caza'), (9.5, 12.0, 'prep'), (12.0, 12.5, 'esc'),
    (12.5, 15.5, 'calor'), (15.5, 19.5, 'trab'), (19.5, 20.0, 'esc'), (20.0, 30.0, 'noche'),
]
CLAVES = {
    'esc': ('Las Escrituras', '«tres veces al día»'),
    'caza': ('Caza con la escopeta', '«tres horas cada mañana»'),
    'prep': ('Ordenar, cortar, conservar, cocinar', '«gran parte del día»'),
    'calor': ('Calor del mediodía', 'imposible salir'),
    'trab': ('Trabajo', '«unas cuatro horas por la tarde»'),
    'noche': ('Noche', 'descanso'),
}
ORDEN = ['esc', 'caza', 'prep', 'calor', 'trab', 'noche']


def ang(h):
    """Ángulo (radianes) de la hora h, con el mediodía arriba y avance horario."""
    return (h - 12) / 24 * 2 * math.pi


def pt(h, r):
    a = ang(h)
    return CX + r * math.sin(a), CY - r * math.cos(a)


def sector(h0, h1, r1, r2):
    x0, y0 = pt(h0, r2)
    x1, y1 = pt(h1, r2)
    x2, y2 = pt(h1, r1)
    x3, y3 = pt(h0, r1)
    grande = 1 if (h1 - h0) > 12 else 0
    return (f'M{x0:.1f},{y0:.1f} A{r2},{r2} 0 {grande} 1 {x1:.1f},{y1:.1f} '
            f'L{x2:.1f},{y2:.1f} A{r1},{r1} 0 {grande} 0 {x3:.1f},{y3:.1f} Z')


def main(salida):
    s = []
    s.append(f'<svg class="dial" viewBox="0 0 1920 1080" aria-label="Reloj de 24 horas con la jornada de Crusoe">')
    s.append('<defs>')
    s.append(f'<clipPath id="isla"><circle cx="{CX}" cy="{CY}" r="{R1 - 16}"/></clipPath>')
    s.append('<pattern id="trama-calor" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#FBEFC6"/><line x1="0" y1="0" x2="0" y2="14" stroke="#E9C35A" stroke-width="5"/></pattern>')
    s.append('</defs>')
    s.append(f'<circle cx="{CX}" cy="{CY}" r="{R2 + 44}" class="dial-fondo"/>')
    for i, (h0, h1, k) in enumerate(TRAMOS):
        s.append(f'<path d="{sector(h0, h1, R1, R2)}" class="dial-tramo t-{k}" style="--retardo:{300 + i * 110}ms"/>')
    # marcas horarias
    for h in range(24):
        x0, y0 = pt(h, R2 + 8)
        x1, y1 = pt(h, R2 + (26 if h % 3 == 0 else 16))
        s.append(f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" class="dial-marca{" mayor" if h % 3 == 0 else ""}"/>')
        if h % 3 == 0:
            tx, ty = pt(h, R2 + 56)
            s.append(f'<text x="{tx:.1f}" y="{ty + 8:.1f}" text-anchor="middle" class="dial-hora">{h:02d}</text>')
    # grabado de la isla
    ri = R1 - 16
    s.append(f'<image href="img/grabado_naufragio.webp" x="{CX - ri * 16 / 9:.0f}" y="{CY - ri}" width="{ri * 32 / 9:.0f}" height="{2 * ri}" preserveAspectRatio="xMidYMid slice" clip-path="url(#isla)"/>')
    s.append(f'<circle cx="{CX}" cy="{CY}" r="{R1 - 16}" class="dial-borde"/>')
    # sol del mediodía
    sx, sy = pt(12, R2 + 96)
    s.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="16" class="dial-sol"/>')
    s.append('</svg>')
    # aguja (HTML para girarla con CSS)
    aguja = f'<div class="dial-aguja" style="left:{CX - 3}px; top:{CY - R2 + 6}px; height:{R2 - 6}px"></div><div class="dial-eje" style="left:{CX - 11}px; top:{CY - 11}px"></div>'
    ley = ['<ul class="dial-leyenda">']
    for i, k in enumerate(ORDEN):
        t, q = CLAVES[k]
        ley.append(f'<li style="--retardo:{900 + i * 120}ms"><span class="muestra t-{k}"></span><b>{t}</b><i>{q}</i></li>')
    ley.append('</ul>')

    html = f'''<section class="lamina jornada" id="jornada" data-titulo="La jornada de un hombre común" data-seccion="II. La fe del trabajo">
  <div class="capa" style="left:{CX - 380}px; top:{CY - 420}px; --prof:-8"><img class="mancha" data-src="img/mancha_amarilla_a.webp" alt="" style="width:520px; --rot:20deg; --retardo:200ms; --op:.7"></div>
  {"".join(s)}
  {aguja}
  {"".join(ley)}
  <div class="contenido" style="right:auto; width:700px">
    <p class="etiqueta" data-anim="subir">La primera novela</p>
    <h2 class="titulo" data-anim="subir" style="--retardo:90ms; margin-top:16px">La jornada de un hombre común</h2>
    <p data-anim="subir" style="--retardo:220ms; margin-top:28px; font-size:28px">Para Watt, <i>Robinson Crusoe</i> es la primera novela en un sentido preciso: es la primera ficción que pone en el centro de la atención literaria <span class="resalte">las actividades de una persona común</span>.</p>
    <p data-anim="subir" style="--retardo:340ms; margin-top:22px; font-size:28px">La dignidad puritana del trabajo ayudó a fijar la premisa del género: la vida cotidiana de un individuo merece la literatura. Los novelistas posteriores conservarán esa seriedad sin el marco religioso.</p>
  </div>
  <div class="pie"><span>Defoe, Robinson Crusoe (1719): la jornada según el diario de Crusoe, horario aproximado · Watt, cap. III, pp. 73–74</span><span class="num"></span></div>
  <aside class="notas">Watt (pp. 73–74): Robinson Crusoe es ciertamente la primera novela en el sentido de que es la primera narrativa de ficción en que las actividades de una persona común son el centro de la atención literaria. Esas actividades no se ven todavía del todo a la luz de la secularización, pero los novelistas posteriores pudieron conservar la seriedad de Defoe ante lo mundano sin ponerla en un marco religioso. La concepción puritana de la dignidad del trabajo habría ayudado a consolidar la premisa general de la novela: que la vida cotidiana individual tiene importancia e interés suficientes para ser materia de la literatura.
El reloj reconstruye el reparto del día que Crusoe anota en su diario: primero, su deber para con Dios y la lectura de las Escrituras, a la que reservaba un tiempo tres veces al día; segundo, salir con la escopeta en busca de comida, unas tres horas cada mañana si no llovía; tercero, ordenar, cortar, conservar y cocinar lo cazado, que ocupaba gran parte del día. Al mediodía el calor impedía salir, de modo que le quedaban unas cuatro horas por la tarde para trabajar; a veces invertía el orden. Las horas exactas son una aproximación; el texto da el reparto, no un horario.
Watt también señala (pp. 71–73) que la especialización económica empobrece el trabajo cotidiano, y que el atractivo del esfuerzo autosuficiente de Crusoe (carpintería, alfarería, huerta, animales) funciona como compensación ideológica de la división del trabajo.</aside>
</section>
'''
    open(salida, 'w', encoding='utf-8').write(html)
    print('ok')


if __name__ == '__main__':
    main(sys.argv[1])
