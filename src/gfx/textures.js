// Procedural high-detail pixel textures for low-poly models + material helpers.
import * as THREE from 'three';
import { PixelCanvas, makeNoise, bayer } from './pixel.js';
import { R } from './palette.js';
import { mulberry32 } from '../core/util.js';

const cache = new Map();

export function toTexture(canvasOrPc, { repeat = [1, 1], nearest = true, wrap = true } = {}) {
  const c = canvasOrPc instanceof PixelCanvas ? canvasOrPc.commit() : canvasOrPc;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = 4;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function cached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

const shade = (ramp, v, x, y, d = 1) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(v * (ramp.length - 1) + (bayer(x, y) - 0.5) * d)))];

export const TEX = {
  noise(key, ramp, { w = 64, h = 64, scale = 0.12, oct = 4, seed = 3, contrast = 1.2, bias = 0 } = {}) {
    return cached('noise:' + key, () => {
      const n = makeNoise(seed); const pc = new PixelCanvas(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        // tileable by blending four samples
        const fx = x / w, fy = y / h; const s = (a, b) => n.fbm(a * w * scale, b * h * scale, oct);
        let v = s(fx, fy) * (1 - fx) * (1 - fy) + s(fx - 1, fy) * fx * (1 - fy) + s(fx, fy - 1) * (1 - fx) * fy + s(fx - 1, fy - 1) * fx * fy;
        v = (v - 0.5) * contrast + 0.5 + bias;
        pc.px(x, y, shade(ramp, Math.max(0, Math.min(1, v)), x, y));
      }
      return toTexture(pc);
    });
  },
  wood(key = 'wood', ramp = R.wood, { w = 64, h = 128, seed = 7, knots = 2, rings = 9 } = {}) {
    return cached('wood:' + key, () => {
      const n = makeNoise(seed); const rnd = mulberry32(seed); const pc = new PixelCanvas(w, h);
      const ks = Array.from({ length: knots }, () => [rnd() * w, rnd() * h, 3 + rnd() * 4]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let warp = n.fbm(x * 0.05, y * 0.012, 3) * 6;
        for (const [kx, ky, kr] of ks) { const d = Math.hypot((x - kx) * 1.4, y - ky); if (d < kr * 3) warp += (kr * 3 - d) * 0.6 * Math.sign(x - kx); }
        const g = Math.sin(((x + warp) / w) * Math.PI * 2 * rings) * 0.5 + 0.5;
        let v = 0.35 + g * 0.35 + (n.fbm(x * 0.3, y * 0.05, 2) - 0.5) * 0.4;
        for (const [kx, ky, kr] of ks) { const d = Math.hypot((x - kx) * 1.4, y - ky); if (d < kr) v = 0.12 + (d / kr) * 0.25; }
        pc.px(x, y, shade(ramp, Math.max(0, Math.min(1, v)), x, y));
      }
      return toTexture(pc);
    });
  },
  // painted marionette face skin: lighter carved wood
  scales(key, ramp, { w = 64, h = 64, size = 6, seed = 11 } = {}) {
    return cached('scales:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const row = Math.floor(y / size); const ox = (row % 2) * (size / 2);
        const cx = Math.floor((x + ox) / size) * size - ox + size / 2; const cy = row * size + size * 0.2;
        const dx = (x - cx) / (size * 0.62), dy = (y - cy) / (size * 0.95);
        const d = Math.sqrt(dx * dx + dy * dy);
        let v = 0.85 - d * 0.55 + (n(x * 0.2, y * 0.2) - 0.5) * 0.25;
        if (d > 0.92) v = 0.12;
        pc.px(x, y, shade(ramp, Math.max(0, Math.min(1, v)), x, y));
      }
      return toTexture(pc);
    });
  },
  fur(key, ramp, { w = 64, h = 64, seed = 5, strokes = 520, len = 6 } = {}) {
    return cached('fur:' + key, () => {
      const pc = new PixelCanvas(w, h); const rnd = mulberry32(seed); const n = makeNoise(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pc.px(x, y, shade(ramp, 0.35 + (n.fbm(x * 0.08, y * 0.08) - 0.5) * 0.5, x, y));
      for (let i = 0; i < strokes; i++) {
        const x = rnd() * w, y = rnd() * h; const a = Math.PI / 2 + (rnd() - 0.5) * 0.8; const l = len * (0.5 + rnd());
        const c = ramp[Math.min(ramp.length - 1, 1 + Math.floor(rnd() * (ramp.length - 1)))];
        for (let k = 0; k < l; k++) pc.px(((x + Math.cos(a) * k) % w + w) % w, ((y + Math.sin(a) * k) % h + h) % h, c);
      }
      return toTexture(pc);
    });
  },
  cloth(key, ramp, { w = 64, h = 64, seed = 9, weave = true, stripes = null, trim = null } = {}) {
    return cached('cloth:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = 0.5 + (n.fbm(x * 0.06, y * 0.03, 3) - 0.5) * 0.7; // folds
        v += Math.sin(x * 0.35 + n(x * 0.05, y * 0.05) * 4) * 0.08;
        if (weave) v += ((x + y) % 2 === 0 ? 0.05 : -0.05) * ((x ^ y) & 1 ? 1 : 0.5);
        let r = ramp;
        if (stripes && Math.floor(y / stripes.size) % 2 === 0) r = stripes.ramp;
        pc.px(x, y, shade(r, Math.max(0, Math.min(1, v)), x, y));
      }
      if (trim) { for (let x = 0; x < w; x++) for (let k = 0; k < trim.size; k++) pc.px(x, h - 1 - k, shade(trim.ramp, 0.4 + 0.3 * ((x >> 1) % 2) + (k === 0 ? -0.3 : 0), x, k)); }
      return toTexture(pc);
    });
  },
  marble(key = 'marble', ramp = R.marble, { w = 64, h = 64, seed = 13 } = {}) {
    return cached('marble:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const t = n.fbm(x * 0.05, y * 0.05, 5);
        const vein = Math.abs(Math.sin((x * 0.08 + y * 0.03 + t * 6)));
        let v = 0.78 + (t - 0.5) * 0.25; if (vein < 0.06) v = 0.35; else if (vein < 0.12) v = 0.55;
        pc.px(x, y, shade(ramp, v, x, y));
      }
      return toTexture(pc);
    });
  },
  blocks(key, ramp, { w = 64, h = 64, bw = 16, bh = 8, seed = 17, mortar = 0.08 } = {}) {
    return cached('blocks:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed); const rnd = mulberry32(seed);
      const tone = Array.from({ length: 64 }, () => rnd() * 0.25 - 0.12);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const row = Math.floor(y / bh); const ox = (row % 2) * (bw / 2); const col = Math.floor((x + ox) / bw);
        const lx = (x + ox) % bw, ly = y % bh;
        let v = 0.6 + tone[(row * 7 + col) % 64] + (n.fbm(x * 0.2, y * 0.2, 3) - 0.5) * 0.3;
        if (lx === 0 || ly === 0) v = mortar; else if (lx === 1 || ly === 1) v += 0.12; else if (lx === bw - 1 || ly === bh - 1) v -= 0.15;
        pc.px(x, y, shade(ramp, Math.max(0, Math.min(1, v)), x, y));
      }
      return toTexture(pc);
    });
  },
  grass(key = 'grass', ramp = R.grass, { w = 128, h = 128, seed = 21, flowers = true } = {}) {
    return cached('grass:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed); const rnd = mulberry32(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const fx = x / w, fy = y / h; const s = (a, b) => n.fbm(a * w * 0.04, b * h * 0.04, 4);
        const v = s(fx, fy) * (1 - fx) * (1 - fy) + s(fx - 1, fy) * fx * (1 - fy) + s(fx, fy - 1) * (1 - fx) * fy + s(fx - 1, fy - 1) * fx * fy;
        pc.px(x, y, shade(ramp, 0.2 + v * 0.55, x, y));
      }
      for (let i = 0; i < w * h * 0.09; i++) { const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h); const c = ramp[2 + Math.floor(rnd() * (ramp.length - 2))]; pc.px(x, y, c); pc.px(x, (y + 1) % h, ramp[1]); }
      if (flowers) for (let i = 0; i < w * h * 0.004; i++) { const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h); const c = ['#f6b3a0', '#ffe08a', '#f3e6c4', '#b48cff'][Math.floor(rnd() * 4)]; pc.px(x, y, c); }
      return toTexture(pc);
    });
  },
  bark(key = 'bark', ramp = R.wood, { w = 32, h = 64, seed = 23 } = {}) {
    return cached('bark:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = Math.abs(Math.sin(x * 0.7 + n(x * 0.2, y * 0.05) * 5)) * 0.6 + n.fbm(x * 0.1, y * 0.1, 3) * 0.4;
        pc.px(x, y, shade(ramp, v * 0.8, x, y));
      }
      return toTexture(pc);
    });
  },
  leaves(key, ramp = R.olive, { w = 64, h = 64, seed = 29, density = 260 } = {}) {
    return cached('leaves:' + key, () => {
      const pc = new PixelCanvas(w, h); const rnd = mulberry32(seed);
      pc.clear(ramp[1]);
      for (let i = 0; i < density; i++) {
        const x = rnd() * w, y = rnd() * h; const a = rnd() * Math.PI; const l = 2 + rnd() * 3;
        const v = rnd(); const c = ramp[Math.min(ramp.length - 1, 1 + Math.floor(v * (ramp.length - 1)))];
        for (let k = -l; k <= l; k++) { const px = ((Math.round(x + Math.cos(a) * k) % w) + w) % w, py = ((Math.round(y + Math.sin(a) * k) % h) + h) % h; pc.px(px, py, c); if (Math.abs(k) < l - 1) pc.px(px, (py + 1) % h, c); }
      }
      return toTexture(pc);
    });
  },
  // brushed brass / bronze with scratches
  metal(key, ramp = R.brass, { w = 64, h = 64, seed = 31 } = {}) {
    return cached('metal:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed); const rnd = mulberry32(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pc.px(x, y, shade(ramp, 0.45 + (n(x * 0.5, y * 0.03) - 0.5) * 0.35 + (n.fbm(x * 0.05, y * 0.05) - 0.5) * 0.3, x, y));
      for (let i = 0; i < 18; i++) { const x = rnd() * w, y = rnd() * h, a = rnd() * 6.28, l = 3 + rnd() * 8; for (let k = 0; k < l; k++) pc.px(((x + Math.cos(a) * k) % w + w) % w, ((y + Math.sin(a) * k) % h + h) % h, ramp[ramp.length - 1]); }
      return toTexture(pc);
    });
  },
  parchment(key = 'parch', { w = 128, h = 128, seed = 37 } = {}) {
    return cached('parch:' + key, () => {
      const pc = new PixelCanvas(w, h); const n = makeNoise(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pc.px(x, y, shade(R.paper, 0.72 + (n.fbm(x * 0.05, y * 0.05, 5) - 0.5) * 0.45, x, y));
      return toTexture(pc);
    });
  },
  flat(color) { return cached('flat:' + color, () => { const pc = new PixelCanvas(4, 4); pc.clear(color); return toTexture(pc); }); },
};

// ---- materials ----
const matCache = new Map();
export function mat(map, { rough = 0.85, metal = 0, emissive = null, emissiveIntensity = 1, side = THREE.FrontSide, transparent = false, opacity = 1, color = 0xffffff, key, flat = false, alphaTest = 0 } = {}) {
  const k = key && key + ':' + rough + ':' + metal;
  if (k && matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: metal, side, transparent, opacity, color, flatShading: flat, alphaTest });
  if (emissive != null) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveIntensity; }
  if (k) matCache.set(k, m);
  return m;
}
export function glowMat(color, intensity = 2.5, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), transparent: opacity < 1, opacity, toneMapped: true });
}
