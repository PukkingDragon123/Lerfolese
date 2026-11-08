// Realistic, golden-hour environments from the CC0 asset library (Poly Haven): olive groves with real branches and
// leaves, shrubs, rocks, ruins and statuary with their full PBR maps, a physically based sky with a gilded, serene
// sun face, volumetric-looking cloud layers, aerial haze, wind in every leaf and blade, drifting leaves and pollen,
// little animals, and a polished winding road (ruts, worn cobbles, edge stones, sky puddles, wildflowers) that comes
// from far behind the battle camera into the arena (exported as stage.road for the intro cinematic).
// Environment meshes never get ink outlines (userData.noInk); the black lines stay on the characters.
import * as THREE from 'three';
import { loadModel, loadGLTF, loadPBR, loadHDRI, variantCount, hdriSunDirection } from '../gfx/assets.js';
import { mulberry32 } from '../core/util.js';
import { makeNoise } from '../gfx/pixel.js';
import { Particles } from '../gfx/particles.js';
import * as T from './toon.js';

const V3 = THREE.Vector3;
const GROUND = { meadow: 'ground_meadow', garden: 'ground_meadow', gully: 'ground_rocky_trail', labyrinth: 'ground_dry_grass', marsh: 'mud_mossy', guardian: 'ground_dry_grass' };
const ARENA = { meadow: 'ground_dry_grass', garden: 'ground_rocky_trail', gully: 'ground_dry_dirt', labyrinth: 'ground_rocky_trail', marsh: 'mud_wet', guardian: 'ground_rocky_trail' };
const HDRI = { meadow: 'sunset_dry_plain', garden: 'sunset_dry_plain', gully: 'golden_dry_valley', labyrinth: 'sunset_dry_plain', marsh: 'golden_dry_valley', guardian: 'sunset_dry_plain' };
// sky looks per theme: Preetham sky params, haze colour (fog = aerial perspective), cloud tint
const LOOKS = {
  meadow: { turb: 4.6, ray: 1.9, mie: 0.0042, g: 0.78, haze: '#d9b38c', fog: [60, 220], cloud: '#fff1dc', shade: '#9c86a8', grass: 0.12 },
  garden: { turb: 4.2, ray: 2.1, mie: 0.004, g: 0.77, haze: '#e0b4a0', fog: [60, 220], cloud: '#ffeee4', shade: '#a48ab4', grass: 0.1 },
  gully: { turb: 4.5, ray: 1.0, mie: 0.0035, g: 0.76, haze: '#d8a878', fog: [52, 200], cloud: '#ffe8cc', shade: '#a08490', grass: 0.55 },
  labyrinth: { turb: 4, ray: 1.5, mie: 0.0032, g: 0.75, haze: '#d4987c', fog: [52, 200], cloud: '#ffe2cc', shade: '#90709a', grass: 0.5 },
  marsh: { turb: 6, ray: 1.3, mie: 0.005, g: 0.75, haze: '#a8b4a4', fog: [40, 170], cloud: '#eef0e4', shade: '#7c8a98', grass: 0.03 },
  guardian: { turb: 6, ray: 2.0, mie: 0.004, g: 0.78, haze: '#b8786a', fog: [46, 190], cloud: '#ffd4b8', shade: '#6a4a6a', grass: 0.35 },
};
export const SUN_SKY = new V3(Math.sin(0.3), 0.088, -Math.cos(0.3)).normalize(); // visible sun, upper right of the battle view
const SUN_KEY = new V3(-0.55, 0.62, 0.42).normalize(); // key light kept from the front-left so faces read
const CAM = new V3(-0.1, 3, 11.4);
const vcount = new Map();
async function variant(name, rnd) { if (!vcount.has(name)) vcount.set(name, await variantCount(name).catch(() => 0)); const n = vcount.get(name); return loadModel(n > 1 ? `${name}#${Math.floor(rnd() * n)}` : name); }
const LOOK = { // per-family toon tuning: saturation, albedo tint, leaf tint, wind
  tree: { sat: 1.35, leafTint: '#e8f0c0', wind: 1, windH: 0.18 }, shrub: { sat: 1.4, leafTint: '#f0f4c8', wind: 0.8, windH: 0.6 }, grass: { sat: 1.45, leafTint: '#f4f0b0', wind: 1.3, windH: 1.2 },
  rock: { sat: 1.15, tint: '#f2e6ff', wind: 0 }, stone: { sat: 1.1, tint: '#fff4ea', wind: 0 }, prop: { sat: 1.25, wind: 0 },
};
function lookFor(name) {
  if (/olive|umbrella|othonna/.test(name)) return LOOK.tree; if (/searsia|shrub|fern|nettle|weed|sorrel/.test(name)) return LOOK.shrub;
  if (/grass|celandine|gazania|dandelion/.test(name)) return LOOK.grass; if (/rock|boulder|cliff/.test(name)) return LOOK.rock;
  if (/column|wall|marble|statue|bust|lion|bull|horse|fire_pit/.test(name)) return LOOK.stone; return LOOK.prop;
}
export async function toonModel(name, rnd = Math.random, look = null) { const o = await variant(name, rnd); return T.toonify(o, look || lookFor(name)); }

/** realistic model with wind in its leaves (events, map props) */
export async function envModel(name, rnd = Math.random, wind = 1) { const o = await variant(name, rnd); return T.windify(o, { amp: wind, h: /olive|umbrella|othonna/.test(name) ? 0.16 : 0.9 }); }

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
// pseudo-volumetric cloud deck: fbm density, lit toward the sun (silver lining), self-shadowed underneath
function cloudLayer(look, sunDir, { y = 22, w = 520, d = 260, z = -190, scale = 0.012, cover = 0.48 } = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
    uniforms: { uTime: T.WIND.time, uSun: { value: sunDir.clone().normalize() }, uLit: { value: new THREE.Color(look.cloud) }, uShade: { value: new THREE.Color(look.shade) }, uScale: { value: scale }, uCover: { value: cover } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime, uScale, uCover; uniform vec3 uSun, uLit, uShade; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += n2(p) * a; p = p * 2.03 + 11.7; a *= 0.5; } return s; }
      void main(){ vec2 p = vW.xz * uScale + vec2(uTime * 0.004, uTime * 0.0015);
        float dens = smoothstep(uCover, uCover + 0.32, fbm(p));
        vec2 toSun = normalize(uSun.xz + 1e-4) * 0.06; float lit = clamp((dens - smoothstep(uCover, uCover + 0.32, fbm(p + toSun))) * 3.0 + 0.55, 0.0, 1.0);
        vec3 c = mix(uShade, uLit, lit); c += vec3(1.0, 0.75, 0.45) * pow(max(0.0, dot(normalize(vW - cameraPosition), uSun)), 12.0) * 0.6 * (1.0 - dens * 0.5);
        float fade = smoothstep(420.0, 160.0, length(vW.xz - cameraPosition.xz)) * smoothstep(60.0, 120.0, length(vW.xz - cameraPosition.xz));
        gl_FragColor = vec4(c, dens * 0.92 * fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), m); mesh.position.set(0, y, z); mesh.renderOrder = -7; mesh.userData.noInk = true; mesh.userData.noAO = true; mesh.onBeforeRender = T.tickWind; mesh.frustumCulled = false; return mesh;
}
// still water with sky reflections and moving ripples (normal map from noise)
let RIPPLE = null;
function realWater(w, d) {
  RIPPLE ||= canvasTex(256, 256, (g, S) => { const n = makeNoise(41); const id = g.createImageData(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const hx = n.fbm((x + 1) * 0.05, y * 0.05, 4) - n.fbm((x - 1) * 0.05, y * 0.05, 4), hy = n.fbm(x * 0.05, (y + 1) * 0.05, 4) - n.fbm(x * 0.05, (y - 1) * 0.05, 4); const i = (y * S + x) * 4; id.data[i] = 128 + hx * 900; id.data[i + 1] = 128 + hy * 900; id.data[i + 2] = 255; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }, false);
  const nm = RIPPLE.clone(); nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.repeat.set(w / 6, d / 6); nm.needsUpdate = true;
  const m = new THREE.MeshPhysicalMaterial({ color: '#1e2c2c', roughness: 0.06, metalness: 0, normalMap: nm, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.94, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.08 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); mesh.receiveShadow = true; mesh.userData.noInk = true;
  mesh.onBeforeRender = () => { const t = performance.now() / 1000; nm.offset.set(t * 0.012, t * 0.008); }; return mesh;
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

// ---------------------------------------------------------------- golden-hour backdrop: the sunset HDRI on a dome, rotated so its sun sits in view
function hdriDome(tex, rot, exposure = 0.62, haze = '#d9b38c') {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { tEq: { value: tex }, uRot: { value: rot }, uExp: { value: exposure }, uHaze: { value: new THREE.Color(haze) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform sampler2D tEq; uniform float uRot, uExp; uniform vec3 uHaze; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float c = cos(-uRot), s = sin(-uRot); d = vec3(d.x * c + d.z * s, d.y, -d.x * s + d.z * c);
        vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
        vec3 col = texture2D(tEq, uv).rgb * uExp; col = col / (1.0 + max(0.0, dot(col, vec3(0.333)) - 1.2) * 0.8); col = min(col, vec3(2.6)); float l = dot(col, vec3(0.299, 0.587, 0.114)); col = max(mix(vec3(l), col, 1.18), 0.0);
        float e = degrees(asin(clamp(normalize(vW - cameraPosition).y, -1.0, 1.0)));
        col = mix(col, uHaze * (0.9 + 0.25 * smoothstep(-2.0, 6.0, e)), max(smoothstep(1.5, -1.0, e), smoothstep(0.42, 0.05, l) * smoothstep(22.0, 3.0, e) * 0.85));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(190, 64, 32), m); mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.userData.noInk = true; mesh.userData.noAO = true; mesh.name = 'hdriSky'; return mesh;
}
// layered distant ridges fading into the haze (smooth silhouettes, vertex-colour aerial perspective)
function ridges(sunDir, haze, cols) {
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
function splatGround(geo, grassM, dirtM, gravelM, { tint = '#c8d8a0', dirt = 0.62, gravel = 0.66, green = 0.55 } = {}) {
  const m = grassM; m.vertexColors = true; m.roughness = 1;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tDirt: { value: dirtM.map }, tGravel: { value: gravelM.map }, uTint: { value: new THREE.Color(tint) }, uDirt: { value: dirt }, uGravel: { value: gravel }, uGreen: { value: green } });
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D tDirt, tGravel; uniform vec3 uTint; uniform float uDirt, uGravel, uGreen; varying vec3 vWP;\nfloat sh2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat sn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(sh2(i), sh2(i + vec2(1, 0)), f.x), mix(sh2(i + vec2(0, 1)), sh2(i + vec2(1, 1)), f.x), f.y); }\nfloat sf(vec2 p){ return sn(p) * 0.55 + sn(p * 2.1 + 3.1) * 0.3 + sn(p * 4.3 + 7.7) * 0.15; }\n'
      + sh.fragmentShader.replace('#include <map_fragment>', `
        vec3 cg = texture2D(map, vMapUv).rgb * uTint; vec3 cd = texture2D(tDirt, vMapUv * 1.37).rgb; vec3 cv = texture2D(tGravel, vMapUv * 0.83).rgb;
        float wd = smoothstep(uDirt, uDirt + 0.12, sf(vWP.xz * 0.11 + 4.0)); float wv = smoothstep(uGravel, uGravel + 0.1, sf(vWP.xz * 0.07 + 19.0)) * (1.0 - wd * 0.6);
        float patchy = sf(vWP.xz * 0.35); cg = mix(cg, vec3(dot(cg, vec3(0.333))) * vec3(0.92, 1.3, 0.55), uGreen); cg *= mix(vec3(0.86, 0.9, 0.78), vec3(1.1, 1.06, 0.9), patchy);
        diffuseColor.rgb *= mix(mix(cg, cd, wd), cv, wv);`);
  };
  m.customProgramCacheKey = () => 'splatGround'; return m;
}
// ---------------------------------------------------------------- grass: instanced Poly Haven clump cards (alpha, wind) + soft blades
async function grassClumps(g, places) {
  const gltf = await loadGLTF('grass_clumps'); const kids = gltf.scene.children; const byV = new Map();
  for (const p of places) { const v = p.v % kids.length; if (!byV.has(v)) byV.set(v, []); byV.get(v).push(p); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new V3(), o = new V3();
  for (const [v, list] of byV) {
    const child = kids[v]; child.updateMatrixWorld(true); const inv = child.matrixWorld.clone().invert(); const base = new THREE.Matrix4().compose(new V3(), child.quaternion, child.scale);
    child.traverse((mesh) => { if (!mesh.isMesh) return; const rel = base.clone().multiply(inv.clone().multiply(mesh.matrixWorld)); const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const im = new THREE.InstancedMesh(mesh.geometry, T.windMaterial(mat, { amp: 1.3, h: 3.5 }), list.length);
      list.forEach((p, i) => { m4.compose(o.set(p.x, p.y, p.z), q.setFromEuler(e.set(0, p.ry, 0)), s.set(p.s, p.s * (0.85 + p.k * 0.4), p.s)).multiply(rel); im.setMatrixAt(i, m4); });
      im.castShadow = false; im.receiveShadow = true; im.userData.noInk = true; im.onBeforeRender = T.tickWind; im.frustumCulled = false; g.add(im); });
  }
}
// a cobblestone texture (rounded setts in sandy joints) + its height map, painted once
let COBBLE = null;
function cobbleTex() {
  if (COBBLE) return COBBLE; const S = 512, cell = 42; const pts = []; const r = mulberry32(77); const cols = Math.ceil(S / cell);
  for (let j = 0; j < cols; j++) for (let i = 0; i < cols; i++) pts.push([(i + 0.15 + r() * 0.7) * cell, (j + 0.15 + r() * 0.7) * cell, r()]);
  const grid = (i, j) => pts[((j + cols) % cols) * cols + ((i + cols) % cols)];
  const mk = (height) => canvasTex(S, S, (g) => { const id = g.createImageData(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const ci = Math.floor(x / cell), cj = Math.floor(y / cell); let d1 = 1e9, d2 = 1e9, best = null; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const p = grid(ci + di, cj + dj); const px = p[0] + (ci + di < 0 ? -S : ci + di >= cols ? S : 0) * 0, py = p[1]; let dx = x - (p[0] + Math.floor((ci + di) / cols) * S), dy = y - (p[1] + Math.floor((cj + dj) / cols) * S); void px; void py; const dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; d1 = dd; best = p; } else if (dd < d2) d2 = dd; }
    const edge = Math.sqrt(d2) - Math.sqrt(d1); const stone = Math.min(1, Math.max(0, (edge - 3) / 9)); const k = (y * S + x) * 4;
    if (height) { const v = Math.round(60 + stone * 170 * (0.8 + best[2] * 0.2)); id.data[k] = id.data[k + 1] = id.data[k + 2] = v; } else { const t = best[2]; const base = [118 + t * 50, 108 + t * 40, 96 + t * 34]; const joint = [92, 80, 62]; for (let c = 0; c < 3; c++) id.data[k + c] = joint[c] + (base[c] - joint[c]) * stone - (1 - stone) * 6 + ((x * 7 + y * 13) % 9) - 4; }
    id.data[k + 3] = 255; } g.putImageData(id, 0, 0); }, !height);
  COBBLE = { map: mk(false), bump: mk(true) }; for (const t of [COBBLE.map, COBBLE.bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; } return COBBLE;
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
function buildRoad(g, hAt, rnd, jobs, place) {
  const pts = [[-40, 33], [-33, 27], [-28, 20.5], [-21, 16.5], [-15.5, 11.5], [-11.5, 7.2], [-8.2, 4.2], [-6, 2.4], [-4.6, 1.5]].map(([x, z]) => new V3(x, hAt(x, z), z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const W = 2.7; const tmp = new V3(), tan = new V3(), side = new V3();
  // packed dirt and gravel trail, soft edges blending into the meadow, grooved wheel ruts
  const trail = new THREE.Mesh(ribbon(curve, 0, 1, W, hAt), new THREE.MeshStandardMaterial({ color: '#d8c6aa', vertexColors: true, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
  trail.receiveShadow = true; trail.userData.noInk = true; trail.renderOrder = 1; trail.name = 'road'; g.add(trail);
  loadPBR('ground_rocky_trail', { repeat: 1 }).then((m) => { for (const k of ['map', 'normalMap', 'roughnessMap']) { const tx = m[k]; if (!tx) continue; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1, 1); tx.needsUpdate = true; } Object.assign(trail.material, { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap }); trail.material.normalScale.set(1.4, 1.4); trail.material.needsUpdate = true; }).catch(() => {});
  // worn cobble stretches
  const cb = cobbleTex(); for (const [a, b] of [[0.42, 0.52], [0.8, 0.975]]) { const m = new THREE.Mesh(ribbon(curve, a, b, W * 0.86, hAt, { segs: 60, lift: 0.045, rut: false, vScale: 1.6, across: [-1, -0.8, -0.5, 0, 0.5, 0.8, 1] }), new THREE.MeshStandardMaterial({ map: cb.map, bumpMap: cb.bump, bumpScale: 4, roughness: 0.82, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = true; m.renderOrder = 2; m.userData.noInk = true; g.add(m); }
  // puddles in the ruts, mirroring the sky
  const pudMat = new THREE.MeshPhysicalMaterial({ color: '#2a3036', roughness: 0.02, metalness: 0.1, envMapIntensity: 1.8, clearcoat: 1, transparent: true, opacity: 0.9 });
  for (const s of [0.3, 0.61, 0.7]) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const o = tmp.clone().addScaledVector(side, (rnd() < 0.5 ? -1 : 1) * 0.4); const sh = new THREE.Shape(); const n = 16; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const r = (0.5 + Math.sin(a * 3 + s * 9) * 0.1 + Math.sin(a * 5) * 0.05); i ? sh.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.55) : sh.moveTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.55); } const pm = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8).rotateX(-Math.PI / 2), pudMat); pm.position.set(o.x, hAt(o.x, o.z) + 0.035, o.z); pm.rotation.y = -Math.atan2(tan.z, tan.x); pm.renderOrder = 3; pm.userData.noInk = true; g.add(pm); }
  // occasional flat stones half-buried at the verges, wildflowers, scenery along the way
  for (let s = 0.08; s < 0.95; s += 0.09 + rnd() * 0.08) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const o = tmp.clone().addScaledVector(side, (rnd() < 0.5 ? -1 : 1) * (W / 2 + 0.15 + rnd() * 0.3)); jobs.push(place('namaqualand_boulder_05', o.x, o.z, { s: 0.14 + rnd() * 0.1, y: -0.06 })); }
  for (let s = 0.04; s < 0.95; s += 0.035 + rnd() * 0.03) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const sd = rnd() < 0.5 ? -1 : 1; const o = tmp.clone().addScaledVector(side, sd * (W / 2 + 0.5 + rnd() * 1.2)); jobs.push(place(['flower_gazania', 'celandine_01', 'shrub_sorrel_01', 'dandelion_01'][Math.floor(rnd() * 4)], o.x, o.z, { s: 2.2 + rnd() * 1.2 })); }
  for (const [s, sd, nm, sc] of [[0.16, 1, 'olive_tree_wide_far', 1.2], [0.24, -1, 'othonna_cerarioides', 1.9], [0.3, 1, 'rock_moss_set_01', 0.9], [0.38, -1, 'olive_tree_tall_far', 1.1], [0.55, 1, 'shrub_01', 2.6], [0.66, -1, 'greek_column', 0.75], [0.72, 1, 'searsia_lucida', 1.1], [0.2, 1, 'umbrella_tree_far', 0.33]]) { curve.getPointAt(s, tmp); curve.getTangentAt(s, tan); side.set(-tan.z, 0, tan.x).normalize(); const o = tmp.clone().addScaledVector(side, sd * (W / 2 + 3.2 + rnd() * 1.5)); jobs.push(place(nm, o.x, o.z, { s: sc, tree: /olive|umbrella|othonna/.test(nm) })); }
  return curve;
}

// dragonflies darting over still water (marsh)
function dragonflies(n, area, hY) {
  const tex = canvasTex(64, 64, (g) => { g.strokeStyle = '#1c4a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 10); g.lineTo(32, 58); g.stroke(); g.fillStyle = 'rgba(200,240,255,0.55)'; for (const [dx, dy, r] of [[-1, -1, 0.2], [1, -1, -0.2], [-1, 1, -0.3], [1, 1, 0.3]]) { g.save(); g.translate(32, 22 + dy * 4); g.rotate(r); g.beginPath(); g.ellipse(dx * 14, 0, 14, 4, 0, 0, Math.PI * 2); g.fill(); g.restore(); } g.fillStyle = '#2a8aa0'; g.beginPath(); g.arc(32, 14, 4, 0, Math.PI * 2); g.fill(); });
  const grp = new THREE.Group(); for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(0.32, 0.32, 1); s.userData.noInk = true; const cx = area.x[0] + Math.random() * (area.x[1] - area.x[0]), cz = area.z[0] + Math.random() * (area.z[1] - area.z[0]), ph = Math.random() * 10;
    s.onBeforeRender = () => { const t = performance.now() / 1000 + ph; const dart = Math.floor(t * 0.7); const jx = Math.sin(dart * 12.9) * 1.6, jz = Math.cos(dart * 7.3) * 1.2; s.position.set(cx + jx + Math.sin(t * 3) * 0.08, hY + 0.5 + Math.sin(t * 5) * 0.06, cz + jz); s.material.rotation = Math.sin(dart) * 0.6; }; s.position.set(cx, hY + 0.5, cz); grp.add(s); }
  return grp;
}

// ---------------------------------------------------------------- battle / event stage
export async function realStage(theme = 'meadow', seed = 1, renderer, { arenaClear = true } = {}) {
  const g = new THREE.Group(); g.name = 'stage:' + theme; const rnd = mulberry32(seed * 7919 + 13); const trees = []; const jobs = []; const L = LOOKS[theme] || LOOKS.meadow;
  T.WIND.ptrK.value = 0; T.WIND.amp.value = 1;
  const hName = HDRI[theme] || 'golden_cape_hill';
  const [hdr, groundMat, arenaMat, dirtMat, gravelMat, hSun] = await Promise.all([loadHDRI(hName, renderer).catch(() => null), loadPBR(GROUND[theme] || 'ground_meadow', { repeat: 44 }), loadPBR(ARENA[theme] || 'ground_dry_grass', { repeat: 8 }), loadPBR('ground_dry_dirt', { repeat: 44 }), loadPBR('ground_rocky_trail', { repeat: 44 }), hdriSunDirection(hName).catch(() => new V3(0.8, 0.07, 0.6))]);
  // the sunset HDRI as the sky, turned so its real sun sits upper-right of the battle view; hazy ridges; the sun's serene face
  const aHdr = Math.atan2(hSun.x, hSun.z), aWant = Math.atan2(SUN_SKY.x, SUN_SKY.z); const rot = aWant - aHdr;
  const sunDirW = new V3(Math.sin(aWant) * Math.cos(Math.asin(hSun.y)), hSun.y, Math.cos(aWant) * Math.cos(Math.asin(hSun.y))).normalize();
  if (hdr) g.add(hdriDome(hdr.background, rot, theme === 'marsh' ? 0.75 : 0.85, L.haze)); else g.add(T.animeSky(theme, sunDirW));
  g.add(ridges(sunDirW, L.haze, theme === 'marsh' ? ['#5a6a70', '#6e7c80', '#8a9690'] : theme === 'guardian' ? ['#4a3448', '#5e4458', '#7a5a68'] : ['#8a88a6', '#a69eb6', '#c8b2b4']));
  const sunPos = CAM.clone().addScaledVector(sunDirW, 150); g.add(sunBillboard(sunPos, 11));
  // golden backlight from the sun: warm rims on leaves, trunks and the fighters
  const back = new THREE.DirectionalLight(0xffc27a, 1.7); back.position.copy(sunDirW).multiplyScalar(30).setY(9); g.add(back);
  // ground: gently undulating, rising towards the back so the horizon is softened
  const n = makeNoise(seed + 3); const basin = theme === 'marsh' ? (x, z) => Math.min(1, Math.max(0, Math.min(z + 12.3, -2.9 - z) / 1.2)) * Math.min(1, Math.max(0, 22 - Math.abs(x)) / 2) : () => 0;
  const hAt = (x, z) => { const far = Math.max(0, -z - 8) * 0.06; const y = (n.fbm(x * 0.08 + 9, z * 0.08, 4) - 0.5) * (Math.abs(z) > 3.5 || Math.abs(x) > 9 ? (Math.abs(z) < 14 ? 0.5 : 1.0) : 0.12) + Math.min(3.6, far * far * 1.3); const rr = Math.hypot(x + 6, z - 6); const ring = Math.max(0, rr - 48) * 0.07; const b = basin(x, z); return (y + Math.min(4.2, ring * ring * 1.4) * (z > -8 ? 1 : 0.3)) * (1 - b) - 0.35 * b; };
  const geo = new THREE.PlaneGeometry(220, 220, 170, 170); geo.translate(-6, -6, 0); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals(); geo.setAttribute('uv2', geo.attributes.uv);
  const ground = new THREE.Mesh(geo, splatGround(geo, groundMat, dirtMat, gravelMat, { tint: theme === 'marsh' ? '#a8b890' : theme === 'gully' || theme === 'labyrinth' ? '#e0d4b0' : '#b8d488', dirt: theme === 'gully' ? 0.5 : 0.63, gravel: 0.68, green: theme === 'gully' || theme === 'labyrinth' ? 0.15 : theme === 'marsh' ? 0.35 : 0.6 })); ground.receiveShadow = true; ground.userData.noInk = true; g.add(ground);
  const aoSpots = [];
  if (arenaClear) { const am = arenaMat.clone(); am.alphaMap = softMask(); am.transparent = true; am.depthWrite = false; const ag = new THREE.PlaneGeometry(22, 9, 44, 18); ag.rotateX(-Math.PI / 2); const ap = ag.attributes.position; for (let i = 0; i < ap.count; i++) ap.setY(i, hAt(ap.getX(i) + 0.3, ap.getZ(i) + 0.8) + 0.03); ag.computeVertexNormals(); const arena = new THREE.Mesh(ag, am); arena.position.set(0.3, 0, 0.8); arena.receiveShadow = true; arena.renderOrder = 1; arena.userData.noInk = true; g.add(arena); }
  const place = async (name, x, z, { s = 1, ry = rnd() * 6.28, far = false, tree = false, y = 0 } = {}) => {
    const o = await envModel(name, rnd).catch(() => null); if (!o) return null;
    o.position.set(x, y + hAt(x, z) - 0.04, z); o.rotation.y = ry; o.scale.multiplyScalar(s); if (tree || /rock|boulder|shrub|searsia|column|statue|bust/.test(name)) aoSpots.push([x, z, tree ? 2.2 * s : 1.0 * s]); if (far) o.traverse((m) => { if (m.isMesh) m.castShadow = false; }); g.add(o); if (tree) trees.push(o); return o;
  };
  // olive groves, far trees, columnar succulents, framing trees
  for (let i = 0; i < 6; i++) jobs.push(place(rnd() < 0.5 ? 'olive_tree_tall' : 'olive_tree_wide', -15 + i * 6 + rnd() * 2, -7.5 - rnd() * 2.5, { s: 1 + rnd() * 0.3, tree: true }));
  for (let i = 0; i < 8; i++) { const nm = rnd() < 0.4 ? 'umbrella_tree_far' : rnd() < 0.5 ? 'olive_tree_tall_far' : 'olive_tree_wide_far'; jobs.push(place(nm, -26 + i * 7.5 + rnd() * 3, -15 - rnd() * 7, { s: (1.1 + rnd() * 0.5) * (nm.startsWith('umbrella') ? 0.3 : 1), far: true, tree: true })); }
  for (let i = 0; i < 5; i++) jobs.push(place('othonna_cerarioides', -13 + i * 6.5 + rnd() * 2, -10 - rnd() * 3, { s: 1.6 + rnd() * 0.6, tree: true }));
  jobs.push(place('olive_tree_wide', 12.5, 0.5, { s: 1.25, tree: true }));
  for (let i = 0; i < 9; i++) jobs.push(place(rnd() < 0.5 ? 'searsia_lucida' : 'shrub_01', (rnd() - 0.5) * 30, -4 - rnd() * 4, { s: rnd() < 0.5 ? 1.1 : 3.2 }));
  const rocks = []; for (let i = 0; i < 8; i++) { const x = (rnd() - 0.5) * 28, z = -3.5 - rnd() * 5; rocks.push([x, z]); jobs.push(place(rnd() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', x, z, { s: 0.6 + rnd() * 0.6, y: -0.1 })); }
  for (let i = 0; i < 40; i++) { const x = (rnd() - 0.5) * 34, z = -9 + rnd() * 15; if (Math.abs(x - 0.3) < 8.5 && Math.abs(z - 0.8) < 2.6) continue; jobs.push(place(i % 4 === 0 ? (theme === 'marsh' ? 'nettle_plant' : rnd() < 0.5 ? 'celandine_01' : 'flower_gazania') : i % 7 === 0 ? 'fern_02' : 'grass_clumps', x, z, { s: 1.6 + rnd() * 1.4 })); }
  // theme dressing
  if (theme === 'garden' || theme === 'guardian') {
    for (let i = 0; i < 5; i++) jobs.push(place('greek_column', -12 + i * 6 + rnd(), -5.5 - rnd() * 2, { s: 0.75, tree: i % 2 === 0 }));
    jobs.push(place('marble_bust_01', -6.5, -3.4, { s: 3.2, ry: 0.4 }), place('horse_statue_01', 7.5, -4.2, { s: 3, ry: -0.6 }), place('lion_head', 3, -5.5, { s: 2.2, ry: 0.2 }));
    for (let i = 0; i < 4; i++) jobs.push(place(rnd() < 0.5 ? 'antique_ceramic_vase_01' : 'ceramic_vase_04', -9 + i * 5.5, -3.2, { s: 2.2 }));
  }
  if (theme === 'meadow') jobs.push(place('wine_barrel_01', 8.2, -3.3, { s: 1.4 }), place('wine_bottles_01', 9.4, -2.8, { s: 2.4 }), place('antique_ceramic_vase_01', -8, -3.2, { s: 2.6 }), place('brass_goblets', 7.2, -2.6, { s: 3 }), place('greek_column', -10.5, -5, { s: 0.75, tree: true }));
  if (theme === 'gully') { for (let i = 0; i < 6; i++) jobs.push(place(['boulder_01', 'namaqualand_boulder_02', 'namaqualand_boulder_03', 'namaqualand_boulder_05'][i % 4], -14 + i * 5.6, -5.5 - rnd() * 3, { s: 1.4 + rnd() * 1.2 })); jobs.push(place('rock_face_02', 0, -12, { s: 2.5 })); }
  if (theme === 'labyrinth') { for (let i = 0; i < 7; i++) jobs.push(place('stone_wall_kit', -16 + i * 5.4, -6.5 - (i % 2) * 2.2, { s: 0.35, ry: (i % 2) * Math.PI / 2 })); jobs.push(place('bull_head', 0.5, -4.4, { s: 3.5, ry: 0 })); }
  if (theme === 'marsh') { jobs.push(place('dead_tree_trunk_02', -7, -4, { s: 1.4 }), place('tree_stump_01', 6.5, -3.6, { s: 1.6 }), place('dry_branches_medium_01', 2, -4.5, { s: 2 })); const water = realWater(46, 10); water.position.set(0, -0.06, -7.5); g.add(water); g.add(dragonflies(5, { x: [-10, 10], z: [-11, -4] }, -0.06)); }
  if (theme === 'guardian') { for (const [x, z] of [[-9.6, -5.2], [10.4, -5.6]]) { const f = firePit({ seed: Math.round(x) }); f.position.set(x, hAt(x, z), z); f.scale.setScalar(1.8); g.add(f); } }
  // the road in, then wind-blown grass everywhere except the arena, the road and the water
  const road = buildRoad(g, hAt, rnd, jobs, place); const rp = road.getSpacedPoints(200);
  const roadD = (x, z) => { let d = 1e9; for (const q of rp) { const dd = (q.x - x) ** 2 + (q.z - z) ** 2; if (dd < d) d = dd; } return Math.sqrt(d); };
  // the intro films the land behind the battle camera and along the road: groves, ruins, rocks, shrubs
  { const dr = mulberry32(seed * 11 + 5); const free = (x, z, r) => roadD(x, z) > r + 1.6 && !(Math.abs(x - 0.3) < 10 && z < 5 && z > -3.5);
    const groves = [['olive_tree_wide_far', 1.15], ['olive_tree_tall_far', 1.1], ['umbrella_tree_far', 0.32], ['othonna_cerarioides', 1.8], ['olive_tree_wide', 1.0]];
    for (let i = 0; i < 26; i++) { const x = -38 + dr() * 56, z = 9 + dr() * 26; if (!free(x, z, 2.6)) continue; const [nm, sc] = groves[Math.floor(dr() * groves.length)]; jobs.push(place(nm, x, z, { s: sc * (0.85 + dr() * 0.3), tree: true })); }
    for (let i = 0; i < 22; i++) { const x = -40 + dr() * 60, z = 6 + dr() * 30; if (!free(x, z, 1.2)) continue; const r = dr(); jobs.push(place(r < 0.4 ? 'shrub_01' : r < 0.7 ? 'searsia_lucida' : r < 0.85 ? 'rock_moss_set_01' : 'rock_moss_set_02', x, z, { s: r < 0.4 ? 2.8 : r < 0.7 ? 1.1 : 0.8 + dr() * 0.5 })); }
    for (const [cx, cz, ry] of [[-6, 21, 0.4], [-27, 12, -0.6]]) { if (!free(cx, cz, 3)) continue; for (let k = 0; k < 4; k++) jobs.push(place(`greek_column#${k === 2 ? 1 : 0}`, cx + Math.cos(ry) * (k - 1.5) * 2.2, cz - Math.sin(ry) * (k - 1.5) * 2.2, { s: 0.75, ry, tree: k === 0 })); jobs.push(place('stone_wall_kit', cx + 1.5, cz + 2, { s: 0.35, ry: ry + 0.3 }), place('stone_wall_kit', cx - 2.5, cz + 1.2, { s: 0.35, ry: ry - 0.5 })); }
  }
  const gr = mulberry32(seed * 3 + 1); const nP = makeNoise(seed + 77); const clumps = []; const spots = [];
  const okAt = (x, z) => { const ax = (x - 0.3) / 9.2, az = (z - 0.8) / 3.0; if (arenaClear && ax * ax + az * az < 1.05) return false; if (theme === 'marsh' && z < -2.6 && z > -12.5) return false; if (z > -2 && roadD(x, z) < 1.75) return false; return true; };
  for (let i = 0; i < 3200 && clumps.length < 600; i++) { const z = -24 + Math.pow(gr(), 0.75) * 54, x = (gr() - 0.5) * (14 + Math.abs(5 - z) * 1.2) - (z > 4 ? (z - 4) * 0.9 : 0); if (!okAt(x, z)) continue; const dense = nP.fbm(x * 0.15, z * 0.15, 3); if (gr() > dense * 1.5) continue; clumps.push({ x, y: hAt(x, z) - 0.03, z, s: 1.5 + gr() * 1.3, ry: gr() * 6.28, k: gr(), v: Math.floor(gr() * 17) }); }
  jobs.push(grassClumps(g, clumps).catch(() => {}));
  for (let i = 0; i < 19000; i++) { const z = -28 + Math.pow(gr(), 0.7) * 58, x = (gr() - 0.5) * (14 + Math.abs(5 - z) * 1.25) - (z > 4 ? (z - 4) * 0.9 : 0); if (!okAt(x, z)) continue; const patch = nP.fbm(x * 0.2 + 9, z * 0.2, 3); spots.push([x, hAt(x, z) - 0.02, z, (0.1 + gr() * 0.16) * (0.7 + patch * 0.9) + Math.max(0, -z - 4) * 0.012, gr()]); }
  g.add(T.grassBlades(spots, { pbr: true, dry: L.grass, colorJitter: 0.12 }));
  g.add(windMotes(theme, hAt));
  await Promise.all(jobs);
  // vertex AO on the ground: darker under trees, rocks and ruins
  { const cc = []; const pp = geo.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i); let k = 1; for (const [ax, az, r] of aoSpots) { const d = Math.hypot(x - ax, z - az); if (d < r) k -= (1 - d / r) * 0.38; } k = Math.max(0.5, k); cc.push(k, k * 0.98, k * 0.96); } geo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); }
  g.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) o.userData.noInk = true; });
  const rockTops = rocks.map(([x, z]) => new V3(x, hAt(x, z) + 0.45, z));
  const animals = (cr) => { if (!cr) return; if (theme !== 'marsh') { cr.spawnGrazers?.(4, { x: [-15, -9.5], z: [-6.5, -3.8] }, ['sheep', 'sheep', 'goat']); cr.spawnGrazers?.(4, { x: [-24, -15], z: [9, 17] }); } cr.spawnLizards?.(3, rockTops); cr.spawnButterflies?.(5, new V3(-13, 0.8, 11), 7); };
  return { group: g, theme, trees, env: hdr?.envMap ?? T.gradientEnv(renderer, 'stage:' + theme), background: null, sunDir: SUN_KEY.clone(), sunPos, road, fog: new THREE.Fog(L.haze, L.fog[0], L.fog[1]), animals };
}

// ---------------------------------------------------------------- fire pit: the detailed stone ring with soft living flames
let FLAMETEX = null;
function flameTex() { return (FLAMETEX ||= canvasTex(64, 128, (g) => { const gr = g.createRadialGradient(32, 92, 2, 32, 80, 52); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.22, 'rgba(255,214,110,0.95)'); gr.addColorStop(0.55, 'rgba(255,120,30,0.55)'); gr.addColorStop(1, 'rgba(200,50,10,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(56, 52, 58, 96, 32, 124); g.bezierCurveTo(6, 96, 8, 52, 32, 2); g.fill(); })); }
export function firePit({ seed = 3 } = {}) {
  const g = new THREE.Group(); g.name = 'firePit';
  loadModel('stone_fire_pit').then((o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.userData.noInk = true; } }); g.add(o); }).catch(() => {});
  for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, color: new THREE.Color(1.6, 1.25, 0.9) })); const w = 0.32 + i * 0.07, h = 0.62 + i * 0.12; s.userData.noInk = true; s.position.set((i - 1.5) * 0.07, 0.3 + h * 0.35, (i % 2) * 0.05); const ph = seed + i * 1.7;
    s.onBeforeRender = () => { const t = performance.now() / 1000 + ph; const k = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23 + 1) * 0.07; s.scale.set(w * (1.08 - (k - 0.85)), h * k, 1); }; s.scale.set(w, h, 1); g.add(s); }
  return g;
}

// ---------------------------------------------------------------- map dressing: detailed trees and rocks at miniature scale
export async function dressMap(world, { count = 46, free, heightAt, rnd = mulberry32(3), W = 20, Z0 = 3, LEN = 36, scale = 1 } = {}) {
  const jobs = []; const trees = [];
  const put = async (name, x, z, s, tree) => { const o = await envModel(name, rnd).catch(() => null); if (!o) return; o.position.set(x, heightAt(x, z), z); o.rotation.y = rnd() * 6.28; o.scale.multiplyScalar(s * scale); world.add(o); if (tree) { o.userData.perchable = true; trees.push(o); } };
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
