/* =====================================================================
   gnosis-wheel.js — turns the Gnosis panel into a navigable temple.
   • Builds a 12-gate WHEEL from the .gnosis-heading elements in the panel
     (add or remove a section in index.html and the wheel adapts).
   • Click a gate (or ←/→ when focused) to travel to that section; as you
     read, the wheel turns so the current gate is always at the top.
   • Gold progress hairline, Esc closes, hub jumps between the two "books".
   Needs: <svg> sprite with #eg-dharma and #eg-sol (inline in index.html)
   ===================================================================== */
(function () {
  'use strict';
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const useSvg = (id, cls) => {
    const NS = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 200 200'); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
    const u = document.createElementNS(NS, 'use'); u.setAttribute('href', '#' + id); s.appendChild(u); return s;
  };

  function init() {
    const panel = document.getElementById('gnosis-panel');
    const btn = document.getElementById('gnosis-toggle-btn');
    if (!panel || !btn || panel.dataset.wheel) return;
    panel.dataset.wheel = '1';
    btn.setAttribute('aria-controls', 'gnosis-panel'); btn.setAttribute('aria-expanded', 'false');

    // ---- emblem in the header ----
    const header = panel.querySelector('.gnosis-header');
    // NEW: your spiral logo (circular, black, turning slowly) replaces the Dharma wheel above the title
    if (header) {
      const img = document.createElement('img'); img.className = 'gnosis-logo'; img.src = 'images/icons/EgLOGO.png'; img.alt = 'EliteGDX spiral emblem';
      img.width = 112; img.height = 112; img.decoding = 'async'; header.insertBefore(img, header.firstChild);
    }
    // NEW: wrap the panel so two rollers can part from the centre and the page unrolls sideways (CSS in temple.css, section "scroll")
    if (!panel.parentNode.classList.contains('gnosis-unroll')) {
      const wrap = document.createElement('div'); wrap.className = 'gnosis-unroll';
      panel.parentNode.insertBefore(wrap, panel); wrap.appendChild(panel);
      ['gr gl', 'gr gr-r'].forEach((c) => { const r = document.createElement('i'); r.className = c; r.setAttribute('aria-hidden', 'true'); wrap.appendChild(r); });
    }

    // ---- gates = the philosophy headings; the "Living Dashboard" is a collapsed <details> = the second book ----
    const book2 = panel.querySelector('details.gnosis-anatomy-toggle');
    const gates = Array.from(panel.querySelectorAll('.gnosis-heading')).filter(h => h.tagName === 'H3' && !(book2 && book2.contains(h)));
    if (!gates.length) return;
    const clean = (h) => h.textContent.replace(/[✦◆]/g, '').replace(/\s+/g, ' ').trim();
    gates.forEach((h, i) => { h.id = h.id || 'gate-' + (i + 1); });

    // ---- progress hairline + sticky nav ----
    const prog = document.createElement('div'); prog.className = 'gnosis-progress'; prog.innerHTML = '<i></i>';
    const nav = document.createElement('div'); nav.className = 'gnosis-nav';
    const wheel = document.createElement('div'); wheel.className = 'gnosis-wheel'; wheel.setAttribute('role', 'group'); wheel.setAttribute('aria-label', 'Gates of the Gnosis');
    wheel.appendChild(useSvg('eg-sol', 'gw-sol'));
    const ring = document.createElement('div'); ring.className = 'gw-ring'; wheel.appendChild(ring);
    const step = 360 / gates.length;
    const gateBtns = gates.map((h, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gw-gate';
      b.style.setProperty('--a', (i * step) + 'deg');
      b.setAttribute('aria-label', 'Gate ' + (ROMAN[i] || i + 1) + ': ' + clean(h)); b.title = clean(h);
      b.addEventListener('click', () => go(i)); ring.appendChild(b); return b;
    });
    const hub = document.createElement('button'); hub.type = 'button'; hub.className = 'gw-hub'; hub.appendChild(useSvg('eg-dharma'));
    hub.setAttribute('aria-label', book2 ? 'Jump between the two books' : 'Back to the top'); wheel.appendChild(hub);
    const here = document.createElement('div'); here.className = 'gnosis-here'; here.setAttribute('aria-live', 'polite');
    const num = document.createElement('div'); num.className = 'gh-num'; const ttl = document.createElement('div'); ttl.className = 'gh-title';
    here.appendChild(num); here.appendChild(ttl);
    nav.appendChild(wheel); nav.appendChild(here);
    panel.insertBefore(nav, panel.firstChild); panel.insertBefore(prog, panel.firstChild);

    const navH = () => nav.offsetHeight || 150;
    const topOf = (h) => h.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
    function go(i) {
      const h = i < 0 ? panel.querySelector('.gnosis-header') : gates[i];
      panel.scrollTo({ top: Math.max(0, i < 0 ? 0 : topOf(h) - navH() - 8), behavior: reduced() ? 'auto' : 'smooth' });
    }
    const sumOf = () => (book2 && (book2.querySelector('summary') || book2));
    hub.addEventListener('click', () => {
      if (!book2) return go(-1);
      const sum = sumOf(); const wasOpen = book2.open; book2.open = true;
      const here = wasOpen && panel.scrollTop + navH() + 40 >= topOf(sum);
      setTimeout(() => here ? go(-1) : panel.scrollTo({ top: Math.max(0, topOf(sum) - navH() - 8), behavior: reduced() ? 'auto' : 'smooth' }), wasOpen ? 0 : 60);
    });
    if (book2) book2.addEventListener('toggle', () => setTimeout(update, 50));

    let active = -2, ticking = false;
    function update() {
      ticking = false;
      const y = panel.scrollTop + navH() + 40; let idx = -1;
      for (let i = 0; i < gates.length; i++) if (topOf(gates[i]) <= y) idx = i;
      const max = panel.scrollHeight - panel.clientHeight;
      panel.style.setProperty('--prog', max > 0 ? (panel.scrollTop / max).toFixed(4) : 0);
      const inBook2 = !!(book2 && book2.open && topOf(sumOf()) <= y);
      if (idx !== active || inBook2 !== update.last) {
        active = idx; update.last = inBook2;
        gateBtns.forEach((b, i) => b.setAttribute('aria-current', String(i === idx && !inBook2)));
        ring.style.setProperty('--turn', inBook2 || idx < 0 ? '0deg' : (-idx * step) + 'deg');
        if (inBook2) { num.textContent = 'The Second Book'; ttl.textContent = 'The Living Dashboard'; }
        else if (idx < 0) { num.textContent = 'The Threshold'; ttl.textContent = 'Source & Journey'; }
        else { num.textContent = 'Gate ' + (ROMAN[idx] || idx + 1) + ' of ' + ROMAN[gates.length - 1]; ttl.textContent = clean(gates[idx]); }
      }
    }
    panel.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    // ← → between gates while the wheel has focus
    wheel.addEventListener('keydown', (e) => {
      const i = gateBtns.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); gateBtns[(i + 1) % gateBtns.length].focus(); go((i + 1) % gateBtns.length); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const j = (i - 1 + gateBtns.length) % gateBtns.length; gateBtns[j].focus(); go(j); }
    });

    // keep aria-expanded in sync no matter who toggles the panel; Esc closes
    new MutationObserver(() => { const open = panel.classList.contains('visible'); btn.setAttribute('aria-expanded', String(open)); if (open) setTimeout(update, 60); })
      .observe(panel, { attributes: true, attributeFilter: ['class'] });
    // (Esc no longer closes the panel — only the CLOSE button does)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
