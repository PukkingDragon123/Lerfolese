// Battle screenshots without guessing pixel positions: open a debug battle, skip the intro, wait until the player's
// turn really starts, optionally PLACE the first Matter and MERGE the rest into it (the spell card and the forecast
// appear), hover something, then shoot. Polls the game state instead of fixed waits (headless SwiftShader is slow).
//   node tools/battle-shot.mjs "<url>" out.png [steps]   steps: comma list of  place | merge | hover:foe | hover:apple | hover:card | hover:held | end | wait:<ms>
import { createRequire } from 'module'; const { chromium } = createRequire('/home/user/Lerfolese/tools/play.mjs')('playwright');
const [,, url, out, steps = 'place,merge,hover:held'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; p.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GPU stall|toNonIndexed|ReadPixels/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await p.goto(url);
const S = '(window.__game?.scene?.battle ? window.__game.scene : window.__prologue?.scene?.bs)'; const until = async (cond, ms = 600000, poke = null) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(cond).catch(() => false)) return true; if (poke) await poke(); await p.waitForTimeout(2500); } return false; };
await until(`!!${S}?.battle`, 300000);
const ok = await until(`${S}.battle.phase === 'player' && !${S}.busy && !${S}.cine`, 900000, async () => { await p.evaluate('window.__cine?.skip?.()').catch(() => {}); await p.mouse.click(640, 200).catch(() => {}); });
console.log('player turn:', ok);
console.log('state:', await p.evaluate(`(() => { const s = ${S}; const B = s.battle; return JSON.stringify({ hand: B.hand.map((x) => x.cards[0].id), heatOn: B.heatOn(), tutorial: !!B.tutorial, plain: !!s.plain, intents: !!s.intents, endButton: s.hudB.bell?.constructor?.name, turn: B.turn }); })()`).catch((e) => 'state fail ' + e.message));
for (const st of steps.split(',').filter(Boolean)) {
  const [cmd, arg] = st.split(':');
  if (cmd === 'place') await p.evaluate(`(async () => { const s = ${S}; const B = s.battle; const m = B.hand.find((x) => !B.manifestBlock(x)); if (m) { await B.play(m.uid, { type: 'air', pos: { x: -1.2, y: 2.6, z: 1 } }); s.syncHand(); s.afterAction(); } })()`);
  if (cmd === 'merge') await p.evaluate(`(async () => { const s = ${S}; const B = s.battle; for (const x of [...B.hand]) { const o = B.held[0]; if (!o) break; const pv = B.preview(x.uid, { type: 'held', uid: o.uid }); if (pv.ok && !(pv.heat?.over)) await B.play(x.uid, { type: 'held', uid: o.uid }); } s.syncHand(); s.afterAction(); })()`);
  if (cmd === 'end') await p.evaluate(`${S}.endTurn()`);
  if (cmd === 'wait') await p.waitForTimeout(+arg);
  if (cmd === 'hover') {
    const pt = await p.evaluate(`(() => { const s = ${S}; const E = s.engine; const toPx = (u) => [(u.x / E.uiW * 0.5 + 0.5) * 1280, (0.5 - u.y / E.uiH * 0.5) * 720];
      if ('${arg}' === 'foe') { const v = [...s.enemyViews.values()].find((v) => v.e.alive); const q = v.api.root.position.clone(); q.y += v.h * 0.5; return toPx(E.worldToUI(q)); }
      if ('${arg}' === 'apple') { const q = s.hudB.bell.group.getWorldPosition(new (s.camera.position.constructor)()); return [(q.x / E.uiW * 0.5 + 0.5) * 1280, (0.5 - q.y / E.uiH * 0.5) * 720]; }
      if ('${arg}' === 'held') { const v = [...s.held.views.values()][0]; if (!v) return null; return toPx(E.worldToUI(v.g.position)); }
      if ('${arg}' === 'card') { const sl = s.hand.slots[0]; if (!sl) return null; return [(sl.views[0].target.x / E.uiW * 0.5 + 0.5) * 1280, (0.5 - (sl.views[0].target.y) / E.uiH * 0.5) * 720]; }
      return null; })()`);
    if (pt) { await p.mouse.move(pt[0], pt[1]); await p.mouse.move(pt[0] + 2, pt[1] + 1); }
  }
  await p.waitForTimeout(4000);
}
await p.waitForTimeout(12000);
await p.screenshot({ path: out, timeout: 400000 });
console.log(logs.slice(0, 15).join('\n') || 'no errors');
await b.close();
