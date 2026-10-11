// Prensa común de madera, Londres 1711, imprimiendo The Spectator.
// Modelo (true): un «token» de Moxon = 250 impresiones por hora, por una cara, con dos tirones por impresión;
// cada ejemplar es medio pliego impreso por ambas caras (2 impresiones); Addison: 3.000 ejemplares × 20 lectores.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const KIT = "/Users/luiscifuentesacuna/.claude/skills/anatomy";
const k = await import(`${KIT}/kit/iso-kit.mjs`);
const G = await import(`${KIT}/kit/lathe.mjs`);
const { kitScript } = await import(`${KIT}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const WIDTH = 640;
const HEIGHT = 430;

// ---------- Modelo ----------
const TOKEN = 250;            // impresiones por hora (Moxon, 1683)
const SIDES = 2;              // medio pliego impreso por ambas caras
const READERS = 20;           // lectores por ejemplar (Addison, Spectator n.º 10)
const RUN = 3000;             // ejemplares diarios (Addison)
const HOURS = (RUN * SIDES) / TOKEN; // 24 horas de prensa
const SHEET_T = 0.01;         // grosor de un pliego (0,1 mm) en cm

// ---------- Mundo (1 unidad ≈ 1 cm) ----------
const FLOOR = { x: -108, y: -66, w: 272, d: 174, r: 8 };
const SILL_B = { x: -60, y: -52, w: 120, d: 22, r: 1.5 };
const SILL_F = { x: -60, y: 30, w: 120, d: 22, r: 1.5 };
const CHEEK_B = { x: -12, y: -50, w: 24, d: 20, r: 1 };
const CHEEK_F = { x: -12, y: 30, w: 24, d: 20, r: 1 };
const CHEEK_Z = [12, 196];
const CAP = { x: -17, y: -58, w: 34, d: 116, r: 2 };
const CAP_Z = [196, 210];
const HEAD = { x: -15, y: -30, w: 30, d: 60, r: 1 };
const HEAD_Z = [140, 164];
const TILL = { x: -12, y: -30, w: 24, d: 60, r: 1 };
const TILL_Z = [106, 111];
const WINTER = { x: -15, y: -30, w: 30, d: 60, r: 1 };
const WINTER_Z = [54, 72];
const RAIL_X = [-74, 150];
const RAIL_Y = [[-20, -14], [14, 20]];
const RAIL_Z = [72, 78];
const STANDS = [-75, 143];
const HOSE = { x: -6, y: -6, w: 12, d: 12, r: 1 };
const PLATEN = { x: -13, y: -20, w: 26, d: 40, r: 1 };
const PLATEN_Z = [92, 96];
const SPINDLE_R = 3.6;
const BAR_Z = 125.5;
const BAR_REST = 18;          // grados desde +x hacia +y
const BAR_PULL = 58;
const BAR_LEN = 62;
const CX = { out: 92, in1: 13, in2: -12 };
const HINGE = { x: 30, z: 90 };
const TYMPAN = { len: 54, half: 17 };
const TYMPAN_OPEN = 115;
const BANK = { x: -34, y: 60, w: 58, d: 44, r: 2 };
const BANK_Z = [74, 78];
const PILE = { x: -24, y: 68, w: 36, d: 26, r: 0.6 };
const SHELF_Z = [18, 21];
const HEAP = { x: -22, y: 70, w: 32, d: 22, r: 0.6 };
const ROUNCE = { x: 143, y: 29, z: 50, r: 12 };
const INK = { x: -100, y: 62, w: 28, d: 24, r: 2 };
const INK_Z = 70;

const P = k.fitProjection(
  [...k.boxCorners(FLOOR, -6, 0), [0, -58, CAP_Z[1]], [0, 58, CAP_Z[1]], [CX.out + HINGE.x + 24, 0, 146], [-80, 70, 100]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 40, elevation: 30 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const slab = (plan, z0, z1, tone = "mid", steps = 3, bevel = 0.5, extra = {}) => S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone, ...extra });

// ---------- Piezas estáticas ----------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(FLOOR, -6, 6, P)}"/>`];
  const seams = [];
  for (let y = FLOOR.y + 22; y < FLOOR.y + FLOOR.d - 10; y += 22) seams.push(k.lineOnTop([FLOOR.x, y], [FLOOR.x + FLOOR.w, y], 0, P));
  out.push(S(k.slabOf(FLOOR, -6, 6, P, 8, 1.2), { tone: "lo", inner: "" }));
  out.push(L(seams.join(""), { tone: "faint" }));
  const nails = [];
  for (let y = FLOOR.y + 11; y < FLOOR.y + FLOOR.d - 8; y += 22) for (const x of [FLOOR.x + 6, FLOOR.x + FLOOR.w - 6]) nails.push(at([x, y, 0]));
  out.push(D(nails, { size: 0.45, tone: "lo" }));
  return out.join("");
}

function bank(pileH) {
  const out = [];
  const legs = [[BANK.x + 6, BANK.y + 6], [BANK.x + BANK.w - 6, BANK.y + 6], [BANK.x + 6, BANK.y + BANK.d - 6], [BANK.x + BANK.w - 6, BANK.y + BANK.d - 6]];
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BANK, 4), 0, 1, P)}" style="filter:blur(3px)"/>`);
  const sorted = byDepth(legs);
  for (const [x, y] of sorted.slice(0, 2)) out.push(S(k.cylinder(x, y, 2.6, 0, BANK_Z[0], P, 16), { tone: "mid", crease: "none" }));
  out.push(shelf(RUN * SHEET_T * 0));
  for (const [x, y] of sorted.slice(2)) out.push(S(k.cylinder(x, y, 2.6, 0, BANK_Z[0], P, 16), { tone: "mid", crease: "none" }));
  const apron = k.insetPlan(BANK, 3);
  out.push(slab(apron, BANK_Z[0] - 6, BANK_Z[0], "mid", 3, 0));
  out.push(slab(BANK, BANK_Z[0], BANK_Z[1], "mid", 4, 0.8, { inner: L(k.sideSeam(BANK, BANK_Z[0] + 1.6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BANK, 3), BANK_Z[1], P, 3), { tone: "faint" }));
  out.push(D(k.corners(BANK, 3.2).map(([x, y]) => at([x, y, BANK_Z[1]])), { size: 0.45 }));
  out.push(`<g data-part="pile">${pile(pileH)}</g>`);
  return out.join("");
}

function shelf(heapH) {
  const out = [];
  const plan = { x: BANK.x + 4, y: BANK.y + 4, w: BANK.w - 8, d: BANK.d - 8, r: 1 };
  out.push(slab(plan, SHELF_Z[0], SHELF_Z[1], "lo", 3, 0.4));
  out.push(`<g data-part="heap">${heapH > 0.05 ? S(k.slabOf(HEAP, SHELF_Z[1], heapH, P, 2, 0.3), { tone: "mid" }) : ""}</g>`);
  return out.join("");
}

function pile(h) {
  if (h < 0.05) return "";
  const z0 = BANK_Z[1];
  const seams = [];
  for (let z = z0 + 1.6; z < z0 + h - 0.6; z += 1.6) seams.push(k.sideSeam(PILE, z, P, 2));
  return S(k.slabOf(PILE, z0, h, P, 2, 0.3), { tone: "hi", crease: "lo", inner: L(seams.join(""), { tone: "faint" }) });
}

function stand(x) {
  const out = [];
  for (const y of [-21, 21]) {
    out.push(S(k.cylinder(x, y, 4.6, 0, 3, P, 18), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 3, 3, 59, P, 16), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 3, 40, P, 10), { tone: "faint" }) }));
  }
  const bar = { x: x - 5, y: -26, w: 10, d: 52, r: 1 };
  out.push(slab(bar, 62, 72, "mid", 3, 0.5));
  out.push(D([at([x, -21, 72]), at([x, 21, 72])], { size: 0.45 }));
  return out.join("");
}

function rounceWheel() {
  const { x, y, z, r } = ROUNCE;
  const F = G.frameAlong([x, y, z], [0, 1, 0]);
  const out = [];
  out.push(S(G.disc(-5, 0, 2.2, F, P), { tone: "mid" }));
  out.push(S(G.disc(0, 2.4, r, F, P), { tone: "mid", inner: "" }));
  out.push(S(G.disc(2.4, 3.6, 3.4, F, P), { tone: "lo" }));
  out.push(L(G.circleOf(F, 2.4, r - 2.2, P), { tone: "faint" }));
  out.push(L(G.spokesOf(F, 2.4, 3.4, r - 2.2, 6, P), { tone: "lo" }));
  return out.join("");
}

function cheek(plan, front) {
  const out = [];
  out.push(slab(plan, CHEEK_Z[0], CHEEK_Z[1], "mid", 3, 1.2));
  if (front) {
    const yf = plan.y + plan.d;
    for (const [z0, z1] of [WINTER_Z, TILL_Z, HEAD_Z]) {
      const ten = { x: -7, y: yf, w: 14, d: 3.2, r: 0.4 };
      const zz0 = z0 + (z1 - z0 > 8 ? 2 : 0.6), zz1 = z1 - (z1 - z0 > 8 ? 2 : 0.6);
      out.push(slab(ten, zz0, zz1, "mid", 2, 0.3));
      const wedge = { x: -1.6, y: yf + 3.2, w: 3.2, d: 1.6, r: 0.3 };
      out.push(slab(wedge, zz0 - 1.2, zz1 + 1.2, "lo", 2, 0));
    }
    const pegs = [];
    for (const z of [30, 92, 124, 178]) pegs.push(at([-6, yf, z]), at([6, yf, z]));
    out.push(D(pegs, { size: 0.55, tone: "mid" }));
  }
  return out.join("");
}

function sill(plan) {
  const out = [slab(plan, 0, 12, "lo", 3, 0.6)];
  out.push(D([at([plan.x + 6, plan.y + plan.d / 2, 12]), at([plan.x + plan.w - 6, plan.y + plan.d / 2, 12])], { size: 0.5 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const [y0, y1] of RAIL_Y) {
    const plan = { x: RAIL_X[0], y: y0, w: RAIL_X[1] - RAIL_X[0], d: y1 - y0, r: 0.8 };
    out.push(slab(plan, RAIL_Z[0], RAIL_Z[1], "mid", 2, 0.4));
    const cramp = { x: RAIL_X[0] + 3, y: y0 + 1.6, w: RAIL_X[1] - RAIL_X[0] - 6, d: 2.8, r: 0.6 };
    out.push(slab(cramp, RAIL_Z[1], RAIL_Z[1] + 0.6, "lo", 2, 0, { crease: "none" }));
    const dots = [];
    for (let x = RAIL_X[0] + 10; x < RAIL_X[1] - 6; x += 24) dots.push(at([x, (y0 + y1) / 2, RAIL_Z[1] + 0.6]));
    out.push(D(dots, { size: 0.4, tone: "lo" }));
  }
  return out.join("");
}

function winter() {
  const out = [slab(WINTER, WINTER_Z[0], WINTER_Z[1], "mid", 3, 0.6)];
  out.push(D([at([WINTER.x + WINTER.w, -26, 65]), at([WINTER.x + WINTER.w, 26, 65])], { size: 0.6 }));
  return out.join("");
}

// ---------- Carro (se mueve a lo largo de x) ----------
function carriage() {
  const out = [];
  const plank = { x: -34, y: -24, w: 68, d: 48, r: 1.5 };
  out.push(slab(plank, 78, 82, "mid", 3, 0.5));
  const coffin = { x: -30, y: -20, w: 60, d: 40, r: 1 };
  out.push(slab(coffin, 82, 87, "mid", 3, 0.6));
  out.push(L(k.planOutline(k.insetPlan(coffin, 2.4), 87, P, 2), { tone: "lo" }));
  out.push(D(k.corners(coffin, 1.4).map(([x, y]) => at([x, y, 87])), { size: 0.45 }));
  const chase = { x: -25, y: -15, w: 50, d: 30, r: 0.4 };
  out.push(slab(chase, 87, 89, "hi", 2, 0.3, { crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(chase, 2), 89, P, 2), { tone: "lo" }));
  const type = [];
  for (const col of [[-21, -1.5], [1.5, 21]]) for (let y = -11; y <= 11; y += 2.2) type.push(k.lineOnTop([col[0], y], [col[1] - (y % 3 === 0 ? 3 : 0), y], 89, P));
  out.push(L(type.join(""), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([0, -13], [0, 13], 89, P), { tone: "faint" }));
  out.push(D([[-24, -14], [24, -14], [-24, 14], [24, 14]].map(([x, y]) => at([x, y, 89])), { size: 0.4, tone: "mid" }));
  // bisagras del tímpano
  for (const y of [-12, 12]) out.push(slab({ x: HINGE.x - 1.5, y: y - 2, w: 3, d: 4, r: 0.6 }, 87, 90, "lo", 2, 0));
  return out.join("");
}

// ---------- Platina y caja del husillo (bajan al tirar) ----------
function platen() {
  const out = [];
  out.push(slab(PLATEN, PLATEN_Z[0], PLATEN_Z[1], "hi", 3, 0.6, { crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATEN, 2.4), PLATEN_Z[1], P, 2), { tone: "faint" }));
  const hooks = k.corners(PLATEN, 2.6);
  out.push(L(hooks.map(([x, y]) => k.segment([x, y, PLATEN_Z[1]], [Math.sign(x) * 5, Math.sign(y) * 5, 100], P)).join(""), { tone: "lo" }));
  out.push(D(hooks.map(([x, y]) => at([x, y, PLATEN_Z[1]])), { size: 0.5 }));
  out.push(slab(HOSE, 100, TILL_Z[0], "mid", 2, 0.4));
  out.push(slab(k.insetPlan(HOSE, -1.2), 96, 100, "lo", 2, 0.3));
  return out.join("");
}

function till() {
  const out = [slab(TILL, TILL_Z[0], TILL_Z[1], "mid", 3, 0.5)];
  out.push(L(k.planOutline(k.insetPlan(HOSE, -1), TILL_Z[1], P, 2), { tone: "lo" }));
  return out.join("");
}

function spindle() {
  const out = [];
  out.push(slab(HOSE, TILL_Z[1], 122, "mid", 2, 0.4, { inner: L(k.sideSeam(HOSE, 116, P, 2), { tone: "faint" }) }));
  out.push(S(k.cylinder(0, 0, SPINDLE_R, 122, HEAD_Z[0] - 122, P, 24), { tone: "hi", crease: "none" }));
  const rings = [];
  for (let z = BAR_Z + 4.4; z < HEAD_Z[0] - 0.8; z += 1.5) rings.push(k.sideArc(0, 0, SPINDLE_R, z, P, 14));
  for (let z = 123.2; z < BAR_Z - 3.4; z += 1.5) rings.push(k.sideArc(0, 0, SPINDLE_R, z, P, 14));
  out.push(L(rings.join(""), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 5.2, BAR_Z - 3, 6, P, 24, 0.4), { tone: "mid" }));
  return { body: out.join(""), thread: null };
}

function head() {
  const out = [slab(HEAD, HEAD_Z[0], HEAD_Z[1], "mid", 3, 0.8, { inner: L(k.sideSeam(HEAD, HEAD_Z[0] + 5, P, 3), { tone: "faint" }) })];
  const xf = HEAD.x + HEAD.w;
  const Fb = (y) => G.frameAlong([xf, y, (HEAD_Z[0] + HEAD_Z[1]) / 2 + 2], [1, 0, 0]);
  for (const y of [-19, 19]) {
    const F = Fb(y);
    out.push(S(G.prismOf(F, [[-3.4, -3.4], [3.4, -3.4], [3.4, 3.4], [-3.4, 3.4]], 0, 0.8, P), { tone: "lo" }));
    out.push(S(G.disc(0.8, 2.2, 2.1, F, P), { tone: "mid" }));
  }
  const plate = { x: -8, y: -8, w: 16, d: 16, r: 1 };
  out.push(slab(plate, HEAD_Z[1], HEAD_Z[1] + 0.8, "lo", 2, 0.2));
  out.push(D(k.corners(plate, 2.2).map(([x, y]) => at([x, y, HEAD_Z[1] + 0.8])), { size: 0.45 }));
  out.push(S(k.cylinder(0, 0, 3.2, HEAD_Z[1] + 0.8, 1.6, P, 16), { tone: "mid" }));
  return out.join("");
}

function cap() {
  const out = [slab(k.insetPlan(CAP, -0.01), CAP_Z[0] - 4, CAP_Z[0], "lo", 3, 0.4)];
  out.push(slab(CAP, CAP_Z[0], CAP_Z[1], "mid", 3, 0.8, { inner: L(k.sideSeam(CAP, CAP_Z[0] + 4, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(CAP, 3), CAP_Z[1], P, 3), { tone: "faint" }));
  out.push(D([at([0, -40, CAP_Z[1]]), at([0, 40, CAP_Z[1]])], { size: 0.55 }));
  return out.join("");
}

function inkBlock() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(INK, 2), 0, 1, P)}" style="filter:blur(3px)"/>`];
  out.push(slab(INK, 0, 6, "lo", 3, 0.4));
  out.push(slab(k.insetPlan(INK, 2), 6, INK_Z, "mid", 3, 0.6, { inner: L(k.sideSeam(k.insetPlan(INK, 2), 38, P, 3), { tone: "faint" }) }));
  const slabTop = { x: INK.x + 3, y: INK.y + 3, w: INK.w - 6, d: INK.d - 6, r: 1 };
  out.push(slab(slabTop, INK_Z, INK_Z + 1.4, "hi", 2, 0.3, { crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(slabTop, 2), INK_Z + 1.4, P, 2), { tone: "faint" }));
  // dos balas de entintar con sus mangos
  const balls = [[INK.x + 9, INK.y + 9], [INK.x + 21, INK.y + 15]];
  for (const [x, y] of byDepth(balls)) {
    const z = INK_Z + 1.4 + 6;
    out.push(S(G.sphereOf([x, y, z], 6.2, P), { tone: "hi", crease: "lo" }));
    out.push(S(k.cylinder(x, y, 2.4, z + 5.2, 2, P, 16), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 1.6, z + 7.2, 14, P, 14), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 1.6, z + 16, P, 8), { tone: "faint" }) }));
  }
  return out.join("");
}

// ---------- Ensamble ----------
const pileH = (copies) => Math.min(RUN, copies) * SHEET_T;
const { body: spindleBody, thread } = spindle();
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "prensa-svg",
  label: "Una prensa común de madera, de 1711, sobre una tarima: dos montantes unidos por el sombrero, la cabeza, el tablero y el invierno; el husillo con su barra baja la platina sobre el carro, que entra y sale por los rieles con la manivela. A la derecha, al fondo, el banco donde se apilan los pliegos impresos de The Spectator; a la izquierda, el bloque de tinta con dos balas.",
  body: [
    floor(),
    stand(STANDS[0]),
    sill(SILL_B),
    cheek(CHEEK_B, false),
    stand(STANDS[1]),
    `<g data-part="rounce">${rounceWheel()}<path class="iso-line" data-tone="mid" data-part="crank" d=""/><g class="iso-dots" data-tone="hi"><circle data-part="handle" r="1.7"/></g></g>`,
    winter(),
    rails(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [CX.out, 0, 0])}">${carriage()}<g data-part="tympan"></g></g>`,
    `<g data-part="platen">${platen()}</g>`,
    till(),
    `<g data-part="spindle">${spindleBody}</g>`,
    head(),
    sill(SILL_F),
    cheek(CHEEK_F, true),
    cap(),
    `<g data-part="bar"></g>`,
    bank(pileH(RUN)),
    inkBlock(),
  ],
});

const DATA = { P, TOKEN, SIDES, READERS, RUN, HOURS, SHEET_T, CX, HINGE, TYMPAN, TYMPAN_OPEN, BAR_Z, BAR_REST, BAR_PULL, BAR_LEN, SPINDLE_R, PILE, BANK_Z, ROUNCE, HEAP, SHELF_Z };

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const root = document.querySelector("[data-prensa]");
const svg = root.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const carriageEl = $('[data-part="carriage"]'), tympanEl = $('[data-part="tympan"]'), platenEl = $('[data-part="platen"]');
const barEl = $('[data-part="bar"]'), pileEl = $('[data-part="pile"]'), heapEl = $('[data-part="heap"]'), crankEl = $('[data-part="crank"]'), handleEl = $('[data-part="handle"]');
const readout = root.closest(".iso-plate").querySelector("[data-readout]");
const still = { matches: matchMedia("(prefers-reduced-motion: reduce)").matches || /captura/.test(location.search) };
const fmt = (n) => Math.round(n).toLocaleString("es-CL");
const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;

// ciclo de una impresión (segundos)
const CYCLE = [["in", 0.85], ["pull", 0.7], ["in2", 0.45], ["pull", 0.7], ["out", 0.85], ["open", 0.55], ["swap", 0.35], ["close", 0.55]];
const TOTAL = CYCLE.reduce((s, [, d]) => s + d, 0);
function phaseAt(t) {
  let acc = 0;
  for (let i = 0; i < CYCLE.length; i++) { const [name, d] = CYCLE[i]; if (t < acc + d) return { i, name, k: (t - acc) / d }; acc += d; }
  return { i: CYCLE.length - 1, name: "close", k: 1 };
}
function pose(t) {
  const { i, name, k } = phaseAt(t % TOTAL);
  const e = ease(k);
  let cx = D.CX.out, bar = 0, open = 0, printed = 0, fresh = 1;
  if (name === "in") { cx = lerp(D.CX.out, D.CX.in1, e); }
  else if (i === 1) { cx = D.CX.in1; bar = Math.sin(Math.PI * k); printed = k > 0.5 ? 0.5 : 0; }
  else if (name === "in2") { cx = lerp(D.CX.in1, D.CX.in2, e); printed = 0.5; }
  else if (i === 3) { cx = D.CX.in2; bar = Math.sin(Math.PI * k); printed = k > 0.5 ? 1 : 0.5; }
  else if (name === "out") { cx = lerp(D.CX.in2, D.CX.out, e); printed = 1; }
  else if (name === "open") { open = e; printed = 1; }
  else if (name === "swap") { open = 1; printed = 1; fresh = k; }
  else if (name === "close") { open = 1 - e; printed = 0; }
  return { cx, bar, open, printed, fresh };
}

// tímpano: tabla articulada en el extremo del ataúd, gira sobre un eje paralelo a y
const tymPt = (theta, u, v, w = 0) => {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [D.HINGE.x - u * c - w * s, v, D.HINGE.z + u * s - w * c];
};
const poly = (pts) => pathOf(pts.map((p) => iso(p, P)), true);
function tympanSvg(theta, printed, fresh) {
  const L = D.TYMPAN.len, H = D.TYMPAN.half, out = [];
  const face = [tymPt(theta, 0, -H, 0.6), tymPt(theta, L, -H, 0.6), tymPt(theta, L, H, 0.6), tymPt(theta, 0, H, 0.6)];
  const back = [tymPt(theta, 0, -H, -0.6), tymPt(theta, L, -H, -0.6), tymPt(theta, L, H, -0.6), tymPt(theta, 0, H, -0.6)];
  const side = [face[2], face[3], back[3], back[2]];
  const end = [face[1], face[2], back[2], back[1]];
  out.push('<path class="iso-fill" d="' + poly(back) + poly(side) + poly(end) + poly(face) + '"/>');
  out.push('<path class="iso-shade" data-shade="1" d="' + poly(side) + '"/>');
  out.push('<path class="iso-shade" data-shade="0" d="' + poly(end) + '"/>');
  out.push('<path class="iso-top" d="' + poly(face) + '"/>');
  out.push('<path class="iso-line" data-tone="mid" d="' + poly(face) + poly(side) + '"/>');
  const inner = [tymPt(theta, 2.4, -H + 2.4, 0.6), tymPt(theta, L - 2.4, -H + 2.4, 0.6), tymPt(theta, L - 2.4, H - 2.4, 0.6), tymPt(theta, 2.4, H - 2.4, 0.6)];
  out.push('<path class="iso-line" data-tone="lo" d="' + poly(inner) + '"/>');
  // el pliego (lo único iluminado): se imprime por mitades y se cambia por uno en blanco
  const sheet = [tymPt(theta, 5, -H + 4.5, 0.7), tymPt(theta, L - 5, -H + 4.5, 0.7), tymPt(theta, L - 5, H - 4.5, 0.7), tymPt(theta, 5, H - 4.5, 0.7)];
  const lift = fresh < 1 ? 1 - fresh : 0;
  out.push('<g class="prensa-pliego" style="opacity:' + (fresh < 1 ? (1 - fresh).toFixed(3) : 1) + '"><path class="prensa-papel" d="' + poly(sheet) + '"/><path class="iso-line" data-tone="lit" d="' + poly(sheet) + '"/>');
  if (printed > 0) {
    const rows = [];
    for (let v = -H + 7; v <= H - 7; v += 2.2) {
      for (const [u0, u1, half] of [[8, L / 2 - 2, 1], [L / 2 + 2, L - 8, 0.5]]) {
        if (printed < half) continue;
        rows.push(pathOf([iso(tymPt(theta, u0, v, 0.75), P), iso(tymPt(theta, u1 - (Math.abs(v * 7) % 5), v, 0.75), P)]));
      }
    }
    out.push('<path class="iso-line" data-tone="lo" data-free="" d="' + rows.join("") + '"/>');
  }
  out.push("</g>");
  if (fresh < 1) out.push('<g style="opacity:' + fresh.toFixed(3) + '"><path class="prensa-papel-blanco" d="' + poly(sheet) + '"/><path class="iso-line" data-tone="mid" d="' + poly(sheet) + '"/></g>');
  return out.join("");
}

// barra: una varilla de hierro con su mango de madera, gira alrededor del husillo
function barSvg(deg) {
  const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const rect = (r0, r1, w) => [[ux * r0 + nx * w, uy * r0 + ny * w], [ux * r1 + nx * w, uy * r1 + ny * w], [ux * r1 - nx * w, uy * r1 - ny * w], [ux * r0 - nx * w, uy * r0 - ny * w]];
  const rod = extrude(rect(4.6, D.BAR_LEN - 13, 1.3), D.BAR_Z - 1.2, 2.4, P);
  const grip = extrude(rect(D.BAR_LEN - 14, D.BAR_LEN, 2.4), D.BAR_Z - 2.3, 4.6, P);
  return solidSvg(rod, { tone: "mid" }) + solidSvg(grip, { tone: "mid" });
}

function crank(phi) {
  const { x, y, z, r } = D.ROUNCE;
  const hub = [x + Math.cos(phi) * 3.4, y + 3.6, z + Math.sin(phi) * 3.4], tip = [x + Math.cos(phi) * (r - 3.4), y + 3.6, z + Math.sin(phi) * (r - 3.4)];
  crankEl.setAttribute("d", pathOf([iso(hub, P), iso(tip, P)]));
  const [hx, hy] = iso(tip, P);
  handleEl.setAttribute("cx", hx.toFixed(1)); handleEl.setAttribute("cy", hy.toFixed(1));
}

let hours = 0, target = null, playing = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0, rouncePhi = 0, lastCx = D.CX.out, holdUntil = 0;
function draw(p) {
  carriageEl.setAttribute("transform", translateAlong(P, [p.cx, 0, 0]));
  tympanEl.innerHTML = tympanSvg((p.open * D.TYMPAN_OPEN * Math.PI) / 180, p.printed, p.fresh);
  platenEl.setAttribute("transform", translateAlong(P, [0, 0, -1.4 * p.bar]));
  barEl.innerHTML = barSvg(lerp(D.BAR_REST, D.BAR_PULL, p.bar));
  rouncePhi += (p.cx - lastCx) * 0.09; lastCx = p.cx; crank(rouncePhi);
  const copies = Math.min(D.RUN, (hours * D.TOKEN) / D.SIDES);
  const h = copies * D.SHEET_T;
  if (Math.abs(h - (+pileEl.dataset.h || 0)) > 0.04 || !pileEl.dataset.h) {
    pileEl.dataset.h = h.toFixed(2);
    pileEl.innerHTML = h < 0.05 ? "" : solidSvg(slabOf(D.PILE, D.BANK_Z[1], h, P, 2, 0.3), { tone: "hi", crease: "lo" }) + (h > 2 ? lineSvg(Array.from({ length: Math.floor((h - 1) / 1.6) }, (_, i) => sideSeam(D.PILE, D.BANK_Z[1] + 1.6 * (i + 1), P, 2)).join(""), { tone: "faint" }) : "");
  }
  const white = (D.RUN - copies) * D.SHEET_T;
  if (Math.abs(white - (+heapEl.dataset.h || -1)) > 0.04) {
    heapEl.dataset.h = white.toFixed(2);
    heapEl.innerHTML = white < 0.05 ? "" : solidSvg(slabOf(D.HEAP, D.SHELF_Z[1], white, P, 2, 0.3), { tone: "mid" });
  }
  const hShown = Math.round(hours * 10) / 10, cShown = Math.round(Math.min(D.RUN, (hShown * D.TOKEN) / D.SIDES));
  const text = hShown.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " h · " + fmt(cShown) + " ejemplares · " + fmt(cShown * D.READERS) + " lectores";
  if (readout && readout.textContent !== text) readout.textContent = text;
  root.setAttribute("aria-valuenow", String(Math.floor(hours)));
  root.setAttribute("aria-valuetext", text);
}
const LIVIANO = matchMedia("(hover: none), (pointer: coarse)").matches;
let saltar = false;
function tick(now) {
  if (LIVIANO && (saltar = !saltar)) { if (lam) visible = lam.classList.contains("activa"); frame = visible ? requestAnimationFrame(tick) : 0; return; }
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (playing) {
    clock += dt;
    if (target === null) {
      if (hours >= D.HOURS) { if (!holdUntil) holdUntil = now + 4000; if (now > holdUntil) { hours = 0; holdUntil = 0; } }
      else hours = Math.min(D.HOURS, hours + dt * 1.0);
    }
  }
  if (target !== null) { hours += (target - hours) * (1 - Math.exp(-dt / 0.25)); if (Math.abs(target - hours) < 0.01) hours = target; }
  draw(pose(clock));
  if (lam) visible = lam.classList.contains("activa");
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (h) => { target = Math.max(0, Math.min(D.HOURS, h)); clearTimeout(idle); idle = setTimeout(() => { target = null; }, 4000); run(); };
const lam = root.closest(".lamina");
if (lam) {
  visible = lam.classList.contains("activa");
  lam.addEventListener("entrar", () => { visible = true; hours = 0; target = null; holdUntil = 0; run(); });
  new MutationObserver(() => { visible = lam.classList.contains("activa"); if (visible) run(); }).observe(lam, { attributes: true, attributeFilter: ["class"] });
} else {
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(root);
}
root.addEventListener("pointermove", (e) => {
  if (!(e.buttons & 1)) return;
  const b = svg.getBoundingClientRect();
  steer(((e.clientX - b.left) / b.width - 0.1) / 0.8 * D.HOURS);
});
root.addEventListener("pointerdown", (e) => { const b = svg.getBoundingClientRect(); steer(((e.clientX - b.left) / b.width - 0.1) / 0.8 * D.HOURS); });
if (!lam) root.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 4 : 1;
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.round((target ?? hours) + step);
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.round((target ?? hours) - step);
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = D.HOURS;
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); playing = !playing; run(); return; }
  if (to === null) return;
  e.preventDefault(); e.stopPropagation();
  steer(to);
});
if (still.matches) { hours = D.HOURS; }
draw(pose(0));
run();
`;

const CSS = `
.prensa-papel{fill:var(--prensa-papel,#FBE7B0)}
.prensa-papel-blanco{fill:var(--anatomy-face)}
.iso[data-theme="light"] .iso-figure, .iso[data-theme="light"].prensa-tema, .prensa-tema .iso-figure{
  --anatomy-page:#F3F6F9;--anatomy-card:#FAFAF7;--anatomy-paper:#FAFAF7;--anatomy-face:#FFFFFF;--anatomy-top:#FFFFFF;
  --anatomy-shade-0:#D5DFE9;--anatomy-shade-1:#DFE7EF;--anatomy-shade-2:#E9EFF5;--anatomy-shade-3:#F2F5F9;
  --anatomy-lit-top:#FBE7B0;--anatomy-lit-shade:#F6D16E;
  --anatomy-hi:#0F2238;--anatomy-mid:#47627F;--anatomy-lo:#9AB0C6;--anatomy-faint:#CBD7E3;--anatomy-lit:#0F2238;
  --anatomy-halo:#7F98B3;--anatomy-halo-opacity:.3;--anatomy-dot:#143A5F;
  --anatomy-text:#34465A;--anatomy-strong:#0F2238;--anatomy-muted:#5B6E83;
}
`;

const bodyRaw = k.plateHtml({
  fig: "Fig 2",
  title: "Prensa común, 1711",
  readout: "0,0 h · 0 ejemplares · 0 lectores",
  keys: [
    { mark: "lit", label: "El pliego de The Spectator, impreso en dos tirones" },
    { mark: "raised", label: "La pila del banco: 3.000 ejemplares, unos 30 cm de papel" },
  ],
  caption:
    "Una prensa común de madera como las de Londres en 1711. Dos operarios imprimían un «token», 250 pliegos por hora por una cara, con dos tirones de la barra por pliego. Cada ejemplar de The Spectator, medio pliego impreso por ambas caras, pedía dos impresiones: los 3.000 ejemplares diarios que cuenta Addison suman 6.000 impresiones, 24 horas de prensa, es decir, varias prensas a la vez. Con veinte lectores por ejemplar, 60.000 lectores.",
  body: `<div class="iso-stage" data-prensa tabindex="0" role="slider" aria-label="Prensa común: las flechas avanzan o retroceden las horas de prensa; espacio pausa" aria-valuemin="0" aria-valuemax="${HOURS}" aria-valuenow="0">${svg}</div>`,
});

const body = bodyRaw.replace("El pliego de The Spectator, impreso en dos tirones", "<span>El pliego de <i>The Spectator</i>, impreso en dos tirones</span>").replace("Cada ejemplar de The Spectator", "Cada ejemplar de <i>The Spectator</i>");

const page = k.pageHtml({ title: "Prensa común, 1711", theme, body: `<style>${CSS}</style>` + body, script: kitScript() + live });
const name = theme === "light" ? "prensa-light.html" : "prensa.html";
writeFileSync(join(HERE, name), page);
writeFileSync(join(HERE, "prensa-fragmento.json"), JSON.stringify({ body, css: CSS, live, isoCss: k.ISO_CSS, kit: kitScript() }));
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
