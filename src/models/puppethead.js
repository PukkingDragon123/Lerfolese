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
  smug: { b: [-0.15, 0.35], lid: 0.32, m: 0.25, asym: 0.7 }, delight: { b: [0.5, 0.45], lid: 0.05, m: 0.9, asym: 0 }, annoyed: { b: [-0.9, -0.2], lid: 0.42, m: -0.6, asym: 0 },
  hurt: { b: [0.9, -0.5], lid: 0.48, m: -0.85, asym: 0 }, shock: { b: [0.9, 0.9], lid: -0.2, m: -0.2, asym: 0 }, think: { b: [0.45, -0.3], lid: 0.3, m: -0.25, asym: -0.7 }, blink: { b: [0, 0.2], lid: 1.1, m: 0.2, asym: 0 },
};
// anime cel palette: flat tones, crisp shapes, no gradients
const SKIN = [246, 212, 178], SKIN2 = [226, 178, 150], SKIN3 = [190, 132, 116], BLUSH = [240, 150, 140], IRIS = [70, 150, 190], IRIS2 = [34, 84, 128], LIP = [206, 120, 116], WHITE = [250, 248, 250], WHITE2 = [204, 206, 226], INK = [40, 22, 30], WOOD = [176, 108, 62];
const set = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
function painter(E) {
  return (c, o) => {
    const X = c.x - MX, ax = Math.abs(X), sx = X >= 0 ? 1 : -1, Y = c.y; const col = o.col; set(col, SKIN);
    const hair = Y > 0.432 + Math.max(0, 0.07 - ax) * 0.25 || (c.z < 0.03 && Y > 0.33) || (ax > 0.075 && Y > 0.37 && c.z < 0.07);
    if (hair) { set(col, c.ny < -0.15 || (c.nx * sx > 0.6 && c.ny < 0.2) ? WHITE2 : WHITE); if (c.ny > 0.7 && ((c.x * 220 + c.z * 160) % 1) < 0.18) set(col, [255, 255, 255]); return; }
    if (c.z < 0.06) { if (c.ny < -0.3) set(col, SKIN2); return; }
    if (c.ny < -0.45 && Y < 0.35) set(col, SKIN2); // crisp shadow shapes under the nose, lip and jaw
    if (ax > 0.012 && ax < 0.021 && Y > 0.338 && Y < 0.372 && sx < 0 && c.nx < -0.3) set(col, SKIN2); // nose side tick
    const bl = Math.hypot((ax - 0.046) / 1.5, Y - 0.352); if (bl < 0.011) { set(col, ((ax * 900 + Y * 300) % 1) < 0.35 ? BLUSH : [244, 186, 164]); } // anime blush hatching
    if (sx > 0 && ax > 0.05 && ax < 0.058 && Y > 0.405 && Y < 0.43 && Math.abs(ax - 0.054 - (Y - 0.415) * 0.3) < 0.0008) set(col, [120, 70, 50]); // a hairline crack in the paint
    // eyes: almond, thick upper lash line with a wing, big two-tone iris, pupil, two crisp highlights
    const ex = ax - L.eyeX, ey = Y - L.eyeY; const lidY = 0.0052 - E.lid * 0.0102; const open = ey < lidY && ey > -0.0048 + ex * ex * 18;
    if (Math.abs(ex) < 0.0115 && open) {
      const ir = Math.hypot(ex - 0.0006 * sx, (ey + 0.0002) * 0.9);
      if (ir < 0.0058) { set(col, ey > lidY - 0.0026 || ir > 0.0046 ? IRIS2 : IRIS); if (ir < 0.0024) set(col, [16, 14, 24]); }
      else set(col, ex * sx > 0.006 ? [236, 230, 236] : WHITE);
      if (Math.hypot(ex + 0.0018 * sx, ey - 0.0015) < 0.0012 || Math.hypot(ex - 0.0016 * sx, ey + 0.0021) < 0.0006) set(col, [255, 255, 255]);
      return;
    }
    if (Math.abs(ex) < 0.0125 && ey >= lidY && ey < lidY + 0.0016 + Math.max(0, ex * sx) * 0.12) { set(col, INK); return; } // upper lash line, winged at the outer corner
    if (ex * sx > 0.008 && ex * sx < 0.014 && Math.abs(ey - lidY - (ex * sx - 0.008) * 0.35) < 0.0011) { set(col, INK); return; }
    if (Math.abs(ex) < 0.009 && Math.abs(ey + 0.0049 - ex * ex * 18) < 0.0006) set(col, SKIN3); // lower lid
    if (Math.abs(Y - (L.eyeY + 0.0095 - E.lid * 0.003)) < 0.0007 && Math.abs(ex) < 0.011) set(col, SKIN3); // lid crease
    const bt = (ax - 0.012) / 0.042; // brows: crisp white shapes with a grey underside
    if (bt > 0 && bt < 1) { const by = 0.398 - (ax - 0.03) * (ax - 0.03) * 4 + (E.b[0] * (1 - bt) + E.b[1] * bt) * 0.005 + sx * E.asym * 0.0028 * bt; const hw = 0.0042 * (1 - bt * 0.4) + 0.0006;
      if (Math.abs(Y - by) < hw) { set(col, Y < by - hw * 0.35 ? WHITE2 : WHITE); return; } }
    if (Y > 0.414 && Y < 0.44 && ax < 0.045) for (const k of [0, 1]) if (Math.abs(Y - 0.418 - k * 0.011 - Math.sin(X * 50) * 0.002) < 0.0006 && ax < 0.04 - k * 0.01) set(col, SKIN3); // two forehead lines
    if (ax > 0.047 && ax < 0.06) for (const k of [-0.5, 0.5]) if (Math.abs(Y - L.eyeY - (ax - 0.047) * k) < 0.0006) set(col, SKIN3); // crow's feet
    const nl = ax - (0.02 + (0.343 - Y) * 0.3); if (Y < 0.342 && Y > 0.31 && Math.abs(nl) < 0.0009) set(col, SKIN3);
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
  const geo = src.geometry.clone(); geo.computeVertexNormals();
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
const hairMat = () => (HAIRM ||= K.uvMat('newton-locks', 64, 256, (u, v, o) => { // cel locks: flat white, crisp lavender underside, crisp highlight band
  const under = Math.cos(u * Math.PI * 2) < -0.2; const ring = !under && v > 0.16 && v < 0.24 && Math.cos(u * Math.PI * 2) > 0.45;
  o.col[0] = ring ? 255 : under ? 206 : 246; o.col[1] = ring ? 255 : under ? 206 : 244; o.col[2] = ring ? 255 : under ? 230 : 250; if (!under && ((u * 5) % 1) < 0.06 && v > 0.3) { o.col[0] -= 26; o.col[1] -= 26; o.col[2] -= 14; } }));
/** volumetric wavy locks: tapered tubes rooted on the carved scalp, falling past the jaw with S-curls */
function hairLocks(geo) {
  const g = new THREE.Group(); const p = geo.attributes.position, n = geo.attributes.normal; let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const roots = []; for (let i = 0; i < p.count; i += 3) { const x = p.getX(i) - MX, y = p.getY(i), z = p.getZ(i); if (y < 0.39 || z > 0.07) continue; if (z > -0.005 && Math.abs(x) < 0.066) continue; roots.push(i); }
  const m = hairMat(); const N = 64;
  for (let k = 0; k < N; k++) {
    const i = roots[Math.floor(rnd() * roots.length)]; const p0 = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); const nn = new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i));
    const side = Math.sign(p0.x - MX) || 1; const out = new THREE.Vector3(side * 0.8 + nn.x * 0.4, 0, Math.min(0, nn.z) - 0.35).normalize(); const fall = 0.16 + rnd() * 0.12 + (p0.z < -0.03 ? 0.05 : 0); const ph = rnd() * 6.28, amp = 0.01 + rnd() * 0.012, r0 = 0.011 + rnd() * 0.007;
    const pts = []; for (let j = 0; j <= 6; j++) { const t = j / 6; pts.push(p0.clone().addScaledVector(nn, 0.006 + Math.min(t * 3, 1) * 0.012).addScaledVector(out, t * 0.05 + Math.sin(t * 7 + ph) * amp).add(new THREE.Vector3(0, -t * fall, 0))); }
    const l = new K.Loft(10, 7).set(K.curve(pts), (t) => { const r = r0 * (1 - t * 0.75) * (t < 0.08 ? 0.6 + t * 5 : 1); return [r, r * 0.8]; }, { ref: (t, q) => q.set(0, -1, 0).addScaledVector(out, 0.3), shape: (a) => 1 + Math.sin(a * 3) * 0.08 });
    K.mesh(l.geo, m, g);
  }
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
