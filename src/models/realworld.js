// Realistic environments built from the CC0 asset library (Poly Haven): detailed trees with real branches and
// leaves, rocks, ruins, Greek statuary, PBR ground and HDRI golden-hour skies. Used by battles, events, the map
// diorama and the tabletop rooms.
import * as THREE from 'three';
import { loadModel, loadPBR, loadHDRI, hdriSunDirection, variantCount } from '../gfx/assets.js';
import { mulberry32 } from '../core/util.js';
import { makeNoise } from '../gfx/pixel.js';

const SKY = { meadow: 'golden_cape_hill', garden: 'sunset_dry_plain', gully: 'golden_dry_valley', labyrinth: 'sunset_dry_plain', marsh: 'golden_dry_valley', guardian: 'sunset_dry_plain' };
const GROUND = { meadow: 'ground_meadow', garden: 'ground_dry_grass', gully: 'ground_rocky_trail', labyrinth: 'ground_dry_dirt', marsh: 'mud_mossy', guardian: 'ground_dry_grass' };
const ARENA = { meadow: 'ground_dry_grass', garden: 'ground_rocky_trail', gully: 'ground_dry_dirt', labyrinth: 'ground_rocky_trail', marsh: 'mud_wet', guardian: 'ground_rocky_trail' };

const vcount = new Map();
async function variant(name, rnd) { if (!vcount.has(name)) vcount.set(name, await variantCount(name).catch(() => 0)); const n = vcount.get(name); return loadModel(n > 1 ? `${name}#${Math.floor(rnd() * n)}` : name); }
function shadowOff(o) { o.traverse((m) => { if (m.isMesh) m.castShadow = false; }); return o; }

function softMask(size = 256) { // radial alpha for the trodden arena patch
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const n = makeNoise(5); const id = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const u = x / size - 0.5, v = y / size - 0.5; const d = Math.sqrt(u * u * 1.0 + v * v * 4.2) * 2; const a = Math.max(0, Math.min(1, (1 - d) * 1.25 + (n.fbm(x * 0.05, y * 0.05, 4) - 0.5) * 0.7)) * 0.85; const i = (y * size + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = a * 255; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); return t;
}

// ---------------------------------------------------------------- battle / event stage
export async function realStage(theme = 'meadow', seed = 1, renderer, { arenaClear = true } = {}) {
  const g = new THREE.Group(); const rnd = mulberry32(seed * 7919 + 13); const trees = []; const jobs = [];
  const sky = SKY[theme] || SKY.meadow;
  const [hdr, groundMat, arenaMat] = await Promise.all([loadHDRI(sky, renderer), loadPBR(GROUND[theme] || 'ground_meadow', { repeat: 18 }), loadPBR(ARENA[theme] || 'ground_dry_grass', { repeat: 8 })]);
  // ground: gently undulating, rising towards the back so the horizon is softened
  const n = makeNoise(seed + 3); const geo = new THREE.PlaneGeometry(90, 70, 90, 70); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const far = Math.max(0, -z - 8) * 0.06; p.setY(i, (n.fbm(x * 0.08 + 9, z * 0.08, 4) - 0.5) * (Math.abs(z) > 3.5 || Math.abs(x) > 9 ? 0.9 : 0.12) + far * far * 1.3); }
  geo.computeVertexNormals(); geo.setAttribute('uv2', geo.attributes.uv);
  const ground = new THREE.Mesh(geo, groundMat); ground.receiveShadow = true; g.add(ground);
  if (arenaClear) { const am = arenaMat.clone(); am.alphaMap = softMask(); am.transparent = true; am.depthWrite = false; const ag = new THREE.PlaneGeometry(22, 9, 1, 1); ag.rotateX(-Math.PI / 2); const arena = new THREE.Mesh(ag, am); arena.position.set(0.3, 0.035, 0.8); arena.receiveShadow = true; arena.renderOrder = 1; g.add(arena); }
  const place = async (name, x, z, { s = 1, ry = rnd() * 6.28, far = false, tree = false, y = 0 } = {}) => {
    const o = await variant(name, rnd).catch(() => null); if (!o) return null;
    o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); if (far) shadowOff(o); g.add(o); if (tree) trees.push(o); return o;
  };
  // back rows of trees (detailed near, lighter "far" versions behind), cypress-like columns between
  for (let i = 0; i < 6; i++) jobs.push(place(rnd() < 0.5 ? 'olive_tree_tall' : 'olive_tree_wide', -15 + i * 6 + rnd() * 2, -7.5 - rnd() * 2.5, { s: 1 + rnd() * 0.3, tree: true }));
  for (let i = 0; i < 7; i++) { const nm = rnd() < 0.4 ? 'umbrella_tree_far' : rnd() < 0.5 ? 'olive_tree_tall_far' : 'olive_tree_wide_far'; jobs.push(place(nm, -24 + i * 8 + rnd() * 3, -15 - rnd() * 6, { s: (1.1 + rnd() * 0.5) * (nm.startsWith('umbrella') ? 0.3 : 1), far: true, tree: true })); }
  for (let i = 0; i < 5; i++) jobs.push(place('othonna_cerarioides', -13 + i * 6.5 + rnd() * 2, -10 - rnd() * 3, { s: 1.6 + rnd() * 0.6, tree: true }));
  // framing trees in the foreground corners
  jobs.push(place('olive_tree_tall', -11.5, 1.5, { s: 1.15, tree: true }), place('olive_tree_wide', 12.5, 0.5, { s: 1.25, tree: true }));
  // bushes and rocks around the edges
  for (let i = 0; i < 9; i++) jobs.push(place(rnd() < 0.5 ? 'searsia_lucida' : 'shrub_01', (rnd() - 0.5) * 30, -4 - rnd() * 4, { s: rnd() < 0.5 ? 1.1 : 3.2 }));
  for (let i = 0; i < 8; i++) jobs.push(place(rnd() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', (rnd() - 0.5) * 28, -3.5 - rnd() * 5, { s: 0.6 + rnd() * 0.6, y: -0.1 }));
  // grass clumps and wildflowers carpet everything except the arena
  for (let i = 0; i < 110; i++) { const x = (rnd() - 0.5) * 34, z = -9 + rnd() * 15; if (Math.abs(x - 0.3) < 8.5 && Math.abs(z - 0.8) < 2.6) continue; jobs.push(place(i % 6 === 0 ? (theme === 'marsh' ? 'nettle_plant' : rnd() < 0.5 ? 'celandine_01' : 'flower_gazania') : i % 9 === 0 ? 'fern_02' : 'grass_clumps', x, z, { s: 1.6 + rnd() * 1.4 })); }
  // distant cliffs
  jobs.push(place('cliff_mountainside', -34, -58, { s: 2.6, far: true, ry: 0.9 }), place('cliff_mountainside', 38, -62, { s: 2.8, far: true, ry: -2.2 }));
  // theme dressing
  if (theme === 'garden' || theme === 'guardian') {
    for (let i = 0; i < 5; i++) jobs.push(place('greek_column', -12 + i * 6 + rnd(), -5.5 - rnd() * 2, { s: 0.75 }));
    jobs.push(place('marble_bust_01', -6.5, -3.4, { s: 3.2, ry: 0.4 }), place('horse_statue_01', 7.5, -4.2, { s: 3, ry: -0.6 }), place('lion_head', 3, -5.5, { s: 2.2, ry: 0.2 }));
    for (let i = 0; i < 4; i++) jobs.push(place(rnd() < 0.5 ? 'antique_ceramic_vase_01' : 'ceramic_vase_04', -9 + i * 5.5, -3.2, { s: 2.2 }));
  }
  if (theme === 'meadow') { jobs.push(place('wine_barrel_01', 8.2, -3.3, { s: 1.4 }), place('wine_bottles_01', 9.4, -2.8, { s: 2.4 }), place('antique_ceramic_vase_01', -8, -3.2, { s: 2.6 }), place('brass_goblets', 7.2, -2.6, { s: 3 }), place('greek_column', -10.5, -5, { s: 0.75 })); }
  if (theme === 'gully') { for (let i = 0; i < 6; i++) jobs.push(place(['boulder_01', 'namaqualand_boulder_02', 'namaqualand_boulder_03', 'namaqualand_boulder_05'][i % 4], -14 + i * 5.6, -5.5 - rnd() * 3, { s: 1.4 + rnd() * 1.2 })); jobs.push(place('rock_face_02', 0, -12, { s: 2.5 })); }
  if (theme === 'labyrinth') { for (let i = 0; i < 7; i++) jobs.push(place('stone_wall_kit', -16 + i * 5.4, -6.5 - (i % 2) * 2.2, { s: 0.35, ry: (i % 2) * Math.PI / 2 })); jobs.push(place('bull_head', 0.5, -4.4, { s: 3.5, ry: 0 })); }
  if (theme === 'marsh') { jobs.push(place('dead_tree_trunk_02', -7, -4, { s: 1.4 }), place('tree_stump_01', 6.5, -3.6, { s: 1.6 }), place('dry_branches_medium_01', 2, -4.5, { s: 2 })); const water = new THREE.Mesh(new THREE.PlaneGeometry(46, 10, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1f3a34, roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.8 })); water.position.set(0, 0.08, -7.5); water.receiveShadow = true; g.add(water); }
  if (theme === 'guardian') { jobs.push(place('stone_fire_pit', -5.5, -3, { s: 2 }), place('stone_fire_pit', 6.5, -3, { s: 2 })); }
  await Promise.all(jobs);
  const sunDir = await hdriSunDirection(sky).catch(() => new THREE.Vector3(-0.5, 0.6, 0.4));
  return { group: g, theme, trees, env: hdr.envMap, background: hdr.background, sunDir };
}

// ---------------------------------------------------------------- map diorama dressing (miniature scale)
export async function dressMap(world, { count = 46, free, heightAt, rnd = mulberry32(3), W = 20, Z0 = 3, LEN = 36 } = {}) {
  const jobs = []; const trees = [];
  const put = async (name, x, z, s, tree) => { const o = await variant(name, rnd).catch(() => null); if (!o) return; o.position.set(x, heightAt(x, z), z); o.rotation.y = rnd() * 6.28; o.scale.multiplyScalar(s); o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); world.add(o); if (tree) { o.userData.perchable = true; trees.push(o); } };
  for (let i = 0; i < count; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 1.1)) continue; const r = rnd(); jobs.push(put(r < 0.35 ? 'olive_tree_wide_far' : r < 0.6 ? 'olive_tree_tall_far' : r < 0.8 ? 'othonna_cerarioides' : 'searsia_lucida', x, z, r < 0.6 ? 0.2 + rnd() * 0.06 : 0.35, r < 0.8)); }
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 0.8)) continue; jobs.push(put(rnd() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', x, z, 0.18 + rnd() * 0.12)); }
  for (let i = 0; i < 4; i++) { const x = (rnd() - 0.5) * (W - 4), z = -6 - i * 6; if (!free(x, z, 1.4)) continue; jobs.push(put('greek_column', x, z, 0.2), put('greek_column', x + 0.7, z + 0.3, 0.2)); }
  await Promise.all(jobs); return trees;
}

// ---------------------------------------------------------------- tabletop room props
export async function dressTabletop(scene, renderer, { kind = 'study' } = {}) {
  const hdr = await loadHDRI('interior_fireplace', renderer).catch(() => null); if (hdr) { scene.environment = hdr.envMap; scene.environmentIntensity = 0.55; }
  const rnd = mulberry32(kind.length * 31 + 7); const jobs = [];
  const put = async (name, x, y, z, s = 1, ry = 0) => { const o = await loadModel(name).catch(() => null); if (!o) return null; o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o; };
  const wood = await loadPBR('wood_dark', { repeat: 6 }).catch(() => null);
  if (wood) { const top = new THREE.Mesh(new THREE.PlaneGeometry(34, 18).rotateX(-Math.PI / 2), wood); top.receiveShadow = true; top.position.y = 0.001; scene.add(top); }
  for (let i = 0; i < 9; i++) jobs.push(loadModel(`book_encyclopedia_set_01#${i}`).then((b) => { b.scale.setScalar(8); b.position.set(-12.6 + i * 0.36, 0, -5.6); b.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.05; scene.add(b); }).catch(() => {}));
  jobs.push(put('brass_candleholders', 9.5, 0, -5.2, 7, 0.4), put('lantern_01', -9.5, 0, -6.4, 6, 0.6), put('food_apple_01', -6, 0, -3, 14, 0.3), put('food_pomegranate_01', -4.8, 0, -3.6, 12, 1.2), put('food_apple_01', -5.4, 0, -4.4, 13, 2.2), put('vintage_oil_lamp', 12, 0, -2, 6, -0.4));
  if (kind === 'shop') jobs.push(put('wine_barrel_01', -9.5, 0, -2.6, 2.2, 0.3), put('treasure_chest', 9, 0, -1.6, 3.4, -0.5), put('wooden_crate_01', 11.5, 0, -4.5, 3, 0.2));
  if (kind === 'lab') jobs.push(put('stone_fire_pit', 0, 0, -4.2, 3.2), put('wicker_basket_01', -7, 0, -3, 4), put('brass_vase_01', 6.5, 0, -3.8, 6));
  await Promise.all(jobs);
}
