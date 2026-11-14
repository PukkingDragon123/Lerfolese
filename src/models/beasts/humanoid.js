// Humanoid beasts and event NPCs on the SAME human base as Newton: the Limbo Phobia engine (src/models/limbo), built
// realistic low-poly (octagon rings, flat shading, its hand-made pixel page) and pushed per creature through the
// engine's body parameters (height, build, mass, overrides) and a paint hook (fur, bronze, bone, hide repainted from
// the engine's own shading). Non-human parts (bull head, horns, single eye, wings, hooves, tails, weapons) are
// low-poly pixel-textured attachments on the engine's bones. Animation: LimboAnim (the same fluid procedural human
// motion as Newton) plus per-creature additive poses; the battle conventions come from rig.js (act, talk, wounds,
// highlight, impactTime + onImpact, knockback).
import * as THREE from 'three';
import { Spring } from '../../core/tween.js';
import { LimboBody, LimboAnim, IMPACT } from '../limbo/rig.js';
import { K, limboMat, weather } from './look.js';
import { battleRig, paintWounds, woundMat, woundTex, sample } from './rig.js';
import { bake } from './flesh.js';

export { THREE, K };
export const hex = K.hex;
// ---------------------------------------------------------------- paint-hook helpers (o = painter colour array)
export const lum = (o) => o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11;
export const near = (o, col, tol = 0.09) => Math.abs(o[0] / (col[0] + 1) - o[1] / (col[1] + 1)) + Math.abs(o[1] / (col[1] + 1) - o[2] / (col[2] + 1)) < tol;
export const put = (o, c) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
const T3 = [0, 0, 0];
/** recolour a texel to `col`, keeping the engine's painted light/shade (relative to the reference colour it painted) */
export function recolor(o, col, ref, add = 0, c = null, style = null, age = 0.5) {
  let L = 0.5 + (lum(o) / Math.max(1, lum(ref)) - 1) * 0.6 + add; const cc = [...col];
  if (c && style) L = weather(style, c, 1, L, cc, age);
  put(o, K.tone(cc, K.band(L), T3));
}
/** strand-and-clump fur in body space (engine units): natural ramp, partings, lit tips */
export function furTexel(c, o, col, ref, H, size = 0.022, add = 0) {
  const s = size * H; const Y = c.y / (s * 2.2); const C = K.cells3(c.x / s, Y, c.z / s); const dy = Y - C[3];
  const n = K.vnoise(c.x * 90 / H, c.y * 18 / H, c.z * 90 / H); recolor(o, col, ref, add + dy * 0.22 + (n - 0.5) * 0.18 + (C[1] - C[0] < 0.07 && dy < 0 ? -0.18 : 0));
}

// ---------------------------------------------------------------- the beast
/**
 * spec: { id, app, outfit, severed, hook, overrides, height, build(ctx), pose(add, t, st, ctx), update(dt, ctx),
 *   clips {attack, cast, hurt, die} (additive, engine bone names), attack/cast (LimboAnim modes), impact, hover(t, st, ctx),
 *   blood, wounds, sway, speed, expr, angry, headScale }
 */
export function limboBeast(spec, seed = 1) {
  const root = new THREE.Group(); root.name = spec.id; const model = new THREE.Group(); root.add(model);
  const L = new LimboBody(spec.app, spec.outfit || {}, { severed: spec.severed || [], hook: spec.hook, overrides: spec.overrides || {}, lowpoly: true });
  L.gg.paintAll(L.spec, L.app, {}, 'base'); // keep the realistic texel detail (no anime clean-up), as Newton does
  const mat = limboMat(L.tex); L.mesh.material = mat;
  const sc = spec.height / L.P.crown; L.root.scale.setScalar(sc); model.add(L.root);
  const api = battleRig(root, spec.height); api.mats.push(mat); const st = api.st;
  if (spec.wounds !== false) woundMat(mat, limboWounds(L, spec), spec.blood || [0.12, 0.004, 0.006]);
  const anim = new LimboAnim(L, { sway: spec.sway ?? 1, speed: spec.speed ?? 1, fall: spec.fall ?? true }); anim.t += seed * 1.7;
  const ctx = { L, B: L.bones, P: L.P, H: L.P.H || L.P.crown, sc, api, model, root, anim, st, seed, vars: {}, spec, own: (m) => api.own(m) };
  if (spec.headScale) L.bones.head.scale.setScalar(spec.headScale);
  if (spec.chest) { const [x, y, z] = spec.chest; L.bones.chest.scale.set(x, y, z); if (spec.headScale) L.bones.head.scale.set(spec.headScale / x, spec.headScale / y, spec.headScale / z); else L.bones.neck.scale.set(1 / x, 1 / y, 1 / z); } // pushed proportions: a hulking chest, shoulders and arms
  spec.build?.(ctx);
  model.traverse((o) => { if (o.isMesh && o !== L.mesh && o.material?.map && api.mats.indexOf(o.material) < 0) o.material = api.own(o.material); });
  api.impactTime = spec.impact ?? IMPACT; api.attackTime = 1.0; api.head = L.bones.head; api.L = L;
  const MAP = { attack: spec.attack || 'attack', cast: spec.cast || 'cast', hurt: 'hit', die: 'death', cheer: 'cheer' };
  const kb = new Spring(0, 9, 0.5); let impactDone = true; const clips = spec.clips || {};
  api.onAct = (m) => {
    const a = MAP[m]; if (a) anim.play(a, { hold: m === 'die' });
    if (m === 'hurt') { L.setExpression('pain', 0.9); kb.kick(-2.2); } if (m === 'attack' || m === 'cast') L.setExpression(spec.angry || 'angry', 1.2); if (m === 'attack') impactDone = false; if (m === 'die') L.setExpression('pain', 3);
    spec.onAct?.(m, ctx);
  };
  api.talk = (s = 1) => { st.talk = s; L.talk(s); };
  anim.extra = (add, t) => {
    spec.pose?.(add, t, st, ctx);
    const c = st.dead > 0 ? 'die' : clips[st.mode] ? st.mode : null;
    if (c && clips[c]) { const Q = sample(clips[c], st.dead > 0 ? st.deadT : st.modeT, {}); for (const [b, r] of Object.entries(Q)) if (b === '_pos') ctx.vars.pos = r; else add(b, r[0], r[1], r[2]); } else ctx.vars.pos = null;
  };
  api.update = (dt) => {
    api.common(dt, 1.2); kb.update(dt); const t = st.t + seed * 1.37;
    if (!impactDone && st.mode === 'attack' && st.modeT >= api.impactTime) { impactDone = true; spec.onImpact?.(ctx); api.onImpact?.(); }
    anim.update(dt * (spec.animSpeed || 1)); const tp = ctx.vars.pos || [0, 0, 0];
    model.position.set(tp[0], (spec.hover ? spec.hover(t, st, ctx) : 0) + tp[1], tp[2] + st.lunge.value * 0.08 + kb.value * 0.1);
    spec.update?.(dt, ctx, t);
  };
  if (spec.expr) L.setExpression(spec.expr);
  return api;
}
/** wound page for a Limbo body: the engine's UV layout baked to rest-pose points, gashes scattered over the flesh */
const WCACHE = new Map();
export function limboWounds(L, spec) {
  const key = spec.id; if (WCACHE.has(key)) return WCACHE.get(key);
  const geo = L.mesh.geometry; const S = bake(geo, 256, ['b']); const pa = geo.attributes.position, na = geo.attributes.normal; const u = (L.P.crown || 1.7) / 1.75; const sites = []; let seed = 11;
  for (let tries = 0; tries < 300 && sites.length < 12; tries++) { seed = (seed * 9301 + 49297) % 233280; const i = Math.floor((seed / 233280) * pa.count); const p = [pa.getX(i), pa.getY(i), pa.getZ(i)]; if (p[1] < 0.15 * L.P.crown || sites.some((x) => Math.hypot(x.p[0] - p[0], x.p[1] - p[1], x.p[2] - p[2]) < 0.14 * u)) continue; sites.push({ p, n: [na.getX(i), na.getY(i), na.getZ(i)], len: (0.07 + (sites.length % 3) * 0.03) * u, wid: (0.01 + (sites.length % 2) * 0.005) * u }); }
  const t = woundTex(K.paintSurface(S, paintWounds(S, { sites, seed: 5 })).canvas); WCACHE.set(key, t); return t;
}
/** a group under engine bone `bone` whose local space is metres around `pivot` (metres, relative to the bone joint) */
export function mount(ctx, bone, obj, { at = [0, 0, 0], cancel = 1 } = {}) {
  const g = new THREE.Group(); g.add(obj); g.scale.setScalar(1 / ctx.sc); const r = ctx.L.restOf(bone); g.position.set(r.x + at[0] / ctx.sc, r.y + at[1] / ctx.sc, r.z + at[2] / ctx.sc);
  ctx.L.attach(g, bone, cancel); return g;
}
/** world-metre rest position of an engine joint relative to the model root */
export const jointM = (ctx, bone) => ctx.L.restOf(bone).multiplyScalar(ctx.sc);
