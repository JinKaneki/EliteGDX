import { serve, launch, ROOT as SITE_ROOT } from './harness.mjs';
import os from 'node:os'; import path from 'node:path';
import fs from 'node:fs';
const ROOT = SITE_ROOT;
const { srv, url } = await serve(ROOT);
const { browser, context } = await launch({ serviceWorkers: 'block' }); const page = await context.newPage();
let fails = 0; const ok = (c, m) => { console.log((c ? ' ok  ' : 'FAIL ') + m); if (!c) fails++; };
const errors = []; page.on('pageerror', e => { if (!/Service worker is disabled/.test(e.message)) errors.push(e.message.slice(0, 220)); });
const shots = process.env.SHOTS_DIR || path.join(os.tmpdir(), 'eg-shots'); fs.mkdirSync(shots, { recursive: true });
await page.route('**/*', r => r.request().url().startsWith(url) ? r.continue() : r.abort());
await page.goto(url); await page.waitForTimeout(1200); await page.evaluate(() => document.getElementById('tour-overlay')?.remove());
const run = async (c, w = 600) => { await page.fill('#cmd-input', c); await page.press('#cmd-input', 'Enter'); await page.waitForTimeout(w); };
const text = () => page.evaluate(() => document.getElementById('cmd-output').innerText);

console.log('— PRECISION RING (linked into the Astrolabe)');
await page.evaluate(() => EG.sim.set({ t: Date.parse('2026-10-11T12:00:00Z'), playing: false }));
await page.locator('.astrolabe-dashboard').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
ok(await page.evaluate(() => document.getElementById('toggle-precision')?.textContent === 'Precision: ON'), 'Precision toggle exists and starts ON');
const cosBox = await page.evaluate(() => { const c = document.getElementById('cosmic-layer') || document.querySelector('.astrolabe-dashboard canvas:last-of-type'); const r = c.getBoundingClientRect(); return { id: c.id, w: Math.round(r.width), h: Math.round(r.height) }; });
console.log('      cosmic canvas:', JSON.stringify(cosBox));
// count how often the precision functions run while visible
await page.evaluate(() => { window.__p = { ring: 0, bodies: 0, aspects: 0 }; for (const k of ['ring', 'bodies', 'aspects']) { const o = EG.astroDraw[k]; EG.astroDraw[k] = function () { window.__p[k]++; return o.apply(this, arguments); }; } });
await page.waitForTimeout(2500); const calls = await page.evaluate(() => window.__p);
ok(calls.ring >= 1 && calls.bodies >= 1 && calls.aspects >= 1, 'ring + bodies + aspects are called by the Astrolabe draw loop: ' + JSON.stringify(calls));
await page.locator('.astrolabe-dashboard').screenshot({ path: shots + '/astro-precision-on.png' });
await page.click('#toggle-precision'); await page.waitForTimeout(1500);
const callsOff0 = await page.evaluate(() => ({ ...window.__p })); await page.waitForTimeout(2500); const callsOff1 = await page.evaluate(() => ({ ...window.__p }));
ok(await page.evaluate(() => document.getElementById('toggle-precision').textContent === 'Precision: OFF') && callsOff1.ring === callsOff0.ring, 'toggle OFF stops the precision drawing and restores the old glyph row');
await page.locator('.astrolabe-dashboard').screenshot({ path: shots + '/astro-precision-off.png' });
await page.click('#toggle-precision'); await page.waitForTimeout(1200);
// small-canvas scaling
await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(1500); await page.locator('.astrolabe-dashboard').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
await page.locator('.astrolabe-dashboard').screenshot({ path: shots + '/astro-precision-mobile.png' }); await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(800);

console.log('\n— SHARED CLOCK drives every panel');
const disp = () => page.evaluate(() => document.getElementById('shared-time-display').textContent);
await page.evaluate(() => EG.sim.set({ t: Date.parse('2030-06-01T12:00:00Z'), playing: false })); await page.waitForTimeout(1500);
console.log('      shared-time-display shows:', JSON.stringify(await disp()));
ok(/2030/.test(await disp()), 'Astrolabe display follows EG.sim (jumped to 2030)');
const simDay = () => page.evaluate(() => EG.sim.date().toISOString().slice(0, 10));
await page.evaluate(() => document.getElementById('astro-day').click()); await page.waitForTimeout(400); ok((await simDay()) === '2030-06-02', 'Astrolabe "+1 day" moves the shared clock (→ ' + await simDay() + ')');
await page.evaluate(() => document.getElementById('open-cmd-runner').click()); await page.waitForTimeout(300); await run('clock cosmic', 900); await page.evaluate(() => { document.getElementById('tour-overlay')?.remove(); });
await page.evaluate(() => document.getElementById('c-next-day').click()); await page.waitForTimeout(400); ok((await simDay()) === '2030-06-03', 'Cosmic Clock "+1 day" moves the SAME clock (→ ' + await simDay() + ')');
await page.evaluate(() => document.getElementById('fe-next-day').click()); await page.waitForTimeout(400); ok((await simDay()) === '2030-06-04', 'Flat-Earth "+1 day" moves the SAME clock (→ ' + await simDay() + ')');
await page.selectOption('astro-controls [data-a=preset]', 'm180'); await page.waitForTimeout(1500);
ok(await page.evaluate(() => Math.abs(EG.sky.moon(EG.sim.date()).elongation - 180) < .5) && /2030/.test(await disp()), '<astro-controls> "Next full moon" jumps every panel (display: ' + (await disp()).slice(0, 30) + ')');
await page.evaluate(() => EG.sim.set({ rate: 3600, playing: true })); await page.waitForTimeout(400);
ok(await page.evaluate(() => document.getElementById('astro-speed').textContent === '⚡3600x' && document.getElementById('c-speed').textContent === '⚡3600x' && document.getElementById('fe-speed').textContent === '⚡ 3600x' && document.getElementById('astro-playpause').textContent === '⏸ Pause'), 'speed + play labels of all three panels follow the clock');
await page.evaluate(() => document.getElementById('astro-speed').click()); await page.waitForTimeout(300);
ok(await page.evaluate(() => EG.sim.rate === 36000), 'an engine\'s own speed button continues from the SHARED rate (3600 → its next step 36000, not a stale index)');
await page.evaluate(() => EG.sim.set({ rate: 60, playing: true }));
const t1 = await page.evaluate(() => EG.sim.ms()); await page.waitForTimeout(1000); const t2 = await page.evaluate(() => EG.sim.ms()); ok(t2 - t1 > 50000 && t2 - t1 < 70000, `60× really runs ~60 s of sky per second (${((t2 - t1) / 1000).toFixed(0)} s)`);
await page.evaluate(() => document.getElementById('astro-reset').click()); await page.waitForTimeout(400); ok(await page.evaluate(() => !EG.sim.playing && EG.sim.rate === 1 && Math.abs(EG.sim.ms() - Date.now()) < 3000), 'Astrolabe Reset → now, paused, 1×');
await page.evaluate(() => document.getElementById('astro-sync').click()); await page.waitForTimeout(400); ok(await page.evaluate(() => EG.sim.isLive()), 'Sync → live');
ok(!/Hour of/.test(await page.evaluate(() => document.querySelector('astro-controls [data-r=read]').textContent)) && /full moon/i.test(await page.evaluate(() => document.querySelector('astro-controls [data-r=read]').textContent)), '<astro-controls> readout has no planetary-hour line, still shows moon/solstice/sunrise');
ok(/#t=|lat=/.test(await page.evaluate(() => location.hash)), 'URL hash is kept in sync: ' + await page.evaluate(() => location.hash));

console.log('\n— TRUE-BLACK MODE');
await page.click('#open-cmd-runner').catch(() => {}); await page.waitForTimeout(300);
if (!(await page.evaluate(() => !!document.getElementById('cmd-input')?.offsetParent))) await page.evaluate(() => document.getElementById('open-cmd-runner').click());
await page.evaluate(() => { document.querySelector('.fixed-bg').style.backgroundImage = 'url(images/IMG_BLUE.jpg)'; });
await run('oled on', 400);
const o = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('oled'), fixed: getComputedStyle(document.querySelector('.fixed-bg')).display, body: getComputedStyle(document.body).backgroundColor, html: getComputedStyle(document.documentElement).backgroundColor, bgimg: getComputedStyle(document.body).backgroundImage }));
ok(o.cls && o.fixed === 'none' && o.body === 'rgb(0, 0, 0)' && o.html === 'rgb(0, 0, 0)' && o.bgimg === 'none', 'oled on → slideshow layer hidden, <html>/<body> pure #000: ' + JSON.stringify(o));
ok(await page.evaluate(() => EG.store.get('oled') === '1'), 'choice is remembered');
await page.screenshot({ path: shots + '/oled-on.png' });
await page.reload(); await page.waitForTimeout(1200); ok(await page.evaluate(() => document.documentElement.classList.contains('oled')), 'still black after a reload');
await page.evaluate(() => document.getElementById('tour-overlay')?.remove()); await page.evaluate(() => document.getElementById('open-cmd-runner').click());
await run('oled off', 400); ok(await page.evaluate(() => !document.documentElement.classList.contains('oled') && getComputedStyle(document.querySelector('.fixed-bg')).display !== 'none' && !document.documentElement.style.getPropertyValue('--sx')), 'oled off → everything back, pixel-shift cleared');
await run('oled auto', 400); ok(await page.evaluate(() => EG.store.get('oled') === 'auto'), 'oled auto is stored as "auto" (so it survives a reload)');
const nightCases = await page.evaluate(() => {
  const r = {}; const at = (lat, lon, iso) => { EG.sim.set({ anchor: { lat, lon, name: 't' } }); return EG._oledNight(Date.parse(iso)); };
  r.sydneyLocalMorning = at(-33.87, 151.2, '2026-10-10T23:00:00Z');      // 10:00 local Oct 11  → DAY
  r.sydneyLocalNight = at(-33.87, 151.2, '2026-10-11T12:00:00Z');        // 23:00 local         → NIGHT
  r.greenwichNoon = at(51.48, 0, '2026-10-11T12:00:00Z');                // DAY
  r.greenwichMidnight = at(51.48, 0, '2026-10-11T00:30:00Z');            // NIGHT
  r.honoluluLocalEve = at(21.3, -157.86, '2026-10-11T05:30:00Z');        // 19:30 local         → NIGHT
  r.honoluluLocalAfternoon = at(21.3, -157.86, '2026-10-11T01:00:00Z');  // 15:00 local         → DAY
  r.tromsoDecember = at(69.65, 18.96, '2026-12-21T12:00:00Z');           // polar night         → NIGHT
  r.tromsoJune = at(69.65, 18.96, '2026-06-21T00:00:00Z');               // midnight sun        → DAY
  return r; });
console.log('      night() at far-east/west places:', JSON.stringify(nightCases));
ok(!nightCases.sydneyLocalMorning && nightCases.sydneyLocalNight && !nightCases.greenwichNoon && nightCases.greenwichMidnight && nightCases.honoluluLocalEve && !nightCases.honoluluLocalAfternoon && nightCases.tromsoDecember && !nightCases.tromsoJune, 'auto mode decides day/night correctly in Sydney, Greenwich, Honolulu and Tromsø (incl. polar night / midnight sun)');
await run('oled off', 300);

console.log('\n— REGRESSIONS');
ok(errors.length === 0, 'no uncaught page errors in the whole run' + (errors.length ? ': ' + errors.join(' | ') : ''));
console.log(fails ? `\n${fails} FAILURE(S) (part 2)` : '\nPART 2 PASSED'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
