/* ARAD V29 selector sculptures. Authored geometry, Three.js MIT. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const mounted=new WeakMap();
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function satin(){const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,v=185+Math.round(20*Math.sin(y*1.79)+7*Math.sin(x*.17+y*.21));data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,5);t.needsUpdate=true;return t;}
function kit(){const map=satin();const mat=(color,metalness,roughness)=>new THREE.MeshStandardMaterial({color,metalness,roughness,roughnessMap:map,envMapIntensity:1.35});return {silver:mat('#a8b3c2',.91,.34),edge:mat('#c2cbd6',.91,.27),navy:mat('#1b2a55',.72,.37),dark:mat('#141d2a',.85,.41),inset:mat('#050c15',.22,.65),blue:mat('#4273bb',.55,.26)};}
function box(g,size,pos,mat,r=.05){const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,3,Math.min(r,Math.min(...size)*.28)),mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;}
function frame(g,w,h,d,t,pos,mat){const a=new THREE.Group();a.position.set(...pos);g.add(a);
 const rounded=(path,width,height,r)=>{const x=-width/2,y=-height/2;path.moveTo(x+r,y);path.lineTo(x+width-r,y);path.quadraticCurveTo(x+width,y,x+width,y+r);path.lineTo(x+width,y+height-r);path.quadraticCurveTo(x+width,y+height,x+width-r,y+height);path.lineTo(x+r,y+height);path.quadraticCurveTo(x,y+height,x,y+height-r);path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);};
 const shape=new THREE.Shape(),hole=new THREE.Path(),radius=Math.min(.13,t*.35);rounded(shape,w,h,radius);rounded(hole,w-t*2,h-t*2,Math.min(.095,t*.3));shape.holes.push(hole);
 const bevel=Math.min(.032,d*.20,t*.15),geometry=new THREE.ExtrudeGeometry(shape,{depth:d-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:8,steps:1});geometry.translate(0,0,-d/2+bevel);const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;mesh.receiveShadow=false;a.add(mesh);return a;}
function merge(root){const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o);});for(const parent of parents){const groups=new Map();for(const o of [...parent.children]){if(!o.isMesh)continue;if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o);}for(const [mat,meshes]of groups){if(meshes.length<2)continue;const geometries=meshes.map(o=>{o.updateMatrix();let g=o.geometry.clone().applyMatrix4(o.matrix);if(g.index){const flat=g.toNonIndexed();g.dispose();g=flat;}return g;});const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!geometry)continue;const combined=new THREE.Mesh(geometry,mat);combined.castShadow=true;combined.receiveShadow=false;for(const o of meshes){o.geometry.dispose();parent.remove(o);}parent.add(combined);}}}
function isolate(){const root=new THREE.Group(),m=kit();
 // One precision enclosure with three independently recessed channels.
 frame(root,5.2,6.9,2.15,.32,[0,0,0],m.silver);
 frame(root,4.64,6.32,.12,.10,[0,0,1.125],m.edge);
 box(root,[4.58,6.24,.18],[0,0,-.96],m.navy,.035);
 box(root,[4.58,.26,2.05],[0,-3.08,.03],m.dark,.03);
 for(const x of [-.79,.79]){box(root,[.18,6.23,1.9],[x,0,.02],m.dark,.035);box(root,[.045,6.14,.06],[x+.025,0,1.02],m.silver,.01);}
 for(let lane=0;lane<3;lane++){const x=(lane-1)*1.58;
  box(root,[1.31,5.8,.13],[x,0,-.79],m.inset,.02);
  for(let k=0;k<11;k++){box(root,[1.23,.24,.42],[x,2.45-k*.49,-.57],m.navy,.025);box(root,[1.09,.025,.035],[x,2.53-k*.49,-.34],m.blue,.005);}
  for(const y of [-2.89,2.89]){box(root,[1.23,.16,1.6],[x,y,.02],m.dark,.02);for(let j=0;j<6;j++)box(root,[.11,.08,1.38],[x-.46+j*.184,y+.08,.02],m.silver,.012);}
 }
 for(const x of [-2.24,2.24])for(let j=0;j<12;j++)box(root,[.12,5.75,.035],[x,0,-.74+j*.145],m.dark,.006);
 box(root,[5.42,.23,2.34],[0,-3.55,0],m.navy,.045);
 box(root,[4.9,.08,2.1],[0,-3.72,0],m.dark,.014);
 merge(root);return{root,direction:[8,5.1,16],rotation:[0,-.08,0],ground:-3.77,fill:1.04};}
function accelerate(){const root=new THREE.Group(),m=kit();
 // A single compute cartridge: dense heat fins over a tiered precision shell.
 box(root,[6.95,.53,4.5],[0,-1.02,0],m.dark,.08);
 box(root,[6.7,.18,4.36],[0,-1.39,0],m.silver,.035);
 box(root,[6.58,.14,4.14],[0,-.71,0],m.navy,.035);
 for(let layer=0;layer<3;layer++){const z=(layer-1)*1.34,y=-.36+layer*.13;
  box(root,[6.42,.28,1.15],[0,y,z],m.navy,.045);
  box(root,[6.2,.07,1.02],[0,y+.17,z],m.silver,.018);
  for(let i=0;i<23;i++){const x=-2.91+i*.265,height=.66+.3*Math.sin(i/22*Math.PI);box(root,[.082,height,.92],[x,y+.2+height/2,z],m.silver,.018);}
 }
 for(const x of [-3.16,3.16]){box(root,[.24,1.83,4.02],[x,-.05,0],m.dark,.035);box(root,[.07,1.67,3.8],[x+(x>0?.14:-.14),-.03,0],m.navy,.018);}
 box(root,[5.85,.67,.16],[0,-.99,2.28],m.navy,.022);
 for(let i=0;i<5;i++){box(root,[.73,.27,.1],[-2.23+i*1.10,-.99,2.38],m.inset,.018);box(root,[.61,.035,.045],[-2.23+i*1.10,-.83,2.43],m.silver,.006);}
 box(root,[5.94,.06,.08],[0,-.62,2.34],m.blue,.015);
 merge(root);return{root,direction:[8.7,7.8,13],rotation:[0,-.14,0],ground:-1.53,fill:1.18};}
function connect(){const root=new THREE.Group(),m=kit();
 // Interlocked machined channels make one continuous, structural connection.
 const a=frame(root,4.5,4.5,.78,.51,[-.96,.65,.1],m.silver);a.rotation.y=-.22;
 const b=frame(root,4.5,4.5,.78,.51,[.95,-.65,-.10],m.navy);b.rotation.y=Math.PI/2-.22;
 // Thin reliefs follow the inside of each member rather than glowing free paths.
 frame(a,3.53,3.53,.065,.045,[0,0,.423],m.blue);
 frame(a,4.48,4.48,.035,.055,[0,0,.402],m.edge);
 frame(b,3.53,3.53,.065,.045,[0,0,.423],m.blue);
 frame(b,4.48,4.48,.035,.055,[0,0,.402],m.silver);
 for(let j=0;j<7;j++){
  box(a,[.12,3.43,.035],[-1.97,0,-.27+j*.085],m.dark,.007);
  box(b,[.12,3.43,.035],[1.97,0,-.27+j*.085],m.dark,.007);
 }
 // Joined collars emphasize physical engagement, without icon-like spheres.
 box(root,[1.08,.63,1.1],[.82,1.43,.16],m.dark,.065);
 box(root,[1.08,.63,1.1],[-.82,-1.43,-.16],m.dark,.065);
 box(root,[.82,.06,.87],[.82,1.77,.16],m.silver,.012);
 box(root,[.82,.06,.87],[-.82,-1.77,-.16],m.silver,.012);
 merge(root);return{root,direction:[9.8,6.4,14.8],rotation:[.03,-.1,-.10],ground:-3.05,fill:1.04};}
const builders={isolate,accelerate,connect};
function mount(container,{type='isolate',reducedMotion=false,onReady}={}){
 if(mounted.has(container))return mounted.get(container);if(!builders[type])type='isolate';
 const model=builders[type](),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,.1,150),renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='display:block;width:100%;height:100%;pointer-events:none';container.append(canvas);
 const studio=new THREE.Scene();studio.background=new THREE.Color('#8490a1');
 const softbox=(size,pos,color)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(3.5),side:THREE.DoubleSide}));mesh.position.set(...pos);mesh.lookAt(0,0,0);studio.add(mesh);};
 softbox([10,8],[-8,6,12],'#ffffff');softbox([7,12],[10,5,-10],'#b7c4d7');softbox([12,6],[0,11,-6],'#d7e0ed');softbox([3,11],[-5,1,-9],'#778aa4');
 const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(studio,.075);scene.environment=env.texture;studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
 scene.add(model.root);model.root.rotation.set(...model.rotation);
 const ambient=new THREE.HemisphereLight('#e6efff','#596a83',.48);scene.add(ambient);
 const key=new THREE.DirectionalLight('#ffffff',1.1);key.position.set(-7,12,10);key.castShadow=false;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:50});key.shadow.bias=-.0007;key.shadow.normalBias=.02;scene.add(key);
 const rim=new THREE.DirectionalLight('#b3ccff',.7);rim.position.set(8,4,-8);scene.add(rim);
 const shadowSize=128,shadowData=new Uint8Array(shadowSize*shadowSize*4);for(let y=0;y<shadowSize;y++)for(let x=0;x<shadowSize;x++){const r2=Math.pow((x-shadowSize/2)/(shadowSize*.46),2)+Math.pow((y-shadowSize/2)/(shadowSize*.46),2),v=Math.round(Math.pow(Math.max(0,1-r2),2.8)*255),i=(y*shadowSize+x)*4;shadowData[i]=shadowData[i+1]=shadowData[i+2]=v;shadowData[i+3]=255;}
 const shadowMap=new THREE.DataTexture(shadowData,shadowSize,shadowSize);shadowMap.needsUpdate=true;const shadowDimensions=type==='accelerate'?[8.6,6.2]:type==='isolate'?[7.4,4.5]:[7,5.7];const shadow=new THREE.Mesh(new THREE.PlaneGeometry(...shadowDimensions),new THREE.MeshBasicMaterial({color:'#020716',alphaMap:shadowMap,transparent:true,opacity:.27,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=model.ground-.05;scene.add(shadow);
 let disposed=false,paused=false,raf=0,width=0,height=0,hoverValue=0,targetHover=0,fromHover=0,start=0,duration=700,visible=true,ready=false,renderAge=0;
 const baseDirection=new THREE.Vector3(...model.direction).normalize(),look=new THREE.Vector3(),basePos=new THREE.Vector3();
 function fit(){if(disposed)return;const r=container.getBoundingClientRect();if(r.width<2||r.height<2)return;width=r.width;height=r.height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  model.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model.root),sphere=bounds.getBoundingSphere(new THREE.Sphere());look.copy(sphere.center);look.y+=.08;
  const fov=THREE.MathUtils.degToRad(camera.fov),angle=Math.min(fov,2*Math.atan(Math.tan(fov/2)*camera.aspect)),distance=sphere.radius/Math.sin(angle/2)/model.fill;
  basePos.copy(baseDirection).multiplyScalar(distance);draw(renderAge);
 }
 function draw(t=0){if(disposed||!width||!height)return;renderAge=t;model.root.rotation.set(model.rotation[0],model.rotation[1]+hoverValue*.12,model.rotation[2]);
  const pos=basePos.clone();pos.applyAxisAngle(new THREE.Vector3(0,1,0),hoverValue*.055);pos.multiplyScalar(1-hoverValue*.025);camera.position.copy(look).add(pos);camera.lookAt(look);renderer.render(scene,camera);
  if(!ready){ready=true;container.dataset.objectReady='true';onReady?.(api);}container.dataset.objectMotion=raf?'playing':'settled';
 }
 function tick(now){raf=0;if(disposed||paused||!visible||document.hidden)return;const p=clamp((now-start)/duration,0,1);hoverValue=lerp(fromHover,targetHover,ease(p));draw(now/1000);if(p<1)raf=requestAnimationFrame(tick);else container.dataset.objectMotion='settled';}
 function animateTo(value){targetHover=value;if(reducedMotion){hoverValue=value;draw(renderAge);return;}fromHover=hoverValue;start=performance.now();cancelAnimationFrame(raf);raf=0;if(!paused&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
 function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!paused&&visible){hoverValue=targetHover;draw(renderAge);}}
 const resize=new ResizeObserver(fit);resize.observe(container);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){fit();if(!paused)draw(renderAge);}else{cancelAnimationFrame(raf);raf=0;}},{threshold:0});observer.observe(container);
 function contextlost(event){event.preventDefault();cancelAnimationFrame(raf);raf=0;container.dataset.objectError='webgl-context-lost';canvas.style.visibility='hidden';}
 canvas.addEventListener('webglcontextlost',contextlost);document.addEventListener('visibilitychange',visibility);
 const api={setPaused(value){paused=!!value;if(paused){cancelAnimationFrame(raf);raf=0;}else{hoverValue=targetHover;fit();draw(renderAge);}},hover(value){animateTo(value?1:0);},render(time){if(Number.isFinite(time))renderAge=Math.max(0,time);fit();draw(renderAge);},exportPng(){draw(renderAge);return canvas.toDataURL('image/png');},getState(){return{version:'29.0.4',type,ready,paused,visible,width,height,hover:hoverValue,canvasAlpha:true};},dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',contextlost);const mats=new Set(),textures=new Set();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}}});for(const m of mats)m.dispose();for(const t of textures)t.dispose();env.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();mounted.delete(container);}};
 mounted.set(container,api);fit();return api;
}
if(typeof window!=='undefined')window.ARADSelectorObjects={mount,version:'29.0.4'};
export {isolate,accelerate,connect,mount};
