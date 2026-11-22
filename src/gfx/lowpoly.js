// Realistic low-poly pixel-art look, shared by every scene.
//
// 1) Realistic CEL light on the toon materials: importing this module (engine.js does) swaps three's toon gradient
//    lookup for Lambert diffuse pulled toward three soft bands (see getGradientIrradiance), so every MeshToonMaterial
//    in the game, painted pixel-art maps included, gets clean shadow terminators while still being lit by the real
//    sun / sky / bounce / shadows / AO. Gradient maps become no-ops.
// 2) lowpolyify(objectOrMesh, { detail, flat, uvs }) -> converts meshes to clean faceted low poly:
//    - vertex-clustering decimation on a grid whose cell is set by `detail` (0 = very coarse .. 1 = fine; default 0.5),
//      degenerate triangles dropped;
//    - every triangle corner keeps its own UV (so pixel-art maps still map), while all corners in a cluster share
//      ONE position and ONE set of skin weights (skinned meshes keep animating without cracks);
//    - flat normals (non-indexed output) and material.flatShading = true.
//    Works on Mesh, SkinnedMesh and InstancedMesh (the instance geometry). Returns the object. Usage:
//      import { lowpolyify } from '../gfx/lowpoly.js';  lowpolyify(model, { detail: 0.35 });
// 3) flatten(object) -> only flat shading (for geometry that is already low poly).
import * as THREE from 'three';

THREE.ShaderChunk.gradientmap_pars_fragment = `
#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
// REALISTIC CEL: physically plausible Lambert, pulled toward three soft tones (core shadow / half light / full light)
// with clean but anti-aliased terminators. The pull is partial, so forms still turn with real gradients inside each
// band: it reads as a painted cel shade, not a cartoon.
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float d = dot( normal, lightDirection );
	float lam = max( d, 0.0 );
	float w = fwidth( d ) * 1.5 + 0.035;
	float cel = 0.5 * smoothstep( 0.04 - w, 0.04 + w, d ) + 0.5 * smoothstep( 0.42 - w, 0.42 + w, d ); // 0 | 0.5 | 1
	cel = cel * ( 0.82 + 0.18 * lam ); // the lit band still rolls off toward the terminator
	return vec3( mix( lam, cel, 0.68 ) );
}`;

// ---------------------------------------------------------------- LFX: the shared painterly light model (every lit material)
// One set of LIVE uniforms (plain {x,y,z,w} objects: three's cloneUniforms keeps them by reference, so every program
// sees the same values) is added to the standard / physical / toon / lambert / phong shader libs, and the stock chunks
// are extended (guarded by the material's own STANDARD / TOON / LAMBERT / PHONG define, so ShaderMaterials that borrow
// a chunk compile as before and, with no uniform bound, every term is zero):
//   - realistic CEL terminators on PBR materials too (soft but clean), with a warm saturated band where light turns
//     into shade (the painter's terminator), and the same band on the toon ramp;
//   - COLOURED cast shadows: light a shadow blocks is partly replaced by blue-violet skylight (never grey);
//   - a soft SKY RIM / fresnel (cool sky from above, warm bounce below) and a coloured shade tint;
//   - FOLIAGE translucency (alpha-tested cards, or defines.LFX_FOLIAGE): backlit leaves glow warm;
//   - MICRO detail: cheap world-space value noise (a low-frequency mottle plus fine pixel-grid grain) on bland surfaces;
//   - ATMOSPHERIC perspective: distance haze tinted toward the sky (warmer toward the sun) plus a low height fog.
// The engine sets LFX per scene (setFx fx.atmo) and swaps in the UI values for the UI pass; quality 'low' zeroes the
// costly micro detail (a uniform branch, so the cost is gone too).
const v4 = (x = 0, y = 0, z = 0, w = 0) => ({ x, y, z, w });
export const LFX = {
  lfxSky: { value: v4(0.42, 0.56, 0.86, 0.3) }, // rgb sky (linear), w rim strength
  lfxGnd: { value: v4(0.5, 0.32, 0.14, 0.5) }, // rgb ground bounce (linear), w how much of the rim turns warm on undersides
  lfxHaze: { value: v4(0.55, 0.64, 0.82, 0) }, // rgb haze (linear), w max haze
  lfxFog: { value: v4(22, 0.006, 1.5, 0) }, // x start, y density, z height-fog top (world y), w height fog amount
  lfxShade: { value: v4(0.46, 0.5, 1.0, 0.55) }, // rgb skylight that fills cast shadows (linear), w amount
  lfxMisc: { value: v4(0.0, 0.6, 0.4, 0.5) }, // x micro detail, y foliage translucency, z PBR cel, w terminator warmth
};
for (const lib of ['physical', 'standard', 'toon', 'lambert', 'phong']) { const L = THREE.ShaderLib[lib]; if (L) for (const k in LFX) L.uniforms[k] = LFX[k]; }
/** live presets: world (set per scene by the engine) and UI (the 3D HUD keeps its own studio rig) */
export function lfxSet(o = {}) { for (const k in o) { const u = LFX[k]?.value; if (u) Object.assign(u, o[k]); } }

const LFX_DEF = '\n#if defined( STANDARD ) || defined( TOON ) || defined( LAMBERT ) || defined( PHONG )\n#define LFX\n#endif\n';
const LFX_PARS = `
#ifdef LFX
uniform vec4 lfxSky, lfxGnd, lfxHaze, lfxFog, lfxShade, lfxMisc;
float lfxH3( vec3 p ) { p = fract( p * 0.3183099 + vec3( 0.71, 0.113, 0.419 ) ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float lfxN3( vec3 x ) { vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( mix( lfxH3( i ), lfxH3( i + vec3( 1, 0, 0 ) ), f.x ), mix( lfxH3( i + vec3( 0, 1, 0 ) ), lfxH3( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
		mix( mix( lfxH3( i + vec3( 0, 0, 1 ) ), lfxH3( i + vec3( 1, 0, 1 ) ), f.x ), mix( lfxH3( i + vec3( 0, 1, 1 ) ), lfxH3( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z ); }
// soft-but-clean cel pull of a Lambert term, plus the warm terminator band
vec3 lfxCel( float d, float k, float warm ) {
	d = clamp( d, -1.0, 1.0 ); float lam = max( d, 0.0 ); float w = min( fwidth( d ), 0.25 ) * 1.2 + 0.03; // clamp / min also swallow NaNs from degenerate faces
	float cel = smoothstep( 0.02 - w, 0.1 + w, d ) * ( 0.6 + 0.4 * smoothstep( 0.32 - w, 0.62 + w, d ) );
	float l = mix( lam, cel, k ); float band = smoothstep( -0.04, 0.06, d ) * ( 1.0 - smoothstep( 0.06, 0.4, d ) );
	return vec3( l ) * ( 1.0 + warm * band * vec3( 0.42, 0.06, -0.2 ) );
}
#endif
`;
{
  const S = THREE.ShaderChunk;
  S.fog_pars_fragment = LFX_DEF + S.fog_pars_fragment + LFX_PARS;
  // PBR + Lambert: cel terminators and the warm band
  // (the cel term shapes the DIFFUSE only: specular keeps the physical N.L, or GGX blows up at grazing terminators)
  for (const k of ['lights_physical_pars_fragment', 'lights_lambert_pars_fragment']) {
    S[k] = S[k].replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      '#ifdef LFX\n\treflectedLight.directDiffuse += lfxCel( dot( geometryNormal, directLight.direction ), lfxMisc.z, lfxMisc.w ) * directLight.color * BRDF_Lambert( material.diffuseColor );\n\t#else\n\treflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n\t#endif');
  }
  S.lights_toon_pars_fragment = S.lights_toon_pars_fragment.replace('vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;',
    'vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;\n\t#ifdef LFX\n\t{ float d = clamp( dot( geometryNormal, directLight.direction ), -1.0, 1.0 ); irradiance *= 1.0 + lfxMisc.w * smoothstep( -0.04, 0.06, d ) * ( 1.0 - smoothstep( 0.06, 0.4, d ) ) * vec3( 0.42, 0.06, -0.2 ); }\n\t#endif');
  // coloured cast shadows: remember the light each shadow blocks
  const SHL = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
  if (S.lights_fragment_begin.includes(SHL)) S.lights_fragment_begin = '#ifdef LFX\nvec3 lfxBlocked = vec3( 0.0 );\n#endif\n' + S.lights_fragment_begin.replace(SHL,
    '{ float lfxS = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\t#ifdef LFX\n\t\tlfxBlocked += ( 1.0 - lfxS ) * directLight.color * saturate( dot( geometryNormal, directLight.direction ) );\n\t\t#endif\n\t\tdirectLight.color *= lfxS; }');
  else S.lights_fragment_begin = '#ifdef LFX\nvec3 lfxBlocked = vec3( 0.0 );\n#endif\n' + S.lights_fragment_begin;
  // micro surface detail on the albedo (world space, so it never swims)
  S.color_fragment += `
#ifdef LFX
if ( lfxMisc.x > 0.0 ) {
	vec3 lfxWP = cameraPosition + ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz; float lfxD = length( vViewPosition );
	float n0 = lfxN3( lfxWP * 0.45 ); float n1 = lfxN3( floor( lfxWP * 14.0 ) + 0.5 ) * ( 1.0 - smoothstep( 6.0, 26.0, lfxD ) );
	float m = ( n0 - 0.5 ) * 0.22 + ( n1 - 0.5 ) * 0.12;
	diffuseColor.rgb *= ( 1.0 + m * lfxMisc.x ) * mix( vec3( 1.0 ), mix( vec3( 1.04, 1.0, 0.93 ), vec3( 0.95, 1.0, 1.06 ), n0 ), lfxMisc.x * 0.8 );
}
#endif
`;
  // rim / shade tint / translucency / coloured shadow fill / atmosphere: on the final lit colour
  S.opaque_fragment = `
#ifdef LFX
{
	vec3 lfxN = normalize( normal ); vec3 lfxV = normalize( vViewPosition ); float lfxD = length( vViewPosition );
	vec3 lfxNW = ( vec4( lfxN, 0.0 ) * viewMatrix ).xyz; vec3 lfxRay = ( vec4( - lfxV, 0.0 ) * viewMatrix ).xyz;
	vec3 lfxAlb = diffuseColor.rgb;
	// skylight fill in cast shadows (blue-violet, never grey)
	outgoingLight += lfxAlb * lfxBlocked * lfxShade.rgb * lfxShade.w * RECIPROCAL_PI;
	// shade tint: where the sky does most of the lighting, cool it a little and keep the colour rich
	{ float dl = dot( reflectedLight.directDiffuse, vec3( 0.333 ) ), il = dot( reflectedLight.indirectDiffuse, vec3( 0.333 ) ); float sh = il / ( dl + il + 1e-4 );
	  vec3 c = outgoingLight; float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); c = mix( vec3( l ), c, 1.0 + 0.25 * sh * lfxShade.w ); outgoingLight = mix( outgoingLight, c * vec3( 0.95, 0.97, 1.08 ), sh * sh * lfxShade.w ); }
	// soft sky rim (cool from above, warm earth bounce underneath)
	{ float fr = pow( 1.0 - saturate( dot( lfxN, lfxV ) ), 3.0 ); float up = saturate( 0.5 + 0.5 * lfxNW.y );
	  vec3 rc = mix( lfxGnd.rgb, lfxSky.rgb, mix( 1.0, up, lfxGnd.w ) ); float rk = lfxSky.w;
	  #if defined( USE_ALPHATEST ) || defined( LFX_FOLIAGE )
	  rk *= 0.3; // leaf cards turn edge-on everywhere: only a whisper of rim, or crowns fringe blue
	  #endif
	  outgoingLight += rc * fr * rk * ( 0.25 + 0.75 * lfxAlb ) * ( 0.4 + 0.6 * up ); }
	#if ( defined( USE_ALPHATEST ) || defined( LFX_FOLIAGE ) ) && NUM_DIR_LIGHTS > 0
	{ vec3 L = directionalLights[ 0 ].direction; float back = saturate( - dot( lfxN, L ) ); float through = pow( saturate( - dot( lfxV, L ) ), 3.0 );
	  outgoingLight += directionalLights[ 0 ].color * lfxAlb * vec3( 1.15, 1.0, 0.55 ) * ( back * 0.3 + through * 0.9 ) * lfxMisc.y * 0.35; }
	#endif
	// atmospheric perspective: sky-tinted distance haze (warmer toward the sun) and a low height fog
	if ( lfxHaze.w > 0.0 ) {
		float hz = 1.0 - exp( - max( lfxD - lfxFog.x, 0.0 ) * lfxFog.y );
		float wy = cameraPosition.y + lfxRay.y * lfxD; hz += lfxFog.w * ( 1.0 - exp( - max( lfxD - lfxFog.x * 0.5, 0.0 ) * lfxFog.y * 1.5 ) ) * ( 1.0 - smoothstep( lfxFog.z - 2.0, lfxFog.z + 3.0, wy ) );
		vec3 hc = lfxHaze.rgb;
		#if NUM_DIR_LIGHTS > 0
		{ vec3 sw = ( vec4( directionalLights[ 0 ].direction, 0.0 ) * viewMatrix ).xyz; float sd = saturate( dot( normalize( lfxRay ), sw ) ); hc = mix( hc, hc * vec3( 1.35, 1.08, 0.72 ), pow( sd, 4.0 ) * 0.8 ); }
		#endif
		outgoingLight = mix( outgoingLight, hc, saturate( hz ) * lfxHaze.w );
	}
	outgoingLight = max( outgoingLight, vec3( 0.0 ) );
}
#endif
` + S.opaque_fragment;
}

// MeshToonMaterial has no declared flatShading, so `new MeshToonMaterial({ flatShading: true })` warned and was ignored;
// declaring it lets every agent's toon materials go flat-shaded (the shader already supports FLAT_SHADED)
if (THREE.MeshToonMaterial.prototype.flatShading === undefined) THREE.MeshToonMaterial.prototype.flatShading = false;

export function flatten(obj) {
  obj.traverse((o) => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { if (m && !m.isShaderMaterial && !m.flatShading) { m.flatShading = true; m.needsUpdate = true; } } });
  return obj;
}

/** decimate one BufferGeometry by vertex clustering; returns a new non-indexed geometry with flat normals */
export function lowpolyGeometry(geo, { detail = 0.5, cell = null } = {}) {
  const P = geo.attributes.position; if (!P) return geo; geo.computeBoundingBox(); const bb = geo.boundingBox; const diag = bb.max.distanceTo(bb.min) || 1;
  const c = cell ?? diag * (0.09 - 0.083 * Math.max(0, Math.min(1, detail))); const inv = 1 / c;
  const key = new Map(); const rep = new Int32Array(P.count); const sum = []; const cnt = [];
  for (let i = 0; i < P.count; i++) { const k = `${Math.round(P.getX(i) * inv)},${Math.round(P.getY(i) * inv)},${Math.round(P.getZ(i) * inv)}`; let id = key.get(k); if (id === undefined) { id = sum.length; key.set(k, id); sum.push([0, 0, 0, i]); cnt.push(0); } rep[i] = id; const s = sum[id]; s[0] += P.getX(i); s[1] += P.getY(i); s[2] += P.getZ(i); cnt[id]++; }
  const cpos = sum.map((s, id) => [s[0] / cnt[id], s[1] / cnt[id], s[2] / cnt[id]]); const first = sum.map((s) => s[3]); // the cluster's representative vertex (its skin weights)
  const idx = geo.index ? geo.index.array : Array.from({ length: P.count }, (_, i) => i); const tris = [];
  for (let t = 0; t + 2 < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], d = idx[t + 2]; if (rep[a] === rep[b] || rep[b] === rep[d] || rep[a] === rep[d]) continue; tris.push(a, b, d); }
  const out = new THREE.BufferGeometry(); const n = tris.length; const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set(cpos[rep[tris[i]]], i * 3); out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // every attribute is read through getComponent (which DE-normalises quantised data: the Poly Haven GLBs use
  // KHR_mesh_quantization, so their UVs are normalised Uint16 / Int16) and written as plain floats. Writing the
  // de-normalised 0..1 values back into the source's integer array truncated every UV to 0 or 1, so whole models
  // sampled one corner texel of their atlas and rendered black. Only skinIndex keeps its integer type.
  for (const name of Object.keys(geo.attributes)) { if (name === 'position' || name === 'normal') continue; const A = geo.attributes[name]; const sz = A.itemSize; const skin = name === 'skinIndex' || name === 'skinWeight';
    const keepInt = name === 'skinIndex' && !A.normalized; const arr = keepInt ? new A.array.constructor(n * sz) : new Float32Array(n * sz);
    for (let i = 0; i < n; i++) { const src = skin ? first[rep[tris[i]]] : tris[i]; for (let k = 0; k < sz; k++) arr[i * sz + k] = A.getComponent ? A.getComponent(src, k) : A.array[src * sz + k]; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, sz, keepInt ? A.normalized : false)); }
  for (const g of geo.groups || []) void g; // material groups are dropped by clustering; multi-material meshes keep the first material
  out.computeVertexNormals(); out.computeBoundingBox(); out.computeBoundingSphere(); out.userData = { ...geo.userData, lowpoly: { from: P.count, tris: n / 3 } }; return out;
}

/** convert an object (or one mesh) to faceted low poly in place; see the header. */
export function lowpolyify(obj, { detail = 0.5, flat = true, skip = null } = {}) {
  obj.traverse((o) => {
    if (!o.isMesh || o.isPoints || (skip && skip(o))) return; const m0 = Array.isArray(o.material) ? o.material[0] : o.material; if (m0?.isShaderMaterial || (m0?.alphaTest > 0 && !o.isSkinnedMesh)) return; // shader FX and leaf cards stay as they are
    const g = lowpolyGeometry(o.geometry, { detail }); if (g === o.geometry || !g.attributes.position.count) return;
    o.geometry = g; if (Array.isArray(o.material)) o.material = o.material[0];
    if (flat && o.material && !o.material.flatShading) { o.material.flatShading = true; o.material.needsUpdate = true; }
  });
  return obj;
}
