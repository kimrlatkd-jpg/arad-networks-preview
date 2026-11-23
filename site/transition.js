'use strict';
(() => {
  const key = 'arad-business-continuity-v31';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const named = [];
  let selected = null, incoming = null;
  const removeToken = () => { try { sessionStorage.removeItem(key); } catch {} };
  function panelShape(panel) {
    const rect = panel.getBoundingClientRect();
    const first = panel.classList.contains('region-isolate');
    const last = panel.classList.contains('region-connect');
    if (innerWidth > 760) {
      const seam = 100 * (innerWidth * .08) / rect.width;
      return `polygon(${first?0:seam}% 0,100% 0,${last?100:100-seam}% 100%,0 100%)`;
    }
    const seam = 2200 / rect.height;
    return `polygon(0 ${first?0:seam}%,100% 0,100% ${last?100:100-seam}%,0 100%)`;
  }
  const name = (node, value) => {
    if (!node) return;
    named.push([node, node.style.viewTransitionName]);
    node.style.viewTransitionName = value;
  };
  const clean = () => {
    for (const [node, value] of named.splice(0)) node.style.viewTransitionName = value;
    if (selected) selected.panel.style.clipPath = selected.clipPath || '';
    root.classList.remove('arad-continuity');
    selected = null;
  };
  // A one-use route token links two real documents; normal links/history remain intact.
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const state = JSON.parse(raw);
      removeToken();
      const nav = performance.getEntriesByType('navigation')[0];
      if (state.path === location.pathname && Date.now() >= state.at && Date.now() - state.at < 15000 &&
          ['isolate','accelerate','connect'].includes(state.business) && (!nav || nav.type === 'navigate')) incoming = state;
    }
  } catch { removeToken(); }

  document.addEventListener('click', event => {
    const panel = event.target.closest?.('a.business-region');
    if (!panel || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        panel.hasAttribute('download') || (panel.target && panel.target !== '_self') || motion.matches) return;
    const url = new URL(panel.href, location.href);
    const business = panel.querySelector('[data-selector-object]')?.dataset.selectorObject;
    if (url.origin !== location.origin || !['isolate','accelerate','connect'].includes(business)) return;
    selected = {panel, path:url.pathname, business};
    // Do not prevent default or fade the old document. It stays visible while loading.
  });

  addEventListener('pageswap', event => {
    const vt = event.viewTransition;
    if (!vt) return;
    if (!selected || motion.matches) { vt.skipTransition(); return; }
    try {
      sessionStorage.setItem(key, JSON.stringify({path:selected.path, business:selected.business, shape:panelShape(selected.panel), at:Date.now()}));
    } catch { vt.skipTransition(); return; }
    root.classList.add('arad-continuity');
    const panel = selected.panel;
    // The pseudo-element owns the moving diagonal; avoid baking it into both snapshots.
    selected.clipPath = panel.style.clipPath;
    panel.style.clipPath = 'none';
    name(panel, 'business-plane');
    name(panel.querySelector('.selector-object'), 'business-object');
    name(panel.querySelector('h2'), 'business-name');
    name(panel.querySelector('.region-copy>p'), 'business-caption');
    name(panel.querySelector('.region-cta'), 'business-prompt');
    name(panel.querySelector('.region-top'), 'business-kicker');
    name(document.querySelector('.wordmark'), 'business-logo');
    vt.ready.catch(() => {}); // The outgoing transition is skipped when this document hides.
    vt.finished.then(clean, clean);
  });

  // This listener is deliberately registered by a synchronous script in <head>.
  addEventListener('pagereveal', event => {
    const vt = event.viewTransition;
    if (!vt) { incoming = null; return; }
    if (!incoming || motion.matches || !document.querySelector('.v26-hero')) { vt.skipTransition(); return; }
    root.classList.add('arad-continuity', 'arad-continuity-entry');
    root.style.setProperty('--arad-plane-start', incoming.shape);
    // Render an actual frame, even when the intersection observer has not ticked yet.
    window.__aradScene?.render?.(2.8);
    name(document.querySelector('.v26-hero'), 'business-plane');
    name(document.querySelector('.v26-stage'), 'business-object');
    name(document.querySelector('.v26-product-name'), 'business-name');
    name(document.querySelector('.v26-intro>p:first-child'), 'business-description');
    name(document.querySelector('.v26-actions'), 'business-actions');
    name(document.querySelector('.v26-heading h1'), 'business-heading');
    name(document.querySelector('.v26-console'), 'business-controls');
    name(document.querySelector('.v26-product-note'), 'business-note');
    name(document.querySelector('.a-logo'), 'business-logo');
    vt.ready.then(() => { root.dataset.continuity = 'playing'; }, () => { root.dataset.continuity = 'skipped'; });
    vt.finished.then(() => { clean(); root.dataset.continuity = 'complete'; }, clean);
    incoming = null;
  });
  addEventListener('pageshow', event => { if (event.persisted) clean(); });
  // Fetch only a destination that the visitor actually points at or focuses.
  const warmed = new Set();
  function warm(event) {
    const panel = event.target.closest?.('a.business-region');
    if (!panel || navigator.connection?.saveData) return;
    const base = new URL('.', location.href);
    const business = panel.querySelector('[data-selector-object]')?.dataset.selectorObject;
    for (const href of [panel.href, new URL('scenes.js?v=36', base).href,
      new URL(`assets/editorial/object-${business}.jpg?v=36`, base).href,
      new URL(`assets/photoreal/${business}.png?v=36`, base).href]) {
      if (warmed.has(href)) continue;
      warmed.add(href);
      const link = document.createElement('link');link.rel = 'prefetch';link.href = href;document.head.append(link);
    }
  }
  document.addEventListener('pointerover', warm, {passive:true});
  document.addEventListener('focusin', warm);
})();
