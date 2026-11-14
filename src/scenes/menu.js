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
import { buildOrchard, appleTimelapse, makeApple, plaque, SPOTS, TOWER } from '../models/orchard.js';
import { FloatLabel } from '../ui3d/floatlabel.js';
import { spaceBackdrop } from '../gfx/spacebg.js';
import { Motes } from '../gfx/motes.js';
import { createDog } from '../models/dog.js';
import { prop } from '../models/lowprops.js';
import * as F from '../models/flora.js';
import { Critters } from '../gfx/critters.js';
import * as T from '../models/toon.js';
import { save } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vpick, mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };

// ================================================================ LOADING: the apple time-lapse adrift in pixel-art deep space
// A pixel-art nebula (violet veils, teal streams, gold wisps), a turning spiral galaxy, ringed and cratered planets,
// three twinkling parallax starfields and shooting stars (gfx/spacebg.js); the nearby star rims the apple with warm
// light. Fine pixel particles (gfx/motes.js): drifting stardust, twinkles round the fresh apple, rot spores puffing as
// it decays, a glittering burst when it collapses back into a seed and again when the seed sprouts. When the preload is
// done and the sprout has unfolded, the camera dives at the seedling and an iris wipe carries us into the garden.
const DUST = ['#8fe8d8', '#c8a8ff', '#ffe2a8', '#e8ecff', '#a8c8ff'];
export class LoadingScene extends UIScreen {
  async enter({ preload = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x020106);
    this.bg = spaceBackdrop(); sc.add(this.bg.mesh);
    const A = (this.A = appleTimelapse()); A.group.scale.setScalar(0.62); A.group.position.y = 0.62; sc.add(A.group); A.set(0); A.rim(1);
    // the nearby star (upper right, behind) rims the apple; a soft key from the viewer; teal nebula fill; violet bounce
    const star = new THREE.DirectionalLight(0xffe2b0, 5.2); star.position.set(2.8, 2.3, -2.6); star.target.position.set(0, 0.85, 0);
    const key = new THREE.DirectionalLight(0xfff2e2, 1.25); key.position.set(-1.0, 1.9, 2.8); key.target.position.set(0, 0.85, 0);
    const fill = new THREE.DirectionalLight(0x4cc8c0, 1.0); fill.position.set(-3, 0.3, 0.4); fill.target.position.set(0, 0.85, 0);
    sc.add(star, star.target, key, key.target, fill, fill.target, new THREE.HemisphereLight(0x6a4aa8, 0x081420, 0.55));
    this.motes = new Motes(1100, { px: 3 }); sc.add(this.motes.points); this.rnd = mulberry32(1642);
    this.camera = new THREE.PerspectiveCamera(30, this.engine.aspect, 0.05, 60); this.camera.position.set(0, 1.05, 2.55); this.camera.lookAt(0, 0.86, 0);
    this.engine.setWorld(sc, this.camera); this.engine.setFx({ bloom: [0.95, 0.5, 0.62], tilt: false, exposure: 1.1, grade: { sat: 1.12, contrast: 1.06, vignette: 0.5, lift: [0.01, 0.006, 0.022] }, ink: { fade: [6, 20] } });
    for (let i = 0; i < 170; i++) this.dust(true);
    this.pre = preload; this.t0 = performance.now(); this.age = 0; this.acc = { dust: 0, spark: 0, spore: 0, glow: 0 }; this.engine.add(this); this.pushInput();
  }
  dust(initial = false) { // one drifting stardust mote somewhere in the volume around the apple (near ones are drawn 2x)
    const r = this.rnd; const z = -4 + r() * 5.6; const near = z > 0.9; const p = [(r() - 0.5) * (5 + (2 - z) * 1.2), -0.6 + r() * 3.2, z]; if (!initial) p[0] = (r() < 0.5 ? -1 : 1) * (2.4 + r() * 1.2);
    this.motes.spawn({ pos: p, vel: [(p[0] < 0 ? 1 : -1) * (0.03 + r() * 0.06), 0.015 + r() * 0.03, 0.02], life: 7 + r() * 7, sprite: r() < 0.75 ? 'm1' : r() < 0.6 ? 'dust' : 'm2', color: DUST[Math.floor(r() * DUST.length)], bright: 0.6 + r() * 0.9, k: near ? 2 : 1, twinkle: 1.5 + r() * 4, fadeIn: 0.15 });
  }
  get done() { return this.age >= 1 && (!this.pre || this.pre.progress() >= 1); }
  onClick() { return true; } // nothing to press: the garden opens by itself (the first click there starts the music)
  burst(p, n, { colors = ['#fff2c0', '#ffd27a', '#ffffff', '#9ff0e0'], speed = 1, leaves = 0 } = {}) {
    const r = this.rnd;
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar((0.25 + r() * 0.75) * speed); d.y += 0.15 * speed;
      this.motes.spawn({ pos: p, vel: d, drag: 2.4, grav: -0.04, life: 0.7 + r() * 1.1, seq: r() < 0.6 ? 'twinkle' : r() < 0.5 ? 'glint' : ['dia', 'x5', 'dia', 't3'], fps: 7 + r() * 5, color: colors[Math.floor(r() * colors.length)], bright: 1.4 + r(), k: r() < 0.15 ? 2 : 1, fadeIn: 0.02 }); }
    for (let i = 0; i < leaves; i++) { const a = r() * Math.PI * 2; this.motes.spawn({ pos: p, vel: [Math.cos(a) * 0.5, 0.35 + r() * 0.4, Math.sin(a) * 0.5], drag: 1.6, grav: 0.18, wobble: 0.8, life: 1.6 + r(), seq: 'leaf', fps: 8, color: r() < 0.5 ? '#9ee070' : '#d8f0a0', k: 1, fadeIn: 0.02 }); }
  }
  update(dt, t) {
    const el = (performance.now() - this.t0) / 1000; const prog = this.pre ? Math.min(1, this.pre.progress()) : 1; const target = Math.min(prog, el / 9.5); const A = this.A; const r = this.rnd; const ac = this.acc;
    const prev = this.age; this.age += Math.max(0, target - this.age) * Math.min(1, dt * 3) + (target - this.age > 0 ? 0.0008 : 0); this.age = Math.min(1, this.age); A.set(this.age); const age = this.age;
    // particles: stardust always; twinkles while the apple is fresh; spores once the rot sets in; bursts at the seed and the sprout
    ac.dust += dt * 26; while (ac.dust > 1) { ac.dust--; this.dust(); }
    if (age < 0.32) { ac.spark += dt * (7 - age * 16); while (ac.spark > 1) { ac.spark--; const p = A.skinPoint(new THREE.Vector3(), r); const o = p.clone().sub(A.group.position).multiplyScalar(0.18); p.add(o); this.motes.spawn({ pos: p, vel: o.multiplyScalar(0.3), life: 0.55 + r() * 0.5, seq: r() < 0.7 ? 'twinkle' : 'glint', color: r() < 0.6 ? '#fff0c8' : '#ffd890', bright: 1.6, fadeIn: 0.02 }); } }
    const rot = Math.max(0, Math.min(1, (age - 0.34) / 0.3)) * (age < 0.88 ? 1 : 0);
    if (rot > 0) { ac.spore += dt * rot * 16; while (ac.spore > 1) { ac.spore--; const p = A.skinPoint(new THREE.Vector3(), r); this.motes.spawn({ pos: p, vel: [(r() - 0.5) * 0.1, 0.06 + r() * 0.1, (r() - 0.5) * 0.1], drag: 0.6, grav: -0.03, wobble: 0.25, life: 2 + r() * 2, sprite: r() < 0.5 ? 'spore1' : r() < 0.7 ? 'spore2' : 'spore3', color: ['#b4bc8a', '#9aa874', '#c8c4a0', '#86906a'][Math.floor(r() * 4)], bright: 0.9, fadeIn: 0.2 }); }
      ac.glow += dt; if (ac.glow > 1.6) { ac.glow = 0; const p = A.skinPoint(new THREE.Vector3(), r); for (let i = 0; i < 9; i++) this.motes.spawn({ pos: p, vel: [(r() - 0.5) * 0.3, 0.1 + r() * 0.25, (r() - 0.5) * 0.3], drag: 1.6, grav: -0.02, wobble: 0.3, life: 1.6 + r() * 1.4, sprite: r() < 0.6 ? 'spore2' : 'spore3', color: '#aab486', fadeIn: 0.05 }); } }
    if (prev < 0.9 && age >= 0.9) { this.burst(A.seedWorld(), 70, { speed: 1.2 }); this.bg.U.uFlare.value = 0.6; audio.play('magic_shimmer', { vol: 0.35 }); }
    this.bg.U.uFlare.value = Math.max(0, this.bg.U.uFlare.value - dt * 0.8);
    if (age >= 0.999 && prog >= 1) {
      const st0 = this.sproutT || 0; this.sproutT = st0 + dt; A.sprout(this.sproutT / 1.6);
      if (st0 === 0) { this.burst(A.seedWorld(), 46, { colors: ['#e8ffb0', '#b8f080', '#fff4c0', '#ffffff'], speed: 0.9, leaves: 10 }); audio.play('chime_soft', { vol: 0.5 }); }
      ac.glow2 = (ac.glow2 || 0) + dt * 9; while (ac.glow2 > 1) { ac.glow2--; const p = A.sproutTip(); this.motes.spawn({ pos: [p.x + (r() - 0.5) * 0.08, p.y, p.z + (r() - 0.5) * 0.08], vel: [(r() - 0.5) * 0.08, 0.12 + r() * 0.12, 0], drag: 0.8, life: 0.9 + r() * 0.8, seq: 'glint', color: r() < 0.5 ? '#d8ff9a' : '#fff0b8', bright: 1.5, fadeIn: 0.05 }); }
      if (this.sproutT > 2.3 && !this.leaving) this.leave();
    }
    // camera: a slow orbit-drift; dive at the seedling when leaving
    A.group.rotation.y = t * 0.25; const zin = ease(this.age > 0.86 ? (this.age - 0.86) / 0.14 : 0); const lv = this.leaving ? ease5((performance.now() - this.leaving) / 1500) : 0;
    const tip = A.sproutTip(); const cp = V(Math.sin(t * 0.2) * 0.12, 1.05 - zin * 0.18, 2.75 - zin * 1.1); const look = V(0, 0.86 - zin * 0.12, 0);
    if (lv > 0) { cp.lerp(tip.clone().add(V(0.02, 0.05, 0.42)), lv * 0.85); look.lerp(tip, lv); this.bg.U.uFlare.value = Math.max(this.bg.U.uFlare.value, lv * 0.8); }
    this.camera.position.copy(cp); this.camera.lookAt(look);
    this.bg.update(dt, t, this.engine.renderer, { x: cp.x * 60 + lv * 40, y: (cp.y - 1) * 60 }); this.motes.px = this.bg.px; this.motes.update(dt, t, this.engine.renderer); this.updateUI(dt);
  }
  leave() { // auto-enter: dive at the seedling, then an iris wipe from it into the garden
    this.leaving = performance.now(); audio.play('magic_shimmer', { vol: 0.55 }); this.burst(this.A.sproutTip(), 40, { colors: ['#fff6d0', '#ffe08a', '#d8ffb0'], speed: 0.7 });
    setTimeout(() => { if (this.left) return; this.left = true; const p = this.A.sproutTip().project(this.camera); this.game.toMenu({ from: 'loading', wipe: { color: 0x0b0716, center: [p.x * 0.5 + 0.5, 0.5 - p.y * 0.5], dur: 0.7 } }); }, 1050);
  }
  dispose() { this.motes?.dispose(); super.dispose(); }
}

// ================================================================ GARDEN MENU
const QUIPS = ['An apple a day keeps the gods away.', 'Every action has an equal and opposite god.', 'Gravity: still undefeated.', 'Halley! Leave the bees alone.'];
const SHOT = { pos: V(0.75, 1.3, 12.2), look: V(0.95, 2.05, 0.6), fov: 31 }; // a low, long-lens hero shot through foreground leaves and grass
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
    // Halley carries the credits in his mouth: a rolled scroll from the low-poly prop kit (click him and he drops it)
    if (O.objs.credits) O.objs.credits.visible = false; dog.home = V(1.7, 0, 3.0); dog.area = { x: [-2.6, 4.2], z: [1.4, 5.2] };
    this.scroll = prop('scroll', { L: 0.36, r: 0.034 }); this.scroll.traverse((m) => { if (m.isMesh) m.castShadow = true; }); this.holdScroll();
    this.apples = []; this.focusK = 0; this.focusP = V(); this.cinematic(sc);
    this.buildPath(); this.buildLabels(sc); this.fg = new Motes(420, { px: 2 }); sc.add(this.fg.points); this.skyStars(sc); this.fgAcc = 0; this.rnd = mulberry32(99); this.lastCam = SHOT.pos.clone();
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.85, 0.6, 0.66], tilt: false, ao: 0.9, exposure: 1.3, grade: { sat: 1.2, vib: 0.3, contrast: 1.07, vignette: 0.42, warmth: 0.06, lift: [0.026, 0.03, 0.066], gain: [1.05, 1.02, 0.98] }, ink: { fade: [40, 120] } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['night', 'stream']); audio.playMusic('menu');
    const j = this.game.journal; this.stats = new Strip([`Loops remembered: ${j.loops} · Star shards: ${save.meta.shards} · Best hit: ${j.bestHit || 0}`], { maxW: 24, font: 'handS', tone: 3 }); uiPos(this.stats.group, 0, -this.H + 0.85, 3); this.root.add(this.stats.group);
    this.note = new Note({ w: 8, h: 1.3, size: 44, tail: true }); this.root.add(this.note.group);
    if (from === 'loading') setTimeout(() => this.dropOnHead(), 1600); // the garden's welcome: an apple falls on his head
    if (from === 'sky') { this.camera.position.copy(SHOT.pos).add(V(0, -1.2, 3)); }
    if (from === 'gallery') { this.path.set(2.55); this.path.target = 0; this.pathT = 0; this.tower.setOpen(1); } // back out through the tower door and glide home
  }
  // ---------------------------------------------------------------- the scroll path: garden -> tower reveal -> the door -> inside -> the library
  buildPath() {
    const T2 = (this.tower = this.O.objs.tower); this.scene.updateMatrixWorld(true); const tw = (v) => T2.group.localToWorld(v.clone());
    const door = tw(T2.doorAt), front = tw(T2.doorFront), inside = tw(T2.doorIn); const fwd = inside.clone().sub(front).setY(0).normalize();
    const mid = TOWER.reveal.clone().lerp(front, 0.5).add(V(0, 2.2, 0)); // over the orchard rows
    this.pathPos = new THREE.CatmullRomCurve3([SHOT.pos.clone(), TOWER.reveal.clone(), mid, front, inside.clone().addScaledVector(fwd, 0.4)], false, 'centripetal');
    this.pathLook = new THREE.CatmullRomCurve3([SHOT.look.clone(), tw(V(0, 9.5, 0)), tw(V(0, 6, 0)), door.clone().add(V(0, 1.4, 0)), inside.clone().addScaledVector(fwd, 4).add(V(0, 0.3, 0))], false, 'centripetal');
    this.pathFov = [SHOT.fov, 38, 40, 44, 58]; this.path = new Spring(0, 2.1, 1); this.pathT = 0; this.doorP = door;
  }
  pathU(s) { return s <= 1 ? s * 0.25 : s <= 2 ? 0.25 + (s - 1) * 0.5 : 0.75 + (s - 2) * 0.25; } // snap points sit on the curve's knots
  step(d) {
    if (this.leaving || this.journal?.isOpen) return; const n = Math.max(0, Math.min(3, this.pathT + d)); if (n === this.pathT) return; this.pathT = n; this.path.target = n;
    audio.play(n === 3 ? 'wood_creak' : 'whoosh_soft', { vol: n === 3 ? 0.6 : 0.35 }); if (n > 0) { this.hover && (this.hover.hover = false); this.hover = null; this.engine.renderer.domElement.style.cursor = ''; this.critters.scare(this.camera.position, 6); }
  }
  onWheel(e) { const now = performance.now(); this.wAcc = (now - (this.wLast || 0) > 400 ? 0 : this.wAcc || 0) + (e?.dy || 0); this.wLast = now; if (now < (this.wLock || 0)) return; if (Math.abs(this.wAcc) > 40) { this.step(Math.sign(this.wAcc)); this.wAcc = 0; this.wLock = now + 850; } }
  onDragStart(e) { this.dragY = e.y; }
  onDrag(e) { if (this.dragY == null) return; const d = this.dragY - e.y; if (Math.abs(d) > 90) { this.step(Math.sign(d)); this.dragY = e.y; } }
  onDragEnd() { this.dragY = null; }
  buildLabels(sc) {
    const O = this.O; this.labels = []; const lab = (content, at, o = {}) => { const L = new FloatLabel(content, { at, dist: at.distanceTo(SHOT.pos), ...o }); sc.add(L.mesh); this.labels.push(L); return L; };
    const top = (obj, dy) => obj.getWorldPosition(V()).add(V(0, dy, 0));
    const T = { new: [null, 'begin a new loop', 2.25], resume: [null, 'continue your run', 2.25], gallery: ['Star Gallery', 'museum & the wizard frog', 1.6, 1.7], journal: ['Journal', 'discoveries & best combos', 1.45], settings: ['Settings', 'click to cycle the music', 2.75] };
    for (const it of this.items) { const d = T[it.key]; if (!d) continue; it.label = lab({ title: d[0], hint: d[1] }, top(it.obj, d[2]).add(V(d[3] || 0, 0, 0)), { phase: it.key.length * 1.3 }); it.label.hidden = it.hidden; }
    this.dogLabel = lab({ title: 'Halley', hint: 'pet him, he has the credits' }, V(), { dist: 7.8 });
    this.lawnLabel = lab({ hint: 'click the grass to throw an apple' }, V(1.75, O.hAt(1.75, 6.6) + 0.42, 6.6), { hintStyle: 'bone' });
    this.scrollLabel = lab({ hint: 'scroll to wander', chevron: true }, V(0.82, 0.86, 9.25), { hintStyle: 'silver' });
    const tw = (v) => this.tower.group.localToWorld(v.clone());
    this.towerLabel = lab({ title: 'The Star-Watcher Tower', hint: 'scroll on to its door' }, tw(V(-6.2, 13.2, 2.5)), { dist: 30, style: 'brass' });
    this.doorLabel = lab({ title: 'Star Gallery', hint: 'scroll to step inside' }, this.doorP.clone().add(V(0, 2.2, 0)).add(tw(V(0, 0, 1)).sub(tw(V())).multiplyScalar(0.9)), { dist: 5.6 });
  }
  updateLabels(dt, t, s) {
    const free = !this.leaving && !this.journal?.isOpen; const g = free && s < 0.25;
    for (const it of this.items) if (it.label) { it.label.show = g && !it.hidden; it.label.hot = it.hover; }
    this.dogLabel.at.copy(this.dog.root.position).add(V(0, 1.12, 0)); this.dogLabel.show = g && this.dogHover && !this.fetching; this.dogLabel.hot = this.dogHover;
    this.lawnLabel.show = g && !this.apples.length && !this.hover; this.scrollLabel.show = g && !this.hover && !this.dogHover;
    this.towerLabel.show = free && Math.abs(s - 1) < 0.35; this.doorLabel.show = free && Math.abs(s - 2) < 0.3;
    for (const L of this.labels) L.update(dt, t, this.camera);
  }
  skyStars(sc) { // pixel stars over the orchard and the tower (they twinkle; a few bright ones get cross glints)
    const m = (this.stars = new Motes(300, { px: 2 })); m.points.renderOrder = -5; sc.add(m.points); const r = mulberry32(5);
    for (let i = 0; i < 260; i++) { const az = r() * Math.PI * 2, el = 0.12 + Math.pow(r(), 0.7) * 1.3; const d = 170; const p = [Math.cos(el) * Math.sin(az) * d, Math.sin(el) * d, Math.cos(el) * Math.cos(az) * d]; const b = r();
      m.spawn({ pos: p, life: 1e9, sprite: b > 0.93 ? 't5' : b > 0.8 ? 't3' : b > 0.55 ? 'm2' : 'm1', color: ['#e8ecff', '#c8d4ff', '#ffe8c0', '#ffd0e0'][Math.floor(r() * 4)], bright: 0.7 + b * 0.9, twinkle: 0.6 + r() * 2.2, fadeIn: 0 }); }
  }
  foreground(dt, t) { // parallax: pixel leaves and fireflies drifting just in front of the lens, thicker while the camera travels
    const cam = this.camera, r = this.rnd; const v = cam.position.distanceTo(this.lastCam) / Math.max(dt, 1e-3); const mv = cam.position.clone().sub(this.lastCam); this.lastCam.copy(cam.position);
    this.fgAcc += dt * (1.6 + Math.min(30, v * 3)); const th = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    while (this.fgAcc > 1) { this.fgAcc--; const z = -(0.9 + Math.pow(r(), 1.4) * 6); const leaf = r() < 0.62; if (!leaf && z > -2.2) continue;
      const p = cam.localToWorld(V((r() - 0.5) * 2.3 * -z * th * cam.aspect, (r() - 0.5) * 2.2 * -z * th, z)); if (v > 0.5) p.addScaledVector(mv.normalize(), 2.5 + r() * 2);
      if (leaf) { const pink = r() < 0.35; this.fg.spawn({ pos: p, vel: [T.WIND.dir.value.x * 0.4 + (r() - 0.5) * 0.3, -0.12 - r() * 0.15, T.WIND.dir.value.y * 0.4], wobble: 0.9, drag: 0.4, life: 3.5 + r() * 2.5, seq: 'leaf', fps: 4 + r() * 4, color: pink ? '#d8b8c8' : ['#7a9a5e', '#9ab468', '#6a8a52'][Math.floor(r() * 3)], bright: 0.75, k: z > -2.4 ? 2 : 1, fadeIn: 0.15 }); }
      else this.fg.spawn({ pos: p, vel: [(r() - 0.5) * 0.2, (r() - 0.5) * 0.1, (r() - 0.5) * 0.2], wobble: 0.5, drag: 0.8, life: 3 + r() * 3, seq: 'pulse', fps: 2 + r() * 2, color: '#e2ff8a', bright: 1.9, k: 1, twinkle: 2.5, fadeIn: 0.25 }); }
    this.fg.px = Math.max(2, Math.round(this.engine.renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())).y / 300)); this.fg.update(dt, t, this.engine.renderer); this.stars.px = this.fg.px; this.stars.update(dt, t, this.engine.renderer);
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
  holdScroll() { const s = this.scroll; s.removeFromParent(); s.userData.open?.removeFromParent(); s.userData.open = null; s.position.set(0, -0.04, 0.01); s.rotation.set(0, 0, 0); s.visible = true; s.userData.carried = false; s.userData.dropped = false; this.dog.mouth.add(s); }
  dropScroll() { // he drops it at your feet, it unrolls, and the credits are read off it
    const s = this.scroll; const p = s.getWorldPosition(V()); this.scene.attach(s); this.dog.pet(); audio.play('paper_rustle', { vol: 0.8 }); this.say('Halley brings the credits. Of course he does.');
    this.scrollFall = { t: 0, y0: p.y, y1: this.O.hAt(p.x, p.z) }; this.credits(); clearTimeout(this._sct);
    this._sct = setTimeout(() => { if (this.leaving) return; this.scroll.userData.open?.removeFromParent(); this.scroll.userData.open = null; this.dog.fetch(this.scroll, () => { this.holdScroll(); }); }, 9500);
  }
  cinematic(sc) { // foreground framing (apple boughs overhead, grass and flowers at the lens), moon rim light, warm practicals, light shafts
    const O = this.O; const r = mulberry32(77);
    for (const [x, z, s, v] of [[-2.7, 8.3, 1.2, 2], [3.9, 7.9, 1.1, 3]]) { const tr = F.tree('apple', { v, s }); tr.position.set(x, O.hAt(x, z), z); tr.rotation.y = x * 1.3; sc.add(tr); }
    const gs = []; for (let i = 0; i < 1100; i++) { const x = -3.2 + r() * 7.6, z = 6.8 + r() * 3.6; gs.push([x, O.hAt(x, z), z, 0.28 + r() * 0.16]); } const gr = F.celGrass(gs, { seed: 9, lodAt: null }); if (gr) sc.add(gr);
    for (const k of ['poppy', 'daisy', 'cornflower']) { const fs = []; for (let i = 0; i < 14; i++) { const x = -3 + r() * 7, z = 7.2 + r() * 2.8; fs.push([x, O.hAt(x, z), z, 0.13 + r() * 0.07]); } try { const f = F.celFlowers(k, fs); if (f) sc.add(f); } catch (e) { /* kind missing */ } }
    const rim = new THREE.DirectionalLight(0xb4c8ff, 1.8); rim.position.set(-4, 7, -12); sc.add(rim); // a cool moon rim from behind: Newton, Halley and the tree catch silver edges
    const lp = SPOTS.settings.clone().setY(O.hAt(SPOTS.settings.x, SPOTS.settings.z) + 1.7); const lan = new THREE.PointLight(0xffa048, 5, 6, 1.7); lan.position.copy(lp); sc.add(lan);
    for (const [x, z] of [[-1.3, 5.2], [2.4, 4.8], [0.4, 7.2]]) { const l = new THREE.PointLight(0xffd068, 1.1, 2.6, 1.8); l.position.set(x, O.hAt(x, z) + 0.45, z); sc.add(l); this.flyLights = (this.flyLights || []).concat(l); }
    const shaftM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uTime: T.WIND.time }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float x = abs(vUv.x * 2.0 - 1.0); float e = pow(1.0 - x, 2.0); float l = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.75, vUv.y); float f = 0.8 + 0.2 * sin(uTime * 0.5 + vUv.y * 5.0); gl_FragColor = vec4(vec3(0.55, 0.66, 1.0) * e * l * f * 0.06, 1.0); }' });
    for (const [x, z, w] of [[-1.6, -0.4, 0.8], [0.1, -0.8, 1.1], [1.7, -0.2, 0.7]]) { const from = V(x - 1.6, 8.5, z - 3.2), to = V(x + 0.6, O.hAt(x, z + 2), z + 2); const L = from.distanceTo(to); for (const rot of [0, Math.PI / 2]) { const g = new THREE.PlaneGeometry(w, L, 1, 4); const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const k = 0.5 - pp.getY(i) / L; pp.setX(i, pp.getX(i) * (1 + k * 1.2)); } g.translate(0, -L / 2, 0); const m = new THREE.Mesh(g, shaftM); m.position.copy(from); m.lookAt(to); m.rotateX(-Math.PI / 2); m.rotateY(rot); m.userData.noInk = true; m.userData.noAO = true; m.onBeforeRender = T.tickWind; sc.add(m); (this.shafts ||= []).push(m); } }
  }
  say(t) { const p = this.engine.worldToUI(this.prof.headWorld(V())); this.note.show([[[t, '#2a160c']]], p.x + 3, p.y + 1.6, 9); this.prof.talk(1.5); clearTimeout(this._nt); this._nt = setTimeout(() => this.note.hide(), 2600); }
  // ---------------------------------------------------------------- input
  ray() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  pickItem() { if (this.leaving || this.journal?.isOpen || this.pathT > 0 || this.path.value > 0.2) return null; const hits = this.ray().intersectObjects(this.items.filter((it) => !it.hidden).map((it) => it.obj), true); if (!hits.length) return null; let o = hits[0].object; while (o) { const it = this.items.find((x) => x.obj === o); if (it) return it; o = o.parent; } return null; }
  onMove() { const dh = !this.leaving && !this.journal?.isOpen && this.pathT === 0 && this.path.value < 0.2 && this.ray().intersectObject(this.dog.root, true).length > 0; if (dh !== this.dogHover) { this.dogHover = dh; this.dog.st.perk = dh ? 1 : 0; if (dh) audio.play('ui_hover', { vol: 0.35 }); this.engine.renderer.domElement.style.cursor = dh ? 'pointer' : ''; } const h = this.pickItem(); if (h !== this.hover) { if (this.hover) this.hover.hover = false; this.hover = h; if (h) { h.hover = true; h.wob.kick?.(6); audio.play('ui_hover', { vol: 0.45 }); if (h.perches) this.critters.scare(h.obj.getWorldPosition(V()).add(V(0, 1.7, 0)), 1.6); } this.engine.renderer.domElement.style.cursor = h ? 'pointer' : ''; } }
  onKey(e) { const k = e?.key || e?.code || e; if (k === 'ArrowDown' || k === 'PageDown' || k === 's' || k === 'KeyS') { this.step(1); return true; } if (k === 'ArrowUp' || k === 'PageUp' || k === 'w' || k === 'KeyW') { this.step(-1); return true; } if (this.pathT > 0) return true; if (k === ' ' || k === 'Space' || k === 'a' || k === 'KeyA') { const A = this.dog.area; this.throwApple(V(A.x[0] + Math.random() * (A.x[1] - A.x[0]), 0, A.z[0] + Math.random() * (A.z[1] - A.z[0])).setY(0)); return true; } }
  onClick() {
    if (this.journal?.isOpen || this.leaving) return;
    if (this.pathT > 0 || this.path.value > 0.2) { if (this.ray().intersectObject(this.tower.group, true).length) this.step(1); return true; }
    const it = this.pickItem(); if (it) { it.pop.kick?.(-3); it.wob.kick?.(-8); audio.play('card_place', { vol: 0.6 }); it.act(); return true; }
    const r = this.ray();
    if (r.intersectObject(this.dog.root, true).length) { if (this.scroll.parent === this.dog.mouth && !this.fetching) { this.dropScroll(); return true; } this.dog.pet(); audio.play('pop', { vol: 0.4 }); this.say(vpick(['Who is a good old mop? You are.', 'Halley. My only peer reviewer.', 'Good boy.'])); return true; }
    if (r.intersectObject(this.prof.root, true).length) { this.say(vpick(QUIPS)); this.prof.act('cheer'); return true; }
    const g = r.intersectObject(this.O.ground, false)[0]; if (g) { const A = this.dog.area; const p = g.point; p.x = Math.max(A.x[0], Math.min(A.x[1], p.x)); p.z = Math.max(A.z[0], Math.min(A.z[1], p.z)); this.throwApple(p.setY(this.O.hAt(p.x, p.z))); return true; }
  }
  update(dt, t) {
    const { O, prof } = this; O.update(dt, t); prof.update(dt); this.dog.update(dt, t);
    if (this.scroll.parent === this.dog.mouth) this.scroll.visible = !this.fetching;
    const sf = this.scrollFall; if (sf) { sf.t += dt; const u = Math.min(1, sf.t / 0.45); this.scroll.position.y = sf.y0 + (sf.y1 - sf.y0) * u * u; this.scroll.rotation.x *= 0.9; this.scroll.rotation.z *= 0.9; if (u >= 1) { this.scrollFall = null; audio.play('wood_knock', { vol: 0.25 }); const op = prop('scroll', { L: 0.36, r: 0.034, open: 0.42 }); op.position.copy(this.scroll.position); op.rotation.y = this.scroll.rotation.y; op.scale.z = 0.05; this.scene.add(op); this.scroll.userData.open = op; this.scroll.visible = false; this.unroll = 0; } }
    if (this.scroll.userData.open && this.unroll < 1) { this.unroll = Math.min(1, this.unroll + dt * 1.6); this.scroll.userData.open.scale.z = 0.05 + 0.95 * (1 - (1 - this.unroll) ** 3); }
    if (this.scroll.userData.open == null && !this.scrollFall && this.scroll.parent !== this.dog.mouth) this.scroll.visible = true;
    for (const [i, l] of (this.flyLights || []).entries()) l.intensity = 0.7 + 0.5 * Math.max(0, Math.sin(t * (1.3 + i * 0.4) + i * 2)); this.critters.update(dt, t); this.stepApples(Math.min(dt, 0.05));
    // camera: gentle parallax; or the exits (tilt up into the night sky, or walk to the telescope / observatory)
    const nd = this.input.ndc; this.path.update(dt); const s = Math.max(0, Math.min(3, this.path.value)); this.tower.setOpen((s - 2.05) / 0.6); this.tower.update(dt, t);
    if (this.leaving === 'sky' || this.leaving === 'gallery') {
      const u = ease5((performance.now() - this.leaveT) / 1700); const f = this.leaveFrom;
      if (this.leaving === 'sky') { this.camera.position.copy(f.pos).lerp(V(0.4, 1.4, 8.6), u); this.look.copy(f.look).lerp(V(0.2, 40, -6), u); O.setNight(0.85 + 0.15 * u); this.camera.fov = SHOT.fov + 20 * u; }
      else { const tp = SPOTS.telescope; this.camera.position.copy(f.pos).lerp(V(tp.x + 0.9, 1.9, tp.z + 1.6), u); this.look.copy(f.look).lerp(V(tp.x, 1.7, tp.z), u); this.camera.fov = SHOT.fov - 5 * u; }
      this.camera.updateProjectionMatrix();
      if (u >= 1 && !this.left) { this.left = true; if (this.leaving === 'sky') this.game.toSky(); else this.game.toGallery(); }
    } else if (!this.leaving || this.leaving === 'tower') {
      const hv = this.hover ? this.hover.obj.getWorldPosition(V()) : this.dogHover ? this.dog.root.position : null; this.focusK += ((hv ? 1 : 0) - this.focusK) * Math.min(1, dt * 1.8); if (hv) this.focusP.lerp(hv, Math.min(1, dt * 3));
      const ease2 = this.focusK * this.focusK * (3 - 2 * this.focusK); const drift = V(Math.sin(t * 0.11) * 0.32 + nd.x * 0.3, Math.sin(t * 0.083) * 0.07 + nd.y * 0.14, Math.sin(t * 0.06) * 0.4);
      if (s < 0.002 && this.pathT === 0) { // the garden hero shot: gentle drift and parallax, a lean toward what you point at
        this.camera.position.lerp(SHOT.pos.clone().add(drift).add(this.focusP.clone().sub(SHOT.pos).multiplyScalar(0.14 * ease2)), Math.min(1, dt * 2.2)); this.look.copy(SHOT.look).lerp(this.focusP.clone().add(V(0, 0.9, 0)), 0.24 * ease2);
        if (Math.abs(this.camera.fov - SHOT.fov) > 0.01) { this.camera.fov += (SHOT.fov - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }
      } else { // gliding along the scroll path (eased by the critically damped path spring), still breathing a little
        const u = this.pathU(s); this.camera.position.copy(this.pathPos.getPoint(u)).addScaledVector(drift, 0.3 * (1 - Math.min(1, s / 2.6))); this.look.copy(this.pathLook.getPoint(u));
        const sg = Math.min(3, Math.floor(u * 4)), f = u * 4 - sg; this.camera.fov = this.pathFov[sg] + (this.pathFov[sg + 1] - this.pathFov[sg]) * f; this.camera.updateProjectionMatrix();
        if (s > 2.8 && this.pathT === 3 && !this.leaving) { this.leaving = 'tower'; audio.play('transition_whoosh', { vol: 0.5 }); this.game.toGallery({ from: 'tower', wipe: { color: 0x1a0f08, dur: 0.42 } }); }
      }
    }
    if (this.camOverride) { this.camera.position.copy(this.camOverride.pos); this.look.copy(this.camOverride.look); }
    this.camera.lookAt(this.look);
    for (const it of this.items) { it.pop.update(dt); it.lift.target = it.hover ? 0.12 : 0; it.lift.update(dt); it.wob.update(dt); it.obj.scale.setScalar(Math.max(0.001, it.pop.value)); it.obj.position.set(it.base.x, it.base.y + it.lift.value, it.base.z); it.obj.rotation.set(0, it.rotY + it.wob.value * 0.02, it.wob.value * 0.012); }
    // Newton glances at what you point at, or watches Halley and the apple
    const tgt = this.hover ? this.hover.obj.getWorldPosition(V()).add(V(0, 1.0, 0)) : this.fetching ? this.dog.root.position.clone().add(V(0, 0.5, 0)) : null;
    if (tgt) { const p = tgt.project(this.camera); prof.lookAt(p.x, p.y); } else prof.lookAt(nd.x * 0.6, nd.y * 0.4);
    this.titleDrop.update(dt); O.title.group.position.set(SPOTS.title.x, SPOTS.title.y + this.titleDrop.value * 2.4, SPOTS.title.z);
    this.updateLabels(dt, t, s); this.foreground(dt, t); for (const m of this.shafts || []) m.visible = s < 0.04; if (this.stats) this.stats.group.visible = s < 0.3;
    const pp = this.ptr(4); this.stats?.update(dt, pp); this.updateUI(dt); this.note?.update(dt); this.journal?.update(dt, t);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; this.fg?.dispose(); this.stars?.dispose(); for (const L of this.labels || []) L.dispose(); super.dispose(); }
}
