// Painted-miniature node pieces for the diorama map: enemy figurines baked from the real creature rigs into
// stop-motion fight poses (guard / wind-up / strike) on flocked wargame bases, elites on rocky plinths with war
// banners and a guarded chest, the guardian on a crag between braziers, a "?" rune shrine for events, Diogenes'
// barrel stall for the shop, an alchemist's pavilion with a bubbling cauldron for the lab, and Sir Isaac's own
// figurine (the real puppet, scaled down) with an orbiting apple. All toon-shaded; the engine inks the outlines.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCreature } from './creatures.js';
import { createProfessor } from './professor.js';
import * as T from './toon.js';
import { loadModel } from '../gfx/assets.js';
import { firePit } from './realworld.js';
import { ENCOUNTERS } from '../game/data/enemies.js';
import { TX, toonM, bevelBox, addMesh as M, pixTex, hash, propMats } from './diorama.js';
import { makeNoise } from '../gfx/pixel.js';

const V3 = THREE.Vector3; const TAU = Math.PI * 2;
const strHash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003; return h; };

// ---------------------------------------------------------------- baking a posed creature rig into static figurine meshes
function bake(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(); const byMat = new Map(); const loose = [];
  const v = new V3(), w = new V3(), q = new V3(), m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position || o.material?.visible === false) return; let vis = true; o.traverseAncestors((a) => { if (!a.visible) vis = false; }); if (!vis || !o.visible) return;
    if (o.material?.transparent && o.material.opacity < 0.3) return;
    const src = o.geometry, pos = src.attributes.position, nr = src.attributes.normal, cnt = pos.count; const P = new Float32Array(cnt * 3), N = new Float32Array(cnt * 3);
    m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m); const morph = src.morphAttributes?.position, inf = o.morphTargetInfluences, rel = src.morphTargetsRelative;
    for (let i = 0; i < cnt; i++) {
      v.fromBufferAttribute(pos, i);
      if (morph && inf) for (let k = 0; k < morph.length; k++) { const f = inf[k]; if (!f) continue; const a = morph[k]; if (rel) { v.x += a.getX(i) * f; v.y += a.getY(i) * f; v.z += a.getZ(i) * f; } else { v.x += (a.getX(i) - pos.getX(i)) * f; v.y += (a.getY(i) - pos.getY(i)) * f; v.z += (a.getZ(i) - pos.getZ(i)) * f; } }
      if (nr) w.fromBufferAttribute(nr, i); else w.set(0, 1, 0);
      if (o.isSkinnedMesh) { q.copy(v).addScaledVector(w, 0.01); o.applyBoneTransform(i, v); o.applyBoneTransform(i, q); w.subVectors(q, v); }
      v.applyMatrix4(m); w.applyMatrix3(nm).normalize(); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; N[i * 3] = w.x; N[i * 3 + 1] = w.y; N[i * 3 + 2] = w.z;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', src.attributes.uv ? src.attributes.uv.clone() : new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    if (src.index) g.setIndex(src.index.clone());
    if (Array.isArray(o.material) || src.attributes.color) { if (src.attributes.color) g.setAttribute('color', src.attributes.color.clone()); for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex); loose.push({ geo: g, mat: o.material }); return; }
    const key = o.material.uuid; if (!byMat.has(key)) byMat.set(key, { mat: o.material, geos: [] }); byMat.get(key).geos.push(g.index ? g : g);
  });
  const parts = [...loose]; for (const { mat, geos } of byMat.values()) { const idxd = geos.filter((g) => g.index), non = geos.filter((g) => !g.index); for (const set of [idxd, non]) if (set.length) { const mg = set.length > 1 ? mergeGeometries(set, false) : set[0]; if (mg) parts.push({ geo: mg, mat }); else for (const g of set) parts.push({ geo: g, mat }); } }
  return parts;
}
// a creature assembly (hydras get their separate heads and necks wired to the body's anchors, as in battle)
function assemble(id, seed) {
  const P = new THREE.Group(); const body = createCreature(id, seed); P.add(body.root); const apis = [body]; const heads = [];
  const nh = id === 'hydra' ? 3 : id === 'hydra_elder' ? 5 : 0; body.root.rotation.y = nh ? -0.55 : 0;
  for (let i = 0; i < nh; i++) { const h = createCreature('hydra_head', seed + i); const a = (i / (nh - 1) - 0.5) * 2; h.root.position.set(-1.6 + a * 2.0 + 0.0, 2.0 + Math.cos(a * 1.4) * 0.6 + (i % 2) * 0.4, 1.6 - Math.abs(a) * 0.3); h.root.rotation.y = -0.55; h.anchorPos = new V3(); h.anchorIdx = i; P.add(h.root); if (h.neckGroup) P.add(h.neckGroup); apis.push(h); heads.push(h); }
  const step = (dt) => { for (const a of apis) a.update(dt); for (const h of heads) body.anchor?.(h.anchorIdx, h.anchorPos); };
  if (nh) P.rotation.y = 0.55; // face the viewer like the others
  return { P, apis, step };
}
const BANK = new Map(); let chain = Promise.resolve();
const idle = () => new Promise((r) => setTimeout(r, 24));
/** baked figurine poses for a creature id: { guard, wind, strike, height } (built one at a time, cached for the session) */
export function figureFor(id) {
  if (BANK.has(id)) return BANK.get(id);
  const p = (chain = chain.then(idle).then(() => {
    let A; try { A = assemble(id, 3); } catch (e) { console.warn('figurine', id, e); return null; }
    const dt = 1 / 60; for (let i = 0; i < 40; i++) A.step(dt); const guard = bake(A.P);
    const it = Math.max(0.2, A.apis[0].impactTime || 0.3); for (const a of A.apis) a.act?.('attack'); let t = 0;
    while (t < it * 0.4) { A.step(dt); t += dt; } const wind = bake(A.P); while (t < it) { A.step(dt); t += dt; } const strike = bake(A.P);
    A.P.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(A.P); return { guard, wind, strike, height: box.max.y - box.min.y, box };
  }).catch((e) => { console.warn('figurine', id, e); return null; }));
  BANK.set(id, p); return p;
}
function instance(parts) { const g = new THREE.Group(); for (const p of parts) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = true; m.receiveShadow = true; g.add(m); } return g; }
/** a stop-motion figurine: three baked frames, visibility-switched */
function figurine(fig, scale) {
  const root = new THREE.Group(); const frames = { guard: instance(fig.guard), wind: instance(fig.wind), strike: instance(fig.strike) };
  for (const k in frames) { root.add(frames[k]); frames[k].visible = k === 'guard'; }
  root.scale.setScalar(scale); return { root, frames, set(k) { for (const f in frames) frames[f].visible = f === k; } };
}

// ---------------------------------------------------------------- shared bits: flocked bases, rings, banners, shrubs
const N = makeNoise(5);
// the painted top of a wargame base: packed sand and soil, pebbles with highlights, clumps of static-grass flock
let FLOCK = null; const flockTex = () => FLOCK || (FLOCK = (() => {
  const S = 64; const sand = [[92, 72, 46], [122, 98, 64], [150, 124, 84], [178, 152, 106]], grass = [[52, 86, 34], [74, 112, 44], [104, 142, 56], [146, 176, 74]];
  const F = (x, y) => N(x * 0.11 + 3, y * 0.11 + 7) * 0.7 + N(x * 0.33, y * 0.33) * 0.3;
  const t = pixTex(S, S, (x, y) => { const f = F(x, y); const d = hash(x * 1.7, y * 2.3); if (f > 0.56) { const k = Math.min(3, Math.floor((f - 0.56) * 9 + d * 1.6)); return grass[k]; } if (d > 0.965) return [196, 186, 170]; if (d > 0.94) return [70, 60, 50]; return sand[Math.min(3, Math.floor(N(x * 0.4 + 9, y * 0.4) * 2.2 + d * 1.6))]; }, { repeat: [1, 1] });
  return t; })());
let BM = null; const baseMats = () => BM || (BM = { rim: toonM({ color: '#3a2a20' }), rimGold: toonM({ color: '#c89a3a' }), flock: toonM({ map: flockTex() }), hero: toonM({ color: '#2a3a6a' }) });
function miniBase(rx, rz = rx, { rim = 'rim', h = 0.07 } = {}) {
  const g = new THREE.Group(); const Mb = baseMats();
  const prof = [[0.0, 0], [0.96, 0], [1.0, 0.012], [1.012, 0.04], [1.0, 0.85], [0.975, 1.0], [0.95, 1.0]].map(([r, y]) => new THREE.Vector2(r, y * h));
  const lg = new THREE.LatheGeometry(prof, 56); lg.scale(rx, 1, rz); M(lg, Mb[rim], g);
  const top = new THREE.CircleGeometry(0.955, 48).rotateX(-Math.PI / 2); top.scale(rx, 1, rz); const t = M(top, Mb.flock, g, 0, h - 0.002, 0); t.castShadow = false;
  // a few painted pebbles and a crooked twig on the flock
  return g;
}
function ringMaterial(color = '#ffcf5a') {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uCol: { value: new THREE.Color(color) } }, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uK; uniform vec3 uCol; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x);
        float ring = step(0.93, r) * step(r, 0.99); float dash = step(0.5, fract(a * 3.8197 + uTime * 0.3)) * step(1.02, r) * step(r, 1.08);
        float tick = step(0.8, fract(a * 1.9099 - uTime * 0.15)) * step(1.12, r) * step(r, 1.16); float glow = (1.0 - smoothstep(0.99, 1.32, r)) * step(0.99, r) * 0.28;
        float m = max(max(ring, dash), max(tick, glow)); if (m * uK < 0.02) discard; vec3 c = mix(uCol * 1.6, vec3(1.0, 0.98, 0.85), ring * 0.4);
        gl_FragColor = vec4(c, clamp(m * uK, 0.0, 1.0)); }`,
  });
}
function ring(r) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64).rotateX(-Math.PI / 2), ringMaterial()); m.scale.setScalar(r); m.userData.noInk = true; m.renderOrder = 3; return m; }
const WAVE = { value: 0 };
function bannerMat(tex) {
  const m = toonM({ map: tex, side: THREE.DoubleSide }); m.onBeforeCompile = ((prev) => (sh) => { prev?.(sh); sh.uniforms.uWave = WAVE; sh.vertexShader = 'uniform float uWave;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float wk = uv.x; transformed.z += sin(uWave * 3.2 + position.x * 9.0 + position.y * 3.0) * 0.045 * wk; transformed.y += sin(uWave * 2.1 + position.x * 6.0) * 0.012 * wk;'); })(m.onBeforeCompile);
  m.customProgramCacheKey = () => 'banner-wave'; return m;
}
function emblemTex(kind, field = '#9a1c22', ink = '#1a0e0a') {
  const c = document.createElement('canvas'); c.width = 48; c.height = 64; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = field; g.fillRect(0, 0, 48, 64);
  g.fillStyle = '#e8c060'; g.fillRect(0, 0, 48, 3); g.fillRect(0, 0, 3, 64); g.fillRect(45, 0, 3, 64); for (let x = 0; x < 48; x += 8) { g.fillStyle = field; g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 4, 56); g.lineTo(x + 8, 64); g.fill(); g.fillStyle = '#e8c060'; g.fillRect(x + 3, 55, 2, 2); }
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 3;
  if (kind === 'horns') { g.beginPath(); g.moveTo(10, 14); g.quadraticCurveTo(12, 30, 24, 30); g.quadraticCurveTo(36, 30, 38, 14); g.quadraticCurveTo(34, 26, 24, 24); g.quadraticCurveTo(14, 26, 10, 14); g.fill(); g.fillRect(17, 30, 14, 14); g.fillStyle = field; g.fillRect(19, 34, 3, 3); g.fillRect(26, 34, 3, 3); }
  else if (kind === 'apple') { g.fillStyle = '#e8d8a0'; g.beginPath(); g.arc(24, 30, 11, 0, TAU); g.fill(); g.fillStyle = '#3a6a2a'; g.fillRect(24, 14, 6, 4); g.fillStyle = '#4a2a14'; g.fillRect(23, 16, 2, 6); }
  else { g.beginPath(); g.moveTo(10, 44); g.lineTo(38, 16); g.stroke(); g.beginPath(); g.moveTo(38, 44); g.lineTo(10, 16); g.stroke(); g.fillRect(6, 40, 8, 4); g.fillRect(34, 40, 8, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
function banner(kind, { h = 1.4, w = 0.42, field = '#9a1c22' } = {}) {
  const g = new THREE.Group(); const Mt = propMats();
  const pole = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pole.push(new THREE.Vector2(0.018 - t * 0.004, t * h)); } pole.unshift(new THREE.Vector2(0.001, 0)); pole.push(new THREE.Vector2(0.001, h));
  M(new THREE.LatheGeometry(pole, 10), Mt.darkWood, g); const fin = [[0.001, 0], [0.03, 0.01], [0.022, 0.05], [0.04, 0.08], [0.001, 0.15]].map(([r, y]) => new THREE.Vector2(r, y)); M(new THREE.LatheGeometry(fin, 12), toonM({ color: '#d8a848' }), g, 0, h, 0);
  M(bevelBox(w + 0.08, 0.025, 0.025, 0.008), Mt.darkWood, g, w / 2, h - 0.08, 0);
  const geo = new THREE.PlaneGeometry(w, w * 1.33, 10, 12); geo.translate(w / 2 + 0.01, h - 0.08 - (w * 1.33) / 2, 0); const cloth = M(geo, bannerMat(emblemTex(kind, field)), g); cloth.castShadow = true;
  return g;
}
// tiny dropped gear for the battle bases: a round hoplite shield and a broken spear
let GEAR = null; const gear = () => GEAR || (GEAR = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#b8862e'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#8a1c1c'; x.beginPath(); x.arc(16, 16, 12, 0, TAU); x.fill(); x.fillStyle = '#e8c060'; x.fillRect(14, 6, 4, 20); x.fillRect(6, 14, 20, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  const sp = [[0.001, 0], [0.2, 0.0], [0.24, 0.02], [0.23, 0.045], [0.12, 0.06], [0.001, 0.065]].map(([r, y]) => new THREE.Vector2(r, y)); const sg = new THREE.LatheGeometry(sp, 28);
  const uv = sg.attributes.uv, p = sg.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.5 + 0.5, p.getZ(i) / 0.5 + 0.5);
  return { shield: sg, shieldM: toonM({ map: t }), shaft: new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), tip: new THREE.LatheGeometry([[0.001, 0], [0.018, 0.02], [0.012, 0.07], [0.001, 0.1]].map(([r, y]) => new THREE.Vector2(r, y)), 8) };
})());
function droppedGear(g, rnd) { const G = gear(); const Mt = propMats(); const s = M(G.shield, G.shieldM, g, (rnd() - 0.5) * 0.6, 0.075, 0.35 + rnd() * 0.15); s.rotation.set(-0.2, rnd() * TAU, 0.25); const sp = new THREE.Group(); sp.position.set((rnd() - 0.5) * 0.8, 0.09, -0.25); sp.rotation.set(0.4, rnd() * TAU, 1.2); g.add(sp); M(G.shaft, Mt.darkWood, sp); M(G.tip, toonM({ color: '#c8c0b0' }), sp, 0, 0.25, 0); }

// ---------------------------------------------------------------- which enemies stand on a battle node (the encounter itself is rolled on entry)
function groupFor(nd, run) {
  const E = ENCOUNTERS.wilderness; const h = strHash(nd.id + (run.seed || 1));
  if (nd.type === 'elite') { const opts = E.elite.filter((e) => !(run.foughtElites || []).includes(e[0])); const L = opts.length ? opts : E.elite; return L[h % L.length]; }
  if (nd.type === 'guardian') { const f = run.foughtElites || []; return [f.includes('minotaur') && !f.includes('hydra') ? 'hydra_elder' : f.includes('hydra') && !f.includes('minotaur') ? 'minotaur_king' : h % 2 ? 'hydra_elder' : 'minotaur_king']; }
  const pool = nd.row < 3 ? E.easy : E.hard; return pool[h % pool.length];
}
const FIG_SCALE = { satyr: 0.66, kobalos: 0.74, medusa: 0.6, minotaur: 0.7, hydra: 0.5, minotaur_king: 0.8, hydra_elder: 0.58 };

// ---------------------------------------------------------------- node pieces
export class NodeMini {
  constructor(nd, { run, dio }) {
    this.nd = nd; this.run = run; const [x, z] = dio.pos.get(nd.id); this.x = x; this.z = z; const y = dio.heightAt(x, z);
    const rnd = (this.rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(strHash(nd.id) + 11)); rnd();
    this.root = new THREE.Group(); this.root.position.set(x, y, z); this.root.name = 'node:' + nd.id; this.body = new THREE.Group(); this.root.add(this.body);
    this.figs = []; this.flames = []; this.glows = []; this.ph = rnd() * TAU; this.period = 2.4 + rnd() * 1.2; this.down = 0; this.downT = 0; this.reach = 0; this.hov = 0; this.kick = 0;
    const t = nd.type; const R = t === 'guardian' ? 1.75 : t === 'elite' ? 1.25 : 0.88; this.R = R;
    this.ring = ring(R + 0.12); this.ring.position.y = 0.02; this.root.add(this.ring);
    const hh = t === 'guardian' ? 3.6 : t === 'elite' ? 2.4 : 1.6; this.hit = new THREE.Mesh(new THREE.CylinderGeometry(R, R, hh, 12), new THREE.MeshBasicMaterial({ visible: false })); this.hit.position.y = hh / 2; this.hit.userData.node = nd; this.root.add(this.hit);
    if (t === 'battle' || t === 'elite' || t === 'guardian') this.buildFight(t, rnd); else if (t === 'event') this.buildShrine(rnd); else if (t === 'shop') this.buildShop(rnd); else if (t === 'lab') this.buildLab(rnd);
    this.flag = this.makeFlag(); this.flag.visible = false; this.body.add(this.flag);
  }
  makeFlag() { const f = banner('apple', { h: 0.62, w: 0.2, field: '#2a4a8a' }); f.position.set(this.R * 0.55, 0.06, -this.R * 0.35); f.rotation.y = -0.6; return f; }
  // ---- battles: enemy figurines mid-fight
  buildFight(t, rnd) {
    const ids = groupFor(this.nd, this.run); const big = t !== 'battle';
    if (t === 'battle') { const b = miniBase(this.R, this.R * 0.8); this.body.add(b); droppedGear(this.body, rnd); }
    else if (t === 'elite') { const b = miniBase(this.R, this.R * 0.85, { rim: 'rim', h: 0.09 }); this.body.add(b);
      loadModel('rock_moss_set_01#' + (strHash(this.nd.id) % 6)).then((o) => { T.toonify(o, { sat: 1.15, tint: '#f2e6ff', wind: 0 }); o.scale.setScalar(0.26); o.position.set(0, 0.04, -0.05); this.body.add(o); this.standOn(o); }).catch(() => {});
      const bn = banner('horns', { h: 1.9, w: 0.48 }); bn.position.set(-this.R * 0.62, 0.08, -this.R * 0.4); bn.rotation.y = 0.5; this.body.add(bn); this.chest(this.R * 0.62, 0.08, -this.R * 0.35, -0.5); }
    else { // the guardian's crag between braziers and banners
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.3; loadModel('rock_face_02').then((o) => { T.toonify(o, { sat: 1.1, tint: '#efe4ff', wind: 0 }); o.scale.setScalar(0.42 + (k % 2) * 0.1); o.position.set(Math.cos(a) * 0.75, -0.25, Math.sin(a) * 0.6 - 0.2); o.rotation.y = a + Math.PI / 2; this.body.add(o); }).catch(() => {}); }
      loadModel('rock_face_02').then((o) => { T.toonify(o, { sat: 1.1, tint: '#efe4ff', wind: 0 }); o.scale.setScalar(0.5); o.position.set(0, -0.32, -0.05); this.body.add(o); this.standOn(o); }).catch(() => {});
      for (const s of [-1, 1]) { const br = brazier(); br.position.set(s * 1.55, 0, 0.7); this.body.add(br); this.flames.push(br.userData.flame); const bn = banner('horns', { h: 2.5, w: 0.55, field: '#6a1018' }); bn.position.set(s * 1.25, 0, -0.9); bn.rotation.y = s > 0 ? Math.PI : 0; this.body.add(bn); }
      const l = new THREE.PointLight(0xff7a3a, 4, 7, 1.6); l.position.set(0, 1.6, 1.0); this.body.add(l); this.glows.push(l);
    }
    const stand = (this.standY ??= t === 'elite' ? 0.36 : t === 'guardian' ? 0.95 : 0.07); const n = ids.length; const xs = n === 1 ? [0] : n === 2 ? [-0.36, 0.36] : [-0.5, 0.06, 0.55];
    ids.forEach((id, i) => {
      figureFor(id).then((fig) => {
        if (!fig) return; const s = FIG_SCALE[id] ?? 0.5; const f = figurine(fig, s); const zz = n === 3 && i === 1 ? -0.22 : 0.05;
        f.root.position.set(xs[i] ?? 0, this.standY ?? stand, zz); f.root.rotation.y = (xs[i] ?? 0) * -0.5 + (big ? 0 : (rnd() - 0.5) * 0.3); f.home = f.root.position.clone(); f.homeRy = f.root.rotation.y; f.drop = 1; f.idx = i;
        this.body.add(f.root); this.figs.push(f);
      });
    });
  }
  /** put the figurines on top of a loaded rock (its bounding box, near the middle) */
  standOn(o) { this.body.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); const inv = new THREE.Matrix4().copy(this.body.matrixWorld).invert(); b.applyMatrix4(inv); this.standY = b.max.y - 0.06; for (const f of this.figs) f.home.y = this.standY; }
  chest(x, y, z, ry) { loadModel('treasure_chest').then((o) => { T.toonify(o, { sat: 1.3, wind: 0 }); o.scale.setScalar(0.42); o.position.set(x, y, z); o.rotation.y = ry; this.body.add(o); this.chestLid = o.getObjectByName('treasure_chest_lid'); }).catch(() => {}); }
  // ---- events: the "?" rune shrine
  buildShrine(rnd) {
    const pl = [[0.001, 0], [0.82, 0], [0.86, 0.03], [0.84, 0.07], [0.62, 0.08], [0.6, 0.12], [0.001, 0.12]].map(([r, y]) => new THREE.Vector2(r, y)); M(new THREE.LatheGeometry(pl, 40), propMats().stone, this.body);
    const st = stele(0.46, 1.1, 0.16, 7); const stone = toonM({ color: '#d8d0e8', map: graniteTex() }); const sm = M(st, stone, this.body, 0, 0.1, -0.08); sm.rotation.y = (rnd() - 0.5) * 0.2;
    const q = runeGlyph('?'); sm.add(q); q.position.set(0, 0.6, 0.118); q.scale.setScalar(1.25); this.glows.push(q);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.5; if (Math.sin(a) < -0.5) continue; const s2 = M(stele(0.12, 0.3 + rnd() * 0.15, 0.08, k), stone, this.body, Math.cos(a) * 0.68, 0.1, Math.sin(a) * 0.55); s2.rotation.set((rnd() - 0.5) * 0.15, -a + Math.PI / 2, (rnd() - 0.5) * 0.15); }
    for (const s of [-1, 1]) { const c = candleMini(); c.position.set(s * 0.32, 0.12, 0.3); this.body.add(c); this.flames.push(c.userData.flame); }
    this.motes = true;
  }
  // ---- shop: Diogenes' barrel stall
  buildShop(rnd) {
    const Mt = propMats(); const b = miniBase(this.R, this.R * 0.8, { rim: 'rim' }); this.body.add(b);
    loadModel('wine_barrel_01').then((o) => { T.toonify(o, { sat: 1.25, wind: 0 }); o.scale.setScalar(0.95); o.rotation.z = Math.PI / 2; o.rotation.y = 0.35; o.position.set(-0.32, 0.07 + 0.36, -0.12); this.body.add(o); }).catch(() => {});
    loadModel('wooden_crate_01').then((o) => { T.toonify(o, { sat: 1.2, wind: 0 }); o.scale.setScalar(0.6); o.position.set(0.45, 0.07, 0.2); o.rotation.y = -0.4; this.body.add(o); const o2 = o.clone(); o2.position.set(0.5, 0.29, 0.18); o2.rotation.y = 0.2; o2.scale.setScalar(0.5); this.body.add(o2); }).catch(() => {});
    loadModel('lantern_01').then((o) => { T.toonify(o, { sat: 1.2, wind: 0 }); o.traverse((m) => { if (m.isMesh && /glass/i.test(m.name)) { m.material = new THREE.MeshToonMaterial({ color: '#ffd890', emissive: '#ffa040', emissiveIntensity: 1.6, gradientMap: T.gradientMap([1, 1]) }); this.lamp = m.material; } }); o.scale.setScalar(1.25); o.position.set(0.18, 1.0, 0.34); this.body.add(o); }).catch(() => {});
    // striped awning on two poles leaning from the barrel
    for (const s of [-1, 1]) M(bevelBox(0.035, 1.1, 0.035, 0.01), Mt.darkWood, this.body, s * 0.62, 0.62, 0.42).rotation.x = -0.08;
    const aw = clothSheet(1.4, 0.8, (u, v, p) => p.set((u - 0.5) * 1.4, 1.18 - v * 0.32 - Math.sin(u * Math.PI) * 0.04 * v, 0.46 - v * 0.82)); const am = M(aw, toonM({ map: TX.cloth('#c83a3a', '#f4e6c4'), side: THREE.DoubleSide }), this.body); am.material.map.repeat.set(1.5, 1);
    const cp = coinPile(rnd); cp.position.set(0.12, 0.07, 0.4); this.body.add(cp);
    const sign = omegaSign(); sign.position.set(-0.62, 1.08, 0.48); this.body.add(sign);
  }
  // ---- lab: the alchemist's pavilion, cauldron on the fire, bubbling brew
  buildLab(rnd) {
    const b = miniBase(this.R, this.R * 0.85); this.body.add(b);
    const tent = pavilion(); tent.position.set(-0.12, 0.07, -0.3); this.body.add(tent);
    const fp = firePit({ seed: 4 }); fp.scale.setScalar(0.3); fp.position.set(0.3, 0.07, 0.38); this.body.add(fp);
    const cd = cauldron(); cd.position.set(0.3, 0.12, 0.38); this.body.add(cd); this.brew = cd.userData.brew; this.brewAt = new V3(0.3, 0.42, 0.38);
    loadModel('wine_bottles_01#' + (strHash(this.nd.id) % 4)).then((o) => { T.toonify(o, { sat: 1.3, wind: 0 }); for (let k = 0; k < 3; k++) { const c = k ? o.clone() : o; c.scale.setScalar(0.85); c.position.set(-0.62 + k * 0.1, 0.07, 0.42 - k * 0.05); this.body.add(c); } }).catch(() => {});
    void rnd;
  }
  /** reachable / visited / hovered state from the sheet */
  setState({ reachable, visited }) { this.reachable = reachable; if (visited && !this.visited) this.downT = 0; this.visited = visited; this.flag.visible = visited; }
  update(dt, t, { hover = false, near = true, fx = null } = {}) {
    const R = this.reachable ? 1 : 0; this.reach += (R - this.reach) * Math.min(1, dt * 5); this.hov += ((hover ? 1 : 0) - this.hov) * Math.min(1, dt * 10);
    this.ring.material.uniforms.uTime.value = t; this.ring.material.uniforms.uK.value = this.reach * (0.75 + Math.sin(t * 3 + this.ph) * 0.2) + this.hov * 0.8; this.ring.visible = this.reach > 0.02 || this.hov > 0.02;
    const bob = this.reach * (0.05 + Math.sin(t * 2.2 + this.ph) * 0.035) + this.hov * 0.06; this.body.position.y = bob; this.body.scale.setScalar(1 + this.hov * 0.06 + this.kick * 0.08); this.kick *= Math.exp(-dt * 6);
    if (this.chestLid) this.chestLid.rotation.x = -(this.visited ? 1.4 : this.hov * 0.35 + Math.max(0, Math.sin(t * 1.3 + this.ph)) ** 8 * 0.25);
    for (const fl of this.flames) if (fl) { fl.visible = !this.visited || this.nd.type === 'guardian'; }
    for (const gl of this.glows) { if (gl.isLight) gl.intensity = 3.5 + Math.sin(t * 9) * 0.6 + Math.sin(t * 23) * 0.4; else gl.material.opacity = this.visited ? 0.0 : 0.65 + Math.sin(t * 2 + this.ph) * 0.3 + this.hov * 0.3; }
    if (this.lamp) this.lamp.emissiveIntensity = this.visited ? 0.1 : 1.4 + Math.sin(t * 7 + this.ph) * 0.2;
    // stop-motion fighting: one figure at a time winds up and strikes forward; knocked flat once beaten
    if (this.visited) this.downT = Math.min(1, this.downT + dt * 2.2);
    for (const f of this.figs) {
      if (f.drop > 0) { f.drop = Math.max(0, f.drop - dt * 2.5); }
      const k = this.downT; const e = k * k * (3 - 2 * k);
      if (this.visited) { f.set('guard'); f.root.rotation.order = 'YXZ'; const side = f.idx % 2 ? -1 : 1; f.root.rotation.set(0, f.homeRy, side * e * 1.42); f.root.position.set(f.home.x + side * e * 0.05, f.home.y + e * 0.05, f.home.z); continue; }
      const n = this.figs.length; const cyc = (t + this.ph) / this.period; const who = Math.floor(cyc) % n; const c = cyc - Math.floor(cyc); const act = near && f.idx % n === who;
      let pose = 'guard', lunge = 0; const hp = this.hov > 0.5 ? (t * 1.6 + f.idx * 0.33) % 1 : -1; const cc = hp >= 0 ? hp : c;
      if (act || hp >= 0) { if (cc < 0.2) { pose = 'wind'; lunge = -0.05; } else if (cc < 0.42) { pose = 'strike'; lunge = 0.13; if (fx && !f.puffed) { f.puffed = true; fx(this.root.localToWorld(f.root.position.clone().add(new V3(0, 0, 0.25)))); } } else f.puffed = false; }
      f.set(pose); const hop = f.drop > 0 ? Math.sin((1 - f.drop) * Math.PI) * 0.0 + f.drop * f.drop * 1.2 : 0;
      f.root.position.set(f.home.x, f.home.y + hop + (pose === 'strike' ? 0.02 : Math.abs(Math.sin(t * 2.6 + f.idx)) * 0.012), f.home.z + lunge); f.root.rotation.set(pose === 'wind' ? -0.06 : pose === 'strike' ? 0.08 : 0, f.homeRy, 0);
    }
  }
}

// ---------------------------------------------------------------- Sir Isaac's figurine (the real puppet at miniature scale) with an orbiting apple
export function heroMini() {
  const root = new THREE.Group(); root.name = 'hero-mini'; const body = new THREE.Group(); root.add(body);
  const b = miniBase(0.36, 0.36, { rim: 'hero', h: 0.06 }); body.add(b); const glow = ring(0.48); glow.material.uniforms.uCol.value.set('#8ad8ff'); glow.position.y = 0.015; root.add(glow);
  let api = null; try { api = createProfessor(); api.root.scale.setScalar(0.68); api.root.position.y = 0.06; body.add(api.root); } catch (e) { console.warn('hero mini', e); }
  const orbit = new THREE.Group(); orbit.position.y = 1.15; body.add(orbit); const apple = new THREE.Group(); apple.position.set(0.5, 0, 0); orbit.add(apple);
  if (!api?.appleWorld) loadModel('food_apple_01').then((o) => { T.toonify(o, { sat: 1.45, wind: 0 }); o.scale.setScalar(3.2); apple.add(o); }).catch(() => {}); // the young hero carries his own orbiting apple
  return {
    root, body, api, walk: 0,
    update(dt, t) { api?.update(dt); orbit.rotation.y = t * 1.8; orbit.rotation.z = Math.sin(t * 0.9) * 0.25; apple.rotation.y = -t * 3; apple.position.y = Math.sin(t * 3.6) * 0.05; glow.material.uniforms.uTime.value = t; glow.material.uniforms.uK.value = 0.5 + Math.sin(t * 2.5) * 0.15; WAVE.value = t; },
  };
}

// ---------------------------------------------------------------- small props
function stele(w, h, d, seed) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2 * 0.92, h * 0.78); s.quadraticCurveTo(w / 2 * 0.8, h, 0, h); s.quadraticCurveTo(-w / 2 * 0.8, h, -w / 2 * 0.92, h * 0.78); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 3, curveSegments: 10, steps: 2 }); g.translate(0, 0, -d / 2);
  const p = g.attributes.position; const n = makeNoise(seed + 3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = (n(x * 9 + seed, y * 9) - 0.5) * 0.03; p.setXYZ(i, x + k, y, z + k * 0.6); } g.computeVertexNormals(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 3); return g;
}
function runeGlyph(ch) {
  const c = document.createElement('canvas'); c.width = 48; c.height = 64; const g = c.getContext('2d'); g.font = '48px "Alagard"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(120,230,255,0.35)'; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) g.fillText(ch, 24 + dx, 34 + dy); g.fillStyle = '#e8fbff'; g.fillText(ch, 24, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.7, 1.4, 1.8), toneMapped: false })); m.userData.noInk = true; m.renderOrder = 4; return m;
}
function candleMini() {
  const g = new THREE.Group(); const wax = toonM({ color: '#efe2c4' }); const p = [[0.001, 0], [0.035, 0], [0.036, 0.16], [0.03, 0.175], [0.001, 0.17]].map(([r, y]) => new THREE.Vector2(r, y)); M(new THREE.LatheGeometry(p, 14), wax, g);
  const f = T.animeFlame(0.07, 0.13); f.position.y = 0.17; g.add(f); g.userData.flame = f; return g;
}
function brazier() {
  const g = new THREE.Group(); const iron = propMats().iron; const bowl = [[0.001, 0.0], [0.12, 0.0], [0.24, 0.08], [0.3, 0.2], [0.28, 0.22], [0.2, 0.12], [0.001, 0.1]].map(([r, y]) => new THREE.Vector2(r, y)); M(new THREE.LatheGeometry(bowl, 24), iron, g, 0, 0.62, 0);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; const leg = M(bevelBox(0.035, 0.72, 0.035, 0.01), iron, g, Math.cos(a) * 0.12, 0.33, Math.sin(a) * 0.12); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
  const f = T.animeFlame(0.42, 0.75); f.position.y = 0.78; g.add(f); g.userData.flame = f; return g;
}
function clothSheet(w, d, fn, cols = 14, rows = 8) {
  const pos = [], uv = [], idx = []; const p = new V3(); for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const u = i / cols, v = j / rows; fn(u, v, p); if (j === rows) p.y -= (Math.floor(u * cols) % 2 ? 0.04 : 0); pos.push(p.x, p.y, p.z); uv.push(u * w * 2, v * d * 2); }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, dd = c + 1; idx.push(a, c, b, b, c, dd); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function pavilion() {
  const g = new THREE.Group(); const segs = 40, rows = 14, pos = [], uv = [], idx = []; const H = 1.05, Rb = 0.5;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= segs; i++) { const u = i / segs, v = j / rows; const a = u * TAU; const sc = 1 + Math.cos(a * 8) * 0.04 * v; const r = Rb * Math.pow(v, 0.85) * sc * (1 - Math.sin(v * Math.PI) * 0.08); const y = H * (1 - v) - (j === rows ? (i % 5 < 2 ? 0.04 : 0) : 0); pos.push(Math.cos(a) * r, y + 0.0, Math.sin(a) * r); uv.push(u * 8, v * 2); }
  for (let j = 0; j < rows; j++) for (let i = 0; i < segs; i++) { const a = j * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const tm = toonM({ map: TX.cloth('#5a2a8a', '#e8c060'), side: THREE.DoubleSide }); M(geo, tm, g, 0, 0.05, 0);
  const fin = [[0.001, 0], [0.025, 0.01], [0.018, 0.08], [0.04, 0.12], [0.001, 0.2]].map(([r, y]) => new THREE.Vector2(r, y)); M(new THREE.LatheGeometry(fin, 12), toonM({ color: '#e0b050' }), g, 0, H + 0.03, 0);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: starTex(), transparent: true, depthWrite: false })); st.position.set(0, 0.62, Rb * 0.62 + 0.03); st.rotation.x = -0.32; st.userData.noInk = true; g.add(st);
  return g;
}
let STAR = null; const starTex = () => STAR || (STAR = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.fillStyle = '#f0c850'; const P = [[7, 1], [8, 1], [7, 2], [8, 2], [6, 5], [9, 5], [1, 6], [14, 6], [2, 7], [13, 7]]; for (const [a, b] of P) x.fillRect(a, b, 1, 1); x.fillRect(6, 3, 4, 8); x.fillRect(3, 6, 10, 3); x.fillRect(4, 11, 2, 3); x.fillRect(10, 11, 2, 3); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; })());
function cauldron() {
  const g = new THREE.Group(); const iron = propMats().iron; const P = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const a = -Math.PI * 0.5 + t * Math.PI * 0.85; P.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * 0.2), 0.16 + Math.sin(a) * 0.16)); } P.push(new THREE.Vector2(0.15, 0.3), new THREE.Vector2(0.17, 0.31), new THREE.Vector2(0.17, 0.33), new THREE.Vector2(0.14, 0.33), new THREE.Vector2(0.13, 0.3));
  M(new THREE.LatheGeometry(P, 28), iron, g); for (const s of [-1, 1]) { const h = M(new THREE.TorusGeometry(0.045, 0.01, 8, 20), iron, g, s * 0.2, 0.26, 0); h.rotation.y = Math.PI / 2; }
  const brew = new THREE.MeshToonMaterial({ color: '#6aff8a', emissive: '#2aff6a', emissiveIntensity: 0.9, gradientMap: T.gradientMap([1, 1]) }); M(new THREE.CircleGeometry(0.135, 24).rotateX(-Math.PI / 2), brew, g, 0, 0.3, 0).castShadow = false; g.userData.brew = brew;
  return g;
}
function coinPile(rnd) { const g = new THREE.Group(); const gold = toonM({ color: '#f0c050' }); const cg = new THREE.LatheGeometry([[0.001, 0], [0.05, 0], [0.052, 0.006], [0.05, 0.012], [0.001, 0.012]].map(([r, y]) => new THREE.Vector2(r, y)), 16); for (let i = 0; i < 9; i++) { const c = M(cg, gold, g, i < 5 ? 0 : (rnd() - 0.5) * 0.24, i < 5 ? i * 0.012 : 0, i < 5 ? 0 : (rnd() - 0.5) * 0.18); c.rotation.set(i < 5 ? 0 : (rnd() - 0.5) * 0.4, rnd() * TAU, 0); c.castShadow = false; } return g; }
function omegaSign() { const g = new THREE.Group(); const Mt = propMats(); M(bevelBox(0.3, 0.22, 0.03, 0.01), Mt.wood, g); const c = document.createElement('canvas'); c.width = 32; c.height = 24; const x = c.getContext('2d'); x.font = '16px "Alagard"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#2a1206'; x.fillText('Ω', 16, 13); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; const p = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.19), new THREE.MeshBasicMaterial({ map: t, transparent: true })); p.position.z = 0.022; p.userData.noInk = true; g.add(p); return g; }

let GRAN = null; function graniteTex() { return GRAN || (GRAN = pixTex(32, 32, (x, y) => { const v = N(x * 0.35 + 2, y * 0.35) * 0.6 + hash(x, y) * 0.4; const moss = N(x * 0.2 + 9, y * 0.2 + 4) > 0.66 && y > 18; if (moss) return v > 0.5 ? [112, 150, 70] : [84, 120, 56]; const R = [[92, 88, 104], [118, 114, 130], [146, 140, 154], [178, 172, 180]]; return R[Math.min(3, Math.floor(v * 4))]; }, { repeat: [1, 1] })); }
