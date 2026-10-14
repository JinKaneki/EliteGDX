import { serve, launch, ROOT } from './harness.mjs';
const { srv, url } = await serve(ROOT);
const { browser, context } = await launch({ serviceWorkers: 'block' }); const page = await context.newPage();
const errors = []; page.on('pageerror', e => { if (!/Service worker is disabled/.test(e.message)) errors.push(e.message); });
let ytFetched = 0;
await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith(url)) return r.continue();
  if (u.includes('youtube.com/iframe_api')) { ytFetched++; return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'text/javascript',
    body: 'window.YT={Player:function(el,o){window.__ytCreated=JSON.stringify(o.playerVars||{})+"|"+(o.videoId||"");setTimeout(function(){o.events&&o.events.onReady&&o.events.onReady({target:{playVideo:function(){},setVolume:function(){}}})},10)}};setTimeout(function(){window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady()},5);' }); }
  return r.abort(); });
await page.goto(url); await page.waitForTimeout(600); await page.evaluate(() => document.getElementById('tour-overlay')?.remove()); await page.click('#open-cmd-runner');
console.log('YouTube API fetched at page load:', ytFetched, '(must be 0)');
await page.fill('#cmd-input', 'play youtube dQw4w9WgXcQ'); await page.press('#cmd-input', 'Enter'); await page.waitForTimeout(2500);
console.log('YouTube API fetched after `play youtube`:', ytFetched, '| player constructed:', await page.evaluate(() => window.__ytCreated));
console.log('output tail:', (await page.evaluate(() => document.getElementById('cmd-output').innerText)).slice(-200).replace(/\n/g, ' / '));
console.log('page errors:', errors);
const good = ytFetched === 1 && errors.length === 0; console.log(good ? 'YT LAZY LOAD OK' : 'YT CHECK NEEDS ATTENTION'); await browser.close(); srv.close();
