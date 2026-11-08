// Physical 3D cards: spring motion, velocity tilt, hover lift, drag, flick, shake-to-split, stack-to-combine.
import * as THREE from 'three';
import { renderCardFace, renderCardBack } from '../gfx/cardart.js';
import { canvasTexture, UIF } from './kit.js';
import { Spring, Spring3 } from '../core/tween.js';
import { computeMove, flatten } from '../game/combos.js';

export const CARD_W = 3.0, CARD_H = 4.2;
const texCache = new Map();
function faceTex(card, move) {
  const c = renderCardFace(card, move); if (!texCache.has(c)) texCache.set(c, canvasTexture(c)); return texCache.get(c);
}
let backTex = null; export function cardBackTex() { if (!backTex) backTex = canvasTexture(renderCardBack()); return backTex; }
const edgeMat = UIF({ color: 0xe8d4a2, roughness: 0.8 });
const geo = new THREE.BoxGeometry(CARD_W, CARD_H, 0.045);

export class Card3D {
  constructor(card) {
    this.card = card;
    this.front = new THREE.MeshStandardMaterial({ map: faceTex(card, card.type === 'move' ? computeMove(flatten([card])) : null), roughness: 0.42, metalness: 0.05, transparent: true, alphaTest: 0.5, toneMapped: false });
    this.back = new THREE.MeshStandardMaterial({ map: cardBackTex(), roughness: 0.5, transparent: true, alphaTest: 0.5, toneMapped: false });
    this.mesh = new THREE.Mesh(geo, [edgeMat, edgeMat, edgeMat, edgeMat, this.front, this.back]);
    this.mesh.castShadow = true; this.mesh.userData.card3d = this;
    this.group = new THREE.Group(); this.group.add(this.mesh);
    this.pos = new Spring3(0, -14, 0, 13, 0.62); this.rx = new Spring(0, 12, 0.5); this.ry = new Spring(0, 12, 0.5); this.rz = new Spring(0, 12, 0.5); this.sc = new Spring(1, 16, 0.5); this.flip = new Spring(0, 10, 0.6);
    this.target = { x: 0, y: -14, z: 0, rz: 0, s: 1 }; this.tilt = { x: 0, y: 0 }; this.wob = Math.random() * 10; this.dead = false;
  }
  refresh(move) { const c = this.card; const t = faceTex(c, move || (c.type === 'move' ? computeMove(flatten([c])) : null)); if (this.front.map !== t) { this.front.map = t; this.front.needsUpdate = true; } }
  showFace(card, move) { const t = faceTex(card, move); if (this.front.map !== t) { this.front.map = t; this.front.needsUpdate = true; } }
  update(dt, t) {
    this.pos.setTarget(this.target.x, this.target.y, this.target.z); this.pos.update(dt);
    const vx = this.pos.vx, vy = this.pos.vy;
    this.rx.target = Math.max(-0.35, Math.min(0.35, vy * 0.012)) + this.tilt.x; this.ry.target = Math.max(-0.35, Math.min(0.35, -vx * 0.012)) + this.tilt.y;
    this.rz.target = this.target.rz + Math.max(-0.4, Math.min(0.4, -vx * 0.01));
    this.sc.target = this.target.s; for (const s of [this.rx, this.ry, this.rz, this.sc, this.flip]) s.update(dt);
    this.group.position.set(this.pos.x.value, this.pos.y.value, this.pos.z.value);
    this.group.rotation.set(this.rx.value + Math.sin(t * 1.3 + this.wob) * 0.015, this.ry.value + this.flip.value * Math.PI, this.rz.value + Math.sin(t * 0.9 + this.wob) * 0.01);
    this.group.scale.setScalar(this.sc.value);
  }
}

// A hand of slots. Each slot = one Card3D per card; stacks show the combined Move on top.
export class HandView {
  constructor(ui) { this.ui = ui; this.views = new Map(); this.slots = []; this.hover = null; this.drag = null; this.dropTarget = null; this.enabled = true; }
  viewFor(card) { let v = this.views.get(card.uid); if (!v) { v = new Card3D(card); this.views.set(card.uid, v); this.ui.scene.add(v.group); } return v; }
  // sync with battle.hand (array of {uid, cards}); spawnFrom = where new cards fly in from
  sync(hand, battle, spawnFrom) {
    const live = new Set();
    this.slots = hand.map((s) => {
      const cards = s.cards.map((c) => { live.add(c.uid); const v = this.viewFor(c); if (v.isNew === undefined) { v.isNew = false; v.pos.snap(spawnFrom.x, spawnFrom.y, 1); v.flip.set(1); v.flip.target = 0; } return v; });
      const move = s.cards.length > 1 ? battle.moveOf(s) : null;
      cards.forEach((v, i) => { if (i === cards.length - 1 && move) v.showFace({ type: 'move', up: 0, name: move.name }, move); else v.refresh(v.card.petrified ? null : undefined); if (v.card.petrified) v.showFace({ ...v.card, petrified: true }); });
      return { uid: s.uid, slot: s, views: cards, move };
    });
    for (const [uid, v] of this.views) if (!live.has(uid) && !v.leaving) { v.leaving = true; }
    this.layout();
  }
  removeViews(uids, to) { for (const uid of uids) { const v = this.views.get(uid); if (!v) continue; v.leaving = true; v.target = { x: to.x, y: to.y, z: to.z ?? 2, rz: (Math.random() - 0.5) * 2, s: to.s ?? 0.5 }; v.flip.target = to.flip ?? 1; v.killAt = 0.45; } }
  layout() {
    const n = this.slots.length; const W = this.ui.W; const maxW = Math.min(W * 1.1, 21); const sp = n > 1 ? Math.min(2.75, maxW / (n - 1 + 0.001)) : 0;
    const baseY = -this.ui.H + 2.25;
    this.slots.forEach((s, i) => {
      const k = i - (n - 1) / 2; let x = k * sp; let y = baseY - k * k * 0.07; let rz = -k * 0.045; let z = i * 0.06; let sc = 0.84;
      if (this.hover && this.hover !== s && !this.drag) { const hi = this.slots.indexOf(this.hover); x += (i < hi ? -1 : 1) * Math.max(0, 1.0 - Math.abs(i - hi) * 0.3); }
      if (this.hover === s && !this.drag) { y = baseY + 2.2; rz = 0; z = 6; sc = 1.3; }
      if (this.dropTarget?.slot === s) { y = baseY + 1.1; sc = 1.15; z = 4; }
      s.base = { x, y, z, rz, sc };
      if (this.drag?.slot === s) return;
      s.views.forEach((v, j) => { const off = s.views.length - 1 - j; v.target = { x: x - off * 0.18, y: y + off * 0.38, z: z - off * 0.08, rz: rz + off * 0.06, s: sc }; v.tilt.x = 0; v.tilt.y = 0; });
    });
  }
  pick(hits) { for (const h of hits) { const v = h.object.userData.card3d; if (!v) continue; const s = this.slots.find((sl) => sl.views.includes(v)); if (s) return s; } return null; }
  update(dt, t) {
    for (const [uid, v] of this.views) {
      v.update(dt, t);
      if (v.killAt != null) { v.killAt -= dt; if (v.killAt <= 0) { this.ui.scene.remove(v.group); this.views.delete(uid); } }
      else if (v.leaving && !this.slots.some((s) => s.views.includes(v))) { v.killAt = 0.5; v.target = { x: v.target.x, y: -this.ui.H - 6, z: 0, rz: 0, s: 0.6 }; }
    }
    if (this.drag) {
      const d = this.drag; const p = this.ui.pointerPlane(4);
      d.slot.views.forEach((v, j) => { const off = d.slot.views.length - 1 - j; v.target = { x: p.x - off * 0.18, y: p.y + off * 0.38 - 0.4, z: 9 + j * 0.05, rz: 0, s: 1.12 }; });
    }
  }
}
