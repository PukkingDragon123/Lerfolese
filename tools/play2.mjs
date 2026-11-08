// Drive the game in headless Chromium: open a URL, run optional actions, screenshot, report console errors.
import { createRequire } from 'module'; const { chromium } = createRequire('/home/user/Lerfolese/tools/play.mjs')('playwright');
const [,, url, out, waitMs = 6000, actions = ''] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; p.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GPU stall|toNonIndexed|ReadPixels/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await p.goto(url); await p.waitForTimeout(+waitMs);
for (const a of actions.split('@@').filter(Boolean)) {
  const [cmd, ...args] = a.split(':');
  if (cmd === 'click') await p.mouse.click(+args[0], +args[1]);
  if (cmd === 'drag') { const [x1, y1, x2, y2] = args.map(Number); await p.mouse.move(x1, y1); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(x1 + (x2 - x1) * i / 12, y1 + (y2 - y1) * i / 12); await p.waitForTimeout(16); } await p.waitForTimeout(150); await p.mouse.up(); }
  if (cmd === 'move') await p.mouse.move(+args[0], +args[1]);
  if (cmd === 'wait') await p.waitForTimeout(+args[0]);
  if (cmd === 'key') await p.keyboard.press(args[0]);
  if (cmd === 'shot') await p.screenshot({ path: args[0] });
  if (cmd === 'eval') { const r = await p.evaluate(args.join(':')); if (r !== undefined) console.log('eval:', JSON.stringify(r).slice(0, 400)); }
}
await p.screenshot({ path: out, timeout: 400000 });
console.log(logs.slice(0, 15).join('\n') || 'no errors');
await b.close();
