// Diogenes' Barrel: the cynic sells curios fished out of his barrel, and services, and insults you for free.
// NO CARDS: new cards come only from merging (Discoveries) and from events.
import * as THREE from 'three';
import { Signboard, Paper, Tag } from '../ui3d/objects.js';
import { uiPos } from '../ui3d/craft.js';
import { prop } from '../models/lowprops.js';
import { UIScreen, tabletopWorld } from '../ui3d/widgets.js';
import { CloudButton as Button3D } from '../ui3d/instruments.js'; // buttons are soft clouds
import { textPlane, Pouch } from '../ui3d/kit.js';
import { itemChoices, upgradeCard } from '../game/run.js';
import { ITEMS } from '../game/data/items.js';
import { DeckView } from './deckview.js';
import { ItemToken, wrap } from './reward.js';
import { audio } from '../core/audio.js';
import { tweens } from '../core/tween.js';
import { vpick } from '../core/util.js';
import { BASICS } from '../game/data/cards.js';

const QUIPS = ['I am looking for an honest customer. Still looking.', 'Everything here is overpriced. Like your opinions.', 'Buy something or block my sunlight elsewhere.', 'A marionette! Finally, someone with fewer needs than me.', 'Cash only. I do not believe in credit. Or you.'];
const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.7, ...o });

export default class ShopScene extends UIScreen {
  async enter() {
    const run = (this.run = this.game.run); this.world = tabletopWorld('shop'); await this.world.ready; this.engine.setWorld(this.world.scene, this.world.camera);
    { const barrel = prop('barrel', { h: 2.8, r: 1.45, sides: 10 }); barrel.rotation.z = Math.PI / 2; barrel.position.set(-6.6, 1.3, -3); this.world.scene.add(barrel); } // Diogenes' barrel, on its side (low-poly prop kit)
    this.engine.setFx({ bloom: [0.6, 0.6, 0.75], tilt: { focus: 0.5, width: 0.22, amount: 2.5 }, grade: { warmth: 0.6, vignette: 0.55 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('shop');
    const W = this.W, H = this.H;
    this.title = new Signboard(["Diogenes' Barrel"], { sub: 'Purveyor of junk. Hater of people.', hang: 2 }); this.title.group.scale.setScalar(Math.min(1.12, W * 1.1 / this.title.w)); uiPos(this.title.group, 0, H - 1.55, 3); this.root.add(this.title.group);
    this.pouch = new Pouch(); this.pouch.group.position.set(-W + 2.6, H - 2.2, 2); this.root.add(this.pouch.group);
    this.bubble = new Paper({ font: 'hand', maxW: 11, tail: true, pin: false, kind: 'scrap', tone: 3 }); this.root.add(this.bubble.group); this.quip(vpick(QUIPS));
    this.tags = []; this.wares = []; this.removeCost = 60 + (run.flags.removals || 0) * 25; this.upCost = 80;
    // curios fished out of the barrel (the event pool), each on its pedestal with a price tag; click one to buy it
    const ids = itemChoices(run, 'event', 3);
    ids.forEach((id, i) => { const price = 115 + run.rng.int(0, 45); const x = (i - (ids.length - 1) / 2) * 5.2; const t = new ItemToken(id, { size: 2.5 }); t.group.position.set(x, 0.9, 3); this.root.add(t.group);
      const tag = new Tag(String(price), { icon: 'coin' }); uiPos(tag.group, x, -1.85, 3.2); this.root.add(tag.group); this.tags.push(tag); this.wares.push({ t, id, price, tag, x }); });
    this.rem = this.addButton(new Button3D(`Remove a card · ${this.removeCost}g`, () => this.serviceRemove(), { w: 8, h: 1.2, size: 46, color: 'red' }), -5.6, -H + 3.2, 2);
    this.up = this.addButton(new Button3D(`Upgrade a card · ${this.upCost}g`, () => this.serviceUpgrade(), { w: 8, h: 1.2, size: 46, color: 'teal' }), 4.8, -H + 3.2, 2);
    this.addButton(new Button3D('Leave', () => this.leave(), { w: 4, h: 1.2, size: 56 }), W - 3.2, -H + 1.5, 2);
  }
  quip(t) { const W = this.W, H = this.H; this.bubble.show([[[t, '#2a160c']]], -W + 1.2, H - 6.6, 4); const k = 36 / 40; this.bubble.baseScale = k; this.bubble.group.position.set((-W + 0.8 + this.bubble.w / 2) * k, (H - 4.0) * k, 4); this.bubble.kick(0.8); audio.play('paper_rustle', { vol: 0.35 }); }
  wareAt() { const hit = this.ray(this.wares.filter((w) => !w.sold).map((w) => w.t.hit))[0]?.object.userData.item; return this.wares.find((w) => w.t === hit) || null; }
  onMove() {
    const w = this.wareAt(); if (w !== this.hoverW) { if (this.hoverW) this.hoverW.t.hover = false; this.hoverW = w; if (w) { w.t.hover = true; audio.play('chime_soft', { vol: 0.45 }); const d = ITEMS[w.id];
      this.tip.show([[[d.name, '#3a2410']], ...wrap(d.text, 40).map((l) => [[l, '#2a160c']]), [[d.flavor, '#8a6a44']], [[`Price: ${w.price} gold`, '#7a4a14']]], Math.max(-this.W + 4, w.x - 4.5), 4.6, 8); } else this.tip.hide(); }
  }
  onClick() { const w = this.wareAt(); if (!w) return; this.buy(w); return true; }
  buy(w) {
    if (w.sold) return; if (this.run.gold < w.price) { audio.play('ui_error'); w.t.disp.pop?.(); this.quip('No money? A true philosopher. Still no.'); return; }
    this.run.gold -= w.price; this.run.items.push(w.id); w.sold = true; w.t.spin = 12; audio.play('coins_handful'); audio.play('magic_shimmer'); this.tip.hide();
    const j = this.game.journal; j.items[w.id] = (j.items[w.id] || 0) + 1; this.game.saveJournal();
    tweens.to(w.t.group.position, { x: -this.W + 3, y: this.H - 2.5 }, 0.8, { ease: 'inOutCubic' }).then(() => tweens.to(w.t.group.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.3)); this.root.remove(w.tag.group);
    this.quip(vpick(['Sold. Do not thank me. Thanks are for the weak.', 'Excellent. Now go away.', 'Money: the only honest object.']));
  }
  serviceRemove() {
    if (this.run.gold < this.removeCost) { audio.play('ui_error'); return; }
    this.dv = new DeckView(this.game, this.root, this.run.deck, { title: 'Choose a card to throw into the barrel', onDone: ([c]) => { if (!c) return; this.run.gold -= this.removeCost; this.run.deck = this.run.deck.filter((x) => x !== c); this.run.flags.removals = (this.run.flags.removals || 0) + 1; audio.play('paper_crumple'); this.rem.setDisabled(true); this.quip('Into the barrel. Freedom from possessions!'); } }); this.dv.open();
  }
  serviceUpgrade() {
    if (this.run.gold < this.upCost) { audio.play('ui_error'); return; }
    this.dv = new DeckView(this.game, this.root, this.run.deck, { title: 'Choose a card to improve', filter: (c) => !c.up, onDone: ([c]) => { if (!c) return; this.run.gold -= this.upCost; upgradeCard(c); audio.play('magic_sparkle'); this.up.setDisabled(true); this.quip(`There. Your ${c.name || BASICS[c.id]?.name || 'card'} is slightly less embarrassing.`); } }); this.dv.open();
  }
  leave() { if (this.leaving) return; this.leaving = true; this.game.afterNode(); }
  update(dt, t) { this.world.update(dt, t); this.updateUI(dt); const pp = this.ptr(3); this.title.update(dt, null, t); this.bubble.update(dt, null); for (const g of this.tags) g.update(dt, pp, t); for (const w of this.wares) w.t.update(dt, t); this.pouch.set(this.run.gold); this.pouch.update(dt, pp); this.dv?.update(dt, t); }
}
