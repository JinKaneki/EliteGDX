/* =====================================================================
   eg-cistercian.js — Cistercian numerals, drawn by hand (no library).
   Adds the terminal command:   cistercian <0-9999> [more numbers] | now | date | learn

   How a Cistercian numeral works (13th-century monastic notation):
   one vertical STEM carries up to four digits, one per quadrant —
        units  (upper right)      tens      (upper left,  mirrored left-right)
        hundreds (lower right,    thousands (lower left,  mirrored both ways)
                  mirrored up-down)
   The shape of a digit 1-9 is built from four strokes in the upper-right
   quadrant:  top bar · lower bar · diagonal ╲ · diagonal ╱ · side bar.
   ===================================================================== */
(function (global) {
  'use strict';
  const EG = global.EG;

  // strokes of digit d in the UNITS quadrant. Stem is x=0, quadrant is 1 wide, rows y∈[0,1] (top)…
  const DIGIT = {
    0: [],
    1: [[0, 0, 1, 0]],                                  // top bar
    2: [[0, 1, 1, 1]],                                  // lower bar
    3: [[0, 0, 1, 1]],                                  // diagonal ╲
    4: [[0, 1, 1, 0]],                                  // diagonal ╱
    5: [[0, 1, 1, 0], [0, 0, 1, 0]],                    // 4 + 1
    6: [[1, 0, 1, 1]],                                  // side bar
    7: [[0, 0, 1, 0], [1, 0, 1, 1]],                    // 1 + 6
    8: [[0, 1, 1, 1], [1, 0, 1, 1]],                    // 2 + 6
    9: [[0, 0, 1, 0], [0, 1, 1, 1], [1, 0, 1, 1]],      // 1 + 2 + 6
  };
  const PLACES = [
    { name: 'units', color: '#ffd700', fx: 1, fy: 1 },
    { name: 'tens', color: '#00f0ff', fx: -1, fy: 1 },
    { name: 'hundreds', color: '#ff4dff', fx: 1, fy: -1 },
    { name: 'thousands', color: '#4aff9e', fx: -1, fy: -1 },
  ];
  const STEM = 3;                                       // stem height in units (rows: top 0-1, empty 1-2, bottom 2-3)

  /** Pure: number 0-9999 -> list of {place, digit, segs:[[x1,y1,x2,y2]…]} in glyph units. */
  function segments(n) {
    n = Math.floor(Number(n));
    if (!(n >= 0 && n <= 9999)) throw new RangeError('Cistercian numerals cover 0–9999');
    const digits = [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10, Math.floor(n / 1000)];
    return digits.map((d, i) => {
      const p = PLACES[i];
      const segs = DIGIT[d].map(([x1, y1, x2, y2]) => {
        const tx = (x) => x * p.fx, ty = (y) => p.fy === 1 ? y : STEM - y;
        return [tx(x1), ty(y1), tx(x2), ty(y2)];
      });
      return { place: p.name, digit: d, color: p.color, segs };
    });
  }

  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

  function injectStyle() {
    if (document.getElementById('eg-cist-style')) return;
    const st = document.createElement('style'); st.id = 'eg-cist-style';
    st.textContent = '.eg-cist line.d{stroke-dasharray:1;stroke-dashoffset:1;animation:egdraw .9s ease forwards}' +
      '@keyframes egdraw{to{stroke-dashoffset:0}}' +
      '@media (prefers-reduced-motion:reduce){.eg-cist line.d{animation:none;stroke-dashoffset:0}}' +
      '.eg-cist{filter:drop-shadow(0 0 4px currentColor)}';
    document.head.appendChild(st);
  }

  /** DOM: an <svg> glyph for n. opts: {unit:px, learn:bool, label:string} */
  function svg(n, opts) {
    opts = opts || {}; injectStyle();
    const U = opts.unit || 34, padX = 30, padY = 16, W = padX * 2 + U * 2, Hh = padY * 2 + U * STEM + (opts.label ? 14 : 0);
    const cx = W / 2, top = padY;
    const s = S('svg', { class: 'eg-cist', viewBox: '0 0 ' + W + ' ' + Hh, width: W, height: Hh, role: 'img', 'aria-label': 'Cistercian numeral ' + n });
    s.style.color = '#ffd700';
    const X = (x) => cx + x * U, Y = (y) => top + y * U;
    if (opts.learn) {
      [{ n: 'units', x: 0, y: 0 }, { n: 'tens', x: -1, y: 0 }, { n: 'hundreds', x: 0, y: 2 }, { n: 'thousands', x: -1, y: 2 }].forEach(q => {
        const col = PLACES.find(p => p.name === q.n).color;
        s.appendChild(S('rect', { x: X(q.x), y: Y(q.y), width: U, height: U, fill: col, 'fill-opacity': .07, stroke: col, 'stroke-opacity': .35, 'stroke-dasharray': '3 3' }));
        const t = S('text', { x: X(q.x) + U / 2, y: Y(q.y) + U / 2 + 3, 'text-anchor': 'middle', 'font-size': 9, fill: col, 'fill-opacity': .85, 'font-family': 'monospace' });
        t.textContent = q.n.slice(0, 4); s.appendChild(t);
      });
    }
    // stem
    s.appendChild(S('line', { x1: X(0), y1: Y(0), x2: X(0), y2: Y(STEM), stroke: '#cfcfcf', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: .9 }));
    let delay = 0;
    segments(n).forEach(part => part.segs.forEach(([x1, y1, x2, y2]) => {
      const l = S('line', { class: 'd', pathLength: 1, x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), stroke: part.color, 'stroke-width': 4, 'stroke-linecap': 'round' });
      l.style.animationDelay = (delay += 0.12) + 's'; s.appendChild(l);
    }));
    if (opts.label) { const t = S('text', { x: cx, y: Hh - 3, 'text-anchor': 'middle', 'font-size': 11, fill: '#bbb', 'font-family': 'monospace' }); t.textContent = opts.label; s.appendChild(t); }
    return s;
  }

  /** Plain-text decomposition: 2026 -> "2000 + 0 + 20 + 6" */
  const explain = (n) => { n = Number(n); const p = [Math.floor(n / 1000) * 1000, Math.floor(n / 100) % 10 * 100, Math.floor(n / 10) % 10 * 10, n % 10]; return n + ' = ' + p.join(' + '); };

  EG.cistercian = { segments, svg, explain, DIGIT, PLACES };

  /* ---------------- terminal command ---------------- */
  const out = () => document.getElementById('cmd-output');
  const el = (tag, style, text) => { const n = document.createElement(tag); if (style) n.style.cssText = style; if (text != null) n.textContent = text; return n; };
  const pad = (n) => String(n);

  function card(items, title, foot) {
    const box = el('div', 'border-left:3px solid #ffd700;padding-left:10px;margin:10px 0;');
    box.appendChild(el('b', 'color:#ffd700;', '🧮 ' + title));
    const row = el('div', 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;');
    items.forEach(it => { const c = el('div', 'text-align:center;'); c.appendChild(svg(it.n, { label: it.label || String(it.n), learn: it.learn })); row.appendChild(c); });
    box.appendChild(row);
    if (foot) box.appendChild(el('div', 'color:#999;font-size:.85rem;margin-top:4px;white-space:pre-line;', foot));
    out().appendChild(box); out().scrollTop = out().scrollHeight;
  }

  function run(args) {
    const a0 = (args[0] || '').toLowerCase();
    if (!a0) return 'Usage: cistercian <0-9999> [more…]  |  now  |  date  |  learn\nExample: cistercian 2026';
    if (a0 === 'now') {
      const d = new Date(); card([{ n: d.getHours(), label: 'hours ' + pad(d.getHours()) }, { n: d.getMinutes(), label: 'min ' + pad(d.getMinutes()) }, { n: d.getSeconds(), label: 'sec ' + pad(d.getSeconds()) }], 'THE HOUR, IN STONE-MASON SCRIPT',
        'Each number is one glyph. Run it again in a few seconds and watch the seconds change.'); return '';
    }
    if (a0 === 'date') {
      const d = new Date(); card([{ n: d.getDate(), label: 'day' }, { n: d.getMonth() + 1, label: 'month' }, { n: d.getFullYear(), label: 'year' }], 'TODAY', explain(d.getFullYear())); return '';
    }
    if (a0 === 'learn') {
      card([1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ n, label: String(n) })), 'THE NINE SHAPES (units quadrant)',
        '1 top bar · 2 lower bar · 3 diagonal ╲ · 4 diagonal ╱ · 5 = 4+1 · 6 side bar · 7 = 1+6 · 8 = 2+6 · 9 = 1+2+6\nTens flip the shape left, hundreds flip it down, thousands flip both.');
      card([{ n: 1234, label: '1234', learn: true }], 'ALL FOUR PLACES AT ONCE', explain(1234));
      return '';
    }
    const nums = args.filter(x => x !== '').map(x => Number(x));
    if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 9999)) return '⚠️ Cistercian numerals cover whole numbers 0–9999.';
    if (nums.length > 8) return '⚠️ Up to 8 numbers at a time.';
    card(nums.map(n => ({ n, label: String(n), learn: nums.length === 1 })), 'CISTERCIAN', nums.length === 1 ? explain(nums[0]) : null);
    return '';
  }

  if (EG.registry) EG.registry.register({
    name: 'cistercian', aliases: ['cist'], category: 'Cipher Lab', usage: 'cistercian <0-9999> | now | date | learn',
    summary: 'Draw a number as a medieval Cistercian glyph', run, complete: () => ['now', 'date', 'learn'],
  });
})(window);
