// UI kit: canvas helpers (also used inside textures), the paper Note, and the physical card piles.
import * as THREE from 'three';
import { Spring } from '../core/tween.js';
import { Paper } from './objects.js';
import { Surf, SurfTex, RAMP, pxTex, frontMat, sideMat, slab, wood, brass, groove, rivet, inscribe, measure, inkHull, drawPixelText, FONT } from './craft.js';
import { GR } from '../gfx/art/ramps.js';
import { hash2 } from '../gfx/art/core.js';

function mk(g, m, p, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; }
export const UIF = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.6, toneMapped: false, ...o });
// canvas -> texture: mipmapped (trilinear + anisotropic) when minified, NEAREST when magnified, so pixel art and pixel
// text drawn in whole blocks never go soft on a zoomed card or page
export function canvasTexture(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.NearestFilter; return t; }

// text -> plane mesh (world units: w x h). Pixel fonts only: `font`/`size` pick the role font (Alagard for display
// faces, NanoPlus for numbers, RuneMono for runes, PixelSans for everything else) at the nearest whole multiple of its
// native size, drawn as crisp blocks on a canvas of ~2x the on-screen pixels.
const ROLE = (font, size) => /alagard/i.test(font) ? (size >= 40 ? 'cap' : size >= 24 ? 'title' : 'head') : /nano|num/i.test(font) ? 'num' : /rune/i.test(font) ? 'rune' : 'body';
export function textPlane(lines, { w = 4, h = 1, font = 'PixelSans', size = 48, color = '#2a160c', bg = null, align = 'center', stroke = null, pad = 10, lineH = 1.15, basic = true } = {}) {
  const px = 128; const cw = Math.max(16, Math.round(w * px)), ch = Math.max(16, Math.round(h * px));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'); const f = ROLE(font, size); const F = FONT[f];
  const nat = F.cap / (F.scale || 1); const k = F.font === 'Alagard' ? 1 : Math.max(1, Math.round((size * 0.62) / nat));
  const draw = (ls) => {
    g.clearRect(0, 0, cw, ch); if (bg) bg(g, cw, ch);
    const arr = Array.isArray(ls) ? ls : [ls]; const LH = Math.round(F.lineH / (F.scale || 1) * k * lineH); let y = Math.round(ch / 2 - (arr.length * LH) / 2 + LH / 2 + (nat * k) / 2);
    for (const l of arr) {
      const segs = typeof l === 'string' ? [[l, color]] : l; const ws = segs.map(([t]) => measure(t, f) / (F.scale || 1) * k); const wsum = ws.reduce((a, b) => a + b, 0);
      let x = align === 'center' ? cw / 2 - wsum / 2 : align === 'left' ? pad : cw - pad - wsum;
      segs.forEach(([t, col], i) => { drawPixelText(g, t, x, y, f, { color: col || color, outline: stroke ? stroke[0] : null, k }); x += ws[i]; });
      y += LH;
    }
  };
  draw(lines);
  const tex = canvasTexture(c);
  const mat = basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }) : UIF({ map: tex, transparent: true });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.setText = (ls) => { draw(ls); tex.needsUpdate = true; };
  return m;
}

// parchment backgrounds
export function parchmentBG(g, w, h, { torn = true, tint = '#f3e6c4', edge = '#b8935a' } = {}) {
  g.fillStyle = edge; g.beginPath(); const r = 14; g.roundRect ? g.roundRect(2, 2, w - 4, h - 4, r) : g.rect(2, 2, w - 4, h - 4); g.fill();
  g.fillStyle = tint; g.beginPath(); g.roundRect ? g.roundRect(7, 7, w - 14, h - 14, r - 4) : g.rect(7, 7, w - 14, h - 14); g.fill();
  for (let i = 0; i < (w * h) / 400; i++) { g.fillStyle = `rgba(${120 + Math.random() * 60},${90 + Math.random() * 40},50,${0.05 + Math.random() * 0.06})`; g.fillRect(8 + Math.random() * (w - 16), 8 + Math.random() * (h - 16), 2 + Math.random() * 6, 1 + Math.random() * 2); }
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(120,70,20,0.28)'); g.fillStyle = gr; g.fillRect(7, 7, w - 14, h - 14);
}

// physical paper note (Note API: show(lines, x, y, z) / hide() / update(dt)) -> a pinned parchment scrap
export class Note {
  constructor({ w = 5, tail = false } = {}) { this.paper = new Paper({ font: 'hand', maxW: Math.max(6, w * 1.3), tail: tail ? true : false, pin: !tail, kind: tail ? 'scrap' : 'note' }); this.group = this.paper.group; }
  show(lines, x, y, z = 6) { this.paper.show(lines, x, y, z); }
  hide() { this.paper.hide(); }
  update(dt) { this.paper.update(dt, null); }
}

// draw / discard pile: stacked card backs in a felt-lined walnut tray, with an engraved brass counter plate
const trayTex = (() => { let t = null; return () => { if (t) return t; const S = new Surf(44, 58); wood(S, 0, 0, 44, 58, RAMP.walnut, { seed: 12, base: 2, knots: 1 }); S.bevel(null, { lit: 2, dark: -2 });
  for (let y = 5; y < 53; y++) for (let x = 5; x < 39; x++) S.set(x, y, GR.clothTeal, (y === 5 || x === 5) ? 0 : (hash2(x, y, 4) > 0.82 ? 2 : 1)); groove(S, 0, 0, 44, 58, 3, { cut: 2, deep: 0, lip: 4 });
  for (const [x, y] of [[1, 1], [40, 1], [1, 54], [40, 54]]) rivet(S, x, y); t = pxTex(S.toCanvas()); return t; }; })();
export class Pile {
  constructor(label, backTex) {
    const g = (this.group = new THREE.Group()); this.cards = []; this.label = label === 'USED' ? 'DISCARD' : label;
    this.tray = inkHull(mk(slab(2.75, 3.6, 0.3, { cut: 0.16, bevel: 0.08 }), [frontMat(trayTex()), sideMat('walnut')], g, 0, 0.05, -0.32), 0.045);
    const mat = [UIF({ color: 0xe8d4a2 }), UIF({ color: 0xe8d4a2 }), UIF({ color: 0xe8d4a2 }), UIF({ color: 0xe8d4a2 }), UIF({ map: backTex, roughness: 0.5, transparent: true, alphaTest: 0.5 }), UIF({ color: 0x3e2b6b })];
    for (let i = 0; i < 6; i++) { const c = mk(new THREE.BoxGeometry(2.0, 2.8, 0.04), mat, g, (Math.random() - 0.5) * 0.1, 0.12 + (Math.random() - 0.5) * 0.1, i * 0.05); c.rotation.z = (Math.random() - 0.5) * 0.12; this.cards.push(c); }
    this.plate = new SurfTex(40, 11); this.plateMesh = mk(slab(40 / 16, 11 / 16, 0.07, { shape: 'notch', bevel: 0.02 }), [frontMat(this.plate.tex, { metal: 0.3 }), sideMat('brass')], g, 0, -1.72, 0.25); inkHull(this.plateMesh, 0.025);
    this.n = -1; this.bump = new Spring(0, 20, 0.3);
    this.hit = mk(new THREE.BoxGeometry(2.4, 3.2, 1), new THREE.MeshBasicMaterial({ visible: false }), g); this.hit.castShadow = false;
  }
  set(n) {
    if (n === this.n) return; this.bump.kick(6); this.n = n; this.cards.forEach((c, i) => (c.visible = i < Math.min(6, Math.ceil(n / 3) + (n > 0 ? 1 : 0))));
    this.plate.paint((S) => { brass(S, 0, 0, 40, 11, { seed: 3, patina: 0.3 }); S.bevel(null, { lit: 2, dark: -2 }); const t = String(n); const lw = measure(this.label, 'tiny'); inscribe(S, this.label, 6, 8, 'tiny', 'enamel', { fill: RAMP.night }); inscribe(S, t, Math.max(lw + 9, 35 - measure(t, 'tiny')), 8, 'tiny', 'enamel', { fill: RAMP.night }); });
  }
  update(dt) { this.bump.update(dt); this.group.scale.setScalar((this.k ?? 1) * (1 + this.bump.value * 0.02)); }
}

// gold pouch and damage numbers are physical objects now (stitched leather pouch, painted wooden chips)
export { Pouch, NumberChips as Numbers } from './hudparts.js';
