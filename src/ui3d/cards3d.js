// Physical 3D cards: spring motion, velocity tilt, hover lift, drag, flick, shake-to-split, stack-to-combine.
import * as THREE from 'three';
import { renderCardFace, renderCardBack } from '../gfx/cardart.js';
import { canvasTexture, UIF } from './kit.js';
import { Spring, Spring3 } from '../core/tween.js';
import { computeMove, flatten, baseOf } from '../game/combos.js';
import { BASICS } from '../game/data/cards.js';

export const CARD_W = 3.0, CARD_H = 4.2;
const texCache = new Map();
function faceTex(card, move, live = null) {
  const c = renderCardFace(card, move, live); if (!texCache.has(c)) texCache.set(c, canvasTexture(c)); return texCache.get(c);
}
let backTex = null; export function cardBackTex() { if (!backTex) backTex = canvasTexture(renderCardBack()); return backTex; }
const edgeMat = UIF({ color: new THREE.Color(0xe8d4a2).multiplyScalar(0.72), roughness: 0.8 }); // (the UI rig lifts lit faces ~1.35x: pre-darkened so the edge reads as card stock, not a white line)
const geo = new THREE.BoxGeometry(CARD_W, CARD_H, 0.045);
// Card faces show their pixel art at TRUE colour, CRISP (4-tap supersampled, so small card text stays sharp): unlit (the face texture as painted, never multiplied up by the UI rig's
// key + ambient + environment, never tone-mapped or bloomed: the UI layer is drawn after the post chain), with only a
// whisper of form: a 10% fall-off as the card turns away from the key and a faint sheen as it tilts into the light.
// .map and .color behave like a standard material's (color tints the face, e.g. cards marked to discard).
const FACE_VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }';
const FACE_FS = `uniform sampler2D map; uniform vec3 diffuse; uniform float sheen; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  // the face is usually drawn smaller than its 4x pixel-art canvas: four rotated-grid taps at a sharper mip resolve the
  // pixel text crisply instead of the soft trilinear blur
  void main(){ vec2 dx = dFdx(vUv) * 0.25, dy = dFdy(vUv) * 0.25; vec4 t = (texture2D(map, vUv + dx * 0.5 + dy * 1.5, -1.0) + texture2D(map, vUv - dx * 1.5 + dy * 0.5, -1.0) + texture2D(map, vUv - dx * 0.5 - dy * 1.5, -1.0) + texture2D(map, vUv + dx * 1.5 - dy * 0.5, -1.0)) * 0.25; if (t.a < 0.5) discard; vec3 n = normalize(vN), v = normalize(vV); vec3 L = normalize(vec3(-0.3, 0.42, 1.0));
    vec3 c = t.rgb * diffuse * (0.9 + 0.1 * max(dot(n, L), 0.0)); float sp = pow(max(dot(n, normalize(L + v)), 0.0), 70.0); c += vec3(1.0, 0.95, 0.86) * sp * sheen * (1.0 - dot(c, vec3(0.3, 0.5, 0.2)) * 0.6);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;
export function cardFaceMat(map, { sheen = 0.14 } = {}) {
  const U = { map: { value: map }, diffuse: { value: new THREE.Color(1, 1, 1) }, sheen: { value: sheen } };
  const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: FACE_VS, fragmentShader: FACE_FS, toneMapped: false }); m.name = 'cardFace';
  Object.defineProperty(m, 'map', { get: () => U.map.value, set: (v) => { U.map.value = v; } }); m.color = U.diffuse.value; return m;
}

export class Card3D {
  constructor(card) {
    this.card = card;
    this.front = cardFaceMat(faceTex(card, card.type === 'move' ? computeMove(flatten([card])) : null));
    this.back = cardFaceMat(cardBackTex(), { sheen: 0.1 });
    this.mesh = new THREE.Mesh(geo, [edgeMat, edgeMat, edgeMat, edgeMat, this.front, this.back]);
    this.mesh.castShadow = true; this.mesh.userData.card3d = this;
    this.group = new THREE.Group(); this.group.add(this.mesh);
    this.pos = new Spring3(0, -14, 0, 13, 0.62); this.rx = new Spring(0, 12, 0.5); this.ry = new Spring(0, 12, 0.5); this.rz = new Spring(0, 12, 0.5); this.sc = new Spring(1, 16, 0.5); this.flip = new Spring(0, 10, 0.6);
    this.target = { x: 0, y: -14, z: 0, rz: 0, s: 1 }; this.tilt = { x: 0, y: 0 }; this.wob = Math.random() * 10; this.dead = false;
  }
  refresh(move, live = null) { const c = this.card; const t = faceTex(c, move || (c.type === 'move' ? computeMove(flatten([c])) : null), live); if (this.front.map !== t) { this.front.map = t; this.front.needsUpdate = true; } }
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
  constructor(ui) { this.ui = ui; this.views = new Map(); this.slots = []; this.hover = null; this.drag = null; this.dropTarget = null; this.enabled = true; this.dealN = 0; this.hideAll = false; this.selected = null; }
  viewFor(card) { let v = this.views.get(card.uid); if (!v) { v = new Card3D(card); this.views.set(card.uid, v); this.ui.scene.add(v.group); } return v; }
  // sync with battle.hand (array of {uid, cards}); spawnFrom = where new cards fly in from
  sync(hand, battle, spawnFrom) {
    const live = new Set();
    this.slots = hand.map((s) => {
      const cards = s.cards.map((c) => { live.add(c.uid); const v = this.viewFor(c); if (v.isNew === undefined) { v.isNew = false; v.pos.snap(spawnFrom.x, spawnFrom.y, 1); v.flip.set(1); v.flip.target = 1; v.deal = { t: -(this.dealN++ % 10) * 0.075, from: { x: spawnFrom.x, y: spawnFrom.y } }; } return v; });
      const move = s.cards.length > 1 ? battle.moveOf(s) : null;
      cards.forEach((v, i) => { if (i === cards.length - 1 && move) v.showFace({ type: 'move', up: 0, name: move.name }, move); else v.refresh(v.card.petrified ? null : undefined, liveStats(battle, v.card)); if (v.card.petrified) v.showFace({ ...v.card, petrified: true }); });
      return { uid: s.uid, slot: s, views: cards, move };
    });
    for (const [uid, v] of this.views) if (!live.has(uid) && !v.leaving) { v.leaving = true; }
    this.dealN = 0; this.layout();
  }
  removeViews(uids, to) { for (const uid of uids) { const v = this.views.get(uid); if (!v) continue; v.leaving = true; v.target = { x: to.x, y: to.y, z: to.z ?? 2, rz: (Math.random() - 0.5) * 2, s: to.s ?? 0.5 }; v.flip.target = to.flip ?? 1; v.killAt = 0.45; } }
  layout() {
    const n = this.slots.length; const W = this.ui.W; const maxW = Math.min(W * 1.1, 21); const sp = n > 1 ? Math.min(2.75, maxW / (n - 1 + 0.001)) : 0;
    const baseY = -this.ui.H + 2.25;
    this.slots.forEach((s, i) => {
      const k = i - (n - 1) / 2; let x = k * sp; let y = baseY - k * k * 0.08; let rz = -k * 0.05; let z = i * 0.06; let sc = 0.92;
      if (this.hover && this.hover !== s && !this.drag) { const hi = this.slots.indexOf(this.hover); x += (i < hi ? -1 : 1) * Math.max(0, 1.5 - Math.abs(i - hi) * 0.35); }
      if (this.hover === s && !this.drag) { y = baseY + 3.3; rz = 0; z = 7; sc = 1.7; } // Balatro-style: the hovered card rises big and readable
      if (this.dropTarget?.slot === s) { y = baseY + 1.1; sc = 1.15; z = 4; }
      if (this.selected?.has(s.uid)) { y = baseY + 2.0; rz = 0; z = 5; } // marked to discard
      if (this.hideAll) { y = baseY - 7; }
      s.base = { x, y, z, rz, sc };
      if (this.drag?.slot === s) return;
      const marked = !!this.selected?.has(s.uid); s.views.forEach((v, j) => { const off = s.views.length - 1 - j; v.target = { x: x - off * 0.18, y: y + off * 0.38, z: z - off * 0.08, rz: rz + off * 0.06, s: sc }; v.tilt.x = 0; v.tilt.y = 0; v.front.color.setRGB(1, marked ? 0.62 : 1, marked ? 0.55 : 1); });
    });
  }
  pick(hits) { for (const h of hits) { const v = h.object.userData.card3d; if (!v) continue; const s = this.slots.find((sl) => sl.views.includes(v)); if (s) return s; } return null; }
  update(dt, t) {
    // the hovered card leans toward the pointer (a physical card held up to the light)
    if (this.hover && !this.drag) { const p = this.ui.pointerPlane?.(6); if (p) for (const v of this.hover.views) { const b = this.hover.base; v.tilt.y = Math.max(-0.4, Math.min(0.4, (p.x - b.x) * 0.16)); v.tilt.x = Math.max(-0.35, Math.min(0.35, -(p.y - (b.y + 0.4)) * 0.12)); } }
    for (const [uid, v] of this.views) {
      // dealt in an arc from the draw pile, face down, flipping face up as it lands
      if (v.deal) { const D = v.deal; D.t += dt; const tg = v.target; if (D.t < 0) { v.pos.snap(D.from.x, D.from.y, 1); } else if (D.t < 0.34) { const u = D.t / 0.34, e = 1 - (1 - u) * (1 - u); const mx = (D.from.x + tg.x) / 2, my = Math.max(D.from.y, tg.y) + 3.2; const x = (1 - e) * (1 - e) * D.from.x + 2 * (1 - e) * e * mx + e * e * tg.x, y = (1 - e) * (1 - e) * D.from.y + 2 * (1 - e) * e * my + e * e * tg.y; v.pos.snap(x, y, 2 + Math.sin(u * Math.PI) * 4); v.rz.value = (1 - e) * 1.2; if (u > 0.45) v.flip.target = 0; } else { v.deal = null; v.flip.target = 0; v.sc.kick(3); } }
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

// ---------------------------------------------------------------- StS-style live numbers for a card in hand
/** { blk|heal|kg|v: [base, now] } for one card under the battle's current modifiers (only the numbers that differ) */
export function liveStats(B, card) {
  if (!B || !card || card.type === 'power' || card.petrified) return null; const d = BASICS[card.id]; if (!d) return null; const up = card.up > 0;
  const S = (k) => (up && d.up?.[k] !== undefined ? d.up[k] : d[k]) || 0; const base = baseOf(card.id); const out = {}; const P = B.player;
  const blk = S('block'); if (blk) { let n = blk; if (P.st.corrode) n = Math.floor(n / 2); if (P.st.frail) n = Math.floor(n * 0.75); if (n !== blk) out.blk = [blk, n]; }
  const heal = S('heal'); if (heal && base === 'apple' && B.has?.('golden_apple')) out.heal = [heal, heal + 3];
  const dm = S('dm'); if (dm && B.has?.('lead_boots') && ['mass', 'dark_matter'].includes(base)) out.kg = [dm, dm * 2];
  let dv = S('dv'); if (dv) { const m = B.mods(); let n = dv; if (base === 'force') { if (m.leverForce) n *= 2; n += m.hornForce || 0; } if (base === 'gravity') n += m.gravityDv || 0; if (n !== dv) out.v = [dv, n]; }
  return Object.keys(out).length ? out : null;
}
