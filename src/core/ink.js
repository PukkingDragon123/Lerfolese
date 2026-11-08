// Ink outline pass: anime/cartoon black lines from a depth + normal prepass (silhouettes, creases, contact lines).
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const InkShader = {
  uniforms: {
    tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uNear: { value: 0.1 }, uFar: { value: 400 }, uInk: { value: new THREE.Color(0x0e0710) }, uStrength: { value: 1 }, uThick: { value: 1 },
    uDepthK: { value: 0.045 }, uNormalK: { value: 0.42 }, uFade: { value: new THREE.Vector2(55, 140) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `#include <packing>
  uniform sampler2D tDiffuse, tNormal, tDepth; uniform vec2 uRes, uFade; uniform float uNear, uFar, uStrength, uThick, uDepthK, uNormalK; uniform vec3 uInk; varying vec2 vUv;
  float vz(vec2 uv){ float d = texture2D(tDepth, uv).x; return d >= 1.0 ? 1e4 : -perspectiveDepthToViewZ(d, uNear, uFar); }
  vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
  void main(){
    vec4 col = texture2D(tDiffuse, vUv);
    vec2 px = uThick / uRes; float d0 = vz(vUv); vec3 n0 = nrm(vUv);
    vec2 o[4]; o[0] = vec2(px.x, 0.0); o[1] = vec2(-px.x, 0.0); o[2] = vec2(0.0, px.y); o[3] = vec2(0.0, -px.y);
    float eD = 0.0, eN = 0.0;
    for (int i = 0; i < 4; i++) {
      float d1 = vz(vUv + o[i]); float near = min(d0, d1);
      // the nearer side draws the line, so silhouettes stay one ink pixel wide and sit on the object
      if (d1 > d0) eD = max(eD, smoothstep(uDepthK, uDepthK * 2.2, (d1 - d0) / max(near, 0.5)));
      if (d0 < 1e3 && d1 < 1e3) eN = max(eN, smoothstep(uNormalK, uNormalK + 0.25, 1.0 - dot(n0, nrm(vUv + o[i]))));
    }
    float e = max(eD, eN * 0.85) * (1.0 - smoothstep(uFade.x, uFade.y, d0)) * uStrength;
    gl_FragColor = vec4(mix(col.rgb, uInk, clamp(e, 0.0, 1.0)), col.a);
  }`,
};

export class InkPass extends Pass {
  constructor(scene, camera, w, h) {
    super(); this.scene = scene; this.camera = camera;
    this.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType) });
    this.normalMat = new THREE.MeshNormalMaterial();
    this.mat = new THREE.ShaderMaterial({ ...InkShader, uniforms: THREE.UniformsUtils.clone(InkShader.uniforms) });
    this.u = this.mat.uniforms; this.quad = new FullScreenQuad(this.mat); this._vis = new Map(); this._clear = new THREE.Color();
  }
  setSize(w, h) { this.rt.setSize(w, h); this.u.uRes.value.set(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    const sc = this.scene, cam = this.camera, vis = this._vis;
    // pre-pass: depth + view normals of solid geometry only (skip cut-outs, sprites, particles, invisible hit boxes)
    sc.traverse((o) => { vis.set(o, o.visible); const m = o.material; if (o.isPoints || o.isLine || o.isSprite || o.userData.noInk || o.userData.noAO || (m && !Array.isArray(m) && (m.visible === false || m.transparent || m.alphaTest > 0 || (m.isShaderMaterial && !o.userData.ink)))) o.visible = false; });
    const bg = sc.background, ov = sc.overrideMaterial, fog = sc.fog; renderer.getClearColor(this._clear); const ca = renderer.getClearAlpha();
    sc.background = null; sc.overrideMaterial = this.normalMat; sc.fog = null;
    renderer.setRenderTarget(this.rt); renderer.setClearColor(0x7f7fff, 1); renderer.clear(); renderer.render(sc, cam);
    sc.background = bg; sc.overrideMaterial = ov; sc.fog = fog; renderer.setClearColor(this._clear, ca);
    for (const [o, v] of vis) o.visible = v; vis.clear();
    this.u.tDiffuse.value = readBuffer.texture; this.u.tNormal.value = this.rt.texture; this.u.tDepth.value = this.rt.depthTexture;
    this.u.uNear.value = cam.near; this.u.uFar.value = cam.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
  dispose() { this.rt.dispose(); this.mat.dispose(); this.normalMat.dispose(); this.quad.dispose(); }
}
