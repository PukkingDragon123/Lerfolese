// THE HALL OF MEMORIES: inside the clockwork tower (swipe left from the tower top; swipe right / Right arrow / the
// "Tower Top" sign to go back up). A tall round hall of dark masonry: brass gears turning high in the walls, a gallery
// ring, tall arched windows holding the last of the sunset, a stepped plinth with the GOLDEN APPLE floating above it,
// orbited by brass rings, books, a quill-scroll, a globe and a goblet. Its warm light is the hall's key light.
// Around it orbit the MEMORY SHARDS: faceted crystal rifts, each holding a living pixel-art glimpse of a moment
// (gfx/vignettes.js: the raccoon fight, Icarus, the Hydra, the Bookworm Queen ...). Every shard is an achievement
// (outer ring) or a hard CHALLENGE (inner, higher ring, larger) from core/save.js:
//   - not earned: a crust of dark stone covers the crystal, faint cold light in its cracks; hover shows the challenge
//   - earned, not yet claimed: gold light pours from the cracks and pulses; click to SHATTER the crust: the pieces
//     burst outward, a fanfare, a flash, the memory comes alive, and the REWARD is revealed in forged letters
//     (new artifacts / cards / events / stages for good, or cosmetic upgrades to the tower itself)
//   - claimed: clear crystal, the scene plays; hover turns it toward you, it glows and plays faster
// The ring turns slowly; it halts while you hover; the wheel, Left arrow or a leftward drag spin it.
//   game.toHall({ from: 'tower' }); debug: ?scene=hall (&grant=all | &grant=<id>: mark earned, to test the reveal)
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { forgedText } from '../ui3d/text3d.js';
import { Kit } from '../models/village.js';
import { lmat, cbox, prop, extrude, shape } from '../models/lowprops.js';
import { gearGeo } from '../models/tower.js';
import { makeApple } from '../models/orchard.js';
import { vignette, vignetteMaterial } from '../gfx/vignettes.js';
import { Motes } from '../gfx/motes.js';
import { save, ACHIEVEMENTS, CHALLENGES, STAR_UNLOCKS, REWARD_TEXT, rewardsOf } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const CAM = { pos: V(0, 2.5, 9.4), look: V(0, 2.35, 0), fov: 46 };
const rewardName = (id) => STAR_UNLOCKS.find((u) => u.id === id)?.name || REWARD_TEXT[id] || id;
const rewardLine = (id) => { const u = STAR_UNLOCKS.find((x) => x.id === id); return u ? `${u.name}: ${u.text}` : REWARD_TEXT[id] || id; };

/** a jagged crystal outline: an elongated diamond with broken facets */
function shardOutline(w, h, seed) {
  const r = mulberry32(seed); const pts = []; const n = 11;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + Math.PI / 2; const k = i === 0 ? 1 : 0.62 + r() * 0.3; const sx = Math.cos(a) * w * 0.5 * (Math.abs(Math.sin(a)) < 0.4 ? 1.05 : 0.8) * k, sy = Math.sin(a) * h * 0.5 * (i === 0 ? 1 : 0.85 + r() * 0.15); pts.push([sx, sy]); }
  return pts;
}

export class HallScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x050307); sc.fog = new THREE.FogExp2(0x0a0608, 0.035);
    const q = new URLSearchParams(location.search); const grant = q.get('grant'); if (grant) { for (const a of [...ACHIEVEMENTS, ...CHALLENGES]) if (grant === 'all' || grant === a.id) save.meta.achievements[a.id] ||= 1; save.saveMeta(); }
    save.evaluate();
    this.camera = new THREE.PerspectiveCamera(CAM.fov, this.engine.aspect, 0.05, 120); this.camera.position.copy(CAM.pos); this.look = CAM.look.clone();
    this.buildHall(sc); this.buildApple(sc); this.buildShards(sc); this.buildSigns(sc);
    this.motes = new Motes(900, { px: 2 }); sc.add(this.motes.points); this.rnd = mulberry32(8); this.acc = 0; this.debris = [];
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.7, 0.6, 0.78], ao: 0.9, exposure: 0.95, grade: { sat: 1.1, vib: 0.25, contrast: 1.14, vignette: 0.6, warmth: 0.06, lift: [0.006, 0.004, 0.014], gain: [1.04, 0.98, 0.92], toe: 0.05 }, ink: { fade: [12, 40], strength: 0.7 } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['wind']); audio.playMusic(audio.manifest?.music?.hall ? 'hall' : 'journal');
    this.intro = { t: 0, from }; if (from === 'tower') this.camera.position.set(0, 2.2, 11.2);
    this.spin = 0; this.spinV = 0; this.hov = null;
  }
  // ---------------------------------------------------------------- architecture: floor, walls, piers, windows, gallery, gears, the plinth
  buildHall(sc) {
    const K = new Kit(); const R = 12.2, H = 17, NW = 16; const r = mulberry32(3);
    K.add('stone', new THREE.CylinderGeometry(R + 0.5, R + 0.5, 0.4, NW), V(0, -0.2, 0));
    K.add('marble', new THREE.CylinderGeometry(5.9, 5.9, 0.04, 32), V(0, 0.02, 0)); K.add('stone', new THREE.CylinderGeometry(5.6, 5.6, 0.06, 32), V(0, 0.03, 0));
    for (let i = 0; i < NW; i++) { const a = (i / NW) * TAU; const d = V(Math.sin(a), 0, Math.cos(a)); const w = 2 * R * Math.tan(Math.PI / NW) + 0.1; const win = i % 4 === 2;
      if (!win) K.add(i % 2 ? 'stone' : 'rubble', cbox(w, H, 0.7, 0.04), d.clone().multiplyScalar(R + 0.35).setY(H / 2), new THREE.Euler(0, a, 0));
      else { for (const [hh, yy] of [[3.2, 1.6], [4.2, H - 2.1]]) K.add('stone', cbox(w, hh, 0.7, 0.04), d.clone().multiplyScalar(R + 0.35).setY(yy), new THREE.Euler(0, a, 0)); for (const s of [-1, 1]) { const sd = V(d.z, 0, -d.x); K.add('stone', cbox(0.9, H, 0.7, 0.04), d.clone().multiplyScalar(R + 0.35).addScaledVector(sd, s * (w / 2 - 0.45)).setY(H / 2), new THREE.Euler(0, a, 0)); }
        const g = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.8, H - 7.4), new THREE.ShaderMaterial({ uniforms: {}, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: 'varying vec2 vUv; void main(){ vec3 a = vec3(0.9, 0.38, 0.16), b = vec3(0.22, 0.1, 0.24), c = vec3(0.05, 0.05, 0.14); vec3 col = mix(a, b, smoothstep(0.0, 0.45, vUv.y)); col = mix(col, c, smoothstep(0.45, 1.0, vUv.y)); vec2 p = vUv * vec2(6.0, 14.0); float lead = step(0.94, fract(p.x)) + step(0.96, fract(p.y + floor(p.x) * 0.5)); col *= 1.0 - min(1.0, lead) * 0.85; gl_FragColor = vec4(col * 1.25, 1.0); }' }));
        g.position.copy(d.clone().multiplyScalar(R + 0.05)).setY(3.2 + (H - 7.4) / 2); g.rotation.y = a + Math.PI; g.userData.noInk = true; g.userData.noAO = true; sc.add(g);
        const arch = extrude(shape(Array.from({ length: 13 }, (_, k) => { const t = (k / 12) * Math.PI; return [Math.cos(t) * (w / 2 - 0.9), Math.sin(t) * 1.4]; })), 0.6, 0.02); K.add('stone', arch, d.clone().multiplyScalar(R + 0.1).setY(H - 4.2), new THREE.Euler(0, a + Math.PI, 0)); } }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + TAU / 32; const p = V(Math.sin(a) * 10.6, 0, Math.cos(a) * 10.6); // piers with capitals
      K.add('stone', new THREE.CylinderGeometry(0.5, 0.62, H, 8), p.clone().setY(H / 2)); K.add('marble', cbox(1.5, 0.4, 1.5, 0.04), p.clone().setY(6.2)); K.add('marble', cbox(1.4, 0.6, 1.4, 0.05), p.clone().setY(0.3)); }
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; K.add('marble', cbox(2.9, 0.3, 1.6, 0.03), V(Math.sin(a) * 10.4, 6.35, Math.cos(a) * 10.4), new THREE.Euler(0, a, 0)); K.add('stone', cbox(2.9, 0.75, 0.16, 0.03), V(Math.sin(a) * 9.65, 6.85, Math.cos(a) * 9.65), new THREE.Euler(0, a, 0)); } // the gallery ring
    // the plinth: stepped octagon with brass bands
    for (const [rr, y0, y1, m] of [[1.9, 0, 0.3, 'stone'], [1.5, 0.3, 0.6, 'marble'], [1.1, 0.6, 1.25, 'stone'], [1.25, 1.25, 1.4, 'marble']]) K.add(m, new THREE.CylinderGeometry(rr, rr * 1.04, y1 - y0, 8), V(0, (y0 + y1) / 2, 0));
    K.build(sc, { uvScale: { stone: 0.9, rubble: 0.8, marble: 0.6 } });
    for (const y of [0.62, 1.27]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(y < 1 ? 1.13 : 1.28, y < 1 ? 1.13 : 1.28, 0.06, 8), lmat('brass')); b.position.y = y; sc.add(b); }
    { const ring = new THREE.Mesh(new THREE.RingGeometry(5.62, 5.86, 64), lmat('brass')); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.065; ring.receiveShadow = true; sc.add(ring); }
    // gears turning high in the walls
    this.gears = []; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; const Rg = 1.6 + r() * 1.2; const g = new THREE.Mesh(gearGeo(Rg, 16 + Math.floor(r() * 8), 0.3), lmat(i % 2 ? 'brass' : 'bronze')); g.position.set(Math.sin(a) * (R - 0.15), 9.5 + r() * 3.5, Math.cos(a) * (R - 0.15)); g.lookAt(0, g.position.y, 0); g.castShadow = true; sc.add(g); this.gears.push({ g, s: (i % 2 ? 1 : -1) * 0.35 / Rg }); }
    // light: the golden apple is the key; a cold dusk through the windows; a dim beam from the oculus
    this.appleLight = new THREE.PointLight(0xffb85a, 26, 26, 1.6); this.appleLight.position.set(0, 4.3, 1.1); this.appleLight.castShadow = true; this.appleLight.shadow.mapSize.set(1024, 1024); this.appleLight.shadow.bias = -0.002; sc.add(this.appleLight);
    sc.add(new THREE.HemisphereLight(0x3a3460, 0x140a06, 0.35)); const dusk = new THREE.DirectionalLight(0xb06a8a, 0.5); dusk.position.set(-8, 6, -10); sc.add(dusk);
    this.hoverLight = new THREE.PointLight(0xffffff, 0, 5, 1.8); sc.add(this.hoverLight);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.2, 14, 16, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float e = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.7, vUv.y); float f = 0.75 + 0.25 * sin(uTime * 0.6 + vUv.x * 30.0); gl_FragColor = vec4(vec3(1.0, 0.75, 0.4) * e * f * 0.05, 1.0); }' }));
    beam.position.y = 9; beam.userData.noInk = true; beam.userData.noAO = true; sc.add(beam); this.beam = beam;
  }
  buildApple(sc) {
    const A = (this.apple = makeApple({ s: 0.95 })); const gold = new THREE.MeshStandardMaterial({ color: 0xffd070, metalness: 0.85, roughness: 0.28, emissive: 0xc07a18, emissiveIntensity: 0.9, flatShading: true });
    const core = new THREE.PointLight(0xffa840, 8, 9, 1.8); core.position.set(0, 2.3, 1.4); sc.add(core); this.coreLight = core; // the apple's own warm glow spilling onto the plinth and the near shards
    A.traverse((o) => { if (o.isMesh) { o.material = gold; o.castShadow = false; } }); A.position.set(0, 2.35, 0); sc.add(A);
    // things floating round it: brass rings, books, a scroll, a globe, a goblet, a candle
    this.orbiters = []; const items = [prop('book', { seed: 2, w: 0.26, h: 0.36, t: 0.06 }), prop('scroll', { L: 0.42, r: 0.04 }), prop('globe', { h: 0.42 }), prop('goblet'), prop('book', { seed: 5, w: 0.22, h: 0.3, t: 0.05 }), prop('candle')];
    items.forEach((o, i) => { sc.add(o); o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); this.orbiters.push({ o, a: (i / items.length) * TAU, r: 1.35 + (i % 2) * 0.35, y: 2.2 + Math.sin(i * 2.1) * 0.5, s: 0.25 + (i % 3) * 0.06 }); });
    for (const [rr, tx, tz] of [[0.95, 0.5, 0.2], [1.12, -0.4, 0.6]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.018, 4, 40), lmat('brass')); ring.position.copy(A.position); ring.rotation.set(Math.PI / 2 + tx, 0, tz); sc.add(ring); this.orbiters.push({ ring, sp: 0.2 + rr * 0.1 }); }
  }
  // ---------------------------------------------------------------- the memory shards
  buildShards(sc) {
    const m = save.meta; m.claimed ||= {}; this.ringA = new THREE.Group(); this.ringC = new THREE.Group(); sc.add(this.ringA, this.ringC);
    const all = [...ACHIEVEMENTS.map((a) => ({ a, hard: false })), ...CHALLENGES.map((a) => ({ a, hard: true }))]; this.shards = [];
    const nA = ACHIEVEMENTS.length, nC = CHALLENGES.length; let iA = 0, iC = 0;
    for (const { a, hard } of all) {
      const w = hard ? 1.25 : 0.95, h = hard ? 2.0 : 1.55; const seed = a.id.length * 31 + a.id.charCodeAt(0) * 7 + (hard ? 5 : 0); const outline = shardOutline(w, h, seed);
      const g = new THREE.Group(); const holder = new THREE.Group(); g.add(holder); const L = vignette(a.scene || 'road'); const tint = L.tint;
      const crys = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color(0x8a86b0), 0.72), emissive: tint.clone().lerp(new THREE.Color(0x4a3a7a), 0.5), emissiveIntensity: 0.08, roughness: 0.12, metalness: 0.25, flatShading: true, transparent: true, opacity: 0.8 });
      const body = new THREE.Mesh(extrude(shape(outline), 0.14, 0.05), crys); body.position.z = -0.07; body.castShadow = true; holder.add(body);
      const inset = outline.map(([x, y]) => [x * 0.8, y * 0.8]); const wg = new THREE.ShapeGeometry(shape(inset)); const uv = wg.attributes.uv, pp = wg.attributes.position; for (let i = 0; i < pp.count; i++) uv.setXY(i, pp.getX(i) / (w * 0.8) + 0.5, pp.getY(i) / (h * 0.8) + 0.5);
      const vm = vignetteMaterial(L); const win = new THREE.Mesh(wg, vm); win.position.z = 0.125; win.userData.noInk = true; holder.add(win);
      // crust: stone fragments fanned from an off-centre point, shrunk so light leaks through the cracks
      const crust = []; const glowM = new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(1.5), toneMapped: false, transparent: true, opacity: 0.0 }); const cracks = new THREE.Mesh(wg.clone(), glowM); cracks.position.z = 0.13; cracks.userData.noInk = true; holder.add(cracks);
      if (!m.claimed[a.id]) { const r = mulberry32(seed + 3); const c0 = [(r() - 0.5) * w * 0.2, (r() - 0.5) * h * 0.2]; const rock = new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: 0.95, flatShading: true });
        const ring = []; for (let i = 0; i < inset.length; i++) { const A2 = inset[i], B2 = inset[(i + 1) % inset.length]; ring.push(A2, [(A2[0] + B2[0]) / 2 + (r() - 0.5) * 0.06, (A2[1] + B2[1]) / 2 + (r() - 0.5) * 0.06]); }
        for (let i = 0; i < ring.length; i += 2) { const p0 = ring[i], p1 = ring[i + 1], p2 = ring[(i + 2) % ring.length]; const cx = (c0[0] + p0[0] + p1[0] + p2[0]) / 4, cy = (c0[1] + p0[1] + p1[1] + p2[1]) / 4; const k = 0.9;
          const pts = [c0, p0, p1, p2].map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]); const geo = extrude(shape(pts.map(([x, y]) => [x - cx, y - cy])), 0.05 + r() * 0.04, 0.012); const f = new THREE.Mesh(geo, rock); f.position.set(cx, cy, 0.135); f.castShadow = true; holder.add(f); crust.push({ f, c: V(cx, cy, 0) }); } }
      const hit = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.05, h * 1.05), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = 0.2; holder.add(hit);
      const S = { a, hard, g, holder, vm, crys, glowM, crust, hit, tint, earned: !!m.achievements[a.id], claimed: !!m.claimed[a.id], hov: new Spring(0, 8, 0.55), pulse: 0, face: new Spring(0, 6, 0.7) };
      hit.userData.shard = S; vm.uniforms.uLit.value = S.claimed ? 1 : S.earned ? 0.35 : 0.12;
      if (hard) { S.ang = (iC++ / nC) * TAU + 0.26; S.rad = 3.25; S.y = 4.15 + Math.sin(S.ang * 3) * 0.15; this.ringC.add(g); } else { S.ang = (iA++ / nA) * TAU; S.rad = 5.05; S.y = 1.45 + (iA % 2) * 0.45; this.ringA.add(g); }
      g.position.set(Math.sin(S.ang) * S.rad, S.y, Math.cos(S.ang) * S.rad); g.rotation.y = S.ang; this.shards.push(S);
    }
    this.count = this.shards.filter((s) => s.claimed).length;
  }
  buildSigns(sc) {
    const title = forgedText('Hall of Memories', { font: 'title', unit: 0.0115, depth: 4, style: 'gold', glow: 0.22 }); title.position.copy(this.camPt(0, 0.8, 6.5)); title.lookAt(CAM.pos); sc.add(title); this.title = title; this.titleY = title.position.y;
    this.progress = this.makeProgress(); sc.add(this.progress);
    const back = (this.backSign = forgedText('Tower Top >', { font: 'head', unit: 0.0085, depth: 2, style: 'silver', glow: 0.15 })); back.position.copy(this.camPt(0.8, -0.05, 4)); back.lookAt(CAM.pos); sc.add(back); this.backBase = back.position.clone();
    this.backHit = new THREE.Mesh(new THREE.BoxGeometry(back.userData.size[0] * 1.15, 0.3, 0.1), new THREE.MeshBasicMaterial({ visible: false })); back.add(this.backHit); this.backHov = new Spring(0, 8, 0.55);
  }
  makeProgress() { const n = this.shards.filter((s) => s.claimed).length; const p = forgedText(`${n} / ${this.shards.length} memories restored`, { font: 'body', unit: 0.0085, depth: 2, style: 'ivory', glow: 0.2 }); p.position.copy(this.camPt(0, 0.68, 6.5)); p.lookAt(CAM.pos); return p; }
  camPt(nx, ny, d) { const c = new THREE.PerspectiveCamera(CAM.fov, this.engine.aspect, 0.1, 100); c.position.copy(CAM.pos); c.lookAt(CAM.look); c.updateMatrixWorld(); return V(nx, ny, 0.5).unproject(c).sub(c.position).normalize().multiplyScalar(d).add(c.position); }
  // ---------------------------------------------------------------- hover info (forged lettering under the shard)
  info(S) {
    if (this.infoFor === S) return; this.infoFor = S; if (this.infoG) this.scene.remove(this.infoG); if (!S) { this.infoG = null; return; }
    const g = new THREE.Group(); const a = S.a; const lines = [];
    lines.push(forgedText(a.name, { font: 'head', unit: 0.0115, depth: 2, style: S.claimed ? 'gold' : S.earned ? 'gold' : 'silver', glow: 0.2 }));
    if (S.hard) lines.push(forgedText('CHALLENGE', { font: 'body', unit: 0.009, depth: 2, style: 'crystal', glow: 0.4 }));
    lines.push(forgedText(a.text, { font: 'body', unit: 0.0095, depth: 2, style: 'ivory', glow: 0.18 }));
    const rw = rewardsOf(a); if (rw.length) lines.push(forgedText((S.claimed ? 'Unlocked: ' : 'Unlocks: ') + rw.map(rewardName).join(', '), { font: 'body', unit: 0.0085, depth: 2, style: S.claimed ? 'gold' : 'bronze', glow: 0.18 }));
    lines.push(forgedText(S.claimed ? 'restored' : S.earned ? 'click to shatter the crust' : 'not yet earned', { font: 'body', unit: 0.008, depth: 1, style: S.earned && !S.claimed ? 'gold' : 'stone', glow: 0.25 }));
    let y = 0; for (const L of lines) { L.position.y = y; y -= L.userData.size[1] + 0.05; g.add(L); }
    g.userData.h = -y; this.infoG = g; this.scene.add(g);
  }
  // ---------------------------------------------------------------- claim: shatter the crust, fanfare, reveal the reward
  claim(S) {
    const got = save.claim(S.a.id); S.claimed = true; S.earned = true; this.count++; audio.play('glass_shatter', { vol: 0.9 }); audio.play('rock_crumble', { vol: 0.6 }); audio.play('eureka', { delay: 0.35 }); audio.play('sting_reward', { delay: 0.55 }); audio.duckMusic(0.3, 3);
    this.engine.flash(0.35, 0xffe0a0, 0.6); this.engine.shake(0.25);
    const wp = S.holder.getWorldPosition(V()); const toCam = this.camera.position.clone().sub(wp).normalize(); const q = S.holder.getWorldQuaternion(new THREE.Quaternion());
    for (const c of S.crust) { const p = c.f.getWorldPosition(V()); this.scene.attach(c.f); const out = c.c.clone().applyQuaternion(q).normalize(); this.debris.push({ f: c.f, v: out.multiplyScalar(2 + Math.random() * 2.5).addScaledVector(toCam, 2.5 + Math.random() * 2).add(V(0, 1.5 + Math.random() * 1.5, 0)), w: V(Math.random() * 9 - 4.5, Math.random() * 9 - 4.5, Math.random() * 9 - 4.5), t: 0 }); void p; }
    S.crust = []; S.glowM.opacity = 1; S.flare = 1;
    const r = this.rnd; for (let i = 0; i < 90; i++) { const d = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(0.6 + r() * 2.4).addScaledVector(toCam, 0.8); this.motes.spawn({ pos: wp, vel: d, drag: 2.2, grav: 0.4, life: 0.8 + r() * 1.2, seq: r() < 0.6 ? 'twinkle' : 'glint', fps: 8 + r() * 5, color: r() < 0.5 ? '#ffe8a0' : '#' + S.tint.getHexString(), bright: 1.6, k: r() < 0.2 ? 2 : 1, fadeIn: 0.02 }); }
    for (let i = 0; i < 40; i++) { const d = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(1 + r() * 2); this.motes.spawn({ pos: wp, vel: d.addScaledVector(toCam, 1), drag: 1.5, grav: 2.2, life: 1 + r(), sprite: 'dust', color: '#6a5a4a', bright: 0.8, fadeIn: 0.02 }); }
    // the reveal: forged lettering rising in front of the shard
    const rev = new THREE.Group(); const head = forgedText('Memory restored', { font: 'title', unit: 0.0105, depth: 4, style: 'gold', glow: 0.35 }); rev.add(head); let y = -head.userData.size[1] - 0.08;
    const nm = forgedText(S.a.name, { font: 'head', unit: 0.011, depth: 2, style: 'ivory', glow: 0.25 }); nm.position.y = y; rev.add(nm); y -= nm.userData.size[1] + 0.12;
    for (const id of got.length ? got : rewardsOf(S.a)) { const L = forgedText(rewardLine(id), { font: 'body', unit: 0.0085, depth: 2, style: id.startsWith('tower:') ? 'crystal' : 'gold', glow: 0.35 }); L.position.y = y; rev.add(L); y -= L.userData.size[1] + 0.06; }
    rev.position.copy(wp).addScaledVector(toCam, 1.6).add(V(0, 0.9, 0)); rev.lookAt(this.camera.position); rev.scale.setScalar(0.01); this.scene.add(rev); this.reveal = { g: rev, t: 0, S, base: rev.position.clone() };
    this.scene.remove(this.progress); this.progress = this.makeProgress(); this.scene.add(this.progress); this.infoFor = null; this.info(null);
  }
  // ---------------------------------------------------------------- input
  rc() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  pick() { if (this.leaving || this.reveal) return null; const h = this.rc().intersectObjects([...this.shards.map((s) => s.hit), this.backHit], false)[0]; if (!h) return null; if (h.object === this.backHit) return { back: true }; return { shard: h.object.userData.shard }; }
  onMove() { const p = this.pick(); const k = p ? (p.back ? 'back' : p.shard.a.id) : null; if (k !== this.hovKey) { this.hovKey = k; this.hov = p; if (p) audio.play(p.shard ? 'glass_clink' : 'ui_hover', { vol: 0.3 }); this.engine.renderer.domElement.style.cursor = p ? 'pointer' : ''; this.info(p?.shard || null); } }
  onClick() {
    if (this.reveal) { if (this.reveal.t > 0.8) this.reveal.t = Math.max(this.reveal.t, 3.6); return true; }
    const p = this.pick(); if (!p) return; if (p.back) { this.goBack(); return true; }
    const S = p.shard; if (S.claimed) { S.pulse = 1; audio.play('magic_sparkle', { vol: 0.5 }); return true; }
    if (S.earned) { this.claim(S); return true; }
    S.shake = 0.5; audio.play('ui_error', { vol: 0.5 }); audio.play('stone_grind', { vol: 0.3 }); return true;
  }
  goBack() { if (this.leaving) return; this.leaving = { t: 0 }; audio.play('transition_whoosh', { vol: 0.6 }); audio.play('wood_creak', { vol: 0.4 }); }
  onDragStart(e) { this.dragX = e.x; this.dragY = e.y; this.dragT = performance.now(); }
  onDrag(e) { if (this.dragX == null) return; const dx = e.x - this.dragX; if (dx > 110 && Math.abs(e.y - this.dragY) < 160) { this.dragX = null; this.goBack(); } else if (dx < -60) { this.spinV -= 0.9; this.dragX = e.x; } }
  onDragEnd() { this.dragX = null; }
  onWheel(e) { this.spinV += Math.max(-1.5, Math.min(1.5, ((e?.dy || 0) + (e?.dx || 0)) * 0.004)); }
  onKey(e) { const k = e?.key || e?.code || e; if (k === 'ArrowRight' || k === 'd' || k === 'KeyD' || k === 'Escape') { this.goBack(); return true; } if (k === 'ArrowLeft' || k === 'a' || k === 'KeyA') { this.spinV -= 1.2; return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const cam = this.camera, nd = this.input.ndc; for (const g of this.gears) g.g.rotateZ(g.s * dt); this.beam.material.uniforms.uTime.value = t;
    // the golden apple: slow turn, bob, its light breathing; the orbiters
    this.apple.rotation.y = t * 0.3; this.apple.position.y = 2.35 + Math.sin(t * 0.8) * 0.06; this.appleLight.intensity = 24 + Math.sin(t * 1.7) * 2 + (this.reveal ? 18 * Math.max(0, 1 - this.reveal.t / 1.5) : 0);
    for (const o of this.orbiters) { if (o.ring) { o.ring.rotation.z += o.sp * dt; continue; } o.a += dt * 0.22; o.o.position.set(Math.cos(o.a) * o.r, o.y + Math.sin(t * 0.9 + o.a * 2) * 0.12, Math.sin(o.a) * o.r); o.o.rotation.set(Math.sin(t * 0.5 + o.a) * 0.6, o.a * 2, Math.cos(t * 0.4 + o.a) * 0.4); o.o.scale.setScalar(o.s * 3.4); }
    // the rings turn (halting while you hover or a memory is revealed)
    const hovS = this.hov?.shard; const hold = hovS || this.reveal; this.spinV *= Math.exp(-dt * 2.2); this.spin += (hold ? 0 : dt * 0.045) + this.spinV * dt; this.ringA.rotation.y = this.spin; this.ringC.rotation.y = -this.spin * 0.7 + 0.2;
    for (const S of this.shards) { const h = hovS === S || this.reveal?.S === S; S.hov.target = h ? 1 : 0; S.hov.update(dt); const k = Math.max(0, S.hov.value);
      S.vm.uniforms.uTime.value += dt * (S.claimed ? 1 : 0.25); S.vm.uniforms.uHover.value = k; S.vm.uniforms.uLit.value += ((S.claimed ? 1 : S.earned ? 0.35 : 0.12) - S.vm.uniforms.uLit.value) * Math.min(1, dt * 1.5);
      // turn toward the camera and float out a little when hovered; the free ones bob and sway
      const wp = S.g.getWorldPosition(V()); const toCam = Math.atan2(cam.position.x - wp.x, cam.position.z - wp.z) - (S.hard ? this.ringC.rotation.y : this.ringA.rotation.y); let dy = toCam - S.ang; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
      S.g.rotation.y = S.ang + dy * k + Math.sin(t * 0.4 + S.ang * 3) * 0.12 * (1 - k); const out = 1 + k * 0.12; S.g.position.set(Math.sin(S.ang) * S.rad * out, S.y + Math.sin(t * 0.7 + S.ang * 5) * 0.08 + k * 0.15, Math.cos(S.ang) * S.rad * out);
      if (S.shake > 0) { S.shake -= dt; S.holder.position.x = Math.sin(S.shake * 60) * 0.03 * S.shake; } else S.holder.position.x = 0;
      S.pulse = Math.max(0, (S.pulse || 0) - dt * 1.2); S.holder.scale.setScalar(1 + k * 0.1 + S.pulse * 0.08); S.holder.rotation.z = Math.sin(t * 0.5 + S.ang) * 0.04;
      S.crys.emissiveIntensity = (S.claimed ? 0.35 : 0.1) + k * 0.5 + S.pulse * 0.8 + (S.flare || 0) * 2; if (S.flare) S.flare = Math.max(0, S.flare - dt * 0.6);
      const unc = S.earned && !S.claimed; S.glowM.opacity = S.claimed ? Math.max(0, S.glowM.opacity - dt * 0.8) : unc ? 0.55 + Math.sin(t * 3 + S.ang) * 0.3 + k * 0.3 : 0.08 + k * 0.1; S.glowM.visible = S.glowM.opacity > 0.01;
      if (unc && Math.random() < dt * 3) { const r = this.rnd; this.motes.spawn({ pos: wp.clone().add(V((r() - 0.5) * 0.6, (r() - 0.5) * 1.0, 0)), vel: [(r() - 0.5) * 0.1, 0.25 + r() * 0.2, (r() - 0.5) * 0.1], drag: 0.6, life: 1.4 + r(), seq: 'glint', fps: 6, color: '#ffe08a', bright: 1.5, fadeIn: 0.1 }); } }
    // hover light and info
    const hs = hovS || this.reveal?.S; if (hs) { const wp = hs.holder.getWorldPosition(V()); this.hoverLight.position.copy(wp).addScaledVector(cam.position.clone().sub(wp).normalize(), 0.9); this.hoverLight.color.copy(hs.tint); this.hoverLight.intensity += (5 - this.hoverLight.intensity) * Math.min(1, dt * 5); } else this.hoverLight.intensity *= Math.exp(-dt * 4);
    if (this.infoG && this.infoFor) { const wp = this.infoFor.holder.getWorldPosition(V()); const toCam = cam.position.clone().sub(wp).normalize(); this.infoG.position.copy(wp).addScaledVector(toCam, 0.6).add(V(0, -(this.infoFor.hard ? 1.2 : 1.0), 0)); this.infoG.quaternion.copy(cam.quaternion); }
    // debris from a shattered crust
    for (const d of this.debris) { d.t += dt; d.v.y -= 9.8 * dt; d.f.position.addScaledVector(d.v, dt); d.f.rotation.x += d.w.x * dt; d.f.rotation.y += d.w.y * dt; d.f.rotation.z += d.w.z * dt; if (d.f.position.y < 0.05) { d.f.position.y = 0.05; d.v.y = Math.abs(d.v.y) * 0.3; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.6); if (!d.thud) { d.thud = true; audio.play('rock_impact', { vol: 0.15 }); } } if (d.t > 2.4) d.f.scale.multiplyScalar(Math.exp(-dt * 4)); }
    this.debris = this.debris.filter((d) => { if (d.t < 3.5) return true; d.f.removeFromParent(); return false; });
    // the reveal: lettering grows and floats, then settles away
    if (this.reveal) { const R = this.reveal; R.t += dt; const s = ease5(Math.min(1, (R.t - 0.25) / 0.6)) * (1 - ease5((R.t - 4.2) / 0.6)); R.g.scale.setScalar(Math.max(0.001, s)); R.g.position.copy(R.base).add(V(0, Math.sin(R.t * 1.4) * 0.03 + R.t * 0.02, 0)); R.g.quaternion.copy(cam.quaternion);
      if (R.t > 4.8) { this.scene.remove(R.g); this.reveal = null; } }
    // camera: enter from the door; breathe and parallax; lean toward the hovered shard; leave back out the door
    let pos = CAM.pos.clone().add(V(nd.x * 0.35 + Math.sin(t * 0.11) * 0.1, nd.y * 0.2 + Math.sin(t * 0.07) * 0.05, 0)), look = CAM.look.clone().add(V(nd.x * 0.8, nd.y * 0.4, 0));
    if (hs) { const wp = hs.holder.getWorldPosition(V()); pos.lerp(wp.clone().add(cam.position.clone().sub(wp).normalize().multiplyScalar(3.4)), this.reveal ? 0.55 : 0.18); look.lerp(wp, this.reveal ? 0.7 : 0.35); }
    if (this.leaving) { this.leaving.t += dt; const u = ease5(this.leaving.t / 1.3); pos.lerp(V(0, 2.2, 13), u); look.lerp(V(0, 2.4, 20), u * 0.6); if (this.leaving.t > 1.0 && !this.leaving.gone) { this.leaving.gone = true; this.game.toMenu({ from: 'hall', wipe: { color: 0x0a0604, dur: 0.45 } }); } }
    if (this.intro && this.intro.t < 1.4) { this.intro.t += dt; cam.position.lerp(pos, Math.min(1, dt * 2.2)); } else cam.position.lerp(pos, Math.min(1, dt * 3)); this.look.lerp(look, Math.min(1, dt * 3)); cam.lookAt(this.look);
    // signs
    this.backHov.target = this.hov?.back ? 1 : 0; this.backHov.update(dt); const bk = this.backHov.value; this.backSign.position.copy(this.backBase).add(V(Math.abs(Math.sin(t * 2.2)) * 0.03 + bk * 0.05, bk * 0.04, 0)); this.backSign.scale.setScalar(1 + bk * 0.12); this.backSign.userData.face.emissiveIntensity = 0.15 + bk * 0.4;
    this.title.position.y = this.titleY + Math.sin(t * 0.5) * 0.03;
    // dust drifting in the apple light
    this.acc += dt * 10; const r = this.rnd; while (this.acc > 1) { this.acc--; const a = r() * TAU, d = 0.5 + r() * 6; this.motes.spawn({ pos: [Math.cos(a) * d, 0.3 + r() * 6, Math.sin(a) * d], vel: [(r() - 0.5) * 0.05, 0.02 + r() * 0.04, (r() - 0.5) * 0.05], wobble: 0.15, life: 4 + r() * 4, sprite: r() < 0.8 ? 'm1' : 'dust', color: r() < 0.7 ? '#ffd890' : '#c8b0ff', bright: 0.7 + r() * 0.6, twinkle: 1 + r() * 2, fadeIn: 0.4 }); }
    this.motes.px = Math.max(2, Math.round(this.engine.renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())).y / 320)); this.motes.update(dt, t, this.engine.renderer); this.updateUI(dt);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; this.motes?.dispose(); super.dispose(); }
}
