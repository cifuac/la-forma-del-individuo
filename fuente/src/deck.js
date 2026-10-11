(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const captura = /captura/.test(location.search);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  // En pantallas táctiles: sin paralaje, sin desenfoques animados y con menos trabajo por cuadro
  const tactil = matchMedia('(hover: none), (pointer: coarse)').matches;
  const app = $('#app');
  const visor = $('#visor');
  const esc = $('#escenario');
  const laminas = $$('.lamina', esc);
  const total = laminas.length;
  let actual = -1;
  let paso = 0;
  let escala = 1;
  const enCurso = new Set();

  if (captura) app.classList.add('captura');
  if (tactil) app.classList.add('tactil');

  /* ---------- Numeración, accesibilidad y sombras de página ---------- */
  laminas.forEach((l, i) => {
    const n = $('.pie .num', l);
    if (n) n.textContent = String(i + 1).padStart(2, '0');
    l.setAttribute('role', 'group');
    l.setAttribute('aria-roledescription', 'lámina');
    l.setAttribute('aria-label', `${i + 1} de ${total}: ${l.dataset.titulo || ''}`);
    l.setAttribute('aria-hidden', 'true');
    l.inert = true;
    const sombra = document.createElement('div');
    sombra.className = 'sombra-pagina';
    l.appendChild(sombra);
  });

  /* ---------- Escala del escenario ---------- */
  function ajustar() {
    const W = visor.clientWidth;
    const H = visor.clientHeight;
    const lleno = captura || !!document.fullscreenElement;
    const g = lleno ? 0 : 16;
    const s = Math.max(0.05, Math.min((W - 2 * g) / 1920, (H - 2 * g) / 1080));
    escala = s;
    esc.style.setProperty('--s', s);
    esc.style.setProperty('--ox', ((W - 1920 * s) / 2) + 'px');
    esc.style.setProperty('--oy', ((H - 1080 * s) / 2) + 'px');
    if (window.G3D) window.G3D.escala(s);
  }
  addEventListener('resize', ajustar);
  document.addEventListener('fullscreenchange', () => { ajustar(); marcarBotones(); });

  /* ---------- Carga diferida de imágenes ---------- */
  function cargar(i) {
    for (let k = i - 1; k <= i + 2; k++) {
      const l = laminas[k];
      if (!l || l.dataset.cargada) continue;
      $$('img[data-src]', l).forEach(im => { im.src = im.dataset.src; im.removeAttribute('data-src'); });
      $$('[data-fondo]', l).forEach(el => { el.style.backgroundImage = `url("${el.dataset.fondo}")`; el.removeAttribute('data-fondo'); });
      l.dataset.cargada = '1';
    }
  }

  /* ---------- Pasos ---------- */
  const pasosDe = l => $$('[data-paso]', l).reduce((m, e) => Math.max(m, +e.dataset.paso), 0);
  function mostrarPasos(l, n) {
    $$('[data-paso]', l).forEach(e => {
      const ver = +e.dataset.paso <= n;
      const antes = e.classList.contains('visto');
      e.classList.toggle('visto', ver);
      if (ver && !antes) contar(e);
    });
    l.dataset.pasoActual = n;
    l.style.setProperty("--paso-n", n);
    l.dispatchEvent(new CustomEvent('paso', { detail: n }));
  }

  /* ---------- Contadores ---------- */
  const fmt = n => Math.round(n).toLocaleString('es-CL');
  function contar(raiz) {
    const els = raiz.matches && raiz.matches('[data-contar]') ? [raiz] : $$('[data-contar]', raiz);
    els.forEach(el => {
      if (el.closest('[data-paso]:not(.visto)')) return;
      const fin = +el.dataset.contar;
      const dur = +(el.dataset.dur || 1700);
      const t0 = performance.now() + +(el.dataset.retardo || 0);
      const lam = el.closest('.lamina');
      if (quieto.matches || captura) { el.textContent = fmt(fin); return; }
      const f = t => {
        const k = Math.min(1, Math.max(0, (t - t0) / dur));
        el.textContent = fmt(fin * (1 - Math.pow(1 - k, 3)));
        if (k < 1 && lam.classList.contains('activa')) requestAnimationFrame(f);
        else el.textContent = fmt(fin);
      };
      el.textContent = fmt(0);
      requestAnimationFrame(f);
    });
  }

  /* ---------- Transiciones ---------- */
  const esDivisor = l => l && l.classList.contains('divisor');
  function terminarTransiciones() { enCurso.forEach(a => a.finish()); enCurso.clear(); }
  function animar(el, kf, op) {
    const a = el.animate(kf, op);
    enCurso.add(a);
    a.onfinish = a.oncancel = () => enCurso.delete(a);
    return a;
  }
  function transicion(prev, sig, dir) {
    if (!prev) return;
    const sombraP = $('.sombra-pagina', prev);
    const sombraS = $('.sombra-pagina', sig);
    const corto = quieto.matches;
    const fin = () => {
      prev.classList.remove('saliendo');
      prev.style.zIndex = sig.style.zIndex = '';
      prev.style.transformOrigin = sig.style.transformOrigin = '';
    };
    if (corto) {
      prev.classList.add('saliendo');
      animar(prev, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'none' });
      animar(sig, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'none' }).onfinish = fin;
      return;
    }
    const hoja = (dir > 0 && esDivisor(sig)) || (dir < 0 && esDivisor(prev));
    prev.classList.add('saliendo');
    if (hoja && dir > 0) {
      // La lámina actual se levanta como una hoja y deja ver la nueva parte debajo.
      prev.style.zIndex = '3'; sig.style.zIndex = '2';
      prev.style.transformOrigin = '0% 50%';
      animar(prev, [
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(-34deg)', offset: .45 },
        { transform: 'rotateY(-96deg)' }
      ], { duration: 1250, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'none' }).onfinish = fin;
      animar(sombraP, [{ opacity: 0 }, { opacity: .9 }], { duration: 1250, easing: 'ease-in', fill: 'none' });
      animar(sombraS, [{ opacity: .85 }, { opacity: 0 }], { duration: 1250, easing: 'ease-out', fill: 'none' });
    } else if (hoja && dir < 0) {
      // Volver: la hoja anterior regresa y cubre la portadilla.
      sig.style.zIndex = '3'; prev.style.zIndex = '2';
      sig.style.transformOrigin = '0% 50%';
      animar(sig, [
        { transform: 'rotateY(-96deg)' },
        { transform: 'rotateY(-34deg)', offset: .55 },
        { transform: 'rotateY(0deg)' }
      ], { duration: 1150, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'none' }).onfinish = fin;
      animar(sombraS, [{ opacity: .9 }, { opacity: 0 }], { duration: 1150, easing: 'ease-out', fill: 'none' });
      animar(sombraP, [{ opacity: 0 }, { opacity: .85 }], { duration: 1150, easing: 'ease-in', fill: 'none' });
    } else {
      // Profundidad: la lámina saliente pasa junto al espectador, la entrante llega desde el fondo.
      const zSal = dir > 0 ? 260 : -380;
      const zEnt = dir > 0 ? -420 : 240;
      prev.style.zIndex = '2'; sig.style.zIndex = '3';
      const nubla = (px) => tactil ? {} : { filter: `blur(${px}px)` };
      animar(prev, [
        { opacity: 1, transform: 'translateZ(0)', ...nubla(0) },
        { opacity: 0, transform: `translateZ(${zSal}px)`, ...nubla(5) }
      ], { duration: 640, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'none' }).onfinish = fin;
      animar(sig, [
        { opacity: 0, transform: `translateZ(${zEnt}px)`, ...nubla(4) },
        { opacity: 1, transform: 'translateZ(0)', ...nubla(0) }
      ], { duration: 980, delay: 90, easing: 'cubic-bezier(.16,.84,.24,1)', fill: 'backwards' });
    }
  }


  /* ---------- Componentes animados ---------- */
  function puntos(lam) {
    $$('canvas.puntos', lam).forEach(cv => {
      const n = +cv.dataset.n, cols = +cv.dataset.cols, filas = Math.ceil(n / cols);
      const W = cv.width = +cv.dataset.w * 2, H = cv.height = +cv.dataset.h * 2;
      const g = cv.getContext('2d');
      const paso = Math.min(W / cols, H / filas), r = paso * 0.33;
      const orden = Array.from({ length: n }, (_, i) => i).sort((a, b) => ((a * 7919) % 101) - ((b * 7919) % 101));
      const color = cv.dataset.color || '#143A5F', resalte = cv.dataset.resalte || '#F6D16E';
      const dur = +(cv.dataset.dur || 2400), t0 = performance.now() + +(cv.dataset.retardo || 0);
      const dibujar = (k) => {
        g.clearRect(0, 0, W, H);
        const m = Math.round(n * k);
        for (let j = 0; j < m; j++) {
          const i = orden[j], x = (i % cols + 0.5) * paso, y = (Math.floor(i / cols) + 0.5) * paso;
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
          g.fillStyle = i % cols === 0 && Math.floor(i / cols) % 2 === 0 ? resalte : color; g.fill();
        }
      };
      if (captura || quieto.matches) { dibujar(1); return; }
      const f = t => { const k = Math.min(1, Math.max(0, (t - t0) / dur)); dibujar(1 - Math.pow(1 - k, 2)); if (k < 1 && lam.classList.contains('activa')) requestAnimationFrame(f); else dibujar(1); };
      requestAnimationFrame(f);
    });
  }
  const cache = (lam, clave, sel) => lam[clave] || (lam[clave] = $$(sel, lam));
  function orbitar(lam, t) {
    cache(lam, '_orbitas', '.orbita').forEach(o => {
      const items = $$('.orbita-item', o), rx = +o.dataset.rx, ry = +o.dataset.ry;
      const v = quieto.matches || captura ? 0 : t / 1000 * (+o.dataset.vel || 0.12);
      items.forEach((it, i) => {
        const a = v + i * Math.PI * 2 / items.length + 0.6;
        const z = Math.sin(a);
        const s = 0.72 + 0.28 * (z + 1) / 2;
        it.style.transform = `translate(${(Math.cos(a) * rx).toFixed(1)}px, ${(z * ry).toFixed(1)}px) scale(${s.toFixed(3)})`;
        it.style.zIndex = z > 0 ? 4 : 1;
        it.style.opacity = (0.55 + 0.45 * (z + 1) / 2).toFixed(3);
      });
    });
  }


  function lupas(lam, t) {
    cache(lam, '_lupas', '.lupa').forEach(el => {
      const lente = el.querySelector('.lupa-lente');
      const m = el._medidas || (el._medidas = { W: el.offsetWidth, H: el.offsetHeight, r: lente.offsetWidth / 2 });
      const W = m.W, H = m.H, z = +(el.dataset.zoom || 2.6), r = m.r;
      let x, y;
      const p = el._puntero;
      if (captura || quieto.matches) { x = W * +(el.dataset.fx || 0.3); y = H * +(el.dataset.fy || 0.35); }
      else if (p && performance.now() - p.t < 2600) { x = p.x; y = p.y; }
      else { const k = t / 1000 * 0.32; x = W * (0.5 + 0.34 * Math.sin(k)); y = H * (0.48 + 0.26 * Math.sin(k * 1.63 + 1)); }
      x = Math.max(0, Math.min(W, x)); y = Math.max(0, Math.min(H, y));
      lente.style.transform = `translate(${(x - r).toFixed(1)}px, ${(y - r).toFixed(1)}px)`;
      lente.style.backgroundSize = `${(W * z).toFixed(0)}px ${(H * z).toFixed(0)}px`;
      lente.style.backgroundPosition = `${(r - x * z).toFixed(1)}px ${(r - y * z).toFixed(1)}px`;
    });
  }
  $$('.lupa').forEach(el => el.addEventListener('pointermove', e => {
    const b = el.getBoundingClientRect();
    el._puntero = { x: (e.clientX - b.left) / escala, y: (e.clientY - b.top) / escala, t: performance.now() };
  }));
  function comparadores(lam, t) {
    cache(lam, '_comparadores', '.comparador').forEach(el => {
      let c;
      if (captura || quieto.matches) c = 50;
      else if (el._arrastre || (el._ultimo && performance.now() - el._ultimo < 4000)) c = el._corte;
      else c = 50 + 26 * Math.sin(t / 1000 * 0.45);
      el.style.setProperty('--corte', c.toFixed(2) + '%');
    });
  }
  $$('.comparador').forEach(el => {
    const mover = e => { const b = el.getBoundingClientRect(); el._corte = Math.max(4, Math.min(96, (e.clientX - b.left) / b.width * 100)); el._ultimo = performance.now(); };
    el.addEventListener('pointerdown', e => { el._arrastre = true; el.setPointerCapture(e.pointerId); mover(e); });
    el.addEventListener('pointermove', e => { if (el._arrastre) mover(e); });
    el.addEventListener('pointerup', () => { el._arrastre = false; });
    el.addEventListener('pointercancel', () => { el._arrastre = false; });
  });

  /* ---------- Activar una lámina ---------- */
  function activar(i, dir) {
    if (i < 0 || i >= total || i === actual) return;
    terminarTransiciones();
    const prev = actual >= 0 ? laminas[actual] : null;
    const sig = laminas[i];
    cargar(i);
    if (prev) {
      prev.classList.remove('activa');
      prev.setAttribute('aria-hidden', 'true');
      prev.inert = true;
    }
    sig.classList.add('activa');
    sig.removeAttribute('aria-hidden');
    sig.inert = false;
    paso = dir < 0 ? pasosDe(sig) : 0;
    mostrarPasos(sig, paso);
    sig.classList.remove('anima');
    void sig.offsetWidth;
    sig.classList.add('anima');
    actual = i;
    transicion(prev, sig, dir);
    contar(sig);
    puntos(sig);
    if (window.G3D) window.G3D.montar(sig, prev);
    sig.dispatchEvent(new CustomEvent('entrar', { detail: dir }));
    actualizarUI();
    if (!captura) { try { history.replaceState(null, '', '#' + sig.id); } catch (e) { /* sin historial */ } }
  }
  function avanzar() {
    const l = laminas[actual];
    if (l && paso < pasosDe(l)) { paso++; mostrarPasos(l, paso); return; }
    activar(actual + 1, 1);
  }
  function retroceder() {
    const l = laminas[actual];
    if (l && paso > 0) { paso--; mostrarPasos(l, paso); return; }
    activar(actual - 1, -1);
  }
  function ir(i) { if (i !== actual) activar(i, i > actual ? 1 : -1); }

  /* ---------- Paralaje (puntero o deriva lenta) ---------- */
  let px = 0, py = 0, tx = 0, ty = 0, ultimo = -1e9;
  addEventListener('pointermove', e => {
    const r = visor.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    ultimo = performance.now();
    if (e.pointerType !== 'touch') mostrarBarra();
  }, { passive: true });
  const PARALAJE = '.capa, .estante-escena, .estrato, .libro-escena, .diario-escena, .ejes-escena, .libro3d';
  let escritoX = null, escritoY = null, escritoEn = null;
  function bucle(t) {
    if (!quieto.matches && !captura && !tactil) {
      if (t - ultimo > 3500) {
        const k = t / 1000;
        tx = Math.sin(k * 0.21) * 0.32;
        ty = Math.sin(k * 0.16 + 1.3) * 0.22;
      }
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      const l = laminas[actual];
      if (l && (l !== escritoEn || Math.abs(px - escritoX) > 2e-4 || Math.abs(py - escritoY) > 2e-4)) {
        const sx = px.toFixed(4), sy = py.toFixed(4);
        cache(l, '_paralaje', PARALAJE).forEach(el => { el.style.setProperty('--px', sx); el.style.setProperty('--py', sy); });
        escritoX = px; escritoY = py; escritoEn = l;
      }
    }
    if (laminas[actual]) { orbitar(laminas[actual], t); lupas(laminas[actual], t); comparadores(laminas[actual], t); }
    if (window.G3D) window.G3D.cuadro(t, captura || tactil ? 0 : px, captura || tactil ? 0 : py);
    requestAnimationFrame(bucle);
  }

  /* ---------- Interfaz ---------- */
  const barra = $('#barra');
  const panelNotas = $('#panel-notas');
  const textoNotas = $('#texto-notas');
  const indice = $('#indice');
  const progreso = $('#progreso');
  let secAnterior = null;
  laminas.forEach((l, i) => {
    const s = document.createElement('span');
    if (l.dataset.seccion !== secAnterior && i > 0) s.className = 'inicio';
    secAnterior = l.dataset.seccion;
    progreso.appendChild(s);
  });
  const marcas = $$('span', progreso);

  // Índice por secciones
  (() => {
    let ol = null, sec = null;
    laminas.forEach((l, i) => {
      if (l.dataset.seccion !== sec) {
        sec = l.dataset.seccion;
        const h = document.createElement('h2');
        h.textContent = sec;
        indice.appendChild(h);
        ol = document.createElement('ol');
        indice.appendChild(ol);
      }
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>`;
      b.append(l.dataset.titulo || l.id);
      b.addEventListener('click', () => { ir(i); alternarIndice(false); });
      li.appendChild(b);
      ol.appendChild(li);
    });
  })();
  const botonesIndice = $$('button', indice);

  function actualizarUI() {
    $('#n-act').textContent = actual + 1;
    $('#n-tot').textContent = total;
    $('#seccion-actual').textContent = laminas[actual].dataset.seccion || '';
    marcas.forEach((m, i) => { m.classList.toggle('hecho', i < actual); m.classList.toggle('ahora', i === actual); });
    botonesIndice.forEach((b, i) => b.setAttribute('aria-current', i === actual ? 'true' : 'false'));
    const n = $('.notas', laminas[actual]);
    textoNotas.textContent = n ? n.textContent.trim() : 'Esta lámina no tiene notas.';
    $('#b-ant').disabled = actual === 0;
    $('#b-sig').disabled = actual === total - 1 && paso >= pasosDe(laminas[actual]);
  }
  function marcarBotones() {
    $('#b-notas').setAttribute('aria-pressed', String(!panelNotas.hidden));
    $('#b-indice').setAttribute('aria-pressed', String(!indice.hidden));
    $('#b-pantalla').setAttribute('aria-pressed', String(!!document.fullscreenElement));
  }
  function alternarNotas(v) { panelNotas.hidden = v === undefined ? !panelNotas.hidden : !v; marcarBotones(); mostrarBarra(); }
  function alternarIndice(v) { indice.hidden = v === undefined ? !indice.hidden : !v; marcarBotones(); mostrarBarra(); }
  function pantallaCompleta() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) { /* no disponible */ }
  }
  let reloj = 0;
  function mostrarBarra() {
    barra.classList.remove('oculta');
    clearTimeout(reloj);
    reloj = setTimeout(() => {
      if (barra.matches(':hover') || barra.contains(document.activeElement) || !panelNotas.hidden || !indice.hidden) return mostrarBarra();
      barra.classList.add('oculta');
    }, 1800);
  }
  $('#b-ant').addEventListener('click', retroceder);
  $('#b-sig').addEventListener('click', avanzar);
  $('#b-notas').addEventListener('click', () => alternarNotas());
  $('#b-indice').addEventListener('click', () => alternarIndice());
  $('#b-pantalla').addEventListener('click', pantallaCompleta);

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    const enBoton = e.target.closest && e.target.closest('button');
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'ArrowDown' || ((k === ' ' || k === 'Enter') && !enBoton)) { e.preventDefault(); avanzar(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp' || k === 'Backspace') { e.preventDefault(); retroceder(); }
    else if (k === 'Home') { e.preventDefault(); ir(0); }
    else if (k === 'End') { e.preventDefault(); ir(total - 1); }
    else if (k === 'f' || k === 'F') pantallaCompleta();
    else if (k === 'n' || k === 'N') alternarNotas();
    else if (k === 'i' || k === 'I') alternarIndice();
    else if (k === 'Escape') { alternarIndice(false); alternarNotas(false); }
  });

  // Deslizar en pantallas táctiles
  let x0 = null, y0 = null;
  visor.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  visor.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) avanzar(); else retroceder(); }
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) mostrarBarra();
    x0 = y0 = null;
  });

  /* ---------- Inicio ---------- */
  ajustar();
  const desde = laminas.findIndex(l => '#' + l.id === location.hash);
  activar(desde >= 0 ? desde : 0, 1);
  if (captura) {
    laminas.forEach(l => { l.dataset.cargada = ''; });
    const l = laminas[actual];
    const pq = new URLSearchParams(location.search).get('paso');
    mostrarPasos(l, pq !== null ? Math.min(+pq, pasosDe(l)) : pasosDe(l));
  }
  mostrarBarra();
  requestAnimationFrame(bucle);
  window.Presentacion = { ir, avanzar, retroceder, laminas };
})();
