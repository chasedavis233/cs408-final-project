// js/lists.js
// My Lists page – loads restaurants from backend and lets you edit rating, notes, favorite, and status.

const PROFILE_ID = "chase";

const panelTried = document.getElementById("panel-tried");
const panelTry = document.getElementById("panel-try");
const panelFav = document.getElementById("panel-fav");

const msgTried = document.getElementById("msg-tried");
const msgTry = document.getElementById("msg-try");
const msgFav = document.getElementById("msg-fav");

const tabs = [
  { btn: document.getElementById("tab-tried"), panel: panelTried },
  { btn: document.getElementById("tab-try"), panel: panelTry },
  { btn: document.getElementById("tab-fav"), panel: panelFav },
];

let restaurants = [];

// ---- Tabs ----
function show(tabId) {
  tabs.forEach(({ btn, panel }) => {
    const active = btn.id === tabId;
    btn.classList.toggle("is-selected", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
    panel.hidden = !active;
  });
}
tabs.forEach(({ btn }) => btn.addEventListener("click", () => show(btn.id)));
show("tab-tried");

// ---- Rendering ----
function starRowHTML(r) {
  const rating = Number(r.rating || 0);
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    const dim = i > rating ? "dim" : "";
    stars += `<span class="star ${dim}" data-role="star" data-value="${i}">★</span>`;
  }
  return `<div class="stars" aria-label="Rating">${stars}</div>`;
}

function entryHTML(r) {
  const img =
    r.imageUrl ||
    r.img ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80&auto=format&fit=crop";

  const cuisine = r.cuisine || "Unknown cuisine";
  const city = r.city ? `• ${r.city}` : "";
  const statusLabel =
    r.status === "tried" ? "Tried" : r.status === "to_try" ? "To Try" : (r.status || "").toString();

  return `
    <article class="entry" data-id="${r.restaurantId}">
      <div class="entry-media">
        <img src="${img}" alt="${r.name || "Restaurant"}">
      </div>
      <div class="entry-body">
        <h3>${r.name || "Untitled"}</h3>
        <div class="row muted">
          <span class="chip">${cuisine}</span>
          <span class="sep"></span>
          <span class="small-label">${statusLabel}</span>
          ${city ? `<span class="sep"></span><span class="small-label">${city}</span>` : ""}
        </div>
        <div class="row" style="margin-top:8px;">
          ${starRowHTML(r)}
        </div>
        <div style="margin-top:10px;">
          <div class="small-label">Notes</div>
          <textarea class="notes" data-role="notes" placeholder="What did you have? price? vibes?">${r.notes || ""}</textarea>
        </div>
      </div>
      <div class="entry-right">
        <button class="heart ${r.favorite ? "is-fav" : ""}" data-role="fav" aria-label="Toggle favorite">❤</button>
        <div class="row" style="flex-direction:column; gap:6px;">
          <button class="btn btn--ghost pill-btn" data-role="set-tried">Mark Tried</button>
          <button class="btn btn--ghost pill-btn" data-role="set-try">Move to To-Try</button>
          <button class="btn btn--ghost pill-btn" data-role="open-place">Open details</button>
          <button class="btn btn--ghost pill-btn" data-role="delete">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function renderPanel(panel, msgEl, list, emptyMsg) {
  if (!list.length) {
    panel.innerHTML = "";
    msgEl.hidden = false;
    msgEl.textContent = emptyMsg;
    return;
  }
  msgEl.hidden = true;
  panel.innerHTML = list.map(entryHTML).join("");
}

function renderAll() {
  const tried = restaurants.filter((r) => r.status === "tried");
  const toTry = restaurants.filter((r) => r.status === "to_try" || !r.status);
  const favs = restaurants.filter((r) => r.favorite);

  renderPanel(panelTried, msgTried, tried, "Nothing tried yet.");
  renderPanel(panelTry, msgTry, toTry, "Add places you want to try.");
  renderPanel(panelFav, msgFav, favs, "Favorite places will show up here.");
  attachNotesHandlers();
}

// ---- Data ----
async function loadRestaurants() {
  try {
    restaurants = await window.BiteRecAPI.fetchRestaurants(PROFILE_ID);
    renderAll();
  } catch (err) {
    console.error(err);
    msgTried.textContent = "Failed to load from server.";
  }
}

function findById(id) {
  return restaurants.find((r) => r.restaurantId === id);
}

async function saveAndRefresh(r) {
  try {
    await window.BiteRecAPI.saveRestaurant(PROFILE_ID, r);
    await loadRestaurants();
  } catch (err) {
    console.error(err);
    alert("Failed to save changes.");
  }
}

// ---- Event delegation for click actions ----
function onPanelClick(e) {
  const entry = e.target.closest(".entry");
  if (!entry) return;
  const id = entry.dataset.id;
  const r = findById(id);
  if (!r) return;

  const roleTarget = (attr) => e.target.closest(`[data-role="${attr}"]`);

  if (roleTarget("fav")) {
    r.favorite = !r.favorite;
    saveAndRefresh(r);
    return;
  }
  if (roleTarget("set-tried")) {
    r.status = "tried";
    saveAndRefresh(r);
    return;
  }
  if (roleTarget("set-try")) {
    r.status = "to_try";
    saveAndRefresh(r);
    return;
  }
  if (roleTarget("delete")) {
    if (!confirm("Remove this place from your list?")) return;
    window.BiteRecAPI
      .deleteRestaurant(id)
      .then(loadRestaurants)
      .catch((err) => {
        console.error(err);
        alert("Failed to delete.");
      });
    return;
  }
  if (roleTarget("open-place")) {
    // Go to detailed page
    window.location.href = `place.html?id=${encodeURIComponent(id)}`;
    return;
  }
  if (roleTarget("star")) {
    const value = Number(roleTarget("star").dataset.value || e.target.dataset.value);
    r.rating = value;
    saveAndRefresh(r);
    return;
  }
}

[panelTried, panelTry, panelFav].forEach((p) => p.addEventListener("click", onPanelClick));

// notes are better handled on blur/change
function attachNotesHandlers() {
  document.querySelectorAll("textarea[data-role='notes']").forEach((ta) => {
    ta.addEventListener("change", () => {
      const entry = ta.closest(".entry");
      if (!entry) return;
      const id = entry.dataset.id;
      const r = findById(id);
      if (!r) return;
      r.notes = ta.value;
      saveAndRefresh(r);
    });
  });
}

// ---- init ----
loadRestaurants();
