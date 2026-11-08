// A realistically carved wooden portrait head of an old Isaac Newton for Sir Isaac's marionette: a dense sculpted
// surface (about 12k tris) displaced with real facial anatomy (brow ridge, deep-set sockets, eyelid folds, a long
// nose with alae, cheekbones and hollow cheeks, nasolabial folds, thin lips, chin and sulcus, carved forehead lines and
// crow's feet), a marionette jaw cut along the mouth-corner lines, carved ears and flowing wavy white locks with a
// centre parting. The face is painted like a master carver's polychrome bust: skin tones over visible oak grain,
// realistic eyes (iris, pupil, wet highlight), white brows, thin lips. One painted texture per expression.
import * as THREE from 'three';
import * as K from './charkit.js';

const TAU = Math.PI * 2;
const NU = 96, NV = 76;
const G = (x, y, sx, sy) => Math.exp(-(x * x) / (2 * sx * sx) - (y * y) / (2 * sy * sy));
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const th = (u) => { const s = 2 * u - 1; return Math.PI * Math.sign(s) * Math.pow(Math.abs(s), 1.3); }; // dense at the front (u = 0.5)
const ph = (v) => -1.05 + v * (Math.PI / 2 + 1.05);
export const HEAD = { eyeY: 0.168, eyeX: 0.033, mouthY: 0.0775, jawHinge: new THREE.Vector3(0, 0.085, -0.03), earX: 0.085, crown: 0.33 };

/** base skull point (before carving) for grid params */
function base(u, v, out) {
  const t = th(u), p = ph(v), sp = Math.sin(p), cp = Math.cos(p), st = Math.sin(t), ct = Math.cos(t);
  const rx = 0.086 * (sp < 0 ? 1 - 0.34 * Math.pow(-sp, 1.25) * (0.55 + 0.45 * Math.max(0, ct)) : 1 - 0.06 * Math.max(0, sp) ** 3);
  const rz = 0.108 * (ct > 0 ? 1 - 0.1 * Math.pow(ct, 4) * (sp > -0.4 ? 1 : 0.5) : 1.05 + 0.05 * Math.max(0, sp));
  out.set(cp * st * rx, 0.165 + sp * 0.165, -0.005 + cp * ct * rz + (sp < -0.2 && ct > 0 ? 0.012 * ct * -sp : 0));
  return ct;
}
/** carved relief in front of the face (metres, frontal coordinates) */
function relief(X, Y) {
  const ax = Math.abs(X); let d = 0;
  if (Y > 0.088 && Y < 0.215) { // nose: bridge to a long, slightly hooked tip, columella
    const t = Math.min(1, Math.max(0, (0.205 - Y) / 0.092)); let h = 0.008 + 0.047 * Math.pow(t, 1.45) + 0.004 * Math.sin(t * Math.PI) ;
    if (Y < 0.113) h *= Math.pow(Math.max(0, (Y - 0.092) / 0.021), 0.6); const w = 0.0085 + 0.0105 * t + (Y < 0.12 ? 0.0035 : 0);
    d += h * Math.exp(-(X * X) / (2 * w * w));
  }
  d += 0.019 * G(ax - 0.0175, Y - 0.106, 0.0075, 0.0068); // alar wings
  d -= 0.017 * G(ax - 0.033, Y - 0.17, 0.02, 0.013); d += 0.0095 * G(ax - 0.033, Y - 0.168, 0.0105, 0.0068); // sockets + eyeballs
  d += 0.0042 * G(ax - 0.033, Y - 0.1775, 0.0125, 0.0022); d += 0.0028 * G(ax - 0.034, Y - 0.159, 0.011, 0.0018); d -= 0.0032 * G(ax - 0.036, Y - 0.151, 0.013, 0.0028); // lids, bags
  d += 0.0095 * G(ax - 0.031, Y - (0.194 - ax * ax * 3), 0.028, 0.0065); d -= 0.004 * G(X, Y - 0.188, 0.006, 0.01); // brow ridge, glabella
  d += 0.011 * G(ax - 0.053, Y - 0.143, 0.016, 0.012); d -= 0.0075 * G(ax - 0.047, Y - 0.104, 0.013, 0.016); // cheekbones, hollows
  if (Y < 0.116 && Y > 0.058) { const nl = ax - (0.021 + (0.113 - Y) * 0.45); d += -0.005 * Math.exp(-nl * nl / (2 * 0.0024 ** 2)) + 0.0042 * Math.exp(-((nl + 0.0065) ** 2) / (2 * 0.005 ** 2)); }
  d += 0.0065 * G(X, Y - 0.0855, 0.021, 0.0042) * (ax < 0.025 ? 1 : 0.3); d += 0.0058 * G(X, Y - 0.0695, 0.019, 0.0048); d -= 0.0052 * G(X, Y - 0.0775, 0.025, 0.0015); d -= 0.0022 * G(X, Y - 0.094, 0.0028, 0.005); // lips, mouth line, philtrum
  d += 0.0145 * G(X, Y - 0.04, 0.016, 0.012); d -= 0.0042 * G(X, Y - 0.057, 0.016, 0.0028); // chin, sulcus
  if (Y > 0.214 && Y < 0.272 && ax < 0.056) d -= 0.0017 * Math.pow(Math.max(0, Math.sin((Y - 0.214) * 360 + Math.sin(X * 55) * 1.2)), 4) * (1 - ax / 0.056); // forehead lines
  if (ax > 0.053 && ax < 0.074) for (const k of [-0.55, 0, 0.5]) d -= 0.0013 * Math.exp(-((Y - 0.168 - (ax - 0.053) * k) ** 2) / (2 * 0.0011 ** 2)) * (1 - (ax - 0.053) / 0.021); // crow's feet
  d -= 0.006 * G(ax - 0.072, Y - 0.2, 0.012, 0.02); // temples
  return d;
}
const inJaw = (X, Y, ct) => ct > 0.35 && Y < HEAD.mouthY + 0.001 && Math.abs(X) < 0.031 + (HEAD.mouthY - Y) * 0.12 && Y > 0.012;

let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const pos = new Float32Array((NU + 1) * (NV + 1) * 3), uv = new Float32Array((NU + 1) * (NV + 1) * 2), meta = []; const p = new THREE.Vector3();
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const u = i / NU, v = j / NV; const ct = base(u, v, p); const X = p.x, Y = p.y; const mask = ss(0.15, 0.62, ct) * ss(0.0, 0.04, Y);
    p.z += relief(X, Y) * mask; const k = j * (NU + 1) + i; pos.set([p.x, p.y, p.z], k * 3); uv.set([u, v], k * 2); meta.push([X, Y, ct]);
  }
  const hi = [], ji = [];
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i, b = a + NU + 1; const m = [a, a + 1, b, b + 1].map((q) => meta[q]); const cX = (m[0][0] + m[3][0]) / 2, cY = (m[0][1] + m[3][1]) / 2, cT = (m[0][2] + m[3][2]) / 2;
    (inJaw(cX, cY, cT) ? ji : hi).push(a, a + 1, b, a + 1, b + 1, b);
  }
  const mk = (idx) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const all = mk([...hi, ...ji]); const nrm = all.attributes.normal; // shared smooth normals across the jaw cut
  const head = mk(hi), jaw = mk(ji); head.setAttribute('normal', nrm); jaw.setAttribute('normal', nrm);
  return (GEO = { head, jaw });
}

// ---------------------------------------------------------------- polychrome paint
export const EXPR = {
  smug: { b: [-0.15, 0.35], lid: 0.38, m: 0.25, asym: 0.7 }, delight: { b: [0.5, 0.45], lid: 0.08, m: 0.9, asym: 0 }, annoyed: { b: [-0.9, -0.2], lid: 0.45, m: -0.6, asym: 0 },
  hurt: { b: [0.9, -0.5], lid: 0.5, m: -0.85, asym: 0 }, shock: { b: [0.9, 0.9], lid: -0.15, m: -0.2, asym: 0 }, think: { b: [0.45, -0.3], lid: 0.32, m: -0.25, asym: -0.7 }, blink: { b: [0, 0.2], lid: 1.1, m: 0.2, asym: 0 },
};
const SKIN = [236, 192, 150], OAK = [176, 112, 60], OAKD = [96, 52, 30], IRIS = [92, 124, 140], LIP = [176, 104, 100], BROW = [244, 240, 236], INK = [52, 30, 30];
const mixc = (o, c, t) => { for (let k = 0; k < 3; k++) o[k] += (c[k] - o[k]) * t; };
const MATS = new Map();
export function headMaterial(name, opts = {}) {
  const key = name + (opts.jaw ? ':jaw' : ''); if (MATS.has(key)) return MATS.get(key);
  const E = EXPR[name] || EXPR.smug; const W = 512, Hh = 512; const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d'); const img = g.createImageData(W, Hh); const p = new THREE.Vector3(); const o = [0, 0, 0];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W, v = (y + 0.5) / Hh; const ct = base(u, v, p); const X = p.x, Y = p.y, ax = Math.abs(X), sx = X >= 0 ? 1 : -1;
    const grain = ((p.y * 70 + Math.sin(p.x * 40 + p.z * 30) * 1.4 + 10) % 1);
    o[0] = SKIN[0]; o[1] = SKIN[1]; o[2] = SKIN[2];
    const wear = K.vnoise(u * 30, v * 30, 3); if (wear > 0.72) mixc(o, OAK, (wear - 0.72) * 2.2); if (grain < 0.08) mixc(o, OAKD, 0.22); // paint worn thin over the oak
    mixc(o, [200, 120, 100], 0.4 * G(ax - 0.055, Y - 0.125, 0.018, 0.016) + 0.35 * G(X, Y - 0.12, 0.012, 0.012)); // ruddy cheeks and nose
    mixc(o, [150, 110, 90], 0.25 * G(ax - 0.038, Y - 0.152, 0.016, 0.006)); // tired under-eyes
    if (ct > 0.2) {
      const ex = ax - HEAD.eyeX, ey = Y - HEAD.eyeY; const lidY = 0.0062 - E.lid * 0.0118; const er = Math.hypot(ex / 1.9, ey);
      if (er < 0.0072 && ey < lidY && ey > -0.0058 + Math.abs(ex) * 0.12) { // the visible eye
        const ir = Math.hypot(ex - 0.0005, ey + 0.0004);
        if (ir < 0.0058) { if (ir < 0.0026) { o[0] = 14; o[1] = 12; o[2] = 16; } else { const k = 0.75 + 0.25 * Math.sin(Math.atan2(ey, ex) * 14); o[0] = IRIS[0] * k; o[1] = IRIS[1] * k; o[2] = IRIS[2] * k; if (ir > 0.005) mixc(o, [40, 50, 60], 0.6); } }
        else { o[0] = 236; o[1] = 228; o[2] = 216; mixc(o, [196, 150, 140], ss(0.004, 0.011, Math.abs(ex))); }
        if (Math.hypot(ex + 0.0017, ey - 0.0019) < 0.0011) { o[0] = o[1] = o[2] = 255; } // wet highlight
        if (ey > lidY - 0.0011) mixc(o, INK, 0.7);
      } else if (er < 0.0095 && ey > lidY - 0.0005 && ey < lidY + 0.0016) mixc(o, INK, 0.75); // upper lid line + lashes
      else if (Math.abs(ey + 0.0066) < 0.0009 && Math.abs(ex) < 0.011) mixc(o, [150, 96, 80], 0.5);
      if (Math.abs(Y - (0.1775 - E.lid * 0.004)) < 0.0012 && Math.abs(ex) < 0.012) mixc(o, [130, 86, 70], 0.4); // lid crease
      const bt = (ax - 0.016) / 0.046; // white bushy brows following the brow ridge
      if (bt > 0 && bt < 1) { const by = 0.1965 - ax * ax * 3 + (E.b[0] * (1 - bt) + E.b[1] * bt) * 0.0055 + sx * E.asym * 0.003 * bt; const hw = 0.0042 * (1 - bt * 0.35) + K.vnoise(X * 900, Y * 300, 2) * 0.0018;
        if (Math.abs(Y - by) < hw) { const s = K.vnoise(X * 1600 + Y * 400, Y * 200, 6); o[0] = BROW[0] - s * 40; o[1] = BROW[1] - s * 40; o[2] = BROW[2] - s * 34; } }
      if (Y > 0.213 && Y < 0.272 && ax < 0.056 && Math.pow(Math.max(0, Math.sin((Y - 0.214) * 360 + Math.sin(X * 55) * 1.2)), 4) > 0.5) mixc(o, [150, 100, 80], 0.35); // forehead creases
      const nl = ax - (0.021 + (0.113 - Y) * 0.45); if (Y < 0.116 && Y > 0.06 && Math.abs(nl) < 0.0022) mixc(o, [150, 96, 80], 0.45);
      if (Math.hypot(ax - 0.0095, Y - 0.0975) < 0.0034 && Y < 0.1) mixc(o, [70, 40, 36], 0.85); // nostrils
      const mw = 0.024, mc = HEAD.mouthY + E.m * 0.004 * Math.min(1, ax / mw) ** 2 + sx * E.asym * 0.003 * (ax / mw) ** 2;
      if (ax < mw && Math.abs(Y - mc) < 0.0014) mixc(o, INK, 0.85); else if (ax < mw * 0.95 && Y > mc && Y < mc + 0.0058 * (1 - (ax / mw) ** 2)) mixc(o, LIP, 0.7); else if (ax < mw * 0.9 && Y < mc && Y > mc - 0.007 * (1 - (ax / mw) ** 2)) mixc(o, LIP, 0.55);
      if (Math.abs(ax - (0.031 + (HEAD.mouthY - Y) * 0.12)) < 0.0016 && Y < HEAD.mouthY + 0.001 && Y > 0.012) mixc(o, INK, 0.8); // marionette jaw seams
    }
    if (Y > 0.2 && (ct < 0.25 || Y > 0.29)) { const s = K.vnoise(u * 80, v * 20, 4); o[0] = 236 - s * 40; o[1] = 232 - s * 40; o[2] = 230 - s * 30; } // hair-glued scalp
    const q = (y * W + x) * 4; img.data[q] = o[0]; img.data[q + 1] = o[1]; img.data[q + 2] = o[2]; img.data[q + 3] = 255;
  }
  g.putImageData(img, 0, 0); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 }); MATS.set(key, m); return m;
}

function earMesh(s, mat) { // carved ear: helix rim ribbon round a cupped concha
  const g = new THREE.Group(); const x0 = s * 0.084;
  const rim = new K.Loft(22, 10).set(K.curve([[x0, 0.135, 0.005], [x0 + s * 0.012, 0.15, -0.012], [x0 + s * 0.016, 0.178, -0.016], [x0 + s * 0.012, 0.192, -0.004], [x0 + s * 0.006, 0.188, 0.008], [x0 + s * 0.004, 0.17, 0.004]]), (t) => [0.0045 * (0.6 + Math.sin(t * Math.PI)), 0.0075 * (0.5 + Math.sin(t * Math.PI))], { ref: (t, n) => n.set(s, 0, 0) });
  K.mesh(rim.geo, mat, g); const lobe = new K.Loft(10, 12).set(K.curve([[x0 + s * 0.003, 0.15, 0.004], [x0 + s * 0.01, 0.135, 0.0], [x0 + s * 0.008, 0.125, -0.004]]), (t) => [0.004, 0.009 * Math.sin(Math.min(1, t * 1.2 + 0.1) * Math.PI)], { ref: (t, n) => n.set(s, 0, 0) }); K.mesh(lobe.geo, mat, g);
  return g;
}
let HAIRM = null;
function hairMat() {
  return (HAIRM ||= K.uvMat('newton-hair', 64, 256, (u, v, o) => { const st = (u * 11 + Math.sin(v * 14 + u * 3) * 0.7) % 1; K.tone([236, 232, 238], K.band(0.56 + Math.cos(u * TAU) * 0.18 + (st < 0.22 ? -0.18 : st > 0.85 ? 0.08 : 0) - v * 0.1, 5), o.col); }, { side: THREE.DoubleSide }));
}
/** flowing wavy locks with a centre parting: strand-group ribbons that leave the scalp and fall to the shoulders in S-waves */
function hairLocks() {
  const g = new THREE.Group(); let s = 21; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); const m = hairMat(); const c = new THREE.Vector3(0, 0.17, -0.01);
  for (let i = 0; i < 120; i++) {
    const side = i % 2 ? 1 : -1; const az = side * (0.45 + rnd() * 2.6); const el = 0.2 + rnd() * 1.2; // along the parting down the sides and back
    if (Math.cos(az) > 0.2 && el < 1.05) continue;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const p0 = c.clone().add(new THREE.Vector3(dir.x * 0.09, dir.y * 0.158, dir.z * 0.112));
    const out = new THREE.Vector3(dir.x + Math.sign(dir.x) * 0.35, 0, Math.min(dir.z, 0) - 0.25).normalize(); /* swept back and to the sides, clear of the face */ const fall = 0.17 + rnd() * 0.15 + (Math.cos(az) < -0.3 ? 0.06 : 0); const ph2 = rnd() * TAU, amp = 0.012 + rnd() * 0.014, wid = 0.03 + rnd() * 0.018;
    const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; const q = p0.clone().addScaledVector(out, 0.012 + t * 0.045 + Math.sin(t * 7 + ph2) * amp).add(new THREE.Vector3(0, -t * fall - (1 - Math.cos(t * 1.4)) * 0.01, 0)); if (k === 1) q.addScaledVector(dir, 0.012); pts.push(q); }
    const tang = new THREE.Vector3(-out.z, 0, out.x);
    const l = new K.Loft(16, 6).set(K.curve(pts), (t) => [(0.009 * (1 - t * 0.5) + 0.002), wid * (0.7 + Math.sin(Math.min(1, t * 1.6 + 0.2) * Math.PI) * 0.4) * (1 - t * 0.55)], { ref: () => out, shape: (a) => 1 + Math.sin(a * 4) * 0.08 });
    void tang; K.mesh(l.geo, m, g);
  }
  return g;
}

/** build the head: { group, jawPivot, setExpr(name), setOpen(a) }; origin at the neck joint, facing +Z */
export function buildHead() {
  const { head, jaw } = geometry(); const group = new THREE.Group();
  const hm = new THREE.Mesh(head, headMaterial('smug')); hm.castShadow = true; hm.receiveShadow = false; group.add(hm); // no self-shadow blotches on the carved face
  const jawPivot = new THREE.Group(); jawPivot.position.copy(HEAD.jawHinge); group.add(jawPivot);
  const jm = new THREE.Mesh(jaw, hm.material); jm.position.copy(HEAD.jawHinge).multiplyScalar(-1); jm.castShadow = true; jawPivot.add(jm);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.06), new THREE.MeshBasicMaterial({ color: 0x1a0c0e })); back.position.set(0, 0.055, 0.075); group.add(back); // the dark mouth inside
  const earMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('rgb(222,176,136)'), roughness: 0.55 });
  group.add(earMesh(1, earMat), earMesh(-1, earMat)); group.add(hairLocks());
  let cur = 'smug';
  return { group, jawPivot, setExpr(name) { if (name === cur || !EXPR[name]) return; cur = name; hm.material = jm.material = headMaterial(name); }, setOpen(a) { jawPivot.rotation.x = a; } };
}
