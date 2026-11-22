// END TURN: THE GOLDEN APPLE OF TIME. Time is stopped while you plan; pressing the apple lets it flow again.
// A sculpted, faceted golden apple (a lathed apple silhouette with a calyx dimple, a stem cavity and five soft lobes,
// flat-shaded) in real gold PBR: an engraved clock face (twelve Roman hours on a band round its waist), filigree
// scrolls above and below, and hairline TIME-CRACKS that glow from inside, all painted at high resolution into the
// colour, bump and emissive maps. A folded gold-green leaf and a bronze stem; it hovers over a three-clawed brass cup on
// a small turned walnut plinth with brass rings; twelve hour marks circle it like a floating bezel.
//   idle     : a slow breathing bob and turn, a shimmer of light sweeps across the gold, fine square pixel time-motes drift
//              up round it (never round blobs), the bezel steps one hour a second (time is held)
//   hover    : it lifts and tilts toward the pointer, brightens with a warm rim, ticks softly, the motes speed up
//   press    : squash and spring, a bright sweep, a chime, a burst of motes, the bezel races (time resumes); the battle
//              scene adds the golden ripple through the screen (engine.ripple)
//   disabled : dull, still and quiet (the foes' turn)
// API used by the battle HUD: group, hit[], hover, enabled, rz (Spring), setEnabled(on), setLabel(text, sub), ring(), update(dt, ptr)
import * as THREE from 'three';
import { Body } from './craft.js';
import { cineText } from './cinetext.js';
import { Spring } from '../core/tween.js';
import { audio } from '../core/audio.js';

const TAU = Math.PI * 2;
let TEX = null;
// ---------------------------------------------------------------- the engraving: colour, bump and glowing cracks (u = round, v = up)
function appleMaps() {
  if (TEX) return TEX;
  const W = 1024, H = 512; const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const col = mk(), bmp = mk(), emi = mk(); const g = col.getContext('2d'), b = bmp.getContext('2d'), e = emi.getContext('2d');
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // hammered gold: warm base, fine 2x2 pixel speckle, faint vertical polishing streaks
  g.fillStyle = '#eab64e'; g.fillRect(0, 0, W, H); b.fillStyle = '#808080'; b.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { const x = (rnd() * W) | 0, y = (rnd() * H) | 0, k = rnd(); g.fillStyle = k < 0.5 ? 'rgba(255,236,170,0.35)' : 'rgba(150,90,20,0.28)'; g.fillRect(x & ~1, y & ~1, 2, 2); b.fillStyle = k < 0.5 ? '#8a8a8a' : '#767676'; b.fillRect(x & ~1, y & ~1, 2, 2); }
  for (let i = 0; i < 70; i++) { const x = rnd() * W; g.fillStyle = 'rgba(255,240,190,0.08)'; g.fillRect(x, 0, 1 + rnd() * 3, H); }
  // every engraved stroke goes three ways: a dark patinated groove (colour), a cut (bump), nothing in emissive
  const cut = (fn, w = 3) => { for (const [ctx, st] of [[g, 'rgba(96,52,10,0.92)'], [b, '#1c1c1c']]) { ctx.strokeStyle = st; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); fn(ctx); ctx.stroke(); }
    g.strokeStyle = 'rgba(255,240,180,0.55)'; g.lineWidth = 1; g.beginPath(); g.save(); g.translate(0, -w * 0.6); fn(g); g.stroke(); g.restore(); }; // a bright lip above each cut
  const wrapX = (fn) => { for (const dx of [-W, 0, W]) fn(dx); };
  // the clock band round the waist: two rules, 60 minute ticks, 12 hour ticks, Roman numerals
  const y0 = 238, y1 = 302; cut((c) => { c.moveTo(0, y0); c.lineTo(W, y0); c.moveTo(0, y1); c.lineTo(W, y1); }, 3);
  cut((c) => { for (let i = 0; i < 60; i++) { const x = (i / 60) * W; c.moveTo(x, y0 + 3); c.lineTo(x, y0 + (i % 5 ? 9 : 16)); c.moveTo(x, y1 - 3); c.lineTo(x, y1 - (i % 5 ? 9 : 16)); } }, 2);
  const ROM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) { const x = ((i + 0.5) / 12) * W; for (const [ctx, st] of [[g, 'rgba(90,48,8,0.95)'], [b, '#202020']]) { ctx.fillStyle = st; ctx.font = 'bold 30px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ROM[i], x, (y0 + y1) / 2 + 1); } }
  // filigree: mirrored acanthus scrolls (S-curves ending in tight spiral curls) above and below the band
  const spiral = (c, cx, cy, r0, dir, turns = 1.6) => { for (let t = 0; t <= 1; t += 0.04) { const a = dir * t * turns * TAU; const r = r0 * (1 - t * 0.85); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; t ? c.lineTo(x, y) : c.moveTo(x, y); } };
  const scroll = (c, x, y, w, h, flip) => { c.moveTo(x, y); c.bezierCurveTo(x + w * 0.3, y - h * flip, x + w * 0.7, y + h * flip, x + w, y); spiral(c, x + w, y - 14 * flip, 14, flip); c.moveTo(x, y); spiral(c, x, y + 14 * flip, 14, -flip); };
  for (let i = 0; i < 6; i++) wrapX((dx) => { const x = (i / 6) * W + dx + 18; cut((c) => { scroll(c, x, 196, W / 6 - 36, 26, 1); scroll(c, x + 8, 350, W / 6 - 52, 24, -1); }, 3); cut((c) => { c.moveTo(x + W / 12 - 8, 160); c.lineTo(x + W / 12, 140); c.lineTo(x + W / 12 + 8, 160); c.moveTo(x + W / 12 - 8, 386); c.lineTo(x + W / 12, 406); c.lineTo(x + W / 12 + 8, 386); }, 2); });
  // rays from the stem cavity and the calyx, like the guilloche of a watch case
  cut((c) => { for (let i = 0; i < 48; i++) { const x = (i / 48) * W; c.moveTo(x, 0); c.lineTo(x + 6, 62 + (i % 2) * 18); c.moveTo(x, H); c.lineTo(x - 6, H - 54 - (i % 2) * 14); } }, 2);
  // hairline time-cracks: jagged, branching, glowing from within (emissive), dark at their lips (colour, bump)
  const crack = (x, y, len, ang, depth = 0) => { const pts = [[x, y]]; let a = ang; for (let i = 0; i < len; i++) { a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 9; pts.push([x, y]); if (depth < 2 && rnd() < 0.12) crack(x, y, (len - i) * 0.5, a + (rnd() < 0.5 ? 0.8 : -0.8), depth + 1); }
    const path = (c) => pts.forEach(([px, py], k) => (k ? c.lineTo(px, py) : c.moveTo(px, py)));
    for (const [ctx, st, w] of [[g, 'rgba(70,30,4,0.9)', 3], [b, '#101010', 3], [e, '#fff2c0', 2]]) { ctx.strokeStyle = st; ctx.lineWidth = w - depth * 0.6; ctx.lineJoin = 'miter'; ctx.beginPath(); path(ctx); ctx.stroke(); }
    e.strokeStyle = 'rgba(255,170,60,0.35)'; e.lineWidth = 7 - depth * 2; e.beginPath(); path(e); e.stroke(); };
  for (const [x, y, l, a] of [[160, 40, 22, 1.2], [520, 70, 18, 1.9], [800, 30, 26, 1.4], [330, 470, 14, -1.3], [930, 440, 12, -1.8]]) crack(x, y, l, a);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  TEX = { map: tex(col, true), bump: tex(bmp, false), emi: tex(emi, true) }; return TEX;
}
// a little walnut grain (pixel art, nearest) for the plinth
function walnut() { const c = document.createElement('canvas'); c.width = 32; c.height = 64; const g = c.getContext('2d'); const R = ['#3a2010', '#4a2a14', '#5a3418', '#6c4020', '#7e4e28'];
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) { const v = Math.sin(x * 0.55 + Math.sin(y * 0.11) * 2.4) * 0.5 + 0.5 + (Math.sin(x * 7.1 + y * 3.3) * 0.5) * 0.25; g.fillStyle = R[Math.max(0, Math.min(4, Math.round(v * 3.2 + 0.4)))]; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }

// ---------------------------------------------------------------- the apple's body: a lathed, lobed apple silhouette
function appleGeometry() {
  const prof = [[0.001, -0.74], [0.14, -0.8], [0.34, -0.88], [0.58, -0.86], [0.8, -0.7], [0.94, -0.44], [1.0, -0.14], [0.99, 0.16], [0.94, 0.42], [0.82, 0.62], [0.62, 0.76], [0.4, 0.8], [0.2, 0.72], [0.08, 0.6], [0.001, 0.52]];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 18); const P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const a = Math.atan2(z, x); const low = THREE.MathUtils.smoothstep(-y, -0.2, 0.75); // five soft lobes, strongest toward the calyx
    const k = 1 + 0.05 * Math.cos(a * 5) * (0.35 + low) + 0.02 * Math.sin(a * 2 + 0.7); P.setXYZ(i, x * k, y + 0.03 * Math.cos(a * 5) * low, z * k * 0.97); }
  geo.computeVertexNormals(); return geo;
}

export class TimeApple extends Body {
  constructor() {
    super(); const p = this.pivot; this.tiltK = 0.06; this.hoverLift = 0.45; this.enabled = true; this.lbl = ''; this.t = 0; this.clockT = 0;
    const M = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    const T = appleMaps();
    // shared live uniforms for the gold: shimmer sweep, hover rim, crack glow
    this.U = { uSweep: { value: -3 }, uShine: { value: 0.6 }, uRimK: { value: 0.3 }, uCrack: { value: 1 } };
    this.goldM = new THREE.MeshStandardMaterial({ color: 0xffe0a0, map: T.map, bumpMap: T.bump, bumpScale: 1.6, emissiveMap: T.emi, emissive: 0xffb040, emissiveIntensity: 0.9, metalness: 1, roughness: 0.3, flatShading: true, envMapIntensity: 1.25 });
    this.goldM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.U);
      sh.vertexShader = 'varying vec3 vOP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
      sh.fragmentShader = 'uniform float uSweep, uShine, uRimK, uCrack; varying vec3 vOP;\n' + sh.fragmentShader
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= uCrack * (0.75 + 0.25 * sin(vOP.y * 9.0 + uSweep * 3.0));')
        .replace('#include <opaque_fragment>', `{ float sw = vOP.x * 0.55 + vOP.y * 0.85 - uSweep; float band = exp(-sw * sw * 30.0);
            outgoingLight += vec3(1.0, 0.86, 0.55) * band * uShine * (0.35 + 0.65 * diffuseColor.rgb);
            float fr = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.4); outgoingLight += vec3(1.0, 0.66, 0.28) * fr * uRimK; }
          #include <opaque_fragment>`);
    };
    this.goldM.customProgramCacheKey = () => 'timeApple-gold';
    this.brassM = new THREE.MeshStandardMaterial({ color: 0xd2a050, metalness: 0.9, roughness: 0.36, flatShading: true, envMapIntensity: 1.1 });
    this.woodM = new THREE.MeshStandardMaterial({ map: walnut(), color: 0x9a7458, metalness: 0, roughness: 0.62, flatShading: true });
    this.tickM = new THREE.MeshStandardMaterial({ color: 0x9a6a2a, metalness: 0.85, roughness: 0.5, flatShading: true, emissive: 0xffa030, emissiveIntensity: 0 });
    const leafM = new THREE.MeshStandardMaterial({ color: 0xb8c45c, metalness: 0.85, roughness: 0.34, flatShading: true, side: THREE.DoubleSide, envMapIntensity: 1.1 });
    const stemM = new THREE.MeshStandardMaterial({ color: 0x6a4420, metalness: 0.7, roughness: 0.45, flatShading: true });

    // ---- the plinth: a turned walnut foot with brass rings, a slim neck, a three-clawed brass cup
    const stand = new THREE.Group(); stand.position.y = -1.95; p.add(stand); this.stand = stand;
    const lathe = (pts, n, mat) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), n); g.computeVertexNormals(); return M(g, mat, stand); };
    lathe([[0.001, 0], [1.0, 0], [1.02, 0.06], [0.96, 0.12], [0.82, 0.16], [0.8, 0.26], [0.68, 0.3], [0.001, 0.31]], 8, this.woodM);
    lathe([[0.84, 0.15], [0.86, 0.18], [0.84, 0.21], [0.8, 0.21], [0.8, 0.15]], 8, this.brassM); // brass ring on the foot
    lathe([[0.001, 0.3], [0.5, 0.3], [0.34, 0.4], [0.2, 0.5], [0.16, 0.66], [0.22, 0.74], [0.16, 0.8], [0.001, 0.8]], 8, this.woodM);
    lathe([[0.24, 0.72], [0.26, 0.75], [0.24, 0.78], [0.2, 0.78], [0.2, 0.72]], 8, this.brassM); // collar
    lathe([[0.001, 0.8], [0.3, 0.8], [0.44, 0.9], [0.5, 0.98], [0.46, 1.0], [0.001, 0.94]], 8, this.brassM); // the cup
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; const cl = new THREE.CatmullRomCurve3([new THREE.Vector3(0.44, 0.96, 0), new THREE.Vector3(0.66, 1.12, 0), new THREE.Vector3(0.7, 1.32, 0), new THREE.Vector3(0.58, 1.46, 0)]);
      const claw = M(new THREE.TubeGeometry(cl, 6, 0.045, 4, false), this.brassM, stand); claw.rotation.y = a; }
    // ---- the apple
    this.appleG = new THREE.Group(); this.appleG.position.y = 0.32; p.add(this.appleG);
    this.apple = M(appleGeometry(), this.goldM, this.appleG);
    const stemC = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.02, 0.72, 0), new THREE.Vector3(0.1, 0.9, 0.02), new THREE.Vector3(0.2, 1.0, 0.04)]);
    M(new THREE.TubeGeometry(stemC, 6, 0.05, 5, false), stemM, this.appleG);
    // a folded leaf: an almond blade with a raised midrib, creased along it
    { const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.bezierCurveTo(0.14, 0.12, 0.42, 0.16, 0.7, 0.0); ls.bezierCurveTo(0.42, -0.14, 0.14, -0.12, 0, 0);
      const lg = new THREE.ShapeGeometry(ls, 4); const LP = lg.attributes.position; for (let i = 0; i < LP.count; i++) { const x = LP.getX(i), y = LP.getY(i); LP.setZ(i, Math.abs(y) * 0.55 - x * x * 0.18); } lg.computeVertexNormals();
      this.leaf = M(lg, leafM, this.appleG); this.leaf.position.set(0.08, 0.82, 0.02); this.leaf.rotation.set(-0.5, -0.6, 0.55);
      const rib = M(new THREE.BoxGeometry(0.66, 0.018, 0.02), leafM, this.leaf); rib.position.set(0.33, 0, 0.0); }
    // ---- the floating bezel: twelve hour marks (bars, the quarters doubled) circling the apple, tilted like an orbit
    this.bezel = new THREE.Group(); this.bezel.position.y = 0.3; this.bezel.rotation.set(1.28, 0, 0.18); p.add(this.bezel); this.bezelSpin = new THREE.Group(); this.bezel.add(this.bezelSpin);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const q = i % 3 === 0; const tk = M(new THREE.BoxGeometry(q ? 0.06 : 0.035, 0.035, q ? 0.22 : 0.12), this.tickM, this.bezelSpin); tk.position.set(Math.cos(a) * 1.42, 0, Math.sin(a) * 1.42); tk.rotation.y = -a; tk.castShadow = false; }
    // ---- fine square pixel time-motes (additive points, never round)
    const N = 46; const mg = new THREE.BufferGeometry(); const seed = new Float32Array(N * 4); for (let i = 0; i < N; i++) seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); mg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4)); mg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);
    this.MU = { uT: { value: 0 }, uBurst: { value: 0 }, uAlpha: { value: 1 }, uPx: { value: Math.max(2, Math.round(3 * (window.devicePixelRatio || 1))) } };
    this.motes = new THREE.Points(mg, new THREE.ShaderMaterial({ uniforms: this.MU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aSeed; uniform float uT, uBurst, uPx; varying float vA; varying float vK;
        void main(){ float life = fract(aSeed.x + uT * (0.08 + aSeed.y * 0.07)); float a = aSeed.z * 6.2831 + uT * (0.35 + aSeed.w * 0.5) * (aSeed.y > 0.5 ? 1.0 : -1.0);
          float r = 1.05 + aSeed.w * 0.55 + life * 0.25 + uBurst * (1.2 + aSeed.y * 2.2); vec3 p = vec3(cos(a) * r, -1.0 + life * 2.6 + uBurst * (aSeed.z - 0.3) * 1.5, sin(a) * r * 0.6);
          vA = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.7, 1.0, life)); vK = aSeed.y; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (aSeed.w > 0.8 ? 2.0 : 1.0); }`,
      fragmentShader: `uniform float uAlpha, uT; varying float vA; varying float vK; void main(){ float tw = 0.6 + 0.4 * step(0.5, fract(uT * 3.0 + vK * 7.0)); gl_FragColor = vec4(mix(vec3(1.0, 0.78, 0.36), vec3(1.0, 0.96, 0.8), vK) * vA * tw * uAlpha, 1.0); }` }));
    this.motes.frustumCulled = false; this.motes.raycast = () => {}; this.appleG.add(this.motes);
    // ---- generous invisible hit volume (touch friendly)
    const hitM = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.6, 2.4), new THREE.MeshBasicMaterial({ visible: false })); hitM.position.y = -0.55; p.add(hitM);
    this.press = new Spring(0, 24, 0.28); this.glow = new Spring(0.5, 8, 0.7); this.alive = new Spring(1, 5, 0.9); this.burst = new Spring(0, 7, 1.0); this.race = 0; this.sweepT = 0;
    this.hit = []; p.traverse((o) => { if (o.isMesh) { o.userData.bell = this; this.hit.push(o); } });
    this.labelG = new THREE.Group(); this.labelG.position.set(0, -2.42, 0.5); p.add(this.labelG); this.setLabel('End Turn', 'SPACE');
  }
  setLabel(t, sub) {
    const k = t + '|' + this.enabled; if (k === this.lbl) return; this.lbl = k;
    for (const c of [...this.labelG.children]) { this.labelG.remove(c); c.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) { m.map?.dispose?.(); m.dispose(); } }); }
    const L = cineText(String(t).toUpperCase(), { height: 0.4, depth: 1.6, bevel: 0.22, style: this.enabled ? 'gold' : 'bronze', maxW: 3.4 }); this.labelG.add(L); this.labelU = L.userData.U; this.labelT = String(t); void sub;
  }
  setEnabled(on) { on = !!on; if (on === this.enabled) return; this.enabled = on; this.restRz = 0; if (!on) this.hover = false; this.setLabel(this.labelT || 'End Turn'); }
  ring() { this.press.kick(-16); this.squash(1.2); this.burst.kick(9); this.race = 1.6; this.sweepT = 0; this.glow.kick(10); audio.play('chime_soft', { vol: 0.85 }); audio.play('magic_shimmer', { vol: 0.6 }); audio.play('clockwork', { vol: 0.35 }); }
  update(dt, ptr) {
    this.t += dt; const t = this.t; const on = this.enabled, hv = on && this.hover;
    if (hv && !this._hv) audio.play('clockwork', { vol: 0.18, minGap: 400 }); this._hv = hv;
    this.alive.target = on ? 1 : 0; this.glow.target = on ? (hv ? 1.6 : 0.75) : 0.05;
    for (const s of [this.press, this.glow, this.alive, this.burst]) s.update(dt); this.updateBody(dt, on ? ptr : null);
    const al = Math.max(0, Math.min(1, this.alive.value)), gl = Math.max(0, this.glow.value);
    // breathe: a slow bob and turn (still when time is the foes')
    this.appleG.position.y = 0.32 + Math.sin(t * 1.25) * 0.07 * al + (hv ? 0.1 : 0);
    this.appleG.rotation.y += dt * (0.22 + (hv ? 0.5 : 0) + this.race * 3) * al; this.appleG.rotation.z = Math.sin(t * 0.9) * 0.05 * al;
    const pr = this.press.value; this.apple.scale.set(1 - pr * 0.012, 1 + pr * 0.016, 1 - pr * 0.012);
    // the shimmer sweep crosses every few seconds (and right away on hover / press)
    this.sweepT += dt * (hv ? 0.9 : 0.42); if (this.sweepT > 2.6) this.sweepT = 0; this.U.uSweep.value = -1.6 + this.sweepT * 1.6;
    this.U.uShine.value = (0.45 + gl * 0.5) * (0.25 + 0.75 * al); this.U.uRimK.value = 0.12 + (hv ? 0.85 : 0.18) * al + Math.max(0, gl - 1.6) * 0.3; this.U.uCrack.value = 0.15 + al * (0.55 + 0.25 * Math.sin(t * 2.1)) + (hv ? 0.4 : 0);
    // dull when disabled: the gold loses its lustre
    const dull = 1 - al; this.goldM.color.setRGB(1 - dull * 0.58, 0.88 - dull * 0.56, 0.63 - dull * 0.42); this.goldM.roughness = 0.3 + dull * 0.45; this.goldM.envMapIntensity = 1.25 - dull * 1.0; this.tickM.emissiveIntensity = (hv ? 0.5 : 0.12) * al + this.race * 0.6;
    // the bezel: steps one hour a second while time is held, races when it is let go
    this.race = Math.max(0, this.race - dt); if (this.race > 0) this.clockT += dt * 14 * this.race; else if (on) { const target = Math.floor(t) * (TAU / 12); this.clockT += (target - this.clockT) * Math.min(1, dt * 14); if (Math.abs(target - this.clockT) > TAU) this.clockT = target; if (hv && Math.floor(t) !== this._tick) { this._tick = Math.floor(t); audio.play('ui_click', { vol: 0.1, rate: 2.2, minGap: 300 }); } }
    this.bezelSpin.rotation.y = -this.clockT;
    // motes: faster on hover, a burst on press, faint when disabled
    this.MU.uT.value += dt * (0.15 + 0.85 * al + (hv ? 1.6 : 0) + this.race * 2); this.MU.uBurst.value = Math.max(0, this.burst.value) * 0.12; this.MU.uAlpha.value = 0.12 + 0.88 * al;
    if (this.labelU) { this.labelU.uShine.value = hv ? 0.8 : 0.2 * al; this.labelU.uSweep.value = -2.2 + ((t * 0.5) % 1.6) * 2.8; this.labelU.uRim.value = 0.6 + al * 0.6; }
    this.labelG.position.y = -2.42 + (hv ? 0.06 : 0);
  }
}
