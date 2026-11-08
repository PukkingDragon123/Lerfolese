// Cinematics, told as a chronicle. A real-time director (performance.now deltas, so a slow renderer never stalls a
// shot), carved walnut letterbox beams, inked parchment narration tacked onto the beam, name-and-epithet cards, the
// marionette's walking gait (driven from outside professor.js), the road in, and a spring-smoothed camera rig.
// Used by the battle intro (battlescene.js), the travel shot (travel.js) and the event vignette (event.js).
// Debug: window.__cine is the running director (speed = 0 pauses, seek(t) jumps ahead, skip()).
import * as THREE from 'three';
import { Strip, Paper } from '../ui3d/objects.js';
import { Surf, RAMP, pxTex, frontMat, sideMat, slab, wood, rivet, mesh, uiRig, wrapText, PX, PXP } from '../ui3d/craft.js';
import { audio } from '../core/audio.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const span = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = { io: (x) => x * x * (3 - 2 * x), smooth: (x) => x * x * x * (x * (x * 6 - 15) + 10), out: (x) => 1 - (1 - x) ** 3, in: (x) => x * x * x };
export const lerpAngle = (a, b, u) => { const d = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * u; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const RUBRIC = '#8a1a1c', INKC = '#2a160c';
const noShadow = (o) => o.traverse((m) => { if (m.isMesh) m.castShadow = false; });
// UI-plane placement with the perspective cancelled: it appears at (x, y) with apparent scale s
const place = (o, x, y, z, s = 1) => { const k = (40 - z) / 40; o.position.set(x * k, y * k, z); o.scale.setScalar(k * s); return o; };

// ================================================================ LETTERBOX: two carved walnut beams slide over the picture
const BEAM_W = 64, BEAM_H = 3.4, BAND = 0.165; // beam size (UI units); BAND = share of the half-height each beam covers
const beamTexCache = new Map();
function beamTexture(seed, edgeDown) {
  const key = seed + '|' + edgeDown; if (beamTexCache.has(key)) return beamTexCache.get(key);
  const w = Math.round(BEAM_W * PX), h = Math.round(BEAM_H * PX); const S = new Surf(w, h);
  wood(S, 0, 0, w, h, RAMP.walnut, { seed, base: 1, knots: 3, seams: 1 });
  S.bevel(null, { lit: 1, dark: -1 });
  const row = (r) => (edgeDown ? h - 1 - r : r); // r counts in from the edge that faces the picture
  // the picture edge: a dark lip, a gilded rule, a carved Romanesque dogtooth frieze, a cut groove, brass rivets
  for (let x = 0; x < w; x++) { S.set(x, row(0), RAMP.walnut, 0); S.set(x, row(1), RAMP.walnut, 2); S.set(x, row(2), RAMP.gold, x % 6 === 0 ? 5 : 4); S.set(x, row(3), RAMP.gold, x % 6 === 3 ? 3 : 2); S.set(x, row(4), RAMP.walnut, 0); }
  const cy = row(9);
  for (let cx = 5; cx < w - 5; cx += 10) {
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {
      const m = Math.abs(i) + Math.abs(j); if (m > 4) continue;
      const tone = m === 0 ? 4 : j < 0 ? (i <= 0 ? 4 : 3) : (i < 0 ? 2 : 1); S.set(cx + i, cy + j, RAMP.walnut, m === 4 ? 0 : tone); // four facets lit from the upper left
    }
    S.set(cx - 1, cy - 2, RAMP.walnut, 5); // a glint on the lit facet
    if ((cx / 10) % 2 === 0) S.set(cx + 5, cy, RAMP.gold, 3); // gilt bead between the teeth
  }
  for (let x = 0; x < w; x++) { S.set(x, row(15), RAMP.walnut, 0); S.shift(x, row(16), 2); }
  for (let x = 24; x < w - 6; x += 48) rivet(S, x, row(edgeDown ? 21 : 19));
  const tex = pxTex(S.toCanvas()); beamTexCache.set(key, tex); return tex;
}
export class Letterbox {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.name = 'letterbox'; parent.add(this.group); this.k = 0; this.target = 0;
    const geo = slab(BEAM_W, BEAM_H, 0.5, { cut: 0, bevel: 0.1 });
    this.top = mesh(geo, [frontMat(beamTexture(3, true)), sideMat('walnut')], this.group, { cast: false });
    this.bot = mesh(geo, [frontMat(beamTexture(8, false)), sideMat('walnut')], this.group, { cast: false });
  }
  show() { if (this.target === 1) return; this.target = 1; audio.play('wood_creak', { vol: 0.35 }); }
  hide() { this.target = 0; }
  get gone() { return this.target === 0 && this.k < 0.003; }
  update(dt, H) {
    this.k += (this.target - this.k) * (1 - Math.exp(-dt * (this.target ? 4.5 : 5.5)));
    const b = H * BAND, e = ease.io(clamp01(this.k)), Z = 14; this.group.visible = this.k > 0.003;
    place(this.top, 0, H + BEAM_H / 2 + 0.4 - (b + 0.4) * e, Z); place(this.bot, 0, -(H + BEAM_H / 2 + 0.4) + (b + 0.4) * e, Z);
  }
  dispose() { for (const m of [this.top, this.bot]) m.material[0].dispose(); } // the carved textures are cached for the next scene
}

// ================================================================ NARRATION: a chronicle line inked on a parchment strip
// tacked onto the lower beam; the first letter is rubricated, the hand is blackletter.
function rubricLines(text, font, maxW, maxLines = 2) {
  let ls = wrapText(String(text), font, Math.round(maxW * PXP) - 24); if (ls.length > maxLines) { ls = ls.slice(0, maxLines); ls[maxLines - 1] = ls[maxLines - 1].replace(/[\s,;:.…]*$/, '') + '…'; }
  return ls.map((l, i) => (i === 0 ? [[l[0], RUBRIC], [l.slice(1), INKC]] : [[l, INKC]]));
}
export class Narration {
  constructor(parent) { this.parent = parent; this.items = []; }
  say(text, { font = 'hand', maxW = 18 } = {}) {
    this.clear();
    const s = new Strip(rubricLines(text, font, maxW), { font, maxW: maxW + 3, tacks: 2, tone: 5 }); noShadow(s.group); this.parent.add(s.group);
    const it = { s, k: 0, target: 1 }; this.items.push(it); s.kick(0.7); audio.play('page_turn', { vol: 0.45 }); return it;
  }
  clear() { for (const it of this.items) it.target = 0; }
  get empty() { return !this.items.length; }
  update(dt, W, H, band) {
    for (const it of this.items) {
      it.k += (it.target - it.k) * (1 - Math.exp(-dt * (it.target ? 7 : 9)));
      const e = ease.out(clamp01(it.k)); const y = -H + band * 0.5 + 0.06;
      place(it.s.group, it.target ? 0 : (1 - e) * 2.5, y - (1 - e) * (it.target ? 1.6 : -0.4), 15, (0.6 + 0.4 * e) * 1.05);
      it.s.group.rotation.z = (1 - e) * (it.target ? -0.12 : 0.18); it.s.update(dt, null);
    }
    this.items = this.items.filter((it) => { if (it.target === 0 && it.k < 0.02) { this.parent.remove(it.s.group); it.s.tex?.dispose(); it.s.mat?.dispose(); return false; } return true; });
  }
  dispose() { for (const it of this.items) { this.parent.remove(it.s.group); it.s.tex?.dispose(); } this.items = []; }
}

// ================================================================ NAME CARD: a pinned note, rubricated name over an inked epithet
export class NameCard {
  constructor(parent, name, epithet) {
    this.p = new Paper({ font: 'hand', title: 'title', maxW: 10, pin: true, kind: 'note', tone: 5 }); this.parent = parent; parent.add(this.p.group);
    this.lines = [[[name, RUBRIC]], [[epithet, INKC]]]; this.x = 0; this.y = 0; this.z = 10; this.shown = false;
  }
  show() { this.p.show(this.lines, 0, 0, this.z, { title: true }); noShadow(this.p.group); this.shown = true; audio.play('paper_rustle', { vol: 0.55 }); return this; }
  hide() { if (this.shown) this.p.hide(); }
  at(x, y) { this.x = x; this.y = y; return this; }
  get gone() { return !this.shown || !this.p.group.visible; }
  update(dt, W, H, band) {
    if (!this.shown) return; const p = this.p; const k = (40 - this.z) / 40;
    const x = clamp(this.x, -W + p.w / 2 + 0.4, W - p.w / 2 - 0.4), y = clamp(this.y, -H + band + p.h / 2 + 0.3, H - band - p.h / 2 - 0.3);
    p.baseScale = k; p.group.position.set(x * k, (y + p.h / 2 - 0.22) * k, this.z); p.update(dt, null);
  }
  dispose() { this.parent.remove(this.p.group); this.p.dispose(); }
}

// ================================================================ DIRECTOR: real-time timeline, cues, skip, the cinematic layer
export class Director {
  constructor(engine, input, { bars = true } = {}) {
    this.engine = engine; this.input = input; this.t = 0; this.speed = 1; this.last = performance.now(); this.cues = []; this.skipped = false; this.ended = false; this.disposed = false;
    this.frame = null; this.onSkip = null; uiRig(engine);
    this.group = new THREE.Group(); this.group.name = 'cinematic'; engine.ui.scene.add(this.group);
    this.bars = bars ? new Letterbox(this.group) : null; this.narr = new Narration(this.group); this.cards = [];
    const eat = () => true;
    this.handler = input.push({ modal: true, click: () => { this.skip(); return true; }, key: (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') this.skip(); return true; }, down: eat, move: eat, dragstart: eat, drag: eat, dragend: eat, wheel: eat });
    this.done = new Promise((r) => (this._res = r)); engine.add(this); window.__cine = this; this.bars?.show();
  }
  get W() { return this.engine.uiW; } get H() { return this.engine.uiH; } get band() { return this.H * BAND; }
  at(t, fn) { this.cues.push({ t, fn }); this.cues.sort((a, b) => a.t - b.t); return this; }
  say(text, o) { return this.narr.say(text, o); }
  card(name, epithet) { const c = new NameCard(this.group, name, epithet); this.cards.push(c); return c; }
  skip() { if (this.skipped || this.ended) return; this.skipped = true; this.cues = []; this.narr.clear(); for (const c of this.cards) c.hide(); audio.play('page_turn', { vol: 0.7 }); this.onSkip?.(); }
  end() { if (this.ended) return; this.ended = true; this.cues = []; this.bars?.hide(); this.narr.clear(); for (const c of this.cards) c.hide(); this.input.remove(this.handler); if (window.__cine === this) window.__cine = null; this._res(); }
  // advance the timeline by real time; hold while the page-turn wipe still covers the picture
  step(dt) { this.t += dt; while (!this.ended && this.cues.length && this.cues[0].t <= this.t) this.cues.shift().fn(this.t); if (!this.ended) this.frame?.(this.t, dt); }
  seek(t) { while (!this.ended && this.t < t) this.step(Math.min(1 / 30, t - this.t)); }
  update() {
    if (this.disposed) return;
    const now = performance.now(); const rdt = Math.min(0.25, Math.max(0, (now - this.last) / 1000)); this.last = now;
    const covered = this.engine.wipeActive && this.engine.wipeMat?.uniforms?.uT?.value > 0.55;
    if (!this.ended) this.step(covered ? 0 : rdt * this.speed);
    this.bars?.update(rdt, this.H); this.narr.update(rdt, this.W, this.H, this.band); for (const c of this.cards) c.update(rdt, this.W, this.H, this.band);
    if (this.ended && (!this.bars || this.bars.gone) && this.narr.empty && this.cards.every((c) => c.gone)) this.dispose();
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; if (!this.ended) { this.ended = true; this.input.remove(this.handler); this._res(); }
    this.engine.remove(this); this.engine.ui.scene.remove(this.group); this.bars?.dispose(); this.narr.dispose(); for (const c of this.cards) c.dispose(); this.cards = [];
    if (window.__cine === this) window.__cine = null;
  }
}

// ================================================================ CAMERA RIG: snap or spring-follow a (position, look, fov) target
export class CamRig {
  constructor(cam) { this.cam = cam; this.pos = cam.position.clone(); this.look = cam.getWorldDirection(V()).multiplyScalar(10).add(cam.position); this.fov = cam.fov; }
  snap(p, l, fov = this.fov) { this.pos.copy(p); this.look.copy(l); this.fov = fov; return this; }
  follow(p, l, fov, dt, rp = 4, rl = 6, rf = 3) { this.pos.lerp(p, 1 - Math.exp(-rp * dt)); this.look.lerp(l, 1 - Math.exp(-rl * dt)); this.fov += (fov - this.fov) * (1 - Math.exp(-rf * dt)); return this; }
  apply() { const c = this.cam; c.position.copy(this.pos); c.lookAt(this.look); if (Math.abs(c.fov - this.fov) > 1e-3) { c.fov = this.fov; c.updateProjectionMatrix(); } }
}
// a horizontal frame at `o` facing `f`: L(x right, y up, z forward)
export function frameAt(o, f) { const F = V(f.x, 0, f.z).normalize(), R = V(-F.z, 0, F.x); return (x, y, z) => o.clone().addScaledVector(R, x).add(V(0, y, 0)).addScaledVector(F, z); }
// a point high in the sunset sky (above the painted sun) for the opening tilt-down
function skyPoint(stage, near) { const s = stage?.sunPos ? stage.sunPos.clone() : near.clone().add(V(30, 18, -140)); return s.add(V(0, 14, 0)); }
// crane: position eases p0 -> p1 while the view direction turns from l0 to l1 (direction interpolation, so a distant
// first target does not hold the camera until the last instant)
const _d0 = V(), _d1 = V();
function crane(rig, p0, l0, p1, l1, u, fov0, fov1) {
  const p = p0.clone().lerp(p1, u); _d0.copy(l0).sub(p0).normalize(); _d1.copy(l1).sub(p1).normalize();
  const dir = _d0.lerp(_d1, ease.io(u)).normalize(); rig.snap(p, p.clone().addScaledVector(dir, 10), fov0 + (fov1 - fov0) * u);
}

// ================================================================ THE PUPPET'S GAIT
// professor.js sets every joint absolutely each frame (springs -> rotation.set); we wrap those setters on the instance
// so a walk cycle is added before the strings are solved (the strings stay attached to the knees and hands).
export class PuppetGait {
  constructor(prof) {
    this.prof = prof; this.phase = 0; this.k = 0; this.spd = 0; this.lastStep = 0; this.off = {}; this.patched = [];
    const L = prof.legs, A = prof.arms;
    const wrap = (key, target) => { if (!target?.set) return; const orig = target.set; const off = this.off; target.set = function (x, y, z, w) { const d = off[key]; return d ? orig.call(this, x + d[0], y + d[1], z + d[2], w) : orig.call(this, x, y, z, w); }; this.patched.push(target); };
    wrap('hipL', L[1]?.hip.rotation); wrap('hipR', L[0]?.hip.rotation); wrap('knL', L[1]?.kn.rotation); wrap('knR', L[0]?.kn.rotation); wrap('anL', L[1]?.an.rotation); wrap('anR', L[0]?.an.rotation);
    wrap('shL', A[1]?.sh.rotation); wrap('elL', A[1] && A[1].el !== A[1].sh ? A[1].el.rotation : null); wrap('shR', A[0]?.sh.rotation);
    wrap('torso', prof.torso?.rotation); wrap('body', prof.body?.position); wrap('ctrl', prof.ctrl?.position);
  }
  // spd: ground speed (units/s). One stride cycle (two steps) covers ~1.5 units.
  step(dt, spd) {
    this.spd += (spd - this.spd) * (1 - Math.exp(-dt * 10));
    const want = this.spd > 0.12 ? 1 : 0; this.k += (want - this.k) * (1 - Math.exp(-dt * (want ? 7 : 4)));
    this.phase += dt * Math.max(this.spd, this.k * 0.8) * (Math.PI * 2 / 1.5);
    const n = Math.floor(this.phase / Math.PI); if (n !== this.lastStep) { this.lastStep = n; if (this.k > 0.4) audio.play('wood_knock', { vol: 0.12 * this.k, minGap: 0.12 }); }
    const k = this.k, sL = Math.sin(this.phase), cL = Math.cos(this.phase), o = this.off;
    const swing = (c) => Math.pow(Math.max(0, c), 1.3); // the knee is yanked up while that leg swings forward
    o.hipL = [-0.46 * sL * k, 0, 0]; o.hipR = [0.46 * sL * k, 0, 0];
    o.knL = [(0.12 + 0.95 * swing(cL)) * k, 0, 0]; o.knR = [(0.12 + 0.95 * swing(-cL)) * k, 0, 0];
    o.anL = [(-0.3 * swing(cL) + 0.18 * sL) * k, 0, 0]; o.anR = [(-0.3 * swing(-cL) - 0.18 * sL) * k, 0, 0];
    o.shL = [0.34 * sL * k, 0, 0.04 * k]; o.elL = [-0.18 * k, 0, 0]; o.shR = [-0.3 * sL * k, 0, 0];
    o.torso = [0.1 * k, 0.13 * sL * k, 0.035 * sL * k];
    o.body = [0.035 * sL * k, (0.055 * Math.abs(cL) - 0.015) * k, 0];
    o.ctrl = [0, 0.07 * Math.abs(cL) * k, 0.22 * k]; // the spectral hand leads and lifts him each step
  }
  stop() { this.k = 0; this.spd = 0; for (const key in this.off) this.off[key] = null; }
  dispose() { this.stop(); for (const t of this.patched) delete t.set; this.patched = []; }
}

// ================================================================ THE ROAD
// stage.road (CatmullRomCurve3 from the environment) when present, else a curve from far left-back. `from`/`to` are
// distances measured back from the road's end; `home` (optional) is appended as the final mark.
export function roadPath(stage, { from = 8, to = 0, home = null } = {}) {
  const road = stage?.road; const pts = [];
  if (road?.getPointAt && road.getLength) {
    const L = road.getLength(); const a = clamp(L - from, 0, L), b = clamp(L - to, 0, L); const n = Math.max(3, Math.ceil((b - a) / 1.3));
    for (let i = 0; i <= n; i++) pts.push(road.getPointAt((a + ((b - a) * i) / n) / L));
    if (home && pts.at(-1).distanceTo(home) > 0.3) pts.push(home.clone()); else if (home) pts[pts.length - 1] = home.clone();
  } else {
    const end = home ? home.clone() : V(-3.5, 0, 0.9); const dir = V(-0.88, 0, -0.47).normalize(); const len = from - to;
    for (let i = 4; i >= 0; i--) { const s = to + (len * i) / 4; pts.push(end.clone().addScaledVector(dir, s).add(V(Math.sin(i * 1.3) * 0.35 * (i / 4), 0, 0))); }
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

// walk a path on a real-time clock: the puppet is carried along, heading with the road, then turns to `endRy`
export class Walker {
  constructor(prof, path, { t0 = 0, speed = 1.75, endRy = null, gait = null, glide = false } = {}) {
    this.prof = prof; this.path = path; this.len = path.getLength(); this.t0 = t0; this.t1 = t0 + this.len / speed; this.endRy = endRy; this.glide = glide;
    this.gait = gait || new PuppetGait(prof); this.prevD = null; this.tan = V(); this.pos = V();
  }
  dist(t) { const u = span(t, this.t0, this.t1); return this.len * (this.glide ? 0.7 * u + 0.3 * u * u : 0.62 * u + 0.38 * ease.io(u)); }
  at(t, out = V()) { return this.path.getPointAt(this.dist(t) / this.len, out); }
  heading(t) { this.path.getTangentAt(clamp(this.dist(t) / this.len, 0.001, 0.999), this.tan); return Math.atan2(this.tan.x, this.tan.z); }
  apply(t, dt) {
    const d = this.dist(t); this.path.getPointAt(d / this.len, this.pos); this.prof.root.position.copy(this.pos);
    let ry = this.heading(t); if (this.endRy != null) ry = lerpAngle(ry, this.endRy, ease.io(span(t, this.t1 - 0.2, this.t1 + 0.5)));
    this.prof.root.rotation.y = ry;
    const spd = dt > 0 && this.prevD != null ? Math.abs(d - this.prevD) / dt : 0; this.prevD = d; this.gait.step(dt, spd);
  }
}

// ================================================================ BATTLE INTRO
// establishing crane -> Sir Isaac walks the road in (tracking) -> whip to each foe as it steps out (name + epithet)
// -> settle into the battle framing. S is the BattleScene. Returns { done, abort }.
const ROADS = { meadow: 'the olive road', garden: 'the road through the marble garden', gully: 'the dry gully road', labyrinth: 'the road to the Labyrinth', marsh: 'the reed-choked marsh road', guardian: 'the last road of the Wilds' };
const ENTRANCE = { satyr: 'hop', kobalos: 'hop', medusa: 'glide', minotaur: 'stomp', minotaur_king: 'stomp', hydra: 'rise', hydra_elder: 'rise' };
const CALL = { satyr: 'drunk_laugh', kobalos: 'goblin_laugh', medusa: 'snake_hiss', minotaur: 'bull_roar', minotaur_king: 'bull_roar', hydra: 'snake_hiss', hydra_elder: 'snake_hiss' };
export function battleIntro(S, { onReveal = () => {} } = {}) {
  const D = new Director(S.engine, S.input); const cam = S.camera, prof = S.prof, rig = new CamRig(cam); const baseFov = cam.fov;
  const home = prof.root.position.clone(), homeRy = prof.root.rotation.y, spiritOff = S.spirit ? S.spirit.position.clone().sub(home) : null;
  const walk = new Walker(prof, roadPath(S.stage, { from: 7.2, home }), { t0: 0.15, speed: 1.75, endRy: homeRy });
  const start = walk.path.getPointAt(0), A = frameAt(start, walk.path.getTangentAt(0.02)); const sky = skyPoint(S.stage, start);
  const views = [...S.enemyViews.values()]; const mains = views.filter((v) => !v.e.def.isHead); const N = mains.length;
  const DN = N <= 1 ? 1.9 : N === 2 ? 1.45 : 1.08; const TA = 2.2, R0 = walk.t1 + 0.3; let S0 = R0 + N * DN, SD = 1.3;
  const BACK = V(0.9, 0, -3.0);
  const foes = mains.map((v, i) => {
    const kids = views.filter((h) => h.e.def.isHead && h.e.parent === v.e.uid);
    const objs = [v.api.root, ...kids.map((k) => k.api.root), ...kids.map((k) => k.api.neckGroup).filter(Boolean)];
    return { v, kids, objs, home: v.api.root.position.clone(), kidHome: kids.map((k) => k.api.root.position.clone()), ry: v.api.root.rotation.y, t0: R0 + i * DN - 0.3, how: ENTRANCE[v.e.id] || (v.e.def.heads ? 'rise' : 'hop'), landed: false, card: null };
  });
  const tmp = V(), d = V();
  const poseFoe = (f, t) => {
    const on = t >= f.t0; for (const o of f.objs) o.visible = on; if (!on) return;
    const u = span(t, f.t0, f.t0 + 0.8), e = ease.out(u), h = f.v.h; d.set(0, 0, 0);
    if (f.how === 'rise') d.set(0, -h * 1.05 * (1 - e), 0);
    else {
      d.copy(BACK).multiplyScalar(1 - e);
      if (f.how === 'hop') d.y = Math.abs(Math.sin(u * Math.PI * 3)) * 0.34 * (1 - u * 0.6);
      if (f.how === 'stomp') d.y = Math.abs(Math.sin(u * Math.PI * 2)) * 0.12;
    }
    f.v.api.root.position.copy(f.home).add(d); f.kids.forEach((k, i) => k.api.root.position.copy(f.kidHome[i]).add(d));
    const face = Math.atan2(-BACK.x, -BACK.z); f.v.api.root.rotation.y = f.how === 'rise' ? f.ry : lerpAngle(face, f.ry, ease.io(span(u, 0.5, 1)));
    if (f.how === 'glide') f.v.api.root.rotation.z = Math.sin(u * Math.PI * 4) * 0.06 * (1 - u);
    if (u >= 1 && !f.landed) {
      f.landed = true; f.v.api.root.rotation.z = 0; S.burst?.(tmp.copy(f.home).add(V(0, 0.25, 0)), 'smoke', f.how === 'rise' ? 22 : 12);
      f.v.api.act?.('cast'); f.v.api.talk?.(1.4); audio.play(CALL[f.v.e.id] || 'monster_growl', { vol: 0.7 }); if (f.how !== 'hop') audio.play('monster_roar', { vol: 0.45 });
      if (f.how === 'stomp' || f.how === 'rise') S.engine.shake(0.22); else audio.play('hoof_stomp', { vol: 0.4 });
    }
  };
  const settleFoes = () => { for (const f of foes) { for (const o of f.objs) o.visible = true; f.v.api.root.position.copy(f.home); f.kids.forEach((k, i) => k.api.root.position.copy(f.kidHome[i])); f.v.api.root.rotation.y = f.ry; f.v.api.root.rotation.z = 0; f.landed = true; } };
  const settleProf = () => { walk.gait.dispose(); prof.root.position.copy(home); prof.root.rotation.y = homeRy; if (spiritOff) S.spirit.position.copy(home).add(spiritOff); };
  // chronicle lines
  const kind = S.encounter?.kind;
  D.at(0.45, () => D.say(`And so the puppet philosopher came upon ${ROADS[S.theme] || ROADS.meadow}…`));
  D.at(Math.max(2.4, walk.t1 - 1.3), () => D.say(kind === 'guardian' ? '…where the master of the Wilds awaited him.' : kind === 'elite' ? '…and there a most perilous foe barred his way.' : '…and found that he did not walk it alone.'));
  D.at(R0 - 0.1, () => { D.narr.clear(); audio.play('whoosh_soft', { vol: 0.6 }); });
  foes.forEach((f, i) => {
    D.at(f.t0 + 0.7, () => { f.card = D.card(f.v.e.def.name, f.v.e.def.title || 'a creature of the Wilds').show(); });
    D.at(i < N - 1 ? R0 + (i + 1) * DN - 0.05 : S0 + 0.05, () => f.card?.hide());
    if (i > 0) D.at(R0 + i * DN - 0.1, () => audio.play('whoosh_soft', { vol: 0.4 }));
  });
  let settleFrom = null, revealed = false, finished = false;
  const finish = () => { if (finished) return; finished = true; settleFoes(); settleProf(); cam.fov = baseFov; cam.updateProjectionMatrix(); if (!revealed) { revealed = true; onReveal(); } D.end(); };
  D.onSkip = () => { settleFoes(); settleProf(); S0 = D.t; SD = 0.55; settleFrom = null; D.bars?.hide(); if (!revealed) { revealed = true; onReveal(); } };
  const head = V(), look = V(), pos = V();
  D.frame = (t, dt) => {
    const scenePos = cam.position.clone(); // the battle camera's own pose this frame (the scene's update just set it)
    if (t < S0) {
      if (!D.skipped) { walk.apply(t, dt); if (spiritOff) S.spirit.position.copy(prof.root.position).add(spiritOff); for (const f of foes) poseFoe(f, t); }
      if (t < TA) { // establishing crane: tilt down from the sunset sky onto the road, sinking in behind the marionette
        const u = ease.io(span(t, 0, TA)); crane(rig, A(-1.8, 5.2, -8.5), sky, A(1.3, 2.3, -4.4), A(-0.6, 1.4, 8), u, 44, 36);
        prof.lookAt(Math.sin(t * 0.8) * 0.3, 0.15);
      } else if (t < R0) { // tracking, front three-quarter, as he walks the last stretch and turns to the field
        const F = frameAt(walk.pos, walk.tan); pos.copy(F(4.0, 1.8, 5.2)); look.copy(walk.pos).add(V(0, 1.75, 0)).addScaledVector(walk.tan, 0.6);
        if (!rig.tracking) { rig.tracking = true; rig.snap(pos, look, 36); } else rig.follow(pos, look, 36, dt, 5, 7);
        prof.lookAt(t > walk.t1 - 0.3 ? 0.7 : Math.sin(t * 1.1) * 0.25, 0.1);
      } else { // reveal: whip to each foe as it steps out
        const i = Math.min(N - 1, Math.floor((t - R0) / DN)); const f = foes[i]; if (f) {
          const h = f.v.h; const E = f.home; const toCam = V(S.camBase.x - E.x, 0, S.camBase.z - E.z).normalize();
          pos.copy(E).addScaledVector(toCam, 2.6 + h * 1.35).add(V(-0.9 - h * 0.15, 0.5 + h * 0.35, 0)); look.copy(E).add(V(-0.15, h * 0.62, 0));
          const first = t - R0 < DN; rig.follow(pos, look, 30, dt, first ? 2.6 : 3.4, first ? 9 : 6);
          head.copy(E).add(V(0, h * 0.95 + 0.2, 0)); const p = S.engine.worldToUI(head); f.card?.at(p.x - 4.6, p.y + 0.2);
          prof.lookAt(0.85, 0.12);
        }
      }
    } else { // settle into the battle framing (camBase / camLook, with the scene's own drift)
      if (!settleFrom) settleFrom = { pos: rig.pos.clone(), look: rig.look.clone(), fov: rig.fov };
      const u = ease.smooth(span(t, S0, S0 + SD));
      rig.snap(pos.copy(settleFrom.pos).lerp(scenePos, u), look.copy(settleFrom.look).lerp(S.camLook, u), settleFrom.fov + (baseFov - settleFrom.fov) * u);
      if (!D.skipped) { D.bars?.hide(); if (!revealed && t > S0 + SD * 0.35) { revealed = true; onReveal(); } }
      if (u >= 1) { rig.apply(); finish(); return; }
    }
    rig.apply();
  };
  for (const f of foes) poseFoe(f, -1); walk.apply(0, 0); D.frame(0, 0);
  const abort = () => { try { finish(); } catch (e) { console.warn(e); } D.dispose(); };
  return { done: D.done, abort, director: D };
}

// ================================================================ EVENT VIGNETTE
// crane over the road -> Sir Isaac walks in -> dolly onto the curiosity (title card + the chronicle's first line) ->
// settle on the scene's resting framing. E is the EventScene (camera, camLook, prof, stage, propFocus, npcs).
export function eventIntro(E, { title, text, onReveal = () => {} } = {}) {
  const D = new Director(E.engine, E.input); const cam = E.camera, prof = E.prof, rig = new CamRig(cam); const baseFov = cam.fov;
  const restPos = cam.position.clone(), restLook = E.camLook.clone();
  const home = prof.root.position.clone(), homeRy = prof.root.rotation.y;
  const walk = new Walker(prof, roadPath(E.stage, { from: 6.6, home }), { t0: 0.15, speed: 1.75, endRy: homeRy });
  const start = walk.path.getPointAt(0), A = frameAt(start, walk.path.getTangentAt(0.02)); const sky = skyPoint(E.stage, start);
  const focus = (E.propFocus || V(-0.6, 1.1, 0)).clone();
  const TA = 2.0, R0 = walk.t1 + 0.25, RD = 2.4; let S0 = R0 + RD, SD = 1.1;
  const first = String(text || '').split(/(?<=[.!?])\s+/)[0] || '';
  D.at(0.4, () => D.say('And the road wound on, until Sir Isaac happened upon a curious sight…'));
  D.at(R0 - 0.1, () => { D.narr.clear(); audio.play('whoosh_soft', { vol: 0.5 }); });
  let card = null;
  D.at(R0 + 0.25, () => { card = D.card(title, 'a Curiosity of the Wilds').show(); if (first) D.say(first); for (const n of E.npcs || []) n.talk?.(1.4); });
  D.at(S0 - 0.1, () => { card?.hide(); D.narr.clear(); });
  let settleFrom = null, revealed = false, finished = false;
  const settleProf = () => { walk.gait.dispose(); prof.root.position.copy(home); prof.root.rotation.y = homeRy; };
  const finish = () => { if (finished) return; finished = true; settleProf(); cam.fov = baseFov; cam.updateProjectionMatrix(); cam.position.copy(restPos); cam.lookAt(restLook); if (!revealed) { revealed = true; onReveal(); } D.end(); };
  D.onSkip = () => { settleProf(); S0 = D.t; SD = 0.5; settleFrom = null; D.bars?.hide(); };
  const pos = V(), look = V(); const cardAt = V();
  D.frame = (t, dt) => {
    if (t < S0) {
      if (!D.skipped) walk.apply(t, dt);
      if (t < TA) { const u = ease.io(span(t, 0, TA)); crane(rig, A(-1.8, 5.0, -8.5), sky, A(1.2, 2.2, -4.2), A(-0.4, 1.3, 8), u, 44, 36); prof.lookAt(Math.sin(t * 0.8) * 0.3, 0.15); }
      else if (t < R0) {
        const F = frameAt(walk.pos, walk.tan); pos.copy(F(4.0, 1.8, 5.2)); look.copy(walk.pos).add(V(0, 1.75, 0)).addScaledVector(walk.tan, 0.6);
        if (!rig.tracking) { rig.tracking = true; rig.snap(pos, look, 36); } else rig.follow(pos, look, 36, dt, 5, 7);
        prof.lookAt(t > walk.t1 - 0.4 ? 0.6 : Math.sin(t * 1.1) * 0.25, 0.1);
      } else { // a slow dolly onto the curiosity, Sir Isaac at the edge of frame
        const u = ease.io(span(t, R0, S0)); pos.copy(focus).add(V(-2.6 + u * 0.9, 1.1 - u * 0.3, 6.4 - u * 1.4)); look.copy(focus).add(V(-0.5, 0.1, 0));
        rig.follow(pos, look, 30, dt, 2.4, 6); prof.lookAt(0.7, 0.1);
        cardAt.copy(focus).add(V(0, 1.6, 0)); const p = E.engine.worldToUI(cardAt); card?.at(p.x - 5, p.y + 1.2);
      }
    } else {
      if (!settleFrom) settleFrom = { pos: rig.pos.clone(), look: rig.look.clone(), fov: rig.fov };
      const u = ease.smooth(span(t, S0, S0 + SD));
      rig.snap(pos.copy(settleFrom.pos).lerp(restPos, u), look.copy(settleFrom.look).lerp(restLook, u), settleFrom.fov + (baseFov - settleFrom.fov) * u);
      D.bars?.hide(); if (!revealed && u > 0.55) { revealed = true; onReveal(); }
      if (u >= 1) { rig.apply(); finish(); return; }
    }
    rig.apply();
  };
  walk.apply(0, 0); D.frame(0, 0);
  const abort = () => { try { finish(); } catch (e) { console.warn(e); } D.dispose(); };
  return { done: D.done, abort, director: D };
}

// ================================================================ TRAVEL SHOT
// a stretch of the road between map nodes: crane, then a tracking walk; ends while he is still walking (<= 5 s).
export function travelShot(T, { lines = [], dur = 4.6 } = {}) {
  const D = new Director(T.engine, T.input); const cam = T.camera, prof = T.prof, rig = new CamRig(cam);
  const walk = new Walker(prof, roadPath(T.stage, { from: 19, to: 10.5 }), { t0: 0.05, speed: 1.75, glide: true });
  const start = walk.path.getPointAt(0), A = frameAt(start, walk.path.getTangentAt(0.02)); const TA = 1.9; const sky = skyPoint(T.stage, start);
  lines.forEach((l, i) => D.at(0.3 + i * 2.0, () => D.say(l)));
  D.at(dur - 0.5, () => { D.narr.clear(); D.bars?.hide(); });
  D.at(dur, () => { walk.gait.dispose(); D.end(); });
  D.onSkip = () => { D.at(D.t + 0.15, () => { walk.gait.dispose(); D.end(); }); D.bars?.hide(); };
  const pos = V(), look = V();
  D.frame = (t, dt) => {
    walk.apply(t, dt);
    if (t < TA) { const u = ease.io(span(t, 0, TA)); crane(rig, A(-1.5, 5.0, -8.5), sky, A(1.6, 2.2, -4.0), A(-0.3, 1.3, 8), u, 44, 36); }
    else {
      const F = frameAt(walk.pos, walk.tan); pos.copy(F(4.6, 1.8, 3.4)); look.copy(walk.pos).add(V(0, 1.7, 0)).addScaledVector(walk.tan, 1.0);
      if (!rig.tracking) { rig.tracking = true; rig.snap(pos, look, 36); } else rig.follow(pos, look, 36, dt, 5, 7);
    }
    prof.lookAt(Math.sin(t * 0.9) * 0.35, 0.12); rig.apply();
  };
  walk.apply(0, 0); D.frame(0, 0);
  return { done: D.done, abort: () => { walk.gait.dispose(); D.dispose(); }, director: D, walk };
}
