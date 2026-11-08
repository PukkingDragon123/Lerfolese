// Persistent storage. The Discovery Journal survives every loop; the run save is wiped on death.
const KEY = { journal: 'aod.journal.v1', settings: 'aod.settings.v1', run: 'aod.run.v1' };

function read(k, fallback) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / private mode */ } }

export const defaultJournal = () => ({
  loops: 0, wins: 0, combos: {}, enemies: {}, items: {}, events: {}, notes: [], history: [], bestHit: 0, seenIntro: false,
});

export const save = {
  journal: read(KEY.journal, null) || defaultJournal(),
  settings: Object.assign({ master: 0.9, sfx: 0.85, music: 0.5, amb: 0.6, quality: 'high', screenshake: 1, fastAnims: false }, read(KEY.settings, {})),
  saveJournal() { write(KEY.journal, this.journal); },
  saveSettings() { write(KEY.settings, this.settings); },
  loadRun() { return read(KEY.run, null); },
  saveRun(run) { write(KEY.run, run); },
  clearRun() { try { localStorage.removeItem(KEY.run); } catch (e) { /* */ } },
  resetAll() { this.journal = defaultJournal(); this.saveJournal(); this.clearRun(); },
};
