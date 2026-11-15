// THE ASTRAL SELECT (the LERFOLESE tower menu, "New"): the camera tilts up from the tower top into the sky, night
// falls and the sky becomes a hand-made PIXEL-ART cosmos. Every picture element is an art pixel on a fixed grid in the
// view's tangent plane (about 360 art rows, a GENTLE pixel-art look: an integer number of screen pixels each, crisp at
// native resolution; the rest of the game is not pixelated):
//   - deep space in three dithered tones, a diagonal MILKY WAY of stepped violet and dusty-rose bands cut by dark dust
//     lanes, two NEBULAE (teal and magenta, domain-warped, posterised to hand-picked 6-tone ramps), a little SPIRAL
//     GALAXY, a cratered CRESCENT MOON, shooting stars;
//   - pixel STARS on three layers (single-pixel dust, plus-shaped mid stars, big four-point sparkles) that twinkle in
//     steps; they appear cell by cell from the zenith down as night falls (a pixel reveal, not a fade);
//   - the CONSTELLATIONS (game/run.js STARTS): each a figure of pixel stars joined by dotted pixel lines. Hovering one
//     draws its lines in, brightens and enlarges its stars, warms a faint nebula halo behind it, and its name rises in
//     crisp forged starlight letters with one line of what it gives. Clicking zooms into it (the run then opens through
//     the galaxy transition).
//   const A = new Astral({ starts, aspect }); scene.add(A.group); A.frame(cameraPos, dir, fov); A.update(dt, t, cam, renderer)
//   A.pick(ndc, cam) -> index | -1; A.hover = i; A.fade (0..1, drives the reveal)
import * as THREE from 'three';
import { forgedText } from '../ui3d/text3d.js';
import { Spring } from '../core/tween.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const R_DOME = 1500, R_STAR = 1000;

// ---------------------------------------------------------------- the constellation figures (local units ~ 0.1 tan; x right, y up)
export const FIGURES = {
  apple: { col: '#ff9a7a', stars: [[0, 0.62, 2], [-0.6, 0.95, 1], [-1.02, 0.38, 2], [-0.8, -0.55, 1], [0, -0.92, 3], [0.8, -0.55, 1], [1.02, 0.38, 2], [0.6, 0.95, 1], [0.12, 1.35, 1], [0.62, 1.52, 2]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [0, 8], [8, 9]] },
  pendulum: { col: '#ffd27a', stars: [[-0.75, 1.2, 1], [0, 1.2, 2], [0.75, 1.2, 1], [0.42, -0.62, 3], [-0.95, -0.28, 1], [-0.55, -0.66, 1], [0, -0.82, 1]],
    edges: [[0, 1], [1, 2], [1, 3], [4, 5], [5, 6], [6, 3]] },
  prism: { col: '#b8e0ff', stars: [[-0.78, -0.62, 2], [0.78, -0.62, 2], [0, 0.78, 3], [-1.7, 0.18, 1], [-0.36, 0.06, 1], [0.38, 0.0, 1], [1.55, 0.55, 2, '#ff6a5a'], [1.7, 0.08, 2, '#8aff8a'], [1.55, -0.4, 2, '#a07aff']],
    edges: [[0, 1], [1, 2], [2, 0], [3, 4], [5, 6], [5, 7], [5, 8]] },
  comet: { col: '#9af0ff', stars: [[0.95, 0.72, 3], [0.42, 0.42, 1], [-0.08, 0.16, 2], [-0.6, 0.0, 1], [-1.12, -0.06, 1], [-1.6, -0.22, 1], [0.3, 0.68, 1], [-0.32, 0.6, 1], [-0.95, 0.52, 1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [6, 7], [7, 8]] },
  owl: { col: '#e0c8ff', stars: [[-0.38, 0.5, 2], [0.38, 0.5, 2], [-0.62, 1.05, 1], [0.62, 1.05, 1], [0, 0.18, 1], [-0.68, -0.3, 1], [0.68, -0.3, 1], [0, -0.95, 2], [-0.3, -0.62, 1], [0.3, -0.62, 1]],
    edges: [[2, 0], [0, 4], [4, 1], [1, 3], [0, 5], [5, 8], [8, 7], [7, 9], [9, 6], [6, 1]] },
};
// where each sits in the astral view (tan-space, fov 50, 16:9: x in about +-0.8, y in +-0.46)
const LAYOUT = { apple: [-0.56, 0.14, 0.12], pendulum: [-0.26, -0.12, 0.1], prism: [0.05, 0.2, 0.11], comet: [0.44, -0.2, 0.11], owl: [0.62, 0.2, 0.1] };

// ---------------------------------------------------------------- the pixel-art cosmos (a dome around the camera, art pixels in the view's tangent plane)
const DOME_FS = `
uniform vec3 uA; uniform vec3 uE1; uniform vec3 uE2; uniform float uArt; uniform float uFade; uniform float uTime; uniform vec4 uHov; uniform vec3 uHovCol; uniform vec4 uShoot;
varying vec3 vW;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float bayer(vec2 p){ p = mod(p, 4.0); int x = int(p.x), y = int(p.y); float b;
  if (y == 0) b = x == 0 ? 0.0 : x == 1 ? 8.0 : x == 2 ? 2.0 : 10.0; else if (y == 1) b = x == 0 ? 12.0 : x == 1 ? 4.0 : x == 2 ? 14.0 : 6.0;
  else if (y == 2) b = x == 0 ? 3.0 : x == 1 ? 11.0 : x == 2 ? 1.0 : 9.0; else b = x == 0 ? 15.0 : x == 1 ? 7.0 : x == 2 ? 13.0 : 5.0; return (b + 0.5) / 16.0; }
vec3 ramp(float l, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e, vec3 f){ return l < 1.0 ? a : l < 2.0 ? b : l < 3.0 ? c : l < 4.0 ? d : l < 5.0 ? e : f; }
// a stepped level with a 2-tone ordered dither only on the boundary band (classic hand pixelling)
float lev(float v, vec2 P, float n){ float x = v * n; float f = fract(x); return floor(x) + step(0.82, f) * step(bayer(P) * 0.18 + 0.82, f) ; }
void main(){
  vec3 d = normalize(vW - cameraPosition); float fd = dot(d, uA); if (fd < 0.08) { gl_FragColor = vec4(0.0); return; }
  vec2 p = vec2(dot(d, uE1), dot(d, uE2)) / fd; vec2 P = floor(p / uArt); vec2 q = (P + 0.5) * uArt; // one art pixel
  float el = d.y; float reveal = clamp((uFade * 1.35 - (1.0 - smoothstep(0.05, 0.95, el)) * 0.55 - h21(P * 0.37 + 2.0) * 0.35) / 0.25, 0.0, 1.0);
  if (reveal <= 0.0) { gl_FragColor = vec4(0.0); return; } reveal = step(0.5, reveal);
  vec2 g = q * 7.0; // the art's own scale
  // deep space: three tones, dithered
  float sp = fbm(g * 0.35 + 3.0) * 0.6 + (0.5 - q.y) * 0.25; vec3 col = mix(vec3(0.012, 0.01, 0.03), vec3(0.026, 0.02, 0.055), step(0.44, sp)); col = mix(col, vec3(0.04, 0.028, 0.075), step(0.6, sp));
  // the milky way: a diagonal band of stepped violet / dusty rose, cut by dark dust lanes
  float bandD = dot(q, normalize(vec2(0.55, -1.0))) - 0.05; float band = exp(-bandD * bandD * 34.0); vec2 w = vec2(fbm(g * 0.5 + vec2(uTime * 0.004, 0.0)), fbm(g * 0.5 + 7.0));
  float mw = band * (0.3 + 0.62 * fbm(g * 0.9 + w * 1.6)); float dust = smoothstep(0.52, 0.66, fbm(g * 1.6 + w * 2.2 + 11.0)) * band;
  float lm = lev(clamp(mw - dust * 0.55, 0.0, 1.0), P, 5.0); if (lm >= 1.0) col = ramp(lm, col, vec3(0.07, 0.045, 0.12), vec3(0.13, 0.07, 0.19), vec3(0.24, 0.12, 0.27), vec3(0.42, 0.25, 0.38), vec3(0.72, 0.55, 0.6));
  // nebulae: a teal one low left, a magenta one high right (domain-warped, posterised)
  { vec2 c1 = q - vec2(-0.42, -0.22); float n1 = exp(-dot(c1, c1) * 11.0) * 0.85 * smoothstep(0.38, 0.85, fbm(g * 0.8 + w * 2.0 + 21.0)); float l1 = lev(n1 * 1.3, P + 3.0, 5.0);
    if (l1 >= 1.0) col = mix(col, ramp(l1, col, vec3(0.02, 0.09, 0.11), vec3(0.03, 0.17, 0.19), vec3(0.06, 0.3, 0.3), vec3(0.18, 0.5, 0.45), vec3(0.55, 0.85, 0.72)), 0.7);
    vec2 c2 = q - vec2(0.48, 0.3); float n2 = exp(-dot(c2, c2) * 9.0) * 0.85 * smoothstep(0.36, 0.86, fbm(g * 0.7 + w.yx * 2.3 + 5.0)); float l2 = lev(n2 * 1.3, P + 7.0, 5.0);
    if (l2 >= 1.0) col = mix(col, ramp(l2, col, vec3(0.1, 0.02, 0.08), vec3(0.2, 0.04, 0.16), vec3(0.36, 0.08, 0.28), vec3(0.6, 0.2, 0.42), vec3(0.95, 0.6, 0.7)), 0.7); }
  // the hovered constellation's halo: a warm stepped glow of its colour
  { vec2 hc = q - uHov.xy; float hh = exp(-dot(hc, hc) / (uHov.z * uHov.z) * 1.4) * uHov.w * smoothstep(0.3, 0.75, fbm(g * 1.4 + w * 1.5 + 3.0 + uTime * 0.03)); float lh = lev(hh * 1.1, P + 5.0, 3.0); col += col * uHovCol * lh * 0.25; } // only lifts the gas already there (no disc)
  // a small spiral galaxy
  { vec2 gc = (q - vec2(-0.66, 0.32)) * vec2(1.0, 2.1); float ca = cos(0.6), sa = sin(0.6); gc = vec2(ca * gc.x - sa * gc.y, sa * gc.x + ca * gc.y); float r = length(gc) / 0.06;
    if (r < 1.6) { float a = atan(gc.y, gc.x) + uTime * 0.02; float arm = pow(0.5 + 0.5 * cos(2.0 * (a - log(r + 0.05) * 2.4)), 3.0); float gd = arm * exp(-r * 2.2) + exp(-r * 8.0) * 1.4; float lg = lev(clamp(gd, 0.0, 1.0), P, 5.0);
      if (lg >= 1.0) col = ramp(lg, col, vec3(0.16, 0.12, 0.26), vec3(0.32, 0.24, 0.42), vec3(0.58, 0.46, 0.6), vec3(0.86, 0.74, 0.7), vec3(1.0, 0.95, 0.85)); } }
  // a cratered crescent moon
  { vec2 mc = q - vec2(0.7, -0.3); float R = 0.05; float r1 = length(mc) / R, r2 = length(mc - vec2(-0.022, 0.012)) / R; if (r1 < 1.0) { if (r2 > 0.97) { float cr = fbm(mc * 90.0 + 4.0); float lm2 = 3.0 + step(0.6, r1) - step(0.62, cr) - step(0.9, r1) * 0.0; col = ramp(lm2, col, vec3(0.2, 0.18, 0.24), vec3(0.42, 0.38, 0.44), vec3(0.66, 0.62, 0.62), vec3(0.88, 0.85, 0.78), vec3(1.0, 0.98, 0.9)); } else col = vec3(0.02, 0.018, 0.04); } }
  // stars: single-pixel dust (denser in the band), plus-shaped mid stars, big four-point sparkles; twinkling in steps
  float tstep = floor(uTime * 4.0);
  { float hs = h21(P * 1.13 + 3.1); float dens = 0.991 - band * 0.025; if (hs > dens) { float tw = step(0.3, h21(P + tstep * 0.37)); vec3 sc = hs > 0.997 ? vec3(1.0, 0.86, 0.66) : hs > 0.994 ? vec3(0.7, 0.8, 1.0) : vec3(0.82, 0.82, 0.95); col = mix(col, sc * (0.55 + 0.45 * tw), 0.85); } }
  { vec2 cell = floor(P / 12.0); float hs = h21(cell + 17.0); if (hs > 0.8) { vec2 sp2 = cell * 12.0 + floor(vec2(h21(cell + 1.3), h21(cell + 7.7)) * 9.0) + 1.0; vec2 o = abs(P - sp2); float tw = step(0.25, h21(cell + tstep * 0.21));
      vec3 sc = hs > 0.9 ? vec3(1.0, 0.86, 0.6) : vec3(0.75, 0.86, 1.0); if (o.x + o.y < 0.5) col = sc * 1.4; else if ((o.x < 0.5 && o.y < 1.5) || (o.y < 0.5 && o.x < 1.5)) col = mix(col, sc, 0.6 + 0.3 * tw); } }
  { vec2 cell = floor(P / 44.0); float hs = h21(cell + 91.0); if (hs > 0.72) { vec2 sp3 = cell * 44.0 + floor(vec2(h21(cell + 2.1), h21(cell + 5.3)) * 34.0) + 4.0; vec2 o = abs(P - sp3); float tw = h21(cell + tstep * 0.13); float arm = 2.0 + floor(tw * 2.5);
      vec3 sc = hs > 0.85 ? vec3(1.0, 0.92, 0.72) : vec3(0.84, 0.92, 1.0); if (o.x + o.y < 0.5) col = vec3(1.6, 1.55, 1.45); else if ((o.x < 0.5 && o.y <= arm) || (o.y < 0.5 && o.x <= arm)) col = mix(col, sc * 1.2, 1.0 - max(o.x, o.y) / (arm + 1.0) * 0.6); else if (o.x < 1.5 && o.y < 1.5) col = mix(col, sc, 0.7); } }
  // a shooting star (uShoot: start xy in tan space, angle, progress)
  if (uShoot.w > 0.0 && uShoot.w < 1.0) { vec2 dir = vec2(cos(uShoot.z), sin(uShoot.z)); vec2 head = uShoot.xy + dir * uShoot.w * 0.5; vec2 o = q - head; float al = -dot(o, dir) / uArt; float pe = abs(dot(o, vec2(-dir.y, dir.x))) / uArt; float len = 22.0 * sin(uShoot.w * 3.14159);
    if (al >= 0.0 && al < len && pe < 0.75) { float k = 1.0 - al / len; col = mix(col, mix(vec3(0.55, 0.4, 0.7), vec3(1.6, 1.5, 1.3), step(0.6, k)), step(0.15, k)); } }
  gl_FragColor = vec4(col, reveal * clamp(uFade * 3.0, 0.0, 1.0) * smoothstep(0.0, 0.18, el));
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- pixel stars and dotted lines (points with a hand-pixelled sprite)
const PT_VS = `
attribute float aSize; attribute vec3 aCol; attribute float aGroup; attribute float aKind; attribute float aOrd; attribute float aSeed;
uniform float uPx; uniform float uHover; uniform float uHovT; uniform float uFade; uniform float uTime; uniform float uPick; uniform float uPickT;
varying vec3 vCol; varying float vSize; varying float vA; varying float vKind;
void main(){
  bool hv = abs(aGroup - uHover) < 0.5; bool pk = abs(aGroup - uPick) < 0.5; float tw = step(0.35, fract(sin(aSeed * 91.7 + floor(uTime * 3.0 + aSeed * 7.0) * 13.1) * 4375.5));
  float s = aSize; float a = 1.0; vec3 c = aCol;
  if (aKind < 0.5) { if (hv) s += 2.0 * step(0.2, uHovT); if (pk) s += 2.0 * step(0.3, uPickT); a = 0.75 + 0.25 * tw; if (hv || pk) { c = mix(c, vec3(1.0), 0.25) * 1.6; a = 1.0; } }
  else { float drawn = hv ? step(aOrd, uHovT * 1.2) : 0.0; float dotted = step(0.5, mod(aSeed, 2.0)); a = hv || pk ? max(drawn, pk ? 1.0 : 0.0) * 0.95 : 0.4 * dotted; c = hv || pk ? c * 1.25 : c * 0.8; }
  vCol = c; vA = a * uFade; vKind = aKind; vSize = s;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = s * uPx;
}`;
const PT_FS = `
varying vec3 vCol; varying float vSize; varying float vA; varying float vKind;
void main(){
  if (vA <= 0.01) discard; vec2 q = floor(gl_PointCoord * vSize); float c = floor(vSize * 0.5); vec2 o = abs(q - c); float k = 0.0;
  if (vKind > 0.5) k = 1.0; // a line dot: one art pixel
  else if (vSize < 1.5) k = 1.0;
  else if (vSize < 3.5) k = (o.x + o.y < 0.5) ? 1.0 : (o.x + o.y < 1.5 ? 0.6 : 0.0); // a plus
  else { float arm = c; if (o.x + o.y < 0.5) k = 1.25; else if (o.x < 0.5 || o.y < 0.5) k = 1.0 - max(o.x, o.y) / (arm + 1.0) * 0.7; else if (o.x < 1.5 && o.y < 1.5) k = 0.55; }
  if (k <= 0.0) discard; gl_FragColor = vec4(vCol * k, vA);
  #include <colorspace_fragment>
}`;

export class Astral {
  constructor({ starts = {} } = {}) {
    this.group = new THREE.Group(); this.group.name = 'astral'; this.fade = 0; this.hover = -1; this.pickIdx = -1; this.pickT = 0;
    const U = (this.U = { uA: { value: V(0, 1, 0) }, uE1: { value: V(1, 0, 0) }, uE2: { value: V(0, 0, -1) }, uArt: { value: 0.004 }, uFade: { value: 0 }, uTime: { value: 0 }, uHov: { value: new THREE.Vector4(0, 0, 0.1, 0) }, uHovCol: { value: new THREE.Color() }, uShoot: { value: new THREE.Vector4(0, 0, 0, -1) } });
    const dm = new THREE.ShaderMaterial({ uniforms: U, vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: DOME_FS, transparent: true, depthWrite: false, depthTest: true, side: THREE.BackSide, fog: false, toneMapped: false });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(R_DOME, 48, 24), dm); this.dome.frustumCulled = false; this.dome.renderOrder = -5; this.dome.userData.noInk = true; this.dome.userData.noAO = true; this.group.add(this.dome);
    this.ids = Object.keys(FIGURES).filter((k) => !Object.keys(starts).length || starts[k]); this.starts = starts; this.cons = [];
    this.PU = { uPx: { value: 3 }, uHover: { value: -1 }, uHovT: { value: 0 }, uFade: { value: 0 }, uTime: { value: 0 }, uPick: { value: -1 }, uPickT: { value: 0 } };
    this.pts = null; this.labels = new THREE.Group(); this.group.add(this.labels); this.hovT = new Spring(0, 5, 0.9);
    this.shootT = -1; this.nextShoot = 2;
  }
  /** lay the sky out for a view from `pos` looking along `dir` with vertical fov (deg) and aspect */
  frame(dir, fov, aspect) {
    const A = dir.clone().normalize(); const e1 = V().crossVectors(A, V(0, 1, 0)).normalize(); const e2 = V().crossVectors(e1, A).normalize();
    this.A = A; this.e1 = e1; this.e2 = e2; this.fov = fov; this.U.uA.value.copy(A); this.U.uE1.value.copy(e1); this.U.uE2.value.copy(e2);
    const sx = Math.min(1, aspect / (16 / 9)); const tanY = Math.tan((fov * Math.PI) / 360);
    if (this.pts) { this.group.remove(this.pts); this.pts.geometry.dispose(); } for (const c of this.cons) this.labels.remove(c.label);
    const P = [], S = [], Col = [], Gp = [], Kd = [], Ord = [], Sd = []; this.cons = []; const art = (2 * tanY) / 360;
    const dirAt = (u, v) => A.clone().addScaledVector(e1, u).addScaledVector(e2, v).normalize();
    this.ids.forEach((id, gi) => { const F = FIGURES[id]; const [cx, cy, sc0] = LAYOUT[id]; const sc = sc0 * (tanY / Math.tan((50 * Math.PI) / 360)); const ux = cx * sx * (tanY / Math.tan((50 * Math.PI) / 360)) * 1.0, vy = cy * (tanY / Math.tan((50 * Math.PI) / 360));
      const col = new THREE.Color(F.col); const pos2 = F.stars.map(([x, y]) => [ux + x * sc, vy + y * sc]);
      F.stars.forEach(([, , m, c2], si) => { const d = dirAt(...pos2[si]).multiplyScalar(R_STAR); P.push(d.x, d.y, d.z); S.push(m === 3 ? 9 : m === 2 ? 7 : 5); const cc = c2 ? new THREE.Color(c2) : new THREE.Color('#fff8ec').lerp(col, 0.35); Col.push(cc.r, cc.g, cc.b); Gp.push(gi); Kd.push(0); Ord.push(0); Sd.push(gi * 31 + si); });
      let total = 0; const segs = F.edges.map(([a, b]) => { const L = Math.hypot(pos2[b][0] - pos2[a][0], pos2[b][1] - pos2[a][1]); total += L; return L; }); let acc = 0;
      F.edges.forEach(([a, b], ei) => { const [x0, y0] = pos2[a], [x1, y1] = pos2[b]; const L = segs[ei]; const n = Math.max(2, Math.floor(L / art)); for (let k = 2; k < n - 1; k++) { const u = k / n; const d = dirAt(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u).multiplyScalar(R_STAR * 1.002); P.push(d.x, d.y, d.z); S.push(1); Col.push(col.r * 0.9, col.g * 0.9, col.b * 0.9); Gp.push(gi); Kd.push(1); Ord.push((acc + u * L) / total); Sd.push(k); } acc += L; });
      // bounding radius in tan space and the label (forged starlight letters + one line of what it gives)
      let rad = 0; for (const [x, y] of pos2) rad = Math.max(rad, Math.hypot(x - ux, y - vy)); rad += sc * 0.35;
      const S0 = this.starts[id] || {}; const label = new THREE.Group(); const name = forgedText(S0.name || id, { font: 'head', unit: 0.0084, depth: 3, style: 'silver', glow: 0.55, backing: true }); label.add(name);
      if (S0.blurb) { const sub = forgedText(S0.blurb, { font: 'body', unit: 0.0067, depth: 2, style: 'ivory', glow: 0.85, backing: true }); sub.position.y = -0.13; label.add(sub); }
      label.scale.setScalar(0.001); label.visible = false; label.traverse((o) => { o.userData.noInk = true; }); this.labels.add(label);
      this.cons.push({ id, gi, u: ux, v: vy, rad, col, label, ls: new Spring(0, 8, 0.7), name: S0.name || id }); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aSize', new THREE.Float32BufferAttribute(S, 1)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(Col, 3)); g.setAttribute('aGroup', new THREE.Float32BufferAttribute(Gp, 1)); g.setAttribute('aKind', new THREE.Float32BufferAttribute(Kd, 1)); g.setAttribute('aOrd', new THREE.Float32BufferAttribute(Ord, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(Sd, 1));
    this.pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.PU, vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); this.pts.frustumCulled = false; this.pts.renderOrder = 5; this.pts.userData.noInk = true; this.pts.userData.noAO = true; this.group.add(this.pts);
  }
  /** the constellation under the pointer (screen-space test against each figure's radius), or -1 */
  pick(ndc, cam) { if (this.fade < 0.9 || !this.A) return -1; let best = -1, bd = 1e9; for (const c of this.cons) { const d = this.A.clone().addScaledVector(this.e1, c.u).addScaledVector(this.e2, c.v).normalize().multiplyScalar(100).add(cam.position); const p = d.project(cam); const rr = (c.rad / Math.tan((cam.fov * Math.PI) / 360)); const dd = Math.hypot((p.x - ndc.x) * cam.aspect, p.y - ndc.y); if (dd < rr * 1.15 && dd < bd) { bd = dd; best = c.gi; } } return best; }
  centerDir(i) { const c = this.cons[i]; return this.A.clone().addScaledVector(this.e1, c.u).addScaledVector(this.e2, c.v).normalize(); }
  update(dt, t, cam, renderer) {
    this.group.position.copy(cam.position); const U = this.U; U.uTime.value = t; U.uFade.value = this.fade; this.PU.uTime.value = t;
    const bs = renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())); const px = Math.max(1, Math.round(bs.y / 360)); // gently pixel-art: about 360 art rows (2 device px at 720p, 3 at 1080p) this.PU.uPx.value = px; U.uArt.value = (2 * Math.tan((cam.fov * Math.PI) / 360)) / (bs.y / px);
    this.PU.uFade.value = Math.max(0, Math.min(1, (this.fade - 0.55) / 0.35));
    if (this.hover !== this._hv) { this._hv = this.hover; this.hovT.value = 0; this.hovT.target = this.hover >= 0 ? 1 : 0; } this.hovT.update(dt);
    this.PU.uHover.value = this.hover; this.PU.uHovT.value = Math.max(0, this.hovT.value); this.PU.uPick.value = this.pickIdx; if (this.pickIdx >= 0) this.pickT += dt; this.PU.uPickT.value = this.pickT;
    const hc = this.cons[this.hover >= 0 ? this.hover : this.pickIdx]; const hw = U.uHov.value; if (hc) { hw.x = hc.u; hw.y = hc.v; hw.z = hc.rad * 1.3; U.uHovCol.value.copy(hc.col); } hw.w += ((hc ? 1 : 0) - hw.w) * Math.min(1, dt * 4);
    for (const c of this.cons) { const on = (c.gi === this.hover || c.gi === this.pickIdx) && this.fade > 0.9; c.ls.target = on ? 1 : 0; c.ls.update(dt); const s = Math.max(0, c.ls.value); c.label.visible = s > 0.01; c.label.scale.setScalar(Math.max(0.001, s)); c.label.quaternion.copy(cam.quaternion); const below = c.v > -0.05; c.label.position.copy(this.A.clone().addScaledVector(this.e1, c.u).addScaledVector(this.e2, below ? c.v - c.rad - 0.035 + (1 - s) * 0.02 : c.v + c.rad + 0.075 - (1 - s) * 0.02).normalize().multiplyScalar(2.6)); }
    // shooting stars now and then
    this.nextShoot -= dt; if (this.fade > 0.9 && this.nextShoot < 0 && this.shootT < 0) { this.shootT = 0; this.nextShoot = 3 + Math.random() * 5; U.uShoot.value.set(-0.6 + Math.random() * 1.2, 0.25 + Math.random() * 0.2, -0.5 - Math.random() * 0.6 + (Math.random() < 0.4 ? -2 : 0), 0); }
    if (this.shootT >= 0) { this.shootT += dt / 1.0; U.uShoot.value.w = this.shootT; if (this.shootT >= 1) { this.shootT = -1; U.uShoot.value.w = -1; } }
    this.group.visible = this.fade > 0.001;
  }
  dispose() { this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
}
