// shared behaviors: active nav + liquid glass + favorite delegate
import { $, $$, toggleFav, data } from './proto.js';

// active link
(function(){
  const path = (location.pathname.split('/').pop() || 'index.html');
  const map  = { 'index.html':'', 'explore.html':'explore', 'lists.html':'lists', 'profile.html':'profile', 'place.html':'explore' };
  const key  = map[path];
  if (!key) return;
  $$(`[data-nav="${key}"]`).forEach(a => a.classList.add('is-active'));
})();

// strengthen glass & orange outline (matches index)
(function(){
  const shell = $('.nav-shell'); if(!shell) return;
  shell.style.backdropFilter = 'blur(var(--glass-blur,14px))';
  shell.style.background = 'color-mix(in srgb, var(--surface) 38%, transparent)';
  shell.style.border = '1px solid color-mix(in srgb, var(--surface) 18%, transparent)';
})();

// favorite hearts (works on all pages)
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-heart]'); if(!btn) return;
  e.preventDefault(); e.stopPropagation();
  const id = btn.getAttribute('data-heart');
  const now = toggleFav(id);
  btn.textContent = now ? '❤️' : '🤍';
});
