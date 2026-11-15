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
import { Kit, mat } from './village.js';
import { lmat, glowMat, extrude, shape, cbox, prop, jitter } from './lowprops.js';
import { leafTex } from '../gfx/pixeltex.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/util.js';
import { mergeStatic } from '../gfx/merge.js';

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

/** a spoked gear wheel (extruded, teeth round the rim, a hub hole): radius R, teeth, thickness th; faces +z */
export const gearGeo = (R, teeth, th, hub = 0.18) => { const pts = []; const n = teeth * 4; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const q = i % 4; const rr = q === 1 || q === 2 ? R : R * 0.86; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    const holes = []; const spokes = teeth > 14 ? 6 : 5; for (let s = 0; s < spokes; s++) { const a0 = (s / spokes) * TAU + 0.18, a1 = ((s + 1) / spokes) * TAU - 0.18; const ri = R * 0.3, ro = R * 0.7; const h = []; for (let j = 0; j <= 4; j++) { const a = a0 + (a1 - a0) * (j / 4); h.push([Math.cos(a) * ro, Math.sin(a) * ro]); } for (let j = 4; j >= 0; j--) { const a = a0 + (a1 - a0) * (j / 4); h.push([Math.cos(a) * ri, Math.sin(a) * ri]); } holes.push(h); }
    const hh = []; for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU; hh.push([Math.cos(a) * R * hub * 0.5, Math.sin(a) * R * hub * 0.5]); } holes.push(hh.reverse());
    return extrude(shape(pts, holes), th, 0.03); };

// ================================================================ THE SPIRAL OBSERVATORY (the menu's hero tower, LERFOLESE)
// A tall fantasy observatory whose whole body SPIRALS: a twelve-sided shaft of pixel-textured ashlar whose faces TWIST
// as it rises (the stone courses wind round it), a HELICAL STAIR RAMP climbing the outside on stepped corbels (treads,
// a crenellated parapet with a marble coping, lanterns on the merlons), a raised marble STRING COURSE winding between
// the turns, arched windows lit warm from within climbing with the stair, brass GEARS half-sunk in the masonry and a
// great CLOCK DIAL; a corbelled, machicolated crown flaring to a crenellated terrace with a jutting balustraded PROW
// (where Sir Isaac stands), three corbelled BARTIZANS with bell-cast tiled roofs, gold finials and pennants; on the
// terrace an open OBSERVATORY PAVILION (eight marble columns, pointed arches) under a verdigris dome with SPIRAL gilt
// ribs, a lamplit lantern drum, a TWISTED copper spire and an ORRERY CROWN (armillary rings and planets on arms round
// it); BANNERS ripple from the parapet, IVY climbs the shaded flank, a lamplit gate opens at the foot.
// Terrace floor at y = 0; the shaft goes down to y = -BASE (the town's ground). Angles: dirOf(a) = (sin a, 0, cos a).
//   const T = clockTower({ upgrades, base, prowA, viewA }); T.group, T.update(dt, t), T.prow / T.door (local points)
//   prowA: the side the prow juts toward; viewA: the side the camera sees (the clock and the gate face it)
//   upgrades (Set of 'tower:*' ids from the hall): banners_royal, crystals_lit, orrery_gold, gears_gilded, lanterns
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lat = (pts, sides, phi0 = 0, phiLen = TAU) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(0.001, a), b)), sides, phi0, phiLen);

/** a twisted n-gon prism: its faces turn by `tw` radians per unit of height; apothem ap(y); UVs run along the faces */
function twistPrism(n, y0, y1, ap, tw, seg = 0.55, uvs = 0.9) {
  const rows = Math.max(2, Math.ceil((y1 - y0) / seg)); const pos = [], uv = []; const k = 1 / Math.cos(Math.PI / n);
  const P = (i, y) => { const a = (i / n) * TAU + tw * (y - y0); const R = ap(y) * k; return [Math.sin(a) * R, y, Math.cos(a) * R]; };
  for (let j = 0; j < rows; j++) { const ya = y0 + (y1 - y0) * (j / rows), yb = y0 + (y1 - y0) * ((j + 1) / rows);
    for (let i = 0; i < n; i++) { const A = P(i, ya), B = P(i + 1, ya), C = P(i + 1, yb), D = P(i, yb); const w = 2 * ap(ya) * Math.tan(Math.PI / n);
      pos.push(...A, ...B, ...C, ...A, ...C, ...D); const u0 = i * w * uvs, u1 = (i + 1) * w * uvs, v0 = ya * uvs, v1 = yb * uvs; uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
/** sweep a closed (out, up) profile (counter-clockwise) along a helix: angle phi0 + t * turns * TAU, height y0..y1, radius rr(y) + out */
function helixSweep({ phi0 = 0, turns = 1, y0, y1, rr, prof, n = 200, uvs = 0.9, cx = 0, cz = 0 }) {
  const pos = [], uv = []; const L = prof.length; const dir = Math.sign(turns) || 1;
  const P = (t, [px, py]) => { const a = phi0 + t * turns * TAU, y = y0 + (y1 - y0) * t, R = rr(y) + px; return [cx + Math.sin(a) * R, y + py, cz + Math.cos(a) * R]; };
  const pl = [0]; for (let k = 0; k < L; k++) { const a = prof[k], b = prof[(k + 1) % L]; pl.push(pl[k] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const arcs = [0]; for (let i = 0; i < n; i++) { const p0 = P(i / n, [0, 0]), p1 = P((i + 1) / n, [0, 0]); arcs.push(arcs[i] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])); }
  for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n;
    for (let k = 0; k < L; k++) { const a = prof[k], b = prof[(k + 1) % L]; const A = P(t0, a), B = P(t0, b), C = P(t1, b), D = P(t1, a);
      const u0 = arcs[i] * uvs, u1 = arcs[i + 1] * uvs, v0 = pl[k] * uvs, v1 = pl[k + 1] * uvs;
      if (dir > 0) { pos.push(...A, ...C, ...B, ...A, ...D, ...C); uv.push(u0, v0, u1, v1, u0, v1, u0, v0, u1, v0, u1, v1); }
      else { pos.push(...A, ...B, ...C, ...A, ...C, ...D); uv.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
/** a pointed (lancet) arch outline, base at y = 0, half-width w, springing at h1, apex at h2 */
const lancetPts = (w, h1, h2, seg = 7) => { const pts = [[-w, 0], [w, 0], [w, h1]]; for (let i = 1; i < seg; i++) { const s = i / seg; pts.push([w * Math.pow(Math.cos(s * Math.PI / 2), 0.75), h1 + (h2 - h1) * Math.sin(s * Math.PI / 2)]); } pts.push([0, h2]);
  for (let i = seg - 1; i >= 1; i--) { const s = i / seg; pts.push([-w * Math.pow(Math.cos(s * Math.PI / 2), 0.75), h1 + (h2 - h1) * Math.sin(s * Math.PI / 2)]); } pts.push([-w, h1]); return pts; };
const at = (a, R, y) => { const p = dirOf(a).multiplyScalar(R); p.y = y; return p; };
const tq = (a) => new THREE.Euler(0, a, 0); // local x = tangent, local z = radial out

export function clockTower({ seed = 11, upgrades = new Set(), base = 26, prowA = Math.PI, viewA = 0 } = {}) {
  const G = new THREE.Group(); G.name = 'spiralTower'; const K = new Kit(); const r = mulberry32(seed); const BASE = base;
  const YT = -2.8, RB = 3.35, RT = 2.25, y0 = -BASE + 1.4; const NS = 12, TW = 0.075;
  const rad = (y) => RT + (RB - RT) * Math.pow(1 - clamp01((y - y0) / (YT - y0)), 1.5);
  const STEP = TAU / NS; const faceAng = (y, a) => { const off = TW * (y - y0) + STEP / 2; return Math.round((a - off) / STEP) * STEP + off; }; // centre of the face nearest angle a at height y
  const gears = [], spinners = [], lamps = [], crystals = [];
  const near = (a, b, w) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < w;
  // ---------------------------------------------------------------- plinth and the twisting shaft
  K.add('stone', oct([[0.001, -BASE - 4], [RB + 1.7, -BASE - 4], [RB + 1.7, -BASE + 0.5], [RB + 1.35, -BASE + 0.62], [RB + 1.2, -BASE + 1.0], [RB + 0.5, -BASE + 1.1], [RB + 0.4, y0 + 0.2]], NS), V());
  K.add('stone|keepuv', twistPrism(NS, y0, YT + 0.3, rad, TW), V());
  // ---------------------------------------------------------------- the helical stair ramp: slab, fascia, parapet, coping, merlons, treads, corbels
  const RW = 1.3, RY0 = -BASE + 1.15, RY1 = YT - 1.0, TURNS = 2.75, PH0 = viewA + 0.6;
  const rampY = (t) => RY0 + (RY1 - RY0) * t, rampA = (t) => PH0 + t * TURNS * TAU, rr = (y) => rad(y) - 0.08;
  const sw = (prof, m, o = {}) => K.add(m + '|keepuv', helixSweep({ phi0: PH0, turns: TURNS, y0: RY0, y1: RY1, rr, prof, n: 330, ...o }), V());
  sw([[0, -0.42], [RW, -0.42], [RW, 0], [0, 0]], 'stone');
  sw([[RW - 0.12, -0.66], [RW + 0.1, -0.52], [RW + 0.1, -0.4], [RW - 0.12, -0.4]], 'marble');
  sw([[RW - 0.26, 0], [RW, 0], [RW, 0.6], [RW - 0.26, 0.6]], 'rubble');
  sw([[RW - 0.32, 0.6], [RW + 0.06, 0.6], [RW + 0.06, 0.71], [RW - 0.32, 0.71]], 'marble');
  const nT = Math.round(TURNS * 74); const merl = cbox(0.46, 0.36, 0.34, 0.03), tread = cbox(0.32, 0.14, RW - 0.36, 0.02), corb = cbox(0.3, 0.42, 0.85, 0.03), corb2 = cbox(0.24, 0.3, 0.5, 0.03);
  for (let k = 0; k < nT; k++) { const t = (k + 0.5) / nT, a = rampA(t), y = rampY(t), R = rr(y);
    K.add('stone', tread, at(a, R + (RW - 0.3) / 2 + 0.02, y + 0.07), tq(a));
    if (k % 4 === 0) K.add('stone', merl, at(a, R + RW - 0.13, y + 0.89), tq(a));
    if (k % 6 === 3) { K.add('stone', corb, at(a, R + 0.55, y - 0.62), new THREE.Euler(-0.35, a, 0, 'YXZ')); K.add('stone', corb2, at(a, R + 0.35, y - 1.0), new THREE.Euler(-0.2, a, 0, 'YXZ')); } }
  // the end caps: a landing at the foot, a door at the top into the crown
  { const a = rampA(0), R = rr(RY0); K.add('stone', cbox(1.2, 1.2, RW + 0.3, 0.04), at(a, R + RW / 2, RY0 - 0.6), tq(a)); }
  // ---------------------------------------------------------------- the twisting string course between the turns, and the clock band
  { const tEnd = Math.min(1, (YT - 0.6 - (RY0 + 5.55)) / (RY1 - RY0)); K.add('marble|keepuv', helixSweep({ phi0: PH0, turns: TURNS * tEnd, y0: RY0 + 5.55, y1: RY0 + 5.55 + (RY1 - RY0) * tEnd, rr: (y) => rad(y) - 0.05, prof: [[0, 0], [0.16, 0.06], [0.16, 0.24], [0, 0.3]], n: 300 }), V()); }
  // ---------------------------------------------------------------- windows climbing with the stair (lit or dark), lancets between the turns
  const lit = [], dark = []; const glass = new THREE.ShapeGeometry(shape(archPts(0.46, 1.15)), 1), fr = extrude(shape(archPts(0.78, 1.42), [archPts(0.46, 1.15).map(([x, y]) => [x, y + 0.08])]), 0.16, 0.02);
  const lg = new THREE.ShapeGeometry(shape(lancetPts(0.2, 0.9, 1.35)), 1), lfr = extrude(shape(lancetPts(0.36, 1.0, 1.6), [lancetPts(0.2, 0.9, 1.35).map(([x, y]) => [x, y + 0.1])]), 0.14, 0.02);
  const CLOCK_Y = -14.2, clockA = viewA;
  const win = (a, y, frame, g, litP) => { const R = rad(y); const E = tq(a); K.add('marble', frame, at(a, R + 0.05, y - 0.08), E); (r() < litP ? lit : dark).push(g.clone().applyMatrix4(new THREE.Matrix4().compose(at(a, R + 0.04, y), new THREE.Quaternion().setFromEuler(E), V(1, 1, 1)))); K.add('marble', cbox(0.7, 0.08, 0.22, 0.02), at(a, R + 0.12, y - 0.1), E); };
  for (let k = 0; k < TURNS * 7; k++) { const t = (k + 0.35) / (TURNS * 7); const y = rampY(t) + 1.75; if (y > YT - 1.6) continue; const a = faceAng(y, rampA(t) + 0.12); if (near(a, clockA, 0.55) && Math.abs(y - CLOCK_Y) < 3) continue; win(a, y, fr, glass, 0.72); }
  for (let k = 0; k < TURNS * 3; k++) { const t = (k + 0.8) / (TURNS * 3); const y = rampY(t) + 3.4; if (y > YT - 1.8) continue; const a = faceAng(y, rampA(t) + 0.5); if (near(a, clockA, 0.7) && Math.abs(y - CLOCK_Y) < 3) continue; win(a, y, lfr, lg, 0.55); }
  // ---------------------------------------------------------------- brass gears half-sunk in the masonry (pairs mesh and counter-rotate)
  const gearMat = lmat(upgrades.has('tower:gears_gilded') ? 'gold' : 'brass');
  const addGear = (a, y, R, teeth, dir, out = 0.05) => { const g = new THREE.Group(); g.position.copy(at(a, rad(y) + out, y)); g.rotation.y = a; G.add(g);
    const w = new THREE.Mesh(gearGeo(R, teeth, 0.22), gearMat); w.castShadow = true; w.receiveShadow = true; g.add(w); const hub = new THREE.Mesh(oct([[0.001, 0], [R * 0.2, 0], [R * 0.2, 0.3], [R * 0.12, 0.38], [0.001, 0.38]], 8), lmat('iron')); hub.rotation.x = Math.PI / 2; g.add(hub);
    K.add('rubble', oct([[R * 1.08, -0.05], [R * 1.12, 0.12], [0.001, 0.12]], 12), at(a, rad(y) - 0.05, y), new THREE.Euler(Math.PI / 2, 0, -a, 'ZXY')); gears.push({ w, speed: dir * (0.9 / R) }); return g; };
  for (const tg of [0.12, 0.47, 0.83]) { const t = tg; const y = rampY(t) + 3.9; const a = faceAng(y, rampA(t) + 2.6); if (near(a, clockA, 0.8)) continue; const R1 = 0.95 + r() * 0.3, n1 = 14 + Math.floor(r() * 5); addGear(a, y, R1, n1, 1); const n2 = Math.round(n1 * 0.6); addGear(a + (R1 * 1.25) / rad(y), y - R1 * 0.75, R1 * 0.6, n2, -n1 / n2 * 0.6, 0.09); }
  // ---------------------------------------------------------------- the great clock dial on the camera side: marble surround, brass bezel, pixel dial, hands
  const clock = (() => { const g = new THREE.Group(); g.position.copy(at(clockA, rad(CLOCK_Y) + 0.12, CLOCK_Y)); g.rotation.y = clockA; G.add(g);
    const sur = new THREE.Mesh(oct([[0.001, 0], [1.75, 0], [1.75, 0.18], [1.58, 0.3], [0.001, 0.3]], 16), lmat('marble')); sur.rotation.x = Math.PI / 2; g.add(sur);
    const bez = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.09, 4, 24), lmat('brass')); bez.position.z = 0.32; g.add(bez);
    const S = document.createElement('canvas'); S.width = S.height = 48; const c = S.getContext('2d'); c.fillStyle = '#1a1424'; c.fillRect(0, 0, 48, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x - 23.5, y - 23.5); if (d > 23.5) continue; const an = Math.atan2(y - 23.5, x - 23.5); const tick = d > 19 && d < 22.5 && Math.abs(((an / TAU) * 12 + 24) % 1 - 0.5) > 0.42; const ring = Math.abs(d - 17) < 0.7;
      c.fillStyle = tick ? '#ffd27a' : ring ? '#b48a3a' : d > 22.5 ? '#6a4a1e' : (x + y) % 7 === 0 ? '#2c2440' : d < 10 ? '#26203a' : '#221c34'; c.fillRect(x, y, 1, 1); }
    for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; c.fillStyle = '#e8d8a8'; c.fillRect(Math.round(23.5 + Math.cos(an) * 14) - 1, Math.round(23.5 + Math.sin(an) * 14) - 1, 2, 2); }
    const tx = new THREE.CanvasTexture(S); tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.46, 24), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6, metalness: 0.3, emissive: 0xffb060, emissiveIntensity: 0.06, emissiveMap: tx })); face.position.z = 0.31; g.add(face);
    const hand = (L, w, m) => { const p = new THREE.Group(); p.position.z = 0.38; g.add(p); const h = new THREE.Mesh(extrude(shape([[-w, -0.15], [w, -0.15], [w * 0.6, L * 0.8], [0, L], [-w * 0.6, L * 0.8]]), 0.03, 0.005), lmat(m)); p.add(h); return p; };
    const hh = hand(0.85, 0.07, 'gold'), mm = hand(1.25, 0.05, 'brass'); const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), lmat('gold')); cap.position.z = 0.45; g.add(cap);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return { hh, mm }; })();
  // ---------------------------------------------------------------- the gate at the foot (lamplit), steps down to the town
  { const a = faceAng(-BASE + 2.4, viewA - 0.5); const R = rad(-BASE + 2) + 0.1; const tg = V(Math.cos(a), 0, -Math.sin(a)); const Y = -BASE + 1.15;
    for (const s of [-1, 1]) K.add('marble', cbox(0.42, 1.95, 0.55, 0.03), at(a, R + 0.2, Y + 0.97).addScaledVector(tg, s * 0.92), tq(a));
    for (let i = 0; i <= 8; i++) { const b = (i / 8) * Math.PI; K.add('marble', cbox(i === 4 ? 0.36 : 0.3, 0.46, 0.6, 0.03), at(a, R + 0.22, Y + 1.95 + Math.sin(b) * 0.92).addScaledVector(tg, Math.cos(b) * 0.92), new THREE.Euler(0, a, b - Math.PI / 2, 'YXZ')); }
    const dg = new THREE.Mesh(new THREE.ShapeGeometry(shape(archPts(1.4, 2.6)), 1), glowMat('#ff9a48', 0.85)); dg.position.copy(at(a, R + 0.02, -BASE + 1.15)); dg.rotation.y = a; dg.userData.noAO = true; G.add(dg);
    for (let k = 0; k < 4; k++) K.add('stone', cbox(2.4 - k * 0.1, 0.22, 0.42, 0.02), at(a, R + 0.75 + k * 0.4, -BASE + 1.0 - k * 0.22), tq(a));
    for (const s of [-1, 1]) { const lan = prop('lantern', { h: 0.42 }); lan.position.copy(at(a + s * 0.36, R + 0.5, -BASE + 3.1)); G.add(lan); } }
  // ---------------------------------------------------------------- the crown: corbelled flare, machicolations, terrace, parapet with merlons
  const TA = 3.85; K.add('stone', oct([[RT - 0.02, YT], [RT + 0.25, YT + 0.9], [TA - 0.3, -0.72], [TA, -0.6], [TA, 0], [0.001, 0]], 16), V());
  for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; K.add('stone', cbox(0.26, 1.05, 0.75, 0.03), at(a, TA - 0.45, -1.2), new THREE.Euler(-0.5, a, 0, 'YXZ')); }
  K.add('marble', oct([[TA - 0.05, -0.62], [TA + 0.08, -0.55], [TA + 0.08, -0.4], [TA - 0.05, -0.36]], 16), V());
  const PW = 0.5; // the prow opening half-angle
  K.add('stone|keepuv', helixSweep({ phi0: prowA + PW, turns: (TAU - 2 * PW) / TAU, y0: 0, y1: 0, rr: () => TA - 0.32, prof: [[0, 0], [0.32, 0], [0.32, 0.85], [0, 0.85]], n: 64 }), V());
  K.add('marble|keepuv', helixSweep({ phi0: prowA + PW, turns: (TAU - 2 * PW) / TAU, y0: 0, y1: 0, rr: () => TA - 0.38, prof: [[0, 0.85], [0.46, 0.85], [0.46, 0.95], [0, 0.95]], n: 64 }), V());
  for (let i = 0; i < 26; i++) { const a = prowA + PW + 0.12 + (i / 25.5) * (TAU - 2 * PW - 0.24); K.add('stone', cbox(0.5, 0.44, 0.4, 0.04), at(a, TA - 0.16, 1.17), tq(a)); }
  // the prow: a jutting half-round balcony on a stepped corbel, a turned-baluster balustrade, a brass compass rose in its floor
  const PR = TA + 0.55; const prowP = at(prowA, PR, 0);
  { const half = (pts, s = 10) => lat(pts, s, prowA - Math.PI / 2, Math.PI);
    K.add('stone', half([[0.001, -0.5], [1.55, -0.5], [1.55, 0], [0.001, 0]]), prowP.clone().setY(0)); K.add('marble', half([[1.5, -0.62], [1.64, -0.55], [1.64, -0.42], [1.5, -0.38]]), prowP.clone().setY(0));
    K.add('stone', half([[0.001, -2.8], [0.3, -2.8], [0.6, -2.2], [1.1, -1.4], [1.45, -0.6], [0.001, -0.6]], 8), prowP.clone().setY(0));
    for (let k = 0; k <= 9; k++) { const a = prowA - Math.PI / 2 + 0.12 + (k / 9) * (Math.PI - 0.24); const q = dirOf(a).multiplyScalar(1.4).add(prowP); K.add('marble', oct([[0.07, 0], [0.1, 0.06], [0.055, 0.2], [0.095, 0.38], [0.055, 0.56], [0.08, 0.62]], 6), q); }
    K.add('marble|keepuv', helixSweep({ phi0: prowA - Math.PI / 2 + 0.05, turns: (Math.PI - 0.1) / TAU, y0: 0, y1: 0, rr: () => 1.24, prof: [[0, 0.62], [0.32, 0.62], [0.32, 0.74], [0, 0.74]], n: 16, cx: prowP.x, cz: prowP.z }), V());
    const rose = new THREE.Group(); rose.position.copy(prowP).setY(0.012); G.add(rose); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const L = i % 2 ? 0.55 : 0.95; const m = new THREE.Mesh(new THREE.ShapeGeometry(shape([[0, 0], [0.11, 0.11], [0, L], [-0.11, 0.11]])), lmat(i % 2 ? 'bronze' : 'brass')); m.rotation.set(-Math.PI / 2, 0, a); m.receiveShadow = true; rose.add(m); } }
  // a great gear in the crown corbels, close under Isaac's feet
  addGear(prowA + 0.9, YT + 0.8, 1.1, 18, -1, 0.75);
  // ---------------------------------------------------------------- bartizans: corbelled turrets with slits, a lit window, bell-cast tiled roofs, finials, pennants
  const crysMat = new THREE.MeshStandardMaterial({ color: 0x6a4ab0, emissive: new THREE.Color(upgrades.has('tower:crystals_lit') ? 0x9a6aff : 0x4a2a9a), emissiveIntensity: upgrades.has('tower:crystals_lit') ? 1.4 : 0.55, roughness: 0.18, metalness: 0.1, flatShading: true });
  const pennants = [];
  for (const [da, s] of [[1.75, 1.0], [-1.6, 0.9], [3.3, 1.1]]) { const a = prowA + da; const BK = new Kit(); const bg = new THREE.Group(); bg.position.copy(at(a, TA + 0.05, 0)); bg.scale.setScalar(0.74); G.add(bg); const c = V(); const o = () => V();
    BK.add('stone', oct([[0.001, -3.2], [0.25, -3.2], [0.45, -2.7], [0.75, -1.8], [0.98, -0.9], [1.0, -0.6], [0.001, -0.6]], 8), o());
    BK.add('rubble', oct([[0.95, -0.6], [0.95, 2.2], [0.001, 2.2]], 8), o()); BK.add('marble', oct([[0.93, 2.15], [1.08, 2.22], [1.08, 2.38], [0.001, 2.38]], 8), o());
    for (let k = 0; k < 8; k++) { const b = (k / 8) * TAU; if (k % 2) BK.add('plain:#1a1418', cbox(0.08, 0.5, 0.06, 0.01), dirOf(b).multiplyScalar(0.94).setY(0.9), tq(b)); }
    { const b = a; const p = dirOf(b).multiplyScalar(0.95).setY(1.1); const gw = new THREE.Mesh(new THREE.ShapeGeometry(shape(archPts(0.3, 0.62)), 1), glowMat('#ff9a3a', 1.15)); gw.position.copy(p); gw.rotation.y = b; gw.userData.noAO = true; bg.add(gw); BK.add('marble', extrude(shape(archPts(0.48, 0.76), [archPts(0.3, 0.62).map(([x, y]) => [x, y + 0.06])]), 0.1, 0.01), p.clone().add(V(0, -0.06, 0)), tq(b)); }
    BK.build(bg, { uvScale: { stone: 0.9, rubble: 0.8, marble: 0.6 } });
    const roof = new THREE.Mesh(lat([[0.001, 2.25 + 2.9 * s], [0.18, 2.25 + 2.5 * s], [0.55, 2.25 + 1.5 * s], [0.95, 2.25 + 0.55 * s], [1.25, 2.3], [1.22, 2.22], [0.001, 2.22]], 8, Math.PI / 8), mat('tile')); roof.castShadow = roof.receiveShadow = true; worldUVLocal(roof.geometry, 1.4); bg.add(roof);
    const fin = new THREE.Mesh(lat([[0.001, 0], [0.09, 0.05], [0.12, 0.2], [0.05, 0.32], [0.03, 0.9], [0.001, 1.0]], 6), lmat('gold')); fin.position.y = 2.25 + 2.85 * s; bg.add(fin);
    const cl = new THREE.Group(); cl.position.y = 2.25 + 2.85 * s + 0.22; for (let i = 0; i < 4; i++) { const g = jitter(new THREE.LatheGeometry([[0.001, 0], [0.06, 0.03], [0.065, 0.2], [0.001, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 5), 0.01, i + 3); const m = new THREE.Mesh(g, crysMat); m.rotation.set((r() - 0.5) * 1.2, r() * TAU, (r() - 0.5) * 1.2); cl.add(m); } bg.add(cl); crystals.push(cl);
    pennants.push({ p: bg.position.clone().setY((2.25 + 2.85 * s + 0.75) * 0.74), s: s * 0.74 }); void c; }
  const PCR = 1.75, CH = 2.6; K.add('marble', oct([[0.001, 0], [PCR + 0.45, 0], [PCR + 0.45, 0.12], [PCR + 0.3, 0.2], [0.001, 0.2]], 16), V());
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; K.add('marble', lat([[0.001, 0.2], [0.27, 0.2], [0.27, 0.34], [0.19, 0.42], [0.16, CH - 0.25], [0.22, CH - 0.12], [0.3, CH], [0.001, CH]], 8), at(a, PCR, 0)); }
  { const ch = 2 * PCR * Math.sin(Math.PI / 8) + 0.05, ap = PCR * Math.cos(Math.PI / 8); const w = ch / 2 - 0.2;
    const arc = lancetPts(w, 0.25, 1.05).slice(2).reverse(); const panel = extrude(shape([[-ch / 2, 0], [-w, 0], ...arc, [w, 0], [ch / 2, 0], [ch / 2, 1.25], [-ch / 2, 1.25]]), 0.28, 0.02);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; K.add('stone', panel, at(a, ap - 0.14, CH - 1.0), tq(a)); } }
  K.add('marble', oct([[PCR + 0.2, CH + 0.25], [PCR + 0.42, CH + 0.35], [PCR + 0.42, CH + 0.55], [PCR + 0.25, CH + 0.62], [0.001, CH + 0.62]], 16), V());
  const DY = CH + 0.6; const dprof = [[1.95, 0], [1.9, 0.45], [1.7, 1.1], [1.32, 1.68], [0.84, 2.1], [0.38, 2.34], [0.001, 2.4]];
  { const dome = new THREE.Mesh(lat(dprof, 32), glassDomeMat(upgrades)); dome.position.y = DY; dome.castShadow = dome.receiveShadow = true; dome.userData.keep = true; G.add(dome); // MENU AGENT: a leaded-glass observatory dome (see glassDomeMat)
    dome.onBeforeRender = () => { dome.getWorldPosition(dome.material.userData.U.uCenter.value); }; dome.material.userData.U.uSpin = { value: 0 }; G.userData.domeMat = dome.material;
    { const gm = lmat(upgrades.has('tower:orrery_gold') ? 'gold' : 'brass'); const band = new THREE.Mesh(new THREE.TorusGeometry(1.97, 0.06, 4, 32), gm); band.rotation.x = Math.PI / 2; band.position.y = DY + 0.04; band.castShadow = true; G.add(band); const col = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 4, 16), gm); col.rotation.x = Math.PI / 2; col.position.y = DY + 2.32; G.add(col);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), gm); c.position.set(Math.sin(a) * 1.97, DY + 0.12, Math.cos(a) * 1.97); c.scale.y = 1.6; G.add(c); } } // a gilt ring at the foot, a collar at the crown, crockets
    const rib = (s0) => { const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; const f = u * (dprof.length - 1); const i = Math.min(dprof.length - 2, Math.floor(f)), q = f - i; const R = dprof[i][0] + (dprof[i + 1][0] - dprof[i][0]) * q + 0.04, y = dprof[i][1] + (dprof[i + 1][1] - dprof[i][1]) * q + 0.02; const a = s0 + u * 1.5; pts.push(V(Math.sin(a) * R, y + DY, Math.cos(a) * R)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.05, 4).toNonIndexed(); };
    const rm = new THREE.Mesh(mergeGeometries(Array.from({ length: 12 }, (_, i) => rib((i / 12) * TAU))), lmat(upgrades.has('tower:orrery_gold') ? 'gold' : 'brass')); rm.castShadow = true; G.add(rm); }
  const LY = DY + 2.3; K.add('marble', oct([[0.6, LY], [0.6, LY + 0.1], [0.5, LY + 0.14], [0.001, LY + 0.14]], 6), V());
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; K.add('marble', cbox(0.12, 0.7, 0.12, 0.02), at(a + Math.PI / 6, 0.48, LY + 0.48), tq(a)); }
  { const lg2 = new THREE.Mesh(lat([[0.001, 0], [0.38, 0], [0.38, 0.7], [0.001, 0.7]], 6), glowMat(upgrades.has('tower:lanterns') ? '#ffd27a' : '#ffb04a', 1.3)); lg2.position.y = LY + 0.14; lg2.userData.noAO = true; G.add(lg2); }
  K.add('marble', oct([[0.001, LY + 0.84], [0.62, LY + 0.84], [0.62, LY + 0.98], [0.4, LY + 1.06], [0.001, LY + 1.06]], 6), V());
  const SY = LY + 1.05, SH = 3.6; { const sp = new THREE.Mesh(twistPrism(6, SY, SY + SH, (y) => 0.001 + 0.36 * Math.pow(Math.max(0, 1 - (y - SY) / SH), 1.15), 0.9, 0.3, 1.2), lmat('copper')); sp.castShadow = true; G.add(sp);
    const st = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, q = i % 2 ? 0.07 : 0.26; st[i ? 'lineTo' : 'moveTo'](Math.sin(a) * q, Math.cos(a) * q); } const vane = new THREE.Mesh(extrude(st, 0.04, 0.01), lmat('gold')); vane.position.y = SY + SH + 0.15; G.add(vane); G.userData.vane = vane; }
  // the orrery crown: armillary rings round the spire and planets on arms circling the lantern
  { const OY = SY + 1.25; const ringM = lmat(upgrades.has('tower:orrery_gold') ? 'gold' : 'brass');
    for (const [rr2, tx, tz, sp] of [[0.95, 0.42, 0.1, 0.32], [1.22, -0.3, 0.55, -0.22], [1.5, 0.18, -0.62, 0.16]]) { const piv = new THREE.Group(); piv.position.y = OY; piv.rotation.set(tx, 0, tz); const ring = new THREE.Mesh(new THREE.TorusGeometry(rr2, 0.035, 4, 32), ringM); ring.rotation.x = Math.PI / 2; ring.castShadow = true; piv.add(ring);
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), ringM); b.position.set(Math.cos(k * Math.PI / 2) * rr2, 0, Math.sin(k * Math.PI / 2) * rr2); piv.add(b); } G.add(piv); spinners.push({ o: piv, ax: 'y', s: sp }); }
    const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xff9a20, emissiveIntensity: 1.5, roughness: 0.3, flatShading: true })); sun.position.y = OY; G.add(sun); spinners.push({ o: sun, ax: 'y', s: 0.6 });
    const PL = [['#c87850', 0.1, 1.9, 0.5], ['#5a8ac8', 0.13, 2.35, 0.34], ['#d8b070', 0.17, 2.85, 0.22], ['#a84838', 0.09, 3.25, 0.15]]; if (upgrades.has('tower:orrery_gold')) PL.push(['#ffd060', 0.12, 3.6, 0.12]);
    PL.forEach(([c, s2, R, sp], i) => { const arm = new THREE.Group(); arm.position.y = DY + 2.35 + i * 0.22; arm.rotation.y = i * 1.9; G.add(arm); const rod = new THREE.Mesh(cbox(R, 0.03, 0.03, 0.005), lmat('brass')); rod.position.x = R / 2; arm.add(rod);
      const drop = new THREE.Mesh(cbox(0.025, 0.3, 0.025, 0.005), lmat('brass')); drop.position.set(R, -0.15, 0); arm.add(drop);
      const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(s2, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.6, flatShading: true })); pl.position.set(R, -0.32, 0); pl.castShadow = true; arm.add(pl); spinners.push({ o: arm, ax: 'y', s: sp });
      if (i === 2) { const ring = new THREE.Mesh(new THREE.RingGeometry(s2 * 1.4, s2 * 2.1, 12), new THREE.MeshStandardMaterial({ color: 0xd8c090, side: THREE.DoubleSide, roughness: 0.7, flatShading: true })); ring.rotation.x = -1.2; pl.add(ring); } }); }
  // inside the pavilion: the lamplit floor, a brass refractor aimed out of an arch, the stair hatch down to the Hall of Memories
  { const fl = new THREE.Mesh(new THREE.CircleGeometry(PCR - 0.25, 16), glowMat('#b8682a', 0.42)); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.205; fl.userData.noAO = true; G.add(fl);
    const tel = prop('telescope', { h: 1.6 }); tel.position.copy(at(prowA + 0.6, 0.9, 0.2)); tel.rotation.y = prowA + 0.6; G.add(tel);
    const hatch = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), glowMat('#ff9a48', 0.9)); hatch.rotation.x = -Math.PI / 2; hatch.position.copy(at(prowA + Math.PI, 0.8, 0.215)); hatch.rotation.z = -(prowA + Math.PI); hatch.userData.noAO = true; G.add(hatch); G.userData.doorGlow = hatch;
    const il = new THREE.PointLight(0xffa850, 3.2, 7, 1.6); il.position.set(0, 1.8, 0); G.add(il); lamps.push({ l: il, k: 3.2 }); }
  // ---------------------------------------------------------------- banners hanging from the parapet (cloth that ripples), pixel-art emblem
  const bannerTex = (() => { const W = 24, H = 64; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const royal = upgrades.has('tower:banners_royal');
    const base = royal ? ['#14205a', '#1e3080', '#2a44a8'] : ['#4a0e14', '#7a1620', '#9a2228']; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = (x * 7 + y * 3) % 5 === 0 ? 0 : (x % 6 === 0 ? 0 : 1 + ((x + y) % 2 ? 1 : 0) * (y % 3 === 0 ? 1 : 0)); g.fillStyle = base[Math.min(2, v)]; g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#e0a63a'; g.fillRect(0, 0, W, 2); g.fillRect(0, 2, 1, H - 10); g.fillRect(W - 1, 2, 1, H - 10); for (let x = 0; x < W; x++) { const tip = H - 8 + Math.abs(x - W / 2) * (8 / (W / 2)) * -1 + 8; g.clearRect(x, Math.floor(tip), 1, H); g.fillStyle = '#e0a63a'; g.fillRect(x, Math.floor(tip) - 1, 1, 1); }
    const AP = ['....GG....', '...G..g...', '.rrRrrrr..', 'rRWrrrrrrd', 'rRrrrrrrrd', 'rrrrrrrrdd', '.rrrrrrdd.', '..rrrddd..']; const P = { G: '#5f8a3a', g: '#3a5a22', r: '#e0a63a', R: '#ffd27a', W: '#fff0c0', d: '#a8701e' };
    AP.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') { g.fillStyle = P[row[x]]; g.fillRect(7 + x, 18 + y, 1, 1); } });
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const windU = { uTime: { value: 0 } }; const banners = [];
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  bannerMat.onBeforeCompile = (sh) => { sh.uniforms.uTime = windU.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float hang = 1.0 - uv.y; float ph = position.x * 3.1 + modelMatrix[3][0] * 0.7; transformed.z += sin(uTime * 2.6 - hang * 5.0 + ph) * 0.14 * hang + sin(uTime * 4.7 - hang * 9.0 + ph) * 0.04 * hang; transformed.x += sin(uTime * 1.7 - hang * 3.0) * 0.05 * hang;`); };
  bannerMat.customProgramCacheKey = () => 'towerBanner';
  for (const da of [0.95, -1.05, 2.3, -2.5]) { const a = prowA + da; const p = at(a, TA + 0.04, 0.7); const geo = new THREE.PlaneGeometry(0.9, 3.1, 4, 14); geo.translate(0, -1.55, 0); const b = new THREE.Mesh(geo, bannerMat); b.position.copy(p); b.rotation.y = a; b.castShadow = true; G.add(b); banners.push(b);
    K.add('plain:#2a2630', new THREE.BoxGeometry(1.05, 0.06, 0.06), p.clone().add(V(0, 0.03, 0)), tq(a)); }
  // pennants on the bartizan finials (small cloth that streams in the wind)
  for (const { p, s } of pennants) { const geo = new THREE.PlaneGeometry(0.9 * s, 0.32 * s, 6, 1); geo.translate(0.45 * s, 0, 0); const pm = new THREE.Mesh(geo, bannerMat); pm.position.copy(p); pm.rotation.y = -0.6; G.add(pm); banners.push(pm); }
  // ---------------------------------------------------------------- lanterns on the stair parapet (a few real lights near the top)
  { const nL = Math.round(TURNS * 6); for (let k = 0; k < nL; k++) { const t = (k + 0.5) / nL; const a = rampA(t), y = rampY(t), R = rr(y); const lan = prop('lantern', { h: 0.36 }); lan.position.copy(at(a, R + RW - 0.13, y + 0.71)); G.add(lan);
      if (k >= nL - 4 && k % 2 === 1) { const l = new THREE.PointLight(0xffa850, 2.4, 6, 1.7); l.position.copy(at(a, R + RW + 0.2, y + 1.1)); G.add(l); lamps.push({ l, k: 2.4 }); } } }
  // ---------------------------------------------------------------- ivy on the shaded flank and trailing over the parapet (pixel-art leaf-spray cards)
  { const qs = []; const ivyR = mulberry32(seed + 5); const shadeA = prowA + Math.PI * 0.85;
    for (let k = 0; k < 120; k++) { const y = -BASE + 1.5 + Math.pow(ivyR(), 1.35) * (BASE - 6); const a = shadeA + (ivyR() - 0.5) * 2.2 * (1 - (y + BASE) / BASE * 0.5); const R = rad(y) * 1.03 + 0.07 + ivyR() * 0.06;
      const s = 0.8 + ivyR() * 0.7; const q = new THREE.PlaneGeometry(s, s); q.rotateZ(ivyR() * TAU); q.applyMatrix4(new THREE.Matrix4().compose(at(a, R, y), new THREE.Quaternion().setFromEuler(new THREE.Euler((ivyR() - 0.5) * 0.4, a, 0)), V(1, 1, 1))); qs.push(q); }
    for (let k = 0; k < 40; k++) { const t = ivyR() * 0.7; const a = rampA(t), y = rampY(t), R = rr(y) + RW + 0.08; const s = 0.5 + ivyR() * 0.5; const q = new THREE.PlaneGeometry(s, s * 1.6); q.translate(0, -s * 0.5, 0); q.applyMatrix4(new THREE.Matrix4().compose(at(a, R, y + 0.55), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, a, (ivyR() - 0.5) * 0.4)), V(1, 1, 1))); qs.push(q); }
    const ivy = new THREE.Mesh(mergeGeometries(qs), new THREE.MeshStandardMaterial({ map: leafTex('vine'), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 })); ivy.castShadow = true; ivy.receiveShadow = true; G.add(ivy); }
  { const gl = new THREE.Mesh(mergeGeometries(lit), glowMat(upgrades.has('tower:lanterns') ? '#ffc86a' : '#ff9a3a', upgrades.has('tower:lanterns') ? 1.6 : 1.15)); gl.userData.noAO = true; G.add(gl); const dk = new THREE.Mesh(mergeGeometries(dark), lmat('glass', { color: 0x262c3c })); G.add(dk); }
  K.build(G, { uvScale: { stone: 0.9, rubble: 0.8, marble: 0.6, tile: 1.4 } });
  G.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.receiveShadow = true; });
  // MENU AGENT: batch every still part into one mesh per material (the menu's biggest cost); moving parts are kept
  for (const s of spinners) s.o.userData.keep = true; for (const g of gears) g.w.userData.keep = true; for (const c of crystals) c.userData.keep = true; G.userData.vane.userData.keep = true; if (clock.hh) clock.hh.userData.keep = true; if (clock.mm) clock.mm.userData.keep = true; if (G.userData.doorGlow) G.userData.doorGlow.userData.keep = true; for (const b of banners) b.userData.keep = true;
  G.userData.merged = mergeStatic(G);
  const api = {
    group: G, prow: prowP.clone(), prowA, door: at(prowA + Math.PI, 0.8, 1.1), doorOut: at(prowA, 3.5, 1.6), height: BASE, terraceR: TA, spireTop: SY + SH, crystals, banners, rad, rampY, rampA, ramp: { RY0, RY1, TURNS },
    update(dt, t) { windU.uTime.value = t; for (const g of gears) g.w.rotation.z += g.speed * dt * 0.35; for (const s of spinners) s.o.rotation[s.ax] += s.s * dt; if (G.userData.domeMat) G.userData.domeMat.userData.U.uTime.value = t;
      for (const [i, L] of lamps.entries()) L.l.intensity = L.k * (0.92 + Math.sin(t * 7.3 + i * 2) * 0.06 + Math.sin(t * 13.1 + i) * 0.04);
      const d = new Date(); const h = (d.getHours() % 12) + d.getMinutes() / 60, m = d.getMinutes() + d.getSeconds() / 60; clock.hh.rotation.z = -(h / 12) * TAU; clock.mm.rotation.z = -(m / 60) * TAU;
      G.userData.vane.rotation.y = Math.sin(t * 0.3) * 0.6 + t * 0.05; for (const [i, c] of crystals.entries()) c.rotation.y = Math.sin(t * 0.2 + i) * 0.2; crysMat.emissiveIntensity = (upgrades.has('tower:crystals_lit') ? 1.3 : 0.5) + Math.sin(t * 1.3) * 0.12; },
  };
  return api;
}
/** MENU AGENT: the observatory's LEADED-GLASS DOME. An opaque material (so the ink outlines and GTAO still treat it
 *  as a solid surface) that looks like glass: panes laid along the spiral of the gilt ribs, cut into diamonds by thin
 *  lead cames, each pane its own tint (sea-green, pale aqua, amber, a few ruby and cobalt); low roughness and a
 *  fresnel lift give the sky's reflections and sunset glints; and THROUGH each pane you see the lamplit interior: a ray
 *  from the eye is traced into the dome to the warm lamp-lit floor, the brass rings of the orrery turning over it, and
 *  the glowing sun at its heart (a parallax interior, no transparency). */
function glassDomeMat(upgrades) {
  const U = { uCenter: { value: new THREE.Vector3() }, uTime: { value: 0 }, uWarm: { value: upgrades.has('tower:lanterns') ? 1.35 : 1.0 } };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.15, envMapIntensity: 1.7, flatShading: false });
  m.userData.U = U;
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vWP; varying vec3 vOP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vOP = transformed;');
    sh.fragmentShader = `uniform vec3 uCenter; uniform float uTime; uniform float uWarm; varying vec3 vWP; varying vec3 vOP;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// the interior seen through the glass: trace the eye ray inward (object space, dome base at y = 0, radius ~1.9)
vec3 interior(vec3 o, vec3 d){
  vec3 col = vec3(0.0); float tf = (0.02 - o.y) / min(d.y, -1e-3); vec3 f = o + d * tf; float rf = length(f.xz);
  float lampLit = exp(-rf * rf * 0.55) * 1.1 + 0.18; col = vec3(1.0, 0.55, 0.22) * lampLit * 0.55 * uWarm * step(rf, 1.9); // the lamplit floor
  float flag = step(0.5, fract(f.x * 1.6)) + step(0.5, fract(f.z * 1.6)); col *= 0.8 + 0.2 * mod(flag, 2.0);
  // the orrery: three tilted brass rings and its sun, turning
  for (int i = 0; i < 3; i++) { float fi = float(i); float R = 0.55 + fi * 0.38; float h = 0.9 + fi * 0.12; float a = uTime * (0.3 - fi * 0.12) + fi * 2.1;
    float tr = (h - o.y) / (abs(d.y) < 1e-3 ? 1e-3 : d.y); if (tr > 0.0 && tr < tf) { vec3 q = o + d * tr; float r = length(q.xz); float w = 0.035; if (abs(r - R) < w) { float sh = 0.5 + 0.5 * sin(atan(q.z, q.x) * 3.0 + a); col = mix(col, vec3(1.0, 0.72, 0.3) * (0.5 + 0.8 * sh) * uWarm, 0.9); }
      float pa = atan(q.z, q.x) - a; vec2 pp = vec2(cos(a), sin(a)) * R; if (length(q.xz - pp) < 0.09) col = vec3(0.5, 0.7, 1.0) * 0.6; } }
  vec3 oc = o - vec3(0.0, 1.0, 0.0); float b = dot(oc, d); float c = dot(oc, oc) - 0.06; float disc = b * b - c; if (disc > 0.0 && -b - sqrt(disc) > 0.0) col = mix(col, vec3(1.6, 1.05, 0.45) * uWarm, 0.95); // the sun
  return col; }
` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  // panes along the spiral ribs (12 ribs, each sweeping 1.5 rad up the dome), rows by height, diamonds by lead cames
  float hgt = clamp(vOP.y / 2.4, 0.0, 1.0); float ang = atan(vOP.x, vOP.z); float sp = (ang - hgt * 1.5) / 6.28318 * 12.0; float row = hgt * 6.0;
  vec2 cell = vec2(floor(sp), floor(row)); vec2 fc = vec2(fract(sp), fract(row)); float dia = abs(fract(fc.x + fc.y) - 0.5) * 2.0; float dia2 = abs(fract(fc.x - fc.y) - 0.5) * 2.0;
  float ew = fwidth(sp) * 1.2 + 0.015; float came = max(max(step(fc.x, ew), step(1.0 - ew, fc.x)) * 0.0 + max(step(fc.y, 0.03), step(0.97, fc.y)), max(step(0.94, dia), step(0.94, dia2)) * step(0.15, hgt));
  float pick = hh(cell + 3.0); vec3 tint = pick < 0.42 ? vec3(0.35, 0.78, 0.62) : pick < 0.7 ? vec3(0.62, 0.88, 0.9) : pick < 0.86 ? vec3(1.0, 0.72, 0.32) : pick < 0.94 ? vec3(0.85, 0.22, 0.26) : vec3(0.25, 0.4, 0.95);
  tint *= 0.85 + 0.3 * hh(cell * 1.7 + floor(fc * 3.0));
  diffuseColor.rgb = mix(tint * 0.16, vec3(0.08, 0.075, 0.07), came); float gCame = came;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.08, 0.55, gCame);')
      .replace('#include <opaque_fragment>', `
  { vec3 V = normalize(vWP - cameraPosition); vec3 o = vWP - uCenter; float fres = pow(1.0 - clamp(dot(normalize(normal), -normalize((viewMatrix * vec4(V, 0.0)).xyz)), 0.0, 1.0), 3.0);
    vec3 inside = interior(o + V * 0.02, V) * tint * 1.7; outgoingLight += inside * (1.0 - gCame) * (1.0 - fres * 0.7);
    outgoingLight += vec3(1.0, 0.62, 0.42) * fres * 0.22 * (1.0 - gCame); }
  #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'glassDome'; return m;
}
/** box-projected UVs for a geometry in its own space (tile = 1 / s units) */
function worldUVLocal(geo, s) { const p = geo.attributes.position; geo.computeVertexNormals(); const n = geo.attributes.normal; const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (ay >= ax && ay >= az) { uv[i * 2] = x * s; uv[i * 2 + 1] = z * s; } else if (ax >= az) { uv[i * 2] = z * s; uv[i * 2 + 1] = y * s; } else { uv[i * 2] = x * s; uv[i * 2 + 1] = y * s; } }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo; }
