// Floating 3D labels: crisp pixel lettering that hangs in the air beside a scene object and drifts softly, made like
// cut-out metal letters: an ink outline, a 2-texel extruded side (so they read as thick, physical letters), a face in
// a brass ramp (lit top rows, shaded bottom rows) or pale engraved bone for the small hint line. Fonts at native size
// (Alagard 16 for titles, PixelSans 11 for hints), nearest-filtered, with the texel sized so one font pixel covers
// about three screen pixels at 1080p (two at 720p) from the shot it is designed for. Lit by the scene (Lambert) with a little self-light
// so it stays legible at night; it never glows or blooms. Fades in and out by ordered dithering (stays pixel art).
//   const L = new FloatLabel({ title: 'Star Gallery', hint: 'the museum & the frog' }, { at: V3, dist: 9 });
//   scene.add(L.mesh); L.update(dt, t, camera); L.show = true|false; L.hot = hovered
import * as THREE from 'three';
import { FONT, measure, drawPixelText } from './craft.js';
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
