import { data, entryRow, $, $$ } from './proto.js';

const panels = {
  tried: $('#panel-tried'),
  totry: $('#panel-totry'),
  favs:  $('#panel-favs'),
};

function paint(){
  const d = data();
  panels.tried.innerHTML = d.places.filter(p=>p.status==='tried').map(entryRow).join('') || '<p class="muted">Nothing here yet.</p>';
  panels.totry.innerHTML = d.places.filter(p=>p.status==='to_try').map(entryRow).join('') || '<p class="muted">Add places to try later.</p>';
  panels.favs.innerHTML  = d.places.filter(p=>p.favorite).map(entryRow).join('') || '<p class="muted">Favorite places to build your recommendations.</p>';
}
paint();

// tabs (uses your existing .tabs styles)
const tabs = $$('.tabs .tab');
function show(which){
  tabs.forEach(t=>{
    const on = t.classList.contains(`tab-${which}`);
    t.classList.toggle('is-selected', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  Object.entries(panels).forEach(([k, el])=>{
    el.hidden = k!==which;
    if (k===which) el.removeAttribute('inert'); else el.setAttribute('inert','');
  });
}
tabs.forEach(t=>t.addEventListener('click', ()=>{
  if (t.classList.contains('tab-tried')) show('tried');
  if (t.classList.contains('tab-totry')) show('totry');
  if (t.classList.contains('tab-favs'))  show('favs');
}));
show('tried');
