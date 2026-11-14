// Deep space (the loading screen's backdrop): one smooth full-resolution pass (continuous coordinates on a virtual
// ~240-row layout grid that only sets the scale of things; no pixel blocks, no dithering), coloured through hand-picked
// 6-tone ramps blended smoothly:
//   - layered nebula gas, domain-warped: violet veils, teal streams, gold wisps lit by the nearby star, dark dust lanes;
//   - a slowly turning spiral galaxy (two log-spiral arms, dusty, a warm core);
//   - three parallax starfields (1 px dust stars, plus-shaped mid stars, big 4-point near stars) that twinkle;
//   - distant planets: a banded ringed gas giant with a moon, a small cratered teal world; dithered terminators lit by
//     the star; the ring passes in front of and behind the giant;
//   - the nearby star: a white-hot core, a stepped corona, diffraction spikes that breathe (its light rims the apple);
//   - shooting stars on demand (shoot()), streaking with a cooling tail.
// API: const bg = spaceBackdrop(); scene.add(bg.mesh); bg.update(dt, t, renderer, camOffset); bg.shoot(); bg.star (uv)
import * as THREE from 'three';

const rampU = (hexes) => hexes.map((h) => new THREE.Color(h));
const RAMPS = {
  vio: rampU(['#0a0618', '#1a0e36', '#2e1658', '#4c2478', '#74389a', '#a866b8']),
  tea: rampU(['#04121a', '#082a36', '#0e4852', '#16706e', '#2a9c8e', '#74d0b4']),
  gol: rampU(['#140a08', '#3a1c10', '#6e3a14', '#b0661e', '#e6a43a', '#ffe08a']),
  gal: rampU(['#0e0a20', '#2a2050', '#56427a', '#9a7894', '#e0bca0', '#fff4dc']),
  gas: rampU(['#1a0e10', '#4a2418', '#8a4a26', '#c27c3e', '#e8b070', '#f8e2b0']), // the giant's bands
  ice: rampU(['#08141e', '#123040', '#1e5260', '#2e7a80', '#58a8a0', '#a4dcc8']),
};

const FS = `
uniform float uTime; uniform vec2 uGrid; uniform vec2 uCam; uniform vec4 uShoot; uniform vec2 uStar; uniform float uFlare;
uniform vec3 uVio[6]; uniform vec3 uTea[6]; uniform vec3 uGol[6]; uniform vec3 uGal[6]; uniform vec3 uGas[6]; uniform vec3 uIce[6];
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float bayer(vec2 p){ p = mod(p, 4.0); int x = int(p.x), y = int(p.y); float b;
  if (y == 0) b = x == 0 ? 0.0 : x == 1 ? 8.0 : x == 2 ? 2.0 : 10.0; else if (y == 1) b = x == 0 ? 12.0 : x == 1 ? 4.0 : x == 2 ? 14.0 : 6.0;
  else if (y == 2) b = x == 0 ? 3.0 : x == 1 ? 11.0 : x == 2 ? 1.0 : 9.0; else b = x == 0 ? 15.0 : x == 1 ? 7.0 : x == 2 ? 13.0 : 5.0; return (b + 0.5) / 16.0; }
vec3 r6i(vec3 R[6], int i){ return i <= 0 ? R[0] : i == 1 ? R[1] : i == 2 ? R[2] : i == 3 ? R[3] : i == 4 ? R[4] : R[5]; }
vec3 r6(vec3 R[6], float l){ l = clamp(l, 0.0, 5.0); int i = int(floor(l)); return mix(r6i(R, i), r6i(R, i + 1), smoothstep(0.0, 1.0, fract(l))); } // smooth ramp
float lv(float d, float th){ return clamp(d, 0.0, 1.0) * 5.0; } // density -> continuous ramp level 0..5
void main(){
  vec2 P = vUv * uGrid; float th = 0.5; float asp = uGrid.x / uGrid.y; // continuous: full native resolution, no dithering
  vec3 col = vec3(0.004, 0.003, 0.01); float lvl = 0.0;
  // ---- far starfield (1 px dust stars), almost no parallax
  { vec2 q = (P + uCam * 0.06) * 3.0; vec2 ce = floor(q); float h = h21(ce * 1.13 + 3.1); if (h > 0.9965) { float tw = 0.5 + 0.5 * sin(uTime * (0.6 + h * 3.0) + h * 400.0); float b = h > 0.999 ? 0.6 : 0.34; vec2 so = fract(q) - 0.5; col += vec3(0.6, 0.62, 0.9) * b * (0.55 + 0.45 * tw) * exp(-dot(so, so) * 9.0); } }
  // ---- nebula (slow parallax)
  vec2 Pn = P + uCam * 0.18; vec2 uv = Pn / uGrid.y; vec2 q = uv * 2.6;
  vec2 w = vec2(fbm(q + vec2(0.0, uTime * 0.012)), fbm(q + vec2(5.2, 1.3) - uTime * 0.009));
  float band = exp(-pow((uv.y - 0.62 + (uv.x / asp - 0.5) * 0.7) * 2.3, 2.0));
  float dV = smoothstep(0.42, 0.92, fbm(q * 0.9 + w * 1.7 + vec2(2.0, 0.0))) * (0.35 + 0.85 * band);
  float dT = smoothstep(0.45, 0.95, fbm(q * 1.15 + w.yx * 2.0 + vec2(8.0, 3.0))) * (0.25 + 0.95 * exp(-pow((uv.y - 0.3 + (uv.x / asp - 0.6) * 0.3) * 2.6, 2.0)));
  vec2 sd = (vUv - uStar) * vec2(asp, 1.0); float near = exp(-dot(sd, sd) * 7.0);
  float dG = smoothstep(0.5, 0.95, fbm(q * 1.7 + w * 2.6 + vec2(-3.0, 7.0))) * (0.15 + 1.1 * near);
  float dust = smoothstep(0.58, 0.8, fbm(q * 2.3 + w * 3.2 + 11.0));
  float dm = max(dV, max(dT, dG)) * (1.0 - dust * 0.75);
  if (dm > 0.02) {
    float l = lv(dm, th); vec3 c;
    if (dG + (th - 0.5) * 0.12 > max(dV, dT)) c = r6(uGol, l); else if (dT + (th - 0.5) * 0.12 > dV) c = r6(uTea, l); else c = r6(uVio, l);
    col = mix(col, c, smoothstep(0.0, 1.2, l)); lvl = l;
  }
  // ---- the spiral galaxy, turning slowly
  { vec2 gc = vec2(0.2 * asp, 0.74); vec2 d = (uv - gc - vec2(0.0)) ; float ca = cos(0.5), sa = sin(0.5); d = vec2(ca * d.x - sa * d.y, sa * d.x + ca * d.y); d.y *= 2.3;
    float r = length(d) / 0.25; if (r < 1.6) { float a = atan(d.y, d.x) + uTime * 0.03; float arm = pow(0.5 + 0.5 * cos(2.0 * (a - log(r + 0.05) * 2.6)), 3.0);
      float gd = arm * exp(-r * 2.4) * (0.6 + 0.6 * fbm(d * 18.0 + 4.0)) + exp(-r * 9.0) * 1.3; gd *= 1.0 - smoothstep(1.1, 1.6, r);
      float l = lv(gd * 1.15, th); col = mix(col, r6(uGal, l), smoothstep(0.0, 1.5, l) * smoothstep(lvl - 1.5, lvl, l)); lvl = max(lvl, l); } }
  // ---- mid stars (plus shapes), medium parallax
  { vec2 q2 = P + uCam * 0.32; vec2 cell = floor(q2 / 10.0); float h = h21(cell + 17.0); if (h > 0.8) { vec2 sp = cell * 10.0 + 1.5 + vec2(h21(cell + 1.3), h21(cell + 7.7)) * 7.0; vec2 o = q2 - sp; float tw = 0.5 + 0.5 * sin(uTime * (0.8 + h * 2.4) + h * 60.0);
      vec3 sc = h > 0.9 ? vec3(1.0, 0.86, 0.6) : vec3(0.75, 0.85, 1.0); float core = exp(-dot(o, o) * 6.0); float spk = (exp(-abs(o.y) * 9.0) * exp(-abs(o.x) * 1.6) + exp(-abs(o.x) * 9.0) * exp(-abs(o.y) * 1.6)) * tw;
      col += sc * (core * 1.1 + spk * 0.35) * (lvl > 3.5 ? 0.7 : 1.0); } }
  // ---- planets (ring behind, giant, ring in front, moon, small world)
  { vec2 C = vec2(0.83 * uGrid.x, 0.22 * uGrid.y) - uCam * 0.45; float R = 0.13 * uGrid.y; vec2 d = (P + 0.5 - C) / R; vec3 L = normalize(vec3((uStar - vec2(0.83, 0.22)) * vec2(asp, 1.0), 0.35));
    float ca = cos(-0.36), sa = sin(-0.36); vec2 rp = vec2(ca * d.x - sa * d.y, sa * d.x + ca * d.y); float rr = length(vec2(rp.x, rp.y * 4.2)); float rd = dot(d, d);
    bool ring = rr > 1.32 && rr < 2.15 && abs(rr - 1.72) > 0.05 && abs(rr - 1.95) > 0.025; float ringL = lv(0.55 + 0.35 * sin(rr * 34.0) * 0.5 + 0.2 * (1.0 - abs(rr - 1.6)), th);
    vec3 ringC = r6(uGas, clamp(ringL, 1.0, 5.0)) * (0.85 + 0.15 * step(0.0, rp.x * L.x)); bool ringBack = ring && rp.y < 0.0;
    float ringA = smoothstep(1.32, 1.36, rr) * smoothstep(2.15, 2.11, rr); if (ringBack && rd > 1.0) col = mix(col, ringC, ringA);
    if (rd < 1.0) { vec3 n = vec3(d, sqrt(1.0 - rd)); float lat = d.y + 0.07 * sin(d.x * 5.0 + uTime * 0.05) + (fbm(vec2(d.x * 3.0 + uTime * 0.01, d.y * 22.0)) - 0.5) * 0.12;
      float bandI = floor(lat * 4.5 + 9.0); float bandK = mod(bandI, 3.0); float dif = max(0.0, dot(n, L)); float l = lv(dif * 0.95 + 0.06, th) - (bandK == 1.0 ? 1.0 : 0.0) + (bandK == 2.0 ? 0.6 : 0.0);
      col = mix(col, r6(uGas, clamp(l, 0.0, 5.0)), smoothstep(1.0, 0.97, rd)); col = mix(col, vec3(1.0, 0.86, 0.6), smoothstep(0.82, 0.97, rd) * smoothstep(0.2, 0.5, dif) * 0.35); // atmosphere rim on the lit limb
    }
    if (ring && rp.y >= 0.0) col = mix(col, ringC, ringA);
    // its moon
    vec2 mc = C + vec2(-1.9, -1.1) * R; vec2 md = (P + 0.5 - mc) / (R * 0.16); float mr = dot(md, md); if (mr < 1.0) { vec3 n = vec3(md, sqrt(1.0 - mr)); float l = lv(max(0.0, dot(n, L)) * 0.9 + 0.08, th); col = mix(col, r6(uGal, clamp(l, 0.0, 4.0)), smoothstep(1.0, 0.9, mr)); } }
  { vec2 C = vec2(0.09 * uGrid.x, 0.2 * uGrid.y) - uCam * 0.38; float R = 0.045 * uGrid.y; vec2 d = (P + 0.5 - C) / R; float rd = dot(d, d);
    if (rd < 1.0) { vec3 n = vec3(d, sqrt(1.0 - rd)); vec3 L = normalize(vec3((uStar - vec2(0.09, 0.2)) * vec2(asp, 1.0), 0.25)); float cr = fbm(d * 3.5 + 2.0); float l = lv(max(0.0, dot(n, L)) * 0.95 + 0.05, th) - (cr > 0.62 ? 1.0 : 0.0) + (cr < 0.3 ? 0.5 : 0.0); col = mix(col, r6(uIce, clamp(l, 0.0, 5.0)), smoothstep(1.0, 0.95, rd)); } }
  // ---- near stars (4-point), strong parallax
  { vec2 q3 = P + uCam * 0.7; vec2 cell = floor(q3 / 36.0); float h = h21(cell + 91.0); if (h > 0.7) { vec2 sp = cell * 36.0 + 5.0 + vec2(h21(cell + 2.1), h21(cell + 5.3)) * 26.0; vec2 o = abs(q3 - sp);
      float tw = 0.5 + 0.5 * sin(uTime * (1.0 + h * 1.7) + h * 33.0); vec3 sc = h > 0.85 ? vec3(1.0, 0.9, 0.7) : vec3(0.82, 0.9, 1.0); float arm = 1.5 + tw * 2.5;
      col += sc * (exp(-dot(o, o) * 3.0) * 1.4 + (exp(-o.y * 7.0) * smoothstep(arm, 0.0, o.x) + exp(-o.x * 7.0) * smoothstep(arm, 0.0, o.y)) * 0.8); } }
  // ---- the nearby star: core, stepped corona, breathing diffraction spikes
  { vec2 C = uStar * uGrid; vec2 o = P - C; float r = length(o); float br = 1.0 + uFlare * 2.0;
    float glow = exp(-r * 0.09) * 0.85 * br; float l = lv(glow, th); col = mix(col, r6(uGol, l), smoothstep(1.0, 2.5, l) * 0.85);
    float sl = (18.0 + 6.0 * sin(uTime * 1.3)) * br; float ax = abs(o.x), ay = abs(o.y);
    col += mix(vec3(1.0, 0.82, 0.5), vec3(1.6, 1.5, 1.3), 0.5) * (exp(-ay * 4.0) * smoothstep(sl, 0.0, ax) + exp(-ax * 4.0) * smoothstep(sl, 0.0, ay)) * 0.9;
    col += vec3(1.2, 1.0, 0.75) * exp(-abs(ax - ay) * 5.0) * smoothstep(sl * 0.4, 0.0, max(ax, ay)) * 0.4;
    col = mix(col, vec3(1.8, 1.5, 1.0), smoothstep(4.5, 3.0, r)); col = mix(col, vec3(2.4, 2.3, 2.1), smoothstep(2.6, 1.6, r)); }
  // ---- a shooting star (uShoot: start x, y in art px, angle, progress 0..1)
  if (uShoot.w > 0.0 && uShoot.w < 1.0) { vec2 dir = vec2(cos(uShoot.z), sin(uShoot.z)); vec2 head = uShoot.xy + dir * uShoot.w * uGrid.y * 0.55; vec2 o = P - head; float al = -dot(o, dir); float pe = abs(dot(o, vec2(-dir.y, dir.x)));
    float len = 26.0 * sin(uShoot.w * 3.14159); if (al >= 0.0 && al < len) { float k = 1.0 - al / len; col += mix(vec3(0.5, 0.36, 0.6), vec3(2.0, 1.9, 1.7), k * k) * exp(-pe * pe * 6.0) * k; } }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function spaceBackdrop() {
  const U = { uTime: { value: 0 }, uGrid: { value: new THREE.Vector2(400, 225) }, uCam: { value: new THREE.Vector2() }, uShoot: { value: new THREE.Vector4(0, 0, 0, -1) }, uStar: { value: new THREE.Vector2(0.77, 0.78) }, uFlare: { value: 0 } };
  for (const [k, r] of Object.entries(RAMPS)) U['u' + k[0].toUpperCase() + k.slice(1)] = { value: r };
  const mat = new THREE.ShaderMaterial({ uniforms: U, fragmentShader: FS, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); mesh.frustumCulled = false; mesh.renderOrder = -100; mesh.userData.noInk = true; mesh.userData.noAO = true;
  const sz = new THREE.Vector2(); let shootT = -1, nextShoot = 2.5;
  const api = {
    mesh, U, px: 3,
    /** art pixel size k (screen px per art px) chosen so the art grid is ~240 rows and k is an integer */
    update(dt, t, renderer, cam = null) {
      renderer.getDrawingBufferSize(sz); const k = Math.max(2, Math.round(sz.y / 240)); api.px = k; U.uGrid.value.set(Math.floor(sz.x / k), Math.floor(sz.y / k)); U.uTime.value = t;
      // keep vUv on whole art pixels: the quad covers the buffer exactly when sz is a multiple of k; otherwise stretch slightly (still hard-edged)
      if (cam) U.uCam.value.set(cam.x, cam.y);
      nextShoot -= dt; if (nextShoot < 0 && shootT < 0) { shootT = 0; nextShoot = 3.5 + Math.random() * 5; const g = U.uGrid.value; U.uShoot.value.set(g.x * (0.15 + Math.random() * 0.6), g.y * (0.75 + Math.random() * 0.2), -0.35 - Math.random() * 0.5 + (Math.random() < 0.3 ? -2.2 : 0), 0); }
      if (shootT >= 0) { shootT += dt / 1.1; U.uShoot.value.w = shootT; if (shootT >= 1) { shootT = -1; U.uShoot.value.w = -1; } }
    },
    shoot() { nextShoot = 0; },
  };
  return api;
}
