// TERRAIN SPLAT: one material that paints a whole landscape with the game's hand-made pixel-art ground tiles
// (gfx/art/tiles.js), blended per pixel instead of flat-coloured facets:
//   - land use per vertex (aUse): 0 meadow, 1 / 2 ploughed field (furrows across / along), 3 orchard, 4 cobbles,
//     5 trodden lane, 6 river bank, 7 forest floor, 8 rock, 9 snow;
//   - slope and height: steep ground turns to triplanar rock wherever it is, whatever its land use;
//   - meadows drift between lush and dry grass on a macro variation map (no visible tiling), with a finer detail
//     layer of the same tile close to the camera;
//   - the painted vertex colour stays the colour of the land; the texture adds its pixel detail and its own hue
//     variation on top (tile / tile-average), so the authored palette and the pixel art always agree;
//   - furrows and orchard rows as crisp stripes that fade out before they could shimmer, and a broken, brushy
//     value variation like a painter's ground.
// One material, one draw call per mesh; smooth normals (pass them from the height function) for soft painterly light.
//   const m = terrainMaterial({ scale: 0.25 }); mesh needs attributes position, normal, color, aUse
import * as THREE from 'three';
import { groundTex, soilTex, gravelTex, earthTex, cobbleTex } from './pixeltex.js';

const VERT_DECL = 'attribute float aUse; varying float vTU; varying vec3 vTW; varying vec3 vTN;\n';
const FRAG_DECL = `uniform sampler2D tGrass, tDry, tSoil, tRock, tCobble, tEarth; uniform float uTS, uDetail;
varying float vTU; varying vec3 vTW; varying vec3 vTN;
float th21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tvn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(th21(i), th21(i + vec2(1, 0)), f.x), mix(th21(i + vec2(0, 1)), th21(i + vec2(1, 1)), f.x), f.y); }
vec3 tAvg(sampler2D t){ return textureLod(t, vec2(0.5), 12.0).rgb; }
`;
const FRAG_BODY = `{
  vec3 wp = vTW; vec3 n = normalize(vTN); float u = floor(vTU + 0.5); float dist = length(vViewPosition);
  // macro variation: big soft patches and a mid layer (breaks every repeat)
  float mac = tvn(wp.xz / 46.0) * 0.65 + tvn(wp.xz / 13.0 + 7.3) * 0.35;
  vec2 uv = wp.xz * uTS + vec2(tvn(wp.xz / 31.0) * 0.37, tvn(wp.zx / 29.0) * 0.41); // a gentle drift so tiles never line up
  vec3 gr = texture2D(tGrass, uv).rgb, dr = texture2D(tDry, uv * 0.9 + 0.3).rgb;
  vec3 tx, ta;
  if (u < 0.5 || u > 9.5) { float wd = smoothstep(0.42, 0.72, mac); tx = mix(gr, dr, wd); ta = mix(tAvg(tGrass), tAvg(tDry), wd); }
  else if (u < 2.5) { tx = texture2D(tSoil, uv).rgb; ta = tAvg(tSoil); }
  else if (u < 3.5) { tx = mix(dr, texture2D(tSoil, uv).rgb, 0.35); ta = mix(tAvg(tDry), tAvg(tSoil), 0.35); }
  else if (u < 4.5) { tx = texture2D(tCobble, wp.xz * uTS * 2.0).rgb; ta = tAvg(tCobble); }
  else if (u < 5.5) { tx = texture2D(tEarth, uv * 1.5).rgb; ta = tAvg(tEarth); }
  else if (u < 7.5) { float k = u < 6.5 ? 0.75 : 0.5; tx = mix(gr, texture2D(tSoil, uv).rgb, k); ta = mix(tAvg(tGrass), tAvg(tSoil), k); }
  else { tx = gr; ta = tAvg(tGrass); }
  // slope: triplanar rock on steep ground (and the rock / snow land uses)
  float wr = max(smoothstep(0.32, 0.55, 1.0 - n.y), step(7.5, u) * step(u, 8.5)); if (u > 8.5 && u < 9.5) wr = 0.0;
  if (wr > 0.0) { vec3 w = pow(abs(n), vec3(4.0)); w /= dot(w, vec3(1.0)); float rs = uTS * 0.8;
    vec3 rk = texture2D(tRock, wp.zy * rs).rgb * w.x + texture2D(tRock, wp.xz * rs).rgb * w.y + texture2D(tRock, wp.xy * rs).rgb * w.z;
    tx = mix(tx, rk, wr); ta = mix(ta, tAvg(tRock), wr); }
  // near detail: the same tiles at 3x, faded in close to the camera
  float nk = (1.0 - smoothstep(10.0, 40.0, dist)) * uDetail; if (nk > 0.0) { vec3 d2 = texture2D(tGrass, uv * 3.1 + 0.5).rgb / max(tAvg(tGrass), vec3(0.02)); tx *= mix(vec3(1.0), d2, nk * 0.35); }
  vec3 vc = diffuseColor.rgb; vec3 detail = tx / max(ta, vec3(0.02));
  vec3 c = vc * mix(vec3(1.0), detail, 0.85);
  float lv = dot(vc, vec3(0.3, 0.55, 0.15)), la = dot(ta, vec3(0.3, 0.55, 0.15)); c = mix(c, tx * (lv / max(la, 0.02)), 0.3); // a little of the tile's own hue
  // furrows (fields) and orchard rows
  if (u > 0.5 && u < 2.5) { float cc = u < 1.5 ? wp.x : wp.z; float fw = fwidth(cc / 1.7); c *= mix(1.0, mix(0.8, 1.07, step(0.5, fract(cc / 1.7))), 1.0 - smoothstep(0.25, 0.6, fw)); }
  if (u > 2.5 && u < 3.5) { vec2 g = fract(wp.xz / vec2(5.0, 4.0)) - 0.5; float fw = fwidth(wp.x / 5.0); c *= mix(1.0, mix(1.04, 0.8, smoothstep(0.32, 0.18, abs(g.y))), 1.0 - smoothstep(0.2, 0.5, fw)); }
  // painterly value / warmth drift
  c *= 0.88 + mac * 0.24; c = mix(c, c * vec3(1.06, 1.0, 0.9), smoothstep(0.55, 0.8, tvn(wp.xz / 70.0 + 3.0)) * 0.5);
  diffuseColor.rgb = c;
}`;

export function terrainMaterial({ scale = 0.25, detail = 1, grass = 'meadow', dry = 'dry' } = {}) {
  const U = { tGrass: { value: groundTex(grass) }, tDry: { value: groundTex(dry) }, tSoil: { value: soilTex() }, tRock: { value: gravelTex() }, tCobble: { value: cobbleTex() }, tEarth: { value: earthTex(0.25) }, uTS: { value: scale }, uDetail: { value: detail } };
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT_DECL + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vTU = aUse; vTW = (modelMatrix * vec4(position, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = FRAG_DECL + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_BODY);
  };
  m.customProgramCacheKey = () => 'terrainSplat'; m.userData.terrain = U; return m;
}

/** smooth (area-weighted) normals for a non-indexed terrain mesh: corners at the same x, z share one normal, while
 *  every face keeps its own painted colour (soft, painterly light instead of flat-shaded facets) */
export function smoothNormals(geo) {
  const p = geo.attributes.position; const n = p.count; const acc = new Map(); const keys = new Array(n); const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < n; i++) keys[i] = Math.round(p.getX(i) * 20) * 1e6 + Math.round(p.getZ(i) * 20);
  for (let i = 0; i + 2 < n; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); c.sub(b); a.sub(b); c.cross(a); if (c.y < 0) c.negate();
    for (let k = 0; k < 3; k++) { const key = keys[i + k]; let v = acc.get(key); if (!v) acc.set(key, (v = [0, 0, 0])); v[0] += c.x; v[1] += c.y; v[2] += c.z; } }
  const out = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = acc.get(keys[i]); const L = Math.hypot(v[0], v[1], v[2]) || 1; out[i * 3] = v[0] / L; out[i * 3 + 1] = v[1] / L; out[i * 3 + 2] = v[2] / L; }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return geo;
}
