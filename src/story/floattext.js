// FLOATING 3D TEXT for the prologue (no paper): every line is crisp pixel lettering that floats in the air beside its
// speaker (the narrator's lines hang low in the frame), made like cut-out letters: a 2-texel extruded side, an ink
// outline, a lit face with a highlight band on top and a shade band below. Letters rise into place as they are SPOKEN
// (Web Speech word boundaries, or the reading clock), the line breathes a texel up and down, then fades out. Always HIGH RESOLUTION: the font is drawn at native size and every font pixel covers
// an integer number of device pixels (about 2 at 1080p), snapped to the pixel grid. Fonts: Alagard 16 for names,
// PixelSans 11 for speech, RuneMono for the god.
// API: fsay(speaker, text, { anchor, wait, hold }) / fnarrate(text, o) -> Promise; fchoice(options, { prompt }) -> Promise<index>;
//      fadvance() (click / Space: finish the line or drop it); fstop(); registerVoice(id, profile, { name, color, style })
import * as THREE from 'three';
import { FONT, measure, wrapText, drawPixelText } from '../ui3d/craft.js';
import { speak, cancelAll, PROFILES, estimate } from './voice.js';
import { audio } from '../core/audio.js';
import { ensureFonts } from './dialogue.js';

const STY = {
  ivory: { face: '#f2e8d2', hi: '#fffbee', lo: '#c4b090', side: '#3a2414', ink: '#0e0806' },
  gold: { face: '#f0c45a', hi: '#fff2b0', lo: '#b07a26', side: '#3e200c', ink: '#120804' },
  pale: { face: '#e8eef8', hi: '#ffffff', lo: '#a8b4cc', side: '#1c2236', ink: '#06080e' },
  ember: { face: '#ffb070', hi: '#ffe0b8', lo: '#c0602a', side: '#3a120a', ink: '#100604' },
};
const WHO = {
  narrator: { name: null, style: 'gold', font: 'body' },
  isaac_kid: { name: 'Young Isaac', color: '#f0b060', style: 'ivory' },
  teacher: { name: 'Old Teacher', color: '#9ab4f0', style: 'ivory' }, master: { name: 'Old Teacher', color: '#9ab4f0', style: 'ivory' },
  god: { name: 'The White One', color: '#ffffff', style: 'pale', font: 'body' }, newton: { name: 'Isaac', color: '#f0b060', style: 'ivory' },
  raccoon: { name: 'Raccoon', color: '#c0b098', style: 'ivory' }, dog: { name: 'Halley', color: '#d8b070', style: 'ivory' },
};
export function registerVoice(id, profile, o = {}) { if (profile) PROFILES[id] = profile; WHO[id] = { ...(WHO[id] || {}), ...o }; }
registerVoice('teacher', { g: 'm', lang: 'en-GB', pitch: 0.5, rate: 0.76, prefer: [/Grandpa/, /Arthur/, /George/, /Ralph/, /Daniel/, /UK English Male/] }); // old, frail, slow
registerVoice('god', { g: 'm', lang: 'en-US', pitch: 0.26, rate: 0.68, prefer: [/Bruce/, /Ralph/, /Fred/, /Grandpa/, /Daniel/], echo: true });
const who = (id) => WHO[id] || { name: String(id).replace(/^\w/, (c) => c.toUpperCase()), color: '#e0d0b0', style: 'ivory' };

const Z = 6, KZ = (40 - Z) / 40; const eng = () => window.__game?.engine;
const lines = new Set(); let mgr = null, ui = null;
function ensureMgr() { const E = eng(); if (!E) return null; if (mgr && mgr.E === E) return mgr; ui = new THREE.Group(); ui.name = 'floattext'; ui.renderOrder = 20; E.ui.scene.add(ui); mgr = { E, update: (dt, t) => step(dt, t) }; E.add(mgr); return mgr; }
/** device pixels per font pixel: about 2 at 1080p, never fractional */
function texelK(E) { const b = E.renderer.getDrawingBufferSize(new THREE.Vector2()); return Math.max(1, Math.round(b.y / 540)); }
function uiPerPx(E) { const b = E.renderer.getDrawingBufferSize(new THREE.Vector2()); return (2 * E.uiH * KZ) / b.y; }

// ---------------------------------------------------------------- one floating block of text
class Block {
  constructor(text, { name = null, nameColor = '#ffffff', style = 'ivory', font = 'body', maxW = 230, center = false, sz = 1 } = {}) {
    const F = FONT[font] || FONT.body, NF = FONT.head; this.F = F; this.S = STY[style] || STY.ivory; this.center = center; this.sz = sz;
    this.lines = wrapText(String(text), F, maxW); this.name = name; this.nameColor = nameColor;
    const pad = 4; const nameH = name ? NF.lineH + 2 : 0; this.nameH = nameH;
    const tw = Math.max(...this.lines.map((l) => measure(l, F)), name ? measure(name, NF) : 0, 8);
    this.W = tw + pad * 2 + 3; this.H = nameH + this.lines.length * (F.lineH + 1) + pad * 2 + 2; this.pad = pad;
    this.total = this.lines.join(' ').length; this.shown = -1; this.age = new Float32Array(this.total + 8).fill(-1);
    // the glyph x offsets of every character (prefix widths), per line
    this.pos = []; let gi = 0; this.lines.forEach((l, li) => { const x0 = center ? Math.round((this.W - measure(l, F)) / 2) : pad; for (let c = 0; c < l.length; c++) this.pos.push({ ch: l[c], x: x0 + measure(l.slice(0, c), F), li, gi: gi++ }); gi++; });
    this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H; this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false;
    this.U = { uFade: {} };
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }); // full-resolution fade (no dither screen pattern)
    Object.defineProperty(this.U.uFade, 'value', { get: () => mat.opacity, set: (v) => { mat.opacity = v; } });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); this.mesh.renderOrder = 30; this.mesh.frustumCulled = false; this.dirty = true; this.t = 0;
  }
  /** reveal n characters (as spoken); new letters rise 2 texels into place */
  reveal(n, dt) {
    n = Math.max(0, Math.min(this.total, Math.floor(n))); this.t += dt;
    for (let i = 0; i < n; i++) if (this.age[i] < 0) this.age[i] = 0; else this.age[i] += dt;
    const settling = this.pos.some((p) => this.age[p.gi] >= 0 && this.age[p.gi] < 0.2);
    if (n === this.shown && !settling && !this.dirty) return; this.shown = n; this.dirty = false;
    const g = this.g, F = this.F, S = this.S; g.clearRect(0, 0, this.W, this.H);
    if (this.name) { const NF = FONT.head; const y = this.pad + NF.base; for (const d of [2, 1]) drawPixelText(g, this.name, this.pad + d, y + d, NF, { color: S.side, outline: S.side }); drawPixelText(g, this.name, this.pad, y, NF, { color: this.nameColor, outline: S.ink }); }
    const by = (li) => this.pad + this.nameH + li * (F.lineH + 1) + F.base + 1;
    const vis = this.pos.filter((p) => this.age[p.gi] >= 0 && p.ch !== ' ');
    const lift = (p) => Math.round(Math.max(0, 1 - this.age[p.gi] / 0.18) * 2);
    // three passes (extruded side, outline + face, bands) so neighbouring letters never overdraw each other's ink
    for (const p of vis) for (const d of [2, 1]) drawPixelText(g, p.ch, p.x + d, by(p.li) + d + lift(p), F, { color: S.side, outline: S.side });
    for (const p of vis) drawPixelText(g, p.ch, p.x, by(p.li) + lift(p), F, { color: S.face, outline: S.ink });
    for (const p of vis) { const y = by(p.li) + lift(p), top = y - F.cap; g.save(); g.beginPath(); g.rect(0, top - 1, this.W, Math.max(1, Math.round(F.cap * 0.3))); g.clip(); drawPixelText(g, p.ch, p.x, y, F, { color: S.hi }); g.restore(); g.save(); g.beginPath(); g.rect(0, top + Math.round(F.cap * 0.72), this.W, F.cap); g.clip(); drawPixelText(g, p.ch, p.x, y, F, { color: S.lo }); g.restore(); }
    this.tex.needsUpdate = true;
  }
  /** size and place the plane so its texels land on whole device pixels; (x, y) = UI coords of the block centre */
  place(E, x, y) {
    const k = texelK(E) * this.sz; const u = uiPerPx(E); const w = this.W * k * u, h = this.H * k * u; this.mesh.scale.set(w, h, 1);
    const sx = Math.round((x - w / 2) / u) * u + w / 2, sy = Math.round((y - h / 2) / u) * u + h / 2; this.mesh.position.set(sx * KZ, sy * KZ, Z); this.w = w; this.h = h;
  }
  dispose() { this.tex.dispose(); this.mesh.material.dispose(); this.mesh.geometry.dispose(); }
}

// ---------------------------------------------------------------- the line manager
const _w = new THREE.Vector3(), _p = new THREE.Vector3();
function anchorUI(a, out) {
  const E = eng(); if (!a) return null; let w = null;
  if (a.ui) return out.set(a.ui[0], a.ui[1], 0);
  if (typeof a === 'function') w = a(_w); else if (a.isVector3) w = _w.copy(a); else if (a.headWorld) w = a.headWorld(_w).add(_p.set(0, 0.28, 0)); else if (a.isObject3D) { a.updateMatrixWorld(true); w = a.getWorldPosition(_w); }
  if (!w) return null; _p.copy(w).project(E.world.camera); if (_p.z > 1) return null; return out.set(_p.x * E.uiW, _p.y * E.uiH, 0);
}
function step(dt, t) {
  const E = eng(); if (!E) return; const W = E.uiW, H = E.uiH; const band = window.__storyBand ? H * 0.165 : 0;
  for (const L of [...lines]) {
    const b = L.block; if (b.w == null) b.place(E, 0, 0); if (L.h) L.n = Math.max(L.n, L.h.progress() * b.total); else L.n += dt * 16; b.reveal(L.n, dt);
    let x, y;
    if (L.kind === 'narr') { x = 0; y = -H + band + b.h / 2 + 0.55; }
    else if (L.kind === 'choice') { x = L.x; y = L.y; }
    else {
      const a = anchorUI(L.anchor, _p) || _p.set(L.side === 'right' ? W * 0.55 : -W * 0.55, H * 0.25, 0);
      x = a.x + (L.side === 'right' ? -b.w * 0.15 : b.w * 0.15); y = a.y + b.h / 2 + 0.25;
      x = Math.max(-W + b.w / 2 + 0.35, Math.min(W - b.w / 2 - 0.35, x)); y = Math.max(-H + band + b.h / 2 + 0.4, Math.min(H - band - b.h / 2 - 0.3, y));
    }
    L.x0 = L.x0 == null ? x : L.x0 + (x - L.x0) * Math.min(1, dt * 10); L.y0 = L.y0 == null ? y : L.y0 + (y - L.y0) * Math.min(1, dt * 10);
    const bob = Math.round(Math.sin((t || 0) * 1.7 + L.ph) * 1.2) * texelK(E) * uiPerPx(E) * b.sz + (L.lift || 0);
    b.place(E, L.x0, L.y0 + bob);
    L.fade += ((L.out ? 0 : 1) - L.fade) * Math.min(1, dt * (L.out ? 7 : 9)); b.U.uFade.value = L.fade;
    if (L.out && L.fade < 0.03) { if (L.persist) { b.mesh.visible = false; continue; } lines.delete(L); ui.remove(b.mesh); b.dispose(); L.res?.(); continue; }
    b.mesh.visible = true;
  }
  // keep character lines from overlapping (the older one moves up)
  const sc = [...lines].filter((L) => L.kind === 'say' && !L.out);
  for (let i = 0; i < sc.length; i++) for (let j = i + 1; j < sc.length; j++) { const A = sc[i], B = sc[j]; const ox = (A.block.w + B.block.w) / 2 - Math.abs(A.x0 - B.x0), oy = (A.block.h + B.block.h) / 2 - Math.abs(A.y0 - B.y0); if (ox > 0 && oy > 0) A.lift = Math.min(4, (A.lift || 0) + oy * dt * 6); }
}
function run(speaker, text, block, { anchor = null, wait = true, hold = null, kind = 'say', voice = true, side = null } = {}) {
  ensureMgr(); let res; const p = new Promise((r) => (res = r));
  const L = { speaker, block, anchor, kind, n: 0, fade: 0, out: false, ph: Math.random() * 6, side, finished: false }; lines.add(L); ui.add(block.mesh);
  audio.play(kind === 'narr' ? 'page_turn' : 'whoosh_soft', { vol: kind === 'narr' ? 0.18 : 0.12, rate: 1.4 });
  const holdT = hold ?? (0.6 + Math.min(1.8, text.length * 0.013)); let timer = null;
  const end = (fast) => { if (L.finished) return; L.finished = true; L.n = block.total; clearTimeout(timer); timer = setTimeout(() => { L.out = true; L.res = null; res(L); }, fast ? 140 : holdT * 1000 / Math.max(1, Math.min(2, window.__storyFast || 1))); };
  L.skip = () => { if (!L.finished) { L.h?.cancel(); end(true); } else { clearTimeout(timer); L.out = true; res(L); } };
  L.h = voice ? speak(speaker === 'master' ? 'teacher' : speaker, text, { onEnd: () => end(false) }) : null; if (!L.h) setTimeout(() => end(false), estimate(text, speaker) * 1000);
  const out = wait ? p : Promise.resolve(L); out.line = L; out.done = p; return out;
}
/** a character speaks: voiced, floating crisp text above their head (anchor: actor api / Object3D / Vector3 / () => Vector3 / {ui:[x,y]}) */
export function fsay(speaker, text, opts = {}) {
  if (opts.show === false) return voiceLine(speaker, text, opts);
  if (!ensureMgr()) return Promise.resolve(); const w = who(speaker);
  for (const L of lines) if (L.speaker === speaker && L.kind === 'say') { if (!L.out) L.skip(); L.fade = 0; } // one line per speaker: the old one goes at once
  const E = eng(); const a0 = anchorUI(opts.anchor, new THREE.Vector3()); const side = opts.side || (a0 && a0.x > E.uiW * 0.2 ? 'right' : 'left');
  const b = new Block(text, { name: opts.name ?? w.name, nameColor: w.color, style: opts.style || w.style, font: opts.font || w.font || 'body', maxW: opts.maxW || 210 }); // (story agent: per-line font / style, e.g. Alagard 'head')
  return run(speaker, text, b, { ...opts, side });
}
/** voice only, no text (the visuals carry the scene); resolves when spoken plus a beat */
function voiceLine(speaker, text, { hold = 0.35, wait = true } = {}) {
  const p = new Promise((res) => { const h = speak(speaker === 'master' ? 'teacher' : speaker, text, { onEnd: () => setTimeout(res, hold * 1000) }); voiceLines.add(h); h.done.then(() => voiceLines.delete(h)); });
  return wait ? p : Promise.resolve();
}
const voiceLines = new Set();
/** the narrator: gold floating lines low in the frame, centred, a size up */
export function fnarrate(text, opts = {}) {
  if (opts.show === false) return voiceLine('narrator', text, opts);
  if (!ensureMgr()) return Promise.resolve();
  for (const L of lines) if (L.kind === 'narr') { if (!L.out) L.skip(); L.fade = 0; }
  const b = new Block(text, { style: opts.style || 'gold', font: opts.font || 'body', maxW: opts.maxW || 300, center: true, sz: opts.sz || 1 });
  return run('narrator', text, b, { ...opts, kind: 'narr' });
}
/** finish the current lines (reveal all) or drop finished ones */
export function fadvance() { let any = false; for (const h of [...voiceLines]) { h.cancel(); any = true; } for (const L of [...lines]) if (!L.out && L.kind !== 'choice') { L.skip(); any = true; } return any; }
export function fstop() { for (const L of [...lines]) { L.h?.cancel(); if (!L.finished) { L.finished = true; } L.out = true; } cancelAll(); }
export const fbusy = () => [...lines].some((L) => !L.finished && L.kind !== 'choice');

/** floating answers: each option is crisp 3D lettering that lifts, turns gold and chimes on hover; click / keys 1-9 pick */
export function fchoice(options, { prompt = null, x = null, y = null } = {}) {
  const E = eng(); const G = window.__game; if (!E || !G) return Promise.resolve(0); ensureMgr();
  const opts = options.map((o) => (typeof o === 'string' ? { label: o } : o));
  return new Promise((resolve) => {
    const W = E.uiW, H = E.uiH; const gap = 1.35; const x0 = x ?? W * 0.38; const top = (y ?? H * 0.12) + ((opts.length - 1) * gap) / 2; const items = [];
    const mk = (text, style, i, yy, sz = 1) => { const b = new Block(text, { style, font: 'body', maxW: 260, center: true, sz }); const L = { block: b, kind: 'choice', n: 1e9, fade: 0, out: false, ph: i * 1.3, x: x0, y: yy, finished: true }; lines.add(L); ui.add(b.mesh); return L; };
    let promptL = prompt ? mk(prompt, 'pale', -1, top + gap * 0.95) : null;
    opts.forEach((o, i) => { const L = mk(`${i + 1}. ${o.label}`, 'ivory', i, top - i * gap); L.gold = mk(`${i + 1}. ${o.label}`, 'gold', i, top - i * gap); L.base = top - i * gap; L.i = i; items.push(L); setTimeout(() => audio.play('card_place', { vol: 0.35, rate: 1.3 }), 90 * i); });
    let hot = -1, picked = false;
    const hit = () => { const p = E.ndcToUI(G.input.ndc); for (const L of items) { const b = L.block; if (Math.abs(p.x - L.x0) < b.w / 2 + 0.2 && Math.abs(p.y - L.y0) < b.h / 2 + 0.12) return L.i; } return -1; };
    const upd = { update: (dt, t) => { for (const L of items) { const on = L.i === hot && !picked; L.y = L.base + (on ? 0.22 : 0) + Math.sin(t * 2.1 + L.i) * 0.04; L.gold.y = L.y; L.gold.x = L.x; L.gold.out = !on; L.out = on || (picked && L.i !== hot); if (on && L.gold.fade < 0.02) { L.gold.out = false; } } } };
    // re-add gold twins when they fade out (they are re-used, not deleted)
    for (const L of items) { L.persist = true; L.gold.persist = true; }
    E.add(upd);
    const finish = (i) => { if (picked) return; picked = true; hot = i; audio.play('stamp', { vol: 0.55 }); audio.play('magic_shimmer', { vol: 0.35 }); setTimeout(() => { G.input.remove(handler); E.remove(upd); for (const L of [...items, ...items.map((x) => x.gold), promptL].filter(Boolean)) { L.out = true; L.persist = false; } if (window.__story?.pick === finish) window.__story.pick = null; resolve(i); }, 650); };
    const handler = G.input.push({ modal: true, move: () => { const k = hit(); if (k !== hot && k >= 0) audio.play('ui_hover', { vol: 0.45 }); hot = k; return true; }, click: () => { const k = hit(); if (k >= 0) finish(k); return true; }, key: (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= opts.length) finish(n - 1); return true; }, down: () => true, dragstart: () => true, drag: () => true, dragend: () => true, wheel: () => true });
    (window.__story ||= {}).pick = finish;
  });
}
ensureFonts();

/** a small persistent floating caption (hints like "Esc · skip", "pick up the golden apple"): { set(text?), show(on), at(x, y | anchor), remove() } */
export function fcaption(text, { x = 0, y = 0, anchor = null, style = 'pale', sz = 1 } = {}) {
  if (!ensureMgr()) return { show() {}, at() {}, remove() {} };
  const b = new Block(text, { style, font: 'body', maxW: 260, center: true, sz }); const L = { block: b, kind: 'choice', n: 1e9, fade: 0, out: false, ph: Math.random() * 6, x, y, finished: true, persist: true };
  lines.add(L); ui.add(b.mesh);
  const upd = { update: () => { if (L.anchor) { const a = anchorUI(L.anchor, new THREE.Vector3()); if (a) { L.x = a.x; L.y = a.y + 0.6; } } } }; eng().add(upd); L.anchor = anchor;
  return { L, show(on = true) { L.out = !on; }, at(nx, ny) { if (typeof nx === 'object') L.anchor = nx; else { L.anchor = null; L.x = nx; L.y = ny; } }, remove() { L.persist = false; L.out = true; eng()?.remove(upd); } };
}
