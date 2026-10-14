import { serve, launch, ROOT } from './harness.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const { srv, url } = await serve(ROOT);
let fails = 0; const ok = (c, m) => { console.log((c ? ' ok  ' : 'FAIL ') + m); if (!c) fails++; };
const shots = process.env.SHOTS_DIR || path.join(os.tmpdir(), 'eg-shots'); fs.mkdirSync(shots, { recursive: true });

// ---------------- SERVICE WORKER (real, un-blocked) ----------------
console.log('— SERVICE WORKER');
{
  const { browser, context } = await launch(); const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => r.request().url().startsWith(url) ? r.continue() : r.abort());
  await page.goto(url); await page.evaluate(() => { window.__marker = 'same-document'; });
  await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(2500);
  ok(await page.evaluate(() => window.__marker === 'same-document'), 'first visit does NOT reload itself after the SW installs (that was a bug I introduced and fixed)');
  const cached = await page.evaluate(async () => { const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname); return out; });
  const shell = Object.entries(cached).find(([k]) => k.startsWith('eg-shell'))?.[1] || [];
  console.log('      shell cache holds', shell.length, 'files');
  ok(['/script/app.js', '/styles/styles.css', '/index.html', '/script/eg-core.js'].every(p => shell.includes(p)), 'app shell incl. app.js + styles.css is precached (the OLD sw.js never cached these)');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
  ok(await page.evaluate(() => !!(window.EG && EG.registry) && document.title.length > 0), 'OFFLINE reload works: page + scripts served from cache');
  ok(await page.evaluate(() => document.querySelectorAll('.content-blocks > .block').length === 78), 'OFFLINE: gallery still builds');
  ok(await page.evaluate(() => typeof window.fillInput === 'function' && typeof commands === 'object'), 'OFFLINE: terminal engine alive');
  ok(errors.length === 0, 'no page errors during SW + offline cycle' + (errors.length ? ': ' + errors.join('|') : ''));
  await browser.close();
}

// ---------------- VISUALS ----------------
const { browser, context } = await launch({ serviceWorkers: 'block' }); const page = await context.newPage();
await page.route('**/*', r => r.request().url().startsWith(url) ? r.continue() : r.abort());
await page.goto(url); await page.waitForTimeout(800); await page.evaluate(() => document.getElementById('tour-overlay')?.remove());

console.log('\n— GNOSIS TEMPLE');
await page.click('#gnosis-toggle-btn'); await page.waitForTimeout(900);
ok(await page.evaluate(() => document.getElementById('gnosis-toggle-btn').textContent === 'CLOSE' && document.getElementById('gnosis-toggle-btn').getAttribute('aria-expanded') === 'true'), 'toggle says CLOSE (typo fixed) and aria-expanded=true');
const gates = await page.evaluate(() => document.querySelectorAll('.gw-gate').length); ok(gates >= 12, `wheel built with ${gates} gates (one per philosophy section; you added The Beam & the Lens)`);
await page.locator('#gnosis-container').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
await page.screenshot({ path: shots + '/gnosis-open.png' });
await page.locator('#gnosis-panel .gw-gate').nth(6).click(); await page.waitForTimeout(1600);
const st = await page.evaluate(() => ({ cur: [...document.querySelectorAll('.gw-gate')].findIndex(b => b.getAttribute('aria-current') === 'true'), top: document.getElementById('gnosis-panel').scrollTop, label: document.querySelector('.gh-title').textContent, num: document.querySelector('.gh-num').textContent, turn: document.querySelector('.gw-ring').style.getPropertyValue('--turn') }));
console.log('      after clicking gate VII →', JSON.stringify(st));
ok(st.cur === 6 && st.top > 300, 'clicking a gate scrolls to that section and marks it current');
ok(/VII/.test(st.num) && st.label.length > 3 && Math.abs(parseFloat(st.turn) + 6 * 360 / gates) < 0.01, 'label updates and the wheel turns so the current gate is on top (-180°)');
await page.screenshot({ path: shots + '/gnosis-gate7.png' });
await page.locator('.gw-hub').click(); await page.waitForTimeout(1800);
ok(await page.evaluate(() => document.querySelector('.gh-num').textContent === 'The Second Book'), 'hub opens the collapsed Living Dashboard and travels there ("The Second Book")');
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
ok(await page.evaluate(() => document.getElementById('gnosis-panel').classList.contains('visible')), 'Esc does NOT close the panel (only the CLOSE button does)');
await page.locator('#gnosis-toggle-btn').screenshot({ path: shots + '/gnosis-button.png' });

console.log('\n— CISTERCIAN');
await page.click('#open-cmd-runner'); await page.waitForTimeout(400);
const run = async (c) => { await page.fill('#cmd-input', c); await page.press('#cmd-input', 'Enter'); await page.waitForTimeout(1600); };
await run('cistercian learn'); await run('cistercian 2026'); 
await page.locator('#cmd-output').screenshot({ path: shots + '/cistercian.png' });

console.log('\n— ASTROLABE (visible) — render loop + real ephemeris');
await page.evaluate(() => { window.__eph = 0; const o = EG.ephem.lon; EG.ephem.lon = function () { window.__eph++; return o.apply(this, arguments); }; });
await page.evaluate(() => { document.getElementById('cmd-output').closest('#cmd-runner, .cmd-modal, .modal, div[id*="runner"]') ; });
await page.keyboard.press('Escape');
const btn = await page.$('#toggle-acmc'); 
const astroHeading = await page.evaluate(() => { const c = document.getElementById('azimuthal-layer'); c.scrollIntoView({ block: 'center' }); return !!c; });
await page.waitForTimeout(2500);
const rep = await page.evaluate(() => EG.perfReport().filter(l => l.loop === 'astrolabe')[0]);
console.log('      astrolabe loop:', JSON.stringify(rep), ' ephem.lon calls so far:', await page.evaluate(() => window.__eph));
await browser.close(); srv.close();
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL VISUAL/SW CHECKS PASSED'); process.exit(fails ? 1 : 0);
