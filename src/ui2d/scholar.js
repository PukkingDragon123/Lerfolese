// THE SCHOLAR'S 2D UI (menu agent): detailed, crisp, high-resolution 2D panels for the menu side (the Experiment Hall,
// the star-chart of achievements, the astral select's chart card, the journal codex and the settings). Every surface
// is HAND-PIXELLED ART painted at runtime in a few hand-picked ramps (a carved walnut moulding, a brass fillet and cast
// bevelled corner brackets around clean vellum; or navy and silver around a lapis star-chart; brass plaques, glass
// gauges, a scrolled divider, 11 px icons), drawn at a whole number of screen pixels per art pixel (--k)
// so it stays perfectly crisp; the text is set in Alagard (titles), PixelSans (body) and NanoPlus (numbers) at exact
// multiples of their native sizes, so no letter is ever soft or low-res. Controls are alive: rows lift and warm under
// the pointer, brass buttons press down with a click and a glint, bars fill with liquid light.
//   const UI = new Scholar();  const p = UI.panel({ w: 220, h: 300, theme: 'parch' });  p.el (a DOM node in art-px layout)
//   UI.k (screen px per art px); UI.dispose()
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
// Every surface is painted pixel by pixel into a few hand-picked ramps: large clean value shapes (no noise mud),
// soft value changes only as a checkerboard on the band edge, bevels lit from the top left, a 1 px dark outline.
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const hex = (s) => { const n = parseInt(s.slice(1, 7), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; };
/** a 32-bit pixel buffer painted with hex colours, then put on a canvas */
class Pix {
  constructor(w, h, c = null) { this.w = w; this.h = h; this.c = c || canvas(w, h); this.g = this.c.getContext('2d'); this.img = c ? this.g.getImageData(0, 0, w, h) : this.g.createImageData(w, h); this.d = new Uint32Array(this.img.data.buffer); this.cache = new Map(); }
  set(x, y, col) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; let v = this.cache.get(col); if (v == null) { v = hex(col); this.cache.set(col, v); } this.d[y * this.w + x] = v; }
  clear(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = 0; }
  done() { this.g.putImageData(this.img, 0, 0); return this.c; }
}
const smooth = (t) => t * t * (3 - 2 * t);
/** smooth value noise in 0..1 at cell size s (big, clean shapes) */
function vnoise(x, y, s, seed) { const X = x / s, Y = y / s, i = Math.floor(X), j = Math.floor(Y), u = smooth(X - i), v = smooth(Y - j); const a = h2(i, j, seed), b = h2(i + 1, j, seed), c = h2(i, j + 1, seed), d = h2(i + 1, j + 1, seed); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
/** a continuous tone (float) -> a ramp index; the band edges get a 1 px checkerboard so the value turns softly but stays crisp */
const band = (t, x, y, lo = 0, hi = 99) => { const f = t - Math.floor(t); let k = Math.floor(t); if (f > 0.42 && f < 0.58 && (x + y) % 2) k++; return Math.max(lo, Math.min(hi, k)); };

const VELLUM = ['#4e3018', '#7a5530', '#a37c4c', '#c49e68', '#dcbc84', '#ead09c', '#f4e2b8', '#fbf0d4'];
const WALNUT = ['#0e0706', '#24130c', '#3a2014', '#53301c', '#6e4226', '#8c5a34'];
const NAVY = ['#05060f', '#0a0e22', '#111838', '#1a2450', '#25336a', '#344686'];
/** parchment: a sheet of vellum with broad light, a darkened deckle near the edges, a few fibres and foxing spots */
function vellum(P, w, h, seed) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = vnoise(x, y, 96, seed) * 0.7 + vnoise(x, y, 34, seed + 3) * 0.3; const e = Math.min(x, y, w - 1 - x, h - 1 - y); const vig = Math.max(0, 1 - e / 30) ** 2;
    const lift = (1 - y / h) * 0.5; // light falls from the top
    P.set(x, y, VELLUM[band(4.55 + (n - 0.5) * 1.1 + lift - vig * 2.2, x, y, 2, 6)]);
  }
  for (let i = 0; i < (w * h) / 520; i++) { const x = (h2(i, 1, seed) * w) | 0, y = (h2(i, 2, seed) * h) | 0, L = 3 + ((h2(i, 3, seed) * 7) | 0); const up = h2(i, 4, seed) > 0.4; for (let k = 0; k < L; k++) { const X = x + k, Y = y + (k > L / 2 && h2(i, 5, seed) > 0.7 ? 1 : 0); const cur = P.d[Y * w + X]; if (cur == null) continue; const idx = VELLUM.findIndex((c) => hex(c) === cur); if (idx > 1) P.set(X, Y, VELLUM[Math.max(2, Math.min(7, idx + (up ? 1 : -1)))]); } } // fibres: short streaks one tone up or down
  for (let i = 0; i < 2 + ((w * h) / 16000 | 0); i++) { const cx = (h2(i, 7, seed) < 0.5 ? 14 + h2(i, 8, seed) * w * 0.25 : w - 14 - h2(i, 8, seed) * w * 0.25), cy = 14 + h2(i, 9, seed) * (h - 28), r = 1.6 + h2(i, 10, seed) * 2.6; // foxing: a soft brown ring
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y * 1.15); const X = Math.round(cx + x), Y = Math.round(cy + y); if (d <= r - 1) P.set(X, Y, VELLUM[3]); else if (d <= r + 0.2) P.set(X, Y, VELLUM[2]); else if (d <= r + 1.2 && (X + Y) % 2) P.set(X, Y, VELLUM[3]); } }
}
/** the lapis star chart: a deep night with a soft nebula, pixel stars (a few with crossed glints) and a dotted grid */
function lapis(P, w, h, seed) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = vnoise(x, y, 70, seed) * 0.7 + vnoise(x, y, 26, seed + 5) * 0.3; const e = Math.min(x, y, w - 1 - x, h - 1 - y); const vig = Math.max(0, 1 - e / 30) ** 2; P.set(x, y, NAVY[band(2.2 + (n - 0.5) * 2.4 - vig * 1.6, x, y, 0, 5)]); }
  for (let x = 12; x < w; x += 24) for (let y = 0; y < h; y += 2) P.set(x, y, NAVY[3]); for (let y = 12; y < h; y += 24) for (let x = 0; x < w; x += 2) P.set(x, y, NAVY[3]);
  for (let i = 0; i < (w * h) / 110; i++) { const x = (h2(i, 1, seed) * w) | 0, y = (h2(i, 2, seed) * h) | 0, s = h2(i, 3, seed); P.set(x, y, s > 0.86 ? '#e8ecff' : s > 0.55 ? '#7c8cc8' : '#4a5a98'); if (s > 0.975) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) P.set(x + dx, y + dy, '#8a9ae0'); P.set(x, y, '#ffffff'); } }
}
/** a bevelled brass shape from a signed distance function (negative inside), lit from the top left; M = 7-tone ramp */
function brassShape(P, x0, y0, w, h, sdf, M, { fx = 1, fy = 1, outline = '#140a06', face = null } = {}) {
  const at = (x, y) => sdf(x + 0.5, y + 0.5);
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const d = at(x, y); const X = fx > 0 ? x0 + x : x0 - x, Y = fy > 0 ? y0 + y : y0 - y;
    if (d > 0) { if (at(x - 1, y) <= 0 || at(x + 1, y) <= 0 || at(x, y - 1) <= 0 || at(x, y + 1) <= 0) P.set(X, Y, outline); continue; }
    const gx = (at(x + 1, y) - at(x - 1, y)) * fx, gy = (at(x, y + 1) - at(x, y - 1)) * fy; const L = Math.hypot(gx, gy) || 1; const lit = (-gx - gy) / (L * 1.414); // +1 faces the light
    let t; if (d > -1.01) t = lit > 0.35 ? 6 : lit > -0.2 ? 4 : 2; else if (d > -2.01) t = lit > 0.35 ? 5 : lit > -0.2 ? 4 : 3; else t = face ? face(x, y, d) : (x + y < (w + h) * 0.32 ? 5 : 4);
    P.set(X, Y, M[t]);
  }
}
const sdBox = (x, y, cx, cy, hw, hh, r = 0) => { const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const sdCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
function rivet(P, x, y, M) { P.set(x - 1, y - 1, M[6]); P.set(x, y - 1, M[5]); P.set(x + 1, y - 1, M[4]); P.set(x - 1, y, M[5]); P.set(x, y, M[4]); P.set(x + 1, y, M[2]); P.set(x - 1, y + 1, M[4]); P.set(x, y + 1, M[2]); P.set(x + 1, y + 1, M[1]); }
/** an L-shaped cast corner bracket with a round boss and rivet (20 x 20 art px), mirrored into each corner */
function cornerPiece(P, cx, cy, fx, fy, M) {
  const sdf = (x, y) => { const tip = (u) => Math.max(0, u - 13) * 0.55; const a = sdBox(x, y, 11, 4.5, 10, 3.5 - tip(x), 1); const b = sdBox(x, y, 4.5, 11, 3.5 - tip(y), 10, 1); const c = sdCircle(x, y, 8.5, 8.5, 5.2); return Math.min(a, b, c); };
  brassShape(P, cx, cy, 22, 22, sdf, M, { fx, fy, face: (x, y, d) => { const r = Math.hypot(x + 0.5 - 8.5, y + 0.5 - 8.5); if (Math.abs(r - 3.6) < 0.55) return 2; return x + y < 13 ? 5 : 4; } });
  rivet(P, cx + fx * 8, cy + fy * 8, M);
}
/** a framed folio: a carved walnut moulding with a brass fillet and cast corner brackets around vellum (theme 'parch'),
 *  or a navy moulding with silver fittings around a lapis star chart (theme 'night'); w x h art px */
export function folio(w, h, { theme = 'parch', seed = 1, frame = 'full' } = {}) {
  const night = theme === 'night'; const P = new Pix(w, h); if (night) lapis(P, w, h, seed); else vellum(P, w, h, seed);
  if (frame === 'none') return P.done();
  const M = night ? SILVER : BRASS; const Wd = night ? NAVY : WALNUT; const thin = frame === 'thin'; const B = thin ? 0 : 5;
  const inner = B + 3; // frame width; the sheet starts at d = inner
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.min(x, y, w - 1 - x, h - 1 - y); if (d > inner + 1) continue; const tl = Math.min(x, y) === d && !(x === d && h - 1 - y < d) && !(y === d && w - 1 - x < d); const u = (x === d || w - 1 - x === d) ? y : x;
    let c = null;
    if (d === 0) c = '#0a0507';
    else if (d <= B) { const prof = tl ? [0, 4, 3, 1, 3, 2][d] : [0, 2, 2, 0, 3, 4][d]; const grain = h2(Math.floor(u / 7), d * 3 + (tl ? 0 : 1), seed + 9); c = Wd[Math.max(0, Math.min(5, prof + (grain > 0.84 ? -1 : grain < 0.08 ? 1 : 0)))]; }
    else if (d === B + 1) c = tl ? M[6] : M[3]; else if (d === B + 2) c = tl ? M[4] : M[2]; else if (d === B + 3) c = '#140a06';
    else if (d === inner + 1 && tl && !night) c = VELLUM[2]; // the sheet sits under the frame: a soft shadow on the lit side
    if (c) P.set(x, y, c);
  }
  if (!thin) { for (let x = 30; x < w - 26; x += 36) { rivet(P, x, 3, M); rivet(P, x, h - 4, M); } for (let y = 30; y < h - 26; y += 36) { rivet(P, 3, y, M); rivet(P, w - 4, y, M); }
    cornerPiece(P, 0, 0, 1, 1, M); cornerPiece(P, w - 1, 0, -1, 1, M); cornerPiece(P, 0, h - 1, 1, -1, M); cornerPiece(P, w - 1, h - 1, -1, -1, M); }
  else { for (const [x, y] of [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]]) rivet(P, x, y, M); }
  return P.done();
}
/** a cast brass (or silver, or red-enamel) push plaque, w x 20 art px: bevelled edge, an engraved inner line, two rivets */
export function plaque(w, { night = false, red = false } = {}) {
  const M = red ? ['#1c040e', '#480a1a', '#821424', '#bc2a2c', '#e25a40', '#fca07a', '#ffd0b8'] : night ? SILVER : BRASS; const P = new Pix(w, 20);
  const sdf = (x, y) => sdBox(x, y, w / 2, 10, w / 2 - 1, 9, 4);
  brassShape(P, 0, 0, w, 20, sdf, M, { face: (x, y) => { const e = sdBox(x + 0.5, y + 0.5, w / 2, 10, w / 2 - 4.5, 5.5, 2); if (Math.abs(e) < 0.5) return y < 10 && x < w - 6 ? 1 : 1; if (e > 0.4 && e < 1.5 && (y >= 15 || x >= w - 5)) return 6; return y < 6 ? 6 : y < 9 ? 5 : y < 14 ? 4 : 3; } });
  rivet(P, 6, 10, M); rivet(P, w - 7, 10, M);
  return P.done();
}
const ICONS = { // 11 x 11 hand-pixelled glyphs. k: outline; a..e: ramp dark -> light (e = highlight); x/y/z: accent mid/dark/light; g/h: leaf
  star: ['.....k.....', '....kek....', '....kedk...', 'kkkkkeddkkk', 'keeeedddcak', '.keeddddak.', '..kdddcak..', '..kddkcak..', '.kdck.kcak.', '.kck...kak.', '.kk.....kk.'],
  coin: ['...kkkkk...', '.kkeeeddkk.', '.keddddddk.', 'kedcbbbbcdk', 'kedbcccbcck', 'kddbcecbcck', 'kddbcccbcbk', 'kcdcbbbbcbk', '.kccccccbk.', '.kkbbbbbkk.', '...kkkkk...'],
  card: ['kkkkkkkk...', 'keeeeeedk..', 'kezzzzzdk..', 'kezxzxzdkk.', 'kezzxzzdkck', 'kezxzxzdkck', 'kezzzzzdkck', 'keddddddkck', 'kecdcdcdkck', 'kkkkkkkkkck', '..kccccccck'],
  cup: ['kkkkkkkkkkk', 'kkeeeddcckk', 'k.keeddcbk.', 'kkkedddcbkk', '..keddcbk..', '...kedck...', '....kdk....', '....kck....', '...kdcck...', '..keddccbk.', '..kkkkkkkk.'],
  apple: ['.....kk.kk.', '.....kbkghk', '..kkkkbkkk.', '.kzzxxkxxxk', 'kzezxxxxxyk', 'kzzxxxxxxyk', 'kxzxxxxxyyk', 'kxxxxxxxyyk', '.kxxxxxyyk.', '..kyyyyyk..', '...kk.kk...'],
  flask: ['...kkkkk...', '...keddk...', '....kek....', '....kdk....', '...kedck...', '..kezzzck..', '.kzezzzzyk.', 'kzzzzzzzzyk', 'kzxzzzzzxyk', 'kyxxxxxxyyk', '.kkkkkkkkk.'],
  lock: ['...kkkkk...', '..kdddddk..', '.kdk...kck.', '.kdk...kck.', 'kkkkkkkkkkk', 'keeeeddddck', 'kedddkddcbk', 'kedddkddcbk', 'keddddddcbk', 'kdccccccbbk', 'kkkkkkkkkkk'],
};
export function icon(name, { ramp = BRASS, accent = '#c8302c', scale = 1 } = {}) {
  const m = ICONS[name] || ICONS.star; const w = m[0].length, h = m.length; const P = new Pix(w, h); const ac = parseInt(accent.slice(1), 16); const mix = (k) => '#' + [16, 8, 0].map((s) => Math.max(0, Math.min(255, Math.round(((ac >> s) & 255) * k + (k > 1 ? (k - 1) * 120 : 0))))).map((v) => v.toString(16).padStart(2, '0')).join('');
  const map = { k: '#140a06', a: ramp[1], b: ramp[2], c: ramp[3], d: ramp[4], e: ramp[6] || ramp[5], x: accent, y: mix(0.6), z: mix(1.3), g: '#7ab048', h: '#3a6a28' };
  m.forEach((row, y) => { for (let x = 0; x < w; x++) { const ch = row[x]; if (ch !== '.' && map[ch]) P.set(x, y, map[ch]); } }); const c = P.done(); c.className = 'lf-cv'; c.dataset.w = w * scale; c.dataset.h = h * scale; return c;
}
/** a glass-and-brass gauge filled with liquid light (gold, or teal for night), w x 9 art px */
export function bar(w, frac, { night = false, done = false } = {}) {
  const P = new Pix(w, 9); const M = night ? SILVER : BRASS; const L = done ? ['#4a2a06', '#a06a10', '#e0a020', '#ffd84a', '#fff4b0', '#ffffff'] : night ? ['#06202c', '#0e4a5e', '#1a8296', '#46c8c8', '#a8f4e8', '#ffffff'] : ['#3a1606', '#8a420e', '#c87a1c', '#eeb03a', '#ffe08a', '#fff8d8'];
  const fw = Math.round((w - 4) * Math.max(0, Math.min(1, frac)));
  for (let y = 0; y < 9; y++) for (let x = 0; x < w; x++) {
    const corner = (x === 0 || x === w - 1) && (y === 0 || y === 8); if (corner) continue; let c;
    if (y === 0 || y === 8 || x === 0 || x === w - 1) c = '#140a06';
    else if (y === 1) c = x === 1 ? M[5] : M[6]; else if (y === 7) c = x === w - 2 ? M[2] : M[3]; else if (x === 1) c = M[4]; else if (x === w - 2) c = M[2];
    else { const i = x - 2; if (i < fw) { c = L[[4, 3, 3, 2, 1][y - 2]]; if (y === 3 && i % 7 < 4 && i > 1 && i < fw - 2) c = L[4]; if (i === fw - 1) c = L[y < 5 ? 4 : 3]; if (done && y === 4 && h2(i, 3, 7) > 0.86) c = L[5]; }
      else { c = y === 2 ? (night ? '#05060f' : '#1c0e08') : night ? NAVY[2] : '#3a2214'; if (y === 2 && i % 10 === 9) c = night ? NAVY[4] : '#5e3a22'; } }
    P.set(x, y, c);
  }
  const c = P.done(); c.className = 'lf-cv'; c.dataset.w = w; c.dataset.h = 9; return c;
}
/** a scrolled divider: a hairline with a brass lozenge in the middle and tapering flourishes, w x 7 art px */
export function divider(w, { night = false } = {}) {
  const P = new Pix(w, 7); const M = night ? SILVER : BRASS; const ink = night ? NAVY[4] : '#6a4428'; const m = w >> 1;
  for (let x = 4; x < w - 4; x++) { const t = Math.abs(x - m) / (m - 4); P.set(x, 3, ink); if (t < 0.55) P.set(x, 4, night ? NAVY[2] : '#c49e68'); if (t < 0.3 && (x % 2)) P.set(x, 2, ink); }
  for (const s of [-1, 1]) { const x = m + s * 10; P.set(x, 2, ink); P.set(x + s, 1, ink); P.set(x + 2 * s, 1, ink); P.set(x, 4, ink); P.set(x + s, 5, ink); P.set(x + 2 * s, 5, ink); }
  brassShape(P, m - 4, 0, 9, 7, (x, y) => Math.abs(x - 4.5) / 4.5 + Math.abs(y - 3.5) / 3.5 - 1, M);
  const c = P.done(); c.className = 'lf-cv'; c.dataset.w = w; c.dataset.h = 7; return c;
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
