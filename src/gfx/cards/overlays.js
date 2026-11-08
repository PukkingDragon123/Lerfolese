// Move composites.
import { apple } from './subjects.js';
export function moveArt(move, compose) { return compose(move.special ? 'special' : 'move', apple(), 1); }
export function backArt(compose) { return compose('special', apple({ R: undefined }), 9); }
