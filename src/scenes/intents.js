// Each foe's intent hangs above its head on a small SLATE TABLET in a brass bezel (no clouds in battle), with a mini
// preview of the move playing inside it (a sword that swings once per hit, a shield that braces, an arrow that climbs,
// a curse that shudders), the number in big floating NanoPlus digits (red: at you; blue: its Block; gold: its buffs), and
// a short counter line beneath in floating letters ("BLOCK 18 or take it"). Re-read whenever the battle refreshes a foe.
import * as THREE from 'three';
import { intentScene } from '../ui3d/thought.js';
import { FloatText } from '../ui3d/floatlabel.js';
import { Surf, pxTex, slab, frontMat, sideMat, plainMat, RAMP, PX, brass, inkHull } from '../ui3d/craft.js';
import { hash2 } from '../gfx/art/core.js';
import { sprite } from '../gfx/sprites.js';
import { Spring } from '../core/tween.js';

const _v = new THREE.Vector3();
// the tablet: a slate face (chalky blue-black, faint streaks) in a brass bezel, with a brass tab pointing at the foe
let TAB = null;
function tablet() {
  if (TAB) return TAB; const tx = (w, h, fn) => { const S = new Surf(w, h); fn(S); return pxTex(S.toCanvas()); };
  const slate = tx(Math.round(2.6 * PX), Math.round(1.25 * PX), (S) => { S.rect(0, 0, S.w, S.h, RAMP.slate, (x, y) => 2 + (hash2(x >> 1, y, 3) > 0.9 ? 1 : 0) - (hash2(x, y >> 1, 7) > 0.95 ? 1 : 0)); for (let i = 0; i < S.w; i += 7) S.line(i, 0, i + 4, S.h - 1, (x, y) => { if (hash2(x, y, 4) > 0.72) S.shift(x, y, 1); }); S.bevel(null, { lit: 1, dark: -1 }); });
  const rim = tx(Math.round(2.9 * PX), Math.round(1.55 * PX), (S) => { brass(S, 0, 0, S.w, S.h, { seed: 5, patina: 0.3 }); S.bevel(null, { lit: 2, dark: -2 }); });
  const tab = new THREE.Shape(); tab.moveTo(-0.22, 0); tab.lineTo(0.22, 0); tab.lineTo(-0.08, -0.42); tab.closePath();
  TAB = { slate: [frontMat(slate), sideMat('walnut')], rim: [frontMat(rim, { metal: 0.5 }), sideMat('brass')], slateG: slab(2.6, 1.25, 0.08, { shape: 'rect', cut: 0.05, bevel: 0.03 }), rimG: slab(2.9, 1.55, 0.12, { shape: 'rect', cut: 0.1, bevel: 0.04 }), tabG: new THREE.ExtrudeGeometry(tab, { depth: 0.08, bevelEnabled: false }), pin: plainMat('brass') };
  return TAB;
}
const iconTex = new Map();
function iconOf(name) { if (iconTex.has(name)) return iconTex.get(name); const S = new Surf(16, 16); try { S.blit(sprite(name), 0, 0); } catch { try { S.blit(sprite('question'), 0, 0); } catch { /* */ } } const t = pxTex(S.toCanvas()); iconTex.set(name, t); return t; }
const HINTS = { gaze: 'Petrifies 2 cards', steal: 'Steals a card!', acid: 'Corrodes your Block', hex: 'Hexes 2 cards to rot', devour: 'Eats your draw pile', nibble: 'Nibbles a card away', riddle: 'Weak + Vulnerable', bolt: 'Frail + Vulnerable', brood: 'Lays a brood', flee: 'Stop it before it runs!', spill: 'Wine! Heat ignites it', sprout: 'Grows heads', ward: 'A crystal ward' };

class IntentView {
  constructor() {
    this.group = new THREE.Group(); this.pivot = new THREE.Group(); this.group.add(this.pivot); this.st = new Spring(0, 12, 0.5); this.seed = Math.random() * 9; this.t = 0; this.key = ''; this.small = false;
    // the tablet: brass bezel, slate face, a brass tab pointing down-left at the foe's head; it hangs and sways a little
    const TB = tablet(); this.cloud = new THREE.Group(); this.cloud.position.set(0, 0.78, -0.18); this.pivot.add(this.cloud);
    const rimM = new THREE.Mesh(TB.rimG, TB.rim); rimM.position.z = -0.06; inkHull(rimM, 0.03); const sl = new THREE.Mesh(TB.slateG, TB.slate); sl.position.z = 0.03; const tabM = new THREE.Mesh(TB.tabG, TB.rim); tabM.position.set(-0.95, -0.72, -0.1);
    this.cloud.add(rimM, sl, tabM); for (const x of [-1.27, 1.27]) { const pn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), TB.pin); pn.position.set(x, 0.6, 0.02); this.cloud.add(pn); }
    this.icon = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, toneMapped: false })); this.icon.position.set(-0.45, 0.78, 0.05); this.pivot.add(this.icon);
    this.num = new FloatText(null, { font: 'big', align: 'center', lighten: false, depth: 0.1 }); this.num.group.position.set(0.48, 0.78, 0.1); this.pivot.add(this.num.group);
    this.hint = new FloatText(null, { font: 'body', align: 'center', lighten: false }); this.hint.group.position.set(0, -0.15, 0.1); this.pivot.add(this.hint.group);
    this.label = new FloatText(null, { font: 'tiny', align: 'center', lighten: false }); this.label.group.position.set(0.05, 1.86, 0.1); this.pivot.add(this.label.group);
    this.group.visible = false;
  }
  set(sc) {
    const key = sc ? JSON.stringify(sc) : ''; if (key === this.key) return; this.key = key; this.sc = sc;
    if (!sc) { this.st.target = 0; this.num.hide(); this.hint.hide(); this.label.hide(); return; }
    this.icon.material.map = iconOf(sc.icon); this.icon.material.needsUpdate = true; this.kind = sc.kind;
    const col = sc.who === 'you' ? '#ff7a62' : sc.kind === 'block' ? '#8ac8ff' : '#ffd060'; this.num.set([[sc.num || (sc.kind === 'block' ? '' : '!'), col]]); this.num.show();
    this.hint.set([[sc.hint || '', sc.who === 'you' ? '#ffc8b8' : '#c8e0ff']]); this.hint.hide(); // (essentials only: the number and a short label)
    this.label.set([[(sc.label || '').toUpperCase(), '#e8dcc8']]); if (sc.label && !this.small) this.label.show(); else this.label.hide();
    this.group.visible = true; this.st.target = 1; if (this.st.value < 0.2) this.st.value = 0.2; this.st.kick(4);
  }
  update(dt, t) {
    this.t += dt; this.st.update(dt); const s = Math.max(0.001, this.st.value); this.pivot.scale.setScalar(s); if (this.st.target === 0 && s < 0.03) this.group.visible = false;
    this.pivot.position.y = Math.sin(t * 1.7 + this.seed) * 0.06; this.cloud.rotation.z = Math.sin(t * 0.9 + this.seed) * 0.025; this.cloud.rotation.x = Math.sin(t * 0.7 + this.seed * 2) * 0.04;
    // the mini preview of the move
    const sc = this.sc; const I = this.icon; I.rotation.set(0, 0, 0); I.position.set(-0.45, 0.78, 0.05); I.scale.setScalar(1);
    if (sc) {
      const hits = Math.max(1, sc.hits || 1); const cyc = (this.t % 1.8) / 1.8;
      if (sc.kind === 'attack') { const ph = (cyc * hits) % 1, strike = cyc < 0.85 ? Math.sin(Math.min(1, ph * 3) * Math.PI) : 0; I.rotation.z = 0.5 - strike * 1.4; I.position.x = -0.45 + strike * 0.18; if (strike > 0.95 && !this.hitPop) { this.hitPop = true; this.num.pop.kick(4); } if (strike < 0.5) this.hitPop = false; }
      else if (sc.kind === 'block') { I.scale.setScalar(1 + Math.max(0, Math.sin(this.t * 3.2)) * 0.14); I.rotation.z = Math.sin(this.t * 1.6) * 0.06; }
      else if (sc.kind === 'buff') { const u = (this.t % 1.2) / 1.2; I.position.y = 0.6 + u * 0.4; I.material.opacity = 1; I.scale.setScalar(0.9 + Math.sin(u * Math.PI) * 0.15); }
      else if (sc.kind === 'debuff') { I.rotation.z = Math.sin(this.t * 22) * 0.12 * (Math.sin(this.t * 2.2) > 0.3 ? 1 : 0.2); I.position.y = 0.78 + Math.sin(this.t * 3) * 0.05; }
      else { I.rotation.z = this.t * 1.8; }
    }
    this.num.update(dt); this.hint.update(dt); this.label.update(dt);
  }
  dispose() { this.num.dispose(); this.hint.dispose(); this.label.dispose(); this.icon.material.dispose(); }
}

export class IntentLayer {
  constructor(S) { this.S = S; this.bubbles = new Map(); S.engine.add(this); }
  refresh(e) {
    const S = this.S; if (!S.ui?.root) return; let b = this.bubbles.get(e.uid);
    if (!b) { b = new IntentView(); S.ui.root.add(b.group); this.bubbles.set(e.uid, b); }
    b.small = !!e.def.isHead || !!e.def.minion; const it = e.intent; let sc = e.alive && !S.battle?.over && it ? intentScene(e, it, S.battle) : null;
    if (sc) { const atk = it.kind === 'attack' || (it.dmg && it.kind !== 'block'); const val = atk ? Math.max(0, S.battle.attackValue(e, it.dmg || 0) - (e.st.shoved || 0)) : 0; const hits = it.dmg ? it.hits || 1 : 1;
      sc = { ...sc, kind: atk ? 'attack' : it.kind, hits, hint: atk ? `BLOCK ${val * hits} or take it${HINTS[it.id] ? ' · ' + HINTS[it.id] : ''}` : HINTS[it.id] || sc.hint }; }
    b.set(sc);
  }
  update(dt, t) {
    const S = this.S; if (!S.battle) return this.dispose(); const hide = S.dilemmaOn || S.choosing;
    for (const [uid, b] of this.bubbles) {
      const v = S.enemyViews.get(uid); if (!v || !v.e.alive || hide) { if (!hide) b.set(null); b.group.visible = !hide && b.group.visible; b.update(dt, t); continue; }
      _v.copy(v.api.root.position); _v.y += v.e.def.isHead ? 0.9 : v.h + 0.25; const p = S.engine.worldToUI(_v);
      const z = 4 + (b.small ? 0 : 0.3), k = (40 - z) / 40, s = b.small ? 0.85 : 1.25;
      b.group.position.set((p.x + (b.small ? 0.2 : 0.75)) * k, (p.y + 0.35) * k, z); b.group.scale.setScalar(k * s);
      if (b.sc && !hide) b.group.visible = true; b.update(dt, t);
    }
  }
  dispose() { this.S.engine.remove(this); for (const b of this.bubbles.values()) { b.group.parent?.remove(b.group); b.dispose(); } this.bubbles.clear(); }
}
