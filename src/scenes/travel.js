// The road between curiosities of the map: Sir Isaac walks a stretch of it in the same golden stage, the chronicle
// narrating, before the shop / laboratory (<= 5 s; click or Space skips). Battles and events stage their own walk-in.
import * as THREE from 'three';
import { realStage } from '../models/realworld.js';
import { stageLights, ContactShadows, GRADE_TRAVEL } from '../gfx/lighting.js';
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
      this.engine.setFx({ rays: st.sunPos ? { pos: st.sunPos, strength: 0.4, thresh: 0.8, decay: 0.958, tint: 0xffcf8a } : null, exposure: 1.0, bloom: [0.42, 0.58, 0.84], ao: 1.0, grade: GRADE_TRAVEL });
      this.engine.add(this); audio.setAmbSet(['wilderness']);
      this.shot = travelShot(this, { lines: ['And the road wound on through the Wilds…', WHERE[node?.type] || '…toward a curious sight.'] });
      // the sun follows the walk so the puppet keeps his shadow far from the arena
      const mid = this.shot.walk.path.getPointAt(0.5);
      const box = new THREE.Box3(); for (let k = 0; k <= 8; k++) box.expandByPoint(this.shot.walk.path.getPointAt(k / 8)); box.expandByScalar(6); box.min.y = -0.5; box.max.y = 5;
      stageLights(sc, { theme, sunDir: st.sunDir || new THREE.Vector3(-0.5, 0.6, 0.4), target: mid, box, mapSize: this.engine.quality === 'high' ? 4096 : 2048 }); new ContactShadows(sc, { hAt: st.hAt });
      this._ready();
      await this.shot.done;
    } finally { this._ready(); }
  }
  update(dt, t) { this.prof?.update(dt); this.wear?.update(dt); this.critters?.update(dt, t); }
  dispose() { this.engine.remove(this); this.shot?.abort(); }
}
