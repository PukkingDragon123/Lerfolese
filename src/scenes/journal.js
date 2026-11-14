// The Discovery Journal: a physical leather book that survives every loop. Click the right page to
// flip forward, the left to flip back. Handwritten notes, sketches, recipes, weaknesses, curios.
import * as THREE from 'three';
import * as S from '../models/sculpt.js';
import { canvasTexture, UIF } from '../ui3d/kit.js';
import { SurfTex, leather as craftLeather, inscribeLines, slab as craftSlab, frontMat, sideMat } from '../ui3d/craft.js';
import { Button3D } from '../ui3d/widgets.js';
import { SPECIALS } from '../game/combos.js';
import { ENEMIES } from '../game/data/enemies.js';
import { ITEMS } from '../game/data/items.js';
import { itemIcon } from '../models/items3d.js';
import { safeDrawn } from '../ui3d/standee.js';
import { renderCardFace } from '../gfx/cardart.js';
import { computeMove } from '../game/combos.js';
import { tweens } from '../core/tween.js';
import { audio } from '../core/audio.js';

const PW = 640, PH = 860, BW = 7.6, BH = 10.2;
const LEARN = {
  prone: 'Gravity knocks him flat. He is not, technically, balanced.', wine: 'His spilled wine burns beautifully. Bring Heat.', drunk: 'Drunk swings sometimes hit his own friends.',
  analyzed: 'A Lens makes it Vulnerable: +50% damage.', reflect: 'A Lens reflects the petrifying gaze. She stuns herself!', evade: 'Nimble. Dodges single hits: use waves, wells, ricochets.',
  crash: 'Charges blindly into solid objects. Place a Boulder. Watch.', rage: 'Every hit makes him angrier. Fewer, bigger hits.', hide: 'Thick hide halves damage while 3+ heads live. Falling attacks pierce it.',
  cauterize: 'Burnt necks do not regrow. Thank you, Iolaus.', regrow: 'Cut off a head and two grow back. Of course they do.',
};
const ENEMY_ORDER = ['satyr', 'medusa', 'kobalos', 'minotaur', 'hydra'];

function paper(g) {
  g.fillStyle = '#efe0bc'; g.fillRect(0, 0, PW, PH);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${130 + Math.random() * 60},${100 + Math.random() * 40},60,${0.04 + Math.random() * 0.05})`; g.fillRect(Math.random() * PW, Math.random() * PH, 2 + Math.random() * 7, 1 + Math.random() * 2); }
  g.strokeStyle = 'rgba(80,110,160,0.18)'; g.lineWidth = 2; for (let y = 120; y < PH - 40; y += 38) { g.beginPath(); g.moveTo(40, y); g.lineTo(PW - 30, y); g.stroke(); }
  g.strokeStyle = 'rgba(190,60,60,0.25)'; g.beginPath(); g.moveTo(78, 0); g.lineTo(78, PH); g.stroke();
  const gr = g.createRadialGradient(PW / 2, PH / 2, 200, PW / 2, PH / 2, 620); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(110,70,20,0.25)'); g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
}
function hand(g, text, x, y, { size = 38, color = '#2a1a4a', font = 'Caveat', rot = 0, weight = 600 } = {}) { g.save(); g.translate(x, y); g.rotate(rot); g.font = `${weight} ${size}px "${font}"`; g.fillStyle = color; g.fillText(text, 0, 0); g.restore(); }
function wrapHand(g, text, x, y, maxW, opts = {}) { const size = opts.size || 34; g.font = `${opts.weight || 500} ${size}px "Caveat"`; const words = text.split(' '); let line = '', yy = y; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { hand(g, line, x, yy, opts); line = w; yy += size * 1.05; } else line = t; } if (line) hand(g, line, x, yy, opts); return yy + size * 1.05; }

export class Journal {
  constructor(game, parent) {
    this.game = game; this.parent = parent; this.isOpen = false; this.spread = 0;
    const g = (this.group = new THREE.Group()); g.position.set(0, -0.4, 12);
    const leather = UIF({ color: 0x5a2a1a, roughness: 0.8 }); const brass = UIF({ color: 0xd9a64a, metalness: 0.85, roughness: 0.3 });
    this.back = new THREE.Mesh(S.slab(BW * 2 + 0.6, BH + 0.5, 0.25, { seed: 3, jitter: 0.005 }), leather); this.back.position.z = -0.3; g.add(this.back);
    for (const s of [-1, 1]) { const blk = new THREE.Mesh(S.slab(BW - 0.1, BH - 0.1, 0.35, { seed: 4 + s, jitter: 0.004 }), UIF({ color: 0xe8d4a2 })); blk.position.set(s * BW / 2, 0, -0.05); g.add(blk); }
    for (const [x, y] of [[-BW, BH / 2], [BW, BH / 2], [-BW, -BH / 2], [BW, -BH / 2]]) { const c = new THREE.Mesh(S.slab(0.7, 0.7, 0.3, { seed: 7 }), brass); c.position.set(x, y, -0.2); g.add(c); }
    this.cvs = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; return c; }); this.tex = this.cvs.map((c) => canvasTexture(c));
    this.pages = this.tex.map((t, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.2, BH - 0.2), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set((i ? 1 : -1) * (BW / 2), 0, 0.14); g.add(m); return m; });
    // the flipping page
    this.flipPivot = new THREE.Group(); this.flipPivot.position.z = 0.16; g.add(this.flipPivot); this.flipCv = document.createElement('canvas'); this.flipCv.width = PW; this.flipCv.height = PH; this.flipTex = canvasTexture(this.flipCv);
    this.flipPage = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.2, BH - 0.2), new THREE.MeshBasicMaterial({ map: this.flipTex, side: THREE.DoubleSide, toneMapped: false })); this.flipPage.position.x = BW / 2; this.flipPivot.add(this.flipPage); this.flipPivot.visible = false;
    // front cover (opens)
    this.coverPivot = new THREE.Group(); this.coverPivot.position.set(0, 0, 0.35); g.add(this.coverPivot);
    const cover = new THREE.Mesh(S.slab(BW + 0.3, BH + 0.5, 0.22, { seed: 9, jitter: 0.005 }), leather); cover.position.x = BW / 2 + 0.15; this.coverPivot.add(cover);
    // gilt-tooled leather label on the cover (title stamped in gold leaf, stitched border)
    const tl = new SurfTex(Math.round((BW - 0.6) * 16), 66); tl.paint((Sf) => { craftLeather(Sf, 0, 0, tl.w, tl.h, { seed: 4, base: 2, stitch: 3 }); inscribeLines(Sf, ['Discovery', 'Journal'], { x: 0, y: 6, w: tl.w, h: 50 }, 'title', 'gild'); inscribeLines(Sf, ['OF SIR ISAAC PLUMB'], { x: 0, y: 53, w: tl.w, h: 9 }, 'tiny', 'gild'); });
    const title = new THREE.Mesh(craftSlab(BW - 0.6, 66 / 16, 0.06, { cut: 0.15, bevel: 0.02 }), [frontMat(tl.tex), sideMat('leather')]); title.castShadow = true; title.position.set(BW / 2 + 0.15, 1.3, 0.14); this.coverPivot.add(title);
    const emb = new THREE.Mesh(S.gem(0.9, 1, 3), brass); emb.position.set(BW / 2 + 0.15, -2.6, 0.2); emb.scale.z = 0.3; this.coverPivot.add(emb);
    this.closeBtn = new Button3D('Close', () => this.close(), { w: 3, h: 1, size: 48, color: 'red' }); this.closeBtn.group.position.set(0, -BH / 2 - 1.1, 0.5); g.add(this.closeBtn.group);
    g.scale.setScalar(0.92);
    this.buildPages();
  }
  buildPages() {
    const j = this.game.journal; const P = [];
    // 0: title
    P.push((g) => { paper(g); hand(g, 'Being the Collected Observations', 110, 150, { size: 44, font: 'HomemadeApple', color: '#3a2410' }); hand(g, 'of Sir Isaac Plumb, F.R.S.', 130, 210, { size: 40, font: 'HomemadeApple', color: '#3a2410' }); hand(g, '(Formerly Really Sentient)', 170, 262, { size: 34, color: '#7a4a14' });
      hand(g, `Loops survived: ${j.loops}`, 110, 380, { size: 46 }); hand(g, `Guardians toppled: ${j.wins}`, 110, 440, { size: 46 }); hand(g, `Combinations found: ${Object.keys(j.combos).length}`, 110, 500, { size: 46 }); hand(g, `Hardest hit: ${j.bestHit || 0}`, 110, 560, { size: 46 });
      wrapHand(g, 'Note: the universe resets whenever I die. This book does not. Neither does my spite.', 110, 660, 440, { size: 36, color: '#5a1a22', rot: -0.02 }); });
    // loop log
    P.push((g) => { paper(g); hand(g, 'Loop Log', 110, 100, { size: 60, font: 'HomemadeApple', color: '#3a2410' }); let y = 170; for (const h of (j.history || []).slice(0, 14)) { hand(g, `#${h.loop}  ${h.won ? 'Topped the Wilds!' : 'Died on floor ' + h.floor}  ·  ${h.kills} kills · best ${h.bestHit}`, 100, y, { size: 32, color: h.won ? '#2d6e6a' : '#2a1a4a' }); y += 46; } if (!j.history?.length) wrapHand(g, 'No loops recorded yet. Go and die interestingly.', 110, 200, 440, { size: 38 }); });
    // combinations: 6 per page
    const combos = Object.entries(j.combos).sort((a, b) => (b[1].special ? 1 : 0) - (a[1].special ? 1 : 0) || b[1].count - a[1].count);
    const undiscovered = SPECIALS.filter((s) => !j.combos[s.key]);
    const entries = [...combos.map(([k, v]) => ({ k, v })), ...undiscovered.map((s) => ({ k: s.key, v: null, s }))];
    for (let i = 0; i < Math.max(1, Math.ceil(entries.length / 6)); i++) {
      const chunk = entries.slice(i * 6, i * 6 + 6);
      P.push((g) => { paper(g); hand(g, i ? 'Combinations (cont.)' : 'Combinations', 100, 90, { size: 54, font: 'HomemadeApple', color: '#3a2410' });
        chunk.forEach((e, n) => { const y = 160 + n * 118;
          if (e.v) { try { const mv = computeMove(e.k.split('+').map((id) => ({ id, up: 0 }))); const face = renderCardFace({ type: 'move', up: 0, name: mv.name }, mv); g.save(); g.translate(96, y - 40); g.rotate(-0.06); g.drawImage(face, 28, 84, 424, 252, 0, 0, 120, 72); g.restore(); } catch (err) { /* */ }
            hand(g, `${e.v.name}${e.v.special ? ' ★' : ''}`, 236, y, { size: 36, color: e.v.special ? '#7a2a6a' : '#2a1a4a' }); hand(g, e.k.split('+').join(' + '), 236, y + 34, { size: 28, color: '#5a3622' }); hand(g, e.v.math?.length ? `${e.v.law ? 'LAW · ' : ''}${e.v.math.slice(-2).join('  ')}` : `×${e.v.count}  best ${e.v.best || 0}`, 236, y + 64, { size: 26, color: '#8a6a44' }); }
          else { hand(g, '???', 120, y + 10, { size: 46, color: '#8a6a44' }); hand(g, e.s?.hidden ? 'A hidden Law of Nature. Still unwritten.' : j.loops >= 2 ? `Hint: ${e.k.split('+').length} ingredients; one is ${e.k.split('+')[0]}.` : 'Undiscovered. Keep experimenting.', 236, y + 10, { size: 30, color: '#8a6a44' }); } });
      });
    }
    // bestiary: one enemy per page with a sketch
    for (const id of ENEMY_ORDER) {
      const d = ENEMIES[id]; const e = j.enemies[id];
      P.push((g) => { paper(g); hand(g, e ? d.name : '??????', 100, 90, { size: 56, font: 'HomemadeApple', color: '#3a2410' });
        if (e) { hand(g, d.title, 110, 140, { size: 32, color: '#7a4a14' }); this.sketch(g, id, 120, 170, 400, 300); hand(g, `Seen ${e.seen} · Defeated ${e.killed}`, 110, 520, { size: 34 });
          let y = 580; const learned = Object.keys(e.learned || {}); if (!learned.length) wrapHand(g, 'Weaknesses: unknown. Experiment on it.', 110, y, 460, { size: 32, color: '#8a6a44' }); for (const k of learned) { y = wrapHand(g, '• ' + (LEARN[k] || k), 110, y, 470, { size: 31, color: '#5a1a22' }); } }
        else wrapHand(g, 'Not yet encountered in any loop.', 110, 200, 440, { size: 38, color: '#8a6a44' }); });
    }
    // curios
    P.push((g) => { paper(g); hand(g, 'Curios', 100, 90, { size: 56, font: 'HomemadeApple', color: '#3a2410' }); let n = 0; for (const id of Object.keys(ITEMS)) { if (ITEMS[id].starter) continue; const found = j.items?.[id]; const x = 90 + (n % 2) * 260, y = 140 + Math.floor(n / 2) * 105; if (found) { try { const d = safeDrawn('item_' + id); g.imageSmoothingEnabled = false; g.drawImage(d ? d.commit() : itemIcon(id, 64), x, y, 80, 80); } catch (err) { /* */ } } hand(g, found ? ITEMS[id].name.slice(0, 20) : '???', x + 86, y + 50, { size: 26, color: found ? '#2a1a4a' : '#8a6a44' }); n++; } });
    if (P.length % 2) P.push((g) => { paper(g); wrapHand(g, 'More pages for the Trojan War, Mount Olympus, and whatever is above that. Bring ink.', 110, 200, 440, { size: 38, color: '#5a3622' }); });
    this.P = P;
  }
  sketch(g, id, x, y, w, h) {
    // sepia field sketch from the actual 3D model via the forge
    import('../gfx/forge.js').then(({ getForge }) => import('../models/creatures.js').then(({ createCreature }) => {
      try { const api = createCreature(id); const pc = getForge(this.game.engine.renderer).paint(api.root, { w: 160, h: 120, fit: 0.85, yaw: 0.5, levels: 5 }); const c = pc.scaled(3); const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height; const t = tmp.getContext('2d'); t.filter = 'sepia(1) contrast(1.2) brightness(0.9)'; t.drawImage(c, 0, 0); g.save(); g.globalAlpha = 0.9; g.translate(x, y); g.rotate(-0.03); g.drawImage(tmp, 0, 0, w, h); g.restore(); g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = 3; g.strokeRect(x - 6, y - 6, w + 12, h + 12); this.tex.forEach((tx) => (tx.needsUpdate = true)); } catch (err) { /* */ }
    }));
  }
  draw(spread) { for (let i = 0; i < 2; i++) { const g = this.cvs[i].getContext('2d'); const f = this.P[spread * 2 + i]; if (f) f(g); else paper(g); this.tex[i].needsUpdate = true; } }
  open() {
    if (this.isOpen) return; this.buildPages(); this.isOpen = true; this.parent.add(this.group); this.spread = 0; this.draw(0);
    this.handler = this.game.input.push(this.inputHandler()); audio.play('book_open'); audio.playMusic('journal');
    this.coverPivot.rotation.y = 0; this.coverPivot.position.z = 0.35; this.group.scale.setScalar(0.3); tweens.to(this.group.scale, { x: 0.92, y: 0.92, z: 0.92 }, 0.45, { ease: 'outBack' });
    tweens.to(this.coverPivot.rotation, { y: -Math.PI * 0.98 }, 0.8, { ease: 'inOutCubic', delay: 0.25 }).then(() => { this.coverPivot.position.z = -0.45; });
  }
  close() { if (!this.isOpen) return; this.isOpen = false; audio.play('book_close'); this.game.input.remove(this.handler); this.coverPivot.position.z = 0.35; tweens.to(this.coverPivot.rotation, { y: 0 }, 0.4).then(() => tweens.to(this.group.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.3, { ease: 'inBack' })).then(() => this.parent.remove(this.group)); }
  async flip(dir) {
    const max = Math.ceil(this.P.length / 2) - 1; const next = this.spread + dir; if (next < 0 || next > max || this.flipping) { audio.play('ui_error', { vol: 0.4 }); return; }
    this.flipping = true; audio.play('page_turn');
    const g = this.flipCv.getContext('2d'); (this.P[dir > 0 ? this.spread * 2 + 1 : this.spread * 2] || paper)(g); this.flipTex.needsUpdate = true;
    this.flipPivot.visible = true; this.flipPivot.rotation.y = dir > 0 ? 0 : -Math.PI; this.flipPage.position.x = dir > 0 ? BW / 2 : BW / 2;
    this.spread = next; this.draw(next);
    await tweens.to(this.flipPivot.rotation, { y: dir > 0 ? -Math.PI : 0 }, 0.5, { ease: 'inOutSine' });
    this.flipPivot.visible = false; this.flipping = false;
  }
  inputHandler() {
    const S = this; const ray = (objs) => { const r = new THREE.Raycaster(); r.setFromCamera(S.game.input.ndc, S.game.engine.ui.camera); return r.intersectObjects(objs, true); };
    return {
      modal: true,
      move() { S.closeBtn.hover = ray([S.closeBtn.hit]).length > 0; return true; },
      click() { if (ray([S.closeBtn.hit]).length) { S.closeBtn.press(); return true; } const h = ray(S.pages)[0]; if (h) S.flip(h.object === S.pages[1] ? 1 : -1); return true; },
      key(e) { if (e.code === 'Escape' || e.code === 'KeyJ') S.close(); if (e.code === 'ArrowRight') S.flip(1); if (e.code === 'ArrowLeft') S.flip(-1); return true; },
      wheel(e) { S.flip(e.dy > 0 ? 1 : -1); return true; }, dragstart() { return true; }, dragend(e) { if (Math.abs(e.vx) > 400) S.flip(e.vx < 0 ? 1 : -1); return true; },
    };
  }
  update(dt, t) { if (!this.isOpen && !this.group.parent) return; this.closeBtn.update(dt, null); this.group.rotation.x = -0.08 + Math.sin(t * 0.8) * 0.01; this.group.rotation.y = Math.sin(t * 0.5) * 0.02; }
}
