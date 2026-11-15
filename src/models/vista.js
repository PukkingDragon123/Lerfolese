// THE VISTA: the sunset land seen from the top of the clockwork tower (the LERFOLESE menu). Realistic low-poly: one
// big faceted heightfield (flat-shaded, per-face colour from height, slope and land use: meadows, dark forest floor,
// golden fields, rock, snow) with a river meandering out of the far mountains through a valley and a lake; villages of
// little gabled houses with lamplit windows; thousands of instanced faceted trees (tiered pines, broadleaf crowns);
// low-poly cumulus drifting BELOW the tower top; a sunset sky (deep blue zenith, violet, salmon, a gold horizon, the
// sun's disc and corona, cirrus streaks lit from beneath); a flock of birds wheeling round the tower. Moody, natural
// exposure: the low sun is the key light, everything else sinks into blue-violet shadow and warm haze.
//   const VZ = buildVista({ groundY }); scene.add(VZ.group); scene.fog = VZ.fog; VZ.update(dt, t); VZ.sunDir / VZ.sunPos
//   cloudGeo(seed, { n, w, h }) -> faceted cumulus geometry (shared with the menu's cloud buttons)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeNoise } from '../gfx/pixel.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const SUN_DIR = new THREE.Vector3(-0.86, 0.05, -0.52).normalize(); // low in the west, off the left of the menu's frame (it rims the cloud words and side-lights the tower)

// ---------------------------------------------------------------- the pixel grain used on clouds and land (one texel = one art pixel)
let GRAIN = null;
export function grainTex() {
  if (GRAIN) return GRAIN; const N = 32; const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const r = mulberry32(77);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = 222 + Math.floor(r() * 4) * 9 + ((x + y) % 4 === 0 ? 6 : 0); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
  GRAIN = new THREE.CanvasTexture(c); GRAIN.wrapS = GRAIN.wrapT = THREE.RepeatWrapping; GRAIN.magFilter = THREE.NearestFilter; GRAIN.minFilter = THREE.NearestMipmapLinearFilter; GRAIN.colorSpace = THREE.SRGBColorSpace; return GRAIN;
}
const boxUV = (geo, s) => { const p = geo.attributes.position, n = geo.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) { uv[i * 2] = x * s; uv[i * 2 + 1] = z * s; } else if (ax >= az) { uv[i * 2] = z * s; uv[i * 2 + 1] = y * s; } else { uv[i * 2] = x * s; uv[i * 2 + 1] = y * s; } }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo; };

// ---------------------------------------------------------------- faceted cumulus: overlapping jittered icosahedra, a flattened base, baked AO
export function cloudGeo(seed = 1, { n = 7, w = 3, h = 1.2, d = 1.6, detail = 1, lumps = 0.08, bake = true } = {}) {
  const r = mulberry32(seed); const parts = [];
  for (let i = 0; i < n; i++) { const u = n === 1 ? 0.5 : i / (n - 1); const mid = Math.sin(u * Math.PI); const s = (0.32 + mid * 0.42 + r() * 0.14) * h;
    const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; const j = mulberry32(seed * 31 + i);
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); const q = 1 + (j() - 0.5) * lumps * 2; p.setXYZ(k, x * q, y * q, z * q); }
    g.scale(s * (1.1 + r() * 0.3), s, s * (0.9 + r() * 0.3)); g.translate((u - 0.5) * w * 0.82 + (r() - 0.5) * 0.25 * w * 0.2, s * 0.35 + mid * h * 0.22 + (r() - 0.3) * 0.12 * h, (r() - 0.5) * d * 0.45); parts.push(g.toNonIndexed()); }
  for (let i = 0; i < Math.ceil(n / 2); i++) { const s = (0.3 + r() * 0.2) * h; const g = new THREE.IcosahedronGeometry(s, detail).toNonIndexed(); g.translate((r() - 0.5) * w * 0.5, s * 0.2 + h * 0.4 + r() * h * 0.25, (r() - 0.5) * d * 0.4); parts.push(g); } // the towering heads
  const geo = mergeGeometries(parts); const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) if (p.getY(k) < 0) p.setY(k, p.getY(k) * 0.18); // flat-bottomed
  geo.computeVertexNormals(); geo.computeBoundingBox(); const bb = geo.boundingBox;
  if (bake) { const col = new Float32Array(p.count * 3); for (let k = 0; k < p.count; k++) { const y = (p.getY(k) - bb.min.y) / Math.max(1e-3, bb.max.y - bb.min.y); const a = 0.55 + 0.45 * sm(0, 0.75, y); col[k * 3] = a; col[k * 3 + 1] = a * 0.98; col[k * 3 + 2] = a * 1.02; } geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  boxUV(geo, 1.4 / h); return geo;
}

// ---------------------------------------------------------------- sky: sunset gradient, sun, cirrus
function sky(sunDir) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: sunDir.clone() }, uTime: { value: 0 }, uNight: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uSun; uniform float uTime; uniform float uNight; varying vec3 vW;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return s; }
      void main(){ vec3 d = normalize(vW - cameraPosition); float e = d.y; float s = max(0.0, dot(d, uSun)); float az = max(0.0, dot(normalize(d.xz), normalize(uSun.xz)));
        vec3 zen = vec3(0.045, 0.06, 0.16), hi = vec3(0.16, 0.12, 0.27), mid = vec3(0.46, 0.22, 0.27), low = vec3(0.86, 0.4, 0.22), hor = vec3(1.0, 0.62, 0.3);
        vec3 lowA = mix(vec3(0.42, 0.24, 0.32), low, pow(az, 3.0)), horA = mix(vec3(0.6, 0.38, 0.42), hor, pow(az, 2.2));
        vec3 c = mix(horA, lowA, smoothstep(0.0, 0.06, e)); c = mix(c, mid, smoothstep(0.04, 0.18, e)); c = mix(c, hi, smoothstep(0.14, 0.4, e)); c = mix(c, zen, smoothstep(0.35, 0.85, e));
        if (e < 0.0) c = mix(horA, vec3(0.3, 0.2, 0.24), smoothstep(0.0, -0.2, e));
        // cirrus: long streaks, lit pink-gold from below near the sun, violet away from it
        vec2 q = d.xz / max(0.06, d.y + 0.08); float ci = fbm(vec2(q.x * 0.35 + uTime * 0.004, q.y * 1.6)) * fbm(q * 0.6 + 7.0); ci = smoothstep(0.24, 0.5, ci) * smoothstep(0.02, 0.12, e) * (1.0 - smoothstep(0.5, 0.9, e));
        c = mix(c, mix(vec3(0.5, 0.3, 0.42), vec3(1.0, 0.62, 0.42), pow(az, 4.0)), ci * 0.55);
        // the sun: a hot disc, a corona and a broad warm glow
        c += vec3(1.0, 0.7, 0.4) * (pow(s, 600.0) * 3.0 + pow(s, 60.0) * 0.45 + pow(s, 8.0) * 0.18); c = mix(c, vec3(1.6, 1.32, 0.95), smoothstep(0.99955, 0.99975, s));
        // a few early stars high up away from the sun
        vec2 sp = floor(d.xz / max(0.2, d.y) * 260.0); float st = step(0.9975, h21(sp)) * smoothstep(0.45, 0.8, e) * (1.0 - az * 0.7); c += vec3(0.7, 0.75, 1.0) * st * 0.5;
        // night falls over the upper sky as the menu looks up into the astral select (scenes/astral.js paints the stars)
        c = mix(c, mix(vec3(0.03, 0.025, 0.07), vec3(0.012, 0.01, 0.03), smoothstep(0.1, 0.7, e)), uNight * smoothstep(-0.05, 0.35, e));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), m); mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.userData.noInk = true; mesh.userData.noAO = true; mesh.name = 'sunsetSky'; return mesh;
}

// ---------------------------------------------------------------- the land
export function buildVista({ groundY = -64, seed = 5, hole = 0 } = {}) { // hole: radius left open round the tower for the town's finer ground (models/town.js)
  const G = new THREE.Group(); G.name = 'vista'; const n = makeNoise(seed), n2 = makeNoise(seed + 7), r = mulberry32(seed);
  const riverX = (z) => -38 + Math.sin(z * 0.0042 + 0.2) * 60 + Math.sin(z * 0.011) * 20 + Math.max(0, -z - 300) * 0.05;
  const lake = { x: 160, z: -330, r: 46 };
  const villages = [[-95, -170], [120, -420], [-180, -520], [40, -760], [260, -240], [-320, -300]];
  const ridged = (x, z) => { let s = 0, a = 1, f = 1; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(n2(x * f, z * f) * 2 - 1)); a *= 0.5; f *= 2.1; } return s / 1.9; };
  const hAt = (x, z) => {
    const d = Math.hypot(x, z); const dx = x - riverX(z); const valley = Math.exp(-(dx * dx) / (90 * 90)); const bed = Math.exp(-(dx * dx) / (14 * 14));
    let h = (n.fbm(x * 0.006 + 3, z * 0.006, 5) - 0.5) * 46 + (n.fbm(x * 0.02, z * 0.02, 3) - 0.5) * 8;
    h -= valley * 14 + bed * 5;
    const far = sm(900, 1700, d) * (z < 200 ? 1 : 0.6); h += far * (ridged(x * 0.0028, z * 0.0028) * 170 + 20) * (1 - valley * 0.5) + sm(1700, 2300, d) * 60;
    const ld = Math.hypot(x - lake.x, z - lake.z); h = h - sm(lake.r * 1.4, lake.r * 0.6, ld) * Math.max(0, h + 6) ;
    for (const [vx, vz] of villages) { const vd = Math.hypot(x - vx, z - vz); const k = sm(70, 25, vd); h = h * (1 - k * 0.7) + (n.fbm(vx * 0.006 + 3, vz * 0.006, 5) - 0.5) * 46 * k * 0.7; }
    // the hill town round the tower: a knoll under the tower, gentle slopes down to the river, blended into the wild land
    const kT = sm(130, 70, d); const ht = sm(34, 6, d) * 2.6 + (n.fbm(x * 0.04 + 9, z * 0.04, 2) - 0.5) * 2.2 - bed * 3.4 - valley * 2.2 - sm(40, 120, d) * 2;
    h = h * (1 - kT) + ht * kT;
    return h; };
  // grid: denser near the tower (quadratic spacing in z, and in |x|)
  const NX = 200, NZ = 160, X = 2400, Z0 = 260, Z1 = -2500;
  const xs = [], zs = []; for (let i = 0; i <= NX; i++) { const u = i / NX * 2 - 1; xs.push(Math.sign(u) * Math.pow(Math.abs(u), 1.7) * X); } for (let j = 0; j <= NZ; j++) { const u = j / NZ; zs.push(Z0 + (Z1 - Z0) * Math.pow(u, 1.55)); }
  const H = []; for (let j = 0; j <= NZ; j++) { const row = new Float32Array(NX + 1); for (let i = 0; i <= NX; i++) row[i] = hAt(xs[i], zs[j]); H.push(row); }
  const pos = new Float32Array(NX * NZ * 6 * 3), col = new Float32Array(NX * NZ * 6 * 3); let o = 0;
  const cMeadow = C('#4e6a2c'), cMeadow2 = C('#6a7a34'), cForest = C('#26381c'), cField = C('#a0863a'), cField2 = C('#7a7a30'), cRock = C('#5e544c'), cRock2 = C('#7a6c60'), cSnow = C('#d8d4e0'), cBank = C('#5a5034'), cc = new THREE.Color();
  const fieldAt = (x, z) => { for (const [vx, vz] of villages) { const vd = Math.hypot(x - vx, z - vz); if (vd < 95 && vd > 22) return ((Math.floor((x - vx) / 14) + Math.floor((z - vz) / 9)) & 1) ? 1 : 2; } return 0; };
  const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3, mz = (az + bz + cz) / 3; const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az; const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const slope = 1 - Math.abs(ny) / Math.hypot(nx, ny, nz);
    const rel = my; const dx = Math.abs(mx - riverX(mz)); const fm = n.fbm(mx * 0.012 + 40, mz * 0.012, 3); const jit = (n(mx * 0.3, mz * 0.3) - 0.5) * 0.12;
    if (rel > 120 + (n(mx * 0.02, mz * 0.02) - 0.5) * 50 && slope < 0.75) cc.copy(cSnow); else if (slope > 0.55 || rel > 95) cc.copy(cRock).lerp(cRock2, n(mx * 0.05, mz * 0.05)); else if (dx < 20) cc.copy(cBank).lerp(cMeadow, sm(12, 20, dx));
    else { const f = fieldAt(mx, mz); if (f) cc.copy(f === 1 ? cField : cField2); else if (fm > 0.52) cc.copy(cForest); else cc.copy(cMeadow).lerp(cMeadow2, n.fbm(mx * 0.03, mz * 0.03, 2)); }
    cc.offsetHSL(0, 0, jit * 0.25); for (const [x, y, z] of [[ax, ay, az], [cx, cy, cz], [bx, by, bz]]) { pos[o] = x; pos[o + 1] = y + groundY; pos[o + 2] = z; col[o] = cc.r; col[o + 1] = cc.g; col[o + 2] = cc.b; o += 3; } };
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1]; const a = H[j][i], b = H[j][i + 1], c = H[j + 1][i], d = H[j + 1][i + 1];
    if (hole && Math.max(Math.hypot(x0, z0), Math.hypot(x1, z1), Math.hypot(x0, z1), Math.hypot(x1, z0)) < hole) continue; // the town's own ground covers this
    if ((i + j) & 1) { tri(x0, a, z0, x0, c, z1, x1, b, z0); tri(x1, b, z0, x0, c, z1, x1, d, z1); } else { tri(x0, a, z0, x0, c, z1, x1, d, z1); tri(x0, a, z0, x1, d, z1, x1, b, z0); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, o), 3)); tg.setAttribute('color', new THREE.BufferAttribute(col.slice(0, o), 3)); tg.computeVertexNormals(); boxUV(tg, 0.5);
  const land = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), roughness: 0.95, metalness: 0, flatShading: true })); land.receiveShadow = true; land.name = 'land'; land.userData.noInk = true; G.add(land);
  // the river ribbon (a mirror of the sunset: hot gold toward the sun, violet near) and the lake
  { const pts = []; for (let z = 240; z > -1500; z -= 12) pts.push(V(riverX(z), 0, z)); const P = [], Cc = [], I = []; const warm = C('#ffb46a'), cool = C('#2a2a50'), mid = C('#a86a6a');
    pts.forEach((p, k) => { const w = 5 + Math.min(14, -p.z * 0.012) + Math.sin(k * 0.7) * 1.2; const nx = k < pts.length - 1 ? pts[k + 1].x - p.x : 0; const L = Math.hypot(nx, 12); const sx = 12 / L, sz = nx / L; const y = Math.min(hAt(p.x, p.z), hAt(p.x + 6, p.z), hAt(p.x - 6, p.z)) + groundY + 0.6;
      for (const s of [-1, 1]) { P.push(p.x + s * w * sx, y, p.z + s * w * sz); const k2 = sm(-40, -900, p.z); const c = cool.clone().lerp(mid, sm(0, 0.5, k2)).lerp(warm, sm(0.45, 1, k2)); if (s > 0) c.multiplyScalar(0.85); Cc.push(c.r, c.g, c.b); }
      if (k < pts.length - 1) { const a = k * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setIndex(I); g.computeVertexNormals();
    const w = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, side: THREE.DoubleSide })); w.userData.noInk = true; w.userData.noAO = true; w.name = 'river'; G.add(w);
    const lg = new THREE.CircleGeometry(lake.r, 18); const lm = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: C('#b07060'), fog: true })); lm.rotation.x = -Math.PI / 2; lm.position.set(lake.x, groundY + Math.min(hAt(lake.x, lake.z) + 1.2, -2), lake.z); lm.userData.noInk = true; G.add(lm); }
  // villages: gabled houses (whitewash, timber, stone), red tile roofs, a chapel tower, lamplit windows
  { const body = [], roof = [], win = []; const wallC = [C('#c8b898'), C('#a89478'), C('#8a7a6a'), C('#d0c0a0')], roofC = [C('#7a3424'), C('#5a2a20'), C('#8a4a2a'), C('#4a3a34')]; const cc2 = new THREE.Color();
    const paint = (g, c) => { const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    villages.forEach(([vx, vz], vi) => { const R = mulberry32(vi * 13 + 3); const nH = 9 + Math.floor(R() * 9);
      for (let k = 0; k < nH; k++) { const a = R() * Math.PI * 2, d = 4 + Math.pow(R(), 0.8) * 30; const x = vx + Math.cos(a) * d, z = vz + Math.sin(a) * d; const y = hAt(x, z) + groundY; const w = 3 + R() * 3, l = 4 + R() * 4, h = 2.4 + R() * 2.2, ry = Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (R() - 0.5) * 0.3;
        const m4 = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(1, 1, 1));
        const b = new THREE.BoxGeometry(w, h + 2, l).toNonIndexed(); b.translate(0, (h + 2) / 2 - 2, 0); b.applyMatrix4(m4); body.push(paint(b, cc2.copy(wallC[Math.floor(R() * 4)]).offsetHSL(0, 0, (R() - 0.5) * 0.06)));
        const rh = w * 0.55; const rs = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.4, 0), new THREE.Vector2(w / 2 + 0.4, 0), new THREE.Vector2(0, rh)]); const rg = new THREE.ExtrudeGeometry(rs, { depth: l + 0.6, bevelEnabled: false }).toNonIndexed(); rg.translate(0, h, -(l + 0.6) / 2); rg.applyMatrix4(m4); roof.push(paint(rg, roofC[Math.floor(R() * 4)]));
        for (let q = 0; q < 2; q++) if (R() < 0.75) { const wg = new THREE.PlaneGeometry(0.7, 0.9); wg.translate((q - 0.5) * w * 0.45, h * 0.55, l / 2 + 0.03); wg.applyMatrix4(m4); win.push(wg); } }
      if (vi % 2 === 0) { const x = vx + 3, z = vz - 2, y = hAt(x, z) + groundY; const t = new THREE.BoxGeometry(3.4, 14, 3.4).toNonIndexed(); t.translate(x, y + 5, z); body.push(paint(t, C('#9a8c7c'))); const sp = new THREE.ConeGeometry(2.8, 6, 4).toNonIndexed(); sp.rotateY(Math.PI / 4); sp.translate(x, y + 15, z); roof.push(paint(sp, C('#3e3438'))); const wg = new THREE.PlaneGeometry(0.8, 1.6); wg.translate(x, y + 9, z + 1.72); win.push(wg); } });
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), roughness: 0.9, flatShading: true }); for (const gs of [body, roof]) { const g = mergeGeometries(gs); boxUV(g, 0.6); const m = new THREE.Mesh(g, mat); m.castShadow = false; m.receiveShadow = true; m.userData.noInk = true; G.add(m); }
    const wm = new THREE.Mesh(mergeGeometries(win), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.3, 0.5), toneMapped: false, fog: false })); wm.userData.noInk = true; wm.userData.noAO = true; G.add(wm);
    // chimney smoke threads would read as noise at this distance; the village lamps carry the life instead
  }
  // forests: instanced faceted pines (stacked jittered tiers on a trunk) and broadleaf crowns, by a forest mask
  { const pine = (() => { const parts = []; const tr = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 5).toNonIndexed(); tr.translate(0, 1.1, 0); parts.push(paintC(tr, '#3a2a1e'));
      for (let k = 0; k < 4; k++) { const rr = 2.4 - k * 0.5, hh = 3.2 - k * 0.4; const g = new THREE.CylinderGeometry(0.15, rr, hh, 7, 1).toNonIndexed(); const p = g.attributes.position; const j = mulberry32(k + 3); for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setX(i, p.getX(i) * (0.85 + j() * 0.3)); p.setZ(i, p.getZ(i) * (0.85 + j() * 0.3)); p.setY(i, p.getY(i) - j() * 0.4); } g.translate(0, 2.4 + k * 1.7 + hh / 2, 0); parts.push(paintC(g, ['#1e3418', '#26401c', '#2c4a20', '#345424'][k])); }
      const g = mergeGeometries(parts); g.computeVertexNormals(); return g; })();
    const broad = (() => { const parts = []; const tr = new THREE.CylinderGeometry(0.3, 0.45, 3, 5).toNonIndexed(); tr.translate(0, 1.5, 0); parts.push(paintC(tr, '#3e2e20')); const j = mulberry32(9);
      for (let k = 0; k < 4; k++) { const g = new THREE.IcosahedronGeometry(1.7 + j() * 0.8, 0).toNonIndexed(); g.translate((j() - 0.5) * 2.2, 4.2 + j() * 1.6, (j() - 0.5) * 2.2); parts.push(paintC(g, ['#36501e', '#40602a', '#2c4418', '#4a6a2a'][k])); } const g = mergeGeometries(parts); g.computeVertexNormals(); return g; })();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); const spots = [[], []];
    for (let k = 0; k < 9000 && spots[0].length + spots[1].length < 3600; k++) { const x = (r() - 0.5) * 1500, z = 200 - r() * 1150; const d = Math.hypot(x, z); if (d < Math.max(26, hole + 6)) continue; const fm = n.fbm(x * 0.012 + 40, z * 0.012, 3); if (fm < 0.5) continue; if (Math.abs(x - riverX(z)) < 22) continue; if (Math.hypot(x - lake.x, z - lake.z) < lake.r + 6) continue;
      if (villages.some(([vx, vz]) => Math.hypot(x - vx, z - vz) < 40)) continue; const y = hAt(x, z); if (y > 110) continue; spots[r() < 0.6 ? 0 : 1].push([x, y + groundY - 0.3, z, 0.8 + r() * 0.7, r() * 6.3]); }
    [pine, broad].forEach((geo, gi) => { const im = new THREE.InstancedMesh(geo, mat, spots[gi].length); spots[gi].forEach(([x, y, z, s, a], i) => { q.setFromEuler(e.set(0, a, 0)); m4.compose(V(x, y, z), q, V(s, s * (0.9 + (i % 5) * 0.06), s)); im.setMatrixAt(i, m4); }); im.receiveShadow = true; im.userData.noInk = true; im.computeBoundingSphere(); G.add(im); }); }
  // clouds BELOW the tower top: a scattered deck of faceted cumulus, lit by the low sun (hot rims toward it, violet bellies)
  const clouds = []; const cmat = new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), color: C('#fff0ea'), roughness: 1, metalness: 0, flatShading: true, emissive: C('#6a4a6a'), emissiveIntensity: 0.45, fog: true });
  for (let k = 0; k < 30; k++) { const a = r() * Math.PI * 2, d = 170 + Math.pow(r(), 0.7) * 520; const x = Math.cos(a) * d * 1.3, z = -Math.abs(Math.sin(a)) * d * 1.1 - 10 + (r() < 0.25 ? d * 0.7 : 0); const s = 6 + r() * 14 + d * 0.025;
    const m = new THREE.Mesh(cloudGeo(100 + k, { n: 5 + Math.floor(r() * 5), w: s * 2.4, h: s * 0.75, d: s * 1.4, detail: 1 }), cmat); m.position.set(x, 20 + r() * 40 + d * 0.12, z); m.rotation.y = r() * Math.PI; m.userData.noInk = true; m.castShadow = false; m.receiveShadow = false; G.add(m); clouds.push({ m, v: 0.4 + r() * 0.6 }); }
  // birds: a loose flock wheeling round the tower (dark silhouettes against the sunset)
  const birds = []; { const bm = new THREE.MeshStandardMaterial({ color: 0x1a1418, roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
    for (let k = 0; k < 14; k++) { const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 4), bm); body.rotation.x = Math.PI / 2; b.add(body);
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.08, 0, 0, 0.1, 0.55, 0.0, -0.06, 0.55, 0, -0.06, 0, 0, 0.1, 0.9, -0.02, 0.05], 3)); wg.computeVertexNormals();
      const L = new THREE.Mesh(wg, bm), R = new THREE.Mesh(wg, bm); R.scale.x = -1; b.add(L, R); b.userData = { L, R, ph: r() * 10, rad: 18 + r() * 26, h: -6 + r() * 14, sp: (0.12 + r() * 0.08) * (k % 4 === 0 ? -1 : 1), off: r() * 6.3, bob: r() * 3 }; G.add(b); birds.push(b); } }
  const sk = sky(SUN_DIR); G.add(sk);
  const fog = new THREE.FogExp2(C('#8a5a5c'), 0.00085);
  const sunPos = SUN_DIR.clone().multiplyScalar(1800);
  const api = {
    group: G, fog, hAt: (x, z) => hAt(x, z) + groundY, riverX, sunDir: SUN_DIR, sunPos, sky: sk, clouds, birds,
    update(dt, t) { sk.material.uniforms.uTime.value = t;
      for (const c of clouds) { c.m.position.x += c.v * dt * 0.8; if (c.m.position.x > 900) c.m.position.x = -900; }
      for (const b of birds) { const u = b.userData; const a = u.off + t * u.sp; b.position.set(Math.cos(a) * u.rad, u.h + Math.sin(t * 0.4 + u.bob) * 1.5, Math.sin(a) * u.rad * 0.8 - 6); b.rotation.set(0, -a + (u.sp > 0 ? 0 : Math.PI), Math.sin(t * 0.5 + u.bob) * 0.3 * Math.sign(u.sp));
        const glide = Math.sin(t * 0.3 + u.ph) > 0.3; const f = glide ? 0.12 : Math.sin(t * 11 + u.ph) * 0.7; u.L.rotation.z = f; u.R.rotation.z = -f; } },
  };
  return api;
}
function paintC(g, hex) { const c = C(hex); const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; }
