// Halley, the old mop dog (a Komondor), drawn mostly as 2D pixel art on a custom-rigged quadruped: the whole corded
// coat is hundreds of layered pixel-art CORD CARDS (felted, twisted ribbons of hand-pixelled cords: lit left edge, shaded
// right edge, diagonal twist creases with a lit lip, darker roots, sun-bleached frayed tips, bits of dirt; four strip
// variants) hung in shells round the barrel, head, ears, legs and tail, swinging on a lagged spring with his motion. His
// face is a pixel-art card too: a big glossy black nose, the mouth line and lip folds, the muzzle cords, eyes that only
// glint from under the fringe (they blink); a panting frame shows the tongue. Procedural gait (diagonal pairs),
// sniffing, sitting, fetching (an object rides in his mouth), being petted, perking up. Lit realistically, flat-shaded.
import * as THREE from 'three';
import * as T from './toon.js';
import { turned } from '../ui3d/craft.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ---------------------------------------------------------------- the pixel art: cord strips (4 variants) and the face (3 frames)
const WOOL = ['#3a2e22', '#6a5a46', '#948066', '#b8a684', '#d6c8a6', '#ebe0c4', '#faf4e4'];
const DIRT = ['#382a1a', '#64523a', '#8a7552', '#ad9870', '#c8b48c', '#e0d0aa', '#f2e8cc'];
const SW = 30, SH = 72; // one strip: three plump cords side by side
let ATL = null;
function coatAtlas() {
  if (ATL) return ATL; const c = document.createElement('canvas'); c.width = SW * 4; c.height = SH; const g = c.getContext('2d'); const r = mulberry32(1687);
  const px = (x, y, R, t) => { g.fillStyle = R[clamp(Math.round(t), 0, 6)]; g.fillRect(x, y, 1, 1); };
  for (let v = 0; v < 4; v++) for (let k = 0; k < 3; k++) {
    const x0 = v * SW + k * 10, len = SH - 4 - Math.floor(r() * (v === 3 ? 26 : 16)), ph = r() * 6, shade = (r() - 0.5) * 0.8; const R = (v === 2 && k % 2) || (v === 3 && k === 1) ? DIRT : WOOL;
    for (let y = 0; y < len; y++) {
      const t = y / len; const w = 8.6 - t * 2.2; const cx = x0 + 4.6 + Math.sin(y * 0.16 + ph) * 0.6; const xa = Math.round(cx - w / 2), xb = Math.round(cx + w / 2) - 1; const fray = y > len - 4;
      for (let x = xa; x <= xb; x++) {
        if (fray && (x + y) % 2) continue; const rel = (x + 0.5 - cx) / (w / 2); let tn = (rel < -0.5 ? 5 : rel < 0.15 ? 4.2 : rel < 0.6 ? 3.6 : 2.8) + shade;
        const tw = ((y + rel * 3.6 + ph * 5) % 6 + 6) % 6; if (tw < 1) tn -= 1.3; else if (tw < 2.2) tn += 0.7; // twist crease + lit lip (rope-like beads)
        if (y < 10) tn -= (10 - y) * 0.16; if (t > 0.8) tn += 0.8; if (r() < 0.07) tn += r() < 0.5 ? -1 : 1;
        px(x, y, R, x === xb ? Math.min(tn, 2.4) : tn);
      }
      if ((y + k) % 3) px(xb + 1, y, R, 1); // a broken, tinted shadow edge between cords
    }
    px(Math.round(x0 + 4.6), len, R, 1);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestMipmapNearestFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
  ATL = tex; return tex;
}
const FW = 48, FH = 44;
function faceAtlas() { // three frames side by side: calm, panting (tongue), blink
  const c = document.createElement('canvas'); c.width = FW * 3; c.height = FH; const g = c.getContext('2d'); const r = mulberry32(7);
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for (let f = 0; f < 3; f++) {
    const o = f * FW; const cx = o + FW / 2;
    // muzzle fur: short cords falling from the brow, lit left / shaded right, ragged lower edge
    for (let k = 0; k < 9; k++) { const x0 = o + 1 + k * 5.2; const L = 30 + Math.floor(r() * 12) - Math.abs(k - 4) * 1.5; for (let y = 0; y < L; y++) for (let x = Math.round(x0); x < Math.round(x0) + 5; x++) { if (y > L - 3 && (x + y) % 2) continue; const rel = x - x0; let t = rel < 1.5 ? 5 : rel < 3 ? 4 : 3; if (((y + rel * 2 + k * 3) % 7) < 1) t -= 1; if (y < 4) t -= 1; if (rel > 4) t = 2; px(x, y, WOOL[clamp(t, 0, 6)]); } }
    // eyes glinting under the fringe (a dark wet eye, a 1px catchlight), covered again by fringe strands in front
    for (const s of [-1, 1]) { const ex = cx + s * 11, ey = 9; if (f === 2) { for (let i = -2; i <= 2; i++) px(ex + i, ey + 1, '#3a2a1e'); } else { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) px(ex + dx, ey + dy, '#120c0a'); px(ex, ey, '#e8e4dc'); }
      for (const dx of [-3, -1, 1, 3]) for (let y = 2; y < 14; y++) if ((y * 3 + dx * 5 + 70) % 7 > 1) px(ex + dx + (y > 9 ? s : 0), y, WOOL[(y + dx + 9) % 3 ? 5 : 3]); } // strands over the eyes: only glints show
    // the nose: a broad glossy black pad with nostrils, a hard highlight and a cool rim
    const nr = ['....kkkkkkkkkkkk....', '..kkkkkkkkkkkkkkkk..', '.kkkhhhkkkkkkkkkkkk.', 'kkkhwhkkkkkkkkkkkkkk', 'kkkkhkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkkkkkk', 'kkknnkkkkkkkkknnkkkk', '.knnnnkkkkkkknnnnkk.', '..kknkkkkkkkkknkkk..', '....kkkkkbkkkkkk....', '.........kk.........'];
    const nx = cx - 10, ny = 17; nr.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; px(nx + i, ny + j, { k: j > 7 ? '#0a0808' : '#181414', h: '#5a5a66', w: '#e8eef6', n: '#020202', b: '#2a2630' }[ch]); } });
    // philtrum, mouth line, lip folds; the panting frame opens the mouth and lolls the tongue
    for (let y = ny + 11; y < ny + 15; y++) px(cx - 1, y, '#3a2a1e');
    if (f === 1) { const mo = ['..kkkkkkkkkkkkkkk..', '.kddddddddddddddk..', 'kdddtttttttttdddk..', '.kdttTTTTTTTttdk...', '..kttTTTTTTTttk....', '...kttTTTTTttk.....', '....kttTTTttk......', '.....kktttkk.......', '.......kkk.........'];
      mo.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; px(cx - 9 + i, ny + 14 + j, { k: '#1a0c0c', d: '#4a1a1e', t: '#c85a6a', T: '#e88a96' }[ch]); } }); }
    else { for (let i = -8; i <= 8; i++) { const y = ny + 15 + Math.round(Math.abs(i) * 0.22 - (Math.abs(i) > 6 ? 1 : 0)); px(cx + i, y, '#2a1a14'); if (Math.abs(i) > 2) px(cx + i, y + 1, WOOL[2]); } }
    for (const s of [-1, 1]) for (let y = ny + 13; y < ny + 22; y++) px(cx + s * (12 + Math.round((y - ny) * 0.12)), y, WOOL[2]); // lip folds / jowls
    // chin cords hanging below the mouth
    for (let k = 0; k < 6; k++) { const x0 = cx - 13 + k * 4.6; for (let y = ny + 21; y < FH - (k % 2); y++) for (let x = Math.round(x0); x < Math.round(x0) + 4; x++) { if (y > FH - 3 && (x + y) % 2) continue; const rel = x - x0; px(x, y, WOOL[rel < 1.5 ? 4 : rel < 3 ? 3 : 2]); } }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.repeat.set(1 / 3, 1); return tex;
}

// ---------------------------------------------------------------- card shells
/** list: [{ p (root), out (outward dir), len, w, hang = 1, v (variant 0..3), tint }] -> one geometry of bent ribbons */
function cards(list, seed = 1, segs = 5) {
  const r = mulberry32(seed); const P = [], N = [], UV = [], Cc = [], A = [], I = []; const up = V(0, 1, 0); const c = new THREE.Color();
  for (const cd of list) {
    const out = cd.out.clone().normalize(); const oh = V(out.x, 0, out.z); if (oh.lengthSq() < 1e-4) oh.set(0, 0, 1); oh.normalize(); const side = V().crossVectors(up, oh).normalize().applyAxisAngle(oh, (r() - 0.5) * 0.5); const curl = (r() - 0.5) * 0.04; const w = cd.w; const v = cd.v ?? Math.floor(r() * 4); const flip = r() < 0.5;
    const base = P.length / 3; const tint = cd.tint ?? 0.92 + r() * 0.12; c.setRGB(tint, tint * (0.98 + r() * 0.03), tint * (0.95 + r() * 0.05));
    for (let i = 0; i <= segs; i++) {
      const t = i / segs; const q = cd.p.clone().addScaledVector(out, Math.min(t, 0.3) * cd.len * 0.55); q.y -= Math.max(0, t - 0.15) * cd.len * (cd.hang ?? 1); q.addScaledVector(side, Math.sin(t * 3 + curl * 40) * 0.012); q.addScaledVector(oh, t * t * 0.03);
      const ww = w * (1 - t * 0.12); const nrm = oh.clone().addScaledVector(up, 0.25 - t * 0.2).normalize();
      for (const sgn of [-1, 1]) { const qq = q.clone().addScaledVector(side, sgn * ww / 2); P.push(qq.x, qq.y, qq.z); N.push(nrm.x, nrm.y, nrm.z); UV.push((v + ((sgn > 0) !== flip ? 1 : 0)) / 4, 1 - t * 0.97); Cc.push(c.r, c.g, c.b); A.push(t); }
    }
    for (let i = 0; i < segs; i++) { const a = base + i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(A, 1)); g.setIndex(I); g.computeBoundingSphere(); return g;
}
// cards swing with the part they hang from: uSwing is that part's lagged motion in its own space
function cardMat() {
  const U = { uSwing: { value: V() }, uTime: T.WIND.time };
  const m = new THREE.MeshToonMaterial({ map: coatAtlas(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.vertexShader = 'uniform vec3 uSwing; uniform float uTime; attribute float aT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float k = aT * aT; transformed += uSwing * k + vec3(sin(uTime * 2.1 + position.x * 31.0 + position.z * 17.0), 0.0, cos(uTime * 1.7 + position.z * 23.0)) * 0.007 * k;'); };
  m.customProgramCacheKey = () => 'dogCards'; m.userData.U = U; return m;
}

export function createDog({ seed = 1687 } = {}) {
  const r = mulberry32(seed); const root = new THREE.Group(); root.name = 'dog'; root.userData.grassPush = true; root.userData.grassPushR = 0.7;
  const skin = Object.assign(new THREE.MeshToonMaterial({ color: '#a8946e' }), { flatShading: true }); // the felted undercoat between the cords
  const body = new THREE.Group(); body.position.y = 0.5; root.add(body);
  // torso: a long barrel under the coat, hung with two shells of cord cards parting along the spine
  const torso = new THREE.Mesh(turned([[0.001, -0.42], [0.14, -0.4], [0.21, -0.28], [0.23, 0.0], [0.22, 0.24], [0.17, 0.38], [0.001, 0.44]], 10), skin); torso.rotation.x = Math.PI / 2; torso.scale.set(0.84, 1, 0.84); body.add(torso);
  const tc = [];
  for (let layer = 0; layer < 2; layer++) for (let zi = 0; zi < 9; zi++) for (let ai = 0; ai < 10; ai++) {
    const z = -0.4 + (zi + (layer ? 0.5 : 0)) * 0.095 + (r() - 0.5) * 0.03; const side = ai < 5 ? -1 : 1; const th = side * (0.18 + ((ai % 5) / 4) * 1.75 + (layer ? 0.15 : 0)) + (r() - 0.5) * 0.12; if (layer && Math.abs(th) > 1.4) continue;
    const ez = 1 - Math.pow(Math.abs(z) / 0.46, 4); const p = V(Math.sin(th) * 0.18 * ez, Math.cos(th) * 0.16 * ez + 0.03 + layer * 0.03 + (r() - 0.5) * 0.03, z);
    tc.push({ p, out: V(Math.sin(th) + (r() - 0.5) * 0.3, Math.max(0, Math.cos(th)) * 0.5, z * 0.6 + (r() - 0.5) * 0.4), len: 0.38 + r() * 0.16 + Math.abs(Math.sin(th)) * 0.06 + layer * 0.05, w: 0.12 + r() * 0.06, hang: 0.9 + r() * 0.2 });
  }
  for (const zs of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < 8; i++) { const a = (i / 7 - 0.5) * 2.8 + (r() - 0.5) * 0.2; const y = 0.13 - row * 0.09; tc.push({ p: V(Math.sin(a) * 0.15 * (1 - row * 0.1), y, zs * (0.36 + row * 0.03)), out: V(Math.sin(a) * 0.6, 0.15, zs), len: (zs > 0 ? 0.3 : 0.38) + r() * 0.1 - row * 0.04, w: 0.12 + r() * 0.04 }); } // chest and rump
  const torsoM = cardMat(); const torsoC = new THREE.Mesh(cards(tc, seed), torsoM); torsoC.castShadow = true; body.add(torsoC);
  // head on a neck pivot: skull and muzzle under the cords, the pixel-art face card, crown / fringe / ear / cheek cords
  const neck = new THREE.Group(); neck.position.set(0, 0.1, 0.42); body.add(neck); const head = new THREE.Group(); head.position.set(0, 0.12, 0.08); neck.add(head);
  const nc = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; nc.push({ p: V(Math.sin(a) * 0.1, 0.08 + Math.cos(a) * 0.03, 0.04 + Math.cos(a) * 0.06), out: V(Math.sin(a), 0.3, Math.cos(a) * 0.8 + 0.3), len: 0.3 + r() * 0.08, w: 0.13 + r() * 0.03 }); }
  const neckM = cardMat(); const neckC = new THREE.Mesh(cards(nc, seed + 5), neckM); neck.add(neckC);
  const skull = new THREE.Mesh(turned([[0.001, -0.14], [0.11, -0.12], [0.15, -0.02], [0.14, 0.08], [0.09, 0.15], [0.001, 0.17]], 8), skin); skull.rotation.x = Math.PI / 2; skull.scale.set(0.62, 1, 0.62); head.add(skull); // a small inner volume: the cords make the head's shape
  const muzzle = new THREE.Mesh(turned([[0.001, 0], [0.085, 0.02], [0.09, 0.1], [0.07, 0.17], [0.001, 0.19]], 8), skin); muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, -0.04, 0.1); muzzle.scale.set(1, 0.92, 1); head.add(muzzle);
  const faceTex = faceAtlas(); const faceG = new THREE.PlaneGeometry(0.23, 0.23 * FH / FW, 6, 1); { const p = faceG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -x * x * 2.2); } faceG.computeVertexNormals(); }
  const face = new THREE.Mesh(faceG, new THREE.MeshToonMaterial({ map: faceTex, alphaTest: 0.5, side: THREE.DoubleSide })); face.position.set(0, -0.045, 0.3); face.rotation.x = -0.12; face.castShadow = true; head.add(face);
  const mouth = new THREE.Group(); mouth.position.set(0, -0.09, 0.26); head.add(mouth);
  const hc = [];
  for (const [n, y, rad, L] of [[22, 0.14, 0.1, 0.24], [18, 0.07, 0.15, 0.22], [14, 0.0, 0.16, 0.18]]) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.25; if (Math.cos(a) > (y > 0.1 ? 0.6 : 0.35)) continue; hc.push({ p: V(Math.sin(a) * rad, y + r() * 0.02, Math.cos(a) * rad * 0.9 + 0.01), out: V(Math.sin(a), 0.5, Math.cos(a)), len: L + r() * 0.1, w: 0.11 + r() * 0.03 }); } // crown and skull
  for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; hc.push({ p: V(Math.sin(a) * 0.08, -0.08, 0.2 + Math.cos(a) * 0.04), out: V(Math.sin(a), -0.2, 0.6), len: 0.12 + r() * 0.05, w: 0.08 }); } // beard under the muzzle
  for (let i = 0; i < 8; i++) { const x = (i / 7 - 0.5) * 0.25; hc.push({ p: V(x, 0.115, 0.25 - Math.abs(x) * 0.3), out: V(x * 1.5, 0.3, 1), len: 0.15 + r() * 0.04, w: 0.075 + r() * 0.02, hang: 0.95 }); } // the fringe, hanging over the eyes in front of the face
  for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) hc.push({ p: V(sd * 0.015, 0.125, -0.11 + i * 0.03), out: V(sd, 0.9, 0.15), len: 0.21 + r() * 0.08, w: 0.11 + r() * 0.03 }); // the parting along the skull
  for (const s of [-1, 1]) { for (let i = 0; i < 5; i++) hc.push({ p: V(s * (0.13 + r() * 0.03), 0.06 + r() * 0.05, -0.03 + i * 0.03), out: V(s, 0.15, 0.1), len: 0.3 + r() * 0.08, w: 0.11, v: 1 }); // ears
    for (let i = 0; i < 3; i++) hc.push({ p: V(s * 0.085, -0.02, 0.14 + i * 0.05), out: V(s, -0.1, 0.25), len: 0.13 + r() * 0.04, w: 0.08 }); } // cheeks
  const headM = cardMat(); const headC = new THREE.Mesh(cards(hc, seed + 1), headM); headC.castShadow = true; head.add(headC);
  // tail: a tufted pivot at the rump
  const tail = new THREE.Group(); tail.position.set(0, 0.08, -0.44); body.add(tail); const tlc = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; tlc.push({ p: V(Math.cos(a) * 0.04, 0.02 + Math.sin(a) * 0.03, -r() * 0.06), out: V(Math.cos(a) * 0.6, 0.15, -1), len: 0.24 + r() * 0.12, w: 0.1 }); }
  const tailM = cardMat(); const tailC = new THREE.Mesh(cards(tlc, seed + 2), tailM); tailC.castShadow = true; tail.add(tailC);
  // legs: hip pivot -> upper -> knee -> lower -> paw, each sleeved in cord cards
  const legs = []; const legM = cardMat(); const pad = Object.assign(new THREE.MeshToonMaterial({ color: '#3a2e24' }), { flatShading: true });
  for (const [x, z, front] of [[0.12, 0.3, 1], [-0.12, 0.3, 1], [0.12, -0.3, 0], [-0.12, -0.3, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x, -0.08, z); body.add(hip);
    const up = new THREE.Mesh(turned([[0.001, -0.22], [0.05, -0.2], [0.06, -0.08], [0.055, 0.0], [0.001, 0.02]], 6), skin); hip.add(up);
    const knee = new THREE.Group(); knee.position.y = -0.21; hip.add(knee); const lo = new THREE.Mesh(turned([[0.001, -0.2], [0.04, -0.18], [0.045, -0.05], [0.05, 0.0], [0.001, 0.02]], 6), skin); knee.add(lo);
    const paw = new THREE.Mesh(turned([[0.001, 0], [0.05, 0.0], [0.055, 0.03], [0.035, 0.05], [0.001, 0.055]], 7), pad); paw.position.y = -0.21; paw.scale.set(1, 1, 1.3); knee.add(paw);
    const lc = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r() * 0.4; lc.push({ p: V(Math.cos(a) * 0.05, -0.02 - r() * 0.05, Math.sin(a) * 0.05), out: V(Math.cos(a), 0, Math.sin(a)), len: 0.2 + r() * 0.08, w: 0.1 }); }
    const sleeve = new THREE.Mesh(cards(lc, seed + 10 + legs.length, 4), legM); sleeve.castShadow = true; hip.add(sleeve);
    legs.push({ hip, knee, front, side: x > 0 ? 1 : -1 });
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material.alphaTest > 0) o.userData.noInk = true; } });
  const mats = [torsoM, headM, tailM, legM, neckM];
  const setFace = (f) => { faceTex.offset.x = f / 3; };

  // ---------------------------------------------------------------- behaviour
  const st = { pos: root.position, heading: 0, speed: 0, want: 0, target: null, onArrive: null, phase: 0, sit: 0, sitT: 0, sniff: 0, wag: 0.2, pant: 0, look: V(), mode: 'idle', timer: 2, carry: null, hop: 0, hopV: 0, lastVel: V(), swing: V() };
  const api = {
    root, head, mouth, st, area: { x: [-5, 5], z: [-1, 6] }, hAt: () => 0, home: V(0.5, 0, 3.2),
    goTo(p, speed = 0.7, onArrive = null) { st.target = p.clone ? p : V(p.x, 0, p.z); st.want = speed; st.onArrive = onArrive; st.sitT = 0; },
    sitFor(sec = 3) { st.target = null; st.want = 0; st.sitT = sec; },
    sniffFor(sec = 2) { st.target = null; st.want = 0; st.sniff = sec; },
    pet() { if (st.mode === 'fetch' || st.mode === 'return') return; st.mode = 'pet'; api.sitFor(2.6); st.wag = 1.4; st.pant = 2.6; st.hopV = 1.6; st.timer = 2.6; },
    // fetch a thrown thing (obj.position is read every frame), carry it home, drop it, wag
    fetch(obj, onDone) { st.mode = 'fetch'; st.fetchObj = obj; st.onDone = onDone; st.wag = 0.9; st.sitT = 0; api.goTo(obj.position, 2.3); },
    update(dt, t) {
      dt = Math.min(dt, 0.05);
      // brain
      if (st.mode === 'fetch' && st.fetchObj) { st.target = st.fetchObj.position; if (st.pos.distanceTo(V(st.fetchObj.position.x, st.pos.y, st.fetchObj.position.z)) < 0.42 && st.fetchObj.position.y < st.pos.y + 0.35) { st.carry = st.fetchObj; st.carry.userData.carried = true; mouth.add(st.carry); st.carry.position.set(0, 0, 0); st.mode = 'return'; st.fetchObj = null; st.sniff = 0; api.goTo(api.home, 1.8); } }
      if (st.mode === 'return' && !st.target) { const it = st.carry; if (it) { it.getWorldPosition(it.position); mouth.remove(it); it.userData.carried = false; it.userData.dropped = true; root.parent?.add(it); } st.carry = null; st.mode = 'pet'; st.wag = 1.5; st.pant = 3; api.sitFor(2.8); st.timer = 3; st.onDone?.(it); }
      if (st.mode === 'pet' || st.mode === 'idle') {
        st.timer -= dt;
        if (st.timer <= 0 && !st.target) {
          if (st.mode === 'pet') st.mode = 'idle';
          const k = Math.random(); if (k < 0.45) { const A = api.area; api.goTo(V(A.x[0] + Math.random() * (A.x[1] - A.x[0]), 0, A.z[0] + Math.random() * (A.z[1] - A.z[0])), 0.55 + Math.random() * 0.25); st.timer = 3; }
          else if (k < 0.75) { api.sniffFor(1.6 + Math.random() * 2); st.timer = 2 + Math.random() * 2; } else { api.sitFor(3 + Math.random() * 3); st.timer = 3 + Math.random() * 3; }
        }
      }
      // locomotion: steer, accelerate, arrive
      if (st.target) { const to = V(st.target.x - st.pos.x, 0, st.target.z - st.pos.z); const d = to.length(); const h = Math.atan2(to.x, to.z); st.heading += angDiff(st.heading, h) * (1 - Math.exp(-dt * (st.want > 1.2 ? 7 : 4))); const arrive = clamp(d / 0.6, 0, 1); st.speed = damp(st.speed, st.want * arrive * (0.4 + 0.6 * Math.max(0, Math.cos(angDiff(st.heading, h)))), 5, dt);
        if (d < (st.mode === 'fetch' ? 0.2 : 0.12)) { st.target = null; st.want = 0; const cb = st.onArrive; st.onArrive = null; cb?.(); } }
      else st.speed = damp(st.speed, 0, 6, dt);
      const vx = Math.sin(st.heading) * st.speed, vz = Math.cos(st.heading) * st.speed; st.pos.x += vx * dt; st.pos.z += vz * dt; st.pos.y = api.hAt(st.pos.x, st.pos.z); root.rotation.y = st.heading;
      // gait, sitting, sniffing, wagging, panting, a happy hop
      const run = clamp(st.speed / 2.3, 0, 1); st.phase += dt * st.speed * (Math.PI * 2 / (0.55 + run * 0.4));
      st.sitT = Math.max(0, st.sitT - dt); st.sit = damp(st.sit, st.sitT > 0 && st.speed < 0.2 ? 1 : 0, 5, dt); st.sniff = Math.max(0, st.sniff - dt);
      const walk = clamp(st.speed / 0.4, 0, 1) * (1 - st.sit); const sn = st.sniff > 0 ? 1 : 0;
      for (const L of legs) { const off = (L.front ? 0 : Math.PI) + (L.side > 0 ? 0 : Math.PI) + (run > 0.5 ? (L.front ? 0 : 0.6) : 0); const s = Math.sin(st.phase + off), c = Math.cos(st.phase + off);
        const sitK = L.front ? 0 : st.sit; L.hip.rotation.x = s * 0.55 * walk * (0.7 + run * 0.6) - sitK * 1.25 + (L.front ? st.sit * 0.15 : 0); L.knee.rotation.x = Math.max(0, -c) * 0.8 * walk + sitK * 2.2; }
      st.hopV -= dt * 9; st.hop = Math.max(0, st.hop + st.hopV * dt); if (st.hop === 0) st.hopV = Math.max(0, st.hopV);
      body.position.y = 0.5 - st.sit * 0.12 + Math.abs(Math.sin(st.phase)) * 0.035 * walk * (1 + run) + Math.sin(t * 1.8) * 0.006 + st.hop; body.rotation.x = -st.sit * 0.42 + Math.sin(st.phase * 2) * 0.03 * walk + sn * 0.12; body.position.z = -st.sit * 0.06;
      body.rotation.z = Math.sin(st.phase) * 0.04 * walk;
      st.wag = damp(st.wag, Math.max((st.perk || 0) * 1.2, st.mode === 'pet' ? 1.4 : st.mode === 'return' || st.mode === 'fetch' ? 0.9 : 0.25), 1.2, dt); tail.rotation.y = Math.sin(t * (6 + st.wag * 10)) * 0.5 * st.wag; tail.rotation.x = -0.4 * st.wag - 0.1;
      st.pant = Math.max(0, st.pant - dt); const pant = st.pant > 0 || run > 0.5 ? 1 : 0; st.blink = (st.blink ?? 3) - dt; if (st.blink < -0.14) st.blink = 2 + Math.random() * 4; setFace(pant > 0 && !st.carry && Math.sin(t * 14) > -0.6 ? 1 : st.blink < 0 ? 2 : 0);
      neck.rotation.x = sn * (0.75 + Math.sin(t * 9) * 0.06) - st.sit * 0.35 + (st.mode === 'pet' ? -0.35 : 0) - (st.carry ? 0.15 : 0) - (st.perkK = damp(st.perkK || 0, st.perk || 0, 6, dt)) * 0.32; /* perked up: head high, ears lifted with it */ head.rotation.y = damp(head.rotation.y, sn ? Math.sin(t * 2.3) * 0.35 : Math.sin(t * 0.5) * 0.2, 3, dt); head.rotation.z = st.mode === 'pet' ? Math.sin(t * 2) * 0.18 : 0;
      // the coat swings against the motion (a lagged spring on the body's velocity)
      const acc = V(vx, 0, vz).sub(st.lastVel).divideScalar(Math.max(dt, 1e-3)); st.lastVel.set(vx, 0, vz); const local = V(-(acc.x * Math.cos(st.heading) - acc.z * Math.sin(st.heading)), -st.hopV * 0.4, -(acc.x * Math.sin(st.heading) + acc.z * Math.cos(st.heading)));
      st.swing.lerp(local.multiplyScalar(0.012).clampLength(0, 0.08).add(V(0, 0, -st.speed * 0.02)), 1 - Math.exp(-dt * 6));
      for (const m of mats) m.userData.U.uSwing.value.copy(st.swing);
      root.updateMatrixWorld();
    },
  };
  return api;
}
