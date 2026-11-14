// Renderer + post FX (bloom, tilt-shift diorama blur, film grade) + UI overlay layer + transition overlay + main loop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { InkPass } from './ink.js';
import '../gfx/lowpoly.js'; // realistic Lambert light on every toon material (no cel bands)
import { tweens } from './tween.js';
import { clamp, damp } from './util.js';

const TiltShiftShader = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: 0.45 }, uWidth: { value: 0.16 }, uFeather: { value: 0.32 }, uAmount: { value: 2.6 }, uTop: { value: 1.0 }, uBottom: { value: 0.8 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir; uniform vec2 uRes; uniform float uFocus, uWidth, uFeather, uAmount, uTop, uBottom; varying vec2 vUv;
  void main(){
    float d = vUv.y - uFocus; float side = d > 0.0 ? uTop : uBottom;
    float r = uAmount * side * smoothstep(uWidth, uWidth + uFeather, abs(d));
    if (r < 0.05) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
    vec2 stepv = uDir / uRes * r;
    vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
    c += texture2D(tDiffuse, vUv + stepv * 1.3846153846) * 0.3162162162;
    c += texture2D(tDiffuse, vUv - stepv * 1.3846153846) * 0.3162162162;
    c += texture2D(tDiffuse, vUv + stepv * 3.2307692308) * 0.0702702703;
    c += texture2D(tDiffuse, vUv - stepv * 3.2307692308) * 0.0702702703;
    gl_FragColor = c;
  }`,
};

// Camera motion blur: every pixel's world position (from depth, or a mid-distance plane when no depth is available) is
// reprojected with last frame's view-projection; the frame is smeared along that screen velocity (8 taps, clamped). A
// still camera gives zero velocity, so the image stays exactly as crisp as before.
const MotionBlurShader = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uHasDepth: { value: 0 }, uInvVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() }, uStrength: { value: 0.5 }, uMax: { value: 0.035 }, uNear: { value: 0.1 }, uFar: { value: 400 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tDepth; uniform float uHasDepth, uStrength, uMax; uniform mat4 uInvVP, uPrevVP; varying vec2 vUv;
  void main(){
    float d = uHasDepth > 0.5 ? texture2D(tDepth, vUv).x : 0.985; d = min(d, 0.9995);
    vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); wp /= wp.w; vec4 pp = uPrevVP * wp; pp /= pp.w;
    vec2 vel = (vUv - (pp.xy * 0.5 + 0.5)) * uStrength; float L = length(vel); if (L > uMax) vel *= uMax / L;
    vec4 c = texture2D(tDiffuse, vUv); if (L < 0.0006) { gl_FragColor = c; return; }
    vec4 acc = c; for (int i = 1; i < 8; i++) { float f = float(i) / 7.0 - 0.5; acc += texture2D(tDiffuse, vUv + vel * f); } gl_FragColor = acc / 8.0;
  }`,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uLift: { value: new THREE.Vector3(0.015, 0.0, 0.035) }, uGain: { value: new THREE.Vector3(1.04, 1.0, 0.95) },
    uVignette: { value: 0.42 }, uVigColor: { value: new THREE.Color(0x1a0f24) }, uGrain: { value: 0.045 }, uCA: { value: 0.0016 },
    uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 1, 1) }, uWarmth: { value: 0.0 },
    uGamma: { value: new THREE.Vector3(1, 1, 1) }, uRolloff: { value: 0.5 }, uToe: { value: 0.02 },
    uHarmony: { value: 0.0 }, uHueLight: { value: 0.1 }, uHueShadow: { value: 0.7 }, uSatTarget: { value: 0.42 }, uSatPull: { value: 0.0 },
    uVib: { value: 0.3 }, uSel: { value: new THREE.Vector3(0.15, 0.1, 0.12) },
    uRipC: { value: new THREE.Vector2(0.5, 0.5) }, uRipR: { value: 0 }, uRipK: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uSat, uContrast, uVignette, uGrain, uCA, uFlash, uWarmth, uRolloff, uToe, uHarmony, uHueLight, uHueShadow, uSatTarget, uSatPull, uVib; uniform vec3 uSel; uniform vec3 uLift, uGain, uGamma, uVigColor, uFlashColor; uniform vec2 uRes; uniform vec2 uRipC; uniform float uRipR, uRipK; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x); }
  vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
  void main(){
    vec2 cc = vUv - 0.5; float dist = length(cc);
    vec2 off = cc * dist * uCA * 8.0;
    // a time ripple (the golden apple lets time go): a ring that refracts the frame as it races outward
    vec2 uv0 = vUv; float ring = 0.0; if (uRipK > 0.0) { float asp = uRes.x / max(uRes.y, 1.0); vec2 rd = (vUv - uRipC) * vec2(asp, 1.0); float rr = length(rd); ring = exp(-pow((rr - uRipR) * 14.0, 2.0)) * uRipK; uv0 -= (rd / max(rr, 1e-4)) * ring * 0.022 / vec2(asp, 1.0); }
    vec3 col; col.r = texture2D(tDiffuse, uv0 + off).r; col.g = texture2D(tDiffuse, uv0).g; col.b = texture2D(tDiffuse, uv0 - off).b; col += vec3(1.0, 0.86, 0.5) * ring * 0.12;
    // camcorder grade (from R.O.O.M.): highlight roll-off, lift/gamma/gain, a soft toe that keeps blacks velvety
    col = mix(col, col / (1.0 + col * 0.35) * 1.35, uRolloff);
    col = col * uGain + uLift * (1.0 - col);
    col = pow(max(col, 0.0), 1.0 / max(uGamma, vec3(0.01)));
    col = max(col, 0.0); col = col + uToe * (1.0 - col) * exp(-col * 24.0);
    float l = dot(col, vec3(0.299,0.587,0.114));
    col = mix(vec3(l), col, uSat);
    col = (col - 0.5) * uContrast + 0.5;
    // rich but natural colour: vibrance lifts the duller colours most, deep greens / golds / skies get a selective boost,
    // skin tones (orange hues at mid saturation) are protected from both
    { vec3 hv = rgb2hsv(clamp(col, 0.0, 1.0)); float skin = (1.0 - smoothstep(0.0, 0.05, abs(hv.x - 0.065))) * smoothstep(0.12, 0.28, hv.y) * (1.0 - smoothstep(0.6, 0.85, hv.y));
      float sel = uSel.x * (1.0 - smoothstep(0.0, 0.1, abs(hv.x - 0.3))) + uSel.y * (1.0 - smoothstep(0.0, 0.045, abs(hv.x - 0.125))) + uSel.z * (1.0 - smoothstep(0.0, 0.08, abs(hv.x - 0.585)));
      hv.y = clamp(hv.y * (1.0 + (uVib * (1.0 - hv.y) + sel) * (1.0 - skin * 0.85)), 0.0, 1.0); col = hsv2rgb(hv); }
    // split toning: warm highlights, cool-violet shadows
    col += (smoothstep(0.45, 1.0, l) * vec3(0.03, 0.012, -0.02) + (1.0 - smoothstep(0.0, 0.45, l)) * vec3(-0.01, -0.004, 0.025)) * (1.0 + uWarmth);
    // painterly colour harmony: every hue drifts toward one shared palette (warm key light, cool shadow), saturation evened out
    if (uHarmony > 0.0) { vec3 h = rgb2hsv(clamp(col, 0.0, 1.0)); float target = mix(uHueShadow, uHueLight, smoothstep(0.18, 0.75, h.z)); float dh = target - h.x; dh -= floor(dh + 0.5); h.x = fract(h.x + dh * uHarmony * (0.3 + 0.7 * h.y)); h.y = mix(h.y, min(h.y, uSatTarget), uSatPull); col = hsv2rgb(h); }
    float vig = smoothstep(0.85, 0.18, dist * (1.0 + uVignette * 0.6));
    col = mix(uVigColor, col, mix(1.0, vig, uVignette * 1.4));
    float g = hash(vUv * uRes + fract(uTime * 7.13) * 91.7) - 0.5;
    col += g * uGrain * (1.0 - l * 0.5);
    col += (hash(vUv * uRes * 1.37 + 3.1) - 0.5) / 255.0;
    col = mix(col, uFlashColor, uFlash);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`,
};

// Crepuscular sun rays: radial light scattering from the bright sky around the sun; dark occluders (trees, figures) cut shafts
const RaysShader = {
  uniforms: { tDiffuse: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.7) }, uAspect: { value: 1.7 }, uStrength: { value: 0.35 }, uDecay: { value: 0.955 }, uDensity: { value: 0.85 }, uThresh: { value: 0.85 }, uTint: { value: new THREE.Color(0xffd6a0) }, uFade: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uAspect, uStrength, uDecay, uDensity, uThresh, uFade; uniform vec3 uTint; varying vec2 vUv;
  void main(){
    vec4 base = texture2D(tDiffuse, vUv);
    vec2 delta = (vUv - uSun) * uDensity / 40.0; vec2 uv = vUv; float illum = 1.0; vec3 acc = vec3(0.0);
    for (int i = 0; i < 40; i++) { uv -= delta; vec2 cuv = clamp(uv, 0.001, 0.999); vec3 s = texture2D(tDiffuse, cuv).rgb; float l = dot(s, vec3(0.299, 0.587, 0.114)); acc += s * smoothstep(uThresh, uThresh + 0.6, l) * (1.0 - smoothstep(0.04, 0.22, length((cuv - uSun) * vec2(uAspect, 1.0)))) * illum; illum *= uDecay; }
    float fall = 1.0 - smoothstep(0.05, 1.25, length((vUv - uSun) * vec2(uAspect, 1.0)));
    gl_FragColor = vec4(base.rgb + acc / 40.0 * uTint * uStrength * fall * uFade * 6.0, base.a);
  }`,
};

// Scene-change transitions (engine.wipe): one smooth full-resolution pass (no pixel grid, no dithering).
//   style 'cloud'  : five painted cumulus banks (sculpted silhouettes, never blobs: flat bases, billowing towering tops
//                    from domain-warped ridged noise, torn wisps, sunlit rims, cool undersides) sweep across from
//                    alternate sides with parallax until the sky is full; on the way out they sail on across and away.
//   style 'galaxy' : the screen is swallowed from the edges by a turning spiral galaxy: fine stars stream down the arms
//                    into the vortex, violet / teal / rose nebula blooms, a golden apple-light core with soft glints, a
//                    glowing gold rim on the advancing edge (no radial blobs: the core is a turning bar of light).
//                    On the way out it unfurls from the centre outward.
// uT: 0 = clear .. 1 = fully covered; uPhase: 0 closing, 1 opening (the motion differs, the coverage is symmetric).
const WipeShader = {
  uniforms: { uT: { value: 0 }, uPhase: { value: 0 }, uStyle: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1.7 }, uRes: { value: new THREE.Vector2(1280, 720) }, uColor: { value: new THREE.Color(0x120d1c) }, uTime: { value: 0 }, uMode: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform float uT, uPhase, uStyle, uAspect, uTime, uMode; uniform vec2 uCenter, uRes; uniform vec3 uColor; varying vec2 vUv;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm5(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(1.7, 9.2); a *= 0.5; } return s; }
  float fbm3(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(1.7, 9.2); a *= 0.5; } return s / 0.875; }
  float bankTop(float u, float seed){ float r1 = 1.0 - abs(vn(vec2(u * 3.2 + seed, seed)) * 2.0 - 1.0), r2 = 1.0 - abs(vn(vec2(u * 7.5 + seed * 2.0, seed)) * 2.0 - 1.0); return 0.78 + 0.6 * r1 * r1 + 0.2 * r2; } // billows: ridged noise -> towering heads
  void main(){
    vec2 uv = vUv; float T = clamp(uT, 0.0, 1.0); vec2 q = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);
    if (uStyle < 0.5) {
      // ================= CLOUDS: painted cumulus BANKS (no blobs). Each bank is a sculpted silhouette: a flat base,
      // a billowing top profile (domain-warped ridged noise -> towering heads, shoulders and dips), a torn leading edge
      // and wisps. Shading follows the silhouette: the top's slope gives a normal (sunlit rims on the sun side), inner
      // billow folds come from warped noise, the underside cools to blue-violet above the flat base. Edges are crisp
      // (about a pixel of antialiasing), wisps are soft. Higher banks sit in front, so their flat bases overlap the
      // billowing tops below. Closing: banks sweep in from alternate sides; opening: they sail on across and away.
      float px = 1.5 / uRes.y; vec3 col = vec3(0.0); float alpha = 0.0; float hw = 0.5 * uAspect;
      for (int bi = 0; bi < 5; bi++) { float fb = float(bi); float dir = mod(fb, 2.0) < 0.5 ? 1.0 : -1.0; // banks enter from the left (+1) or right (-1)
        float base = -0.62 + fb * 0.255; float amp = 0.34 + 0.05 * sin(fb * 2.3); float seed = fb * 7.31 + 1.7; float par = 1.0 + fb * 0.12;
        float Ti = clamp(T * 1.35 - fb * 0.07, 0.0, 1.0); float e = Ti * Ti * (3.0 - 2.0 * Ti);
        float xs = q.x * dir + uTime * 0.01 * par; // bank space: x grows in the direction of travel
        float span = hw + 0.75; float lead = uPhase < 0.5 ? -span + 2.0 * span * e : 1e3; float trail = uPhase < 0.5 ? -1e3 : -span + 2.0 * span * (1.0 - e);
        vec2 wq = vec2(xs * 1.6 + seed, q.y * 1.6); vec2 warp = vec2(fbm3(wq * 1.3 + 3.0), fbm3(wq * 1.3 + 8.0)) - 0.5;
        float u = xs + warp.x * 0.12 - uTime * 0.012 * par; // the silhouette drifts slowly
        float top = base + amp * bankTop(u, seed) + warp.y * 0.05;
        float y = q.y; float dTop = top - y; float dBase = y - base;
        float frontE = lead - xs + (fbm3(vec2(y * 5.0 + seed, uTime * 0.2)) - 0.5) * 0.16; float backE = xs - trail + (fbm3(vec2(y * 5.0 - seed, uTime * 0.2)) - 0.5) * 0.16;
        float inside = min(min(dTop, dBase * 3.0), min(frontE, backE) * 0.6);
        // torn wisps beyond the top and the leading edge: stretched noise, soft
        float wisp = smoothstep(0.55, 0.85, fbm5(vec2(u * 9.0, y * 26.0) + seed)) * smoothstep(0.06, 0.0, -dTop) * step(dBase, 1.0) * smoothstep(-0.02, 0.05, min(frontE, backE));
        float a = smoothstep(0.0, px, inside); a = max(a, wisp * 0.55); if (a <= 0.002) continue;
        // shading: the top's slope gives a normal near the rim; inner billow folds deeper in; cool underside near the base
        float slope = amp * (bankTop(u + 0.01, seed) - bankTop(u - 0.01, seed)) / 0.02 * dir;
        vec3 nTop = normalize(vec3(-slope * 0.6, 1.0, 0.35)); float fold = fbm5(vec2(u * 4.0, y * 5.5) + warp * 2.0 + seed); vec3 nIn = normalize(vec3((fold - 0.5) * 1.4, 0.55 - smoothstep(0.0, 0.2, dTop) * 0.2, 0.8));
        vec3 n = normalize(mix(nTop, nIn, smoothstep(0.0, 0.07, dTop))); vec3 L = normalize(vec3(-0.55, 0.7, 0.45)); float dif = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
        float under = 1.0 - smoothstep(0.0, 0.16, dBase); float hgt = clamp((y - base) / max(0.05, amp), 0.0, 1.0);
        vec3 shadow = mix(vec3(0.27, 0.25, 0.42), vec3(0.47, 0.39, 0.55), hgt); vec3 litC = mix(vec3(0.95, 0.82, 0.8), vec3(1.0, 0.94, 0.86), hgt);
        vec3 c = mix(shadow, litC, smoothstep(0.25, 0.85, dif)); c = mix(c, vec3(0.3, 0.32, 0.52), under * 0.75); // cool flat underside
        c += vec3(1.0, 0.72, 0.4) * smoothstep(0.02, 0.0, dTop) * smoothstep(0.55, 0.9, dif) * 0.8; // the sunlit rim
        c *= 0.82 + 0.18 * (fb / 4.0); c = mix(c, vec3(0.5, 0.42, 0.6), (1.0 - fb / 4.0) * 0.12); // aerial perspective: lower banks a touch hazier
        col = mix(col, c, a); alpha = a + alpha * (1.0 - a); }
      if (T > 0.985) { col = mix(vec3(0.34, 0.3, 0.46), col, alpha); alpha = 1.0; }
      if (alpha < 0.003) discard;
      gl_FragColor = vec4(col, alpha);
    } else {
      // ================= GALAXY
      vec2 c = vec2((uCenter.x - 0.5) * uAspect, uCenter.y - 0.5); vec2 p = q - c; float r = length(p) + 1e-4; float a = atan(p.y, p.x); float R = r / (0.5 * length(vec2(uAspect, 1.0)));
      float spin = uTime * 0.9 + (uPhase < 0.5 ? T : 2.0 - T) * 3.5; float s = a / 6.2832 + log(r) * 0.55 - spin * 0.16;
      float arms = 0.5 + 0.5 * cos(6.2832 * 2.0 * s); float v = R + (arms - 0.5) * 0.3 + (fbm3(vec2(s * 6.0, r * 5.0)) - 0.5) * 0.2;
      float thr = uPhase < 0.5 ? 1.08 - T * 1.42 : (1.0 - T) * 1.42 - 0.34; float rim = v - thr;
      float alpha = smoothstep(0.0, 0.03, rim); if (alpha <= 0.0) discard;
      vec2 w = vec2(cos(a + log(r) * 2.2 + spin * 0.5), sin(a + log(r) * 2.2 + spin * 0.5)) * r; float n1 = fbm5(w * 3.2 + 4.0), n2 = fbm5(w * 5.0 - uTime * 0.05 + 9.0), n3 = fbm3(w * 2.0 + 21.0);
      vec3 col = vec3(0.008, 0.006, 0.022);
      col += vec3(0.42, 0.18, 0.62) * smoothstep(0.35, 0.9, n1) * (0.45 + arms * 0.75);
      col += vec3(0.08, 0.5, 0.48) * smoothstep(0.5, 0.95, n2) * arms * 0.9;
      col += vec3(0.85, 0.3, 0.45) * smoothstep(0.6, 0.95, n3) * arms * 0.55;
      col *= 0.55 + 0.6 * arms;
      // fine stars: a static field plus streaks streaming down the arms into the vortex (log-polar cells)
      vec2 sp = gl_FragCoord.xy; vec2 sc = floor(sp / 3.0); float hs = h21(sc + floor(uTime * 0.5) * 0.0); vec2 sf = fract(sp / 3.0) - 0.5;
      if (hs > 0.992) col += vec3(0.85, 0.9, 1.0) * smoothstep(0.5, 0.0, length(sf)) * (0.6 + 0.4 * sin(uTime * 4.0 + hs * 90.0));
      vec2 lp = vec2(log(r) * 12.0 + uTime * 2.4, (a + uTime * 0.6 / max(0.15, r)) * 14.0); vec2 cell = floor(lp); float h = h21(cell); vec2 f = fract(lp);
      if (h > 0.9) { float tail = smoothstep(0.0, 1.0, f.x) * smoothstep(0.09, 0.0, abs(f.y - 0.5)); col += mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.9, 0.65), step(0.97, h)) * tail * 0.9; }
      // the golden apple-light core and soft glints
      vec2 bar = vec2(cos(spin * 0.8), sin(spin * 0.8)); float along = dot(p, bar), across = dot(p, vec2(-bar.y, bar.x)); // the core: a turning bar of golden light feeding the arms
      col += vec3(1.0, 0.72, 0.32) * exp(-across * across * 900.0 - along * along * 40.0) * 1.4 * (0.6 + 0.6 * fbm3(vec2(along * 20.0, uTime)));
      col += vec3(1.0, 0.62, 0.3) * exp(-r * 6.0) * pow(arms, 3.0) * 0.6;
      vec2 gl = floor(q * 14.0); float gh = h21(gl + 7.0); float tw = sin(uTime * 2.5 + gh * 40.0); if (gh > 0.975 && tw > 0.0) { vec2 fp = (fract(q * 14.0) - 0.5) * 2.0; float fl2 = exp(-abs(fp.x) * 22.0) * exp(-fp.y * fp.y * 3.0) + exp(-abs(fp.y) * 22.0) * exp(-fp.x * fp.x * 3.0) + exp(-dot(fp, fp) * 30.0); col += vec3(1.0, 0.82, 0.48) * fl2 * tw; }
      // the glowing gold rim on the advancing edge
      col += vec3(1.0, 0.75, 0.38) * exp(-rim * rim * 4000.0) * 1.6 + vec3(1.0, 0.55, 0.2) * exp(-rim * 30.0) * 0.25;
      gl_FragColor = vec4(col, alpha);
    }
  }`,
};

// render resolution: supersample on 1x screens, full device resolution (capped at 2x) on hi-dpi ones. Never below the
// screen's own resolution (user: no low-res look) - auto quality drops shadows/AO samples instead of pixels.
const hiRes = (q) => { const d = window.devicePixelRatio || 1; return q === 'low' ? Math.min(2, Math.max(1, d)) : q === 'medium' ? Math.min(2, Math.max(1.25, d)) : Math.min(2, Math.max(1.5, d)); };

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.autoClear = false;
    this.quality = 'high';
    const qp = new URLSearchParams(location.search).get('q'); this.testMode = qp === 'test';
    this.pixelRatio = this.testMode ? (Number(new URLSearchParams(location.search).get('pr')) || 0.5) : hiRes('high');
    this.fullFx = new URLSearchParams(location.search).get('fx') === '1'; // test mode with every effect on (lighting reviews)
    if (this.testMode) { r.shadowMap.enabled = this.fullFx; window.__noAutoQuality = true; }
    r.setPixelRatio(this.pixelRatio);

    this.world = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(40, 1, 0.1, 500) };
    this.ui = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(30, 1, 1, 200) };
    this.ui.camera.position.set(0, 0, 40);
    import('three/addons/environments/RoomEnvironment.js').then(({ RoomEnvironment }) => { const pm = new THREE.PMREMGenerator(r); this.ui.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.ui.scene.environmentIntensity = 0.8; });

    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.testMode ? 0 : 4 });
    this.composer = new EffectComposer(r, rt);
    this.renderPass = new RenderPass(this.world.scene, this.world.camera);
    this.composer.addPass(this.renderPass);
    // ground-truth AO (as in R.O.O.M.): contact shadows under feet, in roots, folds and ruins
    this.aoForced = new URLSearchParams(location.search).get('ao') === '1';
    this.gtao = new GTAOPass(this.world.scene, this.world.camera, size.x, size.y); this.gtao.output = GTAOPass.OUTPUT.Default; this.gtao.blendIntensity = 0.85;
    this.gtao.updateGtaoMaterial({ radius: 0.85, distanceExponent: 1.4, thickness: 1.2, scale: 1.05, samples: 16 }); this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    this.composer.addPass(this.gtao);
    this.gtao.enabled = this.aoForced || this.fullFx || !this.testMode;
    // anime/cartoon black ink lines on the 3D world
    this.inkForced = new URLSearchParams(location.search).get('ink') === '1';
    this.ink = new InkPass(this.world.scene, this.world.camera, size.x, size.y); this.ink.u.uThick.value = Math.max(0.75, this.pixelRatio * 0.55); this.composer.addPass(this.ink); // thin: about 1 screen px
    this.mblur = new ShaderPass(MotionBlurShader); this.composer.addPass(this.mblur); this._prevVP = new THREE.Matrix4(); this._vp = new THREE.Matrix4(); this._mbPos = new THREE.Vector3(); this._mbInit = false; this.motionBlur = 0.5; // subtle camera motion blur
    this.rays = new ShaderPass(RaysShader); this.rays.enabled = false; this.composer.addPass(this.rays);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    this.tiltH = new ShaderPass(TiltShiftShader); this.tiltV = new ShaderPass(TiltShiftShader);
    this.tiltV.uniforms.uDir.value.set(0, 1);
    this.composer.addPass(this.tiltH); this.composer.addPass(this.tiltV);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader); this.composer.addPass(this.grade);

    // transition overlay
    this.wipeScene = new THREE.Scene(); this.wipeCam = new THREE.Camera();
    this.wipeMat = new THREE.ShaderMaterial({ ...WipeShader, uniforms: THREE.UniformsUtils.clone(WipeShader.uniforms), depthTest: false, depthWrite: false, transparent: true });
    const wq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.wipeMat); wq.frustumCulled = false; this.wipeScene.add(wq);

    this.updaters = new Set(); this.time = 0; this.dt = 0; this.frame = 0;
    this.trauma = 0; this.shakeOffset = new THREE.Vector3(); this.hitStopT = 0; this.timeScale = 1;
    this.fx = { tilt: true }; this.uiVisible = true; this.paused = false;
    this.fps = 60; this._fpsAcc = 0; this._fpsN = 0; this._lowFrames = 0;
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(q) {
    this.quality = q;
    this.pixelRatio = hiRes(q); if (this.ink) this.ink.u.uThick.value = Math.max(0.75, this.pixelRatio * 0.55);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = q !== 'low'; // low quality: no shadow maps / GTAO; contact shadows and vertex AO still ground everything
    if (this.gtao) { this.gtao.enabled = this.aoForced || (q !== 'low' && this.fx?.ao !== false); this.gtao.updateGtaoMaterial({ samples: q === 'high' ? 16 : 8 }); this.gtao.updatePdMaterial({ samples: q === 'high' ? 12 : 6 }); }
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.tiltH.uniforms.uRes.value.copy(db); this.tiltV.uniforms.uRes.value.copy(db);
    this.grade.uniforms.uRes.value.copy(db);
    this.wipeMat.uniforms.uAspect.value = w / h;
    this.aspect = w / h;
    if (this.world.camera.isPerspectiveCamera) { this.world.camera.aspect = this.aspect; this.world.camera.updateProjectionMatrix(); }
    this.ui.camera.aspect = this.aspect; this.ui.camera.updateProjectionMatrix();
    // visible half-extents of the UI plane at z=0
    const d = this.ui.camera.position.z; const hh = Math.tan((this.ui.camera.fov * Math.PI) / 360) * d;
    this.uiH = hh; this.uiW = hh * this.aspect;
    for (const fn of this.updaters) fn.onResize?.(w, h);
    this.onResize?.(w, h);
  }

  setWorld(scene, camera) {
    this.world.scene = scene; this.world.camera = camera;
    this.renderPass.scene = scene; this.renderPass.camera = camera; this.gtao.scene = scene; this.gtao.camera = camera; this.ink.scene = scene; this.ink.camera = camera;
    if (camera.isPerspectiveCamera) { camera.aspect = this.aspect; camera.updateProjectionMatrix(); }
  }

  // fx: { bloom:[strength,radius,threshold], tilt:{focus,width,feather,amount,top,bottom} | false, grade:{sat,contrast,vignette,grain,warmth}, exposure }
  setFx(fx = {}) {
    this.fx = fx;
    const b = fx.bloom || [0.55, 0.55, 0.82];
    this.bloom.strength = b[0]; this.bloom.radius = b[1]; this.bloom.threshold = b[2]; this.bloom.enabled = !this.testMode || this.fullFx;
    const t = fx.tilt;
    this.tiltH.enabled = this.tiltV.enabled = false; // user: crisp, never blurry (tilt-shift off)
    if (t) for (const p of [this.tiltH, this.tiltV]) {
      const u = p.uniforms; u.uFocus.value = t.focus ?? 0.45; u.uWidth.value = t.width ?? 0.16; u.uFeather.value = t.feather ?? 0.3; u.uAmount.value = (t.amount ?? 2.4) * 0.55; u.uTop.value = t.top ?? 1; u.uBottom.value = t.bottom ?? 0.8;
    }
    const g = fx.grade || {}; const gu = this.grade.uniforms;
    this.gtao.enabled = fx.ao !== false && (this.aoForced || this.fullFx || (!this.testMode && this.quality !== 'low')); if (fx.ao && typeof fx.ao === 'number') this.gtao.blendIntensity = fx.ao; else this.gtao.blendIntensity = 0.85;
    gu.uGamma.value.set(...(g.gamma || [1, 1, 1])); gu.uRolloff.value = g.rolloff ?? 0.5; gu.uToe.value = g.toe ?? 0.02; gu.uCA.value = 0;
    const ik = fx.ink ?? {}; this.ink.enabled = fx.ink !== false && (!this.testMode || this.inkForced || this.fullFx); this.ink.u.uStrength.value = (ik.strength ?? 0.92) * 0.8; this.ink.u.uInk.value.set(ik.color ?? 0x0e0710); this.ink.u.uDepthK.value = ik.depth ?? 0.045; this.ink.u.uNormalK.value = ik.normal ?? 0.42; this.ink.u.uFade.value.set(...(ik.fade || [55, 140]));
    const ry = fx.rays; this.rays.enabled = !!(ry && ry.pos); if (ry) { const u = this.rays.uniforms; this.raysPos = ry.pos; u.uStrength.value = (ry.strength ?? 0.35) * 0.6; u.uTint.value.set(ry.tint ?? 0xffd6a0); u.uThresh.value = ry.thresh ?? 0.85; u.uDecay.value = ry.decay ?? 0.955; u.uDensity.value = ry.density ?? 0.85; }
    gu.uHarmony.value = g.harmony ?? 0; gu.uHueLight.value = g.hueLight ?? 0.1; gu.uHueShadow.value = g.hueShadow ?? 0.7; gu.uSatTarget.value = g.satMax ?? 0.42; gu.uSatPull.value = g.satPull ?? 0;
    gu.uVib.value = g.vib ?? 0.3; gu.uSel.value.set(...(g.sel || [0.15, 0.1, 0.12]));
    gu.uSat.value = g.sat ?? 1.08; gu.uContrast.value = g.contrast ?? 1.06; gu.uVignette.value = g.vignette ?? 0.42; gu.uGrain.value = Math.min(0.012, (g.grain ?? 0.04) * 0.3); gu.uWarmth.value = g.warmth ?? 0;
    if (g.lift) gu.uLift.value.set(...g.lift); else gu.uLift.value.set(0.015, 0.0, 0.035);
    if (g.gain) gu.uGain.value.set(...g.gain); else gu.uGain.value.set(1.04, 1.0, 0.95);
    this.renderer.toneMappingExposure = fx.exposure ?? 1.0;
  }

  add(updater) { this.updaters.add(updater); return updater; }
  remove(updater) { this.updaters.delete(updater); }

  shake(amount = 0.3) { this.trauma = clamp(this.trauma + amount * (window.__settings?.screenshake ?? 1), 0, 1); }
  hitStop(ms = 60) { this.hitStopT = Math.max(this.hitStopT, ms / 1000); }
  flash(amount = 0.6, color = 0xffffff, time = 0.25) {
    const u = this.grade.uniforms; u.uFlashColor.value.set(color); u.uFlash.value = amount;
    tweens.to(u.uFlash, { value: 0 }, time, { ease: 'outQuad' });
  }

  // scene-change transition: covers the screen (clouds or galaxy), runs fn, uncovers. center in 0..1 screen coords
  // (the galaxy's vortex). style: 'cloud' (default) | 'galaxy'; color / mode are kept for old callers (ignored).
  async wipe(fn, { center = [0.5, 0.5], color = 0x120d1c, dur = null, mode = 0, style = 'cloud' } = {}) {
    const u = this.wipeMat.uniforms; u.uCenter.value.set(center[0], 1 - center[1]); u.uColor.value.set(color); u.uMode.value = mode; u.uStyle.value = style === 'galaxy' ? 1 : 0;
    const d = dur ?? (style === 'galaxy' ? 0.85 : 0.72); this.wipeActive = true; this.wipeStyle = style;
    u.uPhase.value = 0; await tweens.to(u.uT, { value: 1 }, Math.max(0.6, d), { ease: 'inOutQuad' });
    if (fn) await fn();
    await tweens.wait(0.1);
    u.uPhase.value = 1; await tweens.to(u.uT, { value: 0 }, Math.max(0.65, d * 1.08), { ease: 'inOutQuad' });
    this.wipeActive = false;
  }

  start(update) {
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      let rdt = Math.min(0.05, (now - last) / 1000); last = now;
      this._fpsAcc += rdt; this._fpsN++;
      if (this._fpsAcc > 1) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; this._autoQuality(); }
      let dt = rdt * this.timeScale;
      if (this.hitStopT > 0) { this.hitStopT -= rdt; dt *= 0.05; }
      this.dt = dt; this.rdt = rdt; this.time += dt; this.frame++;
      tweens.update(dt);
      update?.(dt, this.time, rdt);
      for (const u of this.updaters) u.update?.(dt, this.time, rdt);
      this.render(rdt);
    };
    requestAnimationFrame(loop);
  }

  _autoQuality() {
    if (this.quality === 'low' || window.__noAutoQuality) return;
    if (this.fps < 30) this._lowFrames++; else this._lowFrames = Math.max(0, this._lowFrames - 1);
    if (this._lowFrames >= 4) { this._lowFrames = 0; this.setQuality(this.quality === 'high' ? 'medium' : 'low'); console.info('[engine] auto quality ->', this.quality); }
  }

  /** the golden apple's time ripple from a screen point (uv 0..1, y up) */
  ripple(uv = [0.5, 0.5], dur = 1.1, k = 1) { const u = this.grade.uniforms; u.uRipC.value.set(uv[0], uv[1]); u.uRipR.value = 0; u.uRipK.value = k; tweens.to(u.uRipR, { value: 1.7 }, dur, { ease: 'outQuad' }); tweens.to(u.uRipK, { value: 0 }, dur, { ease: 'inQuad' }); }
  render(rdt) {
    const cam = this.world.camera;
    // screen shake (trauma^2), applied temporarily to the world camera
    this.trauma = Math.max(0, this.trauma - rdt * 1.6);
    const s = this.trauma * this.trauma;
    const t = this.time * 38;
    this.shakeOffset.set(Math.sin(t * 1.1) * 0.35 * s, Math.sin(t * 1.7 + 2) * 0.28 * s, 0);
    cam.position.add(this.shakeOffset);
    const rz = cam.rotation.z; cam.rotation.z += Math.sin(t * 0.9 + 4) * 0.02 * s;
    this.grade.uniforms.uTime.value = this.time;
    if (this.rays.enabled && this.raysPos) { const p = this._sunP || (this._sunP = new THREE.Vector3()); p.copy(this.raysPos).project(cam); const u = this.rays.uniforms; u.uSun.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5); u.uAspect.value = this.aspect; u.uFade.value = p.z > 1 ? 0 : 1 - Math.min(1, Math.max(0, Math.max(Math.abs(p.x), Math.abs(p.y)) - 1.1) / 0.8); }
    // motion blur: this frame's inverse view-projection against last frame's (the shake is part of the motion)
    if (this.mblur) { const mu = this.mblur.uniforms; cam.updateMatrixWorld(); this._vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); if (!this._mbInit || this._mbCam !== cam || cam.position.distanceTo(this._mbPos) > 1.2) { this._prevVP.copy(this._vp); this._mbInit = true; this._mbCam = cam; } this._mbPos.copy(cam.position); // (a hard cut is not motion)
      mu.uInvVP.value.copy(this._vp).invert(); mu.uPrevVP.value.copy(this._prevVP); const dep = this.ink?.enabled ? this.ink.rt?.depthTexture : null; mu.tDepth.value = dep; mu.uHasDepth.value = dep ? 1 : 0; mu.uStrength.value = (this.motionBlur ?? 0.5) * Math.min(1, (1 / 60) / Math.max(1 / 240, rdt)); this.mblur.enabled = this.motionBlur > 0; }
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.composer.render(rdt);
    if (this.mblur) this._prevVP.copy(this._vp);
    cam.position.sub(this.shakeOffset); cam.rotation.z = rz;
    if (this.uiVisible) { this.renderer.clearDepth(); this.renderer.render(this.ui.scene, this.ui.camera); }
    if (this.wipeActive) { const wu = this.wipeMat.uniforms; wu.uTime.value = this.time; this.renderer.getDrawingBufferSize(wu.uRes.value); this.renderer.clearDepth(); this.renderer.render(this.wipeScene, this.wipeCam); }
  }

  // project a world position to UI plane coordinates (z=0)
  worldToUI(v, out = new THREE.Vector3()) {
    const p = v.clone().project(this.world.camera);
    return out.set(p.x * this.uiW, p.y * this.uiH, 0);
  }
  ndcToUI(ndc, out = new THREE.Vector3()) { return out.set(ndc.x * this.uiW, ndc.y * this.uiH, 0); }
}

export { damp };
