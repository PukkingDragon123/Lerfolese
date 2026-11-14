// New Run -> the night sky: twinkling stars, a slow galaxy band, shooting stars, and a floating astral UI: a spinning
// golden apple circled by an engraved brass orbit ring and a small ringed planet, joined by star-chart lines to four
// character constellations. Isaac's draws itself line by line with his silhouette filled in fine stars; the other three
// are sealed (dim stars shaped as a question mark). Labels are engraved brass plates in Alagard. Picking Isaac dives the
// camera into his constellation and starts the run.
import * as THREE from 'three';
import { UIScreen } from '../ui3d/widgets.js';
import { makeApple, plaque } from '../models/orchard.js';
import * as T from '../models/toon.js';
import { Note } from '../ui3d/kit.js';
import { audio } from '../core/audio.js';
import { mulberry32 } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const ease5 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };

// the night: deep gradient, a galaxy band of fbm dust with dark lanes, star field with twinkle
function nightDome() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uTime: T.WIND.time },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform float uTime; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1, 0, 0)), f.x), mix(h(i + vec3(0, 1, 0)), h(i + vec3(1, 1, 0)), f.x), f.y), mix(mix(h(i + vec3(0, 0, 1)), h(i + vec3(1, 0, 1)), f.x), mix(h(i + vec3(0, 1, 1)), h(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += n(p) * a; p = p * 2.07 + 3.1; a *= 0.5; } return s; }
      void main(){ vec3 d = normalize(vD); vec3 c = mix(vec3(0.025, 0.03, 0.09), vec3(0.06, 0.05, 0.16), smoothstep(-0.3, 0.6, d.y));
        vec3 bn = normalize(vec3(0.35, 0.55, 0.75)); float b = dot(d, bn); vec3 q = d * 3.0 + vec3(uTime * 0.004, 0.0, 0.0);
        float band = exp(-b * b / 0.035) * (0.55 + 0.75 * fbm(q * 1.6)); float lanes = smoothstep(0.45, 0.75, fbm(q * 3.2 + 7.0)) * exp(-b * b / 0.008);
        vec3 gal = mix(vec3(0.32, 0.18, 0.5), vec3(0.55, 0.42, 0.75), fbm(q * 2.5)) + vec3(0.25, 0.2, 0.12) * exp(-b * b / 0.004);
        c += gal * band * 0.55 * (1.0 - lanes * 0.8);
        c = floor(c * 48.0 + 0.5) / 48.0; gl_FragColor = vec4(c, 1.0); }` });
  const s = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), m); s.frustumCulled = false; s.renderOrder = -10; s.userData.noInk = true; return s;
}
const STAR_VS = 'attribute vec3 aC; attribute vec2 aS; uniform float uTime, uK, uPx; varying vec3 vC; varying float vBig; void main(){ vC = aC * (0.65 + 0.35 * sin(uTime * (1.0 + aS.y * 3.0) + aS.x * 50.0)) * uK; vBig = step(0.94, aS.x); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (1.6 + aS.y * 1.6 + vBig * 4.5) * uPx; }';
const STAR_FS = 'varying vec3 vC; varying float vBig; void main(){ vec2 p = gl_PointCoord - 0.5; float cr = max(step(abs(p.x), 0.08) * step(abs(p.y), 0.5) * (1.0 - abs(p.y) * 1.6), step(abs(p.y), 0.08) * step(abs(p.x), 0.5) * (1.0 - abs(p.x) * 1.6)); float core = step(length(p), 0.2); float a = mix(core, max(core, cr), vBig); if (a < 0.05) discard; gl_FragColor = vec4(vC * a, 1.0); }';
function starPoints(list, { k = 1, px = 1 } = {}) { // list: [x, y, z, r, g, b, seed, size]
  const P = [], Cc = [], S = []; for (const s of list) { P.push(s[0], s[1], s[2]); Cc.push(s[3], s[4], s[5]); S.push(s[6], s[7]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 2));
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: T.WIND.time, uK: { value: k }, uPx: { value: px } }, vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.onBeforeRender = (rd) => { T.tickWind(); m.uniforms.uPx.value = rd.domElement.height / 720 * 1.4; }; return pts;
}
// Isaac Newton in stars: a figure with flowing hair raising an apple; key stars, chart lines, and a silhouette of fine stars
const ISAAC = { stars: [[0.1, 3.0], [0.45, 2.78], [0.38, 2.35], [-0.35, 2.15], [-0.42, 1.88], [0.62, 1.95], [1.02, 2.3], [1.12, 2.9], [1.26, 3.28], [0.15, 1.1], [-0.58, 0.3], [0.72, 0.36], [-0.22, -0.3], [0.48, -0.3]],
  lines: [[0, 1], [1, 2], [2, 5], [0, 3], [3, 4], [5, 6], [6, 7], [7, 8], [4, 9], [5, 9], [9, 10], [9, 11], [10, 12], [11, 13]],
  outline: [[0.1, 3.02], [0.47, 2.8], [0.42, 2.35], [0.66, 2.0], [1.0, 2.24], [1.16, 2.86], [1.02, 2.96], [0.86, 2.42], [0.72, 1.62], [0.76, 0.38], [0.5, -0.32], [0.12, 0.18], [-0.24, -0.32], [-0.62, 0.3], [-0.46, 1.86], [-0.4, 2.2], [-0.16, 2.76]] };
const QMARK = { stars: [[-0.42, 2.0], [-0.2, 2.42], [0.22, 2.5], [0.52, 2.15], [0.38, 1.7], [0.05, 1.42], [0.0, 0.95], [0.0, 0.4]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] };
const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

function constellation(def, { at, locked = false, seed = 1 } = {}) {
  const G = new THREE.Group(); G.position.copy(at); const r = mulberry32(seed); const s = 0.95;
  const col = locked ? [0.45, 0.5, 0.7] : [1.0, 0.92, 0.7];
  const key = def.stars.map(([x, y], i) => [x * s, (y - 1.35) * s, 0, ...col, r(), locked ? 0.4 : i === 8 ? 1.0 : 0.75]);
  const stars = starPoints(key, { k: locked ? 0.55 : 1.4 }); G.add(stars);
  const P = []; for (const [a, b] of def.lines) { P.push(key[a][0], key[a][1], 0, key[b][0], key[b][1], 0); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  const lm = new THREE.LineBasicMaterial({ color: locked ? new THREE.Color(0.35, 0.4, 0.6) : new THREE.Color(1.4, 1.15, 0.7), transparent: true, opacity: locked ? 0.45 : 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(lg, lm); lines.frustumCulled = false; G.add(lines); lg.setDrawRange(0, 0);
  let fill = null; if (def.outline) { const pts = []; for (let i = 0; i < 2600 && pts.length < 220; i++) { const x = -0.8 + r() * 2.2, y = -0.4 + r() * 3.8; if (inPoly(x, y, def.outline)) pts.push([x * s, (y - 1.35) * s, -0.02, 0.55, 0.62, 1.0, r(), 0.15]); } fill = starPoints(pts, { k: 0 }); G.add(fill); }
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), new THREE.MeshBasicMaterial({ visible: false })); G.add(hit);
  return { group: G, stars, lines, fill, hit, nLines: def.lines.length, locked };
}

export class SkyScene extends UIScreen {
  async enter() {
    const sc = (this.scene = new THREE.Scene()); sc.add(nightDome());
    const r = mulberry32(42); const field = []; for (let i = 0; i < 2600; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2; const s = Math.sqrt(1 - u * u); const d = V(s * Math.cos(a), u, s * Math.sin(a)); const warm = r(); field.push([d.x * 150, d.y * 150, d.z * 150, warm < 0.2 ? 1 : 0.8, warm < 0.6 ? 0.9 : 0.85, warm > 0.8 ? 1.0 : 0.85, r(), r() * r()]); }
    sc.add(starPoints(field, { k: 1.1 }));
    // shooting stars
    this.shooters = []; const stex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.85, 'rgba(220,230,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 2, 128, 4); return new THREE.CanvasTexture(c); })();
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.12), new THREE.MeshBasicMaterial({ map: stex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; m.userData.noInk = true; sc.add(m); this.shooters.push({ m, t: -1 - i * 2.3 }); }
    // the astral UI
    const astral = (this.astral = new THREE.Group()); sc.add(astral);
    const key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(-3, 5, 8); const fill = new THREE.DirectionalLight(0x8aa0ff, 1.2); fill.position.set(5, -2, 4); sc.add(key, fill, new THREE.AmbientLight(0x6a6aa0, 0.8));
    const apple = (this.apple = makeApple({ s: 1.15, ripe: 1 })); apple.children[0].material.color.set('#e8b030'); apple.position.set(0, -0.35, 0); astral.add(apple);
    const ringT = (() => { const S = 256, c = document.createElement('canvas'); c.width = S; c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#a8801e'; g.fillRect(0, 0, S, 8); g.fillStyle = '#f2c84a'; g.fillRect(0, 2, S, 3); g.fillStyle = '#5a3e10'; for (let x = 0; x < S; x += 8) g.fillRect(x, 0, 1, x % 32 ? 3 : 8); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 6; t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 8, 96), new THREE.MeshToonMaterial({ map: ringT, gradientMap: T.gradientMap([0.35, 0.75, 1.0]) })); orbitRing.rotation.x = 1.25; orbitRing.position.copy(apple.position).add(V(0, 0.45, 0)); astral.add(orbitRing); this.orbitRing = orbitRing;
    // the ringed planet: banded pixel globe and a flat ring with pixel bands
    const bands = (cols, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); for (let y = 0; y < h; y++) { g.fillStyle = cols[Math.floor((y / h) * cols.length * 3 + Math.sin(y * 1.7) * 0.6) % cols.length]; g.fillRect(0, y, w, 1); } const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; };
    const planet = (this.planet = new THREE.Group()); astral.add(planet);
    planet.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 40, 24), new THREE.MeshToonMaterial({ map: bands(['#c88a5a', '#e8b880', '#a86a4a', '#f0d0a0', '#8a5a3e'], 8, 32), gradientMap: T.gradientMap([0.3, 0.7, 1.0]) })));
    const rg = new THREE.RingGeometry(0.42, 0.68, 64, 2); { const p = rg.attributes.position, uv = rg.attributes.uv; for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getY(i)); uv.setXY(i, 0.5, (d - 0.42) / 0.26); } }
    const ring = new THREE.Mesh(rg, new THREE.MeshToonMaterial({ map: bands(['#e8d0a0', '#b8986a', '#f4e4c0', '#8a7050'], 4, 32), side: THREE.DoubleSide, gradientMap: T.gradientMap([0.4, 0.8, 1.0]) })); ring.rotation.x = 1.2; planet.add(ring); planet.rotation.z = 0.35;
    // constellations: Isaac (top left) and three sealed ones
    this.cons = [constellation(ISAAC, { at: V(-4.1, 1.15, -0.5), seed: 3 }), constellation(QMARK, { at: V(4.1, 1.15, -0.5), locked: true, seed: 5 }), constellation(QMARK, { at: V(-3.8, -2.35, -0.8), locked: true, seed: 7 }), constellation(QMARK, { at: V(3.8, -2.35, -0.8), locked: true, seed: 9 })];
    this.cons.forEach((c, i) => { astral.add(c.group); c.k = 0; c.hover = 0; c.i = i; });
    // chart lines from the apple to each constellation
    const P = []; for (const c of this.cons) { const a = V(0, 0.1, 0), b = c.group.position.clone().multiplyScalar(0.72); P.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); this.chart = new THREE.LineSegments(cg, new THREE.LineDashedMaterial({ color: new THREE.Color(0.55, 0.6, 1.0), dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); this.chart.computeLineDistances(); astral.add(this.chart);
    // engraved brass plates
    const plate = (text, sub, pos, w) => { const p = plaque(text, { font: 'title', style: 'engrave', kind: 'brass', sub, depth: 0.25 }); const [pw] = p.userData.size; p.scale.multiplyScalar(w / pw); p.position.copy(pos); astral.add(p); return p; };
    this.isaacPlate = plate('Isaac Newton', 'Natural Philosopher', V(-4.1, -0.95, -0.3), 2.2);
    for (const c of this.cons.slice(1)) plate('Sealed', null, c.group.position.clone().add(V(0, -2.05, 0.2)), 1.2);
    this.titlePlate = plate('Choose Your Star', null, V(0, 3.15, -0.6), 3.0);
    this.backPlate = plate('Back to the Garden', null, V(-5.3, -3.9, 0.3), 2.0);
    // camera: starts looking straight up (continuing the garden's tilt), then lowers onto the astral chart
    this.camera = new THREE.PerspectiveCamera(46, this.engine.aspect, 0.1, 500); this.camera.position.set(0, 0, 11.5); this.look = V(0, 0, 0); this.t0 = performance.now();
    this.engine.setWorld(sc, this.camera); this.engine.setFx({ bloom: [1.0, 0.6, 0.6], tilt: false, grade: { sat: 1.1, contrast: 1.08, vignette: 0.55, lift: [0.01, 0.01, 0.04] }, ink: { fade: [30, 90] } });
    this.engine.add(this); this.pushInput(); audio.setAmbSet(['night']); audio.play('magic_shimmer', { vol: 0.6 });
    this.note = new Note({ w: 8, h: 1.3, size: 44, tail: false }); this.root.add(this.note.group);
  }
  rayHit() { const rc = new THREE.Raycaster(); rc.setFromCamera(this.input.ndc, this.camera); const objs = [...this.cons.map((c) => c.hit), this.backPlate]; const h = rc.intersectObjects(objs, true)[0]; if (!h) return null; if (h.object === this.backPlate || h.object.parent === this.backPlate) return 'back'; return this.cons.find((c) => c.hit === h.object) || null; }
  onMove() { const h = this.rayHit(); if (h !== this.hover) { this.hover = h; if (h) audio.play('ui_hover', { vol: 0.4 }); this.engine.renderer.domElement.style.cursor = h ? 'pointer' : ''; } }
  onClick() {
    if (this.diving) return true; const h = this.rayHit(); if (!h) return true;
    if (h === 'back') { audio.play('card_place'); this.game.toMenu({ from: 'sky' }); return true; }
    if (h.locked) { h.kick = 1; audio.play('ui_error', { vol: 0.5 }); this.note.show([[['Not yet written in the stars.', '#2a160c']]], 0, -3.2, 8); clearTimeout(this._nt); this._nt = setTimeout(() => this.note.hide(), 2200); return true; }
    this.diving = { t0: performance.now(), from: this.camera.position.clone(), to: h.group.getWorldPosition(V()).add(V(0.15, 0.3, 0)) }; audio.play('transition_whoosh'); audio.play('magic_shimmer'); return true;
  }
  update(dt, t) {
    const T0 = (performance.now() - this.t0) / 1000; const lower = ease5(T0 / 2.4);
    // tilt down from the zenith onto the chart; the UI assembles: chart lines, constellations drawing themselves
    const pitch = (1 - lower) * 1.25; this.look.set(0, Math.sin(pitch) * 30, 11.5 - Math.cos(pitch) * 30 * (lower > 0.999 ? 1 : 1)).lerp(V(0, 0, 0), lower);
    this.astral.scale.setScalar(0.6 + 0.4 * ease(T0 / 2.6)); this.astral.position.y = (1 - ease(T0 / 2.6)) * -2;
    this.chart.material.opacity = 0.5 * ease((T0 - 1.6) / 1.2);
    this.cons.forEach((c, i) => { const k = ease((T0 - 1.8 - i * 0.25) / (c.locked ? 0.8 : 2.2)); c.lines.geometry.setDrawRange(0, Math.floor(k * c.nLines) * 2); if (c.fill) c.fill.material.uniforms.uK.value = 0.5 * ease((T0 - 3.2) / 1.5) * (1 + c.hover * 0.8);
      c.hover += ((this.hover === c ? 1 : 0) - c.hover) * Math.min(1, dt * 8); c.kick = Math.max(0, (c.kick || 0) - dt * 2); c.group.scale.setScalar(1 + c.hover * 0.06 + Math.sin(c.kick * 20) * 0.04 * c.kick); c.stars.material.uniforms.uK.value = (c.locked ? 0.55 : 1.4) * (1 + c.hover * 0.7); });
    this.apple.rotation.y += dt * 0.9; this.apple.position.y = -0.35 + Math.sin(t * 1.1) * 0.08; this.orbitRing.rotation.z += dt * 0.3;
    const a = t * 0.45; this.planet.position.set(Math.cos(a) * 1.9, -0.05 + Math.sin(a) * 0.5, Math.sin(a) * 1.0); this.planet.rotation.y += dt * 0.6;
    // shooting stars
    for (const s of this.shooters) { s.t += dt; if (s.t > 0.9) { s.t = -2 - Math.random() * 4; s.m.visible = false; } if (s.t >= 0 && !s.m.visible) { s.m.visible = true; s.p0 = V(-30 + Math.random() * 60, 20 + Math.random() * 25, -60 - Math.random() * 30); s.dir = V(-0.8 - Math.random() * 0.4, -0.45, 0).normalize(); s.m.rotation.z = Math.atan2(s.dir.y, s.dir.x); }
      if (s.m.visible) { s.m.position.copy(s.p0).addScaledVector(s.dir, s.t * 60); s.m.material.opacity = Math.sin(Math.min(1, s.t / 0.9) * Math.PI); } }
    // the dive into Isaac's constellation
    if (this.diving) { const u = ease((performance.now() - this.diving.t0) / 1300); this.camera.position.copy(this.diving.from).lerp(this.diving.to, u * 0.96); this.camera.fov = 46 - u * 28; this.camera.updateProjectionMatrix(); this.look.lerp(this.diving.to, Math.min(1, dt * 6));
      if (u >= 1 && !this.diving.done) { this.diving.done = true; this.engine.flash(1, 0xfff6cf, 0.8); this.game.newRun(); } }
    else { const nd = this.input.ndc; this.camera.position.set(nd.x * 0.5, nd.y * 0.3, 11.5); }
    this.camera.lookAt(this.look); this.isaacPlate.rotation.y = Math.sin(t * 0.7) * 0.05;
    this.note.update(dt); this.updateUI(dt);
  }
  dispose() { this.engine.renderer.domElement.style.cursor = ''; super.dispose(); }
}
