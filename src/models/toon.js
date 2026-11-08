// Anime / cartoon rendering kit for the detailed models: MeshToonMaterial conversion (albedo maps kept, painterly
// saturation, 4 hard light bands, smooth normals), wind for foliage cards and instanced grass blades (with a pointer
// push for the map), a painted anime sky, cel-shaded cumulus, a painted mountain backdrop and a cel flame.
// The engine's InkPass draws the black outlines on solid geometry; cut-out leaves and shader sprites stay clean.
import * as THREE from 'three';

const C = (h) => new THREE.Color(h);
export const WIND = {
  time: { value: 0 }, dir: { value: new THREE.Vector2(0.86, -0.5).normalize() }, amp: { value: 1 },
  ptr: { value: new THREE.Vector3(1e5, 0, 1e5) }, ptrR: { value: 1.6 }, ptrK: { value: 0 },
};
export const tickWind = () => { WIND.time.value = performance.now() / 1000; };

// ---------------------------------------------------------------- gradient ramps (hard cel bands)
const RAMPS = new Map();
export function gradientMap(steps = [0.32, 0.58, 0.84, 1.0]) {
  const key = steps.join(','); if (RAMPS.has(key)) return RAMPS.get(key);
  const d = new Uint8Array(steps.length * 4); steps.forEach((v, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.round(v * 255); d[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(d, steps.length, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  RAMPS.set(key, t); return t;
}

// ---------------------------------------------------------------- toon conversion
const WIND_VERT = `{ vec4 wq = modelMatrix * vec4(position, 1.0); float hk = clamp(position.y * uWindH, 0.0, 1.0); hk *= hk;
  float ph = dot(wq.xz, vec2(0.37, 0.23));
  float gust = pow(0.5 + 0.5 * sin(dot(wq.xz, uWindDir) * 0.22 - uTime * 1.25), 3.0);
  vec2 sway = uWindDir * (0.5 + gust * 1.4) * 0.05 + vec2(sin(uTime * 2.6 + ph * 5.0), cos(uTime * 3.1 + ph * 4.0)) * 0.022;
  transformed.xz += sway * hk * uWindAmp;
  transformed.y += sin(uTime * 7.0 + ph * 11.0 + position.x * 9.0 + position.z * 7.0) * 0.012 * hk * uWindAmp; }`;
const SAT_FRAG = `{ float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = max(mix(vec3(l), diffuseColor.rgb, uSat) * uTint, 0.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uPaint * (0.55 + 1.6 * l), uPaintK); }`;
const cache = new Map();
/** MeshToonMaterial twin of a PBR material. kind: 'solid' | 'foliage' (wind flutter). */
export function toonMaterial(src, { sat = 1.3, tint = null, wind = 0, windH = 0.25, bands = null, paint = null, paintK = 0.85 } = {}) {
  const key = `${src.uuid}|${sat}|${tint}|${wind}|${windH}|${bands}|${paint}|${paintK}`; if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({
    name: (src.name || 'mat') + '_toon', color: src.color ? src.color.clone() : C(0xffffff), map: src.map || null, alphaMap: src.alphaMap || null,
    emissive: src.emissive ? src.emissive.clone() : C(0), emissiveMap: src.emissiveMap || null, emissiveIntensity: src.emissiveIntensity ?? 1,
    aoMap: src.aoMap || null, aoMapIntensity: 0.6, vertexColors: !!src.vertexColors, gradientMap: gradientMap(bands || undefined),
    alphaTest: src.alphaTest || 0, transparent: !!src.transparent, opacity: src.opacity ?? 1, side: src.side ?? THREE.FrontSide, depthWrite: src.depthWrite ?? true,
  });
  m.shadowSide = src.shadowSide ?? null; m.userData = { ...src.userData, toon: true };
  const tintC = tint ? C(tint) : C(0xffffff); const paintC = paint ? C(paint) : C(0xffffff);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSat = { value: sat }; sh.uniforms.uTint = { value: tintC }; sh.uniforms.uPaint = { value: paintC }; sh.uniforms.uPaintK = { value: paint ? paintK : 0 }; sh.uniforms.uTime = WIND.time; sh.uniforms.uWindDir = WIND.dir; sh.uniforms.uWindAmp = { value: wind }; sh.uniforms.uWindH = { value: windH };
    sh.fragmentShader = 'uniform float uSat; uniform vec3 uTint; uniform vec3 uPaint; uniform float uPaintK;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + SAT_FRAG);
    if (wind) sh.vertexShader = 'uniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform float uWindH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_VERT);
  };
  m.customProgramCacheKey = () => `toon|${sat}|${wind ? 'w' : ''}|p`;
  cache.set(key, m); return m;
}
// realistic (PBR) twin of a material with wind sway for leaves / grass cards; shares maps with the source
const windCache = new Map();
export function windMaterial(src, { amp = 1, h = 0.2 } = {}) {
  const key = src.uuid + '|' + amp + '|' + h; if (windCache.has(key)) return windCache.get(key);
  const m = src.clone(); m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uTime: WIND.time, uWindDir: WIND.dir, uWindAmp: { value: amp }, uWindH: { value: h } }); sh.vertexShader = 'uniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform float uWindH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_VERT); };
  m.customProgramCacheKey = () => 'pbrwind|' + src.type; windCache.set(key, m); return m;
}
/** realistic model: keep PBR materials, give foliage cards wind; environment never gets ink outlines */
export function windify(obj, { amp = 1, h = 0.2 } = {}) {
  let any = false;
  obj.traverse((o) => { if (!o.isMesh) return; o.userData.noInk = true; const one = (m) => { if (!m || !(m.alphaTest > 0 || m.userData?.foliage) || m.userData?.glass || m.userData?.flame) return m; any = true; return windMaterial(m, { amp, h }); }; o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); });
  if (any) obj.traverse((o) => { if (o.isMesh) o.onBeforeRender = tickWind; });
  return obj;
}
const isFoliage = (m) => !!(m && (m.alphaTest > 0 || m.userData?.foliage));
/** convert every mesh of a loaded model to toon; foliage cards flutter. Glass and flames keep their materials. */
export function toonify(obj, { sat = 1.3, tint = null, leafTint = null, wind = 1, windH = 0.2, cast = true, bands = null } = {}) {
  let hasWind = false;
  obj.traverse((o) => {
    if (!o.isMesh) return; const one = (m) => {
      if (!m || m.userData?.glass || m.userData?.flame || m.isMeshToonMaterial || m.isShaderMaterial) return m;
      const leaf = isFoliage(m); if (leaf && wind) hasWind = true;
      return toonMaterial(m, { sat: leaf ? sat + 0.15 : sat, tint: leaf ? leafTint ?? tint : tint, wind: leaf ? wind : 0, windH, bands });
    };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
    if (o.geometry && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    o.castShadow = cast && o.castShadow !== false; o.receiveShadow = true;
  });
  if (hasWind) obj.traverse((o) => { if (o.isMesh) o.onBeforeRender = tickWind; });
  return obj;
}
/** plain toon material from a colour / map (ground, water edges, tabletop wood). */
export function toon(params = {}, { sat = 1.25, tint = null } = {}) { return toonMaterial(new THREE.MeshStandardMaterial(params), { sat, tint }); }

// ---------------------------------------------------------------- instanced grass blades (wind + pointer push)
function bladeGeometry(pal = ['#33521f', '#5f9030', '#c2d066']) {
  const segs = 4, w = 0.055; const pos = [], col = [], idx = [];
  const base = C(pal[0]), mid = C(pal[1]), tip = C(pal[2]);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const ww = w * (1 - t) ** 0.9; const z = t * t * 0.18; const c = t < 0.5 ? base.clone().lerp(mid, t * 2) : mid.clone().lerp(tip, (t - 0.5) * 2);
    pos.push(-ww, t, z, ww, t, z); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  // soften normals toward "up" so the cel bands read across a whole tuft instead of per blade
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) { const v = new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)).lerp(new THREE.Vector3(0, 1, 0.35), 0.7).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return g;
}
const GRASS_VERT = `
  vec4 groot = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 gw = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  float gk = position.y * position.y; float gh = gw.y - groot.y;
  float gph = dot(groot.xz, vec2(0.71, 0.53));
  float ggust = pow(0.5 + 0.5 * sin(dot(groot.xz, uWindDir) * 0.32 - uTime * 1.6), 2.5);
  vec2 goff = uWindDir * (0.25 + ggust * 1.15 + sin(uTime * 2.3 + gph) * 0.18) * 0.32 * uWindAmp;
  vec2 gd = groot.xz - uPtr.xz; float gr = length(gd); goff += (gr > 0.001 ? gd / gr : vec2(0.0)) * smoothstep(uPtrR, 0.0, gr) * uPtrK;
  gw.xz += goff * gk * gh; gw.y -= dot(goff, goff) * gk * gh * 0.45;
  vec4 mvPosition = viewMatrix * gw; gl_Position = projectionMatrix * mvPosition;`;
/** a field of instanced blades. spots: array of [x, y, z, height, hueJitter]. */
export function grassBlades(spots, { colorJitter = 0.08, dry = 0.25, pointer = false, pbr = false } = {}) {
  const geo = bladeGeometry(pbr ? ['#46702a', '#74a23e', '#c4d27a'] : ['#4f7c2c', '#84b444', '#dce47e']); const mat = pbr ? new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.78, metalness: 0 }) : new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: gradientMap([0.45, 0.72, 1.0]) });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: WIND.time, uWindDir: WIND.dir, uWindAmp: WIND.amp, uPtr: WIND.ptr, uPtrR: WIND.ptrR, uPtrK: WIND.ptrK });
    sh.vertexShader = 'uniform float uTime; uniform vec2 uWindDir; uniform float uWindAmp; uniform vec3 uPtr; uniform float uPtrR; uniform float uPtrK;\n' + sh.vertexShader.replace('#include <project_vertex>', GRASS_VERT);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * vec3(0.12, 0.12, 0.06);');
  };
  mat.customProgramCacheKey = () => (pbr ? 'grassblades-pbr' : 'grassblades');
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const dryC = C('#e0c070'), greenC = C('#ffffff');
  spots.forEach(([x, y, z, h, j = Math.random()], i) => {
    q.setFromEuler(e.set((Math.random() - 0.5) * 0.35, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.35)); const w = 0.8 + Math.random() * 0.6;
    m4.compose(p.set(x, y, z), q, s.set(w, h, w)); mesh.setMatrixAt(i, m4);
    c.copy(greenC).lerp(dryC, j < dry ? 0.35 + j * 0.5 : 0).offsetHSL((Math.random() - 0.5) * colorJitter, 0, (Math.random() - 0.5) * colorJitter); mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true; mat.fog = false; mesh.receiveShadow = true; mesh.castShadow = false; mesh.frustumCulled = false; mesh.userData.noInk = true; mesh.userData.noAO = true; mesh.onBeforeRender = tickWind; mesh.name = 'grassBlades';
  void pointer; return mesh;
}

// ---------------------------------------------------------------- painted anime sky, clouds, mountains
export const SKY = {
  meadow: { zen: '#3c5aa8', hi: '#6f7fc8', mid: '#e7a2a4', low: '#ffc98e', hor: '#ffe2b0', gnd: '#c89a7a', glow: '#fff0c0', cloud: ['#fff3e0', '#ffcfa8', '#b9a0d0', '#8a7ab8'], mtn: ['#8f86c0', '#b6a2cc', '#d8b8c8'] },
  garden: { zen: '#3a4c9a', hi: '#7a78c8', mid: '#eea2b6', low: '#ffc8a8', hor: '#ffe6c4', gnd: '#c8a08a', glow: '#fff2d0', cloud: ['#fff5ea', '#ffd0bc', '#c4a2d4', '#9080c0'], mtn: ['#9088c4', '#baa4d0', '#e0bcd0'] },
  gully: { zen: '#3a4a90', hi: '#7a72b8', mid: '#e89a84', low: '#ffbc78', hor: '#ffdca0', gnd: '#c8946a', glow: '#fff0b0', cloud: ['#fff0dc', '#ffc890', '#c09ab8', '#8a74a8'], mtn: ['#9a7ea8', '#c09ab0', '#e2b8a8'] },
  labyrinth: { zen: '#2a2f78', hi: '#6460b0', mid: '#d88496', low: '#ffa878', hor: '#ffd29a', gnd: '#b07a6a', glow: '#ffe2b0', cloud: ['#ffe8d8', '#ffbc9c', '#b08ac0', '#7466a8'], mtn: ['#7a6aa8', '#a68ab8', '#d2a6b8'] },
  marsh: { zen: '#2e5a8a', hi: '#5a8ab8', mid: '#9ec0c4', low: '#e8d8b0', hor: '#f4ecc8', gnd: '#8aa092', glow: '#fffbe0', cloud: ['#f6fbf0', '#e2ead0', '#9ab4c4', '#7090a8'], mtn: ['#6e8ca8', '#90aab8', '#b8cac4'] },
  guardian: { zen: '#241e66', hi: '#5a48a8', mid: '#d0708e', low: '#ff9a6a', hor: '#ffcc90', gnd: '#a87060', glow: '#ffd8a0', cloud: ['#ffe4d4', '#ffb08c', '#a87ab8', '#6a5aa0'], mtn: ['#6e5aa0', '#9a78b0', '#c894a8'] },
};
/** smooth gradient dome, warm glow around sunDir (the pixel sun billboard is drawn there by the VFX layer) */
export function animeSky(theme = 'meadow', sunDir = new THREE.Vector3(0.3, 0.12, -1)) {
  const S = SKY[theme] || SKY.meadow; const u = (h) => ({ value: C(h) });
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZen: u(S.zen), uHi: u(S.hi), uMid: u(S.mid), uLow: u(S.low), uHor: u(S.hor), uGnd: u(S.gnd), uGlow: u(S.glow), uSun: { value: sunDir.clone().normalize() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uZen, uHi, uMid, uLow, uHor, uGnd, uGlow, uSun; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float e = degrees(asin(clamp(d.y, -1.0, 1.0)));
        vec3 c = mix(uHor, uLow, smoothstep(0.0, 1.6, e)); c = mix(c, uMid, smoothstep(1.2, 4.2, e)); c = mix(c, uHi, smoothstep(3.8, 7.5, e)); c = mix(c, uZen, smoothstep(7.0, 16.0, e));
        if (e < 0.0) c = mix(uHor, uGnd, smoothstep(0.0, -6.0, e));
        float s = max(0.0, dot(d, normalize(uSun))); c += uGlow * (pow(s, 40.0) * 0.55 + pow(s, 8.0) * 0.22 + pow(s, 2.0) * 0.06);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), m); mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'animeSky'; mesh.userData.noInk = true; mesh.userData.noAO = true; return mesh;
}
// cel-shaded cumulus painted on a canvas: lavender shadow body, cream lit body, warm rim highlight, flat base
function cloudTexture(cols, seed = 1, w = 512, h = 256) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); let s = seed * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const puffs = []; const n = 6 + Math.floor(r() * 4); const base = h * 0.78;
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const cx = w * (0.12 + t * 0.76) + (r() - 0.5) * 30; const rr = h * (0.18 + Math.sin(t * Math.PI) * 0.26 + r() * 0.08); puffs.push([cx, base - rr * (0.55 + r() * 0.35), rr]); }
  puffs.push([w * 0.5, base - h * 0.42, h * 0.36]);
  const body = (dx, dy, k = 1) => { g.beginPath(); for (const [x, y, rr] of puffs) { g.moveTo(x + dx + rr * k, y + dy); g.arc(x + dx, y + dy, rr * k, 0, Math.PI * 2); } g.fill(); };
  g.save(); g.beginPath(); g.rect(0, 0, w, base); g.clip();
  g.fillStyle = cols[3]; body(0, 0); g.globalCompositeOperation = 'source-atop';
  g.fillStyle = cols[2]; body(-6, -h * 0.05, 0.98);
  g.fillStyle = cols[0]; body(-w * 0.025, -h * 0.11, 0.9);
  g.fillStyle = cols[1]; g.globalAlpha = 0.9; body(w * 0.03, -h * 0.02, 0.62); g.globalAlpha = 1;
  g.fillStyle = cols[0]; body(-w * 0.04, -h * 0.15, 0.7);
  g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** big stylized clouds on far billboards, kept out of the sun's patch */
export function animeClouds(theme = 'meadow', { seed = 1, n = 7, z = -150, sunDir = new THREE.Vector3(0.3, 0.12, -1), cam = new THREE.Vector3(0, 3, 11) } = {}) {
  const S = SKY[theme] || SKY.meadow; const g = new THREE.Group(); g.name = 'clouds'; let s = seed * 7 + 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const sunX = cam.x + (sunDir.x / -sunDir.z) * (cam.z - z);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * 300 + (r() - 0.5) * 30; if (Math.abs(x - sunX) < 22) continue;
    const w = 50 + r() * 55; const hgt = w * 0.5; const y = 16 + r() * 14; const zz = z - r() * 20;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ map: cloudTexture(S.cloud, seed * 31 + i), transparent: true, depthWrite: false, fog: false }));
    m.position.set(x, y, zz); m.lookAt(cam.x, y * 0.6, cam.z); m.renderOrder = -8; m.userData.noInk = true; m.userData.noAO = true; g.add(m);
  }
  return g;
}
/** layered painted mountain ranges on a wide backdrop (soft anime background art, cel split light/shadow) */
export function mountainBackdrop(theme = 'meadow', { seed = 1, z = -110, width = 320, height = 46, y = -6, sunDir = new THREE.Vector3(0.3, 0.12, -1), cam = new THREE.Vector3(0, 3, 11) } = {}) {
  const S = SKY[theme] || SKY.meadow; const W = 2048, H = 300; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  let s = seed * 131 + 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const sunU = 0.5 + ((cam.x + (sunDir.x / -sunDir.z) * (cam.z - z)) / width);
  S.mtn.slice().reverse().forEach((col, li) => {
    const layer = 2 - li; const peaks = []; for (let x = -100; x < W + 100; x += 120 + r() * 160) peaks.push([x, H * (0.12 + layer * 0.12 + r() * 0.2)]);
    const yAt = (x) => { let yy = H; for (const [px, py] of peaks) { const d = Math.abs(x - px) / (180 + layer * 40); yy = Math.min(yy, py + d * d * H * 0.55 + Math.sin(x * 0.03 + layer) * 4); } const du = Math.abs(x / W - sunU); return Math.min(H, yy + (du < 0.08 ? (0.08 - du) * H * 3 : 0)); };
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 4) g.lineTo(x, yAt(x)); g.lineTo(W, H); g.closePath(); g.fill();
    // lit flanks: the side of each peak facing the sun gets a lighter wash
    g.save(); g.clip(); g.fillStyle = 'rgba(255,236,210,0.28)'; for (const [px, py] of peaks) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + (px / W < sunU ? 1 : -1) * 260, H); g.lineTo(px, H); g.closePath(); g.fill(); } g.restore();
  });
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(255,220,190,0)'); grd.addColorStop(1, 'rgba(255,220,190,0.35)'); g.globalCompositeOperation = 'source-atop'; g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  m.position.set(0, y + height / 2, z); m.renderOrder = -9; m.userData.noInk = true; m.userData.noAO = true; m.name = 'mountains'; return m;
}

// ---------------------------------------------------------------- cel flame (crossed cards, banded procedural fire)
const FLAME_MAT = () => new THREE.ShaderMaterial({
  side: THREE.DoubleSide, toneMapped: false,
  uniforms: { uTime: WIND.time, uSeed: { value: Math.random() * 10 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uTime, uSeed; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main(){ vec2 p = vUv; float t = floor(uTime * 12.0) / 12.0 + uSeed;
      float w = n(vec2(p.x * 4.0, p.y * 3.0 - t * 3.0)) * 0.5 + n(vec2(p.x * 9.0, p.y * 6.0 - t * 5.0)) * 0.25;
      float shape = (1.0 - p.y) * 1.25 - abs(p.x - 0.5 + (w - 0.37) * 0.35 * p.y) * 2.6 + w * 0.55 - 0.35;
      if (shape < 0.0) discard;
      vec3 c = shape > 0.95 ? vec3(1.0, 0.86, 0.42) : shape > 0.58 ? vec3(1.0, 0.5, 0.09) : shape > 0.24 ? vec3(0.86, 0.22, 0.04) : vec3(0.5, 0.07, 0.04);
      gl_FragColor = vec4(c * 0.95, 1.0); }`,
});
export function animeFlame(w = 0.7, h = 1.1) {
  const g = new THREE.Group(); g.name = 'flame';
  for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), FLAME_MAT()); m.position.y = h / 2; m.rotation.y = (k / 3) * Math.PI; m.userData.noInk = true; m.userData.noAO = true; m.renderOrder = 5; m.onBeforeRender = tickWind; g.add(m); }
  return g;
}

// ---------------------------------------------------------------- image-based fill for the (non-toon) characters
const ENV = new Map();
export function gradientEnv(renderer, key, { top = '#4a4a8a', hor = '#e8a070', gnd = '#3a2630' } = {}) {
  if (!renderer) return null; if (ENV.has(key)) return ENV.get(key);
  const sc = new THREE.Scene(); const geo = new THREE.SphereGeometry(10, 24, 16); const p = geo.attributes.position; const cols = []; const T = C(top), H = C(hor), G = C(gnd), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; if (y > 0) col.copy(H).lerp(T, Math.pow(y, 0.6)); else col.copy(H).lerp(G, Math.min(1, -y * 2.5)); cols.push(col.r, col.g, col.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(sc, 0.02); pm.dispose(); geo.dispose(); ENV.set(key, rt.texture); return rt.texture;
}
