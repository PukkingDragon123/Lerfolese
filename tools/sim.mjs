// Headless battle simulator: plays many random battles to catch rule-engine errors and gauge balance.
import { newRun, encounterFor, battleRewards } from '../src/game/run.js';
import { Battle } from '../src/game/battle.js';
import { RNG } from '../src/core/util.js';
import { BASICS } from '../src/game/data/cards.js';
const N = +(process.argv[2] || 200); const stats = {}; let errors = 0;
for (let i = 0; i < N; i++) {
  const run = newRun(1000 + i); const r = new RNG(i);
  const groups = [['satyr'], ['kobalos', 'kobalos'], ['medusa'], ['satyr', 'kobalos'], ['medusa', 'satyr'], ['kobalos', 'kobalos', 'kobalos'], ['minotaur'], ['hydra'], ['minotaur_king'], ['hydra_elder']];
  const enemies = groups[i % groups.length]; const key = enemies.join('+');
  const b = new Battle({ run, enemies, rng: new RNG(i * 7 + 1) });
  try {
    await b.start(); let guard = 0;
    while (!b.over && guard++ < 60) {
      // prepare-then-resolve player: eat when hurt, place Matter, merge Laws into the objects; End releases them
      const P = b.player; const kindOf = (s) => BASICS[s.cards[0].id]?.kind;
      for (const s of [...b.hand]) if (s.cards[0].id.includes('apple') && P.hp < P.maxHp * 0.45 && r.chance(0.7)) await b.play(s.uid, { type: 'self' });
      for (const s of [...b.hand]) { if (b.held.length >= 2 || b.over) break; if (b.preview(s.uid, { type: 'air' }).ok && r.chance(0.85)) { await b.play(s.uid, { type: 'air', pos: { x: 0, y: 2.5, z: 1 } }); stats.manifested = (stats.manifested || 0) + 1; } }
      for (const s of [...b.hand]) {
        if (b.over) break; if (s.cards[0].type === 'power') { await b.play(s.uid, { type: 'self' }); continue; }
        if (b.held.length && kindOf(s) !== 'matter' && r.chance(0.85)) { const o = r.pick(b.held); await b.play(s.uid, { type: 'held', uid: o.uid }); continue; }
        if (r.chance(0.5)) await b.play(s.uid, { type: 'self' });
      }
      if (b.held.length && b.alive().length && r.chance(0.2)) b.aim(b.held[0].uid, r.pick(b.alive()).uid);
      if (!b.over) await b.endTurn();
    }
    b.finish();
    const s = (stats[key] ||= { n: 0, won: 0, turns: 0, hpLeft: 0 }); s.n++; if (b.phase === 'won') s.won++; s.turns += b.turn; s.hpLeft += b.player.hp;
    const rw = battleRewards(run, 'elite', enemies); stats.lootItems = (stats.lootItems || 0) + rw.items.length; stats.decks = (stats.decks || 0) + run.deck.length;
  } catch (e) { errors++; if (errors < 4) console.error(key, e.stack); }
}
const manifested = stats.manifested || 0, loot = stats.lootItems || 0, decks = stats.decks || 0; delete stats.manifested; delete stats.lootItems; delete stats.decks; console.log('objects placed:', manifested, ' loot items:', loot, ' avg deck size after battle:', (decks / N).toFixed(1));
for (const k in stats) { const s = stats[k]; console.log(k.padEnd(28), `win ${(100 * s.won / s.n).toFixed(0)}%  turns ${(s.turns / s.n).toFixed(1)}  hpLeft ${(s.hpLeft / s.n).toFixed(0)}`); }
console.log('errors', errors);
