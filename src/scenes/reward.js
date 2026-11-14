// Spoils: gold flies into the pouch, choose one of three cards (or skip), rare curios from elites/guardians.
import * as THREE from 'three';
import { Signboard, Strip } from '../ui3d/objects.js';
import { uiPos } from '../ui3d/craft.js';
import { UIScreen, Button3D, Panel, tabletopWorld } from '../ui3d/widgets.js';
import { Pouch } from '../ui3d/kit.js';
import { CurioDisplay, rarityOf, RARITY } from '../models/items3d.js';
import { ITEMS } from '../game/data/items.js';
import { BASICS, POWERS } from '../game/data/cards.js';
import { tweens, Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';

// a curio on display: the detailed 3D model floating over a marble pedestal (rarity aura, astral rune band, glints;
// idle spin and bob, lifts and brightens on hover, spins up when taken). Small tokens (map inventory) float bare.
const RAR_INK = { common: '#5a4a3a', uncommon: '#1e6a4a', rare: '#4e2e9e', legendary: '#8a5a08' };
export class ItemToken {
  constructor(id, { size = 2.2 } = {}) {
    this.id = id; const g = (this.group = new THREE.Group()); const ped = size >= 2;
    this.disp = new CurioDisplay(id, { size: ped ? size : size * 1.1, pedestal: ped }); const d = this.disp.group; d.position.y = -size * (ped ? 0.58 : 0.42); d.rotation.x = 0.3; g.add(d);
    this.hit = this.disp.hit; this.hit.userData.item = this; this.s = new Spring(1, 16, 0.4); this.spin = 0; this.hover = false;
  }
  update(dt, t) { this.s.target = this.hover ? 1.1 : 1; this.s.update(dt); this.group.scale.setScalar(this.s.value); if (this.spin > 1) { this.disp.pop(); this.spin = 0; } this.disp.update(dt, t, this.hover); }
  tipLines() { const d = ITEMS[this.id] || { name: this.id, text: '', flavor: '' }; const r = rarityOf(this.id); return [[[d.name, '#3a2410']], [[`${RARITY[r].name} curio`, RAR_INK[r]]], ...wrap(d.text, 46).map((l) => [[l, '#2a160c']]), [[d.flavor, '#8a6a44']]]; }
}
export function wrap(t, n) { const w = t.split(' '); const out = []; let c = ''; for (const x of w) { if ((c + ' ' + x).trim().length > n) { out.push(c.trim()); c = x; } else c += ' ' + x; } if (c.trim()) out.push(c.trim()); return out; }

export class RewardScene extends UIScreen {
  async enter(rewards, enc) {
    const run = this.game.run; this.world = tabletopWorld('study'); await this.world.ready; this.engine.setWorld(this.world.scene, this.world.camera);
    this.engine.setFx({ bloom: [0.6, 0.6, 0.75], tilt: { focus: 0.5, width: 0.22, amount: 2.5 }, grade: { warmth: 0.6, vignette: 0.55 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('event');
    const W = this.W, H = this.H;
    this.title = new Signboard([enc.kind === 'guardian' ? 'The Wilds Fall Silent' : rewards.loot ? 'Spoils of Battle' : 'Spoils of Science'], { hang: 2 }); this.title.group.scale.setScalar(Math.min(1.2, W * 1.1 / this.title.w)); uiPos(this.title.group, 0, H - 1.45, 3); this.root.add(this.title.group);
    this.pouch = new Pouch(); this.pouch.group.position.set(-W + 2.6, H - 2.2, 2); this.root.add(this.pouch.group); this.shownGold = run.gold - rewards.gold; this.pouch.set(this.shownGold);
    this.goldTag = new Strip([[[`+${rewards.gold} gold`, '#7a4a14']]], { maxW: 8 }); uiPos(this.goldTag.group, -W + 6.4, H - 4.4, 2); this.root.add(this.goldTag.group);
    tweens.run(1.2, (e) => { this.pouch.set(Math.round(this.shownGold + rewards.gold * e)); }, { delay: 0.4 }); for (let i = 0; i < 8; i++) audio.play('coin_single', { delay: 0.4 + i * 0.12, vol: 0.6, minGap: 0 });
    this.picked = false; this.items = [];
    if (rewards.loot) { // only what the foes carried: gold, and their own drops, laid out on the table and pocketed
      const lc = rewards.lootCards || [];
      this.lbl = new Strip([[[rewards.items.length || lc.length ? 'The foes carried:' : 'The foes carried only gold.', '#2a160c']]], { maxW: 16 }); uiPos(this.lbl.group, 0, 3.6, 3.5); this.root.add(this.lbl.group);
      const n = rewards.items.length; rewards.items.forEach((id, i) => {
        const t = new ItemToken(id, { size: 2.6 }); t.group.position.set((i - (n - 1) / 2) * 4.2, 0.6, 3); this.root.add(t.group); this.items.push(t);
        if (!run.items.includes(id)) run.items.push(id); const j = this.game.journal; j.items[id] = (j.items[id] || 0) + 1;
        const nm = new Strip([[[ITEMS[id]?.name || id, '#7a4a14']]], { maxW: 3.9, tacks: 1 }); uiPos(nm.group, (i - (n - 1) / 2) * 4.2, -1.9, 3.4); this.root.add(nm.group); (this.names ||= []).push(nm);
        audio.play('magic_shimmer', { delay: 0.6 + i * 0.3 });
      });
      // a card of the foe's own nature (already added to the deck): it lies face up on the table beside the curios
      lc.forEach((c, i) => { const x = (n ? this.W - 4.2 : (i - (lc.length - 1) / 2) * 4.4) - (n ? i * 3.6 : 0); this.addCard(c, x, n ? -0.2 : 0.4, { scale: 0.85, tip: cardTip(c) }); audio.play('card_flip', { delay: 0.8 + i * 0.3 }); });
      if (lc.length) { this.cardLbl = new Strip([[['A card for your deck: ', '#2a160c'], [lc.map((c) => BASICS[c.id]?.name || c.id).join(', '), '#4e2e7e']]], { maxW: 14 }); uiPos(this.cardLbl.group, n ? this.W - 6 : 0, n ? -3.2 : -2.8, 3.4); this.root.add(this.cardLbl.group); }
      this.game.saveJournal(); this.itemTaken = true; this.picked = true; this.lootMode = true;
    } else {
    const cy = rewards.items.length ? 0.2 : -0.6;
    this.lbl = new Strip(['Choose a card for your deck'], { maxW: 16 }); uiPos(this.lbl.group, 0, cy + 3.3, 3.5); this.root.add(this.lbl.group);
    rewards.cards.forEach((c, i) => {
      const x = (i - 1) * 4.6;
      this.addCard(c, x, cy, { scale: 1.0, tip: cardTip(c), onClick: (v) => this.pickCard(v, c) });
    });
    this.skip = this.addButton(new Button3D('Skip', () => this.pickCard(null), { w: 3.2, h: 1.1, size: 52, color: 'red' }), 0, cy - 3.4, 2);
    }
    if (!rewards.loot && rewards.items.length) {
      const one = rewards.items.length === 1; this.itemLbl = new Strip([[[one ? 'A rare curio!' : 'Choose ONE curio', '#4e2e7e']]], { maxW: 12 }); uiPos(this.itemLbl.group, W - 6, -H + 6.2, 3); this.root.add(this.itemLbl.group);
      rewards.items.forEach((id, i) => { const t = new ItemToken(id); t.group.position.set(W - 6 + (i - (rewards.items.length - 1) / 2) * 3, -H + 3.8, 3); this.root.add(t.group); this.items.push(t); });
      this.itemTaken = false;
    }
    this.cont = this.addButton(new Button3D('Onward', () => this.leave(), { w: 4, h: 1.3, size: 60 }), 0, -H + 1.6, 2);
    this.enc = enc;
  }
  onClick() {
    if (this.lootMode) return;
    const hit = this.ray(this.items.map((t) => t.hit))[0]?.object.userData.item; if (!hit || this.itemTaken) return;
    this.itemTaken = true; this.game.run.items.push(hit.id); audio.play('magic_shimmer'); audio.play('glass_clink'); hit.spin = 12;
    const j = this.game.journal; j.items[hit.id] = (j.items[hit.id] || 0) + 1; this.game.saveJournal();
    for (const t of this.items) if (t !== hit) tweens.to(t.group.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.4, { ease: 'inBack' });
    tweens.to(hit.group.position, { x: -this.W + 5, y: this.H - 2 }, 0.8, { ease: 'inOutCubic' }).then(() => tweens.to(hit.group.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.3));
    this.itemLbl.set([[[`${ITEMS[hit.id].name}!`, '#7a4a14']]]);
    return true;
  }
  onMove() { const hit = this.ray(this.items.map((t) => t.hit))[0]?.object.userData.item; for (const t of this.items) { const h = t === hit; if (h && !t.hover) { audio.play('chime_soft', { vol: 0.5 }); this.tip.show(t.tipLines(), Math.max(-this.W + 4, t.group.position.x - 5), t.group.position.y + 3, 8); } if (!h && t.hover) this.tip.hide(); t.hover = h; } }
  pickCard(v, c) {
    if (this.picked) return; this.picked = true;
    if (c) { this.game.run.deck.push(c); audio.play('card_flip'); audio.play('chime_soft'); }
    for (const x of this.cards) { if (x === v) { x.target = { x: -this.W + 3, y: -this.H - 4, z: 3, rz: 2, s: 0.4 }; } else { x.target = { ...x.target, y: -this.H - 8 }; x.flip.target = 1; } }
    this.skip.setDisabled(true); this.lbl.set([c ? 'Added to your deck.' : 'Skipped. Restraint is also science.']);
  }
  leave() { if (this.leaving) return; this.leaving = true; if (this.enc?.kind === 'guardian') this.game.areaComplete(); else this.game.afterNode(); }
  update(dt, t) { this.world.update(dt, t); this.updateUI(dt); const pp = this.ptr(3); this.pouch.update(dt, pp); for (const it of this.items) it.update(dt, t); this.title.update(dt, null, t); this.goldTag.update(dt, pp); this.lbl.update(dt, pp); this.itemLbl?.update(dt, pp); for (const n of this.names || []) n.update(dt, pp); }
}

export function cardTip(c) {
  if (c.type === 'power') { const d = POWERS[c.id]; return [[[d.name + ' (Power)', '#3a2410']], [[d.text.join(' '), '#2a160c']], [[d.flavor, '#8a6a44']]]; }
  if (c.type === 'move') return [[[c.name + ' (Move)', '#3a2410']], [['A permanent combination. Add more cards to it in battle.', '#2a160c']]];
  const d = BASICS[c.id]; return [[[d.name + (c.up ? '+' : '') + ' (Basic)', '#3a2410']], ...(c.up && d.upText ? d.upText : d.text).map((l) => [[l, '#2a160c']]), [[d.flavor, '#8a6a44']]];
}
