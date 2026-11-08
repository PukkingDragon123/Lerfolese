// End of a loop: death (the universe resets, the Journal remembers) or the Wilds conquered.
import * as THREE from 'three';
import { domText } from '../ui/hud.js';
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
    this.t1 = domText([[[title, won ? '#ffe08a' : '#cdb6f0']]], { w: 26, h: 2.4, font: 'Pixelify', size: 150, weight: 700, stroke: ['#22183f', 22] }); this.t1.position.set(0, H - 3, 4); this.root.add(this.t1);
    this.t2 = domText(lines.map((l) => [[l, '#f3e6c4']]), { w: 24, h: 6, font: 'VT323', size: 64, stroke: ['#1a1220', 10], lineH: 1.15 }); this.t2.position.set(0, 0.2, 4); this.root.add(this.t2);
    this.stamp = domText([[['RECORDED IN THE JOURNAL', '#c8443a']]], { w: 12, h: 1.4, font: 'Pixelify', size: 80, weight: 700, stroke: ['#3a0f18', 6] }); this.stamp.position.set(6, -4.2, 6); this.stamp.rotation.z = 0.12; this.stamp.scale.setScalar(3); this.root.add(this.stamp);
    setTimeout(() => { audio.play('stamp'); tweens.to(this.stamp.scale, { x: 1, y: 1, z: 1 }, 0.25, { ease: 'outBack' }); this.engine.shake(0.3); }, 1400);
    this.addButton(new Button3D(won ? 'Return to the Cosmos' : 'Try Again', () => this.game.toMenu(), { w: 7, h: 1.4, size: 60, color: won ? 'teal' : 'purple' }), 0, -H + 1.8, 2);
  }
  update(dt, t) { this.world.update(dt, t); this.updateUI(dt); this.t1.position.y = this.H - 3 + Math.sin(t) * 0.1; }
}
