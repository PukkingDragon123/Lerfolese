// Procedural flesh for any rig (Limbo humanoids, the sculpted beasts, the boss adapters): FLEX layers spring-damped
// offsets on top of whatever the rig's own animation set this frame. Alive, a blow kicks every bone (the chain lags and
// wobbles back: the stagger), and the whole body leans away from it. On the killing blow it becomes a RAGDOLL: the root is
// a falling rigid body (the knockback impulse, gravity, a topple about the feet, a bounce and a slide on landing), and
// every bone goes slack (weak springs, gravity sag, flops kicked on each impact) until it settles on the ground.
//   const f = new Flex(api, { ground }); ... api.update(dt); f.update(dt);  f.hit(dirWorld, k);  f.die(dirWorld, k, onLand)
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
export class Flex {
  constructor(api, { ground = 0, maxBones = 48 } = {}) {
    this.api = api; this.root = api.root; this.ground = ground; this.bones = []; this.dead = false; this.t = 0;
    this.root.traverse((o) => { if (o.isBone && this.bones.length < maxBones) { let d = 0, p = o.parent; while (p && p !== this.root) { if (p.isBone) d++; p = p.parent; } this.bones.push({ b: o, d, o: new THREE.Vector3(), v: new THREE.Vector3(), r: Math.random() }); } });
    this.lean = new THREE.Vector3(); this.leanV = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.av = 0; this.landed = 0; this.restRz = 0;
  }
  /** a blow from world direction dir (unit, toward the victim), strength k ~ 0.2 .. 2 */
  hit(dir, k = 1) {
    if (this.dead) return; const local = _v.copy(dir).applyQuaternion(_q.copy(this.root.quaternion).invert());
    this.leanV.x += local.z * 3.2 * k; this.leanV.z += -local.x * 3.2 * k;
    for (const B of this.bones) { const w = Math.min(1.6, 0.35 + B.d * 0.12) * k; B.v.x += (local.z * 4 + (B.r - 0.5) * 3) * w; B.v.z += (-local.x * 4 + (Math.random() - 0.5) * 3) * w; B.v.y += (Math.random() - 0.5) * 2 * w; }
  }
  /** the killing blow: knockback impulse along dir, a topple, slack limbs; onLand(pos) on the first impact */
  die(dir, k = 1, onLand = null) {
    if (this.dead) return; this.dead = true; this.onLand = onLand; const kk = Math.min(2.2, 0.6 + k);
    this.vel.set(dir.x * 1.6 * kk, 1.6 + kk * 0.8, dir.z * 1.6 * kk); this.av = -Math.sign(dir.x || 1) * (1.6 + kk * 1.1); this.y0 = this.root.position.y; this.ground = Math.min(this.ground, this.y0); this.pos = this.root.position.clone(); this.rz = this.root.rotation.z; this.rx = this.root.rotation.x;
    for (const B of this.bones) { B.v.x += (Math.random() - 0.4) * 6 * kk; B.v.z += (Math.random() - 0.5) * 6 * kk; }
  }
  update(dt) {
    if (dt <= 0) { this.apply(); return; } this.t += dt; const dead = this.dead;
    // bones: stiff springs while alive (a lagging wobble), slack and sagging once dead
    const K = dead ? 7 : 70, C = dead ? 4.5 : 9, lim = dead ? 1.1 : 0.45;
    for (const B of this.bones) { const o = B.o, v = B.v;
      v.x += (-K * o.x - C * v.x + (dead ? 2.4 * (1 - this.landed * 0.4) : 0)) * dt; v.y += (-K * o.y - C * v.y) * dt; v.z += (-K * o.z - C * v.z) * dt;
      o.addScaledVector(v, dt); o.clampScalar(-lim, lim); }
    // the body leans away from a blow and springs back
    this.leanV.addScaledVector(this.lean, -60 * dt).multiplyScalar(Math.max(0, 1 - 8 * dt)); this.lean.addScaledVector(this.leanV, dt); this.lean.clampScalar(-0.45, 0.45);
    if (dead) { // the root: a falling, toppling rigid body that bounces, slides and settles on its side
      const r = this.root, P = this.pos; this.vel.y -= 9.8 * dt; P.addScaledVector(this.vel, dt); this.rz += this.av * dt; // own state: the rig may rewrite its root every frame
      const side = Math.sign(this.rz || -1); if (Math.abs(this.rz) > 1.42) { this.rz = side * 1.42; this.av *= -0.25; }
      if (P.y < this.ground) { P.y = this.ground; if (this.vel.y < -1.2) { if (!this.landed) this.onLand?.(P.clone()); this.landed = Math.min(1, this.landed + 0.5); for (const B of this.bones) { B.v.x += (Math.random() - 0.3) * 4; B.v.z += (Math.random() - 0.5) * 4; } } this.vel.y = -this.vel.y * 0.22; this.vel.x *= 0.55; this.vel.z *= 0.55; this.av *= 0.6; if (Math.abs(this.vel.y) < 0.4) this.vel.y = 0; }
      if (this.landed && Math.abs(this.rz) < 1.3) this.rz += side * dt * 2.2; // finish keeling over
      if (!this.sinking) r.position.copy(P); r.rotation.z = this.rz; r.rotation.x = this.rx;
    }
    this.apply();
  }
  apply() {
    for (const B of this.bones) { const r = B.b.rotation; // a bone the rig did not re-pose this frame still carries last frame's offset: take it off first
      if (B.w && r.x === B.w[0] && r.y === B.w[1] && r.z === B.w[2]) { r.x -= B.p[0]; r.y -= B.p[1]; r.z -= B.p[2]; }
      r.x += B.o.x; r.y += B.o.y; r.z += B.o.z; B.p = [B.o.x, B.o.y, B.o.z]; B.w = [r.x, r.y, r.z]; } if (!this.dead) { this.root.rotation.x = this.lean.x * 0.6; this.root.rotation.z = this.lean.z * 0.6 + this.restRz; } }
}
