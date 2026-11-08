// Grimoire HUD: a DOM overlay modelled on the R.O.O.M. camcorder HUD (glowing VT323 type, thin rules, minimal
// translucent panels, sliding feed, toasts) re-dressed as candlelit illuminated manuscript: gold-leaf glow,
// blackletter titles, arcane cyan/violet rune accents and diamond studs on every panel.
import { sprite } from '../gfx/sprites.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icons = new Map();
export function iconURL(name, s = 2) {
  const k = name + ':' + s;
  if (!icons.has(k)) { let u = ''; try { u = sprite(name).scaled(s).toDataURL(); } catch { /* missing sprite */ } icons.set(k, u); }
  return icons.get(k);
}
// the 3D notes use parchment inks; map them onto glowing HUD tones
const INK = { '#3a2410': 'hi', '#2a160c': 'fg', '#8a6a44': 'dim', '#5a3622': 'dim', '#8f2a2e': 'red', '#c8443a': 'red', '#2d6e6a': 'arc', '#5f8a3a': 'grn', '#6b4c9a': 'vio' };
export function linesHTML(lines) {
  return lines.map((l) => `<div>${(typeof l === 'string' ? [[l]] : l).map(([t, c]) => `<span class="t-${INK[c] || 'fg'}">${esc(t)}</span>`).join('')}</div>`).join('');
}

class Hud {
  constructor() {
    this.root = el('div'); this.root.id = 'hud'; document.body.appendChild(this.root);
    this.layer = el('div', 'layer'); this.root.appendChild(this.layer);
    this.feedEl = el('div', 'feed'); this.toastEl = el('div', 'toasts'); this.bannerEl = el('div', 'banner');
    this.tipEl = el('div', 'panel tip'); this.root.append(this.feedEl, this.toastEl, this.bannerEl, this.tipEl);
    this.engine = null;
  }
  // UI-plane coords (engine.uiW/uiH half-extents) -> CSS px
  toScreen(x, y) { const E = this.engine; return [(x / E.uiW * 0.5 + 0.5) * innerWidth, (0.5 - y / E.uiH * 0.5) * innerHeight]; }
  toUI(sx, sy) { const E = this.engine; return [(sx / innerWidth - 0.5) * 2 * E.uiW, (0.5 - sy / innerHeight) * 2 * E.uiH]; }
  clear() { this.layer.replaceChildren(); this.feedEl.replaceChildren(); this.toastEl.replaceChildren(); this.hideTip(); this.bannerEl.className = 'banner'; }
  hidden(b) { this.root.classList.toggle('wiping', b); }
  feed(html, kind = '') {
    const m = el('div', 'msg ' + kind, html); this.feedEl.appendChild(m);
    while (this.feedEl.children.length > 6) this.feedEl.firstChild.remove();
    setTimeout(() => m.classList.add('old'), 6500); setTimeout(() => m.remove(), 7400);
  }
  toast(text, kind = '') {
    const t = el('div', 'panel toast ' + kind, esc(text)); this.toastEl.appendChild(t);
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
  }
  // big blackletter title with a gilded rule; resolves when it has faded
  banner(title, sub = '', kind = '', hold = 0.9) {
    const b = this.bannerEl; b.className = 'banner'; void b.offsetWidth;
    b.innerHTML = `<div class="t">${esc(title)}</div><div class="rule"><i></i></div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}`;
    b.className = 'banner on ' + kind;
    return new Promise((res) => { clearTimeout(this._bt); this._bt = setTimeout(() => { b.classList.add('out'); setTimeout(res, 380); }, 450 + hold * 1000); });
  }
  bubble(text, kind = '') { const e = el('div', 'panel bark ' + kind, `${esc(text)}<i class="tail"></i>`); this.layer.appendChild(e); return e; }
  showTip(lines, x, y) {
    const t = this.tipEl; const h = linesHTML(lines); if (t._h !== h) { t.innerHTML = h; t._h = h; }
    const [sx, sy] = this.toScreen(x, y); const r = t.getBoundingClientRect();
    const px = Math.max(12, Math.min(innerWidth - r.width - 12, sx - r.width / 2)), py = Math.max(12, Math.min(innerHeight - r.height - 12, sy - r.height / 2));
    t.style.transform = `translate(${px | 0}px,${py | 0}px)`; t.classList.add('on');
  }
  hideTip() { this.tipEl.classList.remove('on'); }
}
export const hud = new Hud();

// Note-compatible tooltip (show(lines, x, y) in UI coords / hide / update)
export class HudTip {
  show(lines, x, y) { this.on = true; hud.showTip(lines, x, y); }
  hide() { if (this.on) hud.hideTip(); this.on = false; }
  update() {}
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];

export class BattleHUD {
  constructor({ area = 'The Mythical Wilderness', floor = 1, kind = 'battle', foes = [], onEnd, onWell }) {
    const L = (this.el = el('div', 'battle-hud k-' + kind)); hud.layer.appendChild(L);
    this.vit = el('div', 'panel vitals', `
      <div class="who"><span class="hud-title">Sir Isaac</span><span class="hud-k">MARIONETTE OF THE LAW</span></div>
      <div class="row"><span class="lbl">INTEGRITY</span><div class="bar hp"><i class="lag"></i><i class="fill"></i></div><span class="num hpn"></span></div>
      <div class="row stats"><span class="stat blk"><img src="${iconURL('shield')}" alt="">WARD <b class="bn">0</b></span><span class="stat gold"><img src="${iconURL('coin')}" alt="">GOLD <b class="gn">0</b></span></div>
      <div class="laws"></div>`);
    this.top = el('div', 'panel topright', `<div class="area hud-title">${esc(area)}</div><div class="sub">FLOOR ${ROMAN[floor] || floor} &middot; <span class="turn">TURN I</span>${kind !== 'battle' ? ` &middot; <span class="kind">${kind === 'guardian' ? 'GUARDIAN' : 'ELITE'}</span>` : ''}</div><div class="obj"><i class="dia"></i>Defeat ${esc(foes.join(' & '))}</div>`);
    this.end = el('button', 'panel endturn', '<span class="k">End Turn</span><span class="s">SPACE</span>'); this.end.type = 'button';
    this.end.tabIndex = -1; this.end.addEventListener('pointerdown', (e) => e.preventDefault()); this.end.addEventListener('click', () => onEnd?.());
    this.well = el('div', 'panel well', '<div class="hud-k">SECOND THOUGHTS</div><div class="pips"><i></i><i></i><i></i></div><div class="hint">drop cards here to redraw</div>');
    this.well.addEventListener('click', () => onWell?.());
    L.append(this.vit, this.top, this.end, this.well);
    this.q = (s) => L.querySelector(s); this.v = {}; this.plates = new Set();
  }
  _set(k, v, fn) { if (this.v[k] !== v) { this.v[k] = v; fn(v); } }
  setVitals(hp, max, block, gold) {
    this._set('hp', hp + '/' + max, () => {
      const f = Math.max(0, hp / max) * 100; this.q('.hp .fill').style.width = `calc(${f}% - 4px)`; this.q('.hp .lag').style.width = `calc(${f}% - 4px)`;
      this.q('.hpn').textContent = `${Math.max(0, hp)}/${max}`;
      if (this._hp != null && hp < this._hp) { this.vit.classList.remove('hurt'); void this.vit.offsetWidth; this.vit.classList.add('hurt'); }
      this.vit.classList.toggle('low', hp < max * 0.3); this._hp = hp;
    });
    this._set('b', block, (b) => { this.q('.bn').textContent = b; this.q('.blk').classList.toggle('on', b > 0); });
    this._set('g', gold, (g) => { this.q('.gn').textContent = g; });
  }
  setObjective(text) { this.q('.obj').innerHTML = `<i class="dia"></i>${esc(text)}`; }
  setTurn(n) { this._set('turn', n, () => { this.q('.turn').textContent = 'TURN ' + (ROMAN[n] || n); }); }
  setRedraws(n) { this._set('rd', n, () => { [...this.well.querySelectorAll('.pips i')].forEach((p, i) => p.classList.toggle('used', i >= n)); this.well.classList.toggle('empty', n <= 0); }); }
  setEnd(on, label) { this._set('end', on + (label || ''), () => { this.end.classList.toggle('off', !on); this.end.querySelector('.k').textContent = label || 'End Turn'; }); }
  ringEnd() { this.end.classList.remove('ring'); void this.end.offsetWidth; this.end.classList.add('ring'); }
  wellHit(sx, sy) { const r = this.well.getBoundingClientRect(); return sx >= r.left - 16 && sx <= r.right + 16 && sy >= r.top - 16 && sy <= r.bottom + 16; }
  wellUI() { const r = this.well.getBoundingClientRect(); return hud.toUI(r.left + r.width / 2, r.top + r.height / 2); }
  setWellHot(b) { this._set('hot', b, () => this.well.classList.toggle('hot', b)); }
  addLaw(name, tip) { const t = el('span', 'law', esc(name)); t.title = tip || ''; this.q('.laws').appendChild(t); }
  plate(name) { const p = new EnemyPlate(this.el, name); this.plates.add(p); return p; }
  dispose() { this.el.remove(); hud.hideTip(); }
}

const ST_COL = { burn: 'fire', wet: 'arc', venom: 'grn', weak: 'vio', vulnerable: 'red', strength: 'red', stun: 'gold', prone: 'gold', evade: 'arc', blind: 'vio', dizzy: 'red' };
export class EnemyPlate {
  constructor(parent, name) {
    this.p = el('div', 'plate', `<div class="nm">${esc(name)}</div><div class="bar ehp"><i class="lag"></i><i class="fill"></i></div><div class="meta"><span class="hpn"></span><span class="blk"></span></div><div class="tags"></div>`);
    this.i = el('div', 'intent'); parent.append(this.p, this.i); this.key = ''; this.vis = true; this.bob = Math.random() * 6;
  }
  setHP(hp, max, block, st) {
    const f = Math.max(0, hp / max) * 100; this.p.querySelector('.fill').style.width = `calc(${f}% - 4px)`; this.p.querySelector('.lag').style.width = `calc(${f}% - 4px)`;
    this.p.querySelector('.hpn').textContent = `${Math.max(0, hp)}/${max}`;
    const b = this.p.querySelector('.blk'); b.textContent = block > 0 ? `WARD ${block}` : ''; b.classList.toggle('on', block > 0);
    const keys = Object.keys(st || {}).filter((k) => st[k] && typeof st[k] !== 'object');
    this.p.querySelector('.tags').innerHTML = keys.map((k) => `<span class="c-${ST_COL[k] || 'gold'}">${esc(k.slice(0, 5).toUpperCase())} ${st[k] === true ? '' : esc(st[k])}</span>`).join('');
  }
  setIntent(it, value, hits) {
    const key = it ? `${it.icon}:${value}:${hits}:${it.label}:${it.kind}` : ''; if (key === this.key) return; this.key = key;
    if (!it) { this.i.innerHTML = ''; this.i.classList.remove('on'); return; }
    const txt = value != null ? `${value}${hits > 1 ? '&times;' + hits : ''}` : '';
    this.i.className = 'intent on ' + (it.kind === 'attack' || it.dmg ? 'atk' : it.kind === 'buff' ? 'buf' : 'deb');
    this.i.innerHTML = `<img src="${iconURL(it.icon || 'question', 2)}" alt=""><b>${txt}</b>${it.label ? `<span>${esc(it.label)}</span>` : ''}`;
  }
  update(dt, x, y, yTop) {
    if (!this.vis) return; this.bob += dt;
    const [sx, sy] = hud.toScreen(x, y); const [tx, ty] = hud.toScreen(x, yTop);
    this.p.style.transform = `translate(${(sx | 0)}px,${(sy | 0)}px) translate(-50%,0)`;
    this.i.style.transform = `translate(${(tx | 0)}px,${(ty + Math.sin(this.bob * 2.4) * 3) | 0}px) translate(-50%,-100%)`;
  }
  setVisible(b) { if (this.vis === b) return; this.vis = b; this.p.style.display = this.i.style.display = b ? '' : 'none'; }
  dispose() { this.p.remove(); this.i.remove(); }
}
