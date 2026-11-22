/* ARAD interior objects. Original scene geometry; Three.js MIT license in README. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TYPES = new Set(['isolate', 'accelerate', 'connect']);
const NAVY = '#1B2A55';
const registry = new Set();
const mounted = new WeakMap();
let active = null;

function chooseActive() {
  let winner = null;
  for (const item of registry) {
    if (item.disposed || item.failed || !item.container.isConnected || item.ratio <= 0) continue;
    if (!winner || item.ratio > winner.ratio || (item.ratio === winner.ratio && item === active)) winner = item;
  }
  if (document.hidden) winner = null;
  active = winner;
  for (const item of registry) item.activate(item === winner);
}

function material(color, metalness = .82, roughness = .32, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: .12, clearcoatRoughness: .4, ...extra });
}

function satinMap() {
  const data = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4;
    const grain = Math.sin(y * 2.317 + Math.sin(x * .03)) * .5 + Math.sin(y * 5.17) * .22;
    const value = Math.round(225 + grain * 18);
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 128, 128, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 5);
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true; return texture;
}

function kit() {
  const satin = satinMap();
  return {
    silver: material('#D2D9E2', .94, .26, {roughnessMap:satin,anisotropy:.5}),
    edge: material('#D9E1EC', .92, .33, {roughnessMap:satin}),
    brushed: material('#9BA9BC', .9, .35, {roughnessMap:satin,anisotropy:.55}),
    navy: material(NAVY, .78, .3, {roughnessMap:satin}),
    dark: material('#0B1422', .65, .43),
    inset: material('#03070F', .25, .62),
    concrete: material('#3B4657', .16, .74),
    porcelain: material('#D9E0E9', .24, .42),
  };
}

function box(parent, size, pos, mat, radius = .055) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, Math.min(radius, Math.min(...size) * .35)), mat);
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function bar(parent, a, b, width, depth, mat, radius = .035) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
  const mesh = box(parent, [width, delta.length(), depth], from.clone().add(to).multiplyScalar(.5).toArray(), mat, radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return mesh;
}

function cylinder(parent, radius, height, pos, mat, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function path(points, tension = .12) {
  return new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal', tension);
}

function pipe(parent, curve, radius, mat) {
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 8, false), mat);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function signal(parent, curve, lane, collection, radius = .012, phase = 0) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uWeight: { value: 1 }, uPhase: { value: phase }, uHalo: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform float uTime,uWeight,uPhase,uHalo;varying vec2 vUv;
      void main(){
        float phase=fract(vUv.x-uTime*.34+uPhase);
        float packet=exp(-pow((phase-.48)/.045,2.));
        float edge=smoothstep(0.,.035,vUv.x)*(1.-smoothstep(.965,1.,vUv.x));
        vec3 c=mix(vec3(.075,.27,.9),vec3(.75,.9,1.),packet);
        float power=(.38+packet*2.1)*uWeight*edge;
        gl_FragColor=vec4(c*power*(uHalo>.5?.10:1.),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 6, false), mat);
  core.renderOrder = 3; parent.add(core);
  const haloMat = mat.clone(); haloMat.uniforms.uHalo.value = 1;
  const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius * 3, 6, false), haloMat);
  halo.renderOrder = 2; parent.add(halo);
  collection.push({ lane, mat, haloMat });
}

function terminal(parent, x, z, m, direction) {
  box(parent, [.76, .48, 1.08], [x, .05, z], m.brushed, .07);
  box(parent, [.032, .29, .84], [x + direction * .39, .06, z], m.inset, .015);
  for (let j = 0; j < 5; j++) box(parent, [.055, .07, .072], [x + direction * .41, .03, z - .29 + j * .145], m.edge, .008);
  box(parent, [.42, .025, .08], [x, .303, z], m.navy, .008);
}

function finish(model) {
  // Merge static solids by material. Signal ribbons retain separate uniforms;
  // highlighted materials remain the same objects referenced by setMode.
  model.root.updateMatrixWorld(true);
  const groups = new Map();
  model.root.traverse(o => {
    if (!o.isMesh || o.material.isShaderMaterial) return;
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(o);
  });
  for (const [mat, meshes] of groups) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(o => {
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (!g.index) return g;
      const flat = g.toNonIndexed(); g.dispose(); return flat;
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    for (const old of meshes) { old.removeFromParent(); old.geometry.dispose(); }
    model.root.add(mesh);
  }
  return model;
}

function isolate() {
  const root = new THREE.Group(), m = kit(), signals = [], highlights = [], anchors = [];
  box(root, [12.7, .62, 6.55], [0, -.83, 0], m.brushed, .14);
  box(root, [12.2, .13, 6.12], [0, -.44, 0], m.dark, .035);
  // Raised, continuous metal boundaries are part of a single machined chassis.
  for (const z of [-3.12, -1.03, 1.03, 3.12]) {
    const outer=Math.abs(z)>3;
    box(root, [12.45, outer?.74:.52, outer?.26:.15], [0, outer?-.13:-.20, z], m.silver, .045);
    box(root, [12.36, .035, outer?.27:.16], [0, outer?.2575:.0775, z], m.brushed, .012);
  }
  for (const x of [-6.28, 6.28]) box(root, [.16, .78, 6.42], [x, -.08, 0], m.silver, .035);
  for (let lane = 0; lane < 3; lane++) {
    const z = (lane - 1) * 2.06, bedMat = m.navy.clone();
    box(root, [10.55, .1, 1.88], [0, -.315, z], bedMat, .025);
    highlights.push({ lane, mat: bedMat, color: new THREE.Color(NAVY) });
    terminal(root, -5.68, z, m, -1); terminal(root, 5.68, z, m, 1);
    for (let f = 0; f < 10; f++) {
      const off = (f - 4.5) * .099;
      const curve = path([[-5.26, -.08, z + off * .58], [-3.8, -.05, z + off], [1.2, -.03, z + off], [4.1, -.05, z + off], [5.26, -.08, z + off * .58]]);
      signal(root, curve, lane, signals, f % 3 === 0 ? .014 : .0085, f * .071 + lane * .13);
    }
    const endMat = material('#86B6ED', .55, .32);
    for (const x of [-5.18,5.18]) box(root,[.065,.035,.94],[x,-.035,z],endMat,.01);
    highlights.push({lane,mat:endMat,color:new THREE.Color('#5C8CC6'),endpoint:true});
    anchors.push({start:[-5.18,-.01,z],end:[5.18,-.01,z]});
  }
  // A deep edge seam catches the studio softbox, without decorative circuit art.
  for (const z of [-3.29, 3.29]) box(root, [11.8, .07, .04], [0, -.83, z], m.inset, .01);
  const model=finish({ root, signals, highlights, anchors, direction: new THREE.Vector3(8, 13, 14), groundY: -1.56, targetOffset: new THREE.Vector3(0, -.06, 0) });
  root.scale.set(.82,1.35,1.06); return model;
}

function accelerate() {
  const root = new THREE.Group(), m = kit(), signals = [], highlights = [], anchors = [];
  // A tiered transmission assembly: three long rails, physical queue sockets,
  // and a common end manifold. No rotating processor icon or floating cubes.
  box(root, [13.6, .35, 6.7], [.05, -.94, 0], m.dark, .1);
  for (const x of [-4.85, 4.85]) box(root, [.55, .6, 6.25], [x, -.58, 0], m.brushed, .07);
  for (let lane = 0; lane < 3; lane++) {
    const z = (lane - 1) * 2.12, y = .12 + (2-lane) * .68;
    const railMat = m.navy.clone();
    box(root, [12.7, .33, 1.53], [0, y, z], m.silver, .055);
    box(root, [12.15, .075, 1.17], [0, y + .195, z], railMat, .018);
    for (const off of [-.65, .65]) box(root, [12.65, .09, .12], [0, y + .22, z + off], m.edge, .028);
    highlights.push({ lane, mat: railMat, color: new THREE.Color(NAVY) });
    // Ordered, inset queue slots remain under the continuous transmission path.
    for (let i = 0; i < 12; i++) {
      const x = -4.95 + i * .86;
      box(root, [.64, .045, .58], [x, y + .25, z], m.inset, .018);
      box(root, [.08, .075, .62], [x - .31, y + .27, z], m.brushed, .012);
      box(root, [.08, .075, .62], [x + .31, y + .27, z], m.brushed, .012);
      box(root, [.42, .028, .34], [x, y + .275, z], railMat, .009);
    }
    for (let f = 0; f < 5; f++) signal(root, path([[-6.1, y + .35, z + (f - 2) * .075], [-2, y + .35, z + (f - 2) * .075], [2, y + .35, z + (f - 2) * .075], [6.1, y + .35, z + (f - 2) * .075]]), lane, signals, .013, f * .13 + lane * .19);
    anchors.push({start:[-6.1,y+.36,z],end:[6.45,y+.36,z]});
    const endMat=material('#86B6ED',.55,.32);
    for(const x of [-6.1,6.38])box(root,[.065,.045,1.02],[x,y+.35,z],endMat,.01);
    highlights.push({lane,mat:endMat,color:new THREE.Color('#5C8CC6'),endpoint:true});
    for (const x of [-6.45, 6.45]) {
      box(root, [.32, .62, 1.74], [x, y + .04, z], m.brushed, .065);
      box(root, [.04, .28, 1.18], [x + Math.sign(x) * .18, y + .08, z], m.inset, .02);
    }
  }
  box(root,[.72,2.65,6.95],[6.88,.52,0],m.navy,.09);
  box(root,[.06,2.42,6.65],[7.28,.53,0],m.brushed,.025);
  for(let i=0;i<15;i++)box(root,[.11,.045,6.4],[7.34,-.42+i*.135,0],m.dark,.01);
  return finish({ root, signals, highlights, anchors, direction: new THREE.Vector3(9.5, 6.5, 15.5), groundY: -1.2, targetOffset: new THREE.Vector3(0, .1, 0) });
}

function connect() {
  const root = new THREE.Group(), m = kit(), signals = [], highlights = [], anchors = [];
  // Architectural sectional model. The removed front enclosure reveals a
  // real extruded tunnel volume under the industrial floor, not a floating icon.
  box(root, [11.5, .34, 7.25], [0, -2.65, .1], m.dark, .1);
  box(root, [11.25, .2, 7.0], [0, -2.36, .1], m.brushed, .04);
  box(root, [11.5, .32, 7.25], [0, -.12, .1], m.brushed, .055);
  box(root, [11.2, .055, 6.98], [0, .07, .1], m.navy, .012);
  // Solid section edges and retaining sides reveal the depth below ground.
  for (const x of [-5.52, 5.52]) box(root, [.24, 2.18, 6.98], [x, -1.25, .1], m.concrete, .035);
  box(root, [10.9, 2.1, .22], [0, -1.27, -3.28], m.concrete, .035);
  for (const x of [-4.8, -1.6, 1.6, 4.8]) {
    for (const z of [-2.45, 1.95]) {
      if(z>0&&Math.abs(x)<4)continue;
      box(root, [.34, 3.14, .34], [x, 1.68, z], m.brushed, .035);
      box(root,[.58,.16,.58],[x,.19,z],m.dark,.035);
    }
    bar(root, [x, 3.28, -2.56], [x, 3.28, 2.06], .3, .34, m.silver);
  }
  for (const z of [-2.45, 1.95]) box(root, [10.0, .32, .38], [0, 3.28, z], m.brushed, .045);
  box(root, [10.15, .15, 1.48], [0, 3.45, -1.98], m.navy, .035);
  box(root, [10.0, 2.9, .22], [0, 1.69, -2.64], m.brushed, .035);
  box(root,[.28,2.9,4.8],[5.03,1.69,-.22],m.dark,.055);
  box(root,[.28,1.22,4.8],[-5.03,.85,-.22],m.brushed,.055);
  box(root,[5.05,.19,4.7],[-2.55,3.51,-.28],m.navy,.04);
  for(const x of [-3.38,3.38])box(root,[4.35,1.98,.48],[x,-1.28,3.35],m.concrete,.05);
  box(root,[11.05,.12,.52],[0,-.28,3.35],m.brushed,.025);
  box(root,[2.6,1.35,1.25],[.15,.84,-.8],m.brushed,.075);
  box(root,[2.35,1.1,.035],[.15,.88,-.15],m.dark,.035);
  box(root,[2.1,.045,.045],[.15,1.23,-.115],m.navy,.01);
  for (const x of [-3.2, 0, 3.2]) box(root, [2.6, .73, .035], [x, 2.5, -2.55], m.brushed, .025);
  // Tall, functional electrical/service cabinets on the warehouse floor.
  for (const x of [-3.6, -2.62]) {
    box(root, [.78, 1.66, .62], [x, .98, -.9], m.brushed, .05);
    box(root, [.65, 1.48, .035], [x, .99, -.566], m.dark, .02);
    box(root, [.035, .34, .035], [x + .2, 1.1, -.534], m.silver, .008);
    for (let f = 0; f < 5; f++) box(root, [.53, .025, .025], [x, .56 + f * .06, -.535], m.brushed, .005);
  }
  // Extruded arch with an actual open interior and continuous floor.
  const arch = new THREE.Shape();
  arch.moveTo(-1.17, -2.25); arch.lineTo(-1.17, -1.84); arch.absarc(0, -1.84, 1.17, Math.PI, 0, true); arch.lineTo(1.17, -2.25); arch.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-.94, -2.17); hole.lineTo(.94, -2.17); hole.lineTo(.94, -1.84); hole.absarc(0, -1.84, .94, 0, Math.PI, false); hole.closePath(); arch.holes.push(hole);
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: 5.85, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 24 }), m.concrete);
  shell.position.z = -2.45; shell.castShadow = true; shell.receiveShadow = true; root.add(shell);
  box(root, [1.85, .1, 5.85], [0, -2.21, .47], m.dark, .025);
  for (const z of [-1.9, -.75, .4, 1.55, 2.7]) {
    const curve = new THREE.EllipseCurve(0, -1.84, .945, .945, 0, Math.PI, false, 0);
    const points = curve.getPoints(40).map(p => new THREE.Vector3(p.x, p.y, z));
    pipe(root, new THREE.CatmullRomCurve3(points), .035, m.brushed);
  }
  // 5G mast: slim support and physical antenna panels, not radio-wave rings.
  cylinder(root, .075, 2.02, [3.95, 4.43, -1.98], m.silver);
  box(root, [.36, .87, .24], [3.95, 5.0, -1.8], m.porcelain, .045);
  box(root, [.24, .78, .35], [4.13, 4.97, -1.98], m.porcelain, .045);
  box(root, [.48, .2, .48], [3.95, 3.49, -1.98], m.brushed, .035);
  // Wireless access equipment, kept grounded in the building structure.
  for (const [x, z] of [[-3.4, .5], [1.4, -.2], [3.8, 1.2]]) {
    box(root, [.38, .12, .38], [x, 2.9, z], m.porcelain, .035);
    bar(root, [x, 2.9, z], [x, 3.27, z], .045, .045, m.brushed, .008);
  }
  const routes = [
    [[3.95, 4.99, -1.64], [3.6, 4.45, -.9], [2.5, 3.45, .3], [2.4, 1.0, .75], [2.1, .3, 1.1]],
    [[-3.4, 2.96, .5], [-2.3, 3.15, .3], [1.4, 2.96, -.2], [2.55, 3.06, .6], [3.8, 2.96, 1.2]],
    [[-3.55, .32, -.4], [-2.2, .23, 1.6], [-1.05, .12, 2.52], [-.82, -.82, 3.31], [-.73, -1.5, 3.15], [-.73, -1.5, -.95]],
  ];
  pipe(root, path(routes[2]), .075, m.dark);
  for (let lane = 0; lane < 3; lane++) {
    const curve = path(routes[lane]);
    signal(root, curve, lane, signals, .024, .17 * lane);
    const marker = m.navy.clone();
    const end = routes[lane][routes[lane].length - 1];
    box(root, [.24, .18, .24], [end[0], end[1] - .05, end[2]], marker, .035);
    highlights.push({ lane, mat: marker, color: new THREE.Color(NAVY),endpoint:true });
    anchors.push({start:routes[lane][0],end:routes[lane][routes[lane].length-1]});
  }
  return finish({ root, signals, highlights, anchors, direction: new THREE.Vector3(11.6, 8.5, 17), groundY: -2.88, targetOffset: new THREE.Vector3(0, -.18, 0) });
}

function studio(renderer, scene, mobile) {
  const envScene = new THREE.Scene(); envScene.background = new THREE.Color('#060B14');
  for (const [w, h, x, y, z, color] of [
    [15, 5, -4, 11, 5, '#FFFFFF'], [5, 13, 8, 5, 0, '#DCE8F9'],
    [17, 5, -3, 7, -9, '#BCC9DA'], [4, 9, -10, 1, 4, '#F4F8FF'],
    [10, 3, 0, -7, 4, '#59687D'],
  ]) {
    const soft = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    soft.material.color.multiplyScalar(2.5); soft.position.set(x, y, z); soft.lookAt(0, 0, 0); envScene.add(soft);
  }
  const pmrem = new THREE.PMREMGenerator(renderer), environment = pmrem.fromScene(envScene, .045, .1, 60);
  scene.environment = environment.texture; scene.environmentIntensity = 1.15;
  envScene.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); }); pmrem.dispose();
  const key = new THREE.DirectionalLight('#F5F8FF', 1.7); key.position.set(-5, 13, 7); key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 10, bottom: -10, near: .1, far: 45 });
  key.shadow.normalBias = .025; key.shadow.bias = -.00015; scene.add(key);
  const rim = new THREE.DirectionalLight('#9EBCEB', 1.1); rim.position.set(6, 4, -8); scene.add(rim);
  const fill = new THREE.DirectionalLight('#E1E8F3', .65); fill.position.set(-8, 3, -2); scene.add(fill);
  scene.add(new THREE.HemisphereLight('#DDE8FA', '#02050A', .3));
  return { environment, key };
}

function releaseScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
  });
  for (const m of materials) {
    for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
    m.dispose();
  }
  geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
}

function mount(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') throw new TypeError('ARADObjects.mount requires a container element.');
  mounted.get(container)?.dispose();
  const type = TYPES.has(options.type) ? options.type : 'isolate';
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = typeof options.reducedMotion === 'boolean' ? options.reducedMotion : !!media?.matches;
  const originalPosition = container.style.position;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  delete container.dataset.objectError; delete container.dataset.objectReady;
  const item = { container, ratio: 0, disposed: false, failed: false, activate };
  let renderer, canvas, scene, camera, model, lighting, resizeObserver, intersectionObserver;
  let raf = 0, enabled = false, paused = false, ready = false, last = 0, elapsed = 0, width = 0, height = 0;
  let runUntil = 2.8;
  let mode = 0, modeFrom = [1, .055, .055], weights = [...modeFrom], modeTime = 0, currentTime = 0;
  const look = new THREE.Vector3(), baseCamera = new THREE.Vector3();
  const floorMaterial = new THREE.ShadowMaterial({ color: '#000208', opacity: .32 });

  function fail(code) {
    item.failed = true; container.dataset.objectError = code; delete container.dataset.objectReady;
    if (canvas) canvas.style.visibility = 'hidden';
    cancelAnimationFrame(raf); raf = 0; chooseActive();
  }

  function init() {
    if (renderer || item.failed || item.disposed) return !!renderer;
    try {
      canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none', visibility: 'hidden' });
      canvas.addEventListener('webglcontextlost', contextLost);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor('#000208', 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(36, 1, .1, 150);
      model = ({ isolate, accelerate, connect })[type](); scene.add(model.root);
      lighting = studio(renderer, scene, window.innerWidth < 700);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMaterial);
      floor.rotation.x = -Math.PI / 2; floor.position.y = model.groundY; floor.receiveShadow = true; scene.add(floor);
      container.appendChild(canvas); resize();
      return true;
    } catch (error) {
      if (scene) releaseScene(scene); lighting?.environment.dispose(); renderer?.dispose(); renderer = null;
      canvas?.remove(); fail('webgl-unavailable'); return false;
    }
  }

  function contextLost(event) { event.preventDefault(); if (!item.disposed) fail('context-lost'); }

  function frameCamera() {
    if (!model || !width || !height) return;
    const bounds = new THREE.Box3().setFromObject(model.root), center = bounds.getCenter(new THREE.Vector3());
    look.copy(center).add(model.targetOffset);
    const corners = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    camera.aspect = width / height; camera.updateProjectionMatrix();
    const direction = model.direction.clone().normalize();
    let distance = bounds.getSize(new THREE.Vector3()).length() * 1.25;
    for (let i = 0; i < 5; i++) {
      camera.position.copy(look).addScaledVector(direction, distance); camera.lookAt(look); camera.updateMatrixWorld();
      let extent = 0;
      for (const point of corners) { const p = point.clone().project(camera); extent = Math.max(extent, Math.abs(p.x) / .96, Math.abs(p.y) / .90); }
      if (Math.abs(extent - 1) < .005) break;
      distance *= extent > 1 ? Math.min(1.6, extent * 1.015) : Math.max(.65, extent);
    }
    baseCamera.copy(look).addScaledVector(direction, distance);
  }

  function resize() {
    if (!renderer || item.disposed) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const nextW = Math.round(rect.width), nextH = Math.round(rect.height);
    if (nextW === width && nextH === height) return;
    width = nextW; height = nextH;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75));
    renderer.setSize(width, height, false); frameCamera();
    if (enabled) draw(currentTime);
  }

  function draw(time) {
    if (!renderer || !width || !height || item.disposed || item.failed) return;
    currentTime = Math.max(0, Number(time) || 0);
    const progress = reduced || paused ? 1 : THREE.MathUtils.clamp((currentTime - modeTime) / .45, 0, 1);
    const ease = progress * progress * (3 - 2 * progress);
    for (let i = 0; i < 3; i++) weights[i] = THREE.MathUtils.lerp(modeFrom[i], i === mode ? 1 : .055, ease);
    for (const item of model.signals) {
      item.mat.uniforms.uTime.value = reduced ? 0 : currentTime;
      item.haloMat.uniforms.uTime.value = reduced ? 0 : currentTime;
      item.mat.uniforms.uWeight.value = weights[item.lane]; item.haloMat.uniforms.uWeight.value = weights[item.lane];
    }
    for (const item of model.highlights) {
      item.mat.color.copy(item.color).multiplyScalar(.7 + weights[item.lane] * .48);
      item.mat.emissive.set(item.endpoint?'#9AC7FF':'#123B80'); item.mat.emissiveIntensity = weights[item.lane] * (item.endpoint?1.4:.10);
    }
    const settle = THREE.MathUtils.clamp(currentTime / 2.6, 0, 1);
    const drift = reduced ? 0 : -Math.pow(1 - settle, 3) * THREE.MathUtils.degToRad(.72);
    const offset = baseCamera.clone().sub(look).applyAxisAngle(new THREE.Vector3(0, 1, 0), drift);
    camera.position.copy(look).add(offset); camera.lookAt(look);
    renderer.render(scene, camera);
    if (!ready) {
      ready = true; container.dataset.objectReady = 'true'; delete container.dataset.objectError;
      if (typeof options.onReady === 'function') options.onReady(api);
    }
  }

  function tick(stamp) {
    raf = 0;
    if (!enabled || paused || reduced || document.hidden || item.disposed || item.failed) return;
    if (last) elapsed = Math.min(runUntil, elapsed + Math.min(.05, (stamp - last) / 1000));
    last = stamp; draw(elapsed);
    if (elapsed < runUntil) raf = requestAnimationFrame(tick); else last = 0;
  }

  function schedule() {
    if (enabled && !paused && !reduced && !document.hidden && !raf && !item.failed && !item.disposed && elapsed < runUntil) { last = 0; raf = requestAnimationFrame(tick); }
  }

  function activate(value) {
    if (item.disposed || item.failed) return;
    const changed = enabled !== value; enabled = value;
    if (!value) { if (canvas) canvas.style.visibility = 'hidden'; cancelAnimationFrame(raf); raf = 0; last = 0; return; }
    if (!init()) return;
    canvas.style.visibility = 'visible';
    if (changed || !ready) { resize(); draw(elapsed); }
    schedule();
  }

  function visibility() { chooseActive(); }
  function fallbackVisibility() {
    const r = container.getBoundingClientRect();
    item.ratio = r.width && r.height && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth ? 1 : 0;
    chooseActive();
  }

  function dispose() {
    if (item.disposed) return;
    item.disposed = true; cancelAnimationFrame(raf); raf = 0;
    intersectionObserver?.disconnect(); resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('resize', fallbackVisibility); window.removeEventListener('scroll', fallbackVisibility);
    canvas?.removeEventListener('webglcontextlost', contextLost);
    if (scene) releaseScene(scene); else floorMaterial.dispose();
    lighting?.environment.dispose(); renderer?.dispose(); renderer?.forceContextLoss(); canvas?.remove();
    registry.delete(item); mounted.delete(container); delete container.dataset.objectReady; delete container.dataset.objectMode;
    container.style.position = originalPosition;
    if (active === item) active = null;
    chooseActive();
  }

  const api = {
    setMode(index) {
      const next = THREE.MathUtils.clamp(Math.round(Number(index) || 0), 0, 2);
      if (next === mode) return;
      modeFrom = [...weights]; mode = next; modeTime = currentTime; runUntil = elapsed + .86;
      container.dataset.objectMode = String(mode);
      if (enabled && init()) { draw(currentTime); schedule(); }
    },
    setPaused(value) { paused = !!value; if (paused) { cancelAnimationFrame(raf); raf = 0; last = 0; } else schedule(); },
    dispose,
    getAnchors() {
      if(!model||!camera||!width||!height)return null;
      model.root.updateMatrixWorld(true);camera.updateMatrixWorld();
      const project=point=>{const v=new THREE.Vector3(...point).applyMatrix4(model.root.matrixWorld).project(camera);return {x:(v.x+1)/2,y:(1-v.y)/2,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};};
      const points=model.anchors[mode];return {type,mode,start:project(points.start),end:project(points.end)};
    },
    render(time) {
      if (item.disposed || item.failed || !enabled) return;
      if (init()) { if (Number.isFinite(time)) elapsed = Math.max(0, time); draw(elapsed); }
    },
  };
  registry.add(item); mounted.set(container, api); container.dataset.objectMode = '0';
  document.addEventListener('visibilitychange', visibility);
  if ('ResizeObserver' in window) { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); }
  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(entries => { for (const entry of entries) if (entry.target === container) item.ratio = entry.isIntersecting ? entry.intersectionRatio : 0; chooseActive(); }, { threshold: [0, .01, .1, .25, .5, .75, 1] });
    intersectionObserver.observe(container);
  } else { window.addEventListener('scroll', fallbackVisibility, { passive: true }); }
  window.addEventListener('resize', fallbackVisibility, { passive: true });
  fallbackVisibility();
  return api;
}

if (typeof window !== 'undefined') window.ARADObjects = { mount, version: '25.1.1' };
