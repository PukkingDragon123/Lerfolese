// Carved chess-inspired map pieces and desk clutter for the physical tabletop map: smooth turned profiles (lathe,
// many segments), bevelled carved silhouettes (knight's head, rook battlements, king's cross), felt bases, engraved
// brass symbols, and realistic PBR-ish materials (polished walnut, ebony, marble, brass, glass, wax, felt).
import * as THREE from 'three';
import { loadPBR } from '../gfx/assets.js';

const V2 = THREE.Vector2; const TAU = Math.PI * 2;
const lathe = (pts, seg = 64) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new V2(Math.max(r, 1e-4), y)), seg); g.computeVertexNormals(); return g; };
const arc = (cx, cy, r, a0, a1, n = 10) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
const extrude = (shape, depth, bevel = 0.02) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 5, curveSegments: 24 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g; };
const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent?.add(m); return m; };

// ---------------------------------------------------------------- materials
let woodMaps = null, marbleMaps = null;
function withMaps(mat, which) { const p = which === 'wood' ? (woodMaps ||= loadPBR('wood_dark', { repeat: [1, 2] })) : (marbleMaps ||= loadPBR('marble_weathered', { repeat: 1 })); p.then((src) => { mat.map = src.map; mat.roughnessMap = null; mat.normalMap = src.normalMap; mat.normalScale = new V2(0.35, 0.35); mat.needsUpdate = true; }).catch(() => {}); return mat; }
export const MAT = {
  walnut: () => withMaps(new THREE.MeshPhysicalMaterial({ color: '#ffc896', roughness: 0.34, clearcoat: 0.85, clearcoatRoughness: 0.22 }), 'wood'),
  ebony: () => new THREE.MeshPhysicalMaterial({ color: '#1c1512', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }),
  marble: () => withMaps(new THREE.MeshPhysicalMaterial({ color: '#f4eee4', roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.15 }), 'marble'),
  brass: () => new THREE.MeshStandardMaterial({ color: '#c8913c', metalness: 1, roughness: 0.27 }),
  gold: () => new THREE.MeshStandardMaterial({ color: '#e8b452', metalness: 1, roughness: 0.2 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: '#bfe8e2', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1, depthWrite: false }),
  felt: (c = '#1f3f2c') => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }),
  wax: () => new THREE.MeshPhysicalMaterial({ color: '#efe2c4', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#fff2d8') }),
  sealWax: () => new THREE.MeshPhysicalMaterial({ color: '#8e1518', roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
};

// ---------------------------------------------------------------- engraved symbols (canvas, used as small inlaid plates / bump maps)
function engraving(kind, size = 128, { fg = '#2a160a', bg = null, width = 9 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const s = size / 128;
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
  g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = width * s; g.lineCap = 'round'; g.lineJoin = 'round'; g.scale(s, s);
  const L = (...p) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.stroke(); };
  if (kind === 'battle') { L(30, 98, 98, 30); L(30, 30, 98, 98); L(22, 82, 46, 106); L(82, 106, 106, 82); }
  else if (kind === 'elite') { g.beginPath(); g.ellipse(64, 66, 26, 30, 0, 0, TAU); g.stroke(); L(40, 46, 22, 26); L(88, 46, 106, 26); g.beginPath(); g.arc(54, 62, 6, 0, TAU); g.arc(74, 62, 6, 0, TAU); g.fill(); L(58, 84, 70, 84); }
  else if (kind === 'event') { g.beginPath(); g.arc(64, 46, 22, Math.PI * 1.05, Math.PI * 0.35, false); g.lineTo(64, 78); g.stroke(); g.beginPath(); g.arc(64, 98, 7, 0, TAU); g.fill(); }
  else if (kind === 'shop') { g.beginPath(); g.arc(64, 64, 34, 0, TAU); g.stroke(); g.font = '700 54px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ω', 64, 68); }
  else if (kind === 'lab') { L(54, 26, 54, 54, 32, 96, 96, 96, 74, 54, 74, 26); L(48, 26, 80, 26); L(42, 80, 86, 80); }
  else if (kind === 'guardian') { L(26, 92, 34, 46, 50, 70, 64, 36, 78, 70, 94, 46, 102, 92, 26, 92); }
  else if (kind === 'owl') { g.beginPath(); g.ellipse(64, 70, 28, 34, 0, 0, TAU); g.stroke(); g.beginPath(); g.arc(52, 58, 9, 0, TAU); g.arc(76, 58, 9, 0, TAU); g.stroke(); L(64, 66, 60, 74, 68, 74, 64, 66); L(44, 38, 52, 48); L(84, 38, 76, 48); }
  else if (kind === 'sigil') { g.beginPath(); g.arc(64, 64, 40, 0, TAU); g.stroke(); g.font = 'italic 700 64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', 64, 68); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function plate(kind, w = 0.15) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshStandardMaterial({ map: engraving(kind), transparent: true, alphaTest: 0.35, roughness: 0.6, metalness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.renderOrder = 2; return m; }

// ---------------------------------------------------------------- the pieces
const BASE = [[0, 0], [0.36, 0], [0.372, 0.018], [0.372, 0.068], [0.345, 0.088], [0.355, 0.105], [0.33, 0.13]];
const PROFILES = {
  pawn: [...BASE, [0.27, 0.16], [0.2, 0.22], [0.16, 0.32], [0.13, 0.44], [0.12, 0.5], [0.2, 0.53], [0.205, 0.565], [0.13, 0.595], ...arc(0, 0.735, 0.15, -1.1, Math.PI / 2, 12)],
  bishop: [...BASE, [0.26, 0.16], [0.18, 0.24], [0.14, 0.4], [0.115, 0.62], [0.21, 0.66], [0.215, 0.7], [0.12, 0.73], [0.15, 0.78], [0.172, 0.86], [0.16, 0.95], [0.12, 1.03], [0.065, 1.085], [0.035, 1.105], ...arc(0, 1.15, 0.05, -1.2, Math.PI / 2, 8)],
  rook: [...BASE, [0.29, 0.16], [0.245, 0.22], [0.215, 0.6], [0.25, 0.66], [0.305, 0.7], [0.305, 0.86], [0.21, 0.86], [0.21, 0.8], [0, 0.8]],
  king: [...BASE, [0.28, 0.16], [0.2, 0.25], [0.16, 0.5], [0.135, 0.85], [0.24, 0.9], [0.245, 0.95], [0.15, 0.98], [0.18, 1.05], [0.225, 1.17], [0.2, 1.21], [0.1, 1.24], [0, 1.24]],
  queen: [...BASE, [0.28, 0.16], [0.2, 0.25], [0.15, 0.5], [0.13, 0.8], [0.22, 0.85], [0.225, 0.9], [0.14, 0.93], [0.17, 1.0], [0.245, 1.12], [0.2, 1.145], [0.12, 1.12], [0, 1.13]],
  knight: [...BASE, [0.3, 0.16], [0.285, 0.2], [0, 0.2]],
  flask: [...BASE, [0.3, 0.15], [0, 0.15]],
};
function horseHead() {
  const s = new THREE.Shape(); s.moveTo(-0.18, 0); s.lineTo(0.2, 0);
  s.bezierCurveTo(0.22, 0.12, 0.12, 0.18, 0.16, 0.26); s.bezierCurveTo(0.24, 0.3, 0.3, 0.32, 0.31, 0.37); s.bezierCurveTo(0.32, 0.42, 0.28, 0.45, 0.22, 0.46);
  s.bezierCurveTo(0.14, 0.5, 0.08, 0.55, 0.05, 0.6); s.lineTo(0.065, 0.69); s.lineTo(0.0, 0.635); s.bezierCurveTo(-0.12, 0.6, -0.2, 0.5, -0.21, 0.36); s.bezierCurveTo(-0.22, 0.2, -0.2, 0.1, -0.18, 0);
  return extrude(s, 0.18, 0.035);
}
function merlon(a0, a1, r0 = 0.21, r1 = 0.305) { const s = new THREE.Shape(); s.absarc(0, 0, r1, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true); const g = extrude(s, 0.12, 0.012); g.rotateX(-Math.PI / 2); return g; }
function cross() { const s = new THREE.Shape(); const w = 0.035; s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, 0.12); s.lineTo(0.09, 0.12); s.lineTo(0.09, 0.18); s.lineTo(w, 0.18); s.lineTo(w, 0.26); s.lineTo(-w, 0.26); s.lineTo(-w, 0.18); s.lineTo(-0.09, 0.18); s.lineTo(-0.09, 0.12); s.lineTo(-w, 0.12); s.closePath(); return extrude(s, 0.05, 0.015); }

const LOOK = {
  battle: { kind: 'pawn', mat: 'walnut', felt: '#1f3f2c', s: 1.05 }, elite: { kind: 'knight', mat: 'ebony', felt: '#4a1418', s: 1.2 }, event: { kind: 'bishop', mat: 'marble', felt: '#1c2f4a', s: 1.12 },
  shop: { kind: 'rook', mat: 'brass', felt: '#1f3f2c', s: 1.1 }, lab: { kind: 'flask', mat: 'brass', felt: '#2a1f48', s: 1.15 }, guardian: { kind: 'king', mat: 'ebony', felt: '#4a1418', s: 1.75 }, isaac: { kind: 'queen', mat: 'gold', felt: '#6a1418', s: 1.05 },
};
/** a carved piece for a node type ('battle'|'elite'|'event'|'shop'|'lab'|'guardian') or 'isaac'. Returns { root, body, mats } */
export function makePiece(type) {
  const L = LOOK[type] || LOOK.battle; const root = new THREE.Group(); root.name = 'piece:' + type; const body = new THREE.Group(); root.add(body); body.scale.setScalar(L.s);
  const m = MAT[L.mat](); const mats = [m];
  mesh(lathe([[0, 0], [0.4, 0], [0.405, 0.012], [0.4, 0.024], [0, 0.024]]), MAT.felt(L.felt), body); body.children[0].castShadow = false;
  const top = new THREE.Group(); top.position.y = 0.024; body.add(top);
  mesh(lathe(PROFILES[L.kind]), m, top);
  if (L.kind === 'rook') for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; mesh(merlon(a + 0.12, a + TAU / 6 - 0.12), m, top, 0, 0.86, 0); }
  if (L.kind === 'king') { const g = MAT.gold(); mats.push(g); mesh(cross(), g, top, 0, 1.24, 0); }
  if (L.kind === 'queen') { for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; mesh(new THREE.SphereGeometry(0.032, 16, 12), m, top, Math.cos(a) * 0.23, 1.15, Math.sin(a) * 0.23); } mesh(new THREE.SphereGeometry(0.055, 20, 14), m, top, 0, 1.2, 0); }
  if (L.kind === 'knight') { const h = mesh(horseHead(), m, top, 0, 0.2, 0); h.rotation.y = -0.65; h.scale.setScalar(1.05); }
  if (L.kind === 'flask') { const gl = MAT.glass(); const liq = new THREE.MeshStandardMaterial({ color: '#2fb8a8', emissive: '#0f6a60', emissiveIntensity: 0.6, roughness: 0.2 }); mats.push(liq);
    const body2 = lathe([[0, 0.15], [0.2, 0.16], [0.28, 0.26], [0.29, 0.38], [0.22, 0.5], [0.09, 0.57], [0.075, 0.82], [0.095, 0.84], [0.095, 0.87], [0, 0.87]]); const gm = mesh(body2, gl, top); gm.castShadow = false; gm.renderOrder = 3;
    mesh(lathe([[0, 0.16], [0.18, 0.17], [0.25, 0.26], [0.25, 0.34], [0.21, 0.41], [0, 0.41]]), liq, top); mesh(lathe([[0, 0.84], [0.07, 0.84], [0.085, 0.92], [0.06, 0.95], [0, 0.95]]), MAT.walnut(), top); }
  const pl = plate(type === 'isaac' ? 'sigil' : type); pl.position.set(0, 0.07, 0.376); top.add(pl);
  return { root, body, mats };
}

// ---------------------------------------------------------------- desk clutter
function flameSprite() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 84, 2, 32, 76, 46); grd.addColorStop(0, 'rgba(255,255,230,1)'); grd.addColorStop(0.25, 'rgba(255,214,120,0.95)'); grd.addColorStop(0.6, 'rgba(255,130,40,0.55)'); grd.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = grd; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(52, 50, 54, 92, 32, 118); g.bezierCurveTo(10, 92, 12, 50, 32, 4); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
}
let FLAME = null;
export function candle({ h = 0.9, light = true } = {}) {
  const g = new THREE.Group(); g.name = 'candle'; const brass = MAT.brass();
  mesh(lathe([[0, 0], [0.34, 0], [0.36, 0.02], [0.33, 0.05], [0.12, 0.06], [0.1, 0.1], [0.14, 0.13], [0.14, 0.16], [0, 0.16]]), brass, g);
  const ring = mesh(new THREE.TorusGeometry(0.1, 0.02, 12, 40), brass, g, 0.36, 0.05, 0); ring.rotation.x = Math.PI / 2;
  mesh(lathe([[0, 0.16], [0.085, 0.16], [0.088, 0.16 + h * 0.85], [0.08, 0.16 + h * 0.97], [0.05, 0.16 + h], [0, 0.16 + h - 0.01]], 40), MAT.wax(), g);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; const d = mesh(new THREE.CapsuleGeometry(0.018, 0.12 + i * 0.05, 6, 12), MAT.wax(), g, Math.cos(a) * 0.085, 0.16 + h * (0.78 - i * 0.12), Math.sin(a) * 0.085); d.castShadow = false; }
  mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.06, 8), new THREE.MeshStandardMaterial({ color: '#1a1210' }), g, 0, 0.16 + h + 0.02, 0);
  const fl = new THREE.Sprite(FLAME ||= flameSprite()); fl.scale.set(0.13, 0.26, 1); fl.position.y = 0.16 + h + 0.13; fl.userData.noInk = true; fl.userData.noAO = true; g.add(fl);
  if (light) { const l = new THREE.PointLight(0xffa858, 5.5, 8, 1.5); l.position.y = 0.16 + h + 0.3; g.add(l); g.userData.light = l; }
  g.userData.flame = fl; return g;
}
function compass() {
  const g = new THREE.Group(); g.name = 'compass'; const b = MAT.brass();
  mesh(lathe([[0, 0], [0.6, 0], [0.64, 0.03], [0.65, 0.12], [0.6, 0.17], [0.56, 0.15], [0, 0.15]]), b, g);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#efe2c0'; x.beginPath(); x.arc(128, 128, 126, 0, TAU); x.fill(); x.strokeStyle = '#3a2410'; x.lineWidth = 3; for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; x.beginPath(); x.moveTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); x.lineTo(128 + Math.cos(a) * (i % 4 ? 102 : 92), 128 + Math.sin(a) * (i % 4 ? 102 : 92)); x.stroke(); }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU - Math.PI / 2; const r = k % 2 ? 50 : 86; x.fillStyle = k % 2 ? '#7a5a34' : k === 0 ? '#8a1e18' : '#3a2410'; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a - 0.2) * 22, 128 + Math.sin(a - 0.2) * 22); x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); x.lineTo(128 + Math.cos(a + 0.2) * 22, 128 + Math.sin(a + 0.2) * 22); x.closePath(); x.fill(); }
  x.font = '700 28px serif'; x.fillStyle = '#3a2410'; x.textAlign = 'center'; x.fillText('N', 128, 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const face = mesh(new THREE.CircleGeometry(0.56, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), g, 0, 0.152, 0); face.castShadow = false;
  const needle = new THREE.Shape(); needle.moveTo(0, -0.42); needle.lineTo(0.04, 0); needle.lineTo(0, 0.42); needle.lineTo(-0.04, 0); needle.closePath(); const n = mesh(extrude(needle, 0.012, 0.004), new THREE.MeshStandardMaterial({ color: '#7a1414', metalness: 0.6, roughness: 0.35 }), g, 0, 0.18, 0); n.rotation.x = -Math.PI / 2; n.rotation.z = 0.4;
  const dome = mesh(lathe([[0.58, 0.15], [0.5, 0.21], [0.3, 0.25], [0, 0.26]], 64), MAT.glass(), g); dome.castShadow = false; dome.renderOrder = 3;
  const hinge = mesh(new THREE.TorusGeometry(0.09, 0.025, 12, 32), b, g, 0, 0.09, -0.7); void hinge; return g;
}
function inkwellQuill() {
  const g = new THREE.Group(); g.name = 'inkwell';
  mesh(lathe([[0, 0], [0.3, 0], [0.33, 0.04], [0.3, 0.26], [0.2, 0.34], [0.12, 0.37], [0.12, 0.44], [0.15, 0.46], [0.15, 0.48], [0.1, 0.48], [0.1, 0.4], [0, 0.4]]), new THREE.MeshPhysicalMaterial({ color: '#141a24', roughness: 0.08, clearcoat: 1 }), g);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.18, 0.95, 0.05), new THREE.Vector3(0.42, 1.55, 0.12), new THREE.Vector3(0.7, 1.95, 0.2)]);
  mesh(new THREE.TubeGeometry(curve, 48, 0.014, 10), new THREE.MeshStandardMaterial({ color: '#efe6d4', roughness: 0.5 }), g);
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f4ecdc'; x.beginPath(); x.moveTo(32, 0); x.bezierCurveTo(64, 60, 60, 200, 34, 256); x.lineTo(30, 256); x.bezierCurveTo(6, 190, 2, 60, 32, 0); x.fill(); x.strokeStyle = 'rgba(120,100,80,0.5)'; x.lineWidth = 1; for (let y = 10; y < 250; y += 4) { x.beginPath(); x.moveTo(32, y); x.lineTo(y % 8 ? 8 : 56, y - 14); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const vane = new THREE.PlaneGeometry(0.26, 1.15, 1, 12); const p = vane.attributes.position; for (let i = 0; i < p.count; i++) { const v = (p.getY(i) + 0.575) / 1.15; const pt = curve.getPoint(0.35 + v * 0.65); p.setXYZ(i, pt.x + p.getX(i) * 0.9, pt.y, pt.z + p.getX(i) * 0.25); } vane.computeVertexNormals();
  const vm = mesh(vane, new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), g); vm.userData.noInk = true; return g;
}
function magnifier() {
  const g = new THREE.Group(); g.name = 'magnifier'; const b = MAT.brass();
  const rim = mesh(new THREE.TorusGeometry(0.48, 0.045, 20, 96), b, g, 0, 0.06, 0); rim.rotation.x = Math.PI / 2;
  const lens = mesh(lathe([[0, -0.03], [0.46, -0.008], [0.46, 0.008], [0, 0.03]], 64), MAT.glass(), g, 0, 0.06, 0); lens.castShadow = false; lens.renderOrder = 3;
  const h = mesh(lathe([[0, 0], [0.06, 0], [0.075, 0.1], [0.06, 0.12], [0.07, 0.62], [0.05, 0.7], [0, 0.72]], 32), MAT.walnut(), g, 0.52, 0.06, 0); h.rotation.z = -Math.PI / 2;
  mesh(lathe([[0.065, 0], [0.075, 0], [0.075, 0.12], [0.065, 0.12]], 32), b, g, 0.5, 0.06, 0).rotation.z = -Math.PI / 2; return g;
}
function bumpTex(kind) { const t = engraving(kind, 128, { fg: '#ffffff', bg: '#7a7a7a', width: 10 }); t.colorSpace = THREE.NoColorSpace; return t; }
function seal() { const m = MAT.sealWax(); m.bumpMap = bumpTex('sigil'); m.bumpScale = 3; const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([0.22 * (1 - t * t * 0.3) + (i < 3 ? 0.012 * Math.sin(i * 3) : 0), 0.055 * Math.sin(t * Math.PI * 0.5) + 0.005]); } pts.unshift([0, 0]); pts.push([0, 0.06]); const g = new THREE.Group(); g.name = 'seal'; mesh(lathe(pts, 48), m, g); return g; }
let COIN = null;
function coin() { COIN ||= (() => { const m = MAT.gold(); m.bumpMap = bumpTex('owl'); m.bumpScale = 2.4; return m; })(); const g = new THREE.Group(); g.name = 'coin'; mesh(lathe([[0, 0], [0.14, 0], [0.146, 0.008], [0.146, 0.018], [0.14, 0.024], [0, 0.024]], 40), COIN, g); return g; }
export function coinPile(n = 7, rnd = Math.random) { const g = new THREE.Group(); g.name = 'coins'; let stack = 0; for (let i = 0; i < n; i++) { const c = coin(); if (i < 4) { c.position.set(0, stack, 0); c.rotation.y = rnd(); stack += 0.025; } else { const a = rnd() * TAU, d = 0.25 + rnd() * 0.3; c.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); c.rotation.set((rnd() - 0.5) * 0.2, rnd() * TAU, (rnd() - 0.5) * 0.2); } g.add(c); } return g; }
/** desk clutter laid along both sides of the map sheet (x beyond ±xEdge), every few metres down its length */
export function deskClutter({ xEdge = 9.4, zTop = 3, zBottom = -32, rnd = Math.random } = {}) {
  const g = new THREE.Group(); g.name = 'deskClutter'; const candles = [];
  const items = [() => compass(), () => inkwellQuill(), () => magnifier(), () => coinPile(8, rnd), () => seal(), () => { const c = candle({ h: 0.8 + rnd() * 0.5 }); candles.push(c); return c; }];
  let k = 0;
  for (let z = zTop - 1; z > zBottom; z -= 3.4) for (const side of [-1, 1]) {
    const make = items[(k++ + (side > 0 ? 3 : 0)) % items.length]; const o = make(); const name = o.name;
    const x = side * (xEdge + (name === 'compass' ? 1.1 : name === 'magnifier' ? 1.2 : 0.8) + rnd() * 0.5); o.position.set(x, 0, z + (rnd() - 0.5) * 1.2); o.rotation.y = rnd() * TAU; const s = { compass: 1.1, inkwell: 0.9, magnifier: 1.1, coins: 1.4, seal: 1.5, candle: 1 }[name] ?? 1; o.scale.setScalar(s); g.add(o);
  }
  return { group: g, candles };
}
export { seal as waxSeal, coinPile as coins };
