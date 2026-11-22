/* Finite, user-directed story state transitions. No autoplay or timers between states. */
(()=>{'use strict';document.querySelectorAll('[data-story]').forEach(section=>{
  const buttons=[...section.querySelectorAll('[data-story-step]')];
  let endTimer;
  const select=index=>{
    if(index<0||index>=buttons.length)return;
    clearTimeout(endTimer);
    section.classList.remove('is-story-transitioning');
    section.dataset.storyState=String(index);
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    section.querySelectorAll('[data-story-copy]').forEach(copy=>{copy.hidden=copy.dataset.storyCopy!==String(index)});
    // Restart the finite path drawing when a visitor revisits a state.
    void section.offsetWidth;
    section.classList.add('is-story-transitioning');
    endTimer=setTimeout(()=>section.classList.remove('is-story-transitioning'),1700);
  };
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>select(index));
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%buttons.length;
      if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=buttons.length-1;
      if(next!==undefined){event.preventDefault();buttons[next].focus();select(next)}
    });
  });
});})();
