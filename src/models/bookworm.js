// Bookworms: real earthworms that live in the star library (no eyes, no faces). Each one is a SkinnedMesh on a
// segmented spine (a middle root bone, five bones towards the head, five towards the tail) built as SHARP LOW-POLY
// annuli: octagonal rings with a groove between every segment, a smooth swollen clitellum band, a tapered pointed head
// end and a blunt tail. The moist pinkish-brown skin is a pixel texture (segment grooves, dorsal vessel, paler belly,
// setae specks, wet streaks) on a realistic wet material (clearcoat glints, a little translucent warmth).
// Their scholar life is subtle: a tiny worn robe or a scarf wrapped round the segments, sometimes a monocle hanging on
// a thread. They inch along by peristalsis (waves of contraction and extension running down the body), rear and sway
// over an open book while the curled tail tip holds and turns its pages, carry a closed book, or sleep coiled on a stack.
// createBookworm(opts) -> { root, hit, st, setRoute({ a, b, up }), setMode(m), react() -> line, update(dt, t) }
import * as THREE from 'three';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const NB = 5, SEG = 0.036, HALF = SEG * NB + 0.012, NA = 44, SIDES = 8, TPX = 4;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CLIT = [0.66, 0.76];
function pix(w, h, draw, seed = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, mulberry32(seed)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const put = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
const stdM = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, flatShading: true, ...o });

// ---------------------------------------------------------------- skin: u runs tail (0) to head (1), 4 px per annulus; v runs round the body (row 4 = back, row 12 = belly)
let SKIN = null;
const skinTex = () => (SKIN ||= pix(NA * TPX, 16, (g, W, H, r) => {
  for (let x = 0; x < W; x++) { const u = x / W, lx = x % TPX; const clit = u > CLIT[0] && u < CLIT[1]; const head = u > 0.9, tail = u < 0.08;
    for (let y = 0; y < H; y++) { const back = Math.abs(y - 4) <= 2, belly = Math.abs(y - 12) <= 2; let c;
      if (clit) c = lx === 0 ? '#b8705a' : back ? (y === 4 ? '#a8624e' : '#bc7860') : belly ? '#d8a084' : '#c88a6a';
      else if (lx === 0) c = back ? '#4e2420' : belly ? '#9a6656' : '#6e342e'; // the groove between segments
      else if (back) c = y === 4 ? '#5e2222' : lx === 1 && y === 3 ? '#a06458' : head ? '#7e3834' : '#84443c';
      else if (belly) c = lx === 2 && (y === 11 || y === 13) ? '#ecccbc' : tail ? '#dcae9c' : '#d09888';
      else c = lx === 2 && (y === 8 || y === 0) ? '#e0b8a8' : head ? '#9e5248' : y === 2 || y === 6 ? '#9a564a' : '#ae6658';
      if (!clit && lx === 1 && r() < 0.07) c = '#e0aa9a'; // wet glints
      put(g, x, y, c); } }
}));
let MAT = null;
const skinMat = () => (MAT ||= new THREE.MeshPhysicalMaterial({ map: skinTex(), roughness: 0.5, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22, sheen: 0.4, sheenColor: C('#ffb8a8'), sheenRoughness: 0.5, emissive: C('#2a0c08'), flatShading: true }));
const R0 = (u) => { let r = 0.02 + 0.013 * Math.exp(-(((u - 0.7) / 0.36) ** 2)); if (u > CLIT[0] && u < CLIT[1]) r *= 1.14 + 0.03 * Math.sin(((u - CLIT[0]) / (CLIT[1] - CLIT[0])) * Math.PI);
  if (u > 0.86) r *= 1 - 0.72 * Math.pow((u - 0.86) / 0.14, 1.25); if (u < 0.05) r *= 0.6 + 0.4 * Math.sqrt(u / 0.05); return r; };
// the annulated body (or a sleeve round part of it): a ring at every groove and crest, octagonal, flat facets, skinned along z
function annuli(u0, u1, radius, bonesIdx, { cap = false } = {}) {
  const P = [], U = [], SI = [], SW = [], I = []; const rings = []; const n0 = Math.round(u0 * NA * 2), n1 = Math.round(u1 * NA * 2);
  for (let j = n0; j <= n1; j++) rings.push({ u: j / (NA * 2), groove: j % 2 === 0 }); if (cap) { rings.unshift({ u: rings[0].u - 0.004, tip: true }); rings.push({ u: rings[rings.length - 1].u + 0.006, tip: true }); }
  for (const rg of rings) { const z = -HALF + rg.u * 2 * HALF; const r = rg.tip ? 0.0015 : radius(rg.u, rg.groove); const side = z >= 0 ? 'h' : 't'; const f = Math.abs(z) / SEG; const i0 = Math.min(NB, Math.floor(f)), i1 = Math.min(NB, i0 + 1); const w1 = Math.min(1, f - i0); const flat = rg.u < 0.3 ? 0.84 : 1;
    for (let k = 0; k <= SIDES; k++) { const a = (k / SIDES) * Math.PI * 2 - Math.PI / 2 + Math.PI / SIDES; const sy = Math.sin(a); P.push(Math.cos(a) * r, ((sy < 0 ? sy * 0.62 : sy * 0.9 * flat) + 0.62) * r, z); U.push(Math.max(0, Math.min(1, rg.u)), k / SIDES + 0.25 / SIDES); SI.push(bonesIdx(side, i0), bonesIdx(side, i1), 0, 0); SW.push(1 - w1, w1, 0, 0); } }
  for (let j = 0; j < rings.length - 1; j++) for (let k = 0; k < SIDES; k++) { const a = j * (SIDES + 1) + k, b = a + SIDES + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); g.setIndex(I); g = g.toNonIndexed(); g.computeVertexNormals(); return g;
}
// a worn little robe: faded wool with darns and a patch, a frayed hem
const robeTex = (col, seed) => pix(32, 16, (g, W, H, r) => { const c = C(col); const sh = (k) => `#${c.clone().multiplyScalar(k).getHexString()}`;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let k = (x + y) % 4 === 0 ? 0.8 : (x * 3 + y) % 7 === 0 ? 1.12 : 1; if (x < 2) k = (y + x) % 2 ? 0.62 : 0.9; if (x > 29) k = 0.75; if (r() < 0.05) k *= 1.2; put(g, x, y, sh(k * 0.95)); }
  const px = 8 + ((r() * 12) | 0), py = 2 + ((r() * 8) | 0); for (let y = py; y < py + 5; y++) for (let x = px; x < px + 6; x++) put(g, x, y, (x === px || x === px + 5 || y === py || y === py + 4) ? (x + y) % 2 ? '#e8d8b0' : '#6a5a40' : (x + y) % 3 ? '#8a7a5a' : '#7a6a4a');
  for (let i = 0; i < 4; i++) { const x = 4 + ((r() * 22) | 0), y = (r() * 14) | 0; put(g, x, y, '#e8dcc0'); put(g, x + 1, y + 1, '#e8dcc0'); } }, seed);
// a small book of the worm's size: low-poly covers and page blocks, a pixel-text page that turns
const pageTex = () => pix(16, 16, (g, W, H, r) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(g, x, y, (x + y * 3) % 9 === 0 ? '#e2d4b0' : '#efe4c6'); for (let y = 2; y < H - 2; y += 2) { const w = 8 + ((r() * 4) | 0); for (let x = 2; x < 2 + w; x++) if (r() < 0.85) put(g, x, y, '#5a4a3a'); } put(g, 2, 2, '#a8281e'); }, 3);
let PAGE = null;
function wormBook(col, w = 0.11, open = true) {
  const g = new THREE.Group(); const cover = stdM({ color: C(col), roughness: 0.7 }); PAGE ||= stdM({ map: pageTex(), side: THREE.DoubleSide, roughness: 0.9 }); const block = stdM({ color: C('#e8dcc0'), roughness: 0.9 });
  if (!open) { const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.022, w * 0.72), cover); b.position.y = 0.011; g.add(b); const pg = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.016, w * 0.66), block); pg.position.set(0.006, 0.011, 0); g.add(pg); return g; }
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.004, w * 0.72), cover); c.position.set(s * w / 4, 0.002, 0); c.rotation.z = -s * 0.06; g.add(c);
    const p = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.006, 0.01, w * 0.66), block); p.position.set(s * (w / 4 - 0.002), 0.009, 0); p.rotation.z = -s * 0.06; g.add(p);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(w / 2 - 0.008, w * 0.64), PAGE); t.rotation.set(-Math.PI / 2, -s * 0.06, 0); t.position.set(s * (w / 4 - 0.002), 0.0145, 0); g.add(t); }
  const pivot = new THREE.Group(); pivot.position.y = 0.016; g.add(pivot); const page = new THREE.Mesh(new THREE.PlaneGeometry(w / 2 - 0.008, w * 0.64), PAGE); page.rotation.x = -Math.PI / 2; page.position.x = w / 4 - 0.002; pivot.add(page); g.userData.page = pivot; g.userData.w = w; return g;
}

export function createBookworm({ seed = 1, robe = null, scarf = null, monocle = false, book = '#6a2a24', side = 1 } = {}) {
  const r = mulberry32(seed * 31 + 7); const root = new THREE.Group(); root.name = 'bookworm'; const body = new THREE.Group(); root.add(body);
  // skeleton: mid -> h1..h5 (towards +z, the head) and mid -> t1..t5 (towards -z, the tail)
  const mid = new THREE.Bone(); mid.name = 'mid'; const H = [mid], Tl = [mid]; let p = mid; for (let i = 1; i <= NB; i++) { const b = new THREE.Bone(); b.position.z = SEG; b.name = 'h' + i; p.add(b); H.push(b); p = b; } p = mid; for (let i = 1; i <= NB; i++) { const b = new THREE.Bone(); b.position.z = -SEG; b.name = 't' + i; p.add(b); Tl.push(b); p = b; }
  const bones = [mid, ...H.slice(1), ...Tl.slice(1)]; for (const b of bones) b.rotation.order = 'YXZ'; const idx = (sd, i) => (i === 0 ? 0 : sd === 'h' ? i : NB + i);
  const skel = new THREE.Skeleton(bones); const sz = 0.92 + r() * 0.16;
  const bodyR = (u, groove) => R0(u) * sz * (groove && !(u > CLIT[0] && u < CLIT[1]) ? 0.93 : 1);
  const mesh = new THREE.SkinnedMesh(annuli(0, 1, bodyR, idx, { cap: true }), skinMat()); mesh.add(mid); mesh.bind(skel); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; body.add(mesh);
  // the worn robe wraps the segments just behind the clitellum; its hem is frayed (alternate facets hang lower)
  if (robe) { const g = annuli(0.44, 0.65, (u) => R0(u) * sz + 0.007 + (u < 0.47 ? 0.004 : 0), idx); const pp = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pp.count; i++) if (uv.getX(i) < 0.446 && (Math.round(uv.getY(i) * SIDES) % 2)) pp.setZ(i, pp.getZ(i) - 0.008); g.computeVertexNormals();
    const rm = new THREE.SkinnedMesh(g, stdM({ map: robeTex(robe, seed), roughness: 0.95, side: THREE.DoubleSide })); rm.bind(skel); rm.castShadow = true; rm.frustumCulled = false; body.add(rm); }
  // a knitted scarf wound twice round the neck segments, one end trailing
  if (scarf) { const sm = stdM({ color: C(scarf), roughness: 0.95 }); const rr = R0(0.8) * sz; for (const dz of [-0.008, 0.008]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.005, 0.006, 4, 8), sm); ring.position.set(0, 0.7 * rr, dz); H[3].add(ring); }
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.05), sm); end.position.set(rr * 0.8, 0.012, -0.03); end.rotation.set(0.2, 0.3, 0.9); H[3].add(end); }
  // a monocle on a thread, dangling from the fore segments
  let mono = null; if (monocle) { mono = new THREE.Group(); mono.position.set(R0(0.86) * sz * 0.9, R0(0.86) * sz * 0.9, 0); H[4].add(mono); const th = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.03, 0.0012), stdM({ color: C('#2a2018') })); th.position.y = -0.015; mono.add(th);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0016, 3, 8), stdM({ color: C('#d8a830'), metalness: 0.8, roughness: 0.3 })); ring.position.y = -0.038; ring.rotation.y = Math.PI / 2; mono.add(ring); }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // ---------------------------------------------------------------- poses
  const S = side; // the side the tail curls to when reading
  const pose = {
    read: (t, sway = 1) => { const P = {}; const sw = Math.sin(t * 0.7) * 0.12 * sway; P.h1 = [-0.32, sw, 0]; P.h2 = [-0.42, sw * 0.6, 0]; P.h3 = [-0.18, 0, 0]; P.h4 = [0.5, 0, 0]; P.h5 = [0.42 + Math.sin(t * 1.1) * 0.06 * sway, 0, 0];
      const c = [-0.32, -0.6, -0.62, -0.6, -0.42]; for (let i = 1; i <= NB; i++) P['t' + i] = [i === NB ? 0.16 : 0, c[i - 1] * S, 0]; return P; },
    crawl: (t) => { const P = {}; for (let i = 1; i <= NB; i++) { P['h' + i] = [-Math.max(0, Math.sin(t * 4.2 - i * 0.9)) * 0.06 - (i === NB ? 0.1 + Math.max(0, Math.sin(t * 1.7)) * 0.2 : 0), Math.sin(t * 0.9 + i * 0.6) * 0.06 + (i === NB ? Math.sin(t * 1.3) * 0.25 : 0), 0]; P['t' + i] = [0, Math.sin(t * 0.8 - i * 0.5) * 0.05, 0]; } return P; },
    sleep: () => { const P = {}; for (let i = 1; i <= NB; i++) { P['h' + i] = [0, 0.62, 0]; P['t' + i] = [0, -0.66, 0]; } P.h5 = [0.12, 0.5, 0]; return P; },
  };
  const apply = (P, k = 1) => { for (const b of bones) { if (b === mid) continue; const q = P[b.name] || [0, 0, 0]; b.rotation.x += (q[0] - b.rotation.x) * k; b.rotation.y += (q[1] - b.rotation.y) * k; b.rotation.z += (q[2] - b.rotation.z) * k; } };
  // the reading book lies open where the curled tail tip comes to rest, so the tip lies on its outer page
  const bk = wormBook(book, 0.11, true); root.add(bk); const carryBk = wormBook(book, 0.1, false); H[1].add(carryBk); carryBk.position.set(0, R0(0.6) * sz * 1.45, 0); carryBk.rotation.y = 0.2; carryBk.visible = false;
  { apply(pose.read(0, 0), 1); root.updateMatrixWorld(true); const tip = root.worldToLocal(Tl[NB].localToWorld(V(0, 0, -0.012))); const w = bk.userData.w; const sg = Math.sign(tip.x || 1); bk.position.set(tip.x - sg * (w / 2 - 0.01), 0, tip.z + 0.01); bk.rotation.y = sg < 0 ? Math.PI : 0; }
  const st = { mode: 'read', t: r() * 10, route: null, u: r(), dir: 1, speed: 0.045 + r() * 0.02, react: 0, flip: 6 + r() * 4 };
  const pulse = (tt, i, k) => Math.sin(tt * 4.2 - i * 0.9 + k); // the peristaltic wave: + = extended (long, thin), - = contracted (short, fat)
  const api = {
    root, st, mesh, hit: null,
    /** route: { a: V3, b: V3, up: V3 }: inch back and forth between a and b on a surface with normal up */
    setRoute(rt) { st.route = rt; st.mode = 'crawl'; },
    setMode(m) { st.mode = m; },
    react() { st.react = 1.4; const L = { read: ['The bookworm flinches into a coil, then eases back over its page.', 'A bookworm, reading by touch. Its tail tip turns another page.'], sleep: ['Asleep on the stack, coiled like a bookmark. It twitches and settles.'], crawl: ['It contracts at your touch, waits, then inches on.', 'A bookworm in search of a better chapter.'], carry: ['It hunches over the little book it carries, and carries on.'] }[st.mode] || ['A bookworm.']; return L[(r() * L.length) | 0]; },
    update(dt, t) {
      st.t += dt; const tt = st.t; const moving = st.mode === 'crawl' || st.mode === 'carry'; let P;
      if (moving) { P = pose.crawl(tt); if (st.route) { const { a, b, up } = st.route; const L = Math.max(0.1, a.distanceTo(b)); st.u += st.dir * dt * st.speed * Math.max(0, pulse(tt, 0, 0.6)) * 1.6 / L; if (st.u > 1) { st.u = 1; st.dir = -1; } if (st.u < 0) { st.u = 0; st.dir = 1; }
          root.position.copy(a).lerp(b, st.u); const fwd = b.clone().sub(a).normalize().multiplyScalar(st.dir); const sd = V().crossVectors(up, fwd).normalize(); const m = new THREE.Matrix4().makeBasis(sd, up, fwd); root.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), Math.min(1, dt * 3)); } }
      else if (st.mode === 'sleep') P = pose.sleep(tt); else P = pose.read(tt);
      // a touch: the whole body contracts and the fore end recoils, then it relaxes
      let shrink = 0; if (st.react > 0) { st.react -= dt; const k = Math.sin(Math.min(1, (1.4 - st.react) / 1.4) * Math.PI); shrink = k; for (let i = 1; i <= NB; i++) { P['h' + i] = [P['h' + i][0] * (1 - k) + 0.35 * k, P['h' + i][1] * (1 - k) + (i < 3 ? 0.5 * k : 0), 0]; P['t' + i] = [P['t' + i][0], P['t' + i][1] * (1 - k) - 0.3 * k * S, 0]; } }
      // page turns: the tail tip lifts, flicks the page over, and settles back on it
      if (st.mode === 'read') { const ph = (tt % st.flip) / st.flip; const turn = smooth(0.82, 0.95, ph); const lift = Math.sin(smooth(0.78, 0.98, ph) * Math.PI); bk.userData.page.rotation.z = turn * Math.PI * 0.98; P.t5 = [P.t5[0] + lift * 0.55, P.t5[1], 0]; P.t4 = [P.t4[0] + lift * 0.25, P.t4[1], 0]; }
      apply(P, Math.min(1, dt * (st.react > 0 ? 10 : 5)));
      // peristalsis: segment spacing and girth pulse down the body (contracted segments grow fat); a slow breath at rest
      for (const [chain, sg] of [[H, 1], [Tl, -1]]) { let prev = 1; for (let i = 1; i <= NB; i++) { const w = moving ? pulse(tt, sg * i, 0) : Math.sin(tt * 1.4 - i * 0.6) * 0.15; const len = (1 + 0.22 * w) * (1 - 0.3 * shrink); const girth = (1 - 0.14 * w) * (1 + 0.25 * shrink); chain[i].position.z = sg * SEG * len; const sc = girth / prev; chain[i].scale.set(sc, sc, 1); prev = girth; } }
      bk.visible = st.mode === 'read'; carryBk.visible = st.mode === 'carry';
      if (st.mode === 'read' && st.react <= 0) { root.updateMatrixWorld(true); const q = H[2].worldToLocal(bk.getWorldPosition(V())); const yaw = Math.max(-0.75, Math.min(0.75, Math.atan2(q.x, q.z) * 0.5)); H[3].rotation.y = yaw * 0.6; H[4].rotation.y = yaw; H[5].rotation.y = yaw * 0.6; }
      if (mono) mono.rotation.z = Math.sin(tt * 1.7) * 0.25 - (st.mode === 'read' ? 0.3 : 0);
    },
  };
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.06; hit.userData.noInk = true; hit.userData.noAO = true; root.add(hit); api.hit = hit;
  return api;
}
