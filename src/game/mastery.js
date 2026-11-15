// CONSTELLATION MASTERY and OMENS (menu agent; the astral select's detail and omen steps, scenes/tower.js).
// Every run start (a constellation of game/run.js STARTS, or a studied start) earns MASTERY XP when a run under it ends:
// the floor reached, +10 for a win, x1.5 for each omen taken. Five tiers (I..V) each unlock a lasting bonus for runs
// under that constellation and light more of its stars in the sky (tier V gilds it).
// OMENS are optional harder conditions chosen before the run (applied here at run start), each worth more mastery.
//   save.meta.mastery[startId] = { xp, runs, wins, best }
//   applyMastery(run, startId, omens)  (main.js newRun)   recordMasteryRun(run, won)  (main.js at a run's end)
import { save } from '../core/save.js';

export const TIERS = [
  { xp: 4, name: 'I', text: '+15 gold at the start', gold: 15 },
  { xp: 12, name: 'II', text: 'Its stars burn brighter in the sky', cosmetic: true },
  { xp: 25, name: 'III', text: '+6 max health', hp: 6 },
  { xp: 45, name: 'IV', text: 'Your first card begins upgraded', upgrade: 1 },
  { xp: 75, name: 'V', text: 'Mastered: a gilded constellation, +25 gold', gold: 25, gild: true },
];
export const OMENS = [
  { id: 'frailty', name: 'Omen of Frailty', text: 'Begin with 12 less max health.', mul: 0.5 },
  { id: 'poverty', name: 'Omen of Poverty', text: 'Begin with no gold at all.', mul: 0.5 },
  { id: 'thin', name: 'Omen of the Thin Deck', text: 'Your Mass card is left behind.', mul: 0.5 },
];
export const masteryOf = (id) => { const m = save.meta.mastery?.[id] || { xp: 0, runs: 0, wins: 0, best: 0 }; let tier = 0; for (const t of TIERS) if (m.xp >= t.xp) tier++; const next = TIERS[tier]; return { ...m, tier, next, frac: next ? (m.xp - (TIERS[tier - 1]?.xp || 0)) / (next.xp - (TIERS[tier - 1]?.xp || 0)) : 1 }; };
export const omenMul = (omens = []) => 1 + OMENS.filter((o) => omens.includes(o.id)).reduce((s, o) => s + o.mul, 0);
/** at the start of a run: the tier bonuses of its constellation, then the omens taken */
export function applyMastery(run, startId, omens = []) {
  if (!startId) startId = 'none'; const M = masteryOf(startId); run.masteryStart = startId; run.omens = [...omens];
  for (const t of TIERS.slice(0, M.tier)) { if (t.gold) run.gold += t.gold; if (t.hp) { run.player.maxHp += t.hp; run.player.hp += t.hp; } if (t.upgrade && run.deck[0]) run.deck[0].up = Math.max(run.deck[0].up || 0, 1); }
  if (omens.includes('frailty')) { run.player.maxHp = Math.max(10, run.player.maxHp - 12); run.player.hp = Math.min(run.player.hp, run.player.maxHp); }
  if (omens.includes('poverty')) run.gold = 0;
  if (omens.includes('thin')) { const i = run.deck.findIndex((c) => c.id === 'mass'); if (i >= 0) run.deck.splice(i, 1); }
  return run;
}
/** at the end of a run (death or victory): XP for the constellation it began under; returns { gained, tierBefore, tierAfter } */
export function recordMasteryRun(run, won) {
  const id = run?.masteryStart || run?.start || 'none'; const m = save.meta; m.mastery ||= {}; const e = (m.mastery[id] ||= { xp: 0, runs: 0, wins: 0, best: 0 }); const before = masteryOf(id).tier;
  const floor = Math.max(0, (run.floor ?? 0) + 1); const gained = Math.round((floor + (won ? 10 : 0)) * omenMul(run.omens || []));
  e.xp += gained; e.runs++; if (won) e.wins++; e.best = Math.max(e.best, floor); save.saveMeta(); return { gained, tierBefore: before, tierAfter: masteryOf(id).tier };
}
