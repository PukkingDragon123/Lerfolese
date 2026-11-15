// POLISHED MENU LETTERING and FLOATING OBJECTS for the tower menu and the Hall (LERFOLESE). No clouds, no plates.
//   menuWord(text, { height, maxW })  crisp Alagard lettering forged in real depth (ui3d/text3d.js forgedText: a stepped
//     extrusion, a pixel bevel and a dark physical backing for the ink edge) in warm old gold. Its own lighting keeps it
//     legible and expensive-looking in any scene: a soft warm KEY from the low sun's side wrapped toward the viewer, a cool
//     RIM on the silhouette edges, and the sunset sky's image-based reflections on the metal.
//       idle  : a gentle float and sway, the light catching the bevels as it turns
//       hover : it lifts toward you and tilts to the pointer, a SHIMMER of light sweeps across the face, a few fine glints
//       press : a quick squash and spring-back, a bright sweep, a chime (the scene plays the sound)
//   FloatIcon(label, { icon })  an object that floats on its own (a book, a dial, a crystal, an arrow): it bobs and turns
//     slowly; on hover it rises, turns to you and its name appears beneath it in small forged letters; press bounces it.
//     The same API as the old cloud button (group, hit, hov, vis, setBase, press, update, dispose).
import * as THREE from 'three';
import { forgedText } from './text3d.js';
import { Spring } from '../core/tween.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const OLD_GOLD = { ramp: ['#2a1206', '#5e3410', '#9a5e1e', '#cf9236', '#f2c868', '#fff0c0'], side: '#4a2a0e', back: '#0c0604', metal: 0.82, rough: 0.34, pit: 0.06 };

/** wrap a lettering material with a key / rim / shimmer term (view space; uniforms shared per word) */
function polish(m, U, face) {
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform vec3 uKeyDir; uniform float uSweep; uniform float uShine; uniform float uRim;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
      float kd = max(dot(normal, uKeyDir), 0.0); float rim = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.4);
      outgoingLight += diffuseColor.rgb * vec3(1.0, 0.82, 0.6) * kd * 0.55 + vec3(0.55, 0.62, 0.95) * rim * uRim * 0.35;
      ${face ? '#ifdef USE_MAP\n float sw = vMapUv.x * 1.4 + vMapUv.y * 0.35 - uSweep; float band = exp(-sw * sw * 90.0); outgoingLight += diffuseColor.rgb * vec3(1.0, 0.9, 0.7) * band * uShine * 1.6;\n#endif' : ''}
      #include <opaque_fragment>`); };
  m.customProgramCacheKey = () => 'menuWord' + (face ? 'F' : 'S'); m.needsUpdate = true; return m;
}

export function menuWord(text, { height = 1, maxW = Infinity, seed = 1, style = OLD_GOLD } = {}) {
  const G = new THREE.Group(); G.name = 'menuWord:' + text; const body = new THREE.Group(); G.add(body);
  let unit = height / 33; let T = forgedText(text, { font: 'cap', unit, depth: 7, style, backing: true, glow: 0.04, seed });
  if (T.userData.size[0] > maxW) { unit *= maxW / T.userData.size[0]; T = forgedText(text, { font: 'cap', unit, depth: 7, style, backing: true, glow: 0.04, seed }); }
  const [W, H] = T.userData.size; body.add(T);
  const U = { uKeyDir: { value: V(-0.5, 0.5, 0.7).normalize() }, uSweep: { value: -1 }, uShine: { value: 0 }, uRim: { value: 1 } };
  polish(T.userData.face, U, true); polish(T.userData.side, U, false);
  T.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W + height * 0.5, H + height * 0.5, height), new THREE.MeshBasicMaterial({ visible: false })); G.add(hit);
  const hov = new Spring(0, 7, 0.6), vis = new Spring(1, 6, 0.8), sq = new Spring(0, 16, 0.3); const r = mulberry32(seed); const ph = r() * 10;
  let sweepT = -1, flash = 0;
  const api = {
    group: G, hit, hov, vis, label: text, width: W, height: H,
    update(dt, t, hovered, camera = null, sunDir = null, ptr = null) {
      hov.target = hovered ? 1 : 0; hov.update(dt); vis.update(dt); sq.update(dt); const h = Math.max(0, hov.value), v = Math.max(0.001, vis.value); const tt = t + ph;
      if (hovered && sweepT < 0) sweepT = 0; if (sweepT >= 0) { sweepT += dt * 0.9; if (sweepT > 1.6) sweepT = hovered ? 0 : -1; }
      U.uSweep.value = sweepT < 0 ? -2 : -0.3 + sweepT * 1.6; U.uShine.value = Math.min(1, h * 1.2) * 0.9 + flash; flash = Math.max(0, flash - dt * 2.5); U.uRim.value = 1 + h * 0.8;
      if (camera && sunDir) { const f = V(0, 0, 1).applyQuaternion(camera.quaternion); U.uKeyDir.value.copy(sunDir).setY(Math.max(0.4, sunDir.y)).normalize().addScaledVector(f, 1.1).normalize().transformDirection(camera.matrixWorldInverse); }
      body.position.set(0, Math.sin(tt * 0.8) * 0.04 * height + h * 0.08 * height, h * 0.35 * height);
      body.rotation.set(Math.sin(tt * 0.55) * 0.03 - (ptr ? ptr.y * 0.12 * h : 0), Math.sin(tt * 0.37) * 0.07 + (ptr ? ptr.x * 0.18 * h : 0), Math.sin(tt * 0.45) * 0.015);
      const s = v * (1 + h * 0.05); body.scale.set(s * (1 + sq.value * 0.04), s * (1 - sq.value * 0.06), s);
    },
    press() { sq.kick(-9); flash = 1.2; sweepT = 0; },
    sparkPoint(out = V()) { return body.localToWorld(out.set((Math.random() - 0.5) * W, (Math.random() - 0.2) * H * 0.7, height * 0.12)); },
    dispose() { G.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); },
  };
  return api;
}

export class FloatIcon {
  constructor(label, { seed = 1, icon = null, unit = 0.0085, size = 1 } = {}) {
    const r = mulberry32(seed); this.label = label; this.group = new THREE.Group(); this.group.name = 'icon:' + label; this.base = V();
    this.holder = new THREE.Group(); this.group.add(this.holder); if (icon) { this.icon = icon; this.holder.add(icon); }
    this.text = label ? forgedText(label, { font: 'head', unit, depth: 3, style: 'ivory', glow: 0.35, seed }) : new THREE.Group(); this.text.position.set(0, -0.5 * size, 0.1); this.text.scale.setScalar(0.001); this.group.add(this.text);
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
  dispose() { this.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
}
