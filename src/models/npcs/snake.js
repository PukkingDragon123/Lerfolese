// THE SNAKE of the prologue: a long, heavy, low-poly serpent (heptagonal rings, flat shaded) with a hand-pixelled scale
// skin (olive-bronze flank scales with dark edges, a chain of dark dorsal diamonds, pale ventral scutes), a wedge head with
// heavy brow plates, slit-pupil gold eyes, a hinged jaw (it can carry the golden apple in its mouth) and a forked tongue.
// It SLITHERS by lateral undulation: the head steers along a wavy course and every ring of the body follows the trail
// the head left (follow-the-leader), so the S-curves travel down the body like the real thing; the body hugs the ground.
//   const S = createSnake({ hAt }); scene.add(S.root); S.place(pos, yaw); await S.slitherTo(v, speed); S.jaw(0..1); S.update(dt)
//   S.mouth: a group in the jaws (attach the apple there); S.headWorld(out); S.coil(on) curls the head up to look around
import * as THREE from 'three';
import * as K from '../charkit.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const h2 = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
function scaleTex() {
  const W = 56, H = 256; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const id = g.createImageData(W, H); const D = id.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W; const belly = Math.abs(u - 0.5) > 0.36; const top = Math.abs(u) < 0.12 || Math.abs(u - 1) < 0.12; // u = 0 / 1 is the spine line (dorsal), 0.5 the belly
    let col;
    if (belly) { const sc = y % 6; col = sc === 0 ? [120, 108, 74] : sc === 5 ? [196, 184, 140] : [214, 202, 156]; } // ventral scutes
    else {
      const row = Math.floor(y / 3), off = row % 2 ? 2 : 0; const cx = (x + off) % 4, cy = y % 3; const edge = cx === 0 || cy === 0; // overlapping keeled scales
      const du = Math.min(Math.abs(u), Math.abs(1 - u)); const dv = ((y % 24) - 12) / 12; const dia = du * 4.2 + Math.abs(dv) < 0.9; const blotch = Math.abs(du - 0.28) < 0.05 && (y % 24) > 6 && (y % 24) < 14;
      const base = dia ? [62, 48, 30] : blotch ? [70, 56, 34] : top ? [104, 98, 58] : [132, 122, 70];
      const k = (edge ? 0.68 : cy === 1 && cx === 2 ? 1.12 : 1) * (0.92 + h2(x >> 1, y >> 1) * 0.14);
      col = [base[0] * k, base[1] * k, base[2] * k]; if (dia && !edge && cx === 2 && cy === 1) col = [col[0] * 1.3, col[1] * 1.2, col[2] * 1.05];
    }
    const q = (y * W + x) * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
  }
  g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const eyeTex = () => { const c = document.createElement('canvas'); c.width = c.height = 12; const g = c.getContext('2d'); for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const d = Math.hypot(x - 5.5, y - 5.5); const slit = Math.abs(x - 5.5) < 1 && d < 5; g.fillStyle = slit ? '#0a0806' : d < 3 ? '#e8b030' : d < 5 ? '#b07818' : '#20160c'; if (Math.hypot(x - 4, y - 3.5) < 1) g.fillStyle = '#fff6d8'; g.fillRect(x, y, 1, 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; return t; };

export function createSnake({ length = 1.7, radius = 0.046, hAt = null } = {}) {
  const N = 40, SD = 7; const root = new THREE.Group(); root.name = 'snake';
  const tex = scaleTex(); const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05, flatShading: true, envMapIntensity: 0.5 });
  // ---- body tube (rings rebuilt each frame from the trail)
  const geo = new THREE.BufferGeometry(); const nv = N * (SD + 1) + 1; const P = new Float32Array(nv * 3), UV = new Float32Array(nv * 2); const I = [];
  for (let i = 0; i < N; i++) for (let j = 0; j <= SD; j++) { const v = i * (SD + 1) + j; UV[v * 2] = j / SD; UV[v * 2 + 1] = (i / (N - 1)) * (length / 0.32); }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < SD; j++) { const a = i * (SD + 1) + j, b = a + 1, c = a + SD + 1, d = c + 1; I.push(a, b, c, b, d, c); }
  const tip = N * (SD + 1); for (let j = 0; j < SD; j++) I.push((N - 1) * (SD + 1) + j, (N - 1) * (SD + 1) + j + 1, tip); UV[tip * 2] = 0.5; UV[tip * 2 + 1] = length / 0.32;
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); geo.setIndex(I);
  const body = new THREE.Mesh(geo, mat); body.castShadow = body.receiveShadow = true; body.frustumCulled = false; root.add(body);
  const rad = (t) => radius * (t < 0.04 ? 0.62 + t * 6 : t < 0.3 ? 0.86 + (t - 0.04) * 0.55 : Math.max(0.06, 1 - Math.pow((t - 0.3) / 0.7, 1.4) * 0.96)); // a slim neck, a heavy middle, a long taper
  // ---- head: skull (wedge, brow plates), hinged jaw, eyes, tongue
  const head = new THREE.Group(); root.add(head);
  const headMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, flatShading: true });
  const skull = new THREE.Mesh(new K.Loft(6, 7).set(K.curve([V(0, 0.004, -0.03), V(0, 0.01, 0.02), V(0, 0.008, 0.06), V(0, 0.0, 0.09)]), (t) => { const w = 0.042 * (1 - t * 0.55) + (t < 0.3 ? 0.006 : 0); return [w, w * 0.52]; }, { ref: () => V(0, 1, 0) }).geo, headMat); skull.castShadow = true; head.add(skull);
  for (const s of [-1, 1]) { const brow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.03), headMat); brow.position.set(s * 0.022, 0.026, 0.035); brow.rotation.set(0.1, 0, s * 0.35); head.add(brow); }
  const jawG = new THREE.Group(); jawG.position.set(0, -0.004, -0.015); head.add(jawG);
  const jawM = new THREE.Mesh(new K.Loft(5, 6).set(K.curve([V(0, -0.006, 0), V(0, -0.01, 0.05), V(0, -0.008, 0.1)]), (t) => { const w = 0.036 * (1 - t * 0.5); return [w, w * 0.3]; }, { ref: () => V(0, 1, 0) }).geo, new THREE.MeshStandardMaterial({ color: 0xc8b88c, roughness: 0.6, flatShading: true })); jawG.add(jawM);
  const mouthIn = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.09), new THREE.MeshStandardMaterial({ color: 0x6a2028, roughness: 0.8, side: THREE.DoubleSide })); mouthIn.rotation.x = -Math.PI / 2; mouthIn.position.set(0, -0.004, 0.05); jawG.add(mouthIn);
  const eyeM = new THREE.MeshStandardMaterial({ map: eyeTex(), roughness: 0.15, metalness: 0.1 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0105, 0), eyeM); e.position.set(s * 0.027, 0.016, 0.05); e.rotation.y = s * 1.2; head.add(e); }
  const tongue = new THREE.Mesh((() => { const s = new THREE.Shape(); s.moveTo(-0.003, 0); s.lineTo(0.003, 0); s.lineTo(0.003, 0.05); s.lineTo(0.008, 0.075); s.lineTo(0.002, 0.056); s.lineTo(0, 0.06); s.lineTo(-0.002, 0.056); s.lineTo(-0.008, 0.075); s.lineTo(-0.003, 0.05); return new THREE.ShapeGeometry(s); })(), new THREE.MeshStandardMaterial({ color: 0x8a1a28, side: THREE.DoubleSide, roughness: 0.5 }));
  tongue.rotation.x = Math.PI / 2; tongue.position.set(0, -0.002, 0.07); tongue.scale.setScalar(0.001); head.add(tongue);
  const mouth = new THREE.Group(); mouth.position.set(0, -0.012, 0.11); head.add(mouth);
  // ---- motion state: a trail of head positions; the guide steers, the head weaves either side of it
  const st = { guide: V(), yaw: 0, target: null, speed: 0.6, arrive: null, wave: 0, amp: 0.09, trail: [], jaw: 0, jawT: 0, flick: 0, lift: 0.05, liftT: 0.05, look: 0, t: 0 };
  const gy = (x, z) => (hAt ? hAt(x, z) : 0);
  const api = {
    root, head, mouth, st, length,
    place(p, yaw = 0) { st.guide.copy(p); st.yaw = yaw; st.trail = []; const f = V(Math.sin(yaw), 0, Math.cos(yaw)); for (let s = 0; s <= length + 0.1; s += 0.02) { const q = p.clone().addScaledVector(f, -s); q.x += Math.cos(yaw) * Math.sin(s * 9) * 0.05; q.z -= Math.sin(yaw) * Math.sin(s * 9) * 0.05; st.trail.push(q); } api.update(0); },
    slitherTo(v, speed = 0.6) { st.target = v.clone(); st.speed = speed; return new Promise((r) => { st.arrive?.(); st.arrive = r; }); },
    jawOpen(k) { st.jawT = k; }, lift(k) { st.liftT = k; }, flick() { st.flick = 1; },
    headWorld(out = V()) { head.updateMatrixWorld(true); return head.localToWorld(out.set(0, 0.02, 0.05)); },
    update(dt) {
      st.t += dt; let moving = false;
      if (st.target && dt > 0) {
        const to = st.target.clone().sub(st.guide); to.y = 0; const d = to.length();
        if (d < 0.05) { st.target = null; const a = st.arrive; st.arrive = null; a?.(); }
        else { const h = Math.atan2(to.x, to.z); let dr = h - st.yaw; while (dr > Math.PI) dr -= TAU; while (dr < -Math.PI) dr += TAU; st.yaw += dr * Math.min(1, dt * 2.2); const sp = Math.min(st.speed, d * 2 + 0.1); st.guide.x += Math.sin(st.yaw) * sp * dt; st.guide.z += Math.cos(st.yaw) * sp * dt; st.wave += sp * dt * (TAU / 0.62); moving = true; }
      }
      // head = guide + a lateral weave (the S-curves are laid into the trail and travel down the body)
      const amp = st.amp * (moving ? 1 : 0.15); const hx = st.guide.x + Math.cos(st.yaw) * Math.sin(st.wave) * amp, hz = st.guide.z - Math.sin(st.yaw) * Math.sin(st.wave) * amp;
      const hp = V(hx, gy(hx, hz), hz); const tr = st.trail; if (!tr.length) tr.push(hp.clone());
      if (hp.distanceTo(tr[0]) > 0.012) { tr.unshift(hp.clone()); if (tr.length > 400) tr.length = 400; } else tr[0].copy(hp);
      if (!moving) { st.wave += dt * 0.6; } // a resting breath
      // rings: arc length along the trail
      st.lift += (st.liftT - st.lift) * Math.min(1, dt * 3); st.jaw += (st.jawT - st.jaw) * Math.min(1, dt * 8);
      const pts = []; let acc = 0, k = 0; const step = length / (N - 1);
      for (let i = 0; i < N; i++) { const want = i * step; while (k < tr.length - 1 && acc + tr[k].distanceTo(tr[k + 1]) < want) { acc += tr[k].distanceTo(tr[k + 1]); k++; } const a = tr[k], b = tr[Math.min(k + 1, tr.length - 1)]; const seg = a.distanceTo(b) || 1; const u = Math.min(1, (want - acc) / seg); const p = a.clone().lerp(b, u); const t = i / (N - 1); p.y = gy(p.x, p.z) + rad(t) * 0.82 + st.lift * Math.max(0, 1 - i / 6) ** 2; pts.push(p); }
      const A = geo.attributes.position.array; const up = V(0, 1, 0), tan = V(), side = V(), nrm = V();
      for (let i = 0; i < N; i++) {
        const p = pts[i]; tan.subVectors(pts[Math.max(0, i - 1)], pts[Math.min(N - 1, i + 1)]).normalize(); side.crossVectors(up, tan).normalize(); nrm.crossVectors(tan, side).normalize(); const r = rad(i / (N - 1));
        for (let j = 0; j <= SD; j++) { const a = (j / SD) * TAU; const o = (i * (SD + 1) + j) * 3; const cx = Math.sin(a) * r, cy = Math.cos(a) * r * (Math.cos(a) < 0 ? 0.72 : 0.92); A[o] = p.x + side.x * cx + nrm.x * cy; A[o + 1] = p.y + side.y * cx + nrm.y * cy; A[o + 2] = p.z + side.z * cx + nrm.z * cy; }
      }
      { const p = pts[N - 1].clone().addScaledVector(tan.subVectors(pts[N - 1], pts[N - 2]).normalize(), 0.03); A[tip * 3] = p.x; A[tip * 3 + 1] = p.y; A[tip * 3 + 2] = p.z; }
      geo.attributes.position.needsUpdate = true;
      // head on the front of the body, facing along the trail, with a slight raise and a searching sway when it stops
      const fwd = V().subVectors(pts[0], pts[2]).normalize(); head.position.copy(pts[0]).addScaledVector(fwd, 0.02); head.position.y += 0.004;
      const yaw = Math.atan2(fwd.x, fwd.z) + (moving ? 0 : Math.sin(st.t * 0.7) * 0.25) * (1 - st.jaw * 0.5), pitch = -Math.asin(Math.max(-1, Math.min(1, fwd.y))) - st.lift * 0.6; head.rotation.set(pitch, yaw, 0, 'YXZ');
      jawG.rotation.x = st.jaw * 0.55; mouthIn.visible = st.jaw > 0.05;
      if (st.jaw < 0.1 && Math.sin(st.t * 1.3) > 0.97 && st.flick <= 0) st.flick = 1;
      if (st.flick > 0) { st.flick -= dt * 2.4; const f = Math.sin(Math.max(0, st.flick) * Math.PI); tongue.scale.set(1, 1, 1).multiplyScalar(Math.max(0.001, f)); tongue.rotation.z = Math.sin(st.t * 40) * 0.25; } else tongue.scale.setScalar(0.001);
    },
  };
  return api;
}
