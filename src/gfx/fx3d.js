// Physical combat feedback in 3D, plus restrained shader magic.
// - Debris: pooled instanced chunks of whatever hit (apple pieces, stone shards, wood splinters, water droplets) that
//   fly, tumble, bounce on the ground with gravity, settle and shrink away.
// - Dust kicked up from the ground and a few fine pixel sparks (the existing particle systems).
// - Knockback: spring-driven root offset + lean-back tilt + stagger dip on the hit body.
// - Attack choreography helpers: anticipation lean, fast lunge, delayed recoil back to the slot.
// - Magic (only for magic / energy / law moves and casts): animated ground rune decal, swirling energy ribbons,
//   a fresnel energy orb, flickering branching 3D lightning, layered noise-shader flames and a gravity swirl.
import * as THREE from 'three';
import { tweens } from '../core/tween.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

// ---------------------------------------------------------------- debris (instanced, pooled)
function chunkGeo(seed, sx = 1, sy = 1, sz = 1, detail = 1) { // an irregular rock-like chunk (jittered icosphere, smooth normals)
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; let s = seed * 9301 + 49297;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const jit = new Map(); for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!jit.has(key)) jit.set(key, 0.7 + r() * 0.5); const k = jit.get(key); p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz); }
  g.computeVertexNormals(); return g;
}
function appleGeo() { // skin on one side, flesh on the cut faces (vertex colours)
  const g = chunkGeo(3, 1, 0.8, 1); const p = g.attributes.position; const col = new Float32Array(p.count * 3); const skin = new THREE.Color('#b8202a'), flesh = new THREE.Color('#f6e2b8');
  for (let i = 0; i < p.count; i++) { const c = p.getY(i) > -0.1 ? skin : flesh; col.set([c.r, c.g, c.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const TYPES = {
  apple: { geo: () => appleGeo(), mat: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }), size: [0.05, 0.11], bounce: 0.25, life: 1.6 },
  stone: { geo: () => chunkGeo(7, 1, 0.75, 0.9, 0), mat: () => new THREE.MeshStandardMaterial({ color: '#8a8078', roughness: 0.9, flatShading: false }), size: [0.04, 0.12], bounce: 0.35, life: 2.0 },
  wood: { geo: () => chunkGeo(5, 2.8, 0.45, 0.45, 0), mat: () => new THREE.MeshStandardMaterial({ color: '#a8703e', roughness: 0.8 }), size: [0.035, 0.07], bounce: 0.3, life: 1.6 },
  water: { geo: () => new THREE.IcosahedronGeometry(1, 2), mat: () => new THREE.MeshStandardMaterial({ color: '#7cc6ff', roughness: 0.05, metalness: 0.1, emissive: '#1a4a7a', emissiveIntensity: 0.5 }), size: [0.025, 0.06], bounce: 0, life: 0.9, splash: true },
};
class Debris {
  constructor(scene, cap = 90) {
    this.sets = {};
    for (const k in TYPES) { const T = TYPES[k]; const m = new THREE.InstancedMesh(T.geo(), T.mat(), cap); m.count = 0; m.castShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); this.sets[k] = { T, m, list: [], cap }; }
    this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.mx = new THREE.Matrix4(); this.s = new THREE.Vector3();
  }
  burst(kind, pos, n, dir = 1, power = 1) {
    const S = this.sets[kind] || this.sets.stone;
    for (let i = 0; i < n && S.list.length < S.cap; i++) S.list.push({ p: pos.clone().add(new THREE.Vector3(rnd(-0.15, 0.15), rnd(-0.1, 0.2), rnd(-0.15, 0.15))), v: new THREE.Vector3(dir * rnd(1, 4.5) * power + rnd(-1.5, 1.5), rnd(2.5, 6.5) * power, rnd(-2, 2)), r: new THREE.Vector3(rnd(0, 6), rnd(0, 6), rnd(0, 6)), w: new THREE.Vector3(rnd(-14, 14), rnd(-14, 14), rnd(-14, 14)), size: rnd(...S.T.size), t: 0, rest: 0 });
  }
  update(dt) {
    for (const k in this.sets) {
      const S = this.sets[k]; const T = S.T; let n = 0;
      for (let i = S.list.length - 1; i >= 0; i--) {
        const d = S.list[i]; d.t += dt; d.v.y -= 15 * dt; d.p.addScaledVector(d.v, dt); d.r.addScaledVector(d.w, dt);
        const floor = d.size * 0.6;
        if (d.p.y < floor) { d.p.y = floor; if (T.splash) { d.t = Math.max(d.t, T.life); } else { d.v.y = Math.abs(d.v.y) * T.bounce; d.v.x *= 0.55; d.v.z *= 0.55; d.w.multiplyScalar(0.5); if (Math.abs(d.v.y) < 0.4) { d.v.y = 0; d.rest += dt; d.v.multiplyScalar(Math.max(0, 1 - dt * 8)); d.w.multiplyScalar(Math.max(0, 1 - dt * 8)); } } }
        if (d.t > T.life + 0.35) { S.list.splice(i, 1); continue; }
      }
      for (const d of S.list) { const fade = d.t > T.life ? 1 - (d.t - T.life) / 0.35 : 1; this.e.set(d.r.x, d.r.y, d.r.z); this.q.setFromEuler(this.e); this.s.setScalar(d.size * Math.max(0.01, fade)); this.mx.compose(d.p, this.q, this.s); S.m.setMatrixAt(n++, this.mx); }
      S.m.count = n; S.m.instanceMatrix.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------- magic shader meshes (additive, short-lived)
const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false };
const RUNE_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec2 vUv;
  void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.y, p.x);
    float ring = smoothstep(0.03, 0.0, abs(r - 0.92)) + smoothstep(0.02, 0.0, abs(r - 0.82)) + 0.7 * smoothstep(0.02, 0.0, abs(r - 0.5));
    float ticks = step(0.82, r) * step(r, 0.92) * step(0.72, fract(a * 6.366 + uT * 0.6));
    float glyph = step(0.55, r) * step(r, 0.78) * step(0.55, fract(a * 3.183 - uT * 0.35)) * step(0.3, fract(r * 9.0 + a * 1.2));
    float hex = 0.0; for (int i = 0; i < 3; i++) { float ang = float(i) * 2.0944 + uT * 0.25; vec2 n = vec2(cos(ang), sin(ang)); hex += smoothstep(0.018, 0.0, abs(dot(p, n) - 0.25)) * step(r, 0.5); }
    float m = (ring + ticks * 0.8 + glyph * 0.55 + hex * 0.8) * step(r, 1.0);
    float life = smoothstep(0.0, 0.15, uLife) * smoothstep(1.0, 0.7, uLife);
    gl_FragColor = vec4(uCol * m * life * 1.8, m * life); }`;
const RIBBON_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec2 vUv;
  void main(){ float s = fract(vUv.x * 2.0 - uT * 1.6); float head = smoothstep(0.0, 0.85, s) * smoothstep(1.0, 0.9, s); float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float life = smoothstep(0.0, 0.2, uLife) * smoothstep(1.0, 0.6, uLife); float a = head * life * (0.5 + 0.5 * edge);
    gl_FragColor = vec4(mix(uCol, vec3(1.0), head * head * 0.6) * a * 2.2, a); }`;
const ORB_VS = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }`;
const ORB_FS = `uniform float uT, uLife; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){ float f = pow(1.0 - max(0.0, dot(vN, vV)), 2.2); float sw = 0.5 + 0.5 * sin(vP.y * 9.0 + atan(vP.z, vP.x) * 3.0 - uT * 7.0);
    float life = smoothstep(0.0, 0.15, uLife) * smoothstep(1.0, 0.65, uLife); float a = (f * 1.4 + sw * 0.18) * life;
    gl_FragColor = vec4(mix(uCol, vec3(1.0), f * 0.5) * a * 2.0, a); }`;
const FLAME_FS = `uniform float uT, uLife; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  void main(){ vec2 uv = vUv; float fb = n(uv * vec2(4.0, 6.0) - vec2(0.0, uT * 3.5)) * 0.6 + n(uv * vec2(9.0, 12.0) - vec2(0.0, uT * 6.0)) * 0.4;
    float shape = (1.0 - abs(uv.x - 0.5) * 2.2 / max(0.15, 1.0 - uv.y)) - uv.y * 0.9 + fb * 0.7 - 0.25;
    float life = smoothstep(0.0, 0.12, uLife) * smoothstep(1.0, 0.55, uLife); float m = smoothstep(0.0, 0.25, shape) * life;
    vec3 col = mix(vec3(0.9, 0.18, 0.05), vec3(1.0, 0.75, 0.2), smoothstep(0.1, 0.6, shape)); col = mix(col, vec3(1.0, 0.97, 0.8), smoothstep(0.55, 0.9, shape));
    gl_FragColor = vec4(col * m * 1.8, m); }`;
const SWIRL_FS = `uniform float uT, uLife; varying vec2 vUv;
  void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.y, p.x); float arms = 0.5 + 0.5 * sin(a * 3.0 + log(r + 0.02) * 7.0 - uT * 9.0);
    float m = arms * smoothstep(1.0, 0.5, r) * smoothstep(0.08, 0.3, r); float core = smoothstep(0.3, 0.12, r);
    float life = smoothstep(0.0, 0.15, uLife) * smoothstep(1.0, 0.6, uLife);
    vec3 col = mix(vec3(0.45, 0.25, 1.0), vec3(0.55, 0.9, 1.0), arms); gl_FragColor = vec4(col * m * life * 1.8 - core * 0.0, (m + core * 0.6) * life); }`;
const UV_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const smat = (fs, col = '#9a7cf0', vs = UV_VS, extra = {}) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { uT: { value: 0 }, uLife: { value: 0 }, uCol: { value: new THREE.Color(col) } }, side: THREE.DoubleSide, ...ADD, ...extra });

export class FX3D {
  constructor(S) { this.S = S; this.scene = S.scene; this.debris = new Debris(S.scene); this.knocks = []; this.items = []; }
  // ---- physical
  hit(e, p, { dmg = 0, kind = 'magic', core = '', okind = '', big = false, crit = false } = {}) {
    const S = this.S; const v = S.enemyViews?.get(e.uid); const dir = 1; const power = big ? 1.3 : 0.9;
    const mat = kind === 'apple' ? 'apple' : kind === 'stone' ? 'stone' : kind === 'water' ? 'water' : okind === 'kinetic' ? 'stone' : null;
    if (mat) this.debris.burst(mat, p, big ? 14 : 8, dir, power);
    this.dust(new THREE.Vector3(p.x, 0.05, p.z), big ? 10 : 5);
    this.sparks(p, big ? 10 : 5, okind === 'burn' || kind === 'fire' ? 'fire' : okind === 'zap' ? 'zap' : 'hit');
    if (v) this.knock(v.api.root, dir, Math.min(1.4, 0.35 + dmg / 30) * (crit ? 1.4 : 1));
    // magic looks only for energy / elemental / untyped (law) moves
    if (okind === 'zap' || kind === 'zap') this.lightning(p.clone().add(new THREE.Vector3(-0.6, 2.2, 0.2)), p);
    if (okind === 'burn' || kind === 'fire') this.flame(new THREE.Vector3(p.x, 0, p.z + 0.2), big ? 1.6 : 1.1);
    if (core === 'gravity') this.swirl(p, big ? 2.4 : 1.8);
    if (kind === 'magic' && !mat && okind !== 'zap' && okind !== 'burn') { this.rune(new THREE.Vector3(p.x, 0, p.z), big ? 2.6 : 2, '#a888ff'); this.orb(p, big ? 0.5 : 0.38); }
  }
  hitPlayer(root, p, dmg) { this.debris.burst('wood', p.clone().add(new THREE.Vector3(0.2, -0.5, 0.2)), dmg >= 15 ? 10 : 6, -1, 0.9); this.dust(new THREE.Vector3(root.position.x, 0.05, root.position.z), 4); if (root) this.knock(root, -1, Math.min(1.2, 0.3 + dmg / 25)); }
  cast(pos, col = '#a888ff') { this.rune(new THREE.Vector3(pos.x, 0, pos.z), 2.4, col); this.ribbons(pos, col); }
  dust(pos, n) { const P = this.S.parts; if (!P) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; P.spawn({ pos: [pos.x, pos.y + 0.05, pos.z], vel: [Math.cos(a) * rnd(1, 2.6), rnd(0.3, 1.1), Math.sin(a) * rnd(0.6, 1.6)], life: rnd(0.5, 0.9), size: rnd(18, 30), size1: 44, color: pick(['#c8a478', '#b08a60', '#dcc09a']), alpha: 0.75, sprite: 'smoke', drag: 3 }); } }
  sparks(pos, n, kind = 'hit') { const G = this.S.glowParts; if (!G) return; const cols = kind === 'fire' ? ['#ffb040', '#ff7a1a', '#ffe08a'] : kind === 'zap' ? ['#e8fbff', '#8ee8ff', '#ffffff'] : ['#fff6cf', '#ffe08a', '#ffffff']; for (let i = 0; i < n; i++) G.spawn({ pos: [pos.x, pos.y, pos.z + 0.3], vel: [rnd(-4, 4), rnd(-1, 5), rnd(-1.5, 1.5)], life: rnd(0.2, 0.45), size: rnd(10, 18), color: pick(cols), sprite: kind === 'fire' ? 'ember' : 'spark2', grav: kind === 'fire' ? -2 : 9, drag: 2 }); }
  // spring knockback: root offset + lean-back tilt + stagger dip, settling back to where it started
  knock(root, dir, strength) {
    const old = this.knocks.find((k) => k.root === root); if (old) { old.v += dir * strength * 7; old.tv -= dir * strength * 2.4; return; }
    this.knocks.push({ root, x0: root.position.x, y0: root.position.y, rz0: root.rotation.z, off: 0, v: dir * strength * 7, tilt: 0, tv: -dir * strength * 2.4, t: 0, s: strength });
  }
  // enemy attack choreography: anticipation lean -> fast lunge -> (hit lands) -> follow-through and recoil to the slot
  async lunge(root, rest, targetX) {
    const x0 = root.position.x, dx = Math.sign(targetX - x0) || -1; const rz0 = root.rotation.z; const reach = Math.max(0.8, Math.min(3.4, Math.abs(targetX - x0) - 2.2));
    await tweens.to(root.position, { x: x0 - dx * 0.4 }, 0.26, { ease: 'outQuad', onUpdate: (e) => { root.rotation.z = rz0 + dx * 0.16 * e; } });
    await tweens.to(root.position, { x: x0 + dx * reach }, 0.12, { ease: 'inQuad', onUpdate: (e) => { root.rotation.z = rz0 + dx * (0.16 - 0.34 * e); } });
    this.dust(new THREE.Vector3(root.position.x, 0.05, root.position.z), 4);
    tweens.to(root.position, { x: rest.x }, 0.5, { delay: 0.5, ease: 'outCubic', onUpdate: (e) => { root.rotation.z = rz0 - dx * 0.18 * (1 - e); } }).then(() => { root.rotation.z = rz0; });
  }
  // ---- magic meshes
  add(mesh, life, upd) { this.scene.add(mesh); this.items.push({ mesh, life, t: 0, upd }); return mesh; }
  rune(pos, size = 2.2, col = '#a888ff') { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), smat(RUNE_FS, col)); m.position.set(pos.x, 0.04, pos.z); m.renderOrder = 2; return this.add(m, 1.4, (k, it) => { m.rotation.y = it.t * 0.6; }); }
  ribbons(pos, col = '#a888ff') {
    for (let r = 0; r < 3; r++) { const ph = r * 2.094, rad = 0.65 + r * 0.08; const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector3(Math.cos(ph + t * 9) * rad * (1 - t * 0.3), t * 2.2, Math.sin(ph + t * 9) * rad * (1 - t * 0.3))); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.022, 5), smat(RIBBON_FS, col)); m.position.set(pos.x, 0.1, pos.z); this.add(m, 1.2, (k, it) => { m.rotation.y = it.t * 2.5; }); }
  }
  orb(pos, r = 0.4, col = '#b48cff') { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 4), smat(ORB_FS, col, ORB_VS)); m.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0.4)); return this.add(m, 0.6, (k) => { m.scale.setScalar(0.6 + k * 1.2); }); }
  swirl(pos, size = 2) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), smat(SWIRL_FS)); m.position.copy(pos).add(new THREE.Vector3(0, 0, 0.5)); return this.add(m, 1.1, (k, it) => { m.quaternion.copy(this.S.camera.quaternion); m.scale.setScalar(1.15 - k * 0.5); }); }
  flame(pos, h = 1.2) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.7, h).translate(0, h / 2, 0), smat(FLAME_FS)); pl.rotation.y = (i / 3) * Math.PI; g.add(pl); } g.position.copy(pos); return this.add(g, 0.9, (k, it) => { for (const c of g.children) c.material.uniforms.uT.value = it.t; }); }
  lightning(from, to) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.2, 2.6), ...ADD }); const g = new THREE.Group(); g.userData.mat = mat;
    const build = () => { for (const c of g.children) c.geometry.dispose(); g.clear(); const main = jag(from, to, 9, 0.35); g.add(tube(main, 0.035, mat)); for (let b = 0; b < 2; b++) { const s = main[2 + b * 3]; const end = s.clone().add(new THREE.Vector3(rnd(-0.9, 0.9), rnd(-0.9, -0.2), rnd(-0.3, 0.3))); g.add(tube(jag(s, end, 4, 0.18), 0.02, mat)); } };
    build(); let acc = 0; return this.add(g, 0.5, (k, it, dt) => { acc += dt; if (acc > 0.06) { acc = 0; build(); } g.visible = Math.random() > 0.15; mat.opacity = 1 - k; });
  }
  update(dt) {
    this.debris.update(dt);
    for (let i = this.knocks.length - 1; i >= 0; i--) {
      const k = this.knocks[i]; k.t += dt; const acc = -150 * k.off - 15 * k.v; k.v += acc * dt; k.off += k.v * dt; const tacc = -110 * k.tilt - 11 * k.tv; k.tv += tacc * dt; k.tilt += k.tv * dt;
      k.root.position.x = k.x0 + k.off; k.root.rotation.z = k.rz0 + k.tilt; k.root.position.y = k.y0 - 0.08 * k.s * Math.exp(-k.t * 7) * Math.abs(Math.sin(k.t * 16));
      if (k.t > 1.4) { k.root.position.x = k.x0; k.root.position.y = k.y0; k.root.rotation.z = k.rz0; this.knocks.splice(i, 1); }
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.t += dt; const k = Math.min(1, it.t / it.life);
      it.mesh.traverse((o) => { if (o.material?.uniforms) { o.material.uniforms.uT.value = it.t; o.material.uniforms.uLife.value = k; } });
      it.upd?.(k, it, dt);
      if (it.t >= it.life) { this.scene.remove(it.mesh); it.mesh.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); it.mesh.userData.mat?.dispose(); this.items.splice(i, 1); }
    }
  }
}
function jag(a, b, n, amp) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; const p = a.clone().lerp(b, t); if (i > 0 && i < n) p.add(new THREE.Vector3(rnd(-amp, amp), rnd(-amp, amp) * 0.5, rnd(-amp, amp) * 0.5)); pts.push(p); } return pts; }
function tube(pts, r, mat) { const path = new THREE.CurvePath(); for (let i = 0; i + 1 < pts.length; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1])); return new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 2, r, 4), mat); }
