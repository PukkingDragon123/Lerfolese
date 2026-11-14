// The Star Gallery as a cozy library-museum under the observatory dome: a round two-storey room lined with tall
// bookcases packed with pixel-art book spines (varied sizes and colours, leaning runs, flat stacks), a mezzanine
// balcony on turned columns with a balustrade, a spiral staircase, rolling ladders on brass rails, a stone fireplace
// with a crackling fire, reading desks with green banker's lamps, open books, scrolls, maps, a globe and an inkwell,
// an armillary sphere, Persian rugs, wing armchairs, candles, hanging brass lanterns, potted plants, the great
// telescope, arched night windows with light shafts full of dust motes. Warm, bright, cozy lighting.
// buildLibrary() -> { group, update(dt, t), spots, routes, exhibitSpots }
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './toon.js';
import * as F from './flora.js';
import { Kit } from './village.js';
import { telescope } from './orchard.js';
import { turned, plainMat } from '../ui3d/craft.js';
import { toonModel } from './realworld.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const R = 9.4, LOW = 3.3, TOP = 7.2;
function pix(w, h, draw, repeat = null) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, mulberry32(w * 13 + h * 7)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }
const toonM = (o) => new THREE.MeshToonMaterial({ gradientMap: T.gradientMap([0.5, 0.78, 1.0]), ...o });
const at = (a, r, y = 0) => V(Math.sin(a) * r, y, Math.cos(a) * r);

// ---------------------------------------------------------------- books: one instanced mesh, 8 hand-pixelled spine designs
const NV = 8;
function spineAtlas() {
  return pix(16 * NV, 64, (g, w, h, r) => {
    const cols = [['#5a1a1a', '#7a2a24', '#a8402e'], ['#1a2a4a', '#2a4070', '#3e5a96'], ['#1e3a24', '#2e5a34', '#4a7e48'], ['#4a2a12', '#6a401e', '#8e5a2e'], ['#3a1a3a', '#5a2a5a', '#7a3e7a'], ['#6a5a2a', '#8e7a3a', '#b4a04e'], ['#2a2a2a', '#444040', '#605a54'], ['#6a2a1a', '#a8582a', '#d0803a']];
    for (let v = 0; v < NV; v++) { const [d, m, l] = cols[v]; const x0 = v * 16;
      for (let y = 0; y < h; y++) for (let x = 0; x < 13; x++) { g.fillStyle = x === 0 || x === 12 ? d : x < 3 ? l : x > 10 ? d : m; g.fillRect(x0 + x, y, 1, 1); }
      g.fillStyle = '#e8c860'; for (const y of [5, 7, h - 9, h - 7]) g.fillRect(x0 + 1, y, 11, 1); if (v % 2) { g.fillStyle = '#e8c860'; g.fillRect(x0 + 2, 20, 9, 14); g.fillStyle = d; g.fillRect(x0 + 3, 21, 7, 12); }
      g.fillStyle = v % 3 ? '#f2dca0' : '#d8d0c0'; for (let k = 0; k < 4; k++) g.fillRect(x0 + 4 + (k % 2), 23 + k * 3, 4 - (k % 2), 1); if (r() < 0.5) { g.fillStyle = '#1a1010'; g.fillRect(x0 + 1, h - 22, 11, 3); }
      g.fillStyle = '#f2e8cc'; g.fillRect(x0 + 13, 0, 3, h); g.fillStyle = '#d8ccb0'; for (let y = 1; y < h; y += 2) g.fillRect(x0 + 13, y, 3, 1); }
  });
}
function bookGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 1); const uv = g.attributes.uv; // faces: px nx py ny pz nz (4 verts each); +z is the spine
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, f === 4 ? u * (12.5 / 16) : (13.2 + u * 2.6) / 16, v); }
  g.translate(0, 0.5, 0); return g;
}
class Books {
  constructor() { this.list = []; }
  add(m4, v, tint) { this.list.push([m4, v, tint]); }
  build() {
    const mat = toonM({ map: spineAtlas() });
    mat.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float aVar;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vMapUv.x = (vMapUv.x + aVar) / ' + NV.toFixed(1) + ';'); };
    mat.customProgramCacheKey = () => 'books';
    const im = new THREE.InstancedMesh(bookGeometry(), mat, Math.max(1, this.list.length)); const vars = new Float32Array(Math.max(1, this.list.length)); const c = new THREE.Color();
    this.list.forEach(([m, v, t], i) => { im.setMatrixAt(i, m); vars[i] = v; im.setColorAt(i, c.setScalar(t)); });
    im.geometry.setAttribute('aVar', new THREE.InstancedBufferAttribute(vars, 1)); im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.name = 'books'; return im;
  }
}
// a tall bookcase (local +z faces the room): carved frame, cornice, plinth, shelves packed with books
function bookcase(K, books, frame, w, h, shelves, r) {
  const tr = (x, y, z, sx, sy, sz, rz = 0, ry = 0) => { const m = new THREE.Matrix4().compose(V(x, y, z).applyMatrix4(frame), new THREE.Quaternion().setFromRotationMatrix(frame).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz))), V(sx, sy, sz)); return m; };
  const box = (key, sx, sy, sz, x, y, z, rad = 0.012) => { const g = new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(rad, sx / 2.2, sy / 2.2, sz / 2.2)); g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z)); g.applyMatrix4(frame); K.add(key, g, V()); };
  for (const s of [-1, 1]) box('woodDark', 0.07, h, 0.36, s * (w / 2), h / 2, 0); box('woodDark', w + 0.2, 0.14, 0.42, 0, h + 0.07, 0.02); box('woodRaw', w + 0.26, 0.05, 0.46, 0, h + 0.165, 0.03); box('woodDark', w + 0.1, 0.14, 0.4, 0, 0.07, 0.01); box('plain:#2a1a12', w, h, 0.02, 0, h / 2, -0.17);
  const sp = (h - 0.2) / shelves;
  for (let s = 0; s < shelves; s++) {
    const y0 = 0.14 + s * sp; box('woodRaw', w - 0.04, 0.035, 0.34, 0, y0, 0.0); let x = -w / 2 + 0.06; const maxH = sp - 0.06;
    while (x < w / 2 - 0.08) {
      const k = r(); if (k < 0.05) { x += 0.08 + r() * 0.12; continue; }
      if (k < 0.13) { let y = y0 + 0.018; const n = 2 + Math.floor(r() * 4); const L = 0.2 + r() * 0.08; for (let i = 0; i < n && x + L < w / 2 - 0.05; i++) { const th = 0.035 + r() * 0.03; books.add(tr(x + L, y + th / 2, 0.02, th, L, 0.2 + r() * 0.04, Math.PI / 2), Math.floor(r() * NV), 0.85 + r() * 0.25); y += th; } x += L + 0.04; continue; }
      const th = 0.03 + r() * 0.045, bh = Math.min(maxH, 0.18 + r() * 0.16), lean = k > 0.95 ? -0.28 : 0;
      books.add(tr(x + th / 2 + (lean ? bh * 0.14 : 0), y0 + 0.018, 0.0 + (r() - 0.5) * 0.03, th, bh, 0.19 + r() * 0.06, lean), Math.floor(r() * NV), 0.85 + r() * 0.25); x += th + 0.002 + (lean ? bh * 0.28 : 0);
    }
  }
}

// ---------------------------------------------------------------- props
function lampGreen() { // a banker's lamp: brass base and stem, a green glass shade that glows from within
  const g = new THREE.Group(); const brass = plainMat('brass');
  g.add(new THREE.Mesh(turned([[0.001, 0], [0.11, 0], [0.12, 0.02], [0.08, 0.04], [0.02, 0.06], [0.02, 0.3], [0.001, 0.31]], 28), brass));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.28, 24, 1, true, 0, Math.PI), toonM({ color: C('#2e8a4a'), side: THREE.DoubleSide })); shade.rotation.set(0, 0, Math.PI / 2); shade.position.set(0, 0.36, 0.05); shade.rotation.x = -Math.PI / 2; g.add(shade);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 1.1), toneMapped: false })); glow.rotation.x = Math.PI / 2; glow.position.set(0, 0.33, 0.05); g.add(glow);
  return g;
}
function candle(h = 0.16) { const g = new THREE.Group(); g.add(new THREE.Mesh(turned([[0.001, 0], [0.06, 0], [0.065, 0.015], [0.025, 0.03], [0.018, 0.05], [0.03, 0.06], [0.001, 0.065]], 20), plainMat('brass')));
  const c = new THREE.Mesh(turned([[0.001, 0.06], [0.02, 0.06], [0.021, 0.06 + h], [0.012, 0.065 + h], [0.001, 0.068 + h]], 16), toonM({ color: C('#f0e6cc') })); g.add(c);
  const f = new THREE.Mesh(turned([[0.001, 0], [0.012, 0.012], [0.008, 0.035], [0.001, 0.05]], 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.6), toneMapped: false })); f.position.y = 0.07 + h; f.userData.noAO = true; f.userData.flame = true; g.add(f); return g; }
function openBook(w = 0.42, seed = 1) { const g = new THREE.Group(); const r = mulberry32(seed); const pageT = pix(32, 24, (x, W, H) => { x.fillStyle = '#f2e6c8'; x.fillRect(0, 0, W, H); x.fillStyle = '#6a5a48'; for (let y = 3; y < H - 3; y += 2) x.fillRect(2 + (y % 4), y, 11 - (y % 6), 1); for (let y = 3; y < H - 3; y += 2) x.fillRect(18, y, 11 - (y % 5), 1); x.fillStyle = '#c8b890'; x.fillRect(15, 0, 2, H); });
  const cover = toonM({ color: C(['#6a2a24', '#2a3a6a', '#2e5a34'][seed % 3]) }); for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.012, w * 0.7), cover); c.position.set(s * w / 4, 0.006, 0); c.rotation.z = -s * 0.08; g.add(c); }
  const pg = new THREE.PlaneGeometry(w * 0.96, w * 0.66, 8, 1); const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sqrt(Math.max(0, 1 - (x / (w * 0.48)) ** 2)) * 0.03 - Math.abs(x) * 0.02); } pg.rotateX(-Math.PI / 2); pg.computeVertexNormals();
  const pages = new THREE.Mesh(pg, toonM({ map: pageT })); pages.position.y = 0.03; g.add(pages); void r; return g; }
function globe() { const g = new THREE.Group(); const mapT = pix(64, 32, (x, W, H, r) => { x.fillStyle = '#2a5a8a'; x.fillRect(0, 0, W, H); x.fillStyle = '#c8b070'; for (let i = 0; i < 9; i++) { const cx = r() * W, cy = 6 + r() * 20; for (let k = 0; k < 30; k++) x.fillRect(cx + (r() - 0.5) * 12, cy + (r() - 0.5) * 7, 2, 2); } x.fillStyle = '#e8dcb0'; for (let i = 0; i < W; i += 8) x.fillRect(i, 0, 1, H); });
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), toonM({ map: mapT })); s.position.y = 0.42; s.rotation.z = 0.4; g.add(s); g.userData.spin = s;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.012, 6, 32, Math.PI * 1.3), plainMat('brass')); ring.position.y = 0.42; ring.rotation.set(0, Math.PI / 2, 0.4); g.add(ring);
  g.add(new THREE.Mesh(turned([[0.001, 0], [0.14, 0], [0.12, 0.03], [0.03, 0.08], [0.025, 0.2], [0.04, 0.22], [0.001, 0.23]], 24), plainMat('walnut'))); return g; }
function armillary() { const g = new THREE.Group(); const brass = plainMat('brass'); for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.42 - i * 0.04, 0.016, 8, 64), brass); r.position.y = 1.15; r.rotation.set(i === 0 ? Math.PI / 2 : 0.5 * i, i * 0.8, 0.2 * i); g.add(r); g.userData['r' + i] = r; }
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.3, 0.5), toneMapped: false })); sun.position.y = 1.15; g.add(sun);
  g.add(new THREE.Mesh(turned([[0.001, 0], [0.3, 0], [0.32, 0.05], [0.2, 0.1], [0.06, 0.2], [0.05, 0.6], [0.08, 0.66], [0.04, 0.72], [0.035, 0.74], [0.001, 0.74]], 32), plainMat('walnut'))); return g; }
function rug(w, d, seed) { const t = pix(48, 32, (x, W, H, r) => { const P = ['#6a1a1a', '#8a2a22', '#b04a2e', '#d8a050', '#2a2a4a', '#e8d8b0']; x.fillStyle = P[1]; x.fillRect(0, 0, W, H); x.fillStyle = P[4]; x.fillRect(2, 2, W - 4, H - 4); x.fillStyle = P[0]; x.fillRect(4, 4, W - 8, H - 8);
  for (let i = 0; i < W; i += 3) { x.fillStyle = P[3]; x.fillRect(i, 1, 1, 1); x.fillRect(i + 1, H - 2, 1, 1); } x.fillStyle = P[2]; for (let k = 0; k < 6; k++) { x.fillRect(W / 2 - 10 + k, H / 2 - k, 20 - 2 * k, 2 * k + 1); } x.fillStyle = P[3]; x.fillRect(W / 2 - 2, H / 2 - 2, 4, 4); x.fillStyle = P[5]; x.fillRect(W / 2 - 1, H / 2 - 1, 2, 2);
  for (const [cx, cy] of [[8, 8], [W - 9, 8], [8, H - 9], [W - 9, H - 9]]) { x.fillStyle = P[3]; x.fillRect(cx - 2, cy - 1, 5, 3); x.fillRect(cx - 1, cy - 2, 3, 5); } for (let k = 0; k < 40; k++) { x.fillStyle = P[(k % 3) + 1]; x.fillRect(5 + r() * (W - 10), 5 + r() * (H - 10), 1, 1); } void seed; });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toonM({ map: t })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.userData.noInk = true; return m; }
function armchair(K, frame) { const leather = 'plain:#7a2a1e'; const add = (sx, sy, sz, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(sx, sy, sz, 2, 2, 2); g.applyMatrix4(new THREE.Matrix4().makeRotationX(rx)); g.translate(x, y, z); g.applyMatrix4(frame); K.add(leather, g, V()); };
  add(0.8, 0.16, 0.7, 0, 0.42, 0.02); add(0.8, 0.85, 0.16, 0, 0.82, -0.32, -0.12); for (const s of [-1, 1]) { add(0.14, 0.32, 0.72, s * 0.42, 0.58, 0.0); add(0.12, 0.5, 0.3, s * 0.42, 0.98, -0.25); }
  for (const s of [-1, 1]) for (const z of [-0.28, 0.28]) { const g = new THREE.BoxGeometry(0.06, 0.34, 0.06); g.translate(s * 0.36, 0.17, z); g.applyMatrix4(frame); K.add('woodDark', g, V()); } }

// ---------------------------------------------------------------- the room
export function buildLibrary({ seed = 7 } = {}) {
  const G = new THREE.Group(); G.name = 'library'; const r = mulberry32(seed); const K = new Kit(); const books = new Books(); const flames = []; const lights = [];
  // floor: parquet; walls; mezzanine; dome
  const parquet = pix(32, 32, (g, w, h, rr) => { const P = ['#5a3a22', '#6e4a2c', '#82583a', '#94683e']; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const blk = ((x >> 3) + (y >> 3)) % 2; const along = blk ? x % 8 : y % 8; g.fillStyle = along === 0 ? P[0] : P[1 + (((blk ? y : x) >> 1) % 3 === 0 ? 1 : 0) + (rr() < 0.08 ? 1 : 0)]; g.fillRect(x, y, 1, 1); } }, [24, 24]);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 72).rotateX(-Math.PI / 2), toonM({ map: parquet })); floor.receiveShadow = true; G.add(floor);
  const wallT = pix(32, 32, (g, w, h, rr) => { const P = ['#3a2a22', '#4e3a2c', '#5e4836']; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = y % 8 === 0 || (x + (y >> 3) * 4) % 16 === 0 ? P[0] : P[1 + (rr() < 0.15 ? 1 : 0)]; g.fillRect(x, y, 1, 1); } }, [28, 6]);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TOP, 72, 1, true), toonM({ map: wallT, side: THREE.BackSide })); wall.position.y = TOP / 2; wall.receiveShadow = true; G.add(wall);
  const planks = pix(32, 32, (g, w, h, rr) => { const P = ['#4a3020', '#6a4630', '#7e5638']; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = y % 6 === 0 ? P[0] : P[1 + (rr() < 0.12 ? 1 : 0)]; g.fillRect(x, y, 1, 1); } }, [16, 3]);
  const mez = new THREE.Mesh(new THREE.RingGeometry(7.0, R, 72, 1).rotateX(-Math.PI / 2), toonM({ map: planks, side: THREE.DoubleSide })); mez.position.y = LOW; mez.receiveShadow = true; mez.castShadow = true; G.add(mez);
  const fascia = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.0, 0.28, 72, 1, true), plainMat('walnut')); fascia.position.y = LOW - 0.1; G.add(fascia);
  const baluster = turned([[0.001, 0], [0.04, 0], [0.045, 0.05], [0.025, 0.12], [0.04, 0.3], [0.025, 0.55], [0.035, 0.62], [0.03, 0.72], [0.001, 0.73]], 12);
  const bal = new THREE.InstancedMesh(baluster, plainMat('walnut'), 220); { const m4 = new THREE.Matrix4(); for (let i = 0; i < 220; i++) { const a = (i / 220) * Math.PI * 2; m4.makeTranslation(Math.sin(a) * 7.05, LOW + 0.02, Math.cos(a) * 7.05); bal.setMatrixAt(i, m4); } bal.castShadow = true; G.add(bal); }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(7.05, 0.05, 8, 160), plainMat('walnut')); rail.rotation.x = Math.PI / 2; rail.position.y = LOW + 0.77; G.add(rail);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; const col = new THREE.Mesh(turned([[0.001, 0], [0.22, 0], [0.22, 0.12], [0.17, 0.2], [0.14, 0.4], [0.13, 2.9], [0.17, 3.0], [0.22, 3.1], [0.22, 3.2], [0.001, 3.2]], 24), plainMat('walnut')); col.position.copy(at(a, 7.05)); col.castShadow = true; G.add(col); }
  // the star dome above a ring of upper windows
  const mapT = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); const rr = mulberry32(11); g.fillStyle = '#1a2456'; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 600; i++) { g.fillStyle = rr() < 0.2 ? '#f4dc90' : '#c0ccf4'; g.fillRect((rr() * 512) | 0, (rr() * 256) | 0, 1, 1); }
    g.strokeStyle = '#d8b050'; g.lineWidth = 2; for (const y of [60, 120, 190]) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); } g.lineWidth = 1; for (let k = 0; k < 12; k++) { g.beginPath(); g.moveTo(k * 512 / 12, 60); g.lineTo(k * 512 / 12, 256); g.stroke(); }
    g.strokeStyle = '#f0e0a8'; g.fillStyle = '#fff4c8'; for (let k = 0; k < 14; k++) { const cx = 20 + rr() * 470, cy = 70 + rr() * 170; const pts = Array.from({ length: 4 + ((rr() * 3) | 0) }, () => [cx + (rr() - 0.5) * 50, cy + (rr() - 0.5) * 34]); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); for (const [x, y] of pts) g.fillRect(x - 1, y - 1, 3, 3); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: mapT, side: THREE.BackSide })); dome.position.y = TOP; G.add(dome);
  // windows: tall arched panes of night (lower: left and right walls; upper: six in the drum)
  const winT = pix(32, 48, (g, w, h, rr) => { g.fillStyle = '#16205a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { g.fillStyle = rr() < 0.3 ? '#fff2c0' : '#c8d4ff'; g.fillRect((rr() * w) | 0, (rr() * h) | 0, 1, 1); } g.fillStyle = '#3a2a1a'; g.fillRect(15, 0, 2, h); g.fillRect(0, 22, w, 2); });
  const windows = [];
  const win = (a, y0, wW, wH) => { const wnd = new THREE.Group(); wnd.position.copy(at(a, R - 0.06)); wnd.rotation.y = a + Math.PI; G.add(wnd); const sh = new THREE.Shape(); sh.moveTo(-wW / 2, 0); sh.lineTo(wW / 2, 0); sh.lineTo(wW / 2, wH); sh.absarc(0, wH, wW / 2, 0, Math.PI, false); sh.lineTo(-wW / 2, 0);
    const pane = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), new THREE.MeshBasicMaterial({ map: winT })); pane.position.set(0, y0, 0.02); const uv = pane.geometry.attributes.uv, pp = pane.geometry.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, (pp.getX(k) + wW / 2) / wW, pp.getY(k) / (wH + wW / 2)); wnd.add(pane);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(wW / 2 + 0.04, 0.06, 8, 24, Math.PI), plainMat('walnut')); fr.position.set(0, y0 + wH, 0.05); wnd.add(fr); for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.12, wH, 0.12), plainMat('walnut')); j.position.set(s * (wW / 2 + 0.04), y0 + wH / 2, 0.05); wnd.add(j); } windows.push({ a, y: y0 + wH * 0.6 }); };
  win(Math.PI / 2, 0.6, 1.3, 1.9); win(-Math.PI / 2, 0.6, 1.3, 1.9); for (let i = 0; i < 6; i++) win((i / 6) * Math.PI * 2 + Math.PI / 6, LOW + 0.9, 1.1, 1.5);
  // bookcases all round, both storeys (gaps for the windows, the fireplace and the door)
  const skip = (a, lower) => { const d = (x) => Math.abs(((a - x + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (lower) return d(Math.PI) < 0.3 || d(0) < 0.28 || d(Math.PI / 2) < 0.17 || d(-Math.PI / 2) < 0.17; for (let i = 0; i < 6; i++) if (d((i / 6) * Math.PI * 2 + Math.PI / 6) < 0.14) return true; return false; };
  const shelfSpots = [];
  for (const [y0, h, sh, rr2, lower] of [[0, 3.0, 7, R - 0.2, true], [LOW + 0.02, 2.9, 7, R - 0.2, false]]) { const step = 1.62 / rr2; for (let a = 0; a < Math.PI * 2 - step * 0.5; a += step) { if (skip(a + step / 2, lower)) continue; const c = at(a + step / 2, rr2, y0); const frame = new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a + step / 2 + Math.PI), V(1, 1, 1)); bookcase(K, books, frame, 1.6, h, sh, r); if (lower) shelfSpots.push({ a: a + step / 2, frame }); } }
  // rolling ladders on a brass rail
  const railB = new THREE.Mesh(new THREE.TorusGeometry(R - 0.42, 0.025, 6, 160), plainMat('brass')); railB.rotation.x = Math.PI / 2; railB.position.y = 2.95; G.add(railB);
  const ladders = [];
  for (const a of [2.094, -2.094]) { const base = at(a, R - 1.15), top = at(a, R - 0.45, 2.95); const dir = top.clone().sub(base); const L = dir.length(); const lad = new THREE.Group(); lad.position.copy(base); lad.lookAt(top); G.add(lad); const KL = new Kit();
    for (const s of [-1, 1]) KL.box('woodRaw', 0.06, 0.06, L, V(s * 0.24, 0, L / 2), null, 0.015); for (let i = 1; i < 10; i++) KL.box('woodRaw', 0.48, 0.04, 0.05, V(0, 0, (i / 10) * L), null, 0.01); KL.build(lad);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), plainMat('brass')); w.position.set(s * 0.24, -0.05, 0.02); w.rotation.y = Math.PI / 2; lad.add(w); } ladders.push({ base, top }); }
  // spiral staircase up to the balcony
  const stairC = at(0.82, 6.2); const stair = new THREE.Group(); stair.position.copy(stairC); G.add(stair); const KS = new Kit();
  stair.add(new THREE.Mesh(turned([[0.001, 0], [0.14, 0], [0.09, 0.08], [0.07, 0.2], [0.07, LOW + 1.0], [0.1, LOW + 1.05], [0.001, LOW + 1.1]], 20), plainMat('brass')));
  const N = 18; const rail2 = []; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 1.6 + 0.4; const y = 0.18 + (i / (N - 1)) * (LOW - 0.18); KS.box('woodRaw', 0.95, 0.06, 0.32, V(Math.sin(a) * 0.55, y, Math.cos(a) * 0.55), new THREE.Euler(0, a + Math.PI / 2, 0), 0.02); const p = V(Math.sin(a) * 1.0, y + 0.9, Math.cos(a) * 1.0); rail2.push(p); if (i % 2 === 0) KS.box('woodDark', 0.04, 0.9, 0.04, V(Math.sin(a) * 1.0, y + 0.45, Math.cos(a) * 1.0), null, 0.01); }
  KS.build(stair); const rm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail2), 64, 0.035, 6), plainMat('walnut')); stair.add(rm);
  // the fireplace in the front wall: stone surround, mantel with candles and a clock, logs and a living fire
  const fpA = Math.PI; const fpC = at(fpA, R - 0.25); const fp = new THREE.Group(); fp.position.copy(fpC); fp.rotation.y = fpA + Math.PI; G.add(fp); const KF = new Kit();
  KF.box('stone', 2.8, 0.14, 1.0, V(0, 0.07, 0.35), null, 0.03); for (const s of [-1, 1]) KF.box('stone', 0.5, 1.55, 0.55, V(s * 1.0, 0.85, 0.1), null, 0.04); KF.box('stone', 3.0, 0.16, 0.65, V(0, 1.68, 0.14), null, 0.03); KF.box('woodDark', 2.5, 1.62, 0.3, V(0, 2.56, -0.06), null, 0.03); for (const x of [-0.85, 0.85]) KF.box('woodRaw', 0.42, 1.2, 0.05, V(x, 2.55, 0.1), null, 0.015); KF.box('woodRaw', 2.62, 0.12, 0.42, V(0, 3.33, 0.0), null, 0.03);
  KF.box('plain:#1a1210', 1.5, 1.2, 0.1, V(0, 0.75, -0.08), null, 0.01); for (let i = 0; i < 3; i++) KF.add('plain:#5a3a22', new THREE.CylinderGeometry(0.07, 0.08, 0.9, 10).rotateZ(Math.PI / 2).rotateY((i - 1) * 0.3), V((i - 1) * 0.1, 0.24 + (i === 1 ? 0.1 : 0), 0.15)); KF.build(fp);
  { const art = pix(48, 32, (g, W, H, rr) => { for (let y = 0; y < H; y++) { const k = y / H; g.fillStyle = k < 0.3 ? '#1a2456' : k < 0.55 ? '#26346e' : k < 0.7 ? '#3a4a84' : '#2a3a2a'; g.fillRect(0, y, W, 1); }
      g.fillStyle = '#f2e8b8'; for (const [x, y, w] of [[36, 4, 4], [35, 5, 6], [35, 6, 6], [35, 7, 6], [36, 8, 4]]) g.fillRect(x, y, w, 1); g.fillStyle = '#c8c098'; g.fillRect(37, 6, 1, 1); g.fillRect(38, 7, 2, 1);
      for (let i = 0; i < 26; i++) { g.fillStyle = rr() < 0.5 ? '#fff4c8' : '#aab8ee'; g.fillRect((rr() * W) | 0, (rr() * 12) | 0, 1, 1); }
      g.fillStyle = '#1e2a1e'; g.fillRect(0, 24, W, 8); g.fillStyle = '#2e4a2a'; for (let x = 0; x < W; x++) g.fillRect(x, 23 + ((x * 7) % 3 === 0 ? 0 : 1), 1, 1);
      g.fillStyle = '#3a2a1a'; g.fillRect(15, 14, 3, 10); g.fillRect(13, 22, 2, 2); g.fillRect(18, 22, 2, 2); g.fillRect(12, 15, 4, 1); g.fillRect(17, 13, 5, 1);
      for (let i = 0; i < 70; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * 8; g.fillStyle = ['#244a26', '#2e5e30', '#3a7038', '#1a3a1e'][(rr() * 4) | 0]; g.fillRect(16 + Math.cos(a) * d * 1.3, 10 + Math.sin(a) * d * 0.75, 2, 1); }
      g.fillStyle = '#d8342a'; for (const [x, y] of [[11, 9], [20, 7], [14, 12], [23, 11], [17, 6], [9, 12]]) { g.fillRect(x, y, 2, 2); g.fillStyle = '#ff8a6a'; g.fillRect(x, y, 1, 1); g.fillStyle = '#d8342a'; }
      g.fillStyle = '#c84a3a'; g.fillRect(19, 24, 2, 2); g.fillStyle = '#e8d8b8'; g.fillRect(27, 21, 2, 3); g.fillStyle = '#2a2a3a'; g.fillRect(27, 20, 2, 1); });
    const pf = new THREE.Group(); pf.position.set(0, 2.55, 0.12); fp.add(pf); const cv = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), toonM({ map: art })); cv.position.z = 0.03; pf.add(cv);
    const KP = new Kit(); for (const [w, h, x, y] of [[1.42, 0.12, 0, 0.46], [1.42, 0.12, 0, -0.46], [0.12, 1.04, -0.65, 0], [0.12, 1.04, 0.65, 0]]) KP.box('plain:#b08a3a', w, h, 0.08, V(x, y, 0.03), null, 0.02); KP.build(pf); }
  for (const [x, w, h] of [[0, 0.75, 0.9], [-0.25, 0.5, 0.65], [0.28, 0.45, 0.6]]) { const f = T.animeFlame(w, h); f.position.set(x, 0.28, 0.15); fp.add(f); flames.push(f); }
  const fireL = new THREE.PointLight(0xff9a40, 30, 14, 1.4); fireL.position.copy(fp.localToWorld(V(0, 0.9, 1.2))); G.add(fireL); lights.push(fireL);
  for (const x of [-1.2, 1.2]) { const c = candle(0.2); c.position.set(x, 1.76, 0.2); fp.add(c); } toonModel('grandfather_clock').then((o) => { o.scale.multiplyScalar(1.1); o.position.copy(at(fpA + 0.27, R - 0.55)); o.rotation.y = fpA + Math.PI + 0.25; G.add(o); }).catch(() => {});
  const embers = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 90 }, (_, i) => [(r() - 0.5) * 0.8, r() * 1.4, (r() - 0.5) * 0.3][i % 3]), 3)), new THREE.PointsMaterial({ color: new THREE.Color(2.4, 1.2, 0.4), size: 0.035, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); embers.position.copy(fp.localToWorld(V(0, 0.3, 0.15))); G.add(embers);
  // rugs, armchairs by the fire, desks with lamps and clutter, the armillary sphere, the telescope, plants, lanterns
  const rg1 = rug(4.2, 2.8, 1); rg1.position.set(0, 0.012, -6.2); G.add(rg1); const rg2 = rug(5.4, 3.6, 2); rg2.position.set(0, 0.011, 0.3); rg2.rotation.z = 0.3; G.add(rg2);
  const KC = new Kit(); for (const [x, z, ry] of [[-2.3, -6.4, 0.55], [-0.9, -7.25, 0.15]]) armchair(KC, new THREE.Matrix4().compose(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(1, 1, 1))); KC.build(G);
  const desks = [];
  for (const [x, z, ry, sd] of [[-3.7, -2.6, 0.95, 1], [3.6, -1.4, -1.25, 2]]) { const d = new THREE.Group(); d.position.set(x, 0, z); d.rotation.y = ry; G.add(d); const KD = new Kit(); KD.box('woodDark', 1.7, 0.07, 0.85, V(0, 0.78, 0), null, 0.02); for (const s of [-1, 1]) { KD.box('woodDark', 0.5, 0.62, 0.8, V(s * 0.55, 0.42, 0), null, 0.02); KD.box('woodRaw', 0.4, 0.14, 0.02, V(s * 0.55, 0.62, 0.41), null, 0.01); KD.box('woodRaw', 0.4, 0.14, 0.02, V(s * 0.55, 0.42, 0.41), null, 0.01); } KD.build(d);
    const lamp = lampGreen(); lamp.position.set(-0.55, 0.815, -0.2); d.add(lamp); const ll = new THREE.PointLight(0xffd090, 6, 5, 1.6); ll.position.copy(d.localToWorld(V(-0.55, 1.1, 0.05))); G.add(ll); lights.push(ll);
    const ob = openBook(0.46, sd); ob.position.set(0.05, 0.815, 0.1); ob.rotation.y = 0.1; d.add(ob); const c = candle(0.12); c.position.set(0.68, 0.815, -0.25); d.add(c);
    const scroll = new THREE.Mesh(turned([[0.04, -0.3], [0.045, -0.29], [0.045, 0.29], [0.04, 0.3]], 16), toonM({ color: C('#e8d8b0') })); scroll.rotation.z = Math.PI / 2; scroll.position.set(0.4, 0.86, 0.28); d.add(scroll);
    const ink = new THREE.Mesh(turned([[0.001, 0], [0.04, 0], [0.045, 0.04], [0.02, 0.06], [0.022, 0.07], [0.001, 0.07]], 16), toonM({ color: C('#1a1a2a') })); ink.position.set(0.5, 0.815, -0.1); d.add(ink);
    const quill = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.28, 6, 1, true), toonM({ color: C('#f0ece0'), side: THREE.DoubleSide })); quill.position.set(0.52, 0.95, -0.1); quill.rotation.z = -0.4; d.add(quill);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.32 - i * 0.02, 0.06, 0.24), toonM({ color: C(['#6a2a24', '#2a3a6a', '#4a5a2a', '#6a4a22'][i]) })); b.position.set(-0.2, 0.845 + i * 0.06, -0.25); b.rotation.y = (r() - 0.5) * 0.4; d.add(b); }
    desks.push({ d, ry, top: d.localToWorld(V(0.32, 0.815, 0.12)), book: d.localToWorld(V(0.05, 0.84, 0.1)), stack: d.localToWorld(V(-0.2, 1.06, -0.25)) }); }
  const gl = globe(); gl.position.set(-4.6, 0, 0.9); G.add(gl); const arm = armillary(); arm.position.set(4.4, 0, 2.4); G.add(arm);
  const tel = telescope('Star Gallery', V(0.2, 1, 0.25).normalize()); tel.scale.setScalar(1.9); tel.position.set(0, 0, 4.6); G.add(tel);
  for (const [a, k] of [[1.32, 'oleander'], [-1.32, 'myrtle'], [2.9, 'bush'], [3.38, 'bush']]) { const p = at(a, R - 0.9); toonModel('planter_pot_clay').then((o) => { o.scale.multiplyScalar(2.2); o.position.copy(p); G.add(o); }).catch(() => {}); const pl = F.tree(k, { v: 1, s: 0.75 }); pl.position.copy(p).add(V(0, 0.42, 0)); G.add(pl); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const p = at(a, 6.6, LOW - 0.2); const lan = new THREE.Group(); lan.position.copy(p); G.add(lan);
    for (let k = 0; k < 4; k++) { const ln = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 4, 10), plainMat('iron')); ln.position.y = -0.06 - k * 0.07; ln.rotation.y = k * Math.PI / 2; lan.add(ln); }
    const cage = new THREE.Mesh(turned([[0.001, -0.62], [0.12, -0.62], [0.15, -0.58], [0.11, -0.54], [0.11, -0.36], [0.15, -0.32], [0.09, -0.28], [0.02, -0.24], [0.001, -0.22]], 24), plainMat('brass')); lan.add(cage);
    const glass = new THREE.Mesh(turned([[0.001, -0.54], [0.105, -0.54], [0.105, -0.36], [0.001, -0.36]], 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.7), toneMapped: false })); glass.userData.noAO = true; lan.add(glass);
    if (i % 2 === 0) { const l = new THREE.PointLight(0xffb060, 5, 7, 1.6); l.position.copy(p).add(V(0, -0.5, 0)); G.add(l); lights.push(l); } }
  // the great door back to the garden: an arched double door of studded planks under a carved stone arch
  { const dr = new THREE.Group(); dr.position.copy(at(0, R - 0.12)); dr.rotation.y = Math.PI; G.add(dr); const KD = new Kit();
    for (const s of [-1, 1]) { KD.box('stone', 0.32, 2.3, 0.36, V(s * 1.06, 1.15, 0), null, 0.03); for (let i = 0; i < 5; i++) KD.box('plain:#2a1c14', 0.025, 2.2, 0.06, V(s * (0.18 + i * 0.17), 1.12, 0.02), null, 0.008); KD.box('woodDark', 0.88, 2.2, 0.08, V(s * 0.45, 1.12, -0.02), null, 0.015);
      for (const y of [0.45, 1.25, 1.95]) { KD.box('plain:#2e2c30', 0.82, 0.07, 0.03, V(s * 0.45, y, 0.035), null, 0.01); for (let k = 0; k < 4; k++) KD.add('plain:#4a4650', new THREE.SphereGeometry(0.018, 8, 6), V(s * (0.12 + k * 0.2), y, 0.055)); }
      KD.add('plain:#8a6a2a', new THREE.TorusGeometry(0.07, 0.014, 6, 16), V(s * 0.16, 1.15, 0.07)); }
    KD.add('stone', new THREE.TorusGeometry(1.06, 0.17, 10, 28, Math.PI), V(0, 2.25, 0)); KD.add('plain:#2a1c14', new THREE.CircleGeometry(0.9, 24, 0, Math.PI), V(0, 2.25, -0.03)); KD.build(dr); }
  // the frog's reading lectern by the fire
  const lec = new THREE.Group(); lec.position.set(0.72, 0, -5.12); lec.rotation.y = 1.89; G.add(lec); { const KL = new Kit(); KL.box('woodDark', 0.12, 1.0, 0.12, V(0, 0.5, 0), null, 0.02); KL.box('woodDark', 0.5, 0.06, 0.5, V(0, 0.03, 0), null, 0.02); KL.box('woodDark', 0.6, 0.05, 0.45, V(0, 1.05, 0.02), new THREE.Euler(0.45, 0, 0), 0.02); KL.build(lec); const ob = openBook(0.5, 3); ob.position.set(0, 1.09, 0.04); ob.rotation.x = 0.45; lec.add(ob); const c = candle(0.14); c.position.set(0.32, 1.0, 0.08); lec.add(c); }
  // light shafts from the upper windows with dust motes drifting in them
  // each shaft is a soft beam: two crossed ribbons that widen towards the floor, fading at the edges, the window and the floor
  const shaftM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uTime: T.WIND.time },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float x = abs(vUv.x * 2.0 - 1.0); float e = pow(1.0 - x, 1.8); float l = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.9, vUv.y); float flick = 0.85 + 0.15 * sin(uTime * 0.7 + vUv.y * 6.0); gl_FragColor = vec4(vec3(0.62, 0.7, 1.0) * e * l * flick * 0.075, 1.0); }' });
  const poolM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.2, d); gl_FragColor = vec4(vec3(0.55, 0.62, 0.9) * a * 0.12, 1.0); }' });
  const shafts = [];
  for (const w of windows.filter((x) => x.y > LOW)) { const from = at(w.a, R - 0.3, w.y), to = at(w.a, 2.6, 0.02); const L = from.distanceTo(to);
    for (const rot of [0, Math.PI / 2]) { const g = new THREE.PlaneGeometry(0.9, L, 1, 6); const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const k = 0.5 - pp.getY(i) / L; pp.setX(i, pp.getX(i) * (1 + k * 1.4)); } g.translate(0, -L / 2, 0); const m = new THREE.Mesh(g, shaftM); m.position.copy(from); m.lookAt(to); m.rotateX(-Math.PI / 2); m.rotateY(rot); m.userData.noInk = true; m.userData.noAO = true; m.renderOrder = 5; G.add(m); }
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6).rotateX(-Math.PI / 2), poolM); pool.position.copy(to).setY(0.03); pool.rotation.y = w.a; pool.userData.noInk = true; pool.userData.noAO = true; G.add(pool); shafts.push({ from, to }); }
  const motes = (() => { const P = [], S = []; for (let i = 0; i < 360; i++) { const s = shafts[i % shafts.length]; const k = r(); const p = s.from.clone().lerp(s.to, k).add(V((r() - 0.5) * 0.9, (r() - 0.5) * 0.4, (r() - 0.5) * 0.9)); P.push(p.x, p.y, p.z); S.push(r() * 10); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: T.WIND.time, uPx: { value: 1 } }, vertexShader: 'attribute float aS; uniform float uTime, uPx; varying float vA; void main(){ vec3 p = position + vec3(sin(uTime * 0.3 + aS) * 0.25, sin(uTime * 0.2 + aS * 2.0) * 0.15, cos(uTime * 0.25 + aS) * 0.25); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = 0.5 + 0.5 * sin(uTime * 1.3 + aS * 7.0); gl_PointSize = max(1.0, 0.03 * uPx / -mv.z); }', fragmentShader: 'varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; if (length(q) > 0.5) discard; gl_FragColor = vec4(vec3(1.0, 0.92, 0.75) * vA * 0.7, 1.0); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.onBeforeRender = (rd) => { T.tickWind(); m.uniforms.uPx.value = rd.domElement.height * 0.9; }; return pts; })(); G.add(motes);
  K.build(G); G.add(books.build());
  // light: warm and bright; fire and lamps as keys, a soft sky fill, moonlight through the windows
  G.add(new THREE.HemisphereLight(0xfff0e0, 0x5a4a40, 1.6)); G.add(new THREE.AmbientLight(0xfff0e0, 0.55));
  const moon = new THREE.DirectionalLight(0xc8d4ff, 1.3); moon.position.set(4, 14, 6); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 }); G.add(moon);
  const key = new THREE.DirectionalLight(0xffc890, 1.2); key.position.set(-2, 6, -8); G.add(key);
  // routes and spots for the bookworms
  const shelfAt = (k, s, u) => { const sp = shelfSpots[k % shelfSpots.length]; const y0 = 0.14 + s * ((3.0 - 0.2) / 7) + 0.035; return V(-0.8 + 0.1 + u * 1.4, y0, 0.16).applyMatrix4(sp.frame); };
  const spots = { desks, ladders, stair: stairC, fire: fpC, rail: (a) => at(a, 7.05, LOW + 0.8), shelfAt, chairArm: V(-2.3, 0.75, -6.4).add(V(0.38, 0, 0.0).applyAxisAngle(V(0, 1, 0), 0.55)), shelfFrames: shelfSpots };
  const update = (dt, t) => { for (const f of flames) { f.scale.y = 0.9 + Math.sin(t * 9 + f.position.x * 7) * 0.08 + Math.sin(t * 17) * 0.05; f.rotation.y += dt * 0.6; } fireL.intensity = 28 + Math.sin(t * 11) * 3 + Math.sin(t * 23 + 1) * 2;
    const ep = embers.geometry.attributes.position; for (let i = 0; i < ep.count; i++) { let y = ep.getY(i) + dt * (0.25 + (i % 5) * 0.08); if (y > 1.4) y = 0; ep.setY(i, y); ep.setX(i, ep.getX(i) + Math.sin(t * 3 + i) * dt * 0.05); } ep.needsUpdate = true;
    gl.userData.spin.rotation.y += dt * 0.15; for (let i = 0; i < 4; i++) arm.userData['r' + i].rotation.z += dt * (0.1 + i * 0.07); };
  // where the exhibits stand: plinths and cases along the shelves (two arcs, clear of the fire, the door and the stair)
  const exhibitSpots = [0.524, 1.047, 1.571, 2.618, -0.524, -1.047, -1.571, -2.618].flatMap((m) => [m - 0.12, m + 0.12]).map((a) => at(a, 7.8));
  return { group: G, update, spots, exhibitSpots, lights, dome };
}
