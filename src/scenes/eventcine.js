// Full cutscenes for the Wilderness' curiosities. Each event is staged as a short film on its set: an establishing crane,
// Newton arriving on the road, the character's entrance and action (Icarus soaring past the sun and crash-landing,
// the Sphinx unfolding her wings, the eagle swooping onto Prometheus' tree...), camera cuts and moves, chronicle
// narration on the parchment strip, name cards, and the characters' lines in physical speech scraps. After a choice a
// short reaction shows the consequence. Built on cinematic.js (Director: letterbox beams, narration, skip, real time).
import * as THREE from 'three';
import { Director, CamRig, Walker, roadPath, frameAt, ease, span, lerpAngle } from './cinematic.js';
import { hud } from '../ui3d/hud.js';
import { audio } from '../core/audio.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _a = V(), _b = V(), _c = V();
const qbez = (a, c, b, u, out = V()) => { const k = 1 - u; return out.set(k * k * a.x + 2 * k * u * c.x + u * u * b.x, k * k * a.y + 2 * k * u * c.y + u * u * b.y, k * k * a.z + 2 * k * u * c.z + u * u * b.z); };

// ================================================================== the timeline
class Film {
  constructor(E, { bars = true } = {}) {
    this.E = E; this.D = new Director(E.engine, E.input, { bars }); this.rig = new CamRig(E.camera); this.shots = []; this.tracks = []; this.lines = []; this.cards = []; this.end = 0;
    this.actors = { newton: E.prof, ...(E.cast?.actors || {}) }; this.hAt = E.hAt || (() => 0);
  }
  // ---- what is where
  actor(k) { return this.actors[k]; }
  head(k, out = V()) {
    const a = this.actors[k]; if (!a) return out.set(0, 1.5, 0); if (a.headWorld) return a.headWorld(out);
    a.root.updateMatrixWorld(true); if (a.head?.getWorldPosition) return a.head.getWorldPosition(out); return out.copy(a.root.position).add(_c.set(0, (a.height || 1.6) * 0.92, 0));
  }
  // ---- cues and tracks (times in seconds from the start)
  at(t, fn) { this.D.at(t, fn); this.end = Math.max(this.end, t); return this; }
  track(t0, t1, fn) { const tr = { t0, t1, fn, done: false }; this.tracks.push(tr); this.end = Math.max(this.end, t1); return tr; }
  shot(t0, t1, cam, { cut = false, rp = 3.2, rl = 5 } = {}) { this.shots.push({ t0, t1, cam, cut, rp, rl }); this.end = Math.max(this.end, t1); return this; }
  say(t, text) { return this.at(t, () => this.D.say(text)); }
  hush(t) { return this.at(t, () => this.D.narr.clear()); }
  speak(t, who, text, life = 2.6) {
    return this.at(t, () => {
      const me = who === 'newton'; const nm = me ? 'Newton' : this.E.cast?.names?.[who]?.[0] || who;
      for (const l of this.lines) if (l.who === who) l.life = Math.min(l.life, 0); // one scrap per speaker at a time
      const b = hud.bubble(text, me ? 'me' : 'foe', nm); this.lines.push({ b, who, life, me }); const a = this.actors[who]; a?.talk?.(Math.min(2.4, text.length * 0.05)); audio.play(me ? 'wood_knock' : 'paper_rustle', { vol: 0.35 });
      if (this.lines.length > 2) this.lines.shift().b.drop();
    });
  }
  card(t, who, hold = 2.6) {
    const nm = this.E.cast?.names?.[who] || [who, '']; let c = null;
    this.at(t, () => { c = this.D.card(nm[0], nm[1]).show(); this.cards.push({ c, who }); });
    this.at(t + hold, () => c?.hide());
  }
  act(t, who, mode) { return this.at(t, () => this.actors[who]?.act?.(mode)); }
  // a change of state at time t (applied even if the film is skipped, in order)
  state(t, fn) { return this.track(t, t + 0.001, (u) => { if (u >= 1) fn(); }); }
  pose(t, who, p) { return this.state(t, () => { const a = this.actors[who]; if (a) a.pose = p; }); }
  show(t, who, on = true) { return this.state(t, () => { const a = typeof who === 'string' ? this.actors[who]?.root : who; if (a) a.visible = on; }); }
  sfx(t, name, o) { return this.at(t, () => audio.play(name, o)); }
  shake(t, k = 0.3) { return this.at(t, () => this.E.engine.shake(k)); }
  // move an actor along a curve (a, control, b) with heading toward travel, optional spin
  fly(t0, t1, who, a, c, b, { face = true, spin = null, e = ease.io } = {}) {
    let prev = null;
    return this.track(t0, t1, (u) => { const r = this.actors[who]?.root; if (!r) return; const p = qbez(a, c, b, e(u)); if (face && prev && p.distanceToSquared(prev) > 1e-6) r.rotation.y = lerpAngle(r.rotation.y, Math.atan2(p.x - prev.x, p.z - prev.z), 0.25); prev = (prev || V()).copy(p); r.position.copy(p); if (spin) { r.rotation.x = spin[0] * u; r.rotation.z = spin[1] * u; } });
  }
  faceTo(t, who, target) { return this.state(t, () => { const r = this.actors[who]?.root, q = this.actors[target]?.root; if (r && q) r.rotation.y = Math.atan2(q.position.x - r.position.x, q.position.z - r.position.z); }); }
  // ---- particles
  puff(pos, kind = 'dust', n = 14) {
    const P = this.E.parts, G = this.E.glow; if (!P) return; const p = typeof pos === 'function' ? pos() : pos; const R = (a, b) => a + Math.random() * (b - a);
    const K = {
      dust: () => P.burst(n, () => ({ pos: [p.x + R(-0.4, 0.4), p.y + 0.1, p.z + R(-0.3, 0.3)], vel: [R(-1.6, 1.6), R(0.3, 1.2), R(-0.8, 0.8)], life: R(0.5, 0.9), size: R(10, 18), size1: 4, color: '#c8b8a0', sprite: 'dot', grav: 2.5, drag: 1.4 })),
      drip: () => P.burst(n, () => ({ pos: [p.x + R(-0.5, 0.5), p.y + R(-0.2, 0.3), p.z + R(-0.3, 0.3)], vel: [R(-0.3, 0.3), R(-1, 0), R(-0.3, 0.3)], life: R(0.8, 1.4), size: R(18, 26), color: '#f0c040', sprite: 'drop', grav: 9 })),
      feather: () => P.burst(n, () => ({ pos: [p.x + R(-0.4, 0.4), p.y + R(0, 0.5), p.z], vel: [R(-1, 1), R(-0.2, 0.8), R(-0.5, 0.5)], life: R(1.6, 2.6), size: R(20, 30), color: '#f2e6c8', sprite: 'leaf', wobble: 1.4, spin: R(-3, 3), grav: 0.6 })),
      steam: () => P.burst(n, () => ({ pos: [p.x + R(-0.3, 0.3), p.y, p.z + R(-0.3, 0.3)], vel: [R(-0.2, 0.2), R(0.6, 1.4), R(-0.2, 0.2)], life: R(1.4, 2.4), size: R(14, 22), size1: 30, color: '#ece4f4', alpha: 0.45, sprite: 'dot', wobble: 0.8, drag: 0.6 })),
      fire: () => G?.burst(n, () => ({ pos: [p.x + R(-0.2, 0.2), p.y, p.z + R(-0.2, 0.2)], vel: [R(-0.5, 0.5), R(1.2, 2.6), R(-0.5, 0.5)], life: R(0.5, 1.0), size: R(28, 46), size1: 6, color: ['#ff9a3a', '#ffc45a', '#ff6a2a'][(Math.random() * 3) | 0], sprite: 'ember', grav: -1 })),
      sparkle: () => G?.burst(n, () => ({ pos: [p.x + R(-0.4, 0.4), p.y + R(-0.3, 0.4), p.z + R(-0.3, 0.3)], vel: [R(-1, 1), R(0, 1.5), R(-0.5, 0.5)], life: R(0.6, 1.2), size: R(22, 36), color: ['#ffe08a', '#e8fbff', '#b48cff'][(Math.random() * 3) | 0], sprite: 'star4', drag: 1 })),
      zap: () => G?.burst(n, () => ({ pos: [p.x, p.y, p.z], vel: [R(-4, 4), R(-2, 4), R(-2, 2)], life: R(0.2, 0.45), size: R(26, 40), color: ['#fff3b0', '#8fe3ff'][(Math.random() * 2) | 0], sprite: 'spark', drag: 3 })),
      notes: () => P.burst(n, () => ({ pos: [p.x + R(-0.4, 0.4), p.y + R(0, 0.4), p.z], vel: [R(-0.6, 0.6), R(0.6, 1.4), 0], life: R(1.2, 2), size: R(26, 34), color: '#3a2410', sprite: 'note_p', wobble: 1.2 })),
      splash: () => P.burst(n, () => ({ pos: [p.x + R(-0.4, 0.4), p.y, p.z + R(-0.3, 0.3)], vel: [R(-1.5, 1.5), R(2, 4.5), R(-1, 1)], life: R(0.6, 1.1), size: R(20, 30), color: '#9ad8f0', sprite: 'drop', grav: 12, floor: p.y - 0.05 })),
      bubbles: () => P.burst(n, () => ({ pos: [p.x + R(-0.6, 0.6), p.y, p.z + R(-0.4, 0.4)], vel: [R(-0.1, 0.1), R(0.4, 0.9), 0], life: R(0.8, 1.6), size: R(16, 26), color: '#e8f8ff', sprite: 'bubble' })),
      gold: () => G?.burst(n, () => ({ pos: [p.x, p.y, p.z], vel: [R(-1.5, 1.5), R(0.5, 2.5), R(-1, 1)], life: R(0.8, 1.4), size: R(24, 36), color: '#ffd23a', sprite: 'star4', drag: 1.2 })),
    };
    (K[kind] || K.dust)();
  }
  puffAt(t, pos, kind, n) { return this.at(t, () => this.puff(pos, kind, n)); }
  // ---- camera framings
  toCam(p, side = 0) { const R = this.E.camBase; _a.set(R.x - p.x, 0, R.z - p.z).normalize(); return _a.applyAxisAngle(_b.set(0, 1, 0), side).clone(); }
  close(who, { d = 2.6, side = 0.35, up = 0.12, fov = 30, dy = 0 } = {}) { return () => { const h = this.head(who); const dir = this.toCam(h, side); return { p: h.clone().addScaledVector(dir, d).add(V(0, up, 0)), l: h.clone().add(V(0, dy, 0)), fov }; }; }
  two(a, b, { d = 2.2, side = 0, up = 0.35, fov = 32, bias = 0.5 } = {}) { return () => { const ha = this.head(a), hb = this.head(b); const m = ha.clone().lerp(hb, bias); const span2 = ha.distanceTo(hb); const dir = this.toCam(m, side); return { p: m.clone().addScaledVector(dir, d + span2 * 1.15).add(V(0, up, 0)), l: m.clone().add(V(0, -0.1, 0)), fov }; }; }
  fixed(p, l, fov = 34) { return () => ({ p, l, fov }); }
  // keep an actor in frame from an offset (it may fly anywhere): optionally look part-way towards another
  chase(who, off, { fov = 38, dy = 1.0, toward = null, k = 0.3 } = {}) { return () => { const r = this.actors[who]?.root; const p = r ? r.position.clone() : V(); const l = p.clone().add(V(0, dy, 0)); if (toward) l.lerp(this.head(toward), k); return { p: p.clone().add(off), l, fov }; }; }
  // ---- run it
  play({ onReveal = () => {}, settle = true } = {}) {
    const D = this.D, E = this.E, rig = this.rig, cam = E.camera; const baseFov = cam.fov; const restP = E.camBase.clone(), restL = E.camLook.clone(); this.shots.sort((a, b) => a.t0 - b.t0);
    let S0 = this.end + 0.2, SD = 1.1, from = null, revealed = false, finished = false, lastShot = null;
    const finishTracks = () => { for (const tr of this.tracks) if (!tr.done) { tr.done = true; try { tr.fn(1, 0, tr.t1); } catch (e) { console.warn(e); } } };
    const dropLines = () => { for (const l of this.lines) l.b.drop(); this.lines = []; };
    const finish = () => { if (finished) return; finished = true; finishTracks(); dropLines(); cam.fov = baseFov; cam.updateProjectionMatrix(); if (settle) { cam.position.copy(restP); cam.lookAt(restL); } if (!revealed) { revealed = true; onReveal(); } D.end(); this.cleanup?.(); };
    D.onSkip = () => { finishTracks(); dropLines(); S0 = D.t; SD = 0.55; from = null; D.bars?.hide(); this.skipped = true; };
    const pos = V(), look = V();
    D.frame = (t, dt) => {
      if (t < S0) {
        if (!this.skipped) for (const tr of this.tracks) { if (tr.done || t < tr.t0) continue; const u = span(t, tr.t0, tr.t1); tr.fn(u, dt, t); if (u >= 1) tr.done = true; }
        let sh = null; for (const s of this.shots) if (t >= s.t0) sh = s; if (sh) { const f = sh.cam(span(t, sh.t0, sh.t1), t); if (sh !== lastShot && (sh.cut || !lastShot)) rig.snap(f.p, f.l, f.fov); else rig.follow(f.p, f.l, f.fov, dt, sh.rp, sh.rl); lastShot = sh; }
      } else {
        if (!settle) { finish(); return; }
        if (!from) from = { p: rig.pos.clone(), l: rig.look.clone(), f: rig.fov }; const u = ease.smooth(span(t, S0, S0 + SD));
        rig.snap(pos.copy(from.p).lerp(restP, u), look.copy(from.l).lerp(restL, u), from.f + (baseFov - from.f) * u); D.bars?.hide();
        if (!revealed && u > 0.5) { revealed = true; onReveal(); } if (u >= 1) { rig.apply(); finish(); return; }
      }
      rig.apply();
      // speech scraps and name cards follow their speakers
      for (const l of this.lines) { l.life -= dt; const p = E.engine.worldToUI(this.head(l.who, _c).add(_b.set(0, 0.5, 0))); if (!l.b.fall) l.b.at(p.x + (l.me ? 0.6 : -0.5), p.y + (l.me ? 0.4 : 0.6)); if (l.life < 0) l.b.drop(); }
      this.lines = this.lines.filter((l) => l.life >= -0.6);
      for (const k of this.cards) { const p = E.engine.worldToUI(this.head(k.who, _c).add(_b.set(0, 0.7, 0))); k.c.at(p.x + 4.2, p.y + 1.4); }
    };
    D.frame(0, 0);
    return { done: D.done, abort: () => { try { finish(); } catch (e) { console.warn(e); } D.dispose(); }, director: D };
  }
}

// ================================================================== the common opening: crane onto the set, Newton walks in
function opening(F, line) {
  const E = F.E, prof = E.prof; const home = prof.root.position.clone(), homeRy = prof.root.rotation.y;
  const walk = new Walker(prof, roadPath(E.stage, { from: 5.6, home }), { t0: 0.1, speed: 1.9, endRy: homeRy });
  F.track(0, walk.t1 + 0.5, (u, dt, t) => { if (u >= 1) { walk.gait.dispose(); prof.root.position.copy(home); prof.root.rotation.y = homeRy; return; } walk.apply(t, dt); });
  const set = V(-0.6, 1.2, -1.5); const s0 = frameAt(set, V(0, 0, 1));
  F.shot(0, 2.2, (u) => ({ p: s0(-2.5 + u * 1.2, 8.5 - u * 4.2, 16 - u * 3.5), l: set.clone().add(V(0, 2.5 - u * 2.2, -2)), fov: 40 - u * 4 }));
  F.shot(2.2, walk.t1, () => { const F2 = frameAt(walk.pos, walk.tan); return { p: F2(4.6, 1.6, 2.2), l: walk.pos.clone().add(V(0, 1.4, 0)).addScaledVector(walk.tan, 0.6), fov: 36 }; }, { cut: true, rp: 5, rl: 7 });
  F.say(0.4, line);
  return walk.t1 + 0.25;
}

// ================================================================== the twelve curiosities
const H = (F, x, z, y = 0) => V(x, F.hAt(x, z) + y, z);
const SCRIPTS = {
  tree: (F) => { // no keeper but the tree: an apple drops on Newton's head, the oldest joke in physics
    const T = opening(F, 'And Newton came upon an orchard, and a tree that bore a warning…');
    const apple = F.E.cast.prop?.apple; const top = H(F, -2.6, 0.9, 4.2);
    F.shot(T, T + 2.2, F.fixed(H(F, -3.4, 4.4, 1.2), H(F, -0.6, -0.2, 2.6), 36), { cut: true }); F.say(T + 0.2, '…DO NOT SHAKE, it said. Below that, in his own hand: shake it.');
    F.shot(T + 2.2, T + 5.2, F.close('newton', { d: 2.8, side: 0.5, up: 0.5, fov: 34 }), { cut: true });
    F.act(T + 2.4, 'newton', 'think'); F.speak(T + 2.6, 'newton', 'A warning sign. On a tree. Fascinating.');
    if (apple) { F.track(T + 3.6, T + 4.4, (u) => { apple.visible = u < 1; apple.position.copy(top).lerp(F.head('newton').add(V(0, 0.15, 0)), u * u); apple.rotation.z += 0.3; }); }
    F.act(T + 4.35, 'newton', 'bonk'); F.sfx(T + 4.35, 'apple_crunch'); F.shake(T + 4.35, 0.25); F.puffAt(T + 4.35, () => F.head('newton'), 'sparkle', 10);
    F.speak(T + 4.8, 'newton', '…Ow. Hm. Wait. WAIT.', 2.4);
  },
  oracle: (F) => {
    const T = opening(F, 'And the road climbed to Delphi, where the god once spoke through smoke…');
    F.shot(T, T + 2.8, F.close('pythia', { d: 4.2, side: -0.3, up: -0.4, fov: 34 }), { cut: true }); F.card(T + 0.4, 'pythia');
    F.track(T, T + 6.5, (u, dt) => { if (Math.random() < dt * 8) F.puff(H(F, 1.3, -0.9, 1.1), 'steam', 2); });
    F.act(T + 0.6, 'pythia', 'cast'); F.speak(T + 0.9, 'pythia', 'Hear the word of Apollo: E… R… ROR.', 2.8); F.sfx(T + 1.2, 'steam_hiss');
    F.shot(T + 2.8, T + 5.4, F.close('pythia', { d: 2.2, side: 0.4, fov: 28 }), { cut: true }); F.act(T + 3.0, 'pythia', 'hurt'); F.puffAt(T + 3.0, H(F, 1.6, -1.5, 1.4), 'zap', 10); F.sfx(T + 3.0, 'electric_zap');
    F.speak(T + 3.4, 'pythia', 'It used to say YOU WILL DIE. Now it just coughs.', 2.6);
    F.shot(T + 5.4, T + 7.6, F.two('newton', 'pythia', { d: 2.4, fov: 32 }), { cut: true }); F.speak(T + 5.6, 'newton', 'Have you tried turning the god off and on again?', 2.4);
  },
  sisyphus: (F) => {
    const T = opening(F, 'And in a dry gully Newton met a man who would not stop pushing…');
    const rock = F.E.cast.prop?.boulder; const s = F.actor('sisyphus'); const a = H(F, -0.2, 0.4, 0), b = H(F, 1.0, -3.4, 0);
    if (rock && s) {
      F.track(T, T + 3.4, (u) => { const p = a.clone().lerp(b, ease.io(u)); s.root.position.copy(p).add(V(-0.55, 0, 0.8)); s.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); s.pose = 'push'; rock.position.copy(p).add(V(0, 0.42, 0)); rock.rotation.x -= 0.02; });
      F.track(T + 3.9, T + 5.0, (u) => { const p = b.clone().lerp(a, ease.in(u)); rock.position.copy(p).add(V(0, 0.42 + Math.abs(Math.sin(u * 9)) * 0.15, 0)); rock.rotation.x += 0.12; if (u >= 1) { s.pose = 'stand'; } });
      F.at(T + 3.9, () => { s.act('hurt'); audio.play('boulder_roll'); });
    }
    F.shot(T, T + 3.6, F.close('sisyphus', { d: 4.4, side: 0.9, up: 0.4, fov: 34 }), { cut: true }); F.card(T + 0.4, 'sisyphus');
    F.speak(T + 1.2, 'sisyphus', 'Hnnngh… almost… ALMOST…', 2.2);
    F.shot(T + 3.6, T + 5.4, F.fixed(H(F, -3.0, 2.6, 1.4), H(F, 0.4, -1.4, 0.6), 36), { cut: true }); F.say(T + 3.7, 'And down it rolled, as it always had.');
    F.shot(T + 5.4, T + 7.8, F.two('newton', 'sisyphus', { d: 2.4 }), { cut: true }); F.faceTo(T + 5.4, 'sisyphus', 'newton');
    F.speak(T + 5.6, 'sisyphus', "It's an internship. Unpaid. Eternal. Great for my CV.", 2.8);
  },
  pan: (F) => {
    const T = opening(F, 'And deep in a glade Newton heard music in no metre known to man…');
    const band = F.E.npcs || []; const pan = band[0];
    F.track(T, T + 7.5, (u, dt, t) => { band.forEach((n, i) => { n.root.position.y = Math.abs(Math.sin(t * 5.2 + i * 1.7)) * 0.12; }); if (Math.random() < dt * 4) F.puff(band[(Math.random() * band.length) | 0]?.root.position.clone().add(V(0, 1.6, 0)) || V(), 'notes', 1); });
    F.sfx(T + 0.2, 'pan_flute'); F.sfx(T + 1.4, 'pan_flute'); F.sfx(T + 2.6, 'drunk_laugh');
    F.shot(T, T + 3.0, F.fixed(H(F, 0.4, 5.4, 1.2), H(F, 0.6, -0.4, 1.3), 38), { cut: true }); F.card(T + 0.6, 'pan');
    if (pan) { F.act(T + 3.0, 'pan', 'cast'); }
    F.shot(T + 3.0, T + 5.6, F.close('pan', { d: 2.6, side: -0.35, fov: 30 }), { cut: true }); F.speak(T + 3.2, 'pan', 'You! You look like a man who understands polyrhythm.', 2.6);
    F.shot(T + 5.6, T + 7.6, F.two('newton', 'pan', { d: 2.6 }), { cut: true }); F.speak(T + 5.8, 'newton', 'I understand rhythm. Poly is pushing it.', 2.2);
  },
  icarus: (F) => { // he soars past the sun, his wax weeps, he tumbles from the sky and crash-lands beside Newton
    const T = opening(F, 'And on a crag above the gully, a boy with wings of wax was making ready…');
    const ic = F.actor('icarus'); if (!ic) return; const crag = ic.root.position.clone(); const sun = F.E.stage?.sunPos ? F.E.stage.sunPos.clone() : V(40, 30, -150);
    const toSun = sun.clone().sub(crag).normalize(); const apex = crag.clone().addScaledVector(toSun, 16); apex.y = Math.max(apex.y, crag.y + 9); const land = H(F, -2.7, 0.5, 0);
    F.pose(0, 'icarus', 'stretch');
    F.shot(T, T + 2.2, () => ({ p: crag.clone().add(V(-2.2, 0.6, 4.4)), l: crag.clone().add(V(0, 1.3, 0)), fov: 32 }), { cut: true }); F.card(T + 0.3, 'icarus');
    F.speak(T + 0.4, 'icarus', 'Dad says not to fly near the sun. Dad says a LOT of things.', 2.4);
    F.pose(T + 2.0, 'icarus', 'fly'); F.sfx(T + 2.1, 'whoosh_heavy'); F.puffAt(T + 2.1, crag.clone().add(V(0, 0.2, 0)), 'dust', 12);
    F.fly(T + 2.1, T + 5.0, 'icarus', crag.clone().add(V(0, 0.4, 0)), crag.clone().lerp(apex, 0.5).add(V(0, 4, 0)), apex, { e: ease.out });
    F.shot(T + 2.2, T + 5.0, F.chase('icarus', V(-3.6, -1.4, 5.6), { fov: 40, dy: 1.2 }), { cut: true, rp: 2.6, rl: 9 }); F.say(T + 2.4, 'Up he went, higher and higher, until the Sun himself took notice…');
    F.track(T + 3.8, T + 6.6, (u, dt) => { if (Math.random() < dt * 22) F.puff(ic.root.position.clone().add(V(0, 1.3, 0)), 'drip', 2); if (Math.random() < dt * 6) F.puff(ic.root.position.clone().add(V(0, 1.4, 0)), 'feather', 1); });
    F.sfx(T + 4.6, 'sizzle'); F.pose(T + 5.0, 'icarus', 'fall'); F.speak(T + 5.0, 'icarus', 'Uh-oh.', 1.4); F.say(T + 5.1, '…and his wax began to weep.');
    F.fly(T + 5.0, T + 6.6, 'icarus', apex, apex.clone().lerp(land, 0.4).add(V(0, 3, 0)), land, { e: ease.in, spin: [Math.PI * 2, 0.6], face: false });
    F.shot(T + 5.0, T + 6.6, F.chase('icarus', V(2.6, -1.8, 6.4), { fov: 42, dy: 1.0, toward: 'newton', k: 0.15 }), { cut: true, rl: 10, rp: 3.4 });
    F.state(T + 6.6, () => { ic.root.rotation.x = 0; ic.root.rotation.z = 0; ic.root.position.copy(land); ic.pose = 'sprawl'; }); F.at(T + 6.6, () => { F.puff(land, 'dust', 26); F.puff(land.clone().add(V(0, 0.6, 0)), 'feather', 10); audio.play('body_fall'); audio.play('hit_heavy', { vol: 0.6 }); F.E.engine.shake(0.45); F.actor('newton').act('hurt'); });
    F.act(T + 6.8, 'newton', 'think'); F.speak(T + 7.0, 'newton', '…Gravity. Undefeated.', 1.8);
    F.shot(T + 6.6, T + 9.6, F.two('newton', 'icarus', { d: 2.0, up: 0.2, fov: 32 }), { cut: true });
    F.pose(T + 7.9, 'icarus', 'stand'); F.faceTo(T + 7.9, 'icarus', 'newton'); F.speak(T + 8.2, 'icarus', 'Ow. So. You look scientific. Approve my design?', 2.6);
  },
  sphinx: (F) => {
    const T = opening(F, 'And at a gate of stone, something vast lay across the road…');
    const sp = F.actor('sphinx'); if (sp) sp.wingsOpen = 0;
    F.shot(T, T + 2.4, () => { const p = sp ? sp.root.position.clone() : H(F, 0.6, -1.2, 0); return { p: p.clone().add(V(-1.6, 0.5, 2.6)), l: p.clone().add(V(0.2, 0.25, 0.9)), fov: 30 }; }, { cut: true });
    F.say(T + 0.2, 'A lion’s paws. A falcon’s wings. A woman’s face, licking a pencil.');
    F.shot(T + 2.4, T + 5.0, F.close('sphinx', { d: 2.8, side: -0.2, up: 0.1, fov: 30 }), { cut: true }); F.card(T + 2.6, 'sphinx');
    if (sp) F.track(T + 3.0, T + 4.2, (u) => { sp.wingsOpen = ease.io(u); }); F.sfx(T + 3.0, 'whoosh_soft'); F.act(T + 3.0, 'sphinx', 'cast');
    F.speak(T + 3.4, 'sphinx', 'Answer correctly and pass. Answer wrongly and I eat you.', 2.8);
    F.shot(T + 5.0, T + 7.6, F.two('newton', 'sphinx', { d: 3.0, bias: 0.55 }), { cut: true }); F.act(T + 5.2, 'sphinx', 'laugh'); F.sfx(T + 5.2, 'drunk_laugh', { vol: 0.4 });
    F.speak(T + 5.4, 'sphinx', 'It is a VERY competitive programme.', 2.2); F.act(T + 6.2, 'newton', 'think');
  },
  narcissus: (F) => {
    const T = opening(F, 'And by a still pool, a young man knelt and did not look up…');
    F.actor('narcissus') && (F.actor('narcissus').pose = 'kneel');
    F.shot(T, T + 3.0, () => { const h = F.head('narcissus'); return { p: h.clone().add(V(-0.9, 0.7, 1.1)), l: h.clone().add(V(-0.3, -1.1, -1.4)), fov: 34 }; }, { cut: true });
    F.say(T + 0.2, 'He had been gazing so long that moss had grown upon his sandals.'); F.card(T + 0.8, 'narcissus');
    F.shot(T + 3.0, T + 5.6, F.close('narcissus', { d: 2.2, side: 0.5, up: -0.1, fov: 28 }), { cut: true });
    F.speak(T + 3.2, 'narcissus', 'Do not interrupt. I am in a relationship.', 2.6);
    F.shot(T + 5.6, T + 7.6, F.two('newton', 'narcissus', { d: 2.6 }), { cut: true }); F.speak(T + 5.8, 'newton', 'With… the pond?', 1.8); F.speak(T + 6.8, 'narcissus', 'With the face IN the pond.', 1.8);
  },
  prometheus: (F) => {
    const T = opening(F, 'And on a crag hung a titan in chains, selling the gods’ own fire…');
    const ea = F.actor('eagle'); const perch = ea ? ea.root.position.clone() : V(); const from = perch.clone().add(V(-9, 6, -6));
    F.shot(T, T + 2.6, F.close('prometheus', { d: 6.5, side: 0.2, up: -1.0, fov: 36 }), { cut: true }); F.card(T + 0.3, 'prometheus');
    F.track(T, T + 9, (u, dt) => { if (Math.random() < dt * 10) F.puff(H(F, 3.0, -0.8, 1.1), 'fire', 2); });
    F.speak(T + 0.6, 'prometheus', 'FIRE! Get your fire here! Gods HATE it!', 2.4);
    if (ea) { F.pose(T + 2.4, 'eagle', 'fly'); F.at(T + 2.4, () => ea.root.position.copy(from)); F.fly(T + 2.6, T + 4.8, 'eagle', from, perch.clone().add(V(-2, 3, 2)), perch); F.pose(T + 4.8, 'eagle', 'perch'); F.sfx(T + 2.8, 'whoosh_heavy'); F.sfx(T + 4.6, 'monster_growl', { vol: 0.4 }); }
    F.shot(T + 2.6, T + 4.9, () => ({ p: H(F, -1.6, 3.2, 1.6), l: (ea ? ea.root.position : perch).clone().add(V(0, 0.4, 0)), fov: 38 }), { cut: true, rl: 8 }); F.say(T + 2.8, 'Overhead, the eagle of Zeus came home for lunch.');
    F.shot(T + 4.9, T + 7.8, F.two('newton', 'prometheus', { d: 4.6, up: 0.6, bias: 0.6 }), { cut: true });
    F.speak(T + 5.1, 'prometheus', 'Cash only. The eagle takes cards.', 2.2); F.act(T + 5.6, 'eagle', 'cast'); F.speak(T + 6.4, 'newton', 'Is that… your liver?', 1.6);
  },
  toll: (F) => {
    const T = opening(F, 'And at a brook stood a bridge made entirely of stolen spoons…');
    const kob = F.E.npcs || []; const homes = kob.map((k) => k.root.position.clone()); kob.forEach((k) => { k.root.visible = false; });
    F.shot(T, T + 2.0, F.fixed(H(F, -2.6, 3.6, 1.1), H(F, 0.2, -0.6, 0.6), 34), { cut: true }); F.say(T + 0.2, 'It clinked when the wind blew. It was guarded.');
    kob.forEach((k, i) => { const t0 = T + 1.8 + i * 0.35; F.show(t0, k.root, true); F.at(t0, () => { F.puff(homes[i], 'splash', 10); audio.play('water_splash', { vol: 0.5 }); audio.play('goblin_laugh', { vol: 0.5 }); }); F.track(t0, t0 + 0.5, (u) => { k.root.position.copy(homes[i]).add(V(0, -1.2 * (1 - ease.out(u)) + Math.sin(u * Math.PI) * 0.4, 0)); }); });
    F.shot(T + 2.0, T + 4.6, F.two('toll', 'toll', { d: 3.6 }), { cut: false });
    F.card(T + 2.6, 'toll'); F.speak(T + 3.0, 'toll', 'TOLL! Twenty-five gold. Or a card. Or your left boot.', 2.6);
    F.shot(T + 4.6, T + 7.0, F.two('newton', 'toll', { d: 2.6 }), { cut: true }); F.speak(T + 4.8, 'newton', 'My boot is load-bearing.', 1.8); F.speak(T + 5.8, 'toll', 'We are FLEXIBLE.', 1.6);
  },
  archimedes: (F) => {
    const T = opening(F, 'And in the middle of the woods, there was a bathtub. And in the bathtub…');
    const ar = F.actor('archimedes');
    F.track(T, T + 9, (u, dt) => { if (Math.random() < dt * 6) F.puff(H(F, -0.6, 0.05, 0.75), 'bubbles', 2); });
    F.shot(T, T + 2.4, F.close('archimedes', { d: 3.4, side: 0.3, up: 0.6, fov: 34 }), { cut: true }); F.card(T + 0.3, 'archimedes');
    if (ar) { F.pose(T + 2.4, 'archimedes', 'stand'); F.track(T + 2.4, T + 3.0, (u) => { ar.root.position.y = 0.1 + Math.sin(u * Math.PI) * 0.6 + u * 0.25; }); F.act(T + 2.5, 'archimedes', 'cheer'); }
    F.puffAt(T + 2.5, H(F, -0.6, 0.05, 0.8), 'splash', 24); F.sfx(T + 2.5, 'water_splash'); F.sfx(T + 2.6, 'eureka');
    F.shot(T + 2.4, T + 4.8, F.close('archimedes', { d: 3.2, side: -0.2, up: 0.2, fov: 32 }), { cut: true }); F.speak(T + 2.7, 'archimedes', 'EUREKA!', 1.8);
    F.shot(T + 4.8, T + 7.4, F.two('newton', 'archimedes', { d: 2.6 }), { cut: true }); F.speak(T + 5.0, 'archimedes', 'Oh. A colleague. Want to measure something?', 2.6); F.act(T + 5.6, 'newton', 'think');
  },
  schrodinger: (F) => {
    const T = opening(F, 'And at a crossroads sat a crate, which was meowing, and also not…');
    const crate = F.E.cast.prop?.crate; const cat = F.actor('cat'); if (cat) cat.root.visible = false;
    F.shot(T, T + 2.6, () => { const p = crate ? crate.getWorldPosition(V()) : H(F, -0.6, 0, 0.6); return { p: p.clone().add(V(-1.0, 1.2, 2.8)), l: p.clone().add(V(0, 0.3, 0)), fov: 32 }; }, { cut: true });
    if (crate) F.track(T + 0.6, T + 2.4, (u, dt, t) => { crate.rotation.z = Math.sin(t * 40) * 0.05 * Math.sin(u * Math.PI); });
    F.sfx(T + 0.8, 'goblin_squeak', { vol: 0.4 }); F.say(T + 0.2, 'CONTENTS UNKNOWABLE, said the label. DO NOT OBSERVE.');
    if (cat) { const cp = () => cat.root.position.clone().add(V(0, 0.2, 0)); F.show(T + 2.8, 'cat', true); F.show(T + 4.2, 'cat', false); F.show(T + 5.0, 'cat', true); F.puffAt(T + 2.8, cp, 'sparkle', 12); F.sfx(T + 2.8, 'magic_sparkle'); F.puffAt(T + 4.2, cp, 'sparkle', 12); F.puffAt(T + 5.0, cp, 'sparkle', 8); }
    F.shot(T + 2.6, T + 5.2, () => { const p = cat ? cat.root.position.clone() : H(F, 0.5, 0.9, 0); return { p: p.clone().add(V(-0.4, 0.5, 1.6)), l: p.clone().add(V(0, 0.25, 0)), fov: 30 }; }, { cut: true }); F.card(T + 2.9, 'cat');
    F.speak(T + 3.1, 'cat', 'Mrrow.', 1.2); F.speak(T + 4.4, 'cat', '(silence)', 1.0);
    F.shot(T + 5.2, T + 7.4, F.two('newton', 'cat', { d: 2.4, up: 0.2 }), { cut: true }); F.speak(T + 5.4, 'newton', 'Was there just a cat? Is there one now?', 2.2);
  },
  discord: (F) => {
    const T = opening(F, 'And in the garden of the Hesperides, golden apples hung like lamps…');
    const er = F.actor('eris'); const land = er ? er.root.position.clone() : H(F, 1.6, -1.6, 0); const sky = land.clone().add(V(0.6, 7, -2));
    if (er) { er.root.visible = false; F.show(T + 1.4, 'eris', true); F.at(T + 1.4, () => { F.puff(sky, 'sparkle', 14); audio.play('magic_shimmer'); }); F.fly(T + 1.4, T + 3.6, 'eris', sky, sky.clone().lerp(land, 0.5).add(V(1.5, 1, 0)), land, { e: ease.out }); }
    F.shot(T, T + 3.8, () => ({ p: H(F, -2.8, 3.4, 1.0), l: (er ? er.root.position : land).clone().add(V(0, 1.4, 0)), fov: 38 }), { cut: true, rl: 8 }); F.say(T + 0.2, 'Then, out of a clear sky, the goddess of strife came calling.');
    F.shot(T + 3.8, T + 6.2, F.close('eris', { d: 2.6, side: -0.25, fov: 30 }), { cut: true }); F.card(T + 3.9, 'eris'); F.act(T + 4.0, 'eris', 'laugh'); F.puffAt(T + 4.1, () => F.head('eris').add(V(0.3, -0.5, 0.3)), 'gold', 12);
    F.speak(T + 4.3, 'eris', 'TO THE FAIREST. Do choose. Everyone ELSE will be furious.', 2.8);
    F.shot(T + 6.2, T + 8.4, F.two('newton', 'eris', { d: 2.6 }), { cut: true }); F.speak(T + 6.4, 'newton', 'I recognise the title of my own story.', 2.2);
  },
};

// ================================================================== reactions: the consequence of a choice
const first = (t) => String(t || '').split(/(?<=[.!?])\s+/)[0];
function reaction(F, ev, idx, text) {
  const hurt = /damage|bites|lose|ow\b|kicks back|furious/i.test(text); const key = { oracle: 'pythia', pan: 'pan', icarus: 'icarus', sisyphus: 'sisyphus', sphinx: 'sphinx', narcissus: 'narcissus', prometheus: 'prometheus', toll: 'toll', archimedes: 'archimedes', schrodinger: 'cat', discord: 'eris' }[ev.id];
  const who = key && F.actor(key) ? key : 'newton'; const N = F.actor('newton');
  F.shot(0, 3.8, who === 'newton' ? F.close('newton', { d: 2.6, side: 0.4, up: 0.4 }) : F.two('newton', who, { d: 2.2, up: 0.25 }), { cut: true });
  F.say(0.2, first(text));
  const R = {
    icarus() { const ic = F.actor('icarus'); if (!ic) return; const p0 = ic.root.position.clone();
      if (idx === 0) { F.pose(0.3, 'icarus', 'fly'); F.fly(0.3, 1.5, 'icarus', p0, p0.clone().add(V(1, 4, -1)), p0.clone().add(V(0.5, 3.4, -0.5))); F.pose(1.5, 'icarus', 'fall'); F.fly(1.5, 2.2, 'icarus', p0.clone().add(V(0.5, 3.4, -0.5)), p0.clone().add(V(-0.4, 3.2, 0.4)), F.head('newton').add(V(0, -0.4, 0)), { e: ease.in, face: false }); F.at(2.2, () => { N.act('hurt'); F.puff(N.root.position, 'dust', 20); audio.play('body_fall'); F.E.engine.shake(0.4); }); F.pose(2.4, 'icarus', 'fly'); F.fly(2.4, 3.8, 'icarus', F.head('newton').add(V(0, 0.3, 0)), p0.clone().add(V(4, 6, -6)), p0.clone().add(V(10, 12, -18)), { e: ease.in }); F.speak(2.5, 'icarus', 'Sorry! Keep the spares!', 1.8); }
      else if (idx === 1 && /ballast/.test(text)) { F.act(0.2, 'newton', 'cast'); F.puffAt(0.4, () => F.head('icarus'), 'sparkle', 14); F.pose(0.8, 'icarus', 'fly'); F.fly(0.8, 3.6, 'icarus', p0, p0.clone().add(V(2, 1.2, -2)), p0.clone().add(V(9, 2.2, -12)), { e: ease.in }); F.speak(1.0, 'icarus', 'Steady! Boring! Perfect!', 2); }
      else if (idx === 1) { F.track(0.4, 2.6, (u, dt) => { if (Math.random() < dt * 20) F.puff(ic.root.position.clone().add(V(0, 1.3, 0)), 'drip', 2); }); F.act(0.6, 'icarus', 'hurt'); F.speak(0.8, 'icarus', 'My wings! They are… soup.', 2); }
      else { F.act(0.3, 'icarus', 'laugh'); F.speak(0.5, 'icarus', 'Ugh. Physicists.', 1.6); F.fly(1.6, 3.6, 'icarus', p0, p0.clone().add(V(2, 0, 1)), p0.clone().add(V(6, 0, -2))); } },
    sphinx() { if (idx === 0) { F.act(0.3, 'sphinx', 'laugh'); F.puffAt(0.8, () => F.head('sphinx'), 'gold', 14); F.speak(0.6, 'sphinx', 'Correct! Always falling, always missing.', 2.4); } else if (idx === 1) { F.act(0.3, 'sphinx', 'attack'); F.at(0.75, () => { N.act('hurt'); F.E.engine.shake(0.35); audio.play('hit_heavy'); }); F.speak(1.0, 'sphinx', 'It LANDS. On heads, mostly.', 2.2); } else { F.act(0.3, 'sphinx', 'laugh'); F.act(1.5, 'sphinx', 'laugh'); F.sfx(0.4, 'drunk_laugh'); F.speak(0.6, 'sphinx', 'Ha! HA! Wrong, but ha!', 2); } },
    prometheus() { const fire = H(F, 3.0, -0.8, 1.2); if (idx === 2) { F.state(0.4, () => { for (const o of F.E.cast.extras || []) o.visible = false; }); F.at(0.4, () => { audio.play('metal_clang'); F.puff(F.head('prometheus').add(V(0, 0.5, 0)), 'sparkle', 20); }); F.act(0.6, 'prometheus', 'cheer'); F.pose(0.6, 'prometheus', 'stand'); if (F.actor('eagle')) { F.pose(1.2, 'eagle', 'fly'); const ep = F.actor('eagle').root.position.clone(); F.fly(1.2, 2.0, 'eagle', ep, ep.clone().add(V(-2, 2, 2)), F.head('newton')); F.at(2.0, () => { N.act('hurt'); F.E.engine.shake(0.35); audio.play('monster_hurt'); }); F.fly(2.0, 3.4, 'eagle', F.head('newton'), F.head('newton').add(V(2, 3, -2)), ep.clone().add(V(4, 8, -8))); } F.speak(1.0, 'prometheus', 'FREE! Come here, little friend!', 2); }
      else { F.track(0.3, 1.8, (u) => F.puff(fire.clone().lerp(F.head('newton'), u), idx === 1 ? 'zap' : 'fire', 3)); F.at(1.8, () => { N.act('cheer'); F.puff(F.head('newton'), 'fire', 16); audio.play('fire_whoosh'); }); F.speak(0.4, 'prometheus', idx === 1 ? 'Electric fire? Visionary!' : 'Pleasure doing business. Tell Zeus nothing.', 2.2); } },
    sisyphus() { if (idx === 0) { F.pose(0.2, 'sisyphus', 'push'); F.act(1.6, 'newton', 'cast'); F.speak(0.4, 'sisyphus', 'Together! Push! …It rolled.', 2.2); } else { F.act(0.3, 'sisyphus', idx === 2 ? 'hurt' : 'cheer'); F.speak(0.5, 'sisyphus', idx === 2 ? 'So it is… pointless? Thank you. Truly.' : 'A WHEEL! I quit! I QUIT!', 2.2); } },
    pan() { F.act(0.3, 'pan', idx === 2 ? 'attack' : 'cheer'); F.track(0, 3, (u, dt) => { if (Math.random() < dt * 5) F.puff(F.head('pan'), 'notes', 1); }); if (idx === 2) F.at(0.7, () => { N.act('hurt'); F.E.engine.shake(0.35); }); F.speak(0.5, 'pan', idx === 0 ? 'SWING! You swing, puppet!' : idx === 1 ? 'Who? …Fine. Something smooth.' : 'THIEF! Headbutts, boys!', 2.2); },
    narcissus() { F.act(0.3, 'narcissus', idx === 1 ? 'cheer' : 'talk'); F.puffAt(0.5, H(F, 0.4, 0.2, 0.2), 'splash', idx === 0 ? 16 : 6); F.speak(0.6, 'narcissus', idx === 1 ? 'Oh! OH! Look at me! Magnified!' : idx === 0 ? 'He winks back. Rude. Gorgeous, but rude.' : '…', 2.2); },
    toll() { if (idx === 1 && /Splash|push/.test(text)) { const kob = F.E.npcs || []; kob.forEach((k, i) => { const p = k.root.position.clone(); F.track(0.4 + i * 0.2, 1.2 + i * 0.2, (u) => { k.root.position.copy(p).add(V(0, Math.sin(u * Math.PI) * 0.6 - u * 1.4, u * 0.6)); }); F.at(1.2 + i * 0.2, () => { F.puff(p.clone().add(V(0, -0.3, 0.6)), 'splash', 14); audio.play('water_splash', { vol: 0.5 }); }); }); F.act(0.3, 'newton', 'cast'); }
      else { F.act(0.3, 'toll', 'cheer'); F.speak(0.5, 'toll', idx === 0 ? 'Pleasure! Mind your pockets!' : 'Close enough to a boot!', 2); } },
    archimedes() { F.act(0.3, 'archimedes', 'cheer'); F.puffAt(0.4, H(F, -0.6, 0.05, 0.8), 'splash', 12); F.speak(0.6, 'archimedes', idx === 1 ? 'Give me a place to stand!' : 'EUREKA! Again! Both of us!', 2.2); F.act(1.2, 'newton', 'cheer'); },
    schrodinger() { const cat = F.actor('cat'); if (idx === 0 && /ghost/.test(text)) { F.show(0.4, 'cat', true); F.puffAt(0.45, () => F.head('cat'), 'sparkle', 16); F.act(0.6, 'cat', 'cast'); F.at(1.0, () => { N.act('hurt'); F.E.engine.shake(0.3); }); F.speak(0.7, 'cat', 'HSSSSS.', 1.6); } else { F.show(0.4, 'cat', idx !== 1); F.speak(0.6, idx === 1 ? 'newton' : 'cat', idx === 1 ? 'I shall not look. Science respects privacy.' : 'Prrrrr.', 2); } },
    discord() { F.act(0.3, 'eris', 'laugh'); F.puffAt(0.5, () => F.head('eris'), 'gold', 16); F.speak(0.5, 'eris', idx === 2 ? 'Keep it? DELICIOUS. Let the wars begin!' : 'And so it begins. Again.', 2.4); const er = F.actor('eris'); if (er) { const p = er.root.position.clone(); F.fly(2.0, 3.6, 'eris', p, p.clone().add(V(0, 2, 0)), p.clone().add(V(1, 8, -3)), { e: ease.in }); F.show(3.6, 'eris', false); } },
    oracle() { F.act(0.3, 'pythia', idx === 1 && !/Short/.test(text) ? 'cheer' : 'hurt'); F.puffAt(0.5, H(F, 1.6, -1.5, 1.4), idx === 1 ? 'zap' : 'steam', 14); F.speak(0.6, 'pythia', idx === 0 ? 'THE ANSWER IS m TIMES v.' : idx === 2 ? 'OW. Prophetic.' : 'It… speaks!', 2.2); },
    tree() { if (idx === 0) { F.act(0.3, 'newton', 'bonk'); F.puffAt(0.4, () => F.head('newton'), 'sparkle', 12); F.sfx(0.35, 'apple_crunch'); } else F.act(0.3, 'newton', idx === 1 ? 'cheer' : 'think'); },
  };
  (R[ev.id] || (() => {}))();
  if (hurt && !['icarus', 'sphinx', 'prometheus', 'pan', 'schrodinger'].includes(ev.id)) F.act(1.0, 'newton', 'hurt');
  else if (!hurt) F.act(2.4, 'newton', 'cheer');
  F.at(3.8, () => {});
}

// ================================================================== public
export function eventCutscene(E, ev, { onReveal } = {}) {
  const F = new Film(E); const s = SCRIPTS[ev.id]; if (!s) return null;
  s(F); F.cleanup = () => { const kob = E.npcs || []; for (const k of kob) k.root.visible = true; };
  return F.play({ onReveal });
}
export function reactionCutscene(E, ev, idx, text) { const F = new Film(E); reaction(F, ev, idx, text); return F.play({}); }
export { SCRIPTS };
