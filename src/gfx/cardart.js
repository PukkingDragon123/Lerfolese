// Card faces: hand-built pixel art at 120x168 (frame, backdrops, illustrations; see ./cards/*), upscaled 4x
// with nearest filtering. Text is set with the pixel fonts at whole multiples of their native size (crisp blocks).
import { BASICS, POWERS, KIND_LABEL } from '../game/data/cards.js';
import { baseOf, describeAttack } from '../game/combos.js';
import { roman, hashString } from '../core/util.js';
import { Spr, toCanvas } from './cards/kit.js';
import { K, TRIM, ENAMEL } from './cards/pal.js';
import { CW, CH, AX, AY, AW, AH, MED, drawFrame, medallion, emblem, windowCorners, backPanel } from './cards/frame.js';
import { backdrop, shadow, backlight } from './cards/backdrops.js';
import { SUBJECTS } from './cards/subjects.js';
import { MAGIC } from './cards/magic.js';
import { POWER_SUBJECTS } from './cards/powers.js';
import { moveArt, backArt } from './cards/overlays.js';
import { FONT, measure, wrapText, drawPixelText } from '../ui3d/craft.js';

export { CW, CH };
export const CS = 4;
export function setForgeRenderer() { /* illustrations are hand-pixelled now; kept for API compatibility */ }

// ---------- illustrations ----------
const artCache = new Map();
// place a subject sprite on a backdrop: feet on the ground line (with a contact shadow) or centred when floating
export function compose(kind, sub, seed) {
  const bg = backdrop(kind, seed);
  const gx = Math.round(AW / 2);
  if (sub) {
    const bb = sub.bounds();
    const ax = sub.ax ?? Math.round((bb.x0 + bb.x1) / 2), ay = sub.ay ?? bb.y1;
    let ox = gx - ax + (sub.dx || 0), oy;
    if (bg.ground != null && !sub.float) { oy = bg.ground + 1 - ay + (sub.dy || 0); shadow(bg, gx + (sub.sx || 0), bg.ground, sub.sw || bb.w * 0.8); }
    else if (bg.ground != null && sub.float) { const lift = Math.max(0, Math.min(6, bg.ground - 2 - (bb.y1 - bb.y0))); oy = bg.ground - lift - bb.y1 + (sub.dy || 0); shadow(bg, gx + (sub.sx || 0), bg.ground, (sub.sw || bb.w) * 0.55); }
    else oy = Math.round(AH / 2 - (bb.y0 + bb.y1 + 1) / 2) + (sub.dy || 0);
    backlight(bg, sub, ox, oy);
    sub.draw(bg, ox, oy);
  }
  return bg;
}
function subjectFor(id) {
  const base = BASICS[id]?.mutantOf;
  const alias = BASICS[id]?.art; // newer science cards borrow a related subject
  const f = MAGIC[id] || SUBJECTS[id] || MAGIC[base] || SUBJECTS[base] || MAGIC[alias] || SUBJECTS[alias] || SUBJECTS.apple;
  return f();
}
function illustration(key, make) {
  if (!artCache.has(key)) { let s; try { s = make(); } catch (e) { console.warn('card art failed', key, e); s = backdrop('power', 1); } artCache.set(key, s); }
  return artCache.get(key);
}

// ---------- public ----------
const faceCache = new Map();
export function cardFaceKey(card, move) { return card.type === 'move' ? `move:${move?.key}:${card.up || 0}:${card.name || ''}` : `${card.type || 'basic'}:${card.petrified ? 'stone' : card.id}:${card.up || 0}`; }

const STAT = { MASS: K.paint_red, VEL: K.paint_blue, HITS: ENAMEL.tool, ZAP: K.elec, BURN: K.flame, MULT: K.gold, TURNS: ENAMEL.move, BOUNCE: K.cyan, ALL: K.violet };

export function renderCardFace(card, move) {
  const key = cardFaceKey(card, move);
  if (faceCache.has(key)) return faceCache.get(key);
  const isPower = card.type === 'power', isMove = card.type === 'move';
  const id = card.petrified ? 'stone' : card.id;
  const def = isPower ? POWERS[id] : isMove ? null : BASICS[id];
  const kind = isPower ? 'power' : isMove ? 'move' : def.kind;
  const seed = hashString(key);
  const up = card.up > 0; const B = up ? TRIM.gold : TRIM.brass;
  const s = new Spr(CW, CH);
  drawFrame(s, kind, up);
  const ill = isMove ? illustration('m:' + move.key, () => moveArt(move, compose))
    : isPower ? illustration('p:' + id, () => compose('power', (POWER_SUBJECTS[id] || POWER_SUBJECTS.first_law)(), hashString(id)))
      : illustration('c:' + id, () => compose(def.kind, subjectFor(id), hashString(id)));
  ill.draw(s, AX, AY);
  windowCorners(s, B);
  const medal = [];
  if (!isPower) {
    if (isMove) { if (move.attack.m) medal.push(['MASS', move.attack.m], ['VEL', move.attack.v]); }
    else {
      const S = (k) => (up && def.up?.[k] !== undefined ? def.up[k] : def[k]);
      if (def.kind === 'matter') medal.push(['MASS', S('m')], ['VEL', S('v')]);
      else {
        if (S('dm')) medal.push(['MASS', S('dm'), '+']); if (S('dv')) medal.push(['VEL', S('dv'), '+']);
        if (S('hits')) medal.push(['HITS', '+' + S('hits')]); if (S('charge')) medal.push(['ZAP', S('charge')]);
        if (S('burn')) medal.push(['BURN', S('burn')]); if (S('focus')) medal.push(['MULT', 'x' + S('focus')]);
        if (S('persist')) medal.push(['TURNS', '+' + S('persist')]); if (S('bounce')) medal.push(['BOUNCE', '+' + S('bounce')]);
        if (def.prism) medal.push(['ALL', '*']);
      }
    }
  }
  for (let i = 0; i < 2; i++) { const m = medal[i]; if (m) medallion(s, MED[i][0], MED[i][1], STAT[m[0]] || K.paint_red, B); else emblem(s, MED[i][0], MED[i][1], kind, B); }

  const out = toCanvas(s, CS);
  const g = out.getContext('2d');
  // all lettering is the pixel fonts at whole multiples of their native size (see craft.js FONT): Alagard titles,
  // PixelSans rules text, NanoPlus numbers; drawn as solid k x k blocks so the face stays crisp at any zoom
  const T = (str, x, y, f, color, o = {}) => drawPixelText(g, str, x, Math.round(y + (FONT[f].cap * (o.k || FONT[f].scale || 1)) / (FONT[f].scale || 1) / 2), f, { color, align: 'center', ...o });
  const title = (isMove ? card.name || move.name : isPower ? (def.short || def.name) : def.name) + (up ? '+' : '');
  // Alagard 32 when the name fits the 300px band, else Alagard 16 doubled, else (long Move names) PixelSans x2
  const tf = measure(title, 'title') <= 300 ? 'title' : measure(title, 'head') * 2 <= 300 ? 'head' : 'body'; const tk = tf === 'title' ? 1 : tf === 'head' ? 2 : measure(title, 'body') * 2 <= 304 ? 2 : 1;
  T(title, (CW / 2) * CS, 11.75 * CS, tf, '#fff6cf', { outline: '#2a1008', shadow: '#12060a', k: tk });
  medal.slice(0, 2).forEach((m, i) => {
    const [x, y] = MED[i]; const v = (String(m[1]).startsWith('-') ? '' : m[2] || '') + String(m[1]);
    T(v, (x + 0.5) * CS, (y + 0.25) * CS, 'num', '#fff6cf', { k: v.length > 2 ? 2 : 3, outline: '#1a0c14', shadow: '#0a0408' });
  });
  const typeLabel = card.petrified ? 'PETRIFIED' : isPower ? 'POWER · LAW' : isMove ? `MOVE · ${move.n} CARDS` : `BASIC · ${KIND_LABEL[def.kind].toUpperCase()}`;
  T(typeLabel, (CW / 2) * CS, 90.75 * CS, 'body', '#3a1c0c', { k: measure(typeLabel, 'body') * 2 <= 52 * CS ? 2 : 1 });
  let lines;
  if (isPower) lines = up ? def.upText : def.text;
  else if (isMove) {
    const a = move.attack; lines = [];
    if (a.perHit > 0) lines.push(`${a.m}kg × ${a.v}m/s${a.focus > 1 ? ' ×' + a.focus : ''} = ${a.perHit}${a.hits > 1 ? ' ×' + a.hits : ''}`);
    const extra = describeAttack(a).slice(a.perHit > 0 ? 1 : 0).join(' · ');
    if (extra) lines.push(...wrapText(extra, 'body', Math.floor(100 * CS / 3)).slice(0, 2));
    const sf = move.self; const ss = []; if (sf.block) ss.push(`Block ${sf.block}`); if (sf.heal) ss.push(`Heal ${sf.heal}`); if (sf.draw) ss.push(`Draw ${sf.draw}`);
    if (ss.length && lines.length < 4) lines.push('SELF: ' + ss.join(', '));
    if (move.field.valid && lines.length < 4) lines.push('FIELD: ' + move.field.name);
  } else lines = up && def.upText ? def.upText : def.text;
  // rules text: PixelSans x3 when every line fits the 100px box (else x2 for the whole card, never mixed), long lines
  // re-wrapped without orphans; "AIR:"-style rule keywords in carmine
  const BOX = 96 * CS; let k = 3; const fitK = (kk) => lines.every((l) => measure(l, 'body') * kk <= BOX);
  if (!fitK(3)) { const re = lines.flatMap((l) => (measure(l, 'body') * 3 <= BOX ? [l] : wrapText(l, 'body', Math.floor(BOX / 3)))); if (re.length <= 4) lines = re; else k = 2; }
  if (k === 2 && !fitK(2)) lines = lines.flatMap((l) => (measure(l, 'body') * 2 <= BOX ? [l] : wrapText(l, 'body', Math.floor(BOX / 2))));
  lines = lines.slice(0, k === 3 ? 4 : 5); const n = lines.length;
  const lh = (k === 3 ? (n > 3 ? 10.5 : 12) : (n > 4 ? 8 : 9.5)) * CS; const y0 = 124.75 * CS - ((n - 1) * lh) / 2;
  lines.forEach((l, i) => {
    const y = y0 + i * lh; const m = l.match(/^([A-Z]+:)(.*)$/);
    if (m) { const w1 = measure(m[1], 'body') * k, w2 = measure(m[2], 'body') * k; const x0 = (CW / 2) * CS - (w1 + w2) / 2; T(m[1], x0 + w1 / 2, y, 'body', '#8c1a30', { k }); T(m[2], x0 + w1 + w2 / 2, y, 'body', '#2a140c', { k }); }
    else T(l, (CW / 2) * CS, y, 'body', '#2a140c', { k });
  });
  const num = isMove ? (move.special ? '★' : '◆') : def.mutantOf ? roman(BASICS[def.mutantOf].num) + '*' : roman(def.num || 0);
  if (/^[★◆]$/.test(num)) T(num, (CW / 2) * CS, 158.75 * CS, 'body', '#3a1c0c', { k: 2 }); else T(num, (CW / 2) * CS, 158.75 * CS, 'num', '#3a1c0c', { k: 2 });
  faceCache.set(key, out);
  return out;
}

let backCanvas = null;
export function renderCardBack() {
  if (backCanvas) return backCanvas;
  const s = new Spr(CW, CH);
  drawFrame(s, 'power', false, { plaque: false, textBox: false });
  backPanel(s);
  backArt(compose).draw(s, AX, AY);
  emblem(s, MED[0][0], MED[0][1], 'power', TRIM.brass); emblem(s, MED[1][0], MED[1][1], 'power', TRIM.brass);
  s.grid(['..a..', '.aba.', 'abbba', '.aba.', '..a..'], { a: TRIM.brass[2], b: TRIM.brass[6] }, CW / 2 - 3, 156);
  windowCorners(s, TRIM.brass);
  const out = toCanvas(s, CS); const g = out.getContext('2d');
  drawPixelText(g, 'APPLE OF DISCORD', CW / 2 * CS, 11.75 * CS + 11, 'title', { color: '#fff6cf', outline: '#2a1008', shadow: '#12060a', align: 'center' });
  ['Every action has an', 'equal and opposite', 'god.'].forEach((l, i) => drawPixelText(g, l, CW / 2 * CS, (112 + i * 12) * CS + 11, 'body', { color: '#d8c6ff', shadow: '#1a1030', align: 'center', k: 3 }));
  backCanvas = out; return out;
}

export function clearFaceCache() { faceCache.clear(); }
void baseOf;
