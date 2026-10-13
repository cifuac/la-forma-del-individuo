# La forma del individuo

Presentación web sobre Ian Watt, *The Rise of the Novel* (1957): las condiciones históricas, sociales y filosóficas del realismo formal.

**Ver en línea:** https://cifuac.github.io/la-forma-del-individuo/

Teclado: flechas o espacio para avanzar, `I` índice, `N` notas del orador, `F` pantalla completa.

En el celular: deslizar para avanzar. El botón de pantalla completa activa un **modo grande**: con el teléfono en vertical, la presentación se gira para ocupar toda la pantalla (basta con girar el teléfono para leerla); en Android además se pasa a pantalla completa real. En iPhone, para verla sin las barras de Safari, se puede usar *Compartir → Agregar a pantalla de inicio* y abrirla desde ese ícono.

## Contenido

| Carpeta o archivo | Qué es |
|---|---|
| `index.html` | La presentación (29 láminas). Necesita conexión para las tipografías y la biblioteca 3D. |
| `img/` | Imágenes de las láminas. |
| `figuras/` | Las tres figuras animadas por separado: banco óptico, prensa común (1711) y balanza de precisión. |
| `respaldo/` | Versión estática en PowerPoint (34 diapositivas, con notas y secciones) por si no hay navegador o conexión. |
| `fuente/` | Láminas, estilos, scripts y construcción de las figuras, para volver a generar la presentación. |

## Volver a generar

```bash
mkdir -p fuente/dist && cp -R img fuente/dist/
python3 -I fuente/tools/build.py fuente
cp fuente/dist/local.html index.html
```

Las figuras se construyen con `node fuente/anatomy/<figura>/build.mjs --light`, a partir del kit *anatomy* (licencia MIT, ver `fuente/anatomy/LICENCIA-anatomy-MIT.txt`); su resultado se copia a `fuente/src/fig_<figura>.json`.

## Notas

- Las páginas citadas de Watt siguen la paginación de la edición de University of California Press.
- Las ilustraciones son recreaciones modernas a la manera de los grabados del siglo XVIII; no son documentos de época.
