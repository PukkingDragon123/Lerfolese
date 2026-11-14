// Physical UI objects built from craft.js: carved / brass / lacquer plaques (buttons), parchment notes, scrolls,
// speech scraps, hanging signboards (titles), cloth pennants (banners), paper slips (toasts).
import * as THREE from 'three';
import { PX, PXP, RAMP, Surf, SurfTex, pxTex, frontMat, sideMat, plainMat, slab, sheet, mesh, turned, ROLLER, TACK, Body, paperMat, LK, toon, inkHull, vineBorder, dropCap, doodle, goldRule,
  wood, brass, screw, rivet, groove, parchment, leather, waxSeal, cloth, inscribe, inscribeLines, measure, wrapText, FONT } from './craft.js';
import { hash2 } from '../gfx/art/core.js';
import { GR } from '../gfx/art/ramps.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';

const ceil = Math.ceil, round = Math.round;
// ink colours used by the scenes' line specs -> real inks on parchment
const INKS = { '#3a2410': '#2a1408', '#2a160c': '#2a1a14', '#8a6a44': '#7a5638', '#5a3622': '#4e2e1a', '#8f2a2e': '#8a1a1c', '#c8443a': '#9e2218', '#2d6e6a': '#1e5a5a', '#5f8a3a': '#3e6a22', '#6b4c9a': '#4e2e7e', '#7a4a14': '#6a3a0e', '#5a1a22': '#6a1420' };
export const ink = (c) => INKS[c] || (c && lumOf(c) < 0.45 ? c : '#2a1a14');
function lumOf(c) { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return 0; const n = parseInt(m[1], 16); return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255; }
const segs = (l) => (typeof l === 'string' ? [[l, null]] : l);
const lineText = (l) => segs(l).map(([t]) => t).join('');
const titleCase = (t) => (t === t.toUpperCase() && /[A-Z]{3}/.test(t) ? t.toLowerCase().replace(/(^|[\s(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Of|The|In|A|An|And|To|On|At|For)\b/g, (w, _x, i) => (i ? w.toLowerCase() : w)) : t);

// ================================================================ PLAQUE (Button3D)
const PLQ = {
  wood: { back: 'walnut', face: 'oak', shape: 'rect', text: 'carve' },
  teal: { back: 'walnut', face: 'verd', shape: 'notch', text: 'enamel' },
  purple: { back: 'walnut', face: 'amethyst', shape: 'rect', text: 'gild' },
  red: { back: 'night', face: 'lacquer', shape: 'notch', text: 'gild' },
};
const backTexCache = new Map();
function backBoard(kind, w, h, seed) {
  const key = `${kind}|${w}|${h}`; if (backTexCache.has(key)) return backTexCache.get(key);
  const S = new Surf(w, h);
  if (kind === 'night') { S.rect(0, 0, w, h, RAMP.night, (x, y) => 2 + (hash2(x >> 1, y, 5) > 0.93 ? 1 : 0)); for (let i = 0; i < w; i += 7) S.line(i, 0, i + 3, h - 1, (x, y) => { if (hash2(x, y, 2) > 0.7) S.shift(x, y, -1); }); }
  else wood(S, 0, 0, w, h, RAMP.walnut, { seed, base: 2, knots: 1 });
  S.bevel(null, { lit: 2, dark: -2 }); S.bevel((x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1, { lit: 1, dark: -1 });
  for (const x of [2, w - 5]) { rivet(S, x, round(h / 2) - 1); }
  const t = pxTex(S.toCanvas()); backTexCache.set(key, t); return t;
}
function paintFace(S, kind, w, h, seed) {
  const all = () => true;
  if (kind === 'oak') { wood(S, 0, 0, w, h, RAMP.oak, { seed, base: 3, knots: 1, quiet: true }); S.bevel(null, { lit: 2, dark: -2 }); groove(S, 0, 0, w, h, 2, { cut: 2, deep: 1, lip: 5 }); }
  else if (kind === 'verd') { brass(S, 0, 0, w, h, { seed, patina: 0.45 }); S.bevel(null, { lit: 2, dark: -2 }); groove(S, 0, 0, w, h, 2, { cut: 2, deep: 1, lip: 5 }); screw(S, 3, round(h / 2) - 2, RAMP.brass, 0); screw(S, w - 7, round(h / 2) - 2, RAMP.brass, 1); }
  else if (kind === 'amethyst') {
    wood(S, 0, 0, w, h, RAMP.walnut, { seed: seed + 3, base: 2, knots: 0, quiet: true }); S.bevel(null, { lit: 2, dark: -2 });
    for (let x = 2; x < w - 2; x++) for (const y of [2, h - 3]) S.set(x, y, RAMP.amethyst, (x + (y > 3 ? 1 : 0)) % 5 === 0 ? 4 : y === 2 ? 3 : 2);
    for (let y = 2; y < h - 2; y++) for (const x of [2, w - 3]) S.set(x, y, RAMP.amethyst, y % 5 === 0 ? 4 : 2);
    for (const cx of [6, w - 7]) gem(S, cx, round(h / 2), RAMP.amethyst);
  } else if (kind === 'lacquer') {
    S.fill(all, RAMP.lacquer, (x, y) => 3 + ((x * 0.5 + y) > h * 0.9 && (x * 0.5 + y) < h * 1.25 ? 1 : 0) - (hash2(x >> 2, y >> 1, seed) > 0.94 ? 1 : 0)); S.bevel(null, { lit: 2, dark: -2 });
    for (let x = 3; x < w - 3; x++) { S.set(x, 2, RAMP.gold, x % 4 ? 4 : 3); S.set(x, h - 3, RAMP.gold, x % 4 ? 2 : 3); }
  }
}
function gem(S, cx, cy, R) { const g = ['..#..', '.###.', '#####', '.###.', '..#..']; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (g[j][i] === '#') { const lit = i + j <= 3, dk = i + j >= 6; S.set(cx - 2 + i, cy - 2 + j, R, lit ? 4 : dk ? 1 : 3); } S.set(cx - 1, cy - 1, R, 5); S.set(cx, cy + 2, RAMP.gold, 2); S.set(cx + 2, cy, RAMP.gold, 2); }
const LABEL_FONTS = ['head', 'print', 'tiny']; // Alagard 16, then PixelSans, then MicroPixel for very long labels
export class Plaque extends Body {
  constructor(label, onClick, { w = 5, h = 1.3, color = 'wood', sub = null, disabled = false, size } = {}) {
    super(); this.onClick = onClick; this.disabled = false; this.label = label; this.sub = sub; this.kind = PLQ[color] || PLQ.wood; this.seed = (hash2(label.length, (label.charCodeAt(0) || 1), 3) * 97) | 0;
    this.tiltK = 0.06; this.hoverLift = 0.3;
    const m = 0.13; let fw = w - 2 * m; let fh = h - 2 * m;
    // fit the label (and sub) inside the face; grow the plaque (up to 45% wider / taller) before stepping down a font
    const need0 = measure(label, 'head') + 16; if (need0 > fw * PX && need0 <= fw * PX * 1.45) { fw = need0 / PX; w = fw + 2 * m; }
    const W = round(fw * PX); let font = LABEL_FONTS.find((f) => measure(label, f) <= W - 14) || 'tiny'; this.font = font;
    // wide plaques carry the sub-line beside the label; narrow ones stack it (up to two lines) under the label
    this.inline = !!sub && measure(label, font) + measure(sub, 'tiny') + 30 <= W;
    let subLines = sub && !this.inline ? wrapText(sub, 'tiny', W - 12) : []; if (subLines.length > 2) subLines = subLines.slice(0, 2);
    const need = (subLines.length ? FONT[font].lineH - 2 : FONT[font].lineH) + subLines.length * 7 + 6; if (need > fh * PX) { fh = need / PX; h = fh + 2 * m; }
    this.w = w; this.h = h; this.fw = fw; this.fh = fh; this.subLines = subLines;
    const bw = round(w * PX), bh = round(h * PX);
    this.back = mesh(slab(w, h, 0.22, { shape: 'rect', cut: 0.16, bevel: 0.07 }), [frontMat(backBoard(this.kind.back, bw, bh, this.seed)), sideMat(this.kind.back === 'night' ? 'lacquer' : 'walnut')], this.pivot, { ink: 0.045 });
    this.faceTex = new SurfTex(round(fw * PX), round(fh * PX)); this.paint();
    const metal = this.kind.face === 'verd' ? 0.35 : this.kind.face === 'lacquer' ? 0.1 : 0;
    this.face = mesh(slab(fw, fh, 0.14, { shape: this.kind.shape, cut: 0.1, bevel: 0.05 }), [frontMat(this.faceTex.tex, { metal }), sideMat(this.kind.face === 'verd' ? 'brass' : this.kind.face === 'lacquer' ? 'lacquer' : this.kind.face === 'oak' ? 'oak' : 'walnut')], this.pivot, { ink: 0.03 });
    this.face.position.z = 0.13; this.back.userData.button = this; this.face.userData.button = this; this.hit = this.back; this.hitFace = this.face;
    this.setDisabled(disabled);
  }
  paint() {
    const F = this.faceTex; const k = this.kind; const W = F.w, H = F.h;
    F.paint((S) => {
      paintFace(S, k.face, W, H, this.seed);
      const fill = k.text === 'enamel' ? RAMP.night : null; const subStyle = k.text === 'gild' ? 'gild' : k.text === 'carve' ? 'carve' : 'engrave';
      if (this.inline) {
        const LH = FONT[this.font].lineH; const y0 = round((H - LH) / 2) + 1;
        inscribeLines(S, [this.label], { x: 9, y: y0, w: W - 18, h: LH }, this.font, k.text, { fill, seed: this.seed, align: 'left' });
        inscribeLines(S, [this.sub], { x: 9, y: round((H - 8) / 2) + 1, w: W - 18, h: 8 }, 'tiny', subStyle, { fill, seed: this.seed + 5, align: 'right' });
      } else {
        const LH = this.subLines.length ? FONT[this.font].lineH - 2 : FONT[this.font].lineH; const total = LH + this.subLines.length * 7;
        const y0 = round((H - total) / 2) + (this.subLines.length ? 0 : 1);
        inscribeLines(S, [this.label], { x: 6, y: y0, w: W - 12, h: LH }, this.font, k.text, { fill, seed: this.seed });
        if (this.subLines.length) inscribeLines(S, this.subLines, { x: 6, y: y0 + LH, w: W - 12, h: this.subLines.length * 7 }, 'tiny', subStyle, { lineH: 7, fill, seed: this.seed + 5 });
      }
    });
  }
  setLabel(label, sub = this.sub) { if (label === this.label && sub === this.sub) return; this.label = label; this.sub = sub; this.inline = false; this.subLines = sub ? wrapText(sub, 'tiny', this.faceTex.w - 12).slice(0, 2) : []; this.font = LABEL_FONTS.find((f) => measure(label, f) <= this.faceTex.w - 14) || 'caps'; this.paint(); this.kick(0.6); }
  setDisabled(d) {
    d = !!d; if (d === this.disabled && this._dInit) return; this._dInit = true; this.disabled = d;
    const c = d ? 0.5 : 1; this.face.material[0].color.setScalar(c * LK); this.back.material[0].color.setScalar((d ? 0.6 : 1) * LK); this.restRz = d ? (this.seed % 2 ? 1 : -1) * 0.9 : 0;
  }
  update(dt, p) { this.updateBody(dt, this.disabled ? null : p); }
  press() { if (this.disabled) { audio.play('ui_error'); this.rz.kick(5); return; } this.squash(1); audio.play('ui_click'); this.onClick?.(); }
}

// ================================================================ PAPER (notes, tooltips, speech scraps, letters)
// A sheet of parchment with handwriting; size fits its text. Tacked with a brass pin, or torn with a tail.
const tackGeo = TACK();
export class Paper extends Body {
  constructor({ font = 'hand', maxW = 11, minW = 2.4, pad = 10, tail = false, pin = true, tone = 4, kind = 'note', seal = false, title = 'head' } = {}) {
    super(); this.font = font; this.maxW = maxW; this.minW = minW; this.pad = pad; this.tail = tail; this.pinOn = pin; this.tone = tone; this.kind = kind; this.seal = seal; this.titleF = title;
    this.group.visible = false; this.st = new Spring(0, 16, 0.5); this.key = ''; this.baseScale = 1; this.seed = (Math.random() * 999) | 0; this.tiltK = 0.03; this.hoverLift = 0;
    this.sheetMat = paperMat();
    this.sheet = mesh(new THREE.BufferGeometry(), this.sheetMat, this.pivot); this.sheet.castShadow = true;
    this.tex = null; this.canvas = document.createElement('canvas');
    if (pin) { this.pin = mesh(tackGeo, plainMat('brass'), this.pivot); this.pin.rotation.x = Math.PI / 2; }
  }
  // lines: strings or [[text, colour], ...]; first line may be a title (opts.title=true)
  set(lines, { title = false, width = null, maxW = null } = {}) {
    const key = JSON.stringify(lines) + title + width + maxW; if (key === this.key) return; this.key = key;
    const arr = (Array.isArray(lines) ? lines : [lines]).filter((l) => l != null);
    const maxT = round((maxW || this.maxW) * PXP) - this.pad * 2;
    // wrap each logical line, keep colour per segment (wrap whole line by its first colour when it overflows)
    const out = []; const fonts = [];
    arr.forEach((l, i) => {
      const f = title && i === 0 ? this.titleF : this.font; const ss = segs(l);
      if (measure(lineText(l), f) <= maxT) { out.push(ss); fonts.push(f); return; }
      const col = ss.find(([, c]) => c)?.[1] || null; for (const w of wrapText(lineText(l), f, maxT)) { out.push([[w, col]]); fonts.push(f); }
    });
    const tw = Math.max(...out.map((l, i) => measure(lineText(l), fonts[i])), 10);
    const Wt = Math.max(round(this.minW * PXP), width ? round(width * PXP) : tw + this.pad * 2);
    const LH = (i) => FONT[fonts[i]].lineH + (fonts[i] === this.titleF && title ? 3 : 1);
    let th = 0; for (let i = 0; i < out.length; i++) th += LH(i);
    const tailH = this.tail ? 10 : 0; const Ht = th + this.pad * 2 - 2 + tailH + (this.seal ? 6 : 0);
    const S = new Surf(Wt, Ht); const bodyH = Ht - tailH;
    const tailX = this.tail === 'right' ? Wt - 22 : 14;
    const mask = (x, y) => (y < bodyH ? true : this.tail ? (x >= tailX && x < tailX + 12 - (y - bodyH) * 1.2 && x > tailX + (y - bodyH) * 0.2) : false);
    parchment(S, 0, 0, Wt, Ht, { seed: this.seed, torn: this.kind === 'scrap' ? 3 : 2, tone: this.tone, mask, crease: this.kind === 'letter' });
    let y = this.pad - 1;
    for (let i = 0; i < out.length; i++) {
      const f = fonts[i]; const F = FONT[f]; const ss = out[i]; const wsum = ss.reduce((s, [t]) => s + measure(t, f), 0);
      let x = title && i === 0 ? round((Wt - wsum) / 2) : this.kind === 'letter' ? this.pad : round((Wt - wsum) / 2);
      for (const [t, c] of ss) { inscribe(S, t, x, y + F.base, f, 'ink', { color: ink(c), seed: this.seed + i }); x += measure(t, f); }
      if (title && i === 0 && out.length > 1) { const yy = y + F.lineH + 1; for (let xx = round(Wt * 0.2); xx < round(Wt * 0.8); xx++) if (hash2(xx, 1, this.seed) > 0.12) S.pix(xx, yy, '#5a3a24'); }
      y += LH(i);
    }
    if (this.seal) waxSeal(S, Wt - 12, bodyH - 9, 6, { seed: this.seed });
    if (this.pinOn) for (const [dx, dy, d] of [[0, 0, -2], [1, 0, -1], [0, 1, -1], [-1, 0, -1], [0, -1, -1]]) S.shift(round(Wt / 2) + dx, 5 + dy, d);
    S.inkEdge();
    if (this.tex && (this.canvas.width !== Wt * Surf.K(Wt, Ht) || this.canvas.height !== Ht * Surf.K(Wt, Ht))) { this.tex.dispose(); this.tex = null; }
    S.toCanvas(this.canvas); if (!this.tex) { this.tex = pxTex(this.canvas); this.sheetMat.map = this.tex; this.sheetMat.needsUpdate = true; } else this.tex.needsUpdate = true;
    const w = Wt / PXP, h = Ht / PXP; this.w = w; this.h = h; this.bodyH = bodyH / PXP;
    this.sheet.geometry = sheet(w, h, { curl: this.kind === 'scrap' ? 0.18 : 0.1, sag: 0.04, segX: 6, segY: 4 });
    // pivot at the pin (top centre) so it swings from there
    this.sheet.position.set(0, -h / 2 + 0.22, 0); if (this.pin) this.pin.position.set(0, 0, 0.1);
  }
  show(lines, x, y, z = 6, opts = {}) {
    this.set(lines, opts); this.group.position.set(x, y + this.h / 2 - 0.22, z);
    if (!this.group.visible || this.st.target === 0) { this.st.value = 0.15; this.rz.value = (Math.random() - 0.5) * 6; this.rz.vel = (Math.random() - 0.5) * 20; }
    this.st.target = 1; this.restRz = (hash2(this.seed, 1, 1) - 0.5) * 0.9; this.group.visible = true; this.hideAt = null;
  }
  // position by the sheet centre instead of the pin
  place(x, y, z) { this.group.position.set(x, y + this.h / 2 - 0.22, z); }
  hide() { if (!this.group.visible) return; this.st.target = 0; this.hideAt = 0.18; }
  update(dt, p) {
    this.st.update(dt); this.updateBody(dt, p); const s = Math.max(0.001, this.st.value) * this.baseScale; this.group.scale.setScalar(s);
    if (this.hideAt != null) { this.hideAt -= dt; if (this.hideAt <= 0) { this.group.visible = false; this.hideAt = null; } }
  }
  dispose() { this.tex?.dispose(); this.sheetMat.dispose(); }
}

// tooltip-compatible note: show(lines, x, y, z) / hide() / update(dt); the note is clamped on screen
export class NoteTip {
  constructor(engine, opts = {}) { this.engine = engine; this.paper = new Paper({ font: 'handS', title: 'head', maxW: 10, pin: true, ...opts }); this.group = this.paper.group; }
  // (x, y) is where the note should APPEAR on the z=0 UI plane; depth z is compensated so it is never magnified off-screen
  show(lines, x, y, z = 8, opts = {}) {
    const o = { title: lines.length > 1, ...opts }; this.paper.set(lines, o); const W = this.engine.uiW, H = this.engine.uiH; const w = this.paper.w, h = this.paper.h;
    const cx = Math.max(-W + w / 2 + 0.3, Math.min(W - w / 2 - 0.3, x)), cy = Math.max(-H + h / 2 + 0.3, Math.min(H - h / 2 - 0.2, y));
    const k = (40 - z) / 40; this.paper.show(lines, cx, cy, z, o); this.paper.baseScale = k; this.paper.group.position.set(cx * k, (cy + h / 2 - 0.22) * k, z);
  }
  hide() { this.paper.hide(); }
  update(dt, p) { this.paper.update(dt, p); }
  get on() { return this.paper.group.visible && this.paper.st.target > 0; }
}

// ================================================================ SCROLL (event text, story): parchment between two turned rollers
const ROLL_R = 0.15;
export class Scroll extends Body {
  constructor({ w = 15, maxH = 9, title = '#5a1a22' } = {}) {
    super(); this.wU = w; this.maxH = maxH; this.tiltK = 0.015; this.hoverLift = 0; this.seed = 7;
    this.paper = paperMat();
    this.sheet = mesh(new THREE.BufferGeometry(), this.paper, this.pivot); this.canvas = document.createElement('canvas'); this.tex = null;
    const rg = ROLLER(w + 0.3, ROLL_R); const rm = plainMat('walnut'); this.top = mesh(rg, rm, this.pivot, { ink: 0.035 }); this.bot = mesh(rg, rm, this.pivot, { ink: 0.035 }); this.top.rotation.z = this.bot.rotation.z = Math.PI / 2;
    const fin = turned([[0, -0.2], [0.17, -0.16], [0.22, -0.06], [0.12, 0.02], [0.16, 0.1], [0, 0.22]], 28); const bm = plainMat('brass');
    this.fins = []; for (const r of [this.top, this.bot]) for (const s of [-1, 1]) { const f = mesh(fin, bm, r, { ink: 0.03 }); f.position.y = s * (w / 2 + 0.36); f.rotation.z = s > 0 ? 0 : Math.PI; this.fins.push(f); }
    this.open = new Spring(0, 9, 0.75); this.open.target = 1; this.s = this.open; this.h = 4;
  }
  set(title, lines, titleColor = '#5a1a22') {
    // a manuscript leaf: rubricated blackletter title, an illuminated initial with the text wrapped around it,
    // and ink marginalia doodled in the margins
    const Wt = round(this.wU * PXP); const pad = 30, top = 14; const maxT = Wt - pad * 2; const out = []; const fonts = []; const indent = [];
    const tf = title && measure(titleCase(title), 'title') > maxT && measure(titleCase(title), 'head') <= maxT ? 'head' : 'title';
    if (title) for (const l of wrapText(titleCase(title), tf, maxT)) { out.push([[l, titleColor]]); fonts.push(tf); indent.push(0); }
    const body = lines.map((l) => [lineText(l), segs(l)[0][1] || '#2a160c']); const CAP = 34; let cap = null;
    body.forEach(([txt, col], bi) => {
      let words = txt.split(' '); if (bi === 0 && /^[A-Za-z]/.test(txt)) { cap = txt[0]; words[0] = words[0].slice(1); }
      let cur = ''; const flush = () => { out.push([[cur, col]]); fonts.push('hand'); indent.push(cap && bi === 0 && out.filter((_, k) => fonts[k] === 'hand').length <= 2 ? CAP + 4 : 0); cur = ''; };
      for (const w of words) { const hl = out.filter((_, k) => fonts[k] === 'hand').length; const lim = maxT - (cap && bi === 0 && hl < 2 ? CAP + 4 : 0); const t = cur ? cur + ' ' + w : w; if (measure(t, 'hand') > lim && cur) { flush(); cur = w; } else cur = t; }
      if (cur || !words.length) flush();
    });
    let th = 0; out.forEach((_, i) => (th += FONT[fonts[i]].lineH + (fonts[i] === tf ? 2 : 1))); th += title ? 8 : 0;
    const Ht = Math.min(round(this.maxH * PXP), Math.max(th + top * 2, cap ? CAP + top * 2 + 12 : 0)); const S = new Surf(Wt, Ht);
    parchment(S, 0, 0, Wt, Ht, { seed: this.seed, torn: 0, tone: 4, age: 2 });
    for (let x = 0; x < Wt; x++) { S.shift(x, 0, -1); S.shift(x, 1, -1); S.shift(x, Ht - 1, -1); S.shift(x, Ht - 2, -1); }
    for (let y = 6; y < Ht - 6; y++) { if (y % 2) { S.pix(pad - 6, y, '#b07a5a'); S.pix(Wt - pad + 5, y, '#b07a5a'); } } // ruled margins (faint red-brown)
    doodle(S, 'manicule', 6, top + 4); if (Ht > 90) doodle(S, 'snail', Wt - 22, round(Ht * 0.55)); if (Ht > 70) doodle(S, 'curl', 6, Ht - 18); doodle(S, 'apple', Wt - 18, top + 2);
    let y = top - 2; let capY = null;
    out.forEach((ss, i) => {
      const f = fonts[i]; const F = FONT[f]; const wsum = ss.reduce((s, [t]) => s + measure(t, f), 0); let x = f === tf && title ? round((Wt - wsum) / 2) : pad + indent[i];
      if (f === 'hand' && capY == null && cap) capY = y + 1;
      for (const [t, c] of ss) { if (f === tf && title && x === round((Wt - wsum) / 2) && t.length) { inscribe(S, t[0], x, y + F.base, f, 'gild'); const w0 = measure(t[0], f); inscribe(S, t.slice(1), x + w0, y + F.base, f, 'ink', { color: ink(c), seed: i + 3 }); x += measure(t, f); continue; } inscribe(S, t, x, y + F.base, f, 'ink', { color: ink(c), seed: i + 3 }); x += measure(t, f); }
      y += F.lineH + (f === tf ? 2 : 1);
      if (title && f === tf && fonts[i + 1] !== tf) { const cx = round(Wt / 2); goldRule(S, cx - 44, y + 1, cx - 5); goldRule(S, cx + 5, y + 1, cx + 44); for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [0, 0], [0, 2], [0, -2]]) S.pix(cx + dx, y + 1 + dy, '#8a1a1c'); y += 8; }
    });
    if (cap && capY != null) dropCap(S, pad, capY - 2, CAP, cap.toUpperCase(), { field: titleColor === '#1e5a5a' ? GR.clothTeal : GR.blue, seed: 5 });
    for (let y = 2; y < Ht - 2; y++) { S.pix(0, y, '#1a0e12'); S.pix(Wt - 1, y, '#1a0e12'); }
    if (this.tex && (this.canvas.width !== Wt * Surf.K(Wt, Ht) || this.canvas.height !== Ht * Surf.K(Wt, Ht))) { this.tex.dispose(); this.tex = null; }
    S.toCanvas(this.canvas); if (!this.tex) { this.tex = pxTex(this.canvas); this.paper.map = this.tex; this.paper.needsUpdate = true; } else this.tex.needsUpdate = true;
    this.h = Ht / PXP; this.sheet.geometry = sheet(this.wU, this.h, { curl: 0.0, sag: 0.08, segX: 10, segY: 6 }); this.open.value = Math.min(this.open.value, 0.2); this.kick(0.4);
  }
  update(dt, p) {
    this.open.update(dt); this.updateBody(dt, p); const k = Math.max(0.02, this.open.value); const h = this.h * k;
    this.sheet.scale.y = k; this.top.position.set(0, h / 2 + ROLL_R * 0.6, 0.1); this.bot.position.set(0, -h / 2 - ROLL_R * 0.6, 0.1);
    this.top.rotation.x = this.bot.rotation.x = -k * 6;
  }
}

// ================================================================ SIGNBOARD (titles): carved walnut board hung on two ropes, gilt letters
export class Signboard extends Body {
  constructor(lines, { maxW = 22, style = 'gild', wood: woodR = 'walnut', sub = null, hang = 1.4, font = 'title' } = {}) {
    super(); this.tiltK = 0.012; this.hoverLift = 0; this.swing = new Spring(0, 3, 0.04); this.seed = 11; this.style = style; this.woodR = woodR; this.font = font; this.hang = hang;
    this.board = mesh(new THREE.BufferGeometry(), [frontMat(null), sideMat(woodR)], this.pivot, { ink: 0.05 }); this.canvas = document.createElement('canvas'); this.tex = null;
    this.ropes = []; const rg = turned([[0.035, 0], [0.035, 1]], 12); for (let i = 0; i < 2; i++) { const r = mesh(rg, plainMat('rope'), this.pivot); this.ropes.push(r); }
    const ring = turned([[0, -0.1], [0.12, -0.06], [0.12, 0.06], [0, 0.1]], 28); this.rings = this.ropes.map(() => mesh(ring, plainMat('iron'), this.pivot));
    this.maxW = maxW; this.set(lines, sub);
  }
  set(lines, sub = null) {
    const arr = (Array.isArray(lines) ? lines : [lines]).map((l) => titleCase(lineText(l)));
    const f = arr.some((l) => measure(l, this.font) > (this.maxW - 1.2) * PX) ? 'head' : this.font; const F = FONT[f];
    const tw = Math.max(...arr.map((l) => measure(l, f))); const subF = 'tiny'; const sw = sub ? measure(sub, subF) : 0;
    const Wt = Math.max(tw, sw) + 24, Ht = arr.length * F.lineH + (sub ? 10 : 0) + 12;
    const S = new Surf(Wt, Ht); wood(S, 0, 0, Wt, Ht, RAMP[this.woodR], { seed: this.seed, base: 2, knots: 2, seams: arr.length > 1 ? 1 : 0 });
    S.bevel(null, { lit: 2, dark: -2 }); S.bevel((x, y) => x > 0 && y > 0 && x < Wt - 1 && y < Ht - 1, { lit: 1, dark: -1 });
    groove(S, 0, 0, Wt, Ht, 3, { cut: 3, deep: 0, lip: 4 });
    for (const [x, y] of [[6, 5], [Wt - 9, 5], [6, Ht - 8], [Wt - 9, Ht - 8]]) rivet(S, x, y, RAMP.iron);
    inscribeLines(S, arr, { x: 4, y: 6, w: Wt - 8, h: arr.length * F.lineH }, f, this.style, {});
    if (sub) inscribeLines(S, [sub], { x: 4, y: Ht - 15, w: Wt - 8, h: 9 }, subF, 'paint', { ramp: RAMP.ivory });
    if (this.tex && (this.canvas.width !== Wt * Surf.K(Wt, Ht) || this.canvas.height !== Ht * Surf.K(Wt, Ht))) { this.tex.dispose(); this.tex = null; }
    S.toCanvas(this.canvas); if (!this.tex) { this.tex = pxTex(this.canvas); this.board.material[0].map = this.tex; this.board.material[0].needsUpdate = true; } else this.tex.needsUpdate = true;
    const w = Wt / PX, h = Ht / PX; this.w = w; this.h = h; this.board.geometry = slab(w, h, 0.32, { shape: 'rect', cut: 0.22, bevel: 0.1 });
    const hang = this.hang; this.ropes.forEach((r, i) => { const x = (i ? 1 : -1) * (w / 2 - 0.5); r.position.set(x, h / 2 - 0.05, -0.05); r.scale.y = hang; this.rings[i].position.set(x, h / 2 - 0.08, 0.08); this.rings[i].rotation.x = Math.PI / 2; });
  }
  update(dt, p, t = performance.now() / 1000) { this.swing.update(dt); this.updateBody(dt, p); this.pivot.rotation.z += Math.sin(t * 0.9 + this.seed) * 0.008 + this.swing.value * 0.02; }
}

// ================================================================ LABEL: small inked parchment strip, tacked at both ends (hints, sub-titles, stats)
export class Strip extends Body {
  constructor(lines, { font = 'hand', maxW = 20, tone = 4, tacks = 2, color = '#2a160c', style = 'ink' } = {}) {
    super(); this.font = font; this.style = style; this.maxW = maxW; this.toneP = tone; this.tacks = tacks; this.color = color; this.tiltK = 0.02; this.hoverLift = 0; this.seed = 5;
    this.mat = paperMat();
    this.sheet = mesh(new THREE.BufferGeometry(), this.mat, this.pivot); this.canvas = document.createElement('canvas'); this.tex = null; this.pins = [];
    for (let i = 0; i < tacks; i++) { const p = mesh(tackGeo, plainMat('brass'), this.pivot); p.rotation.x = Math.PI / 2; this.pins.push(p); }
    this.set(lines);
  }
  set(lines) {
    const key = JSON.stringify(lines); if (key === this.key) return; this.key = key;
    const arr = (Array.isArray(lines) ? lines : [lines]); const maxT = round(this.maxW * PXP) - 24; const out = [];
    for (const l of arr) { if (measure(lineText(l), this.font) <= maxT) out.push(segs(l)); else for (const w of wrapText(lineText(l), this.font, maxT)) out.push([[w, segs(l)[0][1]]]); }
    const F = FONT[this.font]; const tw = Math.max(...out.map((l) => measure(lineText(l), this.font))); const Wt = tw + 28, Ht = out.length * F.lineH + 10;
    const S = new Surf(Wt, Ht); parchment(S, 0, 0, Wt, Ht, { seed: this.seed, torn: 2, tone: this.toneP });
    inscribeLines(S, out.map((l) => l.map(([t, c]) => [t, this.style === 'stamp' ? '#a8201c' : ink(c || this.color)])), { x: 4, y: 5, w: Wt - 8, h: out.length * F.lineH }, this.font, this.style, { seed: this.seed });
    if (this.style === 'stamp') { for (let x = 2; x < Wt - 2; x++) for (const y of [2, Ht - 3]) if (hash2(x, y, 4) > 0.2) S.pix(x, y, '#a8201c'); for (let y = 2; y < Ht - 2; y++) for (const x of [2, Wt - 3]) if (hash2(x, y, 5) > 0.2) S.pix(x, y, '#a8201c'); }
    if (this.tacks) for (const x of this.tacks === 2 ? [6, Wt - 7] : [round(Wt / 2)]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) S.shift(x + dx, round(Ht / 2) + dy, -1);
    if (this.style !== 'stamp') S.inkEdge();
    if (this.tex && (this.canvas.width !== Wt * Surf.K(Wt, Ht) || this.canvas.height !== Ht * Surf.K(Wt, Ht))) { this.tex.dispose(); this.tex = null; }
    S.toCanvas(this.canvas); if (!this.tex) { this.tex = pxTex(this.canvas); this.mat.map = this.tex; this.mat.needsUpdate = true; } else this.tex.needsUpdate = true;
    this.w = Wt / PXP; this.h = Ht / PXP; this.sheet.geometry = sheet(this.w, this.h, { curl: 0.08, sag: 0.03, segX: 6, segY: 2 });
    this.pins.forEach((p, i) => p.position.set(this.tacks === 2 ? (i ? 1 : -1) * (this.w / 2 - 6 / PXP) : 0, 0, 0.06)); this.kick(0.3);
  }
  update(dt, p) { this.updateBody(dt, p); }
}
export { titleCase, lineText };

// ================================================================ PENNANT (banners): embroidered cloth that unrolls from a turned rod
// banners are vellum banderoles: rubricated blackletter with a gold-leaf initial, gold rules, swallowtail ends
const PEN = { '': { ink: '#2a1408', rub: '#8a1a1c', tone: 5 }, arc: { ink: '#1e3a5a', rub: '#1e5a5a', tone: 5 }, dread: { ink: '#140c10', rub: '#5a1a22', tone: 3 } };
export class Pennant {
  constructor() {
    this.group = new THREE.Group(); this.group.visible = false; this.cloth = mesh(new THREE.BufferGeometry(), toon({ alphaTest: 0.5, side: THREE.DoubleSide }), this.group);
    this.canvas = document.createElement('canvas'); this.tex = null; this.rodM = plainMat('walnut'); this.rod = null; this.roll = mesh(turned([[0.001, -0.5], [0.85, -0.5], [1, -0.42], [1, 0.42], [0.85, 0.5], [0.001, 0.5]], 28), this.cloth.material, this.group); this.roll.rotation.z = Math.PI / 2;
    this.cords = [0, 1].map(() => mesh(turned([[0.03, 0], [0.03, 6]], 12), plainMat('rope'), this.group));
    this.k = new Spring(0, 10, 0.9); this.drop = new Spring(0, 9, 0.55); this.t = 0;
  }
  show(title, sub = '', kind = '', hold = 0.9) {
    const P = PEN[kind] || PEN['']; const t = titleCase(title) || ' '; const f = measure(t, 'title') > 300 ? 'head' : 'title'; const F = FONT[f];
    const sw = sub ? measure(sub.toUpperCase(), 'caps') : 0; const Wt = Math.max(measure(t, f), sw) + 44; const tail = 11; const Ht = 9 + F.lineH + (sub ? 11 : 0) + 7 + tail;
    const S = new Surf(Wt, Ht); const mask = (x, y) => y < Ht - tail || Math.abs(x - Wt / 2 + 0.5) >= (y - (Ht - tail) + 1) * (Wt * 0.22 / tail);
    parchment(S, 0, 0, Wt, Ht, { seed: 7, torn: 0, tone: P.tone, age: kind === 'dread' ? 2 : 1, mask });
    for (let x = 0; x < Wt; x++) for (let y = 0; y < 4; y++) S.setT(x, y, y < 2 ? P.tone - 3 : P.tone - 1); // where it wraps the roller
    goldRule(S, 4, 5, Wt - 5); goldRule(S, 4, Ht - tail - 3, Wt - 5);
    const tw = measure(t, f); const tx = Math.round((Wt - tw) / 2), ty = 8 + F.base;
    inscribe(S, t[0], tx, ty, f, 'gild'); inscribe(S, t.slice(1), tx + measure(t[0], f), ty, f, 'ink', { color: P.ink, seed: 2 });
    if (sub) inscribeLines(S, [sub.toUpperCase()], { x: 0, y: 9 + F.lineH, w: Wt, h: 10 }, 'caps', 'ink', { color: P.rub });
    for (const x of [8, Wt - 12]) { S.pix(x, 8 + F.lineH / 2, P.rub); S.pix(x + 1, 7 + F.lineH / 2, P.rub); S.pix(x + 1, 9 + F.lineH / 2, P.rub); S.pix(x + 2, 8 + F.lineH / 2, P.rub); }
    S.inkEdge();
    if (this.tex && (this.canvas.width !== Wt * Surf.K(Wt, Ht) || this.canvas.height !== Ht * Surf.K(Wt, Ht))) { this.tex.dispose(); this.tex = null; }
    S.toCanvas(this.canvas); if (!this.tex) { this.tex = pxTex(this.canvas); this.cloth.material.map = this.tex; this.cloth.material.needsUpdate = true; } else this.tex.needsUpdate = true;
    const w = Wt / PX, h = Ht / PX; this.w = w; this.h = h;
    const g = new THREE.PlaneGeometry(w, h, 12, 8); g.translate(0, -h / 2, 0); this.cloth.geometry?.dispose(); this.cloth.geometry = g; this.base = Float32Array.from(g.attributes.position.array); this.uv0 = Float32Array.from(g.attributes.uv.array);
    if (this.rod) this.group.remove(this.rod); this.rod = mesh(ROLLER(w + 0.3, 0.13), this.rodM, this.group, { ink: 0.035 }); this.rod.rotation.z = Math.PI / 2; this.rod.position.z = 0.08;
    this.cords.forEach((c, i) => c.position.set((i ? 1 : -1) * (w / 2 - 0.3), 0, -0.02));
    this.group.visible = true; this.k.set(0); this.k.target = 1; this.drop.set(4); this.drop.target = 0; this.t = 0;
    return new Promise((res) => { clearTimeout(this._t); this._res?.(); this._res = res; this._t = setTimeout(() => { this.k.target = 0; this.drop.target = 5; setTimeout(() => { this.group.visible = false; const r = this._res; this._res = null; r?.(); }, 420); }, 380 + hold * 1000); });
  }
  update(dt) {
    if (!this.group.visible) return; this.t += dt; this.k.update(dt); this.drop.update(dt); const k = Math.max(0, Math.min(1, this.k.value)); const h = this.h, w = this.w;
    this.group.children.forEach(() => {}); this.group.position.y = (this.y0 ?? 0) + this.drop.value; this.group.rotation.z = Math.sin(this.t * 1.7) * 0.012;
    const a = this.cloth.geometry.attributes.position; const b = this.base; const yr = -h * k;
    for (let i = 0; i < a.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const d = -y / h; const yy = Math.max(y, yr); a.setY(i, yy); a.setX(i, x + Math.sin(this.t * 2.2 + d * 3) * 0.06 * d); a.setZ(i, Math.sin(this.t * 3.1 + x * 0.7 + d * 4) * 0.12 * d); }
    a.needsUpdate = true; this.cloth.geometry.computeVertexNormals();
    const r = 0.06 + (1 - k) * 0.22; this.roll.visible = k < 0.98; this.roll.scale.set(r, w, r); this.roll.position.set(0, yr - r * 0.5, 0.05);
  }
}

// ================================================================ TAG: small leather / parchment tag on a string (prices, counts)
import { sprite as _sprite } from '../gfx/sprites.js';
export class Tag extends Body {
  constructor(text, { icon = null, ramp = RAMP.oak, style = 'burn' } = {}) {
    super(); this.icon = icon; this.rampT = ramp; this.styleT = style; this.tiltK = 0.05; this.hoverLift = 0.15;
    this.tex = null; this.mesh = mesh(new THREE.BufferGeometry(), [frontMat(null), sideMat('leather')], this.pivot, { ink: 0.03 }); this.mesh.position.y = -0.62;
    const str = mesh(turned([[0.02, 0], [0.02, 0.1]], 12), plainMat('rope'), this.pivot); str.position.y = -0.1; void str;
    this.set(text);
  }
  set(text) {
    if (text === this.text) return; this.text = text; const t = String(text); const f = /^[0-9/+×x -]+$/.test(t) ? 'num' : 'tiny';
    const Wt = measure(t, f) + (this.icon ? 20 : 0) + 14, Ht = 18; const S = new Surf(Wt, Ht);
    leather(S, 0, 0, Wt, Ht, { seed: 6, base: 3, stitch: 2, ramp: this.rampT });
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) S.set(Math.round(Wt / 2) - 1 + dx, 1 + dy, RAMP.ink, 0);
    let x = 7; if (this.icon) { try { S.blit(_sprite(this.icon), x - 1, 2); } catch { /* */ } x += 17; }
    inscribe(S, t, x, f === 'num' ? 14 : 13, f, this.styleT);
    this.tex?.dispose(); this.tex = pxTex(S.toCanvas()); this.mesh.material[0].map = this.tex; this.mesh.material[0].needsUpdate = true;
    this.w = Wt / PX; this.h = Ht / PX; this.mesh.geometry = slab(this.w, this.h, 0.08, { shape: 'tag', cut: 0.06, bevel: 0.02 }); this.mesh.position.y = -this.h / 2 - 0.1; this.kick(0.5);
  }
  update(dt, p, t = performance.now() / 1000) { this.updateBody(dt, p); this.pivot.rotation.z += Math.sin(t * 1.6 + this.w) * 0.02; }
}

// ================================================================ CARVED SIGN for world props (event signposts): oak board, burnt letters
export function carvedSign(text, { maxW = 2.4 } = {}) {
  const t = String(text); const f = measure(t, 'bold') + 12 <= maxW * PX ? 'bold' : 'tiny'; const Wt = measure(t, f) + 12, Ht = f === 'bold' ? 18 : 12;
  const S = new Surf(Wt, Ht); wood(S, 0, 0, Wt, Ht, RAMP.oak, { seed: t.length, base: 3, knots: 1, quiet: true }); S.bevel(null, { lit: 1, dark: -2 });
  inscribe(S, t, 6, f === 'bold' ? 13 : 9, f, 'burn'); for (const x of [2, Wt - 4]) rivet(S, x, Math.round(Ht / 2) - 1, RAMP.iron);
  const m = new THREE.Mesh(slab(Wt / PX, Ht / PX, 0.08, { cut: 0.05, bevel: 0.02 }), [new THREE.MeshStandardMaterial({ map: pxTex(S.toCanvas()), roughness: 0.85 }), new THREE.MeshStandardMaterial({ map: sideMat('oak').map, roughness: 0.85 })]);
  m.castShadow = true; m.receiveShadow = true; return m;
}

// ================================================================ CHAPTER CARD: an illuminated storybook leaf that slides onto the table at battle start
export class ChapterCard extends Body {
  constructor() {
    super(); this.tiltK = 0; this.hoverLift = 0; this.group.visible = false; this.mat = paperMat(); this.sheet = mesh(new THREE.BufferGeometry(), this.mat, this.pivot); this.canvas = document.createElement('canvas'); this.tex = null;
    this.x = new Spring(-40, 7, 0.78); this.y = new Spring(0, 7, 0.78); this.r = new Spring(0, 6, 0.6);
  }
  show(chapter, title, note = '', { hold = 2.4, z = 9 } = {}) {
    const Wt = 300; const pad = 22, CAP = 50; const maxT = Wt - pad * 2 - 8; const words = title.split(' '); const cap = words[0][0]; words[0] = words[0].slice(1);
    const lines = []; let cur = ''; for (const w of words) { const lim = maxT - (lines.length < 2 ? CAP + 6 : 0); const t = cur ? cur + ' ' + w : w; if (measure(t, 'title') > lim && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
    const Ht = 30 + Math.max(CAP + 8, lines.length * 27 + 4) + (note ? 16 : 0) + 26; const S = new Surf(Wt, Ht);
    parchment(S, 0, 0, Wt, Ht, { seed: 21, torn: 1, tone: 5, age: 1 }); vineBorder(S, 0, 0, Wt, Ht, { inset: 5, seed: 2 });
    inscribeLines(S, [`Chapter ${chapter}`], { x: 0, y: 12, w: Wt, h: 17 }, 'head', 'ink', { color: '#8a1a1c' });
    const cx = Wt / 2; goldRule(S, round(cx - 52), 30, round(cx - 6)); goldRule(S, round(cx + 6), 30, round(cx + 52)); for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [0, 0]]) S.pix(round(cx) + dx, 31 + dy, '#8a1a1c');
    const y0 = 38; dropCap(S, pad + 4, y0, CAP, cap.toUpperCase(), { field: GR.blue, seed: 9 });
    lines.forEach((l, i) => inscribe(S, l, pad + 4 + (i < 2 ? CAP + 6 : 0), y0 + 19 + i * 27, 'title', 'ink', { color: '#1e120c', seed: i }));
    if (note) inscribeLines(S, [note], { x: 0, y: Ht - 36, w: Wt, h: 14 }, 'handS', 'ink', { color: '#8a1a1c' });
    waxSeal(S, Wt - 28, Ht - 24, 8, { seed: 4 }); S.inkEdge();
    if (this.tex && (this.canvas.width !== Wt * Surf.K(Wt, Ht) || this.canvas.height !== Ht * Surf.K(Wt, Ht))) { this.tex.dispose(); this.tex = null; }
    S.toCanvas(this.canvas); if (!this.tex) { this.tex = pxTex(this.canvas); this.mat.map = this.tex; this.mat.needsUpdate = true; } else this.tex.needsUpdate = true;
    this.w = Wt / PXP; this.h = Ht / PXP; this.sheet.geometry = sheet(this.w, this.h, { curl: 0.16, sag: 0.05 });
    const k = (40 - z) / 40; this.k = k; this.z = z; this.group.scale.setScalar(k); this.group.visible = true;
    this.x.set(-34); this.x.target = 0; this.y.set(-3); this.y.target = 0.4; this.r.set(0.5); this.r.target = -0.035; audio.play('paper_rustle');
    return new Promise((res) => { clearTimeout(this._t); this._done?.(); this._done = res; this._t = setTimeout(() => this.away(), 650 + hold * 1000); });
  }
  away() { if (!this._done) return; clearTimeout(this._t); this.x.target = 36; this.y.target = 2.5; this.r.target = -0.45; audio.play('paper_rustle', { vol: 0.6 }); const r = this._done; this._done = null; setTimeout(() => { this.group.visible = false; r(); }, 700); }
  update(dt) { if (!this.group.visible) return; for (const s of [this.x, this.y, this.r]) s.update(dt); this.updateBody(dt, null); this.group.position.set(this.x.value * this.k, this.y.value * this.k, this.z); this.pivot.rotation.z = this.r.value; }
}
