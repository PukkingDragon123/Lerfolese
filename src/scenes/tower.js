// THE TOWER-TOP MENU (LERFOLESE). Young Isaac stands on the prow of the clockwork tower at sunset, coat stirring in
// the wind, looking out over valleys, a river, villages, forests and far mountains, with clouds drifting BELOW him and
// birds wheeling round the tower. Halley the old mop dog sits at his side. The menu is the sky itself:
//   - FLOATING CLOUD BUTTONS carry forged Alagard lettering ("Resume" + "New Game", or "New Adventure"); they part,
//     swirl and lift their text on hover, puff when pressed. Pressing one glides it to the prow: Isaac steps off onto
//     it, Halley hops on, and the cloud sails down into the land (then game.newRun() / game.continueRun()).
//   - physical things on the terrace: the JOURNAL (a book on a lectern that flips open), the SETTINGS dial (a brass
//     dial you turn notch by notch: music volume), the SPYGLASS (raise it and look out to the far mountains).
//   - SWIPE LEFT (drag, wheel, Left arrow, or the "Hall of Memories" sign) turns round and walks in through the stair
//     door: the Achievement Hall (scenes/hall.js). Clicking Halley pets him (and shows the credits he guards).
// The first visit after loading opens on an establishing shot of the whole tower lit by the low sun, sweeping up to
// the hero shot (click to skip). Lighting is moody and natural: the low sun is the key, everything else is dusk.
//   game.toMenu({ from: 'loading' | 'hall' | null })  ->  new MenuScene(game).enter(opts)
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { Note } from '../ui3d/kit.js';
import { createProfessor } from '../models/professor.js';
import { createDog } from '../models/dog.js';
import { clockTower } from '../models/tower.js';
import { buildVista } from '../models/vista.js';
import { CloudButton } from '../ui3d/cloudbtn.js';
import { forgedText } from '../ui3d/text3d.js';
import { lmat, cbox } from '../models/lowprops.js';
import { Surf, RAMP, parchment, inscribeLines, pxTex } from '../ui3d/craft.js';
import { Motes } from '../gfx/motes.js';
import { save, ACHIEVEMENTS } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vpick, mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
export const HERO = { pos: V(1.3, 1.55, 0.6), look: V(-0.9, 0.2, -16), fov: 44 };
const INTRO = [[V(-30, -36, -66), V(0, -26, 0)], [V(-22, -8, -40), V(0, -6, 0)], [V(-6, 3.5, -16), V(0, 0.5, -3)], [HERO.pos, HERO.look]];
const QUIPS = ['Every action has an equal and opposite god.', 'Somewhere down there, the Bookworm Queen is reading my notes.', 'Gravity: still undefeated.', 'Halley. Stop eating the banner.', 'Mass times velocity. Mostly velocity.'];

export class MenuScene extends UIScreen {
  async enter({ from = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); save.evaluate(); this.fresh = this.freshCount();
    this.upgrades = new Set(Object.keys(save.meta.cosmetics || {}));
    const T = (this.tower = clockTower({ upgrades: this.upgrades })); sc.add(T.group);
    const VZ = (this.vista = buildVista({ groundY: -T.height - 2 })); sc.add(VZ.group); sc.fog = VZ.fog;
    this.camera = new THREE.PerspectiveCamera(HERO.fov, this.engine.aspect, 0.1, 4000); this.camera.position.copy(HERO.pos); this.look = HERO.look.clone(); this.camera.lookAt(this.look);
    this.lights(sc);
    // Isaac on the prow, turned a little toward us, gazing over the land
    const prof = (this.prof = createProfessor()); sc.add(prof.root); prof.root.position.copy(T.prow); prof.root.rotation.y = Math.PI + 0.55; prof.setIdleMode?.('still'); // TODO(combat agent): a 'heroic' idle (planted stance, coat in the wind, hand on hip) would suit this shot; it falls back to the float idle
    // Halley sits at his side
    const dog = (this.dog = createDog()); dog.hAt = () => 0; dog.area = { x: [-2.4, 2.6], z: [-5.8, 1.6] }; dog.home = V(1.05, 0, -4.65); dog.root.position.set(1.05, 0, -4.65); dog.st.heading = Math.PI + 0.3; sc.add(dog.root); dog.sitFor(6);
    this.motes = new Motes(900, { px: 2 }); sc.add(this.motes.points); this.rnd = mulberry32(31); this.acc = 0;
    this.hasRun = !!save.loadRun(); this.buildMenu(sc); this.buildProps(sc);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.55, 0.55, 0.86], ao: 0.85, exposure: 0.92, rays: { pos: VZ.sunPos, strength: 0.42, tint: 0xffa860, thresh: 0.8, decay: 0.958 },
      grade: { sat: 1.08, vib: 0.22, contrast: 1.12, vignette: 0.55, warmth: 0.08, lift: [0.008, 0.006, 0.02], gain: [1.03, 0.98, 0.94], toe: 0.04 }, ink: { fade: [25, 160], strength: 0.75 } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['wind']); audio.playMusic('menu');
    this.note = new Note({ w: 8, h: 1.3, size: 44, tail: true }); this.root.add(this.note.group);
    this.intro = from === 'loading' ? { t: 0, dur: 6.2 } : null; this.back = from === 'hall' ? { t: 0 } : null;
    if (this.intro) { this.camera.position.copy(INTRO[0][0]); this.look.copy(INTRO[0][1]); }
    if (this.back) { this.camera.position.copy(T.door).add(V(0, 0.4, -0.6)); this.look.copy(T.doorOut); }
    if (this.fresh && !this.intro) setTimeout(() => this.say(this.fresh === 1 ? 'A new memory shard glows in the Hall.' : `${this.fresh} new memory shards glow in the Hall.`), 1400);
  }
  freshCount() { const m = save.meta; return ACHIEVEMENTS.filter((a) => m.achievements[a.id] && !(m.claimed || {})[a.id]).length + (save.CHALLENGES || []).filter((a) => m.achievements[a.id] && !(m.claimed || {})[a.id]).length; }
  lights(sc) {
    const VZ = this.vista; const sun = new THREE.DirectionalLight(0xffa868, 3.1); sun.position.copy(VZ.sunDir).multiplyScalar(60); sun.target.position.set(0, 0, -2); sun.castShadow = true;
    const s = sun.shadow; s.mapSize.set(2048, 2048); s.camera.left = -9; s.camera.right = 9; s.camera.top = 9; s.camera.bottom = -9; s.camera.near = 20; s.camera.far = 140; s.bias = -0.0004; s.normalBias = 0.03; sc.add(sun, sun.target); this.sun = sun;
    sc.add(new THREE.HemisphereLight(0x6a6aa8, 0x2a1810, 0.8)); // the dusk sky above, the warm-dark land below
    const bounce = new THREE.DirectionalLight(0x8a6ab0, 0.55); bounce.position.set(-20, 18, 40); sc.add(bounce); // the violet eastern sky behind us fills the faces turned from the sun
    const face = new THREE.DirectionalLight(0xc8a0a8, 0.7); face.position.copy(HERO.pos).add(V(-2, 3, 2)); face.target.position.set(0, 1, -5.4); sc.add(face, face.target); // a soft fill from the lit clouds behind us, so faces read against the sun
    const land = new THREE.DirectionalLight(0xc0704a, 0.35); land.position.set(0, -30, -40); sc.add(land); // the sunlit land and clouds below bounce a little warmth up
  }
  // ---------------------------------------------------------------- the sky menu: title, cloud buttons, the way into the hall
  camPt(nx, ny, d, cam = { pos: HERO.pos, look: HERO.look, fov: HERO.fov }) { const c = new THREE.PerspectiveCamera(cam.fov, this.engine.aspect, 0.1, 100); c.position.copy(cam.pos); c.lookAt(cam.look); c.updateMatrixWorld(); return V(nx, ny, 0.5).unproject(c).sub(c.position).normalize().multiplyScalar(d).add(c.position); }
  floorPt(nx, ny) { const c = new THREE.PerspectiveCamera(HERO.fov, this.engine.aspect, 0.1, 100); c.position.copy(HERO.pos); c.lookAt(HERO.look); c.updateMatrixWorld(); const d = V(nx, ny, 0.5).unproject(c).sub(c.position).normalize(); const k = -c.position.y / d.y; return c.position.clone().addScaledVector(d, k); }
  buildMenu(sc) {
    const title = (this.title = forgedText('Lerfolese', { font: 'cap', unit: 0.034, depth: 5, style: 'gold', glow: 0.14 })); title.position.copy(this.camPt(-0.5, 0.66, 20)); title.lookAt(HERO.pos); sc.add(title); this.titleBase = title.position.clone();
    const tl = new THREE.PointLight(0xffc888, 22, 9, 1.6); tl.position.copy(title.position).lerp(HERO.pos, 0.2).add(V(0, 0.8, 0)); sc.add(tl); this.titleLight = tl; // a warm light on the forged letters
    this.tagline = forgedText('a science-magic odyssey', { font: 'head', unit: 0.034, depth: 2, style: 'ivory', glow: 0.1 }); this.tagline.position.copy(this.camPt(-0.5, 0.5, 20)); this.tagline.lookAt(HERO.pos); sc.add(this.tagline);
    this.clouds = [];
    const add = (label, act, nx, ny, d, seed, sub) => { const b = new CloudButton(label, { seed, w: 3.6, sub }); b.setBase(this.camPt(nx, ny, d)); b.act = act; sc.add(b.group); this.clouds.push(b); return b; };
    if (this.hasRun) { const run = save.loadRun(); add('Resume', 'continue', 0.34, 0.3, 10.5, 3, run ? `loop ${run.loop ?? '?'} · floor ${(run.floor ?? 0) + 1}` : null); add('New Game', 'new', 0.5, -0.06, 11, 8); }
    else add('New Adventure', 'new', 0.4, 0.14, 10.5, 5);
    // the way in: a forged sign hanging in the air at the left edge, beckoning back into the tower
    const hall = (this.hallSign = forgedText(this.fresh ? `< Hall of Memories (${this.fresh} new)` : '< Hall of Memories', { font: 'head', unit: 0.0062, depth: 2, style: this.fresh ? 'gold' : 'silver', glow: 0.12 })); hall.position.copy(this.camPt(-0.78, 0.3, 4.2)); hall.lookAt(HERO.pos); sc.add(hall); this.hallBase = hall.position.clone();
    this.hallHit = new THREE.Mesh(new THREE.BoxGeometry(hall.userData.size[0] * 1.1, 0.3, 0.2), new THREE.MeshBasicMaterial({ visible: false })); hall.add(this.hallHit);
    this.hallHov = new Spring(0, 8, 0.55);
  }
  // ---------------------------------------------------------------- the terrace things: journal lectern, settings dial, spyglass (each with a forged label)
  buildProps(sc) {
    this.things = [];
    const label = (text, obj, dy) => { const L = forgedText(text, { font: 'head', unit: 0.0075, depth: 2, style: 'ivory', glow: 0.14 }); L.position.set(0, dy, 0); obj.add(L); return L; };
    // JOURNAL: a walnut lectern with a leather book whose cover flips open
    { const g = new THREE.Group(); const p = V(-1.9, 0, -3.6); g.position.copy(p); g.lookAt(HERO.pos.clone().setY(0)); sc.add(g);
      const K = [[cbox(0.5, 0.06, 0.4, 0.02), 0, 0.03, 0], [cbox(0.12, 0.9, 0.12, 0.02), 0, 0.48, 0], [cbox(0.6, 0.05, 0.45, 0.015), 0, 0.95, 0.02]]; for (const [geo, x, y, z] of K) { const m = new THREE.Mesh(geo, lmat('walnut')); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); }
      const desk = new THREE.Group(); desk.position.set(0, 0.99, 0.02); desk.rotation.x = 0.42; g.add(desk);
      const S = new Surf(48, 32); parchment(S, 0, 0, 48, 32, { seed: 3, torn: 0, tone: 4 }); inscribeLines(S, ['m = F/a', 'apple ~ moon?'], { x: 3, y: 4, w: 42, h: 24 }, 'hand', 'ink', {});
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.36), [lmat('parch'), lmat('parch'), new THREE.MeshStandardMaterial({ map: pxTex(S.toCanvas()), roughness: 0.9 }), lmat('parch'), lmat('parch'), lmat('parch')]); pages.position.y = 0.03; pages.castShadow = true; desk.add(pages);
      const back = new THREE.Mesh(cbox(0.54, 0.02, 0.4, 0.008), lmat('leather')); back.rotation.x = Math.PI / 2; back.position.y = 0.0; desk.add(back);
      const hinge = new THREE.Group(); hinge.position.set(-0.26, 0.065, 0); desk.add(hinge); const cover = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.025, 0.4), lmat('leather')); cover.position.x = 0.27; cover.castShadow = true; hinge.add(cover);
      const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.09), lmat('brass')); clasp.position.set(0.52, 0.0, 0); hinge.add(clasp); const emb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), lmat('gold')); emb.scale.y = 0.3; emb.position.set(0.27, 0.016, 0); hinge.add(emb);
      const L = label('Journal', g, 1.28); this.things.push({ key: 'journal', obj: g, hinge, L, act: () => this.openJournal(), hov: new Spring(0, 9, 0.5), open: new Spring(0, 7, 0.6) }); }
    // SETTINGS: a brass dial on an iron post; each press turns it one notch (music volume)
    { const g = new THREE.Group(); const p = V(2.6, 0, -3.6); g.position.copy(p); g.lookAt(HERO.pos.clone().setY(0)); g.scale.setScalar(0.75); sc.add(g);
      const post = new THREE.Mesh(cbox(0.1, 0.92, 0.1, 0.02), lmat('iron')); post.position.y = 0.46; post.castShadow = true; g.add(post);
      const face = new THREE.Group(); face.position.set(0, 1.0, 0.02); face.rotation.x = -0.55; g.add(face);
      const S = new Surf(40, 40); for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const d = Math.hypot(x - 19.5, y - 19.5); if (d > 19.5) continue; const a = Math.atan2(y - 19.5, x - 19.5); const tick = d > 15 && d < 18.5 && Math.abs(((a / (Math.PI * 2)) * 24 + 48) % 1 - 0.5) > 0.38; S.set(x, y, RAMP.brass, d > 18.5 ? 1 : tick ? 0 : d > 14 ? 3 : 4 - (x + y < 30 ? 0 : 1)); }
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.05, 20), [lmat('brass'), new THREE.MeshStandardMaterial({ map: pxTex(S.toCanvas()), metalness: 0.7, roughness: 0.4 }), lmat('brass')]); disc.rotation.x = Math.PI / 2; disc.castShadow = true; face.add(disc);
      const knob = new THREE.Group(); knob.position.z = 0.03; face.add(knob); const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 8), lmat('bronze')); kb.rotation.x = Math.PI / 2; kb.position.z = 0.03; knob.add(kb);
      const needle = new THREE.Mesh(cbox(0.03, 0.21, 0.015, 0.005), lmat('gold')); needle.position.set(0, 0.1, 0.05); knob.add(needle);
      const L = label('Settings', g, 1.32); const vol = forgedText('Music', { font: 'head', unit: 0.016, depth: 2, style: 'gold', glow: 0.2 }); vol.position.set(0, 1.25, 0.1); vol.visible = false; g.add(vol);
      const steps = [0, 0.3, 0.6, 0.9]; const cur = steps.reduce((a, b) => (Math.abs(b - this.game.settings.music) < Math.abs(a - this.game.settings.music) ? b : a));
      const th = { key: 'settings', obj: g, knob, L, vol, act: () => this.turnDial(th), hov: new Spring(0, 9, 0.5), turn: new Spring(-steps.indexOf(cur) * Math.PI / 2, 10, 0.42), notch: steps.indexOf(cur) }; this.things.push(th); }
    // SPYGLASS: a brass telescope on a tripod; raise it to look out at the far mountains
    { const g = new THREE.Group(); const p = V(-3.05, 0, -1.9); g.position.copy(p); g.lookAt(V(-120, 0, -200)); sc.add(g);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const leg = new THREE.Mesh(cbox(0.03, 1.05, 0.03, 0.008), lmat('walnut')); leg.position.set(Math.cos(a) * 0.17, 0.5, Math.sin(a) * 0.17); leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); leg.castShadow = true; g.add(leg); }
      const pivot = new THREE.Group(); pivot.position.y = 1.0; g.add(pivot); const tube = new THREE.Group(); pivot.add(tube);
      for (const [r0, r1, z0, z1, m] of [[0.045, 0.05, -0.35, 0.05, 'brass'], [0.038, 0.04, 0.05, 0.35, 'bronze'], [0.03, 0.032, 0.35, 0.55, 'brass']]) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, z1 - z0, 8), lmat(m)); seg.rotation.x = Math.PI / 2; seg.position.z = (z0 + z1) / 2; seg.castShadow = true; tube.add(seg); }
      const L = label('Spyglass', g, 1.3); this.things.push({ key: 'spy', obj: g, tube: pivot, L, act: () => this.spyglass(), hov: new Spring(0, 9, 0.5), raise: new Spring(0, 6, 0.55) }); }
  }
  // ---------------------------------------------------------------- actions
  say(t, sec = 2.8) { if (!this.prof) return; const p = this.engine.worldToUI(this.prof.headWorld(V())); this.note.show([[[t, '#2a160c']]], Math.min(this.W - 6, p.x + 3.2), p.y + 1.8, 9); this.prof.talk(1.5); clearTimeout(this._nt); this._nt = setTimeout(() => this.note.hide(), sec * 1000); }
  async openJournal() { const th = this.things.find((x) => x.key === 'journal'); th.open.target = 1; audio.play('book_open', { vol: 0.8 }); audio.play('page_turn', { vol: 0.5, delay: 0.25 });
    setTimeout(async () => { const { Journal } = await import('./journal.js'); if (!this.journal) this.journal = new Journal(this.game, this.root); this.journal.open(); }, 520); }
  turnDial(th) { const steps = [0, 0.3, 0.6, 0.9]; th.notch = (th.notch + 1) % 4; th.turn.target -= Math.PI / 2; th.turn.kick(-2); const s = this.game.settings; s.music = steps[th.notch]; audio.vol.music = s.music; audio.applyVolumes(); save.saveSettings();
    audio.play('clockwork', { vol: 0.6 }); audio.play('ui_click', { vol: 0.5, delay: 0.08 });
    th.obj.remove(th.vol); th.vol = forgedText(`Music ${Math.round(s.music * 100)}%`, { font: 'head', unit: 0.016, depth: 2, style: 'gold', glow: 0.25 }); th.vol.position.set(0, 1.62, 0.05); th.obj.add(th.vol); th.volT = 2.2; }
  spyglass() { const th = this.things.find((x) => x.key === 'spy'); if (this.peek) return; th.raise.target = 1; audio.play('lever', { vol: 0.6 }); audio.play('glass_clink', { vol: 0.4, delay: 0.3 });
    this.peek = { t: 0 }; setTimeout(() => this.say(vpick(['The Wilds. Every myth down there is waiting to be measured.', 'Mountains, rivers, and at least one hydra. Splendid.', 'I can see my house from here. I do not have a house.']), 3.2), 900); }
  start(cloud) { // the chosen cloud glides to the prow; Isaac steps onto it, Halley hops on; it sails down into the land
    if (this.leaving) return; this.leaving = { t: 0, cloud, kind: cloud.act, from: cloud.group.position.clone(), camFrom: this.camera.position.clone(), lookFrom: this.look.clone() };
    cloud.press(this.motes); audio.play('ui_click'); audio.play('whoosh_soft', { vol: 0.7 }); for (const c of this.clouds) if (c !== cloud) { c.vis.target = 0; c.press(this.motes); }
    this.hover = null; this.engine.renderer.domElement.style.cursor = ''; this.prof.lookAt(0.2, -0.3);
  }
  toHall() { if (this.leaving || this.toHallT != null) return; this.toHallT = 0; this.hallFrom = { pos: this.camera.position.clone(), look: this.look.clone() }; audio.play('transition_whoosh', { vol: 0.6 }); audio.play('wood_creak', { vol: 0.4, delay: 0.6 }); }
  async credits() {
    const lines = ['LERFOLESE. Code, models, cards & design: made for this game.', 'Fonts: Alagard, PixelSans, NanoPlus, RuneMono and others (OFL / free licences).', 'three.js (MIT). 3D assets: Poly Haven (CC0).'];
    try { const r = await fetch('assets/audio/credits.json'); if (r.ok) { const c = await r.json(); lines.push(`Audio: ${c.length} recordings, CC0 / CC BY. Full list in assets/audio/CREDITS.md`); lines.push(...c.filter((x) => /BY/.test(x.license)).slice(0, 4).map((x) => `"${x.title}" by ${x.author} (${x.license})`)); } } catch (e) { /* */ }
    this.tip.show(lines.slice(0, 8).map((l, i) => [[l, i ? '#2a160c' : '#3a2410']]), 0, 0, 12, { maxW: 26 }); clearTimeout(this._ct); this._ct = setTimeout(() => this.tip.hide(), 8000);
  }
  // ---------------------------------------------------------------- input
  rc() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r; }
  busy() { return !!(this.leaving || this.toHallT != null || this.journal?.isOpen || (this.intro && this.intro.t < this.intro.dur)); }
  pick() {
    if (this.busy()) return null; const r = this.rc(); const objs = [...this.clouds.map((c) => c.hit), ...this.things.map((t) => t.obj), this.hallHit, this.dog.root];
    const h = r.intersectObjects(objs, true)[0]; if (!h) return null; let o = h.object; while (o) { if (o.userData.cloud) return { cloud: o.userData.cloud }; const th = this.things.find((t) => t.obj === o); if (th) return { thing: th }; if (o === this.hallHit) return { hall: true }; if (o === this.dog.root) return { dog: true }; o = o.parent; } return null;
  }
  onMove() { const p = this.pick(); const key = p ? p.cloud?.label || p.thing?.key || (p.hall ? 'hall' : 'dog') : null; if (key !== this.hoverKey) { this.hoverKey = key; this.hover = p; if (p) audio.play(p.cloud ? 'chime_soft' : 'ui_hover', { vol: p.cloud ? 0.35 : 0.4 }); if (p?.dog) this.dog.st.perk = 1; this.engine.renderer.domElement.style.cursor = p ? 'pointer' : ''; } }
  onClick() {
    if (this.intro && this.intro.t < this.intro.dur) { this.intro.t = Math.max(this.intro.t, this.intro.dur - 0.9); return true; }
    if (this.journal?.isOpen) return; if (this.busy()) return true; const p = this.pick(); if (!p) return;
    if (p.cloud) { this.start(p.cloud); return true; }
    if (p.thing) { p.thing.hov.kick(-6); p.thing.act(); return true; }
    if (p.hall) { this.toHall(); return true; }
    if (p.dog) { this.dog.pet(); audio.play('pop', { vol: 0.4 }); this.say(vpick(['Who is a good old mop? You are.', 'Halley. My only peer reviewer.', 'He keeps the credits. Do not ask why.'])); this.credits(); return true; }
  }
  onDragStart(e) { this.dragX = e.x; this.dragY = e.y; } onDrag(e) { if (this.dragX == null || this.busy()) return; if (this.dragX - e.x > 110 && Math.abs(e.y - this.dragY) < 140) { this.dragX = null; this.toHall(); } } onDragEnd() { this.dragX = null; }
  onWheel(e) { if (this.busy()) return; const d = (e?.dx || 0) + (e?.dy || 0); this.wAcc = (this.wAcc || 0) * 0.8 + d; if (this.wAcc > 120) { this.wAcc = 0; this.toHall(); } }
  onKey(e) { const k = e?.key || e?.code || e; if (this.intro && this.intro.t < this.intro.dur) { this.intro.t = this.intro.dur - 0.9; return true; } if (this.busy()) return; if (k === 'ArrowLeft' || k === 'a' || k === 'KeyA') { this.toHall(); return true; }
    if (k === 'Enter' || k === ' ' || k === 'Space') { this.start(this.clouds[0]); return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const T = this.tower, prof = this.prof; T.update(dt, t); this.vista.update(dt, t); prof.update(dt); this.dog.update(dt, t);
    const cam = this.camera; const nd = this.input.ndc;
    // camera: establishing sweep -> hero shot (breathing, parallax) | back out of the door | into the hall | following the cloud down
    if (this.intro && this.intro.t < this.intro.dur) { this.intro.t += dt; const u = ease5(this.intro.t / this.intro.dur); const n = INTRO.length - 1; const f = Math.min(n - 1e-6, u * n); const i = Math.floor(f), k = ease(f - i);
      const cp = INTRO.map((q) => q[0]), lp = INTRO.map((q) => q[1]); const curve = this._ic || (this._ic = new THREE.CatmullRomCurve3(cp, false, 'centripetal')); const lcurve = this._il || (this._il = new THREE.CatmullRomCurve3(lp, false, 'centripetal')); void i; void k;
      cam.position.copy(curve.getPoint(u)); this.look.copy(lcurve.getPoint(u)); cam.fov = 34 + (HERO.fov - 34) * u; cam.updateProjectionMatrix(); if (this.intro.t >= this.intro.dur && this.fresh) setTimeout(() => this.say(`${this.fresh} new memory shard${this.fresh > 1 ? 's glow' : ' glows'} in the Hall.`), 600); }
    else if (this.toHallT != null) { this.toHallT += dt; const u = ease5(this.toHallT / 1.9); const f = this.hallFrom; const mid = V(0.9, 1.5, 0.6);
      cam.position.copy(f.pos).lerp(mid, Math.min(1, u * 1.6)).lerp(T.door.clone().add(V(0, 0.2, 0.2)), Math.max(0, u * 1.6 - 0.6) / 1.0); this.look.copy(f.look).lerp(T.door.clone().add(V(0, 0.1, 4)), ease(u * 1.4)); cam.fov = HERO.fov + 12 * u; cam.updateProjectionMatrix();
      this.dog.goTo(V(0.6, 0, 1.6), 1.1); if (this.toHallT > 1.55 && !this.left) { this.left = true; this.game.toHall({ from: 'tower' }); } }
    else if (this.leaving) this.leaveStep(dt, t);
    else { const peek = this.peek; let fov = HERO.fov, look = HERO.look.clone(), pos = HERO.pos.clone();
      if (this.back) { this.back.t += dt; const u = ease5(this.back.t / 1.6); pos = T.door.clone().add(V(0, 0.4, -0.6)).lerp(HERO.pos, u); look = T.doorOut.clone().lerp(HERO.look, u); if (u >= 1) this.back = null; }
      if (peek) { peek.t += dt; const u = ease(peek.t / 0.9) * (1 - ease((peek.t - 3.6) / 0.9)); fov = HERO.fov - 30 * u; look.lerp(V(-260, 40, -1000), u * 0.4); if (peek.t > 4.6) { this.peek = null; const th = this.things.find((x) => x.key === 'spy'); th.raise.target = 0; } }
      const drift = V(Math.sin(t * 0.13) * 0.08 + nd.x * 0.14, Math.sin(t * 0.09) * 0.05 + nd.y * 0.08, Math.sin(t * 0.07) * 0.06);
      cam.position.lerp(pos.add(drift), this.back ? 1 : Math.min(1, dt * 2.5)); this.look.lerp(look.add(V(nd.x * 0.6, nd.y * 0.3, 0)), this.back ? 1 : Math.min(1, dt * 2.5)); if (Math.abs(cam.fov - fov) > 0.01) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); } }
    cam.lookAt(this.look);
    // the sky menu
    const hov = this.hover; for (const c of this.clouds) c.update(dt, t, cam, hov?.cloud === c);
    this.title.position.set(this.titleBase.x, this.titleBase.y + Math.sin(t * 0.4) * 0.12, this.titleBase.z); this.title.rotation.z = Math.sin(t * 0.3) * 0.01;
    this.hallHov.target = hov?.hall ? 1 : 0; this.hallHov.update(dt); const hh = this.hallHov.value; this.hallSign.position.copy(this.hallBase).add(V(-Math.abs(Math.sin(t * 2.2)) * 0.03 - hh * 0.05, hh * 0.05, 0)); this.hallSign.scale.setScalar(1 + hh * 0.12); this.hallSign.userData.face.emissiveIntensity = 0.12 + hh * 0.4 + (this.fresh ? Math.max(0, Math.sin(t * 3)) * 0.25 : 0);
    // terrace things: hover lifts their labels and lights them; each animates its own way
    for (const th of this.things) { const h = hov?.thing === th; th.hov.target = h ? 1 : 0; th.hov.update(dt); const k = th.hov.value; th.L.position.y = (th.key === 'spy' ? 1.3 : th.key === 'journal' ? 1.28 : 1.32) + k * 0.12; th.L.scale.setScalar(1 + k * 0.15); th.L.userData.face.emissiveIntensity = 0.1 + k * 0.4; th.L.quaternion.copy(th.obj.quaternion).invert().multiply(cam.quaternion);
      if (th.key === 'journal') { th.open.target = this.journal?.isOpen ? 1 : 0; th.open.update(dt); th.hinge.rotation.z = 0.32 + (Math.PI * 0.95 - 0.32) * Math.max(0, Math.min(1, th.open.value)) + k * 0.3 + Math.sin(t * 5) * 0.03 * k; }
      if (th.key === 'settings') { th.turn.update(dt); th.knob.rotation.z = th.turn.value + Math.sin(t * 9) * 0.03 * k; if (th.volT > 0) { th.volT -= dt; th.vol.visible = true; th.vol.position.y = 1.62 + (2.2 - th.volT) * 0.08; th.vol.quaternion.copy(th.L.quaternion); if (th.volT <= 0) th.vol.visible = false; } }
      if (th.key === 'spy') { th.raise.update(dt); th.tube.rotation.x = -0.12 - th.raise.value * 0.22 - k * 0.08; th.tube.rotation.y = Math.sin(t * 0.5) * 0.05 * (1 - th.raise.value); } }
    // Isaac: gazes over the land, glances at what you point at; Halley watches him
    if (!this.leaving) { const tgt = hov?.cloud ? hov.cloud.group.position : hov?.thing ? hov.thing.obj.position.clone().add(V(0, 1, 0)) : null; if (tgt) { const p = tgt.clone().project(cam); prof.lookAt(p.x, p.y); } else prof.lookAt(-0.5 + nd.x * 0.3, 0.05 + nd.y * 0.2); }
    // ambient: warm motes drifting in the low sunlight near the lens, and puffs of cloud
    this.acc += dt * 6; const r = this.rnd; while (this.acc > 1) { this.acc--; const z = -(1.2 + r() * 7); const p = cam.localToWorld(V((r() - 0.5) * -z * 1.6, (r() - 0.5) * -z * 0.9, z));
      this.motes.spawn({ pos: p, vel: [0.25 + r() * 0.2, (r() - 0.5) * 0.05, 0.05], wobble: 0.3, drag: 0.3, life: 3 + r() * 3, sprite: r() < 0.7 ? 'm1' : 'dust', color: r() < 0.7 ? '#ffd8a0' : '#ffe8c8', bright: 0.9 + r() * 0.5, twinkle: 2 + r() * 3, fadeIn: 0.3 }); }
    this.motes.px = Math.max(2, Math.round(this.engine.renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())).y / 320)); this.motes.update(dt, t, this.engine.renderer);
    this.updateUI(dt); this.note?.update(dt); this.journal?.update(dt, t);
  }
  leaveStep(dt) {
    const L = this.leaving; L.t += dt; const t = L.t; const c = L.cloud, T = this.tower, cam = this.camera; const prow = T.prow; const dock = V(prow.x, -0.65, prow.z - 1.9);
    if (t < 1.4) { const u = ease5((t - 0.15) / 1.25); c.base.copy(L.from).lerp(dock, u); }
    else if (t < 2.7) { c.base.copy(dock); if (!L.step) { L.step = true; this.prof.act('cheer'); audio.play('magic_shimmer', { vol: 0.5 }); this.dog.goTo(V(prow.x + 0.3, 0, prow.z - 0.4), 1.2); } const u = ease5((t - 1.4) / 1.1); this.prof.root.position.copy(prow).lerp(dock.clone().add(V(-0.25, 0.55, 0.1)), u); this.prof.root.rotation.y += ((Math.PI) - this.prof.root.rotation.y) * Math.min(1, dt * 3); }
    else { if (!L.hop) { L.hop = true; this.scene.attach(this.dog.root); c.group.attach(this.prof.root); c.group.attach(this.dog.root); this.dog.root.position.set(0.45, 0.55, 0.2); this.dog.st.target = null; this.dog.sitFor(9); audio.play('whoosh_heavy', { vol: 0.6 }); }
      const u = (t - 2.7); c.base.copy(dock).add(V(-u * u * 1.2, -u * u * 2.2, -u * u * 5.5)); }
    const f = ease5(Math.min(1, t / 2.6)); const want = dock.clone().add(V(2.2, 1.1, 3.0)); cam.position.copy(L.camFrom).lerp(want, f); const lk = c.group.position.clone().add(V(0, 0.3, 0)); this.look.copy(L.lookFrom).lerp(lk, Math.min(1, f * 1.4)); if (t > 2.7) { cam.fov += (30 - cam.fov) * Math.min(1, dt * 1.2); cam.updateProjectionMatrix(); }
    if (t > 3.9 && !L.gone) { L.gone = true; audio.play('transition_whoosh'); if (L.kind === 'continue') this.game.continueRun(); else this.game.newRun(); }
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; this.motes?.dispose(); for (const c of this.clouds || []) c.dispose(); super.dispose(); }
}
