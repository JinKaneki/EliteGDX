import { serve, launch, ROOT as SITE_ROOT } from './harness.mjs';
import os from 'node:os'; import path from 'node:path';
import fs from 'node:fs';
const ROOT = SITE_ROOT;
const { srv, url } = await serve(ROOT);
const { browser, context } = await launch({ serviceWorkers: 'block', acceptDownloads: true }); const page = await context.newPage();
let fails = 0; const ok = (c, m) => { console.log((c ? ' ok  ' : 'FAIL ') + m); if (!c) fails++; };
const errors = []; page.on('pageerror', e => { if (!/Service worker is disabled/.test(e.message)) errors.push(e.message.slice(0, 200)); });
const shots = process.env.SHOTS_DIR || path.join(os.tmpdir(), 'eg-shots'); fs.mkdirSync(shots, { recursive: true });
// ---- mocked network: an IPTV playlist with a hostile channel name
const M3U = '#EXTM3U\n' + [...Array(60)].map((_, i) => `#EXTINF:-1,Channel ${i}\nhttps://s.test/${i}.m3u8`).join('\n') + '\n' +
  '#EXTINF:-1,NASA TV Public\nhttps://nasa.test/a.m3u8\n#EXTINF:-1,NASA TV Media\nhttps://nasa.test/b.m3u8\n#EXTINF:-1,Nasa "Quote\'s" <Edition>\nhttps://nasa.test/c.m3u8\n' +
  '#EXTINF:-1,<img src=x onerror=window.__pwned=1>\nhttps://evil.test/x.m3u8\n';
let m3uHits = 0;
await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith(url)) return r.continue();
  if (u.includes('iptv-org.github.io/iptv/index.m3u')) { m3uHits++; return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'text/plain', body: M3U }); }
  return r.abort(); });
await page.goto(url); await page.waitForTimeout(1000); await page.evaluate(() => document.getElementById('tour-overlay')?.remove());
const run = async (c, w = 600) => { await page.fill('#cmd-input', c); await page.press('#cmd-input', 'Enter'); await page.waitForTimeout(w); };
const text = () => page.evaluate(() => document.getElementById('cmd-output').innerText);

console.log('— LOAD / WIRING (your files)');
ok(errors.length === 0, 'no JS errors on load' + (errors.length ? ': ' + errors.join(' | ') : ''));
ok(await page.evaluate(() => !!customElements.get('astro-controls') && !!document.querySelector('astro-controls .ac-row') && !!EG.sim && !!EG.astroDraw && !!EG.registry.get('oled')), '<astro-controls> is mounted, EG.sim / EG.astroDraw / oled command exist');
ok(await page.evaluate(() => !document.getElementById('wake-dot') && !EG.wakeDot), 'wake-lock dot removed');
await page.click('#open-cmd-runner'); await page.waitForTimeout(300);
await run('hour'); ok(/Command not found: hour/.test(await text()), '`hour` command is gone');

console.log('\n— LOGO on the button');
const btn = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('gnosis-toggle-btn'), '::before'); return { bg: cs.backgroundImage, radius: cs.borderRadius, anim: cs.animationName }; });
ok(/EgLOGO\.png/.test(btn.bg) && btn.anim === 'eg-spin', 'GNOSIS button shows EgLOGO.png and turns slowly: ' + btn.bg.slice(0, 60));
ok((await page.request.get(url + 'images/icons/EgLOGO.png')).ok(), 'EgLOGO.png is served from images/icons/');
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
await page.evaluate(() => { const r = document.getElementById('close-cmd-runner') || document.querySelector('[id^="close-"]'); r && r.click && r.click(); });
await page.locator('#gnosis-toggle-btn').scrollIntoViewIfNeeded(); await page.locator('#gnosis-toggle-btn').screenshot({ path: shots + '/btn-logo.png' });

console.log('\n— GNOSIS side-opening scroll');
const clip = () => page.evaluate(() => getComputedStyle(document.getElementById('gnosis-panel')).clipPath);
const rods = () => page.evaluate(() => [...document.querySelectorAll('.gnosis-unroll .gr')].map(r => Math.round(r.getBoundingClientRect().left + r.getBoundingClientRect().width / 2)));
const wrapBox = await page.evaluate(() => { const b = document.querySelector('.gnosis-unroll').getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), c: Math.round(b.left + b.width / 2) }; });
ok(await page.evaluate(() => !!document.querySelector('.gnosis-unroll #gnosis-panel') && document.querySelectorAll('.gnosis-unroll .gr').length === 2), 'panel is wrapped, two rollers exist');
await page.click('#gnosis-toggle-btn'); await page.waitForTimeout(350);
const c1 = await clip(), r1 = await rods(); await page.screenshot({ path: shots + '/gnosis-opening.png' });
await page.waitForTimeout(1500); const c2 = await clip(), r2 = await rods();
console.log('      clip-path mid-open:', c1, '| rollers x:', r1, '→ fully open:', c2, r2, '| wrapper', JSON.stringify(wrapBox));
ok(/inset\(0px (\d+(\.\d+)?)%? /.test(c1) === false || c1 !== c2, 'clip-path animates (mid-way differs from final)');
ok(r2[0] < r1[0] && r2[1] > r1[1], 'the two rollers move OUTWARD from the centre while opening (left ' + r1[0] + '→' + r2[0] + ', right ' + r1[1] + '→' + r2[1] + ')');
ok(Math.abs(r2[0] - wrapBox.l) < 14 && Math.abs(r2[1] - wrapBox.r) < 14, 'rollers end at the left and right edges of the panel');
const logo = await page.evaluate(() => { const i = document.querySelector('.gnosis-logo'); return i && { ok: i.complete && i.naturalWidth > 0, radius: getComputedStyle(i).borderRadius, bg: getComputedStyle(i).backgroundColor, anim: getComputedStyle(i).animationName, svg: !!document.querySelector('svg.gnosis-emblem') }; });
ok(logo && logo.ok && logo.radius.includes('50%') && logo.bg === 'rgb(0, 0, 0)' && logo.anim === 'eg-spin' && !logo.svg, 'inside Gnosis: circular black logo, turning, dharma emblem gone ' + JSON.stringify(logo));
await page.screenshot({ path: shots + '/gnosis-opened.png' });
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
ok(await page.evaluate(() => document.getElementById('gnosis-panel').classList.contains('visible')), 'Esc does NOT close the Gnosis panel');
await page.click('#gnosis-toggle-btn'); await page.waitForTimeout(500); const midClose = await clip(); await page.waitForTimeout(1500);
ok(await page.evaluate(() => !document.getElementById('gnosis-panel').classList.contains('visible') && document.getElementById('gnosis-panel').getBoundingClientRect().height < 5), 'CLOSE rolls it shut (mid-close clip: ' + midClose + ') and collapses the height afterwards');

console.log('\n— TORAH/TAO scroll: Esc does nothing');
await page.locator('#scroll-wheel').scrollIntoViewIfNeeded(); await page.click('#scroll-wheel'); await page.waitForTimeout(1200);
await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
ok(await page.evaluate(() => document.getElementById('sacred-scroll').classList.contains('open')), 'Esc does NOT roll the Torah scroll back up');
await page.click('#scroll-wheel'); await page.waitForTimeout(1300); ok(await page.evaluate(() => document.getElementById('sacred-scroll').hidden), 'clicking the wheel again closes it');

console.log('\n— FLASH loop command');
await page.evaluate(() => document.getElementById('open-cmd-runner').click()); await page.waitForTimeout(300);
await run('flash 2', 300);
const sel = () => page.evaluate(() => document.querySelector('#tree-of-life circle.sel')?.dataset.node);
const seq = [await sel()]; for (let i = 0; i < 4; i++) { await page.waitForTimeout(2100); seq.push(await sel()); }
ok(seq.join('>') === 'kether>chokmah>binah>chesed>geburah', 'walks Kether→…→Geburah automatically: ' + seq.join('>'));
await page.waitForTimeout(2100 * 7);
const later = await sel(); const walkedPast = await page.evaluate(() => EG.sephirot.running() && EG.sephirot.looping());
ok(walkedPast, 'still running after more than one full pass (11 steps) → it LOOPS');
await run('flash stop', 300); const s1 = await sel(); await page.waitForTimeout(4500); const s2 = await sel();
ok(s1 === s2 && !(await page.evaluate(() => EG.sephirot.running())), '`flash stop` stops it (stays on ' + s2 + ')');
await run('flash 2', 300); await page.focus('#cmd-input'); await page.keyboard.press('Control+c'); await page.waitForTimeout(300);
ok(!(await page.evaluate(() => EG.sephirot.running())), 'Ctrl+C stops the Flash too');
await page.evaluate(() => document.getElementById('eg-walk').click()); await page.waitForTimeout(300); ok(await page.evaluate(() => EG.sephirot.running() && !EG.sephirot.looping()), 'the BUTTON still walks once (not looping)'); await page.evaluate(() => EG.sephirot.stop());

console.log('\n— GALLERY / BG next · prev');
const slide = () => page.evaluate(() => currentBlockIndex);               // the slideshow array is SHUFFLED, so use the real index, not DOM order
const s0 = await slide(); await run('gallery next', 300); const s1n = await slide(); await run('gallery prev', 300); const s2n = await slide();
ok(s1n === s0 + 1 && s2n === s0, `gallery next/prev: ${s0} → ${s1n} → ${s2n}`);
await page.evaluate(() => { document.querySelectorAll('.content-blocks > .block.active').forEach(b => b.classList.remove('active')); currentBlockIndex = 0; blocks[0].classList.add('active'); });
await run('gallery prev', 300); ok((await slide()) === 77 && await page.evaluate(() => document.querySelectorAll('.content-blocks > .block.active').length === 1), 'gallery prev from the first slide wraps to the last (77), one slide active');
await run('gallery next', 300); ok((await slide()) === 0, 'and next wraps back to 0');
const bgimg = () => page.evaluate(() => document.querySelector('.fixed-bg').style.backgroundImage);
await run('bg next', 300); const b1 = await bgimg(); await run('bg next', 300); const b2 = await bgimg(); await run('bg prev', 300); const b3 = await bgimg();
ok(/ORIGINBACKG/.test(b1) && /Ataraxia/.test(b2) && b3 === b1, 'bg next → ORIGINBACKG, next → Ataraxia, prev → ORIGINBACKG');
await run('bg prev', 300); ok(/NikaBack/i.test(await bgimg()), 'bg prev from the first image wraps to the LAST one (NikaBack)');
await run('bg', 300); ok(/independent/.test(await text()), '`bg` reports its status');

console.log('\n— BACKUP / NUKE / IMPORT');
await page.evaluate(() => { EG.store.set('marker', 'precious'); EG.store.set('akashic_tags', '{"a":"1"}'); });
const dl = page.waitForEvent('download'); await run('backup', 400); const d = await dl; const bpath = path.join(os.tmpdir(), 'eg-backup.json'); await d.saveAs(bpath);
const bk = JSON.parse(fs.readFileSync(bpath, 'utf8'));
ok(bk.format === 'elitegdx-backup' && bk.keys['eg:marker'] === 'precious' && bk.keys['eg:akashic_tags'], 'backup file holds your eg:* keys (' + Object.keys(bk.keys).length + ')');
await run('nuke', 300); ok(/backup import/.test(await text()) && await page.evaluate(() => EG.store.get('marker') === 'precious'), '`nuke` alone only warns and mentions backup import');
await run('nuke --yes', 6000); ok(await page.evaluate(() => EG.store.get('marker') === null), '`nuke --yes` wiped the data');
await page.waitForTimeout(500);
if (!(await page.evaluate(() => !!document.getElementById('cmd-input')?.offsetParent))) { await page.evaluate(() => document.getElementById('tour-overlay')?.remove()); await page.click('#open-cmd-runner'); }
const fc = page.waitForEvent('filechooser'); await run('backup import', 300); const chooser = await fc; await chooser.setFiles(bpath);
await page.waitForTimeout(2500); await page.waitForLoadState('load');
ok(await page.evaluate(() => EG.store.get('marker') === 'precious' && EG.store.get('akashic_tags') === '{"a":"1"}'), 'backup import restored everything (and the page reloaded)');
// hostile import: non-eg keys and non-strings must be ignored
await page.evaluate(() => document.getElementById('tour-overlay')?.remove()); await page.click('#open-cmd-runner');
fs.writeFileSync(path.join(os.tmpdir(), 'evil.json'), JSON.stringify({ format: 'elitegdx-backup', keys: { 'OTHER_APP': 'x', 'eg:ok': 'fine', 'eg:bad key!': 'x', 'eg:obj': { a: 1 } } }));
const fc2 = page.waitForEvent('filechooser'); await run('backup import', 300); await (await fc2).setFiles(path.join(os.tmpdir(), 'evil.json')); await page.waitForTimeout(2500);
ok(await page.evaluate(() => localStorage.getItem('OTHER_APP') === null && localStorage.getItem('eg:ok') === 'fine' && localStorage.getItem('eg:obj') === null), 'import only accepts eg:* string keys (other keys ignored)');

console.log('\n— IPTV search');
await page.evaluate(() => document.getElementById('tour-overlay')?.remove()); if (!(await page.evaluate(() => !!document.getElementById('cmd-input')?.offsetParent))) await page.click('#open-cmd-runner');
await page.evaluate(() => { window.__played = []; window.playIPTVInTerminal = (u, n) => window.__played.push([u, n]); });
m3uHits = 0; await run('iptv search nasa', 900);
const rows = await page.evaluate(() => [...document.querySelectorAll('#cmd-output .iptv-ch')].map(e => e.textContent));
ok(rows.length === 3 && rows.every(r => /nasa/i.test(r)), 'iptv search nasa → 3 matches: ' + JSON.stringify(rows));
ok(/SEARCH – NASA/.test(await text()), 'header says SEARCH – NASA');
await run('iptv search channel 2', 900); ok(/page 2\//.test(await text()) || /page 1\/2/.test(await text()), 'search paginates');
ok(m3uHits === 1, `playlist downloaded ONCE for both searches (cache): ${m3uHits}`);
await run('iptv search zzzz', 600); ok(/No channels match "zzzz"/.test(await text()), 'no-match message');
await run('iptv search', 400); ok(/Usage: iptv search/.test(await text()), 'usage message');
await run('iptv search img', 800); ok(await page.evaluate(() => window.__pwned === undefined) && (await text()).includes('<img src=x onerror=window.__pwned=1>'), 'hostile channel name is shown as TEXT, nothing executes');
await run('iptv search quote', 800); await page.locator('#cmd-output .iptv-ch').last().click(); 
ok(await page.evaluate(() => window.__played.length === 1 && window.__played[0][0] === 'https://nasa.test/c.m3u8' && window.__played[0][1] === 'Nasa "Quote\'s" <Edition>'), 'clicking a channel plays it with the exact URL and name (quotes survive): ' + JSON.stringify(await page.evaluate(() => window.__played)));
await page.keyboard.press('Escape');
console.log(fails ? `\n${fails} FAILURE(S) (part 1)` : '\nPART 1 PASSED'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
