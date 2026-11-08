// The Mythical Wilderness as a big miniature diorama (scenes/mapsheet.js): drag to pan, wheel to scroll along the
// map, right-drag (or Q/E, +/-) to turn and zoom; the painted node scenes glow when in reach and Sir Isaac's
// figurine walks the dirt paths (over the bridges) to the one you click. Fog of war hides the rows ahead.
import * as THREE from 'three';
import { BattleHUD } from '../ui3d/hud.js';
import { Strip } from '../ui3d/objects.js';
import { Panel } from '../ui3d/widgets.js';
import { uiPos } from '../ui3d/craft.js';
import { roman } from '../core/util.js';
import { UIScreen, Button3D } from '../ui3d/widgets.js';
import { MapSheet } from './mapsheet.js';
import { DIO } from '../models/diorama.js';
import { reachable } from '../game/run.js';
import { ItemToken } from './reward.js';
import { tweens, Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { clamp } from '../core/util.js';

const NODE_INFO = {
  battle: ['Skirmish', 'Local wildlife with opinions.'], elite: ['ELITE', 'Something big. Drops a rare curio.'], event: ['Curiosity', 'An encounter. Bring your science.'],
  shop: ["Diogenes' Barrel", 'Cards, removals, upgrades. No curios.'], lab: ['Field Laboratory', 'Rest, upgrade, merge or mutate cards.'], guardian: ['GUARDIAN OF THE WILDS', 'The gate to the Trojan War.'],
};

export class MapScene extends UIScreen {
  async enter(first) {
    const run = this.game.run; this.run = run; this.map = run.map;
    this.buildWorld(); this.engine.setWorld(this.scene, this.camera); this.sheet.attach();
    this.engine.setFx({ ink: { strength: 0.95, depth: 0.05, normal: 0.45, fade: [70, 170] }, bloom: [0.35, 0.5, 0.9], tilt: false, ao: 0.7, grade: { sat: 1.08, contrast: 1.05, warmth: 0.18, vignette: 0.55, harmony: 0.25 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('map'); audio.setAmbSet(['wilderness', 'wind']);
    this.buildHUD();
    const cur = run.pos ? this.sheet.pos(run.pos) : null; const fz0 = cur ? cur.z - 3.2 : 0.5, fx0 = cur ? cur.x * 0.6 : 0;
    this.fx = new Spring(fx0, 4, 0.9); this.fz = new Spring(fz0, 4, 0.9); this.yaw = new Spring(0, 5, 0.85); this.pitch = new Spring(0.72, 5, 0.85); this.dist = new Spring(22, 4.5, 0.9);
    if (first) { this.dist.value = 64; this.pitch.value = 1.18; this.fz.value = -27; this.yaw.value = 0.25; this.game.journal.seenIntro || this.story(); }
    this.refreshNodes();
  }
  story() {
    const lines = ['In 1687 a man published the laws of motion.', 'In 1688 the gods read them. They did not care for them.', 'Humanity had found the source code of the universe,', 'so the gods turned it off and on again. Forever.', 'One mind remembers every loop: Sir Isaac Plumb,', 'natural philosopher, deceased, still taking notes.', 'His body is gone. His marionette is not.'];
    const st = (this.storyPanel = new Panel('The Loop', lines, { w: Math.min(17, this.W * 1.7), h: 9, titleColor: '#5a1a22' })); uiPos(st.group, 0, 0.6, 9); this.root.add(st.group); audio.play('paper_rustle');
    st.ty = st.group.position.y; st.seal = new Strip(['click to roll it up'], { font: 'handS', tone: 3, tacks: 0, maxW: 8 }); st.seal.group.position.set(0, -st.scroll.h / 2 - 0.75, 0.2); st.group.add(st.seal.group);
    clearTimeout(this._storyT); this._storyT = setTimeout(() => this.dismissStory(), 9000); // real time, not game time
    this.game.journal.seenIntro = true; this.game.saveJournal();
  }

  // ------------------------------------------------------------ diorama
  buildWorld() {
    // the cached miniature diorama (scenes/mapsheet.js): scene, camera, lights, terrain, node scenes, fog of war
    const sheet = (this.sheet = MapSheet.for({ engine: this.engine, run: this.run, map: this.map }));
    this.scene = sheet.scene; this.camera = sheet.camera; this.world = sheet.world; this.bounds = sheet.bounds; this.heightAt = sheet.heightAt;
    this.nodeViews = sheet.nodeViews; for (const nd of Object.values(this.map.nodes)) this.addNode(nd);
    this.buildPaths();
    // Sir Isaac's figurine stands at the edge of the clearing he last visited (or at the camp)
    this.pawn = this.sheet.isaacPiece(); this.world.add(this.pawn.root);
    const cur = this.run.pos ? this.sheet.pos(this.run.pos) : this.sheet.pos('start'); const sp = { x: cur.x + 0.35, z: cur.z + 1.25 };
    this.pawn.root.position.set(sp.x, this.heightAt(sp.x, sp.z), sp.z); this.pawn.root.rotation.set(0, 0.45, 0);
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
    this.hint = new Strip(['Drag to pan · wheel to scroll · right-drag to turn · click a glowing piece to travel'], { maxW: 22, font: 'handS', tone: 3 }); uiPos(this.hint.group, 0, -H + 0.8, 2); this.root.add(this.hint.group);
  }
  async openJournal() { const { Journal } = await import('./journal.js'); if (!this.journal) { this.journal = new Journal(this.game, this.root); } this.journal.open(); }
  async openDeck() { const { DeckView } = await import('./deckview.js'); this.deckView = new DeckView(this.game, this.root, this.run.deck); this.deckView.open(); }

  // ------------------------------------------------------------ input
  onDragStart(e) { if (this.journal?.isOpen || this.deckView?.isOpen) return; this.dragging = e?.button === 2 ? 'turn' : 'pan'; this._drag = null; audio.play('wood_creak', { vol: 0.3 }); return true; }
  onDrag() {
    if (!this.dragging) return; const x = this.input.x, y = this.input.y; const p = this._drag || { x, y }; const dx = x - p.x, dy = y - p.y; this._drag = { x, y };
    if (this.dragging === 'turn') { this.yaw.target = clamp(this.yaw.target - dx * 0.006, -0.9, 0.9); this.dist.target = clamp(this.dist.target + dy * 0.05, 9, 46); return; }
    const k = this.dist.value * 0.0016; const c = Math.cos(this.yaw.value), sn = Math.sin(this.yaw.value);
    this.fx.target = clamp(this.fx.target - (dx * c + dy * sn) * k, DIO.X0 + 4, DIO.X1 - 4); this.fz.target = clamp(this.fz.target - (dy * c - dx * sn) * k * 1.3, DIO.ZF + 9, DIO.ZN - 4);
  }
  onDragEnd() { this.dragging = false; this._drag = null; }
  onWheel(e) { this.fz.target = clamp(this.fz.target + e.dy * 0.016, DIO.ZF + 9, DIO.ZN - 4); }
  onPinch(e) { this.dist.target = clamp(this.dist.target / e.scale, 9, 46); }
  onKey(e) {
    if (e.code === 'KeyJ') this.openJournal(); if (e.code === 'ArrowUp' || e.code === 'KeyW') this.fz.target = Math.max(DIO.ZF + 9, this.fz.target - 3); if (e.code === 'ArrowDown' || e.code === 'KeyS') this.fz.target = Math.min(DIO.ZN - 4, this.fz.target + 3);
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.fx.target = Math.max(DIO.X0 + 4, this.fx.target - 3); if (e.code === 'ArrowRight' || e.code === 'KeyD') this.fx.target = Math.min(DIO.X1 - 4, this.fx.target + 3);
    if (e.code === 'KeyQ') this.yaw.target = clamp(this.yaw.target + 0.25, -0.9, 0.9); if (e.code === 'KeyE') this.yaw.target = clamp(this.yaw.target - 0.25, -0.9, 0.9);
    if (e.code === 'Equal' || e.code === 'NumpadAdd') this.dist.target = Math.max(9, this.dist.target - 3); if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.dist.target = Math.min(46, this.dist.target + 3);
    if (e.code === 'KeyR') { this.yaw.target = 0; this.dist.target = 22; this.pitch.target = 0.72; }
  }
  rayNodes() { return this.sheet.pick(this.input.ndc); }
  onMove() {
    if (this.journal?.isOpen || this.deckView?.isOpen) return;
    const nd = this.rayNodes(); if (nd !== this.hoverNode) { this.hoverNode = nd; this.sheet?.hover(nd); if (nd) { const fog = this.nodeViews.get(nd.id)?.fogged; const [t, d] = fog ? ['Lost in the Fog', 'Something waits out there. Come closer to see.'] : NODE_INFO[nd.type]; audio.play('ui_hover', { vol: 0.4 }); this.tip.show([[[t, !fog && (nd.type === 'elite' || nd.type === 'guardian') ? '#8f2a2e' : '#3a2410']], [[d, '#2a160c']], [[this.reach.has(nd.id) ? 'Click to travel here.' : 'Not reachable yet.', this.reach.has(nd.id) ? '#2d6e6a' : '#8a6a44']]], 0, -this.H + 3.5, 8); } else this.tip.hide(); }
    // pan the view towards the pointer edges
  }
  // roll the story scroll up and let it slide away upward (click anywhere, or after nine real seconds)
  dismissStory() {
    const st = this.storyPanel; if (!st || st.leaving) return; st.leaving = performance.now(); clearTimeout(this._storyT);
    st.s.target = 0; audio.play('paper_rustle', { vol: 0.5 }); st.seal.group.visible = false;
    setTimeout(() => { if (this.storyPanel === st) { this.root.remove(st.group); this.storyPanel = null; } }, 1100);
  }
  onClick() {
    if (this.storyPanel && !this.storyPanel.leaving) { this.dismissStory(); return true; }
    if (this.journal?.isOpen || this.deckView?.isOpen || this.travelling) return;
    const nd = this.rayNodes(); if (!nd) { if (this.sheet.pokeChest(this.input.ndc)) { audio.play('coin', { vol: 0.6 }); return true; } return; } if (!this.reach.has(nd.id)) { audio.play('ui_error'); return; }
    this.travel(nd); return true;
  }
  async travel(nd) {
    this.travelling = true; audio.play('pin'); this.tip.hide();
    const fromId = this.run.pos || 'start'; (this.run.path ||= []).push(nd.id);
    const S = this.sheet, P = this.pawn.root; const from = P.position.clone(); const a0 = S.routePoint(fromId, nd.id, 0);
    const len = S.routeLength(fromId, nd.id); const dur = clamp(len * 0.34, 1.2, 3.4); const hops = Math.max(4, Math.round(len / 0.42)); const o = { k: 0 }; const p = new THREE.Vector3(), q = new THREE.Vector3(); let lastHop = -1;
    this.fx.target = (S.pos(nd).x + from.x) / 2 * 0.8; this.fz.target = S.pos(nd).z - 1.5; this.dist.target = Math.min(this.dist.target, 19);
    // step off the clearing onto the route, then walk it (little hops, dust at every footfall)
    await tweens.to(o, { k: 1 }, 0.28, { ease: 'inOutSine', onUpdate: () => { P.position.lerpVectors(from, a0, o.k); } }); o.k = 0;
    await tweens.to(o, { k: 1 }, dur, { ease: 'inOutSine', onUpdate: () => {
      S.routePoint(fromId, nd.id, o.k, p); S.routePoint(fromId, nd.id, Math.min(1, o.k + 0.02), q); const ph = o.k * hops; const hop = Math.abs(Math.sin(ph * Math.PI));
      P.position.set(p.x, p.y + hop * 0.16, p.z); if (q.distanceToSquared(p) > 1e-6) P.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); P.rotation.z = Math.sin(ph * Math.PI) * 0.06;
      const step = Math.floor(ph); if (step !== lastHop) { lastHop = step; audio.play('wood_knock', { vol: 0.32, minGap: 0 }); S.dust(p, 3); }
      this.fx.target = p.x * 0.8; this.fz.target = p.z - 2.2;
    } });
    P.rotation.z = 0; const v = this.nodeViews.get(nd.id); v.s.kick(6); S.dust(P.position, 10); const end = P.position.clone(), np = S.pos(nd), stand = new THREE.Vector3(np.x + 0.35, 0, np.z + 1.25); stand.y = this.heightAt(stand.x, stand.z); o.k = 0; const ry0 = P.rotation.y;
    await tweens.to(o, { k: 1 }, 0.3, { ease: 'outSine', onUpdate: () => { P.position.lerpVectors(end, stand, o.k); P.position.y += Math.sin(o.k * Math.PI) * 0.12; P.rotation.y = ry0 + (0.45 - ry0) * o.k; } });
    this.dist.target = 8; this.pitch.target = 0.62; this.fx.target = S.pos(nd).x; this.fz.target = S.pos(nd).z + 0.5; audio.play('transition_whoosh'); await tweens.wait(0.55);
    this.game.enterNode(nd.id);
  }

  update(dt, t) {
    // the diorama: camera rig, node scenes, fog, water, VFX (mapsheet.js)
    for (const sp of [this.fx, this.fz, this.yaw, this.pitch, this.dist]) sp.update(dt);
    this.sheet.update(dt, t, { fx: this.fx.value, fz: this.fz.value, yaw: this.yaw.value, pitch: this.pitch.value, dist: this.dist.value, ndc: this.input.ndc }); this.pawn.update(dt);
    this.updateUI(dt); for (const it of this.items) it.update(dt, t); this.hint.update(dt, this.ptr(2)); if (this.storyPanel) { const st = this.storyPanel; st.update(dt, null); st.seal.update(dt, null); if (st.leaving) { const k = Math.min(1, (performance.now() - st.leaving) / 1000); st.group.position.y = st.ty + k * k * 16; } }
    this.journal?.update(dt, t); this.deckView?.update(dt, t);
  }
  dispose() { this.sheet?.detach(); super.dispose(); this.runHud?.dispose(); }
}

