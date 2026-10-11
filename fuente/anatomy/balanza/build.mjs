// Balanza de precisión: en un platillo la dedicatoria al mecenas, en el otro los pliegos del librero.
// Modelo (verdadero para el instrumento): cruz de brazos iguales sobre una cuchilla central; equilibrio
// tan θ = S·(n − m), con n pliegos y una dedicatoria que pesa m pliegos; los topes son los apoyos de los platillos;
// oscilación amortiguada θ'' = −ω²(θ − θeq) − 2ζωθ'. El fiel, vertical sobre la cruz, se inclina hacia el platillo que pesa más.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const KIT = "/Users/luiscifuentesacuna/.claude/skills/anatomy";
const k = await import(`${KIT}/kit/iso-kit.mjs`);
const G = await import(`${KIT}/kit/lathe.mjs`);
const { kitScript } = await import(`${KIT}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const WIDTH = 600;
const HEIGHT = 560;

// ---------- Modelo ----------
const N_MAX = 9;              // pliegos que caen en el platillo del librero
const M_DED = 4.5;            // la dedicatoria pesa lo que cuatro pliegos y medio
const SENS = 0.105;           // tan θ por pliego de diferencia (≈ 3° por medio pliego)
const SHEET = 0.5;            // grosor dibujado de un pliego

// ---------- Mundo (1 unidad ≈ 2,5 mm) ----------
const BASE = { x: -120, y: -42, w: 240, d: 84, r: 4 };
const BASE_Z = [0, 22];
const LIP_Z = [22, 26];
const TOP = 26;
const ZP = 170;               // eje de la cuchilla central
const L = 84;                 // medio brazo: de la cuchilla central a las de los extremos
const HANG = 112;             // de la cuchilla del extremo al fondo del platillo
const PAN_R = 24;
const PAN_T = 1.2;
const PAN_Z = ZP - HANG;      // 58: fondo del platillo con la cruz horizontal
const REST_TOP = 44;          // los apoyos detienen el platillo
const STOP = Math.asin((PAN_Z - REST_TOP) / L); // ≈ 9,6°
const NEEDLE = 74;            // largo del fiel sobre la cuchilla
const NEEDLE_Y = 2.2;         // plano del fiel, delante de la cruz
const ARC_Y = -2.6;           // plano de la escala, detrás del fiel
const ARC_R = [56, 72];
const ARC_SPAN = (16 * Math.PI) / 180;
const LETTER = { x: -L - 10, y: -7, w: 20, d: 14, r: 0.6 };
const STACK = { x: L - 15, y: -11, w: 30, d: 22, r: 0.4 };
const BOX = { x: 22, y: 16, w: 33, d: 22, r: 1.6 };
const BOX_Z = [TOP, TOP + 8];
const LEVEL = { x: -44, y: 24, r: 7 };

const P = k.fitProjection(
  [...k.boxCorners(BASE, -8, TOP), [0, 0, ZP + NEEDLE + 6], [-L - PAN_R, 0, PAN_Z], [L + PAN_R, 0, PAN_Z], [-L - 6, 0, ZP + 16], [L + 6, 0, ZP + 16]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 74, elevation: 20 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z0, z1, tone = "mid", steps = 3, bevel = 0.5, extra = {}) => S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone, ...extra });
const depth = (p) => k.depthOf(p, P);
const seg = (a, b) => k.pathOf([at(a), at(b)]);
const up = (o) => G.frameAlong(o, [0, 0, 1]);
const fwd = (o) => G.frameAlong(o, [0, 1, 0]);

// ---------- Base ----------
function feet() {
  const out = [];
  const spots = [[BASE.x + 14, BASE.y + 12], [BASE.x + BASE.w - 14, BASE.y + 12], [BASE.x + 14, BASE.y + BASE.d - 12], [BASE.x + BASE.w - 14, BASE.y + BASE.d - 12]];
  for (const [x, y] of spots.sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]))) {
    if (y > 0) {
      // patas delanteras: tornillos de nivelar con rueda moleteada
      out.push(S(k.cylinder(x, y, 5, -8, 2, P, 20), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 2, -6, 6, P, 12), { tone: "mid", crease: "none" }));
      out.push(S(k.cylinder(x, y, 7.5, -4.6, 2.6, P, 28, 0.3), { tone: "mid", inner: Ln(k.knurl(x, y, 7.5, -4.4, -2.2, 22, P), { tone: "lo" }) }));
    } else {
      out.push(S(k.cylinder(x, y, 6, -8, 8, P, 24, 0.4), { tone: "lo" }));
    }
  }
  return out.join("");
}

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -8, 4, P)}"/>`];
  out.push(feet());
  out.push(slab(BASE, BASE_Z[0], BASE_Z[1], "lo", 6, 1, { inner: Ln(k.sideSeam(BASE, 4, P, 6), { tone: "faint" }) }));
  out.push(slab(k.insetPlan(BASE, -2.5), LIP_Z[0], LIP_Z[1], "lo", 6, 0.8));
  // tapa: filete de cuero y tornillos en las esquinas
  const inlay = k.insetPlan(BASE, 7);
  out.push(Ln(k.planOutline(inlay, TOP, P, 4), { tone: "faint" }));
  out.push(Ln(k.planOutline(k.insetPlan(inlay, 2.2), TOP, P, 3), { tone: "faint" }));
  out.push(Dt(k.corners(BASE, 3.6).map(([x, y]) => at([x, y, TOP])), { size: 0.5 }));
  // frente: cajón, perilla de detener y placa del fabricante
  const yf = BASE.y + BASE.d;
  const drawer = { x: -104, y: yf, w: 74, d: 1.4, r: 0.5 };
  out.push(slab(drawer, 5, 17, "lo", 2, 0.3));
  out.push(Ln(k.pathOf([[-101, 7.4], [-33, 7.4], [-33, 14.6], [-101, 14.6]].map(([x, z]) => at([x, yf + 1.4, z])), true), { tone: "faint" }));
  const knob = fwd([-67, yf + 1.4, 11]);
  out.push(S(G.disc(0, 1.2, 2.6, knob, P), { tone: "mid" }));
  out.push(S(G.disc(1.2, 3.2, 1.6, knob, P), { tone: "mid" }));
  out.push(Dt([at([-67, yf + 1.4, 14.6])], { size: 0.55, tone: "mid" }));
  const arrest = fwd([0, yf, 11]);
  out.push(S(G.disc(0, 1.6, 6.5, arrest, P), { tone: "lo" }));
  out.push(S(G.disc(1.6, 3.4, 3.2, arrest, P), { tone: "mid" }));
  out.push(S(G.disc(3.4, 7.2, 5.6, arrest, P), { tone: "mid", inner: Ln(G.ribsOf(arrest, 3.6, 7, 5.6, 26, P, { seams: true }), { tone: "lo" }) }));
  const plate = { x: 34, y: yf, w: 58, d: 0.8, r: 0.4 };
  out.push(slab(plate, 6, 16, "mid", 2, 0.2));
  const rules = [];
  for (const z of [13.2, 11, 8.8]) rules.push(k.pathOf([at([40, yf + 0.8, z]), at([z === 11 ? 80 : 86, yf + 0.8, z])]));
  out.push(Ln(rules.join(""), { tone: "lo", free: true }));
  out.push(Dt([at([37, yf + 0.8, 11]), at([89, yf + 0.8, 11])], { size: 0.45 }));
  return out.join("");
}

function level() {
  const { x, y, r } = LEVEL;
  const F = up([x, y, TOP]);
  const out = [S(G.disc(0, 2.4, r, F, P), { tone: "mid" })];
  out.push(S(G.disc(2.4, 3, r - 1.6, F, P), { tone: "hi", crease: "lo" }));
  out.push(Ln(G.circleOf(F, 3, 2.4, P), { tone: "lo" }));
  out.push(Dt([at([x + 0.4, y - 0.3, TOP + 3])], { size: 0.7, tone: "mid" }));
  return out.join("");
}

function weightBox() {
  const out = [slab(BOX, BOX_Z[0], BOX_Z[1], "lo", 3, 0.5, { inner: Ln(k.sideSeam(BOX, BOX_Z[0] + 5.5, P, 3), { tone: "faint" }) })];
  // seis cavidades; cuatro pesas de latón en orden de tamaño
  const cells = [];
  for (const [i, x] of [BOX.x + 6.5, BOX.x + 16.5, BOX.x + 26.5].entries()) for (const [j, y] of [BOX.y + 6.5, BOX.y + 15.5].entries()) cells.push({ x, y, r: [4.2, 3.4, 2.6][i] - j * 0.6, w: i * 2 + j });
  cells.sort((a, b) => depth([a.x, a.y, 0]) - depth([b.x, b.y, 0]));
  for (const c of cells) {
    const F = up([c.x, c.y, BOX_Z[1]]);
    out.push(Ln(G.circleOf(F, 0, c.r + 0.6, P), { tone: "lo" }));
    if (c.w === 5 || c.w === 3) continue;
    const h = 2.4 + c.r * 1.1;
    out.push(S(k.cylinder(c.x, c.y, c.r, BOX_Z[1], h, P, 20, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(c.x, c.y, c.r * 0.42, BOX_Z[1] + h, 1.4, P, 12), { tone: "mid" }));
    out.push(S(G.sphereOf([c.x, c.y, BOX_Z[1] + h + 1.4 + c.r * 0.38], c.r * 0.5, P), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}

function rest(x) {
  const out = [S(k.cylinder(x, 0, 6, TOP, 1.6, P, 22), { tone: "lo" })];
  out.push(S(k.cylinder(x, 0, 3, TOP + 1.6, REST_TOP - 2.2 - TOP - 1.6, P, 16), { tone: "mid", crease: "none", inner: Ln(k.sideArc(x, 0, 3, TOP + 7, P, 12), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, 0, 6.5, REST_TOP - 2.2, 2.2, P, 24, 0.3), { tone: "lo" }));
  return out.join("");
}

// ---------- Columna ----------
function column() {
  const out = [];
  const F = up([0, 0, TOP]);
  out.push(S(G.lathe([[0, 0], [0, 16], [2, 16], [3.2, 13], [6.4, 9.4], [8, 6.6], [8, 0]], F, P), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 5.6, TOP + 8, 156 - TOP - 8, P, 28), { tone: "mid", crease: "none", inner: Ln([TOP + 40, 120].map((z) => k.sideArc(0, 0, 5.6, z, P, 14)).join(""), { tone: "faint" }) }));
  out.push(S(G.lathe([[0, 0], [0, 6.6], [1.6, 6.6], [3.2, 8.4], [5.6, 9.6], [6.4, 9.6], [6.4, 0]], up([0, 0, 154]), P), { tone: "mid" }));
  // soporte de ágata bajo la cuchilla central y la horquilla que sostiene la escala
  out.push(slab({ x: -8, y: -6, w: 16, d: 12, r: 1 }, 160.4, 164, "mid", 2, 0.4));
  out.push(slab({ x: -5, y: -3.2, w: 10, d: 6.4, r: 0.4 }, 164, 165, "hi", 2, 0, { crease: "lo" }));
  return out.join("");
}

// la escala del fiel: un arco graduado sostenido por dos montantes detrás de la cruz
function scaleBack() {
  const out = [];
  // dos brazos en V, detrás de la cruz, que sostienen el arco por sus extremos
  const F = G.frameOf([0, -7.8, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const a = ARC_SPAN - 0.02, r0 = ARC_R[0] + 1, r1 = ARC_R[0] + 7;
  for (const sx of [-1, 1]) {
    const top = [[sx * r0 * Math.sin(a), ZP + r0 * Math.cos(a)], [sx * r1 * Math.sin(a), ZP + r1 * Math.cos(a)]];
    const quad = [[sx * 3.4, 161], [sx * 8, 161], top[1], top[0]];
    out.push(S(G.prismOf(F, sx > 0 ? quad : [...quad].reverse(), 0, 1.8, P), { tone: "mid" }));
    out.push(Dt([at([sx * 5.7, -6, 162.6]), at([sx * (r0 + 3) * Math.sin(a), -6, ZP + (r0 + 3) * Math.cos(a)])], { size: 0.45 }));
  }
  return out.join("");
}

function scaleArc() {
  const out = [];
  const pt = (r, a, y = ARC_Y) => [r * Math.sin(a), y, ZP + r * Math.cos(a)];
  const N = 28;
  const ring = (r, y) => Array.from({ length: N + 1 }, (_, i) => pt(r, -ARC_SPAN + (2 * ARC_SPAN * i) / N, y));
  const front = [...ring(ARC_R[1], ARC_Y), ...ring(ARC_R[0], ARC_Y).reverse()];
  const back = front.map(([x, , z]) => [x, ARC_Y - 1.2, z]);
  const poly = (pts) => k.pathOf(pts.map(at), true);
  // canto superior visible y cara frontal
  const rim = [...ring(ARC_R[1], ARC_Y), ...ring(ARC_R[1], ARC_Y - 1.2).reverse()];
  out.push(`<g class="iso-solid"><path class="iso-fill" d="${poly(back)}${poly(rim)}${poly(front)}"/><path class="iso-shade" data-shade="2" d="${poly(rim)}"/><path class="iso-top" d="${poly(front)}"/><path class="iso-line iso-edge" data-tone="mid" d="${poly(front)}"/></g>`);
  // graduación: cada 2°, mayor cada 6°, el cero más largo; todas nacen en la línea base del arco
  const base = ARC_R[0] + 3;
  // banda de dos arcos: las divisiones menores la cruzan entera; las mayores salen y terminan en un punto
  const band = 3.8;
  out.push(Ln(k.pathOf(ring(base, ARC_Y).map(at)) + k.pathOf(ring(base + band, ARC_Y).map(at)), { tone: "mid" }));
  const minor = [], major = [], ends = [];
  for (let deg = -14; deg <= 14; deg += 2) {
    const a = (deg * Math.PI) / 180;
    const len = deg === 0 ? 9 : deg % 6 === 0 ? 6.4 : band;
    (deg % 6 === 0 ? major : minor).push(k.pathOf([at(pt(base, a)), at(pt(base + len, a))]));
    if (deg % 6 === 0 && deg !== 0) ends.push(at(pt(base + len, a)));
  }
  out.push(Ln(minor.join(""), { tone: "lo" }));
  out.push(Ln(major.join(""), { tone: "mid" }));
  out.push(Dt(ends, { size: 0.45, tone: "mid" }));
  out.push(Dt([at(pt(base + 9, 0))], { size: 0.8, tone: "hi" }));
  out.push(Dt([at(pt((ARC_R[0] + ARC_R[1]) / 2, -ARC_SPAN + 0.03)), at(pt((ARC_R[0] + ARC_R[1]) / 2, ARC_SPAN - 0.03))], { size: 0.5 }));
  return out.join("");
}

// ---------- Cruz (gira alrededor de la cuchilla central) ----------
function beam() {
  const F = G.frameOf([0, -1.5, ZP], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const prof = [[-L - 3, 0], [-L, 2.2], [-10, 6.4], [10, 6.4], [L, 2.2], [L + 3, 0], [L, -2.2], [10, -4.6], [-10, -4.6], [-L, -2.2]];
  const out = [];
  // cuchillas: las de los extremos con el filo hacia arriba, la central hacia abajo; atraviesan la cruz
  const knives = (y0, y1) => {
    const r = [];
    for (const sx of [-1, 1]) r.push(S(G.prismOf(G.frameOf([sx * L, y0, ZP], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[-1.4, 0], [1.4, 0], [0, 2.6]], 0, y1 - y0, P), { tone: "lo" }));
    r.push(S(G.prismOf(G.frameOf([0, y0, ZP], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[-2, 0], [2, 0], [0, -5]], 0, y1 - y0, P), { tone: "lo" }));
    return r.join("");
  };
  out.push(knives(-4.6, -1.5));
  out.push(S(G.prismOf(F, prof, 0, 3, P), { tone: "hi", crease: "lo" }));
  out.push(knives(1.5, 4.6));
  // aligeramientos, filete y tuercas de ajuste en los extremos
  const Ff = (x, z) => G.frameOf([x, 1.5, ZP + z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const holes = [];
  for (const x of [-56, -32, 32, 56]) holes.push(G.circleOf(Ff(x, 0.6), 0, Math.abs(x) > 40 ? 1.5 : 2.2, P));
  out.push(Ln(holes.join(""), { tone: "lo" }));
  out.push(Ln(k.pathOf([[-L - 3, 0], [-12, 3.6], [12, 3.6], [L + 3, 0]].map(([x, z]) => at([x, 1.5, ZP + z]))), { tone: "faint" }));
  for (const sx of [-1, 1]) {
    const Fn = G.frameOf([sx * (L - 16), 0, ZP + 0.2], [sx, 0, 0], [0, 1, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 3, 2.4, Fn, P), { tone: "mid" }));
  }
  out.push(Dt([at([-10, 1.5, ZP + 1]), at([10, 1.5, ZP + 1])], { size: 0.5 }));
  return out.join("");
}

function needle() {
  const F = G.frameOf([0, NEEDLE_Y - 0.4, ZP], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const out = [];
  out.push(S(G.prismOf(F, [[-1.3, 2], [1.3, 2], [0.35, NEEDLE], [-0.35, NEEDLE]], 0, 0.8, P), { tone: "hi", crease: "none" }));
  // contrapeso del fiel: una tuerca para ajustar la sensibilidad
  out.push(S(G.prismOf(F, [[-2.2, 20], [2.2, 20], [2.2, 24], [-2.2, 24]], -0.6, 1.4, P), { tone: "mid" }));
  return out.join("");
}

function pivotCap() {
  const F = fwd([0, 1.5, ZP]);
  return S(G.disc(0, 2.2, 3.4, F, P), { tone: "mid" }) + Dt([at([0, 3.7, ZP])], { size: 0.6, tone: "hi" });
}

// ---------- Platillos (cuelgan siempre verticales; se trasladan con los extremos de la cruz) ----------
function stirrupBack(sx) {
  const x = sx * L;
  return slab({ x: x - 2.4, y: -6.4, w: 4.8, d: 1.6, r: 0.3 }, ZP - 9, ZP + 2.6, "mid", 2, 0.2);
}
function stirrupFront(sx) {
  const x = sx * L;
  const out = [];
  out.push(slab({ x: x - 2.6, y: -6.4, w: 5.2, d: 12.8, r: 0.6 }, ZP + 2.6, ZP + 4.2, "mid", 2, 0.3));
  out.push(slab({ x: x - 2.4, y: 4.8, w: 4.8, d: 1.6, r: 0.3 }, ZP - 9, ZP + 2.6, "mid", 2, 0.2));
  out.push(slab({ x: x - 2.4, y: -6.4, w: 4.8, d: 12.8, r: 0.3 }, ZP - 10.6, ZP - 9, "mid", 2, 0.2));
  // gancho y percha de tres varillas
  out.push(S(k.cylinder(x, 0, 0.9, ZP - 18, 7.4, P, 10), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, 0, 2.6, ZP - 20, 2, P, 16), { tone: "mid" }));
  return out.join("");
}
function hanger(sx) {
  const x = sx * L;
  const rods = [];
  for (const a of [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6]) {
    const rim = [x + (PAN_R - 1.4) * Math.cos(a), (PAN_R - 1.4) * Math.sin(a), PAN_Z + PAN_T];
    rods.push({ d: seg([x + 2.2 * Math.cos(a), 2.2 * Math.sin(a), ZP - 20], rim), back: Math.sin(a) < 0, rim });
  }
  return rods;
}
function pan(sx) {
  const x = sx * L;
  const F = up([x, 0, PAN_Z]);
  const out = [S(G.disc(0, PAN_T, PAN_R, F, P), { tone: "mid" })];
  out.push(Ln(G.circleOf(F, PAN_T, PAN_R - 2.4, P), { tone: "faint" }));
  return out.join("");
}
function letter() {
  const z = PAN_Z + PAN_T;
  const out = [S(k.slabOf(LETTER, z, 1.4, P, 2, 0.3), { tone: "hi", crease: "lo" })];
  out.push(Ln(k.lineOnTop([LETTER.x + 7, LETTER.y], [LETTER.x + 7, LETTER.y + LETTER.d], z + 1.4, P), { tone: "faint" }));
  const F = up([LETTER.x + 13.5, LETTER.y + 7, z + 1.4]);
  out.push(S(G.disc(0, 0.7, 2.6, F, P), { tone: "mid" }));
  out.push(Ln(G.circleOf(F, 0.7, 1.4, P), { tone: "lo" }));
  return out.join("");
}

function sidePan(sx) {
  const rods = hanger(sx);
  const out = [];
  out.push(Ln(rods.filter((r) => r.back).map((r) => r.d).join(""), { tone: "mid" }));
  out.push(pan(sx));
  out.push(stirrupFront(sx));
  if (sx < 0) out.push(letter());
  else out.push(`<g data-part="stack"></g><g data-part="falling"></g>`);
  out.push(Ln(rods.filter((r) => !r.back).map((r) => r.d).join(""), { tone: "mid" }));
  out.push(Dt(rods.map((r) => at(r.rim)), { size: 0.5, tone: "mid" }));
  return out.join("");
}

// ---------- Ensamble ----------
const topItems = [
  { at: [-L, 0, TOP], svg: rest(-L) },
  { at: [LEVEL.x, LEVEL.y, TOP], svg: level() },
  { at: [BOX.x + BOX.w / 2, BOX.y + BOX.d / 2, TOP], svg: weightBox() },
  { at: [L, 0, TOP], svg: rest(L) },
].sort((a, b) => depth(a.at) - depth(b.at)).map((i) => i.svg);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "balanza-svg",
  label: "Una balanza de precisión sobre una base con cajón, nivel y caja de pesas: una cruz de brazos iguales apoyada en una cuchilla, el fiel sobre la cruz frente a un arco graduado y dos platillos colgados de tres varillas. En el de la izquierda, una dedicatoria lacrada; en el de la derecha caen, uno a uno, los pliegos impresos.",
  body: [
    base(),
    ...topItems,
    column(),
    scaleBack(),
    scaleArc(),
    `<g data-part="back-left">${stirrupBack(-1)}</g><g data-part="back-right">${stirrupBack(1)}</g>`,
    `<g data-part="beam">${beam()}</g>`,
    `<g data-part="needle">${needle()}</g>`,
    pivotCap(),
    `<g data-part="pan-left">${sidePan(-1)}</g>`,
    `<g data-part="pan-right">${sidePan(1)}</g>`,
  ],
});

const DATA = { P, N_MAX, M_DED, SENS, SHEET, ZP, L, PAN_Z, PAN_T, STOP, NEEDLE_Y, STACK };

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const root = document.querySelector("[data-balanza]");
const svg = root.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const beamEl = $('[data-part="beam"]'), needleEl = $('[data-part="needle"]'), backL = $('[data-part="back-left"]'), backR = $('[data-part="back-right"]');
const leftEl = $('[data-part="pan-left"]'), rightEl = $('[data-part="pan-right"]'), stackEl = $('[data-part="stack"]'), fallEl = $('[data-part="falling"]');
const readout = root.closest(".iso-plate").querySelector("[data-readout]");
const still = { matches: matchMedia("(prefers-reduced-motion: reduce)").matches || /captura/.test(location.search) };

// rotación de la cruz en el plano x–z, llevada a la pantalla como una afín por plano y
const o = iso([0, 0, 0], P), ex = iso([1, 0, 0], P), ez = iso([0, 0, 1], P);
const B = [[ex[0] - o[0], ez[0] - o[0]], [ex[1] - o[1], ez[1] - o[1]]];
const det = B[0][0] * B[1][1] - B[0][1] * B[1][0];
const Bi = [[B[1][1] / det, -B[0][1] / det], [-B[1][0] / det, B[0][0] / det]];
const mul = (A, C) => [[A[0][0] * C[0][0] + A[0][1] * C[1][0], A[0][0] * C[0][1] + A[0][1] * C[1][1]], [A[1][0] * C[0][0] + A[1][1] * C[1][0], A[1][0] * C[0][1] + A[1][1] * C[1][1]]];
function matrixFor(theta, y) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const T = mul(mul(B, [[c, s], [-s, c]]), Bi);
  const O = iso([0, y, D.ZP], P);
  const e = O[0] - (T[0][0] * O[0] + T[0][1] * O[1]), f = O[1] - (T[1][0] * O[0] + T[1][1] * O[1]);
  return "matrix(" + [T[0][0], T[1][0], T[0][1], T[1][1], e, f].map((v) => v.toFixed(5)).join(" ") + ")";
}

const jit = (i) => [Math.sin(i * 12.9898) * 0.9, Math.cos(i * 78.233) * 0.7];
function sheetSvg(i, z, lines) {
  const [jx, jy] = jit(i);
  const plan = { x: D.STACK.x + jx, y: D.STACK.y + jy, w: D.STACK.w, d: D.STACK.d, r: D.STACK.r };
  let inner = "";
  if (lines) {
    const rows = [];
    for (let k = 0; k < 7; k++) {
      const y = plan.y + 3.4 + k * 2.6;
      rows.push(lineOnTop([plan.x + 3.5, y], [plan.x + plan.w - 3.5 - (k % 3) * 2.2, y], z + D.SHEET, P));
    }
    inner = lineSvg(rows.join(""), { tone: "lo", free: true });
  }
  return solidSvg(slabOf(plan, z, D.SHEET, P, 2, 0), { tone: "hi", lit: true, crease: "none", inner });
}
let shown = -1;
function drawStack(n) {
  if (n === shown) return;
  shown = n;
  const z0 = D.PAN_Z + D.PAN_T, out = [];
  for (let i = 0; i < n; i++) out.push(sheetSvg(i, z0 + i * D.SHEET, i === n - 1));
  stackEl.innerHTML = out.join("");
}

let theta = -D.STOP, omega = 0, n = 0, target = null, idle = 0, playing = !still.matches;
let phase = "drop", phaseT = 0, fall = -1, visible = false, frame = 0, last = 0;
const W0 = (2 * Math.PI) / 1.5, ZETA = 0.14, GAP = 1.15, FALL = 0.55, HOLD = 3.6, CLEAR = 0.7, REST = 1.2;
const eq = (m) => Math.max(-D.STOP, Math.min(D.STOP, Math.atan(D.SENS * (m - D.M_DED))));

function step(dt) {
  const te = eq(n);
  const acc = -W0 * W0 * (theta - te) - 2 * ZETA * W0 * omega;
  omega += acc * dt; theta += omega * dt;
  if (theta > D.STOP) { theta = D.STOP; omega = omega > 0 ? -0.18 * omega : omega; }
  if (theta < -D.STOP) { theta = -D.STOP; omega = omega < 0 ? -0.18 * omega : omega; }
}
function advance(dt) {
  if (target !== null) { fall = -1; if (n !== target) n = target; return; }
  phaseT += dt;
  if (phase === "drop") {
    if (fall < 0 && phaseT >= GAP && n < D.N_MAX) { fall = 0; phaseT = 0; }
    if (fall >= 0) { fall += dt / FALL; if (fall >= 1) { fall = -1; n += 1; omega += 0.32; phaseT = 0; } }
    if (n >= D.N_MAX && fall < 0) { phase = "hold"; phaseT = 0; }
  } else if (phase === "hold" && phaseT >= HOLD) { phase = "clear"; phaseT = 0; }
  else if (phase === "clear" && phaseT >= CLEAR) { n = 0; phase = "rest"; phaseT = 0; }
  else if (phase === "rest" && phaseT >= REST) { phase = "drop"; phaseT = GAP; }
}
function draw() {
  beamEl.setAttribute("transform", matrixFor(theta, 0));
  needleEl.setAttribute("transform", matrixFor(theta, D.NEEDLE_Y));
  const c = Math.cos(theta), s = Math.sin(theta);
  const dxR = D.L * c - D.L, dzR = -D.L * s;
  const tR = translateAlong(P, [dxR, 0, dzR]), tL = translateAlong(P, [-dxR, 0, -dzR]);
  rightEl.setAttribute("transform", tR); backR.setAttribute("transform", tR);
  leftEl.setAttribute("transform", tL); backL.setAttribute("transform", tL);
  drawStack(n);
  stackEl.style.opacity = phase === "clear" ? Math.max(0, 1 - phaseT / CLEAR).toFixed(3) : "";
  stackEl.setAttribute("transform", phase === "clear" ? translateAlong(P, [0, 0, (phaseT / CLEAR) * 14]) : "");
  if (fall >= 0) {
    const e = fall * fall, z = D.PAN_Z + D.PAN_T + n * D.SHEET;
    fallEl.innerHTML = sheetSvg(n, z, false);
    fallEl.setAttribute("transform", translateAlong(P, [Math.sin(fall * 5) * 2.4 * (1 - fall), 0, (1 - e) * 64]));
    fallEl.style.opacity = Math.min(1, fall * 6).toFixed(3);
  } else if (fallEl.firstChild) fallEl.innerHTML = "";
  const deg = Math.round((theta * 180) / Math.PI);
  const text = n + (n === 1 ? " pliego" : " pliegos") + " · fiel " + (deg > 0 ? "+" : deg < 0 ? "−" : "") + Math.abs(deg);
  if (readout && readout.textContent !== text) readout.textContent = text;
  root.setAttribute("aria-valuenow", String(n));
  root.setAttribute("aria-valuetext", text);
}
const LIVIANO = matchMedia("(hover: none), (pointer: coarse)").matches;
let saltar = false;
function tick(now) {
  if (LIVIANO && (saltar = !saltar)) { if (lam) visible = lam.classList.contains("activa"); frame = visible ? requestAnimationFrame(tick) : 0; return; }
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (playing || target !== null) {
    advance(dt);
    const sub = 4;
    for (let i = 0; i < sub; i++) step(dt / sub);
  }
  draw();
  if (lam) visible = lam.classList.contains("activa");
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (m) => { target = Math.max(0, Math.min(D.N_MAX, Math.round(m))); phase = "drop"; phaseT = 0; clearTimeout(idle); idle = setTimeout(() => { target = null; }, 4000); run(); };
const lam = root.closest(".lamina");
if (lam) {
  visible = lam.classList.contains("activa");
  lam.addEventListener("entrar", () => { visible = true; n = 0; theta = -D.STOP; omega = 0; phase = "drop"; phaseT = 0.4; fall = -1; target = null; run(); });
  new MutationObserver(() => { visible = lam.classList.contains("activa"); if (visible) run(); }).observe(lam, { attributes: true, attributeFilter: ["class"] });
} else {
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(root);
}
const fromX = (e) => { const b = svg.getBoundingClientRect(); return ((e.clientX - b.left) / b.width - 0.1) / 0.8 * D.N_MAX; };
root.addEventListener("pointerdown", (e) => steer(fromX(e)));
root.addEventListener("pointermove", (e) => { if (e.buttons & 1) steer(fromX(e)); });
if (!lam) root.addEventListener("keydown", (e) => {
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = (target ?? n) + 1;
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = (target ?? n) - 1;
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = D.N_MAX;
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); playing = !playing; run(); return; }
  if (to === null) return;
  e.preventDefault(); steer(to);
});
if (still.matches) { n = D.N_MAX; theta = eq(n); phase = "hold"; }
draw();
run();
`;

const CSS = `
.iso[data-theme="light"] .iso-figure, .iso[data-theme="light"].balanza-tema, .balanza-tema .iso-figure{
  --anatomy-page:#F3F6F9;--anatomy-card:#FAFAF7;--anatomy-paper:#FAFAF7;--anatomy-face:#FFFFFF;--anatomy-top:#FFFFFF;
  --anatomy-shade-0:#D5DFE9;--anatomy-shade-1:#DFE7EF;--anatomy-shade-2:#E9EFF5;--anatomy-shade-3:#F2F5F9;
  --anatomy-lit-top:#FBE7B0;--anatomy-lit-shade:#F6D16E;
  --anatomy-hi:#0F2238;--anatomy-mid:#47627F;--anatomy-lo:#9AB0C6;--anatomy-faint:#CBD7E3;--anatomy-lit:#0F2238;
  --anatomy-halo:#7F98B3;--anatomy-halo-opacity:.3;--anatomy-dot:#143A5F;
  --anatomy-text:#34465A;--anatomy-strong:#0F2238;--anatomy-muted:#5B6E83;
}
`;

const bodyRaw = k.plateHtml({
  fig: "Fig 3",
  title: "Balanza de precisión",
  readout: "0 pliegos · fiel −10",
  keys: [
    { mark: "lit", label: "Los pliegos que paga el librero" },
    { mark: "raised", label: "La dedicatoria al mecenas" },
  ],
  caption: "Una balanza de precisión de brazos iguales. Por convención de la figura, la dedicatoria pesa lo que cuatro pliegos y medio: con cinco pliegos el fiel cruza el cero y la balanza se inclina hacia el librero.",
  body: `<div class="iso-stage" data-balanza tabindex="0" role="slider" aria-label="Balanza: pliegos en el platillo del librero" aria-valuemin="0" aria-valuemax="${N_MAX}" aria-valuenow="0">${svg}</div>`,
});
const body = bodyRaw;

const page = k.pageHtml({ title: "Balanza de precisión", theme, body: `<style>${CSS}</style>` + body, script: kitScript() + live });
const name = theme === "light" ? "balanza-light.html" : "balanza.html";
writeFileSync(join(HERE, name), page);
writeFileSync(join(HERE, "balanza-fragmento.json"), JSON.stringify({ body, css: CSS, live }));
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
