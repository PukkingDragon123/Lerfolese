// usage: node tools/shot.mjs <url> <out.png> [w] [h] [waitExpr] [extraMs]
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
const [,, url, out, w = 1280, h = 720, waitExpr = 'window.__done', extra = 300] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await p.goto(url);
try { await p.waitForFunction(waitExpr, null, { timeout: 30000 }); } catch (e) { logs.push('wait timeout'); }
await p.waitForTimeout(+extra);
await p.screenshot({ path: out, fullPage: true });
console.log(logs.slice(0, 20).join('\n') || 'no errors');
await b.close();
