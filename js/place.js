import { byId, $, toggleFav, setStatus } from './proto.js';

const id = new URL(location.href).searchParams.get('id') || 'p1';
const p = byId(id);

if (p){
  document.querySelector('.place-media img').src = p.image;
  document.querySelector('.place-media img').alt = p.name;
  $('#placeName').textContent = p.name;
  $('#placeCuisine').textContent = p.category || '';
  $('#placeRating').textContent = `${p.rating ?? '—'} ★`;

  const favBtn = $('#favBtn');
  favBtn.textContent = p.favorite ? '❤ Favorited' : '🤍 Favorite';
  favBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    const now = toggleFav(id);
    favBtn.textContent = now ? '❤ Favorited' : '🤍 Favorite';
  });

  $('#btnTried')?.addEventListener('click', ()=> setStatus(id,'tried'));
  $('#btnToTry')?.addEventListener('click', ()=> setStatus(id,'to_try'));
}
