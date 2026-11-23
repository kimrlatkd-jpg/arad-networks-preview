'use strict';
(() => {
  const key='arad-business-arrival-v30';
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const ease='cubic-bezier(.65,0,.35,1)';
  let departure=null, arrivalAnimations=[];
  const safeRemove=()=>{try{sessionStorage.removeItem(key)}catch{}};
  const settled=a=>a.finished.catch(()=>{});
  function cleanDeparture({restoreFocus=false}={}) {
    const state=departure;if(!state)return;
    departure=null;
    clearTimeout(state.recovery);
    state.animations.forEach(a=>a.cancel());state.plane.remove();
    state.panel.classList.remove('arad-departure-selected');
    document.body.classList.remove('arad-departing');
    safeRemove();
    if(restoreFocus)state.panel.focus({preventScroll:true});
  }
  function polygon(panel) {
    const r=panel.getBoundingClientRect(),w=innerWidth,h=innerHeight;
    const seam=parseFloat(getComputedStyle(panel).getPropertyValue('--seam'))*(innerWidth>760?w/100:1);
    let p;
    if(w>760){
      const first=panel.classList.contains('region-isolate'),last=panel.classList.contains('region-connect');
      p=[[r.left+(first?0:seam),0],[r.right,0],[r.right-(last?0:seam),h],[r.left,h]];
    }else{
      const first=panel.classList.contains('region-isolate'),last=panel.classList.contains('region-connect');
      p=[[0,r.top+(first?0:seam)],[w,r.top],[w,r.bottom-(last?0:seam)],[0,r.bottom]];
    }
    return p.map(([x,y])=>[100*x/w,100*y/h]);
  }
  const clip=p=>'polygon('+p.map(([x,y])=>`${x}% ${y}%`).join(',')+')';
  function depart(panel,url,event) {
    if(departure){event.preventDefault();return;}
    const business=panel.querySelector('[data-selector-object]')?.dataset.selectorObject;
    if(motion.matches||!business)return;
    try{sessionStorage.setItem(key,JSON.stringify({path:url.pathname,business,at:Date.now()}));}
    catch{return;} // Native navigation if continuity cannot be carried over.
    event.preventDefault();
    const start=polygon(panel),end=[[0,0],[100,0],[100,100],[0,100]];
    const middle=start.map((p,i)=>p.map((v,j)=>v+(end[i][j]-v)*.62));
    const plane=document.createElement('div');plane.className='arad-departure-plane';plane.setAttribute('aria-hidden','true');
    const color=getComputedStyle(panel).backgroundColor;
    plane.style.background=color;plane.style.clipPath=clip(start);
    panel.parentElement.append(plane);panel.classList.add('arad-departure-selected');
    document.body.classList.add('arad-departing');
    const animations=[];
    const state=departure={panel,plane,animations,url:url.href};
    animations.push(plane.animate([
      {clipPath:clip(start),backgroundColor:color,offset:0},
      {clipPath:clip(middle),backgroundColor:color,offset:.55},
      {clipPath:clip(end),backgroundColor:'#000208',offset:1}
    ],{duration:720,easing:ease,fill:'both'}));
    // Keep the model's proportions. Only the underlying plane expands.
    animations.push(panel.animate([{opacity:1},{opacity:0}],{duration:380,delay:170,easing:'cubic-bezier(.4,0,1,1)',fill:'both'}));
    const object=panel.querySelector('.selector-object');
    if(object)animations.push(object.animate([{transform:'translate3d(0,0,0) scale(1)'},{transform:'translate3d(20px,0,0) scale(1.055)'}],{duration:600,easing:ease,fill:'both'}));
    for(const node of panel.parentElement.querySelectorAll('.business-region')){
      if(node!==panel)animations.push(node.animate([{opacity:1},{opacity:.16}],{duration:400,easing:ease,fill:'both'}));
    }
    for(const node of document.querySelectorAll('.site-header,.selector-intro'))animations.push(node.animate([{opacity:1},{opacity:0}],{duration:220,delay:70,easing:'ease-in',fill:'both'}));
    Promise.all(animations.map(settled)).then(()=>{
      if(departure!==state)return;
      // The new document paints the same dark plane before its hero reveal.
      location.assign(state.url);
      state.recovery=setTimeout(()=>cleanDeparture({restoreFocus:true}),5000);
    });
  }
  document.addEventListener('click',event=>{
    const panel=event.target.closest?.('a.business-region');
    if(!panel||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||panel.hasAttribute('download')||(panel.target&&panel.target!=='_self'))return;
    const url=new URL(panel.href,location.href);
    if(url.origin!==location.origin||!/(?:pages|en)\/(?:isolate|accelerate|connect)\.html$/.test(url.pathname))return;
    depart(panel,url,event);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&departure){event.preventDefault();event.stopImmediatePropagation();cleanDeparture({restoreFocus:true});}
  },true);
  document.addEventListener('click',event=>{
    if(departure&&event.target.closest?.('a[data-route]'))cleanDeparture();
  },true);
  window.addEventListener('popstate',()=>cleanDeparture());
  window.addEventListener('hashchange',()=>cleanDeparture());
  window.addEventListener('pagehide',()=>{
    // Keep the arrival token for the new document; clear visual state on restore.
    if(departure)clearTimeout(departure.recovery);
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)cleanDeparture();});
  // Warm only the intended destination and shared scene resources on intent.
  const warmed=new Set();
  function warm(event){
    const panel=event.target.closest?.('a.business-region');if(!panel||navigator.connection?.saveData)return;
    const base=new URL('.',location.href);
    for(const href of [panel.href,new URL('scenes.js?v=27',base).href,new URL('v26.css?v=26',base).href,new URL('v27.css?v=27',base).href]){
      if(warmed.has(href))continue;warmed.add(href);const link=document.createElement('link');link.rel='prefetch';link.href=href;document.head.append(link);
    }
  }
  document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);
  function finishArrival(){
    arrivalAnimations.forEach(a=>a.cancel());arrivalAnimations=[];
    clearTimeout(window.ARADArrival?.timer);
    document.documentElement.classList.remove('arad-arrival','arad-arrival-playing');
    document.documentElement.classList.add('arad-arrival-done');
    document.querySelector('main')?.removeAttribute('inert');
    if(window.ARADArrival)window.ARADArrival.finished=true;
  }
  function arrive(){
    if(!window.ARADArrival||!document.documentElement.classList.contains('arad-arrival'))return;
    if(motion.matches){finishArrival();return;}
    const root=document.documentElement,main=document.querySelector('main');
    if(main)main.inert=true;
    const scene=document.querySelector('[data-scene]');
    const started=performance.now();
    function reveal(){
      if(!root.classList.contains('arad-arrival')||window.ARADArrival.finished)return;
      root.classList.add('arad-arrival-playing');
      const parts=[['.v26-stage',0,850,48,.97],['.v26-heading',100,720,30,1],['.v26-intro',190,650,24,1],['.v26-console',290,580,16,1],['.a-header',100,550,0,1],['.v27-scroll-cue',290,580,12,1]];
      for(const [selector,delay,duration,x,scale] of parts){
        const container=document.querySelector(selector);if(!container)continue;
        const nodes=getComputedStyle(container).display==='contents'?[...container.children]:[container];
        for(const node of nodes){
        const css=getComputedStyle(node),base=css.transform==='none'?'':css.transform;
        arrivalAnimations.push(node.animate([
          {opacity:0,transform:`${base} translate3d(${x}px,0,0) scale(${scale})`},
          {opacity:css.opacity,transform:base||'none'}
        ],{duration,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
        }
      }
      Promise.all(arrivalAnimations.map(settled)).then(finishArrival);
    }
    function ready(){
      if(!root.classList.contains('arad-arrival'))return;
      if(!scene||scene.dataset.objectReady==='true'||scene.hasAttribute('data-object-error')||performance.now()-started>1200){
        requestAnimationFrame(()=>requestAnimationFrame(reveal));return;
      }
      requestAnimationFrame(ready);
    }
    ready();
  }
  motion.addEventListener('change',()=>{
    if(!motion.matches)return;
    if(departure){const url=departure.url;cleanDeparture();location.assign(url);}
    if(window.ARADArrival&&!window.ARADArrival.finished)finishArrival();
  });
  // Let deliberate scrolling take over immediately; the scroll scene owns poses.
  for(const type of ['wheel','touchstart'])addEventListener(type,()=>{
    if(window.ARADArrival&&!window.ARADArrival.finished)finishArrival();
  },{passive:true});
  arrive();
})();
