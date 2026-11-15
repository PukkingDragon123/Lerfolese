// The physical HUD (replaces the old DOM overlay). Everything lives in the UI scene as lit, shadow-casting objects:
// embroidered cloth pennants (banners), pinned paper slips that drop in and fall away (toasts), torn speech scraps,
// pinned parchment notes (tooltips) and the battle / map instrument cluster.
import * as THREE from 'three';
import { uiRig, uiPos, disposeTree } from './craft.js';
import { Paper, NoteTip, Pennant, ChapterCard } from './objects.js';
import { Bell, LawTag, EnemyBoard, roman } from './hudparts.js';
import { Hourglass, CoinJar, TimeApple, PlateTip } from './instruments.js';
import { FloatTip, FloatText } from './floatlabel.js';
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
  clear() { for (const s of this.slips) s.T.dispose(); this.slips = []; for (const b of this.speech) this.root.remove(b.paper.group); this.speech.clear(); for (const t of this.tips) t.hide(); }
  // important events become pinned slips; the rest is shown by the scene itself (numbers, barks, banners)
  feed(text, kind = '') { if (kind === 'arc') this.toast(plain(text)); }
  // a caption in floating letters (a gold initial, then pale bone), dropping in under the top edge, folding away after a beat
  toast(text) {
    this.attach(window.__game?.engine); const tx = String(text); const T = new FloatText([[tx[0] || '', '#ffcc6a'], [tx.slice(1), '#f2ead8']], { font: 'body', align: 'center', lighten: false }); this.root.add(T.group); T.show();
    const s = { T, t: 0, life: 2.8, y: this.H + 1 }; this.slips.push(s); audio.play('page_turn', { vol: 0.2, minGap: 120 });
    while (this.slips.filter((x) => x.life > 0).length > 3) { const o = this.slips.find((x) => x.life > 0); o.life = 0; }
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
      s.t += dt; s.life -= dt; if (s.life > 0) { const ty = this.H - 3.4 - i * 1.1; i++; s.y += (ty - s.y) * Math.min(1, dt * 9); s.T.place(0, s.y, 9); } else s.T.hide(); s.T.update(dt);
    }
    this.slips = this.slips.filter((s) => { if (s.life < -0.6) { s.T.dispose(); return false; } return true; });
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
    this.gauge = new Hourglass(); this.pouch = new CoinJar(); this.root.add(this.gauge.group, this.pouch.group); // Integrity sand-glass (Block shield on its pillar), gold jar
    this.note = new FloatText(null, { font: 'body', align: 'right', anchor: 'right', anchorY: 'top' }); this.root.add(this.note.group); this.note.show(); // the chapter heading, in floating letters
    if (mode !== 'map') {
      this.bell = new TimeApple(); this.root.add(this.bell.group); // End Turn: the golden apple that lets time go
      this.laws = []; this.lawTip = new PlateTip({ maxW: 12 });
    }
    this.handler = window.__game.input.push({ move: () => this.move(), click: () => this.click() });
    this.plates = new Set(); this.v = {}; this.writeNote(); this.layout(); this.engine.add(this);
  }
  get k() { return Math.max(0.42, Math.min(1, this.engine.uiW / 17)); }
  layout() {
    const W = this.engine.uiW, H = this.engine.uiH, k = this.k; this._W = W;
    uiPos(this.gauge.group, -W + 2.3 * k, H - 3.25 * k, 1); this.gauge.group.scale.setScalar(1.0 * k);
    uiPos(this.pouch.group, -W + 6.2 * k, H - 2.5 * k, 1.2); this.pouch.group.scale.setScalar(0.9 * k);
    this.note.place(W - 0.5 * k, H - 0.45 * k, 1.5);
    if (this.mode === 'map') return;
    uiPos(this.bell.group, W - 3.0 * k, -H + 3.2 * k, 1.2); this.bell.group.scale.setScalar(0.85 * k); this.layoutForecast?.();
    this.layoutLaws();
  }
  layoutLaws() { const W = this.engine.uiW, H = this.engine.uiH, k = this.k; let x = -W + 0.6 * k; for (const l of this.laws) { l.group.scale.setScalar(k); uiPos(l.group, x + (l.w / 2) * k, H - 7.1 * k, 1.4); x += (l.w + 0.25) * k; } }
  onResize() { this.layout(); }
  writeNote() {
    const L = [];
    const sub = this.sub || `Floor ${roman(this.floor)} · Turn ${roman(this.turn)}${this.kind !== 'battle' && this.kind !== 'normal' ? ` · ${this.kind === 'guardian' ? 'Guardian' : 'Elite'}` : ''}`;
    L.push([[sub, this.kind === 'elite' || this.kind === 'guardian' ? '#8f2a2e' : '#5a3622']]); // a short label only (floor, turn); no paragraphs
    this.note.set(L, { fonts: ['head'] }); this.note.pop.kick(3); if (this._W != null) this.layout();
  }
  _set(k, v, fn) { if (this.v[k] !== v) { this.v[k] = v; fn(v); } }
  setVitals(hp, max, block, gold) { this.gauge.set(hp, max, this.mode === 'map' ? 0 : block); this.pouch.set(gold); }
  setObjective(text) { this._set('obj', text, () => { this.objective = plain(text); this.writeNote(); }); }
  setTurn(n) { this._set('turn', n, () => { this.turn = n; this.writeNote(); }); }
  setRedraws() {} // (Second Thoughts were removed)
  setEnd(on, label) { if (!this.bell) return; this._set('end', on + (label || ''), () => { this.bell.setEnabled(on); this.bell.setLabel(on ? 'End Turn' : 'Time flows', on ? 'SPACE' : ''); }); }
  ringEnd() { this.bell?.ring(); }
  /** THE HYPOTHESIS readout over the golden apple: what ringing it will do (exact), in three short crisp lines */
  setForecast(fc, B) {
    if (!this.bell) return; if (!this.fcT) { this.fcT = new FloatText(null, { font: 'head', align: 'center', lighten: false, depth: 0.08 }); this.root.add(this.fcT.group); }
    if (!fc) { this.fcT.hide(); this._fcK = ''; return; }
    const you = fc.you, lose = Math.max(0, you.hp0 - you.hp), dealt = fc.dealt || 0, heat = fc.heat0 !== fc.heat ? `Heat ${fc.heat0}→${fc.heat}` : '';
    let rows, fonts;
    if (fc.won) { rows = [[['IF TIME FLOWS', '#cdb68a']], [['VICTORY', '#ffd36a']], [[`${dealt} dealt${lose ? ` · you lose ${lose}` : ''}`, '#efe4cf']]]; fonts = ['tiny', 'head', 'tiny']; }
    else if (fc.lost) { rows = [[['IF TIME FLOWS', '#cdb68a']], [['YOU FALL', '#ff6a5a']], [['Brace! Block or kill first', '#ffc8b6']]]; fonts = ['tiny', 'head', 'tiny']; }
    else {
      const det = [you.blocked ? `Block soaks ${you.blocked}` : '', heat].filter(Boolean).join(' · ');
      rows = [[['IF TIME FLOWS', '#cdb68a']], [[lose ? `−${lose}` : '0', lose ? '#ff8a6a' : '#bfe8a6'], [' HP  ', '#efe4cf'], [`${dealt}`, '#ffd36a'], [' dealt', '#efe4cf']], ...(det ? [[[det, '#d6c8b0']]] : [])]; fonts = ['tiny', 'head', 'tiny'];
    }
    const k = JSON.stringify(rows); if (k === this._fcK) return; this._fcK = k; this.fcT.set(rows, { fonts }); this.fcT.show(); this.fcT.pop.kick(3); this.layoutForecast();
  }
  /** THE RESULT, after time flowed: a short stamp where the hypothesis was (the experiment, checked) */
  showResult(rows) {
    if (!this.bell) return; if (!this.resT) { this.resT = new FloatText(null, { font: 'head', align: 'center', lighten: false, depth: 0.08 }); this.root.add(this.resT.group); }
    this.resT.set(rows, { fonts: ['tiny', 'head'] }); this.resT.show(); this.resT.pop.kick(5); this.resLife = 2.8; const W = this.engine.uiW, H = this.engine.uiH, k = this.k; this.resT.place(W - 3.0 * k, -H + 6.25 * k, 1.3); this.resT.group.scale.multiplyScalar(0.9 * k);
  }
  layoutForecast() { if (!this.fcT || !this.bell) return; const W = this.engine.uiW, H = this.engine.uiH, k = this.k; this.fcT.place(W - 3.0 * k, -H + 6.25 * k, 1.3); this.fcT.group.scale.multiplyScalar(0.9 * k); }
  // hit tests: screen px (bin drop) or the current pointer ray (bell / bin / law hover)
  ray(objs) { const r = new THREE.Raycaster(); r.setFromCamera(hud.input.ndc, this.engine.ui.camera); return r.intersectObjects(objs, true)[0]; }
  wellHit() { return false; } wellUI() { return [0, 0]; } setWellHot() {}
  /** UI-plane position of an instrument (for coins / sand flying to it): 'hp' | 'gold' */
  instrumentUI(which) { (which === 'gold' ? this.pouch : this.gauge).group.getWorldPosition(_v); return [_v.x, _v.y]; }
  addLaw(name, tip) { const l = new LawTag(plain(name), plain(tip)); this.root.add(l.group); this.laws.push(l); this.layoutLaws(); audio.play('pin', { vol: 0.5 }); }
  plate(name) { const p = new EnemyBoard(name); this.root.add(p.group); this.plates.add(p); return p; }
  move() {
    const inst = [this.gauge.hit, this.pouch.hit]; const hit = this.ray([...(this.bell?.hit || []), ...inst, ...(this.laws || []).map((l) => l.hit)]); const o = hit?.object;
    const g = o === this.gauge.hit, j = o === this.pouch.hit; if ((g && !this.gauge.hover) || (j && !this.pouch.hover)) audio.play(j ? 'coin_single' : 'ui_hover', { vol: 0.25 }); this.gauge.hover = g; this.pouch.hover = j;
    if (!this.bell) return;
    const bell = !!o?.userData.bell || this.bell.hit.includes(o), law = o?.userData.law || null;
    if (bell !== this.bell.hover && bell && this.bell.enabled) audio.play('ui_hover', { vol: 0.4 }); this.bell.hover = bell && this.bell.enabled;
    for (const l of this.laws) l.hover = l === law;
    if (law !== this._law) { this._law = law; if (law) this.lawTip.show([[[law.name, '#3a2410']], ...(law.tip ? [[[law.tip, '#2a160c']]] : [])], law.group.position.x + 4.5, law.group.position.y - 2.5, 9); else this.lawTip.hide(); }
  }
  click() {
    if (hud.chapterCard?._done) { hud.skipChapter(); return true; }
    const hit = this.ray([...(this.bell?.hit || []), this.gauge.hit, this.pouch.hit]); if (!hit) return;
    if (hit.object === this.gauge.hit) { this.gauge.flip(); return true; }
    if (hit.object === this.pouch.hit) { this.pouch.shakeIt(); return true; }
    if (this.bell.hit.includes(hit.object)) { if (this.bell.enabled) this.onEnd?.(); else { this.bell.rz.kick(4); audio.play('ui_error'); } return true; }
  }
  update(dt) {
    const p = hud.pointer(2);
    this.gauge.update(dt, p); this.pouch.update(dt, p); this.note.update(dt);
    if (this.mode !== 'map') { this.bell.update(dt, p); for (const l of this.laws) l.update(dt, p); this.fcT?.update(dt); if (this.resT) { this.resLife -= dt; if (this.resLife <= 0) this.resT.hide(); this.resT.update(dt); } }
  }
  dispose() {
    this.engine.remove(this); this.engine.ui.scene.remove(this.root); if (this.handler) window.__game.input.remove(this.handler); this.lawTip?.dispose?.(); disposeTree(this.root);
    for (const p of this.plates) p.dispose(); this.plates.clear();
  }
}

// chapter titles in the manner of an old chronicle
const WHO = { frog_wizard: 'Archimage Croakley', bookworm_queen: 'the Bookworm Queen', sphinx: 'the Sphinx', eagle: 'the Eagle of Zeus', satyr: 'a Drunken Satyr', kobalos: 'a Thieving Kobalos', medusa: 'the Gorgon Medusa', minotaur: 'the Minotaur', minotaur_king: 'the Minotaur King', hydra: 'the Hydra', hydra_elder: 'the Elder Hydra' };
const DOES = { frog_wizard: 'Sets the Final Examination', bookworm_queen: 'Devours the Principia', sphinx: 'Grades with Teeth', eagle: 'Comes for the Liver', satyr: 'Objects to Physics', kobalos: 'Pockets the Laws of Motion', medusa: 'Takes a Hard Look at Science', minotaur: 'Charges Headlong at Reason', minotaur_king: 'Will Not Be Reasoned With', hydra: 'Grows More Heads Than Arguments', hydra_elder: 'Has Heard All Your Theories Before' };
export function chapterTitle(foes) {
  const ids = [...new Set(foes.filter((e) => !e.def?.minion).map((e) => e.id))]; const name = (id, d) => WHO[id] || ('the ' + (d || id));
  const names = ids.slice(0, 2).map((id) => name(id, foes.find((e) => e.id === id)?.def?.name)); const lead = ids[0];
  if (ids.length === 1) return `In Which ${names[0]} ${DOES[lead] || 'Objects to Physics'}`;
  return `In Which ${names.join(' and ')}${ids.length > 2 ? ' and Company' : ''} Conspire Against Physics`;
}
