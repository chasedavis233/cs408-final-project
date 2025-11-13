import { data, restCard, $, $$ } from './proto.js';

const results = $('#results');

function render(list){ results.innerHTML = list.map(restCard).join(''); }
render(data().places);

// filter/search (lightweight)
$('#btnSearch')?.addEventListener('click', ()=>{
  const q   = (document.querySelector('.search-input input')?.value || '').toLowerCase();
  const zip = (document.querySelector('.zip-input input')?.value || '').trim();
  const list = data().places.filter(p =>
    (!q   || (p.name+' '+(p.category||'')).toLowerCase().includes(q)) &&
    (!zip || (p.zip||'').startsWith(zip))
  );
  render(list);
});
