// Sir Isaac WEARS and USES his artifacts: every owned curio appears on the young Newton (battle, and any scene that
// builds him), worn at a body slot and animated, with a small trigger animation when it activates in battle
// (battlescene fx.artifact(id) -> wear.trigger(id)).
//   const wear = new Wearables(prof, run.items); wear.update(dt); wear.trigger('tyche'); wear.set(items); wear.dispose()
// Slots: head, neck, coat, back, belt, leftHand, rightHand, footL/R, shin, orbit, shoulder. Pieces parent to the rig
// bones found by name under prof.body (the floating body frame for orbit / shoulder pieces) with per-piece offsets in
// METRES in the bone's rest frame (+z forward, +y up, +x = his left); this keeps each piece individually animatable
// (prof.attach() offers the same slots for simple props).
import * as THREE from 'three';
import { itemModel, animateModel } from './items3d.js';

const TAU = Math.PI * 2;
const SLOT_BONE = { head: 'head', neck: 'chest', coat: 'chest', back: 'chest', belt: 'hips', leftHand: 'handL', rightHand: 'handR', footL: 'footL', footR: 'footR', shin: 'shinR', orbit: null, shoulder: null };
// per curio: one or more pieces { slot, model, size (m, longest side), pos [x,y,z] m, rot [x,y,z], hang (swings from its top) }
// plus `orbit` pieces { model, size, n, r, y, speed }
const W = {
  golden_apple: [{ slot: 'orbit', model: 'golden_apple', size: 0.13, n: 1, r: 0.62, y: 1.15, speed: -1.4 }],
  lever: [{ slot: 'back', model: 'lever', size: 0.85, pos: [0.0, 0.0, -0.2], rot: [0, Math.PI / 2, 0.9] }],
  pendulum: [{ slot: 'belt', model: 'pendulum', size: 0.24, pos: [0.17, -0.1, 0.07], rot: [0, -0.4, 0], hang: true }],
  leyden: [{ slot: 'belt', model: 'leyden', size: 0.17, pos: [-0.19, -0.06, 0.03], rot: [0, 0.5, 0.08] }],
  wings: [{ slot: 'back', model: 'wings', size: 1.15, pos: [0, 0.1, -0.2], rot: [0.12, Math.PI, 0] }],
  antikythera: [{ slot: 'belt', model: 'antikythera', size: 0.15, pos: [0.04, 0.0, 0.15], rot: [0, 0, 0] }],
  schrodinger: [{ slot: 'belt', model: 'schrodinger', size: 0.17, pos: [-0.15, -0.08, -0.13], rot: [0, -2.4, 0] }],
  owl: [{ slot: 'coat', model: 'owl', size: 0.22, pos: [0.19, 0.24, -0.01], rot: [0, 0.4, 0] }],
  pan_flute: [{ slot: 'belt', model: 'pan_flute', size: 0.18, pos: [0.2, -0.06, -0.04], rot: [0, 1.2, 0.2] }],
  horn: [{ slot: 'belt', model: 'horn', size: 0.2, pos: [-0.2, -0.1, -0.06], rot: [0, -1.2, 2.6], hang: true }],
  fang: [{ slot: 'neck', model: 'fang', size: 0.09, pos: [0.0, 0.03, 0.15], rot: [0.2, 0, 0], hang: true }],
  mirror: [{ slot: 'belt', model: 'mirror', size: 0.2, pos: [-0.2, -0.05, 0.06], rot: [0, 0.9, Math.PI], hang: true }],
  prism: [{ slot: 'shoulder', model: 'prism', size: 0.26, pos: [-0.42, 1.62, 0.08], rot: [0, 0.3, 0] }],
  sack: [{ slot: 'belt', model: 'sack', size: 0.18, pos: [0.15, -0.12, -0.14], rot: [0, 2.2, 0], hang: true }],
  thread: [{ slot: 'belt', model: 'thread', size: 0.14, pos: [0.21, 0.02, 0.0], rot: [0, 1.4, 0] }],
  wineskin: [{ slot: 'belt', model: 'wineskin', size: 0.2, pos: [-0.2, -0.1, -0.08], rot: [0, -1.4, 0.1], hang: true }],
  wine_flask: [{ slot: 'belt', model: 'wine_flask', size: 0.16, pos: [0.2, -0.08, -0.08], rot: [0, 1.6, 0], hang: true }],
  horn_shard: [{ slot: 'neck', model: 'horn_shard', size: 0.08, pos: [0.04, 0.02, 0.15], rot: [0.2, 0, 0.4], hang: true }],
  gorgon_scale: [{ slot: 'coat', model: 'gorgon_scale', size: 0.17, pos: [-0.17, 0.2, 0.06], rot: [-0.3, -0.5, 0.3] }],
  plumb_bob: [{ slot: 'belt', model: 'plumb_bob', size: 0.2, pos: [-0.13, -0.16, 0.1], rot: [0, 0, 0], hang: true }],
  statues: [{ slot: 'orbit', model: 'statue_one', size: 0.2, n: 3, r: 0.75, y: 0.62, speed: 0.55 }],
  tyche: [{ slot: 'belt', model: 'tyche', size: 0.13, pos: [0.14, -0.1, 0.12], rot: [0, 0, 0], hang: true }],
  horseshoe: [{ slot: 'belt', model: 'horseshoe', size: 0.14, pos: [-0.12, -0.05, 0.14], rot: [0, 0, Math.PI], hang: true }],
  pandora: [{ slot: 'shoulder', model: 'pandora', size: 0.22, pos: [0.42, 1.58, -0.05], rot: [0, 0, 0] }],
  golden_ratio: [{ slot: 'coat', model: 'phi_sigil', size: 0.17, pos: [0.0, 0.08, -0.16], rot: [0, Math.PI, 0] }, { slot: 'coat', model: 'phi_sigil', size: 0.09, pos: [0.09, 0.12, 0.155], rot: [0, 0, 0] }],
  lead_boots: [{ slot: 'footL', model: 'lead_boot', size: 0.3, pos: [0, -0.04, 0.05], rot: [0, -Math.PI / 2, 0] }, { slot: 'footR', model: 'lead_boot', size: 0.3, pos: [0, -0.04, 0.05], rot: [0, -Math.PI / 2, 0] }],
  lyre: [{ slot: 'back', model: 'lyre', size: 0.42, pos: [0.08, -0.05, -0.2], rot: [0, Math.PI, -0.35] }],
  nemesis: [{ slot: 'neck', model: 'nemesis', size: 0.09, pos: [-0.03, 0.0, 0.15], rot: [0.15, 0, 0], hang: true }],
  achilles: [{ slot: 'shin', model: 'achilles', size: 0.26, pos: [0, -0.18, 0.02], rot: [0, Math.PI, 0] }],
  anvil: [{ slot: 'orbit', model: 'anvil', size: 0.2, n: 1, r: 0.55, y: 0.25, speed: 0.3 }],
  amphora: [{ slot: 'back', model: 'amphora', size: 0.3, pos: [-0.12, -0.15, -0.2], rot: [0, 0, 0.5] }],
  icarus_feather: [{ slot: 'head', model: 'icarus_feather', size: 0.22, pos: [0.08, 0.1, -0.06], rot: [0.3, 0.4, -0.5] }],
  talaria: [{ slot: 'footL', model: 'talaria_wing', size: 0.16, pos: [0.06, 0.06, -0.04], rot: [0, 0.3, 0] }, { slot: 'footR', model: 'talaria_wing', size: 0.16, pos: [-0.06, 0.06, -0.04], rot: [0, Math.PI - 0.3, 0] }],
};
export const WEARABLE_IDS = Object.keys(W);

let flashTex = null;
function flashSprite(color) { // a soft pop of light behind a piece when it triggers
  if (!flashTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); flashTex = new THREE.CanvasTexture(c); flashTex.colorSpace = THREE.SRGBColorSpace; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: new THREE.Color(color).multiplyScalar(1.8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.userData.noInk = true; return s;
}
const FLASH = { prism: 0xffffff, golden_ratio: 0xffd060, tyche: 0xfff0a0, statues: 0xd8d0c0, lead_boots: 0x9aa8c0, pandora: 0xffe0a0, leyden: 0xfff0a0, nemesis: 0xffc070, golden_apple: 0xffe070 };

export class Wearables {
  constructor(prof, items = []) { this.prof = prof; this.pieces = []; this.t = Math.random() * 10; this.ids = []; this.boneCache = new Map(); this.set(items); }
  bone(name) { if (!this.boneCache.has(name)) { let b = null; this.prof.body.traverse((o) => { if (!b && o.name === name && !o.isMesh) b = o; }); this.boneCache.set(name, b); } return this.boneCache.get(name); }
  set(items) {
    const ids = [...new Set(items)].filter((id) => W[id]); if (ids.join() === this.ids.join()) return; this.clear(); this.ids = ids;
    const rootScale = this.prof.root.getWorldScale(new THREE.Vector3()).x || 1;
    for (const id of ids) for (const spec of W[id]) {
      const count = spec.slot === 'orbit' ? spec.n || 1 : 1;
      for (let i = 0; i < count; i++) {
        const holder = new THREE.Group(); holder.name = 'wear:' + id; const inner = new THREE.Group(); holder.add(inner);
        const m = itemModel(spec.model); m.scale.setScalar(spec.size); inner.add(m); if (spec.rot) m.rotation.set(...spec.rot);
        if (spec.hang) m.position.y = -spec.size * 0.45; // hangs from its strap at the holder origin
        const fl = flashSprite(FLASH[id] || 0xfff0c8); fl.scale.setScalar(spec.size * 2.2); inner.add(fl);
        let parent = null;
        if (!parent) {
          if (spec.slot === 'orbit' || spec.slot === 'shoulder') { this.prof.body.add(holder); parent = this.prof.body; }
          else { const b = this.bone(SLOT_BONE[spec.slot]); if (!b) continue; b.add(holder); parent = b; }
        }
        // bones live inside the rig's scaled root: undo that scale so pieces are authored in metres
        parent.updateWorldMatrix(true, false); const ps = parent.getWorldScale(new THREE.Vector3()).x / rootScale || 1; holder.scale.setScalar(1 / ps);
        if (spec.pos) holder.position.set(spec.pos[0] / ps, spec.pos[1] / ps, spec.pos[2] / ps);
        holder.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
        this.pieces.push({ id, spec, holder, inner, m, fl, i, n: count, boost: 0, ph: Math.random() * TAU, ps });
      }
    }
  }
  /** an artifact fired in battle: its pieces pop, flash and do their move (dice roll, prism refracts, coin flips...) */
  trigger(id) { id = String(id); if (id.startsWith('law:')) return; for (const p of this.pieces) if (p.id === id) p.boost = 1; }
  update(dt) {
    this.t += dt; const t = this.t;
    for (const p of this.pieces) {
      const { spec, holder, inner, m } = p; p.boost = Math.max(0, p.boost - dt * 0.9); const b = p.boost, e = b * b;
      if (spec.slot === 'orbit') { const a = t * spec.speed + (p.i / p.n) * TAU + b * 4; holder.position.set(Math.cos(a) * spec.r, spec.y + Math.sin(t * 1.3 + p.i * 2) * 0.05 + e * 0.15, Math.sin(a) * spec.r); inner.rotation.y = -a + Math.PI / 2; }
      else if (spec.slot === 'shoulder') { holder.position.set(spec.pos[0], spec.pos[1] + Math.sin(t * 1.5 + p.ph) * 0.04 + e * 0.08, spec.pos[2]); inner.rotation.y = Math.sin(t * 0.7) * 0.4 + b * 6; }
      if (spec.hang) inner.rotation.z = Math.sin(t * 2.1 + p.ph) * 0.12 + Math.sin(t * 11) * 0.5 * e; // swings on its strap
      if (p.id === 'tyche') { inner.position.y = Math.abs(Math.sin(b * 9)) * 0.06 * b / p.ps; m.rotation.x += dt * 14 * b; m.rotation.z += dt * 10 * b; } // the dice roll
      if (p.id === 'lead_boots') inner.position.y = -Math.abs(Math.sin(b * 6)) * 0.03 * b / p.ps; // a stomp
      if (p.id === 'wings' || p.id === 'talaria') inner.rotation.x = Math.sin(t * 9) * 0.25 * b;
      inner.scale.setScalar(1 + 0.45 * e * Math.max(0, Math.sin(b * Math.PI)) + 0.25 * e);
      p.fl.material.opacity = Math.min(1, e * 1.4); p.fl.scale.setScalar(spec.size * (2.2 + (1 - b) * 1.5));
      animateModel(m, t + p.ph, b);
    }
  }
  clear() { for (const p of this.pieces) p.holder.parent?.remove(p.holder); this.pieces = []; this.ids = []; }
  dispose() { this.clear(); }
}

/** convenience for scenes: dress `prof` in the run's items and return the Wearables (or null) */
export function wearArtifacts(prof, items) { try { return new Wearables(prof, items || []); } catch (e) { console.warn('wearables', e); return null; } }
