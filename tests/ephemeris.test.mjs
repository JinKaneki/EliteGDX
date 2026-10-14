import { fileURLToPath } from 'node:url';
// Validates eg-ephemeris.js against well-known astronomical events (not against itself).
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = { EG: {} }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2] || fileURLToPath(new URL('../script/eg-ephemeris.js', import.meta.url)), 'utf8'), ctx);
const E = ctx.EG.ephem;
const D = (s) => new Date(s + 'Z');
const wrap = (x) => ((x + 540) % 360) - 180;                       // -180..180
let fails = 0; const row = (ok, msg) => { console.log((ok ? ' ok  ' : 'FAIL ') + msg); if (!ok) fails++; };

// find time (hours) when f(date) crosses zero near a guess (secant on a ±3-day window)
function crossing(f, guess, days = 3) {
  let lo = guess.getTime() - days * 864e5, hi = guess.getTime() + days * 864e5, flo = f(new Date(lo));
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2, fm = f(new Date(mid)); if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid; }
  return new Date((lo + hi) / 2);
}
const hoursOff = (a, b) => Math.abs(a - b) / 36e5;

console.log('SUN — equinoxes & solstices (apparent longitude of the Sun = 0/90/180/270)');
[['2024-03-20T03:06', 0], ['2025-06-21T02:42', 90], ['2025-09-22T18:19', 180], ['2025-12-21T15:03', 270], ['2026-06-21T08:24', 90]].forEach(([t, target]) => {
  const got = crossing(d => wrap(E.sun(d) - target), D(t), 1);
  const h = hoursOff(got, D(t)); row(h < 0.25, `Sun reaches ${target}° at ${got.toISOString().slice(0, 16)}Z  (reference ${t}Z, off by ${(h * 60).toFixed(0)} min)`);
});

console.log('\nPLANETS — oppositions (planet longitude − Sun longitude = 180°)');
[['Mars', '2022-12-08T05:00'], ['Mars', '2025-01-16T02:00'], ['Jupiter', '2023-11-03T09:00'], ['Jupiter', '2024-12-07T10:00'], ['Saturn', '2023-08-27T13:00'], ['Saturn', '2024-09-08T10:00']]
  .forEach(([b, t]) => {
    const got = crossing(d => wrap(E.lon(b, d) - E.sun(d) - 180), D(t), 6); const dd = hoursOff(got, D(t)) / 24;
    row(dd < 1.5, `${b} opposition ${got.toISOString().slice(0, 10)}  (reference ${t.slice(0, 10)}, off by ${dd.toFixed(2)} days)`);
  });

console.log('\nVENUS — conjunctions with the Sun');
[['inferior 2025-03-22', '2025-03-22T01:00'], ['superior 2026-01-06', '2026-01-06T01:00']].forEach(([n, t]) => {
  const got = crossing(d => wrap(E.lon('Venus', d) - E.sun(d)), D(t), 6); const dd = hoursOff(got, D(t)) / 24;
  row(dd < 1.5, `Venus ${n}: model ${got.toISOString().slice(0, 10)} (off by ${dd.toFixed(2)} days)`);
});

console.log('\nMOON — new/full moon at known eclipses (Sun–Moon longitude difference 0° or 180°)');
[['solar 2024-04-08', '2024-04-08T18:17', 0], ['solar 2026-08-12', '2026-08-12T17:46', 0], ['lunar 2025-03-14', '2025-03-14T06:59', 180], ['lunar 2025-09-07', '2025-09-07T18:11', 180]]
  .forEach(([n, t, tgt]) => {
    const got = crossing(d => wrap(E.moon(d) - E.sun(d) - tgt), D(t), 1); const h = hoursOff(got, D(t));
    row(h < 1.0, `Eclipse ${n}: model syzygy ${got.toISOString().slice(0, 16)}Z (off by ${(h * 60).toFixed(0)} min)`);
  });

console.log('\nPHYSICAL SANITY over 2020-2040');
let maxMe = 0, maxVe = 0;
for (let t = D('2020-01-01').getTime(); t < D('2040-01-01').getTime(); t += 864e5 * 2) { const d = new Date(t); const s = E.sun(d); maxMe = Math.max(maxMe, Math.abs(wrap(E.lon('Mercury', d) - s))); maxVe = Math.max(maxVe, Math.abs(wrap(E.lon('Venus', d) - s))); }
row(maxMe < 29 && maxMe > 20, `Mercury never strays more than ${maxMe.toFixed(1)}° from the Sun (real limit ≈ 28°)`);
row(maxVe < 48 && maxVe > 42, `Venus never strays more than ${maxVe.toFixed(1)}° from the Sun (real limit ≈ 47°)`);
row(E.retrograde('Mars', D('2025-01-01')) && !E.retrograde('Mars', D('2025-06-01')), 'Mars is retrograde on 2025-01-01 and direct on 2025-06-01');
row(E.retrograde('Mercury', D('2024-12-05')) && !E.retrograde('Mercury', D('2024-12-20')) && E.retrograde('Mercury', D('2025-03-25')), 'Mercury: retrograde 2024-12-05 (℞ Nov 25–Dec 15), direct 2024-12-20, retrograde again 2025-03-25 (℞ Mar 15–Apr 7)');
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL EPHEMERIS CHECKS PASSED'); process.exit(fails ? 1 : 0);
