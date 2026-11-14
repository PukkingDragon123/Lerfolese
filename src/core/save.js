// Persistent storage. The Discovery Journal survives every loop; the run save is wiped on death.
//
// META (the Hall of Memories in the tower: achievements and challenges as memory shards, their permanent rewards).
// Shape, persisted under aod.meta.v1:
//   save.meta = { shards, unlocks: { [id]: loop }, achievements: { [id]: loopWhenEarned }, claimed: { [achId]: loop },
//                 cosmetics: { ['tower:*']: loop }, seen: { loops, wins } }
// Every ACHIEVEMENT and CHALLENGE carries a REWARD (one id or a list): content ids from STAR_UNLOCKS ('artifact:',
// 'card:', 'event:', 'stage:') or cosmetic tower upgrades ('tower:banners_royal', 'tower:crystals_lit',
// 'tower:orrery_gold', 'tower:gears_gilded', 'tower:lanterns'). Earning one lights its shard; claiming it in the Hall
// (save.claim(id), the shatter-reveal) unlocks the reward for good. The wizard frog's shop is gone (he is a boss now).
// Combat agent: CHALLENGES read run stats copied into journal.history at the end of a run (main.js): please count
// run.stats.healed (HP healed, in battle.healPlayer) so "Win without healing" can be earned.
// API for the rest of the game:
//   unlocked(id) / save.unlocked(id) -> bool. Frog unlocks are NEW CONTENT ONLY (never stat boosts); ids are listed in
//     STAR_UNLOCKS: 'artifact:<itemId>', 'card:<cardId>', 'event:<eventId>', 'stage:<stageId>'. Gameplay filters its
//     artifact / card / event / stage pools with unlocked(id) (anything not in STAR_UNLOCKS is always available).
//   save.claim(achId) -> the reward ids unlocked by claiming an earned achievement / challenge (Hall shatter-reveal).
//   save.unlock(id) -> legacy shard purchase (kept for old saves; the Hall grants rewards instead).
//   save.addShards(n) -> grant star shards (e.g. at the end of a run); save.evaluate() -> ids of newly earned
//     achievements (awards their shards, plus 1 shard per new loop and 3 per guardian win since the last call).
//   ACHIEVEMENTS: [{ id, name, text, shards, test(journal) }] are derived from the journal, so they need no hooks.
const KEY = { journal: 'aod.journal.v1', settings: 'aod.settings.v1', run: 'aod.run.v1', meta: 'aod.meta.v1' };

function read(k, fallback) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / private mode */ } }

export const defaultJournal = () => ({
  loops: 0, wins: 0, combos: {}, enemies: {}, items: {}, events: {}, notes: [], history: [], bestHit: 0, seenIntro: false,
});
export const defaultMeta = () => ({ shards: 0, unlocks: {}, achievements: {}, claimed: {}, cosmetics: {}, seen: { loops: 0, wins: 0 } });

const killed = (j, id) => (j.enemies?.[id]?.killed || 0) > 0;
const count = (o) => Object.keys(o || {}).length;
export const ACHIEVEMENTS = [
  { id: 'first_eureka', name: 'First Eureka', text: 'Begin your first loop.', shards: 1, reward: 'tower:lanterns', scene: 'garden', test: (j) => j.loops >= 1 },
  { id: 'first_win', name: 'Laurels of the Wilds', text: 'Topple a guardian.', shards: 4, reward: 'artifact:astrolabe', scene: 'laurels', test: (j) => j.wins >= 1 },
  { id: 'satyr', name: 'Last Call', text: 'Defeat a Drunk Satyr.', shards: 1, reward: 'event:halley', scene: 'satyr', test: (j) => killed(j, 'satyr') },
  { id: 'kobalos', name: 'Spoon Returned', text: 'Defeat a Kobalos.', shards: 1, reward: 'artifact:hourglass', scene: 'kobalos', test: (j) => killed(j, 'kobalos') },
  { id: 'medusa', name: 'Mirror, Mirror', text: 'Defeat Medusa.', shards: 2, reward: 'artifact:prism', scene: 'medusa', test: (j) => killed(j, 'medusa') },
  { id: 'minotaur', name: 'By the Horns', text: 'Defeat a Minotaur.', shards: 2, reward: 'artifact:lead_boots', scene: 'minotaur', test: (j) => killed(j, 'minotaur') || killed(j, 'minotaur_king') },
  { id: 'hydra', name: 'Hydra Slayer', text: 'Defeat the Hydra.', shards: 3, reward: 'artifact:achilles', scene: 'hydra', test: (j) => killed(j, 'hydra') || killed(j, 'hydra_elder') },
  { id: 'combos5', name: 'Apprentice Alchemist', text: 'Discover 5 combinations.', shards: 2, reward: 'card:optics', scene: 'alchemy', test: (j) => count(j.combos) >= 5 },
  { id: 'combos15', name: 'Natural Philosopher', text: 'Discover 15 combinations.', shards: 4, reward: 'card:orbits', scene: 'alchemy', test: (j) => count(j.combos) >= 15 },
  { id: 'hit100', name: 'Equal and Opposite', text: 'Deal 100 damage in a single hit.', shards: 3, reward: 'artifact:golden_ratio', scene: 'impact', test: (j) => (j.bestHit || 0) >= 100 },
  { id: 'items10', name: 'Cabinet of Curiosities', text: 'Collect 10 different artifacts.', shards: 3, reward: 'artifact:pandora', scene: 'cabinet', test: (j) => count(j.items) >= 10 },
  { id: 'events6', name: 'Wanderer', text: 'Witness 6 curiosities of the Wilds.', shards: 2, reward: 'event:royal_society', scene: 'road', test: (j) => count(j.events) >= 6 },
  { id: 'loops5', name: 'Eternal Return', text: 'Live through 5 loops.', shards: 2, reward: 'tower:banners_royal', scene: 'loop', test: (j) => j.loops >= 5 },
  { id: 'wins3', name: 'Thrice Crowned', text: 'Win three times.', shards: 5, reward: 'stage:olympus', scene: 'laurels', test: (j) => j.wins >= 3 },
  { id: 'bestiary', name: 'Bestiary Complete', text: 'Defeat every kind of foe once.', shards: 6, reward: 'tower:gears_gilded', scene: 'bestiary', test: (j) => ['satyr', 'kobalos', 'medusa', 'minotaur', 'hydra', 'harpy', 'centaur', 'wolf', 'spartoi', 'cyclops', 'chimera', 'talos'].every((id) => killed(j, id)) },
];
// CHALLENGES: hard feats. Each lights a memory shard and unlocks something big for good.
const hist = (j) => j.history || [];
export const CHALLENGES = [
  { id: 'no_heal', name: 'Iron Stomach', text: 'Win a run without healing once.', shards: 6, hard: true, reward: ['tower:crystals_lit', "artifact:icarus_feather"], scene: 'icarus', test: (j) => hist(j).some((h) => h.won && h.healed === 0) },
  { id: 'hit500', name: 'The Falling Moon', text: 'Deal 500 damage in a single hit.', shards: 8, hard: true, reward: 'tower:orrery_gold', scene: 'impact', test: (j) => (j.bestHit || 0) >= 500 },
  { id: 'bookworm', name: 'Overdue', text: 'Beat the Bookworm Queen.', shards: 8, hard: true, reward: ['stage:olympus', 'card:optics'], scene: 'bookworm', test: (j) => killed(j, 'bookworm_queen') },
  { id: 'frog', name: 'Kiss Nothing', text: 'Defeat the Frog Wizard.', shards: 8, hard: true, reward: ['card:orbits', 'tower:gears_gilded'], scene: 'frog', test: (j) => killed(j, 'frog_wizard') },
  { id: 'combos30', name: 'Principia', text: 'Discover 30 combinations.', shards: 8, hard: true, reward: ['artifact:pandora', 'tower:banners_royal'], scene: 'alchemy', test: (j) => count(j.combos) >= 30 },
  { id: 'raccoon', name: 'Masked Bandit', text: 'Win a fight in 2 turns or fewer.', shards: 5, hard: true, reward: 'event:halley', scene: 'raccoon', test: (j) => hist(j).some((h) => h.fastest != null && h.fastest <= 2) },
];
export const REWARD_NAME = { 'tower:lanterns': 'Blazing Lanterns', 'tower:banners_royal': 'Royal Banners', 'tower:crystals_lit': 'Burning Crystals', 'tower:orrery_gold': 'A Golden World', 'tower:gears_gilded': 'Gilded Gears' };
export const REWARD_TEXT = {
  'tower:lanterns': 'The tower windows blaze with lamplight.', 'tower:banners_royal': 'Royal blue banners fly from the tower.', 'tower:crystals_lit': 'The buttress crystals burn with violet fire.',
  'tower:orrery_gold': 'A golden world joins the orrery crown.', 'tower:gears_gilded': 'The tower gears are gilded.',
};
export const rewardsOf = (a) => (Array.isArray(a.reward) ? a.reward : a.reward ? [a.reward] : []);
// the content that rewards unlock: new content only (never stat boosts)
export const STAR_UNLOCKS = [
  { id: 'artifact:astrolabe', kind: 'artifact', name: 'The Astrolabe', cost: 3, text: 'A brass star-reckoner joins the artifact pool.' },
  { id: 'artifact:prism', kind: 'artifact', name: "Newton's Prism", cost: 4, text: 'A prism that splits light joins the artifact pool.' },
  { id: 'card:optics', kind: 'card', name: 'Opticks', cost: 4, text: 'Light-bending cards can be discovered.' },
  { id: 'event:halley', kind: 'event', name: "Halley's Comet", cost: 5, text: 'A new curiosity appears on the road.' },
  { id: 'artifact:hourglass', kind: 'artifact', name: 'Chronos Hourglass', cost: 5, text: 'A sand-glass of borrowed time joins the artifact pool.' },
  { id: 'card:orbits', kind: 'card', name: 'Orbital Mechanics', cost: 6, text: 'Orbit cards can be discovered.' },
  { id: 'event:royal_society', kind: 'event', name: 'The Royal Society', cost: 6, text: 'A learned (and petty) curiosity on the road.' },
  { id: 'stage:olympus', kind: 'stage', name: 'Stairway to Olympus', cost: 9, text: 'A new story stage beyond the Guardian.' },
  // artifacts that bend the arithmetic (game/data/synergy.js ARTIFACT_MATH)
  { id: 'artifact:golden_ratio', kind: 'artifact', name: 'The Golden Ratio', cost: 4, text: 'Every 5th merge is golden (×1.618). Joins the artifact pool.' },
  { id: 'artifact:pandora', kind: 'artifact', name: "Pandora's Jar", cost: 5, text: '1 in 3 ×3, 1 in 3 ×1, 1 in 3 nothing. Joins the artifact pool.' },
  { id: 'artifact:lead_boots', kind: 'artifact', name: 'Lead Boots', cost: 5, text: 'Mass counts double, but no dodging. Joins the artifact pool.' },
  { id: 'artifact:achilles', kind: 'artifact', name: 'Heel of Achilles', cost: 6, text: 'Every 3rd strike on a foe ×3. Joins the artifact pool.' },
  { id: 'artifact:icarus_feather', kind: 'artifact', name: "Icarus' Feather", cost: 6, text: 'Falling objects ×2, at 2 HP each. Joins the artifact pool.' },
];
const UNLOCK_IDS = new Set(STAR_UNLOCKS.map((u) => u.id));

export const save = {
  journal: read(KEY.journal, null) || defaultJournal(),
  settings: Object.assign({ master: 0.9, sfx: 0.85, music: 0.5, amb: 0.6, quality: 'high', screenshake: 1, fastAnims: false }, read(KEY.settings, {})),
  meta: Object.assign(defaultMeta(), read(KEY.meta, {})),
  get CHALLENGES() { return CHALLENGES; },
  saveJournal() { write(KEY.journal, this.journal); },
  saveSettings() { write(KEY.settings, this.settings); },
  saveMeta() { write(KEY.meta, this.meta); },
  loadRun() { return read(KEY.run, null); },
  saveRun(run) { write(KEY.run, run); },
  clearRun() { try { localStorage.removeItem(KEY.run); } catch (e) { /* */ } },
  resetAll() { this.journal = defaultJournal(); this.meta = defaultMeta(); this.saveJournal(); this.saveMeta(); this.clearRun(); },
  unlocked(id) { return !UNLOCK_IDS.has(id) || !!this.meta.unlocks[id]; },
  /** claim an earned achievement / challenge: its rewards unlock for good; returns the reward ids (empty if not earned or already claimed) */
  claim(achId) { const m = this.meta; m.claimed ||= {}; m.cosmetics ||= {}; const a = [...ACHIEVEMENTS, ...CHALLENGES].find((x) => x.id === achId); if (!a || !m.achievements[achId] || m.claimed[achId]) return [];
    const loop = this.journal.loops || 1; m.claimed[achId] = loop; const got = rewardsOf(a); for (const id of got) { if (id.startsWith('tower:')) m.cosmetics[id] = loop; else m.unlocks[id] = loop; } this.saveMeta(); return got; },
  unlock(id) { const u = STAR_UNLOCKS.find((x) => x.id === id); if (!u || this.meta.unlocks[id] || this.meta.shards < u.cost) return false; this.meta.shards -= u.cost; this.meta.unlocks[id] = this.journal.loops; this.saveMeta(); return true; },
  addShards(n) { this.meta.shards = Math.max(0, (this.meta.shards || 0) + n); this.saveMeta(); },
  evaluate() {
    const j = this.journal, m = this.meta; const fresh = [];
    for (const a of [...ACHIEVEMENTS, ...CHALLENGES]) if (!m.achievements[a.id] && a.test(j)) { m.achievements[a.id] = j.loops || 1; m.shards += a.shards; fresh.push(a.id); }
    const dl = Math.max(0, j.loops - (m.seen.loops || 0)), dw = Math.max(0, j.wins - (m.seen.wins || 0)); m.shards += dl + dw * 3; m.seen = { loops: j.loops, wins: j.wins };
    this.saveMeta(); return fresh;
  },
};
export const unlocked = (id) => save.unlocked(id);
