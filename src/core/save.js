// Persistent storage. The Discovery Journal survives every loop; the run save is wiped on death.
//
// META (the star gallery: achievements, star shards, the wizard frog's unlocks). Shape, persisted under aod.meta.v1:
//   save.meta = { shards: number, unlocks: { [id]: loopWhenUnlocked }, achievements: { [id]: loopWhenEarned }, seen: { loops, wins } }
// API for the rest of the game:
//   unlocked(id) / save.unlocked(id) -> bool. Frog unlocks are NEW CONTENT ONLY (never stat boosts); ids are listed in
//     STAR_UNLOCKS: 'artifact:<itemId>', 'card:<cardId>', 'event:<eventId>', 'stage:<stageId>'. Gameplay filters its
//     artifact / card / event / stage pools with unlocked(id) (anything not in STAR_UNLOCKS is always available).
//   save.unlock(id) -> true when it was affordable and is now unlocked (spends shards).
//   save.addShards(n) -> grant star shards (e.g. at the end of a run); save.evaluate() -> ids of newly earned
//     achievements (awards their shards, plus 1 shard per new loop and 3 per guardian win since the last call).
//   ACHIEVEMENTS: [{ id, name, text, shards, test(journal) }] are derived from the journal, so they need no hooks.
const KEY = { journal: 'aod.journal.v1', settings: 'aod.settings.v1', run: 'aod.run.v1', meta: 'aod.meta.v1' };

function read(k, fallback) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / private mode */ } }

export const defaultJournal = () => ({
  loops: 0, wins: 0, combos: {}, enemies: {}, items: {}, events: {}, notes: [], history: [], bestHit: 0, seenIntro: false,
});
export const defaultMeta = () => ({ shards: 0, unlocks: {}, achievements: {}, seen: { loops: 0, wins: 0 } });

const killed = (j, id) => (j.enemies?.[id]?.killed || 0) > 0;
const count = (o) => Object.keys(o || {}).length;
export const ACHIEVEMENTS = [
  { id: 'first_eureka', name: 'First Eureka', text: 'Begin your first loop.', shards: 1, test: (j) => j.loops >= 1 },
  { id: 'first_win', name: 'Laurels of the Wilds', text: 'Topple a guardian.', shards: 4, test: (j) => j.wins >= 1 },
  { id: 'satyr', name: 'Last Call', text: 'Defeat a Drunk Satyr.', shards: 1, test: (j) => killed(j, 'satyr') },
  { id: 'kobalos', name: 'Spoon Returned', text: 'Defeat a Kobalos.', shards: 1, test: (j) => killed(j, 'kobalos') },
  { id: 'medusa', name: 'Mirror, Mirror', text: 'Defeat Medusa.', shards: 2, test: (j) => killed(j, 'medusa') },
  { id: 'minotaur', name: 'By the Horns', text: 'Defeat a Minotaur.', shards: 2, test: (j) => killed(j, 'minotaur') || killed(j, 'minotaur_king') },
  { id: 'hydra', name: 'Hydra Slayer', text: 'Defeat the Hydra.', shards: 3, test: (j) => killed(j, 'hydra') || killed(j, 'hydra_elder') },
  { id: 'combos5', name: 'Apprentice Alchemist', text: 'Discover 5 combinations.', shards: 2, test: (j) => count(j.combos) >= 5 },
  { id: 'combos15', name: 'Natural Philosopher', text: 'Discover 15 combinations.', shards: 4, test: (j) => count(j.combos) >= 15 },
  { id: 'hit100', name: 'Equal and Opposite', text: 'Deal 100 damage in a single hit.', shards: 3, test: (j) => (j.bestHit || 0) >= 100 },
  { id: 'items10', name: 'Cabinet of Curiosities', text: 'Collect 10 different artifacts.', shards: 3, test: (j) => count(j.items) >= 10 },
  { id: 'events6', name: 'Wanderer', text: 'Witness 6 curiosities of the Wilds.', shards: 2, test: (j) => count(j.events) >= 6 },
  { id: 'loops5', name: 'Eternal Return', text: 'Live through 5 loops.', shards: 2, test: (j) => j.loops >= 5 },
  { id: 'wins3', name: 'Thrice Crowned', text: 'Win three times.', shards: 5, test: (j) => j.wins >= 3 },
  { id: 'bestiary', name: 'Bestiary Complete', text: 'Defeat every kind of foe once.', shards: 6, test: (j) => ['satyr', 'kobalos', 'medusa', 'minotaur', 'hydra', 'harpy', 'centaur', 'wolf', 'spartoi', 'cyclops', 'chimera', 'talos'].every((id) => killed(j, id)) },
];
// what the wizard frog can make "the stars align" for: new content only
export const STAR_UNLOCKS = [
  { id: 'artifact:astrolabe', kind: 'artifact', name: 'The Astrolabe', cost: 3, text: 'A brass star-reckoner joins the artifact pool.' },
  { id: 'artifact:prism', kind: 'artifact', name: "Newton's Prism", cost: 4, text: 'A prism that splits light joins the artifact pool.' },
  { id: 'card:optics', kind: 'card', name: 'Opticks', cost: 4, text: 'Light-bending cards can be discovered.' },
  { id: 'event:halley', kind: 'event', name: "Halley's Comet", cost: 5, text: 'A new curiosity appears on the road.' },
  { id: 'artifact:hourglass', kind: 'artifact', name: 'Chronos Hourglass', cost: 5, text: 'A sand-glass of borrowed time joins the artifact pool.' },
  { id: 'card:orbits', kind: 'card', name: 'Orbital Mechanics', cost: 6, text: 'Orbit cards can be discovered.' },
  { id: 'event:royal_society', kind: 'event', name: 'The Royal Society', cost: 6, text: 'A learned (and petty) curiosity on the road.' },
  { id: 'stage:olympus', kind: 'stage', name: 'Stairway to Olympus', cost: 9, text: 'A new story stage beyond the Guardian.' },
];
const UNLOCK_IDS = new Set(STAR_UNLOCKS.map((u) => u.id));

export const save = {
  journal: read(KEY.journal, null) || defaultJournal(),
  settings: Object.assign({ master: 0.9, sfx: 0.85, music: 0.5, amb: 0.6, quality: 'high', screenshake: 1, fastAnims: false }, read(KEY.settings, {})),
  meta: Object.assign(defaultMeta(), read(KEY.meta, {})),
  saveJournal() { write(KEY.journal, this.journal); },
  saveSettings() { write(KEY.settings, this.settings); },
  saveMeta() { write(KEY.meta, this.meta); },
  loadRun() { return read(KEY.run, null); },
  saveRun(run) { write(KEY.run, run); },
  clearRun() { try { localStorage.removeItem(KEY.run); } catch (e) { /* */ } },
  resetAll() { this.journal = defaultJournal(); this.meta = defaultMeta(); this.saveJournal(); this.saveMeta(); this.clearRun(); },
  unlocked(id) { return !UNLOCK_IDS.has(id) || !!this.meta.unlocks[id]; },
  unlock(id) { const u = STAR_UNLOCKS.find((x) => x.id === id); if (!u || this.meta.unlocks[id] || this.meta.shards < u.cost) return false; this.meta.shards -= u.cost; this.meta.unlocks[id] = this.journal.loops; this.saveMeta(); return true; },
  addShards(n) { this.meta.shards = Math.max(0, (this.meta.shards || 0) + n); this.saveMeta(); },
  evaluate() {
    const j = this.journal, m = this.meta; const fresh = [];
    for (const a of ACHIEVEMENTS) if (!m.achievements[a.id] && a.test(j)) { m.achievements[a.id] = j.loops || 1; m.shards += a.shards; fresh.push(a.id); }
    const dl = Math.max(0, j.loops - (m.seen.loops || 0)), dw = Math.max(0, j.wins - (m.seen.wins || 0)); m.shards += dl + dw * 3; m.seen = { loops: j.loops, wins: j.wins };
    this.saveMeta(); return fresh;
  },
};
export const unlocked = (id) => save.unlocked(id);
