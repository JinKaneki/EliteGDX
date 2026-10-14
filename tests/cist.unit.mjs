import { fileURLToPath } from 'node:url';
// Pure-function test of the Cistercian geometry (no browser needed)
import assert from 'node:assert/strict';
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = { document: { getElementById: () => null, createElementNS: () => ({}), head: {} } }; ctx.window = ctx;
ctx.EG = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(fileURLToPath(new URL('../script/eg-cistercian.js', import.meta.url)), 'utf8'), ctx);
const { segments, explain } = ctx.EG.cistercian;
const flat = (n) => JSON.parse(JSON.stringify(segments(n).flatMap(p => p.segs.map(s => s.join(',')))));

assert.deepEqual(flat(0), []);
assert.deepEqual(flat(1), ['0,0,1,0']);          // units: top bar right
assert.deepEqual(flat(10), ['0,0,-1,0']);        // tens: top bar LEFT
assert.deepEqual(flat(100), ['0,3,1,3']);        // hundreds: BOTTOM bar right
assert.deepEqual(flat(1000), ['0,3,-1,3']);      // thousands: bottom-left
assert.deepEqual(flat(3), ['0,0,1,1']);          // diagonal down
assert.deepEqual(flat(4), ['0,1,1,0']);          // diagonal up
assert.equal(flat(5).length, 2); assert.equal(flat(7).length, 2); assert.equal(flat(8).length, 2); assert.equal(flat(9).length, 3);
assert.equal(flat(9999).length, 12);
assert.deepEqual(JSON.parse(JSON.stringify(segments(2026).map(p => p.digit))), [6, 2, 0, 2]);
for (const bad of [10000, -1, 'abc', NaN]) assert.throws(() => segments(bad), { name: 'RangeError' });
assert.equal(explain(2026), '2026 = 2000 + 0 + 20 + 6');
const seen = new Map();
for (let n = 0; n <= 9999; n++) {
  const key = segments(n).flatMap(p => p.segs.map(s => s.join(',')).sort()).sort().join('|');
  assert(!seen.has(key), `collision ${n} vs ${seen.get(key)}`); seen.set(key, n);
}
console.log('cistercian: all assertions passed; 10,000 numbers render with unique glyphs');
