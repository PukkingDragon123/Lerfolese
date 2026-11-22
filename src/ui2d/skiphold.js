// HOLD-TO-SKIP: one shared, consistent skip for every cinematic (the prologue, the Grandmaster's chess cinematics,
// event cutscenes, the battle intro, the reconstruction). Hold Space / Esc / Enter, or press and hold anywhere on the
// screen (tap-and-hold on touch), for 0.8 s. A small indicator sits in the bottom-right corner: "Hold to skip" in
// high-res Alagard cast gold (bevel light, ink outline) over a fine gold FUSE that burns along under the words while you
// hold, a four-point spark riding its head and a few embers falling off; letting go lets it cool back. It shows for a
// moment when a cinematic starts and whenever you touch a key or the screen, then it fades to a faint mark.
//   const S = holdToSkip(() => director.skip(), { anywhere: true });  ...  S.dispose();
//   anywhere: false -> only a hold on the indicator itself counts (scenes with their own pointer play, e.g. the
//   prologue's tutorial); keys always count. Nested cinematics stack: only the newest one listens and shows.
//   ?q=test: a single tap skips (the headless test recipes press keys, they do not hold them). window.__skip() fires it.
import { audio } from '../core/audio.js';

const stack = [];
const TEST = typeof location !== 'undefined' && /[?&]q=test\b/.test(location.search);
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function holdToSkip(onSkip, { hold = 0.8, anywhere = true, label = 'Hold to skip', keys = ['Space', 'Escape', 'Enter'] } = {}) {
  const H = { t: 0, keys: new Set(), ptr: null, fired: false, dead: false, poke: 2.6, vis: 0, embers: [], last: performance.now() };
  const cv = document.createElement('canvas'); cv.className = 'lf-skip';
  Object.assign(cv.style, { position: 'fixed', right: 'calc(14px + env(safe-area-inset-right, 0px))', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', zIndex: 40, pointerEvents: anywhere ? 'none' : 'auto', touchAction: 'none', opacity: 0, cursor: 'pointer' });
  document.body.appendChild(cv); const g = cv.getContext('2d');
  const top = () => stack[stack.length - 1] === H;
  const fire = () => { if (H.fired || H.dead) return; H.fired = true; H.t = hold; H.flash = 1; audio.play('whoosh_soft', { vol: 0.35 }); audio.play('chime_soft', { vol: 0.3, rate: 1.4 }); try { onSkip?.(); } catch (e) { console.warn('skip', e); } setTimeout(() => H.dispose(), 450); };
  H.fire = fire;
  // the hold is timed by the clock, not by frames (a slow device still skips after 0.8 s): a press arms a timer, a release disarms it
  const held = () => top() && !H.fired && (H.keys.size > 0 || H.ptr != null);
  const arm = () => { if (H.timer || !held()) return; H.since = performance.now() - H.t * 1000; H.timer = setTimeout(function chk() { H.timer = null; if (!held()) return; if (performance.now() - H.since >= hold * 1000 - 5) fire(); else H.timer = setTimeout(chk, 30); }, Math.max(0, hold * 1000 - H.t * 1000)); };
  const disarm = () => { if (held()) return; clearTimeout(H.timer); H.timer = null; };
  const kd = (e) => { if (!top() || H.fired || !keys.includes(e.code)) return; H.poke = 2.6; if (e.repeat) return; H.keys.add(e.code); arm(); if (TEST && (anywhere || e.code === 'Escape')) fire(); };
  const ku = (e) => { H.keys.delete(e.code); disarm(); };
  const pd = (e) => { if (!top() || H.fired) return; H.poke = 2.6; if (!anywhere && e.target !== cv) return; H.ptr = e.pointerId; arm(); if (e.target === cv) { e.preventDefault(); e.stopPropagation(); } if (TEST && e.target === cv) fire(); };
  const pu = (e) => { if (H.ptr === e.pointerId) H.ptr = null; disarm(); };
  const blur = () => { H.keys.clear(); H.ptr = null; disarm(); };
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true); addEventListener('pointerdown', pd, true); addEventListener('pointerup', pu, true); addEventListener('pointercancel', pu, true); addEventListener('blur', blur);
  let wasHolding = false;
  const frame = () => {
    if (H.dead) return; requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.25, (now - H.last) / 1000); H.last = now;
    const holding = top() && !H.fired && (H.keys.size > 0 || H.ptr != null);
    if (holding && !wasHolding) audio.play('fire_ignite', { vol: 0.12, rate: 1.6 }); wasHolding = holding;
    if (!H.fired) H.t = holding && H.since != null ? Math.min(hold, (now - H.since) / 1000) : Math.max(0, H.t - dt * 2.5); if (!holding) H.since = null; else if (H.since == null) arm();
    H.poke = Math.max(0, H.poke - dt); H.flash = Math.max(0, (H.flash || 0) - dt * 2.4);
    const want = !top() ? 0 : H.fired ? 1 : holding || H.t > 0 ? 1 : H.poke > 0 ? 0.62 : 0.2; H.vis += (want - H.vis) * Math.min(1, dt * 6);
    cv.style.opacity = (H.fired ? Math.max(0, H.flash * 1.4) : H.vis).toFixed(3);
    draw(g, cv, H, H.t / hold, dt, label, holding);
  };
  requestAnimationFrame(frame);
  H.dispose = () => { if (H.dead) return; H.dead = true; clearTimeout(H.timer); const i = stack.indexOf(H); if (i >= 0) stack.splice(i, 1); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('pointerdown', pd, true); removeEventListener('pointerup', pu, true); removeEventListener('pointercancel', pu, true); removeEventListener('blur', blur); cv.remove(); if (window.__skip === fire) window.__skip = stack[stack.length - 1]?.fire || null; };
  stack.push(H); window.__skip = fire;
  return H;
}

// ---------------------------------------------------------------- drawing (DPR-aware; Alagard at a whole multiple of its 16 px grid, so always crisp)
function draw(g, cv, H, k, dt, label, holding) {
  const dpr = Math.min(3, window.devicePixelRatio || 1); const css = Math.max(0.75, Math.min(1, innerWidth / 760)); const fpx = Math.max(1, Math.round(dpr * css)) * 16; // Alagard px size in buffer pixels
  g.font = `${fpx}px Alagard`; const tw = Math.ceil(g.measureText(label).width); const keyW = TOUCH ? 0 : Math.round(fpx * 2.9); const pad = Math.round(fpx * 0.5);
  const W = tw + keyW + pad * 3, Hh = Math.round(fpx * 2.4);
  if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; cv.style.width = W / dpr + 'px'; cv.style.height = Hh / dpr + 'px'; }
  g.clearRect(0, 0, W, Hh); g.font = `${fpx}px Alagard`; g.textBaseline = 'alphabetic'; g.imageSmoothingEnabled = false;
  const u = Math.max(1, Math.round(fpx / 16)); const base = Math.round(fpx * 1.35); let x = pad;
  // the key: a small bevelled brass keycap (chamfered, lit from the upper left) with its name engraved
  if (keyW) { const kx = x, ky = base - fpx * 0.95, kw = keyW - pad * 0.6, kh = fpx * 1.25, c = u * 3; const press = holding ? u : 0;
    const cap = (o, col) => { g.beginPath(); g.moveTo(kx + c, ky + o + press); g.lineTo(kx + kw - c, ky + o + press); g.lineTo(kx + kw, ky + c + o + press); g.lineTo(kx + kw, ky + kh - c + o); g.lineTo(kx + kw - c, ky + kh + o); g.lineTo(kx + c, ky + kh + o); g.lineTo(kx, ky + kh - c + o); g.lineTo(kx, ky + c + o + press); g.closePath(); g.fillStyle = col; g.fill(); };
    cap(u * 2, '#0c0705'); cap(u, '#4a2a12'); const gr = g.createLinearGradient(kx, ky, kx + kw * 0.6, ky + kh); gr.addColorStop(0, '#f2d27a'); gr.addColorStop(0.45, '#b8802e'); gr.addColorStop(1, '#6a3c14'); cap(0, gr);
    g.save(); g.font = `${Math.round(fpx * 0.5 / u) * u || u * 8}px Alagard`; g.fillStyle = '#2a1608'; g.textAlign = 'center'; g.fillText('SPACE', kx + kw / 2, ky + kh * 0.68 + press); g.restore(); x += keyW; }
  // the words: cast gold with an ink outline, a cool rim below, the heat of the fuse warming them as it burns
  const glow = Math.min(1, k * 1.3);
  g.fillStyle = '#0a0604'; for (const [dx, dy] of [[-u, 0], [u, 0], [0, -u], [0, u], [u, u], [0, u * 2], [u, u * 2]]) g.fillText(label, x + dx, base + dy);
  const tg = g.createLinearGradient(0, base - fpx * 0.8, 0, base); tg.addColorStop(0, glow > 0.5 ? '#fff6d0' : '#f6dc8e'); tg.addColorStop(0.55, '#d8a03e'); tg.addColorStop(1, '#8a5418'); g.fillStyle = tg; g.fillText(label, x, base);
  if (glow > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = glow * 0.45; g.fillStyle = '#ff9a30'; g.fillText(label, x, base); g.restore(); }
  // the fuse: a fine bronze line under the words; the burnt part bright gold, a four-point spark at its head
  const fy = base + u * 4, fx0 = x, fx1 = x + tw; const fx = Math.round(fx0 + (fx1 - fx0) * Math.min(1, k));
  g.fillStyle = 'rgba(10,6,4,0.9)'; g.fillRect(fx0 - u, fy - u, fx1 - fx0 + u * 2, u * 3); g.fillStyle = '#5a3a1c'; g.fillRect(fx0, fy, fx1 - fx0, u);
  if (k > 0) { g.fillStyle = '#ffd860'; g.fillRect(fx0, fy, fx - fx0, u); g.fillStyle = '#fff4c0'; g.fillRect(Math.max(fx0, fx - u * 6), fy, Math.min(u * 6, fx - fx0), u);
    const s = u * (3 + (holding ? Math.round(Math.random() * 2) : 0)); g.fillStyle = '#fffbe8'; g.fillRect(fx - u, fy - s, u * 2, s * 2 + u); g.fillRect(fx - s, fy, s * 2 + u, u); g.fillStyle = '#ffc040'; g.fillRect(fx - u * 2, fy - u, u * 4, u * 3);
    if (holding && Math.random() < 0.7) H.embers.push({ x: fx, y: fy, vx: (Math.random() - 0.6) * u * 30, vy: -u * (10 + Math.random() * 20), l: 0.5 + Math.random() * 0.4 }); }
  for (const e of H.embers) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += u * 60 * dt; e.l -= dt; g.fillStyle = e.l > 0.3 ? '#ffe9a0' : '#c8601a'; g.globalAlpha = Math.max(0, Math.min(1, e.l * 2.5)); g.fillRect(Math.round(e.x / u) * u, Math.round(e.y / u) * u, u, u); } g.globalAlpha = 1;
  H.embers = H.embers.filter((e) => e.l > 0 && e.y < Hh); if (H.embers.length > 40) H.embers.splice(0, H.embers.length - 40);
  if (H.flash) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = H.flash * 0.8; g.fillStyle = '#fff2c0'; g.fillText(label, x, base); g.restore(); }
}
