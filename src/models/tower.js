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
import { lmat, glowMat, extrude, shape, cbox, prop, jitter } from './lowprops.js';
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

/** a spoked gear wheel (extruded, teeth round the rim, a hub hole): radius R, teeth, thickness th; faces +z */
export const gearGeo = (R, teeth, th, hub = 0.18) => { const pts = []; const n = teeth * 4; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const q = i % 4; const rr = q === 1 || q === 2 ? R : R * 0.86; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    const holes = []; const spokes = teeth > 14 ? 6 : 5; for (let s = 0; s < spokes; s++) { const a0 = (s / spokes) * TAU + 0.18, a1 = ((s + 1) / spokes) * TAU - 0.18; const ri = R * 0.3, ro = R * 0.7; const h = []; for (let j = 0; j <= 4; j++) { const a = a0 + (a1 - a0) * (j / 4); h.push([Math.cos(a) * ro, Math.sin(a) * ro]); } for (let j = 4; j >= 0; j--) { const a = a0 + (a1 - a0) * (j / 4); h.push([Math.cos(a) * ri, Math.sin(a) * ri]); } holes.push(h); }
    const hh = []; for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU; hh.push([Math.cos(a) * R * hub * 0.5, Math.sin(a) * R * hub * 0.5]); } holes.push(hh.reverse());
    return extrude(shape(pts, holes), th, 0.03); };

// ================================================================ THE CLOCKWORK TOWER (the menu's hero tower, LERFOLESE)
// A tall fantasy tower rising far above a sunset land: an octagonal shaft of pixel-textured masonry with BRASS GEARS
// turning half-sunk in its faces (interlocking pairs counter-rotate), string courses and lamplit slit windows; four
// FLYING BUTTRESSES leaping from outer piers to the shaft, each pier crowned with a cluster of violet CRYSTALS; a
// corbelled crown flaring out to a crenellated terrace with a jutting PROW where Isaac stands; an ORRERY crown behind
// him (armillary rings and faceted brass planets on arms round a gold sun gem); BANNERS hanging from the parapet that
// ripple in the wind; CHAINS sagging from the orrery to the parapet posts; an arched stair door down into the
// Achievement Hall. Terrace floor at y = 0, door/prow along -z (the view), tower body down to y = -BASE.
//   const T = clockTower({ upgrades }); T.group, T.update(dt, t), T.prow (stand point), T.door (stair door, world-local)
//   upgrades (Set of 'tower:*' ids from the hall): banners_royal, crystals_lit, orrery_gold, gears_gilded, lanterns
export function clockTower({ seed = 11, upgrades = new Set(), base = 62 } = {}) {
  const G = new THREE.Group(); G.name = 'clockTower'; const K = new Kit(); const r = mulberry32(seed); const BASE = base;
  const AP0 = 3.5, AP1 = 2.9, YT = -3.2; const apS = (y) => AP0 + (AP1 - AP0) * Math.max(0, Math.min(1, (y + BASE) / (BASE + YT)));
  const gears = []; const spinners = [];
  // ---------------------------------------------------------------- shaft, plinth, string courses, slit windows
  K.add('stone', oct([[0.001, -BASE - 2], [AP0 + 1.2, -BASE - 2], [AP0 + 1.2, -BASE + 0.6], [AP0 + 0.8, -BASE + 1.2], [AP0, -BASE + 1.6]]), V());
  K.add('stone', oct([[AP0, -BASE + 1.6], [AP1, YT]]), V());
  for (let y = -BASE + 9; y < YT - 2; y += 8.5) { const a = apS(y); K.add('marble', oct([[a - 0.02, y], [a + 0.18, y + 0.08], [a + 0.18, y + 0.3], [a - 0.02, y + 0.38]]), V()); }
  const lit = [], darkW = []; const glass = new THREE.ShapeGeometry(shape(archPts(0.42, 1.1)), 1); const fr = extrude(shape(archPts(0.7, 1.36), [archPts(0.42, 1.1).map(([x, y]) => [x, y + 0.08])]), 0.16, 0.02);
  for (let k = 0; k < 18; k++) { const i = k % N, y = -BASE + 5 + k * 3.1 + r() * 1.2; if (y > YT - 2.5) break; const o = apS(y + 0.5); const a = face(i) + (i % 2 ? 0 : 0.0); const E = new THREE.Euler(0, a, 0); const p = dirOf(a).multiplyScalar(o + 0.06); p.y = y;
    K.add('marble', fr, p.clone().add(V(0, -0.08, 0)), E); const gp = dirOf(a).multiplyScalar(o + 0.03); gp.y = y; (r() < 0.7 ? lit : darkW).push(glass.clone().applyMatrix4(new THREE.Matrix4().compose(gp, new THREE.Quaternion().setFromEuler(E), V(1, 1, 1)))); }
  { const gl = new THREE.Mesh(mergeGeometries(lit), glowMat(upgrades.has('tower:lanterns') ? '#ffc86a' : '#ff9a3a', upgrades.has('tower:lanterns') ? 1.6 : 1.1)); gl.userData.noAO = true; G.add(gl); const dk = new THREE.Mesh(mergeGeometries(darkW), lmat('glass', { color: 0x262c3c })); G.add(dk); }
  // ---------------------------------------------------------------- brass gears half-sunk in the masonry (pairs mesh and counter-rotate)

  const gearMat = lmat(upgrades.has('tower:gears_gilded') ? 'gold' : 'brass');
  const addGear = (faceI, y, R, teeth, dir, out = 0.05, slide = 0) => { const a = face(faceI); const g = new THREE.Group(); const p = dirOf(a).multiplyScalar(apS(y) + out); p.addScaledVector(V(Math.cos(a), 0, -Math.sin(a)), slide); p.y = y; g.position.copy(p); g.rotation.y = a; G.add(g);
    const w = new THREE.Mesh(gearGeo(R, teeth, 0.22), gearMat); w.castShadow = true; w.receiveShadow = true; g.add(w); const hub = new THREE.Mesh(oct([[0.001, 0], [R * 0.2, 0], [R * 0.2, 0.3], [R * 0.12, 0.38], [0.001, 0.38]], 8), lmat('iron')); hub.rotation.x = Math.PI / 2; g.add(hub);
    K.add('rubble', oct([[R * 1.08, -0.05], [R * 1.12, 0.12], [0.001, 0.12]], 12), p.clone().addScaledVector(dirOf(a), -0.1), new THREE.Euler(Math.PI / 2, 0, -a, 'ZXY')); // the recess ring
    gears.push({ w, speed: dir * (0.9 / R) }); return g; };
  for (const [fi, y] of [[0, -9], [2, -16], [5, -24], [3, -34], [6, -12], [1, -44]]) { const R1 = 1.15 + r() * 0.35, n1 = 14 + Math.floor(r() * 6); addGear(fi, y, R1, n1, 1, 0.05, -0.55); addGear(fi, y - 1.6, R1 * 0.62, Math.round(n1 * 0.62), -n1 / Math.round(n1 * 0.62) * 0.62, 0.08, R1 * 0.4 + 0.45); }
  addGear(0, YT + 0.6, 1.0, 16, -1, 0.85, 0); // under the prow, big and close to the hero shot
  // ---------------------------------------------------------------- flying buttresses: piers, leaping arches, crystal pinnacles
  const crystals = []; const crysMat = new THREE.MeshStandardMaterial({ color: 0x6a4ab0, emissive: new THREE.Color(upgrades.has('tower:crystals_lit') ? 0x9a6aff : 0x4a2a9a), emissiveIntensity: upgrades.has('tower:crystals_lit') ? 1.4 : 0.55, roughness: 0.18, metalness: 0.1, flatShading: true });
  const crystal = (h, rr) => { const g = new THREE.LatheGeometry([[0.001, 0], [rr, 0.05], [rr * 1.05, h * 0.72], [0.001, h]].map(([x, y]) => new THREE.Vector2(x, y)), 5); return jitter(g, rr * 0.18, Math.floor(r() * 99)); };
  const cluster = (p, s) => { const g = new THREE.Group(); g.position.copy(p); for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(crystal(s * (0.6 + r() * 0.9), s * (0.1 + r() * 0.06)), crysMat); c.rotation.set((r() - 0.5) * 1.1, r() * TAU, (r() - 0.5) * 1.1); c.castShadow = true; g.add(c); } crystals.push(g); G.add(g); return g; };
  for (let i = 0; i < 4; i++) { const a = face(i * 2 + 1) + Math.PI / N; const d = dirOf(a); const PR = 10.5, PT = -BASE * 0.48; // the pier
    K.add('stone', oct([[1.3, -BASE - 1], [1.0, PT], [1.15, PT + 0.2], [1.15, PT + 0.6], [0.001, PT + 0.6]], 8), d.clone().multiplyScalar(PR));
    for (let k = 0; k < 2; k++) { const y0 = PT - 4 - k * 12; const p0 = d.clone().multiplyScalar(PR - 0.6); p0.y = y0; const p1 = d.clone().multiplyScalar(apS(y0 + 6) + 0.1); p1.y = y0 + 6 - k * 1.5; // the flyer: an arched beam
      const pts = []; for (let j = 0; j <= 10; j++) { const u = j / 10; const q = p0.clone().lerp(p1, u); q.y += Math.sin(u * Math.PI) * 1.1 - u * 0.4; pts.push(q); } const curve = new THREE.CatmullRomCurve3(pts);
      for (let j = 0; j < 10; j++) { const q = curve.getPoint((j + 0.5) / 10), tn = curve.getTangent((j + 0.5) / 10); const blk = cbox(0.62, 0.55, curve.getLength() / 10 + 0.04, 0.04); const m4 = new THREE.Matrix4().lookAt(V(), tn, V(0, 1, 0)); const e = new THREE.Euler().setFromRotationMatrix(m4); K.add(j % 2 ? 'stone' : 'rubble', blk, q, e); } }
    cluster(d.clone().multiplyScalar(PR).setY(PT + 0.55), 1.6); const ch = cbox(0.5, 1.4, 0.5, 0.04); K.add('marble', ch, d.clone().multiplyScalar(PR).setY(PT + 1.2)); }
  // ---------------------------------------------------------------- the crown: corbels flaring to the terrace, parapet with merlons, the prow
  const TA = 4.6; K.add('stone', oct([[AP1, YT], [AP1 + 0.25, YT + 1.1], [TA - 0.2, -0.75], [TA, -0.45], [TA, 0], [0.001, 0]]), V());
  for (let i = 0; i < N; i++) for (const o of [-0.9, 0, 0.9]) { const a = face(i); const d = dirOf(a), sd = V(d.z, 0, -d.x); const p = d.clone().multiplyScalar(AP1 + 0.5).addScaledVector(sd, o); p.y = YT + 0.7; K.add('stone', cbox(0.26, 1.3, 0.8, 0.03), p, new THREE.Euler(0.55, a, 0, 'YXZ')); }
  const PH = 0.85; const merl = []; for (let i = 0; i < N; i++) { const a = face(i); if (i === 4) continue; // face 4 = -z: the prow opening
    const d = dirOf(a); const p = d.clone().multiplyScalar(TA - 0.22);
    if (i === 3 || i === 5) { // the front diagonals: an open balustrade (turned stone balusters under a rail) so the land shows through
      const sd = V(d.z, 0, -d.x); for (let k = -5; k <= 5; k++) { const q = p.clone().addScaledVector(sd, k * 0.33); K.add('marble', oct([[0.08, 0], [0.11, 0.06], [0.06, 0.18], [0.1, 0.32], [0.06, 0.44], [0.09, 0.5]], 6), q); }
      K.add('marble', cbox(TA * 0.83 * 0.98, 0.1, 0.32, 0.03), p.clone().setY(0.55), new THREE.Euler(0, a, 0)); K.add('stone', cbox(TA * 0.83 * 0.98, 0.08, 0.36, 0.02), p.clone().setY(0.04), new THREE.Euler(0, a, 0)); continue; }
    K.add('stone', cbox(TA * 0.83 * 0.98, PH, 0.42, 0.04), p.clone().setY(PH / 2), new THREE.Euler(0, a, 0));
    for (const o of [-1.25, 0, 1.25]) { const sd = V(d.z, 0, -d.x); const q = p.clone().addScaledVector(sd, o); q.y = PH + 0.26; K.add('stone', cbox(0.62, 0.52, 0.46, 0.05), q, new THREE.Euler(0, a, 0)); merl.push(q); }
    K.add('marble', cbox(TA * 0.83, 0.08, 0.5, 0.02), p.clone().setY(PH + 0.01), new THREE.Euler(0, a, 0)); }
  // the prow: a jutting stone balcony toward -z on a great corbel, flagged, open at its tip
  const PZ = -TA - 1.7; { K.add('stone', extrude(shape([[-1.9, 0], [1.9, 0], [0.9, 2.1], [-0.9, 2.1]]), 0.45, 0.04), V(0, -0.45, -TA + 0.5), new THREE.Euler(Math.PI / 2, 0, 0));
    K.add('stone', extrude(shape([[-1.6, 0], [1.6, 0], [0, -3.4]]), 1.6, 0.05), V(0, -0.45, -TA + 0.2), new THREE.Euler(0, 0, 0), V(1, 1, 1)); // the great corbel under it
    for (const s of [-1, 1]) { const p = V(s * 1.45, 0.25, -TA - 0.4); K.add('stone', cbox(0.4, 0.5, 1.6, 0.04), p, new THREE.Euler(0, s * 0.45, 0)); K.add('marble', cbox(0.48, 0.1, 1.7, 0.02), p.clone().setY(0.53), new THREE.Euler(0, s * 0.45, 0)); } }
  // flagstones (a darker inset disc with a brass compass rose)
  { const rose = new THREE.Group(); rose.position.y = 0.012; G.add(rose); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const L = i % 2 ? 0.9 : 1.6; const sh = shape([[0, 0], [0.16, 0.16], [0, L], [-0.16, 0.16]]); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), lmat(i % 2 ? 'bronze' : 'brass')); m.rotation.set(-Math.PI / 2, 0, a); m.receiveShadow = true; rose.add(m); } rose.position.z = 0.6; }
  // ---------------------------------------------------------------- the stair door into the tower (Achievement Hall): an arched hood on the +z side
  const DZ = 2.6; { K.add('stone', extrude(shape([[-1.0, 0], [1.0, 0], [1.0, 2.6], [-1.0, 2.6]], [archPts(1.2, 2.25, 10)]), 0.5, 0.03), V(0, 0, DZ));
    K.add('stone', cbox(2.2, 0.3, 1.6, 0.04), V(0, 2.75, DZ + 0.45)); for (const s of [-1, 1]) K.add('stone', cbox(0.3, 2.6, 1.3, 0.04), V(s * 0.95, 1.3, DZ + 0.6));
    const dg = new THREE.Mesh(new THREE.ShapeGeometry(shape(archPts(1.2, 2.25, 10)), 1), glowMat('#e8823a', 0.7)); dg.position.set(0, 0.01, DZ + 0.52); dg.userData.noAO = true; G.add(dg); G.userData.doorGlow = dg;
    for (let k = 0; k < 3; k++) K.add('stone', cbox(1.15, 0.14, 0.3, 0.02), V(0, -0.07 - k * 0.14, DZ + 0.75 + k * 0.28)); }
  // ---------------------------------------------------------------- the orrery crown behind Isaac: column, armillary rings, planets on arms
  const ORZ = 1.2, ORY = 2.1; const orr = new THREE.Group(); orr.position.set(1.9, 0, ORZ); G.add(orr);
  { const col = new THREE.Mesh(oct([[0.001, 0], [0.5, 0], [0.5, 0.18], [0.3, 0.3], [0.22, 0.5], [0.16, ORY - 0.2], [0.26, ORY - 0.1], [0.001, ORY]], 8), lmat('bronze')); col.castShadow = true; orr.add(col);
    const sunGem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xff9a20, emissiveIntensity: 1.6, roughness: 0.3, flatShading: true })); sunGem.position.y = ORY + 0.25; orr.add(sunGem); spinners.push({ o: sunGem, ax: 'y', s: 0.6 });
    const sl = new THREE.PointLight(0xffa040, 1.6, 4.5, 1.8); sl.position.y = ORY + 0.25; orr.add(sl); G.userData.orreryLight = sl;
    const ringM = lmat(upgrades.has('tower:orrery_gold') ? 'gold' : 'brass'); for (const [rr, tx, tz, sp] of [[0.62, 0.4, 0.1, 0.35], [0.82, -0.3, 0.5, -0.25], [1.02, 0.15, -0.6, 0.18]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.022, 4, 28), ringM); const piv = new THREE.Group(); piv.position.y = ORY + 0.25; piv.rotation.set(tx, 0, tz); piv.add(ring); orr.add(piv); ring.rotation.x = Math.PI / 2; spinners.push({ o: piv, ax: 'y', s: sp }); }
    const PL = [['#c87850', 0.08, 0.5, 1.1], ['#5a8ac8', 0.11, 0.78, 0.7], ['#d8b070', 0.15, 1.1, 0.45], ['#a84838', 0.07, 1.34, 0.32]]; if (upgrades.has('tower:orrery_gold')) PL.push(['#ffd060', 0.12, 1.55, 0.25]);
    PL.forEach(([c, s, R, sp], i) => { const arm = new THREE.Group(); arm.position.y = ORY + 0.25 - 0.08 * i; arm.rotation.y = i * 1.7; orr.add(arm); const rod = new THREE.Mesh(new THREE.BoxGeometry(R, 0.018, 0.018), lmat('brass')); rod.position.x = R / 2; arm.add(rod);
      const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.6, flatShading: true })); pl.position.x = R; pl.castShadow = true; arm.add(pl); spinners.push({ o: arm, ax: 'y', s: sp });
      if (i === 2) { const ring = new THREE.Mesh(new THREE.RingGeometry(s * 1.4, s * 2.1, 14), new THREE.MeshStandardMaterial({ color: 0xd8c090, side: THREE.DoubleSide, roughness: 0.7, flatShading: true })); ring.rotation.x = -1.2; pl.add(ring); } }); }
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
  for (const i of [1, 7, 2, 6, 0]) { const a = face(i); const d = dirOf(a); const p = d.clone().multiplyScalar(TA + 0.05); p.y = PH - 0.15; const geo = new THREE.PlaneGeometry(0.85, 2.6, 4, 12); geo.translate(0, -1.3, 0); const b = new THREE.Mesh(geo, bannerMat); b.position.copy(p); b.rotation.y = a; b.castShadow = true; G.add(b); banners.push(b);
    K.add('plain:#2a2630', new THREE.BoxGeometry(1.0, 0.06, 0.06), p.clone().add(V(0, 0.03, 0)), new THREE.Euler(0, a, 0)); }
  // ---------------------------------------------------------------- chains sagging from the orrery to the parapet posts (alternating links)
  { const links = []; const L = new THREE.TorusGeometry(0.07, 0.016, 4, 8); const from = V(1.9, ORY - 0.3, ORZ);
    for (const to of [V(TA - 0.4, PH + 0.5, 1.6), V(-TA + 0.4, PH + 0.5, 1.3), V(3.9, PH + 0.5, -0.4)]) { const n = Math.ceil(from.distanceTo(to) / 0.11); const prev = V();
      for (let j = 0; j <= n; j++) { const u = j / n; const q = from.clone().lerp(to, u); q.y -= Math.sin(u * Math.PI) * 0.5; if (j) { const dir = q.clone().sub(prev).normalize(); const m4 = new THREE.Matrix4().lookAt(V(), dir, V(0, 1, 0)); const qq = new THREE.Quaternion().setFromRotationMatrix(m4).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, j % 2 ? Math.PI / 2 : 0))); links.push(L.clone().applyMatrix4(new THREE.Matrix4().compose(q, qq, V(1, 1, 1)))); } prev.copy(q); }
      const post = to.clone(); K.add('plain:#2a2630', cbox(0.12, 0.5, 0.12, 0.02), post.clone().setY(PH + 0.25)); }
    const cm = new THREE.Mesh(mergeGeometries(links), lmat('iron')); cm.castShadow = true; G.add(cm); }
  // braziers flanking the door (warm practicals against the dusk)
  const fires = []; for (const s of [-1, 1]) { const p = V(s * 1.65, 0, DZ - 0.3); const bz = prop('lantern', { h: 0.55 }); bz.position.copy(p).setY(0.0); G.add(bz); const l = new THREE.PointLight(0xff9a48, 2.2, 6, 1.7); l.position.copy(p).setY(0.5); G.add(l); fires.push(l); }
  K.build(G, { uvScale: { stone: 0.9, rubble: 0.8, marble: 0.6, tile: 1.4 } });
  G.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.receiveShadow = true; });
  const api = {
    group: G, prow: V(0, 0, PZ + 0.9), door: V(0, 1.1, DZ + 0.5), doorOut: V(0, 1.6, DZ - 3.5), height: BASE, terraceR: TA, crystals, banners,
    update(dt, t) { windU.uTime.value = t; for (const g of gears) g.w.rotation.z += g.speed * dt * 0.35; for (const s of spinners) s.o.rotation[s.ax] += s.s * dt; for (const [i, l] of fires.entries()) l.intensity = 2.0 + Math.sin(t * 7.3 + i * 2) * 0.25 + Math.sin(t * 13.1 + i) * 0.15;
      for (const [i, c] of crystals.entries()) c.rotation.y = Math.sin(t * 0.2 + i) * 0.05; crysMat.emissiveIntensity = (upgrades.has('tower:crystals_lit') ? 1.3 : 0.5) + Math.sin(t * 1.3) * 0.12; },
  };
  return api;
}
