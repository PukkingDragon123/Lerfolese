// Boot + game flow: menu -> map -> nodes (battle / event / shop / lab) -> rewards -> ... -> death/victory.
import './core/binfetch.js';
import { Engine } from './core/engine.js';
import { hud } from './ui3d/hud.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { save } from './core/save.js';
import { tweens } from './core/tween.js';
import { setForgeRenderer } from './gfx/cardart.js';
import { newRun, restoreRun, serializeRun, encounterFor, battleRewards, attachRun, nextAct, floorOf, AREAS } from './game/run.js';
import { BattleScene } from './scenes/battlescene.js';

const $ = (id) => document.getElementById(id);
const bootMsg = (t, p) => { window.__boot?.(t, p); }; // the pixel-art boot canvas in index.html draws the message's progress as seed pips
const bootGone = () => { const b = $('boot'); if (!b) return; b.classList.add('gone'); setTimeout(() => { b.classList.add('done'); b.remove(); }, 1000); };

class Game {
  constructor() {
    this.engine = new Engine($('game')); this.input = new Input($('game')); hud.attach(this.engine, this.input);
    this.journal = save.journal; this.settings = save.settings; window.__settings = this.settings;
    audio.vol = { master: this.settings.master, sfx: this.settings.sfx, music: this.settings.music, amb: this.settings.amb };
    this.input.onFirstInteract = () => { audio.unlock(); };
    setForgeRenderer(this.engine.renderer);
    this.engine.start(() => {});
    window.__game = this;
  }
  saveJournal() { save.saveJournal(); }
  saveRun() { if (this.run) save.saveRun(serializeRun(this.run)); }

  async swap(fn, opts = {}) { await this.engine.wipe(async () => { this.scene?.dispose?.(); this.scene = null; await fn(); }, opts); }

  // -------------------------------------------------------------- flow
  async boot() {
    bootMsg('Loading fonts…', 10);
    await Promise.all(['16px "Alagard"', '32px "Alagard"', '700 40px "Pixelify"', '700 22px "Silkscreen"', '400 22px "Silkscreen"', '40px "Caveat"', '700 18px "Caveat"', '40px "HomemadeApple"', '400 8px "Silkscreen"', '11px "PixelSans"', '13px "NanoPlus"', '12px "RuneMono"', '24px "RuneMono"', '9px "MicroPixel"', '48px "Alagard"'].map((f) => document.fonts.load(f).catch(() => {})));
    const q = new URLSearchParams(location.search);
    if (!q.get('battle') && !q.get('node') && !q.get('scene') && !q.get('prologue') && !q.get('chess')) { // the loading time-lapse: an apple lives and dies while everything preloads
      bootMsg('Planting the apple…', 60); const pre = this.preload();
      const { LoadingScene } = await import('./scenes/menu.js'); this.scene = new LoadingScene(this); await this.scene.enter({ preload: pre });
      requestAnimationFrame(() => setTimeout(bootGone, 120)); return;
    }
    bootMsg('Tuning gravity strings…', 40); await audio.init();
    bootMsg('Convincing the gods…', 80);
    bootGone();
    if (q.get('scene')) { const k = q.get('scene'); if (k === 'studies') return this.toStudies(); if (k === 'stars' || k === 'hall') return this.toStars(); if (k === 'sky') return this.toSky(); if (k === 'gallery') return this.toGallery(); if (k === 'won') { this.run = newRun(1234); attachRun(this.run, this.journal); return this.gameWon(); } /* debug: ?scene=won (the run-end unlock reveal; it records a win) */ return this.toMenu({ from: k === 'loading-end' || k === 'intro' ? 'loading' : null }); } // debug: ?scene=tower|intro|studies|stars (&grant=all: mark achievements earned) (old: sky|gallery)
    if (q.get('battle')) return this.debugBattle(q.get('battle').split(','), q.get('kind') || 'normal');
    if (q.get('chess')) return this.debugChess(q.get('chess')); // story: ?chess=pawn|knight|bishop|rook|queen|king (&beat=1: the story beat after it; &finale=1: the finale; &map=1: that act's map)
    if (q.get('prologue')) { this.journal.seenPrologue = false; return this.newRun(); } // story: ?prologue=1 (&beat=...)
    if (q.get('node')) { this.run = newRun(Number(q.get('seed')) || 1234); attachRun?.(this.run, this.journal); const n = Object.values(this.run.map.nodes).find((x) => x.type === q.get('node')); if (n) return this.enterNode(n.id); }
    return this.toMenu();
  }

  async debugBattle(enemies, kind) {
    this.run = newRun(Number(new URLSearchParams(location.search).get('seed')) || 1234);
    const q = new URLSearchParams(location.search); if (q.get('deck')) this.run.deck = q.get('deck').split(',').map((id) => ({ uid: 'd' + Math.random(), id, type: 'basic', up: 0 })); if (q.get('items')) this.run.items.push(...q.get('items').split(',')); // debug: ?items=statues,tyche
    if (kind === 'boss') kind = 'guardian';
    const bs = new BattleScene(this); this.scene = bs;
    const res = await bs.run(this.run, { enemies, kind, noCine: !!q.get('nocine') }); // (&nocine=1: no chess cinematic)
    console.info('battle result', res);
  }

  /** story debug: a run already at the act of `piece`, straight into that boss's cinematic and fight (or its beat / the finale) */
  async debugChess(piece) {
    const q = new URLSearchParams(location.search); const { debugRunAt } = await import('./scenes/chesscine.js');
    this.run = debugRunAt(newRun(Number(q.get('seed')) || 1234), piece); attachRun(this.run);
    if (q.get('finale')) { const { playFinale } = await import('./scenes/chesscine.js'); await playFinale(this, this.run); return this.toMenu(); }
    if (q.get('beat')) { const { playActBeat } = await import('./scenes/chesscine.js'); await playActBeat(this, this.run); return; }
    if (q.get('map')) return this.toMap(true, 'galaxy'); // the act's diorama, its boss node a great chessman
    const node = Object.values(this.run.map.nodes).find((n) => (piece === 'queen' ? n.fixed : n.type === 'guardian'));
    return this.enterNode(node.id);
  }

  // background preload behind the loading screen: audio, scene modules, the stages' models / ground sets / skies (paced, with progress)
  preload() {
    let done = 0, total = 1; const self = this;
    const promise = (async () => {
      const { preloadTasks } = await import('./models/realworld.js');
      const tasks = [() => audio.init(), () => import('./scenes/tower.js'), () => import('./scenes/mapscene.js'), () => import('./scenes/event.js'), () => import('./scenes/journal.js'), () => import('./scenes/studies.js'), () => import('./scenes/stars.js'), ...preloadTasks(self.engine.renderer), () => import('./models/vista.js').then((m) => m.buildVista({ groundY: -26 - 2.6, hole: 84 }))]; // the tower view's land is pre-built under the loading time-lapse (models/vista.js caches it)
      total = tasks.length; let i = 0;
      const worker = async () => { while (i < tasks.length) { const t = tasks[i++]; try { await t(); } catch (e) { console.warn('preload', e); } done++; } };
      await Promise.all([worker(), worker(), worker()]);
    })().catch((e) => console.warn('preload failed', e));
    return { promise, progress: () => done / total };
  }
  async toSky() { const { SkyScene } = await import('./scenes/sky.js'); await this.swap(async () => { this.scene = new SkyScene(this); await this.scene.enter(); }, { color: 0x0a0c20 }); }
  async toGallery(opts = {}) { const { GalleryScene } = await import('./scenes/gallery.js'); await this.swap(async () => { this.scene = new GalleryScene(this); await this.scene.enter(opts); }, { color: 0x0a0a18, ...(opts.wipe || {}) }); }
  /** the Hall of Memories inside the tower (achievements and challenges as memory shards; swipe right to go back up) */
  async toHall(opts = {}) { const { HallScene } = await import('./scenes/hall.js'); if (!this.scene) { this.scene = new HallScene(this); return this.scene.enter(opts); } await this.swap(async () => { this.scene = new HallScene(this); await this.scene.enter(opts); }, { style: 'galaxy', ...(opts.wipe || {}) }); }
  /** MENU AGENT: the Experiment Hall of studies (scenes/studies.js; steam rolls over the view) and the Stars, the achievements as constellations (scenes/stars.js; the galaxy) */
  async toStudies(opts = {}) { const { StudiesScene } = await import('./scenes/studies.js'); if (!this.scene) { this.scene = new StudiesScene(this); return this.scene.enter(opts); } await this.swap(async () => { this.scene = new StudiesScene(this); await this.scene.enter(opts); }, { style: 'cloud', color: 0xe8e0d0, ...(opts.wipe || {}) }); }
  async toStars(opts = {}) { const { StarsScene } = await import('./scenes/stars.js'); if (!this.scene) { this.scene = new StarsScene(this); return this.scene.enter(opts); } await this.swap(async () => { this.scene = new StarsScene(this); await this.scene.enter(opts); }, { style: 'galaxy', center: [0.5, 0.3], ...(opts.wipe || {}) }); }
  /** the tower-top menu (scenes/tower.js); the story agent ends the prologue here: game.toMenu({ from: 'prologue' }) */
  async toMenu(opts = {}) {
    const { MenuScene } = await import('./scenes/menu.js');
    if (this.scene) return this.swap(async () => { this.scene = new MenuScene(this); await this.scene.enter(opts); }, { style: 'galaxy', ...(opts.wipe || {}) });
    this.scene = new MenuScene(this); await this.scene.enter(opts);
  }
  async newRun(opts = {}) { // opts.start: the constellation chosen in the tower menu's astral select (game/run.js STARTS)
    if (!this.journal.seenPrologue) { await this.playPrologue(); return; } // story agent: the prologue plays once, on the first New Run, and ends in the tower-top menu (New Adventure then starts the run)
    save.clearRun(); this.run = newRun(undefined, { start: opts.start || null }); this.journal.loops++; this.saveJournal();
    try { const { applyStudyPerks } = await import('./game/studies.js'); await applyStudyPerks(this.run, opts.start); const { applyMastery } = await import('./game/mastery.js'); applyMastery(this.run, opts.start, opts.omens || []); } catch (e) { console.warn('study perks / mastery', e); } // MENU AGENT: studied starts, constellation mastery, omens
    await this.toMap(true, 'galaxy', opts.wipe);
  }
  /** the prologue (src/scenes/prologue.js); { replay: true } from the gallery */
  async playPrologue(opts = {}) { try { const { playPrologue } = await import('./scenes/prologue.js'); await playPrologue(this, opts); } catch (e) { console.warn('prologue skipped', e); await this.toMenu().catch(() => {}); } this.journal.seenPrologue = true; this.saveJournal(); }
  async continueRun() { const d = save.loadRun(); if (!d) return this.newRun(); this.run = restoreRun(d); await this.toMap(false, 'galaxy'); }
  async toMap(first = false, style = 'cloud', wipe = null) { // galaxy from the menu into a run; clouds between the nodes of a run
    const mod = import('./scenes/mapscene.js'); // (the transition starts at once; the module loads under it)
    await this.swap(async () => { const { MapScene } = await mod; this.scene = new MapScene(this); await this.scene.enter(first); }, { style, ...(wipe || {}) });
  }
  async enterNode(nodeId) {
    const run = this.run; const node = run.map.nodes[nodeId]; run.pos = nodeId; run.floor = floorOf(run, node); run.stats.floors++; this.saveRun();
    if (node.type === 'battle' || node.type === 'elite' || node.type === 'guardian') {
      const enc = encounterFor(run, node);
      let res;
      await this.swap(async () => { const bs = new BattleScene(this); this.scene = bs; res = bs.run(run, enc); await new Promise((r) => { const w = () => (bs.ready ? bs.ready.then(r) : setTimeout(w, 30)); w(); }); }, { mode: 1 });
      const r = await res;
      if (!r.won) return this.gameOver(r);
      if (enc.kind === 'elite') { run.foughtElites.push(enc.enemies[0]); run.stats.elites++; }
      if (enc.kind !== 'guardian') { try { const C = await import('./scenes/chesscine.js'); const pc = C.pieceOfEncounter(enc); if (pc) await C.playActBeat(this, run, pc); } catch (e) { console.warn('chess beat', e); } } // story agent: the Queen falls mid-finale
      const rewards = battleRewards(run, enc.kind, enc.enemies); run.gold += rewards.gold; // only what the foes carried
      const rmod = import('./scenes/reward.js');
      await this.swap(async () => { const { RewardScene } = await rmod; this.scene = new RewardScene(this); await this.scene.enter(rewards, enc); });
      return;
    }
    const mod = { event: './scenes/event.js', shop: './scenes/shop.js', lab: './scenes/lab.js' }[node.type];
    if (node.type === 'shop' || node.type === 'lab') await this.travel(node); // events stage their own walk-in
    const smod = import(mod);
    await this.swap(async () => { const { default: Scene } = await smod; this.scene = new Scene(this); await this.scene.enter(node); });
  }
  // an optional boss fight chosen inside an event (the Sphinx, Prometheus' eagle): a battle, then the boss's loot
  async eventBattle(enc) {
    const run = this.run; let res;
    await this.swap(async () => { const bs = new BattleScene(this); this.scene = bs; res = bs.run(run, enc); await new Promise((r) => { const w = () => (bs.ready ? bs.ready.then(r) : setTimeout(w, 30)); w(); }); }, { mode: 1 });
    const r = await res; if (!r.won) return this.gameOver(r); run.stats.elites++;
    const rewards = battleRewards(run, 'elite', enc.enemies); run.gold += rewards.gold;
    const rmod = import('./scenes/reward.js'); await this.swap(async () => { const { RewardScene } = await rmod; this.scene = new RewardScene(this); await this.scene.enter(rewards, enc); });
  }
  // the road between nodes: a short, skippable walk in the golden stage before the shop / laboratory
  async travel(node) {
    try { const { TravelScene } = await import('./scenes/travel.js'); let walk; await this.swap(async () => { const tr = new TravelScene(this); this.scene = tr; walk = tr.play(node); await tr.ready; }, { mode: 1 }); await walk; }
    catch (e) { console.warn('travel shot skipped', e); }
  }
  async afterNode() { this.saveRun(); if (this.run.player.hp <= 0) return this.gameOver({}); await this.toMap(); }
  async gameOver(res) {
    const j = this.journal; const r = this.run;
    j.history.unshift({ loop: r.loop, floor: r.floor + 1, area: r.area, kills: r.stats.kills, bestHit: r.stats.bestHit, combos: r.stats.combos, healed: r.stats.healed ?? null, fastest: r.stats.fastest ?? null, won: false, date: Date.now(), cause: res.enemies?.join(', ') || 'hubris' });
    j.history = j.history.slice(0, 30); this.saveJournal(); save.clearRun(); try { (await import('./game/mastery.js')).recordMasteryRun(r, false); } catch (e) { /* */ } // MENU AGENT: constellation mastery
    const { EndScene } = await import('./scenes/end.js');
    await this.swap(async () => { this.scene = new EndScene(this); await this.scene.enter(false); }, { style: 'galaxy' }); // death: the cosmos takes him apart
  }
  // STORY AGENT: an act's boss has fallen. The Grandmaster's hand takes the piece off the board (scenes/chesscine.js);
  // then the next act's board, or (the King toppled) the finale and the win.
  async areaComplete() {
    const r0 = this.run; let cine = null; try { cine = await import('./scenes/chesscine.js'); } catch (e) { console.warn('chess cinematics', e); }
    if (AREAS[r0.area]?.next) {
      try { await cine?.playActBeat(this, r0); } catch (e) { console.warn('act beat', e); }
      nextAct(r0); this.saveRun(); return this.toMap(true, 'galaxy');
    }
    try { await cine?.playFinale(this, r0); } catch (e) { console.warn('finale', e); }
    return this.gameWon();
  }
  async gameWon() {
    const j = this.journal; const r = this.run; const { FEATURES, FEATURE_NAME, FEATURE_TEXT, ACHIEVEMENTS, CHALLENGES } = await import('./core/save.js');
    const wasOpen = FEATURES.every((k) => save.featureOpen(k)); j.wins++;
    j.history.unshift({ loop: r.loop, floor: r.floor + 1, area: r.area, kills: r.stats.kills, bestHit: r.stats.bestHit, combos: r.stats.combos, healed: r.stats.healed ?? null, fastest: r.stats.fastest ?? null, won: true, date: Date.now() });
    this.saveJournal(); save.clearRun();
    // RUN-END UNLOCKS: everything this win opened, revealed one by one (scenes/end.js)
    const unl = []; const got = save.unlockFeatures(); if (!wasOpen) for (const k of got) unl.push({ kind: 'feature', key: k, name: FEATURE_NAME[k], text: FEATURE_TEXT[k] });
    try { const M = await import('./game/mastery.js'); const mr = M.recordMasteryRun(r, true); const { STARTS } = await import('./game/run.js'); const id = r.masteryStart || r.start; // MENU AGENT: constellation mastery
      for (let t = mr.tierBefore; t < mr.tierAfter; t++) unl.push({ kind: 'mastery', name: `${STARTS[id]?.name || 'Your Constellation'} - Mastery ${M.TIERS[t].name}`, text: M.TIERS[t].text }); } catch (e) { console.warn('mastery', e); }
    try { for (const id of save.evaluate()) { const a = [...ACHIEVEMENTS, ...CHALLENGES].find((x) => x.id === id); if (a) unl.push({ kind: 'star', name: a.name, text: `A new star in the Stars - ${a.text}` }); } } catch (e) { console.warn('achievements', e); }
    try { const { studyList } = await import('./game/studies.js'); const L = studyList(); const m = save.meta; const seen = new Set(m.doneSeen || []);
      for (const S of L.filter((x) => x.loop === r.loop).slice(0, 4)) unl.push({ kind: 'study', name: S.name, text: `A new study - ${S.recipe}` });
      for (const S of L.filter((x) => x.done && !seen.has(x.id) && x.loop !== r.loop).slice(0, 3)) unl.push({ kind: 'study', name: S.name, text: `Study complete - ${S.rewardText || 'claim it in the Experiment Hall'}` });
      m.doneSeen = L.filter((x) => x.done).map((x) => x.id); save.saveMeta(); } catch (e) { console.warn('studies', e); }
    const { EndScene } = await import('./scenes/end.js');
    await this.swap(async () => { this.scene = new EndScene(this); await this.scene.enter(true, unl); }, { style: 'galaxy' });
  }
}

addEventListener('unhandledrejection', (e) => console.error('unhandled:', e.reason?.message, e.reason?.stack?.split('\n').slice(0, 3).join(' | ')));
const game = new Game();
game.boot().catch((e) => { console.error(e); bootMsg('The universe failed to load: ' + e.message); });
export { tweens, attachRun };
