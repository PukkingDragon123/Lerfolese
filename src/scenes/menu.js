// Loading screen + main menu: Newton's orchard at dusk. While the game preloads, young Newton sleeps under his apple
// tree and an apple above his head ripens (the progress bar); a carved "Click to Begin" sign swings down when all is
// ready. The click drops the apple on his head: BONK, startle, eureka, he rises into his float, night falls to full
// moonlight and the camera glides back into the menu: physical objects in the orchard (a stencilled apple crate for
// a New Loop, a lantern post to Continue, the leather Journal on a stump, the brass telescope for Settings, a scroll
// of Credits) that lift and wobble when hovered while Newton glances at them; the gilded title sign hangs from the tree.
import * as THREE from 'three';
import { Strip } from '../ui3d/objects.js';
import { uiPos } from '../ui3d/craft.js';
import { UIScreen } from '../ui3d/widgets.js';
import { Note } from '../ui3d/kit.js';
import { createProfessor } from '../models/professor.js';
import { buildOrchard, SPOTS } from '../models/orchard.js';
import { save } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { vpick } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const QUIPS = ['An apple a day keeps the gods away.', 'Every action has an equal and opposite god.', 'I was sleeping on a breakthrough.', 'Gravity: still undefeated.', 'Do not shake the tree. I mean it.'];
const SHOT = { sleep: { pos: V(3.3, 0.95, 6.6), look: V(0.75, 1.3, 0.6), fov: 40 }, menu: { pos: V(0.6, 2.4, 10.8), look: V(0.1, 2.0, 0.6), fov: 40 } };

export class MenuScene extends UIScreen {
  async enter({ intro = false, preload = null } = {}) {
    const sc = (this.scene = new THREE.Scene()); const O = (this.O = buildOrchard({ renderer: this.engine.renderer })); sc.add(O.group); sc.fog = O.fog;
    this.camera = new THREE.PerspectiveCamera(SHOT.sleep.fov, this.engine.aspect, 0.1, 420); this.look = V();
    const prof = (this.prof = createProfessor()); sc.add(prof.root); this.hasRun = !!save.loadRun();
    // the menu's physical buttons
    this.items = [
      { key: 'new', obj: O.objs.crate, act: () => this.go('new') },
      { key: 'continue', obj: O.objs.lantern, act: () => this.go('continue'), hidden: !this.hasRun },
      { key: 'journal', obj: O.objs.journal, act: () => this.openJournal() },
      { key: 'settings', obj: O.objs.telescope, act: () => this.settingsToggle() },
      { key: 'credits', obj: O.objs.scroll, act: () => this.credits() },
    ];
    for (const it of this.items) { it.pop = new Spring(0, 9, 0.32); it.lift = new Spring(0, 14, 0.38); it.wob = new Spring(0, 12, 0.2); it.base = it.obj.position.clone(); it.rotY = it.obj.rotation.y; it.obj.visible = false; it.obj.scale.setScalar(0.001); }
    this.titleDrop = new Spring(1, 7, 0.25); this.promptDrop = new Spring(1, 8, 0.22); O.prompt.group.visible = false;
    this.phase = intro ? 'sleep' : 'menu'; this.t0 = 0;
    if (intro) {
      prof.root.position.copy(SPOTS.sleep).setY(O.hAt(SPOTS.sleep.x, SPOTS.sleep.z)); prof.root.rotation.y = Math.PI / 2; prof.act?.('sleep');
      O.title.group.visible = false; this.snapShot(SHOT.sleep); O.setNight(0.25);
      this.pre = preload; this.ready = !preload; if (preload) preload.promise.then(() => { this.ready = true; this.showPrompt(); if (this.wantStart) this.startBonk(); });
      else this.showPrompt();
    } else this.composeMenu(true);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.75, 0.6, 0.7], tilt: false, grade: { sat: 1.12, contrast: 1.08, vignette: 0.55, warmth: 0.04, lift: [0.015, 0.01, 0.045] }, ink: { fade: [40, 120] } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['night', 'stream']); if (!intro) audio.playMusic('menu');
    // UI layer: speech note, the loop stats strip (menu only)
    const j = this.game.journal; this.stats = new Strip([`Loops remembered: ${j.loops} · Combinations: ${Object.keys(j.combos).length} · Best hit: ${j.bestHit || 0}`], { maxW: 24, font: 'handS', tone: 3 }); uiPos(this.stats.group, 0, -this.H + 0.85, 3); this.root.add(this.stats.group); this.stats.group.visible = !intro;
    this.note = new Note({ w: 8, h: 1.3, size: 44, tail: true }); this.root.add(this.note.group);
  }
  snapShot(s) { this.camera.position.copy(s.pos); this.look.copy(s.look); this.camera.fov = s.fov; this.camera.updateProjectionMatrix(); this.camera.lookAt(this.look); }
  showPrompt() { if (this.phase !== 'sleep') return; const p = this.O.prompt; p.group.visible = true; this.promptDrop.value = 1; this.promptDrop.target = 0; p.swing?.kick?.(4); audio.play('wood_creak', { vol: 0.35 }); }
  // the menu without the wake-up (coming back from a run, or skipping the cinematic)
  composeMenu(instant = false) {
    const { prof, O } = this; this.phase = 'menu'; O.setNight(1); O.title.group.visible = true; this.titleDrop.value = instant ? 0 : this.titleDrop.value; this.titleDrop.target = 0; O.prompt.group.visible = false; O.ripe.visible = !this.fell;
    prof.root.position.copy(SPOTS.float).setY(O.hAt(SPOTS.float.x, SPOTS.float.z)); prof.root.rotation.y = 0.12; prof.setIdleMode?.('menu');
    for (const it of this.items) { if (it.hidden) continue; it.obj.visible = true; if (instant) { it.pop.value = 1; } it.pop.target = 1; }
    this.snapShot(SHOT.menu); if (this.stats) this.stats.group.visible = true; this.O.ripe.userData.setRipe(1);
  }
  // ---------------------------------------------------------------- the wake-up: an apple falls on his head
  startBonk() {
    if (this.phase !== 'sleep') return; if (!this.ready) { this.wantStart = true; return; }
    const { O, prof } = this; this.phase = 'bonk'; this.bt = 0; this.bt0 = performance.now(); this.hit = false; this.fell = true;
    const a = O.ripe; a.userData.setRipe(1); const top = prof.headTopWorld ? prof.headTopWorld(V()) : prof.headWorld(V()).add(V(0, 0.2, 0));
    a.position.x = top.x; a.position.z = top.z; this.av = V(0, 0, 0); this.spin = V(2, 0, 3);
    O.burst(a.position.clone().add(V(0, 0.4, 0))); audio.play('wood_creak', { vol: 0.5 }); audio.play('whoosh_soft', { vol: 0.4, delay: 0.15 }); audio.playMusic('menu');
    this.promptDrop.target = -1.5; this.fromShot = { pos: this.camera.position.clone(), look: this.look.clone(), fov: this.camera.fov };
  }
  // the sequence runs on the wall clock (physics sub-stepped), so a slow frame rate cannot stall the wake-up
  updateBonk() {
    const now = (performance.now() - this.bt0) / 1000; let rem = Math.min(8, now - this.bt); while (rem > 1e-4) { const h = Math.min(rem, 1 / 60); rem -= h; this.bt += h; this.stepApple(h); }
    this.bonkTimeline();
  }
  stepApple(dt) {
    const { O, prof } = this; const a = O.ripe; const av = this.av;
    av.y -= 9.8 * dt; a.position.addScaledVector(av, dt); a.rotation.x += this.spin.x * dt; a.rotation.z += this.spin.z * dt;
    if (!this.hit) {
      const top = prof.headTopWorld ? prof.headTopWorld(V()) : prof.headWorld(V()).add(V(0, 0.2, 0));
      if (a.position.y - 0.1 <= top.y) { this.hit = true; this.hitT = this.bt; a.position.y = top.y + 0.1; av.set(1.4, 2.7, 1.0); this.spin.set(9, 0, -12);
        audio.play('hit_wood', { vol: 0.9 }); audio.play('apple_crunch', { vol: 0.35 }); audio.play('pop', { vol: 0.5 }); this.engine.shake(0.28);
        const p = prof.act?.('bonk'); (p && p.then ? p : new Promise((r) => setTimeout(r, 2400))).then(() => { this.woke = true; }); }
    }
    const gy = O.hAt(a.position.x, a.position.z) + 0.1; if (a.position.y < gy) { a.position.y = gy; if (av.y < -0.8) { av.y = -av.y * 0.38; av.x *= 0.7; av.z *= 0.7; audio.play('wood_knock', { vol: 0.25 }); } else { av.y = 0; const k = Math.exp(-2.2 * dt); av.x *= k; av.z *= k; this.spin.multiplyScalar(k); } }
  }
  bonkTimeline() {
    const { O, prof } = this; const a = O.ripe; if (!this.hit) return;
    const t2 = this.bt - this.hitT;
    if (t2 > 1.15 && !this.eureka) { this.eureka = true; audio.play('eureka', { vol: 0.8 }); }
    // the camera pulls back and glides into the menu composition; night deepens to moonlight
    const k = ease5((t2 - 1.25) / 3.0); const f = this.fromShot, m = SHOT.menu;
    if (t2 < 1.25) { const punch = Math.sin(Math.min(1, t2 / 0.35) * Math.PI) * 0.12; this.camera.position.copy(f.pos).lerp(a.position, punch * 0.25); this.look.copy(f.look); }
    else { const arc = Math.sin(k * Math.PI) * 1.6; this.camera.position.copy(f.pos).lerp(m.pos, k).add(V(0, arc, 0)); this.look.copy(f.look).lerp(m.look, ease(k * 1.15)); this.camera.fov = f.fov + (m.fov - f.fov) * k; this.camera.updateProjectionMatrix(); }
    O.setNight(0.25 + 0.75 * ease((t2 - 0.6) / 3.2));
    // Newton, awake, drifts from the roots to his place in front of the tree
    if (t2 > 2.35) { if (!this.moveFrom) { this.moveFrom = { p: prof.root.position.clone(), ry: prof.root.rotation.y }; } const u = ease((t2 - 2.35) / 1.5); const to = SPOTS.float.clone().setY(O.hAt(SPOTS.float.x, SPOTS.float.z)); prof.root.position.copy(this.moveFrom.p).lerp(to, u); prof.root.rotation.y = this.moveFrom.ry + (0.12 - this.moveFrom.ry) * u; if (u >= 1 && !this.idleSet) { this.idleSet = true; prof.setIdleMode?.('menu'); } }
    // the menu objects spring up one by one; the title sign drops on its ropes
    this.items.forEach((it, i) => { if (!it.hidden && t2 > 2.3 + i * 0.2 && !it.shown) { it.shown = true; it.obj.visible = true; it.pop.target = 1; it.pop.kick?.(2); audio.play('wood_knock', { vol: 0.25, delay: 0.05 }); } });
    if (t2 > 2.9 && !this.O.title.group.visible) { this.O.title.group.visible = true; this.titleDrop.value = 1; this.titleDrop.target = 0; audio.play('wood_creak', { vol: 0.4 }); }
    if (t2 > 4.4) { this.phase = 'menu'; this.stats.group.visible = true; if (!this.idleSet) { this.idleSet = true; prof.setIdleMode?.('menu'); } }
  }
  // ---------------------------------------------------------------- menu actions (the existing handlers)
  async openJournal() { const { Journal } = await import('./journal.js'); if (!this.journal) this.journal = new Journal(this.game, this.root); this.journal.open(); }
  settingsToggle() {
    const s = this.game.settings; const steps = [0, 0.3, 0.6, 0.9]; s.music = steps[(steps.indexOf(steps.reduce((a, b) => (Math.abs(b - s.music) < Math.abs(a - s.music) ? b : a))) + 1) % 4];
    audio.vol.music = s.music; audio.applyVolumes(); save.saveSettings(); this.say(`Music volume: ${Math.round(s.music * 100)}%. Click the telescope again to cycle.`);
  }
  async credits() {
    const lines = ['Code, models, cards & design: made for this game.', 'Fonts: Alagard, Pixelify Sans, VT323, Silkscreen, Caveat, Tiny5, Jacquard 24 (OFL), Homemade Apple (Apache 2.0).', 'three.js (MIT). 3D assets: Poly Haven (CC0).'];
    try { const r = await fetch('assets/audio/credits.json'); if (r.ok) { const c = await r.json(); lines.push(`Audio: ${c.length} recordings, CC0 / CC BY. Full list in assets/audio/CREDITS.md`); lines.push(...c.filter((x) => /BY/.test(x.license)).slice(0, 5).map((x) => `"${x.title}" by ${x.author} (${x.license})`)); } } catch (e) { /* */ }
    this.tip.show(lines.slice(0, 9).map((l, i) => [[l, i ? '#2a160c' : '#3a2410']]), 0, 0, 12, { maxW: 26 }); clearTimeout(this._ct); this._ct = setTimeout(() => this.tip.hide(), 9000);
  }
  say(t) { const p = this.engine.worldToUI(this.prof.headWorld(V())); this.note.show([[[t, '#2a160c']]], p.x + 3, p.y + 1.6, 9); this.prof.talk(1.5); audio.play('wood_knock', { vol: 0.4 }); clearTimeout(this._nt); this._nt = setTimeout(() => this.note.hide(), 2600); }
  async go(kind) {
    if (this.leaving) return; this.leaving = true; audio.play('transition_whoosh'); audio.play('magic_shimmer');
    this.goT = 0; this.goFrom = { pos: this.camera.position.clone(), look: this.look.clone() }; this.goTo = (kind === 'continue' ? this.O.objs.lantern : this.O.objs.crate).position.clone().add(V(0, 0.6, 0));
    await new Promise((r) => { this.goDone = r; });
    this.engine.flash(1, 0xfff6cf, 0.8);
    if (kind === 'continue') this.game.continueRun(); else this.game.newRun();
  }
  // ---------------------------------------------------------------- input
  rayWorld(objs) { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); return r.intersectObjects(objs.filter((o) => o.visible), true); }
  pickItem() { if (this.phase !== 'menu' || this.leaving || this.journal?.isOpen) return null; const hits = this.rayWorld(this.items.filter((it) => !it.hidden).map((it) => it.obj)); if (!hits.length) return null; let o = hits[0].object; while (o) { const it = this.items.find((x) => x.obj === o); if (it) return it; o = o.parent; } return null; }
  onMove() { const h = this.pickItem(); if (h !== this.hover) { if (this.hover) this.hover.hover = false; this.hover = h; if (h) { h.hover = true; h.wob.kick?.(6); audio.play('ui_hover', { vol: 0.45 }); } this.engine.renderer.domElement.style.cursor = h ? 'pointer' : ''; } }
  onClick() {
    if (this.journal?.isOpen) return;
    if (this.phase === 'sleep') { this.startBonk(); return true; }
    if (this.phase === 'bonk') { if (this.hit && this.bt - this.hitT > 0.4) { this.prof.act?.('cheer'); this.composeMenu(false); } return true; }
    const it = this.pickItem(); if (it) { it.pop.kick?.(-3); it.wob.kick?.(-8); audio.play('card_place', { vol: 0.6 }); it.act(); return true; }
    if (this.rayWorld([this.prof.root]).length) { this.say(vpick(QUIPS)); this.prof.act('cheer'); return true; }
  }
  update(dt, t) {
    const { O, prof } = this; O.update(dt, t); prof.update(dt);
    if (this.phase === 'sleep') {
      const k = this.pre ? Math.min(1, this.pre.progress()) : 1; this.ripeK = Math.max(this.ripeK || 0, k); const r = this.ripeK; O.ripe.userData.setRipe(r); O.ripe.scale.setScalar(0.22 * (0.62 + 0.38 * r)); O.ripe.rotation.z = Math.sin(t * 1.4) * 0.12;
      const top = prof.headTopWorld ? prof.headTopWorld(V()) : null; if (top) { O.ripe.position.x += (top.x - O.ripe.position.x) * Math.min(1, dt * 2); O.ripe.position.z += (top.z - O.ripe.position.z) * Math.min(1, dt * 2); }
      const s = SHOT.sleep; this.camera.position.set(s.pos.x + Math.sin(t * 0.25) * 0.08, s.pos.y + Math.sin(t * 0.33) * 0.04, s.pos.z); this.look.copy(s.look);
    } else if (this.phase === 'bonk') this.updateBonk();
    else if (this.leaving && this.goFrom) { this.goT += dt; const u = ease(this.goT / 1.25); this.camera.position.copy(this.goFrom.pos).lerp(this.goTo, u * 0.85); this.look.copy(this.goFrom.look).lerp(this.goTo, u); if (this.goT > 1.25 && this.goDone) { const d = this.goDone; this.goDone = null; d(); } }
    else { const m = SHOT.menu, nd = this.input.ndc; this.camera.position.set(m.pos.x + Math.sin(t * 0.12) * 0.35 + nd.x * 0.45, m.pos.y + nd.y * 0.25, m.pos.z); this.look.copy(m.look); if (Math.abs(this.camera.fov - m.fov) > 0.01) { this.camera.fov += (m.fov - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); } }
    if (this.camOverride) { this.camera.position.copy(this.camOverride.pos); this.look.copy(this.camOverride.look); } // debug / screenshot framing
    this.camera.lookAt(this.look);
    // the physical buttons: pop in, lift and wobble when hovered; Newton glances at what you point at
    for (const it of this.items) { it.pop.update(dt); it.lift.target = it.hover ? 0.14 : 0; it.lift.update(dt); it.wob.update(dt); const s = Math.max(0.001, it.pop.value); it.obj.scale.setScalar(s); it.obj.position.set(it.base.x, it.base.y + it.lift.value, it.base.z); it.obj.rotation.set(0, it.rotY + it.wob.value * 0.02, it.wob.value * 0.012); }
    if (this.phase === 'menu') { if (this.hover) { const p = this.hover.obj.getWorldPosition(V()).add(V(0, 0.6, 0)).project(this.camera); prof.lookAt(p.x, p.y); } else prof.lookAt(this.input.ndc.x * 0.6, this.input.ndc.y * 0.4); }
    this.titleDrop.update(dt); this.promptDrop.update(dt); O.title.group.position.set(SPOTS.title.x, SPOTS.title.y + this.titleDrop.value * 2.4, SPOTS.title.z); O.prompt.group.position.set(SPOTS.prompt.x, SPOTS.prompt.y + this.promptDrop.value * 1.8, SPOTS.prompt.z);
    const pp = this.ptr(4); this.stats?.update(dt, pp); this.updateUI(dt); this.note?.update(dt); this.journal?.update(dt, t);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; super.dispose(); }
}
