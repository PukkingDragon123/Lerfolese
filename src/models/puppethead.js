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
const SKIN = [232, 188, 146], OAK = [170, 108, 58], OAKD = [92, 50, 28], IRIS = [96, 128, 146], LIP = [178, 104, 100], WHITE = [242, 238, 236], INK = [48, 28, 28];
const G = (x, y, sx, sy) => Math.exp(-(x * x) / (2 * sx * sx) - (y * y) / (2 * sy * sy));
const mixc = (o, c, t) => { for (let k = 0; k < 3; k++) o[k] += (c[k] - o[k]) * t; };
function painter(E) {
  return (c, o) => {
    const X = c.x - MX, ax = Math.abs(X), sx = X >= 0 ? 1 : -1, Y = c.y; const col = o.col; o.ro = 0.55;
    const grain = ((c.y * 80 + Math.sin(c.x * 50 + c.z * 40) * 1.3 + 10) % 1);
    col[0] = SKIN[0]; col[1] = SKIN[1]; col[2] = SKIN[2];
    const wear = K.vnoise(c.x * 90, c.y * 90, c.z * 90); if (wear > 0.7) mixc(col, OAK, Math.min(1, (wear - 0.7) * 2.5)); if (grain < 0.07) mixc(col, OAKD, 0.2);
    const hair = Y > 0.432 + Math.max(0, 0.07 - ax) * 0.25 || (c.z < 0.03 && Y > 0.33) || (ax > 0.075 && Y > 0.37 && c.z < 0.07);
    if (hair) { const s = K.vnoise(c.x * 260, c.y * 260, c.z * 260); col[0] = WHITE[0] - s * 50; col[1] = WHITE[1] - s * 50; col[2] = WHITE[2] - s * 40 + 6; if (c.ny < -0.2) mixc(col, [150, 146, 160], 0.4); return; }
    if (c.z < 0.06) return;
    mixc(col, [204, 118, 98], 0.42 * G(ax - 0.045, Y - 0.35, 0.016, 0.014) + 0.45 * G(X, Y - 0.346, 0.01, 0.009)); // ruddy cheeks and nose
    mixc(col, [156, 112, 92], 0.25 * G(ax - 0.032, Y - 0.369, 0.014, 0.005)); // tired under-eyes
    const ex = ax - L.eyeX, ey = Y - L.eyeY; const lidY = 0.0048 - E.lid * 0.0098; const er = Math.hypot(ex / 2.0, ey);
    if (er < 0.0062 && ey < lidY && ey > -0.0046 + Math.abs(ex) * 0.1) {
      const ir = Math.hypot(ex - 0.0008 * sx, ey + 0.0003);
      if (ir < 0.0052) { if (ir < 0.0023) { col[0] = 12; col[1] = 10; col[2] = 14; } else { const k = 0.78 + 0.22 * Math.sin(Math.atan2(ey, ex) * 16); col[0] = IRIS[0] * k; col[1] = IRIS[1] * k; col[2] = IRIS[2] * k; if (ir > 0.0045) mixc(col, [36, 44, 54], 0.7); } }
      else { col[0] = 238; col[1] = 230; col[2] = 220; mixc(col, [200, 152, 142], Math.min(1, Math.abs(ex) / 0.012)); }
      if (Math.hypot(ex + 0.0016, ey - 0.0016) < 0.001) col[0] = col[1] = col[2] = 255; // wet highlight
      if (ey > lidY - 0.001) mixc(col, INK, 0.7); o.ro = 0.15; return;
    }
    if (er < 0.0082 && ey > lidY - 0.0004 && ey < lidY + 0.0014) mixc(col, INK, 0.8); // lid line + lashes
    if (Math.abs(ey + 0.0058) < 0.0008 && Math.abs(ex) < 0.01) mixc(col, [150, 96, 80], 0.5);
    if (Math.abs(Y - (L.eyeY + 0.009 - E.lid * 0.003)) < 0.001 && Math.abs(ex) < 0.011) mixc(col, [128, 84, 70], 0.4); // lid crease
    const bt = (ax - 0.012) / 0.042; // white bushy brows on the carved ridge
    if (bt > 0 && bt < 1) { const by = 0.398 - (ax - 0.03) * (ax - 0.03) * 4 + (E.b[0] * (1 - bt) + E.b[1] * bt) * 0.005 + sx * E.asym * 0.0028 * bt; const hw = 0.0038 * (1 - bt * 0.35) + K.vnoise(c.x * 900, Y * 300, 2) * 0.0016;
      if (Math.abs(Y - by) < hw) { const s = K.vnoise(c.x * 1600 + Y * 400, Y * 220, 6); col[0] = WHITE[0] - s * 40; col[1] = WHITE[1] - s * 40; col[2] = WHITE[2] - s * 30; return; } }
    if (Y > 0.412 && Y < 0.44 && ax < 0.05 && Math.pow(Math.max(0, Math.sin((Y - 0.412) * 380 + Math.sin(c.x * 55) * 1.2)), 4) > 0.55) mixc(col, [146, 98, 78], 0.4); // forehead lines
    if (ax > 0.047 && ax < 0.064) for (const k of [-0.6, 0, 0.55]) if (Math.abs(Y - L.eyeY - (ax - 0.047) * k) < 0.0007) mixc(col, [146, 98, 78], 0.45 * (1 - (ax - 0.047) / 0.017)); // crow's feet
    const nl = ax - (0.02 + (0.343 - Y) * 0.3); if (Y < 0.344 && Y > 0.305 && Math.abs(nl) < 0.0016) mixc(col, [146, 94, 78], 0.45);
    if (Math.hypot(ax - 0.0085, Y - 0.3385) < 0.003 && c.ny < 0.1) mixc(col, [64, 36, 32], 0.85); // nostrils
    const mw = L.mouthW, mc = L.mouthY + E.m * 0.003 * Math.min(1, ax / mw) ** 2 + sx * E.asym * 0.0022 * (ax / mw) ** 2;
    if (ax < mw && Math.abs(Y - mc) < 0.0011) mixc(col, INK, 0.85); else if (ax < mw * 0.95 && Y > mc && Y < mc + 0.0052 * (1 - (ax / mw) ** 2)) mixc(col, LIP, 0.7); else if (ax < mw * 0.9 && Y < mc && Y > mc - 0.0062 * (1 - (ax / mw) ** 2)) mixc(col, LIP, 0.6);
    if (Math.abs(ax - (L.mouthW + 0.004 + (L.mouthY - Y) * 0.16)) < 0.0013 && Y < L.mouthY && Y > 0.262 && c.z > 0.09) mixc(col, INK, 0.85); // marionette jaw seams
  };
}

let RES = null;
function resources() {
  if (RES) return RES;
  const gl = K.LIB.bust_head; let src = null; gl.scene.traverse((o) => { if (!src && o.isMesh) src = o; });
  const geo = src.geometry.clone(); geo.computeVertexNormals();
  const S = K.surface('bust', { geometry: geo, isSkinnedMesh: false }, 1024);
  const res = K.paintSurface(S, painter(EXPR.smug));
  // oak grain bump
  const bump = K.paintSurface(S, (c, o) => { const g = ((c.y * 80 + Math.sin(c.x * 50 + c.z * 40) * 1.3 + 10) % 1); const v = g < 0.07 ? 90 : 160 + K.vnoise(c.x * 300, c.y * 40, c.z * 300) * 40; o.col[0] = o.col[1] = o.col[2] = v; });
  const mat = new THREE.MeshStandardMaterial({ map: K.canvasTex(res.canvas), bumpMap: K.canvasTex(bump.canvas, false), bumpScale: 0.6, roughness: 0.5, metalness: 0 });
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
const hairMat = () => (HAIRM ||= K.uvMat('newton-locks', 64, 256, (u, v, o) => { // root grey -> tip white, shaded underside, strand lines
  const st = (u * 9 + Math.sin(v * 12 + u * 3) * 0.6) % 1; const under = Math.cos(u * Math.PI * 2);
  K.tone([226 + v * 20, 222 + v * 20, 228 + v * 18], K.band(0.42 + v * 0.18 + under * 0.2 + (st < 0.2 ? -0.14 : 0), 5), o.col); }));
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
