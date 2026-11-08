// The miniature Mythical Wilderness: a hand-built diorama on a display plinth. Grab to rotate, wheel to zoom,
// tiny animated sheep, birds, dancing satyrs, a labyrinth, a marsh, and your little marionette hopping along.
import * as THREE from 'three';
import { BattleHUD } from '../ui3d/hud.js';
import { Strip } from '../ui3d/objects.js';
import { Panel } from '../ui3d/widgets.js';
import { uiPos } from '../ui3d/craft.js';
import { roman } from '../core/util.js';
import * as S from '../models/sculpt.js';
import { UIScreen, Button3D } from '../ui3d/widgets.js';
import { textPlane, Pouch, UIF } from '../ui3d/kit.js';
import { PROPS } from '../models/world.js';
import { MapSheet, sheetY } from './mapsheet.js';
import { createProfessor } from '../models/professor.js';
import { createCreature } from '../models/creatures.js';
import { reachable } from '../game/run.js';
import { ItemToken } from './reward.js';
import { Particles } from '../gfx/particles.js';
import { Critters } from '../gfx/critters.js';
import { standee, Animated, faceCamera } from '../ui3d/standee.js';
import { makeNoise } from '../gfx/pixel.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { tweens, Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { mulberry32, vrange, vpick, clamp } from '../core/util.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.85, ...o });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
const NODE_INFO = {
  battle: ['Skirmish', 'Local wildlife with opinions.'], elite: ['ELITE', 'Something big. Drops a rare curio.'], event: ['Curiosity', 'An encounter. Bring your science.'],
  shop: ["Diogenes' Barrel", 'Cards, removals, upgrades. No curios.'], lab: ['Field Laboratory', 'Rest, upgrade, merge or mutate cards.'], guardian: ['GUARDIAN OF THE WILDS', 'The gate to the Trojan War.'],
};

export class MapScene extends UIScreen {
  async enter(first) {
    const run = this.game.run; this.run = run; this.map = run.map;
    this.buildWorld(); this.engine.setWorld(this.scene, this.camera);
    this.engine.setFx({ bloom: [0.55, 0.6, 0.8], tilt: { focus: 0.5, width: 0.34, feather: 0.3, amount: 1.1, top: 1.0, bottom: 0.5 }, grade: { sat: 1.12, warmth: 0.3, vignette: 0.45 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('map'); audio.setAmbSet(['wilderness', 'wind']);
    this.buildHUD();
    const cur = run.pos ? this.map.nodes[run.pos] : null;
    this.focus = new THREE.Vector3(cur ? cur.x : 0, 0, cur ? cur.z - 3 : -2); this.yaw = new Spring(0.0, 6, 0.8); this.pitch = new Spring(1.02, 6, 0.8); this.dist = new Spring(16.5, 6, 0.8); this.fx = new Spring(this.focus.x, 4, 0.9); this.fz = new Spring(this.focus.z, 4, 0.9);
    if (first) { this.dist.value = 40; this.pitch.value = 1.3; this.fz.value = -14; this.game.journal.seenIntro || this.story(); }
    this.refreshNodes();
  }
  story() {
    const lines = ['In 1687 a man published the laws of motion.', 'In 1688 the gods read them. They did not care for them.', 'Humanity had found the source code of the universe,', 'so the gods turned it off and on again. Forever.', 'One mind remembers every loop: Sir Isaac Plumb,', 'natural philosopher, deceased, still taking notes.', 'His body is gone. His marionette is not.'];
    const st = (this.storyPanel = new Panel('The Loop', lines, { w: Math.min(17, this.W * 1.7), h: 9, titleColor: '#5a1a22' })); uiPos(st.group, 0, 0.6, 9); this.root.add(st.group); audio.play('paper_rustle');
    tweens.wait(8).then(() => { st.s.target = 0; audio.play('paper_rustle', { vol: 0.5 }); return tweens.wait(0.7); }).then(() => { this.root.remove(st.group); this.storyPanel = null; });
    this.game.journal.seenIntro = true; this.game.saveJournal();
  }

  // ------------------------------------------------------------ diorama
  buildWorld() {
    // the parchment map sheet with its living layer (models/../scenes/mapsheet.js): scene, camera, lights, nodes, routes, VFX
    const sheet = (this.sheet = new MapSheet({ engine: this.engine, run: this.run, map: this.map }));
    this.scene = sheet.scene; this.camera = sheet.camera; this.world = sheet.world; this.bounds = sheet.bounds; this.heightAt = sheetY;
    this.critters = sheet.critters; this.party = []; this.sheep = []; this.birds = [];
    this.nodeViews = sheet.nodeViews; for (const nd of Object.values(this.map.nodes)) this.addNode(nd);
    this.buildPaths();
    // player marionette
    this.pawn = createProfessor(); this.pawn.root.scale.setScalar(0.3); this.world.add(this.pawn.root);
    const cur = this.run.pos ? this.map.nodes[this.run.pos] : null; const sp0 = cur || { x: 0, z: 1.6 };
    this.pawn.root.position.set(sp0.x, this.heightAt(sp0.x, sp0.z + (cur ? 0.55 : 0)) + 0.02, sp0.z + (cur ? 0.55 : 0)); this.pawnHop = 0;
  }
  addNode(nd) { return this.sheet.addNode(nd); }
  buildPaths() { this.sheet.buildPaths(this.run); }
  refreshNodes() { const reach = new Set(reachable(this.run)); this.reach = reach; this.sheet.refresh(reach, this.run); }

  // ------------------------------------------------------------ HUD
  buildHUD() {
    const W = this.W, H = this.H; const r = this.run;
    this.runHud = new BattleHUD({ mode: 'map', sub: `LOOP ${roman(r.loop)} &middot; FLOOR ${Math.max(0, r.floor + 1)}/${this.map.rows}` }); this.runHud.setVitals(r.player.hp, r.player.maxHp, 0, r.gold);
    this.items = r.items.map((id, i) => { const t = new ItemToken(id, { size: 1.5 }); t.group.position.set(-W + 1.6 + i * 1.7, H - 6.7, 2); this.root.add(t.group); return t; });
    this.addButton(new Button3D('Journal', () => this.openJournal(), { w: 3.6, h: 1.1, size: 50, color: 'purple' }), W - 3.2, H - 4.4, 2);
    this.addButton(new Button3D(`Deck (${r.deck.length})`, () => this.openDeck(), { w: 3.6, h: 1.1, size: 46 }), W - 3.2, H - 5.8, 2);
    this.addButton(new Button3D('Menu', () => this.game.toMenu(), { w: 3.6, h: 1.1, size: 50, color: 'red' }), W - 3.2, H - 7.2, 2);
    this.hint = new Strip(['Drag to rotate · scroll to zoom · click a lit marker to travel'], { maxW: 22, font: 'handS', tone: 3 }); uiPos(this.hint.group, 0, -H + 0.8, 2); this.root.add(this.hint.group);
  }
  async openJournal() { const { Journal } = await import('./journal.js'); if (!this.journal) { this.journal = new Journal(this.game, this.root); } this.journal.open(); }
  async openDeck() { const { DeckView } = await import('./deckview.js'); this.deckView = new DeckView(this.game, this.root, this.run.deck); this.deckView.open(); }

  // ------------------------------------------------------------ input
  onDragStart() { if (this.journal?.isOpen || this.deckView?.isOpen) return; this.dragging = true; audio.play('wood_creak', { vol: 0.4 }); return true; }
  onDrag() { if (!this.dragging) return; const y = this.input.y; this.fz.target = clamp(this.fz.target - (y - (this._dragY ?? y)) * 0.034, -24, -2.6); this._dragY = y; }
  onDragEnd() { this.dragging = false; this._dragY = null; }
  onWheel(e) { this.fz.target = clamp(this.fz.target + e.dy * 0.012, -24, -2.6); }
  onPinch(e) { this.dist.target = clamp(this.dist.target / e.scale, 11, 22); }
  onKey(e) { if (e.code === 'KeyJ') this.openJournal(); if (e.code === 'ArrowUp') this.fz.target -= 3; if (e.code === 'ArrowDown') this.fz.target += 3; }
  rayNodes() { return this.sheet.pick(this.input.ndc); }
  onMove() {
    if (this.journal?.isOpen || this.deckView?.isOpen) return;
    const nd = this.rayNodes(); if (nd !== this.hoverNode) { this.hoverNode = nd; this.sheet?.hover(nd); if (nd) { const [t, d] = NODE_INFO[nd.type]; audio.play('ui_hover', { vol: 0.4 }); this.tip.show([[[t, nd.type === 'elite' || nd.type === 'guardian' ? '#8f2a2e' : '#3a2410']], [[d, '#2a160c']], [[this.reach.has(nd.id) ? 'Click to travel here.' : 'Not reachable yet.', this.reach.has(nd.id) ? '#2d6e6a' : '#8a6a44']]], 0, -this.H + 3.5, 8); } else this.tip.hide(); }
    // pan the view towards the pointer edges
  }
  onClick() {
    if (this.journal?.isOpen || this.deckView?.isOpen || this.travelling) return;
    const nd = this.rayNodes(); if (!nd) return; if (!this.reach.has(nd.id)) { audio.play('ui_error'); return; }
    this.travel(nd); return true;
  }
  async travel(nd) {
    this.travelling = true; audio.play('pin'); this.tip.hide();
    (this.run.path ||= []).push(nd.id);
    const from = this.pawn.root.position.clone(); const to = new THREE.Vector3(nd.x, this.heightAt(nd.x, nd.z + 0.55) + 0.02, nd.z + 0.55);
    this.fx.target = nd.x; this.fz.target = nd.z - 2; const hops = Math.max(3, Math.round(from.distanceTo(to) / 0.7)); const o = { k: 0 }; this.sheet.trail({ x: from.x, z: from.z }, nd, hops * 0.18);
    for (let i = 0; i < hops; i++) audio.play('wood_knock', { delay: i * 0.18, vol: 0.4, minGap: 0 });
    await tweens.to(o, { k: 1 }, hops * 0.18, { ease: 'inOutSine', onUpdate: () => { this.pawn.root.position.lerpVectors(from, to, o.k); this.pawn.root.position.y += Math.abs(Math.sin(o.k * Math.PI * hops)) * 0.4; this.pawn.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); } });
    const v = this.nodeViews.get(nd.id); v.s.kick(6); await tweens.wait(0.35);
    this.dist.target = 6; this.pitch.target = 0.7; audio.play('transition_whoosh'); await tweens.wait(0.5);
    this.game.enterNode(nd.id);
  }

  update(dt, t) {
    // parchment map: camera scroll, living layer, node animation, VFX (mapsheet.js)
    for (const sp of [this.pitch, this.dist, this.fz]) sp.update(dt);
    this.sheet.update(dt, t, { fz: this.fz.value, dist: this.dist.value, pitch: this.pitch.value, ndc: this.input.ndc }); this.pawn.update(dt);
    this.updateUI(dt); for (const it of this.items) it.update(dt, t); this.hint.update(dt, this.ptr(2)); this.storyPanel?.update(dt, null);
    this.journal?.update(dt, t); this.deckView?.update(dt, t);
  }
  dispose() { super.dispose(); this.runHud?.dispose(); }
}

function vrangeR(rnd, a, b) { return a + (b - a) * rnd(); }
function hut(rnd) { const g = new THREE.Group(); mk(S.turn([[0.001, 0], [0.5, 0], [0.5, 0.5], [0.001, 0.5]], { sides: 8, seed: 3 }), F({ color: 0xc8a87a }), g); mk(S.facet(new THREE.ConeGeometry(0.7, 0.6, 8)), F({ color: 0x8a6a2a }), g, 0, 0.8, 0); return g; }
function sheepModel() { const g = new THREE.Group(); mk(S.blob(0.5, 0.38, 0.38, { detail: 1, seed: 11, amt: 0.25 }), F({ color: 0xf4f0e8 }), g, 0, 0.55, 0); mk(S.blob(0.18, 0.2, 0.25, { detail: 0, seed: 12 }), F({ color: 0x2a2020 }), g, 0, 0.62, 0.45); for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]]) mk(S.limb(0.35, 0.05, 0.04, { sides: 4, seed: 13 }), F({ color: 0x2a2020 }), g, x, 0.35, z); return g; }
function birdModel() { const g = new THREE.Group(); const m = F({ color: 0x2a2030, side: THREE.DoubleSide }); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(s * 0.45, 0, -0.05), new THREE.Vector3(0, 0, -0.15)]), m); g.add(w); } return g; }
