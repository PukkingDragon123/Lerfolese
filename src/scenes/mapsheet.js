// The run map as a PHYSICAL tabletop: the hand-drawn parchment (ink and watercolour: hills, the river, ruins, the
// labyrinth, the marsh, calligraphy) lies curled on a real walnut desk under a warm lamp and candles. Nodes are carved
// chess-inspired pieces on felt bases (pawn = battle, knight = elite, bishop = event, rook = shop, flask = lab,
// king = guardian); Sir Isaac is a gilded queen that hops along the inked dotted routes with a click. Reachable
// pieces lift and catch the candlelight; visited ones are tipped over. Brass compass, quill and inkwell, candles,
// magnifying glass, wax seals and coins clutter the desk. Read bottom to top toward the guardian.
import * as THREE from 'three';
import { makeNoise } from '../gfx/pixel.js';
import { mulberry32, clamp } from '../core/util.js';
import { Spring } from '../core/tween.js';
import { loadPBR, loadHDRI } from '../gfx/assets.js';
import { makePiece, deskClutter, waxSeal, coins } from '../models/chess.js';

const V3 = THREE.Vector3; const TAU = Math.PI * 2;
export const SHEET = { X0: -8.9, X1: 8.9, ZN: 3.4, ZF: -33.4 };
const SW = SHEET.X1 - SHEET.X0, SL = SHEET.ZN - SHEET.ZF; const PPU = 40;
const riverX = (z) => Math.sin(z * 0.18) * 4.3 + 1.4;
const INK = '#2a1810', SEPIA = '#5a3a22';

/** height of the bent paper at (x, z): gentle undulation, curled long edges, rolled ends */
export function sheetY(x, z) {
  const u = Math.abs(x / (SW / 2)), v = (z - (SHEET.ZN + SHEET.ZF) / 2) / (SL / 2);
  let y = 0.06 + 0.035 * Math.sin(z * 0.23 + 0.6) + 0.02 * Math.sin(x * 0.4 + z * 0.11);
  y += 0.45 * Math.max(0, (u - 0.9) / 0.1) ** 2; const e = Math.max(0, (Math.abs(v) - 0.95) / 0.05); y += (v > 0 ? 0.45 : 0.7) * e * e;
  return y;
}

// ---------------------------------------------------------------- the hand-drawn parchment
function paintParchment(map, seed) {
  const W = Math.round(SW * PPU), H = Math.round(SL * PPU); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const rnd = mulberry32(seed % 100000 + 3); const n = makeNoise((seed % 997) + 5);
  const P = (x, z) => [(x - SHEET.X0) * PPU, (z - SHEET.ZF) * PPU];
  const nodes = Object.values(map.nodes); const segs = []; for (const a of nodes) for (const id of a.next) { const b = map.nodes[id]; if (b) segs.push([a.x, a.z, b.x - a.x, b.z - a.z]); }
  const pathD = (x, z) => { let d = 1e9; for (const [ax, az, dx, dz] of segs) { const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
  const nodeD = (x, z) => { let d = 1e9; for (const a of nodes) d = Math.min(d, Math.hypot(x - a.x, z - a.z)); return d; };
  const free = (x, z, r) => pathD(x, z) > r && nodeD(x, z) > r + 0.4 && Math.abs(x) < SW / 2 - 0.9 && z < SHEET.ZN - 1 && z > SHEET.ZF + 1;
  const jit = (a = 1) => (rnd() - 0.5) * a;
  // torn outline
  const pts = []; const tear = (k) => 7 + n(k * 0.04, 3.7) * 16 + (rnd() < 0.035 ? rnd() * 34 : 0);
  for (let x = 0; x <= W; x += 7) pts.push([x, tear(x)]); for (let y = 0; y <= H; y += 7) pts.push([W - tear(y + 999), y]);
  for (let x = W; x >= 0; x -= 7) pts.push([x, H - tear(x + 3333)]); for (let y = H; y >= 0; y -= 7) pts.push([tear(y + 7777), y]);
  const outline = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  g.save(); outline(); g.clip();
  // paper: mottled warm fibres (quarter-res noise blown up for soft watercolour blooms)
  const q = document.createElement('canvas'); q.width = W >> 2; q.height = H >> 2; const qg = q.getContext('2d'); const id = qg.createImageData(q.width, q.height);
  for (let y = 0; y < q.height; y++) for (let x = 0; x < q.width; x++) { const f = n.fbm(x * 0.03, y * 0.03, 4), st = Math.max(0, n.fbm(x * 0.011 + 40, y * 0.011, 3) - 0.62) * 2.2; const k = (y * q.width + x) * 4; id.data[k] = 226 - f * 36 - st * 60; id.data[k + 1] = 200 - f * 42 - st * 80; id.data[k + 2] = 146 - f * 46 - st * 90; id.data[k + 3] = 255; }
  qg.putImageData(id, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(q, 0, 0, W, H);
  g.globalAlpha = 0.07; g.strokeStyle = '#6a4a2a'; g.lineWidth = 1; for (let i = 0; i < 2600; i++) { const x = rnd() * W, y = rnd() * H, a = rnd() * TAU, l = 3 + rnd() * 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } g.globalAlpha = 1;
  // washes
  const wash = (draw, col, a = 0.42, edge = 0.55) => { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.fillStyle = col; draw(); g.fill(); g.globalAlpha = a * edge; g.strokeStyle = col; g.lineWidth = 2.2; g.stroke(); g.restore(); };
  const blob = (cx, cy, r, k = 0.35) => { g.beginPath(); const m = 18; for (let i = 0; i <= m; i++) { const a = (i / m) * TAU; const rr = r * (1 + (n(cx * 0.01 + Math.cos(a) * 1.3, cy * 0.01 + Math.sin(a) * 1.3) - 0.5) * k * 2); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.72; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  const inkLine = (path, w = 1.6, col = INK, a = 0.9) => { g.save(); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); path(); g.stroke(); g.restore(); };
  // hills and meadows (watercolour + inked bumps with hatching)
  for (let z = SHEET.ZN - 1.2; z > -27; z -= 0.9) for (let x = -8.6; x < 8.6; x += 0.9) {
    const h = n.fbm(x * 0.12 + 20, z * 0.12 + 4, 3); const xx = x + jit(0.5), zz = z + jit(0.5); if (h < 0.55 || !free(xx, zz, 0.55) || Math.abs(xx - riverX(zz)) < 1.1) continue;
    const [px, py] = P(xx, zz); const r = 14 + rnd() * 14; wash(() => blob(px, py, r * 1.6), '#9fbf6a', 0.32);
    inkLine(() => { g.moveTo(px - r, py); g.quadraticCurveTo(px - r * 0.2, py - r * 1.1, px + r, py); }, 1.7);
    for (let k = 0; k < 4; k++) inkLine(() => { const hx = px + r * (0.1 + k * 0.22); g.moveTo(hx, py - r * 0.35 + k * 2); g.lineTo(hx - 5, py - 1); }, 1, SEPIA, 0.7);
  }
  const groves = []; // (no trees on the map, by request)
  // the river Kephisos: wash, inked banks, wave ticks
  const riv = []; for (let z = SHEET.ZN + 0.5; z > -25.2; z -= 0.25) riv.push(P(riverX(z), z));
  g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = '#86b9d2'; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = 0.75; g.lineWidth = 0.95 * PPU; g.beginPath(); riv.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.globalAlpha = 0.55; g.strokeStyle = '#5f93b4'; g.lineWidth = 0.42 * PPU; g.stroke(); g.restore();
  for (const s of [-1, 1]) inkLine(() => riv.forEach(([x, y], i) => { const xx = x + s * 0.48 * PPU + jit(1.2); i ? g.lineTo(xx, y) : g.moveTo(xx, y); }), 1.4);
  for (let i = 4; i < riv.length - 2; i += 7) { const [x, y] = riv[i]; inkLine(() => { g.moveTo(x - 6, y); g.quadraticCurveTo(x - 3, y - 3, x, y); g.quadraticCurveTo(x + 3, y + 3, x + 6, y); }, 1.1, '#2c5470', 0.85); }
  // the marsh: teal pools, reeds, "here be hydras"
  for (let i = 0; i < 26; i++) { const x = jit(16), z = -21.5 - rnd() * 5.5; if (!free(x, z, 0.75)) continue; const [px, py] = P(x, z); const r = 10 + rnd() * 18; wash(() => blob(px, py, r, 0.45), '#7fb3a4', 0.55, 1.2); for (let k = 0; k < 5; k++) { const rx = px + jit(r * 1.6), ry = py + jit(r * 0.6); inkLine(() => { g.moveTo(rx, ry); g.lineTo(rx + jit(3), ry - 7 - rnd() * 5); }, 1, SEPIA, 0.8); } }
  // the mountains behind the guardian's gate
  for (let x = -8.8; x < 8.8; x += 1.0 + rnd() * 0.6) {
    const z = SHEET.ZF + 1.6 + rnd() * 1.4; const [px, py] = P(x, z); const w = 18 + rnd() * 22, h = 22 + rnd() * 26;
    const tri = () => { g.beginPath(); g.moveTo(px - w, py); g.lineTo(px - w * 0.1, py - h); g.lineTo(px + w, py); g.closePath(); };
    wash(tri, '#a59cc4', 0.5, 0.2); g.save(); tri(); g.clip(); for (let k = -h; k < w; k += 4) inkLine(() => { g.moveTo(px + k, py); g.lineTo(px + k + h * 0.6, py - h); }, 0.9, SEPIA, 0.45); g.fillStyle = '#f6efe0'; g.beginPath(); g.moveTo(px - w * 0.1, py - h); g.lineTo(px - w * 0.36, py - h * 0.66); g.lineTo(px + w * 0.16, py - h * 0.7); g.closePath(); g.fill(); g.restore();
    inkLine(() => { g.moveTo(px - w, py); g.lineTo(px - w * 0.1, py - h); g.lineTo(px + w, py); }, 1.6);
  }
  // landmarks + calligraphy (placed where the routes leave room)
  const taken = []; const spot = (z0, z1, r) => { let best = null, bd = -1; for (let i = 0; i < 260; i++) { const x = jit(15), z = z0 + rnd() * (z1 - z0); let d = Math.min(pathD(x, z), nodeD(x, z) - 0.3); for (const [tx, tz] of taken) if (Math.abs(x - tx) < 4.2 && Math.abs(z - tz) < 1.2) d -= 3; if (d > bd && Math.abs(x) < SW / 2 - 1.2 - r * 0.5) { bd = d; best = [x, z]; } } if (best) taken.push(best); return best; };
  const label = (txt, x, z, { font = '700 30px "Caveat"', rot = jit(0.12), col = '#3a2212' } = {}) => { const [px, py] = P(x, z); g.save(); g.translate(px, py); g.rotate(rot); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(240,220,170,0.55)'; g.fillText(txt, 1.5, 1.5); g.fillStyle = col; g.fillText(txt, 0, 0); g.restore(); };
  const ruin = spot(-13, -8, 1.5); if (ruin) { const [px, py] = P(...ruin); wash(() => blob(px, py + 6, 30), '#c8b490', 0.45); for (let k = 0; k < 5; k++) { const cx = px - 26 + k * 13, hh = k === 3 ? 12 : 26 + jit(4); inkLine(() => { g.rect(cx - 3, py - hh, 6, hh); g.moveTo(cx - 5, py - hh); g.lineTo(cx + 5, py - hh); }, 1.3); } inkLine(() => { g.moveTo(px - 32, py - 28); g.lineTo(px + 6, py - 28); g.lineTo(px - 13, py - 40); g.closePath(); }, 1.5); inkLine(() => { g.moveTo(px - 36, py + 1); g.lineTo(px + 36, py + 1); }, 1.8); label('Ruins of Old Delphi', ruin[0], ruin[1] + 0.75, { font: '700 26px "Caveat"' }); }
  const laby = spot(-19.5, -14.5, 1.6); if (laby) { const [px, py] = P(...laby); wash(() => blob(px, py, 34), '#c89a6a', 0.38); for (let k = 0; k < 4; k++) { const s = 30 - k * 8; inkLine(() => { g.moveTo(px - s + 6, py - s); g.lineTo(px + s, py - s); g.lineTo(px + s, py + s); g.lineTo(px - s, py + s); g.lineTo(px - s, py - s + 8 * (k % 2 ? 1 : 2)); }, 1.8); } label('The Labyrinth', laby[0], laby[1] + 1.05, { font: '700 28px "Caveat"' }); }
  const lbl = [['The Olive Meadows', -3.5, 0.6], ['River Kephisos', -7, -2], ['Kobalos Gully', -18, -14.5], ['Lernaean Marsh', -25.5, -21.5], ['here be hydras', -24.5, -22, '22px "HomemadeApple"']];
  for (const [t, z0, z1, f] of lbl) { const s = spot(z1 < z0 ? z1 : z0, z1 < z0 ? z0 : z1, 2.2); if (s) label(t, s[0], s[1], f ? { font: f, col: '#5a2a1a' } : {}); }
  label('Gate of the Guardian', 0, SHEET.ZF + 1.3, { font: '34px "Jacquard"', rot: 0, col: '#4a1414' });
  // title cartouche + compass rose + frame
  { const [px, py] = P(0, SHEET.ZN - 1.15); g.save(); g.fillStyle = '#efdcae'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(px - 170, py - 22); g.lineTo(px + 170, py - 22); g.lineTo(px + 190, py - 4); g.lineTo(px + 170, py + 18); g.lineTo(px - 170, py + 18); g.lineTo(px - 190, py - 4); g.closePath(); g.fill(); g.stroke(); g.restore(); label('The Mythical Wilderness', 0, SHEET.ZN - 1.2, { font: '40px "Jacquard"', rot: 0, col: '#2a1408' }); }
  { const [px, py] = P(7.4, SHEET.ZN - 1.4); g.save(); g.translate(px, py); for (let k = 0; k < 8; k++) { const r = k % 2 ? 14 : 30; g.rotate(TAU / 8); g.fillStyle = k % 4 === 0 ? '#9a2a22' : '#3a2414'; g.beginPath(); g.moveTo(0, -r); g.lineTo(5, 0); g.lineTo(-5, 0); g.closePath(); g.fill(); } g.restore(); g.save(); g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.arc(px, py, 20, 0, TAU); g.stroke(); g.font = '700 22px "Caveat"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('N', px, py - 36); g.restore(); }
  for (const k of [26, 32]) { g.save(); g.strokeStyle = INK; g.globalAlpha = k === 26 ? 0.8 : 0.45; g.lineWidth = k === 26 ? 2.2 : 1.2; g.strokeRect(k, k, W - 2 * k, H - 2 * k); g.restore(); }
  for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H; g.fillStyle = 'rgba(42,24,16,0.5)'; g.beginPath(); g.arc(x, y, rnd() * 2.2 + 0.4, 0, TAU); g.fill(); }
  // burnt rim + vignette
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62); vg.addColorStop(0, 'rgba(120,70,30,0)'); vg.addColorStop(1, 'rgba(120,70,30,0.42)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore(); g.save(); outline(); g.clip(); outline(); g.strokeStyle = 'rgba(80,42,18,0.55)'; g.lineWidth = 16; g.stroke(); g.strokeStyle = '#4a2410'; g.lineWidth = 4; g.stroke(); g.restore();
  return { canvas: cv, groves, pathD, nodeD, free, hill: (x, z) => n.fbm(x * 0.12 + 20, z * 0.12 + 4, 3) };
}

// smooth ink blot for the dotted routes and the travel trail
function inkDot() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i <= 16; i++) { const a = (i / 16) * TAU; const r = 22 + Math.sin(a * 3 + 1) * 3 + Math.sin(a * 5) * 2; const x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// ---------------------------------------------------------------- the tabletop scene
export class MapSheet {
  constructor({ engine, run, map }) {
    this.engine = engine; this.run = run; this.map = map; const seed = run.seed || 1;
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x120c0a); sc.fog = new THREE.Fog(0x120c0a, 30, 58);
    this.camera = new THREE.PerspectiveCamera(36, engine.aspect, 0.1, 200); sc.add(this.camera);
    this.world = new THREE.Group(); sc.add(this.world); this.bounds = { LEN: SL, WID: SW, Z0: SHEET.ZN };
    // light: a warm oil-lamp key that follows the view (soft shadows), candle practicals along the desk, dim room fill
    const key = (this.key = new THREE.DirectionalLight(0xffd8a8, 2.1)); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 60 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4; sc.add(key, key.target);
    sc.add(new THREE.HemisphereLight(0x8a7a90, 0x2a1a10, 0.55));
    loadHDRI('interior_fireplace', engine.renderer).then((h) => { sc.environment = h.envMap; sc.environmentIntensity = 0.38; }).catch(() => {});
    // the walnut desk
    loadPBR('wood_dark', { repeat: [6, 10], normalScale: 0.8 }).then((m) => { m.color = new THREE.Color('#c89a78'); m.roughness = 0.62; const d = new THREE.Mesh(new THREE.PlaneGeometry(52, 80).rotateX(-Math.PI / 2), m); d.position.set(0, 0, -15); d.receiveShadow = true; this.world.add(d); }).catch(() => {});
    // the parchment sheet (ink relief from its own drawing)
    const art = (this.art = paintParchment(map, seed)); const tex = new THREE.CanvasTexture(art.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const bump = new THREE.CanvasTexture(art.canvas); bump.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(SW, SL, 60, 120); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, (SHEET.ZN + SHEET.ZF) / 2); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sheetY(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
    const sheet = (this.sheetMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: 0.9, roughness: 0.9, alphaTest: 0.5, side: THREE.DoubleSide }))); sheet.castShadow = true; sheet.receiveShadow = true; this.world.add(sheet);
    // desk clutter + candle practicals; a seal and coins on the sheet corners
    const cl = deskClutter({ xEdge: SW / 2, zTop: SHEET.ZN, zBottom: SHEET.ZF, rnd: mulberry32(seed % 1000 + 3) }); this.world.add(cl.group); this.candles = cl.candles;
    { const s1 = waxSeal(); s1.position.set(SHEET.X0 + 0.9, sheetY(SHEET.X0 + 0.9, SHEET.ZN - 0.9), SHEET.ZN - 0.9); s1.scale.setScalar(1.4); this.world.add(s1); const c1 = coins(6); c1.position.set(SHEET.X1 + 0.9, 0, SHEET.ZN + 0.4); c1.scale.setScalar(1.4); this.world.add(c1); }
    this.nodeViews = new Map(); this.pathMesh = null; this.trailQ = []; this.trailDots = [];
    this.dotTex = inkDot(); this.ray = new THREE.Raycaster(); this.focus = new V3();
  }
  heightAt(x, z) { return sheetY(x, z); }
  // ------------------------------------------------ nodes (carved pieces), routes
  addNode(nd) {
    const g = new THREE.Group(); g.position.set(nd.x, sheetY(nd.x, nd.z), nd.z); this.world.add(g);
    const pc = makePiece(nd.type); g.add(pc.root); const lift = new THREE.Group(); pc.root.add(lift);
    const h = nd.type === 'guardian' ? 2.6 : 1.4; const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, h, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = h / 2; hit.userData.node = nd; g.add(hit);
    const ring = { visible: false }; // kept for MapScene compatibility (reachable state)
    const v = { g, nd, piece: pc, hit, ring, s: new Spring(1, 14, 0.4), lift: new Spring(0, 9, 0.6), tip: new Spring(0, 7, 0.55), ph: Math.random() * TAU, tipDir: Math.random() < 0.5 ? -1 : 1, reachable: false, visited: false };
    this.nodeViews.set(nd.id, v); return v;
  }
  buildPaths(run) {
    if (this.pathMesh) { this.world.remove(this.pathMesh); this.pathMesh.geometry.dispose(); }
    const visited = run.path || []; const vset = new Set(); for (let i = 0; i < visited.length - 1; i++) vset.add(visited[i] + '>' + visited[i + 1]); const pos = run.pos; const dots = [];
    for (const a of Object.values(this.map.nodes)) for (const id of a.next) {
      const b = this.map.nodes[id]; if (!b) continue; const len = Math.hypot(b.x - a.x, b.z - a.z); const k = Math.floor(len / 0.3); const state = vset.has(a.id + '>' + id) ? 2 : a.id === pos ? 1 : 0;
      for (let i = 1; i < k; i++) { const t = i / k; const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (Math.hypot(x - a.x, z - a.z) < 0.55 || Math.hypot(x - b.x, z - b.z) < 0.55) continue; dots.push([x, z, state]); }
    }
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 0.15).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.dotTex, transparent: true, alphaTest: 0.4, depthWrite: false, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }), Math.max(1, dots.length));
    const m4 = new THREE.Matrix4(), c = new THREE.Color(); const cols = [new THREE.Color('#5a3c26'), new THREE.Color('#140804'), new THREE.Color('#7a1610')];
    dots.forEach(([x, z, s], i) => { const sc = s ? 1.25 : 1; m4.makeRotationY(i * 1.7).scale(new V3(sc, 1, sc)).setPosition(x, sheetY(x, z) + 0.006, z); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, c.copy(cols[s])); });
    mesh.count = dots.length; mesh.renderOrder = 2; mesh.userData.noAO = true; mesh.frustumCulled = false; this.pathMesh = mesh; this.world.add(mesh);
  }
  refresh(reach, run) {
    for (const [id, v] of this.nodeViews) { v.reachable = reach.has(id); v.visited = (run.path || []).includes(id) && id !== run.pos; v.ring.visible = v.reachable; v.tip.target = v.visited ? 1 : 0; }
  }
  pick(ndc) { this.ray.setFromCamera(ndc, this.camera); const h = this.ray.intersectObjects([...this.nodeViews.values()].map((v) => v.hit)); return h[0]?.object.userData.node; }
  hover(nd) { if (this.hovered && this.hovered !== nd) this.hovered = null; if (!nd) return; this.hovered = nd; const v = this.nodeViews.get(nd.id); if (v) { v.s.kick(2.5); v.lift.kick(3); } }
  /** Sir Isaac's gilded queen (MapScene's pawn: { root, update }) */
  isaacPiece() { const pc = makePiece('isaac'); return { root: pc.root, update() {} }; }
  // the drawn ink trail while the queen walks a route: dots appear one by one
  trail(a, b, dur) { const len = Math.hypot(b.x - a.x, b.z - a.z); const k = Math.max(2, Math.floor(len / 0.26)); for (let i = 1; i < k; i++) this.trailQ.push({ at: (i / k) * dur, x: a.x + (b.x - a.x) * (i / k), z: a.z + (b.z - a.z) * (i / k) }); this.trailT = 0; }
  update(dt, t, { fz = -4, dist = 18, pitch = 1.0, ndc = null } = {}) {
    void ndc; const f = this.focus.set(0, 0.2, clamp(fz, -24, -1.1)); const cam = this.camera; cam.position.set(0, f.y + Math.sin(pitch) * dist, f.z + Math.cos(pitch) * dist); cam.lookAt(f);
    this.key.position.set(f.x - 7, 14, f.z + 5); this.key.target.position.copy(f);
    for (const [, v] of this.nodeViews) {
      v.s.update(dt); v.lift.update(dt); v.tip.update(dt); v.g.scale.setScalar(v.s.value); const root = v.piece.root;
      const hov = this.hovered === v.nd; const up = v.reachable ? 0.1 + Math.sin(t * 2.4 + v.ph) * 0.04 + (hov ? 0.12 : 0) : 0; v.lift.target = up;
      root.position.y = Math.max(0, v.lift.value); root.rotation.z = v.reachable ? Math.sin(t * 1.9 + v.ph) * 0.05 : 0;
      // visited: knocked over onto its side
      const k = clamp(v.tip.value, 0, 1.1); root.rotation.x = 0; v.piece.body.rotation.z = v.tipDir * k * 1.42; v.piece.body.position.set(v.tipDir * -k * 0.05, k * 0.33 * v.piece.body.scale.x, 0);
      const glow = v.reachable ? 0.05 + Math.sin(t * 3 + v.ph) * 0.025 + (hov ? 0.1 : 0) : 0; for (const m of v.piece.mats) { if (!m.emissive) continue; m.emissive.setRGB(1, 0.55, 0.22); m.emissiveIntensity = glow; }
    }
    if (this.trailQ.length) { this.trailT = (this.trailT || 0) + dt; while (this.trailQ.length && this.trailQ[0].at <= this.trailT) { const d = this.trailQ.shift(); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.dotTex, color: '#140804', transparent: true, alphaTest: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); m.position.set(d.x, sheetY(d.x, d.z) + 0.008, d.z); m.rotation.y = Math.random() * TAU; m.scale.setScalar(0.2); this.world.add(m); this.trailDots.push({ m, t: 0 }); } }
    for (const d of this.trailDots) { d.t += dt; d.m.scale.setScalar(Math.min(1.15, 0.2 + d.t * 6)); }
    for (const c of this.candles) { const fl = c.userData.flame, l = c.userData.light; const k = 0.88 + Math.sin(t * 9 + c.id) * 0.06 + Math.sin(t * 23 + c.id * 3) * 0.05; if (fl) fl.scale.set(0.13 * k, 0.26 * (0.9 + (k - 0.88) * 2), 1); if (l) l.intensity = 5.5 * k; }
  }
}
