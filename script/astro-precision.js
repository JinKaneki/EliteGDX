/* astro-precision.js — astrotheme / astroseek-style precision drawing for ANY canvas wheel.
     EG.astroDraw.ring(ctx, cx, cy, R, ang)              1° / 5° / 10° / 30° bars + degree numbers (10, 20 inside every sign)
     EG.astroDraw.bodies(ctx, cx, cy, R, ang, date, o)   planet glyphs, de-cluttered, with 14°23' ℞ and a leader line to the TRUE degree
     EG.astroDraw.aspects(ctx, cx, cy, R, ang, date)     chords: conjunction / sextile / square / trine / opposition (tight orb = bright)
   R is the SAME radius for all three (the ring); everything else is placed relative to it and scales down on small screens.
   ang(lon) turns an ecliptic longitude (0-360) into a canvas angle in radians — your Astrolabe already has it:  getAngle = lon => Math.PI - lon*Math.PI/180 */
(function (g) {
  'use strict';
  const EG = g.EG, D = (EG.astroDraw = {});
  const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const K = (R) => Math.max(.55, Math.min(1.25, R / 240));                 // scale factor: 1.0 at R=240px
  const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const COL = { Sun: '#ffd24d', Moon: '#e8e8ff', Mercury: '#b0e0ff', Venus: '#ff9de2', Mars: '#ff5a4d', Jupiter: '#ffb347', Saturn: '#c9b27c', Uranus: '#5ff0e8', Neptune: '#6c8cff', Pluto: '#c58bff' };
  const ASPECT_STYLE = { conjunction: '#ffffff', sextile: '#5fd1ff', square: '#ff5a4d', trine: '#5dff8a', opposition: '#ff4d9d' };

  D.ring = function (ctx, cx, cy, R, ang) {
    const k = K(R); ctx.save(); ctx.lineCap = 'butt';
    for (let d = 0; d < 360; d++) {
      const len = (d % 30 === 0 ? 14 : d % 10 === 0 ? 10 : d % 5 === 0 ? 7 : 4) * k;       // sign boundary > 10° > 5° > 1°
      const a = ang(d), [x1, y1] = pt(cx, cy, R, a), [x2, y2] = pt(cx, cy, R - len, a);
      ctx.strokeStyle = d % 30 === 0 ? 'rgba(232,196,106,.95)' : d % 10 === 0 ? 'rgba(232,196,106,.7)' : 'rgba(255,255,255,.35)';
      ctx.lineWidth = d % 30 === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(232,196,106,.8)'; ctx.font = Math.max(7, 9 * k) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let d = 0; d < 360; d += 10) { if (d % 30 === 0) continue; const [x, y] = pt(cx, cy, R - 20 * k, ang(d)); ctx.fillText(String(d % 30), x, y); }
    ctx.restore();
  };

  D.bodies = function (ctx, cx, cy, R, ang, date, o) {
    o = o || {}; const k = K(R), gap = o.gap || Math.min(14, 8 / k), size = (o.size || 15) * k;       // smaller wheel => glyphs need more angular room
    const lons = BODIES.map((b) => EG.ephem.lon(b, date)), shown = EG.sky.declutter(lons, gap);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    BODIES.forEach((b, i) => {
      const f = EG.sky.fmtLon(lons[i]), rx = EG.ephem.retrograde(b, date) ? ' ℞' : '';
      const [tx, ty] = pt(cx, cy, R - 14 * k, ang(lons[i])), [lx, ly] = pt(cx, cy, R - 34 * k, ang(shown[i])), [gx, gy] = pt(cx, cy, R - 48 * k, ang(shown[i])), [dx, dy] = pt(cx, cy, R - 66 * k, ang(shown[i]));
      ctx.strokeStyle = COL[b]; ctx.globalAlpha = .55; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lx, ly); ctx.stroke();   // leader: TRUE degree -> drawn glyph
      ctx.globalAlpha = 1; ctx.fillStyle = COL[b]; ctx.font = size + 'px serif'; ctx.fillText(EG.sky.GLYPH[b], gx, gy);
      ctx.font = Math.max(7, 9 * k) + 'px monospace'; ctx.fillText(f.deg + '°' + String(f.min).padStart(2, '0') + "'" + rx, dx, dy);
    });
    ctx.restore(); return lons;
  };

  D.aspects = function (ctx, cx, cy, R, ang, date) {
    const k = K(R), r = R - 82 * k, bodies = BODIES.map((b) => ({ name: b, lon: EG.ephem.lon(b, date) })), list = EG.sky.aspects(bodies);
    const lon = (n) => bodies.find((b) => b.name === n).lon;
    ctx.save(); ctx.lineWidth = 1;
    list.forEach((a) => {
      const [x1, y1] = pt(cx, cy, r, ang(lon(a.a))), [x2, y2] = pt(cx, cy, r, ang(lon(a.b)));
      ctx.strokeStyle = ASPECT_STYLE[a.name]; ctx.globalAlpha = Math.max(.15, 1 - a.orb / 8);                                                   // exact aspects bright, loose ones fade
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.restore(); return list;
  };
})(window);
