// Floating 3D labels: crisp pixel lettering that hangs in the air beside a scene object and drifts softly, made like
// cut-out metal letters: an ink outline, a 2-texel extruded side (so they read as thick, physical letters), a face in
// a brass ramp (lit top rows, shaded bottom rows) or pale engraved bone for the small hint line. Fonts at native size
// (Alagard 16 for titles, PixelSans 11 for hints), nearest-filtered, with the texel sized so one font pixel covers
// about three screen pixels at 1080p (two at 720p) from the shot it is designed for. Lit by the scene (Lambert) with a little self-light
// so it stays legible at night; it never glows or blooms. Fades in and out by ordered dithering (stays pixel art).
//   const L = new FloatLabel({ title: 'Star Gallery', hint: 'the museum & the frog' }, { at: V3, dist: 9 });
//   scene.add(L.mesh); L.update(dt, t, camera); L.show = true|false; L.hot = hovered
import * as THREE from 'three';
import { FONT, measure, drawPixelText, wrapText, uiPos } from './craft.js';
import { audio } from '../core/audio.js';
import { Spring } from '../core/tween.js';

const STY = {
  brass: { face: '#e6b24a', hi: '#fff0a8', lo: '#a86a1e', side: '#4a2410', ink: '#140a06' },
  silver: { face: '#d8dce4', hi: '#ffffff', lo: '#8a90a4', side: '#2c2c3e', ink: '#0c0a12' },
  bone: { face: '#e8dcc0', hi: '#fffaea', lo: '#b4a482', side: '#3a2a1a', ink: '#120a06' },
};
const DITHER = `float fl_bayer(vec2 p){ p = mod(floor(p), 4.0); int x = int(p.x), y = int(p.y); float b;
  if (y == 0) b = x == 0 ? 0.0 : x == 1 ? 8.0 : x == 2 ? 2.0 : 10.0; else if (y == 1) b = x == 0 ? 12.0 : x == 1 ? 4.0 : x == 2 ? 14.0 : 6.0;
  else if (y == 2) b = x == 0 ? 3.0 : x == 1 ? 11.0 : x == 2 ? 1.0 : 9.0; else b = x == 0 ? 15.0 : x == 1 ? 7.0 : x == 2 ? 13.0 : 5.0; return (b + 0.5) / 16.0; }\n`;

function paint({ title, hint, style, hintStyle, chevron }) {
  const tf = FONT.head, hf = FONT.body; const pad = 5;
  const tw = title ? measure(title, tf) : 0, hw = hint ? measure(hint, hf) : 0; const W = Math.max(tw, hw, chevron ? 16 : 0) + pad * 2 + 2;
  const th = title ? tf.lineH + 4 : 0, hh = hint ? hf.lineH + 4 : 0; const H = th + hh + (chevron ? 12 : 0) + pad * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const line = (str, f, y, S) => { // extruded side, ink outline, ramped face (highlight band on top, shade band below)
    const x = W / 2; const top = y - f.cap, ch = f.cap;
    for (const d of [2, 1]) drawPixelText(g, str, x + d, y + d, f, { color: S.side, outline: S.side, align: 'center' });
    drawPixelText(g, str, x, y, f, { color: S.face, outline: S.ink, align: 'center' });
    g.save(); g.beginPath(); g.rect(0, top - 1, W, Math.max(1, Math.round(ch * 0.3))); g.clip(); drawPixelText(g, str, x, y, f, { color: S.hi, align: 'center' }); g.restore();
    g.save(); g.beginPath(); g.rect(0, top + Math.round(ch * 0.72), W, ch); g.clip(); drawPixelText(g, str, x, y, f, { color: S.lo, align: 'center' }); g.restore();
  };
  let y = pad; if (title) { line(title, tf, y + tf.base + 1, STY[style]); y += th; } if (hint) { line(hint, hf, y + hf.base + 1, STY[hintStyle]); y += hh; }
  if (chevron) { const S = STY[hintStyle]; const cx = Math.round(W / 2); for (let k = 0; k < 2; k++) for (let i = -4; i <= 4; i++) { const yy = y + 2 + k * 4 + (4 - Math.abs(i)); for (const [dx, dy, col] of [[1, 1, S.side], [0, 0, S.ink]]) { g.fillStyle = col; g.fillRect(cx + i - 1 + dx, yy - 1 + dy, 3, 3); } g.fillStyle = Math.abs(i) < 2 ? S.hi : S.face; g.fillRect(cx + i, yy, 1, 1); } }
  return c;
}

export class FloatLabel {
  /** content: { title, hint, chevron }; opts: { at (V3 anchor), dist (designed viewing distance, sets texel size), style: 'brass'|'silver'|'bone', hintStyle } */
  constructor(content, { at = new THREE.Vector3(), dist = 9, style = 'brass', hintStyle = 'bone', phase = Math.random() * 10, texel = null } = {}) {
    const canvas = paint({ ...content, style, hintStyle }); const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const k = texel ?? dist / 640; this.size = [canvas.width * k, canvas.height * k];
    const U = { uFade: { value: 0 } }; this.U = U;
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => { sh.uniforms.uFade = U.uFade; sh.fragmentShader = 'uniform float uFade;\n' + DITHER + sh.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n if (fl_bayer(gl_FragCoord.xy / 2.0) > uFade) discard;'); };
    mat.customProgramCacheKey = () => 'floatLabel';
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.size[0], this.size[1]), mat); this.mesh.userData.noInk = true; this.mesh.userData.noAO = true; this.mesh.renderOrder = 4; this.mesh.castShadow = false;
    this.at = at.clone(); this.phase = phase; this.show = true; this.hot = false; this.fade = new Spring(0, 5, 1); this.pop = new Spring(1, 9, 0.45); this.mesh.visible = false;
  }
  update(dt, t, camera) {
    this.fade.target = this.show ? 1 : 0; this.fade.update(dt); const f = Math.max(0, Math.min(1, this.fade.value)); this.U.uFade.value = f; this.mesh.visible = f > 0.02;
    if (!this.mesh.visible) return; this.pop.target = this.hot ? 1.18 : 1; this.pop.update(dt);
    const p = this.phase; this.mesh.position.set(this.at.x + Math.sin(t * 0.47 + p) * 0.035, this.at.y + Math.sin(t * 0.83 + p * 1.7) * 0.05 + (this.hot ? 0.06 : 0), this.at.z + Math.cos(t * 0.39 + p) * 0.03);
    this.mesh.quaternion.copy(camera.quaternion); this.mesh.rotateZ(Math.sin(t * 0.6 + p) * 0.025); this.mesh.scale.setScalar(this.pop.value);
  }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.map?.dispose(); this.mesh.material.dispose(); }
}

// ================================================================ FLOAT TEXT (battle UI): crisp 3D floating letters, no paper
// Lines of coloured runs drawn with the pixel fonts at native size and shown at a whole number of screen pixels per font
// pixel (2 at 720p-1080p, 3 at 1440p): an ink outline on the face, plus a separate dark "side" plate a little behind it,
// so the letters read as thick cut-out metal / bone and show parallax when they tilt toward the pointer. Unfolds in
// (a vertical flip from the baseline with an ordered-dither fade), springy, lit by the UI rig. Dark parchment inks
// handed in by older code are lifted into light, legible tints automatically.
//   const T = new FloatText(lines, { font: 'body' }); parent.add(T.group); T.place(x, y, z); T.show(); T.update(dt, ptr)
// lines: 'text' | [[text, color], ...] | an array of those (one entry per line)
const FT_STY = { ink: '#0b0710', side: '#24161c' };
export function lightInk(c) {
  const col = new THREE.Color(c); const hsl = {}; col.getHSL(hsl);
  if (hsl.l >= 0.62) return '#' + col.getHexString();
  col.setHSL(hsl.h, Math.min(0.78, hsl.s * 1.1 + (hsl.s > 0.15 ? 0.1 : 0)), hsl.s < 0.18 ? 0.88 : 0.74); return '#' + col.getHexString();
}
export function pxPerTexel() { return Math.max(2, Math.round((window.innerHeight || 720) / 540)); }
/** UI units per font pixel on the z = 0 UI plane */
export function uiTexel(engine) { const E = engine || window.__game?.engine; const sp = (window.innerHeight || 720) / (2 * (E?.uiH || 10)); return pxPerTexel() / sp; }
const normLines = (lines) => { const arr = Array.isArray(lines) && (typeof lines[0] === 'string' || Array.isArray(lines[0]?.[0]) || lines[0] == null || (Array.isArray(lines[0]) && typeof lines[0][0] !== 'string')) ? lines : [lines]; return arr.map((l) => (typeof l === 'string' ? [[l, null]] : Array.isArray(l) && typeof l[0] === 'string' ? [l] : l || [['', null]])); };
function ftPaint(lines, { font = 'body', color = '#f2ead8', align = 'left', fonts = null, maxW = 0, lighten = true, chars = Infinity }) {
  const L = normLines(lines); const pad = 4; const metrics = L.map((runs, i) => { const f = FONT[(fonts && fonts[i]) || font]; const w = runs.reduce((k, [t]) => k + measure(String(t ?? ''), f), 0); return { f, w, lh: f.lineH + 3 }; });
  const W = Math.max(8, ...metrics.map((m) => m.w)) + pad * 2 + 3, H = metrics.reduce((k, m) => k + m.lh, 0) + pad * 2 + 2;
  const face = document.createElement('canvas'); face.width = W; face.height = H; const side = document.createElement('canvas'); side.width = W; side.height = H;
  const g = face.getContext('2d'), gs = side.getContext('2d'); let y = pad, shown = 0;
  L.forEach((runs, i) => { const { f, w, lh } = metrics[i]; let x = align === 'center' ? Math.round(W / 2 - w / 2) : align === 'right' ? W - pad - 3 - w : pad; const base = y + (f.base ?? 9) + 1;
    for (const [t0, c] of runs) { let t = String(t0 ?? ''); if (shown + t.length > chars) t = t.slice(0, Math.max(0, chars - shown)); shown += String(t0 ?? '').length; if (!t) { x += measure(String(t0 ?? ''), f); continue; }
      const col = c ? (lighten ? lightInk(c) : c) : color; drawPixelText(gs, t, x, base, f, { color: FT_STY.side, outline: FT_STY.side }); drawPixelText(g, t, x, base, f, { color: col, outline: FT_STY.ink });
      // a lit top row on every glyph (thick metal catching the key light)
      g.save(); g.beginPath(); g.rect(0, base - (f.cap ?? 8) - 1, W, 1); g.clip(); drawPixelText(g, t, x, base, f, { color: '#fffbe8' }); g.restore();
      x += measure(String(t0 ?? ''), f); }
    y += lh; });
  return { face, side, W, H };
}
const ftMat = (tex, U, z = 0) => { const m = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: z ? 0.15 : 0.62, side: THREE.DoubleSide, toneMapped: false });
  m.onBeforeCompile = (sh) => { sh.uniforms.uFade = U.uFade; sh.fragmentShader = 'uniform float uFade;\n' + DITHER + sh.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n if (fl_bayer(gl_FragCoord.xy / 2.0) > uFade) discard;'); };
  m.customProgramCacheKey = () => 'floatText'; return m; };
const ftTex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
export class FloatText {
  constructor(lines = '', opts = {}) {
    this.opts = { font: 'body', align: 'left', anchor: 'center', depth: 0.06, ...opts }; this.U = { uFade: { value: 0 } };
    this.group = new THREE.Group(); this.pivot = new THREE.Group(); this.group.add(this.pivot); this.group.renderOrder = 20;
    this.fade = new Spring(0, 9, 1); this.unf = new Spring(0, 15, 0.55); this.tx = new Spring(0, 10, 0.5); this.ty = new Spring(0, 10, 0.5); this.pop = new Spring(1, 16, 0.4);
    this.on = false; this.hover = false; this.w = 0; this.h = 0; this.key = ''; if (lines !== null) this.set(lines);
  }
  set(lines, opts = {}) {
    Object.assign(this.opts, opts); const key = JSON.stringify(lines) + '|' + (this.opts.chars ?? '') + this.opts.font + (this.opts.fonts || ''); if (key === this.key) return this; this.key = key;
    const P = ftPaint(lines, this.opts); const k = this.opts.texel ?? uiTexel(); this.k = k;
    for (const m of [this.faceM, this.sideM]) if (m) { this.pivot.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); }
    const ax = this.opts.anchor === 'left' ? P.W / 2 : this.opts.anchor === 'right' ? -P.W / 2 : 0, ay = this.opts.anchorY === 'top' ? -P.H / 2 : this.opts.anchorY === 'bottom' ? P.H / 2 : 0;
    const geo = () => { const g = new THREE.PlaneGeometry(P.W * k, P.H * k); g.translate(ax * k, ay * k, 0); return g; };
    this.sideM = new THREE.Mesh(geo(), ftMat(ftTex(P.side), this.U, 1)); this.sideM.position.set(k * 1.5, -k * 1.5, -this.opts.depth); this.faceM = new THREE.Mesh(geo(), ftMat(ftTex(P.face), this.U));
    for (const m of [this.sideM, this.faceM]) { m.castShadow = false; m.receiveShadow = false; m.renderOrder = 20; this.pivot.add(m); }
    this.w = P.W * k; this.h = P.H * k; return this;
  }
  place(x, y, z = 6) { uiPos(this.group, x, y, z); this.group.scale.setScalar((40 - z) / 40); return this; }
  show() { if (!this.on) { this.on = true; this.unf.value = Math.min(this.unf.value, 0.05); this.unf.target = 1; this.pop.kick(2); } return this; }
  hide() { this.on = false; this.unf.target = 0; return this; }
  update(dt, ptr = null) {
    this.fade.target = this.on ? 1 : 0; for (const s of [this.fade, this.unf, this.tx, this.ty, this.pop]) s.update(dt);
    const f = Math.max(0, Math.min(1, this.fade.value)); this.U.uFade.value = f; this.group.visible = f > 0.02;
    if (this.hover && ptr) { this.group.getWorldPosition(_ftw); this.tx.target = Math.max(-0.4, Math.min(0.4, -(ptr.y - _ftw.y) * 0.08)); this.ty.target = Math.max(-0.5, Math.min(0.5, (ptr.x - _ftw.x) * 0.08)); } else { this.tx.target = 0; this.ty.target = 0; }
    const u = Math.max(0.02, this.unf.value); this.pivot.scale.set(Math.max(0.02, this.pop.value) * (0.96 + 0.04 * u), Math.max(0.02, this.pop.value) * u, 1); this.pivot.rotation.set(this.tx.value + (1 - u) * 0.9, this.ty.value, 0);
  }
  dispose() { for (const m of [this.faceM, this.sideM]) if (m) { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); } this.group.parent?.remove(this.group); }
}
const _ftw = new THREE.Vector3();

/** tooltip in floating text (the HudTip API: show(lines, x, y, z, { maxW }) / hide() / update() / dispose()); wraps long runs */
export class FloatTip {
  constructor(opts = {}) { const E = window.__game?.engine; this.E = E; this.opts = opts; this.T = new FloatText(null, { font: 'body', ...opts }); this.T.group.visible = false; E?.ui.scene.add(this.T.group); this.on = false; E?.add(this); this.x = 0; this.y = 0; this.z = 9; this.cur = null; }
  get group() { return this.T.group; }
  show(lines, x, y, z = 9, o = {}) {
    const maxW = Math.round((o.maxW || this.opts.maxW || 15) * 22); const out = [];
    for (const l of normLines(lines)) { const txt = l.map((r) => String(r[0] ?? '')).join(''); if (measure(txt, 'body') <= maxW || l.length > 1) { if (measure(txt, 'body') > maxW) { const lead = l[0]; const rest = l.slice(1).map((r) => r[0]).join(''); const wr = wrapText(rest, 'body', maxW - measure(String(lead[0]), 'body')); out.push([lead, [wr[0] || '', l[1]?.[1]]]); const ws = wrapText(wr.slice(1).join(' '), 'body', maxW); for (const w of ws) if (w) out.push([[w, l[1]?.[1]]]); } else out.push(l); continue; } for (const w of wrapText(txt, 'body', maxW)) out.push([[w, l[0][1]]]); }
    const fonts = out.map((l, i) => (i === 0 && o.title !== false ? 'head' : 'body')); this.T.set(out, { fonts }); const k = (40 - z) / 40;
    const W = this.E?.uiW ?? 20, H = this.E?.uiH ?? 11; const cx = Math.max(-W + this.T.w / 2 + 0.3, Math.min(W - this.T.w / 2 - 0.3, x)), cy = Math.max(-H + this.T.h / 2 + 0.3, Math.min(H - this.T.h / 2 - 0.3, y));
    this.T.place(cx, cy, z); this.T.group.scale.setScalar(k); if (!this.on) audio.play('page_turn', { vol: 0.18, minGap: 0.1 }); this.on = true; this.T.show();
  }
  hide() { this.on = false; this.T.hide(); }
  update(dt) { this.T.update(dt, null); }
  dispose() { this.E?.remove(this); this.T.dispose(); }
}

/** damage / heal / status numbers: chunky NanoPlus digits that pop, arc up and tumble down (spawn(text, x, y, opts)) */
export class FloatNumbers {
  constructor(scene) { this.scene = scene; this.list = []; }
  spawn(text, x, y, o = {}) {
    const big = (o.size || 1.3) >= 1.6; const T = new FloatText([[String(text), o.color || '#fff6cf']], { font: big ? 'big' : 'num2', align: 'center', lighten: false, depth: 0.12 }); this.scene.add(T.group);
    const z = 9 + this.list.length * 0.02; T.place(x, y, z); T.show(); T.pop.value = 0.2; T.pop.kick(14 * (o.size || 1.3));
    const n = { T, x, y, z, vx: (Math.random() - 0.5) * 2.4, vy: o.vy ?? 6.5 + Math.random() * 1.5, life: o.life ?? 1.25, t: 0, rz: (Math.random() - 0.5) * 2.2, s: (o.size || 1.3) / 1.3 };
    this.list.push(n); return n;
  }
  update(dt) {
    for (const n of this.list) { n.t += dt; n.vy -= 15 * dt; n.x += n.vx * dt; n.y += n.vy * dt * (n.t < 0.12 ? 0.3 : 1); n.T.place(n.x, n.y, n.z); n.T.group.scale.multiplyScalar(n.s); n.T.group.rotation.z = Math.sin(n.t * 3) * 0.05 + n.rz * Math.max(0, n.t - 0.6) * 0.5; if (n.t > n.life) n.T.hide(); n.T.update(dt); }
    this.list = this.list.filter((n) => { if (n.t > n.life + 0.4) { n.T.dispose(); return false; } return true; });
  }
  clear() { for (const n of this.list) n.T.dispose(); this.list = []; }
}

/** a spoken line over a speaker's head: the name in small caps, the words typed in letter by letter (at(x, y) each frame) */
export class FloatSpeech {
  constructor(scene, text, { who = '', color = '#ffe6a8', life = 2.4 } = {}) {
    this.scene = scene; this.text = String(text); this.who = who; this.color = color; this.t = 0; this.life = life; this.dropped = false; this.n = 0;
    this.T = new FloatText(null, { font: 'body', align: 'center' }); scene.add(this.T.group); this.render(); this.T.show();
  }
  render() { const maxW = 210; const ws = wrapText(this.text, 'body', maxW); const lines = [...(this.who ? [[[this.who.toUpperCase(), this.color]]] : []), ...ws.map((w) => [[w, '#f6efe0']])]; this.T.set(lines, { chars: (this.who ? this.who.length : 0) + this.n, fonts: lines.map((_, i) => (i === 0 && this.who ? 'tiny' : 'body')), anchorY: 'bottom', lighten: false }); }
  at(x, y) { const z = 8.5; this.T.place(x, y, z); }
  drop() { this.dropped = true; this.T.hide(); }
  update(dt) { this.t += dt; const n = Math.min(this.text.length + 40, Math.floor(this.t * 55)); if (n !== this.n && this.n <= this.text.length + 20) { this.n = n; this.render(); } if (this.t > this.life && !this.dropped) this.drop(); this.T.update(dt); }
  get dead() { return this.dropped && this.T.fade.value < 0.03; }
  dispose() { this.T.dispose(); }
}
