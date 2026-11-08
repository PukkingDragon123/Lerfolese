// Battle rules. Presentation is injected via `fx` (all hooks async & optional), so this runs headless too.
import { ENEMIES } from './data/enemies.js';
import { BASICS } from './data/cards.js';
import { computeMove, flatten, baseOf } from './combos.js';
import { uid } from '../core/util.js';

const NOOP = new Proxy({}, { get: () => async () => {} });
export const HAND_MAX = 10;
export const HELD_MAX = 3; // things manifested in mid-air at once

export class Battle {
  constructor({ run, enemies, rng, fx, kind = 'normal' }) {
    this.run = run; this.rng = rng; this.fx = fx || NOOP; this.kind = kind;
    const p = run.player;
    this.player = { hp: p.hp, maxHp: p.maxHp, block: 0, st: {}, keepBlock: false, retain: false };
    this.enemies = []; this.field = []; this.powers = {}; this.turn = 0; this.phase = 'start';
    this.redraws = 3 + (this.has('owl') ? 1 : 0);
    this.draw = this.rng.shuffle(run.deck.map((c) => ({ ...c, petrified: false })));
    this.hand = []; this.discard = []; this.exhaust = []; this.lost = []; this.held = [];
    this.flags = { wingsUsed: false, heatCount: 0, sparkCharge: 0, firstMoveDone: false, movesThisTurn: [], wineskinUsed: false, lensOn: new Set() };
    for (const id of enemies) this.spawnEnemy(id);
    this.log = [];
  }
  has(item) { return this.run.items.includes(item); }

  spawnEnemy(id, opts = {}) {
    const def = ENEMIES[id]; const hp = this.rng.int(def.hp[0], def.hp[1]);
    const e = { uid: uid('e'), id, def, hp, maxHp: hp, block: 0, st: {}, turn: 0, alive: true, intent: null, loot: null, lootTurns: 0, pendingHeads: 0, parent: opts.parent || null, slot: opts.slot ?? this.enemies.length };
    this.enemies.push(e);
    if (def.heads) for (let i = 0; i < def.heads; i++) this.spawnEnemy('hydra_head', { parent: e.uid, slot: i });
    return e;
  }
  alive() { return this.enemies.filter((e) => e.alive); }
  get over() { return this.phase === 'won' || this.phase === 'lost'; }

  async start() {
    this.phase = 'start';
    if (this.has('pan_flute')) for (const e of this.alive()) { this.addSt(e, 'weak', 1); this.addSt(e, 'dizzy', 1); }
    if (this.has('schrodinger')) this.hand.push(this.slotOf([{ uid: uid('c'), id: 'superposition', up: 0, temp: true }]));
    for (const e of this.alive()) this.pickIntent(e);
    await this.fx.battleStart?.(this);
    await this.startPlayerTurn();
  }

  // ------------------------------------------------------------------ player turn
  async startPlayerTurn() {
    if (this.over) return;
    this.turn++; this.phase = 'player'; this.flags.movesThisTurn = []; this.flags.lensOn = new Set();
    const P = this.player;
    if (!P.keepBlock) P.block = 0; P.keepBlock = false;
    for (const k of ['thorns', 'kindle', 'momentum']) delete P.st[k];
    if (P.st.venom) { await this.hurtPlayer(P.st.venom, { source: null, pure: true, kind: 'venom' }); P.st.venom--; if (P.st.venom <= 0) delete P.st.venom; if (this.over) return; }
    if (this.has('wineskin')) await this.healPlayer(2);
    if (this.powers.orbit !== undefined || this.field.some((f) => f.type === 'moon')) await this.gainBlock(this.powers.orbit ? 6 : 4, 'moon');
    if (this.powers.gravitation !== undefined && this.alive().length) {
      const t = this.rng.pick(this.alive()); const m = this.powers.gravitation ? 2 : 1;
      await this.fx.fallingApple?.(t); await this.damageEnemy(t, m * 6, { fall: true, kind: 'apple' });
    }
    for (const f of [...this.field]) await this.fieldTurnStart(f);
    if (this.checkEnd()) return;
    let n = 6 + (this.has('thread') ? 1 : 0) + (this.turn === 1 && this.has('antikythera') ? 1 : 0);
    if (!P.retain) { /* normal */ } else n = Math.max(0, n - this.handCount());
    P.retain = false;
    await this.drawCards(n);
    if (P.st.petrify) { await this.petrifyHand(P.st.petrify); delete P.st.petrify; }
    await this.fx.playerTurn?.(this);
  }
  handCount() { return this.hand.reduce((s, sl) => s + sl.cards.length, 0); }
  slotOf(cards) { return { uid: uid('s'), cards }; }

  async drawCards(n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      if (this.handCount() >= HAND_MAX) break;
      if (!this.draw.length) { if (!this.discard.length) break; this.draw = this.rng.shuffle(this.discard.splice(0)); await this.fx.reshuffle?.(this); }
      const c = this.draw.pop(); const s = this.slotOf([c]); this.hand.push(s); drawn.push(s);
    }
    if (drawn.length) await this.fx.drew?.(drawn);
    return drawn;
  }
  async petrifyHand(n) {
    const cands = this.hand.flatMap((s) => s.cards).filter((c) => c.type !== 'power' && c.id !== 'stone' && !c.petrified);
    const picked = this.rng.shuffle(cands).slice(0, n); for (const c of picked) c.petrified = true;
    if (picked.length) await this.fx.petrified?.(picked);
  }

  // ------------------------------------------------------------------ combining
  findSlot(id) { return this.hand.find((s) => s.uid === id); }
  canCombine(a, b) { const A = this.findSlot(a), B = this.findSlot(b); if (!A || !B || A === B) return false; return ![...A.cards, ...B.cards].some((c) => c.type === 'power'); }
  combine(a, b) {
    if (!this.canCombine(a, b)) return null;
    const A = this.findSlot(a), B = this.findSlot(b);
    B.cards.push(...A.cards); this.hand = this.hand.filter((s) => s !== A); return B;
  }
  split(id) {
    const S = this.findSlot(id); if (!S || S.cards.length < 2) return [];
    const i = this.hand.indexOf(S); const parts = S.cards.map((c) => this.slotOf([c]));
    this.hand.splice(i, 1, ...parts); return parts;
  }
  reorder(id, toIndex) { const S = this.findSlot(id); if (!S) return; this.hand = this.hand.filter((s) => s !== S); this.hand.splice(Math.max(0, Math.min(this.hand.length, toIndex)), 0, S); }

  mods(extra = {}) {
    const m = { gravityDv: 0, thermo: 0, firstLaw: 0, ...extra };
    if (this.powers.gravitation !== undefined) m.gravityDv += this.powers.gravitation ? 3 : 2;
    if (this.powers.thermo !== undefined) m.thermo = this.powers.thermo ? 2 : 1;
    if (this.powers.first_law !== undefined) m.firstLaw = this.powers.first_law ? 2 : 1;
    if (this.powers.calculus !== undefined && !this.flags.movesThisTurn.length) { const k = this.powers.calculus ? 3 : 2; m.firstMove = { dm: k, dv: k }; }
    if (this.has('lever')) m.leverForce = true;
    if (this.has('horn')) m.hornForce = this.player.hp < this.player.maxHp / 2 ? 4 : 2;
    if (this.has('plumb_bob')) m.plumb = true;
    const P = this.player; if (P.st.momentum) m.momentum = P.st.momentum; if (P.st.charged) m.charged = P.st.charged; if (P.st.kindle) m.kindle = P.st.kindle;
    return m;
  }
  moveOf(slot) { const comps = flatten(slot.cards); return comps.length ? computeMove(comps, this.mods()) : null; }

  // what happens if `slot` is dropped on `target` ({type:'enemy',uid}|{type:'self'}|{type:'field'}|{type:'object',uid}|{type:'bin'})
  preview(slotId, target) {
    const s = this.findSlot(slotId); if (!s || this.phase !== 'player') return { ok: false };
    if (target.type === 'bin') return { ok: this.redraws > 0, kind: 'bin', text: this.redraws > 0 ? `Second Thought: redraw ${s.cards.length}` : 'No Second Thoughts left' };
    const power = s.cards.find((c) => c.type === 'power');
    if (power) return { ok: s.cards.length === 1, kind: 'power', text: s.cards.length === 1 ? 'Enact this Law' : 'Laws cannot be mixed' };
    const mv = this.moveOf(s); if (!mv) return { ok: false };
    if (target.type === 'air') { const why = this.manifestBlock(s); return { ok: !why, move: mv, kind: 'manifest', text: why || `Manifest: ${mv.name}` }; }
    if (target.type === 'held') { const o = this.held.find((x) => x.uid === target.uid); if (!o) return { ok: false }; const nm = this.heldMove(o, flatten(s.cards)); const t = this.heldTarget(o, target.aim); return { ok: true, move: nm, kind: 'manipulate', held: o, target: t, est: t && nm.attack.valid ? this.estimate(nm, t) : null, text: nm.name }; }
    if (target.type === 'enemy') { const e = this.enemies.find((x) => x.uid === target.uid && x.alive); if (!e || !mv.attack.valid) return { ok: false, move: mv, kind: 'attack', text: 'Nothing to throw' }; return { ok: true, move: mv, kind: 'attack', est: this.estimate(mv, e) }; }
    if (target.type === 'self') return { ok: mv.self.valid, move: mv, kind: 'self' };
    if (target.type === 'field') return { ok: mv.field.valid, move: mv, kind: 'field', text: mv.field.valid ? `Place: ${mv.field.name}` : 'Nothing to place' };
    if (target.type === 'object') { const f = this.field.find((x) => x.uid === target.uid); const r = f && this.objectReaction(f, mv, true); return { ok: !!r, move: mv, kind: 'object', text: r ? r.text : 'No reaction' }; }
    return { ok: false };
  }
  estimate(mv, e) {
    const a = mv.attack; let per = a.perHit; if (e.st.vulnerable) per = Math.round(per * 1.5);
    if (e.def.thickHide && !a.fall && this.headsAlive(e) >= 3) per = Math.round(per * 0.5);
    let zap = a.charge ? a.charge * (e.st.wet || a.wet ? 2 : 1) : 0;
    return { perHit: per, hits: a.hits, total: per * a.hits + zap, spread: a.spread, zap };
  }
  headsAlive(body) { return this.enemies.filter((x) => x.alive && x.parent === body.uid).length; }

  async play(slotId, target) {
    const pv = this.preview(slotId, target); if (!pv.ok) { await this.fx.invalid?.(pv.text); return false; }
    if (pv.kind === 'manifest') return !!(await this.manifest(slotId, target.pos, target.aim));
    if (pv.kind === 'manipulate') return this.manipulate(target.uid, slotId, target.aim);
    const s = this.findSlot(slotId); this.hand = this.hand.filter((x) => x !== s);
    if (pv.kind === 'bin') {
      this.redraws--; for (const c of s.cards) if (!c.temp) this.discard.push(c);
      await this.fx.binned?.(s); await this.drawCards(s.cards.length); return true;
    }
    if (pv.kind === 'power') {
      const c = s.cards[0]; this.powers[c.id] = c.up || 0; this.exhaust.push(c);
      if (c.id === 'orbit') this.addField('moon', { turns: 0 });
      await this.fx.power?.(c); return true;
    }
    const mv = pv.move; const n = mv.n;
    await this.fx.played?.(s, mv, target, pv.kind);
    this.discover(mv);
    for (const c of s.cards) { if (c.temp) continue; this.discard.push(c); }
    // consume one-shot buffs
    const P = this.player;
    if (pv.kind === 'attack' || (pv.kind === 'object')) { delete P.st.momentum; delete P.st.charged; }
    const wine = this.has('wineskin') && !this.flags.wineskinUsed && pv.kind === 'attack';
    if (wine) { this.flags.wineskinUsed = true; const al = this.alive(); target = { type: 'enemy', uid: this.rng.pick(al).uid }; }
    if (pv.kind === 'attack') await this.attack(mv, this.enemies.find((e) => e.uid === target.uid), slotId);
    else if (pv.kind === 'self') await this.applySelf(mv);
    else if (pv.kind === 'field') await this.placeField(mv);
    else if (pv.kind === 'object') await this.objectReaction(this.field.find((x) => x.uid === target.uid), mv, false);
    await this.afterMove(mv, pv.kind, target);
    this.checkEnd();
    return true;
  }
  // per-card triggers once a Move has resolved (shared by played cards and released objects)
  async afterMove(mv, kind, target) {
    const comps = mv.comps; const cnt = (b) => comps.filter((c) => baseOf(c.id) === b).length;
    if (cnt('heat')) { this.flags.heatCount += cnt('heat'); if (this.has('wings') && this.flags.heatCount >= 2 && !this.flags.wingsMelted) { this.flags.wingsMelted = true; await this.fx.bark?.('player', 'My wings! Those were load-bearing!'); await this.hurtPlayer(6, { pure: true }); } }
    if (cnt('spark') && this.has('leyden')) { this.flags.sparkCharge += cnt('spark'); if (this.flags.sparkCharge >= 4) { this.flags.sparkCharge -= 4; await this.fx.leyden?.(); for (const e of this.alive()) await this.damageEnemy(e, 12 * (e.st.wet ? 2 : 1), { kind: 'zap', pierce: true }); } }
    if (cnt('gravity') && (this.powers.orbit !== undefined || this.field.some((f) => f.type === 'moon')) && this.alive().length) { const t = this.rng.pick(this.alive()); await this.fx.moonStrike?.(t); await this.damageEnemy(t, this.powers.orbit ? 12 : 8, { fall: true }); }
    const total = mv.attack.total; this.flags.movesThisTurn.push({ mv, total, target, kind });
    this.flags.firstMoveDone = true;
    if (mv.attack.recoil && kind === 'attack') await this.hurtPlayer(mv.attack.recoil, { pure: true });
  }

  // ------------------------------------------------------------------ manifest -> manipulate -> release
  // Matter (or Energy) dropped in mid-air hangs there as a held object; Laws dropped on it join its stack and wind it
  // up (+1 v per card); when the turn ends every held object is released in order and strikes as a Move.
  manifestBlock(s) {
    if (this.phase !== 'player') return 'Not now';
    if (s.cards.some((c) => c.type === 'power')) return 'Laws of nature cannot be held in the air';
    if (!flatten(s.cards).some((c) => ['matter', 'energy'].includes(BASICS[c.id]?.kind))) return 'Only Matter or Energy can be manifested';
    if (this.held.length >= HELD_MAX) return `Already ${HELD_MAX} things hang in the air`;
    return null;
  }
  // the Move a held object will strike with (extra cards / wind-up may be previewed)
  heldMove(o, extra = []) {
    const comps = [...o.comps, ...extra]; const wind = o.wind + extra.filter((c) => BASICS[c.id]?.kind !== 'matter').length;
    const m = this.mods(); m.momentum = (m.momentum || 0) + wind; return computeMove(comps, m);
  }
  heldTarget(o, aim) { const al = this.alive(); return al.find((e) => e.uid === (aim || o.target)) || al.find((e) => !e.def.isHead) || al[0] || null; }
  heldPreview(o) { const mv = this.heldMove(o); const t = this.heldTarget(o); return { mv, target: t, est: t && mv.attack.valid ? this.estimate(mv, t) : null }; }
  async manifest(slotId, pos = null, aim = null) {
    const s = this.findSlot(slotId); if (!s || this.manifestBlock(s)) return null;
    this.hand = this.hand.filter((x) => x !== s);
    const o = { uid: uid('h'), comps: flatten(s.cards), cards: s.cards.map((c) => c.id), wind: 0, pos: pos ? { ...pos } : null, target: aim || this.heldTarget({})?.uid || null };
    this.held.push(o); for (const c of s.cards) if (!c.temp) this.discard.push(c);
    await this.fx.manifested?.(o, s); return o;
  }
  async manipulate(objId, slotId, aim = null) {
    const o = this.held.find((x) => x.uid === objId), s = this.findSlot(slotId); if (!o || !s || this.phase !== 'player' || s.cards.some((c) => c.type === 'power')) return false;
    this.hand = this.hand.filter((x) => x !== s);
    const add = flatten(s.cards); o.comps.push(...add); o.cards.push(...s.cards.map((c) => c.id)); o.wind += add.filter((c) => BASICS[c.id]?.kind !== 'matter').length;
    if (aim || add.some((c) => baseOf(c.id) === 'force')) o.target = aim || o.target; // a push re-aims it
    for (const c of s.cards) if (!c.temp) this.discard.push(c);
    await this.fx.manipulated?.(o, s); return true;
  }
  aim(objId, enemyUid) { const o = this.held.find((x) => x.uid === objId); const e = this.enemies.find((x) => x.uid === enemyUid && x.alive); if (!o || !e) return false; o.target = e.uid; this.fx.aimed?.(o, e); return true; }
  async release() {
    const list = this.held; this.held = [];
    for (let i = 0; i < list.length; i++) {
      const o = list[i]; const t = this.heldTarget(o); const mv = this.heldMove(o);
      if (this.over || !t) { this.fx.unheld?.(o); continue; }
      if (!mv.attack.valid) { await this.fx.fizzle?.(o); continue; }
      await this.fx.release?.(o, mv, t);
      this.discover(mv); const P = this.player; delete P.st.momentum; delete P.st.charged;
      await this.attack(mv, t);
      await this.afterMove(mv, 'attack', { type: 'enemy', uid: t.uid });
      this.checkEnd();
    }
  }

  discover(mv) {
    const r = this.run; r.stats.moves++;
    if (mv.n >= 2) { const known = !!this.run.journal?.combos?.[mv.key]; this.run.onDiscover?.(mv); if (!known) this.fx.eureka?.(mv); }
  }

  // ------------------------------------------------------------------ attacks
  async attack(mv, target, slotId) {
    const a = mv.attack; if (!target || !target.alive) target = this.alive()[0]; if (!target) return;
    // lone-law effects
    if (a.weak) { const tg = a.spread ? this.alive() : [target]; for (const t of tg) { this.addSt(t, 'weak', a.weak); if (t.def.unbalanced && mv.n === 1) { this.addSt(t, 'prone', 1); await this.fx.bark?.(t, 'Whoa-WHOA-*thud*'); this.learn(t, 'prone'); } } }
    if (a.dizzy) this.addSt(target, 'dizzy', a.dizzy);
    if (a.vulnerable) {
      const tg = a.spread ? this.alive() : [target];
      for (const t of tg) { this.addSt(t, 'vulnerable', a.vulnerable); this.flags.lensOn.add(t.uid); if (t.id === 'medusa' || (this.has('mirror') && t.intent?.kind === 'debuff')) { t.reflected = true; await this.fx.bark?.('player', 'Mirror, mirror. Look at YOURSELF.'); } }
      this.learn(target, 'analyzed');
    }
    if (a.blind) for (const t of this.alive()) this.addSt(t, 'blind', a.blind);
    const targets = a.spread ? this.alive() : [target];
    const zap = a.charge || 0;
    for (const t of targets) await this.strike(mv, t, 1);
    if (a.bounce) { let pool = this.alive().filter((e) => !targets.includes(e)); let mul = 1; for (let i = 0; i < a.bounce && pool.length; i++) { const t = this.rng.pick(pool); pool = pool.filter((x) => x !== t); mul *= 1 - (a.bounceFalloff || 0); await this.fx.bounce?.(t); await this.strike(mv, t, mul); } }
    if (zap) { for (const e of this.alive()) if (!targets.includes(e) && e.st.wet) { await this.fx.chain?.(e); await this.damageEnemy(e, zap * 2, { kind: 'zap', pierce: true }); } }
    if (this.has('prism') && mv.comps.some((c) => baseOf(c.id) === 'lens') && !a.spread) for (const e of this.alive()) if (e !== target) await this.damageEnemy(e, Math.round(a.perHit * 0.5), { kind: 'prism' });
    if (a.persist && a.perHit > 0) this.addField('momentum', { turns: a.persist, target: target.uid, m: a.m, v: a.v, hits: a.hits, grow: a.grow, fall: a.fall, name: mv.name, art: mv.art });
    if (mv.attack.total > (this.run.stats.bestHit || 0)) this.run.stats.bestHit = mv.attack.total;
  }
  // one target, full hits
  async strike(mv, t, mul = 1) {
    const a = mv.attack; let hits = a.hits;
    for (let h = 0; h < hits; h++) {
      if (!t.alive) { const others = this.alive(); if (!others.length) return; t = this.rng.pick(others); await this.fx.ricochet?.(t); }
      const per = Math.round(a.perHit * mul);
      if (per > 0) await this.damageEnemy(t, per, { fall: a.fall, hard: a.hard, pierce: a.pierce, single: !a.spread, kind: 'kinetic', move: mv, hit: h, burnKill: a.burn > 0 });
      if (!t.alive) continue;
      if (this.has('fang') && hits > 1) this.addSt(t, 'venom', 1);
      if (a.venom && h === 0) this.addSt(t, 'venom', a.venom);
    }
    if (!t.alive) return;
    if (a.charge) await this.damageEnemy(t, a.charge * (t.st.wet || a.wet ? 2 : 1), { kind: 'zap', pierce: true, burnKill: a.burn > 0 });
    if (!t.alive) return;
    if (a.wet) { if (t.st.burn) { delete t.st.burn; this.addSt(t, 'blind', 1); await this.fx.steam?.(t); } this.addSt(t, 'wet', a.wet); }
    if (a.burn) { if (t.st.wet) { delete t.st.wet; this.addSt(t, 'blind', 1); await this.fx.steam?.(t); } else this.addSt(t, 'burn', a.burn); }
    if (a.chill || a.weakOnHit) this.addSt(t, 'weak', a.chill || a.weakOnHit);
    if (a.disarm) this.addSt(t, 'strength', -a.disarm);
  }

  async damageEnemy(e, amount, o = {}) {
    if (!e || !e.alive || amount <= 0) return 0;
    if (e.st.evade && o.single && !o.fall && !this.field.some((f) => f.type === 'well')) { e.st.evade--; if (!e.st.evade) delete e.st.evade; await this.fx.miss?.(e); this.learn(e, 'evade'); return 0; }
    let dmg = amount;
    if (e.st.vulnerable) dmg = Math.round(dmg * 1.5);
    if (e.def.thickHide && !o.fall && o.kind === 'kinetic' && this.headsAlive(e) >= 3) { dmg = Math.round(dmg * 0.5); this.learn(e, 'hide'); }
    let blocked = 0;
    if (e.block > 0 && !o.pierce) {
      const eff = o.hard ? dmg * 2 : dmg; blocked = Math.min(e.block, eff); e.block -= blocked; dmg = Math.max(0, dmg - (o.hard ? Math.ceil(blocked / 2) : blocked));
    }
    e.hp -= dmg;
    await this.fx.enemyHit?.(e, dmg, { ...o, blocked, raw: amount });
    if (dmg > 0 && e.def.rage && e.hp > 0) { const s = e.st.strength || 0; if (s < 8) { this.addSt(e, 'strength', 1); this.learn(e, 'rage'); } }
    if (e.hp <= 0) await this.killEnemy(e, o);
    return dmg;
  }
  async killEnemy(e, o = {}) {
    e.hp = 0; e.alive = false; e.block = 0;
    if (e.def.isHead) {
      const body = this.enemies.find((x) => x.uid === e.parent);
      if (body && body.alive) {
        if (o.burnKill || e.st.burn) { await this.fx.bark?.('player', 'Cauterized! Iolaus would be proud.'); this.learn(body, 'cauterize'); }
        else { const cur = this.headsAlive(body) + body.pendingHeads; body.pendingHeads += Math.max(0, Math.min(2, body.def.maxHeads - cur)); }
      }
    }
    if (e.def.heads) for (const h of this.enemies) if (h.parent === e.uid && h.alive) { h.alive = false; h.hp = 0; await this.fx.enemyDie?.(h); }
    if (e.loot) { const c = e.loot; e.loot = null; this.discard.push(c); await this.fx.lootBack?.(e, c); }
    if (o.move?.attack?.goldOnKill) this.run.gold += o.move.attack.goldOnKill;
    this.run.stats.kills++;
    await this.fx.enemyDie?.(e);
    this.checkEnd();
  }

  // ------------------------------------------------------------------ self / field
  async applySelf(mv) {
    const s = mv.self; const P = this.player;
    if (s.heal) await this.healPlayer(s.heal + (this.has('golden_apple') && mv.comps.some((c) => baseOf(c.id) === 'apple') ? 3 : 0));
    if (s.block) await this.gainBlock(s.block);
    if (s.cleanse) { for (const k of ['burn', 'wet', 'venom', 'petrify', 'weak', 'corrode']) delete P.st[k]; for (const sl of this.hand) for (const c of sl.cards) c.petrified = false; await this.fx.cleanse?.(); }
    if (s.charged) this.addSt(P, 'charged', s.charged);
    if (s.momentum) this.addSt(P, 'momentum', s.momentum);
    if (s.thorns) this.addSt(P, 'thorns', s.thorns);
    if (s.kindle) this.addSt(P, 'kindle', s.kindle);
    if (s.retain) { P.retain = true; P.keepBlock = true; }
    if (s.moon && !this.field.some((f) => f.type === 'moon')) this.addField('moon', {});
    if (s.draw) await this.drawCards(s.draw + (this.has('owl') && mv.comps.some((c) => baseOf(c.id) === 'lens') ? 1 : 0));
    await this.fx.selfApplied?.(mv);
  }
  async healPlayer(n) { const P = this.player; const h = Math.min(n, P.maxHp - P.hp); P.hp += h; await this.fx.heal?.('player', h); }
  async gainBlock(n, src) { const P = this.player; if (P.st.corrode) n = Math.floor(n / 2); P.block += n; await this.fx.block?.('player', n, src); }

  addField(type, params) {
    const f = { uid: uid('f'), type, ...params, turns: params.turns ?? 0, age: 0, guard: params.guard || 0, grown: false };
    if (type === 'momentum' || type === 'rolling') f.v = params.v;
    this.field.push(f); this.fx.fieldAdd?.(f); return f;
  }
  removeField(f) { this.field = this.field.filter((x) => x !== f); this.fx.fieldRemove?.(f); }
  async placeField(mv) {
    const F = mv.field; const p = F.params; const type = F.type;
    if (['puddle', 'campfire', 'well', 'coil', 'whirl', 'glass', 'rain', 'steam'].includes(type)) { const ex = this.field.find((f) => f.type === type); if (ex) { ex.turns += F.params.turns || 2; this.fx.fieldUpdate?.(ex); return; } }
    if (type === 'steam') for (const e of this.alive()) this.addSt(e, 'blind', 1);
    this.addField(type, { ...p, name: F.name });
    await this.fx.placed?.(type);
    // immediate reactions between objects
    const fire = this.field.find((f) => f.type === 'campfire'), pud = this.field.find((f) => f.type === 'puddle' || f.type === 'rain');
    if (fire && pud) { this.removeField(fire); this.removeField(pud); this.addField('steam', { turns: 2, name: 'Steam Cloud' }); for (const e of this.alive()) this.addSt(e, 'blind', 1); await this.fx.bark?.('player', 'Fire plus water. Steam. Science!'); }
    const wine = this.field.find((f) => f.type === 'wine');
    if (wine && type === 'campfire') await this.igniteWine(wine);
  }
  async igniteWine(wine) { this.removeField(wine); await this.fx.bark?.('player', 'Ah. Wine is flammable. Noted. Enthusiastically.'); await this.fx.wineFire?.(); for (const e of this.alive()) { this.addSt(e, 'burn', 4); if (e.id === 'satyr') this.learn(e, 'wine'); } }

  // dropping a Move onto an existing object
  objectReaction(f, mv, dry) {
    const has = (b) => mv.comps.some((c) => baseOf(c.id) === b); const R = (text, fn) => (dry ? { text } : fn());
    const al = this.alive();
    if ((f.type === 'boulder' || f.type === 'rolling') && (has('force') || has('gravity')) && al.length) return R('Launch the boulder!', async () => { const t = al[0]; const v = 4 + mv.attack.v; this.removeField(f); await this.fx.launch?.(f, t); await this.damageEnemy(t, (f.mass || 3) * v, { hard: true, fall: has('gravity'), kind: 'kinetic' }); });
    if (f.type === 'sapling' && f.grown && (has('force') || has('gravity')) && al.length) return R('Shake the tree: apples fall on everyone!', async () => { await this.fx.shakeTree?.(f); for (let i = 0; i < 3; i++) { const t = this.rng.pick(this.alive()); if (t) await this.damageEnemy(t, (f.golden ? 3 : 1) * 6, { fall: true, kind: 'apple' }); } });
    if (f.type === 'sapling' && has('heat')) return R('Bake the apples (heal 8)', async () => { this.removeField(f); await this.healPlayer(8); });
    if ((f.type === 'puddle' || f.type === 'rain' || f.type === 'wine') && has('spark')) return R('Electrify! Zap everyone', async () => { const z = mv.attack.charge || 5; await this.fx.electrify?.(f); for (const e of this.alive()) { this.addSt(e, 'wet', 1); await this.damageEnemy(e, z * 2, { kind: 'zap', pierce: true }); } });
    if (f.type === 'puddle' && has('heat')) return R('Boil it into Steam (blind all)', async () => { this.removeField(f); this.addField('steam', { turns: 2, name: 'Steam Cloud' }); for (const e of this.alive()) this.addSt(e, 'blind', 1); });
    if (f.type === 'wine' && has('heat')) return R('Ignite the wine (Burn 4 all)', () => this.igniteWine(f));
    if (f.type === 'campfire' && has('water')) return R('Douse it: Steam (blind all)', async () => { this.removeField(f); this.addField('steam', { turns: 2, name: 'Steam Cloud' }); for (const e of this.alive()) this.addSt(e, 'blind', 1); });
    if (f.type === 'catapult' && !f.loaded && mv.attack.perHit > 0) return R('Load the catapult (fires x2 next turn)', async () => { f.loaded = { m: mv.attack.m, v: mv.attack.v, hits: mv.attack.hits, art: mv.art, name: mv.name }; this.fx.fieldUpdate?.(f); });
    if (has('inertia') && f.turns > 0) return R('Keep it going (+2 turns)', async () => { f.turns += 2; this.fx.fieldUpdate?.(f); });
    if (f.type === 'well' && has('mass')) return R('Collapse into a black hole!', async () => { this.removeField(f); await this.fx.blackHole?.(); for (const e of this.alive()) await this.damageEnemy(e, 6 * (mv.attack.m || 2), { fall: true, pierce: true, kind: 'kinetic' }); });
    return null;
  }

  async fieldTurnStart(f) {
    f.age++;
    const al = this.alive();
    if (f.type === 'sapling' && !f.grown && f.age >= 2) { f.grown = true; this.fx.fieldUpdate?.(f); await this.fx.bark?.('player', 'It grew! Botany is just slow physics.'); }
    else if (f.type === 'sapling' && f.grown && this.handCount() < HAND_MAX) { const c = { uid: uid('c'), id: f.golden ? 'golden_apple' : 'apple', up: 0, temp: true }; this.hand.push(this.slotOf([c])); await this.fx.drew?.([this.hand[this.hand.length - 1]]); }
    if (f.type === 'momentum' || f.type === 'rolling') {
      const t = this.enemies.find((e) => e.uid === f.target && e.alive) || (al.length ? this.rng.pick(al) : null);
      f.v = f.grow ? f.v + 2 : f.v - 2;
      if (t && f.v > 0) { await this.fx.momentumHit?.(f, t); await this.damageEnemy(t, (f.m || f.mass) * f.v * (f.hits || 1), { fall: f.fall, kind: 'kinetic' }); }
      if (f.type === 'momentum') { f.turns--; if (f.turns <= 0 || f.v <= 0) this.removeField(f); } else if (f.v <= 0) this.removeField(f);
    }
    if (f.type === 'catapult' && f.loaded && al.length) { const t = this.rng.pick(al); await this.fx.launch?.(f, t); await this.damageEnemy(t, f.loaded.m * f.loaded.v * f.loaded.hits * 2, { kind: 'kinetic' }); f.loaded = null; this.fx.fieldUpdate?.(f); }
  }
  async fieldTurnEnd() {
    for (const f of [...this.field]) {
      const al = this.alive(); if (!al.length) return;
      if (f.type === 'campfire') for (const e of al) this.addSt(e, 'burn', 2);
      if (f.type === 'coil') { const t = this.rng.pick(al); await this.fx.zapFrom?.(f, t); await this.damageEnemy(t, Math.max(4, f.charge || 5) * (t.st.wet ? 2 : 1), { kind: 'zap', pierce: true }); }
      if (f.type === 'glass') { const t = al.reduce((a, b) => (b.hp > a.hp ? b : a)); this.addSt(t, 'burn', this.field.some((x) => x.type === 'campfire') ? 4 : 2); }
      if (f.type === 'rain') for (const e of al) this.addSt(e, 'wet', 1);
      if (f.type === 'whirl') for (const e of al) await this.damageEnemy(e, 2 + 2 * (f.spin || 0), { kind: 'wind' });
      if (f.type === 'steam') for (const e of al) this.addSt(e, 'blind', 1);
      if (f.turns > 0 && !['momentum'].includes(f.type)) { f.turns--; if (f.turns <= 0) this.removeField(f); else this.fx.fieldUpdate?.(f); }
    }
  }

  // ------------------------------------------------------------------ enemy turn
  async endTurn() {
    if (this.phase !== 'player') return;
    if (this.held.length) { await this.release(); if (this.checkEnd()) return; } // the bell lets go of everything held in the air
    this.phase = 'enemy';
    const P = this.player;
    if (!P.retain) { for (const s of this.hand) for (const c of s.cards) if (!c.temp) this.discard.push(c); this.hand = []; }
    await this.fx.endTurn?.(this);
    // pendulum
    if (this.has('pendulum') && this.turn % 3 === 0 && this.flags.movesThisTurn.length) {
      const big = this.flags.movesThisTurn.filter((x) => x.kind === 'attack').sort((a, b) => b.total - a.total)[0];
      if (big && this.alive().length) { const t = this.rng.pick(this.alive()); await this.fx.pendulum?.(t); await this.damageEnemy(t, Math.round(big.total * 0.5), { kind: 'kinetic' }); }
    }
    await this.fieldTurnEnd(); if (this.checkEnd()) return;
    for (const e of [...this.enemies]) {
      if (!e.alive || this.over) continue;
      await this.enemyAct(e);
      if (this.checkEnd()) return;
    }
    // end of enemy turn: burn / venom ticks, regrowth, new intents
    for (const e of [...this.enemies]) {
      if (!e.alive) continue;
      if (e.st.burn) { await this.damageEnemy(e, e.st.burn, { kind: 'burn', pierce: true, burnKill: true }); if (this.powers.thermo === undefined) this.decSt(e, 'burn'); }
      if (e.alive && e.st.venom) { await this.damageEnemy(e, e.st.venom, { kind: 'venom', pierce: true }); this.decSt(e, 'venom'); }
      for (const k of ['weak', 'vulnerable', 'blind', 'dizzy', 'wet']) if (e.st[k]) this.decSt(e, k);
      e.reflected = false;
    }
    for (const e of this.enemies) if (e.alive && e.pendingHeads > 0) { const n = e.pendingHeads; e.pendingHeads = 0; for (let i = 0; i < n; i++) { const h = this.spawnEnemy('hydra_head', { parent: e.uid }); this.pickIntent(h); await this.fx.enemySpawn?.(h); } await this.fx.bark?.(e, 'Two heads are better than one!'); this.learn(e, 'regrow'); }
    if (this.checkEnd()) return;
    for (const k of ['weak', 'vulnerable', 'wet', 'blind', 'corrode']) if (P.st[k]) this.decSt(P, k);
    if (P.st.burn) { await this.hurtPlayer(P.st.burn, { pure: true, kind: 'burn' }); this.decSt(P, 'burn'); }
    for (const e of this.alive()) { e.turn++; e.block = e.def.keepBlock ? e.block : 0; this.pickIntent(e); }
    await this.fx.intents?.(this);
    if (!this.over) await this.startPlayerTurn();
  }
  pickIntent(e) { e.intent = e.def.ai(e, this, this.rng); if (e.loot) e.lootTurns++; e.next = this.has('antikythera') ? e.def.ai({ ...e, turn: e.turn + 1, st: { ...e.st } }, this, this.rng) : null; }

  attackValue(e, base) { let d = base + (e.st.strength || 0); if (e.st.weak) d = Math.floor(d * 0.75); return Math.max(0, d); }

  async enemyAct(e) {
    const it = e.intent; if (!it) return;
    if (e.st.stun || e.st.prone) { const k = e.st.stun ? 'stun' : 'prone'; this.decSt(e, k); await this.fx.stunned?.(e, k); return; }
    if (e.reflected && it.kind === 'debuff') { this.addSt(e, 'stun', 1); await this.fx.reflect?.(e); await this.damageEnemy(e, 10, { kind: 'reflect', pierce: true }); this.learn(e, 'reflect'); return; }
    await this.fx.enemyAct?.(e, it);
    const al = () => this.alive().filter((x) => x !== e);
    if (it.kind === 'attack') {
      // Minotaur charge vs. solid objects
      if (it.charge) { const solid = this.field.find((f) => ['boulder', 'rolling'].includes(f.type) || (f.type === 'sapling' && f.grown)); if (solid) { this.removeField(solid); await this.fx.crash?.(e, solid); this.addSt(e, 'stun', 1); await this.damageEnemy(e, 15 + (solid.guard || 0), { kind: 'crash', pierce: true }); this.learn(e, 'crash'); await this.fx.bark?.('player', 'Momentum is conserved. Your dignity is not.'); return; } }
      for (let h = 0; h < (it.hits || 1); h++) {
        if (!e.alive || this.over) break;
        let dmg = this.attackValue(e, it.dmg);
        const confused = (it.drunk && this.rng.chance(0.3)) || (e.st.dizzy && this.rng.chance(0.5));
        if (confused && al().length) { const t = this.rng.pick(al()); await this.fx.friendlyFire?.(e, t); await this.damageEnemy(t, dmg, { kind: 'kinetic' }); this.learn(e, 'drunk'); continue; }
        if (e.st.blind && this.rng.chance(0.5)) { await this.fx.miss?.('player', e); continue; }
        if (this.has('wings') && !this.flags.wingsUsed && !this.flags.wingsMelted) { this.flags.wingsUsed = true; await this.fx.miss?.('player', e, 'wings'); continue; }
        const wind = this.field.find((f) => f.type === 'whirl'); if (wind) dmg = Math.max(0, dmg - 3);
        const cover = this.field.find((f) => (f.type === 'boulder' || f.type === 'rolling') && f.guard > 0);
        if (cover && !it.charge) { const ab = Math.min(cover.guard, dmg); cover.guard -= ab; dmg -= ab; await this.fx.coverHit?.(cover, ab); if (cover.guard <= 0) this.removeField(cover); else this.fx.fieldUpdate?.(cover); }
        if (this.field.some((f) => f.type === 'puddle')) this.addSt(e, 'wet', 1);
        await this.hurtPlayer(dmg, { source: e });
        if (it.venom) this.addSt(this.player, 'venom', it.venom);
      }
    } else if (it.kind === 'block') { e.block += it.block; if (it.str) this.addSt(e, 'strength', it.str); await this.fx.enemyBlock?.(e, it.block); }
    else if (it.kind === 'buff') {
      if (it.id === 'flute') { for (const x of this.alive()) this.addSt(x, 'strength', x === e ? 1 : it.str); await this.fx.flute?.(e); }
      if (it.id === 'snort') this.addSt(e, 'strength', it.str);
      if (it.id === 'nimble') this.addSt(e, 'evade', it.evade);
    } else if (it.kind === 'debuff') {
      if (it.id === 'gaze') { if (it.dmg) await this.hurtPlayer(this.attackValue(e, it.dmg), { source: e }); this.addSt(this.player, 'petrify', it.petrify); await this.fx.gaze?.(e); }
      if (it.id === 'steal') {
        if (it.dmg) await this.hurtPlayer(this.attackValue(e, it.dmg), { source: e });
        const pool = this.discard.length ? this.discard : this.draw; if (pool.length) { const i = this.rng.int(0, pool.length - 1); const c = pool.splice(i, 1)[0]; e.loot = c; e.lootTurns = 0; await this.fx.steal?.(e, c); }
      }
      if (it.id === 'acid') { await this.hurtPlayer(this.attackValue(e, it.dmg), { source: e }); this.addSt(this.player, 'corrode', it.corrode); }
    } else if (it.kind === 'special') {
      if (it.id === 'spill') { if (!this.field.some((f) => f.type === 'wine')) this.addField('wine', { turns: 3, name: 'Spilled Wine' }); e.hp = Math.min(e.maxHp, e.hp + it.heal); await this.fx.heal?.(e, it.heal); }
      if (it.id === 'flee') { if (this.field.some((f) => f.type === 'well')) { await this.fx.bark?.(e, 'Can\'t... escape... the pull!'); return; } e.alive = false; e.fled = true; if (e.loot) { this.lost.push(e.loot); if (this.has('sack')) this.run.gold += 10; } await this.fx.flee?.(e); }
      if (it.id === 'sprout') { const n = Math.min(2, e.def.maxHeads - this.headsAlive(e)); for (let i = 0; i < n; i++) { const h = this.spawnEnemy('hydra_head', { parent: e.uid }); this.pickIntent(h); await this.fx.enemySpawn?.(h); } }
    }
  }

  async hurtPlayer(amount, o = {}) {
    const P = this.player; if (amount <= 0 || this.over) return 0;
    let dmg = amount; if (P.st.vulnerable && !o.pure) dmg = Math.round(dmg * 1.5);
    let blocked = 0; if (!o.pure && P.block > 0) { blocked = Math.min(P.block, dmg); P.block -= blocked; dmg -= blocked; }
    P.hp -= dmg;
    await this.fx.playerHit?.(dmg, { ...o, blocked });
    if (o.source && o.source.alive) {
      const back = (P.st.thorns || 0) + (this.powers.third_law !== undefined ? (this.powers.third_law ? 5 : 3) : 0);
      if (back) await this.damageEnemy(o.source, back, { kind: 'thorns', pierce: true });
    }
    if (P.hp <= 0) {
      if (this.has('golden_apple') && !this.run.flags.goldenEaten) { this.run.flags.goldenEaten = true; P.hp = Math.round(P.maxHp * 0.4); await this.fx.revive?.(); }
      else { P.hp = 0; this.phase = 'lost'; await this.fx.lost?.(this); }
    }
    return dmg;
  }

  addSt(t, k, n) { const st = t === this.player ? this.player.st : t.st; st[k] = (st[k] || 0) + n; if (st[k] === 0) delete st[k]; this.fx.status?.(t, k, n); }
  decSt(t, k) { const st = t === this.player ? this.player.st : t.st; if (st[k] > 0) st[k]--; if (st[k] <= 0) delete st[k]; }
  learn(e, key) { this.run.onLearn?.(e.id, key); }

  checkEnd() {
    if (this.phase === 'lost' || this.phase === 'won') return true;
    if (this.player.hp <= 0) { this.phase = 'lost'; return true; }
    if (!this.alive().length) { this.phase = 'won'; this.fx.won?.(this); return true; }
    return false;
  }
  // write results back to the run
  finish() {
    const r = this.run; r.player.hp = Math.max(0, this.player.hp);
    for (const c of r.deck) c.petrified = false;
    if (this.lost.length) r.deck = r.deck.filter((c) => !this.lost.some((l) => l.uid === c.uid));
  }
}
