// Library furniture and small props in the SHARP, VERY-LOW-POLY style: faceted forms (flat-shaded boxes, 4–8-sided
// lathes, low icosahedra) carried by detailed hand-pixelled textures (walnut grain, tufted oxblood leather, green
// banker's glass, veined marble, parchment, brass), realistic lit PBR materials and thin ink outlines from the engine.
// facet(profile, sides) · sbox(w, h, d, x, y, z, rx, ry, rz) · fuse(geos, mat, uvScale) · TEXM (materials) ·
// desk() · armchair() · bankerLamp() · candle(h) · openBook(w, seed) · scroll(L) · inkwell() · quill() · globe() ·
// armillary() · lantern() · ladder(L) · grandClock() · pedestal() · bellJar() · vitrine(w, h, d) · sideTable(h) ·
// bookStack(n, seed) · podium(r)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldUV } from './village.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
function pix(w, h, draw, seed = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, mulberry32(seed * 977 + w * 13 + h)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const put = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
// realistic lit materials (no cel bands): flat-shaded standard PBR carrying the pixel textures
export const stdM = (o = {}) => new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, flatShading: true, ...o });
const toonM = stdM;

// ---------------------------------------------------------------- geometry helpers
export function facet(profile, sides = 8, phase = 0) {
  let pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  { const poly = [new THREE.Vector2(0, pts[0].y), ...pts, new THREE.Vector2(0, pts[pts.length - 1].y)]; let A = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; A += p.x * q.y - q.x * p.y; } if (A < 0) pts = pts.reverse(); }
  const g = new THREE.LatheGeometry(pts, sides, phase).toNonIndexed(); g.computeVertexNormals(); return g;
}
export function sbox(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); return g; }
export const at = (g, x, y, z, rx = 0, ry = 0, rz = 0) => { const n = g.index ? g.toNonIndexed() : g.clone(); if (rx || ry || rz) n.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); n.translate(x, y, z); return n; };
/** merge flat pieces into one mesh; uvScale > 0 re-projects UVs in world units (uniform texel density) */
export function fuse(geos, mat, uvScale = 0) { const list = geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; }); const m = mergeGeometries(list, false); if (uvScale) worldUV(m, uvScale); const mesh = new THREE.Mesh(m, mat); mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// ---------------------------------------------------------------- pixel textures
const TX = {};
const tex = {
  walnut: () => pix(32, 32, (g, W, H, r) => { const P = ['#24160c', '#36220f', '#4a2e18', '#5c3a1e', '#704a28', '#8a5e34']; for (let x = 0; x < W; x++) { const ph = r() * 6; for (let y = 0; y < H; y++) { const v = Math.sin(x * 0.8 + Math.sin(y * 0.18 + ph) * 1.6) * 1.1 + Math.sin(x * 2.3 + y * 0.05) * 0.5; put(g, x, y, P[Math.max(1, Math.min(4, Math.round(2.6 + v)))]); } }
    for (let y = 0; y < H; y++) put(g, 0, y, P[0]); put(g, 16, 0, P[0], 1, H); for (let k = 0; k < 2; k++) { const cx = 4 + r() * 24, cy = 4 + r() * 24; put(g, cx - 1, cy - 2, P[1], 3, 5); put(g, cx, cy - 1, P[0], 1, 3); put(g, cx - 2, cy - 4, P[2], 1, 9); }
    for (let k = 0; k < 18; k++) put(g, (r() * W) | 0, (r() * H) | 0, P[5]); }),
  oak: () => pix(32, 32, (g, W, H, r) => { const P = ['#4a2e16', '#6a4422', '#82582e', '#9a6c3a', '#b4844a', '#ca9c5e']; for (let x = 0; x < W; x++) { const ph = r() * 6; for (let y = 0; y < H; y++) { const v = Math.sin(x * 0.7 + Math.sin(y * 0.15 + ph) * 1.4) * 1.1; put(g, x, y, P[Math.max(1, Math.min(4, Math.round(2.8 + v)))]); } } put(g, 0, 0, P[0], 1, H); put(g, 16, 0, P[0], 1, H); for (let k = 0; k < 16; k++) put(g, (r() * W) | 0, (r() * H) | 0, P[5]); }),
  leather: () => pix(32, 32, (g, W, H, r) => { const P = ['#2a0a08', '#4a140e', '#6a2216', '#86321e', '#a24a2a', '#c0683e']; // chesterfield tufting: buttons on a diamond grid, creases, puffed cushions
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = ((x + y) % 16) / 16, v = ((x - y + 64) % 16) / 16; const puff = Math.sin(u * Math.PI) * Math.sin(v * Math.PI); const lit = (u < 0.5 ? 0.3 : 0) + (v < 0.5 ? 0.3 : 0); put(g, x, y, P[Math.max(1, Math.min(5, Math.round(1.4 + puff * 2.4 + lit - (r() < 0.05 ? 1 : 0))))]); }
    for (let i = 0; i < W; i++) { put(g, i, (i) % H, P[1]); put(g, i, (H - 1 - i + 16) % H, P[1]); } for (const [x, y] of [[0, 0], [16, 0], [8, 8], [24, 8], [0, 16], [16, 16], [8, 24], [24, 24]]) { put(g, x - 1, y - 1, P[0], 3, 3); put(g, x - 1, y - 1, P[4]); } }),
  green: () => pix(16, 16, (g, W, H) => { const P = ['#0a2a16', '#145a2c', '#1e7a3c', '#36a058', '#8ae0a0', '#e0ffe8']; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, P[x < 2 || x > 13 ? 1 : x === 4 ? 4 : x === 5 ? 3 : y > 13 ? 1 : 2]); put(g, 4, 3, P[5], 1, 3); }),
  marble: () => pix(32, 32, (g, W, H, r) => { const P = ['#5e564e', '#7a7268', '#8e857a', '#a0968a', '#b4aa9c']; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, P[3 - (r() < 0.12 ? 1 : 0) + (r() < 0.08 ? 1 : 0)]); for (let k = 0; k < 3; k++) { let x = r() * W, y = 0; while (y < H) { put(g, x | 0, y | 0, P[k ? 1 : 0]); x += (r() - 0.45) * 2; y += 1; if (r() < 0.2) put(g, (x + 1) | 0, y | 0, P[2]); } } }),
  paper: () => pix(32, 32, (g, W, H, r) => { const P = ['#8a7a5a', '#cdbb94', '#e2d2ac', '#efe2c0', '#f8f0d8']; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, P[3 + (r() < 0.1 ? 1 : 0) - (r() < 0.12 ? 1 : 0)]); for (let y = 4; y < H - 3; y += 3) { let x = 3; while (x < W - 4) { const w = 2 + ((r() * 5) | 0); put(g, x, y, '#4a3a2a', Math.min(w, W - 4 - x), 1); x += w + 1; } } put(g, 3, 4, '#a8281e', 3, 4); }),
  pages: () => pix(32, 16, (g, W, H, r) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, (x + y * 3) % 7 === 0 ? '#d8c8a4' : y % 2 ? '#efe4c6' : '#e4d6b4'); }),
  cloth: () => pix(16, 16, (g, W, H, r) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, (x + y) % 4 === 0 ? '#1e4a2a' : (x * y) % 5 === 0 ? '#2e6a3a' : '#28583a'); for (let x = 0; x < W; x++) put(g, x, 0, '#c8a040'); }),
  brass: () => pix(16, 16, (g, W, H, r) => { const P = ['#4a3410', '#7a5a1e', '#a8822e', '#c8a040', '#e8c860', '#fff0a0']; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, P[2 + ((x + y * 2) % 7 === 0 ? 1 : 0) - (r() < 0.12 ? 1 : 0) + (y === 3 && x % 3 ? 2 : 0)]); for (let k = 0; k < 5; k++) put(g, (r() * W) | 0, (r() * H) | 0, P[0]); }),
  iron: () => pix(16, 16, (g, W, H, r) => { const P = ['#141418', '#24242a', '#34343c', '#4a4a54', '#6a6a76']; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, P[2 + (r() < 0.15 ? 1 : 0) - (r() < 0.15 ? 1 : 0)]); for (let k = 0; k < 6; k++) put(g, (r() * W) | 0, (r() * H) | 0, '#5a3a24'); }),
  clockFace: () => pix(32, 32, (g, W, H) => { put(g, 0, 0, '#3a2414', W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 15.5, y - 15.5); if (d < 14) put(g, x, y, d > 12.6 ? '#b88a2e' : d > 11.5 ? '#e8d8b0' : '#f4ead0'); }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; put(g, Math.round(15.5 + Math.sin(a) * 10 - 0.5), Math.round(15.5 - Math.cos(a) * 10 - 0.5), '#2a1a10', k % 3 ? 1 : 2, k % 3 ? 1 : 2); }
    for (let i = 0; i < 7; i++) put(g, 15, 15 - i, '#1a1010'); for (let i = 0; i < 5; i++) put(g, 15 + i, 15 + (i >> 1), '#1a1010'); put(g, 14, 14, '#c89a30', 3, 3); }),
};
const tx = (k) => (TX[k] ||= tex[k]());
const MATS = {};
export const TEXM = {
  get walnut() { return (MATS.walnut ||= toonM({ map: tx('walnut') })); },
  get oak() { return (MATS.oak ||= toonM({ map: tx('oak') })); },
  get leather() { return (MATS.leather ||= toonM({ map: tx('leather'), roughness: 0.62 })); },
  get glassGreen() { return (MATS.glassGreen ||= toonM({ map: tx('green'), emissive: C('#1a6a30'), emissiveIntensity: 0.6, roughness: 0.25 })); },
  get marble() { return (MATS.marble ||= toonM({ map: tx('marble'), roughness: 0.42 })); },
  get paper() { return (MATS.paper ||= toonM({ map: tx('paper'), side: THREE.DoubleSide })); },
  get pages() { return (MATS.pages ||= toonM({ map: tx('pages') })); },
  get baize() { return (MATS.baize ||= toonM({ map: tx('cloth') })); },
  get clockFace() { return (MATS.clockFace ||= toonM({ map: tx('clockFace') })); },
  get brass() { return (MATS.brass ||= stdM({ map: tx('brass'), metalness: 0.45, roughness: 0.42 })); },
  get iron() { return (MATS.iron ||= stdM({ map: tx('iron'), metalness: 0.6, roughness: 0.55 })); },
  get gold() { return (MATS.gold ||= stdM({ map: tx('brass'), color: C('#ffe08a'), metalness: 0.85, roughness: 0.28 })); },
  get flame() { return (MATS.flame ||= new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.55), toneMapped: false })); },
  get glow() { return (MATS.glow ||= new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.8), toneMapped: false })); },
  get glass() { return (MATS.glass ||= toonM({ color: C('#d8ecff'), transparent: true, opacity: 0.16, roughness: 0.08, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide })); },
  get stone() { return (MATS.stone ||= toonM({ map: tx('marble'), color: C('#c8b8a0'), roughness: 0.9 })); },
};
const flameMesh = (s = 1) => { const m = new THREE.Mesh(facet([[0.001, 0], [0.012 * s, 0.014 * s], [0.008 * s, 0.034 * s], [0.001, 0.052 * s]], 4), TEXM.flame); m.userData.noAO = true; m.userData.flame = true; return m; };

// ---------------------------------------------------------------- furniture
/** a pedestal writing desk: overhanging top with a baize writing inset, two drawer pedestals, brass pulls, plinth (front = +z) */
export function desk(w = 1.7, d = 0.85, h = 0.78) {
  const g = new THREE.Group(); const W = [], B = [];
  W.push(sbox(w, 0.05, d, 0, h - 0.025, 0), sbox(w - 0.06, 0.03, d - 0.06, 0, h - 0.065, 0));
  for (const s of [-1, 1]) { const x = s * (w / 2 - 0.3); W.push(sbox(0.52, h - 0.14, d - 0.12, x, (h - 0.08) / 2 + 0.03, 0), sbox(0.56, 0.06, d - 0.08, x, 0.03, 0));
    for (let i = 0; i < 3; i++) { const y = 0.16 + i * 0.19; W.push(sbox(0.44, 0.15, 0.02, x, y, (d - 0.12) / 2 + 0.01)); B.push(sbox(0.09, 0.018, 0.02, x, y + 0.02, (d - 0.12) / 2 + 0.03), sbox(0.03, 0.03, 0.012, x, y + 0.045, (d - 0.12) / 2 + 0.026)); } }
  W.push(sbox(w - 1.2, 0.1, 0.03, 0, h - 0.13, (d - 0.12) / 2), sbox(w - 0.2, 0.5, 0.03, 0, h - 0.4, -(d - 0.12) / 2 + 0.02));
  g.add(fuse(W, TEXM.walnut, 2.2), fuse(B, TEXM.brass)); const inset = fuse([sbox(w - 0.3, 0.006, d - 0.26, 0, h + 0.003, 0.02)], TEXM.baize); inset.material.map.repeat.set(4, 2); g.add(inset); return g;
}
/** a wing armchair in tufted oxblood leather on short square walnut legs (front = +z) */
export function armchair() {
  const g = new THREE.Group(); const L = [], Wd = [];
  L.push(sbox(0.62, 0.16, 0.62, 0, 0.42, 0.04), sbox(0.66, 0.2, 0.66, 0, 0.27, 0.02)); // cushion and seat box
  L.push(sbox(0.66, 0.78, 0.16, 0, 0.78, -0.3, -0.1)); // back
  for (const s of [-1, 1]) { L.push(sbox(0.14, 0.34, 0.7, s * 0.4, 0.42, 0.02)); L.push(at(facet([[0.0, -0.36], [0.09, -0.36], [0.1, 0.34], [0.0, 0.36]], 6), s * 0.4, 0.62, 0.02, Math.PI / 2, 0, 0)); // arm and its rolled top
    L.push(sbox(0.12, 0.62, 0.36, s * 0.38, 0.92, -0.18, -0.08, s * 0.32, 0)); }
  L.push(sbox(0.68, 0.12, 0.2, 0, 1.2, -0.36, -0.2));
  for (const s of [-1, 1]) for (const z of [-0.26, 0.3]) Wd.push(at(facet([[0.035, 0], [0.028, 0.1], [0.038, 0.17], [0.03, 0.18]], 4, Math.PI / 4), s * 0.36, 0, z));
  const lm = fuse(L, TEXM.leather, 3.2); g.add(lm, fuse(Wd, TEXM.walnut, 2)); return g;
}
/** a banker's lamp: octagonal brass foot, stem, a half-hexagon green glass shade glowing underneath (front = +z) */
export function bankerLamp() {
  const g = new THREE.Group(); g.add(fuse([facet([[0.001, 0], [0.11, 0], [0.11, 0.02], [0.07, 0.04], [0.02, 0.06], [0.018, 0.3], [0.001, 0.31]], 8)], TEXM.brass));
  const sh = new THREE.CylinderGeometry(0.07, 0.11, 0.3, 6, 1, false, -Math.PI / 2, Math.PI).toNonIndexed(); sh.computeVertexNormals(); sh.rotateZ(Math.PI / 2); sh.translate(0, 0.34, 0.03);
  const shade = new THREE.Mesh(sh, TEXM.glassGreen); shade.castShadow = true; g.add(shade);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.13), TEXM.glow); glow.rotation.x = Math.PI / 2; glow.position.set(0, 0.335, 0.03); glow.userData.noAO = true; glow.userData.noInk = true; g.add(glow);
  g.add(fuse([sbox(0.008, 0.08, 0.008, 0.06, 0.26, 0.06), sbox(0.016, 0.016, 0.016, 0.06, 0.22, 0.06)], TEXM.brass)); return g;
}
/** a brass chamberstick with a hexagonal wax candle and a flame */
export function candle(h = 0.16) {
  const g = new THREE.Group(); g.add(fuse([facet([[0.001, 0], [0.065, 0], [0.068, 0.012], [0.03, 0.022], [0.02, 0.05], [0.032, 0.058], [0.001, 0.062]], 8), sbox(0.012, 0.05, 0.05, 0.075, 0.03, 0)], TEXM.brass));
  g.add(fuse([facet([[0.001, 0.058], [0.021, 0.058], [0.021, 0.058 + h], [0.014, 0.064 + h], [0.001, 0.064 + h]], 6)], toonM({ color: C('#f2e8d0') })));
  const f = flameMesh(1); f.position.y = 0.066 + h; g.add(f); g.userData.flame = f; return g;
}
/** an open book: two tilted covers and page blocks, ink-lined pixel pages */
export function openBook(w = 0.42, seed = 1) {
  const g = new THREE.Group(); const cover = toonM({ color: C(['#6a2a24', '#2a3a6a', '#2e5a34', '#5a3a6a'][seed % 4]) });
  for (const s of [-1, 1]) { g.add(fuse([sbox(w / 2, 0.012, w * 0.7, s * w / 4, 0.006, 0, 0, 0, -s * 0.07)], cover)); g.add(fuse([sbox(w / 2 - 0.012, 0.024, w * 0.66, s * (w / 4 - 0.004), 0.024, 0, 0, 0, -s * 0.07)], TEXM.pages)); }
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w / 2 - 0.016, w * 0.64), TEXM.paper); p.rotation.set(-Math.PI / 2, -s * 0.07, 0); p.position.set(s * (w / 4 - 0.004), 0.037 + 0.002, 0); p.material = TEXM.paper; g.add(p); }
  return g;
}
export function scroll(L = 0.6) { const g = new THREE.Group(); g.add(fuse([at(facet([[0.04, -L / 2], [0.042, -L / 2 + 0.01], [0.042, L / 2 - 0.01], [0.04, L / 2]], 6), 0, 0, 0, 0, 0, Math.PI / 2)], TEXM.paper)); g.add(fuse([-1, 1].map((s) => at(facet([[0.001, 0], [0.018, 0], [0.024, 0.02], [0.012, 0.05], [0.001, 0.055]], 6), s * L / 2, 0, 0, 0, 0, -s * Math.PI / 2)), TEXM.walnut)); g.add(fuse([sbox(0.02, 0.088, 0.088, 0.05, 0, 0)], toonM({ color: C('#a8281e') }))); return g; }
export function inkwell() { const g = new THREE.Group(); g.add(fuse([facet([[0.001, 0], [0.042, 0], [0.046, 0.04], [0.022, 0.058], [0.024, 0.07], [0.001, 0.07]], 6)], toonM({ color: C('#1c2238') }))); g.add(fuse([facet([[0.001, 0.07], [0.026, 0.07], [0.026, 0.078], [0.001, 0.08]], 6)], TEXM.brass)); return g; }
/** a goose quill: a jagged two-sided vane on a thin shaft */
export function quill() { const sh = new THREE.Shape(); sh.moveTo(0, 0); const pts = [[0.012, 0.06], [0.022, 0.12], [0.018, 0.16], [0.026, 0.2], [0.016, 0.24], [0.006, 0.28], [0, 0.29], [-0.01, 0.25], [-0.016, 0.2], [-0.012, 0.16], [-0.016, 0.1], [-0.006, 0.05]]; for (const [x, y] of pts) sh.lineTo(x, y); sh.lineTo(0, 0);
  const g = new THREE.Group(); const v = new THREE.Mesh(new THREE.ShapeGeometry(sh), toonM({ color: C('#f4f0e6'), side: THREE.DoubleSide })); v.position.y = 0.03; g.add(v); g.add(fuse([sbox(0.004, 0.32, 0.004, 0, 0.16, 0.002)], toonM({ color: C('#d8ccb0') }))); return g; }
/** a terrestrial globe: a faceted ball with a pixel map, a brass meridian, a hexagonal turned stand on tripod legs */
export function globe() {
  const g = new THREE.Group(); const map = pix(64, 32, (x, W, H, r) => { put(x, 0, 0, '#2a5a8a', W, H); for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if ((xx + yy * 3) % 11 === 0) put(x, xx, yy, '#3a6a9a'); const land = ['#c8b070', '#a89050', '#7a9a4a']; for (let i = 0; i < 9; i++) { const cx = r() * W, cy = 6 + r() * 20; for (let k = 0; k < 34; k++) put(x, cx + (r() - 0.5) * 12, cy + (r() - 0.5) * 7, land[(r() * 3) | 0], 2, 2); } for (let i = 0; i < W; i += 8) put(x, i, 0, '#e8dcb0', 1, H); put(x, 0, 16, '#e8dcb0', W, 1); }, 5);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2).toNonIndexed(), toonM({ map })); ball.geometry.computeVertexNormals(); ball.position.y = 0.62; ball.rotation.z = 0.4; ball.castShadow = true; g.add(ball); g.userData.spin = ball;
  const mer = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.012, 3, 14, Math.PI * 1.3).toNonIndexed(), TEXM.brass); mer.geometry.computeVertexNormals(); mer.position.y = 0.62; mer.rotation.set(0, Math.PI / 2, 0.4 - Math.PI * 0.15); g.add(mer);
  const W = [facet([[0.001, 0.38], [0.06, 0.38], [0.03, 0.42], [0.022, 0.44], [0.001, 0.44]], 6), facet([[0.04, 0.0], [0.05, 0.12], [0.03, 0.3], [0.05, 0.36], [0.001, 0.4]], 6)];
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; W.push(sbox(0.035, 0.035, 0.3, Math.sin(a) * 0.14, 0.05, Math.cos(a) * 0.14, 0.4, a, 0)); }
  g.add(fuse(W, TEXM.walnut, 2)); return g;
}
/** an armillary sphere: faceted brass rings round a glowing sun, on a hexagonal pillar stand */
export function armillary() {
  const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const t = new THREE.TorusGeometry(0.42 - i * 0.04, 0.016, 3, 18).toNonIndexed(); t.computeVertexNormals(); const r = new THREE.Mesh(t, TEXM.brass); r.position.y = 1.15; r.rotation.set(i === 0 ? Math.PI / 2 : 0.5 * i, i * 0.8, 0.2 * i); r.castShadow = true; g.add(r); g.userData['r' + i] = r; }
  const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), TEXM.glow); sun.position.y = 1.15; sun.userData.noAO = true; g.add(sun);
  g.add(fuse([facet([[0.001, 0], [0.3, 0], [0.3, 0.05], [0.2, 0.1], [0.06, 0.2], [0.05, 0.6], [0.08, 0.66], [0.04, 0.72], [0.035, 0.74], [0.001, 0.74]], 8)], TEXM.walnut)); return g;
}
/** a hanging hexagonal brass lantern on a chain; glowing glass panes behind six bars */
export function lantern(chain = 4) {
  const g = new THREE.Group(); const B = [];
  for (let k = 0; k < chain; k++) B.push(sbox(0.012, 0.06, 0.03, 0, -0.04 - k * 0.065, 0, 0, k * Math.PI / 2, 0));
  B.push(facet([[0.001, -0.24], [0.03, -0.24], [0.09, -0.3], [0.14, -0.34], [0.12, -0.36], [0.001, -0.36]], 6), facet([[0.001, -0.54], [0.13, -0.54], [0.15, -0.57], [0.08, -0.61], [0.02, -0.64], [0.001, -0.66]], 6));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; B.push(sbox(0.018, 0.2, 0.018, Math.sin(a) * 0.115, -0.45, Math.cos(a) * 0.115)); }
  g.add(fuse(B, TEXM.brass)); const gl = new THREE.Mesh(facet([[0.001, -0.54], [0.1, -0.54], [0.1, -0.36], [0.001, -0.36]], 6), TEXM.glow); gl.userData.noAO = true; g.add(gl); return g;
}
/** a library ladder: two rails, rungs, brass hooks at the top, octagonal wheels at the foot (along local +z, rungs across x) */
export function ladder(L) { const W = []; for (const s of [-1, 1]) W.push(sbox(0.06, 0.07, L, s * 0.24, 0, L / 2)); for (let i = 1; i < 10; i++) W.push(sbox(0.48, 0.035, 0.05, 0, 0.0, (i / 10) * L));
  const g = new THREE.Group(); g.add(fuse(W, TEXM.oak, 2.4)); g.add(fuse([-1, 1].flatMap((s) => [at(facet([[0.001, -0.012], [0.05, -0.012], [0.05, 0.012], [0.001, 0.012]], 8), s * 0.24, -0.05, 0.03, 0, 0, Math.PI / 2), sbox(0.03, 0.12, 0.03, s * 0.24, -0.06, L - 0.02)]), TEXM.brass)); return g; }
/** a longcase clock: plinth, trunk with a pendulum window, hood with a pixel dial and a broken pediment */
export function grandClock() {
  const g = new THREE.Group(); const W = [sbox(0.56, 0.3, 0.36, 0, 0.15, 0), sbox(0.6, 0.04, 0.4, 0, 0.32, 0), sbox(0.42, 1.0, 0.28, 0, 0.84, 0), sbox(0.56, 0.04, 0.36, 0, 1.36, 0), sbox(0.52, 0.5, 0.34, 0, 1.62, 0), sbox(0.6, 0.06, 0.38, 0, 1.9, 0)];
  for (const s of [-1, 1]) W.push(sbox(0.3, 0.06, 0.38, s * 0.16, 2.0, 0, 0, 0, -s * 0.45), sbox(0.05, 0.46, 0.05, s * 0.23, 1.62, 0.17));
  g.add(fuse(W, TEXM.walnut, 2.4)); const face = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.38), TEXM.clockFace); face.position.set(0, 1.62, 0.172); g.add(face);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.5), toonM({ color: C('#1a120c') })); win.position.set(0, 0.86, 0.142); g.add(win);
  const pend = new THREE.Group(); pend.position.set(0, 1.08, 0.146); g.add(pend); pend.add(fuse([sbox(0.01, 0.36, 0.006, 0, -0.18, 0), at(facet([[0.001, -0.008], [0.05, -0.008], [0.05, 0.008], [0.001, 0.008]], 8), 0, -0.38, 0, Math.PI / 2, 0, 0)], TEXM.brass)); g.userData.pend = pend; return g;
}
/** an octagonal marble plinth with a stepped base and cornice (top at 1.08) */
export function pedestal() { return fuse([facet([[0.001, 0], [0.42, 0], [0.42, 0.08], [0.36, 0.12], [0.3, 0.18], [0.27, 0.3], [0.25, 0.86], [0.29, 0.92], [0.36, 0.98], [0.4, 1.02], [0.4, 1.08], [0.001, 1.08]], 8, Math.PI / 8)], TEXM.marble); }
/** a faceted glass bell on a brass collar */
export function bellJar() { const g = new THREE.Group(); g.add(new THREE.Mesh(facet([[0.36, 0], [0.36, 0.62], [0.3, 0.74], [0.16, 0.8], [0.04, 0.82], [0.001, 0.82]], 8, Math.PI / 8), TEXM.glass)); g.add(fuse([facet([[0.35, -0.01], [0.4, -0.01], [0.41, 0.02], [0.39, 0.05], [0.35, 0.05]], 8, Math.PI / 8), facet([[0.001, 0.8], [0.04, 0.81], [0.05, 0.84], [0.02, 0.87], [0.03, 0.9], [0.001, 0.93]], 6)], TEXM.brass)); return g; }
/** a glass display case: brass frame bars and glass panes on a walnut base (sits on its base at y=0) */
export function vitrine(w = 0.7, h = 0.6, d = 0.6) { const g = new THREE.Group(); g.add(fuse([sbox(w + 0.06, 0.06, d + 0.06, 0, 0.03, 0)], TEXM.walnut, 2.2)); const B = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.push(sbox(0.025, h, 0.025, sx * w / 2, 0.06 + h / 2, sz * d / 2)); for (const y of [0.06, 0.06 + h]) { B.push(sbox(w, 0.025, 0.025, 0, y, d / 2), sbox(w, 0.025, 0.025, 0, y, -d / 2), sbox(0.025, 0.025, d, w / 2, y, 0), sbox(0.025, 0.025, d, -w / 2, y, 0)); }
  g.add(fuse(B, TEXM.brass)); const gl = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), TEXM.glass); gl.position.y = 0.06 + h / 2; g.add(gl); return g; }
export function sideTable(h = 0.54, r = 0.27) { return fuse([facet([[0.001, 0], [r * 0.9, 0], [r * 0.96, 0.04], [r * 0.6, 0.08], [r * 0.3, 0.14], [r * 0.26, h - 0.12], [r * 0.44, h - 0.08], [r, h - 0.04], [r, h], [0.001, h]], 8, Math.PI / 8)], TEXM.walnut); }
export function podium(r = 0.84, h = 0.18) { return fuse([facet([[0.001, 0], [r, 0], [r + 0.03, 0.04], [r + 0.01, 0.1], [r - 0.03, 0.13], [r, h], [0.001, h]], 10, Math.PI / 10)], TEXM.walnut); }
/** a stack of closed books, alternately turned */
export function bookStack(n = 4, seed = 1) { const r = mulberry32(seed); const g = new THREE.Group(); let y = 0; const cols = ['#6a2a24', '#2a3a6a', '#4a5a2a', '#6a4a22', '#4a2a5a', '#7a5a2a'];
  for (let i = 0; i < n; i++) { const th = 0.045 + r() * 0.03, w = 0.3 - i * 0.015 + r() * 0.03, d = 0.22 + r() * 0.03; const b = new THREE.Group(); b.position.y = y; b.rotation.y = (r() - 0.5) * 0.5; g.add(b);
    b.add(fuse([sbox(w, th, d, 0, th / 2, 0)], toonM({ color: C(cols[(i + seed) % cols.length]) }))); b.add(fuse([sbox(w - 0.02, th - 0.012, 0.004, 0, th / 2, d / 2 + 0.001), sbox(0.004, th - 0.012, d - 0.02, w / 2 + 0.001, th / 2, 0)], TEXM.pages)); y += th; }
  g.userData.top = y; return g; }

/** realistic pixel material by kind (walnut, oak, brass, gold, iron, leather, marble, stone) */
export const pmat = (kind) => TEXM[kind] || TEXM.walnut;
