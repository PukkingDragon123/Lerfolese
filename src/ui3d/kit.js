// UI kit: canvas-text planes, parchment notes, physical widgets (gauge, bell, bin, pouch, piles), numbers.
import * as THREE from 'three';
import * as S from '../models/sculpt.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { Spring } from '../core/tween.js';
import { sprite } from '../gfx/sprites.js';

export const UIF = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, toneMapped: false, ...o });
export function canvasTexture(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }

// text drawn on a canvas -> plane mesh (world units: height h)
export function textPlane(lines, { w = 4, h = 1, font = 'VT323', size = 48, color = '#2a160c', bg = null, align = 'center', weight = 400, stroke = null, pad = 10, lineH = 1.05, basic = true } = {}) {
  const px = 128; const cw = Math.max(16, Math.round(w * px)), ch = Math.max(16, Math.round(h * px));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  const draw = (ls) => {
    g.clearRect(0, 0, cw, ch);
    if (bg) bg(g, cw, ch);
    const arr = Array.isArray(ls) ? ls : [ls]; g.font = `${weight} ${size}px "${font}"`; g.textAlign = align; g.textBaseline = 'middle';
    const total = arr.length * size * lineH; let y = ch / 2 - total / 2 + (size * lineH) / 2;
    for (const l of arr) {
      const segs = typeof l === 'string' ? [[l, color]] : l; let x = align === 'center' ? cw / 2 : align === 'left' ? pad : cw - pad;
      if (align === 'center' && segs.length > 1) { const wsum = segs.reduce((s, [t]) => s + g.measureText(t).width, 0); x = cw / 2 - wsum / 2; g.textAlign = 'left'; }
      for (const [t, col] of segs) { if (stroke) { g.lineWidth = stroke[1]; g.strokeStyle = stroke[0]; g.lineJoin = 'round'; g.strokeText(t, x, y); } g.fillStyle = col; g.fillText(t, x, y); if (segs.length > 1) x += g.measureText(t).width; }
      g.textAlign = align; y += size * lineH;
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

// physical paper note that can be pinned anywhere (tooltips, barks, tags)
export class Note {
  constructor({ w = 5, h = 2, font = 'VT323', size = 40, tail = false } = {}) {
    this.group = new THREE.Group(); this.w = w; this.h = h; this.font = font; this.size = size; this.tail = tail;
    this.plane = textPlane([''], { w, h, font, size, bg: (g, cw, ch) => this._bg(g, cw, ch) });
    this.group.add(this.plane); this.group.visible = false; this.s = new Spring(0, 18, 0.45); this.rot = new Spring(0, 10, 0.3);
  }
  _bg(g, cw, ch) { parchmentBG(g, cw, ch); if (this.tail) { g.fillStyle = '#f3e6c4'; g.beginPath(); g.moveTo(cw * 0.18, ch - 8); g.lineTo(cw * 0.12, ch); g.lineTo(cw * 0.3, ch - 8); g.fill(); } }
  show(lines, x, y, z = 6) { this.plane.userData.setText(lines); this.group.position.set(x, y, z); if (!this.group.visible) { this.s.value = 0.2; this.rot.value = (Math.random() - 0.5) * 0.5; } this.s.target = 1; this.rot.target = (Math.random() - 0.5) * 0.06; this.group.visible = true; this.hideAt = null; }
  hide() { this.s.target = 0; this.hideAt = 0.15; }
  update(dt) { this.s.update(dt); this.rot.update(dt); this.group.scale.setScalar(Math.max(0.001, this.s.value)); this.group.rotation.z = this.rot.value; if (this.hideAt != null) { this.hideAt -= dt; if (this.hideAt <= 0) { this.group.visible = false; this.hideAt = null; } } }
}

// ---------------- widgets ----------------
const brassM = () => UIF({ color: 0xd9a64a, metalness: 0.85, roughness: 0.3 });
const woodM = () => UIF({ map: TEX.wood('uiwood', R.wood, { seed: 31 }), roughness: 0.6 });
function mk(g, m, p, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; }

export class Gauge { // brass pressure gauge for Integrity (HP) + wooden block shield
  constructor() {
    const g = (this.group = new THREE.Group());
    mk(S.turn([[0.001, -0.25], [1.25, -0.25], [1.38, -0.05], [1.32, 0.18], [1.18, 0.25], [0.001, 0.25]], { sides: 12, amt: 0.01, seed: 3 }), brassM(), g).rotation.x = Math.PI / 2;
    const face = document.createElement('canvas'); face.width = face.height = 256; this.faceC = face; this.faceT = canvasTexture(face);
    this.face = mk(new THREE.CircleGeometry(1.12, 24), UIF({ map: this.faceT, roughness: 0.4 }), g, 0, 0, 0.27);
    this.needle = new THREE.Group(); this.needle.position.z = 0.3; g.add(this.needle);
    mk(S.slab(0.08, 0.95, 0.03, { seed: 4, taper: 0.8 }), UIF({ color: 0xc8443a, roughness: 0.4 }), this.needle, 0, 0.42, 0);
    mk(S.gem(0.1, 0, 5), brassM(), this.needle, 0, 0, 0.02);
    mk(new THREE.CircleGeometry(1.14, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2, toneMapped: false }), g, 0, 0, 0.36);
    this.label = textPlane(['64/64'], { w: 2.2, h: 0.8, font: 'Pixelify', size: 64, weight: 700, color: '#fff6cf', stroke: ['#1a1220', 10] }); this.label.position.set(0, -1.75, 0.3); g.add(this.label);
    this.tag = textPlane(['INTEGRITY'], { w: 2.4, h: 0.45, font: 'Silkscreen', size: 34, weight: 700, color: '#f3e6c4', stroke: ['#1a1220', 8] }); this.tag.position.set(0, 1.62, 0.3); g.add(this.tag);
    // block shield
    this.shield = new THREE.Group(); this.shield.position.set(1.55, 0.75, 0.6); g.add(this.shield);
    mk(S.turn([[0.001, -0.6], [0.45, -0.35], [0.6, 0.2], [0.55, 0.55], [0.001, 0.6]], { sides: 7, seed: 9, amt: 0.04 }), woodM(), this.shield).scale.set(1, 1, 0.25);
    mk(S.facet(new THREE.TorusGeometry(0.55, 0.06, 3, 9)), brassM(), this.shield, 0, 0, 0.1);
    this.blockLabel = textPlane(['0'], { w: 1.2, h: 0.8, font: 'Pixelify', size: 80, weight: 700, color: '#fff6cf', stroke: ['#1a1220', 12] }); this.blockLabel.position.z = 0.25; this.shield.add(this.blockLabel);
    this.shieldS = new Spring(0, 16, 0.4); this.needleS = new Spring(1, 6, 0.35); this.shake = new Spring(0, 30, 0.2);
    this.hp = -1; this.max = 1; this.block = 0; this.drawFace();
  }
  drawFace() {
    const g = this.faceC.getContext('2d'); const W = 256; g.fillStyle = '#f3e6c4'; g.fillRect(0, 0, W, W);
    const cx = W / 2; for (let i = 0; i <= 20; i++) { const a = -Math.PI * 0.75 + (i / 20) * Math.PI * 1.5; const r1 = i % 5 ? 96 : 86; g.strokeStyle = i < 5 ? '#c8443a' : '#2a160c'; g.lineWidth = i % 5 ? 3 : 6; g.beginPath(); g.moveTo(cx + Math.sin(a) * r1, cx - Math.cos(a) * r1); g.lineTo(cx + Math.sin(a) * 108, cx - Math.cos(a) * 108); g.stroke(); }
    g.strokeStyle = '#c8443a'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cx, 114, -Math.PI * 0.75 - Math.PI / 2, -Math.PI * 0.75 - Math.PI / 2 + Math.PI * 0.375); g.stroke();
    g.fillStyle = '#5a3622'; g.font = '700 26px "Silkscreen"'; g.textAlign = 'center'; g.fillText('PLUMB & CO.', cx, cx + 50); g.font = '400 30px "VT323"'; g.fillText('wood · varnish · spite', cx, cx + 78);
    this.faceT.needsUpdate = true;
  }
  set(hp, max, block) {
    if (hp !== this.hp || max !== this.max) { if (hp < this.hp) this.shake.kick(12); this.hp = hp; this.max = max; this.label.userData.setText([`${hp}/${max}`]); this.needleS.target = Math.max(0, hp / max); }
    if (block !== this.block) { if (block > this.block) this.shieldS.kick(8); this.block = block; this.blockLabel.userData.setText([String(block)]); }
    this.shieldS.target = block > 0 ? 1 : 0;
  }
  update(dt) {
    this.needleS.update(dt); this.shieldS.update(dt); this.shake.update(dt);
    this.needle.rotation.z = Math.PI * 0.75 - this.needleS.value * Math.PI * 1.5 + Math.sin(performance.now() * 0.02) * 0.01;
    this.group.rotation.z = this.shake.value * 0.02; const s = Math.max(0.001, this.shieldS.value); this.shield.scale.setScalar(s); this.shield.visible = s > 0.01;
  }
}

export class Bell { // brass desk bell: End Turn
  constructor() {
    const g = (this.group = new THREE.Group());
    mk(S.slab(2.2, 0.35, 1.4, { seed: 11, taper: 0.1 }), woodM(), g, 0, -0.5, 0);
    this.dome = new THREE.Group(); g.add(this.dome);
    mk(S.turn([[0.001, 0.9], [0.25, 0.86], [0.55, 0.65], [0.78, 0.3], [0.92, 0.0], [0.95, -0.1], [0.001, -0.1]], { sides: 11, seed: 12, amt: 0.015 }), UIF({ color: 0xe6b450, metalness: 0.9, roughness: 0.22 }), this.dome, 0, -0.25, 0);
    this.btn = mk(S.limb(0.25, 0.07, 0.06, { sides: 6, seed: 13 }), brassM(), this.dome, 0, 0.88, 0); this.btn.rotation.x = Math.PI;
    this.tag = textPlane(['END TURN'], { w: 2.4, h: 0.55, font: 'Pixelify', size: 46, weight: 700, color: '#fff6cf', stroke: ['#1a1220', 10] }); this.tag.position.set(0, -1.15, 0.8); g.add(this.tag);
    this.press = new Spring(0, 30, 0.25); this.wob = new Spring(0, 12, 0.15); this.hover = false; this.enabled = true;
    this.hit = mk(new THREE.BoxGeometry(2.4, 2.4, 1.6), new THREE.MeshBasicMaterial({ visible: false }), g, 0, 0.1, 0); this.hit.castShadow = false;
  }
  ring() { this.press.kick(-14); this.wob.kick(10); }
  update(dt) { this.press.update(dt); this.wob.update(dt); this.dome.position.y = Math.min(0, this.press.value * 0.05); this.dome.rotation.z = this.wob.value * 0.03 + (this.hover ? Math.sin(performance.now() * 0.012) * 0.03 : 0); this.dome.scale.y = 1 + Math.min(0, this.press.value) * 0.01; this.group.scale.setScalar(this.enabled ? 1 : 0.92); }
}

export class Bin { // wicker basket of crumpled ideas: Second Thoughts
  constructor() {
    const g = (this.group = new THREE.Group());
    const weave = UIF({ map: TEX.blocks('wicker', ['#4a2a12', '#7a4a22', '#a87040', '#c89058', '#e0b070'], { bw: 6, bh: 4, mortar: 0.2 }), roughness: 0.9, side: THREE.DoubleSide });
    mk(S.turn([[0.001, -0.8], [0.8, -0.8], [1.0, 0.0], [1.15, 0.7], [1.08, 0.75], [0.001, 0.6]], { sides: 9, seed: 21, amt: 0.03 }), weave, g);
    for (let i = 0; i < 4; i++) mk(S.blob(0.28, 0.24, 0.26, { detail: 1, seed: 22 + i, amt: 0.35 }), UIF({ color: 0xf3e6c4, roughness: 1 }), g, -0.4 + i * 0.27, 0.62 + (i % 2) * 0.12, (i % 2) * 0.2);
    this.tokens = [];
    for (let i = 0; i < 4; i++) { const t = mk(S.facet(new THREE.CylinderGeometry(0.28, 0.28, 0.09, 9)), brassM(), g, 1.6, -0.6 + i * 0.12, 0.3); t.rotation.x = Math.PI / 2; this.tokens.push(t); }
    this.tag = textPlane(['SECOND', 'THOUGHTS'], { w: 2.6, h: 0.9, font: 'Pixelify', size: 40, weight: 700, color: '#fff6cf', stroke: ['#1a1220', 9], lineH: 1.0 }); this.tag.position.set(0.3, -1.4, 0.9); g.add(this.tag);
    this.hit = mk(new THREE.BoxGeometry(2.8, 2.4, 1.6), new THREE.MeshBasicMaterial({ visible: false }), g, 0.3, 0, 0); this.hit.castShadow = false;
    this.glow = new Spring(0, 12, 0.5); this.jig = new Spring(0, 18, 0.2); this.count = 3;
  }
  set(n) { if (n < this.count) this.jig.kick(10); this.count = n; this.tokens.forEach((t, i) => (t.visible = i < n)); }
  update(dt) { this.glow.update(dt); this.jig.update(dt); this.group.rotation.z = this.jig.value * 0.03; const s = 1 + this.glow.value * 0.08; this.group.scale.setScalar(s); }
}

export class Pile { // draw / discard pile: stacked card backs + count
  constructor(label, backTex) {
    const g = (this.group = new THREE.Group()); this.cards = [];
    const mat = [UIF({ color: 0xe8d4a2 }), UIF({ color: 0xe8d4a2 }), UIF({ color: 0xe8d4a2 }), UIF({ color: 0xe8d4a2 }), UIF({ map: backTex, roughness: 0.5, transparent: true, alphaTest: 0.5 }), UIF({ color: 0x3e2b6b })];
    for (let i = 0; i < 6; i++) { const c = mk(new THREE.BoxGeometry(2.0, 2.8, 0.04), mat, g, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, i * 0.05); c.rotation.z = (Math.random() - 0.5) * 0.12; this.cards.push(c); }
    this.count = textPlane(['0'], { w: 1.4, h: 0.8, font: 'Pixelify', size: 70, weight: 700, color: '#fff6cf', stroke: ['#1a1220', 12] }); this.count.position.set(0.85, -1.25, 0.6); g.add(this.count);
    this.tag = textPlane([label], { w: 2.4, h: 0.45, font: 'Silkscreen', size: 34, weight: 700, color: '#f3e6c4', stroke: ['#1a1220', 8] }); this.tag.position.set(0, 1.75, 0.5); g.add(this.tag);
    this.n = -1; this.bump = new Spring(0, 20, 0.3);
    this.hit = mk(new THREE.BoxGeometry(2.4, 3.2, 1), new THREE.MeshBasicMaterial({ visible: false }), g); this.hit.castShadow = false;
  }
  set(n) { if (n !== this.n) { this.bump.kick(6); this.n = n; this.count.userData.setText([String(n)]); this.cards.forEach((c, i) => (c.visible = i < Math.min(6, Math.ceil(n / 3) + (n > 0 ? 1 : 0)))); } }
  update(dt) { this.bump.update(dt); this.group.scale.setScalar(1 + this.bump.value * 0.02); }
}

export class Pouch { // leather coin pouch: gold. Shake it!
  constructor() {
    const g = (this.group = new THREE.Group());
    mk(S.blob(0.75, 0.68, 0.6, { detail: 1, seed: 31, amt: 0.18 }), UIF({ color: 0x8a5634, roughness: 0.85 }), g);
    mk(S.limb(0.4, 0.3, 0.42, { sides: 7, seed: 32 }), UIF({ color: 0x8a5634, roughness: 0.85 }), g, 0, 0.95, 0);
    mk(S.facet(new THREE.TorusGeometry(0.32, 0.06, 3, 9)), UIF({ color: 0x3a2410 }), g, 0, 0.62, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const c = mk(S.facet(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8)), UIF({ color: 0xffd76a, metalness: 0.9, roughness: 0.25 }), g, -0.3 + i * 0.3, 0.85 + (i % 2) * 0.1, 0.25); c.rotation.x = 1.2; }
    this.label = textPlane(['99'], { w: 1.8, h: 0.8, font: 'Pixelify', size: 70, weight: 700, color: '#ffe08a', stroke: ['#1a1220', 12] }); this.label.position.set(1.35, 0, 0.6); g.add(this.label);
    this.hit = mk(new THREE.BoxGeometry(2.0, 2.2, 1.2), new THREE.MeshBasicMaterial({ visible: false }), g, 0.3, 0.2, 0); this.hit.castShadow = false;
    this.jig = new Spring(0, 22, 0.15); this.gold = -1;
  }
  set(n) { if (n !== this.gold) { if (this.gold >= 0) this.jig.kick(8); this.gold = n; this.label.userData.setText([String(n)]); } }
  update(dt) { this.jig.update(dt); this.group.rotation.z = this.jig.value * 0.05; }
}

// floating damage/heal numbers with a little physics bounce
export class Numbers {
  constructor(scene) { this.scene = scene; this.list = []; }
  spawn(text, x, y, { color = '#fff6cf', stroke = '#5a1a22', size = 1.4, vx = (Math.random() - 0.5) * 4, vy = 7, life = 1.4, floor = null } = {}) {
    const m = textPlane([String(text)], { w: size * 2.2, h: size, font: 'Pixelify', size: 110, weight: 700, color, stroke: [stroke, 18] });
    m.position.set(x, y, 8); this.scene.add(m);
    this.list.push({ m, vx, vy, life, max: life, floor: floor ?? y - 1.2, rot: (Math.random() - 0.5) * 2 });
  }
  update(dt) {
    for (const n of this.list) {
      n.life -= dt; n.vy -= 22 * dt; n.m.position.x += n.vx * dt; n.m.position.y += n.vy * dt; n.m.rotation.z += n.rot * dt * (n.vy > 0 ? 1 : 0.3);
      if (n.m.position.y < n.floor) { n.m.position.y = n.floor; n.vy = Math.abs(n.vy) * 0.38; n.vx *= 0.6; n.rot *= 0.5; }
      const k = n.max - n.life; const s = k < 0.12 ? 0.4 + k * 6 : 1; n.m.scale.setScalar(s);
      n.m.material.opacity = Math.min(1, n.life * 3);
    }
    this.list = this.list.filter((n) => { if (n.life <= 0) { this.scene.remove(n.m); n.m.material.map.dispose(); n.m.material.dispose(); n.m.geometry.dispose(); return false; } return true; });
  }
}

// intent tag (above an enemy) and HP plaque (below)
const ICONS = {};
function iconCanvas(name) { if (!ICONS[name]) { const pc = sprite(name); ICONS[name] = pc.scaled(8); } return ICONS[name]; }
export class EnemyHUD {
  constructor(name) {
    const g = (this.group = new THREE.Group());
    this.intent = textPlane([''], { w: 3.6, h: 1.3, font: 'Pixelify', size: 64, weight: 700, color: '#fff6cf', stroke: ['#1a1220', 12], bg: null });
    this.intentIcon = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
    this.intentG = new THREE.Group(); this.intentG.visible = false; this.intentG.add(this.intentIcon, this.intent); this.intentIcon.position.x = -0.9; this.intent.position.x = 0.75; g.add(this.intentG);
    this.hpc = document.createElement('canvas'); this.hpc.width = 512; this.hpc.height = 112; this.hpt = canvasTexture(this.hpc);
    this.hp = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.74), new THREE.MeshBasicMaterial({ map: this.hpt, transparent: true, toneMapped: false, depthWrite: false })); g.add(this.hp);
    this.name = name; this.bob = Math.random() * 6; this.shown = new Spring(0, 12, 0.5); this.intentKey = '';
  }
  setHP(hp, max, block, st) {
    const g = this.hpc.getContext('2d'); const W = 512, H = 112; g.clearRect(0, 0, W, H);
    g.fillStyle = '#1a1220'; g.beginPath(); g.roundRect(4, 34, W - 8, 46, 12); g.fill();
    g.fillStyle = '#3a0f18'; g.beginPath(); g.roundRect(12, 42, W - 24, 30, 8); g.fill();
    const f = Math.max(0, hp / max); const gr = g.createLinearGradient(0, 42, 0, 72); gr.addColorStop(0, '#e8705a'); gr.addColorStop(0.5, '#c8443a'); gr.addColorStop(1, '#8f2a2e');
    g.fillStyle = gr; g.beginPath(); g.roundRect(12, 42, (W - 24) * f, 30, 8); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(16, 45, (W - 32) * f, 5);
    g.strokeStyle = '#d9a64a'; g.lineWidth = 4; g.beginPath(); g.roundRect(6, 36, W - 12, 42, 12); g.stroke();
    g.font = '700 30px "Pixelify"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#1a1220'; g.strokeText(`${Math.max(0, hp)}/${max}`, W / 2, 58); g.fillStyle = '#fff6cf'; g.fillText(`${Math.max(0, hp)}/${max}`, W / 2, 58);
    g.font = '700 24px "Silkscreen"'; g.textAlign = 'left'; g.strokeText(this.name.toUpperCase(), 10, 16); g.fillStyle = '#f3e6c4'; g.fillText(this.name.toUpperCase(), 10, 16);
    if (block > 0) { g.fillStyle = '#3f7fa8'; g.beginPath(); g.arc(W - 30, 57, 26, 0, 7); g.fill(); g.strokeStyle = '#d9a64a'; g.lineWidth = 4; g.stroke(); g.font = '700 26px "Pixelify"'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(String(block), W - 30, 58); }
    // statuses
    const keys = Object.keys(st || {}).filter((k) => st[k]); let x = 12; g.font = '700 22px "Silkscreen"'; g.textAlign = 'left';
    const col = { burn: '#f08a2a', wet: '#3f9ac8', venom: '#7cb460', weak: '#9b7cc8', vulnerable: '#e8705a', strength: '#c8443a', stun: '#f2c14e', prone: '#f2c14e', evade: '#8fd3c0', blind: '#cdb6f0', dizzy: '#f6b3a0' };
    for (const k of keys) { const t = `${k.slice(0, 4).toUpperCase()} ${st[k]}`; const w = g.measureText(t).width + 14; g.fillStyle = col[k] || '#b8935a'; g.beginPath(); g.roundRect(x, 84, w, 26, 6); g.fill(); g.fillStyle = '#1a1220'; g.fillText(t, x + 7, 98); x += w + 6; }
    this.hpt.needsUpdate = true;
  }
  setIntent(it, value, hits) {
    const key = it ? `${it.icon}:${value}:${hits}:${it.label}` : ''; if (key === this.intentKey) return; this.intentKey = key;
    if (!it) { this.intentG.visible = false; return; } this.intentG.visible = true;
    const ic = iconCanvas(it.icon || 'question'); if (!this.intentIcon.material.map || this.intentIcon.material.map.image !== ic) { this.intentIcon.material.map = canvasTexture(ic); this.intentIcon.material.map.magFilter = THREE.NearestFilter; this.intentIcon.material.needsUpdate = true; }
    const txt = value != null ? `${value}${hits > 1 ? 'x' + hits : ''}` : ''; this.intent.userData.setText([txt]); this.label = it.label;
  }
  update(dt, x, y, yTop) { this.bob += dt; this.hp.position.set(x, y, 5); this.intentG.position.set(x, yTop + Math.sin(this.bob * 2.4) * 0.12, 5); }
}
