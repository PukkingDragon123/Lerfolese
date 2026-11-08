// Card faces: hand-built pixel art at 120x168 (frame, backdrops, illustrations; see ./cards/*), upscaled 4x
// with nearest filtering. Text is set at the final resolution with the bundled pixel fonts for legibility.
import { BASICS, POWERS, KIND_LABEL } from '../game/data/cards.js';
import { baseOf, describeAttack } from '../game/combos.js';
import { roman, hashString } from '../core/util.js';
import { Spr, toCanvas } from './cards/kit.js';
import { K, TRIM, ENAMEL } from './cards/pal.js';
import { CW, CH, AX, AY, AW, AH, MED, drawFrame, medallion, emblem, windowCorners, backPanel } from './cards/frame.js';
import { backdrop, shadow } from './cards/backdrops.js';
import { SUBJECTS } from './cards/subjects.js';
import { MAGIC } from './cards/magic.js';
import { POWER_SUBJECTS } from './cards/powers.js';
import { moveArt, backArt } from './cards/overlays.js';

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
    sub.draw(bg, ox, oy);
  }
  return bg;
}
function subjectFor(id) {
  const base = BASICS[id]?.mutantOf;
  const f = MAGIC[id] || SUBJECTS[id] || MAGIC[base] || SUBJECTS[base] || SUBJECTS.apple;
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
  const txt = (str, x, y, size, color, font = 'VT323', align = 'center', weight = 400, stroke = null, sw = 6) => {
    g.font = `${weight} ${size}px "${font}"`; g.textAlign = align; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(str, x, y); }
    g.fillStyle = color; g.fillText(str, x, y);
  };
  const fit = (str, maxW, size, font, weight = 400) => { g.font = `${weight} ${size}px "${font}"`; while (g.measureText(str).width > maxW && size > 14) { size -= 2; g.font = `${weight} ${size}px "${font}"`; } return size; };
  const title = (isMove ? card.name || move.name : isPower ? (def.short || def.name) : def.name) + (up ? '+' : '');
  const tsize = fit(title, 300, 38, 'Pixelify', 700);
  txt(title, (CW / 2) * CS, 11.75 * CS, tsize, '#fff6cf', 'Pixelify', 'center', 700, '#2a1008', 8);
  medal.slice(0, 2).forEach((m, i) => {
    const [x, y] = MED[i]; const v = (m[2] || '') + String(m[1]);
    txt(v, (x + 0.5) * CS, (y + 0.25) * CS, v.length > 2 ? 24 : 32, '#fff6cf', 'Pixelify', 'center', 700, '#1a0c14', 7);
  });
  const typeLabel = card.petrified ? 'PETRIFIED' : isPower ? 'POWER · LAW' : isMove ? `MOVE · ${move.n} CARDS` : `BASIC · ${KIND_LABEL[def.kind].toUpperCase()}`;
  txt(typeLabel, (CW / 2) * CS, 90.75 * CS, fit(typeLabel, 52 * CS, 18, 'Silkscreen', 700), '#3a1c0c', 'Silkscreen', 'center', 700);
  let lines;
  if (isPower) lines = up ? def.upText : def.text;
  else if (isMove) {
    const a = move.attack; lines = [];
    if (a.perHit > 0) lines.push(`${a.m}kg x ${a.v}m/s${a.focus > 1 ? ' x' + a.focus : ''} = ${a.perHit}${a.hits > 1 ? ' x' + a.hits : ''}`);
    const extra = describeAttack(a).slice(a.perHit > 0 ? 1 : 0).join(' · ');
    if (extra) lines.push(...wrapCanvas(g, extra, 100 * CS, 34, 'VT323').slice(0, 2));
    const sf = move.self; const ss = []; if (sf.block) ss.push(`Block ${sf.block}`); if (sf.heal) ss.push(`Heal ${sf.heal}`); if (sf.draw) ss.push(`Draw ${sf.draw}`);
    if (ss.length && lines.length < 4) lines.push('SELF: ' + ss.join(', '));
    if (move.field.valid && lines.length < 4) lines.push('FIELD: ' + move.field.name);
  } else lines = up && def.upText ? def.upText : def.text;
  lines = lines.slice(0, 4);
  const lh = 12.5 * CS; const y0 = (124.75 - ((lines.length - 1) * 12.5) / 2) * CS;
  lines.forEach((l, i) => {
    const size = fit(l, 100 * CS, 36, 'VT323');
    const m = l.match(/^([A-Z]+:)(.*)$/);
    if (m) {
      g.font = `400 ${size}px "VT323"`; const w1 = g.measureText(m[1]).width, w2 = g.measureText(m[2]).width; const x0 = (CW / 2) * CS - (w1 + w2) / 2;
      txt(m[1], x0, y0 + i * lh, size, '#8c1a30', 'VT323', 'left'); txt(m[2], x0 + w1, y0 + i * lh, size, '#2a140c', 'VT323', 'left');
    } else txt(l, (CW / 2) * CS, y0 + i * lh, size, '#2a140c', 'VT323');
  });
  const num = isMove ? (move.special ? '★' : '◆') : def.mutantOf ? roman(BASICS[def.mutantOf].num) + '*' : roman(def.num || 0);
  txt(num, (CW / 2) * CS, 158.75 * CS, 26, '#3a1c0c', 'Pixelify', 'center', 700);
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
  const s = new Spr(CW, CH);
  drawFrame(s, 'power', false, { plaque: false, textBox: false });
  backPanel(s);
  backArt(compose).draw(s, AX, AY);
  emblem(s, MED[0][0], MED[0][1], 'power', TRIM.brass); emblem(s, MED[1][0], MED[1][1], 'power', TRIM.brass);
  s.grid(['..a..', '.aba.', 'abbba', '.aba.', '..a..'], { a: TRIM.brass[2], b: TRIM.brass[6] }, CW / 2 - 3, 156);
  windowCorners(s, TRIM.brass);
  const out = toCanvas(s, CS); const g = out.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 26px "Pixelify"'; g.lineWidth = 8; g.lineJoin = 'round'; g.strokeStyle = '#2a1008'; g.strokeText('APPLE OF DISCORD', CW / 2 * CS, 11.75 * CS); g.fillStyle = '#fff6cf'; g.fillText('APPLE OF DISCORD', CW / 2 * CS, 11.75 * CS);
  g.font = '400 34px "VT323"'; g.fillStyle = '#d8c6ff'; ['Every action has an', 'equal and opposite', 'god.'].forEach((l, i) => g.fillText(l, CW / 2 * CS, (112 + i * 12.5) * CS));
  backCanvas = out; return out;
}

export function clearFaceCache() { faceCache.clear(); }
void baseOf;
