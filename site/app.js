'use strict';
const oldDetail = location.hash.slice(1); if(['isolate','accelerate','connect'].includes(oldDetail)) location.replace('pages/'+oldDetail+'.html');
const routeNames = {
  home: 'ARAD Networks — Engineering connections',
  business: '사업분야 — ARAD Networks'
};
const views = [...document.querySelectorAll('[data-view]')];
const navigation = document.querySelector('.business-nav');
const allBusinesses = document.querySelector('.header-all');
const transition = document.querySelector('#route-transition');
const announcement = document.querySelector('#route-announcement');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollPositions = new Map();
const video = document.querySelector('#hero-video');
const motionButton = document.querySelector('#video-toggle');
const replayButton = document.querySelector('#intro-replay');
const recoveryButton = document.querySelector('#intro-start');
const englishHero = document.documentElement.lang === 'en';
const idleVideo = document.querySelector('#hero-idle-video');
const heroStage = document.querySelector('#hero-stage');
const heroPoster = document.querySelector('.hero-fallback');
const heroCompletePoster = document.querySelector('.hero-complete-poster');
const objectHotspot = document.querySelector('#object-explore');
const heroCopy = document.querySelector('#hero-copy');
const headerActions = document.querySelector('.header-actions');
const wideScreen = window.matchMedia('(min-aspect-ratio: 21/10)');
// Update only this table when the renderer supplies final filenames/coordinates.
// Positions are normalized against the full video frame, never viewport crops.
const HERO_MEDIA = {
  copyRevealAt: 2.4,
  revealAt: 7.32,
  '16x9': {
    aspect: 16 / 9, intro: 'assets/intro-16x9-web.mp4?v=23',
    idle: 'assets/idle-16x9-web.mp4?v=23', poster: 'assets/poster-16x9.jpg?v=23', introPoster: 'assets/intro-poster-16x9.jpg?v=23',
    object: { cx: 0.7247996067577138, cy: 0.5285044690815344, width: 0.5504007864845725, height: 0.9429910618369313 }
  },
  '21x9': {
    aspect: 21 / 9, intro: 'assets/intro-21x9-web.mp4?v=23',
    idle: 'assets/idle-21x9-web.mp4?v=23', poster: 'assets/poster-21x9.jpg?v=23', introPoster: 'assets/intro-poster-21x9.jpg?v=23',
    object: { cx: 0.7247857066052965, cy: 0.5278841194890873, width: 0.550428586789407, height: 0.9442317610218254 }
  }
};
let mediaVariant = '';
let introCompleted = false;
let hotspotRevealed = false;
let completedPosterVisible = false;
let idleReady = false;
let idleUnavailable = false;
let pendingIntroTime = 0;
let mediaVersion = 0;
let currentRoute = '';
let destination = '';
let userPaused = false;
let videoReady = false;
let mediaUnavailable = false;
let manualMotion = false;
let playbackIssue = '';
let pendingPlay = null;
let playbackWatch;
let recoveryAttempts = 0;
const motionSuppressed = () => reduceMotion.matches && !manualMotion;
let changeTimer;
let finishTimer;
let transitionVersion = 0;

const typographyAnimations = [];
let typographyFrame = 0;
function prepareHeroTypography() {
  // Movement settles gently while the separate dissolve spends its opening
  // almost invisible. Both tracks are paused and scrubbed by video time below.
  const track = (element, start, duration, keyframes, easing = 'linear') => {
    const animation = element.animate(keyframes, { duration, easing, fill: 'both' });
    animation.pause();
    animation.currentTime = 0;
    typographyAnimations.push({ animation, start, duration });
  };
  const enter = (element, start, duration, distance, blur = 0) => {
    track(element, start, duration, [
      { transform: `translate3d(0,${distance},0)` },
      { transform: 'translate3d(0,0,0)' }
    ], 'cubic-bezier(.22,1,.36,1)');
    const dissolve = [
      { offset: 0, opacity: 0, easing: 'cubic-bezier(.4,0,.6,1)' },
      { offset: .24, opacity: .035, easing: 'cubic-bezier(.2,0,.2,1)' },
      { offset: .68, opacity: .72, easing: 'cubic-bezier(.2,0,0,1)' },
      { offset: 1, opacity: 1 }
    ];
    if (blur) {
      const blurSteps = [blur, blur * .85, blur * .20, 0];
      dissolve.forEach((frame, index) => { frame.filter = `blur(${blurSteps[index]}px)`; });
    }
    track(element, start, duration, dissolve);
  };
  heroCopy.querySelectorAll('.type-word').forEach((el, i) => enter(el, HERO_MEDIA.copyRevealAt + i * .18, 860, '.22em', 2));
  enter(heroCopy.querySelector('.hero-description'), 2.94, 620, '6px');
  enter(heroCopy.querySelector('.hero-message-cue'), 3.14, 560, '4px');
  enter(heroCopy.querySelector('.hero-rule'), HERO_MEDIA.copyRevealAt, 560, '4px');
}
function updateHeroCopy() {
  const settled = introCompleted || completedPosterVisible || motionSuppressed();
  const time = settled ? 8 : (pendingIntroTime || video.currentTime || 0);
  const ready = settled || time >= HERO_MEDIA.copyRevealAt;
  document.body.classList.toggle('hero-copy-ready', ready);
  heroCopy.inert = !ready;
  heroCopy.setAttribute('aria-hidden', String(!ready));
  headerActions.inert = currentRoute === 'home' && !ready;
  for (const { animation, start, duration } of typographyAnimations) {
    animation.currentTime = Math.max(0, Math.min(duration, (time - start) * 1000));
  }
}
function requestTypographyFrame() {
  if (!('requestVideoFrameCallback' in video) || typographyFrame || video.paused || video.ended || introCompleted) return;
  typographyFrame = video.requestVideoFrameCallback(() => {
    typographyFrame = 0;
    updateHeroCopy();
    requestTypographyFrame();
  });
}


function routeFromHash() {
  const hash = location.hash.slice(1).toLowerCase();
  return Object.hasOwn(routeNames, hash) ? hash : 'home';
}

function setLocation(route, replace = false) {
  try {
    if (location.hash === `#${route}` && !replace) return;
    history[replace ? 'replaceState' : 'pushState']({ aradRoute: route }, '', `#${route}`);
  } catch (_) {
    // A preview may deny history changes; local navigation still works.
  }
}

function activeHeroVideo() {
  return introCompleted ? idleVideo : video;
}

function updateHotspot() {
  objectHotspot.hidden = !(hotspotRevealed || completedPosterVisible || motionSuppressed());
  updateHeroCopy();
  heroStage.classList.toggle('is-complete', introCompleted || completedPosterVisible || motionSuppressed());
  if (!mediaVariant) return;
  const config = HERO_MEDIA[mediaVariant];
  const bounds = heroStage.getBoundingClientRect();
  const width = Math.max(bounds.width, bounds.height * config.aspect);
  const height = width / config.aspect;
  const left = (bounds.width - width) / 2;
  const top = (bounds.height - height) / 2;
  const object = config.object;
  // The large chassis may intentionally extend beyond the rendered frame.
  // Keep the clickable area inside the visible video rectangle.
  const x0 = Math.max(0, object.cx - object.width / 2);
  const y0 = Math.max(0, object.cy - object.height / 2);
  const x1 = Math.min(1, object.cx + object.width / 2);
  const y1 = Math.min(1, object.cy + object.height / 2);
  // Match object-fit:cover, then intersect with the visible stage.
  const hitLeft = Math.max(0, left + x0 * width);
  const hitTop = Math.max(0, top + y0 * height);
  const hitRight = Math.min(bounds.width, left + x1 * width);
  const hitBottom = Math.min(bounds.height, top + y1 * height);
  Object.assign(objectHotspot.style, {
    left: `${hitLeft}px`, top: `${hitTop}px`,
    width: `${Math.max(0, hitRight-hitLeft)}px`,
    height: `${Math.max(0, hitBottom-hitTop)}px`
  });
}

function showCompletedPoster() {
  completedPosterVisible = true;
  video.classList.remove('is-video-visible');
  idleVideo.classList.remove('is-video-visible');
  updateHotspot();
}

function updateVideoControl() {
  replayButton.hidden = !introCompleted;
  replayButton.textContent = englishHero ? 'Replay intro' : '처음부터 보기';
  const active = activeHeroVideo();
  const unavailable = introCompleted ? idleUnavailable : mediaUnavailable;
  const needsStart = !!playbackIssue || motionSuppressed();
  recoveryButton.hidden = !needsStart;
  recoveryButton.querySelector('span').textContent = englishHero
    ? (unavailable ? 'Retry intro' : 'Play intro')
    : (unavailable ? '인트로 다시 재생' : '인트로 재생');
  motionButton.hidden = needsStart || unavailable || active.readyState < 2;
  const paused = active.paused;
  motionButton.setAttribute('aria-label', englishHero
    ? (paused ? 'Play brand film' : 'Pause brand film')
    : (paused ? '브랜드 영상 재생' : '브랜드 영상 일시정지'));
  motionButton.querySelector('span').textContent = englishHero
    ? (paused ? 'Play' : 'Pause') : (paused ? '재생' : '일시정지');
  motionButton.querySelector('use').setAttribute('href', paused ? '#play' : '#pause');
  heroStage.dataset.playback = needsStart ? 'needs-play' : userPaused ? 'paused'
    : introCompleted ? 'idle' : active.paused ? 'loading' : 'playing';
}

function revealPlaybackRecovery(reason) {
  playbackIssue = reason;
  // A blocked intro is still at the beginning; do not pretend it finished.
  if (introCompleted) showCompletedPoster();
  updateVideoControl();
}

function canRunHero() {
  return currentRoute === 'home' && !motionSuppressed() && !userPaused &&
    !document.hidden && !document.body.classList.contains('is-route-moving');
}

function watchPlayback(active, version) {
  clearTimeout(playbackWatch);
  const at = active.currentTime;
  playbackWatch = setTimeout(() => {
    if (!canRunHero() || version !== mediaVersion || active !== activeHeroVideo()) return;
    if (!active.ended && (active.paused || active.currentTime === at)) {
      // Safari may suspend an initial request while decoding or revealing the
      // element without rejecting play(). Retry once after the ready event.
      if (!playbackIssue && active.readyState >= 2 && recoveryAttempts++ < 1) {
        pendingPlay = null;
        active.pause();
        syncVideo();
      } else revealPlaybackRecovery('interrupted');
    }
  }, 1800);
}

function syncVideo() {
  const active = activeHeroVideo();
  const unavailable = introCompleted ? idleUnavailable : mediaUnavailable;
  if (!canRunHero() || unavailable) {
    clearTimeout(playbackWatch);
    video.pause();
    idleVideo.pause();
    if (motionSuppressed() || unavailable) showCompletedPoster();
    if (unavailable) playbackIssue = 'error';
    updateVideoControl();
    return;
  }
  (introCompleted ? video : idleVideo).pause();
  active.muted = true;
  active.defaultMuted = true;
  active.playsInline = true;
  // Keep the initial muted video paintable before asking WebKit to play.
  // The idle clip remains covered until its first decoded frame arrives.
  if (!introCompleted && !completedPosterVisible) active.classList.add('is-video-visible');
  if (pendingPlay?.media === active || (!active.paused && active.readyState >= 2)) {
    updateVideoControl();
    return;
  }
  const request = { media: active, version: mediaVersion };
  pendingPlay = request;
  const playback = active.play();
  watchPlayback(active, request.version);
  Promise.resolve(playback).catch(error => {
    if (request.version !== mediaVersion || active !== activeHeroVideo() || !canRunHero()) return;
    if (error.name !== 'AbortError') revealPlaybackRecovery(error.name);
  }).finally(() => {
    if (pendingPlay === request) pendingPlay = null;
  });
  updateVideoControl();
}

function restartIntro() {
  // Called synchronously by the user gesture, including in autoplay-blocked
  // and reduced-motion environments. No awaited work before play().
  const reload = mediaUnavailable || !!video.error || video.networkState === 3;
  clearTimeout(playbackWatch);
  mediaVersion += 1;
  pendingPlay = null;
  pendingIntroTime = 0;
  manualMotion = true;
  document.body.classList.add('hero-manual-motion');
  video.pause();
  idleVideo.pause();
  introCompleted = false;
  hotspotRevealed = false;
  completedPosterVisible = false;
  userPaused = false;
  mediaUnavailable = false;
  playbackIssue = '';
  recoveryAttempts = 0;
  idleVideo.classList.remove('is-video-visible');
  if (idleUnavailable || idleVideo.error || idleVideo.networkState === 3) {
    idleUnavailable = false;
    idleReady = false;
    idleVideo.src = HERO_MEDIA[mediaVariant].idle;
    idleVideo.load();
  }
  if (reload) {
    video.src = HERO_MEDIA[mediaVariant].intro;
    video.load();
  } else if (video.readyState >= 1) video.currentTime = 0;
  updateHotspot();
  syncVideo();
  motionButton.focus({ preventScroll: true });
}

function useIdleVideo() {
  if (introCompleted) return;
  introCompleted = true;
  hotspotRevealed = true;
  // The completed poster stays underneath both videos. Showing it before
  // changing the phase avoids empty decoded frames while idle is loading.
  showCompletedPoster();
  syncVideo();
}

function configureHeroMedia() {
  const variant = wideScreen.matches ? '21x9' : '16x9';
  if (variant === mediaVariant) {
    updateHotspot();
    return;
  }
  pendingIntroTime = introCompleted ? 0 : video.currentTime || 0;
  mediaVersion += 1;
  mediaVariant = variant;
  const config = HERO_MEDIA[variant];
  pendingPlay = null;
  playbackIssue = '';
  recoveryAttempts = 0;
  video.pause();
  idleVideo.pause();
  videoReady = false;
  idleReady = false;
  mediaUnavailable = false;
  idleUnavailable = false;
  video.classList.remove('is-video-visible');
  idleVideo.classList.remove('is-video-visible');
  // On the first animated visit the hotspot belongs to the final module reveal.
  completedPosterVisible = introCompleted || motionSuppressed();
  if (!introCompleted) hotspotRevealed = pendingIntroTime >= HERO_MEDIA.revealAt;
  heroPoster.src = config.introPoster;
  heroCompletePoster.src = config.poster;
  video.poster = config.introPoster;
  idleVideo.poster = config.poster;
  video.src = config.intro;
  idleVideo.src = config.idle;
  video.loop = false;
  idleVideo.loop = true;
  heroStage.dataset.format = variant;
  video.load();
  idleVideo.load();
  updateHotspot();
  if (currentRoute) syncVideo();
}

function renderRoute(route, previous, { initial = false, fromHistory = false } = {}) {
  currentRoute = route;
  heroStage.classList.remove('is-object-activated');
  document.querySelector('.business-regions').classList.remove('has-selection');
  document.querySelectorAll('.business-region.is-selected').forEach(region => region.classList.remove('is-selected'));
  document.body.dataset.route = route;
  headerActions.inert = route === 'home' && !document.body.classList.contains('hero-copy-ready');
  document.title = routeNames[route];
  for (const view of views) {
    const isActive = view.dataset.view === route;
    view.hidden = !isActive;
    view.inert = !isActive;
    view.classList.toggle('is-entering', isActive && !initial && !reduceMotion.matches);
  }
  navigation.hidden = route === 'home' || route === 'business';
  allBusinesses.hidden = route === 'home' || route === 'business';
  for (const link of navigation.querySelectorAll('[data-route]')) {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const returnToSelector = route === 'business' && ['isolate', 'accelerate', 'connect'].includes(previous);
  let target = document.querySelector(`#${route}-title`);
  if (route === 'home' && previous) target = heroCopy.inert ? document.querySelector('#explore-button') : document.querySelector('#hero-message-link');
  if (returnToSelector) target = document.querySelector(`.business-region[data-route="${previous}"]`);
  const top = (fromHistory || returnToSelector) ? (scrollPositions.get(route) || 0) : 0;
  window.scrollTo({ top, behavior: 'instant' });
  if (!initial && target) target.focus({ preventScroll: true });
  if (!initial) announcement.textContent = routeNames[route];
  syncVideo();
}

let selectorAnimations = [];
const selectorView = document.querySelector('#view-business');
const homeView = document.querySelector('#view-home');
const selectorPanels = [...selectorView.querySelectorAll('.business-region')];
const selectorEase = 'cubic-bezier(.65,0,.35,1)';
function navigate(route, { fromHistory = false, initial = false } = {}) {
  if (!Object.hasOwn(routeNames, route)) route = 'home';
  if (!initial && (route === destination || (!destination && route === currentRoute))) return;
  const previous = currentRoute;
  if (previous) scrollPositions.set(previous, window.scrollY);
  clearTimeout(changeTimer); clearTimeout(finishTimer);
  const interrupted = document.body.classList.contains('is-route-moving');
  const poses = selectorPanels.map(panel => getComputedStyle(panel).transform);
  const version = ++transitionVersion;
  selectorAnimations.forEach(animation => animation.cancel());
  selectorAnimations = [];
  document.body.classList.remove('is-route-moving');
  destination = route;
  if (!fromHistory) setLocation(route, initial);
  const animated = !initial && !reduceMotion.matches;
  renderRoute(route, previous, { initial, fromHistory });
  for (const view of views) view.classList.remove('is-entering');
  window.ARADSelectorExperience?.setVisible(route === 'business');
  if (!animated) { destination = ''; return; }
  homeView.hidden = false;
  homeView.inert = route !== 'home';
  selectorView.hidden = false;
  selectorView.inert = route !== 'business';
  document.body.classList.add('is-route-moving');
  video.pause(); idleVideo.pause();
  const entering = route === 'business';
  selectorPanels.forEach((panel,index) => {
    const pose = poses[index];
    const x = interrupted && pose !== 'none' ? new DOMMatrixReadOnly(pose).m41 : (entering ? innerWidth : 0);
    const distance = Math.max(.12,Math.min(1,entering ? x/innerWidth : 1-x/innerWidth));
    const duration = (entering ? 900 : 650)*(interrupted ? Math.sqrt(distance) : 1);
    const delay = interrupted ? 0 : entering ? index*450 : (2-index)*120;
    selectorAnimations.push(panel.animate(
      [{transform:`translate3d(${x}px,0,0)`},{transform:entering ? 'translate3d(0,0,0)' : `translate3d(${innerWidth}px,0,0)`}],
      {duration,delay,easing:selectorEase,fill:'both'}));
    if (entering && !interrupted) {
      for (const node of panel.querySelectorAll('.region-top,.region-copy')) {
        selectorAnimations.push(node.animate(
          [{opacity:0,transform:'translate3d(16px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],
          {duration:350,delay:delay+530,easing:selectorEase,fill:'both'}));
      }
    }
  });
  const active = [...selectorAnimations];
  Promise.all(active.map(animation => animation.finished.catch(() => {}))).then(() => {
    if (version !== transitionVersion) return;
    active.forEach(animation => animation.cancel());
    selectorAnimations = [];
    homeView.hidden = route !== 'home';
    selectorView.hidden = route !== 'business';
    document.body.classList.remove('is-route-moving');
    destination = '';
    window.ARADSelectorExperience?.setVisible(route === 'business');
    syncVideo();
  });
}

// One handler supports all existing and future route links.
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-route]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (link.id === 'object-explore' && !reduceMotion.matches) heroStage.classList.add('is-object-activated');
  if (link.classList.contains('business-region') && !reduceMotion.matches) {
    document.querySelector('.business-regions').classList.add('has-selection');
    link.classList.add('is-selected');
  }
  navigate(link.dataset.route);
});
window.addEventListener('popstate', () => navigate(routeFromHash(), { fromHistory: true }));
window.addEventListener('hashchange', () => navigate(routeFromHash(), { fromHistory: true }));
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.key !== 'Escape') return;
  const route = destination || currentRoute;
  if (route === 'business') {
    event.preventDefault();
    navigate('home');
  } else if (route !== 'home') {
    event.preventDefault();
    navigate('business');
  }
});
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  const heading = currentRoute === 'home' && objectHotspot.hidden ? document.querySelector('#explore-button') : document.querySelector(`#${currentRoute}-title`);
  if (heading) heading.focus();
});

video.addEventListener('loadedmetadata', () => {
  if (pendingIntroTime > 0 && Number.isFinite(video.duration)) {
    video.currentTime = Math.min(pendingIntroTime, Math.max(0, video.duration - .1));
    pendingIntroTime = 0;
  }
});
video.addEventListener('loadeddata', () => {
  videoReady = true;
  mediaUnavailable = false;
  updateVideoControl();
  if (!playbackIssue) syncVideo();
});
video.addEventListener('playing', () => {
  if (introCompleted || motionSuppressed() || currentRoute !== 'home') return;
  playbackIssue = '';
  updateVideoControl();
  completedPosterVisible = false;
  video.classList.add('is-video-visible');
  hotspotRevealed = video.currentTime >= HERO_MEDIA.revealAt;
  updateHotspot();
  requestTypographyFrame();
});
video.addEventListener('timeupdate', () => {
  if (introCompleted) return;
  hotspotRevealed = video.currentTime >= HERO_MEDIA.revealAt;
  updateHotspot();
});
video.addEventListener('seeked', updateHotspot);
video.addEventListener('ended', useIdleVideo);
video.addEventListener('error', () => {
  mediaUnavailable = true;
  playbackIssue = 'error';
  videoReady = false;
  if (!introCompleted) showCompletedPoster();
  updateVideoControl();
});
idleVideo.addEventListener('loadeddata', () => {
  idleReady = true;
  idleUnavailable = false;
  updateVideoControl();
  if (introCompleted && !playbackIssue) syncVideo();
});
idleVideo.addEventListener('playing', () => {
  if (!introCompleted || motionSuppressed() || currentRoute !== 'home') return;
  playbackIssue = '';
  updateVideoControl();
  // Do not expose idle until playback has decoded a frame. Poster stays below.
  completedPosterVisible = false;
  idleVideo.classList.add('is-video-visible');
  video.classList.remove('is-video-visible');
  updateHotspot();
});
idleVideo.addEventListener('error', () => {
  idleUnavailable = true;
  if (introCompleted) playbackIssue = 'error';
  idleReady = false;
  if (introCompleted) showCompletedPoster();
  updateVideoControl();
});
for (const media of [video, idleVideo]) {
  media.addEventListener('play', updateVideoControl);
  media.addEventListener('pause', () => {
    updateVideoControl();
    if (media === activeHeroVideo() && !media.ended && canRunHero()) watchPlayback(media, mediaVersion);
  });
  media.addEventListener('canplay', () => {
    if (media === activeHeroVideo() && !playbackIssue) syncVideo();
  });
}
motionButton.addEventListener('click', () => {
  const active = activeHeroVideo();
  if (active.paused) {
    userPaused = false;
    syncVideo();
  } else {
    userPaused = true;
    active.pause();
  }
});
replayButton.addEventListener('click', restartIntro);
recoveryButton.addEventListener('click', restartIntro);

reduceMotion.addEventListener('change', () => {
  manualMotion = false;
  document.body.classList.remove('hero-manual-motion');
  if (reduceMotion.matches) {
    clearTimeout(changeTimer);
    clearTimeout(finishTimer);
    transition.classList.remove('is-active');
    transitionVersion++;
    selectorAnimations.forEach(animation => animation.cancel());
    selectorAnimations = [];
    document.body.classList.remove('is-route-moving');
    window.ARADSelectorExperience?.setVisible(currentRoute === 'business');
    if (destination) {
      const next = destination;
      destination = '';
      renderRoute(next, currentRoute);
    }
    introCompleted = true;
    hotspotRevealed = true;
    showCompletedPoster();
  }
  syncVideo();
});
wideScreen.addEventListener('change', configureHeroMedia);
window.addEventListener('resize', updateHotspot);
if ('ResizeObserver' in window) new ResizeObserver(updateHotspot).observe(heroStage);
document.addEventListener('visibilitychange', syncVideo);
window.addEventListener('pageshow', () => {
  pendingPlay = null;
  syncVideo();
});

try { history.scrollRestoration = 'manual'; } catch (_) { /* preview restriction */ }
if (reduceMotion.matches) {
  introCompleted = true;
  hotspotRevealed = true;
}
prepareHeroTypography();
configureHeroMedia();
navigate(routeFromHash(), { initial: true });
