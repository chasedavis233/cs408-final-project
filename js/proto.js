// Minimal in-memory demo store (replace with AWS later)
const KEY = 'biterec-demo';

const seed = {
  settings: { priceEnabled: true },
  places: [
    { id:'p1', name:'Pasta Palace',  zip:'83702', status:'tried',  category:'Italian',  rating:4, notes:'Carbonara + tiramisu', price:22.5, favorite:true,
      image:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80&auto=format&fit=crop' },
    { id:'p2', name:'Burger Barn',   zip:'83706', status:'to_try', category:'Burger',   rating:null, notes:'Smash burger spot',    price:null, favorite:false,
      image:'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80&auto=format&fit=crop' },
    { id:'p3', name:'Café Lumen',    zip:'83702', status:'tried',  category:'Café',     rating:5,  notes:'Cappuccino & croissant', price:8.75, favorite:false,
      image:'https://images.unsplash.com/photo-1514511542647-8f6e120f0b2b?w=1200&q=80&auto=format&fit=crop' }
  ]
};

export const Store = {
  load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || seed; }
    catch { return seed; }
  },
  save(data){ localStorage.setItem(KEY, JSON.stringify(data)); }
};

export function data(){ return Store.load(); }
export function save(d){ Store.save(d); }

export function byId(id){ return data().places.find(p => p.id === id); }

export function toggleFav(id){
  const d = data(); const p = d.places.find(x => x.id === id); if (!p) return;
  p.favorite = !p.favorite; save(d); return p.favorite;
}

export function setStatus(id, status){
  const d = data(); const p = d.places.find(x => x.id === id); if (!p) return;
  p.status = status; save(d);
}

export const $$ = (sel, root=document)=>[...root.querySelectorAll(sel)];
export const $  = (sel, root=document)=>root.querySelector(sel);

export const esc = s => (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

export function restCard(p){
  const heart = p.favorite ? '❤️' : '🤍';
  return `
  <a class="card rest-card" href="place.html?id=${encodeURIComponent(p.id)}" data-id="${p.id}">
    <div class="rest-media">
      <img src="${p.image}" alt="${esc(p.name)}" />
      <button class="chip add" data-heart="${p.id}" title="Favorite">${heart}</button>
    </div>
    <div class="rest-body">
      <h3>${esc(p.name)}</h3>
      <div class="row muted">
        <span class="chip">${esc(p.category||'Food')}</span><span class="sep"></span>
        <span>${p.rating ?? '—'}★</span><span class="sep"></span>
        <span>${p.price ? '$$' : '$'}</span><span class="sep"></span>
        <span>${p.zip || ''}</span>
      </div>
    </div>
  </a>`;
}

export function entryRow(p){
  return `
  <a class="entry card rest-card" href="place.html?id=${encodeURIComponent(p.id)}" data-id="${p.id}">
    <div class="entry-media"><img src="${p.image}" alt="${esc(p.name)}" /></div>
    <div class="entry-body">
      <h3>${esc(p.name)}</h3>
      <div class="row muted">
        <span class="chip">${esc(p.category)}</span><span class="sep"></span>
        <span>${p.status==='tried'?'Visited':'Wishlist'}</span>
        ${p.price ? `<span class="sep"></span><span>Total: $${p.price.toFixed(2)}</span>` : ''}
      </div>
      ${p.notes?`<div class="row small muted"><strong>What I had:</strong> <span class="chip">${esc(p.notes)}</span></div>`:''}
    </div>
    <div class="entry-rating" aria-label="Rating">${'★'.repeat(p.rating||0)}${'☆'.repeat(5-(p.rating||0))}</div>
  </a>`;
}
