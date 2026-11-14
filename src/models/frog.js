// Archimage Croakley, the wizard frog of the star gallery: a plump green frog in a midnight robe embroidered with gold
// stars and crescents (pixel-art cloth), a crooked wide-brimmed hat with a band and buckle, a gnarled staff topped with a
// glowing star crystal held in a crescent, big golden eyes with blinking lids and horizontal pupils, a pulsing throat sac,
// webbed fingers with round pads. Procedural idle (breath, blink, throat, head tilt, staff tap, hat wobble) and acts:
// 'cast' (staff raised, crystal flares), 'nod', 'ribbit' (sac swells, little hop).
import * as THREE from 'three';
import * as T from './toon.js';
import { turned } from '../ui3d/craft.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const toonC = (c, bands = [0.45, 0.75, 1.0], o = {}) => new THREE.MeshToonMaterial({ color: C(c), gradientMap: T.gradientMap(bands), ...o });
function pixTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
// pixel-art cloth: midnight weave, gold stars and crescents, a hem band
function robeTex() { return pixTex(64, 64, (g) => { const r = mulberry32(7); const ramp = ['#141a3a', '#1c2450', '#262f66', '#30397a']; for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { g.fillStyle = ramp[((x + y * 3) % 7 === 0 ? 2 : (x * 5 + y) % 11 === 0 ? 0 : 1) + (r() < 0.08 ? 1 : 0)]; g.fillRect(x, y, 1, 1); }
  const star = (x, y) => { g.fillStyle = '#7a5a18'; g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5); g.fillStyle = '#f2c84a'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.fillStyle = '#fff2b0'; g.fillRect(x, y, 1, 1); };
  for (const [x, y] of [[8, 10], [40, 6], [24, 30], [54, 34], [12, 48], [44, 52]]) star(x, y);
  g.fillStyle = '#f2c84a'; for (const [x, y] of [[30, 14], [6, 32], [52, 20]]) { g.fillRect(x, y, 3, 1); g.fillRect(x - 1, y + 1, 1, 3); g.fillRect(x, y + 4, 3, 1); }
  g.fillStyle = '#a8801e'; g.fillRect(0, 60, 64, 4); g.fillStyle = '#f2c84a'; for (let x = 0; x < 64; x += 4) g.fillRect(x, 61, 2, 2); }); }
function skinTex() { return pixTex(32, 32, (g) => { const r = mulberry32(3); const ramp = ['#3e7a2c', '#4e9236', '#5aa23e', '#68b048']; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { g.fillStyle = ramp[1 + (r() < 0.2 ? 1 : 0) - (r() < 0.1 ? 1 : 0)]; g.fillRect(x, y, 1, 1); } for (let i = 0; i < 9; i++) { const x = (r() * 30) | 0, y = (r() * 30) | 0; g.fillStyle = '#2e5e22'; g.fillRect(x, y, 3, 2); g.fillRect(x + 1, y - 1, 1, 4); g.fillStyle = '#3e7a2c'; g.fillRect(x + 1, y, 1, 1); } }); }
function eyeTex() { return pixTex(32, 32, (g) => { g.fillStyle = '#f4e8b0'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#d8a020'; g.beginPath(); g.arc(16, 12, 10, 0, 7); g.fill(); g.fillStyle = '#b07810'; g.beginPath(); g.arc(16, 12, 10, 0.2, 2.9); g.lineWidth = 2; g.strokeStyle = '#8a5a10'; g.stroke(); g.fillStyle = '#100808'; g.fillRect(8, 10, 16, 5); g.fillStyle = '#ffffff'; g.fillRect(19, 6, 3, 3); }); }

export function createFrog() {
  const root = new THREE.Group(); root.name = 'frogWizard'; const body = new THREE.Group(); root.add(body);
  const skinT = skinTex(); const skin = toonC('#ffffff', [0.45, 0.75, 1.0], { map: skinT }); const belly = toonC('#e8e0a0');
  const robeT = robeTex(); robeT.repeat.set(3, 1.5); const robeM = toonC('#ffffff', [0.4, 0.72, 1.0], { map: robeT, side: THREE.DoubleSide });
  // the robe: fitted over the shoulders and the round frog belly, cinched by a sash, flaring into a deep-folded skirt
  // with a scalloped, slightly trailing hem; gold trims down the front opening and along the hem; a shawl collar
  const robeG = (() => { const N = 30, S = 72; const P = [], U = [], I = []; const rad = (y) => y > 0.92 ? 0.32 - (y - 0.92) * 1.9 : y > 0.72 ? 0.4 - (y - 0.72) * 0.4 : y > 0.55 ? 0.36 + (y - 0.55) * 0.24 : 0.36 + Math.pow((0.55 - y) / 0.55, 1.15) * 0.3;
    const pts = []; for (let j = 0; j <= N; j++) { const y = 1.0 * (j / N); for (let i = 0; i <= S; i++) { const a = (i / S) * Math.PI * 2; const skirt = Math.max(0, (0.55 - y) / 0.55);
      const fold = Math.sin(a * 7 + 0.6) * 0.6 + Math.sin(a * 11 + 2.1) * 0.3 + Math.sin(a * 17 + y * 3) * 0.1; const r = rad(y) * (1 + fold * (0.1 * Math.pow(skirt, 0.8) + 0.012)) * (1 + 0.08 * Math.max(0, -Math.cos(a)) * skirt);
      let yy = y; if (j === 0) yy = 0.035 * Math.sin(a * 7 + 0.6) - 0.03 * Math.max(0, -Math.cos(a)); P.push(Math.sin(a) * r, yy, Math.cos(a) * r * (y > 0.6 ? 0.92 : 1)); U.push((i / S) * 4, y * 2.2); } }
    for (let j = 0; j < N; j++) for (let i = 0; i < S; i++) { const a = j * (S + 1) + i, b = a + S + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); g.userData.ring = (j) => Array.from({ length: S + 1 }, (_, i) => { const k = (j * (S + 1) + i) * 3; return V(P[k], P[k + 1], P[k + 2]); }); g.userData.at = (a, y) => { const j = Math.round(y * N), i = Math.round(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * S); const k = (j * (S + 1) + i) * 3; return V(P[k], P[k + 1], P[k + 2]); }; return g; })();
  const robe = new THREE.Mesh(robeG, robeM); body.add(robe);
  const gold = toonC('#d8a830', [0.4, 0.75, 1.0]); const trim = (pts, r = 0.018) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 3), r, 6), gold); body.add(m); return m; };
  trim(robeG.userData.ring(0).filter((_, i) => i % 2 === 0).map((p) => p.multiplyScalar(1.01).add(V(0, 0.012, 0))), 0.022);
  for (const s of [-1, 1]) trim(Array.from({ length: 12 }, (_, k) => { const y = 0.02 + (k / 11) * 0.93; return robeG.userData.at(s * 0.2 + (y > 0.6 ? s * 0.08 * (y - 0.6) : 0), y).multiplyScalar(1.02); }));
  const sashM = toonC('#7a2a4a', [0.4, 0.72, 1.0]); const sash = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, k) => { const a = (k / 24) * Math.PI * 2; return V(Math.sin(a) * 0.385, 0.55 + Math.sin(a * 2) * 0.008, Math.cos(a) * 0.385 * 0.95); }), true), 48, 0.04, 8, true), sashM); sash.scale.y = 1.4; body.add(sash);
  const ribbon = (pts, w) => { const cv = new THREE.CatmullRomCurve3(pts); const P2 = [], I2 = [], U2 = []; const n = 16; for (let k = 0; k <= n; k++) { const p = cv.getPointAt(k / n), t = cv.getTangentAt(k / n); const sd = V().crossVectors(t, V(0, 0, 1)).normalize().multiplyScalar(w * (1 - k / n * 0.3)); P2.push(p.x - sd.x, p.y - sd.y, p.z - sd.z, p.x + sd.x, p.y + sd.y, p.z + sd.z); U2.push(0, k / n, 1, k / n); if (k < n) { const a = k * 2; I2.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U2, 2)); g.setIndex(I2); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: '#7a2a4a', side: THREE.DoubleSide, gradientMap: T.gradientMap([0.4, 0.72, 1.0]) })); body.add(m); return m; };
  const knot = new THREE.Mesh(turned([[0.001, -0.05], [0.05, -0.04], [0.06, 0.0], [0.05, 0.04], [0.001, 0.05]], 20), sashM); knot.position.set(-0.17, 0.55, 0.35); knot.scale.z = 0.7; body.add(knot);
  const tails = [ribbon([V(-0.17, 0.53, 0.38), V(-0.2, 0.42, 0.42), V(-0.17, 0.3, 0.46), V(-0.21, 0.18, 0.5)], 0.035), ribbon([V(-0.15, 0.53, 0.38), V(-0.1, 0.43, 0.43), V(-0.11, 0.33, 0.47)], 0.03)];
  const collar = new THREE.Mesh(turned([[0.17, 0.08], [0.22, 0.06], [0.3, 0.0], [0.33, -0.04], [0.29, -0.06], [0.2, -0.02]], 48), robeM); collar.position.y = 0.96; body.add(collar); const collarT = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.014, 6, 48), gold); collarT.rotation.x = Math.PI / 2; collarT.position.y = 0.915; body.add(collarT);
  // head: a wide frog head with a big mouth line, throat sac, eye domes with blinking lids
  const headG = new THREE.Group(); headG.position.y = 1.08; body.add(headG);
  const skull = new THREE.Mesh(turned([[0.001, -0.12], [0.24, -0.1], [0.3, 0.0], [0.28, 0.1], [0.2, 0.18], [0.001, 0.21]], 40), skin); skull.scale.set(1.15, 1, 1); headG.add(skull);
  const throat = new THREE.Mesh(turned([[0.001, -0.06], [0.16, -0.04], [0.18, 0.04], [0.12, 0.09], [0.001, 0.1]], 28), belly); throat.position.set(0, -0.08, 0.12); throat.rotation.x = 0.5; headG.add(throat);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.012, 6, 40, Math.PI * 0.9), toonC('#1e3a14')); lip.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 0.05); lip.position.set(0, -0.035, 0.0); lip.scale.set(1.15, 1, 1); headG.add(lip);
  const eyeT = eyeTex(); const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.17, 0.15, 0.08); headG.add(e);
    const dome = new THREE.Mesh(turned([[0.001, -0.02], [0.1, -0.01], [0.11, 0.05], [0.07, 0.11], [0.001, 0.12]], 28), skin); e.add(dome);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), toonC('#ffffff', [0.55, 0.85, 1.0], { map: eyeT })); ball.rotation.x = Math.PI / 2 - 0.15; ball.position.set(0, 0.06, 0.05); e.add(ball);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.082, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), skin); lid.position.set(0, 0.06, 0.04); lid.rotation.x = -0.3; e.add(lid); eyes.push({ e, lid });
  }
  // the hat: floppy and crooked: a crumpled crown rising off a wavy brim, bending back so the tip droops, a star charm
  const hat = new THREE.Group(); hat.position.set(0, 0.16, -0.02); hat.rotation.set(-0.16, 0, 0.08); headG.add(hat);
  const hatM = toonC('#ffffff', [0.4, 0.72, 1.0], { map: robeT, side: THREE.DoubleSide });
  const spine = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.02, 0.2, -0.02), V(0.07, 0.38, -0.08), V(0.12, 0.5, -0.2), V(0.15, 0.52, -0.33), V(0.13, 0.45, -0.43)]);
  { const cone = new THREE.TubeGeometry(spine, 40, 1, 28); const p = cone.attributes.position, uvs = cone.attributes.uv;
    for (let i = 0; i < p.count; i++) { const t = uvs.getX(i), th = uvs.getY(i) * Math.PI * 2; const c = spine.getPointAt(t); const d = V(p.getX(i), p.getY(i), p.getZ(i)).sub(c).normalize(); const rad = (0.26 * Math.pow(1 - t, 1.05) + 0.012) * (1 + 0.07 * Math.sin(t * 15) + 0.05 * Math.sin(th * 3 + t * 6)) * (t < 0.12 ? 1 + (0.12 - t) * 0.6 : 1); const q = c.addScaledVector(d, rad); p.setXYZ(i, q.x, q.y, q.z); }
    cone.computeVertexNormals(); hat.add(new THREE.Mesh(cone, hatM)); }
  const brimG = new THREE.RingGeometry(0.24, 0.5, 64, 4); brimG.rotateX(-Math.PI / 2); { const p = brimG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z), a = Math.atan2(z, x); const k = (r - 0.24) / 0.26; p.setY(i, -0.03 * k + Math.sin(a * 5 + 1.2) * 0.035 * k * k - Math.max(0, Math.cos(a - 1.4)) * 0.06 * k * k); } brimG.computeVertexNormals(); }
  hat.add(new THREE.Mesh(brimG, hatM)); const brimEdge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return V(Math.cos(a) * 0.5, -0.03 + Math.sin(a * 5 + 1.2) * 0.035 - Math.max(0, Math.cos(a - 1.4)) * 0.06, Math.sin(a) * 0.5); }), true), 96, 0.012, 5, true), gold); hat.add(brimEdge);
  const band = new THREE.Mesh(turned([[0.268, 0.0], [0.272, 0.01], [0.255, 0.075], [0.25, 0.085]], 40), toonC('#7a2a3a')); hat.add(band);
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 4), gold); buckle.position.set(0, 0.045, 0.265); buckle.rotation.z = Math.PI / 4; hat.add(buckle);
  const starS = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI / 2; const r = k % 2 ? 0.022 : 0.05; k ? starS.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starS.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const charm = new THREE.Mesh(new THREE.ExtrudeGeometry(starS, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 }), gold); const tip = spine.getPointAt(1); charm.position.copy(tip).add(V(0, -0.07, 0)); hat.add(charm);
  // arms: wide sleeves hanging from the shoulders with drooping cuffs; the right hand grips the staff, the left rests on the sash
  const sleeve = (pts, r0, r1) => { const cv = new THREE.CatmullRomCurve3(pts); const g = new THREE.TubeGeometry(cv, 24, 1, 20); const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const t = uv.getX(i), th = uv.getY(i) * Math.PI * 2; const c = cv.getPointAt(t); const d = V(p.getX(i), p.getY(i), p.getZ(i)).sub(c).normalize(); const r = (r0 + (r1 - r0) * Math.pow(t, 1.6)) * (1 + 0.06 * Math.sin(th * 5 + t * 4)); const q = c.addScaledVector(d, r); if (t > 0.7) q.y -= Math.max(0, -Math.sin(th)) * (t - 0.7) * 0.25; p.setXYZ(i, q.x, q.y, q.z); }
    g.computeVertexNormals(); return new THREE.Mesh(g, robeM); };
  const hand = (grip) => { const h = new THREE.Group(); h.add(new THREE.Mesh(turned([[0.001, 0], [0.05, 0.01], [0.056, 0.04], [0.001, 0.065]], 20), skin));
    for (let f = 0; f < 4; f++) { const a = -0.75 + f * 0.5; const fg = new THREE.Group(); fg.position.set(Math.sin(a) * 0.035, 0.05, Math.cos(a) * 0.02); fg.rotation.set(grip ? 1.3 : 0.3, 0, -Math.sin(a) * 0.5); h.add(fg);
      const seg = new THREE.Mesh(turned([[0.012, 0], [0.013, 0.05], [0.011, 0.07]], 12), skin); fg.add(seg); const pad = new THREE.Mesh(turned([[0.001, 0], [0.018, 0.004], [0.02, 0.014], [0.001, 0.024]], 12), belly); pad.position.y = 0.07; fg.add(pad); } return h; };
  const armR = new THREE.Group(); armR.position.set(0.3, 0.9, 0.02); body.add(armR);
  armR.add(sleeve([V(0, 0, 0), V(0.08, -0.16, 0.06), V(0.07, -0.28, 0.2), V(0.04, -0.32, 0.33)], 0.085, 0.16));
  const handR = hand(true); handR.position.set(0.04, -0.33, 0.37); handR.rotation.set(-0.3, 0, -0.4); armR.add(handR);
  const armL = new THREE.Group(); armL.position.set(-0.3, 0.9, 0.02); body.add(armL);
  armL.add(sleeve([V(0, 0, 0), V(-0.06, -0.18, 0.08), V(0.02, -0.3, 0.27), V(0.14, -0.33, 0.36)], 0.085, 0.15));
  const handL = hand(false); handL.position.set(0.17, -0.34, 0.37); handL.rotation.set(1.4, 0.2, 1.3); armL.add(handL);
  // feet peeking from the hem
  for (const s of [-1, 1]) { const ft = new THREE.Group(); ft.position.set(s * 0.22, 0.0, 0.5); body.add(ft); for (let f = 0; f < 3; f++) { const a = -0.5 + f * 0.5; const toe = new THREE.Mesh(turned([[0.014, 0], [0.016, 0.08], [0.026, 0.1], [0.001, 0.12]], 16), skin); toe.rotation.x = Math.PI / 2; toe.rotation.z = a; ft.add(toe); } }
  // the staff: a gnarled branch through the right fist, a crescent holding a star crystal that glows
  const staff = new THREE.Group(); handR.add(staff); staff.position.set(0, 0.03, 0.02); staff.rotation.set(0.3, 0, 0.4);
  const shaft = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -0.85, 0), V(0.03, -0.4, 0.02), V(-0.02, 0.1, 0), V(0.03, 0.5, -0.02), V(0, 0.75, 0)]), 32, 0.03, 8), toonC('#6a4a2a', [0.4, 0.72, 1.0])); staff.add(shaft);
  for (const y of [-0.3, 0.32]) { const knob = new THREE.Mesh(turned([[0.001, -0.03], [0.04, -0.02], [0.042, 0.02], [0.001, 0.03]], 12), toonC('#5a3a20')); knob.position.y = y; staff.add(knob); }
  const cres = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI * 1.4), gold); cres.position.y = 0.86; cres.rotation.z = -Math.PI * 0.2; staff.add(cres);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.9, 1.6), toneMapped: false })); crystal.scale.y = 1.5; crystal.position.y = 0.86; crystal.userData.noAO = true; staff.add(crystal);
  const glow = new THREE.PointLight(0x9cc8ff, 2.5, 4, 2); glow.position.y = 0.86; staff.add(glow);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const st = { t: 0, blink: 0, nextBlink: 2, act: null, actT: 0, look: V(0, 1.1, 5) };
  return {
    root, crystal, headTop: () => headG.localToWorld(V(0, 0.75, -0.1)),
    act(a) { st.act = a; st.actT = 0; },
    lookAt(v) { st.look.copy(v); },
    update(dt, t) {
      st.t += dt; st.actT += dt; const a = st.act, m = st.actT;
      const cast = a === 'cast' ? ease(m / 0.35) * (1 - ease((m - 1.6) / 0.5)) : 0; const rib = a === 'ribbit' ? Math.sin(Math.min(1, m / 0.8) * Math.PI) : 0; const nod = a === 'nod' ? Math.sin(Math.min(1, m / 0.7) * Math.PI * 2) * 0.2 : 0;
      if (m > 2.2) st.act = null;
      body.scale.set(1 + Math.sin(t * 1.6) * 0.01, 1 + Math.sin(t * 1.6 + 1) * 0.015, 1); body.position.y = rib * 0.12 + Math.max(0, Math.sin(t * 0.7)) * 0.0;
      throat.scale.setScalar(1 + Math.max(0, Math.sin(t * 2.2)) * 0.08 + rib * 0.6);
      st.nextBlink -= dt; if (st.nextBlink < 0) { st.blink = 0.16; st.nextBlink = 2 + Math.random() * 3; } st.blink = Math.max(0, st.blink - dt); const shut = st.blink > 0 ? 1 : 0;
      for (const E of eyes) { E.lid.rotation.x = -0.3 + shut * 1.15; }
      const to = body.worldToLocal(st.look.clone()); const yaw = Math.max(-0.6, Math.min(0.6, Math.atan2(to.x, to.z))); headG.rotation.y += (yaw + Math.sin(t * 0.4) * 0.12 - headG.rotation.y) * Math.min(1, dt * 3); headG.rotation.z = Math.sin(t * 0.6) * 0.06; headG.rotation.x = nod - cast * 0.15;
      hat.rotation.z = Math.sin(t * 1.1) * 0.05 + (headG.rotation.y) * 0.1;
      armR.rotation.x = -cast * 1.3 + Math.max(0, Math.sin(t * 0.9 + 1)) * 0.04; armR.rotation.z = cast * 0.25; armL.rotation.x = Math.sin(t * 0.8) * 0.03 - cast * 0.3; tails.forEach((r, i) => { r.rotation.x = Math.sin(t * 1.3 + i) * 0.06; });
      crystal.rotation.y += dt * (1.2 + cast * 8); const k = 1 + cast * 2 + Math.sin(t * 3) * 0.1; crystal.material.color.setRGB(0.7 * k, 0.9 * k, 1.6 * k); glow.intensity = 2.5 + cast * 10;
    },
  };
}
