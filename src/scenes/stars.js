// THE STARS (menu agent; the tower menu's STARS): the achievements as CONSTELLATIONS in the gently pixel-art cosmos of
// the astral sky (scenes/astral.js, engine pixel 0.6). From the tower the camera tilts up into the night and the galaxy
// transition opens here, on the same sky. Every ACHIEVEMENT is a constellation drawn from its memory's own subject
// (gfx/vignettes.js: the Hydra's heads, Icarus' wings, the raccoon's mask ... traced into stars joined by their
// minimum spanning lines); the hard CHALLENGES burn higher up, larger and redder.
//   - unlit (not earned): cold, faint, dotted;  waiting (earned, not claimed): gold, pulsing;  lit (claimed): drawn
//   - hover one: its lines draw in, its name stands under it in high-res cast starlight, and its MEMORY RIFT flies out
//     of it: a jagged crystal window holding the animated pixel-art memory (vignettes.js), locked in grey stone light
//     until claimed. A detailed star-chart card (ui2d/scholar.js) reads the feat, the progress and the reward.
//   - click a waiting one to CLAIM it: the camera leans in, its stars ignite one by one with a rising chime, the rift's
//     crust bursts into fragments, a white-gold flash, the reward rises in cast gold; the reward is unlocked for good
//     (save.claim: new artifacts / cards / events / stages, or cosmetic upgrades to the tower).
//   - drag, the wheel or the arrow keys pan the sky (the pointer at the edge drifts it); Esc / Return tilts back down.
//   Debug: ?scene=stars (&grant=all | &grant=<id>: mark earned, to test the claim)
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { Astral, ASTRAL } from './astral.js';
import { cineText } from '../ui3d/cinetext.js';
import { extrude, shape } from '../models/lowprops.js';
import { vignette, vignetteMaterial, vignetteSubject, VW, VH } from '../gfx/vignettes.js';
import { Motes } from '../gfx/motes.js';
import { save, ACHIEVEMENTS, CHALLENGES, STAR_UNLOCKS, REWARD_NAME, REWARD_TEXT, rewardsOf } from '../core/save.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';
import { Scholar, icon, bar } from '../ui2d/scholar.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const rewardName = (id) => STAR_UNLOCKS.find((u) => u.id === id)?.name || REWARD_NAME[id] || id;
const rewardInfo = (id) => STAR_UNLOCKS.find((u) => u.id === id)?.text || REWARD_TEXT[id] || '';

/** a constellation from a memory's pixel subject: its outline sampled to N stars (farthest-point), joined by a minimum spanning tree */
function figureOf(key, n, hard) {
  const { rows, tint } = vignetteSubject(key); const pts = []; const H = rows.length, W = rows[0].length;
  const at = (x, y) => rows[y]?.[x] ?? '.'; rows.forEach((row, y) => { for (let x = 0; x < W; x++) if (row[x] !== '.' && (at(x - 1, y) === '.' || at(x + 1, y) === '.' || at(x, y - 1) === '.' || at(x, y + 1) === '.')) pts.push([x, y]); });
  const S = Math.max(W, H) / 2; const P = pts.map(([x, y]) => [(x - W / 2 + 0.5) / S, (H / 2 - y - 0.5) / S]);
  const pick = [P.reduce((a, b) => (b[1] > a[1] ? b : a))]; while (pick.length < Math.min(n, P.length)) { let best = null, bd = -1; for (const p of P) { let d = 1e9; for (const q of pick) d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1])); if (d > bd) { bd = d; best = p; } } pick.push(best); }
  const inT = [0], edges = []; while (inT.length < pick.length) { let best = null, bd = 1e9; for (const i of inT) for (let j = 0; j < pick.length; j++) { if (inT.includes(j)) continue; const d = Math.hypot(pick[i][0] - pick[j][0], pick[i][1] - pick[j][1]); if (d < bd) { bd = d; best = [i, j]; } } edges.push(best); inT.push(best[1]); }
  const r = mulberry32(key.length * 13 + n); const stars = pick.map(([x, y], i) => [x, y, i < (hard ? 3 : 2) ? 3 : r() < 0.4 ? 2 : 1]);
  return { col: tint, stars, edges };
}
function shardOutline(w, h, seed) { const r = mulberry32(seed); const pts = []; const n = 11; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + Math.PI / 2; const k = i === 0 ? 1 : 0.62 + r() * 0.3; pts.push([Math.cos(a) * w * 0.5 * (Math.abs(Math.sin(a)) < 0.4 ? 1.05 : 0.8) * k, Math.sin(a) * h * 0.5 * (i === 0 ? 1 : 0.85 + r() * 0.15)]); } return pts; }

export class StarsScene extends UIScreen {
  async enter() {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x020106);
    const q = new URLSearchParams(location.search); const grant = q.get('grant'); if (grant) { for (const a of [...ACHIEVEMENTS, ...CHALLENGES]) if (grant === 'all' || grant === a.id) save.meta.achievements[a.id] ||= 1; save.saveMeta(); }
    save.evaluate(); const m = save.meta; m.claimed ||= {};
    this.camera = new THREE.PerspectiveCamera(ASTRAL.fov, this.engine.aspect, 0.05, 4000);
    // the constellations: achievements in a wide band, the challenges higher
    const all = [...ACHIEVEMENTS.map((a) => ({ a, hard: false })), ...CHALLENGES.map((a) => ({ a, hard: true }))]; const nA = ACHIEVEMENTS.length, nC = CHALLENGES.length; let iA = 0, iC = 0;
    const cons = all.map(({ a, hard }) => { let at; if (hard) { const k = iC++; at = [(k - (nC - 1) / 2) * 0.4, 0.36 + (k % 2) * 0.04, 0.085]; } else { const k = iA++; at = [(k - (nA - 1) / 2) * 0.2, k % 2 ? -0.08 : 0.15, 0.068]; }
      const state = m.claimed[a.id] ? 2 : m.achievements[a.id] ? 1 : 0; return { id: a.id, name: a.name, a, hard, fig: figureOf(a.scene || 'road', hard ? 9 : 7, hard), at, state, wide: true, scene: a.scene || 'road' }; });
    this.sky = new Astral({ cons, linesLit: true }); this.sky.engine = this.engine; this.sky.labelMode = 'hover'; /* names only under the pointer */ this.sky.frame(ASTRAL.dir, ASTRAL.fov, this.engine.aspect); sc.add(this.sky.group); this.sky.fade = 1; this.sky.revealT = 0;
    this.pan = { u: 0, v: 0.06, tu: 0, tv: 0.06 }; this.camDir = V(); this.aimAt(0);
    this.motes = new Motes(800, { px: 2 }); sc.add(this.motes.points); this.rnd = mulberry32(17); this.acc = 0; this.debris = []; this.reveals = [];
    sc.add(new THREE.HemisphereLight(0x8a90d0, 0x1a1030, 0.9)); const key = new THREE.DirectionalLight(0xfff0d8, 1.4); key.position.set(-2, 3, 4); sc.add(key); this.key = key;
    try { const pm = new THREE.PMREMGenerator(this.engine.renderer); const es = new THREE.Scene(); es.background = new THREE.Color(0x0a0818); const gl = (c, p) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); s.position.copy(p); s.lookAt(0, 0, 0); es.add(s); };
      gl(new THREE.Color(1.2, 1.1, 1.6), V(0, 6, 0)); gl(new THREE.Color(0.9, 0.5, 1.2), V(6, 1, 0)); gl(new THREE.Color(0.4, 0.8, 1.0), V(-6, 0, 2)); this._env = pm.fromScene(es, 0.04, 0.1, 50); sc.environment = this._env.texture; pm.dispose(); } catch (e) { /* */ }
    this.buildRift(sc);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ pixel: 0.6, bloom: [0.7, 0.55, 0.78], ao: false, exposure: 1.0, grade: { sat: 1.1, vib: 0.3, contrast: 1.08, vignette: 0.55, warmth: 0.0, lift: [0.01, 0.006, 0.03], gain: [1.0, 0.98, 1.04], toe: 0.03 }, ink: false });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['cosmos']); audio.playMusic(audio.manifest?.music?.hall ? 'hall' : 'journal');
    this.UI = new Scholar(); this.buildUI(); this.intro = { t: 0 }; this.lean = new Spring(0, 4, 0.85); this.chimed = new Set();
    audio.play('magic_shimmer', { vol: 0.5, delay: 0.3 });
  }
  aimAt() { const S = this.sky; this.camDir.copy(S.A).addScaledVector(S.e1, this.pan.u).addScaledVector(S.e2, this.pan.v).normalize(); }
  // ---------------------------------------------------------------- the memory rift: a jagged crystal window holding the animated memory
  buildRift(sc) {
    const R = (this.rift = { g: new THREE.Group(), cur: null, show: new Spring(0, 6, 0.8), fly: 1 }); sc.add(R.g); R.holder = new THREE.Group(); R.g.add(R.holder);
    R.light = new THREE.PointLight(0xffffff, 0, 6, 1.6); R.light.position.set(0, 0, 1.2); R.g.add(R.light);
  }
  setRift(c) {
    const R = this.rift; if (R.cur === c) return; R.cur = c; if (!c) { R.show.target = 0; return; } R.holder.clear(); R.show.value = 0;
    const w = c.hard ? 1.05 : 0.9, h = c.hard ? 1.62 : 1.4; const seed = c.id.length * 31 + c.id.charCodeAt(0) * 7; const out = shardOutline(w, h, seed); const L = vignette(c.scene); const tint = L.tint;
    const crys = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color(0x8a86b0), 0.6), emissive: tint.clone().lerp(new THREE.Color(0x4a3a7a), 0.5), emissiveIntensity: 0.25, roughness: 0.1, metalness: 0.3, flatShading: true, transparent: true, opacity: 0.85, envMapIntensity: 2 });
    R.body = new THREE.Mesh(extrude(shape(out), 0.12, 0.05), crys); R.body.position.z = -0.07; R.holder.add(R.body);
    const inset = out.map(([x, y]) => [x * 0.8, y * 0.8]); const wg = new THREE.ShapeGeometry(shape(inset)); const uv = wg.attributes.uv, pp = wg.attributes.position; for (let i = 0; i < pp.count; i++) uv.setXY(i, pp.getX(i) / (w * 0.8) + 0.5, pp.getY(i) / (h * 0.8) + 0.5);
    R.vm = vignetteMaterial(L); const win = new THREE.Mesh(wg, R.vm); win.position.z = 0.11; win.userData.noInk = true; R.holder.add(win); R.vm.uniforms.uLit.value = c.state === 2 ? 1 : c.state === 1 ? 0.5 : 0.1;
    R.glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.5), toneMapped: false, transparent: true, opacity: 0, depthWrite: false }); const rim = new THREE.Mesh(new THREE.ShapeGeometry(shape(out.map(([x, y]) => [x * 1.06, y * 1.04]))), R.glow); rim.position.z = -0.1; R.holder.add(rim);
    R.crust = []; if (c.state < 2) { const r = mulberry32(seed + 3); const rock = new THREE.MeshStandardMaterial({ color: 0x2a2632, roughness: 0.9, metalness: 0.1, flatShading: true, transparent: true, opacity: c.state === 1 ? 0.0 : 0.55 }); const c0 = [(r() - 0.5) * w * 0.2, (r() - 0.5) * h * 0.2];
      for (let i = 0; i < inset.length; i++) { const A2 = inset[i], B2 = inset[(i + 1) % inset.length]; const cx = (c0[0] + A2[0] + B2[0]) / 3, cy = (c0[1] + A2[1] + B2[1]) / 3; const k = 0.9; const pts = [c0, A2, B2].map(([x, y]) => [(x - cx) * k, (y - cy) * k]);
        const f = new THREE.Mesh(extrude(shape(pts), 0.03 + r() * 0.03, 0.01), rock); f.position.set(cx, cy, 0.14); R.holder.add(f); R.crust.push({ f, c: V(cx, cy, 0) }); } }
    R.c = c; R.tint = tint; R.light.color.copy(tint); R.fly = 0; R.side = null; R.show.target = 1;
  }
  // ---------------------------------------------------------------- the 2D star chart: header, and the reading card of the hovered / chosen figure
  buildUI() {
    const UI = this.UI; const m = save.meta; const all = this.sky.cons; const lit = all.filter((c) => c.state === 2).length, wait = all.filter((c) => c.state === 1).length;
    const H = (this.headP = UI.panel({ w: 206, h: 58, theme: 'night', anchor: 'top-left', mx: 8, my: 8, seed: 3, pad: 9 })); UI.show(H, false); const row = UI.el('div', '', null, H.inner); Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' });
    const tl = UI.el('div', '', null, row); UI.el('div', 'lf-title lf-big', 'Stars', tl); UI.el('div', 'lf-body lf-soft', `${lit} of ${all.length} lit${wait ? `  -  ${wait} waiting` : ''}`, tl).style.whiteSpace = 'nowrap'; void m;
    const b = UI.button('Return', () => this.leave(), { parent: row, w: 62, night: true, sound: 'ui_back' }); b.style.marginTop = UI.px(2);
    this.cardP = null; setTimeout(() => { UI.show(H, true); }, 900);
  }
  card(c) {
    const UI = this.UI; if (this.cardFor === c && this.cardP) return; this.cardFor = c; if (this.cardP) { const old = this.cardP; UI.show(old, false); setTimeout(() => UI.remove(old), 380); this.cardP = null; } if (!c) return;
    const a = c.a; const P = (this.cardP = UI.panel({ w: 236, h: 140, theme: 'night', anchor: 'bottom', mx: -170, my: 10, seed: 9 + c.gi, pad: 9 })); P.el.style.pointerEvents = 'none'; // a reading card: the pointer passes through to the sky UI.show(P, false); requestAnimationFrame(() => UI.show(P, true));
    const row = UI.el('div', '', null, P.inner); Object.assign(row.style, { display: 'flex', gap: UI.px(7), height: '100%' });
    const mini = document.createElement('canvas'); mini.width = VW; mini.height = VH; const L = vignette(c.scene); const g = mini.getContext('2d'); for (const t of [L.bg, L.mid]) g.drawImage(t.image, 0, 0); if (c.state === 0) { const d = g.getImageData(0, 0, VW, VH); for (let i = 0; i < d.data.length; i += 4) { const v = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11; d.data[i] = v * 0.42; d.data[i + 1] = v * 0.46; d.data[i + 2] = v * 0.7; } g.putImageData(d, 0, 0); }
    mini.className = 'lf-cv'; mini.dataset.w = VW * 0.75; mini.dataset.h = VH * 0.75; const fr = UI.el('div', '', null, row); Object.assign(fr.style, { flex: '0 0 auto', border: `var(--k-px) solid ${c.state === 1 ? '#f2c868' : '#98a4c8'}`, boxShadow: '0 0 0 var(--k-px) #06030a', alignSelf: 'flex-start' }); UI.add(mini, fr); mini.style.width = UI.px(48); mini.style.height = UI.px(72);
    const txt = UI.el('div', '', null, row); Object.assign(txt.style, { flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: UI.px(3), minWidth: 0, overflow: 'hidden' });
    UI.el('div', 'lf-title', a.name, txt); UI.el('div', 'lf-body ' + (c.hard ? 'lf-red' : 'lf-soft'), c.hard ? 'Challenge' : c.state === 2 ? 'Lit' : c.state === 1 ? 'Earned  -  click to claim' : 'Unlit', txt).style.color = c.hard ? '#ff8a7a' : '';
    UI.el('div', 'lf-body', a.text, txt);
    const pr = a.prog ? a.prog(save.journal) : [c.state ? 1 : 0, 1]; const pw = UI.el('div', '', null, txt); Object.assign(pw.style, { display: 'flex', alignItems: 'center', gap: UI.px(4) }); pw.appendChild(UI.fit(bar(96, pr[0] / pr[1], { night: true, done: c.state > 0 }))); UI.el('div', 'lf-num lf-soft', `${Math.min(pr[0], pr[1])}/${pr[1]}`, pw);
    const rw = UI.el('div', '', null, txt); Object.assign(rw.style, { display: 'flex', alignItems: 'center', gap: UI.px(4) }); rw.appendChild(UI.fit(icon(c.state === 2 ? 'star' : 'lock', { ramp: c.state === 2 ? undefined : ['#000', '#1a2040', '#2a3460', '#3e4a80', '#5a68a0', '#7a88c0', '#a8b4e0'] })));
    UI.el('div', 'lf-body lf-goldt', rewardsOf(a).map(rewardName).join(', '), rw); const info = rewardInfo(rewardsOf(a)[0]); if (info) { const n = UI.el('div', 'lf-body lf-soft', info, txt); Object.assign(n.style, { maxHeight: UI.px(26), overflow: 'hidden' }); }
  }
  // ---------------------------------------------------------------- claim: ignite, shatter, flash, the reward rises
  claim(c) {
    const got = save.claim(c.a.id); if (!got.length && !save.meta.claimed[c.a.id]) return; this.sky.pickIdx = c.gi; this.sky.pickT = 0; this.claiming = { c, t: 0 }; this.lean.target = 1; this.setRift(c);
    const n = c.fig.stars.length; for (let k = 0; k < n; k++) audio.play('chime_soft', { vol: 0.35 + k * 0.03, delay: (k / n) * 0.8, rate: 0.85 + k * 0.08, variance: 0, minGap: 0 });
    audio.play('magic_sparkle', { vol: 0.7 }); audio.play('glass_shatter', { vol: 0.7, delay: 0.85 }); audio.play('eureka', { delay: 1.0 }); audio.play('sting_reward', { delay: 1.2 }); audio.duckMusic?.(0.3, 3.5);
    this.card(null);
  }
  burstRift() {
    const R = this.rift, c = this.claiming.c; const wp = R.holder.getWorldPosition(V()); const toCam = this.camera.position.clone().sub(wp).normalize(); const q = R.holder.getWorldQuaternion(new THREE.Quaternion());
    for (const k of R.crust) { this.scene.attach(k.f); this.debris.push({ f: k.f, v: k.c.clone().applyQuaternion(q).normalize().multiplyScalar(1.5 + Math.random() * 2).addScaledVector(toCam, 1.5 + Math.random() * 1.5), w: V(Math.random() * 9 - 4.5, Math.random() * 9 - 4.5, Math.random() * 9 - 4.5), t: 0 }); } R.crust = [];
    this.engine.flash(0.4, 0xfff0d0, 0.9); this.engine.shake(0.15); R.flare = 1.2; R.vm.uniforms.uLit.value = 1; this.sky.setState(c.gi, 2); c.state = 2;
    const r = this.rnd; const col = '#' + R.tint.getHexString(); for (let i = 0; i < 120; i++) { const d = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(0.6 + r() * 2.6).addScaledVector(toCam, 0.6); this.motes.spawn({ pos: [wp.x, wp.y, wp.z], vel: [d.x, d.y, d.z], drag: 2.2, grav: 0.2, life: 0.8 + r() * 1.4, seq: r() < 0.6 ? 'twinkle' : 'glint', fps: 8 + r() * 5, color: r() < 0.5 ? '#fff0c8' : col, bright: 1.7, k: r() < 0.2 ? 2 : 1, fadeIn: 0.02 }); }
    const rev = new THREE.Group(); let y = 0; for (const id of rewardsOf(c.a)) { const T = cineText(rewardName(id), { height: 0.085, style: id.startsWith('tower:') ? 'starlight' : 'gold', glow: 0.3 }); T.position.y = y; rev.add(T); y -= 0.16; }
    rev.position.copy(V(0, -0.42, 0.5).unproject(this.camera).sub(this.camera.position).normalize().multiplyScalar(2.6).add(this.camera.position)); rev.scale.setScalar(0.01); this.scene.add(rev); this.reveals.push({ g: rev, t: 0, base: rev.position.clone() });
    const lit = this.sky.cons.filter((x) => x.state === 2).length, wait = this.sky.cons.filter((x) => x.state === 1).length; const sub = this.headP.inner.querySelector('.lf-body'); if (sub) sub.textContent = `${lit} of ${this.sky.cons.length} lit${wait ? `  -  ${wait} waiting` : ''}`;
  }
  leave() { if (this.leaving) return; this.leaving = { t: 0 }; audio.play('whoosh_soft', { vol: 0.6 }); audio.play('transition_whoosh', { vol: 0.5, delay: 0.3 }); this.card(null); this.UI.show(this.headP, false); this.rift.show.target = 0; }
  // ---------------------------------------------------------------- input
  pickC() { if (this.claiming || this.leaving || this.intro) return -1; return this.sky.pick(this.input.ndc, this.camera); }
  onMove() { const i = this.pickC(); if (i !== this.hovI) { this.hovI = i; this.sky.hover = i; const c = this.sky.cons[i]; if (c) { audio.play(c.state === 1 ? 'chime_soft' : 'magic_sparkle', { vol: 0.25 }); this.card(c); this.setRift(c); } else { this.card(null); this.setRift(null); } this.engine.renderer.domElement.style.cursor = i >= 0 ? 'pointer' : ''; } }
  onClick(e) { if (e?.button === 2) { this.leave(); return true; } const i = this.pickC(); const c = this.sky.cons[i]; if (!c) return; if (c.state === 1) this.claim(c); else if (c.state === 2) { audio.play('magic_sparkle', { vol: 0.5 }); this.rift.flare = 0.6; } else { audio.play('ui_error', { vol: 0.35 }); this.rift.shake = 0.5; } return true; }
  onDragStart(e) { this.dragX = e.x; this.dragY = e.y; return true; }
  onDrag(e) { if (this.dragX == null) return; const dx = (e.x - this.dragX) / innerHeight, dy = (e.y - this.dragY) / innerHeight; this.dragX = e.x; this.dragY = e.y; this.pan.tu = Math.max(-0.9, Math.min(0.9, this.pan.tu - dx * 1.1)); this.pan.tv = Math.max(-0.25, Math.min(0.4, this.pan.tv + dy * 1.1)); }
  onDragEnd() { this.dragX = null; }
  onWheel(e) { this.pan.tu = Math.max(-0.9, Math.min(0.9, this.pan.tu + ((e?.dy || 0) + (e?.dx || 0)) * 0.0015)); }
  onKey(e) { const k = e?.key || e?.code || e; if (k === 'Escape' || k === 'Backspace') { this.leave(); return true; } if (k === 'ArrowLeft') { this.pan.tu = Math.max(-0.9, this.pan.tu - 0.3); return true; } if (k === 'ArrowRight') { this.pan.tu = Math.min(0.9, this.pan.tu + 0.3); return true; } }
  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const cam = this.camera, nd = this.input.ndc, S = this.sky;
    // pan: dragged, or drifting while the pointer rests at the side of the view
    if (!this.claiming && !this.leaving && !this.intro && this.dragX == null) { const ex = Math.abs(nd.x) > 0.82 ? Math.sign(nd.x) * (Math.abs(nd.x) - 0.82) / 0.18 : 0; this.pan.tu = Math.max(-0.9, Math.min(0.9, this.pan.tu + ex * dt * 0.5)); }
    this.pan.u += (this.pan.tu - this.pan.u) * Math.min(1, dt * 4); this.pan.v += (this.pan.tv - this.pan.v) * Math.min(1, dt * 4); this.aimAt();
    const d = this.camDir.clone(); this.lean.update(dt); const ln = Math.max(0, this.lean.value);
    if (this.claiming) { const C = this.claiming; C.t += dt; d.lerp(S.centerDir(C.c.gi), Math.min(1, ln) * 0.55).normalize(); S.warp(C.c.gi, Math.max(0, Math.sin(Math.min(1, C.t / 1.6) * Math.PI)) * 0.35); if (C.t > 0.9 && !C.burst) { C.burst = true; this.burstRift(); } if (C.t > 3.2) { this.claiming = null; this.lean.target = 0; S.pickIdx = -1; S.warp(-1, 0); } }
    let fov = ASTRAL.fov - ln * 8;
    if (this.intro) { this.intro.t += dt; const u = ease5(this.intro.t / 1.8); S.trail = (1 - u) * 0.6; fov += (1 - u) * 6; if (this.intro.t > 1.8) { this.intro = null; S.trail = 0; } }
    if (this.leaving) { const L = this.leaving; L.t += dt; const u = ease5(L.t / 1.1); S.trail = u * 0.8; d.lerp(V(0, -0.3, -1).normalize(), u * 0.25).normalize(); fov += u * 6; if (L.t > 0.8 && !L.gone) { L.gone = true; this.game.toMenu({ from: 'stars', wipe: { style: 'galaxy', center: [0.5, 0.25] } }); } }
    cam.position.set(0, 0, 0); cam.fov += (fov - cam.fov) * Math.min(1, dt * 5); cam.updateProjectionMatrix(); cam.lookAt(d.multiplyScalar(10).addScaledVector(S.e1, nd.x * 0.08).addScaledVector(S.e2, nd.y * 0.05));
    // a chime as each figure draws itself in
    for (const c of S.cons) if (!this.chimed.has(c.gi) && S.revealT > c.rev) { this.chimed.add(c.gi); if (c.gi % 3 === 0) audio.play('chime_soft', { vol: 0.16, rate: 0.8 + (c.gi % 7) * 0.07, variance: 0, minGap: 0 }); }
    S.update(dt, t, cam, this.engine.renderer);
    // the rift: flies out of its constellation to the right of the view; locked ones sit behind a crust of dark stone
    const R = this.rift; R.show.update(dt); const sv = Math.max(0, R.show.value);
    if (R.c) { R.fly = Math.min(1, R.fly + dt * 2.2); const u = ease5(R.fly); const sx = S.screenOf(R.c.gi, cam).x; if (R.side == null || R.fly < 0.05) R.side = sx > 0.05 ? -1 : 1; const slot = V(R.side > 0 ? 0.56 : -0.52, 0.16, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(3.6).add(cam.position); const from = S.centerDir(R.c.gi).multiplyScalar(30).add(cam.position);
      R.g.position.copy(from).lerp(slot, u); R.g.quaternion.copy(cam.quaternion); R.holder.rotation.set(Math.sin(t * 0.6) * 0.06, Math.sin(t * 0.4) * 0.18 + (1 - u) * 2, Math.sin(t * 0.5) * 0.03); R.holder.scale.setScalar(Math.max(0.001, sv * (0.3 + 0.7 * u)));
      if (R.vm) { R.vm.uniforms.uTime.value += dt * (R.c.state === 2 ? 1 : 0.3); R.vm.uniforms.uHover.value = 1; R.vm.uniforms.uLit.value += ((R.c.state === 2 ? 1 : R.c.state === 1 ? 0.5 : 0.1) - R.vm.uniforms.uLit.value) * Math.min(1, dt * 2); }
      R.flare = Math.max(0, (R.flare || 0) - dt * 0.8); R.glow.opacity = R.c.state === 1 ? 0.45 + Math.sin(t * 4) * 0.25 : R.flare * 0.8; R.light.intensity = (1.5 + R.flare * 8) * sv;
      if (R.shake > 0) { R.shake -= dt; R.holder.position.x = Math.sin(R.shake * 60) * 0.04 * R.shake; } else R.holder.position.x = 0; }
    else R.holder.scale.setScalar(Math.max(0.001, sv * R.holder.scale.x));
    for (const D of this.debris) { D.t += dt; D.v.multiplyScalar(Math.exp(-dt * 0.8)); D.f.position.addScaledVector(D.v, dt); D.f.rotation.x += D.w.x * dt; D.f.rotation.y += D.w.y * dt; D.f.rotation.z += D.w.z * dt; if (D.t > 1.4) D.f.scale.multiplyScalar(Math.exp(-dt * 3)); }
    this.debris = this.debris.filter((D) => { if (D.t < 2.6) return true; D.f.removeFromParent(); return false; });
    for (const Rv of this.reveals) { Rv.t += dt; const s = ease5(Math.min(1, (Rv.t - 0.1) / 0.6)) * (1 - ease5((Rv.t - 3.4) / 0.6)); Rv.g.scale.setScalar(Math.max(0.001, s)); Rv.g.position.copy(Rv.base).add(V(0, Rv.t * 0.04, 0)); Rv.g.quaternion.copy(cam.quaternion); for (const T of Rv.g.children) { const U = T.userData.U; if (U) { U.uSweep.value = -2.2 + (Rv.t % 1.6) * 2.8; U.uShine.value = 0.8; } } }
    this.reveals = this.reveals.filter((Rv) => { if (Rv.t < 4.1) return true; this.scene.remove(Rv.g); return false; });
    // stardust drifting past the lens
    this.acc += dt * 5; const r = this.rnd; while (this.acc > 1) { this.acc--; const z = -(1.5 + r() * 6); const p = cam.localToWorld(V((r() - 0.5) * -z * 1.6, (r() - 0.5) * -z * 0.9, z)); this.motes.spawn({ pos: [p.x, p.y, p.z], vel: [(r() - 0.5) * 0.05, (r() - 0.5) * 0.05, 0], wobble: 0.2, life: 3 + r() * 3, sprite: r() < 0.8 ? 'm1' : 'dust', color: r() < 0.5 ? '#c8d0ff' : '#e8d8ff', bright: 0.8 + r() * 0.5, twinkle: 2 + r() * 3, fadeIn: 0.3 }); }
    this.motes.px = Math.max(2, Math.round(this.engine.renderer.getDrawingBufferSize(this._bs || (this._bs = new THREE.Vector2())).y / 320)); this.motes.update(dt, t, this.engine.renderer); this.updateUI(dt);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; this.UI?.dispose(); this._env?.dispose(); this.motes?.dispose(); this.sky?.dispose(); super.dispose(); }
}
