ARAD runtime V39 — larger surface typography, luminous holograms and 2K hardware

BUILD
With Node20+ in this directory:
  cp package.json.txt package.json
  npm install
  npm run build
Pinned dependencies: three0.181.1 and esbuild0.25.11. The build produces scenes.js and selector-objects.js at the site root, three directories above this folder. Serve over HTTP for texture loading. The .txt manifest format matches the publishing allowlist.

SURFACE TYPOGRAPHY
English words remain inside their corresponding inclined holographic rectangles. Plate dimensions and type area are larger, perspective is moderately reduced, and type uses700 weight with crisp white-blue contrast. TRAINING, INFERENCE and DATA share a fitted height based on INFERENCE. LOGICAL PATHS and HARDWARE QUEUES use two lines; the queue text remains on the exposed left part of its plate, clear of the foreground server.
Each label anchor is a child of its plate.group. DOM text uses a CSS affine matrix from the plate's orthographic projected basis. Motion and scroll therefore move text with the surface. No floating black boxes, leader lines, text blur or independent viewport clamps are used.

HOLOGRAM AND HARDWARE
The plate edges combine a sharp white-blue core, restrained cyan outer glow, a lower rim and0.20-world-unit sides. Three demand lanes descend through logical paths into hardware queues. Scan sweeps and data pulses remain separate from the photographic foreground. The hardware never dissolves into a diagram.
All three generated product visualization assets have a2048-pixel long edge. Textures preserve their original sRGB color and alpha. UV crops use alpha>8 bounds with four pixels of padding; original PNGs are not raster-cropped or recolored. Actual hardware is a photographic-looking transparent plane with subtle translation, not an orbitable model or documentary product photograph.

API AND VERIFICATION
ARADObjects.mount and ARADSelectorObjects.mount preserve ready, setPaused, setMode, setProgress, hover, replay, render, exportPng, getState, getAnchors and dispose.
getState exposes label corners, surfaceCorners and insideSurface. All label quads are checked within their plate polygons at progress0/.5/1. exportPng uses the same affine matrices and fitted type. Preload calls remain safe. Dispose removes canvas, labels, readiness state, observers and listeners. Reduced-motion remount retains a single label set. Context loss clears readiness and hides both canvas and surface text so the page fallback remains visible. Restoration re-uploads the texture and redraws. Buffer resizing occurs only when dimensions change, followed by one identical-frame paint for Safari clipped-layer recovery.

FALLBACKS
All three scene families are re-rendered from the final runtime and2K assets. Selector:500x370 CSS at2x, including alpha and surface text. Interior:600x550 CSS at2x. Accelerate mobile selector:195x190 CSS at3x; mobile interior:390x235 CSS at2x. English-suffixed Accelerate copies contain the same English-only typography. These are GPU/browser composites, not scaled screenshots with miniature labels.

The intro, video playback, panel expansion transitions, site content and navigation controllers are outside this runtime change.
