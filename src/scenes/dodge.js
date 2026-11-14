// The dodge QTE: when a foe's blow is about to land, a turned brass dial ring sits around Newton and an oak ring
// closes in on it. Click (or Space) as the rings meet: PERFECT (no damage, he sidesteps in mid-air), GOOD (half),
// or miss (full). Real-time (performance.now), so a slow renderer never steals the window. The window's size is
// Newton's Dodge stat (Talaria widen it; Lead Boots disable it) and the 'dodge' setting ('on' | 'easy' | 'off').
import * as THREE from 'three';
import { mesh, turned, plainMat, uiPos } from '../ui3d/craft.js';
import { Strip } from '../ui3d/objects.js';
import { audio } from '../core/audio.js';
import { save } from '../core/save.js';

const ring = (r, w, kind, parent) => { const prof = []; for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; prof.push([r + Math.cos(a) * w, Math.sin(a) * w * 1.4]); } const m = mesh(turned(prof, 72, { smooth: false }), plainMat(kind), parent, { ink: 0.03 }); m.rotation.x = Math.PI / 2; return m; };
// the dial's engraved ticks: small turned brass studs around the target ring
const stud = () => turned([[0.0001, -0.06], [0.07, -0.06], [0.09, 0], [0.07, 0.06], [0.0001, 0.07]], 28);

/** the player's chosen dodge mode: 'on' (default), 'easy' (a wider window), 'off' (no QTE: blows land in full) */
export function dodgeMode() {
  const q = new URLSearchParams(location.search).get('dodge'); if (q) return q;
  return save.settings?.dodge || 'on';
}

export class DodgeQTE {
  constructor(S) { this.S = S; this.g = null; }
  get on() { return dodgeMode() !== 'off'; }
  /** run one window; lead = seconds until the rings meet. Resolves 'perfect' | 'good' | 'miss'. */
  run(e, { lead = 0.75, scale = 1 } = {}) {
    const S = this.S, E = S.engine; const k = scale * (dodgeMode() === 'easy' ? 1.7 : 1);
    const perfect = 0.07 * k, good = 0.17 * k;
    return new Promise((resolve) => {
      const g = new THREE.Group(); g.name = 'dodge'; S.ui.root.add(g); this.g = g;
      const dial = new THREE.Group(); g.add(dial); const target = ring(1.25, 0.09, 'brass', dial);
      const sg = stud(); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const st = mesh(sg, plainMat(i % 3 ? 'brass' : 'gold'), dial); st.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.1); st.rotation.x = Math.PI / 2; void target; }
      const closer = new THREE.Group(); g.add(closer); ring(1.25, 0.07, 'oak', closer);
      const label = new Strip([[['DODGE! ', '#8a1a1c'], ['click or Space', '#2a160c']]], { maxW: 10 }); g.add(label.group); label.group.position.set(0, -1.9, 0.2);
      const t0 = performance.now(); let done = false, pressedAt = null; this.t0 = t0; this.lead = lead;
      const now = () => { const t = (performance.now() - t0) / 1000; return window.__qteFreeze != null ? Math.min(t, window.__qteFreeze) : t; }; // (debug: freeze the dial for a capture)
      const finish = (res) => {
        if (done) return; done = true; S.input.remove(handler); E.remove(upd);
        audio.play(res === 'perfect' ? 'magic_sparkle' : res === 'good' ? 'whoosh_soft' : 'ui_error', { vol: 0.7 });
        label.set([[[res === 'perfect' ? 'PERFECT DODGE' : res === 'good' ? 'Half dodged' : 'Too slow!', res === 'miss' ? '#8a1a1c' : '#2e6a1e']]]); label.kick?.(0.8);
        closer.scale.setScalar(1); this.flash = { res, t: performance.now() };
        const away = () => { if (window.__qteFreeze != null && window.__qteHold) return setTimeout(away, 200); S.ui.root.remove(g); if (this.g === g) this.g = null; }; setTimeout(away, 650);
        resolve(res);
      };
      const press = () => { if (done) return true; pressedAt = now(); const d = Math.abs(pressedAt - lead); finish(d <= perfect ? 'perfect' : d <= good ? 'good' : 'miss'); return true; };
      const eat = () => true;
      const handler = S.input.push({ modal: true, click: press, down: eat, key: (ev) => { if (ev.code === 'Space' || ev.code === 'Enter') return press(); return true; }, dragstart: eat, drag: eat, dragend: eat, move: eat });
      const head = new THREE.Vector3();
      const upd = { update() {
        const t = now(); if (!done && t > lead + good) return finish('miss'); if (done) return;
        S.prof.root.updateMatrixWorld(true); S.prof.headWorld(head); head.y -= 0.55; const p = E.worldToUI(head); uiPos(g, p.x, p.y, 5); g.scale.setScalar((40 - 5) / 40);
        const u = Math.max(0, 1 - t / lead); closer.scale.setScalar(1 + u * 2.4); dial.rotation.z = t * 0.6; label.update?.(1 / 60, null);
        const inWin = Math.abs(t - lead) <= good; target.material = plainMat(inWin ? 'gold' : 'brass');
      } };
      E.add(upd); upd.update();
      audio.play('string_pluck', { vol: 0.5 });
      // a press that came a moment early (before the rings appear) never counts: the window is the window
      void pressedAt;
    });
  }
}
