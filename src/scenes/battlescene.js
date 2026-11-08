// The battle: golden-hour diorama, marionette vs. monsters, physical hand of cards, all juice.
import * as THREE from 'three';
import { buildStage } from '../models/world.js';
import { realStage } from '../models/realworld.js';
import { loadModel } from '../gfx/assets.js';
import { createProfessor } from '../models/professor.js';
import { createCreature } from '../models/creatures.js';
import { Particles } from '../gfx/particles.js';
import { Critters } from '../gfx/critters.js';
import { HandView, cardBackTex } from '../ui3d/cards3d.js';
import { Pile, Numbers, Note } from '../ui3d/kit.js';
import { hud, HudTip, BattleHUD } from '../ui/hud.js';
import { fieldView, projectileModel } from './fieldviews.js';
import { Battle } from '../game/battle.js';
import { describeAttack, describeSelf, FIELD_INFO } from '../game/combos.js';
import { tweens } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vpick, vrange, clamp, roman } from '../core/util.js';
import { RNG } from '../core/util.js';
import { POWERS, BASICS } from '../game/data/cards.js';

const THEME = { satyr: 'meadow', medusa: 'garden', kobalos: 'gully', minotaur: 'labyrinth', minotaur_king: 'labyrinth', hydra: 'marsh', hydra_elder: 'marsh' };
const PLAYER_BARKS = {
  start: ['Ah. Violence. The least elegant of the sciences.', 'Hypothesis: you lose. Let us test it.', 'I have died before. Dreadfully overrated.', 'Stand still. I need you for an experiment.'],
  hit: ['Ow. Metaphorically.', 'Mind the varnish!', 'My finest oak!', 'That was load-bearing!'], kill: ['Q.E.D.', 'Gravity: one. You: zero.', 'Equal and opposite, darling.', 'Noted. Filed. Defeated.'],
  low: ['My strings are fraying. So is my patience.', 'Structural integrity: theoretical.'], win: ['Write that down. No, I will. I always do.', 'Science! Mildly violent science!'],
};

export class BattleScene {
  constructor(game) { this.game = game; this.engine = game.engine; this.input = game.input; }

  async run(run, encounter) {
    this.runData = run; this.encounter = encounter; this.done = false;
    let readyRes; this.ready = new Promise((r) => (readyRes = r));
    await this.buildWorld(encounter); this.buildUI(); readyRes();
    const rng = new RNG((run.seed ^ (run.stats.floors * 7919)) >>> 0);
    this.battle = new Battle({ run, enemies: encounter.enemies, rng, fx: this.fx(), kind: encounter.kind });
    for (const e of this.battle.enemies) this.addEnemyView(e);
    { const names = [...new Set(this.battle.enemies.filter((e) => !e.def.isHead).map((e) => e.def.name))]; this.hudB.setObjective(`Defeat ${names.length > 1 ? names.slice(0, -1).join(', ') + ' & ' + names.at(-1) : names[0] || 'the foe'}`); }
    this.engine.setWorld(this.scene, this.camera);
    this.engine.setFx({ exposure: 0.92, bloom: [0.55, 0.6, 0.78], tilt: { focus: 0.52, width: 0.2, feather: 0.32, amount: 2.2, top: 1.1, bottom: 0.7 }, grade: { sat: 1.06, contrast: 1.08, vignette: 0.5, grain: 0.05, warmth: 0.35, lift: [0.02, 0.006, 0.045], gain: [1.05, 0.99, 0.92], rolloff: 0.6, toe: 0.025, ca: 0.0008 } });
    this.handler = this.input.push(this.makeInput());
    this.engine.add(this);
    const kind = encounter.kind; audio.playMusic(kind === 'guardian' ? 'boss' : kind === 'elite' ? 'elite' : vpick(['battle', 'battle2']));
    audio.setAmbSet(this.theme === 'marsh' ? ['wilderness', 'stream'] : ['wilderness']);
    for (const e of this.battle.enemies) { const j = this.game.journal; (j.enemies[e.id] ||= { seen: 0, killed: 0, learned: {} }).seen++; }
    this.game.saveJournal();
    await this.battle.start();
    return new Promise((res) => (this.resolve = res));
  }

  // ---------------------------------------------------------------- world
  async buildWorld(enc) {
    const lead = enc.enemies[0]; this.theme = enc.kind === 'guardian' ? 'guardian' : THEME[lead] || 'meadow'; if (lead.startsWith('hydra')) this.theme = 'marsh'; if (lead.startsWith('minotaur')) this.theme = 'labyrinth';
    const sc = (this.scene = new THREE.Scene());
    let stage = null;
    try { stage = await realStage(this.theme, 7 + this.runData.stats.floors, this.engine.renderer); sc.environment = stage.env; sc.environmentIntensity = 0.5; sc.background = stage.background; sc.backgroundIntensity = 0.8; }
    catch (e) { console.warn('realistic stage failed, using fallback', e); stage = buildStage(this.theme, 7 + this.runData.stats.floors); }
    sc.add(stage.group); this.stage = stage;
    this.critters = new Critters(70); this.critters.bounds = { x: [-15, 15], y: [1.5, 8], z: [-10, 1] }; sc.add(this.critters.mesh);
    sc.updateMatrixWorld(true); for (const t of stage.trees) this.critters.perchesFrom(t, 4);
    this.critters.spawnBirds(14, this.theme === 'garden' ? ['crow', 'dove', 'sparrow'] : this.theme === 'marsh' ? ['swallow', 'crow'] : ['sparrow', 'swallow', 'hoopoe', 'dove']); this.critters.spawnButterflies(this.theme === 'labyrinth' ? 2 : 6, new THREE.Vector3(0, 0.5, -2), 14);
    sc.fog = new THREE.Fog(this.theme === 'marsh' ? 0x7a8a86 : 0xb07c62, 26, 90);
    const sun = new THREE.DirectionalLight(0xffb070, 2.5); const sd = stage.sunDir || new THREE.Vector3(-0.5, 0.6, 0.4); sun.position.copy(sd.clone().normalize().multiplyScalar(22)); if (sun.position.y < 6) sun.position.y = 6; sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -8, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    sc.add(sun, new THREE.HemisphereLight(0x8a98d8, 0x4a2c1a, 0.38));
    // dusk practicals, R.O.O.M.-style: warm braziers that actually light the fighters, a cool arcane rim, Sir Isaac's spirit glow
    const rim = new THREE.DirectionalLight(0xffa860, 1.1); rim.position.set(6, 5, -9); const arc = new THREE.DirectionalLight(0x8fb0ff, 1.5); arc.position.set(-7, 6, -10); sc.add(rim, arc);
    this.fires = [];
    for (const [x, z, s] of [[-6.4, -2.4, 1.6], [7.0, -3.2, 1.7]]) {
      const l = new THREE.PointLight(0xff8a3a, 26, 12, 1.6); l.position.set(x, 1.5, z + 0.4); sc.add(l); this.fires.push({ l, x, z, s, ph: Math.random() * 9 });
      loadModel('stone_fire_pit').then((o) => { o.position.set(x, 0, z); o.scale.multiplyScalar(s); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); sc.add(o); }).catch(() => {});
    }
    this.spirit = new THREE.PointLight(0xa58cff, 5, 6, 2); this.spirit.position.set(-3.5, 2.6, 1.8); sc.add(this.spirit);
    this.camera = new THREE.PerspectiveCamera(32, this.engine.aspect, 0.1, 400); this.camBase = new THREE.Vector3(-0.1, 3.0, 11.4); this.camLook = new THREE.Vector3(0.3, 1.7, 0);
    this.camera.position.copy(this.camBase); this.camera.lookAt(this.camLook); this.camOff = new THREE.Vector3(); this.camPunch = 0;
    // professor
    this.prof = createProfessor(); this.prof.root.position.set(-3.5, 0, 0.9); this.prof.root.rotation.y = 0.55; sc.add(this.prof.root);
    this.profHit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 1.2), new THREE.MeshBasicMaterial({ visible: false })); this.profHit.position.set(-3.5, 1.3, 0.9); this.profHit.userData.target = { type: 'self' }; sc.add(this.profHit);
    // field target (the ground between the fighters)
    this.fieldHit = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 3.2), new THREE.MeshBasicMaterial({ visible: false })); this.fieldHit.position.set(-1.0, 0.1, 1.3); this.fieldHit.userData.target = { type: 'field' }; sc.add(this.fieldHit);
    this.fieldMarker = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.8, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe3ff).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false })); this.fieldMarker.rotation.x = -Math.PI / 2; this.fieldMarker.position.set(-1.0, 0.06, 1.3); sc.add(this.fieldMarker);
    this.parts = new Particles(2500); sc.add(this.parts.points); this.glowParts = new Particles(1500, { additive: true }); sc.add(this.glowParts.points);
    this.enemyViews = new Map(); this.fieldViews = new Map(); this.projectiles = [];
    this.ambientT = 0;
  }
  enemySlotPos(e) {
    const B = this.battle; const main = B.enemies.filter((x) => !x.def.isHead);
    if (e.def.isHead) { const body = B.enemies.find((x) => x.uid === e.parent); const bp = body ? this.enemyViews.get(body.uid)?.api.root.position : new THREE.Vector3(5, 0, -1); const heads = B.enemies.filter((x) => x.def.isHead && x.parent === e.parent); const i = heads.indexOf(e); const n = Math.max(3, heads.length); const a = (i / (n - 1) - 0.5) * 2; return new THREE.Vector3((bp?.x ?? 5) - 1.6 + a * 2.0, 2.0 + Math.cos(a * 1.4) * 0.6 + (i % 2) * 0.4, (bp?.z ?? -1) + 1.6 - Math.abs(a) * 0.3); }
    const i = main.indexOf(e); const n = main.length; const xs = n === 1 ? [2.9] : n === 2 ? [2.0, 4.6] : [1.5, 3.6, 5.7];
    if (e.def.heads) return new THREE.Vector3(4.4, 0, -1.6);
    return new THREE.Vector3(xs[i] ?? 3 + i * 2, 0, (i % 2) * -0.6);
  }
  addEnemyView(e) {
    const api = createCreature(e.id, e.uid.length); const s = (e.def.scale || 1) * (e.id === 'kobalos' ? 1.15 : 1);
    api.root.scale.setScalar(s); const p = this.enemySlotPos(e); api.root.position.copy(p); api.root.rotation.y = -0.55; this.scene.add(api.root);
    const h = api.height * s; const hit = new THREE.Mesh(new THREE.BoxGeometry(e.def.isHead ? 1.2 : 1.6 * s, e.def.isHead ? 1.2 : h, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(p).add(new THREE.Vector3(0, e.def.isHead ? 0 : h / 2, 0)); hit.userData.target = { type: 'enemy', uid: e.uid }; this.scene.add(hit);
    if (e.def.isHead) { const body = this.enemyViews.get(e.parent); if (body) { api.anchorPos = new THREE.Vector3(); api.anchorIdx = this.battle.enemies.filter((x) => x.parent === e.parent).indexOf(e); this.scene.add(api.neckGroup); } }
    const v = { e, api, hit, hud: this.hudB.plate(e.def.name), h, flash: 0, spawnT: 0 }; this.enemyViews.set(e.uid, v); this.refreshEnemy(e);
    if (this.battle.phase !== 'start') { api.root.scale.setScalar(0.01); tweens.to(api.root.scale, { x: s, y: s, z: s }, 0.6, { ease: 'outBack' }); }
    return v;
  }
  refreshEnemy(e) { const v = this.enemyViews.get(e.uid); if (!v) return; v.hud.setHP(e.hp, e.maxHp, e.block, e.st); const it = e.intent; let val = null; if (it?.kind === 'attack' || it?.dmg) val = this.battle.attackValue(e, it.dmg); v.hud.setIntent(e.alive ? it : null, val, it?.hits || 1); }

  // ---------------------------------------------------------------- UI
  buildUI() {
    const ui = (this.ui = { scene: this.engine.ui.scene, W: this.engine.uiW, H: this.engine.uiH });
    ui.root = new THREE.Group(); ui.scene.add(ui.root);
    ui.pointerPlane = (z = 4) => { const ndc = this.input.ndc; const cam = this.engine.ui.camera; const v = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize(); const t = (z - cam.position.z) / v.z; return cam.position.clone().addScaledVector(v, t); };
    // lights + shadow catcher for the floating objects
    const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(-8, 12, 30); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -30, right: 30, top: 18, bottom: -18, near: 1, far: 80 });
    ui.root.add(key, new THREE.AmbientLight(0xffffff, 1.35));
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.ShadowMaterial({ opacity: 0.28 })); catcher.position.z = -2; catcher.receiveShadow = true; ui.root.add(catcher);
    this.hand = new HandView(ui);
    this.drawPile = new Pile('DRAW', cardBackTex()); this.discardPile = new Pile('USED', cardBackTex()); ui.root.add(this.drawPile.group, this.discardPile.group);
    hud.engine = this.engine; hud.clear();
    const enc = this.encounter; this.hudB = new BattleHUD({ floor: (this.runData.stats.floors || 0) + 1, kind: enc.kind, onEnd: () => this.endTurn(), onWell: () => this.toast('Drag cards into Second Thoughts to redraw them. 3 per battle.') });
    this.tooltip = new HudTip(); this.preview = new HudTip();
    this.barks = []; this.numbers = new Numbers(ui.scene);
    this.layoutUI(); this.onResize = () => this.layoutUI();
  }
  layoutUI() {
    const W = (this.ui.W = this.engine.uiW), H = (this.ui.H = this.engine.uiH);
    this.drawPile.group.position.set(-W + 2.2, -H + 2.4, 0.5); this.discardPile.group.position.set(W - 7.4, -H + 2.4, 0.5);
    this.hand?.layout();
  }

  // ---------------------------------------------------------------- loop
  update(dt, t) {
    if (!this.battle) return;
    const B = this.battle;
    this.prof.update(dt);
    for (const [, v] of this.enemyViews) {
      v.api.update(dt);
      if (v.api.anchorPos) { const body = this.enemyViews.get(v.e.parent); if (body?.api.anchor) body.api.anchor(v.api.anchorIdx ?? 0, v.api.anchorPos); if (!body?.e.alive) v.api.anchorPos = null; }
      const top = new THREE.Vector3().copy(v.api.root.position); top.y += v.e.def.isHead ? 1.0 : v.h + 0.45; const bot = v.api.root.position.clone(); bot.y += v.e.def.isHead ? -0.9 : -0.1;
      const pt = this.engine.worldToUI(top), pb = this.engine.worldToUI(bot);
      v.hud.update(dt, pb.x, Math.max(pb.y - 0.5, -this.ui.H + 7.4), pt.y + 0.6); v.hud.setVisible(v.e.alive);
    }
    for (const [, fv] of this.fieldViews) fv.update(dt, t);
    for (const f of this.fires) {
      f.l.intensity = 26 + Math.sin(t * 9 + f.ph) * 4 + Math.sin(t * 23 + f.ph * 2) * 2.5 + (Math.random() - 0.5) * 3;
      if (Math.random() < dt * 22) this.glowParts.spawn({ pos: [f.x + vrange(-0.35, 0.35), 0.55, f.z + vrange(-0.3, 0.3)], vel: [vrange(-0.2, 0.2), vrange(1.4, 2.6), 0], life: vrange(0.5, 0.9), size: vrange(34, 52), size1: 6, color: vpick(['#ff9a3a', '#ffc45a', '#ff6a2a']), sprite: 'ember', grav: -1 });
      if (Math.random() < dt * 3) this.glowParts.spawn({ pos: [f.x, 1.2, f.z], vel: [vrange(-0.4, 0.4), vrange(1.5, 3), 0], life: vrange(1.2, 2.2), size: vrange(10, 16), color: '#ffd08a', sprite: 'dot', wobble: 0.8 });
    }
    this.spirit.intensity = 5 + Math.sin(t * 2.1) * 1.2;
    this.parts.update(dt, t); this.glowParts.update(dt, t); this.critters.update(dt, t);
    // ambient pixel particles: pollen + fireflies + leaves
    this.ambientT -= dt;
    if (this.ambientT <= 0) { this.ambientT = 0.08; const x = vrange(-12, 12), z = vrange(-6, 4);
      if (Math.random() < 0.6) this.glowParts.spawn({ pos: [x, vrange(0.3, 4), z], vel: [vrange(-0.2, 0.2), vrange(0.05, 0.3), 0], life: vrange(3, 6), size: vrange(14, 24), color: this.theme === 'marsh' ? '#c8ff90' : '#ffe08a', sprite: 'firefly', wobble: 0.6 });
      else this.parts.spawn({ pos: [x, 7, z], vel: [vrange(0.3, 0.9), -0.6, 0], life: 8, size: vrange(20, 30), color: vpick(['#9cb84a', '#cfe07a', '#e0a83a']), sprite: 'leaf', wobble: 1.2, spin: vrange(-2, 2), floor: 0.05 }); }
    // camera drift + punch
    this.camPunch = Math.max(0, this.camPunch - dt * 2.5);
    const cx = this.camBase.x + Math.sin(t * 0.21) * 0.25 + this.input.ndc.x * 0.25, cy = this.camBase.y + Math.sin(t * 0.17) * 0.12 + this.input.ndc.y * 0.12;
    this.camera.position.set(cx, cy, this.camBase.z - this.camPunch * 1.6); this.camera.lookAt(this.camLook);
    // UI
    this.hand.update(dt, t);
    const P = B.player; this.hudB.setVitals(P.hp, P.maxHp, P.block, this.runData.gold); this.hudB.setRedraws(B.redraws);
    this.hudB.setEnd(B.phase === 'player' && !this.busy && !this.done, B.phase === 'player' || this.done ? 'End Turn' : 'Foes act');
    this.drawPile.set(B.draw.length); this.discardPile.set(B.discard.length); this.drawPile.update(dt); this.discardPile.update(dt);
    this.tooltip.update(dt); this.preview.update(dt); this.numbers.update(dt);
    for (const b of this.barks) { b.life -= dt; const p = this.engine.worldToUI(b.anchor()); const [sx, sy] = hud.toScreen(p.x + b.ox, p.y + 0.5); b.note.style.transform = `translate(${sx | 0}px,${sy | 0}px) translate(-50%,-100%)`; if (b.life < 0) b.note.classList.add('out'); }
    this.barks = this.barks.filter((b) => { if (b.life < -0.4) { b.note.remove(); return false; } return true; });
    this.fieldMarker.material.opacity = this.hand.drag && this.dropTarget?.type === 'field' ? 0.85 : 0;
    this.prof.lookAt(this.input.ndc.x * 0.6, this.input.ndc.y * 0.4);
  }

  // ---------------------------------------------------------------- input
  rayUI(objs) { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.engine.ui.camera); return r.intersectObjects(objs, true); }
  rayWorld() {
    const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera);
    const objs = [this.profHit, this.fieldHit]; for (const [, v] of this.enemyViews) if (v.e.alive) objs.push(v.hit); for (const [, fv] of this.fieldViews) if (fv.hit) objs.push(fv.hit);
    const h = r.intersectObjects(objs, false); return h.length ? h[0].object.userData.target : null;
  }
  cardMeshes() { const out = []; for (const s of this.hand.slots) if (!this.hand.drag || s !== this.hand.drag.slot) for (const v of s.views) out.push(v.mesh); return out; }
  makeInput() {
    const S = this;
    return {
      move() {
        if (S.done || S.hand.drag) return;
        const hits = S.rayUI(S.cardMeshes()); const s = S.hand.pick(hits);
        if (s !== S.hand.hover) { S.hand.hover = s; S.hand.layout(); if (s) { audio.play('ui_hover', { vol: 0.5 }); S.showCardTip(s); } else S.tooltip.hide(); }
        S.engine.canvas.classList.toggle('show-cursor', true);
      },
      dragstart() {
        if (S.done || S.battle.phase !== 'player' || S.busy) return;
        const s = S.hand.pick(S.rayUI(S.cardMeshes())); if (!s) return;
        S.hand.drag = { slot: s }; S.hand.hover = null; S.tooltip.hide(); S.hand.layout(); audio.play('card_pick');
        return true;
      },
      drag() { if (S.hand.drag) S.updateDrop(); },
      shake() { const d = S.hand.drag; if (!d || d.slot.slot.cards.length < 2) return; const uid = d.slot.uid; S.hand.drag = null; S.dropTarget = null; S.preview.hide(); S.battle.split(uid); audio.play('paper_rustle'); audio.play('card_fan'); S.syncHand(); S.bark('player', vpick(['Fine. Back to basics.', 'Decombobulated.', 'Unmixing. Very scientific.'])); },
      async dragend(e) {
        const d = S.hand.drag; if (!d) return; S.hand.drag = null; S.preview.hide(); let tgt = S.dropTarget; S.dropTarget = null; S.hand.dropTarget = null;
        if (!tgt && e.flick && e.vy < -300) tgt = S.flickTarget(e);
        if (tgt?.type === 'combine') { const ok = S.battle.combine(d.slot.uid, tgt.slot.uid); if (ok) { audio.play('card_snap'); S.snapFX(tgt.slot); } else { audio.play('ui_error'); S.bark('player', 'Laws do not mix with matter. Or each other. Rules.'); } S.syncHand(); return; }
        if (tgt && tgt.type !== 'combine') { await S.playSlot(d.slot, tgt); return; }
        // reorder within hand
        const p = S.ui.pointerPlane(4); const idx = S.hand.slots.filter((s) => s !== d.slot && s.base.x < p.x).length; S.battle.reorder(d.slot.uid, idx); audio.play('card_place'); S.syncHand();
      },
      dragcancel() { if (S.hand.drag) { S.hand.drag = null; S.syncHand(); } },
      click(e) {
        if (S.done) return;
        const s = S.hand.pick(S.rayUI(S.cardMeshes())); if (s && s.slot.cards.length > 1 && e.long) { S.battle.split(s.uid); S.syncHand(); return true; }
      },
      key(e) { if (S.done) return; if (e.code === 'Space' || e.code === 'Enter') S.endTurn(); },
    };
  }
  flickTarget(e) {
    let best = null, bd = 1e9; const dir = new THREE.Vector2(e.vx, -e.vy).normalize();
    for (const [, v] of this.enemyViews) { if (!v.e.alive) continue; const p = this.engine.worldToUI(v.api.root.position.clone().add(new THREE.Vector3(0, v.h / 2, 0))); const from = this.ui.pointerPlane(0); const to = new THREE.Vector2(p.x - from.x, p.y - from.y); const ang = Math.acos(clamp(to.clone().normalize().dot(dir), -1, 1)); if (ang < 0.6 && ang < bd) { bd = ang; best = v; } }
    return best ? { type: 'enemy', uid: best.e.uid } : null;
  }
  updateDrop() {
    const d = this.hand.drag; let tgt = null;
    const other = this.hand.pick(this.rayUI(this.cardMeshes()));
    if (other && other !== d.slot) tgt = { type: 'combine', slot: other };
    else if (this.hudB.wellHit(this.input.x, this.input.y)) tgt = { type: 'bin' };
    else { const w = this.rayWorld(); if (w) tgt = w; }
    const changed = JSON.stringify(tgt && { ...tgt, slot: tgt.slot?.uid }) !== JSON.stringify(this.dropTarget && { ...this.dropTarget, slot: this.dropTarget.slot?.uid });
    this.dropTarget = tgt; this.hand.dropTarget = tgt?.type === 'combine' ? tgt : null;
    this.hudB.setWellHot(tgt?.type === 'bin');
    for (const [, v] of this.enemyViews) v.api.root.userData.hl = tgt?.uid === v.e.uid;
    if (changed) { this.hand.layout(); if (tgt) audio.play('ui_hover', { vol: 0.35 }); }
    const p = this.ui.pointerPlane(8);
    const lines = this.previewLines(d.slot, tgt);
    if (lines) this.preview.show(lines, clamp(p.x + 5.2, -this.ui.W + 4, this.ui.W - 4), clamp(p.y + 2.2, -this.ui.H + 2, this.ui.H - 1.5), 10); else this.preview.hide();
  }
  previewLines(slotV, tgt) {
    const B = this.battle; const s = slotV.slot;
    if (!tgt) { const mv = B.moveOf(s); if (!mv) return null; return [[[mv.name, '#3a2410']], [['Drop on a foe, yourself, or the ground', '#8a6a44']]]; }
    if (tgt.type === 'combine') { const tmp = { uid: 'x', cards: [...tgt.slot.slot.cards, ...s.cards] }; if (tmp.cards.some((c) => c.type === 'power')) return [[['Laws do not combine', '#8f2a2e']]]; const mv = B.moveOf(tmp); const a = mv.attack; return [[['COMBINE → ', '#8f2a2e'], [mv.name, '#3a2410']], [[a.perHit ? `${a.m}kg × ${a.v}m/s = ${a.perHit}${a.hits > 1 ? ' ×' + a.hits : ''}` : describeSelf(mv.self).slice(0, 2).join(', '), '#2a160c']]]; }
    const pv = B.preview(s.uid, tgt);
    if (pv.kind === 'bin') return [[[pv.text, pv.ok ? '#2a160c' : '#8f2a2e']]];
    if (pv.kind === 'power') return [[[pv.text, pv.ok ? '#2a160c' : '#8f2a2e']]];
    if (!pv.ok) return [[[pv.text || 'No effect', '#8f2a2e']]];
    const mv = pv.move;
    if (pv.kind === 'attack') { const e = B.enemies.find((x) => x.uid === tgt.uid); const est = pv.est; const ex = describeAttack(mv.attack).slice(mv.attack.perHit > 0 ? 1 : 0, 3).join(' · '); return [[['ATTACK ', '#8f2a2e'], [e.def.name, '#3a2410'], [`  ${est.total}${mv.attack.spread ? ' each' : ''}`, '#c8443a']], [[mv.name + (ex ? ' · ' + ex : ''), '#2a160c']]]; }
    if (pv.kind === 'self') return [[['SELF ', '#2d6e6a'], [mv.name, '#3a2410']], [[describeSelf(mv.self).join(' · '), '#2a160c']]];
    if (pv.kind === 'field') return [[['FIELD ', '#5f8a3a'], [mv.field.name, '#3a2410']], [[fieldDesc(mv.field), '#2a160c']]];
    if (pv.kind === 'object') return [[['USE ON OBJECT', '#6b4c9a']], [[pv.text, '#2a160c']]];
    return null;
  }
  showCardTip(s) {
    const mv = s.move || this.battle.moveOf(s.slot); const c = s.slot.cards[0];
    let lines;
    if (c.type === 'power') lines = [[[POWERS[c.id].name, '#3a2410']], [['Drop on Sir Isaac to enact this Law.', '#2a160c']], [[POWERS[c.id].flavor, '#8a6a44']]];
    else if (s.slot.cards.length > 1) lines = [[[mv.name, '#3a2410']], [['Drag to a target. Shake to split.', '#2a160c']], [[`ATK ${mv.attack.perHit}${mv.attack.hits > 1 ? '×' + mv.attack.hits : ''} · SELF ${describeSelf(mv.self).slice(0, 2).join(', ')}`, '#5a3622']]];
    else lines = [[[mv.name, '#3a2410']], [['Stack cards to combine. m × v = damage.', '#2a160c']], [[(c.petrified ? 'PETRIFIED: acts as Stone this battle.' : '') || flavorOf(c), '#8a6a44']]];
    const b = s.base; this.tooltip.show(lines, clamp(b.x + 6.4, -this.ui.W + 4, this.ui.W - 4.5), b.y + 3.5, 10);
  }
  toast(text) { hud.toast(text); }

  syncHand(from) { const W = this.ui.W, H = this.ui.H; this.hand.sync(this.battle.hand, this.battle, from || { x: -W + 2.2, y: -H + 2.4 }); }

  async playSlot(slotV, tgt) {
    this.busy = true; const uids = slotV.slot.cards.map((c) => c.uid);
    const ok = await this.battle.play(slotV.uid, tgt);
    if (!ok) { audio.play('ui_error'); this.busy = false; this.syncHand(); return; }
    this.syncHand(); this.busy = false; this.afterAction();
  }
  async endTurn() {
    if (this.battle.phase !== 'player' || this.busy) return;
    this.busy = true; this.hudB.ringEnd(); audio.play('bell_ding'); this.tooltip.hide();
    await this.battle.endTurn(); this.busy = false; this.afterAction();
  }
  afterAction() {
    for (const e of this.battle.enemies) this.refreshEnemy(e);
    if (this.battle.phase === 'won' || this.battle.phase === 'lost') this.finish();
  }
  async finish() {
    if (this.done) return; this.done = true; const won = this.battle.phase === 'won';
    this.battle.finish(); await tweens.wait(0.6);
    if (won) { audio.play('sting_victory'); this.prof.act('cheer'); this.bark('player', vpick(PLAYER_BARKS.win), 2.5); this.hudB.setEnd(false); await this.showBanner('Victory', 'THE WILDS GROW QUIET', '', 1.1); }
    else { audio.stopMusic(1); audio.play('sting_defeat'); await this.showBanner('The Universe Resets', 'THE JOURNAL REMEMBERS', 'dread', 1.3); }
    await tweens.wait(0.5);
    this.resolve({ won, kind: this.encounter.kind, enemies: this.encounter.enemies });
  }
  async showBanner(title, sub = '', kind = '', hold = 0.7) { audio.play('transition_whoosh', { vol: 0.6 }); await hud.banner(title, sub, kind, hold); }
  bark(who, text, life = 2.4) {
    if (!text) return;
    const note = hud.bubble(text, who === 'player' ? 'me' : 'foe');
    const anchor = who === 'player' ? () => this.prof.headWorld(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0)) : () => { const v = this.enemyViews.get(who.uid); return v ? v.api.root.position.clone().add(new THREE.Vector3(0, v.h + 0.3, 0)) : new THREE.Vector3(); };
    const b = { note, anchor, life, ox: who === 'player' ? 1.6 : -0.6 }; this.barks.push(b);
    if (who === 'player') { this.prof.talk(Math.min(2, text.length * 0.05)); audio.play('wood_knock', { vol: 0.35 }); } else { const v = this.enemyViews.get(who.uid); v?.api.talk(1.2); }
    if (this.barks.length > 3) { const old = this.barks.shift(); old.note.remove(); }
  }
  snapFX(slotV) { const v = slotV.views[slotV.views.length - 1]; if (!v) return; v.sc.kick(4); v.rz.kick(3); }

  // ---------------------------------------------------------------- presentation hooks
  enemyPos(e, dy = 0.5) { const v = this.enemyViews.get(e.uid); return v ? v.api.root.position.clone().add(new THREE.Vector3(0, v.e.def.isHead ? 0 : v.h * dy, 0)) : new THREE.Vector3(4, 1, 0); }
  popNumber(worldPos, text, opts) { const p = this.engine.worldToUI(worldPos); this.numbers.spawn(text, p.x, p.y, opts); }
  burst(pos, kind, n = 20) {
    const P = this.parts, G = this.glowParts; const [x, y, z] = [pos.x, pos.y, pos.z];
    const sets = {
      apple: () => P.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-4, 4), vrange(1, 6), vrange(-2, 2)], life: vrange(0.6, 1.2), size: vrange(30, 50), color: vpick(['#c8443a', '#f6b3a0', '#fff3d0', '#9cb84a']), sprite: vpick(['applebit', 'chip', 'dot']), grav: 14, floor: 0.05, spin: vrange(-8, 8) })),
      stone: () => P.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-5, 5), vrange(2, 7), vrange(-2, 2)], life: vrange(0.7, 1.4), size: vrange(30, 55), color: vpick(['#8f8a90', '#736c74', '#b8b2b4']), sprite: 'stonechip', grav: 16, floor: 0.05, spin: vrange(-6, 6) })),
      zap: () => G.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-6, 6), vrange(-3, 6), vrange(-2, 2)], life: vrange(0.25, 0.6), size: vrange(30, 50), color: vpick(['#fff3b0', '#8fe3ff', '#ffffff']), sprite: vpick(['spark', 'spark2']), drag: 3 })),
      fire: () => G.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-2, 2), vrange(1, 5), vrange(-1, 1)], life: vrange(0.5, 1.1), size: vrange(30, 55), size1: 8, color: vpick(['#f08a2a', '#f2c14e', '#d8502a']), sprite: 'ember', grav: -2 })),
      water: () => P.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-4, 4), vrange(2, 7), vrange(-2, 2)], life: vrange(0.5, 1.0), size: vrange(26, 44), color: vpick(['#7cc6e8', '#d2f2fb', '#3f9ac8']), sprite: 'drop', grav: 16, floor: 0.05 })),
      wood: () => P.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-4, 4), vrange(1, 5), vrange(-2, 2)], life: vrange(0.5, 1.0), size: vrange(26, 40), color: vpick(['#b07444', '#d39a62', '#8a5634']), sprite: 'chip', grav: 14, floor: 0.05, spin: vrange(-8, 8) })),
      magic: () => G.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-3, 3), vrange(-1, 4), vrange(-1, 1)], life: vrange(0.6, 1.2), size: vrange(26, 48), color: vpick(['#b48cff', '#8fe3ff', '#e8fbff']), sprite: vpick(['star4', 'spark2']), drag: 1.5 })),
      heal: () => G.burst(n, () => ({ pos: [x + vrange(-0.6, 0.6), y - 0.5, z], vel: [0, vrange(1.5, 3), 0], life: vrange(0.8, 1.4), size: vrange(30, 46), color: vpick(['#9cb84a', '#cfe07a', '#ffffff']), sprite: vpick(['heart', 'star4']) })),
      block: () => G.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-2, 2), vrange(0, 3), vrange(-1, 1)], life: vrange(0.5, 0.9), size: vrange(26, 40), color: vpick(['#6fb7d6', '#e3f6fb']), sprite: 'spark2', drag: 2 })),
      smoke: () => P.burst(n, () => ({ pos: [x, y, z], vel: [vrange(-1.5, 1.5), vrange(0.5, 2), vrange(-1, 1)], life: vrange(0.8, 1.6), size: vrange(50, 90), size1: 120, color: '#d8d0c8', alpha: 0.7, sprite: 'smoke', drag: 1 })),
    };
    (sets[kind] || sets.magic)();
  }

  fx() {
    const S = this; const W = () => S.ui.W, H = () => S.ui.H;
    return {
      async battleStart(B) { S.syncHand(); for (const e of B.enemies) S.refreshEnemy(e); await tweens.wait(0.25); const lead = B.enemies.find((e) => !e.def.isHead); if (lead) S.bark(lead, vpick(lead.def.barks.start), 2.6); await tweens.wait(0.8); S.bark('player', vpick(PLAYER_BARKS.start), 2.4); },
      async playerTurn(B) { S.syncHand(); for (const e of B.enemies) S.refreshEnemy(e); S.hudB.setTurn(B.turn); S.showBanner('Your Turn', `TURN ${roman(B.turn)}`); if (B.player.hp < B.player.maxHp * 0.3) S.bark('player', vpick(PLAYER_BARKS.low)); },
      async drew(slots) { S.syncHand(); audio.play('card_slide', { vol: 0.8 }); for (let i = 0; i < Math.min(slots.length, 6); i++) audio.play('card_slide', { delay: i * 0.07, vol: 0.6 }); await tweens.wait(0.12); },
      async reshuffle() { audio.play('card_shuffle'); },
      async petrified(cards) { audio.play('stone_grind'); S.syncHand(); S.bark('player', 'My cards! They are... gravel now.'); await tweens.wait(0.4); },
      async invalid(text) { audio.play('ui_error'); if (text) S.bark('player', text); },
      async binned(slot) { audio.play('paper_crumple'); const [wx, wy] = S.hudB.wellUI(); S.hand.removeViews(slot.cards.map((c) => c.uid), { x: wx, y: wy, s: 0.2 }); hud.feed(`Second thoughts: ${slot.cards.length} card${slot.cards.length > 1 ? 's' : ''} redrawn`, 'arc'); await tweens.wait(0.25); },
      async power(c) { audio.play('magic_shimmer'); S.prof.act('cast'); S.burst(S.prof.headWorld(new THREE.Vector3()), 'magic', 40); S.hand.removeViews([c.uid], { x: 0, y: 2, s: 0.1 }); S.bark('player', `${POWERS[c.id].name}: ${POWERS[c.id].flavor}`, 3); S.addPowerToken(c); await tweens.wait(0.5); },
      async played(slot, mv, target, kind) {
        const p = kind === 'attack' ? S.enemyPos(S.battle.enemies.find((e) => e.uid === target.uid) || S.battle.alive()[0]) : kind === 'self' ? S.prof.headWorld(new THREE.Vector3()) : new THREE.Vector3(-1, 0.5, 1.1);
        const to = S.engine.worldToUI(p);
        hud.feed(`${mv.name}${kind === 'self' ? ' on Sir Isaac' : kind === 'field' ? ' takes the field' : ''}`, 'hit'); audio.play('card_whoosh'); S.hand.removeViews(slot.cards.map((c) => c.uid), { x: to.x, y: to.y, s: 0.3, flip: 0 });
        S.prof.act(kind === 'attack' ? 'throw' : 'cast'); S.prof.setExpr(kind === 'attack' ? 'smug' : 'think');
        await tweens.wait(0.18);
        if (kind === 'attack') await S.throwProjectile(mv, target);
      },
      eureka(mv) { S.eureka(mv); },
      async enemyHit(e, dmg, o) {
        const v = S.enemyViews.get(e.uid); const p = S.enemyPos(e);
        if (v) v.api.act('hurt');
        const big = dmg >= 25; const col = o.kind === 'zap' ? '#fff3b0' : o.kind === 'burn' ? '#f08a2a' : o.kind === 'venom' ? '#9cb84a' : '#fff6cf';
        if (dmg > 0) { S.popNumber(p.clone().add(new THREE.Vector3(0, 0.6, 0)), dmg, { color: col, size: big ? 2.0 : 1.4, stroke: '#5a1a22' }); hud.feed(`${e.def.name} takes ${dmg}${o.kind && o.kind !== 'hit' ? ' ' + o.kind : ''}${big ? '!' : ''}`); }
        if (o.blocked) S.popNumber(p.clone().add(new THREE.Vector3(-0.6, 1.2, 0)), `-${o.blocked}`, { color: '#a8dcef', stroke: '#16304f', size: 1.0 });
        const kindFx = o.kind === 'zap' ? 'zap' : o.kind === 'burn' ? 'fire' : o.kind === 'apple' ? 'apple' : o.move?.art?.core === 'stone' ? 'stone' : o.move?.art?.core === 'water' ? 'water' : o.move?.art?.core?.includes('apple') ? 'apple' : 'magic';
        S.burst(p, kindFx, big ? 40 : 18);
        audio.play(o.kind === 'zap' ? 'electric_zap' : o.kind === 'burn' ? 'sizzle' : big ? 'hit_heavy' : dmg > 10 ? 'hit_medium' : 'hit_light');
        if (kindFx === 'apple') audio.play('apple_squish', { vol: 0.7 }); if (kindFx === 'stone') audio.play('rock_impact', { vol: 0.8 });
        S.engine.shake(Math.min(0.6, 0.08 + dmg / 80)); if (dmg >= 12) S.critters.scare(p, 6 + dmg / 4); if (big) { S.engine.hitStop(70); S.camPunch = Math.min(1, dmg / 60); } if (dmg >= 45) S.engine.flash(0.25, 0xfff6cf, 0.3);
        if (v && Math.random() < 0.25 && dmg > 0) S.bark(e, vpick(e.def.barks.hurt), 1.3);
        S.refreshEnemy(e); await tweens.wait(dmg > 0 ? 0.16 : 0.05);
      },
      async miss(t, src, why) { const p = t === 'player' ? S.prof.headWorld(new THREE.Vector3()) : S.enemyPos(t); S.popNumber(p, why === 'wings' ? 'FLAP!' : 'MISS', { color: '#cdb6f0', stroke: '#22183f', size: 1.2 }); audio.play('whoosh_soft'); await tweens.wait(0.25); },
      async enemyDie(e) { const v = S.enemyViews.get(e.uid); if (!v) return; v.api.act('die'); S.burst(S.enemyPos(e), 'smoke', 30); S.burst(S.enemyPos(e), 'magic', 24); audio.play('enemy_death'); if (!e.def.isHead) S.bark('player', vpick(PLAYER_BARKS.kill), 1.6); const j = S.game.journal; if (j.enemies[e.id]) j.enemies[e.id].killed++; v.hud.setVisible(false); hud.feed(`${e.def.name} falls.`, 'kill'); setTimeout(() => { tweens.to(v.api.root.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0.5, { ease: 'inBack' }); }, 900); await tweens.wait(0.3); },
      async enemySpawn(e) { S.addEnemyView(e); audio.play('monster_roar', { vol: 0.6 }); S.burst(S.enemyPos(e), 'smoke', 14); await tweens.wait(0.3); },
      status(t, k, n) { if (t === S.battle.player) return; S.refreshEnemy(t); },
      async heal(who, n) { if (!n) return; const p = who === 'player' ? S.prof.headWorld(new THREE.Vector3()) : S.enemyPos(who); S.popNumber(p, `+${n}`, { color: '#cfe07a', stroke: '#1e3320', size: 1.3, vy: 5 }); S.burst(p, 'heal', 16); audio.play('heal'); if (who !== 'player') S.refreshEnemy(who); await tweens.wait(0.2); },
      async block(who, n) { if (!n) return; S.burst(S.prof.headWorld(new THREE.Vector3()).add(new THREE.Vector3(0, -0.8, 0)), 'block', 16); audio.play('shield_block'); await tweens.wait(0.15); },
      async enemyBlock(e, n) { S.burst(S.enemyPos(e), 'block', 14); audio.play('shield_block'); S.refreshEnemy(e); await tweens.wait(0.3); },
      async cleanse() { audio.play('water_splash'); S.syncHand(); },
      async selfApplied(mv) { S.prof.setExpr('delight'); S.burst(S.prof.headWorld(new THREE.Vector3()), 'magic', 20); S.syncHand(); await tweens.wait(0.2); },
      async placed(type) { audio.play(type === 'puddle' || type === 'rain' ? 'water_splash' : type === 'campfire' ? 'fire_ignite' : type === 'coil' ? 'electric_zap' : type === 'boulder' ? 'rock_impact' : 'magic_sparkle'); await tweens.wait(0.25); },
      fieldAdd(f) { S.addFieldView(f); },
      fieldRemove(f) { const fv = S.fieldViews.get(f.uid); if (!fv) return; S.fieldViews.delete(f.uid); S.burst(fv.group.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 'smoke', 12); tweens.to(fv.group.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0.35, { ease: 'inBack' }).then(() => S.scene.remove(fv.group)); },
      fieldUpdate(f) { const fv = S.fieldViews.get(f.uid); fv?.group.scale.setScalar(1.15); fv && tweens.to(fv.group.scale, { x: 1, y: 1, z: 1 }, 0.4, { ease: 'outBack' }); },
      async enemyAct(e, it) {
        const v = S.enemyViews.get(e.uid); if (!v) return;
        v.api.act(it.kind === 'attack' ? 'attack' : 'cast'); hud.feed(`${e.def.name}: ${it.label || (it.kind === 'attack' ? 'attacks' : it.kind)}`, 'foe');
        if (it.label) S.bark(e, it.kind === 'attack' ? null : vpick(e.def.barks.special), 1.4);
        audio.play(it.kind === 'attack' ? 'whoosh_heavy' : it.kind === 'buff' ? 'buff' : 'debuff', { vol: 0.8 });
        const sfx = { satyr: it.kind === 'attack' ? 'drunk_laugh' : 'hiccup', medusa: 'snake_hiss', kobalos: 'goblin_laugh', minotaur: it.charge ? 'bull_roar' : 'bull_snort', minotaur_king: 'bull_roar', hydra: 'monster_growl', hydra_head: 'monster_growl', hydra_elder: 'monster_roar' }[e.id];
        if (sfx) audio.play(sfx, { vol: 0.8 });
        if (it.charge) { await tweens.to(v.api.root.position, { x: v.api.root.position.x - 4.5 }, 0.35, { ease: 'inQuad' }); audio.play('hoof_stomp'); S.engine.shake(0.5); setTimeout(() => tweens.to(v.api.root.position, { x: S.enemySlotPos(e).x }, 0.6, { ease: 'outCubic' }), 300); }
        await tweens.wait(0.35);
      },
      async playerHit(dmg, o) {
        S.prof.act('hurt'); const p = S.prof.headWorld(new THREE.Vector3());
        if (dmg > 0) { hud.feed(`Sir Isaac takes ${dmg}`, 'hurt'); S.popNumber(p, dmg, { color: '#f6b3a0', stroke: '#3a0f18', size: 1.5 }); S.burst(p.clone().add(new THREE.Vector3(0, -0.6, 0)), 'wood', 16); audio.play('hit_wood'); S.engine.shake(Math.min(0.55, 0.12 + dmg / 50)); S.engine.flash(0.12, 0xc8443a, 0.25); if (Math.random() < 0.35) S.bark('player', vpick(PLAYER_BARKS.hit), 1.3); }
        if (o.blocked) { S.popNumber(p.clone().add(new THREE.Vector3(0.8, 0.4, 0)), `-${o.blocked}`, { color: '#a8dcef', stroke: '#16304f', size: 1.0 }); audio.play('shield_block'); }
        await tweens.wait(0.22);
      },
      async friendlyFire(e, t) { S.bark(e, vpick(['Oops.', 'Wrong face!', '*hic* ...sorry, Dave.']), 1.4); await tweens.wait(0.2); },
      async stunned(e, k) { S.popNumber(S.enemyPos(e, 1), k === 'prone' ? 'PRONE' : 'STUNNED', { color: '#ffe08a', stroke: '#3a1f08', size: 1.0 }); await tweens.wait(0.35); },
      async reflect(e) { S.bark('player', 'Mirror, mirror!'); S.burst(S.enemyPos(e, 0.9), 'magic', 30); audio.play('glass_shatter', { vol: 0.6 }); audio.play('stone_grind'); await tweens.wait(0.4); },
      async gaze(e) { S.engine.flash(0.3, 0x7dff8a, 0.5); audio.play('stone_grind'); await tweens.wait(0.3); },
      async steal(e, c) { audio.play('goblin_laugh'); S.bark(e, vpick(e.def.barks.special), 1.5); await tweens.wait(0.3); },
      async lootBack(e, c) { audio.play('coin_single'); S.bark('player', 'My card! You pickpocketing parenthesis.'); },
      async flee(e) { const v = S.enemyViews.get(e.uid); if (v) { tweens.to(v.api.root.position, { x: v.api.root.position.x + 14 }, 0.9, { ease: 'inQuad' }); v.hud.setVisible(false); hud.feed(`${e.def.name} flees!`, 'foe'); } S.bark('player', 'Thief! Come back with my... physics.'); await tweens.wait(0.6); },
      async flute(e) { audio.play('pan_flute'); for (let i = 0; i < 8; i++) S.glowParts.spawn({ pos: [S.enemyPos(e).x, S.enemyPos(e).y + 0.6, 0.5], vel: [vrange(-2, 2), vrange(1, 3), 0], life: 1.6, size: 40, color: '#ffe08a', sprite: 'note', wobble: 1 }); await tweens.wait(0.5); },
      async crash(e, obj) { audio.play('rock_crumble'); audio.play('hit_heavy'); S.engine.shake(0.8); S.engine.hitStop(120); S.burst(S.fieldViews.get(obj.uid)?.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)) || S.enemyPos(e), 'stone', 50); await tweens.wait(0.5); },
      async coverHit(obj, n) { const fv = S.fieldViews.get(obj.uid); if (fv) { S.burst(fv.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 'stone', 10); S.popNumber(fv.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), `-${n}`, { color: '#b8b2b4', stroke: '#211d24', size: 1.0 }); } audio.play('rock_impact'); },
      async steam(t) { S.burst(S.enemyPos(t), 'smoke', 12); audio.play('steam_hiss'); },
      async chain(e) { S.burst(S.enemyPos(e), 'zap', 20); audio.play('electric_zap'); },
      async ricochet(t) { audio.play('spin_whoosh'); },
      async bounce(t) { audio.play('pop'); },
      async launch(f, t) { audio.play('whoosh_heavy'); },
      async shakeTree(f) { audio.play('wood_creak'); },
      async electrify(f) { audio.play('electric_zap'); audio.play('thunder', { vol: 0.5 }); S.engine.flash(0.25, 0xfff3b0, 0.3); },
      async wineFire() { audio.play('fire_whoosh'); S.engine.flash(0.2, 0xf08a2a, 0.4); },
      async blackHole() { audio.play('implosion'); S.engine.flash(0.4, 0x22183f, 0.6); S.engine.shake(0.7); },
      async fallingApple(t) { await S.dropOnto(S.enemyPos(t), { core: 'apple', falling: true }); },
      async moonStrike(t) { await S.dropOnto(S.enemyPos(t), { core: 'gravity', falling: true }); },
      async momentumHit(f, t) { audio.play('boulder_roll', { vol: 0.6 }); },
      async zapFrom(f, t) { S.burst(S.enemyPos(t), 'zap', 16); audio.play('electric_zap'); },
      async leyden() { audio.play('thunder'); S.engine.flash(0.35, 0xfff3b0, 0.4); },
      async pendulum(t) { audio.play('clockwork'); },
      async revive() { audio.play('apple_crunch'); S.bark('player', 'A golden apple a day keeps the reaper away!', 2.5); S.burst(S.prof.headWorld(new THREE.Vector3()), 'heal', 50); },
      async endTurn(B) { S.syncHand(); S.hand.removeViews([...S.hand.views.keys()].filter((uid) => !B.hand.some((s) => s.cards.some((c) => c.uid === uid))), { x: W() - 7.4, y: -H() + 2.4, s: 0.4 }); audio.play('card_fan', { vol: 0.6 }); await tweens.wait(0.35); },
      async intents(B) { for (const e of B.enemies) S.refreshEnemy(e); },
      won() {}, lost() {},
      async bark(who, text) { S.bark(who, text); },
    };
  }

  addFieldView(f) {
    const fv = fieldView(f); const slots = [-2.3, -1.0, 0.3, -1.7, -0.4]; const used = [...this.fieldViews.values()].map((x) => x.slotIdx);
    let idx = slots.findIndex((_, i) => !used.includes(i)); if (idx < 0) idx = this.fieldViews.size % slots.length;
    fv.slotIdx = idx; fv.group.position.set(slots[idx], 0, idx >= 3 ? 2.0 : 0.9);
    if (f.type === 'moon') fv.update = ((u) => (dt, t) => { u(dt, t); fv.group.position.set(-3.9 + Math.cos(t * 1.4) * 1.4, 2.3 + Math.sin(t * 2) * 0.2, 0.8 + Math.sin(t * 1.4) * 1.2); })(fv.update);
    if (f.type === 'momentum') fv.update = ((u) => (dt, t) => { u(dt, t); const e = this.battle.enemies.find((x) => x.uid === f.target); const p = e ? this.enemyPos(e, 0.5) : new THREE.Vector3(3, 1, 0); fv.group.position.set(p.x + Math.cos(t * 3) * 1.1, p.y + 0.4, p.z + Math.sin(t * 3) * 0.8); })(fv.update);
    fv.hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 1.6), new THREE.MeshBasicMaterial({ visible: false })); fv.hit.position.y = 1; fv.hit.userData.target = { type: 'object', uid: f.uid }; fv.group.add(fv.hit);
    fv.group.scale.setScalar(0.01); tweens.to(fv.group.scale, { x: 1, y: 1, z: 1 }, 0.5, { ease: 'outBack' });
    this.scene.add(fv.group); this.fieldViews.set(f.uid, fv); this.burst(fv.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 'magic', 18);
  }
  addPowerToken(c) {
    this.hudB.addLaw(POWERS[c.id].short || POWERS[c.id].name, POWERS[c.id].flavor); hud.feed(`Law enacted: ${POWERS[c.id].name}`, 'arc');
  }

  async throwProjectile(mv, target) {
    const art = mv.art; const e = this.battle.enemies.find((x) => x.uid === target.uid) || this.battle.alive()[0]; if (!e) return;
    const targets = mv.attack.spread ? this.battle.alive() : [e];
    const from = this.prof.handWorld(1, new THREE.Vector3());
    const flights = targets.map(async (t, i) => {
      const to = this.enemyPos(t);
      if (art.falling) return this.dropOnto(to, art, i * 0.08);
      const obj = projectileModel(art); obj.position.copy(from); this.scene.add(obj);
      const dur = art.fast ? 0.22 : 0.42; const arc = art.fast ? 0.4 : 2.0; const o = { k: 0 };
      await tweens.to(o, { k: 1 }, dur, { delay: i * 0.06, ease: 'inQuad', onUpdate: () => { obj.position.lerpVectors(from, to, o.k); obj.position.y += Math.sin(o.k * Math.PI) * arc; obj.rotation.x += 0.3; obj.rotation.z += art.spin ? 0.6 : 0.15; if (Math.random() < 0.5) this.glowParts.spawn({ pos: [obj.position.x, obj.position.y, obj.position.z], vel: [0, 0, 0], life: 0.35, size: 26, color: art.hot ? '#f08a2a' : art.electric ? '#fff3b0' : '#e8fbff', sprite: 'spark2' }); } });
      this.scene.remove(obj);
    });
    await Promise.all(flights);
  }
  async dropOnto(to, art, delay = 0) {
    const obj = projectileModel(art); const start = to.clone().add(new THREE.Vector3(vrange(-0.3, 0.3), 7, 0)); obj.position.copy(start); this.scene.add(obj);
    audio.play('whoosh_soft', { delay }); const o = { k: 0 };
    await tweens.to(o, { k: 1 }, 0.45, { delay, ease: 'inQuad', onUpdate: () => { obj.position.lerpVectors(start, to, o.k); obj.rotation.y += 0.2; if (Math.random() < 0.6) this.glowParts.spawn({ pos: [obj.position.x, obj.position.y + 0.4, obj.position.z], vel: [0, 2, 0], life: 0.3, size: 22, color: '#e8fbff', sprite: 'spark2' }); } });
    this.scene.remove(obj);
  }

  eureka(mv) {
    audio.play('eureka'); audio.duckMusic(0.3, 2.5); this.prof.act('cheer'); this.engine.flash(0.18, 0xffe08a, 0.4);
    hud.banner('Eureka!', mv.name.toUpperCase(), 'arc', 1.4); hud.feed(`Discovered: ${mv.name} (written in the Journal)`, 'arc');
    this.bark('player', mv.special?.note || vpick(['EUREKA! ...I am writing that down.', 'Note to self: that was brilliant.', 'Peer review is for cowards.']), 3);
    for (let i = 0; i < 30; i++) this.glowParts.spawn({ pos: [this.prof.headWorld(new THREE.Vector3()).x, 3, 1], vel: [vrange(-4, 4), vrange(2, 7), vrange(-1, 1)], life: 1.5, size: 40, color: vpick(['#ffe08a', '#e8fbff', '#b48cff']), sprite: 'star4', grav: 4 });
  }

  dispose() {
    this.input.remove(this.handler); this.engine.remove(this);
    this.ui.scene.remove(this.ui.root); this.hudB.dispose(); hud.clear(); for (const [, v] of this.hand.views) this.ui.scene.remove(v.group);
    this.numbers.list.forEach((n) => this.ui.scene.remove(n.m)); this.battle = null;
  }
}

function fieldDesc(f) {
  const d = { sapling: 'Grows into an apple tree: free Apples each turn', boulder: `Cover: absorbs ${f.params.guard} damage. Minotaurs hate it.`, rolling: 'Rolls into a foe each turn', puddle: 'Attackers get Wet. Zap it!', coil: 'Zaps a random foe each turn', campfire: 'Burn 2 to all foes each turn', well: 'Your hits +2 v. Nothing escapes.', whirl: 'Foes hit 3 weaker; wind damage', glass: 'Burns the biggest foe each turn', catapult: 'Load a Move: fires x2 next turn', rain: 'All foes Wet each turn', steam: 'All foes Blind', moon: 'Block 4 each turn; Gravity calls it down' };
  return d[f.type] || FIELD_INFO[f.type]?.name || '';
}
function flavorOf(c) { return c.type === 'move' ? 'A permanent combination.' : POWERS[c.id]?.flavor || BASICS[c.id]?.flavor || ''; }
function splitHalf(t) { const i = t.indexOf(' ', Math.floor(t.length / 2)); return i < 0 ? [t] : [t.slice(0, i), t.slice(i + 1)]; }
