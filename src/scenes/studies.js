// THE EXPERIMENT HALL (menu agent; the tower menu's STUDIES): a lamplit laboratory of natural philosophy. A long
// timbered room of dressed stone and lime plaster under dark beams, oak boards underfoot, tall leaded windows holding a
// cool blue evening; furnished with real CC0 Poly Haven pieces converted to crisp pixel art (scenes/labassets.js): a
// carved commode under the great slate chalkboard, a gothic cabinet, bookcases packed with books, a chest of drawers
// with an alembic and a microscope, a long-case clock, a mirror, brass lanterns on chains; and in the middle the
// WORKBENCH where the selected study is demonstrated live (scenes/studydemos.js), with candle and lamp light on it.
//   - Every combination or Law Isaac has discovered is a STUDY (game/studies.js). The detailed 2D folio on the left
//     (ui2d/scholar.js) lists them with their progress (uses toward the goal); the card top-right reads the selected
//     one: its recipe, its note, the reward, and the brass CLAIM plaque when it is complete.
//   - Selecting a study sets its experiment on the bench (drag it, click it: the pendulum swings, the apple falls, the
//     prism fans light into a rainbow, the top spins up...) and chalks its law on the board.
//   - CLAIM: a burst of gold light from the apparatus, the camera leans in, the reward's name rises in high-res cast
//     gold (ui3d/cinetext.js), a fanfare; trophies appear on the trophy shelves at once.
//   Esc / Return goes back up to the tower (the steam clears). Debug: ?scene=studies (&study=demo, to seed studies)
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { prop, lathe, cbox, extrude, shape } from '../models/lowprops.js';
import { makeApple } from '../models/orchard.js';
import { drawPixelText } from '../ui3d/craft.js';
import { cineText } from '../ui3d/cinetext.js';
import { Motes } from '../gfx/motes.js';
import { makeDemo, put, smat, M, glassM } from './studydemos.js';
import { wallChart, openBook, rug as labRug, Books } from './labprops.js';
import { preloadLab, labProp, labDispose } from './labassets.js';
import * as LP from '../models/libprops.js';
import { studyList, claimStudy, DEMO, REWARD_ICON } from '../game/studies.js';
import { save } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';
import { Scholar, icon, bar, divider } from '../ui2d/scholar.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const BENCH_Y = 0.94;
const CAM = { pos: V(-0.05, 1.9, 2.55), look: V(-0.78, 1.3, -0.5), fov: 44 };
const LAB_IDS = ['WoodenTable_01', 'vintage_cabinet_01', 'wooden_bucket_01', 'brass_candleholders', 'GothicCommode_01', 'GothicCabinet_01', 'wooden_bookshelf_worn', 'vintage_wooden_drawer_01', 'WoodenChair_01', 'wooden_stool_02', 'vintage_grandfather_clock_01', 'ornate_mirror_01', 'fancy_picture_frame_01', 'treasure_chest', 'Barrel_01', 'wicker_basket_01',
  'Lantern_01', 'wooden_candlestick', 'vintage_oil_lamp', 'mantel_clock_01', 'marble_bust_01',  'antique_ceramic_vase_01', 'vintage_microscope', 'book_encyclopedia_set_01', 'brass_pot_01', 'brass_vase_01', 'brass_goblets',
  'magnifying_glass_01', 'pocket_watch', 'seadogs_compass', 'food_apple_01', 'round_spectacles'];
const DOOR = { pos: V(1.6, 2.6, 7.6), look: V(-0.2, 1.6, 0) };

export class StudiesScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x0c0806); sc.fog = new THREE.Fog(0x140c08, 9, 22);
    if (new URLSearchParams(location.search).get('study') === 'demo') this.seedDemo();
    { const cq = new URLSearchParams(location.search).get('cam'); if (cq === 'wide') { CAM.pos.set(1.2, 2.5, 5.2); CAM.look.set(-1.0, 1.7, -2.5); CAM.fov = 58; } else if (cq && cq.includes(',')) { const n = cq.split(',').map(Number); CAM.pos.set(n[0], n[1], n[2]); CAM.look.set(n[3], n[4], n[5]); CAM.fov = n[6] || 40; } } // debug: ?cam=wide or ?cam=x,y,z,lx,ly,lz,fov
    this.camera = new THREE.PerspectiveCamera(CAM.fov, this.engine.aspect, 0.05, 80); this.camera.fov = CAM.fov; this.camera.position.copy(DOOR.pos); this.look = DOOR.look.clone(); this.camera.lookAt(this.look);
    this.rnd = mulberry32(9); this.motes = new Motes(900, { px: 2 }); sc.add(this.motes.points); this.acc = 0;
    await preloadLab(LAB_IDS); this.buildRoom(sc); this.buildBench(sc); this.buildBoard(sc); this.buildCabinet(sc); this.envMap(sc);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.14, 0.3, 0.97], ao: 1.0, exposure: 1.12, grade: { sat: 0.96, vib: 0.04, contrast: 1.06, vignette: 0.42, warmth: 0, lift: [0.006, 0.007, 0.012], gain: [1.0, 1.0, 0.98], toe: 0.05 }, ink: { fade: [10, 30], strength: 0.7 } }); // matte and natural: bloom only on the flames and the window glass
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['campfire']); audio.playMusic(audio.manifest?.music?.hall ? 'hall' : 'journal');
    this.UI = new Scholar(); this.studies = studyList(); this.buildUI(); this.select(this.studies[0] || null);
    this.intro = { t: 0 }; this.push = new Spring(0, 4, 0.8); this.reveals = []; this.debris = [];
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
    { const bk = new Books(); let y = 0; for (const [w, d, t, v, a] of [[0.3, 0.22, 0.05, 3, 0.1], [0.27, 0.2, 0.045, 9, -0.12], [0.24, 0.17, 0.04, 1, 0.25]]) { bk.add(new THREE.Matrix4().compose(V(0, y + t / 2, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, Math.PI / 2)), V(t, w, d)), v, 1); y += t; }
      const m = bk.build(); m.position.set(-0.8, BENCH_Y, 0.2); m.rotation.y = 0.3; B.add(m); }
    { const ob = openBook(2); ob.position.set(0.74, BENCH_Y, 0.3); ob.rotation.y = -0.35; B.add(ob); }
    this.place(sc, 'magnifying_glass_01', 0.66, BENCH_Y + 0.036, 0.3, 2.4, { h: 0.24, lie: true, parent: B });
    this.place(sc, 'pocket_watch', 0.98, BENCH_Y, 0.42, 0.6, { w: 0.07, parent: B }); this.place(sc, 'seadogs_compass', -0.52, BENCH_Y, 0.44, 0.3, { w: 0.12, parent: B });
    this.place(sc, 'food_apple_01', -0.36, BENCH_Y, 0.46, 0.3, { h: 0.08, parent: B }); this.place(sc, 'round_spectacles', 0.4, BENCH_Y, 0.47, -0.3, { w: 0.13, parent: B });
    this.slot = new THREE.Group(); this.slot.position.set(0, BENCH_Y, -0.05); B.add(this.slot);
    this.flare = new THREE.PointLight(0xffd070, 0, 4, 1.4); this.flare.position.set(0, BENCH_Y + 0.6, 0.4); B.add(this.flare);
    this.benchHit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.2), new THREE.MeshBasicMaterial({ visible: false })); this.benchHit.position.set(0, BENCH_Y + 0.6, 0); B.add(this.benchHit);
  }
  setDemo(kind) { if (this.demo?.kind === kind) return; if (this.demo) { this.slot.remove(this.demo.group); } this.demo = makeDemo(kind, { motes: this.motes }); this.demo.group.scale.setScalar(0.001); this.demoS = { fall: 1.45, pendulum: 1.1, orbit: 1.2 }[kind] || 1.3; this.slot.add(this.demo.group); this.demoIn = 0; }
  // ---------------------------------------------------------------- the chalkboard: the study's law in chalk
  buildBoard(sc) {
    const g = new THREE.Group(); g.position.set(0, 2.55, -4.42); sc.add(g); put(g, cbox(3.0, 1.7, 0.08, 0.02), M.walnut(), 0, 0, 0); put(g, cbox(2.9, 0.07, 0.16, 0.01), M.oak(), 0, -0.88, 0.06);
    this.boardC = document.createElement('canvas'); this.boardC.width = 560; this.boardC.height = 300; this.boardT = new THREE.CanvasTexture(this.boardC); this.boardT.colorSpace = THREE.SRGBColorSpace; this.boardT.magFilter = THREE.NearestFilter; this.boardT.minFilter = THREE.LinearMipmapLinearFilter; this.boardT.anisotropy = 8;
    const slate = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), new THREE.MeshStandardMaterial({ map: this.boardT, roughness: 1, emissive: 0xffffff, emissiveMap: this.boardT, emissiveIntensity: 0.04, envMapIntensity: 0.2 })); slate.position.z = 0.045; slate.userData.noInk = true; g.add(slate);
    for (let i = 0; i < 3; i++) put(g, cbox(0.07, 0.022, 0.022, 0.004), smat(null, { color: 0xf0f0e8, rough: 0.9 }), -1.2 + i * 0.12, -0.83, 0.1);
  }
  chalk(S) { // the study's law in chalk on slate: clean pixel art at one texel per art pixel, a chalk diagram of the experiment
    const c = this.boardC, g = c.getContext('2d', { willReadFrequently: true }); const W = c.width, H = c.height; g.imageSmoothingEnabled = false;
    const hh = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
    const vn = (x, y, s, seed) => { const X = x / s, Y = y / s, i = Math.floor(X), j = Math.floor(Y), sm = (t) => t * t * (3 - 2 * t), u = sm(X - i), v = sm(Y - j); const a = hh(i, j, seed), b = hh(i + 1, j, seed), cc = hh(i, j + 1, seed), d = hh(i + 1, j + 1, seed); return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v; };
    const SL = ['#141d1a', '#19241f', '#1d2a25', '#22302a', '#283731', '#2f3f38']; const img = g.createImageData(W, H); const D = new Uint32Array(img.data.buffer);
    const pk = (s) => { const n = parseInt(s.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; }; const SLP = SL.map(pk);
    const seed = S ? S.id.length * 7 + S.name.length : 3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); const n = vn(x, y, 70, seed) * 0.65 + vn(x, y * 3, 40, seed + 2) * 0.35; // old erasures smear sideways
      let t = 2.3 + (n - 0.5) * 2.2 - Math.max(0, 1 - e / 22) * 1.2; const f = t - Math.floor(t); let k = Math.floor(t); if (f > 0.42 && f < 0.58 && (x + y) % 2) k++; D[y * W + x] = SLP[Math.max(0, Math.min(5, k))]; }
    for (let i = 0; i < 260; i++) { const x = (hh(i, 1, seed) * W) | 0, y = (hh(i, 2, seed) * H) | 0; D[y * W + x] = SLP[5]; } // dust
    g.putImageData(img, 0, 0);
    const knock = (x0, y0, w, h, rate = 0.1, k = 1) => { const im = g.getImageData(x0, y0, w, h); const d = new Uint32Array(im.data.buffer); for (let y = 0; y < h; y += k) for (let x = 0; x < w; x += k) { const v = d[y * w + x]; if (((v & 255) > 120) && hh(x0 + x, y0 + y, 9) < rate) for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) if (y + j < h && x + q < w) d[(y + j) * w + x + q] = SLP[2]; } g.putImageData(im, x0, y0); };
    const text = (str, x, y, f, k, col = '#eef2ec') => { const w = drawPixelText(g, str, x, y, f, { color: col, k, align: 'center' }); knock(Math.max(0, Math.round(x - w / 2) - 2), Math.max(0, y - 16 * k), Math.min(W, w + 4), Math.min(H - Math.max(0, y - 16 * k), 20 * k), 0.12, k); return w; };
    const P = (x, y, col) => { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); };
    const line = (x0, y0, x1, y1, col, dash = 0) => { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let e = dx + dy, i = 0; for (;;) { if (!dash || (i++ % (dash * 2)) < dash) if (hh(x0, y0, 4) > 0.08) P(x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
    const ring = (cx, cy, r, col, a0 = 0, a1 = Math.PI * 2, dash = 0, sy = 1) => { const n = Math.max(12, Math.round(r * 6 * Math.abs(a1 - a0) / 6.28)); let px = null, py = null; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * sy); if (px != null && (!dash || (i % (dash * 2)) < dash)) line(px, py, x, y, col); px = x; py = y; } };
    const disc = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.5 && hh(cx + x, cy + y, 6) > 0.12) P(cx + x, cy + y, col); };
    const CH = '#e6ece4', DIM = '#9fb0a6', GOLD = '#f2dc96', ROSE = '#e8a8a0', SKY = '#a8d4e6';
    // a chalked frame line, inset, with corner ticks
    for (let x = 10; x < W - 10; x++) { if (hh(x, 1, 2) > 0.15) P(x, 9, DIM); if (hh(x, 2, 2) > 0.15) P(x, H - 10, DIM); } for (let y = 10; y < H - 10; y++) { if (hh(1, y, 2) > 0.15) P(9, y, DIM); if (hh(2, y, 2) > 0.15) P(W - 10, y, DIM); }
    if (!S) { text('Nothing studied yet', W / 2, 140, 'title', 2); text('merge cards in battle', W / 2, 200, 'body', 3, '#c8d4c8'); this.boardT.needsUpdate = true; return; }
    const D2 = DEMO[S.demo] || DEMO.orbit; const long = S.name.length > 17; text(S.name, W / 2, long ? 62 : 70, long ? 'head' : 'title', long ? 3 : 2, '#f6f2d8');
    text(S.recipe, W / 2, 112, 'body', S.recipe.length > 28 ? 2 : 3, '#c8e0d0');
    const ew = text(D2.eq, W / 2, 190, 'title', 2, GOLD); line(W / 2 - ew / 2 - 10, 206, W / 2 + ew / 2 + 10, 206, CH); line(W / 2 - ew / 2 - 6, 209, W / 2 + ew / 2 + 6, 209, DIM);
    if (!S.preview) { const n = Math.min(S.uses, S.goal); text(`${n} of ${S.goal}`, W / 2, 262, 'body', 3, S.done ? '#ffe08a' : '#a8c0b0'); // the uses as chalk tally marks, struck through in fives
      for (let i = 0; i < S.goal; i++) { const x = 40 + (i % 5) * 9 + Math.floor(i / 5) * 60, on = i < n; line(x, 232, x + 2, 262, on ? CH : '#3c4d46'); if (i % 5 === 4) line(x - 40, 252, x + 6, 240, on ? CH : '#3c4d46'); } }
    else text(D2.act, W / 2, 262, 'body', 2, '#a8c0b0');
    // the experiment, sketched in chalk at the right
    const X = 480, Y = 150; const k = S.demo;
    if (k === 'pendulum') { line(X - 34, Y - 60, X + 34, Y - 60, CH); line(X, Y - 60, X + 22, Y + 8, CH); disc(X + 23, Y + 12, 6, GOLD); ring(X, Y - 60, 72, DIM, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, 2); line(X, Y - 60, X, Y + 14, DIM, 3); }
    else if (k === 'fall') { disc(X, Y - 46, 9, ROSE); line(X, Y - 56, X + 3, Y - 62, CH); for (let i = 0; i < 4; i++) line(X, Y - 30 + i * 14, X, Y - 22 + i * 14, CH); line(X - 6, Y + 18, X, Y + 26, CH); line(X + 6, Y + 18, X, Y + 26, CH); line(X - 40, Y + 34, X + 40, Y + 34, DIM); }
    else if (k === 'prism') { line(X - 18, Y + 20, X + 18, Y + 20, CH); line(X - 18, Y + 20, X, Y - 14, CH); line(X + 18, Y + 20, X, Y - 14, CH); line(X - 60, Y + 10, X - 9, Y + 4, CH); for (const [dy, col] of [[-10, ROSE], [0, GOLD], [10, SKY]]) line(X + 9, Y + 4, X + 60, Y + 10 + dy * 2, col); }
    else if (k === 'top') { line(X - 20, Y - 10, X + 20, Y - 10, CH); line(X - 20, Y - 10, X, Y + 26, CH); line(X + 20, Y - 10, X, Y + 26, CH); line(X, Y - 10, X, Y - 26, CH); ring(X, Y - 10, 28, GOLD, -2.6, -0.4, 0, 0.35); line(X + 26, Y - 16, X + 20, Y - 20, GOLD); }
    else if (k === 'cradle') { line(X - 40, Y - 40, X + 40, Y - 40, CH); for (let i = 0; i < 5; i++) { const bx = X - 24 + i * 12; const sw = i === 0 ? -14 : 0; line(bx, Y - 40, bx + sw, Y + 6, DIM); ring(bx + sw, Y + 11, 5, CH); } }
    else if (k === 'flask') { line(X - 4, Y - 40, X - 4, Y - 10, CH); line(X + 4, Y - 40, X + 4, Y - 10, CH); line(X - 4, Y - 10, X - 26, Y + 26, CH); line(X + 4, Y - 10, X + 26, Y + 26, CH); line(X - 26, Y + 26, X + 26, Y + 26, CH); line(X - 16, Y + 10, X + 16, Y + 10, SKY); for (const [bx, by] of [[-6, 18], [5, 14], [0, 4]]) ring(X + bx, Y + by, 2, SKY); for (let i = 0; i < 3; i++) line(X - 10 + i * 10, Y + 36, X - 6 + i * 10, Y + 30, ROSE); }
    else if (k === 'spark') { ring(X - 34, Y, 8, CH); ring(X + 34, Y, 8, CH); let px = X - 26, py = Y; for (let i = 1; i <= 6; i++) { const nx = X - 26 + i * 52 / 6, ny = Y + (i % 2 ? -8 : 8) * (i < 6 ? 1 : 0); line(px, py, nx, ny, GOLD); px = nx; py = ny; } line(X - 34, Y + 8, X - 34, Y + 34, DIM); line(X + 34, Y + 8, X + 34, Y + 34, DIM); }
    else { disc(X, Y, 6, GOLD); ring(X, Y, 26, DIM, 0, Math.PI * 2, 2, 0.6); ring(X, Y, 50, CH, 0, Math.PI * 2, 0, 0.55); disc(X + 50, Y, 4, SKY); disc(X - 15, Y + 13, 3, ROSE); }
    this.boardT.needsUpdate = true;
  }
  // ---------------------------------------------------------------- the trophy cabinet: one curio per claimed cosmetic study
  buildCabinet(sc) { // the trophy shelves right of the window: one curio per claimed cosmetic study, under a small lamp
    const C = (this.cabinet = new THREE.Group()); C.position.set(5.98, 0, -4.27); sc.add(C); const beamM = this.beamM;
    for (const y of [1.5, 2.08, 2.66]) { this.slab(C, beamM, 1.52, 0.05, 0.3, 0, y - 0.025, 0, { cast: true }); for (const x of [-0.66, 0.66]) put(C, cbox(0.04, 0.16, 0.24, 0.006), M.walnut(), x, y - 0.13, -0.02); }
    this.place(C, 'book_encyclopedia_set_01', -0.3, 2.66, 0, 0, { h: 0.22 }); this.place(C, 'brass_pot_01', 0.42, 2.66, 0, 0.4, { h: 0.18 });
    const L = new THREE.PointLight(0xffd8a0, 0.9, 1.8, 2); L.position.set(0, 2.4, 0.5); C.add(L); this.trophies = [];
    const have = Object.values(save.meta.studies || {}).filter((s) => s.claimed && s.reward?.kind === 'cosmetic').map((s) => s.reward.trophy); have.forEach((k) => this.addTrophy(k, false));
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
  // ---------------------------------------------------------------- the 2D folio: the study list and the reading card
  buildUI() {
    const UI = this.UI; const L = (this.listP = UI.panel({ w: 228, h: 334, anchor: 'left', mx: 8, seed: 31, pad: 11 })); UI.show(L, false);
    const done = this.studies.filter((s) => s.claimed).length, ready = this.studies.filter((s) => s.done && !s.claimed).length;
    UI.el('div', 'lf-title lf-big', 'Studies', L.inner); this.headEl = UI.el('div', 'lf-body lf-soft', this.studies.length ? `${done} of ${this.studies.length} complete${ready ? `  -  ${ready} to claim` : ''}` : 'Nothing studied yet', L.inner); { const dv = UI.add(divider(206), L.inner); dv.style.margin = `${UI.px(2)} 0`; }
    const list = (this.listEl = UI.el('div', 'lf-list', null, L.inner)); Object.assign(list.style, { position: 'absolute', left: 0, right: 0, top: UI.px(58), bottom: 0 });
    if (!this.studies.length) { UI.el('div', 'lf-body lf-soft', 'Every combination or Law you discover in battle becomes a study here. Use it to complete it, then claim a lasting reward.', list).style.padding = UI.px(4);
      // until then, the bench can show what it will demonstrate: the eight experiments, as previews
      const NEED = { pendulum: 'Pendulum or Spring', fall: 'Gravity', prism: 'Lens or Prism', top: 'Rotation or Spin', cradle: 'Force, Mass or Motion', flask: 'Heat, Water or Pressure', spark: 'Spark or Magnet', orbit: 'Gravity, Inertia and Rotation' };
      for (const [k, D] of Object.entries(DEMO)) { const r = UI.el('div', 'lf-row', null, list); r.appendChild(UI.fit(icon('flask', { accent: '#3ab0a0' }))); const t = UI.el('div', '', null, r); UI.el('div', 'lf-title', D.name, t); UI.el('div', 'lf-body lf-soft', 'Needs ' + NEED[k], t);
        UI.hoverSound(r, 'paper_rustle', 0.15); r.addEventListener('pointerdown', () => { for (const x of list.querySelectorAll('.lf-sel')) x.classList.remove('lf-sel'); r.classList.add('lf-sel'); audio.play('page_turn', { vol: 0.35 }); this.setDemo(k); this.chalk({ id: k, name: D.name, recipe: 'Needs ' + NEED[k], comps: [], demo: k, uses: 0, goal: 0, done: false, preview: true }); }); } }
    this.rows = new Map(); for (const S of this.studies) this.rows.set(S.id, this.row(S, list));
    const back = (this.backP = UI.panel({ w: 92, h: 34, anchor: 'bottom-right', mx: 8, my: 8, seed: 51, pad: 7, frame: 'thin' })); UI.show(back, false); const b = UI.button('Return', () => this.leave(), { parent: back.inner, w: 76, sound: 'ui_back' }); void b;
    setTimeout(() => { UI.show(L, true); setTimeout(() => UI.show(back, true), 260); audio.play('paper_rustle', { vol: 0.35 }); }, 650);
  }
  row(S, list) {
    const UI = this.UI; const r = UI.el('div', 'lf-row' + (S.claimed ? ' lf-dim' : ''), null, list); Object.assign(r.style, { flexDirection: 'column', alignItems: 'stretch', gap: UI.px(2) });
    const top = UI.el('div', '', null, r); Object.assign(top.style, { display: 'flex', alignItems: 'center', gap: UI.px(4) }); top.appendChild(UI.fit(icon(S.law ? 'star' : S.special ? 'apple' : 'flask', { accent: S.law || S.special ? '#c8302c' : '#3ab0a0' })));
    const nm = UI.el('div', 'lf-title', S.name, top); Object.assign(nm.style, { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis' }); const n = UI.el('div', 'lf-num ' + (S.done ? 'lf-red' : 'lf-soft'), `${Math.min(S.uses, S.goal)}/${S.goal}`, top);
    const sub = UI.el('div', '', null, r); Object.assign(sub.style, { display: 'flex', alignItems: 'center', gap: UI.px(4) }); const b = UI.fit(bar(92, S.uses / S.goal, { done: S.done })); sub.appendChild(b); const rc = UI.el('div', 'lf-body lf-soft', S.claimed ? 'Claimed' : S.done ? 'Ready to claim' : S.recipe, sub); Object.assign(rc.style, { flex: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    if (S.done && !S.claimed) { r.classList.add('lf-ready'); rc.classList.remove('lf-soft'); rc.classList.add('lf-red'); }
    r.detail = UI.el('div', '', null, r); r.detail.style.display = 'none';
    UI.hoverSound(r, 'paper_rustle', 0.15); r.addEventListener('pointerdown', () => { if (this.sel !== S) { audio.play('page_turn', { vol: 0.35 }); this.select(S); } }); void n; return r;
  }
  select(S) {
    this.sel = S; for (const [id, r] of this.rows || []) { const on = !!S && id === S.id; r.classList.toggle('lf-sel', on); r.detail.style.display = on ? 'block' : 'none'; if (on) { r.detail.innerHTML = ''; this.read(S, r.detail); setTimeout(() => r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30); } } this.setDemo(S ? S.demo : 'fall'); this.chalk(S); if (!S) this.read(null, this.listEl); if (S) audio.play(({ pendulum: 'metal_clang', fall: 'apple_crunch', prism: 'glass_clink', top: 'spin_whoosh', cradle: 'metal_clang', flask: 'liquid_slosh', spark: 'electric_zap', orbit: 'clockwork' })[S.demo] || 'ui_click', { vol: 0.18, delay: 0.25 });
  }
  read(S, el) { // the selected study opens in place: its kind, note, reward and the claim plaque
    const UI = this.UI; if (!S) return;
    const D = DEMO[S.demo] || DEMO.orbit; el.style.paddingTop = UI.px(2); const k = UI.el('div', 'lf-body lf-red', (S.law ? 'Law of Nature' : S.special ? 'Named discovery' : 'Combination') + '  -  ' + S.recipe, el); void k;
    if (S.note) { const n = UI.el('div', 'lf-body lf-soft', '"' + S.note + '"', el); n.style.marginTop = UI.px(2); n.style.whiteSpace = 'normal'; }
    const rw = UI.el('div', '', null, el); Object.assign(rw.style, { display: 'flex', alignItems: 'center', gap: UI.px(4), marginTop: UI.px(3) }); rw.appendChild(UI.fit(icon(REWARD_ICON[S.reward.kind] || 'star'))); const rt = UI.el('div', 'lf-body lf-goldt', S.rewardText, rw); rt.style.whiteSpace = 'normal';
    const foot = UI.el('div', '', null, el); Object.assign(foot.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: UI.px(3), marginBottom: UI.px(2) }); UI.el('div', 'lf-body lf-soft', D.act, foot);
    if (S.claimed) UI.el('div', 'lf-title lf-red', 'Claimed', foot);
    else { const b = UI.button('Claim', () => this.claim(S), { parent: foot, w: 64, sound: 'coin' }); if (!S.done) { b.classList.add('lf-off'); b.title = ''; } else b.classList.add('lf-ready'); }
  }
  // ---------------------------------------------------------------- claim: gold light from the apparatus, the reward rises in cast gold
  claim(S) {
    if (!claimStudy(S)) return; audio.play('eureka', { vol: 0.8 }); audio.play('sting_reward', { delay: 0.45 }); audio.play('magic_shimmer', { vol: 0.6, delay: 0.1 }); audio.duckMusic?.(0.3, 3);
    this.engine.flash(0.32, 0xffe0a0, 0.8); this.push.target = 1; setTimeout(() => (this.push.target = 0), 2600); this.flareT = 1.4;
    const p = this.slot.localToWorld(V(0, 0.45, 0)); const r = this.rnd; for (let i = 0; i < 110; i++) { const d = V(r() * 2 - 1, r() * 1.4 - 0.2, r() * 2 - 1).normalize().multiplyScalar(0.5 + r() * 2.2); this.motes.spawn({ pos: [p.x, p.y, p.z], vel: [d.x, d.y + 0.6, d.z], drag: 2.2, grav: 0.5, life: 0.8 + r() * 1.3, seq: r() < 0.6 ? 'twinkle' : 'glint', fps: 8 + r() * 5, color: r() < 0.6 ? '#ffe8a0' : '#fff6e0', bright: 1.7, k: r() < 0.2 ? 2 : 1, fadeIn: 0.02 }); }
    const R = S.reward; const title = R.kind === 'start' ? 'A New Star' : R.kind === 'weight' ? 'Favoured Cards' : R.kind === 'gold' ? `+${R.gold} Gold` : (DEMO[R.trophy]?.trophy || 'A Trophy');
    const T = cineText(title, { height: 0.2, style: 'gold', glow: 0.25 }); T.position.copy(p).add(V(0, 0.35, 0.3)); T.scale.setScalar(0.01); this.scene.add(T); this.reveals.push({ g: T, t: 0, base: T.position.clone() });
    if (R.kind === 'cosmetic') setTimeout(() => { this.addTrophy(R.trophy); audio.play('pop', { vol: 0.5 }); }, 900);
    const row = this.rows.get(S.id); if (row) { const nr = this.row(S, this.listEl); this.listEl.replaceChild(nr, row); this.rows.set(S.id, nr); } this.sel = null; this.select(S); { const done = this.studies.filter((x) => x.claimed).length, ready = this.studies.filter((x) => x.done && !x.claimed).length; this.headEl.textContent = `${done} of ${this.studies.length} complete${ready ? `  -  ${ready} to claim` : ''}`; }
  }
  leave() { if (this.leaving) return; this.leaving = { t: 0 }; audio.play('transition_whoosh', { vol: 0.5 }); audio.play('steam_hiss', { vol: 0.3 }); for (const P of [this.listP, this.backP]) this.UI.show(P, false); }
  // ---------------------------------------------------------------- input: the bench answers clicks and drags
  rc() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  overBench() { return this.rc().intersectObject(this.benchHit, false).length > 0; }
  onMove() { const o = this.overBench(); if (o !== this._ob) { this._ob = o; this.engine.renderer.domElement.style.cursor = o ? 'grab' : ''; } }
  onClick() { if (this.leaving) return true; if (this.overBench()) { this.demo?.click?.(); return true; } }
  onDragStart(e) { this.dragX = e.x; this.dragY = e.y; this.dragging = this.overBench(); if (this.dragging) this.engine.renderer.domElement.style.cursor = 'grabbing'; return this.dragging; }
  onDrag(e) { if (!this.dragging || this.dragX == null) return; const dx = (e.x - this.dragX) / innerWidth, dy = (e.y - this.dragY) / innerHeight; this.dragX = e.x; this.dragY = e.y; this.demo?.drag?.(dx, dy); }
  onDragEnd() { if (this.dragging) this.demo?.release?.(); this.dragging = false; this.dragX = null; this.engine.renderer.domElement.style.cursor = this._ob ? 'grab' : ''; }
  onKey(e) { const k = e?.key || e?.code || e; if (k === 'Escape' || k === 'Backspace') { this.leave(); return true; } if (k === 'ArrowDown' || k === 'ArrowUp') { const L = this.studies; if (!L.length) return true; const i = Math.max(0, Math.min(L.length - 1, L.indexOf(this.sel) + (k === 'ArrowDown' ? 1 : -1))); this.select(L[i]); this.rows.get(L[i].id)?.scrollIntoView({ block: 'nearest' }); return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const cam = this.camera, nd = this.input.ndc;
    for (const L of this.lamps) { L.pl.intensity = L.base * (0.92 + Math.sin(t * 7 + L.ph) * 0.04 + Math.sin(t * 13 + L.ph * 2) * 0.03); L.L.rotation.z = Math.sin(t * 0.6 + L.ph) * 0.02; }
    for (const d of this.decor) d.update(dt, t); for (const c of this.candles || []) { const f = c.userData.flame; if (f) f.scale.set(1, 0.9 + Math.sin(t * 17 + c.position.x * 9) * 0.12 + Math.sin(t * 31) * 0.05, 1); if (c.userData.light) c.userData.light.intensity = c.userData.base * (1 + Math.sin(t * 13 + c.position.x * 5) * 0.08 + Math.sin(t * 29) * 0.04); }
    if (this.demo) { this.demoIn = Math.min(1, (this.demoIn || 0) + dt * 2.5); const s = ease5(this.demoIn); this.demo.group.scale.setScalar(Math.max(0.001, s * (this.demoS || 1))); this.demo.group.position.y = (1 - s) * 0.2; this.demo.update(dt, t); }
    this.flareT = Math.max(0, (this.flareT || 0) - dt); this.flare.intensity = this.flareT * 8;
    for (const g of this.trophies) g.rotation.y += dt * 0.5; if (this.popT) { this.popT.t += dt; const u = Math.min(1, this.popT.t / 0.5); this.popT.g.scale.setScalar(Math.max(0.01, ease5(u) * (1 + Math.sin(u * Math.PI) * 0.3))); if (u >= 1) this.popT = null; }
    for (const R of this.reveals) { R.t += dt; const s = ease5(Math.min(1, (R.t - 0.2) / 0.6)) * (1 - ease5((R.t - 3.6) / 0.6)); R.g.scale.setScalar(Math.max(0.001, s)); R.g.position.copy(R.base).add(V(0, R.t * 0.05 + Math.sin(R.t * 1.5) * 0.02, 0)); R.g.quaternion.copy(cam.quaternion); const U = R.g.userData.U; if (U) { U.uSweep.value = -2.2 + (R.t % 1.6) * 2.8; U.uShine.value = 0.8; } }
    this.reveals = this.reveals.filter((R) => { if (R.t < 4.3) return true; this.scene.remove(R.g); return false; });
    // camera: in from the doorway through the steam, breathing with parallax; leans to the bench on a claim; back out to leave
    this.push.update(dt); const pk = Math.max(0, this.push.value);
    let pos = CAM.pos.clone().add(V(nd.x * 0.18 + Math.sin(t * 0.11) * 0.05, nd.y * 0.1 + Math.sin(t * 0.08) * 0.03, 0)), look = CAM.look.clone().add(V(nd.x * 0.25, nd.y * 0.12, 0));
    if (pk > 0) { const f = this.slot.localToWorld(V(0, 0.4, 0)); pos.lerp(f.clone().add(V(0.5, 0.45, 1.4)), pk * 0.45); look.lerp(f, pk * 0.5); }
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
