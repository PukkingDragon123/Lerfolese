// Headless battle simulator: plays many random battles to catch rule-engine errors and gauge balance.
import { newRun, encounterFor, battleRewards } from '../src/game/run.js';
import { Battle } from '../src/game/battle.js';
import { RNG } from '../src/core/util.js';
const N = +(process.argv[2] || 200); const stats = {}; let errors = 0;
for (let i = 0; i < N; i++) {
  const run = newRun(1000 + i); const r = new RNG(i);
  const groups = [['satyr'], ['kobalos', 'kobalos'], ['medusa'], ['satyr', 'kobalos'], ['medusa', 'satyr'], ['kobalos', 'kobalos', 'kobalos'], ['minotaur'], ['hydra'], ['minotaur_king'], ['hydra_elder']];
  const enemies = groups[i % groups.length]; const key = enemies.join('+');
  const b = new Battle({ run, enemies, rng: new RNG(i * 7 + 1) });
  try {
    await b.start(); let guard = 0;
    while (!b.over && guard++ < 60) {
      // greedy-ish player: build one big attack stack from matter+laws, rest onto self
      let tries = 0;
      while (b.hand.length > 1 && tries++ < 6) { const a = b.hand[r.int(0, b.hand.length - 1)], c = b.hand[r.int(0, b.hand.length - 1)]; if (a !== c && r.chance(0.6)) b.combine(a.uid, c.uid); }
      // manifest -> manipulate: hang a Matter/Energy card in the air, push Laws into it; End releases it
      if (r.chance(0.45)) {
        const m = b.hand.find((s) => b.preview(s.uid, { type: 'air' }).ok);
        if (m) { const al = b.alive(); await b.play(m.uid, { type: 'air', pos: { x: 0, y: 2.5, z: 1 }, aim: al.length ? r.pick(al).uid : null }); stats.manifested = (stats.manifested || 0) + 1; }
        for (const s of [...b.hand]) { if (!b.held.length || !r.chance(0.35)) continue; const o = r.pick(b.held); if (b.preview(s.uid, { type: 'held', uid: o.uid }).ok) await b.play(s.uid, { type: 'held', uid: o.uid }); }
        if (b.held.length && b.alive().length && r.chance(0.3)) b.aim(b.held[0].uid, r.pick(b.alive()).uid);
      }
      for (const s of [...b.hand]) {
        if (b.over) break; const al = b.alive(); if (!al.length) break;
        const body = al.find((e) => e.def.heads); const tgt = r.chance(0.7) ? { type: 'enemy', uid: (body && r.chance(0.8) ? body : r.pick(al)).uid } : r.chance(0.6) ? { type: 'self' } : b.field.length && r.chance(0.5) ? { type: 'object', uid: r.pick(b.field).uid } : { type: 'field' };
        const pv = b.preview(s.uid, tgt);
        if (pv.ok) await b.play(s.uid, tgt); else await b.play(s.uid, { type: 'self' });
      }
      if (!b.over) await b.endTurn();
    }
    b.finish();
    const s = (stats[key] ||= { n: 0, won: 0, turns: 0, hpLeft: 0 }); s.n++; if (b.phase === 'won') s.won++; s.turns += b.turn; s.hpLeft += b.player.hp;
    battleRewards(run, 'elite');
  } catch (e) { errors++; if (errors < 4) console.error(key, e.stack); }
}
const manifested = stats.manifested || 0; delete stats.manifested; console.log('manifested objects released:', manifested);
for (const k in stats) { const s = stats[k]; console.log(k.padEnd(28), `win ${(100 * s.won / s.n).toFixed(0)}%  turns ${(s.turns / s.n).toFixed(1)}  hpLeft ${(s.hpLeft / s.n).toFixed(0)}`); }
console.log('errors', errors);
