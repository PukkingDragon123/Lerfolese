// POLISHED MENU LETTERING and FLOATING OBJECTS for the tower menu (LERFOLESE). No clouds, no plates.
//   menuWord(text, { height, maxW })  Alagard rendered high-res as real cast type (ui3d/cinetext.js: the font's outline
//     traced to clean facets and extruded with a true bevel, a dark physical backing for the ink edge) in warm old gold.
//     Its own cinematic light keeps it legible and expensive-looking in any scene: a warm KEY from the low sun's side
//     wrapped toward the viewer with a hot specular on the chamfers, a cool RIM on the silhouette, and the sunset sky's
//     image-based reflections on the metal.
//       idle  : a gentle float and sway, the light sliding along the bevels as it turns
//       hover : it lifts toward you and tilts to the pointer, a SHIMMER of light sweeps across the face, a few fine glints
//       press : a quick squash and spring-back, a bright sweep, a chime (the scene plays the sound)
//   FloatIcon(label, { icon })  an object that floats on its own (a book, a dial, a crystal, an arrow): it bobs and turns
//     slowly; on hover it rises, turns to you and its name appears beneath it in small cast letters; press bounces it.
//     The same API as the old cloud button (group, hit, hov, vis, setBase, press, update, dispose).
import * as THREE from 'three';
import { cineText } from './cinetext.js';
import { Spring } from '../core/tween.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function menuWord(text, { height = 1, maxW = Infinity, seed = 1, style = 'gold' } = {}) {
  const G = new THREE.Group(); G.name = 'menuWord:' + text; const body = new THREE.Group(); G.add(body);
  const T = cineText(text, { height, depth: 2.6, bevel: 0.34, style, maxW }); const [W, H] = T.userData.size; body.add(T); const U = T.userData.U;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W + height * 0.5, H + height * 0.5, height), new THREE.MeshBasicMaterial({ visible: false })); G.add(hit);
  const hov = new Spring(0, 7, 0.6), vis = new Spring(1, 6, 0.8), sq = new Spring(0, 16, 0.3); const r = mulberry32(seed); const ph = r() * 10;
  let sweepT = -1, flash = 0;
  const api = {
    group: G, hit, hov, vis, label: text, width: W, height: H, U,
    update(dt, t, hovered, camera = null, sunDir = null, ptr = null) {
      hov.target = hovered ? 1 : 0; hov.update(dt); vis.update(dt); sq.update(dt); const h = Math.max(0, hov.value), v = Math.max(0.001, vis.value); const tt = t + ph;
      if (hovered && sweepT < 0) sweepT = 0; if (sweepT >= 0) { sweepT += dt * 0.8; if (sweepT > 1.7) sweepT = hovered ? 0 : -1; }
      U.uSweep.value = sweepT < 0 ? -4 : -2.2 + sweepT * 2.8; U.uShine.value = Math.min(1, h * 1.2) * 0.9 + flash; flash = Math.max(0, flash - dt * 2.5); U.uRim.value = 1 + h * 0.9; U.uGlow.value = flash * 0.12;
      if (camera && sunDir) { const f = V(0, 0, 1).applyQuaternion(camera.quaternion); U.uKeyDir.value.copy(sunDir).setY(Math.max(0.4, sunDir.y)).normalize().addScaledVector(f, 1.1).normalize().transformDirection(camera.matrixWorldInverse); }
      body.position.set(0, Math.sin(tt * 0.8) * 0.04 * height + h * 0.08 * height, h * 0.35 * height);
      body.rotation.set(Math.sin(tt * 0.55) * 0.05 - (ptr ? ptr.y * 0.14 * h : 0), Math.sin(tt * 0.37) * 0.12 + (ptr ? ptr.x * 0.2 * h : 0), Math.sin(tt * 0.45) * 0.015);
      const s = v * (1 + h * 0.05); body.scale.set(s * (1 + sq.value * 0.04), s * (1 - sq.value * 0.06), s);
    },
    press() { sq.kick(-9); flash = 1.2; sweepT = 0; },
    sparkPoint(out = V()) { return body.localToWorld(out.set((Math.random() - 0.5) * W, (Math.random() - 0.2) * H * 0.7, height * 0.12)); },
    dispose() { /* geometry is cached and shared by cinetext */ },
  };
  return api;
}

export class FloatIcon {
  constructor(label, { seed = 1, icon = null, size = 1, labelH = 0.11, style = 'ivory' } = {}) {
    const r = mulberry32(seed); this.label = label; this.group = new THREE.Group(); this.group.name = 'icon:' + label; this.base = V();
    this.holder = new THREE.Group(); this.group.add(this.holder); if (icon) { this.icon = icon; this.holder.add(icon); }
    this.text = label ? cineText(label, { height: labelH * size, depth: 2, bevel: 0.22, style }) : new THREE.Group(); this.text.position.set(0, -0.5 * size, 0.1); this.text.scale.setScalar(0.001); this.group.add(this.text);
    this.lamp = new THREE.PointLight(0xffc888, 0, 2.2 * size, 1.6); this.lamp.position.set(0, 0.2, 0.8); this.group.add(this.lamp);
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(0.9 * size, 0.9 * size, 0.7 * size), new THREE.MeshBasicMaterial({ visible: false })); this.group.add(this.hit); this.hit.userData.cloud = this; this.hit.userData.icon = this;
    this.hov = new Spring(0, 7, 0.55); this.squash = new Spring(0, 16, 0.28); this.vis = new Spring(1, 6, 0.8); this.t0 = r() * 10; this.size = size;
  }
  setBase(p) { this.base.copy(p); this.group.position.copy(p); return this; }
  press() { this.squash.kick(-9); }
  update(dt, t, camera, hovered) {
    this.hov.target = hovered ? 1 : 0; for (const s of [this.hov, this.squash, this.vis]) s.update(dt); const h = Math.max(0, this.hov.value), v = Math.max(0.001, this.vis.value); const tt = t + this.t0;
    this.group.position.set(this.base.x, this.base.y + Math.sin(tt * 0.9) * 0.05 + h * 0.12, this.base.z);
    if (camera) this.group.quaternion.copy(camera.quaternion);
    const ih = this.holder; ih.rotation.y = Math.sin(tt * 0.6) * 0.4 * (1 - h) + (this.spinIcon ? tt * 0.6 : 0); ih.rotation.x = -0.15 + h * 0.15 + Math.sin(tt * 0.7) * 0.05;
    ih.scale.setScalar(v * (1 + h * 0.15 + this.squash.value * 0.03)); ih.position.z = h * 0.25 * this.size;
    this.text.scale.setScalar(Math.max(0.001, h * v)); this.lamp.intensity = h * 2.5 * v;
  }
  dispose() { this.group.traverse((o) => { if (o.isMesh && !o.geometry.userData?.shared) o.geometry.dispose?.(); }); }
}
