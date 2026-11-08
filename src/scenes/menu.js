// Main menu: The One Above All toys with a miniature universe. Galaxies drift, Schrödinger's box is
// both open and shut, Newton's apple can be flung into orbit, and Sir Isaac dangles, unimpressed.
import * as THREE from 'three';
import { domText } from '../ui/hud.js';
import * as S from '../models/sculpt.js';
import { UIScreen, Button3D } from '../ui3d/widgets.js';
import { textPlane, Note } from '../ui3d/kit.js';
import { createProfessor } from '../models/professor.js';
import * as P3 from '../models/props3d.js';
import { ITEM_MODELS } from '../models/items3d.js';
import { save } from '../core/save.js';
import { PixelCanvas } from '../gfx/pixel.js';
import { sprite } from '../gfx/sprites.js';
import { standee, safeDrawn, pixelTex } from '../ui3d/standee.js';
import { mulberry32 } from '../core/util.js';
import { tweens, Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vrange, vpick, clamp } from '../core/util.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.6, ...o });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p.add(o); return o; };
const QUIPS = ['Do you mind? I am suspended.', 'The strings are for emphasis.', 'I was dead once. Overrated.', 'Stop poking the genius.', 'Every action has an equal and opposite god.', 'I would bow, but the strings are tangled.'];

function galaxy(n = 1600, r = 6, arms = 3, c1 = 0xb48cff, c2 = 0x8fe3ff) {
  const pos = [], col = []; const A = new THREE.Color(c1), B = new THREE.Color(c2), Cc = new THREE.Color();
  for (let i = 0; i < n; i++) { const d = Math.pow(Math.random(), 1.6) * r; const arm = (i % arms) * ((Math.PI * 2) / arms); const a = arm + d * 1.2 + vrange(-0.35, 0.35) * (1 - d / r + 0.3); pos.push(Math.cos(a) * d + vrange(-0.2, 0.2), vrange(-0.15, 0.15) * (1 - d / r), Math.sin(a) * d + vrange(-0.2, 0.2)); Cc.copy(A).lerp(B, d / r).multiplyScalar(1.2 + Math.random()); col.push(Cc.r, Cc.g, Cc.b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
}

export class MenuScene extends UIScreen {
  async enter() {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x07050d);
    this.camera = new THREE.PerspectiveCamera(40, this.engine.aspect, 0.1, 600); this.camera.position.set(0, 2, 22); this.camLook = new THREE.Vector3(0, 3, 0);
    // nebula dome
    const neb = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 20), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 v; uniform float t; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){ vec3 p = v * 3.0; float c = n(p + t*0.02) * 0.5 + n(p * 2.0) * 0.25 + n(p * 4.0) * 0.125; c = pow(c, 2.2);
          vec3 col = mix(vec3(0.02,0.01,0.05), vec3(0.32,0.12,0.42), c) + vec3(0.05,0.18,0.3) * pow(n(p*1.5+4.0), 4.0);
          float s = step(0.997, h(floor(v * 400.0))); col += s * vec3(1.0, 0.95, 0.85);
          col = floor(col * 24.0) / 24.0; gl_FragColor = vec4(col, 1.0); }` }));
    sc.add(neb); this.neb = neb;
    sc.add(new THREE.AmbientLight(0x6b4c9a, 0.8)); const key = new THREE.PointLight(0xffe0b0, 120, 60, 1.5); key.position.set(0, 4, 8); sc.add(key);
    const rim = new THREE.DirectionalLight(0x8fe3ff, 2.2); rim.position.set(-8, 6, -6); sc.add(rim); const rim2 = new THREE.DirectionalLight(0xb48cff, 2); rim2.position.set(8, 3, -4); sc.add(rim2);
    // The One Above All: a colossal hooded figure drawn in stars (a constellation being), star-eyed
    const god = (this.god = new THREE.Group()); god.position.set(0, -6.5, -18); god.scale.setScalar(0.82); sc.add(god);
    const mask = new PixelCanvas(220, 280);
    mask.poly([[110, 6], [150, 30], [168, 78], [176, 120], [214, 168], [220, 280], [0, 280], [6, 168], [44, 120], [52, 78], [70, 30]], '#ffffff'); // hood + robe
    const face = (x, y) => ((x - 110) / 34) ** 2 + ((y - 92) / 44) ** 2 < 1; // the void where a face should be
    const pos = [], col = []; const C = new THREE.Color(); const rndS = mulberry32(77);
    for (let i = 0; i < 26000; i++) {
      const u = rndS(), v = rndS(); const x = Math.floor(u * 220), y = Math.floor(v * 280); if (!mask.alpha(x, y) || face(x, y)) continue;
      const edge = !mask.alpha(x - 3, y) || !mask.alpha(x + 3, y) || !mask.alpha(x, y - 3) || face(x, y - 4) || face(x, y + 4) || face(x - 4, y) || face(x + 4, y);
      const X = (u - 0.5) * 30, Y = (1 - v) * 38 - 8; const round = Math.sqrt(Math.max(0, 1 - (X / 16) ** 2)) * 4; const fold = Math.sin(X * 0.8 + Y * 0.15) * 0.6;
      pos.push(X, Y, round + fold + (rndS() - 0.5) * 1.5);
      if (edge) C.set(rndS() < 0.5 ? 0x8fe3ff : 0xcdb6f0).multiplyScalar(1.6); else C.setHSL(0.72 + rndS() * 0.08, 0.6, 0.12 + rndS() * 0.2 + (rndS() < 0.02 ? 0.6 : 0));
      col.push(C.r, C.g, C.b);
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    god.add(new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.godEyes = []; for (const s of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: pixelTex(sprite('star4')), color: new THREE.Color(0xe8fbff).multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false })); e.position.set(s * 1.6, 19, 4.5); e.scale.setScalar(2.2); god.add(e); this.godEyes.push(e); }
    // hands of starlight cupping the orb
    this.hands = [];
    for (const s of [-1, 1]) {
      const h = new THREE.Group(); h.position.set(s * 8.5, 11.5, 20); god.add(h); this.hands.push(h);
      const hp = [], hc = []; const hm = new PixelCanvas(80, 70); hm.poly([[0, 30], [30, 10], [60, 4], [78, 14], [70, 24], [50, 26], [62, 40], [44, 58], [10, 64]], '#fff');
      for (let i = 0; i < 4000; i++) { const x = Math.floor(rndS() * 80), y = Math.floor(rndS() * 70); if (!hm.alpha(x, y)) continue; hp.push(-s * (x / 80) * 6, (1 - y / 70) * 5 - 2, (rndS() - 0.5) * 1.2); C.setHSL(0.7, 0.6, 0.15 + rndS() * 0.25); if (!hm.alpha(x + 3, y) || !hm.alpha(x, y - 3)) C.set(0x8fe3ff).multiplyScalar(1.4); hc.push(C.r, C.g, C.b); }
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
      h.add(new THREE.Points(hg, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    }
    // the miniature universe: a glass orb with a spiral galaxy and tiny planets on gravity strings
    const orb = (this.orb = new THREE.Group()); orb.position.set(0, 3.2, 0); sc.add(orb);
    mk(new THREE.IcosahedronGeometry(3.6, 3), new THREE.MeshPhysicalMaterial({ color: 0x6a7aff, roughness: 0.05, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false }), orb);
    this.innerGal = galaxy(2600, 3.2, 3); orb.add(this.innerGal);
    mk(S.gem(0.35, 1, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c0).multiplyScalar(3) }), orb);
    this.planets = [];
    for (let i = 0; i < 4; i++) { const pl = P3.planet({ kind: ['earth', 'moon', 'wood', 'other'][i], r: 0.22 + i * 0.05 }); orb.add(pl); this.planets.push({ o: pl, r: 1.3 + i * 0.6, sp: 0.6 - i * 0.1, ph: i * 1.7 }); }
    const sp = new Float32Array(4 * 6); this.godStrings = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(0xb4e8ff).multiplyScalar(2.2), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); this.godStrings.frustumCulled = false; sc.add(this.godStrings);
    // floating galaxies
    this.gals = []; for (let i = 0; i < 4; i++) { const g = galaxy(1200, 3 + Math.random() * 3, 2 + (i % 3), vpick([0xb48cff, 0xf2a6a0, 0x8fe3ff]), vpick([0xffe08a, 0xe8fbff])); g.position.set(vrange(-30, 30), vrange(-6, 14), vrange(-60, -25)); g.rotation.set(vrange(-1, 1), 0, vrange(-0.6, 0.6)); sc.add(g); this.gals.push(g); }
    // Schrödinger's box
    const crateArt = safeDrawn('crate', 0); const box = (this.box = crateArt ? new THREE.Group() : ITEM_MODELS.schrodinger()); if (crateArt) { this.crateImg = standee(crateArt, { height: 3.2, anchor: 'center', lit: false }); box.add(this.crateImg); } box.position.set(-9, 2.5, 4); if (!crateArt) box.scale.setScalar(1.6); sc.add(box); this.boxS = new Spring(0, 14, 0.25);
    // Newton's apple (throwable)
    const appleArt = safeDrawn('newton_apple'); this.apple = appleArt ? standee(appleArt, { height: 2.2, anchor: 'center', lit: false }) : P3.apple(); this.apple.position.set(9, 4.5, 4); if (!appleArt) this.apple.scale.setScalar(1.1); sc.add(this.apple); this.appleVel = new THREE.Vector3(); this.appleFree = false; this.appleHome = this.apple.position.clone();
    // Sir Isaac dangling
    this.prof = createProfessor(); this.prof.root.position.set(-6.6, -3.2, 7); this.prof.root.rotation.y = 0.5; this.prof.root.scale.setScalar(1.4); sc.add(this.prof.root);
    this.parts = new (await import('../gfx/particles.js')).Particles(1200, { additive: true }); sc.add(this.parts.points);
    this.engine.setWorld(sc, this.camera); this.engine.setFx({ bloom: [0.9, 0.7, 0.55], tilt: false, grade: { sat: 1.15, contrast: 1.1, vignette: 0.6, grain: 0.05, lift: [0.01, 0, 0.04] } });
    this.engine.add(this); this.pushInput(); audio.playMusic('menu'); audio.setAmbSet(['cosmos']);
    // UI: title + buttons
    const W = this.W, H = this.H;
    this.title = domText([[['APPLE OF DISCORD', '#ffe08a']]], { w: 26, h: 3, font: 'Pixelify', size: 190, weight: 700, stroke: ['#3e2b6b', 26] }); this.title.position.set(0, H - 2.6, 4); this.root.add(this.title);
    this.sub = domText([[['Every action has an equal and opposite god.', '#cdb6f0']]], { w: 22, h: 1, font: 'VT323', size: 70, stroke: ['#140d26', 10] }); this.sub.position.set(0, H - 4.6, 4); this.root.add(this.sub);
    const hasRun = !!save.loadRun(); let y = -1.0;
    if (hasRun) { this.addButton(new Button3D('Continue the Loop', () => this.go('continue'), { w: 7, h: 1.25, size: 58, color: 'purple' }), W - 6, y, 2); y -= 1.6; }
    this.addButton(new Button3D(hasRun ? 'New Loop' : 'Begin the Loop', () => this.go('new'), { w: 7, h: 1.25, size: 58 }), W - 6, y, 2); y -= 1.6;
    this.addButton(new Button3D('Discovery Journal', () => this.openJournal(), { w: 7, h: 1.25, size: 54, color: 'teal' }), W - 6, y, 2); y -= 1.6;
    this.addButton(new Button3D('Settings', () => this.settingsToggle(), { w: 7, h: 1.25, size: 54 }), W - 6, y, 2); y -= 1.6;
    this.addButton(new Button3D('Credits', () => this.credits(), { w: 7, h: 1.25, size: 54 }), W - 6, y, 2);
    const j = this.game.journal; this.stats = domText([[[`Loops remembered: ${j.loops} · Combinations: ${Object.keys(j.combos).length} · Best hit: ${j.bestHit || 0}`, '#e8d4a2']]], { w: 22, h: 0.8, font: 'VT323', size: 54, stroke: ['#140d26', 8] }); this.stats.position.set(0, -H + 0.9, 3); this.root.add(this.stats);
    this.note = new Note({ w: 8, h: 1.3, size: 44, tail: true }); this.root.add(this.note.group);
  }
  async openJournal() { const { Journal } = await import('./journal.js'); if (!this.journal) this.journal = new Journal(this.game, this.root); this.journal.open(); }
  settingsToggle() {
    const s = this.game.settings; const steps = [0, 0.3, 0.6, 0.9]; s.music = steps[(steps.indexOf(steps.reduce((a, b) => (Math.abs(b - s.music) < Math.abs(a - s.music) ? b : a))) + 1) % 4];
    audio.vol.music = s.music; audio.applyVolumes(); save.saveSettings(); this.say(`Music volume: ${Math.round(s.music * 100)}%. (Click again to cycle.)`);
  }
  async credits() {
    let lines = ['Code, models, cards & design: made for this game.', 'Fonts: Pixelify Sans, VT323, Silkscreen, Caveat, Tiny5, Jacquard 24 (OFL), Homemade Apple (Apache 2.0).', 'three.js (MIT).'];
    try { const r = await fetch('assets/audio/credits.json'); if (r.ok) { const c = await r.json(); lines.push(`Audio: ${c.length} recordings, CC0 / CC BY. Full list in assets/audio/CREDITS.md`); lines.push(...c.filter((x) => /BY/.test(x.license)).slice(0, 6).map((x) => `"${x.title}" by ${x.author} (${x.license})`)); } } catch (e) { /* */ }
    this.tip.show(lines.slice(0, 9).map((l) => [[l, '#2a160c']]), 0, 0, 12); this.tip.plane.scale.set(2.4, 2.4, 1); setTimeout(() => { this.tip.hide(); this.tip.plane.scale.set(1, 1, 1); }, 9000);
  }
  say(t) { const p = this.engine.worldToUI(this.prof.headWorld(new THREE.Vector3())); this.note.show([[[t, '#2a160c']]], p.x + 3, p.y + 1.6, 9); this.prof.talk(1.5); audio.play('wood_knock', { vol: 0.4 }); clearTimeout(this._nt); this._nt = setTimeout(() => this.note.hide(), 2600); }
  async go(kind) {
    if (this.leaving) return; this.leaving = true; audio.play('transition_whoosh'); audio.play('magic_shimmer');
    const from = this.camera.position.clone(); const o = { k: 0 };
    await tweens.to(o, { k: 1 }, 1.4, { ease: 'inCubic', onUpdate: () => { this.camera.position.lerpVectors(from, this.orb.position, o.k * 0.97); this.camera.fov = 40 + o.k * 40; this.camera.updateProjectionMatrix(); } });
    this.engine.flash(1, 0xfff6cf, 0.8);
    if (kind === 'continue') this.game.continueRun(); else this.game.newRun();
  }
  rayWorld(objs) { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r.intersectObjects(objs, true); }
  onClick() {
    if (this.journal?.isOpen) return;
    if (this.rayWorld([this.box]).length) { this.boxS.kick(18); const alive = Math.random() < 0.5; const open = safeDrawn('crate', 1); if (open && this.crateImg) { this.crateImg.material.map = pixelTex(open); this.crateImg.material.needsUpdate = true; setTimeout(() => { this.crateImg.material.map = pixelTex(safeDrawn('crate', 0)); this.crateImg.material.needsUpdate = true; }, 2200); } audio.play(alive ? 'pop' : 'magic_shimmer'); this.say(alive ? 'Alive! ...for now. Do not look again.' : 'Dead. Or both. Mostly paperwork.'); return true; }
    if (this.rayWorld([this.prof.root]).length) { this.say(vpick(QUIPS)); this.prof.act('cheer'); return true; }
    if (this.rayWorld([this.orb]).length) { audio.play('chime_soft'); this.say('Careful. That is everything. Literally.'); return true; }
  }
  onDragStart() { if (this.rayWorld([this.apple]).length) { this.grab = true; this.appleFree = false; audio.play('card_pick'); return true; } }
  onDrag() { if (!this.grab) return; const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); const t = (4 - r.ray.origin.z) / r.ray.direction.z; this.apple.position.copy(r.ray.origin).addScaledVector(r.ray.direction, t); }
  onDragEnd(e) { if (!this.grab) return; this.grab = false; this.appleFree = true; this.appleVel.set(e.vx * 0.006, -e.vy * 0.006, -2); audio.play('whoosh_soft'); this.say(vpick(['Gravity: still works.', 'Yes. That is how I discovered it.', 'Into orbit with you.'])); }
  update(dt, t) {
    this.neb.material.uniforms.t.value = t;
    this.innerGal.rotation.y = t * 0.15; this.orb.rotation.y = Math.sin(t * 0.2) * 0.3; this.orb.position.y = 3.2 + Math.sin(t * 0.6) * 0.2;
    for (const p of this.planets) { const a = t * p.sp + p.ph; p.o.position.set(Math.cos(a) * p.r, Math.sin(a * 0.7) * 0.3, Math.sin(a) * p.r); }
    // strings from god's fingertips to planets
    const arr = this.godStrings.geometry.attributes.position.array; this.god.updateMatrixWorld(true);
    this.planets.forEach((p, i) => { const h = this.hands[i % 2]; const tip = new THREE.Vector3(i % 2 ? 5.5 : -5.5, 2.5 + i * 0.3, 0).applyMatrix4(h.matrixWorld); const pp = p.o.getWorldPosition(new THREE.Vector3()); arr.set([tip.x, tip.y, tip.z, pp.x, pp.y, pp.z], i * 6); });
    this.godStrings.geometry.attributes.position.needsUpdate = true;
    this.hands.forEach((h, i) => { h.rotation.z = Math.sin(t * 0.5 + i) * 0.06; h.position.y = 11.5 + Math.sin(t * 0.7 + i * 2) * 0.3; });
    this.god.rotation.y = Math.sin(t * 0.1) * 0.05; const blink = (t % 7) < 0.15 ? 0.15 : 1; this.godEyes.forEach((e) => e.scale.set(2.2, 2.2 * blink, 1));
    for (const g of this.gals) g.rotation.y += dt * 0.05;
    this.boxS.update(dt); this.box.rotation.set(Math.sin(t * 0.7) * 0.2 + this.boxS.value * 0.05, t * 0.3, this.boxS.value * 0.08); this.box.position.y = 2.5 + Math.sin(t * 1.1) * 0.3;
    if (this.appleFree) { const to = this.orb.position.clone().sub(this.apple.position); const d = Math.max(1.5, to.length()); this.appleVel.addScaledVector(to.normalize(), (30 / (d * d)) * dt); this.apple.position.addScaledVector(this.appleVel, dt); this.apple.rotation.y += dt * 3; if (this.apple.position.length() > 60) { this.appleFree = false; this.apple.position.copy(this.appleHome); } }
    else if (!this.grab) { this.apple.position.lerp(this.appleHome.clone().add(new THREE.Vector3(0, Math.sin(t * 1.3) * 0.4, 0)), 1 - Math.exp(-dt * 3)); this.apple.rotation.y += dt * 0.6; }
    this.prof.update(dt); this.prof.lookAt(this.input.ndc.x, this.input.ndc.y);
    if (!this.leaving) { this.camera.position.x = Math.sin(t * 0.1) * 1.5 + this.input.ndc.x * 1.2; this.camera.position.y = 2 + this.input.ndc.y * 0.8; this.camera.lookAt(this.camLook); }
    if (Math.random() < 0.4) this.parts.spawn({ pos: [vrange(-20, 20), vrange(-6, 12), vrange(-10, 8)], vel: [0, 0, 0], life: 3, size: vrange(14, 30), color: vpick(['#e8fbff', '#ffe08a', '#b48cff']), sprite: 'star4', alpha: 0.8 });
    this.parts.update(dt, t);
    this.title.position.y = this.H - 2.6 + Math.sin(t * 1.2) * 0.12; this.title.rotation.z = Math.sin(t * 0.8) * 0.01;
    this.updateUI(dt); this.note.update(dt); this.journal?.update(dt, t);
  }
}
