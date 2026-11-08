// Mythical Wilderness environments: sculpted low-poly props, golden-hour sky, and stage themes.
import * as THREE from 'three';
import * as S from './sculpt.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { mulberry32 } from '../core/util.js';
import { makeNoise } from '../gfx/pixel.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85, ...o });
const mats = {};
const M = (k, fn) => (mats[k] ||= fn());
const mesh = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p?.add(o); return o; };

export const PROPS = {
  oliveTree(seed = 1, s = 1) {
    const g = new THREE.Group(); const rnd = mulberry32(seed);
    const bark = M('bark', () => F({ map: TEX.bark('olive', ['#2a2016', '#3e3224', '#5a4a36', '#76644a', '#93805c']), roughness: 0.95 }));
    const leaf = M('olive', () => F({ map: TEX.leaves('olive', R.olive, { density: 300 }), roughness: 0.9 }));
    const leaf2 = M('olive2', () => F({ color: 0x7a8a48, roughness: 0.9 }));
    // gnarled twisting trunk + branches
    const trunk = [[0, 0, 0], [0.15 * (rnd() - 0.5), 0.6, 0.1], [0.3 * (rnd() - 0.5), 1.2, -0.1], [0.2, 1.7, 0]];
    mesh(S.horn(trunk, 0.32, 0.12, { sides: 6, segs: 6, seed }), bark, g);
    for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2; const y = 1.2 + rnd() * 0.5; mesh(S.horn([[0.1, y, 0], [Math.cos(a) * 0.6, y + 0.4, Math.sin(a) * 0.5], [Math.cos(a) * 1.0, y + 0.6 + rnd() * 0.3, Math.sin(a) * 0.8]], 0.1, 0.03, { sides: 5, segs: 4, seed: seed + i }), bark, g); }
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + rnd(); const r = 0.5 + rnd() * 0.6; mesh(S.blob(0.55 + rnd() * 0.35, 0.35 + rnd() * 0.2, 0.5 + rnd() * 0.3, { detail: 1, seed: seed * 10 + i, amt: 0.25 }), i % 3 ? leaf : leaf2, g, Math.cos(a) * r, 2.0 + rnd() * 0.6, Math.sin(a) * r * 0.8); }
    g.scale.setScalar(s); return g;
  },
  cypress(seed = 1, s = 1) {
    const g = new THREE.Group(); const m = M('cyp', () => F({ map: TEX.leaves('cyp', ['#14261a', '#1d3a26', '#2a5034', '#3a6a42'], { density: 340 }) }));
    mesh(S.limb(0.5, 0.1, 0.08, { sides: 5, seed }), M('bark', () => F({ color: 0x3e3224 })), g, 0, 0.5, 0);
    for (let i = 0; i < 5; i++) mesh(S.blob(0.42 - i * 0.07, 0.75, 0.42 - i * 0.07, { detail: 1, seed: seed + i, amt: 0.18 }), m, g, 0, 0.9 + i * 0.75, 0);
    g.scale.setScalar(s); return g;
  },
  rock(seed = 1, s = 1, kind = 'stone') {
    const ramp = { stone: R.stone, moss: R.stone, marble: R.marble }[kind] || R.stone;
    const m = M('rock' + kind, () => F({ map: TEX.noise('rock' + kind, ramp.slice(1, 6), { scale: 0.18, seed: 4 }), roughness: 0.95 }));
    const g = new THREE.Group(); mesh(S.blob(0.6, 0.42, 0.55, { detail: 1, seed, amt: 0.3, flatBottom: true }), m, g, 0, 0.18, 0);
    if (kind === 'moss') mesh(S.blob(0.45, 0.12, 0.4, { detail: 1, seed: seed + 9, amt: 0.3 }), M('moss', () => F({ color: 0x4f7a2a })), g, 0.05, 0.48, 0);
    g.scale.setScalar(s); return g;
  },
  column(seed = 1, h = 3.2, broken = false) {
    const g = new THREE.Group(); const marble = M('marble', () => F({ map: TEX.marble(), roughness: 0.6 }));
    mesh(S.slab(0.9, 0.22, 0.9, { seed, jitter: 0.04 }), marble, g, 0, 0.11, 0);
    const shaft = new THREE.CylinderGeometry(0.32, 0.36, h, 10, 3); S.warp(shaft, { amt: 0.02, seed });
    if (broken) { const p = shaft.attributes.position; const rnd = mulberry32(seed); for (let i = 0; i < p.count; i++) if (p.getY(i) > h / 2 - 0.01) p.setY(i, p.getY(i) - rnd() * 0.5); }
    mesh(S.facet(shaft), marble, g, 0, 0.22 + h / 2, 0);
    if (!broken) { mesh(S.slab(0.85, 0.18, 0.85, { seed: seed + 1 }), marble, g, 0, h + 0.3, 0); mesh(S.slab(1.0, 0.14, 1.0, { seed: seed + 2 }), marble, g, 0, h + 0.46, 0); }
    return g;
  },
  grassField(n = 500, w = 30, d = 14, seed = 3, color = 0x6a8a36) {
    const blade = new THREE.ConeGeometry(0.035, 0.3, 3); blade.translate(0, 0.15, 0);
    const mat = F({ color, roughness: 0.9, flatShading: true });
    const inst = new THREE.InstancedMesh(blade, mat, n); const rnd = mulberry32(seed); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * w, z = (rnd() - 0.5) * d; if (Math.abs(z) < 2.2 && Math.abs(x) < 9 && rnd() < 0.85) { i--; continue; }
      q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5)); const s = 0.6 + rnd() * 1.1;
      m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.8), s)); inst.setMatrixAt(i, m4);
      c.setHSL(0.2 + rnd() * 0.08, 0.45 + rnd() * 0.2, 0.28 + rnd() * 0.16); inst.setColorAt(i, c);
    }
    inst.receiveShadow = true; return inst;
  },
  flowers(n = 60, w = 26, d = 12, seed = 5) {
    const geo = new THREE.IcosahedronGeometry(0.07, 0); const inst = new THREE.InstancedMesh(geo, F({ roughness: 0.6 }), n); const rnd = mulberry32(seed); const m4 = new THREE.Matrix4(); const c = new THREE.Color();
    const cols = [0xf6b3a0, 0xffe08a, 0xf3e6c4, 0xb48cff, 0xe8705a];
    for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * w, z = (rnd() - 0.5) * d; if (Math.abs(z) < 2 && Math.abs(x) < 8) { i--; continue; } m4.makeTranslation(x, 0.3 + rnd() * 0.15, z); inst.setMatrixAt(i, m4); inst.setColorAt(i, c.set(cols[i % cols.length])); }
    return inst;
  },
  amphora(seed = 1, s = 1) { const g = new THREE.Group(); mesh(S.turn([[0.001, 0], [0.12, 0.02], [0.3, 0.25], [0.32, 0.5], [0.2, 0.8], [0.1, 0.9], [0.13, 1.0], [0.001, 1.0]], { sides: 9, seed }), M('terra', () => F({ map: TEX.cloth('terra', ['#5a2a14', '#8a4424', '#b06434', '#c88450', '#1a1220'], { stripes: { size: 9, ramp: ['#1a1220', '#2a1a14', '#3a2418'] }, weave: false }), roughness: 0.7 })), g); g.scale.setScalar(s); return g; },
  statue(seed = 1, s = 1) {
    // a petrified would-be hero, mid-scream
    const g = new THREE.Group(); const st = M('statue', () => F({ map: TEX.noise('statue', R.stone.slice(2, 7), { scale: 0.3, seed: 8 }), roughness: 0.9 }));
    mesh(S.slab(0.8, 0.3, 0.8, { seed }), st, g, 0, 0.15, 0);
    for (const sx of [-1, 1]) mesh(S.limb(0.9, 0.11, 0.07, { sides: 6, seed: seed + sx }), st, g, sx * 0.13, 1.25, 0);
    mesh(S.turn([[0.001, 0], [0.24, 0.05], [0.28, 0.5], [0.2, 0.72], [0.001, 0.75]], { sides: 7, seed: seed + 3 }), st, g, 0, 1.2, 0);
    const head = mesh(S.blob(0.16, 0.19, 0.17, { detail: 1, seed: seed + 4 }), st, g, 0, 2.12, 0.02);
    mesh(S.slab(0.08, 0.1, 0.04, { seed }), M('dk', () => F({ color: 0x2e2a30 })), head, 0, -0.05, 0.15);
    const arm = mesh(S.limb(0.7, 0.08, 0.05, { sides: 6, seed: seed + 5 }), st, g, 0.3, 1.85, 0); arm.rotation.z = 2.4;
    const arm2 = mesh(S.limb(0.7, 0.08, 0.05, { sides: 6, seed: seed + 6 }), st, g, -0.3, 1.85, 0.1); arm2.rotation.set(-1.2, 0, -0.6);
    mesh(S.slab(0.1, 0.9, 0.05, { seed: seed + 7 }), st, g, 0.75, 2.4, 0).rotation.z = 0.5;
    g.scale.setScalar(s); return g;
  },
  mazeWall(len = 3, h = 2.2, seed = 1) {
    const m = M('maze', () => F({ map: TEX.blocks('maze', ['#3a2a20', '#5a4634', '#7a6248', '#9a7e5e', '#b89c78'], { bw: 16, bh: 8 }), roughness: 0.95 }));
    const g = new THREE.Group(); mesh(S.slab(len, h, 0.6, { seed, jitter: 0.03, segs: 2 }), m, g, 0, h / 2, 0);
    for (let i = 0; i < 4; i++) mesh(S.blob(0.3, 0.12, 0.3, { detail: 0, seed: seed + i }), M('ivy', () => F({ color: 0x3a6a2a })), g, (i / 3 - 0.5) * len, h - 0.05, 0.2);
    return g;
  },
  reeds(n = 40, w = 20, d = 6, seed = 2) {
    const g = new THREE.Group(); const rnd = mulberry32(seed); const m = M('reed', () => F({ color: 0x6a7a3a }));
    for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * w, z = -2.5 - rnd() * d; const h = 0.8 + rnd() * 1.2; mesh(S.horn([[0, 0, 0], [(rnd() - 0.5) * 0.2, h * 0.6, 0], [(rnd() - 0.5) * 0.4, h, (rnd() - 0.5) * 0.2]], 0.04, 0.005, { sides: 3, segs: 3, seed: i }), m, g, x, 0, z); }
    return g;
  },
  mountains(seed = 1) {
    const g = new THREE.Group(); const rnd = mulberry32(seed);
    const cols = [0x8a6a8a, 0x9a7a90, 0xb08a90];
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 6; i++) {
      const m = M('mtn' + layer, () => F({ color: cols[layer], roughness: 1 }));
      const b = mesh(S.blob(5 + rnd() * 4, 3 + rnd() * 3.5 - layer, 3, { detail: 1, seed: seed + layer * 10 + i, amt: 0.25, flatBottom: true }), m, g, (i - 2.5) * 9 + rnd() * 4, -1, -38 - layer * 10);
      b.castShadow = false;
    }
    return g;
  },
  clouds(seed = 1) {
    const g = new THREE.Group(); const rnd = mulberry32(seed); const m = M('cloud', () => F({ color: 0xffe8d0, emissive: 0xff9a60, emissiveIntensity: 0.25, roughness: 1 }));
    for (let c = 0; c < 6; c++) { const cl = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = mesh(S.blob(1.2 + rnd(), 0.6 + rnd() * 0.4, 0.8, { detail: 1, seed: seed + c * 7 + i, amt: 0.2 }), m, cl, i * 1.1 - 2, rnd() * 0.5, rnd() * 0.5); b.castShadow = false; } cl.position.set((c - 2.5) * 12 + rnd() * 6, 12 + rnd() * 5, -30 - rnd() * 10); g.add(cl); }
    return g;
  },
};

// sky dome: gradient + sun glow, rendered behind everything
export function skyDome({ top = 0x3a5a9a, mid = 0xe8a070, bottom = 0xf6d0a0, sun = new THREE.Vector3(-0.5, 0.25, -1) } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) }, uBot: { value: new THREE.Color(bottom) }, uSun: { value: sun.clone().normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 uTop, uMid, uBot, uSun; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c = h > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.55, h)) : mix(uMid, uBot, smoothstep(0.0, -0.3, h));
        float s = max(0.0, dot(normalize(vDir), uSun)); c += vec3(1.0,0.85,0.55) * (pow(s, 600.0) * 4.0 + pow(s, 24.0) * 0.45 + pow(s, 4.0) * 0.12);
        float band = floor(h * 40.0) / 40.0; c *= 1.0 + (fract(sin(band * 91.7) * 43758.5) - 0.5) * 0.015;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), mat); m.frustumCulled = false; m.renderOrder = -1; return m;
}

// ground with dirt arena in the middle
export function groundPlane(theme = 'meadow') {
  const n = makeNoise(7); const W = 256; const c = document.createElement('canvas'); c.width = W; c.height = W; const g = c.getContext('2d'); const id = g.createImageData(W, W);
  const grass = theme === 'marsh' ? R.swamp : R.grass; const dirt = theme === 'labyrinth' ? R.dirt : R.dirt;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W - 0.5, v = y / W - 0.5; const arena = Math.exp(-(u * u * 5 + v * v * 22)) + (n.fbm(x * 0.03, y * 0.03, 4) - 0.5) * 0.6;
    const t = n.fbm(x * 0.08, y * 0.08, 3); const ramp = arena > 0.45 ? dirt : grass; const k = Math.max(1, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1) + ((x * 7 + y * 3) % 4) * 0.15)));
    const hex = ramp[k]; const i = (y * W + x) * 4; id.data[i] = parseInt(hex.slice(1, 3), 16); id.data[i + 1] = parseInt(hex.slice(3, 5), 16); id.data[i + 2] = parseInt(hex.slice(5, 7), 16); id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const geo = new THREE.PlaneGeometry(60, 40, 30, 20); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const far = Math.max(0, -z - 6) * 0.08 + Math.max(0, Math.abs(x) - 14) * 0.1; p.setY(i, (n.fbm(x * 0.1 + 9, z * 0.1, 3) - 0.5) * 0.6 * (Math.abs(z) > 3 ? 1 : 0.1) + far * far); }
  const m = mesh(S.facet(geo), F({ map: tex, roughness: 0.95 }), null); m.castShadow = false; return m;
}

// full battle stage: returns { group, update, theme, sunDir }
export function buildStage(theme = 'meadow', seed = 1) {
  const g = new THREE.Group(); const rnd = mulberry32(seed);
  const skies = {
    meadow: { top: 0x3f6aa8, mid: 0xf0a878, bottom: 0xf6d6a8 }, garden: { top: 0x5a4a8a, mid: 0xe89a8a, bottom: 0xf2c0a8 }, gully: { top: 0x4a5a8a, mid: 0xe0a060, bottom: 0xe8c890 },
    labyrinth: { top: 0x2a2a5a, mid: 0xc8705a, bottom: 0xd8a080 }, marsh: { top: 0x2a4a5a, mid: 0x9ab08a, bottom: 0xc8d0a0 }, guardian: { top: 0x1a1a40, mid: 0xd0604a, bottom: 0xe8a070 },
  };
  g.add(skyDome(skies[theme] || skies.meadow));
  g.add(groundPlane(theme));
  g.add(PROPS.mountains(seed)); g.add(PROPS.clouds(seed));
  const place = (o, x, z, ry = rnd() * 6) => { o.position.set(x, 0, z); o.rotation.y = ry; g.add(o); return o; };
  // background trees / framing
  for (let i = 0; i < 7; i++) place(PROPS.oliveTree(seed + i, 0.9 + rnd() * 0.5), -14 + i * 4.6 + rnd() * 1.5, -7 - rnd() * 4);
  for (let i = 0; i < 5; i++) place(PROPS.cypress(seed + 20 + i, 0.9 + rnd() * 0.5), -16 + i * 8 + rnd() * 3, -11 - rnd() * 3);
  place(PROPS.oliveTree(seed + 40, 1.3), -10.5, 1.5); place(PROPS.oliveTree(seed + 41, 1.2), 11.5, 0.5);
  for (let i = 0; i < 9; i++) place(PROPS.rock(seed + i, 0.6 + rnd() * 1.1, rnd() < 0.4 ? 'moss' : 'stone'), (rnd() - 0.5) * 26, -3 - rnd() * 5);
  g.add(PROPS.grassField(theme === 'labyrinth' ? 500 : 1600, 34, 16, seed, theme === 'marsh' ? 0x4f7a4a : 0x6a8a36)); g.add(PROPS.flowers(70, 30, 14, seed));
  if (theme === 'garden' || theme === 'guardian') { for (let i = 0; i < 4; i++) place(PROPS.statue(seed + i, 0.9 + rnd() * 0.2), -9 + i * 6 + rnd(), -4.5 - rnd() * 2, (rnd() - 0.5) * 1.2); for (let i = 0; i < 5; i++) place(PROPS.column(seed + i, 3 + rnd(), rnd() < 0.5), -12 + i * 6, -6.5 - rnd()); }
  if (theme === 'meadow') { for (let i = 0; i < 6; i++) place(PROPS.amphora(seed + i, 0.5 + rnd() * 0.3), 6 + rnd() * 6, -3.5 - rnd() * 2); place(PROPS.column(seed + 9, 3, true), -7, -4.5); }
  if (theme === 'gully') { for (let i = 0; i < 6; i++) place(PROPS.rock(seed + 30 + i, 1.8 + rnd() * 1.5), -14 + i * 5.5, -5.5 - rnd() * 2); }
  if (theme === 'labyrinth') { for (let i = 0; i < 6; i++) place(PROPS.mazeWall(3 + rnd() * 3, 2.4, seed + i), -13 + i * 5.2, -4.5 - (i % 2) * 2.4, (i % 3) * Math.PI / 2); }
  if (theme === 'marsh') { g.add(PROPS.reeds(70, 30, 7, seed)); const water = mesh(new THREE.PlaneGeometry(40, 9, 12, 4), F({ color: 0x2a5a5a, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85 }), g, 0, 0.06, -6.5); water.rotation.x = -Math.PI / 2; water.receiveShadow = true; }
  return { group: g, theme };
}
