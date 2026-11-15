// THE EXPERIMENT HALL (menu agent; the tower menu's STUDIES): a warm, lamplit laboratory of natural philosophy. A long
// timbered room of stone and plaster under dark beams: tall leaded windows holding the dusk, a great slate chalkboard,
// shelves of glassware and books, a trophy cabinet, an orrery, a globe and a telescope, brass lanterns hanging on
// chains, and in the middle the oak WORKBENCH where the selected study is demonstrated live (scenes/studydemos.js).
//   - Every combination or Law Isaac has discovered is a STUDY (game/studies.js). The detailed 2D folio on the left
//     (ui2d/scholar.js) lists them with their progress (uses toward the goal); the card top-right reads the selected
//     one: its recipe, its note, the reward, and the brass CLAIM plaque when it is complete.
//   - Selecting a study sets its experiment on the bench (drag it, click it: the pendulum swings, the apple falls, the
//     prism fans light into a rainbow, the top spins up...) and chalks its law on the board.
//   - CLAIM: a burst of gold light from the apparatus, the camera leans in, the reward's name rises in high-res cast
//     gold (ui3d/cinetext.js), a fanfare; trophies appear in the cabinet at once.
//   Esc / Return goes back up to the tower (the steam clears). Debug: ?scene=studies (&study=demo, to seed studies)
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { Kit } from '../models/village.js';
import { prop, lathe, cbox, extrude, shape } from '../models/lowprops.js';
import { makeApple } from '../models/orchard.js';
import { drawPixelText } from '../ui3d/craft.js';
import { cineText } from '../ui3d/cinetext.js';
import { Motes } from '../gfx/motes.js';
import { makeDemo, put, smat, M, glassM } from './studydemos.js';
import { bookcase, skull, specimenJar, dripCandle, wallChart, cobweb, openBook, hollowBook, lectern, rug as labRug, plankMat, Books } from './labprops.js';
import { createBookworm } from '../models/bookworm.js';
import * as LP from '../models/libprops.js';
import { studyList, claimStudy, DEMO, REWARD_ICON } from '../game/studies.js';
import { save } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';
import { Scholar, icon, bar } from '../ui2d/scholar.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const BENCH_Y = 0.94;
const CAM = { pos: V(-0.05, 1.9, 2.55), look: V(-0.78, 1.3, -0.5), fov: 44 };
const DOOR = { pos: V(1.6, 2.6, 7.6), look: V(-0.2, 1.6, 0) };

export class StudiesScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x0c0806); sc.fog = new THREE.Fog(0x140c08, 9, 22);
    if (new URLSearchParams(location.search).get('study') === 'demo') this.seedDemo();
    { const cq = new URLSearchParams(location.search).get('cam'); if (cq === 'wide') { CAM.pos.set(1.2, 2.5, 5.2); CAM.look.set(-1.0, 1.7, -2.5); CAM.fov = 58; } else if (cq && cq.includes(',')) { const n = cq.split(',').map(Number); CAM.pos.set(n[0], n[1], n[2]); CAM.look.set(n[3], n[4], n[5]); CAM.fov = n[6] || 40; } } // debug: ?cam=wide or ?cam=x,y,z,lx,ly,lz,fov
    this.camera = new THREE.PerspectiveCamera(CAM.fov, this.engine.aspect, 0.05, 80); this.camera.fov = CAM.fov; this.camera.position.copy(DOOR.pos); this.look = DOOR.look.clone(); this.camera.lookAt(this.look);
    this.rnd = mulberry32(9); this.motes = new Motes(900, { px: 2 }); sc.add(this.motes.points); this.acc = 0;
    this.buildRoom(sc); this.buildBench(sc); this.buildBoard(sc); this.buildCabinet(sc); this.buildWorms(sc); this.envMap(sc);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.6, 0.5, 0.82], ao: 0.9, exposure: 1.0, grade: { sat: 1.04, vib: 0.2, contrast: 1.08, vignette: 0.5, warmth: 0.02, lift: [0.008, 0.008, 0.016], gain: [1.02, 1.0, 0.97], toe: 0.04 }, ink: { fade: [10, 30], strength: 0.7 } });
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
      glow(new THREE.Color(3.2, 2.0, 0.9), 4, 2, V(0, 4, 0), 0); glow(new THREE.Color(0.4, 0.5, 1.0), 6, 4, V(0, 2, -6), 0); glow(new THREE.Color(1.6, 0.9, 0.4), 8, 2, V(0, -2, 0), 0); glow(new THREE.Color(0.9, 0.55, 0.3), 2, 6, V(6, 2, 0), -Math.PI / 2);
      this._env = pm.fromScene(es, 0.04, 0.1, 50); sc.environment = this._env.texture; sc.environmentIntensity = 0.55; pm.dispose(); } catch (e) { console.warn('env map', e); } }
  // ---------------------------------------------------------------- the room
  buildRoom(sc) {
    const K = new Kit(); const W = 7, D = 4.6, H = 4.4; const r = this.rnd;
    K.add('stone', new THREE.BoxGeometry(W * 2 + 1, 0.3, D + 8), V(0, -0.15, 2)); // flagstone floor
    K.add('plaster', new THREE.BoxGeometry(W * 2 + 1, H, 0.3), V(0, H / 2, -D)); for (const s of [-1, 1]) K.add('plaster', new THREE.BoxGeometry(0.3, H, D + 8), V(s * W, H / 2, 2));
    K.add('stone', new THREE.BoxGeometry(W * 2 + 1, 0.9, 0.36), V(0, 0.45, -D + 0.02)); for (const s of [-1, 1]) K.add('stone', new THREE.BoxGeometry(0.36, 0.9, D + 8), V(s * (W - 0.02), 0.45, 2)); // stone dado
    for (let x = -W + 0.6; x <= W - 0.6; x += 2.1) { if (Math.abs(x) > 1.7) K.add('woodDark', new THREE.BoxGeometry(0.26, H, 0.26), V(x, H / 2, -D + 0.2)); K.add('woodDark', new THREE.BoxGeometry(0.3, 0.3, D + 7), V(x, H - 0.1, 1.5)); } // posts and ceiling beams
    K.add('woodDark', new THREE.BoxGeometry(W * 2, 0.24, 0.3), V(0, H - 0.6, -D + 0.25)); K.add('woodRaw', new THREE.BoxGeometry(W * 2 + 1, 0.1, D + 8), V(0, H + 0.05, 2)); // wall plate, ceiling boards
    for (let x = -W + 0.6; x < W; x += 0.7) K.add('woodDark', new THREE.BoxGeometry(0.12, 0.14, D + 7), V(x, H - 0.05, 1.5));
    K.build(sc, { uvScale: { stone: 0.8, plaster: 0.35, woodDark: 0.9, woodRaw: 0.9 } });
    // tall leaded windows full of dusk on the back wall, either side of the board
    const winM = new THREE.ShaderMaterial({ uniforms: {}, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vUv; void main(){ vec3 a = vec3(0.95, 0.48, 0.22), b = vec3(0.32, 0.16, 0.34), c = vec3(0.07, 0.07, 0.2); vec3 col = mix(a, b, smoothstep(0.0, 0.5, vUv.y)); col = mix(col, c, smoothstep(0.5, 1.0, vUv.y)); vec2 p = vUv * vec2(4.0, 9.0); float lead = step(0.92, fract(p.x)) + step(0.94, fract(p.y + floor(p.x) * 0.5)); col *= 1.0 - min(1.0, lead) * 0.85; gl_FragColor = vec4(col * 1.3, 1.0); }' });
    for (const x of [-4.4, 4.4]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), winM); g.position.set(x, 2.45, -D + 0.16); g.userData.noInk = true; g.userData.noAO = true; sc.add(g);
      const fr = new THREE.Group(); fr.position.set(x, 2.45, -D + 0.2); sc.add(fr); for (const [w, h, px, py] of [[1.5, 0.12, 0, 1.36], [1.5, 0.16, 0, -1.36], [0.12, 2.8, -0.7, 0], [0.12, 2.8, 0.7, 0], [0.06, 2.6, 0, 0]]) put(fr, cbox(w, h, 0.14, 0.02), M.walnut(), px, py, 0);
      const arch = put(fr, extrude(shape(Array.from({ length: 11 }, (_, k) => { const t = (k / 10) * Math.PI; return [Math.cos(t) * 0.72, 1.36 + Math.sin(t) * 0.45]; })), 0.12, 0.02), M.walnut()); void arch; }
    // the dusk through the windows
    const dusk = new THREE.DirectionalLight(0x9ab4ff, 1.15); dusk.position.set(-3, 6, -10); sc.add(dusk); const dusk2 = new THREE.DirectionalLight(0x7a90e0, 0.55); dusk2.position.set(5, 4, -8); sc.add(dusk2); sc.add(new THREE.HemisphereLight(0x6a78a8, 0x2a1e16, 0.55)); // cool dusk from the windows, a neutral sky fill
    // hanging brass lanterns on chains: the warm key light
    this.lamps = []; for (const [x, z, k] of [[-0.4, 0.2, 1], [-3.4, -1.6, 0], [3.0, -1.4, 0], [-1.6, 2.4, 0]]) { const L = prop('lantern', { h: 0.42 }); L.position.set(x, H - 1.6, z); sc.add(L); put(sc, cbox(0.02, 1.25, 0.02, 0.004), M.iron(), x, H - 0.6, z);
      const pl = new THREE.PointLight(0xffd6a8, k ? 8 : 4.5, k ? 9 : 7, 1.5); pl.position.set(x, H - 1.75, z); if (k) { pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); pl.shadow.bias = -0.002; } sc.add(pl); this.lamps.push({ pl, base: pl.intensity, ph: r() * 10, L }); }
    // walls of learning: shelves of books and glassware, a back counter, the globe, the telescope, a cauldron, a rug
    this.cases = []; for (const [x, z, ry, w, h, n] of [[-2.6, -4.22, 0, 1.9, 3.5, 7], [-6.62, -2.4, Math.PI / 2, 2.0, 3.4, 7], [-6.62, 0.2, Math.PI / 2, 2.0, 3.4, 7], [6.62, -1.2, -Math.PI / 2, 2.0, 3.4, 7], [-4.9, -4.22, 0, 1.0, 3.0, 6]]) { const C = bookcase(w, h, n, Math.round(x * 13 + z * 7)); C.group.position.set(x, 0, z); C.group.rotation.y = ry; sc.add(C.group); this.cases.push(C); }
    { const L = LP.ladder(3.2); L.position.set(-2.05, 0, -3.3); L.rotation.x = -(Math.PI / 2 + 0.24); sc.add(L); L.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); this.ladder = L; put(sc, cbox(1.9, 0.03, 0.03, 0.006), M.brass(), -2.6, 3.18, -3.98); }
    // a low case of books and jars under the chalkboard, wall shelves of curios over the counter, charts and cobwebs
    { const C = bookcase(2.4, 0.95, 2, 91, { curios: true }); C.group.position.set(0, 0, -4.22); sc.add(C.group); this.cases.push(C); }
    for (const [y, n] of [[1.75, 0], [2.35, 1]]) { const sh = new THREE.Group(); sh.position.set(2.2, y, -4.3); sc.add(sh); put(sh, cbox(2.6, 0.04, 0.3, 0.008), M.oak(), 0, 0, 0); for (const x of [-1.1, 1.1]) put(sh, cbox(0.04, 0.16, 0.26, 0.006), M.walnut(), x, -0.1, 0);
      const items = n ? [skull(1), specimenJar(1, 0.24), dripCandle(0.14), specimenJar(2, 0.2)] : [specimenJar(0, 0.26), dripCandle(0.12), skull(0.85), specimenJar(1, 0.22)]; items.forEach((o, i) => { o.position.set(-0.9 + i * 0.58, 0.02, 0.02); o.rotation.y = (i - 1.5) * 0.3; sh.add(o); });
      const bk = new Books(); for (let i = 0; i < 6; i++) bk.add(new THREE.Matrix4().compose(new THREE.Vector3(-0.2 + i * 0.045 + (n ? 0.62 : -0.6), 0.02, 0), new THREE.Quaternion(), new THREE.Vector3(0.04, 0.2 + (i % 3) * 0.03, 0.2)), (i * 5 + n * 3) % 16, 0.95); sh.add(bk.build()); }
    for (const [kind, x, y, z, ry, w, h] of [['stars', -3.55, 2.6, -4.36, 0, 0.8, 0.62], ['worm', 3.15, 3.35, -4.36, 0, 0.9, 0.55], ['orbits', 1.35, 3.35, -4.36, 0, 0.75, 0.55], ['prism', -6.82, 2.2, 1.6, Math.PI / 2, 0.8, 0.6], ['stars', 6.82, 2.4, 1.0, -Math.PI / 2, 0.9, 0.7]]) { const c = wallChart(kind, w, h); c.position.set(x, y, z); c.rotation.y = ry; sc.add(c); }
    for (const [x, z, ry] of [[-6.85, -4.45, 0], [6.85, -4.45, Math.PI / 2], [-1.6, -4.45, 0]]) { const w = cobweb(0.9); w.position.set(x, 4.3, z); w.rotation.y = ry; sc.add(w); }
    { const lec = lectern(); lec.position.set(1.75, 0, -1.6); lec.rotation.y = -0.55; sc.add(lec); this.lectern = lec; }
    { const c = dripCandle(0.26, { light: true }); c.position.set(3.45, 0.97, -3.85); sc.add(c); this.candles = [c]; }
    const counter = new THREE.Group(); counter.position.set(2.2, 0, -3.9); sc.add(counter); put(counter, cbox(3.2, 0.1, 0.8, 0.02), M.oak(), 0, 0.92, 0); for (const x of [-1.5, 1.5]) put(counter, cbox(0.12, 0.9, 0.7, 0.02), M.walnut(), x, 0.45, 0); put(counter, cbox(3.1, 0.06, 0.7, 0.02), M.walnut(), 0, 0.3, 0);
    const bottles = ['green', 'blue', 'wine', 'green', 'amber', 'blue']; bottles.forEach((c, i) => { const b = prop('bottle', { h: 0.24 + (i % 3) * 0.08, color: c }); b.position.set(-1.3 + i * 0.32, 0.97, (i % 2) * 0.18 - 0.1); counter.add(b); });
    { const a = makeDemo('flask', { motes: this.motes }); a.group.scale.setScalar(0.8); a.group.position.set(0.95, 0.97, 0); counter.add(a.group); this.decor = [a]; }
    for (const [p, x, y, z, s] of [['globe', -5.6, 0, 2.2, 1.6], ['cauldron', 5.4, 0, 2.4, 1.2], ['bookStack', 3.0, 0.97, -3.7, 1], ['scroll', 1.4, 0.98, -3.75, 1], ['bookStack', -1.2, 0, -3.0, 1.3], ['basket', 1.5, 0, -2.9, 1.2]]) { const o = prop(p); o.position.set(x, y, z); o.scale.setScalar(s); sc.add(o); }
    { const g = LP.globe(); g.position.set(-5.4, 0, -1.0); g.scale.setScalar(1.1); sc.add(g); const a = LP.armillary(); a.position.set(1.0, 0.97, -3.75); a.scale.setScalar(0.7); sc.add(a); }
    const tel = prop('telescope', { L: 1.6 }); tel.position.set(-4.4, 0, -2.6); tel.rotation.y = 0.6; sc.add(tel);
    const rug = labRug(3.8, 2.6); rug.position.set(0, 0.006, 0.3); sc.add(rug);
    // a standing orrery by the window
    { const o = makeDemo('orbit'); o.group.position.set(4.6, 0.95, -2.4); o.group.scale.setScalar(1.3); sc.add(o.group); const st = new THREE.Group(); st.position.set(4.6, 0, -2.4); sc.add(st); put(st, cbox(0.7, 0.92, 0.7, 0.04), M.walnut(), 0, 0.46, 0); this.decor.push(o); }
  }
  // ---------------------------------------------------------------- the BOOKWORMS who live here (models/bookworm.js): robed earthworm scholars
  buildWorms(sc) {
    this.worms = []; const W = (o, s = 1) => { const w = createBookworm(o); w.root.scale.setScalar(s); sc.add(w.root); this.worms.push(w); return w; };
    sc.updateMatrixWorld(true);
    // one inches along a shelf of the tall case behind the bench, one along the curio shelf over the counter
    { const C = this.cases[0]; const sh = C.shelves[3]; const w = W({ seed: 3, scarf: '#d8d0b8' }, 1.25); w.setRoute({ a: C.group.localToWorld(V(sh.x0 + 0.2, sh.y, 0.17)), b: C.group.localToWorld(V(sh.x1 - 0.2, sh.y, 0.17)), up: V(0, 1, 0) }); w.st.speed = 0.04; }
    { const w = W({ seed: 8, robe: '#3a4a6a', monocle: true }, 1.2); w.setRoute({ a: V(1.05, 2.37, -4.2), b: V(1.95, 2.37, -4.2), up: V(0, 1, 0) }); w.st.speed = 0.035; }
    // one climbs the library ladder
    { const L = this.ladder; const q = L.getWorldQuaternion(new THREE.Quaternion()); const up = V(0, -1, 0).applyQuaternion(q); const w = W({ seed: 5, robe: '#5a2a2a' }, 1.3); w.setRoute({ a: L.localToWorld(V(0, -0.08, 0.6)), b: L.localToWorld(V(0, -0.08, 2.4)), up }); w.st.speed = 0.05; }
    // one reads at the lectern, turning its pages with its tail
    { const T = this.lectern.userData.top; const w = W({ seed: 1, robe: '#2a4a3a', monocle: true, book: '#6a2a24' }, 1.3); T.add(w.root); w.root.position.set(0.1, 0.03, 0.1); w.root.rotation.y = Math.PI * 0.85; w.setMode('read'); }
    // one carries a book along the front of the bench; one sleeps coiled on the low case under the board
    { const w = W({ seed: 4, scarf: '#e8d8a8', book: '#7a4a1a' }, 1.0); w.setRoute({ a: V(-0.2, BENCH_Y + 0.004, 0.47), b: V(0.3, BENCH_Y + 0.004, 0.47), up: V(0, 1, 0) }); w.setMode('carry'); w.st.speed = 0.03; }
    { const w = W({ seed: 6, scarf: '#7a3a3a' }, 1.2); w.setMode('sleep'); w.root.position.set(0.62, 0.99, -4.12); w.root.rotation.y = 0.4; }
    // and one peeks out of the worm-holed book on the bench, inching out, looking round, ducking back in
    { const w = W({ seed: 9, scarf: '#e8c060' }, 1.0); w.setMode('crawl'); this.hollow.updateMatrixWorld(true); this.peek = { w, base: this.hollow.localToWorld(V(0.03, 0.02, 0.02)), t: 0 }; }
  }
  updateWorms(dt, t) {
    for (const w of this.worms) w.update(dt, t);
    const K = this.peek; if (K) { K.t += dt; const ph = (K.t % 9) / 9; const out = ph < 0.15 ? ph / 0.15 : ph < 0.7 ? 1 : ph < 0.82 ? 1 - (ph - 0.7) / 0.12 : 0; const e = out * out * (3 - 2 * out);
      K.w.root.position.copy(K.base).add(V(0, -0.16 + e * 0.3, 0)); K.w.root.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2 + Math.sin(K.t * 0.9) * 0.25 * e, Math.sin(K.t * 0.6) * 0.8 * e, 0, 'YXZ')); K.w.root.visible = e > 0.02; }
  }
  // ---------------------------------------------------------------- the bench where the study is demonstrated
  buildBench(sc) {
    const B = (this.bench = new THREE.Group()); sc.add(B);
    { const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.09, 1.15), plankMat()); top.position.set(0, BENCH_Y - 0.045, 0); top.castShadow = true; top.receiveShadow = true; B.add(top); } for (const x of [-1, 1]) for (const z of [-0.48, 0.48]) put(B, cbox(0.1, BENCH_Y - 0.09, 0.1, 0.02), M.walnut(), x, (BENCH_Y - 0.09) / 2, z);
    put(B, cbox(2.0, 0.06, 0.06, 0.01), M.walnut(), 0, 0.22, -0.48); put(B, cbox(2.0, 0.06, 0.06, 0.01), M.walnut(), 0, 0.22, 0.48); put(B, cbox(2.24, 0.03, 0.05, 0.008), M.brass(), 0, BENCH_Y - 0.03, 0.58);
    { const c = dripCandle(0.22, { light: true }); c.position.set(-0.96, BENCH_Y, -0.4); B.add(c); this.candles = [...(this.candles || []), c]; const c2 = dripCandle(0.13); c2.position.set(-0.82, BENCH_Y, -0.46); B.add(c2); this.candles.push(c2); }
    { const ob = openBook(2); ob.position.set(0.78, BENCH_Y, 0.32); ob.rotation.y = -0.35; B.add(ob); const sk = skull(1.05); sk.position.set(0.92, BENCH_Y, -0.38); sk.rotation.y = -0.6; B.add(sk); const hb = hollowBook(); hb.scale.setScalar(1.3); hb.position.set(-0.66, BENCH_Y, 0.2); hb.rotation.y = 0.4; B.add(hb); this.hollow = hb;
      const iw = LP.inkwell(); iw.position.set(0.55, BENCH_Y, 0.42); B.add(iw); const q = LP.quill(); q.position.set(0.6, BENCH_Y + 0.07, 0.42); q.rotation.z = -0.5; B.add(q); const sc2 = LP.scroll(0.42); sc2.position.set(-0.75, BENCH_Y + 0.04, 0.47); sc2.rotation.y = 0.2; B.add(sc2); }
    this.slot = new THREE.Group(); this.slot.position.set(0, BENCH_Y, -0.05); B.add(this.slot);
    this.flare = new THREE.PointLight(0xffd070, 0, 4, 1.4); this.flare.position.set(0, BENCH_Y + 0.6, 0.4); B.add(this.flare);
    this.benchHit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.2), new THREE.MeshBasicMaterial({ visible: false })); this.benchHit.position.set(0, BENCH_Y + 0.6, 0); B.add(this.benchHit);
  }
  setDemo(kind) { if (this.demo?.kind === kind) return; if (this.demo) { this.slot.remove(this.demo.group); } this.demo = makeDemo(kind, { motes: this.motes }); this.demo.group.scale.setScalar(0.001); this.demoS = { fall: 1.45, pendulum: 1.1, orbit: 1.2 }[kind] || 1.3; this.slot.add(this.demo.group); this.demoIn = 0; }
  // ---------------------------------------------------------------- the chalkboard: the study's law in chalk
  buildBoard(sc) {
    const g = new THREE.Group(); g.position.set(0, 2.55, -4.42); sc.add(g); put(g, cbox(3.0, 1.7, 0.08, 0.02), M.walnut(), 0, 0, 0); put(g, cbox(2.9, 0.07, 0.16, 0.01), M.oak(), 0, -0.88, 0.06);
    this.boardC = document.createElement('canvas'); this.boardC.width = 560; this.boardC.height = 300; this.boardT = new THREE.CanvasTexture(this.boardC); this.boardT.colorSpace = THREE.SRGBColorSpace; this.boardT.magFilter = THREE.NearestFilter; this.boardT.minFilter = THREE.LinearMipmapLinearFilter; this.boardT.anisotropy = 8;
    const slate = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), new THREE.MeshStandardMaterial({ map: this.boardT, roughness: 0.95, emissive: 0xffffff, emissiveMap: this.boardT, emissiveIntensity: 0.12 })); slate.position.z = 0.045; slate.userData.noInk = true; g.add(slate);
    for (let i = 0; i < 3; i++) put(g, cbox(0.07, 0.022, 0.022, 0.004), smat(null, { color: 0xf0f0e8, rough: 0.9 }), -1.2 + i * 0.12, -0.83, 0.1);
  }
  chalk(S) {
    const c = this.boardC, g = c.getContext('2d'); const W = c.width, H = c.height; const r = mulberry32(S ? S.id.length * 7 : 3);
    g.fillStyle = '#1e2a26'; g.fillRect(0, 0, W, H); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${200 + r() * 40},${210 + r() * 30},${200 + r() * 30},${0.03 + r() * 0.05})`; g.fillRect((r() * W) | 0, (r() * H) | 0, 1 + ((r() * 3) | 0), 1); }
    for (let i = 0; i < 9; i++) { g.strokeStyle = 'rgba(220,230,220,0.05)'; g.lineWidth = 18 + r() * 30; g.beginPath(); const x = r() * W, y = r() * H; g.moveTo(x, y); g.lineTo(x + 120 + r() * 120, y + (r() - 0.5) * 40); g.stroke(); } // old erasures
    const chalkText = (str, x, y, f, k, col = '#eef2ec') => { const w = drawPixelText(g, str, x, y, f, { color: col, k, align: 'center' }); g.fillStyle = 'rgba(30,42,38,0.45)'; for (let i = 0; i < w * 0.12; i++) g.fillRect(Math.round((x - w / 2 + r() * w) / k) * k, Math.round((y - 11 * k + r() * 13 * k) / k) * k, k, k); return w; }; // chalk: a few grains missing
    if (!S) { chalkText('Nothing studied yet', W / 2, 140, 'title', 2); chalkText('merge cards in battle', W / 2, 200, 'body', 3, '#c8d4c8'); this.boardT.needsUpdate = true; return; }
    const D = DEMO[S.demo] || DEMO.orbit; const long = S.name.length > 17; chalkText(S.name, W / 2, long ? 64 : 72, long ? 'head' : 'title', long ? 3 : 2, '#f6f2d8'); chalkText(S.recipe, W / 2, 118, 'body', S.recipe.length > 28 ? 2 : 3, '#c8e0d0');
    chalkText(D.eq, W / 2, 196, 'title', 2, '#ffe8a0'); g.strokeStyle = '#d8e4d8'; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2 - 150, 214); g.lineTo(W / 2 + 150, 214); g.stroke();
    if (!S.preview) chalkText(`${Math.min(S.uses, S.goal)} of ${S.goal}`, W / 2, 262, 'body', 3, S.done ? '#ffe08a' : '#a8c0b0'); else chalkText(D.act, W / 2, 262, 'body', 2, '#a8c0b0'); this.boardT.needsUpdate = true;
  }
  // ---------------------------------------------------------------- the trophy cabinet: one curio per claimed cosmetic study
  buildCabinet(sc) {
    const C = (this.cabinet = new THREE.Group()); C.position.set(5.2, 0, -3.95); sc.add(C); put(C, cbox(1.6, 2.4, 0.5, 0.03), M.walnut(), 0, 1.2, -0.05);
    for (const y of [0.9, 1.5, 2.05]) put(C, cbox(1.46, 0.04, 0.42, 0.01), M.oak(), 0, y, 0.03); const gl = put(C, new THREE.PlaneGeometry(1.44, 1.8), glassM(0xe0ecff, 0.12), 0, 1.5, 0.25); gl.castShadow = false;
    const L = new THREE.PointLight(0xffd8a0, 2.5, 2.4, 1.6); L.position.set(0, 2.1, 0.5); C.add(L); this.trophies = [];
    const have = Object.values(save.meta.studies || {}).filter((s) => s.claimed && s.reward?.kind === 'cosmetic').map((s) => s.reward.trophy); have.forEach((k) => this.addTrophy(k, false));
  }
  addTrophy(kind, pop = true) {
    const i = this.trophies.length; if (i >= 12) return; const g = new THREE.Group(); const row = Math.floor(i / 4), col = i % 4; g.position.set(-0.54 + col * 0.36, 0.93 + row * 0.58, 0.05); this.cabinet.add(g);
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
    UI.el('div', 'lf-title lf-big', 'Studies', L.inner); this.headEl = UI.el('div', 'lf-body lf-soft', this.studies.length ? `${done} of ${this.studies.length} complete${ready ? `  -  ${ready} to claim` : ''}` : 'Nothing studied yet', L.inner); UI.el('div', 'lf-rule', null, L.inner);
    const list = (this.listEl = UI.el('div', 'lf-list', null, L.inner)); Object.assign(list.style, { position: 'absolute', left: 0, right: 0, top: UI.px(54), bottom: 0 });
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
    const top = UI.el('div', '', null, r); Object.assign(top.style, { display: 'flex', alignItems: 'center', gap: UI.px(4) }); top.appendChild(UI.fit(icon(S.law ? 'star' : S.special ? 'apple' : 'flask', { accent: S.law ? '#c8302c' : '#3ab0a0' })));
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
  onClick() { if (this.leaving) return true; const r = this.rc(); const wh = r.intersectObjects(this.worms.map((w) => w.hit), false)[0]; if (wh) { const w = this.worms.find((x) => x.hit === wh.object); w?.react(); audio.play('goblin_squeak', { vol: 0.25, rate: 1.4 }); audio.play('paper_rustle', { vol: 0.3 }); return true; } if (this.overBench()) { this.demo?.click?.(); return true; } }
  onDragStart(e) { this.dragX = e.x; this.dragY = e.y; this.dragging = this.overBench(); if (this.dragging) this.engine.renderer.domElement.style.cursor = 'grabbing'; return this.dragging; }
  onDrag(e) { if (!this.dragging || this.dragX == null) return; const dx = (e.x - this.dragX) / innerWidth, dy = (e.y - this.dragY) / innerHeight; this.dragX = e.x; this.dragY = e.y; this.demo?.drag?.(dx, dy); }
  onDragEnd() { if (this.dragging) this.demo?.release?.(); this.dragging = false; this.dragX = null; this.engine.renderer.domElement.style.cursor = this._ob ? 'grab' : ''; }
  onKey(e) { const k = e?.key || e?.code || e; if (k === 'Escape' || k === 'Backspace') { this.leave(); return true; } if (k === 'ArrowDown' || k === 'ArrowUp') { const L = this.studies; if (!L.length) return true; const i = Math.max(0, Math.min(L.length - 1, L.indexOf(this.sel) + (k === 'ArrowDown' ? 1 : -1))); this.select(L[i]); this.rows.get(L[i].id)?.scrollIntoView({ block: 'nearest' }); return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const cam = this.camera, nd = this.input.ndc;
    for (const L of this.lamps) { L.pl.intensity = L.base * (0.92 + Math.sin(t * 7 + L.ph) * 0.04 + Math.sin(t * 13 + L.ph * 2) * 0.03); L.L.rotation.z = Math.sin(t * 0.6 + L.ph) * 0.02; }
    for (const d of this.decor) d.update(dt, t); this.updateWorms(dt, t); for (const c of this.candles || []) { const f = c.userData.flame; if (f) f.scale.set(1, 0.9 + Math.sin(t * 17 + c.position.x * 9) * 0.12 + Math.sin(t * 31) * 0.05, 1); if (c.userData.light) c.userData.light.intensity = 1.1 + Math.sin(t * 13 + c.position.x) * 0.12; }
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
  dispose() { this.engine.renderer.domElement.style.cursor = ''; this.UI?.dispose(); this._env?.dispose(); this.motes?.dispose(); super.dispose(); }
}
