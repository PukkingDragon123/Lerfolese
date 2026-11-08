// Field Laboratory (rest site): Rest, Upgrade, Merge (fuse cards into a permanent Move) or Mutate.
import * as THREE from 'three';
import { UIScreen, Button3D, Panel, tabletopWorld } from '../ui3d/widgets.js';
import { textPlane } from '../ui3d/kit.js';
import * as P3 from '../models/props3d.js';
import { upgradeCard, mutateCard, mergeCards } from '../game/run.js';
import { DeckView } from './deckview.js';
import { computeMove, flatten } from '../game/combos.js';
import { BASICS } from '../game/data/cards.js';
import { audio } from '../core/audio.js';

export default class LabScene extends UIScreen {
  async enter() {
    const run = (this.run = this.game.run); this.world = tabletopWorld('lab'); await this.world.ready; this.engine.setWorld(this.world.scene, this.world.camera);
    const fire = P3.brazier(); fire.position.set(0, 1.0, -3.5); fire.scale.setScalar(1.6); this.world.scene.add(fire); const l = new THREE.PointLight(0xff9040, 40, 14, 2); l.position.set(0, 3, -3); this.world.scene.add(l); this.fireLight = l;
    for (const [x, k] of [[-4, 'leyden'], [4, 'pendulum']]) { const m = (await import('../models/items3d.js')).ITEM_MODELS[k](); m.position.set(x, 1.2, -4); m.scale.setScalar(1.6); this.world.scene.add(m); }
    this.engine.setFx({ bloom: [0.7, 0.6, 0.7], tilt: { focus: 0.5, width: 0.22, amount: 2.5 }, grade: { warmth: 0.7, vignette: 0.55 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('journal'); audio.setAmbSet(['campfire', 'night']);
    const W = this.W, H = this.H; const P = run.player; const heal = Math.round(P.maxHp * 0.3);
    this.title = textPlane([[['FIELD LABORATORY', '#ffe08a']], [['Choose ONE experiment before moving on', '#e8d4a2']]], { w: 20, h: 2.4, font: 'Pixelify', size: 100, weight: 700, stroke: ['#3a2410', 16], lineH: 0.95 }); this.title.position.set(0, H - 1.9, 3); this.root.add(this.title);
    this.status = textPlane([[[`Integrity ${P.hp}/${P.maxHp}`, '#f6b3a0']]], { w: 10, h: 1, font: 'Pixelify', size: 64, weight: 700, stroke: ['#1a1220', 12] }); this.status.position.set(0, H - 4.0, 3); this.root.add(this.status);
    const opts = [
      ['Rest', `Heal ${heal}. Varnish, nap, existential dread.`, 'wood', () => { P.hp = Math.min(P.maxHp, P.hp + heal); audio.play('heal'); this.finish(`Rested. Healed ${heal}.`); }],
      ['Upgrade', 'Improve one card (+).', 'teal', () => this.pickUp()],
      ['Merge', 'Fuse 2–4 cards into one permanent Move.', 'purple', () => this.pickMerge()],
      ['Mutate', 'Randomly mutate a Basic card. Risky. Fun.', 'red', () => this.pickMutate()],
    ];
    this.btns = opts.map(([l, s, c, fn], i) => this.addButton(new Button3D(l, fn, { w: 9, h: 1.6, size: 56, sub: s, color: c }), (i % 2 ? 1 : -1) * 5, 0.8 - Math.floor(i / 2) * 2.4, 2));
  }
  pickUp() { this.dv = new DeckView(this.game, this.root, this.run.deck, { title: 'Upgrade which card?', filter: (c) => !c.up, onDone: ([c]) => { upgradeCard(c); audio.play('magic_sparkle'); this.finish(`${c.name || BASICS[c.id]?.name} upgraded.`); } }); this.dv.open(); }
  pickMutate() { this.dv = new DeckView(this.game, this.root, this.run.deck, { title: 'Mutate which Basic?', filter: (c) => c.type === 'basic' && !BASICS[c.id]?.mutantOf, onDone: ([c]) => { const was = BASICS[c.id].name; const to = mutateCard(this.run, c); audio.play('magic_shimmer'); this.finish(to ? `${was} mutated into ${BASICS[to].name}!` : 'Nothing happened. Science is sometimes boring.'); } }); this.dv.open(); }
  pickMerge() {
    this.dv = new DeckView(this.game, this.root, this.run.deck, { title: 'Pick 2–4 cards to fuse (in order)', filter: (c) => c.type !== 'power', min: 2, max: 4, onDone: (cards) => {
      if (cards.length < 2) return; const mv = mergeCards(this.run, cards); const m = computeMove(flatten([mv])); audio.play('card_snap'); audio.play('eureka');
      this.game.run.onDiscover?.(m); this.finish(`Fused into ${mv.name}: ${m.attack.perHit ? m.attack.perHit + (m.attack.hits > 1 ? '×' + m.attack.hits : '') + ' damage' : 'a curious Move'}.`);
    } }); this.dv.open();
  }
  finish(text) {
    for (const b of this.btns) b.setDisabled(true); this.status.userData.setText([[[text, '#cfe07a']]]);
    this.addButton(new Button3D('Continue', () => { if (!this.leaving) { this.leaving = true; this.game.afterNode(); } }, { w: 5, h: 1.3, size: 58, color: 'teal' }), 0, -this.H + 1.7, 2);
  }
  update(dt, t) { this.world.update(dt, t); this.updateUI(dt); this.dv?.update(dt, t); this.fireLight.intensity = 40 + Math.sin(t * 9) * 6 + Math.sin(t * 23) * 3; }
}
