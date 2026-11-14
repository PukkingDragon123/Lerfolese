// Story post effects and set pieces for the prologue:
//  - shockPass(engine): the TIME-STOP SHOCKWAVE: a refracting wavefront sweeps out from a screen point; behind it the world
//    is drained to a cold black-and-white photograph (time has stopped); .set({ r, k, white }) drives it; white = flash.
//  - paintPass(engine): a FRESCO painter over the rendered frame: a Kuwahara brush filter (flat painted strokes), a fresco
//    palette (warm umber shadows, chalky lights, softened saturation), directional brush texture, plaster grain, giornata
//    seams and craquelure CRACKS in the plaster, an aged warm edge. .set(k) fades it in.
//  - pixelTitle(text): big crisp 3D lettering: every glyph of the pixel font (Alagard 48) traced to its exact pixel outline
//    and extruded with a chiselled bevel, a hand-pixelled gilt face and bronze sides; one group per letter so they can drop in.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FONT, runMask, measure } from '../ui3d/craft.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
function insertBeforeGrade(engine, pass) { const C = engine.composer; const at = C.passes.indexOf(engine.grade); C.insertPass(pass, at < 0 ? C.passes.length : at); return () => C.removePass(pass); }

// ---------------------------------------------------------------- the shockwave / time stop
const ShockShader = {
  uniforms: { tDiffuse: { value: null }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uR: { value: 0 }, uK: { value: 0 }, uWhite: { value: 0 }, uAspect: { value: 1.78 }, uTime: { value: 0 }, uGray: { value: 0 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uC; uniform float uR, uK, uWhite, uAspect, uTime, uGray; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 d = vUv - uC; d.x *= uAspect; float r = length(d); vec2 dir = r > 1e-4 ? d / r : vec2(0.0);
    float w = 0.05 + uR * 0.04; float ring = exp(-pow((r - uR) / w, 2.0)) * uK;
    vec2 off = dir * ring * 0.045; off.x /= uAspect;
    vec3 c; c.r = texture2D(tDiffuse, vUv - off * 1.15).r; c.g = texture2D(tDiffuse, vUv - off).g; c.b = texture2D(tDiffuse, vUv - off * 0.85).b;
    float inside = max(uGray, smoothstep(uR + 0.01, uR - 0.06, r) * uK);
    float l = dot(c, vec3(0.299, 0.587, 0.114)); vec3 bw = vec3(clamp((pow(l, 1.1) - 0.5) * 1.35 + 0.5, 0.0, 1.0)); bw *= vec3(0.97, 0.99, 1.04);
    bw += (h(floor(vUv * 900.0) + floor(uTime * 24.0)) - 0.5) * 0.035; // the stillness has a grain
    c = mix(c, bw, inside);
    c += vec3(1.0, 0.96, 0.88) * ring * 0.55; // the bright front
    c = mix(c, vec3(1.0, 0.995, 0.97), clamp(uWhite, 0.0, 1.0));
    gl_FragColor = vec4(c, 1.0);
  }`,
};
export function shockPass(engine) {
  const pass = new ShaderPass(ShockShader); const rm = insertBeforeGrade(engine, pass); const u = pass.uniforms;
  return { pass, u, set({ r = u.uR.value, k = u.uK.value, white = u.uWhite.value, gray = u.uGray.value, c = null } = {}) { u.uR.value = r; u.uK.value = k; u.uWhite.value = white; u.uGray.value = gray; if (c) u.uC.value.copy(c); u.uAspect.value = engine.aspect; u.uTime.value = performance.now() / 1000; }, dispose() { rm(); pass.dispose?.(); } };
}

// ---------------------------------------------------------------- the fresco painter
const PaintShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1280, 720) }, uK: { value: 0 }, uTime: { value: 0 }, uSeed: { value: 3.7 } },
  vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uK, uTime, uSeed; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += n2(p) * a; p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  vec2 vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); vec2 o = vec2(h(i + g + uSeed), h(i + g + uSeed * 1.7)); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return vec2(d1, d2); }
  vec3 kuwa(vec2 uv){
    float R = max(2.0, floor(uRes.y / 260.0)); vec2 px = 1.0 / uRes; vec3 mean[4]; vec3 sq[4];
    for (int k = 0; k < 4; k++) { mean[k] = vec3(0.0); sq[k] = vec3(0.0); }
    for (int j = 0; j <= 3; j++) for (int i = 0; i <= 3; i++) {
      vec2 o = vec2(float(i), float(j)) * R / 3.0 * px;
      vec3 a = texture2D(tDiffuse, uv + vec2(-o.x, -o.y)).rgb; mean[0] += a; sq[0] += a * a;
      vec3 b = texture2D(tDiffuse, uv + vec2( o.x, -o.y)).rgb; mean[1] += b; sq[1] += b * b;
      vec3 c = texture2D(tDiffuse, uv + vec2(-o.x,  o.y)).rgb; mean[2] += c; sq[2] += c * c;
      vec3 d = texture2D(tDiffuse, uv + vec2( o.x,  o.y)).rgb; mean[3] += d; sq[3] += d * d;
    }
    vec3 best = vec3(0.0); float bv = 1e9;
    for (int k = 0; k < 4; k++) { vec3 m = mean[k] / 16.0; vec3 v = abs(sq[k] / 16.0 - m * m); float s = v.r + v.g + v.b; if (s < bv) { bv = s; best = m; } }
    return best;
  }
  void main(){
    vec3 src = texture2D(tDiffuse, vUv).rgb;
    // brush strokes: a flow field bends the sampling, the Kuwahara flattens it into painted dabs
    vec2 q = vUv * vec2(uRes.x / uRes.y, 1.0);
    float ang = fbm(q * 3.0 + uSeed) * 6.2831; vec2 flow = vec2(cos(ang), sin(ang));
    vec3 c = kuwa(vUv + flow * (n2(q * 60.0) - 0.5) * 2.0 / uRes);
    // fresco palette: lime-plaster lights, umber shadows, softened saturation, a warm ochre cast
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 0.8);
    c = mix(vec3(0.17, 0.12, 0.09), vec3(0.98, 0.94, 0.85), c);
    c *= vec3(1.03, 1.0, 0.94);
    // directional brush texture and plaster grain
    float stroke = n2(vec2(dot(q, flow) * 140.0, dot(q, vec2(-flow.y, flow.x)) * 22.0));
    c *= 0.95 + stroke * 0.09;
    c *= 0.965 + h(floor(vUv * uRes / 2.0)) * 0.05;
    c = mix(c, c * vec3(1.02, 0.99, 0.95), fbm(q * 7.0));
    // giornata seams (the day-patches of wet plaster) and craquelure cracks
    vec2 v1 = vor(q * 3.2 + vec2(fbm(q * 5.0) * 0.6)); float seam = smoothstep(0.035, 0.0, v1.y - v1.x);
    vec2 v2 = vor(q * 11.0 + fbm(q * 9.0)); float crack = smoothstep(0.03, 0.0, v2.y - v2.x) * smoothstep(0.42, 0.62, fbm(q * 2.4 + 3.0));
    float bigc = smoothstep(0.012, 0.0, abs(fbm(q * vec2(2.0, 5.0) + 7.0) - 0.5) - 0.0) * smoothstep(0.55, 0.7, fbm(q * 1.3));
    c *= 1.0 - seam * 0.12 - crack * 0.4 - bigc * 0.5;
    c += (crack + bigc) * 0.06 * vec3(1.0, 0.95, 0.85) * step(0.5, h(floor(vUv * uRes / 2.0) + 3.0)); // the lit lip of a crack
    // flaking: a few patches where the paint is gone to bare plaster
    float flake = smoothstep(0.74, 0.78, fbm(q * 4.0 + 19.0)); c = mix(c, vec3(0.86, 0.82, 0.74) * (0.95 + h(floor(vUv * uRes / 3.0)) * 0.08), flake * 0.85);
    // an aged, warm, darkened edge
    vec2 e = vUv - 0.5; c *= 1.0 - dot(e, e) * 0.55; c = mix(c, c * vec3(0.95, 0.86, 0.72), smoothstep(0.18, 0.5, dot(e, e)));
    gl_FragColor = vec4(mix(src, c, uK), 1.0);
  }`,
};
export function paintPass(engine) {
  const pass = new ShaderPass(PaintShader); const rm = insertBeforeGrade(engine, pass); const u = pass.uniforms;
  const res = () => engine.renderer.getDrawingBufferSize(u.uRes.value);
  return { pass, u, set(k) { u.uK.value = k; res(); u.uTime.value = performance.now() / 1000; }, dispose() { rm(); pass.dispose?.(); } };
}

// ---------------------------------------------------------------- big crisp 3D pixel lettering
function traceMask(m) { // exact pixel outlines of a glyph mask -> [{ pts: [[x, y]...] (y up), area }]
  const x0 = -2, x1 = m.w + 3, y0 = m.top - 1, y1 = m.bot + 1; const on = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && m.on(x, y);
  const out = new Map(); const key = (x, y) => x + ',' + y; const addE = (ax, ay, bx, by) => { const k = key(ax, ay); (out.get(k) || out.set(k, []).get(k)).push([ax, ay, bx, by, false]); };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!on(x, y)) continue; if (!on(x, y - 1)) addE(x, y, x + 1, y); if (!on(x + 1, y)) addE(x + 1, y, x + 1, y + 1); if (!on(x, y + 1)) addE(x + 1, y + 1, x, y + 1); if (!on(x - 1, y)) addE(x, y + 1, x, y); }
  const loops = [];
  for (const list of out.values()) for (const e of list) {
    if (e[4]) continue; const pts = []; let cur = e;
    while (cur && !cur[4]) { cur[4] = true; pts.push([cur[0], cur[1]]); const nx = out.get(key(cur[2], cur[3])) || []; const dx = cur[2] - cur[0], dy = cur[3] - cur[1]; let best = null, bs = -9; for (const n of nx) { if (n[4]) continue; const ex = n[2] - n[0], ey = n[3] - n[1]; const turn = dx * ey - dy * ex; const s = turn > 0 ? 2 : turn === 0 ? 1 : 0; if (s > bs) { bs = s; best = n; } } cur = best; }
    const simp = pts.filter((p, i) => { const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length]; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0; }).map(([x, y]) => [x, -y]);
    let area = 0; for (let i = 0; i < simp.length; i++) { const a = simp[i], b = simp[(i + 1) % simp.length]; area += a[0] * b[1] - b[0] * a[1]; } if (simp.length >= 3) loops.push({ pts: simp, area: area / 2 });
  }
  return loops;
}
const inPoly = (p, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
function glyphShapes(loops) {
  const sgn = Math.sign(loops.reduce((s, l) => (Math.abs(l.area) > Math.abs(s) ? l.area : s), 0)) || 1; const outers = loops.filter((l) => Math.sign(l.area) === sgn), holes = loops.filter((l) => Math.sign(l.area) !== sgn);
  const shapes = outers.map((o) => ({ o, s: new THREE.Shape(o.pts.map(([x, y]) => new THREE.Vector2(x, y))) }));
  for (const h of holes) { const p = [h.pts[0][0] + 0.5 * Math.sign(h.area), h.pts[0][1]]; const host = shapes.filter((S) => inPoly(h.pts[0], S.o.pts) || inPoly(p, S.o.pts)).sort((a, b) => Math.abs(a.o.area) - Math.abs(b.o.area))[0]; if (host) host.s.holes.push(new THREE.Path(h.pts.map(([x, y]) => new THREE.Vector2(x, y)))); }
  return shapes.map((S) => S.s);
}
let GILT = null;
function giltMats() {
  if (GILT) return GILT;
  const tx = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = fn(x, y); g.fillRect(x, y, 1, 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const hsh = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5; return v - Math.floor(v); };
  const face = tx(16, 16, (x, y) => { const k = hsh(x, y); const band = (x + y * 2) % 7 === 0; return band ? '#fff0b0' : k > 0.9 ? '#ffe6a0' : k < 0.12 ? '#a8742a' : y % 4 === 0 ? '#e8b850' : '#d6a23e'; });
  const side = tx(16, 16, (x, y) => { const k = hsh(x + 3, y); return k > 0.85 ? '#8a5a22' : k < 0.2 ? '#4a2c10' : '#6a4218'; });
  GILT = { face: new THREE.MeshStandardMaterial({ map: face, metalness: 0.8, roughness: 0.32, color: 0xffffff, flatShading: true, envMapIntensity: 1.0 }), side: new THREE.MeshStandardMaterial({ map: side, metalness: 0.6, roughness: 0.5, flatShading: true, envMapIntensity: 0.8 }) };
  return GILT;
}
/** { group, letters: [{ g, ch, x }], width, height }: px = metres per font pixel; letters are centred on the group origin (baseline at y = 0) */
export function pixelTitle(text, { font = FONT.cap, px = 0.05, depth = 0.22, bevel = 0.018, tex = 2 } = {}) {
  const M = giltMats(); const group = new THREE.Group(); const letters = []; const total = measure(text, font);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]; if (ch === ' ') continue; const m = runMask(ch, font); const shapes = glyphShapes(traceMask(m)); if (!shapes.length) continue;
    const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 1, curveSegments: 1 });
    geo.scale(px, px, 1); geo.translate(0, 0, -depth / 2);
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / (16 / tex), uv.getY(k) / (16 / tex));
    const mesh = new THREE.Mesh(geo, [M.face, M.side]); mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new THREE.Group(); g.add(mesh); const x = (measure(text.slice(0, i), font) - total / 2) * px; g.position.x = x; group.add(g); letters.push({ g, ch, x, mesh });
  }
  return { group, letters, width: total * px, height: (font.cap || 33) * px };
}
