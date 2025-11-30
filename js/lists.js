// Render Tried / To-try / Favorites lists with modals and custom add
(function () {
  const api = window.BiteRecAPI || {};
  const { fetchRestaurants, saveRestaurant, deleteRestaurant } = api;

  const triedPanel = document.getElementById("panel-tried");
  const tryPanel = document.getElementById("panel-try");
  const favPanel = document.getElementById("panel-fav");

  const msgTried = document.getElementById("msg-tried");
  const msgTry = document.getElementById("msg-try");
  const msgFav = document.getElementById("msg-fav");

  const tabTried = document.getElementById("tab-tried");
  const tabTry = document.getElementById("tab-try");
  const tabFav = document.getElementById("tab-fav");

  const btnAddRestaurant = document.getElementById("btnAddRestaurant");

  let currentTab = "tried";

  // ---- Profile helpers ----

  function getProfileId() {
    try {
      if (
        window.BiteRecStore &&
        typeof window.BiteRecStore.getActiveProfileId === "function"
      ) {
        const id = window.BiteRecStore.getActiveProfileId();
        if (id) return id;
      }
    } catch (e) {
      console.warn("getProfileId: BiteRecStore not ready", e);
    }

    try {
      const raw = localStorage.getItem("biterec-profile-state-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.profileId === "string" &&
          parsed.profileId
        ) {
          return parsed.profileId;
        }
      }
    } catch (e) {
      console.warn("getProfileId: localStorage fallback failed", e);
    }

    return "household-main";
  }

  function confirmDeleteEnabled() {
    if (
      window.BiteRecStore &&
      typeof window.BiteRecStore.confirmDeleteEnabled === "function"
    ) {
      return window.BiteRecStore.confirmDeleteEnabled();
    }
    return true;
  }

  // ---- Tab switching ----

  function showPanel(which) {
    currentTab = which;

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

  // ---- Shared modal plumbing ----

  const backdrop = document.getElementById("modal-backdrop");
  const modalTitle = document.getElementById("modal-title");
  const modalText = document.getElementById("modal-text");
  const modalTextarea = document.getElementById("modal-textarea");
  const modalInput = document.getElementById("modal-input");
  const btnCancel = document.getElementById("modal-cancel");
  const btnOk = document.getElementById("modal-ok");

  let modalResolve = null;
  let modalMode = null; // "notes" | "rating" | "confirm" | "input"

  function hideAllInputs() {
    modalTextarea.hidden = true;
    modalInput.hidden = true;
  }

  function closeModal(result) {
    if (!backdrop) return;
    backdrop.hidden = true;
    hideAllInputs();
    modalMode = null;

    if (modalResolve) {
      modalResolve(result);
      modalResolve = null;
    }
  }

  function openModal({ title, text, mode, initial = "" }) {
    if (!backdrop) return Promise.resolve({ ok: false });

    modalMode = mode;
    modalTitle.textContent = title || "BiteRec";
    modalText.textContent = text || "";

    hideAllInputs();

    if (mode === "notes") {
      modalTextarea.hidden = false;
      modalTextarea.value = initial || "";
      setTimeout(() => modalTextarea.focus(), 10);
    } else if (mode === "rating") {
      modalInput.hidden = false;
      modalInput.type = "number";
      modalInput.min = "1";
      modalInput.max = "10";
      modalInput.step = "0.1";
      modalInput.value =
        typeof initial === "number" && !Number.isNaN(initial)
          ? initial.toString()
          : "8.0";
      setTimeout(() => modalInput.focus(), 10);
    } else if (mode === "input") {
      modalInput.hidden = false;
      modalInput.type = "text";
      modalInput.value = initial || "";
      modalInput.placeholder = "Type here…";
      setTimeout(() => modalInput.focus(), 10);
    }

    backdrop.hidden = false;

    return new Promise((resolve) => {
      modalResolve = resolve;
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      closeModal({ ok: false });
    });
  }

  if (btnOk) {
    btnOk.addEventListener("click", () => {
      let value = null;
      if (modalMode === "notes") {
        value = modalTextarea.value || "";
      } else if (modalMode === "rating") {
        const num = parseFloat(modalInput.value);
        if (!Number.isFinite(num)) {
          value = null;
        } else {
          value = Math.max(1, Math.min(10, num));
        }
      } else if (modalMode === "input") {
        value = modalInput.value || "";
      }
      closeModal({ ok: true, value });
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeModal({ ok: false });
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop && !backdrop.hidden) {
      closeModal({ ok: false });
    }
  });

  // ---- Add-restaurant modal ----

  const addBackdrop = document.getElementById("add-modal-backdrop");
  const addNameEl = document.getElementById("add-name");
  const addLocationEl = document.getElementById("add-location");
  const addStatusEl = document.getElementById("add-status");
  const addRatingEl = document.getElementById("add-rating");
  const addCancel = document.getElementById("add-modal-cancel");
  const addOk = document.getElementById("add-modal-ok");

  function openAddModal() {
    if (!addBackdrop) return;

    if (currentTab === "try") {
      addStatusEl.value = "want";
    } else {
      addStatusEl.value = "tried";
    }

    addNameEl.value = "";
    addLocationEl.value = "";
    addRatingEl.value = "";

    addBackdrop.hidden = false;
    setTimeout(() => addNameEl.focus(), 10);
  }

  function closeAddModal() {
    if (!addBackdrop) return;
    addBackdrop.hidden = true;
  }

  if (btnAddRestaurant) {
    btnAddRestaurant.addEventListener("click", openAddModal);
  }

  if (addCancel) {
    addCancel.addEventListener("click", closeAddModal);
  }

  if (addBackdrop) {
    addBackdrop.addEventListener("click", (e) => {
      if (e.target === addBackdrop) {
        closeAddModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && addBackdrop && !addBackdrop.hidden) {
      closeAddModal();
    }
  });

  if (addOk) {
    addOk.addEventListener("click", async () => {
      const name = (addNameEl.value || "").trim();
      const location = (addLocationEl.value || "").trim();
      const status = addStatusEl.value || "tried";
      const ratingStr = (addRatingEl.value || "").trim();

      if (!name) {
        addNameEl.focus();
        return;
      }

      const rating =
        ratingStr === ""
          ? undefined
          : Number.isFinite(Number(ratingStr))
          ? Number(ratingStr)
          : undefined;

      const profileId = getProfileId();
      try {
        await saveRestaurant(profileId, {
          name,
          status,
          address: location || undefined,
          rating,
          isFavorite: false,
        });
        await loadLists();
      } catch (err) {
        console.error("Failed to add restaurant", err);
        alert("Failed to add restaurant.");
      } finally {
        closeAddModal();
      }
    });
  }

  // ---- Rendering helpers ----

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function summarizeNotes(notes) {
    const s = (notes || "").trim();
    if (!s) return "";
    if (s.length <= 80) return s;
    return s.slice(0, 77) + "...";
  }

  function cardHtml(r, listType) {
    const name = escapeHtml(r.name || "Restaurant");
    const city = escapeHtml(r.city || r.address || "");
    const cuisine = escapeHtml(r.cuisine || "");
    const rating =
      typeof r.rating === "number" && !Number.isNaN(r.rating)
        ? r.rating.toFixed(1)
        : null;

    const notesSummary = summarizeNotes(r.notes);
    const isFav = !!(r.favorite || r.isFavorite);

    const showRatingChip = rating != null;
    const showRemove = listType === "tried" || listType === "try";

    const listLabel =
      listType === "tried"
        ? "Tried"
        : listType === "try"
        ? "To-Try"
        : "Favorite";

    const showEditRating =
      listType === "tried" || listType === "fav";

    return `
      <article
        class="entry"
        data-restaurant-id="${escapeHtml(r.restaurantId || "")}"
        data-list-type="${listType}"
      >
        <div class="entry-media">
          <div class="entry-media-top">
            <div class="entry-media-name">${name}</div>
            <span class="entry-media-pill">${listLabel}</span>
          </div>
          <div class="entry-media-sub">
            ${
              city || cuisine
                ? [cuisine, city].filter(Boolean).join(" • ")
                : "No location saved yet"
            }
          </div>
        </div>

        <div class="entry-body">
          <div class="row row-meta">
            ${
              showRatingChip
                ? `<span class="chip chip-rating">Rating: ${rating} / 10</span>`
                : ""
            }
            ${
              isFav
                ? `<span class="chip chip-fav">★ Favorite</span>`
                : ""
            }
          </div>
          ${
            notesSummary
              ? `<p class="small-label">Notes: ${escapeHtml(notesSummary)}</p>`
              : `<p class="small-label">No notes yet.</p>`
          }
        </div>

        <div class="entry-right">
          ${
            showEditRating
              ? `<button class="chip" data-action="edit-rating">Edit rating</button>`
              : ""
          }
          <button class="chip" data-action="notes">Notes</button>
          <button
            class="chip btn-fav ${isFav ? "is-fav" : ""}"
            data-action="toggle-fav"
          >
            ${isFav ? "★ Favorite" : "☆ Favorite"}
          </button>
          ${
            listType === "try"
              ? `<button class="chip" data-action="move-to-tried">Move to Tried</button>`
              : ""
          }
          ${
            showRemove
              ? `<button class="chip chip-danger" data-action="remove">Remove</button>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderList(panel, msgEl, list, emptyText, listType) {
    if (!panel || !msgEl) return;

    if (!list || list.length === 0) {
      panel.innerHTML = "";
      msgEl.textContent = emptyText;
      msgEl.hidden = false;
      return;
    }

    msgEl.hidden = true;
    panel.innerHTML = list.map((r) => cardHtml(r, listType)).join("");
  }

  // ---- Normalization helpers ----

  function normalizeRestaurantArray(raw) {
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return normalizeRestaurantArray(parsed);
      } catch {
        return [];
      }
    }

    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== "object") return [];

    if (Array.isArray(raw.restaurants)) return raw.restaurants;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.data)) return raw.data;

    const firstArrayKey = Object.keys(raw).find((k) => Array.isArray(raw[k]));
    if (firstArrayKey) return raw[firstArrayKey];

    return [];
  }

  function normalizeStatus(status, visited) {
    const s = (status || "").toString().toLowerCase().trim();

    if (s === "tried" || s === "visited") return "tried";
    if (s === "want" || s === "to-try" || s === "to try") return "want";

    if (!s && visited === true) return "tried";

    return s || "want";
  }

  // ---- Load data from backend (with race protection) ----

  let allRestaurants = [];
  let loadSeq = 0;

  async function loadLists() {
    if (!fetchRestaurants) {
      console.warn("BiteRecAPI.fetchRestaurants is not available");
      return;
    }

    const profileId = getProfileId();
    const activeProfile = profileId || "household-main";
    const seq = ++loadSeq;

    msgTried.textContent = "Loading…";
    msgTry.textContent = "Loading…";
    msgFav.textContent = "Loading…";

    try {
      const raw = await fetchRestaurants(profileId, {});

      if (seq !== loadSeq) {
        return;
      }

      const allRaw = normalizeRestaurantArray(raw);

      const anyProfileIds = allRaw.some(
        (r) =>
          r &&
          typeof r.profileId === "string" &&
          r.profileId.trim() !== ""
      );

      let filtered = allRaw;

      if (anyProfileIds) {
        filtered = allRaw.filter((r) => {
          const rowProfile = (r.profileId || "household-main").trim();
          return rowProfile === activeProfile;
        });
      } else if (activeProfile !== "household-main") {
        filtered = [];
      }

      allRestaurants = filtered.map((r) => ({
        ...r,
        status: normalizeStatus(r.status, r.visited),
      }));

      const tried = allRestaurants.filter((r) => r.status === "tried");
      const toTry = allRestaurants.filter((r) => r.status === "want");
      const favs = allRestaurants.filter((r) => r.isFavorite || r.favorite);

      renderList(
        triedPanel,
        msgTried,
        tried,
        "You haven’t logged any tried places yet.",
        "tried"
      );
      renderList(
        tryPanel,
        msgTry,
        toTry,
        "Your To-Try list is empty. Add some spots from Explore or the Add button!",
        "try"
      );
      renderList(
        favPanel,
        msgFav,
        favs,
        "Mark places as favorites to see them here.",
        "fav"
      );

      showPanel(currentTab);
    } catch (err) {
      console.error("Failed to load restaurants", err);
      if (seq !== loadSeq) return;
      msgTried.textContent = "Could not load restaurants.";
      msgTry.textContent = "Could not load restaurants.";
      msgFav.textContent = "Could not load restaurants.";
    }
  }

  // ---- Single-restaurant helpers ----

  function findRestaurantById(restaurantId) {
    return allRestaurants.find((r) => r.restaurantId === restaurantId);
  }

  async function updateRestaurant(r, patch) {
    if (!saveRestaurant) return;
    const profileId = getProfileId();
    const payload = { ...r, ...patch };
    await saveRestaurant(profileId, payload);
    await loadLists();
  }

  async function removeRestaurant(r) {
    if (!deleteRestaurant || !r.restaurantId) {
      console.warn("Cannot delete restaurant – missing API or id", r);
      return;
    }

    const profileId = getProfileId();

    try {
      await deleteRestaurant(profileId, r.restaurantId);
    } catch (err) {
      console.error("deleteRestaurant failed", err);
    }

    await loadLists();
  }

  // ---- Click handling ----

  function handlePanelClick(e) {
    const chip = e.target.closest(".chip[data-action]");
    if (!chip) return;

    const action = chip.dataset.action;
    const entry = chip.closest(".entry");
    if (!entry) return;

    const restaurantId = entry.dataset.restaurantId;
    const listType = entry.dataset.listType;
    const r = findRestaurantById(restaurantId);
    if (!r) {
      console.warn("Could not find restaurant for id", restaurantId);
      return;
    }

    if (action === "edit-rating") {
      (async () => {
        const current =
          typeof r.rating === "number" && !Number.isNaN(r.rating)
            ? r.rating
            : 8.0;

        const result = await openModal({
          title: `Edit rating — ${r.name || "Restaurant"}`,
          text: "Rate this place from 1.0 to 10.0.",
          mode: "rating",
          initial: current,
        });

        if (!result.ok || result.value == null) return;

        await updateRestaurant(r, { rating: result.value });
      })();
    }

    if (action === "notes") {
      (async () => {
        const result = await openModal({
          title: `Notes — ${r.name || "Restaurant"}`,
          text: "Add notes you want to remember for this place.",
          mode: "notes",
          initial: r.notes || "",
        });

        if (!result.ok) return;

        await updateRestaurant(r, { notes: result.value || "" });
      })();
    }

    if (action === "toggle-fav") {
      (async () => {
        const newFav = !(r.favorite || r.isFavorite);
        await updateRestaurant(r, { favorite: newFav, isFavorite: newFav });
      })();
    }

    if (action === "move-to-tried") {
      (async () => {
        if (!confirmDeleteEnabled()) {
          await updateRestaurant(r, { status: "tried" });
          return;
        }

        const result = await openModal({
          title: "Move to Tried",
          text: `Move "${r.name || "this place"}" to your Tried list?`,
          mode: "confirm",
        });

        if (!result.ok) return;

        await updateRestaurant(r, { status: "tried" });
      })();
    }

    if (action === "remove") {
      (async () => {
        if (!confirmDeleteEnabled()) {
          await removeRestaurant(r);
          return;
        }

        const friendlyList =
          listType === "tried" ? "Tried" : listType === "try" ? "To-Try" : "";
        const result = await openModal({
          title: "Remove from list?",
          text: `Remove "${
            r.name || "this place"
          }" from your ${friendlyList || "current"} list?`,
          mode: "confirm",
        });

        if (!result.ok) return;

        await removeRestaurant(r);
      })();
    }
  }

  if (triedPanel) triedPanel.addEventListener("click", handlePanelClick);
  if (tryPanel) tryPanel.addEventListener("click", handlePanelClick);
  if (favPanel) favPanel.addEventListener("click", handlePanelClick);

  // ---- Profile change handling ----

  window.addEventListener("biterec:profile-changed", () => {
    currentTab = "tried";
    showPanel("tried");

    allRestaurants = [];
    loadLists();
  });

  // ---- Initial load ----

  showPanel(currentTab);
  loadLists();
})();
