/* ARAD v43: approved photographic equipment, without rear screen overlays. */
(() => {
  'use strict';
  const base = new URL('assets/devices-v42/', document.currentScript.src);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const instances = new Map();
  const selectorScenes = new Map();
  let selectorVisible = document.body.dataset.route === 'business';
  let mainScene = null;
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const image = (name, klass, width, height) => `<img class="dv-hardware ${klass}" src="${new URL(name + '.webp?v=42', base).href}" width="${width}" height="${height}" alt="" decoding="async" draggable="false">`;
  const templates = {
    isolate: () => image('isolate-hardware', 'dv-isolate-hardware', 1536, 1024),
    accelerate: () => image('accelerate-hardware', 'dv-accelerate-hardware', 2048, 1360),
    connect: () => `<div class="dv-device-group"><div class="dv-device dv-device-plc" data-dv-mode="2">${image('plc', 'dv-plc-hardware', 1448, 1086)}</div><div class="dv-device dv-device-edge" data-dv-mode="0">${image('5g-edge', 'dv-edge-hardware', 1536, 1024)}</div><div class="dv-device dv-device-mesh" data-dv-mode="1">${image('wifi-mesh', 'dv-mesh-hardware', 1536, 1024)}</div></div>`
  };

  function mount(host, options = {}) {
    if (instances.has(host)) return instances.get(host);
    const type = options.type || host.dataset.scene || host.dataset.selectorObject;
    if (!templates[type]) throw new Error('Unknown ARAD device scene');
    const selector = host.hasAttribute('data-selector-object');
    const root = document.createElement('div');
    root.className = `dv-root dv-${type}`;
    root.dataset.context = selector ? 'selector' : 'interior';
    root.dataset.mode = selector ? '-1' : '0';
    root.dataset.reducedMotion = String(motion.matches || !!options.reducedMotion);
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('translate', 'no');
    root.lang = 'en';
    root.innerHTML = templates[type]();
    host.replaceChildren(root);
    host.classList.add('dv-host');
    delete host.dataset.objectError;
    let mode = selector ? -1 : 0;
    let progress = 0;
    let storyChapter = -1;
    let paused = selector && !selectorVisible;
    let visible = true;
    let disposed = false;
    let animations = [];
    let observer;

    const cancelAnimations = () => {
      animations.forEach(animation => animation.cancel());
      animations = [];
    };
    const updatePause = () => {
      root.dataset.paused = String(paused || document.hidden || !visible);
      if (root.dataset.paused === 'true') cancelAnimations();
    };
    const highlight = index => {
      root.querySelectorAll('[data-dv-mode]').forEach(node => {
        node.classList.toggle('dv-active', Number(node.dataset.dvMode) === index);
      });
    };
    const setMode = index => {
      if (disposed) return;
      const next = Math.min(2, Math.max(0, Math.round(Number(index) || 0)));
      mode = next;
      root.dataset.mode = String(next);
      highlight(next);
    };
    const setProgress = value => {
      if (disposed) return;
      progress = clamp(value);
      const active = progress >= .12;
      const chapter = active ? Math.max(0, Math.min(2, Math.floor((progress - .14 + .00001) / .30))) : -1;
      root.dataset.storyActive = String(active);
      root.style.setProperty('--dv-progress', progress.toFixed(4));
      // Keep subtle equipment movement linked to the existing explanation chapters.
      const travel = motion.matches ? 0 : progress;
      root.style.setProperty('--dv-hardware-shift', `${(travel * 8).toFixed(2)}px`);
      if (chapter !== storyChapter) {
        storyChapter = chapter;
        if (chapter >= 0) setMode(chapter);
      }
    };
    const replay = (delay = 0) => {
      if (disposed || paused || !visible || document.hidden || motion.matches) return;
      cancelAnimations();
      const hardware = root.querySelector('.dv-device-group,.dv-root > .dv-hardware');
      if (!hardware?.animate) return;
      animations.push(hardware.animate([
        {opacity:.35, translate:'8px 10px'},
        {opacity:1, translate:'0 0'}
      ], {duration:850, delay, easing:'cubic-bezier(.65,0,.35,1)'}));
    };
    const scene = {
      setMode,
      setProgress,
      setStoryProgress(state = {}) {
        setProgress(state.progress || 0);
        root.dataset.storyActive = String(!!state.active);
        if (state.active && Number.isFinite(state.chapter)) setMode(state.chapter);
      },
      replay,
      render() { if (!disposed) host.dataset.objectReady = 'true'; },
      hover(active) { root.classList.toggle('dv-hover', !!active); },
      setPaused(value) { paused = !!value; updatePause(); },
      setReducedMotion(value) { root.dataset.reducedMotion = String(!!value); if (value) cancelAnimations(); },
      getState() {
        const rect = host.getBoundingClientRect();
        return {version:'43.0.0', type, selector, ready:!disposed, paused:paused || document.hidden || !visible,
          mode, progress, width:rect.width, height:rect.height, hardware:'photographic-cutout',
          concept:'equipment-only', assetsReady:[...root.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0)};
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        cancelAnimations();
        observer?.disconnect();
        document.removeEventListener('visibilitychange', updatePause);
        instances.delete(host);
      }
    };
    instances.set(host, scene);
    if (!selector) {
      mainScene = scene;
      window.__aradScene = scene;
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        updatePause();
      }, {rootMargin:'100px'});
      observer.observe(host);
    }
    document.addEventListener('visibilitychange', updatePause);
    highlight(mode);
    updatePause();
    host.dataset.objectReady = 'true';
    return scene;
  }

  // v26.js remains the sole owner of internal controls, keyboard navigation and replay.
  window.ARADObjects = {mount};
  window.ARADScene = {
    setMode(index) { mainScene?.setMode(index); },
    setStoryProgress(state) { mainScene?.setStoryProgress(state); },
    setProgress(progress) { mainScene?.setProgress(progress); },
    replay() { mainScene?.replay(); },
    getState() { return mainScene?.getState() || null; }
  };
  document.querySelectorAll('[data-selector-object]').forEach(host => {
    const scene = mount(host, {type:host.dataset.selectorObject});
    selectorScenes.set(host, scene);
    const panel = host.closest('.business-region');
    panel?.addEventListener('pointerenter', () => scene.hover(true));
    panel?.addEventListener('pointerleave', () => scene.hover(false));
    panel?.addEventListener('focus', () => scene.hover(true));
    panel?.addEventListener('blur', () => scene.hover(false));
  });
  window.ARADSelectorExperience = {
    setVisible(value) {
      const changed = selectorVisible !== !!value;
      selectorVisible = !!value;
      selectorScenes.forEach((scene, host) => {
        scene.setPaused(!selectorVisible);
        // Outer diagonal panel choreography is owned by the route transition.
        host.querySelector('.dv-root')?.classList.toggle('dv-visible', selectorVisible);
        if (changed && !selectorVisible) scene.hover(false);
      });
    },
    getState() { return [...selectorScenes.values()].map(scene => scene.getState()); }
  };
  window.ARADSelectorExperience.setVisible(selectorVisible);
  motion.addEventListener('change', () => {
    instances.forEach(scene => scene.setReducedMotion(motion.matches));
  });
})();
