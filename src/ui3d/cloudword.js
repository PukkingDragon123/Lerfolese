// CLOUD LETTERING: menu words whose letters are MADE OF CLOUD (the LERFOLESE tower menu). Each glyph of Alagard is
// rasterised, its strokes found by a distance transform, and the strokes filled with faceted low-poly cumulus puffs
// sized to the stroke (a disc packing along the medial axis), so the letter reads crisply while every part of it is
// cloud: billowing tops (puffs on a stroke's upper edge swell and rise), FLAT BASES (puff undersides on a lower edge
// are sheared flat), a violet-grey belly and sun-warmed crowns baked into the vertex colours, pixel grain on the faces,
// and a few torn wisps trailing downwind. Letters are separate meshes so they drift and breathe on their own.
//   idle   : each letter bobs and leans on its own phase, the wisps stream and re-form, the whole word drifts
//   hover  : a swell runs through the letters (they lift and puff up one after another), a warm light kindles inside
//            the word (light, not a glow sprite), the faces brighten, little cloud puffs break off the crowns
//   press  : the letters squash and spring back in a ripple; a burst of pixel puff particles
//   const W = await cloudWord('New Game', { height: 1.1 }); scene.add(W.group); W.update(dt, t, hovered); W.press(motes)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { grainTex } from '../models/vista.js';
import { Spring } from '../core/tween.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const OCC = new THREE.MeshBasicMaterial({ color: 0x7f7fff }); // ink occluder: the cloud hides outlines behind it without drawing its own facets
// a KEY light of its own: the low sun's warmth wrapped toward the viewer (view-space direction set each frame), so the
// lettering always reads as sunlit cumulus (cream crowns, peach flanks, violet bellies) whatever the scene light does
const KEY = { uKeyDir: { value: new THREE.Vector3(-0.6, 0.5, 0.6).normalize() }, uKey: { value: new THREE.Color(1.15, 0.84, 0.62) }, uHot: { value: 0 } };
function keyed(m, hot = false) { m.onBeforeCompile = (sh) => { sh.uniforms.uKeyDir = KEY.uKeyDir; sh.uniforms.uKey = KEY.uKey; sh.uniforms.uHot = { value: hot ? 1 : 0 };
    sh.fragmentShader = 'uniform vec3 uKeyDir; uniform vec3 uKey; uniform float uHot;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `float kd = max(dot(normal, uKeyDir), 0.0); kd = floor(kd * 4.0 + 0.35) / 4.0; float rim = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
      outgoingLight += diffuseColor.rgb * uKey * (kd * 0.95 + rim * 0.25) + diffuseColor.rgb * vec3(1.0, 0.72, 0.5) * uHot * (0.25 + kd * 0.35);
      #include <opaque_fragment>`); }; m.customProgramCacheKey = () => 'cloudWord' + (hot ? 'H' : ''); return m; }
let MAT = null, HOT = null;
export const cloudWordMat = () => MAT || (MAT = keyed(new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), color: new THREE.Color('#ffffff'), roughness: 1, metalness: 0, flatShading: true, emissive: new THREE.Color('#3e3050'), emissiveIntensity: 0.55 })));
const hotMat = () => HOT || (HOT = keyed(new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), color: new THREE.Color('#ffffff'), roughness: 1, metalness: 0, flatShading: true, emissive: new THREE.Color('#5a3a40'), emissiveIntensity: 0.6 }), true));
const FS = 120; // raster font size (px)

/** rasterise one glyph and return { grid, w, h, cell } in cells (y down) */
function glyphCells(ch, font, capCells) {
  const c = document.createElement('canvas'); const g = c.getContext('2d'); g.font = `${FS}px ${font}`; const w = Math.ceil(g.measureText(ch).width) + 24, h = Math.ceil(FS * 1.5);
  c.width = w; c.height = h; g.font = `${FS}px ${font}`; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.fillText(ch, 12, Math.round(FS * 1.1));
  const img = g.getImageData(0, 0, w, h).data; const capPx = FS * 0.66; const cell = capPx / capCells; const W = Math.ceil(w / cell), H = Math.ceil(h / cell);
  const grid = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const px = Math.min(w - 1, Math.floor((x + 0.5) * cell)), py = Math.min(h - 1, Math.floor((y + 0.5) * cell)); grid[y * W + x] = img[(py * w + px) * 4 + 3] > 110 ? 1 : 0; }
  return { grid, W, H, cell, base: Math.round(FS * 1.1) / cell };
}
/** chamfer distance (in cells) from each filled cell to the nearest empty one */
function distField(grid, W, H) {
  const D = new Float32Array(W * H); const INF = 1e6; for (let i = 0; i < W * H; i++) D[i] = grid[i] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : D[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!D[i]) continue; D[i] = Math.min(D[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!D[i]) continue; D[i] = Math.min(D[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414); }
  return D;
}
/** one faceted puff: a jittered icosahedron, its base sheared flat when it sits on a lower edge; baked belly / crown colours */
function puff(rad, seed, { flat = 0, warm = 0.5 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(); const p = g.attributes.position; const r = mulberry32(seed);
  const jit = new Map(); for (let k = 0; k < p.count; k++) { const key = `${p.getX(k).toFixed(3)},${p.getY(k).toFixed(3)},${p.getZ(k).toFixed(3)}`; if (!jit.has(key)) jit.set(key, 1 + (r() - 0.5) * 0.18); const q = jit.get(key); let y = p.getY(k) * q; if (y < 0) y *= 1 - flat * 0.65; p.setXYZ(k, p.getX(k) * q * 1.08, y, p.getZ(k) * q * 0.8); }
  g.scale(rad, rad, rad); g.computeVertexNormals();
  const col = new Float32Array(p.count * 3); const belly = new THREE.Color('#7a6a8e'), mid = new THREE.Color('#d8ccd8'), crown = new THREE.Color('#fffaf2'), sun = new THREE.Color('#ffd8b0'); const c = new THREE.Color();
  for (let k = 0; k < p.count; k++) { const y = p.getY(k) / rad; c.copy(belly).lerp(mid, sm(-0.9, 0.1, y)).lerp(crown, sm(0.0, 0.85, y)); c.lerp(sun, sm(0.2, 1, -p.getX(k) / rad) * warm * 0.5); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}

/** build the lettering. height = cap height in world units. Returns { group, update, press, hit, width } */
export async function cloudWord(text, { height = 1, font = 'Alagard', seed = 1, capCells = 30, maxW = Infinity } = {}) {
  try { await document.fonts?.load(`${FS}px ${font}`); } catch (e) { /* the fallback font still reads */ }
  const G = new THREE.Group(); G.name = 'cloudWord:' + text; const r = mulberry32(seed * 97 + 5);
  const mc = document.createElement('canvas').getContext('2d'); mc.font = `${FS}px ${font}`; const capPx = FS * 0.66;
  let k = height / capPx; const total = mc.measureText(text).width * k * 1.06; if (total > maxW) k *= maxW / total; const unit = k; // world units per raster px
  const letters = []; const x0 = -mc.measureText(text).width * 1.06 * unit / 2;
  for (let i = 0; i < text.length; i++) { const ch = text[i]; if (ch === ' ') continue; const xOff = mc.measureText(text.slice(0, i)).width * 1.06 * unit;
    const { grid, W, H, cell, base } = glyphCells(ch, font, capCells); const D = distField(grid, W, H); const cu = cell * unit; // world units per cell
    const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (D[y * W + x] >= 1) cells.push([x, y, D[y * W + x]]);
    cells.sort((a, b) => b[2] - a[2] || (r() - 0.5)); // fat strokes first
    const placed = []; const parts = [];
    for (const [x, y, d] of cells) { let cov = false; for (const [px, py, pr] of placed) { if ((px - x) ** 2 + (py - y) ** 2 < (pr * 0.62) ** 2) { cov = true; break; } } if (cov) continue;
      const up = D[Math.max(0, y - Math.ceil(d + 1)) * W + x] === 0, down = D[Math.min(H - 1, y + Math.ceil(d + 1)) * W + x] === 0; // on an upper / lower edge of the stroke
      const rad = Math.max(1.1, d * 1.08) * (up ? 1.12 : 1); placed.push([x, y, rad]);
      const g = puff(rad * cu, Math.floor(r() * 1e6), { flat: down ? 1 : 0.35, warm: 0.6 }); g.rotateY((r() - 0.5) * 0.8); g.rotateZ((r() - 0.5) * 0.5);
      g.translate((x + 0.5) * cu, -(y + 0.5 - base) * cu + (up ? rad * cu * 0.1 : 0), (r() - 0.5) * rad * cu * 0.5 - (down ? rad * cu * 0.15 : 0)); parts.push(g); }
    // a few small crown puffs along the top edges (the billows), kept inside the letter's silhouette
    for (let q = 0; q < 3 && placed.length; q++) { const [px, py, pr] = placed[Math.floor(r() * Math.min(placed.length, 6))]; const g = puff(pr * 0.55 * cu, Math.floor(r() * 1e6), { flat: 0, warm: 0.8 }); g.translate((px + 0.5 + (r() - 0.5) * pr) * cu, -(py + 0.5 - base) * cu + pr * cu * 0.55, pr * cu * 0.25); parts.push(g); }
    if (!parts.length) continue; const geo = mergeGeometries(parts); geo.computeBoundingBox(); const bb = geo.boundingBox; const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2; geo.translate(-cx, -cy, 0);
    const m = new THREE.Mesh(geo, cloudWordMat()); m.userData.inkOccluder = OCC; m.castShadow = false; m.receiveShadow = false;
    const holder = new THREE.Group(); holder.position.set(x0 + xOff + cx - 12 * unit, cy, 0); holder.add(m); G.add(holder);
    letters.push({ holder, m, home: holder.position.clone(), ph: r() * 10, i: letters.length, sw: new Spring(0, 9, 0.45) }); }
  // wisps: thin torn streamers trailing downwind off the word, re-forming on a cycle
  const wisps = []; const bb = new THREE.Box3().setFromObject(G); const WW = bb.max.x - bb.min.x, HH = bb.max.y - bb.min.y;
  for (let i = 0; i < 5; i++) { const g = puff(height * (0.1 + r() * 0.08), Math.floor(r() * 1e6), { flat: 0.6, warm: 0.4 }); g.scale(2.6, 0.5, 0.8); const m = new THREE.Mesh(g, cloudWordMat()); m.userData.inkOccluder = OCC; G.add(m);
    wisps.push({ m, y: bb.min.y + HH * (0.15 + r() * 0.7), x: bb.min.x + r() * WW, ph: r(), sp: 0.05 + r() * 0.05 }); }
  const lamp = new THREE.PointLight(0xffc080, 0, 6 * height, 1.6); lamp.position.set(0, 0, 0.9 * height); G.add(lamp);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(WW + height * 0.4, HH + height * 0.4, height * 1.2), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, 0); G.add(hit);
  const hov = new Spring(0, 6, 0.6), vis = new Spring(1, 5, 0.85); let wave = -1, pressT = -1; const mat = cloudWordMat();
  const api = {
    group: G, hit, letters, width: WW, height: HH, hov, vis, label: text,
    update(dt, t, hovered, camera = null, sunDir = null) {
      if (camera && sunDir) { const f = V(0, 0, 1).applyQuaternion(camera.quaternion); KEY.uKeyDir.value.copy(sunDir).setY(Math.max(0.35, sunDir.y)).normalize().addScaledVector(f, 0.9).normalize().transformDirection(camera.matrixWorldInverse); } hov.target = hovered ? 1 : 0; hov.update(dt); vis.update(dt); const h = Math.max(0, hov.value), v = Math.max(0.001, vis.value);
      if (hovered && wave < 0) wave = 0; if (wave >= 0) { wave += dt * 2.2; if (wave > 1.6 + letters.length * 0.12) wave = hovered ? -2 : -1; } if (!hovered && wave === -2) wave = -1;
      if (pressT >= 0) { pressT += dt; if (pressT > 1.5) pressT = -1; }
      for (const L of letters) { const tt = t + L.ph; const sw = wave >= 0 ? Math.max(0, 1 - Math.abs(wave - L.i * 0.12 - 0.3) * 2.2) : 0; const pr = pressT >= 0 ? Math.max(0, 1 - Math.abs(pressT * 3 - L.i * 0.12) * 2) : 0;
        L.holder.position.set(L.home.x + Math.sin(tt * 0.5) * 0.02 * height, L.home.y + Math.sin(tt * 0.8) * 0.05 * height + sw * 0.18 * height + h * 0.04 * height - pr * 0.12 * height, L.home.z + Math.sin(tt * 0.6) * 0.04 * height);
        L.holder.rotation.z = Math.sin(tt * 0.45) * 0.035 + sw * 0.05; L.holder.rotation.y = Math.sin(tt * 0.33) * 0.12;
        const s = v * (1 + Math.sin(tt * 1.1) * 0.012 + sw * 0.1 + h * 0.03) ; L.holder.scale.set(s * (1 + pr * 0.12), s * (1 - pr * 0.14), s); }
      for (const w of wisps) { const u = (t * w.sp + w.ph) % 1; const fade = Math.sin(u * Math.PI); w.m.position.set(w.x + u * WW * 0.5 + 0.2 * height, w.y + Math.sin(t * 0.7 + w.ph * 9) * 0.05 * height, -0.2 * height); w.m.scale.set(v * fade * (0.6 + u), v * fade, v * fade); }
      lamp.intensity = (h * 9 + (pressT >= 0 ? 6 : 0)) * v; for (const L of letters) L.m.material = h > 0.05 ? hotMat() : mat; },
    press(motes) { pressT = 0;
      if (motes) { const p = G.getWorldPosition(V()); for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 1.2; const sp = (0.8 + Math.random() * 1.8) * height;
        motes.spawn({ pos: [p.x + (Math.random() - 0.5) * WW, p.y + (Math.random() - 0.5) * HH, p.z], vel: [Math.cos(a) * sp, Math.sin(e) * sp * 0.6 + 0.2, Math.sin(a) * sp * 0.5], drag: 2.8, grav: -0.05, life: 0.9 + Math.random() * 0.7, seq: 'puff', fps: 4, once: true, color: Math.random() < 0.6 ? '#f4e8e4' : '#e0c0c8', bright: 0.9, k: Math.random() < 0.3 ? 2 : 1, fadeIn: 0.02 }); } } },
    crownPoint(out = V()) { const L = letters[Math.floor(Math.random() * letters.length)]; if (!L) return G.getWorldPosition(out); return L.holder.getWorldPosition(out).add(V(0, HH * 0.4, 0)); },
    dispose() { G.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); },
  };
  return api;
}
