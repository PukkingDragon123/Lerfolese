// Stylized low-poly stages, "magical Greek dusk": faceted terrain and props built from the lowpoly kit, a stepped
// gradient sky with a setting sun, layered ridges, flat cumulus streaks and arcane teal accents. Used by battles,
// events, the map diorama (dressMap) and the tabletop rooms (dressTabletop). No textures, no downloads.
import * as THREE from 'three';
import { mulberry32 } from '../core/util.js';
import { makeNoise } from '../gfx/pixel.js';
import * as LP from './lowpoly.js';
import { dressRoom } from './lowprops.js';

const { Mesher, PAL, M4 } = LP;
const V3 = THREE.Vector3; const TAU = Math.PI * 2;
const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export const firePit = LP.firePit;

const CAM = new V3(-0.1, 3, 11.4); // battle camera; the backdrop is framed for it (events sit close by)
const SUN_KEY = new V3(-0.6, 0.5, 0.45).normalize(); // key light direction handed to the scenes
const SUN_SKY = new V3(Math.sin(0.16), 0.064, -Math.cos(0.16)).normalize(); // setting sun, just right of centre
const GROUND = {
  meadow: { base: PAL.grass, patch: PAL.dryGrass, arena: PAL.dirt, patchAt: 0.56, grass: [PAL.grass, PAL.dryGrass], flowers: ['poppy', 'daisy', 'asphodel', 'gold'] },
  garden: { base: PAL.grass, patch: PAL.moss, arena: PAL.gravel, patchAt: 0.6, grass: [PAL.grass, PAL.moss], flowers: ['rose', 'daisy', 'lavender', 'asphodel'] },
  gully: { base: PAL.dryGrass, patch: PAL.dirt, arena: PAL.dirt, patchAt: 0.5, grass: [PAL.dryGrass, PAL.dryGrass], flowers: ['gold', 'poppy'] },
  labyrinth: { base: PAL.dryGrass, patch: PAL.grass, arena: PAL.stone, patchAt: 0.62, grass: [PAL.dryGrass, PAL.grass], flowers: ['asphodel', 'gold'] },
  marsh: { base: PAL.moss, patch: PAL.mud, arena: PAL.mud, patchAt: 0.52, grass: [PAL.moss, PAL.reed], flowers: ['lavender', 'daisy'] },
  guardian: { base: PAL.dryGrass, patch: PAL.grass, arena: PAL.gravel, patchAt: 0.6, grass: [PAL.dryGrass, PAL.grass], flowers: ['asphodel', 'poppy'] },
};

class Stage {
  constructor(theme, seed, { arenaClear = true } = {}) {
    this.theme = GROUND[theme] ? theme : 'meadow'; this.seed = seed; this.arenaClear = arenaClear; this.G = GROUND[this.theme]; this.amp = { garden: 0.4, labyrinth: 0.35, guardian: 0.3 }[this.theme] ?? 1;
    this.rnd = mulberry32(seed * 7919 + 13); this.n = makeNoise(seed + 3);
    this.group = new THREE.Group(); this.group.name = 'stage:' + this.theme; this.trees = []; this.blockers = []; this.pond = null; this.path = null;
    for (const k of ['near', 'far', 'grass', 'glow', 'flame', 'metal', 'water', 'ground', 'skyM']) this[k] = new Mesher();
    this.block(-6.4, -2.4, 1.1); this.block(7.0, -3.2, 1.1); // the battle's fire pits
  }
  arena(x, z) { const ax = (x - 0.8) / 8.8, az = (z + 0.3) / 3.7; return Math.sqrt(ax * ax + az * az); }
  h(x, z) {
    const n = this.n; let y = (n.fbm(x * 0.11 + 7, z * 0.11, 3) - 0.5) * 1.3 * this.amp;
    const back = sstep(-8, -32, z); y += back * (n.fbm(x * 0.04 + 11, z * 0.05 + 3, 4) * 9 - 2.6);
    y += Math.max(0, Math.abs(x) - 15) * 0.16 * (1 - back * 0.5);
    y *= 1 - sstep(1.3, 0.85, this.arena(x, z)) * 0.94;
    if (this.pond) { const p = this.pond(x, z); if (p > -0.4) y = Math.min(y, THREE.MathUtils.lerp(y, -0.42, sstep(-0.4, 0.15, p))); }
    return y;
  }
  view(z, m = 2) { return (CAM.z - z) * 0.55 + m; }
  rx(z, m = 2) { return CAM.x - 0.6 + (this.rnd() - 0.5) * 2 * this.view(z, m); }
  sunX(z) { return CAM.x + (SUN_SKY.x / -SUN_SKY.z) * (CAM.z - z); }
  inSun(x, z, w = 2.6) { return z < -9 && Math.abs(x - this.sunX(z)) < w; }
  clear(x, z, r) { for (const [bx, bz, br] of this.blockers) if ((x - bx) ** 2 + (z - bz) ** 2 < (r + br) ** 2) return false; return true; }
  block(x, z, r) { this.blockers.push([x, z, r]); }
  at(x, z, ry = this.rnd() * TAU, s = 1, dy = -0.07) { return M4(x, this.h(x, z) + dy, z, ry, s); }
  // a separately drawn object (birds perch on it); build(M, identityMatrix)
  solo(build, x, z, { ry = this.rnd() * TAU, s = 1, perch = true, r = 1, cast = true, dy = -0.07 } = {}) {
    const M = new Mesher(); build(M, new THREE.Matrix4()); const mesh = M.build('lp', { cast }); if (!mesh) return null;
    mesh.position.set(x, this.h(x, z) + dy, z); mesh.rotation.y = ry; mesh.scale.setScalar(s); this.group.add(mesh); if (perch) this.trees.push(mesh); this.block(x, z, r * s); return mesh;
  }
  olive(x, z, size = 1, o = {}) { const sd = this.seed * 13 + Math.round(x * 7 + z * 3); return this.solo((M, m) => LP.oliveTree(M, m, sd, { size, ...o }), x, z, { r: 1.1 * size }); }
  cypress(x, z, h = 5.5) { const sd = this.seed * 17 + Math.round(x * 5 - z * 3); return this.solo((M, m) => LP.cypress(M, m, sd, { h }), x, z, { r: 0.7 }); }
  dead(x, z, size = 1, moss = false) { const sd = this.seed * 19 + Math.round(x * 3 + z); return this.solo((M, m) => LP.deadTree(M, m, sd, { size, moss }), x, z, { r: 0.8 * size }); }
  rock(x, z, s = 0.6, o = {}) { if (!this.clear(x, z, s * 0.5)) return; LP.rock(z < -15 ? this.far : this.near, this.at(x, z, undefined, 1, -0.05), this.seed * 23 + Math.round(x * 11 + z * 7), { sx: s * (1.1 + this.rnd() * 0.4), sy: s * (0.65 + this.rnd() * 0.35), sz: s, ...o }); this.block(x, z, s); }
  bush(x, z, r = 0.65, flowers = null, pal = PAL.leaf) { if (!this.clear(x, z, r * 0.6)) return; LP.bush(z < -15 ? this.far : this.near, this.at(x, z), this.seed * 29 + Math.round(x * 9 + z * 5), { r, flowers, G: this.grass, pal }); this.block(x, z, r); }
  wisps(n, { z0 = -11, z1 = -3.6, y0 = 0.7, y1 = 2.8, col = '#7ff6ec' } = {}) { for (let i = 0; i < n; i++) { const z = z0 + this.rnd() * (z1 - z0); const x = this.rx(z, -1); LP.wisp(this.glow, new V3(x, this.h(x, z) + y0 + this.rnd() * (y1 - y0), z), 0.05 + this.rnd() * 0.95, { col }); } }
  // hills dressed with cypress spires, far olives and (optionally) a ruined temple on a rise
  backdrop({ cypress = 12, olives = 8, dead = 0, temple = null, leaf = PAL.olive } = {}) {
    if (temple) { const [tx, tz] = temple; const y = this.h(tx, tz) - 0.1; const ry = 0.18; const m = M4(tx, y, tz, ry, 1.15); for (let i = 0; i < 5; i++) { const br = i === 3; LP.column(this.far, m.clone().multiply(M4(-4.6 + i * 2.3, 0, 0, 0)), this.seed + i, { h: br ? 2.1 : 4.2, broken: br }); } LP.entablature(this.far, m.clone().multiply(M4(-2.3, 4.2, 0)), this.seed, { len: 5.4 }); this.far.add(LP.block(9.8, 0.35, 2.2, { bevel: 0.05, jit: 0.04, seed: 3 }), m.clone().multiply(M4(0, -0.1, 0)), LP.painter(PAL.marble, this.rnd, { base: 1.6, sun: 1 })); this.block(tx, tz, 6); }
    for (let i = 0; i < cypress; i++) { const z = -15 - this.rnd() * 20; const x = this.rx(z, 0); if (!this.clear(x, z, 0.8) || this.inSun(x, z, 4.5)) continue; const grove = this.rnd() < 0.45 ? 3 : 1; for (let k = 0; k < grove; k++) { const xx = x + k * 1.1 + (this.rnd() - 0.5) * 0.4, zz = z + (this.rnd() - 0.5) * 0.8; LP.cypress(this.far, this.at(xx, zz), this.seed * 41 + i * 5 + k, { h: 4.2 + this.rnd() * 3.2 }); } this.block(x, z, 0.6 + grove * 0.4); }
    for (let i = 0; i < olives; i++) { const z = -15 - this.rnd() * 18; const x = this.rx(z, 0); if (!this.clear(x, z, 1.5) || this.inSun(x, z, 3.5)) continue; LP.oliveTree(this.far, this.at(x, z), this.seed * 43 + i, { size: 0.85 + this.rnd() * 0.4, pal: leaf }); this.block(x, z, 1.4); }
    for (let i = 0; i < dead; i++) { const z = -15 - this.rnd() * 14; const x = this.rx(z, 0); if (!this.clear(x, z, 1) || this.inSun(x, z, 3)) continue; LP.deadTree(this.far, this.at(x, z), this.seed * 47 + i, { size: 0.9 + this.rnd() * 0.4 }); this.block(x, z, 1); }
  }
  meadowBits(nRocks = 7, nBush = 6, flowers = ['poppy', 'daisy', null]) {
    for (let i = 0; i < nRocks; i++) { const z = -3.8 - this.rnd() * 7; const x = this.rx(z, -0.5); if (this.arena(x, z) < 1.15) continue; this.rock(x, z, 0.35 + this.rnd() * 0.45, { moss: this.rnd() < 0.4 ? PAL.moss : null }); }
    for (let i = 0; i < nBush; i++) { const z = -4 - this.rnd() * 7; const x = this.rx(z, -0.5); if (this.arena(x, z) < 1.15) continue; this.bush(x, z, 0.5 + this.rnd() * 0.35, flowers[i % flowers.length]); }
  }
  // ground: faceted heightfield with arena patch, paths, contact shading under props
  terrain() {
    const g = this.G, n = this.n, rnd = this.rnd; const K = LP.KEY;
    const tone = (pal, nn, extra = 0, jit = 0.9) => { const t = 2 + (nn.y - 0.92) * 5 + nn.dot(K) * 0.9 + (rnd() - 0.5) * jit + extra; const i = Math.max(0, Math.min(4, Math.round(t))); return pal[i].clone().multiplyScalar(1 + (rnd() - 0.5) * 0.06); };
    const colorAt = (nn, c) => {
      let ao = 0; for (const [bx, bz, br] of this.blockers) { const d2 = (c.x - bx) ** 2 + (c.z - bz) ** 2; const rr = br * 1.3 + 0.3; if (d2 < rr * rr) ao -= (1 - Math.sqrt(d2) / rr) * 1.2; }
      if (this.pond && this.pond(c.x, c.z) > -0.25) return tone(PAL.mud, nn, ao - 0.6);
      const a = this.arena(c.x, c.z) + (n(c.x * 0.7, c.z * 0.7) - 0.5) * 0.4;
      if (this.arenaClear && a < 0.9) { const i = Math.max(0, Math.min(4, Math.round(2.05 + ao * 0.8 + (a > 0.76 ? -0.6 : 0) + (rnd() - 0.5) * 0.45 + (n(c.x * 0.35 + 9, c.z * 0.35) - 0.5) * 0.9))); return g.arena[i].clone().multiplyScalar(0.92 + rnd() * 0.1 + (n(c.x * 0.9, c.z * 0.9) - 0.5) * 0.16); }
      if (this.path && this.path(c.x, c.z) < 0.9 + (n(c.x, c.z) - 0.5) * 0.5) return tone(PAL.dirt, nn, ao - 0.2);
      if (nn.y < 0.8) return tone(this.theme === 'marsh' ? PAL.mud : PAL.stone, nn, ao);
      return tone(n.fbm(c.x * 0.15 + 3, c.z * 0.15, 3) > g.patchAt ? g.patch : g.base, nn, ao);
    };
    LP.terrain(this.ground, { x0: -58, x1: 58, z0: -48, z1: 14, step: 1.15, heightAt: (x, z) => this.h(x, z), colorAt, seed: this.seed });
  }
  meadowCarpet(nGrass = 1400, nFlowers = 160) {
    const g = this.G;
    const spot = (lo = -18) => { const z = lo + Math.pow(this.rnd(), 0.75) * (5 - lo); const x = this.rx(z, 1); return [x, z]; };
    for (let i = 0; i < nGrass; i++) {
      const [x, z] = spot(); const a = this.arena(x, z) + (this.n(x * 0.7, z * 0.7) - 0.5) * 0.4; if (a < 0.95 && this.arenaClear) continue; if (this.pond && this.pond(x, z) > -0.1) continue;
      if (z > 1.5 && this.rnd() < 0.75) continue;
      const dry = this.n.fbm(x * 0.15 + 3, z * 0.15, 3) > g.patchAt; const far = Math.max(0, -z - 6) * 0.02;
      LP.grassTuft(this.grass, x, this.h(x, z) - 0.03, z, this.rnd, { pal: g.grass[dry ? 1 : 0], h: 0.22 + this.rnd() * 0.2 + far, n: 5 + Math.floor(this.rnd() * 4), spread: 0.14, tone: a < 1.2 ? -0.5 : 0 });
    }
    for (let i = 0; i < nFlowers; i++) { const [x, z] = spot(-12); if (this.arena(x, z) < 1.12 || z > 1.8 || (this.pond && this.pond(x, z) > -0.1)) continue; const kind = g.flowers[Math.floor(this.n(x * 0.3, z * 0.3) * g.flowers.length * 0.999)]; const cl = 1 + Math.floor(this.rnd() * 3); for (let k = 0; k < cl; k++) LP.flower(this.grass, x + (this.rnd() - 0.5) * 0.4, this.h(x, z) - 0.03, z + (this.rnd() - 0.5) * 0.4, this.rnd, kind); }
  }
  sky() {
    this.group.add(LP.skyDome(this.theme, SUN_SKY));
    LP.mountains(this.skyM, this.theme, this.seed, { cam: CAM, sunDir: SUN_SKY }); LP.clouds(this.skyM, this.theme, this.seed, { sunDir: SUN_SKY });
  }
  finish() {
    const add = (m) => m && this.group.add(m);
    add(this.ground.build('lp', { cast: false })); add(this.near.build('lp')); add(this.far.build('lp', { cast: false })); add(this.metal.build('metal'));
    add(this.grass.build('grass', { cast: false })); add(this.water.build('water', { cast: false })); add(this.glow.build('glow', { cast: false, receive: false })); add(this.flame.build('flame', { cast: false, receive: false }));
    const sky = this.skyM.build('far', { cast: false, receive: false }); if (sky) { sky.renderOrder = -5; add(sky); }
  }
}

// ---------------------------------------------------------------- themes
const THEMES = {
  meadow(S) {
    S.olive(-9.4, -4.3, 1.25); S.olive(10.6, -5.8, 1.3);
    S.olive(-5.4, -9.6, 1.0); S.olive(10.4, -13.4, 0.95); S.olive(-12.8, -11.4, 1.1); S.olive(12.4, -12.8, 1.05);
    S.cypress(-2.6, -12.2, 6.2); S.cypress(-8.6, -13.4, 6.8); S.cypress(8.6, -9.6, 5.4); S.cypress(15.2, -15.5, 6.4);
    LP.column(S.near, S.at(-6.7, -5.9, 0.3), S.seed, { h: 2.6, broken: true }); S.block(-6.7, -5.9, 0.7); LP.fallenDrum(S.near, S.at(-5.4, -4.9, 0.7), S.seed + 1); S.block(-5.4, -4.9, 0.5);
    S.solo((M) => { LP.column(M, M4(-1.45, 0, 0), S.seed + 5, { h: 3.5 }); LP.column(M, M4(1.45, 0, 0), S.seed + 6, { h: 3.5 }); LP.entablature(M, M4(0, 3.5, 0), S.seed + 7, { len: 4.0 }); }, -14.2, -8.2, { ry: 0.3, r: 2.4 });
    LP.wallChunk(S.near, S.at(7.2, -7.2, -0.25), S.seed + 4, { len: 3.4, h: 1.4 }); S.block(7.2, -7.2, 1.8);
    LP.runeStone(S.near, S.glow, S.at(-8.6, -7.6, 0.35), S.seed, { h: 1.9 }); S.block(-8.6, -7.6, 0.6);
    LP.crystals(S.near, S.glow, S.at(4.4, -6.3), S.seed, { n: 4, h: 0.6 }); S.block(4.4, -6.3, 0.5);
    S.path = (x, z) => (z > -4 ? 9 : Math.abs(x - (-1.2 + Math.sin(z * 0.15) * 2.5 - (z + 4) * 0.35)) / 1.1);
    S.meadowBits(8, 7, ['poppy', 'daisy', null, 'gold']);
    S.backdrop({ cypress: 13, olives: 10, temple: [-10.5, -28] }); S.wisps(4);
  },
  garden(S) {
    const cz = -8.8; const sx = CAM.x + (SUN_SKY.x / -SUN_SKY.z) * (CAM.z - cz);
    S.solo((M) => { for (let i = 0; i < 4; i++) LP.column(M, M4(i * 3, 0, 0), S.seed + i, { h: 3.8, r: 0.3 }); LP.entablature(M, M4(4.5, 3.8, 0), S.seed, { len: 10.3 }); }, -15.6, cz, { ry: 0, r: 2 });
    S.solo((M) => { for (let i = 0; i < 3; i++) LP.column(M, M4(i * 3, 0, 0), S.seed + 9 + i, { h: 3.8, r: 0.3 }); LP.entablature(M, M4(3, 3.8, 0), S.seed + 3, { len: 7.3 }); }, sx + 3.8, cz - 0.4, { ry: 0, r: 2 });
    for (const [x, h] of [[-2.8, 1.6], [0.2, 2.4], [sx + 0.6, 1.1]]) { LP.column(S.near, S.at(x, cz, 0.2), S.seed + Math.round(x * 3), { h, r: 0.3, broken: true }); S.block(x, cz, 0.6); }
    LP.fallenDrum(S.near, S.at(-1.2, cz + 1.4, 0.4), 4); LP.fallenDrum(S.near, S.at(1.6, cz + 1.1, 2.1), 5);
    for (const [x, z, what] of [[-9.6, -5.6, 'amph'], [-5.0, -6.2, 'cry'], [6.2, -6.1, 'amph'], [10.4, -5.4, 'cry']]) { const m = S.at(x, z, 0.1, 1, -0.05); const top = LP.plinth(S.near, m, S.seed + Math.round(x), { w: 0.85, h: 1.1 }); if (what === 'amph') LP.amphora(S.near, m.clone().multiply(M4(0, top, 0, 0.5)), S.seed + 2, { s: 0.85 }); else LP.crystals(S.near, S.glow, m.clone().multiply(M4(0, top, 0)), S.seed + 3, { n: 5, h: 0.75, base: false }); S.block(x, z, 0.9); }
    for (const [x0, x1] of [[-13, -6.4], [7.2, 13.5]]) { const len = x1 - x0; LP.hedge(S.near, S.at((x0 + x1) / 2, -4.4, 0, 1, -0.04), S.seed + Math.round(x0), { len, h: 0.9, d: 0.8 }); S.block((x0 + x1) / 2 - len / 4, -4.4, len / 4); S.block((x0 + x1) / 2 + len / 4, -4.4, len / 4); }
    for (let i = 0; i < 7; i++) { const x = -15 + i * 4.6; if (Math.abs(x - sx - 0.5) < 2.4) continue; S.cypress(x, -12.6 + (i % 2) * 0.3, 5.8 + (i % 3) * 0.5); }
    S.olive(-10.5, -3.6, 1.15, { pal: PAL.leaf }); S.olive(11.4, -4.2, 1.2, { pal: PAL.leaf });
    for (let i = 0; i < 6; i++) { const z = -4.8 - S.rnd() * 3; const x = S.rx(z, -1); if (S.arena(x, z) > 1.15) S.bush(x, z, 0.45 + S.rnd() * 0.25, ['rose', 'lavender'][i % 2]); }
    LP.runeStone(S.near, S.glow, S.at(-12.2, -6.8, 0.4), S.seed + 1, { h: 1.7 });
    S.backdrop({ cypress: 10, olives: 8, leaf: PAL.leaf }); S.wisps(4);
  },
  gully(S) {
    const sxAt = (z) => CAM.x + (SUN_SKY.x / -SUN_SKY.z) * (CAM.z - z);
    S.solo((M) => LP.cliff(M, new THREE.Matrix4(), S.seed, { len: 15, h: 7.5, depth: 3 }), -10.5, -12.5, { ry: 0.12, r: 4 });
    S.solo((M) => LP.cliff(M, new THREE.Matrix4(), S.seed + 1, { len: 11, h: 6.5, depth: 3 }), sxAt(-13) + 9.5, -13.5, { ry: -0.15, r: 4 });
    LP.cliff(S.far, S.at(-22, -24, 0.2, 1, -0.4), S.seed + 2, { len: 18, h: 10, depth: 4 }); LP.cliff(S.far, S.at(sxAt(-26) + 15, -26, -0.1, 1, -0.4), S.seed + 3, { len: 22, h: 9, depth: 4 }); S.block(-22, -24, 8); S.block(sxAt(-26) + 15, -26, 10);
    LP.cliff(S.near, S.at(-12.6, -4.6, 1.25, 1, -0.3), S.seed + 4, { len: 7, h: 4.5, depth: 2.4 }); LP.cliff(S.near, S.at(13.8, -5.4, -1.3, 1, -0.3), S.seed + 5, { len: 7, h: 4, depth: 2.4 }); S.block(-12.6, -4.6, 3); S.block(13.8, -5.4, 3);
    for (const [x, z, s] of [[-6.3, -6.4, 1.4], [6.8, -7.2, 1.6], [-2.4, -8.6, 1.0], [3.4, -9.6, 1.2], [-9.2, -8.4, 1.2], [10.2, -8.8, 1.1]]) S.rock(x, z, s, { strata: 0.35, cap: PAL.dryGrass, cuts: 8 });
    S.dead(-4.4, -7.4, 1.1); S.dead(9.4, -10.4, 0.9);
    for (const [x, z] of [[-7.1, -5.1], [5.0, -5.6], [0.9, -9.4]]) { LP.crystals(S.near, S.glow, S.at(x, z), S.seed + Math.round(x * 3), { n: 5, h: 0.7 }); S.block(x, z, 0.5); }
    LP.runeStone(S.near, S.glow, S.at(-9.4, -5.6, 0.5), S.seed + 2, { h: 1.6 }); S.block(-9.4, -5.6, 0.5);
    S.meadowBits(5, 4, ['gold', null]);
    S.backdrop({ cypress: 3, olives: 2, dead: 4 }); S.wisps(3);
  },
  labyrinth(S) {
    const wall = (x, z, len, ry, crown = true, h = 2.5) => { S.solo((M) => LP.mazeWall(M, new THREE.Matrix4(), S.seed + Math.round(x * 7 + z * 3), { len, h, crown }), x, z, { ry, r: 0, perch: S.rnd() < 0.5 }); const c = Math.cos(ry), s = Math.sin(ry); for (let t = -0.5; t <= 0.5; t += 1 / Math.max(1, Math.round(len / 1.4))) S.block(x + c * t * len, z - s * t * len, 0.7); };
    const hedgeWall = (x, z, len, ry) => { S.solo((M) => LP.hedge(M, new THREE.Matrix4(), S.seed + Math.round(x * 5), { len, h: 2.4, d: 1.1 }), x, z, { ry, r: 0, perch: false }); const c = Math.cos(ry), s = Math.sin(ry); for (let t = -0.5; t <= 0.5; t += 1 / Math.max(1, Math.round(len / 1.4))) S.block(x + c * t * len, z - s * t * len, 0.8); };
    wall(-8.8, -5.6, 8.6, 0); wall(10.6, -6.2, 7.4, 0); wall(-4.6, -8.4, 5.6, Math.PI / 2); wall(6.8, -8.8, 5.2, Math.PI / 2, false);
    hedgeWall(-10.5, -10.8, 7.5, 0); wall(12.2, -11.2, 6, 0, false); hedgeWall(1.4, -13.6, 10, 0); wall(-13.6, -8.6, 5, Math.PI / 2);
    hedgeWall(-16, -15.2, 8, 0); hedgeWall(15.5, -15.8, 8, 0);
    // the gate: pillars, lintel, bull horns, braziers
    const gx = 0.1, gz = -8.2; S.solo((M) => { for (const sd of [-1, 1]) { LP.mazeWall(M, M4(sd * 1.75, 0, 0, 0), S.seed + 30 + sd, { len: 0.9, h: 3.4, d: 0.95, crown: false }); } M.add(LP.block(4.6, 0.55, 1.1, { bevel: 0.06, jit: 0.03, seed: 4 }), M4(0, 3.65, 0), LP.painter(PAL.stone, S.rnd, { base: 2, sun: 1.1 })); LP.horns(M, M4(0, 3.95, 0.1), S.seed, { span: 1.7 }); }, gx, gz, { ry: 0, r: 2.4 });
    for (const sd of [-1, 1]) LP.brazier(S.near, S.metal, S.flame, S.glow, S.at(gx + sd * 3.0, gz + 0.9, 0), S.seed + sd, { h: 0.9 });
    S.block(gx - 3, gz + 0.9, 0.6); S.block(gx + 3, gz + 0.9, 0.6);
    for (const [x, z, ry] of [[-8.8, -5.6 + 0.37, 0], [10.6, -6.2 + 0.37, 0]]) for (let i = 0; i < 3; i++) LP.glyph(S.glow, M4(x - 2.2 + i * 2.2, 1.35 + (i % 2) * 0.3, z + 0.02, ry), S.seed + i * 7 + Math.round(x), 0.42, '#3ff0dc', 2.2);
    LP.column(S.near, S.at(-6.2, -4.2, 0.4), S.seed + 2, { h: 1.6, broken: true }); LP.fallenDrum(S.near, S.at(-5.0, -3.9, 1.1), 2); S.block(-6.2, -4.2, 0.6);
    S.meadowBits(5, 3, ['asphodel', null]);
    S.backdrop({ cypress: 9, olives: 3, dead: 2 }); S.wisps(4);
  },
  marsh(S) {
    const n = S.n; S.pond = (x, z) => { const back = (-4.9 - z) + (n(x * 0.25 + 4, z * 0.25) - 0.5) * 2.4; const side = Math.max(-9.4 - x, x - 10.8) + (z > 0.6 ? -9 : 0) + (n(x * 0.3, z * 0.3 + 8) - 0.5) * 2; return Math.max(back, side) * 0.5 - (z < -24 ? 9 : 0); };
    LP.waterSheet(S.water, { x0: -46, x1: 46, z0: -26, z1: 6, y: -0.06, step: 1.0, seed: S.seed, sky: LP.SKIES.marsh.sun, mask: (x, z) => S.pond(x, z) > -0.3, sunLine: (x, z) => Math.abs(x - S.sunX(z)) * (1 + Math.max(0, -z - 6) * 0.04) });
    S.dead(-6.8, -8.6, 1.25, true); S.dead(7.8, -10.6, 1.05, true); S.dead(-12.4, -5.8, 1.3, true); S.dead(13.2, -7.2, 1.1, true);
    for (const [x, z] of [[-3.2, -7.4], [3.8, -6.8], [10.4, -4.2]]) { LP.stump(S.near, S.at(x, z), S.seed + Math.round(x * 3), { r: 0.28 + S.rnd() * 0.12 }); S.block(x, z, 0.4); }
    for (let i = 0; i < 9; i++) { const z = -4.5 - S.rnd() * 10; const x = S.rx(z, -1); S.rock(x, z, 0.35 + S.rnd() * 0.5, { moss: PAL.moss }); }
    for (const [x, z] of [[-9.8, -9.6], [2.2, -11.8]]) { LP.runeStone(S.near, S.glow, S.at(x, z, (S.rnd() - 0.5) * 0.6, 1, -0.35), S.seed + Math.round(x), { h: 1.8, col: '#5ff0b0' }); S.block(x, z, 0.5); }
    LP.crystals(S.near, S.glow, S.at(5.6, -5.4), S.seed + 4, { n: 5, h: 0.7, col: '#4ff0c0' }); S.block(5.6, -5.4, 0.5);
    for (let i = 0; i < 260; i++) { const z = -2 - S.rnd() * 18; const x = S.rx(z, 0); const p = S.pond(x, z); if (p < -0.55 || p > 0.6 || S.arena(x, z) < 1.1) continue; LP.reeds(S.grass, x, S.h(x, z) - 0.05, z, S.rnd, { n: 5 + Math.floor(S.rnd() * 5), h: 1.0 + S.rnd() * 0.7 }); }
    for (let i = 0; i < 70; i++) { const z = -5.5 - S.rnd() * 12; const x = S.rx(z, 0); if (S.pond(x, z) < 0.4) continue; LP.lilyPad(S.near, x, -0.03, z, S.rnd, S.grass); }
    S.backdrop({ cypress: 5, olives: 6, dead: 6, leaf: PAL.moss }); S.wisps(11, { z0: -12, z1: -4, y0: 0.4, y1: 2.2, col: '#8ff8d0' });
  },
  guardian(S) {
    LP.runeCircle(S.near, S.glow, M4(1.0, 0.03, -0.3, 0, new V3(1, 1, 0.7)), S.seed, { R: 5.2, width: 0.62, pal: PAL.marble });
    const cx = 1.0, cz = -1.5; const pts = []; for (let i = 0; i <= 8; i++) { const a = Math.PI + 0.3 + (i / 8) * (Math.PI - 0.6); pts.push([cx + Math.cos(a) * 11, cz + Math.sin(a) * 8.2, a]); }
    S.solo((M) => {
      const hy = pts.map(([x, z]) => S.h(x, z) - 0.12);
      pts.forEach(([x, z], i) => { const broken = i === 4 || i === 5; LP.column(M, M4(x, hy[i], z), S.seed + i, { h: broken ? 1.4 + (i % 2) : 4.2, broken }); });
      for (let i = 0; i < pts.length - 1; i++) { if (i >= 3 && i <= 5) continue; const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]; const len = Math.hypot(x1 - x0, z1 - z0); LP.entablature(M, M4((x0 + x1) / 2, Math.min(hy[i], hy[i + 1]) + 4.2, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0)), S.seed + i, { len: len + 0.9 }); }
    }, 0, 0, { ry: 0, r: 0, dy: -S.h(0, 0) });
    pts.forEach(([x, z]) => S.block(x, z, 0.8));
    for (const [x, z] of [[-8.4, -4.4], [10.2, -4.8]]) { LP.brazier(S.near, S.metal, S.flame, S.glow, S.at(x, z, 0), S.seed + Math.round(x), { h: 1.2 }); S.block(x, z, 0.7); }
    for (const [x, z] of [[-4.6, -9.6], [6.4, -10.2]]) { LP.runeStone(S.near, S.glow, S.at(x, z, (x < 0 ? 0.3 : -0.3)), S.seed + Math.round(x), { h: 2.2 }); S.block(x, z, 0.6); }
    for (const [x, z, h] of [[-6.8, -7.0, 1.0], [8.4, -7.6, 1.1], [1.4, -11.6, 1.4]]) { LP.crystals(S.near, S.glow, S.at(x, z), S.seed + Math.round(x * 3), { n: 7, h }); S.block(x, z, 0.8); }
    S.dead(-12.5, -7.5, 1.2); S.dead(13.5, -9, 1.0);
    S.meadowBits(4, 3, ['asphodel', null]);
    S.backdrop({ cypress: 8, olives: 3, dead: 4 }); S.wisps(6);
  },
};

function compose(theme, seed, { arenaClear = true } = {}) {
  const S = new Stage(theme, seed, { arenaClear }); S.sky();
  (THEMES[S.theme] || THEMES.meadow)(S);
  S.terrain(); S.meadowCarpet(S.theme === 'labyrinth' ? 1300 : S.theme === 'gully' ? 1400 : 2200, S.theme === 'gully' ? 70 : 190); S.finish();
  return S;
}
// scenes never free world geometry, so the previous stage / room releases its GPU buffers when a new one is built
// (safe: a disposed geometry simply re-uploads if it is ever drawn again)
const LIVE = { stage: [], room: [] };
function recycle(kind, obj) { for (const o of LIVE[kind].splice(0)) o.traverse((m) => m.geometry?.dispose()); if (obj) LIVE[kind].push(obj); }
export function buildLowPolyStage(theme = 'meadow', seed = 1, renderer = null, opts = {}) {
  recycle('stage', null); const S = compose(theme, seed, opts); recycle('stage', S.group); const sk = LP.SKIES[S.theme];
  const env = LP.gradientEnv(renderer, 'stage:' + S.theme, { top: sk.hi, hor: sk.hor, gnd: sk.gnd, sun: sk.sun, sunDir: SUN_KEY });
  return { group: S.group, theme: S.theme, trees: S.trees, env, background: null, sunDir: SUN_KEY.clone() };
}

// ---------------------------------------------------------------- battle / event stage
export async function realStage(theme = 'meadow', seed = 1, renderer, { arenaClear = true } = {}) {
  return buildLowPolyStage(theme, seed, renderer, { arenaClear });
}

// ---------------------------------------------------------------- map diorama dressing (miniature scale)
export async function dressMap(world, { count = 46, free, heightAt, rnd = mulberry32(3), W = 20, Z0 = 3, LEN = 36 } = {}) {
  const trees = []; const M = new Mesher(); const G = new Mesher();
  for (let i = 0; i < count; i++) {
    const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 1.1)) continue; const r = rnd(); const T = new Mesher(); const sd = 900 + i * 7;
    if (r < 0.5) LP.oliveTree(T, new THREE.Matrix4(), sd, { size: 0.9 + rnd() * 0.3 }); else if (r < 0.85) LP.cypress(T, new THREE.Matrix4(), sd, { h: 4.5 + rnd() * 2 }); else LP.deadTree(T, new THREE.Matrix4(), sd, { size: 0.9 });
    const o = T.build('lp'); o.position.set(x, heightAt(x, z) - 0.02, z); o.rotation.y = rnd() * TAU; o.scale.setScalar(0.24); o.userData.perchable = true; world.add(o); trees.push(o);
  }
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 0.8)) continue; const s = 0.16 + rnd() * 0.12; LP.rock(M, M4(x, heightAt(x, z) - 0.02, z, rnd() * TAU), 600 + i, { sx: s * 1.3, sy: s, sz: s * 1.1, moss: rnd() < 0.4 ? PAL.moss : null, detail: 0, cuts: 5 }); }
  for (let i = 0; i < 4; i++) { const x = (rnd() - 0.5) * (W - 4), z = -6 - i * 6; if (!free(x, z, 1.4)) continue; for (let k = 0; k < 3; k++) LP.column(M, M4(x + k * 0.55, heightAt(x + k * 0.55, z), z, 0, 0.22), 700 + i * 3 + k, { h: 3.4, broken: k === 1 }); }
  for (let i = 0; i < 160; i++) { const x = (rnd() - 0.5) * W, z = Z0 - rnd() * LEN; if (!free(x, z, 0.4)) continue; LP.grassTuft(G, x, heightAt(x, z) - 0.01, z, rnd, { h: 0.12, n: 4, spread: 0.05 }); }
  const rocks = M.build('lp'); if (rocks) world.add(rocks); const grass = G.build('grass', { cast: false }); if (grass) world.add(grass);
  return trees;
}

// ---------------------------------------------------------------- tabletop room props
export async function dressTabletop(scene, renderer, { kind = 'study' } = {}) {
  const env = LP.gradientEnv(renderer, 'room', { top: '#3a2a3a', hor: '#c8884a', gnd: '#2a1a1a' }); if (env) { scene.environment = env; scene.environmentIntensity = 0.5; }
  recycle('room', null); recycle('room', dressRoom(scene, kind));
}
