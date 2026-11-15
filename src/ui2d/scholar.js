// THE SCHOLAR'S 2D UI (menu agent): detailed, crisp, high-resolution 2D panels for the menu side (the Experiment Hall,
// the star-chart of achievements, the astral select's chart card, the journal codex and the settings). Every surface
// is HAND-PIXELLED ART painted at runtime (an ebony and brass frame with corner fittings and rivets around aged
// parchment, or a lapis star-chart with silver fittings), drawn at a whole number of screen pixels per art pixel (--k)
// so it stays perfectly crisp; the text is set in Alagard (titles), PixelSans (body) and NanoPlus (numbers) at exact
// multiples of their native sizes, so no letter is ever soft or low-res. Controls are alive: rows lift and warm under
// the pointer, brass buttons press down with a click and a glint, bars fill with liquid light.
//   const UI = new Scholar();  const p = UI.panel({ w: 220, h: 300, theme: 'parch' });  p.el (a DOM node in art-px layout)
//   UI.k (screen px per art px); UI.dispose()
import { RAMP, Surf, parchment } from '../ui3d/craft.js';
import { audio } from '../core/audio.js';

const H = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const h2 = (x, y, s = 0) => H(x * 12.9898 + y * 78.233 + s * 37.719);
const BRASS = ['#24130f', '#4b2a17', '#7b4a1d', '#ad7826', '#d8a63a', '#f2d36c', '#fff4c4'];
const SILVER = ['#0e1020', '#22283e', '#3e4866', '#66729a', '#98a4c8', '#ccd6f0', '#ffffff'];
const EBONY = ['#0a0608', '#150c0e', '#22140f', '#321e15', '#46291b'];
const LAPIS = ['#04050e', '#080b1e', '#0d1230', '#141c44', '#1e2a5c', '#2c3c7a'];
export const INK = { parch: '#2a160c', parchSoft: '#6a4428', red: '#8a1a1c', night: '#e8dcc0', nightSoft: '#9aa4c8', gold: '#f2c868' };

let styleOn = false;
function css() {
  if (styleOn) return; styleOn = true; const s = document.createElement('style'); s.id = 'lf-scholar-css';
  s.textContent = `
.lf-ui { position: fixed; inset: 0; pointer-events: none; z-index: 5; --k: 2; font-family: 'PixelSans', monospace; color: ${INK.parch}; -webkit-font-smoothing: none; font-smooth: never; text-rendering: optimizeSpeed; image-rendering: pixelated; }
.lf-ui * { box-sizing: border-box; }
.lf-panel { position: absolute; pointer-events: auto; background-repeat: no-repeat; background-size: 100% 100%; image-rendering: pixelated; transition: opacity .35s, transform .45s cubic-bezier(.2,1.4,.4,1); }
.lf-panel.lf-hide { opacity: 0; transform: translateY(calc(var(--k) * 10px)) scale(.98); pointer-events: none; }
.lf-title { font-family: 'Alagard'; font-size: calc(var(--k) * 16px); line-height: calc(var(--k) * 16px); letter-spacing: 0; color: ${INK.parch}; text-shadow: 0 var(--k-px) 0 rgba(255,240,200,.55); white-space: nowrap; }
.lf-night .lf-title, .lf-title.lf-gold { color: ${INK.gold}; text-shadow: 0 var(--k-px) 0 #1a0a04, var(--k-px) 0 0 #1a0a04, calc(-1 * var(--k-px)) 0 0 #1a0a04, 0 calc(-1 * var(--k-px)) 0 #1a0a04; }
.lf-wrap { white-space: normal; }
.lf-big { font-size: calc(var(--k) * 32px); line-height: calc(var(--k) * 30px); }
.lf-body { font-size: calc(var(--k) * 11px); line-height: calc(var(--k) * 13px); }
.lf-num { font-family: 'NanoPlus'; font-size: calc(var(--k) * 13px); line-height: calc(var(--k) * 12px); }
.lf-soft { color: ${INK.parchSoft}; } .lf-night { color: ${INK.night}; } .lf-night .lf-soft { color: ${INK.nightSoft}; } .lf-red { color: ${INK.red}; } .lf-goldt { color: #8a5a10; } .lf-night .lf-goldt { color: ${INK.gold}; }
.lf-rule { height: var(--k-px); background: currentColor; opacity: .35; margin: calc(var(--k) * 3px) 0; }
.lf-list { overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: #ad7826 rgba(0,0,0,.15); }
.lf-list::-webkit-scrollbar { width: calc(var(--k) * 4px); } .lf-list::-webkit-scrollbar-thumb { background: #ad7826; border: var(--k-px) solid #4b2a17; } .lf-list::-webkit-scrollbar-track { background: rgba(60,30,10,.15); }
.lf-row { position: relative; display: flex; align-items: center; gap: calc(var(--k) * 4px); padding: calc(var(--k) * 3px) calc(var(--k) * 4px); margin: 0 0 var(--k-px) 0; cursor: pointer; transition: transform .18s, background .18s; border-bottom: var(--k-px) solid rgba(90,54,34,.28); }
.lf-row:hover { transform: translateX(calc(var(--k) * 2px)); background: rgba(255,214,140,.22); }
.lf-row.lf-sel { background: rgba(255,200,110,.32); } .lf-row.lf-sel::before { content: ''; position: absolute; left: calc(var(--k) * -3px); top: 0; bottom: 0; width: calc(var(--k) * 3px); background: #8a1a1c; box-shadow: inset calc(-1 * var(--k-px)) 0 0 #4a0a0c; }
.lf-night .lf-row { border-bottom-color: rgba(150,170,230,.2); } .lf-night .lf-row:hover { background: rgba(140,160,255,.14); } .lf-night .lf-row.lf-sel { background: rgba(255,210,120,.16); } .lf-night .lf-row.lf-sel::before { background: #f2c868; box-shadow: none; }
.lf-row.lf-dim { opacity: .55; }
.lf-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: calc(var(--k) * 3px); cursor: pointer; padding: 0 calc(var(--k) * 8px); height: calc(var(--k) * 20px); font-family: 'Alagard'; font-size: calc(var(--k) * 16px); color: #2a1406; background-size: 100% 100%; image-rendering: pixelated; transition: transform .08s, filter .15s; user-select: none; text-shadow: 0 var(--k-px) 0 rgba(255,244,196,.6); overflow: hidden; }
.lf-btn:hover { filter: brightness(1.12) saturate(1.1); transform: translateY(calc(var(--k) * -1px)); }
.lf-btn:active, .lf-btn.lf-press { transform: translateY(var(--k-px)); filter: brightness(.92); }
.lf-btn::after { content: ''; position: absolute; top: 0; bottom: 0; width: calc(var(--k) * 6px); left: -30%; background: rgba(255,250,220,.55); transform: skewX(-20deg); opacity: 0; }
.lf-btn:hover::after { animation: lf-glint .7s steps(8) 1; }
.lf-btn.lf-off { filter: grayscale(.8) brightness(.7); cursor: default; } .lf-btn.lf-off:hover { transform: none; } .lf-btn.lf-off::after { display: none; }
@keyframes lf-glint { 0% { left: -30%; opacity: 1; } 100% { left: 120%; opacity: 1; } }
@keyframes lf-pulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25) saturate(1.2); } }
.lf-ready { animation: lf-pulse 1.2s steps(6) infinite; }
.lf-tab { cursor: pointer; padding: calc(var(--k) * 2px) calc(var(--k) * 6px); font-family: 'Alagard'; font-size: calc(var(--k) * 16px); opacity: .6; transition: opacity .15s, transform .15s; }
.lf-tab:hover { opacity: .9; transform: translateY(calc(var(--k) * -1px)); } .lf-tab.lf-on { opacity: 1; border-bottom: calc(var(--k) * 2px) solid currentColor; }
.lf-cv { image-rendering: pixelated; display: block; } .lf-cv.lf-smooth { image-rendering: auto; }
.lf-grid { display: flex; flex-wrap: wrap; gap: calc(var(--k) * 4px); }
`;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- hand-pixelled surfaces
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/** a framed folio: ebony + brass frame with corner fittings and rivets around parchment (theme 'parch') or a lapis
 *  star-chart with silver fittings (theme 'night'); w x h art px */
export function folio(w, h, { theme = 'parch', seed = 1, frame = 'full' } = {}) {
  const night = theme === 'night'; let c;
  if (night) { c = canvas(w, h); const g = c.getContext('2d'); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = h2(x >> 2, y >> 2, seed) * 0.6 + h2(x >> 3, y >> 3, seed + 1) * 0.4; const t = n > 0.78 ? 3 : n < 0.25 ? 1 : 2; g.fillStyle = LAPIS[t]; g.fillRect(x, y, 1, 1); }
    for (let i = 0; i < (w * h) / 90; i++) { const x = (h2(i, 1, seed) * w) | 0, y = (h2(i, 2, seed) * h) | 0; g.fillStyle = h2(i, 3, seed) > 0.8 ? '#c8d0ff' : '#5a6aa8'; g.fillRect(x, y, 1, 1); }
    g.strokeStyle = 'rgba(160,180,255,0.10)'; g.lineWidth = 1; for (let x = 12.5; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 12.5; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
  else { const S = new Surf(w, h); parchment(S, 0, 0, w, h, { seed, torn: 0, tone: 4, age: 1 }); c = S.toCanvas(null, 1); }
  if (frame === 'none') return c;
  const g = c.getContext('2d'); const M = night ? SILVER : BRASS; const F = night ? LAPIS : EBONY; const B = frame === 'thin' ? 0 : 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.min(x, y, w - 1 - x, h - 1 - y); if (d > B + 3) continue; const top = Math.min(x, y) === d; let col = null;
    if (d === 0) col = '#06030a';
    else if (d <= B) { const gr = h2(x >> 1, y >> 3, seed + 9); col = F[Math.min(F.length - 1, (d === 1 ? 3 : 2) + (gr > 0.8 ? 1 : 0) - (gr < 0.15 ? 1 : 0))]; }
    else if (d === B + 1) col = top ? M[5] : M[2]; else if (d === B + 2) col = top ? M[4] : M[3]; else if (d === B + 3) col = '#140a06';
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
  // corner fittings: a brass leaf plate with a rivet in each corner, and rivets along the long edges
  const plate = (cx, cy, fx, fy) => { for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { if (i + j > 11) continue; const x = cx + i * fx, y = cy + j * fy; const e = i + j === 11 || i === 8 || j === 8; g.fillStyle = e ? '#140a06' : i + j < 3 ? M[6] : (i < 2 || j < 2) ? M[5] : i + j > 9 ? M[2] : M[(i * 3 + j) % 7 === 0 ? 3 : 4]; g.fillRect(x, y, 1, 1); }
    g.fillStyle = M[1]; g.fillRect(cx + 3 * fx, cy + 3 * fy, 1, 1); g.fillStyle = M[6]; g.fillRect(cx + 2 * fx, cy + 2 * fy, 1, 1); };
  plate(1, 1, 1, 1); plate(w - 2, 1, -1, 1); plate(1, h - 2, 1, -1); plate(w - 2, h - 2, -1, -1);
  if (B) { const riv = (x, y) => { g.fillStyle = M[2]; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = M[5]; g.fillRect(x - 1, y - 1, 1, 1); g.fillStyle = M[1]; g.fillRect(x + 1, y + 1, 1, 1); };
    for (let x = 24; x < w - 20; x += 32) { riv(x, 2); riv(x, h - 3); } for (let y = 24; y < h - 20; y += 32) { riv(2, y); riv(w - 3, y); } }
  return c;
}
/** a brass (or silver) push plaque, w x 20 art px */
export function plaque(w, { night = false, red = false } = {}) {
  const c = canvas(w, 20); const g = c.getContext('2d'); const M = red ? ['#1c040e', '#480a1a', '#821424', '#bc2a2c', '#e25a40', '#fca07a', '#ffd0b8'] : night ? SILVER : BRASS;
  for (let y = 0; y < 20; y++) for (let x = 0; x < w; x++) { const d = Math.min(x, y, w - 1 - x, 19 - y); const corner = (x < 2 || x > w - 3) && (y < 2 || y > 17); if (corner && d === 0) continue;
    let t = d === 0 ? -1 : d === 1 ? (Math.min(x, y) === 1 ? 6 : 1) : d === 2 ? (Math.min(x, y) === 2 ? 5 : 2) : y < 8 ? 4 : y < 14 ? 3 : 3; if (d > 2 && h2(x >> 1, y, 4) > 0.9) t = Math.min(6, t + 1); if (d > 2 && y === 9 && h2(x, 2, 5) > 0.6) t = 5;
    g.fillStyle = t < 0 ? '#100604' : M[t]; g.fillRect(x, y, 1, 1); }
  return c;
}
const ICONS = { // tiny hand-pixelled glyphs (k: ink, a..e: ramp tones dark -> light, x: accent)
  star: ['....k....', '...kek...', '...kek...', 'kkkkekkkk', 'kedddddek', '.kcdddck.', '..kcdck..', '.kcckcck.', '.kck.kck.', 'kk.....kk'],
  coin: ['..kkkkk..', '.kddddek.', 'kdcccccdk', 'kdcbbbcdk', 'kdcbkbcdk', 'kdcbbbcdk', 'kdcccccdk', '.kbdddbk.', '..kkkkk..'],
  card: ['kkkkkkk.', 'keeeeek.', 'kexxxek.', 'kexxxekk', 'keeeeekd', 'kecccekd', 'keeeeekd', 'kkkkkkkd', '.dddddd.'],
  cup: ['kkkkkkkkk', 'kdeeeeedk', 'kkdeeedkk', '.kcdddck.', '..kcdck..', '...kck...', '...kck...', '..kcccck.', '.kkkkkkk.'],
  apple: ['....kk...', '...kxk...', '.kkkkkkk.', 'kcceddcck', 'kceedcbck', 'kccdcccbk', 'kcccccbbk', '.kbbbbbk.', '..kk.kk..'],
  flask: ['...kkk...', '...kek...', '...kek...', '..kdedk..', '.kdxxxdk.', 'kdxxexxdk', 'kxxxxxxxk', 'kxxxexxxk', '.kkkkkkk.'],
  lock: ['..kkkkk..', '.kd...dk.', '.kd...dk.', 'kkkkkkkkk', 'kdeeeeedk', 'kdcckccdk', 'kdcckccdk', 'kdbbbbbdk', 'kkkkkkkkk'],
};
export function icon(name, { ramp = BRASS, accent = '#c8302c', scale = 1 } = {}) {
  const m = ICONS[name] || ICONS.star; const w = m[0].length, h = m.length; const c = canvas(w, h); const g = c.getContext('2d'); const map = { k: '#140a06', a: ramp[1], b: ramp[2], c: ramp[3], d: ramp[4], e: ramp[6] || ramp[5], x: accent };
  m.forEach((row, y) => { for (let x = 0; x < w; x++) { const ch = row[x]; if (ch === '.') continue; g.fillStyle = map[ch]; g.fillRect(x, y, 1, 1); } }); c.className = 'lf-cv'; c.dataset.w = w * scale; c.dataset.h = h * scale; return c;
}
/** a segmented pixel progress bar (liquid gold, or teal for night), w x 7 art px */
export function bar(w, frac, { night = false, done = false } = {}) {
  const c = canvas(w, 7); const g = c.getContext('2d'); const L = night ? ['#0a1a2a', '#14506a', '#1e8aa0', '#5ad8d0', '#c8fff0'] : ['#2a1004', '#7a3e0c', '#c47a1c', '#f0b83a', '#fff0a8']; const D = done ? ['#2a1004', '#8a5a10', '#e0a020', '#ffd84a', '#fffbe0'] : L;
  g.fillStyle = '#140a06'; g.fillRect(0, 0, w, 7); g.fillStyle = night ? '#1a2240' : '#5a3a20'; g.fillRect(1, 1, w - 2, 5); const fw = Math.round((w - 2) * Math.max(0, Math.min(1, frac)));
  for (let x = 0; x < fw; x++) for (let y = 1; y < 6; y++) { g.fillStyle = D[y === 1 ? 4 : y === 2 ? 3 : y === 5 ? 1 : 2]; g.fillRect(1 + x, y, 1, 1); }
  for (let x = 6; x < w - 2; x += 6) { g.fillStyle = 'rgba(20,10,6,0.55)'; g.fillRect(x, 1, 1, 5); }
  if (fw > 0 && fw < w - 2) { g.fillStyle = D[4]; g.fillRect(fw, 1, 1, 5); }
  c.className = 'lf-cv'; c.dataset.w = w; c.dataset.h = 7; return c;
}

export class Scholar {
  constructor() {
    css(); this.root = document.createElement('div'); this.root.className = 'lf-ui'; document.body.appendChild(this.root); this.panels = [];
    this._rs = () => this.resize(); addEventListener('resize', this._rs); this.resize();
  }
  resize() { const k = Math.max(1, Math.min(5, Math.floor(Math.min(innerWidth / 600, innerHeight / 340)))); this.k = k; this.root.style.setProperty('--k', k); this.root.style.setProperty('--k-px', k + 'px'); for (const c of this.root.querySelectorAll('canvas.lf-cv')) this.fit(c); for (const p of this.panels) this.place(p); }
  px(n) { return n * this.k + 'px'; }
  fit(c) { c.style.width = this.px(+c.dataset.w || c.width); c.style.height = this.px(+c.dataset.h || c.height); return c; }
  el(tag, cls = '', text = null, parent = null) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  /** a framed panel of w x h art px; anchor: 'left' | 'right' | 'center' | 'bottom' with margins in art px */
  panel({ w = 200, h = 200, theme = 'parch', anchor = 'left', mx = 8, my = 0, seed = 1, frame = 'full', pad = 10 } = {}) {
    const el = this.el('div', 'lf-panel' + (theme === 'night' ? ' lf-night' : ''), null, this.root); const bg = folio(w, h, { theme, seed, frame });
    el.style.backgroundImage = `url(${bg.toDataURL()})`; const inner = this.el('div', '', null, el); inner.style.position = 'absolute';
    const P = { el, inner, w, h, anchor, mx, my, pad, theme }; this.panels.push(P); this.place(P); return P;
  }
  place(P) { const k = this.k, W = innerWidth, Hh = innerHeight; const w = P.w * k, h = P.h * k; let x = 0, y = 0;
    if (P.anchor === 'left') { x = P.mx * k; y = (Hh - h) / 2 + P.my * k; } else if (P.anchor === 'right') { x = W - w - P.mx * k; y = (Hh - h) / 2 + P.my * k; } else if (P.anchor === 'bottom') { x = (W - w) / 2 + P.mx * k; y = Hh - h - P.my * k; } else if (P.anchor === 'top-left') { x = P.mx * k; y = P.my * k; } else if (P.anchor === 'top') { x = (W - w) / 2 + P.mx * k; y = P.my * k; } else if (P.anchor === 'top-right') { x = W - w - P.mx * k; y = P.my * k; } else if (P.anchor === 'bottom-right') { x = W - w - P.mx * k; y = Hh - h - P.my * k; } else { x = (W - w) / 2 + P.mx * k; y = (Hh - h) / 2 + P.my * k; }
    if (P.at) { x = P.at[0] - w / 2; y = P.at[1] - h; x = Math.max(4, Math.min(W - w - 4, x)); y = Math.max(4, Math.min(Hh - h - 4, y)); }
    Object.assign(P.el.style, { left: Math.round(x) + 'px', top: Math.round(y) + 'px', width: w + 'px', height: h + 'px' }); const pd = P.pad * k; Object.assign(P.inner.style, { left: pd + 'px', top: pd + 'px', right: pd + 'px', bottom: pd + 'px' }); }
  /** a brass push plaque that clicks, glints and runs fn */
  button(label, fn, { parent, w = 70, night = false, red = false, sound = 'ui_click' } = {}) {
    const b = this.el('div', 'lf-btn', label, parent); b.style.backgroundImage = `url(${plaque(w, { night, red }).toDataURL()})`; b.style.width = `calc(var(--k) * ${w}px)`;
    if (night && !red) b.style.color = '#0e1020';
    b.addEventListener('pointerenter', () => { if (!b.classList.contains('lf-off')) audio.play('ui_hover', { vol: 0.3 }); });
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (b.classList.contains('lf-off')) { audio.play('ui_error', { vol: 0.35 }); return; } b.classList.add('lf-press'); audio.play(sound, { vol: 0.6 }); setTimeout(() => b.classList.remove('lf-press'), 120); fn?.(b); });
    return b;
  }
  hoverSound(e, name = 'ui_hover', vol = 0.25) { e.addEventListener('pointerenter', () => audio.play(name, { vol })); return e; }
  add(c, parent) { this.fit(c); parent?.appendChild(c); return c; }
  show(P, on = true) { P.el.classList.toggle('lf-hide', !on); }
  remove(P) { P.el.remove(); this.panels = this.panels.filter((x) => x !== P); }
  dispose() { removeEventListener('resize', this._rs); this.root.remove(); this.panels = []; }
}
