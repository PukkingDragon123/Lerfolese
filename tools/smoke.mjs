// Smoke test: visit many debug URLs in headless Chromium (SwiftShader), collect console errors + pageerrors, screenshot
// each one small, print a pass/fail table.
//   node tools/smoke.mjs [filter] [--jobs=2] [--mobile] [--out=dir] [--base=http://127.0.0.1:8123/]
// It uses an already-running server on the base URL, or starts `python3 -m http.server 8123 --bind 127.0.0.1` itself.
// Battles also must reach the player's turn (no intro stall); a check eval can mark a page as failed.
import { createRequire } from 'module'; import { spawn } from 'child_process'; import fs from 'fs'; import path from 'path';
const { chromium, devices } = createRequire('/home/user/Lerfolese/tools/play.mjs')('playwright');
const args = process.argv.slice(2); const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const filter = args.find((a) => !a.startsWith('--')) || ''; const JOBS = +opt('jobs', 2); const MOBILE = args.includes('--mobile');
const BASE = opt('base', 'http://127.0.0.1:8123/'); const OUT = opt('out', '/tmp/lerfolese-smoke'); fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const T = '&q=test&pr=0.5&ff=10'; // (ff: the engine's test fast-forward, SwiftShader draws about a frame a second)
// [name, query, waitMs, extra]: extra.battle = must reach the player's turn; extra.skip = press Space to skip cinematics
const B = (ids, kind = '') => [`battle ${ids}${kind ? ' ' + kind : ''}`, `?battle=${ids}${kind ? '&kind=' + kind : ''}${T}`, 9000, { battle: true }];
const CASES = [
  ['boot', `?q=test&pr=0.5&ff=10`, 15000, {}],
  ...['tower', 'studies', 'stars', 'won', 'intro'].map((s) => [`scene ${s}`, `?scene=${s}${T}`, 12000, {}]),
  ...['garden', 'cards', 'throw', 'fight', 'snake', 'grab', 'painting', 'sky'].map((b) => [`prologue ${b}`, `?prologue=1&beat=${b}${T}`, 12000, { skip: true }]),
  B('satyr'), B('kobalos,satyr'), B('medusa'), B('minotaur'), B('hydra'), B('harpy,wolf'), B('centaur'), B('cyclops', 'elite'), B('talos', 'elite'),
  B('karkinos'), B('boar'), B('stymphalian'), B('salamander'), B('siren'), B('teumessian_fox'), B('empusa'), B('automaton'), B('magnet_golem'), B('bronze_bull', 'elite'), B('ladon', 'elite'),
  B('frog_wizard', 'elite'), B('bookworm_queen', 'elite'), B('sphinx', 'elite'), B('eagle', 'elite'),
  ...['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'].map((p) => [`chess ${p}`, `?chess=${p}${T}`, 12000, { skip: true }]),
  ...['pawn', 'rook'].map((p) => [`chess ${p} beat`, `?chess=${p}&beat=1${T}`, 12000, { skip: true }]),
  ['context loss', `?scene=tower${T}`, 15000, { ctxloss: true }],
  ['corrupt save', `?scene=tower${T}`, 15000, { corrupt: true }],
  ['chess king finale', `?chess=king&finale=1${T}`, 12000, { skip: true }],
  ...['pawn', 'queen'].map((p) => [`chess ${p} map`, `?chess=${p}&map=1${T}`, 12000, {}]),
  ...['tree', 'oracle', 'sisyphus', 'icarus', 'sphinx', 'prometheus', 'archimedes', 'discord'].map((e) => [`event ${e}`, `?node=event&event=${e}${T}`, 12000, { skip: true }]),
];
const IGNORE = /GPU stall|toNonIndexed|ReadPixels|WebGL: INVALID_|GL_INVALID|Automatic fallback to software|swiftshader|favicon/i;

async function serverUp() { try { const r = await fetch(BASE, { method: 'HEAD' }); return r.ok; } catch (e) { return false; } }
let srv = null; if (!(await serverUp())) { srv = spawn('python3', ['-m', 'http.server', '8123', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); for (let i = 0; i < 40 && !(await serverUp()); i++) await new Promise((r) => setTimeout(r, 250)); }

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctxOpts = MOBILE ? { ...devices['iPhone 13 landscape'] } : { viewport: { width: 640, height: 360 } };
async function runCase([name, q, wait, extra]) {
  const ctx = await browser.newContext(ctxOpts); const p = await ctx.newPage(); const errs = []; const t0 = Date.now(); let note = '';
  p.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text().slice(0, 220)); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 200) + ' @ ' + (e.stack || '').split('\n')[1]?.trim().slice(0, 120)));
  try {
    await p.goto(BASE + q, { timeout: 180000, waitUntil: 'domcontentloaded' }); await p.waitForTimeout(wait);
    if (extra.skip) await p.evaluate(() => { for (let i = 0; i < 25; i++) window.__skip?.(); window.__prologue?.skip?.(); window.__prologue?.skip?.(); }).catch(() => {}); // spam skip
    if (extra.skip) for (let i = 0; i < 3; i++) { await p.keyboard.down('Space'); await p.waitForTimeout(1300); await p.keyboard.up('Space'); await p.waitForTimeout(1500); }
    if (extra.battle) { // skip the intro, then require the player's turn
      let ph = null; for (let i = 0; i < 16; i++) { ph = await p.evaluate(() => window.__game?.scene?.battle?.phase || null).catch(() => null); if (ph === 'player') break; await p.keyboard.press('Space').catch(() => {}); await p.mouse.click(320, 180).catch(() => {}); await p.waitForTimeout(2500); }
      if (ph !== 'player') { errs.push('stall: battle never reached the player turn (phase ' + ph + ')'); }
      else { // resize mid-battle (a phone turning), then end turn twice quickly (double click on End Turn) and wait for the next player turn
        const vp = p.viewportSize(); await p.setViewportSize({ width: 480, height: 640 }); await p.waitForTimeout(1500); await p.setViewportSize(vp); await p.waitForTimeout(1000);
        await p.evaluate(() => { const S = window.__game.scene; S.endTurn(); S.endTurn(); });
        let ok = false; for (let i = 0; i < 30; i++) { await p.waitForTimeout(2000); await p.keyboard.press('1').catch(() => {}); /* (answers a foe's dilemma, which waits for the player) */ const r = await p.evaluate(() => { const B = window.__game?.scene?.battle; return B ? { ph: B.phase, turn: B.turn, over: B.over } : null; }).catch(() => null); if (r && (r.over || (r.ph === 'player' && r.turn >= 2))) { ok = true; break; } }
        note = ok ? 'turn 2' : 'end turn slow'; if (!ok) errs.push('stall: end turn never returned to the player');
      }
    }
    if (extra.ctxloss) { // lose the WebGL context and get it back: the game must pause drawing, restore and keep going
      const r = await p.evaluate(async () => { const gl = window.__game.engine.renderer.getContext(); const ext = gl.getExtension('WEBGL_lose_context'); if (!ext) return 'no ext'; const f0 = window.__game.engine.frame; ext.loseContext(); await new Promise((r) => setTimeout(r, 1500)); const lost = window.__game.engine.contextLost; ext.restoreContext(); await new Promise((r) => setTimeout(r, 6000)); return { lost, back: !window.__game.engine.contextLost, frames: window.__game.engine.frame - f0 }; });
      note = JSON.stringify(r); if (!r?.lost || !r?.back) errs.push('context loss not handled: ' + note); await p.waitForTimeout(8000);
    }
    if (extra.corrupt) { // a damaged save must not stop the boot
      await p.evaluate(() => { localStorage.setItem('aod.journal.v1', '{"loops": "x", "enemies": 5, '); localStorage.setItem('aod.settings.v1', 'null'); localStorage.setItem('aod.meta.v1', '[1,2]'); localStorage.setItem('aod.run.v1', '"oops"'); }); await p.reload(); await p.waitForTimeout(wait);
      const ok = await p.evaluate(() => !!window.__game?.scene && typeof window.__game.journal.enemies === 'object').catch(() => false); note = ok ? 'booted on a corrupt save' : 'corrupt save broke the boot'; if (!ok) errs.push(note);
    }
    await p.screenshot({ path: path.join(OUT, name.replace(/[^a-z0-9]+/gi, '_') + '.png'), timeout: 120000 }).catch((e) => { note += ' (no shot)'; });
  } catch (e) { errs.push('harness: ' + e.message.slice(0, 160)); }
  await ctx.close(); return { name, errs: [...new Set(errs)], s: ((Date.now() - t0) / 1000).toFixed(0), note };
}
const todo = CASES.filter((c) => filter.split('|').some((f) => c[0].includes(f))); const results = []; let i = 0; // (filter: substrings, | separated)
await Promise.all(Array.from({ length: JOBS }, async () => { while (i < todo.length) { const c = todo[i++]; const r = await runCase(c); results.push(r); console.log(`${r.errs.length ? 'FAIL' : 'pass'}  ${r.name.padEnd(26)} ${r.s.padStart(4)}s  ${r.note}${r.errs.length ? '\n      ' + r.errs.slice(0, 4).join('\n      ') : ''}`); } }));
await browser.close(); srv?.kill();
const fail = results.filter((r) => r.errs.length);
console.log(`\n${results.length - fail.length}/${results.length} passed` + (fail.length ? '; failed: ' + fail.map((r) => r.name).join(', ') : '') + `\nscreenshots: ${OUT}`);
process.exit(fail.length ? 1 : 0);
