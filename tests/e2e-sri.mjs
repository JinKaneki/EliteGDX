import { serve, launch, ROOT } from './harness.mjs';
import fs from 'node:fs'; import { createHash } from 'node:crypto'; import path from 'node:path';
import os from 'node:os';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eg-sri-')); fs.cpSync(ROOT, tmp, { recursive: true, filter: (p) => !p.includes('node_modules') });
const good = Buffer.from('window.qrcode=function(){return {__from:"VENDORED"}};');
fs.mkdirSync(tmp + '/vendor', { recursive: true }); fs.writeFileSync(tmp + '/vendor/qrcode.js', good);
const sri = 'sha384-' + createHash('sha384').update(good).digest('base64');
const write = (integrity) => fs.writeFileSync(tmp + '/script/libs.vendored.js', 'window.EG_VENDORED=' + JSON.stringify({ qrcode: { src: 'vendor/qrcode.js', integrity } }) + ';');
let fails = 0; const ok = (c, m) => { console.log((c ? ' ok  ' : 'FAIL ') + m); if (!c) fails++; };
async function trial(integrity, label) {
  write(integrity); const { srv, url } = await serve(tmp); const { browser, context } = await launch({ serviceWorkers: 'block' }); const page = await context.newPage();
  const seen = [];
  await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith(url)) { if (u.includes('/vendor/')) seen.push('LOCAL'); return r.continue(); }
    if (u.includes('qrcode-generator')) { seen.push('CDN'); return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'text/javascript', body: 'window.qrcode=function(){return {__from:"CDN"}};' }); } return r.abort(); });
  await page.goto(url); await page.waitForTimeout(500);
  await page.evaluate(() => EG.loadLib('qrcode')); const from = await page.evaluate(() => window.qrcode().__from); const st = await page.evaluate(() => EG.libStatus.qrcode);
  await browser.close(); srv.close(); return { seen, from, st };
}
let t = await trial(sri, 'good'); ok(t.from === 'VENDORED' && !t.seen.includes('CDN'), `matching SRI → your vendored copy is used, CDN never contacted (${t.st})`);
t = await trial('sha384-' + Buffer.alloc(48, 1).toString('base64'), 'tampered'); ok(t.from === 'CDN' && t.seen.includes('LOCAL') && t.seen.includes('CDN'), `WRONG SRI hash → vendored file REFUSED by the browser, falls back to the pinned CDN (${t.st})`);
console.log(fails ? `\n${fails} FAILURE(S)` : '\nSRI CHECKS PASSED'); process.exit(fails ? 1 : 0);
