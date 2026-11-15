// THE TOWER-TOP MENU. Sir Isaac stands on the prow of the SPIRAL OBSERVATORY (models/tower.js) on the RIGHT of the
// frame at sunset, the hill TOWN (models/town.js) lamplit far below round the tower's foot, the river and the wild
// land (models/vista.js) running out to the mountains. No title, very little text: the menu is the sky itself.
//   - On the LEFT the menu words float in the sky, and their letters are MADE OF CLOUD (ui3d/cloudword.js): "Resume"
//     and "New Game" (or "New Adventure" when there is no run). Hover: a swell runs through the letters, a warm light
//     kindles inside, a chime, puffs break off; press: they squash and burst. Resume goes straight into the run.
//   - New: the camera tilts up into the sky, night falls, and the sky becomes the PIXEL-ART ASTRAL SELECT
//     (scenes/astral.js): pick a CONSTELLATION to start under (game/run.js STARTS); it zooms in and the run opens
//     through the galaxy transition (game.newRun({ start })). Esc, right-click or the moon-ward drag returns.
//   - Small clouds bottom-left carry objects that explain themselves (naming themselves on hover): a leather book
//     (the Journal), a brass dial (music volume), a memory crystal (the Hall of Memories, inside the tower).
//   - SWIPE LEFT (drag, wheel, Left arrow) or the crystal cloud: down the pavilion stair into the Hall (scenes/hall.js).
//     Click Isaac for a word from him and the credits.
// The first visit after loading opens on an establishing shot that rises from the town up the spiral to the hero shot
// (click to skip). Lighting is moody and natural: the low sun (off the left of the frame) is the key, side-lighting
// the tower and rimming the cloud words; the sunset sky is the image-based fill; everything else is dusk.
//   game.toMenu({ from: 'loading' | 'hall' | 'prologue' | null })  ->  new MenuScene(game).enter(opts)
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { createProfessor } from '../models/professor.js';
import { clockTower } from '../models/tower.js';
import { buildVista } from '../models/vista.js';
import { buildTown, HOLE } from '../models/town.js';
import { CloudButton } from '../ui3d/cloudbtn.js';
import { cloudWord } from '../ui3d/cloudword.js';
import { Astral } from './astral.js';
import { STARTS } from '../game/run.js';
import { lmat, cbox } from '../models/lowprops.js';
import { Surf, RAMP, parchment, inscribeLines, pxTex } from '../ui3d/craft.js';
import { Motes } from '../gfx/motes.js';
import { save, ACHIEVEMENTS } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vpick, mulberry32 } from '../core/util.js';
import { fsay, fstop } from '../story/floattext.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const BASE = 26; // the terrace stands this high above the town square
export const HERO = { pos: V(-13.2, 2.4, 19.6), look: V(-5, 0, 0), fov: 40 };
const TOWER_NDC = 0.56, TOWER_AIM = V(0, 0.4, 0); // where the tower stands in the hero frame (the look point is solved from these)
const ASTRAL = { dir: V(-0.22, 0.9, -0.42).normalize(), fov: 50 };
const QUIPS = ['Every action has an equal and opposite god.', 'Somewhere down there, the Bookworm Queen is reading my notes.', 'Gravity: still undefeated.', 'Mass times velocity. Mostly velocity.', 'The stars are just apples that never fell.'];

export class MenuScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); save.evaluate(); this.fresh = this.freshCount();
    this.upgrades = new Set(Object.keys(save.meta.cosmetics || {}));
    // solve the hero framing: the tower stands right of centre; the prow juts toward the frame's left (Isaac against the open sky)
    { const f = TOWER_AIM.clone().sub(HERO.pos); const dist = f.length(); f.normalize(); const right = V().crossVectors(f, V(0, 1, 0)).normalize(); const tanX = Math.tan((HERO.fov * Math.PI) / 360) * this.engine.aspect;
      HERO.look.copy(TOWER_AIM).addScaledVector(right, -TOWER_NDC * tanX * dist); this.leftA = Math.atan2(-right.x, -right.z); }
    const viewA = Math.atan2(HERO.pos.x, HERO.pos.z); const PROW_A = this.leftA + 0.62, FACE_A = this.leftA + 0.3;
    const T = (this.tower = clockTower({ upgrades: this.upgrades, base: BASE, prowA: PROW_A, viewA })); sc.add(T.group);
    const VZ = (this.vista = buildVista({ groundY: -BASE - 2.6, hole: HOLE })); sc.add(VZ.group); sc.fog = VZ.fog;
    const gateA = viewA - 0.5; const gate = V(Math.sin(gateA) * 7.5, 0, Math.cos(gateA) * 7.5);
    const TW = (this.town = buildTown({ hAt: VZ.hAt, riverX: VZ.riverX, gate })); sc.add(TW.group);
    this.camera = new THREE.PerspectiveCamera(HERO.fov, this.engine.aspect, 0.1, 4000); this.camera.position.copy(HERO.pos); this.look = HERO.look.clone(); this.camera.lookAt(this.look);
    this.lights(sc);
    // Sir Isaac on the prow in his heroic stance, turned out over the land toward the low sun
    const prof = (this.prof = createProfessor()); sc.add(prof.root); prof.root.position.copy(T.prow); prof.root.rotation.y = FACE_A; prof.setIdleMode?.('heroic');
    this.profHit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.9), new THREE.MeshBasicMaterial({ visible: false })); this.profHit.position.copy(T.prow).add(V(0, 1, 0)); sc.add(this.profHit);
    this.motes = new Motes(1100, { px: 2 }); sc.add(this.motes.points); this.rnd = mulberry32(31); this.acc = 0;
    this.hasRun = !!save.loadRun();
    this.astral = new Astral({ starts: STARTS }); this.astral.frame(ASTRAL.dir, ASTRAL.fov, this.engine.aspect); sc.add(this.astral.group);
    await this.buildMenu(sc); this.buildSmall(sc);
    this.envMap(sc);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.55, 0.55, 0.86], ao: 0.85, exposure: 0.92, rays: { pos: VZ.sunPos, strength: 0.36, tint: 0xffa860, thresh: 0.8, decay: 0.958 },
      grade: { sat: 1.06, vib: 0.2, contrast: 1.12, vignette: 0.5, warmth: 0.08, lift: [0.008, 0.006, 0.02], gain: [1.03, 0.98, 0.94], toe: 0.04 }, ink: { fade: [25, 160], strength: 0.75 } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['wind']); audio.playMusic('menu');
    this.mode = 'hero'; this.intro = from === 'loading' ? { t: 0, dur: 7.0 } : null; this.back = from === 'hall' ? { t: 0 } : null; this.skyT = 0; this.skyDir = 0;
    if (this.intro) { this.mode = 'intro'; this.camera.position.copy(this.introPath()[0][0]); this.look.copy(this.introPath()[0][1]); }
    if (this.back) { this.camera.position.copy(T.door).add(V(0, 0.3, 0)); this.look.copy(T.doorOut); }
  }
  introPath() { const B = -BASE; return this._ip || (this._ip = [[V(-34, B + 7, 44), V(0, B + 9, 0)], [V(-22, B + 15, 32), V(0, B + 13, 0)], [V(-13, -6, 24), V(0, -5, 0)], [HERO.pos.clone(), HERO.look.clone()]]); }
  envMap(sc) { // image-based light from the sunset sky itself, so brass, gold and stone pick up real reflections and sky fill
    try { const pm = new THREE.PMREMGenerator(this.engine.renderer); const es = new THREE.Scene(); const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), this.vista.sky.material); es.add(sky);
      const rt = pm.fromScene(es, 0.03, 0.1, 100); sc.environment = rt.texture; sc.environmentIntensity = 0.42; this._env = rt; pm.dispose(); } catch (e) { console.warn('env map', e); } }
  freshCount() { const m = save.meta; return ACHIEVEMENTS.filter((a) => m.achievements[a.id] && !(m.claimed || {})[a.id]).length + (save.CHALLENGES || []).filter((a) => m.achievements[a.id] && !(m.claimed || {})[a.id]).length; }
  lights(sc) {
    const VZ = this.vista; const sun = new THREE.DirectionalLight(0xffa868, 3.2); sun.position.copy(VZ.sunDir).multiplyScalar(60); sun.target.position.set(0, -2, 0); sun.castShadow = true;
    const s = sun.shadow; s.mapSize.set(2048, 2048); s.camera.left = -12; s.camera.right = 12; s.camera.top = 12; s.camera.bottom = -12; s.camera.near = 20; s.camera.far = 140; s.bias = -0.0004; s.normalBias = 0.03; sc.add(sun, sun.target); this.sun = sun;
    sc.add(new THREE.HemisphereLight(0x6a6aa8, 0x2a1810, 0.75)); // the dusk sky above, the warm-dark land below
    const bounce = new THREE.DirectionalLight(0x8a6ab0, 0.5); bounce.position.set(30, 18, 30); sc.add(bounce); // the violet eastern sky fills the faces turned from the sun
    const face = new THREE.DirectionalLight(0xc8a0a8, 0.55); face.position.copy(HERO.pos).add(V(-2, 3, 2)); face.target.position.copy(this.tower.prow).add(V(0, 1, 0)); sc.add(face, face.target); // soft fill from the lit clouds behind us, so faces read
    const land = new THREE.DirectionalLight(0xc0704a, 0.3); land.position.set(0, -30, -40); sc.add(land); // the sunlit land bounces a little warmth up
  }
  // ---------------------------------------------------------------- the sky menu: cloud words on the left, small object clouds below
  camPt(nx, ny, d, cam = { pos: HERO.pos, look: HERO.look, fov: HERO.fov }) { const c = new THREE.PerspectiveCamera(cam.fov, this.engine.aspect, 0.1, 100); c.position.copy(cam.pos); c.lookAt(cam.look); c.updateMatrixWorld(); return V(nx, ny, 0.5).unproject(c).sub(c.position).normalize().multiplyScalar(d).add(c.position); }
  async buildMenu(sc) {
    this.words = []; const asp = this.engine.aspect; const D = 11; const maxW = 2 * D * Math.tan((HERO.fov * Math.PI) / 360) * asp * 0.4;
    const add = async (label, act, nx, ny, h, seed) => { const W = await cloudWord(label, { height: h, seed, maxW }); W.act = act; W.base = this.camPt(nx, ny, D); W.group.position.copy(W.base); W.group.quaternion.copy(this.heroQuat()); sc.add(W.group); W.hit.userData.word = W; this.words.push(W); return W; };
    const nx = -0.52 * Math.min(1, 1.25 / Math.max(0.6, asp / 1.6));
    if (this.hasRun) { await add('Resume', 'continue', nx, 0.42, 1.25, 3); await add('New Game', 'new', nx, 0.06, 1.05, 8); }
    else await add('New Adventure', 'new', nx, 0.3, 1.2, 5);
  }
  heroQuat() { const c = new THREE.PerspectiveCamera(); c.position.copy(HERO.pos); c.lookAt(HERO.look); return c.quaternion.clone(); }
  buildSmall(sc) {
    // small clouds carrying objects that explain themselves (a book, a brass dial, a memory crystal), naming themselves only on hover
    this.clouds = [];
    const add = (label, act, nx, ny, d, seed, o = {}) => { const b = new CloudButton(label, { seed, ...o }); b.setBase(this.camPt(nx, ny, d)); b.act = act; sc.add(b.group); this.clouds.push(b); return b; };
    const NX = -0.86, NY = -0.68, STEP = 0.19;
    { const g = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color: 0x9a86d8, emissive: 0x6a4ab8, emissiveIntensity: this.fresh ? 1.2 : 0.6, roughness: 0.15, metalness: 0.2, flatShading: true });
      const geo = new THREE.LatheGeometry([[0.001, -0.42], [0.13, -0.18], [0.16, 0.2], [0.001, 0.48]].map(([x, y]) => new THREE.Vector2(x, y)), 5); const cr = new THREE.Mesh(geo, cm); cr.rotation.z = 0.2; g.add(cr); g.scale.setScalar(0.55);
      for (let i = 0; i < 2; i++) { const c2 = new THREE.Mesh(geo, cm); c2.scale.setScalar(0.5); c2.position.set(i ? 0.18 : -0.17, -0.12, 0.05); c2.rotation.z = i ? -0.5 : 0.6; g.add(c2); }
      const l = new THREE.PointLight(0x9a7aff, this.fresh ? 2.5 : 1.0, 3, 1.6); l.position.z = 0.4; g.add(l); this.hallCrystal = { cm, l };
      this.hallCloud = add('Memories', 'hall', NX + STEP * 2, NY, 8.5, 21, { w: 1.0, icon: g, labelOnHover: true, unit: 0.009, h: 0.8 }); this.hallCloud.spinIcon = true; }
    { const book = new THREE.Group(); const S = new Surf(48, 32); parchment(S, 0, 0, 48, 32, { seed: 3, torn: 0, tone: 4 }); inscribeLines(S, ['m = F/a', 'apple ~ moon?'], { x: 3, y: 4, w: 42, h: 24 }, 'hand', 'ink', {});
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.36), [lmat('parch'), lmat('parch'), new THREE.MeshStandardMaterial({ map: pxTex(S.toCanvas()), roughness: 0.9 }), lmat('parch'), lmat('parch'), lmat('parch')]); pages.position.y = 0.03; book.add(pages);
      const back = new THREE.Mesh(cbox(0.54, 0.02, 0.4, 0.008), lmat('leather')); back.rotation.x = Math.PI / 2; book.add(back);
      const hinge = new THREE.Group(); hinge.position.set(-0.26, 0.065, 0); book.add(hinge); const cover = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.025, 0.4), lmat('leather')); cover.position.x = 0.27; hinge.add(cover);
      const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.09), lmat('brass')); clasp.position.set(0.52, 0, 0); hinge.add(clasp); const emb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), lmat('gold')); emb.scale.y = 0.3; emb.position.set(0.27, 0.016, 0); hinge.add(emb);
      book.rotation.x = 0.9; book.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.journalCloud = add('Journal', 'journal', NX, NY, 8.5, 31, { w: 1.0, icon: book, labelOnHover: true, unit: 0.0085, h: 0.75 }); this.journalCloud.hinge = hinge; this.journalCloud.open = new Spring(0, 7, 0.6); }
    { const dial = new THREE.Group(); const S = new Surf(40, 40); for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const d = Math.hypot(x - 19.5, y - 19.5); if (d > 19.5) continue; const an = Math.atan2(y - 19.5, x - 19.5); const tick = d > 15 && d < 18.5 && Math.abs(((an / (Math.PI * 2)) * 24 + 48) % 1 - 0.5) > 0.38; S.set(x, y, RAMP.brass, d > 18.5 ? 1 : tick ? 0 : d > 14 ? 3 : 4 - (x + y < 30 ? 0 : 1)); }
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.05, 12), [lmat('brass'), new THREE.MeshStandardMaterial({ map: pxTex(S.toCanvas()), metalness: 0.7, roughness: 0.4 }), lmat('brass')]); disc.rotation.x = Math.PI / 2; dial.add(disc);
      const knob = new THREE.Group(); knob.position.z = 0.03; dial.add(knob); const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 8), lmat('bronze')); kb.rotation.x = Math.PI / 2; kb.position.z = 0.03; knob.add(kb);
      const needle = new THREE.Mesh(cbox(0.03, 0.21, 0.015, 0.005), lmat('gold')); needle.position.set(0, 0.1, 0.05); knob.add(needle);
      const pipM = []; for (let i = 0; i < 3; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x3a2a14, emissive: 0xffb040, emissiveIntensity: 0, metalness: 0.6, roughness: 0.4, flatShading: true }); const pip = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), m); pip.position.set(-0.1 + i * 0.1, -0.36, 0.02); dial.add(pip); pipM.push(m); }
      dial.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      const steps = [0, 0.3, 0.6, 0.9]; const cur = steps.reduce((x, y) => (Math.abs(y - this.game.settings.music) < Math.abs(x - this.game.settings.music) ? y : x));
      const b = (this.dialCloud = add('Music', 'settings', NX + STEP, NY, 8.5, 41, { w: 0.95, icon: dial, labelOnHover: true, unit: 0.0085, h: 0.75 })); b.knob = knob; b.pips = pipM; b.notch = steps.indexOf(cur); b.turn = new Spring(-b.notch * Math.PI / 2, 10, 0.42); this.setPips(b); }
  }
  setPips(b) { b.pips.forEach((m, i) => { m.emissiveIntensity = i < b.notch ? 1.6 : 0; m.color.set(i < b.notch ? 0xffc860 : 0x3a2a14); }); }
  // ---------------------------------------------------------------- actions
  say(t) { if (!this.prof) return; try { fsay('newton', t, { anchor: this.prof, wait: false }); } catch (e) { /* */ } this.prof.talk(1.5); }
  async openJournal() { const c = this.journalCloud; c.open.target = 1; audio.play('book_open', { vol: 0.8 }); audio.play('page_turn', { vol: 0.5, delay: 0.25 });
    setTimeout(async () => { const { Journal } = await import('./journal.js'); if (!this.journal) this.journal = new Journal(this.game, this.root); this.journal.open(); }, 520); }
  turnDial() { const b = this.dialCloud; const steps = [0, 0.3, 0.6, 0.9]; b.notch = (b.notch + 1) % 4; b.turn.target -= Math.PI / 2; b.turn.kick(-2); const s = this.game.settings; s.music = steps[b.notch]; audio.vol.music = s.music; audio.applyVolumes(); save.saveSettings(); this.setPips(b);
    audio.play('clockwork', { vol: 0.6 }); audio.play('ui_click', { vol: 0.5, delay: 0.08 }); }
  resume(W) { if (this.mode !== 'hero') return; this.mode = 'resume'; this.resumeT = 0; W.press(this.motes); audio.play('ui_click'); audio.play('magic_shimmer', { vol: 0.5 }); for (const w of this.words) if (w !== W) w.vis.target = 0; this.prof.act?.('cheer'); }
  toAstral(W) { if (this.mode !== 'hero') return; this.mode = 'astral'; this.skyDir = 1; W?.press(this.motes); audio.play('ui_click'); audio.play('whoosh_soft', { vol: 0.7 }); audio.play('magic_shimmer', { vol: 0.4, delay: 0.6 });
    for (const w of this.words) w.vis.target = 0; for (const c of this.clouds) c.vis.target = 0; this.hover = null; this.engine.renderer.domElement.style.cursor = ''; this.prof.lookAt(-0.2, 0.9); }
  fromAstral() { if (this.mode !== 'astral' || this.skyT < 0.85) return; this.skyDir = -1; this.astral.hover = -1; audio.play('whoosh_soft', { vol: 0.5 }); }
  choose(i) { if (this.mode !== 'astral' || this.chosen) return; const c = this.astral.cons[i]; this.chosen = { t: 0, i, id: c.id, dir: this.astral.centerDir(i), from: this.camDir() }; this.astral.pickIdx = i; this.astral.hover = -1; this.engine.renderer.domElement.style.cursor = '';
    audio.play('magic_sparkle', { vol: 0.7 }); audio.play('chime_soft', { vol: 0.6, delay: 0.25 }); audio.play('transition_whoosh', { vol: 0.5, delay: 0.9 }); }
  camDir() { return this.look.clone().sub(this.camera.position).normalize(); }
  toHall() { if (this.mode !== 'hero' || this.toHallT != null) return; this.toHallT = 0; this.hallFrom = { pos: this.camera.position.clone(), look: this.look.clone() }; audio.play('transition_whoosh', { vol: 0.6 }); audio.play('wood_creak', { vol: 0.4, delay: 0.6 }); }
  async credits() {
    const lines = ['LERFOLESE. Code, models, cards & design: made for this game.', 'Fonts: Alagard, PixelSans, NanoPlus, RuneMono and others (OFL / free licences).', 'three.js (MIT). 3D assets: Poly Haven (CC0).'];
    try { const r = await fetch('assets/audio/credits.json'); if (r.ok) { const c = await r.json(); lines.push(`Audio: ${c.length} recordings, CC0 / CC BY. Full list in assets/audio/CREDITS.md`); lines.push(...c.filter((x) => /BY/.test(x.license)).slice(0, 4).map((x) => `"${x.title}" by ${x.author} (${x.license})`)); } } catch (e) { /* */ }
    this.tip.show(lines.slice(0, 8).map((l, i) => [[l, i ? '#2a160c' : '#3a2410']]), 0, 0, 12, { maxW: 26 }); clearTimeout(this._ct); this._ct = setTimeout(() => this.tip.hide(), 8000);
  }
  // ---------------------------------------------------------------- input
  rc() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  busy() { return !!(this.mode !== 'hero' || this.toHallT != null || this.journal?.isOpen || this.back); }
  pick() {
    if (this.mode === 'astral') { if (this.chosen || this.skyT < 0.95) return null; const i = this.astral.pick(this.input.ndc, this.camera); return i >= 0 ? { star: i } : null; }
    if (this.busy()) return null; const r = this.rc(); const objs = [...this.words.map((w) => w.hit), ...this.clouds.map((c) => c.hit), this.profHit];
    const h = r.intersectObjects(objs, true)[0]; if (!h) return null; const o = h.object; if (o.userData.word) return { word: o.userData.word }; if (o.userData.cloud) return { cloud: o.userData.cloud }; if (o === this.profHit) return { isaac: true }; return null;
  }
  onMove() { const p = this.pick(); const key = p ? (p.word ? 'w:' + p.word.label : p.cloud ? 'c:' + p.cloud.label : p.star != null ? 's:' + p.star : 'isaac') : null;
    if (key !== this.hoverKey) { this.hoverKey = key; this.hover = p; if (this.mode === 'astral') this.astral.hover = p ? p.star : -1;
      if (p) audio.play(p.word ? 'chime_soft' : p.star != null ? 'magic_sparkle' : 'ui_hover', { vol: p.word ? 0.4 : p.star != null ? 0.3 : 0.35 });
      if (p?.word) for (let i = 0; i < 10; i++) { const q = p.word.crownPoint(); const r = this.rnd; this.motes.spawn({ pos: [q.x + (r() - 0.5) * 0.4, q.y, q.z], vel: [(r() - 0.5) * 0.3, 0.25 + r() * 0.3, (r() - 0.5) * 0.2], drag: 1.6, grav: -0.04, life: 0.8 + r() * 0.6, seq: 'puff', fps: 4, once: true, color: '#fff0ea', bright: 0.9, k: r() < 0.3 ? 2 : 1, fadeIn: 0.02 }); }
      this.engine.renderer.domElement.style.cursor = p ? 'pointer' : ''; } }
  onClick(e) {
    if (this.mode === 'intro') { this.intro.t = Math.max(this.intro.t, this.intro.dur - 0.9); return true; }
    if (this.journal?.isOpen) return;
    if (this.mode === 'astral') { if (e?.button === 2) { this.fromAstral(); return true; } const p = this.pick(); if (p) this.choose(p.star); return true; }
    if (this.busy()) return true; const p = this.pick(); if (!p) return;
    if (p.word) { if (p.word.act === 'continue') this.resume(p.word); else this.toAstral(p.word); return true; }
    if (p.cloud) { const c = p.cloud; if (c.act === 'hall') { c.press(this.motes); this.toHall(); return true; } if (c.act === 'journal') { c.press(this.motes); this.openJournal(); return true; } if (c.act === 'settings') { c.press(); this.turnDial(); return true; } }
    if (p.isaac) { audio.play('pop', { vol: 0.4 }); this.prof.act?.('cheer'); this.say(vpick(QUIPS)); this.credits(); return true; }
  }
  onDragStart(e) { this.dragX = e.x; this.dragY = e.y; }
  onDrag(e) { if (this.dragX == null) return; if (this.mode === 'astral') { if (e.y - this.dragY > 140 && Math.abs(e.x - this.dragX) < 160) { this.dragX = null; this.fromAstral(); } return; } if (this.busy()) return; if (this.dragX - e.x > 110 && Math.abs(e.y - this.dragY) < 140) { this.dragX = null; this.toHall(); } }
  onDragEnd() { this.dragX = null; }
  onWheel(e) { if (this.mode === 'astral') { if ((e?.dy || 0) > 60) this.fromAstral(); return; } if (this.busy()) return; const d = (e?.dx || 0) + (e?.dy || 0); this.wAcc = (this.wAcc || 0) * 0.8 + d; if (this.wAcc > 120) { this.wAcc = 0; this.toHall(); } }
  onKey(e) { const k = e?.key || e?.code || e; if (this.mode === 'intro') { this.intro.t = this.intro.dur - 0.9; return true; }
    if (this.mode === 'astral') { if (k === 'Escape' || k === 'Backspace' || k === 'ArrowDown') { this.fromAstral(); return true; } const n = parseInt(k, 10); if (n >= 1 && n <= this.astral.cons.length && this.skyT > 0.95) { this.choose(n - 1); return true; } return; }
    if (this.busy()) return; if (k === 'ArrowLeft' || k === 'a' || k === 'KeyA') { this.toHall(); return true; }
    if (k === 'Enter' || k === ' ' || k === 'Space') { const w = this.words.find((x) => x.act === 'continue') || this.words.find((x) => x.act === 'new'); if (w.act === 'continue') this.resume(w); else this.toAstral(w); return true; }
    if (k === 'ArrowUp' || k === 'n' || k === 'KeyN') { this.toAstral(this.words.find((x) => x.act === 'new')); return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const T = this.tower, prof = this.prof, cam = this.camera; T.update(dt, t); this.vista.update(dt, t); this.town.update(dt, t); prof.update(dt);
    const nd = this.input.ndc;
    // the sky: night falls and the astral cosmos reveals as we look up (and lifts again on the way back)
    if (this.skyDir) { this.skyT = Math.max(0, Math.min(1, this.skyT + this.skyDir * dt / 2.1)); if (this.skyT <= 0 && this.skyDir < 0) { this.skyDir = 0; this.mode = 'hero'; for (const w of this.words) w.vis.target = 1; for (const c of this.clouds) c.vis.target = 1; } }
    const sk = ease5(this.skyT); this.vista.sky.material.uniforms.uNight.value = sk; this.astral.fade = ease(Math.max(0, (this.skyT - 0.2) / 0.8));
    // camera: establishing rise -> hero shot (breathing, parallax) | back out of the hatch | into the hall | up into the stars | zoom into a constellation
    if (this.mode === 'intro') { this.intro.t += dt; const u = ease5(this.intro.t / this.intro.dur); const P = this.introPath();
      const curve = this._ic || (this._ic = new THREE.CatmullRomCurve3(P.map((q) => q[0]), false, 'centripetal')); const lcurve = this._il || (this._il = new THREE.CatmullRomCurve3(P.map((q) => q[1]), false, 'centripetal'));
      cam.position.copy(curve.getPoint(u)); this.look.copy(lcurve.getPoint(u)); cam.fov = 34 + (HERO.fov - 34) * u; cam.updateProjectionMatrix(); if (this.intro.t >= this.intro.dur) { this.mode = 'hero'; this.intro = null; } }
    else if (this.toHallT != null) { this.toHallT += dt; const u = ease5(this.toHallT / 2.0); const f = this.hallFrom; const mid = T.prow.clone().add(V(1.2, 2.6, 1.8));
      cam.position.copy(f.pos).lerp(mid, Math.min(1, u * 1.6)).lerp(T.door.clone().add(V(0, 0.4, 0)), Math.max(0, u * 1.6 - 0.6)); this.look.copy(f.look).lerp(T.door.clone().add(V(0, -1.2, 0)), ease(u * 1.4)); cam.fov = HERO.fov + 14 * u; cam.updateProjectionMatrix();
      if (this.toHallT > 1.6 && !this.left) { this.left = true; this.game.toHall({ from: 'tower' }); } }
    else if (this.mode === 'resume') { this.resumeT += dt; const u = ease(this.resumeT / 1.0); cam.position.lerp(HERO.pos.clone().add(V(0.6, 0.4, -1.2)), dt * 1.5 * u); this.look.lerp(this.words[0].group.position, dt * 0.8 * u); if (this.resumeT > 0.75 && !this.left) { this.left = true; audio.play('transition_whoosh'); this.game.continueRun(); } }
    else if (this.mode === 'astral' || (this.skyT > 0 && this.mode !== 'hero')) { const d0 = HERO.look.clone().sub(HERO.pos).normalize(); const d = d0.clone().lerp(ASTRAL.dir, sk).normalize();
      if (this.chosen) { const C = this.chosen; C.t += dt; const u = ease5(C.t / 1.7); d.copy(ASTRAL.dir).lerp(C.dir, u).normalize(); cam.fov = ASTRAL.fov + (12 - ASTRAL.fov) * u; cam.updateProjectionMatrix(); if (C.t > 1.45 && !this.left) { this.left = true; this.game.newRun({ start: C.id }); } }
      else { const f = HERO.fov + (ASTRAL.fov - HERO.fov) * sk; if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); } d.addScaledVector(this.astral.e1 || V(), nd.x * 0.012 * sk).addScaledVector(this.astral.e2 || V(), nd.y * 0.008 * sk).normalize(); }
      cam.position.lerp(HERO.pos.clone().add(V(0, 0.25 * sk, 0)), Math.min(1, dt * 3)); this.look.copy(cam.position).addScaledVector(d, 10); }
    else { let fov = HERO.fov, look = HERO.look.clone(), pos = HERO.pos.clone();
      if (this.back) { this.back.t += dt; const u = ease5(this.back.t / 1.7); pos = T.door.clone().add(V(0, 0.3, 0)).lerp(HERO.pos, u); look = T.doorOut.clone().lerp(HERO.look, u); if (u >= 1) this.back = null; }
      const drift = V(Math.sin(t * 0.13) * 0.08 + nd.x * 0.16, Math.sin(t * 0.09) * 0.05 + nd.y * 0.09, Math.sin(t * 0.07) * 0.06);
      cam.position.lerp(pos.add(drift), this.back ? 1 : Math.min(1, dt * 2.5)); this.look.lerp(look.add(V(nd.x * 0.5, nd.y * 0.3, 0)), this.back ? 1 : Math.min(1, dt * 2.5)); if (Math.abs(cam.fov - fov) > 0.01) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); } }
    cam.lookAt(this.look);
    this.astral.update(dt, t, cam, this.engine.renderer);
    // the cloud words and the small clouds
    const hov = this.hover; for (const w of this.words) { w.update(dt, t, hov?.word === w, cam, this.vista.sunDir); w.group.position.set(w.base.x + Math.sin(t * 0.21 + w.base.y) * 0.08, w.base.y + Math.sin(t * 0.37 + w.base.x) * 0.06, w.base.z); }
    for (const c of this.clouds) c.update(dt, t, cam, hov?.cloud === c);
    { const j = this.journalCloud; j.open.target = this.journal?.isOpen ? 1 : 0; j.open.update(dt); const k = Math.max(0, j.hov.value); j.hinge.rotation.z = 0.25 + (Math.PI * 0.95 - 0.25) * Math.max(0, Math.min(1, j.open.value)) + k * 0.35 + Math.sin(t * 5) * 0.03 * k; }
    { const d = this.dialCloud; d.turn.update(dt); d.knob.rotation.z = d.turn.value + Math.sin(t * 9) * 0.03 * Math.max(0, d.hov.value); }
    { const hc = this.hallCrystal; const k = Math.max(0, this.hallCloud.hov.value); hc.cm.emissiveIntensity = (this.fresh ? 1.1 + Math.max(0, Math.sin(t * 3)) * 0.6 : 0.55) + k * 0.9; hc.l.intensity = ((this.fresh ? 2.2 : 0.9) + k * 2.5) * Math.max(0, this.hallCloud.vis.value);
      if (this.fresh && this.mode === 'hero' && Math.random() < dt * 4) { const p = this.hallCloud.group.getWorldPosition(V()); const r = this.rnd; this.motes.spawn({ pos: [p.x + (r() - 0.5) * 0.5, p.y + 0.2 + r() * 0.4, p.z], vel: [(r() - 0.5) * 0.1, 0.25, 0], drag: 0.5, life: 1.4, seq: 'glint', fps: 6, color: '#c8b0ff', bright: 1.6, fadeIn: 0.1 }); } }
    // Isaac: gazes over the land, glances at what you point at, looks up with you into the stars
    if (this.mode === 'astral') prof.lookAt(-0.3, 0.95); else { const tgt = hov?.word ? hov.word.group.position : hov?.cloud ? hov.cloud.group.position : null; if (tgt) { const p = tgt.clone().project(cam); prof.lookAt(p.x, p.y); } else prof.lookAt(-0.55 + nd.x * 0.3, 0.05 + nd.y * 0.2); }
    // ambient: warm motes drifting in the low sunlight near the lens (stardust once we look up)
    this.acc += dt * 6; const r = this.rnd; while (this.acc > 1) { this.acc--; const z = -(1.2 + r() * 7); const p = cam.localToWorld(V((r() - 0.5) * -z * 1.6, (r() - 0.5) * -z * 0.9, z)); const night = this.skyT > 0.5;
      this.motes.spawn({ pos: p, vel: [0.25 + r() * 0.2, (r() - 0.5) * 0.05, 0.05], wobble: 0.3, drag: 0.3, life: 3 + r() * 3, sprite: r() < 0.7 ? 'm1' : 'dust', color: night ? (r() < 0.5 ? '#c8d0ff' : '#e8d8ff') : r() < 0.7 ? '#ffd8a0' : '#ffe8c8', bright: 0.9 + r() * 0.5, twinkle: 2 + r() * 3, fadeIn: 0.3 }); }
    this.motes.px = Math.max(2, Math.round(this.engine.renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())).y / 320)); this.motes.update(dt, t, this.engine.renderer);
    this.updateUI(dt); this.journal?.update(dt, t);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; try { fstop(); } catch (e) { /* */ } this._env?.dispose(); this.motes?.dispose(); for (const c of this.clouds || []) c.dispose(); for (const w of this.words || []) w.dispose(); this.astral?.dispose(); super.dispose(); }
}
