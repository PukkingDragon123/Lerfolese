// THE TUTORIAL FIGHT of the prologue: kid Isaac vs the FAT RACCOON in the old garden, on the real battle system
// (BattleScene + Battle), with a forced three-card deck (Apple, Force, Spin) and the old teacher at the edge of the
// stage, teaching forces between turns (voiced, floating 3D text, cinematic two-shots through the battle's ShotCam).
//   const { run, encounter } = tutorialBattle(game);  ->  new BattleScene(game).run(run, encounter)
// BattleScene only knows three small hooks: encounter.theme, encounter.tutorial.hero(S) and encounter.tutorial.on(event, S, ...).
import * as THREE from 'three';
import { newRun } from '../game/run.js';
import { createKidIsaac, createTeacher, THROW_RELEASE } from '../models/npcs/story.js';
import { fsay, fstop } from './floattext.js';
import { audio } from '../core/audio.js';
import { computeMove, flatten } from '../game/combos.js';
import { DIFF } from '../game/battle.js';
import { gardenFrame } from './gardencam.js';

// the tutorial raccoon is not scaled by the run's HARD difficulty
DIFF.per.raccoon = 1 / DIFF.hp.normal; DIFF.dmgPer.raccoon = 1 / DIFF.dmg.normal; // 40 HP (three turns of lessons), blows of 2 and 3: a first fight you cannot lose

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000 / Math.max(1, Math.min(2, window.__storyFast || 1))));
const card = (id, i) => ({ uid: 'tut-' + id + i, id, type: 'basic', up: 0 });

// ---------------------------------------------------------------- the tutorial's camera: framings computed from where
// the actors really stand (never hard-coded spots that leave the speaker out of frame), always from the audience side
const headOf = (o, h) => o.root.position.clone().add(V(0, h, 0));
const halfH = (S, fov) => Math.atan(Math.tan((fov * Math.PI) / 360) * (S.engine.aspect || 16 / 9)); // half horizontal fov
/** a two-shot of A and B (world points at head height): both inside the frame with air round them, seen from in front */
function twoShot(S, A, B, { fov = 28, pad = 0.9, lift = 0.3, bias = 0.5 } = {}) {
  const mid = A.clone().lerp(B, 0.5); const ab = B.clone().sub(A).setY(0); const len = ab.length() || 1;
  const n = V(-ab.z, 0, ab.x).normalize(); if (n.z < 0) n.negate(); n.lerp(V(0, 0, 1), bias).normalize(); // the audience side, turned toward the battle axis
  const across = Math.abs(ab.clone().normalize().dot(V(n.z, 0, -n.x))) * len; // the pair's width as the camera sees it
  const d = Math.max(3.4, (across / 2 + pad) / Math.tan(halfH(S, fov) * 0.9));
  return { pos: mid.clone().addScaledVector(n, d).add(V(0, lift, 0)), look: mid.clone().add(V(0, -0.08, 0)), fov };
}
/** over the shoulder of `from` (a world point at head height) toward `to`, from the audience side */
function overShoulder(S, from, to, { back = 1.9, side = 0.95, lift = 0.04, fov = 30 } = {}) { // at head level: never looking down onto a scalp
  const d = to.clone().sub(from).setY(0).normalize(); const sd = V(-d.z, 0, d.x); if (sd.z < 0) sd.negate();
  return { pos: from.clone().addScaledVector(d, -back).addScaledVector(sd, side).add(V(0, lift, 0)), look: to.clone().lerp(from, 0.18), fov };
}

/** kid Isaac wearing the hero API the battle expects (root, headWorld, act('throw'|'eat'|'cast'|'hurt'|'die'|'dodge'|'cheer'), lookAt(x, y), ...) */
export function kidHero() {
  const k = createKidIsaac(); const look = V(); const EX = { smug: 'smile', delight: 'happy', annoyed: 'angry', hurt: 'pain', shock: 'surprised', think: 'think' };
  let mode = 'idle', mt = 0, dodge = 0, dir = 1; const base = k.update;
  const api = {
    kid: k, root: k.root, body: k.body, head: k.head, isKid: true, get mode() { return mode; },
    headWorld: (o = V()) => k.headWorld(o), headTopWorld: (o = V()) => k.headWorld(o).add(V(0, 0.16, 0)), handWorld: (i = 1, o = V()) => k.handWorld(i, o), appleWorld: (o = V()) => k.handWorld(1, o),
    act(m, opts = {}) { mode = m; mt = 0; const map = { throw: 'throw', eat: 'reach', cast: 'present', hurt: 'hurt', hit: 'hurt', die: 'alarm', cheer: 'cheer', think: 'think', bonk: 'hurt', dodge: null }; if (m === 'dodge') { dodge = 1; dir = opts.dir || (Math.random() < 0.5 ? -1 : 1); } else if (map[m]) k.act(map[m]); if (m === 'eat') k.setExpr('happy', 1.5); if (m === 'die') k.setExpr('fear', 3); },
    lookAt(x, y) { look.set(x, y, 0); },
    setExpr(e, hold) { k.setExpr(EX[e] || e, hold || 1.6); }, talk(s) { k.talk(s); },
    setIdleMode() {}, attach() {}, detach() {}, boneWorld: (n, o = V()) => (k.bones[n] ? k.bones[n].getWorldPosition(o) : k.headWorld(o)),
    impactTime: THROW_RELEASE,
    update(dt) {
      mt += dt; if (mt > 1.4) mode = 'idle';
      k.lookAtWorld(() => { k.root.updateMatrixWorld(true); return k.root.localToWorld(V(-look.x * 2.2, 1.25 + look.y * 1.2, 3)); });
      if (dodge > 0) { dodge = Math.max(0, dodge - dt * 2.2); const u = Math.sin(dodge * Math.PI); k.body.position.x = dir * u * 0.35; k.st.lean = -u * 0.15; } else { k.body.position.x *= 0.8; k.st.lean = 0; }
      base(dt);
    },
  };
  return api;
}

export const tutorialFraming = { twoShot, overShoulder, headOf, gardenFrame }; // (also used by the camera review tooling)

/** the run and the encounter for the tutorial battle; lines: the teacher's script (voiced) */
export function tutorialBattle(game) {
  const run = newRun(4242); run.deck = ['apple', 'force', 'spin', 'stone'].map(card); // (the Stone: to hide behind, the Block lesson) run.items = []; run.player = { hp: 30, maxHp: 30 }; run.tutorial = true;
  let teacher = null, upd = null; const said = new Set();
  const frame = (S, f) => { gardenFrame(f.pos, f.look); return S.shotCam?.shot?.(f.pos, f.look, { speed: 2.0, fov: f.fov }); }; // eases in, glides between framings (the battle releases it on its own turn changes)
  const foe = (S) => { const v = S.enemyViews?.values().next().value; return v ? headOf(v.api, Math.max(0.5, (v.h || 1) * 0.6)) : V(3.5, 0.6, 0); };
  const pair = (S, o = {}) => twoShot(S, headOf(teacher, 1.5), S.prof.headWorld ? S.prof.headWorld(V()) : headOf(S.prof, 1.0), o); // the teacher and the boy
  const rel = (S) => S.shotCam?.release?.(1.6);
  const say = async (S, text, o = {}) => { teacher?.act(o.act || 'explain'); await fsay('teacher', text, { anchor: teacher, ...o }); };
  const once = (k) => (said.has(k) ? false : (said.add(k), true));
  // THE LESSON (kid Isaac has no magic yet: real throwing, real physics): one short prompt per step, shown big at the
  // top, each waiting for the action it teaches (battlecine.js Tutorial). GRAB the apple, put FORCE into the throw,
  // add SPIN (it curves and strikes twice), THROW (the wooden bell stand); then hide behind the STONE (Block), throw again.
  const steps = [
    { who: 'master', say: 'GRAB the apple: drag it up off the card.', wait: 'place' },
    { who: 'master', say: 'Put FORCE into the throw: drop Force on the apple.', wait: 'merge' },
    { who: 'master', say: 'Add SPIN: it curves and hits twice.', wait: 'merge' },
    { who: 'master', say: 'Now THROW! Press the bell (or Space).', wait: 'end' },
    { who: 'master', say: 'He will belly-flop! Drop the STONE on yourself to hide behind it.', wait: 'self' },
    { who: 'master', say: 'Good. Grab, force, spin, THROW again!', wait: 'end' },
    { who: 'master', say: 'Mass times speed, my boy. That is all a throw is.', hold: 5 },
  ];
  const tutorial = {
    steps, heat: false,
    hero: () => kidHero(),
    // the stone to hide behind is in the deck from the start (all four cards are in hand every turn); turn 2 the teacher points at it
    async onTurn(B) { if (B.turn === 2) teacher?.act('point'); },
    async on(ev, S, ...a) {
      const B = S.battle;
      if (ev === 'intro') { // the teacher hobbles to the edge of the clearing; a crane down onto the two of them and the raccoon
        teacher = createTeacher(); teacher.hAt = S.stage?.hAt || null; teacher.root.position.set(-5.4, 0, -1.1); teacher.root.rotation.y = 0.9; S.scene.add(teacher.root); S.tutTeacher = teacher;
        teacher.lookAtWorld(() => S.enemyViews?.values().next().value?.api.root.position.clone().add(V(0, 0.5, 0)) || V(3, 0.5, 0));
        upd = { update: (dt) => { if (S.done && !teacher) return; teacher?.update(dt); } }; S.engine.add(upd); S.tutUpd = upd;
        const kid = S.prof; kid.root.rotation.y = 0.75;
        frame(S, overShoulder(S, S.prof.headWorld(V()), foe(S))); await wait(0.6); // over the boy's shoulder: the raccoon
        await say(S, 'A bandit. A very round one.', { act: 'point' });
        frame(S, pair(S));
        await say(S, 'Your cards, Isaac. Show me forces.', { show: false });
        rel(S); return;
      }
      if (ev === 'battleStart') return;
      if (ev === 'playerTurn') {
        const t = B.turn; const mv = (ids) => { try { return computeMove(flatten(ids.map(card))).attack; } catch (e) { return null; } };
        if (t === 1 && once('t1')) { frame(S, pair(S)); await say(S, 'Time waits while you think, Isaac.', { act: 'present' }); rel(S); }
        else if (t === 2 && once('t2')) { frame(S, pair(S)); await say(S, 'The stone, Isaac! Hide behind it.', { act: 'point' }); rel(S); }
        else if (t === 3 && once('t3')) await say(S, 'Every push is pushed back, child. Remember that.', { show: false });
        return;
      }
      if (ev === 'steal' && once('steal')) { await say(S, 'He stole a card! Hit him!', { act: 'alarm', wait: false }); return; }
      if (ev === 'finish') {
        const won = a[0]; fstop();
        if (teacher) { frame(S, pair(S, { fov: 26 })); await say(S, won ? 'Well thrown, my boy.' : 'The raccoon wins. Never mind.', { act: won ? 'nod' : 'shrug' }); rel(S); }
        audio.play('page_turn');
        S.engine.remove(upd); return;
      }
    },
  };
  return { run, encounter: { enemies: ['raccoon'], kind: 'normal', theme: 'garden', tutorial } };
}
