import * as THREE from 'three';

// Photographic hardware is kept faithful to the supplied alpha asset. Only the
// explanatory light field is spatial geometry; its labels describe concepts.
const mounted=new WeakMap();
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>ease((t-a)/(b-a));
const assetBase=new URL('.',document.currentScript?.src||location.href);

const CUTOUTS={isolate:[78,12,949,1536,1024,1536],accelerate:[25,246,1504,765,1536,1024],connect:[60,67,1195,1201,1254,1254]};
const PALETTE={isolate:'#70A7E6',accelerate:'#70A7E6',connect:'#70A7E6'};

function line(parent,points,color,opacity=1,width=.012){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const geo=new THREE.TubeGeometry(curve,Math.max(18,points.length*10),width,4,false);
 const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(geo,material);parent.add(mesh);return{mesh,material,curve};
}
function label(parent,text,w,pos){
 const anchor=new THREE.Object3D();anchor.position.set(...pos);anchor.userData.text=text;parent.add(anchor);return anchor;
}
function plate(parent,w,h,pos,color,opacity,{grid=true}={}){
 const group=new THREE.Group();group.position.set(...pos);parent.add(group);
 const material=new THREE.MeshBasicMaterial({color:'#0755A5',transparent:true,opacity:.30,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);group.add(mesh);
 const rimMaterial=new THREE.LineBasicMaterial({color:'#DBF8FF',transparent:true,opacity:.92,depthWrite:false,toneMapped:false});
 const rim=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-w/2,-h/2,.012],[w/2,-h/2,.012],[w/2,h/2,.012],[-w/2,h/2,.012]].map(p=>new THREE.Vector3(...p))),rimMaterial);group.add(rim);
 const backRim=rim.clone();backRim.material=rimMaterial.clone();backRim.material.color.set('#249EFF');backRim.material.opacity=.60;backRim.position.z=-.14;group.add(backRim);
 const edgePoints=[[-w/2,-h/2,.012],[w/2,-h/2,.012],[w/2,h/2,.012],[-w/2,h/2,.012]];
 for(let edge=0;edge<4;edge++){
  const a=edgePoints[edge],b=edgePoints[(edge+1)%4];
  line(group,[a,b],'#C9F4FF',.86,.012);line(group,[a,b],'#3BBFFF',.30,.035);line(group,[a,b],'#158AFF',.10,.09);line(group,[a,b],'#137DFF',.035,.18);
  line(group,[a,[a[0],a[1],-.14]],color,.38,.007);
 }
 const sides=new THREE.Mesh(new THREE.BoxGeometry(w,h,.14),new THREE.MeshBasicMaterial({color:'#0B4792',transparent:true,opacity:.11,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));sides.position.z=-.07;group.add(sides);
 if(grid){for(let y=-h/2+.36;y<h/2;y+=.68)line(group,[[-w/2,y,.016],[w/2,y,.016]],'#42B9F7',.095,.004);}
 const scan=new THREE.Mesh(new THREE.PlaneGeometry(w,.055),new THREE.MeshBasicMaterial({color:'#AEF4FF',transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));scan.position.z=.025;group.add(scan);
 return{group,material,rim,scan,height:h};
}
function buildHologram(root,type,selector){
 const group=new THREE.Group();root.add(group);
 const light=type==='accelerate'?'#3DBDFF':PALETTE[type];
 const text='#D5F3FF';
 const paths=[],dots=[],panels=[],labels=[],queueCells=[];
 if(type==='accelerate'){
  // Shared perspective across all plates. Three demands remain separated through
  // a logical-path layer and the queue layer; this is not a physical product BOM.
  group.rotation.set(-.90,.10,-.40);
  const top=new THREE.Group();group.add(top);
  for(let i=0;i<3;i++){
   const p=plate(top,2.02,1.45,[(i-1)*2.22,2.35,.38+i*.015],light,selector?.15:.14);panels.push(p);
   labels.push(label(top,['TRAINING','INFERENCE','DATA'][i],1.85,[(i-1)*2.22,2.35,.43],{color:text,small:true}));
  }
  const logical=plate(group,6.65,2.65,[0,.45,-.40],light,selector?.12:.14);panels.push(logical);
  labels.push(label(group,'LOGICAL PATHS',3.7,[0,.46,-.34],{color:text}));
  const queues=plate(group,6.65,2.65,[0,-1.52,-.83],light,selector?.10:.12);panels.push(queues);
  for(let lane=0;lane<3;lane++){
   const x=(lane-1)*2.22;
   for(let j=0;j<5;j++){const cell=plate(group,.22,.31,[x-.58+j*.29,-1.55,-.79],light,.32,{grid:false});cell.lane=lane;cell.slot=j;queueCells.push(cell);}
   for(let f=0;f<5;f++){
    const dx=(f-2)*.055;
    const p=line(group,[[x+dx,1.625,.38],[x+dx,1.29,-.10],[x+dx,.85,-.33],[x+dx,.1,-.35],[x+dx,-.42,-.55],[x+dx,-1.04,-.76]],light,selector?.38:.57,.009);
    p.lane=lane;paths.push(p);
   }
  }
  labels.push(label(group,'HARDWARE QUEUES',2.45,[-1.8,-2.22,-.72],{color:text,small:true}));
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
 let disposed=false,paused=false,visible=true,ready=false,width=0,height=0,raf=0,last=0,time=0,runUntil=4.4,mode=0,progress=0,hover=0,hoverTarget=0;
 let assetAspect=1,hardware,texture,bounds={x:0,y:0,w:12,h:10};
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 const camera=new THREE.OrthographicCamera(-6,6,5,-5,.1,100);camera.position.set(0,0,35);camera.lookAt(0,0,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio||1,2),innerWidth<761?3:2));renderer.setClearColor(selector?'#000000':'#000208',selector?0:1);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;visibility:hidden';container.append(canvas);
 const holo=buildHologram(root,type,selector);
 const labelLayer=document.createElement('div');labelLayer.className='arad-hologram-labels';labelLayer.setAttribute('aria-hidden','true');labelLayer.style.cssText='position:absolute;inset:0;z-index:2;pointer-events:none;visibility:hidden';container.append(labelLayer);
 const labelSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');labelSvg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible';labelLayer.append(labelSvg);
 const labelMeasure=document.createElement('canvas').getContext('2d');
 const labelItems=holo.labels.map(anchor=>{const el=document.createElement('span');el.className='arad-hologram-label';el.textContent=anchor.userData.text;el.style.cssText='position:absolute;display:block;white-space:nowrap;box-sizing:border-box;border:1px solid rgba(104,209,255,.28);background:rgba(2,25,51,.76);color:#D9F5FF;line-height:1;padding:4px;letter-spacing:.02em;font-family:Arial,Helvetica,sans-serif;font-weight:500;transform:translate(-50%,-50%)';labelLayer.append(el);const leader=document.createElementNS('http://www.w3.org/2000/svg','line');leader.setAttribute('stroke','#5BCDFB');leader.setAttribute('stroke-width','.75');leader.setAttribute('opacity','.5');labelSvg.append(leader);return{anchor,el,leader,text:anchor.userData.text};});

 const hardwareMaterial=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
 hardware=new THREE.Mesh(new THREE.PlaneGeometry(1,1),hardwareMaterial);hardware.renderOrder=100;root.add(hardware);
 const isLight=selector&&type==='accelerate';
 let layout={hardware:{x:0,y:0,w:8,h:8},holo:{x:0,y:0,s:1}};
 const onReady=options.onReady;
 let resolveReady;const readyPromise=new Promise(resolve=>resolveReady=resolve);
 const pictureUrl=new URL(`assets/photoreal/${type}.png?v=37`,assetBase).href;
 new THREE.TextureLoader().load(pictureUrl,map=>{
  if(disposed){map.dispose();return;}
  texture=map;map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  const [left,top,right,bottom,iw,ih]=CUTOUTS[type];map.offset.set(left/iw,(ih-bottom)/ih);map.repeat.set((right-left)/iw,(bottom-top)/ih);assetAspect=(right-left)/(bottom-top);hardwareMaterial.map=map;hardwareMaterial.needsUpdate=true;fit();draw(time);schedule();resolveReady(true);
 },undefined,()=>{if(disposed)return;container.dataset.objectError='asset-load';canvas.style.visibility='hidden';resolveReady(false);});

 function compose(){
  const aspect=width/Math.max(1,height);
  if(type==='accelerate'){
   if(!selector&&aspect>2.2){
    const w=9.5,h=w/assetAspect;layout={hardware:{x:4.15,y:-.5,w,h},holo:{x:-3.3,y:.75,s:1.10}};
    bounds={x:.3,y:.65,w:19.0,h:Math.max(9.3,h+1.2)};
   }else{
    const w=9.2,h=w/assetAspect;layout={hardware:{x:1.55,y:-1.85,w,h},holo:{x:-1.35,y:1.95,s:1.0}};
    bounds={x:.2,y:.55,w:12.7,h:Math.max(11.1,h+4.2)};
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
  renderer.setSize(width,height,false);compose();const aspect=width/height;
  const viewH=Math.max(bounds.h,bounds.w/aspect),viewW=viewH*aspect;
  camera.left=bounds.x-viewW/2;camera.right=bounds.x+viewW/2;camera.top=bounds.y+viewH/2;camera.bottom=bounds.y-viewH/2;camera.updateProjectionMatrix();draw(time);
 }
 function draw(t=0){
  if(disposed||!width||!height||!texture)return;time=Math.max(0,Number(t)||0);
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
   const panel=holo.panels[i];const z=i<3?.38+i*.015:i===3?-.40:-.83;
   panel.group.position.z=z-(i>=3?smooth(.14,.54,p)*.12*(i-2):0);
   panel.material.color.set(isLight?'#06366D':'#0D5799');panel.material.opacity=(isLight?.52:.25)*(1+hover*.10);
   const scanP=((reduced?1.7:time)*.13+i*.21)%1;panel.scan.position.y=mix(-panel.height/2,panel.height/2,scanP);panel.scan.material.opacity=(reduced?.10:.36*Math.sin(scanP*Math.PI))*(1-release*.6);
  }
  for(const cell of holo.queueCells){
   const allocated=(cell.lane===mode?1:.24)*(cell.slot<2?1:.55);
   const active=mix(allocated,.88,parallel)*(1-release*.82);
   cell.material.opacity=.10+active*.35;cell.rim.material.opacity=.22+active*.55;
  }
  renderer.render(scene,camera);updateLabels();
  if(!ready){ready=true;canvas.style.visibility='visible';labelLayer.style.visibility='visible';container.dataset.objectReady='true';delete container.dataset.objectError;onReady?.(api);}
  container.dataset.objectProgress=progress.toFixed(3);container.dataset.objectMode=String(mode);container.dataset.objectMotion=paused?'paused':raf?'playing':'settled';container.dataset.objectAnimating=String(!paused&&!!raf);
 }
 function updateLabels(){
  if(!labelItems.length)return;
  const compact=width<320,font=compact?12:selector?clamp(width*.026,12,15):clamp(width*.014,13,18);
  labelMeasure.font=`500 ${font}px Arial`;
  for(const item of labelItems){const p=item.anchor.getWorldPosition(new THREE.Vector3()).project(camera);item.ax=(p.x+1)*width/2;item.ay=(1-p.y)*height/2;item.x=item.ax;item.y=item.ay;item.font=font;item.w=labelMeasure.measureText(item.text).width+(item.text.length-1)*font*.02+10;item.h=font+10;}
  const top=labelItems.slice(0,3),gap=compact?3:6,total=top.reduce((sum,q)=>sum+q.w,0)+gap*2;
  let start=compact?(width-total)/2:clamp(top.reduce((sum,q)=>sum+q.x,0)/3-total/2,4,width-total-4);
  for(const item of top){item.x=start+item.w/2;start+=item.w+gap;if(compact)item.y=Math.max(item.h/2+4,height*.12);}
  if(compact){labelItems[3].x=width*.46;labelItems[3].y=height*.36;labelItems[4].x=width*.46;labelItems[4].y=height*.52;}
  for(const item of labelItems){item.x=clamp(item.x,item.w/2+2,width-item.w/2-2);item.y=clamp(item.y,item.h/2+2,height-item.h/2-2);item.el.style.fontSize=font+'px';item.el.style.left=item.x.toFixed(2)+'px';item.el.style.top=item.y.toFixed(2)+'px';item.leader.setAttribute('x1',item.x);item.leader.setAttribute('y1',item.y+item.h/2);item.leader.setAttribute('x2',item.ax);item.leader.setAttribute('y2',item.ay);item.leader.style.display=Math.hypot(item.x-item.ax,item.y-item.ay)>item.h*.65?'':'none';}
 }
 function exportComposite(){
  draw(time);const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const c=out.getContext('2d'),ratio=out.width/width;c.drawImage(canvas,0,0);c.scale(ratio,ratio);
  for(const item of labelItems){if(item.leader.style.display!=='none'){c.strokeStyle='rgba(91,205,251,.5)';c.lineWidth=.75;c.beginPath();c.moveTo(item.x,item.y+item.h/2);c.lineTo(item.ax,item.ay);c.stroke();}}
  for(const item of labelItems){const x=item.x-item.w/2,y=item.y-item.h/2;c.fillStyle='rgba(2,25,51,.76)';c.fillRect(x,y,item.w,item.h);c.strokeStyle='rgba(104,209,255,.28)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,item.w-1,item.h-1);c.font=`500 ${item.font}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#D9F5FF';if('letterSpacing'in c)c.letterSpacing=(item.font*.02)+'px';c.fillText(item.text,item.x,item.y+.4);}
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
 function lost(e){e.preventDefault();stop();container.dataset.objectError='webgl-context-lost';canvas.style.visibility='hidden';labelLayer.style.visibility='hidden';}
 canvas.addEventListener('webglcontextlost',lost);
 const api={
  ready:readyPromise,
  setPaused(value){paused=!!value;if(paused)stop();else{fit();schedule();}},
  hover(value){hoverTarget=value?1:0;runUntil=Math.max(time+.8,runUntil);if(reduced){hover=hoverTarget;draw(time);}else schedule();},
  setProgress(value){progress=clamp(Number(value)||0);draw(time);},
  setMode(value){mode=clamp(Math.round(Number(value)||0),0,2);runUntil=time+2.0;draw(time);schedule();},
  replay(){time=0;runUntil=4.4;draw(0);schedule();},
  render(value){if(Number.isFinite(value))time=Math.max(0,value);fit();draw(time);},
  exportPng(){return exportComposite();},
  getState(){return{version:'37.0.0',type,selector,ready,paused,visible,width,height,progress,mode,hover,canvasAlpha:selector,hardware:'photographic-cutout',concept:'luminous-hologram',pixelRatio:renderer.getPixelRatio(),drawingBuffer:{width:canvas.width,height:canvas.height},labels:labelItems.map(({text,font,x,y,w,h})=>({text,fontSize:font,x,y,width:w,height:h,visible:ready}))};},
  getAnchors(){const x=type==='accelerate'?layout.holo.x:layout.hardware.x;const project=(xx,yy)=>{const p=new THREE.Vector3(xx,yy,2).project(camera);return{x:(p.x+1)/2,y:(1-p.y)/2,visible:Math.abs(p.x)<1&&Math.abs(p.y)<1};};return{type,mode,start:project(x-2.2+mode*2.2,-1.8),end:project(x-2.2+mode*2.2,2.5)};},
  dispose(){if(disposed)return;disposed=true;resolveReady(false);stop();resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',vis);canvas.removeEventListener('webglcontextlost',lost);const mats=new Set(),maps=new Set();scene.traverse(o=>{o.geometry?.dispose();for(const mat of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){mats.add(mat);if(mat.map)maps.add(mat.map);}});mats.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());renderer.dispose();canvas.remove();labelLayer.remove();delete container.dataset.objectReady;delete container.dataset.objectAnimating;mounted.delete(container);}
 };
 mounted.set(container,api);fit();return api;
}
