/* Objetos 3D (three.js r128): cifras extruidas a partir de contornos vectoriales,
   con un grabado en la cara frontal. Un solo renderizador; su lienzo se traslada a la lámina activa. */
window.G3D = (() => {
  'use strict';
  const T = window.THREE;
  const captura = /captura/.test(location.search);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const tactil = matchMedia('(hover: none), (pointer: coarse)').matches;
  let renderer = null;
  let lienzo = null;
  let activo = null;
  let escala = 1;
  let falla = false;
  const escenas = new Map();

  function iniciar() {
    if (renderer) return true;
    if (falla || !T) return false;
    try {
      lienzo = document.createElement('canvas');
      lienzo.setAttribute('aria-hidden', 'true');
      renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: !tactil, alpha: true, preserveDrawingBuffer: captura, powerPreference: tactil ? 'low-power' : 'default' });
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = tactil ? T.PCFShadowMap : T.PCFSoftShadowMap;
      lienzo.addEventListener('webglcontextlost', e => { e.preventDefault(); falla = true; if (activo) activo.cont.classList.remove('gl-listo'); });
      return true;
    } catch (e) {
      falla = true;
      return false;
    }
  }

  function formas(nombre) {
    const g = window.GLIFOS[nombre];
    const ruta = (cmds, p) => {
      for (const c of cmds) {
        if (c[0] === 'M') p.moveTo(c[1], c[2]);
        else if (c[0] === 'L') p.lineTo(c[1], c[2]);
        else p.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
      }
      return p;
    };
    const lista = g.shapes.map(s => {
      const sh = ruta(s.outer, new T.Shape());
      s.holes.forEach(h => sh.holes.push(ruta(h, new T.Path())));
      return sh;
    });
    return { lista, w: g.w, h: g.h };
  }

  const salirAtras = k => { const c = 1.45, d = c + 1; return 1 + d * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  function crearCifra(cont) {
    const d = cont.dataset;
    const { lista, w, h } = formas(d.glifo);
    const prof = +(d.prof || 120);
    const geo = new T.ExtrudeGeometry(lista, {
      depth: prof, bevelEnabled: true, bevelThickness: 9, bevelSize: 6, bevelOffset: 0, bevelSegments: 5, curveSegments: 18
    });
    geo.translate(0, h / 2, -prof / 2);

    const escena = new T.Scene();
    const tex = new T.TextureLoader().load(d.cara, t => {
      const iw = t.image.width, ih = t.image.height;
      const s = Math.max(w / iw, h / ih) * 1.02;
      const mw = iw * s, mh = ih * s;
      const [fx, fy] = (d.foco || '0.5,0.5').split(',').map(Number);
      const cl = (v, a, b) => Math.min(b, Math.max(a, v));
      t.repeat.set(1 / mw, 1 / mh);
      t.offset.set(cl(fx, w / (2 * mw), 1 - w / (2 * mw)), cl(1 - fy, h / (2 * mh), 1 - h / (2 * mh)));
      t.needsUpdate = true;
      E.listaTextura = true;
    });
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 8;
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    const lin = c => new T.Color(c).convertSRGBToLinear();
    const matCara = new T.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0.0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 });
    const matLado = new T.MeshStandardMaterial({ color: lin(d.lado || '#143A5F'), roughness: 0.34, metalness: 0.28 });
    const malla = new T.Mesh(geo, [matCara, matLado]);
    malla.castShadow = true;

    const bisagra = new T.Group();
    bisagra.add(malla);
    const giro = new T.Group();
    giro.add(bisagra);
    escena.add(giro);

    const suelo = new T.Mesh(new T.PlaneGeometry(w * 4, w * 3), new T.ShadowMaterial({ opacity: +(d.sombra || 0.16) }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -1;
    suelo.receiveShadow = true;
    escena.add(suelo);

    escena.add(new T.HemisphereLight(0xffffff, lin('#8FB3D9'), 0.62));
    const clave = new T.DirectionalLight(0xffffff, 0.95);
    clave.position.set(-w * 0.55, h * 2.1, w * 1.1);
    clave.castShadow = true;
    clave.shadow.mapSize.set(tactil ? 1024 : 2048, tactil ? 1024 : 2048);
    const sc = clave.shadow.camera;
    sc.left = -w; sc.right = w; sc.top = w; sc.bottom = -w; sc.near = 10; sc.far = w * 6;
    clave.shadow.radius = 6;
    clave.shadow.bias = -0.0008;
    escena.add(clave);
    const borde = new T.DirectionalLight(lin('#F6D16E'), 1.25);
    borde.position.set(w * 0.9, h * 0.6, -w * 0.7);
    escena.add(borde);
    const calido = new T.PointLight(lin('#F6D16E'), 0.5, 0, 2);
    calido.position.set(w * 0.75, h * 0.15, w * 0.5);
    escena.add(calido);

    const camara = new T.PerspectiveCamera(24, 1, 10, w * 20);
    const E = {
      cont, escena, camara, giro, bisagra, listaTextura: false, t0: 0,
      reiniciar() { this.t0 = performance.now() + 250; },
      encuadrar(aspecto) {
        camara.aspect = aspecto;
        const tan = Math.tan((camara.fov * Math.PI / 180) / 2);
        const dist = Math.max((w * 1.12) / (2 * tan * aspecto), (h * 1.32) / (2 * tan));
        const elev = +(d.elev || 0.32);
        camara.position.set(0, h * 0.5 + dist * Math.sin(elev * 0.5), dist);
        camara.lookAt(0, h * 0.47, 0);
        camara.updateProjectionMatrix();
      },
      actualizar(t, px, py) {
        const k = quieto.matches || captura ? 1 : Math.min(1, Math.max(0, (t - this.t0) / 1500));
        bisagra.rotation.x = -Math.PI / 2 * (1 - salirAtras(k));
        const vaiven = quieto.matches || captura || tactil ? 0 : Math.sin(t / 2300) * 0.035;
        const base = +(d.giro || -0.16);
        giro.rotation.y += ((base + px * 0.2 + vaiven) - giro.rotation.y) * 0.08;
        giro.rotation.x += ((py * 0.05) - giro.rotation.x) * 0.08;
      },
      firma(t) {
        const k = quieto.matches || captura ? 1 : (t - this.t0) / 1500;
        return [k < 1.05 ? t : 'k', giro.rotation.y.toFixed(4), giro.rotation.x.toFixed(4), this.listaTextura].join('|');
      }
    };
    return E;
  }


  /* Pilas de monedas y los seis tomos de Tom Jones: precios y salarios hacia 1750 */
  function crearMonedas(cont) {
    const d = cont.dataset;
    const lin = c => new T.Color(c).convertSRGBToLinear();
    const escena = new T.Scene();
    const camara = new T.PerspectiveCamera(28, 1, 0.1, 300);
    const grupo = new T.Group();
    escena.add(grupo);
    escena.add(new T.HemisphereLight(0xffffff, lin('#8FB3D9'), 0.7));
    const clave = new T.DirectionalLight(0xffffff, 0.9);
    clave.position.set(-6, 14, 9);
    clave.castShadow = true;
    clave.shadow.mapSize.set(tactil ? 1024 : 2048, tactil ? 1024 : 2048);
    Object.assign(clave.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 50 });
    clave.shadow.radius = 5;
    escena.add(clave);
    const borde = new T.DirectionalLight(lin('#F6D16E'), 0.9);
    borde.position.set(10, 6, -8);
    escena.add(borde);
    const suelo = new T.Mesh(new T.PlaneGeometry(80, 40), new T.ShadowMaterial({ opacity: 0.14 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    escena.add(suelo);

    let pendientes = 2;
    const listo = () => { pendientes -= 1; if (pendientes <= 0) E.listaTextura = true; };
    const carga = new T.TextureLoader();
    const cara = (url) => { const t = carga.load(url, listo); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
    const tChelin = cara(d.chelin), tPenique = cara(d.penique);
    const canto = new T.MeshStandardMaterial({ color: lin('#A9BDD1'), metalness: 0.75, roughness: 0.32 });
    const matCara = t => new T.MeshStandardMaterial({ map: t, metalness: 0.45, roughness: 0.38 });
    const piezas = [];
    const pila = (col, n, r, tex, retardo) => {
      const h = 0.17;
      const geo = new T.CylinderGeometry(r, r, h, 64);
      const mats = [canto, matCara(tex), matCara(tex)];
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(geo, mats);
        m.castShadow = true; m.receiveShadow = true;
        const jx = Math.sin(i * 12.9898) * 0.04, jz = Math.cos(i * 78.233) * 0.04;
        m.userData = { col, dx: jx, z: jz, y: h / 2 + i * h * 1.02, t0: retardo + i * 70, giro: (i * 0.7) % 6.28 };
        m.position.set(jx, m.userData.y, m.userData.z);
        m.rotation.y = m.userData.giro;
        grupo.add(m); piezas.push(m);
      }
    };
    pila(0, 1, 0.85, tPenique, 300);
    pila(1, 10, 1.1, tChelin, 700);
    pila(2, 20, 1.1, tChelin, 1500);
    // seis tomos de Tom Jones con lomos en amarillo de Nápoles
    const lomo = (n) => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 512;
      const g = c.getContext('2d');
      g.fillStyle = '#F6D16E'; g.fillRect(0, 0, 128, 512);
      const grad = g.createLinearGradient(0, 0, 128, 0);
      grad.addColorStop(0, 'rgba(0,0,0,.18)'); grad.addColorStop(.35, 'rgba(255,255,255,.18)'); grad.addColorStop(1, 'rgba(0,0,0,.2)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 512);
      g.fillStyle = '#143A5F';
      for (const y of [40, 56, 440, 456]) g.fillRect(0, y, 128, 5);
      g.fillRect(16, 92, 96, 236);
      g.fillStyle = '#F6D16E';
      g.save(); g.translate(64, 210); g.rotate(Math.PI / 2);
      g.font = '600 31px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('TOM JONES', 0, 0); g.restore();
      g.fillStyle = '#143A5F'; g.font = '600 40px Georgia, serif'; g.textAlign = 'center';
      g.fillText(['I', 'II', 'III', 'IV', 'V', 'VI'][n], 64, 384);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
    };
    const tapa = new T.MeshStandardMaterial({ color: lin('#E9BE4F'), roughness: 0.6 });
    const papel = new T.MeshStandardMaterial({ color: lin('#F3EFE4'), roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const w = 0.6, hb = 3.2, db = 2.1;
      const geo = new T.BoxGeometry(w, hb, db);
      const m = new T.Mesh(geo, [tapa, tapa, papel, papel, new T.MeshStandardMaterial({ map: lomo(i), roughness: 0.55 }), tapa]);
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { col: 3, dx: (i - 2.5) * (w + 0.05), z: 0, y: hb / 2, t0: 2600 + i * 120, libro: true };
      m.position.set(m.userData.dx, m.userData.y, 0);
      grupo.add(m); piezas.push(m);
    }
    const caer = k => { const n1 = 7.5625, d1 = 2.75; if (k < 1 / d1) return n1 * k * k; if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75; if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375; return n1 * (k -= 2.625 / d1) * k + 0.984375; };
    const E = {
      cont, escena, camara, listaTextura: false, t0: 0,
      reiniciar() { this.t0 = performance.now(); },
      encuadrar(aspecto) {
        camara.aspect = aspecto;
        camara.fov = 26;
        const dist = 15.5;
        camara.position.set(0, 8.6, dist);
        camara.lookAt(0, 3.1, 0);
        camara.updateProjectionMatrix();
        const visW = 2 * Math.hypot(dist, 6.1) * Math.tan(13 * Math.PI / 180) * aspecto;
        const xs = [-0.375, -0.125, 0.125, 0.375].map(f => f * visW);
        for (const m of piezas) m.position.x = xs[m.userData.col] + m.userData.dx;
      },
      actualizar(t, px, py) {
        const dt = quieto.matches || captura ? 1e9 : t - this.t0;
        for (const m of piezas) {
          const u = m.userData;
          const k = Math.min(1, Math.max(0, (dt - u.t0) / (u.libro ? 700 : 560)));
          if (u.libro) { m.scale.y = Math.max(0.001, 1 - Math.pow(1 - k, 3)); m.position.y = (u.y) * m.scale.y; m.visible = k > 0; }
          else { m.position.y = u.y + (1 - caer(k)) * 7; m.visible = k > 0; }
        }
        grupo.rotation.y += ((px * 0.16) - grupo.rotation.y) * 0.06;
        grupo.rotation.x += ((py * 0.04) - grupo.rotation.x) * 0.06;
      },
      firma(t) {
        const dt = quieto.matches || captura ? 1e9 : t - this.t0;
        return [dt < 4600 ? t : 'fin', grupo.rotation.y.toFixed(4), grupo.rotation.x.toFixed(4), this.listaTextura].join('|');
      }
    };
    return E;
  }

  function dimensionar() {
    if (!activo || !renderer) return;
    const r = activo.cont;
    const w = r.offsetWidth, h = r.offsetHeight;
    const pr = Math.min(tactil ? 1.25 : 2, Math.max(0.5, escala * (window.devicePixelRatio || 1)));
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    activo.encuadrar(w / h);
    activo._firma = null;
  }

  return {
    escala(s) { escala = s; dimensionar(); },
    montar(lamina, anterior) {
      if (activo && anterior && anterior.contains(activo.cont)) activo.cont.classList.remove('gl-listo');
      const cont = lamina.querySelector('.escena3d');
      activo = null;
      if (!cont || !iniciar()) return;
      let E = escenas.get(cont);
      if (!E) {
        try { E = cont.dataset.tipo === 'monedas' ? crearMonedas(cont) : crearCifra(cont); } catch (e) { falla = true; return; }
        escenas.set(cont, E);
      }
      cont.appendChild(lienzo);
      activo = E;
      E.reiniciar();
      E._firma = null;
      dimensionar();
    },
    cuadro(t, px, py) {
      if (!activo || falla) return;
      activo.actualizar(t, px, py);
      // solo se vuelve a dibujar si algo cambió
      const f = activo.firma(t);
      if (f === activo._firma && activo.cont.classList.contains('gl-listo')) return;
      activo._firma = f;
      renderer.render(activo.escena, activo.camara);
      if (activo.listaTextura && !activo.cont.classList.contains('gl-listo')) activo.cont.classList.add('gl-listo');
    }
  };
})();
