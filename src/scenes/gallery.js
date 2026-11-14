// The Star Gallery: a cozy two-storey library-museum under the observatory dome, reached from the garden (the room is
// models/library.js: bookcases, balcony, ladders, fire, desks, telescope; bookworm scholars from models/bookworm.js
// crawl and read about it). In the alcoves under the balcony stands the Achievement Museum: marble pedestals with
// engraved brass plates, each holding its exhibit (the First Eureka golden apple under glass, the Hydra Slayer's
// trophy, a Newton's cradle...); unearned ones wait under velvet drapes. Drag to turn and look around, click an
// exhibit to walk up to it. Archimage Croakley the wizard frog spends star shards (a glowing jar shows how many) to
// make "the stars align": new content only (artifacts, cards, events, story stages; save.js STAR_UNLOCKS).
import * as THREE from 'three';
import { UIScreen, Button3D, Panel } from '../ui3d/widgets.js';
import { uiPos } from '../ui3d/craft.js';
import { Note } from '../ui3d/kit.js';
import { save, ACHIEVEMENTS, STAR_UNLOCKS } from '../core/save.js';
import { makeApple, plaque } from '../models/orchard.js';
import { buildLibrary } from '../models/library.js';
import { createBookworm } from '../models/bookworm.js';
import { createFrog } from '../models/frog.js';
import { toonModel } from '../models/realworld.js';
import { turned, plainMat } from '../ui3d/craft.js';
import * as T from '../models/toon.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const toonC = (c, o = {}) => new THREE.MeshToonMaterial({ color: C(c), gradientMap: T.gradientMap([0.45, 0.75, 1.0]), ...o });
const glass = () => new THREE.MeshToonMaterial({ color: C('#bfe0ff'), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, gradientMap: T.gradientMap([0.6, 1.0]) });
function pix(w, h, draw, repeat = null) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, mulberry32(w * 7 + h)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }

// ---------------------------------------------------------------- exhibits
const model = (name, s, y = 0, tint = null) => { const g = new THREE.Group(); toonModel(name).then((o) => { o.scale.multiplyScalar(s); o.position.y = y; if (tint) o.traverse((m) => { if (m.isMesh && m.material?.color) { m.material = m.material.clone(); m.material.color.multiply(C(tint)); } }); g.add(o); }).catch(() => {}); return g; };
const EXHIBIT = {
  first_eureka() { const g = new THREE.Group(); const cush = new THREE.Mesh(turned([[0.001, 0], [0.3, 0.0], [0.34, 0.05], [0.3, 0.1], [0.001, 0.12]], 32), toonC('#7a1a3a')); g.add(cush); const a = makeApple({ s: 0.36 }); a.children[0].material.color.set('#e8b030'); a.position.y = 0.1; g.add(a); g.userData.glass = true; return g; },
  first_win() { const g = new THREE.Group(); const gold = toonC('#e0b040'); const leafG = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.04, 0.03, 0.1, 0); s.quadraticCurveTo(0.04, -0.03, 0, 0); return s; })(), 6);
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; for (const s of [-1, 1]) { const l = new THREE.Mesh(leafG, gold); l.material.side = THREE.DoubleSide; l.position.set(Math.cos(a) * 0.3, 0.25 + s * 0.012, Math.sin(a) * 0.3); l.rotation.set(Math.PI / 2 + s * 0.5, 0, -a + s * 0.6); g.add(l); } } g.rotation.x = -0.4; return g; },
  satyr() { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const L = 0.5 - i * 0.05; const p = new THREE.Mesh(turned([[0.028, 0], [0.03, 0.01], [0.03, L - 0.01], [0.02, L], [0.001, L]], 28), plainMat('oak')); p.position.set(-0.18 + i * 0.06, 0.05, 0); g.add(p); } const band = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.08), plainMat('leather')); band.position.set(0, 0.32, 0); g.add(band); g.rotation.z = 0.2; return g; },
  kobalos() { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const sp = new THREE.Group(); const bowl = new THREE.Mesh(turned([[0.001, 0.02], [0.05, 0.0], [0.07, 0.02], [0.065, 0.035], [0.001, 0.03]], 28), plainMat('brass')); bowl.scale.z = 1.4; sp.add(bowl); const h = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.3), plainMat('brass')); h.position.set(0, 0.03, -0.2); sp.add(h); sp.position.set((i % 3 - 1) * 0.08, 0.02 + i * 0.012, Math.floor(i / 3) * 0.06); sp.rotation.y = i * 1.1; g.add(sp); } return g; },
  medusa() { return model('ornate_mirror_01', 1.0, 0.0); },
  minotaur() { return model('bull_head', 1.3, 0.05); },
  hydra() { const g = new THREE.Group(); const shield = new THREE.Mesh(turned([[0.001, 0], [0.32, 0.0], [0.34, 0.03], [0.3, 0.06], [0.001, 0.07]], 40), plainMat('walnut')); shield.rotation.x = Math.PI / 2; shield.position.set(0, 0.45, -0.1); g.add(shield);
    import('../models/creatures.js').then(({ createCreature }) => { try { const h = createCreature('hydra_head'); h.root.scale.multiplyScalar(0.55); h.root.position.set(0, 0.2, 0); h.root.rotation.x = -0.2; g.add(h.root); g.userData.api = h; } catch (e) { g.add(model('lion_head', 1.1, 0.25)); } }).catch(() => g.add(model('lion_head', 1.1, 0.25))); return g; },
  combos5() { const g = new THREE.Group(); const flask = new THREE.Mesh(turned([[0.001, 0], [0.16, 0.02], [0.2, 0.12], [0.16, 0.24], [0.05, 0.3], [0.045, 0.45], [0.06, 0.47]], 32), glass()); g.add(flask); const liq = new THREE.Mesh(turned([[0.001, 0.01], [0.15, 0.03], [0.185, 0.12], [0.001, 0.13]], 32), toonC('#6ad8a0', { emissive: C('#1a6a40') })); g.add(liq);
    const stand = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 28), plainMat('brass')); stand.rotation.x = Math.PI / 2; stand.position.y = 0.06; g.add(stand); g.userData.glass = true; return g; },
  combos15() { const g = new THREE.Group(); const brass = plainMat('brass'); for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.26 - i * 0.02, 0.012, 6, 48), brass); r.rotation.set(i === 0 ? Math.PI / 2 : 0.4 * i, i * 0.9, 0); r.position.y = 0.42; g.add(r); g.userData['r' + i] = r; }
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), toonC('#3a6ab0')); globe.position.y = 0.42; g.add(globe); const st = new THREE.Mesh(turned([[0.001, 0], [0.12, 0.0], [0.1, 0.04], [0.02, 0.08], [0.015, 0.16], [0.001, 0.17]], 28), brass); g.add(st); g.userData.spin = true; return g; },
  hit100() { const g = new THREE.Group(); const wood = plainMat('walnut'); const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.3), wood); base.position.y = 0.025; g.add(base); for (const s of [-1, 1]) for (const z of [-0.12, 0.12]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.025), wood); p.position.set(s * 0.25, 0.25, z); g.add(p); }
    const balls = []; for (let i = 0; i < 5; i++) { const pv = new THREE.Group(); pv.position.set(-0.12 + i * 0.06, 0.44, 0); g.add(pv); const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), toonC('#c8d0dc', { emissive: C('#202830') })); b.position.y = -0.28; pv.add(b); for (const z of [-0.12, 0.12]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.3, 3), toonC('#eeeeee')); s.position.set(0, -0.14, z * 0.5); s.rotation.x = -z * 1.4; pv.add(s); } balls.push(pv); } g.userData.cradle = balls; g.userData.glass = true; return g; },
  items10() { return model('treasure_chest', 0.55, 0.0); },
  events6() { return model('antique_ceramic_vase_01', 1.5, 0.0); },
  loops5() { const g = new THREE.Group(); const gl = glass(); const top = new THREE.Mesh(turned([[0.02, 0.24], [0.12, 0.3], [0.14, 0.4], [0.1, 0.46], [0.001, 0.47]], 32), gl); const bot = new THREE.Mesh(turned([[0.001, 0.04], [0.1, 0.05], [0.14, 0.11], [0.12, 0.2], [0.02, 0.24]], 32), gl); g.add(top, bot);
    const sand = new THREE.Mesh(turned([[0.001, 0.05], [0.11, 0.06], [0.001, 0.15]], 28), toonC('#e8c880')); g.add(sand); const wood = plainMat('walnut'); for (const y of [0.02, 0.48]) { const d = new THREE.Mesh(turned([[0.001, -0.02], [0.17, -0.02], [0.17, 0.02], [0.001, 0.02]], 32), wood); d.position.y = y; g.add(d); } for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const p = new THREE.Mesh(turned([[0.012, 0], [0.018, 0.2], [0.012, 0.46]], 12), wood); p.position.set(Math.cos(a) * 0.15, 0.02, Math.sin(a) * 0.15); g.add(p); } return g; },
  wins3() { return model('horse_statue_01', 1.3, 0.0, '#e0b060'); },
  bestiary() { return model('marble_bust_01', 1.6, 0.0); },
};
// a velvet drape over an unearned exhibit: folds falling from a hidden form, gold fringe
let VELVET = null;
function drape() { // a square of velvet thrown over a hidden form: a rounded crown, folds falling to the plinth, corners hanging over its edge, gold braid at the hem
  VELVET ||= pix(32, 32, (g, w, h, r) => { const ramp = ['#3a0c1c', '#4e1226', '#621a30', '#7a2238']; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dam = ((x + 4) % 16 < 9 && (y + 2) % 16 < 9 && Math.abs(((x + 4) % 16) - 4) + Math.abs(((y + 2) % 16) - 4) === 3) ? 1 : 0; g.fillStyle = ramp[1 + dam + (r() < 0.06 ? 1 : 0) - ((x + y * 2) % 13 === 0 ? 1 : 0)]; g.fillRect(x, y, 1, 1); } }, [3, 3]);
  const S = 1.36, N = 40; const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position; const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const place = (x, z, out) => { const d = Math.hypot(x, z), a = Math.atan2(z, x); const peak = 0.6 + 0.05 * Math.sin(a * 2 + 0.6); const fold = Math.sin(a * 9 + d * 5) * 0.035 * sm(0.14, 0.5, d);
    let rr, y; if (d < 0.42) { rr = d; y = d < 0.16 ? peak - (d / 0.16) ** 2 * 0.1 : peak - 0.1 - (peak - 0.13) * sm(0.16, 0.42, d) ** 0.8; } else { const hang = d - 0.42; rr = 0.43 + hang * 0.12; y = 0.03 - hang * 0.92; }
    rr += fold; out.set(Math.cos(a) * rr, Math.max(-0.5, y) + fold * 0.4, Math.sin(a) * rr); return out; };
  const tmp = V(); for (let i = 0; i < p.count; i++) { place(p.getX(i), p.getZ(i), tmp); p.setXYZ(i, tmp.x, tmp.y, tmp.z); }
  geo.computeVertexNormals(); const g = new THREE.Group(); const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: VELVET, side: THREE.DoubleSide, gradientMap: T.gradientMap([0.4, 0.72, 1.0]) })); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const hem = []; const h = S / 2; for (let i = 0; i < 64; i++) { const u = (i / 64) * 4; const s = Math.floor(u), f = u - s; const [x, z] = [[-h + f * S, -h], [h, -h + f * S], [h - f * S, h], [-h, h - f * S]][s]; hem.push(place(x * 0.995, z * 0.995, V())); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hem, true), 160, 0.012, 6, true), plainMat('gold'))); return g;
}
let MARBLE = null;
function pedestal() { MARBLE ||= pix(32, 32, (g, w, h, r) => { const ramp = ['#9a9290', '#b4aca6', '#c8c0b8', '#dcd6ce']; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = ramp[2 + (r() < 0.15 ? 1 : 0) - (r() < 0.06 ? 1 : 0)]; g.fillRect(x, y, 1, 1); } g.fillStyle = '#9a9088'; let x = 4, y = 0; for (let i = 0; i < 40; i++) { g.fillRect(x, y, 1, 1); x += r() < 0.5 ? 1 : 0; y += 1; if (y >= h) { y = 0; x = (r() * w) | 0; } } }, [1, 2]);
  const m = new THREE.MeshToonMaterial({ map: MARBLE, gradientMap: T.gradientMap([0.45, 0.75, 1.0]) });
  const g = new THREE.Group(); const col = new THREE.Mesh(turned([[0.001, 0], [0.42, 0], [0.42, 0.08], [0.36, 0.12], [0.3, 0.18], [0.27, 0.3], [0.25, 0.86], [0.29, 0.92], [0.36, 0.98], [0.4, 1.02], [0.4, 1.08], [0.001, 1.08]], 36), m); col.castShadow = true; col.receiveShadow = true; g.add(col); return g; }

// a museum bell jar: blown glass on a brass collar with a turned finial
function bellJar() { const g = new THREE.Group(); g.add(new THREE.Mesh(turned([[0.36, 0], [0.36, 0.62], [0.3, 0.74], [0.16, 0.8], [0.04, 0.82], [0.001, 0.82]], 40), glass()));
  const rim = new THREE.Mesh(turned([[0.35, -0.01], [0.4, -0.01], [0.41, 0.02], [0.39, 0.05], [0.35, 0.05]], 40), plainMat('brass')); g.add(rim);
  const fin = new THREE.Mesh(turned([[0.001, 0.8], [0.04, 0.81], [0.05, 0.84], [0.02, 0.87], [0.03, 0.9], [0.001, 0.93]], 16), plainMat('brass')); g.add(fin); return g; }

export class GalleryScene extends UIScreen {
  async enter() {
    const fresh = save.evaluate(); const M = save.meta;
    const sc = (this.scene = new THREE.Scene()); sc.background = C('#1c140e'); sc.fog = new THREE.Fog(0x3a2818, 16, 40);
    // the room: a two-storey library-museum under the star dome (models/library.js), lit warm by fire, lamps and lanterns
    const lib = (this.lib = buildLibrary({ seed: 7 })); sc.add(lib.group); this.dome = lib.dome;
    // the museum: exhibits on marble plinths in the alcoves under the balcony, glass bells over the precious ones
    this.exhibits = []; const spots = lib.exhibitSpots;
    ACHIEVEMENTS.forEach((a, i) => {
      const p = spots[i % spots.length]; const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(-p.x, -p.z); sc.add(g);
      g.add(pedestal()); const got = !!M.achievements[a.id]; const top = new THREE.Group(); top.position.y = 1.08; g.add(top);
      if (got) { const ex = EXHIBIT[a.id]?.() || makeApple({ s: 0.3 }); top.add(ex); if (ex.userData.glass) top.add(bellJar()); top.userData.ex = ex; }
      else top.add(drape());
      const pl = plaque(got ? a.name : '???', { font: 'title', style: 'engrave', kind: 'brass', depth: 0.2 }); const [pw] = pl.userData.size; pl.scale.multiplyScalar(0.62 / pw); pl.position.set(0, 0.72, 0.29); pl.rotation.x = -0.2; g.add(pl);
      this.exhibits.push({ a, g, got, top, fresh: fresh.includes(a.id), hit: g });
    });
    // the frog wizard on his reading podium by the fire, and the jar of star shards on a little turned stand
    const frog = (this.frog = createFrog()); frog.root.position.set(1.6, 0.18, -5.4); sc.add(frog.root);
    const pod = new THREE.Mesh(turned([[0.001, 0], [0.82, 0], [0.86, 0.04], [0.84, 0.1], [0.8, 0.13], [0.82, 0.18], [0.001, 0.18]], 48), plainMat('walnut')); pod.position.copy(frog.root.position).setY(0); pod.receiveShadow = true; pod.castShadow = true; sc.add(pod);
    const inlay = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48).rotateX(-Math.PI / 2), plainMat('brass')); inlay.position.copy(pod.position).setY(0.182); sc.add(inlay);
    const stand = new THREE.Mesh(turned([[0.001, 0], [0.24, 0], [0.26, 0.04], [0.16, 0.08], [0.08, 0.14], [0.07, 0.42], [0.12, 0.46], [0.26, 0.5], [0.27, 0.54], [0.001, 0.54]], 32), plainMat('walnut')); stand.position.set(2.75, 0, -4.85); stand.castShadow = true; sc.add(stand);
    const jar = (this.jar = new THREE.Group()); jar.position.set(2.75, 0.54, -4.85); sc.add(jar); jar.add(new THREE.Mesh(turned([[0.001, 0], [0.18, 0.0], [0.22, 0.12], [0.22, 0.42], [0.14, 0.5], [0.12, 0.56], [0.001, 0.56]], 32), glass()));
    const lid = new THREE.Mesh(turned([[0.001, 0.56], [0.14, 0.56], [0.14, 0.62], [0.001, 0.64]], 32), plainMat('brass')); jar.add(lid);
    this.shardMeshes = []; const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.1, 1.8), toneMapped: false }); for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), sm); s.position.set((Math.random() - 0.5) * 0.24, 0.05 + (i % 6) * 0.06 + Math.random() * 0.03, (Math.random() - 0.5) * 0.24); s.scale.y = 1.6; s.userData.noAO = true; jar.add(s); this.shardMeshes.push(s); }
    const jl = new THREE.PointLight(0x9cc8ff, 1.5, 3, 2); jl.position.y = 0.3; jar.add(jl);
    this.jarPlate = null; this.updateJar();
    // the way out: a carved oak plaque on a brass easel near the hearth (the great door itself stands behind you)
    const easel = new THREE.Group(); easel.position.set(-1.75, 0, -3.7); easel.rotation.y = 0.42; sc.add(easel);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(turned([[0.001, 0], [0.025, 0], [0.02, 0.05], [0.016, 1.2], [0.022, 1.24], [0.001, 1.26]], 12), plainMat('brass')); leg.position.set(s * 0.55, 0, 0); leg.rotation.z = -s * 0.08; easel.add(leg); }
    { const back = new THREE.Mesh(turned([[0.001, 0], [0.022, 0], [0.016, 1.15], [0.001, 1.16]], 12), plainMat('brass')); back.position.set(0, 0, -0.32); back.rotation.x = -0.28; easel.add(back); const bar = new THREE.Mesh(turned([[0.001, -0.6], [0.02, -0.6], [0.02, 0.6], [0.001, 0.6]], 12), plainMat('brass')); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.62, 0.02); easel.add(bar); }
    this.door = plaque('Return to the Garden', { font: 'title', style: 'carve', kind: 'oak', depth: 0.3 }); { const [dw] = this.door.userData.size; this.door.scale.multiplyScalar(1.35 / dw); } this.door.position.set(0, 0.95, 0.05); this.door.rotation.x = -0.12; easel.add(this.door);
    // the bookworms: little earthworm scholars in robes, at their desks, on the shelves, the ladder, the balcony rail
    this.worms = []; const S = lib.spots; const W = (o) => { const w = createBookworm(o); w.root.scale.setScalar(1.25); sc.add(w.root); this.worms.push(w); return w; };
    const kNear = (a) => S.shelfFrames.reduce((b, f, i) => (Math.abs(f.a - a) < Math.abs(S.shelfFrames[b].a - a) ? i : b), 0);
    let w = W({ seed: 1, robe: '#2a3a7a', spectacles: true, book: '#6a2a24' }); w.root.position.copy(S.desks[0].top); w.root.rotation.y = S.desks[0].ry + 2.4;
    w = W({ seed: 2, robe: '#1e1e2a', cap: 'mortar', book: '#2a4a2a' }); w.root.position.copy(S.desks[1].top); w.root.rotation.y = S.desks[1].ry + 2.8;
    w = W({ seed: 6, robe: '#4a2a5a', cap: 'night' }); w.setMode('sleep'); w.root.position.copy(S.desks[1].stack); w.root.rotation.y = S.desks[1].ry;
    w = W({ seed: 3, robe: '#5a2a3a', cap: 'mortar' }); w.setRoute({ a: S.shelfAt(kNear(3.75), 3, 0.06), b: S.shelfAt(kNear(3.75), 3, 0.94), up: V(0, 1, 0) });
    w = W({ seed: 4, robe: '#2e5a34', scarf: '#d8a838', book: '#7a4a1a' }); w.setRoute({ a: V(-1.2, 0.012, -1.4), b: V(1.0, 0.012, -2.9), up: V(0, 1, 0) }); w.setMode('carry');
    { const L = lib.spots.ladders[1]; const f = L.top.clone().sub(L.base); const len = f.length(); f.normalize(); const inw = L.base.clone().setY(0).normalize().negate(); const up = inw.sub(f.clone().multiplyScalar(inw.dot(f))).normalize();
      w = W({ seed: 5, robe: '#7a3a1a', spectacles: true }); w.setRoute({ a: L.base.clone().addScaledVector(f, 0.35).addScaledVector(up, 0.03), b: L.base.clone().addScaledVector(f, len - 0.4).addScaledVector(up, 0.03), up }); w.st.speed = 0.06; }
    w = W({ seed: 7, robe: '#8a2a2a', scarf: '#ece2c8' }); w.setRoute({ a: S.rail(2.62), b: S.rail(2.76), up: V(0, 1, 0) });
    w = W({ seed: 8, robe: '#2a4a5a', spectacles: true, scarf: '#a83a2a', book: '#3a2a6a' }); w.root.position.copy(S.chairArm); w.root.rotation.y = 0.55 + Math.PI;
    // camera: you stand in the room and turn (drag), or walk up to an exhibit (click)
    this.camera = new THREE.PerspectiveCamera(50, this.engine.aspect, 0.1, 200); this.yaw = 0; this.yawT = 0; this.focus = null; this.pos = V(0, 1.75, 1.4); this.look = V(0, 1.3, -4);
    this.engine.setWorld(sc, this.camera);
    this.engine.setFx({ bloom: [0.7, 0.5, 0.8], tilt: false, exposure: 1.3, grade: { sat: 1.08, contrast: 1.05, vignette: 0.3, warmth: 0.05, lift: [0.035, 0.026, 0.018], gain: [1.06, 1.0, 0.92] }, ink: { fade: [24, 70] } });
    this.engine.add(this); this.pushInput(); audio.playMusic('journal'); audio.setAmbSet(['night']);
    this.note = new Note({ w: 9, h: 1.6, size: 44, tail: false }); this.root.add(this.note.group);
    if (fresh.length) setTimeout(() => this.say(`New exhibit${fresh.length > 1 ? 's' : ''}: ${fresh.map((id) => ACHIEVEMENTS.find((a) => a.id === id).name).join(', ')}.`), 900);
    else setTimeout(() => this.say('Drag to look around. Click an exhibit, a bookworm, or Archimage Croakley the frog.'), 900);
  }
  updateJar() { const n = save.meta.shards; this.shardMeshes.forEach((s, i) => { s.visible = i < Math.min(24, n); }); if (this.jarPlate) this.scene.remove(this.jarPlate); const p = plaque(`${n} Star Shard${n === 1 ? '' : 's'}`, { font: 'title', style: 'engrave', kind: 'brass', depth: 0.2 }); const [w] = p.userData.size; p.scale.multiplyScalar(0.9 / w); p.position.copy(this.jar.position).add(V(0, 0.1, 0.32)); p.rotation.x = -0.25; this.scene.add(p); this.jarPlate = p; }
  say(t, sec = 3800) { this.note.show([[[t, '#2a160c']]], 0, -this.H + 2.4, 8); clearTimeout(this._nt); this._nt = setTimeout(() => this.note.hide(), sec); }
  // ---------------------------------------------------------------- the frog's offer: plaques for each unlock
  openAlign() {
    if (this.panelOpen) return; this.panelOpen = true; this.frog.act('nod'); audio.play('paper_rustle');
    const W = this.W, H = this.H; this.panel = new Panel('The Stars Align', [`Archimage Croakley can align the stars to bring new wonders into the Wilds. You hold ${save.meta.shards} star shards.`], { w: 13, h: 4.4, titleColor: '#2a2a6a' });
    uiPos(this.panel.group, W - 8.4, H - 3.4, 2); this.root.add(this.panel.group); this.alignBtns = [];
    STAR_UNLOCKS.forEach((u, i) => { const have = !!save.meta.unlocks[u.id]; const ok = !have && save.meta.shards >= u.cost; const b = new Button3D(have ? `${u.name}: aligned` : `${u.name} (${u.cost})`, () => this.align(u), { w: 12.6, h: 1.2, size: 52, sub: u.text, color: have ? 'teal' : ok ? 'purple' : 'wood', disabled: !ok }); this.alignBtns.push(this.addButton(b, W - 8.4, H - 7.6 - i * 1.42, 2)); });
    this.alignBtns.push(this.addButton(new Button3D('Close', () => this.closeAlign(), { w: 4, h: 1.1, size: 50 }), W - 4.4, -H + 1.2, 2));
  }
  closeAlign() { if (!this.panelOpen) return; this.panelOpen = false; this.root.remove(this.panel.group); for (const b of this.alignBtns) { this.root.remove(b.group); this.buttons.splice(this.buttons.indexOf(b), 1); } this.alignBtns = []; }
  align(u) { if (!save.unlock(u.id)) return; this.frog.act('cast'); audio.play('magic_shimmer'); audio.play('chime_soft', { delay: 0.4 }); this.alignT = performance.now(); this.updateJar(); this.closeAlign(); this.say(`The stars align: ${u.name}. ${u.text}`, 4600); }
  // ---------------------------------------------------------------- input
  pick() { const rc = new THREE.Raycaster(); rc.setFromCamera(this.input.ndc, this.camera); const objs = [this.frog.root, this.door, this.jar, ...this.worms.map((w) => w.hit), ...this.exhibits.map((e) => e.g)]; const h = rc.intersectObjects(objs, true)[0]; if (!h) return null; let o = h.object; const wm = this.worms.find((w) => w.hit === o); if (wm) return wm; while (o) { if (o === this.frog.root) return 'frog'; if (o === this.door) return 'door'; if (o === this.jar) return 'jar'; const ex = this.exhibits.find((e) => e.g === o); if (ex) return ex; o = o.parent; } return null; }
  onMove() { if (this.dragging) return; const h = this.pick(); if (h !== this.hover) { this.hover = h; if (h) audio.play('ui_hover', { vol: 0.35 }); this.engine.renderer.domElement.style.cursor = h ? 'pointer' : ''; } }
  onDragStart() { if (this.panelOpen) return false; this.dragging = { x: this.input.ndc.x, yaw: this.yawT }; this.focus = null; return true; }
  onDrag() { if (!this.dragging) return; this.yawT = this.dragging.yaw - (this.input.ndc.x - this.dragging.x) * 2.4; }
  onDragEnd() { this.dragging = null; }
  onWheel(e) { this.yawT += Math.sign(e?.dy || e?.deltaY || 0) * 0.3; }
  onClick() {
    if (this.panelOpen) return; const h = this.pick(); if (!h) { this.focus = null; return true; }
    if (h === 'frog') { this.frog.act('ribbit'); audio.play('pop', { vol: 0.5 }); this.openAlign(); return true; }
    if (h === 'jar') { this.say(`${save.meta.shards} star shards. Earn more with every loop, every guardian toppled, every new exhibit.`); return true; }
    if (h === 'door') { audio.play('card_place'); this.game.toMenu({ from: 'gallery' }); return true; }
    if (h.hit && h.react) { this.say(h.react(), 2600); audio.play('pop', { vol: 0.35 }); audio.play('paper_rustle', { vol: 0.5 }); return true; }
    this.focus = h; audio.play('wood_knock', { vol: 0.4 }); const a = h.a; this.say(h.got ? `${a.name}: ${a.text} (earned in loop ${save.meta.achievements[a.id]})` : `Under the velvet: ${a.text}`); return true;
  }
  update(dt, t) {
    this.yaw += (this.yawT - this.yaw) * Math.min(1, dt * 5);
    if (this.focus) { const p = this.focus.g.position; const dir = V(p.x, 0, p.z).normalize(); this.pos.lerp(V(p.x - dir.x * 2.1, 1.75, p.z - dir.z * 2.1), Math.min(1, dt * 2.5)); this.look.lerp(V(p.x, 1.45, p.z), Math.min(1, dt * 3)); this.yawT = this.yaw = Math.atan2(p.x, -p.z); }
    else { const d = V(Math.sin(this.yaw), 0, -Math.cos(this.yaw)); this.pos.lerp(V(0, 1.75, 0).addScaledVector(d, -1.6), Math.min(1, dt * 2.5)); this.look.lerp(V(0, 1.35, 0).addScaledVector(d, 6), Math.min(1, dt * 4)); }
    this.camera.position.copy(this.pos); this.camera.lookAt(this.look);
    this.frog.lookAt(this.camera.position); this.frog.update(dt, t); this.lib.update(dt, t); for (const w of this.worms) w.update(dt, t);
    for (const e of this.exhibits) { const ex = e.top.userData.ex; if (!ex) continue; e.top.rotation.y = Math.sin(t * 0.4 + e.g.position.x) * 0.25; if (ex.userData.spin) for (let i = 0; i < 3; i++) ex.userData['r' + i].rotation.z += dt * (0.4 + i * 0.3); if (ex.userData.cradle) { const b = ex.userData.cradle; const s = Math.sin(t * 3.2); b[0].rotation.z = Math.min(0, s) * 0.5; b[4].rotation.z = Math.max(0, s) * 0.5; } ex.userData.api?.update?.(dt); }
    this.shardMeshes.forEach((s, i) => { s.rotation.y += dt * (1 + i * 0.05); s.position.y += Math.sin(t * 2 + i) * 0.0006; });
    const al = this.alignT ? (performance.now() - this.alignT) / 1000 : 9; this.dome.material.color.setScalar(1 + Math.max(0, Math.sin(Math.min(1, al / 2.4) * Math.PI)) * 0.8); this.dome.rotation.y += dt * 0.01;
    this.panel?.update(dt, this.ptr(2)); this.note.update(dt); this.updateUI(dt);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; super.dispose(); }
}
