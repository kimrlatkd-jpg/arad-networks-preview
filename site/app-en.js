'use strict';
const oldDetail = location.hash.slice(1); if(['isolate','accelerate','connect'].includes(oldDetail)) location.replace('en/'+oldDetail+'.html');
const routeNames = {
  home: 'ARAD Networks — Engineering connections',
  business: 'Businesses — ARAD Networks'
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
  const settled = introCompleted || completedPosterVisible || reduceMotion.matches;
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
  objectHotspot.hidden = !(hotspotRevealed || completedPosterVisible || reduceMotion.matches);
  updateHeroCopy();
  heroStage.classList.toggle('is-complete', introCompleted || completedPosterVisible || reduceMotion.matches);
  if (!mediaVariant) return;
  const config = HERO_MEDIA[mediaVariant];
  const bounds = heroStage.getBoundingClientRect();
  const width = Math.min(bounds.width, bounds.height * config.aspect);
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
  Object.assign(objectHotspot.style, {
    left: `${left + x0 * width}px`,
    top: `${top + y0 * height}px`,
    width: `${Math.max(0, x1 - x0) * width}px`,
    height: `${Math.max(0, y1 - y0) * height}px`
  });
}

function showCompletedPoster() {
  completedPosterVisible = true;
  video.classList.remove('is-video-visible');
  idleVideo.classList.remove('is-video-visible');
  updateHotspot();
}

function updateVideoControl() {
  replayButton.hidden = !introCompleted || reduceMotion.matches;
  const active = activeHeroVideo();
  const unavailable = introCompleted ? idleUnavailable : mediaUnavailable;
  const ready = introCompleted ? idleReady : videoReady;
  motionButton.hidden = unavailable || !ready || reduceMotion.matches;
  const paused = active.paused;
  motionButton.setAttribute('aria-label', paused ? 'Play brand film' : 'Pause brand film');
  motionButton.querySelector('span').textContent = paused ? 'Play' : 'Pause';
  motionButton.querySelector('use').setAttribute('href', paused ? '#play' : '#pause');
}

function syncVideo() {
  const active = activeHeroVideo();
  const unavailable = introCompleted ? idleUnavailable : mediaUnavailable;
  if (currentRoute !== 'home' || reduceMotion.matches || userPaused || document.hidden || unavailable) {
    video.pause();
    idleVideo.pause();
    if (reduceMotion.matches || unavailable) showCompletedPoster();
    updateVideoControl();
    return;
  }
  (introCompleted ? video : idleVideo).pause();
  active.muted = true;
  const requestedVersion = mediaVersion;
  const playback = active.play();
  if (playback && typeof playback.catch === 'function') playback.catch(error => {
    // Source changes can abort a pending play. Only the current source/phase
    // may change the visible fallback after an autoplay rejection.
    if (active !== activeHeroVideo() || requestedVersion !== mediaVersion || currentRoute !== 'home' || error.name === 'AbortError') return;
    showCompletedPoster();
    updateVideoControl();
  });
  updateVideoControl();
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
  video.pause();
  idleVideo.pause();
  videoReady = false;
  idleReady = false;
  mediaUnavailable = false;
  idleUnavailable = false;
  video.classList.remove('is-video-visible');
  idleVideo.classList.remove('is-video-visible');
  // On the first animated visit the hotspot belongs to the final module reveal.
  completedPosterVisible = introCompleted || reduceMotion.matches;
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
  syncVideo();
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
const selectorEase = 'cubic-bezier(.65,0,.35,1)';
function navigate(route, { fromHistory = false, initial = false } = {}) {
  if (!Object.hasOwn(routeNames, route)) route = 'home';
  if (!initial && (route === destination || (!destination && route === currentRoute))) return;
  const previous = currentRoute;
  if (previous) scrollPositions.set(previous, window.scrollY);
  clearTimeout(changeTimer);
  clearTimeout(finishTimer);
  const interrupted = document.body.classList.contains('is-route-moving');
  const currentPose = interrupted ? getComputedStyle(selectorView).transform : null;
  const version = ++transitionVersion;
  selectorAnimations.forEach(animation => animation.cancel());
  selectorAnimations = [];
  document.body.classList.remove('is-route-moving');
  destination = route;
  if (!fromHistory) setLocation(route, initial);
  const animated = !initial && !reduceMotion.matches;
  renderRoute(route, previous, { initial, fromHistory });
  for (const view of views) view.classList.remove('is-entering');
  if (!animated) { destination = ''; return; }

  // Keep the original hero under the actual three-branch screen throughout.
  homeView.hidden = false;
  homeView.inert = route !== 'home';
  selectorView.hidden = false;
  selectorView.inert = route !== 'business';
  document.body.classList.add('is-route-moving');
  video.pause(); idleVideo.pause();
  const entering = route === 'business';
  const currentX = currentPose && currentPose !== 'none' ? new DOMMatrixReadOnly(currentPose).m41 / innerWidth : 0;
  const distance = interrupted ? Math.max(.12, Math.min(1, entering ? currentX : 1-currentX)) : 1;
  const duration = (entering ? 900 : 620) * Math.sqrt(distance);
  const startPose = interrupted ? currentPose : (entering ? 'translate3d(100%,0,0)' : 'translate3d(0,0,0)');
  const plane = selectorView.animate(
    entering ? [{transform:startPose},{transform:'translate3d(0,0,0)'}]
             : [{transform:startPose},{transform:'translate3d(100%,0,0)'}],
    {duration, easing:selectorEase, fill:'both'}
  );
  selectorAnimations.push(plane);
  if (entering) {
    selectorView.querySelectorAll('.business-region').forEach((region,index) => {
      // Material settles inside its fixed diagonal aperture; seams stay joined.
      selectorAnimations.push(region.querySelector('.region-material').animate(
        [{transform:'translate3d(38px,0,0) scale(1.1)'},{transform:'translate3d(0,0,0) scale(1)'}],
        {duration:1000,delay:index*45,easing:selectorEase,fill:'both'}));
      for (const node of region.querySelectorAll('.region-top,.region-copy')) {
        selectorAnimations.push(node.animate(
          [{opacity:0,transform:'translate3d(20px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],
          {duration:440,delay:420+index*65,easing:selectorEase,fill:'both'}));
      }
    });
  }
  const active = [...selectorAnimations];
  Promise.all(active.map(animation => animation.finished.catch(() => {}))).then(() => {
    if (version !== transitionVersion) return;
    active.forEach(animation => animation.cancel());
    selectorAnimations = [];
    homeView.hidden = route !== 'home';
    selectorView.hidden = route !== 'business';
    document.body.classList.remove('is-route-moving');
    destination = '';
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
});
video.addEventListener('playing', () => {
  if (introCompleted || reduceMotion.matches || currentRoute !== 'home') return;
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
  videoReady = false;
  if (!introCompleted) showCompletedPoster();
  updateVideoControl();
});
idleVideo.addEventListener('loadeddata', () => {
  idleReady = true;
  idleUnavailable = false;
  updateVideoControl();
});
idleVideo.addEventListener('playing', () => {
  if (!introCompleted || reduceMotion.matches || currentRoute !== 'home') return;
  // Do not expose idle until playback has decoded a frame. Poster stays below.
  completedPosterVisible = false;
  idleVideo.classList.add('is-video-visible');
  video.classList.remove('is-video-visible');
  updateHotspot();
});
idleVideo.addEventListener('error', () => {
  idleUnavailable = true;
  idleReady = false;
  if (introCompleted) showCompletedPoster();
  updateVideoControl();
});
for (const media of [video, idleVideo]) {
  media.addEventListener('play', updateVideoControl);
  media.addEventListener('pause', updateVideoControl);
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
replayButton.addEventListener('click', () => {
  if (reduceMotion.matches) return;
  pendingIntroTime = 0;
  mediaVersion += 1;
  video.pause();
  idleVideo.pause();
  introCompleted = false;
  hotspotRevealed = false;
  completedPosterVisible = false;
  userPaused = false;
  video.classList.remove('is-video-visible');
  idleVideo.classList.remove('is-video-visible');
  video.currentTime = 0;
  document.querySelector('#explore-button').focus({ preventScroll: true });
  updateHotspot();
  syncVideo();
});

reduceMotion.addEventListener('change', () => {
  if (reduceMotion.matches) {
    clearTimeout(changeTimer);
    clearTimeout(finishTimer);
    transition.classList.remove('is-active');
    transitionVersion++;
    selectorAnimations.forEach(animation => animation.cancel());
    selectorAnimations = [];
    document.body.classList.remove('is-route-moving');
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

try { history.scrollRestoration = 'manual'; } catch (_) { /* preview restriction */ }
if (reduceMotion.matches) {
  introCompleted = true;
  hotspotRevealed = true;
}
prepareHeroTypography();
configureHeroMedia();
navigate(routeFromHash(), { initial: true });
