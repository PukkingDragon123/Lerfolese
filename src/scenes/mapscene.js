// The miniature Mythical Wilderness: a hand-built diorama on a display plinth. Grab to rotate, wheel to zoom,
// tiny animated sheep, birds, dancing satyrs, a labyrinth, a marsh, and your little marionette hopping along.
import * as THREE from 'three';
import * as S from '../models/sculpt.js';
import { UIScreen, Button3D } from '../ui3d/widgets.js';
import { textPlane, Pouch, UIF } from '../ui3d/kit.js';
import { PROPS } from '../models/world.js';
import { createProfessor } from '../models/professor.js';
import { createCreature } from '../models/creatures.js';
import { reachable } from '../game/run.js';
import { ItemToken } from './reward.js';
import { Particles } from '../gfx/particles.js';
import { Critters } from '../gfx/critters.js';
import { standee, Animated, faceCamera } from '../ui3d/standee.js';
import { makeNoise } from '../gfx/pixel.js';
import { TEX } from '../gfx/textures.js';
import { R } from '../gfx/palette.js';
import { tweens, Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';
import { mulberry32, vrange, vpick, clamp } from '../core/util.js';

const F = (o) => new THREE.MeshStandardMaterial({ flatShading: false, roughness: 0.85, ...o });
const mk = (g, m, p, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
const NODE_INFO = {
  battle: ['Skirmish', 'Local wildlife with opinions.'], elite: ['ELITE', 'Something big. Drops a rare curio.'], event: ['Curiosity', 'An encounter. Bring your science.'],
  shop: ["Diogenes' Barrel", 'Cards, removals, upgrades. No curios.'], lab: ['Field Laboratory', 'Rest, upgrade, merge or mutate cards.'], guardian: ['GUARDIAN OF THE WILDS', 'The gate to the Trojan War.'],
};

export class MapScene extends UIScreen {
  async enter(first) {
    const run = this.game.run; this.run = run; this.map = run.map;
    this.buildWorld(); this.engine.setWorld(this.scene, this.camera);
    this.engine.setFx({ bloom: [0.55, 0.6, 0.8], tilt: { focus: 0.5, width: 0.12, feather: 0.28, amount: 3.2, top: 1.2, bottom: 1.0 }, grade: { sat: 1.12, warmth: 0.35, vignette: 0.5 } });
    this.engine.add(this); this.pushInput(); audio.playMusic('map'); audio.setAmbSet(['wilderness', 'wind']);
    this.buildHUD();
    const cur = run.pos ? this.map.nodes[run.pos] : null;
    this.focus = new THREE.Vector3(cur ? cur.x : 0, 0, cur ? cur.z - 3 : -2); this.yaw = new Spring(0.0, 6, 0.8); this.pitch = new Spring(0.78, 6, 0.8); this.dist = new Spring(17, 6, 0.8); this.fx = new Spring(this.focus.x, 4, 0.9); this.fz = new Spring(this.focus.z, 4, 0.9);
    if (first) { this.dist.value = 40; this.pitch.value = 1.3; this.fz.value = -14; this.game.journal.seenIntro || this.story(); }
    this.refreshNodes();
  }
  story() {
    const lines = ['In 1687 a man published the laws of motion.', 'In 1688 the gods read them. They did not care for them.', 'Humanity had found the source code of the universe,', 'so the gods turned it off and on again. Forever.', 'One mind remembers every loop: Sir Isaac Plumb,', 'natural philosopher, deceased, still taking notes.', 'His body is gone. His marionette is not.'];
    this.storyPlane = textPlane(lines.map((l) => [[l, '#f3e6c4']]), { w: 26, h: 9, font: 'VT323', size: 64, stroke: ['#1a1220', 10], lineH: 1.15, bg: (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(10,6,20,0.85)'); gr.addColorStop(1, 'rgba(10,6,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }); this.storyPlane.position.set(0, 1, 12); this.root.add(this.storyPlane);
    this.storyPlane.material.opacity = 0; tweens.to(this.storyPlane.material, { opacity: 1 }, 1.2).then(() => tweens.wait(6)).then(() => tweens.to(this.storyPlane.material, { opacity: 0 }, 1.0)).then(() => { this.root.remove(this.storyPlane); });
    this.game.journal.seenIntro = true; this.game.saveJournal();
  }

  // ------------------------------------------------------------ diorama
  buildWorld() {
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x120d1c); sc.fog = new THREE.Fog(0x120d1c, 40, 90);
    const sun = new THREE.DirectionalLight(0xffd6a8, 3.0); sun.position.set(-12, 18, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 22, bottom: -22, near: 1, far: 60 }); sun.target.position.set(0, 0, -14); sc.add(sun, sun.target);
    sc.add(new THREE.HemisphereLight(0x9ab8ff, 0x4a3020, 1.0)); const rim = new THREE.DirectionalLight(0xb48cff, 1.2); rim.position.set(10, 6, -30); sc.add(rim);
    this.camera = new THREE.PerspectiveCamera(36, this.engine.aspect, 0.1, 300);
    const world = (this.world = new THREE.Group()); sc.add(world);
    // starfield backdrop
    const sg = new THREE.BufferGeometry(); const sp = []; for (let i = 0; i < 1500; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(120); sp.push(v.x, Math.abs(v.y) * 0.8 - 10, v.z); } sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe8d8ff, size: 0.35, sizeAttenuation: true })));
    // plinth
    const LEN = 36, WID = 21, Z0 = 3; this.bounds = { LEN, WID, Z0 };
    mk(S.slab(WID + 1.4, 1.8, LEN + 1.4, { seed: 3, jitter: 0.005 }), F({ map: TEX.wood('plinth', R.wood, { seed: 5, rings: 12 }), roughness: 0.5 }), world, 0, -1.2, Z0 - LEN / 2);
    mk(S.slab(WID + 1.7, 0.25, LEN + 1.7, { seed: 4, jitter: 0.004 }), F({ color: 0xd9a64a, metalness: 0.85, roughness: 0.3 }), world, 0, -0.35, Z0 - LEN / 2);
    const plate = textPlane([[['THE MYTHICAL WILDERNESS', '#3a2410']], [['Act I of the Greek Loop · scale 1:10,000', '#5a3622']]], { w: 10, h: 1.4, font: 'Pixelify', size: 60, weight: 700, basic: false, bg: (g, w, h) => { g.fillStyle = '#d9a64a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7a4a14'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); } });
    plate.position.set(0, -1.2, Z0 + 0.92); world.add(plate);
    // terrain
    const n = makeNoise(this.run.seed % 997 + 3); const nodes = Object.values(this.map.nodes);
    const geo = new THREE.PlaneGeometry(WID, LEN, 64, 110); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, Z0 - LEN / 2);
    const p = geo.attributes.position; const riverX = (z) => Math.sin(z * 0.18) * 4.5 + 1.5;
    const pathD = (x, z) => { let d = 1e9; for (const a of nodes) for (const bid of a.next) { const b = this.map.nodes[bid]; const dx = b.x - a.x, dz = b.z - a.z; const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1); d = Math.min(d, Math.hypot(x - a.x - dx * t, z - a.z - dz * t)); } return d; };
    this.pathD = pathD; this.riverX = riverX;
    const cols = []; const C = (h) => new THREE.Color(h);
    const grass = [C(0x45652a), C(0x5a7a30), C(0x6a8a36)], dirt = C(0x8a6a44), rock = C(0x8f8a90), sand = C(0xc8a87a), marsh = C(0x35563a);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const edge = Math.min(WID / 2 - Math.abs(x), Math.abs(z - Z0), Math.abs(z - (Z0 - LEN)));
      let h = n.fbm(x * 0.12 + 5, z * 0.12, 4) * 2.2 - 0.6; h += Math.max(0, n.fbm(x * 0.07 + 30, z * 0.07, 3) - 0.55) * 7;
      const pd = pathD(x, z); h = THREE.MathUtils.lerp(h * 0.25, h, clamp((pd - 0.5) / 2.2, 0, 1));
      const rd = Math.abs(x - riverX(z)); if (rd < 1.4 && z > -26) h = Math.min(h, -0.35 + rd * 0.2);
      if (edge < 0.6) h = Math.min(h, edge * 0.5);
      h = Math.max(-0.4, h); p.setY(i, h);
      const c = z < -27 ? marsh.clone() : h > 2.4 ? rock.clone() : rd < 1.8 && z > -26 ? sand.clone() : grass[i % 3].clone();
      if (pd < 0.55) c.lerp(dirt, 0.85);
      c.offsetHSL(0, 0, (n(x * 2, z * 2) - 0.5) * 0.06); cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const terrain = mk(S.facet(geo), F({ vertexColors: true, roughness: 0.95 }), world); terrain.castShadow = false;
    this.heightAt = (x, z) => { const r = new THREE.Raycaster(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0)); const h = r.intersectObject(terrain)[0]; return h ? h.point.y : 0; };
    // river water
    const wg = new THREE.PlaneGeometry(3.4, 30, 4, 60); wg.rotateX(-Math.PI / 2); const wp = wg.attributes.position; for (let i = 0; i < wp.count; i++) { const z = wp.getZ(i) - 13; wp.setX(i, wp.getX(i) + riverX(z)); wp.setZ(i, z); }
    this.water = mk(wg, F({ color: 0x2f7ab0, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 }), world, 0, -0.22, 0); this.water.castShadow = false;
    // decor
    const rnd = mulberry32(this.run.seed % 1000 + 7); const free = (x, z, r = 1.2) => pathD(x, z) > r && Math.abs(x - riverX(z)) > 1.8 && Math.abs(x) < WID / 2 - 0.8 && z < Z0 - 0.8 && z > Z0 - LEN + 0.8;
    const place = (o, x, z, s = 1) => { o.position.set(x, this.heightAt(x, z), z); o.scale.multiplyScalar(s); o.rotation.y = rnd() * 6; world.add(o); return o; };
    for (let i = 0; i < 70; i++) { const x = vrangeR(rnd, -WID / 2, WID / 2), z = vrangeR(rnd, Z0 - LEN, Z0); if (!free(x, z)) continue; place(rnd() < 0.6 ? PROPS.oliveTree(i, 0.32) : PROPS.cypress(i, 0.32), x, z).userData.perchable = true; }
    for (let i = 0; i < 30; i++) { const x = vrangeR(rnd, -WID / 2, WID / 2), z = vrangeR(rnd, Z0 - LEN, Z0); if (!free(x, z, 0.8)) continue; place(PROPS.rock(i, 0.25 + rnd() * 0.3, rnd() < 0.5 ? 'moss' : 'stone'), x, z); }
    for (let i = 0; i < 4; i++) { const x = vrangeR(rnd, -8, 8), z = -6 - i * 6; if (!free(x, z, 1.5)) continue; const ruin = new THREE.Group(); for (let k = 0; k < 4; k++) { const c = PROPS.column(k + i, 1.6 + rnd(), rnd() < 0.5); c.scale.setScalar(0.3); c.position.set((k % 2) * 0.8, 0, Math.floor(k / 2) * 0.8); ruin.add(c); } place(ruin, x, z); }
    // labyrinth near elite nodes, marsh reeds near the guardian, huts near shops/labs
    for (const nd of nodes) {
      const off = new THREE.Vector3(nd.x > 0 ? -1.8 : 1.8, 0, 0.4);
      if (nd.type === 'elite' && rnd() < 0.7) { const lab = new THREE.Group(); for (let k = 0; k < 5; k++) { const w = PROPS.mazeWall(1.2 + rnd(), 0.6, k); w.scale.setScalar(0.35); w.position.set((k % 3) * 0.5 - 0.5, 0, Math.floor(k / 3) * 0.5); w.rotation.y = (k % 2) * Math.PI / 2; lab.add(w); } if (free(nd.x + off.x, nd.z + off.z, 0.6)) place(lab, nd.x + off.x, nd.z + off.z); }
      
    }
    const reeds = PROPS.reeds(60, 18, 3, 9); reeds.scale.setScalar(0.5); reeds.position.set(0, 0, -30); world.add(reeds);
    // living things: sheep, birds, a satyr party
    this.sheep = []; this.birds = [];
    this.critters = new Critters(90); this.critters.bounds = { x: [-9, 9], y: [2.5, 7], z: [-30, 2] }; sc.add(this.critters.mesh);
    this.party = []; { const x = -6.5, z = -9; if (true) { const fire = new THREE.Group(); const f = PROPS.amphora(3, 0.3); fire.add(f); place(fire, x, z); for (let k = 0; k < 3; k++) { const s = createCreature('satyr'); s.root.scale.setScalar(0.28); world.add(s.root); this.party.push({ api: s, a: (k / 3) * 6.28, cx: x, cz: z }); } } }
    this.parts = new Particles(800, { additive: true }); sc.add(this.parts.points);
    world.updateMatrixWorld(true); world.traverse((o) => { if (o.userData.perchable) this.critters.perchesFrom(o, 2); });
    this.critters.spawnBirds(16); if (this.critters.spawnGrazers) this.critters.spawnGrazers(10, { x: [-8, 8], z: [-24, 0] }); this.critters.spawnButterflies(8, new THREE.Vector3(0, 0.6, -12), 16);
    // nodes
    this.nodeViews = new Map(); for (const nd of nodes) this.addNode(nd);
    // paths: dotted stones
    this.pathGroup = new THREE.Group(); world.add(this.pathGroup); this.buildPaths();
    // player marionette
    this.pawn = createProfessor(); this.pawn.root.scale.setScalar(0.22); world.add(this.pawn.root);
    const cur = this.run.pos ? this.map.nodes[this.run.pos] : null; const sp0 = cur || { x: 0, z: Z0 - 0.5 };
    this.pawn.root.position.set(sp0.x, this.heightAt(sp0.x, sp0.z) + 0.1, sp0.z + (cur ? 0.6 : 0)); this.pawnHop = 0;
  }
  addNode(nd) {
    const g = new THREE.Group(); const y = this.heightAt(nd.x, nd.z); g.position.set(nd.x, y, nd.z); this.world.add(g);
    const key = { battle: 'mk_battle', elite: 'mk_elite', event: 'mk_event', shop: 'mk_shop', lab: 'mk_lab', guardian: 'mk_guardian' }[nd.type];
    const h = nd.type === 'guardian' ? 3.4 : nd.type === 'shop' || nd.type === 'lab' ? 1.5 : 1.6;
    const fig = { root: standee(key, { height: h }), update() {} }; g.add(fig.root);
    const ringA = new Animated('well', [0, 1, 2, 3], { height: 1.2, anchor: 'center', flat: true, fps: 8 }); const ring = ringA.mesh; ring.position.y = 0.06; ring.visible = false; g.add(ring);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.4, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.0; hit.userData.node = nd; g.add(hit);
    this.nodeViews.set(nd.id, { g, fig, ring, ringA, hit, nd, s: new Spring(1, 14, 0.4) });
  }
  buildPaths() {
    while (this.pathGroup.children.length) this.pathGroup.remove(this.pathGroup.children[0]);
    const visited = new Set(this.run.path || []); const stone = F({ color: 0xc8b89a, roughness: 0.9 }); const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe3ff).multiplyScalar(2) });
    const geo = S.blob(0.12, 0.04, 0.1, { detail: 0, seed: 9 });
    for (const a of Object.values(this.map.nodes)) for (const bid of a.next) {
      const b = this.map.nodes[bid]; const len = Math.hypot(b.x - a.x, b.z - a.z); const n = Math.floor(len / 0.45);
      const lit = visited.has(a.id) && (visited.has(b.id) || this.run.pos === a.id && false);
      for (let i = 1; i < n; i++) { const t = i / n; const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; const m = new THREE.Mesh(geo, lit ? glowM : stone); m.position.set(x, this.heightAt(x, z) + 0.03, z); m.rotation.y = i; m.receiveShadow = true; this.pathGroup.add(m); }
    }
  }
  refreshNodes() {
    const reach = new Set(reachable(this.run)); this.reach = reach;
    for (const [id, v] of this.nodeViews) { v.reachable = reach.has(id); v.visited = (this.run.path || []).includes(id); v.ring.visible = v.reachable; v.fig.root.material.color.setScalar(v.visited ? 0.55 : 1); }
  }

  // ------------------------------------------------------------ HUD
  buildHUD() {
    const W = this.W, H = this.H; const r = this.run;
    this.pouch = new Pouch(); this.pouch.group.position.set(-W + 2.3, H - 2.0, 2); this.pouch.set(r.gold); this.root.add(this.pouch.group);
    this.hpTag = textPlane([[[`Integrity ${r.player.hp}/${r.player.maxHp}`, '#f6b3a0']]], { w: 9, h: 1, font: 'Pixelify', size: 64, weight: 700, stroke: ['#1a1220', 12] }); this.hpTag.position.set(-W + 9, H - 1.6, 2); this.root.add(this.hpTag);
    this.floorTag = textPlane([[[`Loop ${r.loop} · Floor ${Math.max(0, r.floor + 1)}/${this.map.rows}`, '#e8d4a2']]], { w: 9, h: 0.8, font: 'VT323', size: 64, stroke: ['#1a1220', 10] }); this.floorTag.position.set(-W + 9, H - 2.6, 2); this.root.add(this.floorTag);
    this.items = r.items.map((id, i) => { const t = new ItemToken(id, { size: 1.5 }); t.group.position.set(-W + 1.8 + i * 1.7, H - 4.6, 2); this.root.add(t.group); return t; });
    this.addButton(new Button3D('Journal', () => this.openJournal(), { w: 3.6, h: 1.1, size: 50, color: 'purple' }), W - 2.6, H - 1.5, 2);
    this.addButton(new Button3D(`Deck (${r.deck.length})`, () => this.openDeck(), { w: 3.6, h: 1.1, size: 46 }), W - 2.6, H - 2.9, 2);
    this.addButton(new Button3D('Menu', () => this.game.toMenu(), { w: 3.6, h: 1.1, size: 50, color: 'red' }), W - 2.6, H - 4.3, 2);
    this.hint = textPlane([[['Drag to rotate · scroll to zoom · click a glowing node', '#cdb6f0']]], { w: 18, h: 0.8, font: 'VT323', size: 56, stroke: ['#1a1220', 10] }); this.hint.position.set(0, -H + 0.9, 2); this.root.add(this.hint);
  }
  async openJournal() { const { Journal } = await import('./journal.js'); if (!this.journal) { this.journal = new Journal(this.game, this.root); } this.journal.open(); }
  async openDeck() { const { DeckView } = await import('./deckview.js'); this.deckView = new DeckView(this.game, this.root, this.run.deck); this.deckView.open(); }

  // ------------------------------------------------------------ input
  onDragStart() { if (this.journal?.isOpen || this.deckView?.isOpen) return; this.dragging = true; audio.play('wood_creak', { vol: 0.4 }); return true; }
  onDrag() { if (!this.dragging) return; this.yaw.target -= this.input.vx * 0.0002; this.pitch.target = clamp(this.pitch.target + this.input.vy * 0.00012, 0.45, 1.35); this.fz.target = clamp(this.fz.target, -32, 2); }
  onDragEnd() { this.dragging = false; }
  onWheel(e) { this.dist.target = clamp(this.dist.target + e.dy * 0.02, 7, 34); this.fz.target = clamp(this.fz.target - (e.dy < 0 ? 0 : 0), -32, 2); }
  onPinch(e) { this.dist.target = clamp(this.dist.target / e.scale, 7, 34); }
  onKey(e) { if (e.code === 'KeyJ') this.openJournal(); if (e.code === 'ArrowUp') this.fz.target -= 3; if (e.code === 'ArrowDown') this.fz.target += 3; }
  rayNodes() { const r = new THREE.Raycaster(); r.setFromCamera(this.input.ndc, this.camera); const h = r.intersectObjects([...this.nodeViews.values()].map((v) => v.hit)); return h[0]?.object.userData.node; }
  onMove() {
    if (this.journal?.isOpen || this.deckView?.isOpen) return;
    const nd = this.rayNodes(); if (nd !== this.hoverNode) { this.hoverNode = nd; if (nd) { const [t, d] = NODE_INFO[nd.type]; audio.play('ui_hover', { vol: 0.4 }); this.tip.show([[[t, nd.type === 'elite' || nd.type === 'guardian' ? '#8f2a2e' : '#3a2410']], [[d, '#2a160c']], [[this.reach.has(nd.id) ? 'Click to travel here.' : 'Not reachable yet.', this.reach.has(nd.id) ? '#2d6e6a' : '#8a6a44']]], 0, -this.H + 3.5, 8); } else this.tip.hide(); }
    // pan the view towards the pointer edges
  }
  onClick() {
    if (this.journal?.isOpen || this.deckView?.isOpen || this.travelling) return;
    const nd = this.rayNodes(); if (!nd) return; if (!this.reach.has(nd.id)) { audio.play('ui_error'); return; }
    this.travel(nd); return true;
  }
  async travel(nd) {
    this.travelling = true; audio.play('pin'); this.tip.hide();
    (this.run.path ||= []).push(nd.id);
    const from = this.pawn.root.position.clone(); const to = new THREE.Vector3(nd.x, this.heightAt(nd.x, nd.z) + 0.1, nd.z + 0.6);
    this.fx.target = nd.x; this.fz.target = nd.z - 2; const hops = Math.max(3, Math.round(from.distanceTo(to) / 0.7)); const o = { k: 0 };
    for (let i = 0; i < hops; i++) audio.play('wood_knock', { delay: i * 0.18, vol: 0.4, minGap: 0 });
    await tweens.to(o, { k: 1 }, hops * 0.18, { ease: 'inOutSine', onUpdate: () => { this.pawn.root.position.lerpVectors(from, to, o.k); this.pawn.root.position.y += Math.abs(Math.sin(o.k * Math.PI * hops)) * 0.4; this.pawn.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); } });
    const v = this.nodeViews.get(nd.id); v.s.kick(6); await tweens.wait(0.35);
    this.dist.target = 6; this.pitch.target = 0.7; audio.play('transition_whoosh'); await tweens.wait(0.5);
    this.game.enterNode(nd.id);
  }

  update(dt, t) {
    // camera orbit around the focus
    for (const s of [this.yaw, this.pitch, this.dist, this.fx, this.fz]) s.update(dt);
    const f = new THREE.Vector3(this.fx.value, 0, this.fz.value); const d = this.dist.value; const p = this.pitch.value; const y = this.yaw.value;
    this.camera.position.set(f.x + Math.sin(y) * Math.cos(p) * d, f.y + Math.sin(p) * d, f.z + Math.cos(y) * Math.cos(p) * d); this.camera.lookAt(f);
    this.pawn.update(dt); for (const [, v] of this.nodeViews) { v.fig?.update?.(dt); v.s.update(dt); v.g.scale.setScalar(v.s.value); v.ringA.update(dt); if (v.reachable) v.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08); faceCamera(v.fig.root, this.camera); }
    for (const sh of []) { sh.t -= dt; if (sh.t < 0) { sh.t = 2 + Math.random() * 4; sh.a += vrange(-1.5, 1.5); } const nx = sh.o.position.x + Math.sin(sh.a) * dt * 0.2, nz = sh.o.position.z + Math.cos(sh.a) * dt * 0.2; if (this.pathD(nx, nz) > 0.6 && Math.abs(nx) < 9) { sh.o.position.x = nx; sh.o.position.z = nz; sh.o.position.y = this.heightAt(nx, nz) + Math.abs(Math.sin(t * 8 + sh.a)) * 0.03; sh.o.rotation.y = sh.a; } else sh.a += 1; }
    for (const b of []) { const a = t * b.sp + b.ph; b.o.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 2 + b.ph) * 0.3, b.cz + Math.sin(a) * b.r * 0.6); b.o.rotation.y = -a; b.o.children.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * Math.sin(t * 10 + b.ph) * 0.6)); }
    for (const pp of this.party) { pp.a += dt * 0.6; pp.api.root.position.set(pp.cx + Math.cos(pp.a) * 0.7, this.heightAt(pp.cx, pp.cz) + Math.abs(Math.sin(t * 5 + pp.a)) * 0.1, pp.cz + Math.sin(pp.a) * 0.7); pp.api.root.rotation.y = -pp.a; pp.api.update(dt); }
    if (Math.random() < 0.3) this.parts.spawn({ pos: [vrange(-9, 9), vrange(0.3, 3), vrange(-30, 2)], vel: [0, 0.1, 0], life: 4, size: vrange(10, 18), color: '#ffe08a', sprite: 'firefly', wobble: 0.4 });
    this.parts.update(dt, t); this.critters.update(dt, t); this.water.material.color.setHSL(0.57, 0.55, 0.42 + Math.sin(t * 2) * 0.02);
    this.updateUI(dt); this.pouch.update(dt); for (const it of this.items) it.update(dt, t);
    this.journal?.update(dt, t); this.deckView?.update(dt, t);
  }
  dispose() { super.dispose(); }
}

function vrangeR(rnd, a, b) { return a + (b - a) * rnd(); }
function hut(rnd) { const g = new THREE.Group(); mk(S.turn([[0.001, 0], [0.5, 0], [0.5, 0.5], [0.001, 0.5]], { sides: 8, seed: 3 }), F({ color: 0xc8a87a }), g); mk(S.facet(new THREE.ConeGeometry(0.7, 0.6, 8)), F({ color: 0x8a6a2a }), g, 0, 0.8, 0); return g; }
function sheepModel() { const g = new THREE.Group(); mk(S.blob(0.5, 0.38, 0.38, { detail: 1, seed: 11, amt: 0.25 }), F({ color: 0xf4f0e8 }), g, 0, 0.55, 0); mk(S.blob(0.18, 0.2, 0.25, { detail: 0, seed: 12 }), F({ color: 0x2a2020 }), g, 0, 0.62, 0.45); for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]]) mk(S.limb(0.35, 0.05, 0.04, { sides: 4, seed: 13 }), F({ color: 0x2a2020 }), g, x, 0.35, z); return g; }
function birdModel() { const g = new THREE.Group(); const m = F({ color: 0x2a2030, side: THREE.DoubleSide }); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(s * 0.45, 0, -0.05), new THREE.Vector3(0, 0, -0.15)]), m); g.add(w); } return g; }
