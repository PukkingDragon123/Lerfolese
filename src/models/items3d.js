// Sculpted 3D curios (rare items) + forge-rendered icon canvases for UI tokens.
import * as THREE from 'three';
import * as S from './sculpt.js';
import * as P3 from './props3d.js';
import { getForge } from '../gfx/forge.js';
import { PixelCanvas } from '../gfx/pixel.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.5, ...o });
const brass = () => F({ color: 0xd9a64a, metalness: 0.85, roughness: 0.3 }); const bronze = () => F({ color: 0xb27a30, metalness: 0.8, roughness: 0.35 });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p.add(o); return o; };

export const ITEM_MODELS = {
  spirit_cross: () => { const g = new THREE.Group(); mk(S.slab(1.2, 0.12, 0.12, { seed: 1 }), F({ color: 0x6e4024 }), g); mk(S.slab(0.12, 0.12, 0.8, { seed: 2 }), F({ color: 0x6e4024 }), g); for (const x of [-0.6, 0, 0.6]) mk(S.limb(0.9, 0.012, 0.012, { sides: 3, seed: 3 }), F({ color: 0, emissive: 0x8fe3ff, emissiveIntensity: 2 }), g, x, 0, 0); return g; },
  golden_apple: () => P3.apple({ kind: 'gold' }),
  lever: () => { const g = new THREE.Group(); mk(S.slab(1.8, 0.1, 0.14, { seed: 4 }), F({ color: 0x8a5634 }), g, 0, 0.2, 0).rotation.z = 0.25; mk(S.blob(0.25, 0.22, 0.25, { detail: 0, seed: 5 }), F({ color: 0x8f8a90 }), g, 0.15, -0.05, 0); const b = P3.stone(); b.scale.setScalar(0.45); b.position.set(-0.75, 0.0, 0); g.add(b); return g; },
  pendulum: () => { const g = new THREE.Group(); mk(S.slab(1.0, 0.08, 0.1, { seed: 6 }), F({ color: 0x5e3a1c }), g, 0, 0.8, 0); mk(S.limb(1.1, 0.01, 0.01, { sides: 3, seed: 7 }), F({ color: 0xe8e8f0 }), g, 0.1, 0.8, 0).rotation.z = 0.25; mk(S.gem(0.22, 1, 8), brass(), g, 0.36, -0.25, 0); return g; },
  leyden: () => { const g = new THREE.Group(); mk(S.turn([[0.001, -0.5], [0.35, -0.5], [0.38, 0.2], [0.25, 0.42], [0.001, 0.45]], { sides: 9, seed: 9 }), F({ color: 0xbfe8ff, transparent: true, opacity: 0.6, roughness: 0.05 }), g); mk(S.turn([[0.001, -0.48], [0.34, -0.48], [0.36, -0.05], [0.001, -0.05]], { sides: 9, seed: 10 }), brass(), g); mk(S.limb(0.5, 0.02, 0.02, { sides: 4, seed: 11 }), brass(), g, 0, 0.8, 0); mk(S.gem(0.08, 0, 12), F({ color: 0, emissive: 0xfff0a0, emissiveIntensity: 3 }), g, 0, 0.82, 0); g.add(P3.sparkArcs(0xfff0a0, 4)); return g; },
  wings: () => { const g = new THREE.Group(); for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const f = mk(S.slab(0.16, 0.9 - i * 0.12, 0.03, { seed: 13 + i, taper: 0.6 }), F({ color: i % 2 ? 0xf3e6c4 : 0xfff6e8, roughness: 0.8 }), g, s * (0.2 + i * 0.13), 0.1 - i * 0.05, 0); f.rotation.z = s * (0.5 + i * 0.18); } mk(S.blob(0.12, 0.12, 0.1, { detail: 0, seed: 19 }), F({ color: 0xe6c070 }), g); return g; },
  antikythera: () => { const g = new THREE.Group(); const gear = (r, n, x, y, seed) => { const gg = new THREE.Group(); gg.position.set(x, y, 0); g.add(gg); mk(S.facet(new THREE.CylinderGeometry(r, r, 0.08, 14)), bronze(), gg).rotation.x = Math.PI / 2; for (let i = 0; i < n; i++) { const t = mk(S.slab(0.08, 0.12, 0.08, { seed: seed + i }), bronze(), gg, Math.cos((i / n) * 6.28) * (r + 0.04), Math.sin((i / n) * 6.28) * (r + 0.04), 0); t.rotation.z = (i / n) * 6.28; } }; gear(0.45, 16, -0.1, 0.05, 20); gear(0.25, 10, 0.55, 0.32, 40); gear(0.18, 8, 0.45, -0.4, 60); return g; },
  schrodinger: () => { const g = new THREE.Group(); mk(S.slab(1.0, 0.7, 0.8, { seed: 70 }), F({ color: 0x8a5634 }), g); const lid = mk(S.slab(1.05, 0.1, 0.85, { seed: 71 }), F({ color: 0x6e4024 }), g, 0, 0.42, -0.2); lid.rotation.x = -0.5; for (const s of [-1, 1]) mk(S.facet(new THREE.ConeGeometry(0.1, 0.2, 3)), F({ color: 0x3a3a3a }), g, s * 0.15, 0.48, 0.05); for (const s of [-1, 1]) mk(S.gem(0.04, 0, 72), F({ color: 0, emissive: 0x9cff60, emissiveIntensity: 2.5 }), g, s * 0.1, 0.38, 0.32); return g; },
  owl: () => { const g = new THREE.Group(); mk(S.blob(0.42, 0.55, 0.38, { detail: 1, seed: 73 }), F({ color: 0x8a6a4a }), g); for (const s of [-1, 1]) { mk(S.gem(0.14, 1, 74), F({ color: 0xffe08a, emissive: 0x6a4a10, emissiveIntensity: 0.6 }), g, s * 0.16, 0.2, 0.3); mk(S.gem(0.06, 0, 75), F({ color: 0x1a1220 }), g, s * 0.16, 0.2, 0.42); mk(S.facet(new THREE.ConeGeometry(0.08, 0.2, 3)), F({ color: 0x6a4a3a }), g, s * 0.25, 0.55, 0); } mk(S.facet(new THREE.ConeGeometry(0.05, 0.12, 3)), F({ color: 0xd99a2b }), g, 0, 0.05, 0.4).rotation.x = Math.PI / 2; return g; },
  pan_flute: () => { const g = new THREE.Group(); for (let i = 0; i < 7; i++) mk(S.facet(new THREE.CylinderGeometry(0.06, 0.06, 0.5 + i * 0.12, 6)), F({ color: 0xc9a050 }), g, -0.4 + i * 0.13, -(0.5 + i * 0.12) / 2 + 0.3, 0); mk(S.slab(1.0, 0.08, 0.16, { seed: 76 }), F({ color: 0x6e4024 }), g, 0.0, 0.0, 0.05); return g; },
  horn: () => { const g = new THREE.Group(); mk(S.horn([[0, -0.5, 0], [0.3, 0, 0.1], [0.2, 0.45, 0.2], [-0.1, 0.7, 0.25]], 0.22, 0.02, { sides: 6, segs: 10, seed: 77 }), F({ color: 0xe8dcc0 }), g); mk(S.facet(new THREE.TorusGeometry(0.22, 0.05, 3, 9)), brass(), g, 0, -0.45, 0).rotation.x = Math.PI / 2; return g; },
  fang: () => { const g = new THREE.Group(); mk(S.horn([[0, 0.5, 0], [0.12, 0.0, 0.05], [0.0, -0.5, 0.1]], 0.2, 0.01, { sides: 5, segs: 8, seed: 78 }), F({ color: 0xf0ead8 }), g); mk(S.gem(0.06, 0, 79), F({ color: 0, emissive: 0x9cff60, emissiveIntensity: 2 }), g, 0, -0.45, 0.12); return g; },
  mirror: () => { const g = new THREE.Group(); mk(S.facet(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12)), F({ color: 0xe8f0ff, metalness: 1, roughness: 0.05 }), g, 0, 0.2, 0).rotation.x = Math.PI / 2; mk(S.facet(new THREE.TorusGeometry(0.5, 0.06, 3, 12)), bronze(), g, 0, 0.2, 0); mk(S.limb(0.7, 0.07, 0.05, { sides: 6, seed: 80 }), bronze(), g, 0, -0.3, 0); return g; },
  prism: () => P3.prism(),
  sack: () => { const g = new THREE.Group(); mk(S.blob(0.5, 0.48, 0.45, { detail: 1, seed: 81, amt: 0.2 }), F({ color: 0x8a6a40 }), g); mk(S.limb(0.25, 0.18, 0.28, { sides: 6, seed: 82 }), F({ color: 0x8a6a40 }), g, 0, 0.62, 0); for (let i = 0; i < 3; i++) mk(S.facet(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8)), F({ color: 0xffd76a, metalness: 0.9, roughness: 0.25 }), g, -0.2 + i * 0.2, 0.55, 0.25).rotation.x = 1.1; return g; },
  thread: () => { const g = new THREE.Group(); mk(S.facet(new THREE.CylinderGeometry(0.25, 0.25, 0.7, 8)), F({ color: 0xc8443a, roughness: 0.9 }), g); for (const y of [-0.38, 0.38]) mk(S.facet(new THREE.CylinderGeometry(0.4, 0.4, 0.07, 9)), F({ color: 0x8a5634 }), g, 0, y, 0); mk(S.horn([[0.25, 0, 0.2], [0.6, -0.3, 0.3], [0.9, -0.2, 0.0], [1.1, -0.5, 0.1]], 0.02, 0.02, { sides: 3, segs: 8, seed: 83 }), F({ color: 0xc8443a }), g); return g; },
  wineskin: () => { const g = new THREE.Group(); mk(S.blob(0.45, 0.6, 0.35, { detail: 1, seed: 84 }), F({ color: 0x6e4024 }), g); mk(S.limb(0.35, 0.08, 0.06, { sides: 6, seed: 85 }), F({ color: 0x5a3a20 }), g, 0, 0.85, 0); for (let i = 0; i < 4; i++) mk(S.gem(0.08, 0, 86 + i), F({ color: 0x6a2a6a, roughness: 0.3 }), g, -0.3 + i * 0.12, 0.62, 0.3); return g; },
  plumb_bob: () => { const g = new THREE.Group(); mk(S.turn([[0.001, -0.6], [0.3, 0.0], [0.28, 0.2], [0.12, 0.3], [0.001, 0.32]], { sides: 8, seed: 87 }), brass(), g); mk(S.limb(0.6, 0.012, 0.012, { sides: 3, seed: 88 }), F({ color: 0, emissive: 0x8fe3ff, emissiveIntensity: 2 }), g, 0, 0.92, 0); return g; },
};

const iconCache = new Map();
export function itemIcon(id, size = 96) {
  const k = id + ':' + size; if (iconCache.has(k)) return iconCache.get(k);
  let pc;
  try { pc = getForge(window.__game?.engine.renderer).paint((ITEM_MODELS[id] || ITEM_MODELS.golden_apple)(), { w: size, h: size, fit: 0.78, yaw: 0.5, pitch: 0.3 }); }
  catch (e) { pc = new PixelCanvas(size, size); }
  const c = pc.scaled(2); iconCache.set(k, c); return c;
}
