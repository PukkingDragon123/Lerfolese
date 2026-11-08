// A Greek island village and its countryside, built as detailed cel-shaded models (ink-outlined by the engine):
// whitewashed cottages on rubble plinths with terracotta barrel-tile roofs, planked blue doors and shutters, stone
// sills, chimneys that smoke, pergolas, flat-roofed Cycladic houses with parapets and outside stairs, a whitewashed
// windmill with a thatched cap and turning triangular sails, a well with a tiled roof, windlass and bucket, split-rail
// fences, dry-stone walls, laundry lines whose sheets ripple in the wind, stone and plank bridges, roadside shrines.
// Every surface carries a hand-painted cel texture projected at a constant world density.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './toon.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);

// ---------------------------------------------------------------- painted textures
const TEX = new Map();
function paint(key, W, H, draw) {
  if (TEX.has(key)) return TEX.get(key); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); draw(g, W, H, mulberry32(key.length * 131 + key.charCodeAt(0)));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; TEX.set(key, t); return t;
}
const stones = (g, W, H, r, { rows = 6, pal = ['#b8ab96', '#cfc3ac', '#a4967e', '#e2d8c2'], mortar = '#6e6252', line = '#4a3e32' } = {}) => {
  g.fillStyle = mortar; g.fillRect(0, 0, W, H); const rh = H / rows;
  for (let j = 0; j < rows; j++) { let x = -r() * 30; while (x < W) { const w = 26 + r() * 40, h = rh * (0.78 + r() * 0.18); const y = j * rh + (rh - h) / 2 + (r() - 0.5) * 3; const cx = x + w / 2, cy = y + h / 2;
    g.fillStyle = line; g.beginPath(); g.ellipse(cx, cy, w / 2 + 1, h / 2 + 1, 0, 0, 7); g.fill();
    g.fillStyle = pal[Math.floor(r() * 3)]; g.beginPath(); g.ellipse(cx, cy, w / 2 - 1, h / 2 - 1, 0, 0, 7); g.fill();
    g.fillStyle = pal[3]; g.beginPath(); g.ellipse(cx - w * 0.08, cy - h * 0.14, w * 0.36, h * 0.24, 0, 0, 7); g.fill(); x += w + 2 + r() * 3; } }
};
const PAINT = {
  plaster: (g, W, H, r) => { g.fillStyle = '#f4efe4'; g.fillRect(0, 0, W, H); for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? '#ebe3d4' : '#faf6ee'; g.beginPath(); g.ellipse(r() * W, r() * H, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = '#cfc4b0'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 16; y += 6 + r() * 8; g.lineTo(x, y); } g.stroke(); } },
  stone: (g, W, H, r) => stones(g, W, H, r),
  rubble: (g, W, H, r) => stones(g, W, H, r, { rows: 5, pal: ['#a89a84', '#bfb29a', '#948670', '#d6ccb4'] }),
  marble: (g, W, H, r) => { g.fillStyle = '#ece6dc'; g.fillRect(0, 0, W, H); g.strokeStyle = '#d2c8bc'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { g.beginPath(); let x = r() * W, y = 0; g.moveTo(x, y); while (y < H) { x += (r() - 0.5) * 20; y += 10; g.lineTo(x, y); } g.stroke(); } g.fillStyle = '#c8bcae'; for (let j = 1; j < 4; j++) g.fillRect(0, (j * H) / 4, W, 2); },
  woodRaw: (g, W, H, r) => planks(g, W, H, r, ['#7a5a3c', '#94714c', '#5e4430', '#3a2a1c']),
  woodDark: (g, W, H, r) => planks(g, W, H, r, ['#5a4030', '#6e5038', '#46321f', '#24180e']),
  woodBlue: (g, W, H, r) => planks(g, W, H, r, ['#2f6ab0', '#4a86c8', '#24528a', '#183a62'], true),
  woodGreen: (g, W, H, r) => planks(g, W, H, r, ['#2e7a5e', '#46967a', '#22604a', '#163e30'], true),
  thatch: (g, W, H, r) => { g.fillStyle = '#9a7a40'; g.fillRect(0, 0, W, H); for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * H; g.strokeStyle = ['#c8a458', '#b08c48', '#7c5e30', '#e0c070'][Math.floor(r() * 4)]; g.lineWidth = 1.5 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + 12 + r() * 14); g.stroke(); } for (let j = 0; j < 4; j++) { g.fillStyle = 'rgba(70,50,20,0.35)'; g.fillRect(0, (j * H) / 4, W, 3); } },
  canvas: (g, W, H, r) => { g.fillStyle = '#f2eadc'; g.fillRect(0, 0, W, H); g.fillStyle = '#e2d6c2'; for (let j = 0; j < 6; j++) g.fillRect(0, (j * H) / 6, W, 2); for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(180,160,130,0.18)'; g.fillRect(r() * W, r() * H, 6 + r() * 20, 2 + r() * 6); } },
  tile: (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#c45a32'); gr.addColorStop(0.5, '#d8703e'); gr.addColorStop(1, '#a8482a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(80,30,10,0.25)'; g.fillRect(0, H * 0.82, W, H * 0.18); },
};
function planks(g, W, H, r, P, painted = false) {
  const n = 6; const pw = W / n; for (let i = 0; i < n; i++) { g.fillStyle = P[i % 2]; g.fillRect(i * pw, 0, pw, H); g.fillStyle = P[3]; g.fillRect(i * pw, 0, 2, H);
    g.strokeStyle = P[2]; g.lineWidth = 1.2; for (let k = 0; k < 4; k++) { const x = i * pw + 5 + r() * (pw - 10); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 8, H * 0.3, x + (r() - 0.5) * 8, H * 0.7, x, H); g.stroke(); }
    if (r() < 0.5) { g.fillStyle = P[3]; g.beginPath(); g.ellipse(i * pw + pw / 2, r() * H, 3, 5, 0, 0, 7); g.fill(); }
    if (painted) for (let k = 0; k < 4; k++) { g.fillStyle = '#d8d0bc'; g.fillRect(i * pw + r() * pw, r() * H, 2 + r() * 5, 1 + r() * 3); } }
}
const MATS = new Map();
export function mat(key, { bands = [0.5, 0.78, 1.0], color = '#ffffff', side = THREE.FrontSide } = {}) {
  const k = key + '|' + side; if (MATS.has(k)) return MATS.get(k);
  const m = new THREE.MeshToonMaterial({ map: PAINT[key] ? paint(key, key === 'thatch' || key === 'canvas' ? 256 : 256, 256, PAINT[key]) : null, color: C(color), gradientMap: T.gradientMap(bands), side });
  MATS.set(k, m); return m;
}
const plain = (color, bands = [0.5, 0.78, 1.0]) => { const k = 'plain:' + color; if (!MATS.has(k)) MATS.set(k, new THREE.MeshToonMaterial({ color: C(color), gradientMap: T.gradientMap(bands) })); return MATS.get(k); };

// box-projected UVs at a constant world density (texture tile = 1 / s units)
function worldUV(geo, s = 0.5) {
  const p = geo.attributes.position, n = geo.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) { uv[i * 2] = x * s; uv[i * 2 + 1] = z * s; } else if (ax >= az) { uv[i * 2] = z * s; uv[i * 2 + 1] = y * s; } else { uv[i * 2] = x * s; uv[i * 2 + 1] = y * s; } }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}
// a batch of bevelled pieces merged into one mesh per material (fewer draw calls, uniform texel density)
class Kit {
  constructor() { this.parts = new Map(); }
  add(matKey, geo, pos, rot = null, scale = null) { const g = geo.clone(); const m4 = new THREE.Matrix4().compose(pos, rot ? new THREE.Quaternion().setFromEuler(rot instanceof THREE.Euler ? rot : new THREE.Euler(...rot)) : new THREE.Quaternion(), scale || V(1, 1, 1)); g.applyMatrix4(m4); if (!this.parts.has(matKey)) this.parts.set(matKey, []); this.parts.get(matKey).push(g); return g; }
  box(matKey, w, h, d, pos, rot = null, rad = 0.04) { return this.add(matKey, new RoundedBoxGeometry(w, h, d, 2, Math.min(rad, w / 2.2, h / 2.2, d / 2.2)), pos, rot); }
  build(group, { uvScale = { plaster: 0.35, stone: 0.7, rubble: 0.6, marble: 0.4, thatch: 0.6, canvas: 0.5, tile: 1 }, cast = true } = {}) {
    for (const [key, list] of this.parts) {
      const geos = list.map((g) => { const ng = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(a)) ng.deleteAttribute(a); if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2)); return ng; });
      const merged = mergeGeometries(geos, false); if (!merged) continue; const [mk, mode] = key.split('|');
      if (mode !== 'keepuv') worldUV(merged, uvScale[mk] ?? 0.9);
      const m = new THREE.Mesh(merged, mk.startsWith('#') || mk.startsWith('plain:') ? plain(mk.replace('plain:', '')) : mat(mk, { side: mode === 'ds' ? THREE.DoubleSide : THREE.FrontSide }));
      m.castShadow = cast; m.receiveShadow = true; m.name = 'kit:' + mk; group.add(m);
    }
    return group;
  }
}

// ---------------------------------------------------------------- terracotta barrel tiles (instanced), laid in pan / cover courses
let TILEG = null;
function tileGeometry() {
  if (TILEG) return TILEG; const segs = 7, R = 0.11, L = 0.46; const pos = [], nrm = [], uv = [], idx = [];
  for (let i = 0; i <= 1; i++) for (let j = 0; j <= segs; j++) { const a = (j / segs) * Math.PI; const r = R * (i ? 0.86 : 1); pos.push(Math.cos(a) * r, Math.sin(a) * r * 0.85, i * L); nrm.push(Math.cos(a), Math.sin(a), 0); uv.push(j / segs, i); }
  for (let j = 0; j < segs; j++) { const a = j, b = j + 1, c = segs + 1 + j, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); TILEG = g; return g;
}
class Tiles {
  constructor() { this.list = []; }
  // a roof plane: origin at the eave's left corner, `along` = eave direction, `up` = up-slope direction (unit), sizes in units
  slope(o, along, up, width, len, r) {
    const nrm = V().crossVectors(along, up).normalize(); if (nrm.y < 0) nrm.negate(); const cols = Math.max(2, Math.round(width / 0.21)), rows = Math.max(2, Math.ceil(len / 0.36));
    for (let c = 0; c <= cols; c++) for (let k = 0; k < rows; k++) { const cover = c % 2 === 1; const p = o.clone().addScaledVector(along, (c / cols) * width).addScaledVector(up, k * 0.36 - 0.06).addScaledVector(nrm, (cover ? 0.09 : 0.1) + (k % 2) * 0.014);
      const zA = up.clone().negate(); const m = new THREE.Matrix4().makeBasis(V().crossVectors(nrm, zA), nrm.clone(), zA); const q = new THREE.Quaternion().setFromRotationMatrix(m); if (!cover) q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), (r() - 0.5) * 0.05));
      this.list.push({ p: p.addScaledVector(up, 0.46), q, s: V(1, 1, 1), c: r() }); }
  }
  ridge(a, b, r) { const d = b.clone().sub(a); const n = Math.max(2, Math.ceil(d.length() / 0.36)); const dir = d.clone().normalize(); const m = new THREE.Matrix4().makeBasis(V().crossVectors(V(0, 1, 0), dir).normalize(), V(0, 1, 0), dir); const q = new THREE.Quaternion().setFromRotationMatrix(m);
    for (let i = 0; i < n; i++) this.list.push({ p: a.clone().addScaledVector(dir, (i / n) * d.length()), q: q.clone(), s: V(1.15, 1.1, 1), c: r() * 0.6 }); }
  build(name = 'tiles') {
    const m = mat('tile', { side: THREE.DoubleSide, bands: [0.45, 0.75, 1.0] }); const im = new THREE.InstancedMesh(tileGeometry(), m, Math.max(1, this.list.length)); const m4 = new THREE.Matrix4(); const col = new THREE.Color();
    const pal = [C('#ffffff'), C('#f4d8c8'), C('#ffe8d0'), C('#e8c0a8'), C('#d8b8a0')];
    this.list.forEach((t, i) => { m4.compose(t.p, t.q, t.s); im.setMatrixAt(i, m4); im.setColorAt(i, col.copy(pal[Math.floor(t.c * pal.length) % pal.length])); });
    if (!this.list.length) { im.setColorAt(0, col.setRGB(1, 1, 1)); im.count = 0; }
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.name = name; return im;
  }
}

// ---------------------------------------------------------------- doors, windows, shutters
function door(K, x, y, z, ry, { w = 0.95, h = 1.95, paint = 'woodBlue', arch = false } = {}) {
  const q = new THREE.Euler(0, ry, 0); const R = (dx, dy, dz) => V(dx, dy, dz).applyEuler(q).add(V(x, y, z));
  K.box('marble', w + 0.3, 0.14, 0.22, R(0, h + 0.07, 0.03), q, 0.03); // lintel
  for (const s of [-1, 1]) K.box('marble', 0.13, h, 0.2, R(s * (w / 2 + 0.07), h / 2, 0.02), q, 0.03);
  K.box('plain:#2a2018', w, h, 0.05, R(0, h / 2, -0.06), q, 0.01); // dark reveal
  const n = 5; for (let i = 0; i < n; i++) K.box(paint, w / n - 0.012, h - 0.05, 0.06, R(-w / 2 + (i + 0.5) * (w / n), h / 2 - 0.01, -0.02), new THREE.Euler(0, ry, (Math.sin(i * 7.1) * 0.004)), 0.012);
  for (const yy of [0.35, h - 0.4]) K.box(paint, w - 0.06, 0.1, 0.05, R(0, yy, 0.025), q, 0.015); // ledges
  K.box('plain:#2a2a2e', 0.05, 0.05, 0.05, R(w * 0.32, h * 0.5, 0.06), q, 0.02); // iron knob
  K.box('stone', w + 0.5, 0.12, 0.55, R(0, 0.02, 0.32), q, 0.04); // step
  void arch;
}
function windowSet(K, x, y, z, ry, { w = 0.72, h = 0.86, paint = 'woodBlue', open = 0.7 } = {}) {
  const q = new THREE.Euler(0, ry, 0); const R = (dx, dy, dz) => V(dx, dy, dz).applyEuler(q).add(V(x, y, z));
  K.box('plain:#1e2430', w, h, 0.04, R(0, 0, -0.07), q, 0.01); // dark glass behind
  K.box(paint, 0.04, h, 0.05, R(0, 0, -0.04), q, 0.01); K.box(paint, w, 0.04, 0.05, R(0, h * 0.1, -0.04), q, 0.01); // muntins
  for (const s of [-1, 1]) K.box(paint, 0.07, h + 0.1, 0.1, R(s * (w / 2 + 0.035), 0, 0), q, 0.02); K.box(paint, w + 0.14, 0.07, 0.1, R(0, h / 2 + 0.035, 0), q, 0.02);
  K.box('marble', w + 0.34, 0.08, 0.3, R(0, -h / 2 - 0.05, 0.08), q, 0.03); // sill
  for (const s of [-1, 1]) { // open shutters, planked, hinged on the frame
    const a = ry + s * (Math.PI / 2) * open; const hq = new THREE.Euler(0, a, 0); const hinge = R(s * (w / 2 + 0.07), 0, 0.05); const sw = w / 2;
    for (let i = 0; i < 3; i++) K.box(paint, sw / 3 - 0.01, h + 0.04, 0.04, hinge.clone().add(V(s * (i + 0.5) * (sw / 3), 0, 0).applyEuler(hq)), hq, 0.01);
    K.box(paint, sw - 0.02, 0.06, 0.05, hinge.clone().add(V(s * sw / 2, h * 0.3, 0.02).applyEuler(hq)), hq, 0.01); K.box(paint, sw - 0.02, 0.06, 0.05, hinge.clone().add(V(s * sw / 2, -h * 0.3, 0.02).applyEuler(hq)), hq, 0.01);
  }
}

// ---------------------------------------------------------------- the cottage
/** opts: w, d, h, roof 'gable'|'flat', paint, chimney, pergola, stairs. Origin = floor centre; front faces +z. Returns { group, smoke: [world-ish local points], flowers: [] } */
export function cottage(seed = 1, { w = null, d = null, h = null, roof = null, paint = null, chimney = true, pergola = null, base = 0.5 } = {}) {
  const r = mulberry32(seed * 97 + 11); w ??= 3.4 + r() * 1.4; d ??= 3.0 + r() * 0.9; h ??= 2.5 + r() * 0.5; roof ??= r() < 0.65 ? 'gable' : 'flat'; paint ??= r() < 0.6 ? 'woodBlue' : 'woodGreen'; pergola ??= r() < 0.4;
  const G = new THREE.Group(); G.name = 'cottage'; const K = new Kit(); const tiles = new Tiles(); const smoke = []; const greens = [];
  K.box('rubble', w + 0.22, 0.42 + base, d + 0.22, V(0, (0.42 - base) / 2 - 0.04, 0), null, 0.06); // rubble plinth
  K.box('plaster', w, h, d, V(0, h / 2 + 0.17, 0), null, 0.09); // whitewashed walls
  for (const s of [-1, 1]) for (const t of [-1, 1]) K.box('plaster', 0.18, h - 0.1, 0.18, V(s * (w / 2 - 0.02), h / 2 + 0.2, t * (d / 2 - 0.02)), null, 0.06); // softened corners
  door(K, -w * 0.18 + (r() - 0.5) * 0.3, 0.17, d / 2 + 0.02, 0, { paint });
  windowSet(K, w * 0.26, 0.17 + h * 0.55, d / 2 + 0.02, 0, { paint, open: 0.55 + r() * 0.4 });
  windowSet(K, w / 2 + 0.02, 0.17 + h * 0.55, -d * 0.1, Math.PI / 2, { paint, open: 0.3 + r() * 0.6, w: 0.6, h: 0.72 });
  windowSet(K, -w / 2 - 0.02, 0.17 + h * 0.55, d * 0.12, -Math.PI / 2, { paint, open: 0.8, w: 0.6, h: 0.72 });
  const top = h + 0.17;
  if (roof === 'gable') {
    const pitch = 0.42, over = 0.32, half = d / 2 + over; const rise = Math.tan(pitch) * half; const slopeLen = half / Math.cos(pitch);
    // gable ends: triangular plaster walls, then a dark underlay so no light leaks between the tiles
    const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * (d / 2))]); const tg = new THREE.ExtrudeGeometry(tri, { depth: w - 0.02, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }); tg.translate(0, 0, -(w - 0.02) / 2); tg.rotateY(Math.PI / 2);
    K.add('plaster', tg, V(0, top - 0.02, 0));
    for (const s of [-1, 1]) { const o = V(-w / 2 - over, top - 0.1, s * half); const up = V(0, rise, -s * half).normalize(); const along = V(1, 0, 0);
      K.box('plain:#6a3a26', w + over * 2, 0.06, slopeLen + 0.05, o.clone().add(V(w / 2 + over, rise / 2 + 0.02, -s * half / 2)), new THREE.Euler(s * pitch, 0, 0), 0.02);
      tiles.slope(o.clone(), along, up, w + over * 2, slopeLen, r);
      for (let i = 0; i <= Math.floor(w / 0.6); i++) K.box('woodDark', 0.1, 0.1, 0.36, V(-w / 2 + 0.15 + i * 0.6, top - 0.1, s * (d / 2 + 0.16)), null, 0.02); // rafter ends
      K.box('woodDark', w + over * 2, 0.12, 0.06, V(0, top - 0.12, s * half), null, 0.02); // fascia
    }
    tiles.ridge(V(-w / 2 - over, top - 0.1 + rise + 0.13, 0), V(w / 2 + over, top - 0.1 + rise + 0.13, 0), r);
    if (chimney) { const cx = w * 0.28, cz = -d * 0.18; const ch = rise + 0.9; K.box('rubble', 0.55, ch, 0.55, V(cx, top + ch / 2, cz), null, 0.05); K.box('stone', 0.75, 0.1, 0.75, V(cx, top + ch + 0.05, cz), null, 0.03); for (const s of [-1, 1]) K.box('plain:#b8583a', 0.5, 0.05, 0.36, V(cx, top + ch + 0.22, cz + s * 0.12), new THREE.Euler(s * 0.6, 0, 0), 0.02); smoke.push(V(cx, top + ch + 0.35, cz)); }
  } else {
    K.box('plaster', w + 0.12, 0.12, d + 0.12, V(0, top + 0.02, 0), null, 0.05); // roof slab
    for (const [px, pz, pw, pd] of [[0, d / 2, w + 0.12, 0.16], [0, -d / 2, w + 0.12, 0.16], [w / 2, 0, 0.16, d], [-w / 2, 0, 0.16, d]]) K.box('plaster', pw, 0.42, pd, V(px, top + 0.26, pz), null, 0.07); // parapets
    K.box('stone', 0.12, 0.08, 0.4, V(w / 2 + 0.14, top - 0.05, d * 0.2), null, 0.03); // spout
    if (chimney) { const cx = -w * 0.3, cz = -d * 0.2; K.box('plaster', 0.5, 0.9, 0.5, V(cx, top + 0.5, cz), null, 0.08); K.box('plaster', 0.62, 0.08, 0.62, V(cx, top + 0.98, cz), null, 0.03); K.box('plain:#3a3030', 0.24, 0.1, 0.24, V(cx, top + 1.0, cz), null, 0.02); smoke.push(V(cx, top + 1.1, cz)); }
    // outside stair to the roof along the right wall
    const n = 9; for (let i = 0; i < n; i++) { const y = 0.17 + (i + 0.5) * (h / n); K.box('plaster', 0.72, 0.18, 0.34, V(w / 2 + 0.38, y, d / 2 - 0.25 - i * ((d - 0.5) / n)), null, 0.04); }
    K.box('plaster', 0.14, 0.6, d - 0.3, V(w / 2 + 0.72, 0.17 + h * 0.6, 0), new THREE.Euler(Math.atan2(h, d - 0.5), 0, 0), 0.05);
  }
  // bench and pots by the door, a pergola with a vine on the sunny side
  K.box('woodRaw', 1.3, 0.07, 0.36, V(w * 0.22, 0.6, d / 2 + 0.45), null, 0.02); for (const s of [-1, 1]) K.box('stone', 0.16, 0.42, 0.32, V(w * 0.22 + s * 0.5, 0.38, d / 2 + 0.45), null, 0.03);
  if (pergola) { const pz = d / 2 + 1.5; for (const s of [-1, 1]) for (const t of [0, 1]) K.box('woodRaw', 0.12, 2.3, 0.12, V(s * (w / 2 - 0.3), 1.15 + 0.17, d / 2 + 0.15 + t * 1.6), new THREE.Euler((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.03), 0.02);
    for (const s of [-1, 1]) K.box('woodRaw', 0.12, 0.14, 1.9, V(s * (w / 2 - 0.3), 2.5, d / 2 + 0.95), null, 0.02); for (let i = 0; i < 7; i++) K.box('woodRaw', w - 0.3, 0.08, 0.08, V(0, 2.6, d / 2 + 0.2 + i * 0.26), null, 0.02);
    greens.push({ kind: 'vine', x: -w / 4, y: 2.25, z: pz - 0.35, s: 1.1 }, { kind: 'vine', x: w / 4, y: 2.3, z: pz - 0.6, s: 1.0 }); }
  greens.push({ kind: r() < 0.5 ? 'oleander' : 'myrtle', x: -w / 2 - 0.3, y: 0, z: d / 2 + 0.2, s: 1.0 + r() * 0.3 });
  K.build(G); G.add(tiles.build());
  return { group: G, smoke, greens, size: [w + 0.6, d + 0.6] };
}

// ---------------------------------------------------------------- windmill (Mykonos style)
export function windmill(seed = 3) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'windmill'; const K = new Kit();
  const prof = [[0.01, -0.6], [1.95, -0.6], [1.95, 0.35], [1.72, 0.45], [1.62, 1.2], [1.52, 3.4], [1.42, 5.1], [1.56, 5.22], [1.56, 5.42], [0.01, 5.42]].map(([a, b]) => new THREE.Vector2(a, b));
  const lathe = new THREE.LatheGeometry(prof, 40); lathe.computeVertexNormals(); { const lu = lathe.attributes.uv; for (let i = 0; i < lu.count; i++) lu.setXY(i, lu.getX(i) * 7, lu.getY(i) * 2.5); } const body = new THREE.Mesh(lathe, mat('plaster')); body.castShadow = body.receiveShadow = true; G.add(body);
  const plinth = new THREE.LatheGeometry([[0.01, -0.6], [2.05, -0.6], [2.05, 0.38], [1.9, 0.48], [0.01, 0.48]].map(([a, b]) => new THREE.Vector2(a, b)), 40); worldUV(plinth, 0.7); const pm = new THREE.Mesh(plinth, mat('rubble')); pm.castShadow = pm.receiveShadow = true; G.add(pm);
  door(K, 0, 0.48, 1.72, 0, { w: 0.9, h: 1.85 }); for (const [a, y] of [[0.55, 2.6], [-0.7, 3.6], [2.4, 2.9]]) windowSet(K, Math.sin(a) * 1.58, y, Math.cos(a) * 1.58, a, { w: 0.45, h: 0.55, open: 0.35 });
  const cap = new THREE.LatheGeometry([[1.68, 5.3], [1.62, 5.5], [1.1, 6.35], [0.5, 7.0], [0.06, 7.35], [0.01, 7.38]].map(([a, b]) => new THREE.Vector2(a, b)), 40); cap.computeVertexNormals(); const cu = cap.attributes.uv; for (let i = 0; i < cu.count; i++) cu.setXY(i, cu.getX(i) * 6, cu.getY(i) * 2.2);
  const cm = new THREE.Mesh(cap, mat('thatch')); cm.castShadow = cm.receiveShadow = true; G.add(cm);
  K.add('woodDark', new THREE.TorusGeometry(1.62, 0.07, 6, 48).rotateX(Math.PI / 2), V(0, 5.32, 0));
  K.build(G);
  // the sail cross: hub, axle, 8 spars, triangular canvas sails, rigging to a bowsprit; it turns
  const S = new THREE.Group(); S.position.set(0, 6.0, 1.75); G.add(S); const SK = new Kit();
  SK.add('woodDark', new THREE.CylinderGeometry(0.24, 0.3, 0.55, 12).rotateX(Math.PI / 2), V(0, 0, 0)); SK.add('woodDark', new THREE.CylinderGeometry(0.05, 0.08, 2.4, 8).rotateX(Math.PI / 2), V(0, 0, 1.15));
  const sailGeo = []; const N = 8, L = 4.1;
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + 0.2; const dir = V(Math.cos(a), Math.sin(a), 0); SK.box('woodRaw', 0.09, L, 0.09, dir.clone().multiplyScalar(L / 2 + 0.2), new THREE.Euler(0, 0, a - Math.PI / 2), 0.02);
    const nx = V(Math.cos(a + (Math.PI * 2) / N * 0.62), Math.sin(a + (Math.PI * 2) / N * 0.62), 0); // sail sheet out to the next spar's side
    const p0 = dir.clone().multiplyScalar(0.7), p1 = dir.clone().multiplyScalar(L + 0.1), p2 = nx.clone().multiplyScalar(L * 0.78).add(V(0, 0, -0.05)); const sg = new THREE.BufferGeometry(); const sub = 6; const pos = [], uv = [], idx = [];
    for (let u = 0; u <= sub; u++) for (let v = 0; v <= sub - u; v++) { const a1 = u / sub, b1 = v / sub; const p = p0.clone().multiplyScalar(1 - a1 - b1).addScaledVector(p1, a1).addScaledVector(p2, b1); p.z += Math.sin(Math.PI * a1) * Math.sin(Math.PI * Math.min(1, b1 * 1.4)) * 0.28; pos.push(p.x, p.y, p.z); uv.push(a1, b1); }
    let k = 0; const row = []; for (let u = 0; u <= sub; u++) { row.push(k); k += sub - u + 1; } for (let u = 0; u < sub; u++) for (let v = 0; v < sub - u; v++) { const aI = row[u] + v, bI = row[u + 1] + v; idx.push(aI, bI, aI + 1); if (v < sub - u - 1) idx.push(aI + 1, bI, bI + 1); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx); sg.computeVertexNormals(); sailGeo.push(sg);
    const rope = new THREE.TubeGeometry(new THREE.LineCurve3(p1.clone(), V(0, 0, 2.3)), 1, 0.012, 4); SK.add('plain:#4a3a2a', rope, V(0, 0, 0)); }
  SK.build(S); const sails = new THREE.Mesh(mergeGeometries(sailGeo), mat('canvas', { side: THREE.DoubleSide })); sails.castShadow = true; sails.receiveShadow = true; S.add(sails);
  const spin = 0.35 + r() * 0.2; S.children.forEach((c) => { c.onBeforeRender = () => { S.rotation.z = -(performance.now() / 1000) * spin; }; });
  return G;
}

// ---------------------------------------------------------------- the well
export function well(seed = 5) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'well'; const K = new Kit(); const tiles = new Tiles(); const R = 0.72;
  for (let c = 0; c < 4; c++) { const n = 13; for (let i = 0; i < n; i++) { const a = ((i + (c % 2) * 0.5) / n) * Math.PI * 2; K.box('stone', 0.36 + r() * 0.06, 0.2, 0.26, V(Math.cos(a) * R, 0.1 + c * 0.2, Math.sin(a) * R), new THREE.Euler(0, -a + Math.PI / 2, 0), 0.06); } }
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; K.box('marble', 0.48, 0.1, 0.34, V(Math.cos(a) * R, 0.86, Math.sin(a) * R), new THREE.Euler(0, -a + Math.PI / 2, 0), 0.04); }
  K.add('plain:#14222a', new THREE.CircleGeometry(R - 0.12, 24).rotateX(-Math.PI / 2), V(0, 0.55, 0));
  for (const s of [-1, 1]) { K.box('woodRaw', 0.14, 1.9, 0.14, V(s * (R + 0.05), 1.0, 0), null, 0.03); K.box('woodRaw', 0.1, 0.5, 0.1, V(s * (R + 0.05), 1.4, 0.2), new THREE.Euler(0.6, 0, 0), 0.02); }
  K.box('woodDark', 2 * R + 0.5, 0.12, 0.14, V(0, 1.95, 0), null, 0.03);
  // windlass log wrapped in rope, a crank, the rope down to a staved bucket
  K.add('woodRaw', new THREE.CylinderGeometry(0.1, 0.1, 2 * R - 0.05, 10).rotateZ(Math.PI / 2), V(0, 1.38, 0)); for (let i = 0; i < 6; i++) K.add('plain:#a8865a', new THREE.TorusGeometry(0.11, 0.022, 5, 14).rotateY(Math.PI / 2), V(-0.25 + i * 0.07, 1.38, 0));
  K.box('plain:#3a3a3e', 0.04, 0.3, 0.04, V(R + 0.2, 1.24, 0), null, 0.01); K.box('plain:#3a3a3e', 0.25, 0.04, 0.04, V(R + 0.12, 1.38, 0), null, 0.01); K.box('woodDark', 0.05, 0.05, 0.16, V(R + 0.2, 1.1, 0.06), null, 0.015);
  K.add('plain:#a8865a', new THREE.CylinderGeometry(0.014, 0.014, 0.55, 5), V(0.05, 1.08, 0));
  const staves = new THREE.LatheGeometry([[0.01, 0], [0.15, 0], [0.17, 0.02], [0.2, 0.3], [0.18, 0.31], [0.01, 0.3]].map(([a, b]) => new THREE.Vector2(a, b)), 14); K.add('woodRaw', staves, V(0.05, 0.52, 0)); for (const y of [0.08, 0.24]) K.add('plain:#2e2e32', new THREE.TorusGeometry(0.17 + y * 0.12, 0.012, 4, 18).rotateX(Math.PI / 2), V(0.05, 0.52 + y, 0));
  // little tiled roof
  const pitch = 0.6, half = 0.75, rise = Math.tan(pitch) * half; for (const s of [-1, 1]) { const o = V(-R - 0.45, 2.0, s * half); tiles.slope(o, V(1, 0, 0), V(0, rise, -s * half).normalize(), 2 * R + 0.9, half / Math.cos(pitch), r); K.box('plain:#5a3222', 2 * R + 0.9, 0.05, half / Math.cos(pitch), V(0, 2.0 + rise / 2, s * half / 2), new THREE.Euler(s * pitch, 0, 0), 0.02); }
  tiles.ridge(V(-R - 0.45, 2.0 + rise + 0.13, 0), V(R + 0.45, 2.0 + rise + 0.13, 0), r);
  K.build(G); G.add(tiles.build('wellTiles')); return G;
}

// ---------------------------------------------------------------- fences, dry-stone walls, laundry
/** split-rail fence along points [[x, z], ...] on the ground hAt */
export function fence(points, hAt, seed = 7) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'fence'; const K = new Kit(); const P = points.map(([x, z]) => V(x, hAt(x, z), z));
  for (let i = 0; i < P.length; i++) { const p = P[i]; K.box('woodRaw', 0.12, 1.15, 0.12, p.clone().add(V(0, 0.5, 0)), new THREE.Euler((r() - 0.5) * 0.08, r() * 3, (r() - 0.5) * 0.08), 0.03); K.box('woodRaw', 0.08, 0.1, 0.08, p.clone().add(V(0, 1.1, 0)), new THREE.Euler(0.6, r() * 3, 0.6), 0.02);
    if (i) { const a = P[i - 1]; const d = p.clone().sub(a); const len = d.length(); const ry = -Math.atan2(d.z, d.x); const tilt = Math.atan2(d.y, Math.hypot(d.x, d.z));
      for (const y of [0.45, 0.85]) K.box('woodRaw', len + 0.12, 0.08, 0.06, a.clone().add(p).multiplyScalar(0.5).add(V(0, y + (r() - 0.5) * 0.04, 0)), new THREE.Euler(0, ry, tilt + (r() - 0.5) * 0.03, 'YXZ'), 0.025); } }
  K.build(G); return G;
}
/** dry-stone wall along points */
export function stoneWall(points, hAt, seed = 9, { h = 0.85 } = {}) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'stoneWall'; const K = new Kit(); const P = points.map(([x, z]) => V(x, hAt(x, z), z));
  for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; const d = b.clone().sub(a); const len = d.length(); const dir = d.clone().normalize(); const ry = -Math.atan2(d.z, d.x);
    const nC = Math.max(3, Math.round(h / 0.27)); for (let c = 0; c < nC; c++) { let s = (c % 2) * 0.2; while (s < len) { const w = 0.32 + r() * 0.3; const p = a.clone().addScaledVector(dir, Math.min(len, s + w / 2)); p.y = hAt(p.x, p.z) + 0.12 + c * ((h - 0.1) / nC); K.box('rubble', w, 0.24 + r() * 0.06, 0.42 - Math.min(c, 3) * 0.04, p, new THREE.Euler((r() - 0.5) * 0.1, ry + (r() - 0.5) * 0.15, (r() - 0.5) * 0.12, 'YXZ'), 0.07); s += w + 0.02; } }
    for (let s = 0; s < len; s += 0.3) { const p = a.clone().addScaledVector(dir, s + 0.15); p.y = hAt(p.x, p.z) + h + 0.02; K.box('stone', 0.22, 0.3, 0.36, p, new THREE.Euler(0, ry, (r() - 0.5) * 0.4, 'YXZ'), 0.06); } }
  K.build(G, { uvScale: { rubble: 1.4, stone: 1.6 } }); return G;
}
const CLOTH = ['#f6f2ea', '#4a7ac8', '#e8c060', '#c84a3a', '#f6f2ea', '#7aa8d8', '#e8e0d0'];
function clothTex(i) { return paint('cloth' + i, 64, 64, (g, W, H) => { g.fillStyle = CLOTH[i % CLOTH.length]; g.fillRect(0, 0, W, H); if (i % 3 === 1) { g.fillStyle = '#f6f2ea'; for (let k = 0; k < 4; k++) g.fillRect(0, k * 16 + 4, W, 6); } if (i % 3 === 2) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, H - 6, W, 6); } g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, W, 3); }); }
/** a laundry line between two posts: sheets and shirts ripple in the wind (vertex wave, bottom free) */
export function laundry(a, b, seed = 4) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'laundry'; const K = new Kit(); const H = 1.95;
  for (const p of [a, b]) { K.box('woodRaw', 0.12, H + 0.1, 0.12, p.clone().add(V(0, H / 2, 0)), null, 0.03); K.box('woodRaw', 0.5, 0.08, 0.08, p.clone().add(V(0, H - 0.05, 0)), new THREE.Euler(0, -Math.atan2(b.z - a.z, b.x - a.x) + Math.PI / 2, 0), 0.02); }
  const sag = (t) => a.clone().lerp(b, t).add(V(0, H - 0.08 - Math.sin(Math.PI * t) * 0.22, 0)); const curve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => sag(i / 8)));
  K.add('plain:#d8ccb0', new THREE.TubeGeometry(curve, 24, 0.013, 4), V()); K.build(G);
  const ry = -Math.atan2(b.z - a.z, b.x - a.x); let t = 0.1; let i = 0;
  while (t < 0.88) { const w = 0.45 + r() * 0.5, h = 0.5 + r() * 0.6; const span = w / a.distanceTo(b); const mid = sag(t + span / 2);
    const geo = new THREE.PlaneGeometry(w, h, 6, 6); geo.translate(0, -h / 2, 0);
    const m = new THREE.MeshToonMaterial({ map: clothTex(i + seed), side: THREE.DoubleSide, gradientMap: T.gradientMap([0.55, 0.8, 1.0]) }); const ph = r() * 6;
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uTime: T.WIND.time, uH: { value: h }, uPh: { value: ph } }); sh.vertexShader = 'uniform float uTime; uniform float uH; uniform float uPh;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float fk = -position.y / uH; transformed.z += (sin(uTime * 3.2 + position.x * 4.0 + uPh) * 0.08 + sin(uTime * 5.1 + position.y * 6.0) * 0.03 + 0.12) * fk; transformed.x += sin(uTime * 2.3 + uPh) * 0.03 * fk;'); };
    m.customProgramCacheKey = () => 'cloth';
    const c = new THREE.Mesh(geo, m); c.position.copy(mid); c.rotation.y = ry; c.castShadow = true; c.receiveShadow = true; c.userData.noInk = true; c.onBeforeRender = T.tickWind; G.add(c);
    for (const s of [-1, 1]) { const pin = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.09, 0.03, 1, 0.01), plain('#a07a4a')); pin.position.copy(mid).add(V(Math.cos(ry) * s * w * 0.42, 0.01, -Math.sin(ry) * s * w * 0.42)); G.add(pin); }
    t += span + 0.04 + r() * 0.05; i++; }
  return G;
}

// ---------------------------------------------------------------- chimney smoke: cel puffs that rise, drift with the wind and thin out
let PUFF = null;
function puffTex() { return (PUFF ||= paint('puff', 128, 128, (g) => { const blobs = [[64, 70, 34], [40, 78, 24], [88, 80, 22], [56, 46, 24], [80, 52, 20]];
  for (const [x, y, rr] of blobs) { g.fillStyle = 'rgba(150,140,170,0.9)'; g.beginPath(); g.arc(x, y, rr + 2, 0, 7); g.fill(); }
  for (const [x, y, rr] of blobs) { g.fillStyle = '#d8d2e2'; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  for (const [x, y, rr] of blobs) { g.fillStyle = '#fbf8f2'; g.beginPath(); g.arc(x - rr * 0.22, y - rr * 0.25, rr * 0.7, 0, 7); g.fill(); } })); }
export function chimneySmoke(points, { n = 9, rate = 1 } = {}) {
  const G = new THREE.Group(); G.name = 'smoke'; const tex = puffTex(); const all = [];
  for (const [pi, base] of points.entries()) for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 })); s.userData.noInk = true; s.userData.base = base; s.userData.ph = i / n + pi * 0.37; s.material.rotation = i * 1.7; G.add(s); all.push(s); }
  const step = () => { const t = performance.now() / 1000; const wd = T.WIND.dir.value; for (const s of all) { const life = (t * 0.11 * rate + s.userData.ph) % 1; const b = s.userData.base; const up = life * 3.4; s.position.set(b.x + wd.x * life * life * 2.6 + Math.sin(t + s.userData.ph * 9) * 0.06, b.y + up, b.z + wd.y * life * life * 2.6); const sc = 0.32 + life * 1.3; s.scale.set(sc, sc, 1); s.material.opacity = Math.min(1, life * 6) * (1 - life) * 0.85; } };
  for (const s of all) s.frustumCulled = false; if (all[0]) all[0].onBeforeRender = step; step(); return G;
}

// ---------------------------------------------------------------- bridges and shrines
/** a hump-backed stone bridge spanning `span` along x, deck width w; origin = centre at bank height */
export function stoneBridge(span = 6, w = 2.2, seed = 2) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'stoneBridge'; const K = new Kit(); const R = (span / 2) * 0.85, Ry = 1.1, base = -0.5; const L = span + 1.2; const top = 0.85, bank = 0.2;
  const deckY = (x) => bank + (top - bank) * (1 - Math.pow((2 * x) / L, 2)); const slope = (x) => (-(top - bank) * 8 * x) / (L * L);
  for (const z of [-w / 2 + 0.22, w / 2 - 0.22]) { const n = 15; for (let i = 0; i <= n; i++) { const a = Math.PI - (i / n) * Math.PI; const nx = Math.cos(a) / R, ny = Math.sin(a) / Ry; K.box('stone', 0.4, 0.36, 0.46, V(Math.cos(a) * (R + 0.1), Math.sin(a) * (Ry + 0.1) + base, z), new THREE.Euler(0, 0, Math.atan2(ny, nx) - Math.PI / 2), 0.05); } }
  for (const z of [-w / 2 + 0.2, w / 2 - 0.2]) { const sh = new THREE.Shape(); sh.moveTo(-L / 2, base - 0.1); sh.lineTo(-L / 2, bank); sh.quadraticCurveTo(0, 2 * top - bank, L / 2, bank); sh.lineTo(L / 2, base - 0.1); sh.lineTo(R + 0.2, base - 0.1); sh.absellipse(0, base, R + 0.2, Ry + 0.2, 0, Math.PI, false); sh.lineTo(-L / 2, base - 0.1);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 18 }); eg.translate(0, 0, -0.18); K.add('rubble', eg, V(0, 0, z)); }
  const deckN = 16; for (let i = 0; i < deckN; i++) { const x = -L / 2 + (i + 0.5) * (L / deckN); const y = deckY(x); const rz = Math.atan(slope(x)); K.box('stone', L / deckN - 0.02, 0.16, w - 0.5, V(x, y + 0.05, 0), new THREE.Euler(0, 0, rz), 0.04);
    for (const z of [-w / 2 + 0.15, w / 2 - 0.15]) K.box('marble', L / deckN - 0.03, 0.42, 0.24, V(x, y + 0.3, z), new THREE.Euler(0, 0, rz + (r() - 0.5) * 0.03), 0.05); }
  K.build(G); return G;
}
/** a planked footbridge / jetty along x (length L), with posts and rope rails */
export function plankBridge(L = 6, w = 1.4, seed = 6, { rails = true, posts = 0.9 } = {}) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'plankBridge'; const K = new Kit();
  for (let x = -L / 2; x < L / 2; x += 0.24) K.box('woodRaw', 0.21, 0.06, w * (0.92 + r() * 0.08), V(x + 0.1, 0.0 + (r() - 0.5) * 0.02, (r() - 0.5) * 0.06), new THREE.Euler((r() - 0.5) * 0.04, (r() - 0.5) * 0.06, 0), 0.015);
  for (const z of [-w / 2 + 0.12, w / 2 - 0.12]) K.box('woodDark', L, 0.12, 0.12, V(0, -0.09, z), null, 0.02);
  const px = []; for (let x = -L / 2; x <= L / 2 + 0.01; x += L / Math.max(1, Math.round(L / 1.6))) px.push(x);
  for (const x of px) for (const z of [-w / 2, w / 2]) { K.box('woodDark', 0.14, posts + 1.0, 0.14, V(x, (posts + 1.0) / 2 - posts, z), new THREE.Euler((r() - 0.5) * 0.05, 0, (r() - 0.5) * 0.05), 0.03); }
  if (rails) for (const z of [-w / 2, w / 2]) for (let i = 1; i < px.length; i++) { const a = V(px[i - 1], 0.95, z), b = V(px[i], 0.95, z); const c = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(V(0, -0.14, 0)), b); K.add('plain:#c8b088', new THREE.TubeGeometry(c, 10, 0.025, 5), V()); }
  K.build(G); return G;
}
/** a roadside shrine (kandylaki): a stone post carrying a tiny whitewashed chapel with a tiled roof and an oil lamp */
export function shrine(seed = 8) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'shrine'; const K = new Kit(); const tiles = new Tiles();
  K.box('rubble', 0.5, 1.0, 0.5, V(0, 0.5, 0), null, 0.05); K.box('marble', 0.62, 0.08, 0.6, V(0, 1.04, 0), null, 0.03);
  K.box('plaster', 0.56, 0.52, 0.46, V(0, 1.34, 0), null, 0.05); K.box('plain:#1e2a4a', 0.3, 0.32, 0.03, V(0, 1.33, 0.23), null, 0.01); K.box('woodBlue', 0.36, 0.04, 0.05, V(0, 1.51, 0.24), null, 0.01); K.box('woodBlue', 0.36, 0.04, 0.05, V(0, 1.15, 0.24), null, 0.01);
  const pitch = 0.6, half = 0.32, rise = Math.tan(pitch) * half; for (const s of [-1, 1]) { tiles.slope(V(-0.36, 1.6, s * half), V(1, 0, 0), V(0, rise, -s * half).normalize(), 0.72, half / Math.cos(pitch), r); K.box('plain:#5a3222', 0.74, 0.04, half / Math.cos(pitch), V(0, 1.6 + rise / 2, s * half / 2), new THREE.Euler(s * pitch, 0, 0), 0.015); }
  tiles.ridge(V(-0.36, 1.6 + rise + 0.12, 0), V(0.36, 1.6 + rise + 0.12, 0), r); K.add('plain:#c8a040', new THREE.CylinderGeometry(0.012, 0.012, 0.22, 5), V(0, 1.6 + rise + 0.16, 0)); K.add('plain:#c8a040', new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5).rotateZ(Math.PI / 2), V(0, 1.6 + rise + 0.2, 0));
  K.build(G); G.add(tiles.build('shrineTiles'));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.6), toneMapped: false })); lamp.position.set(0, 1.26, 0.2); lamp.userData.noInk = true; G.add(lamp);
  const pl = new THREE.PointLight(0xffa850, 0.6, 2.5, 2); pl.position.set(0, 1.3, 0.35); G.add(pl); return G;
}
/** a small round temple (tholos) with fluted columns, a stepped base and a tiled cone roof (the oracle's shrine) */
export function tholos(seed = 12, { R = 2.4, n = 10, h = 3.4 } = {}) {
  const r = mulberry32(seed); const G = new THREE.Group(); G.name = 'tholos'; const K = new Kit();
  for (let i = 0; i < 3; i++) K.add('marble', new THREE.CylinderGeometry(R + 0.9 - i * 0.3, R + 0.95 - i * 0.3, 0.22, 40), V(0, 0.11 + i * 0.22, 0));
  const col = new THREE.LatheGeometry([[0.01, 0], [0.3, 0], [0.3, 0.1], [0.24, 0.16], [0.22, 0.3], [0.19, h - 0.4], [0.24, h - 0.26], [0.3, h - 0.18], [0.3, h - 0.08], [0.01, h - 0.08]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
  const cp = col.attributes.position; for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), z = cp.getZ(i), y = cp.getY(i); if (y > 0.3 && y < h - 0.4) { const a = Math.atan2(z, x); const k = 1 - 0.07 * Math.max(0, Math.cos(a * 8)); cp.setX(i, x * k); cp.setZ(i, z * k); } } col.computeVertexNormals();
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const broken = r() < 0.15; const g2 = broken ? col.clone().scale(1, 0.55 + r() * 0.2, 1) : col; K.add('marble|keepuv', g2, V(Math.cos(a) * R, 0.66, Math.sin(a) * R)); }
  K.add('marble', new THREE.CylinderGeometry(R + 0.42, R + 0.42, 0.42, 40, 1, true), V(0, 0.66 + h - 0.08 + 0.21, 0)); K.add('marble', new THREE.CylinderGeometry(R + 0.5, R + 0.5, 0.12, 40), V(0, 0.66 + h + 0.18, 0));
  K.add('stone', new THREE.CylinderGeometry(R - 0.5, R - 0.5, h, 30, 1, true), V(0, 0.66 + h / 2, 0)); // cella wall
  const roof = new THREE.LatheGeometry([[R + 0.55, 0], [R * 0.6, 0.7], [0.3, 1.25], [0.01, 1.32]].map(([a, b]) => new THREE.Vector2(a, b)), 40); const ru = roof.attributes.uv; for (let i = 0; i < ru.count; i++) ru.setXY(i, ru.getX(i) * 24, ru.getY(i) * 6);
  K.build(G); const rm = new THREE.Mesh(roof, mat('tile', { side: THREE.DoubleSide })); rm.position.y = 0.66 + h + 0.24; rm.castShadow = rm.receiveShadow = true; G.add(rm); return G;
}
