// End of a loop. Victory: the Wilds fall silent. DEFEAT = RECONSTRUCTION: Isaac shatters into light and star fragments
// in the dark between worlds; the fragments are drawn up into the star-viewing dome, spiral round the great telescope
// and pull back together into him (voiced by his cosmic self and the Master); then the Journal's record of the run and
// the way back to the garden. Click / Space skips to the record.
import * as THREE from 'three';
import { holdToSkip } from '../ui2d/skiphold.js';
import { cineText } from '../ui3d/cinetext.js';
import { spaceBackdrop } from '../gfx/spacebg.js';
import { Motes } from '../gfx/motes.js';
import { DRAW, Px } from '../ui2d/menusprites.js';
import { Signboard, Strip } from '../ui3d/objects.js';
import { Panel } from '../ui3d/widgets.js';
import { uiPos } from '../ui3d/craft.js';
import { UIScreen, Button3D, tabletopWorld } from '../ui3d/widgets.js';
import { audio } from '../core/audio.js';
import { tweens } from '../core/tween.js';
import { Letterbox } from './cinematic.js';
import { createProfessor } from '../models/professor.js';
import { createMaster } from '../models/npcs/story.js';
import { buildDome, setBuilder } from '../story/stage.js';
import { say, narrate, stopAll, ensureFonts } from '../story/dialogue.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const SKIP = Symbol('skip');

// light-and-star fragments: four-pointed star shards (instanced, additive, gold to cyan)
function fragments(n) {
  const s = new THREE.Shape(); const P = 4; for (let i = 0; i <= P * 2; i++) { const a = (i / (P * 2)) * Math.PI * 2, r = i % 2 ? 0.018 : 0.07; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ShapeGeometry(s); const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.userData.noInk = true; const col = new THREE.Color();
  for (let i = 0; i < n; i++) { col.set(i % 3 ? 0xffe08a : i % 5 ? 0x9fe8ff : 0xffffff).multiplyScalar(1.6); m.setColorAt(i, col); }
  return m;
}
function bodyPoints(hero, n) { // points on the hero's real surface (skinned mesh in its current pose)
  hero.root.updateMatrixWorld(true); let sk = null; hero.root.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; });
  const out = []; if (!sk) { for (let i = 0; i < n; i++) out.push(hero.root.position.clone().add(V((Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 1.8, (Math.random() - 0.5) * 0.3))); return out; }
  const p = sk.geometry.attributes.position; const v = V();
  for (let i = 0; i < n; i++) { const k = (Math.random() * p.count) | 0; v.fromBufferAttribute(p, k); sk.applyBoneTransform?.(k, v); out.push(v.clone().applyMatrix4(sk.matrixWorld)); }
  return out;
}
// ---------------------------------------------------------------- the unlock reveal stage
const KIND = { feature: { style: 'gold', gem: '#e8b85a', pts: 4, snd: 'metal_clang' }, star: { style: 'starlight', gem: '#cfd8ff', pts: 4, snd: 'magic_sparkle' }, mastery: { style: 'silver', gem: '#e6ecf4', pts: 5, snd: 'glass_clink' }, study: { style: 'bronze', gem: '#d0904a', pts: 6, snd: 'bottle_clink' } };
function gemMesh(kind, key) {
  const K = KIND[kind] || KIND.star;
  if (kind === 'feature' && key && DRAW[key]) { // the freed instrument: its hand-pixelled icon, crisp, on a thin bevelled brass plaque
    const P = new Px(56, 56); DRAW[key](P, 0.3, { hov: 1, spin: 0.6, open: key === 'journal' }); P.outline([255, 220, 140], 160);
    const c = document.createElement('canvas'); c.width = c.height = 56; c.getContext('2d').putImageData(new ImageData(P.d, 56, 56), 0, 0); const tx = new THREE.CanvasTexture(c); tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: tx, transparent: true, alphaTest: 0.5, toneMapped: false, side: THREE.DoubleSide })); m.position.z = 0.02; g.add(m); return g; }
  const s = new THREE.Shape(); const n = K.pts * 2; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? (K.pts === 6 ? 0.3 : 0.16) : 0.42; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 1, curveSegments: 1 }); geo.center();
  const col = new THREE.Color(K.gem); return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, emissive: col.clone().multiplyScalar(0.25), metalness: 0.85, roughness: 0.28, flatShading: true }));
}
class UnlockReveal {
  constructor(S, list) {
    this.S = S; this.E = S.engine; this.list = list.slice(0, 9); this.t = 0; this.finished = false; this.rnd = Math.random;
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x05060a); this.bg = spaceBackdrop(); sc.add(this.bg.mesh);
    const asp = this.E.aspect; const dist = Math.max(10, 7.4 / (0.728 * asp)); this.cam = new THREE.PerspectiveCamera(40, asp, 0.1, 200); this.cam.position.set(0, 0, dist); this.base = this.cam.position.clone();
    const key = new THREE.DirectionalLight(0xffe2b8, 2.6); key.position.set(-3, 4, 6); const rim = new THREE.DirectionalLight(0x8aa0d8, 1.6); rim.position.set(4, -1, -3); sc.add(key, rim, new THREE.HemisphereLight(0x6a76a0, 0x14100c, 0.7));
    this.flare = new THREE.PointLight(0xffe0a0, 0, 7, 1.6); sc.add(this.flare); this.motes = new Motes(900, { px: 2 }); sc.add(this.motes.points);
    const maxW = Math.min(9, 0.728 * dist * asp * 0.8);
    this.title = cineText('Checkmate', { height: 0.95, style: 'gold', maxW, glow: 0.1 }); this.title.position.set(0, 2.72, 0); this.title.scale.setScalar(0.001); sc.add(this.title);
    this.sub = cineText(this.list.length ? 'Newly unlocked' : 'The stars hold their breath. Nothing new, this time.', { height: 0.2, style: 'ivory', maxW, depth: 1.4 }); this.sub.position.set(0, 2.02, 0); this.sub.scale.setScalar(0.001); sc.add(this.sub);
    const n = this.list.length; const rowH = Math.min(1.0, 4.3 / Math.max(1, n)); const k = Math.min(1, rowH / 1.0);
    this.items = this.list.map((u, i) => { const K = KIND[u.kind] || KIND.star; const g = new THREE.Group(); g.position.set(0, 1.62 - (i + 0.5) * rowH, 0); g.scale.setScalar(0.001); sc.add(g);
      const name = cineText(u.name, { height: 0.36 * k, style: K.style, maxW: maxW - 1.2 * k, glow: 0.06 }); const text = cineText(u.text, { height: 0.15 * k, style: 'ivory', maxW: maxW - 1.2 * k, depth: 1.2 });
      const nw = Math.max(name.userData.size[0], text.userData.size[0]); name.position.set(0.55 * k + (name.userData.size[0] - nw) / 2, 0.1 * k, 0); text.position.set(0.55 * k + (text.userData.size[0] - nw) / 2, -0.24 * k, 0); g.add(name, text);
      const gem = gemMesh(u.kind, u.key); gem.scale.setScalar(k * (u.kind === 'feature' ? 0.95 : 0.9)); gem.position.set(-nw / 2 - 0.15 * k, 0, 0.1); g.add(gem);
      return { u, g, gem, name, text, at: 1.7 + i * 1.05, shown: false, k, home: g.position.clone() }; });
    this.prompt = cineText('Return to the tower', { height: 0.27, style: 'ivory', maxW, depth: 1.4 }); this.prompt.position.set(0, -3.1, 0); this.prompt.scale.setScalar(0.001); sc.add(this.prompt);
    this.endAt = (this.items.at(-1)?.at ?? 1.2) + 1.4;
  }
  fast() { this.t = Math.max(this.t, this.endAt - 0.2); }
  burst(p, n, col, sp = 1) { const r = this.rnd; for (let i = 0; i < n; i++) { const d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 0.6).normalize().multiplyScalar((0.4 + r() * 1.4) * sp);
      this.motes.spawn({ pos: p, vel: d, drag: 2.2, grav: 0.05, life: 0.8 + r() * 1.2, seq: r() < 0.6 ? 'twinkle' : 'glint', fps: 8 + r() * 4, color: col[Math.floor(r() * col.length)], bright: 1.4 + r(), fadeIn: 0.02 }); } }
  update(dt, t) {
    this.t += dt; const T = this.t; const E = this.E;
    const pop = (o, t0, d = 0.55) => { const u = Math.max(0, Math.min(1, (T - t0) / d)); const b = u <= 0 ? 0.001 : 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2); o.scale.setScalar(Math.max(0.001, b)); return u; };
    const ut = pop(this.title, 0.3, 0.8); if (ut > 0 && !this.tOn) { this.tOn = true; audio.play('chime_soft', { vol: 0.5, rate: 0.7 }); this.burst(this.title.position, 60, ['#ffe2a0', '#fff6d8', '#c8b0ff'], 1.6); E.flash?.(0.25, 0xfff0c8, 0.5); }
    pop(this.sub, 0.95, 0.5); const TU = this.title.userData.U; if (TU?.uSweep) { TU.uSweep.value = ((T * 0.45) % 2.4) * 2.6 - 2.6; TU.uShine.value = 0.5; }
    for (const [i, it] of this.items.entries()) { const u = pop(it.g, it.at, 0.6); if (u <= 0) continue;
      if (!it.shown) { it.shown = true; const K = KIND[it.u.kind] || KIND.star; audio.play('chime_soft', { vol: 0.45, rate: 0.9 + i * 0.09, variance: 0, minGap: 0 }); audio.play(K.snd, { vol: 0.35 }); if (it.u.kind === 'feature') { audio.play('glass_break', { vol: 0.25, rate: 1.3 }); } audio.play('magic_shimmer', { vol: 0.2, delay: 0.1 });
        const p = it.g.position.clone().add(it.gem.position); this.flare.position.copy(p).add(new THREE.Vector3(0, 0, 1.2)); this.flare.color.set(K.gem); this.flare.intensity = 22; this.burst(p, it.u.kind === 'feature' ? 50 : 32, [K.gem, '#fff6d8', '#ffffff'], 1.1);
        if (it.u.kind === 'feature') for (let k = 0; k < 18; k++) this.motes.spawn({ pos: p, vel: [(Math.random() - 0.5) * 2.4, 0.6 + Math.random() * 1.2, (Math.random() - 0.5)], grav: 2.4, drag: 0.4, life: 1.2, sprite: 'dust', color: '#5a6070', bright: 0.9, k: 2 }); } // the chains fall away
      it.g.position.y = it.home.y + (1 - u) * -0.5; it.gem.rotation.y = (1 - Math.min(1, (T - it.at) / 1.2)) * 9 + Math.sin(T * 1.3 + i) * 0.35; it.gem.rotation.z = Math.sin(T * 0.9 + i) * 0.08;
      const NU = it.name.userData.U; if (NU?.uSweep) { NU.uSweep.value = Math.min(3, (T - it.at) * 4 - 2.6); NU.uShine.value = 0.6; } }
    this.flare.intensity *= Math.exp(-dt * 3.2);
    if (T > this.endAt) { if (!this.finished) { this.finished = true; audio.play('chime_soft', { vol: 0.35, rate: 1.2 }); } pop(this.prompt, this.endAt, 0.5); const PU = this.prompt.userData.U; if (PU?.uGlow) PU.uGlow.value = 0.08 + 0.08 * Math.sin(T * 3); }
    if (Math.random() < dt * 10) this.motes.spawn({ pos: [(Math.random() - 0.5) * 12, -4 + Math.random() * 8, -2 - Math.random() * 4], vel: [0.02, 0.05, 0], life: 4 + Math.random() * 3, sprite: 'm1', color: Math.random() < 0.5 ? '#c8d0e8' : '#e8dcc0', bright: 0.7 + Math.random() * 0.4, twinkle: 2 + Math.random() * 3, fadeIn: 0.4 });
    const nd = this.S.input.ndc; this.cam.position.set(this.base.x + nd.x * 0.35 + Math.sin(t * 0.2) * 0.1, this.base.y + nd.y * 0.22, this.base.z); this.cam.lookAt(0, 0.1, 0);
    this.bg.update(dt, t, E.renderer, { x: nd.x * 14, y: nd.y * 8 }); this.motes.update(dt, t, E.renderer);
  }
  dispose() { this.motes?.dispose(); this.scene.traverse((o) => { if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose(); }); }
}

const RECON = [
  ['cosmic', 'You are not broken, Isaac. Only scattered.', 'master', 'Again? Gather yourself. The stars remember your shape, even when you forget it.'],
  ['cosmic', 'Every law you learned is still in you. Come back together.', 'master', 'Up you get. Falling is only gravity being honest with you.'],
  ['cosmic', 'The story is not finished. Neither are you.', 'master', 'Welcome back. The Wilds have not moved. Neither has the apple\'s appetite.'],
];

export class EndScene extends UIScreen {
  async enter(won, unlocks = []) {
    this.won = won;
    if (won) { try { return await this.reveal(unlocks); } catch (e) { console.warn('unlock reveal', e); } } // a won run: everything it opened, then the tower
    if (!won) { try { await this.reconstruct(); } catch (e) { if (e !== SKIP) console.warn('reconstruction', e); } }
    await this.record(won);
  }
  // ------------------------------------------------------------------ RUN-END UNLOCKS (a won run): in the quiet of deep space, CHECKMATE in
  // cast gold, then each thing this win opened arrives in turn: a faceted gem (an instrument's freed pixel icon for the
  // menu features) spins in out of the dark with a chime that climbs the scale, a flare of light and a spray of star
  // dust; its name in high-res Alagard cast metal and a line of what it gives rise beneath. Then back to the tower.
  async reveal(list) {
    await ensureFonts(); const U = (this.unl = new UnlockReveal(this, list)); this.engine.setWorld(U.scene, U.cam);
    this.engine.setFx({ bloom: [0.55, 0.5, 0.8], exposure: 1.02, ao: false, grade: { sat: 0.95, vib: 0.1, contrast: 1.08, vignette: 0.55, warmth: 0.04, lift: [0.006, 0.006, 0.02] }, ink: false });
    this.engine.add(this); audio.playMusic(audio.manifest?.music?.hall ? 'hall' : 'map'); audio.setAmbSet?.(['cosmos']); audio.play('sting_victory', { vol: 0.6 });
    const eat = () => true; const go = () => { if (U.left) return; if (!U.finished) { U.fast(); return; } U.left = true; audio.play('transition_whoosh', { vol: 0.5 }); this.game.toMenu({ from: null }); };
    this.revH = this.input.push({ modal: true, click: () => { go(); return true; }, key: (e) => { if (['Space', 'Enter', 'Escape'].includes(e.code)) go(); return true; }, move: eat, down: eat });
    window.__unlocks = { list, scene: this, go };
  }
  // ------------------------------------------------------------------ the reconstruction cinematic
  w(p) { return Promise.race([p, this.skipP]).then((r) => { if (this.skipped) throw SKIP; return r; }); }
  wait(s) { return this.w(new Promise((r) => setTimeout(r, s * 1000))); }
  tween(d, fn) { return this.w(new Promise((res) => this.ups.push({ t: 0, d, fn, res }))); }
  async reconstruct() {
    await ensureFonts(); this.ups = []; this.skipP = new Promise((r) => (this._skip = r));
    const skip = () => { if (this.skipped) return; this.skipped = true; stopAll(); this._skip(); };
    const eat = () => true; this.cineH = this.input.push({ modal: true, click: eat, key: eat }); this.skipper = holdToSkip(skip); // the shared hold-to-skip
    this.bars = new Letterbox(this.root); this.bars.show(); window.__storyBand = true;
    const cam = (this.cam = new THREE.PerspectiveCamera(36, this.engine.aspect, 0.1, 400)); this.camT = { p: V(0, 1.6, 5.5), l: V(0, 1.3, 0) };
    // the void where he fell: deep space, a bed of drifting dust, the hero kneeling in a pool of cold light
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x06040e); sc.fog = new THREE.Fog(0x06040e, 12, 60);
    const N = 1400; const sp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 1.4, r = 30 + Math.random() * 30; sp.set([Math.cos(e) * Math.sin(a) * r, Math.sin(e) * r, -Math.cos(e) * Math.cos(a) * r], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe8e0ff, size: 2, sizeAttenuation: false, toneMapped: false })); stars.userData.noInk = true; sc.add(stars);
    sc.add(new THREE.HemisphereLight(0x5a5ac0, 0x100818, 0.8)); const key = new THREE.SpotLight(0xbfd8ff, 30, 14, 0.5, 0.6); key.position.set(0.5, 6, 2); key.target.position.set(0, 0, 0); sc.add(key, key.target);
    const hero = createProfessor(); hero.root.position.set(0, 0, 0); hero.setIdleMode?.('still'); sc.add(hero.root); this.hero = hero;
    this.world = { scene: sc, camera: cam, update: () => {} }; this.engine.setWorld(sc, cam); this.engine.setFx({ bloom: [0.9, 0.7, 0.55], grade: { warmth: -0.1, vignette: 0.6, sat: 1.0 } });
    this.engine.add(this); audio.playMusic('journal');
    const lines = RECON[(this.game.journal?.loops || 0) % RECON.length];
    hero.act('hurt'); setTimeout(() => hero.act('die'), 500);
    await this.narr('And there, far from the garden, Isaac Newton fell.');
    // he shatters into light
    const n = 220; const frag = fragments(n); sc.add(frag); this.frag = frag; const pts = bodyPoints(hero, n);
    this.fr = pts.map((p) => ({ p: p.clone(), v: p.clone().sub(V(0, 1, 0)).normalize().multiplyScalar(0.6 + Math.random() * 2.2).add(V(0, 0.6 + Math.random(), 0)), r: Math.random() * 6, s: 0.6 + Math.random() * 0.9, spin: (Math.random() - 0.5) * 6 }));
    hero.root.visible = false; this.engine.flash(0.7, 0xfff4d0, 0.5); audio.play('glass_break', { vol: 0.7 }); audio.play('magic_shimmer'); this.engine.shake(0.35); this.mode = 'burst';
    this.camT = { p: V(0.8, 1.8, 6.5), l: V(0, 1.6, 0), d: 4 };
    await this.say(lines[0], lines[1], { headWorld: (o) => o.set(0, 2.4, 0) });
    // up through the dark, into the star-viewing dome
    const build = setBuilder('dome', buildDome); let D; try { D = await build({ renderer: this.engine.renderer }); } catch (e) { D = buildDome(); }
    const ds = new THREE.Scene(); ds.add(D.group); ds.background = D.background || new THREE.Color(0x0a0c22); ds.fog = new THREE.Fog(0x0a0c22, 30, 140);
    const spots = D.group.userData.spots || { master: V(-1.2, 0, -1.4), hero: V(1.6, 0, 2.2) }; const at = V(0, 0, 0.6);
    const m = createMaster(); m.root.position.copy(spots.master); m.root.rotation.y = Math.atan2(at.x - spots.master.x, at.z - spots.master.z); ds.add(m.root); this.master = m; m.lookAtWorld(at.clone().add(V(0, 1.4, 0)));
    const h2 = createProfessor(); h2.root.position.copy(at); h2.root.rotation.y = Math.atan2(spots.master.x - at.x, spots.master.z - at.z); h2.root.visible = false; h2.setIdleMode?.('still'); ds.add(h2.root); this.hero2 = h2;
    await this.w(this.engine.wipe(async () => {
      this.engine.setWorld(ds, cam); sc.remove(frag); ds.add(frag); this.world.scene = ds; this.engine.setFx({ bloom: [0.85, 0.65, 0.6], grade: { warmth: 0.2, vignette: 0.5 } });
      const tgt = bodyPoints(h2, n); const sky = V(0, 12, -6); this.fr.forEach((f, i) => { f.p.copy(sky).add(V((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 4)); f.to = tgt[i]; f.t0 = Math.random() * 0.5; }); this.mode = 'gather'; this.gT = 0;
      this.camT = { p: V(3.4, 1.6, 5.6), l: V(0, 2.4, 0.4) }; cam.position.copy(this.camT.p); cam.lookAt(this.camT.l);
    }, { style: 'galaxy' })); // reconstruction: the galaxy transition
    audio.play('magic_shimmer'); this.camT = { p: V(2.6, 1.5, 4.2), l: V(0, 1.4, 0.6), d: 5 };
    await this.wait(2.4);
    await this.say('master', lines[3], m);
    await this.w(new Promise((r) => { const c = () => (this.gT > 3.4 ? r() : setTimeout(c, 50)); c(); }));
    h2.root.visible = true; this.mode = 'done'; frag.visible = false; this.engine.flash(0.5, 0xfff0c0, 0.4); audio.play('eureka', { vol: 0.6 }); h2.act('cheer'); h2.setExpr('delight');
    this.camT = { p: V(1.6, 1.7, 3.0), l: h2.headWorld(V()), d: 2 };
    await this.say('newton', ['…I remember. The garden. The apple. All of it.', 'Ow. Every atom of me, ow.', 'Right. Again, then. Smarter this time.'][(this.game.journal?.loops || 0) % 3], h2);
  }
  narr(t) { return this.w(narrate(t)); }
  say(who, t, actor) { return this.w(say(who, t, { anchor: actor ? (o) => actor.headWorld(o).add(V(0, 0.3, 0)) : null })); }
  // ------------------------------------------------------------------ the record of the run (the Journal remembers)
  async record(won) {
    if (this.cineH) { this.input.remove(this.cineH); this.cineH = null; } if (!this.skipper?.fired) this.skipper?.dispose(); stopAll(); this.bars?.hide(); window.__storyBand = false;
    if (won || !this.cam) { this.world = tabletopWorld('end'); await this.world.ready; this.engine.setWorld(this.world.scene, this.world.camera); this.engine.setFx({ bloom: [0.8, 0.7, 0.6], grade: won ? { warmth: 0.8, vignette: 0.5 } : { sat: 0.7, vignette: 0.75, lift: [0.0, 0.0, 0.06] } }); }
    if (!this.engine.updaters.has(this)) this.engine.add(this);
    this.pushInput(); audio.playMusic(won ? 'map' : 'journal');
    const j = this.game.journal; const h = j.history[0] || {}; const H = this.H;
    const title = won ? 'THE WILDS FALL SILENT' : 'RECONSTRUCTED';
    const lines = won
      ? ['The Guardian of the Wilds is down. Beyond the hills,', 'bronze glints: the Trojan War is waiting, and on Olympus', 'the gods have started taking this personally.', '', 'ACT II · THE TROJAN WAR — coming in the next loop of development.']
      : ['The stars gathered him up and put him back together.', 'Every apple returns to its branch. Every god forgets.', 'Except the Journal. The Journal never forgets.', '', `Loop #${h.loop} ended on floor ${h.floor} · ${h.kills} foes · best hit ${h.bestHit}`];
    const W = this.W; this.t1 = new Signboard([title], { hang: 3, woodR: won ? 'walnut' : 'oak', style: won ? 'gild' : 'carve' }); this.t1.group.scale.setScalar(Math.min(1.4, W * 1.5 / this.t1.w)); uiPos(this.t1.group, 0, H - 2.2, 4); this.root.add(this.t1.group);
    this.t2 = new Panel('', lines.filter(Boolean), { w: Math.min(20, W * 1.6), h: 6 }); uiPos(this.t2.group, 0, 0.0, 3); this.root.add(this.t2.group);
    this.stamp = new Strip(['Recorded in the Journal'], { font: 'head', style: 'stamp', tacks: 0, maxW: 12 }); uiPos(this.stamp.group, Math.min(6, W - 6), -4.0, 6); this.stamp.restRz = 2.4; this.stamp.group.scale.setScalar(0.01); this.root.add(this.stamp.group);
    setTimeout(() => { if (!this.root.parent) return; audio.play('stamp'); this.stamp.group.scale.setScalar(2.6); tweens.to(this.stamp.group.scale, { x: 1, y: 1, z: 1 }, 0.25, { ease: 'outBack' }); this.engine.shake(0.3); }, 1400);
    this.addButton(new Button3D(won ? 'Return to the Cosmos' : 'Back to the Garden', () => this.game.toMenu(), { w: 7.4, h: 1.4, size: 60, color: won ? 'teal' : 'purple' }), 0, -H + 1.8, 2);
    this.recorded = true;
  }
  update(dt, t) {
    if (this.unl) { this.unl.update(dt, t); return; }
    if (this.world?.update && !this.cam) this.world.update(dt, t);
    if (this.cam) {
      const c = this.cam, T = this.camT; const k = 1 - Math.exp(-dt * (T.d ? 2.2 / T.d * 2 : 6)); this._p = (this._p || c.position.clone()).lerp(T.p, k); this._l = (this._l || T.l.clone()).lerp(T.l, k); c.position.copy(this._p).add(V(Math.sin(t * 0.3) * 0.04, Math.sin(t * 0.21) * 0.03, 0)); c.lookAt(this._l); c.aspect = this.engine.aspect; c.updateProjectionMatrix();
      this.hero?.update(dt); this.hero2?.update(dt); this.master?.update(dt);
      for (const u of [...(this.ups || [])]) { u.t += dt; const k2 = Math.min(1, u.t / u.d); u.fn(k2); if (k2 >= 1) { this.ups.splice(this.ups.indexOf(u), 1); u.res(); } }
      if (this.frag && this.fr) {
        const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), e = new THREE.Euler();
        if (this.mode === 'gather') this.gT += dt;
        this.fr.forEach((f, i) => {
          if (this.mode === 'burst') { f.v.multiplyScalar(1 - dt * 0.9); f.p.addScaledVector(f.v, dt); f.p.y += Math.sin(t * 2 + i) * dt * 0.05; }
          else if (this.mode === 'gather') { const u = ease((this.gT - f.t0) / 2.9); const a = (1 - u) * 7 + i * 0.3; const r = (1 - u) * 1.6; const tgt = f.to; const sw = V(Math.cos(a) * r, (1 - u) * 1.4, Math.sin(a) * r); f.p.lerp(tgt.clone().add(sw), Math.min(1, dt * (2 + u * 10))); }
          f.r += f.spin * dt; e.set(0, 0, f.r); q.setFromEuler(e); const tw = 0.7 + 0.3 * Math.sin(t * 9 + i); s.setScalar(f.s * tw * (this.mode === 'gather' ? 1 - Math.max(0, this.gT - 3.0) * 1.6 : 1)); q.premultiply(c.quaternion);
          M.compose(f.p, q, s); this.frag.setMatrixAt(i, M);
        });
        this.frag.instanceMatrix.needsUpdate = true;
      }
      this.bars?.update(dt, this.H);
    }
    if (this.recorded) { this.updateUI(dt); this.t1.update(dt, null, t); this.t2.update(dt, null); this.stamp.update(dt, null); }
  }
  dispose() { this.skipper?.dispose(); this.unl?.dispose(); if (this.revH) this.input.remove(this.revH); if (window.__unlocks?.scene === this) window.__unlocks = null; stopAll(); window.__storyBand = false; if (this.cineH) this.input.remove(this.cineH); this.bars?.dispose?.(); super.dispose(); }
}
