// Game-time tweens (promise based) and damped springs.
import { Ease, clamp } from './util.js';

class Tween {
  constructor(target, props, duration, opts) {
    this.target = target; this.duration = Math.max(0.0001, duration);
    this.ease = typeof opts.ease === 'function' ? opts.ease : (Ease[opts.ease] || Ease.outCubic);
    this.delay = opts.delay || 0; this.onUpdate = opts.onUpdate; this.onComplete = opts.onComplete;
    this.props = props; this.from = null; this.t = 0; this.done = false; this.tag = opts.tag;
    this.promise = new Promise((res) => (this._resolve = res));
  }
  start() {
    this.from = {};
    for (const k in this.props) this.from[k] = this.target[k];
  }
  step(dt) {
    if (this.done) return true;
    if (this.delay > 0) { this.delay -= dt; if (this.delay > 0) return false; dt = -this.delay; this.delay = 0; }
    if (!this.from) this.start();
    this.t += dt;
    const k = clamp(this.t / this.duration, 0, 1);
    const e = this.ease(k);
    for (const p in this.props) this.target[p] = this.from[p] + (this.props[p] - this.from[p]) * e;
    if (this.onUpdate) this.onUpdate(e, k);
    if (k >= 1) { this.finish(); return true; }
    return false;
  }
  finish() { if (this.done) return; this.done = true; if (this.onComplete) this.onComplete(); this._resolve(); }
}

export class TweenManager {
  constructor() { this.list = []; this.timeScale = 1; this.time = 0; }
  to(target, props, duration, opts = {}) { const t = new Tween(target, props, duration, opts); this.list.push(t); return t.promise; }
  // animate a value 0..1 through a callback
  run(duration, fn, opts = {}) { const o = { v: 0 }; return this.to(o, { v: 1 }, duration, { ...opts, onUpdate: (e, k) => fn(e, k) }); }
  wait(seconds) { return this.run(seconds, () => {}, { ease: 'linear' }); }
  killTarget(target, complete = false) {
    for (const t of this.list) if (t.target === target) { if (complete) { for (const p in t.props) t.target[p] = t.props[p]; } t.finish(); }
    this.list = this.list.filter((t) => !t.done);
  }
  killTag(tag) { for (const t of this.list) if (t.tag === tag) t.finish(); this.list = this.list.filter((t) => !t.done); }
  update(dt) {
    dt *= this.timeScale; this.time += dt;
    if (!this.list.length) return;
    const list = this.list; this.list = [];
    const keep = [];
    for (const t of list) if (!t.step(dt)) keep.push(t);
    // tweens created during step() were pushed onto this.list
    this.list = keep.concat(this.list);
  }
}

export const tweens = new TweenManager();

// Semi-implicit damped spring. omega = angular frequency, zeta = damping ratio (<1 bouncy)
export class Spring {
  constructor(value = 0, omega = 14, zeta = 0.55) { this.value = value; this.target = value; this.vel = 0; this.omega = omega; this.zeta = zeta; }
  set(v) { this.value = v; this.target = v; this.vel = 0; return this; }
  kick(impulse) { this.vel += impulse; return this; }
  update(dt) {
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const f = -2 * this.zeta * this.omega * this.vel - this.omega * this.omega * (this.value - this.target);
      this.vel += f * h; this.value += this.vel * h;
    }
    return this.value;
  }
  get settled() { return Math.abs(this.value - this.target) < 1e-3 && Math.abs(this.vel) < 1e-3; }
}

export class Spring3 {
  constructor(x = 0, y = 0, z = 0, omega = 14, zeta = 0.6) { this.x = new Spring(x, omega, zeta); this.y = new Spring(y, omega, zeta); this.z = new Spring(z, omega, zeta); }
  setTarget(x, y, z) { this.x.target = x; this.y.target = y; this.z.target = z; }
  setTargetV(v) { this.setTarget(v.x, v.y, v.z); }
  snap(x, y, z) { this.x.set(x); this.y.set(y); this.z.set(z); }
  params(omega, zeta) { for (const s of [this.x, this.y, this.z]) { s.omega = omega; s.zeta = zeta; } }
  update(dt) { this.x.update(dt); this.y.update(dt); this.z.update(dt); }
  copyTo(v) { v.set(this.x.value, this.y.value, this.z.value); return v; }
  get vx() { return this.x.vel; } get vy() { return this.y.vel; } get vz() { return this.z.vel; }
}
