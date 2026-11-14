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
  // robe: a bell with folds that sway
  const robeG = turned([[0.001, 1.02], [0.2, 1.0], [0.3, 0.86], [0.38, 0.6], [0.47, 0.3], [0.56, 0.06], [0.6, 0.0]], 48).clone(); { const p = robeG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const a = Math.atan2(z, x); const k = 1 + Math.sin(a * 9) * 0.045 * (1 - y); p.setX(i, x * k); p.setZ(i, z * k); } robeG.computeVertexNormals(); }
  const robe = new THREE.Mesh(robeG, robeM); body.add(robe); const hem = new THREE.Mesh(turned([[0.6, 0.0], [0.62, 0.02], [0.6, 0.06], [0.565, 0.06]], 48), toonC('#d8a830', [0.4, 0.75, 1.0])); body.add(hem);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.045, 10, 32), toonC('#d8a830', [0.4, 0.75, 1.0])); collar.rotation.x = Math.PI / 2; collar.position.y = 0.98; body.add(collar);
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
  // hat: a crooked cone of rings along a bent spine, a brim, a band with a buckle
  const hat = new THREE.Group(); hat.position.set(0, 0.17, -0.02); hat.rotation.x = -0.12; headG.add(hat);
  const hatM = toonC('#ffffff', [0.4, 0.72, 1.0], { map: robeT, side: THREE.DoubleSide });
  { const pts = []; const N = 14; for (let i = 0; i <= N; i++) { const t = i / N; pts.push(V(Math.sin(t * 2.4) * 0.12 * t * t, t * 0.62, -Math.sin(t * 1.6) * 0.18 * t * t)); }
    const spine = new THREE.CatmullRomCurve3(pts); const cone = new THREE.TubeGeometry(spine, 28, 1, 24); const p = cone.attributes.position; const uvs = cone.attributes.uv;
    for (let i = 0; i < p.count; i++) { const t = uvs.getX(i); const c = spine.getPointAt(t); const rad = 0.26 * Math.pow(1 - t, 1.15) + 0.008; const d = V(p.getX(i), p.getY(i), p.getZ(i)).sub(spine.getPointAt(t)).normalize(); const q = c.addScaledVector(d, rad); p.setXYZ(i, q.x, q.y, q.z); } cone.computeVertexNormals();
    hat.add(new THREE.Mesh(cone, hatM)); }
  const brim = new THREE.Mesh(turned([[0.22, 0.0], [0.42, -0.02], [0.47, -0.05], [0.44, -0.035], [0.24, 0.02]], 40), hatM); brim.scale.z = 0.95; hat.add(brim);
  const band = new THREE.Mesh(turned([[0.245, 0.0], [0.25, 0.01], [0.235, 0.07], [0.228, 0.08]], 40), toonC('#7a2a3a')); hat.add(band);
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 4), toonC('#e8c040', [0.35, 0.75, 1.0])); buckle.position.set(0, 0.04, 0.24); buckle.rotation.z = Math.PI / 4; hat.add(buckle);
  // arms: sleeves and webbed hands; the right holds the staff
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.88, 0.02); body.add(sh);
    const sleeve = new THREE.Mesh(turned([[0.07, 0.0], [0.09, -0.12], [0.12, -0.3], [0.14, -0.36], [0.11, -0.37]], 24), robeM); sleeve.rotation.z = s * 0.35; sh.add(sleeve);
    const hand = new THREE.Group(); hand.position.set(s * 0.13, -0.38, 0.06); sh.add(hand);
    const palm = new THREE.Mesh(turned([[0.001, 0], [0.05, 0.01], [0.055, 0.04], [0.001, 0.06]], 20), skin); hand.add(palm);
    for (let f = 0; f < 4; f++) { const a = -0.6 + f * 0.4; const fg = new THREE.Mesh(turned([[0.012, 0], [0.014, -0.06], [0.022, -0.09], [0.001, -0.11]], 16), skin); fg.position.set(Math.sin(a) * 0.035, -0.02, Math.cos(a) * 0.035); fg.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); hand.add(fg); }
    arms.push({ sh, hand, s });
  }
  // feet peeking from the hem
  for (const s of [-1, 1]) { const ft = new THREE.Group(); ft.position.set(s * 0.22, 0.0, 0.42); body.add(ft); for (let f = 0; f < 3; f++) { const a = -0.5 + f * 0.5; const toe = new THREE.Mesh(turned([[0.014, 0], [0.016, 0.08], [0.026, 0.1], [0.001, 0.12]], 16), skin); toe.rotation.x = Math.PI / 2; toe.rotation.z = a; ft.add(toe); } }
  // the staff: a gnarled branch, a crescent holding a star crystal that glows
  const staff = new THREE.Group(); arms[1].hand.add(staff); staff.position.set(0, -0.02, 0.02); staff.rotation.x = 0.1;
  const shaft = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -0.85, 0), V(0.03, -0.4, 0.02), V(-0.02, 0.1, 0), V(0.03, 0.5, -0.02), V(0, 0.75, 0)]), 32, 0.03, 8), toonC('#6a4a2a', [0.4, 0.72, 1.0])); staff.add(shaft);
  const cres = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI * 1.4), toonC('#e8c040', [0.35, 0.75, 1.0])); cres.position.y = 0.86; cres.rotation.z = -Math.PI * 0.2; staff.add(cres);
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
      arms[1].sh.rotation.x = -0.45 - cast * 1.6 + Math.max(0, Math.sin(t * 0.9 + 1)) * 0.06; arms[1].sh.rotation.z = -0.15 + cast * 0.2; arms[0].sh.rotation.x = -0.25 + Math.sin(t * 0.8) * 0.05 - cast * 0.5; arms[0].sh.rotation.z = 0.25;
      crystal.rotation.y += dt * (1.2 + cast * 8); const k = 1 + cast * 2 + Math.sin(t * 3) * 0.1; crystal.material.color.setRGB(0.7 * k, 0.9 * k, 1.6 * k); glow.intensity = 2.5 + cast * 10;
    },
  };
}
