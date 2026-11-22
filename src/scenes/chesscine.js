// THE GRANDMASTER'S GAME (story agent): the cinematics of the chess story.
// PESSOKRATOR, the Grandmaster of Olympus, plays chess with mortal lives on a board of sixty-four marble squares that
// floats among the stars above Olympus. When young Isaac seized the golden apple he became a piece nobody had placed:
// one white pawn that moves itself, against the whole black army. Every act ends at one of the god's pieces.
//   boardMove(S)          before each act boss (from BattleScene.intro): the cosmic board, the god looming over it, his
//                         giant marble hand lifts the black piece and moves it by its own chess move onto its square;
//                         the camera dives into the square and the battle's arena reveal follows (cinematic.js)
//   playActBeat(game,run) after an act boss: the fallen piece is taken off the board, the white pawn advances, the god
//                         speaks; then the next act's card. Also after the Queen (mid-finale)
//   playFinale(game,run)  the King resigns: his piece tips over, the board falls away into the stars, the pawn reaches
//                         the eighth rank and is promoted; the god's last words; the loop closes
// All of it skippable (click / Space / Enter / Esc: the Director). Dialogue: floattext.js (crisp floating Alagard,
// voiced through voice.js). Debug: ?chess=pawn|knight|bishop|rook|queen|king (&beat=1 | &finale=1), see main.js.
import * as THREE from 'three';
import { Director, CamRig, ease, span, clamp01 } from './cinematic.js';
import { cineText } from '../ui3d/cinetext.js';
import { fsay, fnarrate, fstop, registerVoice } from '../story/floattext.js';
import { audio } from '../core/audio.js';
import { createCreature } from '../models/creatures.js';
import { heroMini } from '../models/minis.js';
import { chessPiece, pieceBase } from '../models/beasts/chess.js';
import { spaceBackdrop } from '../gfx/spacebg.js';
import { K } from '../models/beasts/look.js';
import { gradientEnv } from '../models/toon.js';
import { ENEMIES } from '../game/data/enemies.js';
import { AREAS, genMap, nodeEncounter } from '../game/run.js';
import { RNG, hashString } from '../core/util.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const hex = K.hex;
registerVoice('grandmaster', { g: 'm', lang: 'en-GB', pitch: 0.32, rate: 0.72, echo: true, prefer: [/Daniel/, /George/, /Arthur/, /Ralph/, /UK English Male/] }, { name: 'Pessokrator', color: '#f0e2c0', style: 'pale', font: 'head' });

// ================================================================ THE STORY
export const PIECE_OF = { black_pawn: 'pawn', black_knight: 'knight', oracle_bishop: 'bishop', rook_titan: 'rook', black_queen: 'queen', pessokrator: 'king' };
export const STORY = {
  pawn: { act: 'Act I', title: 'The Opening', place: 'The Mythical Wilderness', move: [['e7', 'e6', 'e5']], from: 'e7', isaac: ['e2', 'e4'],
    before: ['Olympus was never a mountain. It was a board, and its master was Pessokrator, the Grandmaster, who plays chess with mortal lives.', 'Every god a piece. Every hero a pawn. And then one white pawn began to move itself.'],
    god: 'Pawns first. They are cheap, little one. So are you.', after: 'You captured my pawns. How unusual. Pawns do not usually capture anything.', afterN: 'Three black pawns lay on their sides. The white pawn stepped forward two squares.' },
  knight: { act: 'Act II', title: 'The Middlegame', place: 'The Highlands of Delphi', move: [['g8', 'g7', 'g6', 'f6']], from: 'g8', isaac: ['e4', 'e5'],
    before: ['The Grandmaster stopped smiling, and reached for a minor piece.', 'Hippolochos, the Black Knight, who has never in his life ridden straight.'],
    god: 'Knight to f6. Two forward, one aside. You will never see him coming.', after: 'A minor piece. I have others. I have only ever needed others.', afterN: 'The Knight was set beside the board. The pawn crossed into the middle of the game.' },
  bishop: { act: 'Act II', title: 'The Middlegame', place: 'The Highlands of Delphi', move: [['c8', 'd7', 'e6', 'f5', 'g4']], from: 'c8', isaac: ['e4', 'e5'],
    before: ['The Grandmaster stopped smiling, and reached for a minor piece.', 'The Hierophant of Delphi, who sees the future and walks only the diagonals.'],
    god: 'Bishop to g4, along the long diagonal. The oracle has already seen you fall.', after: 'The oracle was wrong. That has not happened before. I find I do not like it.', afterN: 'The Bishop was set beside the board. The pawn crossed into the middle of the game.' },
  rook: { act: 'Act III', title: 'The Endgame', place: 'The Slopes of Olympus', move: [['h8', 'h7', 'h6', 'h5', 'h4', 'h3']], from: 'h8', isaac: ['e5', 'e6'],
    before: ['Few pieces were left, and the board grew quiet.', 'So the Grandmaster sent his Rook: Pyrgos, the Walking Bastion, the corner of the world.'],
    god: 'Rook to h3. The castle walks. Nothing passes a castle.', after: 'The corner of my board has fallen. Come, then. My Queen is waiting for you.', afterN: 'Stone by stone the bastion fell. The white pawn stood at the gates of Olympus.' },
  queen: { act: 'Finale', title: 'Checkmate', place: 'The Board Above Olympus', move: [['d8', 'd7']], from: 'd8', isaac: ['e6', 'd7'],
    before: ['Above Olympus the board floats among the stars, and there the Black Queen waits.', 'Ophira, the gorgon, who moves however she pleases.'],
    god: 'My Queen to d7. She moves as every piece moves, child. You move as a pawn.', after: 'You took my Queen. Then there is only one piece left that can stop you. Mine.', afterN: 'The pawn captured on the diagonal, as pawns do. Only the King remained.' },
  king: { act: 'Finale', title: 'Checkmate', place: 'The Board Above Olympus', move: [['e8', 'e8']], from: 'e8', isaac: ['d7', 'e8'],
    before: ['For ten thousand years the Grandmaster had never touched his own King.', 'Tonight he took it in his hand.'],
    god: 'The King moves himself. Let us finish the game, Isaac Newton.', after: '', afterN: '' },
};
// the black army at each act (squares cleared by earlier captures); the boss stands on `from`
const BLACK = { a8: 'rook', b8: 'knight', c8: 'bishop', d8: 'queen', e8: 'king', f8: 'bishop', g8: 'knight', h8: 'rook' }; for (const f of 'abcdefgh') BLACK[f + '7'] = 'pawn';
const GONE = { pawn: [], knight: ['d7', 'e7', 'f7'], bishop: ['d7', 'e7', 'f7'], rook: ['d7', 'e7', 'f7', 'h7'], queen: ['d7', 'e7', 'f7', 'h7', 'h8'], king: ['d7', 'e7', 'f7', 'h7', 'h8', 'd8'] };
const SQ = (s) => [s.charCodeAt(0) - 97, +s[1]]; // 'e4' -> [4, 4]
export const squareXZ = (s) => { const [f, r] = SQ(s); return V(f - 3.5, 0, 4.5 - r); };

// ================================================================ THE COSMIC BOARD
const marbleMat = (key, light) => K.uvMat('cboard-' + key, 96, 96, (u, v, o) => {
  const n = K.vnoise(u * 5, v * 5, light ? 1.7 : 6.3) + K.vnoise(u * 13, v * 13, 2) * 0.4; const w = Math.abs(Math.sin(u * 9 + v * 6 + n * 7)); const vein = w < 0.04, fine = w < 0.09;
  const C = light ? (vein ? hex('#b8a88a') : fine ? hex('#d8ccb2') : hex('#ece2cc')) : vein ? hex('#c8963a') : fine ? hex('#2e2838') : hex('#1c1822');
  K.tone(C, K.band(0.5 + (n - 0.7) * 0.2 + (u < 0.04 || v < 0.04 ? 0.12 : u > 0.96 || v > 0.96 ? -0.12 : 0)), o.col); o.ro = vein && !light ? 0.3 : 0.16; o.me = vein && !light ? 0.7 : 0.02;
});
const frameMat = () => K.uvMat('cboard-frame', 256, 32, (u, v, o) => { // an ebony frame inlaid with a gold meander and file letters
  const key = v > 0.3 && v < 0.7; const x = (u * 64) % 1, y = (v - 0.3) / 0.4; const X = Math.floor(x * 5), Y = Math.floor(y * 5);
  const on = key && (Y === 0 || (Y === 4 && X < 4) || (X === 0 && Y > 0) || (X === 4 && Y < 4 && Y > 0) || (Y === 2 && X > 0 && X < 3));
  const edge = v < 0.12 || v > 0.88; K.tone(on || edge ? hex('#c8963a') : hex('#1e1a24'), K.band(0.55 + (edge ? 0.1 : 0) + Math.sin(u * 300) * 0.02), o.col); o.me = on || edge ? 0.85 : 0.1; o.ro = 0.25;
});
const handMat = () => K.uvMat('god-hand', 128, 128, (u, v, o) => { // ivory-marble skin with gold-leaf seams (he is a statue that moves)
  const n = K.vnoise(u * 8, v * 8, 4.1); const w = Math.abs(Math.sin(u * 14 + v * 23 + n * 6)); K.tone(w < 0.035 ? hex('#d8a848') : w < 0.08 ? hex('#cfc2a8') : hex('#ece2cc'), K.band(0.52 + Math.cos(u * 6.28) * 0.16 + (n - 0.5) * 0.1), o.col); o.ro = 0.3; o.me = w < 0.035 ? 0.7 : 0;
});
const sleeveMat = () => K.uvMat('god-sleeve', 128, 64, (u, v, o) => { // night-sky cloth, a checker cuff and a gold band
  if (v < 0.18) { const sq = (Math.floor(u * 24) + Math.floor(v * 30)) % 2; K.tone(sq ? hex('#ece2cc') : hex('#1c1822'), K.band(0.55), o.col); return; }
  if (v < 0.24) { K.tone(hex('#c8963a'), K.band(0.62), o.col); o.me = 0.8; return; }
  const n = K.vnoise(u * 30, v * 20, 8); K.tone(n > 0.55 ? hex('#1c1a44') : hex('#0e0c26'), K.band(0.42 + Math.cos(u * 6.28 * 7) * 0.08), o.col); if (K.vnoise(u * 140, v * 140, 3) > 0.86) { o.col[0] = 255; o.col[1] = 238; o.col[2] = 200; o.em = [255, 238, 200]; }
});

/** the god's right hand (palm down, fingers along +Z), three-jointed fingers that curl to grip; grip(k) 0..1 */
function godHand() {
  const G = new THREE.Group(); G.name = 'godHand'; const m = handMat(); const ring = K.uvMat('god-ring', 32, 8, (u, v, o) => { K.tone(hex('#d8a040'), K.band(0.6 + Math.cos(u * 6.28) * 0.2), o.col); o.me = 0.9; o.ro = 0.25; });
  const seg = (len, r0, r1) => new K.Loft(6, 10).set((t, out) => out.set(0, 0, t * len), (t) => { const r = r0 + (r1 - r0) * t; const cap = t < 0.12 ? 0.75 + t * 2 : t > 0.86 ? 0.75 + (1 - t) * 1.7 : 1; return [r * cap, r * 0.86 * cap]; }).geo;
  K.mesh(new K.Loft(10, 14).set((t, out) => out.set(0, -0.02 * Math.sin(t * Math.PI), t * 0.56), (t) => [0.2 + t * 0.06 - (t > 0.85 ? (t - 0.85) * 0.4 : 0), 0.085 - t * 0.012]).geo, m, G); // the palm
  K.mesh(new K.Loft(6, 14).set((t, out) => out.set(0, 0, -t * 0.22), (t) => [0.17 + t * 0.03, 0.09 + t * 0.02]).geo, m, G); // the wrist
  const sl = K.mesh(new K.Loft(8, 16).set((t, out) => out.set(0, 0.02 * t, -0.18 - t * 1.4), (t) => [0.27 + t * 0.12, 0.22 + t * 0.1]).geo, sleeveMat(), G); sl.material.side = THREE.DoubleSide; // the sleeve of night
  const fingers = []; const F = [[-0.19, 0.2, 0.05], [-0.065, 0.25, 0.058], [0.065, 0.24, 0.056], [0.18, 0.18, 0.048]];
  F.forEach(([x, L, r], i) => {
    const j = [new THREE.Group(), new THREE.Group(), new THREE.Group()]; j[0].position.set(x, -0.01, 0.55); G.add(j[0]);
    const lens = [L * 0.48, L * 0.32, L * 0.26]; for (let k = 0; k < 3; k++) { K.mesh(seg(lens[k], r * (1 - k * 0.12), r * (0.88 - k * 0.12)), m, j[k]); if (k < 2) { j[k + 1].position.z = lens[k]; j[k].add(j[k + 1]); } }
    if (i === 1 || i === 3) { const rg = K.mesh(new K.Loft(3, 12).set((t, out) => out.set(0, 0, t * 0.03), () => [r * 1.18, r * 1.05]).geo, ring, j[0]); rg.position.z = lens[0] * 0.45; }
    fingers.push(j);
  });
  const th = [new THREE.Group(), new THREE.Group()]; th[0].position.set(-0.22, -0.03, 0.16); th[0].rotation.set(0.2, -0.9, 0.35); G.add(th[0]); K.mesh(seg(0.16, 0.06, 0.055), m, th[0]); th[1].position.z = 0.16; th[0].add(th[1]); K.mesh(seg(0.13, 0.052, 0.04), m, th[1]);
  G.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  G.userData.grip = (k) => { fingers.forEach((j, i) => { j[0].rotation.x = k * (0.75 + i * 0.05) + 0.12; j[1].rotation.x = k * 1.05 + 0.08; j[2].rotation.x = k * 0.8 + 0.05; }); th[0].rotation.y = -0.9 + k * 0.55; th[1].rotation.y = k * 0.5; };
  G.userData.grip(0); G.userData.tip = V(0, -0.3, 0.72); // where a held piece's top sits (local), for a ~55 degree downward hand
  return G;
}

/** the board scene for a piece's act; phase 'before' (the boss on its square) or 'after' (the boss lying where it fell) */
export class CosmicBoard {
  constructor(engine, { piece = 'pawn', phase = 'before', run = null } = {}) {
    this.E = engine; this.piece = piece; this.phase = phase; this.story = STORY[piece]; const sc = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(38, engine.aspect, 0.1, 400); sc.add(this.camera); this.rig = new CamRig(this.camera); this.t = 0; this.updaters = [];
    this.bg = spaceBackdrop(); sc.add(this.bg.mesh); sc.environment = gradientEnv(engine.renderer, 'cosmic-board', { top: '#3a3070', hor: '#c8905a', gnd: '#141020' }); sc.environmentIntensity = 0.55;
    // light: a cool star key from above-left, the board's warm glow from below, a violet rim on the god
    const key = new THREE.DirectionalLight(0xe8ecff, 2.4); key.position.set(-6, 12, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); key.shadow.bias = -0.0005; sc.add(key, key.target);
    sc.add(new THREE.HemisphereLight(0x8a90d8, 0x3a2418, 0.9)); const warm = new THREE.PointLight(0xffb060, 22, 14, 1.6); warm.position.set(0, 1.6, 2.5); sc.add(warm);
    const rim = new THREE.DirectionalLight(0xa890ff, 1.6); rim.position.set(4, 6, -16); sc.add(rim); const under = new THREE.PointLight(0xffc880, 40, 22, 1.4); under.position.set(0, 1.0, -7.5); sc.add(under); this.under = under;
    this.buildBoard(); this.buildPieces(run); this.buildGod(); this.hand = godHand(); this.hand.scale.setScalar(2.2); this.hand.visible = false; sc.add(this.hand);
    this.motes(); this.camera.position.set(0, 6, 10); this.camera.lookAt(0, 0, 0);
  }
  buildBoard() {
    const g = (this.board = new THREE.Group()); this.scene.add(g); const geo = new RoundedBoxGeometry(0.98, 0.16, 0.98, 2, 0.03);
    for (const light of [true, false]) { const im = new THREE.InstancedMesh(geo, marbleMat(light ? 'l' : 'd', light), 32); im.receiveShadow = true; im.castShadow = true; let i = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) { if (((f + r) % 2 === 1) !== light) continue; q.setFromAxisAngle(V(0, 1, 0), ((f * 3 + r * 5) % 4) * Math.PI / 2); m4.compose(V(f - 3.5, -0.08, 4.5 - r), q, V(1, 1, 1)); im.setMatrixAt(i++, m4); }
      g.add(im); (this.tiles ||= []).push(im); }
    // the frame: an ebony rail with a gold meander, a deep plinth, corner finials
    const fm = frameMat(); for (const [x, z, w, d] of [[0, 4.32, 9.04, 0.64], [0, -4.32, 9.04, 0.64], [4.32, 0, 0.64, 8.0], [-4.32, 0, 0.64, 8.0]]) { const b = K.mesh(new RoundedBoxGeometry(w, 0.3, d, 2, 0.05), fm, g); b.position.set(x, -0.12, z); b.receiveShadow = true; }
    const pl = K.mesh(new RoundedBoxGeometry(9.5, 0.7, 9.5, 2, 0.12), marbleMat('d', false), g); pl.position.y = -0.62;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = chessPiece('pawn', 'ebony'); c.scale.setScalar(0.7); c.position.set(sx * 4.32, 0.03, sz * 4.32); g.add(c); }
    // beneath it, the underside of Olympus: a slab of mountain broken off and carried among the stars
    const rock = K.uvMat('cboard-rock', 64, 64, (u, v, o) => { const C = K.cells2(u * 9, v * 9); K.tone(hex('#3a3440'), K.band(0.42 + (C[1] - C[0] < 0.06 ? -0.2 : (C[4] - 0.5) * 0.2) - v * 0.15), o.col); });
    const cr = new THREE.LatheGeometry([[6.2, 0], [6.4, -0.4], [5.6, -1.6], [4.4, -3.2], [2.8, -4.8], [1.2, -6.6], [0.001, -7.6]].map(([x, y]) => new THREE.Vector2(x, y)), 9); const p = cr.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(i * 12.9898) * 0.08; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } cr.computeVertexNormals();
    const cm = K.mesh(cr, rock, g); cm.position.y = -0.95; cm.rotation.y = 0.3;
  }
  pieceAt(sq) { return this.pieces.get(sq) || null; }
  buildPieces(run) {
    this.pieces = new Map(); this.captured = []; const st = this.story; const gone = new Set(GONE[this.piece] || []);
    if (this.piece === 'rook' || this.piece === 'queen' || this.piece === 'king') gone.add(run?.flags?.minor === 'bishop' ? 'c8' : 'g8'); // whichever minor piece fell in Act II
    const bossSq = this.phase === 'before' ? st.from : st.move[0][st.move[0].length - 1];
    for (const [sq, kind] of Object.entries(BLACK)) {
      if (gone.has(sq) || sq === st.from) continue; const p = chessPiece(kind, 'ebony'); p.position.copy(squareXZ(sq)); p.rotation.y = Math.PI; this.scene.add(p); this.pieces.set(sq, p);
    }
    // the moving piece: the boss itself as a living statuette (the King is the Grandmaster's own lathe king)
    const id = this.piece === 'king' ? null : Object.keys(PIECE_OF).find((k) => PIECE_OF[k] === this.piece); let boss;
    if (id) { const api = createCreature(id, 5); const s = (this.piece === 'knight' ? 1.0 : this.piece === 'rook' ? 1.05 : 0.95) / api.height; api.root.scale.setScalar(s); api.root.rotation.y = Math.PI; boss = api.root; this.bossApi = api; this.updaters.push(api); }
    else { boss = chessPiece('king', 'ebony'); boss.scale.setScalar(1.15); boss.rotation.y = Math.PI; }
    boss.position.copy(squareXZ(bossSq)); this.scene.add(boss); this.boss = boss; this.pieces.set(bossSq, boss);
    if (this.phase === 'after') { this.bossApi?.act?.('die'); boss.rotation.z = this.piece === 'king' ? 0 : 1.45; boss.position.y = 0.12; }
    // the white pawn: Sir Isaac's own figurine on an ivory base
    const hero = (this.hero = heroMini({})); hero.root.scale.setScalar(0.52); const hb = pieceBase(0.62, 'ivory', 0.18); hb.scale.setScalar(0.66); hero.root.add(hb); hb.position.y = -0.12; hero.body.position.y = 0.04;
    hero.root.position.copy(squareXZ(st.isaac[0])); hero.root.rotation.y = 0.2; this.scene.add(hero.root); this.updaters.push({ update: (dt) => hero.update(dt, this.t) });
    // the black pieces already taken lie beside the board
    const taken = [...gone].filter((s) => BLACK[s]); taken.forEach((s, i) => { const p = chessPiece(BLACK[s], 'ebony'); p.rotation.set(0, 0.4 + i, Math.PI / 2); p.position.set(5.2 + (i % 2) * 0.7, 0.25, -3.4 + i * 0.9); this.scene.add(p); this.captured.push(p); });
  }
  buildGod() { // the Grandmaster looms over the far side of the board, leaning on the dark like a player on his table
    try { const api = createCreature('pessokrator', 9); api.root.scale.setScalar(7.6); api.root.position.set(0, -19.0, -12.5); api.root.rotation.set(0.12, 0, 0); const hp = api.root.getObjectByName('heldPawn'); if (hp) hp.visible = false; /* (the white pawn he holds is on the board now) */ this.scene.add(api.root); this.god = api; this.updaters.push(api); api.act?.('cast'); }
    catch (e) { console.warn('grandmaster', e); }
  }
  godHead(out = V()) { const h = this.god?.head; if (!h) return out.set(0, 7, -12); h.updateMatrixWorld(true); return h.getWorldPosition(out); }
  motes() { // drifting gold dust over the board (tiny additive points)
    const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 16; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const m = new THREE.PointsMaterial({ color: 0xffd890, size: 0.04, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(g, m); pts.userData.noInk = true; this.scene.add(pts); this.updaters.push({ update: (dt) => { const a = g.attributes.position; for (let i = 0; i < n; i++) { let y = a.getY(i) + dt * 0.12; if (y > 6) y = 0; a.setY(i, y); } a.needsUpdate = true; } });
  }
  /** star dust bursting from a square when a piece lands */
  burst(at) {
    const n = 60, pos = new Float32Array(n * 3), vel = []; for (let i = 0; i < n; i++) { pos.set([at.x, 0.05, at.z], i * 3); const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2.5; vel.push([Math.cos(a) * s, 0.5 + Math.random() * 1.6, Math.sin(a) * s]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const m = new THREE.PointsMaterial({ color: 0xffe2a0, size: 0.07, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(g, m); pts.userData.noInk = true; this.scene.add(pts); let life = 0;
    const u = { update: (dt) => { life += dt; const a = g.attributes.position; for (let i = 0; i < n; i++) { const v = vel[i]; v[1] -= dt * 2.2; a.setXYZ(i, a.getX(i) + v[0] * dt, Math.max(0.02, a.getY(i) + v[1] * dt), a.getZ(i) + v[2] * dt); v[0] *= 1 - dt * 1.5; v[2] *= 1 - dt * 1.5; } a.needsUpdate = true; m.opacity = Math.max(0, 1 - life / 1.4); if (life > 1.5) { this.scene.remove(pts); g.dispose(); m.dispose(); this.updaters = this.updaters.filter((x) => x !== u); } } };
    this.updaters.push(u); audio.play('rock_impact', { vol: 0.6 }); audio.play('magic_sparkle', { vol: 0.4 }); this.E.shake(0.18);
  }
  /** place the hand so a held piece's top sits at world point p (the hand tilted fingers-down, coming from behind) */
  handAt(p, k = 1, yaw = 0) { const h = this.hand; h.rotation.set(0.95, yaw, 0); h.updateMatrixWorld(true); const tip = this.hand.userData.tip.clone().multiplyScalar(h.scale.x).applyEuler(h.rotation); h.position.copy(p).sub(tip); h.userData.grip(k); }
  update(dt, t) { this.t = t; this.bg.update(dt, t, this.E.renderer, null); for (const u of this.updaters) u.update(dt, t); this.under.intensity = 36 + Math.sin(t * 1.3) * 4; }
  dispose() { fstop(); this.scene.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.userData.shared && o.geometry.type !== 'LatheGeometry') o.geometry.dispose?.(); }); }
}
const BOARD_FX = { bloom: [0.55, 0.6, 0.78], exposure: 1.05, tilt: false, ao: 0.9, ink: { strength: 0.85, depth: 0.05, normal: 0.4, fade: [40, 140] }, grade: { sat: 1.04, contrast: 1.12, vignette: 0.62, warmth: 0.02, lift: [0.01, 0.008, 0.03] } };

// ================================================================ the pieces' path over the board (lift, travel, set down)
function movePath(B, squares) {
  const pts = squares.map((s) => squareXZ(s)); const H = 1.5; const out = [pts[0].clone().setY(0)];
  out.push(pts[0].clone().setY(H)); for (let i = 1; i < pts.length; i++) out.push(pts[i].clone().setY(H + (i < pts.length - 1 ? 0.15 : 0))); out.push(pts.at(-1).clone().setY(0));
  return new THREE.CatmullRomCurve3(out, false, 'centripetal', 0.2);
}
const title3D = (B, st) => { // the act card in cast gold Alagard, floating in front of the camera
  const g = new THREE.Group(); const a = cineText(st.act.toUpperCase(), { height: 0.16, style: 'starlight', glow: 0.15 }); const b = cineText(st.title.toUpperCase(), { height: 0.42, style: 'gold', glow: 0.2 }); const c = cineText(st.place, { height: 0.13, style: 'ivory' });
  a.position.y = 0.52; c.position.y = -0.42; g.add(a, b, c); g.position.set(0, 0.55, -5); B.camera.add(g); g.userData.parts = [a, b, c]; g.scale.setScalar(0.001); return g;
};
function popTitle(g, t, t0, t1) { const k = clamp01(Math.min((t - t0) / 0.6, (t1 - t) / 0.5)); g.scale.setScalar(Math.max(0.001, ease.out(k))); g.rotation.x = (1 - k) * 0.4; for (const p of g.userData.parts) if (p.userData.U?.uSweep) p.userData.U.uSweep.value = -3 + (t - t0) * 2.4; }

// ================================================================ BEFORE A BOSS: the god moves his piece
/** S: the BattleScene (engine, input, runData); the battle world is restored afterwards */
export async function boardMove(S, piece) {
  const E = S.engine; const prev = { scene: E.world.scene, camera: E.world.camera, fx: E.fx };
  const B = new CosmicBoard(E, { piece, phase: 'before', run: S.runData }); B.rig.snap(V(-1.2, 5.2, 12.5), V(0, 2.5, -4), 46); B.rig.apply();
  // the scene-change transition compiles the battle's shaders first (engine.warmup); the board takes the screen as it opens
  for (let k = 0; k < 400 && E.wipeActive && E.wipeMat?.uniforms?.uPhase?.value !== 1; k++) await new Promise((r) => setTimeout(r, 30));
  E.setWorld(B.scene, B.camera); E.setFx(BOARD_FX); for (let k = 0; k < 400 && E.wipeActive; k++) await new Promise((r) => setTimeout(r, 50));
  const st = STORY[piece]; const D = new Director(E, S.input); window.__storyBand = true; D.onSkip = () => fstop();
  const path = movePath(B, st.move[0]); const from = squareXZ(st.from), to = squareXZ(st.move[0].at(-1)); const tt = title3D(B, st); const tmp = V(), look = V(), pos = V();
  const T = { title: 0.2, hand: 3.6, grip: 4.4, lift: 4.8, land: 6.4, free: 6.8, gone: 7.6, wake: 7.4, end: 9.6 }; const bossH = piece === 'king' ? 1.5 : 1.1;
  D.at(0.4, () => { fnarrate(st.before[0], { font: 'head', wait: false }); audio.play('transition_whoosh', { vol: 0.5 }); audio.play('gravity_hum', { vol: 0.35 }); });
  D.at(2.2, () => fnarrate(st.before[1], { font: 'head', wait: false }));
  D.at(T.hand - 0.2, () => audio.play('whoosh_heavy', { vol: 0.5 }));
  D.at(T.grip, () => { audio.play('stone_grind', { vol: 0.45 }); fsay('grandmaster', st.god, { anchor: () => B.godHead(tmp).add(V(0, 1.2, 0)), wait: false, font: 'head' }); });
  D.at(T.land, () => B.burst(to)); D.at(T.wake + 0.6, () => { B.bossApi?.act?.('attack'); audio.play('monster_roar', { vol: 0.5 }); });
  D.at(T.end - 0.35, () => { E.flash(0.9, 0xfff2d0, 0.6); audio.play('implosion', { vol: 0.5 }); });
  D.hold(T.end - 0.4, () => !document.hidden, 1);
  let finished = false; const finish = () => { if (finished) return; finished = true; D.end(); };
  D.onSkip = () => { fstop(); finish(); };
  D.frame = (t, dt) => {
    B.update(dt, t); popTitle(tt, t, T.title, 3.2);
    // the piece: on its square, then in the hand, then on its new square
    const h = B.boss; if (t < T.grip) h.position.copy(from); else if (t < T.free) { const u = span(t, T.lift, T.land); path.getPoint(ease.io(u), h.position); if (t < T.lift) h.position.copy(from).setY(span(t, T.grip, T.lift) * 0.05); } else h.position.copy(to);
    // the hand comes down out of the dark, grips, carries, lets go, withdraws
    const hv = t > T.hand - 0.6 && t < T.gone + 0.6; B.hand.visible = hv;
    if (hv) { const top = h.position.clone().add(V(0, bossH, 0)); const inK = ease.out(span(t, T.hand - 0.6, T.hand + 0.4)), outK = ease.in(span(t, T.free, T.gone)); top.y += (1 - inK) * 6 + outK * 6; top.z -= (1 - inK) * 2 + outK * 2; const gk = t < T.grip ? span(t, T.hand, T.grip) * 0.3 : t < T.free ? 0.3 + span(t, T.grip, T.grip + 0.3) * 0.7 : 1 - span(t, T.free, T.free + 0.3); B.handAt(top, gk, Math.sin(t * 0.7) * 0.06); }
    // cameras: the establishing view over the white pawn to the looming god; the move; the dive into the square
    if (t < 3.2) { const u = ease.smooth(span(t, 0, 3.2)); pos.set(-1.2 + u * 1.6, 5.2 - u * 1.4, 12.5 - u * 3.0); B.godHead(look).lerp(V(0, 0.6, -1), 0.32 + u * 0.16); B.rig.snap(pos, look, 46 - u * 4); }
    else if (t < T.wake) { const c = h.position; pos.set(c.x + 4.2, 3.4 + c.y * 0.6, c.z + 5.4); look.set(c.x * 0.85, 1.5 + c.y * 0.8, c.z - 0.6); if (!B.rig.m) { B.rig.m = true; B.rig.snap(pos, look, 40); } else B.rig.follow(pos, look, 40, dt, 3.2, 5); }
    else { const u = ease.in(span(t, T.wake, T.end)); pos.set(to.x + 1.6 - u * 1.2, 0.9 - u * 0.3, to.z + 3.2 - u * 2.4); look.set(to.x, 0.55, to.z); B.rig.follow(pos, look, 30 - u * 12, dt, 4, 8); }
    B.rig.apply(); if (t >= T.end) finish();
  };
  await D.done; window.__storyBand = false; fstop();
  B.camera.remove(tt); B.dispose(); E.setWorld(prev.scene, prev.camera); if (prev.fx) E.setFx(prev.fx);
}

// ================================================================ AFTER A BOSS (and the finale): a scene of its own
class ChessCineScene {
  constructor(game) { this.game = game; this.engine = game.engine; this.input = game.input; }
  build(piece, run, phase = 'after') { this.B = new CosmicBoard(this.engine, { piece, phase, run }); this.engine.setWorld(this.B.scene, this.B.camera); this.engine.setFx(BOARD_FX); audio.playMusic?.('map'); }
  dispose() { this.D?.dispose?.(); this.B?.dispose(); window.__storyBand = false; }
}
const pieceAfterRun = (run) => { const g = run?.map?.nodes?.guardian; const id = g?.enc?.enemies?.find((x) => PIECE_OF[x]); return PIECE_OF[id] || AREAS[run?.area]?.piece || 'pawn'; };
/** after an act's boss (or the Queen): the fallen piece is taken; the white pawn advances; the god's line; the next act's card */
export async function playActBeat(game, run, piece = null) {
  piece ||= pieceAfterRun(run); if (piece === 'minor') piece = 'knight'; if (piece === 'knight' || piece === 'bishop') (run.flags ||= {}).minor = piece;
  let S; await game.swap(async () => { S = new ChessCineScene(game); game.scene = S; S.build(piece, run, 'after'); }, { style: 'galaxy' });
  const B = S.B, st = STORY[piece], E = S.engine; const nextPiece = { pawn: 'knight', knight: 'rook', bishop: 'rook', rook: 'queen' }[piece]; const nx = STORY[nextPiece]; // (after the Queen: no card, the King is next on the same board)
  const D = (S.D = new Director(E, S.input)); window.__storyBand = true; const tmp = V(), pos = V(), look = V();
  const fallen = st.move[0].at(-1), lie = B.boss; const side = V(5.2 + (B.captured.length % 2) * 0.7, 0.25, -3.4 + B.captured.length * 0.9); const lieFrom = lie.position.clone();
  const isA = squareXZ(st.isaac[0]), isB = squareXZ(st.isaac[1]); const tt = nx ? title3D(B, nx) : null;
  const T = { hand: 0.6, grip: 1.6, lift: 2.0, set: 3.4, free: 3.7, gone: 4.5, step: 4.6, stepped: 6.0, card: 6.6, end: 10.2 };
  D.at(0.3, () => fnarrate(st.afterN, { font: 'head', wait: false }));
  D.at(T.grip, () => audio.play('stone_grind', { vol: 0.4 })); D.at(T.set, () => { audio.play('rock_impact', { vol: 0.4 }); E.shake(0.08); });
  D.at(T.gone - 0.4, () => fsay('grandmaster', st.after, { anchor: () => B.godHead(tmp).add(V(0, 1.2, 0)), wait: false, font: 'head' }));
  D.at(T.step, () => { audio.play('magic_shimmer', { vol: 0.5 }); B.hero.api?.act?.('cheer'); }); D.at(T.stepped, () => B.burst(isB));
  if (nx) D.at(T.card, () => { fnarrate(`${nx.act}. ${nx.title}. ${nx.place}.`, { font: 'head', wait: false }); audio.play('sting_reward', { vol: 0.5 }); });
  D.hold(T.end - 1.5, () => true, 1);
  let finished = false; const finish = () => { if (!finished) { finished = true; D.end(); } }; D.onSkip = () => { fstop(); finish(); };
  D.frame = (t, dt) => {
    B.update(dt, t); if (tt) popTitle(tt, t, T.card, T.end);
    const hv = t > T.hand - 0.5 && t < T.gone + 0.6; B.hand.visible = hv;
    if (t >= T.grip) { const u = ease.io(span(t, T.lift, T.set)); lie.position.lerpVectors(lieFrom, side, u); lie.position.y = Math.max(0.25 * u, Math.sin(u * Math.PI) * 1.6 + 0.12); lie.rotation.z = 1.45 + u * 0.12; }
    if (hv) { const p = lie.position.clone().add(V(0.4, 0.35, 0)); const inK = ease.out(span(t, T.hand - 0.5, T.hand + 0.5)), outK = ease.in(span(t, T.free, T.gone)); p.y += (1 - inK) * 6 + outK * 6; p.z -= (1 - inK) * 2 + outK * 2; const gk = t < T.grip ? 0.25 : t < T.free ? 0.25 + span(t, T.grip, T.grip + 0.3) * 0.75 : 1 - span(t, T.free, T.free + 0.3); B.handAt(p, gk); }
    { const u = ease.io(span(t, T.step, T.stepped)); B.hero.root.position.lerpVectors(isA, isB, u); B.hero.root.position.y = Math.sin(u * Math.PI) * 0.35; }
    if (t < T.step) { pos.set(lieFrom.x * 0.5 + 4.5, 4.2, lieFrom.z + 6.5); look.set(lieFrom.x * 0.6 + 1.5, 0.6, lieFrom.z - 0.5); }
    else if (t < T.card) { const c = B.hero.root.position; pos.set(c.x - 2.2, 1.6, c.z + 3.4); look.set(c.x, 0.7, c.z - 0.6); }
    else { const u = ease.smooth(span(t, T.card, T.end)); pos.set(0.5 - u * 1.0, 3.6 + u * 2.4, 8.5 + u * 2); B.godHead(look).lerp(V(0, 0.5, 0), 0.55); }
    if (!B.rig.m) { B.rig.m = true; B.rig.snap(pos, look, 36); } else B.rig.follow(pos, look, 36, dt, 2.6, 4); B.rig.apply(); if (t >= T.end) finish();
  };
  await D.done; window.__storyBand = false; fstop();
}

/** the finale: the King resigns (his piece tips over), the board falls into the stars, the white pawn is promoted */
export async function playFinale(game, run) {
  let S; await game.swap(async () => { S = new ChessCineScene(game); game.scene = S; S.build('king', run, 'before'); }, { style: 'galaxy' });
  const B = S.B, E = S.engine; const D = (S.D = new Director(E, S.input)); window.__storyBand = true; const tmp = V(), pos = V(), look = V(); const k = B.boss; const k0 = k.position.clone();
  const isA = squareXZ('d7'), isB = squareXZ('e8'); B.hero.root.position.copy(isA);
  const lines = [[1.2, 'grandmaster', 'Check. And mate. In ten thousand years no piece has ever moved itself.'], [5.6, 'grandmaster', 'A pawn that reaches the last rank may become anything at all. What will you become, Isaac Newton?'],
    [10.6, 'newton', 'A natural philosopher, sir. I still have questions.'], [13.8, 'grandmaster', 'Then I shall set up the pieces again. And this time... you play white.']];
  for (const [t, who, text] of lines) D.at(t, () => fsay(who, text, { anchor: who === 'newton' ? B.hero.api || B.hero.root : () => B.godHead(tmp).add(V(0, 1.2, 0)), wait: false, font: 'head' }));
  D.at(0.3, () => fnarrate('The Grandmaster looked at the board for a long time. Then he laid one finger on his King.', { font: 'head', wait: false }));
  D.at(3.0, () => { audio.play('stone_grind', { vol: 0.5 }); }); D.at(4.0, () => { audio.play('rock_impact', { vol: 0.6 }); B.burst(k0); });
  D.at(7.6, () => { audio.play('magic_shimmer', { vol: 0.6 }); audio.play('eureka', { vol: 0.5 }); }); D.at(9.0, () => { E.flash(0.6, 0xfff4d0, 0.8); B.burst(isB); });
  D.at(17.4, () => fnarrate('And far below, in a garden in Lincolnshire, an apple fell. Exactly as it should.', { font: 'head', wait: false })); D.at(21.4, () => E.flash(1, 0xffffff, 1.2));
  // the promotion: a column of rising gold motes over the eighth rank (fine additive points, no solid beam)
  const PN = 420, pp = new Float32Array(PN * 3), pv = new Float32Array(PN); for (let i = 0; i < PN; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.55; pp.set([isB.x + Math.cos(a) * r, Math.random() * 9, isB.z + Math.sin(a) * r], i * 3); pv[i] = 1.2 + Math.random() * 2.4; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); const pillar = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xfff0c0, size: 0.06, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); pillar.userData.noInk = true; B.scene.add(pillar);
  pillar.onBeforeRender = () => { const a = pg.attributes.position; for (let i = 0; i < PN; i++) { let y = a.getY(i) + pv[i] / 60; if (y > 9) y = 0; a.setY(i, y); } a.needsUpdate = true; };
  B.god?.act?.('idle');
  const fall = []; B.tiles.forEach((im) => { for (let i = 0; i < im.count; i++) { const m = new THREE.Matrix4(); im.getMatrixAt(i, m); fall.push({ im, i, m, d: Math.random() * 4 + new THREE.Vector3().setFromMatrixPosition(m).length() * 0.35 }); } });
  let finished = false; const finish = () => { if (!finished) { finished = true; D.end(); } }; D.onSkip = () => { fstop(); finish(); };
  const m4 = new THREE.Matrix4(), p3 = V(), q = new THREE.Quaternion(), s3 = V();
  D.frame = (t, dt) => {
    B.update(dt, t); B.hand.visible = t > 2.0 && t < 4.6; if (B.hand.visible) { const tip = k.position.clone().add(V(0, 1.5, 0)); const inK = ease.out(span(t, 2.0, 2.8)), outK = ease.in(span(t, 3.6, 4.6)); tip.y += (1 - inK) * 5 + outK * 5; tip.z -= (1 - inK) * 2 + outK * 2; B.handAt(tip, 0.12); }
    { const u = ease.in(span(t, 3.0, 4.0)); k.rotation.z = u * 1.5; k.position.set(k0.x + u * 0.5, k0.y + Math.sin(u * Math.PI) * 0.1, k0.z); if (t > 4) k.rotation.y = Math.PI + Math.sin((t - 4) * 3) * 0.2 * Math.exp(-(t - 4) * 1.5); }
    { const u = ease.io(span(t, 7.0, 8.6)); B.hero.root.position.lerpVectors(isA, isB, u); B.hero.root.position.y = Math.sin(u * Math.PI) * 0.4 + span(t, 8.6, 12) * 0.9; }
    pillar.material.opacity = span(t, 8.4, 9.2) * 0.9 * (1 - span(t, 15, 17));
    if (t > 12) for (const f of fall) { const u = Math.max(0, t - 12 - f.d * 0.5); if (u <= 0) continue; f.m.decompose(p3, q, s3); p3.y = -0.08 - u * u * 1.6; m4.compose(p3, q.multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0.3, 0).normalize(), u * 0.8)), s3); f.im.setMatrixAt(f.i, m4); f.im.instanceMatrix.needsUpdate = true; f.m.compose(p3.setY(-0.08), q.setFromRotationMatrix(f.m), s3); }
    if (t < 5) { pos.set(2.6, 1.8, k0.z + 3.8); look.copy(k0).add(V(0, 0.8, 0)); }
    else if (t < 10.4) { const c = B.hero.root.position; pos.set(c.x + 0.8, 1.3 + span(t, 8, 10) * 0.8, c.z + 3.8); look.set(c.x, 0.9 + span(t, 8, 10) * 0.8, c.z); }
    else if (t < 13.6) { const c = B.hero.root.position; pos.set(c.x + 1.2, 1.9, c.z + 3.0); look.set(c.x, 1.5, c.z); }
    else { const u = ease.smooth(span(t, 13.6, 22)); pos.set(0, 5 + u * 8, 9 + u * 6); B.godHead(look).lerp(V(0, 1, 0), 0.4); }
    if (!B.rig.m) { B.rig.m = true; B.rig.snap(pos, look, 36); } else B.rig.follow(pos, look, 36, dt, 2.2, 3.5); B.rig.apply(); if (t >= 22.4) finish();
  };
  await D.done; window.__storyBand = false; fstop();
}

// ================================================================ debug: a run already at a piece's act (main.js ?chess=)
export function debugRunAt(run, piece) {
  const area = { pawn: 'wilderness', knight: 'highlands', bishop: 'highlands', rook: 'olympus', queen: 'board', king: 'board' }[piece] || 'wilderness';
  run.area = area; run.act = AREAS[area].act; run.pos = null; run.path = [];
  run.map = genMap(new RNG((hashString(String(run.seed) + ':' + area) ^ 0x2545f491) >>> 0), area); for (const n of Object.values(run.map.nodes)) nodeEncounter(run, n);
  const id = Object.keys(PIECE_OF).find((k) => PIECE_OF[k] === piece); const g = run.map.nodes.guardian;
  if ((piece === 'knight' || piece === 'bishop') && g) g.enc = { enemies: [id], kind: 'guardian' }; if (piece === 'bishop') (run.flags ||= {}).minor = 'bishop';
  for (const d of ['lens', 'gravity', 'force', 'stone', 'mass', 'heat']) run.deck.push({ uid: 'dbg' + d, id: d, type: 'basic', up: 0 }); run.player.maxHp = run.player.hp = 90; void ENEMIES;
  return run;
}
/** the piece a battle's encounter is (null if none): its boss's chess role */
export function pieceOfEncounter(enc) { if (!enc) return null; for (const id of enc.enemies || []) { const d = ENEMIES[id]; if (d?.chess && !d.minion) return PIECE_OF[id] || null; } return null; }

// ================================================================ battle presentation hooks for the chess foes (BattleScene.fx spreads these)
export function chessFx(S) {
  const pop = (e, text, color = '#ffe08a') => S.popNumber(S.enemyPos(e, 1.05), text, { color, stroke: '#1a0e22', size: 1.1 });
  return {
    async chessMove(e, kind) { // a glimpse of the move: a leap, a beam, a charge, the board's tempo
      const v = S.enemyViews.get(e.uid); if (!v) return;
      if (kind === 'leap') { v.api.act?.('cast'); audio.play('hoof_stomp', { vol: 0.6 }); const r = v.api.root; const y0 = r.position.y; let t = 0; await new Promise((res) => { const u = { update: (dt) => { t += dt; r.position.y = y0 + Math.sin(Math.min(1, t / 0.45) * Math.PI) * 0.8; if (t >= 0.45) { r.position.y = y0; S.engine.remove(u); res(); } } }; S.engine.add(u); }); S.burst(S.enemyPos(e, 0.05), 'smoke', 18); S.engine.shake(0.2); }
      else if (kind === 'beam') { v.api.act?.('cast'); audio.play('magic_shimmer', { vol: 0.6 }); S.burst(S.enemyPos(e, 0.9), 'magic', 22); await new Promise((r) => setTimeout(r, 260)); }
      else if (kind === 'castle' || kind === 'stand' || kind === 'unbind' || kind === 'develop' || kind === 'tempo') { v.api.act?.('cast'); audio.play(kind === 'castle' ? 'stone_grind' : 'magic_sparkle', { vol: 0.6 }); pop(e, { castle: 'CASTLING', stand: 'THE KING STANDS', unbind: 'UNBOUND', develop: 'DEVELOPS', tempo: 'TEMPO' }[kind], '#e8d0ff'); await new Promise((r) => setTimeout(r, 360)); }
      else if (kind === 'mate') { S.engine.flash(0.4, 0x2a0a20, 0.5); audio.play('thunder', { vol: 0.6 }); }
    },
    async promote(e) { const v = S.enemyViews.get(e.uid); v?.api.promote?.(); audio.play('eureka', { vol: 0.5 }); audio.play('magic_shimmer', { vol: 0.7 }); S.burst(S.enemyPos(e, 0.9), 'magic', 30); S.engine.flash(0.25, 0xffe2a0, 0.4); pop(e, 'PROMOTED!', '#ffd36a'); S.refreshEnemy(e); await new Promise((r) => setTimeout(r, 600)); },
    async forked(e, cards) { pop(e, `FORK: ${cards.length} draw${cards.length > 1 ? 's' : ''} knocked away`, '#ffb08a'); audio.play('card_whoosh', { vol: 0.6 }); await new Promise((r) => setTimeout(r, 350)); },
    async check(e) { audio.play('thunder', { vol: 0.7 }); audio.play('monster_growl', { vol: 0.4 }); S.engine.shake(0.3); await S.showBanner?.('CHECK', 'break it before time flows: hurt the King or take a piece', 'dread', 0.9); },
    async checkBroken(e) { audio.play('glass_shatter', { vol: 0.6 }); audio.play('eureka', { vol: 0.5 }); pop(e, 'CHECK BROKEN', '#bfe8a6'); await new Promise((r) => setTimeout(r, 420)); },
  };
}
