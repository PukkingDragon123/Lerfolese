// The road between curiosities of the map: Sir Isaac walks a stretch of it in the same golden stage, the chronicle
// narrating, before the shop / laboratory (<= 5 s; click or Space skips). Battles and events stage their own walk-in.
import * as THREE from 'three';
import { realStage } from '../models/realworld.js';
import { buildStage } from '../models/world.js';
import { createProfessor } from '../models/professor.js';
import { wearArtifacts } from '../models/wearables.js';
import { Critters } from '../gfx/critters.js';
import { travelShot } from './cinematic.js';
import { audio } from '../core/audio.js';

const THEMES = ['meadow', 'garden', 'gully'];
const WHERE = {
  shop: '…toward a barrel by the wayside, where a cynic sold his wares.',
  lab: '…toward a hermit’s workshop, smelling of brass and ozone.',
};

export class TravelScene {
  constructor(game) { this.game = game; this.engine = game.engine; this.input = game.input; this.ready = new Promise((r) => (this._ready = r)); }
  async play(node) {
    try {
      const row = node?.row ?? 0; const theme = THEMES[row % THEMES.length]; const seed = 60 + row * 3;
      const sc = (this.scene = new THREE.Scene()); let st;
      try { st = await realStage(theme, seed, this.engine.renderer); sc.environment = st.env; sc.environmentIntensity = 0.5; }
      catch (e) { console.warn('travel stage fallback', e); st = buildStage(theme, seed); }
      sc.add(st.group); this.stage = st; sc.fog = st.fog || new THREE.Fog(0xb07c62, 26, 90);
      this.prof = createProfessor(); sc.add(this.prof.root); this.wear = wearArtifacts(this.prof, this.game?.run?.items);
      this.camera = new THREE.PerspectiveCamera(36, this.engine.aspect, 0.1, 400);
      this.critters = new Critters(40); this.critters.bounds = { x: [-30, 10], y: [1.5, 9], z: [-12, 22] }; sc.add(this.critters.mesh);
      sc.updateMatrixWorld(true); for (const t of st.trees || []) this.critters.perchesFrom(t, 3);
      this.critters.spawnBirds(10, ['sparrow', 'swallow', 'hoopoe', 'dove']); st.animals?.(this.critters);
      this.engine.setWorld(sc, this.camera);
      this.engine.setFx({ rays: st.sunPos ? { pos: st.sunPos, strength: 0.4 } : null, exposure: 0.92, bloom: [0.55, 0.6, 0.78], grade: { sat: 1.06, contrast: 1.08, vignette: 0.5, grain: 0.05, warmth: 0.35, lift: [0.02, 0.006, 0.045], gain: [1.05, 0.99, 0.92], rolloff: 0.6, toe: 0.025 } });
      this.engine.add(this); audio.setAmbSet(['wilderness']);
      this.shot = travelShot(this, { lines: ['And the road wound on through the Wilds…', WHERE[node?.type] || '…toward a curious sight.'] });
      // the sun follows the walk so the puppet keeps his shadow far from the arena
      const mid = this.shot.walk.path.getPointAt(0.5);
      const sun = new THREE.DirectionalLight(0xffb070, 2.5); const sd = (st.sunDir || new THREE.Vector3(-0.5, 0.6, 0.4)).clone().normalize();
      sun.target.position.copy(mid); sun.position.copy(sun.target.position).addScaledVector(sd, 22); if (sun.position.y < 6) sun.position.y = 6;
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
      sc.add(sun, sun.target, new THREE.HemisphereLight(0x8a98d8, 0x4a2c1a, 0.38));
      this._ready();
      await this.shot.done;
    } finally { this._ready(); }
  }
  update(dt, t) { this.prof?.update(dt); this.wear?.update(dt); this.critters?.update(dt, t); }
  dispose() { this.engine.remove(this); this.shot?.abort(); }
}
