// Banco óptico: una vela, tres lentes sobre un riel y una pantalla.
// Modelo (verdadero, óptica paraxial de lentes delgadas): el rayo marginal sale de la llama con pendiente U0;
// en cada lente bajada al eje, u' = u − y/f. La mancha en la pantalla mide 2(|y marginal| + |y del borde de la llama|).
// Con las tres lentes (f = 110, 150 y 76,7 unidades; 1 unidad = 5 mm) la llama queda enfocada en la pantalla.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const KIT = "/Users/luiscifuentesacuna/.claude/skills/anatomy";
const k = await import(`${KIT}/kit/iso-kit.mjs`);
const G = await import(`${KIT}/kit/lathe.mjs`);
const { kitScript } = await import(`${KIT}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const WIDTH = 720;
const HEIGHT = 400;

// ---------- Modelo ----------
const MM = 5;                       // milímetros por unidad
const U0 = 0.11;                    // pendiente del rayo marginal que sale de la llama
const FLAME = 1;                    // media altura de la llama (5 mm)
const LENS_X = [60, 110, 165];
const SCREEN_X = 235;
const yAt = (fs, X) => {            // alturas del rayo marginal y del rayo del borde de la llama en X
  let y = 0, u = U0, yc = FLAME, uc = 0, x = 0;
  for (let i = 0; i < LENS_X.length; i++) {
    const d = LENS_X[i] - x; y += u * d; yc += uc * d;
    if (fs[i]) { u -= y / fs[i]; uc -= yc / fs[i]; }
    x = LENS_X[i];
  }
  const d = X - x;
  return [y + u * d, yc + uc * d];
};
// f3 se elige para que, con las tres lentes, la imagen caiga en la pantalla
const F12 = [110, 150];
const F3 = (() => {
  let y = 0, u = U0, x = 0;
  for (let i = 0; i < 2; i++) { y += u * (LENS_X[i] - x); u -= y / F12[i]; x = LENS_X[i]; }
  y += u * (LENS_X[2] - x);
  const need = -y / (SCREEN_X - LENS_X[2]);
  return y / (u - need);
})();
const FOCAL = [...F12, F3];

// ---------- Mundo ----------
const BOARD = { x: -26, y: -34, w: 290, d: 56, r: 3 };
const BOARD_Z = [0, 10];
const RAIL = { x: -18, y: -5, w: 274, d: 10, r: 1 };
const RAIL_Z = [10, 18];
const RULER = { x: -14, y: 12, w: 266, d: 7, r: 0.6 };
const RIDER_Z = [18, 25];
const ZA = 70;                      // eje óptico
const POST_Y = -22;
const SLEEVE_Z = [25, 42];
const CELL = [11, 13];              // radio del vidrio y de la montura
const LIFT = 36;                    // altura a la que se retira cada lente
const SCREEN = { y: [-24, 24], z: [46, 94] };

const P = k.fitProjection(
  [...k.boxCorners(BOARD, -6, BOARD_Z[1]), [0, 0, ZA + 12], [SCREEN_X, SCREEN.y[0], SCREEN.z[1] + 3], [SCREEN_X, SCREEN.y[1], SCREEN.z[1] + 3], ...LENS_X.map((x) => [x, 0, ZA + LIFT + CELL[1] + 1])],
  WIDTH, HEIGHT, { pad: 20, azimuth: 110, elevation: 20 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dt = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z0, z1, tone = "mid", steps = 3, bevel = 0.5, extra = {}) => S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone, ...extra });
const alongX = (o, dir = -1) => G.frameAlong(o, [dir, 0, 0]);

// ---------- Base, riel y regla ----------
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BOARD, -6, 4, P)}"/>`];
  for (const x of [BOARD.x + 260, BOARD.x + 24]) for (const y of [BOARD.y + 10, BOARD.y + BOARD.d - 10]) out.push(S(k.cylinder(x, y, 5, -6, 6, P, 20, 0.3), { tone: "lo" }));
  out.push(slab(BOARD, BOARD_Z[0], BOARD_Z[1], "lo", 4, 1, { inner: Ln(k.sideSeam(BOARD, 3, P, 4), { tone: "faint" }) }));
  out.push(Dt(k.corners(BOARD, 4).map(([x, y]) => at([x, y, BOARD_Z[1]])), { size: 0.5 }));
  // regla de boj: una marca cada centímetro (2 unidades), mayores cada 10 cm
  out.push(slab(RULER, BOARD_Z[1], BOARD_Z[1] + 0.8, "hi", 2, 0.2, { crease: "lo" }));
  const minor = [], major = [];
  const zr = BOARD_Z[1] + 0.8;
  for (let x = 0; x <= 240; x += 4) {
    const big = x % 20 === 0;
    (big ? major : minor).push(k.lineOnTop([x, RULER.y], [x, RULER.y + (big ? 4.6 : 2.4)], zr, P));
  }
  out.push(Ln(minor.join(""), { tone: "lo" }));
  out.push(Ln(major.join(""), { tone: "mid" }));
  out.push(Dt([0, 240].map((x) => at([x, RULER.y + 5.8, zr])), { size: 0.5, tone: "hi" }));
  // riel prismático con su ranura y topes en los extremos
  out.push(slab(RAIL, RAIL_Z[0], RAIL_Z[1], "mid", 2, 0.6, { inner: Ln(k.sideSeam(RAIL, RAIL_Z[0] + 3, P, 2), { tone: "faint" }) }));
  out.push(Ln(k.lineOnTop([RAIL.x + 3, 0], [RAIL.x + RAIL.w - 7, 0], RAIL_Z[1], P), { tone: "faint" }));
  for (const x of [RAIL.x + 3, RAIL.x + RAIL.w - 7]) out.push(slab({ x, y: -6.4, w: 4, d: 12.8, r: 0.6 }, RAIL_Z[1], RAIL_Z[1] + 4, "mid", 2, 0.3));
  // placa del constructor en el canto delantero
  const yf = BOARD.y + BOARD.d;
  out.push(slab({ x: 110, y: yf, w: 46, d: 0.8, r: 0.3 }, 2.4, 7.6, "mid", 2, 0.2));
  out.push(Ln([4.2, 6].map((z) => k.pathOf([at([115, yf + 0.8, z]), at([z === 6 ? 146 : 151, yf + 0.8, z])])).join(""), { tone: "lo", free: true }));
  out.push(Dt([at([112.4, yf + 0.8, 5]), at([153.6, yf + 0.8, 5])], { size: 0.4 }));
  return out.join("");
}

function rider(x, { post = true } = {}) {
  const out = [];
  const plan = { x: x - 9, y: post ? -28 : -11, w: 18, d: post ? 37 : 20, r: 1 };
  out.push(slab(plan, RIDER_Z[0], RIDER_Z[1], "mid", 3, 0.5, { inner: Ln(k.sideSeam(plan, RIDER_Z[0] + 2.4, P, 3), { tone: "faint" }) }));
  // índice sobre la regla y tornillo de apriete
  const yf = plan.y + plan.d;
  out.push(slab({ x: x - 1.2, y: yf, w: 2.4, d: RULER.y + 1.2 - yf, r: 0.3 }, BOARD_Z[1] + 0.8, BOARD_Z[1] + 1.6, "mid", 2, 0));
  out.push(Dt([at([x, RULER.y + 1.2, BOARD_Z[1] + 1.6])], { size: 0.5, tone: "hi" }));
  const knob = G.frameAlong([x, yf, 21.5], [0, 1, 0]);
  out.push(S(G.disc(0, 1.4, 1.4, knob, P), { tone: "mid" }));
  out.push(S(G.disc(1.4, 4, 3.4, knob, P), { tone: "mid", inner: Ln(G.ribsOf(knob, 1.6, 3.8, 3.4, 18, P, { seams: true }), { tone: "lo" }) }));
  if (post) {
    out.push(S(k.cylinder(x, POST_Y, 4.2, RIDER_Z[1], 2, P, 20, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(x, POST_Y, 3, RIDER_Z[1] + 2, SLEEVE_Z[1] - RIDER_Z[1] - 2, P, 18), { tone: "mid", crease: "none", inner: Ln(k.sideArc(x, POST_Y, 3, 34, P, 12), { tone: "faint" }) }));
    const thumb = alongX([x - 3, POST_Y, 38.5]);
    out.push(S(G.disc(0, 1.2, 1, thumb, P), { tone: "mid" }));
    out.push(S(G.disc(1.2, 2.6, 2.6, thumb, P), { tone: "mid" }));
  }
  return out.join("");
}

// lente con su montura: un anillo de latón (abierto) y el vidrio, que deja pasar la luz
function lens(i) {
  const x = LENS_X[i];
  const F = alongX([x + 1.6, 0, ZA]);
  const out = [];
  // brazo desde el poste hasta la montura
  out.push(slab({ x: x - 1.6, y: POST_Y, w: 3.2, d: -POST_Y - CELL[1] + 0.6, r: 0.4 }, ZA - 1.8, ZA + 1.8, "mid", 2, 0.2));
  out.push(S(k.cylinder(x, POST_Y, 2.6, ZA - 3, 6, P, 16, 0.3), { tone: "mid" }));
  out.push(S(G.lathe([[0, CELL[0]], [0, CELL[1]], [3.2, CELL[1]], [3.2, CELL[0]]], F, P, { fill: "facets", rims: "none" }), { tone: "mid" }));
  out.push(`<path class="banco-vidrio" d="${G.circleOf(F, 1.6, CELL[0], P)}"/>`);
  out.push(Ln(G.circleOf(F, 3.2, CELL[1], P) + G.circleOf(F, 3.2, CELL[0], P), { tone: "mid" }));
  out.push(Ln(G.arcOf(F, 1.6, CELL[0] - 3, P, { from: 2.2, to: 3.3 }), { tone: "faint", free: true }));
  out.push(Dt(G.dotsOf(F, 3.2, (CELL[0] + CELL[1]) / 2, 3, P, { phase: 0.5, all: true }), { size: 0.45 }));
  return out.join("");
}

function candle() {
  const out = [];
  const x = 0;
  out.push(rider(x, { post: false }));
  out.push(S(k.cylinder(x, 0, 7, RIDER_Z[1], 2.2, P, 24, 0.4), { tone: "mid" }));
  out.push(S(G.lathe([[0, 2.2], [9, 2.2], [11, 3.6], [12, 3.6], [12, 0]], G.frameAlong([x, 0, RIDER_Z[1] + 2.2], [0, 0, 1]), P), { tone: "mid" }));
  out.push(S(k.cylinder(x, 0, 2.6, RIDER_Z[1] + 14.2, ZA - 4.2 - RIDER_Z[1] - 14.2, P, 18), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(x, 0, 4.6, RIDER_Z[1] + 13, 1.4, P, 20, 0.3), { tone: "mid" }));
  out.push(Ln(k.segment([x, 0, ZA - 4.2], [x, 0, ZA - 2.4], P), { tone: "hi" }));
  return out.join("");
}

function screen() {
  const out = [];
  const x = SCREEN_X;
  out.push(rider(x, { post: false }));
  out.push(S(k.cylinder(x, 0, 2.4, RIDER_Z[1], SCREEN.z[0] - RIDER_Z[1], P, 16), { tone: "mid", crease: "none" }));
  // marco y panel blanco que mira hacia la luz
  const F = G.frameOf([x + 1.2, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const [y0, y1] = SCREEN.y, [z0, z1] = SCREEN.z;
  out.push(S(G.prismOf(F, [[y0 - 2.4, z0 - 2.4], [y1 + 2.4, z0 - 2.4], [y1 + 2.4, z1 + 2.4], [y0 - 2.4, z1 + 2.4]], 0, 2.4, P), { tone: "mid" }));
  const face = [[y0, z0], [y1, z0], [y1, z1], [y0, z1]].map(([y, z]) => at([x - 1.25, y, z]));
  out.push(`<path class="banco-pantalla" d="${k.pathOf(face, true)}"/>`);
  const grid = [];
  for (let y = y0 + 8; y < y1; y += 8) grid.push(k.pathOf([at([x - 1.25, y, z0]), at([x - 1.25, y, z1])]));
  for (let z = z0 + 8; z < z1; z += 8) grid.push(k.pathOf([at([x - 1.25, y0, z]), at([x - 1.25, y1, z])]));
  out.push(Ln(grid.join(""), { tone: "faint" }));
  out.push(`<clipPath id="banco-recorte"><path d="${k.pathOf(face, true)}"/></clipPath><g clip-path="url(#banco-recorte)" data-part="spot"></g>`);
  out.push(Ln(k.pathOf(face, true), { tone: "mid" }));
  out.push(Dt([[y0 - 1.2, z0 - 1.2], [y1 + 1.2, z0 - 1.2], [y1 + 1.2, z1 + 1.2], [y0 - 1.2, z1 + 1.2]].map(([y, z]) => at([x - 1.25, y, z])), { size: 0.45 }));
  return out.join("");
}

// ---------- Ensamble (de la pantalla, al fondo, hacia la vela) ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "banco-svg",
  label: "Un banco óptico sobre una tabla con regla: a la izquierda una vela; tres lentes en monturas de latón bajan una tras otra al eje, sostenidas por brazos desde postes que corren sobre el riel; a la derecha una pantalla blanca cuadriculada. La luz de la vela, que al principio baña la pantalla entera, se concentra con cada lente hasta formar en la pantalla la imagen nítida de la llama.",
  body: [
    bench(),
    screen(),
    `<g data-part="beam-3"></g>`,
    rider(LENS_X[2]),
    `<g data-part="post-2"></g><g data-part="lens-2">${lens(2)}</g>`,
    `<g data-part="beam-2"></g>`,
    rider(LENS_X[1]),
    `<g data-part="post-1"></g><g data-part="lens-1">${lens(1)}</g>`,
    `<g data-part="beam-1"></g>`,
    rider(LENS_X[0]),
    `<g data-part="post-0"></g><g data-part="lens-0">${lens(0)}</g>`,
    `<g data-part="beam-0"></g>`,
    candle(),
    `<g data-part="flame"></g>`,
  ],
});

const DATA = { P, MM, U0, FLAME, LENS_X, SCREEN_X, FOCAL, ZA, POST_Y, SLEEVE_Z, LIFT, CELL };

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const root = document.querySelector("[data-banco]");
const svg = root.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const beams = [0, 1, 2, 3].map((i) => $('[data-part="beam-' + i + '"]'));
const lenses = [0, 1, 2].map((i) => $('[data-part="lens-' + i + '"]'));
const posts = [0, 1, 2].map((i) => $('[data-part="post-' + i + '"]'));
const spotEl = $('[data-part="spot"]'), flameEl = $('[data-part="flame"]');
const readout = root.closest(".iso-plate").querySelector("[data-readout]");
const still = { matches: matchMedia("(prefers-reduced-motion: reduce)").matches || /captura/.test(location.search) };
const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

// óptica paraxial: alturas del rayo marginal y del rayo del borde de la llama
function trace(active) {
  const xs = [0], ym = [0], yc = [D.FLAME];
  let y = 0, u = D.U0, c = D.FLAME, uc = 0, x = 0;
  for (let i = 0; i < 3; i++) {
    const d = D.LENS_X[i] - x; y += u * d; c += uc * d; x = D.LENS_X[i];
    xs.push(x); ym.push(y); yc.push(c);
    if (active[i]) { u -= y / D.FOCAL[i]; uc -= c / D.FOCAL[i]; }
  }
  const d = D.SCREEN_X - x; y += u * d; c += uc * d;
  xs.push(D.SCREEN_X); ym.push(y); yc.push(c);
  return { xs, ym, yc };
}
const ringPts = (x, r, n = 28) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return iso([x, r * Math.cos(a), D.ZA + r * Math.sin(a)], P); });
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
// un tramo del haz: tronco de cono entre dos radios (si cruza el eje, dos conos unidos por la punta)
function coneSvg(xa, ra, xb, rb) {
  const pieces = [];
  if (ra * rb < 0) { const xm = xa + (xb - xa) * (ra / (ra - rb)); pieces.push([xa, Math.abs(ra), xm, 0.05], [xm, 0.05, xb, Math.abs(rb)]); }
  else pieces.push([xa, Math.abs(ra), xb, Math.abs(rb)]);
  return pieces.map(([a, r0, b, r1]) => {
    const pts = hull([...ringPts(a, Math.max(r0, 0.05)), ...ringPts(b, Math.max(r1, 0.05))]);
    const mean = Math.max(0.6, (r0 + r1) / 2);
    const op = Math.min(0.62, Math.max(0.1, 0.5 * Math.pow(5 / mean, 0.7)));
    return '<path class="banco-luz" style="opacity:' + op.toFixed(3) + '" d="' + pathOf(pts, true) + '"/>';
  }).join("");
}

let lift = [D.LIFT, D.LIFT, D.LIFT], goal = [1, 1, 1], shown = [0, 0, 0], active = [false, false, false];
let phase = 0, phaseT = 0, target = null, idle = 0, visible = false, frame = 0, last = 0, playing = !still.matches, clock = 0;
// guion: baja una lente, pausa; baja la segunda; baja la tercera; pausa larga; se retiran las tres
const SCRIPT = [["down", 0], ["wait", 1.4], ["down", 1], ["wait", 1.4], ["down", 2], ["wait", 4.2], ["up", -1], ["wait", 1.4]];
let smooth = null;
function advance(dt) {
  if (target !== null) { for (let i = 0; i < 3; i++) goal[i] = i < target ? 0 : 1; return; }
  phaseT += dt;
  const [kind, arg] = SCRIPT[phase];
  if (kind === "down") { goal[arg] = 0; if (phaseT > 0.9) { phase = (phase + 1) % SCRIPT.length; phaseT = 0; } }
  else if (kind === "up") { goal = [1, 1, 1]; if (phaseT > 0.9) { phase = (phase + 1) % SCRIPT.length; phaseT = 0; } }
  else if (phaseT > arg) { phase = (phase + 1) % SCRIPT.length; phaseT = 0; }
}
function draw(dt) {
  for (let i = 0; i < 3; i++) {
    const want = goal[i] * D.LIFT;
    lift[i] += (want - lift[i]) * (1 - Math.exp(-dt / 0.22));
    if (Math.abs(want - lift[i]) < 0.05) lift[i] = want;
    active[i] = lift[i] < 0.5;
    if (posts[i].dataset.lift === lift[i].toFixed(2)) continue;
    posts[i].dataset.lift = lift[i].toFixed(2);
    lenses[i].setAttribute("transform", translateAlong(P, [0, 0, lift[i]]));
    const x = D.LENS_X[i];
    posts[i].innerHTML = solidSvg(cylinder(x, D.POST_Y, 1.8, D.SLEEVE_Z[1], D.ZA - 3 + lift[i] - D.SLEEVE_Z[1], P, 14), { tone: "mid", crease: "none" });
  }
  const t = trace(active);
  // el haz sigue a la óptica con una constante corta, para que no salte
  if (!smooth) smooth = { ym: t.ym.slice(), yc: t.yc.slice() };
  const a = 1 - Math.exp(-dt / 0.12);
  for (let i = 0; i < t.ym.length; i++) { smooth.ym[i] += (t.ym[i] - smooth.ym[i]) * a; smooth.yc[i] += (t.yc[i] - smooth.yc[i]) * a; }
  const key = lift.map((v) => v.toFixed(2)).join() + "|" + smooth.ym.map((v) => v.toFixed(2)).join() + "|" + smooth.yc.map((v) => v.toFixed(2)).join();
  if (key !== lastKey) { lastKey = key; drawBeams(t); }
  drawFlame(dt, t);
}
let lastKey = "";
function drawBeams(t) {
  for (let s = 0; s < 4; s++) beams[s].innerHTML = coneSvg(t.xs[s] + (s === 0 ? 3 : 0), smooth.ym[s], t.xs[s + 1], smooth.ym[s + 1]);
  // la mancha en la pantalla: su diámetro es el del modelo; su brillo, inverso al área
  const r = Math.abs(smooth.ym[4]) + Math.abs(smooth.yc[4]);
  const op = Math.min(0.95, Math.max(0.16, 0.95 * Math.pow(4 / (2 * r), 0.9)));
  const ring = ringPts(D.SCREEN_X - 1.3, Math.max(r, 0.6), 40);
  let spot = '<path class="banco-mancha" style="opacity:' + op.toFixed(3) + '" d="' + pathOf(ring, true) + '"/>';
  if (r < 2.2) {
    // la imagen de la llama, invertida
    const c = iso([D.SCREEN_X - 1.3, 0, D.ZA], P), h = Math.abs(smooth.yc[4]) * 9 / 5 + 1.2;
    spot += '<path class="banco-llama" d="M' + c[0].toFixed(2) + ' ' + (c[1] + h).toFixed(2) + 'C' + (c[0] + h * 0.55).toFixed(2) + ' ' + (c[1] + h * 0.1).toFixed(2) + ' ' + (c[0] + h * 0.4).toFixed(2) + ' ' + (c[1] - h * 0.55).toFixed(2) + ' ' + c[0].toFixed(2) + ' ' + (c[1] - h * 0.6).toFixed(2) + 'C' + (c[0] - h * 0.4).toFixed(2) + ' ' + (c[1] - h * 0.55).toFixed(2) + ' ' + (c[0] - h * 0.55).toFixed(2) + ' ' + (c[1] + h * 0.1).toFixed(2) + ' ' + c[0].toFixed(2) + ' ' + (c[1] + h).toFixed(2) + 'Z"/>';
  }
  spotEl.innerHTML = spot;
}
function drawFlame(dt, t) {
  // la llama de la vela, con un parpadeo leve
  clock += dt;
  const f = iso([0, 0, D.ZA], P), w = 2.6 + Math.sin(clock * 9.1) * 0.15, hh = 7 + Math.sin(clock * 6.3) * 0.5;
  flameEl.innerHTML = '<ellipse class="banco-halo" cx="' + f[0].toFixed(2) + '" cy="' + f[1].toFixed(2) + '" rx="' + (w * 3.4).toFixed(2) + '" ry="' + (hh * 1.25).toFixed(2) + '"/>' +
    '<path class="banco-llama" d="M' + f[0].toFixed(2) + ' ' + (f[1] - hh).toFixed(2) + 'C' + (f[0] + w).toFixed(2) + ' ' + (f[1] - hh * 0.35).toFixed(2) + ' ' + (f[0] + w * 0.9).toFixed(2) + ' ' + (f[1] + hh * 0.42).toFixed(2) + ' ' + f[0].toFixed(2) + ' ' + (f[1] + hh * 0.46).toFixed(2) + 'C' + (f[0] - w * 0.9).toFixed(2) + ' ' + (f[1] + hh * 0.42).toFixed(2) + ' ' + (f[0] - w).toFixed(2) + ' ' + (f[1] - hh * 0.35).toFixed(2) + ' ' + f[0].toFixed(2) + ' ' + (f[1] - hh).toFixed(2) + 'Z"/>';
  const n = active.filter(Boolean).length;
  const mm = Math.round(2 * (Math.abs(t.ym[4]) + Math.abs(t.yc[4])) * D.MM);
  const text = n + (n === 1 ? " lente" : " lentes") + " · mancha de " + mm.toLocaleString("es-CL") + " mm";
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
  if (playing || target !== null) advance(dt);
  draw(dt);
  if (lam) visible = lam.classList.contains("activa");
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (m) => { target = Math.max(0, Math.min(3, Math.round(m))); clearTimeout(idle); idle = setTimeout(() => { const was = target; target = null; phase = was === 3 ? 5 : 6; phaseT = 0; }, 4000); run(); };
const lam = root.closest(".lamina");
if (lam) {
  visible = lam.classList.contains("activa");
  lam.addEventListener("entrar", () => { visible = true; lift = [D.LIFT, D.LIFT, D.LIFT]; goal = [1, 1, 1]; phase = 7; phaseT = 0.6; target = null; smooth = null; run(); });
  new MutationObserver(() => { visible = lam.classList.contains("activa"); if (visible) run(); }).observe(lam, { attributes: true, attributeFilter: ["class"] });
} else {
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(root);
}
const fromX = (e) => { const b = svg.getBoundingClientRect(); return ((e.clientX - b.left) / b.width - 0.1) / 0.8 * 3; };
root.addEventListener("pointerdown", (e) => steer(fromX(e)));
root.addEventListener("pointermove", (e) => { if (e.buttons & 1) steer(fromX(e)); });
if (!lam) root.addEventListener("keydown", (e) => {
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = (target ?? active.filter(Boolean).length) + 1;
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = (target ?? active.filter(Boolean).length) - 1;
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = 3;
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); playing = !playing; run(); return; }
  if (to === null) return;
  e.preventDefault(); steer(to);
});
if (still.matches) { lift = [0, 0, 0]; goal = [0, 0, 0]; }
draw(1);
run();
`;

const CSS = `
.banco-luz{fill:var(--anatomy-lit-shade)}
@media (hover: hover) and (pointer: fine){.banco-luz{mix-blend-mode:multiply}}
.banco-mancha{fill:var(--anatomy-lit-top)}
.banco-llama{fill:var(--anatomy-lit-shade);stroke:var(--anatomy-hi);stroke-width:.6}
.banco-halo{fill:var(--anatomy-lit-top);opacity:.55}
.banco-vidrio{fill:var(--anatomy-face);fill-opacity:.38}
.banco-pantalla{fill:var(--anatomy-face)}
.iso[data-theme="light"] .iso-figure, .iso[data-theme="light"].banco-tema, .banco-tema .iso-figure{
  --anatomy-page:#F3F6F9;--anatomy-card:#FAFAF7;--anatomy-paper:#FAFAF7;--anatomy-face:#FFFFFF;--anatomy-top:#FFFFFF;
  --anatomy-shade-0:#D5DFE9;--anatomy-shade-1:#DFE7EF;--anatomy-shade-2:#E9EFF5;--anatomy-shade-3:#F2F5F9;
  --anatomy-lit-top:#FBE7B0;--anatomy-lit-shade:#F6D16E;
  --anatomy-hi:#0F2238;--anatomy-mid:#47627F;--anatomy-lo:#9AB0C6;--anatomy-faint:#CBD7E3;--anatomy-lit:#0F2238;
  --anatomy-halo:#7F98B3;--anatomy-halo-opacity:.3;--anatomy-dot:#143A5F;
  --anatomy-text:#34465A;--anatomy-strong:#0F2238;--anatomy-muted:#5B6E83;
}
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Banco óptico",
  readout: "0 lentes · mancha de 269 mm",
  keys: [
    { mark: "lit", label: "Lo que enfocan: lo particular, lo sensible, el individuo" },
    { mark: "raised", label: "Tres lentes, tres esferas: la literaria, la filosófica y la social" },
  ],
  caption: `Un banco óptico de un metro y medio. La llama de una vela ilumina una pantalla; tres lentes (f = ${FOCAL.map((f) => Math.round(f * MM / 10)).join(", ")} cm) bajan al eje una tras otra. Sin lentes, la mancha de luz mide 27 cm; con las tres, la pantalla recibe la imagen nítida de la llama, de 9 mm.`,
  body: `<div class="iso-stage" data-banco tabindex="0" role="slider" aria-label="Banco óptico: lentes en el eje" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0">${svg}</div>`,
});

const page = k.pageHtml({ title: "Banco óptico", theme, body: `<style>${CSS}</style>` + body, script: kitScript() + live });
const name = theme === "light" ? "banco-light.html" : "banco.html";
writeFileSync(join(HERE, name), page);
writeFileSync(join(HERE, "banco-fragmento.json"), JSON.stringify({ body, css: CSS, live }));
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB", "f3 =", F3.toFixed(1), "spots", [[0, 0, 0], [110, 0, 0], [110, 150, 0], FOCAL].map((fs) => { const [m, c] = yAt(fs, SCREEN_X); return Math.round(2 * (Math.abs(m) + Math.abs(c)) * MM); }).join(" / "));
