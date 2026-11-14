// Bookworms: little earthworm scholars of the star library. Each is a SkinnedMesh on a segmented spine (a middle root
// bone with five bones towards the head and five towards the tail), with ringed pixel-art skin (annuli, a pale
// clitellum band, a lighter belly), a tiny robe skinned to the same chain, beady eyes, and per-worm accessories:
// spectacles, a mortarboard or a nightcap, a scarf. They crawl by peristalsis along shelves, floors and ladders, read
// books held in the curl of their tails (pages turn, heads nod), carry books on their backs, sleep curled on a stack,
// and react when clicked (startle, push their spectacles up, a stern "shh").
// createBookworm(opts) -> { root, update(dt, t), react() -> line, mode }
import * as THREE from 'three';
import * as T from './toon.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const SEG = 0.036, NB = 5, HALF = SEG * NB + 0.012;
function pix(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
let SKIN = null;
const skinTex = () => (SKIN ||= pix(64, 16, (g, w, h) => { for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { const belly = y < 3 || y > 12; const cl = x > 40 && x < 48; g.fillStyle = x % 4 === 0 ? (cl ? '#c88878' : '#a86458') : cl ? (belly ? '#f0c2b2' : '#e8a898') : belly ? '#e8b0a0' : y > 6 && y < 9 ? '#e49c8c' : '#d48878'; g.fillRect(x, y, 1, 1); } g.fillStyle = '#8a4a40'; g.fillRect(62, 0, 2, h); }));
const robeTex = (col) => pix(32, 32, (g, w, h) => { const c = C(col); const sh = (k) => `#${c.clone().multiplyScalar(k).getHexString()}`; // wool weave, a gold-braided hem (u=0) and collar (u=1), a sash down the back
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const back = Math.abs(y - 8) < 2; g.fillStyle = x < 3 ? (x === 1 ? '#f4d870' : '#b08a2a') : x > 28 ? (x === 30 ? '#f4d870' : '#b08a2a') : back ? (y === 8 ? '#e8c860' : '#a8842a') : (x + y) % 6 === 0 ? sh(0.72) : (x * 3 + y) % 7 === 0 ? sh(1.18) : x % 5 === 0 ? sh(0.86) : sh(1.0); g.fillRect(x, y, 1, 1); }
  for (let y = 1; y < h; y += 4) { g.fillStyle = '#7a5a1a'; g.fillRect(0, y, 1, 2); } });
// a tube along +z through the spine (z in [-HALF, HALF]), skinned to the chain by its z
function chainTube(radius, z0, z1, rings, sides, bonesIdx) {
  const P = [], N = [], U = [], SI = [], SW = [], I = [];
  for (let j = 0; j <= rings; j++) { const u = j / rings; const z = z0 + (z1 - z0) * u; const r = radius(z, u);
    const side = z >= 0 ? 'h' : 't'; const f = Math.abs(z) / SEG; const i0 = Math.min(NB, Math.floor(f)), i1 = Math.min(NB, i0 + 1); const w1 = Math.min(1, f - i0);
    for (let k = 0; k <= sides; k++) { const a = (k / sides) * Math.PI * 2; const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.88 + r * 0.88; P.push(x, y, z); N.push(Math.cos(a), Math.sin(a), 0); U.push(u, k / sides); SI.push(bonesIdx(side, i0), bonesIdx(side, i1), 0, 0); SW.push(1 - w1, w1, 0, 0); } }
  for (let j = 0; j < rings; j++) for (let k = 0; k < sides; k++) { const a = j * (sides + 1) + k, b = a + sides + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); g.setIndex(I); g.computeVertexNormals(); return g;
}
function openBook(col, w = 0.12) {
  const g = new THREE.Group(); const cover = new THREE.MeshToonMaterial({ color: C(col), gradientMap: T.gradientMap([0.5, 0.8, 1.0]), side: THREE.DoubleSide }); const paper = new THREE.MeshToonMaterial({ color: C('#f2e8cc'), gradientMap: T.gradientMap([0.55, 0.85, 1.0]), side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.004, w * 0.72), cover); c.position.set(s * w / 4, 0, 0); c.rotation.z = -s * 0.35; g.add(c); const p = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.006, 0.012, w * 0.68), paper); p.position.set(s * w / 4 * 0.98, 0.009 + Math.sin(0.35) * w * 0.12, 0); p.rotation.z = -s * 0.35; g.add(p); }
  const pivot = new THREE.Group(); pivot.position.y = 0.012; g.add(pivot); const page = new THREE.Mesh(new THREE.PlaneGeometry(w / 2 - 0.006, w * 0.66), paper); page.rotation.x = -Math.PI / 2; page.position.x = w / 4; pivot.add(page); g.userData.page = pivot; return g;
}

export function createBookworm({ seed = 1, robe = '#3a4a8a', spectacles = false, cap = null, scarf = null, book = '#6a2a24' } = {}) {
  const r = mulberry32(seed * 31 + 7); const root = new THREE.Group(); root.name = 'bookworm'; const body = new THREE.Group(); root.add(body);
  // skeleton: mid -> h1..h5 (towards +z, the head) and mid -> t1..t5 (towards -z, the tail)
  const mid = new THREE.Bone(); mid.name = 'mid'; const H = [mid], Tl = [mid]; let p = mid; for (let i = 1; i <= NB; i++) { const b = new THREE.Bone(); b.position.z = SEG; b.name = 'h' + i; p.add(b); H.push(b); p = b; } p = mid; for (let i = 1; i <= NB; i++) { const b = new THREE.Bone(); b.position.z = -SEG; b.name = 't' + i; p.add(b); Tl.push(b); p = b; }
  const bones = [mid, ...H.slice(1), ...Tl.slice(1)]; for (const b of bones) b.rotation.order = 'YXZ'; const idx = (side, i) => (i === 0 ? 0 : side === 'h' ? i : NB + i);
  const skel = new THREE.Skeleton(bones);
  const bodyR = (z) => { const u = (z + HALF) / (2 * HALF); let rr = 0.029 + 0.007 * Math.sin(Math.PI * u); if (u > 0.62 && u < 0.76) rr += 0.004; if (u > 0.94) rr *= Math.sqrt(Math.max(0, (1 - u) / 0.06)) * 0.9 + 0.1; if (u < 0.08) rr *= Math.sqrt(u / 0.08) * 0.85 + 0.15; return rr; };
  const skinM = new THREE.MeshToonMaterial({ map: skinTex(), gradientMap: T.gradientMap([0.5, 0.78, 1.0]) }); skinM.map.repeat.set(1, 1);
  const bodyG = chainTube(bodyR, -HALF, HALF, 44, 14, idx); const mesh = new THREE.SkinnedMesh(bodyG, skinM); mesh.add(mid); mesh.bind(skel); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; body.add(mesh);
  const robeG = chainTube((z, u) => bodyR(z) + 0.008 + (1 - u) * 0.012 + (u > 0.9 ? 0.004 : 0), -0.03, 0.12, 14, 16, idx); const robeM = new THREE.MeshToonMaterial({ map: robeTex(robe), gradientMap: T.gradientMap([0.45, 0.75, 1.0]), side: THREE.DoubleSide });
  const robeMesh = new THREE.SkinnedMesh(robeG, robeM); robeMesh.bind(skel); robeMesh.castShadow = true; robeMesh.frustumCulled = false; body.add(robeMesh);
  // face and kit on the head bone
  const head = H[NB]; const black = new THREE.MeshToonMaterial({ color: C('#140c0c'), gradientMap: T.gradientMap([0.3, 0.8, 1.0]) });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), black); e.position.set(s * 0.012, 0.04, 0.0); head.add(e); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 4, 10, Math.PI), black); mouth.position.set(0, 0.03, 0.012); mouth.rotation.set(0.3, 0, Math.PI); head.add(mouth);
  let specs = null; if (spectacles) { specs = new THREE.Group(); const brass = new THREE.MeshToonMaterial({ color: C('#d8a830'), gradientMap: T.gradientMap([0.4, 0.8, 1.0]) }); for (const s of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0016, 6, 16), brass); ring.position.set(s * 0.012, 0.04, 0.008); specs.add(ring); } const br = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0016, 0.0016), brass); br.position.set(0, 0.042, 0.008); specs.add(br); head.add(specs); }
  if (cap === 'mortar') { const cm = new THREE.MeshToonMaterial({ color: C('#1a1a2a'), gradientMap: T.gradientMap([0.4, 0.8, 1.0]) }); const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 0.06), cm); top.position.set(0, 0.07, -0.005); top.rotation.y = 0.78; head.add(top); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.016, 12), cm); base.position.set(0, 0.06, -0.005); head.add(base); const tas = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.03, 0.003), new THREE.MeshToonMaterial({ color: C('#e8c040'), gradientMap: T.gradientMap([0.4, 0.8, 1.0]) })); tas.position.set(0.028, 0.058, 0.02); head.add(tas); }
  if (cap === 'night') { const cm = new THREE.MeshToonMaterial({ color: C('#8a2a3a'), gradientMap: T.gradientMap([0.4, 0.8, 1.0]) }); const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.055, -0.005), V(0.005, 0.08, -0.015), V(0.02, 0.09, -0.04), V(0.03, 0.075, -0.06)]), 10, 0.014, 8), cm); head.add(c); const bob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshToonMaterial({ color: C('#f2ece0'), gradientMap: T.gradientMap([0.4, 0.8, 1.0]) })); bob.position.set(0.032, 0.072, -0.065); head.add(bob); }
  if (scarf) { const sm = new THREE.MeshToonMaterial({ color: C(scarf), gradientMap: T.gradientMap([0.45, 0.78, 1.0]) }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 6, 18), sm); ring.position.set(0, 0.03, 0); H[3].add(ring); const tail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.004), sm); tail.position.set(0.02, 0.012, 0.03); tail.rotation.z = 0.3; H[3].add(tail); }
  // the book: held at the tail tip, or carried on the back
  const bk = openBook(book); bk.scale.setScalar(1.0); Tl[NB].add(bk); bk.position.set(0, 0.03, -0.03);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  // ---------------------------------------------------------------- behaviour
  const st = { mode: 'read', t: r() * 10, route: null, u: r(), dir: 1, speed: 0.05 + r() * 0.02, react: 0, reactKind: null, sleep: false, carry: false, wave: 0 };
  const pose = { read: (t) => { const P = {}; const nod = Math.sin(t * 0.9) * 0.08; P.h1 = [-0.42, 0, 0]; P.h2 = [-0.45, 0, 0]; P.h3 = [-0.3, 0, 0]; P.h4 = [0.35 + nod, 0, 0]; P.h5 = [0.45 + nod, 0, 0];
      P.t1 = [0.05, 0.85, 0]; P.t2 = [0.1, 0.85, 0]; P.t3 = [0.45, 0.75, 0]; P.t4 = [0.55, 0.3, 0]; P.t5 = [0.3, 0.1, 0]; return P; },
    crawl: (t) => { const P = {}; for (let i = 1; i <= NB; i++) { P['h' + i] = [-Math.sin(t * 5 - i * 0.9) * 0.16 - (i === NB ? 0.2 : 0), Math.sin(t * 1.3 + i) * 0.07, 0]; P['t' + i] = [Math.sin(t * 5 + i * 0.9) * 0.16, Math.sin(t * 1.1 - i) * 0.08, 0]; } return P; },
    sleep: (t) => { const P = {}; for (let i = 1; i <= NB; i++) { P['h' + i] = [0, 0.5, 0]; P['t' + i] = [0, -0.6, 0]; } P.h5 = [0.1, 0.4, 0]; const b = Math.sin(t * 0.8) * 0.02; P.h1[1] += b; return P; } };
  const apply = (P, k = 1) => { for (const b of bones) { if (b === mid) continue; const q = P[b.name] || [0, 0, 0]; b.rotation.x += (q[0] - b.rotation.x) * k; b.rotation.y += (q[1] - b.rotation.y) * k; b.rotation.z += (q[2] - b.rotation.z) * k; } };
  const api = {
    root, st, mesh, hit: null,
    /** route: { a: V3, b: V3, up: V3 } (crawls back and forth between a and b on a surface with normal up) */
    setRoute(rt) { st.route = rt; st.mode = 'crawl'; },
    setMode(m) { st.mode = m; if (m === 'carry') { H[2].add(bk); bk.position.set(0, 0.05, 0); bk.rotation.set(0, 0, 0); } },
    react() { st.react = 1.2; const k = st.mode === 'sleep' ? 'wake' : spectacles ? 'specs' : r() < 0.5 ? 'shh' : 'startle'; st.reactKind = k; return { wake: 'Mmf... five more chapters.', specs: 'Ahem. Do you mind? I am at a cliffhanger.', shh: 'Shhh! This is a library.', startle: 'Eek! Oh. It is only you.' }[k]; },
    update(dt, t) {
      st.t += dt; const tt = st.t; let P;
      if (st.mode === 'crawl' || st.mode === 'carry') {
        P = pose.crawl(tt); if (st.route) { const { a, b, up } = st.route; const L = a.distanceTo(b); st.u += st.dir * dt * st.speed * (0.6 + 0.4 * Math.max(0, Math.sin(tt * 6))) / Math.max(0.1, L); if (st.u > 1) { st.u = 1; st.dir = -1; } if (st.u < 0) { st.u = 0; st.dir = 1; }
          root.position.copy(a).lerp(b, st.u); const fwd = b.clone().sub(a).normalize().multiplyScalar(st.dir); const side = V().crossVectors(up, fwd).normalize(); const m = new THREE.Matrix4().makeBasis(side, up, fwd); root.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), Math.min(1, dt * 4)); }
      } else if (st.mode === 'sleep') P = pose.sleep(tt); else P = pose.read(tt);
      // reactions: startle hops up straight, specs pushes the spectacles up, shh turns to you and rears up
      if (st.react > 0) { st.react -= dt; const k = Math.sin(Math.min(1, (1.2 - st.react) / 1.2) * Math.PI);
        if (st.reactKind === 'startle') { body.position.y = Math.max(0, Math.sin((1.2 - st.react) * 9)) * 0.06 * k; for (const n of Object.keys(P)) P[n] = P[n].map((v) => v * (1 - k)); }
        if (st.reactKind === 'shh' || st.reactKind === 'specs') { P.h4 = [-0.2, 0.6 * k, 0]; P.h5 = [-0.1 - (st.reactKind === 'specs' ? Math.sin(tt * 18) * 0.1 : 0), 0.3 * k, 0]; P.h1 = [-0.6, 0, 0]; }
        if (st.reactKind === 'wake') { P.h5 = [-0.4 * k, 0.3, 0]; P.h4 = [-0.3 * k, 0.4, 0]; }
        if (specs && st.reactKind === 'specs') specs.position.y = Math.sin(tt * 18) * 0.004 * k;
      } else body.position.y = 0;
      apply(P, Math.min(1, dt * 6));
      const moving = st.mode === 'crawl' || st.mode === 'carry'; for (let i = 1; i <= NB; i++) { const k = moving ? 1 + 0.24 * Math.sin(tt * 5 - i * 0.9) : 1 + 0.03 * Math.sin(tt * 1.6 - i); H[i].position.z = SEG * k; Tl[i].position.z = -SEG * (moving ? 1 + 0.24 * Math.sin(tt * 5 + i * 0.9) : 1); }
      bk.visible = st.mode !== 'sleep' && st.mode !== 'crawl';
      if (st.mode === 'read' && st.react <= 0) { root.updateMatrixWorld(true); const q = H[3].worldToLocal(bk.getWorldPosition(V())); const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(q.x, q.z) * 0.45)); H[4].rotation.y = yaw; H[5].rotation.y = yaw * 0.8; }
      // reading: the book faces the reader's eyes; its page turns now and then
      if (st.mode === 'read') { root.updateMatrixWorld(); bk.lookAt(head.localToWorld(V(0, 0.04, 0.02))); bk.rotateX(Math.PI / 2 - 0.35); const ph = (tt % 7) / 7; bk.userData.page.rotation.z = ph > 0.85 ? -Math.PI * Math.min(1, (ph - 0.85) / 0.12) : 0; }
    },
  };
  // a click proxy around the body
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.08; root.add(hit); api.hit = hit;
  return api;
}
