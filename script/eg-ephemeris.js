/* =====================================================================
   eg-ephemeris.js — real planetary positions for the Astrolabe.
   Replaces the "refLon + dailyMotion × days" straight-line model that
   let Mercury/Venus wander 180° from the Sun and could never retrograde.

   Method (all public-domain astronomy, no dependencies):
   • Planets  — JPL "Keplerian elements for approximate positions of the major
                planets" (Standish), valid 1800–2050; solves Kepler's equation,
                geocentric ecliptic longitude, precessed to the date (tropical).
   • Sun      — Meeus, Astronomical Algorithms ch.25 (apparent, ~0.01°)
   • Moon     — Meeus ch.47, principal terms (~0.1–0.3°)
   Accuracy is validated by tests/ephemeris.test.mjs against known
   equinoxes, solstices, oppositions, conjunctions and eclipses.
   API:  EG.ephem.lon(body, date)      ecliptic longitude, degrees 0..360
         EG.ephem.has(body)            true for Mercury..Pluto
         EG.ephem.retrograde(body, date)
         EG.ephem.sun(date) / moon(date)
   ===================================================================== */
(function (global) {
  'use strict';
  const EG = (global.EG = global.EG || {});
  const RAD = Math.PI / 180, DEG = 180 / Math.PI;
  const norm = (d) => ((d % 360) + 360) % 360;
  const jd = (date) => date.getTime() / 86400000 + 2440587.5;
  const cent = (date) => (jd(date) - 2451545.0) / 36525;

  /* ---------- Sun (Meeus 25, low accuracy) ---------- */
  function sun(date) {
    const T = cent(date);
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    const omega = (125.04 - 1934.136 * T) * RAD;
    return norm(L0 + C - 0.00569 - 0.00478 * Math.sin(omega));
  }

  /* ---------- Moon (Meeus 47, principal terms) ---------- */
  // [D, M, M', F, coefficient in 1e-6 degree]
  const MOON_L = [
    [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034],
    [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
    [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892], [2, 1, 1, 0, -810], [4, -1, -2, 0, 759],
    [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691], [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537], [4, -1, 0, 0, 520],
  ];
  function moon(date) {
    const T = cent(date), T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
    const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000) * RAD;
    const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000) * RAD;
    const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000) * RAD;
    const F = (93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000) * RAD;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    let sl = 0;
    for (const [d, m, mp, f, c] of MOON_L) sl += c * Math.pow(E, Math.abs(m)) * Math.sin(d * D + m * M + mp * Mp + f * F);
    const A1 = (119.75 + 131.849 * T) * RAD, A2 = (53.09 + 479264.290 * T) * RAD;
    sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp * RAD - F) + 318 * Math.sin(A2);
    const omega = (125.04 - 1934.136 * T) * RAD;                         // nutation in longitude (main term) -> apparent
    return norm(Lp + sl / 1e6 - 0.00478 * Math.sin(omega));
  }

  /* ---------- planets (JPL approximate elements, 1800-2050) ---------- */
  // [a, da, e, de, I, dI, L, dL, varpi, dvarpi, Omega, dOmega]  (per Julian century)
  const EL = {
    Mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
    Venus: [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
    Earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
    Mars: [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
    Jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
    Saturn: [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
    Uranus: [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
    Neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
    Pluto: [39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482],
  };

  function helio(name, T) {
    const p = EL[name];
    const a = p[0] + p[1] * T, e = p[2] + p[3] * T, I = (p[4] + p[5] * T) * RAD;
    const L = p[6] + p[7] * T, w = p[8] + p[9] * T, Om = (p[10] + p[11] * T) * RAD;
    let M = norm(L - w); if (M > 180) M -= 360; M *= RAD;
    let E = M + e * Math.sin(M);                                           // Kepler by Newton iteration
    for (let i = 0; i < 12; i++) { const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= dE; if (Math.abs(dE) < 1e-12) break; }
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const om = (w - (p[10] + p[11] * T)) * RAD;                           // argument of perihelion
    const co = Math.cos(om), so = Math.sin(om), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
    return [
      (co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp,
      (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp,
      (so * sI) * xp + (co * sI) * yp,
    ];
  }

  function planet(name, date) {
    const T = cent(date);
    const p = helio(name, T), e = helio('Earth', T);
    const lonJ2000 = Math.atan2(p[1] - e[1], p[0] - e[0]) * DEG;
    return norm(lonJ2000 + 1.3969713 * T);                                // general precession J2000 -> mean equinox of date
  }

  function lon(body, date) {
    if (body === 'Sun') return sun(date);
    if (body === 'Moon') return moon(date);
    if (EL[body] && body !== 'Earth') return planet(body, date);
    throw new Error('Unknown body ' + body);
  }
  const has = (body) => !!EL[body] && body !== 'Earth';
  /** true while the body's apparent longitude is decreasing (℞) */
  function retrograde(body, date) {
    if (body === 'Sun' || body === 'Moon') return false;
    const d = (lon(body, new Date(date.getTime() + 43200000)) - lon(body, new Date(date.getTime() - 43200000)) + 540) % 360 - 180;
    return d < 0;
  }

  EG.ephem = { lon, has, retrograde, sun, moon, planet };
})(typeof window !== 'undefined' ? window : globalThis);
