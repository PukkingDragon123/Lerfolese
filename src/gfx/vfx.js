// Pixel-art VFX flipbooks in 3D: camera-facing billboards with nearest-filtered sprite-sheet textures that play once
// and remove themselves. Art lives in src/gfx/art/vfxart.js (black-outlined, anime-punchy, low-res pixel art).
import * as THREE from 'three';
import { VFX_DEFS, vfxSheet, sunSheet } from './art/vfxart.js';

export const VFX_NAMES = Object.keys(VFX_DEFS);
// which flipbook plays for each battlescene burst() kind
export const BURST_VFX = { apple: 'apple_splat', stone: 'stone_puff', zap: 'zap', fire: 'fire_burst', water: 'water_splash', wood: 'hit_light', magic: 'arcane', heal: 'heal', block: 'block', smoke: 'smoke_poof' };

const base = new Map();
function sheetTex(key, pc) {
  let t = base.get(key); if (t) return t;
  t = new THREE.CanvasTexture(pc.commit()); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  base.set(key, t); return t;
}

// play a flipbook once at a world position. opts: scale (x the effect's world size), flip (mirror), fps, rot (radians)
export function playVFX(scene, name, worldPos, { scale = 1, flip = false, fps, rot = 0 } = {}) {
  const D = VFX_DEFS[name]; if (!D || !scene || !worldPos) return null;
  const tex = sheetTex(name, vfxSheet(name)).clone(); tex.needsUpdate = true; // clones share the uploaded image
  const N = D.frames; const setFrame = (f) => { tex.repeat.set((flip ? -1 : 1) / N, 1); tex.offset.set((flip ? f + 1 : f) / N, 0); };
  setFrame(0);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthTest: false, depthWrite: false, toneMapped: false, fog: false, rotation: rot });
  const spr = new THREE.Sprite(mat); spr.scale.setScalar(D.world * scale); spr.position.copy(worldPos); spr.renderOrder = 20; spr.frustumCulled = false;
  // advance on a per-render clock clamped like the game's tweens (slow machines see every key frame; hit-stop friendly)
  const rate = fps || D.fps; let el = 0, last = performance.now(), done = false;
  const kill = () => { if (done) return; done = true; spr.visible = false; queueMicrotask(() => { spr.parent?.remove(spr); tex.dispose(); mat.dispose(); }); };
  spr.onBeforeRender = () => { const now = performance.now(); el += Math.min(0.05, (now - last) / 1000); last = now; const f = Math.floor(el * rate); if (f >= N) kill(); else setFrame(f); };
  setTimeout(kill, 30000); // safety if the scene stops rendering
  scene.add(spr); return spr;
}

// the 2D pixel sun for battle skies: an animated shimmer billboard (place it far away along the sky's sun direction)
export function makeSun({ size = 18, fps = 6 } = {}) {
  const pc = sunSheet(); const F = pc.w / pc.h; const tex = sheetTex('sun', pc).clone(); tex.needsUpdate = true; tex.repeat.set(1 / F, 1);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: false, toneMapped: false, fog: false });
  const spr = new THREE.Sprite(mat); spr.scale.setScalar(size); spr.renderOrder = -1; spr.frustumCulled = false;
  spr.onBeforeRender = () => { tex.offset.x = Math.floor((performance.now() / 1000) * fps) % F / F; };
  return spr;
}
