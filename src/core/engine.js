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

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uLift: { value: new THREE.Vector3(0.015, 0.0, 0.035) }, uGain: { value: new THREE.Vector3(1.04, 1.0, 0.95) },
    uVignette: { value: 0.42 }, uVigColor: { value: new THREE.Color(0x1a0f24) }, uGrain: { value: 0.045 }, uCA: { value: 0.0016 },
    uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 1, 1) }, uWarmth: { value: 0.0 },
    uGamma: { value: new THREE.Vector3(1, 1, 1) }, uRolloff: { value: 0.5 }, uToe: { value: 0.02 },
    uHarmony: { value: 0.0 }, uHueLight: { value: 0.1 }, uHueShadow: { value: 0.7 }, uSatTarget: { value: 0.42 }, uSatPull: { value: 0.0 },
    uVib: { value: 0.3 }, uSel: { value: new THREE.Vector3(0.15, 0.1, 0.12) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uSat, uContrast, uVignette, uGrain, uCA, uFlash, uWarmth, uRolloff, uToe, uHarmony, uHueLight, uHueShadow, uSatTarget, uSatPull, uVib; uniform vec3 uSel; uniform vec3 uLift, uGain, uGamma, uVigColor, uFlashColor; uniform vec2 uRes; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x); }
  vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
  void main(){
    vec2 cc = vUv - 0.5; float dist = length(cc);
    vec2 off = cc * dist * uCA * 8.0;
    vec3 col; col.r = texture2D(tDiffuse, vUv + off).r; col.g = texture2D(tDiffuse, vUv).g; col.b = texture2D(tDiffuse, vUv - off).b;
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

// Scene-change transitions (engine.wipe): one full-screen pass on the art-pixel grid (k x k screen pixels per art
// pixel, ~240 art rows), quantised to hand-picked ramps with 4x4 ordered dithering, so it is pixel art that moves.
//   style 'cloud'  : three parallax layers of billowing cumulus sweep in from the sides and below and fill the screen;
//                    sunlight catches their tops (a gold lining on the lit rims), violet shadow in the folds. On the way
//                    out the clouds part from the middle and drift away outward and up, revealing the new scene.
//   style 'galaxy' : the screen is swallowed from the edges by a turning spiral galaxy: stars stream down the arms into
//                    the vortex, violet / teal / rose nebula blooms, a golden apple-light core and glints, a gold rim on
//                    the advancing edge. On the way out it unfurls from the centre outward into the next scene.
// uT: 0 = clear .. 1 = fully covered; uPhase: 0 closing, 1 opening (the motion differs, the coverage is symmetric).
const WipeShader = {
  uniforms: { uT: { value: 0 }, uPhase: { value: 0 }, uStyle: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1.7 }, uRes: { value: new THREE.Vector2(1280, 720) }, uK: { value: 3 }, uColor: { value: new THREE.Color(0x120d1c) }, uTime: { value: 0 }, uMode: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform float uT, uPhase, uStyle, uAspect, uTime, uMode, uK; uniform vec2 uCenter, uRes; uniform vec3 uColor; varying vec2 vUv;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
  float bayer(vec2 p){ p = mod(p, 4.0); int x = int(p.x), y = int(p.y); float b;
    if (y == 0) b = x == 0 ? 0.0 : x == 1 ? 8.0 : x == 2 ? 2.0 : 10.0; else if (y == 1) b = x == 0 ? 12.0 : x == 1 ? 4.0 : x == 2 ? 14.0 : 6.0;
    else if (y == 2) b = x == 0 ? 3.0 : x == 1 ? 11.0 : x == 2 ? 1.0 : 9.0; else b = x == 0 ? 15.0 : x == 1 ? 7.0 : x == 2 ? 13.0 : 5.0; return (b + 0.5) / 16.0; }
  vec3 ramp6(float l, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5){ int i = int(clamp(l, 0.0, 5.0)); return i == 0 ? c0 : i == 1 ? c1 : i == 2 ? c2 : i == 3 ? c3 : i == 4 ? c4 : c5; }
  // ---- clouds: one layer's coverage value and its light (density toward the sun minus away from it)
  float cloudD(vec2 q, float sc, float seed){ return fbm(q * sc + seed) * 0.75 + fbm(q * sc * 2.3 + seed * 1.7) * 0.25; }
  void main(){
    vec2 P = floor(gl_FragCoord.xy / uK); vec2 uv = (P * uK + 0.5 * uK) / uRes; float th = bayer(P); float T = clamp(uT, 0.0, 1.0);
    vec2 q = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);
    if (uStyle < 0.5) {
      // ================= CLOUDS: billowing cumulus built from sphere-lit puffs on a jittered grid (three parallax layers);
      // a puff appears (growing from nothing) when T passes its key: edges and the bottom first, the middle last
      vec3 col = vec3(0.0); float got = 0.0; vec3 L = normalize(vec3(-0.45, 0.75, 0.5));
      for (int li = 0; li < 3; li++) { float fl = float(li); // 0 = front, 2 = back
        float g = 0.27 - fl * 0.055; float zoom = 1.0 + (1.0 - T) * (0.9 - fl * 0.2); vec2 drift = vec2(uTime * (0.012 + fl * 0.008), 0.0) + (uPhase < 0.5 ? vec2(0.0, -0.18) : vec2(0.0, 0.3)) * (1.0 - T);
        vec2 qq = q * zoom + drift + vec2(fl * 3.7, fl * 1.9); vec2 cell = floor(qq / g); float best = -1.0; vec3 bc = vec3(0.0);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 cid = cell + vec2(float(i), float(j)); float r1 = h21(cid + fl * 13.1), r2 = h21(cid * 1.7 + 3.3 + fl), r3 = h21(cid * 2.3 + 7.7 + fl);
          vec2 cpos = (cid + 0.5 + (vec2(r1, r2) - 0.5) * 0.85) * g; vec2 sp = (cpos - drift - vec2(fl * 3.7, fl * 1.9)) / zoom; // the puff centre back in screen space
          float ex = 1.0 - min(1.0, abs(sp.x / (0.5 * uAspect)) * 1.05); float key = min(ex, (sp.y + 0.5) * 1.6) * 0.85 + r3 * 0.2 + fl * 0.03;
          float grow = smoothstep(key, key + 0.18, T * 1.2); if (grow <= 0.0) continue;
          float rr = g * (0.55 + r1 * r1 * 0.75 + r2 * 0.12) * grow; vec2 d = (qq - cpos) / rr; float dd = dot(d, d); if (dd >= 1.0) continue;
          float z = sqrt(1.0 - dd); float hgt = z * rr + r2 * 0.02; if (hgt <= best) continue; best = hgt;
          vec3 n = normalize(mix(vec3(d.x, d.y, z), vec3(0.0, 0.45, 0.9), 0.38)); float dif = dot(n, L); float lv = 1.0 + dif * 3.2 - fl * 0.7 - (1.0 - uv.y) * 0.6 + r3 * 0.3 + d.y * 0.4;
          vec3 cc = ramp6(floor(lv + th), vec3(0.12, 0.09, 0.19), vec3(0.23, 0.18, 0.31), vec3(0.42, 0.33, 0.47), vec3(0.66, 0.53, 0.66), vec3(0.88, 0.77, 0.78), vec3(1.0, 0.94, 0.88));
          if (dif > 0.6 && dd > 0.7 && d.y > 0.1) cc = mix(cc, vec3(1.0, 0.8, 0.52), fl < 0.5 ? 0.8 : 0.45); // sunlight catching the tops
          if (dd > 0.94 && d.y < -0.2) cc *= 0.86; // a darker fold where puffs meet
          bc = cc; }
        if (best > 0.0) { col = bc; got = 1.0; break; } }
      if (got < 0.5) { if (T < 0.985) discard; col = vec3(0.12, 0.09, 0.19); }
      gl_FragColor = vec4(col, 1.0);
    } else {
      // ================= GALAXY
      vec2 c = vec2((uCenter.x - 0.5) * uAspect, uCenter.y - 0.5); vec2 p = q - c; float r = length(p) + 1e-4; float a = atan(p.y, p.x); float R = r / (0.5 * length(vec2(uAspect, 1.0)));
      float spin = uTime * 0.9 + (uPhase < 0.5 ? T : 2.0 - T) * 3.5; float s = a / 6.2832 + log(r) * 0.55 - spin * 0.16;
      float arms = 0.5 + 0.5 * cos(6.2832 * 2.0 * s); float v = R + (arms - 0.5) * 0.32 + (fbm(vec2(s * 6.0, r * 5.0)) - 0.5) * 0.22;
      float thr = uPhase < 0.5 ? 1.08 - T * 1.42 : (1.0 - T) * 1.42 - 0.34; float rim = v - thr;
      if (rim < 0.0) discard;
      // nebula in swirled coordinates (violet veils, teal streams, rose bloom), quantised to ramps with dithering
      vec2 w = vec2(cos(a + log(r) * 2.2 + spin * 0.5), sin(a + log(r) * 2.2 + spin * 0.5)) * r; float n1 = fbm(w * 3.2 + 4.0), n2 = fbm(w * 5.0 - uTime * 0.05 + 9.0);
      vec3 col = vec3(0.012, 0.008, 0.03); float dv = smoothstep(0.38, 0.85, n1) * (0.55 + arms * 0.6); float dt2 = smoothstep(0.5, 0.9, n2) * arms;
      if (dv > 0.06) col = ramp6(floor(dv * 4.5 + th), vec3(0.04, 0.02, 0.09), vec3(0.1, 0.05, 0.21), vec3(0.18, 0.09, 0.34), vec3(0.3, 0.14, 0.47), vec3(0.45, 0.22, 0.6), vec3(0.66, 0.4, 0.72));
      if (dt2 > 0.12) col = ramp6(floor(dt2 * 4.0 + th + 1.0), vec3(0.02, 0.07, 0.1), vec3(0.03, 0.16, 0.21), vec3(0.05, 0.28, 0.32), vec3(0.09, 0.44, 0.43), vec3(0.16, 0.61, 0.56), vec3(0.45, 0.82, 0.71));
      float rose = smoothstep(0.62, 0.95, fbm(w * 2.0 + 21.0)) * arms; if (rose > 0.2) col = mix(col, vec3(0.85, 0.35, 0.5), step(0.5, rose + th * 0.3) * 0.6);
      // stars streaming down the arms into the vortex (log-polar cells drifting inward and turning)
      vec2 lp = vec2(log(r) * 9.0 + uTime * 2.2, (a + uTime * 0.6 / max(0.15, r)) * 9.0); vec2 cell = floor(lp); float hs = h21(cell); vec2 f = fract(lp);
      if (hs > 0.93) { float tail = smoothstep(0.0, 0.9, f.x) * step(abs(f.y - 0.5), 0.12); float head = step(0.8, f.x) * step(abs(f.y - 0.5), 0.2); col = mix(col, mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.92, 0.7), step(0.97, hs)), max(tail * 0.6, head)); }
      if (h21(P * 1.31 + floor(uTime * 3.0)) > 0.9985) col = vec3(1.0);
      // the golden apple-light core and its glints
      float core = smoothstep(0.17, 0.0, r) * (0.75 + 0.25 * arms); if (core > 0.0) col = mix(col, ramp6(floor(core * 5.5 + th), vec3(0.2, 0.08, 0.03), vec3(0.43, 0.22, 0.08), vec3(0.69, 0.4, 0.12), vec3(0.9, 0.64, 0.23), vec3(1.0, 0.82, 0.42), vec3(1.0, 0.96, 0.78)), step(0.12, core + (th - 0.5) * 0.08));
      vec2 gl = floor(q * 18.0); float gh = h21(gl + 7.0); float tw = fract(uTime * 0.7 + gh * 9.0); if (gh > 0.985 && tw < 0.35) { vec2 fp = fract(q * 18.0) - 0.5; float cr = step(abs(fp.x), 0.04) * step(abs(fp.y), 0.3) + step(abs(fp.y), 0.04) * step(abs(fp.x), 0.3); col = mix(col, vec3(1.0, 0.86, 0.5), min(1.0, cr)); }
      // a gold rim on the advancing edge
      if (rim < 0.035) col = mix(vec3(1.0, 0.8, 0.42), vec3(1.0, 0.97, 0.85), step(rim, 0.012));
      else if (rim < 0.07 && th > 0.5) col = mix(col, vec3(0.8, 0.5, 0.2), 0.6);
      gl_FragColor = vec4(col, 1.0);
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
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.composer.render(rdt);
    cam.position.sub(this.shakeOffset); cam.rotation.z = rz;
    if (this.uiVisible) { this.renderer.clearDepth(); this.renderer.render(this.ui.scene, this.ui.camera); }
    if (this.wipeActive) { const wu = this.wipeMat.uniforms; wu.uTime.value = this.time; this.renderer.getDrawingBufferSize(wu.uRes.value); wu.uK.value = Math.max(2, Math.round(wu.uRes.value.y / 240)); this.renderer.clearDepth(); this.renderer.render(this.wipeScene, this.wipeCam); }
  }

  // project a world position to UI plane coordinates (z=0)
  worldToUI(v, out = new THREE.Vector3()) {
    const p = v.clone().project(this.world.camera);
    return out.set(p.x * this.uiW, p.y * this.uiH, 0);
  }
  ndcToUI(ndc, out = new THREE.Vector3()) { return out.set(ndc.x * this.uiW, ndc.y * this.uiH, 0); }
}

export { damp };
