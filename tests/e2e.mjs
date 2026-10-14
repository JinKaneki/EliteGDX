// End-to-end test of the PATCHED site in real Chromium. External network is blocked/mocked.
import { serve, launch, ROOT } from './harness.mjs';
import fs from 'node:fs';
const root = process.argv[2] || ROOT;
// the repo has TTC/ and a few images that were not uploaded to me; give the test copies so unrelated 404s don't mask real errors
const { srv, url } = await serve(root);
const { browser, context } = await launch({ serviceWorkers: 'block' });
const page = await context.newPage();
let fails = 0; const ok = (c, m) => { console.log((c ? ' ok  ' : 'FAIL ') + m); if (!c) fails++; };
const external = []; const errors = [];
await page.route('**/*', route => { const u = route.request().url(); if (u.startsWith(url)) return route.continue(); external.push(new URL(u).host); return route.abort(); });
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|Tao Te Ching|Yohan Te Ching/.test(m.text())) errors.push(m.text().slice(0, 200)); });
await page.addInitScript(() => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => { window.__raf++; return o(cb); }; });

console.log('— LOAD');
await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1500);
ok(errors.length === 0, 'no JS errors on load' + (errors.length ? ': ' + errors.join(' | ') : ''));
ok(await page.evaluate(() => !!(window.EG && EG.store && EG.registry && EG.ephem && EG.cistercian)), 'EG foundation modules present');
const hosts = [...new Set(external)].sort();
console.log('      external hosts contacted at load:', hosts.join(', '));
ok(!hosts.some(h => /youtube|gstatic|jsdelivr|cdnjs/.test(h)), 'heavy libs (youtube/firebase/hls/mqtt/peer/qr/three) are NOT fetched at load');
const nBlocks = await page.evaluate(() => document.querySelectorAll('.content-blocks > .block').length);
ok(nBlocks === 78, `gallery built from data: ${nBlocks} slides`);
ok(await page.evaluate(() => document.querySelectorAll('.content-blocks > .block img[loading="lazy"]').length >= 60), 'gallery images are lazy');
ok(await page.evaluate(() => document.querySelectorAll('.content-blocks > .block.active').length === 1), 'exactly one active slide');
ok(await page.evaluate(() => document.querySelector('link[rel="icon"]').href.includes('favicon-32.png')), 'favicon link points at a real file (not data:,)');

console.log('\n— RENDER ON DEMAND');
const r0 = await page.evaluate(() => window.__raf); await page.waitForTimeout(5000); const r1 = await page.evaluate(() => window.__raf);
const rate = (r1 - r0) / 5; ok(rate < 30, `idle requestAnimationFrame callbacks/sec: ${rate.toFixed(1)}  (baseline was 160)`);
const loops = await page.evaluate(() => EG.perfReport()); console.log('      loops:', JSON.stringify(loops.map(l => `${l.loop}:${l.state}`)));
ok(loops.length >= 2 && loops.every(l => /parked|throttled/.test(l.state)), 'every astro loop that exists is parked or throttled — none free-running');

console.log('\n— TERMINAL');
await page.evaluate(() => document.getElementById('tour-overlay')?.remove());
await page.click('#open-cmd-runner'); await page.waitForTimeout(500);
const run = async (cmd) => { await page.fill('#cmd-input', cmd); await page.press('#cmd-input', 'Enter'); await page.waitForTimeout(350); };
const out = () => page.evaluate(() => document.getElementById('cmd-output').innerText);
await run('cistercian 2026'); ok(await page.evaluate(() => !!document.querySelector('#cmd-output svg.eg-cist')) , 'cistercian 2026 draws an SVG glyph');
ok((await out()).includes('2026 = 2000 + 0 + 20 + 6'), 'cistercian shows the decomposition');
await run('cistercian 99999'); ok((await out()).includes('0–9999'), 'cistercian rejects out-of-range');
await run('hlep'); ok(await page.evaluate(() => /Did you mean/.test(document.getElementById('cmd-output').innerText) && [...document.querySelectorAll('#cmd-output button')].some(b => b.textContent === 'help')), '"hlep" → Did you mean [help]');
await run('help portal'); ok((await out()).includes('Remote Viewing') && (await out()).includes('usage: portal'), 'help <cmd> shows category + usage');
await run('commands'); ok(await page.evaluate(() => document.querySelectorAll('#cmd-output button').length > 100), 'commands lists 100+ chips');
// Tab completion
await page.fill('#cmd-input', 'cistercian l'); await page.press('#cmd-input', 'Tab'); ok((await page.inputValue('#cmd-input')).startsWith('cistercian learn'), 'Tab completes arguments (cistercian l → learn)');
await page.fill('#cmd-input', 'remotev'); await page.press('#cmd-input', 'Tab'); ok((await page.inputValue('#cmd-input')).startsWith('remoteview'), 'Tab completes command names');
// history
await page.fill('#cmd-input', ''); await page.press('#cmd-input', 'ArrowUp'); const up1 = await page.inputValue('#cmd-input'); ok(up1.length > 0, `ArrowUp recalls history ("${up1}")`);
// secrets
await run('vault enc hunter2 secret message');
const hist = await page.evaluate(() => JSON.stringify(EG.history.load()) + JSON.stringify(commandHistory));
ok(!hist.includes('hunter2'), 'vault password is in neither persisted nor in-memory history');
ok(!(await out()).includes('hunter2'), 'vault password is not echoed on screen');
// localStorage namespace
const keys = await page.evaluate(() => Object.keys(localStorage)); ok(keys.every(k => k.startsWith('eg:')), 'all localStorage keys are namespaced: ' + keys.join(', '));
// nuke only removes our keys
await page.evaluate(() => { localStorage.setItem('OTHER_PROJECT_KEY', 'keep-me'); });
await page.evaluate(() => EG.store.clearAll());
ok(await page.evaluate(() => localStorage.getItem('OTHER_PROJECT_KEY') === 'keep-me'), 'nuke/clearAll leaves other projects\' localStorage alone');
// flash gate
await run('intersect'); ok((await out()).includes('PHOTOSENSITIVITY'), 'intersect (10 Hz flashing) is gated behind a warning');
// perf / libs
await run('perf'); ok((await out()).includes('RENDER LOOPS'), 'perf command works');
await run('libs'); ok((await out()).includes('not loaded'), 'libs command shows lazy libs not yet loaded');

console.log('\n— GALLERY');
const before = await page.evaluate(() => document.querySelector('.content-blocks > .block.active .block-text').innerText);
await page.evaluate(() => cycleBlocks()); const after = await page.evaluate(() => ({ n: document.querySelectorAll('.content-blocks > .block.active').length, t: document.querySelector('.content-blocks > .block.active .block-text')?.innerText }));
ok(after.n === 1 && after.t, `cycleBlocks keeps exactly one active slide ("${(after.t||'').slice(0, 30)}…")`);
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL E2E CHECKS PASSED'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
