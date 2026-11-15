// Checks the experiment promise: Battle.forecast() predicts End Turn exactly (foe HP, your HP and Block, apple Heat).
//   node tools/forecast-check.mjs [battles=200]
import { newRun, discoveryChoices, mkCard } from '../src/game/run.js';
import { Battle } from '../src/game/battle.js';
import { RNG } from '../src/core/util.js';
import { ITEMS } from '../src/game/data/items.js';
import { ENCOUNTERS } from '../src/game/data/enemies.js';
const N = +(process.argv[2] || 200); const E = ENCOUNTERS.wilderness;
const list = [...E.easy, ...E.hard, ...E.elite, ...E.guardian, ...Object.values(E.event || {})];
const ARTS = Object.keys(ITEMS); let turns = 0, bad = 0;
for (let i = 0; i < N; i++) {
  const enemies = list[i % list.length]; const run = newRun(500 + i); const r = new RNG(i * 31 + 7); run.floor = r.int(0, 10);
  for (let k = r.int(0, 6); k > 0; k--) run.deck.push(mkCard(r.pick(discoveryChoices(run, 3))));
  for (let k = r.int(0, 3); k > 0; k--) { const a = r.pick(ARTS); if (!run.items.includes(a)) run.items.push(a); }
  let snap = null; const b = new Battle({ run, enemies, rng: new RNG(i), fx: { async dilemma(d) { return 0; }, async drew(sl) { if (b.phase !== 'player' || snap) return; const B = b; snap = { foes: Object.fromEntries(B.enemies.map((e) => [e.uid, Math.max(0, e.hp)])), hp: Math.max(0, B.player.hp), block: B.player.block, heat: B.heat }; }, async lost(B) { if (snap) return; snap = { foes: Object.fromEntries(B.enemies.map((e) => [e.uid, Math.max(0, e.hp)])), hp: 0, block: B.player.block, heat: B.heat, lost: true }; }, async won(B) { if (snap) return; snap = { foes: Object.fromEntries(B.enemies.map((e) => [e.uid, Math.max(0, e.hp)])), hp: Math.max(0, B.player.hp), block: B.player.block, heat: B.heat, won: true }; } } });
  await b.start(); let g = 0;
  while (!b.over && g++ < 12) {
    for (const s of [...b.hand]) if (b.preview(s.uid, { type: 'air' }).ok && b.held.length < 2) await b.play(s.uid, { type: 'air' });
    for (const s of [...b.hand]) { if (b.over) break; const o = b.held[r.int(0, Math.max(0, b.held.length - 1))]; if (o && r.chance(0.7)) await b.play(s.uid, { type: 'held', uid: o.uid }); else if (r.chance(0.4)) await b.play(s.uid, { type: 'self' }); }
    if (b.over) break;
    const f = await b.forecast(); snap = null; await b.endTurn(); turns++;
    // compare at the moment the foes have acted (fx.intents / won / lost), before the next hand is dealt
    const errs = []; if (!snap) { errs.push('no snapshot'); }
    else { for (const e of b.enemies) { const p = f.foes[e.uid]; if (!p || !(e.uid in snap.foes)) continue; if (p.hp !== snap.foes[e.uid]) errs.push(`${e.id} hp ${p.hp} vs ${snap.foes[e.uid]}`); }
      if (f.you.hp !== snap.hp) errs.push(`you ${f.you.hp} vs ${snap.hp}`); if (f.heat !== snap.heat) errs.push(`heat ${f.heat} vs ${snap.heat}`); if (!!f.lost !== !!snap.lost) errs.push('lost'); if (!!f.won !== !!snap.won) errs.push('won'); }
    if (errs.length) { bad++; if (bad < 6) console.log(enemies.join("+"), "turn", b.turn, errs.join("; "), run.items.join(","), JSON.stringify(b.player.st)); }
  }
}
console.log(`turns ${turns} · mismatches ${bad}`);
