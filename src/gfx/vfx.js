// Pixel-art VFX in 3D, layered for punch: anime impact frames (white/black silhouette flash on the target), expanding
// shockwave rings, radial speed lines, streak sparks with bouncing debris, element flipbooks, lingering smoke wisps,
// fading ground decals, projectile afterimage trails, wind-up glints, claw slashes, rising buff columns and big
// overshooting pixel text pops. Everything is a nearest-filtered, black-outlined flipbook from src/gfx/art/vfxart.js,
// pooled per effect and advanced on a clamped per-render clock (hit-stop friendly, never skips key frames).
import * as THREE from 'three';
import { VFX_DEFS, vfxSheet, sunSheet, pixelText } from './art/vfxart.js';

export const VFX_NAMES = Object.keys(VFX_DEFS);
// which flipbook plays for each battlescene burst() kind
export const BURST_VFX = { apple: 'apple_splat', stone: 'stone_puff', zap: 'zap', fire: 'fire_burst', water: 'water_splash', wood: 'hit_light', magic: 'arcane', heal: 'heal', block: 'block', smoke: 'smoke_poof', gravity: 'vortex' };

const base = new Map();
function sheetTex(key, pc) {
  let t = base.get(key); if (t) return t;
  t = new THREE.CanvasTexture(pc.commit()); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  base.set(key, t); return t;
}
const clockStep = (st) => { const now = performance.now(); const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now; return dt; };

// ---------------------------------------------------------------- pooled flipbooks (billboards and flat ground decals)
const pools = new Map();
function acquire(name) {
  const D = VFX_DEFS[name]; const list = pools.get(name) || pools.set(name, []).get(name);
  let it = list.pop(); if (it) return it;
  const tex = sheetTex(name, vfxSheet(name)).clone(); tex.needsUpdate = true;
  if (D.decal) { const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat); m.renderOrder = 1; return { obj: m, tex, mat, name }; }
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
  return { obj: new THREE.Sprite(mat), tex, mat, name };
}
function release(it) { it.obj.parent?.remove(it.obj); it.obj.onBeforeRender = () => {}; (pools.get(it.name) || []).push(it); }

// play a flipbook once at a world position. opts: scale, flip, fps, rot, color (tint), glow (brightness for bloom), hold (extra secs on last frame)
export function playVFX(scene, name, worldPos, { scale = 1, flip = false, fps, rot = 0, color = null, glow, hold = 0, y = null } = {}) {
  const D = VFX_DEFS[name]; if (!D || !scene || !worldPos) return null;
  const it = acquire(name); const { obj, tex, mat } = it; const N = D.frames;
  const setFrame = (f) => { tex.repeat.set((flip ? -1 : 1) / N, 1); tex.offset.set((flip ? f + 1 : f) / N, 0); };
  setFrame(0); obj.visible = true; obj.position.copy(worldPos); if (y != null) obj.position.y = y;
  if (D.decal) { obj.scale.set(D.world * scale, 1, D.world * scale); obj.rotation.y = rot; } else { obj.scale.setScalar(D.world * scale); mat.rotation = rot; obj.renderOrder = 20; }
  mat.color.set(color || '#ffffff').multiplyScalar(glow ?? D.glow ?? 1.2);
  obj.frustumCulled = false;
  const rate = fps || D.fps; const st = { last: performance.now() }; let el = 0, done = false;
  const kill = () => { if (done) return; done = true; obj.visible = false; queueMicrotask(() => release(it)); };
  obj.onBeforeRender = () => { el += clockStep(st); let f = Math.floor(el * rate); if (f >= N) { if (el < N / rate + hold) f = N - 1; else return kill(); } setFrame(f); };
  setTimeout(kill, 30000);
  scene.add(obj); return obj;
}
// a flat ground decal (scorch, crack, splash, rune) under a position
export const decalVFX = (scene, name, pos, opts = {}) => playVFX(scene, name, pos, { y: 0.035, rot: Math.random() * 6.28, ...opts });

// ---------------------------------------------------------------- a per-scene ticker for frame-based updates (flashes, text pops, trails)
const tickers = new WeakMap();
function ticker(scene) {
  let T = tickers.get(scene); if (T) return T;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false })); s.frustumCulled = false; s.scale.setScalar(0.001);
  T = { list: new Set(), st: { last: performance.now() } }; s.onBeforeRender = () => { const dt = clockStep(T.st); for (const fn of T.list) if (fn(dt) === false) T.list.delete(fn); };
  scene.add(s); tickers.set(scene, T); return T;
}
const onTick = (scene, fn) => ticker(scene).list.add(fn);

// anime impact frame: the target renders as a flat silhouette (black first if inverted, then white) for a couple of frames
const SIL = { white: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), toneMapped: false, fog: false }), black: new THREE.MeshBasicMaterial({ color: 0x0b0710, fog: false }) };
export function flashSilhouette(scene, root, { invert = false, frames = 2 } = {}) {
  if (!root || root.userData.__sil) return; const saved = []; root.userData.__sil = true;
  root.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && o.material && o.visible) saved.push([o, o.material]); });
  const seq = invert ? ['black', 'white', ...Array(Math.max(0, frames - 1)).fill('white')] : Array(frames).fill('white'); let i = 0;
  const apply = (k) => { for (const [o] of saved) o.material = SIL[k]; };
  apply(seq[0]);
  onTick(scene, () => { i++; if (i < seq.length) { apply(seq[i]); return true; } for (const [o, m] of saved) o.material = m; delete root.userData.__sil; return false; });
}

// big overshooting pixel text pop ("CRIT!", damage)
const textTex = new Map();
export function popText(scene, str, pos, { size = 0.5, fill, rise = 1.4 } = {}) {
  const key = str + (fill || ''); let tex = textTex.get(key); if (!tex) { tex = sheetTex('txt:' + key, pixelText(String(str), fill ? { fill } : undefined)); textTex.set(key, tex); }
  const img = tex.image; const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthTest: false, depthWrite: false, toneMapped: false, fog: false }); mat.color.setScalar(1.3);
  const s = new THREE.Sprite(mat); s.renderOrder = 30; s.frustumCulled = false; s.position.copy(pos); scene.add(s);
  const w = (img.width / img.height) * size * 4, h = size * 4; let t = 0;
  onTick(scene, (dt) => { t += dt; const k = t < 0.12 ? (t / 0.12) * 1.45 : t < 0.26 ? 1.45 - ((t - 0.12) / 0.14) * 0.55 : t < 0.36 ? 0.9 + ((t - 0.26) / 0.1) * 0.1 : 1; s.scale.set(w * k, h * k, 1); s.position.y = pos.y + Math.min(t, 0.9) * rise * 0.6; mat.rotation = Math.sin(t * 18) * Math.max(0, 0.25 - t) * 0.6; if (t > 1.0) { s.visible = (Math.floor(t * 20) % 2) === 0; } if (t > 1.3) { scene.remove(s); mat.dispose(); return false; } return true; });
  return s;
}

// projectile afterimages: pooled glowing orbs dropped along the path while the object is in the scene
export function attachTrail(scene, obj, color = '#fff6c8', { every = 0.025, spin = false } = {}) {
  let acc = 0, n = 0;
  onTick(scene, (dt) => { if (!obj.parent) return false; acc += dt; while (acc > every) { acc -= every; n++; const p = obj.getWorldPosition(new THREE.Vector3()); playVFX(scene, 'trail', p, { color, scale: spin && n % 2 ? 1.3 : 1, rot: spin ? n * 0.8 : 0 }); } return true; });
}

// ---------------------------------------------------------------- composite effects used by the battle scene
const ELEMENT_DECAL = { fire: 'scorch', zap: 'scorch', stone: 'crack', apple: 'splash_decal', water: 'splash_decal', magic: 'rune_ground', gravity: 'rune_ground' };
// the full layered hit on an enemy
export function impactFX(scene, { pos, root = null, dmg = 0, kind = 'magic', core = '', big = false, crit = false } = {}) {
  if (!scene || !pos) return; const front = pos.clone().add(new THREE.Vector3(0, 0.15, 0.6)); const flip = Math.random() < 0.5;
  flashSilhouette(scene, root, { invert: big, frames: crit ? 3 : 2 });
  playVFX(scene, crit ? 'hit_crit' : big ? 'hit_heavy' : 'hit_light', front, { flip });
  playVFX(scene, 'shockwave', front.clone().add(new THREE.Vector3(0, -0.4, 0)), { scale: crit ? 1.5 : big ? 1.15 : 0.8 });
  playVFX(scene, 'sparks', front, { scale: big ? 1.2 : 0.85, flip });
  if (big || crit) playVFX(scene, 'speedlines', pos.clone().add(new THREE.Vector3(0, 0.2, 0.4)), { scale: crit ? 1.25 : 1, fps: 20 });
  if (big && (kind === 'magic' || kind === 'stone')) playVFX(scene, 'slash', front.clone().add(new THREE.Vector3(0, 0.15, 0.1)), { flip, scale: 1.2 });
  if (core === 'gravity' || kind === 'gravity') playVFX(scene, 'vortex', front, { scale: big ? 1.3 : 1 });
  const dec = ELEMENT_DECAL[core === 'gravity' ? 'gravity' : kind] || (big ? 'crack' : null); if (dec) decalVFX(scene, dec, pos, { scale: big ? 1.25 : 0.95 });
  playVFX(scene, 'wisp', pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.6, 0.3)), { fps: 9 });
  if (crit) popText(scene, 'CRIT!', pos.clone().add(new THREE.Vector3(0, 1.6, 0.8)), { size: 0.55, fill: ['#ffffff', '#fff2a8', '#ff6a3a', '#c41e3a'] });
  if (big && dmg > 0) popText(scene, String(dmg), pos.clone().add(new THREE.Vector3(0.9, 0.9, 0.9)), { size: crit ? 0.55 : 0.42 });
}
// rising buff / heal / block column around Sir Isaac, with a rune ring on the ground
export function riseFX(scene, pos, kind = 'buff') {
  if (!scene || !pos) return; const name = kind === 'heal' ? 'rise_heal' : kind === 'block' ? 'rise_block' : 'rise_buff';
  playVFX(scene, name, pos.clone().add(new THREE.Vector3(0, 0.2, 0.5)), { scale: 1.2 }); playVFX(scene, name, pos.clone().add(new THREE.Vector3(0.5, 0.7, 0.4)), { scale: 0.8, flip: true, fps: 12 });
  decalVFX(scene, 'rune_ground', new THREE.Vector3(pos.x, 0, pos.z), { scale: 0.85, color: kind === 'heal' ? '#b8ffb0' : kind === 'block' ? '#b8e8ff' : '#fff0b0' });
}
// enemy wind-up glint before an attack, and the claw slash that lands across Sir Isaac
export const windupFX = (scene, pos) => playVFX(scene, 'glint', pos.clone().add(new THREE.Vector3(0.3, 0.6, 0.6)), { scale: 1.2 });
export function slashFX(scene, pos, { big = false } = {}) { playVFX(scene, 'claw', pos.clone().add(new THREE.Vector3(0, -0.3, 0.6)), { scale: big ? 1.3 : 1 }); playVFX(scene, 'sparks', pos.clone().add(new THREE.Vector3(0, -0.4, 0.6)), { scale: 0.7 }); }

// ---------------------------------------------------------------- the 2D pixel sun for battle skies (animated shimmer billboard)
export function makeSun({ size = 18, fps = 6 } = {}) {
  const pc = sunSheet(); const F = pc.w / pc.h; const tex = sheetTex('sun', pc).clone(); tex.needsUpdate = true; tex.repeat.set(1 / F, 1);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: false, toneMapped: false, fog: false }); mat.color.setScalar(1.15);
  const spr = new THREE.Sprite(mat); spr.scale.setScalar(size); spr.renderOrder = -1; spr.frustumCulled = false;
  spr.onBeforeRender = () => { tex.offset.x = (Math.floor((performance.now() / 1000) * fps) % F) / F; };
  return spr;
}
