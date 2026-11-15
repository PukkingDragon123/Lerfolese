// Realistic golden-hour lighting for the cel-shaded stages (battle, event, travel): a physically placed warm sun whose
// soft PCF shadow frustum is fitted tightly round the action, a sky / ground hemisphere (cool skylight from above, warm
// grass-and-earth bounce on undersides), a low warm bounce from the sunlit ground, a cool sky fill from the opposite side,
// plus pixel-banded contact shadows under every character (they ground the figures even where shadow maps are off).
import * as THREE from 'three';

// per theme: sun colour / intensity, sky + ground (hemisphere) colours and level, bounce, fill
// colourful realistic golden hour (user, newest): a warm key that really lights the stage, a clear blue sky dome so
// shadows read cool and coloured (never grey or black), a warm earth bounce under chins and brims, a cool sky fill
export const LIGHT_LOOKS = { // (painterly, newest) a warm sun that sculpts, a clear blue sky dome filling every shadow with cool colour, a warm earth bounce
  meadow: { sun: '#ffc890', k: 2.6, sky: '#7ca2e4', gnd: '#5e4a2a', hemi: 0.62, bounce: '#f0b070', bk: 0.24, fill: '#7092dc', fk: 0.3 },
  garden: { sun: '#ffcc9c', k: 2.55, sky: '#84a8e2', gnd: '#564c2e', hemi: 0.62, bounce: '#f0bc80', bk: 0.22, fill: '#7696da', fk: 0.3 },
  gully: { sun: '#ffbc76', k: 2.7, sky: '#7e9cd8', gnd: '#6c4828', hemi: 0.58, bounce: '#f0a462', bk: 0.26, fill: '#6c8ad2', fk: 0.28 },
  labyrinth: { sun: '#ffb674', k: 2.6, sky: '#788ed0', gnd: '#60462c', hemi: 0.58, bounce: '#eea86c', bk: 0.24, fill: '#7086ce', fk: 0.28 },
  marsh: { sun: '#f6d6a8', k: 2.25, sky: '#84a8c6', gnd: '#404e2c', hemi: 0.66, bounce: '#d0bc88', bk: 0.18, fill: '#7c9cc4', fk: 0.3 },
  guardian: { sun: '#ffa068', k: 2.5, sky: '#7270b8', gnd: '#5a322a', hemi: 0.58, bounce: '#ee8e58', bk: 0.24, fill: '#7466c6', fk: 0.3 },
};

/** fit a directional light's ortho shadow camera round a world box (8 corners), tight on every side */
export function fitShadow(light, box, pad = 0.6) {
  light.updateMatrixWorld(true); light.target.updateMatrixWorld(true);
  const cam = light.shadow.camera; cam.position.copy(light.position); cam.lookAt(light.target.position); cam.updateMatrixWorld(true);
  const inv = cam.matrixWorldInverse; const v = new THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < 8; i++) { v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
  Object.assign(cam, { left: x0 - pad, right: x1 + pad, bottom: y0 - pad, top: y1 + pad, near: Math.max(0.1, -z1 - 8), far: -z0 + 8 }); cam.updateProjectionMatrix();
}

/**
 * the stage light rig. sunDir: direction TO the sun (key). box: what must cast / receive crisp shadows.
 * returns { sun, hemi, bounce, fill, group } (group already added to the scene)
 */
export function stageLights(scene, { theme = 'meadow', sunDir = new THREE.Vector3(-0.55, 0.62, 0.42), box = new THREE.Box3(new THREE.Vector3(-13, -0.5, -7.5), new THREE.Vector3(13, 4.5, 5.5)), target = new THREE.Vector3(0.3, 0, 0.2), mapSize = 4096, look = null } = {}) {
  const L = { ...(LIGHT_LOOKS[theme] || LIGHT_LOOKS.meadow), ...(look || {}) }; const g = new THREE.Group(); g.name = 'stageLights';
  const d = sunDir.clone().normalize(); if (d.y < 0.35) { d.y = 0.35; d.normalize(); } // keep shadows readable even at golden hour
  const sun = new THREE.DirectionalLight(L.sun, L.k); sun.position.copy(target).addScaledVector(d, 30); sun.target.position.copy(target);
  sun.castShadow = true; sun.shadow.mapSize.set(mapSize, mapSize); sun.shadow.bias = -0.00022; sun.shadow.normalBias = 0.028; sun.shadow.radius = 4; sun.shadow.blurSamples = 16; /* soft penumbrae */ g.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(L.sky, L.gnd, L.hemi); g.add(hemi);
  // warm light thrown back up by the sunlit ground: lights chins, sleeves, the undersides of crowns
  const bounce = new THREE.DirectionalLight(L.bounce, L.bk); bounce.position.copy(target).add(new THREE.Vector3(-d.x * 6, -8, -d.z * 6 + 4)); bounce.target.position.copy(target).setY(1); g.add(bounce, bounce.target);
  // the open sky opposite the sun: a cool fill that keeps shadow sides blue-violet rather than black
  const fill = new THREE.DirectionalLight(L.fill, L.fk); fill.position.copy(target).add(new THREE.Vector3(-d.x * 20, 14, -d.z * 20)); fill.target.position.copy(target); g.add(fill, fill.target);
  scene.add(g); fitShadow(sun, box); return { sun, hemi, bounce, fill, group: g };
}

// ---------------------------------------------------------------- contact shadows (pixel-banded, no soft gradients)
const CS_VS = `attribute vec4 aS; varying vec2 vP; varying float vA; void main(){ vP = position.xy * 2.0; vA = aS.w; vec3 p = aS.xyz + vec3(position.x * aS.w * 2.0, 0.0, position.y * aS.w * 1.1); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const CS_FS = `uniform float uAlpha; varying vec2 vP; varying float vA; void main(){ vec2 q = floor(vP * 12.0) / 12.0; float d = dot(q, q); if (d > 1.0) discard; float a = (d < 0.3 ? 1.0 : d < 0.62 ? 0.62 : 0.3) * uAlpha; gl_FragColor = vec4(0.07, 0.05, 0.09, a); }`;
const WHO = /^(professor|hero|satyr|kobalos|medusa|minotaur|hydra(?!_head)|centaur|harpy|cyclops|wolf|chimera|talos|spartoi|creature|npc|icarus|daedalus|sphinx|pythia|pan\b|archimedes|prometheus|sisyphus|narcissus)/i;
export class ContactShadows {
  constructor(scene, { hAt = null, cap = 16, alpha = 0.42 } = {}) {
    this.scene = scene; this.hAt = hAt; this.cap = cap; this.scan = 0; this.list = []; this.size = new WeakMap();
    const geo = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); geo.index = q.index; geo.setAttribute('position', q.attributes.position);
    this.attr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aS', this.attr); geo.instanceCount = 0; this.geo = geo;
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: CS_VS, fragmentShader: CS_FS, uniforms: { uAlpha: { value: alpha } }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; this.mesh.userData.noInk = true; this.mesh.userData.noAO = true; this.mesh.name = 'contactShadows'; scene.add(this.mesh);
    this.mesh.onBeforeRender = () => this.update();
  }
  radius(o) { if (this.size.has(o)) return this.size.get(o); const b = new THREE.Box3().setFromObject(o); const s = b.isEmpty() ? 0.6 : Math.max(0.35, Math.min(2.2, Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * 0.42)); this.size.set(o, s); return s; }
  update() {
    const now = performance.now(); if (now - this.scan > 1000) { this.scan = now; this.list = this.scene.children.filter((o) => o.visible && (o.userData.contactShadow || WHO.test(o.name || ''))).slice(0, this.cap); }
    const a = this.attr.array, p = new THREE.Vector3(); let n = 0;
    for (const o of this.list) { if (!o.visible || !o.parent) continue; o.getWorldPosition(p); const y = this.hAt ? this.hAt(p.x, p.z) : 0; const lift = Math.max(0, p.y - y); a.set([p.x, y + 0.025, p.z, this.radius(o) * Math.max(0.55, 1 - lift * 0.3)], n * 4); n++; }
    this.geo.instanceCount = n; this.attr.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- grades (engine GradeShader params): like a painting
// (newest) colour comes from the LIGHT, not from a saturation boost: warm lit planes against cool, coloured shadows
// (a blue-violet lift in the darks, a warm gain in the lights), a gentle S-curve with rolled-off highlights so nothing
// blows out, and a soft colour harmony pulling every hue toward one shared palette (warm gold light, blue-violet shade).
// Saturation and vibrance are only nudged, so the warm grass reads golden-olive instead of acid yellow-green.
export const GRADE_DAY = { sat: 1.03, vib: 0.16, sel: [0.0, 0.04, 0.12], contrast: 1.05, vignette: 0.32, grain: 0.006, warmth: 0.08, lift: [0.008, 0.014, 0.04], gain: [1.02, 1.0, 0.96], rolloff: 0.5, toe: 0.01, harmony: 0.1, hueLight: 0.09, hueShadow: 0.63, satPull: 0 };
export const GRADE_BATTLE = { ...GRADE_DAY, contrast: 1.06, vignette: 0.38 };
export const GRADE_TRAVEL = { ...GRADE_DAY, vignette: 0.36, warmth: 0.12 };
export const GRADE_MAP = { ...GRADE_DAY, sat: 1.0, vib: 0.14, sel: [0.0, 0.04, 0.12], vignette: 0.4, warmth: 0.1, harmony: 0.12 }; // the board's lawn is big: greens held back
export const EXPOSURE = { battle: 1.0, travel: 1.0, event: 1.02, map: 1.0 };
