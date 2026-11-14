// Forged 3D lettering: a pixel font's glyph mask (Alagard 16 / 32 / 48, PixelSans 11 ...) extruded into solid letters.
// Every font pixel is a square of the letter's face; walls are built only where a filled pixel meets an empty one, so
// the letters are sharp, stepped and solid (real cast / forged / carved type, not a flat card). The face carries a
// hand-made pixel texture at one texel per font pixel: a metal or stone ramp (lit top rows, shaded bottom), a 1-texel
// pixel-art bevel (light on the up-left edges, dark on the down-right), hammer pitting, and an optional dilated dark
// backing plate (a thin ink outline that is physical, not drawn). Lit by the scene (MeshStandard), never glowing.
//   const T = forgedText('Lerfolese', { font: 'cap', unit: 0.05, style: 'gold' }); scene.add(T); T.userData.size -> [w, h]
import * as THREE from 'three';
import { runMask } from './craft.js';

export const STYLES = {
  gold: { ramp: ['#3a1a06', '#7a3e10', '#b46a20', '#e09a34', '#ffcf6a', '#fff0b8'], side: '#5a2e0c', back: '#120806', metal: 0.85, rough: 0.38, pit: 0.12 },
  bronze: { ramp: ['#2a140a', '#5a2e16', '#8a4e26', '#b8763a', '#dca060', '#f6d29a'], side: '#3e2010', back: '#0e0806', metal: 0.8, rough: 0.45, pit: 0.16 },
  stone: { ramp: ['#2a2622', '#4a443c', '#6c645a', '#8e8678', '#b2a998', '#d6cebc'], side: '#3a3530', back: '#141210', metal: 0, rough: 0.92, pit: 0.22 },
  ivory: { ramp: ['#4a3a2c', '#7a6650', '#a8927a', '#d0bea4', '#ece0c8', '#fffaec'], side: '#6a5640', back: '#1a120c', metal: 0, rough: 0.7, pit: 0.08 },
  silver: { ramp: ['#1c1e2a', '#3c4054', '#666c84', '#9aa0b4', '#cfd4e2', '#ffffff'], side: '#2c3040', back: '#0a0a12', metal: 0.9, rough: 0.32, pit: 0.1 },
  crystal: { ramp: ['#1a1036', '#3a2470', '#6a48b0', '#9a7ee0', '#cab8ff', '#f4eeff'], side: '#2a1a50', back: '#08060e', metal: 0.2, rough: 0.2, pit: 0.04 },
};
const hx = (c) => new THREE.Color(c);
const h2 = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };

/** the glyph mask as a dense grid: cells[y][x] (y = 0 at the top of the cap line) */
function grid(str, font, pad) {
  const m = runMask(str, font); const y0 = m.top ?? -m.by, y1 = m.bot ?? 0; const W = m.w + 2 + pad * 2, H = y1 - y0 + pad * 2;
  const on = (x, y) => m.on(x - pad, y + y0 - pad); let top = H, bot = 0; const cells = [];
  for (let y = 0; y < H; y++) { const row = new Uint8Array(W); for (let x = 0; x < W; x++) if (on(x, y)) { row[x] = 1; top = Math.min(top, y); bot = Math.max(bot, y); } cells.push(row); }
  return { cells: cells.slice(Math.max(0, top - pad), bot + pad + 1), W, H: bot - top + 1 + pad * 2 };
}
const dilate = (cells, W, H) => cells.map((row, y) => row.map((v, x) => { if (v) return 1; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (cells[y + dy]?.[x + dx]) return 1; return 0; }));

/** extrude a cell grid: front face (one quad per horizontal run) + side walls on filled / empty edges */
function extrudeCells(cells, W, H, unit, z0, z1) {
  const pos = [], nor = [], uv = [], idx = []; let gFront = 0;
  const quad = (a, b, c, d, n, uvs) => { const i = pos.length / 3; pos.push(...a, ...b, ...c, ...d); for (let k = 0; k < 4; k++) nor.push(...n); uv.push(...(uvs || [0, 0, 0, 0, 0, 0, 0, 0])); idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
  const X = (x) => (x - W / 2) * unit, Y = (y) => (H / 2 - y) * unit;
  for (let y = 0; y < H; y++) { let x = 0; while (x < W) { if (!cells[y][x]) { x++; continue; } let e = x; while (e < W && cells[y][e]) e++;
    quad([X(x), Y(y + 1), z1], [X(e), Y(y + 1), z1], [X(e), Y(y), z1], [X(x), Y(y), z1], [0, 0, 1], [x / W, 1 - (y + 1) / H, e / W, 1 - (y + 1) / H, e / W, 1 - y / H, x / W, 1 - y / H]); x = e; } }
  gFront = idx.length;
  const filled = (x, y) => y >= 0 && y < H && x >= 0 && x < W && cells[y][x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!cells[y][x]) continue; const v = (k) => [k, k, k, k, k, k, k, k];
    if (!filled(x, y - 1)) quad([X(x), Y(y), z1], [X(x + 1), Y(y), z1], [X(x + 1), Y(y), z0], [X(x), Y(y), z0], [0, 1, 0], v(0.9));
    if (!filled(x, y + 1)) quad([X(x), Y(y + 1), z0], [X(x + 1), Y(y + 1), z0], [X(x + 1), Y(y + 1), z1], [X(x), Y(y + 1), z1], [0, -1, 0], v(0.35));
    if (!filled(x - 1, y)) quad([X(x), Y(y + 1), z0], [X(x), Y(y + 1), z1], [X(x), Y(y), z1], [X(x), Y(y), z0], [-1, 0, 0], v(0.7));
    if (!filled(x + 1, y)) quad([X(x + 1), Y(y + 1), z1], [X(x + 1), Y(y + 1), z0], [X(x + 1), Y(y), z0], [X(x + 1), Y(y), z1], [1, 0, 0], v(0.5)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.addGroup(0, gFront, 0); g.addGroup(gFront, idx.length - gFront, 1); g.computeBoundingSphere(); return g;
}

/** the face texture: ramp by height (lit top), pixel bevel, pitting; a seam band at the x-height */
function faceTexture(cells, W, H, S, seed) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const R = S.ramp;
  let top = H, bot = 0; for (let y = 0; y < H; y++) if (cells[y].some(Boolean)) { top = Math.min(top, y); bot = Math.max(bot, y); } const span = Math.max(1, bot - top);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!cells[y][x]) continue; const u = (y - top) / span; let l = u < 0.18 ? 5 : u < 0.42 ? 4 : u < 0.7 ? 3 : u < 0.88 ? 2 : 1;
    const up = !cells[y - 1]?.[x], left = !cells[y][x - 1], down = !cells[y + 1]?.[x], right = !cells[y][x + 1];
    if (up || left) l = Math.min(5, l + 1); if (down || right) l = Math.max(0, l - 2); if (!(up || left || down || right) && h2(x + seed, y) < S.pit) l = Math.max(0, l - 1);
    g.fillStyle = R[l]; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/**
 * forgedText(str, opts) -> THREE.Group
 *   font: craft FONT key ('head' = Alagard 16, 'title' = 32, 'cap' = 48, 'body' = PixelSans 11 ...)
 *   unit: world size of one font pixel; depth: letter thickness in font pixels; style: STYLES key or object
 *   backing: dilated dark plate behind (a physical outline); glow: emissive lift (0..1) so it reads in the dark
 */
export function forgedText(str, { font = 'head', unit = 0.03, depth = 3, style = 'gold', backing = true, glow = 0.06, seed = 1 } = {}) {
  const S = typeof style === 'string' ? STYLES[style] || STYLES.gold : style; const G = new THREE.Group(); G.name = 'forged:' + str;
  const { cells, W, H } = grid(str, font, 1);
  const face = new THREE.MeshStandardMaterial({ map: faceTexture(cells, W, H, S, seed), metalness: S.metal, roughness: S.rough, emissive: hx(S.ramp[3]), emissiveIntensity: glow, emissiveMap: null });
  const side = new THREE.MeshStandardMaterial({ color: hx(S.side), metalness: S.metal * 0.8, roughness: Math.min(1, S.rough + 0.15), flatShading: true });
  const m = new THREE.Mesh(extrudeCells(cells, W, H, unit, 0, depth * unit), [face, side]); m.castShadow = true; m.receiveShadow = true; m.userData.noInk = true; G.add(m);
  if (backing) { const d = dilate(cells, W, H); const bm = new THREE.MeshStandardMaterial({ color: hx(S.back), roughness: 0.9, metalness: 0.2 }); const b = new THREE.Mesh(extrudeCells(d, W, H, unit, -unit * 0.6, depth * unit * 0.55), [bm, bm]); b.castShadow = true; b.userData.noInk = true; G.add(b); }
  G.userData.size = [W * unit, H * unit]; G.userData.face = face; G.userData.side = side; return G;
}
