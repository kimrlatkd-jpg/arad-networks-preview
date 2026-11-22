'use strict';
(() => {
  const english = document.documentElement.lang === 'en';
  const say = (ko,en) => english ? en : ko;
  const menu = document.querySelector('#site-menu');
  const toggle = document.querySelector('.a-menu-toggle');
  let previousOverflow = '', previousFocus;
  if (menu && toggle) {
    toggle.addEventListener('click', () => {
      previousFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      menu.showModal();
    });
    menu.querySelector('.a-menu-close').addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({preventScroll:true});
    });
    menu.addEventListener('keydown', event => event.stopPropagation());
  }
  let toastTimer;
  const toast = message => {
    const element = document.querySelector('.a-toast');
    if (!element) return;
    clearTimeout(toastTimer);element.textContent = message;
    element.classList.add('is-visible');
    toastTimer = setTimeout(() => element.classList.remove('is-visible'),3500);
  };
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const input=document.createElement('textarea');input.value=text;
      input.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(input);input.select();
      let ok=false;try{ok=document.execCommand('copy');}catch{}input.remove();return ok;
    }
  }
  document.querySelector('.a-copy-email')?.addEventListener('click',async () => {
    const ok=await copy('sales@aradnetworks.com');
    toast(ok?say('이메일 주소를 복사했습니다.','Email address copied.'):say('복사하지 못했습니다. 이메일 주소를 직접 선택해 주세요.','Could not copy. Please select the email address.'));
  });
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  function selectTab(tab,focus=false) {
    for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;}
    if(focus)tab.focus();
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener('click',()=>selectTab(tab));
    tab.addEventListener('keydown',event=>{
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();selectTab(tabs[next],true);
    });
  });
  const filters=[...document.querySelectorAll('[data-filter]')];
  filters.forEach(filter=>filter.addEventListener('click',()=>{
    filters.forEach(x=>x.setAttribute('aria-pressed',String(x===filter)));
    let count=0;document.querySelectorAll('.a-insight-card').forEach(card=>{card.hidden=filter.dataset.filter!=='all'&&filter.dataset.filter!==card.dataset.category;if(!card.hidden)count++;});
    const status=document.querySelector('.a-filter-status');if(status)status.textContent=say(`${count}개의 글을 표시합니다.`,`${count} article${count===1?'':'s'} shown.`);
  }));
  const form=document.querySelector('#enquiry-form');
  if(form){
    const params=new URLSearchParams(location.search);
    const allowed=['isolate','accelerate','connect','other'];
    form.elements.topic.value=allowed.includes(params.get('topic'))?params.get('topic'):'other';
    const intent=params.get('intent');
    if(intent==='careers')form.elements.message.placeholder=say('경험과 관심 분야, 채용·협업 관련 문의를 적어주세요.','Tell us about your experience and careers or collaboration enquiry.');
    if(intent==='resources')form.elements.message.placeholder=say('필요한 자료와 검토 중인 환경을 알려주세요.','Tell us what information you need and the environment you are evaluating.');
    const makeMessage=()=>{
      const values=Object.fromEntries(new FormData(form));
      const topic={isolate:'Isolate AI',accelerate:'Accelerate AI',connect:'Connect AI',other:say('기타','General')}[values.topic];
      const subject=`[ARAD ${topic}] ${intent==='careers'?say('채용·협업 문의','Careers / collaboration'):intent==='resources'?say('자료 요청','Information request'):say('프로젝트 문의','Project enquiry')}`;
      const body=[`${say('이름','Name')}: ${values.name.trim()}`,`${say('회사','Company')}: ${values.company.trim()||'-'}`,`Email: ${values.email.trim()}`,`${say('전화','Phone')}: ${values.phone.trim()||'-'}`,`${say('문의 분야','Area')}: ${topic}`,`${say('알게 된 경로','Source')}: ${values.source||'-'}`,'',values.message.trim()].join('\n');
      return {subject,body};
    };
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const {subject,body}=makeMessage();
      location.href=`mailto:sales@aradnetworks.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.querySelector('#form-status').textContent=say('이메일 앱에서 내용을 확인한 뒤 발송해 주세요. 앱이 열리지 않으면 문의 내용을 복사해 보내실 수 있습니다.','Review and send the message in your email app. If it does not open, copy the enquiry and email it yourself.');
    });
    document.querySelector('#copy-enquiry').addEventListener('click',async()=>{
      if(!form.reportValidity())return;
      const {subject,body}=makeMessage();const ok=await copy(subject+'\n\n'+body);
      document.querySelector('#form-status').textContent=ok?say('문의 내용을 복사했습니다. 이메일에 붙여 넣어 보내주세요.','Enquiry copied. Paste it into your email to send.'):say('복사하지 못했습니다. 입력 내용을 직접 선택해 주세요.','Could not copy. Please select your text manually.');
    });
  }
})();
