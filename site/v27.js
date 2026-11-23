'use strict';
(()=>{
 const journey=document.querySelector('[data-journey]');if(!journey)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const sticky=journey.querySelector('.v27-sticky'),narrative=journey.querySelector('.v27-narrative');
 const chapters=[...journey.querySelectorAll('[data-chapter]')],buttons=[...journey.querySelectorAll('[data-chapter-to]')];
 const original=[...journey.querySelectorAll('.v26-intro,.v26-console')],cue=journey.querySelector('.v27-scroll-cue');
 const clamp=x=>Math.min(1,Math.max(0,x));const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
 let enhanced=false,progress=0,target=0,raf=0,last=0,chapter=-2,lastScene=null;
 const top=()=>innerWidth<=560?78:88;
 const range=()=>Math.max(1,journey.offsetHeight-sticky.offsetHeight);
 const read=()=>clamp((top()-journey.getBoundingClientRect().top)/range());
 function apply(p){
   const scene=window.__aradScene,alpha=smooth((p-.025)/.11),idx=p<.12?-1:Math.min(2,Math.floor((p-.14+1e-5)/.30));
   journey.style.setProperty('--intro-alpha',(1-alpha).toFixed(4));journey.style.setProperty('--story-alpha',alpha.toFixed(4));journey.style.setProperty('--journey-progress',p.toFixed(4));
   const index=p<.12?-1:Math.max(0,idx);
   if(chapter!==index){chapter=index;journey.dataset.chapter=String(index);
     chapters.forEach((el,i)=>{el.classList.toggle('is-current',i===index);el.setAttribute('aria-hidden',String(i!==index));el.inert=i!==index});
     buttons.forEach((el,i)=>el.setAttribute('aria-pressed',String(i===index)));
     original.forEach(el=>{el.inert=index>=0;el.setAttribute('aria-hidden',String(index>=0))});narrative.inert=index<0;narrative.setAttribute('aria-hidden',String(index<0));cue.inert=index>=0;
     if(innerWidth<=850&&index>=0){const stage=journey.querySelector('.v26-stage');const baseTop=sticky.getBoundingClientRect().top+stage.offsetTop;const textBottom=chapters[index].getBoundingClientRect().bottom;journey.style.setProperty('--scene-shift',Math.max(28,Math.min(110,textBottom-baseTop+20))+'px');}
   }
   buttons.forEach((el,i)=>el.style.setProperty('--step-progress',clamp((p-(.14+i*.30))/.30).toFixed(4)));
   if(scene?.setProgress){scene.setProgress(p);lastScene=scene;}
   journey.dataset.progress=p.toFixed(3);
 }
 function tick(stamp){raf=0;if(!enhanced||document.hidden)return;const dt=last?Math.min(60,stamp-last):16;last=stamp;progress+=(target-progress)*(1-Math.exp(-dt/85));if(Math.abs(target-progress)<.00025)progress=target;apply(progress);if(progress!==target)raf=requestAnimationFrame(tick);else last=0;}
 function schedule(){if(enhanced&&!raf&&!document.hidden){raf=requestAnimationFrame(tick)}}
 function measure(){if(!enhanced)return;target=read();schedule();}
 function configure(){
   const enable=!motion.matches&&innerWidth>=360&&innerHeight>=740;
   enhanced=enable;journey.classList.toggle('is-enhanced',enable);journey.classList.toggle('is-static',!enable);
   if(!enable){cancelAnimationFrame(raf);raf=0;last=0;chapter=-2;progress=target=0;original.forEach(el=>{el.inert=false;el.removeAttribute('aria-hidden')});narrative.inert=false;narrative.removeAttribute('aria-hidden');cue.inert=false;chapters.forEach(el=>{el.classList.remove('is-current');el.removeAttribute('aria-hidden');el.inert=false});window.__aradScene?.setProgress?.(0);journey.dataset.progress='0';}
   else{chapter=-2;target=read();progress=target;apply(progress);schedule();}
 }
 function go(index){if(!enhanced)return;const p=.28+index*.30;const y=scrollY+journey.getBoundingClientRect().top-top()+range()*p;window.scrollTo({top:y,behavior:'smooth'});}
 buttons.forEach((button,i)=>{button.addEventListener('click',()=>go(i));button.addEventListener('keydown',event=>{let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(i+1)%3;if(['ArrowLeft','ArrowUp'].includes(event.key))next=(i+2)%3;if(event.key==='Home')next=0;if(event.key==='End')next=2;if(next!==undefined){event.preventDefault();buttons[next].focus({preventScroll:true});go(next)}})});
 cue.addEventListener('click',event=>{if(enhanced){event.preventDefault();go(0)}});
 window.addEventListener('scroll',measure,{passive:true});window.addEventListener('resize',configure,{passive:true});motion.addEventListener('change',configure);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0}else measure()});
 // The existing scene owner may remount after a system reduced-motion change.
 const ready=new MutationObserver(()=>{if(enhanced&&lastScene!==window.__aradScene)apply(progress)});
 ready.observe(journey.querySelector('[data-scene]'),{attributes:true,attributeFilter:['data-object-ready']});
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);ready.disconnect()},{once:true});
 configure();document.fonts?.ready.then(measure);
})();
