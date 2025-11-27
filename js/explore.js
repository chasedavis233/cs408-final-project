// js/explore.js — Explore page wired to BiteRec SearchPlaces Lambda

const resultsEl = document.getElementById("results");
const emptyMsg  = document.getElementById("explore-empty");
const qEl       = document.getElementById("q");
const zipEl     = document.getElementById("zip");
const btnSearch = document.getElementById("btnSearch");

// pull APIs off the BiteRecAPI object from api.js
const { searchPlaces, saveRestaurant } = window.BiteRecAPI || {};

let userLat = null;
let userLon = null;
let lastPlaces = [];

// ---- Distance helpers ----
function distanceMiles(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null
  ) return null;

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

function formatDistance(mi) {
  if (mi == null) return "";
  const n = Number(mi);
  if (!Number.isFinite(n)) return "";
  if (n < 0.2) return "≈0.2 mi from you";
  if (n < 1) return `${n.toFixed(1)} mi from you`;
  if (n < 10) return `${n.toFixed(1)} mi from you`;
  return `${Math.round(n)} mi from you`;
}

function addUserDistance(places) {
  if (userLat == null || userLon == null) return places;
  return places.map((p) => {
    const d = distanceMiles(userLat, userLon, p.lat, p.lon);
    return { ...p, distanceFromUserMi: d };
  });
}

// ---- Card rendering ----
function cardHTML(p) {
  const name    = p.name || "Restaurant";
  const cuisine = p.cuisine || p.amenity || "Restaurant";
  const city    = p.city || "";
  const distLbl = formatDistance(p.distanceFromUserMi);

  const id = p.externalId || p.id || "";

  const url = new URL("place.html", window.location.origin);
  const params = url.searchParams;

  params.set("id", id);
  params.set("name", name);
  params.set("cuisine", cuisine);

  if (p.housenumber) params.set("housenumber", p.housenumber);
  if (p.street)     params.set("street", p.street);
  if (p.city)       params.set("city", p.city);
  if (p.state)      params.set("state", p.state);
  if (p.postcode)   params.set("postcode", p.postcode);

  if (p.phone)        params.set("phone", p.phone);
  if (p.website)      params.set("website", p.website);
  if (p.email)        params.set("email", p.email);
  if (p.openingHours) params.set("openingHours", p.openingHours);

  if (p.takeaway)     params.set("takeaway", p.takeaway);
  if (p.delivery)     params.set("delivery", p.delivery);
  if (p.driveThrough) params.set("driveThrough", p.driveThrough);

  // Pass both the raw miles and the pretty label to place.html
  if (p.distanceFromUserMi != null) {
    params.set("distanceMi", p.distanceFromUserMi.toString());
  }
  if (distLbl) {
    params.set("dist", distLbl);
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
            >
              ＋ To-try
            </button>
            <button
              type="button"
              class="btn-add btn-tag btn-tag--tried"
              data-add-action="tried"
              data-place-id="${id}"
            >
              ✓ Tried
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

function render(list) {
  if (!list || list.length === 0) {
    resultsEl.innerHTML =
      '<p class="muted">No restaurants found. Try another ZIP or search term.</p>';
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  }

  if (emptyMsg) emptyMsg.hidden = true;
  resultsEl.innerHTML = list.map(cardHTML).join("");
}

// ---- Search ----
async function runSearch() {
  if (!searchPlaces) {
    console.error("BiteRecAPI.searchPlaces is not available");
    return;
  }

  const q   = qEl.value.trim();
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
  } catch (err) {
    console.error("search error", err);
    resultsEl.innerHTML =
      '<p class="muted">Search failed. Please try again later.</p>';
    if (emptyMsg) emptyMsg.hidden = false;
  }
}

// ---- Auto-add to lists from card buttons ----
resultsEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-add-action]");
  if (!btn) return;

  e.preventDefault();          // don’t navigate to place.html
  e.stopPropagation();

  if (!saveRestaurant) {
    console.warn("saveRestaurant not available on BiteRecAPI");
    return;
  }

  const action  = btn.dataset.addAction; // "want" or "tried"
  const placeId = btn.dataset.placeId;

  const place = lastPlaces.find(
    (p) => (p.externalId || p.id || "") === placeId
  );
  if (!place) return;

  const profileId =
    (window.BiteRecStore &&
      typeof window.BiteRecStore.getActiveProfileId === "function" &&
      window.BiteRecStore.getActiveProfileId()) ||
    "household-main";

  const restaurantId = place.externalId || place.id || `osm-${Date.now()}`;

  const payload = {
    restaurantId,
    externalId: place.externalId || place.id || null,
    name: place.name || "Restaurant",
    city: place.city || "",
    cuisine: place.cuisine || place.amenity || "Restaurant",
    status: action === "tried" ? "tried" : "want",
  };

  try {
    await saveRestaurant(profileId, payload);
    // Tiny bit of feedback
    if (action === "tried") {
      btn.textContent = "✓ Added";
    } else {
      btn.textContent = "Saved";
    }
  } catch (err) {
    console.error("Failed to save restaurant", err);
  }
});

// ---- Init ----
if (!zipEl.value) zipEl.value = "83702";

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

btnSearch.addEventListener("click", (e) => {
  e.preventDefault();
  runSearch();
});

[qEl, zipEl].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });
});
