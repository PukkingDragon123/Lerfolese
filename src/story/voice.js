// VOICES: the narrator and every character speak through the browser's Web Speech API (speechSynthesis; free, offline
// where the OS has voices). Each speaker has a cast profile (preferred voice names, gender, accent, pitch, rate); the
// casting picks a distinct installed voice per speaker where it can. Without voices (headless, blocked, muted) a line
// runs on a reading clock instead, so callers never wait forever and the subtitles still reveal in time.
//
// API
//   speak(speaker, text, { onStart, onWord(charIndex), onEnd, rate, pitch }) -> handle { done: Promise, cancel(), progress() 0..1, voiced }
//   cancelAll()                       stop every queued / speaking line
//   PROFILES[speaker]                 the cast sheet (add a speaker: PROFILES.minotaur = { ... })
//   voiceSettings: { voice: bool, subtitles: bool, vol: 0..1, toggle(key), set(key, v) }  (persisted in save.settings)
//   estimate(text, speaker)           seconds a line takes on the reading clock
// Music is ducked while anyone speaks (audio.musicBus), restored after the last line.
import { audio } from '../core/audio.js';

const SS = typeof window !== 'undefined' ? window.speechSynthesis : null;
const FEMALE = /female|woman|samantha|victoria|karen|moira|tessa|fiona|zira|susan|hazel|serena|kate|libby|sonia|jenny|aria|emma|amy|joanna|salli|kimberly|ivy|kendra|nicole|veena|catherine|allison|ava|grandma|shelley|sandy|flo|martha|google us english|natasha|clara|michelle|ana\b/i;
const MALE = /\bmale|daniel|alex\b|fred|david|mark|george|james|ryan|guy|arthur|thomas|oliver|rishi|aaron|tom\b|bruce|ralph|albert|junior|reed|eddy|rocko|grandpa|brian|matthew|joey|justin|liam|william|christopher|eric|roger|steffan|andrew|davis|tony/i;

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

// ---------------------------------------------------------------- casting
let voices = [];
const cast = new Map();
function loadVoices() { try { voices = (SS?.getVoices() || []).filter((v) => /^en([-_]|$)/i.test(v.lang)); } catch (e) { voices = []; } cast.clear(); }
if (SS) { loadVoices(); try { SS.addEventListener?.('voiceschanged', loadVoices); } catch (e) { /* */ } }
const gender = (v) => (FEMALE.test(v.name) && !/\bmale/i.test(v.name) ? 'f' : MALE.test(v.name) ? 'm' : '?');
function voiceFor(sp) {
  if (cast.has(sp)) return cast.get(sp); if (!voices.length) loadVoices(); if (!voices.length) return null;
  const P = profileOf(sp); const used = new Set(cast.values());
  let best = null, bs = -1e9;
  for (const v of voices) {
    let s = 0; const pi = (P.prefer || []).findIndex((re) => re.test(v.name)); if (pi >= 0) s += 6 - pi * 0.5;
    const g = gender(v); if (P.g && g === P.g) s += 3; else if (P.g && g !== '?' && g !== P.g) s -= 4;
    if (P.lang && v.lang.replace('_', '-').toLowerCase() === P.lang.toLowerCase()) s += 1.2;
    if (used.has(v)) s -= 2.5; if (v.localService) s += 0.8; // local voices fire word boundaries
    if (/Bells|Bubbles|Boing|Cellos|Organ|Trinoids|Zarvox|Whisper|Wobble|Hysterical|Jester|Superstar|Bad News|Good News|Albert/i.test(v.name) && pi < 0) s -= 8;
    if (s > bs) { bs = s; best = v; }
  }
  cast.set(sp, best); return best;
}
export function estimate(text, sp = 'narrator') { const P = profileOf(sp); return (0.7 + String(text).length / 14.5) / Math.max(0.5, P.rate || 1) / (window.__storyFast || 1); } // window.__storyFast: debug / capture speed-up of the reading clock

// ---------------------------------------------------------------- music ducking while anyone speaks
let ducks = 0;
function duck(on) {
  ducks = Math.max(0, ducks + (on ? 1 : -1)); const b = audio.musicBus; if (!b || !audio.ctx) return;
  const t = audio.ctx.currentTime; b.gain.cancelScheduledValues(t); b.gain.setTargetAtTime(audio.vol.music * (ducks ? 0.32 : 1), t, ducks ? 0.08 : 0.35);
}

// ---------------------------------------------------------------- one spoken line
const live = new Set();
export function speak(sp, text, { onStart, onWord, onEnd, rate, pitch } = {}) {
  const P = profileOf(sp); text = String(text || '');
  const clean = text.replace(/[*_~]/g, '').replace(/\(([^)]*)\)/g, '$1').replace(/…/g, '... ').replace(/—/g, ', ');
  let res; const done = new Promise((r) => (res = r));
  const h = { sp, text, done, voiced: false, ended: false, t0: performance.now(), dur: estimate(text, sp), started: false, char: 0 };
  let timer = null, watchdog = null;
  const finish = () => { if (h.ended) return; h.ended = true; clearTimeout(timer); clearTimeout(watchdog); live.delete(h); if (h.ducked) duck(false); h.char = text.length; onEnd?.(); res(h); };
  const startClock = () => { if (h.started) return; h.started = true; h.t0 = performance.now(); onStart?.(); timer = setTimeout(finish, h.dur * 1000 + 250); };
  h.progress = () => (h.ended ? 1 : !h.started ? 0 : Math.max(Math.min(1, (performance.now() - h.t0) / 1000 / h.dur), h.char / Math.max(1, text.length)));
  h.cancel = () => { if (h.ended) return; if (h.utt) { h.utt.onend = h.utt.onerror = null; try { SS.cancel(); } catch (e) { /* */ } } finish(); };
  live.add(h);
  if (P.sfx) audio.play(P.sfx, { vol: 0.6 });
  const v = !P.mute && voiceSettings.voice && SS && window.SpeechSynthesisUtterance ? voiceFor(sp) : null;
  if (!v || !clean.trim()) { startClock(); return h; }
  try {
    const u = new SpeechSynthesisUtterance(clean); h.utt = u; u.voice = v; u.lang = v.lang; u.pitch = Math.max(0, Math.min(2, pitch ?? P.pitch ?? 1)); u.rate = Math.max(0.1, Math.min(4, (rate ?? P.rate ?? 1) * (window.__settings?.fastAnims ? 1.15 : 1))); u.volume = Math.max(0, Math.min(1, voiceSettings.vol * (audio.vol?.master ?? 1)));
    u.onstart = () => { h.voiced = true; clearTimeout(watchdog); h.started = true; h.t0 = performance.now(); h.dur = estimate(text, sp) * 1.05; h.ducked = true; duck(true); onStart?.(); timer = setTimeout(finish, (h.dur * 2.2 + 4) * 1000); }; // speech owns the end; the timer is only a safety net
    u.onboundary = (e) => { if (e.name && e.name !== 'word') return; const k = Math.round((e.charIndex / Math.max(1, clean.length)) * text.length); h.char = Math.max(h.char, k); onWord?.(h.char); };
    u.onend = finish; u.onerror = () => { if (!h.started) startClock(); else finish(); };
    for (const o of [...live]) if (o !== h && o.utt) o.cancel(); // the newest line wins: cut whoever is still talking
    SS.speak(u);
    watchdog = setTimeout(() => { if (!h.started) { try { u.onend = u.onerror = u.onstart = null; SS.cancel(); } catch (e) { /* */ } h.utt = null; startClock(); } }, 2000); // blocked / no audio device: read on the clock
  } catch (e) { startClock(); }
  return h;
}
export function cancelAll() { for (const h of [...live]) h.cancel(); try { SS?.cancel(); } catch (e) { /* */ } }
export const speaking = () => live.size > 0;
// Chrome pauses long queues on hidden tabs: keep it awake while anything is live
if (SS) setInterval(() => { if (live.size && SS.paused) try { SS.resume(); } catch (e) { /* */ } }, 4000);
