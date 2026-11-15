// THE TOWER-TOP MENU. Sir Isaac stands on the prow of the SPIRAL OBSERVATORY (models/tower.js) on the RIGHT of the
// frame at sunset, the hill TOWN (models/town.js) lamplit far below round the tower's foot, the river and the wild
// land (models/vista.js) running out to the mountains. No title, very little text: the menu is the sky itself.
//   - On the LEFT the menu words float in the air: Alagard rendered high-res as bevelled cast gold (ui3d/menuword.js,
//     ui3d/cinetext.js): "Resume" and "New Game" (or "New Adventure" when there is no run). They float and sway; on
//     hover they lift and tilt to the pointer and a shimmer sweeps the face with a few glints; a press squashes them
//     with a bright sweep and a chime. Resume goes straight into the run.
//   - New: the camera tilts up into the sky, the stars smear into TRAILS, night falls and the sky becomes the
//     PIXEL-ART ASTRAL SELECT (scenes/astral.js): the constellations draw themselves in one by one (a chime each); hover
//     one for its STAR CHART (a detailed 2D card: name, what it gives with its artifact or card, how hard it is);
//     click: its stars ignite one by one, the others dim, the sky WARPS into it and the run opens through the galaxy
//     transition centred on it (game.newRun({ start })). Esc, right-click or the moon-ward drag returns.
//   - FOUR MENU OBJECTS bottom-left (ui3d/menuicons.js), alive under the pointer, naming themselves on hover:
//       STUDIES  (a brass alembic)        -> the EXPERIMENT HALL (scenes/studies.js): the camera dives at the glowing
//                                           flask, steam billows over the view (cloud transition)
//       STARS    (a constellation crystal) -> the STARS (scenes/stars.js): the camera tilts up into the night, star
//                                           trails, and the galaxy transition into the achievements' sky
//       JOURNAL  (a leather book)          -> the journal codex (cards, foes, Laws met), a 2D folio over the view
//       SETTINGS (a brass gear train)      -> volumes, picture quality, voices
//     The alembic boils gold when a study is complete and the crystal pulses gold when an achievement waits.
//     You can no longer enter the tower (the old swipe into the Hall of Memories is gone).
//   - Click Isaac for a word from him and the credits.
// The first visit after loading opens on an establishing shot that rises from the town up the spiral to the hero shot
// (click to skip). Lighting is natural: the low sun (off the left of the frame) is the key, side-lighting the tower
// and catching the gold lettering; the sunset sky is the image-based fill; everything else is dusk.
//   game.toMenu({ from: 'loading' | 'studies' | 'stars' | 'prologue' | null })  ->  new MenuScene(game).enter(opts)
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { createProfessor } from '../models/professor.js';
import { clockTower } from '../models/tower.js';
import { buildVista } from '../models/vista.js';
import { buildTown, HOLE } from '../models/town.js';
import { menuWord, FloatIcon } from '../ui3d/menuword.js';
import { makeIcon } from '../ui3d/menuicons.js';
import { Astral, startCons, ASTRAL } from './astral.js';
import { STARTS } from '../game/run.js';
import { studyStarts, studiesReady } from '../game/studies.js';
import { ITEMS } from '../game/data/items.js';
import { BASICS } from '../game/data/cards.js';
import { Motes } from '../gfx/motes.js';
import { save, ACHIEVEMENTS } from '../core/save.js';
import { audio } from '../core/audio.js';
import { vpick, mulberry32 } from '../core/util.js';
import { fsay, fstop } from '../story/floattext.js';
import { Scholar, icon } from '../ui2d/scholar.js';
import { Codex, SettingsPanel } from '../ui2d/menupanels.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const BASE = 26; // the terrace stands this high above the town square
export const HERO = { pos: V(-12.2, 2.8, 18.2), look: V(-5, 0, 0), fov: 40 };
const TOWER_NDC = 0.56, TOWER_AIM = V(0, 1.9, 0); // where the tower stands in the hero frame (the look point is solved from these)
const QUIPS = ['Every action has an equal and opposite god.', 'Somewhere down there, the Bookworm Queen is reading my notes.', 'Gravity: still undefeated.', 'Mass times velocity. Mostly velocity.', 'The stars are just apples that never fell.'];
const DIFF = ['', 'Gentle', 'Fair', 'Perilous'];

export class MenuScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); save.evaluate(); this.fresh = this.freshCount(); this.ready = studiesReady();
    this.upgrades = new Set(Object.keys(save.meta.cosmetics || {}));
    // solve the hero framing: the tower stands right of centre; the prow juts toward the frame's left (Isaac against the open sky)
    { const f = TOWER_AIM.clone().sub(HERO.pos); const dist = f.length(); f.normalize(); const right = V().crossVectors(f, V(0, 1, 0)).normalize(); const tanX = Math.tan((HERO.fov * Math.PI) / 360) * this.engine.aspect;
      HERO.look.copy(TOWER_AIM).addScaledVector(right, -TOWER_NDC * tanX * dist); this.leftA = Math.atan2(-right.x, -right.z); }
    const viewA = Math.atan2(HERO.pos.x, HERO.pos.z); const PROW_A = this.leftA + 0.62, FACE_A = this.leftA + 0.3;
    const T = (this.tower = clockTower({ upgrades: this.upgrades, base: BASE, prowA: PROW_A, viewA })); sc.add(T.group);
    const VZ = (this.vista = buildVista({ groundY: -BASE - 2.6, hole: HOLE })); sc.add(VZ.group); sc.fog = VZ.fog;
    const gateA = viewA - 0.5; const gate = V(Math.sin(gateA) * 7.5, 0, Math.cos(gateA) * 7.5);
    const TW = (this.town = buildTown({ hAt: VZ.hAt, riverX: VZ.riverX, gate, keepTree: this.keepTree(), square: this.groundAt(-0.22, -0.62, VZ.hAt) })); sc.add(TW.group);
    this.camera = new THREE.PerspectiveCamera(HERO.fov, this.engine.aspect, 0.1, 4000); this.camera.position.copy(HERO.pos); this.look = HERO.look.clone(); this.camera.lookAt(this.look);
    this.lights(sc);
    // Sir Isaac on the prow in his heroic stance, turned out over the land toward the low sun
    const prof = (this.prof = createProfessor()); sc.add(prof.root); prof.root.position.copy(T.prow); prof.root.rotation.y = FACE_A; prof.setIdleMode?.('heroic');
    this.profHit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.9), new THREE.MeshBasicMaterial({ visible: false })); this.profHit.position.copy(T.prow).add(V(0, 1, 0)); sc.add(this.profHit);
    this.motes = new Motes(1100, { px: 2 }); sc.add(this.motes.points); this.rnd = mulberry32(31); this.acc = 0;
    this.hasRun = !!save.loadRun();
    this.astral = new Astral({ cons: startCons(STARTS, studyStarts()) }); this.astral.engine = this.engine; this.astral.frame(ASTRAL.dir, ASTRAL.fov, this.engine.aspect); sc.add(this.astral.group);
    await this.buildMenu(sc); this.buildIcons(sc);
    this.envMap(sc);
    this.UI = new Scholar(); this.codex = new Codex(this.game, this.UI); this.settingsP = new SettingsPanel(this.game, this.UI);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.42, 0.5, 0.9], ao: 0.85, exposure: 1.0, rays: { pos: VZ.sunPos, strength: 0.32, tint: 0xffb46a, thresh: 0.82, decay: 0.958 }, // (visuals) painterly sunset: warm key, cool coloured shadows, gentle bloom only on the hottest lights
      grade: { sat: 1.1, vib: 0.26, sel: [0.08, 0.14, 0.16], contrast: 1.06, vignette: 0.4, warmth: 0.1, lift: [0.006, 0.008, 0.03], gain: [1.03, 0.99, 0.95], rolloff: 0.45, toe: 0.02, harmony: 0.04, hueLight: 0.09, hueShadow: 0.66 }, ink: { fade: [25, 160], strength: 0.75 } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['wind']); audio.playMusic('menu');
    this.mode = 'hero'; this.skyT = 0; this.skyDir = 0;
    this.intro = from === 'loading' ? { t: 0, dur: 7.0 } : null;
    if (this.intro) { this.mode = 'intro'; this.camera.position.copy(this.introPath()[0][0]); this.look.copy(this.introPath()[0][1]); }
    if (from === 'studies') { this.back = { t: 0, from: this.camPt(-0.5, -0.62, 3.2), look: this.camPt(-0.5, -0.66, 9) }; this.camera.position.copy(this.back.from); this.look.copy(this.back.look); }
    if (from === 'stars' || from === 'hall') { audio.playMusic(audio.manifest?.music?.hall ? 'hall' : 'menu'); this.mode = 'skyback'; this.skyT = 1; this.skyDir = -1; this.astral.showFigures = false; for (const w of this.words) w.vis.value = w.vis.target = 0; for (const c of this.icons) c.vis.value = c.vis.target = 0; this.astral.trail = 0.6; }
  }
  groundAt(nx, ny, hAt) { // where the hero view's ray through (nx, ny) meets the land (the town square goes there, in sight)
    const c = new THREE.PerspectiveCamera(HERO.fov, this.engine.aspect, 0.1, 1000); c.position.copy(HERO.pos); c.lookAt(HERO.look); c.updateMatrixWorld(); const d = V(nx, ny, 0.5).unproject(c).sub(c.position).normalize();
    const p = HERO.pos.clone(); for (let i = 0; i < 400; i++) { p.addScaledVector(d, 0.5); if (p.y < hAt(p.x, p.z)) break; } const k = Math.min(1, 62 / Math.max(1, Math.hypot(p.x, p.z))); return V(p.x * k, 0, p.z * k); }
  keepTree() { // thin the grove where it would stand in front of the town in the hero frame (left and lower middle, near)
    const c = new THREE.PerspectiveCamera(HERO.fov, this.engine.aspect, 0.1, 1000); c.position.copy(HERO.pos); c.lookAt(HERO.look); c.updateMatrixWorld(); const r = mulberry32(5);
    return (x, y, z) => { const p = V(x, y + 4, z); const d = p.distanceTo(HERO.pos); p.project(c); const inFrame = Math.abs(p.x) < 1.05 && p.y > -1.1 && p.y < 0.2; return !(inFrame && p.x < 0.32 && d < 85 && r() < 0.88); }; }
  introPath() { const B = -BASE; return this._ip || (this._ip = [[V(-34, B + 7, 44), V(0, B + 9, 0)], [V(-22, B + 15, 32), V(0, B + 13, 0)], [V(-13, -6, 24), V(0, -5, 0)], [HERO.pos.clone(), HERO.look.clone()]]); }
  envMap(sc) { // image-based light from the sunset sky itself, so brass, gold and stone pick up real reflections and sky fill
    try { const pm = new THREE.PMREMGenerator(this.engine.renderer); const es = new THREE.Scene(); const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), this.vista.sky.material); es.add(sky);
      const rt = pm.fromScene(es, 0.03, 0.1, 100); sc.environment = rt.texture; sc.environmentIntensity = 0.42; this._env = rt; pm.dispose(); } catch (e) { console.warn('env map', e); } }
  freshCount() { const m = save.meta; return ACHIEVEMENTS.filter((a) => m.achievements[a.id] && !(m.claimed || {})[a.id]).length + (save.CHALLENGES || []).filter((a) => m.achievements[a.id] && !(m.claimed || {})[a.id]).length; }
  lights(sc) {
    const VZ = this.vista; const sun = new THREE.DirectionalLight(0xffb072, 3.6); sun.position.copy(VZ.sunDir).multiplyScalar(60); sun.target.position.set(0, -2, 0); sun.castShadow = true;
    const s = sun.shadow; s.mapSize.set(2048, 2048); s.camera.left = -12; s.camera.right = 12; s.camera.top = 12; s.camera.bottom = -12; s.camera.near = 20; s.camera.far = 140; s.bias = -0.0004; s.normalBias = 0.03; sc.add(sun, sun.target); this.sun = sun;
    sc.add(new THREE.HemisphereLight(0x8494d6, 0x5a3e2a, 1.45)); // the dusk sky above (a clear cool blue, so shadows read coloured, never grey), the warm land below
    const bounce = new THREE.DirectionalLight(0x8a6ab0, 0.5); bounce.position.set(30, 18, 30); sc.add(bounce); // the violet eastern sky fills the faces turned from the sun
    const face = new THREE.DirectionalLight(0xc8a0a8, 0.55); face.position.copy(HERO.pos).add(V(-2, 3, 2)); face.target.position.copy(this.tower.prow).add(V(0, 1, 0)); sc.add(face, face.target); // soft fill from the lit clouds behind us, so faces read
    const land = new THREE.DirectionalLight(0xc0704a, 0.3); land.position.set(0, -30, -40); sc.add(land); // the sunlit land bounces a little warmth up
  }
  // ---------------------------------------------------------------- the menu: cast gold words on the left, four instruments below
  camPt(nx, ny, d, cam = { pos: HERO.pos, look: HERO.look, fov: HERO.fov }) { const c = new THREE.PerspectiveCamera(cam.fov, this.engine.aspect, 0.1, 100); c.position.copy(cam.pos); c.lookAt(cam.look); c.updateMatrixWorld(); return V(nx, ny, 0.5).unproject(c).sub(c.position).normalize().multiplyScalar(d).add(c.position); }
  async buildMenu(sc) {
    this.words = []; const asp = this.engine.aspect; const D = 11; const maxW = 2 * D * Math.tan((HERO.fov * Math.PI) / 360) * asp * 0.36;
    const add = async (label, act, nx, ny, h, seed) => { const W = menuWord(label, { height: h, seed, maxW }); W.act = act; W.base = this.camPt(nx, ny, D); W.group.position.copy(W.base); W.group.quaternion.copy(this.heroQuat()); sc.add(W.group); W.hit.userData.word = W; this.words.push(W); return W; };
    const nx = -0.5 * Math.min(1, 1.25 / Math.max(0.6, asp / 1.6));
    if (this.hasRun) { await add('Resume', 'continue', nx, 0.42, 0.78, 3); await add('New Game', 'new', nx, 0.16, 0.6, 8); }
    else await add('New Adventure', 'new', nx, 0.32, 0.66, 5);
  }
  heroQuat() { const c = new THREE.PerspectiveCamera(); c.position.copy(HERO.pos); c.lookAt(HERO.look); return c.quaternion.clone(); }
  buildIcons(sc) {
    this.icons = []; const NX = -0.85, NY = -0.55, STEP = 0.2, D = 7.6;
    [['studies', 'Studies', 1.0], ['stars', 'Stars', 1.0], ['journal', 'Journal', 0.92], ['settings', 'Settings', 0.92]].forEach(([k, label, s], i) => {
      const I = makeIcon(k); const holder = new THREE.Group(); I.group.scale.setScalar(s * 1.22); holder.add(I.group);
      const b = new FloatIcon(label, { seed: 21 + i * 10, icon: holder, labelH: 0.19, style: 'gold' }); b.setBase(this.camPt(NX + STEP * i, NY, D)); b.act = k; b.I = I; b.text.position.y = -0.55; sc.add(b.group); this.icons.push(b); });
    const fill = new THREE.PointLight(0xffd0a0, 6, 6, 1.6); fill.position.copy(this.camPt(NX + STEP * 1.5, NY + 0.2, D - 2.2)); sc.add(fill); // a warm lamp on the instruments, so they read against the dusk
  }
  // ---------------------------------------------------------------- actions
  say(t) { if (!this.prof) return; try { fsay('newton', t, { anchor: this.prof, wait: false }); } catch (e) { /* */ } this.prof.talk(1.5); }
  glints(W, n) { const r = this.rnd; for (let i = 0; i < n; i++) { const q = W.sparkPoint(); this.motes.spawn({ pos: q, vel: [(r() - 0.5) * 0.08, 0.05 + r() * 0.1, 0], drag: 1.2, life: 0.5 + r() * 0.5, seq: r() < 0.6 ? 'glint' : 'twinkle', fps: 8, color: r() < 0.6 ? '#fff2c8' : '#ffd890', bright: 1.5, fadeIn: 0.03 }); } }
  burst(p, n, cols, sp = 0.6) { const r = this.rnd; for (let i = 0; i < n; i++) this.motes.spawn({ pos: [p.x, p.y, p.z], vel: [(r() - 0.5) * sp, (r() - 0.2) * sp, (r() - 0.5) * sp * 0.5], drag: 1.6, life: 0.5 + r() * 0.7, seq: r() < 0.5 ? 'glint' : 'twinkle', fps: 9, color: cols[(r() * cols.length) | 0], bright: 1.6, fadeIn: 0.02 }); }
  resume(W) { if (this.mode !== 'hero') return; this.mode = 'resume'; this.resumeT = 0; W.press(); this.glints(W, 24); audio.play('chime_soft', { vol: 0.5 }); audio.play('ui_click'); audio.play('magic_shimmer', { vol: 0.5 }); for (const w of this.words) if (w !== W) w.vis.target = 0; this.prof.act?.('cheer'); }
  hideMenu() { for (const w of this.words) w.vis.target = 0; for (const c of this.icons) c.vis.target = 0; this.hover = null; this.hoverKey = null; this.engine.renderer.domElement.style.cursor = ''; }
  toAstral(W) { if (this.mode !== 'hero') return; this.mode = 'astral'; this.skyDir = 1; this.astral.showFigures = true; this.astral.revealT = 0; this.chimed = new Set(); if (W) { W.press(); this.glints(W, 24); }
    audio.play('ui_click'); audio.play('chime_soft', { vol: 0.5 }); audio.play('whoosh_soft', { vol: 0.7 }); audio.play('magic_shimmer', { vol: 0.4, delay: 0.7 }); audio.playMusic(audio.manifest?.music?.hall ? 'hall' : 'menu', { fade: 2.4 }); audio.setAmbSet?.(['cosmos', 'wind']); // night falls: the sky's own music
    this.hideMenu(); this.prof.lookAt(-0.2, 0.9); }
  fromAstral() { if (this.mode !== 'astral' || this.skyT < 0.85 || this.chosen) return; this.skyDir = -1; this.astral.hover = -1; this.showChart(-1); audio.play('whoosh_soft', { vol: 0.5 }); audio.playMusic('menu', { fade: 2.0 }); audio.setAmbSet?.(['wind']); }
  choose(i) {
    if (this.mode !== 'astral' || this.chosen) return; const c = this.astral.cons[i]; this.chosen = { t: 0, i, id: c.id, dir: this.astral.centerDir(i), warp: 0 }; this.astral.pickIdx = i; this.astral.pickT = 0; this.astral.hover = -1; this.engine.renderer.domElement.style.cursor = ''; this.showChart(i, true);
    const n = c.fig.stars.length; audio.play('magic_sparkle', { vol: 0.7 }); audio.duckMusic?.(0.25, 3);
    for (let k = 0; k < n; k++) audio.play('chime_soft', { vol: 0.35 + k * 0.03, delay: 0.05 + (k / n) * 0.9, rate: 0.9 + k * 0.07, variance: 0, minGap: 0 }); // the stars ignite one by one, rising
    audio.play('whoosh_heavy', { vol: 0.55, delay: 1.0 }); audio.play('magic_shimmer', { vol: 0.6, delay: 1.1 }); audio.play('transition_whoosh', { vol: 0.6, delay: 1.75, minGap: 0 }); }
  camDir() { return this.look.clone().sub(this.camera.position).normalize(); }
  // the STUDIES: dive at the alembic, its liquor flares, steam rolls over the view
  toStudies(b) { if (this.mode !== 'hero') return; this.mode = 'leave'; this.leave = { t: 0, kind: 'studies', from: this.camera.position.clone(), look: this.look.clone(), at: b.group.getWorldPosition(V()) }; b.press(); this.hideMenu(); b.vis.target = 1;
    audio.play('liquid_slosh', { vol: 0.6 }); audio.play('steam_hiss', { vol: 0.4, delay: 0.35 }); audio.play('transition_whoosh', { vol: 0.5, delay: 0.55 }); this.burst(this.leave.at, 30, ['#c8fff0', '#5af0d0', '#fff6d0'], 0.9); }
  // the STARS: tilt up into the night (trails), then the galaxy transition
  toStars(b) { if (this.mode !== 'hero') return; this.mode = 'leave'; this.leave = { t: 0, kind: 'stars' }; b.press(); this.hideMenu(); this.skyDir = 1; this.astral.showFigures = false;
    audio.play('magic_sparkle', { vol: 0.6 }); audio.play('whoosh_soft', { vol: 0.7, delay: 0.1 }); audio.play('magic_shimmer', { vol: 0.5, delay: 0.8 }); this.burst(b.group.getWorldPosition(V()), 26, ['#c8b0ff', '#fff2c8', '#8aa8ff'], 0.8); this.prof.lookAt(-0.2, 0.9); }
  openPanel(kind, b) { if (this.mode !== 'hero') return; b.press(); const P = kind === 'journal' ? this.codex : this.settingsP; if (kind === 'journal') { audio.play('page_turn', { vol: 0.5, delay: 0.2 }); } else { b.I.kick?.(); audio.play('clockwork', { vol: 0.6 }); } this.mode = 'panel'; this.panelKind = kind;
    P.onClose = () => { this.mode = 'hero'; this.panelKind = null; }; P.open(); this.hover = null; this.hoverKey = null; }
  async credits() {
    const lines = ['LERFOLESE. Code, models, cards & design: made for this game.', 'Fonts: Alagard, PixelSans, NanoPlus, RuneMono and others (OFL / free licences).', 'three.js (MIT). 3D assets: Poly Haven (CC0).'];
    try { const r = await fetch('assets/audio/credits.json'); if (r.ok) { const c = await r.json(); lines.push(`Audio: ${c.length} recordings, CC0 / CC BY. Full list in assets/audio/CREDITS.md`); lines.push(...c.filter((x) => /BY/.test(x.license)).slice(0, 4).map((x) => `"${x.title}" by ${x.author} (${x.license})`)); } } catch (e) { /* */ }
    const UI = this.UI; if (this.creditP) UI.remove(this.creditP); const P = (this.creditP = UI.panel({ w: 300, h: 26 + Math.min(8, lines.length) * 14, anchor: 'top', my: 8, seed: 61, pad: 9 })); P.el.style.pointerEvents = 'none'; UI.show(P, false); requestAnimationFrame(() => UI.show(P, true));
    lines.slice(0, 8).forEach((l, i) => { const e = UI.el('div', 'lf-body' + (i ? ' lf-soft' : ''), l, P.inner); e.style.whiteSpace = 'nowrap'; e.style.overflow = 'hidden'; e.style.textOverflow = 'ellipsis'; });
    clearTimeout(this._ct); this._ct = setTimeout(() => { UI.show(P, false); }, 8000);
  }
  // ---------------------------------------------------------------- the astral STAR CHART: a detailed 2D card for the hovered constellation
  showChart(i, chosen = false) {
    if (i === this.chartI && !chosen) return; this.chartI = i; const UI = this.UI; if (this.chart) { const old = this.chart; UI.show(old, false); setTimeout(() => UI.remove(old), 400); this.chart = null; } if (i < 0) return;
    const c = this.astral.cons[i]; const S = c.start || {}; const low = this.astral.screenOf(i, this.camera).y < -0.05; const P = (this.chart = UI.panel({ w: 300, h: 92, theme: 'night', anchor: low ? 'top' : 'bottom', my: 8, seed: 7 + i, pad: 9 })); // the chart sits on the other side of the sky from its figure P.el.style.pointerEvents = 'none'; UI.show(P, false); requestAnimationFrame(() => UI.show(P, true));
    const row = UI.el('div', '', null, P.inner); Object.assign(row.style, { display: 'flex', gap: UI.px(8), height: '100%' });
    const pic = UI.el('div', '', null, row); Object.assign(pic.style, { flex: `0 0 ${UI.px(74)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(120,140,255,.08)', border: 'var(--k-px) solid rgba(200,210,255,.25)' });
    const things = [...(S.items || []).map((id) => ['item', id]), ...(S.add || []).map((id) => ['card', id]), ...(S.cards ? [['move', S.cards]] : [])];
    const first = things[0]; if (first?.[0] === 'item') import('../models/items3d.js').then(({ itemIcon }) => { try { const ic = itemIcon(first[1], 48); const cv = document.createElement('canvas'); cv.width = ic.width; cv.height = ic.height; cv.getContext('2d').drawImage(ic, 0, 0); cv.className = 'lf-cv'; cv.dataset.w = 48; cv.dataset.h = 48; if (pic.isConnected) UI.add(cv, pic); } catch (e) { /* */ } });
    else if (first) { const ids = first[0] === 'card' ? [first[1]] : first[1]; import('../gfx/cardart.js').then(({ renderCardFace }) => { try { const face = first[0] === 'move' ? null : renderCardFace({ id: ids[0], type: 'basic', up: 0 }); if (face && pic.isConnected) { const cv = document.createElement('canvas'); cv.width = face.width; cv.height = face.height; cv.getContext('2d').drawImage(face, 0, 0); cv.className = 'lf-cv lf-smooth'; cv.dataset.w = 48; cv.dataset.h = 67; UI.add(cv, pic); } else if (pic.isConnected) pic.appendChild(UI.fit(icon('flask', { accent: '#ffd040' }))); } catch (e) { /* */ } }); }
    const txt = UI.el('div', '', null, row); Object.assign(txt.style, { flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: UI.px(3) });
    const top = UI.el('div', '', null, txt); Object.assign(top.style, { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }); UI.el('div', 'lf-title', c.name, top);
    const pips = UI.el('div', '', null, top); Object.assign(pips.style, { display: 'flex', gap: UI.px(1), alignItems: 'center' }); for (let k = 1; k <= 3; k++) { const s = UI.fit(icon('star', { ramp: k <= c.diff ? undefined : ['#000', '#141a30', '#222a48', '#323c60', '#424e78', '#5a6890', '#7a88b0'] })); s.dataset.w = 9; s.dataset.h = 10; UI.fit(s); pips.appendChild(s); }
    UI.el('div', 'lf-body lf-soft', DIFF[c.diff] || '', pips).style.marginLeft = UI.px(3);
    const gives = things.map(([k, id]) => (k === 'item' ? ITEMS[id]?.name : k === 'card' ? BASICS[id]?.name + ' card' : 'the ' + c.name + ' Move')).filter(Boolean);
    if (S.maxHp) gives.push(`${S.maxHp > 0 ? '+' : ''}${S.maxHp} max health`); if (S.gold) gives.push(`+${S.gold} gold`);
    const g = UI.el('div', 'lf-body lf-goldt', gives.join('  -  '), txt); void g;
    { const b = (S.blurb || c.blurb || '').replace(/^[^:]*:\s*/, ''); UI.el('div', 'lf-body', b.charAt(0).toUpperCase() + b.slice(1), txt); }
    if (chosen) P.el.style.filter = 'brightness(1.2)';
  }
  // ---------------------------------------------------------------- input
  rc() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  busy() { return !!(this.mode !== 'hero' || this.back); }
  pick() {
    if (this.mode === 'astral') { if (this.chosen || this.skyT < 0.95) return null; const i = this.astral.pick(this.input.ndc, this.camera); return i >= 0 ? { star: i } : null; }
    if (this.busy()) return null; const r = this.rc(); const objs = [...this.words.map((w) => w.hit), ...this.icons.map((c) => c.hit), this.profHit];
    const h = r.intersectObjects(objs, true)[0]; if (!h) return null; const o = h.object; if (o.userData.word) return { word: o.userData.word }; if (o.userData.cloud) return { icon: o.userData.cloud }; if (o === this.profHit) return { isaac: true }; return null;
  }
  onMove() { const p = this.pick(); const key = p ? (p.word ? 'w:' + p.word.label : p.icon ? 'c:' + p.icon.label : p.star != null ? 's:' + p.star : 'isaac') : null;
    if (key !== this.hoverKey) { this.hoverKey = key; this.hover = p; if (this.mode === 'astral') { this.astral.hover = p ? p.star : -1; if (p) this.showChart(p.star); }
      if (p) audio.play(p.word ? 'chime_soft' : p.star != null ? 'magic_sparkle' : p.icon ? ({ studies: 'bottle_clink', stars: 'glass_clink', journal: 'paper_rustle', settings: 'lever' })[p.icon.act] || 'ui_hover' : 'ui_hover', { vol: p.word ? 0.4 : p.star != null ? 0.3 : 0.4 });
      if (p?.word) this.glints(p.word, 7); if (p?.icon) this.burst(p.icon.group.getWorldPosition(V()).add(V(0, 0.1, 0)), 6, ['#fff2c8', '#ffd890'], 0.3);
      this.engine.renderer.domElement.style.cursor = p ? 'pointer' : ''; } }
  onClick(e) {
    if (this.mode === 'intro') { this.intro.t = Math.max(this.intro.t, this.intro.dur - 0.9); return true; }
    if (this.mode === 'panel') { (this.panelKind === 'journal' ? this.codex : this.settingsP).close(); return true; }
    if (this.mode === 'astral') { if (e?.button === 2) { this.fromAstral(); return true; } const p = this.pick(); if (p) this.choose(p.star); return true; }
    if (this.busy()) return true; const p = this.pick(); if (!p) return;
    if (p.word) { if (p.word.act === 'continue') this.resume(p.word); else this.toAstral(p.word); return true; }
    if (p.icon) { const b = p.icon; if (b.act === 'studies') this.toStudies(b); else if (b.act === 'stars') this.toStars(b); else this.openPanel(b.act, b); return true; }
    if (p.isaac) { audio.play('pop', { vol: 0.4 }); this.prof.act?.('cheer'); this.say(vpick(QUIPS)); this.credits(); return true; }
  }
  onDragStart(e) { this.dragX = e.x; this.dragY = e.y; }
  onDrag(e) { if (this.dragX == null) return; if (this.mode === 'astral') { if (e.y - this.dragY > 140 && Math.abs(e.x - this.dragX) < 160) { this.dragX = null; this.fromAstral(); } } }
  onDragEnd() { this.dragX = null; }
  onWheel(e) { if (this.mode === 'astral' && (e?.dy || 0) > 60) this.fromAstral(); }
  onKey(e) { const k = e?.key || e?.code || e; if (this.mode === 'intro') { this.intro.t = this.intro.dur - 0.9; return true; }
    if (this.mode === 'panel') { (this.panelKind === 'journal' ? this.codex : this.settingsP).key(e?.code || k); return true; }
    if (this.mode === 'astral') { if (k === 'Escape' || k === 'Backspace' || k === 'ArrowDown') { this.fromAstral(); return true; } const n = parseInt(k, 10); if (n >= 1 && n <= this.astral.cons.length && this.skyT > 0.95) { this.choose(n - 1); return true; } return; }
    if (this.busy()) return;
    if (k === 'Enter' || k === ' ' || k === 'Space') { const w = this.words.find((x) => x.act === 'continue') || this.words.find((x) => x.act === 'new'); if (w.act === 'continue') this.resume(w); else this.toAstral(w); return true; }
    if (k === 'ArrowUp' || k === 'n' || k === 'KeyN') { this.toAstral(this.words.find((x) => x.act === 'new')); return true; }
    if (k === 'j' || k === 'KeyJ') { this.openPanel('journal', this.icons[2]); return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const T = this.tower, prof = this.prof, cam = this.camera; T.update(dt, t); this.vista.update(dt, t); this.town.update(dt, t); prof.update(dt);
    const nd = this.input.ndc;
    // the sky: night falls and the astral cosmos reveals as we look up (and lifts again on the way back)
    if (this.skyDir) { this.skyT = Math.max(0, Math.min(1, this.skyT + this.skyDir * dt / (this.mode === 'skyback' ? 2.6 : 2.1))); if (this.skyT <= 0 && this.skyDir < 0) { if (this.mode === 'skyback') { audio.playMusic('menu', { fade: 2.0 }); audio.setAmbSet?.(['wind']); } this.skyDir = 0; this.mode = 'hero'; this.astral.showFigures = true; for (const w of this.words) w.vis.target = 1; for (const c of this.icons) c.vis.target = 1; } }
    const sk = ease5(this.skyT);
    { const px = this.skyT > 0.6 ? 0.6 : 0; if (px !== this._pix) { this._pix = px; this.engine.setPixel?.(px); } } /* the astral sky alone gets the engine's slight pixel look; the tower menu stays full resolution */ this.vista.sky.material.uniforms.uNight.value = sk; this.astral.fade = ease(Math.max(0, (this.skyT - 0.2) / 0.8));
    // star trails while the camera tilts up or down through the sky
    { const moving = this.skyDir !== 0 && this.skyT > 0.12 && this.skyT < 0.98; const want = moving ? Math.sin(Math.PI * Math.min(1, (this.skyT - 0.12) / 0.86)) * (this.mode === 'skyback' ? 0.7 : 1) : 0; this.astral.trail += (want - this.astral.trail) * Math.min(1, dt * 5); }
    // the figures draw themselves in, a soft rising chime for each
    if (this.mode === 'astral' && this.astral.fade > 0.6 && this.chimed) for (const c of this.astral.cons) if (!this.chimed.has(c.gi) && this.astral.revealT > c.rev) { this.chimed.add(c.gi); audio.play('chime_soft', { vol: 0.28, rate: 0.85 + c.gi * 0.09, variance: 0, minGap: 0 }); }
    // camera: establishing rise -> hero shot (breathing, parallax) | back from the studies | up into the stars | a chosen constellation's warp | leaving
    if (this.mode === 'intro') { this.intro.t += dt; const u = ease5(this.intro.t / this.intro.dur); const P = this.introPath();
      const curve = this._ic || (this._ic = new THREE.CatmullRomCurve3(P.map((q) => q[0]), false, 'centripetal')); const lcurve = this._il || (this._il = new THREE.CatmullRomCurve3(P.map((q) => q[1]), false, 'centripetal'));
      cam.position.copy(curve.getPoint(u)); this.look.copy(lcurve.getPoint(u)); cam.fov = 34 + (HERO.fov - 34) * u; cam.updateProjectionMatrix(); if (this.intro.t >= this.intro.dur) { this.mode = 'hero'; this.intro = null; } }
    else if (this.mode === 'resume') { this.resumeT += dt; const u = ease(this.resumeT / 1.0); cam.position.lerp(HERO.pos.clone().add(V(0.6, 0.4, -1.2)), dt * 1.5 * u); this.look.lerp(this.words[0].group.position, dt * 0.8 * u); if (this.resumeT > 0.75 && !this.left) { this.left = true; audio.play('transition_whoosh'); this.game.continueRun(); } }
    else if (this.mode === 'leave' && this.leave.kind === 'studies') { const L = this.leave; L.t += dt; const u = ease5(L.t / 1.25); const tgt = L.at.clone().add(V(0, 0.05, 0)); cam.position.copy(L.from).lerp(tgt.clone().addScaledVector(L.from.clone().sub(tgt).normalize(), 0.7), u); this.look.copy(L.look).lerp(tgt, ease(L.t / 0.6)); cam.fov = HERO.fov - 10 * u; cam.updateProjectionMatrix();
      const b = this.icons[0]; b.I.update(0, t, 1, { ready: true }); if (L.t > 0.3 && Math.random() < dt * 30) this.burst(L.at, 2, ['#e8fff8', '#c8fff0'], 1.2);
      if (L.t > 0.95 && !this.left) { this.left = true; this.game.toStudies(); } }
    else if (this.mode === 'astral' || this.mode === 'skyback' || (this.mode === 'leave' && this.leave.kind === 'stars') || (this.skyT > 0 && this.mode !== 'hero')) { const d0 = HERO.look.clone().sub(HERO.pos).normalize(); const d = d0.clone().lerp(ASTRAL.dir, sk).normalize();
      if (this.chosen) { const C = this.chosen; C.t += dt; const u1 = ease5(Math.max(0, (C.t - 0.25) / 1.6)); d.copy(ASTRAL.dir).lerp(C.dir, u1).normalize(); C.warp = Math.max(0, Math.min(1, (C.t - 0.9) / 0.8)); this.astral.warp(C.i, ease(C.warp)); cam.fov = ASTRAL.fov + (14 - ASTRAL.fov) * ease5(Math.max(0, (C.t - 0.8) / 1.1)); cam.updateProjectionMatrix();
        if (C.t > 1.15 && !this.flashed) { this.flashed = true; this.engine.flash(0.25, 0xd8d0ff, 0.9); }
        if (C.t > 1.85 && !this.left) { this.left = true; const s = this.astral.screenOf(C.i, cam); this.showChart(-1); this.game.newRun({ start: C.id, wipe: { center: [s.x * 0.5 + 0.5, 0.5 - s.y * 0.5] } }); } }
      else { const f = HERO.fov + (ASTRAL.fov - HERO.fov) * sk; if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); } d.addScaledVector(this.astral.e1 || V(), nd.x * 0.012 * sk).addScaledVector(this.astral.e2 || V(), nd.y * 0.008 * sk).normalize(); }
      if (this.mode === 'leave' && this.leave.kind === 'stars') { this.leave.t += dt; if (this.skyT > 0.86 && !this.left) { this.left = true; this.game.toStars(); } }
      cam.position.lerp(HERO.pos.clone().add(V(0, 0.25 * sk, 0)), Math.min(1, dt * 3)); this.look.copy(cam.position).addScaledVector(d, 10); }
    else { let fov = HERO.fov, look = HERO.look.clone(), pos = HERO.pos.clone();
      if (this.back) { this.back.t += dt; const u = ease5(this.back.t / 1.8); pos = this.back.from.clone().lerp(HERO.pos, u); look = this.back.look.clone().lerp(HERO.look, u); if (u >= 1) this.back = null; }
      const drift = V(Math.sin(t * 0.13) * 0.08 + nd.x * 0.16, Math.sin(t * 0.09) * 0.05 + nd.y * 0.09, Math.sin(t * 0.07) * 0.06);
      cam.position.lerp(pos.add(drift), this.back ? 1 : Math.min(1, dt * 2.5)); this.look.lerp(look.add(V(nd.x * 0.5, nd.y * 0.3, 0)), this.back ? 1 : Math.min(1, dt * 2.5)); if (Math.abs(cam.fov - fov) > 0.01) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); } }
    cam.lookAt(this.look);
    this.astral.update(dt, t, cam, this.engine.renderer);
    // the words and the four instruments
    const hov = this.hover; for (const w of this.words) { w.update(dt, t, hov?.word === w, cam, this.vista.sunDir, nd); w.group.position.set(w.base.x + Math.sin(t * 0.21 + w.base.y) * 0.08, w.base.y + Math.sin(t * 0.37 + w.base.x) * 0.06, w.base.z); }
    for (const c of this.icons) { const h = hov?.icon === c; c.update(dt, t, cam, h); const hv = Math.max(0, c.hov.value); if (!(this.mode === 'leave' && c.act === 'studies')) c.I.update(dt, t, hv, { ready: c.act === 'studies' ? this.ready > 0 : c.act === 'stars' ? this.fresh > 0 : false, open: c.act === 'journal' && this.panelKind === 'journal' });
      if (((c.act === 'studies' && this.ready) || (c.act === 'stars' && this.fresh)) && this.mode === 'hero' && Math.random() < dt * 3) { const p = c.group.getWorldPosition(V()); const r = this.rnd; this.motes.spawn({ pos: [p.x + (r() - 0.5) * 0.4, p.y + 0.1 + r() * 0.3, p.z], vel: [(r() - 0.5) * 0.1, 0.22, 0], drag: 0.5, life: 1.3, seq: 'glint', fps: 6, color: '#ffe08a', bright: 1.6, fadeIn: 0.1 }); } }
    // Isaac: gazes over the land, glances at what you point at, looks up with you into the stars
    if (this.mode === 'astral' || this.skyT > 0.3) prof.lookAt(-0.3, 0.95); else { const tgt = hov?.word ? hov.word.group.position : hov?.icon ? hov.icon.group.position : null; if (tgt) { const p = tgt.clone().project(cam); prof.lookAt(p.x, p.y); } else prof.lookAt(-0.55 + nd.x * 0.3, 0.05 + nd.y * 0.2); }
    // ambient: warm motes drifting in the low sunlight near the lens (stardust once we look up)
    this.acc += dt * 6; const r = this.rnd; while (this.acc > 1) { this.acc--; const z = -(1.2 + r() * 7); const p = cam.localToWorld(V((r() - 0.5) * -z * 1.6, (r() - 0.5) * -z * 0.9, z)); const night = this.skyT > 0.5;
      this.motes.spawn({ pos: p, vel: [0.25 + r() * 0.2, (r() - 0.5) * 0.05, 0.05], wobble: 0.3, drag: 0.3, life: 3 + r() * 3, sprite: r() < 0.7 ? 'm1' : 'dust', color: night ? (r() < 0.5 ? '#c8d0ff' : '#e8d8ff') : r() < 0.7 ? '#ffd8a0' : '#ffe8c8', bright: 0.9 + r() * 0.5, twinkle: 2 + r() * 3, fadeIn: 0.3 }); }
    this.motes.px = Math.max(2, Math.round(this.engine.renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())).y / 320)); this.motes.update(dt, t, this.engine.renderer);
    this.updateUI(dt);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; try { fstop(); } catch (e) { /* */ } this.UI?.dispose(); this._env?.dispose(); this.motes?.dispose(); for (const c of this.icons || []) c.dispose(); for (const w of this.words || []) w.dispose(); this.astral?.dispose(); super.dispose(); }
}
