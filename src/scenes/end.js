// End of a loop: death (the universe resets, the Journal remembers) or the Wilds conquered.
import * as THREE from 'three';
import { Signboard, Strip } from '../ui3d/objects.js';
import { Panel } from '../ui3d/widgets.js';
import { uiPos } from '../ui3d/craft.js';
import { UIScreen, Button3D, tabletopWorld } from '../ui3d/widgets.js';
import { textPlane } from '../ui3d/kit.js';
import { audio } from '../core/audio.js';
import { tweens } from '../core/tween.js';

export class EndScene extends UIScreen {
  async enter(won) {
    this.world = tabletopWorld('end'); await this.world.ready; this.engine.setWorld(this.world.scene, this.world.camera);
    this.engine.setFx({ bloom: [0.8, 0.7, 0.6], tilt: { focus: 0.5, width: 0.2, amount: 3 }, grade: won ? { warmth: 0.8, vignette: 0.5 } : { sat: 0.7, vignette: 0.75, lift: [0.0, 0.0, 0.06] } });
    this.engine.add(this); this.pushInput(); audio.playMusic(won ? 'map' : 'journal');
    const j = this.game.journal; const h = j.history[0] || {}; const H = this.H;
    const title = won ? 'THE WILDS FALL SILENT' : 'THE UNIVERSE RESETS';
    const lines = won
      ? ['The Guardian of the Wilds is down. Beyond the hills,', 'bronze glints: the Trojan War is waiting, and on Olympus', 'the gods have started taking this personally.', '', 'ACT II · THE TROJAN WAR — coming in the next loop of development.']
      : ['Somewhere above, The One Above All flicks the cosmos.', 'Every apple returns to its branch. Every god forgets.', 'Except the Journal. The Journal never forgets.', '', `Loop #${h.loop} ended on floor ${h.floor} · ${h.kills} foes · best hit ${h.bestHit}`];
    const W = this.W; this.t1 = new Signboard([title], { hang: 3, woodR: won ? 'walnut' : 'oak', style: won ? 'gild' : 'carve' }); this.t1.group.scale.setScalar(Math.min(1.4, W * 1.5 / this.t1.w)); uiPos(this.t1.group, 0, H - 2.2, 4); this.root.add(this.t1.group);
    this.t2 = new Panel('', lines.filter(Boolean), { w: Math.min(20, W * 1.6), h: 6 }); uiPos(this.t2.group, 0, 0.0, 3); this.root.add(this.t2.group);
    this.stamp = new Strip(['Recorded in the Journal'], { font: 'head', style: 'stamp', tacks: 0, maxW: 12 }); uiPos(this.stamp.group, Math.min(6, W - 6), -4.0, 6); this.stamp.restRz = 2.4; this.stamp.group.scale.setScalar(0.01); this.root.add(this.stamp.group);
    setTimeout(() => { audio.play('stamp'); this.stamp.group.scale.setScalar(2.6); tweens.to(this.stamp.group.scale, { x: 1, y: 1, z: 1 }, 0.25, { ease: 'outBack' }); this.engine.shake(0.3); }, 1400);
    this.addButton(new Button3D(won ? 'Return to the Cosmos' : 'Try Again', () => this.game.toMenu(), { w: 7, h: 1.4, size: 60, color: won ? 'teal' : 'purple' }), 0, -H + 1.8, 2);
  }
  update(dt, t) { this.world.update(dt, t); this.updateUI(dt); this.t1.update(dt, null, t); this.t2.update(dt, null); this.stamp.update(dt, null); }
}
