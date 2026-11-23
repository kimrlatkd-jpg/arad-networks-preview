/* Finite, independent product objects. The panels own the transition timing. */
(() => {
 const nodes=[...document.querySelectorAll('[data-selector-object]')], instances=new Map();
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let visible=document.body.dataset.route==='business';
 function init(){
  if(!window.ARADSelectorObjects)return;
  nodes.forEach(node=>{
   if(instances.has(node))return;
   try{
    const scene=ARADSelectorObjects.mount(node,{type:node.dataset.selectorObject,reducedMotion:motion.matches});
    instances.set(node,scene);scene.setPaused(!visible||document.hidden);
    const panel=node.closest('.business-region');
    panel.addEventListener('pointerenter',()=>scene.hover(true));
    panel.addEventListener('pointerleave',()=>scene.hover(false));
    panel.addEventListener('focus',()=>scene.hover(true));
    panel.addEventListener('blur',()=>scene.hover(false));
   }catch(error){node.dataset.objectError='true';}
  });
 }
 function setVisible(next){visible=next;if(next)init();instances.forEach(s=>s.setPaused(!next||document.hidden));}
 window.ARADSelectorExperience={setVisible,exportPosters(){return [...instances].map(([node,s])=>({type:node.dataset.selectorObject,png:s.exportPng()}));},getState(){return [...instances.values()].map(s=>s.getState());}};
 document.addEventListener('visibilitychange',()=>setVisible(visible));
 motion.addEventListener('change',()=>{instances.forEach(s=>s.dispose());instances.clear();init();});
 if(visible)init();
 else if('requestIdleCallback' in window)requestIdleCallback(init,{timeout:1800});
 else setTimeout(init,700);
})();
