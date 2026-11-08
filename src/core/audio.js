// WebAudio manager: sfx (buffers, random variants), music (crossfaded streams), ambience loops.
// Reads assets/audio/manifest.json. Missing names are silently ignored so the game never breaks.
const BASE = 'assets/audio/';

export class Audio {
  constructor() {
    this.ctx = null; this.manifest = { sfx: {}, amb: {}, music: {} };
    this.buffers = new Map(); this.loading = new Map();
    this.vol = { master: 0.9, sfx: 0.85, music: 0.5, amb: 0.6 };
    this.music = null; this.musicName = null; this.ambs = new Map();
    this.lastPlay = new Map(); this.unlocked = false; this.muted = false;
  }
  async init() {
    try { const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' }); if (r.ok) this.manifest = await r.json(); } catch (e) { /* no audio yet */ }
    for (const k of ['sfx', 'amb', 'music']) this.manifest[k] = this.manifest[k] || {};
  }
  unlock() {
    if (this.unlocked) return; this.unlocked = true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
    this.ambBus = this.ctx.createGain(); this.ambBus.connect(this.master);
    this.applyVolumes();
    // preload all short sfx in the background
    for (const name of Object.keys(this.manifest.sfx)) for (const f of this.manifest.sfx[name].files || []) this._load(f);
    if (this._pendingMusic) { const p = this._pendingMusic; this._pendingMusic = null; this.playMusic(p.name, p.opts); }
    for (const [n, o] of this._pendingAmb || []) this.playAmb(n, o);
    this._pendingAmb = null;
  }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.amb, t, 0.05);
  }
  _load(file) {
    if (this.buffers.has(file)) return Promise.resolve(this.buffers.get(file));
    if (this.loading.has(file)) return this.loading.get(file);
    const p = fetch(BASE + file).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(file))))
      .then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then((buf) => { this.buffers.set(file, buf); return buf; })
      .catch(() => { this.buffers.set(file, null); return null; });
    this.loading.set(file, p); return p;
  }
  has(name) { return !!this.manifest.sfx[name]; }
  // play('card_pick', {vol, rate, pan, delay, variance})
  play(name, o = {}) {
    if (!this.ctx || this.muted) return;
    const def = this.manifest.sfx[name]; if (!def || !def.files?.length) return;
    const now = performance.now();
    const minGap = o.minGap ?? 35;
    if (now - (this.lastPlay.get(name) || 0) < minGap) return;
    this.lastPlay.set(name, now);
    const file = def.files[Math.floor(Math.random() * def.files.length)];
    const go = (buf) => {
      if (!buf) return;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const v = o.variance ?? 0.06;
      src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * v);
      const g = this.ctx.createGain(); g.gain.value = (def.vol ?? 1) * (o.vol ?? 1);
      let node = src; node.connect(g); node = g;
      if (o.pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); node.connect(p); node = p; }
      node.connect(this.sfxBus);
      src.start(this.ctx.currentTime + (o.delay || 0));
    };
    const b = this.buffers.get(file);
    if (b !== undefined) go(b); else this._load(file).then(go);
  }
  playMusic(name, opts = {}) {
    if (name === this.musicName && this.music) return;
    if (!this.ctx) { this._pendingMusic = { name, opts }; return; }
    const def = this.manifest.music[name];
    const fade = opts.fade ?? 1.6;
    if (this.music) { const old = this.music; const t = this.ctx.currentTime; old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t); old.gain.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => { old.el.pause(); old.el.src = ''; }, fade * 1000 + 100); }
    this.music = null; this.musicName = name;
    if (!def || !def.files?.length) return;
    const el = new window.Audio(BASE + def.files[0]); el.loop = def.loop ?? true; el.crossOrigin = 'anonymous'; el.preload = 'auto';
    const srcNode = this.ctx.createMediaElementSource(el); const gain = this.ctx.createGain(); gain.gain.value = 0;
    srcNode.connect(gain); gain.connect(this.musicBus);
    const target = (def.vol ?? 0.6) * (opts.vol ?? 1);
    el.play().then(() => { const t = this.ctx.currentTime; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(target, t + fade); }).catch(() => {});
    this.music = { el, gain, name };
  }
  stopMusic(fade = 1.2) { if (!this.music || !this.ctx) { this.musicName = null; return; } const m = this.music; const t = this.ctx.currentTime; m.gain.gain.cancelScheduledValues(t); m.gain.gain.setValueAtTime(m.gain.gain.value, t); m.gain.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => m.el.pause(), fade * 1000 + 50); this.music = null; this.musicName = null; }
  duckMusic(amount = 0.35, time = 1.2) {
    if (!this.music || !this.ctx) return; const g = this.music.gain.gain; const t = this.ctx.currentTime; const v = g.value;
    g.cancelScheduledValues(t); g.setValueAtTime(v, t); g.linearRampToValueAtTime(v * amount, t + 0.15); g.linearRampToValueAtTime(v, t + time);
  }
  playAmb(name, o = {}) {
    if (!this.ctx) { (this._pendingAmb ||= []).push([name, o]); return; }
    if (this.ambs.has(name)) return;
    const def = this.manifest.amb[name]; if (!def || !def.files?.length) return;
    const entry = { stopped: false };
    this.ambs.set(name, entry);
    this._load(def.files[0]).then((buf) => {
      if (!buf || entry.stopped) return;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const g = this.ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(this.ambBus);
      src.start(0, Math.random() * buf.duration);
      const t = this.ctx.currentTime; g.gain.linearRampToValueAtTime((def.vol ?? 0.5) * (o.vol ?? 1), t + 2.5);
      entry.src = src; entry.g = g;
    });
  }
  stopAmb(name, fade = 1.5) {
    const names = name ? [name] : [...this.ambs.keys()];
    for (const n of names) {
      const e = this.ambs.get(n); if (!e) continue; e.stopped = true; this.ambs.delete(n);
      if (e.g && this.ctx) { const t = this.ctx.currentTime; e.g.gain.cancelScheduledValues(t); e.g.gain.setValueAtTime(e.g.gain.value, t); e.g.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => { try { e.src.stop(); } catch (er) { /* */ } }, fade * 1000 + 100); }
    }
  }
  setAmbSet(names) { for (const n of [...this.ambs.keys()]) if (!names.includes(n)) this.stopAmb(n); for (const n of names) this.playAmb(n); }
}

export const audio = new Audio();
