// THE SPELL CARD: merging cards is mixing an EQUATION, and its result is a complete spell card that hangs beside the
// object it will launch. A distinct gilded, arcane frame (night-indigo field, a double gold border, corner diamonds,
// rune ticks), the spell's name, its ingredients ("Apple + Force + Spin"), its equation ("1 kg × 5 m/s × 2 = 10"),
// its full stats (damage to its target, Burn, Zap, Heat...), and as its art an ANIMATED live 3D scene: a little stage
// on which Sir Isaac (the real professor rig) performs exactly this attack with exactly this object, on a loop.
// Performance: one small render target per visible spell card (at most three hang in the air), redrawn at 10 fps
// at rest and 30 fps when hovered; the stages are pooled and reused.
import * as THREE from 'three';
import { createProfessor } from '../models/professor.js';
import { projectileModel } from './fieldviews.js';
import { attackStyle } from './battlecine.js';
import { drawPixelText, measure } from '../ui3d/craft.js';
import { agePaper, RES } from '../gfx/cardart.js';
import { BASICS } from '../game/data/cards.js';
import { fmtMul } from './manifest.js';

const PW = 120, PH = 168, CS = 4; // the face is pixel art at 120x168, blown up 4x with nearest filtering
export const ART = { x: 8, y: 25, w: 104, h: 60 };
export const SPELL_W = 3.0, SPELL_H = 4.2;
const GOLD = ['#2c1c0c', '#5c4018', '#8c6c32', '#b89a56', '#dcc690']; // tarnished gilt (an old book's gold tooling)
const INK = '#120a1e';

// ---------------------------------------------------------------- the face (canvas)
function px(g, x, y, c, w = 1, h = 1) { g.fillStyle = c; g.fillRect(x * CS, y * CS, w * CS, h * CS); }
function frame(g, seed) {
  // night-indigo field with a scatter of pixel stars (and the art window cut out)
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const band = y < 22 ? 0 : y < 90 ? 1 : 2; px(g, x, y, ['#221c2a', '#1c1824', '#201a28'][band]); }
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 60; i++) { const x = 3 + Math.floor(rnd() * (PW - 6)), y = 3 + Math.floor(rnd() * (PH - 6)); px(g, x, y, rnd() < 0.3 ? '#bcb0a0' : '#5a5262'); }
  // the double gold border with a bevel
  const rect = (x0, y0, x1, y1, c) => { for (let x = x0; x <= x1; x++) { px(g, x, y0, c); px(g, x, y1, c); } for (let y = y0; y <= y1; y++) { px(g, x0, y, c); px(g, x1, y, c); } };
  rect(0, 0, PW - 1, PH - 1, GOLD[0]); rect(1, 1, PW - 2, PH - 2, GOLD[3]); rect(2, 2, PW - 3, PH - 3, GOLD[2]); rect(3, 3, PW - 4, PH - 4, GOLD[1]); rect(5, 5, PW - 6, PH - 6, GOLD[2]);
  for (let x = 2; x < PW - 2; x += 1) px(g, x, 1, GOLD[4]); // top highlight
  // corner diamonds and side rune ticks
  for (const [cx, cy] of [[5, 5], [PW - 6, 5], [5, PH - 6], [PW - 6, PH - 6]]) for (let d = -3; d <= 3; d++) { const w = 3 - Math.abs(d); for (let k = -w; k <= w; k++) px(g, cx + k, cy + d, Math.abs(k) + Math.abs(d) <= 1 ? GOLD[4] : GOLD[3]); }
  for (let y = 30; y < PH - 30; y += 9) { px(g, 1, y, GOLD[4], 1, 3); px(g, PW - 2, y + 4, GOLD[4], 1, 3); }
  // the art window: a gold inner rim, then transparent (the live 3D scene shows through)
  const { x, y, w, h } = ART; rect(x - 2, y - 2, x + w + 1, y + h + 1, GOLD[1]); rect(x - 1, y - 1, x + w, y + h, GOLD[3]);
  g.clearRect(x * CS, y * CS, w * CS, h * CS);
  // separators: a gold rule under the window and above the footer, with a centre gem
  for (let xx = 10; xx < PW - 10; xx++) { px(g, xx, 104, GOLD[2]); px(g, xx, 150, GOLD[1]); }
  for (let d = -2; d <= 2; d++) { px(g, 60 + d, 104 - (2 - Math.abs(d)), '#8a6a7e'); px(g, 60 + d, 104 + (2 - Math.abs(d)), '#8a6a7e'); }
}
/** the face for a held object's Move: { name, recipe, eq, total, target, hits, chips:[[text, col]], law } */
export function spellFace(info) {
  const c = document.createElement('canvas'); c.width = Math.round(PW * CS * RES); c.height = Math.round(PH * CS * RES); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.setTransform(RES, 0, 0, RES, 0, 0);
  frame(g, info.seed || 7); g.setTransform(1, 0, 0, 1, 0, 0); agePaper(c, info.seed || 7, 'power'); g.setTransform(RES, 0, 0, RES, 0, 0); // aged gilt and vellum, then crisp Alagard on top
  const T = (s, x, y, f, color, o = {}) => drawPixelText(g, s, x, y, f, { color, align: 'center', ...o });
  const fit = (s, f, max, ks) => { for (const k of ks) if (measure(s, f) * k <= max) return k; return 0; };
  // the name, Alagard on the title band
  const name = info.name; let k = fit(name, 'head', 104 * CS, [2, 1]); if (k) T(name, (PW / 2) * CS, 18 * CS, 'head', '#ecdcae', { k, outline: '#22160c', shadow: '#0c0806' }); else T(name, (PW / 2) * CS, 17 * CS, 'body', '#ecdcae', { k: 2, outline: '#22160c' });
  // the ingredients and the equation
  const rec = info.recipe; k = fit(rec, 'body', 108 * CS, [2, 1]); T(rec, (PW / 2) * CS, 95 * CS, 'body', '#bdb2c0', { k: k || 1 });
  const eq = info.eq; k = fit(eq, 'body', 108 * CS, [3, 2, 1]); T(eq, (PW / 2) * CS, 101.5 * CS, 'body', '#e6d6a6', { k: k || 1, outline: '#1a0c08' });
  // the result: the big number, at whom, then the effect chips
  const big = info.fizzle ? 'FIZZLE' : String(info.total); T(big, (PW / 2) * CS, 124 * CS, info.fizzle ? 'body' : 'num', info.fizzle ? '#dcae9c' : '#e09272', { k: info.fizzle ? 3 : 4, outline: '#2a0e0c', shadow: '#0a0606' });
  if (!info.fizzle) T(info.target ? `DAMAGE → ${info.target.toUpperCase()}` : info.launched ? 'DAMAGE' : 'NOT LAUNCHED: ADD FORCE', (PW / 2) * CS, 131.5 * CS, 'body', info.launched ? '#e0d4c0' : '#dcae9c', { k: fit(info.target ? `DAMAGE → ${info.target.toUpperCase()}` : 'NOT LAUNCHED: ADD FORCE', 'body', 106 * CS, [2, 1]) || 1 });
  let x = 10; const y0 = 137; const chips = info.chips.slice(0, 4); const ws = chips.map(([t]) => measure(t, 'body') + 8); const tot = ws.reduce((a, b) => a + b + 3, -3); x = Math.round((PW * CS - tot * 2) / 2 / CS);
  chips.forEach(([t, col], i) => { const w = ws[i]; for (let yy = 0; yy < 10; yy++) for (let xx = 0; xx < w / 2 + 1; xx++) px(g, x + xx, y0 + yy, yy === 0 || yy === 9 ? GOLD[1] : '#2a2230'); drawPixelText(g, t, (x + 1) * CS + 4, (y0 + 7.5) * CS, 'body', { color: col, k: 2 }); x += Math.round(w / 2) + 3; });
  T(info.law ? 'A LAW OF NATURE' : `SPELL · ${info.n} CARDS`, (PW / 2) * CS, 160 * CS, 'rune', info.law ? '#d8bc72' : '#a49ab4', { k: 2 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
}
/** what the spell card says, from a held object's preview */
export function spellInfo(pv, o, B) {
  const mv = pv.mv, a = mv.attack, e = pv.est; const names = []; const seen = new Map(); for (const c of o.comps) seen.set(c.id, (seen.get(c.id) || 0) + 1);
  for (const [id, n] of seen) names.push((n > 1 ? n + '× ' : '') + (BASICS[id]?.name || id));
  const mul = e ? e.mul : a.compMul || 1; const hits = e ? e.hits : a.hits || 1;
  const eq = a.fizzle ? 'it fizzles: 0' : `${a.m}kg × ${a.v}m/s${hits > 1 ? ` × ${hits}` : ''}${Math.abs(mul - 1) > 0.01 ? ` × ${fmtMul(mul)}` : ''}${e?.zap ? ` + ${e.zap}` : ''} = ${e ? e.total : a.total}`;
  const chips = []; if (a.spread) chips.push(['ALL', '#d6a8ff']); if (a.burn) chips.push([`BURN ${a.burn}`, '#ffb070']); if (a.charge) chips.push([`ZAP ${a.charge}`, '#fff3b0']); if (a.wet) chips.push([`WET ${a.wet}`, '#9fd6ff']);
  if (a.weak || a.chill || a.weakOnHit) chips.push([`WEAK ${a.weak || a.chill || a.weakOnHit}`, '#bfe8a6']); if (a.venom) chips.push([`VENOM ${a.venom}`, '#bfe08a']); if (a.fall) chips.push(['FALLS', '#cdb6ff']); if (a.pierce) chips.push(['PIERCE', '#e8dcc8']);
  if (a.heat) chips.push([`HEAT ${a.heat}`, '#ff9a5a']);
  return { name: mv.name, recipe: names.join(' + '), eq, total: e ? e.total : a.total, target: pv.target?.def.name || '', launched: a.launched, fizzle: !!a.fizzle || !!e?.fizzle, chips, law: !!mv.special?.law, n: o.comps.length, seed: o.uid.length * 31 + o.comps.length };
}

// ---------------------------------------------------------------- the live stage (pooled)
function pixelSky() { // banded dusk sky in flat pixel bands (no smooth gradient) with a few stars
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d'); const B = ['#20163e', '#2a1c4e', '#3a2660', '#5a3470', '#8a4a6a', '#c86a5a'];
  for (let y = 0; y < 32; y++) { g.fillStyle = B[Math.min(B.length - 1, Math.floor((y / 32) ** 1.4 * B.length))]; g.fillRect(0, y, 32, 1); }
  for (const [x, y] of [[3, 2], [9, 5], [17, 3], [25, 6], [29, 2], [13, 9], [21, 11]]) { g.fillStyle = '#efe4ff'; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function plinth() { // a worn marble slab to stand on (square, chamfered, pixel-textured)
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const h = Math.sin(x * 12.9 + y * 78.2) * 43758.5; const v = h - Math.floor(h); g.fillStyle = v > 0.85 ? '#a89a88' : v > 0.4 ? '#c8bca8' : '#b8ac98'; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.22, 8), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, flatShading: true })); m.position.y = -0.11; m.receiveShadow = true; return m;
}
class Stage {
  constructor(renderer) {
    this.renderer = renderer; this.rt = new THREE.WebGLRenderTarget(256, 148, { samples: 0 }); this.rt.texture.magFilter = THREE.LinearFilter; // (linear: three renders a target in working space)
    const sc = (this.scene = new THREE.Scene()); sc.background = pixelSky();
    const key = new THREE.DirectionalLight(0xffd8a8, 2.8); key.position.set(2.5, 4, 3.5); const rim = new THREE.DirectionalLight(0x9a8aff, 1.6); rim.position.set(-3, 2.5, -2.5); sc.add(key, rim, new THREE.HemisphereLight(0xb8a8ff, 0x3a2a20, 0.9));
    this.prof = createProfessor(); this.prof.root.rotation.y = Math.PI / 2 - 0.35; sc.add(this.prof.root); sc.add(plinth());
    this.cam = new THREE.PerspectiveCamera(30, 256 / 148, 0.1, 50); this.cam.position.set(0.55, 1.25, 4.1); this.cam.lookAt(0.55, 0.95, 0);
    this.obj = null; this.key = ''; this.t = 0; this.acc = 1; this.trail = [];
  }
  set(style, art) {
    const key = style + JSON.stringify(art); if (key === this.key) return; this.key = key; this.style = style; this.art = art;
    if (this.obj) this.scene.remove(this.obj); this.obj = projectileModel(art); this.obj.scale.multiplyScalar(0.55); this.scene.add(this.obj); this.t = 0; this.I = null;
  }
  update(dt, fps) {
    this.t += dt; this.acc += dt; const P = this.prof; const loop = 2.6;
    if (this.I == null || this.t >= loop) { this.t = this.t >= loop ? this.t - loop : this.t; this.I = P.act(this.style || 'throw', { object: true }) ?? 0.6; if (typeof this.I !== 'number') this.I = 0.6; }
    P.update(dt);
    const o = this.obj; if (o) {
      const fly = Math.max(0, this.t - this.I) / 0.55; const hand = P.handWorld(this.style === 'spin' || this.style === 'throw' ? 1 : 0, new THREE.Vector3());
      if (this.style === 'gravity') { o.position.set(2.2, 2.6 - Math.min(1, Math.max(0, this.t - this.I) / 0.5) ** 2 * 2.6, 0); o.visible = this.t < this.I + 0.6; }
      else if (fly <= 0) { o.position.copy(hand).add(new THREE.Vector3(0.05, this.style === 'hurl' ? 0.2 : 0.04, 0.05)); o.visible = true; }
      else { o.position.set(hand.x + fly * 3.4, hand.y + Math.sin(Math.min(1, fly) * Math.PI) * 0.35 - fly * 0.2, hand.z * (1 - fly)); o.visible = fly < 1; }
      o.rotation.y += dt * (this.art?.spin ? 14 : 2); o.rotation.x += dt * (this.art?.spin ? 6 : 1.2);
      if (this.style === 'timestop') { const k = Math.max(0, Math.min(1, (this.t - this.I) / 0.3)); o.scale.setScalar(0.55 * (1 + Math.sin(this.t * 20) * 0.04 * k)); }
    }
    if (this.acc < 1 / fps) return false; this.acc = 0;
    const R = this.renderer; const prev = R.getRenderTarget(); const tm = R.toneMapping; R.setRenderTarget(this.rt); R.toneMapping = THREE.NoToneMapping; R.clear(); R.render(this.scene, this.cam); R.toneMapping = tm; R.setRenderTarget(prev); return true;
  }
}
const POOL = [];
function takeStage(renderer) { return POOL.pop() || new Stage(renderer); }
function giveStage(s) { if (POOL.length < 3) POOL.push(s); else s.rt.dispose(); }

// ---------------------------------------------------------------- the card (UI layer)
export class SpellCard {
  constructor(engine) {
    this.E = engine; this.group = new THREE.Group(); this.key = ''; this.vis = 0; this.target = 0; this.hover = false; this.t = 0;
    this.faceM = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, toneMapped: false, depthWrite: true });
    this.artM = new THREE.MeshBasicMaterial({ toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(SPELL_W, SPELL_H), this.faceM); face.position.z = 0.012; face.renderOrder = 22;
    const aw = (ART.w / PW) * SPELL_W, ah = (ART.h / PH) * SPELL_H; const art = new THREE.Mesh(new THREE.PlaneGeometry(aw, ah), this.artM); art.position.set(((ART.x + ART.w / 2) / PW - 0.5) * SPELL_W, (0.5 - (ART.y + ART.h / 2) / PH) * SPELL_H, 0.0); art.renderOrder = 21;
    const back = new THREE.Mesh(new THREE.BoxGeometry(SPELL_W * 1.0, SPELL_H * 1.0, 0.05), new THREE.MeshStandardMaterial({ color: 0x6e5634, metalness: 0.6, roughness: 0.5, emissive: 0x1a1208 })); back.position.z = -0.03;
    this.pivot = new THREE.Group(); this.pivot.add(back, art, face); this.group.add(this.pivot); this.group.visible = false; this.mesh = face; face.userData.spell = this;
  }
  set(pv, o, B) {
    const info = pv && o.comps.length > 1 ? spellInfo(pv, o, B) : null; const key = info ? JSON.stringify(info) : '';
    if (key === this.key) return false; const first = !this.key; this.key = key; this.target = info ? 1 : 0; if (!info) return false;
    this.faceM.map?.dispose(); this.faceM.map = spellFace(info); this.faceM.needsUpdate = true;
    if (!this.stage) { this.stage = takeStage(this.E.renderer); this.artM.map = this.stage.rt.texture; this.artM.needsUpdate = true; }
    this.stage.set(attackStyle(pv.mv), pv.mv.art); this.flipT = first ? 0 : 0.35; return true;
  }
  update(dt, x, y, z, hover) {
    this.t += dt; this.vis += (this.target - this.vis) * Math.min(1, dt * 7); this.hover = hover; this.group.visible = this.vis > 0.02;
    if (!this.group.visible) return; const s = this.vis * (hover ? 0.92 : 0.52); const kz = (40 - z) / 40;
    this.group.position.set(x * kz, y * kz, z + (hover ? 0.6 : 0)); this.group.scale.setScalar(s * kz);
    this.flipT = Math.max(0, (this.flipT || 0) - dt); this.pivot.rotation.set(Math.sin(this.t * 1.1) * 0.03, Math.sin(this.flipT / 0.35 * Math.PI) * 1.2 + Math.sin(this.t * 0.8) * 0.06, Math.sin(this.t * 0.9) * 0.02);
    this.stage?.update(dt, hover ? 30 : 10);
  }
  dispose() { this.group.parent?.remove(this.group); this.faceM.map?.dispose(); this.faceM.dispose(); this.artM.dispose(); if (this.stage) { giveStage(this.stage); this.stage = null; } }
}
