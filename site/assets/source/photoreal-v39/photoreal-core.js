import * as THREE from 'three';

// Photographic hardware is kept faithful to the supplied alpha asset. Only the
// explanatory light field is spatial geometry; its labels describe concepts.
const mounted=new WeakMap();
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>ease((t-a)/(b-a));
const assetBase=new URL('.',document.currentScript?.src||location.href);

// Alpha > 8 bounds plus four pixels of clear padding preserve antialiased edges.
const CUTOUTS={isolate:[103,21,1254,2040,1360,2048],accelerate:[33,335,2015,1010,2048,1360],connect:[86,93,1964,1955,2048,2048]};
const PALETTE={isolate:'#70A7E6',accelerate:'#70A7E6',connect:'#70A7E6'};

function line(parent,points,color,opacity=1,width=.012){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const geo=new THREE.TubeGeometry(curve,Math.max(18,points.length*10),width,4,false);
 const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(geo,material);parent.add(mesh);return{mesh,material,curve};
}
function label(surface,text,w,h,pos){
 const anchor=new THREE.Object3D();anchor.position.set(...pos);anchor.userData={text,width:w,height:h,surface};surface.group.add(anchor);return anchor;
}
function plate(parent,w,h,pos,color,opacity,{grid=true}={}){
 const group=new THREE.Group();group.position.set(...pos);parent.add(group);
 const material=new THREE.MeshBasicMaterial({color:'#0755A5',transparent:true,opacity:.30,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);group.add(mesh);
 const rimMaterial=new THREE.LineBasicMaterial({color:'#DBF8FF',transparent:true,opacity:.92,depthWrite:false,toneMapped:false});
 const rim=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-w/2,-h/2,.012],[w/2,-h/2,.012],[w/2,h/2,.012],[-w/2,h/2,.012]].map(p=>new THREE.Vector3(...p))),rimMaterial);group.add(rim);
 const backRim=rim.clone();backRim.material=rimMaterial.clone();backRim.material.color.set('#249EFF');backRim.material.opacity=.60;backRim.position.z=-.20;group.add(backRim);
 const edgePoints=[[-w/2,-h/2,.012],[w/2,-h/2,.012],[w/2,h/2,.012],[-w/2,h/2,.012]];
 for(let edge=0;edge<4;edge++){
  const a=edgePoints[edge],b=edgePoints[(edge+1)%4];
  line(group,[a,b],'#E1FAFF',.96,.014);line(group,[a,b],'#3BBFFF',.40,.04);line(group,[a,b],'#158AFF',.16,.12);line(group,[a,b],'#137DFF',.055,.26);
  line(group,[a,[a[0],a[1],-.20]],color,.38,.007);
 }
 const sides=new THREE.Mesh(new THREE.BoxGeometry(w,h,.20),new THREE.MeshBasicMaterial({color:'#0B4792',transparent:true,opacity:.11,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));sides.position.z=-.10;group.add(sides);
 if(grid){for(let y=-h/2+.36;y<h/2;y+=.68)line(group,[[-w/2,y,.016],[w/2,y,.016]],'#42B9F7',.095,.004);}
 const scan=new THREE.Mesh(new THREE.PlaneGeometry(w,.055),new THREE.MeshBasicMaterial({color:'#AEF4FF',transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));scan.position.z=.025;group.add(scan);
 return{group,material,rim,scan,width:w,height:h};
}
function buildHologram(root,type,selector){
 const group=new THREE.Group();root.add(group);
 const light=type==='accelerate'?'#3DBDFF':PALETTE[type];
 const text='#D5F3FF';
 const paths=[],dots=[],panels=[],labels=[],queueCells=[];
 if(type==='accelerate'){
  // Shared perspective across all plates. Three demands remain separated through
  // a logical-path layer and the queue layer; this is not a physical product BOM.
  group.rotation.set(-.72,.10,-.32);
  const top=new THREE.Group();group.add(top);
  for(let i=0;i<3;i++){
   const p=plate(top,3.2,1.8,[(i-1)*3.35,2.5,.38+i*.015],light,selector?.15:.14);panels.push(p);
   labels.push(label(p,['TRAINING','INFERENCE','DATA'][i],2.94,.94,[0,0,.04]));
  }
  const logical=plate(group,8.9,3.05,[0,.45,-.55],light,selector?.12:.14);panels.push(logical);
  labels.push(label(logical,'LOGICAL\nPATHS',3.65,1.65,[0,0,.04]));
  const queues=plate(group,8.9,3.05,[0,-1.52,-1.25],light,selector?.10:.12);panels.push(queues);
  for(let lane=0;lane<3;lane++){
   const x=(lane-1)*3.35;
   for(let j=0;j<5;j++){const cell=plate(queues.group,.22,.31,[x-.58+j*.29,-.03,.04],light,.32,{grid:false});cell.lane=lane;cell.slot=j;queueCells.push(cell);}
   for(let f=0;f<5;f++){
    const dx=(f-2)*.055;
    const p=line(group,[[x+dx,1.60,.38],[x+dx,1.25,-.05],[x+dx,.85,-.48],[x+dx,.1,-.51],[x+dx,-.42,-.82],[x+dx,-1.04,-1.19]],light,selector?.38:.57,.009);
    p.lane=lane;paths.push(p);
   }
  }
  labels.push(label(queues,'HARDWARE\nQUEUES',3.35,1.1,[-2.7,-.85,.04]));
 }else if(type==='isolate'){
  // Three quiet optical boundaries behind the actual equipment; no floating lock icons.
  for(let lane=0;lane<3;lane++)for(let j=0;j<14;j++){
   const d=j/13, x=-2.8+lane*.62+d*.24;
   const p=line(group,[[x,-3.2,-.5],[x-.55,-1.8,-.4],[x+.05,.25,-.5],[x+.12,2.05,-.6],[x+.70,3.0,-.7]],light,selector?.10:.31,.008+j*.00015);p.lane=lane;paths.push(p);
  }
 }else{
  // A few separated links show the field-to-management relationship behind the group.
  for(let lane=0;lane<3;lane++)for(let j=0;j<8;j++){
   const x=(lane-1)*1.55+(j-3.5)*.035;
   const p=line(group,[[x,-2.9,-.65],[x,-1.15,-.65],[x+.45,.05,-.75],[x*.72,1.0,-.95],[x*.70,2.2,-1.0]],light,selector?.12:.34,.008);p.lane=lane;paths.push(p);
  }
 }
 for(let i=0;i<paths.length;i+=type==='accelerate'?2:6){
  const geometry=new THREE.SphereGeometry(type==='accelerate'?.023:.017,7,5);
  const material=new THREE.MeshBasicMaterial({color:light,transparent:true,opacity:.8,depthWrite:false,toneMapped:false});
  const mesh=new THREE.Mesh(geometry,material);group.add(mesh);dots.push({mesh,path:paths[i],phase:(i*.137)%1});
 }
 
 return{group,paths,dots,panels,labels,queueCells};
}

export function mount(container,options={}){
 if(mounted.has(container))return mounted.get(container);
 delete container.dataset.objectReady;delete container.dataset.objectError;
 const type=['isolate','accelerate','connect'].includes(options.type)?options.type:'isolate';
 const selector=!!options.selector,reduced=!!options.reducedMotion;
 let disposed=false,paused=false,visible=true,ready=false,width=0,height=0,raf=0,resizePaint=0,last=0,time=0,runUntil=4.4,mode=0,progress=0,hover=0,hoverTarget=0;
 let assetAspect=1,hardware,texture,bounds={x:0,y:0,w:12,h:10};
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 const camera=new THREE.OrthographicCamera(-6,6,5,-5,.1,100);camera.position.set(0,0,35);camera.lookAt(0,0,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio||1,2),innerWidth<761?3:2));renderer.setClearColor(selector?'#000000':'#000208',selector?0:1);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;visibility:hidden';container.append(canvas);
 const holo=buildHologram(root,type,selector);
 const labelLayer=document.createElement('div');labelLayer.className='arad-hologram-labels';labelLayer.setAttribute('aria-hidden','true');labelLayer.style.cssText='position:absolute;inset:0;z-index:2;pointer-events:none;visibility:hidden';container.append(labelLayer);
 const labelMeasure=document.createElement('canvas').getContext('2d');
 const labelItems=holo.labels.map(anchor=>{const el=document.createElement('span');el.className='arad-hologram-label';el.textContent=anchor.userData.text;el.style.cssText='position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;white-space:pre;box-sizing:border-box;color:#E5F8FF;line-height:1.05;text-align:center;letter-spacing:.01em;font-family:Arial,Helvetica,sans-serif;font-weight:700;transform-origin:0 0;backface-visibility:hidden';labelLayer.append(el);return{anchor,el,text:anchor.userData.text.replace(/\n/g,' '),lines:anchor.userData.text.split('\n')};});

 const hardwareMaterial=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
 hardware=new THREE.Mesh(new THREE.PlaneGeometry(1,1),hardwareMaterial);hardware.renderOrder=100;root.add(hardware);
 const isLight=selector&&type==='accelerate';
 let layout={hardware:{x:0,y:0,w:8,h:8},holo:{x:0,y:0,s:1}};
 const onReady=options.onReady;
 let resolveReady;const readyPromise=new Promise(resolve=>resolveReady=resolve);
 const pictureUrl=new URL(`assets/photoreal/${type}.png?v=39`,assetBase).href;
 new THREE.TextureLoader().load(pictureUrl,map=>{
  if(disposed){map.dispose();return;}
  texture=map;map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  const [left,top,right,bottom,iw,ih]=CUTOUTS[type];map.offset.set(left/iw,(ih-bottom)/ih);map.repeat.set((right-left)/iw,(bottom-top)/ih);assetAspect=(right-left)/(bottom-top);hardwareMaterial.map=map;hardwareMaterial.needsUpdate=true;fit();draw(time);schedule();resolveReady(true);
 },undefined,()=>{if(disposed)return;container.dataset.objectError='asset-load';canvas.style.visibility='hidden';resolveReady(false);});

 function compose(){
  const aspect=width/Math.max(1,height);
  if(type==='accelerate'){
   if(!selector&&aspect>2.2){
    const w=11.75,h=w/assetAspect;layout={hardware:{x:5.14,y:-.5,w,h},holo:{x:-4.15,y:.75,s:1.10}};
    bounds={x:.3,y:.85,w:19.0,h:Math.max(11.5,h+1.2)};
   }else{
    const w=9.2,h=w/assetAspect;layout={hardware:{x:1.55,y:-1.85,w,h},holo:{x:-.65,y:1.95,s:1.0}};
    bounds={x:.2,y:1.4,w:12.7,h:Math.max(11.1,h+4.2)};
   }
  }else if(type==='isolate'){
   const h=10.3,w=h*assetAspect;layout={hardware:{x:.30,y:0,w,h},holo:{x:1.2,y:0,s:1.25}};bounds={x:0,y:0,w:Math.max(w+1.0,7.0),h:11.0};
  }else{
   const w=11.0,h=w/assetAspect;layout={hardware:{x:0,y:0,w,h},holo:{x:0,y:0,s:1.25}};bounds={x:0,y:0,w:11.9,h:h+1.0};
  }
  hardware.scale.set(layout.hardware.w,layout.hardware.h,1);hardware.position.set(layout.hardware.x,layout.hardware.y,5);
  holo.group.position.set(layout.holo.x,layout.holo.y,0);holo.group.scale.setScalar(layout.holo.s);
 }
 function fit(){
  if(disposed)return;const r=container.getBoundingClientRect();if(r.width<2||r.height<2)return;width=container.clientWidth||r.width;height=container.clientHeight||r.height;
  const needsResize=canvas.width!==Math.floor(width*renderer.getPixelRatio())||canvas.height!==Math.floor(height*renderer.getPixelRatio());
  if(needsResize)renderer.setSize(width,height,false);compose();const aspect=width/height;
  const viewH=Math.max(bounds.h,bounds.w/aspect),viewW=viewH*aspect;
  camera.left=bounds.x-viewW/2;camera.right=bounds.x+viewW/2;camera.top=bounds.y+viewH/2;camera.bottom=bounds.y-viewH/2;camera.updateProjectionMatrix();draw(time);
  // Safari can composite a stale WebGL layer when a clipped panel changes size.
  // Repaint the identical frame after layout; this does not advance animation.
  if(needsResize){cancelAnimationFrame(resizePaint);resizePaint=requestAnimationFrame(()=>{resizePaint=0;draw(time);});}
 }
 function draw(t=0){
  if(disposed||!width||!height||!texture||renderer.getContext().isContextLost())return;time=Math.max(0,Number(t)||0);
  const p=progress;const settled=smooth(.1,1.7,time);const breathing=reduced?0:Math.sin(Math.min(time,4.4)*.7)*.025;
  hardware.position.set(layout.hardware.x+hover*.055,layout.hardware.y+hover*.045+breathing,5);
  hardware.scale.set(layout.hardware.w*(1+hover*.012),layout.hardware.h*(1+hover*.012),1);
  // The photograph itself is never rotated: camera motion belongs to the hologram.
  holo.group.position.set(layout.holo.x-hover*.08,layout.holo.y+smooth(.10,.5,p)*.20,0);
  holo.group.rotation.y=type==='accelerate'?.10+hover*.035+smooth(.12,.68,p)*.04:0;
  const release=smooth(.72,.92,p),parallel=smooth(.32,.57,p);
  for(const path of holo.paths){
   const lane=path.lane??0;let weight=lane===mode?1:.40;
   if(p>.10)weight=mix(weight,mix(.64,1,parallel)*(1-release*.52),smooth(.10,.3,p));
   const initial=selector?(type==='accelerate'?.62:.55):mix(.65,1,settled);
   const base=type==='accelerate'?(isLight?.76:.82):(selector?.11:.35);
   path.material.opacity=base*weight*initial*(1+hover*.25);
  }
  for(const dot of holo.dots){
   const path=dot.path;const along=((reduced?2.2:time)*.18+dot.phase+p*.6)%1;
   dot.mesh.position.copy(path.curve.getPoint(along));dot.mesh.material.opacity=(selector?.55:.85)*(1-release*.75)*(path.lane===mode?1:.45);
  }
  for(let i=0;i<holo.panels.length;i++){
   const panel=holo.panels[i];const z=i<3?.38+i*.015:i===3?-.55:-1.25;
   panel.group.position.z=z-(i>=3?smooth(.14,.54,p)*.12*(i-2):0);
   panel.material.color.set(isLight?'#06366D':'#0D5799');panel.material.opacity=(isLight?.58:.28)*(1+hover*.10);
   const scanP=((reduced?1.7:time)*.13+i*.21)%1;panel.scan.position.y=mix(-panel.height/2,panel.height/2,scanP);panel.scan.material.opacity=(reduced?.10:.36*Math.sin(scanP*Math.PI))*(1-release*.6);
  }
  for(const cell of holo.queueCells){
   const allocated=(cell.lane===mode?1:.24)*(cell.slot<2?1:.55);
   const active=mix(allocated,.88,parallel)*(1-release*.82);
   cell.material.opacity=.10+active*.35;cell.rim.material.opacity=.22+active*.55;
  }
  renderer.render(scene,camera);updateLabels();
  const becameReady=!ready;ready=true;canvas.style.visibility='visible';canvas.style.opacity='1';labelLayer.style.visibility='visible';labelLayer.style.opacity='1';container.dataset.objectReady='true';delete container.dataset.objectError;if(becameReady)onReady?.(api);
  container.dataset.objectProgress=progress.toFixed(3);container.dataset.objectMode=String(mode);container.dataset.objectMotion=paused?'paused':raf?'playing':'settled';container.dataset.objectAnimating=String(!paused&&!!raf);
 }
 function projectPoint(parent,x,y,z=.04){const point=parent.localToWorld(new THREE.Vector3(x,y,z)).project(camera);return{x:(point.x+1)*width/2,y:(1-point.y)*height/2};}
 function polygonContains(poly,point){let sign=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],cross=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);if(Math.abs(cross)<.001)continue;const next=Math.sign(cross);if(sign&&next!==sign)return false;sign=next;}return true;}
 function updateLabels(){
  for(const item of labelItems){
   const {width:w,height:h,surface}=item.anchor.userData,localW=512,localH=localW*h/w;
   const corners=[[-w/2,h/2],[w/2,h/2],[w/2,-h/2],[-w/2,-h/2]].map(([x,y])=>projectPoint(item.anchor,x,y,0));
   const sw=surface.width,sh=surface.height;item.surfaceCorners=[[-sw/2,sh/2],[sw/2,sh/2],[sw/2,-sh/2],[-sw/2,-sh/2]].map(([x,y])=>projectPoint(surface.group,x,y));
   const [tl,tr,,bl]=corners;item.matrix=[(tr.x-tl.x)/localW,(tr.y-tl.y)/localW,(bl.x-tl.x)/localH,(bl.y-tl.y)/localH,tl.x,tl.y];
   labelMeasure.font='700 64px Arial';const longest=Math.max(...(item.lines.length===1?['INFERENCE']:item.lines).map(text=>labelMeasure.measureText(text).width+(text.length-1)*64*.01));
   item.font=Math.min(localH/(item.lines.length*1.05)*.84,64*localW/longest*.94);item.localW=localW;item.localH=localH;item.corners=corners;item.insideSurface=corners.every(q=>polygonContains(item.surfaceCorners,q));
   const xs=corners.map(q=>q.x),ys=corners.map(q=>q.y);item.x=(Math.min(...xs)+Math.max(...xs))/2;item.y=(Math.min(...ys)+Math.max(...ys))/2;item.w=Math.max(...xs)-Math.min(...xs);item.h=Math.max(...ys)-Math.min(...ys);
   item.el.style.width=localW+'px';item.el.style.height=localH+'px';item.el.style.fontSize=item.font+'px';item.el.style.transform='matrix('+item.matrix.join(',')+')';
  }
 }
 function exportComposite(){
  draw(time);if(!ready||!width)return canvas.toDataURL('image/png');const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const c=out.getContext('2d'),ratio=out.width/width;c.drawImage(canvas,0,0);c.scale(ratio,ratio);
  for(const item of labelItems){c.save();c.transform(...item.matrix);c.font=`700 ${item.font}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#E5F8FF';if('letterSpacing'in c)c.letterSpacing=(item.font*.01)+'px';const step=item.font*1.05;item.lines.forEach((text,i)=>c.fillText(text,item.localW/2,item.localH/2+(i-(item.lines.length-1)/2)*step));c.restore();}
  return out.toDataURL('image/png');
 }
 function tick(stamp){raf=0;if(disposed||paused||!visible||document.hidden)return;const dt=last?Math.min(.05,(stamp-last)/1000):.016;last=stamp;
  hover=mix(hover,hoverTarget,1-Math.exp(-dt*8));if(Math.abs(hover-hoverTarget)<.001)hover=hoverTarget;
  time=Math.min(runUntil,time+dt);draw(time);
  if(time<runUntil||hover!==hoverTarget)raf=requestAnimationFrame(tick);else{last=0;container.dataset.objectMotion='settled';container.dataset.objectAnimating='false';}
 }
 function schedule(){if(!reduced&&!paused&&visible&&!document.hidden&&!disposed&&!raf){last=0;raf=requestAnimationFrame(tick);}}
 function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
 const resize=new ResizeObserver(fit);resize.observe(container);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){fit();schedule();}else stop();},{threshold:0});observer.observe(container);
 function vis(){if(document.hidden)stop();else{fit();schedule();}}
 document.addEventListener('visibilitychange',vis);
 function lost(e){e.preventDefault();stop();cancelAnimationFrame(resizePaint);resizePaint=0;ready=false;delete container.dataset.objectReady;container.dataset.objectError='webgl-context-lost';canvas.style.visibility='hidden';canvas.style.opacity='0';labelLayer.style.visibility='hidden';labelLayer.style.opacity='0';}
 function restored(){if(disposed)return;ready=false;if(texture)texture.needsUpdate=true;hardwareMaterial.needsUpdate=true;delete container.dataset.objectError;fit();draw(time);schedule();}
 canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
 const api={
  ready:readyPromise,
  setPaused(value){paused=!!value;if(paused)stop();else{fit();schedule();}},
  hover(value){hoverTarget=value?1:0;runUntil=Math.max(time+.8,runUntil);if(reduced){hover=hoverTarget;draw(time);}else schedule();},
  setProgress(value){progress=clamp(Number(value)||0);draw(time);},
  setMode(value){mode=clamp(Math.round(Number(value)||0),0,2);runUntil=time+2.0;draw(time);schedule();},
  replay(){time=0;runUntil=4.4;draw(0);schedule();},
  render(value){if(Number.isFinite(value))time=Math.max(0,value);fit();draw(time);},
  exportPng(){return exportComposite();},
  getState(){return{version:'39.0.0',type,selector,ready,paused,visible,width,height,progress,mode,hover,canvasAlpha:selector,hardware:'photographic-cutout',concept:'luminous-hologram',contextLost:renderer.getContext().isContextLost(),pixelRatio:renderer.getPixelRatio(),drawingBuffer:{width:canvas.width,height:canvas.height},labels:labelItems.map(({text,font,x,y,w,h,matrix,corners,surfaceCorners,insideSurface})=>({text,fontSize:matrix?font*Math.hypot(matrix[0],matrix[1]):0,x,y,width:w,height:h,corners,surfaceCorners,insideSurface,visible:ready}))};},
  getAnchors(){const x=type==='accelerate'?layout.holo.x:layout.hardware.x;const project=(xx,yy)=>{const p=new THREE.Vector3(xx,yy,2).project(camera);return{x:(p.x+1)/2,y:(1-p.y)/2,visible:Math.abs(p.x)<1&&Math.abs(p.y)<1};};return{type,mode,start:project(x-2.2+mode*2.2,-1.8),end:project(x-2.2+mode*2.2,2.5)};},
  dispose(){if(disposed)return;disposed=true;resolveReady(false);stop();cancelAnimationFrame(resizePaint);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',vis);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);const mats=new Set(),maps=new Set();scene.traverse(o=>{o.geometry?.dispose();for(const mat of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){mats.add(mat);if(mat.map)maps.add(mat.map);}});mats.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());renderer.dispose();canvas.remove();labelLayer.remove();delete container.dataset.objectReady;delete container.dataset.objectAnimating;mounted.delete(container);}
 };
 mounted.set(container,api);fit();return api;
}
