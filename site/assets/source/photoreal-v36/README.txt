# ARAD photographic equipment runtime — V36

This module replaces only the business-selector and internal equipment scenes. The approved intro video and panel expansion transition are separate and are not changed here.

## Build from a downloaded repository

Use Node.js 20 or newer. The publishing pipeline preserves `.txt` and `.js` files. Restore the npm manifest locally, then build. In this directory run:

```sh
cp package.json.txt package.json
npm install
npm run build
```

Dependencies are pinned in `package.json.txt`. The build uses this directory's local dependencies and writes `scenes.js` and `selector-objects.js` three directories above, at the site root. No workspace-specific paths or global packages are required. Serve the site over HTTP; texture loading requires an HTTP server rather than opening the HTML directly.

## Assets and implementation

- Three full-alpha PNG assets live in `<site>/assets/photoreal/`. They are photographic-looking visualizations, not photographs documenting a manufactured SKU.
- The source images remain unchanged. `CUTOUTS` applies UV framing to remove transparent margins while retaining a small safety margin.
- Hardware is displayed on a transparent, non-tone-mapped photographic plane. Its scale and position move minimally; it is not a full orbital 3D model.
- Accelerate's concept layers, thickness, light paths, pulses and queue cells are real Three.js geometry behind the server. The labels describe workload → logical path → hardware queue concepts and do not claim specific supported protocols or product specifications.
- Isolate and Connect use restrained optical paths behind the photographic equipment. The original routes and content remain responsible for explaining each business.
- Selector output is transparent. Interior output uses the established near-black background. The source PNG colour is preserved with `MeshBasicMaterial`, sRGB and no tone mapping.

## APIs

`window.ARADObjects.mount(container,{type,reducedMotion})` and `window.ARADSelectorObjects.mount(...)` return compatible objects with `ready`, `setPaused`, `setMode`, `setProgress`, `hover`, `replay`, `render`, `exportPng`, `getState`, `getAnchors` and `dispose`.

Readiness is announced only after the image texture has loaded and a frame has rendered. Dispose removes readiness and releases texture, geometry, material, canvas, observer and animation resources. Reduced-motion remounts keep scroll-stage state while disabling idle animation. Offscreen and hidden-page animation is suspended; ordinary idle animation settles rather than running indefinitely.

## Editorial fallback images

The six primary `<site>/assets/editorial/selector-*.png` / `object-*.jpg` images are actual GPU renders of this runtime. Accelerate also has `selector-accelerate-en.png` and `object-accelerate-en.jpg` for English labels. Selector fallbacks retain alpha. They are served while images/WebGL initialize and when WebGL fails.

## Review

The V36 QA folder records Apple Metal GPU renders for the selector and interior, a three-stage Accelerate progression, and API lifecycle checks. Page integration and Safari/mobile review are recorded separately by the main task. HyperFrames static warnings about bundled Three.js random UUID generation and browser RAF refer to library/runtime code; review fixtures pause the browser runtime and render explicit timeline times.
