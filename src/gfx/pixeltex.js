// THREE textures for the HD-2D pixel-art surfaces (src/gfx/art/tiles.js, leaves.js): crisp NearestFilter up close,
// mipmapped far away so distant ground and crowns don't shimmer; sRGB; cached per key.
import * as THREE from 'three';
import * as TL from './art/tiles.js';
import { leafCard } from './art/leaves.js';

const CACHE = new Map();
export function pixelTex(key, make, { repeat = true, mip = true, flipY = true } = {}) {
  if (CACHE.has(key)) return CACHE.get(key);
  const pc = make(); const t = new THREE.CanvasTexture(pc.commit ? pc.commit() : pc);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = mip ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter; t.generateMipmaps = mip; t.anisotropy = 8; t.flipY = flipY;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; CACHE.set(key, t); return t;
}
export const groundTex = (kind = 'meadow') => pixelTex('grass:' + kind, () => TL.grassTile(kind));
export const soilTex = () => pixelTex('soil', () => TL.soilTile());
export const gravelTex = () => pixelTex('gravel', () => TL.gravelTile());
export const earthTex = (grassy = 0.4) => pixelTex('earth:' + grassy, () => TL.earthTile(9, grassy));
export const cobbleTex = () => pixelTex('cobble', () => TL.cobbleTile());
export const barkTex = (kind = 'oak') => pixelTex('bark:' + kind, () => TL.barkTile(kind));
export const waterTex = () => pixelTex('water', () => TL.waterTile());
export const leafTex = (kind = 'oak') => pixelTex('leaf:' + kind, () => leafCard(kind), { repeat: false, mip: true });
// village surfaces by material key (plaster, stone, rubble, marble, woodRaw, woodDark, woodBlue, woodGreen, thatch, canvas, tile)
const SURF = { ...TL.WALL, ...TL.WOOD, thatch: () => TL.thatchTile(), canvas: () => TL.canvasTile(), tile: () => TL.roofTile() };
export const surfaceTex = (key) => (SURF[key] ? pixelTex('surf:' + key, () => SURF[key]()) : null);
export const puffTex = () => pixelTex('puff', () => TL.smokePuff(), { repeat: false });
export const clothTex = (hex, kind = 0) => pixelTex('cloth:' + hex + kind, () => TL.clothTile(hex, kind));
export const runeRingTex = () => pixelTex('runeRing', () => TL.runeRing(), { repeat: false, mip: false });
export const dragonflyTex = () => pixelTex('dragonfly', () => TL.dragonfly(), { repeat: false, mip: false });
