// PORTRAIT GUARD (phones / tablets held upright): the game is a landscape stage, so in portrait a polished prompt covers
// it: deep night over the frozen frame, fine twinkling stars, a bevelled brass handset that turns from upright to wide
// along a gold arc, and "Turn your device" in cast-gold Alagard with an ink outline (rendered at a whole multiple of the
// font's 16 px grid, so always crisp). It swallows input while shown and fades away the moment the device is turned.
// Shown only on coarse-pointer (touch) devices; a desktop window that is taller than wide simply gets the adaptive camera.
import { audio } from '../core/audio.js';

export function portraitGuard() {
  const touch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 1; if (!touch) return null;
  const cv = document.createElement('canvas'); cv.className = 'lf-rotate';
  Object.assign(cv.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 60, opacity: 0, pointerEvents: 'none', touchAction: 'none', transition: 'opacity .45s ease' });
  document.body.appendChild(cv); const g = cv.getContext('2d');
  const eat = (e) => { if (st.on) { e.preventDefault(); e.stopPropagation(); } };
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'click', 'touchstart', 'touchmove', 'wheel']) cv.addEventListener(ev, eat, { passive: false });
  const st = { on: false, t: 0, last: performance.now(), stars: [] };
  const portrait = () => innerHeight > innerWidth * 1.05;
  const check = () => { const on = portrait(); if (on === st.on) return; st.on = on; cv.style.pointerEvents = on ? 'auto' : 'none'; cv.style.opacity = on ? 1 : 0; if (on) { st.t = 0; audio.play('whoosh_soft', { vol: 0.25 }); } };
  addEventListener('resize', check); addEventListener('orientationchange', () => setTimeout(check, 200)); check();
  const frame = () => {
    requestAnimationFrame(frame); const now = performance.now(), dt = Math.min(0.1, (now - st.last) / 1000); st.last = now; if (!st.on && cv.style.opacity === '0') return; st.t += dt;
    const dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; st.stars = Array.from({ length: Math.round(W * H / 9000) }, (_, i) => [Math.random() * W, Math.random() * H, Math.random(), Math.random()]); }
    draw(g, W, H, dpr, st);
  };
  requestAnimationFrame(frame);
  return { get on() { return st.on; }, check };
}

function draw(g, W, H, dpr, st) {
  const t = st.t; g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  // night over the frozen frame: violet at the edges, a warm glow behind the handset
  const bg = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.5, Math.max(W, H) * 0.75); bg.addColorStop(0, 'rgba(46,30,58,0.93)'); bg.addColorStop(0.55, 'rgba(18,12,30,0.96)'); bg.addColorStop(1, 'rgba(6,4,12,0.985)'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const u = Math.max(1, Math.round(dpr * Math.min(W, H) / dpr / 260)); // one art pixel, in buffer pixels
  for (const s of st.stars) { const tw = 0.45 + 0.55 * Math.sin(t * (0.8 + s[2] * 2.6) + s[2] * 40); g.globalAlpha = Math.max(0, tw) * (0.3 + s[3] * 0.6); g.fillStyle = s[3] > 0.86 ? '#ffe6c0' : '#c8d2ff'; g.fillRect(Math.round(s[0] / u) * u, Math.round(s[1] / u) * u, u, u); } g.globalAlpha = 1;
  // the handset: upright, then a weighted quarter-turn to wide (ease with a small settle), held, and back
  const cyc = (t % 3.6) / 3.6; const turn = cyc < 0.22 ? 0 : cyc < 0.5 ? ease((cyc - 0.22) / 0.28) : cyc < 0.86 ? 1 : 1 - ease((cyc - 0.86) / 0.14);
  const cx = W / 2, cy = H * 0.42, ph = Math.min(W * 0.34, H * 0.22), pw = ph * 0.52, ang = -turn * Math.PI / 2;
  // the gold arc the turn follows, with a chevron head
  const R = ph * 0.86; g.lineWidth = u * 2; g.strokeStyle = 'rgba(232,184,92,0.55)'; g.beginPath(); g.arc(cx, cy, R, -Math.PI * 0.92, -Math.PI * 0.58); g.stroke();
  { const a = -Math.PI * 0.58, hx = cx + Math.cos(a) * R, hy = cy + Math.sin(a) * R; g.fillStyle = 'rgba(255,214,130,0.8)'; g.beginPath(); g.moveTo(hx + u * 6, hy + u * 1); g.lineTo(hx - u * 3, hy - u * 5); g.lineTo(hx - u * 2, hy + u * 6); g.closePath(); g.fill(); }
  g.save(); g.translate(cx, cy); g.rotate(ang);
  const r = u * 6, x0 = -pw / 2, y0 = -ph / 2;
  const body = (o, col) => { rr(g, x0 - o, y0 - o, pw + o * 2, ph + o * 2, r + o); g.fillStyle = col; g.fill(); };
  body(u * 3, '#0a0604'); const br = g.createLinearGradient(x0, y0, x0 + pw, y0 + ph); br.addColorStop(0, '#f2d27a'); br.addColorStop(0.4, '#b8802e'); br.addColorStop(1, '#5a3010'); body(u * 1.5, br); // brass bevel
  body(-u * 1.5, '#1a1020'); // the glass
  const sc = g.createLinearGradient(0, y0, 0, y0 + ph); sc.addColorStop(0, '#2c4a6e'); sc.addColorStop(1, '#6a3a52'); rr(g, x0 + u * 3, y0 + u * 6, pw - u * 6, ph - u * 12, u * 2); g.fillStyle = sc; g.fill();
  // on the glass: a tiny golden apple that stays upright as the world turns
  g.save(); g.rotate(-ang * 0.15); const ar = Math.min(pw, ph) * 0.16; g.fillStyle = '#c8443a'; g.beginPath(); g.moveTo(0, -ar * 0.55); g.bezierCurveTo(ar, -ar * 1.1, ar * 1.2, ar * 0.6, 0, ar * 0.9); g.bezierCurveTo(-ar * 1.2, ar * 0.6, -ar, -ar * 1.1, 0, -ar * 0.55); g.fill();
  g.fillStyle = '#ffd27a'; g.fillRect(Math.round(ar * 0.3), Math.round(-ar * 0.35), u * 2, u * 2); g.fillStyle = '#5a3622'; g.fillRect(-u, Math.round(-ar * 0.95), u * 2, Math.round(ar * 0.45)); g.restore();
  g.fillStyle = 'rgba(255,240,210,0.14)'; g.beginPath(); g.moveTo(x0 + u * 3, y0 + u * 6); g.lineTo(x0 + pw * 0.55, y0 + u * 6); g.lineTo(x0 + u * 3, y0 + ph * 0.45); g.fill(); // a glint on the glass
  g.fillStyle = '#d8a03e'; g.fillRect(-u * 4, y0 + ph - u * 4, u * 8, u); // the home bar
  g.restore();
  // the words: cast gold with an ink outline (Alagard at a whole multiple of 16 px)
  const fpx = Math.max(1, Math.round(Math.min(W / 16, H / 22) / 16)) * 16, f2 = Math.max(16, Math.round(fpx * 0.5 / 16) * 16), o = Math.max(1, Math.round(fpx / 16));
  gold(g, 'Turn your device', W / 2, H * 0.68, fpx, o, t); g.globalAlpha = 0.85; ink(g, 'The experiment needs a wider view', W / 2, H * 0.68 + fpx * 1.05, f2, Math.max(1, Math.round(f2 / 16)), '#d8ccb4'); g.globalAlpha = 1;
}
const ease = (x) => { x = Math.max(0, Math.min(1, x)); const e = 1 - Math.pow(1 - x, 3); return e + Math.sin(x * Math.PI) * 0.06; };
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
function ink(g, s, x, y, px, o, col) { g.font = `${px}px Alagard`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#0a0604'; for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [o, o], [0, o * 2]]) g.fillText(s, x + dx, y + dy); g.fillStyle = col; g.fillText(s, x, y); }
function gold(g, s, x, y, px, o, t) {
  g.font = `${px}px Alagard`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#0a0604'; for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [o, o], [0, o * 2], [o, o * 2], [0, o * 3]]) g.fillText(s, x + dx, y + dy);
  g.fillStyle = '#5a3418'; g.fillText(s, x, y + o * 2); // the extruded side
  const tg = g.createLinearGradient(0, y - px * 0.8, 0, y); tg.addColorStop(0, '#fff6d0'); tg.addColorStop(0.5, '#e0aa48'); tg.addColorStop(1, '#8a5418'); g.fillStyle = tg; g.fillText(s, x, y);
  const w = g.measureText(s).width, sx = x - w / 2 + ((t * 0.35) % 1.6 - 0.3) * w; // a slow shimmer crossing the letters
  const sh = g.createLinearGradient(sx - px, 0, sx + px, 0); sh.addColorStop(0, 'rgba(255,250,230,0)'); sh.addColorStop(0.5, 'rgba(255,250,230,0.6)'); sh.addColorStop(1, 'rgba(255,250,230,0)'); g.fillStyle = sh; g.fillText(s, x, y); // (the glint is the letters filled again with a moving band)
}
