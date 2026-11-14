// Realistic low-poly pixel-art look shared by the beasts, the event NPCs and the Limbo monsters: a drop-in `K` that is
// charkit with the cartoon parts swapped out. Flat-shaded, physically lit materials (MeshStandardMaterial with
// roughness/metalness from the painted ORM page) carry low-resolution, nearest-filtered, hand-made pixel textures
// painted with natural colour ramps (seven steps, cool desaturated shadows, warm lights, a light dither so texels
// break into clusters) instead of cel bands; lofted parts get fewer rings and sides; sculpt budgets live in LOW.
import * as THREE from 'three';
import * as CK from '../charkit.js';

/** global low-poly budget: triangle targets, sculpt cell size, atlas size, loft rings/sides, UV-painted page size */
export const LOW = { tri: 0.3, cell: 1.45, atlas: 0.36, loftR: 0.5, loftS: 0.6, uv: 0.5 };
export const lowAtlas = (a) => Math.max(96, Math.round((a * LOW.atlas) / 16) * 16);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const SH = [16, 18, 26], LT = [255, 238, 212];
/** natural ramp of base colour c: L 0.5 = albedo, down to a cool desaturated dark, up toward warm sunlight */
export function tone(c, L, out = [0, 0, 0]) {
  if (L < 0.5) { const t = (0.5 - L) * 2 * 0.66; const g = (c[0] + c[1] + c[2]) / 3; for (let k = 0; k < 3; k++) out[k] = (c[k] * 0.85 + g * 0.15) * (1 - t) + SH[k] * t; }
  else { const t = (L - 0.5) * 2 * 0.36; for (let k = 0; k < 3; k++) out[k] = c[k] + (LT[k] - c[k]) * t; }
  return out;
}
/** seven-step pixel ramp with a light dither (hand-placed clusters rather than smooth gradients or cel bands) */
export const band = (L, n = 7) => { const m = Math.max(7, n + 3); return Math.round(clamp01(L + (Math.random() - 0.5) * (0.75 / m)) * m) / m; };
function texOf(cv, srgb) { const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.anisotropy = 2; return t; }
/** realistic flat-shaded lit material from a painted page {canvas, orm, em} */
export function paintedMat(res, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ map: texOf(res.canvas, true), flatShading: true, roughness: 1, metalness: 1, ...extra });
  if (res.orm) { const o = texOf(res.orm, false); m.roughnessMap = o; m.metalnessMap = o; } else { m.roughness = 0.85; m.metalness = 0; }
  if (res.em?.used) { m.emissiveMap = texOf(res.em, true); m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 1.0; }
  return m;
}
export const paintUV = (w, h, fn) => CK.paintUV(Math.max(8, Math.round(w * LOW.uv)), Math.max(8, Math.round(h * LOW.uv)), fn);
const UV = new Map();
export function uvMat(key, w, h, fn, extra) { if (!UV.has(key)) { const m = paintedMat(paintUV(w, h, fn), extra); for (const k of ['map', 'emissiveMap', 'roughnessMap']) if (m[k]) m[k].wrapS = m[k].wrapT = THREE.RepeatWrapping; UV.set(key, m); } return UV.get(key); }
/** fur clumps on a baked surface: strands flowing down, dark partings, lit tips (natural ramp) */
export function fur3(c, o, col, size = 0.03, stretch = 1.5, base = 0.5) {
  const Y = c.y / (size * stretch); const C = CK.cells3(c.x / size, Y, c.z / size); const dy = Y - C[3];
  let L = base + c.ny * 0.06 + (c.sh || 0) * 0.15 + dy * 0.3 + (C[5] - 0.5) * 0.14 + (CK.vnoise(c.x * 200, c.y * 40, c.z * 200) - 0.5) * 0.12;
  if (C[1] - C[0] < 0.08 && dy < 0.05) L -= 0.2; tone(col, band(L), o.col); o.ro = 0.95;
}
export function fur2(u, v, o, col, su = 14, sv = 6, base = 0.5, lightU = 0.22) {
  const C = CK.cells2(u * su, v * sv); let L = base + Math.cos(u * Math.PI * 2) * lightU * 0.5 + (v * sv - C[3]) * -0.25 + (C[4] - 0.5) * 0.12 + (CK.vnoise(u * 90, v * 20, 1) - 0.5) * 0.1;
  if (C[1] - C[0] < 0.1) L -= 0.22; tone(col, band(L), o.col); o.ro = 0.95;
}
/** lofts with fewer rings and sides (faceted under flat shading) */
export class Loft extends CK.Loft { constructor(rings, sides, o) { super(Math.max(3, Math.round(rings * LOW.loftR)), Math.max(4, Math.round(sides * LOW.loftS)), o); } }
export const skinnedLoft = (rings, sides, ...rest) => CK.skinnedLoft(Math.max(3, Math.round(rings * LOW.loftR)), Math.max(4, Math.round(sides * LOW.loftS)), ...rest);
/** charkit with the realistic low-poly pixel-art parts swapped in */
export const K = { ...CK, tone, band, paintedMat, paintUV, uvMat, fur3, fur2, Loft, skinnedLoft };
/** flat-shaded realistic material for a Limbo body page (nearest-filtered pixel art) */
export function limboMat(tex) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: 0.82, metalness: 0 }); }
