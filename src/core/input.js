// Unified pointer input: position, smoothed velocity, drag / flick / shake detection, wheel & pinch.
import * as THREE from 'three';

export class Input {
  constructor(el) {
    this.el = el;
    this.x = innerWidth / 2; this.y = innerHeight / 2;
    this.ndc = new THREE.Vector2();
    this.vx = 0; this.vy = 0;           // smoothed px/s
    this.down = false; this.dragging = false; this.button = 0;
    this.downX = 0; this.downY = 0; this.downTime = 0;
    this.handlers = [];                  // stack; top handler receives events first
    this.keys = new Set();
    this._last = { x: this.x, y: this.y, t: performance.now() };
    this._hist = [];                     // recent samples for flick velocity
    this._shake = { lastSignX: 0, lastSignY: 0, flips: [], fired: 0 };
    this._touches = new Map(); this._pinchDist = 0;
    this.hasInteracted = false; this.onFirstInteract = null;
    this.isTouch = matchMedia('(pointer: coarse)').matches;

    el.addEventListener('pointerdown', (e) => this._onDown(e));
    addEventListener('pointermove', (e) => this._onMove(e));
    addEventListener('pointerup', (e) => this._onUp(e));
    addEventListener('pointercancel', (e) => this._onUp(e, true));
    el.addEventListener('wheel', (e) => { e.preventDefault(); this._emit('wheel', { dy: e.deltaY, x: e.clientX, y: e.clientY }); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => { if (e.repeat) return; this.keys.add(e.code); this._emit('key', { code: e.code, key: e.key, e }); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); if (this.down) this._onUp({ clientX: this.x, clientY: this.y, pointerId: -1 }, true); });
  }

  push(h) { this.handlers.push(h); return h; }
  remove(h) { this.handlers = this.handlers.filter((x) => x !== h); }
  _emit(type, data) {
    for (let i = this.handlers.length - 1; i >= 0; i--) {
      const h = this.handlers[i];
      const fn = h[type];
      if (fn && fn.call(h, data, this) === true) return true; // consumed
      if (h.modal) return false;
    }
    return false;
  }

  _setPos(e) {
    this.x = e.clientX; this.y = e.clientY;
    this.ndc.set((this.x / innerWidth) * 2 - 1, -(this.y / innerHeight) * 2 + 1);
  }

  _firstInteract() {
    if (!this.hasInteracted) { this.hasInteracted = true; if (this.onFirstInteract) this.onFirstInteract(); }
  }

  _onDown(e) {
    this._firstInteract();
    if (e.pointerType === 'touch') {
      this._touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._touches.size === 2) { this._pinchDist = this._touchDist(); if (this.down) { this._emit('dragcancel', {}); this.down = false; this.dragging = false; } return; }
    }
    try { this.el.setPointerCapture?.(e.pointerId); } catch (err) { /* ignore */ }
    this._setPos(e);
    this.down = true; this.dragging = false; this.button = e.button;
    this.downX = this.x; this.downY = this.y; this.downTime = performance.now();
    this._hist = [{ x: this.x, y: this.y, t: this.downTime }];
    this._shake.flips = []; this._shake.lastSignX = 0; this._shake.lastSignY = 0;
    this._emit('down', { x: this.x, y: this.y, button: e.button });
  }

  _touchDist() { const p = [...this._touches.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }

  _onMove(e) {
    if (e.pointerType === 'touch' && this._touches.has(e.pointerId)) {
      this._touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._touches.size >= 2) { const d = this._touchDist(); if (this._pinchDist > 0) this._emit('pinch', { scale: d / this._pinchDist }); this._pinchDist = d; return; }
    }
    const now = performance.now();
    this._setPos(e);
    const dt = Math.max(1, now - this._last.t) / 1000;
    const ivx = (this.x - this._last.x) / dt, ivy = (this.y - this._last.y) / dt;
    const k = Math.min(1, dt * 18);
    this.vx += (ivx - this.vx) * k; this.vy += (ivy - this.vy) * k;
    this._last = { x: this.x, y: this.y, t: now };
    if (this.down) {
      this._hist.push({ x: this.x, y: this.y, t: now });
      while (this._hist.length > 2 && now - this._hist[0].t > 90) this._hist.shift();
      if (!this.dragging && Math.hypot(this.x - this.downX, this.y - this.downY) > (this.isTouch ? 10 : 6)) {
        this.dragging = true; this._emit('dragstart', { x: this.downX, y: this.downY, button: this.button });
      }
      if (this.dragging) { this._emit('drag', { x: this.x, y: this.y, vx: this.vx, vy: this.vy }); this._detectShake(ivx, ivy, now); }
    }
    this._emit('move', { x: this.x, y: this.y });
  }

  _detectShake(ivx, ivy, now) {
    const s = this._shake; const thr = 650;
    const check = (iv, key) => {
      if (Math.abs(iv) < thr) return;
      const sg = Math.sign(iv);
      if (s[key] !== 0 && sg !== s[key]) s.flips.push(now);
      s[key] = sg;
    };
    check(ivx, 'lastSignX'); check(ivy, 'lastSignY');
    s.flips = s.flips.filter((t) => now - t < 700);
    if (s.flips.length >= 4 && now - s.fired > 600) { s.fired = now; s.flips = []; this._emit('shake', { x: this.x, y: this.y }); }
  }

  _onUp(e, cancelled = false) {
    if (e.pointerType === 'touch') { this._touches.delete(e.pointerId); if (this._touches.size > 0) return; this._pinchDist = 0; }
    if (!this.down) return;
    this._setPos(e);
    const now = performance.now();
    let fvx = 0, fvy = 0;
    if (this._hist.length >= 2) {
      const a = this._hist[0], b = this._hist[this._hist.length - 1];
      const dt = Math.max(16, b.t - a.t) / 1000; fvx = (b.x - a.x) / dt; fvy = (b.y - a.y) / dt;
    }
    const wasDragging = this.dragging;
    this.down = false; this.dragging = false;
    if (cancelled) { this._emit('dragcancel', {}); return; }
    if (wasDragging) {
      const speed = Math.hypot(fvx, fvy);
      this._emit('dragend', { x: this.x, y: this.y, vx: fvx, vy: fvy, speed, flick: speed > 1500 && now - this._last.t < 80 });
    } else {
      this._emit('click', { x: this.x, y: this.y, button: e.button ?? 0, long: now - this.downTime > 450 });
    }
    this._emit('up', { x: this.x, y: this.y });
  }

  toNDC(x, y, out = new THREE.Vector2()) { return out.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); }
}
