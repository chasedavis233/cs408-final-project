// js/lists.js — render Tried / To-try / Favorites from backend

(function () {
  const api = window.BiteRecAPI || {};
  const { fetchRestaurants } = api;

  const triedPanel = document.getElementById("panel-tried");
  const tryPanel = document.getElementById("panel-try");
  const favPanel = document.getElementById("panel-fav");

  const msgTried = document.getElementById("msg-tried");
  const msgTry = document.getElementById("msg-try");
  const msgFav = document.getElementById("msg-fav");

  const tabTried = document.getElementById("tab-tried");
  const tabTry = document.getElementById("tab-try");
  const tabFav = document.getElementById("tab-fav");

  function getProfileId() {
    if (
      window.BiteRecStore &&
      typeof window.BiteRecStore.getActiveProfileId === "function"
    ) {
      return window.BiteRecStore.getActiveProfileId();
    }
    return "household-main";
  }

  // --- Tab switching ---
  function showPanel(which) {
    const map = {
      tried: { tab: tabTried, panel: triedPanel },
      try: { tab: tabTry, panel: tryPanel },
      fav: { tab: tabFav, panel: favPanel },
    };

    Object.entries(map).forEach(([key, { tab, panel }]) => {
      const active = key === which;
      if (tab) {
        tab.classList.toggle("is-selected", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      }
      if (panel) {
        panel.hidden = !active;
      }
    });
  }

  if (tabTried) tabTried.addEventListener("click", () => showPanel("tried"));
  if (tabTry) tabTry.addEventListener("click", () => showPanel("try"));
  if (tabFav) tabFav.addEventListener("click", () => showPanel("fav"));

  // --- Rendering helpers ---
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function cardHtml(r) {
    const name = escapeHtml(r.name || "Restaurant");
    const city = escapeHtml(r.city || "");
    const cuisine = escapeHtml(r.cuisine || "");
    const rating =
      typeof r.rating === "number" ? r.rating.toFixed(1) : null;

    return `
      <article class="entry">
        <div class="entry-media">
          <div style="width:100%;height:100%;background:rgba(15,23,42,0.9);display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:#94a3b8;">
            ${cuisine || "restaurant"}
          </div>
        </div>
        <div class="entry-body">
          <h3>${name}</h3>
          <div class="row">
            ${cuisine ? `<span class="chip">${cuisine}</span>` : ""}
            ${city ? `<span class="chip">${city}</span>` : ""}
            ${
              rating != null
                ? `<span class="chip">Rating: ${rating} / 10</span>`
                : ""
            }
          </div>
        </div>
        <div class="entry-right"></div>
      </article>
    `;
  }

  function renderList(panel, msgEl, list, emptyText) {
    if (!panel || !msgEl) return;

    if (!list || list.length === 0) {
      panel.innerHTML = "";
      msgEl.textContent = emptyText;
      msgEl.hidden = false;
      return;
    }

    msgEl.hidden = true;
    panel.innerHTML = list.map(cardHtml).join("");
  }

  function normalizeRestaurantArray(raw) {
    // Try a bunch of common shapes
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== "object") return [];

    // common wrappers
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.restaurants)) return raw.restaurants;
    if (Array.isArray(raw.data)) return raw.data;

    // last resort: any array-like property
    const firstArrayKey = Object.keys(raw).find(
      (k) => Array.isArray(raw[k])
    );
    if (firstArrayKey) return raw[firstArrayKey];

    return [];
  }

  // --- Load data from backend ---
  async function loadLists() {
    if (!fetchRestaurants) {
      console.warn("BiteRecAPI.fetchRestaurants is not available");
      return;
    }

    const profileId = getProfileId();

    msgTried.textContent = "Loading…";
    msgTry.textContent = "Loading…";
    msgFav.textContent = "Loading…";

    try {
      const raw = await fetchRestaurants(profileId, {});
      console.log("Restaurants response from backend:", raw);

      const all = normalizeRestaurantArray(raw);
      console.log("Normalized restaurant list:", all);

      const tried = all.filter((r) => r.status === "tried");
      const toTry = all.filter((r) => r.status === "want");
      const favs = all.filter((r) => r.isFavorite || r.favorite);

      renderList(
        triedPanel,
        msgTried,
        tried,
        "You haven’t logged any tried places yet."
      );
      renderList(
        tryPanel,
        msgTry,
        toTry,
        "Your To-try list is empty. Add some spots from Explore!"
      );
      renderList(
        favPanel,
        msgFav,
        favs,
        "Mark places as favorites to see them here."
      );

      showPanel("tried");
    } catch (err) {
      console.error("Failed to load restaurants", err);
      msgTried.textContent = "Could not load restaurants.";
      msgTry.textContent = "Could not load restaurants.";
      msgFav.textContent = "Could not load restaurants.";
    }
  }

  loadLists();
})();
