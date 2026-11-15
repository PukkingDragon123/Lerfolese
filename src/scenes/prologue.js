// THE PROLOGUE of LERFOLESE (first New Game; replayable from the gallery: game.playPrologue({ replay: true })).
//  title     black -> a slow establishing crane down over the old apple garden at golden hour, music, two narrated lines
//  garden    KID ISAAC runs in (a real run, tracked low) to his OLD TEACHER under the tree; questions; a choice
//  cards     the teacher deals three big cards (APPLE, FORCE, SPIN): drag to MERGE them; a brass-and-glass construct in
//            the garden takes on each law; multipliers; how to use them
//  throw     Isaac, impatient, grabs a real apple and THROWS it (no magic): it bonks a FAT RACCOON raiding the basket
//  fight     the tutorial battle on the real battle system (src/story/tutorial.js), the teacher teaching between turns
//  snake     later, the teacher reads on his bench; a SNAKE slithers in with a GOLDEN APPLE in its jaws and sets it down
//  grab      the player must pick it up: SLOW MOTION reach, the teacher looks up and SCREAMS
//  shock     a GIANT SHOCKWAVE: time stops, the world drains to black and white behind the wave; a WHITE FLASH
//  painting  a painted fresco cutscene (Creation of Adam): the white god-entity speaks; their fingers touch
//  sky       a sky reveal; then the tower-top menu (game.toMenu({ from: 'prologue' }))
// The narrator and every character are VOICED (Web Speech); only short, essential lines float as crisp 3D text
// (src/story/floattext.js, no paper); the rest is voice and pictures.
// Esc skips; click / Space advance a line. Debug: ?prologue=1&beat=title|garden|cards|throw|fight|snake|grab|painting|sky
// &fastlines=3. window.__prologue: { skip(), pick(i), drop('force'|'rotation'), takeApple(), beat, scene }.
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { Card3D } from '../ui3d/cards3d.js';
import { Letterbox } from './cinematic.js';
import { audio } from '../core/audio.js';
import { fsay, fnarrate, fchoice, fadvance, fstop, fcaption } from '../story/floattext.js';
import { ensureFonts } from '../story/dialogue.js';
import { createKidIsaac, createTeacher, book, THROW_RELEASE } from '../models/npcs/story.js';
import { shockPass, paintPass } from '../story/fx.js';
import * as P3 from '../models/props3d.js';
import { Particles } from '../gfx/particles.js';
import { computeMove, flatten } from '../game/combos.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const SKIP = Symbol('skip');
const BEATS = ['title', 'garden', 'cards', 'throw', 'fight', 'snake', 'grab', 'painting', 'sky'];
const fast = () => (window.__storyFast > 1 ? Math.min(2, window.__storyFast) : 1);
const GOLDEN = { bloom: [0.42, 0.6, 0.84], exposure: 0.95, grade: { warmth: 0.32, vignette: 0.42, sat: 1.12, vib: 0.3, sel: [0.14, 0.14, 0.12], contrast: 1.08, lift: [0.006, 0.01, 0.03], gain: [1.04, 0.99, 0.92] } }; // colourful realistic golden hour: warm key, cool shade
const SPOT = { teacher: V(-1.45, 0, 2.55), kid: V(0.15, 0, 3.95), kidStart: V(-9.5, 0, 8.5), bench: V(-2.35, 0, 1.85), basket: V(1.75, 0, 1.05), con: V(-0.66, 1.12, 3.25), snake: V(4.2, 0, 7.4), drop: V(0.55, 0, 4.55), snakeOut: V(7, 0, 11) };

export class PrologueScene extends UIScreen {
  constructor(game, { replay = false } = {}) {
    super(game); this.replay = replay; this.skipped = false; this.flavour = 'scholar'; this.timeK = 1;
    this.skipP = new Promise((r) => (this._skip = r)); this.cam = new THREE.PerspectiveCamera(34, this.engine.aspect, 0.1, 400);
    this.cs = { p: V(0, 2, 10), l: V(0, 1, 0), fov: 34, mv: null, drift: 1, t: 0, follow: null }; this.actors = []; this.ups = []; this.lesson = [];
    const q = new URLSearchParams(location.search); this.startBeat = Math.max(0, BEATS.indexOf(q.get('beat') || 'title')); if (q.get('fastlines')) window.__storyFast = Number(q.get('fastlines')) || 3;
    this.ready = this.build();
  }
  // ------------------------------------------------------------------ plumbing
  w(p) { return Promise.race([p, this.skipP]).then((r) => { if (this.skipped) throw SKIP; return r; }); }
  wait(s) { return this.w(new Promise((r) => setTimeout(r, (s * 1000) / fast()))); }
  say(who, text, actor, o = {}) { actor?.talk?.(Math.min(4, 0.6 + text.length * 0.05)); const p = fsay(who, text, { anchor: actor || null, ...o }); return o.wait === false ? p : this.w(p); }
  narr(text, o) { return this.w(fnarrate(text, o)); }
  choose(opts, o) { return this.w(fchoice(opts, o)); }
  skip() { if (this.skipped || this.finishing) return; this.skipped = true; fstop(); window.__story?.pick?.(0); audio.play('page_turn', { vol: 0.7 }); this._skip(); }
  /** camera move: to (p, l, fov) over d seconds (0 = cut) */
  shot(p, l, fov = this.cs.fov, d = 0) { const c = this.cs; c.follow = null; if (c.mv) { const r = c.mv.res; c.mv = null; r(); } if (!d) { c.p.copy(p); c.l.copy(l); c.fov = fov; c.mv = null; return Promise.resolve(); } return new Promise((res) => { c.mv = { p0: c.p.clone(), l0: c.l.clone(), f0: c.fov, p, l, fov, d, t: 0, res }; }); } // plain promise: shots are often fire-and-forget
  /** a tracking shot: fn() -> { p, l, fov } every frame (smoothed) */
  track(fn, k = 4) { if (this.cs.mv) { const r = this.cs.mv.res; this.cs.mv = null; r(); } this.cs.follow = { fn, k }; }
  world(sc) { this.sc = sc; this.engine.setWorld(sc, this.cam); }
  face(a, { d = 1.6, side = 0.55, up = 0.02, fov = 28, dy = -0.04, t = 0 } = {}) { a.root.updateMatrixWorld(true); const h = a.headWorld(V()); const f = V(0, 0, 1).applyQuaternion(a.root.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const r = V(f.z, 0, -f.x); return this.shot(h.clone().addScaledVector(f, d).addScaledVector(r, side).add(V(0, up, 0)), h.clone().add(V(0, dy, 0)), fov, t); }
  tween(d, fn, real = true) { return new Promise((res) => { this.ups.push({ t: 0, d: d / fast(), fn, res, real }); }); }
  async build() {
    await ensureFonts();
    this.bars = new Letterbox(this.root); this.bars.show(); window.__storyBand = true;
    this.hint = fcaption('Esc · skip the prologue', { x: this.W - 4.4, y: this.H - 2.6, style: 'pale' }); setTimeout(() => this.hint?.show(false), 9000); // a short hint, then the picture is clean
    this.pushHandler();
    this.engine.add(this); window.__prologue = { skip: () => this.skip(), pick: (i) => window.__story?.pick?.(i), drop: (k) => this.mergeCard(k), takeApple: () => this.takeApple?.(), scene: this, get beat() { return BEATS[this.scene?.beatI ?? 0]; } };
    await this.buildGarden();
  }
  pushHandler() {
    this.handler = this.input.push({ modal: true, key: (e) => { if (e.code === 'Escape') this.skip(); else if (e.code === 'Space' || e.code === 'Enter') fadvance(); return true; },
      dragstart: () => this.onDragStart(), drag: () => this.onDrag(), dragend: () => this.onDragEnd(), move: () => { this.onMove(); return true; }, click: () => { this.onClickUI(); return true; } });
  }
  // ------------------------------------------------------------------ the old garden at golden hour
  async buildGarden() {
    const sc = new THREE.Scene(); let O = null;
    try { const { buildOrchard } = await import('../models/orchard.js'); O = buildOrchard({ renderer: this.engine.renderer, menu: false }); sc.add(O.group); O.title.group.visible = false; O.prompt.group.visible = false; O.setNight(0.12); sc.fog = O.fog; } catch (e) { console.warn('prologue garden fallback', e); }
    this.O = O; this.hAt = O?.hAt || (() => 0); const hAt = this.hAt;
    // moody golden hour: a low warm sun with long real shadows, a dim warm sky fill, a cool shade
    const sun = new THREE.DirectionalLight(0xffb468, 2.7); sun.position.set(-24, 6.5, 11); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -8, near: 1, far: 80 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sc.add(sun); this.sun = sun;
    this.hemi = new THREE.HemisphereLight(0xa6bce0, 0x4a3a20, 0.55); sc.add(this.hemi); // a clear sky over warm earth: shadows read cool blue
    const cool = new THREE.DirectionalLight(0x7e9ce0, 0.36); cool.position.set(10, 8, -6); sc.add(cool);
    if (sc.fog) { sc.fog.color.set(0xb07850); }
    // the orchard is lit for the menu's moonlit dusk: hand the light to the low sun (dim the moon, the dusk fill, the sky dome fill)
    O?.group.traverse((o) => { if (!o.isLight) return; if (o.isAmbientLight) o.intensity = 0.06; else if (o.isHemisphereLight) o.intensity = 0; else if (o.isDirectionalLight) { o.intensity = 0; o.castShadow = false; } else if (o.isPointLight) o.intensity *= 0.45; });
    sc.environment = this.engine.ui.scene.environment || null; sc.environmentIntensity = 0.32;
    // a warm golden-hour sky instead of the menu's violet dusk dome (the sun low in the west, where the key light comes from)
    O?.group.traverse((o) => { if (o.isMesh && o.material?.uniforms?.uNight && o.material.side === THREE.BackSide) o.visible = false; });
    try { const { animeSky } = await import('../models/toon.js'); const sky = animeSky('gully', V(-0.9, 0.12, 0.42)); sc.add(sky); this.skyDome = sky; } catch (e) { sc.background = new THREE.Color(0xe8a060); }
    const put = (a, p, ry) => { a.root.position.set(p.x, hAt(p.x, p.z), p.z); a.root.rotation.y = ry; a.hAt = hAt; sc.add(a.root); this.actors.push(a); return a; };
    this.teacher = put(createTeacher(), SPOT.teacher, 0.95); this.kid = put(createKidIsaac(), SPOT.kidStart, 0.9);
    // the bench with his books, the picnic basket, windfall apples in the grass
    const bench = this.bench(); bench.position.set(SPOT.bench.x, hAt(SPOT.bench.x, SPOT.bench.z), SPOT.bench.z); bench.rotation.y = 0.55; sc.add(bench);
    for (const [i, o] of [[0, [0.25, 0.47, 0.02]], [1, [0.27, 0.51, 0.0]], [2, [0.24, 0.55, 0.03]]]) { const b = book({ seed: i + 2, color: [[92, 40, 30], [40, 62, 44], [56, 46, 80]][i] }); b.position.set(...o); b.rotation.y = 0.2 * i - 0.1; bench.add(b); }
    const basket = this.basket(); basket.position.set(SPOT.basket.x, hAt(SPOT.basket.x, SPOT.basket.z), SPOT.basket.z); basket.rotation.y = -0.4; sc.add(basket); this.basketObj = basket;
    this.windfall = []; for (const [x, z] of [[0.75, 4.35], [1.2, 3.6], [-0.4, 4.6], [2.3, 2.6]]) { const a = P3.apple({ kind: 'red' }); a.scale.setScalar(0.085); a.position.set(x, hAt(x, z) + 0.04, z); a.rotation.set(0.4, x * 3, 0.3); sc.add(a); this.windfall.push(a); }
    this.parts = new Particles(600, { additive: true }); this.parts.points.userData.noInk = true; sc.add(this.parts.points);
    this.dust = new Particles(300); this.dust.points.userData.noInk = true; sc.add(this.dust.points);
    this.gardenScene = sc; this.world(sc); this.gardenFx();
    audio.setAmbSet(['wilderness']);
  }
  gardenFx() { this.engine.setFx({ ...GOLDEN, rays: { pos: V(-60, 16, 28), strength: 0.42, tint: 0xffb060, thresh: 0.8 } }); }
  bench() { // a weathered garden bench: two stone feet, a split-oak seat
    const g = new THREE.Group(); const tx = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { x.fillStyle = fn(i, j); x.fillRect(i, j, 1, 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; return t; };
    const wood = tx(32, 8, (i, j) => (j === 0 || j === 7 ? '#3a2616' : Math.sin(i * 0.7 + j * 2) > 0.7 ? '#5a3e24' : (i * 7 + j * 3) % 11 === 0 ? '#4a301c' : '#6e4e30'));
    const stone = tx(16, 16, (i, j) => { const v = Math.sin(i * 1.7 + j * 0.9) * Math.cos(j * 1.3 - i); return v > 0.6 ? '#9a9488' : v < -0.6 ? '#5e5a52' : '#7c776c'; });
    const M = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.9, flatShading: true });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.36), M(wood)); seat.position.y = 0.44; seat.castShadow = seat.receiveShadow = true; g.add(seat);
    for (const x of [-0.48, 0.48]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 6), M(stone)); f.position.set(x, 0.2, 0); f.castShadow = f.receiveShadow = true; g.add(f); }
    return g;
  }
  basket() { // a wicker picnic basket with a checked cloth and loaves
    const g = new THREE.Group(); const c = document.createElement('canvas'); c.width = 32; c.height = 16; const x = c.getContext('2d'); for (let j = 0; j < 16; j++) for (let i = 0; i < 32; i++) { x.fillStyle = ((i >> 1) + (j >> 1)) % 2 ? '#a07a46' : (i + j) % 3 ? '#c49a5e' : '#7a5a34'; x.fillRect(i, j, 1, 1); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.26, 8, 1, true), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9, flatShading: true })); body.position.y = 0.13; body.castShadow = body.receiveShadow = true; g.add(body);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 4, 10, Math.PI), body.material); handle.position.y = 0.25; g.add(handle);
    const cc = document.createElement('canvas'); cc.width = cc.height = 16; const y = cc.getContext('2d'); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { y.fillStyle = ((i >> 2) + (j >> 2)) % 2 ? '#b8382e' : '#e8dcc4'; y.fillRect(i, j, 1, 1); }
    const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace; ct.magFilter = ct.minFilter = THREE.NearestFilter;
    const cloth = new THREE.Mesh(new THREE.CircleGeometry(0.34, 7), new THREE.MeshStandardMaterial({ map: ct, side: THREE.DoubleSide, roughness: 0.95, flatShading: true })); cloth.rotation.x = -Math.PI / 2 + 0.25; cloth.position.set(0.05, 0.27, 0.02); g.add(cloth);
    for (let i = 0; i < 3; i++) { const a = P3.apple({ kind: 'red', leaf: false }); a.scale.setScalar(0.07); a.position.set(-0.1 + i * 0.09, 0.27, -0.08 + (i % 2) * 0.08); g.add(a); }
    return g;
  }
  // ------------------------------------------------------------------ the film
  async run() {
    await this.ready;
    try {
      const b = this.startBeat; const go = async (i, fn) => { if (b <= i) { this.beatI = i; await fn.call(this); } };
      await go(0, this.b_title); await go(1, this.b_garden); await go(2, this.b_cards); await go(3, this.b_throw); await go(4, this.b_fight);
      await go(5, this.b_snake); await go(6, this.b_grab); await go(7, this.b_painting); this.beatI = 8; await this.b_sky();
    } catch (e) { if (e !== SKIP) console.error('prologue', e); }
    this.finishing = true; fstop(); this.bars.hide(); window.__storyBand = false;
    if (this.bs) { try { this.bs.dispose(); } catch (e) { /* */ } this.bs = null; }
    try { this.game.journal.seenPrologue = true; this.game.saveJournal(); } catch (e) { /* */ }
  }

  // OPENING: black, then a slow establishing crane down over the old apple garden at golden hour (no title card)
  async b_title() {
    audio.playMusic('menu'); this.engine.flash(1, 0x000000, 3.0);
    this.shot(V(-15, 12, 27), V(-0.4, 3.6, 0), 40); const crane = this.shot(V(-5.4, 4.6, 14.5), V(-0.6, 1.8, 1.5), 36, 9);
    await this.wait(2.2); await this.narr('Long ago, there was an old apple garden.');
    await this.narr('And a boy who asked too many questions.'); await crane;
    this.shot(V(-3.2, 2.2, 10.8), V(-0.4, 1.2, 2.6), 34, 4);
  }

  // GARDEN: Isaac runs in to his old teacher
  async b_garden() {
    const k = this.kid, m = this.teacher; 
    this.placeAt(k, SPOT.kidStart, 2.0); m.lookAtWorld(null); m.root.rotation.y = 0.2;
    // a low tracking shot beside the running boy, then a low front angle as he runs at the camera past the old man
    const dir = SPOT.kid.clone().sub(SPOT.kidStart).setY(0).normalize(), side = V(-dir.z, 0, dir.x); if (side.z < 0) side.negate();
    const run = k.walkTo(SPOT.kid, 3.3); audio.play('tiny_footsteps', { vol: 0.5 });
    this.track(() => { const p = k.root.position; return { p: p.clone().addScaledVector(side, 2.6).addScaledVector(dir, 0.4).add(V(0, 0.85, 0)), l: p.clone().addScaledVector(dir, 0.9).add(V(0, 0.95, 0)), fov: 36 }; }, 6);
    await this.wait(1.4); this.say('isaac_kid', 'Teacher! Teacher!', k, { wait: false }); m.lookAtWorld(() => k.headWorld(V()));
    const front = SPOT.kid.clone().addScaledVector(dir, 2.2).addScaledVector(side, 1.1).add(V(0, 0.72, 0)); front.y += this.hAt(front.x, front.z);
    this.track(() => ({ p: front, l: k.root.position.clone().add(V(0, 1.0, 0)), fov: 34 }), 8); this.cs.p.copy(front);
    m.st.faceYaw = Math.atan2(SPOT.kid.x - SPOT.teacher.x, SPOT.kid.z - SPOT.teacher.z); await this.w(run);
    k.lookAtWorld(() => m.headWorld(V())); k.st.faceYaw = Math.atan2(SPOT.teacher.x - SPOT.kid.x, SPOT.teacher.z - SPOT.kid.z); await this.wait(0.5);
    this.face(m, { d: 1.8, side: 0.7, fov: 30, dy: -0.06 }); this.face(m, { d: 1.4, side: 0.5, fov: 27, dy: -0.06, t: 5 }); // a slow push-in
    m.act('nod'); await this.say('teacher', 'Slowly, child. Slowly.', m);
    this.face(k, { d: 1.5, side: -0.6, up: 0.18, fov: 30 }); k.act('point');
    await this.say('isaac_kid', 'Why do apples fall DOWN? Never up?', k);
    this.shot(V(-3.6, 1.35, 6.6), SPOT.teacher.clone().lerp(SPOT.kid, 0.5).add(V(0, 1.0, 0)), 30, 0); this.shot(V(-3.2, 1.3, 6.0), SPOT.teacher.clone().lerp(SPOT.kid, 0.5).add(V(0, 1.0, 0)), 28, 8); m.act('think');
    await this.say('teacher', 'The oldest question. What do you think?', m);
    const c = await this.choose([{ label: 'The ground wants them.' }, { label: 'They are heavy.' }, { label: 'The tree gets tired of holding them.' }], {});
    this.flavour = ['poet', 'scholar', 'jester'][c];
    await this.say('isaac_kid', ['The ground wants them.', 'They are heavy.', 'The tree gets tired!'][c], k, { show: false });
    this.face(m, { d: 1.6, side: 0.55, fov: 28 }); if (c === 2) m.setExpr('happy', 2);
    await this.say('teacher', ['A poet\'s answer. Keep it.', 'Heavy toward what? Remember that.', 'Heh. You made an old man laugh.'][c], m);
    m.act('present'); await this.say('teacher', 'Come. Let me show you something.', m, { show: false });
  }

  // CARDS: the first three cards, merging, multipliers
  async b_cards() {
    const k = this.kid, m = this.teacher; this.placeAt(k, SPOT.kid, Math.atan2(SPOT.teacher.x - SPOT.kid.x, SPOT.teacher.z - SPOT.kid.z)); k.lookAtWorld(() => m.headWorld(V())); m.lookAtWorld(() => k.headWorld(V()));
    this.shot(V(-3.3, 1.45, 6.3), V(-0.62, 1.0, 3.2), 32, 0); this.shot(V(-3.0, 1.4, 5.9), V(-0.62, 1.0, 3.2), 30, 9); m.act('present'); audio.play('paper_rustle', { vol: 0.5 });
    await this.say('teacher', 'Every law fits on a card. Your first three.', m);
    // the construct: a brass stand in the air between them, holding whatever the cards make
    this.makeConstruct();
    const ids = ['apple', 'force', 'rotation']; const from = this.engine.worldToUI(m.handWorld(0, V()));
    this.lesson = ids.map((id, i) => { const v = new Card3D({ uid: 'pro-' + id, id, type: 'basic', up: 0 }); this.root.add(v.group); v.pos.snap(from.x, from.y, 3); v.sc.value = 0.15; v.flip.value = 1; v.id = id; v.home = { x: (i - 1) * 5.9, y: -this.H + 6.1, s: 1.62 }; v.target = { x: from.x, y: from.y, z: 3, rz: 0, s: 0.2 }; return v; });
    for (const [i, v] of this.lesson.entries()) { await this.wait(0.28); v.target = { x: v.home.x, y: v.home.y, z: 3, rz: (i - 1) * -0.06, s: v.home.s }; v.flip.target = 0; audio.play('card_flip', { vol: 0.8 }); audio.play('card_slide', { delay: 0.05 }); }
    this.cardsLive = true; k.setExpr('happy', 2); this.say('isaac_kid', 'Cards!', k, { wait: false, show: false });
    const lift = (id) => { for (const v of this.lesson) v.focus = v.id === id; };
    this.shot(V(-2.6, 1.35, 5.4), SPOT.con.clone().add(V(0, -0.1, 0)), 30, 1.2);
    lift('apple'); this.conSet('apple'); await this.say('teacher', 'Apple. Eat it, or throw it.', m);
    lift('force'); await this.say('teacher', 'Force. With matter, a blow.', m);
    lift('rotation'); await this.say('teacher', 'Spin. Strike, and strike again.', m); lift(null);
    // MERGE: drag Force onto the Apple
    this.mergeStep = 'force'; this.cap = fcaption('Drag FORCE onto the APPLE', { x: 0, y: -this.H + 10.7, style: 'gold' });
    this.say('teacher', 'Lay Force on the Apple. That is a merge.', m, { wait: false, show: false });
    await this.w(new Promise((r) => (this.onMerged = r))); this.cap?.remove();
    const a1 = computeMove(flatten(['apple', 'force'].map((id) => ({ id, type: 'basic', up: 0 })))).attack;
    this.conSet('force'); k.setExpr('surprised', 1.5);
    await this.say('teacher', `${a1.m} kg × ${a1.v} m/s = ${a1.m * a1.v}. Mass times velocity.`, m);
    this.mergeStep = 'rotation'; this.cap = fcaption('Drag SPIN onto them', { x: 0, y: -this.H + 10.7, style: 'gold' });
    this.say('teacher', 'Now Spin on top. Watch.', m, { wait: false, show: false });
    await this.w(new Promise((r) => (this.onMerged = r))); this.cap?.remove(); this.mergeStep = null;
    const a2 = computeMove(flatten(['apple', 'force', 'rotation'].map((id) => ({ id, type: 'basic', up: 0 })))).attack;
    this.conSet('rotation'); this.shot(V(-2.0, 1.3, 4.8), SPOT.con, 28, 1.6);
    await this.say('teacher', `${a2.hits} strikes of ${a2.perHit}. Laws multiply.`, m);
    this.face(m, { d: 1.6, side: 0.5, fov: 28 });
    await this.say('teacher', 'Think first. Throw last.', m);
  }

  // THROW: no magic: he just grabs an apple and throws it
  async b_throw() {
    const k = this.kid, m = this.teacher; this.placeAt(k, SPOT.kid, 0); for (const v of this.lesson) v.target = { x: v.target.x, y: -this.H - 6, z: 3, rz: 0.5, s: 0.6 }; this.cardsLive = false; this.dropConstruct();
    this.face(k, { d: 1.6, side: -0.5, up: 0.12, fov: 30 }); k.setExpr('angry', 1.4);
    await this.say('isaac_kid', 'An apple is for THROWING!', k);
    const ap = this.windfall[0]; const at = ap.position.clone(); at.y = this.hAt(at.x, at.z);
    this.shot(V(2.2, 0.7, 6.4), at.clone().add(V(-0.2, 0.6, -0.4)), 32, 0); await this.w(k.walkTo(at.clone().add(V(-0.3, 0, -0.25)), 1.6));
    k.act('grab'); this.holdGrab = true; audio.play('wood_creak', { vol: 0.2, rate: 1.6 }); await this.wait(0.42); ap.parent.remove(ap); ap.scale.setScalar(0.085 / k.sc * 0 + 0.085); k.hand(1).add(ap); ap.position.set(0, -0.02, 0.03); await this.wait(0.55);
    k.st.faceYaw = Math.atan2(SPOT.basket.x - k.root.position.x, SPOT.basket.z - k.root.position.z); await this.wait(0.5);
    { const kp = k.root.position.clone(), d = SPOT.basket.clone().sub(kp).setY(0).normalize(); const sd = V(-d.z, 0, d.x); if (sd.z < 0) sd.negate(); this.shot(kp.clone().addScaledVector(d, -2.1).addScaledVector(sd, 1.2).add(V(0, 1.3, 0)), SPOT.basket.clone().add(V(0, 0.35, 0)).lerp(kp.clone().add(V(0, 0.9, 0)), 0.35), 36, 0); }
    k.act('throw'); audio.play('whoosh_soft', { vol: 0.6, delay: THROW_RELEASE * 0.8 }); await this.wait(THROW_RELEASE);
    const p0 = ap.getWorldPosition(V()); ap.parent.remove(ap); this.gardenScene.add(ap); ap.position.copy(p0); const target = SPOT.basket.clone().add(V(0, 0.35, 0)); const T = 0.7; const vel = target.clone().sub(p0).add(V(0, 0.5 * 9.8 * T * T, 0)).divideScalar(T);
    this.track(() => ({ p: V(p0.x - 0.6, p0.y + 0.5, p0.z + 2.4).lerp(target.clone().add(V(-0.8, 0.5, 2.2)), Math.min(1, (this.flight || 0) / T)), l: ap.position, fov: 34 }), 6);
    this.flight = 0; await this.tween(T, (u) => { this.flight = u * T; const t = u * T; ap.position.copy(p0).addScaledVector(vel, t).add(V(0, -0.5 * 9.8 * t * t, 0)); ap.rotation.x += 0.4; }, false);
    // bonk: the basket jumps and the FAT RACCOON tumbles out, furious, cheeks full
    audio.play('apple_squish'); audio.play('hit_light'); this.burst(target, '#ffe0b0', 12); this.gardenScene.remove(ap); this.basketObj.rotation.z = 0.25; setTimeout(() => (this.basketObj.rotation.z = 0), 160);
    const { createBeast } = await import('../models/beasts/index.js'); const rc = createBeast('raccoon', 3); rc.root.scale.setScalar(1.15); rc.root.position.copy(SPOT.basket).add(V(0.2, 0, 0.3)); rc.root.position.y = this.hAt(rc.root.position.x, rc.root.position.z); rc.root.rotation.y = -2.4; this.gardenScene.add(rc.root); this.raccoon = rc;
    rc.act?.('hurt'); audio.play('goblin_squeak', { vol: 0.8, rate: 0.8 }); this.engine.shake(0.15);
    this.shot(SPOT.basket.clone().add(V(-0.9, 0.35, 2.0)), SPOT.basket.clone().add(V(0.1, 0.35, 0.2)), 30, 0); await this.wait(0.9);
    rc.root.rotation.y = Math.atan2(k.root.position.x - rc.root.position.x, k.root.position.z - rc.root.position.z); rc.act?.('cast'); audio.play('monster_growl', { vol: 0.6, rate: 1.9 }); await this.wait(1.1);
    this.face(m, { d: 1.7, side: 0.6, fov: 29 }); m.act('alarm');
    await this.say('teacher', 'Oh dear. A guest.', m);
    this.face(k, { d: 1.4, side: -0.5, up: 0.12, fov: 28 }); k.act('alarm');
    await this.say('isaac_kid', 'Teacher?!', k);
    await this.say('teacher', 'Your cards, Isaac. Quickly.', m);
  }

  // FIGHT: the real battle system, a forced three-card deck, the teacher between turns
  async b_fight() {
    const { tutorialBattle } = await import('../story/tutorial.js'); const { BattleScene } = await import('./battlescene.js');
    const { run, encounter } = tutorialBattle(this.game); this.input.remove(this.handler); this.handler = null; let res = null;
    const esc = this.input.push({ key: (e) => { if (e.code === 'Escape') { this.skip(); return true; } return false; } });
    try {
      await this.w(this.engine.wipe(async () => { this.paused = true; this.root.visible = false; this.hint?.show(false); fstop(); const bs = new BattleScene(this.game); this.bs = bs; res = bs.run(run, encounter); await new Promise((r) => { const w = () => (bs.ready ? bs.ready.then(r) : setTimeout(w, 30)); w(); }); }, { color: 0x0b0806, mode: 1 }));
      const r = await this.w(res); this.fightWon = !!r?.won;
    } finally {
      this.input.remove(esc);
      if (!this.skipped) await this.engine.wipe(async () => { this.endBattle(); }, { color: 0x0b0806 }); else this.endBattle();
    }
  }
  endBattle() { if (this.bs) { if (this.bs.tutUpd) this.engine.remove(this.bs.tutUpd); try { this.bs.dispose(); } catch (e) { console.warn(e); } this.bs = null; } fstop(); this.world(this.gardenScene); this.gardenFx(); this.root.visible = true; this.paused = false; if (!this.handler && !this.skipped) this.pushHandler(); if (this.raccoon) { this.gardenScene.remove(this.raccoon.root); this.raccoon = null; } audio.playMusic('journal'); }

  // SNAKE: later; the teacher reads; a snake brings a golden apple
  async b_snake() {
    const k = this.kid, m = this.teacher; if (this.raccoon) { this.gardenScene.remove(this.raccoon.root); this.raccoon = null; }
    // the light has gone lower and redder; the shadows are long
    this.sun.color.set(0xff8a48); this.sun.intensity = 1.9; this.sun.position.set(-26, 4.2, 9); this.hemi.intensity = 0.34; this.engine.setFx({ ...GOLDEN, exposure: 0.8, grade: { ...GOLDEN.grade, warmth: 0.62, vignette: 0.6 }, rays: { pos: V(-60, 10, 26), strength: 0.5, tint: 0xff9048, thresh: 0.78 } });
    audio.playMusic('journal');
    const bp = this.benchPos(); this.placeAt(m, bp.seat, bp.yaw); m.sit(0.47); m.read(true); m.caneFree = { top: bp.caneTop, tip: bp.caneTip }; if (!this.readBook) { const b = book({ open: true, seed: 5 }); b.rotation.set(-0.9, 0, 0); b.position.set(0.06, 0.02, 0.1); m.hand(1).add(b); this.readBook = b; } m.lookAtWorld(null);
    this.placeAt(k, V(0.35, 0, 3.55), 2.2); k.lookAtWorld(() => V(-6, 4, -8)); k.act('think');
    this.shot(V(-0.4, 1.6, 7.6), V(-1.0, 0.8, 2.5), 32, 0); this.shot(V(-0.9, 1.3, 6.4), V(-1.4, 0.75, 2.3), 30, 6);
    await this.narr('Later. The old man read. The boy grew bored.');
    this.say('teacher', 'and so the third law... every push is pushed back...', m, { wait: false, show: false });
    // a SNAKE, low in the grass, carrying something golden
    const { createSnake } = await import('../models/npcs/snake.js'); const S = createSnake({ hAt: this.hAt }); this.gardenScene.add(S.root); this.snake = S; S.place(SPOT.snake, Math.atan2(SPOT.drop.x - SPOT.snake.x, SPOT.drop.z - SPOT.snake.z));
    const ga = this.goldApple(); S.mouth.add(ga); ga.position.set(0, 0.0, 0.03); S.jawOpen(0.65); this.gold = ga;
    this.track(() => { const h = S.headWorld(V()); return { p: h.clone().add(V(1.1, 0.75, 1.5)), l: h.clone().add(V(-0.2, 0.0, 0)), fov: 32 }; }, 3.5);
    audio.play('snake_hiss', { vol: 0.7 }); const go = S.slitherTo(SPOT.drop.clone().add(V(0.35, 0, 0.18)), 0.85);
    await this.wait(2.2); audio.play('snake_hiss', { vol: 0.5, rate: 0.85 }); await this.w(go);
    S.lift(0.16); await this.wait(0.7); S.jawOpen(0); this.dropGold(); audio.play('apple_squish', { vol: 0.3, rate: 1.5 }); audio.play('chime_soft', { vol: 0.6 }); audio.play('magic_shimmer', { vol: 0.5 });
    this.shot(SPOT.drop.clone().add(V(0.9, 0.85, 1.4)), SPOT.drop.clone().add(V(0, 0.1, 0)), 30, 0); await this.wait(1.1);
    S.lift(0.05); S.slitherTo(SPOT.snakeOut, 0.7); setTimeout(() => { if (this.snake === S) { this.gardenScene.remove(S.root); this.snake = null; } }, 9000);
    k.lookAtWorld(() => this.gold.getWorldPosition(V())); k.setExpr('surprised', 3); this.face(k, { d: 1.4, side: -0.6, up: 0.1, fov: 28 });
    await this.say('isaac_kid', 'Teacher... a GOLD apple.', k);
    this.shot(V(-1.5, 1.0, 4.3), V(-2.0, 1.0, 2.0), 28, 0);
    await this.say('teacher', 'Mm-hm. Very nice, Isaac.', m, { show: false });
  }
  // GRAB: the player must pick it up; slow motion; the teacher screams; the shockwave; white
  async b_grab() {
    const k = this.kid, m = this.teacher;
    if (!this.gold) { const bp = this.benchPos(); this.placeAt(m, bp.seat, bp.yaw); m.sit(0.47); m.read(true); m.caneFree = { top: bp.caneTop, tip: bp.caneTip }; this.placeAt(k, V(0.35, 0, 3.55), 2.2); this.gold = this.goldApple(); this.gardenScene.add(this.gold); this.gold.position.copy(SPOT.drop).setY(this.hAt(SPOT.drop.x, SPOT.drop.z) + 0.06); this.goldGround = true; }
    const gp = this.gold.getWorldPosition(V()); k.lookAtWorld(() => this.gold.getWorldPosition(V()));
    this.shot(gp.clone().add(V(0.6, 0.95, 1.6)), gp.clone().add(V(-0.25, 0.25, -0.2)), 30, 0); this.shot(gp.clone().add(V(0.45, 0.8, 1.3)), gp.clone().add(V(-0.2, 0.2, -0.15)), 28, 8);
    this.cap = fcaption('Pick up the golden apple', { anchor: () => this.gold.getWorldPosition(V()).add(V(0, 0.25, 0)), style: 'gold' }); this.applePick = true;
    await this.w(new Promise((r) => { this.takeApple = () => { if (!this.applePick) return; this.applePick = false; r(); }; }));
    this.cap?.remove(); this.cap = null; audio.play('card_pick'); audio.duckMusic?.(0.05, 6); audio.stopMusic?.(2);
    { const near = gp.clone().add(V(-0.36, 0, -0.24)); k.lookAtWorld(() => this.gold.getWorldPosition(V())); await this.w(k.walkTo(near, 1.3)); k.st.faceYaw = Math.atan2(gp.x - near.x, gp.z - near.z); }
    // SLOW MOTION: he reaches; the world thickens
    this.tween(0.6, (u) => { this.timeK = 1 - u * 0.84; }); audio.play('whoosh_heavy', { rate: 0.45, vol: 0.9 }); audio.play('gravity_hum', { rate: 0.55, vol: 0.8 }); audio.play('magic_shimmer', { rate: 0.5, vol: 0.7 });
    const beat = setInterval(() => { if (this.skipped) return clearInterval(beat); audio.play('hit_heavy', { rate: 0.32, vol: 0.45 }); }, 900); this.heartbeat = beat;
    k.act('grab'); this.shot(gp.clone().add(V(0.55, 0.8, 1.3)), gp.clone().add(V(-0.2, 0.5, -0.15)), 28, 0); this.shot(gp.clone().add(V(0.4, 0.62, 1.0)), gp.clone().add(V(-0.16, 0.4, -0.12)), 24, 3.2);
    await this.wait(1.4);
    // the teacher looks up from his book... and screams
    this.shot(m.headWorld(V()).add(V(0.9, 0.05, 1.2)), m.headWorld(V()), 24, 0); m.read(false); m.act('lookup'); audio.play('page_turn', { rate: 0.5 }); await this.wait(0.9);
    m.act('scream'); this.engine.shake(0.25); audio.play('monster_roar', { rate: 1.4, vol: 0.35 }); this.say('teacher', 'ISAAC, NO!', m, { wait: false, hold: 2 }); this.shot(m.headWorld(V()).add(V(0.6, 0.0, 0.8)), m.headWorld(V()), 20, 1.6);
    await this.wait(1.7);
    // the touch
    this.shot(gp.clone().add(V(0.38, 0.5, 0.85)), gp.clone().add(V(-0.1, 0.25, -0.1)), 24, 0); await this.wait(0.5);
    this.gold.parent?.remove(this.gold); k.hand(1).add(this.gold); this.gold.position.set(0, -0.02, 0.04); this.goldGround = false; this.holdGrab = false;
    clearInterval(beat); audio.play('implosion', { vol: 1 }); audio.play('thunder', { rate: 0.6, vol: 0.9 }); audio.play('glass_shatter', { rate: 0.5, vol: 0.5 }); this.engine.shake(0.6);
    // THE SHOCKWAVE: time stops behind the front; the world goes black and white
    const S = (this.shock = shockPass(this.engine)); const sp = this.gold.getWorldPosition(V()).project(this.cam); const c = new THREE.Vector2(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    this.shot(V(-0.6, 2.4, 9.6), V(-0.4, 0.9, 2.6), 40, 2.4);
    await this.tween(2.6, (u) => { S.set({ r: ease(u) * 2.4, k: 1, c, gray: u > 0.92 ? (u - 0.92) / 0.08 : 0 }); this.timeK = Math.max(0, 0.16 * (1 - u * 1.6)); });
    this.timeK = 0; this.frozen = true; S.set({ gray: 1, k: 0 });
    await this.narr('And time stopped.', { show: false });
    await this.wait(0.8); audio.play('magic_sparkle', { vol: 0.8 }); audio.play('eureka', { vol: 0.6 });
    await this.tween(0.9, (u) => S.set({ white: ease(u) }));
  }

  // PAINTING: the fresco cutscene
  async b_painting() {
    const { buildCreation } = await import('../story/painting.js'); const P = buildCreation(); this.paint = P;
    if (!this.shock) { this.shock = shockPass(this.engine); this.shock.set({ white: 1, k: 0 }); }
    this.frozen = false; this.timeK = 1; this.world(P.scene); this.engine.setFx({ bloom: [0.35, 0.6, 0.86], exposure: 0.97, grade: { warmth: 0.22, vignette: 0.3, sat: 1.1, vib: 0.26, contrast: 1.06, lift: [0.004, 0.006, 0.02] }, rays: false, ink: { strength: 0.55 } });
    const PP = (this.paintFx = paintPass(this.engine)); PP.set(1); audio.playMusic('journal');
    this.shot(V(-0.5, 1.55, 8.4), V(-0.5, 1.2, 0), 42, 0); this.shot(V(-0.4, 1.5, 7.2), V(-0.4, 1.2, 0), 40, 22);
    await this.tween(2.4, (u) => this.shock.set({ white: 1 - ease(u), gray: 0, k: 0 }));
    this.shock.dispose(); this.shock = null;
    await this.narr('And the boy woke inside a painting.', { show: false });
    const g = P.god, kd = P.kid;
    await this.say('god', 'You took what was never yours.', g);
    await this.say('god', 'For that, you are bound to the realm of the gods. Forever.', g);
    await this.say('isaac_kid', 'I only wanted to know why things fall.', kd);
    await this.say('god', 'I know. That is why I pity you.', g);
    this.shot(V(-0.3, 1.4, 4.6), P.handsWorld(V()), 34, 9);
    await this.say('god', 'Keep the apple. It bends what is real: gravity, motion... even time.', g);
    await this.say('god', 'Learn its rules, before it learns yours.', g, { show: false });
    audio.play('magic_shimmer', { vol: 0.7 }); await this.tween(2.6, (u) => P.touch(ease(u)));
    audio.play('eureka', { vol: 0.8 }); this.engine.flash(1, 0xfff8ee, 1.6); await this.wait(0.25);
    this.paintFx.dispose(); this.paintFx = null;
  }

  // SKY: the reveal, then the tower-top menu
  async b_sky() {
    if (this.paintFx) { this.paintFx.dispose(); this.paintFx = null; }
    const sc = new THREE.Scene(); let sky = null; try { const { animeSky } = await import('../models/toon.js'); sky = animeSky('garden', V(0.2, 0.06, -1)); sc.add(sky); } catch (e) { sc.background = new THREE.Color(0xf0b090); }
    sc.add(new THREE.HemisphereLight(0xffe0c0, 0x705060, 1.2)); const sun = new THREE.DirectionalLight(0xffc890, 1.6); sun.position.set(2, 1, -8); sc.add(sun);
    const clouds = this.cloudBank(sc); this.clouds = clouds;
    this.world(sc); this.engine.setFx({ bloom: [0.55, 0.6, 0.78], exposure: 0.95, grade: { warmth: 0.35, vignette: 0.35, sat: 1.06 }, rays: { pos: V(40, 12, -200), strength: 0.5, tint: 0xffc080, thresh: 0.75 } });
    audio.playMusic('menu'); audio.setAmbSet(['wind']);
    this.shot(V(0, -2, 6), V(0, 9, -30), 50, 0); this.shot(V(0, 1.2, -6), V(0, 2.5, -60), 44, 9);
    this.engine.flash(1, 0xfff8ee, 2.2);
    await this.narr('He woke above the clouds.');
    await this.narr('A tower was waiting.', { show: false });
    await this.wait(3.2);
  }

  // ------------------------------------------------------------------ set pieces
  placeAt(a, p, yaw) { a.stop?.(); a.root.position.set(p.x, this.hAt(p.x, p.z), p.z); if (yaw != null) { a.root.rotation.y = yaw; a.st.faceYaw = null; } }
  benchPos() { const b = SPOT.bench; const yaw = 0.55; const f = V(Math.sin(yaw), 0, Math.cos(yaw)), r = V(Math.cos(yaw), 0, -Math.sin(yaw)); const y = this.hAt(b.x, b.z); return { seat: b.clone().addScaledVector(f, 0.06).addScaledVector(r, -0.12), yaw, caneTop: b.clone().addScaledVector(r, 0.55).addScaledVector(f, 0.12).setY(y + 0.92), caneTip: b.clone().addScaledVector(r, 0.75).addScaledVector(f, 0.42).setY(y) }; }
  goldApple() { const ga = P3.apple({ kind: 'gold' }); ga.scale.setScalar(0.1); const mats = []; ga.traverse((o) => { if (o.isMesh && o.material?.emissive) { o.material = o.material.clone(); o.material.emissive.set(0x5a3a08); o.material.emissiveIntensity = 0.5; mats.push(o.material); } }); ga.userData.mats = mats; return ga; } // a warm inner glow in its own surface (no light pool on the grass)
  dropGold() { const g = this.gold; const p = g.getWorldPosition(V()); g.parent.remove(g); this.gardenScene.add(g); g.position.copy(p); this.goldGround = true; let vy = 0, vx = -0.35; const gy = this.hAt(p.x, p.z) + 0.06;
    this.ups.push({ t: 0, d: 2.0, real: false, res: () => {}, fn: () => { const dt = 1 / 60; vy -= 9.8 * dt; g.position.y += vy * dt; g.position.x += vx * dt; vx *= 0.97; g.rotation.z -= vx * 0.25; if (g.position.y < gy) { g.position.y = gy; if (vy < -0.6) audio.play('wood_knock', { vol: 0.25, rate: 1.8 }); vy = -vy * 0.35; } } }); }
  makeConstruct() { // a turned brass stand with a glass collar, floating in the air between them; the cards' laws gather on it
    const g = new THREE.Group(); g.position.copy(SPOT.con); g.position.y += this.hAt(SPOT.con.x, SPOT.con.z); this.gardenScene.add(g); g.scale.setScalar(0.001);
    const brass = new THREE.MeshStandardMaterial({ color: 0xc8963c, metalness: 0.85, roughness: 0.35, flatShading: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.014, 4, 8), brass); ring.rotation.x = Math.PI / 2; ring.position.y = -0.22; g.add(ring);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 4), brass); const a = (i / 3) * Math.PI * 2; s.position.set(Math.cos(a) * 0.16, -0.12, Math.sin(a) * 0.16); s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(s); }
    const hold = new THREE.Group(); g.add(hold); this.con = { g, hold, apple: null, arrow: null, swirl: null, spin: 0, pop: 0, hover: 0 };
    this.tween(0.8, (u) => g.scale.setScalar(Math.max(0.001, ease(u) * (1 + Math.sin(u * Math.PI) * 0.2)))); audio.play('clockwork', { vol: 0.4 });
  }
  conSet(what) {
    const C = this.con; if (!C) return; C.pop = 1; audio.play('glass_clink', { vol: 0.6 }); this.burst(C.g.position, '#ffe8a0', 14);
    if (what === 'apple' && !C.apple) { const a = P3.apple({ kind: 'red' }); a.scale.setScalar(0.12); C.hold.add(a); C.apple = a; }
    if (what === 'force' && !C.arrow) { const ar = P3.arrow(0xd8a040, 0.5); ar.scale.setScalar(0.32); ar.rotation.z = Math.PI / 2; ar.position.set(-0.24, 0, 0); C.hold.add(ar); C.arrow = ar; audio.play('whoosh_soft'); }
    if (what === 'rotation' && !C.swirl) { const sw = new THREE.Group(); for (const [rx, rz] of [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 2]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 3, 6), new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 0.8, roughness: 0.35, flatShading: true })); r.rotation.set(rx, 0, rz); sw.add(r); } C.hold.add(sw); C.swirl = sw; audio.play('spin_whoosh'); }
  }
  dropConstruct() { const C = this.con; if (!C) return; this.tween(0.6, (u) => C.g.scale.setScalar(Math.max(0.001, 1 - ease(u)))).then(() => { this.gardenScene.remove(C.g); }); this.con = null; }
  cloudBank(sc) { // sculpted cumulus banks below the camera's path: flat bases, billowing faceted tops in tiers, warm sunlit crowns, violet shade
    const top = new THREE.MeshStandardMaterial({ color: 0xfff0e2, emissive: 0x7a5048, emissiveIntensity: 0.32, roughness: 1, flatShading: true, fog: false }); const list = [];
    const lump = (g, x, y, z, sx, sy, sz) => { const geo = new THREE.IcosahedronGeometry(1, 1); const p = geo.attributes.position; for (let v = 0; v < p.count; v++) { const yy = p.getY(v); if (yy < -0.15) p.setY(v, -0.15 - (yy + 0.15) * 0.1); p.setX(v, p.getX(v) * (1 + Math.sin(v * 1.7) * 0.06)); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, top); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.y = Math.random() * 3; g.add(m); };
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group(); const n = 3 + Math.floor(Math.random() * 3); const W = n * 1.9;
      for (let k = 0; k < n; k++) lump(g, k * 1.9 - W / 2 + 0.9, 0, (Math.random() - 0.5) * 1.2, 1.5 + Math.random() * 0.6, 0.9 + Math.random() * 0.4, 1.3); // the flat-based body
      for (let k = 0; k < n - 1; k++) lump(g, k * 1.9 - W / 2 + 1.8, 0.9 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8, 1.1 + Math.random() * 0.4, 0.9 + Math.random() * 0.5, 1.0); // billows
      lump(g, (Math.random() - 0.5) * W * 0.3, 1.7 + Math.random() * 0.4, 0, 0.9, 0.8 + Math.random() * 0.4, 0.8); // the crown
      const s = 2.2 + Math.random() * 2.6; g.scale.setScalar(s); g.position.set((Math.random() - 0.5) * 150, -10 - Math.random() * 12, -20 - Math.random() * 150); g.traverse((o) => { o.userData.noInk = true; }); sc.add(g); list.push(g);
    }
    return list;
  }
  // ------------------------------------------------------------------ input: lesson cards (hover, drag, merge), the golden apple
  rayWorld(objs) { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.cam); return r.intersectObjects(objs, true); }
  cardAt() { const h = this.ray(this.lesson.filter((v) => !v.gone).map((v) => v.mesh))[0]; return h ? h.object.userData.card3d : null; }
  onDragStart() { if (!this.cardsLive || !this.mergeStep) return false; const v = this.cardAt(); if (!v || v.id !== this.mergeStep) { if (v) { v.rz.kick?.(3); audio.play('ui_error', { vol: 0.4 }); } return false; } this.dragging = v; audio.play('card_pick'); return true; }
  onDrag() { const v = this.dragging; if (!v) return; const p = this.ptr(3); v.target = { x: p.x, y: p.y, z: 4.5, rz: 0, s: 1.05 }; const tg = this.lesson.find((x) => x.id === 'apple'); const near = Math.hypot(p.x - tg.pos.x.value, p.y - tg.pos.y.value) < 3.2; tg.glowK = near ? 1 : 0; }
  onDragEnd() { const v = this.dragging; if (!v) return; this.dragging = null; const tg = this.lesson.find((x) => x.id === 'apple'); tg.glowK = 0; if (Math.hypot(v.pos.x.value - tg.pos.x.value, v.pos.y.value - tg.pos.y.value) < 3.2) this.mergeCard(v.id); else { v.target = { x: v.home.x, y: v.home.y, z: 3, rz: 0, s: v.home.s }; audio.play('card_place', { vol: 0.5 }); } }
  mergeCard(id) {
    if (!this.mergeStep || id !== this.mergeStep) return; const v = this.lesson.find((x) => x.id === id), tg = this.lesson.find((x) => x.id === 'apple'); if (!v || !tg) return;
    const n = this.lesson.filter((x) => x.gone).length + 1; v.gone = true; v.target = { x: tg.home.x + 0.5 * n, y: tg.home.y + 0.62 * n, z: 3 - 0.06 * n, rz: -0.07 * n, s: tg.home.s * 0.97 }; tg.target = { ...tg.target, s: tg.home.s * 1.12 }; tg.rz.kick?.(6);
    audio.play('card_snap'); audio.play('magic_shimmer', { vol: 0.4 }); this.engine.flash(0.12, 0xffe8a0, 0.3);
    setTimeout(() => { tg.target = { ...tg.target, s: tg.home.s }; }, 260);
    const r = this.onMerged; this.onMerged = null; r?.();
  }
  onMove() {
    if (this.cardsLive && !this.dragging) { const hv = this.cardAt(); for (const v of this.lesson) { const on = v === hv && !v.gone; if (on && !v.hover) audio.play('ui_hover', { vol: 0.4 }); v.hover = on; } }
    if (this.applePick && this.gold) { const on = this.rayWorld([this.gold]).length > 0; if (on && !this.goldHover) audio.play('chime_soft', { vol: 0.4 }); this.goldHover = on; }
    if (this.con) { const on = this.rayWorld([this.con.g]).length > 0; if (on && !this.con.hover) { audio.play('glass_clink', { vol: 0.35 }); this.con.pop = 0.6; } this.con.hover = on ? 1 : 0; }
  }
  onClickUI() {
    if (this.applePick && this.gold && this.rayWorld([this.gold]).length) { this.takeApple?.(); return; }
    if (this.cardsLive && !this.mergeStep) { const v = this.cardAt(); if (v) { v.flip.target = v.flip.target ? 0 : 1; audio.play('card_flip'); return; } }
    if (this.con && this.rayWorld([this.con.g]).length) { this.con.spin += 6; audio.play('spin_whoosh', { vol: 0.5 }); return; }
    fadvance();
  }
  // ------------------------------------------------------------------ helpers
  burst(p, color = '#ffe08a', n = 20) { const P = this.parts; if (!P) return; const R = (a, b) => a + Math.random() * (b - a); P.burst(n, () => ({ pos: [p.x + R(-0.15, 0.15), p.y + R(-0.05, 0.2), p.z + R(-0.15, 0.15)], vel: [R(-1.3, 1.3), R(0.2, 1.8), R(-1, 1)], life: R(0.5, 1.0), size: R(8, 14), color, sprite: 'star4', drag: 1.4 })); }
  update(dt, t) {
    const rdt = dt; const c = this.cs; c.t += rdt;
    if (c.mv) { const M = c.mv; M.t += rdt; const u = ease(M.t / M.d); c.p.lerpVectors(M.p0, M.p, u); c.l.lerpVectors(M.l0, M.l, u); c.fov = M.f0 + (M.fov - M.f0) * u; if (M.t >= M.d) { c.mv = null; M.res(); } }
    else if (c.follow) { const f = c.follow.fn(); const k = Math.min(1, rdt * c.follow.k); c.p.lerp(f.p, k); c.l.lerp(f.l, k); if (f.fov) c.fov += (f.fov - c.fov) * k; }
    const dr = this.frozen ? 0 : c.drift; this.cam.position.copy(c.p).add(V(Math.sin(c.t * 0.31) * 0.04 * dr, Math.sin(c.t * 0.23) * 0.03 * dr, 0)); this.cam.lookAt(c.l); this.cam.aspect = this.engine.aspect; if (Math.abs(this.cam.fov - c.fov) > 1e-3) this.cam.fov = c.fov; this.cam.updateProjectionMatrix();
    const k = this.paused ? 0 : this.timeK; const sdt = rdt * k;
    for (const u of [...this.ups]) { u.t += u.real === false ? sdt : rdt; const q = Math.min(1, u.t / u.d); u.fn(q); if (q >= 1) { this.ups.splice(this.ups.indexOf(u), 1); u.res(); } }
    if (!this.paused && this.sc === this.gardenScene) {
      if (this.holdGrab && this.kid.st.gest === 'grab' && this.kid.st.gt > 0.5) this.kid.st.gt = 0.5; // hold the reach until the touch
      for (const a of this.actors) a.update(sdt); this.raccoon?.update(sdt); this.snake?.update(sdt); if (sdt > 0) this.O?.update?.(sdt, t); this.parts?.update(sdt, t); this.dust?.update(sdt, t);
      if (this.gold) { this.gold.rotation.y += sdt * 1.2; for (const mt of this.gold.userData.mats || []) mt.emissiveIntensity = (this.goldHover ? 1.1 : 0.45) + Math.sin(c.t * 3) * 0.12; if (this.goldGround && Math.random() < sdt * 6) { const p = this.gold.getWorldPosition(V()); this.parts.burst(1, { pos: [p.x + (Math.random() - 0.5) * 0.2, p.y + Math.random() * 0.15, p.z + (Math.random() - 0.5) * 0.2], vel: [0, 0.25, 0], life: 1.2, size: 6, color: '#ffd860', sprite: 'star4', drag: 0.5 }); } }
      if (this.con) { const C = this.con; C.pop = Math.max(0, C.pop - sdt * 3); C.spin *= Math.exp(-sdt * 1.5); C.hold.rotation.y += sdt * (0.6 + C.spin + C.hover * 2 + (C.swirl ? 3 : 0)); C.hold.position.y = Math.sin(c.t * 1.6) * 0.04 + C.hover * 0.05; C.hold.scale.setScalar(1 + Math.sin(C.pop * Math.PI) * 0.2); if (C.arrow) C.arrow.position.x = -0.24 - Math.sin(c.t * 4) * 0.03; }
    } else if (this.sc === this.paint?.scene) this.paint.update(rdt);
    if (this.clouds) for (const m of this.clouds) m.position.x += rdt * 0.4;
    for (const v of this.lesson) { if (!v.gone && v.home && this.cardsLive) { const hv = v.hover || v.focus; v.target = this.dragging === v ? v.target : { x: v.home.x, y: v.home.y + (hv ? 0.7 : 0) + (v.glowK ? 0.3 : 0), z: hv ? 4.2 : 3, rz: v.target.rz * 0.9, s: v.home.s * (hv ? 1.12 : v.focus === false && this.lesson.some((x) => x.focus) ? 0.94 : 1) }; if (v.hover) { const p = this.ptr(3); v.tilt.x = -(p.y - v.home.y) * 0.05; v.tilt.y = (p.x - v.home.x) * 0.05; } else { v.tilt.x = 0; v.tilt.y = 0; } } v.update(rdt, c.t); }
    this.bars?.update(rdt, this.H);
  }
  dispose() { fstop(); window.__storyBand = false; clearInterval(this.heartbeat); this.shock?.dispose(); this.paintFx?.dispose(); this.hint?.remove(); this.cap?.remove(); if (this.handler) this.input.remove(this.handler); if (window.__prologue?.scene === this) window.__prologue = null; this.bars?.dispose?.(); super.dispose(); }
}

/** play the prologue on the running game; it ends in the tower-top menu */
export async function playPrologue(game, opts = {}) {
  let done, scene; await game.swap(async () => { scene = new PrologueScene(game, opts); game.scene = scene; done = scene.run(); await scene.ready; }, { color: 0x000000, style: 'galaxy' });
  await done;
  await game.toMenu({ from: 'prologue', wipe: { color: 0xfff6e8, style: 'galaxy' } });
}
