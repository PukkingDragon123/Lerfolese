// Each foe's intent floats above its head as a physical thought bubble (ui3d/thought.js): what it means to do to
// Newton, how hard, and a counter hint. Kept in the battle UI layer, re-read whenever the battle refreshes a foe.
import { ThoughtBubble, intentScene } from '../ui3d/thought.js';
import * as THREE from 'three';

const _v = new THREE.Vector3();
export class IntentLayer {
  constructor(S) { this.S = S; this.bubbles = new Map(); S.engine.add(this); }
  refresh(e) {
    const S = this.S; if (!S.ui?.root) return; let b = this.bubbles.get(e.uid);
    if (!b) { b = new ThoughtBubble(); S.ui.root.add(b.group); this.bubbles.set(e.uid, b); }
    b.small = !!e.def.isHead; b.set(e.alive && !S.battle?.over ? intentScene(e, e.intent, S.battle) : null);
  }
  update(dt, t) {
    const S = this.S; if (!S.battle) return this.dispose();
    for (const [uid, b] of this.bubbles) {
      const v = S.enemyViews.get(uid); if (!v || !v.e.alive) { b.set(null); b.update(dt, t); continue; }
      // the last puff sits just above and left of the head; heads of a hydra think smaller thoughts
      _v.copy(v.api.root.position); _v.y += v.e.def.isHead ? 0.9 : v.h + 0.25; const p = S.engine.worldToUI(_v);
      const z = 4 + (b.small ? 0 : 0.3), k = (40 - z) / 40, s = b.small ? 0.72 : 0.95;
      b.group.position.set((p.x + (b.small ? 0.2 : 0.55)) * k, (p.y + 0.15) * k, z); b.group.scale.setScalar(k * s);
      b.update(dt, t);
    }
  }
  dispose() { this.S.engine.remove(this); for (const b of this.bubbles.values()) { b.group.parent?.remove(b.group); b.dispose(); } this.bubbles.clear(); }
}
