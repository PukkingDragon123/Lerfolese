// End of a loop. Victory: the Wilds fall silent. DEFEAT = RECONSTRUCTION: Isaac shatters into light and star fragments
// in the dark between worlds; the fragments are drawn up into the star-viewing dome, spiral round the great telescope
// and pull back together into him (voiced by his cosmic self and the Master); then the Journal's record of the run and
// the way back to the garden. Click / Space skips to the record.
import * as THREE from 'three';
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
const RECON = [
  ['cosmic', 'You are not broken, Isaac. Only scattered.', 'master', 'Again? Gather yourself. The stars remember your shape, even when you forget it.'],
  ['cosmic', 'Every law you learned is still in you. Come back together.', 'master', 'Up you get. Falling is only gravity being honest with you.'],
  ['cosmic', 'The story is not finished. Neither are you.', 'master', 'Welcome back. The Wilds have not moved. Neither has the dog.'],
];

export class EndScene extends UIScreen {
  async enter(won) {
    this.won = won;
    if (!won) { try { await this.reconstruct(); } catch (e) { if (e !== SKIP) console.warn('reconstruction', e); } }
    await this.record(won);
  }
  // ------------------------------------------------------------------ the reconstruction cinematic
  w(p) { return Promise.race([p, this.skipP]).then((r) => { if (this.skipped) throw SKIP; return r; }); }
  wait(s) { return this.w(new Promise((r) => setTimeout(r, s * 1000))); }
  tween(d, fn) { return this.w(new Promise((res) => this.ups.push({ t: 0, d, fn, res }))); }
  async reconstruct() {
    await ensureFonts(); this.ups = []; this.skipP = new Promise((r) => (this._skip = r));
    const skip = () => { if (this.skipped) return; this.skipped = true; stopAll(); this._skip(); };
    this.cineH = this.input.push({ modal: true, click: () => { skip(); return true; }, key: (e) => { if (['Space', 'Escape', 'Enter'].includes(e.code)) skip(); return true; } });
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
    }, { color: 0x05040a, mode: 1 }));
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
    if (this.cineH) { this.input.remove(this.cineH); this.cineH = null; } stopAll(); this.bars?.hide(); window.__storyBand = false;
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
  dispose() { stopAll(); window.__storyBand = false; if (this.cineH) this.input.remove(this.cineH); this.bars?.dispose?.(); super.dispose(); }
}
