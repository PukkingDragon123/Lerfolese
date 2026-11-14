// THE PROLOGUE (first New Run; replayable from the gallery: game.playPrologue({ replay: true })).
//  I    the old apple garden at golden hour: kid Isaac and his Master (voiced, with choices)
//  II   the first card (Apple) and the interactive constructs: drag the card onto one, End Turn, watch the law play out
//  III  the FORBIDDEN APPLE appears in his slot; he is prompted to use it; he bites it
//  IV   the sky cracks and falls in shards, time stops, reality warps into white
//  V    blank white space: the cosmic Isaac (a galaxy in his shape) shows him a new world as a pop-up storybook
//  VI   he wakes, grown, under a moonlit tree; the old mop dog finds him
//  VII  the star-viewing dome: the Master again; then the adventure starts
// Skippable (Esc), click/Space/Enter advance a line. Debug: ?prologue=1&beat=garden|cards|forbidden|sky|white|wake|dome
// &fastlines=3 (reading clock x3). window.__prologue: { drop(kind), endTurn(), skip() } for tests and captures.
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { Plaque, Strip } from '../ui3d/objects.js';
import { Card3D } from '../ui3d/cards3d.js';
import { renderCardFace } from '../gfx/cardart.js';
import { canvasTexture } from '../ui3d/kit.js';
import { Letterbox } from './cinematic.js';
import { audio } from '../core/audio.js';
import { say, narrate, choice, stopAll, ensureFonts } from '../story/dialogue.js';
import { createKidIsaac, createMaster, createCosmicSelf } from '../models/npcs/story.js';
import { createProfessor } from '../models/professor.js';
import { construct, topple, skyShards, warpPass, popBook, buildDome, setBuilder, forbiddenFace } from '../story/stage.js';
import * as P3 from '../models/props3d.js';
import { Particles } from '../gfx/particles.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const SKIP = Symbol('skip');
const BEATS = ['garden', 'cards', 'forbidden', 'sky', 'white', 'wake', 'dome'];

export class PrologueScene extends UIScreen {
  constructor(game, { replay = false } = {}) {
    super(game); this.replay = replay; this.skipped = false; this.flavour = 'scholar';
    this.skipP = new Promise((r) => (this._skip = r)); this.cam = new THREE.PerspectiveCamera(35, this.engine.aspect, 0.1, 400);
    this.cs = { p: V(0, 2, 10), l: V(0, 1, 0), fov: 35, mv: null, drift: 1, t: 0 }; this.actors = []; this.ups = [];
    const q = new URLSearchParams(location.search); this.startBeat = Math.max(0, BEATS.indexOf(q.get('beat') || 'garden')); if (q.get('fastlines')) window.__storyFast = Number(q.get('fastlines')) || 3;
    this.ready = this.build();
  }
  // ------------------------------------------------------------------ plumbing
  w(p) { return Promise.race([p, this.skipP]).then((r) => { if (this.skipped) throw SKIP; return r; }); }
  wait(s) { return this.w(new Promise((r) => setTimeout(r, s * 1000 / (window.__storyFast > 1 ? Math.min(2, window.__storyFast) : 1)))); }
  say(who, text, actor, o = {}) { return this.w(say(who, text, { anchor: actor ? (out) => actor.headWorld(out).add(V(0, 0.32, 0)) : null, ...o })); }
  narr(text) { return this.w(narrate(text)); }
  choose(opts, o) { return this.w(choice(opts, o)); }
  skip() { if (this.skipped || this.finishing) return; this.skipped = true; stopAll(); window.__story?.pick?.(0); audio.play('page_turn', { vol: 0.7 }); this._skip(); }
  /** camera move: to (p, l, fov) over d seconds (0 = cut) */
  shot(p, l, fov = this.cs.fov, d = 0) { const c = this.cs; if (!d) { c.p.copy(p); c.l.copy(l); c.fov = fov; c.mv = null; return Promise.resolve(); } return this.w(new Promise((res) => { c.mv = { p0: c.p.clone(), l0: c.l.clone(), f0: c.fov, p, l, fov, d, t: 0, res }; })); }
  world(sc) { this.sc = sc; this.engine.setWorld(sc, this.cam); }
  /** a close-up in front of an actor's face (from its facing), side > 0 = its left, a touch off-axis */
  face(a, { d = 1.7, side = 0.55, up = 0.02, fov = 28, dy = -0.04, t = 0 } = {}) { a.root.updateMatrixWorld(true); const h = a.headWorld(V()); const f = V(0, 0, 1).applyQuaternion(a.root.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const r = V(f.z, 0, -f.x); return this.shot(h.clone().addScaledVector(f, d).addScaledVector(r, side).add(V(0, up, 0)), h.clone().add(V(0, dy, 0)), fov, t); }
  async build() {
    await ensureFonts();
    this.bars = new Letterbox(this.root); this.bars.show(); window.__storyBand = true;
    const hint = new Strip(['Esc · skip the prologue'], { font: 'head', maxW: 9, tacks: 1 }); hint.group.position.set((this.W - 4.2) * 0.95, (this.H - 1.0) * 0.95, 4); hint.group.scale.setScalar(0.62); this.root.add(hint.group); this.hint = hint;
    this.handler = this.input.push({ modal: true, key: (e) => { if (e.code === 'Escape') this.skip(); else if (e.code === 'Space' || e.code === 'Enter') { /* dialogue advances on click; keys mirror it */ window.__story?.advance?.(); } return true; },
      dragstart: () => this.onDragStart(), drag: () => this.onDrag(), dragend: () => this.onDragEnd(), move: () => this.onMove(), click: () => this.onClickUI() });
    this.engine.add(this); window.__prologue = { drop: (k) => this.dropOn(k), endTurn: () => this.endTurn?.(), skip: () => this.skip(), scene: this };
    await this.buildGarden();
  }
  // ------------------------------------------------------------------ sets
  async buildGarden() {
    const sc = new THREE.Scene(); let O = null;
    try { const { buildOrchard } = await import('../models/orchard.js'); O = buildOrchard({ renderer: this.engine.renderer, menu: false }); sc.add(O.group); O.title.group.visible = false; O.prompt.group.visible = false; O.setNight(0); sc.fog = O.fog; } catch (e) { console.warn('prologue garden fallback', e); }
    this.O = O; this.hAt = O?.hAt || (() => 0);
    const sun = new THREE.DirectionalLight(0xffb468, 2.6); sun.position.set(-26, 9, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -8, near: 1, far: 80 }); sun.shadow.bias = -0.0005; sc.add(sun); this.sun = sun;
    this.hemi = new THREE.HemisphereLight(0xffd8a8, 0x4a3a2a, 0.9); sc.add(this.hemi);
    if (sc.fog) sc.fog.color.set(0xd89a6a);
    const put = (a, x, z, ry) => { a.root.position.set(x, this.hAt(x, z), z); a.root.rotation.y = ry; sc.add(a.root); this.actors.push(a); return a; };
    this.master = put(createMaster(), -1.35, 2.7, 0.85); this.kid = put(createKidIsaac(), 1.05, 3.1, -0.95); // cheated toward the audience; their heads turn to each other
    this.master.lookAtWorld(() => this.kid.headWorld(V())); this.kid.lookAtWorld(() => this.master.headWorld(V()));
    this.parts = new Particles(500, { additive: true }); this.parts.points.userData.noInk = true; sc.add(this.parts.points);
    this.gardenScene = sc; this.world(sc);
    this.engine.setFx({ bloom: [0.55, 0.6, 0.8], grade: { warmth: 0.55, vignette: 0.42, sat: 1.06 }, rays: { pos: V(-60, 22, 30), strength: 0.45, tint: 0xffc070 } });
    audio.playMusic('menu'); audio.setAmbSet(['wilderness']);
  }
  // ------------------------------------------------------------------ the film
  async run() {
    await this.ready;
    try {
      const b = this.startBeat;
      if (b <= 0) await this.b_garden();
      if (b <= 1) await this.b_cards();
      if (b <= 2) await this.b_forbidden();
      if (b <= 3) await this.b_sky();
      if (b <= 4) await this.b_white();
      if (b <= 5) await this.b_wake();
      await this.b_dome();
    } catch (e) { if (e !== SKIP) console.error('prologue', e); }
    this.finishing = true; stopAll(); this.bars.hide(); window.__storyBand = false; this.warp?.dispose(); this.warp = null;
    try { this.game.journal.seenPrologue = true; this.game.saveJournal(); } catch (e) { /* */ }
  }
  // I. the old garden
  async b_garden() {
    const k = this.kid, m = this.master;
    const mid = k.root.position.clone().lerp(m.root.position, 0.5);
    this.shot(V(-7, 9, 14), V(0, 3.5, 0), 40); this.shot(V(-2.5, 2.4, 9.2), mid.clone().add(V(0, 1.2, 0)), 34, 6.5);
    await this.narr('Long ago, before the apples learned to fall, there was an old garden in Woolsthorpe…');
    await this.narr('…and in it lived a boy who asked too many questions.');
    this.face(m, { d: 2.3, side: 0.8, fov: 30, dy: -0.12 });
    m.act('explain'); await this.say('master', 'Isaac. You are staring at that tree again.', m);
    this.face(k, { d: 1.7, side: -0.7, up: 0.15, fov: 30 }); k.act('point');
    await this.say('isaac_kid', 'Master, why do apples fall down? Why never up? Or sideways?', k);
    this.shot(V(-0.4, 1.7, 6.6), mid.clone().add(V(0, 1.05, 0)), 32, 0); m.act('nod');
    await this.say('master', 'Ah. The oldest question in the garden. What do you think, little one?', m);
    const c = await this.choose([{ label: 'Because the ground wants them.', sub: 'a poet' }, { label: 'Because they are heavy.', sub: 'a scholar' }, { label: 'The tree gets tired of holding them.', sub: 'a jester' }], { prompt: 'Young Isaac thinks…', speaker: 'isaac_kid' });
    this.flavour = ['poet', 'scholar', 'jester'][c];
    await this.say('isaac_kid', ['Because the ground wants them.', 'Because they are heavy.', 'Because the tree gets tired of holding them!'][c], k);
    this.face(m, { d: 1.9, side: 0.6 });
    if (c === 2) { m.act('cheer'); m.setExpr('happy', 2); }
    await this.say('master', ['Wants? A poet’s answer. Hold on to it; it is closer to the truth than you know.', 'Heavy, yes. But heavy toward what? Remember that question. It will remember you.', 'Ha! Trees do not tire, Isaac. But you have made an old man laugh, and that is a kind of magic too.'][c], m);
    this.shot(V(0.6, 1.9, 7.4), mid.clone().add(V(0, 1.1, 0)), 33, 2.5); m.act('explain');
    await this.say('master', 'Science asks how. Magic asks what if. A true scholar-mage needs both.', m);
  }
  // II. the first card and the constructs
  async b_cards() {
    const k = this.kid, m = this.master;
    this.shot(m.headWorld(V()).add(V(1.4, -0.3, 1.9)), m.handWorld(1, V()).lerp(m.headWorld(V()), 0.5), 32, 0); m.act('present');
    await this.say('master', 'So. Your first card. Keep it close; it is the seed of everything.', m);
    const card = { uid: 'prologue-apple', id: 'apple', type: 'basic', up: 0 }; const v = new Card3D(card); this.root.add(v.group); this.card = v;
    const from = this.engine.worldToUI(m.handWorld(1, V())); v.pos.snap(from.x, from.y, 3); v.sc.set?.(0.2); v.target = { x: 0, y: -this.H + 3.2, z: 3, rz: 0, s: 0.75 }; v.home = { x: 0, y: -this.H + 3.2 }; audio.play('card_flip'); audio.play('magic_shimmer', { vol: 0.5 });
    const flav = { poet: 'The ground wants it. The poet was right.', scholar: 'Heavy toward what? Toward everything.', jester: 'Trees do not tire. Apples do not care.' }[this.flavour];
    this.cardNote = new Strip([flav], { font: 'head', maxW: 11, tacks: 2 }); this.cardNote.group.position.set(0, (-this.H + 0.9) * 0.95, 4); this.cardNote.group.scale.setScalar(0.7); this.root.add(this.cardNote.group);
    k.act('reach'); k.setExpr('happy', 2);
    await this.say('isaac_kid', 'An apple! On a card!', k);
    // the master conjures three constructs between them
    this.shot(V(0.0, 2.6, 8.6), V(-0.1, 1.0, 3.4), 36, 0); m.act('cast'); audio.play('magic_shimmer');
    const spots = { force: V(-1.15, 0, 4.4), apple: V(0.0, 0, 4.75), mass: V(1.25, 0, 4.4) };
    this.cons = Object.entries(spots).map(([kind, p], i) => { const c = construct(kind, i + 2); c.group.position.set(p.x, this.hAt(p.x, p.z), p.z); c.group.scale.setScalar(0.001); this.gardenScene.add(c.group); return c; });
    this.cons.forEach((c, i) => setTimeout(() => { c.grow = 0; audio.play('whoosh_soft', { vol: 0.5 }); }, 250 + i * 300));
    await this.say('master', 'Behold: Force, a falling Apple, and Mass. Laws, made of light and brass.', m);
    await this.say('master', 'Drag your card onto a construct to merge them. Then End Your Turn. Nothing happens until you do.', m);
    // the tutorial: drag the card onto a construct, then press End Turn
    this.dragOK = true; let target = null;
    target = await this.w(new Promise((res) => { this.onDropped = res; }));
    this.dragOK = false;
    await this.say('isaac_kid', { force: 'Apple, meet Force!', apple: 'Apple, remember how to fall!', mass: 'Apple, be heavy!' }[target.kind], k, { wait: false });
    const btn = new Plaque('End Turn', () => this.endTurn?.(), { w: 5.2, h: 1.5, color: 'teal' }); btn.group.position.set((this.W - 4) * 0.92, (-this.H + 3.0) * 0.92, 3); btn.group.scale.setScalar(0.92); btn.pop.value = 0.05; btn.pop.target = 1; this.root.add(btn.group); this.btn = btn; this.buttons.push(btn);
    await this.w(new Promise((res) => { this.endTurn = () => { if (this.ended) return; this.ended = true; btn.press?.(); res(); }; }));
    this.buttons = this.buttons.filter((b) => b !== btn); setTimeout(() => { this.root.remove(btn.group); }, 300);
    this.shot(V(0.2, 1.9, 7.6), target.group.position.clone().add(V(0.6, 0.7, 0)), 34, 0);
    const mass = this.cons.find((c) => c.kind === 'mass'); await this.w(target.play((at) => {
      this.engine.shake(0.25); audio.play(target.kind === 'force' ? 'metal_clang' : target.kind === 'mass' ? 'hit_heavy' : 'apple_crunch'); this.burst(at, '#ffe08a', 26);
      if (target.kind === 'force') this.toppleT = 0; // the apple rings the brass weights and they topple
    }, mass.group.position.clone().add(V(0, 0.9, 0))));
    m.act('nod');
    await this.say('master', { force: 'Mass, moving, makes a blow. Remember: damage is mass times velocity.', apple: 'It falls because everything pulls on everything. You will name that, one day.', mass: 'Heavier things hit harder, and are harder to throw. Every gift has a price.' }[target.kind], m);
    await this.say('isaac_kid', 'Again! Can we do it again?', k);
  }
  // III. the forbidden apple
  async b_forbidden() {
    const k = this.kid, m = this.master; if (!this.card) { const v = new Card3D({ uid: 'p-a', id: 'apple', type: 'basic', up: 0 }); this.root.add(v.group); v.pos.snap(0, -this.H - 4, 3); this.card = v; }
    const v = this.card; v.target = { x: 0, y: -this.H + 3.2, z: 3, rz: 0, s: 0.75 }; this.cardNote && (this.cardNote.group.visible = false);
    await this.wait(0.6);
    // the card shudders, its face goes gold and crackles
    const base = renderCardFace({ id: 'apple', type: 'basic', up: 0 }); const frames = [0, 1, 2].map((f) => canvasTexture(forbiddenFace(base, f)));
    this.forb = { frames, i: 0, t: 0 }; v.front.map = frames[0]; v.front.needsUpdate = true; v.rz.kick?.(4); audio.play('electric_zap'); audio.play('magic_shimmer'); this.engine.flash(0.35, 0xffe08a, 0.4);
    this.face(k, { d: 2.2, side: -0.9, up: 0.25, fov: 32, dy: -0.25 }); k.setExpr('surprised', 3); m.act('alarm');
    await this.say('master', 'Isaac… where did you get that? That is not one of mine.', m);
    await this.say('isaac_kid', 'It was just there. In my hand. It’s warm… and it’s humming.', k);
    this.face(m, { d: 1.6, side: 0.5, fov: 26 });
    await this.say('master', 'That is a Forbidden Apple. It does not obey the garden’s laws. Put it down, slowly.', m);
    this.shot(V(0.2, 1.4, 5.4), k.headWorld(V()).add(V(0, -0.3, 0)), 30, 0);
    let c = await this.choose([{ label: 'Use the Forbidden Apple', sub: 'it wants to be used' }, { label: 'Put it down', sub: 'as the Master says' }], { prompt: 'The golden apple hums in your hand…', speaker: 'isaac_kid' });
    if (c === 1) { v.target = { ...v.target, y: -this.H + 1.4 }; await this.wait(0.35); v.target = { ...v.target, y: -this.H + 3.2 }; v.rz.kick?.(6); audio.play('ui_error'); await this.say('isaac_kid', 'I can’t! It won’t let go of my fingers!', k); c = await this.choose([{ label: 'Use the Forbidden Apple', sub: 'there is no other way' }], { prompt: 'It will not be put down.', speaker: 'isaac_kid' }); }
    // he uses it: the card becomes the golden apple in his hand, and he bites
    v.target = { x: this.engine.worldToUI(k.handWorld(1, V())).x, y: this.engine.worldToUI(k.handWorld(1, V())).y, z: 3, rz: 0.4, s: 0.05 }; audio.play('card_flip');
    const ga = P3.apple({ kind: 'gold' }); ga.scale.setScalar(0.12); k.hand(1).add(ga); ga.position.set(0, -0.04, 0.05); this.gapple = ga;
    this.face(k, { d: 1.4, side: -0.6, up: 0.12, fov: 28, dy: -0.12 }); k.act('reach');
    await this.wait(0.8); audio.play('apple_crunch'); k.setExpr('surprised', 3); this.engine.flash(0.6, 0xfff0b0, 0.5); this.burst(k.handWorld(1, V()), '#ffd84a', 40);
    await this.say('master', 'ISAAC, NO—', m, { wait: false }); await this.wait(1.1);
    this.root.remove(v.group); this.card = null;
  }
  // IV. the sky falls apart; time stops; reality warps
  async b_sky() {
    const k = this.kid, m = this.master; if (!this.gardenScene) return;
    let skyMat = null; this.gardenScene.traverse((o) => { if (!skyMat && o.isMesh && o.material?.uniforms?.uNight && o.material.side === THREE.BackSide) { skyMat = o.material; this.skyMesh = o; } });
    const S = skyShards(V(0, 0, 2), { r: 62, skyMat }); this.gardenScene.add(S.group); this.shards = S; if (this.skyMesh) this.skyMesh.visible = false;
    this.gardenScene.background = new THREE.Color(0xfff2d0);
    this.shot(V(0.4, 0.8, 9.6), V(2.0, 26, -8), 54, 0); this.shot(V(0.4, 0.8, 9.6), V(1.0, 30, -10), 52, 3.5); audio.play('glass_break', { vol: 0.8 }); audio.play('thunder', { vol: 0.6 }); this.engine.shake(0.4);
    await this.w(this.tween(1.6, (u) => S.crack(u)));
    await this.narr('And the sky above the garden cracked, like the glaze of an old painting…');
    audio.play('rumble', { vol: 0.8 }); S.drop(0.4); this.engine.shake(0.5);
    this.shot(V(1.6, 0.7, 8.4), V(0.2, 6.0, -4), 52, 0); k.act('alarm'); m.act('alarm');
    await this.wait(1.4); S.drop(0.9); this.engine.shake(0.6); audio.play('glass_break', { vol: 0.7 });
    await this.say('isaac_kid', 'Master! The sky is falling!', k);
    // time stops
    this.frozen = true; audio.play('whoosh_heavy'); audio.duckMusic?.(0.1, 4); this.engine.flash(0.3, 0xd8e8ff, 0.6);
    this.face(m, { d: 1.7, side: 0.55, up: 0.12 });
    await this.say('master', 'Isaac, listen to me. Whatever you see next, remember the garden.', m);
    this.warp = warpPass(this.engine);
    await this.w(this.tween(4.2, (u) => { this.warp.set(ease(u) * 1.15, ease((u - 0.72) / 0.28)); this.cs.fov = 38 + u * 30; }));
  }
  // V. white space: the cosmic self and the pop-up storybook
  async b_white() {
    this.warp?.set(0, 1); const sc = new THREE.Scene(); sc.background = new THREE.Color(0xfbf8f0); sc.fog = new THREE.Fog(0xfbf8f0, 30, 120);
    sc.add(new THREE.HemisphereLight(0xffffff, 0xe8e0d0, 1.6)); const key = new THREE.DirectionalLight(0xfff4e0, 1.6); key.position.set(4, 10, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); sc.add(key);
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.12 })); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; sc.add(catcher);
    const kid = createKidIsaac(); kid.root.position.set(0.5, 0, 3.4); kid.root.rotation.y = Math.PI * 0.86; // three-quarters to us, looking up at himself sc.add(kid.root); this.actors.push(kid); this.kidW = kid;
    const cos = createCosmicSelf(); cos.root.scale.setScalar(4.6); cos.root.position.set(0, -2.2, -7.5); cos.setIdleMode?.('still'); sc.add(cos.root); this.actors.push(cos); this.cosmic = cos; cos.setAlpha(0);
    const book = popBook(); book.group.position.set(0, 0, -0.6); sc.add(book.group); this.book = book;
    kid.lookAtWorld(() => cos.headWorld(V()));
    this.world(sc); this.engine.setFx({ bloom: [0.45, 0.6, 0.86], grade: { warmth: 0.1, vignette: 0.18, sat: 1.04 }, exposure: 1.0 });
    this.shot(V(0.6, 1.0, 7.6), V(0, 1.6, 2.6), 40, 0);
    await this.w(this.tween(1.6, (u) => this.warp?.set(0, 1 - ease(u))));
    this.warp?.dispose(); this.warp = null; this.frozen = false;
    await this.narr('White. Nothing but white, and the sound of his own heartbeat.');
    this.shot(V(0.9, 0.6, 7.0), V(0, 6.5, -6), 50, 4.5); audio.play('magic_shimmer'); audio.playMusic('journal');
    await this.w(this.tween(3.0, (u) => cos.setAlpha(ease(u))));
    await this.say('cosmic', 'Do not be afraid, Isaac. You are only looking at what you will become.', cos);
    this.face(kid, { d: 1.5, side: -0.5, up: -0.1, fov: 30, dy: 0.05 }); kid.setExpr('surprised', 2.5);
    await this.say('isaac_kid', 'Are you… me?', kid);
    this.shot(V(-1.2, 0.4, 6.4), V(0, 7.2, -7), 46, 0);
    await this.say('cosmic', 'I am every answer you have not found yet.', cos);
    await this.say('cosmic', 'The apple you took was the first page of a new world. A world where stories are alive, and every law is a door.', cos);
    // the book opens and the world pops up out of it
    this.shot(V(0, 4.6, 4.2), V(0, 0.2, -0.6), 44, 0); book.open(); audio.play('page_turn'); audio.play('paper_rustle');
    await this.narr('And the pages unfolded: forests and villages, windmills and temples, every tale that was ever told about the gods.');
    this.shot(V(2.6, 1.6, 3.0), V(-0.4, 0.5, -0.6), 36, 4);
    await this.say('cosmic', 'Here, gravity listens to you. Here, the monsters remember their myths. Here, you can write the rules.', cos);
    this.shot(V(3.0, 2.4, 6.6), V(-0.2, 2.6, -2.5), 50, 0);
    const c = await this.choose([{ label: 'I want to understand it.', sub: 'the scholar' }, { label: 'I want to be strong.', sub: 'the battle-mage' }, { label: 'I want to go home.', sub: 'the boy' }], { prompt: 'Young Isaac answers…', speaker: 'isaac_kid' });
    await this.say('isaac_kid', ['I want to understand it.', 'I want to be strong.', 'I want to go home.'][c], kid);
    this.shot(V(-0.8, 0.5, 6.0), V(0, 7.4, -7), 46, 0);
    await this.say('cosmic', ['Then you will. One law at a time.', 'Strength is only a law you have not written yet.', 'Home is not lost, Isaac. It is the first thing you will remember.'][c], cos);
    await this.say('cosmic', 'Now wake up. Someone has been waiting for you for a very long time.', cos);
    audio.play('magic_shimmer'); this.warp = warpPass(this.engine);
    await this.w(this.tween(1.6, (u) => this.warp.set(ease(u) * 0.5, ease(u))));
  }
  // VI. he wakes, grown, under a moonlit tree; the mop dog
  async b_wake() {
    if (!this.gardenScene) await this.buildGarden();
    const sc = this.gardenScene; for (const a of [this.master, this.kid]) if (a) a.root.visible = false; for (const c of this.cons || []) c.group.visible = false;
    if (this.shards) { sc.remove(this.shards.group); this.shards = null; } if (this.skyMesh) this.skyMesh.visible = true; sc.background = null; this.sun.intensity = 0.0; if (this.hemi) this.hemi.intensity = 0.15;
    this.O?.setNight(1); if (sc.fog) { sc.fog.color.set(0x2e3260); sc.fog.far = 95; }
    const hero = createProfessor(); const sp = V(0.2, 0, 4.7); /* open grass where the lesson was */ hero.root.position.set(sp.x, this.hAt(sp.x, sp.z), sp.z); hero.root.rotation.y = 0.35; hero.act('sleep'); sc.add(hero.root); this.hero = hero;
    let dog = null; try { const { createDog } = await import('../models/dog.js'); dog = createDog(); dog.hAt = this.hAt; dog.area = { x: [-1, 4], z: [1, 5] }; dog.st.pos.set(2.6, 0, 6.4); dog.root.position.copy(dog.st.pos); sc.add(dog.root); this.dog = dog; } catch (e) { console.warn('dog', e); }
    this.world(sc); this.engine.setFx({ bloom: [0.6, 0.6, 0.78], grade: { warmth: -0.15, vignette: 0.55, sat: 1.0, lift: [0.0, 0.01, 0.06], gain: [0.86, 0.9, 1.05] }, exposure: 0.72, rays: false });
    { hero.update(0.016); const q = hero.root.quaternion, sx = V(1, 0, 0).applyQuaternion(q), bz = V(0, 0, 1).applyQuaternion(q); const mid = hero.root.position.clone().add(V(0, 0.35, 0)); this.shot(mid.clone().addScaledVector(sx, 2.6).addScaledVector(bz, 0.6).add(V(0, 1.5, 0)), mid.clone().addScaledVector(bz, -0.2), 38, 0); }
    if (this.warp) { await this.w(this.tween(1.8, (u) => this.warp.set((1 - ease(u)) * 0.5, 1 - ease(u)))); this.warp.dispose(); this.warp = null; }
    audio.playMusic('menu');
    await this.narr('He woke beneath a tree he did not know, under stars he almost did.');
    if (dog) { dog.goTo(sp.clone().add(V(1.0, 0, 1.0)), 0.8, () => { dog.sniffFor(2.2); }); audio.play('dog_bark', { vol: 0.5 }); }
    this.shot(sp.clone().add(V(2.6, 1.3, 2.8)), sp.clone().add(V(0.5, 0.4, 0.5)), 36, 3.5);
    await this.wait(2.6);
    await this.say('dog', 'Woof!', dog ? { headWorld: (o) => dog.head.getWorldPosition(o) } : null);
    hero.act('bonk'); audio.play('wood_knock'); await this.wait(2.6);
    this.face(hero, { d: 1.9, side: 0.7, fov: 30 }); hero.setExpr('shock');
    await this.say('newton', 'I’m… taller. Why am I taller? And floating. Why am I floating?', hero);
    if (dog) dog.pet(); hero.setExpr('delight');
    this.shot(sp.clone().add(V(2.2, 1.9, 3.4)), sp.clone().lerp(dog ? dog.root.position : sp, 0.5).add(V(0, 0.45, 0)), 38, 0);
    await this.say('newton', 'Hello, old fellow. Do you live here? You look like a mop that has seen things.', hero);
    if (dog) { dog.goTo(V(-2.5, 0, 6.5), 1.0); audio.play('dog_bark', { vol: 0.4 }); }
    await this.narr('The old dog wagged, and trotted off up the hill, toward a dome of brass and glass that glowed beneath the stars.');
  }
  // VII. the star-viewing dome
  async b_dome() {
    const build = setBuilder('dome', buildDome); let D; try { D = await build({ renderer: this.engine.renderer }); } catch (e) { console.warn('dome', e); D = buildDome(); }
    const sc = new THREE.Scene(); sc.add(D.group); sc.background = D.background || new THREE.Color(0x0a0c22); sc.fog = new THREE.Fog(0x0a0c22, 30, 140); this.domeSet = D;
    const sp = D.group.userData.spots || { master: V(-1.2, 0, -1.4), hero: V(1.6, 0, 2.2), dog: V(2.6, 0, 1.3), look: V(0, 1.6, -1) };
    const m = createMaster(); m.root.position.copy(sp.master); m.root.rotation.y = 0.6; sc.add(m.root); this.actors.push(m); this.master2 = m;
    const h = createProfessor(); h.root.position.copy(sp.hero); h.root.rotation.y = Math.atan2(sp.master.x - sp.hero.x, sp.master.z - sp.hero.z); sc.add(h.root); this.hero2 = h; h.setIdleMode?.('still');
    m.lookAtWorld(() => h.headWorld(V()));
    try { const { createDog } = await import('../models/dog.js'); const dg = createDog(); dg.hAt = () => 0; dg.area = { x: [1, 3.5], z: [0.5, 3] }; dg.st.pos.copy(sp.dog); dg.root.position.copy(sp.dog); sc.add(dg.root); this.dog2 = dg; dg.sitFor(30); } catch (e) { /* */ }
    await this.w(this.engine.wipe(async () => { this.world(sc); this.engine.setFx({ bloom: [0.7, 0.6, 0.72], grade: { warmth: 0.25, vignette: 0.5, sat: 1.08 } }); this.shot(V(3.6, 3.4, 4.4), V(0, 0.6, -1.2), 44, 0); }, { color: 0x05040a }));
    this.shot(V(2.6, 1.7, 4.4), m.headWorld(V()).lerp(h.headWorld(V()), 0.5), 36, 4);
    await this.narr('At the top of the hill stood the star-viewing dome, and in it, someone was waiting.');
    this.face(m, { d: 2.0, side: 0.6 }); m.act('explain');
    await this.say('master', 'There you are. You took your time. About three hundred years, give or take.', m);
    this.face(h, { d: 1.9, side: -0.6 }); h.setExpr('shock');
    await this.say('newton', 'Master? You’re here too? You look exactly the same.', h);
    this.face(m, { d: 1.7, side: 0.5, fov: 27 });
    await this.say('master', 'Masters do not age, Isaac. We only become more mysterious.', m);
    this.shot(V(-2.2, 2.2, 4.6), V(0.4, 2.4, -2.4), 42, 5); m.act('point');
    await this.say('master', 'This world was born from the apple you should not have eaten. Its stories are coming loose, and its gods are restless.', m);
    await this.say('master', 'Your cards will grow. Your laws will grow. And when you fall, and you will fall, the stars will put you back together.', m);
    this.face(h, { d: 1.8, side: -0.6 });
    const c = await this.choose([{ label: 'Where do I begin?', sub: 'eager' }, { label: 'What was that golden apple?', sub: 'suspicious' }], { prompt: 'Isaac asks…', speaker: 'newton' });
    await this.say('newton', ['Where do I begin?', 'What was that golden apple?'][c], h);
    this.face(m, { d: 1.9, side: 0.55 });
    await this.say('master', ['Where every scholar begins: outside, with something trying to eat you.', 'A question for later. Questions, like apples, are best when they have ripened.'][c], m);
    m.act('present');
    await this.say('master', 'Go on. The Wilds are waiting. And take the dog. He takes himself anyway.', m);
    this.shot(V(4.2, 3.6, 4.8), V(0, 3.2, -3), 48, 4); h.act('cheer');
    await this.narr('And so the adventure began.');
  }
  // ------------------------------------------------------------------ the tutorial's drag and drop
  rayWorld(objs) { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.cam); return r.intersectObjects(objs, true); }
  onDragStart() { if (!this.dragOK || !this.card) return false; const h = this.ray([this.card.mesh]); if (!h.length) return false; this.dragging = true; audio.play('card_pick'); return true; }
  onDrag() { if (!this.dragging) return; const p = this.ptr(3); this.card.target = { x: p.x, y: p.y, z: 4, rz: 0, s: 0.6 }; const hit = this.rayWorld(this.cons.map((c) => c.hit))[0]; const c = hit && this.cons.find((x) => x.hit === hit.object); for (const x of this.cons) x.glow(x === c); this.over = c || null; }
  onDragEnd() { if (!this.dragging) return; this.dragging = false; for (const x of this.cons) x.glow(false); if (this.over) this.dropOn(this.over.kind); else { this.card.target = { x: 0, y: -this.H + 3.2, z: 3, rz: 0, s: 0.75 }; audio.play('card_place', { vol: 0.5 }); } }
  dropOn(kind) {
    const c = this.cons?.find((x) => x.kind === kind); if (!c || !this.card || !this.onDropped) return;
    const at = this.engine.worldToUI(c.group.position.clone().add(V(0, 0.8, 0))); this.card.target = { x: at.x, y: at.y, z: 3, rz: 0.3, s: 0.04 }; audio.play('card_place'); audio.play('magic_shimmer', { vol: 0.6 });
    const card = this.card; setTimeout(() => { card.group.visible = false; c.merge(); this.burst(c.group.position.clone().add(V(0, 0.8, 0)), '#bff4ff', 24); c.glow(true); }, 380);
    const r = this.onDropped; this.onDropped = null; this.cardNote && (this.cardNote.group.visible = false); r(c);
    setTimeout(() => { if (card === this.card) { card.group.visible = true; card.target = { x: 0, y: -this.H - 5, z: 3, rz: 0, s: 0.75 }; } }, 2400);
  }
  onMove() { const hb = this.pickButton(); for (const b of this.buttons) b.hover = b === hb; if (this.card && !this.dragging) { const h = this.dragOK && this.ray([this.card.mesh]).length; this.card.target = { ...this.card.target, s: h ? 0.82 : 0.75 }; } return false; }
  onClickUI() { const hb = this.pickButton(); if (hb) { hb.press(); return true; } window.__story?.advance?.(); return false; }
  // ------------------------------------------------------------------ helpers
  tween(d, fn) { return new Promise((res) => { this.ups.push({ t: 0, d: d / (window.__storyFast > 1 ? Math.min(2, window.__storyFast) : 1), fn, res }); }); }
  burst(p, color = '#ffe08a', n = 20) { const P = this.parts; if (!P) return; const R = (a, b) => a + Math.random() * (b - a); P.burst(n, () => ({ pos: [p.x + R(-0.2, 0.2), p.y + R(-0.1, 0.3), p.z + R(-0.2, 0.2)], vel: [R(-1.6, 1.6), R(0.2, 2.2), R(-1.2, 1.2)], life: R(0.5, 1.1), size: R(10, 16), color, sprite: 'star4', drag: 1.4 })); }
  update(dt, t) {
    const c = this.cs; c.t += dt;
    if (c.mv) { const M = c.mv; M.t += dt; const u = ease(M.t / M.d); c.p.lerpVectors(M.p0, M.p, u); c.l.lerpVectors(M.l0, M.l, u); c.fov = M.f0 + (M.fov - M.f0) * u; if (M.t >= M.d) { c.mv = null; M.res(); } }
    const dr = this.frozen ? 0 : c.drift; this.cam.position.copy(c.p).add(V(Math.sin(c.t * 0.31) * 0.05 * dr, Math.sin(c.t * 0.23) * 0.035 * dr, 0)); this.cam.lookAt(c.l); if (Math.abs(this.cam.fov - c.fov) > 1e-3) { this.cam.fov = c.fov; this.cam.updateProjectionMatrix(); }
    this.cam.aspect = this.engine.aspect; this.cam.updateProjectionMatrix();
    for (const u of [...this.ups]) { u.t += dt; const k = Math.min(1, u.t / u.d); u.fn(k); if (k >= 1) { this.ups.splice(this.ups.indexOf(u), 1); u.res(); } }
    if (!this.frozen) { for (const a of this.actors) a.update(dt); this.hero?.update(dt); this.hero2?.update(dt); this.dog?.update(dt, t); this.dog2?.update(dt, t); this.O?.update?.(dt, t); this.parts?.update(dt, t); this.book?.update(dt); }
    else this.cosmic?.update(dt);
    if (this.cosmic?.setRes) { const b = this.engine.renderer.getDrawingBufferSize(new THREE.Vector2()); this.cosmic.setRes(b.x, b.y); }
    this.shards?.update(dt, this.frozen);
    for (const k of this.cons || []) { if (k.grow != null && k.grow < 1) { k.grow = Math.min(1, k.grow + dt * 1.6); k.group.scale.setScalar(ease(k.grow) * (1 + Math.sin(k.grow * Math.PI) * 0.15)); } k.update(dt, t); }
    if (this.toppleT != null) { this.toppleT = Math.min(1, this.toppleT + dt * 3); const ms = this.cons?.find((x) => x.kind === 'mass'); if (ms) topple(ms, dt, ease(this.toppleT)); }
    if (this.forb && this.card) { this.forb.t += dt; if (this.forb.t > 0.09) { this.forb.t = 0; this.forb.i = (this.forb.i + 1) % 3; this.card.front.map = this.forb.frames[this.forb.i]; this.card.front.needsUpdate = true; this.card.rz.vel += (Math.random() - 0.5) * 2; } }
    this.card?.update(dt, t); this.cardNote?.update(dt, null); this.hint?.update(dt, null); this.bars?.update(dt, this.H); this.btn?.update(dt, this.ptr(1));
    if (this.gapple) this.gapple.rotation.y += dt * 2;
  }
  dispose() { stopAll(); window.__storyBand = false; this.warp?.dispose(); this.warp = null; if (window.__prologue?.scene === this) window.__prologue = null; this.bars?.dispose?.(); super.dispose(); }
}

/** play the prologue on the running game; resolves when it ends or is skipped */
export async function playPrologue(game, opts = {}) {
  let done; await game.swap(async () => { const p = new PrologueScene(game, opts); game.scene = p; done = p.run(); await p.ready; }, { color: 0x000000 });
  await done;
}
