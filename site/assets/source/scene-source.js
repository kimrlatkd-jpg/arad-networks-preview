/* ARAD V26: authored architectural objects. Three.js MIT; no remote assets. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
const TYPES=new Set(['isolate','accelerate','connect']), registry=new Set(), mounted=new WeakMap();
let active=null;
const clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a),0,1);return p*p*(3-2*p);};
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function chooseActive(){let winner=null;for(const item of registry){if(item.disposed||item.failed||!item.container.isConnected||item.ratio<=0)continue;if(!winner||item.ratio>winner.ratio||(item.ratio===winner.ratio&&item===active))winner=item;}if(document.hidden)winner=null;active=winner;for(const item of registry)item.activate(item===winner);}
function material(color,metalness=.8,roughness=.36,extra={}){return new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:0,clearcoatRoughness:.44,...extra});}
function satinMap(){const data=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=Math.round(215+Math.sin(y*2.317+Math.sin(x*.03))*12+Math.sin(y*5.17)*5);data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new THREE.DataTexture(data,128,128,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,5);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
function kit(){const satin=satinMap();return{silver:material('#91A2B9',.87,.44,{roughnessMap:satin,anisotropy:.5}),edge:material('#9DAEC3',.86,.39,{roughnessMap:satin}),brushed:material('#576B87',.82,.49,{roughnessMap:satin,anisotropy:.4}),navy:material('#1B2A55',.65,.5,{roughnessMap:satin}),dark:material('#0C1727',.7,.43),inset:material('#02050B',.2,.64),concrete:material('#263247',.19,.74),glass:material('#17385C',.4,.25,{transparent:true,opacity:.45}),porcelain:material('#8D9CAC',.28,.47)};}
function box(parent,size,pos,mat,radius=.045){const g=new RoundedBoxGeometry(...size,3,Math.min(radius,Math.min(...size)*.32)),mesh=new THREE.Mesh(g,mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function bar(parent,a,b,width,depth,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from),mesh=box(parent,[width,d.length(),depth],from.clone().add(to).multiplyScalar(.5).toArray(),mat);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
function cylinder(parent,radius,height,pos,mat,segments=32){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function path(points){return new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal',.1);}
function pipe(parent,curve,radius,mat){const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,64,radius,6,false),mat);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function stage(root,offset,delay=0){const group=new THREE.Group();root.add(group);return{group,offset:new THREE.Vector3(...offset),delay};}
function mergeSolids(root){const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o);});for(const parent of parents){const groups=new Map();for(const o of [...parent.children]){if(!o.isMesh||o.material.isShaderMaterial||o.material.transparent)continue;if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);}for(const [mat,meshes]of groups){if(meshes.length<2)continue;const geometries=meshes.map(o=>{o.updateMatrix();const geo=o.geometry.clone().applyMatrix4(o.matrix);if(!geo.index)return geo;const flat=geo.toNonIndexed();geo.dispose();return flat;});const g=mergeGeometries(geometries,false);geometries.forEach(a=>a.dispose());if(!g)continue;const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;for(const o of meshes){o.removeFromParent();o.geometry.dispose();}parent.add(mesh);}}}
function fiberBank(parent,curves,lane,signals){
  const geos=[],halos=[];
  curves.forEach((c,i)=>{const radius=.0065+rand(i+lane*41)*.008;for(const [list,r]of [[geos,radius],[halos,radius*4]]){const g=new THREE.TubeGeometry(c,82,r,5,false),seed=new Float32Array(g.attributes.position.count);seed.fill(rand(i*3.7+lane*71));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));list.push(g);}});
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{uTime:{value:0},uWeight:{value:1},uReveal:{value:1},uHalo:{value:0}},vertexShader:`attribute float aSeed;varying vec2 vUv;varying float vSeed;void main(){vUv=uv;vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float uTime,uWeight,uReveal,uHalo;varying vec2 vUv;varying float vSeed;void main(){float head=fract(vUv.x-uTime*(.26+vSeed*.08)+vSeed);float packet=exp(-pow((head-.5)/.065,2.));float fine=.65+.35*sin(vUv.x*13.+vSeed*43.);float edge=smoothstep(0.,.025,vUv.x)*(1.-smoothstep(.975,1.,vUv.x));float reveal=1.-smoothstep(uReveal-.12,uReveal,vUv.x);vec3 c=mix(vec3(.035,.19,.63),vec3(.64,.84,1.),packet*.92);float strength=(.48+packet*2.6)*(.72+vSeed*.5)*fine*uWeight*edge*reveal;gl_FragColor=vec4(c*strength*(uHalo>.5?.095:1.),1.);}`});
  const haloMat=mat.clone();haloMat.uniforms.uHalo.value=1;
  for(const [list,m]of [[geos,mat],[halos,haloMat]]){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,m);mesh.renderOrder=m===mat?3:2;parent.add(mesh);}
  signals.push({lane,mat,haloMat});
}
function marker(parent,size,pos,lane,highlights,m){const mat=m.navy.clone();box(parent,size,pos,mat,.015);highlights.push({lane,mat,color:new THREE.Color('#426E9E'),endpoint:true});}
function finish(model){mergeSolids(model.root);model.root.updateMatrixWorld(true);model.bounds=new THREE.Box3().setFromObject(model.root);return model;}

function isolate(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 // Three independent vertical cavities: a heavy, continuous base and deep machined partitions.
 box(root,[10.9,.55,4.25],[0,-3.18,0],m.dark,.11);
 box(root,[10.9,.11,4.26],[0,-2.88,0],m.brushed,.025);
 box(root,[10.3,.07,.13],[0,-3.2,2.15],m.inset,.015);
 for(let lane=0;lane<3;lane++){
  const x=(lane-1)*3.5,z=(1-lane)*.37,s=stage(root,[0,.58+lane*.17,-.4],lane*.19),g=s.group;stages.push(s);
  box(g,[3.18,5.95,2.75],[x,.13,z-.21],m.navy,.11);
  // The opaque inner plane sits deep behind the luminous paths; sides carry the weight.
  box(g,[2.8,5.48,.13],[x,.08,z+1.21],m.inset,.025);
  for(const dx of [-1.53,1.53]){
    box(g,[.2,6.04,2.88],[x+dx,.11,z-.18],m.brushed,.045);
    box(g,[.045,5.94,.16],[x+dx+.035,.11,z+1.31],m.brushed,.014);
  }
  for(const y of [-2.82,3.04]){
    box(g,[3.1,.16,2.87],[x,y,z-.18],m.brushed,.036);
    box(g,[2.8,.09,.27],[x,y,z+1.31],m.silver,.018);
  }
  // A deep recessed opening; density varies instead of a bank of equal parallel strokes.
  const curves=[];
  for(let f=0;f<36;f++){
    const u=(f/35-.5)*2.27,depth=.07+rand(f+lane*90)*.26,sway=(rand(f*3.1)-.5)*.3;
    curves.push(path([[x+u*.61,-2.66,z+1.5],[x+u*.84,-1.82,z+1.53+depth],[x+u+sway,-.2,z+1.48+depth],[x+u*.96,1.72,z+1.5+depth],[x+u*.63,2.85,z+1.49]]));
  }
  fiberBank(g,curves,lane,signals);
  marker(g,[2.0,.065,.1],[x,-2.67,z+1.49],lane,highlights,m);marker(g,[2.0,.065,.1],[x,2.83,z+1.49],lane,highlights,m);
  // Rear seams, side relief and narrow machined base toes are physically attached.
  for(let k=0;k<6;k++)box(g,[.04,4.9,.07],[x+1.65,.05,z-.99+k*.28],m.dark,.006);
  box(root,[2.54,.16,3.42],[x,-2.8,z+.18],m.dark,.03);
  anchors.push({start:[x,-2.65,z+1.6],end:[x,2.82,z+1.6]});
 }
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(7.8,4.9,17),targetOffset:new THREE.Vector3(0,-.08,0),groundY:-3.48,cameraDrift:[-.075,.025],fill:.95,duration:4.6});
}

function accelerate(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 // Long interleaved transmission engine: horizontal force and strongly recessed channels.
 box(root,[17.4,.65,6.2],[0,-1.62,0],m.dark,.13);
 box(root,[17.1,.12,6.05],[0,-1.23,0],m.brushed,.03);
 for(const x of [-7.6,7.6])box(root,[1.05,.5,5.9],[x,-.98,0],m.navy,.08);
 for(let lane=0;lane<3;lane++){
   const z=(lane-1)*1.92,y=(2-lane)*.7-.55,s=stage(root,[-.9-lane*.2,.25,0],lane*.14),g=s.group;stages.push(s);
   box(g,[16.25,.46,1.72],[0,y,z],m.navy,.075);
   box(g,[15.82,.065,1.39],[0,y+.265,z],m.inset,.015);
   for(const off of [-.82,.82])box(g,[16.3,.18,.13],[0,y+.25,z+off],m.brushed,.035);
   // Tall rear fins and short foreground lips expose each luminous core at the camera angle.
   for(let i=0;i<19;i++){
     const x=-7.6+i*.84,hh=.52+(Math.sin(i/18*Math.PI)*.38);
     box(g,[.105,hh,.3],[x,y+.32+hh/2,z-.65],i%5===0?m.silver:m.brushed,.018);
     box(g,[.105,.22,.23],[x,y+.4,z+.65],m.brushed,.016);
     box(g,[.105,.075,1.24],[x,y+.33,z],m.dark,.012);
   }
   const curves=[];
   for(let f=0;f<26;f++){
     const off=(f/25-.5)*.83,h=.11+rand(f+lane*71)*.17;
     curves.push(path([[-8.0,y+.42,z+off*.75],[-5.6,y+.42+h,z+off],[-1.3,y+.46+h,z+off+.03*Math.sin(f)],[3.9,y+.44+h,z+off],[8.01,y+.42,z+off*.75]]));
   }
   fiberBank(g,curves,lane,signals);
   for(const x of [-8.12,8.12]){box(g,[.43,.8,1.83],[x,y+.13,z],m.brushed,.05);box(g,[.055,.45,1.42],[x+Math.sign(x)*.23,y+.18,z],m.inset,.012);}
   marker(g,[.055,.07,1.18],[8.01,y+.42,z],lane,highlights,m);
   anchors.push({start:[-8,y+.52,z],end:[8,y+.52,z]});
 }
 // Dark end manifold with a single broad metal surface; never chrome on every edge.
 box(root,[.75,3.27,6.54],[8.8,-.05,0],m.navy,.12);
 box(root,[.075,3.02,6.21],[9.21,-.03,0],m.brushed,.02);
 for(let i=0;i<21;i++)box(root,[.07,.04,5.7],[9.27,-1.22+i*.12,0],m.dark,.007);
 box(root,[.07,2.62,.075],[9.31,.05,2.96],m.silver,.012);
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(10,9.2,21),targetOffset:new THREE.Vector3(.18,-.05,0),groundY:-1.99,cameraDrift:[-.105,-.015],fill:.96,duration:4.6});
}

function connect(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 // A continuous industrial land section, with three architectural masses and a usable open tunnel.
 box(root,[5.2,2.1,8.1],[-4.3,-1.48,.05],m.concrete,.06);
 box(root,[5.2,2.1,8.1],[4.3,-1.48,.05],m.concrete,.06);
 box(root,[3.4,2.1,4.2],[0,-1.48,-1.91],m.concrete,.04);
 // Front wall is genuinely removed at the tunnel; no drawn tunnel sticker.
 box(root,[13.98,.3,8.2],[0,-.26,.05],m.brushed,.045);
 box(root,[13.7,.08,7.94],[0,-.055,.05],m.dark,.018);
 box(root,[13.6,.1,8.0],[0,-2.59,.05],m.dark,.022);
 // Deep foreground incision: black recess and two thick section cheeks.
 box(root,[5.2,1.84,.26],[-4.29,-1.45,4.16],m.concrete,.025);
 box(root,[5.2,1.84,.26],[4.29,-1.45,4.16],m.concrete,.025);
 
 box(root,[2.85,.09,4.2],[0,-2.32,2.26],m.dark,.02);
 const arch=new THREE.Shape();arch.moveTo(-1.59,-2.36);arch.lineTo(-1.59,-1.63);arch.absarc(0,-1.63,1.59,Math.PI,0,true);arch.lineTo(1.59,-2.36);arch.closePath();const hole=new THREE.Path();hole.moveTo(-1.32,-2.27);hole.lineTo(1.32,-2.27);hole.lineTo(1.32,-1.63);hole.absarc(0,-1.63,1.32,0,Math.PI,false);hole.closePath();arch.holes.push(hole);
 const shell=new THREE.Mesh(new THREE.ExtrudeGeometry(arch,{depth:3.5,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:32}),m.brushed);shell.position.z=.72;shell.castShadow=true;shell.receiveShadow=false;root.add(shell);
 // Main hall is a large dark satin mass with an exposed service interior to the right.
 const hall=stage(root,[0,.7,-.2],.05);stages.push(hall);
 box(hall.group,[7.9,3.65,4.65],[-2.3,1.88,-.83],m.navy,.09);
 box(hall.group,[8.03,.2,4.74],[-2.3,3.8,-.83],m.brushed,.035);
 box(hall.group,[5.9,.24,.82],[-2.3,4.0,-1.2],m.dark,.035);
 for(let f=0;f<11;f++)box(hall.group,[.095,.19,.7],[-4.75+f*.49,4.08,-1.2],m.brushed,.014);
 for(const x of [-5.95,1.35])box(hall.group,[.07,.075,4.3],[x,3.94,-.83],m.dark,.012);
 box(hall.group,[7.52,3.2,.09],[-2.3,1.82,1.55],m.dark,.025);
 for(let i=0;i<12;i++)box(hall.group,[.09,3.02,.14],[-5.78+i*.63,1.88,1.64],m.brushed,.012);
 box(hall.group,[7.4,.08,.09],[-2.3,2.68,1.75],m.navy,.012);
 // A secondary high service tower and a lower uncovered plant bay create a stepped skyline.
 const tower=stage(root,[0,1,-.12],.3);stages.push(tower);
 box(tower.group,[3.03,5.22,3.3],[4.63,2.66,-2.05],m.dark,.08);
 box(tower.group,[3.16,.15,3.43],[4.63,5.34,-2.05],m.brushed,.026);
 box(tower.group,[.1,5.0,3.1],[6.18,2.68,-2.05],m.brushed,.018);
 for(let i=0;i<7;i++)box(tower.group,[2.7,.052,.08],[4.63,.55+i*.63,-.34],m.brushed,.009);
 const bay=stage(root,[.25,.5,.12],.16);stages.push(bay);
 box(bay.group,[4.65,.18,3.92],[4.37,.18,1.65],m.brushed,.03);
 for(const x of [2.25,6.48])for(const z of [.04,3.3]){box(bay.group,[.2,2.54,.2],[x,1.54,z],m.brushed,.025);box(bay.group,[.37,.1,.37],[x,.31,z],m.dark,.015);}
 for(const z of [.04,3.3])box(bay.group,[4.53,.23,.22],[4.37,2.84,z],m.brushed,.03);
 box(bay.group,[4.53,.12,1.02],[4.37,3.01,.4],m.navy,.025);
 for(const x of [3.05,4.13,5.21]){box(bay.group,[.84,1.78,.92],[x,1.12,1.4],m.navy,.045);box(bay.group,[.72,1.55,.06],[x,1.14,1.89],m.inset,.018);for(let j=0;j<5;j++)box(bay.group,[.56,.028,.04],[x,.55+j*.1,1.94],m.brushed,.005);}
 // 5G equipment remains subordinate to architecture.
 cylinder(root,.075,1.4,[-4.9,4.59,-1.7],m.brushed);box(root,[.34,.83,.2],[-4.9,5.0,-1.54],m.porcelain,.035);
 for(const p of [[-1.15,2.79,1.79],[2.45,2.91,1.15],[5.95,2.91,3.15]])box(root,[.3,.18,.28],p,m.porcelain,.025);
 const routes=[
  [[-4.9,4.99,-1.3],[-3.9,4.8,-.55],[-1.85,4.15,.12],[1.7,3.3,1.2],[5.75,2.91,3.15]],
  [[-1.15,2.88,1.92],[.35,3.12,2.18],[2.45,3.03,1.35],[4.05,3.22,2.32],[5.95,3.02,3.3]],
  [[4.13,.61,1.97],[3.6,.35,3.12],[1.04,.25,3.66],[.96,-.56,4.31],[.94,-1.35,4.3],[.94,-1.92,3.55],[.94,-1.98,1.8]]
 ];
 pipe(root,path(routes[2]),.063,m.dark);
 for(let lane=0;lane<3;lane++){
   const curves=[];for(let i=0;i<(lane===2?12:9);i++){const off=(i-5)*.024;curves.push(path(routes[lane].map((p,j)=>[p[0]+off,p[1]+Math.sin(j)*off*.4,p[2]+off*.6])));}
   fiberBank(root,curves,lane,signals);const end=routes[lane].at(-1);marker(root,[.22,.07,.22],end,lane,highlights,m);anchors.push({start:routes[lane][0],end});
 }
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(11,7.3,18),targetOffset:new THREE.Vector3(0,-.25,.1),groundY:-2.78,cameraDrift:[.09,.025],fill:.94,duration:4.8});
}

function studio(renderer,scene,mobile){const env=new THREE.Scene();env.background=new THREE.Color('#03070D');for(const[w,h,x,y,z,color,power]of[[16,6,-6,13,8,'#E3EAF6',2.1],[4,11,10,6,-2,'#8BA7CE',1.6],[13,3,-2,6,-10,'#B5C4D8',1.4],[3,8,-13,2,3,'#D7E3F5',1.8],[9,2,0,-8,6,'#19263C',.6]]){const soft=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));soft.material.color.multiplyScalar(power);soft.position.set(x,y,z);soft.lookAt(0,0,0);env.add(soft);}const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(env,.055,.1,70);scene.environment=environment.texture;scene.environmentIntensity=.67;env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();const key=new THREE.DirectionalLight('#DDE7F7',1.35);key.position.set(-7,14,9);key.castShadow=true;key.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(key.shadow.camera,{left:-14,right:14,top:12,bottom:-12,near:.1,far:55});key.shadow.normalBias=.055;key.shadow.bias=.00005;scene.add(key);const rim=new THREE.DirectionalLight('#7D9FCF',.65);rim.position.set(8,5,-9);scene.add(rim);scene.add(new THREE.HemisphereLight('#D8E5F7','#02040A',.22));return{environment,key};}
function releaseScene(scene){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());}

function mount(container,options={}){
 if(!container||typeof container.appendChild!=='function')throw new TypeError('ARADObjects.mount requires a container element.');mounted.get(container)?.dispose();const type=TYPES.has(options.type)?options.type:'isolate';const reduced=typeof options.reducedMotion==='boolean'?options.reducedMotion:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const originalPosition=container.style.position;if(getComputedStyle(container).position==='static')container.style.position='relative';delete container.dataset.objectError;delete container.dataset.objectReady;
 const item={container,ratio:0,disposed:false,failed:false,activate};let renderer,composer,bloom,aaPass,canvas,scene,camera,model,lighting,resizeObserver,intersectionObserver;let raf=0,enabled=false,paused=false,ready=false,last=0,elapsed=0,width=0,height=0;let runUntil=4.8,mode=0,modeFrom=[1,.13,.13],weights=[...modeFrom],modeTime=0,currentTime=0,introStart=0;const look=new THREE.Vector3(),baseCamera=new THREE.Vector3(),floorMaterial=new THREE.ShadowMaterial({color:'#000208',opacity:.4});
 function fail(code){item.failed=true;container.dataset.objectError=code;delete container.dataset.objectReady;if(canvas)canvas.style.visibility='hidden';cancelAnimationFrame(raf);raf=0;chooseActive();}
 function init(){if(renderer||item.failed||item.disposed)return!!renderer;try{canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',visibility:'hidden'});canvas.addEventListener('webglcontextlost',contextLost);renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setClearColor('#000208',1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene=new THREE.Scene();scene.background=new THREE.Color('#000208');camera=new THREE.PerspectiveCamera(34,1,.1,160);model=({isolate,accelerate,connect})[type]();scene.add(model.root);lighting=studio(renderer,scene,window.innerWidth<700);const floor=new THREE.Mesh(new THREE.PlaneGeometry(45,45),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=model.groundY;floor.receiveShadow=true;scene.add(floor);const rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});rt.samples=window.innerWidth<700?2:4;composer=new EffectComposer(renderer,rt);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.15,.22,2.2);composer.addPass(bloom);composer.addPass(new OutputPass());aaPass=new SMAAPass();composer.addPass(aaPass);for(const image of [aaPass._areaTexture.image,aaPass._searchTexture.image])image.addEventListener('load',()=>{if(enabled&&!item.disposed&&!item.failed)draw(currentTime);},{once:true});composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;gl_FragColor=vec4(max(c,vec3(0.,.0078431373,.031372549)),1.);}'}));container.appendChild(canvas);runUntil=model.duration;resize();return true;}catch(error){if(scene)releaseScene(scene);lighting?.environment.dispose();composer?.dispose();renderer?.dispose();renderer=null;canvas?.remove();fail('webgl-unavailable');return false;}}
 function contextLost(event){event.preventDefault();if(!item.disposed)fail('context-lost');}
 function frameCamera(){if(!model||!width||!height)return;const bounds=model.bounds,center=bounds.getCenter(new THREE.Vector3());look.copy(center).add(model.targetOffset);const corners=[];for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));camera.aspect=width/height;camera.updateProjectionMatrix();const direction=model.direction.clone().normalize();let distance=bounds.getSize(new THREE.Vector3()).length()*1.25;for(let i=0;i<7;i++){camera.position.copy(look).addScaledVector(direction,distance);camera.lookAt(look);camera.updateMatrixWorld();let extent=0;for(const p of corners){const v=p.clone().project(camera);extent=Math.max(extent,Math.abs(v.x)/model.fill,Math.abs(v.y)/.89);}if(Math.abs(extent-1)<.004)break;distance*=extent>1?Math.min(1.6,extent*1.01):Math.max(.65,extent);}baseCamera.copy(look).addScaledVector(direction,distance);}
 function resize(){if(!renderer||item.disposed)return;const rect=container.getBoundingClientRect();if(rect.width<2||rect.height<2)return;const nextW=Math.round(rect.width),nextH=Math.round(rect.height);if(nextW===width&&nextH===height)return;width=nextW;height=nextH;const dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.5:2);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);composer.setPixelRatio(dpr);composer.setSize(width,height);frameCamera();if(enabled)draw(currentTime);}
 function draw(time){if(!renderer||!width||!height||item.disposed||item.failed)return;currentTime=Math.max(0,Number(time)||0);const age=reduced?model.duration:Math.max(0,currentTime-introStart),progress=reduced?1:smooth(0,.65,currentTime-modeTime);for(let i=0;i<3;i++)weights[i]=lerp(modeFrom[i],i===mode?1:.13,progress);for(const s of model.stages){const p=1-smooth(s.delay,.5+s.delay+1.35,age);s.group.position.copy(s.offset).multiplyScalar(p);}for(const s of model.signals){s.mat.uniforms.uTime.value=reduced?3.4:currentTime;s.haloMat.uniforms.uTime.value=reduced?3.4:currentTime;s.mat.uniforms.uWeight.value=weights[s.lane];s.haloMat.uniforms.uWeight.value=weights[s.lane];const reveal=reduced?1.2:lerp(0,1.2,smooth(.18+s.lane*.12,2.6+s.lane*.12,age));s.mat.uniforms.uReveal.value=reveal;s.haloMat.uniforms.uReveal.value=reveal;}for(const h of model.highlights){h.mat.color.copy(h.color).multiplyScalar(.55+weights[h.lane]*.35);h.mat.emissive.set('#538BCB');h.mat.emissiveIntensity=weights[h.lane]*.7;}const settle=1-smooth(0,4.5,age),offset=baseCamera.clone().sub(look).applyAxisAngle(new THREE.Vector3(0,1,0),model.cameraDrift[0]*settle);offset.y+=model.cameraDrift[1]*settle*offset.length();camera.position.copy(look).add(offset);camera.lookAt(look);composer.render();container.dataset.objectAnimating=(!reduced&&!paused&&elapsed<runUntil)?'true':'false';container.dataset.objectMotion=paused?'paused':(!reduced&&elapsed<runUntil?'playing':'settled');if(!ready){ready=true;container.dataset.objectReady='true';delete container.dataset.objectError;if(typeof options.onReady==='function')options.onReady(api);}}
 function tick(stamp){raf=0;if(!enabled||paused||reduced||document.hidden||item.disposed||item.failed)return;if(last)elapsed=Math.min(runUntil,elapsed+Math.min(.06,(stamp-last)/1000));last=stamp;draw(elapsed);if(elapsed<runUntil)raf=requestAnimationFrame(tick);else{last=0;container.dataset.objectAnimating='false';container.dataset.objectMotion='settled';}}
 function schedule(){if(enabled&&!paused&&!reduced&&!document.hidden&&!raf&&!item.failed&&!item.disposed&&elapsed<runUntil){last=0;raf=requestAnimationFrame(tick);}}
 function activate(value){if(item.disposed||item.failed)return;const changed=enabled!==value;enabled=value;if(!value){if(canvas)canvas.style.visibility='hidden';cancelAnimationFrame(raf);raf=0;last=0;return;}if(!init())return;canvas.style.visibility='visible';if(changed||!ready){resize();draw(elapsed);}schedule();}
 function visibility(){chooseActive();}
 function fallbackVisibility(){const r=container.getBoundingClientRect();item.ratio=r.width&&r.height&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth?1:0;chooseActive();}
 function dispose(){if(item.disposed)return;item.disposed=true;cancelAnimationFrame(raf);raf=0;intersectionObserver?.disconnect();resizeObserver?.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',fallbackVisibility);window.removeEventListener('scroll',fallbackVisibility);canvas?.removeEventListener('webglcontextlost',contextLost);if(scene)releaseScene(scene);else floorMaterial.dispose();lighting?.environment.dispose();for(const p of composer?.passes||[])p.dispose?.();composer?.dispose();renderer?.dispose();renderer?.forceContextLoss();canvas?.remove();registry.delete(item);mounted.delete(container);delete container.dataset.objectReady;delete container.dataset.objectMode;delete container.dataset.objectAnimating;delete container.dataset.objectMotion;container.style.position=originalPosition;if(active===item)active=null;chooseActive();}
 const api={setMode(index){const next=clamp(Math.round(Number(index)||0),0,2);if(next===mode)return;modeFrom=[...weights];mode=next;modeTime=currentTime;runUntil=Math.max(runUntil,elapsed+1.05);container.dataset.objectMode=String(mode);if(enabled&&init()){draw(currentTime);schedule();}},replay(){if(item.disposed||item.failed)return;introStart=currentTime;runUntil=elapsed+(model?.duration||4.8);if(enabled&&init()){draw(currentTime);schedule();}},setPaused(value){paused=!!value;if(paused){cancelAnimationFrame(raf);raf=0;last=0;container.dataset.objectAnimating='false';container.dataset.objectMotion='paused';}else{if(enabled&&renderer)draw(currentTime);schedule();}},dispose,getAnchors(){if(!model||!camera||!width||!height)return null;model.root.updateMatrixWorld(true);camera.updateMatrixWorld();const project=p=>{const v=new THREE.Vector3(...p).applyMatrix4(model.root.matrixWorld).project(camera);return{x:(v.x+1)/2,y:(1-v.y)/2,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};};const pts=model.anchors[mode];return{type,mode,start:project(pts.start),end:project(pts.end)};},render(time){if(item.disposed||item.failed||!enabled)return;if(init()){if(Number.isFinite(time))elapsed=Math.max(0,time);draw(elapsed);}}};
 registry.add(item);mounted.set(container,api);container.dataset.objectMode='0';document.addEventListener('visibilitychange',visibility);if('ResizeObserver'in window){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);}if('IntersectionObserver'in window){intersectionObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.target===container)item.ratio=e.isIntersecting?e.intersectionRatio:0;chooseActive();},{threshold:[0,.01,.1,.25,.5,.75,1]});intersectionObserver.observe(container);}else window.addEventListener('scroll',fallbackVisibility,{passive:true});window.addEventListener('resize',fallbackVisibility,{passive:true});fallbackVisibility();return api;
}
export {isolate,accelerate,connect,mount};
if(typeof window!=='undefined')window.ARADObjects={mount,version:'26.0.4'};
