// Standees: hand-drawn pixel art presented as physical, lit, shadow-casting cut-outs in 3D (HD-2D style).
import * as THREE from 'three';
import { drawn } from '../gfx/drawn.js';

const texCache = new Map();
export function pixelTex(pc) {
  let t = texCache.get(pc); if (t) return t;
  t = new THREE.CanvasTexture(pc.commit ? pc.commit() : pc); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
  texCache.set(pc, t); return t;
}
export function safeDrawn(name, ...args) { try { return drawn(name, ...args); } catch (e) { return null; } }

// height in world units; anchor 'bottom' stands on the ground, 'center' for UI
export function standee(pcOrName, { height = 1, anchor = 'bottom', lit = true, cast = true, toneMapped = false, emissive = 0, flat = false, args = [] } = {}) {
  const pc = typeof pcOrName === 'string' ? safeDrawn(pcOrName, ...args) : pcOrName; if (!pc) return new THREE.Group();
  const w = (pc.w / pc.h) * height; const geo = new THREE.PlaneGeometry(w, height); if (anchor === 'bottom') geo.translate(0, height / 2, 0);
  if (flat) { geo.rotateX(-Math.PI / 2); }
  const mat = lit ? new THREE.MeshStandardMaterial({ map: pixelTex(pc), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75, metalness: 0, toneMapped, emissive: emissive ? new THREE.Color(0xffffff) : new THREE.Color(0), emissiveMap: emissive ? pixelTex(pc) : null, emissiveIntensity: emissive })
    : new THREE.MeshBasicMaterial({ map: pixelTex(pc), alphaTest: 0.5, side: THREE.DoubleSide, toneMapped });
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = false; m.userData.pc = pc; m.userData.w = w; m.userData.h = height;
  return m;
}
// swap frames of an animated drawing; frames = array of PixelCanvas (or names via args list)
export class Animated {
  constructor(name, frames, { height = 1, fps = 8, anchor = 'bottom', lit = true, emissive = 0, flat = false } = {}) {
    this.frames = frames.map((f) => safeDrawn(name, f)).filter(Boolean); this.fps = fps; this.t = Math.random() * 5;
    this.mesh = standee(this.frames[0] || name, { height, anchor, lit, emissive, flat });
  }
  update(dt) { if (this.frames.length < 2) return; this.t += dt; const f = this.frames[Math.floor(this.t * this.fps) % this.frames.length]; const tex = pixelTex(f); if (this.mesh.material.map !== tex) { this.mesh.material.map = tex; if (this.mesh.material.emissiveMap) this.mesh.material.emissiveMap = tex; this.mesh.material.needsUpdate = true; } }
}
// keep a standee facing the camera around the vertical axis (Octopath-style)
export function faceCamera(obj, camera) { const p = obj.getWorldPosition(new THREE.Vector3()); obj.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z); }
