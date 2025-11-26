// js/explore.js
// Explore page wired to BiteRec API with safe UI states.

const PROFILE_ID = "chase"; // hard-coded profile for now

const resultsEl = document.getElementById("results");
const emptyEl   = document.getElementById("explore-empty");
const qEl       = document.getElementById("q");
const zipEl     = document.getElementById("zip"); // not used yet, but kept for future
const btnSearch = document.getElementById("btnSearch");
const btnAdd    = document.getElementById("btnAddRestaurant");

const hasAPI = typeof window.BiteRecAPI === "object";

// ---- rendering helpers ----

function restCard(r) {
  const url = `place.html?id=${encodeURIComponent(r.restaurantId)}`
    + `&name=${encodeURIComponent(r.name || "")}`;

  const rating  = typeof r.rating === "number" ? r.rating.toFixed(1) : "—";
  const price   = r.priceCategory || r.price || "";
  const cuisine = r.cuisine || "";

  return `
    <a class="card rest-card" href="${url}" data-id="${r.restaurantId}">
      <div class="rest-media">
        <img
          src="${r.heroImage || r.img || "https://picsum.photos/800/500?food"}"
          alt="${r.name || "Restaurant"}"
        />
        <span class="chip add">＋</span>
      </div>
      <div class="rest-body">
        <h3>${r.name || "(Untitled place)"}</h3>
        <div class="row muted">
          ${cuisine ? `<span class="chip">${cuisine}</span><span class="sep"></span>` : ""}
          ${rating  ? `<span>⭐ ${rating}</span><span class="sep"></span>` : ""}
          ${price   ? `<span>${price}</span>` : ""}
        </div>
      </div>
    </a>
  `;
}

function render(list) {
  if (!Array.isArray(list) || list.length === 0) {
    resultsEl.innerHTML = "";
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent = `No restaurants yet. Use “+ Add place” to start your list.`;
    }
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  resultsEl.innerHTML = list.map(restCard).join("");
}

// ---- API load ----

async function loadRestaurants() {
  if (!emptyEl) return;

  try {
    emptyEl.hidden = false;
    emptyEl.textContent = "Loading restaurants…";

    let restaurants = [];

    const q = (qEl?.value || "").trim();

    if (hasAPI) {
      restaurants = await window.BiteRecAPI.fetchRestaurants(PROFILE_ID, {
        q: q || undefined,
      });
    } else {
      console.warn("BiteRecAPI is not available; skipping API call.");
      restaurants = []; // no backend available
    }

    render(restaurants);
  } catch (err) {
    console.error("Failed to load restaurants:", err);
    emptyEl.hidden = false;
    emptyEl.textContent = "Failed to load restaurants from server.";
  }
}

// ---- quick “Add place” (disabled in sandboxed Live Preview) ----

async function quickAddPlace() {
  if (!hasAPI) {
    alert("Backend API isn’t available in this context.");
    return;
  }

  // VS Code Live Preview runs in a sandbox that blocks prompt()/alert().
  // This keeps the UI from silently failing.
  const isSandboxed = window.parent !== window && /vscode/i.test(navigator.userAgent);
  if (isSandboxed) {
    alert(
      "VS Code Live Preview blocks pop-up prompts.\n\n" +
      "Open explore.html in a normal browser (Chrome/Edge/etc.) to use “+ Add place”, " +
      "or add rows via the AWS console."
    );
    return;
  }

  const name = prompt("Restaurant name?");
  if (!name) return;

  const city          = prompt("City (optional)?")           || "";
  const cuisine       = prompt("Cuisine (e.g., Tacos)?")     || "";
  const priceCategory = prompt("Price ($, $$, $$$)?")        || "$$";

  try {
    await window.BiteRecAPI.saveRestaurant(PROFILE_ID, {
      name,
      city,
      cuisine,
      priceCategory,
      status: "to_try",
      rating: 0,
      favorite: false,
      notes: "",
      tags: cuisine ? [cuisine.toLowerCase()] : [],
      metadata: {},
    });
    await loadRestaurants();
  } catch (err) {
    console.error("Failed to save restaurant:", err);
    alert("Failed to save restaurant.");
  }
}

// ---- wire up events ----

btnSearch?.addEventListener("click", (e) => {
  e.preventDefault();
  loadRestaurants();
});

qEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    loadRestaurants();
  }
});

btnAdd?.addEventListener("click", (e) => {
  e.preventDefault();
  quickAddPlace();
});

// initial load
loadRestaurants();
