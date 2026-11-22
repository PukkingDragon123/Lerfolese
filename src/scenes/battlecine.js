// Battle presentation helpers: the cinematic camera (shots, push-ins, whips and cuts layered over the battle framing),
// the slow-motion PREPARE (time crawls while you plan: foes, particles, grass and critters slow down, the colour drains a
// little, a clock ticks; End Turn snaps time back), the attack vignette (a little animated pixel-art panel of Sir Isaac
// performing the strike his merged object will make: the throw, the heave, the spin, the gravity drop, the time-stop),
// the zoom-in story dilemma (the camera moves in, the foe speaks, the options float as 3D letters you click, then Isaac
// physically does what you chose), the discard chooser (Recycle / Scratchpad) and a small tutorial hook.
import * as THREE from 'three';
import { FloatText, FloatSpeech } from '../ui3d/floatlabel.js';
import { CloudButton } from '../ui3d/instruments.js';
import { uiPos } from '../ui3d/craft.js';
import { WIND } from '../models/toon.js';
import { audio } from '../core/audio.js';
import { tweens } from '../core/tween.js';
import { baseOf } from '../game/combos.js';
import { gardenFrame } from '../story/gardencam.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// ================================================================ which strike a Move makes (Newton's act + the vignette)
export function attackStyle(mv) {
  const a = mv?.art || {}; const at = mv?.attack || {}; const ids = (mv?.comps || []).map((c) => baseOf(c.id));
  if (mv?.special?.law || at.persist || ids.includes('inertia')) return 'timestop';
  if (a.falling || at.fall) return 'gravity';
  if (a.spin || at.hits > 1) return 'spin';
  if ((a.heavy || 0) >= 1 || ['stone', 'earth', 'bulwark', 'keystone', 'lodestone', 'pumice'].includes(baseOf(a.core || ''))) return 'hurl';
  return 'throw';
}

// ================================================================ cinematic camera layered over the battle framing
// w blends the battle framing into the shot (eased); the shot's own framing (cp / cl / cf) GLIDES toward each new shot
// (critically damped) instead of jumping, so back-to-back shots read as one smooth camera move. snap = a deliberate cut.
export class ShotCam {
  constructor(S) { this.S = S; this.w = 0; this.target = 0; this.pos = V(); this.look = V(); this.speed = 4; this.fov = null; this._f = V(); this._l = V(); this.cp = V(); this.cl = V(); this.cf = null; this.t = 0; }
  /** frame pos -> look; snap = a hard cut; speed = how fast the camera eases in (1/s) */
  shot(pos, look, { snap = false, speed = 4, fov = null } = {}) {
    if (this.S.runData?.tutorial) { pos = pos.clone(); look = look.clone(); gardenFrame(pos, look); } // the tutorial: never turn away from the garden
    const live = this.w > 0.03 && this.target > 0; this.pos.copy(pos); this.look.copy(look); this.target = 1; this.speed = speed; this.fov = fov;
    if (snap || !live) { this.cp.copy(pos); this.cl.copy(look); this.cf = fov; } if (snap) this.w = 1;
  }
  release(speed = 2.5) { this.target = 0; this.speed = speed; }
  get on() { return this.w > 0.001 || this.target > 0; }
  apply(dt, cam, baseFov) {
    this.t += dt; this.w += (this.target - this.w) * Math.min(1, dt * this.speed); if (this.target === 0 && this.w < 0.002) this.w = 0;
    if (this.w <= 0) { if (cam.fov !== baseFov) { cam.fov = baseFov; cam.updateProjectionMatrix(); } return; }
    const g = 1 - Math.exp(-dt * Math.max(1.6, this.speed * 0.9)); this.cp.lerp(this.pos, g); this.cl.lerp(this.look, g); const tf = this.fov ?? baseFov; this.cf = (this.cf ?? tf) + (tf - (this.cf ?? tf)) * g;
    const k = sm(this.w); cam.getWorldDirection(this._f); this._l.copy(cam.position).addScaledVector(this._f, 8);
    // a faint hand-held breath keeps a held shot alive (centimetres, slow)
    cam.position.lerp(this.cp, k); cam.position.x += Math.sin(this.t * 0.37) * 0.025 * k; cam.position.y += Math.sin(this.t * 0.29 + 1.3) * 0.018 * k;
    this._l.lerp(this.cl, k); cam.lookAt(this._l);
    const f = baseFov + (this.cf - baseFov) * k; if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); }
  }
}

// ================================================================ PREPARE: time STOPS while you plan (the golden apple restarts it)
export class Prepare {
  constructor(S) { this.S = S; this.k = 0; this.tick = 0; this.side = 0; this.freeze = 0; this.sat0 = null; this.warm0 = null; }
  /** prep: the player is planning; returns the world time scale (1 = real time) */
  update(rdt, prep) {
    this.k += ((prep ? 1 : 0) - this.k) * Math.min(1, rdt * (prep ? 2.2 : 7)); this.freeze = Math.max(0, this.freeze - rdt);
    const scale = Math.max(0, 1 - sm(this.k) - (this.freeze > 0 ? 1 : 0)); WIND.scale = scale; // the world stands still: foes mid-breath, dust hanging, grass mid-sway
    const g = this.S.engine.grade?.uniforms; if (g) { this.sat0 ??= g.uSat.value; this.warm0 ??= g.uWarmth.value; const d = Math.max(sm(this.k) * 0.4, this.freeze > 0 ? 0.6 : 0); g.uSat.value = this.sat0 * (1 - d); g.uWarmth.value = this.warm0 - d * 0.45; }
    // the clock: tick ... tock, slower than real seconds (time is crawling)
    if (this.k > 0.6) { this.tick -= rdt; if (this.tick <= 0) { this.tick = 0.85; this.side ^= 1; audio.play('wood_knock', { vol: 0.07, rate: this.side ? 2.1 : 1.7, variance: 0, minGap: 200 }); } } else this.tick = 0.3;
    return scale;
  }
  /** a time-stop: the whole world freezes for `sec` (the timestop strike) */
  stop(sec = 0.6) { this.freeze = Math.max(this.freeze, sec); }
  dispose() { WIND.scale = 1; const g = this.S.engine.grade?.uniforms; if (g && this.sat0 != null) { g.uSat.value = this.sat0; g.uWarmth.value = this.warm0; } }
}

// ================================================================ the attack VIGNETTE: Sir Isaac performing the strike, in pixel art
const VW = 64, VH = 40;
const COL = { ink: '#0c0810', coat: '#1e2a4a', coatL: '#344a78', vest: '#7a1e30', skin: '#f2caa6', hair: '#5a3418', leg: '#2a2028', boot: '#140e12', shirt: '#f2ece0', gold: '#e8b848' };
const CORE = { apple: ['#c8283a', '#ff7a6a', '#3a8a30'], stone: ['#7a767c', '#b8b2b4', null], water: ['#3a8ac8', '#bfe8ff', null], spark: ['#e8c030', '#fff8c0', null], heat: ['#e0642a', '#ffd070', null] };
function coreCol(core) { const b = baseOf(core || 'apple'); return CORE[b] || (/apple/.test(b) ? CORE.apple : ['stone', 'earth', 'bulwark', 'keystone', 'pumice', 'lodestone'].includes(b) ? CORE.stone : b === 'plasma' ? CORE.heat : CORE.apple); }
export class Vignette {
  constructor(style, art) {
    this.style = style; this.art = art || {}; this.t = Math.random(); this.frame = -1;
    this.canvas = document.createElement('canvas'); this.canvas.width = VW; this.canvas.height = VH; this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false;
    this.bg = document.createElement('canvas'); this.bg.width = VW; this.bg.height = VH; this.paintBg(); this.draw(0);
  }
  paintBg() {
    const g = this.bg.getContext('2d'); const band = ['#141428', '#1c1e3a', '#262a4c', '#33365a', '#463f5e'];
    for (let y = 0; y < VH; y++) { const i = Math.min(band.length - 1, Math.floor((y / VH) * band.length + ((y * 7) % 3 === 0 ? 0.4 : 0))); g.fillStyle = band[i]; g.fillRect(0, y, VW, 1); }
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 26; i++) { g.fillStyle = r() > 0.8 ? '#fff4c8' : '#a8b0e0'; g.fillRect((r() * VW) | 0, (r() * VH * 0.6) | 0, 1, 1); }
    g.fillStyle = '#2a2a1e'; g.fillRect(0, VH - 7, VW, 7); g.fillStyle = '#3e4a26'; g.fillRect(0, VH - 7, VW, 1); for (let x = 0; x < VW; x += 3) { g.fillStyle = '#4e5e2e'; g.fillRect(x + ((x * 5) % 2), VH - 8, 1, 1); }
    // the foe, a horned silhouette with one glinting eye, on the right
    const F = ['....k.....k...', '....kk...kk...', '.....kkkkk....', '....kkkkkkk...', '...kkkekkkkk..', '...kkkkkkkkkk.', '..kkkkkkkkkkk.', '..kkkkkkkkkkkk', '.kkkkkkkkkkkkk', '.kkkk.kkkk.kkk', '.kkk..kkk...kk', '.kk...kk....kk'];
    F.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'k') { g.fillStyle = '#120c18'; g.fillRect(46 + x, VH - 7 - F.length + y, 1, 1); } if (c === 'e') { g.fillStyle = '#ffd040'; g.fillRect(46 + x, VH - 7 - F.length + y, 1, 1); } }));
  }
  // a little Isaac: hips at (hx, hy); pose angles in radians (0 = straight down for limbs)
  isaac(g, hx, hy, P) {
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const limb = (x0, y0, a, L, c, w = 2) => { const dx = Math.sin(a), dy = Math.cos(a); for (let i = 0; i <= L; i++) for (let k = 0; k < w; k++) px(x0 + dx * i + k * Math.cos(a) * 0.9, y0 + dy * i - k * Math.sin(a) * 0.9, c); return [x0 + dx * L, y0 + dy * L]; };
    const tilt = P.lean || 0; const sx = hx + Math.sin(tilt) * 9, sy = hy - Math.cos(tilt) * 9; // shoulders
    // legs
    for (const [a1, a2] of [[P.lt || 0.15, P.ls || 0], [P.rt || -0.15, P.rs || 0]]) { const [kx, ky] = limb(hx, hy, a1, 4, COL.leg); const [fx, fy] = limb(kx, ky, a1 + a2, 4, COL.leg); px(fx - 1, fy, COL.boot); px(fx, fy, COL.boot); px(fx + 1, fy, COL.boot); }
    // coat body (a slanted block with tails) + waistcoat + cravat
    for (let i = 0; i <= 10; i++) { const u = i / 10; const cx = hx + (sx - hx) * u, cy = hy + 2 - (hy + 2 - sy) * u; for (let k = -2; k <= 2; k++) px(cx + k, cy, Math.abs(k) === 2 ? COL.coat : k === 0 && u > 0.35 ? COL.vest : COL.coatL); }
    px(hx - 3, hy + 3, COL.coat); px(hx + 2, hy + 3, COL.coat); px(sx, sy + 1, COL.shirt); px(sx, sy + 2, COL.shirt);
    // head: skin with long brown hair at the back
    const hdx = sx + Math.sin(tilt) * 2, hdy = sy - 3; for (let y = -2; y <= 1; y++) for (let x = -1; x <= 1; x++) px(hdx + x, hdy + y, COL.skin); for (let y = -3; y <= 2; y++) px(hdx - 2, hdy + y, COL.hair); for (let x = -2; x <= 1; x++) px(hdx + x, hdy - 3, COL.hair); px(hdx + 1, hdy - 1, COL.ink);
    // arms (the back arm first)
    const [bex, bey] = limb(sx - 1, sy + 1, P.la ?? 0.3, 4, COL.coat); const [bhx, bhy] = limb(bex, bey, (P.la ?? 0.3) + (P.lf ?? 0.2), 3, COL.coat); px(bhx, bhy, COL.skin);
    const [ex, ey] = limb(sx + 1, sy + 1, P.ra ?? -0.3, 4, COL.coatL); const [hx2, hy2] = limb(ex, ey, (P.ra ?? -0.3) + (P.rf ?? -0.2), 3, COL.coatL); px(hx2, hy2, COL.skin); px(hx2 + 1, hy2, COL.skin);
    return { hand: [hx2, hy2], back: [bhx, bhy], head: [hdx, hdy] };
  }
  ball(g, x, y, r = 1.6, spin = 0) {
    const [c, l, leaf] = coreCol(this.art.core); for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= r * r + 0.6) { g.fillStyle = (xx + yy < -1) !== (spin % 2 === 1) ? l : c; g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1); }
    if (leaf) { g.fillStyle = leaf; g.fillRect(Math.round(x), Math.round(y - 3), 1, 1); g.fillRect(Math.round(x + 1), Math.round(y - 3), 1, 1); }
    if (this.art.hot) { g.fillStyle = '#ffb040'; g.fillRect(Math.round(x - 1), Math.round(y - 3), 1, 1); } if (this.art.electric) { g.fillStyle = '#fff8a0'; g.fillRect(Math.round(x + 2), Math.round(y - 2), 1, 1); }
  }
  streak(g, x0, y0, x1, y1, col = '#e8f0ff') { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i < n; i += 2) { g.fillStyle = col; g.globalAlpha = 0.25 + 0.6 * (i / n); g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); } g.globalAlpha = 1; }
  draw(f) {
    const g = this.g; g.drawImage(this.bg, 0, 0); const st = this.style, t = f / 12; const hx = 14, hy = VH - 15; const foe = [52, VH - 14]; let P, ball = null, trail = null, hit = false, frozen = false;
    if (st === 'throw') { const wind = t < 0.42; P = wind ? { lean: -0.15, lt: -0.7, ls: 1.2, rt: 0.1, ra: 2.6 - t * 1.5, rf: 0.6, la: -0.9, lf: 0 } : { lean: 0.25, lt: -0.4, ls: 0.4, rt: 0.4, ra: -1.4, rf: -0.3, la: 0.6, lf: 0.3 };
      const I = this.isaac(g, hx, hy, P); if (wind) ball = I.hand; else if (t < 0.8) { const u = (t - 0.42) / 0.38; ball = [I.hand[0] + (foe[0] - I.hand[0]) * u, I.hand[1] + (foe[1] - 6 - I.hand[1]) * u - Math.sin(u * Math.PI) * 4]; trail = [I.hand[0], I.hand[1]]; } else hit = true; }
    else if (st === 'hurl') { const up = t < 0.45; P = up ? { lean: -0.1, lt: 0.25, rt: -0.25, ls: 0.2, rs: 0.2, ra: Math.PI - 0.25, la: Math.PI + 0.25, rf: 0, lf: 0 } : { lean: 0.35, lt: -0.5, ls: 0.5, rt: 0.35, ra: -1.2, la: -1.0, rf: 0, lf: 0 };
      const I = this.isaac(g, hx, hy + (up && t < 0.15 ? 1 : 0), P); if (up) ball = [I.head[0] + 1, I.head[1] - 6]; else if (t < 0.85) { const u = (t - 0.45) / 0.4; ball = [I.hand[0] + (foe[0] - I.hand[0]) * u, I.hand[1] + (foe[1] - 5 - I.hand[1]) * u - Math.sin(u * Math.PI) * 9]; } else hit = true; }
    else if (st === 'spin') { const show = t < 0.5; P = show ? { lean: 0, ra: Math.PI - 0.4, rf: 0.2, la: 0.4, lf: 0.6 } : { lean: 0.2, ra: -1.9, rf: -0.4, la: 0.5, lt: -0.3, ls: 0.3 }; const I = this.isaac(g, hx, hy, P);
      if (show) { ball = [I.hand[0], I.hand[1] - 3]; for (let k = 0; k < 3; k++) { const a = f * 1.3 + k * 2.1; g.fillStyle = '#d8e0ff'; g.fillRect(Math.round(ball[0] + Math.cos(a) * 4), Math.round(ball[1] + Math.sin(a) * 2), 1, 1); } }
      else if (t < 0.85) { const u = (t - 0.5) / 0.35; ball = [I.hand[0] + (foe[0] - I.hand[0]) * u, I.hand[1] + (foe[1] - 6 - I.hand[1]) * u + Math.sin(u * Math.PI * 2) * 3]; trail = [I.hand[0], I.hand[1]]; } else hit = true; }
    else if (st === 'gravity') { const raise = t < 0.5; P = raise ? { lean: -0.05, ra: Math.PI - 0.05, rf: 0, la: 0.5 } : { lean: 0.2, ra: -0.5, rf: 0.5, la: 0.7, lt: -0.4, ls: 0.8, rt: -0.3, rs: 0.6 }; this.isaac(g, hx, hy + (raise ? 0 : 1), P);
      if (raise) ball = [foe[0], 4 + t * 4]; else if (t < 0.72) { const u = (t - 0.5) / 0.22; ball = [foe[0], 6 + (foe[1] - 10) * u * u]; for (let k = 1; k < 5; k++) { g.fillStyle = '#c8d0ff'; g.fillRect(foe[0] - 3 + k * 2, Math.round(ball[1] - 4 - k * 2), 1, 2); } } else hit = true; }
    else { frozen = t < 0.62; P = { lean: 0.05, la: -1.55, lf: 0, ra: 0.6, rf: 1.2, lt: -0.3, rt: 0.3 }; this.isaac(g, hx, hy, P);
      if (frozen) { ball = [36, VH - 22]; g.fillStyle = '#9ad8ff'; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) for (let r = 4; r <= 7; r++) { g.fillRect(ball[0] + dx * r, ball[1] + dy * r, 1, 1); g.fillRect(ball[0] - dx * r, ball[1] - dy * r, 1, 1); } } // ice-sharp spikes: time frozen round it
      else if (t < 0.85) { const u = (t - 0.62) / 0.23; ball = [36 + (foe[0] - 36) * u, VH - 22 + (foe[1] - 6 - (VH - 22)) * u]; trail = [36, VH - 22]; } else hit = true; }
    if (trail && ball) this.streak(g, trail[0], trail[1], ball[0], ball[1]);
    if (ball) this.ball(g, ball[0], ball[1], this.art.heavy ? 2.2 : 1.6, f);
    if (hit) { const k = Math.floor((t - 0.8) * 30); g.fillStyle = '#fff6cf'; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]]) for (let r = 2 + k; r <= 4 + k; r++) g.fillRect(foe[0] + dx * r, foe[1] - 6 + dy * r, 1, 1); } // straight impact rays
    if (frozen) { const id = g.getImageData(0, 0, VW, VH); const d = id.data; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; d[i] = l * 0.8; d[i + 1] = l * 0.9; d[i + 2] = Math.min(255, l * 1.25); } g.putImageData(id, 0, 0); }
    // a brass frame
    g.fillStyle = '#e8b848'; g.fillRect(0, 0, VW, 1); g.fillRect(0, 0, 1, VH); g.fillStyle = '#7a4a14'; g.fillRect(0, VH - 1, VW, 1); g.fillRect(VW - 1, 0, 1, VH); g.fillStyle = '#0c0810'; g.fillRect(1, 1, VW - 2, 1); g.fillRect(1, 1, 1, VH - 2);
    this.tex.needsUpdate = true;
  }
  update(dt) { this.t = (this.t + dt / 1.7) % 1; const f = Math.floor(this.t * 12); if (f !== this.frame) { this.frame = f; this.draw(f); } }
  dispose() { this.tex.dispose(); }
}

// ================================================================ the ZOOM-IN DILEMMA: camera in, voiced foe, 3D options, Isaac acts it out
const ACT_FOR = (o) => o.act || (o.fx?.heal ? 'drink' : o.fx?.cards || o.fx?.deck ? 'grab' : o.fx?.gold < 0 || o.fx?.loseHand || o.fx?.loseDeck ? 'give' : o.fx?.block ? 'brace' : 'answer');
export async function dilemmaScene(S, d, e) {
  const prof = S.prof, cam = S.shotCam; const fv = S.enemyViews.get(e.uid); const foeP = S.enemyPos(e, 0.75), pp = (S.profHome || prof.root.position).clone();
  S.dilemmaOn = true; S.hand.hideAll = true; S.hand.layout(); audio.play('transition_whoosh', { vol: 0.5 }); audio.duckMusic?.(0.4, 6);
  // 1. a slow push over Newton's shoulder at the foe
  const mid = pp.clone().lerp(foeP, 0.5); cam.shot(V(pp.x - 1.6, 2.3, pp.z + 3.2), V(foeP.x, foeP.y + 0.2, foeP.z), { speed: 2.4, fov: 30 });
  const title = new FloatText([[d.title, '#ffe6a8']], { font: 'title', align: 'center', lighten: false }); S.ui.scene.add(title.group); title.place(0, S.ui.H - 1.6, 9); title.show();
  const sub = new FloatText([[d.riddle ? 'A RIDDLE' : 'A DILEMMA', '#c8b494']], { font: 'head', align: 'center', lighten: false }); S.ui.scene.add(sub.group); sub.place(0, S.ui.H - 3.1, 9); sub.show();
  const loop = { update: (dt) => { title.update(dt); sub.update(dt); const pp9 = S.ui.pointerPlane(9); for (const o of opts) o.B.update(dt, pp9); speech?.update(dt); speech?.at(0, -S.ui.H * 0.42); for (const o of olds) o.update(dt); } }; const olds = []; // the spoken line sits low and central, like a subtitle
  let speech = null; const opts = []; S.engine.add(loop);
  await tweens.wait(0.9); fv?.api.act?.('cast');
  // 2. the foe speaks (voiced), close on it
  cam.shot(V(foeP.x - 2.4, foeP.y + 0.6, foeP.z + 3.6), V(foeP.x, foeP.y + 0.3, foeP.z), { speed: 3.5, fov: 28 });
  let D = null; try { D = await import('../story/dialogue.js'); } catch (err) { D = null; }
  for (const line of [...d.intro, d.prompt].filter(Boolean)) { if (speech) { speech.drop(); olds.push(speech); } speech = new FloatSpeech(S.ui.scene, line, { who: e.def.name, color: '#ff9a7a', life: 99 }); fv?.api.talk?.(1.4); try { D?.voiceOnly?.('foe', line); } catch (err) { /* no voice */ } await waitRead(S, line); }
  // 3. back on Newton; the options float beside him as 3D letters (hover tilts them, click to choose, or 1-3)
  cam.shot(V(pp.x + 1.4, 2.0, pp.z + 4.2), V(pp.x + 0.9, 1.55, pp.z), { speed: 3, fov: 30 }); prof.act('think'); prof.lookAt(0.4, 0.1);
  const W = S.ui.W, H = S.ui.H;
  // the options: brass-and-ivory plates beside Newton (hover lifts, tilts and lights them; click, or press 1-3)
  d.options.forEach((o, i) => { const B = new CloudButton(`${i + 1}  ${o.label}`, null, { w: 8, h: 1.25, sub: o.sub, color: i === 0 ? 'teal' : i === 1 ? 'purple' : 'wood' }); S.ui.scene.add(B.group); const y = H * 0.52 - i * 3.9, x = W * 0.3 + (i % 2) * 1.2; uiPos(B.group, x, y, 9); B.group.scale.setScalar((40 - 9) / 40); B.pop.value = 0.05; setTimeout(() => { B.pop.target = 1; B.pop.kick(4); audio.play('whoosh_soft', { vol: 0.25 }); }, 130 * i); opts.push({ B, o, i }); });
  S.dlgOpts = opts; // (exposed for tests)
  const pick = await new Promise((resolve) => {
    const ray = new THREE.Raycaster(); let hover = null;
    const hitOf = () => { ray.setFromCamera(S.input.ndc, S.engine.ui.camera); const hs = ray.intersectObjects(opts.flatMap((x) => [x.B.hit, x.B.hitFace].filter(Boolean)), false); return hs.length ? opts.find((x) => x.B.hit === hs[0].object || x.B.hitFace === hs[0].object) : null; };
    const h = S.input.push({ modal: true,
      move() { const x = hitOf(); if (x !== hover) { if (hover) hover.B.hover = false; hover = x; if (x) { x.B.hover = true; audio.play('ui_hover', { vol: 0.4 }); } } return true; },
      click() { const x = hitOf(); if (x) { x.B.press(); S.input.remove(h); resolve(x.i); } return true; },
      key(ev) { const n = parseInt(ev.key, 10); if (n >= 1 && n <= opts.length) { opts[n - 1].B.press(); S.input.remove(h); resolve(n - 1); } return true; },
      dragstart: () => true, drag: () => true, dragend: () => true, down: () => true, wheel: () => true });
  });
  audio.play('stamp'); audio.play('chime_soft', { vol: 0.5 }); if (speech) { speech.drop(); olds.push(speech); } speech = null;
  for (const x of opts) if (x.i !== pick) { x.B.pop.target = 0; } else x.B.pop.kick(5);
  await tweens.wait(0.45); for (const x of opts) x.B.pop.target = 0;
  // 4. Isaac does it: walks up to the foe for a give / grab, drinks, answers with a raised finger, braces or refuses
  const what = ACT_FOR(d.options[pick]); await perform(S, what, e, cam);
  title.hide(); sub.hide(); S.dilemmaPickAct = what;
  setTimeout(() => { S.engine.remove(loop); for (const x of opts) { x.B.group.parent?.remove(x.B.group); x.B.text.dispose(); } title.dispose(); sub.dispose(); for (const o of olds) o.dispose(); S.dlgOpts = null; }, 900);
  return pick;
}
// the reply / outcome after the battle applied the option (called from fx.dilemmaResult)
export async function dilemmaReply(S, d, opt, e) {
  const cam = S.shotCam; let D = null; try { D = await import('../story/dialogue.js'); } catch (err) { D = null; }
  if (opt.reply && (e.alive || e.fled)) {
    const foeP = S.enemyPos(e, 0.75); cam.shot(V(foeP.x - 2.2, foeP.y + 0.5, foeP.z + 3.8), V(foeP.x, foeP.y + 0.3, foeP.z), { speed: 4, fov: 29 });
    const sp = new FloatSpeech(S.ui.scene, opt.reply, { who: e.def.name, color: '#ff9a7a', life: 99 }); const loop = { update: (dt) => { sp.update(dt); sp.at(0, -S.ui.H * 0.42); } }; S.engine.add(loop);
    try { D?.voiceOnly?.('foe', opt.reply); } catch (err) { /* */ } S.enemyViews.get(e.uid)?.api.talk?.(1.2); await waitRead(S, opt.reply); sp.drop(); setTimeout(() => { S.engine.remove(loop); sp.dispose(); }, 700);
  }
  cam.release(2); S.hand.hideAll = false; S.hand.layout(); S.dilemmaOn = false;
}
function waitRead(S, text) { const sec = Math.min(4.5, 1.1 + String(text).length * 0.045); return new Promise((res) => { let done = false; const fin = () => { if (done) return; done = true; S.input.remove(h); res(); }; const h = S.input.push({ modal: true, click: () => { fin(); return true; }, key: () => { fin(); return true; }, down: () => true, dragstart: () => true }); setTimeout(fin, sec * 1000); }); }
// Isaac physically performs a choice
async function perform(S, what, e, cam) {
  const prof = S.prof, home = (S.profHome || prof.root.position).clone(), ry0 = S.profRy ?? prof.root.rotation.y; const foe = S.enemyPos(e, 0);
  const walkTo = async (to, sec = 0.9) => { const from = prof.root.position.clone(); const ry = Math.atan2(to.x - from.x, to.z - from.z); prof.face(ry); prof.locomote(from.distanceTo(to) / sec); const o = { k: 0 }; await tweens.to(o, { k: 1 }, sec, { ease: 'inOutQuad', onUpdate: () => prof.root.position.lerpVectors(from, to, o.k) }); prof.locomote(0); };
  cam.shot(V(home.x + 2.6, 2.0, home.z + 4.4), V((home.x + foe.x) / 2, 1.3, home.z), { speed: 3, fov: 32 });
  if (what === 'grab' || what === 'give') {
    const near = home.clone().lerp(V(foe.x, home.y, foe.z), 0.42); await walkTo(near); prof.act(what === 'grab' ? 'grab' : 'cast'); audio.play(what === 'grab' ? 'whoosh_soft' : 'coin_single', { vol: 0.6 }); await tweens.wait(0.9);
    await walkTo(home, 0.8); prof.face(ry0); await tweens.wait(0.35); prof.face(null); prof.root.rotation.y = ry0;
  } else if (what === 'drink') { prof.act('eat'); audio.play('liquid_slosh', { vol: 0.6 }); await tweens.wait(0.7); audio.play('gurgle', { vol: 0.5 }); await tweens.wait(1.2); }
  else if (what === 'brace') { prof.act('timestop'); audio.play('shield_block', { vol: 0.6 }); await tweens.wait(1.2); }
  else if (what === 'refuse') { prof.setExpr('annoyed'); prof.act('dodge', { dir: -1 }); audio.play('whoosh_soft', { vol: 0.5 }); await tweens.wait(1.0); }
  else { prof.act('cast'); prof.talk(1.4); audio.play('magic_sparkle', { vol: 0.5 }); await tweens.wait(1.3); }
}

// ================================================================ the discard chooser (Recycle: any number; Scratchpad: exactly n)
export function chooseCards(S, pool, { min = 0, max = 99, title = 'Discard', recycle = false } = {}) {
  return new Promise((resolve) => {
    const sel = new Set(); const H = S.ui.H; S.hand.selected = sel; S.hand.layout();
    const head = new FloatText([[title, '#ffe6a8']], { font: 'title', align: 'center', lighten: false }); S.ui.scene.add(head.group); head.place(0, -H + 9.2, 9); head.show();
    const btn = new CloudButton('Confirm', null, { w: 4.2, h: 1.3, color: 'teal' }); S.ui.scene.add(btn.group); uiPos(btn.group, 0, -H + 7.4, 9); btn.group.scale.setScalar((40 - 9) / 40); btn.on = min === 0 || recycle; btn.group.visible = btn.on; btn.show = () => { btn.on = true; btn.group.visible = true; };
    const loop = { update: (dt) => { head.update(dt); btn.update(dt, S.ui.pointerPlane(9)); } }; S.engine.add(loop); audio.play('page_turn', { vol: 0.4 });
    const ray = new THREE.Raycaster(); const overBtn = () => { ray.setFromCamera(S.input.ndc, S.engine.ui.camera); return btn.on && ray.intersectObjects([btn.hit, btn.hitFace].filter(Boolean), false).length > 0; };
    const done = () => { S.input.remove(h); S.hand.selected = null; S.hand.layout(); head.hide(); btn.pop.target = 0; setTimeout(() => { S.engine.remove(loop); head.dispose(); btn.group.parent?.remove(btn.group); btn.text.dispose(); }, 600); resolve([...sel]); };
    const h = S.input.push({ modal: true,
      move() { const s = S.hand.pick(S.rayUI(S.cardMeshes())); if (s !== S.hand.hover) { S.hand.hover = s; S.hand.layout(); } btn.hover = overBtn(); return true; },
      click() {
        if (overBtn() && sel.size >= min) { btn.press(); return done(), true; }
        const s = S.hand.pick(S.rayUI(S.cardMeshes())); if (!s || !pool.some((p) => p.uid === s.uid)) return true;
        if (sel.has(s.uid)) sel.delete(s.uid); else if (sel.size < max) sel.add(s.uid); audio.play(sel.has(s.uid) ? 'paper_crumple' : 'card_place', { vol: 0.6 }); S.hand.layout();
        if (!recycle && sel.size >= max) setTimeout(done, 250); else if (sel.size >= min) btn.show(); return true;
      },
      key(ev) { if ((ev.code === 'Enter' || ev.code === 'Space') && sel.size >= min) done(); return true; }, dragstart: () => true, drag: () => true, dragend: () => true, down: () => true });
  });
}

// ================================================================ TUTORIAL hook (story agent): encounter.tutorial = { steps: [...] }
// step: { say: 'text', who: 'master' | 'narrator' | 'newton' (floating line), wait: 'place' | 'merge' | 'self' | 'end' | null, hold: sec }
export class Tutorial {
  constructor(S, cfg) { this.S = S; this.steps = [...(cfg.steps || [])]; this.i = -1; this.waiting = null; this.T = new FloatText(null, { font: 'head', align: 'center' }); S.ui.scene.add(this.T.group); S.engine.add(this); this.t = 0; }
  did(kind) { if (this.waiting === kind) { this.waiting = null; this.next(); } }
  start() { this.next(); }
  next() {
    this.i++; const st = this.steps[this.i]; if (!st) { this.T.hide(); return; }
    const who = st.who === 'master' ? 'THE MASTER' : st.who === 'newton' ? 'ISAAC' : ''; this.T.set([...(who ? [[[who, '#ffb27a']]] : []), [[st.say || '', '#f6efe0']]], { fonts: who ? ['tiny', 'head'] : ['head'], lighten: false }); this.T.place(0, this.S.ui.H - 4.2, 9); this.T.hide(); setTimeout(() => this.T.show(), 60); audio.play('page_turn', { vol: 0.35 });
    import('../story/dialogue.js').then((D) => D.voiceOnly?.(st.who || 'narrator', st.say || '')).catch(() => {});
    this.waiting = st.wait || null; this.t = st.wait ? 0 : -(st.hold ?? Math.min(5, 1.5 + (st.say || '').length * 0.05));
  }
  update(dt) { this.T.update(dt); if (!this.waiting && this.i >= 0 && this.i < this.steps.length) { this.t += dt; if (this.t >= 0) this.next(); } }
  dispose() { this.S.engine.remove(this); this.T.dispose(); }
}
