// Diogenes' Barrel: the cynic sells cards from a barrel and insults you for free. No curios, ever.
import * as THREE from 'three';
import * as S from '../models/sculpt.js';
import { UIScreen, Button3D, tabletopWorld } from '../ui3d/widgets.js';
import { textPlane, Pouch } from '../ui3d/kit.js';
import { cardChoices, mkCard, upgradeCard } from '../game/run.js';
import { DeckView } from './deckview.js';
import { cardTip } from './reward.js';
import { audio } from '../core/audio.js';
import { vpick } from '../core/util.js';
import { BASICS } from '../game/data/cards.js';

const QUIPS = ['I am looking for an honest customer. Still looking.', 'Everything here is overpriced. Like your opinions.', 'Buy something or block my sunlight elsewhere.', 'A marionette! Finally, someone with fewer needs than me.', 'Cash only. I do not believe in credit. Or you.'];
const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.7, ...o });

export default class ShopScene extends UIScreen {
  async enter() {
    const run = (this.run = this.game.run); this.world = tabletopWorld('shop'); await this.world.ready; this.engine.setWorld(this.world.scene, this.world.camera);
    const barrel = new THREE.Mesh(S.turn([[0.001, -1.4], [1.2, -1.4], [1.45, 0], [1.2, 1.4], [0.001, 1.4]], { sides: 10, seed: 3 }), F({ map: null, color: 0x8a5634 })); barrel.rotation.z = Math.PI / 2; barrel.position.set(-8, 1.3, -3); barrel.castShadow = true; this.world.scene.add(barrel);
    for (const x of [-1.1, 0, 1.1]) { const hoop = new THREE.Mesh(S.facet(new THREE.TorusGeometry(1.42, 0.07, 3, 10)), F({ color: 0x3a3a42, metalness: 0.6 })); hoop.rotation.y = Math.PI / 2; hoop.position.set(-8 + x, 1.3, -3); this.world.scene.add(hoop); }
    this.engine.setFx({ bloom: [0.6, 0.6, 0.75], tilt: { focus: 0.5, width: 0.22, amount: 2.5 }, grade: { warmth: 0.6, vignette: 0.55 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('shop');
    const W = this.W, H = this.H;
    this.title = textPlane([[["DIOGENES' BARREL", '#ffe08a']], [['Purveyor of cards. Hater of people.', '#e8d4a2']]], { w: 20, h: 2.4, font: 'Pixelify', size: 100, weight: 700, stroke: ['#3a2410', 16], lineH: 0.95 }); this.title.position.set(0, H - 1.9, 3); this.root.add(this.title);
    this.pouch = new Pouch(); this.pouch.group.position.set(-W + 2.6, H - 2.2, 2); this.root.add(this.pouch.group);
    this.bubble = textPlane([[[vpick(QUIPS), '#2a160c']]], { w: 14, h: 1.1, font: 'VT323', size: 52, bg: (g, w, h) => { g.fillStyle = '#f3e6c4'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 18); g.fill(); } }); this.bubble.position.set(-W + 9, H - 4.6, 3); this.root.add(this.bubble);
    const wares = cardChoices(run, 5, 0.5); this.removeCost = 60 + (run.flags.removals || 0) * 25; this.upCost = 80;
    wares.forEach((c, i) => { const price = c.type === 'power' ? 110 + run.rng.int(0, 30) : c.type === 'move' ? 80 + run.rng.int(0, 25) : (c.up ? 70 : 45) + run.rng.int(0, 20); const x = (i - 2) * 3.7; const v = this.addCard(c, x, 0.4, { scale: 0.86, tip: [...cardTip(c), [[`Price: ${price} gold`, '#7a4a14']]], onClick: (vv) => this.buy(vv, c, price) }); v.price = price; const tag = textPlane([[[`${price}g`, '#ffe08a']]], { w: 2.4, h: 0.8, font: 'Pixelify', size: 64, weight: 700, stroke: ['#3a2410', 12] }); tag.position.set(x, -2.4, 3); this.root.add(tag); v.tag = tag; });
    this.rem = this.addButton(new Button3D(`Remove a card · ${this.removeCost}g`, () => this.serviceRemove(), { w: 8, h: 1.2, size: 46, color: 'red' }), -5, -H + 3.2, 2);
    this.up = this.addButton(new Button3D(`Upgrade a card · ${this.upCost}g`, () => this.serviceUpgrade(), { w: 8, h: 1.2, size: 46, color: 'teal' }), 4, -H + 3.2, 2);
    this.addButton(new Button3D('Leave', () => this.leave(), { w: 4, h: 1.2, size: 56 }), W - 3.2, -H + 1.5, 2);
  }
  quip(t) { this.bubble.userData.setText([[[t, '#2a160c']]]); }
  buy(v, c, price) {
    if (v.sold) return; if (this.run.gold < price) { audio.play('ui_error'); this.quip('No money? A true philosopher. Still no.'); return; }
    this.run.gold -= price; this.run.deck.push(c); v.sold = true; audio.play('coins_handful'); audio.play('card_flip');
    v.target = { x: -this.W + 3, y: -this.H - 4, z: 3, rz: 2, s: 0.4 }; v.home.y = -40; this.root.remove(v.tag); this.quip(vpick(['Sold. Do not thank me. Thanks are for the weak.', 'Excellent. Now go away.', 'Money: the only honest object.']));
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
  update(dt, t) { this.world.update(dt, t); this.updateUI(dt); this.pouch.set(this.run.gold); this.pouch.update(dt); this.dv?.update(dt, t); }
}
