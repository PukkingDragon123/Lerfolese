// Boot + game flow: menu -> map -> nodes (battle / event / shop / lab) -> rewards -> ... -> death/victory.
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { save } from './core/save.js';
import { tweens } from './core/tween.js';
import { setForgeRenderer } from './gfx/cardart.js';
import { newRun, restoreRun, serializeRun, encounterFor, battleRewards, attachRun } from './game/run.js';
import { BattleScene } from './scenes/battlescene.js';

const $ = (id) => document.getElementById(id);
const bootMsg = (t, p) => { $('boot-msg').textContent = t; if (p != null) $('boot-fill').style.width = `${p}%`; };

class Game {
  constructor() {
    this.engine = new Engine($('game')); this.input = new Input($('game'));
    this.journal = save.journal; this.settings = save.settings; window.__settings = this.settings;
    audio.vol = { master: this.settings.master, sfx: this.settings.sfx, music: this.settings.music, amb: this.settings.amb };
    this.input.onFirstInteract = () => { audio.unlock(); };
    setForgeRenderer(this.engine.renderer);
    this.engine.start((dt) => this.scene?.update?.(dt, this.engine.time));
    window.__game = this;
  }
  saveJournal() { save.saveJournal(); }
  saveRun() { if (this.run) save.saveRun(serializeRun(this.run)); }

  async swap(fn, opts = {}) { await this.engine.wipe(async () => { this.scene?.dispose?.(); this.scene = null; await fn(); }, opts); }

  // -------------------------------------------------------------- flow
  async boot() {
    bootMsg('Loading fonts…', 10);
    await Promise.all(['700 40px "Pixelify"', '32px "VT323"', '700 22px "Silkscreen"', '400 22px "Silkscreen"', '40px "Caveat"', '40px "HomemadeApple"', '40px "Jacquard"'].map((f) => document.fonts.load(f).catch(() => {})));
    bootMsg('Tuning gravity strings…', 40); await audio.init();
    bootMsg('Convincing the gods…', 80);
    const q = new URLSearchParams(location.search);
    $('boot').classList.add('gone');
    if (q.get('battle')) return this.debugBattle(q.get('battle').split(','), q.get('kind') || 'normal');
    return this.toMenu();
  }

  async debugBattle(enemies, kind) {
    this.run = newRun(Number(new URLSearchParams(location.search).get('seed')) || 1234);
    const q = new URLSearchParams(location.search); if (q.get('deck')) this.run.deck = q.get('deck').split(',').map((id) => ({ uid: 'd' + Math.random(), id, type: 'basic', up: 0 }));
    const bs = new BattleScene(this); this.scene = bs;
    const res = await bs.run(this.run, { enemies, kind });
    console.info('battle result', res);
  }

  async toMenu() {
    const { MenuScene } = await import('./scenes/menu.js');
    this.scene?.dispose?.(); this.scene = new MenuScene(this); await this.scene.enter();
  }
  async newRun() {
    save.clearRun(); this.run = newRun(); this.journal.loops++; this.saveJournal();
    await this.toMap(true);
  }
  async continueRun() { const d = save.loadRun(); if (!d) return this.newRun(); this.run = restoreRun(d); await this.toMap(); }
  async toMap(first = false) {
    const { MapScene } = await import('./scenes/mapscene.js');
    await this.swap(async () => { this.scene = new MapScene(this); await this.scene.enter(first); });
  }
  async enterNode(nodeId) {
    const run = this.run; const node = run.map.nodes[nodeId]; run.pos = nodeId; run.floor = node.row; run.stats.floors++; this.saveRun();
    if (node.type === 'battle' || node.type === 'elite' || node.type === 'guardian') {
      const enc = encounterFor(run, node);
      let res;
      await this.swap(async () => { const bs = new BattleScene(this); this.scene = bs; res = bs.run(run, enc); }, { mode: 1 });
      const r = await res;
      if (!r.won) return this.gameOver(r);
      if (enc.kind === 'elite') { run.foughtElites.push(enc.enemies[0]); run.stats.elites++; }
      const rewards = battleRewards(run, enc.kind); run.gold += rewards.gold;
      const { RewardScene } = await import('./scenes/reward.js');
      await this.swap(async () => { this.scene = new RewardScene(this); await this.scene.enter(rewards, enc); });
      if (enc.kind === 'guardian') return this.areaComplete();
      return;
    }
    const mod = { event: './scenes/event.js', shop: './scenes/shop.js', lab: './scenes/lab.js' }[node.type];
    const { default: Scene } = await import(mod);
    await this.swap(async () => { this.scene = new Scene(this); await this.scene.enter(node); });
  }
  async afterNode() { this.saveRun(); if (this.run.player.hp <= 0) return this.gameOver({}); await this.toMap(); }
  async gameOver(res) {
    const j = this.journal; const r = this.run;
    j.history.unshift({ loop: r.loop, floor: r.floor + 1, area: r.area, kills: r.stats.kills, bestHit: r.stats.bestHit, combos: r.stats.combos, won: false, date: Date.now(), cause: res.enemies?.join(', ') || 'hubris' });
    j.history = j.history.slice(0, 30); this.saveJournal(); save.clearRun();
    const { EndScene } = await import('./scenes/end.js');
    await this.swap(async () => { this.scene = new EndScene(this); await this.scene.enter(false); }, { color: 0x0b0716 });
  }
  async areaComplete() {
    const j = this.journal; const r = this.run; j.wins++;
    j.history.unshift({ loop: r.loop, floor: r.floor + 1, area: r.area, kills: r.stats.kills, bestHit: r.stats.bestHit, combos: r.stats.combos, won: true, date: Date.now() });
    this.saveJournal(); save.clearRun();
    const { EndScene } = await import('./scenes/end.js');
    await this.swap(async () => { this.scene = new EndScene(this); await this.scene.enter(true); }, { color: 0xfff6cf });
  }
}

addEventListener('unhandledrejection', (e) => console.error('unhandled:', e.reason?.message, e.reason?.stack?.split('\n').slice(0, 3).join(' | ')));
const game = new Game();
game.boot().catch((e) => { console.error(e); bootMsg('The universe failed to load: ' + e.message); });
export { tweens, attachRun };
