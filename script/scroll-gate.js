/* scroll-gate.js — a bigger turning Dharma wheel right after the GNOSIS button; click it and a hidden scroll unrolls.
   HTML goes in index.html (see the snippet); this file builds the content, tabs, unrolling and keyboard handling. */
(function () {
  'use strict';
  const wheel = document.getElementById('scroll-wheel'), scroll = document.getElementById('sacred-scroll'); if (!wheel || !scroll) return;
  const body = scroll.querySelector('.scroll-text'), tabs = scroll.querySelectorAll('[data-tab]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Public-domain / original text only:  Hebrew Genesis (Masoretic) + JPS 1917 · Tao Te Ching (Legge 1891) · Hermetic principles (Kybalion 1908, summarised) + your own aphorisms */
  const TEXT = {
    torah: [
      ['בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃ וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ וְחֹשֶׁךְ עַל־פְּנֵי תְהוֹם וְרוּחַ אֱלֹהִים מְרַחֶפֶת עַל־פְּנֵי הַמָּיִם׃ וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר וַיְהִי־אוֹר׃', 'he'],
      ['In the beginning God created the heaven and the earth. Now the earth was unformed and void, and darkness was upon the face of the deep; and the spirit of God hovered over the face of the waters. And God said: “Let there be light.” And there was light.', ''],
      ['— Genesis 1:1–3 · The Law begins with a word spoken into silence.', 'note']],
    tao: [
      ['The Tao that can be trodden is not the enduring and unchanging Tao. The name that can be named is not the enduring and unchanging name.', ''],
      ['Having no name, it is the Originator of heaven and earth; having a name, it is the Mother of all things.', ''],
      ['— Tao Te Ching 1 (Legge) · The Way begins by admitting that it cannot be said.', 'note']],
    mysteries: [
      ['As above, so below; as below, so above.', ''], ['Nothing rests; everything moves; everything vibrates.', ''], ['Everything flows, out and in; the pendulum swing manifests in everything.', ''],
      ['The Dreamer forgot itself so that wonder would be possible.', ''], ['Silence is not the absence of the word; it is the room the word is born in.', ''], ['All things serve the Beam.', 'note']],
  };
  function show(name) {
    tabs.forEach((t) => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    body.replaceChildren(...TEXT[name].map(([txt, cls]) => { const p = document.createElement('p'); p.textContent = txt; if (cls === 'he') { p.lang = 'he'; p.dir = 'rtl'; } if (cls) p.className = 'sc-' + cls; return p; }));
    try { EG.store.set('scroll_tab', name); } catch (e) {}
  }
  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
  show((EG.store && EG.store.get('scroll_tab')) || 'torah');

  function toggle(open) {
    open = open === undefined ? scroll.hidden : open;
    if (open) { scroll.hidden = false; requestAnimationFrame(() => scroll.classList.add('open')); }
    else { scroll.classList.remove('open'); setTimeout(() => { if (!scroll.classList.contains('open')) scroll.hidden = true; }, reduced ? 0 : 900); }
    wheel.setAttribute('aria-expanded', String(open)); wheel.classList.toggle('open', open);
  }
  wheel.addEventListener('click', () => toggle());
  // (Esc no longer rolls the scroll back up — click the wheel again to close it)

  const css = document.createElement('style');
  css.textContent = `
  .scroll-wheel,.scroll-wheel:hover,.scroll-wheel:focus-visible,.scroll-wheel:active{display:block;margin:22px auto 6px;width:132px;height:132px;cursor:pointer;
    padding:0 !important;background:none !important;border:0 !important;box-shadow:none !important;border-radius:50% !important;color:#e8c46a !important;   /* !important: your global button{} style paints buttons cyan */
    filter:drop-shadow(0 0 16px rgba(232,196,106,.4));transition:filter .4s,transform .4s}
  .scroll-wheel svg{width:100%;height:100%;animation:eg-spin 60s linear infinite}.scroll-wheel:hover,.scroll-wheel:focus-visible{filter:drop-shadow(0 0 26px rgba(232,196,106,.8));transform:scale(1.05);outline:none;color:#fff3c9 !important}
  .scroll-wheel.open svg{animation-duration:14s}
  .sacred-scroll{max-width:620px;margin:0 auto 20px;display:grid;grid-template-rows:0fr;transition:grid-template-rows .9s cubic-bezier(.3,.7,.2,1)}
  .sacred-scroll.open{grid-template-rows:1fr}.sacred-scroll[hidden]{display:none}
  .sacred-scroll .sc-inner{overflow:hidden;min-height:0}
  .scroll-rod{height:18px;border-radius:9px;margin:0 -10px;background:linear-gradient(180deg,#6d5420,#e8c46a 45%,#6d5420);box-shadow:0 4px 12px rgba(0,0,0,.7)}
  .scroll-body{padding:18px 26px 14px;margin:0 8px;background:linear-gradient(90deg,rgba(232,196,106,.08),rgba(232,196,106,.02) 15%,rgba(232,196,106,.02) 85%,rgba(232,196,106,.08)),#0b0a10;border-left:1px solid rgba(232,196,106,.3);border-right:1px solid rgba(232,196,106,.3)}
  .sc-tabs{display:flex;justify-content:center;gap:6px;margin-bottom:12px}.sc-tabs button{background:none;border:0;border-bottom:2px solid transparent;color:#a98a3d;font:600 13px Georgia,serif;letter-spacing:.25em;text-transform:uppercase;padding:6px 12px;cursor:pointer}
  .sc-tabs button[aria-selected=true]{color:#e8c46a;border-color:#e8c46a}
  .scroll-text p{font:1.12rem/1.9 Georgia,serif;color:#ddd7c8;margin:0 0 12px;text-align:center}.scroll-text .sc-he{font-size:1.5rem;color:#e8c46a;line-height:2.2}.scroll-text .sc-note{font-style:italic;color:#a98a3d;font-size:.95rem}`;
  document.head.appendChild(css);
})();
