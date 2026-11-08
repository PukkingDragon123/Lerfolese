// Hand-authored pixel sprites (string grids) for particles, intent icons and UI glyphs.
import { gridSprite, PixelCanvas } from './pixel.js';
import { INK } from './palette.js';

const P = { k: INK, w: '#fbf4de', W: '#ffffff', y: '#f2c14e', Y: '#ffe08a', o: '#f08a2a', r: '#c8443a', R: '#8f2a2e', p: '#f6b3a0', b: '#6fb7d6', B: '#3f7fa8', g: '#9cb84a', G: '#5f8a3a', v: '#b48cff', c: '#8fe3ff', s: '#c4bdb6', S: '#736c74', n: '#8a5634', N: '#5a3622', m: '#e8d4a2', l: '#e0a83a', u: '#6b4c9a', t: '#4fa79a' };

export const SPR = {
  sword: ['.......kk', '......kwk', '.....kwsk', '....kwsk.', 'k..kwsk..', 'kk.wsk...', '.kkSk....', '.knkk....', 'knk.kk...'],
  shield: ['.kkkkkkk.', 'kywwywwyk', 'kyywywyyk', 'kyyyyyyyk', 'kylyyylyk', '.kylyylk.', '.kyylyyk.', '..kyyyk..', '...kkk...'],
  eye: ['..kkkkk..', '.kwwwwwk.', 'kwwgGgwwk', 'kwgGkGgwk', 'kwwgGgwwk', '.kwwwwwk.', '..kkkkk..'],
  up: ['...k...', '..kgk..', '.kgggk.', 'kgggggk', '..kgk..', '..kgk..', '..kkk..'],
  down: ['..kkk..', '..kuk..', '..kuk..', 'kuuuuuk', '.kuuuk.', '..kuk..', '...k...'],
  skull: ['.kkkkk.', 'kwwwwwk', 'kwkwkwk', 'kwkwkwk', 'kwwkwwk', '.kwwwk.', '.kwkwk.', '..kkk..'],
  question: ['.kkkk.', 'kyyyyk', 'kk..yk', '...kyk', '..kyk.', '..kk..', '..kyk.', '..kk..'],
  zzz: ['kkkk....', '..k.....', '.k..kkk.', 'kkkk..k.', '....k...', '....kkk.'],
  heart: ['.kk.kk.', 'krrkrrk', 'krprrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
  coin: ['.kkkk.', 'kyYYyk', 'kYylyk', 'kYylyk', 'kyllyk', '.kkkk.'],
  hand: ['..kk....', '.kmmk...', '.kmmk...', '.kmmkkk.', '.kmmmmmk', 'kkmmmmmk', 'kmmmmmmk', '.kmmmmk.', '..kkkk..'],
  steal: ['..kkkk..', '.knnnnk.', 'knnkknnk', 'knnnnnnk', 'knnnnnnk', '.knnnnk.', '..kkkk..'],
  // particles
  spark: ['..W..', '..W..', 'WWWWW', '..W..', '..W..'],
  spark2: ['.c.', 'cWc', '.c.'],
  dot: ['WW', 'WW'],
  ember: ['.y.', 'yWy', '.o.'],
  star4: ['...W...', '...W...', '..WWW..', 'WWWWWWW', '..WWW..', '...W...', '...W...'],
  leaf: ['...gg', '..ggG', '.ggG.', 'gGG..', 'G....'],
  petal: ['.pp', 'ppW', 'pp.'],
  drop: ['.b.', 'bBb', 'bWb', '.b.'],
  smoke: ['.sss.', 'sssss', 'sSsss', 'ssSss', '.sss.'],
  chip: ['nN', 'Nn'],
  stonechip: ['sS.', 'SSs', '.S.'],
  applebit: ['r.', 'pr'],
  firefly: ['.Y.', 'YWY', '.Y.'],
  note: ['..kk', '..kk', '..k.', '..k.', 'kkk.', 'kkk.'],
  bubble: ['.bb.', 'b..b', 'b.Wb', '.bb.'],
  wine: ['.R.', 'RrR', '.R.'],
};

const cache = new Map();
export function sprite(name) {
  if (!cache.has(name)) cache.set(name, gridSprite(SPR[name], P));
  return cache.get(name);
}

// Particle atlas: 8x8 grid of 16px cells containing white-ish sprites (tinted per particle)
export const ATLAS_NAMES = ['spark', 'spark2', 'dot', 'ember', 'star4', 'leaf', 'petal', 'drop', 'smoke', 'chip', 'stonechip', 'applebit', 'firefly', 'note', 'bubble', 'wine', 'heart', 'coin', 'skull'];
export function buildAtlas() {
  const cell = 16, n = 8; const pc = new PixelCanvas(cell * n, cell * n);
  ATLAS_NAMES.forEach((name, i) => {
    const s = sprite(name); const cx = (i % n) * cell + Math.floor((cell - s.w) / 2), cy = Math.floor(i / n) * cell + Math.floor((cell - s.h) / 2);
    pc.blit(s, cx, cy);
  });
  return { pc, cell, n, index: (name) => Math.max(0, ATLAS_NAMES.indexOf(name)) };
}
