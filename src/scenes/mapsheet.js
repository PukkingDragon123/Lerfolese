// The run map as a Slay-the-Spire-style hand-drawn parchment lying on the desk, read bottom to top toward the
// guardian: ink-and-watercolour illustration (hills, groves, the river, ruins, the labyrinth, the marsh, calligraphy
// names) on a curled, torn sheet; ink-stamp pixel node icons with dotted ink routes; and a living layer on top:
// wind-blown grass that parts around the pointer, detailed toon trees that flutter and shed leaves, a pixel sun,
// ink splashes, sparkles, a drawn ink trail when travelling, drifting dust and birds.
import * as THREE from 'three';
import { PixelCanvas, makeNoise } from '../gfx/pixel.js';
import { mulberry32, clamp } from '../core/util.js';
import { Particles } from '../gfx/particles.js';
import { Critters } from '../gfx/critters.js';
import { Spring } from '../core/tween.js';
import { makeSun, playVFX } from '../gfx/vfx.js';
import { loadPBR } from '../gfx/assets.js';
import * as T from '../models/toon.js';
import { toonModel } from '../models/realworld.js';

const V3 = THREE.Vector3; const TAU = Math.PI * 2;
export const SHEET = { X0: -9.4, X1: 9.4, ZN: 3.4, ZF: -33.4 };
const SW = SHEET.X1 - SHEET.X0, SL = SHEET.ZN - SHEET.ZF; const PPU = 40;
const riverX = (z) => Math.sin(z * 0.18) * 4.5 + 1.5;
const INK = '#2a1810', SEPIA = '#5a3a22';

/** height of the bent paper at (x, z): gentle undulation, curled long edges, rolled ends */
export function sheetY(x, z) {
  const u = Math.abs(x / (SW / 2)), v = (z - (SHEET.ZN + SHEET.ZF) / 2) / (SL / 2);
  let y = 0.24 + 0.1 * Math.sin(z * 0.23 + 0.6) + 0.05 * Math.sin(x * 0.4 + z * 0.11);
  y += 0.75 * Math.max(0, (u - 0.88) / 0.12) ** 2; const e = Math.max(0, (Math.abs(v) - 0.94) / 0.06); y += (v > 0 ? 0.7 : 1.0) * e * e;
  return y;
}

// ---------------------------------------------------------------- the hand-drawn parchment
function paintParchment(map, seed) {
  const W = Math.round(SW * PPU), H = Math.round(SL * PPU); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const rnd = mulberry32(seed % 100000 + 3); const n = makeNoise((seed % 997) + 5);
  const P = (x, z) => [(x - SHEET.X0) * PPU, (z - SHEET.ZF) * PPU];
  const nodes = Object.values(map.nodes); const segs = []; for (const a of nodes) for (const id of a.next) { const b = map.nodes[id]; if (b) segs.push([a.x, a.z, b.x - a.x, b.z - a.z]); }
  const pathD = (x, z) => { let d = 1e9; for (const [ax, az, dx, dz] of segs) { const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
  const nodeD = (x, z) => { let d = 1e9; for (const a of nodes) d = Math.min(d, Math.hypot(x - a.x, z - a.z)); return d; };
  const free = (x, z, r) => pathD(x, z) > r && nodeD(x, z) > r + 0.4 && Math.abs(x) < SW / 2 - 0.9 && z < SHEET.ZN - 1 && z > SHEET.ZF + 1;
  const jit = (a = 1) => (rnd() - 0.5) * a;
  // torn outline
  const pts = []; const tear = (k) => 7 + n(k * 0.04, 3.7) * 16 + (rnd() < 0.035 ? rnd() * 34 : 0);
  for (let x = 0; x <= W; x += 7) pts.push([x, tear(x)]); for (let y = 0; y <= H; y += 7) pts.push([W - tear(y + 999), y]);
  for (let x = W; x >= 0; x -= 7) pts.push([x, H - tear(x + 3333)]); for (let y = H; y >= 0; y -= 7) pts.push([tear(y + 7777), y]);
  const outline = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  g.save(); outline(); g.clip();
  // paper: mottled warm fibres (quarter-res noise blown up for soft watercolour blooms)
  const q = document.createElement('canvas'); q.width = W >> 2; q.height = H >> 2; const qg = q.getContext('2d'); const id = qg.createImageData(q.width, q.height);
  for (let y = 0; y < q.height; y++) for (let x = 0; x < q.width; x++) { const f = n.fbm(x * 0.03, y * 0.03, 4), st = Math.max(0, n.fbm(x * 0.011 + 40, y * 0.011, 3) - 0.62) * 2.2; const k = (y * q.width + x) * 4; id.data[k] = 226 - f * 36 - st * 60; id.data[k + 1] = 200 - f * 42 - st * 80; id.data[k + 2] = 146 - f * 46 - st * 90; id.data[k + 3] = 255; }
  qg.putImageData(id, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(q, 0, 0, W, H);
  g.globalAlpha = 0.07; g.strokeStyle = '#6a4a2a'; g.lineWidth = 1; for (let i = 0; i < 2600; i++) { const x = rnd() * W, y = rnd() * H, a = rnd() * TAU, l = 3 + rnd() * 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } g.globalAlpha = 1;
  // washes
  const wash = (draw, col, a = 0.42, edge = 0.55) => { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.fillStyle = col; draw(); g.fill(); g.globalAlpha = a * edge; g.strokeStyle = col; g.lineWidth = 2.2; g.stroke(); g.restore(); };
  const blob = (cx, cy, r, k = 0.35) => { g.beginPath(); const m = 18; for (let i = 0; i <= m; i++) { const a = (i / m) * TAU; const rr = r * (1 + (n(cx * 0.01 + Math.cos(a) * 1.3, cy * 0.01 + Math.sin(a) * 1.3) - 0.5) * k * 2); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.72; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  const inkLine = (path, w = 1.6, col = INK, a = 0.9) => { g.save(); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); path(); g.stroke(); g.restore(); };
  // hills and meadows (watercolour + inked bumps with hatching)
  for (let z = SHEET.ZN - 1.2; z > -27; z -= 0.9) for (let x = -8.6; x < 8.6; x += 0.9) {
    const h = n.fbm(x * 0.12 + 20, z * 0.12 + 4, 3); const xx = x + jit(0.5), zz = z + jit(0.5); if (h < 0.55 || !free(xx, zz, 0.55) || Math.abs(xx - riverX(zz)) < 1.1) continue;
    const [px, py] = P(xx, zz); const r = 14 + rnd() * 14; wash(() => blob(px, py, r * 1.6), '#9fbf6a', 0.32);
    inkLine(() => { g.moveTo(px - r, py); g.quadraticCurveTo(px - r * 0.2, py - r * 1.1, px + r, py); }, 1.7);
    for (let k = 0; k < 4; k++) inkLine(() => { const hx = px + r * (0.1 + k * 0.22); g.moveTo(hx, py - r * 0.35 + k * 2); g.lineTo(hx - 5, py - 1); }, 1, SEPIA, 0.7);
  }
  const groves = []; // (no trees on the map, by request)
  // the river Kephisos: wash, inked banks, wave ticks
  const riv = []; for (let z = SHEET.ZN + 0.5; z > -25.2; z -= 0.25) riv.push(P(riverX(z), z));
  g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = '#86b9d2'; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = 0.75; g.lineWidth = 0.95 * PPU; g.beginPath(); riv.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.globalAlpha = 0.55; g.strokeStyle = '#5f93b4'; g.lineWidth = 0.42 * PPU; g.stroke(); g.restore();
  for (const s of [-1, 1]) inkLine(() => riv.forEach(([x, y], i) => { const xx = x + s * 0.48 * PPU + jit(1.2); i ? g.lineTo(xx, y) : g.moveTo(xx, y); }), 1.4);
  for (let i = 4; i < riv.length - 2; i += 7) { const [x, y] = riv[i]; inkLine(() => { g.moveTo(x - 6, y); g.quadraticCurveTo(x - 3, y - 3, x, y); g.quadraticCurveTo(x + 3, y + 3, x + 6, y); }, 1.1, '#2c5470', 0.85); }
  // the marsh: teal pools, reeds, "here be hydras"
  for (let i = 0; i < 26; i++) { const x = jit(16), z = -21.5 - rnd() * 5.5; if (!free(x, z, 0.75)) continue; const [px, py] = P(x, z); const r = 10 + rnd() * 18; wash(() => blob(px, py, r, 0.45), '#7fb3a4', 0.55, 1.2); for (let k = 0; k < 5; k++) { const rx = px + jit(r * 1.6), ry = py + jit(r * 0.6); inkLine(() => { g.moveTo(rx, ry); g.lineTo(rx + jit(3), ry - 7 - rnd() * 5); }, 1, SEPIA, 0.8); } }
  // the mountains behind the guardian's gate
  for (let x = -8.8; x < 8.8; x += 1.0 + rnd() * 0.6) {
    const z = SHEET.ZF + 1.6 + rnd() * 1.4; const [px, py] = P(x, z); const w = 18 + rnd() * 22, h = 22 + rnd() * 26;
    const tri = () => { g.beginPath(); g.moveTo(px - w, py); g.lineTo(px - w * 0.1, py - h); g.lineTo(px + w, py); g.closePath(); };
    wash(tri, '#a59cc4', 0.5, 0.2); g.save(); tri(); g.clip(); for (let k = -h; k < w; k += 4) inkLine(() => { g.moveTo(px + k, py); g.lineTo(px + k + h * 0.6, py - h); }, 0.9, SEPIA, 0.45); g.fillStyle = '#f6efe0'; g.beginPath(); g.moveTo(px - w * 0.1, py - h); g.lineTo(px - w * 0.36, py - h * 0.66); g.lineTo(px + w * 0.16, py - h * 0.7); g.closePath(); g.fill(); g.restore();
    inkLine(() => { g.moveTo(px - w, py); g.lineTo(px - w * 0.1, py - h); g.lineTo(px + w, py); }, 1.6);
  }
  // landmarks + calligraphy (placed where the routes leave room)
  const taken = []; const spot = (z0, z1, r) => { let best = null, bd = -1; for (let i = 0; i < 260; i++) { const x = jit(15), z = z0 + rnd() * (z1 - z0); let d = Math.min(pathD(x, z), nodeD(x, z) - 0.3); for (const [tx, tz] of taken) if (Math.abs(x - tx) < 4.2 && Math.abs(z - tz) < 1.2) d -= 3; if (d > bd && Math.abs(x) < SW / 2 - 1.2 - r * 0.5) { bd = d; best = [x, z]; } } if (best) taken.push(best); return best; };
  const label = (txt, x, z, { font = '700 30px "Caveat"', rot = jit(0.12), col = '#3a2212' } = {}) => { const [px, py] = P(x, z); g.save(); g.translate(px, py); g.rotate(rot); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(240,220,170,0.55)'; g.fillText(txt, 1.5, 1.5); g.fillStyle = col; g.fillText(txt, 0, 0); g.restore(); };
  const ruin = spot(-13, -8, 1.5); if (ruin) { const [px, py] = P(...ruin); wash(() => blob(px, py + 6, 30), '#c8b490', 0.45); for (let k = 0; k < 5; k++) { const cx = px - 26 + k * 13, hh = k === 3 ? 12 : 26 + jit(4); inkLine(() => { g.rect(cx - 3, py - hh, 6, hh); g.moveTo(cx - 5, py - hh); g.lineTo(cx + 5, py - hh); }, 1.3); } inkLine(() => { g.moveTo(px - 32, py - 28); g.lineTo(px + 6, py - 28); g.lineTo(px - 13, py - 40); g.closePath(); }, 1.5); inkLine(() => { g.moveTo(px - 36, py + 1); g.lineTo(px + 36, py + 1); }, 1.8); label('Ruins of Old Delphi', ruin[0], ruin[1] + 0.75, { font: '700 26px "Caveat"' }); }
  const laby = spot(-19.5, -14.5, 1.6); if (laby) { const [px, py] = P(...laby); wash(() => blob(px, py, 34), '#c89a6a', 0.38); for (let k = 0; k < 4; k++) { const s = 30 - k * 8; inkLine(() => { g.moveTo(px - s + 6, py - s); g.lineTo(px + s, py - s); g.lineTo(px + s, py + s); g.lineTo(px - s, py + s); g.lineTo(px - s, py - s + 8 * (k % 2 ? 1 : 2)); }, 1.8); } label('The Labyrinth', laby[0], laby[1] + 1.05, { font: '700 28px "Caveat"' }); }
  const lbl = [['The Olive Meadows', -3.5, 0.6], ['River Kephisos', -7, -2], ['Kobalos Gully', -18, -14.5], ['Lernaean Marsh', -25.5, -21.5], ['here be hydras', -24.5, -22, '22px "HomemadeApple"']];
  for (const [t, z0, z1, f] of lbl) { const s = spot(z1 < z0 ? z1 : z0, z1 < z0 ? z0 : z1, 2.2); if (s) label(t, s[0], s[1], f ? { font: f, col: '#5a2a1a' } : {}); }
  label('Gate of the Guardian', 0, SHEET.ZF + 1.3, { font: '34px "Jacquard"', rot: 0, col: '#4a1414' });
  // title cartouche + compass rose + frame
  { const [px, py] = P(0, SHEET.ZN - 1.15); g.save(); g.fillStyle = '#efdcae'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(px - 170, py - 22); g.lineTo(px + 170, py - 22); g.lineTo(px + 190, py - 4); g.lineTo(px + 170, py + 18); g.lineTo(px - 170, py + 18); g.lineTo(px - 190, py - 4); g.closePath(); g.fill(); g.stroke(); g.restore(); label('The Mythical Wilderness', 0, SHEET.ZN - 1.2, { font: '40px "Jacquard"', rot: 0, col: '#2a1408' }); }
  { const [px, py] = P(7.4, SHEET.ZN - 1.4); g.save(); g.translate(px, py); for (let k = 0; k < 8; k++) { const r = k % 2 ? 14 : 30; g.rotate(TAU / 8); g.fillStyle = k % 4 === 0 ? '#9a2a22' : '#3a2414'; g.beginPath(); g.moveTo(0, -r); g.lineTo(5, 0); g.lineTo(-5, 0); g.closePath(); g.fill(); } g.restore(); g.save(); g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.arc(px, py, 20, 0, TAU); g.stroke(); g.font = '700 22px "Caveat"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('N', px, py - 36); g.restore(); }
  for (const k of [26, 32]) { g.save(); g.strokeStyle = INK; g.globalAlpha = k === 26 ? 0.8 : 0.45; g.lineWidth = k === 26 ? 2.2 : 1.2; g.strokeRect(k, k, W - 2 * k, H - 2 * k); g.restore(); }
  for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H; g.fillStyle = 'rgba(42,24,16,0.5)'; g.beginPath(); g.arc(x, y, rnd() * 2.2 + 0.4, 0, TAU); g.fill(); }
  // burnt rim + vignette
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62); vg.addColorStop(0, 'rgba(120,70,30,0)'); vg.addColorStop(1, 'rgba(120,70,30,0.42)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore(); g.save(); outline(); g.clip(); outline(); g.strokeStyle = 'rgba(80,42,18,0.55)'; g.lineWidth = 16; g.stroke(); g.strokeStyle = '#4a2410'; g.lineWidth = 4; g.stroke(); g.restore();
  return { canvas: cv, groves, pathD, nodeD, free, hill: (x, z) => n.fbm(x * 0.12 + 20, z * 0.12 + 4, 3) };
}

// ---------------------------------------------------------------- pixel-art ink stamps (icons, rings, dots, splash)
const ICON_PAL = { ink: '#24140c', ink2: '#5a3820', paper: '#f2e2b4', paper2: '#d8c08a', red: '#a8282a', red2: '#e05a3a', blade: '#e8e2d2', blade2: '#9a9890', gold: '#f2c040', gold2: '#b07820', teal: '#3fc8c0', teal2: '#1f7a7a', bronze: '#c88a3a' };
function stamp(draw, size = 32) {
  const p = new PixelCanvas(size, size); const c = size / 2; draw(p, c); p.outline(ICON_PAL.ink); p.outline(ICON_PAL.ink); p.outline('#e8d4a0');
  return p;
}
const ICONS = {
  battle: (p) => { p.thickLine(9, 23, 23, 9, 2.4, ICON_PAL.blade); p.thickLine(9, 9, 23, 23, 2.4, ICON_PAL.blade2); p.line(10, 24, 24, 10, ICON_PAL.ink2); p.thickLine(6, 19, 13, 26, 1.4, ICON_PAL.gold2); p.thickLine(19, 26, 26, 19, 1.4, ICON_PAL.gold2); p.disc(7, 25, 1.6, ICON_PAL.red); p.disc(25, 25, 1.6, ICON_PAL.red); },
  elite: (p) => { p.thickLine(6, 9, 11, 14, 1.6, ICON_PAL.blade); p.thickLine(26, 9, 21, 14, 1.6, ICON_PAL.blade); p.ellipse(16, 17, 7, 8, ICON_PAL.blade); p.ellipse(16, 22, 4, 3, ICON_PAL.blade2); p.disc(13, 16, 1.8, ICON_PAL.red); p.disc(19, 16, 1.8, ICON_PAL.red); p.px(13, 15, ICON_PAL.red2); p.px(19, 15, ICON_PAL.red2); p.line(15, 22, 17, 22, ICON_PAL.ink); },
  event: (p) => { const q = [[11, 11], [12, 8], [16, 6], [20, 8], [21, 11], [20, 13], [17, 15], [16, 17], [16, 19]]; for (let i = 0; i < q.length - 1; i++) p.thickLine(q[i][0], q[i][1], q[i + 1][0], q[i + 1][1], 2.2, ICON_PAL.gold); p.disc(16, 24, 2.2, ICON_PAL.red); },
  shop: (p) => { p.ellipse(16, 17, 8, 9, ICON_PAL.bronze); p.ellipse(14, 15, 4, 6, ICON_PAL.gold); for (const y of [11, 23]) p.line(9, y, 23, y, ICON_PAL.ink2); p.ellipse(16, 8, 6, 2, ICON_PAL.ink2); p.disc(22, 22, 3.5, ICON_PAL.gold); p.px(22, 22, ICON_PAL.gold2); },
  lab: (p) => { p.rect(14, 6, 4, 8, ICON_PAL.ink2); p.fillRect(14, 6, 4, 8, ICON_PAL.blade); p.disc(16, 19, 7, ICON_PAL.blade); p.ellipse(16, 21, 6, 4, ICON_PAL.teal); p.ellipse(15, 20, 3, 2, ICON_PAL.teal2); p.px(13, 17, '#ffffff'); p.disc(19, 12, 1, ICON_PAL.teal); p.disc(21, 9, 1.2, ICON_PAL.teal); },
  guardian: (p, c) => { p.ellipse(c, c + 2, 11, 12, ICON_PAL.bronze); p.ellipse(c - 2, c - 1, 6, 7, ICON_PAL.gold); p.fillRect(c - 2, c - 2, 4, 14, ICON_PAL.ink); p.fillRect(c - 8, c - 2, 16, 3, ICON_PAL.ink); for (let i = -10; i <= 10; i++) { const y = c - 12 - Math.round(Math.sqrt(Math.max(0, 100 - i * i)) * 0.55); p.thickLine(c + i, c - 9, c + i, y, 1, i % 2 ? ICON_PAL.red : ICON_PAL.red2); } },
};
function ring(size = 48, col = ICON_PAL.ink, w = 2) { const p = new PixelCanvas(size, size); const c = size / 2; for (let a = 0; a < TAU; a += 0.02) { if (Math.sin(a * 3) > 0.92) continue; const r = c - 3 - Math.sin(a * 5) * 0.8; p.disc(c + Math.cos(a) * r, c + Math.sin(a) * r, w * 0.5, col); } return p; }
function scribble(size = 48) { const p = new PixelCanvas(size, size); const c = size / 2; for (let a = 0; a < TAU * 1.85; a += 0.025) { const r = c - 4 - a * 0.9; p.disc(c + Math.cos(a + 0.3) * r, c + Math.sin(a + 0.3) * r * 0.9, 1.1, ICON_PAL.red); } return p; }
function dot() { const p = new PixelCanvas(8, 8); p.disc(4, 4, 2.6, '#ffffff'); p.px(5, 2, '#ffffff'); return p; }
function splash(f) { const p = new PixelCanvas(32, 32); const r = mulberry32(7); p.disc(16, 16, [3, 5, 6, 5][f], ICON_PAL.ink); for (let i = 0; i < 9; i++) { const a = r() * TAU, d = (4 + r() * 4) * [0.6, 1.1, 1.6, 2.0][f]; if (f === 3 && i % 2) continue; p.disc(16 + Math.cos(a) * d, 16 + Math.sin(a) * d, [1.4, 1.6, 1.3, 0.9][f], ICON_PAL.ink); } return p; }
const texOf = (pc) => { const t = new THREE.CanvasTexture(pc.commit()); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };

// ---------------------------------------------------------------- the sheet scene
export class MapSheet {
  constructor({ engine, run, map }) {
    this.engine = engine; this.run = run; this.map = map; const seed = run.seed || 1;
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x1c121a); sc.fog = new THREE.Fog(0x1c121a, 36, 72);
    this.camera = new THREE.PerspectiveCamera(36, engine.aspect, 0.1, 200); sc.add(this.camera);
    this.world = new THREE.Group(); sc.add(this.world); this.bounds = { LEN: SL, WID: SW, Z0: SHEET.ZN };
    T.WIND.ptrK.value = 0.55; T.WIND.ptrR.value = 1.25; T.WIND.amp.value = 0.8;
    // light: a warm low sun over the far end of the map, cool sky fill
    const sun = (this.sun = new THREE.DirectionalLight(0xffe0b0, 2.5)); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sc.add(sun, sun.target);
    sc.add(new THREE.HemisphereLight(0xc8ccff, 0x7a5434, 1.0)); const fill = new THREE.DirectionalLight(0xffb070, 0.6); fill.position.set(10, 6, 8); sc.add(fill);
    const env = T.gradientEnv(engine.renderer, 'toon:map', { top: '#8a90d0', hor: '#ffd8a8', gnd: '#6a4a3a' }); if (env) { sc.environment = env; sc.environmentIntensity = 0.5; }
    // desk
    loadPBR('wood_dark', { repeat: [5, 8] }).then((m) => { const d = new THREE.Mesh(new THREE.PlaneGeometry(46, 74).rotateX(-Math.PI / 2), T.toonMaterial(m, { sat: 1.0, paint: '#5a3220', paintK: 0.75, bands: [0.5, 0.75, 1.0] })); d.position.set(0, -0.02, -15); d.receiveShadow = true; d.userData.noInk = true; this.world.add(d); }).catch(() => {});
    // the parchment sheet
    const art = (this.art = paintParchment(map, seed)); const tex = new THREE.CanvasTexture(art.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.magFilter = THREE.LinearFilter;
    const geo = new THREE.PlaneGeometry(SW, SL, 56, 110); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, (SHEET.ZN + SHEET.ZF) / 2); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sheetY(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
    const sheet = (this.sheetMesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, gradientMap: T.gradientMap([0.62, 0.84, 1.0]) }))); sheet.castShadow = true; sheet.receiveShadow = true; this.world.add(sheet);
    this.grass(); this.flowers(); this.fx();
    this.nodeViews = new Map(); this.pathMesh = null; this.trailQ = []; this.trailN = 0;
    this.iconTex = {}; for (const k of Object.keys(ICONS)) this.iconTex[k] = texOf(k === 'guardian' ? stamp(ICONS[k], 40) : stamp(ICONS[k]));
    this.ringTex = texOf(ring()); this.markTex = texOf(scribble()); this.dotTex = texOf(dot()); this.splashTex = [0, 1, 2, 3].map((f) => texOf(splash(f)));
    this.ray = new THREE.Raycaster(); this.ptrPlane = new THREE.Plane(new V3(0, 1, 0), -0.32); this.focus = new V3();
  }
  heightAt(x, z) { return sheetY(x, z); }
  // wind grass in meadow patches (not on routes, nodes, water or the cartouche)
  grass() {
    const rnd = mulberry32(17); const n = makeNoise(29); const spots = []; const { free } = this.art; const tufts = [];
    for (let i = 0; i < 4000 && tufts.length < 300; i++) {
      const z = SHEET.ZN - 2.4 - rnd() * (SL - 5); const r = rnd(); let x;
      if (r < 0.4 && z > -25) x = riverX(z) + (rnd() < 0.5 ? -1 : 1) * (0.62 + rnd() * 0.3);          // river banks
      else if (r < 0.7) { if (z > -20.5) continue; x = (rnd() - 0.5) * (SW - 2.4); if (n.fbm(x * 0.3 + 9, z * 0.3, 3) < 0.5) continue; } // marsh fringe
      else { x = (rnd() - 0.5) * (SW - 2.4); if (this.art.hill(x, z) < 0.57) continue; } // the inked meadow / hill patches
      if (Math.abs(x) > SW / 2 - 1.1 || !free(x, z, 0.5)) continue; tufts.push([x, z]);
    }
    for (const [cx, cz] of tufts) { const k = 5 + Math.floor(rnd() * 4); for (let b = 0; b < k; b++) { const a = rnd() * TAU, d = rnd() * 0.11; const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; spots.push([x, sheetY(x, z) - 0.01, z, 0.045 + rnd() * 0.055, rnd()]); } }
    this.grassMesh = T.grassBlades(spots, { dry: 0.2 }); this.world.add(this.grassMesh);
  }
  // toon wildflowers in the meadows (no trees on the map) + reed blades along the river banks and marsh pools
  flowers() {
    this.flowerList = []; const rnd = mulberry32(5); const n = makeNoise(29); const kinds = ['celandine_01', 'flower_gazania', 'shrub_sorrel_01'];
    const clusters = []; for (let i = 0; i < 900 && clusters.length < 11; i++) { const x = (rnd() - 0.5) * (SW - 3), z = SHEET.ZN - 2.6 - rnd() * (SL - 8); if (z < -26 || this.art.hill(x, z) < 0.53 || Math.abs(x - riverX(z)) < 1.1 || !this.art.free(x, z, 0.8) || clusters.some(([a, b]) => Math.hypot(a - x, b - z) < 2.6)) continue; clusters.push([x, z]); }
    clusters.forEach(([cx, cz], ci) => { const name = kinds[ci % kinds.length]; const m = 3 + Math.floor(rnd() * 3); for (let k = 0; k < m; k++) { const a = (k / m) * TAU + rnd(), d = k ? 0.22 + rnd() * 0.12 : 0; const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; const s = (name === 'shrub_sorrel_01' ? 3.4 : 3.0) * (0.85 + rnd() * 0.3);
      toonModel(name, rnd, { sat: 1.6, leafTint: '#fffbd8', tint: '#fff4e8', wind: 1.4, windH: 3 }).then((o) => { o.scale.multiplyScalar(s); o.position.set(x, sheetY(x, z) - 0.01, z); o.rotation.y = rnd() * TAU; this.world.add(o); this.flowerList.push(o); }).catch(() => {}); } });
    const reeds = []; for (let i = 0; i < 9000 && reeds.length < 900; i++) {
      const z = SHEET.ZN - 1 - rnd() * (SL - 3); const marsh = z < -21; const x = marsh ? (rnd() - 0.5) * (SW - 2) : riverX(z) + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.32);
      if (marsh && n.fbm(x * 0.3 + 9, z * 0.3, 3) < 0.6) continue; if (!marsh && z < -25) continue; if (!this.art.free(x, z, 0.45)) continue;
      reeds.push([x, sheetY(x, z) - 0.01, z, 0.12 + rnd() * 0.12, 0]);
    }
    const r = T.grassBlades(reeds, { dry: 0 }); for (let i = 0; i < reeds.length; i++) r.setColorAt(i, new THREE.Color().setHSL(0.17 + Math.random() * 0.06, 0.45, 0.42 + Math.random() * 0.15)); r.instanceColor.needsUpdate = true; this.world.add(r);
  }
  fx() {
    this.leaves = new Particles(260); this.scene.add(this.leaves.points); this.glints = new Particles(400, { additive: true }); this.scene.add(this.glints.points);
    this.critters = new Critters(40); this.critters.bounds = { x: [-8, 8], y: [1.8, 4.5], z: [-12, 2] }; this.scene.add(this.critters.mesh); this.critters.spawnBirds(7, ['swallow', 'sparrow', 'dove']); this.critters.spawnButterflies(5, new V3(0, 0.7, -6), 8);
    this.sunSprite = makeSun({ size: 1.05 }); this.sunSprite.position.set(0.55, 1.95, -6.5); this.camera.add(this.sunSprite);
    this.inkFX = [];
  }
  // ------------------------------------------------ nodes, routes
  addNode(nd) {
    const g = new THREE.Group(); g.position.set(nd.x, sheetY(nd.x, nd.z), nd.z); this.world.add(g); const big = nd.type === 'guardian'; const size = big ? 2.0 : 1.02; const tilt = 0.72;
    const ig = new THREE.PlaneGeometry(size, size); const halo = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.05, size * 0.62).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.markTex, transparent: true, opacity: 0, depthWrite: false })); void halo; ig.translate(0, size / 2, 0);
    const icon = new THREE.Mesh(ig, new THREE.MeshBasicMaterial({ map: this.iconTex[nd.type] || this.iconTex.event, alphaTest: 0.5, side: THREE.DoubleSide, fog: false })); icon.rotation.x = -tilt; icon.position.z = 0.05; icon.userData.noAO = true; g.add(icon);
    const decal = (tex, s, y = 0.02) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false })); m.position.y = y; m.userData.noAO = true; m.renderOrder = 2; g.add(m); return m; };
    const ringM = decal(this.ringTex, size * 1.35); ringM.visible = false; const mark = decal(this.markTex, size * 1.3, 0.025); mark.visible = false;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(size * 0.6, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = size * 0.45; hit.userData.node = nd; g.add(hit);
    const v = { g, nd, icon, ring: ringM, mark, hit, s: new Spring(1, 14, 0.4), ph: Math.random() * TAU, reachable: false, visited: false }; this.nodeViews.set(nd.id, v); return v;
  }
  buildPaths(run) {
    if (this.pathMesh) { this.world.remove(this.pathMesh); this.pathMesh.geometry.dispose(); }
    const visited = run.path || []; const vset = new Set(); for (let i = 0; i < visited.length - 1; i++) vset.add(visited[i] + '>' + visited[i + 1]); const pos = run.pos;
    const dots = [];
    for (const a of Object.values(this.map.nodes)) for (const id of a.next) {
      const b = this.map.nodes[id]; if (!b) continue; const len = Math.hypot(b.x - a.x, b.z - a.z); const k = Math.floor(len / 0.34); const state = vset.has(a.id + '>' + id) ? 2 : a.id === pos ? 1 : 0;
      for (let i = 1; i < k; i++) { const t = i / k; const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (Math.hypot(x - a.x, z - a.z) < 0.62 || Math.hypot(x - b.x, z - b.z) < 0.62) continue; dots.push([x, z, state]); }
    }
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.dotTex, alphaTest: 0.5, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false }), Math.max(1, dots.length));
    const m4 = new THREE.Matrix4(), c = new THREE.Color(); const cols = [new THREE.Color('#6a4c34'), new THREE.Color('#1a0c06'), new THREE.Color('#8a1e18')];
    dots.forEach(([x, z, s], i) => { const sc = s ? 1.25 : 1; m4.makeRotationY(i * 1.7).scale(new V3(sc, 1, sc)).setPosition(x, sheetY(x, z) + 0.015, z); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, c.copy(cols[s])); });
    mesh.count = dots.length; mesh.renderOrder = 2; mesh.userData.noAO = true; mesh.frustumCulled = false; this.pathMesh = mesh; this.world.add(mesh);
  }
  refresh(reach, run) { for (const [id, v] of this.nodeViews) { v.reachable = reach.has(id); v.visited = (run.path || []).includes(id); v.ring.visible = v.reachable; v.mark.visible = v.visited && id !== run.pos; v.icon.material.color.setScalar(v.visited ? 0.72 : 1); } }
  pick(ndc) { this.ray.setFromCamera(ndc, this.camera); const h = this.ray.intersectObjects([...this.nodeViews.values()].map((v) => v.hit)); return h[0]?.object.userData.node; }
  // ink splash decal + sparkles when a node is hovered
  inkSplash(x, z, s = 1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3 * s, 1.3 * s).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.splashTex[0], alphaTest: 0.5, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, fog: false })); m.position.set(x, sheetY(x, z) + 0.02, z); m.rotation.y = Math.random() * TAU; m.renderOrder = 3; this.world.add(m); this.inkFX.push({ m, t: 0, keep: s < 0.6 }); }
  hover(nd) { if (!nd) return; const v = this.nodeViews.get(nd.id); v?.s.kick(3); this.inkSplash(nd.x, nd.z + 0.3, 0.9); for (let i = 0; i < 14; i++) this.glints.spawn({ pos: [nd.x, sheetY(nd.x, nd.z) + 0.8, nd.z], vel: [(Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2], grav: 2.2, drag: 1.5, life: 0.9, size: 16, color: i % 3 ? '#ffe08a' : '#ffffff', sprite: 'spark' }); playVFX(this.scene, 'eureka', new V3(nd.x, sheetY(nd.x, nd.z) + 1.0, nd.z), { scale: 0.32 }); }
  // the drawn ink trail while the marionette walks a route
  trail(a, b, dur) { const len = Math.hypot(b.x - a.x, b.z - a.z); const k = Math.max(2, Math.floor(len / 0.3)); for (let i = 1; i < k; i++) this.trailQ.push({ at: (i / k) * dur, x: a.x + (b.x - a.x) * (i / k), z: a.z + (b.z - a.z) * (i / k) }); this.trailT = 0; }
  update(dt, t, { fz = -4, dist = 16.5, pitch = 1.02, ndc = null } = {}) {
    const f = this.focus.set(0, 0.3, clamp(fz, -24, -1.1)); const cam = this.camera; cam.position.set(0, f.y + Math.sin(pitch) * dist, f.z + Math.cos(pitch) * dist); cam.lookAt(f);
    this.sun.position.set(f.x - 5, 13, f.z - 7); this.sun.target.position.copy(f);
    if (ndc) { this.ray.setFromCamera(ndc, cam); const hit = this.ray.ray.intersectPlane(this.ptrPlane, new V3()); if (hit) T.WIND.ptr.value.set(hit.x, sheetY(hit.x, hit.z), hit.z); }
    for (const [, v] of this.nodeViews) { v.s.update(dt); v.g.scale.setScalar(v.s.value); if (v.reachable) { v.icon.rotation.z = Math.sin(t * 4.2 + v.ph) * 0.1; const k = (t * 0.9 + v.ph) % 1; v.ring.scale.setScalar(0.85 + k * 0.45); v.ring.material.opacity = 1 - k; } else v.icon.rotation.z = 0; }
    // trail drawing
    if (this.trailQ.length) { this.trailT = (this.trailT || 0) + dt; while (this.trailQ.length && this.trailQ[0].at <= this.trailT) { const d = this.trailQ.shift(); this.inkSplash(d.x, d.z, 0.38); } }
    for (let i = this.inkFX.length - 1; i >= 0; i--) { const e = this.inkFX[i]; e.t += dt; const fr = Math.min(3, Math.floor(e.t * 14)); e.m.material.map = this.splashTex[e.keep ? Math.min(fr, 1) : fr]; if (!e.keep && e.t > 0.6) { e.m.material.opacity = Math.max(0, 1 - (e.t - 0.6) * 2); if (e.t > 1.1) { this.world.remove(e.m); e.m.geometry.dispose(); e.m.material.dispose(); this.inkFX.splice(i, 1); } } }
    // leaves drifting off the trees, warm dust motes in the light
    if (Math.random() < dt * 3.5) { const wd = T.WIND.dir.value; const x = -wd.x * 9 + (Math.random() - 0.5) * 10, z = f.z + (Math.random() - 0.5) * 12; const petal = Math.random() < 0.6; this.leaves.spawn({ pos: [x, 1.4 + Math.random() * 2.2, z], vel: [wd.x * 1.6, 0.05, wd.y * 1.6], grav: 0.12, drag: 0.15, wobble: 1.6, spin: 4, life: 7, size: petal ? 10 : 12, color: petal ? ['#ffd0e0', '#ffffff', '#ffe27a'][Math.floor(Math.random() * 3)] : ['#9ab84a', '#d8b048'][Math.floor(Math.random() * 2)], sprite: petal ? 'petal' : 'leaf', floor: 0.3, bounce: 0 }); }
    if (Math.random() < dt * 6) this.glints.spawn({ pos: [(Math.random() - 0.5) * 16, 0.6 + Math.random() * 2.5, f.z + (Math.random() - 0.5) * 14], vel: [0.12, 0.05, 0], wobble: 0.3, life: 5, size: 7 + Math.random() * 6, color: '#ffe6b0', alpha: 0.5, sprite: 'dot' });
    this.leaves.update(dt, t); this.glints.update(dt, t);
    this.critters.bounds = { x: [-8, 8], y: [1.8, 4.5], z: [f.z - 9, f.z + 4] }; this.critters.update(dt, t);
  }
}
