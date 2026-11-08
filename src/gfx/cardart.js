// Card faces: polished pixel frames (2x density) + illustrations rendered from detailed 3D models
// through the Forge stylizer. Text is set at final resolution for legibility.
import * as THREE from 'three';
import { PixelCanvas } from './pixel.js';
import { R, INK } from './palette.js';
import { BASICS, POWERS, KIND_LABEL } from '../game/data/cards.js';
import { baseOf, describeAttack } from '../game/combos.js';
import { roman, mulberry32, hashString } from '../core/util.js';
import { getForge } from './forge.js';
import * as P3 from '../models/props3d.js';

export const CW = 240, CH = 336, CS = 2;
const AX = 14, AY = 42, AW = 212, AH = 126;
let forgeRenderer = null;
export function setForgeRenderer(r) { forgeRenderer = r; }

// ---------- 3D subjects for each card ----------
const G = () => new THREE.Group();
const add = (g, o, x = 0, y = 0, z = 0, s = 1, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.set(rx, ry, rz); g.add(o); return o; };
const SUBJ = {
  apple: () => { const g = G(); add(g, P3.apple(), 0, 0, 0, 1, 0.15, 0.6, -0.1); return g; },
  golden_apple: () => { const g = G(); add(g, P3.apple({ kind: 'gold' }), 0, 0, 0, 1, 0.15, 0.6, -0.1); add(g, P3.sparkArcs(0xfff0a0, 4), 0, 0, 0.2, 1.2); return g; },
  rotten_apple: () => { const g = G(); add(g, P3.apple({ kind: 'rotten' }), 0, 0, 0, 1, 0.2, 1.2, 0.2); return g; },
  superposition: () => { const g = G(); add(g, P3.apple(), -0.25, 0, 0, 0.9, 0.1, 0.6); const ghost = P3.apple({ kind: 'green' }); ghost.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; } }); add(g, ghost, 0.35, 0.1, -0.3, 0.9); add(g, P3.bolt(), 0.05, 0.05, 0.4, 0.45, 0, 0, -0.3); return g; },
  stone: () => { const g = G(); add(g, P3.stone({ seed: 3 }), 0, 0, 0, 1, 0, 0.4); return g; },
  pumice: () => { const g = G(); add(g, P3.stone({ seed: 8, kind: 'pumice' }), 0, 0, 0, 1, 0.2, 0.2); return g; },
  lodestone: () => { const g = G(); add(g, P3.stone({ seed: 5, kind: 'lodestone' }), 0, -0.1, 0, 1); for (let i = 0; i < 3; i++) add(g, P3.swirl(0.5 + i * 0.14, 0xff6a50), 0, 0.15, 0, 1, -0.6, 0, 0); return g; },
  water: () => { const g = G(); add(g, P3.droplet(), 0, 0.05, 0, 1, 0, 0, 0.12); add(g, P3.drops(5), 0, -0.1, -0.2, 0.9); return g; },
  ice: () => { const g = G(); add(g, P3.crystalCluster({ color: 0xbfeaff, n: 7 }), 0, 0, 0, 1.1); return g; },
  spark: () => { const g = G(); add(g, P3.bolt(), 0, 0, 0, 1, 0, 0.3, -0.12); add(g, P3.sparkArcs(0xfff0a0, 7), 0, 0, 0.1, 1.5); return g; },
  plasma: () => { const g = G(); add(g, P3.flame({ cols: [0x5a2aa0, 0x9a50ff, 0xc8a0ff, 0xffffff] }), 0, 0, 0, 1); add(g, P3.sparkArcs(0xb48cff, 6), 0, 0.1, 0.2, 1.5); return g; },
  gravity: () => { const g = G(); add(g, P3.planet({ kind: 'earth', r: 1.3 }), 0, -1.85, -0.4, 1, 0.3, 0, 0); add(g, P3.apple(), 0, 0.45, 0, 0.55, 0.1, 0.6); add(g, P3.streaks(4, 0.5, 0xffffff, 0.3), 0, 0.95, 0, 1, 0, 0, Math.PI / 2); for (const x of [-0.75, 0.75]) add(g, P3.arrow(0xc8443a, 0.5), x, 0.6, 0, 0.9, 0, 0, Math.PI); return g; },
  antigravity: () => { const g = G(); add(g, P3.apple(), 0, 0.1, 0, 0.6, 0.1, 0.6); for (const x of [-0.7, 0.7]) add(g, P3.arrow(0x4fa79a, 0.6), x, -0.5, 0, 0.9); add(g, P3.planet({ kind: 'earth', r: 1.2 }), 0, -1.9, -0.6, 1); return g; },
  mass: () => { const g = G(); add(g, P3.weight(), 0, 0, 0, 1, 0.12, -0.45); return g; },
  dark_matter: () => { const g = G(); add(g, P3.weight({ dark: true, label: '? kg' }), 0, 0, 0, 1, 0.12, -0.45); add(g, P3.sparkArcs(0xb48cff, 5), 0, 0, 0.3, 1.4); return g; },
  force: () => { const g = G(); add(g, P3.fist(), 0.25, 0, 0, 1, 0.2, -0.5, 0); add(g, P3.streaks(6, 1.1, 0xffffff, 0.6), -0.55, 0, 0.1, 1, 0, -0.5, 0); return g; },
  brute_force: () => { const g = G(); add(g, P3.fist({ brutal: true }), 0.25, 0, 0, 1.1, 0.2, -0.5, 0); add(g, P3.streaks(8, 1.3, 0xff8060, 0.8), -0.55, 0, 0.1, 1, 0, -0.5, 0); return g; },
  rotation: () => { const g = G(); add(g, P3.top(), 0, 0, 0, 1, 0.25, 0, 0.1); add(g, P3.swirl(0.72, 0xffffff), 0, -0.05, 0, 1); return g; },
  torque: () => { const g = G(); add(g, P3.top({ cols: ['#8f2a2e', '#f2c14e', '#8f2a2e', '#f2c14e', '#1a1220', '#f2c14e'] }), 0, 0, 0, 1, 0.3, 0, -0.15); add(g, P3.swirl(0.6, 0xf2c14e), 0, 0, 0, 1); add(g, P3.swirl(0.85, 0xffffff), 0, 0, 0, 1, 0.3); return g; },
  inertia: () => { const g = G(); add(g, P3.rollingBall(), 0, 0, 0, 1, 0.1, -0.3); add(g, P3.streaks(5, 1.0, 0xfff0c0, 0.45), -0.45, 0.1, 0, 1, 0, -0.3); return g; },
  momentum: () => { const g = G(); add(g, P3.rollingBall({ kind: 'snow' }), 0, 0, 0, 1.1, 0.1, -0.3); add(g, P3.streaks(5, 1.2, 0xffffff, 0.5), -0.5, 0.1, 0, 1, 0, -0.3); return g; },
  heat: () => { const g = G(); add(g, P3.brazier(), 0, 0, 0, 1, 0.2, 0); return g; },
  lens: () => { const g = G(); add(g, P3.magnifier(), 0, 0, 0, 1, 0.25, -0.35, 0.1); return g; },
  prism: () => { const g = G(); add(g, P3.prism(), 0, 0, 0, 1, 0.2, -0.25, 0); return g; },
  spring: () => { const g = G(); add(g, P3.spring(), 0, 0, 0, 1, 0.3, 0.3); return g; },
  slinky: () => { const g = G(); add(g, P3.spring({ rainbow: true }), 0, 0, 0, 1, 0.3, 0.3); return g; },
  first_law: () => { const g = G(); add(g, P3.rollingBall(), 0, 0, 0, 0.9, 0.15, -0.6); add(g, P3.streaks(7, 1.6, 0x8fe3ff, 0.5), -0.6, 0.1, 0, 1, 0, -0.6); return g; },
  third_law: () => { const g = G(); add(g, P3.cradle(), 0, 0, 0, 1, 0.18, -0.35); return g; },
  gravitation: () => { const g = G(); add(g, P3.planet({ kind: 'earth', r: 0.55 }), -0.3, -0.05, 0, 1, 0.3, 0.5); add(g, P3.planet({ kind: 'moon', r: 0.18 }), 0.75, 0.25, -0.2, 1); add(g, P3.apple(), 0.2, 0.55, 0.3, 0.22); add(g, P3.swirl(0.95, 0x8fe3ff), -0.1, 0, 0, 1, 0.5); return g; },
  calculus: () => { const g = G(); add(g, P3.chalkboard(), 0, 0, 0, 1, 0.08, -0.3); return g; },
  thermo: () => { const g = G(); add(g, P3.steamEngine(), 0, 0, 0, 1, 0.2, -0.4); return g; },
  orbit: () => { const g = G(); add(g, P3.orrery(), 0, 0, 0, 1, 0.25, -0.3); return g; },
};

function coreModel(id) {
  const b = baseOf(id);
  if (id === 'golden_apple') return P3.apple({ kind: 'gold' }); if (id === 'rotten_apple') return P3.apple({ kind: 'rotten' });
  if (id === 'pumice') return P3.stone({ kind: 'pumice', seed: 8 }); if (id === 'lodestone') return P3.stone({ kind: 'lodestone', seed: 5 });
  if (id === 'ice') return P3.crystalCluster({ color: 0xbfeaff });
  return ({ apple: () => P3.apple(), stone: () => P3.stone(), water: () => P3.droplet(), spark: () => P3.bolt(), heat: () => P3.flame(), mass: () => P3.weight(), force: () => P3.fist(), rotation: () => P3.top(), inertia: () => P3.rollingBall(), lens: () => P3.magnifier(), spring: () => P3.spring(), gravity: () => P3.planet({ kind: 'moon', r: 0.5 }) }[b] || (() => P3.apple()))();
}
function moveSubject(art) {
  const g = G(); const hot = art.hot && baseOf(art.core) === 'stone';
  const core = hot ? P3.stone({ kind: 'lava' }) : coreModel(art.core);
  const s = 0.85 + Math.min(3, art.heavy) * 0.16; add(g, core, 0, 0, 0, s, 0.15, art.fast ? -0.6 : 0.5, art.spin ? 0.4 : 0);
  if (art.falling) { add(g, P3.streaks(4, 0.7, 0xffffff, 0.45), 0, 0.55 * s + 0.2, 0, 1, 0, 0, -Math.PI / 2); add(g, P3.arrow(0xc8443a, 0.4), 0.8, 0.5, 0, 0.8, 0, 0, Math.PI); }
  if (art.fast) add(g, P3.streaks(6, 1.1, 0xffffff, 0.6), -0.55 * s, 0, 0.05, 1);
  if (art.rolling) add(g, P3.streaks(4, 0.9, 0xfff0c0, 0.3), -0.5 * s, -0.35 * s, 0, 1);
  if (art.spin) add(g, P3.swirl(0.7 * s, 0xffffff), 0, 0, 0, 1);
  if (art.hot && !hot) { add(g, P3.flame({ scale: 0.5 }), -0.45, -0.2, 0.25); add(g, P3.flame({ scale: 0.4 }), 0.45, -0.25, 0.2); }
  if (art.electric && baseOf(art.core) !== 'spark') add(g, P3.sparkArcs(0xfff0a0, 6), 0, 0, 0.3, 1.6);
  if (art.wet && baseOf(art.core) !== 'water') add(g, P3.drops(6), 0, 0, 0.2, 1);
  if (art.focus && baseOf(art.core) !== 'lens') add(g, P3.magnifier(), 0.75, 0.3, 0.5, 0.45, 0, -0.3, 0.2);
  if (art.bouncy && baseOf(art.core) !== 'spring') add(g, P3.spring(), 0, -0.75 * s, 0, 0.4);
  if (art.heavy >= 2) add(g, P3.weight(), -0.85, -0.4, -0.2, 0.35, 0.1, 0.4);
  return g;
}

// ---------- backdrops (banded, painterly, per kind) ----------
const BG = {
  matter: ['#5a1a22', '#8f2a2e', '#c8443a', '#e0704a', '#f2a65a', '#f6c98a'],
  law: ['#16304f', '#1f4a78', '#2f6aa0', '#4f8fc0', '#7fb6dc', '#b8dcf0'],
  energy: ['#3a1f08', '#6b3f12', '#a8671c', '#d99a2b', '#f2c14e', '#ffe08a'],
  tool: ['#0f2b2c', '#163b3c', '#2d6e6a', '#4fa79a', '#8fd3c0', '#d0f0e4'],
  move: ['#14301c', '#22482a', '#35683a', '#4f8a48', '#86b45a', '#c4dc8a'],
  power: ['#0b0716', '#140d26', '#22183f', '#3e2b6b', '#6b4c9a', '#9b7cc8'],
  special: ['#0b0716', '#1a1030', '#3a1f5a', '#6b3a8a', '#b0609a', '#f2a6a0'],
};
function backdrop(pc, kind, seed) {
  const ramp = BG[kind] || BG.matter; const cx = AX + AW / 2, cy = AY + AH * 0.42; const rnd = mulberry32(seed);
  for (let y = AY; y < AY + AH; y++) for (let x = AX; x < AX + AW; x++) {
    const d = Math.hypot((x - cx) / (AW * 0.62), (y - cy) / (AH * 0.75));
    const v = 1 - Math.min(1, d); const k = Math.min(ramp.length - 1, Math.floor(v * v * (ramp.length - 0.01) + 0.6));
    pc.px(x, y, ramp[k]);
  }
  if (kind === 'law') for (let x = AX; x < AX + AW; x += 12) for (let y = AY; y < AY + AH; y++) if ((y & 1) === 0) pc.px(x, y, ramp[Math.min(5, 3)]);
  if (kind === 'law') for (let y = AY + 6; y < AY + AH; y += 12) for (let x = AX; x < AX + AW; x++) if ((x & 1) === 0) pc.px(x, y, ramp[3]);
  if (kind === 'matter' || kind === 'energy' || kind === 'move') for (let a = 0; a < 24; a++) { const ang = (a / 24) * Math.PI * 2; for (let r = 30; r < 160; r += 1) { if (a % 2) continue; const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.7; if (x >= AX && x < AX + AW && y >= AY && y < AY + AH) { const cur = pc.get(x | 0, y | 0); if (cur) pc.px(x, y, ramp[Math.min(ramp.length - 1, ramp.indexOf(toHex(cur)) + 1)] || ramp[ramp.length - 1]); } } }
  if (kind === 'power' || kind === 'special' || kind === 'tool') for (let i = 0; i < 70; i++) { const x = AX + rnd() * AW, y = AY + rnd() * AH; const c = rnd() < 0.3 ? '#e8fbff' : rnd() < 0.5 ? '#ffe08a' : ramp[5]; pc.px(x, y, c); if (rnd() < 0.15) { pc.px(x + 1, y, c); pc.px(x - 1, y, c); pc.px(x, y + 1, c); pc.px(x, y - 1, c); } }
  // ground glow + contact shadow
  pc.ellipse(cx, AY + AH - 18, 52, 9, ramp[1]); pc.ellipse(cx, AY + AH - 18, 38, 6, ramp[0]);
}
function toHex(v) { const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255; return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }

// ---------- frame ----------
const KIND_COLORS = { matter: R.red, law: R.sky, energy: R.mustard, tool: R.teal, move: R.leaf, power: R.purple };
function roundRect(pc, x, y, w, h, r, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = Math.max(0, r - i, i - (w - 1 - r)), dy = Math.max(0, r - j, j - (h - 1 - r)); if (dx * dx + dy * dy <= r * r + 1) pc.px(x + i, y + j, c); } }
function bevelBox(pc, x, y, w, h, ramp, r = 0) {
  roundRect(pc, x, y, w, h, r, ramp[1]); roundRect(pc, x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1), ramp[3]);
  pc.gradient(x + 2, y + 2, w - 4, h - 4, [ramp[4], ramp[3], ramp[2]], 'v', 0.6);
  pc.fillRect(x + 2, y + 2, w - 4, 1, ramp[5] || ramp[4]);
}
function frame(pc, kind, upgraded, seed) {
  const ramp = KIND_COLORS[kind] || R.red; const trim = upgraded ? R.gold : R.brass;
  pc.clear(0);
  roundRect(pc, 0, 0, CW, CH, 10, INK);
  roundRect(pc, 2, 2, CW - 4, CH - 4, 9, trim[2]);
  roundRect(pc, 3, 3, CW - 6, CH - 6, 8, trim[4]);
  roundRect(pc, 5, 5, CW - 10, CH - 10, 7, trim[1]);
  // coloured panel with fine texture
  const rnd = mulberry32(seed);
  for (let y = 7; y < CH - 7; y++) for (let x = 7; x < CW - 7; x++) { const t = (y - 7) / (CH - 14); let k = 3 - Math.round(t * 2 + (rnd() < 0.08 ? 1 : 0)); if (((x + y) & 3) === 0 && rnd() < 0.3) k = Math.max(0, k - 1); pc.px(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, k))]); }
  pc.rect(9, 9, CW - 18, CH - 18, ramp[4] || ramp[3]);
  if (kind === 'power') for (let i = 0; i < 90; i++) pc.px(10 + rnd() * (CW - 20), 10 + rnd() * (CH - 20), rnd() < 0.5 ? R.purple[5] : R.glow[4]);
  // corner studs
  for (const [x, y] of [[9, 9], [CW - 14, 9], [9, CH - 14], [CW - 14, CH - 14]]) { pc.disc(x + 2.5, y + 2.5, 3, INK); pc.ball(x + 2.5, y + 2.5, 2.5, 2.5, trim, { ditherAmt: 0 }); }
  // art window frame
  roundRect(pc, AX - 4, AY - 4, AW + 8, AH + 8, 4, INK);
  roundRect(pc, AX - 3, AY - 3, AW + 6, AH + 6, 3, trim[4]); roundRect(pc, AX - 2, AY - 2, AW + 4, AH + 4, 2, trim[2]); pc.fillRect(AX - 1, AY - 1, AW + 2, AH + 2, INK);
  // title ribbon with folded tails
  const ry = 10, rh = 26;
  pc.poly([[4, ry + 6], [22, ry + 6], [22, ry + rh + 4], [4, ry + rh + 4], [10, ry + rh / 2 + 5]], trim[1]);
  pc.poly([[CW - 4, ry + 6], [CW - 22, ry + 6], [CW - 22, ry + rh + 4], [CW - 4, ry + rh + 4], [CW - 10, ry + rh / 2 + 5]], trim[1]);
  roundRect(pc, 16, ry - 1, CW - 32, rh + 2, 3, INK);
  pc.gradient(17, ry, CW - 34, rh, [trim[5], trim[4], trim[3], trim[2]], 'v', 0.5);
  pc.fillRect(19, ry + 2, CW - 38, 1, '#fff6cf'); pc.fillRect(17, ry + rh - 2, CW - 34, 1, trim[1]);
  // type plaque
  roundRect(pc, 62, 172, CW - 124, 18, 3, INK); pc.gradient(63, 173, CW - 126, 16, [R.paper[5], R.paper[4], R.paper[3]], 'v', 0.5);
  for (const x of [66, CW - 69]) { pc.disc(x, 181, 2, trim[1]); pc.px(x - 1, 180, trim[5]); }
  // text box parchment
  roundRect(pc, 12, 194, CW - 24, 112, 5, INK);
  for (let y = 195; y < 305; y++) for (let x = 13; x < CW - 13; x++) { const n = (Math.sin(x * 0.9 + y * 0.13) + Math.sin(y * 0.7 + x * 0.05)) * 0.25 + rnd() * 0.5; const k = n > 0.62 ? 3 : n < 0.12 ? 5 : 4; pc.px(x, y, R.paper[k]); }
  pc.fillRect(13, 195, CW - 26, 2, R.paper[2]); pc.fillRect(13, 195, 2, 110, R.paper[3]);
  // footer tab
  roundRect(pc, CW / 2 - 28, CH - 30, 56, 20, 4, INK); pc.gradient(CW / 2 - 27, CH - 29, 54, 18, [trim[4], trim[3], trim[2]], 'v', 0.5);
}
function medallion(pc, x, y, ramp, trim) {
  pc.disc(x, y, 17, INK); pc.ball(x, y, 16, 16, trim, { ditherAmt: 0.3 }); pc.disc(x, y, 12.5, INK); pc.ball(x, y, 12, 12, ramp, { ditherAmt: 0.25, lx: -0.4, ly: -0.7 });
  pc.ellipse(x - 4, y - 6, 4, 2, '#ffffff99');
}

// ---------- public ----------
const faceCache = new Map();
export function cardFaceKey(card, move) { return card.type === 'move' ? `move:${move?.key}:${card.up || 0}:${card.name || ''}` : `${card.type || 'basic'}:${card.petrified ? 'stone' : card.id}:${card.up || 0}`; }

const artCache = new Map();
function illustration(key, build, kind, seed, opts = {}) {
  if (!artCache.has(key)) {
    const pc = new PixelCanvas(CW, CH);
    backdrop(pc, kind, seed);
    try {
      const half = getForge(forgeRenderer).paint(build(), { w: AW / 2, h: AH / 2, fit: opts.fit ?? 0.78, yaw: opts.yaw ?? 0.35, pitch: opts.pitch ?? 0.2, offset: [0, opts.oy ?? 0.06], levels: 4, satBoost: 1.3 });
      for (let y = 0; y < half.h; y++) for (let x = 0; x < half.w; x++) { const v = half.get(x, y); if (v >>> 24) { pc.px(AX + x * 2, AY + y * 2, v); pc.px(AX + x * 2 + 1, AY + y * 2, v); pc.px(AX + x * 2, AY + y * 2 + 1, v); pc.px(AX + x * 2 + 1, AY + y * 2 + 1, v); } }
    } catch (e) { console.warn('forge failed', key, e); }
    artCache.set(key, pc);
  }
  return artCache.get(key);
}

export function renderCardFace(card, move) {
  const key = cardFaceKey(card, move);
  if (faceCache.has(key)) return faceCache.get(key);
  const isPower = card.type === 'power', isMove = card.type === 'move';
  const id = card.petrified ? 'stone' : card.id;
  const def = isPower ? POWERS[id] : isMove ? null : BASICS[id];
  const kind = isPower ? 'power' : isMove ? 'move' : def.kind;
  const seed = hashString(key);
  const pc = new PixelCanvas(CW, CH);
  frame(pc, kind, card.up > 0, seed);
  const ill = isMove ? illustration('m:' + move.key, () => moveSubject(move.art), move.special ? 'special' : 'move', seed)
    : illustration('c:' + id, SUBJ[id] || SUBJ[def?.mutantOf] || SUBJ.apple, kind, seed);
  for (let y = AY; y < AY + AH; y++) for (let x = AX; x < AX + AW; x++) { const v = ill.get(x, y); if (v) pc.px(x, y, v); }
  const medal = [];
  if (!isPower) {
    if (isMove) { if (move.attack.m) medal.push(['MASS', move.attack.m, R.red], ['VEL', move.attack.v, R.sky]); }
    else {
      const up = card.up > 0; const S = (k) => (up && def.up?.[k] !== undefined ? def.up[k] : def[k]);
      if (def.kind === 'matter') medal.push(['MASS', S('m'), R.red], ['VEL', S('v'), R.sky]);
      else {
        if (S('dm')) medal.push(['+MASS', S('dm'), R.red]); if (S('dv')) medal.push(['+VEL', S('dv'), R.sky]);
        if (S('hits')) medal.push(['HITS', '+' + S('hits'), R.teal]); if (S('charge')) medal.push(['ZAP', S('charge'), R.mustard]);
        if (S('burn')) medal.push(['BURN', S('burn'), R.fire]); if (S('focus')) medal.push(['MULT', 'x' + S('focus'), R.mustard]);
        if (S('persist')) medal.push(['TURNS', '+' + S('persist'), R.leaf]); if (S('bounce')) medal.push(['BOUNCE', '+' + S('bounce'), R.teal]);
        if (def.prism) medal.push(['ALL', '*', R.purple]);
      }
    }
  }
  const medPos = [[24, 24], [CW - 25, 24]]; const trim = card.up > 0 ? R.gold : R.brass;
  medal.slice(0, 2).forEach((m, i) => medallion(pc, medPos[i][0], medPos[i][1], m[2], trim));
  pc.commit();

  const out = document.createElement('canvas'); out.width = CW * CS; out.height = CH * CS;
  const g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(pc.canvas, 0, 0, out.width, out.height);
  const txt = (s, x, y, size, color, font = 'VT323', align = 'center', weight = 400, stroke = null, sw = 6) => {
    g.font = `${weight} ${size}px "${font}"`; g.textAlign = align; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillStyle = color; g.fillText(s, x, y);
  };
  const fit = (s, maxW, size, font, weight = 400) => { g.font = `${weight} ${size}px "${font}"`; while (g.measureText(s).width > maxW && size > 14) { size -= 2; g.font = `${weight} ${size}px "${font}"`; } return size; };
  const title = (isMove ? card.name || move.name : isPower ? (def.short || def.name) : def.name) + (card.up > 0 ? '+' : '');
  const tsize = fit(title, (CW - 96) * CS, 38, 'Pixelify', 700);
  txt(title, (CW / 2) * CS, 23.5 * CS, tsize, '#fff6cf', 'Pixelify', 'center', 700, '#3a2410', 8);
  medal.slice(0, 2).forEach((m, i) => {
    const [x, y] = medPos[i]; const v = String(m[1]);
    txt(v, x * CS, (y - 1) * CS, v.length > 2 ? 26 : 34, '#fff6cf', 'Pixelify', 'center', 700, '#1a1220', 7);
  });
  const typeLabel = card.petrified ? 'PETRIFIED' : isPower ? 'POWER · LAW' : isMove ? `MOVE · ${move.n} CARDS` : `BASIC · ${KIND_LABEL[def.kind].toUpperCase()}`;
  txt(typeLabel, (CW / 2) * CS, 181.5 * CS, fit(typeLabel, (CW - 140) * CS, 18, 'Silkscreen', 700), '#4a2a16', 'Silkscreen', 'center', 700);
  let lines;
  if (isPower) lines = card.up > 0 ? def.upText : def.text;
  else if (isMove) {
    const a = move.attack; lines = [];
    if (a.perHit > 0) lines.push(`${a.m}kg x ${a.v}m/s${a.focus > 1 ? ' x' + a.focus : ''} = ${a.perHit}${a.hits > 1 ? ' x' + a.hits : ''}`);
    const extra = describeAttack(a).slice(a.perHit > 0 ? 1 : 0).join(' · ');
    if (extra) lines.push(...wrapCanvas(g, extra, (CW - 40) * CS, 34, 'VT323').slice(0, 2));
    const s = move.self; const ss = []; if (s.block) ss.push(`Block ${s.block}`); if (s.heal) ss.push(`Heal ${s.heal}`); if (s.draw) ss.push(`Draw ${s.draw}`);
    if (ss.length && lines.length < 4) lines.push('SELF: ' + ss.join(', '));
    if (move.field.valid && lines.length < 4) lines.push('FIELD: ' + move.field.name);
  } else lines = card.up > 0 && def.upText ? def.upText : def.text;
  lines = lines.slice(0, 4);
  const lh = 25 * CS; const y0 = (lines.length >= 4 ? 212 : 222) * CS;
  lines.forEach((l, i) => {
    const size = fit(l, (CW - 36) * CS, 36, 'VT323');
    const m = l.match(/^([A-Z]+:)(.*)$/);
    if (m) {
      g.font = `400 ${size}px "VT323"`; const w1 = g.measureText(m[1]).width, w2 = g.measureText(m[2]).width; const x0 = (CW / 2) * CS - (w1 + w2) / 2;
      txt(m[1], x0, y0 + i * lh, size, '#8f2a2e', 'VT323', 'left'); txt(m[2], x0 + w1, y0 + i * lh, size, '#2a160c', 'VT323', 'left');
    } else txt(l, (CW / 2) * CS, y0 + i * lh, size, '#2a160c', 'VT323');
  });
  const num = isMove ? (move.special ? '★' : '◆') : def.mutantOf ? roman(BASICS[def.mutantOf].num) + '*' : roman(def.num || 0);
  txt(num, (CW / 2) * CS, (CH - 20) * CS, 26, '#3a2410', 'Pixelify', 'center', 700);
  faceCache.set(key, out);
  return out;
}

function wrapCanvas(g, str, maxW, size, font) {
  g.font = `400 ${size}px "${font}"`; const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

let backCanvas = null;
export function renderCardBack() {
  if (backCanvas) return backCanvas;
  const pc = new PixelCanvas(CW, CH); frame(pc, 'power', false, 42);
  // replace inner area with a cosmic marionette motif
  backdrop(pc, 'power', 9);
  for (let y = 194; y < 306; y++) for (let x = 12; x < CW - 12; x++) pc.px(x, y, ((x + y) & 7) === 0 ? R.purple[3] : R.purple[1]);
  try { const art = getForge(forgeRenderer).paint((() => { const g = G(); add(g, P3.apple(), 0, -0.2, 0, 1); add(g, P3.swirl(0.9, 0x8fe3ff), 0, -0.2, 0, 1, 0.4); return g; })(), { w: AW, h: AH, fit: 0.6 }); pc.blit(art, AX, AY); } catch (e) { /* */ }
  pc.commit();
  const out = document.createElement('canvas'); out.width = CW * CS; out.height = CH * CS; const g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(pc.canvas, 0, 0, out.width, out.height);
  g.font = '700 38px "Pixelify"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#3a2410'; g.strokeText('APPLE OF DISCORD', CW, 23.5 * CS); g.fillStyle = '#fff6cf'; g.fillText('APPLE OF DISCORD', CW, 23.5 * CS);
  g.font = '400 34px "VT323"'; g.fillStyle = '#cdb6f0'; ['Every action has an', 'equal and opposite', 'god.'].forEach((l, i) => g.fillText(l, CW, (228 + i * 24) * CS));
  backCanvas = out; return out;
}

export function clearFaceCache() { faceCache.clear(); }
