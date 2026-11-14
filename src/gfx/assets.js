// Realistic asset library loader (Poly Haven CC0 models, PBR texture sets, HDRI skies).
// Files live under <site root>/assets/{models,textures,hdri}; the catalogue (tris, sizes, tags, scale hints,
// variants, animatable parts) is assets/models/manifest.json, credits in assets/models/CREDITS.md.
//
//   const tree = await loadModel('olive_tree_tall');          // whole model (a clone; materials/geometry shared)
//   const rock = await loadModel('rock_moss_set_01#2');       // one variant of a set (by index or node name), at the origin
//   await preload(['olive_tree_wide', 'boulder_01']);
//   const ground = await loadPBR('ground_dry_grass', { repeat: 8 });
//   const { envMap, background } = await loadHDRI('golden_cape_hill', renderer);
//   scene.environment = envMap; scene.background = background;
//   sun.position.copy(await hdriSunDirection('golden_cape_hill')).multiplyScalar(50);   // match the sky's sun
//
// Models are in metres (+Y up, base at y≈0); manifest scale_hint suggests a uniform scale for the game.
// GLB geometry is meshopt-compressed, so always load through this module (it registers the vendored MeshoptDecoder).
// Clones share geometry/materials with the cache: clone a material before tinting one instance.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { lowSwap, lowSwapped } from '../models/lowprops.js'; // small CC0 props are swapped for the sharp low-poly kit

// <site root>/assets/, resolved from this module's URL so pages in sub-folders (tools/) work too.
let BASE = new URL('../../assets/', import.meta.url).href;
export function setAssetBase(url) { BASE = new URL(url, location.href).href; }
export const assetURL = (rel) => new URL(rel, BASE).href;

const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();

// leaf cards are alpha-tested; a cutoff a little under 0.5 keeps foliage full at a distance (mip-mapped alpha shrinks)
export const FOLIAGE_ALPHA_TEST = 0.42;
let anisotropy = 8;
/** max anisotropic filtering applied to model + PBR textures loaded afterwards (pass renderer.capabilities.getMaxAnisotropy()). */
export function setAnisotropy(n) { anisotropy = Math.max(1, n | 0); }

const gltfCache = new Map();
let manifestP = null;
/** assets/models/manifest.json (cached) */
export function getManifest() {
  return (manifestP ||= fetch(assetURL('models/manifest.json')).then((r) => (r.ok ? r.json() : { models: {} })).catch(() => ({ models: {} })));
}

function prepare(gltf) {
  const seen = new Set();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const ex = mats[0]?.userData || {};
    o.castShadow = !(ex.glass || ex.flame);
    o.receiveShadow = !ex.flame;
    for (const m of mats) {
      if (seen.has(m)) continue; seen.add(m);
      const u = m.userData || {};
      // colour textures are sRGB, data textures linear (GLTFLoader already does this; enforce for safety)
      for (const k of ['map', 'emissiveMap']) if (m[k]) m[k].colorSpace = THREE.SRGBColorSpace;
      for (const k of ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (m[k]) m[k].colorSpace = THREE.NoColorSpace;
      for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'aoMap']) if (m[k]) m[k].anisotropy = anisotropy;
      if (m.alphaTest > 0 || u.foliage) {
        // alpha-cutout cards (leaves, grass, labels): no blending, both faces, cutout shadows
        m.transparent = false; m.alphaTest = u.foliage ? FOLIAGE_ALPHA_TEST : m.alphaTest || 0.5; m.side = THREE.DoubleSide;
        m.shadowSide = THREE.DoubleSide; m.depthWrite = true;
      }
      if (u.glass) { m.transparent = true; m.depthWrite = false; m.side = THREE.FrontSide; m.envMapIntensity = 1.4; }
      if (u.flame) { m.transparent = true; m.depthWrite = false; m.blending = THREE.AdditiveBlending; m.toneMapped = false; m.emissiveIntensity = 2.5; }
      m.needsUpdate = true;
    }
  });
  return gltf;
}

/** parsed glTF for a model file (cached; the returned scene must not be mutated – use loadModel for clones) */
export function loadGLTF(name) {
  const base = name.split('#')[0];
  if (!gltfCache.has(base)) {
    const p = gltfLoader.loadAsync(assetURL(`models/${base}.glb`)).then(prepare);
    p.catch(() => gltfCache.delete(base));
    gltfCache.set(base, p);
  }
  return gltfCache.get(base);
}

/**
 * Promise<THREE.Object3D>: a clone of the model (geometry + materials shared with the cache).
 * `name#k` (index) or `name#nodeName` picks one variant of a set (rocks, shrubs, grass clumps, …) and
 * resets its position so it sits at the origin.
 */
export async function loadModel(name) {
  const low = lowSwap(name); if (low) return low;
  const [base, variant] = name.split('#');
  const gltf = await loadGLTF(base);
  let src = gltf.scene;
  if (variant !== undefined && variant !== '') {
    const kids = gltf.scene.children;
    src = /^\d+$/.test(variant) ? kids[+variant % kids.length] : kids.find((c) => c.name === variant);
    if (!src) throw new Error(`loadModel: ${base} has no variant "${variant}"`);
  }
  const obj = cloneSkinned(src);
  if (src !== gltf.scene) obj.position.set(0, 0, 0);
  obj.name = name;
  obj.userData.asset = base;
  if (gltf.animations?.length) obj.userData.animations = gltf.animations;
  return obj;
}

/** number of variants (top-level children) a model has */
export async function variantCount(name) { if (lowSwapped(name)) return 1; return (await loadGLTF(name)).scene.children.length; }

/** fetch + parse models ahead of time */
export function preload(names) { return Promise.all(names.map((n) => loadGLTF(n))); }

// ---------------------------------------------------------------- PBR texture sets
const texCache = new Map();
function loadTex(url, srgb) {
  if (!texCache.has(url)) {
    const p = texLoader.loadAsync(url).then((t) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anisotropy; return t; });
    p.catch(() => texCache.delete(url));
    texCache.set(url, p);
  }
  return texCache.get(url);
}

/**
 * Promise<MeshStandardMaterial> for assets/textures/<set>/{diff,nor,arm|rough}.jpg.
 * opts.repeat: number | [x, y]; opts.normalScale; any other MeshStandardMaterial params are passed through.
 */
export async function loadPBR(setName, { repeat = 1, normalScale = 1, offset, rotation = 0, ...params } = {}) {
  const man = await getManifest();
  const maps = man.textures?.[setName]?.maps || ['diff', 'nor', 'arm'];
  const dir = `textures/${setName}/`;
  const get = (k, srgb) => (maps.includes(k) ? loadTex(assetURL(`${dir}${k}.jpg`), srgb) : null);
  const [diff, nor, arm, rough] = await Promise.all([get('diff', true), get('nor', false), get('arm', false), get('rough', false)]);
  const r = Array.isArray(repeat) ? repeat : [repeat, repeat];
  const inst = (t) => { if (!t) return null; const c = t.clone(); c.repeat.set(r[0], r[1]); if (offset) c.offset.set(offset[0], offset[1]); c.rotation = rotation; c.needsUpdate = true; return c; };
  const ns = Array.isArray(normalScale) ? normalScale : [normalScale, normalScale];
  const armT = inst(arm);
  const mat = new THREE.MeshStandardMaterial({
    map: inst(diff), normalMap: inst(nor), normalScale: new THREE.Vector2(ns[0], ns[1]),
    roughnessMap: armT || inst(rough), aoMap: armT, roughness: 1, metalness: 0, ...params,
  });
  mat.name = setName;
  return mat;
}

// ---------------------------------------------------------------- HDRI skies
const hdrCache = new WeakMap(); // renderer -> Map(name -> Promise)
/**
 * Promise<{ envMap, background }> for assets/hdri/<name>.hdr: envMap is a PMREM cube-UV texture for
 * scene.environment, background the equirectangular HDR texture for scene.background (cached per renderer).
 */
export function loadHDRI(name, renderer) {
  if (!hdrCache.has(renderer)) hdrCache.set(renderer, new Map());
  const cache = hdrCache.get(renderer);
  if (!cache.has(name)) {
    const p = rgbeLoader.loadAsync(assetURL(`hdri/${name}.hdr`)).then((tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer);
      const envMap = pm.fromEquirectangular(tex).texture; pm.dispose();
      return { envMap, background: tex };
    });
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return cache.get(name);
}

/**
 * Promise<THREE.Vector3>: unit vector pointing towards the HDRI's sun (outdoor) or brightest light (interior), from
 * manifest.hdris[name].sun, for a sky rotated by rotationY radians (scene.backgroundRotation.y = scene.environmentRotation.y).
 * Put a DirectionalLight at target + dir * distance so shadows agree with the visible sky.
 */
export async function hdriSunDirection(name, rotationY = 0) {
  const s = (await getManifest()).hdris?.[name]?.sun;
  const d = s ? new THREE.Vector3(...s.dir) : new THREE.Vector3(0.6, 0.35, 0.6);
  return d.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY).normalize();
}
