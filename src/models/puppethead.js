// Sir Isaac's head: a REAL scanned carved bust (Poly Haven "Marble Bust 01", CC0; head cut out, turned frontal,
// see assets/characters/CREDITS.md) repainted as a polychrome carved-oak portrait of an old Newton: skin paint worn
// thin over the oak (grain also in a bump map), realistic eyes (iris, pupil, wet highlight), white brows, thin lips,
// ruddy nose and cheeks, painted age lines, the carved curls whitened. The jaw is cut along the marionette lines and
// hinges open onto a mouth-shaped dark cavity with teeth. Volumetric wavy white locks (tapered tubes with curl,
// root-to-tip gradient, shaded undersides) grow from the carved scalp. Expressions repaint only the face texels.
import * as THREE from 'three';
import * as K from './charkit.js';

K.need('bust_head').catch(() => {});
// landmarks of bust_head.glb (metres, its own frame; facing +Z)
const MX = -0.008; const L = { eyeY: 0.383, eyeX: 0.03, mouthY: 0.319, mouthW: 0.022, noseY: 0.346, chinY: 0.288, top: 0.515, neckY: 0.272 };
const HINGE = new THREE.Vector3(MX, 0.334, 0.06);
const inJaw = (x, y, z) => z > 0.09 && y < L.mouthY + 0.0005 && y > 0.262 && Math.abs(x - MX) < L.mouthW + 0.004 + (L.mouthY - y) * 0.16;
export const EXPR = {
  smug: { b: [-0.35, 0.25], lid: 0.28, m: 0.3, asym: 1.0 }, delight: { b: [0.5, 0.45], lid: 0.05, m: 0.9, asym: 0 }, annoyed: { b: [-0.9, -0.2], lid: 0.42, m: -0.6, asym: 0 },
  hurt: { b: [0.9, -0.5], lid: 0.48, m: -0.85, asym: 0 }, shock: { b: [0.9, 0.9], lid: -0.2, m: -0.2, asym: 0 }, think: { b: [0.45, -0.3], lid: 0.3, m: -0.25, asym: -0.7 }, blink: { b: [0, 0.2], lid: 1.1, m: 0.2, asym: 0 },
};
// anime cel palette: flat tones, crisp shapes, no gradients
const SKIN = [248, 218, 190], SKIN2 = [226, 182, 160], SKIN3 = [196, 140, 126], BLUSH = [244, 178, 160], IRIS = [90, 220, 255], IRIS2 = [30, 96, 170], LIP = [214, 140, 132], WHITE = [236, 240, 252], WHITE2 = [168, 178, 214], INK = [40, 22, 30], WOOD = [176, 108, 62];
const set = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
function painter(E) {
  return (c, o) => {
    const X = c.x - MX, ax = Math.abs(X), sx = X >= 0 ? 1 : -1, Y = c.y; const col = o.col; set(col, SKIN);
    const hair = Y > 0.432 + Math.max(0, 0.07 - ax) * 0.25 || (c.z < 0.03 && Y > 0.33) || (ax > 0.075 && Y > 0.37 && c.z < 0.07);
    if (hair) { set(col, c.ny < -0.1 || (c.nx * sx > 0.55 && c.ny < 0.3) ? WHITE2 : WHITE); return; }
    if (c.z < 0.06) { if (c.ny < -0.3) set(col, SKIN2); return; }
    if (c.ny < -0.45 && Y < 0.35) set(col, SKIN2); // crisp shadow shapes under the nose, lip and jaw
    if (ax > 0.012 && ax < 0.021 && Y > 0.338 && Y < 0.372 && sx < 0 && c.nx < -0.3) set(col, SKIN2); // nose side tick
    if (Math.hypot((ax - 0.046) / 1.6, Y - 0.352) < 0.007 && ((ax * 900 + Y * 300) % 1) < 0.25) set(col, BLUSH); // faint blush strokes
    
    // eyes: almond, thick upper lash line with a wing, big two-tone iris, pupil, two crisp highlights
    const ex = ax - L.eyeX, ey = Y - L.eyeY; const lidY = 0.0036 - E.lid * 0.0078; const open = ey < lidY - Math.max(0, -ex * sx) * 0.12 && ey > -0.0036 + ex * ex * 22;
    if (Math.abs(ex) < 0.0115 && open) {
      const ir = Math.hypot(ex - 0.0006 * sx, (ey + 0.0002) * 0.9);
      if (ir < 0.0058) { set(col, ey > lidY - 0.0026 || ir > 0.0046 ? IRIS2 : IRIS); if (ir < 0.0024) set(col, [16, 14, 24]); }
      else set(col, ex * sx > 0.006 ? [236, 230, 236] : WHITE);
      if (Math.hypot(ex + 0.0018 * sx, ey - 0.0015) < 0.0012 || Math.hypot(ex - 0.0016 * sx, ey + 0.0021) < 0.0006) set(col, [255, 255, 255]);
      return;
    }
    if (Math.abs(ex) < 0.0125 && ey >= lidY - Math.max(0, -ex * sx) * 0.12 && ey < lidY + 0.002 + Math.max(0, ex * sx) * 0.16) { set(col, INK); return; } // bold upper lash line, sharp wing
    if (ex * sx > 0.008 && ex * sx < 0.014 && Math.abs(ey - lidY - (ex * sx - 0.008) * 0.35) < 0.0011) { set(col, INK); return; }
    if (Math.abs(ex) < 0.009 && Math.abs(ey + 0.0049 - ex * ex * 18) < 0.0006) set(col, SKIN3); // lower lid
    
    const bt = (ax - 0.012) / 0.042; // brows: crisp white shapes with a grey underside
    if (bt > 0 && bt < 1) { const by = 0.396 + (bt - 0.5) * 0.004 - (ax - 0.03) * (ax - 0.03) * 3 + (E.b[0] * (1 - bt) + E.b[1] * bt) * 0.005 + sx * E.asym * 0.0028 * bt; const hw = 0.0042 * (1 - bt * 0.4) + 0.0006;
      if (Math.abs(Y - by) < hw) { set(col, Y < by - hw * 0.35 ? WHITE2 : WHITE); return; } }
    if (Math.hypot(ax - 0.0085, Y - 0.3385) < 0.0026 && c.ny < 0.1) set(col, [120, 70, 64]); // nostrils
    const mw = L.mouthW, mc = L.mouthY + E.m * 0.003 * Math.min(1, ax / mw) ** 2 + sx * E.asym * 0.0022 * (ax / mw) ** 2;
    if (ax < mw && Math.abs(Y - mc) < 0.0009) set(col, INK); else if (ax < mw * 0.9 && Y > mc && Y < mc + 0.0042 * (1 - (ax / mw) ** 2)) set(col, LIP); else if (ax < mw * 0.5 && Y < mc - 0.0025 && Y > mc - 0.0045) set(col, [236, 170, 156]);
    if (Math.abs(ax - (L.mouthW + 0.004 + (L.mouthY - Y) * 0.16)) < 0.001 && Y < L.mouthY && Y > 0.262 && c.z > 0.09) set(col, [92, 52, 40]); // marionette jaw seams
    void WOOD;
  };
}
let FACEGRAD = null;
const faceGradient = () => { if (!FACEGRAD) { FACEGRAD = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 228, 228, 228, 255]), 2, 1, THREE.RGBAFormat); FACEGRAD.minFilter = FACEGRAD.magFilter = THREE.NearestFilter; FACEGRAD.generateMipmaps = false; FACEGRAD.needsUpdate = true; } return FACEGRAD; };

let RES = null;
function resources() {
  if (RES) return RES;
  const gl = K.LIB.bust_head; let src = null; gl.scene.traverse((o) => { if (!src && o.isMesh) src = o; });
  const geo = src.geometry.clone(); { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); const k = Math.min(1, Math.max(0, (L.mouthY + 0.02 - y) / 0.06)); if (k > 0 && z > -0.03) { p.setX(i, MX + (p.getX(i) - MX) * (1 - 0.2 * k)); p.setZ(i, z + 0.004 * k); } const c = Math.max(0, 1 - Math.hypot((Math.abs(p.getX(i) - MX) - 0.05) / 0.03, (y - 0.345) / 0.03)); if (z > 0.05) p.setX(i, p.getX(i) - Math.sign(p.getX(i) - MX) * 0.004 * c); } } geo.computeVertexNormals(); // young, sharp V-jaw + leaner cheeks
  const S = K.surface('bust', { geometry: geo, isSkinnedMesh: false }, 1024);
  const res = K.paintSurface(S, painter(EXPR.smug));
  // oak grain bump
  const mat = new THREE.MeshToonMaterial({ map: K.canvasTex(res.canvas), gradientMap: faceGradient() }); // anime cel: one crisp shadow band
  // face texels only, for fast expression repaints (cached per expression)
  const sel = []; for (let i = 0; i < S.n; i++) { const x = S.P[i * 3] - MX, y = S.P[i * 3 + 1], z = S.P[i * 3 + 2]; if (z > 0.06 && y > 0.29 && y < 0.43 && Math.abs(x) < 0.07) sel.push(i); }
  const pick = (A, k) => { const out = new A.constructor(sel.length * k); sel.forEach((s, j) => { for (let q = 0; q < k; q++) out[j * k + q] = A[s * k + q]; }); return out; };
  const FS = { ...S, n: sel.length, off: pick(S.off, 1), P: pick(S.P, 3), N: pick(S.N, 3), B: pick(S.B, 1) };
  const cache = new Map(); let cur = 'smug';
  const setFace = (name) => { if (name === cur || !EXPR[name]) return; cur = name; const ctx = res.canvas.getContext('2d');
    if (!cache.has(name)) { const [x0, y0, x1, y1] = K.paintSurface(FS, painter(EXPR[name]), { into: res }).rect; cache.set(name, { x0, y0, d: ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1) }); }
    else { const f = cache.get(name); ctx.putImageData(f.d, f.x0, f.y0); } mat.map.needsUpdate = true; };
  // split off the marionette jaw (triangles by centroid), shift everything so the neck stump sits at the origin
  const pos = geo.attributes.position, idx = geo.index.array; const hi = [], ji = [];
  for (let t = 0; t < idx.length; t += 3) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { x += pos.getX(idx[t + k]); y += pos.getY(idx[t + k]); z += pos.getZ(idx[t + k]); } (inJaw(x / 3, y / 3, z / 3) ? ji : hi).push(idx[t], idx[t + 1], idx[t + 2]); }
  const mk = (list) => { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) g.setAttribute(k, geo.attributes[k]); g.setIndex(list); return g; };
  RES = { head: mk(hi), jaw: mk(ji), mat, setFace, cur: () => cur };
  return RES;
}

function mouthCavity() { // a mouth-shaped dark pocket behind the lips with an upper row of teeth
  const g = new THREE.Group();
  const m = K.uvMat('mouth-cavity', 64, 32, (u, v, o) => { if (Math.cos(u * Math.PI * 2) > 0.55 && v > 0.15 && v < 0.85) { K.tone([236, 226, 206], 0.6, o.col); if (((v * 9) % 1) < 0.12) K.tone([150, 130, 120], 0.5, o.col); } else K.tone([70, 18, 26], 0.4, o.col); });
  K.mesh(new K.Loft(14, 12).set((t, p) => p.set(MX - L.mouthW + t * L.mouthW * 2, L.mouthY - 0.002, 0.128 - Math.sin(t * Math.PI) * 0.004), (t) => [0.009 * Math.sin(t * Math.PI) + 0.001, 0.012 * Math.sin(t * Math.PI) + 0.002], { ref: (t, n) => n.set(0, 1, 0) }).geo, m, g);
  return g;
}
let HAIRM = null;
const hairMat = () => (HAIRM ||= K.uvMat('young-hair', 64, 256, (u, v, o) => { // silver cel spikes: flat silver, crisp blue-violet underside, crisp highlight band
  const lit = Math.cos(u * Math.PI * 2); const ring = lit > 0.35 && v > 0.22 && v < 0.32;
  const c = ring ? [255, 255, 255] : lit < -0.15 ? [150, 160, 206] : [226, 232, 248]; o.col[0] = c[0]; o.col[1] = c[1]; o.col[2] = c[2]; if (v > 0.85) { o.col[0] -= 20; o.col[1] -= 14; } }));
/** swept-back spiky silver hair: tapered spikes from the carved scalp, side-swept bangs and a short tied queue */
function hairLocks(geo) {
  const g = new THREE.Group(); const p = geo.attributes.position, n = geo.attributes.normal; let s = 13; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const roots = []; for (let i = 0; i < p.count; i += 2) { const x = p.getX(i) - MX, y = p.getY(i), z = p.getZ(i); if (y < 0.41 || (z > 0.06 && y < 0.47)) continue; roots.push(i); }
  const m = hairMat();
  const spike = (p0, dir, len, r0, curl) => { const pts = []; for (let j = 0; j <= 5; j++) { const t = j / 5; pts.push(p0.clone().addScaledVector(dir, t * len).add(new THREE.Vector3(0, Math.sin(t * Math.PI) * curl, 0))); }
    K.mesh(new K.Loft(9, 7).set(K.curve(pts), (t) => { const r = r0 * Math.pow(1 - t, 0.9) + 0.0008; return [r * 1.3, r * 0.75]; }, { ref: (t, q) => q.set(0, 1, 0) }).geo, m, g); };
  for (let k = 0; k < 52; k++) {
    const i = roots[Math.floor(rnd() * roots.length)]; const p0 = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); const nn = new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)); const sx = Math.sign(p0.x - MX) || 1;
    const dir = new THREE.Vector3(sx * 0.35 + nn.x * 0.4, 0.35 + rnd() * 0.25, -0.9).normalize(); spike(p0.addScaledVector(nn, -0.004), dir, 0.07 + rnd() * 0.07, 0.016 + rnd() * 0.008, 0.012);
  }
  for (const sx of [1, 1, -1]) { const p0 = new THREE.Vector3(MX + sx * 0.02, 0.455, 0.075); spike(p0, new THREE.Vector3(sx * 0.9, -0.55, 0.25).normalize(), 0.075, 0.014, 0.006); } // side-swept bangs, clear of the eyes
  const q = new K.Loft(12, 8).set(K.curve([[MX, 0.37, -0.1], [MX, 0.33, -0.13], [MX + 0.01, 0.27, -0.14], [MX + 0.02, 0.22, -0.13]]), (t) => 0.014 * (1 - t * 0.6) * (t < 0.12 ? 0.7 : 1), { ref: (t, qq) => qq.set(0, 0, -1) }); K.mesh(q.geo, m, g); // short Newton queue
  K.mesh(new K.Loft(6, 10).set((t, pp) => pp.set(MX, 0.345 - t * 0.012, -0.118 - t * 0.004), () => 0.017).geo, new THREE.MeshToonMaterial({ color: 0x1e2a5a }), g); // ribbon tie
  return g;
}

/** build the head: { group, jawPivot, setExpr(name), setOpen(a) }; origin at the neck stump, facing +Z (fills in once the bust loads) */
export function buildHead() {
  const group = new THREE.Group(); const inner = new THREE.Group(); inner.position.set(-MX, -L.neckY, -0.02); group.add(inner);
  const jawPivot = new THREE.Group(); jawPivot.position.copy(HINGE).add(inner.position); group.add(jawPivot);
  let want = 'smug'; let R = null;
  K.withAssets(['bust_head'], () => {
    R = resources(); const hm = new THREE.Mesh(R.head, R.mat); hm.castShadow = true; inner.add(hm);
    const jm = new THREE.Mesh(R.jaw, R.mat); jm.castShadow = true; jm.position.copy(HINGE).multiplyScalar(-1); jawPivot.add(jm);
    inner.add(mouthCavity()); inner.add(hairLocks(R.head)); R.setFace(want);
  });
  return { group, jawPivot, setExpr(name) { want = name; R?.setFace(name); }, setOpen(a) { jawPivot.rotation.x = a; } };
}
