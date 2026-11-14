// Battle bodies for the bosses that live elsewhere in the game: Archimage Croakley (the star gallery's wizard frog,
// models/frog.js), the Bookworm Queen and her brood (the library's bookworms, models/bookworm.js, grown to monster
// size), and the event bosses, the Sphinx and Prometheus' eagle (models/npcs/beasts.js). Each is wrapped into the
// createCreature api the battle uses: { root, height, st, act(mode), talk(sec), update(dt), impactTime }.
import * as THREE from 'three';
import { createFrog } from './frog.js';
import { createBookworm } from './bookworm.js';
import { createSphinx, createEagle } from './npcs/beasts.js';
import { Spring } from '../core/tween.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function frogBoss(seed) {
  const F = createFrog(); const A = F.api; let t = Math.random() * 9; F.lookAt(V(-3.5, 1.4, 1.2)); // he watches Newton
  return {
    root: F.root, height: A.height || 1.9, st: A.st, impactTime: 0.45, setWounds: A.setWounds?.bind(A),
    act(m) { if (m === 'attack') A.act(Math.random() < 0.55 ? 'tongue' : 'hop'); else if (m === 'cast') { A.act('cast'); } else A.act(m); return m === 'attack' ? 0.45 : undefined; },
    talk(s) { A.talk(s); }, update(dt) { t += dt; F.update(dt, t); },
  };
}

// a low-poly gold crown for the queen (eight points, a band of set stones)
function crown() {
  const g = new THREE.Group(); const gold = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.7, roughness: 0.35, flatShading: true }); const gem = new THREE.MeshStandardMaterial({ color: 0x8a1a3a, roughness: 0.25, flatShading: true });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.016, 8, 1, true), gold); band.material.side = THREE.DoubleSide; g.add(band);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.024, 4), gold); sp.position.set(Math.cos(a) * 0.031, 0.019, Math.sin(a) * 0.031); g.add(sp); if (i % 2 === 0) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.005, 0), gem); s.position.set(Math.cos(a) * 0.034, 0, Math.sin(a) * 0.034); g.add(s); } }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
function wormBoss(seed, queen) {
  const W = createBookworm({ seed: seed + (queen ? 7 : 1), robe: queen ? '#4a1a52' : null, scarf: queen ? '#c89a30' : null, monocle: queen, book: '#5a2a24' });
  const S = queen ? 11 : 5.5; const root = new THREE.Group(); root.name = queen ? 'bookworm_queen' : 'bookworm'; W.root.scale.setScalar(S); root.add(W.root); W.setMode('crawl');
  const bones = Object.fromEntries(W.mesh.skeleton.bones.map((b) => [b.name, b]));
  if (queen) { const c = crown(); c.rotation.x = -Math.PI / 2; c.position.set(0, 0.03, 0.02); bones.h5.add(c); }
  const st = { t: Math.random() * 9, mode: 'idle', modeT: 0, hit: new Spring(0, 14, 0.35), lunge: new Spring(0, 9, 0.45), lift: new Spring(0, 10, 0.4), dead: 0, talk: 0 };
  const api = {
    root, height: queen ? 2.7 : 0.9, st, impactTime: 0.35,
    act(m) { if (st.dead > 0 && m !== 'die') return; st.mode = m; st.modeT = 0; if (m === 'hurt') { st.hit.kick(10); W.react(); } if (m === 'attack') st.lunge.kick(10); if (m === 'cast') st.lift.kick(7); if (m === 'die') st.dead = 0.001; return m === 'attack' ? 0.35 : undefined; },
    talk(s = 1) { st.talk = s; },
    update(dt) {
      st.t += dt; st.modeT += dt; for (const k of ['hit', 'lunge', 'lift']) st[k].update(dt); if (st.talk > 0) st.talk -= dt; if (st.dead > 0) st.dead = Math.min(1, st.dead + dt * 1.2); if (st.mode !== 'idle' && st.mode !== 'die' && st.modeT > 1.3) st.mode = 'idle';
      W.update(dt, st.t);
      // the queen rears like a cobra over the field, swaying; the brood keeps low and lifts its fore end to snap
      const t = st.t, alive = 1 - st.dead, sw = Math.sin(t * 0.9) * 0.18, L = st.lunge.value * 0.06, H = st.hit.value * 0.04, R = st.lift.value * 0.05;
      const rear = queen ? [-0.5, -0.55, -0.42, 0.18, 0.42] : [-0.12, -0.18, -0.08, 0.1, 0.12];
      for (let i = 1; i <= 5; i++) { const b = bones['h' + i]; if (!b) continue; b.rotation.x = (rear[i - 1] - (i <= 3 ? R : 0) + (i >= 4 ? L * 2 : -L) + H * (i <= 2 ? 1 : -1) + (queen ? Math.sin(t * 2.1 + i) * 0.03 : Math.sin(t * 3 + i) * 0.05)) * alive + (st.dead > 0 ? 0.02 * i * st.dead : 0); b.rotation.y = sw * (queen ? 0.5 : 1) * (i / 5) * alive; }
      if (queen) for (let i = 1; i <= 5; i++) { const b = bones['t' + i]; if (b) b.rotation.y = (-0.55 + Math.sin(t * 0.7 + i * 0.5) * 0.06) * alive; }
      root.position.y = -st.dead * 0.15; root.rotation.z = st.dead * 0.25;
      const hl = !!root.userData.hl; W.mesh.material.emissive?.setRGB(hl ? 0.18 : 0, hl ? 0.14 : 0, hl ? 0.1 : 0);
    },
  };
  return api;
}

function genericBoss(make, { pose = null, height = null } = {}) { return (seed) => { const a = make(seed); if (pose) a.pose = pose; if (height) a.height = height; a.update(0.016); return a; }; }

export const BOSS_BUILD = {
  frog_wizard: frogBoss,
  bookworm_queen: (s) => wormBoss(s, true),
  bookworm: (s) => wormBoss(s, false),
  sphinx: genericBoss(createSphinx, { pose: 'stand' }),
  eagle: genericBoss(createEagle, { pose: 'fly' }),
};
