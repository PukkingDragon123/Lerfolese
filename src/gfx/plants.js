// Pixel-art plant field: every grass tuft, wildflower, fern, reed and bush is one instance of a single InstancedMesh
// of upright (Y-axis) billboards sampling the plant atlas with nearest filtering and alpha test. The vertex shader
// picks one of 5 hand-drawn wind frames per instance from rolling gusts plus a per-plant flutter, and leans
// plants away from the pointer (wind.ptr / ptrK). Pixel size stays near 1 art px ≈ 2-3 screen px around the arena.
// Pre-lit pixel art, so no ink outlines, no GTAO (userData.noInk / noAO) and no shadow casting.
import * as THREE from 'three';
import { plantAtlas, PLANT_KINDS, PLANT_DEFS } from './art/plants.js';

const VS = `
attribute vec4 aRect; attribute vec4 aData; // frame-0 rect in uv | frame step, phase, flex, sink
uniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform vec3 uPtr; uniform float uPtrR; uniform float uPtrK; uniform vec4 uPush[6];
varying vec2 vUv; varying vec3 vCol;
#include <fog_pars_vertex>
void main() {
  vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float sw = length(instanceMatrix[0].xyz), sh = length(instanceMatrix[1].xyz);
  vec3 camR = vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]); camR /= max(1e-4, length(camR));
  // travelling wind waves (crossing the field), slow gusts, a per-plant flutter
  float gph = dot(root.xz, uWindDir); vec2 gperp = vec2(-uWindDir.y, uWindDir.x);
  float wave = 0.5 + 0.5 * sin(gph * 0.42 - uTime * 1.9 + sin(dot(root.xz, gperp) * 0.13 + uTime * 0.3) * 1.6);
  wave = wave * wave * (0.75 + 0.25 * sin(dot(root.xz, gperp) * 0.31 - uTime * 0.5));
  float gust = pow(0.5 + 0.5 * sin(gph * 0.09 - uTime * 0.55), 3.0);
  float fl = sin(uTime * 2.3 + aData.y * 6.2831 + root.x * 0.6);
  vec2 off = uWindDir * (0.06 + wave * 0.8 + gust * 0.38 + fl * 0.14) * uWindAmp;
  // the pointer and up to 6 characters part the plants (and press them down a little)
  vec2 pd = root.xz - uPtr.xz; float pl = length(pd); float press = smoothstep(uPtrR, 0.0, pl) * uPtrK;
  off += (pl > 1e-3 ? pd / pl : vec2(0.0)) * press * 1.6;
  for (int i = 0; i < 6; i++) { vec4 PP = uPush[i]; if (PP.w <= 0.0) continue; vec2 q = root.xz - PP.xz; float qr = length(q); float k = smoothstep(PP.w, PP.w * 0.2, qr); off += (qr > 1e-3 ? q / qr : vec2(0.0)) * k * 1.6; press += k; }
  float lean = dot(off, camR.xz) * aData.z; sh *= 1.0 - 0.3 * clamp(press, 0.0, 1.0);
  float f = clamp(floor((lean + 1.0) * 2.0 + 0.5), 0.0, 4.0);
  vUv = vec2(aRect.x + f * aData.x + uv.x * aRect.z, aRect.y + uv.y * aRect.w);
  vCol = vec3(1.0 + 0.09 * step(0.8, wave)); // a flat sheen band rides the wave crests
  #ifdef USE_INSTANCING_COLOR
    vCol *= instanceColor;
  #endif
  vec3 wp = root + camR * (position.x * sw) + vec3(0.0, position.y * sh - aData.w, 0.0);
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS = `
uniform sampler2D uMap; uniform vec3 uTint; varying vec2 vUv; varying vec3 vCol;
#include <fog_pars_fragment>
void main() {
  vec4 c = texture2D(uMap, vUv); if (c.a < 0.5) discard;
  gl_FragColor = vec4(c.rgb * uTint * vCol, 1.0);
  #include <fog_fragment>
}`;

let TEX = null;
function atlasTexture() {
  if (TEX) return TEX; const A = plantAtlas(); const t = new THREE.CanvasTexture(A.canvas);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return (TEX = t);
}
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };

/** variants of a family ('tall', 'poppy', 'olive'...), or the sprite name itself */
export const plantNames = (kind) => PLANT_KINDS[kind] || (PLANT_DEFS[kind] ? [kind] : PLANT_KINDS.short);

/**
 * items: [{ kind, x, y, z, s = 1, v (variant pick 0..1), tint ('#rrggbb' or THREE.Color), flex = 1 }]
 * wind: the shared wind uniforms ({ time, dir, amp, ptr, ptrR, ptrK }); tick: called before each render.
 * texel: world size of one art pixel near the arena; it grows gently with distance from `cam` so far plants stay legible.
 */
export function plantField(items, { wind, tick = null, push = null, onScene = null, texel = 0.024, cam = new THREE.Vector3(-0.1, 3, 11.4), tint = '#ffffff', far = 13 } = {}) {
  const A = plantAtlas(); const n = items.length;
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const aRect = new Float32Array(n * 4), aData = new Float32Array(n * 4);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, fog: true, side: THREE.DoubleSide,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null }, uTint: { value: new THREE.Color(tint) } }]),
  });
  Object.assign(mat.uniforms, { uMap: { value: atlasTexture() }, uTime: wind.time, uWindDir: wind.dir, uWindAmp: wind.amp, uPtr: wind.ptr, uPtrR: wind.ptrR, uPtrK: wind.ptrK, uPush: push || { value: Array.from({ length: 6 }, () => new THREE.Vector4()) } });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); mesh.count = n;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  items.forEach((it, i) => {
    const names = plantNames(it.kind); const name = names[Math.min(names.length - 1, Math.floor((it.v ?? hash(it.x, it.z)) * names.length))]; const r = A.map[name];
    const d = Math.hypot(it.x - cam.x, it.z - cam.z); const T = texel * Math.pow(Math.max(1, d / far), 0.55) * Math.pow(Math.min(1, Math.max(0.6, d / 10)), 0.7) * (it.s ?? 1);
    m4.compose(p.set(it.x, it.y, it.z), q, sc.set(r.w * T, r.h * T, 1)); mesh.setMatrixAt(i, m4);
    aRect.set([r.x / A.W, 1 - (r.y + r.h) / A.H, r.w / A.W, r.h / A.H], i * 4); aData.set([r.step / A.W, hash(it.z, it.x), it.flex ?? 1, T * 1.2], i * 4);
    col.set(it.tint ?? '#ffffff'); mesh.setColorAt(i, col);
  });
  geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(aRect, 4)); geo.setAttribute('aData', new THREE.InstancedBufferAttribute(aData, 4));
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.name = 'plantField';
  mesh.userData.noInk = true; mesh.userData.noAO = true;
  // only draw with our own material: passes that override the scene material (GTAO normals, depth) would see bare quads
  mesh.onBeforeRender = (r, s, c, g, m) => { g.drawRange.count = m === mat ? Infinity : 0; if (m === mat) { tick?.(); onScene?.(s); } };
  return mesh;
}
