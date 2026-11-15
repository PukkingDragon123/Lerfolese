// INTENTS AS AN APPLE TIME-PREDICTION. While you plan, the golden apple foretells the coming turn: beside every foe
// stands its translucent time-forward ECHO (a ghost of the very same rig, tinted with the apple's gold) that performs
// exactly what the foe will do next, on a loop: it lunges at Newton for a blow, braces for a guard, swells for a buff.
// Above the echo hangs one crisp floating number (the exact blow, after Strength, Weak, Blind and Shove) with a thin
// clock hand ticking beside it; under it, only when it matters, a short readout of the forecast (what actually gets
// past your Block, a stun, a dodge). Hover a foe or the golden apple and the echoes brighten and their labels show.
// The numbers come from the battle's exact forecast (Battle.forecast), so the echo never lies.
import * as THREE from 'three';
import { FloatText } from '../ui3d/floatlabel.js';
import { createCreature } from '../models/creatures.js';
import { Spring } from '../core/tween.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
// the echo's material: the apple's gold, a cool fresnel rim, a slow band of "time" rolling down it, crisp (no blur)
function ghostMat() {
  const U = { uT: { value: 0 }, uA: { value: 0 }, uTint: { value: new THREE.Color(1.0, 0.82, 0.42) } };
  const m = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffc860, emissiveIntensity: 0.55, roughness: 0.6, metalness: 0, transparent: true, depthWrite: false, opacity: 0.3 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uA; uniform vec3 uTint; varying vec3 vWP;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      { float fr = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))); fr = fr * fr;
        float band = step(0.82, fract(vWP.y * 1.6 - uT * 0.55)) * 0.35; // a slow scan of time rolling down the echo
        float px = step(0.5, fract(floor(gl_FragCoord.x * 0.5) * 0.5 + floor(gl_FragCoord.y * 0.5) * 0.5)); // a fine pixel dither: crisp, never soft
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uTint * 1.4, fr * 0.7) + uTint * band * 0.25;
        gl_FragColor.a = uA * (0.18 + fr * 0.6 + band * 0.25) * (0.82 + 0.18 * px); }`);
  };
  m.customProgramCacheKey = () => 'apple-echo'; m.userData.U = U; return m;
}

// a thin golden clock hand (a needle and a counterweight) that ticks once a second beside each number
function clockHand() {
  const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, toneMapped: false, depthWrite: false });
  const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.62), mat); needle.position.y = 0.26; const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), mat); tail.rotation.z = Math.PI / 4; tail.position.y = -0.08;
  const pin = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x8a5a1a, toneMapped: false, transparent: true, depthWrite: false })); pin.position.z = 0.01; pin.rotation.z = Math.PI / 4;
  const hand = new THREE.Group(); hand.add(needle, tail); g.add(hand, pin); g.userData.hand = hand; g.userData.mats = [mat, pin.material]; g.renderOrder = 21; return g;
}

const COL = { you: '#ff8a6a', youSoft: '#ffc8b6', guard: '#9fd6ff', buff: '#ffd36a', curse: '#d6a8ff', none: '#e6dccb', ok: '#bfe8a6' };
const SHORT = { gaze: 'Petrifies 2 cards', steal: 'Steals your top used card', acid: 'Frail: Block −25%', hex: 'Rots 2 cards', devour: 'Eats 2 draw cards', nibble: 'Discards 1 card', riddle: 'Weak + Vulnerable', bolt: 'Frail + Vulnerable', brood: 'Lays a brood', flee: 'Runs off with the loot!', spill: 'Spills wine (flammable)', sprout: 'Grows 2 heads', frost: 'Cools your apple −4', bask: 'Strength = Heat ÷ 3', crescendo: 'Pressure +1', shatter: 'The note shatters', breath: 'Burn 3', hiss: 'Weak 2 + Vulnerable', munch: 'Heals 2', snort: 'Strength', flute: 'Strength to all', nimble: 'Dodges 1 hit', coil: 'Keeps its Block', wind: 'Winds up', attract: 'Polarity S next' };

class Echo {
  constructor(L, e) {
    this.L = L; this.e = e; this.uid = e.uid; this.small = !!(e.def.isHead || e.def.minion); this.t = Math.random() * 2; this.k = new Spring(0, 9, 0.9); this.hl = new Spring(0, 10, 0.8); this.key = '';
    this.num = new FloatText(null, { font: 'big', align: 'center', lighten: false, depth: 0.12 }); this.sub = new FloatText(null, { font: 'tiny', align: 'center', lighten: false }); this.lab = new FloatText(null, { font: 'tiny', align: 'center', lighten: false });
    for (const T of [this.num, this.sub, this.lab]) L.S.ui.root.add(T.group);
    this.hand = clockHand(); L.S.ui.root.add(this.hand);
    this.ghost = null; this.mat = null; this.wantGhost = !this.small;
  }
  build() { // the echo: the very same creature, built again, every surface swapped for the apple's gold glass
    if (this.ghost || !this.wantGhost) return; this.wantGhost = false;
    try {
      const S = this.L.S; const v = S.enemyViews.get(this.uid); if (!v) return; const g = createCreature(this.e.id, this.uid.length); const s = v.api.root.scale.x;
      g.root.scale.setScalar(s); this.mat = ghostMat(); g.root.traverse((o) => { if (o.isMesh) { o.material = this.mat; o.castShadow = false; o.receiveShadow = false; o.renderOrder = 5; o.userData.noInk = true; } });
      g.root.rotation.y = v.api.root.rotation.y; S.scene.add(g.root); this.ghost = g; this.h = v.h;
    } catch (err) { console.warn('echo', this.e.id, err); }
  }
  set(sc) {
    const key = sc ? JSON.stringify(sc) : ''; if (key === this.key) return; this.key = key; this.sc = sc;
    if (!sc) { this.num.hide(); this.sub.hide(); this.lab.hide(); this.k.target = 0; return; }
    const big = this.small ? 'head' : 'big';
    this.num.set([[[sc.num, sc.col]]], { fonts: [big] }); this.num.show(); this.num.pop.kick(3);
    if (sc.sub) { this.sub.set([[[sc.sub, sc.subCol || COL.none]]], { fonts: ['tiny'] }); this.sub.show(); } else this.sub.hide();
    this.lab.set([[[(sc.label || '').toUpperCase(), '#efe4cf']]], { fonts: ['tiny'] }); this.k.target = 1; this.t = 0;
  }
  // the loop: appear, perform, hold, fade (2.8 s), so the echo reads as a glimpse of the future, never a second foe
  update(dt, show, focus) {
    const S = this.L.S; const v = S.enemyViews.get(this.uid); const sc = this.sc; this.t += dt; this.k.update(dt); this.hl.target = focus ? 1 : 0; this.hl.update(dt);
    const vis = !!(show && v && sc && this.e.alive); const T = this.t % 2.8, ph = T / 2.8; if (vis && this.wantGhost && this.t > 0.25) this.build();
    if (this.ghost) {
      const G = this.ghost; G.root.visible = vis && this.k.value > 0.02;
      if (G.root.visible) {
        const home = v.api.root.position; const toward = S.prof.root.position; const atk = sc.kind === 'attack';
        const fade = Math.min(1, ph / 0.12) * (1 - Math.max(0, (ph - 0.78) / 0.22)); const lunge = atk ? Math.sin(Math.min(1, Math.max(0, (ph - 0.1) / 0.45)) * Math.PI * 0.5) : 0;
        _v.copy(toward).sub(home).setY(0); const d = _v.length(); _v.normalize(); const reach = atk ? Math.min(2.2, d * 0.45) : 0.35;
        G.root.position.copy(home).addScaledVector(_v, 0.25 + reach * lunge); G.root.position.y = home.y; G.root.rotation.y = v.api.root.rotation.y;
        if (T < dt * 1.5 || (this.lastPh > ph)) { G.act?.(atk ? 'attack' : sc.kind === 'guard' || sc.kind === 'buff' ? 'cast' : 'cast'); } this.lastPh = ph;
        G.update(dt); const U = this.mat.userData.U; U.uT.value += dt; U.uA.value = fade * this.k.value * (0.62 + this.hl.value * 0.38);
      }
    }
    // the number, its clock hand and the readout, crisp in the UI layer over the echo's head
    if (!v) return; const head = (this.ghost?.root.visible ? this.ghost.root.position : v.api.root.position); _w.copy(head); _w.y += (this.small ? 0.9 : (v.h || 1.6) + 0.35); const p = S.engine.worldToUI(_w);
    const z = 4.2, kz = (40 - z) / 40; const s = (this.small ? 0.7 : 0.95) * (1 + this.hl.value * 0.12) * kz;
    for (const [T, dy] of [[this.num, 0], [this.sub, -0.95], [this.lab, 0.95]]) { T.group.position.set(p.x * kz, (p.y + dy * (this.small ? 0.75 : 1)) * kz, z); T.group.scale.setScalar(s); T.update(dt); }
    if (vis) { this.num.show(); if (sc.sub) this.sub.show(); if (focus && sc.label && !this.small) this.lab.show(); else this.lab.hide(); } else { this.num.hide(); this.sub.hide(); this.lab.hide(); }
    const H = this.hand; H.visible = vis && !this.small; if (H.visible) { const tick = Math.floor(this.L.t) + Math.min(1, (this.L.t % 1) * 8); H.userData.hand.rotation.z = -tick * (Math.PI / 6); H.position.set((p.x - (this.num.w * 0.5 + 0.45) * (s / kz)) * kz, (p.y + 0.05) * kz, z); H.scale.setScalar(s * 0.9); for (const m of H.userData.mats) m.opacity = Math.min(1, this.num.fade.value) * 0.95; }
  }
  dispose() { for (const T of [this.num, this.sub, this.lab]) T.dispose(); this.hand.parent?.remove(this.hand); if (this.ghost) { this.ghost.root.parent?.remove(this.ghost.root); this.ghost = null; } this.mat?.dispose(); }
}

export class IntentLayer {
  constructor(S) { this.S = S; this.echoes = new Map(); this.t = 0; S.engine.add(this); }
  /** what a foe will do, readable: { num, col, sub, kind, label } from its intent and the battle's exact forecast */
  scene(e) {
    const B = this.S.battle; const it = e.intent; if (!e.alive || !it || B?.over) return null;
    const fc = this.S.fc?.foes?.[e.uid]; const act = fc?.acts?.[0]; const atk = it.kind === 'attack' || (it.dmg && it.kind !== 'block');
    const hits = it.dmg ? it.hits || 1 : 1; const per = atk ? Math.max(0, B.attackValue(e, it.dmg || 0) - (e.st.shoved || 0)) : 0; const label = it.label || '';
    if (e.st.stun) return { num: 'ZZZ', col: COL.ok, sub: 'Stunned: skips this turn', kind: 'none', label };
    if (e.def.stall && e.st.weak && it.kind === 'attack') return { num: '0', col: COL.ok, sub: 'Weak: its swing stalls', kind: 'none', label };
    if (atk) {
      const num = `${per}${hits > 1 ? '×' + hits : ''}`; let sub = SHORT[it.id] || ''; let subCol = COL.youSoft;
      if (act && this.S.fc && !this.S.fc.won) { const raw = per * hits; if (act.dmg === 0 && raw > 0) { sub = act.blocked ? `all ${act.blocked} blocked` : e.st.dizzy ? 'Dizzy: hits its friend' : sub || 'misses you'; subCol = COL.ok; } else if (act.dmg < raw) { sub = `you take ${act.dmg}`; subCol = COL.youSoft; } }
      if (it.status) { const s = Object.entries(it.status).map(([k, n]) => `${k.toUpperCase()} ${n}`).join(' · '); sub = sub ? `${sub} · ${s}` : s; }
      if (it.venom) sub = sub ? `${sub} · VENOM ${it.venom}` : `VENOM ${it.venom}`;
      return { num, col: COL.you, sub, subCol, kind: 'attack', label };
    }
    if (it.kind === 'block') return { num: `+${it.block}`, col: COL.guard, sub: it.str ? `Block · Strength +${it.str}` : e.def.keepBlock ? 'Block (kept!)' : 'Block', kind: 'guard', label };
    if (it.kind === 'buff') { const n = it.id === 'bask' ? Math.max(1, Math.floor((B.heatOn() ? B.heat : 0) / 3)) : it.str || it.evade || it.heal || ''; return { num: n ? `+${n}` : '+', col: COL.buff, sub: SHORT[it.id] || (it.evade ? 'Dodges 1 hit' : 'Strength'), kind: 'buff', label }; }
    if (it.kind === 'special') return { num: '!', col: COL.curse, sub: SHORT[it.id] || label, kind: 'special', label };
    if (it.kind === 'debuff') return { num: '!', col: COL.curse, sub: SHORT[it.id] || 'A curse on you', kind: 'curse', label };
    return { num: '…', col: COL.none, sub: SHORT[it.id] || '', kind: 'none', label };
  }
  refresh(e) {
    const S = this.S; if (!S.ui?.root) return; let x = this.echoes.get(e.uid);
    if (!x) { if (!e.alive) return; x = new Echo(this, e); this.echoes.set(e.uid, x); }
    x.set(this.scene(e));
  }
  refreshAll() { for (const e of this.S.battle?.enemies || []) this.refresh(e); }
  update(dt) {
    const S = this.S; if (!S.battle) return this.dispose(); this.t += dt;
    const plan = S.battle.phase === 'player' && !S.dilemmaOn && !S.choosing && !S.cine && !S.done && !S.busy;
    const appleHover = !!S.hudB?.bell?.hover; const foeHover = S._foeTip;
    for (const [uid, x] of this.echoes) { if (!x.e.alive && !x.ghost?.root.visible && x.k.value < 0.02) { x.dispose(); this.echoes.delete(uid); continue; } x.update(dt, plan, appleHover || foeHover === uid); }
  }
  dispose() { this.S.engine.remove(this); for (const x of this.echoes.values()) x.dispose(); this.echoes.clear(); }
}
