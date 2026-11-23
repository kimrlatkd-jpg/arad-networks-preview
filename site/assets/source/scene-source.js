/* ARAD V34: actual-product-inspired authored equipment forms. Three.js MIT; no remote assets. */
import * as THREE from 'three';
import { addController, addGateway, addPointGateway, addMonitor, addBrand } from './products.js';
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
function material(color,metalness=.8,roughness=.36,extra={}){
 const mat=new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:0,clearcoatRoughness:.44,...extra});
 // Structural metal is not an emitter. Keep reflected radiance below the bloom threshold;
 // optical fibers have their own HDR shader and retain luminous scattering.
 if(metalness>.6)mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight = min(outgoingLight, vec3(1.35));\n#include <opaque_fragment>');};
 return mat;
}
function satinMap(normal=false){
 const w=256,h=256,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,line=Math.sin(y*2.417+Math.sin(x*.018)*.48),grain=rand(y*3.13+x*.017),v=Math.round(186+line*14+grain*26);
  if(normal){data[i]=128;data[i+1]=Math.round(128+line*4+(grain-.5)*3);data[i+2]=255;}else data[i]=data[i+1]=data[i+2]=v;
  data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.4,7);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
function kit(){const satin=satinMap();const brushed={roughnessMap:satin};return{
 silver:material('#8C9AAE',.94,.39,{...brushed}),edge:material('#B1BACA',.91,.32,{...brushed}),
 brushed:material('#687A91',.9,.53,{...brushed}),navy:material('#1B2A55',.73,.43,{roughnessMap:satin,clearcoat:.13,clearcoatRoughness:.42}),
 dark:material('#101A28',.83,.52,{roughnessMap:satin}),etched:material('#263449',.84,.72,{roughnessMap:satin}),inset:material('#02050B',.25,.66),
 concrete:material('#263247',.26,.72),glass:material('#17385C',.4,.25,{transparent:true,opacity:.45}),porcelain:material('#8D9CAC',.28,.47)};}
function box(parent,size,pos,mat,radius=.045){const g=new RoundedBoxGeometry(...size,3,Math.min(radius,Math.min(...size)*.32)),mesh=new THREE.Mesh(g,mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function bar(parent,a,b,width,depth,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from),mesh=box(parent,[width,d.length(),depth],from.clone().add(to).multiplyScalar(.5).toArray(),mat);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;}
function cylinder(parent,radius,height,pos,mat,segments=32){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function path(points){return new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal',.1);}
function pipe(parent,curve,radius,mat){const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,64,radius,6,false),mat);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;parent.add(mesh);return mesh;}
function stage(root,offset,delay=0){const group=new THREE.Group();root.add(group);return{group,offset:new THREE.Vector3(...offset),delay};}
function mergeSolids(root){const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o);});for(const parent of parents){const groups=new Map();for(const o of [...parent.children]){if(!o.isMesh||o.material.isShaderMaterial||o.material.transparent)continue;if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);}for(const [mat,meshes]of groups){if(meshes.length<2)continue;const geometries=meshes.map(o=>{o.updateMatrix();const geo=o.geometry.clone().applyMatrix4(o.matrix);if(!geo.index)return geo;const flat=geo.toNonIndexed();geo.dispose();return flat;});const g=mergeGeometries(geometries,false);geometries.forEach(a=>a.dispose());if(!g)continue;const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=mat.metalness<.8;for(const o of meshes){o.removeFromParent();o.geometry.dispose();}parent.add(mesh);}}}
function fiberBank(parent,curves,lane,signals){
 const geos=[],halos=[];
 curves.forEach((c,i)=>{const radius=.005+rand(i+lane*41)*.0055;for(const[list,r]of[[geos,radius],[halos,radius*4.6]]){
  const g=new THREE.TubeGeometry(c,76,r,4,false),seed=new Float32Array(g.attributes.position.count);seed.fill(rand(i*3.7+lane*71));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));list.push(g);
 }});
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{uTime:{value:0},uProgress:{value:0},uWeight:{value:1},uReveal:{value:1},uHalo:{value:0}},
 vertexShader:`attribute float aSeed;varying vec2 vUv;varying float vSeed;varying float vDepth;void main(){vUv=uv;vSeed=aSeed;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform float uTime,uProgress,uWeight,uReveal,uHalo;varying vec2 vUv;varying float vSeed,vDepth;void main(){
 float travel=uTime*.16+uProgress*4.6;float head=fract(vUv.x-travel*(.7+vSeed*.45)+vSeed);float packet=exp(-pow((head-.5)/(.035+vSeed*.055),2.));
 float fine=.82+.18*sin(vUv.x*19.+vSeed*43.);float edge=smoothstep(0.,.015,vUv.x)*(1.-smoothstep(.985,1.,vUv.x));float reveal=1.-smoothstep(uReveal-.12,uReveal,vUv.x);
 float depth=clamp(1.24-vDepth*.009,.53,1.);vec3 c=mix(vec3(.04,.22,.8),vec3(.67,.86,1.),packet*.86);
 float strength=(.4+packet*2.25)*(.55+vSeed*.72)*fine*uWeight*edge*reveal*depth;
 float sheath=pow(max(0.,sin(vUv.y*3.14159)),1.7);gl_FragColor=vec4(c*strength*(uHalo>.5?.045*sheath:1.),1.);
 }`});
 const haloMat=mat.clone();haloMat.uniforms.uHalo.value=1;
 for(const[list,m]of[[geos,mat],[halos,haloMat]]){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,m);mesh.renderOrder=m===mat?3:2;parent.add(mesh);}
 signals.push({lane,mat,haloMat,count:curves.length});
}
function marker(parent,size,pos,lane,highlights,m){const mat=m.navy.clone();box(parent,size,pos,mat,.015);highlights.push({lane,mat,color:new THREE.Color('#426E9E'),endpoint:true});}
function finish(model){mergeSolids(model.root);model.root.updateMatrixWorld(true);model.bounds=new THREE.Box3().setFromObject(model.root);return model;}

function rackStructure(parent,m,{width,height,depth,position=[0,0,0]}){
 const g=new THREE.Group();g.position.set(...position);parent.add(g);const w=width,h=height,d=depth;
 box(g,[w,h,.15],[0,0,-d/2],m.navy,.045);
 box(g,[w-.3,h-.4,.05],[0,0,-d/2+.11],m.dark,.015);
 for(const x of[-w/2+.10,w/2-.10]){
  box(g,[.20,h,d],[x,0,0],m.brushed,.035);
  box(g,[.055,h-.12,.08],[x-.018,0,d/2+.018],m.edge,.01);
  for(let r=0;r<22;r++)box(g,[.052,.045,.018],[x,-h*.43+r*h*.86/21,d/2+.061],m.inset,.004);
 }
 for(const y of[-h/2+.09,h/2-.09]){
  box(g,[w,.18,d],[0,y,0],m.brushed,.035);
  box(g,[w-.34,.08,.13],[0,y,d/2+.022],m.navy,.012);
 }
 // Broad physical sidewalls keep the cabinet substantial rather than a wire-frame cage.
 for(const x of[-w/2+.02,w/2-.02])box(g,[.07,h-.3,d*.82],[x,0,-d*.09],m.navy,.025);
 box(g,[w-.22,.36,.09],[0,h/2-.38,d/2-.015],m.navy,.018);
 addBrand(g,m,{width:w*.18,position:[0,h/2-.38,d/2+.04]});
 box(g,[w+.13,.22,d+.20],[0,-h/2-.10,0],m.dark,.035);
 return g;
}

function isolate(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 box(root,[10.9,.36,4.05],[0,-3.27,0],m.dark,.08);
 box(root,[10.72,.07,3.95],[0,-3.06,0],m.brushed,.015);
 for(let lane=0;lane<3;lane++){
  const x=(lane-1)*3.5,z=(1-lane)*.25,s=stage(root,[0,.58+lane*.17,-.4],lane*.19),g=s.group;stages.push(s);
  rackStructure(g,m,{width:3.17,height:6.1,depth:2.94,position:[x,.10,z-.1]});
  // Six Service Gateways and two ARAD Controllers: the user's supplied product mix.
  for(let row=0;row<6;row++)addGateway(g,m,{width:2.61,height:.235,depth:1.70,position:[x,2.19-row*.39,z+.33]});
  for(let row=0;row<2;row++)addController(g,m,{width:2.61,height:.48,depth:1.85,position:[x,-1.04-row*.66,z+.255]});
  box(g,[2.63,.30,.06],[x,-2.35,z+1.2],m.dark,.012);
  for(let i=0;i<18;i++)box(g,[.068,.19,.03],[x-1.18+i*.139,-2.35,z+1.25],m.etched,.004);
  const curves=[];
  for(let f=0;f<108;f++){
   const side=f<54?-1:1,j=f%54,layer=Math.floor(j/18),u=j%18/17,depth=-.65+layer*.71;
   const xx=x+side*(1.18+u*.21),bend=side*(.035+.06*Math.sin(f*.43));
   curves.push(path([[x+side*.95,-2.62,z+.85],[xx,-1.88,z+depth],[xx+bend,.1,z+depth+.15],[xx,1.68,z+depth],[x+side*1.02,2.57,z+.93]]));
  }
  fiberBank(g,curves,lane,signals);
  marker(g,[2.04,.045,.055],[x,-2.67,z+1.48],lane,highlights,m);
  anchors.push({start:[x,-2.1,z+1.5],end:[x,2.0,z+1.5]});
 }
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(7.8,4.9,17),targetOffset:new THREE.Vector3(0,-.08,0),groundY:-3.48,cameraDrift:[-.075,.025],fill:.91,duration:4.4});
}

function accelerate(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 // A real vertical equipment proportion; Controller fronts provide the fine-scale detail.
 rackStructure(root,m,{width:5.65,height:8.4,depth:4.1,position:[0,.1,0]});
 box(root,[5.95,.16,4.6],[0,-4.31,0],m.brushed,.025);
 for(let lane=0;lane<3;lane++){
  const y=2.43-lane*2.26,s=stage(root,[0,.28,-.22],lane*.14),g=s.group;stages.push(s);
  for(let row=0;row<3;row++)addController(g,m,{width:5.03,height:.61,depth:3.38,position:[0,y-row*.71,.31]});
  const curves=[];
  for(let f=0;f<96;f++){
   const side=f<48?-1:1,j=f%48,layer=Math.floor(j/16),u=j%16/15,xx=side*(2.43+u*.20),d=-1.27+layer*.86;
   curves.push(path([[side*1.91,y-1.7,1.7],[xx,y-1.31,d+.15],[xx+side*.035,y-.70,d],[xx,y+.1,d+.14],[side*1.91,y+.45,1.7]]));
  }
  fiberBank(g,curves,lane,signals);
  marker(g,[4.49,.035,.065],[0,y-1.75,2.06],lane,highlights,m);
  anchors.push({start:[-2.45,y-.7,2.15],end:[2.45,y-.7,2.15]});
 }
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(9.4,5.8,20),targetOffset:new THREE.Vector3(0,-.04,0),groundY:-4.42,cameraDrift:[-.105,-.015],fill:.92,duration:4.4});
}

function connect(){
 const root=new THREE.Group(),m=kit(),signals=[],highlights=[],anchors=[],stages=[];
 // The connected field is explained by software behind the physical network equipment.
 // This is an abstract interface diagram, not a screenshot or a claim about a shipped UI.
 const display=stage(root,[0,.45,-.35],0),network=stage(root,[.25,.32,0],.16),endpoint=stage(root,[0,.25,.18],.3);stages.push(display,network,endpoint);
 const screen=addMonitor(display.group,m,{width:10.6,height:6.1,depth:.28,position:[-.45,2.0,-1.6]});screen.rotation.y=-.065;
 box(root,[11.25,.21,5.0],[0,-2.52,.25],m.dark,.055);
 box(root,[10.84,.055,4.73],[0,-2.38,.25],m.brushed,.012);
 addGateway(network.group,m,{width:9.0,height:.73,depth:3.02,position:[0,-1.50,.45]});
 addGateway(network.group,m,{width:8.7,height:.70,depth:3.05,position:[.12,-.70,.22]});
 const point=addPointGateway(endpoint.group,m,{width:2.65,height:.66,depth:1.73,position:[2.80,-1.99,2.18]});point.rotation.y=-.13;
 const point2=addPointGateway(endpoint.group,m,{width:2.15,height:.55,depth:1.42,position:[-.67,-2.02,2.41]});point2.rotation.y=-.06;
 const routes=[
  [[-4.1,2.1,-1.3],[-5.0,1.58,-.55],[-5.0,.1,1.1],[-4.5,-.6,1.95],[-2.7,-.7,1.95]],
  [[-2.9,-.40,1.9],[-1.4,-.08,2.0],[.7,-.05,1.98],[2.6,-.3,1.96],[4.1,-.65,1.92]],
  [[3.9,-1.3,1.99],[4.6,-1.6,2.12],[4.45,-1.90,3.00],[2.8,-2.02,3.14],[1.2,-2.08,3.18],[-.66,-2.02,3.14]]
 ];
 for(let lane=0;lane<3;lane++){
  const curves=[];const count=lane===2?48:54;
  for(let i=0;i<count;i++){const spread=i/(count-1)-.5,layer=Math.floor(i/18)-1;curves.push(path(routes[lane].map((p,j)=>{const fan=Math.sin(j/(routes[lane].length-1)*Math.PI);return[p[0]+spread*.23,p[1]+fan*spread*.40,p[2]+fan*layer*.10+spread*.09];})));}
  fiberBank(root,curves,lane,signals);const end=routes[lane].at(-1);marker(root,[.18,.035,.1],end,lane,highlights,m);anchors.push({start:routes[lane][0],end});
 }
 return finish({root,signals,highlights,anchors,stages,direction:new THREE.Vector3(7.6,4.0,22),targetOffset:new THREE.Vector3(0,-.15,.1),groundY:-2.65,cameraDrift:[.09,.025],fill:.92,duration:4.6});
}


function studio(renderer,scene,mobile){const env=new THREE.Scene();env.background=new THREE.Color('#263348');for(const[w,h,x,y,z,color,power]of[[19,9,-7,13,8,'#E3EAF6',2.3],[4,13,11,6,-2,'#9AAEC9',1.9],[13,3,-2,6,-10,'#A8BEDC',1.6],[3,8,-13,2,3,'#D7E3F5',1.45],[9,2,0,-8,6,'#19263C',.6]]){const soft=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));soft.material.color.multiplyScalar(power);soft.position.set(x,y,z);soft.lookAt(0,0,0);env.add(soft);}const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(env,.055,.1,70);scene.environment=environment.texture;scene.environmentIntensity=1.12;env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();const key=new THREE.DirectionalLight('#DDE7F7',.95);key.position.set(-7,14,9);key.castShadow=true;key.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(key.shadow.camera,{left:-14,right:14,top:12,bottom:-12,near:.1,far:55});key.shadow.normalBias=.055;key.shadow.bias=.00005;scene.add(key);const rim=new THREE.DirectionalLight('#7D9FCF',.42);rim.position.set(8,5,-9);scene.add(rim);scene.add(new THREE.HemisphereLight('#D8E5F7','#050913',.55));return{environment,key};}
function releaseScene(scene){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());}

function mount(container,options={}){
 if(!container||typeof container.appendChild!=='function')throw new TypeError('ARADObjects.mount requires a container element.');mounted.get(container)?.dispose();const type=TYPES.has(options.type)?options.type:'isolate';const reduced=typeof options.reducedMotion==='boolean'?options.reducedMotion:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const originalPosition=container.style.position;if(getComputedStyle(container).position==='static')container.style.position='relative';delete container.dataset.objectError;delete container.dataset.objectReady;
 const item={container,ratio:0,disposed:false,failed:false,activate};let renderer,composer,bloom,aaPass,canvas,scene,camera,model,lighting,resizeObserver,intersectionObserver;let raf=0,enabled=false,paused=false,ready=false,last=0,elapsed=0,width=0,height=0;let runUntil=4.8,mode=0,modeFrom=[1,.36,.36],weights=[...modeFrom],modeTime=0,currentTime=0,introStart=0,scrollProgress=0;const look=new THREE.Vector3(),cameraAim=new THREE.Vector3(),baseCamera=new THREE.Vector3(),floorMaterial=new THREE.ShadowMaterial({color:'#000208',opacity:.4});
 function fail(code){item.failed=true;container.dataset.objectError=code;delete container.dataset.objectReady;if(canvas)canvas.style.visibility='hidden';cancelAnimationFrame(raf);raf=0;chooseActive();}
 function init(){if(renderer||item.failed||item.disposed)return!!renderer;try{canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',visibility:'hidden'});canvas.addEventListener('webglcontextlost',contextLost);renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setClearColor('#000208',1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene=new THREE.Scene();scene.background=new THREE.Color('#000208');camera=new THREE.PerspectiveCamera(34,1,.1,160);model=({isolate,accelerate,connect})[type]();scene.add(model.root);lighting=studio(renderer,scene,window.innerWidth<700);const floor=new THREE.Mesh(new THREE.PlaneGeometry(45,45),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=model.groundY;floor.receiveShadow=true;scene.add(floor);const rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});rt.samples=window.innerWidth<700?2:4;composer=new EffectComposer(renderer,rt);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.23,.34,1.65);composer.addPass(bloom);composer.addPass(new OutputPass());aaPass=new SMAAPass();composer.addPass(aaPass);for(const image of [aaPass._areaTexture.image,aaPass._searchTexture.image])image.addEventListener('load',()=>{if(enabled&&!item.disposed&&!item.failed)draw(currentTime);},{once:true});composer.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;gl_FragColor=vec4(max(c,vec3(0.,.0078431373,.031372549)),1.);}'}));container.appendChild(canvas);runUntil=model.duration;if(scrollProgress>.015){elapsed=model.duration;runUntil=elapsed;}resize();return true;}catch(error){if(scene)releaseScene(scene);lighting?.environment.dispose();composer?.dispose();renderer?.dispose();renderer=null;canvas?.remove();fail('webgl-unavailable');return false;}}
 function contextLost(event){event.preventDefault();if(!item.disposed)fail('context-lost');}
 function frameCamera(){if(!model||!width||!height)return;const bounds=model.bounds,center=bounds.getCenter(new THREE.Vector3());look.copy(center).add(model.targetOffset);const corners=[];for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));camera.aspect=width/height;camera.updateProjectionMatrix();const direction=model.direction.clone().normalize();let distance=bounds.getSize(new THREE.Vector3()).length()*1.25;for(let i=0;i<7;i++){camera.position.copy(look).addScaledVector(direction,distance);camera.lookAt(look);camera.updateMatrixWorld();let extent=0;for(const p of corners){const v=p.clone().project(camera);extent=Math.max(extent,Math.abs(v.x)/model.fill,Math.abs(v.y)/.89);}if(Math.abs(extent-1)<.004)break;distance*=extent>1?Math.min(1.6,extent*1.01):Math.max(.65,extent);}baseCamera.copy(look).addScaledVector(direction,distance);}
 function resize(){if(!renderer||item.disposed)return;const rect=container.getBoundingClientRect();if(rect.width<2||rect.height<2)return;const nextW=Math.round(rect.width),nextH=Math.round(rect.height);if(nextW===width&&nextH===height)return;width=nextW;height=nextH;const dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.5:2);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);composer.setPixelRatio(dpr);composer.setSize(width,height);frameCamera();if(enabled)draw(currentTime);}
 function draw(time){
  if(!renderer||!width||!height||item.disposed||item.failed)return;
  currentTime=Math.max(0,Number(time)||0);
  const p=scrollProgress,sp=reduced?0:p,age=reduced||p>.015?model.duration:Math.max(0,currentTime-introStart),progress=reduced||p>.08?1:smooth(0,.65,currentTime-modeTime);
  const approach=smooth(.08,.25,p),middle=smooth(.40,.53,p),ending=smooth(.70,.80,p);
  for(let i=0;i<3;i++)weights[i]=lerp(modeFrom[i],i===mode?1:.36,progress);
  if(p>.08){
   if(type==='isolate')for(let i=0;i<3;i++)weights[i]=lerp(weights[i],lerp(.66,1,middle)*(i===mode?1:lerp(.9,.63,ending)),approach);
   if(type==='accelerate')for(let i=0;i<3;i++)weights[i]=lerp(weights[i],lerp(lerp(.7,1,middle),.09,ending),approach);
   if(type==='connect')for(let i=0;i<3;i++)weights[i]=lerp(weights[i],i===0?lerp(lerp(1,.18,middle),.09,ending):i===1?lerp(lerp(.18,1,middle),.09,ending):lerp(.18,1.3,ending),approach);
  }
  model.stages.forEach((stage,i)=>{
   const q=1-smooth(stage.delay,.5+stage.delay+1.35,age);stage.group.position.copy(stage.offset).multiplyScalar(q);stage.group.rotation.set(0,0,0);
   if(type==='isolate'){stage.group.position.x+=(i-1)*.4*smooth(.18,.62,sp);stage.group.position.z+=(1-i)*.24*smooth(.2,.6,sp);}
   if(type==='accelerate'){stage.group.position.y+=(2-i)*.3*smooth(.14,.62,sp);stage.group.position.z+=(i-1)*.18*smooth(.2,.55,sp);}
  });
  if(model.details)for(const detail of model.details)detail.group.position.y=.36*smooth(.48,.82,sp);
  for(const signal of model.signals){
   const reveal=reduced?1.2:lerp(0,1.2,smooth(.18+signal.lane*.12,2.6+signal.lane*.12,age));
   for(const mat of[signal.mat,signal.haloMat]){
    mat.uniforms.uTime.value=reduced?3.4:currentTime;
    mat.uniforms.uProgress.value=reduced?Math.round(p*2):p;
    mat.uniforms.uWeight.value=weights[signal.lane];mat.uniforms.uReveal.value=reveal;
   }
  }
  for(const h of model.highlights){h.mat.color.copy(h.color).multiplyScalar(.55+weights[h.lane]*.35);h.mat.emissive.set('#538BCB');h.mat.emissiveIntensity=weights[h.lane]*.7;}
  const settle=1-smooth(0,4.5,age),offset=baseCamera.clone().sub(look),aim=look.clone();
  let yaw=model.cameraDrift[0]*settle,zoom=1;
  if(type==='isolate'){
   yaw+=lerp(-.1,.075,smooth(.42,.95,sp))*smooth(.04,.3,sp);zoom=1-.09*smooth(.04,.5,sp);
   aim.x-=.32*smooth(.10,.5,sp);aim.y+=.35*smooth(.7,1,sp);
  }else if(type==='accelerate'){
   yaw-=.11*smooth(.05,.68,sp);zoom=1-.055*smooth(.05,.55,sp);
   offset.y+=offset.length()*.047*smooth(.08,.55,sp);aim.x+=.45*smooth(.7,1,sp);
  }else{
   yaw-=.12*smooth(.1,.72,sp);zoom=1-.055*smooth(.1,.58,sp);
   const endpoint=smooth(.72,.88,sp);zoom-=.08*endpoint;aim.x+=.30*endpoint;aim.z+=.45*endpoint;aim.y-=.40*endpoint;offset.y-=offset.length()*.025*endpoint;
  }
  offset.applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(zoom);offset.y+=model.cameraDrift[1]*settle*offset.length();
  camera.position.copy(aim).add(offset);camera.lookAt(aim);cameraAim.copy(aim);
  // Camera-dependent softbox gradients describe the large metal faces during the dolly.
  composer.render();container.dataset.objectProgress=p.toFixed(3);
  container.dataset.objectAnimating=(!reduced&&!paused&&elapsed<runUntil)?'true':'false';
  container.dataset.objectMotion=paused?'paused':(!reduced&&elapsed<runUntil?'playing':'settled');
  if(!ready){ready=true;container.dataset.objectReady='true';delete container.dataset.objectError;if(typeof options.onReady==='function')options.onReady(api);}
 }
 function tick(stamp){raf=0;if(!enabled||paused||reduced||document.hidden||item.disposed||item.failed)return;if(last)elapsed=Math.min(runUntil,elapsed+Math.min(.06,(stamp-last)/1000));last=stamp;draw(elapsed);if(elapsed<runUntil)raf=requestAnimationFrame(tick);else{last=0;container.dataset.objectAnimating='false';container.dataset.objectMotion='settled';}}
 function schedule(){if(enabled&&!paused&&!reduced&&!document.hidden&&!raf&&!item.failed&&!item.disposed&&elapsed<runUntil){last=0;raf=requestAnimationFrame(tick);}}
 function activate(value){if(item.disposed||item.failed)return;const changed=enabled!==value;enabled=value;if(!value){if(canvas)canvas.style.visibility='hidden';cancelAnimationFrame(raf);raf=0;last=0;return;}if(!init())return;canvas.style.visibility='visible';if(changed||!ready){resize();draw(elapsed);}schedule();}
 function visibility(){chooseActive();}
 function fallbackVisibility(){const r=container.getBoundingClientRect();item.ratio=r.width&&r.height&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth?1:0;chooseActive();}
 function dispose(){if(item.disposed)return;item.disposed=true;cancelAnimationFrame(raf);raf=0;intersectionObserver?.disconnect();resizeObserver?.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',fallbackVisibility);window.removeEventListener('scroll',fallbackVisibility);canvas?.removeEventListener('webglcontextlost',contextLost);if(scene)releaseScene(scene);else floorMaterial.dispose();lighting?.environment.dispose();for(const p of composer?.passes||[])p.dispose?.();composer?.dispose();renderer?.dispose();renderer?.forceContextLoss();canvas?.remove();registry.delete(item);mounted.delete(container);delete container.dataset.objectReady;delete container.dataset.objectMode;delete container.dataset.objectAnimating;delete container.dataset.objectMotion;delete container.dataset.objectProgress;container.style.position=originalPosition;if(active===item)active=null;chooseActive();}
 const api={setProgress(value){const next=clamp(Number(value)||0,0,1);if(Math.abs(next-scrollProgress)<.0001)return;scrollProgress=next;if(next>.015&&model){elapsed=Math.max(elapsed,model.duration);runUntil=elapsed;introStart=0;cancelAnimationFrame(raf);raf=0;last=0;}if(enabled&&init())draw(elapsed);},getState(){return{version:'34.0.0',type,progress:scrollProgress,mode,reducedMotion:reduced,ready,active:enabled,paused,failed:item.failed,fibers:model?.signals.reduce((a,b)=>a+b.count,0)||0,camera:camera?.position.toArray(),target:cameraAim.toArray()};},setMode(index){const next=clamp(Math.round(Number(index)||0),0,2);if(next===mode)return;modeFrom=[...weights];mode=next;modeTime=currentTime;runUntil=Math.max(runUntil,elapsed+1.05);container.dataset.objectMode=String(mode);if(enabled&&init()){draw(currentTime);schedule();}},replay(){if(item.disposed||item.failed)return;introStart=currentTime;runUntil=elapsed+(model?.duration||4.8);if(enabled&&init()){draw(currentTime);schedule();}},setPaused(value){paused=!!value;if(paused){cancelAnimationFrame(raf);raf=0;last=0;container.dataset.objectAnimating='false';container.dataset.objectMotion='paused';}else{if(enabled&&renderer)draw(currentTime);schedule();}},dispose,getAnchors(){if(!model||!camera||!width||!height)return null;model.root.updateMatrixWorld(true);camera.updateMatrixWorld();const project=p=>{const v=new THREE.Vector3(...p).applyMatrix4(model.root.matrixWorld).project(camera);return{x:(v.x+1)/2,y:(1-v.y)/2,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};};const pts=model.anchors[mode];return{type,mode,start:project(pts.start),end:project(pts.end)};},render(time){if(item.disposed||item.failed||!enabled)return;if(init()){if(Number.isFinite(time))elapsed=Math.max(0,time);draw(elapsed);}}};
 registry.add(item);mounted.set(container,api);container.dataset.objectMode='0';document.addEventListener('visibilitychange',visibility);if('ResizeObserver'in window){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);}if('IntersectionObserver'in window){intersectionObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.target===container)item.ratio=e.isIntersecting?e.intersectionRatio:0;chooseActive();},{threshold:[0,.01,.1,.25,.5,.75,1]});intersectionObserver.observe(container);}else window.addEventListener('scroll',fallbackVisibility,{passive:true});window.addEventListener('resize',fallbackVisibility,{passive:true});fallbackVisibility();return api;
}
export {isolate,accelerate,connect,mount};
if(typeof window!=='undefined')window.ARADObjects={mount,version:'34.0.0'};
