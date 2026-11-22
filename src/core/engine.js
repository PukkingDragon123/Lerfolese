// Renderer + post FX (bloom, tilt-shift diorama blur, film grade) + UI overlay layer + transition overlay + main loop.
// OPT-IN PIXEL LOOK (engine.setPixel(k), default OFF: the game renders at full native resolution). A scene that wants a
// pixel-art feel (the galaxy / astral scenes, slightly) asks for it; setFx() resets it to fx.pixel ?? 0 on every scene.
// When on, the 3D world and its whole post chain (AO, ink, motion blur, bloom, grade) render into a low ART-resolution
// buffer (320 / k rows: each art pixel is an integer block of screen pixels), which is upscaled with crisp nearest sampling. The camera is snapped to the art-pixel grid (at its focus depth) and the sub-pixel
// remainder is applied as a smooth offset of the upscale, so still and slowly drifting views keep rock-stable pixels
// (no crawl, no shimmer). The UI scene is drawn afterwards at full resolution (crisp text and 3D UI); the scene
// transition is drawn into its own art-resolution layer on top, so clouds and galaxy read as pixel art too.
// ?px=<rows> forces the pixel look at that many rows everywhere (testing), ?snap=0 turns the camera snap off.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { InkPass } from './ink.js';
import { ART } from './art.js';
import { lfxSet } from '../gfx/lowpoly.js'; // realistic cel light on every lit material + the shared LFX light model (rim, coloured shadows, haze, ...)
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

// MOTION BLUR (two parts, one pass):
//  * camera blur: every pixel's world position (from depth, or a mid-distance plane when no depth is available) is
//    reprojected with last frame's view-projection; the frame is smeared along that screen velocity (MB_N taps,
//    clamped, faded in so a near-still camera never softens).
//  * object blur: last frame's output, reprojected the same way, is blended in ONLY where it disagrees with this frame
//    (something moved there: a thrown apple, a lunging beast, a falling body), so fast objects leave a short shutter
//    smear while still pixels stay exactly as crisp as before. (History off on the low preset.)
// A still camera over a still world gives zero velocity and zero disagreement: the image is untouched. The 3D UI and
// all text are drawn after the post chain, never blurred.
const MotionBlurShader = {
  defines: { MB_N: 12 },
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, tHist: { value: null }, uHasDepth: { value: 0 }, uHistK: { value: 0 }, uInvVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() }, uStrength: { value: 0.35 }, uMax: { value: 0.036 }, uNear: { value: 0.1 }, uFar: { value: 400 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tDepth, tHist; uniform float uHasDepth, uStrength, uMax, uHistK; uniform mat4 uInvVP, uPrevVP; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    float d = uHasDepth > 0.5 ? texture2D(tDepth, vUv).x : 0.985; d = min(d, 0.9995);
    vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); wp /= wp.w; vec4 pp = uPrevVP * wp; pp /= pp.w; vec2 puv = pp.xy * 0.5 + 0.5;
    vec2 vel = (vUv - puv) * uStrength; float L = length(vel); if (L > uMax) vel *= uMax / L;
    vec4 c = texture2D(tDiffuse, vUv); vec4 o = c;
    float fk = smoothstep(0.0007, 0.0025, L);
    if (fk > 0.0) { float j = h(vUv * 917.0) - 0.5; vec4 acc = c; for (int i = 1; i < MB_N; i++) { float f = (float(i) + j * 0.6) / float(MB_N - 1) - 0.5; acc += texture2D(tDiffuse, vUv + vel * f); } o = mix(c, acc / float(MB_N), fk); }
    if (uHistK > 0.0 && puv.x > 0.0 && puv.y > 0.0 && puv.x < 1.0 && puv.y < 1.0) {
      vec3 hc = texture2D(tHist, puv).rgb; float df = dot(abs(hc - c.rgb), vec3(0.3, 0.5, 0.2));
      o.rgb = mix(o.rgb, hc, uHistK * smoothstep(0.05, 0.22, df));
    }
    gl_FragColor = o;
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
    // (colour, newest) no hue harmony / saturation pull: nothing greys the world out; colour comes from the light
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
//   style 'cloud'  : five painted cumulus banks (sculpted, never blobs: billow-noise cauliflower heads thinning upward
//                    above flat cool bases, crisp edges with torn wisps, sunlit flanks with a gold lining, violet shade)
//                    sweep in from alternate sides with parallax until the sky is full; on the way out they sail away.
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
  // cumulus density at P (bank space, scaled), hh = height above the flat base in bank heights, ends = distance inside the bank's ends
  float billow(vec2 p){ return 0.62 * abs(vn(p) * 2.0 - 1.0) + 0.3 * abs(vn(mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(1.7, 9.2)) * 2.0 - 1.0) + 0.12 * abs(vn(mat2(-0.4, 3.0, -3.0, -0.4) * p + vec2(5.1, 2.3)) * 2.0 - 1.0); } // three octaves: heads, then sub-heads; no specks
  // one bank of separate cumulus clouds at screen point (x, y) in bank space: each cell along x holds a cloud with its own
  // flat base, a broad dome envelope (wider than tall) and a billowing edge; the union of the two nearest clouds
  float cumulus(float x, float y, float base, float seed, float fq, float t){
    float cw = 0.62; float ci = floor(x / cw); float D = -1.0; float n = billow(vec2(x + t, y) * fq + seed);
    for (int k = -1; k <= 1; k++) { float c = ci + float(k); float r1 = h21(vec2(c, seed)), r2 = h21(vec2(c + 3.1, seed)), r3 = h21(vec2(c + 7.3, seed));
      float cx = (c + 0.5 + (r1 - 0.5) * 0.5) * cw; float w = 0.33 + r2 * 0.2; float hgt = 0.3 + r3 * 0.26; float by = base + (r1 - 0.5) * 0.06;
      if (y < by) continue; float dx = (x - cx) / w; float e = 1.0 - dx * dx * (0.8 + 0.2 * r2) - (y - by) / hgt; // a broad dome on a flat base
      D = max(D, e * 0.75 + (n - 0.42) * 0.55 - (1.0 - smoothstep(0.0, 0.015, y - by)) * 0.0); }
    return D; }
  void main(){
    vec2 uv = vUv; float T = clamp(uT, 0.0, 1.0); vec2 q = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);
    if (uStyle < 0.5) {
      // ================= CLOUDS: three parallax decks of real cumulus. Each deck's density is domain-warped billow noise
      // at six octaves (fractal cauliflower edges at every scale, so no round lobes or circles), and coverage is a bias
      // that sweeps across from the deck's entering side, so the leading edge follows the clouds' own contours (never a
      // straight cut). Light comes from the low sun (upper right): two density taps toward it give sunlit flanks, cool
      // shaded creases and a thin gold lining only where an edge faces the sun. Far decks are hazier. Opening: the decks
      // keep travelling and the trailing edges sweep the sky clear.
      vec3 col = vec3(0.0); float alpha = 0.0;
      // the cloud wall behind the decks fades in only near full cover, so full cover is never a flat colour
      float bA = smoothstep(0.5, 0.9, T); if (bA > 0.0) { float hz = fbm3(vec2(q.x * 1.6 + uTime * 0.01, q.y * 3.0) + 11.0);
        col = mix(vec3(0.36, 0.33, 0.47), vec3(0.74, 0.6, 0.62), smoothstep(-0.55, 0.55, q.y + (hz - 0.5) * 0.4)); col *= bA; alpha = bA; }
      for (int li = 0; li < 3; li++) { float fl = float(li); float dir = li == 1 ? -1.0 : 1.0; float S = 3.6 - fl * 0.95; float seed = fl * 17.3 + 3.1;
        float Ti = clamp((T - fl * 0.07) / 0.86, 0.0, 1.0); float e = Ti * Ti * (3.0 - 2.0 * Ti);
        float xn = dir > 0.0 ? uv.x : 1.0 - uv.x; float travel = 0.35 + fl * 0.2;
        float off = uPhase < 0.5 ? e * travel : travel * (2.0 - e); // the cloud field drifts with the sweep, and keeps going when it opens
        float b = uPhase < 0.5 ? (mix(-0.2, 1.45, e) - xn) * 1.1 : (xn - mix(1.45, -0.2, e)) * 1.1;
        b += -(q.y - (0.28 - fl * 0.28)) * (q.y - (0.28 - fl * 0.28)) * 2.2 * (1.0 - e); // mid-sweep each deck sits in its own band
        b = min(b, 0.1 + fl * 0.06); if (b < -0.75) continue; // capped: even at full cover each deck keeps gaps, so the sky reads as layered masses
        vec2 sun = normalize(vec2(0.75 * dir, 0.6)) / uAspect;
        float d0 = 0.0, l0 = 0.0, l1 = 0.0, l2 = 0.0;
        for (int k = 0; k < 3; k++) { float tk = k == 0 ? 0.0 : (k == 1 ? 0.022 : 0.075);
          vec2 P = vec2(((xn + sun.x * tk - 0.5) * uAspect - off + uTime * (0.004 + fl * 0.004)) * 0.62, q.y + sun.y * tk * uAspect) * S + seed; // wider than tall
          vec2 w = vec2(fbm3(P * 0.5), fbm3(P * 0.5 + 5.2)); P += (w - 0.5) * 0.5;
          float n = 0.0, am = 0.5, nn = 0.0, nl = 0.0; vec2 Q = P; for (int o = 0; o < 6; o++) { if (k > 0 && o > 3) break; n += am * abs(vn(Q) * 2.0 - 1.0); nn += am; if (o == 3) nl = n / nn; Q = mat2(1.7, 1.15, -1.15, 1.7) * Q + vec2(3.1, 7.7); am *= 0.48; }
          // full octaves shape the edge; only the broad octaves light the body, so volumes read smooth inside
          if (k == 0) { d0 = n / nn * 1.25 + b - 0.52; l0 = nl * 1.25 + b; } else if (k == 1) l1 = nl * 1.25 + b; else l2 = nl * 1.25 + b; }
        float a = smoothstep(0.0, 0.018 + fl * 0.006, d0); if (a <= 0.002) continue;
        float dif = clamp(0.6 + (l0 - l1) * 4.2 + (l0 - l2) * 1.1, 0.0, 1.0);
        float inner = smoothstep(0.0, 0.3, d0); dif *= mix(1.0, 0.82, inner * (1.0 - dif));
        vec3 deep = vec3(0.3, 0.27, 0.38), sh = vec3(0.46, 0.41, 0.53), mid = vec3(0.68, 0.56, 0.6), lit = vec3(0.96, 0.8, 0.64);
        vec3 c = mix(deep, sh, smoothstep(0.0, 0.28, dif)); c = mix(c, mid, smoothstep(0.28, 0.62, dif)); c = mix(c, lit, smoothstep(0.62, 0.95, dif));
        c += vec3(1.0, 0.66, 0.34) * (1.0 - smoothstep(0.0, 0.05, d0)) * smoothstep(0.55, 0.9, dif) * 0.45; // gold lining on sun-facing edges only
        c = mix(c, vec3(0.5, 0.44, 0.54), (1.0 - fl / 2.0) * 0.32); // aerial haze on the far decks
        col = c * a + col * (1.0 - a); alpha = a + alpha * (1.0 - a); } // premultiplied 'over': nearer decks in front
      if (T > 0.985) { col += (1.0 - alpha) * vec3(0.5, 0.44, 0.56); alpha = 1.0; }
      if (alpha < 0.003) discard;
      gl_FragColor = vec4(col / max(alpha, 1e-3), alpha);
    } else {
      // ================= GALAXY
      vec2 c = vec2((uCenter.x - 0.5) * uAspect, uCenter.y - 0.5); vec2 p = q - c; float r = length(p) + 1e-4; float a = atan(p.y, p.x); float R = r / (0.5 * length(vec2(uAspect, 1.0)));
      float spin = uTime * 0.9 + (uPhase < 0.5 ? T : 2.0 - T) * 3.5; float s = a / 6.2832 + log(r) * 0.55 - spin * 0.16;
      float arms = 0.5 + 0.5 * cos(6.2832 * 2.0 * s); float v = R * 0.72 + (arms - 0.5) * (0.6 + 0.55 * R) + (fbm3(vec2(cos(6.2832 * s) * 1.6 + r * 4.0, sin(6.2832 * s) * 1.6 - r * 2.0)) - 0.5) * 0.4; // arms widen outward, so the outer edge is never an oval portal // the edge advances along the spiral arms, not as a ring
      float thr = 1.25 - T * 1.8; float rim = v - thr;
      if (uPhase > 0.5) rim = arms * 0.85 + (fbm3(vec2(cos(6.2832 * s) * 1.6 + r * 4.0, sin(6.2832 * s) * 1.6 - r * 2.0)) - 0.5) * 0.3 + R * 0.12 - mix(1.2, -0.3, T); // opening: the arms thin and spin away (no hole, so never an oval portal)
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

// the art-resolution world -> screen: integer blocks (block = device px per art px), offset by the camera snap remainder
const UpscaleShader = {
  uniforms: { tArt: { value: null }, uArt: { value: new THREE.Vector2(1, 1) }, uBlock: { value: 1 }, uOff: { value: new THREE.Vector2() }, uPad: { value: new THREE.Vector2() } },
  vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform sampler2D tArt; uniform vec2 uArt, uOff, uPad; uniform float uBlock;
  void main(){ vec2 a = floor((gl_FragCoord.xy + uPad) / uBlock - uOff); a = clamp(a, vec2(0.0), uArt - 1.0); gl_FragColor = texture2D(tArt, (a + 0.5) / uArt); }`,
};
const art = (q) => { const v = new URLSearchParams(location.search).get(q); return v === null ? null : Number(v); };

// canvas resolution: supersample on 1x screens, full device resolution (capped at 2x) on hi-dpi ones. This is the UI's
// (and the upscale's) resolution: the 3D world itself is drawn at the art resolution (see the header), so text and the
// 3D UI stay crisp while the world reads as pixel art. Auto quality drops shadows / AO samples, never the art rows.
const hiRes = (q) => { const d = window.devicePixelRatio || 1; return q === 'low' ? Math.min(2, Math.max(1, d)) : q === 'medium' ? Math.min(2, Math.max(1.25, d)) : Math.min(2, Math.max(1.5, d)); };

// copies the motion-blurred frame into a history target (read by the next frame's object smear) and passes it on
class HistoryPass extends Pass {
  constructor(w, h) { super(); this.needsSwap = false; this.valid = false; this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }', depthTest: false, depthWrite: false })); }
  setSize(w, h) { this.rt.setSize(w, h); this.valid = false; }
  render(renderer, writeBuffer, readBuffer) { this.quad.material.uniforms.t.value = readBuffer.texture; renderer.setRenderTarget(this.rt); this.quad.render(renderer); this.valid = true; }
}

// the 3D UI keeps its studio light: a warm rim, a touch of cel, no haze / grain / shadow fill
const LFX_UI = { lfxSky: { x: 1.0, y: 0.78, z: 0.52, w: 0.22 }, lfxGnd: { x: 1, y: 0.78, z: 0.52, w: 0 }, lfxHaze: { w: 0 }, lfxFog: { w: 0 }, lfxShade: { w: 0 }, lfxMisc: { x: 0, y: 0.4, z: 0.2, w: 0.25 } };
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

    // the pixel look: art rows (see the header); MSAA inside the art buffer keeps edges stable while things move
    const pxq = art('px'); this.pixelForced = pxq !== null && pxq > 0 ? pxq : null; this.pixelK = 0; this.artRows = this.pixelForced ?? 320; this.pixelOn = !!this.pixelForced; this.snapOn = art('snap') !== 0;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.testMode ? 0 : 4 });
    this.composer = new EffectComposer(r, rt); this.composer.renderToScreen = !this.pixelOn;
    this.upMat = new THREE.ShaderMaterial({ ...UpscaleShader, uniforms: THREE.UniformsUtils.clone(UpscaleShader.uniforms), depthTest: false, depthWrite: false });
    this.upScene = new THREE.Scene(); { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.upMat); m.frustumCulled = false; this.upScene.add(m); }
    this.upCam = new THREE.Camera(); this._snapOff = new THREE.Vector2(); this._snapD = new THREE.Vector3();
    this.renderPass = new RenderPass(this.world.scene, this.world.camera);
    this.composer.addPass(this.renderPass);
    // ground-truth AO (as in R.O.O.M.): contact shadows under feet, in roots, folds and ruins
    this.aoForced = new URLSearchParams(location.search).get('ao') === '1';
    this.gtao = new GTAOPass(this.world.scene, this.world.camera, size.x, size.y); this.gtao.output = GTAOPass.OUTPUT.Default; this.gtao.blendIntensity = 0.85;
    this.gtao.updateGtaoMaterial({ radius: 0.85, distanceExponent: 1.4, thickness: 1.2, scale: 1.05, samples: 16 }); this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    this.composer.addPass(this.gtao);
    // occlusion is never black: occluded light goes a cool violet (multiplied), so folds and contacts stay coloured
    { const bm = this.gtao.blendMaterial; bm.uniforms.uAOTint = { value: new THREE.Color(0.5, 0.44, 0.72) }; bm.fragmentShader = bm.fragmentShader.replace('uniform float intensity;', 'uniform float intensity; uniform vec3 uAOTint;').replace('gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);', 'vec3 occ = mix(uAOTint, vec3(1.0), clamp(texel.r, 0.0, 1.0)); gl_FragColor = vec4(mix(vec3(1.), occ, intensity), texel.a);'); bm.needsUpdate = true; }
    this.gtao.enabled = this.aoForced || this.fullFx || !this.testMode;
    // anime/cartoon black ink lines on the 3D world
    this.inkForced = new URLSearchParams(location.search).get('ink') === '1';
    this.ink = new InkPass(this.world.scene, this.world.camera, size.x, size.y); this.ink.u.uThick.value = this.pixelOn ? 1 : Math.max(0.7, this.pixelRatio * 0.45); this.composer.addPass(this.ink); // thin: one art pixel
    this.mblur = new ShaderPass(MotionBlurShader); this.composer.addPass(this.mblur); this._prevVP = new THREE.Matrix4(); this._vp = new THREE.Matrix4(); this._mbPos = new THREE.Vector3(); this._mbInit = false; this.motionBlur = 0.8; this.objectBlur = 0.4; this.mbTest = new URLSearchParams(location.search).get('mbh') === '1'; // (user: lots more motion blur) camera smear gain, object shutter smear
    this.mbHist = new HistoryPass(size.x, size.y); this.composer.addPass(this.mbHist); this.mblur.uniforms.tHist.value = this.mbHist.rt.texture; // keeps this frame's blurred image for the next frame's object smear
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
    // pixel look: the transition paints into its own art-resolution layer (premultiplied), upscaled on top of the UI
    this.wipeRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.wipeUpMat = new THREE.ShaderMaterial({ ...UpscaleShader, uniforms: THREE.UniformsUtils.clone(UpscaleShader.uniforms), depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
    this.wipeUpScene = new THREE.Scene(); { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.wipeUpMat); m.frustumCulled = false; this.wipeUpScene.add(m); }

    this.updaters = new Set(); this.time = 0; this.dt = 0; this.frame = 0;
    this.trauma = 0; this.shakeOffset = new THREE.Vector3(); this.hitStopT = 0; this.timeScale = 1;
    this.fx = { tilt: true }; this.uiVisible = true; this.paused = false;
    this.fps = 60; this._fpsAcc = 0; this._fpsN = 0; this._lowFrames = 0;
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(q) {
    this.quality = q;
    this.pixelRatio = hiRes(q); if (this.ink) this.ink.u.uThick.value = this.pixelOn ? 1 : Math.max(0.7, this.pixelRatio * 0.45);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.setAtmo(this.fx?.atmo);
    this.renderer.shadowMap.enabled = q !== 'low'; // low quality: no shadow maps / GTAO; contact shadows and vertex AO still ground everything
    if (this.mblur) { const n = q === 'low' ? 6 : q === 'medium' ? 10 : 12; if (this.mblur.material.defines.MB_N !== n) { this.mblur.material.defines.MB_N = n; this.mblur.material.needsUpdate = true; } this.mbHist.enabled = q !== 'low'; }
    if (this.gtao) { this.gtao.enabled = this.aoForced || (q !== 'low' && this.fx?.ao !== false); this.gtao.updateGtaoMaterial({ samples: q === 'high' ? 16 : 8 }); this.gtao.updatePdMaterial({ samples: q === 'high' ? 12 : 6 }); }
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    // one art pixel = an integer block of SCREEN pixels (so every block is the same size); in drawing-buffer pixels
    // that block is block * (buffer px per screen px). The art frame is centred, cropping under one block per side.
    const dims = (rows) => { const dpr = window.devicePixelRatio || 1, bpp = db.y / Math.max(1, h * dpr); const block = Math.max(1, Math.round((h * dpr) / rows)) * bpp; const aw = Math.ceil(db.x / block), ah = Math.ceil(db.y / block); return { aw, ah, block, pad: [(aw * block - db.x) / 2, (ah * block - db.y) / 2] }; };
    const setUp = (m, d) => { const u = m.uniforms; u.uArt.value.set(d.aw, d.ah); u.uBlock.value = d.block; u.uPad.value.set(...d.pad); };
    // the galaxy transition always carries a slight pixel look (about 540 rows); with the pixel look on it follows the art rows
    const wd = dims(this.pixelOn ? this.artRows : 540); this.wipeRT.setSize(wd.aw, wd.ah); setUp(this.wipeUpMat, wd); this.wipeArt = new THREE.Vector2(wd.aw, wd.ah);
    if (this.pixelOn) {
      const d = dims(this.artRows); const { aw, ah, block } = d;
      Object.assign(ART, { on: true, rows: ah, w: aw, h: ah, k: ah / db.y, block }); ART.pointK.value = ah / db.y;
      this.composer.setPixelRatio(1); this.composer.setSize(aw, ah); setUp(this.upMat, d);
      this.artSize = new THREE.Vector2(aw, ah);
    } else {
      Object.assign(ART, { on: false, rows: db.y, w: db.x, h: db.y, k: 1, block: 1 }); ART.pointK.value = 1;
      this.composer.setPixelRatio(this.pixelRatio); this.composer.setSize(w, h); this.artSize = db.clone();
    }
    this.tiltH.uniforms.uRes.value.copy(this.artSize); this.tiltV.uniforms.uRes.value.copy(this.artSize);
    this.grade.uniforms.uRes.value.copy(this.artSize);
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

  /** the opt-in pixel look: k = 0 off (full native resolution, the default), 1 = strong (320 art rows), 0.6 = slight
   *  (about 540 rows: 2-pixel blocks at 1080p). The art pixel is always an integer block of screen pixels. */
  setPixel(k = 0) {
    k = Math.max(0, Math.min(1, +k || 0)); if (this.pixelForced) return; if (Math.abs(k - this.pixelK) < 1e-3) return;
    this.pixelK = k; this.pixelOn = k > 0; this.artRows = k > 0 ? Math.round(320 / k) : 320;
    this.composer.renderToScreen = !this.pixelOn; if (this.ink) this.ink.u.uThick.value = this.pixelOn ? 1 : Math.max(0.7, this.pixelRatio * 0.45);
    this.resize();
  }

  // fx: { bloom:[strength,radius,threshold], tilt:{focus,width,feather,amount,top,bottom} | false, grade:{sat,contrast,vignette,grain,warmth}, exposure }
  setFx(fx = {}) {
    this.fx = fx; this.setPixel(fx.pixel ?? 0); // pixel look: off unless the scene asks (fx.pixel 0..1)
    this.setAtmo(fx.atmo);
    const b = fx.bloom || [0.4, 0.55, 0.86]; // gentle: only the hottest lights bloom
    this.bloom.strength = b[0]; this.bloom.radius = b[1]; this.bloom.threshold = b[2]; this.bloom.enabled = !this.testMode || this.fullFx;
    const t = fx.tilt;
    this.tiltH.enabled = this.tiltV.enabled = false; // user: crisp, never blurry (tilt-shift off)
    if (t) for (const p of [this.tiltH, this.tiltV]) {
      const u = p.uniforms; u.uFocus.value = t.focus ?? 0.45; u.uWidth.value = t.width ?? 0.16; u.uFeather.value = t.feather ?? 0.3; u.uAmount.value = (t.amount ?? 2.4) * 0.55; u.uTop.value = t.top ?? 1; u.uBottom.value = t.bottom ?? 0.8;
    }
    const g = fx.grade || {}; const gu = this.grade.uniforms;
    this.gtao.enabled = fx.ao !== false && (this.aoForced || this.fullFx || (!this.testMode && this.quality !== 'low')); this.gtao.blendIntensity = Math.min(0.72, (fx.ao && typeof fx.ao === 'number' ? fx.ao : 0.85) * 0.62); // lighter, and tinted violet (see the blend shader)
    gu.uGamma.value.set(...(g.gamma || [1, 1, 1])); gu.uRolloff.value = Math.min(0.3, g.rolloff ?? 0.22); gu.uToe.value = g.toe ?? 0.02; gu.uCA.value = 0;
    const ik = fx.ink ?? {}; this.ink.enabled = fx.ink !== false && (!this.testMode || this.inkForced || this.fullFx); this.ink.u.uStrength.value = (ik.strength ?? 0.92) * 0.66; this.ink.u.uInk.value.set(ik.color ?? 0x0e0710); this.ink.u.uDepthK.value = ik.depth ?? 0.045; this.ink.u.uNormalK.value = ik.normal ?? 0.42; this.ink.u.uFade.value.set(...(ik.fade || [55, 140]));
    const ry = fx.rays; this.rays.enabled = !!(ry && ry.pos); if (ry) { const u = this.rays.uniforms; this.raysPos = ry.pos; u.uStrength.value = (ry.strength ?? 0.35) * 0.6; u.uTint.value.set(ry.tint ?? 0xffd6a0); u.uThresh.value = ry.thresh ?? 0.85; u.uDecay.value = ry.decay ?? 0.955; u.uDensity.value = ry.density ?? 0.85; }
    gu.uVib.value = g.vib ?? 0.3; gu.uSel.value.set(...(g.sel || [0.06, 0.08, 0.14]));
    gu.uSat.value = g.sat ?? 1.1; gu.uContrast.value = g.contrast ?? 1.06; gu.uVignette.value = g.vignette ?? 0.42; gu.uGrain.value = Math.min(0.012, (g.grain ?? 0.04) * 0.3); gu.uWarmth.value = g.warmth ?? 0;
    if (g.lift) gu.uLift.value.set(...g.lift); else gu.uLift.value.set(0.004, 0.002, 0.02);
    if (g.gain) gu.uGain.value.set(...g.gain); else gu.uGain.value.set(1.03, 1.0, 0.96);
    this.renderer.toneMappingExposure = fx.exposure ?? 1.0;
  }

  /** the shared light model for the world (gfx/lowpoly.js LFX). atmo: { sky, rim, gnd, haze, hazeK, start, density,
   *  fogTop, fogK, shade, shadeK, micro, leaf, cel, warm } (colours as hex / css; any can be left out) */
  setAtmo(a = {}) {
    a = a || {}; const c = (h, d) => { const k = new THREE.Color(h ?? d); return { x: k.r, y: k.g, z: k.b }; };
    const low = this.quality === 'low';
    this._lfxWorld = {
      lfxSky: { ...c(a.sky, '#9cbcf4'), w: a.rim ?? 0.34 }, lfxGnd: { ...c(a.gnd, '#d08a4a'), w: 0.55 },
      lfxHaze: { ...c(a.haze, '#b4c6ec'), w: a.hazeK ?? 0.42 }, lfxFog: { x: a.start ?? 24, y: a.density ?? 0.009, z: a.fogTop ?? 0.8, w: low ? 0 : a.fogK ?? 0.2 },
      lfxShade: { ...c(a.shade, '#5c6cff'), w: a.shadeK ?? 0.4 }, lfxMisc: { x: low ? 0 : a.micro ?? 0.7, y: a.leaf ?? 0.9, z: a.cel ?? 0.42, w: a.warm ?? 0.7 },
    };
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
    await this.warmup(); // never a loading frame: the transition stays closed (and keeps animating) until the new scene's shaders are compiled and it has drawn
    await tweens.wait(0.1);
    u.uPhase.value = 1; await tweens.to(u.uT, { value: 0 }, Math.max(0.65, d * 1.08), { ease: 'inOutQuad' });
    this.wipeActive = false;
  }

  /** compile the current world + UI scenes' shaders in the background (parallel shader compile, the transition keeps
   *  animating), then let a few real frames draw them, so a scene is never revealed half-built or with a compile hitch */
  async warmup({ frames = 3, maxMs = 6000 } = {}) {
    const r = this.renderer; const t0 = performance.now();
    try { const jobs = [r.compileAsync?.(this.world.scene, this.world.camera), r.compileAsync?.(this.ui.scene, this.ui.camera)].filter(Boolean); if (jobs.length) await Promise.race([Promise.all(jobs), new Promise((res) => setTimeout(res, maxMs))]); } catch (e) { /* compile errors surface on render */ }
    await new Promise((res) => { let n = 0; const f = () => (++n >= frames ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    this.lastWarmMs = performance.now() - t0;
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
    this.grade.uniforms.uTime.value = this.pixelOn ? 0 : this.time; // pixel look: the faint grain holds still (no crawling pixels)
    if (this.rays.enabled && this.raysPos) { const p = this._sunP || (this._sunP = new THREE.Vector3()); p.copy(this.raysPos).project(cam); const u = this.rays.uniforms; u.uSun.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5); u.uAspect.value = this.aspect; u.uFade.value = p.z > 1 ? 0 : 1 - Math.min(1, Math.max(0, Math.max(Math.abs(p.x), Math.abs(p.y)) - 1.1) / 0.8); }
    // motion blur: this frame's inverse view-projection against last frame's (the shake is part of the motion)
    if (this.mblur) { const mu = this.mblur.uniforms; cam.updateMatrixWorld(); this._vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); if (!this._mbInit || this._mbCam !== cam || cam.position.distanceTo(this._mbPos) > 1.2) { this._prevVP.copy(this._vp); this._mbInit = true; this._mbCam = cam; this._mbCut = true; } this._mbPos.copy(cam.position); // (a hard cut is not motion)
      mu.uInvVP.value.copy(this._vp).invert(); mu.uPrevVP.value.copy(this._prevVP); const dep = this.ink?.enabled ? this.ink.rt?.depthTexture : null; mu.tDepth.value = dep; mu.uHasDepth.value = dep ? 1 : 0; mu.uStrength.value = (this.motionBlur ?? 0.8) * Math.min(1, (1 / 60) / Math.max(1 / 240, rdt)); this.mblur.enabled = this.motionBlur > 0;
      const histOk = this.mbHist.enabled && this.mbHist.valid && this._mbCut !== true; mu.uHistK.value = histOk ? this.objectBlur * Math.min(1, (1 / 60) / Math.max(1 / 240, rdt)) : 0; this._mbCut = false; this.mbHist.enabled = this.mblur.enabled && this.quality !== 'low' && (!this.testMode || this.mbTest); }
    const snapped = this.pixelOn ? this._snap(cam) : null;
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    if (!this._lfxWorld) this.setAtmo(); lfxSet(this._lfxWorld);
    this.composer.render(rdt);
    if (this.pixelOn) { const u = this.upMat.uniforms; u.tArt.value = this.composer.readBuffer.texture; u.uOff.value.copy(this._snapOff); this.renderer.setRenderTarget(null); this.renderer.render(this.upScene, this.upCam); }
    if (this.mblur) this._prevVP.copy(this._vp);
    if (snapped) cam.position.sub(this._snapD);
    cam.position.sub(this.shakeOffset); cam.rotation.z = rz;
    if (this.uiVisible) { lfxSet(LFX_UI); this.renderer.clearDepth(); this.renderer.render(this.ui.scene, this.ui.camera); }
    if (this.wipeActive) {
      const wu = this.wipeMat.uniforms; wu.uTime.value = this.time;
      if (this.pixelOn || this.wipeStyle === 'galaxy') { wu.uRes.value.copy(this.wipeArt); const cc = this.renderer.getClearAlpha(); this._cc ??= new THREE.Color(); this.renderer.getClearColor(this._cc); this.renderer.setRenderTarget(this.wipeRT); this.renderer.setClearColor(0x000000, 0); this.renderer.clear(); this.renderer.render(this.wipeScene, this.wipeCam); this.renderer.setClearColor(this._cc, cc);
        this.renderer.setRenderTarget(null); const u = this.wipeUpMat.uniforms; u.tArt.value = this.wipeRT.texture; u.uOff.value.set(0, 0); this.renderer.render(this.wipeUpScene, this.upCam); }
      else { this.renderer.getDrawingBufferSize(wu.uRes.value); this.renderer.clearDepth(); this.renderer.render(this.wipeScene, this.wipeCam); }
    }
  }

  /** pixel look: snap the camera to the art-pixel grid at its focus depth (where its view meets the ground, or 14 m);
   *  the sub-pixel remainder becomes the upscale's smooth offset, so the world never crawls under a drifting camera */
  _snap(cam) {
    this._snapOff.set(0, 0); if (!this.snapOn || !cam.isPerspectiveCamera) return false;
    cam.updateMatrixWorld(); const e = cam.matrixWorld.elements; const fy = -e[9]; const pos = cam.position;
    const D = fy < -0.04 ? Math.min(60, Math.max(4, -(pos.y) / fy)) : 14;
    const wpp = (2 * D * Math.tan((cam.fov * Math.PI) / 360)) / (cam.zoom || 1) / Math.max(1, ART.h); if (!(wpp > 1e-5)) return false;
    const px = (pos.x * e[0] + pos.y * e[1] + pos.z * e[2]) / wpp, py = (pos.x * e[4] + pos.y * e[5] + pos.z * e[6]) / wpp;
    const dx = Math.round(px) - px, dy = Math.round(py) - py;
    this._snapD.set(e[0] * dx + e[4] * dy, e[1] * dx + e[5] * dy, e[2] * dx + e[6] * dy).multiplyScalar(wpp); pos.add(this._snapD); cam.updateMatrixWorld();
    this._snapOff.set(dx, dy); return true;
  }

  // project a world position to UI plane coordinates (z=0)
  worldToUI(v, out = new THREE.Vector3()) {
    const p = v.clone().project(this.world.camera);
    return out.set(p.x * this.uiW, p.y * this.uiH, 0);
  }
  ndcToUI(ndc, out = new THREE.Vector3()) { return out.set(ndc.x * this.uiW, ndc.y * this.uiH, 0); }
}

export { damp, WipeShader };
