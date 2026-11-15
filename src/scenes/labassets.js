// THE EXPERIMENT HALL'S FURNISHINGS (menu agent): real CC0 Poly Haven models (polyhaven.com) converted to high-
// resolution pixel art with the lowpix toolkit (pixel-hd: decimated low-poly, a hand-pixel atlas quantised to hue-
// shifted ramps, rim light on creases), stored in assets/models/lab/<id>.glb (+ one assets/models/lab/pack.b64.json for the hosted build).
// Lit here like the rest of the room: flat-shaded MeshStandard with the atlas sampled NEAREST up close (crisp texels)
// and mip-mapped far away; brass and glass get a metal / gloss response so the lamps and windows glint on them.
//   await preloadLab(['WoodenTable_01', ...]);  const t = labProp('WoodenTable_01', { w: 2.2 });  t.position.set(...)
//   labProp(id, { h | w | d | size: [x, y, z], lie, tint, metal, rough, emissive })  ->  THREE.Group standing on y = 0
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = new URL('../../assets/models/lab/', import.meta.url).href;
const loader = new GLTFLoader();
const CACHE = new Map(); // id -> { geo, map, size: Vector3 }
// per-asset surface: metal = brass / pewter response, rough = gloss, tint = a multiply on the atlas
const SURF = { // only true metal and glass get a (small, crisp) highlight; wood, paper, cloth, stone and ceramic glaze stay matte
  brass_candleholders: { metal: 0.6, rough: 0.5, tint: 0xe6c48a }, brass_goblets: { metal: 0.6, rough: 0.48, tint: 0xe2bc7c }, brass_vase_01: { metal: 0.6, rough: 0.48, tint: 0xe2bc7c },
  brass_pot_01: { metal: 0.55, rough: 0.52, tint: 0xd8b07a }, Lantern_01: { metal: 0.45, rough: 0.6 }, seadogs_compass: { metal: 0.5, rough: 0.5 },
  pocket_watch: { metal: 0.55, rough: 0.45 }, magnifying_glass_01: { metal: 0.4, rough: 0.45 }, vintage_microscope: { metal: 0.5, rough: 0.5 },
  ornate_mirror_01: { metal: 0.35, rough: 0.4 }, round_spectacles: { metal: 0.45, rough: 0.45 }, antique_ceramic_vase_01: { rough: 0.75 }, marble_bust_01: { rough: 0.85 },
};

/** fetch and prepare lab models (once); resolves when all have loaded (missing ones are skipped with a warning) */
export function preloadLab(ids) {
  return Promise.all(ids.map((id) => {
    if (CACHE.has(id)) return CACHE.get(id).p;
    const e = { p: null, geo: null, map: null, size: new THREE.Vector3() }; CACHE.set(id, e);
    e.p = loader.loadAsync(BASE + id + '.glb').then((g) => {
      let mesh = null; g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) return;
      g.scene.updateMatrixWorld(true); const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); geo.deleteAttribute('normal'); geo.computeVertexNormals(); geo.computeBoundingBox(); geo.boundingBox.getSize(e.size);
      const map = mesh.material.map; if (map) { map.colorSpace = THREE.SRGBColorSpace; map.magFilter = THREE.NearestFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true; map.anisotropy = 8; map.needsUpdate = true; }
      e.geo = geo; e.map = map;
    }).catch((err) => console.warn('lab model', id, err?.message || err));
    return e.p;
  }));
}
const MATS = new Map();
function matFor(id, { tint, metal, rough, emissive = 0, ei = 1, side, alpha = false } = {}) {
  const s = SURF[id] || {}; const t = tint ?? s.tint ?? 0xffffff, m = metal ?? s.metal ?? 0, r = rough ?? s.rough ?? 0.95; const key = [id, t, m, r, emissive, ei, side, alpha].join('|'); let mat = MATS.get(key); if (mat) return mat;
  const e = CACHE.get(id); mat = new THREE.MeshStandardMaterial({ map: e?.map || null, color: t, metalness: m, roughness: r, flatShading: true, envMapIntensity: m > 0.2 ? 1 : 0.35, alphaTest: alpha ? 0.5 : 0, // (alpha-tested meshes get no ink outline, so only foliage uses it)
     side: side ?? THREE.DoubleSide, emissive: new THREE.Color(emissive), emissiveIntensity: ei, emissiveMap: emissive ? e?.map || null : null });
  MATS.set(key, mat); return mat;
}
/** a placed instance of a lab model scaled to real size (h / w / d metres, uniform; or size: [x, y, z] stretched) */
export function labProp(id, o = {}) {
  const g = new THREE.Group(); g.name = id; const e = CACHE.get(id); if (!e?.geo) return g;
  const m = new THREE.Mesh(e.geo, matFor(id, o)); m.castShadow = o.shadow !== false; m.receiveShadow = true; g.add(m); const S = e.size;
  if (o.size) m.scale.set(o.size[0] / S.x, o.size[1] / S.y, o.size[2] / S.z);
  else { const k = o.h ? o.h / S.y : o.w ? o.w / S.x : o.d ? o.d / S.z : 1; m.scale.setScalar(k); }
  g.userData.size = S.clone().multiply(m.scale);
  if (o.lie) { m.rotation.x = -Math.PI / 2; m.position.y = g.userData.size.z / 2; } // laid flat on its back (a lens, a pair of spectacles)
  return g;
}
export function labDispose() { for (const m of MATS.values()) m.dispose(); MATS.clear(); }
