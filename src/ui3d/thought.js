// Enemy intent as a physical cartoon THOUGHT BUBBLE: a parchment cloud with an inked scalloped rim and two trailing
// puffs down to the foe's head, showing a little scene of what it means to do: [icon] [number] -> [who], plus an
// inked counter hint ("BRACE: Mass on you"). Hand-placed pixel art on parchment (craft.js), lit and springy in 3D.
import * as THREE from 'three';
import { Surf, RAMP, pxTex, paperMat, sheet, mesh, Body, parchment, inscribe, measure, PXP } from './craft.js';
import { sprite } from '../gfx/sprites.js';
import { Spring } from '../core/tween.js';

// Newton's little portrait for "-> you" (young, spiky silver hair, gold collar), 11x11
const NEWTON = ['...kkkkk...', '..kwlwlwk..', '.kwlwwlwlk.', '.klkkkkklk.', '.kkpppppkk.', '..kpkpkpk..', '..kpppppk..', '...kprpk...', '..kyyyyyk..', '.kbyybyybk.', '.kbbbbbbbk.'];
const NPAL = { k: '#1a1018', w: '#f4f2f6', l: '#b8b6c8', p: '#f0c09a', r: '#b0484a', y: '#e8b03a', b: '#3a3a8a' };
// the foe itself ("-> itself") as a little horned head, 11x11
const FOE = ['.k.......k.', 'kmk.....kmk', '.kmkkkkkmk.', '..kmmmmmk..', '.kmkmmmkmk.', '.kmmmmmmmk.', '..kmkkkmk..', '...kmmmk...', '....kkk....'];
const FPAL = { k: '#1a1018', m: '#8a5a3a' };
const ARROW = ['..k...', '..kk..', 'kkkkk.', 'kkkkkk', 'kkkkk.', '..kk..', '..k...'];
const glyph = (S, rows, pal, x, y) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) S.pix(x + i, y + j, pal[ch]); }));

// what a foe's intent reads as: icon, number, at whom, and the counter
export function intentScene(e, it, B) {
  if (!it) return null; const atk = it.kind === 'attack' || (it.dmg && it.kind !== 'block');
  const val = atk ? B.attackValue(e, it.dmg || 0) - (e.st.shoved || 0) : null; const hits = it.hits || 1;
  const num = atk ? `${Math.max(0, val)}${hits > 1 ? 'x' + hits : ''}` : it.kind === 'block' ? `${it.block || ''}` : it.kind === 'buff' ? `+${it.str || it.evade || ''}` : '';
  const self = it.kind === 'block' || it.kind === 'buff' || (it.kind === 'special' && it.id !== 'steal');
  const icon = it.icon || (atk ? 'sword' : 'question');
  const HINT = {
    attack: hits > 1 ? 'BRACE: Mass on you' : val >= 12 ? 'BIG HIT: brace or Friction' : 'BRACE: Mass on you',
    block: 'It shelters: hit something else', buff: 'It grows stronger: hit it now', none: 'It dithers', special: it.id === 'flee' ? 'Stop it before it runs!' : it.id === 'spill' ? 'Wine! Heat ignites it' : 'Something odd...',
    debuff: it.id === 'gaze' ? 'Petrifies your cards' : it.id === 'steal' ? 'Steals a card!' : it.id === 'acid' ? 'Corrodes your Block' : 'A curse on you',
  };
  return { icon, num, who: self ? 'self' : 'you', hint: HINT[it.kind] || '', label: it.label || '', charge: !!it.charge };
}

export class ThoughtBubble extends Body {
  constructor() {
    super(); this.tiltK = 0; this.hoverLift = 0; this.mat = paperMat(); this.sheet = mesh(new THREE.BufferGeometry(), this.mat, this.pivot, { cast: false }); this.canvas = document.createElement('canvas'); this.tex = null; this.key = '';
    this.st = new Spring(0, 12, 0.5); this.seed = (Math.random() * 99) | 0; this.group.visible = false; this.w = 3; this.h = 2;
  }
  set(sc) {
    const key = sc ? JSON.stringify(sc) : ''; if (key === this.key) return; this.key = key;
    if (!sc) { this.st.target = 0; return; }
    // lettering: NanoPlus x2 for the number, PixelSans for the label and the hint (ink on the parchment cloud)
    const numW = sc.num ? measure(sc.num, 'num2') : 0, hintW = sc.hint ? measure(sc.hint, 'body') : 0, labW = sc.label ? measure(sc.label, 'body') : 0;
    const rowW = 16 + (numW ? numW + 4 : 0) + 9 + 11; const Wt = Math.max(rowW + 26, hintW + 44, labW + 36); const rowY = 8;
    const labY = rowY + 16 + 12, hintY = (sc.label ? labY : rowY + 16) + 12; const bodyH = (sc.hint ? hintY : sc.label ? labY : rowY + 16) + 9, Ht = bodyH + 13; const S = new Surf(Wt, Ht);
    const cx = Wt / 2, cy = bodyH / 2 + 1, rx = Wt / 2 - 4, ry = bodyH / 2 - 4; const bumps = [];
    const nb = Math.max(8, Math.round(Wt / 9)); for (let i = 0; i < nb; i++) { const a = (i / nb) * Math.PI * 2; bumps.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 4.6 + ((i * 7) % 3) * 0.6]); }
    const puffs = [[Wt * 0.3, bodyH + 3.5, 3.6], [Wt * 0.22, bodyH + 9.5, 2.4]];
    const inCloud = (x, y) => (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) || bumps.some(([bx, by, r]) => (x - bx) ** 2 + (y - by) ** 2 <= r * r);
    const mask = (x, y) => inCloud(x + 0.5, y + 0.5) || puffs.some(([px, py, r]) => (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 <= r * r);
    parchment(S, 0, 0, Wt, Ht, { seed: this.seed, torn: 0, tone: 5, mask });
    // shade the lower-right of every lobe a tone darker (lit from the upper left)
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) if (mask(x, y) && !mask(x + 2, y + 2)) S.shift(x, y, -1);
    S.inkEdge('#2a1418');
    // the scene: [icon] [number] -> [Newton | itself]
    let x = Math.round((Wt - rowW) / 2) + 2;
    try { S.blit(sprite(sc.icon), x, rowY + 1); } catch { /* unknown icon */ } x += 16;
    if (sc.num) { inscribe(S, sc.num, x, rowY + 16, 'num2', 'ink', { color: sc.who === 'you' ? '#8a1a1c' : '#1e3a5a' }); x += numW + 4; }
    glyph(S, ARROW, { k: '#4a2a1a' }, x, rowY + 5); x += 9;
    if (sc.who === 'you') glyph(S, NEWTON, NPAL, x, rowY + 3); else glyph(S, FOE, FPAL, x, rowY + 4);
    if (sc.label) inscribe(S, sc.label, Math.round((Wt - labW) / 2), labY, 'body', 'ink', { color: '#4a2a1a' });
    if (sc.hint) inscribe(S, sc.hint, Math.round((Wt - hintW) / 2), hintY, 'body', 'ink', { color: sc.who === 'you' ? '#8a1a1c' : '#1e5a5a' });
    if (this.tex && (this.canvas.width !== Wt * Surf.K(Wt, Ht) || this.canvas.height !== Ht * Surf.K(Wt, Ht))) { this.tex.dispose(); this.tex = null; }
    S.toCanvas(this.canvas); if (!this.tex) { this.tex = pxTex(this.canvas); this.mat.map = this.tex; this.mat.needsUpdate = true; } else this.tex.needsUpdate = true;
    this.w = Wt / PXP * 1.85; this.h = Ht / PXP * 1.85; this.sheet.geometry = sheet(this.w, this.h, { curl: 0.06, sag: 0.02, segX: 6, segY: 4 }); // big enough to read at a glance
    this.sheet.position.set(0, this.h / 2, 0); // the group origin is the tip of the last puff, over the foe's head
    this.group.visible = true; this.st.target = 1; if (this.st.value < 0.2) this.st.value = 0.2; this.kick(0.6);
  }
  update(dt, t = performance.now() / 1000) {
    this.st.update(dt); this.updateBody(dt, null); this.pivot.position.y = Math.sin(t * 1.7 + this.seed) * 0.06; this.pivot.rotation.z += Math.sin(t * 1.1 + this.seed) * 0.015;
    const s = Math.max(0.001, this.st.value); this.pivot.scale.setScalar(s); if (this.st.target === 0 && s < 0.03) this.group.visible = false;
  }
  dispose() { this.tex?.dispose(); this.mat.dispose(); }
}
