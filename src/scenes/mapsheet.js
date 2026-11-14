// The run map as a big MINIATURE DIORAMA on a walnut plinth in a dim study (models/diorama.js): sculpted terrain,
// river, lake, waterfall, village, tree clumps and dirt paths; each node is a painted little scene (models/minis.js:
// enemy figurines mid-fight, elites and the guardian on rocky plinths, a "?" rune shrine, Diogenes' barrel stall,
// an alchemist's pavilion); Sir Isaac's own figurine walks the paths. Fog of war (models/mapfog.js) covers the rows
// beyond reach and rolls back as he advances. Golden runes mark the routes he may take; boot prints the ones he took.
// Built once per run and cached, so returning from a node is instant.
import * as THREE from 'three';
import { clamp } from '../core/util.js';
import { Spring } from '../core/tween.js';
import { Diorama, DIO, START } from '../models/diorama.js';
import { NodeMini, heroMini } from '../models/minis.js';
import { MapFog, FogPass } from '../models/mapfog.js';
import { Particles } from '../gfx/particles.js';
import { reachable } from '../game/run.js';
import * as T from '../models/toon.js';

const V3 = THREE.Vector3;
let CACHE = null;

export class MapSheet {
  /** the cached diorama for this run (or a fresh one) */
  static for({ engine, run, map }) {
    const key = `${run.seed}|${JSON.stringify(map.starts)}|${Object.keys(map.nodes).length}`;
    if (CACHE && CACHE.key === key) { CACHE.sheet.engine = engine; CACHE.sheet.run = run; CACHE.sheet.map = map; return CACHE.sheet; }
    if (CACHE) CACHE.sheet.dispose(); const sheet = new MapSheet({ engine, run, map }); CACHE = { key, sheet }; return sheet;
  }
  constructor({ engine, run, map }) {
    this.engine = engine; this.run = run; this.map = map; const seed = run.seed || 1;
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color('#17121c'); sc.fog = new THREE.Fog('#17121c', 70, 150);
    this.camera = new THREE.PerspectiveCamera(34, engine.aspect, 0.2, 400); sc.add(this.camera);
    this.world = new THREE.Group(); sc.add(this.world); this.bounds = { LEN: DIO.ZN - DIO.ZF, WID: DIO.X1 - DIO.X0, Z0: DIO.ZN };
    // lighting: a warm low lamp key raking across the board (long shadows), cool sky fill, lavender rim from behind
    const key = (this.key = new THREE.DirectionalLight('#ffe0b4', 2.5)); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 90 }); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; sc.add(key, key.target);
    sc.add(new THREE.HemisphereLight('#c8d8ff', '#6a4836', 0.8));
    const rim = (this.rim = new THREE.DirectionalLight('#b0a0ff', 0.55)); sc.add(rim, rim.target);
    for (const [x, z] of [[DIO.X0 - 2.5, DIO.ZN + 1.5], [DIO.X1 + 2.5, DIO.ZN - 6]]) { const l = new THREE.PointLight('#ffa050', 18, 26, 1.6); l.position.set(x, 3.2, z); sc.add(l); const f = T.animeFlame(0.35, 0.6); f.position.set(x, DIO.BASE - 1.18 + 1.2, z); sc.add(f); this.world.add(candleStick(x, z)); }
    // the diorama
    const dio = (this.dio = new Diorama({ map, seed })); this.world.add(dio.group); this.heightAt = (x, z) => dio.heightAt(x, z);
    this.ready = dio.dress();
    this.fog = new MapFog(dio); this.world.add(this.fog.group); this.fogPass = new FogPass(this.fog, this.camera);
    this.parts = new Particles(900); this.world.add(this.parts.points); this.glow = new Particles(500, { additive: true }); this.world.add(this.glow.points);
    this.nodeViews = new Map(); this.routeFX = null; this.ray = new THREE.Raycaster(); this.focus = new V3(); this.hovered = null; this.smokeT = 0; this.moteT = 0;
    this.hero = heroMini({ items: () => this.run?.items }); this.world.add(this.hero.root); // the figurine wears his curios too
  }
  /** free the GPU side of a previous run's diorama (three re-uploads anything shared that is drawn again) */
  dispose() { this.fogPass.detach(); this.scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose?.()); }); this.dio.colorTex?.dispose(); this.dio.maskTex?.dispose(); }
  /** hook the fog pass into the engine while the map is on screen */
  attach() { this.fogPass.attach(this.engine, this.world); this.fogPass.sync(); }
  detach() { this.fogPass.detach(); }
  pos(nd) { const p = this.dio.pos.get(typeof nd === 'string' ? nd : nd.id); return p ? { x: p[0], z: p[1] } : { x: START[0], z: START[1] }; }

  // ------------------------------------------------ nodes, routes
  addNode(nd) {
    if (this.nodeViews.has(nd.id)) return this.nodeViews.get(nd.id);
    const mini = new NodeMini(nd, { run: this.run, dio: this.dio }); this.world.add(mini.root);
    const v = { nd, mini, hit: mini.hit, g: mini.root, s: { kick: (k) => { mini.kick = Math.min(1.2, mini.kick + k * 0.12); } }, reachable: false, visited: false };
    this.nodeViews.set(nd.id, v); return v;
  }
  buildPaths(run) {
    if (this.routeFX) { this.world.remove(this.routeFX); this.routeFX.geometry.dispose(); this.routeFX = null; }
    const path = run.path || []; const vset = new Set(); let prev = 'start'; for (const id of path) { vset.add(prev + '>' + id); prev = id; }
    const cur = run.pos || 'start'; const reach = new Set(reachable(run));
    const pos = [], att = [], idx = []; let vi = 0;
    for (const r of this.dio.routes.values()) {
      const st = vset.has(r.a + '>' + r.b) ? 2 : r.a === cur && reach.has(r.b) ? 1 : 0; if (!st) continue;
      const P = r.pts, Y = r.y; let u = 0; const A = P[0], B = P[P.length - 1];
      for (let i = 0; i < P.length; i++) {
        if (i) u += P[i].distanceTo(P[i - 1]); const dA = Math.hypot(P[i].x - A.x, P[i].z - A.z), dB = Math.hypot(P[i].x - B.x, P[i].z - B.z); const fade = Math.min(1, Math.max(0, (Math.min(dA, dB) - 0.75) / 0.4));
        const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)]; let dx = q.x - o.x, dz = q.z - o.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const w = 0.26;
        for (const s of [-1, 1]) { pos.push(P[i].x - dz * w * s, Y[i] + 0.035, P[i].z + dx * w * s); att.push(u, s, st, fade); }
        if (i) { const a = vi - 2, b = vi - 1, c = vi, d = vi + 1; idx.push(a, c, b, b, c, d); } vi += 2;
      }
      vi = pos.length / 3;
    }
    if (!idx.length) return;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aD', new THREE.Float32BufferAttribute(att, 4)); g.setIndex(idx);
    const m = (this.routeMat ||= new THREE.ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, uniforms: { uTime: { value: 0 } },
      vertexShader: 'attribute vec4 aD; varying vec4 vD; void main(){ vD = aD; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime; varying vec4 vD;
        void main(){ float u = vD.x, v = vD.y; vec4 c = vec4(0.0);
          if (vD.z < 1.5) { float cell = u * 1.9; float k = fract(cell) - 0.5; float wave = 0.5 + 0.5 * sin(floor(cell) * 1.3 - uTime * 4.0); float r = 0.26 + wave * 0.12; float d = abs(k) * 1.15 + abs(v) * 0.5;
            float outer = step(d, r), inner = step(d, r - 0.09), hi = step(d, r - 0.17) * step(k, 0.0); vec3 col = mix(vec3(0.26, 0.12, 0.04), mix(vec3(1.0, 0.68, 0.18), vec3(1.0, 0.94, 0.62), hi), inner); c = vec4(col, outer * (0.75 + wave * 0.25)); }
          else { float cell = floor(u * 3.3); float side = mod(cell, 2.0) * 2.0 - 1.0; vec2 l = vec2((fract(u * 3.3) - 0.5) * 1.15, (v - side * 0.38) * 2.6); float foot = step(length(l * vec2(1.0, 1.25)), 0.36); c = vec4(0.24, 0.14, 0.07, foot * 0.72); }
          c.a *= vD.w; if (c.a < 0.02) discard; gl_FragColor = c; }` }));
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 4; mesh.frustumCulled = false; mesh.userData.noInk = true; mesh.userData.noAO = true; this.routeFX = mesh; this.world.add(mesh);
  }
  refresh(reach, run) {
    const path = run.path || []; const row = run.pos ? this.map.nodes[run.pos]?.row ?? -1 : -1; this.curRow = row;
    for (const [id, v] of this.nodeViews) { v.reachable = reach.has(id); v.visited = path.includes(id); v.mini.setState({ reachable: v.reachable, visited: v.visited }); v.fogged = v.nd.row > row + 2 && id !== 'guardian' ? true : id === 'guardian' && row < 10; }
    this.fog.setRow(row, false); if (this.fogPrevRow == null) this.fog.front.value = this.fog.frontFor(Math.max(-1, row - 1)); this.fogPrevRow = row;
  }
  pick(ndc) { this.ray.setFromCamera(ndc, this.camera); const h = this.ray.intersectObjects([...this.nodeViews.values()].map((v) => v.hit)); return h[0]?.object.userData.node; }
  /** pops a hidden chest open if the pointer is on one (cosmetic) */
  pokeChest(ndc) {
    this.ray.setFromCamera(ndc, this.camera); for (const c of this.dio.chests) { if (this.ray.intersectObject(c.obj, true).length) { c.target = c.target ? 0 : 1; if (c.target) { const p = c.obj.position; this.glow.burst(18, () => ({ pos: [p.x, p.y + 0.3, p.z], vel: [(Math.random() - 0.5) * 1.6, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 1.6], life: 0.9, size: 12, color: Math.random() < 0.6 ? '#ffd860' : '#fff4c0', sprite: 'spark', grav: 3 })); } return true; } }
    return false;
  }
  hover(nd) { this.hovered = nd || null; if (nd) this.nodeViews.get(nd.id)?.mini && (this.nodeViews.get(nd.id).mini.kick += 0.2); }
  /** Sir Isaac's figurine (MapScene's pawn: { root, update }) */
  isaacPiece() { return { root: this.hero.root, update: () => {} }; }
  trail() {}
  /** world-space point k (0..1) along the route a->b (rides bridge decks) */
  routePoint(a, b, k, out = new V3()) {
    const r = this.dio.route(a, b); if (!r) { const A = this.pos(a), B = this.pos(b); out.set(A.x + (B.x - A.x) * k, 0, A.z + (B.z - A.z) * k); out.y = this.heightAt(out.x, out.z); return out; }
    const f = clamp(k, 0, 1) * (r.pts.length - 1); const i = Math.min(r.pts.length - 2, Math.floor(f)), t = f - i; const P = r.pts; out.set(P[i].x + (P[i + 1].x - P[i].x) * t, r.y[i] + (r.y[i + 1] - r.y[i]) * t, P[i].z + (P[i + 1].z - P[i].z) * t); return out;
  }
  routeLength(a, b) { const r = this.dio.route(a, b); if (r) return r.len; const A = this.pos(a), B = this.pos(b); return Math.hypot(B.x - A.x, B.z - A.z); }
  dust(p, n = 6) { this.parts.burst(n, () => ({ pos: [p.x + (Math.random() - 0.5) * 0.2, p.y + 0.05, p.z + (Math.random() - 0.5) * 0.2], vel: [(Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2], life: 0.5 + Math.random() * 0.3, size: 9 + Math.random() * 6, size1: 16, color: Math.random() < 0.5 ? '#d8c4a0' : '#b89c74', alpha: 0.8, sprite: 'smoke', drag: 3 })); }

  // ------------------------------------------------ per frame
  update(dt, t, { fx = 0, fz = -4, yaw = 0, dist = 22, pitch = 0.9, ndc = null } = {}) {
    void ndc; const f = this.focus.set(fx, 0, fz); f.y = Math.max(0.6, this.heightAt(fx, fz)) * 0.7 + 0.3; const cam = this.camera;
    cam.position.set(f.x + Math.sin(yaw) * Math.cos(pitch) * dist, f.y + Math.sin(pitch) * dist, f.z + Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(f);
    this.key.position.set(f.x - 13, 17, f.z + 9); this.key.target.position.copy(f); this.rim.position.set(f.x + 8, 9, f.z - 16); this.rim.target.position.copy(f);
    this.fogPass.sync(); this.dio.update(dt, t); this.fog.update(dt, t); this.hero.update(dt, t); if (this.routeMat) this.routeMat.uniforms.uTime.value = t; T.tickWind();
    const near = (v) => Math.abs(v.mini.z - fz) < dist * 0.9;
    for (const [, v] of this.nodeViews) v.mini.update(dt, t, { hover: this.hovered === v.nd, near: near(v), fx: (p) => this.dust(p) });
    // chimney smoke, cauldron steam, waterfall spray, rune motes
    this.smokeT -= dt; if (this.smokeT <= 0) { this.smokeT = 0.35; for (const s of this.dio.smokes || []) this.parts.spawn({ pos: [s.x, s.y, s.z], vel: [0.12, 0.35, -0.05], life: 2.6, size: 7, size1: 22, color: '#e8e2dc', alpha: 0.65, sprite: 'smoke', drag: 0.3, wobble: 0.2 });
      for (const [, v] of this.nodeViews) { const m = v.mini; if (m.brewAt && !m.visited && near(v)) { const p = m.root.localToWorld(m.brewAt.clone()); this.parts.spawn({ pos: [p.x, p.y, p.z], vel: [0.05, 0.5, 0], life: 1.8, size: 7, size1: 18, color: '#b8f0c0', alpha: 0.7, sprite: 'smoke', drag: 0.4, wobble: 0.3 }); this.glow.spawn({ pos: [p.x, p.y - 0.05, p.z], vel: [(Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4], life: 0.5, size: 6, color: '#8aff9a', sprite: 'bubble', grav: 1 }); }
        if (m.motes && !m.visited && near(v)) this.glow.spawn({ pos: [m.x + (Math.random() - 0.5) * 1.1, m.root.position.y + 0.3 + Math.random() * 0.4, m.z + (Math.random() - 0.5) * 0.9], vel: [0, 0.25, 0], life: 1.6, size: 6, color: '#9ff0ff', sprite: 'firefly', wobble: 0.6 }); }
      for (const c of this.dio.chests || []) if (c.target < 0.5 && Math.random() < 0.35 && Math.abs(c.obj.position.z - fz) < dist) { const p = c.obj.position; this.glow.spawn({ pos: [p.x + (Math.random() - 0.5) * 0.5, p.y + 0.25 + Math.random() * 0.2, p.z + (Math.random() - 0.5) * 0.3], vel: [0, 0.3, 0], life: 0.7, size: 7, color: '#ffe48a', sprite: 'spark' }); }
      const ff = this.dio.fallFoot; if (ff) for (let k = 0; k < 3; k++) this.parts.spawn({ pos: [ff.x + (Math.random() - 0.5) * 1.0, ff.y + 0.05, ff.z - 0.1], vel: [(Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.7, 0.3], life: 0.7, size: 8, size1: 16, color: '#f2fbff', alpha: 0.85, sprite: 'smoke', drag: 1.5, grav: 0.6 });
    }
    this.parts.update(dt, t); this.glow.update(dt, t);
  }
}
// a brass candlestick standing on the table by the plinth (a warm practical)
function candleStick(x, z) {
  const g = new THREE.Group(); const brass = new THREE.MeshToonMaterial({ color: '#d8a040', gradientMap: T.gradientMap([0.45, 0.75, 1.0]) }); const wax = new THREE.MeshToonMaterial({ color: '#f2e6c8', gradientMap: T.gradientMap([0.55, 0.85, 1.0]) });
  const P = [[0.001, 0], [0.42, 0], [0.44, 0.04], [0.38, 0.08], [0.14, 0.12], [0.1, 0.3], [0.13, 0.36], [0.08, 0.42], [0.07, 0.75], [0.12, 0.8], [0.16, 0.86], [0.14, 0.88], [0.001, 0.88]].map(([r, y]) => new THREE.Vector2(r, y));
  const b = new THREE.Mesh(new THREE.LatheGeometry(P, 32), brass); b.castShadow = true; g.add(b); const c = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.085, 0], [0.085, 0.3], [0.07, 0.33], [0.001, 0.32]].map(([r, y]) => new THREE.Vector2(r, y)), 20), wax); c.position.y = 0.86; g.add(c);
  g.position.set(x, DIO.BASE - 1.18, z); return g;
}
