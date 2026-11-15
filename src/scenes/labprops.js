// THE EXPERIMENT HALL'S DRESSING (menu agent): detailed, hand-pixelled props for scenes/studies.js, in the game's
// sharp low-poly style with crisp pixel textures (nearest filtering), realistic lit (MeshStandard), flat facets.
//   books      one instanced mesh of books: 16 hand-pixelled spine designs (cloth and leather in many colours, raised
//              bands, tooled title labels with gilt lettering, fleurons, scuffed corners), cover boards and page edges
//   bookcase   a tall walnut case with cornice and plinth, shelves packed with upright, leaning and stacked books, and
//              curios in the gaps (skulls, specimen jars, drip candles, scrolls); returns its shelf tops (for the worms)
//   skull, specimenJar, dripCandle, wallChart (star chart / anatomy of a bookworm / orbits / optics), cobweb,
//   openBook (pages of pixel handwriting and diagrams), hollowBook (a book with a worm-hole), lectern, rug, plankMat
import * as THREE from 'three';
import { tex, lathe, tube, cbox, facet, gem } from '../models/lowprops.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
function pix(w, h, draw, seed = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, mulberry32(seed)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = 8; return t; }
const P = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
const stdM = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, flatShading: true, ...o });
const MATS = new Map(); const smat = (kind, o = {}) => { const k = kind + JSON.stringify(o); if (!MATS.has(k)) MATS.set(k, stdM({ map: kind ? tex(kind) : null, ...o })); return MATS.get(k); };
export const LM = { walnut: () => smat('walnut', { roughness: 0.7 }), oak: () => smat('oak', { roughness: 0.7 }), brass: () => smat('brass', { metalness: 0.85, roughness: 0.35 }), iron: () => smat('iron', { metalness: 0.7, roughness: 0.5 }), bone: () => smat('bone', { roughness: 0.6 }), wax: () => smat('wax', { roughness: 0.55 }), parch: () => smat('parch', { roughness: 0.9 }) };
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
    const mat = stdM({ map: bookAtlas(), roughness: 0.72 });
    mat.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float aVar;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vMapUv.x += aVar * ' + (1 / NV).toFixed(6) + ';'); };
    mat.customProgramCacheKey = () => 'labBooks';
    const n = Math.max(1, this.list.length); const im = new THREE.InstancedMesh(bookGeometry(), mat, n); const vars = new Float32Array(n); const c = new THREE.Color();
    this.list.forEach(([m, v, t], i) => { im.setMatrixAt(i, m); vars[i] = v; im.setColorAt(i, c.setScalar(t)); });
    im.geometry.setAttribute('aVar', new THREE.InstancedBufferAttribute(vars, 1)); im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.name = 'labBooks'; return im;
  }
}

// ---------------------------------------------------------------- curios
export function skull(s = 1) {
  const g = new THREE.Group(); const bone = LM.bone(); const dark = stdM({ color: 0x1a0e08, roughness: 1 });
  const cran = gem(0.075, 1, 3, 0.12); cran.scale(1, 0.9, 1.15); put(g, cran, bone, 0, 0.085, 0);
  put(g, cbox(0.085, 0.05, 0.08, 0.012), bone, 0, 0.035, 0.03); put(g, cbox(0.07, 0.022, 0.06, 0.008), bone, 0, 0.012, 0.045); // cheeks, jaw
  for (const x of [-0.026, 0.026]) put(g, new THREE.OctahedronGeometry(0.019, 0), dark, x, 0.07, 0.082); put(g, new THREE.TetrahedronGeometry(0.012, 0), dark, 0, 0.045, 0.09, 0.6, 0.3, 0);
  for (let i = -2; i <= 2; i++) put(g, cbox(0.009, 0.012, 0.006, 0.002), bone, i * 0.011, 0.028, 0.087);
  g.scale.setScalar(s); return g;
}
export function specimenJar(kind = 0, h = 0.26) {
  const g = new THREE.Group(); const r = 0.075; const fluid = [0x6a9a3a, 0xa8a04a, 0x4a8a8a][kind % 3];
  const gl = put(g, lathe([[0.0005, 0], [r, 0], [r + 0.004, 0.01], [r + 0.004, h - 0.03], [r - 0.012, h - 0.012], [0.0005, h - 0.012]], 8), new THREE.MeshStandardMaterial({ color: 0xd8ecf0, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false, flatShading: true, envMapIntensity: 2 })); gl.castShadow = false; gl.renderOrder = 3;
  const fl = put(g, lathe([[0.0005, 0.006], [r - 0.004, 0.006], [r - 0.004, h - 0.06], [0.0005, h - 0.06]], 8), new THREE.MeshStandardMaterial({ color: fluid, transparent: true, opacity: 0.55, roughness: 0.2, emissive: fluid, emissiveIntensity: 0.12, flatShading: true, depthWrite: false })); fl.castShadow = false; fl.renderOrder = 2;
  // the specimen: a coiled worm, a little seahorse-like thing, or a curled frog leg
  const fleshy = stdM({ color: [0xc8907a, 0xb8a868, 0x8ab070][kind % 3], roughness: 0.5 });
  if (kind % 3 === 0) { const pts = []; for (let i = 0; i < 14; i++) { const a = i * 0.7; pts.push([Math.cos(a) * 0.035 * (1 - i / 20), 0.04 + i * 0.009, Math.sin(a) * 0.035 * (1 - i / 20)]); } put(g, tube(pts, 0.011, { seg: 20, rad: 5 }), fleshy); }
  else if (kind % 3 === 1) put(g, tube([[0, 0.05, 0], [0.02, 0.09, 0.0], [0.0, 0.13, 0.01], [-0.02, 0.15, 0], [0.0, 0.17, 0]], 0.014, { seg: 10, rad: 5, taper: (u) => 0.5 + u * 0.7 }), fleshy);
  else { put(g, tube([[-0.03, 0.04, 0], [0.0, 0.1, 0.01], [0.03, 0.06, 0], [0.04, 0.12, 0]], 0.012, { seg: 10, rad: 5 }), fleshy); }
  put(g, lathe([[0.0005, 0], [r - 0.006, 0], [r - 0.004, 0.024], [0.0005, 0.03]], 8), kind % 2 ? LM.brass() : smat('oak'), 0, h - 0.016, 0); // the lid
  const lab = put(g, new THREE.PlaneGeometry(0.06, 0.04), stdM({ map: pix(12, 8, (x, W, H, rr) => { x.fillStyle = '#ecdcb4'; x.fillRect(0, 0, W, H); x.fillStyle = '#5a3a22'; for (let i = 1; i < W - 1; i++) { if (rr() < 0.6) x.fillRect(i, 2, 1, 1); if (rr() < 0.5) x.fillRect(i, 5, 1, 1); } x.fillStyle = '#8a6a42'; x.fillRect(0, 0, W, 1); x.fillRect(0, H - 1, W, 1); }, kind + 3) }), 0, h * 0.42, r + 0.006); lab.castShadow = false;
  return g;
}
export function dripCandle(h = 0.18, { light = false } = {}) {
  const g = new THREE.Group(); const wax = LM.wax(); const r = 0.024;
  put(g, lathe([[0.0005, 0], [0.06, 0], [0.065, 0.012], [0.03, 0.02], [0.012, 0.03], [0.0005, 0.032]], 8), LM.brass()); // the brass dish
  put(g, lathe([[0.0005, 0.03], [r, 0.03], [r, h - 0.01], [r * 0.7, h], [0.0005, h - 0.004]], 7), wax);
  const rr = mulberry32(Math.round(h * 1000)); for (let i = 0; i < 4; i++) { const a = rr() * TAU; const L = 0.03 + rr() * (h * 0.5); put(g, tube([[Math.cos(a) * r, h - 0.006, Math.sin(a) * r], [Math.cos(a) * (r + 0.004), h - L * 0.5, Math.sin(a) * (r + 0.004)], [Math.cos(a) * (r + 0.002), h - L, Math.sin(a) * (r + 0.002)]], 0.006, { seg: 5, rad: 4, taper: (u) => 1 - u * 0.5 }), wax); }
  put(g, lathe([[0.0005, 0], [0.04, 0], [0.034, 0.006], [0.0005, 0.007]], 7), wax, 0, 0.03, 0); // the pool at its foot
  put(g, cbox(0.003, 0.014, 0.003, 0.001), stdM({ color: 0x1a1008 }), 0, h + 0.004, 0);
  const fl = new THREE.Mesh(lathe([[0.0005, 0], [0.008, 0.01], [0.006, 0.026], [0.0005, 0.04]], 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.55), toneMapped: false })); fl.position.y = h + 0.008; fl.userData.noInk = true; fl.userData.flame = true; g.add(fl); g.userData.flame = fl;
  if (light) { const L = new THREE.PointLight(0xffb870, 1.2, 2.2, 1.8); L.position.y = h + 0.05; g.add(L); g.userData.light = L; }
  return g;
}
// pixel-art wall charts on parchment: the heavens, a bookworm's anatomy, the orbits, the prism
const CHART = {
  stars(g, W, H, r) { g.fillStyle = '#16203a'; g.fillRect(4, 4, W - 8, H - 8); for (let i = 0; i < 70; i++) P(g, 5 + Math.floor(r() * (W - 10)), 5 + Math.floor(r() * (H - 10)), r() < 0.3 ? '#fff4c8' : '#8a9ac8'); g.strokeStyle = '#d8c070'; g.lineWidth = 1; const pts = [[12, 14], [20, 10], [28, 16], [26, 26], [36, 30], [44, 22]]; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + 0.5, y + 0.5) : g.moveTo(x + 0.5, y + 0.5))); g.stroke(); for (const [x, y] of pts) { P(g, x, y, '#fff8e0'); P(g, x - 1, y, '#d8c070'); P(g, x + 1, y, '#d8c070'); } g.strokeStyle = 'rgba(216,192,112,.5)'; g.beginPath(); g.arc(W / 2, H + 20, H * 0.9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); },
  worm(g, W, H, r) { const C = ['#c8907a', '#a8645a', '#7a3a34']; for (let i = 0; i < 26; i++) { const x = 8 + i * 1.6, y = H / 2 + Math.sin(i * 0.35) * 8; for (let k = -3; k <= 3; k++) P(g, Math.round(x), Math.round(y + k), Math.abs(k) === 3 ? '#3a2014' : i % 2 ? C[1] : C[0]); } g.fillStyle = '#5a2a2a'; g.fillRect(28, H / 2 - 10, 8, 3); g.fillStyle = '#3a2014'; for (let i = 0; i < 5; i++) { g.fillRect(8 + i * 9, H - 10, 6, 1); g.fillRect(10 + i * 9, 8, 4, 1); } for (const x of [14, 26, 40]) g.fillRect(x, 13, 1, H / 2 - 18); },
  orbits(g, W, H) { g.strokeStyle = '#5a3a22'; g.lineWidth = 1; for (const [rx, ry] of [[8, 5], [14, 9], [21, 13], [26, 17]]) { g.beginPath(); g.ellipse(W / 2 + 0.5, H / 2 + 0.5, rx, ry, 0, 0, TAU); g.stroke(); } g.fillStyle = '#d89a2a'; g.fillRect(W / 2 - 2, H / 2 - 2, 5, 5); g.fillStyle = '#fff0a0'; g.fillRect(W / 2 - 1, H / 2 - 1, 2, 2); for (const [x, y, c] of [[W / 2 + 8, H / 2, '#8a3a2a'], [W / 2 - 10, H / 2 - 6, '#2a5a8a'], [W / 2 + 14, H / 2 + 9, '#3a7a3a'], [W / 2 - 25, H / 2 + 6, '#9a7a3a']]) { g.fillStyle = c; g.fillRect(x - 1, y - 1, 3, 3); } },
  prism(g, W, H) { g.fillStyle = '#5a3a22'; g.beginPath(); g.moveTo(W / 2, H / 2 - 9); g.lineTo(W / 2 - 9, H / 2 + 7); g.lineTo(W / 2 + 9, H / 2 + 7); g.closePath(); g.fill(); g.fillStyle = '#ecdcb4'; g.beginPath(); g.moveTo(W / 2, H / 2 - 6); g.lineTo(W / 2 - 6, H / 2 + 5); g.lineTo(W / 2 + 6, H / 2 + 5); g.closePath(); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(4, H / 2, W / 2 - 8, 1); ['#c83a2a', '#e8902a', '#e8d03a', '#4aa04a', '#3a6ac8', '#7a4ac8'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.moveTo(W / 2 + 4, H / 2 + 0.5); g.lineTo(W - 5, H / 2 - 9 + i * 3.5); g.stroke(); }); },
};
export function wallChart(kind = 'stars', w = 0.9, h = 0.68) {
  const g = new THREE.Group(); const tw = 56, th = Math.round(56 * (h / w));
  const t = pix(tw, th, (x, W, H, r) => { x.fillStyle = '#e4d0a4'; x.fillRect(0, 0, W, H); for (let i = 0; i < W * H * 0.12; i++) P(x, Math.floor(r() * W), Math.floor(r() * H), r() < 0.5 ? '#d4bc8c' : '#eedcb4'); x.fillStyle = '#8a6a42'; x.fillRect(1, 1, W - 2, 1); x.fillRect(1, H - 2, W - 2, 1); x.fillRect(1, 1, 1, H - 2); x.fillRect(W - 2, 1, 1, H - 2); CHART[kind]?.(x, W, H, r); x.fillStyle = '#5a3a22'; for (let i = 6; i < W - 6; i++) if (r() < 0.55) x.fillRect(i, H - 5, 1, 1); }, kind.length * 13);
  put(g, cbox(w + 0.08, h + 0.08, 0.04, 0.01), LM.walnut()); const face = put(g, new THREE.PlaneGeometry(w, h), stdM({ map: t, roughness: 0.9 }), 0, 0, 0.022); face.castShadow = false; return g;
}
export function cobweb(s = 0.7) {
  const t = pix(32, 32, (g, W, H) => { g.clearRect(0, 0, W, H); const c = 'rgba(230,226,220,0.55)'; for (let k = 0; k < 7; k++) { const a = (k / 6) * (Math.PI / 2); for (let r = 0; r < 31; r++) P(g, Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r), c); } for (const R of [6, 11, 17, 23, 29]) for (let k = 0; k < 6; k++) { const a0 = (k / 6) * (Math.PI / 2), a1 = ((k + 1) / 6) * (Math.PI / 2); for (let u = 0; u <= 8; u++) { const a = a0 + (a1 - a0) * (u / 8); const rr = R - Math.sin((u / 8) * Math.PI) * 1.6; P(g, Math.round(Math.cos(a) * rr), Math.round(Math.sin(a) * rr), c); } } }, 5);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.85 })); m.geometry.translate(s / 2, -s / 2, 0); m.userData.noInk = true; m.userData.noAO = true; m.scale.y = -1; return m;
}
/** an open book: two pages of pixel handwriting (and a diagram on one), on cover boards, slightly V-shaped */
export function openBook(seed = 1, w = 0.34) {
  const g = new THREE.Group(); const r0 = mulberry32(seed);
  const page = (diagram) => pix(32, 44, (x, W, H, r) => { x.fillStyle = '#f2e6c8'; x.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) P(x, Math.floor(r() * W), Math.floor(r() * H), '#e4d4ac'); x.fillStyle = '#3a2618'; for (let y = 4; y < H - 3; y += 3) { if (diagram && y > 10 && y < 26) continue; let X = 3; while (X < W - 3) { const L = 1 + Math.floor(r() * 4); if (X + L > W - 3) break; x.fillRect(X, y, L, 1); X += L + 1; } }
    if (diagram) { x.strokeStyle = '#7a2a22'; x.lineWidth = 1; x.beginPath(); x.arc(W / 2 + 0.5, 18.5, 6, 0, TAU); x.stroke(); x.fillStyle = '#7a2a22'; x.fillRect(W / 2 - 1, 17, 3, 3); x.beginPath(); x.moveTo(5.5, 24.5); x.quadraticCurveTo(W / 2, 4, W - 5.5, 24.5); x.stroke(); } x.fillStyle = '#c8a070'; x.fillRect(0, 0, W, 1); }, seed * 7 + (diagram ? 1 : 0));
  const cov = smat('leather', { color: [0xc06050, 0x5070b0, 0x60a060][seed % 3], roughness: 0.75 });
  for (const s of [-1, 1]) { const half = new THREE.Group(); half.rotation.z = s * 0.1; g.add(half); put(half, cbox(w / 2 + 0.01, 0.012, w * 0.68 + 0.02, 0.003), cov, s * (w / 4 + 0.004), 0.006, 0); put(half, cbox(w / 2 - 0.006, 0.02, w * 0.68 - 0.01, 0.003), LM.parch(), s * (w / 4), 0.02, 0);
    const pg = put(half, new THREE.PlaneGeometry(w / 2 - 0.01, w * 0.68 - 0.014), stdM({ map: page(s > 0 && r0() < 0.7), roughness: 0.95 }), s * (w / 4), 0.0305, 0, -Math.PI / 2); pg.castShadow = false; }
  return g;
}
/** a thick old book with a worm-hole bored through it (a worm can peek out of it) */
export function hollowBook(seed = 2) {
  const g = new THREE.Group(); const cov = smat('leather', { color: 0x8a5a3a, roughness: 0.8 }); put(g, cbox(0.3, 0.12, 0.22, 0.01), cov, 0, 0.06, 0); put(g, cbox(0.28, 0.1, 0.205, 0.004), LM.parch(), 0.012, 0.06, 0.004);
  const hole = put(g, lathe([[0.0005, 0], [0.03, 0], [0.03, 0.004], [0.0005, 0.004]], 7), stdM({ color: 0x1a0c06, roughness: 1 }), 0.03, 0.121, 0.02); hole.castShadow = false; void seed; return g;
}
export function lectern() {
  const g = new THREE.Group(); const w = LM.walnut();
  put(g, cbox(0.5, 0.06, 0.4, 0.015), w, 0, 0.03, 0); put(g, lathe([[0.0005, 0], [0.07, 0], [0.05, 0.1], [0.045, 0.9], [0.07, 1.0], [0.0005, 1.0]], 8), w, 0, 0.06, 0);
  const top = new THREE.Group(); top.position.set(0, 1.1, 0); top.rotation.x = -0.45; g.add(top); put(top, cbox(0.56, 0.04, 0.42, 0.012), w); put(top, cbox(0.56, 0.05, 0.03, 0.006), w, 0, 0.03, 0.2);
  const ob = openBook(5, 0.42); ob.position.set(0, 0.022, -0.01); top.add(ob); g.userData.top = top; return g;
}
export function rug(w = 3.6, d = 2.4) {
  const t = pix(72, 48, (x, W, H, r) => { const C = ['#2a2e44', '#3a4466', '#5a6488', '#a07a3a', '#c8a050', '#6a3a2a', '#e8d8b0']; x.fillStyle = C[1]; x.fillRect(0, 0, W, H); x.fillStyle = C[3]; x.fillRect(2, 2, W - 4, H - 4); x.fillStyle = C[0]; x.fillRect(4, 4, W - 8, H - 8); x.fillStyle = C[1]; x.fillRect(6, 6, W - 12, H - 12);
    for (let i = 4; i < W - 4; i += 4) { P(x, i, 3, C[4]); P(x, i + 2, H - 4, C[4]); } for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? C[2] : C[5]; x.fillRect(W / 2 - 14 + k, H / 2 - k, 28 - 2 * k, 2 * k + 1); } x.fillStyle = C[4]; x.fillRect(W / 2 - 2, H / 2 - 2, 5, 5); x.fillStyle = C[6]; x.fillRect(W / 2 - 1, H / 2 - 1, 3, 3);
    for (const [cx, cy] of [[12, 12], [W - 13, 12], [12, H - 13], [W - 13, H - 13]]) { x.fillStyle = C[4]; x.fillRect(cx - 3, cy - 1, 7, 3); x.fillRect(cx - 1, cy - 3, 3, 7); x.fillStyle = C[5]; x.fillRect(cx, cy, 1, 1); } for (let k = 0; k < 160; k++) P(x, 6 + Math.floor(r() * (W - 12)), 6 + Math.floor(r() * (H - 12)), r() < 0.5 ? C[0] : C[2]); }, 11);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), stdM({ map: t, roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.userData.noInk = true; return m;
}
/** a clean oak plank top: long straight boards with fine grain, pegs and a worn centre (one tile per bench) */
export function plankMat() {
  return stdM({ roughness: 0.62, map: pix(128, 64, (x, W, H, r) => { const C = ['#3e2414', '#5a361c', '#6e4424', '#80522c', '#946238', '#a87448']; for (let y = 0; y < H; y++) { const b = Math.floor(y / 11); for (let X = 0; X < W; X++) { const gr = Math.sin(X * 0.05 + b * 7 + Math.sin(X * 0.013 + b) * 3 + y * 0.9) ; let t = 3 + (gr > 0.85 ? 1 : gr < -0.9 ? -1 : 0) + (b % 2 ? 0 : -0) ; if (y % 11 === 0) t = 0; else if (y % 11 === 1) t = 4; const wear = Math.hypot((X - W / 2) / W, (y - H / 2) / H) < 0.22 ? 1 : 0; t = Math.min(5, t + wear * (r() < 0.5 ? 1 : 0)); x.fillStyle = C[t]; x.fillRect(X, y, 1, 1); } }
    for (let b = 0; b < 6; b++) { const y = b * 11 + 5; for (const X of [6, W - 7]) { x.fillStyle = C[1]; x.fillRect(X, y, 2, 2); x.fillStyle = C[5]; x.fillRect(X, y, 1, 1); } const kx = Math.floor(r() * (W - 20)) + 10; x.fillStyle = C[1]; x.fillRect(kx, y - 1, 3, 2); } }, 21) });
}

/** a tall walnut bookcase (local +z faces the room); returns { group, shelves: [{ y, x0, x1, z }] } */
export function bookcase(w = 1.8, h = 3.2, shelves = 6, seed = 1, { curios = true } = {}) {
  const g = new THREE.Group(); const r = mulberry32(seed); const wood = LM.walnut(); const books = new Books(); const D = 0.38;
  for (const s of [-1, 1]) { put(g, cbox(0.08, h, D, 0.012), wood, s * (w / 2), h / 2, 0); put(g, cbox(0.04, h - 0.3, 0.04, 0.006), wood, s * (w / 2 - 0.02), h / 2, D / 2 + 0.01); } // sides, pilasters
  put(g, cbox(w + 0.22, 0.16, D + 0.1, 0.02), wood, 0, h + 0.06, 0.02); put(g, cbox(w + 0.3, 0.05, D + 0.16, 0.012), wood, 0, h + 0.16, 0.04); put(g, cbox(w + 0.1, 0.16, D + 0.04, 0.02), wood, 0, 0.08, 0.01); // cornice, plinth
  put(g, cbox(w, h, 0.02, 0.004), stdM({ color: 0x24140c, roughness: 0.95 }), 0, h / 2, -D / 2 + 0.01);
  const sp = (h - 0.24) / shelves; const out = [];
  for (let s = 0; s < shelves; s++) {
    const y0 = 0.16 + s * sp; put(g, cbox(w - 0.04, 0.035, D - 0.02, 0.006), smat('oak', { roughness: 0.7 }), 0, y0, 0); out.push({ y: y0 + 0.018, x0: -w / 2 + 0.08, x1: w / 2 - 0.08, z: 0.12 });
    let x = -w / 2 + 0.06; const maxH = sp - 0.05;
    while (x < w / 2 - 0.08) {
      const k = r();
      if (k < 0.06) { x += 0.06 + r() * 0.1; continue; }
      if (curios && k < 0.14 && x < w / 2 - 0.26) { const which = Math.floor(r() * 4); const c = which === 0 ? skull(0.9) : which === 1 ? specimenJar(Math.floor(r() * 3), Math.min(maxH - 0.03, 0.24)) : which === 2 ? dripCandle(Math.min(0.16, maxH - 0.08)) : (() => { const q = new THREE.Group(); for (let i = 0; i < 3; i++) put(q, lathe([[0.022, -0.1], [0.024, -0.098], [0.024, 0.098], [0.022, 0.1]], 6), LM.parch(), 0, 0.024 + i * 0.044 - (i === 2 ? 0.02 : 0), i === 2 ? 0 : (i - 0.5) * 0.05, 0, 0, Math.PI / 2); return q; })();
        c.position.set(x + 0.1, y0 + 0.018, 0.02 + (which === 0 ? 0.04 : 0)); c.rotation.y = (r() - 0.5) * 0.8; g.add(c); x += 0.22; continue; }
      if (k < 0.24) { let y = y0 + 0.018; const n = 2 + Math.floor(r() * 4); const L = 0.18 + r() * 0.08; for (let i = 0; i < n && x + L < w / 2 - 0.05; i++) { const th = 0.03 + r() * 0.03; books.add(new THREE.Matrix4().compose(V(x + L + (r() - 0.5) * 0.02, y + th / 2, 0.01), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.2, Math.PI / 2)), V(th, L, 0.18 + r() * 0.06)), Math.floor(r() * NV), 0.85 + r() * 0.25); y += th; } x += L + 0.03; continue; }
      const th = 0.028 + r() * 0.05, bh = Math.min(maxH, 0.17 + r() * 0.17), lean = k > 0.93 && x < w / 2 - 0.3 ? -(0.2 + r() * 0.15) : 0; const dz = (r() - 0.5) * 0.03;
      books.add(new THREE.Matrix4().compose(V(x + th / 2 + (lean ? bh * 0.12 : 0), y0 + 0.018, dz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, lean)), V(th, bh, 0.17 + r() * 0.07)), Math.floor(r() * NV), 0.82 + r() * 0.3);
      x += th + 0.003 + (lean ? bh * 0.3 : 0);
    }
  }
  g.add(books.build()); return { group: g, shelves: out };
}
