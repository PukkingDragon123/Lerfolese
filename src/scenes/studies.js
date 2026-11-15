// THE EXPERIMENT HALL (menu agent; the tower menu's STUDIES): a lamplit laboratory of natural philosophy, furnished with
// real CC0 Poly Haven pieces converted to crisp pixel art (scenes/labassets.js). On the oak WORKBENCH Isaac works
// hands-on PHYSICS PUZZLES (scenes/labpuzzles.js), one per kind of study, where the equation is the tool:
//   - The list (left) shows the eight experiments with their 3 stars; each UNLOCKS when a related combination or Law
//     has been discovered in a run (game/studies.js puzzleList). Selecting one sets its apparatus on the bench.
//   - The controls (bottom right): brass sliders with live numbers (drag, or nudge with the arrows / keyboard), the
//     three goals (Solved, Bullseye, within Par runs), New trial and RUN. The easel slate beside the bench (and the
//     wall board) chalk the law with the player's values plugged in; a dotted ghost shows the start of what will happen.
//   - RUN plays the real physics; the result is chalked, stars pop, gold dust, a cast-gold "Bullseye!".
//   - The STAR LADDER (bottom left): star totals unlock permanent rewards (gold, favoured cards, an opening card, run
//     starts, artifacts, a trophy). Claiming a rung: the equation writes itself, gears turn, a brass plaque drops, and
//     the reward appears in 3D over the bench. Three stars on a puzzle put its trophy on the shelves.
//   Esc / Return goes back up to the tower. Debug: ?scene=studies&study=demo (seeds discoveries), &labfast=4 (runs the
//   puzzles faster, for headless captures); __game.scene.cheat() sets the textbook answer.
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { prop, lathe, cbox, extrude, shape } from '../models/lowprops.js';
import { makeApple } from '../models/orchard.js';
import { drawPixelText, measure } from '../ui3d/craft.js';
import { cineText } from '../ui3d/cinetext.js';
import { Motes } from '../gfx/motes.js';
import { makeDemo, put, smat, M, glassM } from './studydemos.js';
import { wallChart, openBook, rug as labRug, Books } from './labprops.js';
import { preloadLab, labProp, labDispose } from './labassets.js';
import * as LP from '../models/libprops.js';
import { REWARD_ICON, studyPerks, puzzleList, PUZZLE_ORDER, STAR_NAMES, TRACK, labState, starTotal, awardStars, tiersReady, claimTier, tierText } from '../game/studies.js';
import { makePuzzle, ruler } from './labpuzzles.js';
import { save } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';
import { Scholar, icon, bar, divider, slider } from '../ui2d/scholar.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const BENCH_Y = 0.94;
const CAM = { pos: V(0.45, 2.15, 3.45), look: V(0.3, 1.02, -0.4), fov: 48 };
const LAB_IDS = ['WoodenTable_01', 'vintage_cabinet_01', 'wooden_bucket_01', 'brass_candleholders', 'GothicCommode_01', 'GothicCabinet_01', 'wooden_bookshelf_worn', 'vintage_wooden_drawer_01', 'WoodenChair_01', 'wooden_stool_02', 'vintage_grandfather_clock_01', 'ornate_mirror_01', 'fancy_picture_frame_01', 'treasure_chest', 'Barrel_01', 'wicker_basket_01',
  'Lantern_01', 'wooden_candlestick', 'vintage_oil_lamp', 'mantel_clock_01', 'marble_bust_01',  'antique_ceramic_vase_01', 'vintage_microscope', 'book_encyclopedia_set_01', 'brass_pot_01', 'brass_vase_01', 'brass_goblets',
  'magnifying_glass_01', 'pocket_watch', 'seadogs_compass', 'food_apple_01', 'round_spectacles'];
const DOOR = { pos: V(1.6, 2.6, 7.6), look: V(-0.2, 1.6, 0) };

/** a small ink triangle for the nudge buttons */
const arrow = (d) => { const c = document.createElement('canvas'); c.width = 4; c.height = 7; const g = c.getContext('2d'); g.fillStyle = '#2a1406'; for (let y = 0; y < 7; y++) { const w = 4 - Math.abs(3 - y); g.fillRect(d < 0 ? 4 - w : 0, y, w, 1); } c.className = 'lf-cv'; c.dataset.w = 4; c.dataset.h = 7; return c; };
const PAR = 2; // runs within which a solve earns the third star
const DIM = ['#000', '#1a120c', '#2e2016', '#4a3424', '#5e4632', '#6e5440', '#7e624c']; // an unearned star: dark carved wood
const EUREKA = ['F = m a', 'F = G m1 m2 / r^2', 'p = m v', 'T = 2 pi sqrt(L/g)', 'n1 sin a = n2 sin b', 'L = I w', 'P V = n R T', 'E = 1/2 m v^2', 'W = F d', 'F = k q1 q2 / r^2'];
/** a brass gear outline (teeth as trapezoids, a hub hole), extruded to face +z */
function gearGeo(r = 0.3, teeth = 12, depth = 0.05) {
  const pts = []; const rr = r * 0.8; for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2, w = (Math.PI * 2) / teeth; for (const [f, R] of [[0, rr], [0.18, r], [0.5, r], [0.68, rr]]) pts.push([Math.cos(a + w * f) * R, Math.sin(a + w * f) * R]); }
  const hole = Array.from({ length: 8 }, (_, i) => { const a = -(i / 8) * Math.PI * 2; return [Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22]; });
  const g = extrude(shape(pts, [hole]), depth, depth * 0.15); g.translate(0, 0, -depth / 2); return g;
}
/** the reward, as a small golden object on the bench (coins, cards, a star, a mechanism, the golden apple) */
function rewardObject(r) {
  const g = new THREE.Group(); const gold = M.gold();
  if (r.kind === 'gold') for (let i = 0; i < 7; i++) put(g, lathe([[0.0005, 0], [0.05, 0], [0.052, 0.006], [0.05, 0.012], [0.0005, 0.012]], 10), gold, (i % 3 - 1) * 0.006, i * 0.0125 - 0.04, (i % 2) * 0.006);
  else if (r.kind === 'weight' || r.kind === 'card') for (const [x, a] of [[-0.05, 0.22], [0.05, -0.22]]) { const c = new THREE.Group(); c.position.x = x; c.rotation.z = a; g.add(c); put(c, cbox(0.17, 0.25, 0.008, 0.004), gold, 0, 0, 0); put(c, cbox(0.145, 0.22, 0.01, 0.002), M.parch(), 0, 0, 0.002); }
  else if (r.kind === 'start') { const pts = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI * 2, R = i % 2 ? 0.055 : 0.13; pts.push([Math.cos(a) * R, Math.sin(a) * R]); } const geo = extrude(shape(pts), 0.04, 0.01); geo.translate(0, 0, -0.02); put(g, geo, gold); }
  else if (r.kind === 'item') { put(g, gearGeo(0.12, 12, 0.03), M.brass(), 0, 0, 0); put(g, gearGeo(0.07, 8, 0.03), gold, 0.15, 0.06, 0.01); }
  else { const a = makeApple({ s: 0.16 }); a.traverse((o) => { if (o.isMesh) o.material = gold; }); g.add(a); }
  return g;
}

export class StudiesScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x0c0806); sc.fog = new THREE.Fog(0x140c08, 9, 22);
    if (new URLSearchParams(location.search).get('study') === 'demo') this.seedDemo(); this.fastT = +(new URLSearchParams(location.search).get('labfast') || 1); // debug: run the puzzles faster (headless captures)
    { const cq = new URLSearchParams(location.search).get('cam'); if (cq === 'wide') { CAM.pos.set(1.2, 2.5, 5.2); CAM.look.set(-1.0, 1.7, -2.5); CAM.fov = 58; } else if (cq && cq.includes(',')) { const n = cq.split(',').map(Number); CAM.pos.set(n[0], n[1], n[2]); CAM.look.set(n[3], n[4], n[5]); CAM.fov = n[6] || 40; } } // debug: ?cam=wide or ?cam=x,y,z,lx,ly,lz,fov
    this.camera = new THREE.PerspectiveCamera(CAM.fov, this.engine.aspect, 0.05, 80); this.camera.fov = CAM.fov; this.camera.position.copy(DOOR.pos); this.look = DOOR.look.clone(); this.camera.lookAt(this.look); if (this.fastT > 1) { this.camera.position.copy(CAM.pos); this.look.copy(CAM.look); this.camera.lookAt(this.look); }
    this.rnd = mulberry32(9); this.motes = new Motes(900, { px: 2 }); sc.add(this.motes.points); this.acc = 0;
    await preloadLab(LAB_IDS); this.buildRoom(sc); this.buildBench(sc); this.buildBoard(sc); this.buildCabinet(sc); this.envMap(sc);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.14, 0.3, 0.97], ao: 1.0, exposure: 1.12, grade: { sat: 0.96, vib: 0.04, contrast: 1.06, vignette: 0.42, warmth: 0, lift: [0.006, 0.007, 0.012], gain: [1.0, 1.0, 0.98], toe: 0.05 }, ink: { fade: [10, 30], strength: 0.7 } }); // matte and natural: bloom only on the flames and the window glass
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['campfire']); audio.playMusic(audio.manifest?.music?.hall ? 'hall' : 'journal');
    this.UI = new Scholar(); this.puzzles = puzzleList(); this.runs = {}; this.buildUI(); this.select(this.puzzles.find((p) => p.unlocked) || this.puzzles[0]);
    this.intro = this.fastT > 1 ? null : { t: 0 }; this.push = new Spring(0, 4, 0.8); this.reveals = []; this.debris = [];
    for (let i = 0; i < 70; i++) { const r = this.rnd; this.motes.spawn({ pos: [this.camera.position.x + (r() - 0.5) * 3, this.camera.position.y + (r() - 0.5) * 2, this.camera.position.z - 1 - r() * 3], vel: [(r() - 0.5) * 0.4, 0.15 + r() * 0.2, (r() - 0.5) * 0.2], wobble: 0.4, drag: 0.4, life: 1.5 + r() * 1.2, sprite: 'dust', color: '#f4f0ea', bright: 0.9, fadeIn: 0.01 }); } // the steam of the transition clearing
    audio.play('steam_hiss', { vol: 0.3 }); audio.play('wood_creak', { vol: 0.3, delay: 0.4 });
  }
  seedDemo() { const j = save.journal; const add = (k, name, count, o = {}) => { if (!j.combos[k]) j.combos[k] = { name, count, loop: 1, special: !!o.special, law: !!o.law, note: '', best: 20 }; };
    add('apple+gravity', 'Falling Apple', 5, { special: true }); add('pendulum+stone', 'Wrecking Ball', 2, { special: true }); add('force+inertia+motion', 'First Law of Motion', 3, { special: true, law: true }); add('lens+spark', 'Death Ray', 1, { special: true }); add('apple+spin', 'Spinning Apple', 4, { special: true }); add('force+mass', 'F = ma', 3, { special: true }); add('heat+water', 'Steam', 1, { special: true }); add('gravity+inertia+rotation', 'Orbit', 0, { special: true }); }
  envMap(sc) { try { const pm = new THREE.PMREMGenerator(this.engine.renderer); const es = new THREE.Scene(); es.background = new THREE.Color(0x1a100a);
      const glow = (c, w, h, p, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.copy(p); m.rotation.y = ry; es.add(m); };
      glow(new THREE.Color(0.55, 0.65, 0.95), 3, 5, V(0, 2, -6), 0); glow(new THREE.Color(1.1, 0.8, 0.5), 0.8, 0.8, V(0, 3, 0), 0); glow(new THREE.Color(0.22, 0.17, 0.12), 8, 8, V(0, -2, 0), 0);
      this._env = pm.fromScene(es, 0.04, 0.1, 50); sc.environment = this._env.texture; sc.environmentIntensity = 0.22; pm.dispose(); } catch (e) { console.warn('env map', e); } }
  // ---------------------------------------------------------------- the room
  // The furniture and the dressing are real CC0 Poly Haven models converted to pixel art (labassets.js); the shell is
  // timber, stone and lime plaster in tileable pixel textures at one texel density (about 170 texels a metre).
  roomMat(name, tile, { rough = 0.85, color = 0xffffff } = {}) {
    const t = new THREE.TextureLoader().load(new URL(`../../assets/textures/lab/${name}.png`, import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: rough, metalness: 0, color, flatShading: true, envMapIntensity: 0.4 }); m.userData.tile = tile; return m;
  }
  slab(sc, mat, w, h, d, x, y, z, { cast = false } = {}) { // a box whose UVs tile at the material's real-world size
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; const T = mat.userData.tile || 1; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / T + x * 0.37, uv.getY(i) * dims[f][1] / T + y * 0.23); }
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = cast; sc.add(m); return m;
  }
  place(sc, id, x, y, z, ry = 0, o = {}) { const p = labProp(id, o); p.position.set(x, y, z); p.rotation.y = ry; (o.parent || sc).add(p); return p; }
  flame(parent, x, y, z, { light = 0, color = 0xffb870, dist = 2.4 } = {}) { // a candle flame: a faceted teardrop of hot light, with its own warm point light
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const fl = new THREE.Mesh(lathe([[0.0005, 0], [0.007, 0.008], [0.0085, 0.02], [0.005, 0.034], [0.0005, 0.046]], 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.6), toneMapped: false })); fl.userData.noInk = true; g.add(fl);
    const core = new THREE.Mesh(lathe([[0.0005, 0], [0.004, 0.006], [0.004, 0.014], [0.0005, 0.022]], 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.9, 2.2), toneMapped: false })); core.userData.noInk = true; core.position.y = 0.002; g.add(core);
    g.userData.flame = fl; if (light) { const L = new THREE.PointLight(color, light, dist, 2); L.position.y = 0.06; g.add(L); g.userData.light = L; g.userData.base = light; }
    (this.candles ||= []).push(g); return g;
  }
  buildRoom(sc) {
    const W = 7, D = 4.6, H = 4.4; const r = this.rnd;
    const floorM = this.roomMat('floor', 1.5, { rough: 0.9 }), stoneM = this.roomMat('stone', 1.13, { rough: 1 }), plasterM = this.roomMat('plaster', 2.4, { rough: 1, color: 0xe6e2dc }), beamM = (this.beamM = this.roomMat('beam', 0.75, { rough: 0.95 }));
    this.slab(sc, floorM, W * 2 + 1, 0.3, D + 8, 0, -0.15, 2); // oak boards
    this.slab(sc, plasterM, W * 2 + 1, H, 0.3, 0, H / 2, -D); for (const s of [-1, 1]) this.slab(sc, plasterM, 0.3, H, D + 8, s * W, H / 2, 2); // lime plaster
    this.slab(sc, stoneM, W * 2 + 1, 0.9, 0.36, 0, 0.45, -D + 0.02); for (const s of [-1, 1]) this.slab(sc, stoneM, 0.36, 0.9, D + 8, s * (W - 0.02), 0.45, 2); // a dressed-stone dado
    for (let x = -W + 0.6; x <= W - 0.6; x += 2.1) { if (Math.abs(x) > 1.7) this.slab(sc, beamM, 0.26, H, 0.26, x, H / 2, -D + 0.2, { cast: true }); this.slab(sc, beamM, 0.3, 0.32, D + 7, x, H - 0.12, 1.5, { cast: true }); } // posts and tie beams
    this.slab(sc, beamM, W * 2, 0.24, 0.3, 0, H - 0.6, -D + 0.25); this.slab(sc, beamM, W * 2 + 1, 0.1, D + 8, 0, H + 0.05, 2); for (let x = -W + 0.6; x < W; x += 0.7) this.slab(sc, beamM, 0.12, 0.14, D + 7, x, H - 0.05, 1.5); // wall plate, joists, boards
    // tall leaded windows on the back wall either side of the board: a cool blue evening with a last band of warm light low down
    const winM = new THREE.ShaderMaterial({ uniforms: {}, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vUv; void main(){ vec3 a = vec3(1.0, 0.78, 0.5), b = vec3(0.46, 0.6, 0.86), c = vec3(0.13, 0.19, 0.42); vec3 col = mix(a, b, smoothstep(0.0, 0.3, vUv.y)); col = mix(col, c, smoothstep(0.35, 1.0, vUv.y)); vec2 p = floor(vUv * vec2(48.0, 104.0)) / vec2(48.0, 104.0) * vec2(4.0, 9.0); float lead = step(0.9, fract(p.x + p.y)) + step(0.9, fract(p.x - p.y)); col *= 1.0 - min(1.0, lead) * 0.8; gl_FragColor = vec4(col * 1.25, 1.0); }' });
    for (const x of [-4.4, 4.4]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), winM); g.position.set(x, 2.45, -D + 0.16); g.userData.noInk = true; g.userData.noAO = true; sc.add(g);
      const fr = new THREE.Group(); fr.position.set(x, 2.45, -D + 0.2); sc.add(fr); for (const [w, h, px, py] of [[1.5, 0.12, 0, 1.36], [1.5, 0.16, 0, -1.36], [0.12, 2.8, -0.7, 0], [0.12, 2.8, 0.7, 0], [0.06, 2.6, 0, 0], [1.4, 0.05, 0, 0.3]]) put(fr, cbox(w, h, 0.14, 0.02), M.walnut(), px, py, 0);
      put(fr, extrude(shape(Array.from({ length: 11 }, (_, k) => { const t = (k / 10) * Math.PI; return [Math.cos(t) * 0.72, 1.36 + Math.sin(t) * 0.45]; })), 0.12, 0.02), M.walnut());
      put(fr, cbox(1.6, 0.08, 0.34, 0.02), stoneM, 0, -1.42, 0.1); } // a stone sill
    // the evening through the windows: a cool key from the back, raking long shadows forward, and a soft sky fill
    const dusk = new THREE.DirectionalLight(0xb4c6ec, 2.3); dusk.position.set(-2.5, 6, -10); dusk.target.position.set(0, 0, 1); sc.add(dusk, dusk.target); dusk.castShadow = true; dusk.shadow.mapSize.set(2048, 2048); Object.assign(dusk.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 30 }); dusk.shadow.bias = -0.0006; dusk.shadow.normalBias = 0.02;
    sc.add(new THREE.HemisphereLight(0x98a2ba, 0x4a3a2a, 0.5)); // a faint sky bounce only: the shadows stay dark and the room reads from its two keys
    // hanging lanterns on chains: the warm key
    this.lamps = []; for (const [x, z, k] of [[-0.3, 0.3, 1], [-3.4, -1.6, 0], [3.0, -1.4, 0], [-1.6, 2.4, 0]]) { const L = this.place(sc, 'Lantern_01', x, H - 1.85, z, r() * 3, { h: 0.6, shadow: false, tint: 0xc8b8a0 }); // (the lamp inside must not shadow the room with its own cage) put(sc, cbox(0.016, 1.3, 0.016, 0.003), M.iron(), x, H - 0.64, z);
      this.flame(L, 0, 0.17, 0, {}); const pl = new THREE.PointLight(0xffd2a0, k ? 12 : 3, k ? 9 : 4.5, 2); pl.position.set(x, H - 1.56, z); if (k) { pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); pl.shadow.bias = -0.002; } sc.add(pl); this.lamps.push({ pl, base: pl.intensity, ph: r() * 10, L }); }
    // the back wall: a carved commode under the chalkboard, a tall gothic cabinet and a bookcase to the left, a chest of drawers with wall shelves to the right
    const cm = this.place(sc, 'GothicCommode_01', 0, 0, -4.12, 0, { h: 1.05 }); const cTop = cm.userData.size?.y || 1.05;
    this.place(sc, 'mantel_clock_01', -0.3, cTop, -4.1, 0.15, { h: 0.3 }); this.place(sc, 'marble_bust_01', 0.32, cTop, -4.12, -0.3, { h: 0.42 });
    this.place(sc, 'GothicCabinet_01', -2.65, 0, -3.95, 0, { h: 2.6 });
    { const B = this.place(sc, 'wooden_bookshelf_worn', -6.5, 0, -1.6, Math.PI / 2, { h: 2.6, tint: 0x9a7a62 }); this.fillShelf(B, 2.6, 7); }
    { const B = this.place(sc, 'wooden_bookshelf_worn', -6.5, 0, 0.6, Math.PI / 2, { h: 2.6, tint: 0x9a7a62 }); this.fillShelf(B, 2.6, 8); }
    const dr = this.place(sc, 'vintage_wooden_drawer_01', 2.35, 0, -3.95, 0, { h: 0.98 }); const dTop = 0.98; void dr;
    this.place(sc, 'book_encyclopedia_set_01', 1.6, dTop, -4.1, 0.05, { h: 0.24 }); { this.place(sc, 'vintage_oil_lamp', 2.0, 2.82, -3.72, 0, { h: 1.3 }); const L = new THREE.PointLight(0xffd2a0, 1.6, 3.2, 2); L.position.set(2.0, 3.12, -3.6); sc.add(L); } this.place(sc, 'antique_ceramic_vase_01', 3.4, dTop, -4.05, 0, { h: 0.4 }); this.place(sc, 'wooden_bucket_01', 3.9, 0, -3.6, 0.5, { h: 0.36 });
    this.place(sc, 'vintage_microscope', 2.7, dTop, -3.75, -0.5, { h: 0.36 });
    { const a = makeDemo('flask', { motes: this.motes }); a.group.scale.setScalar(0.62); a.group.position.set(2.2, dTop, -3.72); sc.add(a.group); this.decor = [a]; a.group.traverse((o) => { if (o.isPointLight) o.intensity *= 0.25; }); } // a background piece: its glow stays local
    for (const [y, items] of [[1.78, [['book_encyclopedia_set_01', -0.6, { h: 0.24 }], ['brass_pot_01', 0.25, { h: 0.2 }], ['brass_vase_01', 0.75, { h: 0.34 }]]], [2.42, [['brass_goblets', -0.55, { h: 0.2 }], ['book_encyclopedia_set_01', 0.2, { h: 0.22 }], ['brass_vase_01', 0.9, { h: 0.26 }]]]]) {
      this.slab(sc, beamM, 2.4, 0.05, 0.32, 2.35, y, -4.27, { cast: true }); for (const x of [-1.0, 1.0]) put(sc, cbox(0.04, 0.16, 0.26, 0.006), M.walnut(), 2.35 + x, y - 0.1, -4.3);
      for (const [id, dx, o] of items) this.place(sc, id, 2.35 + dx, y + 0.025, -4.27, (r() - 0.5) * 0.5, o); }
    // the right wall: the long-case clock, a mirror, a portrait
    this.place(sc, 'vintage_grandfather_clock_01', 6.55, 0, 0.9, -Math.PI / 2, { h: 2.3 }); this.place(sc, 'vintage_cabinet_01', 6.45, 0, -1.6, -Math.PI / 2, { h: 2.2 });
    this.place(sc, 'ornate_mirror_01', 6.84, 1.45, 2.4, -Math.PI / 2, { h: 1.0 });
    this.place(sc, 'fancy_picture_frame_01', -6.84, 2.95, -0.5, Math.PI / 2, { h: 0.7 });
    // the floor: a chest, a barrel and a basket by the walls, a stool, a chair drawn up to the bench, a plant in the window light
    this.place(sc, 'treasure_chest', 3.7, 0, -1.0, -0.75, { w: 0.85 }); this.place(sc, 'Barrel_01', 5.9, 0, 2.3, 0.3, { h: 0.95 }); this.place(sc, 'wicker_basket_01', -1.2, 0, -3.9, 0.8, { h: 0.34 });
    this.place(sc, 'WoodenChair_01', 1.05, 0, 1.0, -2.6, { h: 1.35 }); this.place(sc, 'wooden_stool_02', -1.45, 0, 0.75, 0.4, { h: 0.5 });
    // the instruments of astronomy by the left window, a rug under the bench
    { const g = LP.globe(); g.position.set(-5.2, 0, -2.9); g.scale.setScalar(1.1); sc.add(g); }
    const tel = prop('telescope', { L: 1.6 }); tel.position.set(-4.3, 0, -2.5); tel.rotation.y = 0.6; sc.add(tel);
    const rug = labRug(3.8, 2.6); rug.position.set(0, 0.006, 0.3); sc.add(rug);
    for (const [kind, x, y, z, ry, w, h] of [['stars', -2.65, 3.2, -4.36, 0, 0.9, 0.62], ['orbits', 6.82, 2.9, 2.4, -Math.PI / 2, 0.8, 0.6], ['prism', -6.82, 3.1, 2.3, Math.PI / 2, 0.8, 0.6]]) { if (!w) continue; const c = wallChart(kind, w, h); c.position.set(x, y, z); c.rotation.y = ry; sc.add(c); }
    // the standing orrery by the right window and the trophy cabinet beside it
    { const o = makeDemo('orbit'); o.group.position.set(4.6, 0.95, -2.4); o.group.scale.setScalar(1.3); sc.add(o.group); o.group.traverse((q) => { if (q.isPointLight) q.intensity *= 0.35; }); this.place(sc, 'GothicCommode_01', 4.6, 0, -2.4, -0.5, { h: 0.95, w: undefined }); this.decor.push(o); }
  }
  /** fill a converted bookcase's shelves with books (the instanced, hand-pixelled spines of labprops.js) */
  fillShelf(B, h, seed) {
    const S = B.userData.size; const r = mulberry32(seed); const bk = new Books(); const n = 5; const w = S.x * 0.86; const y0 = h * 0.06, sp = (h * 0.86) / n;
    for (let s = 0; s < n; s++) { const y = y0 + s * sp + 0.025; let x = -w / 2; const maxH = sp - 0.08;
      while (x < w / 2 - 0.05) { const k = r(); if (k < 0.07) { x += 0.08 + r() * 0.12; continue; }
        if (k < 0.18) { let yy = y; for (let i = 0; i < 3 + Math.floor(r() * 3); i++) { const th = 0.03 + r() * 0.03; bk.add(new THREE.Matrix4().compose(V(x + 0.12, yy + th / 2, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, (r() - 0.5) * 0.2)), V(0.18, th, 0.24)), Math.floor(r() * 16), 0.85 + r() * 0.25); yy += th; } x += 0.26; continue; }
        const th = 0.03 + r() * 0.045, bh = Math.min(maxH, 0.2 + r() * 0.14); bk.add(new THREE.Matrix4().compose(V(x + th / 2, y, (r() - 0.5) * 0.03), new THREE.Quaternion(), V(th, bh, 0.2 + r() * 0.06)), Math.floor(r() * 16), 0.82 + r() * 0.3); x += th + 0.004; } }
    const m = bk.build(); m.position.z = 0.02; B.add(m);
  }
  // ---------------------------------------------------------------- the bench where the study is demonstrated
  buildBench(sc) {
    const B = (this.bench = new THREE.Group()); sc.add(B);
    this.place(sc, 'WoodenTable_01', 0, 0, 0, 0, { size: [2.3, BENCH_Y, 1.16], tint: 0xc09a78, parent: B });
    // its dressing, kept to the edges so the experiment reads: a candlestick and an oil lamp at the back, books and a lens at the left, the instruments at the front right
    { const c = this.place(sc, 'wooden_candlestick', -0.92, BENCH_Y, -0.38, 0, { h: 0.3, parent: B }); this.flame(c, 0, 0.3, 0, { light: 0.6, dist: 1.8 }); }
    { this.place(sc, 'brass_candleholders', 0.86, BENCH_Y, -0.4, -0.25, { h: 0.36, parent: B }); const L = new THREE.PointLight(0xffc890, 0.5, 1.6, 2); L.position.set(0.86, BENCH_Y + 0.45, -0.35); B.add(L); }
    this.slot = new THREE.Group(); this.slot.position.set(0, BENCH_Y, -0.05); B.add(this.slot); { const rl = ruler(); rl.position.set(0, 0, 0.5); this.slot.add(rl); }
    this.flare = new THREE.PointLight(0xffd070, 0, 4, 1.4); this.flare.position.set(0, BENCH_Y + 0.6, 0.4); B.add(this.flare);
    this.benchHit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.2), new THREE.MeshBasicMaterial({ visible: false })); this.benchHit.position.set(0, BENCH_Y + 0.6, 0); B.add(this.benchHit);
  }
  // ---------------------------------------------------------------- the chalkboard: the study's law in chalk
  buildBoard(sc) {
    const g = (this.boardG = new THREE.Group()); g.position.set(0, 2.55, -4.42); sc.add(g); put(g, cbox(3.0, 1.7, 0.08, 0.02), M.walnut(), 0, 0, 0); put(g, cbox(2.9, 0.07, 0.16, 0.01), M.oak(), 0, -0.88, 0.06);
    this.boardC = document.createElement('canvas'); this.boardC.width = 560; this.boardC.height = 300; this.boardT = new THREE.CanvasTexture(this.boardC); this.boardT.colorSpace = THREE.SRGBColorSpace; this.boardT.magFilter = THREE.NearestFilter; this.boardT.minFilter = THREE.LinearMipmapLinearFilter; this.boardT.anisotropy = 8;
    const slate = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), new THREE.MeshStandardMaterial({ map: this.boardT, roughness: 1, emissive: 0xffffff, emissiveMap: this.boardT, emissiveIntensity: 0.04, envMapIntensity: 0.2 })); slate.position.z = 0.045; slate.userData.noInk = true; g.add(slate);
    for (let i = 0; i < 3; i++) put(g, cbox(0.07, 0.022, 0.022, 0.004), smat(null, { color: 0xf0f0e8, rough: 0.9 }), -1.2 + i * 0.12, -0.83, 0.1);
    // the experiment's own slate on an easel beside the bench, close enough to read (the same chalk as the wall board)
    const E = (this.easel = new THREE.Group()); E.position.set(1.5, 0, -0.32); E.rotation.y = -0.7; E.scale.setScalar(1.12); sc.add(E);
    for (const x of [-0.62, 0.62]) put(E, cbox(0.045, 2.05, 0.045, 0.01), M.walnut(), x, 1.0, 0.05, -0.12, 0, x > 0 ? -0.04 : 0.04); put(E, cbox(0.045, 1.9, 0.045, 0.01), M.walnut(), 0, 0.92, -0.32, 0.3, 0, 0);
    put(E, cbox(1.46, 0.05, 0.12, 0.01), M.walnut(), 0, 1.06, 0.12); put(E, cbox(1.42, 0.8, 0.05, 0.015), M.walnut(), 0, 1.5, 0.08, -0.12, 0, 0);
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.718), new THREE.MeshStandardMaterial({ map: this.boardT, roughness: 1, emissive: 0xffffff, emissiveMap: this.boardT, emissiveIntensity: 0.1, envMapIntensity: 0.2 })); sl.position.set(0, 1.5, 0.108); sl.rotation.x = -0.12; sl.userData.noInk = true; E.add(sl);
    const eL = new THREE.PointLight(0xffd8b0, 1.2, 2.2, 2); eL.position.set(0, 2.1, 0.7); E.add(eL);
  }
  chalk(o = {}) { // the board: the puzzle's law, the player's numbers plugged in, the target and the last result; or a reward being written
    const c = this.boardC, g = c.getContext('2d', { willReadFrequently: true }); const W = c.width, H = c.height; g.imageSmoothingEnabled = false;
    const hh = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
    if (!this._slate) { // the slate itself (painted once): broad clean value shapes, sideways smears of old erasures, a chalked frame line
      const vn = (x, y, s, seed) => { const X = x / s, Y = y / s, i = Math.floor(X), j = Math.floor(Y), sm = (t) => t * t * (3 - 2 * t), u = sm(X - i), v = sm(Y - j); const a = hh(i, j, seed), b = hh(i + 1, j, seed), cc = hh(i, j + 1, seed), d = hh(i + 1, j + 1, seed); return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v; };
      const SL = ['#141d1a', '#19241f', '#1d2a25', '#22302a', '#283731', '#2f3f38']; const img = g.createImageData(W, H); const D = new Uint32Array(img.data.buffer); const pk = (s) => { const n = parseInt(s.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; }; const SLP = SL.map(pk);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); const n = vn(x, y, 70, 5) * 0.65 + vn(x, y * 3, 40, 7) * 0.35; let t = 2.3 + (n - 0.5) * 2.2 - Math.max(0, 1 - e / 22) * 1.2; const f = t - Math.floor(t); let k = Math.floor(t); if (f > 0.42 && f < 0.58 && (x + y) % 2) k++; D[y * W + x] = SLP[Math.max(0, Math.min(5, k))]; }
      for (let i = 0; i < 260; i++) { const x = (hh(i, 1, 3) * W) | 0, y = (hh(i, 2, 3) * H) | 0; D[y * W + x] = SLP[5]; }
      for (let x = 10; x < W - 10; x++) { if (hh(x, 1, 2) > 0.15) { D[9 * W + x] = pk('#9fb0a6'); } if (hh(x, 2, 2) > 0.15) D[(H - 10) * W + x] = pk('#9fb0a6'); } for (let y = 10; y < H - 10; y++) { if (hh(1, y, 2) > 0.15) D[y * W + 9] = pk('#9fb0a6'); if (hh(2, y, 2) > 0.15) D[y * W + W - 10] = pk('#9fb0a6'); }
      g.putImageData(img, 0, 0); this._slate = g.getImageData(0, 0, W, H); this._slateBg = pk('#1d2a25'); }
    g.putImageData(this._slate, 0, 0);
    const knock = (x0, y0, w, h, rate = 0.1) => { x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); w = Math.min(W - x0, w | 0); h = Math.min(H - y0, h | 0); if (w < 1 || h < 1) return; const im = g.getImageData(x0, y0, w, h); const d = new Uint32Array(im.data.buffer); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = d[y * w + x]; if ((v & 255) > 120 && hh(x0 + x, y0 + y, 9) < rate) d[y * w + x] = this._slateBg; } g.putImageData(im, x0, y0); };
    const text = (str, x, y, f, k, col = '#eef2ec', align = 'center') => { if (!str) return 0; const w = drawPixelText(g, str, x, y, f, { color: col, k, align }); const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x; knock(Math.round(x0) - 2, y - 16 * k, w + 4, 20 * k, 0.1); return w; };
    const fit = (str, f, k, maxW) => { while (k > 1 && measure(str, f) * k > maxW) k--; return k; };
    if (o.write != null) { // a reward: the equation writes itself, then what it grants
      const n = Math.floor(o.eq.length * o.write); text(o.title, W / 2, 62, 'title', 2, '#f6f2d8'); const w = text(o.eq.slice(0, n), W / 2 - measure(o.eq, 'title') * 2 / 2, 140, 'title', 2, '#ffe8a0', 'left'); void w;
      if (o.write >= 1) { text(o.sub, W / 2, 200, 'head', fit(o.sub, 'head', 3, W - 40), '#eef2ec'); text(o.text, W / 2, 248, 'body', fit(o.text, 'body', 2, W - 40), '#b8ccbe'); }
      this.boardT.needsUpdate = true; return; }
    const Pz = this.sel, P = this.puzzle; if (!Pz || !P) { this.boardT.needsUpdate = true; return; }
    Pz.stars.forEach((on, i) => { const x = W - 96 + i * 30, y = 18; const col = on ? '#ffd860' : '#4a5a52'; const S = [[0, -10], [3, -3], [10, -3], [4, 2], [6, 10], [0, 5], [-6, 10], [-4, 2], [-10, -3], [-3, -3]]; g.fillStyle = col; g.beginPath(); S.forEach(([a, b], j) => (j ? g.lineTo(x + a, y + b + 10) : g.moveTo(x + a, y + b + 10))); g.closePath(); g.fill(); }); // this puzzle's stars
    if (!Pz.unlocked) { text('Locked', W / 2, 120, 'title', 2, '#c8d4c8'); text(`Discover ${Pz.needs}`, W / 2, 190, 'body', fit(`Discover ${Pz.needs}`, 'body', 3, W - 40), '#a8c0b0'); text('in a run to set it up', W / 2, 236, 'body', 3, '#a8c0b0'); this.boardT.needsUpdate = true; return; }
    const lines = P.board(); const [eq, ...rest] = lines; const tgt = rest.pop();
    { const k = fit(eq[0], 'title', 2, W - 140); text(eq[0], 22, 50, 'title', k, eq[1], 'left'); const w = measure(eq[0], 'title') * k; g.fillStyle = '#d8e4d8'; for (let x = 22; x < 22 + w; x++) if (hh(x, 3, 1) > 0.1) g.fillRect(x, 58, 1, 2); }
    let y = 104; for (const [s2, col] of rest) { text(s2, 26, y, 'body', fit(s2, 'body', 3, W - 44), col, 'left'); y += 40; }
    text(tgt[0], 26, y + 4, 'body', fit(tgt[0], 'body', 3, W - 44), tgt[1], 'left');
    const R = this.result; const st = this.running ? 'Running...' : R ? R.msg : `Goal: ${Pz.goal}`; g.fillStyle = '#2f3f38'; g.fillRect(14, H - 50, W - 28, 1); text(st, W / 2, H - 18, 'body', fit(st, 'body', 3, W - 40), this.running ? '#c8d4c8' : R ? (R.ok ? '#ffe08a' : '#ffb0a0') : '#a8c0b0');
    this.boardT.needsUpdate = true;
  }
  // ---------------------------------------------------------------- the trophy cabinet: one curio per claimed cosmetic study
  buildCabinet(sc) { // the trophy shelves right of the window: one curio per claimed cosmetic study, under a small lamp
    const C = (this.cabinet = new THREE.Group()); C.position.set(5.98, 0, -4.27); sc.add(C); const beamM = this.beamM;
    for (const y of [1.5, 2.08, 2.66]) { this.slab(C, beamM, 1.52, 0.05, 0.3, 0, y - 0.025, 0, { cast: true }); for (const x of [-0.66, 0.66]) put(C, cbox(0.04, 0.16, 0.24, 0.006), M.walnut(), x, y - 0.13, -0.02); }
    this.place(C, 'book_encyclopedia_set_01', -0.3, 2.66, 0, 0, { h: 0.22 }); this.place(C, 'brass_pot_01', 0.42, 2.66, 0, 0.4, { h: 0.18 });
    const L = new THREE.PointLight(0xffd8a0, 0.9, 1.8, 2); L.position.set(0, 2.4, 0.5); C.add(L); this.trophies = [];
    [...new Set(studyPerks().trophies)].forEach((k) => this.addTrophy(k, false));
  }
  addTrophy(kind, pop = true) {
    const i = this.trophies.length; if (i >= 8) return; const g = new THREE.Group(); const row = Math.floor(i / 4), col = i % 4; g.position.set(-0.54 + col * 0.36, 1.5 + row * 0.58, 0); this.cabinet.add(g);
    put(g, cbox(0.2, 0.05, 0.16, 0.01), M.marble(), 0, 0.025, 0); const gold = M.gold();
    if (kind === 'fall') { const a = makeApple({ s: 0.12 }); a.traverse((o) => { if (o.isMesh) o.material = gold; }); a.position.y = 0.16; g.add(a); }
    else if (kind === 'prism') { const t = extrude(shape([[0, 0.08], [-0.07, -0.04], [0.07, -0.04]]), 0.12, 0.005); t.rotateX(-Math.PI / 2); put(g, t, glassM(0xd8f0ff, 0.5), 0, 0.12, 0); }
    else if (kind === 'top') put(g, lathe([[0.0005, 0], [0.04, 0.04], [0.07, 0.08], [0.05, 0.11], [0.012, 0.13], [0.0005, 0.17]], 8), gold, 0, 0.05, 0);
    else if (kind === 'flask') put(g, lathe([[0.0005, 0], [0.06, 0.01], [0.07, 0.06], [0.03, 0.12], [0.025, 0.2], [0.0005, 0.2]], 8), glassM(0xc8ffe8, 0.5), 0, 0.05, 0);
    else put(g, new THREE.IcosahedronGeometry(0.07, 0), kind === 'pendulum' ? smat('silver', { metal: 0.95, rough: 0.2 }) : gold, 0, 0.13, 0);
    g.userData.spin = true; this.trophies.push(g); if (pop) { g.scale.setScalar(0.01); this.popT = { g, t: 0 }; }
  }
  // ---------------------------------------------------------------- the 2D UI: the experiment list, the star ladder, the bench controls
  buildUI() {
    const UI = this.UI;
    // the experiments, with their stars (or the discovery that unlocks them)
    const L = (this.listP = UI.panel({ w: 136, h: 270, anchor: 'top-left', mx: 8, my: 8, seed: 31, pad: 10 })); UI.show(L, false);
    UI.el('div', 'lf-title', 'Experiments', L.inner);
    { const h = UI.el('div', '', null, L.inner); Object.assign(h.style, { display: 'flex', alignItems: 'center', gap: UI.px(3) }); h.appendChild(UI.fit(icon('star'))); this.totalEl = UI.el('div', 'lf-num', '', h); UI.el('div', 'lf-body lf-soft', 'stars', h); }
    { const dv = UI.add(divider(116), L.inner); dv.style.margin = `${UI.px(1)} 0`; }
    const list = (this.listEl = UI.el('div', 'lf-list', null, L.inner)); Object.assign(list.style, { position: 'absolute', left: 0, right: 0, top: UI.px(40), bottom: 0 });
    this.rows = new Map(); for (const Pz of this.puzzles) this.rows.set(Pz.kind, this.row(Pz, list));
    // the star ladder: rungs of permanent rewards along a brass gauge
    const T = (this.trackP = UI.panel({ w: 318, h: 70, anchor: 'bottom-left', mx: 8, my: 8, seed: 41, pad: 9 })); UI.show(T, false); this.buildTrack();
    // the bench controls: brass sliders with live numbers, the goals, Run
    const Cp = (this.ctrlP = UI.panel({ w: 298, h: 90, anchor: 'bottom-right', mx: 8, my: 8, seed: 61, pad: 9 })); UI.show(Cp, false);
    const back = (this.backP = UI.panel({ w: 92, h: 34, anchor: 'top-right', mx: 8, my: 8, seed: 51, pad: 7, frame: 'thin' })); UI.show(back, false); UI.button('Return', () => this.leave(), { parent: back.inner, w: 76, sound: 'ui_back' });
    this.refreshTotals();
    setTimeout(() => { UI.show(L, true); setTimeout(() => { UI.show(T, true); UI.show(Cp, true); }, 200); setTimeout(() => UI.show(back, true), 360); audio.play('paper_rustle', { vol: 0.35 }); }, 650);
  }
  row(Pz, list) {
    const UI = this.UI; const r = UI.el('div', 'lf-row' + (Pz.unlocked ? '' : ' lf-dim'), null, list); Object.assign(r.style, { flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: `${UI.px(2)} ${UI.px(3)}` });
    const top = UI.el('div', '', null, r); Object.assign(top.style, { display: 'flex', alignItems: 'center', gap: UI.px(3) });
    const nm = UI.el('div', 'lf-body', Pz.name.replace(/^The /, ''), top); nm.style.color = Pz.unlocked ? '#2a160c' : '#6a4428'; Object.assign(nm.style, { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    const pips = UI.el('div', '', null, top); Object.assign(pips.style, { display: 'flex', gap: UI.px(1) }); r.pips = pips; this.paintPips(pips, Pz);
    const sub = UI.el('div', 'lf-body lf-soft', Pz.unlocked ? Pz.law : `Discover ${Pz.needs}`, r); Object.assign(sub.style, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    if (!Pz.unlocked) { sub.prepend(UI.fit(icon('lock'))); Object.assign(sub.style, { display: 'flex', alignItems: 'center', gap: UI.px(3) }); }
    UI.hoverSound(r, 'paper_rustle', 0.15); r.addEventListener('pointerdown', () => { if (this.sel?.kind !== Pz.kind) { audio.play('page_turn', { vol: 0.35 }); this.select(Pz); } }); return r;
  }
  paintPips(el, Pz, fresh = []) { el.innerHTML = ''; Pz.stars.forEach((on, i) => { const c = this.UI.fit(icon('star', { ramp: on ? undefined : DIM })); if (fresh.includes(i)) c.classList.add('lf-pop'); el.appendChild(c); }); }
  refreshTotals() { const n = starTotal(); this.totalEl.textContent = `${n} / ${PUZZLE_ORDER.length * 3}`; this.buildTrack(); }
  buildTrack() {
    const UI = this.UI, P = this.trackP; if (!P) return; P.inner.innerHTML = ''; const n = starTotal(), max = TRACK[TRACK.length - 1].at, L = labState(); const W = 298;
    const rail = UI.add(bar(W, n / max, { done: n >= max }), P.inner); Object.assign(rail.style, { position: 'absolute', left: 0, top: UI.px(13) });
    const ready = tiersReady(); const next = TRACK.find((t, i) => !L.tiers[i]);
    TRACK.forEach((Tr, i) => { const x = Math.round((Tr.at / max) * (W - 14)) - 3; const got = !!L.tiers[i], can = ready.includes(i);
      const node = UI.el('div', 'lf-node' + (got ? ' lf-got' : can ? ' lf-can lf-ready' : n < Tr.at ? ' lf-far' : ''), null, P.inner); Object.assign(node.style, { left: UI.px(x), top: 0, width: UI.px(16) });
      node.appendChild(UI.fit(icon(REWARD_ICON[Tr.reward.kind] || 'star', { accent: '#c8302c' }))); const num = UI.el('div', 'lf-mini', String(Tr.at), node); num.style.marginTop = UI.px(13); num.style.color = n >= Tr.at ? '#8a1a1c' : '#6a4428';
      node.addEventListener('pointerenter', () => { this.capEl.textContent = `${Tr.at} stars: ${Tr.name}${got ? '  (claimed)' : can ? '  - click to claim' : ''}`; audio.play('ui_hover', { vol: 0.2 }); });
      node.addEventListener('pointerleave', () => this.setCaption());
      if (can) node.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.claimTier(i); }); });
    this.capEl = UI.el('div', 'lf-body', '', P.inner); Object.assign(this.capEl.style, { position: 'absolute', left: 0, right: 0, top: UI.px(36), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }); this.setCaption();
  }
  setCaption() { if (!this.capEl) return; const n = starTotal(), L = labState(), ready = tiersReady(); const next = TRACK.find((t, i) => !L.tiers[i] && n < t.at);
    this.capEl.className = 'lf-body' + (ready.length ? ' lf-red' : ''); this.capEl.textContent = ready.length ? `${ready.length} reward${ready.length > 1 ? 's' : ''} ready: click the glowing rung` : next ? `Next at ${next.at} stars: ${next.name}` : 'Every rung of the ladder is yours'; }
  buildControls() {
    const UI = this.UI, Cp = this.ctrlP, Pz = this.sel, P = this.puzzle; if (!Cp) return; Cp.inner.innerHTML = ''; this.valEls = {};
    if (!Pz?.unlocked) { UI.el('div', 'lf-title', 'Locked', Cp.inner); const t = UI.el('div', 'lf-body lf-soft lf-wrap', `Discover ${Pz?.needs || 'it'} in a run (merge the cards in battle) to unlock this experiment.`, Cp.inner); t.style.whiteSpace = 'normal'; return; }
    for (const p of P.params) { const row = UI.el('div', '', null, Cp.inner); Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: UI.px(3), height: UI.px(16) });
      const lb = UI.el('div', 'lf-body', p.label, row); Object.assign(lb.style, { width: UI.px(70), whiteSpace: 'nowrap', overflow: 'hidden' });
      const nud = (d) => { const b = UI.button('', () => this.setParam(p, p.value + d * p.step), { parent: row, w: 14, sound: 'ui_click' }); Object.assign(b.style, { height: UI.px(14), padding: '0' }); b.appendChild(UI.fit(arrow(d))); return b; };
      nud(-1); const holder = UI.el('div', 'lf-slide', null, row); const draw = () => { holder.innerHTML = ''; holder.appendChild(UI.fit(slider(104, (p.value - p.min) / (p.max - p.min)))); }; draw(); p.redraw = draw;
      const at = (e) => { const c = holder.firstChild.getBoundingClientRect(); const u = Math.max(0, Math.min(1, (e.clientX - c.left) / c.width)); this.setParam(p, p.min + u * (p.max - p.min), true); };
      holder.addEventListener('pointerdown', (e) => { e.stopPropagation(); holder.setPointerCapture(e.pointerId); holder._drag = true; at(e); audio.play('lever', { vol: 0.15, rate: 1.6 }); });
      holder.addEventListener('pointermove', (e) => { if (holder._drag) at(e); }); holder.addEventListener('pointerup', () => (holder._drag = false));
      nud(1); const v = UI.el('div', 'lf-num', '', row); Object.assign(v.style, { flex: '1', textAlign: 'right', whiteSpace: 'nowrap' }); this.valEls[p.id] = v; }
    const foot = UI.el('div', '', null, Cp.inner); Object.assign(foot.style, { position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: UI.px(3) });
    const goals = UI.el('div', '', null, foot); Object.assign(goals.style, { display: 'flex', flexDirection: 'column', flex: '1', gap: 0 });
    const g1 = UI.el('div', '', null, goals); Object.assign(g1.style, { display: 'flex', alignItems: 'center', gap: UI.px(2) }); this.goalEls = [];
    STAR_NAMES.forEach((nm, i) => { const c = UI.fit(icon('star', { ramp: Pz.stars[i] ? undefined : DIM })); g1.appendChild(c); this.goalEls.push(c); UI.el('div', 'lf-body lf-soft', i === 2 ? `Par ${PAR}` : nm, g1).style.marginRight = UI.px(3); });
    this.runEl = UI.el('div', 'lf-body lf-soft', '', goals);
    UI.button('New', () => this.newTrial(), { parent: foot, w: 40, sound: 'page_turn' }); this.runBtn = UI.button('Run', () => this.run(), { parent: foot, w: 58, red: true, sound: 'lever' });
    this.refreshControls();
  }
  refreshControls() { const P = this.puzzle; if (!P || !this.valEls) return; for (const p of P.params) { const el = this.valEls[p.id]; if (el) el.textContent = `${p.value.toFixed(p.dp)} ${p.unit}`; }
    if (this.runEl) this.runEl.textContent = `Runs this trial: ${this.runs[this.sel.kind] || 0}`; this.runBtn?.classList.toggle('lf-off', !!this.running); }
  setParam(p, v, snap = true) { if (this.running) return; v = Math.max(p.min, Math.min(p.max, v)); if (snap) v = Math.round((v - p.min) / p.step) * p.step + p.min; v = +v.toFixed(6); if (v === p.value) return; p.value = v; this.puzzle.set(p.id, v); this.puzzle.showGhost(true); p.redraw?.(); this.refreshControls(); this.chalk(); this.result = null; if (Math.random() < 0.35) audio.play('pencil_scribble', { vol: 0.08, rate: 1.6 }); }
  // ---------------------------------------------------------------- the puzzle on the bench
  select(Pz) {
    this.sel = Pz; for (const [k, r] of this.rows || []) r.classList.toggle('lf-sel', !!Pz && k === Pz.kind); if (!Pz) return;
    if (this.puzzle) this.slot.remove(this.puzzle.group); const L = labState(); L.trials ||= {}; const seed = 1000 + PUZZLE_ORDER.indexOf(Pz.kind) * 7919 + (L.trials[Pz.kind] || 0) * 104729;
    this.puzzle = makePuzzle(Pz.kind, { seed }); this.puzzle.group.scale.setScalar(0.001); this.slot.add(this.puzzle.group); this.demoIn = 0; this.running = false; this.result = null; this.runs[Pz.kind] ||= 0;
    if (!Pz.unlocked) { this.puzzle.showGhost(false); this.puzzle.group.traverse((o) => { if (o.isMesh && o.material && !o.userData.noInk) { o.material = o.material.clone(); o.material.color?.multiplyScalar(0.45); } }); }
    this.buildControls(); this.chalk(); this.rows.get(Pz.kind)?.scrollIntoView({ block: 'nearest' });
    audio.play(({ pendulum: 'metal_clang', fall: 'apple_crunch', prism: 'glass_clink', top: 'spin_whoosh', cradle: 'wood_knock', flask: 'liquid_slosh', spark: 'electric_zap', orbit: 'whoosh_soft' })[Pz.kind] || 'ui_click', { vol: 0.16, delay: 0.25 });
  }
  cheat() { const A = this.puzzle?.answer?.() || {}; for (const p of this.puzzle.params) if (A[p.id] != null) this.setParam(p, A[p.id]); } // debug: set the textbook answer (snapped to the dials)
  newTrial() { if (this.running || !this.sel?.unlocked) return; const L = labState(); L.trials ||= {}; L.trials[this.sel.kind] = (L.trials[this.sel.kind] || 0) + 1; save.saveMeta(); this.runs[this.sel.kind] = 0; this.chalkDust(); this.select(this.sel); }
  run() {
    if (this.running || !this.sel?.unlocked || this.reveal) { audio.play('ui_error', { vol: 0.3 }); return; }
    this.running = true; this.result = null; this.runs[this.sel.kind] = (this.runs[this.sel.kind] || 0) + 1; this.puzzle.showGhost(false); this.puzzle.reset(); this.puzzle.run(); this.push.target = 0.15; this.refreshControls(); this.chalk();
  }
  finish(res) {
    this.running = false; this.result = res; this.push.target = 0; const k = this.sel.kind; const runs = this.runs[k];
    const fresh = res.ok ? awardStars(k, [true, res.bull, runs <= PAR]) : [];
    const Pz = this.puzzles.find((x) => x.kind === k); Pz.stars = (labState().stars[k] || [0, 0, 0]).slice(); this.paintPips(this.rows.get(k).pips, Pz, fresh);
    fresh.forEach((i, j) => { setTimeout(() => { const c = this.goalEls?.[i]; if (c) { const n = this.UI.fit(icon('star')); n.classList.add('lf-pop'); c.replaceWith(n); this.goalEls[i] = n; } audio.play('coin', { vol: 0.5, rate: 1 + j * 0.15 }); audio.play('magic_sparkle', { vol: 0.35 }); this.burst(this.puzzle.focus, 30); }, 350 + j * 380); });
    if (res.ok) { audio.play(res.bull ? 'sting_eureka' : 'chime_soft', { vol: 0.6 }); this.floatText(res.bull ? 'Bullseye!' : 'Solved!', res.bull ? 'gold' : 'silver'); this.burst(this.puzzle.focus, res.bull ? 90 : 45); if (fresh.length) setTimeout(() => this.refreshTotals(), 400 + fresh.length * 380); if (Pz.stars.every(Boolean) && fresh.length) setTimeout(() => { this.addTrophy(k); audio.play('pop', { vol: 0.5 }); }, 1600); }
    else { audio.play('ui_error', { vol: 0.25 }); this.floatText(res.msg, 'ivory', 0.06); }
    this.refreshControls(); this.chalk(); setTimeout(() => { if (!this.running && this.puzzle) { this.puzzle.reset(); this.puzzle.showGhost(true); } }, 2600);
  }
  floatText(str, style = 'gold', h = 0.13) { const T = cineText(str, { height: h, style, glow: style === 'gold' ? 0.15 : 0 }); const p = this.puzzle.group.localToWorld(this.puzzle.focus.clone()).add(V(0, 0.32, 0.25)); T.position.copy(p); T.scale.setScalar(0.01); this.scene.add(T); this.reveals.push({ g: T, t: 0, base: p.clone() }); }
  burst(at, n = 50) { const p = this.puzzle.group.localToWorld(at.clone()); const r = this.rnd; for (let i = 0; i < n; i++) { const d = V(r() * 2 - 1, r() * 1.4 - 0.1, r() * 2 - 1).normalize().multiplyScalar(0.4 + r() * 1.6); this.motes.spawn({ pos: [p.x, p.y, p.z], vel: [d.x, d.y + 0.5, d.z], drag: 2.4, grav: 0.6, life: 0.6 + r() * 1.0, seq: r() < 0.6 ? 'twinkle' : 'glint', fps: 8 + r() * 5, color: r() < 0.6 ? '#ffe8a0' : '#fff6e0', bright: 1.5, k: r() < 0.2 ? 2 : 1, fadeIn: 0.02 }); } }
  chalkDust() { const g = this.boardG; const r = this.rnd; for (let i = 0; i < 40; i++) { const p = g.localToWorld(V((r() - 0.5) * 2.6, (r() - 0.5) * 1.3, 0.1)); this.motes.spawn({ pos: [p.x, p.y, p.z], vel: [(r() - 0.5) * 0.2, -0.1 - r() * 0.2, 0.1 + r() * 0.2], drag: 1.2, grav: 0.3, life: 0.8 + r() * 0.8, sprite: 'dust', color: '#eef0ea', bright: 0.9, fadeIn: 0.02 }); } audio.play('pencil_scribble', { vol: 0.25 }); }
  // ---------------------------------------------------------------- claiming a rung: the equation writes itself, gears turn, a brass plaque drops, the reward appears
  claimTier(i) {
    if (this.reveal || this.running) return; const T = claimTier(i); if (!T) return; const eq = EUREKA[i % EUREKA.length];
    audio.play('pencil_scribble', { vol: 0.5 }); audio.play('clockwork', { vol: 0.6, delay: 0.5 }); audio.play('metal_clang', { vol: 0.5, delay: 1.25 }); audio.play('stamp', { vol: 0.5, delay: 1.3 }); audio.play('sting_reward', { delay: 1.7 }); audio.play('eureka', { vol: 0.6, delay: 1.8 }); audio.duckMusic?.(0.3, 4);
    const E = this.easel; const gears = [-0.82, 0.8].map((x, k) => { const g = new THREE.Mesh(gearGeo(k ? 0.13 : 0.18, k ? 10 : 14), M.brass()); g.position.set(x, 1.5 + (k ? 0.3 : -0.15), 0.12); g.rotation.x = -0.12; g.scale.setScalar(0.01); g.castShadow = true; E.add(g); return g; });
    const plaque = new THREE.Group(); put(plaque, cbox(1.4, 0.2, 0.04, 0.015), M.brass(), 0, 0, 0); const tx = cineText(T.name, { height: Math.min(0.075, 1.28 / (T.name.length * 0.85)), style: 'gold', glow: 0.1 }); tx.position.set(0, 0, 0.03); plaque.add(tx); plaque.position.set(0, 3.2, 0.2); E.add(plaque);
    const obj = rewardObject(T.reward); const at = this.slot.localToWorld(V(0, 0.55, 0.05)); obj.position.copy(at); obj.scale.setScalar(0.01); this.scene.add(obj);
    this.reveal = { t: 0, T, eq, gears, plaque, obj, at, done: false }; this.push.target = 0.2; this.UI.show(this.ctrlP, false);
    if (T.reward.kind === 'cosmetic') setTimeout(() => this.addTrophy(T.reward.trophy), 2400);
    this.buildTrack();
  }
  updateReveal(dt) {
    const R = this.reveal; if (!R) return; R.t += dt * (this.fastT || 1); const t = R.t;
    this.chalk({ write: Math.min(1, t / 1.3), eq: R.eq, title: 'Eureka', sub: R.T.name, text: tierText(R.T) }); if (t < 1.3 && Math.random() < dt * 30) { const p = this.boardG.localToWorld(V(-1.0 + (t / 1.3) * 2.0, 0.05, 0.1)); this.motes.spawn({ pos: [p.x, p.y, p.z], vel: [0, -0.15, 0.1], drag: 1, grav: 0.3, life: 0.7, sprite: 'dust', color: '#f2f2ea', bright: 0.9, fadeIn: 0.02 }); }
    R.gears.forEach((g, k) => { const s = ease5((t - 0.5) / 0.5) * (1 - ease5((t - 5.2) / 0.5)); g.scale.setScalar(Math.max(0.01, s)); g.rotation.z += dt * (k ? -1.9 : 1.35) * (t > 0.5 ? 1 : 0); });
    { const u = Math.max(0, t - 1.0), Y = 0.98; const y = u < 0.45 ? 3.2 - (3.2 - Y) * (u / 0.45) ** 2 : Y + Math.abs(Math.sin((u - 0.45) * 9)) * 0.08 * Math.exp(-(u - 0.45) * 5); R.plaque.position.y = t > 5.2 ? Y + (t - 5.2) * 5 : y; R.plaque.rotation.z = Math.sin(u * 7) * 0.03 * Math.exp(-u * 2); }
    { const s = ease5((t - 1.6) / 0.5) * (1 - ease5((t - 5.2) / 0.5)); R.obj.scale.setScalar(Math.max(0.01, s * (1 + Math.sin(Math.min(1, (t - 1.6) / 0.5) * Math.PI) * 0.25))); R.obj.rotation.y += dt * 1.6; R.obj.position.y = R.at.y + Math.sin(t * 2) * 0.03;
      if (t > 1.6 && !R.burst) { R.burst = true; const r = this.rnd; for (let i = 0; i < 120; i++) { const d = V(r() * 2 - 1, r() * 1.4 - 0.2, r() * 2 - 1).normalize().multiplyScalar(0.5 + r() * 2.0); this.motes.spawn({ pos: [R.at.x, R.at.y, R.at.z], vel: [d.x, d.y + 0.6, d.z], drag: 2.2, grav: 0.5, life: 0.8 + r() * 1.3, seq: r() < 0.6 ? 'twinkle' : 'glint', fps: 8 + r() * 5, color: r() < 0.6 ? '#ffe8a0' : '#fff6e0', bright: 1.7, k: r() < 0.2 ? 2 : 1, fadeIn: 0.02 }); } this.flareT = 1.2; } }
    if (t > 5.9) { for (const o of [...R.gears, R.plaque]) this.easel.remove(o); this.scene.remove(R.obj); this.reveal = null; this.push.target = 0; this.UI.show(this.ctrlP, true); this.chalk(); this.refreshTotals(); }
  }
  leave() { if (this.leaving) return; this.leaving = { t: 0 }; audio.play('transition_whoosh', { vol: 0.5 }); audio.play('steam_hiss', { vol: 0.3 }); for (const P of [this.listP, this.backP, this.trackP, this.ctrlP]) if (P) this.UI.show(P, false); }
  // ---------------------------------------------------------------- input: the bench answers clicks and drags
  rc() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  overBench() { return this.rc().intersectObject(this.benchHit, false).length > 0; }
  onMove() { const o = this.overBench(); if (o !== this._ob) { this._ob = o; this.engine.renderer.domElement.style.cursor = o ? 'pointer' : ''; } }
  onClick() { if (this.leaving) return true; if (this.overBench() && !this.running) { this.run(); return true; } }
  onKey(e) { const k = e?.key || e?.code || e; if (k === 'Escape' || k === 'Backspace') { this.leave(); return true; } if (k === ' ' || k === 'Space' || k === 'Enter') { this.run(); return true; }
    if (k === 'ArrowDown' || k === 'ArrowUp') { if (this.running) return true; const L = this.puzzles; const i = Math.max(0, Math.min(L.length - 1, L.indexOf(this.sel) + (k === 'ArrowDown' ? 1 : -1))); this.select(L[i]); return true; }
    if ((k === 'ArrowLeft' || k === 'ArrowRight') && this.puzzle) { const p = this.puzzle.params[0]; this.setParam(p, p.value + (k === 'ArrowRight' ? 1 : -1) * p.step); return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const cam = this.camera, nd = this.input.ndc;
    for (const L of this.lamps) { L.pl.intensity = L.base * (0.92 + Math.sin(t * 7 + L.ph) * 0.04 + Math.sin(t * 13 + L.ph * 2) * 0.03); L.L.rotation.z = Math.sin(t * 0.6 + L.ph) * 0.02; }
    for (const d of this.decor) d.update(dt, t); for (const c of this.candles || []) { const f = c.userData.flame; if (f) f.scale.set(1, 0.9 + Math.sin(t * 17 + c.position.x * 9) * 0.12 + Math.sin(t * 31) * 0.05, 1); if (c.userData.light) c.userData.light.intensity = c.userData.base * (1 + Math.sin(t * 13 + c.position.x * 5) * 0.08 + Math.sin(t * 29) * 0.04); }
    if (this.puzzle) { this.demoIn = Math.min(1, (this.demoIn || 0) + dt * 2.5); const sIn = ease5(this.demoIn); this.puzzle.group.scale.setScalar(Math.max(0.001, sIn)); this.puzzle.group.position.y = (1 - sIn) * 0.2; const res = this.puzzle.update(dt * (this.fastT || 1), t); if (res && this.running) this.finish(res); }
    this.updateReveal(dt);
    this.flareT = Math.max(0, (this.flareT || 0) - dt); this.flare.intensity = this.flareT * 8;
    for (const g of this.trophies) g.rotation.y += dt * 0.5; if (this.popT) { this.popT.t += dt; const u = Math.min(1, this.popT.t / 0.5); this.popT.g.scale.setScalar(Math.max(0.01, ease5(u) * (1 + Math.sin(u * Math.PI) * 0.3))); if (u >= 1) this.popT = null; }
    for (const R of this.reveals) { R.t += dt; const s = ease5(Math.min(1, (R.t - 0.2) / 0.6)) * (1 - ease5((R.t - 3.6) / 0.6)); R.g.scale.setScalar(Math.max(0.001, s)); R.g.position.copy(R.base).add(V(0, R.t * 0.05 + Math.sin(R.t * 1.5) * 0.02, 0)); R.g.quaternion.copy(cam.quaternion); const U = R.g.userData.U; if (U) { U.uSweep.value = -2.2 + (R.t % 1.6) * 2.8; U.uShine.value = 0.8; } }
    this.reveals = this.reveals.filter((R) => { if (R.t < 4.3) return true; this.scene.remove(R.g); return false; });
    // camera: in from the doorway through the steam, breathing with parallax; leans to the bench on a claim; back out to leave
    this.push.update(dt); const pk = Math.max(0, this.push.value);
    let pos = CAM.pos.clone().add(V(nd.x * 0.05 + Math.sin(t * 0.11) * 0.03, nd.y * 0.03 + Math.sin(t * 0.08) * 0.02, 0)), look = CAM.look.clone().add(V(nd.x * 0.05, nd.y * 0.03, 0)); // a gentle breathing parallax (the bench must stay readable)
    if (pk > 0) { const f = this.puzzle ? this.puzzle.group.localToWorld(this.puzzle.focus.clone()) : this.slot.localToWorld(V(0, 0.4, 0)); pos.lerp(f.clone().add(V(0.35, 0.5, 1.3)), pk * 0.45); look.lerp(f, pk * 0.4); }
    if (this.intro) { this.intro.t += dt; const u = ease5(this.intro.t / 2.2); pos = DOOR.pos.clone().lerp(pos, u); look = DOOR.look.clone().lerp(look, u); if (this.intro.t > 2.2) this.intro = null; cam.position.copy(pos); this.look.copy(look); }
    else if (this.leaving) { this.leaving.t += dt; const u = ease5(this.leaving.t / 1.0); cam.position.lerp(DOOR.pos, u * 0.5); this.look.lerp(DOOR.look, u * 0.4); if (this.leaving.t > 0.25 && Math.random() < dt * 40) { const r = this.rnd; const p = cam.localToWorld(V((r() - 0.5) * 2, (r() - 0.5) * 1.2, -1.5)); this.motes.spawn({ pos: [p.x, p.y, p.z], vel: [(r() - 0.5) * 0.3, 0.2, 0], wobble: 0.4, life: 1.2, sprite: 'dust', color: '#f4f0ea', bright: 0.9, fadeIn: 0.05 }); }
      if (this.leaving.t > 0.7 && !this.leaving.gone) { this.leaving.gone = true; this.game.toMenu({ from: 'studies', wipe: { style: 'cloud', color: 0xe8e0d0 } }); } }
    else { cam.position.lerp(pos, Math.min(1, dt * 3)); this.look.lerp(look, Math.min(1, dt * 3)); }
    cam.lookAt(this.look);
    // dust in the lamplight
    this.acc += dt * 8; const r = this.rnd; while (this.acc > 1) { this.acc--; const a = r() * 6.28, d = 0.5 + r() * 4; this.motes.spawn({ pos: [Math.cos(a) * d, 0.5 + r() * 3, Math.sin(a) * d - 1], vel: [(r() - 0.5) * 0.04, 0.02 + r() * 0.03, (r() - 0.5) * 0.04], wobble: 0.15, life: 4 + r() * 4, sprite: r() < 0.85 ? 'm1' : 'dust', color: r() < 0.8 ? '#ffd890' : '#ffe8c8', bright: 0.6 + r() * 0.5, twinkle: 1 + r() * 2, fadeIn: 0.4 }); }
    this.motes.px = Math.max(2, Math.round(this.engine.renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())).y / 320)); this.motes.update(dt, t, this.engine.renderer); this.updateUI(dt);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; this.UI?.dispose(); labDispose(); this._env?.dispose(); this.motes?.dispose(); super.dispose(); }
}
