// The physical HUD (replaces the old DOM overlay). Everything lives in the UI scene as lit, shadow-casting objects:
// embroidered cloth pennants (banners), pinned paper slips that drop in and fall away (toasts), torn speech scraps,
// pinned parchment notes (tooltips) and the battle / map instrument cluster.
import * as THREE from 'three';
import { uiRig, uiPos, disposeTree } from './craft.js';
import { Paper, NoteTip, Pennant, ChapterCard } from './objects.js';
import { Manometer, WardShield, Pouch, Bell, Bin, LawTag, EnemyBoard, roman } from './hudparts.js';
import { audio } from '../core/audio.js';

const _v = new THREE.Vector3();
const plain = (t) => String(t ?? '').replace(/&middot;/g, '·').replace(/&times;/g, '×').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '');

class Hud {
  constructor() { this.engine = null; this.input = null; this.root = null; this.slips = []; this.speech = new Set(); this.tips = new Set(); this.ptr = new THREE.Vector3(); }
  attach(engine, input) {
    if (this.root) return this; this.engine = engine; this.input = input || window.__game?.input || null;
    uiRig(engine); this.root = new THREE.Group(); this.root.name = 'hud'; engine.ui.scene.add(this.root);
    this.pennant = new Pennant(); this.root.add(this.pennant.group); this.chapterCard = new ChapterCard(); this.root.add(this.chapterCard.group); engine.add(this); return this;
  }
  get W() { return this.engine.uiW; } get H() { return this.engine.uiH; }
  pointer(z = 1) { const cam = this.engine.ui.camera; const ndc = this.input?.ndc || { x: 0, y: 0 }; _v.set(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize(); return this.ptr.copy(cam.position).addScaledVector(_v, (z - cam.position.z) / _v.z); }
  clear() { for (const s of this.slips) this.root.remove(s.paper.group); this.slips = []; for (const b of this.speech) this.root.remove(b.paper.group); this.speech.clear(); for (const t of this.tips) t.hide(); }
  // important events become pinned slips; the rest is shown by the scene itself (numbers, barks, banners)
  feed(text, kind = '') { if (kind === 'arc') this.toast(plain(text)); }
  toast(text) {
    this.attach(window.__game?.engine); const tx = String(text); const p = new Paper({ font: 'handS', maxW: 13, pin: true, kind: 'note' }); p.set([[[tx[0] || '', '#8a1a1c'], [tx.slice(1), '#2a160c']]]); // chronicle caption with a rubricated initial
    const slot = this.slips.length; const y = this.H - 4.4 - slot * 1.5; p.place(0, this.H + 3, 9); p.group.visible = true; p.st.set(1); p.restRz = (Math.random() - 0.5) * 0.8; this.root.add(p.group);
    const s = { paper: p, y, t: 0, life: 2.8, fall: null }; this.slips.push(s); audio.play('paper_rustle', { vol: 0.5 });
    while (this.slips.filter((x) => !x.fall).length > 3) { const o = this.slips.find((x) => !x.fall); o.life = 0; }
    return s;
  }
  banner(title, sub = '', kind = '', hold = 0.9) { this.attach(window.__game?.engine); this.pennant.y0 = this.H + 0.25; return this.pennant.show(title, plain(sub), kind, hold); }
  // battle start: an illuminated storybook leaf slides onto the table ("Chapter IV / In Which ...")
  chapter(num, title, note = '') { this.attach(window.__game?.engine); return this.chapterCard.show(roman(num), title, note); }
  skipChapter() { this.chapterCard?.away(); }
  bubble(text, kind = '', speaker = null) {
    this.attach(window.__game?.engine); const p = new Paper({ font: 'handS', maxW: 7.5, tail: kind === 'foe' ? 'right' : true, pin: false, kind: 'scrap', tone: kind === 'foe' ? 3 : 4, title: 'head' }); p.set(speaker ? [[[`Quoth ${speaker}`, '#8a1a1c']], [[String(text), '#2a160c']]] : [String(text)], { title: !!speaker });
    p.group.visible = true; p.st.set(0.2); p.st.target = 1; p.rz.kick((Math.random() - 0.5) * 20); this.root.add(p.group);
    const b = { paper: p, kind, at: (x, y) => { const off = kind === 'foe' ? -(p.w / 2 - 22 / 24 - 0.25) : p.w / 2 - 14 / 24 - 0.25; const k = 33 / 40; p.baseScale = k; p.group.position.set((x + off) * k, (y + p.h - 0.22) * k, 7); }, fall: null, remove: () => { this.root.remove(p.group); p.dispose(); this.speech.delete(b); }, drop: () => { if (!b.fall) b.fall = { vy: 1.5, vx: (Math.random() - 0.5) * 2, t: 0 }; } };
    this.speech.add(b); return b;
  }
  update(dt) {
    if (!this.root) return; const ptr = this.pointer(6);
    this.pennant.update(dt); this.chapterCard.update(dt);
    let i = 0;
    for (const s of this.slips) {
      const p = s.paper; s.t += dt;
      if (!s.fall) { s.life -= dt; const ty = this.H - 4.6 - i * 1.5; i++; const kz = (40 - 9) / 40; p.baseScale = kz; const g = p.group.position; g.x = 0; g.y += ((ty + p.h / 2 - 0.22) * kz - g.y) * Math.min(1, dt * 9); if (s.life <= 0) { s.fall = { vy: 2, vx: (Math.random() - 0.5) * 3, spin: (Math.random() - 0.5) * 4 }; p.pin && (p.pin.visible = false); audio.play('paper_rustle', { vol: 0.3 }); } }
      else { s.fall.vy -= 18 * dt; p.group.position.x += s.fall.vx * dt; p.group.position.y += s.fall.vy * dt; p.group.rotation.z += s.fall.spin * dt; p.group.rotation.x += dt * 2; }
      p.update(dt, null);
    }
    this.slips = this.slips.filter((s) => { if (s.fall && s.paper.group.position.y < -this.H - 6) { this.root.remove(s.paper.group); s.paper.dispose(); return false; } return true; });
    for (const b of this.speech) {
      const p = b.paper; p.update(dt, null);
      if (b.fall) { b.fall.t += dt; b.fall.vy -= 9 * dt; p.group.position.y += b.fall.vy * dt; p.group.position.x += b.fall.vx * dt; p.group.rotation.z += b.fall.vx * dt * 0.4; p.st.target = 0; if (b.fall.t > 0.45) b.remove(); }
    }
    for (const t of this.tips) t.paper.update(dt, ptr);
  }
}
export const hud = new Hud();

// pinned parchment note tooltip (same API as before: show(lines, x, y, z) / hide() / update())
export class HudTip {
  constructor(opts = {}) { this.opts = opts; this.t = null; }
  get tip() { if (!this.t) { hud.attach(window.__game?.engine); this.t = new NoteTip(hud.engine, this.opts); hud.root.add(this.t.group); hud.tips.add(this.t); } return this.t; }
  get group() { return this.tip.group; }
  show(lines, x, y, z = 8, opts = {}) { this.on = true; this.tip.show(lines, x, y, Math.max(z, 8), opts); }
  hide() { if (this.t) this.t.hide(); this.on = false; }
  update() {}
  dispose() { if (!this.t) return; this.t.hide(); hud.tips.delete(this.t); hud.root.remove(this.t.group); this.t.paper.dispose(); this.t = null; }
}

// ---------------------------------------------------------------- the instrument cluster
export class BattleHUD {
  constructor({ area = 'The Mythical Wilderness', floor = 1, kind = 'battle', foes = [], onEnd, onWell, mode = 'battle', sub = null }) {
    const E = window.__game?.engine; hud.attach(E); this.engine = hud.engine; this.mode = mode; this.onEnd = onEnd; this.onWell = onWell;
    this.root = new THREE.Group(); this.root.name = 'battle-hud'; this.engine.ui.scene.add(this.root);
    this.area = area; this.floor = floor; this.kind = kind; this.sub = sub ? plain(sub) : null; this.turn = 1; this.objective = foes.length ? `Defeat ${foes.join(' & ')}` : '';
    this.gauge = new Manometer(); this.pouch = new Pouch(); this.root.add(this.gauge.group, this.pouch.group);
    this.note = new Paper({ font: 'hand', maxW: 10, pin: true, kind: 'letter', pad: 9 }); this.note.group.visible = true; this.note.st.set(1); this.root.add(this.note.group);
    if (mode !== 'map') {
      this.shield = new WardShield(); this.bell = new Bell(); this.bin = new Bin(); this.root.add(this.shield.group, this.bell.group, this.bin.group);
      this.laws = []; this.lawTip = new HudTip();
      this.handler = window.__game.input.push({ move: () => this.move(), click: () => this.click() });
    }
    this.plates = new Set(); this.v = {}; this.writeNote(); this.layout(); this.engine.add(this);
  }
  get k() { return Math.max(0.42, Math.min(1, this.engine.uiW / 17)); }
  layout() {
    const W = this.engine.uiW, H = this.engine.uiH, k = this.k; this._W = W;
    uiPos(this.gauge.group, -W + 2.5 * k, H - 2.45 * k, 1); this.gauge.group.scale.setScalar(k);
    uiPos(this.pouch.group, -W + (this.mode === 'map' ? 6.0 : 8.4) * k, H - 2.0 * k, 1.2); this.pouch.group.scale.setScalar(k);
    this.note.group.scale.setScalar(k); uiPos(this.note.group, W - (this.note.w / 2 + 0.4) * k, H - 0.5 * k, 1.5);
    if (this.mode === 'map') return;
    uiPos(this.shield.group, -W + 5.65 * k, H - 0.7 * k, 1.1); this.shield.group.scale.setScalar(k);
    uiPos(this.bell.group, W - 1.9 * k, -H + 1.95 * k, 1.2); this.bell.group.scale.setScalar(0.9 * k);
    uiPos(this.bin.group, W - 4.9 * k, -H + 2.15 * k, 1.0); this.bin.group.scale.setScalar(0.88 * k);
    this.layoutLaws();
  }
  layoutLaws() { const W = this.engine.uiW, H = this.engine.uiH, k = this.k; let x = -W + 0.6 * k; for (const l of this.laws) { l.group.scale.setScalar(k); uiPos(l.group, x + (l.w / 2) * k, H - 5.3 * k, 1.4); x += (l.w + 0.25) * k; } }
  onResize() { this.layout(); }
  writeNote() {
    const head = this.mode === 'map' ? this.area : this.area; const L = [[[head, '#3a2410']]];
    const sub = this.sub || `Floor ${roman(this.floor)} · Turn ${roman(this.turn)}${this.kind !== 'battle' && this.kind !== 'normal' ? ` · ${this.kind === 'guardian' ? 'Guardian' : 'Elite'}` : ''}`;
    L.push([[sub, this.kind === 'elite' || this.kind === 'guardian' ? '#8f2a2e' : '#5a3622']]); if (this.objective && this.mode !== 'map') L.push([['Defeat ', '#2a160c'], [this.objective.replace(/^Defeat /, ''), '#8f2a2e']]);
    this.note.set(L, { title: true }); this.note.kick(0.5); if (this._W != null) this.layout();
  }
  _set(k, v, fn) { if (this.v[k] !== v) { this.v[k] = v; fn(v); } }
  setVitals(hp, max, block, gold) { this.gauge.set(hp, max); this.shield?.set(block); this.pouch.set(gold); }
  setObjective(text) { this._set('obj', text, () => { this.objective = plain(text); this.writeNote(); }); }
  setTurn(n) { this._set('turn', n, () => { this.turn = n; this.writeNote(); }); }
  setRedraws(n) { this.bin?.set(n); }
  setEnd(on, label) { if (!this.bell) return; this._set('end', on + (label || ''), () => { this.bell.setEnabled(on); this.bell.setLabel(on ? 'End Turn' : label && label !== 'End Turn' ? label : 'Wait', on ? 'SPACE' : ''); }); }
  ringEnd() { this.bell?.ring(); }
  // hit tests: screen px (bin drop) or the current pointer ray (bell / bin / law hover)
  ray(objs) { const r = new THREE.Raycaster(); r.setFromCamera(hud.input.ndc, this.engine.ui.camera); return r.intersectObjects(objs, true)[0]; }
  wellHit(sx, sy) {
    if (!this.bin) return false; const cam = this.engine.ui.camera; this.bin.group.getWorldPosition(_v); _v.project(cam);
    const cx = (_v.x * 0.5 + 0.5) * innerWidth, cy = (0.5 - _v.y * 0.5) * innerHeight; const r = innerHeight / (this.engine.uiH * 2) * 1.9 * this.k;
    return Math.abs(sx - cx) < r * 1.05 && sy > cy - r * 1.15 && sy < cy + r * 1.1;
  }
  wellUI() { this.bin.group.getWorldPosition(_v); return [_v.x, _v.y + 0.6 * this.k]; }
  setWellHot(b) { this.bin?.setHot(b); }
  addLaw(name, tip) { const l = new LawTag(plain(name), plain(tip)); this.root.add(l.group); this.laws.push(l); this.layoutLaws(); audio.play('pin', { vol: 0.5 }); }
  plate(name) { const p = new EnemyBoard(name); this.root.add(p.group); this.plates.add(p); return p; }
  move() {
    const hit = this.ray([...this.bell.hit, ...this.bin.hit, ...this.laws.map((l) => l.hit)]); const o = hit?.object;
    const bell = !!o?.userData.bell || this.bell.hit.includes(o), bin = this.bin.hit.includes(o), law = o?.userData.law || null;
    if (bell !== this.bell.hover && bell && this.bell.enabled) audio.play('ui_hover', { vol: 0.4 }); this.bell.hover = bell && this.bell.enabled; this.bin.hover = bin;
    for (const l of this.laws) l.hover = l === law;
    if (law !== this._law) { this._law = law; if (law) this.lawTip.show([[[law.name, '#3a2410']], ...(law.tip ? [[[law.tip, '#2a160c']]] : [])], law.group.position.x + 4.5, law.group.position.y - 2.5, 9); else this.lawTip.hide(); }
  }
  click() {
    if (hud.chapterCard?._done) { hud.skipChapter(); return true; }
    const hit = this.ray([...this.bell.hit, ...this.bin.hit]); if (!hit) return;
    if (this.bell.hit.includes(hit.object)) { if (this.bell.enabled) this.onEnd?.(); else { this.bell.rz.kick(4); audio.play('ui_error'); } return true; }
    if (this.bin.hit.includes(hit.object)) { this.bin.kick(0.5); this.onWell?.(); return true; }
  }
  update(dt) {
    const p = hud.pointer(2);
    this.gauge.update(dt, p); this.pouch.update(dt, p); this.note.update(dt, null);
    if (this.mode !== 'map') { this.shield.update(dt, null); this.bell.update(dt, p); this.bin.update(dt, p); for (const l of this.laws) l.update(dt, p); }
  }
  dispose() {
    this.engine.remove(this); this.engine.ui.scene.remove(this.root); if (this.handler) window.__game.input.remove(this.handler); this.lawTip?.dispose(); disposeTree(this.root);
    for (const p of this.plates) p.dispose(); this.plates.clear();
  }
}

// chapter titles in the manner of an old chronicle
const WHO = { satyr: 'a Drunken Satyr', kobalos: 'a Thieving Kobalos', medusa: 'the Gorgon Medusa', minotaur: 'the Minotaur', minotaur_king: 'the Minotaur King', hydra: 'the Hydra', hydra_elder: 'the Elder Hydra' };
const DOES = { satyr: 'Objects to Physics', kobalos: 'Pockets the Laws of Motion', medusa: 'Takes a Hard Look at Science', minotaur: 'Charges Headlong at Reason', minotaur_king: 'Will Not Be Reasoned With', hydra: 'Grows More Heads Than Arguments', hydra_elder: 'Has Heard All Your Theories Before' };
export function chapterTitle(foes) {
  const ids = [...new Set(foes.map((e) => e.id))]; const name = (id, d) => WHO[id] || ('the ' + (d || id));
  const names = ids.slice(0, 2).map((id) => name(id, foes.find((e) => e.id === id)?.def?.name)); const lead = ids[0];
  if (ids.length === 1) return `In Which ${names[0]} ${DOES[lead] || 'Objects to Physics'}`;
  return `In Which ${names.join(' and ')}${ids.length > 2 ? ' and Company' : ''} Conspire Against Physics`;
}
