// VOICES (newest direction): no speech synthesis. Every character speaks an UNCANNY GIBBERISH BABBLE, Animal-Crossing-
// like but weird and eerie: a syllable is struck for each letter-group of the line as its floating text reveals, from
// short CC0 vocal syllable recordings ("Dialog vocal samples" by MirceaKitsune, OpenGameArt, CC0; one small sprite,
// assets/audio/sfx/voice_babble.mp3: 7 timbres x 4 syllables). Each speaker has a BABBLE profile: timbre set(s), pitch,
// speed, formant wobble (a resonant peak that drifts through each syllable), detune scatter, an occasional reversed
// syllable, a droop, doubling (a second voice an octave or a fifth under) and an echo. The same word always babbles the
// same (syllables are chosen by its letters). The text shows the meaning; the voice only carries the music of it.
// Without audio (headless, muted, before the first gesture) a line runs on the same clock, silently, so callers never
// wait forever and the subtitles still reveal in time.
//
// API
//   speak(speaker, text, { onStart, onWord(charIndex), onEnd, rate, pitch }) -> handle { done: Promise, cancel(), progress() 0..1, voiced }
//   cancelAll()                       stop every queued / speaking line
//   PROFILES[speaker]                 the cast sheet (add a speaker: PROFILES.minotaur = { ... })
//   voiceSettings: { voice: bool, subtitles: bool, vol: 0..1, toggle(key), set(key, v) }  (persisted in save.settings)
//   estimate(text, speaker)           seconds a line takes on the reading clock
// Music is ducked while anyone speaks (audio.musicBus), restored after the last line. PROFILES (the old cast sheet, which
// registerVoice may still extend) only seed a BABBLE profile for a speaker that has none of its own.
import { audio } from '../core/audio.js';


// the cast: pitch 0..2, rate 0.1..10; prefer = name patterns in order of taste; g = gender wanted; lang = accent wanted
export const PROFILES = {
  narrator:   { g: 'm', lang: 'en-GB', pitch: 0.78, rate: 0.9,  prefer: [/Daniel/, /Arthur/, /George/, /UK English Male/, /Ryan/, /Thomas/, /en-GB/] }, // deep, warm storyteller
  newton:     { g: 'm', lang: 'en-GB', pitch: 1.02, rate: 1.04, prefer: [/Oliver/, /Ryan/, /Daniel/, /Aaron/, /Guy/, /Alex/] },
  isaac_kid:  { g: 'm', lang: 'en-GB', pitch: 1.65, rate: 1.08, prefer: [/Junior/, /Oliver/, /Aaron/, /Alex/] },
  master:     { g: 'm', lang: 'en-GB', pitch: 0.58, rate: 0.82, prefer: [/Grandpa/, /Arthur/, /George/, /Ralph/, /Daniel/, /UK English Male/] }, // old, slow, wise
  cosmic:     { g: 'm', lang: 'en-US', pitch: 0.32, rate: 0.7,  prefer: [/Bruce/, /Ralph/, /Fred/, /Grandpa/, /Daniel/], echo: true }, // vast and echoing
  pythia:     { g: 'f', lang: 'en-GB', pitch: 1.18, rate: 0.9,  prefer: [/Moira/, /Fiona/, /Serena/, /Kate/, /Hazel/] },
  sisyphus:   { g: 'm', lang: 'en-US', pitch: 0.86, rate: 1.0,  prefer: [/Fred/, /Tom/, /Ralph/, /David/] },
  pan:        { g: 'm', lang: 'en-US', pitch: 1.3,  rate: 1.18, prefer: [/Rocko/, /Eddy/, /Junior/, /Alex/] },
  icarus:     { g: 'm', lang: 'en-US', pitch: 1.38, rate: 1.12, prefer: [/Reed/, /Junior/, /Aaron/, /Alex/] },
  sphinx:     { g: 'f', lang: 'en-GB', pitch: 0.78, rate: 0.84, prefer: [/Serena/, /Kate/, /Martha/, /Victoria/, /Samantha/] },
  narcissus:  { g: 'm', lang: 'en-GB', pitch: 1.16, rate: 0.95, prefer: [/Oliver/, /Daniel/, /Rishi/] },
  prometheus: { g: 'm', lang: 'en-US', pitch: 0.7,  rate: 1.12, prefer: [/Bruce/, /Ralph/, /Fred/, /Mark/] },
  toll:       { g: 'm', lang: 'en-US', pitch: 1.95, rate: 1.3,  prefer: [/Eddy/, /Junior/, /Fred/] },
  archimedes: { g: 'm', lang: 'en-US', pitch: 0.95, rate: 1.15, prefer: [/Grandpa/, /Fred/, /Albert/, /Ralph/] },
  cat:        { g: 'f', lang: 'en-US', pitch: 1.85, rate: 1.0,  prefer: [/Shelley/, /Sandy/, /Samantha/] },
  eris:       { g: 'f', lang: 'en-US', pitch: 1.1,  rate: 1.02, prefer: [/Samantha/, /Victoria/, /Ava/, /Allison/] },
  dog:        { g: 'm', pitch: 1.0, rate: 1.0, mute: true, sfx: 'dog_bark' }, // the mop dog barks, never talks
  foe:        { g: 'm', lang: 'en-US', pitch: 0.7,  rate: 1.0,  prefer: [/Bruce/, /Fred/] },
};
export const profileOf = (sp) => PROFILES[sp] || PROFILES[String(sp).toLowerCase()] || { g: 'm', pitch: 1, rate: 1 };

// ---------------------------------------------------------------- settings (persisted with the game's settings)
const S = () => window.__settings || (window.__settings = {});
export const voiceSettings = {
  get voice() { return S().voice ?? true; }, get subtitles() { return S().subtitles ?? true; }, get vol() { return S().voiceVol ?? 1; },
  set(k, v) { const s = S(); s[k === 'vol' ? 'voiceVol' : k] = v; try { import('../core/save.js').then((m) => m.save.saveSettings?.()); } catch (e) { /* */ } if (k === 'voice' && !v) cancelAll(); },
  toggle(k) { this.set(k, !this[k]); return this[k]; },
  /** settings rows for a settings screen: [{ key, label, value, toggle() }] */
  rows() { return [{ key: 'voice', label: 'Voices', value: this.voice, toggle: () => this.toggle('voice') }, { key: 'subtitles', label: 'Subtitles', value: this.subtitles, toggle: () => this.toggle('subtitles') }]; },
};

// ---------------------------------------------------------------- the babble cast
// set: timbre(s) from the sprite (male_standard, male_deep, female_standard, female_light, whisper, demon, quick);
// pitch: playback rate; cps: letters a second; per: letters per syllable; wob: formant wobble 0..1; det: detune scatter
// in cents; rev: chance of a reversed syllable; droop: pitch fall over a syllable; dbl: [rate ratio, gain] a doubled
// voice under it; echo: [delay s, feedback]; layer: [set, gain] a breathy second timbre; trem: tremolo depth (age)
export const BABBLE = {
  narrator:   { set: 'male_deep', pitch: 0.92, cps: 15, per: 2, wob: 0.35, det: 25, rev: 0.04, droop: 0.06, layer: ['whisper', 0.22], echo: [0.21, 0.22] },
  newton:     { set: 'male_standard', pitch: 1.04, cps: 17, per: 2, wob: 0.3, det: 30, rev: 0.03, droop: 0.04 },
  isaac_kid:  { set: 'female_light', pitch: 1.22, cps: 18, per: 2, wob: 0.3, det: 35, rev: 0.02, droop: 0.02 },
  teacher:    { set: 'male_deep', pitch: 0.96, cps: 12, per: 2, wob: 0.5, det: 40, rev: 0.05, droop: 0.1, trem: 0.35, layer: ['whisper', 0.25] },
  master:     { set: 'male_deep', pitch: 0.96, cps: 12, per: 2, wob: 0.5, det: 40, rev: 0.05, droop: 0.1, trem: 0.35, layer: ['whisper', 0.25] },
  god:        { set: 'demon', pitch: 0.66, cps: 10, per: 2, wob: 0.7, det: 18, rev: 0.25, droop: 0.12, dbl: [0.5, 0.55], echo: [0.34, 0.42], layer: ['whisper', 0.35] },
  cosmic:     { set: 'demon', pitch: 0.7, cps: 10, per: 2, wob: 0.7, det: 18, rev: 0.25, droop: 0.12, dbl: [0.5, 0.5], echo: [0.3, 0.4], layer: ['whisper', 0.3] },
  grandmaster:{ set: ['male_deep', 'demon'], pitch: 0.56, cps: 8.5, per: 2, wob: 0.55, det: 14, rev: 0.12, droop: 0.16, dbl: [0.667, 0.7], echo: [0.27, 0.36] }, // deep, slow and doubled
  pythia:     { set: 'female_standard', pitch: 1.02, cps: 13, per: 2, wob: 0.8, det: 60, rev: 0.2, droop: 0.08, layer: ['whisper', 0.6], echo: [0.18, 0.3] },
  sisyphus:   { set: 'male_standard', pitch: 0.86, cps: 14, per: 2, wob: 0.3, det: 30, rev: 0.02, droop: 0.14 },
  pan:        { set: 'quick', pitch: 1.18, cps: 21, per: 1, wob: 0.4, det: 60, rev: 0.06, droop: -0.04 },
  icarus:     { set: 'quick', pitch: 1.3, cps: 20, per: 1, wob: 0.25, det: 40, rev: 0.02, droop: 0.0 },
  sphinx:     { set: 'female_standard', pitch: 0.8, cps: 11, per: 2, wob: 0.6, det: 20, rev: 0.12, droop: 0.06, layer: ['demon', 0.25], echo: [0.24, 0.3] },
  narcissus:  { set: 'male_standard', pitch: 1.12, cps: 15, per: 2, wob: 0.45, det: 25, rev: 0.03, droop: -0.05 },
  prometheus: { set: 'male_deep', pitch: 1.0, cps: 17, per: 2, wob: 0.35, det: 30, rev: 0.03, droop: 0.04, layer: ['demon', 0.15] },
  toll:       { set: 'quick', pitch: 1.65, cps: 22, per: 1, wob: 0.5, det: 80, rev: 0.05, droop: 0.0 },
  archimedes: { set: 'male_standard', pitch: 1.18, cps: 19, per: 2, wob: 0.4, det: 50, rev: 0.04, droop: 0.02 },
  cat:        { set: 'female_light', pitch: 1.55, cps: 9, per: 3, wob: 0.8, det: 90, rev: 0.3, droop: 0.2 },
  eris:       { set: 'female_standard', pitch: 1.06, cps: 16, per: 2, wob: 0.5, det: 35, rev: 0.1, droop: -0.03, layer: ['whisper', 0.3] },
  foe:        { set: 'demon', pitch: 0.82, cps: 14, per: 2, wob: 0.5, det: 30, rev: 0.12, droop: 0.1 },
};
const SETS = ['male_standard', 'male_deep', 'female_standard', 'female_light', 'whisper', 'demon', 'quick']; const SLOT = 0.32;
const DUR = { male_standard: [0.168, 0.197, 0.234, 0.178], male_deep: [0.229, 0.223, 0.258, 0.183], female_standard: [0.262, 0.235, 0.256, 0.265], female_light: [0.242, 0.216, 0.242, 0.161], whisper: [0.247, 0.21, 0.186, 0.079], demon: [0.232, 0.174, 0.214, 0.32], quick: [0.078, 0.087, 0.059, 0.075] };
export function babbleOf(sp) {
  const B = BABBLE[sp] || BABBLE[String(sp).toLowerCase()]; if (B) return B; const P = profileOf(sp); // derive one from the old cast sheet
  const p = P.pitch ?? 1; const set = P.g === 'f' ? (p > 1.4 ? 'female_light' : 'female_standard') : p < 0.55 ? 'demon' : p < 0.85 ? 'male_deep' : (P.rate ?? 1) > 1.15 ? 'quick' : 'male_standard';
  return (BABBLE[sp] = { set, pitch: 0.75 + p * 0.3, cps: 15 * (P.rate ?? 1), per: set === 'quick' ? 1 : 2, wob: 0.4, det: 30, rev: 0.06, droop: 0.06, ...(P.echo ? { echo: [0.26, 0.35], dbl: [0.5, 0.45] } : {}) });
}
const hashS = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** the line's timeline: syllables { t, word, k, glide } and the time each character is shown, all at the speaker's pace */
function schedule(text, sp) {
  const B = babbleOf(sp); const fast = (window.__storyFast || 1) * (window.__settings?.fastAnims ? 1.15 : 1); const ct = 1 / (B.cps * fast); const syl = []; const at = new Float32Array(text.length + 1); let t = 0.06, run = 0, word = '';
  const words = text.split(/(\s+)/); let ci = 0;
  for (const w of words) { const clean = w.replace(/[^A-Za-z0-9']/g, ''); word = clean.toLowerCase(); let li = 0;
    for (const ch of w) { at[ci++] = t;
      if (/\s/.test(ch)) { t += ct * 0.7; run = 0; continue; }
      if (/[.!?…]/.test(ch)) { t += ct * 5; run = 0; continue; } if (/[,;:—-]/.test(ch)) { t += ct * 2.6; run = 0; continue; }
      if (/[A-Za-z0-9]/.test(ch)) { if (run % B.per === 0) syl.push({ t, word, k: li, up: /\?/.test(w) && li >= clean.length - 2, loud: /[A-Z]/.test(ch) && clean.length > 1 && clean === clean.toUpperCase() }); run++; li++; t += ct; } else t += ct * 0.4; } }
  at[text.length] = t; return { syl, at, dur: t + 0.25, B };
}
export function estimate(text, sp = 'narrator') { return schedule(String(text || ''), sp).dur + 0.35; }

// ---------------------------------------------------------------- the sprite (loaded on the first spoken line once audio is unlocked)
let SPR = null, REV = null, LEAD = 0, loading = null;
function sprite() {
  if (SPR || !audio.ctx) return SPR; if (!loading) loading = audio._load('sfx/voice_babble.mp3').then((b) => { if (!b) return; SPR = b;
    const d = b.getChannelData(0); let k = 0; while (k < Math.min(d.length, b.sampleRate * 0.1) && Math.abs(d[k]) < 0.01) k++; LEAD = Math.max(0, Math.min(0.08, k / b.sampleRate - 0.004)); // the encoder's leading silence
    try { REV = audio.ctx.createBuffer(1, b.length, b.sampleRate); const r = REV.getChannelData(0); for (let s = 0; s < SETS.length * 4; s++) { const a = Math.round((s * SLOT + LEAD) * b.sampleRate), n = Math.round(SLOT * b.sampleRate * 0.9); for (let j = 0; j < n && a + j < d.length; j++) r[a + j] = d[Math.min(d.length - 1, a + n - 1 - j)]; } } catch (e) { REV = null; } });
  return SPR;
}

// ---------------------------------------------------------------- music ducking while anyone speaks
let ducks = 0;
function duck(on) {
  ducks = Math.max(0, ducks + (on ? 1 : -1)); const b = audio.musicBus; if (!b || !audio.ctx) return;
  const t = audio.ctx.currentTime; b.gain.cancelScheduledValues(t); b.gain.setTargetAtTime(audio.vol.music * (ducks ? 0.32 : 1), t, ducks ? 0.08 : 0.35);
}

/** strike one syllable at ctx time `when` into `out` */
function syllable(ctx, out, B, sy, when, gap, rnd, rate0, gainK = 1, setOverride = null) {
  const sets = Array.isArray(B.set) ? B.set : [B.set]; const set = setOverride || sets[(hashS(sy.word) + sy.k) % sets.length]; const si = Math.max(0, SETS.indexOf(set));
  const v = (hashS(sy.word + '|' + sy.k) + sy.k * 7) % 4; const rev = REV && rnd() < (B.rev || 0); const src = ctx.createBufferSource(); src.buffer = rev ? REV : SPR;
  const vowel = 'aeiouy'.indexOf(sy.word[sy.k] || 'x'); const into = (vowel >= 0 ? (vowel - 2.5) * 0.025 : 0) + (sy.up ? 0.18 : 0) + (sy.loud ? 0.08 : 0);
  const cents = (rnd() * 2 - 1) * (B.det || 0); const r = Math.max(0.2, B.pitch * rate0 * (1 + into) * Math.pow(2, cents / 1200)); src.playbackRate.setValueAtTime(r, when);
  const len = Math.min(DUR[set][v] / r, Math.max(0.07, gap * 1.7)); src.playbackRate.linearRampToValueAtTime(r * (1 - (B.droop || 0)), when + len);
  const g = ctx.createGain(); const peak = 0.55 * gainK * (sy.loud ? 1.25 : 1); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(peak, when + 0.012); g.gain.setValueAtTime(peak, when + Math.max(0.014, len - 0.05)); g.gain.linearRampToValueAtTime(0, when + len);
  let node = src; if (B.wob) { const f = ctx.createBiquadFilter(); f.type = 'peaking'; const f0 = 600 + rnd() * 1600; f.frequency.setValueAtTime(f0, when); f.frequency.exponentialRampToValueAtTime(f0 * (1 + (rnd() * 2 - 1) * B.wob * 0.9 + 0.05), when + len); f.Q.value = 2.5 + B.wob * 4; f.gain.value = 6 + B.wob * 8; node.connect(f); node = f; }
  if (B.trem) { const tg = ctx.createGain(); tg.gain.setValueAtTime(1, when); for (let k = 0; k < 6; k++) tg.gain.linearRampToValueAtTime(1 - B.trem * (k % 2 ? 0 : 1), when + (len * (k + 1)) / 6); node.connect(tg); node = tg; }
  node.connect(g); g.connect(out); const off = Math.max(0, si * 4 + v) * SLOT + LEAD; src.start(when, rev ? off + Math.max(0, SLOT * 0.9 - DUR[set][v]) : off, len * r + 0.02); return src;
}

// ---------------------------------------------------------------- one spoken line
const live = new Set();
export function speak(sp, text, { onStart, onWord, onEnd } = {}) {
  const P = profileOf(sp); text = String(text || ''); const shown = text.replace(/\(([^)]*)\)/g, '$1');
  let res; const done = new Promise((r) => (res = r)); const S = schedule(shown, sp);
  const h = { sp, text, done, voiced: false, ended: false, t0: performance.now(), dur: S.dur, started: false, char: 0, srcs: [] };
  let timer = null; const wt = [];
  const finish = () => { if (h.ended) return; h.ended = true; clearTimeout(timer); for (const w of wt) clearTimeout(w); live.delete(h); if (h.ducked) duck(false); h.char = text.length; onEnd?.(); res(h); };
  h.progress = () => { if (h.ended) return 1; if (!h.started) return 0; const e = (performance.now() - h.t0) / 1000; let lo = 0, hi = S.at.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S.at[m] <= e) lo = m; else hi = m - 1; } return Math.min(1, (lo + (e >= S.dur - 0.25 ? 1 : 0)) / Math.max(1, shown.length)); };
  h.cancel = () => { if (h.ended) return; const ctx = audio.ctx; if (ctx && h.out) { const t = ctx.currentTime; try { h.out.gain.cancelScheduledValues(t); h.out.gain.setTargetAtTime(0, t, 0.03); } catch (e) { /* */ } setTimeout(() => { for (const s of h.srcs) try { s.stop(); } catch (e) { /* */ } try { h.out.disconnect(); } catch (e) { /* */ } }, 160); } finish(); };
  for (const o of [...live]) if (o !== h && o.sp === sp) o.cancel(); // one line per speaker: the newest wins
  live.add(h); if (P.sfx) audio.play(P.sfx, { vol: 0.6 });
  h.started = true; h.t0 = performance.now(); onStart?.(); timer = setTimeout(finish, S.dur * 1000 + 120);
  let w0 = 0; shown.replace(/\S+/g, (m, idx) => { const tt = S.at[idx] * 1000; if (onWord) wt.push(setTimeout(() => { h.char = Math.max(h.char, idx); onWord(idx); }, tt)); w0++; return m; });
  const ctx = audio.ctx; if (P.mute || !voiceSettings.voice || !ctx || audio.muted || !S.syl.length) return h;
  if (!sprite()) { loading?.then(() => { if (!h.ended && SPR) voice(h, S, ctx); }); return h; } // first line: the syllables join as soon as the sprite is decoded
  voice(h, S, ctx); return h;
}
function voice(h, S, ctx) {
  const B = S.B; const rnd = (() => { let a = hashS(h.text + h.sp); return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const out = (h.out = ctx.createGain()); out.gain.value = Math.max(0, Math.min(1.4, voiceSettings.vol)) * 0.9; out.connect(audio.sfxBus || audio.master);
  if (B.echo) { const d = ctx.createDelay(1); d.delayTime.value = B.echo[0]; const fb = ctx.createGain(); fb.gain.value = B.echo[1]; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; out.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(audio.sfxBus || audio.master); h.echo = [d, fb, lp]; }
  const late = (performance.now() - h.t0) / 1000; const base = ctx.currentTime + 0.02 - late;
  S.syl.forEach((sy, i) => { const when = base + sy.t; if (when < ctx.currentTime) return; const gap = (S.syl[i + 1]?.t ?? sy.t + 0.2) - sy.t;
    h.srcs.push(syllable(ctx, out, B, sy, when, gap, rnd, 1));
    if (B.dbl) h.srcs.push(syllable(ctx, out, B, sy, when + 0.022, gap, rnd, B.dbl[0], B.dbl[1]));
    if (B.layer && rnd() < 0.7) h.srcs.push(syllable(ctx, out, B, sy, when + 0.01, gap, rnd, 1.0, B.layer[1], B.layer[0])); });
  h.voiced = true; h.ducked = true; duck(true);
  const end = base + S.dur + (B.echo ? 1.2 : 0.2); setTimeout(() => { try { out.disconnect(); h.echo?.forEach((n) => n.disconnect()); } catch (e) { /* */ } }, Math.max(0, (end - ctx.currentTime) * 1000 + 400));
}
export function cancelAll() { for (const h of [...live]) h.cancel(); }
export const speaking = () => live.size > 0;
