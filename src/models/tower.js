// The Star-Watcher Tower: a tall octagonal stone observatory on the hill beyond Newton's orchard, where the Star Gallery
// (the library-museum, scenes/gallery.js) lives. Sharp low-poly architecture with pixel-art masonry (village Kit, world
// UVs): a stepped plinth, a tapering shaft with string courses and buttress piers, arched slit windows lit warm from
// within (some dark) climbing round with the stair, a machicolated gallery on stone corbels with a crenellated parapet,
// the observatory drum, a ribbed verdigris copper dome with its shutter slit open and a brass refractor reaching for the
// stars, a spire with a star vane. The entrance is a gabled stone porch with a voussoir arch, studded double doors on
// iron strap hinges that swing inward (setOpen), steps, a bracket lantern, and a warm vestibule behind (an inner
// archway, the first stair treads, a hanging lamp) that the camera flies into. Ivy (pixel-art leaf cards) climbs the
// shaded flank. Door faces local +z.
//   const T = starTower(); scene.add(T.group); T.setOpen(0..1); T.doorFront / T.doorIn (local points); T.update(dt, t)
import * as THREE from 'three';
import { Kit } from './village.js';
import { lmat, glowMat, extrude, shape, cbox, prop } from './lowprops.js';
import { leafTex } from '../gfx/pixeltex.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2; const N = 8; const CO = Math.cos(Math.PI / N);
/** an octagonal lathe whose profile radii are APOTHEMS (flat faces centred on +z, every 45 degrees) */
const oct = (pts, sides = N, phiLen = TAU, phi0 = -Math.PI / sides) => new THREE.LatheGeometry(pts.map(([a, y]) => new THREE.Vector2(Math.max(0.001, a / Math.cos(Math.PI / sides)), y)), sides, phi0, phiLen);
const SHAFT0 = 2.5, SHAFT1 = 2.12, Y0 = 1.4, Y1 = 12.0; // the shaft's apothem tapers from Y0 to Y1
const ap = (y) => SHAFT0 + (SHAFT1 - SHAFT0) * Math.max(0, Math.min(1, (y - Y0) / (Y1 - Y0)));
const face = (i) => (i / N) * TAU; // face i's outward angle (0 = +z)
const dirOf = (a) => V(Math.sin(a), 0, Math.cos(a));
/** an arch outline (rectangle with a semicircular head), base at y = 0, centred on x = 0 */
const archPts = (w, h, seg = 10) => { const r = w / 2, pts = [[-r, 0], [r, 0], [r, h - r]]; for (let i = 1; i < seg; i++) { const a = (i / seg) * Math.PI; pts.push([Math.cos(a) * r, h - r + Math.sin(a) * r]); } pts.push([-r, h - r]); return pts; };

export function starTower({ seed = 7 } = {}) {
  const G = new THREE.Group(); G.name = 'starTower'; const K = new Kit(); const r = mulberry32(seed);
  const put = (geo, i, y, out, { ry = 0 } = {}) => { const a = face(i); const p = dirOf(a).multiplyScalar(out); p.y = y; return [geo, p, new THREE.Euler(0, a + ry, 0)]; };
  // ---------------------------------------------------------------- plinth, shaft, string courses, buttress piers
  K.add('stone', oct([[0.001, -0.6], [3.1, -0.6], [3.1, 0.5], [2.92, 0.62], [2.82, 0.7], [2.72, 0.7], [2.72, 1.22], [2.5, Y0]]), V());
  K.add('stone', oct([[SHAFT0, Y0], [SHAFT1, Y1]]), V());
  for (const y of [4.7, 8.5]) { const a = ap(y); K.add('marble', oct([[a - 0.02, y], [a + 0.15, y + 0.06], [a + 0.15, y + 0.22], [a + 0.06, y + 0.3], [a - 0.02, y + 0.3]]), V()); }
  for (let i = 1; i < N; i += 2) { const a = face(i) + Math.PI / N; const d = dirOf(a); // piers at the corners: stepped, battered
    for (const [h, w, dep, y] of [[3.4, 0.5, 0.55, 0.7], [2.4, 0.42, 0.36, 4.1], [1.0, 0.36, 0.22, 6.5]]) { const out = ap(y + h / 2) / CO + dep * 0.3 - 0.12; const p = d.clone().multiplyScalar(out); p.y = y + h / 2; K.add('stone', cbox(w, h, dep, 0.04), p, new THREE.Euler(0, a, 0)); }
    const cap = d.clone().multiplyScalar(ap(7.6) / CO + 0.02); cap.y = 7.55; K.add('marble', cbox(0.4, 0.14, 0.3, 0.03), cap, new THREE.Euler(-0.5, a, 0)); }
  // ---------------------------------------------------------------- the machicolated gallery: corbels, a flared ledge, parapet with merlons
  K.add('stone', oct([[SHAFT1, Y1 - 0.1], [SHAFT1 + 0.06, Y1 + 0.05], [2.72, Y1 + 0.55], [2.86, Y1 + 0.62], [2.86, Y1 + 0.82], [0.001, Y1 + 0.82]]), V());
  for (let i = 0; i < N; i++) for (const o of [-0.62, 0, 0.62]) { const a = face(i); const d = dirOf(a), sd = V(d.z, 0, -d.x); const p = d.clone().multiplyScalar(SHAFT1 + 0.2).addScaledVector(sd, o); p.y = Y1 - 0.35; K.add('stone', cbox(0.2, 0.55, 0.42, 0.03), p, new THREE.Euler(0, a, 0)); }
  const PY = Y1 + 0.82; K.add('stone', oct([[2.86, PY], [2.86, PY + 0.62], [2.56, PY + 0.62], [2.56, PY]]), V());
  for (let i = 0; i < N * 2; i++) { const a = (i / (N * 2)) * TAU; const p = dirOf(a).multiplyScalar(2.71 * (i % 2 ? 1 / CO * 0.985 : 1)); p.y = PY + 0.62 + 0.24; K.add('stone', cbox(i % 2 ? 0.42 : 0.62, 0.48, 0.3, 0.04), p, new THREE.Euler(0, a, 0)); }
  // ---------------------------------------------------------------- the observatory drum, cornice, copper dome with its slit, spire
  const DY = PY; K.add('rubble', oct([[1.86, DY], [1.86, DY + 2.05]], N), V()); K.add('marble', oct([[1.84, DY + 2.05], [2.06, DY + 2.15], [2.06, DY + 2.3], [1.92, DY + 2.36], [0.001, DY + 2.36]]), V());
  const domeY = DY + 2.36, R = 1.95, SL = 0.62; const prof = []; for (let i = 0; i <= 7; i++) { const t = (i / 7) * Math.PI / 2; prof.push([Math.cos(t) * R, Math.sin(t) * R * 0.98]); }
  const slitA = 0.35; // the shutter slit faces this way (front-left, toward the garden and the moon)
  const dome = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 15, slitA + SL / 2, TAU - SL), lmat('verd', { side: THREE.DoubleSide })); dome.position.y = domeY; dome.castShadow = dome.receiveShadow = true; G.add(dome);
  const ribs = []; for (let i = 0; i <= 15; i++) { const a = slitA + SL / 2 + (i / 15) * (TAU - SL); const pts = prof.map(([x, y]) => V(Math.sin(a) * (x + 0.03), y + domeY + 0.01, Math.cos(a) * (x + 0.03))); ribs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, i === 0 || i === 15 ? 0.07 : 0.035, 4)); }
  { const rm = new THREE.Mesh(mergeGeometries(ribs.map((g) => g.toNonIndexed())), lmat('copper')); rm.castShadow = true; G.add(rm); }
  { const inner = new THREE.Mesh(new THREE.CircleGeometry(1.9, 16), glowMat('#c87830', 0.55)); inner.rotation.x = -Math.PI / 2; inner.position.y = domeY + 0.02; inner.userData.noAO = true; G.add(inner); } // the lamp-lit observatory floor seen through the slit
  // the brass refractor through the slit, aimed high
  { const tel = new THREE.Group(); tel.position.set(Math.sin(slitA) * 0.5, domeY + 0.75, Math.cos(slitA) * 0.5); tel.rotation.set(0, slitA, 0); G.add(tel); const arm = new THREE.Group(); arm.rotation.x = -0.85; tel.add(arm);
    const tube = new THREE.Mesh(new THREE.LatheGeometry([[0.001, -0.9], [0.13, -0.9], [0.13, -0.82], [0.11, -0.8], [0.12, 1.6], [0.17, 1.62], [0.17, 1.9], [0.15, 1.92], [0.001, 1.92]].map(([a, b]) => new THREE.Vector2(a, b)), 8), lmat('brass')); tube.rotation.x = Math.PI / 2; arm.add(tube);
    for (const z of [-0.2, 0.6, 1.3]) { const band = new THREE.Mesh(new THREE.LatheGeometry([[0.13, -0.04], [0.145, -0.03], [0.145, 0.03], [0.13, 0.04]].map(([a, b]) => new THREE.Vector2(a, b)), 8), lmat('bronze')); band.rotation.x = Math.PI / 2; band.position.z = z; arm.add(band); }
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8), glowMat('#9ec8ff', 0.9)); lens.position.z = 1.925; lens.userData.noAO = true; arm.add(lens); tel.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  { const sp = new THREE.Mesh(oct([[0.001, 0], [0.32, 0], [0.32, 0.12], [0.14, 0.2], [0.1, 0.55], [0.03, 1.25], [0.001, 1.3]], 6), lmat('copper')); sp.position.y = domeY + R * 0.98 - 0.05; G.add(sp);
    const st = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? 0.07 : 0.24; st[i ? 'lineTo' : 'moveTo'](Math.sin(a) * rr, Math.cos(a) * rr); } const vane = new THREE.Mesh(extrude(st, 0.04, 0.01), lmat('gold')); vane.position.y = domeY + R + 1.45; G.add(vane); G.userData.vane = vane; }
  // ---------------------------------------------------------------- windows: arched slits climbing with the stair (lamplit or dark)
  const glass = new THREE.ShapeGeometry(shape(archPts(0.4, 0.95)), 1), frame = extrude(shape(archPts(0.66, 1.2), [archPts(0.4, 0.95).map(([x, y]) => [x, y + 0.08])]), 0.16, 0.02);
  const wins = [[2, 2.6], [3, 3.6], [5, 5.6], [6, 6.6], [7, 7.6], [1, 9.4], [2, 10.3], [4, 10.6], [6, 10.1], [0, 6.2], [0, 9.9], [4, 3.2]];
  const lit = []; const dark = [];
  const lean = -Math.atan((SHAFT0 - SHAFT1) / (Y1 - Y0));
  for (const [i, y] of wins) { const o = ap(y + 0.5); const a = face(i); const E = new THREE.Euler(lean, a, 0, 'YXZ'); const p = dirOf(a).multiplyScalar(o + 0.07); p.y = y; K.add('marble', frame, p.clone().add(V(0, -0.08, 0)), E);
    const gp = dirOf(a).multiplyScalar(o + 0.035); gp.y = y; const m4 = new THREE.Matrix4().compose(gp, new THREE.Quaternion().setFromEuler(E), V(1, 1, 1)); (r() < 0.72 ? lit : dark).push(glass.clone().applyMatrix4(m4));
    for (const [w, h, x, yy] of [[0.035, 0.9, 0, 0.47], [0.4, 0.035, 0, 0.55]]) K.add('plain:#2a2630', new THREE.BoxGeometry(w, h, 0.03), p.clone().add(V(0, yy, 0)).addScaledVector(dirOf(a), -0.02).add(V(Math.cos(a) * x, 0, -Math.sin(a) * x)), E);
    K.add('marble', cbox(0.6, 0.08, 0.2, 0.02), p.clone().add(V(0, -0.06, 0)).addScaledVector(dirOf(a), 0.05), E); }
  { const gl = new THREE.Mesh(mergeGeometries(lit), glowMat('#ffb04a', 1.35)); gl.userData.noAO = true; G.add(gl); const dk = new THREE.Mesh(mergeGeometries(dark), lmat('glass', { color: 0x30384a })); G.add(dk); }
  // ---------------------------------------------------------------- the porch: side walls, gable, voussoir arch, steps, the double doors
  const Z0 = 2.78, ZF = Z0 + 1.35, FY = 0.7; // porch from the shaft face out to the arch; floor at the plinth top
  for (const s of [-1, 1]) { K.add('stone', cbox(0.5, 2.85, ZF - Z0 + 0.1, 0.04), V(s * 1.12, FY + 1.42, (Z0 + ZF) / 2)); K.add('marble', cbox(0.6, 0.16, ZF - Z0 + 0.22, 0.03), V(s * 1.12, FY + 2.92, (Z0 + ZF) / 2)); }
  K.add('stone', cbox(2.74, 0.4, ZF - Z0, 0.04), V(0, FY + 3.15, (Z0 + ZF) / 2)); // lintel mass / ceiling
  for (const s of [-1, 1]) K.add('tile', cbox(1.72, 0.12, ZF - Z0 + 0.5, 0.03), V(s * 0.72, FY + 3.72, (Z0 + ZF) / 2 + 0.05), new THREE.Euler(0, 0, -s * 0.62));
  { const tri = new THREE.Shape([[-1.38, 0], [1.38, 0], [0, 0.98]].map(([x, y]) => new THREE.Vector2(x, y))); K.add('stone', extrude(tri, 0.3, 0.02), V(0, FY + 3.35, ZF - 0.12)); }
  const AW = 1.36, AH = 2.5; // the opening
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; const rr = AW / 2 + 0.17; const p = V(Math.cos(a) * rr, FY + AH - AW / 2 + Math.sin(a) * rr, ZF + 0.04); K.add('marble', cbox(i === 4 ? 0.3 : 0.25, i === 4 ? 0.44 : 0.36, i === 4 ? 0.4 : 0.34, 0.03), p, new THREE.Euler(0, 0, a - Math.PI / 2)); }
  K.add('stone', extrude(shape([[-1.0, 0], [1.0, 0], [1.0, AH + 0.5], [-1.0, AH + 0.5]], [archPts(AW, AH, 12)]), 0.24, 0.02), V(0, FY, ZF - 0.04)); // the front wall round the arch
  K.add('stone', cbox(2.74, 0.8, ZF - Z0 + 0.1, 0.02), V(0, FY - 0.4, (Z0 + ZF) / 2)); // porch floor on its footing
  for (let k = 0; k < 3; k++) { const top = FY - 0.235 * (k + 1); K.add('stone', cbox(2.3 - k * 0.12, top + 0.3, 0.4, 0.03), V(0, (top - 0.3) / 2, ZF + 0.25 + k * 0.38)); }
  // the vestibule: an inner glowing archway in the tower wall, the first treads of a stair rising left, a hanging lamp
  { const ia = new THREE.Mesh(new THREE.ShapeGeometry(shape(archPts(1.0, 2.1)), 2), glowMat('#e8823a', 0.75)); ia.position.set(0.15, FY, Z0 + 0.03); ia.userData.noAO = true; G.add(ia);
    K.add('marble', extrude(shape(archPts(1.3, 2.32), [archPts(1.0, 2.1).map(([x, y]) => [x, y + 0.02])]), 0.12, 0.02), V(0.15, FY - 0.02, Z0 + 0.06));
    for (let k = 0; k < 5; k++) K.add('stone', cbox(0.8, 0.18, 0.34, 0.02), V(-0.2 - k * 0.05, FY + 0.09 + k * 0.18, Z0 + 0.32 + k * 0.0), new THREE.Euler(0, 0.15 * k, 0)); }
  // doors: two leaves on inner hinges, planks with iron straps and studs, a ring pull
  const doors = []; const leafShape = (s) => { const pts = archPts(AW, AH, 12).filter(([x]) => s * x >= -1e-6).map(([x, y]) => [x, y]); if (s > 0) pts.unshift([0, 0]); else pts.push([0, 0]); return shape(pts); };
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * AW / 2, FY, ZF - 0.04); G.add(piv); const leaf = new THREE.Group(); leaf.position.x = -s * AW / 2; piv.add(leaf);
    const lg = extrude(leafShape(1), 0.09, 0.012); const uv = lg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.6, uv.getY(i) * 0.9);
    const lm = new THREE.Mesh(lg, lmat('oak')); lm.scale.x = s; lm.castShadow = lm.receiveShadow = true; leaf.add(lm);
    for (const y of [0.4, 1.3, 2.05]) { const st = new THREE.Mesh(cbox(AW / 2 - 0.08, 0.075, 0.03, 0.01), lmat('iron')); st.position.set(s * (AW / 4), y, 0.06); leaf.add(st); for (let k = 0; k < 4; k++) { const sd = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), lmat('iron')); sd.position.set(s * (0.08 + k * 0.15), y, 0.08); leaf.add(sd); } }
    for (let k = 1; k < 4; k++) { const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, AH - 0.5, 0.012), lmat('iron', { color: 0x221810 })); seam.position.set(s * k * 0.17, (AH - 0.5) / 2 + 0.05, 0.05); leaf.add(seam); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 4, 8), lmat('iron')); ring.position.set(s * 0.14, 1.15, 0.08); leaf.add(ring);
    doors.push({ piv, s });
  }
  // a bracket lantern beside the door
  { const lan = prop('lantern', { h: 0.42 }); lan.position.set(1.05, FY + 2.0, ZF + 0.42); G.add(lan); K.add('plain:#2a2630', new THREE.BoxGeometry(0.04, 0.04, 0.5), V(1.05, FY + 2.48, ZF + 0.2));
    const ll = new THREE.PointLight(0xffa850, 4.5, 7, 1.6); ll.position.set(1.05, FY + 2.15, ZF + 0.5); G.add(ll); G.userData.lanternLight = ll; }
  { const hl = prop('lantern', { h: 0.36 }); hl.position.set(0.25, FY + 2.15, (Z0 + ZF) / 2 - 0.1); G.add(hl); K.add('plain:#2a2630', new THREE.BoxGeometry(0.02, 0.5, 0.02), V(0.25, FY + 2.75, (Z0 + ZF) / 2 - 0.1)); // a lamp hung in the passage
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(0.9, ZF - Z0 - 0.1), lmat('red')); rug.rotation.x = -Math.PI / 2; rug.position.set(0.05, FY + 0.03, (Z0 + ZF) / 2); rug.receiveShadow = true; G.add(rug); }
  const inside = new THREE.PointLight(0xff9a48, 0.5, 4.5, 1.5); inside.position.set(0, FY + 1.6, Z0 + 0.7); G.add(inside);
  // ---------------------------------------------------------------- ivy up the shaded flank (pixel-art leaf-spray cards)
  { const qs = []; const ivyR = mulberry32(seed + 5); for (let k = 0; k < 46; k++) { const i = [3, 4, 5][Math.floor(ivyR() * 3)]; const y = 0.9 + Math.pow(ivyR(), 1.6) * 7.5; const a = face(i) + (ivyR() - 0.5) * 0.7; const o = ap(y) / Math.cos(Math.min(0.39, Math.abs(a - face(i)))) + 0.06 + ivyR() * 0.05;
      const s = 0.7 + ivyR() * 0.6 - y * 0.035; const q = new THREE.PlaneGeometry(s, s); q.rotateZ(ivyR() * TAU); q.applyMatrix4(new THREE.Matrix4().compose(dirOf(a).multiplyScalar(o).setY(y), new THREE.Quaternion().setFromEuler(new THREE.Euler((ivyR() - 0.5) * 0.4, a, 0)), V(1, 1, 1))); qs.push(q); }
    const ivy = new THREE.Mesh(mergeGeometries(qs), new THREE.MeshStandardMaterial({ map: leafTex('vine'), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 })); ivy.castShadow = true; ivy.receiveShadow = true; G.add(ivy); }
  K.build(G, { uvScale: { plaster: 0.35, stone: 1.25, rubble: 1.1, marble: 0.8, thatch: 0.6, canvas: 0.5, tile: 1.6 } });
  let open = 0;
  const api = {
    group: G, height: domeY + R + 1.7, doorY: FY,
    doorFront: V(0.3, FY + 2.3, ZF + 8.6), doorAt: V(0, FY + 1.35, ZF), doorIn: V(0.05, FY + 1.45, Z0 + 0.35),
    setOpen(k) { open = Math.max(0, Math.min(1, k)); const e = open * open * (3 - 2 * open); for (const d of doors) d.piv.rotation.y = -d.s * e * 1.75; inside.intensity = 0.4 + e * 2.6; },
    update(dt, t) { G.userData.vane.rotation.y = Math.sin(t * 0.3) * 0.6 + t * 0.05; G.userData.lanternLight.intensity = 4.2 + Math.sin(t * 7.1) * 0.25 + Math.sin(t * 13.3) * 0.15; },
  };
  return api;
}
