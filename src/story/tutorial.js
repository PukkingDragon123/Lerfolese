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

// the tutorial raccoon is not scaled by the run's HARD difficulty (about 22 HP, 3-4 per blow)
DIFF.per.raccoon = 1 / DIFF.hp.normal; DIFF.dmgPer.raccoon = 1.25 / DIFF.dmg.normal;

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000 / Math.max(1, Math.min(2, window.__storyFast || 1))));
const card = (id, i) => ({ uid: 'tut-' + id + i, id, type: 'basic', up: 0 });

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

/** the run and the encounter for the tutorial battle; lines: the teacher's script (voiced) */
export function tutorialBattle(game) {
  const run = newRun(4242); run.deck = ['apple', 'force', 'rotation'].map(card); run.items = []; run.player = { hp: 30, maxHp: 30 }; run.tutorial = true;
  let teacher = null, upd = null; const said = new Set();
  const two = (S, pos, look, fov = 26) => S.shotCam?.shot?.(pos, look, { speed: 2.2, fov }); // a cinematic two-shot (the battle releases it on its own turn changes)
  const rel = (S) => S.shotCam?.release?.(1.6);
  const say = async (S, text, o = {}) => { teacher?.act(o.act || 'explain'); await fsay('teacher', text, { anchor: teacher, ...o }); };
  const once = (k) => (said.has(k) ? false : (said.add(k), true));
  const tutorial = {
    hero: () => kidHero(),
    async on(ev, S, ...a) {
      const B = S.battle;
      if (ev === 'intro') { // the teacher hobbles to the edge of the clearing; a crane down onto the two of them and the raccoon
        teacher = createTeacher(); teacher.hAt = S.stage?.hAt || null; teacher.root.position.set(-5.4, 0, -1.1); teacher.root.rotation.y = 0.9; S.scene.add(teacher.root); S.tutTeacher = teacher;
        teacher.lookAtWorld(() => S.enemyViews?.values().next().value?.api.root.position.clone().add(V(0, 0.5, 0)) || V(3, 0.5, 0));
        upd = { update: (dt) => { if (S.done && !teacher) return; teacher?.update(dt); } }; S.engine.add(upd);
        const kid = S.prof; kid.root.rotation.y = 0.75;
        two(S, V(-1.2, 1.1, 5.4), V(1.6, 0.6, 0), 30); await wait(0.6);
        await say(S, 'A bandit. A very round one.', { act: 'point' });
        two(S, V(-6.4, 1.5, 2.6), V(-4.2, 1.1, -0.2), 24);
        await say(S, 'Your cards, Isaac. Show me forces.', { show: false });
        rel(S); return;
      }
      if (ev === 'battleStart') return;
      if (ev === 'playerTurn') {
        const t = B.turn; const mv = (ids) => { try { return computeMove(flatten(ids.map(card))).attack; } catch (e) { return null; } };
        if (t === 1 && once('t1')) { const a = mv(['apple', 'force']); two(S, V(-5.6, 1.3, 3.0), V(-3.8, 1.0, 0.2), 26); await say(S, `Merge FORCE into APPLE: ${a ? `${a.m} × ${a.v}` : 'mass × velocity'}.`); await say(S, 'Aim. Then End Turn.', { act: 'present' }); rel(S); }
        else if (t === 2 && once('t2')) { const a = mv(['apple', 'force', 'rotation']); two(S, V(-5.6, 1.3, 3.0), V(-3.8, 1.0, 0.2), 26); await say(S, `Add SPIN: ${a ? `${a.hits} × ${a.perHit}` : 'two strikes'}. Laws multiply.`); rel(S); }
        else if (t === 3 && once('t3')) { two(S, V(-5.6, 1.3, 3.0), V(-3.8, 1.0, 0.2), 26); await say(S, 'When he lunges, click as the blow lands.', { act: 'point' }); rel(S); }
        else if (t === 4 && once('t4')) await say(S, 'Every push is pushed back, child. Remember that.', { show: false });
        return;
      }
      if (ev === 'steal' && once('steal')) { await say(S, 'He stole a card! Hit him!', { act: 'alarm', wait: false }); return; }
      if (ev === 'finish') {
        const won = a[0]; fstop();
        if (teacher) { two(S, V(-5.2, 1.2, 3.4), V(-3.9, 1.0, 0.0), 26); await say(S, won ? 'Well thrown, my boy.' : 'The raccoon wins. Never mind.', { act: won ? 'nod' : 'shrug' }); rel(S); }
        audio.play('page_turn');
        S.engine.remove(upd); return;
      }
    },
  };
  return { run, encounter: { enemies: ['raccoon'], kind: 'normal', theme: 'garden', tutorial } };
}
