// Memory vignettes: tiny living pixel-art scenes shown inside the Hall's memory shards (64 x 96 art pixels, three
// parallax layers). Each memory has its own sky ramp, horizon, a hand-pixelled subject (Hydra, Icarus, the raccoon,
// the Bookworm Queen ...) and its own drifting particles; the shard's shader slides the layers against each other
// (whole art pixels only), bobs the subject, and swirls the particles, so it reads as a glimpse of a living moment.
//   const L = vignette('hydra'); // { bg, mid, fg } CanvasTextures (nearest), plus L.tint (rim colour of the shard)
import * as THREE from 'three';
import { mulberry32 } from '../core/util.js';

export const VW = 64, VH = 96;
// subjects: '.' empty, 'k' outline, 'a' dark body, 'b' mid body, 'c' lit body, 'w' highlight, 'e' eye / glow, 'x' accent
const SUB = {
  hydra: ['..kk.......kk.......kk..', '.kcbk.....kcbk.....kcbk.', '.kbek.....kbek.....kbek.', '..kbk......kbk.....kbk..', '...kbk.....kbk....kbk...', '....kbk....kbk...kbk....', '.....kbk...kbk..kbk.....', '......kbk..kbk.kbk......', '.......kbkkkbkkbk.......', '........kbbbbbbk........', '.......kbbbcbbbbk.......', '......kbbbccbbbbbk......', '.....kbbbbbbbbbbbbk.....', '....kabbbbbbbbbbbbak....', '...kaabbbbbbbbbbbbaak...', '..kaaak.kaak..kaak.kaak.'],
  icarus: ['kk..........kk', 'kwk........kwk', 'kcwk..kk..kwck', 'kccwkkcck.kwcck', '.kccwkbbkkwcck.', '..kcckbbbkccck.', '...kkkbbbkkk...', '......kbk......', '.....kbabk.....', '.....kb.bk.....', '....kb...bk....', '....kk...kk....'],
  raccoon: ['..kk......kk..', '.kbbk....kbbk.', '.kbbbkkkkbbbk.', 'kbbbbbbbbbbbbk', 'kbkkkbbbbkkkbk', 'kkwekkbbkkwekk', '.kkkkbbbbkkkk.', '..kbbbkkbbbk..', '..kbbbbbbbbk..', '.kbbbbbbbbbbk.', 'kbbcbbbbbbcbbk', 'kbbbbbbbbbbbbk', '.kkbbk..kbbkk.', '..kkk....kkk..'],
  bookworm: ['....kxxk......', '...kxwxxk.....', '....kkkk......', '...kbbbbk.....', '..kbebebk.....', '..kbbbbbk.....', '...kbbbk......', '..kbbbbbk.....', '.kbbbkkbbk....', '.kbbk..kbbk...', 'kwwwwwwwwwwwwk', 'kcccccckcccccck', 'kaaaaaakaaaaaak', 'kkkkkkkkkkkkkkk'],
  frog: ['.....kk.....', '....kxxk....', '...kxwxxk...', '..kxxxxxxk..', '.kkkkkkkkkk.', 'kccekkkkecck', 'kbbbbbbbbbbk', 'kbkkkkkkkkbk', 'kbbbbbbbbbbk', '.kbbccccbbk.', 'kbbk....kbbk', 'kkk......kkk'],
  minotaur: ['kk..........kk', 'kwk........kwk', '.kck......kck.', '..kckkkkkkck..', '...kbbbbbbk...', '...kbebbebk...', '...kbbbbbbk...', '....kbccbk....', '...kkbbbbkk...', '.kkbbbbbbbbkk.', 'kbbbbbbbbbbbbk', 'kbk.kbbbbk.kbk', 'kk..kbbbbk..kk', '....kbkkbk....', '....kbk.kbk...', '....kkk.kkk...'],
  medusa: ['.k.k..k..k.k.', 'kxkxkkxkkxkxk', '.kxkxxxxxkxk.', 'kxxkbbbbbkxxk', '.kxbbbbbbbxk.', '..kbebbbebk..', '..kbbbbbbbk..', '...kbcccbk...', '....kbbbk....', '...kbbbbbk...', '..kbbbbbbbk..', '.kbbbbbbbbbk.'],
  satyr: ['.k......k.', 'kwk....kwk', '.kck..kck.', '..kbbbbk..', '..kbebek..', '..kbbbbk..', '.kkbccbkxk', 'kbbbbbbkxk', 'kbkbbbbkxk', '..kbbbbk..', '..kak.kak.', '.kak...kak', '.kk.....kk'],
  kobalos: ['...kkkk...', '..kbbbbk..', '.kbebbebk.', 'kbbbbbbbbk', '.kbkkkkbk.', '..kbbbbk..', '.kbbbbbbk.', 'kbkbbbbkbk', 'xk.kbbk.kx', 'x..kk.kk..'],
  tree: ['....kkkkk....', '..kkcccbbkk..', '.kcccbbbbbbk.', 'kccxbbbbxbbbk', 'kcbbbbbbbbbak', 'kbbbxbbbbbaak', '.kbbbbbbaxak.', '..kkaaaaaakk.', '....kkbkk....', '.....kbk.....', '.....kbk.....', '....kbbbk....'],
  wreath: ['....kckkck....', '..kck....kck..', '.kck......kck.', 'kck...ee...kck', 'kbk..eeee..kbk', 'kck..eeee..kck', 'kbk...ee...kbk', '.kck......kck.', '..kck....kck..', '...kbk..kbk...', '....kk.xkk....'],
  flask: ['....kk....', '....kwk...', '....kk....', '...kbbk...', '...kbbk...', '..kbbbbk..', '.kbeeeebk.', 'kbeeceeebk', 'keeeeeceek', 'keeceeeeek', '.kkkkkkkk.'],
  comet: ['...........kk', '.........kwek', '.......kwwek.', '.....kccwek..', '...kbbcck....', '.kabbk.......', 'kaak.........', 'kk...........'],
  shelf: ['kkkkkkkkkkkkkk', 'k.xx.kek.xxx.k', 'k.xx.kek.xwx.k', 'kkkkkkkkkkkkkk', 'k.ee..kxk.ee.k', 'k.ee..kxk.eek.', 'kkkkkkkkkkkkkk', 'k.kbbk..xx..k.', 'k.kbbk..xx..k.', 'kkkkkkkkkkkkkk'],
  loop: ['....kkkkk....', '..kkbbbbbkk..', '.kbbkkkkkbek.', 'kbbk.....kkk.', 'kbk..........', 'kbk......kk..', 'kbk.....kbbk.', 'kbbk...kbbk..', '.kbbkkkbbk...', '..kkbbbkk....', '....kkk......'],
  eyes: ['.kk...kk...kk.', 'kek..kek..kek.', '.kk...kk...kk.', '...kk...kk....', '..kek..kek....', '...kk...kk....', '.kk...kk...kk.', 'kek..kek..kek.', '.kk...kk...kk.'],
  road: ['......kk......', '.....kbbk.....', '.....kbbk.....', '....kbbbbk....', '....kbbbbk....', '...kbbbbbbk...', '...kbbccbbk...', '..kbbbccbbbk..', '..kbbbccbbbk..', '.kbbbbccbbbbk.', 'kbbbbbccbbbbbk'],
};
// scenes: sky ramp (top -> horizon), land colour, subject + its palette, particles, where the subject sits
const S = {
  garden: { sky: ['#0e1430', '#2a2c5a', '#6a4a7a', '#c8708a'], land: '#1e2a1a', sub: 'tree', pal: { k: '#0a0a0a', a: '#24401c', b: '#3a6a2a', c: '#6aa040', w: '#c8e070', x: '#d83a2a', e: '#ff8a5a' }, fx: 'fall', sy: 0.42, tint: '#e86a4a' },
  laurels: { sky: ['#2a1a40', '#7a3a5a', '#e0805a', '#ffd08a'], land: '#3a2a1e', sub: 'wreath', pal: { k: '#2a1a0a', b: '#6a8a2a', c: '#a0c040', e: '#ffe08a', x: '#ffd040' }, fx: 'sparks', sy: 0.38, tint: '#ffd060' },
  satyr: { sky: ['#101a2a', '#1e3a3a', '#3a6a4a', '#8ab070'], land: '#1a2614', sub: 'satyr', pal: { k: '#0a0806', a: '#3a2416', b: '#6a4a2e', c: '#b08a5a', w: '#e0d0b0', e: '#ffd040', x: '#c8a040' }, fx: 'notes', sy: 0.5, tint: '#a0d070' },
  kobalos: { sky: ['#0a0a14', '#1a1a2e', '#2e2a40', '#5a4a5a'], land: '#16121a', sub: 'kobalos', pal: { k: '#060406', b: '#4a6a3a', c: '#7aa050', e: '#ffe040', x: '#c8c8d0' }, fx: 'dust', sy: 0.56, tint: '#90c060' },
  medusa: { sky: ['#06120e', '#0e2a20', '#1e4a34', '#4a7a5a'], land: '#141e18', sub: 'medusa', pal: { k: '#040806', b: '#4a7a5a', c: '#8ab088', e: '#ff3a3a', x: '#3a8a3a' }, fx: 'stone', sy: 0.46, tint: '#60e0a0' },
  minotaur: { sky: ['#140a08', '#3a1a10', '#7a3418', '#c8601e'], land: '#24160e', sub: 'minotaur', pal: { k: '#080404', b: '#5a3020', c: '#8a5030', w: '#e8dcc0', e: '#ff4020' }, fx: 'dust', sy: 0.5, tint: '#ff7a3a' },
  hydra: { sky: ['#06100e', '#0e2420', '#1e4038', '#4a6a50'], land: '#0e1a14', sub: 'hydra', pal: { k: '#040806', a: '#1e4030', b: '#2e6a4a', c: '#5aa070', e: '#ffd030' }, fx: 'rain', sy: 0.48, tint: '#40d0a0' },
  alchemy: { sky: ['#0e0a1e', '#1e1440', '#3a2468', '#6a3a8a'], land: '#140e20', sub: 'flask', pal: { k: '#08060c', b: '#3a2a50', c: '#8a6ab0', w: '#ffffff', e: '#5ae0c0' }, fx: 'bubbles', sy: 0.54, tint: '#9a7aff' },
  impact: { sky: ['#06040e', '#140a24', '#2a1238', '#5a1e3a'], land: '#120a10', sub: 'comet', pal: { k: '#0a0404', a: '#5a1a10', b: '#a83a1a', c: '#ff8a2a', w: '#fff0c0', e: '#ffffff' }, fx: 'sparks', sy: 0.34, tint: '#ff6a2a' },
  cabinet: { sky: ['#140c08', '#2a1a10', '#3e2818', '#5a3a20'], land: '#1a120a', sub: 'shelf', pal: { k: '#0a0604', b: '#6a4a2a', x: '#c8a040', w: '#fff0c0', e: '#5ab0e0' }, fx: 'dust', sy: 0.5, tint: '#e0a040' },
  road: { sky: ['#1a1030', '#5a2a4a', '#c86a5a', '#ffc080'], land: '#2a1e1a', sub: 'road', pal: { k: '#1a1410', b: '#5a4a3a', c: '#c8a070' }, fx: 'birds', sy: 0.74, tint: '#ffb070' },
  loop: { sky: ['#04040a', '#0a0a1e', '#1a1440', '#2e1e5a'], land: '#0a0814', sub: 'loop', pal: { k: '#020204', b: '#c8302c', e: '#ffd040' }, fx: 'stars', sy: 0.46, tint: '#d04a4a' },
  bestiary: { sky: ['#06040a', '#0e0a14', '#1a1220', '#2a1a2a'], land: '#0a060a', sub: 'eyes', pal: { k: '#020102', e: '#ffd040' }, fx: 'dust', sy: 0.46, tint: '#ffc040' },
  icarus: { sky: ['#1a3a7a', '#3a6ab0', '#8ab0d8', '#ffe8b0'], land: '#2a4a7a', sub: 'icarus', pal: { k: '#1a1a2a', a: '#5a3a2a', b: '#a87a5a', c: '#e8dcc0', w: '#ffffff' }, fx: 'feathers', sy: 0.34, tint: '#ffe0a0', sun: true, sea: true },
  bookworm: { sky: ['#0e0a06', '#22160c', '#3a2614', '#5a3a1e'], land: '#1a120a', sub: 'bookworm', pal: { k: '#0a0604', a: '#3a1a0a', b: '#c87a8a', c: '#e8dcc0', w: '#fff6e0', e: '#2a0a0a', x: '#ffd040' }, fx: 'pages', sy: 0.5, tint: '#ffb060' },
  frog: { sky: ['#06100a', '#0e2414', '#1e3a20', '#3a5a2e'], land: '#0e1a0c', sub: 'frog', pal: { k: '#040604', b: '#3a7a2a', c: '#7ab04a', e: '#ffd030', x: '#4a2a8a', w: '#c8a0ff' }, fx: 'fireflies', sy: 0.52, tint: '#a0ff70' },
  raccoon: { sky: ['#0a0c1a', '#141a30', '#22284a', '#3a3a5a'], land: '#12141a', sub: 'raccoon', pal: { k: '#060608', b: '#6a6a74', c: '#a8a8b0', w: '#ffffff', e: '#ffd040' }, fx: 'leaves', sy: 0.52, tint: '#b0b8d0' },
};
export const VIGNETTE_KEYS = Object.keys(S);
/** the hand-pixelled subject of a memory (rows of chars, '.' empty, 'k' its outline) and its tint: the Stars hall draws its constellation from it */
export function vignetteSubject(key) { const D = S[key] || S.road; return { rows: SUB[D.sub], tint: D.tint, pal: D.pal }; }

const canvas = () => { const c = document.createElement('canvas'); c.width = VW; c.height = VH; return c; };
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function vignette(key) {
  const D = S[key] || S.road; const r = mulberry32(key.length * 97 + key.charCodeAt(0));
  // bg: dithered sky ramp, a sun or moon, far ridges
  const bg = canvas(); { const g = bg.getContext('2d'); const hz = Math.round(VH * 0.62);
    for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) { const u = Math.min(1, y / hz) * (D.sky.length - 1); const i = Math.floor(u), f = u - i; const th = (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16; g.fillStyle = D.sky[Math.min(D.sky.length - 1, i + (f > th ? 1 : 0))]; g.fillRect(x, y, 1, 1); }
    const sx = 18 + Math.floor(r() * 28), sy = D.sun ? 16 : 20 + Math.floor(r() * 18); const sr = D.sun ? 9 : 5; for (let y = -sr; y <= sr; y++) for (let x = -sr; x <= sr; x++) { const d = Math.hypot(x, y); if (d > sr) continue; g.fillStyle = d > sr - 1.2 ? D.sky[D.sky.length - 1] : '#fff4d8'; g.fillRect(sx + x, sy + y, 1, 1); }
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(Math.floor(r() * VW), Math.floor(r() * hz * 0.6), 1, 1); }
    let h = hz - 6; for (let x = 0; x < VW; x++) { h += Math.round((r() - 0.5) * 2.4); h = Math.max(hz - 14, Math.min(hz - 2, h)); g.fillStyle = D.sea ? '#3a5a9a' : mixHex(D.land, D.sky[D.sky.length - 1], 0.45); g.fillRect(x, h, 1, VH - h); }
    if (D.sea) for (let y = hz; y < VH; y += 3) for (let x = (y * 7) % 5; x < VW; x += 6) { g.fillStyle = '#8ab0e0'; g.fillRect(x, y, 2, 1); } }
  // mid: the subject on its ground
  const mid = canvas(); { const g = mid.getContext('2d'); const m = SUB[D.sub]; const sc = m[0].length > 18 ? 2 : 3; const W = m[0].length * sc, H = m.length * sc; const x0 = Math.round((VW - W) / 2), y0 = Math.round(VH * D.sy - H / 2);
    if (!D.sea) { g.fillStyle = D.land; g.fillRect(0, Math.round(VH * 0.66), VW, VH); for (let x = 0; x < VW; x += 1) if (r() < 0.4) { g.fillStyle = mixHex(D.land, '#ffffff', 0.08); g.fillRect(x, Math.round(VH * 0.66) + Math.floor(r() * 3), 1, 1); } }
    m.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.') continue; g.fillStyle = D.pal[ch] || D.pal.b || '#888'; g.fillRect(x0 + x * sc, y0 + y * sc, sc, sc); } }); }
  // fg: particles in the air (a 2-row strip the shader scrolls) and a dark vignette frame
  const fg = canvas(); { const g = fg.getContext('2d'); const P = { fall: ['#d83a2a', 1], sparks: ['#ffd070', 1], notes: ['#ffe8a0', 2], dust: ['#a89880', 1], stone: ['#c8c8c0', 1], rain: ['#8ab0c0', 3], bubbles: ['#8affe0', 2], birds: ['#1a1018', 2], stars: ['#fff4d0', 1], feathers: ['#ffffff', 2], pages: ['#f0e6d0', 2], fireflies: ['#e2ff8a', 1], leaves: ['#c8803a', 2] }[D.fx] || ['#ffffff', 1];
    for (let i = 0; i < 34; i++) { const x = Math.floor(r() * VW), y = Math.floor(r() * VH * 0.85); g.fillStyle = P[0]; if (P[1] === 3) g.fillRect(x, y, 1, 3); else if (P[1] === 2) { g.fillRect(x, y, 2, 1); g.fillRect(x + (D.fx === 'birds' ? 2 : 0), y - (D.fx === 'birds' ? 1 : 0), 1, 1); } else g.fillRect(x, y, 1, 1); }
 }
  return { bg: tex(bg), mid: tex(mid), fg: tex(fg), tint: new THREE.Color(D.tint), fx: D.fx };
}
function mixHex(a, b, t) { const A = new THREE.Color(a), B = new THREE.Color(b); return '#' + A.lerp(B, t).getHexString(); }

/** the shard window shader: parallax layers in whole art pixels, the subject breathing, particles drifting by kind */
export function vignetteMaterial(L) {
  return new THREE.ShaderMaterial({
    uniforms: { uBg: { value: L.bg }, uMid: { value: L.mid }, uFg: { value: L.fg }, uTime: { value: Math.random() * 10 }, uHover: { value: 0 }, uLit: { value: 0 }, uPar: { value: new THREE.Vector2() }, uTint: { value: L.tint }, uDrift: { value: new THREE.Vector2(L.fx === 'rain' || L.fx === 'fall' || L.fx === 'pages' || L.fx === 'leaves' ? 0.2 : 0.05, L.fx === 'rain' ? 1.4 : L.fx === 'fall' || L.fx === 'leaves' || L.fx === 'pages' || L.fx === 'feathers' ? 0.35 : L.fx === 'bubbles' || L.fx === 'sparks' || L.fx === 'notes' ? -0.3 : 0.06) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D uBg, uMid, uFg; uniform float uTime, uHover, uLit; uniform vec2 uPar, uDrift; uniform vec3 uTint; varying vec2 vUv;
      vec2 snap(vec2 o){ return floor(o * vec2(${VW}.0, ${VH}.0) + 0.5) / vec2(${VW}.0, ${VH}.0); }
      void main(){ float sp = 0.35 + uHover * 1.4;
        vec2 uv = vUv; vec3 c = texture2D(uBg, uv + snap(vec2(uPar.x * 0.02 + uTime * 0.004 * sp, 0.0))).rgb;
        vec2 mo = snap(vec2(uPar.x * 0.06 + sin(uTime * 0.7 * sp) * 0.012, sin(uTime * 1.3 * sp) * 0.012 * (0.4 + uHover)));
        vec4 m = texture2D(uMid, clamp(uv + mo, 0.0, 1.0)); c = mix(c, m.rgb, m.a);
        vec4 f = texture2D(uFg, uv + snap(vec2(uPar.x * 0.1 + uTime * uDrift.x * 0.05 * sp, uTime * uDrift.y * 0.05 * sp))); vec4 fr = texture2D(uFg, uv);
        c = mix(c, f.rgb, step(0.5, f.a));
        vec2 P = floor(vUv * vec2(${VW}.0, ${VH}.0)); float d = min(min(P.x, ${VW - 1}.0 - P.x), min(P.y, ${VH - 1}.0 - P.y)); vec2 q = mod(P, 4.0); float th = fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); if (d < 3.0 && th > d / 3.0) c = vec3(0.02, 0.012, 0.04); // a dithered dark rim
        float g = dot(c, vec3(0.3, 0.59, 0.11)); vec3 locked = vec3(g) * vec3(0.42, 0.46, 0.7) * 0.5;
        c = mix(locked, c, uLit); c *= 0.75 + 0.5 * uHover; c += uTint * pow(1.0 - min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)) * 2.0, 6.0) * (0.15 + 0.5 * uHover) * (0.3 + 0.7 * uLit);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
