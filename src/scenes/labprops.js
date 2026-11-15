// THE EXPERIMENT HALL'S PAPER AND CLOTH (menu agent): the few hand-pixelled pieces of scenes/studies.js that have no
// real-model counterpart (the furniture and the instruments are converted Poly Haven models, scenes/labassets.js).
// Sharp low-poly with crisp pixel textures (nearest filtering), realistic lit (MeshStandard), flat facets.
//   books      one instanced mesh of books: 16 hand-pixelled spine designs (cloth and leather in many colours, raised
//              bands, tooled title labels with gilt lettering, fleurons, scuffed corners), cover boards and page edges
//   wallChart (star chart / orbits / optics), openBook (pages of pixel handwriting and a diagram), rug
import * as THREE from 'three';
import { tex, cbox, facet } from '../models/lowprops.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
function pix(w, h, draw, seed = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, mulberry32(seed)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = 8; return t; }
const P = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
const stdM = (o) => new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0, flatShading: true, ...o });
const MATS = new Map(); const smat = (kind, o = {}) => { const k = kind + JSON.stringify(o); if (!MATS.has(k)) MATS.set(k, stdM({ map: kind ? tex(kind) : null, ...o })); return MATS.get(k); };
export const LM = { walnut: () => smat('walnut', { roughness: 0.92 }), oak: () => smat('oak', { roughness: 0.92 }), brass: () => smat('brass', { metalness: 0.85, roughness: 0.35 }), iron: () => smat('iron', { metalness: 0.7, roughness: 0.5 }), bone: () => smat('bone', { roughness: 0.6 }), wax: () => smat('wax', { roughness: 0.55 }), parch: () => smat('parch', { roughness: 0.9 }) };
const put = (p, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo.index ? facet(geo, 3) : geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };

// ---------------------------------------------------------------- the book atlas: 16 spines x (spine 16 px | cover 4 px | pages 4 px), 96 px tall
const NV = 16, CWID = 24, AH = 96;
const BOOK_COLS = [['#3a0e0e', '#6a1c18', '#8e2c22', '#b04432'], ['#0e1a34', '#1c2e5a', '#2c4480', '#4462a4'], ['#0e2414', '#1c4224', '#2c5e34', '#467e4a'], ['#2a1608', '#4a2a12', '#6a401e', '#8a5a2e'],
  ['#24102a', '#40204a', '#5e3268', '#7e4a8a'], ['#3a2a0e', '#5e481c', '#80662a', '#a4883e'], ['#141414', '#262424', '#3a3634', '#54504a'], ['#3a1a0a', '#6e3412', '#9a4e1c', '#c0702e'],
  ['#0a2a2a', '#164848', '#226a66', '#3a8c86'], ['#2a0a1a', '#4e1430', '#702444', '#94385e'], ['#2e2a22', '#54503e', '#7a745a', '#a09a7c'], ['#1a1206', '#3a2a14', '#5a4222', '#7e5e34']];
let ATLAS = null;
function bookAtlas() {
  return (ATLAS ||= pix(NV * CWID, AH, (g, W, H, r) => {
    for (let v = 0; v < NV; v++) { const [d, m, l, hl] = BOOK_COLS[v % BOOK_COLS.length]; const x0 = v * CWID; const gold = v % 5 === 3 ? '#d8d0c0' : '#e8c460'; const goldD = '#8a6a1c';
      // the spine: rounded (lit left, shaded right), cloth / leather grain
      for (let y = 0; y < H; y++) for (let x = 0; x < 16; x++) { let c = x === 0 ? d : x < 3 ? hl : x < 5 ? l : x > 13 ? d : m; if (x > 4 && x < 13 && r() < 0.08) c = r() < 0.5 ? l : d; P(g, x0 + x, y, c); }
      // raised bands
      const nb = 2 + (v % 3); const bands = [6, 12, H - 14, H - 8, 44].slice(0, nb + 1);
      for (const by of bands) { for (let x = 1; x < 15; x++) { P(g, x0 + x, by, v % 2 ? gold : hl); P(g, x0 + x, by + 1, v % 2 ? goldD : d); } }
      // a tooled title label with gilt lettering (or the title gilt straight on the cloth)
      const ly = 18 + (v % 4) * 2, lh = 18 + (v % 3) * 4; const labCol = v % 4 === 0 ? '#1a0a08' : v % 4 === 1 ? '#6a1418' : v % 4 === 2 ? null : '#14301c';
      if (labCol) { for (let y = ly; y < ly + lh; y++) for (let x = 2; x < 14; x++) P(g, x0 + x, y, y === ly || y === ly + lh - 1 || x === 2 || x === 13 ? gold : labCol); }
      for (let row = 0; row < Math.floor((lh - 4) / 4); row++) { const yy = ly + 2 + row * 4; let x = 4; while (x < 12) { const w = 1 + Math.floor(r() * 3); if (x + w > 12) break; for (let k = 0; k < w; k++) { P(g, x0 + x + k, yy, gold); if (r() < 0.6) P(g, x0 + x + k, yy + 1, gold); if (r() < 0.3) P(g, x0 + x + k, yy + 2, goldD); } x += w + 1; } }
      // a fleuron near the foot, scuffs, the author's initials
      if (v % 3 !== 1) { const fy = H - 24; for (const [dx, dy] of [[0, -2], [-1, -1], [1, -1], [-2, 0], [0, 0], [2, 0], [-1, 1], [1, 1], [0, 2]]) P(g, x0 + 8 + dx, fy + dy, gold); }
      else for (let x = 4; x < 12; x++) if (r() < 0.7) P(g, x0 + x, H - 26, gold);
      for (let i = 0; i < 10; i++) { const y = r() < 0.5 ? Math.floor(r() * 4) : H - 1 - Math.floor(r() * 4); P(g, x0 + 1 + Math.floor(r() * 14), y, hl); }
      // the cover strip (the boards seen from the side) and the page edges
      for (let y = 0; y < H; y++) for (let x = 16; x < 20; x++) P(g, x0 + x, y, y < 2 || y > H - 3 || x === 16 ? d : (y + x) % 7 === 0 ? l : m);
      for (let y = 0; y < H; y++) for (let x = 20; x < 24; x++) P(g, x0 + x, y, y % 2 ? '#e8dcbc' : x === 23 ? '#b8a880' : '#f4ead0'); }
  }, 77));
}
function bookGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 1); const uv = g.attributes.uv; const cw = CWID / (NV * CWID); // faces: px nx py ny pz nz; +z is the spine
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; const u = uv.getX(i), v = uv.getY(i); const col = f === 4 ? u * 16 : f <= 1 ? 16.5 + u * 3 : 20.2 + u * 3.6; uv.setXY(i, (col / CWID) * cw, f <= 1 ? 0.04 + v * 0.92 : f >= 4 ? v : v); }
  g.translate(0, 0.5, 0); return g;
}
export class Books {
  constructor() { this.list = []; }
  add(m4, v, tint = 1) { this.list.push([m4, v, tint]); }
  build() {
    const mat = stdM({ map: bookAtlas(), roughness: 0.92 });
    mat.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float aVar;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vMapUv.x += aVar * ' + (1 / NV).toFixed(6) + ';'); };
    mat.customProgramCacheKey = () => 'labBooks';
    const n = Math.max(1, this.list.length); const im = new THREE.InstancedMesh(bookGeometry(), mat, n); const vars = new Float32Array(n); const c = new THREE.Color();
    this.list.forEach(([m, v, t], i) => { im.setMatrixAt(i, m); vars[i] = v; im.setColorAt(i, c.setScalar(t)); });
    im.geometry.setAttribute('aVar', new THREE.InstancedBufferAttribute(vars, 1)); im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.name = 'labBooks'; return im;
  }
}

// ---------------------------------------------------------------- curios
// pixel-art wall charts on parchment: the heavens, the orbits, the prism
const CHART = {
  stars(g, W, H, r) { g.fillStyle = '#16203a'; g.fillRect(4, 4, W - 8, H - 8); for (let i = 0; i < 70; i++) P(g, 5 + Math.floor(r() * (W - 10)), 5 + Math.floor(r() * (H - 10)), r() < 0.3 ? '#fff4c8' : '#8a9ac8'); g.strokeStyle = '#d8c070'; g.lineWidth = 1; const pts = [[12, 14], [20, 10], [28, 16], [26, 26], [36, 30], [44, 22]]; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + 0.5, y + 0.5) : g.moveTo(x + 0.5, y + 0.5))); g.stroke(); for (const [x, y] of pts) { P(g, x, y, '#fff8e0'); P(g, x - 1, y, '#d8c070'); P(g, x + 1, y, '#d8c070'); } g.strokeStyle = 'rgba(216,192,112,.5)'; g.beginPath(); g.arc(W / 2, H + 20, H * 0.9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); },
  orbits(g, W, H) { g.strokeStyle = '#5a3a22'; g.lineWidth = 1; for (const [rx, ry] of [[8, 5], [14, 9], [21, 13], [26, 17]]) { g.beginPath(); g.ellipse(W / 2 + 0.5, H / 2 + 0.5, rx, ry, 0, 0, TAU); g.stroke(); } g.fillStyle = '#d89a2a'; g.fillRect(W / 2 - 2, H / 2 - 2, 5, 5); g.fillStyle = '#fff0a0'; g.fillRect(W / 2 - 1, H / 2 - 1, 2, 2); for (const [x, y, c] of [[W / 2 + 8, H / 2, '#8a3a2a'], [W / 2 - 10, H / 2 - 6, '#2a5a8a'], [W / 2 + 14, H / 2 + 9, '#3a7a3a'], [W / 2 - 25, H / 2 + 6, '#9a7a3a']]) { g.fillStyle = c; g.fillRect(x - 1, y - 1, 3, 3); } },
  prism(g, W, H) { g.fillStyle = '#5a3a22'; g.beginPath(); g.moveTo(W / 2, H / 2 - 9); g.lineTo(W / 2 - 9, H / 2 + 7); g.lineTo(W / 2 + 9, H / 2 + 7); g.closePath(); g.fill(); g.fillStyle = '#ecdcb4'; g.beginPath(); g.moveTo(W / 2, H / 2 - 6); g.lineTo(W / 2 - 6, H / 2 + 5); g.lineTo(W / 2 + 6, H / 2 + 5); g.closePath(); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(4, H / 2, W / 2 - 8, 1); ['#c83a2a', '#e8902a', '#e8d03a', '#4aa04a', '#3a6ac8', '#7a4ac8'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.moveTo(W / 2 + 4, H / 2 + 0.5); g.lineTo(W - 5, H / 2 - 9 + i * 3.5); g.stroke(); }); },
};
export function wallChart(kind = 'stars', w = 0.9, h = 0.68) {
  const g = new THREE.Group(); const tw = 56, th = Math.round(56 * (h / w));
  const t = pix(tw, th, (x, W, H, r) => { x.fillStyle = '#e4d0a4'; x.fillRect(0, 0, W, H); for (let i = 0; i < W * H * 0.12; i++) P(x, Math.floor(r() * W), Math.floor(r() * H), r() < 0.5 ? '#d4bc8c' : '#eedcb4'); x.fillStyle = '#8a6a42'; x.fillRect(1, 1, W - 2, 1); x.fillRect(1, H - 2, W - 2, 1); x.fillRect(1, 1, 1, H - 2); x.fillRect(W - 2, 1, 1, H - 2); CHART[kind]?.(x, W, H, r); x.fillStyle = '#5a3a22'; for (let i = 6; i < W - 6; i++) if (r() < 0.55) x.fillRect(i, H - 5, 1, 1); }, kind.length * 13);
  put(g, cbox(w + 0.08, h + 0.08, 0.04, 0.01), LM.walnut()); const face = put(g, new THREE.PlaneGeometry(w, h), stdM({ map: t, roughness: 0.9 }), 0, 0, 0.022); face.castShadow = false; return g;
}
/** an open book: two pages of pixel handwriting (and a diagram on one), on cover boards, slightly V-shaped */
export function openBook(seed = 1, w = 0.34) {
  const g = new THREE.Group(); const r0 = mulberry32(seed);
  // a page at 64 x 88 texels: clean vellum (a light gutter shadow, no speckle), a ruled margin, lines of brown-ink
  // handwriting in word groups with ascenders, a red initial, and on the right page a drawn diagram of an orbit
  const page = (diagram, left) => pix(64, 88, (x, W, H, r) => {
    const V = ['#f6ead0', '#efe0c0', '#e4d2ac', '#d4bc90']; x.fillStyle = V[0]; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { x.fillStyle = V[i < 3 ? 1 : 2]; x.fillRect(left ? W - 1 - i : i, 0, 1, H); } x.fillStyle = V[3]; x.fillRect(left ? W - 1 : 0, 0, 1, H); // the gutter
    x.fillStyle = '#d8a8a0'; x.fillRect(left ? 6 : 10, 4, 1, H - 8); // the ruled margin
    const ink = ['#3a2416', '#5a3a24']; let y = 8; const x0 = left ? 9 : 13, x1 = left ? W - 10 : W - 6;
    if (!left) { x.fillStyle = '#8a1a1c'; x.fillRect(x0, y - 1, 5, 6); x.fillStyle = '#f6ead0'; x.fillRect(x0 + 2, y + 1, 1, 3); }
    for (; y < H - 6; y += 5) { if (diagram && y > 26 && y < 62) continue; let X = x0 + (!left && y < 14 ? 7 : 0); const end = x1 - (r() < 0.2 ? 10 + Math.floor(r() * 14) : 0);
      while (X < end) { const L = 2 + Math.floor(r() * 6); if (X + L > end) break; x.fillStyle = ink[r() < 0.8 ? 0 : 1]; x.fillRect(X, y, L, 1); for (let k = 0; k < L; k += 2) if (r() < 0.25) x.fillRect(X + k, y - 1, 1, 1); if (r() < 0.12) x.fillRect(X + 1, y - 2, 1, 2); X += L + 2; } }
    if (diagram) { const cx = W / 2 + 2, cy = 44; x.fillStyle = '#5a3a24'; for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU; x.fillRect(Math.round(cx + Math.cos(a) * 18), Math.round(cy + Math.sin(a) * 11), 1, 1); }
      for (let i = 0; i < 40; i += 2) { const a = (i / 40) * TAU; x.fillRect(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 6), 1, 1); }
      x.fillStyle = '#c8901c'; x.fillRect(cx - 1, cy - 1, 3, 3); x.fillStyle = '#8a1a1c'; x.fillRect(cx + 17, cy - 1, 3, 3); x.fillStyle = '#3a2416'; for (let k = 0; k < 6; k++) x.fillRect(cx + 1 + k * 3, cy, 2, 1); }
  }, seed * 7 + (diagram ? 1 : 0) + (left ? 3 : 0));
  const cov = smat('leather', { color: [0xc06050, 0x5070b0, 0x60a060][seed % 3], roughness: 0.9 });
  for (const s of [-1, 1]) { const half = new THREE.Group(); half.rotation.z = s * 0.1; g.add(half); put(half, cbox(w / 2 + 0.01, 0.012, w * 0.68 + 0.02, 0.003), cov, s * (w / 4 + 0.004), 0.006, 0); put(half, cbox(w / 2 - 0.006, 0.02, w * 0.68 - 0.01, 0.003), LM.parch(), s * (w / 4), 0.02, 0);
    const pg = put(half, new THREE.PlaneGeometry(w / 2 - 0.01, w * 0.68 - 0.014), stdM({ map: page(s > 0 && r0() < 0.8, s < 0), roughness: 0.95 }), s * (w / 4), 0.0345, 0, -Math.PI / 2); pg.castShadow = false; }
  return g;
}
export function rug(w = 3.6, d = 2.4) {
  const t = pix(72, 48, (x, W, H, r) => { const C = ['#2a2e44', '#3a4466', '#5a6488', '#a07a3a', '#c8a050', '#6a3a2a', '#e8d8b0']; x.fillStyle = C[1]; x.fillRect(0, 0, W, H); x.fillStyle = C[3]; x.fillRect(2, 2, W - 4, H - 4); x.fillStyle = C[0]; x.fillRect(4, 4, W - 8, H - 8); x.fillStyle = C[1]; x.fillRect(6, 6, W - 12, H - 12);
    for (let i = 4; i < W - 4; i += 4) { P(x, i, 3, C[4]); P(x, i + 2, H - 4, C[4]); } for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? C[2] : C[5]; x.fillRect(W / 2 - 14 + k, H / 2 - k, 28 - 2 * k, 2 * k + 1); } x.fillStyle = C[4]; x.fillRect(W / 2 - 2, H / 2 - 2, 5, 5); x.fillStyle = C[6]; x.fillRect(W / 2 - 1, H / 2 - 1, 3, 3);
    for (const [cx, cy] of [[12, 12], [W - 13, 12], [12, H - 13], [W - 13, H - 13]]) { x.fillStyle = C[4]; x.fillRect(cx - 3, cy - 1, 7, 3); x.fillRect(cx - 1, cy - 3, 3, 7); x.fillStyle = C[5]; x.fillRect(cx, cy, 1, 1); } for (let k = 0; k < 160; k++) P(x, 6 + Math.floor(r() * (W - 12)), 6 + Math.floor(r() * (H - 12)), r() < 0.5 ? C[0] : C[2]); }, 11);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), stdM({ map: t, roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.userData.noInk = true; return m;
}
