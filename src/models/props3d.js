// Detailed procedural 3D subjects. Used by the card forge (rendered + pixel-stylized) and live in battle.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeNoise } from '../gfx/pixel.js';
import { mulberry32 } from '../core/util.js';
import * as S from './sculpt.js';

const tcache = new Map();
function canvasTex(key, w, h, draw, srgb = true) {
  if (tcache.has(key)) return tcache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  tcache.set(key, t); return t;
}
const std = (o) => new THREE.MeshStandardMaterial({ flatShading: true, ...o });
const phys = (o) => new THREE.MeshPhysicalMaterial({ flatShading: true, ...o });
const M = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };

// ---------- textures ----------
const appleSkin = (ramp = ['#7a0f16', '#b3202a', '#d8402e', '#e9a13c', '#9fbf3c'], key = 'red') => canvasTex('apple:' + key, 256, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, ramp[4]); gr.addColorStop(0.18, ramp[3]); gr.addColorStop(0.35, ramp[2]); gr.addColorStop(0.75, ramp[1]); gr.addColorStop(1, ramp[0]);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const rnd = mulberry32(7);
  for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(${key === 'gold' ? '255,230,140' : '120,10,20'},${0.15 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 2; const x = rnd() * w; g.beginPath(); g.moveTo(x, h * 0.15); g.bezierCurveTo(x + rnd() * 6, h * 0.4, x - rnd() * 6, h * 0.7, x + rnd() * 4, h * 0.95); g.stroke(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,${key === 'gold' ? 250 : 220},${key === 'gold' ? 200 : 160},${0.35 + rnd() * 0.4})`; g.fillRect(rnd() * w, h * 0.1 + rnd() * h * 0.8, 1.5, 1.5); }
});
const woodTex = (key = 'oak', base = '#a8713a', dark = '#5e3a1c') => canvasTex('wood:' + key, 128, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const n = makeNoise(11);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y += 2) { const v = Math.sin((x + n.fbm(x * 0.03, y * 0.01) * 30) * 0.35); if (v > 0.6) { g.fillStyle = dark + '55'; g.fillRect(x, y, 1, 2); } }
  g.globalAlpha = 0.12; for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#fff' : dark; g.fillRect(Math.random() * w, 0, 1, h); } g.globalAlpha = 1;
});
const stoneTex = () => canvasTex('stone', 256, 256, (g, w, h) => {
  const n = makeNoise(5); const id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = n.fbm(x * 0.02, y * 0.02, 5); const c = 70 + v * 120; const i = (y * w + x) * 4; id.data[i] = c * 0.98; id.data[i + 1] = c * 0.96; id.data[i + 2] = c * 1.02; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
});
const earthTex = () => canvasTex('earth', 256, 128, (g, w, h) => {
  const n = makeNoise(21); const id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = (x / w) * Math.PI * 2; const v = n.fbm(Math.cos(a) * 2 + 5, y * 0.035 + Math.sin(a) * 2, 5); const i = (y * w + x) * 4;
    const pol = Math.abs(y / h - 0.5) > 0.42;
    const c = pol ? [235, 240, 245] : v > 0.52 ? (v > 0.62 ? [150, 130, 80] : [80, 140, 60]) : [30, 90, 170];
    id.data[i] = c[0]; id.data[i + 1] = c[1]; id.data[i + 2] = c[2]; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
});
const moonTex = () => canvasTex('moon', 256, 128, (g, w, h) => {
  g.fillStyle = '#b9b4ad'; g.fillRect(0, 0, w, h); const rnd = mulberry32(3);
  for (let i = 0; i < 70; i++) { const x = rnd() * w, y = rnd() * h, r = 2 + rnd() * 9; g.fillStyle = 'rgba(80,76,80,0.35)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, 7); g.fill(); }
});
const stripeTex = (cols, key) => canvasTex('stripe:' + key, 16, 128, (g, w, h) => { const n = cols.length; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * h) / n, w, h / n + 1); }); });

// ---------- shared materials ----------
export const MAT = {
  brass: () => std({ color: 0xd9a64a, metalness: 0.85, roughness: 0.32 }),
  iron: () => std({ color: 0x3a3a42, metalness: 0.7, roughness: 0.45 }),
  steel: () => std({ color: 0xc8ccd6, metalness: 0.9, roughness: 0.22 }),
  chrome: () => std({ color: 0xffffff, metalness: 1, roughness: 0.08 }),
  oak: () => std({ map: woodTex(), roughness: 0.62 }),
  darkwood: () => std({ map: woodTex('dark', '#6e4024', '#2a160c'), roughness: 0.7 }),
  glow: (c, i = 2.4) => std({ color: 0x000000, emissive: new THREE.Color(c), emissiveIntensity: i, roughness: 1 }),
  red: () => std({ color: 0xc8443a, roughness: 0.5 }),
  leaf: () => std({ color: 0x5f9a34, roughness: 0.55, side: THREE.DoubleSide }),
  glass: () => phys({ color: 0xbfe8ff, metalness: 0, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.45, envMapIntensity: 2 }),
};

// ---------- subjects ----------
export function apple({ kind = 'red', leaf = true } = {}) {
  const g = new THREE.Group();
  const prof = [[0.0, -0.46], [0.12, -0.5], [0.3, -0.47], [0.44, -0.36], [0.52, -0.18], [0.55, 0.02], [0.53, 0.2], [0.47, 0.34], [0.36, 0.43], [0.22, 0.45], [0.1, 0.38], [0.03, 0.32], [0.0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, 11); S.warp(geo, { amt: 0.03, seed: 5 });
  // asymmetry: one cheek fuller
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setX(i, x * (1 + 0.06 * Math.max(0, x))); p.setZ(i, z * 0.97); }
  geo.computeVertexNormals();
  const ramps = { red: undefined, gold: ['#7a4a10', '#c08a20', '#f0c040', '#fff0a0', '#fff6cf'], rotten: ['#2a1a10', '#4a3418', '#6b5a24', '#869448', '#b4be6e'], green: ['#2f5a14', '#5f9a24', '#8cc43a', '#d0e070', '#e8f0a0'] };
  const mat = kind === 'gold' ? phys({ map: appleSkin(ramps.gold, 'gold'), metalness: 0.75, roughness: 0.22, clearcoat: 1 })
    : phys({ map: appleSkin(ramps[kind], kind), roughness: kind === 'rotten' ? 0.85 : 0.32, clearcoat: kind === 'rotten' ? 0 : 0.8, clearcoatRoughness: 0.25 });
  g.add(M(geo, mat));
  const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.02, 0.45, 0), new THREE.Vector3(0.08, 0.6, 0.02)]);
  g.add(M(new THREE.TubeGeometry(stem, 8, 0.028, 6), std({ color: 0x5a3622, roughness: 0.9 })));
  if (leaf) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.12, 0.08, 0.3, 0.1, 0.42, 0); s.bezierCurveTo(0.3, -0.1, 0.12, -0.08, 0, 0);
    const lg = new THREE.ShapeGeometry(s, 12); const lp = lg.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i); lp.setZ(i, -x * x * 0.8 + Math.abs(lp.getY(i)) * 0.4); } lg.computeVertexNormals();
    const lm = M(lg, MAT.leaf()); lm.position.set(0.06, 0.5, 0); lm.rotation.set(0.3, -0.4, 0.5); g.add(lm);
    if (kind === 'rotten') lm.visible = false;
  }
  if (kind === 'rotten') for (let i = 0; i < 5; i++) { const sp = M(new THREE.IcosahedronGeometry(0.07, 1), std({ color: 0x2a1a10, roughness: 1 })); const a = i * 1.7; sp.position.set(Math.cos(a) * 0.5, -0.1 + (i % 3) * 0.12, Math.sin(a) * 0.5); sp.scale.set(1, 1, 0.4); sp.lookAt(0, 0, 0); g.add(sp); }
  return g;
}

export function stone({ seed = 3, kind = 'stone' } = {}) {
  const geo = new THREE.IcosahedronGeometry(0.55, 2); const n = makeNoise(seed); const p = geo.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = 1 + (n.fbm(v.x * 2 + 3, v.y * 2 + v.z * 1.3, 4) - 0.5) * 0.55; v.multiplyScalar(d); v.y *= 0.72; p.setXYZ(i, v.x, v.y, v.z); }
  const flat = geo.toNonIndexed(); flat.computeVertexNormals();
  const cols = []; const nn = flat.attributes.normal; const fp = flat.attributes.position;
  const base = { stone: [0.52, 0.5, 0.54], pumice: [0.78, 0.76, 0.72], lodestone: [0.22, 0.2, 0.24], lava: [0.25, 0.12, 0.1] }[kind];
  for (let i = 0; i < fp.count; i += 3) {
    const ny = nn.getY(i); const t = n(fp.getX(i) * 4, fp.getZ(i) * 4) * 0.25;
    let c = base.map((x) => x + t - 0.1);
    if (kind === 'stone' && ny > 0.55 && n(fp.getX(i) * 3 + 9, fp.getZ(i) * 3) > 0.45) c = [0.32, 0.5, 0.2];
    if (kind === 'lava' && ny < 0.3) c = [1.0, 0.45 + t, 0.1];
    for (let k = 0; k < 3; k++) cols.push(...c);
  }
  flat.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const mat = std({ vertexColors: true, map: stoneTex(), roughness: kind === 'lodestone' ? 0.35 : 0.88, metalness: kind === 'lodestone' ? 0.55 : 0, flatShading: true, emissive: kind === 'lava' ? new THREE.Color(0xff5010) : new THREE.Color(0), emissiveIntensity: kind === 'lava' ? 0.6 : 0 });
  const g = new THREE.Group(); g.add(M(flat, mat));
  if (kind === 'pumice') for (let i = 0; i < 14; i++) { const h = M(new THREE.IcosahedronGeometry(0.05, 1), std({ color: 0x55504a })); const a = i * 2.39, b = (i / 14) * Math.PI; h.position.set(Math.sin(b) * Math.cos(a) * 0.5, Math.cos(b) * 0.35, Math.sin(b) * Math.sin(a) * 0.5); g.add(h); }
  return g;
}

export function droplet({ color = 0x2f9ae0 } = {}) {
  const prof = []; for (let i = 0; i <= 24; i++) { const t = i / 24; const y = 0.65 - t * 1.15; const r = t < 0.45 ? Math.pow(t / 0.45, 1.25) * 0.36 : Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.62) / 0.38, 2))) * 0.42; prof.push(new THREE.Vector2(Math.max(0.001, r), y)); }
  const g = new THREE.Group();
  g.add(M(new THREE.LatheGeometry(prof, 11), phys({ color, roughness: 0.03, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.88, emissive: 0x0a3a6a, emissiveIntensity: 0.4 })));
  const hl = M(new THREE.IcosahedronGeometry(0.09, 1), std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 })); hl.position.set(-0.14, 0.05, 0.3); hl.scale.set(0.6, 1.4, 0.4); g.add(hl);
  return g;
}

export function crystalCluster({ color = 0x9fe0ff, n = 5 } = {}) {
  const g = new THREE.Group(); const rnd = mulberry32(4);
  for (let i = 0; i < n; i++) { const h = 0.5 + rnd() * 0.6; const c = M(new THREE.CylinderGeometry(0, 0.12 + rnd() * 0.06, h, 6, 1), phys({ color, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8, flatShading: true })); c.position.set((rnd() - 0.5) * 0.4, h / 2 - 0.3, (rnd() - 0.5) * 0.3); c.rotation.set((rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7); g.add(c); }
  return g;
}

export function bolt({ color = 0xfff0a0 } = {}) {
  const s = new THREE.Shape(); const P = [[0.1, 0.8], [-0.32, 0.02], [-0.04, 0.02], [-0.22, -0.78], [0.36, 0.12], [0.06, 0.12], [0.28, 0.8]];
  s.moveTo(...P[0]); P.slice(1).forEach((p) => s.lineTo(...p)); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }); geo.center();
  const g = new THREE.Group(); g.add(M(geo, std({ color: 0xffe070, emissive: new THREE.Color(color), emissiveIntensity: 1.6, roughness: 0.3 })));
  return g;
}

export function weight({ dark = false, label = '1 kg' } = {}) {
  const g = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(-0.55, -0.4); s.lineTo(0.55, -0.4); s.lineTo(0.38, 0.28); s.lineTo(-0.38, 0.28); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 }); geo.translate(0, 0, -0.25);
  const mat = dark ? std({ color: 0x2a1d44, metalness: 0.5, roughness: 0.35, emissive: 0x6b4c9a, emissiveIntensity: 0.35 }) : MAT.iron();
  g.add(M(geo, mat));
  const h = M(new THREE.TorusGeometry(0.2, 0.065, 10, 24, Math.PI), mat); h.position.y = 0.3; g.add(h);
  const lab = canvasTex('lbl:' + label, 128, 64, (c, w, hh) => { c.font = 'bold 40px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = dark ? '#cdb6f0' : '#c9c4b8'; c.fillText(label, w / 2, hh / 2 + 2); });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), std({ map: lab, transparent: true, roughness: 0.4, metalness: 0.5 })); plane.position.set(0, -0.08, 0.32); plane.rotation.x = -0.12; g.add(plane);
  return g;
}

export function fist({ brutal = false } = {}) {
  const g = new THREE.Group(); const wood = brutal ? MAT.darkwood() : MAT.oak(); const pin = MAT.brass();
  const palm = M(new RoundedBoxGeometry(0.5, 0.5, 0.36, 3, 0.08), wood); g.add(palm);
  for (let i = 0; i < 4; i++) {
    const y = 0.18 - i * 0.12; const f1 = M(new RoundedBoxGeometry(0.2, 0.11, 0.13, 2, 0.04), wood); f1.position.set(0.32, y, 0.06); g.add(f1);
    const f2 = M(new RoundedBoxGeometry(0.11, 0.1, 0.18, 2, 0.04), wood); f2.position.set(0.4, y, -0.06); g.add(f2);
    const p = M(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), pin); p.rotation.x = Math.PI / 2; p.position.set(0.25, y, 0.06); g.add(p);
  }
  const th = M(new RoundedBoxGeometry(0.28, 0.12, 0.13, 2, 0.04), wood); th.position.set(0.1, -0.2, 0.22); th.rotation.z = 0.3; g.add(th);
  const wrist = M(new THREE.IcosahedronGeometry(0.13, 1), wood); wrist.position.x = -0.3; g.add(wrist);
  const arm = M(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 8), wood); arm.rotation.z = Math.PI / 2; arm.position.x = -0.65; g.add(arm);
  const cuff = M(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 8), std({ color: brutal ? 0x8f2a2e : 0x3e2b6b, roughness: 0.8 })); cuff.rotation.z = Math.PI / 2; cuff.position.x = -0.9; g.add(cuff);
  return g;
}

export function top({ cols = ['#c8443a', '#f3e6c4', '#2d6e6a', '#f2c14e', '#c8443a', '#f3e6c4'] } = {}) {
  const prof = [[0, -0.55], [0.06, -0.45], [0.2, -0.3], [0.46, -0.05], [0.5, 0.05], [0.42, 0.14], [0.12, 0.2], [0.07, 0.24], [0.07, 0.55], [0, 0.56]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  g.add(M(new THREE.LatheGeometry(prof, 11), std({ map: stripeTex(cols, cols.join()), roughness: 0.35, metalness: 0.1 })));
  const tip = M(new THREE.ConeGeometry(0.05, 0.12, 10), MAT.steel()); tip.rotation.x = Math.PI; tip.position.y = -0.56; g.add(tip);
  return g;
}

export function rollingBall({ kind = 'brass' } = {}) {
  const g = new THREE.Group();
  const mat = kind === 'snow' ? std({ color: 0xf4f8ff, roughness: 0.9 }) : MAT.brass();
  const b = M(new THREE.IcosahedronGeometry(0.42, 1), mat); b.position.y = 0.1; g.add(b);
  for (const z of [-0.18, 0.18]) { const r = M(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 8), MAT.darkwood()); r.rotation.z = Math.PI / 2; r.position.set(-0.6, -0.34, z); g.add(r); }
  return g;
}

export function flame({ cols = [0xff4a10, 0xff9a20, 0xffe070, 0xffffff], scale = 1 } = {}) {
  const g = new THREE.Group();
  cols.forEach((c, i) => {
    const k = 1 - i * 0.22; const prof = []; for (let j = 0; j <= 16; j++) { const t = j / 16; prof.push(new THREE.Vector2(Math.sin(Math.pow(t, 0.7) * Math.PI) * 0.36 * k * (1 - t * 0.3), -0.45 + t * 1.25 * k)); }
    const geo = new THREE.LatheGeometry(prof, 11); const p = geo.attributes.position; const n = makeNoise(i + 3);
    for (let v = 0; v < p.count; v++) { const y = p.getY(v); const a = Math.atan2(p.getZ(v), p.getX(v)); const w = 1 + (n(a * 2, y * 4) - 0.5) * 0.5 * (y + 0.5); p.setX(v, p.getX(v) * w + Math.sin(y * 5) * 0.04); p.setZ(v, p.getZ(v) * w); }
    geo.computeVertexNormals();
    const m = M(geo, std({ color: 0x000000, emissive: new THREE.Color(c), emissiveIntensity: 1.6 + i * 0.4, transparent: i === 0, opacity: i === 0 ? 0.9 : 1 }), false);
    m.position.z = i * 0.02; g.add(m);
  });
  g.scale.setScalar(scale); return g;
}

export function brazier() {
  const g = new THREE.Group();
  const bowl = M(new THREE.LatheGeometry([[0, -0.1], [0.4, -0.08], [0.55, 0.12], [0.58, 0.18], [0.5, 0.16]].map(([x, y]) => new THREE.Vector2(x, y)), 11), std({ color: 0xb27a30, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
  bowl.position.y = -0.4; g.add(bowl);
  for (let i = 0; i < 3; i++) { const l = M(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), MAT.iron()); const a = (i / 3) * Math.PI * 2; l.position.set(Math.cos(a) * 0.3, -0.7, Math.sin(a) * 0.3); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); g.add(l); }
  const f = flame(); f.position.y = 0.05; f.scale.setScalar(0.85); g.add(f);
  return g;
}

export function magnifier() {
  const g = new THREE.Group();
  const rim = M(new THREE.TorusGeometry(0.42, 0.06, 5, 14), MAT.brass()); g.add(rim);
  const glass = M(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 8), MAT.glass()); glass.rotation.x = Math.PI / 2; g.add(glass);
  const hl = M(new THREE.CircleGeometry(0.12, 16), std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 })); hl.position.set(-0.14, 0.14, 0.03); hl.scale.set(1, 0.55, 1); hl.rotation.z = 0.7; g.add(hl);
  const handle = new THREE.Group(); handle.position.set(0.36, -0.36, 0); handle.rotation.z = Math.PI / 4;
  const fer = M(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8), MAT.brass()); fer.position.y = -0.1; handle.add(fer);
  const h = M(new THREE.CylinderGeometry(0.075, 0.06, 0.6, 8), MAT.darkwood()); h.position.y = -0.47; handle.add(h);
  g.add(handle); return g;
}

export function prism() {
  const g = new THREE.Group(); const s = new THREE.Shape(); s.moveTo(-0.45, -0.38); s.lineTo(0.45, -0.38); s.lineTo(0, 0.42); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }); geo.translate(0, 0, -0.2);
  g.add(M(geo, phys({ color: 0xe0f4ff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, flatShading: true })));
  const beam = M(new THREE.BoxGeometry(1.2, 0.04, 0.04), MAT.glow(0xffffff, 2.5), false); beam.position.set(-0.75, 0.0, 0); beam.rotation.z = -0.1; g.add(beam);
  [0xff3030, 0xff9a20, 0xffe040, 0x60e040, 0x40a0ff, 0x9a50ff].forEach((c, i) => { const r = M(new THREE.BoxGeometry(1.1, 0.035, 0.03), MAT.glow(c, 2.2), false); r.position.set(0.72, -0.02 - i * 0.03, 0); r.rotation.z = -0.12 - i * 0.07; g.add(r); });
  return g;
}

class Helix extends THREE.Curve { constructor(r, h, turns) { super(); this.r = r; this.h = h; this.t = turns; } getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * this.t; return o.set(Math.cos(a) * this.r, -this.h / 2 + t * this.h, Math.sin(a) * this.r); } }
export function spring({ rainbow = false } = {}) {
  const g = new THREE.Group();
  if (rainbow) { const cols = [0xc8443a, 0xf08a2a, 0xf2c14e, 0x9cb84a, 0x6fb7d6, 0x9b7cc8]; for (let i = 0; i < 6; i++) { const c = new Helix(0.34, 0.2, 1); const m = M(new THREE.TubeGeometry(c, 14, 0.05, 5), std({ color: cols[i], roughness: 0.4 })); m.position.y = -0.45 + i * 0.17; g.add(m); } }
  else g.add(M(new THREE.TubeGeometry(new Helix(0.32, 0.95, 6), 72, 0.045, 5), MAT.steel()));
  const base = M(new RoundedBoxGeometry(0.9, 0.12, 0.9, 2, 0.03), MAT.darkwood()); base.position.y = -0.56; g.add(base);
  const cap = M(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 8), MAT.brass()); cap.position.y = 0.5; g.add(cap);
  return g;
}

export function planet({ kind = 'earth', r = 0.5 } = {}) {
  const mat = kind === 'earth' ? std({ map: earthTex(), roughness: 0.7 }) : kind === 'moon' ? std({ map: moonTex(), roughness: 0.95 }) : kind === 'wood' ? MAT.oak() : std({ color: 0x9b7cc8, roughness: 0.5 });
  const g = new THREE.Group(); g.add(M(new THREE.IcosahedronGeometry(r, 1), mat));
  if (kind === 'earth') g.add(M(new THREE.IcosahedronGeometry(r * 1.03, 1), std({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 1 }), false));
  return g;
}

export function cradle() {
  const g = new THREE.Group(); const brass = MAT.brass(); const chrome = MAT.chrome();
  for (const x of [-0.75, 0.75]) for (const z of [-0.25, 0.25]) { const p = M(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), brass); p.position.set(x, 0.05, z); g.add(p); }
  for (const z of [-0.25, 0.25]) { const t = M(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8), brass); t.rotation.z = Math.PI / 2; t.position.set(0, 0.65, z); g.add(t); }
  const base = M(new RoundedBoxGeometry(1.8, 0.1, 0.8, 2, 0.03), MAT.darkwood()); base.position.y = -0.58; g.add(base);
  for (let i = 0; i < 5; i++) {
    const piv = new THREE.Group(); piv.position.set(-0.4 + i * 0.2, 0.65, 0); if (i === 0) piv.rotation.z = -0.6; g.add(piv);
    const ball = M(new THREE.IcosahedronGeometry(0.1, 1), chrome); ball.position.y = -0.85; piv.add(ball);
    for (const z of [-0.25, 0.25]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4), std({ color: 0xffffff })); s.position.set(0, -0.42, z / 2); s.rotation.x = z > 0 ? -0.27 : 0.27; piv.add(s); }
  }
  return g;
}

export function steamEngine() {
  const g = new THREE.Group(); const brass = MAT.brass(); const iron = MAT.iron();
  const cyl = M(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), brass); cyl.rotation.z = Math.PI / 2; cyl.position.set(-0.3, 0.05, 0); g.add(cyl);
  const rod = M(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), MAT.steel()); rod.rotation.z = Math.PI / 2; rod.position.set(0.25, 0.05, 0); g.add(rod);
  const wheel = new THREE.Group(); wheel.position.set(0.55, 0.05, 0.1); g.add(wheel);
  wheel.add(M(new THREE.TorusGeometry(0.32, 0.05, 10, 30), iron));
  for (let i = 0; i < 6; i++) { const s = M(new THREE.BoxGeometry(0.03, 0.62, 0.03), iron); s.rotation.z = (i / 6) * Math.PI; wheel.add(s); }
  const box = M(new RoundedBoxGeometry(0.7, 0.35, 0.5, 2, 0.04), MAT.darkwood()); box.position.set(-0.3, -0.35, 0); g.add(box);
  const f = flame({ scale: 0.3 }); f.position.set(-0.3, -0.33, 0.27); g.add(f);
  for (let i = 0; i < 4; i++) { const p = M(new THREE.IcosahedronGeometry(0.1 + i * 0.04, 1), std({ color: 0xf0f0f4, roughness: 1, transparent: true, opacity: 0.85 }), false); p.position.set(-0.55 - i * 0.05, 0.35 + i * 0.16, -0.05); g.add(p); }
  return g;
}

export function chalkboard() {
  const g = new THREE.Group();
  const tex = canvasTex('chalk', 256, 160, (c, w, h) => {
    c.fillStyle = '#1d3a2f'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(240,240,220,0.9)'; c.lineWidth = 3;
    c.beginPath(); for (let x = 0; x < 200; x++) { const y = 130 - Math.pow(x / 200, 2) * 100; x ? c.lineTo(28 + x, y) : c.moveTo(28, y); } c.stroke();
    c.strokeStyle = '#f2c14e'; c.beginPath(); c.moveTo(110, 120); c.lineTo(230, 40); c.stroke();
    c.fillStyle = 'rgba(240,240,220,0.95)'; c.font = 'italic 36px Georgia'; c.fillText('∫ f(x) dx', 20, 40); c.font = 'italic 22px Georgia'; c.fillText('dy/dx', 180, 140);
  });
  const board = M(new THREE.BoxGeometry(1.6, 1.0, 0.06), [MAT.darkwood(), MAT.darkwood(), MAT.darkwood(), MAT.darkwood(), std({ map: tex, roughness: 0.95 }), MAT.darkwood()]); g.add(board);
  const frame = M(new THREE.BoxGeometry(1.7, 0.08, 0.1), MAT.oak()); frame.position.y = -0.52; g.add(frame);
  return g;
}

export function orrery() {
  const g = new THREE.Group(); const brass = MAT.brass();
  const sun = planet({ kind: 'wood', r: 0.28 }); g.add(sun);
  const ring = M(new THREE.TorusGeometry(0.7, 0.015, 6, 64), brass); ring.rotation.x = Math.PI / 2.4; g.add(ring);
  const arm = M(new THREE.BoxGeometry(0.7, 0.03, 0.03), brass); arm.position.x = 0.35; g.add(arm);
  const moon = planet({ kind: 'moon', r: 0.13 }); moon.position.set(0.7, 0.05, 0); g.add(moon);
  const stand = M(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), brass); stand.position.y = -0.45; g.add(stand);
  const base = M(new THREE.CylinderGeometry(0.3, 0.36, 0.08, 8), MAT.darkwood()); base.position.y = -0.76; g.add(base);
  return g;
}

export function arrow(color = 0xc8443a, len = 0.7) {
  const g = new THREE.Group(); const mat = std({ color, roughness: 0.4, emissive: new THREE.Color(color), emissiveIntensity: 0.25 });
  const s = M(new THREE.CylinderGeometry(0.04, 0.04, len, 8), mat); s.position.y = len / 2; g.add(s);
  const h = M(new THREE.ConeGeometry(0.1, 0.22, 12), mat); h.position.y = len + 0.1; g.add(h);
  return g;
}

export function streaks(n = 5, len = 0.8, color = 0xffffff, spread = 0.5) {
  const g = new THREE.Group(); const rnd = mulberry32(n * 7);
  for (let i = 0; i < n; i++) { const l = len * (0.5 + rnd() * 0.6); const m = M(new THREE.BoxGeometry(l, 0.025, 0.025), std({ color: 0, emissive: new THREE.Color(color), emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }), false); m.position.set(-l / 2, (i / (n - 1) - 0.5) * spread, (rnd() - 0.5) * 0.2); g.add(m); }
  return g;
}

export function swirl(r = 0.75, color = 0xffffff) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const t = M(new THREE.TorusGeometry(r + i * 0.08, 0.018, 6, 40, Math.PI * (0.7 + i * 0.25)), std({ color: 0, emissive: new THREE.Color(color), emissiveIntensity: 1.3, transparent: true, opacity: 0.9 - i * 0.2 }), false); t.rotation.set(Math.PI / 2.3, 0, i * 2.1); g.add(t); }
  return g;
}

export function sparkArcs(color = 0xfff0a0, n = 6) {
  const g = new THREE.Group(); const rnd = mulberry32(n);
  for (let i = 0; i < n; i++) { const pts = []; let p = new THREE.Vector3((rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4, 0.2); const dir = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, 0).normalize(); for (let k = 0; k < 5; k++) { pts.push(p.clone()); p = p.clone().addScaledVector(dir, 0.14).add(new THREE.Vector3((rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1, 0)); } g.add(M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.012, 4), MAT.glow(color, 2.5), false)); }
  return g;
}

export function drops(n = 6) { const g = new THREE.Group(); const rnd = mulberry32(9); for (let i = 0; i < n; i++) { const d = droplet(); d.scale.setScalar(0.18 + rnd() * 0.1); d.position.set((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.0, 0.2); g.add(d); } return g; }

export function tree({ apples = true } = {}) {
  const g = new THREE.Group();
  const trunk = M(new THREE.CylinderGeometry(0.08, 0.14, 0.9, 8), MAT.darkwood()); trunk.position.y = -0.1; g.add(trunk);
  const leafM = std({ color: 0x4f7a2a, roughness: 0.8, flatShading: true });
  for (let i = 0; i < 6; i++) { const b = M(new THREE.IcosahedronGeometry(0.32 + (i % 3) * 0.06, 1), leafM); const a = i * 1.1; b.position.set(Math.cos(a) * 0.28, 0.5 + (i % 2) * 0.15, Math.sin(a) * 0.2); g.add(b); }
  if (apples) for (let i = 0; i < 4; i++) { const ap = apple({ leaf: false }); ap.scale.setScalar(0.18); const a = i * 1.6 + 0.4; ap.position.set(Math.cos(a) * 0.4, 0.38 + (i % 2) * 0.2, Math.sin(a) * 0.3 + 0.12); g.add(ap); }
  return g;
}
