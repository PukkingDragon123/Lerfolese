// ICONS THAT MIX 3D AND 2D: a small real 3D object (an apple, a stone, a lens, a spring...) set on a card's painted
// pixel backdrop.
//  * iconSnapshot(id): the object rendered ONCE to a small transparent canvas with the game's own renderer (shared, no
//    extra GL context) and cached: it is painted into card faces wherever a face is shown flat (journal, menus).
//  * CardIcon: the live version on a 3D card in hand: the same object standing out of the art window, turning slowly,
//    a four-point glint crossing it now and then, a few square motes drifting up, and a shimmer (faster turn, brighter
//    motes) while the card is hovered. Templates are built once per id and shared (clone() shares geometry/materials).
import * as THREE from 'three';
import * as P3 from '../models/props3d.js';

let R = null;
export function setIconRenderer(r) { R = r; }

const A = (kind) => () => P3.apple({ kind });
// a sharp low-poly field stone (faceted, flat-shaded, a real silhouette: never a smooth blob)
const ST = (kind, seed = 3) => () => { let a = seed * 7919; const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  const geo = new THREE.IcosahedronGeometry(0.5, 1); const p = geo.attributes.position; const v = new THREE.Vector3(); const key = new Map();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = v.toArray().map((x) => x.toFixed(3)).join(); if (!key.has(k)) key.set(k, 0.82 + r() * 0.34); const d = key.get(k); p.setXYZ(i, v.x * d * 1.25, Math.max(-0.3, v.y * d * 0.78), v.z * d); }
  const g2 = geo; g2.computeVertexNormals(); const base = { stone: 0x8a8478, pumice: 0xb8b0a0, lodestone: 0x3e3a40 }[kind] || 0x8a8478;
  const m = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ color: base, roughness: kind === 'lodestone' ? 0.4 : 0.9, metalness: kind === 'lodestone' ? 0.5 : 0, flatShading: true })); const g = new THREE.Group(); g.add(m); return g; };
const DROP = () => { const g = P3.droplet({ color: 0x3f7fa8 }); if (g.children[1]) g.children[1].visible = false; return g; };
const MODELS = {
  apple: A('red'), golden_apple: A('gold'), rotten_apple: A('green'), superposition: A('red'),
  stone: ST('stone'), keystone: ST('stone', 7), bulwark: ST('stone', 11), pumice: ST('pumice'), lodestone: ST('lodestone'),
  water: DROP, ice: () => P3.crystalCluster({ color: 0xb8dce8 }), earth: () => P3.planet({ kind: 'earth' }),
  spark: () => P3.bolt({ color: 0xd8c070 }), heat: () => P3.flame({ scale: 0.9 }), catalyst: () => P3.crystalCluster({ color: 0xd8b070 }), plasma: () => P3.bolt({ color: 0xa8d8e8 }),
  lens: () => P3.magnifier(), looking_glass: () => P3.magnifier(), spring: () => P3.spring(), slinky: () => P3.spring({ rainbow: true }), pendulum: () => P3.cradle(), prism: () => P3.prism(),
  mass: () => P3.weight({ label: '1 kg' }), dark_matter: () => P3.weight({ dark: true, label: '?' }),
};
export const hasIcon = (id) => !!MODELS[id];

const tpl = new Map(); const muted = new WeakSet(); const _hsl = {};
// the old-book palette: every icon material a little faded and warmed, never bold or saturated
function mute(m) { if (!m || muted.has(m)) return; muted.add(m); for (const k of ['color', 'emissive']) { const c = m[k]; if (!c?.isColor) continue; c.getHSL(_hsl); c.setHSL(_hsl.h, _hsl.s * 0.62, _hsl.l * (k === 'emissive' ? 0.6 : 0.96)); c.lerp(_warm, 0.06); } if (m.emissiveIntensity > 1) m.emissiveIntensity *= 0.6; }
const _warm = new THREE.Color(0xc8a878);
/** the shared template for an id: centred on its bounds, scaled to a unit height */
function template(id) {
  if (tpl.has(id)) return tpl.get(id);
  let g = null; try { g = MODELS[id]?.() || null; } catch (e) { console.warn('icon3d', id, e); }
  if (g) { const box = new THREE.Box3().setFromObject(g); const sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()); const k = 1 / Math.max(0.01, sz.y, sz.x * 0.8); const w = new THREE.Group(); g.position.sub(c); w.add(g); w.scale.setScalar(k); g = w; g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; for (const m of [].concat(o.material || [])) mute(m); }); }
  tpl.set(id, g); return g;
}

// ---------------------------------------------------------------- the snapshot (render once, read back, cache)
let snapScene = null, snapCam = null;
const snaps = new Map();
export function iconSnapshot(id, w = 192, h = 160) {
  const key = id + '|' + w + 'x' + h; if (snaps.has(key)) return snaps.get(key);
  const T = template(id); if (!T || !R) return null;
  if (!snapScene) {
    snapScene = new THREE.Scene(); snapCam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
    const key0 = new THREE.DirectionalLight(0xfff0d8, 2.6); key0.position.set(-1.6, 2.2, 2.4); const rim = new THREE.DirectionalLight(0x9fd0d8, 1.4); rim.position.set(2, 0.8, -1.6);
    snapScene.add(key0, rim, new THREE.HemisphereLight(0xf4e8d0, 0x4a3828, 0.9));
  }
  const obj = T.clone(); obj.rotation.set(0.12, -0.55, 0); snapScene.add(obj);
  snapCam.aspect = w / h; snapCam.position.set(0, 0.18, 3.1); snapCam.lookAt(0, 0, 0); snapCam.updateProjectionMatrix();
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const prevRT = R.getRenderTarget(), prevClear = R.getClearAlpha(), cc = new THREE.Color(); R.getClearColor(cc); const prevTM = R.toneMapping;
  let canvas = null;
  try {
    R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(snapScene, snapCam);
    const px = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, px);
    canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const g = canvas.getContext('2d'); const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); // flip: GL rows start at the bottom
    for (let i = 0; i < img.data.length; i += 4) { const a = img.data[i + 3]; if (a > 0 && a < 255) { const k = 255 / a; img.data[i] = Math.min(255, img.data[i] * k); img.data[i + 1] = Math.min(255, img.data[i + 1] * k); img.data[i + 2] = Math.min(255, img.data[i + 2] * k); } } // un-premultiply
    g.putImageData(img, 0, 0);
  } catch (e) { console.warn('icon snapshot', id, e); canvas = null; }
  finally { R.setRenderTarget(prevRT); R.setClearColor(cc, prevClear); R.toneMapping = prevTM; snapScene.remove(obj); rt.dispose(); }
  snaps.set(key, canvas); return canvas;
}

// ---------------------------------------------------------------- the live icon on a 3D card
const glintGeo = (() => { const s = new THREE.Shape(); const a = 0.5, b = 0.07; s.moveTo(0, a); s.lineTo(b, b); s.lineTo(a, 0); s.lineTo(b, -b); s.lineTo(0, -a); s.lineTo(-b, -b); s.lineTo(-a, 0); s.lineTo(-b, b); s.closePath(); return new THREE.ShapeGeometry(s); })();
const glintMat = new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const MOTE_VS = `attribute vec3 aS; uniform float uT, uK, uPx; varying float vA; void main(){ float u = fract(aS.z + uT * (0.05 + aS.y * 0.05)); vec3 p = vec3(aS.x, u * 1.2 - 0.55, 0.05 + aS.y * 0.2); p.x += sin(uT * 0.7 + aS.z * 9.0) * 0.05;
  vA = sin(u * 3.14159) * uK; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); gl_PointSize = uPx; }`;
const MOTE_FS = `uniform vec3 uC; varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(uC, vA); }`; // square pixel motes (no discs)

export class CardIcon {
  /** id: card id; cw / ch: card size; art: { x, y, w, h } window centre and size in card units */
  constructor(id, art) {
    const T = template(id); this.ok = !!T; this.group = new THREE.Group(); this.t = Math.random() * 10; this.hot = 0; this.hotT = 0; this.glintT = 1 + Math.random() * 3;
    if (!T) return; this.obj = T.clone(); const s = art.h * 0.78; this.obj.scale.multiplyScalar(s); this.obj.rotation.set(0.12, -0.55, 0); this.group.add(this.obj);
    this.group.position.set(art.x, art.y - art.h * 0.04, 0.023 + s * 0.42);
    this.glint = new THREE.Mesh(glintGeo, glintMat.clone()); this.glint.userData.s0 = s * 0.32; this.glint.scale.setScalar(s * 0.32); this.glint.position.set(-s * 0.18, s * 0.26, s * 0.5); this.group.add(this.glint);
    const n = 14, S = new Float32Array(n * 3); for (let i = 0; i < n; i++) S.set([(Math.random() - 0.5) * art.w * 0.86 / s, Math.random(), Math.random()], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 3));
    this.mu = { uT: { value: 0 }, uK: { value: 0.5 }, uPx: { value: Math.max(2, Math.round(2 * Math.min(2, window.devicePixelRatio || 1))) }, uC: { value: new THREE.Color(0xe8d4a0) } };
    this.motes = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: MOTE_VS, fragmentShader: MOTE_FS, uniforms: this.mu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.motes.frustumCulled = false; this.motes.scale.setScalar(s); this.motes.position.set(0, 0, -s * 0.42 + 0.01); this.group.add(this.motes);
    this.group.traverse((o) => { o.raycast = () => {}; });
  }
  update(dt, hot = false, faceUp = true) {
    if (!this.ok) return; this.group.visible = faceUp; if (!faceUp) return; this.t += dt; this.hot += ((hot ? 1 : 0) - this.hot) * Math.min(1, dt * 6);
    this.obj.rotation.y += dt * (0.35 + this.hot * 1.4); this.obj.rotation.x = 0.12 + Math.sin(this.t * 0.6) * 0.05;
    this.glintT -= dt * (1 + this.hot * 2); const gk = this.glintT < 0 ? Math.max(0, 1 - Math.abs(this.glintT + 0.35) / 0.35) : 0; if (this.glintT < -0.7) this.glintT = 2.5 + Math.random() * 3;
    this.glint.material.opacity = gk * 0.9; this.glint.rotation.z = this.t * 0.8; this.glint.scale.setScalar((0.6 + gk * 0.6) * this.glint.userData.s0);
    this.mu.uT.value = this.t; this.mu.uK.value = 0.35 + this.hot * 0.65;
  }
  dispose() { if (!this.ok) return; this.motes.geometry.dispose(); this.motes.material.dispose(); this.glint.material.dispose(); }
}
