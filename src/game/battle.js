// Battle rules. Presentation is injected via `fx` (all hooks async & optional), so this runs headless too.
import { ENEMIES } from './data/enemies.js';
import { BASICS } from './data/cards.js';
import { computeMove, flatten, baseOf, HEAT, heatGain, hasApple } from './combos.js';
import { uid, RNG } from '../core/util.js';
import { mkCard, discoveryChoices } from './run.js';
import { foeLines, artifactLines, immuneTo } from './data/synergy.js';
import { dilemmaFor } from './data/dilemmas.js';

const NOOP = new Proxy({}, { get: () => async () => {} });
// EXPERIMENT RULES: the battle is deterministic once your hand is dealt. No hidden odds, no random targets: anything
// that used to pick at random now takes the FRONT foe (the nearest one, in line order), cards are taken from the
// RIGHT of the hand or the TOP of a pile, and the old dice artifacts run on a shown cycle. So Battle.forecast() can
// run the coming turn in a sandbox and the result it shows is exactly what the golden apple then plays out.
export const HAND_MAX = 10;
export const HELD_MAX = 3; // things manifested in mid-air at once
// VERY HARD difficulty, tuned with tools/sim.mjs against a synergy-hunting player that blocks the telegraphed blows
// (no dodging any more): normals ~55-65% won, elites ~12-20%, bosses ~5-10%. Foes' HP and blows scale by tier and grow
// every floor; several foes also ramp (Strength each round) or swing harder every cycle (enemies.js).
export const DIFF = { hp: { normal: 2.4, elite: 3.1, guardian: 3.1 }, dmg: { normal: 3.1, elite: 2.3, guardian: 1.45 }, hpFloor: 0.03, dmgFloor: 0.025, per: { hydra: 0.9, hydra_elder: 0.75, hydra_head: 0.8, bookworm: 0.4, bookworm_queen: 0.9 }, dmgPer: { hydra_head: 0.7, bookworm: 0.8 } };

export class Battle {
  constructor({ run, enemies, rng, fx, kind = 'normal', deck = null, ordered = false }) {
    this.run = run; this.rng = rng; this.fx = fx || NOOP; this.kind = kind;
    const p = run.player;
    this.player = { hp: p.hp, maxHp: p.maxHp, block: 0, st: {}, keepBlock: false, retain: false };
    this.enemies = []; this.field = []; this.powers = {}; this.turn = 0; this.phase = 'start';
    // deck: the run's deck, or a forced one (a tutorial encounter: ids or cards, optionally drawn in order)
    const src = deck ? deck.map((c) => (typeof c === 'string' ? mkCard(c) : c)) : run.deck;
    const cards = src.map((c) => ({ ...c, petrified: false })); this.draw = ordered ? cards.reverse() : this.rng.shuffle(cards);
    this.hand = []; this.discard = []; this.exhaust = []; this.lost = []; this.held = [];
    this.flags = { wingsUsed: false, heatCount: 0, sparkCharge: 0, firstMoveDone: false, movesThisTurn: [], wineskinUsed: false, lensOn: new Set() };
    for (const id of enemies) this.spawnEnemy(id);
    this.log = []; this.stats = { blocked: 0, taken: 0 };
    this.heat = 0; // APPLE HEAT (friction): 0..HEAT.max, see combos.js HEAT
  }
  has(item) { return this.run.items.includes(item); }

  // HARD difficulty: foes are tougher than their base sheet, and grow a little every floor of the run
  tier(def) { return def.guardian ? 'guardian' : def.elite ? 'elite' : 'normal'; }
  diffHp(def, id) { const f = Math.max(0, this.run.floor || 0); return DIFF.hp[this.tier(def)] * (DIFF.per[id] ?? 1) * (1 + f * DIFF.hpFloor); }
  diffDmg(def, id) { const f = Math.max(0, this.run.floor || 0); return DIFF.dmg[this.tier(def)] * (DIFF.dmgPer[id] ?? 1) * (1 + f * DIFF.dmgFloor); }
  spawnEnemy(id, opts = {}) {
    const def = ENEMIES[id]; const hp = Math.round(((def.hp[0] + def.hp[1]) / 2) * this.diffHp(def, id)); // no rolled HP: the same foe is always as tough
    const e = { uid: uid('e'), id, def, hp, maxHp: hp, block: 0, st: {}, turn: 0, alive: true, intent: null, loot: null, lootTurns: 0, pendingHeads: 0, parent: opts.parent || null, minionOf: opts.minionOf || null, slot: opts.slot ?? this.enemies.length };
    this.enemies.push(e);
    if (def.heads) for (let i = 0; i < def.heads; i++) this.spawnEnemy('hydra_head', { parent: e.uid, slot: i });
    return e;
  }
  alive() { return this.enemies.filter((e) => e.alive); }
  /** the living foes in line order (bodies first, nearest first): who an untargeted effect hits */
  inLine() { const al = this.alive(); return [...al.filter((e) => !e.def.isHead && !e.def.minion), ...al.filter((e) => e.def.minion), ...al.filter((e) => e.def.isHead)]; }
  front() { return this.inLine()[0] || null; }
  /** the n-th throw of the battle this object will be (the clockwork dice read it); held objects go in release order */
  throwN(obj) { const i = obj ? this.held.findIndex((x) => x.uid === obj.uid) : -1; return (this.flags.throws || 0) + Math.max(0, i); }
  get over() { return this.phase === 'won' || this.phase === 'lost'; }

  async start() {
    this.phase = 'start';
    if (this.has('pan_flute')) for (const e of this.alive()) { this.addSt(e, 'weak', 1); this.addSt(e, 'dizzy', 1); }
    for (const e of this.alive()) if (e.def.minion && !e.minionOf) e.minionOf = this.enemies.find((x) => x.def.brood && x.alive)?.uid || null;
    if (this.has('schrodinger')) this.hand.push(this.slotOf([{ uid: uid('c'), id: 'superposition', up: 0, temp: true }]));
    for (const e of this.alive()) this.pickIntent(e);
    if (this.heatOn() && this.has('ember')) this.heat = 3; // Prometheus' Ember Jar: the apple starts warm
    await this.fx.battleStart?.(this);
    await this.startPlayerTurn();
  }

  // ------------------------------------------------------------------ player turn
  async startPlayerTurn() {
    if (this.over) return;
    this.turn++; this.phase = 'player'; this.flags.movesThisTurn = []; this.flags.lensOn = new Set(); this.flags.pickedThisTurn = false; this.flags.vented = false;
    const P = this.player;
    if (!P.keepBlock) P.block = this.has('aegis') ? Math.floor(P.block / 2) : 0; P.keepBlock = false; // Block fades at the start of your turn (the Aegis keeps half)
    this.flags.talaria = false; this.flags.ramUsed = false;
    for (const k of ['thorns', 'kindle', 'momentum']) delete P.st[k];
    if (P.st.venom) { await this.hurtPlayer(P.st.venom, { source: null, pure: true, kind: 'venom' }); P.st.venom--; if (P.st.venom <= 0) delete P.st.venom; if (this.over) return; }
    if (this.has('wineskin')) await this.healPlayer(2);
    if (this.turn === 1 && this.has('wine_flask')) await this.healPlayer(3);
    if (this.turn === 1 && this.has('gorgon_scale')) await this.gainBlock(4);
    if (this.powers.orbit !== undefined || this.field.some((f) => f.type === 'moon')) await this.gainBlock(this.powers.orbit ? 6 : 4, 'moon');
    if (this.powers.gravitation !== undefined && this.alive().length) {
      const t = this.front(); const m = this.powers.gravitation ? 2 : 1;
      await this.fx.fallingApple?.(t); await this.damageEnemy(t, m * 6, { fall: true, kind: 'apple' });
    }
    for (const f of [...this.field]) await this.fieldTurnStart(f);
    if (this.checkEnd() || this.sandbox) return; // a forecast ends at dawn: the start-of-turn effects are known, the next hand is not
    let n = 6 + (this.has('thread') ? 1 : 0) + (this.turn === 1 && this.has('antikythera') ? 1 : 0) + (this.turn === 1 && this.has('owl') ? 1 : 0) - (this.has('lead_boots') ? 1 : 0);
    if (this.has('statues')) { n = Math.min(n, 3); this.fx.artifact?.('statues'); } // the admirers crowd your table: a hand of three
    if (!P.retain) { /* normal */ } else n = Math.max(0, n - this.handCount());
    P.retain = false;
    await this.drawCards(n);
    if (P.st.petrify) { await this.petrifyHand(P.st.petrify); delete P.st.petrify; }
    if (P.st.hex) { await this.hexHand(P.st.hex); delete P.st.hex; } // the frog's hex: cards turn into rotten apples
    if (P.st.nibble) { const pool = this.hand.filter((s) => !s.cards.some((c) => c.type === 'power')); const out = pool.slice(-P.st.nibble); /* the rightmost card(s) */ delete P.st.nibble; if (out.length) { await this.fx.nibbled?.(out); await this.discardSlots(out, 'nibble'); } }
    if (this.tutorial?.onTurn) await this.tutorial.onTurn(this);
    if (this.turn === 2 && !this.flags.dilemma) await this.dilemma(); if (this.checkEnd()) return;
    await this.fx.playerTurn?.(this);
  }
  handCount() { return this.hand.reduce((s, sl) => s + sl.cards.length, 0); }
  handMax() { return this.has('statues') ? 3 : HAND_MAX; }
  slotOf(cards) { return { uid: uid('s'), cards }; }

  async drawCards(n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      if (this.handCount() >= this.handMax()) break;
      if (!this.draw.length) { if (!this.discard.length) break; this.draw = this.rng.shuffle(this.discard.splice(0)); await this.fx.reshuffle?.(this); }
      const c = this.draw.pop(); const s = this.slotOf([c]); this.hand.push(s); drawn.push(s);
    }
    if (drawn.length) await this.fx.drew?.(drawn);
    return drawn;
  }
  async hexHand(n) {
    const cands = this.hand.filter((s) => s.cards.length === 1 && s.cards[0].type !== 'power' && !/apple/.test(s.cards[0].id));
    const picked = cands.slice(-n); for (const s of picked) { const c = s.cards[0]; /* the rightmost cards */ if (!c.temp) this.discard.push(c); s.cards = [{ uid: uid('c'), id: 'rotten_apple', up: 0, temp: true }]; }
    if (picked.length) await this.fx.hexed?.(picked);
  }
  // discard hand slots (Recycle, Scratchpad, a bookworm's nibble): a Paper Plane glides off at a foe as it goes
  async discardSlots(slots, why = 'discard') {
    for (const s of slots) {
      if (!this.hand.includes(s)) continue; this.hand = this.hand.filter((x) => x !== s);
      for (const c of s.cards) if (!c.temp) this.discard.push(c);
      await this.fx.discarded?.(s, why);
      for (const c of s.cards) { const pl = c.type !== 'power' && BASICS[c.id]?.plane; if (pl && this.alive().length) { const t = this.front(); await this.fx.paperPlane?.(t); await this.damageEnemy(t, c.up ? BASICS[c.id].up.plane : pl, { kind: 'kinetic', single: true }); } }
      this.flags.discards = (this.flags.discards || 0) + 1;
    }
    this.checkEnd();
  }
  // a choice of hand cards (Recycle, Scratchpad): fx.chooseCards(slots, { min, max, title }) resolves slot uids; headless: the weakest
  async chooseSlots(opts) {
    const pool = this.hand.filter((s) => !s.cards.some((c) => c.type === 'power')); if (!pool.length) return [];
    let ids = await this.fx.chooseCards?.(pool, opts);
    if (!Array.isArray(ids)) { const val = (s) => { const mv = this.moveOf(s); return (mv?.attack.perHit || 0) + (mv?.self.block || 0) + (BASICS[s.cards[0].id]?.kind === 'matter' ? 6 : 0); }; ids = [...pool].sort((a, b) => val(a) - val(b)).slice(0, opts.min || 0).map((s) => s.uid); }
    return ids.map((id) => this.hand.find((s) => s.uid === id)).filter(Boolean).slice(0, opts.max ?? 99);
  }
  async petrifyHand(n) {
    const cands = this.hand.flatMap((s) => s.cards).filter((c) => c.type !== 'power' && c.id !== 'stone' && !c.petrified);
    const picked = cands.slice(-n); for (const c of picked) c.petrified = true; // the rightmost cards turn to stone
    if (picked.length) await this.fx.petrified?.(picked);
  }

  // ------------------------------------------------------------------ story dilemmas (data/dilemmas.js)
  // once per fight a foe makes an offer, a bargain or a riddle; fx.dilemma(d, foe) resolves the chosen index
  async dilemma() {
    const d = dilemmaFor(this); this.flags.dilemma = true; if (!d || !d.options.length) return null;
    const i = await this.fx.dilemma?.(d, d.foe); const opt = d.options[Number.isInteger(i) ? i : d.options.length - 1] || d.options[d.options.length - 1];
    const res = await this.applyDilemma(opt.fx || {}, d.foe);
    (this.run.flags.dilemmas ||= []).push({ title: d.title, pick: opt.label, foe: d.foe.id, right: opt.right });
    await this.fx.dilemmaResult?.(d, opt, d.foe, res);
    this.checkEnd(); return { d, opt, res };
  }
  async applyDilemma(f, e) {
    const P = this.player; const out = {};
    if (f.odds) { const yes = this.rng.next() < f.odds.p; out.odds = yes; await this.applyDilemma(yes ? f.odds.yes : f.odds.no, e); }
    if (f.gold) this.run.gold = Math.max(0, (this.run.gold || 0) + f.gold);
    if (f.maxHp) { this.run.player.maxHp = Math.max(10, this.run.player.maxHp + f.maxHp); P.maxHp = this.run.player.maxHp; P.hp = Math.min(P.hp, P.maxHp); }
    if (f.heal) await this.healPlayer(f.heal);
    if (f.hurt) await this.hurtPlayer(f.hurt, { pure: true, kind: 'dilemma' });
    if (this.over) return out;
    if (f.block) await this.gainBlock(f.block);
    for (const [k, n] of Object.entries(f.st || {})) { if (k === 'petrify') await this.petrifyHand(n); else this.addSt(P, k, n); }
    for (const [k, n] of Object.entries(f.foeSt || {})) if (e.alive) this.addSt(e, k, n);
    for (const [k, n] of Object.entries(f.foesSt || {})) for (const x of this.alive()) this.addSt(x, k, n);
    if (f.foeDmg) await this.damageEnemy(e, f.foeDmg, { kind: 'dilemma', pierce: true });
    if (f.foePct) await this.damageEnemy(e, Math.round(e.maxHp * f.foePct), { kind: 'dilemma', pierce: true });
    if (f.brawl) { const al = this.alive(); if (al.length > 1) { for (const x of al) { const by = al[(al.indexOf(x) + 1) % al.length]; await this.fx.friendlyFire?.(by, x); await this.damageEnemy(x, f.brawl, { kind: 'kinetic', pierce: true }); } } else if (al[0]) this.addSt(al[0], 'vulnerable', 2); }
    if (f.loseHand) { let n = f.loseHand.n; for (const s of [...this.hand]) { if (n <= 0) break; if (s.cards.some((c) => c.type === 'power')) continue; const ok = f.loseHand.base === 'any' || s.cards.some((c) => baseOf(c.id) === f.loseHand.base); if (!ok) continue; this.hand = this.hand.filter((x) => x !== s); for (const c of s.cards) if (!c.temp) this.discard.push(c); await this.fx.binned?.(s); n--; } }
    if (f.loseDeck) { for (let k = 0; k < f.loseDeck; k++) { const pool = this.run.deck.filter((c) => !['apple', 'force'].includes(c.id)); if (pool.length <= 4) break; const c = this.rng.pick(pool); this.run.deck = this.run.deck.filter((x) => x !== c); this.lost.push(c); out.lost = [...(out.lost || []), c.id]; } }
    if (f.steal && e.alive) { const pool = this.discard.length ? this.discard : this.draw; if (pool.length) { const c = pool.pop(); /* the top card */ e.loot = c; e.lootTurns = 0; await this.fx.steal?.(e, c); } }
    if (f.flee && e.alive) { e.alive = false; e.fled = true; if (e.loot) { this.lost.push(e.loot); e.loot = null; } await this.fx.flee?.(e); }
    const add = [];
    for (const id of f.deck || []) { const c = mkCard(id); this.run.deck.push(c); add.push(this.slotOf([{ ...c }])); }
    for (const id of f.cards || []) add.push(this.slotOf([{ ...mkCard(id), temp: true }]));
    const got = []; for (const sl of add) { if (this.handCount() < this.handMax()) { this.hand.push(sl); got.push(sl); } else if (!sl.cards[0].temp) this.discard.push(sl.cards[0]); }
    if (got.length) await this.fx.drew?.(got); out.cards = got.map((sl) => sl.cards[0].id);
    if (f.draw) await this.drawCards(f.draw);
    return out;
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
    if (this.has('horn_shard')) m.hornForce = (m.hornForce || 0) + 1;
    if (this.has('plumb_bob')) m.plumb = true;
    if (this.has('lead_boots')) m.massMul = 2;
    if (this.hand.some((sl) => flatten(sl.cards).some((c) => baseOf(c.id) === 'water'))) m.waterInHand = true; // Catalyst
    m.heat = this.heatOn() ? this.heat : 0;
    const P = this.player; m.block = P.block; if (P.st.momentum) m.momentum = P.st.momentum; if (P.st.charged) m.charged = P.st.charged; if (P.st.kindle) m.kindle = P.st.kindle;
    return m;
  }
  moveOf(slot) { const comps = flatten(slot.cards); return comps.length ? computeMove(comps, this.mods()) : null; }

  // what happens if `slot` is dropped on `target` ({type:'enemy',uid}|{type:'self'}|{type:'field'}|{type:'object',uid}|{type:'bin'})
  preview(slotId, target) {
    const s = this.findSlot(slotId); if (!s || this.phase !== 'player') return { ok: false };
    const power = s.cards.find((c) => c.type === 'power');
    if (power) return { ok: s.cards.length === 1, kind: 'power', text: s.cards.length === 1 ? 'Enact this Law' : 'Laws cannot be mixed' };
    const mv = this.moveOf(s); if (!mv) return { ok: false };
    if (target.type === 'air') { const why = this.manifestBlock(s); return { ok: !why, move: mv, kind: 'manifest', text: why || `Manifest: ${mv.name}`, heat: this.heatPreview(heatGain(flatten(s.cards))) }; }
    if (target.type === 'held' && s.cards.length === 1 && BASICS[s.cards[0].id]?.twin) { const o = this.held.find((x) => x.uid === target.uid); if (!o) return { ok: false }; const room = this.held.length < HELD_MAX; const hp = this.heldPreview(o); return { ok: room, kind: 'mirror', held: o, move: hp.mv, target: hp.target, est: hp.est, text: room ? `Looking-Glass: a twin ${hp.mv.name}` : `No room for a twin (${HELD_MAX} things already hang in the air)` }; }
    if (target.type === 'held') { const o = this.held.find((x) => x.uid === target.uid); if (!o) return { ok: false }; const nm = this.heldMove(o, flatten(s.cards)); const t = this.heldTarget(o, target.aim, nm); const obj = { ...o, golden: this.nextMergeGolden() }; return { ok: true, move: nm, kind: 'manipulate', held: o, target: t, est: t && nm.attack.valid ? this.calc(nm, t, { obj }) : null, text: nm.name, heat: this.heatPreview(heatGain(flatten(s.cards), o.comps)) }; }
    if (target.type === 'enemy') { const e = this.enemies.find((x) => x.uid === target.uid && x.alive); if (!e || !mv.attack.valid) return { ok: false, move: mv, kind: 'attack', text: 'Nothing to throw' }; return { ok: true, move: mv, kind: 'attack', est: this.estimate(mv, e) }; }
    if (target.type === 'self') return { ok: mv.self.valid, move: mv, kind: 'self', heat: this.heatPreview(mv.self.vent || mv.self.quench ? -this.heat : mv.self.heat) };
    if (target.type === 'field') return { ok: mv.field.valid, move: mv, kind: 'field', text: mv.field.valid ? `Place: ${mv.field.name}` : 'Nothing to place' };
    if (target.type === 'object') { const f = this.field.find((x) => x.uid === target.uid); const r = f && this.objectReaction(f, mv, true); return { ok: !!r, move: mv, kind: 'object', text: r ? r.text : 'No reaction' }; }
    return { ok: false };
  }
  estimate(mv, e, opts = {}) { return this.calc(mv, e, opts); }
  // ---- the whole arithmetic of one strike, line by line: base m×v, merge synergies, artifacts, the target. Every line
  // is exact (the dice artifacts run on a shown cycle), so lo = hi = ev = total.
  calc(mv, e, { obj = null } = {}) {
    const a = mv.attack; const lines = a.lines.map((l) => ({ ...l })); const art = artifactLines(this, mv, e, obj); lines.push(...art.lines); if (e) lines.push(...foeLines(e, mv, this));
    if (this.player.st.weak) lines.push({ text: 'You are Weak', mul: 0.75, kind: 'anti' });
    let mul = 1; for (const l of lines) if (l.kind !== 'base') mul *= l.mul ?? 1;
    const hits = (a.hits || 1) * (art.split ? 3 : 1); const jar = lines.find((l) => l.pandora); const dud = a.fizzle || jar;
    const per = dud ? 0 : Math.round(a.base * mul);
    const zap = !dud && a.charge && !(e && immuneTo(e, 'electric')) ? a.charge * (e && (e.st.wet || a.wet) ? 2 : 1) : 0;
    const total = per * hits + zap;
    lines.push({ kind: 'total', text: dud ? 'fizzles: 0' : `= ${per}${hits > 1 ? ` × ${hits} hits` : ''}${zap ? ` + zap ${zap}` : ''}` });
    return { lines, perHit: per, hits, total, lo: total, hi: total, ev: total, zap, spread: a.spread, mul, odds: false, fizzle: a.fizzle || (jar ? jar.text : null) };
  }
  rollOdds() { return []; } // (kept for callers: nothing is rolled any more)
  headsAlive(body) { return this.enemies.filter((x) => x.alive && x.parent === body.uid).length; }

  async play(slotId, target) {
    const pv = this.preview(slotId, target); if (!pv.ok) { await this.fx.invalid?.(pv.text); return false; }
    if (pv.kind === 'manifest') return !!(await this.manifest(slotId, target.pos, target.aim));
    if (pv.kind === 'manipulate') return this.manipulate(target.uid, slotId, target.aim);
    if (pv.kind === 'mirror') return this.mirror(target.uid, slotId);
    const s = this.findSlot(slotId); this.hand = this.hand.filter((x) => x !== s);
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
    if (wine) { this.flags.wineskinUsed = true; const al = this.alive(); target = { type: 'enemy', uid: al.reduce((a, b) => (b.hp > a.hp ? b : a)).uid }; }
    if (pv.kind === 'attack') { await this.attack(mv, this.enemies.find((e) => e.uid === target.uid), slotId); this.flags.throws = (this.flags.throws || 0) + 1; await this.addHeat(heatGain(mv.comps), 'throw'); }
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
    if (cnt('gravity') && (this.powers.orbit !== undefined || this.field.some((f) => f.type === 'moon')) && this.alive().length) { const t = this.front(); await this.fx.moonStrike?.(t); await this.damageEnemy(t, this.powers.orbit ? 12 : 8, { fall: true }); }
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
    const m = this.mods(); m.momentum = (m.momentum || 0) + wind; if (extra.length && this.heatOn()) m.heat = Math.max(0, Math.min(HEAT.max, this.heat + heatGain(extra, o.comps))); return computeMove(comps, m);
  }
  heldTarget(o, aim, mv = null) {
    const al = this.alive(); const fixed = aim || (o.aimed ? o.target : null);
    return al.find((e) => e.uid === fixed) || (o.comps ? this.smartTarget(mv || this.heldMove(o)) : null) || al.find((e) => !e.def.isHead) || al[0] || null;
  }
  // the most sensible foe for a Move: one it can finish off (the most dangerous first), else the one about to hit
  // hardest, else the most wounded. A Magnet always seeks the biggest hitter.
  threatOf(e) { const it = e.intent; if (!it || !(it.kind === 'attack' || it.dmg)) return 0; return this.attackValue(e, it.dmg || 0) * (it.hits || 1); }
  smartTarget(mv) {
    const al = this.alive(); if (!al.length) return null; let best = null, bs = -1e9;
    for (const e of al) {
      const threat = this.threatOf(e); const eff = e.hp + (mv.attack.pierce ? 0 : e.block); const est = mv.attack.valid ? this.calc(mv, e).ev : 0;
      let sc = mv.attack.seek === 'threat' ? threat * 10 : est >= eff ? 1000 + threat * 2 - eff * 0.1 : threat * 3 + (1 - e.hp / e.maxHp) * 20 - eff * 0.2;
      if (e.def.isHead && !(mv.attack.burn > 0)) sc -= 4; // a severed head regrows unless burnt
      if (sc > bs) { bs = sc; best = e; }
    }
    return best;
  }
  heldPreview(o) { const mv = this.heldMove(o); const t = this.heldTarget(o); return { mv, target: t, est: t && mv.attack.valid ? this.calc(mv, t, { obj: o }) : null }; }
  // the Golden Ratio: every 5th merge of the run is a golden one
  nextMergeGolden() { return this.has('golden_ratio') && ((this.run.flags.merges || 0) + 1) % 5 === 0; }
  async manifest(slotId, pos = null, aim = null) {
    const s = this.findSlot(slotId); if (!s || this.manifestBlock(s)) return null;
    this.hand = this.hand.filter((x) => x !== s);
    const o = { uid: uid('h'), comps: flatten(s.cards), cards: s.cards.map((c) => c.id), wind: 0, pos: pos ? { ...pos } : null, target: aim || null, aimed: !!aim };
    o.target = o.target || this.heldTarget(o)?.uid || null; o.aimed = !!o.target; // locked at once: merging never re-routes it (re-aim by dragging it onto a foe)
    this.held.push(o); for (const c of s.cards) if (!c.temp) this.discard.push(c);
    await this.fx.manifested?.(o, s);
    await this.addHeat(heatGain(o.comps), 'grab'); // grabbing the apple out of the air: friction
    if (this.has('greaves')) await this.gainBlock(3, 'greaves');
    if (this.tutorial) this.tutorial.did?.('place');
    return o;
  }
  async manipulate(objId, slotId, aim = null) {
    const o = this.held.find((x) => x.uid === objId), s = this.findSlot(slotId); if (!o || !s || this.phase !== 'player' || s.cards.some((c) => c.type === 'power')) return false;
    this.hand = this.hand.filter((x) => x !== s);
    const add = flatten(s.cards); o.comps.push(...add); o.cards.push(...s.cards.map((c) => c.id)); o.wind += add.filter((c) => BASICS[c.id]?.kind !== 'matter').length;
    if (aim) { o.target = aim; o.aimed = true; }
    if (this.nextMergeGolden()) o.golden = true; this.run.flags.merges = (this.run.flags.merges || 0) + 1;
    for (const c of s.cards) if (!c.temp) this.discard.push(c);
    await this.fx.manipulated?.(o, s);
    await this.addHeat(heatGain(add, o.comps.slice(0, o.comps.length - add.length)), 'merge'); // rubbing, spinning, throwing it: friction
    const dm = add.reduce((k, c) => k + (BASICS[c.id]?.drawOnMerge || 0), 0); if (dm) await this.drawCards(dm); // Hypothesis: merging it draws
    if (this.tutorial) this.tutorial.did?.('merge');
    await this.checkDiscovery(this.heldMove(o));
    return true;
  }
  // the Looking-Glass: a twin of a held object appears beside it, made of the same cards (and grows on its own)
  async mirror(objId, slotId) {
    const o = this.held.find((x) => x.uid === objId), s = this.findSlot(slotId); if (!o || !s || this.held.length >= HELD_MAX) return false;
    this.hand = this.hand.filter((x) => x !== s); for (const c of s.cards) if (!c.temp) this.discard.push(c);
    const twin = { uid: uid('h'), comps: o.comps.map((c) => ({ ...c })), cards: [...o.cards], wind: o.wind, pos: null, target: o.target, aimed: o.aimed, golden: o.golden, twinOf: o.uid };
    this.held.push(twin); this.run.flags.clones = (this.run.flags.clones || 0) + 1;
    await this.fx.mirrored?.(twin, o, s); return twin;
  }
  aim(objId, enemyUid) { const o = this.held.find((x) => x.uid === objId); const e = this.enemies.find((x) => x.uid === enemyUid && x.alive); if (!o || !e) return false; o.target = e.uid; o.aimed = true; this.fx.aimed?.(o, e); return true; }
  // a merge never made before in this run: the game offers three new cards right away (one pick per turn)
  async checkDiscovery(mv) {
    if (!mv || mv.n < 2) return null; const run = this.run; const known = (run.discovered ||= []);
    if (known.includes(mv.key)) return null; known.push(mv.key); run.stats.combos = (run.stats.combos || 0) + 1;
    const newLaw = mv.special?.law && !(run.laws ||= []).includes(mv.special.key); if (newLaw) { run.laws.push(mv.special.key); this.fx.artifact?.('law:' + mv.special.key); }
    if (this.flags.pickedThisTurn && !newLaw) { await this.fx.discovered?.(mv); return null; } this.flags.pickedThisTurn = true; // a newly found Law always offers its pick
    const opts = discoveryChoices(run, 3, newLaw ? 1 : 0); const pick = await this.fx.discoverPick?.(mv, opts, this.calc(mv, this.heldTarget({ comps: mv.comps }, null, mv))); const id = opts.includes(pick) ? pick : opts[0]; if (!id) return null;
    const c = mkCard(id); run.deck.push(c); const slot = this.slotOf([{ ...c }]);
    if (this.handCount() < HAND_MAX) { this.hand.push(slot); await this.fx.drew?.([slot]); } else this.discard.push(slot.cards[0]);
    return id;
  }
  async release() {
    const list = this.held; this.held = [];
    for (let i = 0; i < list.length; i++) {
      const o = list[i]; const t = this.heldTarget(o); const mv = this.heldMove(o); this.held = list.slice(i); // (throwN reads its place in line)
      if (this.over || !t) { this.fx.unheld?.(o); continue; }
      if (mv.attack.fizzle) { await this.fx.fizzle?.(o, mv.attack.fizzle, 'anti'); this.discover(mv); continue; }
      if (!mv.attack.valid || !mv.attack.launched) { await this.fx.fizzle?.(o, mv.attack.launched ? 'It has no punch.' : 'Nothing launched it: add Force or Motion.'); continue; }
      const plan = this.calc(mv, t, { obj: o }); const jar = plan.lines.find((l) => l.pandora);
      if (jar) { this.flags.throws = (this.flags.throws || 0) + 1; await this.fx.fizzle?.(o, `${jar.text}: nothing came out.`, 'odds'); continue; }
      await this.fx.release?.(o, mv, t, []);
      this.discover(mv); const P = this.player; delete P.st.momentum; delete P.st.charged;
      await this.attack(mv, t, null, { obj: o }); this.flags.throws = (this.flags.throws || 0) + 1;
      if (mv.attack.float && mv.attack.m) await this.gainBlock(mv.attack.m * (mv.attack.floatK || 1), 'float');
      if (mv.attack.fall && this.has('icarus_feather')) await this.hurtPlayer(2, { pure: true, kind: 'wax' });
      await this.afterMove(mv, 'attack', { type: 'enemy', uid: t.uid });
      this.checkEnd();
    }
    this.held = [];
  }

  discover(mv) {
    const r = this.run; r.stats.moves++;
    if (mv.n >= 2) { const known = !!this.run.journal?.combos?.[mv.key]; this.run.onDiscover?.(mv); if (!known) this.fx.eureka?.(mv); }
  }

  // ------------------------------------------------------------------ attacks
  async attack(mv, target, slotId, opts = {}) {
    const a = mv.attack; if (!target || !target.alive) target = this.alive()[0]; if (!target) return;
    opts = { ...opts };
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
    const zap = a.charge || 0; const hp0 = target.hp + target.block; const plan = this.calc(mv, target, opts); const planned = plan.total;
    for (const id of new Set(plan.lines.filter((l) => l.art && (l.mul ?? 1) !== 1).map((l) => l.art))) this.fx.artifact?.(id);
    for (const t of targets) await this.strike(mv, t, 1, opts);
    if (a.chainWet) for (const t of this.alive()) if (!targets.includes(t) && t.st.wet) { await this.fx.chain?.(t); await this.strike(mv, t, 1, opts); } // Spark + Water
    if (a.shove) for (const t of targets) if (t.alive) this.addSt(t, 'shoved', a.shove);
    if (a.carry && !a.spread && !target.alive) { const over = planned - hp0; const next = this.alive().find((e) => !e.def.isHead) || this.alive()[0]; if (over > 0 && next) { await this.fx.ricochet?.(next); await this.damageEnemy(next, over, { kind: 'kinetic', move: mv }); } }
    if (a.bounce) { let pool = this.inLine().filter((e) => !targets.includes(e)); let mul = 1; for (let i = 0; i < a.bounce && pool.length; i++) { const t = pool[0]; /* bounces go down the line */ pool = pool.filter((x) => x !== t); mul *= 1 - (a.bounceFalloff || 0); await this.fx.bounce?.(t); await this.strike(mv, t, mul, opts); } }
    if (zap) { for (const e of this.alive()) if (!targets.includes(e) && e.st.wet) { await this.fx.chain?.(e); await this.damageEnemy(e, zap * 2, { kind: 'zap', pierce: true }); } }
    if (a.ignite) for (const t of this.alive()) if (!immuneTo(t, 'hot')) this.addSt(t, 'burn', a.ignite); // a scorching apple sets the whole field alight
    if (a.persist && a.perHit > 0) this.addField('momentum', { turns: a.persist, target: target.uid, m: a.m, v: a.v, hits: a.hits, grow: a.grow, fall: a.fall, name: mv.name, art: mv.art });
    if (planned > (this.run.stats.bestHit || 0)) this.run.stats.bestHit = planned;
    if (mv.n >= 2 && planned > 0) this.run.onRecord?.(mv, planned);
  }
  // one target, full hits
  async strike(mv, t, mul = 1, opts = {}) {
    const a = mv.attack; const hits = this.calc(mv, t, opts).hits;
    for (let h = 0; h < hits; h++) {
      if (!t.alive) { const nx = this.front(); if (!nx) return; t = nx; await this.fx.ricochet?.(t); } // a kill sends the next hit on to the front foe
      const per = Math.round(this.calc(mv, t, opts).perHit * mul); t.strikes = (t.strikes || 0) + 1;
      if (per > 0) await this.damageEnemy(t, per, { fall: a.fall, hard: a.hard, pierce: a.pierce, single: !a.spread, kind: 'kinetic', move: mv, hit: h, burnKill: a.burn > 0, pre: true });
      if (!t.alive) continue;
      if (this.has('fang') && hits > 1) this.addSt(t, 'venom', 1);
      if (a.venom && h === 0) this.addSt(t, 'venom', a.venom);
    }
    if (!t.alive) return;
    if (a.charge && !immuneTo(t, 'electric')) await this.damageEnemy(t, a.charge * (t.st.wet || a.wet ? 2 : 1), { kind: 'zap', pierce: true, burnKill: a.burn > 0 });
    if (!t.alive) return;
    if (a.wet) { if (t.st.burn) { delete t.st.burn; this.addSt(t, 'blind', 1); await this.fx.steam?.(t); } this.addSt(t, 'wet', a.wet); }
    if (a.burn && !immuneTo(t, 'hot')) { if (t.st.wet) { delete t.st.wet; this.addSt(t, 'blind', 1); await this.fx.steam?.(t); } else this.addSt(t, 'burn', a.burn); }
    if (a.chill || a.weakOnHit) this.addSt(t, 'weak', a.chill || a.weakOnHit);
    if (a.dizzyOnHit) this.addSt(t, 'dizzy', a.dizzyOnHit);
    if (a.disarm) this.addSt(t, 'strength', -a.disarm);
    if (t.alive && t.def.struck) await t.def.struck(this, t, mv, hits); // the newer foes react to what hit them (a flipped shell, a doused furnace...)
  }

  async damageEnemy(e, amount, o = {}) {
    if (!e || !e.alive || amount <= 0) return 0;
    if (e.st.evade && o.single && !o.fall && !this.field.some((f) => f.type === 'well')) { e.st.evade--; if (!e.st.evade) delete e.st.evade; await this.fx.miss?.(e); this.learn(e, 'evade'); return 0; }
    if (e.def.uncatchable && o.single && !o.fall && o.kind === 'kinetic' && !this.field.some((f) => f.type === 'well')) { await this.fx.miss?.(e); this.learn(e, 'uncatchable'); return 0; } // the Teumessian Fox: only a fall, a wave or a well can catch it
    let dmg = amount;
    if (e.st.vulnerable && !o.pre) dmg = Math.round(dmg * 1.5); // (a Move's strike has its whole arithmetic done in calc)
    if (e.def.thickHide && !o.fall && o.kind === 'kinetic' && this.headsAlive(e) >= 3) { if (!o.pre) dmg = Math.round(dmg * 0.5); this.learn(e, 'hide'); }
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
    if (s.keepBlock) P.keepBlock = true;
    if (s.clone) { // Echo on Newton: the leftmost card of the hand is cloned (a copy for this battle only)
      const src = this.hand.find((sl) => !sl.cards.some((c) => c.type === 'power'));
      if (src && this.handCount() + src.cards.length <= this.handMax()) { const copy = this.slotOf(src.cards.map((c) => ({ ...c, uid: uid('c'), temp: true, petrified: false }))); this.hand.splice(this.hand.indexOf(src) + 1, 0, copy); this.run.flags.clones = (this.run.flags.clones || 0) + 1; await this.fx.drew?.([copy]); await this.fx.cloned?.(copy, src); }
      else await this.fx.bark?.('player', src ? 'No room in my hand for an echo.' : 'An echo of... nothing. Profound.');
    }
    if (s.moon && !this.field.some((f) => f.type === 'moon')) this.addField('moon', {});
    if (s.vent && this.heat > 0) { const v = this.heat; await this.setHeat(0, 'bellows'); await this.gainBlock(v, 'bellows'); } // Bellows: the Heat becomes a shield
    else if (s.quench && this.heat > 0) { const v = this.heat; await this.setHeat(0, 'quench'); await this.fx.quench?.(v); for (const e of this.alive()) { this.addSt(e, 'wet', 1); await this.damageEnemy(e, v * 2, { kind: 'steam', pierce: true }); } } // Quench: a steam burst
    if (s.heat) await this.addHeat(s.heat, s.heat > 0 ? 'rub' : 'cool');
    if (s.draw) { const got = await this.drawCards(s.draw + (this.has('owl') && mv.comps.some((c) => ['lens', 'notebook'].includes(baseOf(c.id))) ? 1 : 0));
      if (s.hypo) for (const sl of got.slice(0, 1)) for (const c of sl.cards) if (BASICS[c.id]?.kind === 'matter') { c.bm = (c.bm || 0) + s.hypo; await this.fx.hypothesis?.(sl, true); } }
    if (s.scratch) { const pick = await this.chooseSlots({ min: s.scratch, max: s.scratch, title: `Discard ${s.scratch}` }); await this.discardSlots(pick, 'scratch'); }
    if (s.recycle != null) { const pick = await this.chooseSlots({ min: 0, max: 99, title: 'Discard any: draw that many' + (s.recycle ? ' +' + s.recycle : ''), recycle: true }); const n = pick.reduce((k, sl) => k + sl.cards.length, 0); await this.discardSlots(pick, 'recycle'); await this.drawCards(n + (s.recycle || 0)); }
    await this.fx.selfApplied?.(mv); if (this.tutorial) this.tutorial.did?.('self');
  }
  async healPlayer(n) { const P = this.player; const h = Math.min(n, P.maxHp - P.hp); P.hp += h; if (h > 0) this.run.stats.healed = (this.run.stats.healed || 0) + h; await this.fx.heal?.('player', h); } // (achievements: 'win without healing')
  async gainBlock(n, src) { const P = this.player; if (P.st.corrode) n = Math.floor(n / 2); if (P.st.frail) n = Math.floor(n * 0.75); P.block += n; await this.fx.block?.('player', n, src); }

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
    if ((f.type === 'boulder' || f.type === 'rolling') && (has('force') || has('gravity')) && al.length) return R('Launch the boulder!', async () => { const t = this.front(); const v = 4 + mv.attack.v; this.removeField(f); await this.fx.launch?.(f, t); await this.damageEnemy(t, (f.mass || 3) * v, { hard: true, fall: has('gravity'), kind: 'kinetic' }); });
    if (f.type === 'sapling' && f.grown && (has('force') || has('gravity')) && al.length) return R('Shake the tree: apples fall on everyone!', async () => { await this.fx.shakeTree?.(f); for (let i = 0; i < 3; i++) { const L = this.inLine(); const t = L[i % Math.max(1, L.length)]; if (t) await this.damageEnemy(t, (f.golden ? 3 : 1) * 6, { fall: true, kind: 'apple' }); } });
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
      const t = this.enemies.find((e) => e.uid === f.target && e.alive) || this.front();
      f.v = f.grow ? f.v + 2 : f.v - 2;
      if (t && f.v > 0) { await this.fx.momentumHit?.(f, t); await this.damageEnemy(t, (f.m || f.mass) * f.v * (f.hits || 1), { fall: f.fall, kind: 'kinetic' }); }
      if (f.type === 'momentum') { f.turns--; if (f.turns <= 0 || f.v <= 0) this.removeField(f); } else if (f.v <= 0) this.removeField(f);
    }
    if (f.type === 'catapult' && f.loaded && al.length) { const t = this.front(); await this.fx.launch?.(f, t); await this.damageEnemy(t, f.loaded.m * f.loaded.v * f.loaded.hits * 2, { kind: 'kinetic' }); f.loaded = null; this.fx.fieldUpdate?.(f); }
  }
  async fieldTurnEnd() {
    for (const f of [...this.field]) {
      const al = this.alive(); if (!al.length) return;
      if (f.type === 'campfire') for (const e of al) this.addSt(e, 'burn', 2);
      if (f.type === 'coil') { const t = this.front(); await this.fx.zapFrom?.(f, t); await this.damageEnemy(t, Math.max(4, f.charge || 5) * (t.st.wet ? 2 : 1), { kind: 'zap', pierce: true }); }
      if (f.type === 'glass') { const t = al.reduce((a, b) => (b.hp > a.hp ? b : a)); this.addSt(t, 'burn', this.field.some((x) => x.type === 'campfire') ? 4 : 2); }
      if (f.type === 'rain') for (const e of al) this.addSt(e, 'wet', 1);
      if (f.type === 'whirl') for (const e of al) await this.damageEnemy(e, 2 + 2 * (f.spin || 0), { kind: 'wind' });
      if (f.type === 'steam') for (const e of al) this.addSt(e, 'blind', 1);
      if (f.turns > 0 && !['momentum'].includes(f.type)) { f.turns--; if (f.turns <= 0) this.removeField(f); else this.fx.fieldUpdate?.(f); }
    }
  }

  // ------------------------------------------------------------------ APPLE HEAT (friction): gain, overheat, vent
  heatOn() { return (!this.tutorial || !!this.tutorial.heat) && !this.run.flags?.noHeat; } // the prologue teaches Heat too (gently)
  heatPreview(gain = 0) { if (!this.heatOn() || !gain) return null; const to = this.heat + gain; return { from: this.heat, to: Math.max(0, Math.min(HEAT.max, to)), gain, over: to > HEAT.max }; }
  async setHeat(h, why = '') { const h0 = this.heat; this.heat = Math.max(0, Math.min(HEAT.max, h)); if (this.heat !== h0) await this.fx.heat?.(this.heat, this.heat - h0, why); }
  async addHeat(n, why = '') {
    if (!n || !this.heatOn() || this.over) return 0; const h0 = this.heat; const to = h0 + n;
    if (to > HEAT.max) { await this.setHeat(HEAT.max, why); await this.overheat(); return this.heat - h0; }
    await this.setHeat(to, why); return this.heat - h0;
  }
  // past the top of the gauge: the apple flares. It scorches Newton and burns a card in his hand (this battle only),
  // then settles back to HEAT.overTo. Salamander Scale: no harm. Phoenix Feather: the flare sets every foe alight.
  async overheat() {
    this.flags.overheats = (this.flags.overheats || 0) + 1; const safe = this.has('salamander');
    await this.fx.overheat?.(safe); if (safe) this.fx.artifact?.('salamander');
    this.heat = HEAT.overTo;
    if (!safe) {
      await this.hurtPlayer(HEAT.scorchDmg, { pure: true, kind: 'scorch' }); if (this.over) return;
      const pool = this.hand.filter((sl) => !sl.cards.some((c) => c.type === 'power'));
      if (pool.length) { const sl = pool[pool.length - 1]; /* the rightmost card in your hand */ this.hand = this.hand.filter((x) => x !== sl); for (const c of sl.cards) if (!c.temp) this.exhaust.push(c); await this.fx.burnt?.(sl); }
      else if (this.draw.length) { const c = this.draw.pop(); this.exhaust.push(c); await this.fx.burnt?.(this.slotOf([c])); }
    }
    if (this.has('phoenix')) { this.fx.artifact?.('phoenix'); for (const e of this.alive()) if (!immuneTo(e, 'hot')) this.addSt(e, 'burn', 4); await this.healPlayer(4); }
    await this.fx.heat?.(this.heat, 0, 'overheat');
  }
  // the thermometer's valve: once a turn, let ALL the Heat out; every foe Burns half of it
  canVent() { return this.phase === 'player' && this.heatOn() && this.heat > 0 && !this.flags.vented && !this.over; }
  async vent() {
    if (!this.canVent()) return 0; const v = this.heat; this.flags.vented = true;
    await this.fx.vented?.(v); await this.setHeat(0, 'vent');
    const b = Math.ceil(v / 2); for (const e of this.alive()) if (!immuneTo(e, 'hot')) this.addSt(e, 'burn', b);
    return v;
  }

  // ------------------------------------------------------------------ enemy turn
  async endTurn() {
    if (this.phase !== 'player') return; if (this.tutorial) this.tutorial.did?.('end');
    if (this.held.length) { await this.release(); if (this.checkEnd()) return; } // the bell lets go of everything held in the air
    if (this.heat > 0) await this.addHeat(-(this.has('ember') ? 1 : HEAT.cool), 'cool'); // time flows: the apple cools
    this.phase = 'enemy';
    const P = this.player;
    if (!P.retain) { for (const s of this.hand) for (const c of s.cards) if (!c.temp) this.discard.push(c); this.hand = []; }
    await this.fx.endTurn?.(this);
    // pendulum
    if (this.has('pendulum') && this.turn % 3 === 0 && this.flags.movesThisTurn.length) {
      const big = this.flags.movesThisTurn.filter((x) => x.kind === 'attack').sort((a, b) => b.total - a.total)[0];
      if (big && this.alive().length) { const t = this.front(); await this.fx.pendulum?.(t); await this.damageEnemy(t, Math.round(big.total * 0.5), { kind: 'kinetic' }); }
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
      for (const k of ['weak', 'vulnerable', 'blind', 'dizzy', 'wet']) if (e.st[k]) this.decSt(e, k); delete e.st.shoved;
      e.reflected = false;
    }
    for (const e of this.enemies) if (e.alive && e.pendingHeads > 0) { const n = e.pendingHeads; e.pendingHeads = 0; for (let i = 0; i < n; i++) { const h = this.spawnEnemy('hydra_head', { parent: e.uid }); this.pickIntent(h); await this.fx.enemySpawn?.(h); } await this.fx.bark?.(e, 'Two heads are better than one!'); this.learn(e, 'regrow'); }
    if (this.checkEnd()) return;
    for (const k of ['weak', 'vulnerable', 'wet', 'blind', 'corrode', 'frail']) if (P.st[k]) this.decSt(P, k);
    if (P.st.burn) { await this.hurtPlayer(P.st.burn, { pure: true, kind: 'burn' }); this.decSt(P, 'burn'); }
    for (const e of this.alive()) { if (e.def.ramp) this.addSt(e, 'strength', e.def.ramp); e.turn++; e.block = e.def.keepBlock ? e.block : 0; this.pickIntent(e); } // some foes grow stronger every round
    await this.fx.intents?.(this);
    if (this.sandbox && !this.over) await this.fx.dusk?.(this); // (a forecast notes the moment the foes are done)
    if (!this.over) await this.startPlayerTurn(); // (in a forecast it stops before the next hand is dealt)
  }
  pickIntent(e) { e.intent = e.def.ai(e, this, this.rng); if (e.loot) e.lootTurns++; e.next = this.has('antikythera') ? e.def.ai({ ...e, turn: e.turn + 1, st: { ...e.st } }, this, this.rng) : null; }

  // a foe's blow: base × difficulty + Strength; Weak −25%; Blind halves it (no more coin-flip misses)
  attackValue(e, base) { let d = Math.round(base * this.diffDmg(e.def, e.id)) + (e.st.strength || 0); if (e.st.weak) d = Math.floor(d * 0.75); if (e.st.blind) d = Math.floor(d / 2); return Math.max(0, d); }

  async enemyAct(e) {
    const it = e.intent; if (!it) return;
    if (e.st.stun) { this.decSt(e, 'stun'); await this.fx.stunned?.(e, 'stun'); return; }
    if (e.def.stall && e.st.weak && it.kind === 'attack') { delete e.st.weak; await this.fx.stunned?.(e, 'stall'); await this.fx.bark?.(e, e.def.stall); this.learn(e, 'stall'); return; } // friction damps a pendulum: it skips the swing
    if (e.reflected && it.kind === 'debuff') { this.addSt(e, 'stun', 1); await this.fx.reflect?.(e); await this.damageEnemy(e, 10, { kind: 'reflect', pierce: true }); this.learn(e, 'reflect'); return; }
    await this.fx.enemyAct?.(e, it);
    if (it.custom && e.def.act) { await e.def.act(this, e, it); return; } // the newer foes run their own intents (data/enemies.js)
    const al = () => this.inLine().filter((x) => x !== e);
    if (it.kind === 'attack') {
      // Minotaur charge vs. solid objects
      if (it.charge) { const solid = this.field.find((f) => ['boulder', 'rolling'].includes(f.type) || (f.type === 'sapling' && f.grown)); if (solid) { this.removeField(solid); await this.fx.crash?.(e, solid); this.addSt(e, 'stun', 1); await this.damageEnemy(e, 15 + (solid.guard || 0), { kind: 'crash', pierce: true }); this.learn(e, 'crash'); await this.fx.bark?.('player', 'Momentum is conserved. Your dignity is not.'); return; } }
      for (let h = 0; h < (it.hits || 1); h++) {
        if (!e.alive || this.over) break;
        let dmg = this.attackValue(e, it.dmg); if (e.st.shoved) { dmg = Math.max(0, dmg - e.st.shoved); if (h === (it.hits || 1) - 1) delete e.st.shoved; } // knocked back by a Force
        if (e.st.dizzy && h === 0) { const t = al()[0] || e; await this.fx.friendlyFire?.(e, t); await this.damageEnemy(t, t === e ? Math.ceil(dmg / 2) : dmg, { kind: 'kinetic' }); this.learn(e, 'drunk'); continue; } // Dizzy: its first blow lands on the foe beside it (alone: on itself, for half)
        if (this.has('wings') && !this.flags.wingsUsed && !this.flags.wingsMelted) { this.flags.wingsUsed = true; await this.fx.miss?.('player', e, 'wings'); continue; }
        const wind = this.field.find((f) => f.type === 'whirl'); if (wind) dmg = Math.max(0, dmg - 3);
        const cover = this.field.find((f) => (f.type === 'boulder' || f.type === 'rolling') && f.guard > 0);
        if (cover && !it.charge) { const ab = Math.min(cover.guard, dmg); cover.guard -= ab; dmg -= ab; await this.fx.coverHit?.(cover, ab); if (cover.guard <= 0) this.removeField(cover); else this.fx.fieldUpdate?.(cover); }
        if (this.field.some((f) => f.type === 'puddle')) this.addSt(e, 'wet', 1);
        await this.blow(e, dmg, h, it);
        if (it.venom) this.addSt(this.player, 'venom', it.venom);
      }
      for (const [k, n] of Object.entries(it.status || {})) if (!this.over) this.addSt(this.player, k, n);
    } else if (it.kind === 'block') { e.block += it.block; if (it.str) this.addSt(e, 'strength', it.str); await this.fx.enemyBlock?.(e, it.block); }
    else if (it.kind === 'buff') {
      if (it.id === 'flute') { for (const x of this.alive()) this.addSt(x, 'strength', x === e ? 1 : it.str); await this.fx.flute?.(e); }
      if (it.id === 'snort') this.addSt(e, 'strength', it.str);
      if (it.id === 'nimble') { this.addSt(e, 'evade', it.evade); if (it.str) this.addSt(e, 'strength', it.str); }
    } else if (it.kind === 'debuff') {
      if (it.id === 'gaze') { if (it.dmg) await this.blow(e, this.attackValue(e, it.dmg), 0, it); this.addSt(this.player, 'petrify', it.petrify); await this.fx.gaze?.(e); }
      if (it.id === 'steal') {
        for (let h = 0; h < (it.dmg ? it.hits || 1 : 0); h++) if (!this.over) await this.blow(e, this.attackValue(e, it.dmg), h, it);
        const pool = this.discard.length ? this.discard : this.draw; if (pool.length) { const c = pool.pop(); e.loot = c; e.lootTurns = 0; await this.fx.steal?.(e, c); } // the top card of your used pile
      }
      if (it.id === 'acid') { await this.blow(e, this.attackValue(e, it.dmg), 0, it); this.addSt(this.player, 'corrode', it.corrode); }
      if (it.id === 'devour') { await this.blow(e, this.attackValue(e, it.dmg), 0, it); const eaten = []; for (let k = 0; k < (it.devour || 1) && this.draw.length; k++) { const c = this.draw.pop(); /* the next cards you would draw */ this.exhaust.push(c); eaten.push(c); } if (eaten.length) await this.fx.devoured?.(e, eaten); }
      if (!['gaze', 'steal', 'acid', 'devour'].includes(it.id)) await this.genericIntent(e, it); // newer foes describe their curses in data
    } else if (it.kind === 'special') {
      if (it.id === 'spill') { if (!this.field.some((f) => f.type === 'wine')) this.addField('wine', { turns: 3, name: 'Spilled Wine' }); e.hp = Math.min(e.maxHp, e.hp + it.heal); await this.fx.heal?.(e, it.heal); }
      if (it.id === 'flee') { if (this.field.some((f) => f.type === 'well')) { await this.fx.bark?.(e, 'Can\'t... escape... the pull!'); return; } e.alive = false; e.fled = true; if (e.loot) { this.lost.push(e.loot); if (this.has('sack')) this.run.gold += 10; } await this.fx.flee?.(e); }
      if (it.id === 'brood') { if (it.block) e.block += it.block; for (let i = 0; i < (it.n || 1); i++) { const m = this.spawnEnemy(it.spawn, { minionOf: e.uid }); this.pickIntent(m); await this.fx.enemySpawn?.(m); } this.learn(e, 'brood'); }
      if (!['spill', 'flee', 'sprout', 'brood'].includes(it.id)) await this.genericIntent(e, it);
      if (it.id === 'sprout') { const n = Math.min(2, e.def.maxHeads - this.headsAlive(e)); for (let i = 0; i < n; i++) { const h = this.spawnEnemy('hydra_head', { parent: e.uid }); this.pickIntent(h); await this.fx.enemySpawn?.(h); } }
    }
  }

  // data-driven intents for foes without bespoke code: { dmg, hits, status: { weak: 1, ... }, block, heal, str }
  async genericIntent(e, it) {
    for (let h = 0; h < (it.dmg ? it.hits || 1 : 0); h++) { if (this.over) return; await this.blow(e, this.attackValue(e, it.dmg), h, it); }
    for (const [k, n] of Object.entries(it.status || {})) this.addSt(this.player, k, n);
    if (it.block) e.block += it.block; if (it.str) this.addSt(e, 'strength', it.str); if (it.heal) { const h = Math.min(it.heal, e.maxHp - e.hp); e.hp += h; await this.fx.heal?.(e, h); }
  }
  // an enemy blow lands on Newton (Block soaks it first). Talaria: the first blow of each foe turn is sidestepped for half.
  async blow(e, dmg, h = 0, it = null) {
    await this.fx.blow?.(e, h, it, dmg);
    if (dmg > 0 && this.has('talaria') && !this.flags.talaria) { this.flags.talaria = true; dmg = Math.ceil(dmg / 2); this.fx.artifact?.('talaria'); }
    const got = await this.hurtPlayer(dmg, { source: e });
    if (got > 0 && e.def.drain && e.alive && !this.over) { const hh = Math.min(got, e.maxHp - e.hp); if (hh > 0) { e.hp += hh; await this.fx.heal?.(e, hh); this.learn(e, 'drain'); } } // Empusa drinks what gets past your Block
    return got;
  }
  async hurtPlayer(amount, o = {}) {
    const P = this.player; if (amount <= 0 || this.over) return 0;
    let dmg = amount; if (P.st.vulnerable && !o.pure) dmg = Math.round(dmg * 1.5);
    let blocked = 0; if (!o.pure && P.block > 0) { blocked = Math.min(P.block, dmg); P.block -= blocked; dmg -= blocked; }
    P.hp -= dmg; this.stats.blocked += blocked; this.stats.taken += dmg;
    if (blocked && o.source?.alive && this.has('ram')) { await this.fx.artifact?.('ram'); await this.damageEnemy(o.source, blocked, { kind: 'thorns', pierce: true }); } // the Battering Ram: Block hits back
    await this.fx.playerHit?.(dmg, { ...o, blocked });
    if (o.source && o.source.alive) {
      const back = (P.st.thorns || 0) + (this.powers.third_law !== undefined ? (this.powers.third_law ? 5 : 3) : 0);
      if (back) await this.damageEnemy(o.source, back, { kind: 'thorns', pierce: true });
    }
    if (P.hp <= 0 && this.tutorial?.safe) { P.hp = 1; await this.fx.bark?.('player', 'Not... yet...'); } // the first fight cannot be lost
    if (P.hp <= 0) {
      if (this.has('golden_apple') && !this.run.flags.goldenEaten) { this.run.flags.goldenEaten = true; P.hp = Math.round(P.maxHp * 0.4); await this.fx.revive?.(); }
      else { P.hp = 0; this.phase = 'lost'; await this.fx.lost?.(this); }
    }
    return dmg;
  }

  addSt(t, k, n) { if (k === 'prone') k = 'stun'; if (k === 'corrode') k = 'frail'; const st = t === this.player ? this.player.st : t.st; /* fewer statuses: Prone is a Stun, Corrode is Frail */ st[k] = (st[k] || 0) + n; if (st[k] === 0) delete st[k]; this.fx.status?.(t, k, n); }
  decSt(t, k) { const st = t === this.player ? this.player.st : t.st; if (st[k] > 0) st[k]--; if (st[k] <= 0) delete st[k]; }
  learn(e, key) { this.run.onLearn?.(e.id, key); }

  checkEnd() {
    if (this.phase === 'lost' || this.phase === 'won') return true;
    if (this.player.hp <= 0) { this.phase = 'lost'; return true; }
    if (!this.alive().length) { this.phase = 'won'; const st = this.run.stats; st.fastest = Math.min(st.fastest ?? Infinity, this.turn); this.fx.won?.(this); return true; } // (achievements: 'win in 2 turns')
    return false;
  }
  // ------------------------------------------------------------------ THE HYPOTHESIS: an exact forecast of the coming turn
  // The golden apple foretells: a sandbox copy of this battle rings the bell (releases what hangs in the air, cools the
  // apple, lets every foe act) with recording hooks and no presentation, then stops before the next hand is dealt.
  // The rules are deterministic, so what it reports is exactly what End Turn will do.
  sandboxCopy(fx) {
    const B = Object.create(Battle.prototype); const cp = (o) => (o ? { ...o, st: { ...(o.st || {}) } } : o);
    const run = this.run; const R = { ...run, items: [...run.items], stats: { ...run.stats }, flags: { ...(run.flags || {}) }, deck: [...run.deck], player: { ...run.player }, discovered: [...(run.discovered || [])], laws: [...(run.laws || [])], onDiscover: null, onLearn: null, onRecord: null };
    Object.assign(B, { run: R, rng: new RNG(7), fx, kind: this.kind, sandbox: true, turn: this.turn, phase: this.phase, heat: this.heat, tutorial: this.tutorial ? { heat: this.tutorial.heat, safe: this.tutorial.safe } : null });
    B.player = cp(this.player); B.powers = { ...this.powers }; B.log = []; B.stats = { ...this.stats };
    B.enemies = this.enemies.map((e) => ({ ...e, st: { ...e.st }, vars: e.vars ? { ...e.vars } : e.vars }));
    B.field = this.field.map((f) => ({ ...f, loaded: f.loaded ? { ...f.loaded } : f.loaded }));
    B.held = this.held.map((o) => ({ ...o, comps: o.comps.map((c) => ({ ...c })), cards: [...o.cards], pos: o.pos ? { ...o.pos } : o.pos }));
    B.hand = this.hand.map((sl) => ({ uid: sl.uid, cards: sl.cards.map((c) => ({ ...c })) })); B.draw = [...this.draw]; B.discard = [...this.discard]; B.exhaust = [...this.exhaust]; B.lost = [...this.lost];
    B.flags = { ...this.flags, movesThisTurn: [...(this.flags.movesThisTurn || [])], lensOn: new Set(this.flags.lensOn || []) };
    return B;
  }
  /** the coming turn, exactly: { shots:[{obj, target, dmg, kill, fizzle}], foes:{uid:{hp0,hp,block,dead,dmgTo:[...], acts:[{kind,dmg,blocked}]}}, you:{hp0,hp,block0,taken,blocked}, heat0, heat, won, lost } */
  async forecast() {
    if (this.phase !== 'player' || this.over) return null;
    const out = { shots: [], foes: {}, you: { hp0: this.player.hp, block0: this.player.block, taken: 0, blocked: 0, blows: [] }, heat0: this.heat, heat: this.heat, won: false, lost: false };
    for (const e of this.enemies) out.foes[e.uid] = { hp0: e.hp, block0: e.block, hp: e.hp, block: e.block, dead: !e.alive, taken: 0, acts: [], toYou: 0 };
    let shot = null, actor = null;
    const rec = {
      release: async (o, mv, t) => { shot = { obj: o.uid, target: t?.uid || null, dmg: 0, kill: false, name: mv.name }; out.shots.push(shot); },
      fizzle: async (o, why) => { out.shots.push({ obj: o.uid, target: null, dmg: 0, fizzle: why || true }); },
      enemyHit: async (e, dmg) => { const f = out.foes[e.uid]; if (f) f.taken += dmg; if (shot && !actor) { shot.dmg += dmg; } },
      enemyDie: async (e) => { if (shot && !actor && shot.target === e.uid) shot.kill = true; },
      enemyAct: async (e, it) => { shot = null; actor = e; out.foes[e.uid]?.acts.push({ kind: it.kind, label: it.label, id: it.id || null, dmg: 0, blocked: 0, hits: 0 }); },
      playerHit: async (dmg, o) => { out.you.taken += dmg; out.you.blocked += o.blocked || 0; const src = o.source; if (src && out.foes[src.uid]) { const f = out.foes[src.uid]; f.toYou += dmg; const a = f.acts.at(-1); if (a) { a.dmg += dmg; a.blocked += o.blocked || 0; a.hits++; } } else if (dmg) out.you.blows.push({ kind: o.kind || 'pure', dmg }); },
    };
    rec.dusk = async (B) => { out.you.duskHp = Math.max(0, B.player.hp); out.you.duskBlock = B.player.block; shot = null; actor = { dawn: true }; };
    const fx = new Proxy(rec, { get: (t, k) => t[k] || (async () => {}) });
    const B = this.sandboxCopy(fx);
    try { await B.endTurn(); } catch (err) { console.warn('forecast', err); return null; }
    out.you.hp = Math.max(0, B.player.hp); out.you.block = B.player.block; out.heat = B.heat; out.won = B.phase === 'won'; out.lost = B.phase === 'lost' || B.player.hp <= 0;
    for (const e of B.enemies) { const f = out.foes[e.uid] || (out.foes[e.uid] = { hp0: 0, block0: 0, taken: 0, acts: [], toYou: 0, spawned: true }); f.hp = Math.max(0, e.hp); f.block = e.block; f.dead = !e.alive; f.next = e.alive ? e.intent : null; }
    out.dealt = Object.values(out.foes).reduce((k, f) => k + f.taken, 0);
    return out;
  }

  // write results back to the run
  finish() {
    const r = this.run; r.player.hp = Math.max(0, this.player.hp);
    for (const c of r.deck) c.petrified = false;
    if (this.lost.length) r.deck = r.deck.filter((c) => !this.lost.some((l) => l.uid === c.uid));
  }
}
