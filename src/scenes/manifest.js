// MANIFEST -> MANIPULATE -> RELEASE, the battle's presentation side. Matter conjured in mid-air hangs on a glowing
// gravity string and bobs; every Law dropped on it changes it (speed streaks, spin, a lift for the fall, flame,
// arcs, a heavier sag); a marching dotted trajectory shows where it will fly and a leather tag the predicted damage.
// When the bell rings, each one is let go in turn and flies its path. Rules: game/battle.js (manifest / manipulate /
// release / aim); this file only draws them. The objects reuse the projectile art from fieldviews.js.
import * as THREE from 'three';
import { projectileModel } from './fieldviews.js';
import { Tag, Strip, Signboard } from '../ui3d/objects.js';
import { uiPos, wrapText, PXP } from '../ui3d/craft.js';
import { Card3D } from '../ui3d/cards3d.js';
import { describeCard, BASICS } from '../game/data/cards.js';
import { mkCard } from '../game/run.js';
import { audio } from '../core/audio.js';
import { tweens } from '../core/tween.js';
import { baseOf, flatten } from '../game/combos.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// the manifest zone: mid-air between Sir Isaac and the foes (the ground below stays the old FIELD drop)
export const AIR = { x: [-2.6, 0.6], y: [0.1, 3.9], z: 1.0 }; // the whole field between Newton and the foes, ground to sky

// a 7x7 hand-placed pixel diamond (outline, two lit facets, a glint) for the trajectory dots; nearest-sampled
let _mote = null;
function moteTex() {
  if (_mote) return _mote;
  const rows = ['...o...', '..oLo..', '.oLHmo.', 'oLHWmdo', '.ommdo.', '..odo..', '...o...'];
  const C = { o: '#3a1458', L: '#c9a4ff', H: '#efe2ff', W: '#ffffff', m: '#9a6ae0', d: '#6a3cb0' };
  const c = document.createElement('canvas'); c.width = c.height = 7; const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (C[ch]) { g.fillStyle = C[ch]; g.fillRect(x, y, 1, 1); } }));
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; _mote = t; return t;
}

// the flight from a held object to its foe: a falling strike lifts high then drops; a pushed one flies flat and fast;
// a spinning one curves. Shared by the dotted preview and the real release.
export function flightPath(from, to, art) {
  const out = V();
  if (art.falling) {
    const apex = V(to.x, Math.max(from.y, to.y) + 2.7, to.z), ctl = V((from.x + to.x) / 2, apex.y + 0.6, (from.z + to.z) / 2);
    return (k) => { if (k < 0.55) { const u = k / 0.55, a = 1 - u; return out.set(a * a * from.x + 2 * a * u * ctl.x + u * u * apex.x, a * a * from.y + 2 * a * u * ctl.y + u * u * apex.y, a * a * from.z + 2 * a * u * ctl.z + u * u * apex.z); } const u = (k - 0.55) / 0.45; return out.lerpVectors(apex, to, u * u); };
  }
  const arc = art.fast ? 0.45 : 1.7, side = art.spin ? 1.3 : 0;
  return (k) => out.lerpVectors(from, to, k).add(_t.set(0, Math.sin(k * Math.PI) * arc, Math.sin(k * Math.PI) * side));
}
const _t = V();

class HeldView {
  constructor(L, o) {
    this.L = L; this.o = o; this.uid = o.uid; this.seed = Math.random() * 9; this.g = new THREE.Group(); this.lift = 0; this.liftT = 0; this.pop = 0;
    this.home = o.pos ? V(o.pos.x, o.pos.y, o.pos.z) : L.freeSpot(); this.g.position.copy(this.home); L.S.scene.add(this.g);
    // the glowing gravity string it hangs from (a spectral thread rising out of sight)
    this.strN = 12; this.strGeo = new THREE.BufferGeometry(); this.strGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.strN * 3), 3));
    this.str = new THREE.Line(this.strGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0xb48cff).multiplyScalar(2.2), transparent: true, opacity: 0.85, depthWrite: false })); this.str.frustumCulled = false; L.S.scene.add(this.str);
    // dotted trajectory to the predicted foe
    this.dotN = 26; this.dotGeo = new THREE.BufferGeometry(); this.dotGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.dotN * 3), 3));
    this.dots = new THREE.Points(this.dotGeo, new THREE.PointsMaterial({ map: moteTex(), size: 0.4, sizeAttenuation: true, transparent: true, alphaTest: 0.5, depthWrite: false, toneMapped: false })); this.dots.frustumCulled = false; L.S.scene.add(this.dots);
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ visible: false })); this.hit.userData.target = { type: 'held', uid: o.uid }; this.g.add(this.hit);
    this.tag = new Tag('0', { icon: 'sword' }); L.S.ui.root.add(this.tag.group);
    this.mark = new Tag('TARGET', { icon: 'down', style: 'burn' }); L.S.ui.root.add(this.mark.group); // hangs beside the foe it will hit
    this.rebuild(true);
  }
  // the object itself, rebuilt from its current Move art whenever a Law changes it
  rebuild(first = false) {
    const pv = this.L.S.battle.heldPreview(this.o); this.pv = pv; this.art = pv.mv.art;
    if (this.model) this.g.remove(this.model);
    this.model = projectileModel(this.art); this.model.scale.multiplyScalar(0.85); this.baseScale = this.model.scale.x; this.g.add(this.model);
    this.liftT = this.art.falling ? 0.9 : 0; this.pop = first ? 1 : 0.6;
    this.refresh();
  }
  refresh() { const pv = (this.pv = this.L.S.battle.heldPreview(this.o)); this.tag.set(pv.est ? String(pv.est.total) : '?'); }
  pos(out = V()) { return out.copy(this.g.position); }
  target() { return this.pv?.target ? this.L.S.enemyPos(this.pv.target) : null; }
  update(dt, t) {
    const a = this.art, m = this.model; if (!m) return;
    if (this.flying) { this.dots.visible = false; return; } // in flight the release tween owns it
    this.lift += (this.liftT - this.lift) * Math.min(1, dt * 4); this.pop = Math.max(0, this.pop - dt * 2.2);
    const bob = Math.sin(t * (a.bouncy ? 3.4 : 1.9) + this.seed) * (a.bouncy ? 0.2 : 0.08); const sag = Math.min(3, a.heavy || 0) * 0.08;
    this.g.position.set(this.home.x + (a.fast ? Math.sin(t * 47) * 0.015 : 0), this.home.y + this.lift + bob - sag, this.home.z);
    m.rotation.y += dt * (a.spin ? 11 : 0.9); m.rotation.x = Math.sin(t * 1.3 + this.seed) * 0.25 + (a.spin ? t * 3 : 0);
    const s = 1 + Math.sin(this.pop * Math.PI) * 0.35; const sq = a.bouncy ? 1 + Math.sin(t * 6.8 + this.seed) * 0.08 : 1;
    const b = this.baseScale * s; m.scale.set(b / Math.sqrt(sq), b * sq, b / Math.sqrt(sq));
    // the string: from the object up into the dusk, swaying, slack when the object sags
    const p = this.strGeo.attributes.position; const top = V(this.g.position.x + Math.sin(t * 0.7 + this.seed) * 0.3, this.g.position.y + 4.6, this.g.position.z - 0.4);
    for (let i = 0; i < this.strN; i++) { const u = i / (this.strN - 1); const x = this.g.position.x + (top.x - this.g.position.x) * u + Math.sin(u * Math.PI) * Math.sin(t * 1.7 + this.seed) * 0.12, y = this.g.position.y + 0.25 + (top.y - this.g.position.y) * u - Math.sin(u * Math.PI) * sag * 0.6, z = this.g.position.z + (top.z - this.g.position.z) * u; p.setXYZ(i, x, y, z); }
    p.needsUpdate = true; this.str.material.opacity = 0.65 + Math.sin(t * 5 + this.seed) * 0.15;
    // the trajectory: marching dots from here to the foe
    const to = this.target(); const d = this.dotGeo.attributes.position;
    if (to) { const path = flightPath(this.g.position, to, a); const ph = (t * 0.9) % 1; for (let i = 0; i < this.dotN; i++) { const k = Math.min(0.999, (i + ph) / this.dotN); const q = path(k); d.setXYZ(i, q.x, q.y, q.z); } d.needsUpdate = true; this.dots.visible = !this.flying; }
    else this.dots.visible = false;
    // what the Laws did to it, in motion: speed streaks, embers, sparks, a trickle of motes down the string
    const P = this.L.S.glowParts, q = this.g.position;
    if (a.fast && Math.random() < dt * 30 && to) { const dir = _t.copy(to).sub(q).normalize(); P.spawn({ pos: [q.x - dir.x * 0.3, q.y + (Math.random() - 0.5) * 0.3, q.z], vel: [-dir.x * 5, -dir.y * 2, 0], life: 0.25, size: 26, size1: 4, color: '#e8fbff', sprite: 'spark2', drag: 3 }); }
    if (a.hot && Math.random() < dt * 14) P.spawn({ pos: [q.x, q.y + 0.2, q.z], vel: [(Math.random() - 0.5) * 0.6, 1.4, 0], life: 0.6, size: 28, size1: 6, color: '#ffb04a', sprite: 'ember', grav: -1 });
    if (a.electric && Math.random() < dt * 10) P.spawn({ pos: [q.x + (Math.random() - 0.5) * 0.6, q.y + (Math.random() - 0.5) * 0.6, q.z], vel: [0, 0, 0], life: 0.15, size: 30, color: '#fff3b0', sprite: 'spark' });
    if (Math.random() < dt * 3) P.spawn({ pos: [top.x, top.y - 0.3, top.z], vel: [0, -2.2, 0], life: 1.6, size: 16, color: '#cdb6f0', sprite: 'star4' });
    // the damage tag hangs just above it, in the UI layer
    const ui = this.L.S.engine.worldToUI(_t.copy(q).add(V(0, 1.0 + (a.falling ? 0.2 : 0), 0))); uiPos(this.tag.group, ui.x, ui.y, 3); this.tag.group.scale.setScalar(((40 - 3) / 40) * 0.95); this.tag.update(dt, null);
    const foe = this.pv?.target, fv = foe && this.L.S.enemyViews.get(foe.uid); this.mark.group.visible = !!fv && !this.L.insp;
    if (fv) { const mp = this.L.S.engine.worldToUI(_t.copy(fv.api.root.position).add(V(-0.75, fv.h * 0.62, 0))); const k = this.L.targetSlot(this); uiPos(this.mark.group, mp.x - 1.2, mp.y + k * 0.9, 3.2); this.mark.group.scale.setScalar(((40 - 3.2) / 40) * 0.9); this.mark.update(dt, null); }
  }
  dispose() { const S = this.L.S; S.scene.remove(this.g, this.str, this.dots); this.strGeo.dispose(); this.dotGeo.dispose(); this.str.material.dispose(); this.dots.material.dispose(); for (const t of [this.tag, this.mark]) { t.group.parent?.remove(t.group); t.tex?.dispose(); } }
}

export class HeldLayer {
  constructor(S) {
    this.S = S; this.views = new Map(); this.t = 0; this.acc = 0;
    const w = AIR.x[1] - AIR.x[0], h = AIR.y[1] - AIR.y[0];
    this.zone = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6), new THREE.MeshBasicMaterial({ visible: false })); this.zone.position.set((AIR.x[0] + AIR.x[1]) / 2, (AIR.y[0] + AIR.y[1]) / 2, AIR.z); this.zone.userData.target = { type: 'air' }; S.scene.add(this.zone);
    this.ghostKey = ''; this.ghostObj = null; this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(V(0, 0, 1), -AIR.z);
    S.engine.add(this);
  }
  hits() { return [this.zone]; }
  // a held object under the pointer (checked before the air zone, which would otherwise swallow it)
  pick() { this.ray.setFromCamera(this.S.input.ndc, this.S.camera); const h = this.ray.intersectObjects([...this.views.values()].map((v) => v.hit), false); return h.length ? h[0].object.userData.target : null; }
  // where the pointer meets the manifest plane, kept inside the zone
  airPoint() { this.ray.setFromCamera(this.S.input.ndc, this.S.camera); const p = V(); if (!this.ray.ray.intersectPlane(this.plane, p)) p.set(-1, 2.6, AIR.z); p.x = Math.max(AIR.x[0] + 0.3, Math.min(AIR.x[1] - 0.3, p.x)); p.y = Math.max(1.7, Math.min(AIR.y[1] - 0.3, p.y)); p.z = AIR.z; return this.spread(p); } // placed things hover at chest height or above
  spread(p) { for (let i = 0; i < 4; i++) { const near = [...this.views.values()].find((v) => v.home.distanceTo(p) < 1.05); if (!near) break; p.x = p.x + 1.1 > AIR.x[1] - 0.3 ? AIR.x[0] + 0.3 + i * 0.4 : p.x + 1.1; } return p; }
  freeSpot() { return this.spread(V(-1.6 + this.views.size * 1.1, 2.7, AIR.z)); }
  nearestFoe(p) { let best = null, bd = 1e9; for (const e of this.S.battle.alive()) { const q = this.S.enemyPos(e); const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = e; } } return best?.uid || null; }
  // a translucent preview of what would appear where the card is about to be dropped
  ghost(slotV) {
    const S = this.S; const mv = slotV ? S.battle.moveOf(slotV.slot) : null; const key = slotV ? mv?.key || '' : '';
    if (key !== this.ghostKey) {
      if (this.ghostObj) { S.scene.remove(this.ghostObj); this.ghostObj = null; } this.ghostKey = key;
      if (mv) { this.ghostObj = projectileModel(mv.art); this.ghostObj.scale.multiplyScalar(0.85); this.ghostObj.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; o.material.depthWrite = false; o.castShadow = false; } }); S.scene.add(this.ghostObj); }
    }
    if (this.ghostObj) { this.ghostObj.position.copy(this.airPoint()); this.ghostObj.rotation.y += 0.05; }
  }
  add(o) { const v = new HeldView(this, o); this.views.set(o.uid, v); if (!o.pos) o.pos = { x: v.home.x, y: v.home.y, z: v.home.z }; return v; }
  remove(o) { const v = this.views.get(o.uid); if (!v) return; v.dispose(); this.views.delete(o.uid); }
  targetSlot(v) { let k = 0; for (const w of this.views.values()) { if (w === v) break; if (w.pv?.target?.uid === v.pv?.target?.uid) k++; } return k; }
  isTargeted(uid) { for (const v of this.views.values()) if (v.pv?.target?.uid === uid && !v.flying) return true; return false; }
  // 3D <-> card: click a placed object and it turns into its card, zoomed in, with the full reading beside it
  inspect(uid) {
    if (this.insp) return this.closeInspect(); const v = this.views.get(uid); if (!v) return; const S = this.S; const W = S.engine.uiW;
    const pv = S.battle.heldPreview(v.o); const card = { uid: 'insp-' + uid, type: 'move', comps: v.o.comps.map((c) => ({ ...c })), name: pv.mv.name, up: 0 };
    const c3 = new Card3D(card); const p = S.engine.worldToUI(v.g.position); c3.pos.snap(p.x, p.y, 3); c3.sc.set(0.15); c3.flip.set(1); c3.flip.target = 0; c3.target = { x: -W * 0.42, y: 0.9, z: 8, rz: -0.04, s: 1.7 };
    S.engine.ui.scene.add(c3.group); v.g.visible = false; v.str.visible = false; this.insp = { v, c3 }; audio.play('card_flip'); audio.play('paper_rustle', { vol: 0.5 });
    S.tooltip.show(infoLines(pv, v.o, S.battle), -W * 0.42 + 9.6, 2.2, 10, { maxW: 15 });
  }
  closeInspect() {
    const I = this.insp; if (!I) return; this.insp = null; const S = this.S; const p = S.engine.worldToUI(I.v.g.position); I.c3.flip.target = 1; I.c3.target = { x: p.x, y: p.y, z: 3, rz: 0, s: 0.15 };
    this.leaving = I.c3; setTimeout(() => { S.engine.ui.scene.remove(I.c3.group); if (this.leaving === I.c3) this.leaving = null; if (this.views.has(I.v.uid)) { I.v.g.visible = true; I.v.str.visible = true; I.v.pop = 1; } }, 380);
    S.tooltip.hide(); audio.play('card_flip', { vol: 0.6 });
  }
  uiOf(o) { const v = this.views.get(o.uid); return this.S.engine.worldToUI(v ? v.g.position : V(-1, 2.6, 1)); }
  // ---- aiming by dragging a held object onto a foe
  beginAim() { const h = this.pick(); if (!h) return false; this.aiming = h.uid; audio.play('string_pluck', { vol: 0.5 }); return true; }
  aimMove(foeUid) { const v = this.views.get(this.aiming); if (!v) return; v.aimPreview = foeUid; }
  endAim(foeUid) { const v = this.views.get(this.aiming); this.aiming = null; if (!v) return; v.aimPreview = null; if (foeUid && this.S.battle.aim(v.uid, foeUid)) { audio.play('card_snap', { vol: 0.6 }); v.refresh(); } }
  // ---- the release: the string snaps, the object flies its path, the battle resolves the hit
  async fly(o, mv, foe) {
    const v = this.views.get(o.uid); if (!v) return; const S = this.S; v.flying = true; v.art = mv.art;
    const to = foe ? S.enemyPos(foe) : v.target() || V(3, 1, 0); const from = v.g.position.clone(); const path = flightPath(from, to, mv.art);
    S.scene.remove(v.str); v.tag.group.visible = false; v.mark.group.visible = false; audio.play(mv.art.falling ? 'whoosh_heavy' : 'whoosh_soft'); audio.play('string_pluck', { vol: 0.6 }); S.prof.act('cast');
    S.burst(from, 'magic', 10);
    const dur = mv.art.falling ? 0.85 : mv.art.fast ? 0.32 : 0.55; const st = { k: 0 };
    await tweens.to(st, { k: 1 }, dur, { ease: mv.art.falling ? 'linear' : 'inQuad', onUpdate: () => { v.g.position.copy(path(st.k)); v.model.rotation.x += mv.art.spin ? 0.7 : 0.25; v.model.rotation.z += 0.2; if (Math.random() < 0.7) S.glowParts.spawn({ pos: [v.g.position.x, v.g.position.y, v.g.position.z], vel: [0, 0, 0], life: 0.35, size: 30, size1: 4, color: mv.art.hot ? '#ffb04a' : mv.art.electric ? '#fff3b0' : '#cdb6f0', sprite: 'star4' }); } });
    this.remove(o);
  }
  update(dt, t) {
    if (!this.S.battle) return this.dispose();
    this.t += dt; this.acc -= dt; const refresh = this.acc <= 0; if (refresh) this.acc = 0.2; this.insp?.c3.update(dt, this.t); this.leaving?.update(dt, this.t);
    if (!this.S.hand?.drag) for (const [, ev] of this.S.enemyViews) ev.api.root.userData.hl = this.isTargeted(ev.e.uid);
    for (const v of this.views.values()) {
      if (refresh && !v.flying) v.refresh();
      if (v.aimPreview) { const e = this.S.battle.enemies.find((x) => x.uid === v.aimPreview); if (e) { const keep = v.pv; v.pv = { ...keep, target: e }; v.update(dt, this.t); v.pv = keep; continue; } }
      v.update(dt, this.t);
    }
  }
  dispose() { this.S.engine.remove(this); for (const v of this.views.values()) v.dispose(); this.views.clear(); this.S.scene?.remove(this.zone); if (this.ghostObj) this.S.scene?.remove(this.ghostObj); }
}

// presentation hooks the Battle calls (merged into BattleScene.fx())
export function heldFx(S) {
  const L = () => S.held;
  const fling = (slot, o) => { const ui = L().uiOf(o); S.hand.removeViews(slot.cards.map((c) => c.uid), { x: ui.x, y: ui.y, s: 0.2, flip: 0 }); };
  const LAWSND = { force: 'whoosh_soft', gravity: 'gravity_hum', rotation: 'spin_whoosh', heat: 'fire_ignite', spark: 'electric_zap', mass: 'stone_grind', spring: 'string_pluck', inertia: 'clockwork', lens: 'magic_sparkle', water: 'liquid_slosh' };
  return {
    async manifested(o, slot) { const v = L().add(o); fling(slot, o); audio.play('magic_shimmer'); S.prof.act('cast'); S.burst(v.g.position, 'magic', 18); if (Math.random() < 0.4) S.bark?.('player', ['Hold that thought. Literally.', 'Stay. Hover. Good apple.', 'Suspended, pending further physics.'][Math.floor(Math.random() * 3)], 1.6); await tweens.wait(0.18); },
    async manipulated(o, slot) {
      const v = L().views.get(o.uid); if (!v) return; fling(slot, o); const ids = flatten(slot.cards).map((c) => baseOf(c.id));
      for (const id of new Set(ids)) audio.play(LAWSND[id] || 'magic_sparkle', { vol: 0.7 });
      v.rebuild(); S.burst(v.g.position, ids.includes('heat') ? 'fire' : ids.includes('spark') ? 'zap' : 'magic', 14); S.prof.act('cast'); await tweens.wait(0.15);
    },
    aimed(o) { L().views.get(o.uid)?.refresh(); },
    async release(o, mv, foe) { await L().fly(o, mv, foe); },
    async fizzle(o, why) { const v = L().views.get(o.uid); if (v) S.burst(v.g.position, 'smoke', 12); audio.play('whoosh_soft'); if (why) S.bark?.('player', why, 2.2); L().remove(o); await tweens.wait(0.3); },
    async discoverPick(mv, opts) { return discoveryPick(S, mv, opts); },
    async discovered(mv) { S.toast?.(`Discovered: ${mv.name}`); },
    unheld(o) { L().remove(o); },
  };
}

// the full reading of a card for hover notes and the pick: title, USE / MERGED / SKILL paragraphs (rubric labels), flavour
export function loreLines(card, maxW = 19) {
  const lore = describeCard(card); if (!lore) return null; const maxT = Math.round(maxW * PXP) - 30;
  const lines = [[[lore.title, '#3a2410'], [lore.kind ? `  ${lore.kind}` : '', '#7a5638']]];
  for (const [label, text] of lore.lines) wrapText(`${label}: ${text}`, 'handS', maxT).forEach((l, i) => lines.push(i ? [[l, '#2a160c']] : [[label + ':', '#8a1a1c'], [l.slice(label.length + 1), '#2a160c']]));
  lines.push([[lore.flavor, '#8a6a44']]); return lines;
}
// what a placed object will do: the Move, the arithmetic, its target, and what every merged card contributes
function infoLines(pv, o, B) {
  const a = pv.mv.attack; const out = [[[pv.mv.name, '#3a2410']]];
  out.push([[a.perHit ? `${a.m} kg × ${a.v} m/s = ${a.perHit}${a.hits > 1 ? ' × ' + a.hits + ' hits' : ''}` : (a.charge ? `Zap ${a.charge}` : a.burn ? `Burn ${a.burn}` : 'No punch yet'), '#2a160c']]);
  out.push([[a.launched ? (pv.target && pv.est ? `Flies at ${pv.target.def.name}: ${pv.est.total} damage` : 'Flies at the nearest foe') : 'Not launched yet: merge Force or Motion', a.launched ? '#8a1a1c' : '#8f2a2e']]);
  const seen = new Set(); for (const c of o.comps) { if (seen.has(c.id)) continue; seen.add(c.id); const d = BASICS[c.id]; if (!d?.desc) continue; wrapText(`${d.name}: ${d.desc.skill}`, 'handS', Math.round(15 * PXP) - 30).forEach((l, i) => out.push(i ? [[l, '#4e2e1a']] : [[d.name + ':', '#1e5a5a'], [l.slice(d.name.length + 1), '#4e2e1a']])); }
  out.push([['Click it again to turn it back. Drag it onto a foe to aim.', '#8a6a44']]); return out;
}
// a discovery: three new cards fanned out above the table, pick one (it goes straight to your hand and your deck)
export function discoveryPick(S, mv, opts) {
  return new Promise((resolve) => {
    const E = S.engine, ui = E.ui.scene; const W = E.uiW, H = E.uiH; const g = new THREE.Group(); ui.add(g);
    const title = new Signboard(['A Discovery!'], { sub: mv.name, hang: 1.1 }); title.group.scale.setScalar(Math.min(1, (W * 1.1) / title.w)); uiPos(title.group, 0, H - 2.0, 7); g.add(title.group);
    const lbl = new Strip([[['Choose a new card for your deck', '#2a160c']]], { maxW: 16 }); uiPos(lbl.group, 0, -H * 0.42, 7); g.add(lbl.group);
    const cards = opts.map((id, i) => { const c = new Card3D(mkCard(id)); c.pos.snap((i - 1) * 5.6, -H - 5, 6); c.flip.set(1); c.flip.target = 0; c.target = { x: (i - 1) * 5.6 * (40 - 6) / 40, y: 0.2, z: 6, rz: (i - 1) * -0.05, s: 1.1 }; c.id = id; g.add(c.group); return c; });
    audio.play('magic_shimmer'); audio.play('card_fan'); S.prof?.act?.('cheer');
    const ray = new THREE.Raycaster(); let hover = null, done = false; const pick = () => { ray.setFromCamera(S.input.ndc, E.ui.camera); return ray.intersectObjects(cards.map((c) => c.mesh), false)[0]?.object.userData.card3d || null; };
    const eat = () => true;
    const handler = S.input.push({ modal: true, move() { const h = pick(); if (h !== hover) { hover = h; for (const c of cards) c.target = { ...c.target, s: c === h ? 1.22 : 1.1, z: c === h ? 7 : 6 }; if (h) { audio.play('ui_hover', { vol: 0.5 }); S.tooltip.show(loreLines(h.card, 15), h.target.x > 0.5 ? h.target.x - 8.5 : h.target.x + 8.5, 3.2, 10, { maxW: 15 }); } else S.tooltip.hide(); } return true; },
      click() { const h = pick(); if (!h || done) return true; done = true; audio.play('card_pick'); audio.play('chime_soft'); S.tooltip.hide();
        for (const c of cards) { if (c === h) c.target = { x: 0, y: -H - 2, z: 4, rz: 0.4, s: 0.6 }; else { c.flip.target = 1; c.target = { ...c.target, y: H + 8 }; } }
        lbl.set([[[`${BASICS[h.id]?.name || h.id} joins your deck`, '#3e6a22']]]);
        setTimeout(() => { E.remove(upd); S.input.remove(handler); ui.remove(g); resolve(h.id); }, 750); return true; },
      key: eat, down: eat, dragstart: eat, drag: eat, dragend: eat, wheel: eat });
    const upd = { update(dt, t) { for (const c of cards) c.update(dt, t); title.update(dt, null, t); lbl.update(dt, null); } }; E.add(upd);
  });
}
