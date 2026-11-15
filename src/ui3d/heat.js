// APPLE HEAT, the presentation side (rules: game/combos.js HEAT, game/battle.js addHeat / overheat / vent).
// Self-contained so the battle scene only has to create it and spread heatFx(S) into its fx hooks:
//  * ThermoGauge: a physical brass-and-walnut thermometer on the HUD. A faceted glass tube and bulb, a column of
//    molten "mercury" that climbs and glows red -> orange -> white-hot, a pixel-painted scale with the three zones
//    (warm / hot / scorching) and an engraved brass readout. It tilts and lifts under the pointer, rattles near the
//    top, flashes and judders when the apple overheats; its steam valve on top is the VENT button (once a turn).
//  * apple glow in the world: Newton's orbiting magic apple and every apple object hanging in the air heat up with
//    the gauge (emissive red -> white-hot), with a heat shimmer above them, smoke wisps when hot and embers when
//    scorching.
import * as THREE from 'three';
import { Surf, SurfTex, RAMP, pxTex, wood, brass, inscribe, measure, Body, inkHull, uiPos } from './craft.js';
import * as INST from './instruments.js'; // PlateTip (brass plates: no clouds in battle), else CloudTip
import { Spring, tweens } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { Particles } from '../gfx/particles.js';
import { HEAT, heatTier, hasApple } from '../game/combos.js';
import { BASICS } from '../game/data/cards.js';
import { ITEM_MODELS } from '../models/items3d.js';

// the heat curios borrow the nearest existing curio model until they get bespoke ones (a jar, a scale, a feather)
for (const [id, src] of [['ember', 'leyden'], ['salamander', 'gorgon_scale'], ['phoenix', 'icarus_feather']]) if (!ITEM_MODELS[id] && ITEM_MODELS[src]) ITEM_MODELS[id] = ITEM_MODELS[src];

const TAU = Math.PI * 2;
// the heat colour ramp: dull blood-red when cold, cherry, orange, straw, white-hot
const RAMP_HEAT = [[0, 0x5a120c], [3, 0xc0301a], [6, 0xff6a14], [9, 0xffc860], [10, 0xfff2d8]];
const _c = new THREE.Color(), _c2 = new THREE.Color(), _v = new THREE.Vector3();
export function heatColor(h, out = new THREE.Color()) {
  for (let i = 1; i < RAMP_HEAT.length; i++) { const [a, ca] = RAMP_HEAT[i - 1], [b, cb] = RAMP_HEAT[i]; if (h <= b || i === RAMP_HEAT.length - 1) { const k = Math.max(0, Math.min(1, (h - a) / (b - a))); return out.set(ca).lerp(_c2.set(cb), k); } }
  return out.set(RAMP_HEAT[0][1]);
}
const lathe = (pts, n) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), n); g.computeVertexNormals(); return g; };
const M = (geo, mat, parent, ink = 0) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (ink) inkHull(m, ink); return m; };
const texOf = (fn, w, h) => { const S = new Surf(w, h); fn(S); return pxTex(S.toCanvas(), { repeat: true }); };

// ================================================================ the thermometer
const TUBE = { y0: -1.25, y1: 1.6, r: 0.13 }; // the column runs from y0 (0 Heat) to y1 (10 Heat)
const hY = (h) => TUBE.y0 + (TUBE.y1 - TUBE.y0) * Math.max(0, Math.min(1, h / HEAT.max));
export class ThermoGauge extends Body {
  constructor() {
    super(); const p = this.pivot; this.tiltK = 0.06; this.hoverLift = 0.3;
    const woodM = new THREE.MeshStandardMaterial({ map: texOf((S) => wood(S, 0, 0, 16, 32, RAMP.walnut, { seed: 11, base: 2, vertical: true }), 16, 32), roughness: 0.74, flatShading: true, toneMapped: false });
    this.brassM = new THREE.MeshStandardMaterial({ map: texOf((S) => brass(S, 0, 0, 16, 16, { seed: 4, patina: 0.3 }), 16, 16), roughness: 0.36, metalness: 0.5, flatShading: true, toneMapped: false, emissive: 0x000000 });
    const glassM = new THREE.MeshStandardMaterial({ color: 0xe0f2f4, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide, flatShading: true, toneMapped: false });
    const edgeM = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.BackSide, toneMapped: false });
    this.liqM = new THREE.MeshStandardMaterial({ color: 0x5a120c, emissive: 0x5a120c, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.2, flatShading: true, toneMapped: false });
    // 1. the backboard: a walnut plank with an arched top and a flared foot, its face painted with the scale
    const sh = new THREE.Shape(); const BW = 0.62, BT = 2.15, BB = -2.55;
    sh.moveTo(-BW - 0.12, BB); sh.lineTo(BW + 0.12, BB); sh.lineTo(BW + 0.12, BB + 0.22); sh.lineTo(BW, BB + 0.42); sh.lineTo(BW, BT - 0.35);
    sh.quadraticCurveTo(BW, BT, 0, BT + 0.12); sh.quadraticCurveTo(-BW, BT, -BW, BT - 0.35); sh.lineTo(-BW, BB + 0.42); sh.lineTo(-BW - 0.12, BB + 0.22); sh.closePath();
    const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, curveSegments: 5 }); bg.translate(0, 0, -0.28);
    // the face texture spans the shape's box: wood, a recessed groove, tick marks, the three heat zones
    const FW = 24, FH = 96; const face = new Surf(FW, FH); wood(face, 0, 0, FW, FH, RAMP.walnut, { seed: 5, base: 3, vertical: true });
    const fy = (y) => Math.round((1 - (y - BB) / (BT + 0.12 - BB)) * (FH - 1)); const fx = (x) => Math.round(((x + BW + 0.12) / (2 * (BW + 0.12))) * (FW - 1));
    for (let y = fy(TUBE.y1 + 0.2); y <= fy(TUBE.y0 - 0.55); y++) for (let x = fx(-0.17); x <= fx(0.17); x++) face.shift(x, y, -2); // the groove behind the tube
    const zone = [[HEAT.warm, HEAT.hot, '#c8862a'], [HEAT.hot, HEAT.scorch, '#e05a1e'], [HEAT.scorch, HEAT.max, '#f4e2b0']];
    for (const [a, b, col] of zone) for (let y = fy(hY(b)); y <= fy(hY(a)); y++) for (let x = fx(-0.46); x <= fx(-0.3); x++) face.pix(x, y, y === fy(hY(a)) || x === fx(-0.46) ? '#3a1a0e' : col); // enamel bands on the left
    for (let h = 0; h <= HEAT.max; h++) { const y = fy(hY(h)); const big = h === HEAT.warm || h === HEAT.hot || h === HEAT.scorch || h === 0 || h === HEAT.max; for (let x = fx(0.22); x <= fx(big ? 0.5 : 0.36); x++) { face.pix(x, y, '#e8c87a'); face.pix(x, y + 1, '#2a120a'); } }
    const ft = pxTex(face.toCanvas(), { repeat: true }); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; const sw = 2 * (BW + 0.12), shh = BT + 0.12 - BB; ft.repeat.set(1 / sw, 1 / shh); ft.offset.set((BW + 0.12) / sw, -BB / shh);
    const faceM = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.7, flatShading: true, toneMapped: false });
    this.board = M(bg, [faceM, woodM], p, 0.035);
    // 2. brass: a hanging ring, the tube collars, the bulb cage, the foot
    const ring = M(new THREE.TorusGeometry(0.2, 0.05, 4, 8), this.brassM, p, 0.02); ring.position.set(0, BT + 0.3, -0.18);
    for (const y of [TUBE.y1 + 0.05, TUBE.y0 - 0.12]) { const c = M(lathe([[0.17, -0.07], [0.2, -0.04], [0.2, 0.04], [0.17, 0.07]], 8), this.brassM, p, 0.02); c.position.y = y; c.rotation.y = Math.PI / 8; }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; const bar = M(lathe([[0.025, -0.36], [0.03, 0], [0.025, 0.36]], 4), this.brassM, p); bar.position.set(Math.cos(a) * 0.4, TUBE.y0 - 0.72, Math.sin(a) * 0.4 + 0.02); bar.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
    const foot = M(lathe([[0.001, 0], [0.38, 0], [0.42, 0.06], [0.3, 0.14], [0.001, 0.16]], 8), this.brassM, p, 0.025); foot.position.y = TUBE.y0 - 1.18; foot.rotation.y = Math.PI / 8;
    // 3. the glass: a faceted tube and an apple-shaped bulb (the apple's own Heat lives in it)
    const tube = M(lathe([[TUBE.r, TUBE.y0 - 0.2], [TUBE.r, TUBE.y1 + 0.02], [TUBE.r * 0.7, TUBE.y1 + 0.16], [0.001, TUBE.y1 + 0.2]], 8), glassM, p); tube.castShadow = false;
    const bulbP = []; for (let i = 0; i <= 10; i++) { const t = i / 10; const r = 0.36 * Math.sin(Math.PI * Math.min(1, 0.05 + t * 0.9)) * (1 + 0.1 * Math.sin(t * Math.PI * 1.2)); bulbP.push([Math.max(t > 0.85 ? TUBE.r : 0.001, r), -0.36 + t * 0.72]); }
    const bulb = M(lathe(bulbP, 9), glassM, p); bulb.position.y = TUBE.y0 - 0.62; bulb.castShadow = false; const be = new THREE.Mesh(bulb.geometry, edgeM); be.scale.setScalar(1.03); bulb.add(be);
    const te = new THREE.Mesh(tube.geometry, edgeM); te.scale.set(1.08, 1, 1.08); p.add(te);
    // 4. the molten column (scaled to the reading) and the pool in the bulb
    const colG = lathe([[TUBE.r * 0.62, 0], [TUBE.r * 0.62, 1]], 6); this.col = M(colG, this.liqM, p); this.col.position.y = TUBE.y0 - 0.3; this.col.castShadow = false;
    const poolP = bulbP.map(([r, y]) => [r * 0.8, y * 0.8]); this.pool = M(lathe(poolP, 9), this.liqM, p); this.pool.position.y = TUBE.y0 - 0.62; this.pool.castShadow = false;
    // a glare strip down the glass (pixel-edged)
    const gl = new Surf(6, 40); for (let y = 2; y < 38; y++) { gl.pix(1, y, '#ffffff'); if (y % 6) gl.pix(2, y, '#d8f0f8'); }
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.9), new THREE.MeshBasicMaterial({ map: pxTex(gl.toCanvas()), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false })); glare.position.set(-0.06, (TUBE.y0 + TUBE.y1) / 2, TUBE.r + 0.02); p.add(glare);
    // 5. the steam valve on top: a brass body and a spoked hand-wheel (turns when you vent)
    this.valve = new THREE.Group(); this.valve.position.set(0, TUBE.y1 + 0.24, 0); p.add(this.valve);
    M(lathe([[0.001, 0], [0.12, 0], [0.14, 0.06], [0.09, 0.14], [0.09, 0.26], [0.13, 0.3], [0.001, 0.32]], 8), this.brassM, this.valve, 0.02);
    const spout = M(lathe([[0.05, 0], [0.04, 0.22], [0.06, 0.26]], 6), this.brassM, this.valve, 0.015); spout.position.set(0.1, 0.12, 0); spout.rotation.z = -1.2;
    this.wheel = new THREE.Group(); this.wheel.position.y = 0.36; this.valve.add(this.wheel);
    const rim = M(new THREE.TorusGeometry(0.2, 0.035, 4, 8), this.brassM, this.wheel, 0.015); rim.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const s = M(new THREE.BoxGeometry(0.4, 0.035, 0.035), this.brassM, this.wheel); s.rotation.y = (i / 4) * Math.PI; }
    this.valveTip = new THREE.Vector3(0.32, TUBE.y1 + 0.42, 0);
    // 6. the readout: an engraved brass plate on the foot of the board
    this.plate = new SurfTex(28, 14); const pm = new THREE.MeshStandardMaterial({ map: this.plate.tex, roughness: 0.4, metalness: 0.35, toneMapped: false });
    this.plateM = M(new THREE.BoxGeometry(28 / 22, 14 / 22, 0.07), [this.brassM, this.brassM, this.brassM, this.brassM, pm, this.brassM], p, 0.015); this.plateM.position.set(0, BB - 0.3, 0.02);
    // hit volume (covers the whole instrument)
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(1.7, BT - BB + 0.8, 1.0), new THREE.MeshBasicMaterial({ visible: false })); this.hit.position.set(0, (BT + BB) / 2 + 0.2, 0); p.add(this.hit);
    this.shown = 0; this.target = 0; this.shake = new Spring(0, 30, 0.18); this.turn = new Spring(0, 9, 0.5); this.flash = 0; this.canVent = false; this.on = true; this.paint(0);
  }
  paint(h) { this.plate.paint((S) => { brass(S, 0, 0, 28, 14, { seed: 6, patina: 0.25 }); S.bevel(null, { lit: 2, dark: -2 }); const t = String(h); const w = measure(t, 'num'); inscribe(S, t, Math.round(14 - w / 2), 11, 'num', 'enamel', { fill: h >= HEAT.scorch ? RAMP.lacquer : h >= HEAT.warm ? RAMP.gold : RAMP.walnut }); }); }
  set(h) { if (h === this.target) return; const up = h > this.target; this.target = h; this.paint(h); if (up) { this.kick(0.35 + (h - this.shown) * 0.06); } else this.squash(0.3); }
  overheat() { this.shake.kick(30); this.flash = 1; this.kick(1.4); }
  vent() { this.turn.target += Math.PI * 2.5; this.squash(0.8); }
  update(dt, ptr, t) {
    this.updateBody(dt, ptr); this.shake.update(dt); this.turn.update(dt);
    const d = this.target - this.shown; this.shown += Math.sign(d) * Math.min(Math.abs(d), dt * (d > 0 ? 9 : 5)); // the column rises fast, drains slower
    const hs = this.shown; const tier = heatTier(hs);
    this.col.scale.y = Math.max(0.02, hY(hs) - TUBE.y0 + 0.3);
    // near the top it trembles; when it flares it judders hard
    const rattle = hs >= HEAT.scorch ? 0.02 + Math.sin(t * 41) * 0.012 : 0; this.pivot.rotation.z += this.shake.value * 0.01 + rattle * Math.sin(t * 37); this.pivot.position.x = this.shake.value * 0.006;
    this.flash = Math.max(0, this.flash - dt * 1.6);
    heatColor(hs, _c); this.liqM.color.copy(_c).multiplyScalar(0.8); this.liqM.emissive.copy(_c);
    const pulse = tier.id === 'scorch' ? 0.35 * (0.5 + 0.5 * Math.sin(t * 9)) : tier.id === 'hot' ? 0.12 * Math.sin(t * 5) : 0;
    this.liqM.emissiveIntensity = 0.45 + hs * 0.11 + pulse + this.flash * 2.5;
    // the valve: glints when a vent is ready (and the pointer is on it), turns when used
    this.wheel.rotation.y = this.turn.value + (this.canVent && this.hover ? Math.sin(t * 6) * 0.15 : 0);
    this.brassM.emissive.setRGB(0.5, 0.32, 0.1).multiplyScalar(this.canVent ? (this.hover ? 0.45 : 0.08 + 0.06 * Math.sin(t * 3)) : 0); this.brassM.emissive.lerp(_c2.set(0xff8040), this.flash * 0.5);
  }
}

// ================================================================ heat shimmer: a faint wavy column of hot air (pixel-quantised)
const SHIM_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SHIM_FS = `uniform float uT; uniform float uK; uniform vec3 uCol; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){ vec2 uv = floor(vUv * vec2(20.0, 36.0)) / vec2(20.0, 36.0); // pixel steps, like the rest of the art
 float w = n(vec2(uv.x * 4.0, uv.y * 3.0 - uT * 1.6)) * 2.0 - 1.0; float x = uv.x + w * 0.09 * uv.y;
 float lines = pow(abs(sin((x * 3.0 + uv.y * 0.6 - uT * 0.35) * 3.14159)), 18.0);
 float fade = smoothstep(0.0, 0.25, uv.y) * (1.0 - smoothstep(0.6, 1.0, uv.y)) * (1.0 - smoothstep(0.25, 0.5, abs(uv.x - 0.5)));
 float a = uK * fade * (0.05 + lines * 0.22); if (a < 0.01) discard; gl_FragColor = vec4(uCol * a, a); }`;
class Shimmer {
  constructor(scene) {
    this.mat = new THREE.ShaderMaterial({ vertexShader: SHIM_VS, fragmentShader: SHIM_FS, uniforms: { uT: { value: 0 }, uK: { value: 0 }, uCol: { value: new THREE.Color(1, 0.86, 0.7) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.5), this.mat); this.mesh.geometry.translate(0, 0.75, 0); this.mesh.renderOrder = 6; this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  set(pos, k, t, cam) { this.mesh.visible = k > 0.01; if (!this.mesh.visible) return; this.mesh.position.copy(pos); this.mesh.quaternion.copy(cam.quaternion); this.mat.uniforms.uT.value = t; this.mat.uniforms.uK.value = k; }
  dispose() { this.mesh.parent?.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}

// ================================================================ the layer: gauge + glowing apples + steam, wired to the battle
export class HeatLayer {
  constructor(S) {
    this.S = S; this.E = S.engine; this.t = 0; this.flare = 0; this.shims = new Map();
    this.gauge = new ThermoGauge(); (S.hudB?.root || this.E.ui.scene).add(this.gauge.group);
    this.tip = new (INST.PlateTip || INST.CloudTip)({ maxW: 11 });
    this.steam = new Particles(260, { scale: 40 }); this.steam.points.renderOrder = 20; this.E.ui.scene.add(this.steam.points); // UI-space steam puffs
    this.handler = S.input.push({ move: () => this.move(), click: () => this.click() });
    this.E.add(this);
  }
  get B() { return this.S.battle; }
  get k() { return Math.max(0.42, Math.min(1, this.E.uiW / 17)); }
  ray() { const r = new THREE.Raycaster(); r.setFromCamera(this.S.input.ndc, this.E.ui.camera); return r.intersectObject(this.gauge.hit, false)[0]; }
  visible() { const B = this.B; return !!B && B.heatOn() && !this.S.dilemmaOn && !this.S.choosing && (this.S.hudB?.root.visible ?? true); }
  move() {
    const on = this.visible() && !!this.ray(); if (on !== this.gauge.hover) { this.gauge.hover = on; if (on) { audio.play('glass_clink', { vol: 0.3, minGap: 0.15 }); this.showTip(); } else this.tip.hide(); }
  }
  showTip() {
    const B = this.B; if (!B) return; const h = B.heat, tier = heatTier(h); const nxt = [HEAT.warm, HEAT.hot, HEAT.scorch].find((x) => x > h);
    const eff = tier.id === 'cold' ? 'cold: no bonus' : tier.id === 'warm' ? 'apple hits Burn +2' : tier.id === 'hot' ? 'apple hits x1.3, Burn +3' : 'apple hits x1.6, Burn +5, ALL foes Burn 2';
    const L = [[[`APPLE HEAT ${h}/${HEAT.max}`, '#7a2a10']], [[`${tier.name.toUpperCase()}: `, '#8c1a30'], [eff, '#2a160c']]];
    if (nxt) L.push([[`${nxt - h} more: ${heatTier(nxt).name}`, '#5a3622']]);
    L.push(B.canVent() ? [['CLICK: VENT ', '#8c1a30'], [`(all foes Burn ${Math.ceil(h / 2)})`, '#2a160c']] : [[B.flags.vented ? 'Vented this turn' : 'Nothing to vent yet', '#7a6a58']]);
    L.push([[`Over ${HEAT.max}: OVERHEAT, ${HEAT.scorchDmg} dmg + a card burns`, '#9e2218']]);
    const p = this.gauge.group.position; this.tip.show(L, p.x + 9.2 * this.k, p.y + 0.4, 9, { maxW: 12 }); // to the right of the instrument, never over it
  }
  async click() {
    if (!this.visible() || !this.ray()) return; const B = this.B; const S = this.S;
    if (!B.canVent() || S.busy || S.hand?.drag) { this.gauge.kick(0.8); audio.play('ui_error', { vol: 0.6 }); return true; }
    B.vent().then(() => { S.syncHand?.(); for (const e of B.enemies) S.refreshEnemy?.(e); if (this.gauge.hover) this.showTip(); });
    return true;
  }
  // ---- presentation hooks (battle.fx -> heatFx)
  onHeat(h, d, why) {
    this.gauge.set(h); if (!d) return;
    const p = this.gauge.group.position; const k = this.k;
    if (d > 0) { this.S.numbers?.spawn(`+${d}`, p.x + 1.1 * k, p.y + 0.6 * k, { color: h >= HEAT.scorch ? '#fff0c0' : '#ffb060', size: 0.85, stroke: '#3a1408', vy: 4 }); audio.play(d >= 2 ? 'sizzle' : 'fire_whoosh', { vol: 0.28 + Math.min(0.3, d * 0.06), minGap: 0.12 }); }
    else if (why === 'cool') { this.puff(4, 0.5); audio.play('steam_hiss', { vol: 0.2, minGap: 0.3 }); }
    if (heatTier(h).id !== heatTier(h - d).id && d > 0) { audio.play('fire_ignite', { vol: 0.5 }); this.flare = Math.max(this.flare, 0.6); this.gauge.pop.kick(3); this.S.hudB && this.S.bark?.('player', h >= HEAT.scorch ? 'It is SCORCHING. Perfect. Ow.' : h >= HEAT.hot ? 'The apple is getting hot.' : 'Warm apple. Friction!', 1.6); }
    if (this.gauge.hover) this.showTip();
  }
  async onOverheat(safe) {
    const S = this.S; this.gauge.overheat(); this.flare = 1.4; this.puff(26, 1.4); S.engine.shake?.(0.25); S.engine.flash?.(0.12, 0xffc080, 0.3);
    audio.play('fire_ignite', { vol: 0.9 }); audio.play('steam_hiss', { vol: 0.8 }); audio.play('glass_clink', { vol: 0.5, delay: 0.1 });
    const ap = S.prof?.appleWorld?.(_v.clone()); if (ap) { S.burst?.(ap, 'fire', 30); S.popNumber?.(ap.clone().add(new THREE.Vector3(0, 0.5, 0)), 'OVERHEAT!', { color: '#fff0c0', stroke: '#5a1408', size: 1.5 }); }
    S.bark?.('player', safe ? 'Hot! Hot! ...the scale holds. Ha!' : 'HOT! HOT HOT HOT!', 1.6, true); S.prof?.act?.('hurt');
    await tweens.wait(0.45);
  }
  async onVented(v) {
    const S = this.S; this.gauge.vent(); this.puff(18 + v * 2, 1.2); audio.play('steam_hiss', { vol: 0.85 }); audio.play('wood_creak', { vol: 0.35 });
    for (const e of S.battle?.alive() || []) { const p = S.enemyPos?.(e, 0.9); if (p) S.burst?.(p, 'fire', 10); }
    S.bark?.('player', 'Let off some steam.', 1.4); await tweens.wait(0.3);
  }
  async onBurnt(slot) {
    const S = this.S; const names = slot.cards.map((c) => BASICS[c.id]?.name || c.id).join(' + ');
    S.hand?.removeViews?.(slot.cards.map((c) => c.uid), { x: this.gauge.group.position.x, y: this.gauge.group.position.y + 2, s: 0.15, flip: 1 });
    audio.play('card_burn', { vol: 0.8 }); S.toast?.(`The apple burns ${names}`); await tweens.wait(0.25);
  }
  async onQuench(v) {
    const S = this.S; this.puff(30, 1.5); audio.play('steam_hiss', { vol: 1 }); audio.play('water_splash', { vol: 0.5 });
    for (const e of S.battle?.alive() || []) { const p = S.enemyPos?.(e, 0.9); if (p) S.burst?.(p, 'water', 12); }
    S.bark?.('player', `Quench! ${v * 2} of steam.`, 1.4); await tweens.wait(0.3);
  }
  // steam out of the valve spout (UI space): grey-white pixel clouds that rise, swell and drift
  puff(n, power = 1) {
    const g = this.gauge; g.group.updateMatrixWorld(true); const o = g.pivot.localToWorld(g.valveTip.clone());
    for (let i = 0; i < n; i++) this.steam.spawn({ pos: [o.x, o.y, o.z + 0.3], vel: [(0.8 + Math.random() * 1.6) * power, (0.6 + Math.random() * 1.4) * power, 0], life: 0.6 + Math.random() * 0.8, size: 26 + Math.random() * 18, size1: 60 + Math.random() * 40, color: Math.random() < 0.5 ? '#e8eef0' : '#c8cfd4', alpha: 0.8, sprite: 'smoke', drag: 1.6, wobble: 0.4, spin: (Math.random() - 0.5) * 2 });
  }
  // ---- the apples in the world: Newton's orbiting apple and every apple object hanging in the air
  glow(root, h, t, flare = 0) {
    if (!root) return; const tier = heatTier(h); const k = Math.max(0, h - 1) / (HEAT.max - 1); heatColor(h, _c);
    root.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material) || !('emissive' in o.material) || o.userData.noHeat) return;
      if (o.userData.heatMat?.m !== o.material) { const base = o.material; o.material = base.clone(); o.userData.heatMat = { m: o.material, e: base.emissive.clone(), i: base.emissiveIntensity ?? 1 }; } // own copy (apple materials are shared)
      const H = o.userData.heatMat; const flick = tier.id === 'scorch' ? 0.15 * Math.sin(t * 13 + o.id) : 0;
      o.material.emissive.copy(H.e).lerp(_c, Math.min(1, k * 1.15 + flare * 0.5)); o.material.emissiveIntensity = H.i * (1 - k) + (0.08 + k * 0.62 + flick + flare * 1.6) * (k > 0 || flare > 0 ? 1 : 0); // glows from within, keeps its shading
    });
  }
  appleSpots() {
    const S = this.S; const out = []; const B = this.B; if (!B) return out;
    const orb = S.prof?.ctrl?.children?.[0]; if (orb) out.push({ key: 'orbit', root: orb, pos: S.prof.appleWorld(new THREE.Vector3()), scale: 0.45 });
    for (const v of S.held?.views?.values?.() || []) if (v.model && hasApple(v.o?.comps)) out.push({ key: v.uid, root: v.model, pos: v.g.position.clone(), scale: 1 });
    return out;
  }
  update(dt, t) {
    const S = this.S, B = this.B; this.t += dt; t = this.t; if (!B) return;
    const vis = this.visible(); this.gauge.group.visible = vis; if (!vis && this.gauge.hover) { this.gauge.hover = false; this.tip.hide(); }
    const k = this.k; uiPos(this.gauge.group, -this.E.uiW + 1.25 * k, this.E.uiH - 10.6 * k, 1.3); this.gauge.group.scale.setScalar(0.78 * k);
    this.gauge.canVent = B.canVent() && !S.busy; this.gauge.update(dt, vis ? this.S.hudB ? hudPtr(this.E, this.S.input) : null : null, t);
    this.steam.update(dt, t);
    // the apples glow with the gauge; a shimmer of hot air rises over each, smoke curls when hot, embers when scorching
    this.flare = Math.max(0, this.flare - dt * 1.2); const h = B.heatOn() ? this.gauge.shown : 0; const tier = heatTier(h); const live = new Set();
    for (const a of this.appleSpots()) {
      live.add(a.key); this.glow(a.root, h, t, this.flare);
      let sh = this.shims.get(a.key); if (!sh && h >= HEAT.warm) { sh = new Shimmer(S.scene); this.shims.set(a.key, sh); }
      sh?.set(_v.copy(a.pos).add(new THREE.Vector3(0, 0.1 * a.scale, 0)), Math.min(1, (h - 2) / 8) * a.scale * 1.2, t, S.camera);
      if (sh) sh.mesh.scale.setScalar(a.scale);
      const P = S.parts, G = S.glowParts; const q = a.pos;
      if (tier.id === 'hot' || tier.id === 'scorch') if (P && Math.random() < dt * (tier.id === 'scorch' ? 9 : 4) * a.scale) P.spawn({ pos: [q.x + (Math.random() - 0.5) * 0.15, q.y + 0.15 * a.scale, q.z], vel: [(Math.random() - 0.5) * 0.25, 0.7 + Math.random() * 0.5, 0], life: 1.1 + Math.random() * 0.8, size: 14 * a.scale + 8, size1: 40 * a.scale + 14, color: Math.random() < 0.5 ? '#4a4246' : '#6a6064', alpha: 0.55, sprite: 'smoke', wobble: 0.7, drag: 0.6, spin: (Math.random() - 0.5) * 1.5 });
      if (tier.id === 'scorch' || this.flare > 0.2) if (G && Math.random() < dt * 14 * a.scale) G.spawn({ pos: [q.x + (Math.random() - 0.5) * 0.25 * a.scale, q.y, q.z], vel: [(Math.random() - 0.5) * 0.8, 1 + Math.random() * 1.4, 0], life: 0.5 + Math.random() * 0.4, size: 18, size1: 4, color: Math.random() < 0.5 ? '#ffd080' : '#ff7a2a', sprite: 'ember', grav: -1 });
    }
    for (const [key, sh] of this.shims) if (!live.has(key)) { sh.dispose(); this.shims.delete(key); }
  }
  dispose() {
    this.E.remove(this); this.S.input.remove(this.handler); this.tip.dispose(); this.gauge.group.parent?.remove(this.gauge.group); this.gauge.plate.dispose();
    this.steam.points.parent?.remove(this.steam.points); for (const [, sh] of this.shims) sh.dispose(); this.shims.clear();
  }
}
const _ptr = new THREE.Vector3();
function hudPtr(E, input) { const cam = E.ui.camera; const ndc = input?.ndc || { x: 0, y: 0 }; _v.set(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize(); return _ptr.copy(cam.position).addScaledVector(_v, (2 - cam.position.z) / _v.z); }

// a line for the drop preview: "+2 HEAT -> 7 (Hot)" or a red OVERHEAT warning
export function heatPreviewLine(h) {
  if (h.over) return [['OVERHEAT! ', '#c8201a'], [`${HEAT.scorchDmg} dmg to you, a card burns`, '#9e2218']];
  const t = heatTier(h.to); return [[`${h.gain > 0 ? '+' : ''}${h.to - h.from} HEAT `, h.gain > 0 ? '#b8501a' : '#2e6a8a'], [`→ ${h.to} (${t.name})`, '#5a3622']];
}

// the hooks the Battle calls (spread into BattleScene.fx()); every one is safe before the layer exists
export function heatFx(S) {
  return {
    heat(h, d, why) { S.heatUI?.onHeat(h, d, why); },
    async overheat(safe) { await S.heatUI?.onOverheat(safe); },
    async vented(v) { await S.heatUI?.onVented(v); },
    async burnt(slot) { await S.heatUI?.onBurnt(slot); },
    async quench(v) { await S.heatUI?.onQuench(v); },
  };
}
