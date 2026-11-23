(() => {
  'use strict';
  const scene = document.querySelector('[data-scene="isolate-photo"]');
  if (!scene) return;
  const english = document.documentElement.lang === 'en';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const routes = [...scene.querySelectorAll('[data-photo-route]')];
  const controls = [...document.querySelectorAll('[data-scene-mode]')];
  const caption = scene.querySelector('[data-photo-caption]');
  const routeStatus = document.querySelector('.v26-route b');
  const replayButton = document.querySelector('[data-scene-replay]');
  const captions = english
    ? ['Per-device paths', 'Separate routing spaces', 'Permitted destinations']
    : ['기기별 통신 경로', '독립된 라우팅 공간', '허용된 서비스 연결'];
  let mode = 0;
  let progress = 0;
  let replayTimer = 0;
  let lastStep = '';
  const clamp = (x, min = 0, max = 1) => Math.max(min, Math.min(max, x));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

  function setMode(next) {
    mode = clamp(Number(next) || 0, 0, 2);
    scene.dataset.photoMode = String(mode);
    routes.forEach((route, i) => route.classList.toggle('is-selected', i === mode));
    controls.forEach((button, i) => button.setAttribute('aria-pressed', String(i === mode)));
    if (routeStatus && controls[mode]) routeStatus.textContent = controls[mode].dataset.routeLabel || '';
  }

  function setProgress(value) {
    progress = clamp(Number(value) || 0);
    const story = progress >= .14;
    const step = story ? Math.min(2, Math.floor((progress - .14 + .00001) / .30)) : -1;
    const local = story ? clamp((progress - .14 - step * .30) / .20) : 1;
    const space = reduced.matches ? 0 : ease((progress - .40) / .13);
    const destination = reduced.matches ? 0 : ease((progress - .72) / .15);
    scene.style.setProperty('--ip-space', space.toFixed(3));
    scene.style.setProperty('--ip-destination', destination.toFixed(3));
    scene.style.setProperty('--ip-zoom', reduced.matches ? '1' : (1 + progress * .045).toFixed(4));
    scene.style.setProperty('--ip-reveal', (!story || step > 0 ? 100 : 42 + ease(local) * 58).toFixed(2));
    const state = story ? String(step) : 'intro';
    if (lastStep !== state) {
      scene.dataset.photoStep = state;
      if (caption) caption.textContent = captions[Math.max(0, step)];
      routes.forEach((route, i) => route.classList.toggle('is-selected', story ? step === 1 || i === (step === 2 ? 0 : mode) : i === mode));
      lastStep = state;
    }
  }

  function replay() {
    if (reduced.matches) return;
    clearTimeout(replayTimer);
    scene.classList.remove('is-replaying');
    void scene.offsetWidth;
    scene.classList.add('is-replaying');
    replayTimer = window.setTimeout(() => scene.classList.remove('is-replaying'), 1600);
  }

  controls.forEach((button, i) => {
    button.addEventListener('click', () => { setMode(i); replay(); });
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + controls.length) % controls.length;
      controls[next].focus();
      setMode(next);
      replay();
    });
  });
  replayButton?.addEventListener('click', replay);
  const visibility = new IntersectionObserver(([entry]) => {
    scene.classList.toggle('is-offscreen', !entry.isIntersecting);
  }, { threshold: 0 });
  visibility.observe(scene);
  reduced.addEventListener('change', () => {
    clearTimeout(replayTimer);
    scene.classList.remove('is-replaying');
    setProgress(progress);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) scene.classList.add('is-offscreen');
    else {
      const bounds = scene.getBoundingClientRect();
      scene.classList.toggle('is-offscreen', bounds.bottom <= 0 || bounds.top >= innerHeight);
    }
  });

  // Preserve the existing scroll narrative and selected-panel transition contract.
  window.__aradScene = { setMode, setProgress, replay, render: () => setProgress(progress) };
  setMode(0);
  setProgress(0);
  scene.dataset.objectReady = 'true';
})();
