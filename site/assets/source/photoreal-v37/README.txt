ARAD runtime V37 — readable hologram and photographic hardware

BUILD
The publishing workflow preserves .txt and .js source files. With Node20+:
  cp package.json.txt package.json
  npm install
  npm run build
The pinned local dependencies compile scenes.js and selector-objects.js to the site root, three directories above this folder. No workstation-specific paths or global packages are used. Serve over HTTP for image textures.

WHAT CHANGED
- All five diagram labels are always English, including on Korean pages.
- Labels are ordinary screen-space DOM text. They follow projected 3D anchors but are never flattened into tilted bitmap textures. Font size is at least12 CSS pixels, with a dedicated compact arrangement for narrow selectors.
- WebGL runs at least2× render density and up to3× on small screens. Photo pixels retain sRGB colour with no tone mapping or sharpening filter.
- Only the hologram has blue-white bright edges, layered soft light, darker translucent surfaces, sparse scan sweeps and moving data pulses. The photograph and text remain sharp.
- exportPng composites labels, leader lines and hardware into a matching high-density PNG.

LAYOUT AND STATE
The existing video intro, panel transition, page copy, route anchors and scroll consumers are unchanged. The hardware uses alpha photographic-looking visualization planes rather than a complete orbitable 3D mesh. The concept geometry is real Three.js geometry; its labels do not imply specific product protocol support or hardware specifications.

ARADObjects.mount and ARADSelectorObjects.mount return ready, setPaused, setMode, setProgress, hover, replay, render, exportPng, getState, getAnchors and dispose. Readiness waits for the hardware texture and first drawn frame. Labels stay hidden until then. Dispose removes canvas, labels, event handlers, observers, materials and textures. Reduced motion disables automatic idle movement while keeping meaningful scroll states. Hidden/offscreen scenes suspend animation.

QUALITY METRICS
getState includes pixelRatio, drawingBuffer dimensions, and all five label text/fontSize/position/dimensions. DOM labels use .arad-hologram-label inside .arad-hologram-labels. Actual500px selector and390px mobile-page viewport sizes were reviewed; enlarging a render alone does not validate readability.

FALLBACKS
Selector fallback images are rendered at actual500×370 CSS pixels and exported at2× (1000×740), preserving visible typography size. Internal fallback images use600×550 CSS at2×. Accelerate has mobile-specific selector195×190 CSS at3× and internal390×235 CSS at2× images. English-suffixed fallback files remain for existing English HTML references; their text matches the shared English-only diagram.

Original photographic-looking PNG assets remain unchanged. The public source contains only editable runtime code and portable build instructions; generated bundle duplicates are omitted.
