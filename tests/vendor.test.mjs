import { fileURLToPath } from 'node:url';
// Tests tools/vendor.mjs with a fake network: correct download, correct SRI, correct generated file, youtube skipped.
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { createHash } from 'node:crypto';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vend-')); fs.mkdirSync(path.join(tmp, 'script'));
fs.copyFileSync(fileURLToPath(new URL('../script/libs.config.js', import.meta.url)), path.join(tmp, 'script/libs.config.js'));
process.argv[2] = tmp; process.argv[1] = '/not-main';
const mod = await import(new URL('../tools/vendor.mjs', import.meta.url).href + '?x=' + Date.now());
const hits = [];
const fakeFetch = async (url) => { hits.push(url); const body = Buffer.from('/* fake ' + url + ' */ window.X=1;'); return { ok: true, status: 200, arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) }; };
const out = await mod.vendorAll(fakeFetch);
assert.deepEqual(Object.keys(out).sort(), ['firebase-app', 'firebase-db', 'hls', 'mqtt', 'peerjs', 'qrcode']);       // youtube skipped
assert(!hits.some(u => u.includes('youtube')));
const f = fs.readFileSync(path.join(tmp, 'vendor/hls.js'));
assert.equal(out.hls.integrity, 'sha384-' + createHash('sha384').update(f).digest('base64'));
const gen = fs.readFileSync(path.join(tmp, 'script/libs.vendored.js'), 'utf8');
const sandbox = { window: {} }; (await import('node:vm')).runInNewContext(gen, sandbox);
assert.equal(sandbox.window.EG_VENDORED.mqtt.src, 'vendor/mqtt.js'); assert(/^sha384-/.test(sandbox.window.EG_VENDORED.qrcode.integrity));
console.log('vendor.mjs: downloads', hits.length, 'libs, SRI hashes verified, libs.vendored.js generated, YouTube correctly skipped');
