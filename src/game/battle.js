// Battle rules. Presentation is injected via `fx` (all hooks async & optional), so this runs headless too.
import { ENEMIES } from './data/enemies.js';
import { BASICS } from './data/cards.js';
import { computeMove, flatten, baseOf } from './combos.js';
import { uid } from '../core/util.js';
import { mkCard, discoveryChoices } from './run.js';
import { foeLines, artifactLines, immuneTo } from './data/synergy.js';
import { dilemmaFor } from './data/dilemmas.js';

const NOOP = new Proxy({}, { get: () => async () => {} });
export const HAND_MAX = 10;
export const HELD_MAX = 3; // things manifested in mid-air at once
// HARD difficulty, tuned with tools/sim.mjs against a synergy-hunting player who dodges half the blows:
// normals ~75-85% won, elites ~30-40%, guardians ~10-20%. Foes' HP and blows scale by tier and grow every floor.
export const DIFF = { hp: { normal: 2.2, elite: 2.85, guardian: 3.0 }, dmg: { normal: 2.6, elite: 2.0, guardian: 1.8 }, hpFloor: 0.03, dmgFloor: 0.025, per: { hydra: 0.9, hydra_elder: 0.75, hydra_head: 0.8 }, dmgPer: { hydra_head: 0.7 } };

export class Battle {
  constructor({ run, enemies, rng, fx, kind = 'normal' }) {
    this.run = run; this.rng = rng; this.fx = fx || NOOP; this.kind = kind;
    const p = run.player;
    this.player = { hp: p.hp, maxHp: p.maxHp, block: 0, st: {}, keepBlock: false, retain: false };
    // dodge: the timing window's size (1 = normal); Talaria widen it, Lead Boots nail you to the spot
    this.player.dodge = run.items.includes('lead_boots') ? 0 : run.items.includes('talaria') ? 1.6 : 1;
    this.enemies = []; this.field = []; this.powers = {}; this.turn = 0; this.phase = 'start';
    this.redraws = 3 + (this.has('owl') ? 1 : 0);
    this.draw = this.rng.shuffle(run.deck.map((c) => ({ ...c, petrified: false })));
    this.hand = []; this.discard = []; this.exhaust = []; this.lost = []; this.held = [];
    this.flags = { wingsUsed: false, heatCount: 0, sparkCharge: 0, firstMoveDone: false, movesThisTurn: [], wineskinUsed: false, lensOn: new Set() };
    for (const id of enemies) this.spawnEnemy(id);
    this.log = []; this.stats = { dodges: {} };
  }
  has(item) { return this.run.items.includes(item); }

  // HARD difficulty: foes are tougher than their base sheet, and grow a little every floor of the run
  tier(def) { return def.guardian ? 'guardian' : def.elite ? 'elite' : 'normal'; }
  diffHp(def, id) { const f = Math.max(0, this.run.floor || 0); return DIFF.hp[this.tier(def)] * (DIFF.per[id] ?? 1) * (1 + f * DIFF.hpFloor); }
  diffDmg(def, id) { const f = Math.max(0, this.run.floor || 0); return DIFF.dmg[this.tier(def)] * (DIFF.dmgPer[id] ?? 1) * (1 + f * DIFF.dmgFloor); }
  spawnEnemy(id, opts = {}) {
    const def = ENEMIES[id]; const hp = Math.round(this.rng.int(def.hp[0], def.hp[1]) * this.diffHp(def, id));
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
    this.turn++; this.phase = 'player'; this.flags.movesThisTurn = []; this.flags.lensOn = new Set(); this.flags.pickedThisTurn = false;
    const P = this.player;
    if (!P.keepBlock) P.block = 0; P.keepBlock = false;
    for (const k of ['thorns', 'kindle', 'momentum']) delete P.st[k];
    if (P.st.venom) { await this.hurtPlayer(P.st.venom, { source: null, pure: true, kind: 'venom' }); P.st.venom--; if (P.st.venom <= 0) delete P.st.venom; if (this.over) return; }
    if (this.has('wineskin')) await this.healPlayer(2);
    if (this.turn === 1 && this.has('wine_flask')) await this.healPlayer(3);
    if (this.turn === 1 && this.has('gorgon_scale')) await this.gainBlock(4);
    if (this.powers.orbit !== undefined || this.field.some((f) => f.type === 'moon')) await this.gainBlock(this.powers.orbit ? 6 : 4, 'moon');
    if (this.powers.gravitation !== undefined && this.alive().length) {
      const t = this.rng.pick(this.alive()); const m = this.powers.gravitation ? 2 : 1;
      await this.fx.fallingApple?.(t); await this.damageEnemy(t, m * 6, { fall: true, kind: 'apple' });
    }
    for (const f of [...this.field]) await this.fieldTurnStart(f);
    if (this.checkEnd()) return;
    let n = 6 + (this.has('thread') ? 1 : 0) + (this.turn === 1 && this.has('antikythera') ? 1 : 0);
    if (this.has('statues')) { n = Math.min(n, 3); this.fx.artifact?.('statues'); } // the admirers crowd your table: a hand of three
    if (!P.retain) { /* normal */ } else n = Math.max(0, n - this.handCount());
    P.retain = false;
    await this.drawCards(n);
    if (P.st.petrify) { await this.petrifyHand(P.st.petrify); delete P.st.petrify; }
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
  async petrifyHand(n) {
    const cands = this.hand.flatMap((s) => s.cards).filter((c) => c.type !== 'power' && c.id !== 'stone' && !c.petrified);
    const picked = this.rng.shuffle(cands).slice(0, n); for (const c of picked) c.petrified = true;
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
    if (f.brawl) { const al = this.alive(); if (al.length > 1) { for (const x of al) { const by = this.rng.pick(al.filter((y) => y !== x)); await this.fx.friendlyFire?.(by, x); await this.damageEnemy(x, f.brawl, { kind: 'kinetic', pierce: true }); } } else if (al[0]) this.addSt(al[0], 'vulnerable', 2); }
    if (f.loseHand) { let n = f.loseHand.n; for (const s of [...this.hand]) { if (n <= 0) break; if (s.cards.some((c) => c.type === 'power')) continue; const ok = f.loseHand.base === 'any' || s.cards.some((c) => baseOf(c.id) === f.loseHand.base); if (!ok) continue; this.hand = this.hand.filter((x) => x !== s); for (const c of s.cards) if (!c.temp) this.discard.push(c); await this.fx.binned?.(s); n--; } }
    if (f.loseDeck) { for (let k = 0; k < f.loseDeck; k++) { const pool = this.run.deck.filter((c) => !['apple', 'force'].includes(c.id)); if (pool.length <= 4) break; const c = this.rng.pick(pool); this.run.deck = this.run.deck.filter((x) => x !== c); this.lost.push(c); out.lost = [...(out.lost || []), c.id]; } }
    if (f.steal && e.alive) { const pool = this.discard.length ? this.discard : this.draw; if (pool.length) { const c = pool.splice(this.rng.int(0, pool.length - 1), 1)[0]; e.loot = c; e.lootTurns = 0; await this.fx.steal?.(e, c); } }
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
    if (target.type === 'held' && s.cards.length === 1 && BASICS[s.cards[0].id]?.twin) { const o = this.held.find((x) => x.uid === target.uid); if (!o) return { ok: false }; const room = this.held.length < HELD_MAX; const hp = this.heldPreview(o); return { ok: room, kind: 'mirror', held: o, move: hp.mv, target: hp.target, est: hp.est, text: room ? `Looking-Glass: a twin ${hp.mv.name}` : `No room for a twin (${HELD_MAX} things already hang in the air)` }; }
    if (target.type === 'held') { const o = this.held.find((x) => x.uid === target.uid); if (!o) return { ok: false }; const nm = this.heldMove(o, flatten(s.cards)); const t = this.heldTarget(o, target.aim, nm); const obj = { ...o, golden: this.nextMergeGolden() }; return { ok: true, move: nm, kind: 'manipulate', held: o, target: t, est: t && nm.attack.valid ? this.calc(nm, t, { obj }) : null, text: nm.name }; }
    if (target.type === 'enemy') { const e = this.enemies.find((x) => x.uid === target.uid && x.alive); if (!e || !mv.attack.valid) return { ok: false, move: mv, kind: 'attack', text: 'Nothing to throw' }; return { ok: true, move: mv, kind: 'attack', est: this.estimate(mv, e) }; }
    if (target.type === 'self') return { ok: mv.self.valid, move: mv, kind: 'self' };
    if (target.type === 'field') return { ok: mv.field.valid, move: mv, kind: 'field', text: mv.field.valid ? `Place: ${mv.field.name}` : 'Nothing to place' };
    if (target.type === 'object') { const f = this.field.find((x) => x.uid === target.uid); const r = f && this.objectReaction(f, mv, true); return { ok: !!r, move: mv, kind: 'object', text: r ? r.text : 'No reaction' }; }
    return { ok: false };
  }
  estimate(mv, e, opts = {}) { return this.calc(mv, e, opts); }
  // ---- the whole arithmetic of one strike, line by line: base m×v, merge synergies, artifacts, odds, the target.
  // rolled: odds already decided (at release); otherwise odds are shown as a range (lo..hi) and an expectation.
  calc(mv, e, { obj = null, rolled = null } = {}) {
    const a = mv.attack; const lines = a.lines.map((l) => ({ ...l })); const art = artifactLines(this, mv, e, obj); lines.push(...art.lines); if (e) lines.push(...foeLines(e, mv, this));
    if (this.player.st.weak) lines.push({ text: 'You are Weak', mul: 0.75, kind: 'anti' });
    let mul = 1; for (const l of lines) if (l.kind !== 'base') mul *= l.mul ?? 1;
    let lo = mul, hi = mul, ev = mul;
    if (rolled) for (const r of rolled) { lines.push({ text: `${r.text}: ${r.label}`, mul: r.mul, kind: 'odds', rolled: true }); mul *= r.mul; lo = hi = ev = mul; }
    else for (const o of art.odds) { const ms = o.outcomes.map((x) => x.mul); lines.push({ text: `${o.text}: ${o.outcomes.map((x) => x.label).join(' · ')}`, kind: 'odds' }); lo *= Math.min(...ms); hi *= Math.max(...ms); ev *= o.outcomes.reduce((k, x) => k + x.p * x.mul, 0); }
    const hits = (a.hits || 1) * (art.split ? 3 : 1); const R = (k) => (a.fizzle ? 0 : Math.round(a.base * k));
    const per = R(mul), perLo = R(lo), perHi = R(hi), perEv = R(ev);
    const zap = a.charge && !(e && immuneTo(e, 'electric')) ? a.charge * (e && (e.st.wet || a.wet) ? 2 : 1) : 0;
    const total = per * hits + zap;
    lines.push({ kind: 'total', text: a.fizzle ? 'fizzles: 0' : `= ${perLo === perHi ? per : perLo + '–' + perHi}${hits > 1 ? ` × ${hits} hits` : ''}${zap ? ` + zap ${zap}` : ''}` });
    return { lines, perHit: per, hits, total, lo: perLo * hits + zap, hi: perHi * hits + zap, ev: perEv * hits + zap, zap, spread: a.spread, mul, odds: !rolled && art.odds.length > 0, fizzle: a.fizzle };
  }
  // decide the odds of every artifact for one throw, on the battle's seeded RNG
  rollOdds(mv, e, obj) {
    const { odds } = artifactLines(this, mv, e, obj); return odds.map((o) => { let r = this.rng.next(); for (const x of o.outcomes) { if ((r -= x.p) <= 0) return { text: o.text, art: o.art, ...x }; } const x = o.outcomes[o.outcomes.length - 1]; return { text: o.text, art: o.art, ...x }; });
  }
  headsAlive(body) { return this.enemies.filter((x) => x.alive && x.parent === body.uid).length; }

  async play(slotId, target) {
    const pv = this.preview(slotId, target); if (!pv.ok) { await this.fx.invalid?.(pv.text); return false; }
    if (pv.kind === 'manifest') return !!(await this.manifest(slotId, target.pos, target.aim));
    if (pv.kind === 'manipulate') return this.manipulate(target.uid, slotId, target.aim);
    if (pv.kind === 'mirror') return this.mirror(target.uid, slotId);
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
    o.target = o.target || this.heldTarget(o)?.uid || null;
    this.held.push(o); for (const c of s.cards) if (!c.temp) this.discard.push(c);
    await this.fx.manifested?.(o, s); return o;
  }
  async manipulate(objId, slotId, aim = null) {
    const o = this.held.find((x) => x.uid === objId), s = this.findSlot(slotId); if (!o || !s || this.phase !== 'player' || s.cards.some((c) => c.type === 'power')) return false;
    this.hand = this.hand.filter((x) => x !== s);
    const add = flatten(s.cards); o.comps.push(...add); o.cards.push(...s.cards.map((c) => c.id)); o.wind += add.filter((c) => BASICS[c.id]?.kind !== 'matter').length;
    if (aim) { o.target = aim; o.aimed = true; }
    if (this.nextMergeGolden()) o.golden = true; this.run.flags.merges = (this.run.flags.merges || 0) + 1;
    for (const c of s.cards) if (!c.temp) this.discard.push(c);
    await this.fx.manipulated?.(o, s);
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
      const o = list[i]; const t = this.heldTarget(o); const mv = this.heldMove(o);
      if (this.over || !t) { this.fx.unheld?.(o); continue; }
      if (mv.attack.fizzle) { await this.fx.fizzle?.(o, mv.attack.fizzle, 'anti'); this.discover(mv); continue; }
      if (!mv.attack.valid || !mv.attack.launched) { await this.fx.fizzle?.(o, mv.attack.launched ? 'It has no punch.' : 'Nothing launched it: add Force or Motion.'); continue; }
      const rolled = this.rollOdds(mv, t, o); if (rolled.some((r) => r.mul === 0)) { await this.fx.fizzle?.(o, `${rolled.find((r) => r.mul === 0).text}: nothing came out.`, 'odds'); continue; }
      await this.fx.release?.(o, mv, t, rolled);
      this.discover(mv); const P = this.player; delete P.st.momentum; delete P.st.charged;
      await this.attack(mv, t, null, { obj: o, rolled });
      if (mv.attack.float && mv.attack.m) await this.gainBlock(mv.attack.m * (mv.attack.floatK || 1), 'float');
      if (mv.attack.fall && this.has('icarus_feather')) await this.hurtPlayer(2, { pure: true, kind: 'wax' });
      await this.afterMove(mv, 'attack', { type: 'enemy', uid: t.uid });
      this.checkEnd();
    }
  }

  discover(mv) {
    const r = this.run; r.stats.moves++;
    if (mv.n >= 2) { const known = !!this.run.journal?.combos?.[mv.key]; this.run.onDiscover?.(mv); if (!known) this.fx.eureka?.(mv); }
  }

  // ------------------------------------------------------------------ attacks
  async attack(mv, target, slotId, opts = {}) {
    const a = mv.attack; if (!target || !target.alive) target = this.alive()[0]; if (!target) return;
    opts = { ...opts, rolled: opts.rolled || this.rollOdds(mv, target, opts.obj) };
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
    for (const id of new Set([...plan.lines.filter((l) => l.art && (l.mul ?? 1) !== 1).map((l) => l.art), ...(opts.rolled || []).map((r) => r.art)])) this.fx.artifact?.(id);
    for (const t of targets) await this.strike(mv, t, 1, opts);
    if (a.chainWet) for (const t of this.alive()) if (!targets.includes(t) && t.st.wet) { await this.fx.chain?.(t); await this.strike(mv, t, 1, opts); } // Spark + Water
    if (a.shove) for (const t of targets) if (t.alive) this.addSt(t, 'shoved', a.shove);
    if (a.carry && !a.spread && !target.alive) { const over = planned - hp0; const next = this.alive().find((e) => !e.def.isHead) || this.alive()[0]; if (over > 0 && next) { await this.fx.ricochet?.(next); await this.damageEnemy(next, over, { kind: 'kinetic', move: mv }); } }
    if (a.bounce) { let pool = this.alive().filter((e) => !targets.includes(e)); let mul = 1; for (let i = 0; i < a.bounce && pool.length; i++) { const t = this.rng.pick(pool); pool = pool.filter((x) => x !== t); mul *= 1 - (a.bounceFalloff || 0); await this.fx.bounce?.(t); await this.strike(mv, t, mul, opts); } }
    if (zap) { for (const e of this.alive()) if (!targets.includes(e) && e.st.wet) { await this.fx.chain?.(e); await this.damageEnemy(e, zap * 2, { kind: 'zap', pierce: true }); } }
    if (a.persist && a.perHit > 0) this.addField('momentum', { turns: a.persist, target: target.uid, m: a.m, v: a.v, hits: a.hits, grow: a.grow, fall: a.fall, name: mv.name, art: mv.art });
    if (planned > (this.run.stats.bestHit || 0)) this.run.stats.bestHit = planned;
    if (mv.n >= 2 && planned > 0) this.run.onRecord?.(mv, planned);
  }
  // one target, full hits
  async strike(mv, t, mul = 1, opts = {}) {
    const a = mv.attack; const hits = this.calc(mv, t, opts).hits;
    for (let h = 0; h < hits; h++) {
      if (!t.alive) { const others = this.alive(); if (!others.length) return; t = this.rng.pick(others); await this.fx.ricochet?.(t); }
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
  }

  async damageEnemy(e, amount, o = {}) {
    if (!e || !e.alive || amount <= 0) return 0;
    if (e.st.evade && o.single && !o.fall && !this.field.some((f) => f.type === 'well')) { e.st.evade--; if (!e.st.evade) delete e.st.evade; await this.fx.miss?.(e); this.learn(e, 'evade'); return 0; }
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
    if (s.clone) { // Echo on Newton: the leftmost card of the hand is cloned (a copy for this battle only)
      const src = this.hand.find((sl) => !sl.cards.some((c) => c.type === 'power'));
      if (src && this.handCount() + src.cards.length <= this.handMax()) { const copy = this.slotOf(src.cards.map((c) => ({ ...c, uid: uid('c'), temp: true, petrified: false }))); this.hand.splice(this.hand.indexOf(src) + 1, 0, copy); this.run.flags.clones = (this.run.flags.clones || 0) + 1; await this.fx.drew?.([copy]); await this.fx.cloned?.(copy, src); }
      else await this.fx.bark?.('player', src ? 'No room in my hand for an echo.' : 'An echo of... nothing. Profound.');
    }
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
      for (const k of ['weak', 'vulnerable', 'blind', 'dizzy', 'wet']) if (e.st[k]) this.decSt(e, k); delete e.st.shoved;
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

  attackValue(e, base) { let d = Math.round(base * this.diffDmg(e.def, e.id)) + (e.st.strength || 0); if (e.st.weak) d = Math.floor(d * 0.75); return Math.max(0, d); }

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
        let dmg = this.attackValue(e, it.dmg); if (e.st.shoved) { dmg = Math.max(0, dmg - e.st.shoved); if (h === (it.hits || 1) - 1) delete e.st.shoved; } // knocked back by a Force
        const confused = (it.drunk && this.rng.chance(0.3)) || (e.st.dizzy && this.rng.chance(0.5));
        if (confused && al().length) { const t = this.rng.pick(al()); await this.fx.friendlyFire?.(e, t); await this.damageEnemy(t, dmg, { kind: 'kinetic' }); this.learn(e, 'drunk'); continue; }
        if (e.st.blind && this.rng.chance(0.5)) { await this.fx.miss?.('player', e); continue; }
        if (this.has('wings') && !this.flags.wingsUsed && !this.flags.wingsMelted) { this.flags.wingsUsed = true; await this.fx.miss?.('player', e, 'wings'); continue; }
        const wind = this.field.find((f) => f.type === 'whirl'); if (wind) dmg = Math.max(0, dmg - 3);
        const cover = this.field.find((f) => (f.type === 'boulder' || f.type === 'rolling') && f.guard > 0);
        if (cover && !it.charge) { const ab = Math.min(cover.guard, dmg); cover.guard -= ab; dmg -= ab; await this.fx.coverHit?.(cover, ab); if (cover.guard <= 0) this.removeField(cover); else this.fx.fieldUpdate?.(cover); }
        if (this.field.some((f) => f.type === 'puddle')) this.addSt(e, 'wet', 1);
        await this.blow(e, dmg, h, it);
        if (it.venom) this.addSt(this.player, 'venom', it.venom);
      }
    } else if (it.kind === 'block') { e.block += it.block; if (it.str) this.addSt(e, 'strength', it.str); await this.fx.enemyBlock?.(e, it.block); }
    else if (it.kind === 'buff') {
      if (it.id === 'flute') { for (const x of this.alive()) this.addSt(x, 'strength', x === e ? 1 : it.str); await this.fx.flute?.(e); }
      if (it.id === 'snort') this.addSt(e, 'strength', it.str);
      if (it.id === 'nimble') this.addSt(e, 'evade', it.evade);
    } else if (it.kind === 'debuff') {
      if (it.id === 'gaze') { if (it.dmg) await this.blow(e, this.attackValue(e, it.dmg), 0, it); this.addSt(this.player, 'petrify', it.petrify); await this.fx.gaze?.(e); }
      if (it.id === 'steal') {
        if (it.dmg) await this.blow(e, this.attackValue(e, it.dmg), 0, it);
        const pool = this.discard.length ? this.discard : this.draw; if (pool.length) { const i = this.rng.int(0, pool.length - 1); const c = pool.splice(i, 1)[0]; e.loot = c; e.lootTurns = 0; await this.fx.steal?.(e, c); }
      }
      if (it.id === 'acid') { await this.blow(e, this.attackValue(e, it.dmg), 0, it); this.addSt(this.player, 'corrode', it.corrode); }
      if (!['gaze', 'steal', 'acid'].includes(it.id)) await this.genericIntent(e, it); // newer foes describe their curses in data
    } else if (it.kind === 'special') {
      if (it.id === 'spill') { if (!this.field.some((f) => f.type === 'wine')) this.addField('wine', { turns: 3, name: 'Spilled Wine' }); e.hp = Math.min(e.maxHp, e.hp + it.heal); await this.fx.heal?.(e, it.heal); }
      if (it.id === 'flee') { if (this.field.some((f) => f.type === 'well')) { await this.fx.bark?.(e, 'Can\'t... escape... the pull!'); return; } e.alive = false; e.fled = true; if (e.loot) { this.lost.push(e.loot); if (this.has('sack')) this.run.gold += 10; } await this.fx.flee?.(e); }
      if (!['spill', 'flee', 'sprout'].includes(it.id)) await this.genericIntent(e, it);
      if (it.id === 'sprout') { const n = Math.min(2, e.def.maxHeads - this.headsAlive(e)); for (let i = 0; i < n; i++) { const h = this.spawnEnemy('hydra_head', { parent: e.uid }); this.pickIntent(h); await this.fx.enemySpawn?.(h); } }
    }
  }

  // data-driven intents for foes without bespoke code: { dmg, hits, status: { weak: 1, ... }, block, heal, str }
  async genericIntent(e, it) {
    for (let h = 0; h < (it.dmg ? it.hits || 1 : 0); h++) { if (this.over) return; await this.blow(e, this.attackValue(e, it.dmg), h, it); }
    for (const [k, n] of Object.entries(it.status || {})) this.addSt(this.player, k, n);
    if (it.block) e.block += it.block; if (it.str) this.addSt(e, 'strength', it.str); if (it.heal) { const h = Math.min(it.heal, e.maxHp - e.hp); e.hp += h; await this.fx.heal?.(e, h); }
  }
  // an enemy blow lands on Newton: the dodge QTE (fx.dodge resolves 'perfect' | 'good' | 'miss' | null) decides how much
  async blow(e, dmg, h = 0, it = null) {
    let res = null; if (dmg > 0 && this.player.dodge > 0) res = (await this.fx.dodge?.(e, h, it, this.player.dodge)) || null;
    const k = res === 'perfect' ? 0 : res === 'good' ? 0.5 : 1; this.stats.dodges[res || 'none'] = (this.stats.dodges[res || 'none'] || 0) + 1;
    if (k === 0) { await this.fx.dodged?.(e, res); return 0; }
    return this.hurtPlayer(Math.round(dmg * k), { source: e, dodge: res });
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
