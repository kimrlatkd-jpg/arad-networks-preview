'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sceneNode = document.querySelector('[data-scene]');
  const english = document.documentElement.lang === 'en';
  let scene;
  const controls = [...document.querySelectorAll('[data-scene-mode]')];
  const route = document.querySelector('.v26-route b');
  const syncMode = index => {
    controls.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.sceneMode) === index)));
    if (route && controls[index]) route.textContent = controls[index].dataset.routeLabel;
    scene?.setMode(index);
  };
  if (sceneNode && window.ARADObjects) {
    try {
      scene = ARADObjects.mount(sceneNode, {type:sceneNode.dataset.scene, reducedMotion:reduced.matches});
      window.__aradScene = scene;
      controls.forEach((button, i) => {
        button.addEventListener('click', () => syncMode(i));
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
          event.preventDefault();
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length-1 : (i+(event.key==='ArrowRight'?1:-1)+controls.length)%controls.length;
          controls[index].focus(); syncMode(index);
        });
      });
      document.querySelector('[data-scene-replay]')?.addEventListener('click', () => scene.replay?.());
      document.querySelectorAll('[data-tech-mode]').forEach(button => {
        button.addEventListener('click', () => syncMode(Number(button.dataset.techMode)));
        button.addEventListener('keydown', event => {
          if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
            queueMicrotask(() => {
              const active = document.querySelector('[data-tech-mode][aria-selected="true"]');
              if (active) syncMode(Number(active.dataset.techMode));
            });
          }
        });
      });
      reduced.addEventListener('change', () => {
        scene.dispose();
        scene=ARADObjects.mount(sceneNode,{type:sceneNode.dataset.scene,reducedMotion:reduced.matches});
        window.__aradScene=scene;
        syncMode(Number(controls.find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.sceneMode||0));
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
  const sectionLinks=[...document.querySelectorAll('.v-page-nav a')];
  const sections=sectionLinks.map(a=>document.getElementById(a.hash.slice(1))).filter(Boolean);
  if(sections.length){
    let scheduled=false;
    const update=()=>{
      scheduled=false;
      const active=[...sections].reverse().find(s=>s.getBoundingClientRect().top<innerHeight*.35);
      sectionLinks.forEach(a=>{
        if(active&&a.hash==='#'+active.id)a.setAttribute('aria-current','location');
        else a.removeAttribute('aria-current');
      });
    };
    addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});
    update();
  }
})();
