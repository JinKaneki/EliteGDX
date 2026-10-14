/* eg-sky.js — sky maths on top of EG.ephem (Sun/Moon/planet longitudes). Pure functions: no DOM. */
(function (g) {
  'use strict';
  const EG = g.EG, RAD = Math.PI / 180, DEG = 180 / Math.PI;
  const norm = (d) => ((d % 360) + 360) % 360;
  const wrap = (d) => ((d + 540) % 360) - 180;             // any angle -> -180..+180
  const sky = (EG.sky = {});

  /* ---------- zodiac formatting: 14°23' ♊  (what astrotheme / astroseek print) ---------- */
  const SIGNS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  sky.SIGNS = SIGNS;
  sky.GLYPH = { Sun:'☉', Moon:'☽', Mercury:'☿', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇' };
  sky.fmtLon = (lon) => {
    const total = Math.round(norm(lon) * 60) % 21600;          // work in whole arc-minutes: rounding can never print 30°00' or 60'
    const s = Math.floor(total / 1800), within = total % 1800;
    const d = Math.floor(within / 60), m = within % 60;
    return { sign: SIGNS[s], name: SIGN_NAMES[s], deg: d, min: m, text: d + '°' + String(m).padStart(2, '0') + "' " + SIGNS[s] };
  };

  /* ---------- find when f(date) crosses zero going upward (negative -> positive) ---------- */
  function crossing(f, from, dir, stepMs, maxMs) {
    let a = from.getTime(), fa = f(new Date(a));
    for (let t = stepMs; t <= maxMs; t += stepMs) {
      const b = a + dir * stepMs, fb = f(new Date(b));
      const lo = dir > 0 ? fa : fb, hi = dir > 0 ? fb : fa;     // value at the earlier / later instant
      if (lo < 0 && hi >= 0) {                                   // bracketed: bisect (40 halvings -> sub-second)
        let x = Math.min(a, b), y = Math.max(a, b);
        for (let i = 0; i < 40; i++) { const m = (x + y) / 2; f(new Date(m)) < 0 ? (x = m) : (y = m); }
        return new Date((x + y) / 2);
      }
      a = b; fa = fb;
    }
    return null;
  }

  /* ---------- Moon: phase, age, next events ---------- */
  const elong = (d) => norm(EG.ephem.moon(d) - EG.ephem.sun(d));          // 0 new · 90 first quarter · 180 full · 270 last quarter
  const PHASES = [[0, 'New Moon'], [90, 'First Quarter'], [180, 'Full Moon'], [270, 'Last Quarter']];
  sky.nextPhase = (from, target) => crossing((d) => wrap(elong(d) - target), from, +1, 3 * 36e5, 32 * 864e5);
  sky.prevPhase = (from, target) => crossing((d) => wrap(elong(d) - target), from, -1, 3 * 36e5, 32 * 864e5);
  sky.moon = (d) => {
    const e = elong(d), illum = (1 - Math.cos(e * RAD)) / 2;
    const name = e < 11.25 || e >= 348.75 ? 'New Moon' : e < 78.75 ? 'Waxing Crescent' : e < 101.25 ? 'First Quarter' : e < 168.75 ? 'Waxing Gibbous' :
      e < 191.25 ? 'Full Moon' : e < 258.75 ? 'Waning Gibbous' : e < 281.25 ? 'Last Quarter' : 'Waning Crescent';
    const lastNew = sky.prevPhase(d, 0);
    return { elongation: e, illumination: illum, name, ageDays: lastNew ? (d - lastNew) / 864e5 : null,
             next: PHASES.map(([t, n]) => ({ name: n, date: sky.nextPhase(d, t) })).sort((a, b) => a.date - b.date) };
  };

  /* ---------- Sun: equinoxes & solstices ---------- */
  const TERMS = [[0, 'March Equinox'], [90, 'June Solstice'], [180, 'September Equinox'], [270, 'December Solstice']];
  sky.nextTerms = (from) => TERMS.map(([t, n]) => ({ name: n, date: crossing((d) => wrap(EG.ephem.sun(d) - t), from, +1, 864e5, 400 * 864e5) })).sort((a, b) => a.date - b.date);

  /* ---------- Sunrise / sunset / solar noon at a place (iterated: accurate to ~1 minute below ~65° latitude) ---------- */
  function sunEq(d) {                                          // declination + equation of time for instant d
    const T = (d.getTime() / 864e5 + 2440587.5 - 2451545) / 36525;
    const lam = EG.ephem.sun(d) * RAD, eps = (23.4392911 - 0.0130042 * T) * RAD;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) * DEG;
    const L0 = 280.46646 + 36000.76983 * T;
    return { dec, eotMin: 4 * wrap(L0 - 0.0057183 - ra) };        // minutes: apparent minus mean solar time
  }
  sky.sunTimes = (date, lat, lon) => {                           // date: any instant on the wanted UTC day
    const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    let noon = day + (12 - lon / 15) * 36e5, rise = noon - 6 * 36e5, set = noon + 6 * 36e5, polar = null;
    const phi = lat * RAD, h0 = -0.8333 * RAD;                   // -0.833°: refraction + solar radius
    for (let i = 0; i < 3; i++) {
      const n = sunEq(new Date(noon)); noon = day + (12 - lon / 15 - n.eotMin / 60) * 36e5;
      const cosH = (Math.sin(h0) - Math.sin(phi) * Math.sin(n.dec)) / (Math.cos(phi) * Math.cos(n.dec));
      if (cosH > 1) { polar = 'polar night'; break; } if (cosH < -1) { polar = 'midnight sun'; break; }
      const H = Math.acos(cosH) * DEG / 15 * 36e5;
      rise = noon - H; set = noon + H;
    }
    return polar ? { noon: new Date(noon), rise: null, set: null, polar } : { noon: new Date(noon), rise: new Date(rise), set: new Date(set), polar: null };
  };

  /* ---------- Planetary hours (Chaldean order) ---------- */
  const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
  const DAY_RULER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];     // Sun..Sat
  sky.planetaryHour = (now, lat, lon) => {
    const day = (k) => sky.sunTimes(new Date(now.getTime() + k * 864e5), lat, lon);
    let k = 0; while (day(k).rise && day(k).rise > now) k--;                              // sunrise on/before now
    const a = day(k), b = day(k + 1); if (!a.rise || !b.rise) return null;
    const night = a.set <= now, start = night ? a.set : a.rise, end = night ? b.rise : a.set;
    const t0 = start.getTime(), len = (end - start) / 12, idx = Math.min(11, Math.floor((now - start) / len));   // .getTime(): Date + number would concatenate a STRING
    const ruler0 = DAY_RULER[new Date(a.rise.getTime() + lon / 15 * 36e5).getUTCDay()];    // weekday of that sunrise, at the place
    const hourNo = (night ? 12 : 0) + idx;
    const ruler = CHALDEAN[(CHALDEAN.indexOf(ruler0) + hourNo) % 7];                          // each hour steps one place FORWARD along Saturn>Jupiter>Mars>Sun>Venus>Mercury>Moon
    return { ruler, dayRuler: ruler0, night, n: idx + 1, from: new Date(t0 + idx * len), to: new Date(t0 + (idx + 1) * len) };
  };

  /* ---------- precision-ring helpers (Astrolabe) ---------- */
  // Spread planets that sit closer than `gap` degrees so their glyphs never overlap. TRUE positions are untouched —
  // only the drawn angle changes. Close planets form a cluster; the cluster is spread evenly around its own centre,
  // in the same order. Returns an array parallel to `lons` with the angle at which to DRAW each glyph.
  sky.declutter = (lons, gap) => {
    const n = lons.length; if (!n) return [];
    const items = lons.map((l, i) => ({ i, l: norm(l) })).sort((p, q) => p.l - q.l);
    let at = 0, best = -1;                                       // start just after the widest empty arc so no cluster straddles 0°
    for (let k = 0; k < n; k++) { const g = n === 1 ? 360 : norm(items[(k + 1) % n].l - items[k].l) || 360; if (g > best) { best = g; at = (k + 1) % n; } }
    const ring = []; let prev = -Infinity, base = 0;
    for (let k = 0; k < n; k++) { const it = items[(at + k) % n]; let u = it.l + base; if (u < prev) { base += 360; u += 360; } ring.push({ i: it.i, u }); prev = u; }
    let groups = ring.map((r) => ({ m: [r] }));
    const span = (g) => { const c = g.m.reduce((s, r) => s + r.u, 0) / g.m.length, w = (g.m.length - 1) * gap / 2; return { c, lo: c - w - gap / 2, hi: c + w + gap / 2 }; };
    for (let changed = true; changed;) {                         // merge neighbouring clusters whose spread glyphs would still touch
      changed = false;
      for (let k = 0; k < groups.length - 1; k++) if (span(groups[k]).hi > span(groups[k + 1]).lo) { groups.splice(k, 2, { m: groups[k].m.concat(groups[k + 1].m) }); changed = true; break; }
    }
    const out = [];
    groups.forEach((g) => { const { c } = span(g), w = (g.m.length - 1) * gap / 2; g.m.forEach((r, k) => { out[r.i] = norm(c - w + k * gap); }); });
    return out;
  };
  const ASPECTS = [['conjunction', 0, 8, '☌'], ['sextile', 60, 4, '⚹'], ['square', 90, 6, '□'], ['trine', 120, 6, '△'], ['opposition', 180, 8, '☍']];
  sky.aspects = (bodies) => {                                  // bodies: [{name, lon}]
    const out = [];
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const sep = Math.abs(wrap(bodies[i].lon - bodies[j].lon));
      for (const [name, ang, orb, glyph] of ASPECTS) if (Math.abs(sep - ang) <= orb) out.push({ a: bodies[i].name, b: bodies[j].name, name, glyph, orb: +Math.abs(sep - ang).toFixed(2) });
    }
    return out.sort((x, y) => x.orb - y.orb);
  };
})(typeof window !== 'undefined' ? window : globalThis);
