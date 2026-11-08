// 3D views for persistent battlefield objects and move projectiles.
import * as THREE from 'three';
import * as S from '../models/sculpt.js';
import * as P3 from '../models/props3d.js';
import { PROPS } from '../models/world.js';
import { baseOf } from '../game/combos.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.7, ...o });
const glow = (c, i = 2.5, o = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), transparent: o < 1, opacity: o, depthWrite: o >= 1 });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };

export function fieldView(f) {
  const g = new THREE.Group(); let spin = null; const upd = [];
  switch (f.type) {
    case 'sapling': {
      const small = new THREE.Group(); g.add(small);
      mk(S.horn([[0, 0, 0], [0.05, 0.3, 0], [0, 0.55, 0.02]], 0.05, 0.015, { sides: 4, segs: 3, seed: 3 }), F({ color: 0x5a3a20 }), small);
      for (let i = 0; i < 3; i++) mk(S.blob(0.16, 0.08, 0.1, { detail: 0, seed: 4 + i }), F({ color: 0x5f9a34 }), small, Math.cos(i * 2) * 0.12, 0.5 + i * 0.06, Math.sin(i * 2) * 0.1);
      const big = P3.tree({ apples: true }); big.scale.setScalar(1.6); big.position.y = 0.25; big.visible = false; g.add(big);
      upd.push(() => { big.visible = !!f.grown; small.visible = !f.grown; });
      break;
    }
    case 'boulder': case 'rolling': { const b = P3.stone({ seed: 7, kind: f.hot ? 'lava' : 'stone' }); b.scale.setScalar(1.5 + (f.heavy || 0) * 0.2); b.position.y = 0.45; g.add(b); spin = f.type === 'rolling' ? b : null; break; }
    case 'puddle': case 'wine': case 'rain': {
      const col = f.type === 'wine' ? 0x6a1838 : 0x2f7ab0; const pud = mk(S.blob(1.3, 0.04, 0.8, { detail: 1, seed: 9, amt: 0.25 }), F({ color: col, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.85 }), g, 0, 0.04, 0); pud.castShadow = false;
      if (f.type === 'rain') { const cl = new THREE.Group(); cl.position.y = 4.2; g.add(cl); for (let i = 0; i < 5; i++) mk(S.blob(0.6, 0.35, 0.5, { detail: 1, seed: 10 + i }), F({ color: 0x8a9ab0 }), cl, (i - 2) * 0.5, Math.sin(i) * 0.15, 0); }
      break;
    }
    case 'coil': {
      mk(S.limb(1.4, 0.18, 0.1, { sides: 6, seed: 11 }), F({ color: 0x3a2a20 }), g, 0, 1.4, 0);
      for (let i = 0; i < 6; i++) { const r = mk(S.facet(new THREE.TorusGeometry(0.22 - i * 0.015, 0.035, 3, 8)), F({ color: 0xc87a3a, metalness: 0.9, roughness: 0.3 }), g, 0, 0.25 + i * 0.2, 0); r.rotation.x = Math.PI / 2; }
      const top = mk(S.gem(0.22, 1, 12), glow(0x8fe3ff, 2.2), g, 0, 1.6, 0); spin = top; break;
    }
    case 'campfire': {
      for (let i = 0; i < 4; i++) { const l = mk(S.limb(0.9, 0.09, 0.07, { sides: 5, seed: 13 + i }), F({ color: 0x4a2a16 }), g, 0, 0.12, 0); l.rotation.set(Math.PI / 2, i * 0.8, 0); l.position.set(Math.cos(i * 0.8) * 0.3, 0.1, -Math.sin(i * 0.8) * 0.3); }
      for (let i = 0; i < 7; i++) mk(P3.stone().children[0].geometry, F({ color: 0x5a5458 }), g, Math.cos(i) * 0.6, 0.08, Math.sin(i) * 0.5).scale.setScalar(0.25);
      const fl = P3.flame({ scale: 0.9 }); fl.position.y = 0.55; g.add(fl); upd.push((t) => { fl.scale.set(0.9 + Math.sin(t * 13) * 0.06, 0.9 + Math.sin(t * 9) * 0.1, 0.9); });
      break;
    }
    case 'well': case 'whirl': {
      const col = f.type === 'well' ? 0xb48cff : 0xd0f0ff;
      for (let i = 0; i < 3; i++) { const r = mk(S.facet(new THREE.TorusGeometry(0.6 + i * 0.35, 0.04, 3, 12)), glow(col, 1.8, 0.75), g, 0, 0.3 + i * 0.25, 0); r.rotation.x = Math.PI / 2; r.castShadow = false; upd.push((t) => { r.rotation.z = t * (1.5 - i * 0.4) * (f.type === 'whirl' ? 3 : 1); r.position.y = 0.3 + i * 0.25 + Math.sin(t * 2 + i) * 0.05; }); }
      if (f.type === 'well') mk(S.gem(0.35, 1, 14), F({ color: 0x0b0716, emissive: 0x3e2b6b, emissiveIntensity: 1.2 }), g, 0, 0.9, 0);
      break;
    }
    case 'glass': { const m = P3.magnifier(); m.scale.setScalar(1.1); m.position.y = 1.6; m.rotation.set(-0.9, 0, 0.3); g.add(m); mk(S.limb(1.2, 0.04, 0.03, { sides: 4, seed: 15 }), F({ color: 0x5a3a20 }), g, 0, 1.2, -0.2); break; }
    case 'catapult': {
      mk(S.slab(1.4, 0.2, 0.8, { seed: 16 }), F({ color: 0x6e4024 }), g, 0, 0.15, 0);
      const arm = new THREE.Group(); arm.position.set(-0.3, 0.35, 0); g.add(arm); mk(S.slab(1.6, 0.12, 0.14, { seed: 17 }), F({ color: 0x8a5634 }), arm, 0.6, 0, 0); mk(S.turn([[0.001, 0], [0.25, 0.05], [0.28, 0.2], [0.001, 0.15]], { sides: 7, seed: 18 }), F({ color: 0x6e4024 }), arm, 1.35, 0.08, 0);
      const sp = P3.spring(); sp.scale.setScalar(0.4); sp.position.set(0.3, 0.35, 0); g.add(sp);
      upd.push(() => { arm.rotation.z = f.loaded ? 0.15 : 0.6; }); break;
    }
    case 'steam': { for (let i = 0; i < 9; i++) { const b = mk(S.blob(0.7, 0.5, 0.6, { detail: 1, seed: 20 + i }), F({ color: 0xf0f0f6, transparent: true, opacity: 0.55, roughness: 1 }), g, (i - 4) * 0.9, 1.2 + Math.sin(i) * 0.4, Math.cos(i) * 0.4); b.castShadow = false; upd.push((t) => { b.position.y = 1.2 + Math.sin(t + i) * 0.3; }); } break; }
    case 'moon': { const m = P3.planet({ kind: 'moon', r: 0.35 }); g.add(m); spin = m; break; }
    case 'momentum': { const core = projectileModel(f.art || { core: 'apple' }); core.scale.setScalar(0.6); g.add(core); spin = core; const r = mk(S.facet(new THREE.TorusGeometry(0.55, 0.02, 3, 12)), glow(0x8fe3ff, 2, 0.7), g); r.rotation.x = Math.PI / 2; break; }
    default: mk(S.gem(0.3, 1, 30), F({ color: 0xffffff }), g);
  }
  return { group: g, update(dt, t) { if (spin) spin.rotation.y += dt * 2; for (const u of upd) u(t); } };
}

export function projectileModel(art) {
  const core = baseOf(art.core || 'apple');
  const m = core === 'stone' ? P3.stone({ kind: art.hot ? 'lava' : 'stone' }) : core === 'water' ? P3.droplet() : core === 'spark' ? P3.bolt() : core === 'heat' ? P3.flame()
    : core === 'mass' ? P3.weight() : core === 'force' ? P3.fist() : core === 'rotation' ? P3.top() : core === 'lens' ? P3.magnifier() : core === 'spring' ? P3.spring() : core === 'inertia' ? P3.rollingBall()
    : P3.apple({ kind: art.core === 'golden_apple' ? 'gold' : art.core === 'rotten_apple' ? 'rotten' : 'red' });
  const g = new THREE.Group(); g.add(m);
  if (art.hot && core !== 'stone' && core !== 'heat') { const f = P3.flame({ scale: 0.6 }); f.position.y = 0.2; g.add(f); }
  if (art.electric && core !== 'spark') g.add(P3.sparkArcs(0xfff0a0, 5));
  g.scale.setScalar(0.55 + Math.min(3, art.heavy || 0) * 0.15);
  return g;
}
export { PROPS };
