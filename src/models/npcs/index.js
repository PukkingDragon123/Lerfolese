// The cast of the Wilderness' curiosities, built lazily per event: Icarus (wax wings), Pythia (veiled, on her bronze
// tripod with vapours), Sisyphus (and his boulder), Pan and his satyrs, the Sphinx, Narcissus at his pool, Prometheus
// (chained to the crag, his eagle on the dead tree), the Kobalos toll-keepers, Archimedes in his bath, Schrodinger's
// cat, and Eris with the golden apple. stageCast(scene, ev) places them on the event's set and returns the actors.
import * as THREE from 'three';
import { humanNPC, wingBones, waxWings, inHand } from './human.js';
import { createSphinx, createEagle, createCat } from './beasts.js';
import { createCreature } from '../creatures.js';
import { asset, K, hex } from '../beasts/kit.js';
import * as P3 from '../props3d.js';

const BUILD = {
  icarus: humanNPC({ id: 'icarus', H: 1.7, bulk: 0.85, hair: 'curls', hairC: '#6a3a1c', skin: '#e8b08a', eye: '#4a7ab0', garment: 'chiton', cloth: '#f2ead8', trim: '#3a6aa0', sash: true,
    extraBones: (rows, H) => wingBones(rows, H), follow: { wing2_L: [12, 0.35], wing2_R: [12, 0.35], wing3_L: [9, 0.3], wing3_R: [9, 0.3] },
    props: (ctx, J, H) => waxWings(ctx, J, H, { span: 1.15 }),
    idle(P, t, st, ctx) { const fly = ['fly', 'fall'].includes(ctx.api.pose); const fl = Math.sin(t * (ctx.api.pose === 'fall' ? 14 : 6.5));
      for (const [s, L] of [[1, '_L'], [-1, '_R']]) { if (fly) { P['wing1' + L] = [0, 0, (0.15 + fl * 0.75) * s]; P['wing2' + L] = [0, 0.1 * s, -fl * 0.3 * s]; } else { P['wing1' + L] = [0, -0.6 * s, -0.25 * s]; P['wing2' + L] = [0, -0.9 * s, 0.1 * s]; P['wing3' + L] = [0, -0.5 * s, 0]; } } } }),
  pythia: humanNPC({ id: 'pythia', H: 1.62, sex: 'f', hair: 'long', hairC: '#1e1418', veil: true, veilC: '#7a5aa8', skin: '#e8b898', eye: '#7a5a3a', garment: 'robe', cloth: '#ece6f2', cloth2: '#7a5aa8', trim: '#c09040', pose: 'sit', wreath: true }),
  sisyphus: humanNPC({ id: 'sisyphus', H: 1.8, bulk: 1.25, hair: 'curls', hairC: '#2a1a12', beard: 'full', skin: '#c08860', eye: '#5a4030', garment: 'loin', cloth: '#9a7a50', pose: 'push', browTilt: 0.25 }),
  narcissus: humanNPC({ id: 'narcissus', H: 1.75, bulk: 0.85, hair: 'curls', hairC: '#e0b850', skin: '#f0c8a8', eye: '#3a8ab0', garment: 'chiton', cloth: '#f8f4ec', trim: '#d8a838', wreath: true, pose: 'kneel', browTilt: -0.1 }),
  prometheus: humanNPC({ id: 'prometheus', H: 2.45, bulk: 1.35, hair: 'long', hairC: '#3a2418', beard: 'long', skin: '#c88a64', eye: '#b06020', garment: 'loin', cloth: '#6a4a3a', pose: 'chained', browTilt: 0.2 }),
  archimedes: humanNPC({ id: 'archimedes', H: 1.66, bulk: 0.95, belly: 0.6, hair: 'bald', hairC: '#e8e6dc', beard: 'long', beardC: '#eceae2', skin: '#e0a888', eye: '#4a6a8a', garment: 'towel', cloth: '#f4f0e8', pose: 'bathe' }),
  eris: humanNPC({ id: 'eris', H: 1.8, sex: 'f', hair: 'wild', hairC: '#1a1020', skin: '#ecd2c4', eye: '#d8a030', lip: '#6a1a3a', garment: 'peplos', cloth: '#3a1a4a', cloth2: '#6a2a5a', trim: '#e0b040', pose: 'offer', browTilt: 0.15,
    props: (ctx, J, H) => { const a = P3.apple({ kind: 'gold' }); a.scale.setScalar(0.16); inHand(ctx, J, H, 'R', a, [0, -0.06, 0.06]); ctx.api.apple = a; },
    hover: (t) => 0.35 + Math.sin(t * 1.4) * 0.08 }),
};
const NAMES = {
  icarus: ['Icarus', 'son of Daedalus, aviator'], pythia: ['Pythia', 'the Oracle of Delphi'], sisyphus: ['Sisyphus', 'king, cheat, eternal intern'], pan: ['Pan', 'god of the wild, bandleader'],
  sphinx: ['The Sphinx', 'examiner of travellers'], narcissus: ['Narcissus', 'in a relationship'], prometheus: ['Prometheus', 'titan, fire salesman'], eagle: ['The Eagle', 'of Zeus, liver connoisseur'],
  toll: ['The Kobaloi', 'toll-keepers of the spoon bridge'], archimedes: ['Archimedes', 'of Syracuse, mid-epiphany'], cat: ['The Cat', 'alive and not'], eris: ['Eris', 'goddess of discord'],
};

// ---- props sculpted on the same pipeline: Pythia's bronze tripod, Prometheus' chains
const bronze = { metal: { s: 'metal', c: hex('#b08a3a') }, default: { s: 'metal', c: hex('#b08a3a') } };
function tripod() {
  const A = asset('prop:tripod', { bones: [['p', null, [0, 0, 0]]], pal: bronze, cell: 0.008, target: 3000, atlas: 256, maxChart: 0.02, wounds: 0, sculpt: (S) => {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; S.limb([Math.sin(a) * 0.32, 0.02, Math.cos(a) * 0.32], [Math.sin(a) * 0.17, 0.78, Math.cos(a) * 0.17], 0.025, 0.02, 'p', { k: 0.01, tag: 'metal' }); S.blob([Math.sin(a) * 0.33, 0.03, Math.cos(a) * 0.33], [0.04, 0.03, 0.04], 'p', { k: 0.01, tag: 'metal' }); }
    S.blob([0, 0.86, 0], [0.3, 0.09, 0.3], 'p', { k: 0.03, tag: 'metal' }); S.blob([0, 0.8, 0], [0.18, 0.08, 0.18], 'p', { k: 0.03, tag: 'metal' });
  } });
  const m = new THREE.Mesh(A.geo, A.mat); m.castShadow = m.receiveShadow = true; return m;
}
function chain(len = 2.2) {
  const A = asset('prop:chain', { bones: [['p', null, [0, 0, 0]]], pal: { metal: { s: 'metal', c: hex('#5a5a62'), rivet: 0.02 }, default: { s: 'metal', c: hex('#5a5a62') } }, cell: 0.006, target: 4000, atlas: 256, maxChart: 0.02, wounds: 0, sculpt: (S) => {
    for (let i = 0; i < 12; i++) { const y = -i * 0.18; const turn = i % 2 ? Math.PI / 2 : 0; for (let k = 0; k < 8; k++) { const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2; const p = (a) => [Math.cos(turn) * Math.sin(a) * 0.05, y + Math.cos(a) * 0.1, Math.sin(turn) * Math.sin(a) * 0.05]; S.limb(p(a0), p(a1), 0.016, 0.016, 'p', { k: 0.004, tag: 'metal' }); } }
  } });
  const m = new THREE.Mesh(A.geo, A.mat); m.castShadow = true; m.scale.setScalar(len / 2.2); return m;
}

/** place the event's characters and their props; returns { actors: {key: api}, extras: [Object3D], names } */
export function stageCast(scene, ev, hAt = () => 0) {
  const actors = {}; const extras = []; const prop = {}; const put = (key, api, x, z, ry = 0, y = null) => { api.root.position.set(x, y ?? hAt(x, z), z); api.root.rotation.y = ry; scene.add(api.root); actors[key] = api; return api; };
  const add = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); extras.push(o); return o; };
  switch (ev.id) {
    case 'tree': { const a = add(P3.apple(), -2.6, 4, 0.9); a.scale.multiplyScalar(0.35); a.visible = false; prop.apple = a; break; }
    case 'icarus': put('icarus', BUILD.icarus(), 0.7, -9.9, 0.3); break;
    case 'oracle': { const t = add(tripod(), 1.3, hAt(1.3, -0.9), -0.9, 0.3); t.scale.setScalar(1.15); put('pythia', BUILD.pythia(), 1.3, -0.9, -0.55, t.position.y + 0.56); break; }
    case 'sisyphus': { put('sisyphus', BUILD.sisyphus(), -0.75, 1.2, Math.PI - 0.25); const b = add(P3.stone({ seed: 12 }), -0.2, hAt(-0.2, 0.4) + 0.42, 0.4); b.scale.multiplyScalar(1.5); prop.boulder = b; break; }
    case 'pan': break; // the satyr band is spawned by the event itself (ev.npc)
    case 'sphinx': { const sp = put('sphinx', createSphinx(), 1.5, 0.9, -1.25); sp.root.scale.setScalar(1.45); break; } // across the road, in front of the gate
    case 'narcissus': put('narcissus', BUILD.narcissus(), 2.0, 1.2, Math.PI + 0.9); break;
    case 'prometheus': { const p = put('prometheus', BUILD.prometheus(), 1.3, -4.0, -0.15); for (const s of [-1, 1]) add(chain(2.0), 1.3 + s * 1.15, hAt(1.3, -4.3) + 4.2, -4.3, 0); put('eagle', createEagle(), 5.4, -4.0, -1.2, hAt(5.6, -4.2) + 2.9); void p; break; }
    case 'archimedes': put('archimedes', BUILD.archimedes(), -0.6, 0.05, 0.4, 0.1); break;
    case 'schrodinger': put('cat', createCat(), 0.5, 0.9, -0.6); break;
    case 'discord': put('eris', BUILD.eris(), 1.6, -1.6, -0.5); break;
    default: break;
  }
  return { actors, extras, names: NAMES, prop };
}
export { NAMES, createCreature, BUILD as __build };
