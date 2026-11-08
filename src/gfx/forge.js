// The Forge: renders detailed 3D subjects with studio lighting, then stylizes them into polished
// pixel art (banded shading with hue-shifted shadows, warm highlights, selective coloured outlines, rim light).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PixelCanvas } from './pixel.js';
// 2D art is geometric & stylized: render a decimated, flat-shaded twin of each subject (the 3D world keeps the detailed one)
function geometricTwin(obj, cells = 7) {
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const g0 = o.geometry; const n = g0.attributes.position.count;
    if (n > 60) {
      const g = g0.index ? g0.toNonIndexed() : g0.clone(); g.computeBoundingBox(); const sz = g.boundingBox.getSize(new THREE.Vector3());
      const cell = Math.max(sz.x, sz.y, sz.z) / cells; const p = g.attributes.position; const thin = Math.min(sz.x, sz.y, sz.z) < cell * 2.2;
      if (cell > 1e-5 && !thin) for (let i = 0; i < p.count; i++) p.setXYZ(i, Math.round(p.getX(i) / cell) * cell, Math.round(p.getY(i) / cell) * cell, Math.round(p.getZ(i) / cell) * cell);
      g.deleteAttribute('normal'); g.computeVertexNormals(); o.geometry = g;
    }
    const mats = Array.isArray(o.material) ? o.material : [o.material]; const nm = mats.map((m) => { const c = m.clone(); c.flatShading = true; c.needsUpdate = true; return c; }); o.material = Array.isArray(o.material) ? nm : nm[0];
  });
  return obj;
}

const SS = 3;
function rgb2hsl(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
function hueToward(h, target, k) { let d = target - h; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return (h + d * k + 1) % 1; }
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class Forge {
  constructor(renderer) {
    this.r = renderer || new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.r); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.55;
    this.cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    const key = new THREE.DirectionalLight(0xfff0d8, 3.2); key.position.set(-2.2, 3, 3.2);
    const fill = new THREE.DirectionalLight(0x9ab8ff, 1.1); fill.position.set(3, 0.6, 2);
    const rim = new THREE.DirectionalLight(0xffffff, 2.2); rim.position.set(0.8, 2.2, -3.5);
    this.scene.add(key, fill, rim, new THREE.HemisphereLight(0xfff4e0, 0x3a2a40, 0.7));
    this.rts = new Map();
  }
  rt(w, h) {
    const k = w + 'x' + h; if (!this.rts.has(k)) { const t = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType }); t.texture.colorSpace = THREE.SRGBColorSpace; this.rts.set(k, t); }
    return this.rts.get(k);
  }
  // returns a PixelCanvas w×h with the stylized subject on transparent background
  paint(obj, { w = 104, h = 64, fit = 0.8, yaw = 0.5, pitch = 0.18, offset = [0, 0], levels = 7, outline = true, hueShadow = 0.72, satBoost = 1.18, rim = true, geometric = true, cells = 9 } = {}) {
    const W = w * SS, H = h * SS;
    if (geometric) geometricTwin(obj, cells);
    const holder = new THREE.Group(); holder.add(obj); this.scene.add(holder);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
    obj.position.sub(c);
    const radius = Math.max(sz.x * 0.5 / (w / h), sz.y * 0.5, sz.z * 0.35) / fit;
    const dist = radius / Math.tan((this.cam.fov * Math.PI) / 360);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    this.cam.position.set(Math.sin(yaw) * dist * Math.cos(pitch), Math.sin(pitch) * dist, Math.cos(yaw) * dist * Math.cos(pitch));
    this.cam.lookAt(0, 0, 0);
    this.cam.position.x -= offset[0] * radius; this.cam.position.y -= offset[1] * radius;
    const rt = this.rt(W, H);
    const prevRT = this.r.getRenderTarget(); const prevClear = this.r.getClearColor(new THREE.Color()); const prevAlpha = this.r.getClearAlpha(); const prevAuto = this.r.autoClear; const prevTM = this.r.toneMapping;
    this.r.setRenderTarget(rt); this.r.setClearColor(0x000000, 0); this.r.autoClear = true; this.r.toneMapping = THREE.NoToneMapping;
    this.r.clear(); this.r.render(this.scene, this.cam);
    const buf = new Uint8Array(W * H * 4); this.r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    this.r.setRenderTarget(prevRT); this.r.setClearColor(prevClear, prevAlpha); this.r.autoClear = prevAuto; this.r.toneMapping = prevTM;
    this.scene.remove(holder);
    obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    return this.stylize(buf, W, H, w, h, { levels, outline, hueShadow, satBoost, rim });
  }
  stylize(buf, W, H, w, h, { levels, outline, hueShadow, satBoost, rim }) {
    const N = w * h; const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N), A = new Float32Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) { const sy = H - 1 - (y * SS + j); const k = (sy * W + x * SS + i) * 4; const al = buf[k + 3] / 255; r += (buf[k] / 255) * al; g += (buf[k + 1] / 255) * al; b += (buf[k + 2] / 255) * al; a += al; }
      const n = SS * SS; const id = y * w + x; A[id] = a / n;
      if (a > 0) { R[id] = r / a; G[id] = g / a; B[id] = b / a; }
    }
    const solid = new Uint8Array(N); for (let i = 0; i < N; i++) solid[i] = A[i] >= 0.42 ? 1 : 0;
    const band = new Float32Array(N); const H_ = new Float32Array(N), S_ = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (!solid[i]) continue;
      const [hh, ss, ll] = rgb2hsl(R[i], G[i], B[i]); H_[i] = hh; S_[i] = ss;
      band[i] = Math.round(clamp01(ll) * levels);
    }
    // de-speckle: lone pixels take their neighbours' band
    const sb = band.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (!solid[i]) continue;
      const nb = [i - 1, i + 1, i - w, i + w].filter((k) => solid[k]).map((k) => sb[k]);
      if (nb.length >= 3 && nb.every((v) => v === nb[0]) && Math.abs(nb[0] - sb[i]) === 1) band[i] = nb[0];
    }
    const pc = new PixelCanvas(w, h);
    const put = (x, y, rr, gg, bb) => pc.px(x, y, (0xff << 24 | (Math.round(clamp01(bb) * 255) << 16) | (Math.round(clamp01(gg) * 255) << 8) | Math.round(clamp01(rr) * 255)) >>> 0);
    const tone = (hh, ss, l) => {
      let h2 = hh, s2 = ss * satBoost;
      if (l < 0.5) { h2 = hueToward(hh, hueShadow, (0.5 - l) * 0.45); s2 = Math.min(1, s2 * (1 + (0.5 - l) * 0.6)); }
      else if (l > 0.62) { h2 = hueToward(hh, 0.12, (l - 0.62) * 0.4); s2 *= 1 - (l - 0.62) * 0.5; }
      return hsl2rgb(h2, clamp01(s2), clamp01(l));
    };
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) {
        let b = band[i];
        if (rim) { if (!op(x + 1, y) || !op(x, y + 1)) b -= 1; else if ((!op(x - 1, y) || !op(x, y - 1)) && b < levels) b += 0.6; }
        const l = clamp01((b / levels) * 0.92 + 0.04);
        const [r, g, bb] = tone(H_[i], S_[i], l); put(x, y, r, g, bb);
      } else if (outline) {
        let nb = -1; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (op(x + dx, y + dy)) { nb = (y + dy) * w + x + dx; break; }
        if (nb >= 0) { const [r, g, bb] = hsl2rgb(hueToward(H_[nb], hueShadow, 0.5), Math.min(1, S_[nb] * 1.1 + 0.15), 0.09); put(x, y, r, g, bb); }
      }
    }
    return pc;
  }
}

let shared = null;
export function getForge(renderer) { if (!shared) shared = new Forge(renderer); return shared; }
