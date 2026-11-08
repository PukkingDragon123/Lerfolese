// Hand-built pixel art for every physical object that is not a card or a character.
// Each drawing is painted with the art toolkit in src/gfx/art/ (hue-shifted material ramps, one top-left key light,
// cast shadows, sel-out outlines, hand-placed highlights) at native resolution and shown with nearest filtering.
// API: drawn(name, ...args) -> PixelCanvas (cached). Transparent backgrounds; grounded objects touch the bottom edge.
import * as props from './art/props.js';

const DRAW = {
  // ---------------------------------------------------------------- UI objects
  gauge: () => props.gauge(),
  needle: () => props.needle(),
  bell: (frame = 0) => props.bell(frame),
  basket: () => props.basket(),
  pouch: () => props.pouch(),
  sign: (w = 160, h = 44, seed = 1, tint = null) => props.sign(w, h, seed, tint),
  token: () => props.token(),
};

// argument variants worth previewing (used by tools/art-sheet.html)
export const DRAWN_FRAMES = {
  bell: [[0], [1]], sign: [[160, 44, 1, null], [110, 34, 3, 'red'], [110, 34, 5, 'teal'], [96, 26, 7, 'purple']],
};

const cache = new Map();
export function drawn(name, ...args) {
  const k = name + ':' + args.join(','); if (cache.has(k)) return cache.get(k);
  const fn = DRAW[name]; if (!fn) throw new Error('drawn: unknown drawing ' + name);
  const pc = fn(...args); cache.set(k, pc); return pc;
}
export const DRAWN_NAMES = Object.keys(DRAW);
