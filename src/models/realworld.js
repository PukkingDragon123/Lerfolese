// Detailed environments from the CC0 asset library (Poly Haven): olive trees with real branches and leaves, shrubs,
// rocks, ruins and Greek statuary, rendered ANIME/CARTOON: toon materials (albedo kept, painterly saturation, hard
// light bands; the engine inks the outlines), wind-blown instanced grass, fluttering leaves, a painted anime sky
// with cel cumulus and a painted mountain backdrop. Used by battles, events, the map props and the tabletop rooms.
import * as THREE from 'three';
import { loadModel, loadPBR, variantCount } from '../gfx/assets.js';
import { mulberry32 } from '../core/util.js';
import { makeNoise } from '../gfx/pixel.js';
import * as T from './toon.js';
import { storybookBackdrop } from './storybook.js';

const V3 = THREE.Vector3;
const GROUND = { meadow: 'ground_meadow', garden: 'ground_dry_grass', gully: 'ground_rocky_trail', labyrinth: 'ground_dry_dirt', marsh: 'mud_mossy', guardian: 'ground_dry_grass' };
const ARENA = { meadow: 'ground_dry_grass', garden: 'ground_rocky_trail', gully: 'ground_dry_dirt', labyrinth: 'ground_rocky_trail', marsh: 'mud_wet', guardian: 'ground_rocky_trail' };
export const SUN_SKY = new V3(Math.sin(0.16), 0.085, -Math.cos(0.16)).normalize(); // where the painted sky glows (the pixel sun billboard sits here)
const SUN_KEY = new V3(-0.55, 0.62, 0.42).normalize();
const CAM = new V3(-0.1, 3, 11.4);

const vcount = new Map();
async function variant(name, rnd) { if (!vcount.has(name)) vcount.set(name, await variantCount(name).catch(() => 0)); const n = vcount.get(name); return loadModel(n > 1 ? `${name}#${Math.floor(rnd() * n)}` : name); }
const LOOK = { // per-family toon tuning: saturation, albedo tint, leaf tint, wind
  tree: { sat: 1.35, leafTint: '#e8f0c0', wind: 1, windH: 0.18 }, shrub: { sat: 1.4, leafTint: '#f0f4c8', wind: 0.8, windH: 0.6 }, grass: { sat: 1.45, leafTint: '#f4f0b0', wind: 1.3, windH: 1.2 },
  rock: { sat: 1.15, tint: '#f2e6ff', wind: 0 }, stone: { sat: 1.1, tint: '#fff4ea', wind: 0 }, prop: { sat: 1.25, wind: 0 },
};
function lookFor(name) {
  if (/olive|umbrella|othonna/.test(name)) return LOOK.tree; if (/searsia|shrub|fern|nettle|weed|sorrel/.test(name)) return LOOK.shrub;
  if (/grass|celandine|gazania|dandelion/.test(name)) return LOOK.grass; if (/rock|boulder|cliff/.test(name)) return LOOK.rock;
  if (/column|wall|marble|statue|bust|lion|bull|horse|fire_pit/.test(name)) return LOOK.stone; return LOOK.prop;
}
export async function toonModel(name, rnd = Math.random, look = null) { const o = await variant(name, rnd); return T.toonify(o, look || lookFor(name)); }

function softMask(size = 256) { // radial alpha for the trodden arena patch
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const n = makeNoise(5); const id = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const u = x / size - 0.5, v = y / size - 0.5; const d = Math.sqrt(u * u * 1.0 + v * v * 4.2) * 2; const a = Math.max(0, Math.min(1, (1 - d) * 1.6 + (n.fbm(x * 0.05, y * 0.05, 4) - 0.5) * 0.6)) > 0.5 ? 1 : 0; const i = (y * size + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = a * 255; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return new THREE.CanvasTexture(c);
}
function toonPBR(mat, opts) { const m = T.toonMaterial(mat, opts); return m; }

// anime water: banded teal with drifting light streaks and a sun-path glitter
function animeWater(w, d, { deep = '#1d5a6a', shallow = '#3f97a0', glint = '#fff0c8' } = {}) {
  const m = new THREE.ShaderMaterial({
    fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) }, uGlint: { value: new THREE.Color(glint) }, uSunX: { value: 2.5 } }]),
    vertexShader: 'varying vec3 vW; #include <fog_pars_vertex>\n void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; #include <fog_vertex>\n }'.replace(/#include <([a-z_]+)>/g, '\n#include <$1>\n'),
    fragmentShader: `uniform vec3 uDeep, uShallow, uGlint; uniform float uSunX, uTime; varying vec3 vW;
      #include <fog_pars_fragment>
      void main(){ float t = uTime;
        float band = sin(vW.x * 0.6 + sin(vW.z * 0.9 + t * 0.4) * 1.5) * 0.5 + 0.5; vec3 c = mix(uDeep, uShallow, step(0.62, band) * 0.6 + step(0.85, band) * 0.25);
        float streak = step(0.965, sin(vW.x * 2.1 + vW.z * 0.35 + t * 0.9) * sin(vW.z * 3.7 - t * 0.6));
        float path = smoothstep(2.6, 0.0, abs(vW.x - uSunX - (vW.z + 8.0) * -0.25)); float sp = step(0.9, fract(sin(floor(vW.x * 4.0) * 91.7 + floor(vW.z * 6.0) * 37.3 + floor(t * 3.0)) * 4375.85));
        c = mix(c, uGlint, max(streak * 0.7, path * sp * 0.9));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  m.uniforms.uTime = T.WIND.time;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1).rotateX(-Math.PI / 2), m); mesh.onBeforeRender = T.tickWind; mesh.userData.noAO = true; return mesh;
}

// ---------------------------------------------------------------- battle / event stage
export async function realStage(theme = 'meadow', seed = 1, renderer, { arenaClear = true } = {}) {
  const g = new THREE.Group(); g.name = 'stage:' + theme; const rnd = mulberry32(seed * 7919 + 13); const trees = []; const jobs = [];
  T.WIND.ptrK.value = 0; T.WIND.amp.value = 1;
  const sk = T.SKY[theme] ? theme : 'meadow';
  const [groundSrc, arenaSrc] = await Promise.all([loadPBR(GROUND[theme] || 'ground_meadow', { repeat: 18 }), loadPBR(ARENA[theme] || 'ground_dry_grass', { repeat: 8 })]);
  // sky: painted gradient, cel cumulus, layered mountains (no photo background)
  g.add(storybookBackdrop(theme, { seed, cam: CAM })); // medieval storybook: gilded Sol / moon with a face, vellum sky, scenery flats
  // ground: gently undulating, rising towards the back so the horizon is softened
  const n = makeNoise(seed + 3); const basin = theme === 'marsh' ? (x, z) => Math.min(1, Math.max(0, Math.min(z + 12.3, -2.9 - z) / 1.2)) * Math.min(1, Math.max(0, 22 - Math.abs(x)) / 2) : () => 0;
  const hAt = (x, z) => { const far = Math.max(0, -z - 8) * 0.06; const y = (n.fbm(x * 0.08 + 9, z * 0.08, 4) - 0.5) * (Math.abs(z) > 3.5 || Math.abs(x) > 9 ? 0.9 : 0.12) + far * far * 1.3; const b = basin(x, z); return y * (1 - b) - 0.35 * b; };
  const geo = new THREE.PlaneGeometry(90, 70, 90, 70); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, hAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals(); geo.setAttribute('uv2', geo.attributes.uv);
  const GT = { meadow: '#5f8c34', garden: '#5e8e3a', gully: '#a07a48', labyrinth: '#8e7a4c', marsh: '#4a6e48', guardian: '#7e7a40' };
  const gm = toonPBR(groundSrc, { sat: 1.2, paint: GT[theme] || GT.meadow, paintK: 0.82, bands: [0.55, 0.78, 1.0] }); gm.fog = false; const ground = new THREE.Mesh(geo, gm); ground.receiveShadow = true; ground.userData.noInk = true; g.add(ground);
  if (arenaClear) { const am = toonPBR(arenaSrc, { sat: 1.2, paint: theme === 'marsh' ? '#6a5a40' : '#a8825a', paintK: 0.78, bands: [0.55, 0.78, 1.0] }); am.fog = false; am.alphaMap = softMask(); am.alphaTest = 0.5; am.transparent = false; const ag = new THREE.PlaneGeometry(22, 9, 44, 18); ag.rotateX(-Math.PI / 2); const ap = ag.attributes.position; for (let i = 0; i < ap.count; i++) ap.setY(i, hAt(ap.getX(i) + 0.3, ap.getZ(i) + 0.8) + 0.03); ag.computeVertexNormals(); const arena = new THREE.Mesh(ag, am); arena.position.set(0.3, 0, 0.8); arena.receiveShadow = true; arena.userData.noInk = true; g.add(arena); }
  const place = async (name, x, z, { s = 1, ry = rnd() * 6.28, far = false, tree = false, y = 0 } = {}) => {
    const o = await toonModel(name, rnd).catch(() => null); if (!o) return null;
    o.position.set(x, y + hAt(x, z) - 0.04, z); o.rotation.y = ry; o.scale.multiplyScalar(s); if (far) o.traverse((m) => { if (m.isMesh) m.castShadow = false; }); g.add(o); if (tree) trees.push(o); return o;
  };
  // back rows of trees (detailed near, lighter "far" versions behind), columnar succulents between
  for (let i = 0; i < 6; i++) jobs.push(place(rnd() < 0.5 ? 'olive_tree_tall' : 'olive_tree_wide', -15 + i * 6 + rnd() * 2, -7.5 - rnd() * 2.5, { s: 1 + rnd() * 0.3, tree: true }));
  for (let i = 0; i < 7; i++) { const nm = rnd() < 0.4 ? 'umbrella_tree_far' : rnd() < 0.5 ? 'olive_tree_tall_far' : 'olive_tree_wide_far'; jobs.push(place(nm, -24 + i * 8 + rnd() * 3, -15 - rnd() * 6, { s: (1.1 + rnd() * 0.5) * (nm.startsWith('umbrella') ? 0.3 : 1), far: true, tree: true })); }
  for (let i = 0; i < 5; i++) jobs.push(place('othonna_cerarioides', -13 + i * 6.5 + rnd() * 2, -10 - rnd() * 3, { s: 1.6 + rnd() * 0.6, tree: true }));
  jobs.push(place('olive_tree_tall', -11.5, 1.5, { s: 1.15, tree: true }), place('olive_tree_wide', 12.5, 0.5, { s: 1.25, tree: true }));
  // bushes, rocks, flowers around the edges (the instanced blades below carpet the ground)
  for (let i = 0; i < 9; i++) jobs.push(place(rnd() < 0.5 ? 'searsia_lucida' : 'shrub_01', (rnd() - 0.5) * 30, -4 - rnd() * 4, { s: rnd() < 0.5 ? 1.1 : 3.2 }));
  for (let i = 0; i < 8; i++) jobs.push(place(rnd() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', (rnd() - 0.5) * 28, -3.5 - rnd() * 5, { s: 0.6 + rnd() * 0.6, y: -0.1 }));
  for (let i = 0; i < 60; i++) { const x = (rnd() - 0.5) * 34, z = -9 + rnd() * 15; if (Math.abs(x - 0.3) < 8.5 && Math.abs(z - 0.8) < 2.6) continue; jobs.push(place(i % 4 === 0 ? (theme === 'marsh' ? 'nettle_plant' : rnd() < 0.5 ? 'celandine_01' : 'flower_gazania') : i % 7 === 0 ? 'fern_02' : 'grass_clumps', x, z, { s: 1.6 + rnd() * 1.4 })); }
  // theme dressing
  if (theme === 'garden' || theme === 'guardian') {
    for (let i = 0; i < 5; i++) jobs.push(place('greek_column', -12 + i * 6 + rnd(), -5.5 - rnd() * 2, { s: 0.75, tree: i % 2 === 0 }));
    jobs.push(place('marble_bust_01', -6.5, -3.4, { s: 3.2, ry: 0.4 }), place('horse_statue_01', 7.5, -4.2, { s: 3, ry: -0.6 }), place('lion_head', 3, -5.5, { s: 2.2, ry: 0.2 }));
    for (let i = 0; i < 4; i++) jobs.push(place(rnd() < 0.5 ? 'antique_ceramic_vase_01' : 'ceramic_vase_04', -9 + i * 5.5, -3.2, { s: 2.2 }));
  }
  if (theme === 'meadow') { jobs.push(place('wine_barrel_01', 8.2, -3.3, { s: 1.4 }), place('wine_bottles_01', 9.4, -2.8, { s: 2.4 }), place('antique_ceramic_vase_01', -8, -3.2, { s: 2.6 }), place('brass_goblets', 7.2, -2.6, { s: 3 }), place('greek_column', -10.5, -5, { s: 0.75, tree: true })); }
  if (theme === 'gully') { for (let i = 0; i < 6; i++) jobs.push(place(['boulder_01', 'namaqualand_boulder_02', 'namaqualand_boulder_03', 'namaqualand_boulder_05'][i % 4], -14 + i * 5.6, -5.5 - rnd() * 3, { s: 1.4 + rnd() * 1.2 })); jobs.push(place('rock_face_02', 0, -12, { s: 2.5 })); }
  if (theme === 'labyrinth') { for (let i = 0; i < 7; i++) jobs.push(place('stone_wall_kit', -16 + i * 5.4, -6.5 - (i % 2) * 2.2, { s: 0.35, ry: (i % 2) * Math.PI / 2 })); jobs.push(place('bull_head', 0.5, -4.4, { s: 3.5, ry: 0 })); }
  if (theme === 'marsh') { jobs.push(place('dead_tree_trunk_02', -7, -4, { s: 1.4 }), place('tree_stump_01', 6.5, -3.6, { s: 1.6 }), place('dry_branches_medium_01', 2, -4.5, { s: 2 })); const water = animeWater(46, 10); water.position.set(0, 0.08, -7.5); g.add(water); }
  if (theme === 'guardian') { for (const [x, z] of [[-9.6, -5.2], [10.4, -5.6]]) { const f = firePit({ seed: Math.round(x) }); f.position.set(x, hAt(x, z), z); f.scale.setScalar(1.8); g.add(f); } }
  // wind-blown grass blades everywhere except the arena (and the marsh water)
  const spots = []; const gr = mulberry32(seed * 3 + 1);
  for (let i = 0; i < 16000; i++) {
    const z = -20 + Math.pow(gr(), 0.6) * 25, x = (gr() - 0.5) * (12 + (5 - z) * 1.1); if (z > 2.2 && gr() < 0.6) continue;
    const ax = (x - 0.3) / 9.2, az = (z - 0.8) / 3.0; if (arenaClear && ax * ax + az * az < 1 + (gr() - 0.5) * 0.3) continue; if (theme === 'marsh' && z < -2.6 && z > -12.5) continue;
    spots.push([x, hAt(x, z) - 0.02, z, 0.13 + gr() * 0.2 + Math.max(0, -z - 4) * 0.018, gr()]);
  }
  g.add(T.grassBlades(spots, { dry: theme === 'gully' || theme === 'labyrinth' ? 0.6 : theme === 'marsh' ? 0.04 : 0.14 }));
  await Promise.all(jobs);
  const s = T.SKY[sk]; const env = T.gradientEnv(renderer, 'toon:' + sk, { top: s.hi, hor: s.hor, gnd: s.gnd });
  return { group: g, theme, trees, env, background: null, sunDir: SUN_KEY.clone() };
}

// ---------------------------------------------------------------- fire pit: the detailed stone ring, toon-shaded, with a cel flame
export function firePit({ seed = 3 } = {}) {
  const g = new THREE.Group(); g.name = 'firePit';
  loadModel('stone_fire_pit').then((o) => { T.toonify(o, { sat: 1.2, tint: '#fff0e4', wind: 0 }); g.add(o); }).catch(() => {});
  const f = T.animeFlame(0.62, 0.95); f.position.y = 0.08; f.rotation.y = seed; g.add(f); return g;
}

// ---------------------------------------------------------------- map dressing: detailed trees and rocks at miniature scale
export async function dressMap(world, { count = 46, free, heightAt, rnd = mulberry32(3), W = 20, Z0 = 3, LEN = 36, scale = 1 } = {}) {
  const jobs = []; const trees = [];
  const put = async (name, x, z, s, tree) => { const o = await toonModel(name, rnd).catch(() => null); if (!o) return; o.position.set(x, heightAt(x, z), z); o.rotation.y = rnd() * 6.28; o.scale.multiplyScalar(s * scale); world.add(o); if (tree) { o.userData.perchable = true; trees.push(o); } };
  for (let i = 0; i < count; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 1.1)) continue; const r = rnd(); jobs.push(put(r < 0.35 ? 'olive_tree_wide_far' : r < 0.6 ? 'olive_tree_tall_far' : r < 0.8 ? 'othonna_cerarioides' : 'searsia_lucida', x, z, r < 0.6 ? 0.2 + rnd() * 0.06 : 0.35, r < 0.8)); }
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 0.8)) continue; jobs.push(put(rnd() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', x, z, 0.18 + rnd() * 0.12)); }
  await Promise.all(jobs); return trees;
}

// ---------------------------------------------------------------- tabletop room props (candlelit, toon-shaded)
export async function dressTabletop(scene, renderer, { kind = 'study' } = {}) {
  const env = T.gradientEnv(renderer, 'toon:room', { top: '#3a2a3a', hor: '#c8884a', gnd: '#2a1a1a' }); if (env) { scene.environment = env; scene.environmentIntensity = 0.45; }
  const rnd = mulberry32(kind.length * 31 + 7); const jobs = [];
  const put = async (name, x, y, z, s = 1, ry = 0) => { const o = await toonModel(name, rnd).catch(() => null); if (!o) return null; o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o; };
  const wood = await loadPBR('wood_dark', { repeat: 6 }).catch(() => null);
  if (wood) { const top = new THREE.Mesh(new THREE.PlaneGeometry(34, 18).rotateX(-Math.PI / 2), T.toonMaterial(wood, { sat: 1.0, paint: '#7a4a2c', paintK: 0.72, bands: [0.45, 0.72, 1.0] })); top.receiveShadow = true; top.position.y = 0.001; top.userData.noInk = true; scene.add(top); }
  for (let i = 0; i < 9; i++) jobs.push(loadModel(`book_encyclopedia_set_01#${i}`).then((b) => { T.toonify(b, { sat: 1.35, wind: 0 }); b.scale.setScalar(8); b.position.set(-12.6 + i * 0.36, 0, -5.6); b.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.05; scene.add(b); }).catch(() => {}));
  jobs.push(put('brass_candleholders', 9.5, 0, -5.2, 7, 0.4), put('lantern_01', -9.5, 0, -6.4, 6, 0.6), put('food_apple_01', -6, 0, -3, 14, 0.3), put('food_pomegranate_01', -4.8, 0, -3.6, 12, 1.2), put('food_apple_01', -5.4, 0, -4.4, 13, 2.2), put('vintage_oil_lamp', 12, 0, -2, 6, -0.4));
  if (kind === 'shop') jobs.push(put('wine_barrel_01', -9.5, 0, -2.6, 2.2, 0.3), put('treasure_chest', 9, 0, -1.6, 3.4, -0.5), put('wooden_crate_01', 11.5, 0, -4.5, 3, 0.2));
  if (kind === 'lab') { const f = firePit({ seed: 5 }); f.position.set(0, 0, -4.2); f.scale.setScalar(3.2); scene.add(f); jobs.push(put('wicker_basket_01', -7, 0, -3, 4), put('brass_vase_01', 6.5, 0, -3.8, 6)); }
  // candle flames + warm practicals
  for (const [x, y, z, i] of [[9.5, 3.0, -5.0, 10], [12.1, 1.6, -1.9, 6]]) { const l = new THREE.PointLight(0xffa04a, i, 9, 1.8); l.position.set(x, y, z); scene.add(l); }
  await Promise.all(jobs);
}
