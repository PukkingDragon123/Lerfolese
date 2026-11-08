// Hand-built pixel art for every physical object that is not a card or a character.
// Each drawing is painted with the art toolkit in src/gfx/art/ (hue-shifted material ramps, one top-left key light,
// cast shadows, sel-out outlines, hand-placed highlights) at native resolution and shown with nearest filtering.
// API: drawn(name, ...args) -> PixelCanvas (cached). Transparent backgrounds; grounded objects touch the bottom edge.
import * as props from './art/props.js';
import * as field from './art/field.js';
import * as map from './art/map.js';
import * as items from './art/items.js';
import { paintBeast } from './art/beasts.js';
import { PixelCanvas } from './pixel.js';

const DRAW = {
  // ---------------------------------------------------------------- UI objects
  gauge: () => props.gauge(),
  needle: () => props.needle(),
  bell: (frame = 0) => props.bell(frame),
  basket: () => props.basket(),
  pouch: () => props.pouch(),
  sign: (w = 160, h = 44, seed = 1, tint = null) => props.sign(w, h, seed, tint),
  token: () => props.token(),

  // ---------------------------------------------------------------- map standees (HD-2D diorama pieces)
  mk_battle: () => map.mk_battle(),
  mk_elite: () => map.mk_elite(),
  mk_event: () => map.mk_event(),
  mk_shop: () => map.mk_shop(),
  mk_lab: () => map.mk_lab(),
  mk_guardian: () => map.mk_guardian(),

  // ---------------------------------------------------------------- battlefield objects
  sheep: (frame = 0) => cropped(paintBeast('sheep', ['walk0', 'walk1', 'walk2', 'graze0'][frame % 4] || 'idle')),
  boulder: () => field.boulder(),
  puddle: (kind = 'water') => field.puddle(kind),
  wine_puddle: () => field.winePuddle(),
  firepit: () => field.firepit(),
  campfire: (frame = 0) => field.campfire(frame),
  coil: (frame = 0) => field.coil(frame),
  sapling: (grown = false) => field.sapling(!!grown && grown !== 'false'),
  well: (frame = 0) => field.well(frame),
  steam: (frame = 0) => field.steam(frame),
  rain_cloud: (frame = 0) => field.rainCloud(frame),
  moon: () => field.moon(),
  catapult: (loaded = false) => field.catapult(!!loaded && loaded !== 'false'),
  burning_glass: () => field.burningGlass(),
  whirl: (frame = 0) => field.whirl(frame),
};
// curio icons: item_<id> (64x64), plus the main-menu hero sprites
for (const id of items.ITEM_IDS) DRAW['item_' + id] = () => items.itemIcon(id);
DRAW.crate = (frame = 0) => items.crate(+frame || 0);
DRAW.newton_apple = () => items.newtonApple();
// crop a sprite to its opaque bounds (+1px margin), keeping the bottom row as the ground line
function cropped(pc) {
  let x0 = pc.w, y0 = pc.h, x1 = -1, y1 = -1;
  for (let y = 0; y < pc.h; y++) for (let x = 0; x < pc.w; x++) if (pc.alpha(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) return pc; const out = new PixelCanvas(x1 - x0 + 3, y1 - y0 + 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.data[(y - y0 + 1) * out.w + (x - x0 + 1)] = pc.data[y * pc.w + x];
  return out;
}

// argument variants worth previewing (used by tools/art-sheet.html)
export const DRAWN_FRAMES = {
  bell: [[0], [1]], sign: [[160, 44, 1, null], [110, 34, 3, 'red'], [110, 34, 5, 'teal'], [96, 26, 7, 'purple']],
  sheep: [[0], [1], [2], [3]], puddle: [['water'], ['wine']], campfire: [[0], [1], [2], [3]], coil: [[0], [1], [2]], sapling: [[false], [true]],
  well: [[0], [1], [2], [3]], steam: [[0], [1], [2], [3]], rain_cloud: [[0], [1], [2], [3]], catapult: [[false], [true]], whirl: [[0], [1], [2], [3]],
  crate: [[0], [1]],
};

const cache = new Map();
export function drawn(name, ...args) {
  const k = name + ':' + args.join(','); if (cache.has(k)) return cache.get(k);
  const fn = DRAW[name]; if (!fn) throw new Error('drawn: unknown drawing ' + name);
  const pc = fn(...args); cache.set(k, pc); return pc;
}
export const DRAWN_NAMES = Object.keys(DRAW);
