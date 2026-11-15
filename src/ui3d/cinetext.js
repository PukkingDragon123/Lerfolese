// CINEMATIC LETTERING (menu agent): Alagard rendered HIGH-RES as real 3D cast type. The font's own pixel outline
// (Alagard at its native 16 px grid, where every glyph is exactly drawn) is traced into vector contours, the pixel
// stair-steps of its diagonals and curves are cut into clean straight facets (a stepped edge between two opposite
// turns is replaced by its diagonal; every other corner gets a small chamfer), and the outline is extruded with a
// real 45-degree BEVEL. So the letters are sharp, crisp and faceted at any size (never blocky, never blurred) and
// they catch the light like cast metal or cut stone: a bright chamfer, darker walls, a dark physical backing plate
// for the thin ink outline, the scene's image-based reflections, plus a cinematic key / rim / travelling-shimmer
// term of their own so they read in any light.
//   const T = cineText('New Game', { height: 0.8, style: 'gold' }); scene.add(T);  T.userData.size -> [w, h]
//   T.userData.U: { uKeyDir, uSweep, uShine, uRim, uGlow } (shared uniforms: animate the shimmer / glow)
//   styles: gold | silver | bronze | stone | ivory | starlight | ember
import * as THREE from 'three';
import { runMask } from './craft.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
export const CINE = {
  gold: { face: '#e9b452', wall: '#7a4612', back: '#0e0604', metal: 0.95, rough: 0.28, top: 1.18, bot: 0.5, key: [1.0, 0.84, 0.58], rim: [0.62, 0.7, 1.0], glow: '#ff9a30' },
  silver: { face: '#d4dae8', wall: '#4e5468', back: '#06070c', metal: 0.95, rough: 0.24, top: 1.15, bot: 0.55, key: [0.9, 0.92, 1.0], rim: [0.6, 0.8, 1.0], glow: '#9ab8ff' },
  starlight: { face: '#e6ecff', wall: '#3c4470', back: '#04040a', metal: 0.7, rough: 0.2, top: 1.2, bot: 0.6, key: [0.86, 0.9, 1.0], rim: [0.7, 0.62, 1.0], glow: '#8aa8ff' },
  bronze: { face: '#c88848', wall: '#5a2e12', back: '#0c0604', metal: 0.9, rough: 0.36, top: 1.15, bot: 0.5, key: [1.0, 0.8, 0.56], rim: [0.6, 0.7, 1.0], glow: '#ff8a3a' },
  stone: { face: '#b8ae9c', wall: '#4e463c', back: '#100e0c', metal: 0.0, rough: 0.86, top: 1.12, bot: 0.62, key: [1.0, 0.9, 0.76], rim: [0.6, 0.66, 0.9], glow: '#ffd090' },
  ivory: { face: '#efe2c6', wall: '#7a6448', back: '#140e08', metal: 0.05, rough: 0.55, top: 1.1, bot: 0.66, key: [1.0, 0.9, 0.74], rim: [0.6, 0.7, 1.0], glow: '#ffe0a0' },
  ember: { face: '#ff9a48', wall: '#6a200a', back: '#0c0402', metal: 0.6, rough: 0.4, top: 1.25, bot: 0.5, key: [1.0, 0.7, 0.4], rim: [1.0, 0.5, 0.3], glow: '#ff5a1a' },
};

// ---------------------------------------------------------------- mask -> 2x grid (diagonal touches bridged) -> contours
function grid2(str, font) {
  const m = runMask(str, font); const y0 = m.top ?? -m.by, y1 = m.bot ?? 0; const pad = 2; const W = m.w + 4 + pad * 2, H = y1 - y0 + pad * 2;
  const on = (x, y) => m.on(x - pad, y + y0 - pad); const A = []; let top = H, bot = -1, left = W, right = -1;
  for (let y = 0; y < H; y++) { const row = new Uint8Array(W); for (let x = 0; x < W; x++) if (on(x, y)) { row[x] = 1; top = Math.min(top, y); bot = Math.max(bot, y); left = Math.min(left, x); right = Math.max(right, x); } A.push(row); }
  if (bot < 0) return null;
  const W2 = W * 2, H2 = H * 2; const G = Array.from({ length: H2 }, (_, y) => { const r = new Uint8Array(W2); for (let x = 0; x < W2; x++) r[x] = A[y >> 1][x >> 1]; return r; });
  const a = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? A[y][x] : 0);
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) { const tl = a(x - 1, y - 1), tr = a(x, y - 1), bl = a(x - 1, y), br = a(x, y); // checkerboard corner: bridge it
    if (tl && br && !tr && !bl) { G[2 * y - 1][2 * x] = 1; G[2 * y][2 * x - 1] = 1; } else if (tr && bl && !tl && !br) { G[2 * y - 1][2 * x - 1] = 1; G[2 * y][2 * x] = 1; } }
  return { G, W2, H2, box: [left * 2, top * 2, (right + 1) * 2, (bot + 1) * 2] };
}
function dilate2(G, W, H) { return G.map((row, y) => row.map((v, x) => { if (v) return 1; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (G[y + dy]?.[x + dx]) return 1; return 0; })); }
/** closed rectilinear loops around the filled cells (y down), each a list of integer corner points with no collinear runs */
function trace(G, W, H) {
  const out = new Map(); const key = (x, y) => y * (W + 2) + x; const f = (x, y) => y >= 0 && y < H && x >= 0 && x < W && G[y][x];
  const edge = (x0, y0, x1, y1) => { const k = key(x0, y0); (out.get(k) || out.set(k, []).get(k)).push([x1, y1]); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!G[y][x]) continue;
    if (!f(x, y - 1)) edge(x, y, x + 1, y); if (!f(x + 1, y)) edge(x + 1, y, x + 1, y + 1); if (!f(x, y + 1)) edge(x + 1, y + 1, x, y + 1); if (!f(x - 1, y)) edge(x, y + 1, x, y); }
  const loops = [];
  for (const [k0, list] of out) while (list.length) { const sx = k0 % (W + 2), sy = Math.floor(k0 / (W + 2)); const pts = [[sx, sy]]; let [cx, cy] = list.pop(); let guard = 0;
    while (!(cx === sx && cy === sy) && guard++ < 100000) { pts.push([cx, cy]); const l = out.get(key(cx, cy)); if (!l || !l.length) break; [cx, cy] = l.pop(); }
    loops.push(simplify(pts)); }
  return loops.filter((l) => l.length >= 3);
}
function simplify(p) { const o = []; const n = p.length; for (let i = 0; i < n; i++) { const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n]; const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cr) > 1e-9) o.push(b); } return o; }
/** cut the pixel stairs into facets: an edge between two opposite turns is a stair step (cut to its midpoint, so a
 *  staircase becomes its diagonal); any other corner gets a small chamfer */
function facetize(p, C = 0.55) {
  const n = p.length; if (n < 4) return p; const turn = (i) => { const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n]; return Math.sign((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])); };
  const T = p.map((_, i) => turn(i)); const L = p.map((a, i) => { const b = p[(i + 1) % n]; return Math.hypot(b[0] - a[0], b[1] - a[1]); }); // edge i: p[i] -> p[i+1]
  const cut = (i) => { const step = T[i] !== T[(i + 1) % n]; return step ? Math.min(L[i] / 2, 1.0) : Math.min(L[i] * 0.25, C); }; // how much each end of edge i is cut
  const o = [];
  for (let i = 0; i < n; i++) { const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n]; const li = L[(i - 1 + n) % n], lo = L[i]; const di = cut((i - 1 + n) % n), dout = cut(i);
    o.push([b[0] - ((b[0] - a[0]) / li) * di, b[1] - ((b[1] - a[1]) / li) * di]); o.push([b[0] + ((c[0] - b[0]) / lo) * dout, b[1] + ((c[1] - b[1]) / lo) * dout]); }
  const d = []; for (const q of o) { const l = d[d.length - 1]; if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 1e-6) d.push(q); } if (d.length > 1 && Math.hypot(d[0][0] - d[d.length - 1][0], d[0][1] - d[d.length - 1][1]) < 1e-6) d.pop();
  return simplify(d);
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function inside(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/** loops (y down, grid units) -> THREE.Shapes in y-up units centred on (cx, cy) */
function shapesOf(loops, cx, cy, smooth = true) {
  const P = loops.map((l) => (smooth ? facetize(l) : l).map(([x, y]) => [x - cx, cy - y])); // y up
  const outers = [], holes = []; for (const p of P) (area(p) < 0 ? outers : holes).push(p); // traced clockwise on screen = negative area in y-up for solids
  const S = outers.map((o) => ({ o, a: Math.abs(area(o)), h: [] }));
  for (const h of holes) { let best = null; for (const s of S) if (inside(h[0], s.o) && (!best || s.a < best.a)) best = s; if (best) best.h.push(h); }
  return S.map(({ o, h }) => { const s = new THREE.Shape(o.map(([x, y]) => V2(x, y))); for (const q of h) s.holes.push(new THREE.Path(q.map(([x, y]) => V2(x, y)))); return s; });
}

// ---------------------------------------------------------------- materials: cast metal with a cinematic light of its own
let faceTexCache = null;
function hammered() { // a fine hand-pixelled hammered / brushed grain (32 x 32, seamless), subtle on the letter face
  if (faceTexCache) return faceTexCache; const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const h = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const v = h(x, y), w = h(x * 0.37 + 9, y * 1.3); let l = 240 + (v > 0.86 ? 12 : v < 0.1 ? -14 : 0) + (w > 0.7 ? 5 : 0) + ((x + y * 3) % 11 === 0 ? -6 : 0); l = Math.max(0, Math.min(255, l)); g.fillStyle = `rgb(${l},${l},${l})`; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; faceTexCache = t; return t;
}
function cineMat(S, U, kind, h0, h1) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(kind === 'back' ? S.back : kind === 'wall' ? S.wall : S.face), metalness: kind === 'back' ? 0.3 : kind === 'wall' ? S.metal * 0.55 : S.metal, roughness: kind === 'back' ? 0.85 : kind === 'wall' ? Math.min(1, S.rough + 0.25) : S.rough, flatShading: true, map: kind === 'back' ? null : hammered(), envMapIntensity: kind === 'wall' ? 0.35 : 1 });
  if (kind === 'back') return m;
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vOP; varying vec3 vON;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position; vON = objectNormal;');
    sh.fragmentShader = `uniform vec3 uKeyDir; uniform float uSweep; uniform float uShine; uniform float uRim; uniform float uGlow; uniform float uH0; uniform float uH1; uniform vec3 uKeyCol; uniform vec3 uRimCol; uniform vec3 uGlowCol; uniform float uTop; uniform float uBot; uniform float uW;
varying vec3 vOP; varying vec3 vON;\n` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hy = clamp((vOP.y - uH0) / max(1e-4, uH1 - uH0), 0.0, 1.0); float chamf = smoothstep(0.35, 0.65, abs(vON.z)) * (1.0 - step(0.98, abs(vON.z)));
        diffuseColor.rgb *= mix(uBot, uTop, hy) * (1.0 + chamf * ${kind === 'wall' ? '1.6' : '0.0'});`)
      .replace('#include <opaque_fragment>', `
        float kd = max(dot(normal, uKeyDir), 0.0); float rim = pow(1.0 - clamp(abs(normal.z), 0.0, 1.0), 2.2);
        outgoingLight += diffuseColor.rgb * uKeyCol * (kd * 0.5 + pow(kd, 12.0) * 1.4) + uRimCol * rim * uRim * 0.28;
        float sw = vOP.x / max(1e-4, uW) * 1.25 + vOP.y / max(1e-4, uW) * 0.5 - uSweep; float band = exp(-sw * sw * 60.0);
        outgoingLight += diffuseColor.rgb * vec3(1.0, 0.92, 0.75) * band * uShine * 1.8 + uGlowCol * uGlow * (0.35 + 0.65 * hy);
        #include <opaque_fragment>`);
    sh.uniforms.uH0 = { value: h0 }; sh.uniforms.uH1 = { value: h1 }; sh.uniforms.uKeyCol = { value: new THREE.Vector3(...S.key) }; sh.uniforms.uRimCol = { value: new THREE.Vector3(...S.rim) }; sh.uniforms.uGlowCol = { value: new THREE.Color(S.glow) }; sh.uniforms.uTop = { value: S.top }; sh.uniforms.uBot = { value: S.bot };
  };
  m.customProgramCacheKey = () => 'cineText:' + kind; return m;
}

const geoCache = new Map();
/**
 * cineText(str, opts) -> THREE.Group
 *   height: world cap height of the letters (Alagard cap = 11 font pixels); depth: thickness in font pixels;
 *   bevel: chamfer in font pixels; style: CINE key or object; backing: dark plate behind (the ink outline); maxW
 */
export function cineText(str, { height = 1, depth = 2.4, bevel = 0.24, style = 'gold', backing = true, maxW = Infinity, font = 'head', glow = 0 } = {}) {
  const S = typeof style === 'string' ? CINE[style] || CINE.gold : style; const G = new THREE.Group(); G.name = 'cine:' + str;
  const k = font + '|' + depth + '|' + bevel + '|' + backing + '|' + str; let C = geoCache.get(k);
  if (!C) { const g2 = grid2(str, font); if (!g2) { G.userData.size = [0.01, 0.01]; G.userData.U = {}; return G; }
    const [x0, y0, x1, y1] = g2.box; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const b2 = bevel * 2;
    const shapes = shapesOf(trace(g2.G, g2.W2, g2.H2), cx, cy);
    const body = new THREE.ExtrudeGeometry(shapes, { depth: Math.max(0.2, depth * 2 - b2), bevelEnabled: b2 > 0, bevelThickness: b2, bevelSize: b2, bevelOffset: -b2, bevelSegments: 1, curveSegments: 1 });
    let back = null; if (backing) { const D = dilate2(g2.G, g2.W2, g2.H2); back = new THREE.ExtrudeGeometry(shapesOf(trace(D, g2.W2, g2.H2), cx, cy), { depth: depth * 1.1, bevelEnabled: false, curveSegments: 1 }); back.translate(0, 0, -depth * 0.9); }
    body.userData.shared = true; if (back) back.userData.shared = true; C = { body, back, w: x1 - x0, h: y1 - y0 }; if (geoCache.size > 300) geoCache.clear(); geoCache.set(k, C); }
  let unit = height / 22; if (C.w * unit > maxW) unit = maxW / C.w; // 2x grid: an Alagard cap is 22 half-pixels tall
  const U = { uKeyDir: { value: new THREE.Vector3(-0.5, 0.55, 0.65).normalize() }, uSweep: { value: -3 }, uShine: { value: 0 }, uRim: { value: 1 }, uGlow: { value: glow }, uW: { value: C.w / 2 } };
  const face = cineMat(S, U, 'face', -C.h / 2, C.h / 2), wall = cineMat(S, U, 'wall', -C.h / 2, C.h / 2);
  const tex = face.map; if (tex) tex.repeat.set(1 / 16, 1 / 16);
  const m = new THREE.Mesh(C.body, [face, wall]); m.scale.setScalar(unit); m.castShadow = true; m.receiveShadow = true; G.add(m);
  if (C.back) { const b = new THREE.Mesh(C.back, cineMat(S, U, 'back')); b.scale.setScalar(unit); b.castShadow = true; G.add(b); }
  G.traverse((o) => { o.userData.noInk = true; });
  G.userData.size = [C.w * unit, C.h * unit]; G.userData.U = U; G.userData.face = face; G.userData.side = wall; G.userData.depth = depth * 2 * unit; return G;
}

/** a few lines of cinematic lettering stacked and centred (or left-aligned): [{ text, height, style }] -> Group (size in userData) */
export function cineLines(lines, { gap = 0.35, align = 'center', ...o } = {}) {
  const G = new THREE.Group(); let y = 0, w = 0; const parts = [];
  for (const L of lines) { const T = cineText(L.text, { ...o, ...L }); const [tw, th] = T.userData.size; parts.push([T, tw, th]); w = Math.max(w, tw); }
  for (const [T, tw, th] of parts) { y -= th / 2; T.position.set(align === 'left' ? tw / 2 : 0, y, 0); y -= th / 2 + gap * th; G.add(T); }
  const h = -y - gap * (parts[parts.length - 1]?.[2] || 0); for (const [T] of parts) T.position.y += h / 2; if (align === 'left') for (const [T] of parts) T.position.x -= w / 2;
  G.userData.size = [w, h]; G.userData.parts = parts.map((p) => p[0]); return G;
}
