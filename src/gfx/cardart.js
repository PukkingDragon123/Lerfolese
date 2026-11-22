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
import { hasIcon, iconSnapshot, setIconRenderer } from './icon3d.js';

export { CW, CH };
export const CS = 4;
export function setForgeRenderer(r) { setIconRenderer(r); } // the shared renderer for the 3D icon snapshots (gfx/icon3d.js)
// face resolution: the pixel art at CS x RES (whole blocks) and the lettering as vector Alagard at that resolution
export const RES = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) ? 1.25 : 1.5;

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

// live: StS-style live numbers, { blk|heal|kg|v: [base, now] }: a rule number equal to base is drawn as now, green when
// buffed, red when weakened (Frail Block, Lead Boots kg, the Minotaur's Horn on Force, Gravitation on Gravity...)
// live3d: the face for a 3D card in hand, whose 3D icon object is a live overlay (gfx/icon3d.js CardIcon): the art
// window keeps only its painted backdrop. Flat faces (journal, menus) get the object's rendered snapshot painted in.
export function renderCardFace(card, move, live = null, { live3d = false } = {}) {
  const key = cardFaceKey(card, move) + (live ? '|' + JSON.stringify(live) : '') + (live3d ? '|3d' : '');
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
      : hasIcon(id) ? illustration('c0:' + id, () => compose(def.kind, null, hashString(id))) // a real 3D object stands on this backdrop
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

  const out = toCanvas(s, Math.round(CS * RES));
  const g = out.getContext('2d');
  if (!isPower && !isMove && hasIcon(id) && !live3d) { const snap = iconSnapshot(id, 212, 126); if (snap) { const R = CS * RES; g.imageSmoothingEnabled = true; g.drawImage(snap, (AX + 4) * R, (AY + 1) * R, (AW - 8) * R, (AH - 2) * R); } }
  agePaper(out, seed, kind);
  g.setTransform(RES, 0, 0, RES, 0, 0); // all lettering below is laid out in CS units
  // all lettering is the pixel fonts at whole multiples of their native size (see craft.js FONT): Alagard titles,
  // PixelSans rules text, NanoPlus numbers; drawn as solid k x k blocks so the face stays crisp at any zoom
  const T = (str, x, y, f, color, o = {}) => drawPixelText(g, str, x, Math.round(y + (FONT[f].cap * (o.k || FONT[f].scale || 1)) / (FONT[f].scale || 1) / 2), f, { color, align: 'center', ...o });
  const title = (isMove ? card.name || move.name : isPower ? (def.short || def.name) : def.name) + (up ? '+' : '');
  // Alagard 32 when the name fits the 300px band, else Alagard 16 doubled, else (long Move names) PixelSans x2
  const tf = measure(title, 'title') <= 300 ? 'title' : measure(title, 'head') * 2 <= 300 ? 'head' : 'body'; const tk = tf === 'title' ? 1 : tf === 'head' ? 2 : measure(title, 'body') * 2 <= 304 ? 2 : 1;
  T(title, (CW / 2) * CS, 11.75 * CS, tf, '#f0e2bf', { outline: '#2a1a10', shadow: '#140c08', k: tk });
  medal.slice(0, 2).forEach((m, i) => {
    const [x, y] = MED[i]; const v = (String(m[1]).startsWith('-') ? '' : m[2] || '') + String(m[1]);
    T(v, (x + 0.5) * CS, (y + 0.25) * CS, 'num', '#f2e6c6', { k: v.length > 2 ? 2 : 3, outline: '#1e140e', shadow: '#0c0806' });
  });
  const typeLabel = card.petrified ? 'PETRIFIED' : isPower ? 'POWER · LAW' : isMove ? `SPELL · ${move.n} CARDS` : def.kind === 'matter' ? 'MATTER · PLACE IT' : def.launch ? `${KIND_LABEL[def.kind].toUpperCase()} · LAUNCHER` : `${KIND_LABEL[def.kind].toUpperCase()} · MERGE IT`; // the type line: what you DO with it
  if (isPower) T('POWER · LAW', (CW / 2) * CS, 90.75 * CS, 'rune', '#3e2448', { k: 2 }); // Laws are magic: RuneMono
  else T(typeLabel, (CW / 2) * CS, 90.75 * CS, 'body', '#3a2414', { k: measure(typeLabel, 'body') * 2 <= 52 * CS ? 2 : 1 });
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
  lines.forEach((l, i) => drawRuleLine(g, l, (CW / 2) * CS, y0 + i * lh, k, T, live));
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
  const out = toCanvas(s, Math.round(CS * RES)); agePaper(out, 77, 'power'); const g = out.getContext('2d'); g.setTransform(RES, 0, 0, RES, 0, 0);
  // (no game name on screen)
  ['Every action has an', 'equal and opposite', 'god.'].forEach((l, i) => drawPixelText(g, l, CW / 2 * CS, (112 + i * 12) * CS + 11, 'body', { color: '#d6ccb4', shadow: '#1a1410', align: 'center', k: 3 }));
  backCanvas = out; return out;
}

export function clearFaceCache() { faceCache.clear(); }

// ---------- THE OLD BOOK: faded inks, aged paper, an etched print, worn edges (user: muted, not bold)
export const INK = { oxblood: '#7a2228', indigo: '#2e3a5e', sepia: '#3a2616', verdigris: '#2f5a50' };
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** age a face canvas in place: sepia-faded colour, a warm ink instead of black, soft mottling, engraved hatching in
 *  the art window, darkened and rubbed edges, paper fibres and irregular foxing (speckle clusters, never round spots) */
export function agePaper(c, seed = 1, kind = 'matter') {
  const g = c.getContext('2d'); const W = c.width, H = c.height; const img = g.getImageData(0, 0, W, H); const d = img.data; const r = mulberry(seed * 9 + 1);
  const GX = 16, GY = 22; const grid = new Float32Array((GX + 1) * (GY + 1)); for (let i = 0; i < grid.length; i++) grid[i] = 0.9 + r() * 0.13; // mottling
  const ax0 = (AX / CW) * W, ax1 = ((AX + AW) / CW) * W, ay0 = (AY / CH) * H, ay1 = ((AY + AH) / CH) * H; const hatch = Math.max(2, Math.round(W / 240));
  const tint = { matter: [1.0, 0.97, 0.93], law: [0.97, 0.98, 1.0], energy: [1.0, 0.97, 0.9], tool: [0.96, 1.0, 0.97], move: [0.98, 1.0, 0.94], power: [0.99, 0.96, 1.0] }[kind] || [1, 1, 1];
  for (let y = 0; y < H; y++) { const gy = (y / H) * GY, j = Math.floor(gy), fy = gy - j; const art = y > ay0 && y < ay1;
    for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] === 0) continue;
      let R = d[i], G = d[i + 1], B = d[i + 2]; const L = R * 0.3 + G * 0.59 + B * 0.11;
      const sp = art && x > ax0 && x < ax1 ? 0.74 : 0.55; R += (L * 1.08 + 10 - R) * sp; G += (L * 0.96 + 4 - G) * sp; B += (L * 0.78 - 2 - B) * sp; // faded toward sepia
      R = 128 + (R - 128) * 0.9; G = 128 + (G - 128) * 0.9; B = 128 + (B - 128) * 0.9; const dk = Math.max(0, 1 - L / 90); R += 20 * dk; G += 13 * dk; B += 8 * dk; // warm ink, never black
      const gx = (x / W) * GX, k = Math.floor(gx), fx = gx - k; const m0 = grid[j * (GX + 1) + k] * (1 - fx) + grid[j * (GX + 1) + k + 1] * fx, m1 = grid[(j + 1) * (GX + 1) + k] * (1 - fx) + grid[(j + 1) * (GX + 1) + k + 1] * fx; let m = m0 * (1 - fy) + m1 * fy;
      if (art && x > ax0 && x < ax1 && y % hatch === 0) m *= 0.95; // the etched print
      const de = Math.min(x, y, W - 1 - x, H - 1 - y) / W; m *= 0.72 + 0.28 * Math.min(1, de / 0.06); // edges handled and darkened
      d[i] = Math.min(255, R * m * tint[0]); d[i + 1] = Math.min(255, G * m * tint[1]); d[i + 2] = Math.min(255, B * m * tint[2]);
    } }
  g.putImageData(img, 0, 0);
  const u = W / 120; g.save();
  for (let n = 0; n < 140; n++) { const x = r() * W, y = r() * H, a = r() * Math.PI, l = (2 + r() * 5) * u; g.strokeStyle = `rgba(${r() < 0.5 ? '96,64,34' : '250,236,206'},${0.05 + r() * 0.07})`; g.lineWidth = Math.max(1, u * 0.22); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * u, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } // fibres
  for (let f = 0; f < 4 + Math.floor(r() * 4); f++) { const cx = r() * W, cy = r() * H, sx = (2 + r() * 4) * u, sy = (1.5 + r() * 3) * u; for (let n = 0; n < 70; n++) { const q = r() * r(); const x = cx + (r() - 0.5) * 2 * sx * (0.3 + q), y = cy + (r() - 0.5) * 2 * sy * (0.3 + q); g.fillStyle = `rgba(132,84,38,${0.05 + r() * 0.12})`; g.fillRect(x, y, Math.max(1, u * (0.25 + r() * 0.5)), Math.max(1, u * (0.25 + r() * 0.4))); } } // foxing: speckle clusters
  g.globalCompositeOperation = 'source-atop'; for (let n = 0; n < 34; n++) { const side = Math.floor(r() * 4), t = r(), len = (2 + r() * 8) * u, th = (0.3 + r() * 0.7) * u; g.fillStyle = `rgba(236,214,168,${0.1 + r() * 0.14})`; // rubbed gilt / worn corners
    if (side === 0) g.fillRect(t * W, u * 1.2, len, th); else if (side === 1) g.fillRect(t * W, H - u * 1.2 - th, len, th); else if (side === 2) g.fillRect(u * 1.2, t * H, th, len); else g.fillRect(W - u * 1.2 - th, t * H, th, len); }
  g.restore();
}
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
  heat: ['...kkk...', '...kwk...', '...kok...', '...krk...', '...krk...', '..kkrkk..', '.krrorrk.', '.krohork.', '..kkkkk..'], // apple Heat: a little thermometer (rules agent)
  thorn: ['....k....', '...kgk...', 'k..kgk..k', 'kk.kgk.kk', '.kkgggkk.', '..kgggk..', '.kkgggkk.', 'kk.kgk.kk', 'k...k...k'],
};
const IPAL = { k: '#241810', w: '#d2cabc', h: '#f4ecdc', d: '#8a8278', b: '#4e6e94', y: '#d4b456', r: '#a43a32', p: '#e8dcc0', g: '#567e3a', o: '#c27a3a' }; // faded inks
function drawIcon(g, name, x, y, k) { const I = ICONS[name]; if (!I) return 0; for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const c = IPAL[I[j][i]]; if (c) { g.fillStyle = c; g.fillRect(x + i * k, y + j * k, k, k); } } return 10 * k; }
const tokens = (l) => String(l).split(/(\{[a-z]+\})/).filter(Boolean);
function lineW(l, k) { return tokens(l).reduce((w, t) => w + (/^\{[a-z]+\}$/.test(t) && ICONS[t.slice(1, -1)] ? 10 * k : measure(t, 'body') * k), 0); }
const KEY = /^(LAUNCH(ES)?|SELF:|EAT:|MERGE:|ZAP|BURN|HIT|BLOCK|DRAW|DISCARD|DISCARDED:|THORNS|WEAK|VENOM|WET|KEPT|ALL|CARRY:|SHOVE:|FALLS:|PLACE:|DOUBLE|HEAT|VENT|QUENCH|GRAB:|x\d.*)$/;
const STATK = { blk: 'blk', heal: 'heal', kg: 'kg', v: 'v', BLOCK: 'blk', EAT: 'heal' };
function drawRuleLine(g, l, cx, y, k, T, live = null) {
  // live numbers: a number takes the stat of the icon right after it, else of the last icon / keyword before it
  let parts = tokens(l);
  if (live) parts = parts.map((t, i) => { if (!/^[+\-x×]?\d+$/.test(t.trim())) { if (/^\{[a-z]+\}$/.test(t)) return t; return t.replace(/(BLOCK|EAT:?)(\s+)([+\-]?\d+)/g, (m, kw, sp, n) => { const L = live.blk && kw === 'BLOCK' ? live.blk : live.heal && kw.startsWith('EAT') ? live.heal : null; return L && Math.abs(+n) === L[0] && L[1] !== L[0] ? `${kw}${sp}\u0001${L[1]}\u0002${L[1] > L[0] ? 'g' : 'r'}` : m; }); }
    const nx = /^\{([a-z]+)\}$/.exec(parts[i + 1] || ''); let st = nx && STATK[nx[1]]; if (!st) for (let j = i - 1; j >= 0 && !st; j--) { const ic = /^\{([a-z]+)\}$/.exec(parts[j]); if (ic) st = STATK[ic[1]]; } const L = st && live[st]; const n = +t.trim().replace(/^[x×]/, '');
    return L && Math.abs(n) === Math.abs(L[0]) && L[1] !== L[0] ? `${t.match(/^\s*/)[0]}\u0001${(t.trim().startsWith('+') ? '+' : '') + L[1]}\u0002${Math.abs(L[1]) > Math.abs(L[0]) ? 'g' : 'r'}` : t; });
  const W = parts.reduce((w, t) => w + (/^\{[a-z]+\}$/.test(t) && ICONS[t.slice(1, -1)] ? 10 * k : measure(t.replace(/[\u0001]|\u0002[gr]/g, ''), 'body') * k), 0); let x = Math.round(cx - W / 2);
  for (const t of parts) {
    const ic = /^\{([a-z]+)\}$/.exec(t); if (ic && ICONS[ic[1]]) { x += drawIcon(g, ic[1], x, Math.round(y - 5 * k), k); continue; }
    // keywords in carmine, numbers in deep blue (a live number: green when buffed, red when weakened), the rest in ink
    for (const w0 of t.split(/(\s+)/)) { if (!w0) continue; const lv = /\u0001(.*)\u0002([gr])/.exec(w0); const w = lv ? w0.replace(/\u0001(.*)\u0002[gr]/, '$1') : w0; const ww = measure(w, 'body') * k;
      if (w.trim()) T(w, x + ww / 2, y, 'body', lv ? (lv[2] === 'g' ? '#1e6a16' : '#a8141c') : KEY.test(w) ? INK.oxblood : /^[+\-x×]?\d/.test(w) ? INK.indigo : INK.sepia, { k, ...(lv ? { outline: lv[2] === 'g' ? '#d4f0b8' : '#f6d2c8' } : {}) }); x += ww; }
  }
}
export function cardRules(def, up) {
  if (def.rules) return (up && def.upRules) || def.rules;
  const S = (k) => (up && def.up?.[k] !== undefined ? def.up[k] : def[k]); const L = [];
  if (def.kind === 'matter') L.push(`{kg} ${S('m')} kg MATTER`);
  const md = []; if (S('dm')) md.push(`${S('dm') > 0 ? '+' : ''}${S('dm')}{kg}`); if (S('dv')) md.push(`${S('dv') > 0 ? '+' : ''}${S('dv')}{v}`); if (S('hits')) md.push(`+${S('hits')}{hit}`);
  const fr = S('fric'); if (fr && md.length) md.push(`${fr > 0 ? '+' : ''}${fr}{heat}`); if (md.length) L.push(md.join('  ')); // apple Heat (friction)
  if (fr > 0 && !md.length) L.push(def.kind === 'matter' ? `GRAB: +${fr} {heat} HEAT` : `+${fr} {heat} HEAT`);
  if (def.launch) L.push('{launch} LAUNCHES');
  if (S('charge')) L.push(`{zap} ZAP ${S('charge')}`); if (S('burn')) L.push(`{burn} BURN ${S('burn')}`); if (S('focus')) L.push(`x${S('focus')} damage`); if (def.prism || def.spread) L.push('Hits ALL foes'); if (S('bounce')) L.push(`Bounces +${S('bounce')}`);
  if (S('persist')) L.push(`Again +${S('persist')} turn${S('persist') > 1 ? 's' : ''}`); if (S('weakOnHit') || S('chill')) L.push(`Foe WEAK ${S('weakOnHit') || S('chill')}`); if (S('venom')) L.push(`VENOM ${S('venom')}`); if (S('wet')) L.push(`WET ${S('wet')}`); if (S('disarm')) L.push(`Foe -${S('disarm')} STR`);
  if (def.echo) L.push('Repeats its left card'); if (def.twin) L.push('CLONES the object'); if (def.amplify) L.push('DOUBLE the next card'); if (def.resonance) L.push('x1.5 per repeat'); if (def.catalyst) L.push('Heat x2 (Water held)'); if (def.keystone) L.push(`+${def.keystone}{kg} per Stone`); if (def.domino) L.push('+20% per kind change'); if (def.lever) L.push('x2 FORCE damage'); if (S('pressure')) L.push(`+${S('pressure')}{kg} per card`); if (S('swing')) L.push(`+${S('swing')}{v} per card`); if (def.pierce) L.push('Ignores Block'); if (def.hard) L.push('Cracks Block');
  const self = []; if (S('heal')) self.push(`{heal}${S('heal')}`); if (S('block')) self.push(`{blk}${S('block')}`); if (S('draw')) self.push(`{draw}${S('draw')}`); if (S('thorns')) self.push(`{thorn}${S('thorns')}`); if (S('charged')) self.push(`{zap}+${S('charged')}`); if (S('kindle')) self.push(`{burn}+${S('kindle')}`); if (S('momentum')) self.push(`+${S('momentum')}{v} next`); if (def.retain) self.push('KEEP hand'); if (def.cleanse) self.push('cleanse');
  if (S('selfHeat')) self.splice(1, 0, `${S('selfHeat') > 0 ? '+' : ''}${S('selfHeat')}{heat}`); // rub / cool the apple on Newton
  const head = L.slice(0, self.length ? 2 : 3); if (self.length) head.push(`${def.kind === 'matter' && S('heal') ? 'EAT:' : 'SELF:'} ${self.slice(0, 2).join(' ')}`); return head;
}
