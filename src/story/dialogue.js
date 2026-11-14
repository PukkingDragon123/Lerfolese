// STORY DIALOGUE: voiced lines shown as FLOATING PHYSICAL TEXT. Every line is a torn parchment speech scrap (pixel-art
// fibres, inked edge, a tail pointing at the speaker) that springs up beside the speaker's head in the 3D world and
// tracks it; the words are inked in as they are spoken (word-boundary events from the voice when the browser sends them,
// a reading clock otherwise), then the scrap flutters away. The narrator's lines are a long chronicle strip tacked
// along the bottom (onto the letterbox beam during cinematics). The cosmic self speaks on lapis vellum in gold leaf.
// Fonts: speaker names in Alagard; dialogue in PixelSans (11 px native); the cosmic self in RuneMono (12 px native).
//
// API (any scene may call these; they find the running engine through window.__game):
//   say(speaker, text, { anchor, wait = true, hold, side, name, paper, advance }) -> Promise (resolves when the line is
//       spoken and read; wait:false resolves at once). anchor: an actor api (headWorld), Object3D, Vector3,
//       () => Vector3 (world), or { ui: [x, y] } (UI plane). No anchor: low on the screen. The promise has .line.
//   narrate(text, { wait = true, hold }) -> Promise            the narrator (deep, warm storyteller voice)
//   choice(options, { prompt, speaker }) -> Promise<index>     physical plaques; options: strings or { label, sub }
//   registerSpeaker(id, { name, color, voice })               display name / rubric colour / voice profile id
//   stopAll()                                                 drop every line, stop speech (scene changes, skips)
//   voiceSettings                                             re-exported from voice.js (voice / subtitles toggles)
// Speakers with voices: narrator, newton, isaac_kid, master, cosmic, pythia, sisyphus, pan, icarus, sphinx, narcissus,
// prometheus, toll, archimedes, cat, eris, dog (barks), foe. Unknown ids get a neutral voice.
import * as THREE from 'three';
import { Surf, RAMP, PXP, pxTex, sheet, mesh, measure, wrapText, inscribe, parchment, plainMat, TACK, Body, paperMat, FONT } from '../ui3d/craft.js';
import { Plaque } from '../ui3d/objects.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { speak, cancelAll, voiceSettings, profileOf, estimate } from './voice.js';
export { voiceSettings };

// ---------------------------------------------------------------- fonts (the fonts agent wires @font-face; this is a safety net)
const PACK = { PixelSans: 'PixelSans', RuneMono: 'RuneMono', NanoPlus: 'NanoPlus' };
let fontsP = null;
export function ensureFonts() {
  if (fontsP) return fontsP;
  const have = (fam) => { try { for (const f of document.fonts) if (f.family.replace(/["']/g, '') === fam) return true; } catch (e) { /* */ } return false; };
  fontsP = Promise.all(Object.entries(PACK).map(async ([fam, file]) => {
    try { if (!have(fam)) { const ff = new FontFace(fam, `url(assets/fonts/pack/${file}.ttf)`); document.fonts.add(ff); await ff.load(); } else await document.fonts.load(`12px "${fam}"`); } catch (e) { /* the kit falls back to the next font */ }
  }));
  return fontsP;
}
ensureFonts();
export const DLG = { font: 'PixelSans', size: 11, weight: 400, lineH: 13, base: 10 };
export const RUNE = { font: 'RuneMono', size: 12, weight: 400, lineH: 14, base: 10 };
const LAPIS = ['#04061a', '#0a1236', '#14215a', '#203482', '#2e4aa4', '#4466c4', '#6a8ee0'];

// ---------------------------------------------------------------- who is who
const SPEAKERS = {
  narrator: { name: 'The Chronicle', color: '#8a1a1c' }, newton: { name: 'Isaac', color: '#1e3a6a' }, isaac_kid: { name: 'Young Isaac', color: '#1e3a6a' },
  master: { name: 'The Master', color: '#5a1a5a' }, cosmic: { name: 'Isaac, beyond', color: '#ffe08a', paper: 'vellum' }, dog: { name: 'Halley', color: '#6a4a1a' },
  pythia: { name: 'The Pythia', color: '#5a1a5a' }, sisyphus: { name: 'Sisyphus', color: '#5a3a1a' }, pan: { name: 'Pan', color: '#3e5a1a' }, icarus: { name: 'Icarus', color: '#8a5a12' },
  sphinx: { name: 'The Sphinx', color: '#7a4a12' }, narcissus: { name: 'Narcissus', color: '#1e5a5a' }, prometheus: { name: 'Prometheus', color: '#8a2a12' }, toll: { name: 'The Kobaloi', color: '#3a5a2a' },
  archimedes: { name: 'Archimedes', color: '#1e4a6a' }, cat: { name: 'The Cat (probably)', color: '#4a4a5a' }, eris: { name: 'Eris', color: '#8a6a12' },
};
export function registerSpeaker(id, o = {}) { SPEAKERS[id] = { ...(SPEAKERS[id] || {}), ...o }; }
const spk = (id) => SPEAKERS[id] || { name: String(id).replace(/^\w/, (c) => c.toUpperCase()), color: '#5a1a22' };

// ---------------------------------------------------------------- the speech scrap
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tackGeo = TACK();
let seedN = 11;
class Scrap extends Body {
  /** kind: 'scrap' (a character's line, with a tail) | 'strip' (the narrator, tacked) ; paper: 'parch' | 'vellum' */
  constructor(text, { speaker = null, kind = 'scrap', paper = 'parch', maxW = 8.4, tail = 'left', showName = true } = {}) {
    super(); this.text = String(text); this.kind = kind; this.paper = paper; this.tail = kind === 'scrap' ? tail : null; this.seed = (seedN = (seedN * 48271) % 2147483647) % 997;
    this.tiltK = 0.02; this.hoverLift = 0; this.group.visible = false; this.st = new Spring(0.12, 15, 0.45); this.st.target = 1; this.baseScale = 1; this.shown = -1;
    this.mat = paperMat(); this.sheet = mesh(new THREE.BufferGeometry(), this.mat, this.pivot); this.sheet.castShadow = true; this.pins = [];
    const F = paper === 'vellum' ? RUNE : DLG; this.F = F; const pad = kind === 'strip' ? 9 : 7; const sp = speaker ? spk(speaker) : null;
    const maxT = Math.round(maxW * PXP) - pad * 2; const lines = wrapText(this.text, F, maxT); this.lines = lines;
    const name = showName && sp && kind === 'scrap' ? sp.name : null; const NF = FONT.head; const nameH = name ? NF.lineH + 1 : 0;
    const tw = Math.max(...lines.map((l) => measure(l, F)), name ? measure(name, NF) : 0, 20);
    const Wt = Math.max(kind === 'strip' ? 120 : 48, tw + pad * 2 + (kind === 'strip' ? 10 : 0)); const LH = F.lineH; const tailH = this.tail ? 9 : 0;
    const bodyH = pad + nameH + lines.length * LH + pad - 3; const Ht = bodyH + tailH; this.Wt = Wt; this.Ht = Ht;
    const S = new Surf(Wt, Ht); const tailX = this.tail === 'right' ? Wt - 20 : 12; this.tailX = tailX;
    const mask = (x, y) => (y < bodyH ? true : this.tail ? x >= tailX + (y - bodyH) * (this.tail === 'right' ? 0.9 : 0.25) && x < tailX + 11 - (y - bodyH) * (this.tail === 'right' ? 0.25 : 0.9) : false);
    if (paper === 'vellum') { // lapis vellum: deep blue fibres, a faint gold star dust, gilded rim
      const n = (x, y) => Math.sin(x * 0.37 + this.seed) * Math.cos(y * 0.29 - this.seed) + Math.sin((x + y) * 0.11) * 0.6;
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) { if (!mask(x, y)) continue; const e = Math.min(x, Wt - 1 - x, y, bodyH - 1 - y); const v = n(x, y); S.set(x, y, LAPIS, e < 1 ? 1 : e < 2 ? 5 : v > 0.9 ? 4 : v < -0.8 ? 2 : 3); }
      for (let i = 0; i < (Wt * Ht) / 60; i++) { const x = (Math.sin(i * 91.7 + this.seed) * 0.5 + 0.5) * Wt | 0, y = (Math.sin(i * 37.3 + this.seed * 3) * 0.5 + 0.5) * bodyH | 0; if (S.has(x, y)) S.set(x, y, RAMP.gold, i % 3 ? 3 : 5); }
    } else parchment(S, 0, 0, Wt, Ht, { seed: this.seed, torn: kind === 'scrap' ? 3 : 2, tone: kind === 'strip' ? 5 : 4, mask });
    let y = pad - 1;
    if (name) { const x0 = pad; inscribe(S, name, x0, y + NF.base, NF, paper === 'vellum' ? 'gild' : 'ink', { color: sp.color, seed: this.seed }); y += nameH; for (let x = x0; x < Math.min(Wt - pad, x0 + measure(name, NF) + 6); x++) if ((x * 7 + this.seed) % 9) S.pix(x, y - 2, paper === 'vellum' ? '#e8c060' : '#6a3a22'); }
    if (this.kind === 'strip') for (const x of [5, Wt - 6]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) S.shift(x + dx, Math.round(bodyH / 2) + dy, -1);
    S.inkEdge(paper === 'vellum' ? '#020210' : '#1a0e12');
    // two renders: the bare sheet, and the sheet fully inked; the display composites the inked part as words are spoken
    this.K = Surf.K(Wt, Ht); this.bare = S.toCanvas(null, this.K);
    this.boxes = []; const x0 = kind === 'strip' ? pad + 5 : pad; const inkC = paper === 'vellum' ? null : '#2a160c';
    lines.forEach((l, i) => {
      const by = y + i * LH; const xs = []; for (let c = 0; c <= l.length; c++) xs.push(x0 + measure(l.slice(0, c), F));
      inscribe(S, l, x0, by + F.base, F, paper === 'vellum' ? 'gild' : 'ink', { color: inkC, seed: this.seed + i }); this.boxes.push({ y0: by - 1, y1: by + LH + 2, xs, n: l.length });
    });
    this.full = S.toCanvas(null, this.K); this.canvas = document.createElement('canvas'); this.canvas.width = this.full.width; this.canvas.height = this.full.height;
    this.tex = pxTex(this.canvas); this.mat.map = this.tex; this.mat.needsUpdate = true; this.reveal(0);
    const w = Wt / PXP, h = Ht / PXP; this.w = w; this.h = h; this.bodyH = bodyH / PXP;
    this.sheet.geometry = sheet(w, h, { curl: kind === 'scrap' ? 0.16 : 0.06, sag: 0.035, segX: 8, segY: 3 });
    if (kind === 'strip') for (const s of [-1, 1]) { const p = mesh(tackGeo, plainMat('brass'), this.pivot); p.rotation.x = Math.PI / 2; p.position.set(s * (w / 2 - 5 / PXP), (h / 2 - bodyH / PXP / 2) * 0, 0.06); this.pins.push(p); }
    this.total = this.text.length;
  }
  /** ink in the first n characters of the text (wrapped lines joined by single spaces) */
  reveal(n) {
    n = Math.max(0, Math.min(this.total ?? this.text.length, Math.floor(n))); if (n === this.shown) return; this.shown = n;
    const g = this.canvas.getContext('2d'); const K = this.K; g.clearRect(0, 0, this.canvas.width, this.canvas.height); g.drawImage(this.bare, 0, 0);
    let left = n;
    for (const b of this.boxes) {
      if (left <= 0) break; const c = Math.min(b.n, left); left -= b.n + 1;
      const x1 = c >= b.n ? this.canvas.width / K : b.xs[c] + 1; const sx = 0, sy = Math.max(0, b.y0) * K, sw = Math.max(1, x1) * K, sh = (b.y1 - Math.max(0, b.y0)) * K;
      g.drawImage(this.full, sx, sy, Math.min(sw, this.canvas.width), sh, sx, sy, Math.min(sw, this.canvas.width), sh);
    }
    this.tex.needsUpdate = true;
  }
  update(dt) { this.st.update(dt); this.updateBody(dt, null); this.group.scale.setScalar(Math.max(0.001, this.st.value) * this.baseScale); }
  dispose() { this.tex.dispose(); this.mat.dispose(); this.sheet.geometry.dispose(); }
}

// ---------------------------------------------------------------- the line manager (one engine updater for every live line)
const Z = 8, KZ = (40 - Z) / 40;
const lines = new Set();
let mgr = null, ui = null;
const eng = () => window.__game?.engine;
function ensureMgr() {
  const E = eng(); if (!E) return null;
  if (mgr && mgr.E === E) return mgr;
  ui = new THREE.Group(); ui.name = 'dialogue'; E.ui.scene.add(ui);
  mgr = { E, update: (dt) => step(dt) }; E.add(mgr); return mgr;
}
const _w = V(), _p = V();
function anchorUI(a, out) {
  const E = eng(); if (!a) return null;
  if (a.ui) return out.set(a.ui[0], a.ui[1], 0);
  let w = null;
  if (typeof a === 'function') w = a(_w); else if (a.isVector3) w = _w.copy(a); else if (a.headWorld) w = a.headWorld(_w); else if (a.root?.isObject3D) { a.root.updateMatrixWorld(true); w = a.root.getWorldPosition(_w).add(V(0, 1.6, 0)); } else if (a.isObject3D) { a.updateMatrixWorld(true); w = a.getWorldPosition(_w); }
  if (!w) return null; const cam = E.world.camera; _p.copy(w).project(cam); if (_p.z > 1) return null; // behind the camera
  return out.set(_p.x * E.uiW, _p.y * E.uiH, 0);
}
function bandY() { const D = window.__cine; const E = eng(); if (D && !D.ended && D.bars) return -E.uiH + D.band * 0.5 + 0.06; return -E.uiH + 1.25; }
function step(dt) {
  const E = eng(); if (!E) return; const W = E.uiW, H = E.uiH; const show = voiceSettings.subtitles || !voiceSettings.voice;
  const live = [...lines];
  for (const L of live) {
    const s = L.scrap; s.group.visible = show && !L.hidden;
    if (L.h) s.reveal(L.h.progress() * s.total);
    if (L.fall) { L.fall.vy -= 16 * dt; s.group.position.x += L.fall.vx * dt; s.group.position.y += L.fall.vy * dt; s.group.rotation.z += L.fall.spin * dt; s.group.rotation.x += dt * 2.4; L.fall.t += dt; s.update(dt); if (L.fall.t > 1.4) kill(L); continue; }
    let x, y;
    if (s.kind === 'strip') { x = 0; y = bandY(); }
    else {
      const a = anchorUI(L.anchor, _p) || (L.last ? _p.copy(L.last) : _p.set(L.side === 'right' ? W * 0.35 : -W * 0.35, -H * 0.35, 0)); L.last = (L.last || V()).copy(a);
      const tip = (s.tailX + (s.tail === 'right' ? 8.4 : 2.5)) / PXP - s.w / 2; // the tail tip sits just above the speaker's head
      x = a.x - tip; y = a.y + 0.42 + s.h / 2;
      x = Math.max(-W + s.w / 2 + 0.3, Math.min(W - s.w / 2 - 0.3, x)); y = Math.max(-H + s.h / 2 + 0.4, Math.min(H - s.h / 2 - 0.3, y));
    }
    if (L.lift) y += L.lift;
    L.x = L.x == null ? x : L.x + (x - L.x) * Math.min(1, dt * 14); L.y = L.y == null ? y : L.y + (y - L.y) * Math.min(1, dt * 14);
    s.baseScale = KZ; s.group.position.set(L.x * KZ, L.y * KZ, Z + (L.z || 0)); s.update(dt);
  }
  // keep two character scraps from overlapping: the older one is nudged up
  const sc = live.filter((L) => !L.fall && L.scrap.kind === 'scrap');
  for (let i = 0; i < sc.length; i++) for (let j = i + 1; j < sc.length; j++) {
    const A = sc[i], B = sc[j]; if (A.x == null || B.x == null) continue; const ox = (A.scrap.w + B.scrap.w) / 2 - Math.abs(A.x - B.x), oy = (A.scrap.h + B.scrap.h) / 2 - Math.abs(A.y - B.y);
    if (ox > 0 && oy > 0) { A.lift = Math.min(6, (A.lift || 0) + oy * dt * 6); } else if (A.lift) A.lift = Math.max(0, A.lift - dt * 2);
  }
}
function drop(L) { if (!L || L.fall || L.dead) return; L.fall = { vy: 1.2, vx: (Math.random() - 0.5) * 2.4, spin: (Math.random() - 0.5) * 3, t: 0 }; audio.play('paper_rustle', { vol: 0.22 }); }
function kill(L) { if (L.dead) return; L.dead = true; lines.delete(L); ui?.remove(L.scrap.group); L.scrap.dispose(); }

// ---------------------------------------------------------------- click-to-advance (outside cinematics)
let adv = null;
function ensureAdvance() {
  const G = window.__game; if (adv || !G?.input) return;
  adv = G.input.push({ click: () => { const cur = [...lines].filter((L) => L.advance && !L.fall && !L.finished); if (!cur.length) return false; for (const L of cur) L.skip(); return true; } });
}

// ---------------------------------------------------------------- say / narrate
/** a character speaks: voiced, inked onto a scrap beside them. */
export function say(speaker, text, opts = {}) {
  const { anchor = null, wait = true, side = null, paper = spk(speaker).paper || 'parch', maxW, advance = !window.__cine, name } = opts;
  if (!ensureMgr()) return Promise.resolve();
  if (name) registerSpeaker(speaker, { name });
  const a0 = anchorUI(anchor, V()); const E = eng(); const tail = side || (a0 && a0.x > E.uiW * 0.25 ? 'right' : 'left');
  for (const L of lines) if (L.speaker === speaker && !L.fall) L.finishNow(); // one scrap per speaker
  const scrap = new Scrap(text, { speaker, kind: 'scrap', paper, maxW: maxW || (paper === 'vellum' ? 10 : 8.6), tail }); ui.add(scrap.group);
  return run(speaker, text, scrap, { ...opts, anchor, wait, advance, side: tail });
}
/** the narrator: a chronicle strip along the bottom (on the letterbox beam in cinematics), deep storyteller voice. */
export function narrate(text, opts = {}) {
  if (!ensureMgr()) return Promise.resolve();
  for (const L of lines) if (L.scrap.kind === 'strip' && !L.fall) L.finishNow(true);
  const E = eng(); const scrap = new Scrap(text, { speaker: 'narrator', kind: 'strip', maxW: Math.min(19, E.uiW * 1.75), showName: false }); ui.add(scrap.group);
  return run('narrator', text, scrap, { advance: !window.__cine, ...opts, z: 6 });
}
function run(speaker, text, scrap, { anchor = null, wait = true, hold = null, advance = false, side = null, z = 0, voice = true } = {}) {
  ensureAdvance();
  let res; const p = new Promise((r) => (res = r)); const L = { speaker, scrap, anchor, side, z, advance, finished: false }; L.spoken = new Promise((r) => (L._spoken = r));
  scrap.group.visible = true; scrap.kick(0.6); lines.add(L);
  audio.play(speaker === 'narrator' ? 'page_turn' : 'paper_rustle', { vol: speaker === 'narrator' ? 0.32 : 0.28 });
  const holdT = hold ?? (0.55 + Math.min(1.6, text.length * 0.012));
  let timer = null;
  const end = (fast) => { if (L.finished) return; L.finished = true; L._spoken(L); scrap.reveal(scrap.total); clearTimeout(timer); timer = setTimeout(() => { drop(L); res(L); }, fast ? 120 : holdT * 1000); };
  L.finishNow = (silent) => { if (L.h && !L.h.ended) L.h.cancel(); end(true); if (silent) { clearTimeout(timer); drop(L); res(L); } };
  L.skip = () => { if (L.h && !L.h.ended) { L.h.cancel(); end(true); } else { clearTimeout(timer); drop(L); res(L); } };
  L.h = voice ? speak(speaker, text, { onEnd: () => end(false) }) : null; if (!L.h) setTimeout(() => end(false), estimate(text, speaker) * 1000);
  if (L.h?.sp && profileOf(speaker).mute) L.voiceless = true;
  const out = wait ? p : Promise.resolve(L); out.line = L; out.done = p; return out;
}
/** drop every line and silence every voice (scene changes, skipped cinematics) */
export function stopAll() { for (const L of [...lines]) { if (L.h && !L.h.ended) L.h.cancel(); if (!L.finished) { L.finished = true; L._spoken?.(L); } drop(L); } cancelAll(); }
/** voice only, no scrap (for text that is already shown elsewhere, e.g. a chapter card) */
export function voiceOnly(speaker, text) { return speak(speaker, text); }
export const busy = () => [...lines].some((L) => !L.finished);

// ---------------------------------------------------------------- choice: carved plaques, one per answer
/** options: strings or { label, sub }; resolves with the chosen index. Keys 1–9 pick too. window.__story.pick(i) for tests. */
export function choice(options, { prompt = null, speaker = 'newton', y = null } = {}) {
  const E = eng(); const G = window.__game; if (!E || !G) return Promise.resolve(0); ensureMgr();
  const opts = options.map((o) => (typeof o === 'string' ? { label: o } : o));
  return new Promise((resolve) => {
    const group = new THREE.Group(); group.name = 'choice'; ui.add(group); const plaques = []; let picked = false;
    let tag = null; if (prompt) { tag = new Scrap(prompt, { speaker, kind: 'scrap', maxW: 10, tail: null, showName: true }); group.add(tag.group); tag.group.visible = true; }
    const W = E.uiW, H = E.uiH; const rows = opts.length; const gap = 1.75; const top = (y ?? -H * 0.05) + ((rows - 1) * gap) / 2;
    const pick = (i) => {
      if (picked || i < 0 || i >= opts.length) return; picked = true; audio.play('stamp', { vol: 0.6 }); plaques[i]?.squash(1.4);
      plaques.forEach((p, j) => { if (j !== i) p.setDisabled(true); });
      setTimeout(() => { G.input.remove(handler); E.remove(upd); ui.remove(group); for (const p of plaques) { p.faceTex?.dispose?.(); } tag?.dispose(); if (window.__story?.pick === pick) window.__story.pick = null; resolve(i); }, 520);
    };
    opts.forEach((o, i) => {
      const b = new Plaque(o.label, () => pick(i), { w: Math.min(15, W * 1.25), h: 1.45, sub: o.sub || null, color: i % 2 ? 'wood' : 'purple' }); b.pop.value = 0.02; b.pop.vel = 0;
      b.group.position.set(W * 0.42 * KZ, (top - i * gap) * KZ, Z); b.group.scale.setScalar(KZ); group.add(b.group); plaques.push(b);
      setTimeout(() => { b.pop.target = 1; b.pop.kick?.(1.5); b.rz.kick((i % 2 ? 1 : -1) * 8); audio.play('card_place', { vol: 0.45 }); }, 140 + i * 130);
    });
    if (tag) tag.group.position.set(W * 0.42 * KZ, (top + gap * 0.5 + 0.9 + tag.h / 2) * KZ, Z), tag.group.scale.setScalar(KZ);
    const ray = new THREE.Raycaster(); const hit = () => { ray.setFromCamera(G.input.ndc, E.ui.camera); const h = ray.intersectObjects(plaques.flatMap((p) => [p.hit, p.hitFace]), true)[0]; return h ? plaques.indexOf(h.object.userData.button) : -1; };
    const handler = G.input.push({ modal: true, move: () => { const k = hit(); plaques.forEach((p, j) => { const on = j === k && !p.disabled; if (on && !p.hover) audio.play('ui_hover', { vol: 0.4 }); p.hover = on; }); return true; },
      click: () => { const k = hit(); if (k >= 0) plaques[k].press(); return true; }, key: (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= opts.length) plaques[n - 1].press(); return true; }, down: () => true, dragstart: () => true, drag: () => true, dragend: () => true, wheel: () => true });
    const _ptr = V();
    const upd = { update: (dt) => { const cam = E.ui.camera; const v = V(G.input.ndc.x, G.input.ndc.y, 0.5).unproject(cam).sub(cam.position).normalize(); _ptr.copy(cam.position).addScaledVector(v, (Z - cam.position.z) / v.z); for (const p of plaques) p.update(dt, _ptr); tag?.reveal(1e9); tag?.update(dt); } };
    E.add(upd); (window.__story ||= {}).pick = pick;
  });
}
window.__story = Object.assign(window.__story || {}, { say, narrate, choice, stopAll });
