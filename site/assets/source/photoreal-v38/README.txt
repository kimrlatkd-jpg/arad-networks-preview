ARAD runtime V38 — English typography on holographic surfaces

BUILD
With Node20+ in this directory:
  cp package.json.txt package.json
  npm install
  npm run build
The local pinned dependencies produce scenes.js and selector-objects.js at the site root, three directories above this folder. Serve over HTTP for texture loading. The .txt manifest format matches the existing publishing allowlist.

FOCUSED CHANGE
The English words sit inside their corresponding inclined hologram rectangles. There are no floating black callout boxes, leader lines, viewport clamps or independent screen-aligned label arrangement. Each label anchor is a child of its actual plate.group. Its CSS affine matrix comes from the plate's orthographic projected basis; when the plate moves with scroll, the text moves with it.

TRAINING, INFERENCE and DATA share one fitted text height based on INFERENCE. LOGICAL PATHS and HARDWARE QUEUES use two lines, fitted within their surface areas. The queue label occupies the exposed area of its plane and avoids the foreground hardware. Typography remains DOM text for sharp rendering but follows the plane angle. Small surfaces necessarily have smaller text: no screen-space minimum forces labels outside the geometry.

The V37 blue luminous materials, plate geometry, photographs, scan/data activity, hardware composition and scene APIs remain unchanged. Isolate/Connect imagery, intro media and site transition controllers are outside this correction.

API AND VERIFICATION
ARADObjects.mount and ARADSelectorObjects.mount preserve ready, setPaused, setMode, setProgress, hover, replay, render, exportPng, getState, getAnchors and dispose.
getState labels includes corners, surfaceCorners and insideSurface. All label quads were verified inside their plate polygons at progress0/.5/1. exportPng uses the same affine matrices and fitted text as the DOM layer. Preload getState/export calls remain safe. Dispose removes both the canvas and label overlay.

FALLBACKS
Only Accelerate fallbacks changed. The primary selector uses500×370 CSS at2×; its mobile version195×190 at3×. The interior uses600×550 CSS at2×; mobile390×235 at2×. English-suffixed copies preserve existing HTML references and contain the same English-only typography. All fallback images are browser/GPU composites including the surface text. Existing Isolate and Connect fallbacks are preserved.

Photographic-looking hardware assets remain unmodified visualization assets rather than documentary product photographs or full orbitable 3D meshes.
