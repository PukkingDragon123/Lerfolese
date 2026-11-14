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

const WipeShader = {
  uniforms: { uT: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1.7 }, uColor: { value: new THREE.Color(0x120d1c) }, uTime: { value: 0 }, uMode: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform float uT, uAspect, uTime, uMode; uniform vec2 uCenter; uniform vec3 uColor; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  void main(){
    vec2 p = vUv - uCenter; p.x *= uAspect;
    // pixelate the edge so the wipe matches the pixel-art style
    vec2 q = floor(vUv * vec2(uAspect, 1.0) * 120.0) / 120.0;
    float n = noise(q * 9.0 + uTime * 0.6) * 0.18 + noise(q * 23.0) * 0.08;
    float r = (1.0 - uT) * 1.25;
    float d = length(p) + n * (uMode > 0.5 ? 0.0 : 1.0);
    float a = uMode > 0.5 ? step(1.0 - uT, vUv.x + n * 0.5 - 0.15 + (1.0-vUv.y)*0.15) : step(r, d);
    if (a < 0.5) discard;
    // a thin glowing rim like a gravity string
    gl_FragColor = vec4(uColor, 1.0);
  }`,
};

// render resolution: supersample on 1x screens, full device resolution (capped at 2x) on hi-dpi ones
const hiRes = (q) => { const d = window.devicePixelRatio || 1; return q === 'low' ? Math.max(1, Math.min(d, 1.25)) : q === 'medium' ? Math.min(2, Math.max(1.25, d)) : Math.min(2, Math.max(1.5, d)); };

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

  // cinematic wipe: closes to color, runs fn, opens. center in 0..1 screen coords
  async wipe(fn, { center = [0.5, 0.5], color = 0x120d1c, dur = 0.55, mode = 0 } = {}) {
    const u = this.wipeMat.uniforms; u.uCenter.value.set(center[0], 1 - center[1]); u.uColor.value.set(color); u.uMode.value = mode;
    this.wipeActive = true;
    await tweens.to(u.uT, { value: 1 }, dur, { ease: 'inCubic' });
    if (fn) await fn();
    await tweens.wait(0.08);
    await tweens.to(u.uT, { value: 0 }, dur * 1.1, { ease: 'outCubic' });
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
    if (this.wipeActive) { this.wipeMat.uniforms.uTime.value = this.time; this.renderer.clearDepth(); this.renderer.render(this.wipeScene, this.wipeCam); }
  }

  // project a world position to UI plane coordinates (z=0)
  worldToUI(v, out = new THREE.Vector3()) {
    const p = v.clone().project(this.world.camera);
    return out.set(p.x * this.uiW, p.y * this.uiH, 0);
  }
  ndcToUI(ndc, out = new THREE.Vector3()) { return out.set(ndc.x * this.uiW, ndc.y * this.uiH, 0); }
}

export { damp };
