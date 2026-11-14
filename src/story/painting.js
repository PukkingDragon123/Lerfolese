// THE PAINTED CUTSCENE: Isaac and the white god-entity, composed like Michelangelo's Creation of Adam, built as a real 3D
// set (so the camera can breathe and push in) and run through the fresco painter (fx.js paintPass): plaster sky, a slope
// of green earth on the left where the boy reclines on one elbow and reaches out, and on the right the god-entity, pure
// white and radiant, flying out of a vast swirling crimson cloak, reaching back; their fingers almost touch.
//   const P = buildCreation(); scene = P.scene; P.update(dt, t); P.touch(k 0..1) closes the gap; P.spots = { hands, kid, god }
import * as THREE from 'three';
import { createKidIsaac, createGod } from '../models/npcs/story.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const h2 = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = fn(x, y); const q = (y * w + x) * 4; id.data[q] = o[0]; id.data[q + 1] = o[1]; id.data[q + 2] = o[2]; id.data[q + 3] = o[3] ?? 255; } g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; }

export function buildCreation() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xd8cdb8); scene.fog = new THREE.Fog(0xd8cdb8, 22, 60);
  // the plaster sky: warm lime-white, a band of grey-blue haze low on the left, soft cloud banks
  const sky = canvasTex(160, 90, (x, y) => { const u = x / 160, v = y / 90; let c = [226, 218, 200]; const haze = Math.exp(-Math.pow((v - 0.42) / 0.12, 2)) * Math.max(0, 1 - u * 1.8); c = c.map((k, i) => k * (1 - haze * 0.4) + [150, 168, 186][i] * haze * 0.4); const cl = Math.sin(u * 9 + Math.sin(v * 7) * 2) * Math.cos(v * 11 - u * 3); if (cl > 0.55) c = c.map((k) => k * 1.03 + 4); c = c.map((k) => k * (0.97 + h2(x >> 1, y >> 1) * 0.05)); return c; });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(48, 27), new THREE.MeshBasicMaterial({ map: sky, fog: false, toneMapped: false })); back.position.set(0, 2.5, -14); back.userData.noInk = true; scene.add(back);
  // light: a warm high key from the upper left (the chapel windows), a cool soft fill, a warm bounce from below
  const key = new THREE.DirectionalLight(0xffe8c8, 2.6); key.position.set(-6, 9, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -5, near: 1, far: 40 }); key.shadow.bias = -0.0006; scene.add(key);
  scene.add(new THREE.HemisphereLight(0xe8e4f0, 0x8a6a4a, 1.1));
  const bounce = new THREE.DirectionalLight(0xffc890, 0.5); bounce.position.set(2, -4, 5); scene.add(bounce);
  // the slope of green earth (faceted low poly, fresco greens and umber)
  const earthT = canvasTex(64, 64, (x, y) => { const g = y < 20 + Math.sin(x * 0.3) * 4; const k = 0.88 + h2(x >> 1, y >> 1, 3) * 0.2; const c = g ? [96, 118, 74] : y < 30 ? [118, 104, 70] : [96, 78, 56]; return c.map((v) => v * k); });
  const eg = new THREE.IcosahedronGeometry(1, 2); const ep = eg.attributes.position; for (let i = 0; i < ep.count; i++) { const x = ep.getX(i), y = ep.getY(i), z = ep.getZ(i); const n = 1 + (h2(Math.round(x * 5), Math.round(y * 5), Math.round(z * 5)) - 0.5) * 0.18; ep.setXYZ(i, x * n, y * n, z * n); }
  eg.computeVertexNormals();
  const earth = new THREE.Mesh(eg, new THREE.MeshStandardMaterial({ map: earthT, roughness: 0.95, flatShading: true })); earth.scale.set(5.2, 1.6, 3.2); earth.position.set(-5.4, -1.0, -0.6); earth.rotation.z = 0.32; earth.castShadow = earth.receiveShadow = true; scene.add(earth);
  const ridge = earth.clone(); ridge.scale.set(4, 1.1, 2.4); ridge.position.set(-7.6, -0.2, -2.6); ridge.rotation.z = 0.45; scene.add(ridge);
  // ISAAC, reclining on his elbow, reaching out with a limp, hopeful hand
  const kid = createKidIsaac(); const kyaw = new THREE.Group(); const kpitch = new THREE.Group(); kyaw.add(kpitch); kpitch.add(kid.root); scene.add(kyaw);
  kyaw.position.set(-3.55, 0.12, 0.2); kyaw.rotation.y = Math.PI / 2 - 0.35; kpitch.rotation.x = -1.02; kid.root.position.y = -0.62; kid.st.tremble = 0;
  kid.pose = (add, t) => {
    add('thighL', -1.05); add('shinL', 0.15); add('thighR', -1.6, 0, -0.15); add('shinR', 1.45); // one leg long, one knee raised
    add('uarmL', 0.75, 0, 0.35); add('farmL', -1.2); add('handL', 0.3); // propped on the far elbow
    add('uarmR', -1.45 + Math.sin(t * 0.6) * 0.02, 0, -0.2); add('farmR', -0.18); add('handR', 0.55, 0, 0.1); // reaching out
    add('chest', -0.12, 0.1); add('head', 0.1, 0.25, 0.12); add('spine', 0.05, 0.12);
  };
  kid.setExpr('think');
  // THE WHITE ONE, flying out of the swirl of his cloak, reaching back
  const god = createGod(); const gyaw = new THREE.Group(); const gpitch = new THREE.Group(); gyaw.add(gpitch); gpitch.add(god.root); scene.add(gyaw);
  gyaw.position.set(2.7, 1.5, -0.3); gyaw.rotation.y = -Math.PI / 2 + 0.3; gpitch.rotation.x = 1.2; god.root.position.y = -1.05;
  god.pose = (add, t) => {
    add('uarmR', -1.55 + Math.sin(t * 0.5) * 0.02, 0, -0.1); add('farmR', -0.05); add('handR', -0.1); // the reaching arm, a pointing hand
    add('uarmL', -0.9, 0, 0.6); add('farmL', -1.1); // the other arm round the swirl
    add('thighL', 0.15); add('shinL', 0.5); add('thighR', -0.3); add('shinR', 0.9); add('head', -0.75, 0.1); add('neck', -0.3); add('chest', -0.1, -0.1);
  };
  god.setExpr('neutral');
  // the swirling cloak: a vast hollow shell of crimson cloth, its rim rolled, its inside in shadow, a long streaming tail
  const cloakT = canvasTex(64, 64, (x, y) => { const fold = Math.sin(x * 0.4 + Math.sin(y * 0.12) * 3); const k = (fold > 0.5 ? 1.08 : fold < -0.5 ? 0.78 : 0.94) * (0.94 + h2(x >> 1, y >> 1, 9) * 0.1); return [150 * k, 58 * k, 52 * k]; });
  const cg = new THREE.SphereGeometry(1, 18, 12, Math.PI * 0.15, Math.PI * 1.35, Math.PI * 0.12, Math.PI * 0.78); const cp = cg.attributes.position; const base = cp.array.slice();
  const cloak = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: cloakT, side: THREE.DoubleSide, roughness: 0.85, flatShading: true })); cloak.scale.set(2.5, 1.7, 1.6); cloak.position.set(3.5, 1.55, -1.0); cloak.rotation.set(0.2, -0.5, -0.25); cloak.castShadow = cloak.receiveShadow = true; scene.add(cloak);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9, 16, 2), cloak.material); const tbase = tail.geometry.attributes.position.array.slice(); tail.position.set(4.6, 0.3, -0.2); tail.rotation.set(-0.4, 0.2, -0.35); scene.add(tail);
  const scarf = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.35, 14, 1), new THREE.MeshStandardMaterial({ color: 0x7aa88a, side: THREE.DoubleSide, roughness: 0.8, flatShading: true })); const sbase = scarf.geometry.attributes.position.array.slice(); scarf.position.set(3.4, 0.25, 0.6); scarf.rotation.set(0.3, -0.3, -0.45); scene.add(scarf);
  // the radiance round the god (a soft additive halo, kept out of the ink pass)
  const glowT = canvasTex(64, 64, (x, y) => { const d = Math.hypot(x - 31.5, y - 31.5) / 32; const a = Math.max(0, 1 - d) ** 2; return [255, 248, 232, a * 255]; }); glowT.magFilter = glowT.minFilter = THREE.LinearFilter;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, toneMapped: false })); halo.position.set(2.6, 1.6, -1.4); halo.userData.noInk = true; scene.add(halo);
  // the spark between the fingertips
  const spark = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false })); spark.userData.noInk = true; scene.add(spark);
  const api = {
    scene, kid, god, halo, spark, kpitch, gpitch,
    spots: { hands: V(0.0, 1.35, 0), kidHead: V(-3.0, 1.2, 0.4), godHead: V(2.2, 2.0, -0.2) },
    gap: 0, t: 0,
    /** k 0..1: the two hands drift together */
    touch(k) { api.gap = k; },
    handsWorld(out = V()) { const a = kid.handWorld(1, V()), b = god.handWorld(1, V()); return out.copy(a).lerp(b, 0.5); },
    update(dt) {
      api.t += dt; const t = api.t;
      kid.update(dt); god.update(dt);
      gyaw.position.x = 2.7 - api.gap * 0.55 + Math.sin(t * 0.4) * 0.03; gyaw.position.y = 1.5 + Math.sin(t * 0.55) * 0.05; kyaw.position.y = 0.12 + Math.sin(t * 0.5) * 0.008;
      const P = cp.array; for (let i = 0; i < P.length; i += 3) { const w = Math.sin(t * 0.8 + base[i] * 2.5 + base[i + 1] * 1.7) * 0.035; P[i] = base[i] * (1 + w); P[i + 1] = base[i + 1] * (1 + w * 0.6); P[i + 2] = base[i + 2] * (1 + w); } cp.needsUpdate = true;
      for (const [m, b, a] of [[tail, tbase, 0.18], [scarf, sbase, 0.12]]) { const Q = m.geometry.attributes.position.array; for (let i = 0; i < Q.length; i += 3) { const x = b[i]; Q[i + 2] = Math.sin(t * 1.4 - x * 1.6) * a * (x + 2) * 0.4; Q[i + 1] = b[i + 1] + Math.sin(t * 1.1 - x * 2) * a * 0.3; } m.geometry.attributes.position.needsUpdate = true; }
      halo.material.opacity = 0.5 + Math.sin(t * 1.3) * 0.06;
      const hp = api.handsWorld(); spark.position.copy(hp).add(V(0, 0, 0.3)); spark.material.opacity = Math.max(0, api.gap - 0.6) * 2.4 * (0.8 + Math.sin(t * 9) * 0.2); spark.scale.setScalar(0.6 + api.gap * 1.2);
    },
  };
  api.update(0.016);
  return api;
}
