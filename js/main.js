// tabs for lists.html
function initTabs() {
  const tabButtons = document.querySelectorAll('.tabs .tab');
  const panels = {
    tried: document.getElementById('panel-tried'),
    totry: document.getElementById('panel-totry'),
    favs:  document.getElementById('panel-favs'),
  };
  function select(which) {
    tabButtons.forEach(btn => {
      const active = btn.classList.contains(`tab-${which}`);
      btn.classList.toggle('is-selected', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    Object.entries(panels).forEach(([key, el]) => {
      if (!el) return;
      if (key === which) { el.hidden = false; el.removeAttribute('inert'); }
      else { el.hidden = true; el.setAttribute('inert', ''); }
    });
  }
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('tab-tried')) select('tried');
      if (btn.classList.contains('tab-totry')) select('totry');
      if (btn.classList.contains('tab-favs'))  select('favs');
    });
  });
}

// modal for explore.html
function initPlaceModal() {
  const modal = document.getElementById('place-modal');
  if (!modal) return;
  const title = modal.querySelector('#place-title');
  const img   = modal.querySelector('#place-img');
  const info  = modal.querySelector('#place-info');

  function open(data) {
    title.textContent = data.name || '(Chosen food place)';
    img.src = data.img || '';
    img.alt = data.name ? `${data.name} photo` : '';
    info.textContent = `${data.cuisine || ''} • ${data.price || ''} • ⭐ ${data.rating || ''}`;
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
  }
  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('.js-open-place').forEach(card => {
    card.addEventListener('click', (e) => {
      // ignore clicks on inline "＋" chip
      if (e.target && e.target.closest('.chip.add')) return;
      const data = {
        name: card.dataset.name,
        cuisine: card.dataset.cuisine,
        rating: card.dataset.rating,
        price: card.dataset.price,
        img: card.dataset.img
      };
      open(data);
    });
  });

  modal.querySelector('[data-close]')?.addEventListener('click', close);
  modal.querySelector('.modal-backdrop')?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // mock button handlers
  document.getElementById('btn-add-tried')?.addEventListener('click', () => alert('Added to Tried (mock)'));
  document.getElementById('btn-add-try')?.addEventListener('click', () => alert('Added to Try List (mock)'));
  document.getElementById('btn-menu')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Menu integration coming with AWS phase.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initPlaceModal();
});
