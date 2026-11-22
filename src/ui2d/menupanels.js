// THE JOURNAL CODEX and THE SETTINGS of the tower menu (menu agent), as detailed scholarly 2D panels (ui2d/scholar.js).
//   Codex   : three leaves (Cards, Foes, Laws). Cards shows every card met (the hand-pixelled faces), Foes every
//             creature faced with a painted portrait, its tally and the weaknesses learned, Laws the Laws of Nature
//             found (and the hidden ones still unwritten). Click an entry to read it on the facing page.
//   Settings: volume dials (all, music, effects, ambience, voices), picture quality, voices and subtitles.
//   const C = new Codex(game, UI); C.open(); C.close(); C.isOpen      const S = new SettingsPanel(game, UI) ...
import { BASICS, STARTER_DECK, CARD_POOL, describeCard, KIND_LABEL } from '../game/data/cards.js';
import { ENEMIES } from '../game/data/enemies.js';
import { SPECIALS } from '../game/combos.js';
import { STARTS } from '../game/run.js';
import { renderCardFace } from '../gfx/cardart.js';
import { save } from '../core/save.js';
import { audio } from '../core/audio.js';
import { voiceSettings } from '../story/voice.js';
import { icon, bar } from './scholar.js';

const FOES = ['satyr', 'kobalos', 'medusa', 'minotaur', 'hydra', 'harpy', 'centaur', 'wolf', 'spartoi', 'cyclops', 'chimera', 'talos', 'bookworm_queen', 'frog_wizard'];
const portraits = new Map();
function portrait(game, id) { // a painted portrait of the creature from its own 3D model (cached)
  if (portraits.has(id)) return portraits.get(id);
  const p = (async () => { const [{ getForge }, { createCreature }] = await Promise.all([import('../gfx/forge.js'), import('../models/creatures.js')]); const api = createCreature(id); const pc = getForge(game.engine.renderer).paint(api.root, { w: 120, h: 90, fit: 0.86, yaw: 0.55, levels: 6 }); return pc.scaled(2); })().catch(() => null);
  portraits.set(id, p); return p;
}

class Modal {
  constructor(game, UI) { this.game = game; this.UI = UI; this.isOpen = false; this.P = null; }
  close() { if (!this.isOpen) return; this.isOpen = false; audio.play('page_turn', { vol: 0.4 }); const P = this.P; this.UI.show(P, false); setTimeout(() => this.UI.remove(P), 380); this.P = null; this.onClose?.(); }
  key(k) { if (k === 'Escape' || k === 'Backspace' || k === 'KeyJ') { this.close(); return true; } return false; }
  closeBtn(parent) { const b = this.UI.button('Close', () => this.close(), { parent, w: 56, red: true, sound: 'ui_back' }); b.style.position = 'absolute'; b.style.right = '0'; b.style.bottom = '0'; return b; }
}

export class Codex extends Modal {
  open(tab = 'cards') {
    if (this.isOpen) return; this.isOpen = true; const UI = this.UI; audio.play('book_open', { vol: 0.7 });
    const P = (this.P = UI.panel({ w: 420, h: 300, anchor: 'center', my: -6, seed: 11, pad: 12 })); UI.show(P, false); requestAnimationFrame(() => UI.show(P, true));
    const head = UI.el('div', '', null, P.inner); Object.assign(head.style, { display: 'flex', alignItems: 'baseline', gap: 'calc(var(--k) * 10px)' });
    UI.el('div', 'lf-title lf-big', 'Journal', head); this.tabs = {};
    for (const [k, l] of [['cards', 'Cards'], ['foes', 'Foes'], ['laws', 'Laws']]) { const t = UI.el('div', 'lf-tab', l, head); t.addEventListener('pointerdown', () => { audio.play('page_turn', { vol: 0.5 }); this.tab(k); }); UI.hoverSound(t); this.tabs[k] = t; }
    UI.el('div', 'lf-rule', null, P.inner);
    const body = UI.el('div', '', null, P.inner); Object.assign(body.style, { position: 'absolute', left: 0, right: 0, top: 'calc(var(--k) * 40px)', bottom: 'calc(var(--k) * 24px)', display: 'flex', gap: 'calc(var(--k) * 10px)' });
    this.left = UI.el('div', 'lf-list', null, body); Object.assign(this.left.style, { flex: '0 0 calc(var(--k) * 236px)' });
    this.right = UI.el('div', 'lf-list', null, body); Object.assign(this.right.style, { flex: '1 1 auto', position: 'relative', borderLeft: 'var(--k-px) solid rgba(90,54,34,.35)', paddingLeft: 'calc(var(--k) * 8px)', overflowY: 'auto' });
    this.closeBtn(P.inner); this.tab(tab);
  }
  tab(k) { for (const [x, t] of Object.entries(this.tabs)) t.classList.toggle('lf-on', x === k); this.left.innerHTML = ''; this.right.innerHTML = ''; this.left.scrollTop = 0; ({ cards: () => this.cards(), foes: () => this.foes(), laws: () => this.laws() })[k](); }
  select(row, fn) { for (const r of this.left.querySelectorAll('.lf-sel')) r.classList.remove('lf-sel'); row?.classList.add('lf-sel'); this.right.innerHTML = ''; fn(); }
  // ---- cards met: the starter deck, every card in a discovered combination, the constellation starts
  cards() {
    const UI = this.UI, j = save.journal; const met = new Set(STARTER_DECK); for (const k of Object.keys(j.combos || {})) for (const id of k.split('+')) met.add(id); for (const S of Object.values(STARTS)) for (const c of S.add || []) met.add(c);
    const all = [...new Set([...STARTER_DECK, ...CARD_POOL.basic, ...CARD_POOL.discover, ...CARD_POOL.rare])].filter((id) => BASICS[id]);
    const ordered = [...all.filter((id) => met.has(id)), ...all.filter((id) => !met.has(id))]; const grid = UI.el('div', 'lf-grid', null, this.left); grid.style.padding = 'calc(var(--k) * 2px)';
    const cw = 120 * Math.max(1, Math.floor(UI.k / 2)) / UI.k; let first = null; // card faces drawn 1:1 (or 2:1) so their pixel art stays exact
    for (const id of ordered) { const known = met.has(id); const cell = UI.el('div', 'lf-row', null, grid); Object.assign(cell.style, { padding: 0, border: 0, margin: 0, display: 'block' });
      if (known) { let face; try { face = renderCardFace({ id, type: 'basic', up: 0 }); } catch (e) { face = null; } if (face) { const c = document.createElement('canvas'); c.width = face.width; c.height = face.height; c.getContext('2d').drawImage(face, 0, 0); c.className = 'lf-cv'; c.dataset.w = cw; c.dataset.h = cw * 1.4; UI.add(c, cell); } }
      else { const c = icon('lock'); c.dataset.w = cw; c.dataset.h = cw * 1.4; c.style.background = 'rgba(60,34,20,.25)'; UI.add(c, cell); c.style.width = UI.px(cw); c.style.height = UI.px(cw * 1.4); c.style.boxSizing = 'border-box'; c.style.padding = `${UI.px(cw * 0.34)} ${UI.px(cw * 0.3)}`; c.style.objectFit = 'contain'; c.style.opacity = 0.4; c.style.border = 'var(--k-px) dashed rgba(90,54,34,.4)'; }
      cell.title = ''; UI.hoverSound(cell, 'card_slide', 0.2); cell.addEventListener('pointerdown', () => { audio.play('card_pick', { vol: 0.4 }); this.select(cell, () => this.cardInfo(id, known)); }); if (!first && known) first = [cell, id]; }
    if (first) this.select(first[0], () => this.cardInfo(first[1], true));
  }
  cardInfo(id, known) {
    const UI = this.UI, R = this.right, d = BASICS[id]; if (!known) { UI.el('div', 'lf-title', '???', R); UI.el('div', 'lf-body lf-soft', 'Not yet met in any loop. Discover it in a merge or on the road.', R).style.marginTop = UI.px(6); return; }
    const D = describeCard({ id, type: 'basic', up: 0 }); UI.el('div', 'lf-title lf-wrap', d.name, R); UI.el('div', 'lf-body lf-red', KIND_LABEL[d.kind] || '', R).style.marginTop = UI.px(3);
    if (D) for (const [h, t] of D.lines) { if (!t) continue; const b = UI.el('div', 'lf-body', null, R); b.style.marginTop = UI.px(5); UI.el('span', 'lf-goldt', h + '  ', b); UI.el('span', '', t, b); }
    const n = Object.keys(save.journal.combos || {}).filter((k) => k.split('+').includes(id)).length; const f = UI.el('div', 'lf-body lf-soft', `In ${n} known combination${n === 1 ? '' : 's'}.`, R); f.style.marginTop = UI.px(6);
    if (D?.flavor) { const q = UI.el('div', 'lf-body lf-soft', '"' + D.flavor + '"', R); q.style.marginTop = UI.px(6); }
  }
  // ---- foes faced
  foes() {
    const UI = this.UI, j = save.journal; let first = null;
    for (const id of FOES.filter((x) => ENEMIES[x])) { const e = j.enemies?.[id]; const d = ENEMIES[id]; const row = UI.el('div', 'lf-row' + (e ? '' : ' lf-dim'), null, this.left);
      const nm = UI.el('div', 'lf-title', e ? d.name : '? ? ?', row); nm.style.flex = '1'; nm.style.fontSize = 'calc(var(--k) * 16px)'; if (e) UI.el('div', 'lf-num lf-soft', `${e.killed || 0}`, row);
      UI.hoverSound(row); row.addEventListener('pointerdown', () => { audio.play('page_turn', { vol: 0.35 }); this.select(row, () => this.foeInfo(id, e)); }); if (!first && e) first = [row, id, e]; }
    if (first) this.select(first[0], () => this.foeInfo(first[1], first[2])); else { UI.el('div', 'lf-body lf-soft', 'No foe faced yet. The Wilds are waiting.', this.right); }
  }
  foeInfo(id, e) {
    const UI = this.UI, R = this.right, d = ENEMIES[id]; if (!e) { UI.el('div', 'lf-title', '? ? ?', R); UI.el('div', 'lf-body lf-soft', 'Not yet encountered in any loop.', R).style.marginTop = UI.px(6); return; }
    UI.el('div', 'lf-title lf-wrap', d.name, R); UI.el('div', 'lf-body lf-red', d.title || '', R).style.marginTop = UI.px(2);
    const pic = UI.el('div', '', null, R); Object.assign(pic.style, { height: UI.px(92), margin: `${UI.px(4)} 0`, background: 'rgba(90,54,34,.12)', border: 'var(--k-px) solid rgba(90,54,34,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    portrait(this.game, id).then((c) => { if (!c || !pic.isConnected) return; const cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); cv.className = 'lf-cv'; cv.dataset.w = 120; cv.dataset.h = 90; UI.add(cv, pic); });
    UI.el('div', 'lf-body', `Seen ${e.seen || 0}   Defeated ${e.killed || 0}`, R);
    const learned = Object.keys(e.learned || {}); const w = UI.el('div', 'lf-body', learned.length ? 'Weaknesses learned:' : (d.weakness ? 'Weakness: unknown. Experiment on it.' : ''), R); w.style.marginTop = UI.px(4);
    import('../scenes/journal.js').then(({ LEARN }) => { for (const k of learned.slice(0, 4)) { if (!R.isConnected) return; const l = UI.el('div', 'lf-body lf-soft', '- ' + (LEARN?.[k] || k), R); l.style.marginTop = UI.px(2); } }).catch(() => {});
  }
  // ---- Laws of Nature
  laws() {
    const UI = this.UI, j = save.journal; const found = new Set(Object.values(j.combos || {}).map((e) => e.name)); let first = null;
    for (const s of SPECIALS.filter((x) => x.law)) { const has = found.has(s.name); const row = UI.el('div', 'lf-row' + (has ? '' : ' lf-dim'), null, this.left); row.appendChild(UI.fit(icon(has ? 'star' : 'lock')));
      const nm = UI.el('div', 'lf-title', has ? s.name : 'Unwritten Law', row); nm.style.fontSize = 'calc(var(--k) * 16px)'; UI.hoverSound(row);
      row.addEventListener('pointerdown', () => { audio.play('page_turn', { vol: 0.35 }); this.select(row, () => this.lawInfo(s, has)); }); if (!first) first = [row, s, has]; }
    if (first) this.select(first[0], () => this.lawInfo(first[1], first[2]));
  }
  lawInfo(s, has) {
    const UI = this.UI, R = this.right; UI.el('div', 'lf-title lf-wrap', has ? s.name : 'A hidden Law', R);
    if (!has) { UI.el('div', 'lf-body lf-soft', `Still unwritten. It needs ${s.key.split('+').length} kinds of card, merged at once.`, R).style.marginTop = UI.px(6); return; }
    const rec = UI.el('div', 'lf-body lf-red', s.key.split('+').map((id) => BASICS[id]?.name || id).join(' + '), R); rec.style.marginTop = UI.px(4);
    if (s.effect) { const e = UI.el('div', 'lf-body', s.effect, R); e.style.marginTop = UI.px(6); }
    const n = UI.el('div', 'lf-body lf-soft', '"' + s.note + '"', R); n.style.marginTop = UI.px(6);
  }
}

// ---------------------------------------------------------------- settings
const QUAL = [['auto', 'Auto'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]; // Auto: detected per device (phones start Low), then held at a steady frame rate
export class SettingsPanel extends Modal {
  open() {
    if (this.isOpen) return; this.isOpen = true; const UI = this.UI, s = this.game.settings; audio.play('clockwork', { vol: 0.5 });
    const P = (this.P = UI.panel({ w: 256, h: 262, anchor: 'center', seed: 21, pad: 12 })); UI.show(P, false); requestAnimationFrame(() => UI.show(P, true));
    UI.el('div', 'lf-title lf-big', 'Settings', P.inner); UI.el('div', 'lf-rule', null, P.inner);
    const vol = (label, get, set) => { const row = UI.el('div', '', null, P.inner); Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: UI.px(6), margin: `${UI.px(4)} 0` });
      const l = UI.el('div', 'lf-body', label, row); l.style.width = UI.px(66); const W = 120; let c = UI.fit(bar(W, get())); row.appendChild(c); c.style.cursor = 'pointer'; const val = UI.el('div', 'lf-num lf-soft', Math.round(get() * 100) + '', row); val.style.width = UI.px(20);
      const at = (e) => { const r = c.getBoundingClientRect(); const v = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); set(Math.round(v * 20) / 20); const nc = UI.fit(bar(W, get())); nc.style.cursor = 'pointer'; row.replaceChild(nc, c); hook(nc); c = nc; val.textContent = Math.round(get() * 100) + ''; };
      const hook = (cv) => { cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); at(e); audio.play('ui_click', { vol: 0.4 }); cv._drag = true; }); cv.addEventListener('pointermove', (e) => { if (cv._drag) at(e); }); cv.addEventListener('pointerup', () => { cv._drag = false; save.saveSettings(); audio.play('chime_soft', { vol: 0.35 }); }); };
      hook(c); };
    const A = (k) => () => s[k] ?? 0.8; const SA = (k) => (v) => { s[k] = v; audio.vol[k] = v; audio.applyVolumes?.(); };
    vol('All', A('master'), SA('master')); vol('Music', A('music'), SA('music')); vol('Effects', A('sfx'), SA('sfx')); vol('Ambience', A('amb'), SA('amb')); vol('Voices', () => voiceSettings.vol, (v) => voiceSettings.set('vol', v));
    UI.el('div', 'lf-rule', null, P.inner);
    const q = UI.el('div', '', null, P.inner); Object.assign(q.style, { display: 'flex', alignItems: 'center', gap: UI.px(3), margin: `${UI.px(4)} 0` }); UI.el('div', 'lf-body', 'Picture', q).style.width = UI.px(66);
    const lit = (b, on) => { b.style.filter = on ? 'brightness(1.22) saturate(1.3)' : 'brightness(0.82) saturate(0.7)'; };
    const qb = QUAL.map(([k, l]) => { const b = UI.button(l, () => { s.quality = k; this.game.engine.setQuality?.(k); save.saveSettings(); for (const x of qb) lit(x, x === b); }, { parent: q, w: k === 'medium' ? 62 : 48 }); lit(b, (s.quality || 'auto') === k); return b; });
    const tog = (label, key) => { const t = UI.el('div', '', null, P.inner); Object.assign(t.style, { display: 'flex', alignItems: 'center', gap: UI.px(3), margin: `${UI.px(3)} 0` }); UI.el('div', 'lf-body', label, t).style.width = UI.px(66);
      const mk = (on) => { const b = UI.button(on ? 'On' : 'Off', () => { if (!!voiceSettings[key] !== on) { voiceSettings.toggle(key); lit(bOn, on); lit(bOff, !on); } }, { parent: t, w: 44 }); return b; }; const bOn = mk(true), bOff = mk(false); lit(bOn, !!voiceSettings[key]); lit(bOff, !voiceSettings[key]); };
    tog('Voices', 'voice'); tog('Subtitles', 'subtitles');
    this.closeBtn(P.inner);
  }
}
