// node tests/run-all.mjs   — runs every suite and prints a summary
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url)); let bad = 0;
for (const f of ['cist.unit', 'ephemeris.test', 'vendor.test', 'e2e', 'e2e-remote', 'e2e-visual', 'e2e-sri', 'e2e-yt', 'e2e-update', 'e2e-update2', 'guide-check']) {
  const r = spawnSync('node', [path.join(dir, f + '.mjs')], { encoding: 'utf8' });
  console.log((r.status === 0 ? 'PASS ' : 'FAIL ') + f); if (r.status !== 0) { bad++; console.log((r.stdout + r.stderr).split('\n').slice(-12).join('\n')); }
}
process.exit(bad ? 1 : 0);
