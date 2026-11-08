// Spoils: gold flies into the pouch, choose one of three cards (or skip), rare curios from elites/guardians.
import * as THREE from 'three';
import { UIScreen, Button3D, Panel, tabletopWorld } from '../ui3d/widgets.js';
import { textPlane, Pouch, canvasTexture, UIF } from '../ui3d/kit.js';
import { itemIcon } from '../models/items3d.js';
import { ITEMS } from '../game/data/items.js';
import { BASICS, POWERS } from '../game/data/cards.js';
import { tweens, Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import * as S from '../models/sculpt.js';

export class ItemToken {
  constructor(id, { size = 2.2 } = {}) {
    this.id = id; const g = (this.group = new THREE.Group());
    const disc = new THREE.Mesh(S.facet(new THREE.CylinderGeometry(size * 0.5, size * 0.52, 0.22, 12)), UIF({ color: 0xd9a64a, metalness: 0.85, roughness: 0.3 })); disc.rotation.x = Math.PI / 2; disc.castShadow = true; g.add(disc);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(size * 0.43, 12), UIF({ color: 0x22183f, roughness: 0.6 })); inner.position.z = 0.12; g.add(inner);
    const tex = canvasTexture(itemIcon(id)); tex.magFilter = THREE.NearestFilter;
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); icon.position.z = 0.2; g.add(icon);
    this.hit = disc; disc.userData.item = this; this.s = new Spring(1, 16, 0.4); this.spin = 0; this.hover = false;
  }
  update(dt, t) { this.s.target = this.hover ? 1.18 : 1; this.s.update(dt); this.group.scale.setScalar(this.s.value); this.group.rotation.y = Math.sin(t * 1.3 + this.id.length) * 0.25 + this.spin; this.spin *= 0.92; this.group.position.y += Math.sin(t * 2 + this.id.length) * 0.002; }
  tipLines() { const d = ITEMS[this.id]; return [[[d.name, '#3a2410']], ...wrap(d.text, 46).map((l) => [[l, '#2a160c']]), [[d.flavor, '#8a6a44']]]; }
}
export function wrap(t, n) { const w = t.split(' '); const out = []; let c = ''; for (const x of w) { if ((c + ' ' + x).trim().length > n) { out.push(c.trim()); c = x; } else c += ' ' + x; } if (c.trim()) out.push(c.trim()); return out; }

export class RewardScene extends UIScreen {
  async enter(rewards, enc) {
    const run = this.game.run; this.world = tabletopWorld('study'); this.engine.setWorld(this.world.scene, this.world.camera);
    this.engine.setFx({ bloom: [0.6, 0.6, 0.75], tilt: { focus: 0.5, width: 0.22, amount: 2.5 }, grade: { warmth: 0.6, vignette: 0.55 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('event');
    const W = this.W, H = this.H;
    this.title = textPlane([[[enc.kind === 'guardian' ? 'THE WILDS FALL SILENT' : 'SPOILS OF SCIENCE', '#ffe08a']]], { w: 22, h: 2, font: 'Pixelify', size: 130, weight: 700, stroke: ['#3a2410', 20] }); this.title.position.set(0, H - 1.8, 3); this.root.add(this.title);
    this.pouch = new Pouch(); this.pouch.group.position.set(-W + 2.6, H - 2.2, 2); this.root.add(this.pouch.group); this.shownGold = run.gold - rewards.gold; this.pouch.set(this.shownGold);
    const goldTag = textPlane([[[`+${rewards.gold} gold`, '#ffe08a']]], { w: 6, h: 1, font: 'Pixelify', size: 70, weight: 700, stroke: ['#3a2410', 12] }); goldTag.position.set(-W + 8, H - 2.2, 2); this.root.add(goldTag);
    tweens.run(1.2, (e) => { this.pouch.set(Math.round(this.shownGold + rewards.gold * e)); }, { delay: 0.4 }); for (let i = 0; i < 8; i++) audio.play('coin_single', { delay: 0.4 + i * 0.12, vol: 0.6, minGap: 0 });
    this.picked = false;
    const cy = rewards.items.length ? 0.2 : -0.6;
    this.lbl = textPlane([[['Choose a card for your deck', '#f3e6c4']]], { w: 16, h: 1, font: 'VT323', size: 70, stroke: ['#1a1220', 10] }); this.lbl.position.set(0, cy + 3.6, 3); this.root.add(this.lbl);
    rewards.cards.forEach((c, i) => {
      const x = (i - 1) * 4.6;
      this.addCard(c, x, cy, { scale: 1.0, tip: cardTip(c), onClick: (v) => this.pickCard(v, c) });
    });
    this.skip = this.addButton(new Button3D('Skip', () => this.pickCard(null), { w: 3.2, h: 1.1, size: 52, color: 'red' }), 0, cy - 3.4, 2);
    this.items = [];
    if (rewards.items.length) {
      const one = rewards.items.length === 1; this.itemLbl = textPlane([[[one ? 'A rare curio!' : 'Choose ONE curio', '#cdb6f0']]], { w: 12, h: 1, font: 'VT323', size: 64, stroke: ['#1a1220', 10] }); this.itemLbl.position.set(W - 6, -H + 6.4, 3); this.root.add(this.itemLbl);
      rewards.items.forEach((id, i) => { const t = new ItemToken(id); t.group.position.set(W - 6 + (i - (rewards.items.length - 1) / 2) * 3, -H + 3.8, 3); this.root.add(t.group); this.items.push(t); });
      this.itemTaken = false;
    }
    this.cont = this.addButton(new Button3D('Onward', () => this.leave(), { w: 4, h: 1.3, size: 60 }), 0, -H + 1.6, 2);
    return new Promise((r) => (this.done = r));
  }
  onClick() {
    const hit = this.ray(this.items.map((t) => t.hit))[0]?.object.userData.item; if (!hit || this.itemTaken) return;
    this.itemTaken = true; this.game.run.items.push(hit.id); audio.play('magic_shimmer'); audio.play('glass_clink'); hit.spin = 12;
    const j = this.game.journal; j.items[hit.id] = (j.items[hit.id] || 0) + 1; this.game.saveJournal();
    for (const t of this.items) if (t !== hit) tweens.to(t.group.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.4, { ease: 'inBack' });
    tweens.to(hit.group.position, { x: -this.W + 5, y: this.H - 2 }, 0.8, { ease: 'inOutCubic' }).then(() => tweens.to(hit.group.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.3));
    this.itemLbl.userData.setText([[[`${ITEMS[hit.id].name}!`, '#ffe08a']]]);
    return true;
  }
  onMove() { const hit = this.ray(this.items.map((t) => t.hit))[0]?.object.userData.item; for (const t of this.items) { const h = t === hit; if (h && !t.hover) { audio.play('chime_soft', { vol: 0.5 }); this.tip.show(t.tipLines(), Math.max(-this.W + 4, t.group.position.x - 5), t.group.position.y + 3, 8); } if (!h && t.hover) this.tip.hide(); t.hover = h; } }
  pickCard(v, c) {
    if (this.picked) return; this.picked = true;
    if (c) { this.game.run.deck.push(c); audio.play('card_flip'); audio.play('chime_soft'); }
    for (const x of this.cards) { if (x === v) { x.target = { x: -this.W + 3, y: -this.H - 4, z: 3, rz: 2, s: 0.4 }; } else { x.target = { ...x.target, y: -this.H - 8 }; x.flip.target = 1; } }
    this.skip.setDisabled(true); this.lbl.userData.setText([[[c ? 'Added to your deck.' : 'Skipped. Restraint is also science.', '#f3e6c4']]]);
  }
  leave() { if (this.leaving) return; this.leaving = true; this.done?.(); this.game.afterNode(); }
  update(dt, t) { this.world.update(dt, t); this.updateUI(dt); this.pouch.update(dt); for (const it of this.items) it.update(dt, t); this.title.position.y = this.H - 1.8 + Math.sin(t * 1.5) * 0.1; }
}

export function cardTip(c) {
  if (c.type === 'power') { const d = POWERS[c.id]; return [[[d.name + ' (Power)', '#3a2410']], [[d.text.join(' '), '#2a160c']], [[d.flavor, '#8a6a44']]]; }
  if (c.type === 'move') return [[[c.name + ' (Move)', '#3a2410']], [['A permanent combination. Add more cards to it in battle.', '#2a160c']]];
  const d = BASICS[c.id]; return [[[d.name + (c.up ? '+' : '') + ' (Basic)', '#3a2410']], ...(c.up && d.upText ? d.upText : d.text).map((l) => [[l, '#2a160c']]), [[d.flavor, '#8a6a44']]];
}
