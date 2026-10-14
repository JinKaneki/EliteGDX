#!/usr/bin/env node
/* tools/make-icons.mjs — turn ONE picture into every icon a website/PWA needs.
   Usage:  npm i sharp        (once, anywhere — it is only a build helper)
           node tools/make-icons.mjs images/Coolicon.png
   Writes: images/icons/favicon-16|32|48.png, favicon.ico (16+32+48), apple-touch-icon.png (180),
           icon-192.png, icon-512.png, maskable-512.png (art shrunk into the 80% "safe zone")          */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp; try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.NPM_GLOBAL || '', 'sharp')); }

export function buildIco(pngs /* [{size, buf}] */) {
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length; const dir = [], data = [];
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); e.writeUInt8(size >= 256 ? 0 : size, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
    dir.push(e); data.push(buf); offset += buf.length;
  }
  return Buffer.concat([head, ...dir, ...data]);
}

export async function makeIcons(src, outDir) {
  await mkdir(outDir, { recursive: true });
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  const square = (n) => sharp(src).resize(n, n, { fit: 'contain', background: clear }).png({ compressionLevel: 9 }).toBuffer();
  const files = {};
  for (const n of [16, 32, 48]) files[`favicon-${n}.png`] = await square(n);
  files['icon-192.png'] = await square(192);
  files['icon-512.png'] = await square(512);
  files['apple-touch-icon.png'] = await sharp(src).resize(180, 180, { fit: 'contain', background: clear }).flatten({ background: '#000000' }).png().toBuffer();   // iOS paints transparency black anyway
  const inner = await sharp(src).resize(410, 410, { fit: 'contain', background: clear }).png().toBuffer();                                                  // 80% of 512 = safe zone for maskable
  files['maskable-512.png'] = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#000000' } }).composite([{ input: inner, gravity: 'center' }]).png().toBuffer();
  files['favicon.ico'] = buildIco([16, 32, 48].map(size => ({ size, buf: files[`favicon-${size}.png`] })));
  for (const [name, buf] of Object.entries(files)) { await writeFile(path.join(outDir, name), buf); console.log('wrote', path.join(outDir, name), (buf.length / 1024).toFixed(1) + ' KB'); }
  return files;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const src = process.argv[2] || 'images/Coolicon.png';
  const out = process.argv[3] || path.join(path.dirname(src), 'icons');          // optional 2nd argument = output folder
  makeIcons(src, out).then(() => console.log('\nDone. Icons are in', out));
}
