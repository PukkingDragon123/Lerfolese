// Cloud buttons: sculpted low-poly cumulus that carry forged Alagard lettering through the sunset sky (the LERFOLESE
// menu). Each cloud is a loose cluster of separately-moving faceted puffs (pixel-grain shading, baked ambient
// occlusion, a violet belly, a warm rim from the low sun) round a slab of forged gold text half-sunk in it.
//   idle   : the puffs breathe and drift; the whole cloud bobs and slowly yaws
//   hover  : the puffs PART and SWIRL round the text, the text RISES out of the cloud and turns to you, a warm lamp
//            inside the cloud brightens (light, not glow), the cursor changes, a soft chime
//   press  : the cloud squashes and PUFFS (pixel puff particles burst from it), the text bobs down and springs back
//   const b = new CloudButton('New Game', { seed, w }); scene.add(b.group); b.update(dt, t, camera, hovered); b.press(motes)
import * as THREE from 'three';
import { cloudGeo, grainTex } from '../models/vista.js';
import { forgedText } from './text3d.js';
import { Spring } from '../core/tween.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
let MAT = null; const OCC = new THREE.MeshBasicMaterial({ color: 0x7f7fff }); // ink occluder: the cloud hides outlines behind it without drawing its own facets
const cloudMat = () => MAT || (MAT = new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), color: new THREE.Color('#fff2ec'), roughness: 1, metalness: 0, flatShading: true, emissive: new THREE.Color('#6a4c70'), emissiveIntensity: 0.55 }));

export class CloudButton {
  constructor(label, { seed = 1, w = 3.4, font = 'title', unit = 0.0155, sub = null, icon = null, labelOnHover = false, h = 1 } = {}) {
    const r = mulberry32(seed); this.label = label; const W = w; w = 3.6; this.bodyK = W / 3.6; this.group = new THREE.Group(); this.group.name = 'cloud:' + label; this.body = new THREE.Group(); this.group.add(this.body);
    this.puffs = []; const n = 13;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.4; const front = Math.abs(Math.sin(a)) < 0.5; const s = 0.42 + r() * 0.3; const geo = cloudGeo(seed * 17 + i, { n: 4 + Math.floor(r() * 3), w: w * (0.26 + r() * 0.14), h: s * 0.8, d: s * 1.0, detail: 1, lumps: 0.07 }); geo.scale(1, 0.82, 1);
      const m = new THREE.Mesh(geo, cloudMat()); const home = V(Math.cos(a) * w * 0.42, Math.sin(a) * 0.38 - 0.1 + (front ? -0.1 : 0), (r() - 0.5) * 0.5 - (Math.sin(a) > 0 ? 0.25 : -0.05)); m.position.copy(home); m.userData.inkOccluder = OCC; m.castShadow = false; this.body.add(m);
      this.puffs.push({ m, home, a, ph: r() * 10, s: 0.9 + r() * 0.25, out: V(Math.cos(a), Math.sin(a) * 0.8, 0.15) }); }
    { const core = new THREE.Mesh(cloudGeo(seed * 7 + 99, { n: 9, w: w * 0.95, h: 0.75, d: 1.1, detail: 1, lumps: 0.07 }).scale(1, 0.7, 1), cloudMat()); core.position.set(0, -0.32, -0.15); core.userData.inkOccluder = OCC; this.body.add(core); this.core = core; }
    this.text = label ? forgedText(label, { font, unit, depth: 4, style: 'gold', glow: 0.12, seed }) : new THREE.Group(); this.text.userData.face ||= { emissiveIntensity: 0 }; this.text.position.set(0, 0.0, 0.8); this.group.add(this.text); this.textW = this.text.userData.size?.[0] || 0; this.labelOnHover = labelOnHover;
    if (icon) { this.icon = icon; this.iconHolder = new THREE.Group(); this.iconHolder.add(icon); this.iconHolder.position.set(0, 0.05, 0.35); this.group.add(this.iconHolder); }
    this.hScale = h; this.body.scale.setScalar(this.bodyK);
    if (sub) { this.sub = forgedText(sub, { font: 'body', unit: unit * 0.9, depth: 2, style: 'ivory', glow: 0.1, backing: true }); this.sub.position.set(0, -0.55, 0.35); this.group.add(this.sub); }
    this.lamp = new THREE.PointLight(0xffb070, 1.2, 5 * this.bodyK, 1.4); this.lamp.position.set(0, 0.35 * this.bodyK, 1.9 * this.bodyK); this.group.add(this.lamp);
    // the hit volume (invisible, a little larger than the cloud)
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(W * 1.1, 1.5 * this.bodyK * h, 1.4 * this.bodyK), new THREE.MeshBasicMaterial({ visible: false })); this.hit.position.y = -0.05; this.group.add(this.hit); this.hit.userData.cloud = this;
    this.hov = new Spring(0, 7, 0.55); this.squash = new Spring(0, 16, 0.28); this.rise = new Spring(0, 9, 0.62); this.vis = new Spring(1, 6, 0.8); this.swirl = 0; this.hover = false; this.t0 = r() * 10; this.base = V();
  }
  setBase(p) { this.base.copy(p); this.group.position.copy(p); return this; }
  press(motes) {
    this.squash.kick(-9); this.rise.kick(-6);
    if (motes) { const p = this.group.getWorldPosition(V()); for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 1.2; const sp = 0.8 + Math.random() * 1.6;
      motes.spawn({ pos: [p.x + Math.cos(a) * 0.6, p.y + Math.sin(e) * 0.3, p.z + Math.sin(a) * 0.4], vel: [Math.cos(a) * sp, Math.sin(e) * sp * 0.6 + 0.2, Math.sin(a) * sp * 0.7], drag: 2.8, grav: -0.05, life: 0.9 + Math.random() * 0.7, seq: 'puff', fps: 4, once: true, color: Math.random() < 0.6 ? '#f4e8e4' : '#e0c0c8', bright: 0.9, k: Math.random() < 0.3 ? 2 : 1, fadeIn: 0.02 }); } }
  }
  update(dt, t, camera, hovered) {
    this.hover = hovered; this.hov.target = hovered ? 1 : 0; for (const s of [this.hov, this.squash, this.rise, this.vis]) s.update(dt); const h = Math.max(0, this.hov.value); const tt = t + this.t0;
    this.swirl += dt * (0.08 + h * 0.9);
    // bob, yaw, breathe; the squash from a press
    this.group.position.set(this.base.x + Math.sin(tt * 0.31) * 0.12, this.base.y + Math.sin(tt * 0.53) * 0.1, this.base.z + Math.cos(tt * 0.23) * 0.08); this.body.rotation.y = Math.sin(tt * 0.17) * 0.12;
    const sq = this.squash.value * 0.06; const vs = Math.max(0.001, this.vis.value); const bk = this.bodyK; this.body.scale.set(bk * vs * (1 - sq * 0.6), bk * vs * (1 + sq) * this.hScale, bk * vs * (1 - sq * 0.6));
    for (const p of this.puffs) { const sw = this.swirl + p.ph; const part = h * 0.55; // part outward and swirl round the text
      const q = p.home.clone().addScaledVector(p.out, part); const a = sw * 0.25 * (p.home.x > 0 ? 1 : -1) * h; const cx = Math.cos(a), sx = Math.sin(a); const x = q.x * cx - q.y * sx * 0.5, y = q.y * cx + q.x * sx * 0.35;
      p.m.position.set(x + Math.sin(tt * 0.7 + p.ph) * 0.05, y + Math.sin(tt * 0.9 + p.ph * 1.3) * 0.05, q.z - h * 0.35); const br = p.s * (1 + Math.sin(tt * 1.1 + p.ph) * 0.03 - h * 0.08); p.m.scale.setScalar(br); p.m.rotation.y = sw * 0.2 * h + p.ph; }
    // the text rises out of the cloud and turns to face the viewer
    const rise = h * 0.55 + this.rise.value * 0.03; this.text.position.set(0, -0.02 + rise, 0.8 + h * 0.45); if (camera) { const look = camera.position.clone(); const m = new THREE.Matrix4().lookAt(this.text.getWorldPosition(V()), look, V(0, 1, 0)); const q = new THREE.Quaternion().setFromRotationMatrix(m); const qp = this.group.getWorldQuaternion(new THREE.Quaternion()).invert(); const want = qp.multiply(q).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI)); this.text.quaternion.slerp(want, Math.min(1, dt * (2 + h * 6))); }
    const ts = this.labelOnHover ? Math.max(0.001, h) : 1; this.text.scale.setScalar(Math.max(0.001, vs * ts * (1 + h * 0.08 - this.squash.value * 0.01))); this.text.rotation.z += Math.sin(tt * 0.8) * 0.0006; if (this.labelOnHover) this.text.position.set(0, (0.45 + h * 0.6) * this.bodyK, 0.8 * this.bodyK);
    if (this.iconHolder) { const ih = this.iconHolder; ih.position.set(0, (0.02 + h * 0.32) * this.bodyK + Math.sin(tt * 1.2) * 0.03 - this.squash.value * 0.02, (0.35 + h * 0.3) * this.bodyK); ih.rotation.y = Math.sin(tt * 0.6) * 0.35 * (1 - h) + (this.spinIcon ? tt * 0.6 : 0); ih.rotation.x = -0.15 + h * 0.15; ih.scale.setScalar(Math.max(0.001, vs * (1 + h * 0.12 + this.squash.value * 0.02))); }
    if (this.sub) { this.sub.position.set(0, -0.6 + rise * 0.7, 0.3 + h * 0.4); this.sub.quaternion.copy(this.text.quaternion); this.sub.scale.setScalar(Math.max(0.001, vs)); }
    this.text.userData.face.emissiveIntensity = 0.12 + h * 0.35; this.lamp.intensity = (1.2 + h * 4.5) * vs; 
  }
  dispose() { this.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
}
