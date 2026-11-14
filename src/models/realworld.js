// Anime cel-shaded places for battles, travel and events: a painted sky with a gilded sun face and cel cumulus,
// layered ridges, warped high-resolution ground with water basins and hills, whole landscapes per theme (a village
// meadow, a lakeside marble garden, a forest clearing with a brook, a reed marsh, the Labyrinth's approach, the
// guardian's cliff; see places.js) and a set-piece per event, built from procedural cel trees / bushes / flowers /
// grass / water (flora.js), village architecture (village.js) and toon-converted CC0 models (rocks, ruins, statuary).
// A polished winding road (ruts, worn cobbles, edge stones, sky puddles, wildflowers) comes from far behind the
// battle camera into the arena (stage.road, for the intro cinematics). Wind moves every leaf, blade and sheet.
import * as THREE from 'three';
import { loadModel, loadGLTF, loadPBR, loadHDRI, variantCount, hdriSunDirection } from '../gfx/assets.js';
import { mulberry32 } from '../core/util.js';
import { makeNoise } from '../gfx/pixel.js';
import { Particles } from '../gfx/particles.js';
import * as T from './toon.js';
import { plantField } from '../gfx/plants.js';
import { groundTex, soilTex, gravelTex, earthTex, cobbleTex as pixelCobble } from '../gfx/pixeltex.js';
import * as F from './flora.js';
import { cottage, chimneySmoke } from './village.js';
import { PLACES, SETS } from './places.js';

const V3 = THREE.Vector3;
const GROUND = { meadow: 'ground_meadow', garden: 'ground_meadow', gully: 'ground_meadow', labyrinth: 'ground_dry_grass', marsh: 'mud_mossy', guardian: 'ground_dry_grass' };
const ARENA = { meadow: 'ground_dry_grass', garden: 'ground_rocky_trail', gully: 'ground_dry_dirt', labyrinth: 'ground_rocky_trail', marsh: 'mud_wet', guardian: 'ground_rocky_trail' };
const HDRI = { meadow: 'sunset_dry_plain', garden: 'sunset_dry_plain', gully: 'golden_dry_valley', labyrinth: 'sunset_dry_plain', marsh: 'golden_dry_valley', guardian: 'sunset_dry_plain' };
// sky looks per theme: Preetham sky params, haze colour (fog = aerial perspective), cloud tint
const LOOKS = {
  meadow: { turb: 4.6, ray: 1.9, mie: 0.0042, g: 0.78, haze: '#d9b38c', fog: [40, 175], cloud: '#fff1dc', shade: '#9c86a8', grass: 0.12 },
  garden: { turb: 4.2, ray: 2.1, mie: 0.004, g: 0.77, haze: '#e0b4a0', fog: [40, 175], cloud: '#ffeee4', shade: '#a48ab4', grass: 0.1 },
  gully: { turb: 4.5, ray: 1.0, mie: 0.0035, g: 0.76, haze: '#d8a878', fog: [38, 165], cloud: '#ffe8cc', shade: '#a08490', grass: 0.55 },
  labyrinth: { turb: 4, ray: 1.5, mie: 0.0032, g: 0.75, haze: '#d4987c', fog: [38, 165], cloud: '#ffe2cc', shade: '#90709a', grass: 0.5 },
  marsh: { turb: 6, ray: 1.3, mie: 0.005, g: 0.75, haze: '#a8b4a4', fog: [30, 150], cloud: '#eef0e4', shade: '#7c8a98', grass: 0.03 },
  guardian: { turb: 6, ray: 2.0, mie: 0.004, g: 0.78, haze: '#b8786a', fog: [36, 160], cloud: '#ffd4b8', shade: '#6a4a6a', grass: 0.35 },
};
export const SUN_SKY = new V3(Math.sin(0.3), 0.088, -Math.cos(0.3)).normalize(); // visible sun, upper right of the battle view
const SUN_KEY = new V3(-0.55, 0.62, 0.42).normalize(); // key light kept from the front-left so faces read
const CAM = new V3(-0.1, 3, 11.4);
const vcount = new Map();
async function variant(name, rnd) { if (name.includes('#')) return loadModel(name); if (!vcount.has(name)) vcount.set(name, await variantCount(name).catch(() => 0)); const n = vcount.get(name); return loadModel(n > 1 ? `${name}#${Math.floor(rnd() * n)}` : name); }
const LOOK = { // per-family toon tuning: saturation, albedo tint, leaf tint, wind
  tree: { sat: 1.35, leafTint: '#e8f0c0', wind: 1, windH: 0.18 }, shrub: { sat: 1.4, leafTint: '#f0f4c8', wind: 0.8, windH: 0.6 }, grass: { sat: 1.45, leafTint: '#f4f0b0', wind: 1.3, windH: 1.2 },
  rock: { sat: 0.95, tint: '#f6efe4', wind: 0 }, stone: { sat: 1.1, tint: '#fff4ea', wind: 0 }, prop: { sat: 1.25, wind: 0 },
};
function lookFor(name) {
  if (/olive|umbrella|othonna/.test(name)) return LOOK.tree; if (/searsia|shrub|fern|nettle|weed|sorrel/.test(name)) return LOOK.shrub;
  if (/grass|celandine|gazania|dandelion/.test(name)) return LOOK.grass; if (/rock|boulder|cliff/.test(name)) return LOOK.rock;
  if (/column|wall|marble|statue|bust|lion|bull|horse|fire_pit/.test(name)) return LOOK.stone; return LOOK.prop;
}
export async function toonModel(name, rnd = Math.random, look = null) { const o = await variant(name, rnd); return T.toonify(o, look || lookFor(name)); }

/** realistic model with wind in its leaves (events, map props) */
export async function envModel(name, rnd = Math.random, wind = 1) { const o = await variant(name, rnd); return T.windify(o, { amp: wind, h: /olive|umbrella|othonna/.test(name) ? 0.16 : 0.9 }); }

// pixel-art edges: alpha below a per-texel hash threshold is cut (no soft blends anywhere)
function ditherAlpha(m, texels = 64) {
  m.transparent = false; m.depthWrite = false; const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { prev?.(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', `{ vec2 dq = floor(vMapUv * ${texels.toFixed(1)}); float dth = fract(sin(dot(dq, vec2(12.9898, 78.233))) * 43758.5453) * 0.9 + 0.05; if (diffuseColor.a < dth) discard; diffuseColor.a = 1.0; }`); };
  m.customProgramCacheKey = () => 'ditherAlpha' + texels + (m.map ? 'm' : ''); return m;
}
function softMask(size = 256) { // radial alpha for the trodden arena patch
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const n = makeNoise(5); const id = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const u = x / size - 0.5, v = y / size - 0.5; const d = Math.sqrt(u * u * 1.0 + v * v * 4.2) * 2; const a = Math.max(0, Math.min(1, (1 - d) * 1.25 + (n.fbm(x * 0.05, y * 0.05, 4) - 0.5) * 0.7)) * 0.9; const i = (y * size + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = a * 255; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return new THREE.CanvasTexture(c);
}
const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

// ---------------------------------------------------------------- the sun: a bright disc with a gilded, serene embossed face
function sunFaceTexture() {
  return canvasTex(512, 512, (g, S) => {
    const c = S / 2; const gl = g.createRadialGradient(c, c, 0, c, c, c); gl.addColorStop(0, 'rgba(255,250,232,1)'); gl.addColorStop(0.36, 'rgba(255,236,190,1)'); gl.addColorStop(0.43, 'rgba(255,210,140,0.85)'); gl.addColorStop(0.6, 'rgba(255,180,110,0.28)'); gl.addColorStop(1, 'rgba(255,160,90,0)');
    g.fillStyle = gl; g.fillRect(0, 0, S, S);
    // embossed features: a soft dark stroke with a bright offset highlight reads as relief on the glowing disc
    const R = S * 0.36; const feat = (col, dx, dy, w) => { g.save(); g.translate(dx, dy); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(c + sx * R * 0.12, c - R * 0.3); g.quadraticCurveTo(c + sx * R * 0.38, c - R * 0.48, c + sx * R * 0.62, c - R * 0.3); g.stroke(); g.beginPath(); g.moveTo(c + sx * R * 0.18, c - R * 0.12); g.quadraticCurveTo(c + sx * R * 0.38, c - R * 0.04, c + sx * R * 0.58, c - R * 0.12); g.stroke(); }
      g.beginPath(); g.moveTo(c - R * 0.02, c - R * 0.22); g.quadraticCurveTo(c - R * 0.1, c + R * 0.16, c - R * 0.14, c + R * 0.26); g.quadraticCurveTo(c, c + R * 0.32, c + R * 0.12, c + R * 0.26); g.stroke();
      g.beginPath(); g.moveTo(c - R * 0.26, c + R * 0.48); g.quadraticCurveTo(c, c + R * 0.6, c + R * 0.28, c + R * 0.46); g.stroke(); g.restore(); };
    feat('rgba(196,120,40,0.42)', 0, 0, 7); feat('rgba(255,255,240,0.55)', -3, -3, 3);
    for (const sx of [-1, 1]) { const ch = g.createRadialGradient(c + sx * R * 0.45, c + R * 0.25, 2, c + sx * R * 0.45, c + R * 0.25, R * 0.26); ch.addColorStop(0, 'rgba(255,170,90,0.28)'); ch.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = ch; g.fillRect(0, 0, S, S); }
  });
}
let SUNTEX = null;
function sunBillboard(pos, size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: (SUNTEX ||= sunFaceTexture()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, color: new THREE.Color(0.95, 0.88, 0.72) }));
  m.position.copy(pos); m.renderOrder = -6; m.userData.noInk = true; m.userData.noAO = true; m.frustumCulled = false; m.name = 'sunFace';
  m.onBeforeRender = (r, s, cam) => m.quaternion.copy(cam.quaternion); return m;
}
// drifting leaves and sunlit pollen; stepped from the points' own render callback
function windMotes(theme, hAt) {
  const leaves = new Particles(160), pollen = new Particles(220, { additive: true }); let last = performance.now();
  const step = () => { const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000; const wd = T.WIND.dir.value;
    if (Math.random() < dt * 2.2) leaves.spawn({ pos: [-14 + Math.random() * 28, 4 + Math.random() * 3, -10 + Math.random() * 8], vel: [wd.x * 1.4, -0.1, wd.y * 1.4], grav: 0.25, drag: 0.4, wobble: 1.8, spin: 3, life: 6, size: 13, color: theme === 'marsh' ? '#7a8a4a' : Math.random() < 0.5 ? '#8aa040' : '#d0a040', sprite: 'leaf', floor: 0.05, bounce: 0 });
    if (Math.random() < dt * 9) pollen.spawn({ pos: [-12 + Math.random() * 24, 0.4 + Math.random() * 3.2, -8 + Math.random() * 10], vel: [wd.x * 0.25, 0.04, wd.y * 0.25], wobble: 0.35, life: 6, size: 5 + Math.random() * 5, color: '#fff2c0', alpha: 0.55, sprite: 'dot' });
    leaves.update(dt, t); pollen.update(dt, t); void hAt; };
  for (const p of [leaves, pollen]) { p.points.frustumCulled = false; p.points.userData.noInk = true; p.points.userData.noAO = true; }
  leaves.points.onBeforeRender = step; const g = new THREE.Group(); g.add(leaves.points, pollen.points); return g;
}

// layered distant ridges fading into the haze (smooth silhouettes, vertex-colour aerial perspective)
export function ridges(sunDir, haze, cols) {
  const g = new THREE.Group(); const sunAz = Math.atan2(sunDir.x, -sunDir.z); const cx = -6, cz = 6;
  [[118, 3.6, 8, 0.5], [150, 5.5, 12, 0.32], [176, 7.5, 15, 0.16]].reverse().forEach(([R, h0, h1, k], li) => {
    const n = makeNoise(31 + li); const seg = 360; const pos = [], col = [], idx = []; const top = new THREE.Color(cols[li]), hz = new THREE.Color(haze);
    for (let i = 0; i <= seg; i++) { const th = (i / seg) * Math.PI * 2; const x = cx + Math.sin(th) * R, z = cz - Math.cos(th) * R; const az = Math.atan2(x - CAM.x, CAM.z - z); let da = Math.abs(az - sunAz); da = Math.min(da, Math.PI * 2 - da); const notch = Math.min(1, da / 0.12);
      let h = h0 + (h1 - h0) * (n.fbm(th * 9 + li * 7, 0.5, 5) * 1.6 - 0.3); h = Math.max(1, h) * (0.45 + 0.55 * notch * notch * (3 - 2 * notch));
      const c1 = top.clone().lerp(hz, k); pos.push(x, h, z, x, -8, z); col.push(c1.r, c1.g, c1.b, hz.r, hz.g, hz.b); if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide })); m.renderOrder = -9 + li; m.frustumCulled = false; m.userData.noInk = true; m.userData.noAO = true; g.add(m);
  });
  return g;
}
// ---------------------------------------------------------------- ground: splat of three PBR sets + vertex AO, meadow-green tone
function splatGround(geo, grassM, dirtM, gravelM, { tint = '#c8d8a0', dirt = 0.62, gravel = 0.66, green = 0.55, field = '#6a9a3a', fieldK = 0.55 } = {}) {
  const m = grassM; m.vertexColors = true; m.roughness = 1;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tDirt: { value: dirtM.map }, tGravel: { value: gravelM.map }, uTint: { value: new THREE.Color(tint) }, uDirt: { value: dirt }, uGravel: { value: gravel }, uGreen: { value: green }, uField: { value: new THREE.Color(field) }, uFieldK: { value: fieldK } });
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D tDirt, tGravel; uniform vec3 uTint, uField; uniform float uDirt, uGravel, uGreen, uFieldK; varying vec3 vWP;\nfloat sh2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat sn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(sh2(i), sh2(i + vec2(1, 0)), f.x), mix(sh2(i + vec2(0, 1)), sh2(i + vec2(1, 1)), f.x), f.y); }\nfloat sf(vec2 p){ return sn(p) * 0.55 + sn(p * 2.1 + 3.1) * 0.3 + sn(p * 4.3 + 7.7) * 0.15; }\n'
      + sh.fragmentShader.replace('#include <map_fragment>', `
        vec2 tq = floor(vMapUv * 64.0); float dz = fract(sin(dot(tq, vec2(12.9898, 78.233))) * 43758.5453);
        vec3 cg = texture2D(map, vMapUv).rgb * uTint; vec3 cd = texture2D(tDirt, vMapUv + vec2(0.37, 0.11)).rgb; vec3 cv = texture2D(tGravel, vMapUv + vec2(0.61, 0.29)).rgb;
        float wd = step(uDirt + 0.12 * dz, sf(vWP.xz * 0.11 + 4.0)); float wv = step(uGravel + 0.1 * dz, sf(vWP.xz * 0.07 + 19.0)) * (1.0 - wd);
        float patchy = sf(vWP.xz * 0.35); cg *= mix(0.93, 1.05, step(0.5 + 0.1 * (dz - 0.5), patchy)); cg = mix(cg, cg * uField * 1.6, uFieldK * uGreen);
        diffuseColor.rgb *= mix(mix(cg, cd, wd), cv, wv);`);
  };
  m.customProgramCacheKey = () => 'splatGround'; return m;
}
// ---------------------------------------------------------------- the road: from far behind-left of the camera into the arena
function ribbon(curve, t0, t1, W, hAt, { segs = 160, across = [-1, -0.7, -0.4, -0.3, -0.2, 0, 0.2, 0.3, 0.4, 0.7, 1], lift = 0.03, rut = true, vScale = 2.2 } = {}) {
  const pos = [], uv = [], col = [], idx = []; const tmp = new V3(), tan = new V3(), side = new V3(); const L = curve.getLength();
  for (let i = 0; i <= segs; i++) { const t = t0 + (t1 - t0) * (i / segs); curve.getPointAt(t, tmp); curve.getTangentAt(t, tan); side.set(-tan.z, 0, tan.x).normalize(); const endFade = Math.min(1, (i / segs) * 8, (1 - i / segs) * 8);
    across.forEach((a) => { const x = tmp.x + side.x * a * W / 2, z = tmp.z + side.z * a * W / 2; const isRut = rut && Math.abs(Math.abs(a) - 0.3) < 0.02; const alpha = Math.min(1, (1 - Math.abs(a)) / 0.32) * endFade;
      pos.push(x, hAt(x, z) + lift - (isRut ? 0.035 : 0) - (Math.abs(a) > 0.95 ? 0.02 : 0), z); uv.push((a + 1) * 0.5 * (W / vScale), (t * L) / vScale); const k = isRut ? 0.72 : 1; col.push(k, k * 0.98, k * 0.95, alpha); }); }
  const A = across.length; for (let i = 0; i < segs; i++) for (let j = 0; j < A - 1; j++) { const a = i * A + j, b = a + 1, c = a + A, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}
function buildRoad(ctx) {
  const { g, rnd } = ctx; const hAt = ctx.hAt;
  const pts = [[-40, 33], [-33, 27], [-28, 20.5], [-21, 16.5], [-15.5, 11.5], [-11.5, 7.2], [-8.2, 4.2], [-6, 2.4], [-4.6, 1.5]].map(([x, z]) => new V3(x, hAt(x, z), z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const W = 2.7; const tmp = new V3(), tan = new V3(), side = new V3();
  // packed dirt and gravel trail, soft edges blending into the meadow, grooved wheel ruts
  const trail = new THREE.Mesh(ribbon(curve, 0, 1, W, hAt), ditherAlpha(new THREE.MeshToonMaterial({ map: gravelTex(), vertexColors: true, gradientMap: T.gradientMap([0.55, 0.8, 1.0]), polygonOffset: true, polygonOffsetFactor: -1 })));
  trail.receiveShadow = true; trail.userData.noInk = true; trail.renderOrder = 1; trail.name = 'road'; g.add(trail);
  // worn cobble stretches
  for (const [a, b] of [[0.42, 0.52], [0.8, 0.975]]) { const m = new THREE.Mesh(ribbon(curve, a, b, W * 0.86, hAt, { segs: 60, lift: 0.045, rut: false, vScale: 1.6, across: [-1, -0.8, -0.5, 0, 0.5, 0.8, 1] }), ditherAlpha(new THREE.MeshToonMaterial({ map: pixelCobble(), vertexColors: true, gradientMap: T.gradientMap([0.5, 0.78, 1.0]), polygonOffset: true, polygonOffsetFactor: -2 }))); m.receiveShadow = true; m.renderOrder = 2; m.userData.noInk = true; g.add(m); }
  // puddles in the ruts, mirroring the sky
  const pudMat = new THREE.MeshToonMaterial({ color: '#a8c4e8', emissive: '#4a6a98', emissiveIntensity: 0.55, gradientMap: T.gradientMap([0.7, 1.0]) });
  for (const s of [0.3, 0.61, 0.7]) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const o = tmp.clone().addScaledVector(side, (rnd() < 0.5 ? -1 : 1) * 0.4); const sh = new THREE.Shape(); const n = 16; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const r = (0.5 + Math.sin(a * 3 + s * 9) * 0.1 + Math.sin(a * 5) * 0.05); i ? sh.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.55) : sh.moveTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.55); } const pm = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8).rotateX(-Math.PI / 2), pudMat); pm.position.set(o.x, hAt(o.x, o.z) + 0.035, o.z); pm.rotation.y = -Math.atan2(tan.z, tan.x); pm.renderOrder = 3; pm.userData.noInk = true; g.add(pm); }
  // half-buried stones at the verges, wildflowers, a few trees and bushes along the way
  for (let s = 0.08; s < 0.95; s += 0.09 + rnd() * 0.08) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const o = tmp.clone().addScaledVector(side, (rnd() < 0.5 ? -1 : 1) * (W / 2 + 0.15 + rnd() * 0.3)); ctx.model('namaqualand_boulder_05', o.x, o.z, { s: 0.14 + rnd() * 0.1, y: -0.06, nofoot: true }); }
  const fl = ['poppy', 'daisy', 'cornflower', 'clover', 'lavender', 'daisy'];
  for (let s = 0.03; s < 0.95; s += 0.02 + rnd() * 0.02) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const sd = rnd() < 0.5 ? -1 : 1; const o = tmp.clone().addScaledVector(side, sd * (W / 2 + 0.35 + rnd() * 1.4)); ctx.flower(fl[Math.floor(rnd() * fl.length)], o.x, o.z); }
  for (const [s, sd, kind, sc] of [[0.16, 1, 'olive', 1.1], [0.24, -1, 'cypress', 1.0], [0.38, -1, 'pine', 1.05], [0.55, 1, 'oleander', 1.2], [0.66, -1, 'olive', 1.0], [0.72, 1, 'myrtle', 1.1], [0.2, 1, 'pine', 1.1]]) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const o = tmp.clone().addScaledVector(side, sd * (W / 2 + 3.2 + rnd() * 1.5)); if (F.BUSH_KINDS.includes(kind)) ctx.bush(kind, o.x, o.z, sc); else ctx.tree(kind, o.x, o.z, { s: sc }); }
  return curve;
}

// dragonflies darting over still water (marsh)
function dragonflies(n, area, hY) {
  const tex = canvasTex(64, 64, (g) => { g.strokeStyle = '#1c4a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 10); g.lineTo(32, 58); g.stroke(); g.fillStyle = 'rgba(200,240,255,0.55)'; for (const [dx, dy, r] of [[-1, -1, 0.2], [1, -1, -0.2], [-1, 1, -0.3], [1, 1, 0.3]]) { g.save(); g.translate(32, 22 + dy * 4); g.rotate(r); g.beginPath(); g.ellipse(dx * 14, 0, 14, 4, 0, 0, Math.PI * 2); g.fill(); g.restore(); } g.fillStyle = '#2a8aa0'; g.beginPath(); g.arc(32, 14, 4, 0, Math.PI * 2); g.fill(); });
  const grp = new THREE.Group(); for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(0.32, 0.32, 1); s.userData.noInk = true; const cx = area.x[0] + Math.random() * (area.x[1] - area.x[0]), cz = area.z[0] + Math.random() * (area.z[1] - area.z[0]), ph = Math.random() * 10;
    s.onBeforeRender = () => { const t = performance.now() / 1000 + ph; const dart = Math.floor(t * 0.7); const jx = Math.sin(dart * 12.9) * 1.6, jz = Math.cos(dart * 7.3) * 1.2; s.position.set(cx + jx + Math.sin(t * 3) * 0.08, hY + 0.5 + Math.sin(t * 5) * 0.06, cz + jz); s.material.rotation = Math.sin(dart) * 0.6; }; s.position.set(cx, hY + 0.5, cz); grp.add(s); }
  return grp;
}

// ---------------------------------------------------------------- battle / event / travel stage
const GRASS = { meadow: 'meadow', garden: 'lush', gully: 'meadow', labyrinth: 'dry', marsh: 'marsh', guardian: 'dusk' };
const FIELD = { meadow: '#6a9a3a', garden: '#5a9a3e', gully: '#5e8a3a', labyrinth: '#a49656', marsh: '#5a7a46', guardian: '#8a7c4a' };
const FLOWER_SIZE = { poppy: [0.42, 0.62], daisy: [0.28, 0.42], cornflower: [0.4, 0.56], lavender: [0.55, 0.8], narcissus: [0.34, 0.46], clover: [0.18, 0.26], buttercup: [0.26, 0.4] };
const WILD = { meadow: ['poppy', 'daisy', 'buttercup', 'cornflower', 'lavender', 'clover'], garden: ['daisy', 'buttercup', 'poppy', 'lavender', 'narcissus'], gully: ['daisy', 'buttercup', 'cornflower', 'clover'], labyrinth: ['lavender', 'cornflower', 'poppy'], marsh: ['buttercup', 'daisy', 'clover'], guardian: ['lavender', 'poppy', 'buttercup'] };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ARENA_C = [0.3, 0.8], ARENA_R = [9.2, 3.0];
const arenaD = (x, z) => Math.hypot((x - ARENA_C[0]) / ARENA_R[0], (z - ARENA_C[1]) / ARENA_R[1]);

/** opts.event: an event id from game/data/events.js -> its set-piece is staged around the curiosity */
export async function realStage(theme = 'meadow', seed = 1, renderer, { arenaClear = true, event = null } = {}) {
  const g = new THREE.Group(); g.name = 'stage:' + theme; const rnd = mulberry32(seed * 7919 + 13); const trees = []; const jobs = []; const L = LOOKS[theme] || LOOKS.meadow;
  const place = PLACES[theme] || PLACES.meadow; const set = event ? SETS[event] : null;
  T.WIND.ptrK.value = 0; T.WIND.amp.value = 1;
  const hName = HDRI[theme] || 'golden_cape_hill';
  const hdr = await loadHDRI(hName, renderer).catch(() => null); const rep = (t, n) => { const c = t.clone(); c.repeat.set(n, n); c.needsUpdate = true; return c; };
  const GTILE = { meadow: 'grass', garden: 'lush', gully: 'grass', labyrinth: 'dry', marsh: 'marsh', guardian: 'dusk' };
  const groundMat = { map: rep(groundTex(GTILE[theme] || 'grass'), 88) }, dirtMat = { map: rep(soilTex(), 88) }, gravelMat = { map: rep(gravelTex(), 88) }, arenaMat = new THREE.MeshToonMaterial({ map: rep(earthTex(theme === 'marsh' ? 0.2 : 0.45), 11), gradientMap: T.gradientMap([0.55, 0.8, 1.0]) });
  // painted anime sky, cel cumulus, hazy ridges, the sun's serene face, a warm backlight from it
  const sunDirW = SUN_SKY.clone(); const skyKey = T.SKY[theme] ? theme : 'meadow';
  g.add(T.animeSky(skyKey, sunDirW), T.animeClouds(skyKey, { seed, n: 8, z: -150, sunDir: sunDirW, cam: CAM }));
  g.add(ridges(sunDirW, T.SKY[skyKey].hor, T.SKY[skyKey].mtn.slice().reverse()));
  const sunPos = CAM.clone().addScaledVector(sunDirW, 150); g.add(sunBillboard(sunPos, 11));
  const back = new THREE.DirectionalLight(0xffc27a, 1.7); back.position.copy(sunDirW).multiplyScalar(30).setY(9); g.add(back);

  // ---- the land: gentle noise rising towards the back, ring hills far out, plus the place's hills and water basins
  const n = makeNoise(seed + 3); const farK = theme === 'garden' ? 0.12 : theme === 'marsh' ? 0.6 : 1; const hills = [], waters = [];
  const base = (x, z) => { const far = Math.max(0, -z - 8) * 0.06; const amp = 0.12 + 0.38 * Math.max(smooth(3, 5, Math.abs(z)), smooth(8, 11, Math.abs(x))) + 0.5 * smooth(12, 18, Math.abs(z)); const y = (n.fbm(x * 0.08 + 9, z * 0.08, 4) - 0.5) * amp + Math.min(3.6, far * far * 1.3) * farK; const rr = Math.hypot(x + 6, z - 6); const ring = Math.max(0, rr - 48) * 0.07; return y + Math.min(4.2, ring * ring * 1.4) * (0.3 + 0.7 * smooth(-12, -4, z)); };
  const land = (x, z) => { let y = base(x, z); for (const h of hills) { const d2 = ((x - h.x) ** 2 + (z - h.z) ** 2) / (h.r * h.r); if (d2 < 6) y += h.h * Math.exp(-d2 * 1.5); } return y; };
  // inside a basin the bed sinks below the water; a shelf just outside keeps every shore at least level with the water
  // (water levels sit high on their shores, so near banks barely rise above the surface and draw no silhouette line)
  const hAt = (x, z) => { let y = land(x, z); for (const w of waters) { const e = w.edgeD(x, z); if (e >= 1.5) continue;
    const bank = y + Math.max(0, w.level + 0.05 + (e - 1) * 0.4 - y) * (1 - smooth(1.12, 1.45, e)); const bed = Math.min(y, w.level - 0.02 - 0.42 * smooth(1.0, 0.72, e));
    y = bed + (bank - bed) * smooth(0.86, 0.985, e); } return y; };
  const ctx = makeCtx({ g, theme, seed, rnd, hAt, jobs, trees, waters, hills, skyKey });
  ctx.phase = 'set'; set?.plan?.(ctx); ctx.phase = 'place'; place.plan?.(ctx); ctx.phase = 'build';
  for (const w of waters) { const hs = []; for (let i = 0; i < 64; i++) { const p = w.mesh.userData.edgePoint((i / 64) * Math.PI * 2, 0.97); hs.push(land(p.x, p.z)); } hs.sort((a, b) => a - b); w.level = hs[Math.floor(hs.length * (w.pct ?? 0.6))] - 0.06; w.mesh.position.y = w.level; g.add(w.mesh); }

  // ---- ground: a warped grid, fine around the action and coarse at the horizon; painted cel field over a soft splat
  const S = 201, H = 112, X0 = -4, Z0 = 0; const pos = new Float32Array(S * S * 3), uvs = new Float32Array(S * S * 2); const idx = [];
  const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 1.7) * H;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const x = X0 + warp((i / (S - 1)) * 2 - 1), z = Z0 + warp((j / (S - 1)) * 2 - 1); const k = j * S + i; pos[k * 3] = x; pos[k * 3 + 1] = hAt(x, z); pos[k * 3 + 2] = z; uvs[k * 2] = (x + 110) / 220; uvs[k * 2 + 1] = 1 - (z + 110) / 220; }
  for (let j = 0; j < S - 1; j++) for (let i = 0; i < S - 1; i++) { const a = j * S + i, b = a + 1, c = a + S, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const dryTheme = theme === 'gully' || theme === 'labyrinth' || theme === 'guardian';
  const ground = new THREE.Mesh(geo, splatGround(geo, new THREE.MeshToonMaterial({ map: groundMat.map, gradientMap: T.gradientMap([0.55, 0.8, 1.0]) }), dirtMat, gravelMat, { tint: '#ffffff', dirt: theme === 'gully' ? 0.6 : 0.72, gravel: 0.74, green: dryTheme && theme !== 'gully' ? 0.2 : theme === 'marsh' ? 0.45 : 0.75, field: FIELD[theme] || FIELD.meadow, fieldK: theme === 'gully' ? 0.6 : dryTheme ? 0.35 : 0.55 }));
  ground.receiveShadow = true; ground.name = 'ground'; g.add(ground);
  if (arenaClear) { const am = arenaMat.clone(); am.alphaMap = softMask(); ditherAlpha(am, 64); const ag = new THREE.PlaneGeometry(22, 9, 44, 18); ag.rotateX(-Math.PI / 2); const ap = ag.attributes.position; for (let i = 0; i < ap.count; i++) ap.setY(i, hAt(ap.getX(i) + 0.3, ap.getZ(i) + 0.8) + 0.03); ag.computeVertexNormals(); const arena = new THREE.Mesh(ag, am); arena.position.set(0.3, 0, 0.8); arena.receiveShadow = true; arena.renderOrder = 1; arena.userData.noInk = true; g.add(arena); }

  // ---- the road first (everything else keeps clear of it), then the event's set, then the place around it
  const road = buildRoad(ctx); const rp = road.getSpacedPoints(160); ctx.roadPts = rp;
  if (set) { ctx.phase = 'set'; set.build(ctx); ctx.phase = 'build'; }
  place.build(ctx);
  if (ctx.dragonflies) g.add(dragonflies(5, ctx.dragonflies, waters[0]?.level ?? 0));

  // ---- the living layer: woods, bushes, reeds, lilies, flowers and the cel grass
  g.add(ctx.grove.build()); for (const p of ctx.grove.perches(10)) { g.add(p); trees.push(p); }
  if (ctx.padSpots.length) g.add(F.lilyPads(ctx.padSpots));
  const plants = grassField(ctx, theme, L); // pixel-art tufts, flower drifts, reeds and cattails: one instanced billboard field
  for (const [kind, spots] of Object.entries(ctx.flowerSpots)) { const [a, b] = FLOWER_SIZE[kind] || [0.3, 0.5]; for (const [x, y, z, h] of spots) plants.push({ kind: FLOWER_SPRITE[kind] || kind, x, y, z, s: 0.8 + ((h - a) / (b - a || 1)) * 0.35 }); }
  for (const [x, y, z, h] of ctx.reedSpots) plants.push({ kind: Math.abs(Math.sin(x * 91.7 + z * 37.3)) < 0.3 ? 'cattail' : 'reeds', x, y, z, s: 0.7 + Math.min(1.8, h) * 0.22, flex: 1.1 });
  g.add(windMotes(theme, hAt));
  await Promise.all(jobs);
  // vertex AO on the ground: darker under trees, rocks, houses and ruins
  { const pp = geo.attributes.position; const cc = new Float32Array(pp.count * 3); const grid = new Map(); for (const s of ctx.aoSpots) { const key = Math.floor(s[0] / 6) + ',' + Math.floor(s[1] / 6); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(s); }
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i); let k = 1; const gx = Math.floor(x / 6), gz = Math.floor(z / 6); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const list = grid.get((gx + a) + ',' + (gz + b)); if (list) for (const [ax, az, r] of list) { const d = Math.hypot(x - ax, z - az); if (d < r) k -= (1 - d / r) * 0.36; } } k = Math.max(0.5, k); cc[i * 3] = k; cc[i * 3 + 1] = k * 0.98; cc[i * 3 + 2] = k * 0.96; }
    geo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); }
  { const c = new THREE.Color(); const grid = new Map(); for (const sp of ctx.aoSpots) { const key = Math.floor(sp[0] / 6) + ',' + Math.floor(sp[1] / 6); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(sp); }
    for (const it of plants) { let k = 1; const gx = Math.floor(it.x / 6), gz = Math.floor(it.z / 6); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const list = grid.get((gx + a) + ',' + (gz + b)); if (list) for (const [ax, az, rr] of list) { const d = Math.hypot(it.x - ax, it.z - az); if (d < rr) k -= (1 - d / rr) * 0.3; } }
      const j = Math.sin(it.x * 12.9898 + it.z * 78.233) * 0.5; c.setRGB(1, 1, 1).offsetHSL(j * 0.02, 0, j * 0.04).multiplyScalar(Math.max(0.62, k) * (it.dry ? 1.04 : 1)); it.tint = c.clone(); }
    g.add(plantField(plants, { wind: T.WIND, tick: T.tickWind, push: { value: F.GRASS_PUSH }, onScene: F.updatePushers, cam: CAM, tint: PLANT_TINT[theme] || PLANT_TINT.meadow })); }
  const rockTops = ctx.rocks.map(([x, z, s]) => new V3(x, hAt(x, z) + 0.4 * s, z));
  const animals = (cr) => { if (!cr) return; if (theme !== 'marsh') { cr.spawnGrazers?.(4, ctx.pasture || { x: [-15, -9.5], z: [-6.5, -3.8] }, ['sheep', 'sheep', 'goat']); cr.spawnGrazers?.(4, { x: [-24, -15], z: [9, 17] }); } cr.spawnLizards?.(3, rockTops); cr.spawnButterflies?.(5, new V3(-13, 0.8, 11), 7); };
  return { group: g, theme, trees, env: hdr?.envMap ?? T.gradientEnv(renderer, 'stage:' + theme), background: null, sunDir: SUN_KEY.clone(), sunPos, road, fog: new THREE.Fog(L.haze, L.fog[0], L.fog[1]), animals, hAt, waters };
}

// the builder context handed to places.js: placement, clearance, AO, and the batched living layer
function makeCtx({ g, theme, seed, rnd, hAt, jobs, trees, waters, hills, skyKey }) {
  const occ = new Map(), CELL = 3; const solid = [];
  const reserve = (x, z, r, hard = false) => { const it = [x, z, r]; for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) { const k = i + ',' + j; if (!occ.has(k)) occ.set(k, []); occ.get(k).push(it); } if (hard) solid.push(it); };
  const hit = (x, z, r) => { const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL); for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) { const l = occ.get(i + ',' + j); if (l) for (const [ax, az, ar] of l) if ((x - ax) ** 2 + (z - az) ** 2 < (r + ar) ** 2) return true; } return false; };
  const ctx = {
    g, theme, seed, rnd, hAt, waters, W: {}, aoSpots: [], rocks: [], roadPts: [], grove: new F.Grove(), padSpots: [], reedSpots: [], flowerSpots: {}, solid,
    hill(x, z, r, h) { hills.push({ x, z, r, h }); },
    water(o) { if (ctx.phase === 'place' && ctx.noThemeWater) return null; const m = F.celWater({ sun: SUN_SKY, sky: T.SKY[skyKey].hor, ...o }); const w = { ...o, mesh: m, edgeD: m.userData.edgeD, level: 0 }; waters.push(w); if (o.name) ctx.W[o.name] = w; return w; },
    p: (x, z) => new V3(x, hAt(x, z), z),
    roadD(x, z) { let d = 1e9; for (const q of ctx.roadPts) { const dd = (q.x - x) ** 2 + (q.z - z) ** 2; if (dd < d) d = dd; } return Math.sqrt(d); },
    wet(x, z, k = 1.04) { for (const w of waters) if (w.edgeD(x, z) < k) return true; return false; },
    free(x, z, r = 1) {
      if (arenaD(x, z) < 1.18 + r / 6) return false; if (z > 2.5 && z < 13.5 && Math.abs(x + 0.1) < 7.5 + (z - 2.5) * 0.35) return false; // the arena and the camera's view
      if (ctx.roadPts.length && ctx.roadD(x, z) < 1.6 + r * 0.7) return false; if (ctx.wet(x, z, 1.06)) return false; return !hit(x, z, r * 0.8);
    },
    lod(x, z) { const d = Math.hypot(x - CAM.x, z - CAM.z); return d > 42 && (!ctx.roadPts.length || ctx.roadD(x, z) > 16) ? 1 : 0; },
    tree(kind, x, z, { s = 1, lod = null, ry = null } = {}) { const it = ctx.grove.add(kind, x, hAt(x, z) - 0.06, z, { s, lod: lod ?? ctx.lod(x, z), ry }); reserve(x, z, 1.3 * s); ctx.aoSpots.push([x, z, (kind === 'cypress' ? 1.5 : 2.6) * s]); return it; },
    bush(kind, x, z, s = 1) { ctx.grove.add(kind, x, hAt(x, z) - 0.04, z, { s, lod: ctx.lod(x, z) }); reserve(x, z, 0.7 * s); ctx.aoSpots.push([x, z, 1.1 * s]); },
    model(name, x, z, { s = 1, ry = rnd() * 6.28, y = 0, stone = false, nofoot = false } = {}) {
      if (/rock|boulder/.test(name)) ctx.rocks.push([x, z, s]); if (!nofoot) { reserve(x, z, 0.6 * s * (stone ? 1.5 : 1), true); ctx.aoSpots.push([x, z, 1.1 * s]); }
      jobs.push(toonModel(name, rnd).then((o) => { o.position.set(x, y + hAt(x, z) - 0.04, z); o.rotation.y = ry; o.scale.multiplyScalar(s); g.add(o); if (/olive|umbrella|othonna/.test(name)) trees.push(o); return o; }).catch(() => null));
    },
    add(obj, x, z, { ry = 0, y = 0, s = 1, foot = 0, abs = false, raw = false } = {}) { if (!abs) { obj.position.set(x, raw ? y : hAt(x, z) + y, z); obj.rotation.y = ry; } obj.scale.multiplyScalar(s); g.add(obj); if (foot) { reserve(x, z, foot, true); ctx.aoSpots.push([x, z, foot * 1.25]); } return obj; },
    house(hs, x, z, ry = 0, o = {}) {
      const cs = Math.cos(ry), sn = Math.sin(ry); const hts = [[-2.7, -2.4], [2.7, -2.4], [2.7, 2.6], [-2.7, 2.6], [0, 0]].map(([a, b]) => hAt(x + a * cs + b * sn, z - a * sn + b * cs)); const top = Math.max(...hts), low = Math.min(...hts);
      const c = cottage(hs, { ...o, base: top - low + 0.4 }); c.group.position.set(x, top, z); c.group.rotation.y = ry; g.add(c.group); if (c.smoke.length) c.group.add(chimneySmoke(c.smoke));
      c.group.updateMatrixWorld(true); for (const gr of c.greens) { const p = c.group.localToWorld(new V3(gr.x, gr.y, gr.z)); ctx.grove.add(gr.kind, p.x, gr.y ? p.y : hAt(p.x, p.z), p.z, { s: gr.s, lod: ctx.lod(p.x, p.z) }); }
      reserve(x, z, 3.1, true); ctx.aoSpots.push([x, z, 3.8]); return c;
    },
    firePit(x, z, s = 1) { const f = firePit({ seed: Math.round(x * 3 + z) }); f.position.set(x, hAt(x, z), z); f.scale.setScalar(s); g.add(f); reserve(x, z, 0.8 * s, true); },
    smoke(points) { g.add(chimneySmoke(points)); },
    pads(w, n, force = false, k = 1) { if (!w) return; for (let i = 0; i < n * 4 && n > 0; i++) { const a = rnd() * Math.PI * 2, d = 0.35 + rnd() * 0.5; const p = w.mesh.userData.edgePoint(a, d); if (!force && rnd() < 0.5 && arenaD(p.x, p.z) < 1.3) continue; ctx.padSpots.push([p.x, w.level + 0.012, p.z, (0.32 + rnd() * 0.3) * k]); n--; } },
    clear(x, z, r) { reserve(x, z, r); },
    reeds(w, n, force = false, hk = 1) { if (!w) return; for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = 0.84 + rnd() * 0.22; const p = w.mesh.userData.edgePoint(a, d); if ((!force && arenaD(p.x, p.z) < 1.25) || (ctx.roadPts.length && ctx.roadD(p.x, p.z) < 2) || (force && p.distanceTo(new V3(-4.4, p.y, 1.2)) < 1.2)) continue; const y = d < 1 ? Math.max(w.level - 0.08, hAt(p.x, p.z)) : hAt(p.x, p.z); for (let k = 0; k < 3; k++) ctx.reedSpots.push([p.x + (rnd() - 0.5) * 0.5, y - 0.04, p.z + (rnd() - 0.5) * 0.5, (1.0 + rnd() * 0.8) * hk]); } },
    flower(kind, x, z, s = null, force = false) { if (force ? ctx.wet(x, z, 1.0) : !ctx.grassOk(x, z, 0.2)) return; const [a, b] = FLOWER_SIZE[kind] || [0.3, 0.5]; (ctx.flowerSpots[kind] ||= []).push([x, hAt(x, z) - 0.02, z, s ?? a + rnd() * (b - a)]); },
    flowersAround(w, kind, n) { if (!w) return; for (let i = 0; i < n; i++) { const p = w.mesh.userData.edgePoint(rnd() * Math.PI * 2, 1.05 + rnd() * 0.45); ctx.flower(kind, p.x, p.z, null, true); } },
    drifts(kinds, n) { // flower drifts in the visible meadow and along the road behind the camera
      for (let i = 0; i < n; i++) { const kind = kinds[i % kinds.length]; let cx, cz; if (rnd() < 0.72) { cx = -22 + rnd() * 44; cz = -15 + rnd() * 18; } else { const q = ctx.roadPts[Math.floor(rnd() * ctx.roadPts.length)] || new V3(); cx = q.x + (rnd() - 0.5) * 12; cz = q.z + (rnd() - 0.5) * 12; }
        const m = kind === 'clover' ? 30 : 16 + Math.floor(rnd() * 16); const R = 1.2 + rnd() * 1.6; for (let k = 0; k < m; k++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R; ctx.flower(kind, cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.8); } }
    },
    grassOk(x, z, pad = 0) { if (arenaClear(x, z) < 1.0) return false; if (ctx.roadPts.length && ctx.roadD(x, z) < 1.55 + pad) return false; if (ctx.wet(x, z, 1.0)) return false; for (const [ax, az, ar] of solid) if ((x - ax) ** 2 + (z - az) ** 2 < (ar * 0.85) ** 2) return false; return true; },
  };
  const arenaClear = (x, z) => arenaD(x, z); void seed; void theme;
  return ctx;
}

// pixel-art grass: layered tufts near the action and along the road, sparser and taller towards the hills, short and
// clover-dotted at the arena rim; the sprite family follows the tuft height and the field's dryness
const PLANT_TINT = { meadow: '#fff4e2', garden: '#fff2e8', gully: '#fff2dc', labyrinth: '#ffeedc', marsh: '#eef2e6', guardian: '#ffe6d6' };
const FLOWER_SPRITE = { daisy: 'chamomile', poppy: 'poppy', cornflower: 'cornflower', lavender: 'lavender', clover: 'clover', buttercup: 'buttercup', narcissus: 'narcissus', thistle: 'thistle' };
function grassField(ctx, theme, L) {
  const r = mulberry32(ctx.seed * 3 + 1); const nP = makeNoise(ctx.seed + 77); const items = []; const hAt = ctx.hAt; const MAX = 7600; const dry = L.grass;
  const add = (x, z, hk = 1) => { if (!ctx.grassOk(x, z)) return; const ad = arenaD(x, z); const rim = ad < 1.45; const patch = nP.fbm(x * 0.12, z * 0.12, 3); if (r() > 0.3 + patch * 1.1) return;
    const fore = z > 3 ? 0.8 : 1; const h = (rim ? 0.3 : (0.5 + r() * 0.5) * (0.75 + patch * 0.5)) * hk; const isDry = r() < dry * (0.4 + patch); const k = r();
    const kind = rim ? (k < 0.62 ? 'short' : k < 0.8 ? 'wide' : 'clover') : isDry ? (k < 0.3 ? 'seed' : 'dry') : h > 0.72 ? (k < 0.45 ? 'tall' : k < 0.7 ? 'wispy' : k < 0.88 ? 'wide' : 'seed') : h > 0.5 ? (k < 0.45 ? 'wide' : k < 0.75 ? 'tall' : k < 0.92 ? 'wispy' : 'fern') : (k < 0.55 ? 'short' : k < 0.85 ? 'wide' : 'clover');
    items.push({ kind, x, y: hAt(x, z) - 0.02, z, s: (0.82 + r() * 0.3) * fore * (rim ? 0.9 : 1), v: r(), dry: isDry }); };
  for (let gz = -24; gz < 7 && items.length < MAX * 0.72; gz += 0.42) for (let gx = -24; gx < 24; gx += 0.42) { const x = gx + (r() - 0.5) * 0.42, z = gz + (r() - 0.5) * 0.42; const far = z < -12 ? (z < -18 ? 0.35 : 0.6) : 1; if (r() > far) continue; add(x, z, z < -14 ? 1.3 : 1); }
  for (let i = 0; i < 9000 && items.length < MAX; i++) { const q = ctx.roadPts[Math.floor(r() * ctx.roadPts.length)]; if (!q) break; const x = q.x + (r() - 0.5) * 22, z = q.z + (r() - 0.5) * 22; if (z < 7) continue; add(x, z, 1.1); }
  // wildflowers sprinkled through the grass in loose patches
  const nF = makeNoise(ctx.seed + 19); const wild = WILD[theme] || WILD.meadow; for (const { x, z } of items.slice()) { const f = nF.fbm(x * 0.18 + 5, z * 0.18, 3); if (f > 0.58 && r() < 0.16 * (f - 0.5) * 6) ctx.flower(wild[Math.floor(nF.fbm(x * 0.05, z * 0.05 + 9, 2) * wild.length * 1.6) % wild.length], x + (r() - 0.5) * 0.3, z + (r() - 0.5) * 0.3); }
  return items;
}

// ---------------------------------------------------------------- background preload (loading screen): the CC0 models, ground sets and
// skies the stages use, as a list of tasks so the loader can pace them and report progress
export function preloadTasks(renderer) {
  const models = ['rock_moss_set_01', 'rock_moss_set_02', 'namaqualand_boulder_05', 'greek_column', 'marble_bust_01', 'horse_statue_01', 'lion_head', 'antique_ceramic_vase_01', 'ceramic_vase_04', 'wine_barrel_01', 'stone_fire_pit', 'fern_02', 'nettle_plant', 'tree_stump_01', 'dead_tree_trunk_02', 'rock_face_02', 'stone_wall_kit', 'bull_head', 'dry_branches_medium_01', 'wicker_basket_01', 'wooden_crate_01', 'round_wooden_table_01', 'brass_goblets', 'wine_bottles_01'];
  const sets = [['ground_meadow', 44], ['ground_dry_grass', 8], ['ground_rocky_trail', 44], ['ground_dry_dirt', 44], ['ground_dry_grass', 44], ['mud_mossy', 44], ['mud_wet', 8]];
  return [...models.map((m) => () => loadGLTF(m)), ...sets.map(([n, r]) => () => loadPBR(n, { repeat: r })), ...(renderer ? ['sunset_dry_plain', 'golden_dry_valley'].map((h) => () => loadHDRI(h, renderer)) : [])];
}

// ---------------------------------------------------------------- fire pit: the detailed stone ring with soft living flames
let FLAMETEX = null;
function flameTex() { return (FLAMETEX ||= canvasTex(64, 128, (g) => { const gr = g.createRadialGradient(32, 92, 2, 32, 80, 52); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.22, 'rgba(255,214,110,0.95)'); gr.addColorStop(0.55, 'rgba(255,120,30,0.55)'); gr.addColorStop(1, 'rgba(200,50,10,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(56, 52, 58, 96, 32, 124); g.bezierCurveTo(6, 96, 8, 52, 32, 2); g.fill(); })); }
export function firePit({ seed = 3 } = {}) {
  const g = new THREE.Group(); g.name = 'firePit';
  loadModel('stone_fire_pit').then((o) => { T.toonify(o, { sat: 1.2, tint: '#fff0e4', wind: 0 }); g.add(o); }).catch(() => {}); const cf = T.animeFlame(0.46, 0.9); cf.position.y = 0.08; cf.rotation.y = seed; g.add(cf);
  for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, color: new THREE.Color(1.6, 1.25, 0.9) })); const w = 0.32 + i * 0.07, h = 0.62 + i * 0.12; s.userData.noInk = true; s.position.set((i - 1.5) * 0.07, 0.3 + h * 0.35, (i % 2) * 0.05); const ph = seed + i * 1.7;
    s.onBeforeRender = () => { const t = performance.now() / 1000 + ph; const k = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23 + 1) * 0.07; s.scale.set(w * (1.08 - (k - 0.85)), h * k, 1); }; s.scale.set(w, h, 1); g.add(s); }
  return g;
}

// ---------------------------------------------------------------- map dressing: detailed trees and rocks at miniature scale
export async function dressMap(world, { count = 46, free, heightAt, rnd = mulberry32(3), W = 20, Z0 = 3, LEN = 36, scale = 1 } = {}) {
  const jobs = []; const trees = [];
  const put = async (name, x, z, s, tree) => { const o = await toonModel(name, rnd).catch(() => null); if (!o) return; o.position.set(x, heightAt(x, z), z); o.rotation.y = rnd() * 6.28; o.scale.multiplyScalar(s * scale); world.add(o); if (tree) { o.userData.perchable = true; trees.push(o); } };
  for (let i = 0; i < count; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 1.1)) continue; const r = rnd(); jobs.push(put(r < 0.35 ? 'olive_tree_wide_far' : r < 0.6 ? 'olive_tree_tall_far' : r < 0.8 ? 'othonna_cerarioides' : 'searsia_lucida', x, z, r < 0.6 ? 0.2 + rnd() * 0.06 : 0.35, r < 0.8)); }
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 0.8)) continue; jobs.push(put(rnd() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', x, z, 0.18 + rnd() * 0.12)); }
  await Promise.all(jobs); return trees;
}

// ---------------------------------------------------------------- tabletop room props (candlelit, toon-shaded)
export async function dressTabletop(scene, renderer, { kind = 'study' } = {}) {
  const env = T.gradientEnv(renderer, 'toon:room', { top: '#3a2a3a', hor: '#c8884a', gnd: '#2a1a1a' }); if (env) { scene.environment = env; scene.environmentIntensity = 0.45; }
  const rnd = mulberry32(kind.length * 31 + 7); const jobs = [];
  const put = async (name, x, y, z, s = 1, ry = 0) => { const o = await toonModel(name, rnd).catch(() => null); if (!o) return null; o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o; };
  const wood = await loadPBR('wood_dark', { repeat: 6 }).catch(() => null);
  if (wood) { const top = new THREE.Mesh(new THREE.PlaneGeometry(34, 18).rotateX(-Math.PI / 2), T.toonMaterial(wood, { sat: 1.0, paint: '#7a4a2c', paintK: 0.72, bands: [0.45, 0.72, 1.0] })); top.receiveShadow = true; top.position.y = 0.001; top.userData.noInk = true; scene.add(top); }
  for (let i = 0; i < 9; i++) jobs.push(loadModel(`book_encyclopedia_set_01#${i}`).then((b) => { T.toonify(b, { sat: 1.35, wind: 0 }); b.scale.setScalar(8); b.position.set(-12.6 + i * 0.36, 0, -5.6); b.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.05; scene.add(b); }).catch(() => {}));
  jobs.push(put('brass_candleholders', 9.5, 0, -5.2, 7, 0.4), put('lantern_01', -9.5, 0, -6.4, 6, 0.6), put('food_apple_01', -6, 0, -3, 14, 0.3), put('food_pomegranate_01', -4.8, 0, -3.6, 12, 1.2), put('food_apple_01', -5.4, 0, -4.4, 13, 2.2), put('vintage_oil_lamp', 12, 0, -2, 6, -0.4));
  if (kind === 'shop') jobs.push(put('wine_barrel_01', -9.5, 0, -2.6, 2.2, 0.3), put('treasure_chest', 9, 0, -1.6, 3.4, -0.5), put('wooden_crate_01', 11.5, 0, -4.5, 3, 0.2));
  if (kind === 'lab') { const f = firePit({ seed: 5 }); f.position.set(0, 0, -4.2); f.scale.setScalar(3.2); scene.add(f); jobs.push(put('wicker_basket_01', -7, 0, -3, 4), put('brass_vase_01', 6.5, 0, -3.8, 6)); }
  // candle flames + warm practicals
  for (const [x, y, z, i] of [[9.5, 3.0, -5.0, 10], [12.1, 1.6, -1.9, 6]]) { const l = new THREE.PointLight(0xffa04a, i, 9, 1.8); l.position.set(x, y, z); scene.add(l); }
  await Promise.all(jobs);
}
