// 3D views for persistent battlefield objects and move projectiles.
import * as THREE from 'three';
import * as S from '../models/sculpt.js';
import * as P3 from '../models/props3d.js';
import { PROPS } from '../models/world.js';
import { standee, Animated, safeDrawn } from '../ui3d/standee.js';
import { baseOf } from '../game/combos.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.7, ...o });
const glow = (c, i = 2.5, o = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), transparent: o < 1, opacity: o, depthWrite: o >= 1 });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };

export function fieldView(f) {
  const g = new THREE.Group(); const upd = []; const anims = [];
  const anim = (name, frames, opts) => { const a = new Animated(name, frames, opts); anims.push(a); g.add(a.mesh); return a.mesh; };
  const light = (color, inten, y) => { const l = new THREE.PointLight(color, inten, 7, 2); l.position.y = y; g.add(l); upd.push((t) => (l.intensity = inten * (0.8 + Math.sin(t * 13) * 0.12 + Math.sin(t * 29) * 0.08))); };
  const has = (n) => !!safeDrawn(n, 0);
  switch (f.type) {
    case 'sapling': { const small = standee('sapling', { height: 1.3, args: [false] }); const big = standee('sapling', { height: 3.4, args: [true] }); big.visible = false; g.add(small, big); upd.push(() => { big.visible = !!f.grown; small.visible = !f.grown; }); break; }
    case 'boulder': case 'rolling': { const b = standee('boulder', { height: 1.5 + (f.heavy || 0) * 0.25 }); g.add(b); if (f.type === 'rolling') upd.push((t) => { b.position.y = Math.abs(Math.sin(t * 6)) * 0.08; }); break; }
    case 'puddle': case 'wine': case 'rain': {
      const d = standee('puddle', { height: 1.6, anchor: 'center', flat: true, args: [f.type === 'wine' ? 'wine' : 'water'], cast: false }); d.position.y = 0.04; g.add(d);
      if (f.type === 'rain') { const c = anim(has('rain_cloud') ? 'rain_cloud' : 'steam', [0, 1, 2, 3], { height: 1.6, fps: 6 }); c.position.y = 3.6; }
      break;
    }
    case 'coil': anim('coil', [0, 1, 2], { height: 2.6, fps: 12 }); light(0x8fe3ff, 6, 2.4); break;
    case 'campfire': { if (has('firepit')) g.add(standee('firepit', { height: 0.9 })); anim('campfire', [0, 1, 2, 3], { height: 2.0, fps: 10, emissive: 0.6 }); light(0xff9040, 9, 1.0); break; }
    case 'well': { const w = anim('well', [0, 1, 2, 3], { height: 1.8, anchor: 'center', flat: true, fps: 8 }); w.position.y = 0.05; break; }
    case 'whirl': { const w = anim(has('whirl') ? 'whirl' : 'well', [0, 1, 2, 3], { height: 2.2, fps: 12 }); break; }
    case 'glass': { if (has('burning_glass')) g.add(standee('burning_glass', { height: 2.4 })); light(0xffe08a, 4, 2); break; }
    case 'catapult': { if (has('catapult')) { const a = standee('catapult', { height: 1.6, args: [false] }), b = standee('catapult', { height: 1.6, args: [true] }); g.add(a, b); upd.push(() => { a.visible = !f.loaded; b.visible = !!f.loaded; }); } break; }
    case 'steam': { for (let i = 0; i < 3; i++) { const m = anim('steam', [0, 1, 2, 3], { height: 2.2, fps: 5 }); m.position.set((i - 1) * 2.2, 0.4 + i * 0.3, -i * 0.3); } break; }
    case 'moon': { const m = has('moon') ? standee('moon', { height: 0.9, anchor: 'center' }) : standee('token', { height: 0.9, anchor: 'center' }); g.add(m); break; }
    case 'momentum': { const core = projectileModel(f.art || { core: 'apple' }); core.scale.setScalar(0.6); g.add(core); upd.push((t) => (core.rotation.y = t * 3)); break; }
    default: break;
  }
  return { group: g, update(dt, t) { for (const a of anims) a.update(dt); for (const u of upd) u(t); } };
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
