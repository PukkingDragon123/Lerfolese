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
  if (isPower) T('POWER · LAW', (CW / 2) * CS, 90.75 * CS, 'rune', '#3a1660', { k: 2 }); // Laws are magic: RuneMono
  else T(typeLabel, (CW / 2) * CS, 90.75 * CS, 'body', '#3a1c0c', { k: measure(typeLabel, 'body') * 2 <= 52 * CS ? 2 : 1 });
  // RULES: big and short, Slay-the-Spire style: up to 3 lines of PixelSans x4 (x3 when a line is long), inline pixel
  // icons ({kg} {v} {hit} {blk} {heal} {draw} {disc} {zap} {burn} {launch} {thorn}) and the keywords in carmine
  let lines;
  if (isPower) lines = up ? def.upText : def.text;
  else if (isMove) {
    const a = move.attack; lines = [];
    if (a.perHit > 0) lines.push(`${a.m}{kg} x ${a.v}{v} = ${a.perHit}${a.hits > 1 ? ' x' + a.hits : ''}`);
    const extra = describeAttack(a).slice(a.perHit > 0 ? 1 : 0, 2).map((x) => x.replace(/\(.*\)/, '').trim()); lines.push(...extra);
    const sf = move.self; const ss = []; if (sf.block) ss.push(`{blk}${sf.block}`); if (sf.heal) ss.push(`{heal}${sf.heal}`); if (sf.draw) ss.push(`{draw}${sf.draw}`);
    if (ss.length && lines.length < 3) lines.push('SELF: ' + ss.join(' '));
  } else lines = cardRules(def, up);
  lines = lines.filter(Boolean).slice(0, isPower ? 4 : 3);
  const BOX = 104 * CS; const wOf = (l, kk) => lineW(l, kk); let k = isPower ? 3 : 4; while (k > 2 && lines.some((l) => wOf(l, k) > BOX)) k--;
  if (lines.some((l) => wOf(l, k) > BOX)) lines = lines.flatMap((l) => (wOf(l, k) <= BOX ? [l] : wrapText(l, 'body', Math.floor(BOX / k)))).slice(0, 5);
  const n = lines.length; const lh = (k >= 4 ? 13 : k === 3 ? (n > 3 ? 10.5 : 12) : 9) * CS; const y0 = 124.5 * CS - ((n - 1) * lh) / 2;
  lines.forEach((l, i) => drawRuleLine(g, l, (CW / 2) * CS, y0 + i * lh, k, T));
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
  drawPixelText(g, 'LERFOLESE', CW / 2 * CS, 11.75 * CS + 11, 'title', { color: '#fff6cf', outline: '#2a1008', shadow: '#12060a', align: 'center' });
  ['Every action has an', 'equal and opposite', 'god.'].forEach((l, i) => drawPixelText(g, l, CW / 2 * CS, (112 + i * 12) * CS + 11, 'body', { color: '#d8c6ff', shadow: '#1a1030', align: 'center', k: 3 }));
  backCanvas = out; return out;
}

export function clearFaceCache() { faceCache.clear(); }
void baseOf;

// ---------- short rules text: generated from a card's numbers (or its own `rules`), with inline pixel icons
const ICONS = {
  kg: ['...kkk...', '..k...k..', '..kkkkk..', '.kwwwwwk.', '.kwwhwwk.', 'kwwwwwwwk', 'kwwwwwwwk', 'kdddddddk', 'kkkkkkkkk'],
  v: ['.........', 'kk..kkk..', '.....kbk.', 'kkkkkbbbk', 'kbbbbbbbk', 'kkkkkbbbk', '.....kbk.', 'kk..kkk..', '.........'],
  hit: ['....k....', '.k.kyk.k.', '..kyyyk..', '.kyywyyk.', 'kyywwwyyk', '.kyywyyk.', '..kyyyk..', '.k.kyk.k.', '....k....'],
  blk: ['kkkkkkkkk', 'kbbbbbbbk', 'kbhbbbbbk', 'kbbbbbbbk', 'kbbbbbbbk', '.kbbbbbk.', '.kbbbbbk.', '..kbbbk..', '...kkk...'],
  heal: ['.........', '.kk...kk.', 'krrk.krrk', 'krhrkrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'],
  draw: ['.kkkkkk..', '.kppppk..', '.kppppkk.', '.kpkkpk..', '.kpkgkk..', '.kkgggk..', '..kkgkk..', '...kkk...', '.........'],
  disc: ['.kkkkkk..', '.kppppk..', '.krpprk..', '.kprrpk..', '.kprrpk..', '.krpprk..', '.kppppk..', '.kkkkkk..', '.........'],
  zap: ['....kkk..', '...kyyk..', '..kyyk...', '.kyyykk..', '.kkkyyk..', '...kyk...', '..kyk....', '..kk.....', '.........'],
  burn: ['....k....', '...kok...', '..kook.k.', '..koookok', '.kooyook.', '.koyyyok.', '.koyyyok.', '..kooook.', '...kkkk..'],
  launch: ['....kkkkk', '.....kwwk', '....kwwwk', '...kwwkwk', '..kwwk.kk', '.kwwk....', 'kwwk.....', 'kkk......', '.........'],
  thorn: ['....k....', '...kgk...', 'k..kgk..k', 'kk.kgk.kk', '.kkgggkk.', '..kgggk..', '.kkgggkk.', 'kk.kgk.kk', 'k...k...k'],
};
const IPAL = { k: '#1a0c14', w: '#d8d4dc', h: '#ffffff', d: '#8a8690', b: '#5aa8e8', y: '#ffd848', r: '#d8283a', p: '#f2e6c8', g: '#58a838', o: '#ff8a2a' };
function drawIcon(g, name, x, y, k) { const I = ICONS[name]; if (!I) return 0; for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const c = IPAL[I[j][i]]; if (c) { g.fillStyle = c; g.fillRect(x + i * k, y + j * k, k, k); } } return 10 * k; }
const tokens = (l) => String(l).split(/(\{[a-z]+\})/).filter(Boolean);
function lineW(l, k) { return tokens(l).reduce((w, t) => w + (/^\{[a-z]+\}$/.test(t) && ICONS[t.slice(1, -1)] ? 10 * k : measure(t, 'body') * k), 0); }
const KEY = /^(LAUNCH(ES)?|SELF:|EAT:|MERGE:|ZAP|BURN|HIT|BLOCK|DRAW|DISCARD|DISCARDED:|THORNS|WEAK|VENOM|WET|KEPT|ALL|CARRY:|SHOVE:|FALLS:|PLACE:|DOUBLE|x\d.*)$/;
function drawRuleLine(g, l, cx, y, k, T) {
  const parts = tokens(l); const W = lineW(l, k); let x = Math.round(cx - W / 2);
  for (const t of parts) {
    const ic = /^\{([a-z]+)\}$/.exec(t); if (ic && ICONS[ic[1]]) { x += drawIcon(g, ic[1], x, Math.round(y - 5 * k), k); continue; }
    // keywords in carmine, numbers in deep blue, the rest in ink (word by word, so a keyword inside a phrase still pops)
    for (const w of t.split(/(\s+)/)) { if (!w) continue; const ww = measure(w, 'body') * k; if (w.trim()) T(w, x + ww / 2, y, 'body', KEY.test(w) ? '#8c1a30' : /^[+\-x×]?\d/.test(w) ? '#1e3a7a' : '#2a140c', { k }); x += ww; }
  }
}
export function cardRules(def, up) {
  if (def.rules) return (up && def.upRules) || def.rules;
  const S = (k) => (up && def.up?.[k] !== undefined ? def.up[k] : def[k]); const L = [];
  if (def.kind === 'matter') L.push(`{kg} ${S('m')} kg MATTER`);
  const md = []; if (S('dm')) md.push(`${S('dm') > 0 ? '+' : ''}${S('dm')}{kg}`); if (S('dv')) md.push(`${S('dv') > 0 ? '+' : ''}${S('dv')}{v}`); if (S('hits')) md.push(`+${S('hits')}{hit}`); if (md.length) L.push(md.join('  '));
  if (def.launch) L.push('{launch} LAUNCHES');
  if (S('charge')) L.push(`{zap} ZAP ${S('charge')}`); if (S('burn')) L.push(`{burn} BURN ${S('burn')}`); if (S('focus')) L.push(`x${S('focus')} damage`); if (def.prism || def.spread) L.push('Hits ALL foes'); if (S('bounce')) L.push(`Bounces +${S('bounce')}`);
  if (S('persist')) L.push(`Again +${S('persist')} turn${S('persist') > 1 ? 's' : ''}`); if (S('weakOnHit') || S('chill')) L.push(`Foe WEAK ${S('weakOnHit') || S('chill')}`); if (S('venom')) L.push(`VENOM ${S('venom')}`); if (S('wet')) L.push(`WET ${S('wet')}`); if (S('disarm')) L.push(`Foe -${S('disarm')} STR`);
  if (def.echo) L.push('Repeats its left card'); if (def.twin) L.push('CLONES the object'); if (def.amplify) L.push('DOUBLE the next card'); if (def.resonance) L.push('x1.5 per repeat'); if (def.catalyst) L.push('Heat x2 (Water held)'); if (def.keystone) L.push(`+${def.keystone}{kg} per Stone`); if (def.domino) L.push('+20% per kind change'); if (def.lever) L.push('x2 FORCE damage'); if (S('pressure')) L.push(`+${S('pressure')}{kg} per card`); if (S('swing')) L.push(`+${S('swing')}{v} per card`); if (def.pierce) L.push('Ignores Block'); if (def.hard) L.push('Cracks Block');
  const self = []; if (S('heal')) self.push(`{heal}${S('heal')}`); if (S('block')) self.push(`{blk}${S('block')}`); if (S('draw')) self.push(`{draw}${S('draw')}`); if (S('thorns')) self.push(`{thorn}${S('thorns')}`); if (S('charged')) self.push(`{zap}+${S('charged')}`); if (S('kindle')) self.push(`{burn}+${S('kindle')}`); if (S('momentum')) self.push(`+${S('momentum')}{v} next`); if (def.retain) self.push('KEEP hand'); if (def.cleanse) self.push('cleanse');
  const head = L.slice(0, self.length ? 2 : 3); if (self.length) head.push(`${def.kind === 'matter' && S('heal') ? 'EAT:' : 'SELF:'} ${self.slice(0, 2).join(' ')}`); return head;
}
