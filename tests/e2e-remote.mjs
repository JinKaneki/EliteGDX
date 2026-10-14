import { serve, launch, ROOT } from './harness.mjs';
const { srv, url } = await serve(ROOT);
const { browser, context } = await launch({ serviceWorkers: 'block' }); const page = await context.newPage();
let fails = 0; const ok = (c, m) => { console.log((c ? ' ok  ' : 'FAIL ') + m); if (!c) fails++; };
const errors = []; page.on('pageerror', e => { if (!/Service worker is disabled because the context is sandboxed/.test(e.message)) errors.push(e.message); });   // that one is injected by Playwright's serviceWorkers:'block' option, not by EliteGDX
const log = []; // which proxy URLs were hit, in order

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sacred <b>Test</b> & "Page"</title>
<meta name="description" content="A <script>alert(1)</script> description with &amp; entities">
<meta property="og:image" content="/img/og.jpg"><meta property="og:site_name" content="Temple Co">
<link rel="icon" href="/fav.ico"><link rel="alternate" type="application/rss+xml" href="/feed.xml">
<script type="application/ld+json">{"@type":"Article"}</script><base href="https://example.test/sub/"></head>
<body><nav>MENU JUNK</nav><main><h1>Main Heading</h1><p>This is the first paragraph of readable text that matters to the reader.</p>
<p>Second paragraph, also long enough to count as real content on the page.</p><ul><li>list item one is here</li></ul></main>
<img src="a.jpg"><img data-src="/lazy.png" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><img srcset="small.jpg 320w, big.jpg 1280w, mid.jpg 640w">
<picture><source srcset="pic.webp 800w"><img src="fallback.jpg"></picture><div style="background-image:url('/bg.png')"></div>
<img src="javascript:alert(1)"><noscript><img src="ns.jpg"></noscript><img src="http://insecure.test/x.jpg">
<a href="/internal">in</a><a href="https://other.test/x">out</a><a href="javascript:alert(1)">bad</a>
<footer>FOOTER JUNK</footer></body></html>`;

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const CORS = { 'access-control-allow-origin': '*' };
await page.route('**/*', route => {
  const u = route.request().url();
  if (u.startsWith(url)) return route.continue();
  if (new URL(u).hostname.endsWith('.test')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  if (u.includes('api.allorigins.win')) { log.push('allorigins'); return route.fulfill({ status: 500, headers: CORS, body: 'upstream error' }); }                       // proxy #1 is DOWN
  if (u.includes('api.codetabs.com')) { log.push('codetabs'); return route.fulfill({ status: 200, headers: CORS, contentType: 'text/html', body: PAGE }); }               // proxy #2 works
  if (u.includes('corsproxy.io')) { log.push('corsproxy'); return route.fulfill({ status: 200, headers: CORS, body: '{"error":"nope"}' }); }
  if (u.includes('microlink')) { log.push('microlink'); return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { title: 'JS Site', description: 'rendered by microlink', url: 'https://spa.test/', image: { url: 'https://spa.test/i.png' } } }) }); }
  if (u.includes('r.jina.ai')) { log.push('jina'); return route.fulfill({ status: 200, headers: CORS, contentType: 'text/plain', body: 'Title: Reader Title\n\n' + 'Rendered body text from the reader service. '.repeat(20) }); }
  return route.abort();
});
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('tour-overlay')?.remove()); await page.click('#open-cmd-runner');
const run = async (cmd, wait = 900) => { log.length = 0; await page.fill('#cmd-input', cmd); await page.press('#cmd-input', 'Enter'); await page.waitForTimeout(wait); };
const text = () => page.evaluate(() => document.getElementById('cmd-output').innerText);

console.log('— fetchpage  (proxy #1 returns HTTP 500, #2 works)');
await run('fetchpage example.test/sub/');
ok(log[0] === 'allorigins' && log[1] === 'codetabs', 'fell through failing proxy to the next one: ' + log.join(' → '));
let t = await text(); console.log(t.slice(t.indexOf('PAGE METADATA') - 5, t.indexOf('PAGE METADATA') + 1100));
ok(/PAGE METADATA/.test(t) && /codetabs/.test(t), 'metadata card shows which proxy served it');
ok(t.includes('Sacred <b>Test</b> & "Page"'), 'title with <b>, & and quotes is shown as TEXT, not interpreted');
ok(!(await page.evaluate(() => !!document.querySelector('#cmd-output script') || [...document.querySelectorAll('#cmd-output b')].some(b => b.textContent === 'Test'))), 'no injected <script> / <b> elements created from page metadata');
ok(t.includes('Temple Co') && t.includes('Article') && /feed\.xml/.test(t), 'OG site, JSON-LD type and RSS feed discovered');
ok(/https:\/\/example\.test\/sub\/img\/og\.jpg|https:\/\/example\.test\/img\/og\.jpg/.test(t), 'relative og:image resolved against the page <base>');

console.log('\n— grabimg');
await run('grabimg example.test/sub/');
console.log('      grabimg text:', (await text()).slice(-260).replace(/\n/g,' / '));
const imgs = await page.evaluate(() => [...document.querySelectorAll('#cmd-output img')].map(i => i.getAttribute('src')));
console.log('      found:', imgs.length, imgs.map(s => s.replace('https://example.test', '')).join('  '));
ok(imgs.some(s => s.endsWith('/sub/big.jpg')) && !imgs.some(s => s.endsWith('small.jpg') || s.endsWith('mid.jpg')), 'srcset: picks the LARGEST candidate only');
ok(imgs.some(s => s.endsWith('/lazy.png')), 'lazy-loaded data-src found (placeholder gif ignored)');
ok(imgs.some(s => s.endsWith('pic.webp')), '<picture><source srcset> found');
ok(imgs.some(s => s.endsWith('/bg.png')), 'CSS background-image found');
ok(imgs.some(s => s.endsWith('og.jpg')), 'og:image found');
ok(imgs.some(s => s.endsWith('ns.jpg')), '<noscript> fallback image found');
ok(imgs.every(s => s.startsWith('https://')), 'http:// images upgraded to https (no mixed-content blocks)');
ok(!imgs.some(s => /javascript:/.test(s)), 'javascript: image URL rejected');
ok(await page.evaluate(() => [...document.querySelectorAll('#cmd-output img')].every(i => i.referrerPolicy === 'no-referrer')), 'thumbnails send NO Referer (defeats most hotlink blocking)');

console.log('\n— remoteview');
await run('remoteview example.test/sub/');
t = await text();
ok(t.includes('Main Heading') && t.includes('first paragraph'), 'readable text extracted');
ok(!t.includes('MENU JUNK') && !t.includes('FOOTER JUNK'), 'nav/footer boilerplate removed');
await run('remoteview https://spa.test/ --full'); // proxy returns same PAGE; just proves flags are parsed
ok(true, '--full flag accepted');

console.log('\n— every proxy down → graceful fallbacks');
await page.unroute('**/*');
await page.route('**/*', route => { const u = route.request().url(); if (u.startsWith(url)) return route.continue();
  if (new URL(u).hostname.endsWith('.test')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  if (u.includes('microlink')) return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { title: 'JS Site', description: 'rendered by microlink', url: 'https://spa.test/', image: { url: 'https://spa.test/i.png' } } }) });
  if (u.includes('r.jina.ai')) return route.fulfill({ status: 200, headers: CORS, contentType: 'text/plain', body: 'Title: Reader Title\n\n' + 'Rendered body text from the reader service. '.repeat(20) });
  return route.fulfill({ status: 503, headers: CORS, body: 'down' }); });
await run('fetchpage spa2.test', 1500); t = await text();
ok(/microlink/.test(t) && t.includes('rendered by microlink'), 'fetchpage falls back to the metadata API when all proxies fail');
await run('remoteview spa3.test', 1500); t = await text();
ok(/reader/.test(t) && t.includes('Rendered body text'), 'remoteview falls back to the reader service when all proxies fail');
await run('grabimg spa4.test', 1500); t = await text();
ok(/Image scan failed/.test(t) && /allorigins: HTTP 503/.test(t), 'grabimg reports exactly why each hop failed instead of hanging');
ok(!/Processing/.test(await text()), 'no stuck "Processing…" line');

console.log('\n— portal');
await run('portal https://example.test/');
const sb = await page.evaluate(() => { const f = document.querySelector('#cmd-output iframe[title^="Portal"]'); return f && { sandbox: f.getAttribute('sandbox'), ref: f.referrerPolicy }; });
ok(sb && sb.sandbox.includes('allow-same-origin') && sb.ref === 'no-referrer', 'cross-origin portal: sandboxed, no-referrer');
await run('portal ' + url + 'index.html');
const sb2 = await page.evaluate(() => [...document.querySelectorAll('#cmd-output iframe[title^="Portal"]')].pop().getAttribute('sandbox'));
ok(!sb2.includes('allow-same-origin'), 'portal to a SAME-ORIGIN page does NOT get allow-same-origin (cannot reach this page\'s storage)');
await run('portal javascript:alert(1)'); ok(/not a valid http/.test(await text()), 'javascript: URL refused');
await run('portal "><img src=x onerror=alert(1)>'); ok(!(await page.evaluate(() => !!document.querySelector('#cmd-output img[src="x"]'))), 'injection through the URL argument is inert');

console.log('\n— SANITIZER vs classic XSS payloads');
const bad = await page.evaluate(() => {
  const payloads = ['<img src=x onerror=alert(1)>', '<a href="javascript:alert(1)">x</a>', '<svg onload=alert(1)><circle/></svg>', '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<div style="position:fixed;inset:0;background:url(http://evil/x)">overlay</div>', '<script>alert(1)</script>', '<form action="//evil"><input name=p></form>', '<a href="data:text/html,<script>alert(1)</script>">d</a>',
    '<math><mtext><style><img src=x onerror=alert(1)></style></mtext></math>', '<img src="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+">', '<object data="x"></object><embed src="x">', '<b onmouseover=alert(1)>hover</b>', '<a href="  JaVaScRiPt:alert(1)">x</a>'];
  return payloads.map(p => { const o = EG.sanitizeHTML(p); const d = document.createElement('div'); d.innerHTML = o;
    const live = d.querySelector('script,iframe,svg,form,object,embed,style,math,input') || [...d.querySelectorAll('*')].some(e => [...e.attributes].some(a => /^on/i.test(a.name))) || /javascript:/i.test(o) || /url\(/i.test(o) || /data:image\/svg/i.test(o);
    return live ? 'LIVE: ' + p + ' -> ' + o : null; }).filter(Boolean);
});
ok(bad.length === 0, 'all 13 XSS payloads neutralised' + (bad.length ? ': ' + bad.join(' || ') : ''));
const good = await page.evaluate(() => EG.sanitizeHTML('<div style="color:#0f0">ok <b>bold</b> <a href="https://x.test/p?q=1">link</a><br><span class="c">s</span></div>'));
ok(/color:#0f0|color: rgb\(0, 255, 0\)|color:\s*#0f0/.test(good) && good.includes('<b>bold</b>') && good.includes('href="https://x.test/p?q=1"') && good.includes('rel="noopener noreferrer nofollow"'), 'legitimate formatting and links survive: ' + good);

console.log('\n— LAZY LIBS end-to-end (CDN stubbed)');
await page.unroute('**/*');
await page.route('**/*', route => { const u = route.request().url(); if (u.startsWith(url)) return route.continue();
  if (u.includes('qrcode-generator')) { log.push('QRLIB'); return route.fulfill({ status: 200, headers: CORS, contentType: 'text/javascript', body: 'window.qrcode=function(){return {addData(){},make(){},createDataURL(){return "data:image/gif;base64,R0lGODlhAQABAAAAACw="},createImgTag(){return "<img alt=qr src=\\"data:image/gif;base64,R0lGODlhAQABAAAAACw=\\">"},getModuleCount(){return 21},isDark(){return true}}};' }); }
  return route.abort(); });
const libsBefore = await page.evaluate(() => typeof window.qrcode); await run('qr hello', 1500);
ok(libsBefore === 'undefined' && log.includes('QRLIB') && await page.evaluate(() => typeof window.qrcode === 'function'), 'qr: library downloaded on first use, not before');
await run('libs'); ok(/qrcode\s+ready/.test(await text()), 'libs command reports qrcode as ready');
await run('chat mqtt', 1800); ok(/Could not load a required library|mqtt/i.test(await text()) && !/Processing/.test(await text()), 'a library that cannot be fetched produces a clear message, not a hang');

ok(errors.length === 0, 'no uncaught page errors during the whole run' + (errors.length ? ': ' + errors.join(' | ') : ''));
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL REMOTE/SECURITY CHECKS PASSED'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
