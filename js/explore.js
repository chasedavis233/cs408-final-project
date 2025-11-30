// Explore page wiring for BiteRec SearchPlaces Lambda

const resultsEl = document.getElementById("results");
const emptyMsg = document.getElementById("explore-empty");
const qEl = document.getElementById("q");
const zipEl = document.getElementById("zip");
const btnSearch = document.getElementById("btnSearch");

// Public API from api.js
const { searchPlaces, saveRestaurant } = window.BiteRecAPI || {};

let userLat = null;
let userLon = null;
let lastPlaces = [];

// sessionStorage key for restoring the last search
const STORAGE_KEY = "biterec:lastExploreSearch";

// Prefer the active profile's default ZIP
function getDefaultZip() {
  if (
    window.BiteRecStore &&
    typeof window.BiteRecStore.getDefaultZip === "function"
  ) {
    return window.BiteRecStore.getDefaultZip();
  }
  return "83702";
}

/**
 * Compute distance between two lat/lon points in miles (Haversine).
 */
function distanceMiles(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null
  ) {
    return null;
  }

  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;

  return km * 0.621371;
}

/**
 * Turn a numeric distance into a friendly label.
 */
function formatDistance(mi) {
  if (mi == null) return "";
  const n = Number(mi);
  if (!Number.isFinite(n)) return "";

  if (n < 0.2) return "≈0.2 mi from you";
  if (n < 1) return `${n.toFixed(1)} mi from you`;
  if (n < 10) return `${n.toFixed(1)} mi from you`;
  return `${Math.round(n)} mi from you`;
}

/**
 * Attach distance-from-user to each place when we know user location.
 */
function addUserDistance(places) {
  if (userLat == null || userLon == null) return places;

  return places.map((p) => {
    const d = distanceMiles(userLat, userLon, p.lat, p.lon);
    return { ...p, distanceFromUserMi: d };
  });
}

/**
 * Build the HTML for a single search result card.
 */
function cardHTML(p, index) {
  const name = p.name || "Restaurant";
  const cuisine = p.cuisine || p.amenity || "Restaurant";
  const city = p.city || "";
  const distLbl = formatDistance(p.distanceFromUserMi);

  const id = p.externalId || p.id || "";

  const url = new URL("place.html", window.location.origin);
  const params = url.searchParams;

  params.set("id", id);
  params.set("name", name);
  params.set("cuisine", cuisine);

  if (p.housenumber) params.set("housenumber", p.housenumber);
  if (p.street) params.set("street", p.street);
  if (p.city) params.set("city", p.city);
  if (p.state) params.set("state", p.state);
  if (p.postcode) params.set("postcode", p.postcode);

  if (p.phone) params.set("phone", p.phone);
  if (p.website) params.set("website", p.website);
  if (p.email) params.set("email", p.email);
  if (p.openingHours) params.set("openingHours", p.openingHours);

  if (p.takeaway) params.set("takeaway", p.takeaway);
  if (p.delivery) params.set("delivery", p.delivery);
  if (p.driveThrough) params.set("driveThrough", p.driveThrough);

  if (p.distanceFromUserMi != null) {
    params.set("distanceMi", p.distanceFromUserMi.toString());
  }

  const href = url.toString();

  return `
    <a class="card rest-card rest-card--text" href="${href}">
      <div class="rest-body">
        <div class="rest-header-row">
          <h3 class="rest-name">${name}</h3>
          <div class="rest-actions">
            <button
              type="button"
              class="btn-add btn-tag btn-tag--want"
              data-add-action="want"
              data-place-id="${id}"
              data-place-index="${index}"
            >
              ＋ To-try
            </button>
            <button
              type="button"
              class="btn-add btn-tag btn-tag--tried"
              data-add-action="tried"
              data-place-id="${id}"
              data-place-index="${index}"
            >
              ✓ Tried
            </button>
            <button
              type="button"
              class="btn-add btn-tag btn-tag--fav"
              data-add-action="fav"
              data-place-id="${id}"
              data-place-index="${index}"
            >
              ☆ Favorite
            </button>
          </div>
        </div>
        <div class="row muted rest-row-main">
          <span class="btn">${cuisine}</span>
          ${city ? `<span class="sep"></span><span>${city}</span>` : ""}
          ${distLbl ? `<span class="sep"></span><span>${distLbl}</span>` : ""}
        </div>
      </div>
    </a>
  `;
}

/**
 * Render the result list into the page.
 */
function render(list) {
  if (!list || list.length === 0) {
    resultsEl.innerHTML =
      '<p class="muted">No restaurants found. Try another ZIP or search term.</p>';
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  }

  if (emptyMsg) emptyMsg.hidden = true;
  resultsEl.innerHTML = list.map((p, idx) => cardHTML(p, idx)).join("");
}

/**
 * Save the current search to sessionStorage so it can be restored.
 */
function saveSearchState(q, zip) {
  try {
    const state = {
      q,
      zip,
      userLat,
      userLon,
      places: lastPlaces,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Could not save explore search state", err);
  }
}

/**
 * Restore previous search (if any) from sessionStorage.
 */
function restoreSearchState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.places)) return false;

    qEl.value = state.q || "";
    zipEl.value = state.zip || zipEl.value || "83702";

    userLat = typeof state.userLat === "number" ? state.userLat : null;
    userLon = typeof state.userLon === "number" ? state.userLon : null;

    lastPlaces = state.places;
    render(lastPlaces);
    return true;
  } catch (err) {
    console.warn("Could not restore explore search state", err);
    return false;
  }
}

/**
 * Run a new search using the current ZIP + query.
 */
async function runSearch() {
  if (!searchPlaces) {
    console.error("BiteRecAPI.searchPlaces is not available");
    return;
  }

  const q = qEl.value.trim();
  const zip = zipEl.value.trim();

  if (!zip) {
    resultsEl.innerHTML =
      '<p class="muted">Enter a ZIP code to search for restaurants.</p>';
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  }

  resultsEl.innerHTML = '<p class="muted">Searching…</p>';
  if (emptyMsg) emptyMsg.hidden = true;

  try {
    const data = await searchPlaces(zip, q);
    lastPlaces = addUserDistance(data.places || []);
    render(lastPlaces);
    saveSearchState(q, zip);
  } catch (err) {
    console.error("search error", err);
    resultsEl.innerHTML =
      '<p class="muted">Search failed. Please try again later.</p>';
    if (emptyMsg) emptyMsg.hidden = false;
  }
}

/**
 * Handle clicks on the To-try / Tried / Favorite buttons in a card.
 */
resultsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-action]");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  if (!saveRestaurant) {
    console.warn("saveRestaurant not available on BiteRecAPI");
    return;
  }

  const action = btn.dataset.addAction; // "want" | "tried" | "fav"
  const index = btn.dataset.placeIndex;
  const place = index != null ? lastPlaces[Number(index)] : null;

  if (!place) {
    console.warn(
      "No place found for index",
      index,
      "lastPlaces length:",
      lastPlaces.length
    );
    return;
  }

  const restaurantId = place.externalId || place.id || `osm-${Date.now()}`;

  // Favorites are also tracked as "tried"
  let status;
  if (action === "tried" || action === "fav") {
    status = "tried";
  } else {
    status = "want";
  }

  const payload = {
    restaurantId,
    externalId: place.externalId || place.id || null,
    name: place.name || "Restaurant",
    city: place.city || "",
    cuisine: place.cuisine || place.amenity || "Restaurant",
    status,
    isFavorite: action === "fav",
    favorite: action === "fav",
  };

  // Update button text immediately for feedback
  const originalText = btn.textContent;
  if (action === "tried") {
    btn.textContent = "✓ Added";
  } else if (action === "want") {
    btn.textContent = "Saved";
  } else {
    btn.textContent = "★ Favorited";
  }

  // Let the backend infer the active profile
  saveRestaurant(undefined, payload).catch((err) => {
    console.error("Failed to save restaurant", err);
    btn.textContent = originalText;
    alert("Sorry, something went wrong saving this place.");
  });
});

/**
 * Initial bootstrap: ZIP default, restore state, and optional geo search.
 */
if (!zipEl.value) {
  zipEl.value = getDefaultZip();
}

const restored = restoreSearchState();

if (!restored) {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;
        runSearch();
      },
      () => {
        runSearch();
      }
    );
  } else {
    runSearch();
  }
}

// Manual search trigger
btnSearch.addEventListener("click", (e) => {
  e.preventDefault();
  runSearch();
});

// Enter-to-search on both inputs
[qEl, zipEl].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });
});
