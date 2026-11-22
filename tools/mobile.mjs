// Mobile QA in Playwright device emulation (touch, DPR, safe viewport): portrait prompt, tower menu, astral select, map,
// a battle (a finger-dragged card, a long-press tooltip, a tapped End Turn apple, a double tap on it), an event, and
// the prologue skip. Synthesises touch PointerEvents (pointerType 'touch') the way a phone browser delivers them.
//   node tools/mobile.mjs [outDir] [--only=portrait,menu,astral,map,battle,event,prologue]
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const { chromium, devices } = createRequire('/home/user/Lerfolese/tools/play.mjs')('playwright');
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/lerfolese-mobile'; fs.mkdirSync(OUT, { recursive: true });
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const BASE = 'http://127.0.0.1:8123/'; const T = '&q=test&pr=0.5&ff=10';
const IGN = /GPU stall|ReadPixels|WebGL: INVALID_|GL_INVALID|swiftshader|favicon/i;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const PORTRAIT = devices['iPhone 13'], LAND = devices['Pixel 7 landscape'] || { ...devices['Pixel 5'], viewport: { width: 851, height: 393 }, screen: { width: 851, height: 393 } };
const results = [];
async function open(dev, q, wait) {
  const ctx = await browser.newContext({ ...dev }); const p = await ctx.newPage(); const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' && !IGN.test(m.text())) errs.push(m.text().slice(0, 200)); }); p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 200)));
  await p.goto(BASE + q, { timeout: 180000, waitUntil: 'domcontentloaded' }); await p.waitForTimeout(wait); return { ctx, p, errs };
}
// touch pointer events on the canvas / window, like a phone browser's
const touch = (p, type, x, y, id = 7) => p.evaluate(([type, x, y, id]) => { const el = type === 'pointerdown' ? document.getElementById('game') : window; el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: id, isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true })); }, [type, x, y, id]);
async function swipe(p, x1, y1, x2, y2, steps = 10) { await touch(p, 'pointerdown', x1, y1); for (let i = 1; i <= steps; i++) { await touch(p, 'pointermove', x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps); await p.waitForTimeout(30); } await touch(p, 'pointerup', x2, y2); }
async function tap(p, x, y) { await touch(p, 'pointerdown', x, y); await p.waitForTimeout(60); await touch(p, 'pointerup', x, y); }
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png'), timeout: 180000 }).catch(() => {});
async function step(name, fn) { if (only.length && !only.includes(name)) return; const t0 = Date.now(); let r; try { r = await fn(); } catch (e) { r = { ok: false, note: 'harness: ' + e.message.slice(0, 160), errs: [] }; } results.push({ name, ...r, s: ((Date.now() - t0) / 1000) | 0 }); console.log(`${r.ok && !r.errs?.length ? 'pass' : 'FAIL'}  ${name.padEnd(10)} ${String(((Date.now() - t0) / 1000) | 0).padStart(4)}s  ${r.note || ''}${r.errs?.length ? '\n      ' + r.errs.slice(0, 4).join('\n      ') : ''}`); }
const waitFor = async (p, expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await p.evaluate(expr).catch(() => null); if (v) return v; await p.waitForTimeout(1500); } return null; };

await step('portrait', async () => { const { ctx, p, errs } = await open(PORTRAIT, '?scene=tower' + T, 9000); const on = await waitFor(p, '!!window.__game?.portrait?.on', 20000); await shot(p, 'portrait_tower'); await ctx.close(); return { ok: !!on, note: on ? 'turn-your-device prompt shown' : 'no portrait prompt', errs }; });
await step('menu', async () => { const { ctx, p, errs } = await open(LAND, '?scene=tower' + T, 20000); const r = await p.evaluate(() => { const E = window.__game.engine; return { safe: E.safe, uiPx: E.uiPx?.toFixed(1), q: E.quality, touch: window.__game.input.isTouch, portrait: window.__game.portrait?.on }; }); await shot(p, 'land_menu'); await ctx.close(); return { ok: r.touch && !r.portrait, note: JSON.stringify(r), errs }; });
await step('astral', async () => { const { ctx, p, errs } = await open(LAND, '?scene=tower' + T, 20000); const tw = "(() => { const S = window.__game.scene; return S.toAstral ? S : S.tower || Object.values(S).find((o) => o && typeof o.toAstral === 'function'); })()";
  const ok0 = await p.evaluate(`(() => { const T = ${tw}; if (!T) return false; T.toAstral(); return T.mode; })()`); await p.waitForTimeout(15000); await shot(p, 'land_astral');
  const mode = await p.evaluate(`(${tw}).mode`).catch(() => null); await p.evaluate(`(() => { window.__game.journal.seenPrologue = true; const T = ${tw}; T.skyT = 1; T.choose(0); })()`).catch(() => {});
  const run = await waitFor(p, "(() => /Map/.test(window.__game?.scene?.constructor?.name || '') ? window.__game.run?.start || 'map' : null)()", 150000); await shot(p, 'land_astral_to_map'); await ctx.close();
  return { ok: ok0 === 'astral' && !!run, note: `astral mode ${mode}; constellation chosen -> ${run ? 'map (' + run + ')' : 'no map'}`, errs }; });
await step('map', async () => { const { ctx, p, errs } = await open(LAND, '?chess=pawn&map=1' + T, 25000); const before = await p.evaluate(() => { const S = window.__game.scene; return S.fz ? [S.fx.target, S.fz.target] : null; }); await swipe(p, 420, 220, 300, 140); await p.waitForTimeout(800); const after = await p.evaluate(() => { const S = window.__game.scene; return S.fz ? [S.fx.target, S.fz.target] : null; }); await shot(p, 'land_map'); await ctx.close(); const moved = before && after && (Math.abs(before[0] - after[0]) + Math.abs(before[1] - after[1]) > 0.1); return { ok: !!moved, note: moved ? 'finger-drag pans the diorama' : 'map did not pan ' + JSON.stringify([before, after]), errs }; });
await step('battle', async () => {
  const { ctx, p, errs } = await open(LAND, '?battle=satyr' + T, 9000); let notes = [];
  const ph = await waitFor(p, "(() => { const S = window.__game?.scene; if (S?.battle?.phase === 'player') return 'player'; window.__skip?.(); return null; })()", 150000); if (!ph) { await shot(p, 'land_battle'); await ctx.close(); return { ok: false, note: 'never reached the player turn', errs }; }
  await p.waitForTimeout(2500);
  const cardAt = () => p.evaluate(() => { const S = window.__game.scene, E = window.__game.engine; const v = [...S.hand.views.values()][0]; if (!v) return null; const w = v.mesh.getWorldPosition(v.mesh.position.clone()).project(E.ui.camera); return { x: (w.x + 1) / 2 * innerWidth, y: (1 - w.y) / 2 * innerHeight, n: S.battle.hand.length, h: S.battle.held.length }; });
  const c = await cardAt(); if (!c) { await ctx.close(); return { ok: false, note: 'no cards in hand', errs }; }
  // long-press: hover + tooltip while held, cleared on release, no click
  await touch(p, 'pointerdown', c.x, c.y); await p.waitForTimeout(900); const lp = await p.evaluate(() => { const S = window.__game.scene; return { hover: !!S.hand.hover, tip: !!S.tooltip.on }; }); await touch(p, 'pointerup', c.x, c.y); await p.waitForTimeout(400);
  const after = await p.evaluate(() => !!window.__game.scene.hand.hover); notes.push(`long-press hover ${lp.hover} tip ${lp.tip}, cleared ${!after}`);
  // drag the first card onto the foe
  const foe = await p.evaluate(() => { const S = window.__game.scene, E = window.__game.engine; const v = [...S.enemyViews.values()][0]; const w = v.api.root.position.clone(); w.y += v.h * 0.5; w.project(E.world.camera); return { x: (w.x + 1) / 2 * innerWidth, y: (1 - w.y) / 2 * innerHeight }; });
  const c2 = await cardAt(); await swipe(p, c2.x, c2.y, foe.x, foe.y, 14); await p.waitForTimeout(6000);
  const c3 = await p.evaluate(() => { const S = window.__game.scene; return { n: S.battle.hand.length, h: S.battle.held.length }; }); const played = c3.n < c.n || c3.h > c.h; notes.push(`drag card ${played ? 'played' : 'NOT played'} (${c.n}->${c3.n} hand, ${c.h}->${c3.h} held)`);
  await shot(p, 'land_battle');
  // End Turn: tap the golden apple twice fast (the second must be ignored)
  const bell = await p.evaluate(() => { const S = window.__game.scene, E = window.__game.engine; const b = S.hudB.bell; const m = b?.hit?.[0]; if (!m) return null; const w = m.getWorldPosition(m.position.clone()).project(E.ui.camera); m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); const a = bb.min.clone().project(E.ui.camera), c = bb.max.clone().project(E.ui.camera); return { x: (w.x + 1) / 2 * innerWidth, y: (1 - w.y) / 2 * innerHeight, wPx: Math.round(Math.abs(c.x - a.x) / 2 * innerWidth), hPx: Math.round(Math.abs(c.y - a.y) / 2 * innerHeight) }; });
  if (bell) { await tap(p, bell.x, bell.y); await tap(p, bell.x, bell.y); }
  const t2 = await waitFor(p, "(() => { const B = window.__game?.scene?.battle; return B && (B.over || (B.phase === 'player' && B.turn >= 2)) ? B.turn : null; })()", 150000); notes.push(bell ? `apple ${bell.wPx}x${bell.hPx}px tapped twice -> turn ${t2}` : 'no apple found');
  await shot(p, 'land_battle_turn2'); await ctx.close(); return { ok: played && lp.hover && !after && !!t2, note: notes.join('; '), errs };
});
await step('event', async () => { const { ctx, p, errs } = await open(LAND, '?node=event&event=icarus' + T, 30000); for (let i = 0; i < 3; i++) { await p.evaluate(() => window.__skip?.()); await p.waitForTimeout(4000); } await shot(p, 'land_event'); await ctx.close(); return { ok: true, note: 'event (skipped intro)', errs }; });
await step('prologue', async () => { const { ctx, p, errs } = await open(LAND, '?prologue=1&beat=garden' + T, 25000); await p.evaluate(() => window.__prologue?.skip()); const ok = await waitFor(p, "(() => /Menu/.test(window.__game?.scene?.constructor?.name || '') || null)()", 120000); await shot(p, 'land_after_prologue'); await ctx.close(); return { ok: !!ok, note: ok ? 'skip -> tower menu' : 'prologue skip did not reach the menu', errs }; });
await browser.close();
const bad = results.filter((r) => !r.ok || r.errs?.length); console.log(`\n${results.length - bad.length}/${results.length} mobile checks passed; shots in ${OUT}`); process.exit(bad.length ? 1 : 0);
