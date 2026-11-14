// LOADING: on a dark velvet stage under a warm key light and soft rim lights, a detailed apple lives its whole life in
// a time-lapse driven by the preload: it ripens, bruises, rots and wrinkles, collapses, worms wriggle out, then it
// shrinks back into one glossy seed that sprouts when loading completes; an engraved brass plate invites the click.
// GARDEN MENU: Newton's moonlit orchard. Newton floats by his apple tree (an apple drops on his head once); two wooden
// signs with pixel-art birds perched on them read New Run and Resume (birds hop off when you hover); the telescope leads
// to the Star Gallery, the journal on its stump opens the Discovery Journal, a lantern post holds Settings and a scroll
// the Credits. Halley the old mop dog ambles, sniffs and sits; click the grass (or press Space) and Newton throws an
// apple for him to fetch; click Halley to pet him. New Run tilts the camera up into the night sky (sky.js).
import * as THREE from 'three';
import { Strip } from '../ui3d/objects.js';
import { uiPos, plainMat } from '../ui3d/craft.js';
import { UIScreen } from '../ui3d/widgets.js';
import { Note } from '../ui3d/kit.js';
import { createProfessor } from '../models/professor.js';
import { buildOrchard, appleTimelapse, makeApple, plaque, SPOTS } from '../models/orchard.js';
import { createDog } from '../models/dog.js';
import { Critters } from '../gfx/critters.js';
import * as T from '../models/toon.js';
import { save } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vpick, mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };

// ================================================================ LOADING: the apple time-lapse on velvet
function velvetStage() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const r = mulberry32(5); const ramp = ['#1a0614', '#240a1c', '#2e0e24', '#3a142e', '#4a1c3a'];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const crush = Math.sin(x * 0.45 + Math.sin(y * 0.37 + x * 0.11) * 2.6) * 0.5 + 0.5; g.fillStyle = ramp[1 + (crush > 0.72 ? 1 : 0) + (r() < 0.06 ? 1 : 0) - (r() < 0.1 ? 1 : 0)]; g.fillRect(x, y, 1, 1); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(14, 10);
  const prof = []; for (let i = 0; i <= 12; i++) prof.push([3 - i * 0.35, 0]); for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push([-1.2 - Math.sin(a) * 1.4, 1.4 - Math.cos(a) * 1.4]); } for (let i = 1; i <= 10; i++) prof.push([-2.6, 1.4 + i * 0.5]);
  const P = [], U = [], I = []; const X = 24; prof.forEach(([z, y], j) => { for (let i = 0; i <= X; i++) { const x = (i / X - 0.5) * 12; P.push(x, y, z); U.push(i / X, j / prof.length); } });
  for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < X; i++) { const a = j * (X + 1) + i; I.push(a, a + X + 1, a + 1, a + 1, a + X + 1, a + X + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const m = new THREE.MeshToonMaterial({ map: tex, gradientMap: T.gradientMap([0.5, 0.8, 1.0]), side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'float vs = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5); outgoingLight += vec3(0.35, 0.1, 0.28) * step(0.35, vs) * 0.6;\n#include <opaque_fragment>'); };
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.userData.noInk = true; return mesh;
}
export class LoadingScene extends UIScreen {
  async enter({ preload = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x0c0410); sc.add(velvetStage());
    const table = new THREE.Mesh(this.tableGeo(), plainMat('walnut')); table.castShadow = table.receiveShadow = true; sc.add(table);
    const A = (this.A = appleTimelapse()); A.group.scale.setScalar(0.62); A.group.position.y = 0.62; sc.add(A.group); A.set(0);
    const key = new THREE.SpotLight(0xffd6a8, 26, 9, 0.5, 0.6, 1.4); key.position.set(0.9, 3.0, 2.2); key.target.position.set(0, 0.8, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; sc.add(key, key.target);
    const rimC = new THREE.DirectionalLight(0x8ab0ff, 2.4); rimC.position.set(-2.5, 1.6, -2.2); const rimW = new THREE.DirectionalLight(0xff9a60, 1.8); rimW.position.set(2.6, 1.2, -2.0); sc.add(rimC, rimW, new THREE.HemisphereLight(0x6a4a8a, 0x1a0a14, 0.55));
    this.plate = plaque('Click to Begin', { font: 'title', style: 'engrave', kind: 'brass', depth: 0.25 }); { const [w] = this.plate.userData.size; this.plate.scale.multiplyScalar(0.62 / w); this.plateBase = this.plate.scale.x; } this.plate.position.set(0, 0.64, 0.5); this.plate.rotation.x = -0.75; this.plate.visible = false; sc.add(this.plate); this.plateS = new Spring(0, 10, 0.3);
    this.camera = new THREE.PerspectiveCamera(30, this.engine.aspect, 0.05, 60); this.camera.position.set(0, 1.05, 2.55); this.camera.lookAt(0, 0.86, 0);
    this.engine.setWorld(sc, this.camera); this.engine.setFx({ bloom: [0.8, 0.6, 0.7], tilt: false, grade: { sat: 1.1, contrast: 1.1, vignette: 0.7, lift: [0.01, 0.0, 0.02] }, ink: { fade: [6, 20] } });
    this.pre = preload; this.t0 = performance.now(); this.age = 0; this.engine.add(this); this.pushInput();
  }
  tableGeo() { const pts = [[0.001, 0.0], [0.34, 0.0], [0.36, 0.04], [0.18, 0.1], [0.12, 0.3], [0.1, 0.5], [0.14, 0.55], [0.62, 0.57], [0.66, 0.6], [0.64, 0.63], [0.001, 0.63]].map(([a, b]) => new THREE.Vector2(a, b)); const g = new THREE.LatheGeometry(pts, 48); g.computeVertexNormals(); return g; }
  get done() { return this.age >= 1 && (!this.pre || this.pre.progress() >= 1); }
  onClick() { if (!this.done || this.leaving) return true; this.leaving = true; audio.play('magic_shimmer', { vol: 0.6 }); audio.play('wood_knock', { vol: 0.4 }); this.game.toMenu({ from: 'loading' }); return true; }
  update(dt, t) {
    const el = (performance.now() - this.t0) / 1000; const prog = this.pre ? Math.min(1, this.pre.progress()) : 1; const target = Math.min(prog, el / 9.5);
    this.age += Math.max(0, target - this.age) * Math.min(1, dt * 3) + (target - this.age > 0 ? 0.0008 : 0); this.age = Math.min(1, this.age); this.A.set(this.age);
    if (this.age >= 0.999 && prog >= 1) { this.sproutT = (this.sproutT || 0) + dt; this.A.sprout(this.sproutT / 1.6); if (this.sproutT > 1.0 && !this.plate.visible) { this.plate.visible = true; this.plateS.value = 0; this.plateS.target = 1; this.plateS.kick?.(3); audio.play('chime_soft', { vol: 0.5 }); } }
    this.plateS.update(dt); this.plate.scale.setScalar(Math.max(0.001, this.plateS.value) * this.plateBase);
    this.A.group.rotation.y = t * 0.25; const zin = ease(this.age > 0.86 ? (this.age - 0.86) / 0.14 : 0); this.camera.position.set(Math.sin(t * 0.2) * 0.12, 1.05 - zin * 0.18, 2.75 - zin * 1.1); this.camera.lookAt(0, 0.86 - zin * 0.12, 0); this.updateUI(dt);
  }
}

// ================================================================ GARDEN MENU
const QUIPS = ['An apple a day keeps the gods away.', 'Every action has an equal and opposite god.', 'Gravity: still undefeated.', 'Halley! Leave the bees alone.'];
const SHOT = { pos: V(0.6, 2.4, 10.8), look: V(0.1, 2.0, 0.6), fov: 40 };
export class MenuScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); const O = (this.O = buildOrchard({ renderer: this.engine.renderer })); sc.add(O.group); sc.fog = O.fog; O.setNight(0.85);
    this.camera = new THREE.PerspectiveCamera(SHOT.fov, this.engine.aspect, 0.1, 420); this.look = SHOT.look.clone(); this.camera.position.copy(SHOT.pos);
    const prof = (this.prof = createProfessor()); sc.add(prof.root); prof.root.position.copy(SPOTS.float).setY(O.hAt(SPOTS.float.x, SPOTS.float.z)); prof.root.rotation.y = 0.12; prof.setIdleMode?.('menu');
    O.prompt.group.visible = false; O.ripe.visible = false; this.hasRun = !!save.loadRun(); save.evaluate();
    // the menu's physical things
    this.items = [
      { key: 'new', obj: O.objs.newRun, act: () => this.toSky(), birds: 3 },
      { key: 'resume', obj: O.objs.resume, act: () => this.go('continue'), hidden: !this.hasRun, birds: 2 },
      { key: 'gallery', obj: O.objs.telescope, act: () => this.toGallery() },
      { key: 'journal', obj: O.objs.journal, act: () => this.openJournal() },
      { key: 'settings', obj: O.objs.settings, act: () => this.settingsToggle() },
      { key: 'credits', obj: O.objs.credits, act: () => this.credits() },
    ];
    for (const it of this.items) { it.pop = new Spring(1, 9, 0.32); it.lift = new Spring(0, 14, 0.38); it.wob = new Spring(0, 12, 0.2); it.base = it.obj.position.clone(); it.rotY = it.obj.rotation.y; it.obj.visible = !it.hidden; }
    this.titleDrop = new Spring(from === 'loading' ? 1 : 0, 7, 0.25); this.titleDrop.target = 0;
    // birds: perches on the signs (top rails) and in the trees; a few start on each sign
    const cr = (this.critters = new Critters(60)); cr.bounds = { x: [-10, 10], y: [1.6, 7], z: [-12, 5] }; sc.add(cr.mesh);
    sc.updateMatrixWorld(true); for (const p of O.perches) cr.perchesFrom(p, 3);
    for (const it of this.items) if (it.birds && !it.hidden) { const pts = it.obj.userData.top(it.birds).map((p) => it.obj.localToWorld(p)); it.perches = pts; cr.addPerches(pts); }
    cr.spawnBirds(18, ['sparrow', 'swallow', 'hoopoe', 'dove', 'sparrow']);
    for (const it of this.items) if (it.perches) for (const p of it.perches) { const pr = cr.perches.find((q) => q.p.distanceTo(p) < 1e-3); const b = cr.list.find((x) => x.kind === 'bird' && x.state !== 'perch' && !x.perch); if (pr && b) { if (pr.taken) continue; pr.taken = true; b.perch = pr; b.state = 'perch'; b.pos.copy(pr.p); } }
    cr.spawnButterflies?.(4, V(-1, 0.8, 3), 6);
    // Halley the mop dog
    const dog = (this.dog = createDog()); dog.hAt = O.hAt; dog.area = { x: [-4.2, 4.8], z: [0.6, 5.6] }; dog.home = V(1.3, 0, 3.1); dog.root.position.set(2.8, 0, 3.4); dog.st.heading = -0.8; sc.add(dog.root);
    this.apples = [];
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.75, 0.6, 0.7], tilt: false, grade: { sat: 1.12, contrast: 1.08, vignette: 0.55, warmth: 0.04, lift: [0.015, 0.01, 0.045] }, ink: { fade: [40, 120] } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['night', 'stream']); audio.playMusic('menu');
    const j = this.game.journal; this.stats = new Strip([`Loops remembered: ${j.loops} · Star shards: ${save.meta.shards} · Best hit: ${j.bestHit || 0}`], { maxW: 24, font: 'handS', tone: 3 }); uiPos(this.stats.group, 0, -this.H + 0.85, 3); this.root.add(this.stats.group);
    this.note = new Note({ w: 8, h: 1.3, size: 44, tail: true }); this.root.add(this.note.group);
    if (from === 'loading') setTimeout(() => this.dropOnHead(), 1600); // the garden's welcome: an apple falls on his head
    if (from === 'sky' || from === 'gallery') { this.camera.position.copy(SHOT.pos).add(V(0, -1.2, 3)); }
  }
  // ---------------------------------------------------------------- apples: thrown, dropped, bouncing, fetched
  spawnApple(p, v) { const a = makeApple({ s: 0.2 }); a.position.copy(p); this.scene.add(a); const it = { a, v: v.clone(), spin: V(6, 0, 4), t: 0, onHead: false }; this.apples.push(it); return it; }
  throwApple(target) {
    if (this.throwing) return; this.throwing = true; setTimeout(() => { this.throwing = false; }, 450); const prof = this.prof; prof.act('cast'); prof.lookAt(0.3, 0.1); audio.play('whoosh_soft', { vol: 0.6 });
    const start = (prof.appleWorld ? prof.appleWorld(V()) : prof.handWorld(1, V())).add(V(0, 0.15, 0)); const T0 = 0.95; const v = target.clone().sub(start).add(V(0, 0.5 * 9.8 * T0 * T0, 0)).divideScalar(T0);
    const it = this.spawnApple(start, v); it.fetch = true;
  }
  dropOnHead() {
    if (!this.prof) return; const top = this.prof.headTopWorld ? this.prof.headTopWorld(V()) : this.prof.headWorld(V()).add(V(0, 0.2, 0));
    const it = this.spawnApple(top.clone().add(V(0.05, 1.9, 0.02)), V(0, 0, 0)); it.head = true; audio.play('wood_creak', { vol: 0.4 }); this.O.burst(top.clone().add(V(0, 2.1, 0)));
  }
  stepApples(dt) {
    for (const it of this.apples) {
      if (it.a.userData.carried) continue; it.t += dt; const a = it.a, v = it.v;
      v.y -= 9.8 * dt; a.position.addScaledVector(v, dt); a.rotation.x += it.spin.x * dt; a.rotation.z += it.spin.z * dt;
      if (it.head && !it.hit) { const top = this.prof.headTopWorld ? this.prof.headTopWorld(V()) : this.prof.headWorld(V()).add(V(0, 0.2, 0)); if (a.position.y - 0.1 <= top.y) { it.hit = true; a.position.y = top.y + 0.1; v.set(1.2, 2.6, 1.2); it.spin.set(9, 0, -10); audio.play('hit_wood', { vol: 0.8 }); audio.play('pop', { vol: 0.4 }); this.engine.shake(0.15); this.prof.act('hurt'); setTimeout(() => this.say('Ow. Gravity, again.'), 300); it.fetch = true; } }
      const gy = this.O.hAt(a.position.x, a.position.z) + 0.1; if (a.position.y < gy) { a.position.y = gy; if (v.y < -0.8) { v.y = -v.y * 0.36; v.x *= 0.7; v.z *= 0.7; audio.play('wood_knock', { vol: 0.2 }); } else { v.y = 0; const k = Math.exp(-2.4 * dt); v.x *= k; v.z *= k; it.spin.multiplyScalar(k); if (!it.landed) { it.landed = true; if (it.fetch && !this.fetching) this.sendDog(it); } } }
      if (it.a.userData.dropped && (it.drop = (it.drop || 0) + dt) > 4) it.gone = true;
      if (it.landed && !it.fetch && it.t > 8) it.gone = true;
    }
    this.apples = this.apples.filter((it) => { if (!it.gone) return true; it.a.parent?.remove(it.a); return false; });
  }
  sendDog(it) { this.fetching = it; this.critters.scare(it.a.position, 2.5); this.dog.fetch(it.a, () => { this.fetching = null; it.fetch = false; it.t = 0; audio.play('pop', { vol: 0.35 }); this.prof.act('cheer'); this.say(vpick(['Good boy, Halley!', 'Fetched! Elastic collision, perfectly inelastic dog.', 'Again? Again.'])); const next = this.apples.find((x) => x.landed && x.fetch && !x.a.userData.carried && !x.a.userData.dropped); if (next) this.sendDog(next); }); audio.play('wood_knock', { vol: 0.25 }); }
  // ---------------------------------------------------------------- menu actions
  toSky() { if (this.leaving) return; this.leaving = 'sky'; this.leaveT = performance.now(); this.leaveFrom = { pos: this.camera.position.clone(), look: this.look.clone() }; audio.play('magic_shimmer'); audio.play('whoosh_soft', { vol: 0.6 }); this.critters.scare(V(0, 2, 3), 12); }
  toGallery() { if (this.leaving) return; this.leaving = 'gallery'; this.leaveT = performance.now(); this.leaveFrom = { pos: this.camera.position.clone(), look: this.look.clone() }; audio.play('transition_whoosh', { vol: 0.6 }); }
  async go(kind) { if (this.leaving) return; this.leaving = kind; audio.play('transition_whoosh'); this.engine.flash(1, 0xfff6cf, 0.8); if (kind === 'continue') this.game.continueRun(); else this.game.newRun(); }
  async openJournal() { const { Journal } = await import('./journal.js'); if (!this.journal) this.journal = new Journal(this.game, this.root); this.journal.open(); }
  settingsToggle() {
    const s = this.game.settings; const steps = [0, 0.3, 0.6, 0.9]; s.music = steps[(steps.indexOf(steps.reduce((a, b) => (Math.abs(b - s.music) < Math.abs(a - s.music) ? b : a))) + 1) % 4];
    audio.vol.music = s.music; audio.applyVolumes(); save.saveSettings(); this.say(`Music volume: ${Math.round(s.music * 100)}%. Click the lantern again to cycle.`);
  }
  async credits() {
    const lines = ['Code, models, cards & design: made for this game.', 'Fonts: Alagard, Pixelify Sans, VT323, Silkscreen, Caveat, Tiny5, Jacquard 24 (OFL), Homemade Apple (Apache 2.0).', 'three.js (MIT). 3D assets: Poly Haven (CC0).'];
    try { const r = await fetch('assets/audio/credits.json'); if (r.ok) { const c = await r.json(); lines.push(`Audio: ${c.length} recordings, CC0 / CC BY. Full list in assets/audio/CREDITS.md`); lines.push(...c.filter((x) => /BY/.test(x.license)).slice(0, 5).map((x) => `"${x.title}" by ${x.author} (${x.license})`)); } } catch (e) { /* */ }
    this.tip.show(lines.slice(0, 9).map((l, i) => [[l, i ? '#2a160c' : '#3a2410']]), 0, 0, 12, { maxW: 26 }); clearTimeout(this._ct); this._ct = setTimeout(() => this.tip.hide(), 9000);
  }
  say(t) { const p = this.engine.worldToUI(this.prof.headWorld(V())); this.note.show([[[t, '#2a160c']]], p.x + 3, p.y + 1.6, 9); this.prof.talk(1.5); clearTimeout(this._nt); this._nt = setTimeout(() => this.note.hide(), 2600); }
  // ---------------------------------------------------------------- input
  ray() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  pickItem() { if (this.leaving || this.journal?.isOpen) return null; const hits = this.ray().intersectObjects(this.items.filter((it) => !it.hidden).map((it) => it.obj), true); if (!hits.length) return null; let o = hits[0].object; while (o) { const it = this.items.find((x) => x.obj === o); if (it) return it; o = o.parent; } return null; }
  onMove() { const h = this.pickItem(); if (h !== this.hover) { if (this.hover) this.hover.hover = false; this.hover = h; if (h) { h.hover = true; h.wob.kick?.(6); audio.play('ui_hover', { vol: 0.45 }); if (h.perches) this.critters.scare(h.obj.getWorldPosition(V()).add(V(0, 1.7, 0)), 1.6); } this.engine.renderer.domElement.style.cursor = h ? 'pointer' : ''; } }
  onKey(e) { const k = e?.key || e?.code || e; if (k === ' ' || k === 'Space' || k === 'a' || k === 'KeyA') { const A = this.dog.area; this.throwApple(V(A.x[0] + Math.random() * (A.x[1] - A.x[0]), 0, A.z[0] + Math.random() * (A.z[1] - A.z[0])).setY(0)); return true; } }
  onClick() {
    if (this.journal?.isOpen || this.leaving) return;
    const it = this.pickItem(); if (it) { it.pop.kick?.(-3); it.wob.kick?.(-8); audio.play('card_place', { vol: 0.6 }); it.act(); return true; }
    const r = this.ray();
    if (r.intersectObject(this.dog.root, true).length) { this.dog.pet(); audio.play('pop', { vol: 0.4 }); this.say(vpick(['Who is a good old mop? You are.', 'Halley. My only peer reviewer.', 'Good boy.'])); return true; }
    if (r.intersectObject(this.prof.root, true).length) { this.say(vpick(QUIPS)); this.prof.act('cheer'); return true; }
    const g = r.intersectObject(this.O.ground, false)[0]; if (g) { const A = this.dog.area; const p = g.point; p.x = Math.max(A.x[0], Math.min(A.x[1], p.x)); p.z = Math.max(A.z[0], Math.min(A.z[1], p.z)); this.throwApple(p.setY(this.O.hAt(p.x, p.z))); return true; }
  }
  update(dt, t) {
    const { O, prof } = this; O.update(dt, t); prof.update(dt); this.dog.update(dt, t); this.critters.update(dt, t); this.stepApples(Math.min(dt, 0.05));
    // camera: gentle parallax; or the exits (tilt up into the night sky, or walk to the telescope / observatory)
    const nd = this.input.ndc;
    if (this.leaving === 'sky' || this.leaving === 'gallery') {
      const u = ease5((performance.now() - this.leaveT) / 1700); const f = this.leaveFrom;
      if (this.leaving === 'sky') { this.camera.position.copy(f.pos).lerp(V(0.4, 1.4, 8.6), u); this.look.copy(f.look).lerp(V(0.2, 40, -6), u); O.setNight(0.85 + 0.15 * u); this.camera.fov = 40 + 12 * u; }
      else { const tp = SPOTS.telescope; this.camera.position.copy(f.pos).lerp(V(tp.x + 0.9, 1.9, tp.z + 1.6), u); this.look.copy(f.look).lerp(V(tp.x, 1.7, tp.z), u); this.camera.fov = 40 - 14 * u; }
      this.camera.updateProjectionMatrix();
      if (u >= 1 && !this.left) { this.left = true; if (this.leaving === 'sky') this.game.toSky(); else this.game.toGallery(); }
    } else if (!this.leaving) {
      this.camera.position.lerp(V(SHOT.pos.x + Math.sin(t * 0.12) * 0.35 + nd.x * 0.45, SHOT.pos.y + nd.y * 0.25, SHOT.pos.z), Math.min(1, dt * 2.5)); this.look.copy(SHOT.look);
      if (Math.abs(this.camera.fov - SHOT.fov) > 0.01) { this.camera.fov += (SHOT.fov - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }
    }
    if (this.camOverride) { this.camera.position.copy(this.camOverride.pos); this.look.copy(this.camOverride.look); }
    this.camera.lookAt(this.look);
    for (const it of this.items) { it.pop.update(dt); it.lift.target = it.hover ? 0.12 : 0; it.lift.update(dt); it.wob.update(dt); it.obj.scale.setScalar(Math.max(0.001, it.pop.value)); it.obj.position.set(it.base.x, it.base.y + it.lift.value, it.base.z); it.obj.rotation.set(0, it.rotY + it.wob.value * 0.02, it.wob.value * 0.012); }
    // Newton glances at what you point at, or watches Halley and the apple
    const tgt = this.hover ? this.hover.obj.getWorldPosition(V()).add(V(0, 1.0, 0)) : this.fetching ? this.dog.root.position.clone().add(V(0, 0.5, 0)) : null;
    if (tgt) { const p = tgt.project(this.camera); prof.lookAt(p.x, p.y); } else prof.lookAt(nd.x * 0.6, nd.y * 0.4);
    this.titleDrop.update(dt); O.title.group.position.set(SPOTS.title.x, SPOTS.title.y + this.titleDrop.value * 2.4, SPOTS.title.z);
    const pp = this.ptr(4); this.stats?.update(dt, pp); this.updateUI(dt); this.note?.update(dt); this.journal?.update(dt, t);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; super.dispose(); }
}
