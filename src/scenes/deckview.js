// Deck overlay: a fan of physical cards you can browse (wheel to scroll). Pick mode for shop/lab/events.
import * as THREE from 'three';
import { Signboard } from '../ui3d/objects.js';
import { Card3D } from '../ui3d/cards3d.js';
import { Button3D } from '../ui3d/widgets.js';
import { textPlane } from '../ui3d/kit.js';
import { cardTip } from './reward.js';
import { audio } from '../core/audio.js';
import { Spring } from '../core/tween.js';

export class DeckView {
  // pick: { title, filter(card)=>bool, min=1, max=1, onDone(cards) }
  constructor(game, parent, cards, pick = null) {
    this.game = game; this.parent = parent; this.cards = cards; this.pick = pick; this.selected = [];
    this.group = new THREE.Group(); this.group.position.z = 10; this.views = []; this.scroll = new Spring(0, 10, 0.8); this.isOpen = false;
    const E = game.engine; this.W = E.uiW; this.H = E.uiH;
    const dim = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshBasicMaterial({ color: 0x0b0716, transparent: true, opacity: 0.82, depthWrite: false })); dim.position.z = -1; this.group.add(dim); this.dim = dim;
    this.title = new Signboard([pick ? pick.title : `Your Deck (${cards.length} cards)`], { font: 'head', hang: 2, maxW: 24 }); this.title.group.scale.setScalar(Math.min(1.5, this.W * 1.4 / this.title.w)); this.title.group.position.set(0, this.H - 1.3, 1); this.group.add(this.title.group);
    this.btns = [];
    const close = new Button3D(pick ? 'Cancel' : 'Close', () => this.close(true), { w: 3.4, h: 1.1, size: 50, color: 'red' }); close.group.position.set(this.W - 2.6, -this.H + 1.4, 2); this.group.add(close.group); this.btns.push(close);
    if (pick && (pick.max || 1) > 1) { this.confirm = new Button3D('Confirm', () => this.done(), { w: 3.6, h: 1.1, size: 50, color: 'teal', disabled: true }); this.confirm.group.position.set(this.W - 6.6, -this.H + 1.4, 2); this.group.add(this.confirm.group); this.btns.push(this.confirm); }
    const cols = Math.max(4, Math.floor((this.W * 2 - 4) / 3.2)); this.cols = cols;
    cards.forEach((c, i) => {
      const v = new Card3D(c); const r = Math.floor(i / cols), k = i % cols; const x = (k - (cols - 1) / 2) * 3.1, y = this.H - 5.0 - r * 4.2;
      v.home = { x, y }; v.pos.snap(x, y - 12, 1); v.target = { x, y, z: 1, rz: 0, s: 0.72 }; v.ok = !pick || !pick.filter || pick.filter(c);
      if (!v.ok) v.front.color.setScalar(0.35);
      this.group.add(v.group); this.views.push(v);
    });
    this.rows = Math.ceil(cards.length / cols);
    this.tipNote = null;
  }
  open() { this.parent.add(this.group); this.isOpen = true; audio.play('card_fan'); this.handler = this.game.input.push(this.inputHandler()); }
  close(cancel = false) { if (!this.isOpen) return; this.isOpen = false; this.parent.remove(this.group); this.game.input.remove(this.handler); audio.play('ui_back'); if (cancel && this.pick?.onCancel) this.pick.onCancel(); }
  done() { const sel = this.selected.map((v) => v.card); this.close(); this.pick?.onDone?.(sel); }
  ray(objs) { const r = new THREE.Raycaster(); r.setFromCamera(this.game.input.ndc, this.game.engine.ui.camera); return r.intersectObjects(objs, true); }
  inputHandler() {
    const S = this;
    return {
      modal: true,
      move() { const b = S.ray(S.btns.flatMap((x) => [x.hit, x.hitFace]))[0]?.object.userData.button; S.btns.forEach((x) => (x.hover = x === b && !x.disabled)); const v = S.ray(S.views.map((x) => x.mesh))[0]?.object.userData.card3d; for (const x of S.views) { const h = x === v; if (h !== x.hover) { x.hover = h; if (h) audio.play('ui_hover', { vol: 0.35 }); } } return true; },
      click() {
        const b = S.ray(S.btns.flatMap((x) => [x.hit, x.hitFace]))[0]?.object.userData.button; if (b) { b.press(); return true; }
        const v = S.ray(S.views.map((x) => x.mesh))[0]?.object.userData.card3d; if (!v || !S.pick) return true;
        if (!v.ok) { audio.play('ui_error'); return true; }
        const i = S.selected.indexOf(v); if (i >= 0) S.selected.splice(i, 1); else S.selected.push(v); audio.play('card_pick');
        const max = S.pick.max || 1, min = S.pick.min || 1;
        if (max === 1) { S.done(); return true; }
        if (S.selected.length > max) S.selected.shift();
        S.confirm?.setDisabled(S.selected.length < min); return true;
      },
      wheel(e) { S.scroll.target = Math.max(0, Math.min(Math.max(0, S.rows * 4.2 - S.H * 1.4), S.scroll.target + e.dy * 0.01)); return true; },
      key(e) { if (e.code === 'Escape') S.close(true); return true; },
      dragstart() { return true; }, drag() { S.scroll.target = Math.max(0, Math.min(Math.max(0, S.rows * 4.2 - S.H * 1.4), S.scroll.target - S.game.input.vy * 0.0006)); return true; },
    };
  }
  update(dt, t) {
    if (!this.isOpen) return; this.scroll.update(dt);
    for (const v of this.views) { const sel = this.selected.includes(v); v.target = { x: v.home.x, y: v.home.y + this.scroll.value, z: v.hover || sel ? 3 : 1, rz: sel ? 0.05 : 0, s: v.hover ? 0.95 : sel ? 0.82 : 0.72 }; v.tilt.x = sel ? -0.15 : 0; v.update(dt, t); }
    const cam = this.game.engine.ui.camera; const v = new THREE.Vector3(this.game.input.ndc.x, this.game.input.ndc.y, 0.5).unproject(cam).sub(cam.position).normalize(); const p = cam.position.clone().addScaledVector(v, (12 - cam.position.z) / v.z);
    for (const b of this.btns) b.update(dt, p); this.title.update(dt, null, t);
  }
}
export { cardTip };
