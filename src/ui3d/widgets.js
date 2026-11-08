// Shared physical UI for non-battle screens: wooden/brass plaque buttons, parchment panels, card rows,
// a tabletop backdrop world, and a base class wiring raycast hover/click/drag.
import * as THREE from 'three';
import * as S from '../models/sculpt.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { Spring } from '../core/tween.js';
import { textPlane, parchmentBG, UIF, Note } from './kit.js';
import { standee, safeDrawn } from './standee.js';
import { Card3D } from './cards3d.js';
import { audio } from '../core/audio.js';
import { Particles } from '../gfx/particles.js';
import { PROPS } from '../models/world.js';
import { dressTabletop } from '../models/realworld.js';
import * as P3 from '../models/props3d.js';
import { vrange, vpick } from '../core/util.js';

const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };

export class Button3D {
  constructor(label, onClick, { w = 5, h = 1.3, color = 'wood', size = 56, sub = null, disabled = false } = {}) {
    this.onClick = onClick; this.disabled = disabled; const g = (this.group = new THREE.Group());
    const tint = color === 'wood' ? null : color; this.body = standee(safeDrawn('sign', Math.round(w * 34), Math.round(h * 34), Math.round(w * 7 + h * 3), tint), { height: h, anchor: 'center' }); g.add(this.body);
    this.text = textPlane(sub ? [[[label, '#fff6cf']], [[sub, '#e8d4a2']]] : [[[label, '#fff6cf']]], { w: w - 0.2, h: h - 0.1, font: 'Pixelify', size: sub ? size * 0.8 : size, weight: 700, stroke: ['#1a1220', 10], lineH: 1.0 });
    this.text.position.z = 0.2; g.add(this.text);
    this.hit = this.body; this.body.userData.button = this;
    this.s = new Spring(1, 18, 0.35); this.rx = new Spring(0, 12, 0.4); this.ry = new Spring(0, 12, 0.4); this.hover = false; this.base = new THREE.Vector3();
    this.setDisabled(disabled);
  }
  setDisabled(d) { this.disabled = d; this.group.traverse((o) => { if (o.material && o.material.opacity !== undefined) { o.material.transparent = true; o.material.opacity = d ? 0.45 : 1; } }); }
  update(dt, ptr) {
    this.s.target = this.hover && !this.disabled ? 1.08 : 1; this.s.update(dt); this.rx.update(dt); this.ry.update(dt);
    if (this.hover && ptr) { this.rx.target = -(ptr.y - this.group.position.y) * 0.08; this.ry.target = (ptr.x - this.group.position.x) * 0.05; } else { this.rx.target = 0; this.ry.target = 0; }
    this.group.scale.setScalar(this.s.value); this.group.rotation.set(this.rx.value, this.ry.value, 0);
  }
  press() { if (this.disabled) { audio.play('ui_error'); return; } this.s.kick(-6); audio.play('ui_click'); this.onClick?.(); }
}

export class Panel { // parchment sheet with title + body lines
  constructor(title, lines, { w = 12, h = 6, titleColor = '#3a2410', size = 46 } = {}) {
    const g = (this.group = new THREE.Group());
    const all = [[[title, titleColor]], ...lines.map((l) => (typeof l === 'string' ? [[l, '#2a160c']] : l))];
    this.plane = textPlane(all, { w, h, font: 'VT323', size, bg: (c, cw, ch) => parchmentBG(c, cw, ch), lineH: 1.12 }); g.add(this.plane);
    this.s = new Spring(0, 14, 0.5); this.s.target = 1;
  }
  set(title, lines, titleColor = '#3a2410') { this.plane.userData.setText([[[title, titleColor]], ...lines.map((l) => (typeof l === 'string' ? [[l, '#2a160c']] : l))]); }
  update(dt) { this.s.update(dt); this.group.scale.setScalar(Math.max(0.001, this.s.value)); }
}

// warm tabletop world shared by rewards / shop / lab / end screens
export function tabletopWorld(kind = 'study') {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1220); scene.fog = new THREE.Fog(0x1a1220, 14, 34);
  const lamp = new THREE.PointLight(0xffc880, 60, 30, 1.6); lamp.position.set(-3, 7, 4); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); scene.add(lamp);
  scene.add(new THREE.HemisphereLight(0x8a7cff, 0x3a2410, 0.35));
  const rim = new THREE.DirectionalLight(0x8fe3ff, 0.6); rim.position.set(6, 4, -6); scene.add(rim);
  const props = new THREE.Group(); scene.add(props);
  const ready = (window.__game ? dressTabletop(scene, window.__game.engine.renderer, { kind }) : Promise.resolve()).catch((e) => console.warn('tabletop dressing failed', e));
  const parts = new Particles(600, { additive: true }); scene.add(parts.points);
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100); cam.position.set(0, 9.5, 11.5); cam.lookAt(0, 0.5, -1);
  let acc = 0;
  return { scene, camera: cam, props, lamp, parts, ready, update(dt, t) { acc -= dt; if (acc < 0) { acc = 0.15; parts.spawn({ pos: [vrange(-12, 12), vrange(0.5, 5), vrange(-6, 4)], vel: [vrange(-0.1, 0.1), vrange(0.05, 0.2), 0], life: 5, size: vrange(10, 20), color: '#ffe08a', sprite: 'dot', alpha: 0.6, wobble: 0.3 }); } parts.update(dt, t); lamp.intensity = 60 + Math.sin(t * 7) * 2 + Math.sin(t * 13) * 1.5; } };
}

// Base for menu-like screens: buttons, cards, notes in the UI layer; hover/click/drag via raycast.
export class UIScreen {
  constructor(game) { this.game = game; this.engine = game.engine; this.input = game.input; this.buttons = []; this.cards = []; this.root = new THREE.Group(); this.engine.ui.scene.add(this.root); this.tip = new Note({ w: 7.5, h: 2.6, size: 40 }); this.root.add(this.tip.group); this.t = 0; }
  get W() { return this.engine.uiW; } get H() { return this.engine.uiH; }
  addButton(b, x, y, z = 1) { b.group.position.set(x, y, z); this.root.add(b.group); this.buttons.push(b); return b; }
  addCard(card, x, y, { onClick, scale = 1, tip } = {}) { const v = new Card3D(card); v.pos.snap(x, -this.H - 6, 2); v.target = { x, y, z: 2, rz: 0, s: scale }; v.flip.set(1); v.flip.target = 0; v.onClick = onClick; v.tipLines = tip; v.home = { x, y, s: scale }; this.root.add(v.group); this.cards.push(v); return v; }
  ptr(z = 2) { const ndc = this.input.ndc; const cam = this.engine.ui.camera; const v = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize(); return cam.position.clone().addScaledVector(v, (z - cam.position.z) / v.z); }
  ray(objs) { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.engine.ui.camera); return r.intersectObjects(objs, true); }
  pushInput() {
    const S = this;
    this.handler = this.input.push({
      move() {
        const hb = S.ray(S.buttons.map((b) => b.hit))[0]?.object.userData.button; for (const b of S.buttons) { const h = b === hb; if (h && !b.hover) audio.play('ui_hover', { vol: 0.45 }); b.hover = h; }
        const hc = S.pickCard(); for (const c of S.cards) { const h = c === hc; if (h !== c.hover) { c.hover = h; c.target = { ...c.target, s: c.home.s * (h ? 1.15 : 1), z: h ? 4 : 2 }; if (h) { audio.play('ui_hover', { vol: 0.4 }); if (c.tipLines) S.tip.show(c.tipLines, Math.min(S.W - 4, c.home.x + 5.5), c.home.y + 2, 8); } else S.tip.hide(); } }
        S.onMove?.();
      },
      click(e) { const hb = S.ray(S.buttons.map((b) => b.hit))[0]?.object.userData.button; if (hb) { hb.press(); return true; } const hc = S.pickCard(); if (hc?.onClick) { audio.play('card_pick'); hc.onClick(hc); return true; } return S.onClick?.(e); },
      dragstart(e) { return S.onDragStart?.(e); }, drag(e) { S.onDrag?.(e); }, dragend(e) { S.onDragEnd?.(e); }, wheel(e) { S.onWheel?.(e); }, pinch(e) { S.onPinch?.(e); }, key(e) { S.onKey?.(e); }, shake(e) { S.onShake?.(e); },
    });
  }
  pickCard() { const hits = this.ray(this.cards.map((c) => c.mesh)); return hits[0]?.object.userData.card3d || null; }
  updateUI(dt) {
    this.t += dt; const p = this.ptr(1);
    for (const b of this.buttons) b.update(dt, p);
    for (const c of this.cards) { if (c.hover) { c.tilt.x = -(p.y - c.home.y) * 0.05; c.tilt.y = (p.x - c.home.x) * 0.05; } else { c.tilt.x = 0; c.tilt.y = 0; } c.update(dt, this.t); }
    this.tip.update(dt);
  }
  clearCards() { for (const c of this.cards) this.root.remove(c.group); this.cards = []; }
  dispose() { this.input.remove(this.handler); this.engine.ui.scene.remove(this.root); this.engine.remove(this); }
}

export { PROPS, vpick };
