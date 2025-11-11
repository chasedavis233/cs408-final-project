export function renderImageCard(r){
  const addPayload = encodeURIComponent(JSON.stringify({ name:r.name, zip:r.zip || '00000', cuisine:r.cuisine }));
  return `
    <article class="card card--image">
      <div class="thumb">
        <img src="${r.image}" alt="${escapeHtml(r.name)}">
      </div>
      <div class="content">
        <div class="title-line">
          <h3>${escapeHtml(r.name)}</h3>
          <span class="price-range">${r.priceRange || '$$'}</span>
        </div>
        <div class="meta">
          <span class="badge">${escapeHtml(r.cuisine||'Casual')}</span>
          <span class="muted small">⭐ ${r.rating ?? '4.5'}</span>
        </div>
        <div class="inline">
          <button class="btn btn--ghost" data-add='${addPayload}'>Add to To Try</button>
          <a class="btn btn--primary" href="search.html?id=temp-${encodeURIComponent(r.name)}">Details</a>
        </div>
      </div>
    </article>
  `;
}

// Simple Lovable-like mock results (replace later with AWS/Places)
export function mockSearch(zip='83702'){
  return [
    {
      id: 'r1', name: 'The Golden Spoon', cuisine: 'Italian', rating: 4.5, priceRange: '$$',
      distance: '0.8 mi', zip,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'r2', name: 'Sushi Paradise', cuisine: 'Japanese', rating: 4.8, priceRange: '$$$',
      distance: '1.2 mi', zip,
      image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'r3', name: 'Slice City', cuisine: 'Pizza', rating: 4.3, priceRange: '$',
      distance: '0.5 mi', zip,
      image: 'https://images.unsplash.com/photo-1541745537413-b804de01d7be?w=800&q=80&auto=format&fit=crop',
    }
  ];
}
