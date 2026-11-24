'use strict';
(() => {
  const english = document.documentElement.lang === 'en';
  const cards = [...document.querySelectorAll('[data-blog-card]')];
  const filters = [...document.querySelectorAll('[data-blog-filter]')];
  const input = document.querySelector('[data-blog-search]');
  const status = document.querySelector('[data-blog-status]');
  const empty = document.querySelector('[data-blog-empty]');
  let category = 'all';
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  const update = () => {
    const query = normalize(input?.value || '');
    let count = 0;
    cards.forEach(card => {
      card.hidden = !((category === 'all' || category === card.dataset.category) && normalize(card.dataset.search || '').includes(query));
      if (!card.hidden) count++;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.blogFilter === category)));
    if (status) status.textContent = english ? `${count} article${count === 1 ? '' : 's'}` : `${count}개의 글`;
    if (empty) empty.hidden = count > 0;
    document.querySelector('.b-stories')?.classList.toggle('is-filtered', category !== 'all' || !!query);
  };
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.blogFilter; update(); }));
  input?.addEventListener('input', update);
  document.querySelector('[data-blog-reset]')?.addEventListener('click', () => { category = 'all'; if (input) input.value = ''; update(); input?.focus(); });
  document.querySelector('[data-copy-article]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const url = document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0];
    const message = document.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = button.dataset.copiedLabel;
      if (message) message.textContent = button.dataset.copiedLabel;
      setTimeout(() => { button.textContent = button.dataset.copyLabel; }, 2200);
    } catch {
      if (message) message.textContent = english ? 'Copy the address from your browser’s address bar.' : '브라우저 주소창의 주소를 복사해 주세요.';
    }
  });
})();
