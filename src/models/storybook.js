// Medieval storybook stage for battles and events (Sir Isaac is a marionette: a puppet-theatre illumination):
// a gilded Sol with a face hanging on a chain, a crescent moon with a face, a lapis-to-gold painted vellum sky
// with gold star flecks and hatching, scrolled manuscript clouds, and layered painted scenery flats (stepped
// mountains, a walled town on a winding road, a castle / acropolis with banners, cypress rows, olive terraces,
// turning windmills, birds). Per theme: misty marsh with a sunken temple, a maze with a bull banner, a storm-lit
// citadel for the guardian. Everything here is painted (unlit, fog-free) except the gilded sun and moon props.
import * as THREE from 'three';
import { mulberry32 } from '../core/util.js';

const TAU = Math.PI * 2; const C = (h) => new THREE.Color(h);
const CLOCK = { value: 0 }; const tick = () => { CLOCK.value = performance.now() / 1000; };
const INK = '#24160e', LAPIS = '#1f3a8e';
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const flatMat = (t, o = {}) => new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, ...o });
const noInk = (o) => { o.userData.noInk = true; o.userData.noAO = true; return o; };

export const THEMES = {
  meadow: { sky: ['#14246e', '#2a4aa8', '#7a8ad0', '#f2c0a0', '#ffd890'], hill: ['#6f8e3e', '#4a6a2e'], roof: '#b8402a', stone: '#e8dcc0', mtn: ['#8e9cc8', '#c8d0e8', '#5e6aa0'], night: false },
  garden: { sky: ['#1a1f6a', '#3a46a8', '#9a8ad0', '#f4b8b0', '#ffd8a0'], hill: ['#6a9446', '#46703a'], roof: '#a8342a', stone: '#f0e6d0', mtn: ['#9a9ad0', '#d0d0ec', '#6a68a8'], night: false },
  gully: { sky: ['#1c2468', '#3a48a0', '#a88ab8', '#f4b088', '#ffd078'], hill: ['#9a8448', '#6e5a30'], roof: '#a83a20', stone: '#ecd8b4', mtn: ['#a890a8', '#dcc8cc', '#6e5a80'], night: false },
  labyrinth: { sky: ['#160f4a', '#2e2c88', '#8a64a8', '#f09a88', '#ffc880'], hill: ['#7a7a40', '#55562e'], roof: '#8a2a20', stone: '#e0cca8', mtn: ['#8a7aa8', '#c8b8d4', '#56487a'], night: false },
  marsh: { sky: ['#06102e', '#10245a', '#2a4a7a', '#6a8a9a', '#b8c8b0'], hill: ['#3e5a48', '#2a4036'], roof: '#6a3a30', stone: '#b8c0b4', mtn: ['#4a5a7a', '#8090a8', '#2e3a58'], night: true },
  guardian: { sky: ['#0a0618', '#1e1440', '#3e2a5e', '#8a4a5a', '#d0805a'], hill: ['#3a3a2e', '#26261e'], roof: '#5a1a18', stone: '#9a8c80', mtn: ['#3a3050', '#6a5a7a', '#201830'], night: true, storm: true },
};

// ---------------------------------------------------------------- painted vellum sky
export function manuscriptSky(theme = 'meadow') {
  const T = THEMES[theme] || THEMES.meadow; const u = (h) => ({ value: C(h) });
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: u(T.sky[0]), uHi: u(T.sky[1]), uMid: u(T.sky[2]), uLow: u(T.sky[3]), uHor: u(T.sky[4]), uStars: { value: T.night ? 1.0 : 0.45 }, uFlash: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uTop, uHi, uMid, uLow, uHor; uniform float uStars, uFlash; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vW - cameraPosition); float e = degrees(asin(clamp(d.y, -1.0, 1.0))); float az = atan(d.x, -d.z);
        vec3 c = mix(uHor, uLow, smoothstep(0.0, 2.2, e)); c = mix(c, uMid, smoothstep(1.6, 4.5, e)); c = mix(c, uHi, smoothstep(4.0, 8.0, e)); c = mix(c, uTop, smoothstep(8.0, 22.0, e));
        if (e < 0.0) c = uHor;
        vec2 q = vec2(az * 60.0, e * 1.05);
        float vel = vn(q * 0.35) * 0.6 + vn(q * 1.3) * 0.3 + vn(q * 5.0) * 0.1; c *= 0.93 + vel * 0.12;           // vellum mottling
        float hatch = smoothstep(0.82, 1.0, sin((az * 900.0 + e * 14.0)) ); c *= 1.0 - hatch * 0.06 * smoothstep(3.0, 7.0, e); // fine pen hatching
        vec2 cell = floor(vec2(az * 160.0, e * 2.6)); float r = h2(cell); vec2 f = fract(vec2(az * 160.0, e * 2.6)) - 0.5;
        float star = step(1.0 - 0.06 * uStars, r) * smoothstep(0.16, 0.0, abs(f.x) * abs(f.y) * 9.0 + length(f) * 0.6) * smoothstep(4.0, 7.5, e);
        c = mix(c, vec3(1.0, 0.86, 0.45), clamp(star * 1.6, 0.0, 1.0));
        c += vec3(0.75, 0.7, 1.0) * uFlash * smoothstep(-1.0, 6.0, e);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = noInk(new THREE.Mesh(new THREE.SphereGeometry(185, 48, 24), m)); mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'manuscriptSky'; return mesh;
}

// ---------------------------------------------------------------- scrolled manuscript clouds
function cloudCanvas(seed, { storm = false } = {}) {
  const W = 640, H = 220; const [c, g] = canvas(W, H); const r = mulberry32(seed);
  const base = H * 0.72; const n = 4 + Math.floor(r() * 3); const lobes = []; let x = 40;
  for (let i = 0; i < n; i++) { const rr = 36 + r() * 46 + (i === Math.floor(n / 2) ? 26 : 0); lobes.push([x + rr, base - rr * 0.55, rr]); x += rr * 1.45; }
  const sx = (W - 60) / x; lobes.forEach((l) => { l[0] *= sx; l[2] *= Math.min(1.15, sx); });
  const outline = (inset) => { g.beginPath(); g.moveTo(26, base); for (const [lx, ly, lr] of lobes) { const rr = Math.max(4, lr - inset); g.arc(lx, ly + inset * 0.2, rr, Math.PI * 0.98, Math.PI * 1.98 + 0.12, false); } g.lineTo(W - 26, base); g.bezierCurveTo(W * 0.7, base + 22 - inset * 0.3, W * 0.3, base + 26 - inset * 0.3, 26, base); g.closePath(); };
  const cols = storm ? ['#3a3256', '#544a74', '#7a6e98', '#b0a8c8'] : ['#bcc8ec', '#dfe6fa', '#f6f2ea', '#ffffff'];
  cols.forEach((col, i) => { g.fillStyle = col; outline(i * 9); g.fill(); });
  g.strokeStyle = storm ? '#120a22' : '#2a3a7a'; g.lineWidth = 3.2; outline(0); g.stroke(); g.lineWidth = 1.6; g.globalAlpha = 0.6; outline(10); g.stroke(); g.globalAlpha = 1;
  // spiral curls at each lobe end, like illuminated clouds
  g.lineWidth = 2.4; g.strokeStyle = storm ? '#120a22' : '#2a3a7a';
  for (const [lx, ly, lr] of lobes) { const cx = lx + lr * 0.52, cy = ly - lr * 0.1; g.beginPath(); for (let a = 0; a < TAU * 1.5; a += 0.15) { const rr = lr * 0.3 * (1 - a / (TAU * 1.7)); const px = cx + Math.cos(a + Math.PI) * rr, py = cy + Math.sin(a + Math.PI) * rr; a ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
  g.globalAlpha = 0.35; g.lineWidth = 1; for (let i = 0; i < 26; i++) { const hx = 40 + r() * (W - 80), hy = base - 6 - r() * 18; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + 10, hy - 6); g.stroke(); } g.globalAlpha = 1;
  return c;
}
export function scrollClouds(theme = 'meadow', { seed = 1, n = 6, cam = new THREE.Vector3(-0.1, 3, 11.4), sunX = 8 } = {}) {
  const T = THEMES[theme] || THEMES.meadow; const g = new THREE.Group(); g.name = 'scrollClouds'; const r = mulberry32(seed * 13 + 1); const k = T.storm ? n + 4 : n;
  for (let i = 0; i < k; i++) {
    const z = -105 - r() * 30; const span = (cam.z - z) * 1.05; const x = (i / Math.max(1, k - 1) - 0.5) * span * (T.storm ? 1.6 : 1.9) + (r() - 0.5) * 8; const dz = (cam.z - z);
    if (!T.storm && Math.abs(x / dz - sunX / 51) < 0.07) continue;
    const w = (T.storm ? 34 : 26) + r() * 22; const y = 3 + dz * Math.tan((3.2 + r() * (T.storm ? 6 : 4.5)) * Math.PI / 180);
    const m = noInk(new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.34), flatMat(texOf(cloudCanvas(seed * 31 + i, { storm: T.storm }))))); m.position.set(x, y, z); m.renderOrder = -8;
    const drift = (r() - 0.5) * 0.6; const x0 = x; m.onBeforeRender = () => { m.position.x = x0 + Math.sin(performance.now() / 9000 + i) * 2 + drift * (performance.now() / 1000 % 600) * 0.0; }; g.add(m);
  }
  return g;
}

// ---------------------------------------------------------------- gilded Sol with a face (relief texture + extruded rays)
function sunFaceCanvas(height = false) {
  const S = 512, [c, g] = canvas(S, S); const cx = S / 2, cy = S / 2, R = 230;
  if (height) { const gr = g.createRadialGradient(cx, cy - 20, 20, cx, cy, R); gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(1, '#505050'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); }
  else { const gr = g.createRadialGradient(cx - 40, cy - 60, 20, cx, cy, R); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.45, '#f6cc58'); gr.addColorStop(0.85, '#d8902c'); gr.addColorStop(1, '#a8601c'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); }
  const ink = height ? '#202020' : '#6a3410', hi = height ? '#f4f4f4' : '#fff4c0', mid = height ? '#b8b8b8' : '#f0b848';
  g.lineCap = 'round'; g.lineJoin = 'round';
  // wavy hair ring
  g.strokeStyle = height ? '#9a9a9a' : '#b8701c'; g.lineWidth = 6; for (let a = 0; a < TAU; a += TAU / 28) { g.beginPath(); for (let t = 0; t <= 1; t += 0.1) { const rr = R - 34 + t * 30; const aa = a + Math.sin(t * Math.PI * 2) * 0.05; const px = cx + Math.cos(aa) * rr, py = cy + Math.sin(aa) * rr; t ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
  // cheeks (raised, rosy)
  for (const sx of [-1, 1]) { const cg = g.createRadialGradient(cx + sx * 88, cy + 52, 4, cx + sx * 88, cy + 52, 52); cg.addColorStop(0, height ? '#f0f0f0' : 'rgba(240,120,60,0.55)'); cg.addColorStop(1, height ? 'rgba(200,200,200,0)' : 'rgba(240,120,60,0)'); g.fillStyle = cg; g.beginPath(); g.arc(cx + sx * 88, cy + 52, 52, 0, TAU); g.fill(); }
  // brows
  g.strokeStyle = ink; g.lineWidth = 9; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * 26, cy - 58); g.quadraticCurveTo(cx + sx * 70, cy - 92, cx + sx * 122, cy - 62); g.stroke(); }
  // eyes: heavy-lidded, smug
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 72, ey = cy - 26; g.fillStyle = height ? '#9a9a9a' : '#fff8e0'; g.beginPath(); g.moveTo(ex - 40, ey); g.quadraticCurveTo(ex, ey - 22, ex + 40, ey); g.quadraticCurveTo(ex, ey + 18, ex - 40, ey); g.fill();
    g.fillStyle = height ? '#404040' : '#3a2a6a'; g.beginPath(); g.arc(ex + sx * 6, ey + 2, 11, 0, TAU); g.fill(); g.fillStyle = height ? '#e0e0e0' : '#e8b030'; g.beginPath(); g.moveTo(ex - 42, ey - 2); g.quadraticCurveTo(ex, ey - 26, ex + 42, ey - 2); g.quadraticCurveTo(ex, ey - 6, ex - 42, ey - 2); g.fill();
    g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.moveTo(ex - 42, ey - 1); g.quadraticCurveTo(ex, ey - 8, ex + 42, ey - 1); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(ex - 36, ey + 6); g.quadraticCurveTo(ex, ey + 18, ex + 36, ey + 6); g.stroke();
  }
  // nose: long Byzantine ridge with shaded flank
  g.fillStyle = mid; g.beginPath(); g.moveTo(cx - 6, cy - 50); g.quadraticCurveTo(cx - 24, cy + 30, cx - 30, cy + 52); g.quadraticCurveTo(cx, cy + 66, cx + 28, cy + 52); g.quadraticCurveTo(cx + 14, cy + 20, cx + 8, cy - 50); g.closePath(); g.fill();
  g.fillStyle = hi; g.beginPath(); g.moveTo(cx - 2, cy - 46); g.quadraticCurveTo(cx - 12, cy + 20, cx - 14, cy + 44); g.lineTo(cx - 4, cy + 44); g.quadraticCurveTo(cx - 2, cy + 10, cx + 3, cy - 46); g.fill();
  g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 30, cy + 50); g.quadraticCurveTo(cx - 14, cy + 64, cx, cy + 58); g.quadraticCurveTo(cx + 14, cy + 64, cx + 30, cy + 50); g.stroke();
  // lips: closed, smug half-smile
  g.fillStyle = height ? '#c8c8c8' : '#d8642e'; g.beginPath(); g.moveTo(cx - 52, cy + 98); g.quadraticCurveTo(cx - 10, cy + 84, cx + 56, cy + 90); g.quadraticCurveTo(cx + 6, cy + 124, cx - 52, cy + 98); g.fill();
  g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 58, cy + 96); g.quadraticCurveTo(cx, cy + 104, cx + 62, cy + 86); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 58, cy + 84); g.lineTo(cx + 68, cy + 78); g.stroke();
  g.lineWidth = 4; g.globalAlpha = 0.6; g.beginPath(); g.arc(cx, cy + 150, 26, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); g.globalAlpha = 1;
  return c;
}
function rayShape(wavy, len, w) {
  const s = new THREE.Shape(); if (!wavy) { s.moveTo(-w, 0); s.lineTo(0, len); s.lineTo(w, 0); s.closePath(); return s; }
  s.moveTo(-w * 0.8, 0); const n = 3; for (let i = 1; i <= n; i++) { const t = i / n; s.quadraticCurveTo((i % 2 ? 1 : -1) * w * 1.6 * (1 - t), len * (t - 0.5 / n), (i % 2 ? -1 : 1) * w * 0.3 * (1 - t), len * t * 0.98); }
  s.lineTo(0, len); for (let i = n; i >= 1; i--) { const t = i / n; s.quadraticCurveTo((i % 2 ? 1 : -1) * w * 2.2 * (1 - t) + w * 0.6, len * (t - 0.5 / n), w * 0.8 * (1 - (i - 1) / n) + 0.01, len * ((i - 1) / n)); }
  s.closePath(); return s;
}
let SUN_TEX = null;
export function sunWithFace({ radius = 1.6, chain = 14 } = {}) {
  const g = new THREE.Group(); g.name = 'solFace';
  SUN_TEX ||= { map: texOf(sunFaceCanvas(false)), bump: texOf(sunFaceCanvas(true), false) };
  const gold = new THREE.MeshStandardMaterial({ color: '#f2c45a', metalness: 0.85, roughness: 0.32, emissive: '#c88a28', emissiveIntensity: 0.55, fog: false });
  const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), new THREE.MeshStandardMaterial({ map: SUN_TEX.map, bumpMap: SUN_TEX.bump, bumpScale: 6, metalness: 0.55, roughness: 0.38, emissive: '#ffffff', emissiveMap: SUN_TEX.map, emissiveIntensity: 0.55, fog: false })); face.position.z = 0.06; g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.01, radius * 0.045, 16, 128), gold); g.add(rim);
  for (let i = 0; i < 24; i++) {
    const wavy = i % 2 === 1; const len = radius * (wavy ? 0.78 : 1.05); const geo = new THREE.ExtrudeGeometry(rayShape(wavy, len, radius * (wavy ? 0.1 : 0.13)), { depth: radius * 0.05, bevelEnabled: true, bevelThickness: radius * 0.02, bevelSize: radius * 0.015, bevelSegments: 3, curveSegments: 12 });
    const m = new THREE.Mesh(geo, gold); const a = (i / 24) * TAU; m.rotation.z = a - Math.PI / 2; m.position.set(Math.cos(a) * radius * 0.98, Math.sin(a) * radius * 0.98, -0.04); g.add(m);
  }
  const halo = noInk(new THREE.Mesh(new THREE.CircleGeometry(radius * 3.2, 64), new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }))); halo.position.z = -0.3; g.add(halo);
  // hung on a chain like a theatre prop
  const links = new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.9, roughness: 0.4, fog: false });
  for (let i = 0; i < chain; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 10, 24), links); l.scale.set(1, 1.6, 1); l.position.set(0, radius * 2.0 + 0.1 + i * 0.42, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  g.onBeforeRender = tick; let t0 = performance.now(); g.children[0].onBeforeRender = () => { const t = (performance.now() - t0) / 1000; g.rotation.z = Math.sin(t * 0.35) * 0.05; };
  return g;
}
let HALO = null;
function haloTex() { if (HALO) return HALO; const [c, g] = canvas(256, 256); const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, 'rgba(255,220,140,0.55)'); gr.addColorStop(0.45, 'rgba(255,190,110,0.18)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); HALO = texOf(c); return HALO; }

// ---------------------------------------------------------------- crescent moon with a face (profile carved into the inner edge)
export function moonWithFace({ radius = 1.7, chain = 14 } = {}) {
  const g = new THREE.Group(); g.name = 'moonFace'; const R = radius;
  const s = new THREE.Shape(); s.absarc(0, 0, R, Math.PI * 0.5, Math.PI * 1.5, false);
  // inner edge = a man-in-the-moon profile: chin, lips, nose, brow, forehead (bottom to top)
  const P = [[0.0, -1.0], [0.18, -0.86], [0.22, -0.66], [0.12, -0.55], [0.22, -0.44], [0.12, -0.36], [0.34, -0.2], [0.14, -0.1], [0.16, 0.06], [0.08, 0.22], [0.2, 0.34], [0.1, 0.52], [0.1, 0.75], [0.0, 1.0]];
  for (const [x, y] of P) s.lineTo(-R * 0.18 + x * R * 0.9, y * R);
  const geo = new THREE.ExtrudeGeometry(s, { depth: R * 0.18, bevelEnabled: true, bevelThickness: R * 0.07, bevelSize: R * 0.06, bevelSegments: 6, curveSegments: 48 }); geo.translate(0, 0, -R * 0.09);
  const silver = new THREE.MeshStandardMaterial({ color: '#e8e2c8', metalness: 0.75, roughness: 0.3, emissive: '#8a8ab0', emissiveIntensity: 0.45, fog: false });
  g.add(new THREE.Mesh(geo, silver));
  const [c, x] = canvas(128, 128); x.strokeStyle = '#2a2a48'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(30, 60); x.quadraticCurveTo(64, 40, 96, 58); x.stroke(); x.beginPath(); x.moveTo(36, 72); x.quadraticCurveTo(64, 86, 94, 70); x.stroke(); x.fillStyle = '#2a2a48'; x.beginPath(); x.arc(70, 66, 8, 0, TAU); x.fill();
  const eye = noInk(new THREE.Mesh(new THREE.PlaneGeometry(R * 0.36, R * 0.36), new THREE.MeshBasicMaterial({ map: texOf(c), transparent: true, depthWrite: false, fog: false }))); eye.position.set(-R * 0.36, R * 0.22, R * 0.17); g.add(eye);
  const halo = noInk(new THREE.Mesh(new THREE.CircleGeometry(R * 3, 64), new THREE.MeshBasicMaterial({ map: haloTex(), color: '#a8b8ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }))); halo.position.z = -0.3; g.add(halo);
  const links = new THREE.MeshStandardMaterial({ color: '#9a9aa8', metalness: 0.9, roughness: 0.4, fog: false });
  for (let i = 0; i < chain; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.033, 10, 24), links); l.scale.set(1, 1.6, 1); l.position.set(-R * 0.3, R + 0.1 + i * 0.4, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); }
  g.rotation.z = -0.2; return g;
}

// ---------------------------------------------------------------- painted scenery flats
function paintMountains(T, seed) {
  const W = 2400, H = 520; const [c, g] = canvas(W, H); const r = mulberry32(seed);
  for (let layer = 0; layer < 2; layer++) {
    let x = -60;
    while (x < W + 60) {
      const w = 140 + r() * 180, h = H * (0.42 + r() * 0.42) * (layer ? 0.75 : 1); const base = H; const steps = 4 + Math.floor(r() * 3);
      const pts = [[x, base]]; for (let s = 0; s < steps; s++) { const t = s / steps; const yy = base - h * (t + 1 / steps); pts.push([x + w * 0.5 * t + r() * 10, base - h * t], [x + w * 0.5 * t + w * 0.06, yy]); } pts.push([x + w * 0.5, base - h - 8]);
      for (let s = steps - 1; s >= 0; s--) { const t = s / steps; pts.push([x + w - w * 0.5 * t - w * 0.06, base - h * (t + 1 / steps)], [x + w - w * 0.5 * t - r() * 10, base - h * t]); } pts.push([x + w, base]);
      const poly = () => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); };
      g.fillStyle = layer ? T.mtn[0] : T.mtn[2]; poly(); g.fill();
      g.save(); poly(); g.clip(); g.fillStyle = T.mtn[1]; for (let s = 0; s < steps; s++) { const t = s / steps; g.fillRect(x, base - h * (t + 1 / steps) - 2, w, 7); } g.strokeStyle = INK; g.globalAlpha = 0.3; g.lineWidth = 1.4; for (let k = 0; k < w; k += 7) { g.beginPath(); g.moveTo(x + w * 0.5 + k, base - h); g.lineTo(x + w * 0.5 + k - 40, base); g.stroke(); } g.restore();
      g.strokeStyle = INK; g.lineWidth = 2.6; poly(); g.stroke();
      x += w * (0.55 + r() * 0.3);
    }
  }
  return c;
}
function banner(g, x, y, col = '#b8302a', h = 34, emblem = null) { g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(x, y - h); g.quadraticCurveTo(x + 18, y - h + 2, x + 34, y - h + 6); g.lineTo(x + 24, y - h + 12); g.lineTo(x + 34, y - h + 18); g.quadraticCurveTo(x + 16, y - h + 18, x, y - h + 16); g.closePath(); g.fill(); g.lineWidth = 1.6; g.stroke(); if (emblem) emblem(x + 12, y - h + 9); }
function tower(g, x, base, w, h, T, roof = true) { g.fillStyle = T.stone; g.fillRect(x - w / 2, base - h, w, h); g.strokeStyle = INK; g.lineWidth = 2.2; g.strokeRect(x - w / 2, base - h, w, h); g.fillStyle = INK; for (let k = 0; k < 3; k++) g.fillRect(x - 2, base - h + 10 + k * 16, 4, 8); if (roof) { g.fillStyle = T.roof; g.beginPath(); g.moveTo(x - w / 2 - 5, base - h); g.lineTo(x, base - h - w * 1.3); g.lineTo(x + w / 2 + 5, base - h); g.closePath(); g.fill(); g.stroke(); } else { for (let k = -w / 2; k < w / 2; k += 8) { g.fillStyle = T.stone; g.fillRect(x + k, base - h - 7, 5, 7); g.strokeRect(x + k, base - h - 7, 5, 7); } } }
function paintTown(theme, T, seed) {
  const W = 2400, H = 560; const [c, g] = canvas(W, H); const r = mulberry32(seed + 9); g.lineJoin = 'round'; g.lineCap = 'round';
  const hill = (cx, w, h, col = T.hill[0]) => { g.fillStyle = col; g.beginPath(); g.moveTo(cx - w, H); g.bezierCurveTo(cx - w * 0.6, H - h * 1.05, cx - w * 0.2, H - h, cx, H - h); g.bezierCurveTo(cx + w * 0.3, H - h, cx + w * 0.6, H - h * 1.02, cx + w, H); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); g.save(); g.clip(); g.strokeStyle = T.hill[1]; g.lineWidth = 2; g.globalAlpha = 0.55; for (let k = 0; k < 40; k++) { const hx = cx - w + r() * w * 2, hy = H - r() * h; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + 12, hy + 7); g.stroke(); } g.restore(); return H - h; };
  // winding road up to the town gate
  const road = () => { g.strokeStyle = '#d8b878'; g.lineWidth = 22; g.beginPath(); g.moveTo(W * 0.48, H); g.bezierCurveTo(W * 0.62, H - 60, W * 0.5, H - 110, W * 0.66, H - 150); g.bezierCurveTo(W * 0.74, H - 180, W * 0.7, H - 200, W * 0.74, H - 214); g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.6; g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1; };
  if (theme === 'guardian') {
    // the storm-lit citadel on a crag
    g.fillStyle = '#2a2430'; g.beginPath(); g.moveTo(W * 0.3, H); g.lineTo(W * 0.38, H - 220); g.lineTo(W * 0.42, H - 250); g.lineTo(W * 0.52, H - 265); g.lineTo(W * 0.6, H - 230); g.lineTo(W * 0.7, H); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    const b = H - 255; for (const [x, w, h] of [[0.4, 46, 130], [0.45, 70, 90], [0.5, 52, 170], [0.55, 70, 100], [0.6, 40, 120]]) tower(g, W * x, b + 10, w, h, { ...T, stone: '#6a6070' }, x !== 0.45 && x !== 0.55);
    g.fillStyle = '#ffd070'; for (let k = 0; k < 14; k++) g.fillRect(W * (0.4 + r() * 0.2), b - 20 - r() * 120, 4, 7);
    banner(g, W * 0.5, b - 170 - 10, '#6a1018', 46, (x, y) => { g.fillStyle = '#e8c060'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); });
    return c;
  }
  if (theme === 'marsh') {
    // a sunken temple in still water + misty banks
    g.fillStyle = '#5a7a80'; g.fillRect(0, H - 120, W, 120); g.strokeStyle = '#c8d8d0'; g.globalAlpha = 0.5; for (let k = 0; k < 60; k++) { const x = r() * W, y = H - 110 + r() * 100; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y); g.stroke(); } g.globalAlpha = 1;
    const tx = W * 0.56, tb = H - 70; g.fillStyle = T.stone; g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(tx - 160, tb - 150); g.lineTo(tx, tb - 220); g.lineTo(tx + 120, tb - 168); g.lineTo(tx + 120, tb - 150); g.closePath(); g.fill(); g.stroke();
    for (let k = 0; k < 6; k++) { const cx = tx - 140 + k * 50; const tilt = k === 4 ? 0.12 : 0; g.save(); g.translate(cx, tb); g.rotate(tilt); g.fillRect(-10, -150, 20, 150); g.strokeRect(-10, -150, 20, 150); for (let f = -6; f <= 6; f += 6) { g.beginPath(); g.moveTo(f, -146); g.lineTo(f, 0); g.stroke(); } g.restore(); }
    g.fillStyle = 'rgba(90,122,128,0.85)'; g.fillRect(0, tb - 30, W, 40);
    hill(W * 0.15, 360, 110, T.hill[0]); hill(W * 0.88, 420, 130, T.hill[1]);
    return c;
  }
  // meadow / garden / gully / labyrinth: castle (or acropolis) hill, walled town on a road
  const ch = hill(W * 0.26, 420, 210, T.hill[0]); hill(W * 0.72, 520, 150, T.hill[1]); road();
  if (theme === 'garden' || theme === 'gully') {
    const ax = W * 0.26, ab = ch + 4; g.fillStyle = T.stone; g.strokeStyle = INK; g.lineWidth = 2.4; g.fillRect(ax - 130, ab - 14, 260, 14); g.strokeRect(ax - 130, ab - 14, 260, 14);
    for (let k = 0; k < 8; k++) { const x = ax - 116 + k * 33; g.fillRect(x - 7, ab - 104, 14, 90); g.strokeRect(x - 7, ab - 104, 14, 90); }
    g.beginPath(); g.moveTo(ax - 136, ab - 104); g.lineTo(ax, ab - 150); g.lineTo(ax + 136, ab - 104); g.closePath(); g.fill(); g.stroke(); banner(g, ax + 150, ab - 8, '#b8302a', 60); banner(g, ax - 150, ab - 8, '#2a4aa8', 60);
  } else {
    const cx = W * 0.26, cb = ch + 10; tower(g, cx - 80, cb, 44, 120, T); tower(g, cx + 80, cb, 44, 130, T); tower(g, cx, cb, 60, 170, T); g.fillStyle = T.stone; g.fillRect(cx - 80, cb - 70, 160, 70); g.strokeStyle = INK; g.lineWidth = 2.2; g.strokeRect(cx - 80, cb - 70, 160, 70);
    for (let k = -80; k < 80; k += 12) { g.fillRect(cx + k, cb - 78, 7, 8); g.strokeRect(cx + k, cb - 78, 7, 8); }
    const emblem = theme === 'labyrinth' ? (x, y) => { g.fillStyle = INK; g.beginPath(); g.arc(x, y + 1, 4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 7, y - 4); g.quadraticCurveTo(x - 4, y, x - 2, y - 1); g.moveTo(x + 7, y - 4); g.quadraticCurveTo(x + 4, y, x + 2, y - 1); g.lineWidth = 2; g.stroke(); } : null;
    banner(g, cx, cb - 170 - 78, theme === 'labyrinth' ? '#a8201a' : '#b8302a', 44, emblem); banner(g, cx - 80, cb - 120 - 56, '#2a4aa8', 36); banner(g, cx + 80, cb - 130 - 56, '#e8b040', 36);
  }
  // walled town on the right hill
  const tx = W * 0.74, tb = H - 214; g.fillStyle = T.stone; g.strokeStyle = INK; g.lineWidth = 2.2;
  for (let k = 0; k < 14; k++) { const hx = tx - 170 + k * 26 + r() * 6, hh = 30 + r() * 40; g.fillStyle = T.stone; g.fillRect(hx, tb - hh, 22, hh); g.strokeRect(hx, tb - hh, 22, hh); g.fillStyle = T.roof; g.beginPath(); g.moveTo(hx - 3, tb - hh); g.lineTo(hx + 11, tb - hh - 18); g.lineTo(hx + 25, tb - hh); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = T.stone; g.fillRect(tx - 200, tb, 400, 30); g.strokeRect(tx - 200, tb, 400, 30); for (let k = -200; k < 200; k += 12) { g.fillRect(tx + k, tb - 7, 7, 7); g.strokeRect(tx + k, tb - 7, 7, 7); }
  tower(g, tx - 200, tb + 30, 34, 80, T); tower(g, tx + 200, tb + 30, 34, 80, T); g.fillStyle = INK; g.beginPath(); g.arc(tx, tb + 30, 14, Math.PI, 0); g.fill();
  if (theme === 'labyrinth') { // maze walls on the near slope
    const mx = W * 0.5, my = H - 60; g.strokeStyle = '#d8c8a0'; g.lineWidth = 9; for (let k = 0; k < 4; k++) { const w = 280 - k * 60, h = 70 - k * 15; g.beginPath(); g.ellipse(mx, my, w, h, 0, Math.PI * (1.05 + k * 0.08), Math.PI * (1.95 - k * 0.05)); g.stroke(); } g.strokeStyle = INK; g.lineWidth = 2; for (let k = 0; k < 4; k++) { const w = 280 - k * 60, h = 70 - k * 15; g.beginPath(); g.ellipse(mx, my - 5, w, h, 0, Math.PI * (1.05 + k * 0.08), Math.PI * (1.95 - k * 0.05)); g.stroke(); }
    banner(g, mx + 300, my - 20, '#a8201a', 70, (x, y) => { g.fillStyle = INK; g.beginPath(); g.arc(x + 3, y + 1, 5, 0, TAU); g.fill(); });
  }
  return c;
}
function paintNearRow(theme, T, seed) {
  const W = 2400, H = 360; const [c, g] = canvas(W, H); const r = mulberry32(seed + 77); g.lineJoin = 'round';
  if (theme === 'marsh') { // misty reed beds
    for (let k = 0; k < 420; k++) { const x = r() * W, h = 60 + r() * 150, lean = (r() - 0.5) * 20; g.strokeStyle = r() < 0.5 ? '#2a3e34' : '#3e5640'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + lean * 0.4, H - h * 0.6, x + lean, H - h); g.stroke(); if (r() < 0.3) { g.fillStyle = '#4a3020'; g.fillRect(x + lean - 3, H - h - 2, 6, 18); } }
    for (let k = 0; k < 5; k++) { const y = H - 40 - k * 34; const gr = g.createLinearGradient(0, y - 20, 0, y + 20); gr.addColorStop(0, 'rgba(220,230,226,0)'); gr.addColorStop(0.5, 'rgba(220,230,226,0.45)'); gr.addColorStop(1, 'rgba(220,230,226,0)'); g.fillStyle = gr; g.fillRect(0, y - 20, W, 40); }
    return c;
  }
  // olive terraces + cypress rows + windmills
  const hillY = (x) => H - 120 - Math.sin(x * 0.004 + seed) * 50 - Math.sin(x * 0.011) * 22;
  g.fillStyle = T.hill[1]; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 20) g.lineTo(x, hillY(x)); g.lineTo(W, H); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
  for (let t = 1; t <= 3; t++) { g.strokeStyle = 'rgba(30,20,10,0.45)'; g.lineWidth = 1.6; g.beginPath(); for (let x = 0; x <= W; x += 20) { const y = hillY(x) + t * 34; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); for (let x = 20 + t * 9; x < W; x += 34 + r() * 10) { const y = hillY(x) + t * 34 - 9; g.fillStyle = T.hill[0]; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke(); } }
  for (let k = 0; k < 26; k++) { const x = r() * W; const y = hillY(x) + 6; const h = 60 + r() * 50; g.fillStyle = '#24402a'; g.beginPath(); g.moveTo(x, y - h); g.quadraticCurveTo(x + 13, y - h * 0.4, x + 4, y); g.lineTo(x - 4, y); g.quadraticCurveTo(x - 13, y - h * 0.4, x, y - h); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); }
  return c;
}
function flat(cv, w, h, x, y, z, order) { const m = noInk(new THREE.Mesh(new THREE.PlaneGeometry(w, h), flatMat(texOf(cv)))); m.position.set(x, y + h / 2, z); m.renderOrder = order; return m; }
function windmill(x, y, z, s = 1) {
  const g = new THREE.Group(); const [c, x2] = canvas(128, 256); x2.fillStyle = '#efe6d2'; x2.strokeStyle = INK; x2.lineWidth = 4; x2.beginPath(); x2.moveTo(34, 256); x2.lineTo(44, 70); x2.lineTo(84, 70); x2.lineTo(94, 256); x2.closePath(); x2.fill(); x2.stroke(); x2.fillStyle = '#9a3a28'; x2.beginPath(); x2.moveTo(36, 72); x2.lineTo(64, 24); x2.lineTo(92, 72); x2.closePath(); x2.fill(); x2.stroke(); x2.fillStyle = INK; x2.fillRect(58, 200, 12, 30); x2.fillRect(60, 120, 8, 12);
  g.add(noInk(new THREE.Mesh(new THREE.PlaneGeometry(1.6 * s, 3.2 * s), flatMat(texOf(c)))));
  const [c2, x3] = canvas(256, 256); x3.strokeStyle = INK; x3.lineWidth = 3; for (let k = 0; k < 4; k++) { x3.save(); x3.translate(128, 128); x3.rotate((k * TAU) / 4); x3.fillStyle = '#f4ecd8'; x3.beginPath(); x3.moveTo(4, 0); x3.lineTo(14, -110); x3.lineTo(40, -110); x3.lineTo(30, -10); x3.closePath(); x3.fill(); x3.stroke(); for (let l = -100; l < -10; l += 18) { x3.beginPath(); x3.moveTo(10, l); x3.lineTo(36, l); x3.stroke(); } x3.restore(); } x3.fillStyle = INK; x3.beginPath(); x3.arc(128, 128, 8, 0, TAU); x3.fill();
  const sails = noInk(new THREE.Mesh(new THREE.PlaneGeometry(3 * s, 3 * s), flatMat(texOf(c2)))); sails.position.set(0, 0.95 * s, 0.05); const sp = 0.4 + Math.random() * 0.3; sails.onBeforeRender = () => { sails.rotation.z = -performance.now() / 1000 * sp; }; g.add(sails);
  g.position.set(x, y + 1.6 * s, z); g.children.forEach((m) => (m.renderOrder = -5)); return g;
}
function birds(n, seed, cam) {
  const g = new THREE.Group(); const [c, x] = canvas(64, 32); x.strokeStyle = INK; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(4, 12); x.quadraticCurveTo(18, 2, 32, 18); x.quadraticCurveTo(46, 2, 60, 12); x.stroke(); const t = texOf(c); const r = mulberry32(seed + 5);
  for (let i = 0; i < n; i++) { const m = noInk(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), flatMat(t))); const z = -60 - r() * 30, y = 9 + r() * 6, x0 = (r() - 0.5) * 60, sp = 0.6 + r() * 0.8, ph = r() * 10; m.renderOrder = -6;
    m.onBeforeRender = () => { const s = performance.now() / 1000; m.position.set(((x0 + s * sp + 60) % 120) - 60, y + Math.sin(s * 0.7 + ph) * 0.6, z); m.scale.y = 0.6 + Math.abs(Math.sin(s * 6 + ph)) * 0.6; }; m.position.set(x0, y, z); g.add(m); }
  void cam; return g;
}
// lightning for the storm theme: bolts flash over the citadel and light the sky
function lightning(sky, seed) {
  const g = new THREE.Group(); const r = mulberry32(seed + 3); const bolts = [];
  for (let b = 0; b < 3; b++) { const pts = []; let x = (r() - 0.5) * 30, y = 34; while (y > 8) { pts.push([x, y]); x += (r() - 0.5) * 4; y -= 2 + r() * 3; } const pos = []; for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const w = 0.25; pos.push(x0 - w, y0, 0, x0 + w, y0, 0, x1 + w, y1, 0, x0 - w, y0, 0, x1 + w, y1, 0, x1 - w, y1, 0); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const m = noInk(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8e0ff').multiplyScalar(2.5), fog: false, toneMapped: false, side: THREE.DoubleSide }))); m.position.z = -90; m.visible = false; m.renderOrder = -7; g.add(m); bolts.push(m); }
  let next = 1.5, on = -1; sky.onBeforeRender = () => { const t = performance.now() / 1000; if (t > next) { on = t; next = t + 2.5 + Math.random() * 4; const b = bolts[Math.floor(Math.random() * bolts.length)]; bolts.forEach((x) => (x.visible = x === b)); } const k = on > 0 ? Math.max(0, 1 - (t - on) / 0.35) : 0; sky.material.uniforms.uFlash.value = k * k * 0.5; if (k <= 0) bolts.forEach((x) => (x.visible = false)); };
  return g;
}

/** the whole storybook backdrop for a theme. sunDir: direction from the battle camera to the sun/moon prop. */
export function storybookBackdrop(theme = 'meadow', { seed = 1, cam = new THREE.Vector3(-0.1, 3, 11.4), sunDir = new THREE.Vector3(Math.sin(0.16), 0.098, -Math.cos(0.16)).normalize() } = {}) {
  const T = THEMES[theme] || THEMES.meadow; const g = new THREE.Group(); g.name = 'storybook:' + theme;
  const sky = manuscriptSky(theme); g.add(sky);
  const prop = theme === 'marsh' ? moonWithFace({ radius: 1.7 }) : theme === 'guardian' ? null : sunWithFace({ radius: 1.55 });
  if (prop) { const p = cam.clone().addScaledVector(sunDir, 52); prop.position.copy(p); prop.lookAt(cam); g.add(prop); }
  const sunX = cam.x + (sunDir.x / -sunDir.z) * 51;
  g.add(scrollClouds(theme, { seed, cam, sunX }));
  g.add(flat(paintMountains(T, seed), 150, 32.5, 0, -6, -132, -9));
  g.add(flat(paintTown(theme, T, seed), 112, 26.1, 4, -4, -92, -7));
  g.add(flat(paintNearRow(theme, T, seed), 118, 17.7, 0, -2.5, -50, -4));
  if (theme !== 'marsh' && theme !== 'guardian') for (const [x, z] of [[-26, -49.5], [21, -49.4], [34, -49.6]]) g.add(windmill(x, 3.6, z, 1.15));
  if (!T.storm) g.add(birds(theme === 'marsh' ? 4 : 7, seed, cam));
  if (T.storm) g.add(lightning(sky, seed));
  return g;
}
