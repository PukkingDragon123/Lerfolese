// Curiosity node: a little outdoor vignette, a parchment story, physical choice plaques, card offerings.
import * as THREE from 'three';
import { Paper, Strip } from '../ui3d/objects.js';
import { uiPos } from '../ui3d/craft.js';
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

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.7, ...o });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
function propFor(k) {
  const g = new THREE.Group();
  const add = (o, x = 0, y = 0, z = 0, s = 1) => { o.position.set(x, y, z); o.scale.multiplyScalar(s); g.add(o); return o; };
  switch (k) {
    case 'tree': add(PROPS.oliveTree(5, 1.4)); for (let i = 0; i < 6; i++) add(P3.apple(), Math.cos(i) * 1.6, 2.6 + (i % 2) * 0.6, Math.sin(i) * 1.2 + 0.6, 0.3); add(signPost('DO NOT SHAKE'), 1.6, 0, 1.2); break;
    case 'oracle': add(PROPS.amphora(3, 1.6), -0.8, 0, 0); add(P3.brazier(), 0.8, 1.0, 0.3, 1.2); add(P3.steamEngine(), 0, 1.3, -0.6, 1.4); break;
    case 'boulder': add(P3.stone({ seed: 12 }), 0, 0.6, 0, 1.8); add(PROPS.rock(3, 2.4), -2, 0, -1.4); break;
    case 'amphorae': for (let i = 0; i < 5; i++) add(PROPS.amphora(i, 0.7), -1.6 + i * 0.8, 0, -0.8 + (i % 2) * 0.4); break;
    case 'wings': add(ITEM_MODELS.wings(), 0, 1.6, 0, 1.6); add(PROPS.rock(5, 2.2), 0, 0, -0.6); break;
    case 'statue': add(PROPS.statue(4, 1.3), 0, 0, -0.4); add(PROPS.column(2, 3), -1.8, 0, -1); add(PROPS.column(3, 3, true), 1.8, 0, -1); break;
    case 'pond': { const p = mk(S.blob(2.4, 0.05, 1.6, { detail: 1, seed: 4, amt: 0.2 }), F({ color: 0x2f7ab0, roughness: 0.05, metalness: 0.4 }), g, 0, 0.05, 0.5); p.castShadow = false; add(PROPS.statue(9, 1.0), -1.6, 0, -0.8); break; }
    case 'brazier': add(P3.brazier(), 0, 1.0, 0, 1.6); add(PROPS.rock(8, 1.8), 1.5, 0, -0.6); break;
    case 'bridge': for (let i = 0; i < 7; i++) mk(S.slab(0.5, 0.12, 2.2, { seed: i }), F({ color: 0x8a5634 }), g, -1.6 + i * 0.52, 0.5 + Math.sin(i / 6 * Math.PI) * 0.4, 0.4); break;
    case 'tub': mk(S.turn([[0.001, 0], [1.1, 0.0], [1.3, 0.7], [1.2, 0.75], [1.0, 0.2], [0.001, 0.2]], { sides: 10, seed: 3 }), F({ color: 0xf4f0e8, roughness: 0.3 }), g); mk(S.blob(1.0, 0.05, 1.0, { detail: 1, seed: 5 }), F({ color: 0x7cc6e8, roughness: 0.05 }), g, 0, 0.6, 0); break;
    case 'crate': add(ITEM_MODELS.schrodinger(), 0, 0.7, 0, 1.6); break;
    case 'gapple': mk(S.limb(0.6, 0.5, 0.55, { sides: 7, seed: 9 }), F({ color: 0x6e4024 }), g, 0, 0.6, 0); add(P3.apple({ kind: 'gold' }), 0, 0.9, 0, 0.8); break;
  }
  return g;
}
function signPost(text) { const g = new THREE.Group(); mk(S.limb(1.4, 0.05, 0.05, { sides: 4, seed: 1 }), F({ color: 0x5e3a1c }), g, 0, 1.4, 0); const b = textPlane([[[text, '#2a160c']]], { w: 1.6, h: 0.6, font: 'Pixelify', size: 70, weight: 700, basic: false, bg: (c, w, h) => { c.fillStyle = '#c99254'; c.fillRect(0, 0, w, h); } }); b.position.set(0, 1.2, 0.06); g.add(b); return g; }

export default class EventScene extends UIScreen {
  async enter(node) {
    const run = this.game.run; const seen = new Set(run.seenEvents);
    const pool = EVENTS.filter((e) => !seen.has(e.id)); const ev = (this.ev = run.rng.pick(pool.length ? pool : EVENTS)); run.seenEvents.push(ev.id);
    const j = this.game.journal; (j.events[ev.id] ||= 0); j.events[ev.id]++; this.game.saveJournal();
    // world
    const sc = (this.scene = new THREE.Scene()); let st; try { st = await realStage(ev.theme, 30 + ev.id.length, this.engine.renderer); sc.environment = st.env; sc.environmentIntensity = 0.75; sc.background = st.background; } catch (e) { st = buildStage(ev.theme, 30 + ev.id.length); } sc.add(st.group); sc.fog = new THREE.Fog(0xe8c09a, 30, 95);
    const sun = new THREE.DirectionalLight(0xffd0a0, 3.2); sun.position.set(-8, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -8 }); sc.add(sun, new THREE.HemisphereLight(0xa8c8ff, 0x6a4a30, 1.1));
    this.camera = new THREE.PerspectiveCamera(32, this.engine.aspect, 0.1, 300); this.camera.position.set(-2.5, 3.0, 10.5); this.camera.lookAt(-1.2, 1.4, 0);
    this.prof = createProfessor(); this.prof.root.position.set(-4.4, 0, 1.2); this.prof.root.rotation.y = 0.6; sc.add(this.prof.root);
    const prop = propFor(ev.prop); prop.position.set(-0.6, 0, 0); sc.add(prop);
    this.npcs = []; if (ev.npc) for (let i = 0; i < (ev.npc === 'kobalos' ? 3 : ev.npc === 'satyr' ? 2 : 1); i++) { const c = createCreature(ev.npc); c.root.position.set(0.4 + i * 1.3, 0, -0.4 - (i % 2) * 0.6); c.root.rotation.y = -0.5; c.root.scale.setScalar(c.root.scale.x * (ev.npc === 'kobalos' ? 0.7 : 1)); sc.add(c.root); this.npcs.push(c); }
    this.engine.setWorld(sc, this.camera); this.engine.setFx({ bloom: [0.5, 0.6, 0.8], tilt: { focus: 0.55, width: 0.2, amount: 2.2 }, grade: { warmth: 0.35, vignette: 0.45 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('event'); audio.setAmbSet(['wilderness']);
    // UI
    const W = this.W, H = this.H;
    this.panel = new Panel(ev.title, [ev.text], { w: 15, h: 8.2, titleColor: '#5a1a22' }); uiPos(this.panel.group, W - 8.4, H - 1.0 - this.panel.scroll.h / 2, 2); this.root.add(this.panel.group);
    this.choiceBtns = ev.choices.map((c, i) => { const ok = !c.if || c.if(run); const b = new Button3D(c.label, () => this.choose(c), { w: 14, h: 1.5, size: 64, sub: c.sub, color: c.slot ? 'purple' : 'wood', disabled: !ok }); return this.addButton(b, W - 8.4, H - 10.9 - i * 1.85, 2); });
    this.prof.setExpr('think'); this.say(vpick(['Fascinating. And probably lethal.', 'An experiment! Hold my strings.', 'Ah. The universe is being weird again.']));
  }
  say(text) { this.prof.talk(1.6); if (!this.bubble) { this.bubble = new Paper({ font: 'hand', maxW: 9, tail: true, pin: false, kind: 'scrap' }); this.root.add(this.bubble.group); } this.bubble.show([[[text, '#2a160c']]], 0, 0, 6); this.placeBubble(); audio.play('wood_knock', { vol: 0.35 }); }
  placeBubble() { const p = this.engine.worldToUI(this.prof.headWorld(new THREE.Vector3())); const b = this.bubble; b.group.position.set(p.x + b.w / 2 - 0.3, p.y + 0.9 + b.h - 0.22, 6); }
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
    this.chosen = true; audio.play('stamp');
    const text = c.run(this.ctx(), card, score);
    for (const b of this.choiceBtns) b.setDisabled(true);
    this.panel.set(this.ev.title, [text], '#1e5a5a'); uiPos(this.panel.group, this.W - 8.4, this.H - 1.0 - this.panel.scroll.h / 2, 2);
    this.prof.setExpr(/damage|bites|lose|terrible/i.test(text) ? 'annoyed' : 'delight'); this.prof.act(/damage/.test(text) ? 'hurt' : 'cheer');
    this.say(vpick(['Noted. Filed. Mildly traumatised.', 'Science marches on. Limping.', 'Write that down. No, I will.']));
    this.addButton(new Button3D('Continue', () => this.leave(), { w: 5, h: 1.3, size: 58, color: 'teal' }), this.W - 8.4, -this.H + 1.6, 2);
  }
  // Pan's jam: click when the ring meets the beat (4 beats)
  rhythm() {
    return new Promise((resolve) => {
      const g = new THREE.Group(); g.position.set(-2, 0, 8); this.root.add(g); let score = 0, beat = 0;
      const target = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false })); g.add(target);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0x8fe3ff, toneMapped: false, transparent: true })); g.add(ring);
      const label = new Strip(['Click on the beat!'], { maxW: 10 }); label.group.position.y = 2.6; g.add(label.group); this.rhythmLabel = label;
      const st = { k: 0 }; this.rhythmHit = () => { const d = Math.abs(1 - ring.scale.x); if (d < 0.18) { score++; audio.play('pan_flute', { minGap: 0 }); label.set([[['Swing!', '#3e6a22']]]); } else { audio.play('ui_error'); label.set([[['Off-beat!', '#8f2a2e']]]); } };
      const next = () => { if (beat++ >= 4) { this.rhythmHit = null; this.root.remove(g); resolve(score); return; } st.k = 0; tweens.to(st, { k: 1 }, 0.9, { ease: 'linear', onUpdate: () => { const s = 3 - st.k * 2.4; ring.scale.setScalar(s); } }).then(() => { audio.play('wood_knock', { vol: 0.6 }); next(); }); };
      next();
    });
  }
  onClick() { if (this.rhythmHit) { this.rhythmHit(); return true; } }
  leave() { if (this.leaving) return; this.leaving = true; this.game.afterNode(); }
  update(dt, t) {
    this.prof.update(dt); for (const n of this.npcs) n.update(dt);
    this.panel.update(dt, this.ptr(2)); this.updateUI(dt); this.deck?.update(dt, t); this.rhythmLabel?.update(dt, null);
    if (this.bubble) { this.placeBubble(); this.bubble.update(dt, null); }
  }
}

export function wrapLines(t, n) { const w = t.split(' '); const out = []; let c = ''; for (const x of w) { if ((c + ' ' + x).trim().length > n) { out.push(c.trim()); c = x; } else c += ' ' + x; } if (c.trim()) out.push(c.trim()); return out; }
