// THE FOUR MENU OBJECTS of the tower menu (menu agent): small, finely made 3D instruments floating bottom-left, each
// alive under the pointer (motion, light and sound; the scene plays the sounds):
//   STUDIES  a brass-and-glass ALEMBIC on a walnut stand: a spirit burner flickers under a round-bottomed flask of
//            glowing liquor, a swan neck runs to a receiving vial. Hover: the flame climbs, the liquor boils (bubbles
//            rise) and brightens. A completed study waiting to be claimed turns the liquor to molten gold.
//   STARS    a CONSTELLATION CRYSTAL: a long lapis crystal held in a turning brass gimbal, a figure of tiny stars sealed
//            inside. Hover: the gimbal spins up, the stars ignite and their lines draw in. An earned achievement waiting
//            to be claimed makes it pulse with gold light.
//   JOURNAL  a stitched leather book with brass corners, a gilt apple and a red ribbon. Hover: the cover lifts and the
//            pages riffle; open: it opens wide.
//   SETTINGS two meshing brass GEARS around an engraved dial. Hover: the train turns; press: a quick wind.
//   const I = makeIcon('studies'); group.add(I.group); I.update(dt, t, hover 0..1, { ready, open })
import * as THREE from 'three';
import { tex, lathe, tube, cbox, extrude, shape, facet } from '../models/lowprops.js';
import { gearGeo } from '../models/tower.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const MAT = new Map();
/** realistic lit low-poly material: a hand-pixelled texture, real metalness for the env reflections, flat facets */
function smat(kind, { metal = 0, rough = 0.6, color = 0xffffff, emissive = 0, ei = 1 } = {}) {
  const k = [kind, metal, rough, color, emissive, ei].join('|'); let m = MAT.get(k); if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: kind ? tex(kind) : null, color: new THREE.Color(color), metalness: metal, roughness: rough, flatShading: true, emissive: new THREE.Color(emissive), emissiveIntensity: ei }); MAT.set(k, m); return m;
}
const brass = () => smat('brass', { metal: 0.9, rough: 0.32 }), gold = () => smat('gold', { metal: 0.95, rough: 0.26 }), walnut = () => smat('walnut', { rough: 0.7 });
function glass(tint = 0xcfe8ff, op = 0.3) { return new THREE.MeshStandardMaterial({ color: tint, metalness: 0.1, roughness: 0.04, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, flatShading: true, envMapIntensity: 2.2 }); }
const add = (p, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo.index ? facet(geo, 3) : geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; p.add(o); return o; };
const star4 = (r, k = 0.38) => { const p = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 2; const rr = i % 2 ? r * k : r; p.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return extrude(shape(p), r * 0.22, r * 0.06); };

// ---------------------------------------------------------------- STUDIES: the alembic
function alembic() {
  const g = new THREE.Group(); const liquorM = new THREE.MeshStandardMaterial({ color: 0x1a8a7a, emissive: 0x2ad8b0, emissiveIntensity: 0.9, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.92 });
  add(g, cbox(0.62, 0.06, 0.36, 0.015), walnut(), 0, -0.36, 0); add(g, cbox(0.56, 0.02, 0.3, 0.008), brass(), 0, -0.322, 0);
  // the spirit burner and its flame
  add(g, lathe([[0.0005, 0], [0.07, 0], [0.085, 0.03], [0.07, 0.07], [0.025, 0.085], [0.02, 0.11], [0.0005, 0.11]], 8), brass(), -0.08, -0.31, 0);
  const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.35), toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false });
  const flame = add(g, lathe([[0.0005, 0], [0.022, 0.02], [0.018, 0.05], [0.0005, 0.1]], 5), flameM, -0.08, -0.2, 0); flame.castShadow = false; flame.userData.noInk = true;
  // the tripod ring that holds the flask
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; add(g, cbox(0.012, 0.2, 0.012, 0.003), brass(), -0.08 + Math.cos(a) * 0.1, -0.24, Math.sin(a) * 0.1, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
  const ring = add(g, new THREE.TorusGeometry(0.1, 0.008, 4, 12), brass(), -0.08, -0.15, 0, Math.PI / 2);
  // the flask: a round bulb (faceted), a long neck; the liquor inside
  const prof = [[0.0005, -0.16], [0.07, -0.15], [0.115, -0.1], [0.13, -0.03], [0.115, 0.04], [0.07, 0.085], [0.034, 0.11], [0.03, 0.26], [0.04, 0.28]];
  const flask = add(g, lathe(prof, 9), glass(0xe8f4ff, 0.16), -0.08, -0.0, 0); flask.castShadow = false; flask.renderOrder = 3;
  const liq = add(g, lathe([[0.0005, -0.15], [0.065, -0.142], [0.105, -0.1], [0.118, -0.04], [0.11, 0.0], [0.0005, 0.0]], 9), liquorM, -0.08, -0.0, 0); liq.castShadow = false; liq.renderOrder = 2;
  add(g, new THREE.TorusGeometry(0.036, 0.01, 4, 10), brass(), -0.08, 0.2, 0, Math.PI / 2);
  // the swan neck to the receiving vial
  const neck = add(g, tube([[-0.08, 0.28, 0], [-0.06, 0.36, 0], [0.04, 0.34, 0], [0.14, 0.18, 0], [0.19, 0.0, 0]], 0.012, { seg: 14, rad: 5 }), glass(0xe8f4ff, 0.4)); neck.castShadow = false;
  const vial = add(g, lathe([[0.0005, -0.08], [0.04, -0.075], [0.05, -0.04], [0.045, 0.02], [0.02, 0.05], [0.018, 0.07]], 7), glass(0xf4ecff, 0.3), 0.2, -0.24, 0); vial.castShadow = false;
  const drop = add(g, lathe([[0.0005, -0.07], [0.035, -0.065], [0.042, -0.04], [0.0005, -0.035]], 7), liquorM, 0.2, -0.24, 0); drop.castShadow = false;
  add(g, cbox(0.016, 0.18, 0.016, 0.004), brass(), 0.26, -0.24, 0); add(g, new THREE.TorusGeometry(0.05, 0.007, 4, 10), brass(), 0.2, -0.18, 0, Math.PI / 2);
  // bubbles
  const bubM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc8fff0, emissiveIntensity: 1.2, transparent: true, opacity: 0.8, flatShading: true, depthWrite: false }); const bubs = [];
  for (let i = 0; i < 7; i++) { const b = add(g, new THREE.OctahedronGeometry(0.012 + (i % 3) * 0.004, 0), bubM, -0.08, -0.1, 0); b.castShadow = false; b.userData.ph = i / 7; bubs.push(b); }
  const light = new THREE.PointLight(0x5af0d0, 0.6, 1.6, 1.8); light.position.set(-0.08, -0.05, 0.25); g.add(light);
  const fl = new THREE.PointLight(0xffa040, 0.4, 1.2, 1.8); fl.position.set(-0.08, -0.18, 0.15); g.add(fl);
  const teal = new THREE.Color(0x2ad8b0), goldC = new THREE.Color(0xffb830);
  return { group: g, update(dt, t, h, o = {}) { const k = h; const boil = 0.25 + k * 0.75; const want = o.ready ? goldC : teal; liquorM.emissive.lerp(want, Math.min(1, dt * 3)); liquorM.color.copy(liquorM.emissive).multiplyScalar(0.55);
    liquorM.emissiveIntensity = 0.7 + k * 0.9 + (o.ready ? 0.4 + Math.sin(t * 4) * 0.3 : 0); light.color.copy(liquorM.emissive); light.intensity = 0.5 + k * 1.6 + (o.ready ? 0.8 : 0);
    const f = 1 + k * 0.9 + Math.sin(t * 23) * 0.12 + Math.sin(t * 37) * 0.08; flame.scale.set(1 + k * 0.3, f, 1 + k * 0.3); fl.intensity = 0.3 + k * 0.9 + Math.sin(t * 29) * 0.08;
    for (const b of bubs) { const u = (t * (0.35 + boil * 0.9) + b.userData.ph) % 1; b.visible = k > 0.05 || o.ready; b.position.set(-0.08 + Math.sin(u * 9 + b.userData.ph * 20) * 0.05 * (1 - u), -0.13 + u * 0.12, Math.cos(b.userData.ph * 30) * 0.04 * (1 - u)); b.scale.setScalar(0.4 + u); }
    drop.scale.y = 1 + Math.sin(t * 2) * 0.05; } };
}

// ---------------------------------------------------------------- STARS: the constellation crystal in its gimbal
function starCrystal() {
  const g = new THREE.Group(); const cryM = new THREE.MeshStandardMaterial({ color: 0x3a3a9a, emissive: 0x2a2080, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.62, flatShading: true, depthWrite: false, envMapIntensity: 2.5, side: THREE.DoubleSide });
  const cry = add(g, lathe([[0.0005, -0.34], [0.09, -0.2], [0.12, -0.02], [0.11, 0.14], [0.0005, 0.36]], 6), cryM); cry.castShadow = false; cry.renderOrder = 3;
  const core = add(g, lathe([[0.0005, -0.2], [0.05, -0.08], [0.05, 0.08], [0.0005, 0.22]], 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.3, 0.9), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false })); core.castShadow = false; core.userData.noInk = true;
  // a little figure of stars sealed inside, and its lines
  const P = [[-0.05, 0.2], [0.03, 0.12], [-0.02, 0.02], [0.05, -0.06], [-0.04, -0.14], [0.02, -0.22]]; const starM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.2), toneMapped: false }); const stars = [];
  for (const [x, y] of P) { const s = add(g, new THREE.OctahedronGeometry(0.014, 0), starM, x, y, 0); s.castShadow = false; s.userData.noInk = true; stars.push(s); }
  const lineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.85, 1.6), toneMapped: false, transparent: true, opacity: 0 }); const lines = [];
  for (let i = 0; i < P.length - 1; i++) { const a = V(P[i][0], P[i][1], 0), b = V(P[i + 1][0], P[i + 1][1], 0); const L = a.distanceTo(b); const l = add(g, new THREE.BoxGeometry(0.004, L, 0.004), lineM); l.position.copy(a).lerp(b, 0.5); l.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2; l.castShadow = false; l.userData.noInk = true; lines.push(l); }
  // the gimbal: two brass rings on pivots, a cradle stand, a gold star finial
  const outer = new THREE.Group(); g.add(outer); const inner = new THREE.Group(); outer.add(inner);
  add(outer, new THREE.TorusGeometry(0.27, 0.011, 4, 18), brass()); for (const s of [-1, 1]) add(outer, new THREE.OctahedronGeometry(0.022, 0), gold(), s * 0.27, 0, 0);
  add(inner, new THREE.TorusGeometry(0.23, 0.009, 4, 18), gold(), 0, 0, 0, Math.PI / 2, 0, 0); inner.rotation.y = Math.PI / 2;
  add(g, cbox(0.03, 0.16, 0.03, 0.006), brass(), 0, -0.38, 0); add(g, lathe([[0.0005, 0], [0.12, 0], [0.13, 0.025], [0.08, 0.05], [0.03, 0.06], [0.0005, 0.06]], 8), walnut(), 0, -0.5, 0);
  const fin = add(g, star4(0.055), gold(), 0, 0.42, 0); const light = new THREE.PointLight(0x8a7aff, 0.7, 1.8, 1.8); light.position.set(0, 0, 0.3); g.add(light);
  const vio = new THREE.Color(0x2a2080), goldC = new THREE.Color(0xc89020);
  return { group: g, update(dt, t, h, o = {}) { const k = h; outer.rotation.y += dt * (0.4 + k * 2.6); inner.rotation.x += dt * (0.3 + k * 1.8); fin.rotation.y = t * 0.8;
    cryM.emissive.lerp(o.ready ? goldC : vio, Math.min(1, dt * 3)); cryM.emissiveIntensity = 0.5 + k * 0.7 + (o.ready ? 0.5 + Math.sin(t * 4) * 0.35 : 0); light.color.copy(cryM.emissive).offsetHSL(0, 0, 0.3); light.intensity = 0.6 + k * 1.8 + (o.ready ? 1 : 0);
    stars.forEach((s, i) => { const tw = 0.7 + 0.3 * Math.sin(t * 5 + i * 2.1); s.scale.setScalar((0.7 + k * 0.8) * tw); }); lineM.opacity = Math.min(1, k * 1.4) * 0.9; lines.forEach((l, i) => { l.scale.y = Math.max(0.001, Math.min(1, k * 2.2 - i * 0.22)); }); } };
}

// ---------------------------------------------------------------- JOURNAL: the leather book
function book() {
  const g = new THREE.Group(); const leather = smat('leather', { rough: 0.75, color: 0xb06048 }); const pagesM = smat('parch', { rough: 0.9 });
  const body = new THREE.Group(); g.add(body); body.rotation.x = 0.95;
  const pages = add(body, cbox(0.5, 0.07, 0.37, 0.01), pagesM, 0.01, 0.045, 0); void pages;
  add(body, cbox(0.56, 0.022, 0.41, 0.006), leather, 0, 0, 0); add(body, cbox(0.04, 0.11, 0.41, 0.01), leather, -0.27, 0.05, 0); // back board, spine
  for (const z of [-0.12, 0, 0.12]) add(body, cbox(0.046, 0.115, 0.02, 0.005), gold(), -0.272, 0.05, z); // raised spine bands
  const hinge = new THREE.Group(); hinge.position.set(-0.27, 0.1, 0); body.add(hinge);
  add(hinge, cbox(0.56, 0.022, 0.41, 0.006), leather, 0.28, 0, 0);
  for (const [x, z] of [[0.52, -0.17], [0.52, 0.17]]) add(hinge, cbox(0.07, 0.03, 0.07, 0.008), brass(), x, 0.004, z); // brass corners
  const apple = add(hinge, extrude(shape([[0, -0.07], [0.05, -0.065], [0.07, -0.02], [0.065, 0.03], [0.035, 0.055], [0.008, 0.045], [0, 0.04], [-0.008, 0.045], [-0.035, 0.055], [-0.065, 0.03], [-0.07, -0.02], [-0.05, -0.065]]), 0.01, 0.004), gold(), 0.29, 0.016, 0, -Math.PI / 2);
  add(hinge, cbox(0.012, 0.01, 0.05, 0.003), gold(), 0.3, 0.018, -0.07); void apple;
  const clasp = add(hinge, cbox(0.08, 0.028, 0.06, 0.006), brass(), 0.56, -0.03, 0);
  const ribbon = add(body, cbox(0.02, 0.004, 0.14, 0.001), smat('clothRed', { rough: 0.8 }), 0.12, 0.012, 0.25); void ribbon; void clasp;
  const leaves = []; for (let i = 0; i < 4; i++) { const p = new THREE.Group(); p.position.set(-0.24, 0.085, 0); body.add(p); add(p, cbox(0.47, 0.004, 0.35, 0.001), pagesM, 0.235, 0, 0); leaves.push(p); }
  const light = new THREE.PointLight(0xffc880, 0, 1.4, 1.8); light.position.set(0, 0.3, 0.2); body.add(light);
  let open = 0;
  return { group: g, update(dt, t, h, o = {}) { const want = o.open ? 1 : 0; open += (want - open) * Math.min(1, dt * 6); const k = h;
    hinge.rotation.z = 0.12 + k * 0.5 + open * (Math.PI * 0.9 - 0.62) + Math.sin(t * 5) * 0.025 * k; light.intensity = k * 1.4 + open * 2;
    leaves.forEach((p, i) => { const u = ((t * 1.6 + i * 0.25) % 1); p.rotation.z = k > 0.2 || open > 0.2 ? Math.min(hinge.rotation.z - 0.05, (k * 0.4 + open) * Math.PI * 0.85 * Math.max(0, Math.sin(u * Math.PI)) * (0.4 + i * 0.12)) : 0; }); } };
}

// ---------------------------------------------------------------- SETTINGS: the gear train and dial
function gears() {
  const g = new THREE.Group(); const big = add(g, gearGeo(0.24, 14, 0.05), brass(), -0.05, 0.03, 0); const small = add(g, gearGeo(0.14, 9, 0.05), smat('bronze', { metal: 0.9, rough: 0.34 }), 0.27, -0.17, -0.01);
  const tiny = add(g, gearGeo(0.09, 7, 0.045), smat('iron', { metal: 0.85, rough: 0.4 }), 0.12, 0.27, -0.015);
  const dialS = (() => { const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); for (let y = 0; y < 40; y++) for (let X = 0; X < 40; X++) { const d = Math.hypot(X - 19.5, y - 19.5); if (d > 19.5) continue; const an = Math.atan2(y - 19.5, X - 19.5); const tick = d > 14.5 && d < 18 && Math.abs((((an / TAU) * 24 + 48) % 1) - 0.5) > 0.36;
    x.fillStyle = d > 18.5 ? '#4b2a17' : tick ? '#24130f' : d > 13.5 ? '#d8a63a' : (X + y) % 7 === 0 ? '#f2d36c' : '#fff0c0'; x.fillRect(X, y, 1, 1); } const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.115, 16), new THREE.MeshStandardMaterial({ map: dialS, metalness: 0.4, roughness: 0.45 })); face.position.set(-0.05, 0.03, 0.04); g.add(face);
  add(g, new THREE.TorusGeometry(0.118, 0.012, 4, 16), gold(), -0.05, 0.03, 0.04);
  const needle = add(g, cbox(0.018, 0.1, 0.008, 0.003), smat('iron', { metal: 0.9, rough: 0.3, color: 0x404050 }), -0.05, 0.03, 0.055); needle.geometry.translate(0, 0.04, 0);
  add(g, lathe([[0.0005, 0], [0.025, 0], [0.02, 0.03], [0.0005, 0.035]], 6), gold(), -0.05, 0.03, 0.05, Math.PI / 2);
  const light = new THREE.PointLight(0xffd090, 0, 1.4, 1.8); light.position.set(0, 0.1, 0.35); g.add(light);
  let spin = 0, v = 0;
  return { group: g, kick() { v += 9; }, update(dt, t, h) { v *= Math.exp(-dt * 2.2); spin += dt * (0.15 + h * 1.4) + v * dt; big.rotation.z = spin; small.rotation.z = -spin * (14 / 9) + 0.2; tiny.rotation.z = -spin * 2 + 0.1;
    needle.rotation.z = -spin * 0.5 + Math.sin(t * 9) * 0.04 * h; light.intensity = h * 1.6; } };
}

const MAKERS = { studies: alembic, stars: starCrystal, journal: book, settings: gears };
export function makeIcon(kind) { const I = MAKERS[kind](); I.group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; }); return I; }
