// Curiosity node: a little outdoor vignette, a parchment story, physical choice plaques, card offerings.
import * as THREE from 'three';
import { Paper, Strip, carvedSign } from '../ui3d/objects.js';
import { uiPos, mesh, turned, plainMat } from '../ui3d/craft.js';
import * as S from '../models/sculpt.js';
import { UIScreen, Button3D, Panel } from '../ui3d/widgets.js';
import { textPlane } from '../ui3d/kit.js';
import { buildStage, PROPS } from '../models/world.js';
import { realStage } from '../models/realworld.js';
import { loadModel } from '../gfx/assets.js';
import { createProfessor } from '../models/professor.js';
import { createCreature } from '../models/creatures.js';
import { ITEM_MODELS } from '../models/items3d.js';
import * as P3 from '../models/props3d.js';
import { EVENTS } from '../game/data/events.js';
import { mkCard, mkMove, itemChoices, mutateCard } from '../game/run.js';
import { ITEMS } from '../game/data/items.js';
import { BASICS } from '../game/data/cards.js';
import { DeckView } from './deckview.js';
import { tweens, Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vpick } from '../core/util.js';
import { eventIntro } from './cinematic.js';
import { save } from '../core/save.js';
import { eventCutscene, reactionCutscene } from './eventcine.js';
import { stageCast } from '../models/npcs/index.js';
import { Particles } from '../gfx/particles.js';
import { say as sayLine, stopAll as stopLines } from '../story/dialogue.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.7, ...o });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
function propFor(k) {
  const g = new THREE.Group();
  const add = (o, x = 0, y = 0, z = 0, s = 1) => { o.position.set(x, y, z); o.scale.multiplyScalar(s); g.add(o); return o; };
  switch (k) {
    case 'tree': add(PROPS.oliveTree(5, 1.4)); for (let i = 0; i < 6; i++) add(P3.apple(), Math.cos(i) * 1.6, 2.6 + (i % 2) * 0.6, Math.sin(i) * 1.2 + 0.6, 0.3); add(signPost('DO NOT SHAKE'), 1.6, 0, 1.2); break;
    case 'oracle': add(PROPS.amphora(3, 1.6), -0.8, 0, 0); add(P3.brazier(), 0.8, 1.0, 0.3, 1.2); add(P3.steamEngine(), 0, 1.3, -0.6, 1.4); break;
    case 'boulder': add(PROPS.rock(3, 2.4), -2, 0, -1.4); break; // Sisyphus' own boulder is part of the cast
    case 'amphorae': for (let i = 0; i < 5; i++) add(PROPS.amphora(i, 0.7), -1.6 + i * 0.8, 0, -0.8 + (i % 2) * 0.4); break;
    case 'wings': add(ITEM_MODELS.wings(), 0, 1.6, 0, 1.6); add(PROPS.rock(5, 2.2), 0, 0, -0.6); break;
    case 'statue': add(PROPS.column(2, 3), -1.6, 0, -3.4); add(PROPS.column(3, 3, true), 4.4, 0, -3.0); break; // no bust here (the garden has its own): nothing stands between Newton and the Sphinx
    case 'pond': add(PROPS.statue(9, 1.0), -1.6, 0, -0.8); break; // the pool itself is the stage's set-piece (models/places.js SETS.narcissus)
    case 'brazier': add(P3.brazier(), 0, 1.0, 0, 1.6); add(PROPS.rock(8, 1.8), 1.5, 0, -0.6); break;
    case 'bridge': for (let i = 0; i < 7; i++) mk(S.slab(0.5, 0.12, 2.2, { seed: i }), F({ color: 0x8a5634 }), g, -1.6 + i * 0.52, 0.5 + Math.sin(i / 6 * Math.PI) * 0.4, 0.4); break;
    case 'tub': mk(S.turn([[0.001, 0], [1.1, 0.0], [1.3, 0.7], [1.2, 0.75], [1.0, 0.2], [0.001, 0.2]], { sides: 10, seed: 3 }), F({ color: 0xf4f0e8, roughness: 0.3 }), g); mk(S.blob(1.0, 0.05, 1.0, { detail: 1, seed: 5 }), F({ color: 0x7cc6e8, roughness: 0.05 }), g, 0, 0.6, 0); break;
    case 'crate': add(ITEM_MODELS.schrodinger(), 0, 0.7, 0, 1.6); break;
    case 'gapple': mk(S.limb(0.6, 0.5, 0.55, { sides: 7, seed: 9 }), F({ color: 0x6e4024 }), g, 0, 0.6, 0); add(P3.apple({ kind: 'gold' }), 0, 0.9, 0, 0.8); break;
  }
  return g;
}
// where the camera dollies in the vignette: the prop's bulk, pulled towards any characters
function focusOf(prop, npcs) {
  const b = new THREE.Box3().setFromObject(prop); const c = b.isEmpty() ? new THREE.Vector3(-0.6, 1, 0) : b.getCenter(new THREE.Vector3()); const sz = b.isEmpty() ? new THREE.Vector3(3, 3, 3) : b.getSize(new THREE.Vector3());
  c.y = Math.min(2.0, Math.max(0.9, c.y)); for (const n of npcs) c.lerp(n.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 1 / (npcs.length + 1));
  return { focus: c, size: Math.min(6, Math.max(1.5, sz.x, sz.y)) };
}
function signPost(text) { const g = new THREE.Group(); mk(S.limb(1.4, 0.05, 0.05, { sides: 4, seed: 1 }), F({ color: 0x5e3a1c }), g, 0, 1.4, 0); const b = carvedSign(text); b.position.set(0, 1.2, 0.06); g.add(b); return g; }

export default class EventScene extends UIScreen {
  async enter(node) {
    const run = this.game.run; const seen = new Set(run.seenEvents);
    const pool = EVENTS.filter((e) => !seen.has(e.id) && save.unlocked('event:' + e.id)); const forced = EVENTS.find((e) => e.id === new URLSearchParams(location.search).get('event')); const ev = (this.ev = forced || run.rng.pick(pool.length ? pool : EVENTS)); run.seenEvents.push(ev.id);
    const j = this.game.journal; (j.events[ev.id] ||= 0); j.events[ev.id]++; this.game.saveJournal();
    // world
    const sc = (this.scene = new THREE.Scene()); let st; try { st = await realStage(ev.theme, 30 + ev.id.length, this.engine.renderer, { event: ev.id }); sc.environment = st.env; sc.environmentIntensity = 0.75; sc.background = st.background; } catch (e) { console.warn('event stage fallback', e); st = buildStage(ev.theme, 30 + ev.id.length); } sc.add(st.group); sc.fog = new THREE.Fog(0xe8c09a, 30, 95);
    const sun = new THREE.DirectionalLight(0xffd0a0, 3.2); sun.position.set(-8, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -8 }); sc.add(sun, new THREE.HemisphereLight(0xa8c8ff, 0x6a4a30, 1.1));
    this.camera = new THREE.PerspectiveCamera(32, this.engine.aspect, 0.1, 300); this.camera.position.set(-2.5, 3.0, 10.5); this.camLook = new THREE.Vector3(-1.2, 1.4, 0); this.camera.lookAt(this.camLook); this.camBase = this.camera.position.clone(); this.stage = st;
    this.prof = createProfessor(); this.prof.root.position.set(-4.4, 0, 1.2); this.prof.root.rotation.y = 0.6; sc.add(this.prof.root);
    const prop = propFor(ev.prop); prop.position.set(-0.6, 0, 0); sc.add(prop);
    this.npcs = []; if (ev.npc) for (let i = 0; i < (ev.npc === 'kobalos' ? 3 : ev.npc === 'satyr' ? 2 : 1); i++) { const c = createCreature(ev.npc); c.root.position.set(0.4 + i * 1.3, 0, -0.4 - (i % 2) * 0.6); c.root.rotation.y = -0.5; c.root.scale.setScalar(c.root.scale.x * (ev.npc === 'kobalos' ? 0.7 : 1)); sc.add(c.root); this.npcs.push(c); }
    this.measureProp = () => focusOf(prop, this.npcs); // measured when the camera turns to it (the models stream in)
    // the cast: the event's characters on its set (built lazily, this event only), plus fine particles for the film
    this.hAt = st.hAt || (() => 0); this.cast = { actors: {}, extras: [], names: {}, prop: {} };
    try { this.cast = stageCast(sc, ev, this.hAt); } catch (e) { console.warn('event cast failed', e); }
    if (ev.id === 'pan' && this.npcs[0]) { this.cast.actors.pan = this.npcs[0]; this.npcs[0].root.scale.multiplyScalar(1.12); }
    if (ev.id === 'toll' && this.npcs.length) this.cast.actors.toll = this.npcs[1] || this.npcs[0];
    if (ev.id === 'schrodinger') this.cast.prop.crate = prop;
    this.parts = new Particles(900); sc.add(this.parts.points); this.glow = new Particles(500, { additive: true }); sc.add(this.glow.points);
    this.engine.setWorld(sc, this.camera); this.engine.setFx({ bloom: [0.5, 0.6, 0.8], tilt: { focus: 0.55, width: 0.2, amount: 2.2 }, grade: { warmth: 0.35, vignette: 0.45 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('event'); audio.setAmbSet(['wilderness']);
    // UI
    const W = this.W, H = this.H;
    this.panel = new Panel(ev.title, [ev.text], { w: 15, h: 8.2, titleColor: '#5a1a22' }); uiPos(this.panel.group, W - 8.75, H - 1.0 - this.panel.scroll.h / 2, 2); this.root.add(this.panel.group);
    this.choiceBtns = ev.choices.map((c, i) => { const ok = !c.if || c.if(run); const b = new Button3D(c.label, () => this.choose(c), { w: 14, h: 1.5, size: 64, sub: c.sub, color: c.slot ? 'purple' : 'wood', disabled: !ok }); return this.addButton(b, W - 8.4, H - 10.9 - i * 1.85, 2); });
    // the vignette is staged as a cinematic (walk-in, dolly onto the curiosity); the story and the choices wait for it
    this.panel.group.visible = false; for (const b of this.choiceBtns) b.group.visible = false;
    try { this.cine = eventCutscene(this, ev, { onReveal: () => this.revealStory() }) || eventIntro(this, { title: ev.title, text: ev.text, onReveal: () => this.revealStory() }); this.cine.done.then(() => { this.cine = null; }); }
    catch (e) { console.warn('event intro skipped', e); this.cine = null; this.revealStory(); }
  }
  // the parchment unrolls, then each choice pops up in turn as a physical plaque
  revealStory() {
    if (this.revealed) return; this.revealed = true;
    this.panel.group.visible = true; this.panel.scroll.open.value = 0.02; this.panel.scroll.kick?.(0.6); audio.play('paper_rustle');
    this.choiceBtns.forEach((b, i) => setTimeout(() => { if (!this.root.parent) return; b.group.visible = true; b.pop.value = 0.05; b.pop.vel = 0; b.rz.kick((i % 2 ? 1 : -1) * 9); audio.play('card_place', { vol: 0.5 }); }, 380 + i * 150));
    this.prof.setExpr('think'); this.say(vpick(['Fascinating. And probably lethal.', 'An experiment! Hold my apple.', 'Ah. The universe is being weird again.']));
  }
  say(text) { this.prof.talk(Math.min(4, text.length * 0.06)); sayLine('newton', text, { anchor: (o) => this.prof.headWorld(o).add(new THREE.Vector3(0, 0.3, 0)), wait: false }); } // voiced, inked onto a scrap at his head
  ctx() {
    const run = this.game.run; const game = this.game; const P = run.player;
    const learnItem = (id) => { const j = game.journal; j.items[id] = (j.items[id] || 0) + 1; game.saveJournal(); };
    return {
      run, rng: run.rng,
      gold: (n) => { run.gold = Math.max(0, run.gold + n); audio.play(n > 0 ? 'coins_handful' : 'coin_single'); },
      heal: (n) => { P.hp = Math.min(P.maxHp, P.hp + n); audio.play('heal'); },
      hurt: (n) => { P.hp = Math.max(1, P.hp - n); audio.play('hit_wood'); this.prof.act('hurt'); this.engine.shake(0.3); },
      maxhp: (n) => { P.maxHp = Math.max(10, P.maxHp + n); P.hp = Math.max(1, Math.min(P.maxHp, P.hp + Math.max(0, n))); },
      addCard: (id, up = 0) => { run.deck.push(mkCard(id, up)); audio.play('card_flip'); },
      addMove: (ids, name) => { run.deck.push(mkMove(ids, name)); audio.play('card_flip'); },
      addItem: (idOrPool) => { const id = ITEMS[idOrPool] ? idOrPool : itemChoices(run, idOrPool, 1)[0]; if (!id || run.items.includes(id)) return false; run.items.push(id); learnItem(id); audio.play('magic_shimmer'); this.gotItem = id; return true; },
      upgrade: (f) => { const c = run.rng.pick(run.deck.filter((c) => !c.up && f(c))); if (!c) return null; c.up = 1; return c.name || BASICS[c.id]?.name || c.id; },
      upgradeAll: (f) => { let n = 0; for (const c of run.deck) if (!c.up && f(c)) { c.up = 1; n++; } return n; },
      mutate: (c) => { const t = c || run.rng.pick(run.deck.filter((x) => x.type === 'basic')); return t ? mutateCard(run, t) : null; },
      remove: (c) => { run.deck = run.deck.filter((x) => x !== c && x.uid !== c.uid); },
      removeRandom: () => { const c = run.rng.pick(run.deck); run.deck = run.deck.filter((x) => x !== c); return c.name || BASICS[c.id]?.name || c.id; },
      dupe: (c) => { run.deck.push({ ...JSON.parse(JSON.stringify(c)), uid: 'c' + Math.random().toString(36).slice(2) }); },
      learn: () => {},
    };
  }
  async choose(c) {
    if (this.chosen) return;
    if (c.slot) { const dv = new DeckView(this.game, this.root, this.game.run.deck, { title: c.slot.prompt, filter: c.slot.filter, onDone: (sel) => sel[0] && this.resolve(c, sel[0]) }); this.deck = dv; dv.open(); return; }
    if (c.minigame === 'rhythm') { const score = await this.rhythm(); return this.resolve(c, null, score); }
    this.resolve(c);
  }
  resolve(c, card, score) {
    this.chosen = true; audio.play('stamp'); this.reactT = performance.now(); // the camera leans in on Sir Isaac's reaction
    const text = c.run(this.ctx(), card, score);
    for (const b of this.choiceBtns) b.setDisabled(true);
    const after = () => {
      if (!this.root.parent) return; this.cine = null; this.panel.group.visible = true; for (const b of this.choiceBtns) b.group.visible = true;
      this.panel.set(this.ev.title, [text], '#1e5a5a'); uiPos(this.panel.group, this.W - 8.75, this.H - 1.0 - this.panel.scroll.h / 2, 2);
      this.prof.setExpr(/damage|bites|lose|terrible/i.test(text) ? 'annoyed' : 'delight');
      this.say(vpick(['Noted. Filed. Mildly traumatised.', 'Science marches on. Limping.', 'Write that down. No, I will.']));
      this.addButton(new Button3D('Continue', () => this.leave(), { w: 5, h: 1.3, size: 58, color: 'teal' }), this.W - 8.4, -this.H + 1.6, 2);
    };
    // the consequence, filmed: the parchment and plaques step aside for a short reaction scene
    const idx = this.ev.choices.indexOf(c); this.panel.group.visible = false; for (const b of this.choiceBtns) b.group.visible = false; stopLines();
    try { this.cine = reactionCutscene(this, this.ev, idx, text); this.cine.done.then(after); } catch (e) { console.warn('reaction skipped', e); after(); }
  }
  // Pan's jam: click when the ring meets the beat (4 beats)
  rhythm() {
    return new Promise((resolve) => {
      const g = new THREE.Group(); g.position.set(-2, 0, 8); this.root.add(g); let score = 0, beat = 0;
      const hoop = (r, w, kind) => { const prof = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; prof.push([r + Math.cos(a) * w, Math.sin(a) * w]); } const m = mesh(turned(prof, 64, { smooth: false }), plainMat(kind), g, { ink: 0.035 }); m.rotation.x = Math.PI / 2; return m; };
      const target = hoop(1.5, 0.13, 'brass'); const ring = hoop(1.5, 0.08, 'oak'); void target;
      const label = new Strip(['Click on the beat!'], { maxW: 10 }); label.group.position.y = 2.6; g.add(label.group); this.rhythmLabel = label;
      const st = { k: 0 }; this.rhythmHit = () => { const d = Math.abs(1 - ring.scale.x); if (d < 0.18) { score++; audio.play('pan_flute', { minGap: 0 }); label.set([[['Swing!', '#3e6a22']]]); } else { audio.play('ui_error'); label.set([[['Off-beat!', '#8f2a2e']]]); } };
      const next = () => { if (beat++ >= 4) { this.rhythmHit = null; this.root.remove(g); resolve(score); return; } st.k = 0; tweens.to(st, { k: 1 }, 0.9, { ease: 'linear', onUpdate: () => { const s = 3 - st.k * 2.4; ring.scale.setScalar(s); } }).then(() => { audio.play('wood_knock', { vol: 0.6 }); next(); }); };
      next();
    });
  }
  onClick() { if (this.rhythmHit) { this.rhythmHit(); return true; } }
  leave() { if (this.leaving) return; this.leaving = true; this.game.afterNode(); }
  dispose() { this.cine?.abort(); this.cine = null; stopLines(); super.dispose(); }
  update(dt, t) {
    this.prof.update(dt); for (const n of this.npcs) n.update(dt); for (const a of Object.values(this.cast?.actors || {})) if (a !== this.prof && !this.npcs.includes(a)) a.update(dt);
    this.parts?.update(dt, t); this.glow?.update(dt, t);
    if (!this.cine && this.revealed) { // a slow breathing drift; after a choice, a short push-in on Sir Isaac and back
      const x = this.reactT ? (performance.now() - this.reactT) / 2600 : 1; const sm = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }; const k = x < 1 ? sm(x / 0.25) * (1 - sm((x - 0.6) / 0.4)) : 0;
      const head = this.prof.headWorld(new THREE.Vector3());
      this.camera.position.set(this.camBase.x + Math.sin(t * 0.2) * 0.18, this.camBase.y + Math.sin(t * 0.16) * 0.08, this.camBase.z).lerp(head.clone().add(new THREE.Vector3(1.6, 0.1, 5.5)), 0.4 * k);
      this.camera.lookAt(this.camLook.clone().lerp(head, 0.45 * k));
    }
    this.panel.update(dt, this.ptr(2)); this.updateUI(dt); this.deck?.update(dt, t); this.rhythmLabel?.update(dt, null);
  }
}

export function wrapLines(t, n) { const w = t.split(' '); const out = []; let c = ''; for (const x of w) { if ((c + ' ' + x).trim().length > n) { out.push(c.trim()); c = x; } else c += ' ' + x; } if (c.trim()) out.push(c.trim()); return out; }
