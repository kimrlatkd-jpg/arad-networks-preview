'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sceneNode = document.querySelector('[data-scene]');
  let scene;
  if (sceneNode && window.ARADObjects) {
    try {
      scene = window.ARADObjects.mount(sceneNode, {type:sceneNode.dataset.scene,reducedMotion:reduced.matches});
      window.__aradScene = scene;
      const controls=[...document.querySelectorAll('[data-scene-mode]')];
      controls.forEach(button=>button.addEventListener('click',()=>{
        const index=Number(button.dataset.sceneMode);
        controls.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        const label=document.querySelector('.v-object-label b');if(label)label.textContent=button.dataset.routeLabel;
        scene.setMode(index);
      }));
      const syncTech = button => {
        const index=Number(button.dataset.techMode);scene.setMode(index);
        controls.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.sceneMode)===index)));
        const label=document.querySelector('.v-object-label b');if(label)label.textContent=controls[index].dataset.routeLabel;
      };
      document.querySelectorAll('[data-tech-mode]').forEach(button=>{
        button.addEventListener('click',()=>syncTech(button));
        button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
          const active=document.querySelector('[data-tech-mode][aria-selected="true"]');if(active)syncTech(active);
        }});
      });
      window.addEventListener('pagehide',()=>scene.dispose(),{once:true});
      window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
    } catch(error) { sceneNode.dataset.objectError='true'; }
  }
  const dialog=document.querySelector('.v-diagram-dialog');
  let trigger,overflow;
  if(dialog){
    document.querySelectorAll('[data-diagram]').forEach(button=>button.addEventListener('click',()=>{
      trigger=button;overflow=document.body.style.overflow;document.body.style.overflow='hidden';
      const img=dialog.querySelector('img');img.src=button.dataset.diagram;img.alt=button.dataset.description;
      dialog.showModal();
    }));
    dialog.querySelector('.v-diagram-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{document.body.style.overflow=overflow||'';trigger?.focus({preventScroll:true});});
  }
})();
