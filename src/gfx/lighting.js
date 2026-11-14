// Realistic golden-hour lighting for the cel-shaded stages (battle, event, travel): a physically placed warm sun whose
// soft PCF shadow frustum is fitted tightly round the action, a sky / ground hemisphere (cool skylight from above, warm
// grass-and-earth bounce on undersides), a low warm bounce from the sunlit ground, a cool sky fill from the opposite side,
// plus pixel-banded contact shadows under every character (they ground the figures even where shadow maps are off).
import * as THREE from 'three';

// per theme: sun colour / intensity, sky + ground (hemisphere) colours and level, bounce, fill
// moody, realistic dusk: a believable low sun (not a floodlight), a dim sky dome, little bounce, deep shadows
export const LIGHT_LOOKS = {
  meadow: { sun: '#ffc48a', k: 2.15, sky: '#7e9ccc', gnd: '#4a3e22', hemi: 0.3, bounce: '#e8b070', bk: 0.16, fill: '#6e88c0', fk: 0.18 },
  garden: { sun: '#ffcc98', k: 2.1, sky: '#82a0cc', gnd: '#46402a', hemi: 0.31, bounce: '#e8b880', bk: 0.15, fill: '#7690c4', fk: 0.18 },
  gully: { sun: '#ffb874', k: 2.3, sky: '#8296c0', gnd: '#5a3e24', hemi: 0.28, bounce: '#e8a466', bk: 0.2, fill: '#6a84bc', fk: 0.16 },
  labyrinth: { sun: '#ffb070', k: 2.2, sky: '#7c8cba', gnd: '#523e2a', hemi: 0.28, bounce: '#e8a870', bk: 0.18, fill: '#6c82ba', fk: 0.16 },
  marsh: { sun: '#f0d0a4', k: 1.8, sky: '#8aa0b4', gnd: '#384428', hemi: 0.36, bounce: '#c8b888', bk: 0.12, fill: '#7c94b0', fk: 0.2 },
  guardian: { sun: '#ff9460', k: 2.0, sky: '#6a6498', gnd: '#4a2a24', hemi: 0.28, bounce: '#e88a58', bk: 0.18, fill: '#6a5cac', fk: 0.2 },
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

// ---------------------------------------------------------------- grades (engine GradeShader params): rich, natural colour
// sat / vib lift colour without clipping; sel = selective boosts for [greens, golds, skies]; skin is protected in the shader;
// harmony only nudges hues (no saturation pull) so the painterly unity stays without washing colour out
// natural, slightly desaturated: highlights protected (roll-off), real blacks (a touch of contrast, almost no lift),
// vibrance kept low so the colour reads rich but believable rather than candy
export const GRADE_DAY = { sat: 0.9, vib: 0.12, sel: [0.08, 0.06, 0.06], contrast: 1.1, vignette: 0.36, grain: 0.008, warmth: 0.06, lift: [0.006, 0.004, 0.012], gain: [1.0, 0.98, 0.95], rolloff: 0.48, toe: 0.012, harmony: 0.06, hueLight: 0.1, hueShadow: 0.62, satPull: 0 };
export const GRADE_BATTLE = { ...GRADE_DAY, sat: 0.88, contrast: 1.12, vignette: 0.4 };
export const GRADE_TRAVEL = { ...GRADE_DAY, vignette: 0.42, warmth: 0.1 };
export const GRADE_MAP = { ...GRADE_DAY, sat: 0.92, vib: 0.14, vignette: 0.5, warmth: 0.08, harmony: 0.08 };
/** tone-mapping exposure per place: expose for the highlights, let the shadows fall */
export const EXPOSURE = { battle: 0.8, travel: 0.84, event: 0.84, map: 0.9 };
