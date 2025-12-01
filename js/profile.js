// Profile page logic for the active BiteRec profile
(function () {
  const api = window.BiteRecAPI || {};
  const { fetchRestaurants, saveRestaurant } = api;
  const store = window.BiteRecStore;

  if (!store) {
    console.warn("BiteRecStore is not available on profile page");
  }

  // LocalStorage keys (shared with main.js)
  const PROFILE_STATE_KEY = "biterec-profile-state-v1";
  const PROFILES_KEY = "biterec-profiles-v1";

  // DOM helpers
  const $ = (id) => document.getElementById(id);

  const displayNameEl = $("displayName");
  const avatarTextEl = $("avatarText");
  const avatarBoxEl = $("avatarBox");
  const defaultZipEl = $("defaultZip");
  const confirmDeleteEl = $("confirmDelete");
  const greetingEl = $("greeting");

  const statSavedEl = $("statSaved");
  const statTriedEl = $("statTried");
  const statToTryEl = $("statToTry");
  const statFavsEl = $("statFavs");

  const btnSave = $("btnSave");
  const btnExport = $("btnExport");
  const btnErase = $("btnErase");
  const btnDeleteProfile = $("btnDeleteProfile");
  const importFile = $("importFile");

  function getDefaultProfileState() {
    return {
      displayName: "",
      initials: "BR",
      defaultZip: "83702",
      confirmDelete: true,
    };
  }

  // Reusable confirm modal for destructive actions
  let confirmOverlay = null;
  let confirmDialog = null;
  let confirmTitleEl = null;
  let confirmTextEl = null;
  let confirmCancelBtn = null;
  let confirmOkBtn = null;
  let confirmResolve = null;
  let confirmActive = false;

  function ensureConfirmModal() {
    if (confirmOverlay) return;

    confirmOverlay = document.createElement("div");
    confirmOverlay.style.position = "fixed";
    confirmOverlay.style.inset = "0";
    confirmOverlay.style.background = "rgba(15,23,42,0.78)";
    confirmOverlay.style.display = "flex";
    confirmOverlay.style.alignItems = "center";
    confirmOverlay.style.justifyContent = "center";
    confirmOverlay.style.zIndex = "2100";
    confirmOverlay.style.backdropFilter = "blur(8px)";
    confirmOverlay.style.opacity = "0";
    confirmOverlay.style.pointerEvents = "none";
    confirmOverlay.style.transition = "opacity 0.18s ease-out";

    confirmOverlay.addEventListener("click", (e) => {
      if (e.target === confirmOverlay) {
        closeConfirmModal({ ok: false });
      }
    });

    confirmDialog = document.createElement("div");
    confirmDialog.style.background = "rgba(15,17,22,0.98)";
    confirmDialog.style.borderRadius = "18px";
    confirmDialog.style.border = "1px solid rgba(249,115,22,0.7)";
    confirmDialog.style.boxShadow = "0 24px 60px rgba(0,0,0,0.85)";
    confirmDialog.style.padding = "18px 20px 16px";
    confirmDialog.style.width = "min(360px, 92vw)";
    confirmDialog.style.color = "#e5e7eb";
    confirmDialog.style.fontSize = "0.95rem";

    confirmDialog.innerHTML = `
      <h2 id="profileConfirmTitle"
          style="font-size:1.05rem;margin:0 0 6px;font-weight:700;">
        Confirm
      </h2>
      <p id="profileConfirmText"
         style="margin:0 0 14px;font-size:0.9rem;color:#cbd5f5;">
        Are you sure?
      </p>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
        <button type="button" id="profileConfirmCancel"
          style="border-radius:999px;border:0;background:transparent;
                 color:#9ca3af;font-size:0.9rem;padding:6px 10px;cursor:pointer;">
          Cancel
        </button>
        <button type="button" id="profileConfirmOk"
          style="border-radius:999px;border:0;background:#f97316;
                 color:#0b0f13;font-size:0.9rem;font-weight:600;
                 padding:7px 14px;cursor:pointer;">
          Yes
        </button>
      </div>
    `;

    confirmOverlay.appendChild(confirmDialog);
    document.body.appendChild(confirmOverlay);

    confirmTitleEl = confirmDialog.querySelector("#profileConfirmTitle");
    confirmTextEl = confirmDialog.querySelector("#profileConfirmText");
    confirmCancelBtn = confirmDialog.querySelector("#profileConfirmCancel");
    confirmOkBtn = confirmDialog.querySelector("#profileConfirmOk");

    confirmCancelBtn.addEventListener("click", () => {
      closeConfirmModal({ ok: false });
    });

    confirmOkBtn.addEventListener("click", () => {
      closeConfirmModal({ ok: true });
    });

    document.addEventListener("keydown", (e) => {
      if (!confirmActive) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeConfirmModal({ ok: false });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        closeConfirmModal({ ok: true });
      }
    });
  }

  function openConfirmModal({
    title,
    text,
    okLabel = "Yes",
    cancelLabel = "Cancel",
  }) {
    ensureConfirmModal();

    confirmTitleEl.textContent = title || "Confirm";
    confirmTextEl.textContent = text || "Are you sure?";
    confirmOkBtn.textContent = okLabel;
    confirmCancelBtn.textContent = cancelLabel;

    confirmOverlay.style.pointerEvents = "auto";
    confirmOverlay.style.opacity = "1";
    confirmActive = true;

    return new Promise((resolve) => {
      confirmResolve = resolve;
    });
  }

  function closeConfirmModal(result) {
    if (!confirmOverlay) return;
    confirmOverlay.style.opacity = "0";
    confirmOverlay.style.pointerEvents = "none";
    confirmActive = false;

    if (confirmResolve) {
      confirmResolve(result || { ok: false });
      confirmResolve = null;
    }
  }

  // Sync form fields with active profile
  function paintProfile() {
    const state = store ? store.getProfileState() : getDefaultProfileState();

    if (displayNameEl) displayNameEl.value = state.displayName || "";
    if (avatarTextEl) avatarTextEl.value = state.initials || "BR";
    if (avatarBoxEl) {
      avatarBoxEl.textContent = (state.initials || "BR").toUpperCase();
    }
    if (defaultZipEl) defaultZipEl.value = state.defaultZip || "83702";
    if (confirmDeleteEl) {
      confirmDeleteEl.checked = state.confirmDelete !== false;
    }

    if (greetingEl) {
      if (state.displayName) {
        greetingEl.textContent = `${state.displayName}'s Profile`;
      } else {
        greetingEl.textContent = "Your Profile";
      }
    }
  }

  // Live avatar initials preview
  if (avatarTextEl && avatarBoxEl) {
    avatarTextEl.addEventListener("input", () => {
      const text = (avatarTextEl.value || "BR").toUpperCase();
      avatarBoxEl.textContent = text;
    });
  }

  // Save profile changes (name, initials, zip, confirm toggle)
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      if (!store) return;
      const displayName = (displayNameEl?.value || "").trim();
      const initials = ((avatarTextEl?.value || "").trim() || "BR").toUpperCase();
      const zip = (defaultZipEl?.value || "").trim() || "83702";

      store.updateProfile({
        displayName,
        initials,
        defaultZip: zip,
        confirmDelete: !!(confirmDeleteEl && confirmDeleteEl.checked),
      });

      paintProfile();
      alert("Profile settings saved for this profile.");
    });
  }

  // Refresh when active profile changes from navbar
  window.addEventListener("biterec:profile-changed", () => {
    paintProfile();
    loadStats();
  });

  // Normalize status labels for stats:
  // Only "tried" and "want" are treated as real list entries.
  function normalizeStatus(status) {
    const s = (status || "").toString().toLowerCase().trim();

    if (s === "tried" || s === "visited") return "tried";
    if (s === "want" || s === "to-try" || s === "to try") return "want";

    // Anything else is treated as "none" and won't be counted in stats.
    return "none";
  }

  // Load restaurant counts for the active profile
  async function loadStats() {
    if (!fetchRestaurants || !store) {
      console.warn("Stats: missing BiteRecAPI.fetchRestaurants or BiteRecStore");
      return;
    }

    const profileId = store.getActiveProfileId();
    try {
      const raw = await fetchRestaurants(profileId, {});
      let list = [];
      if (Array.isArray(raw)) list = raw;
      else if (Array.isArray(raw.restaurants)) list = raw.restaurants;
      else if (Array.isArray(raw.items)) list = raw.items;
      else if (Array.isArray(raw.data)) list = raw.data;

      const normalized = list.map((r) => ({
        ...r,
        status: normalizeStatus(r.status),
      }));

      // Only count restaurants that actually live in a list (tried / to-try)
      const usable = normalized.filter(
        (r) => r.status === "tried" || r.status === "want"
      );

      const saved = usable.length;
      const tried = usable.filter((r) => r.status === "tried").length;
      const toTry = usable.filter((r) => r.status === "want").length;
      const favs = usable.filter(
        (r) =>
          (r.isFavorite || r.favorite) &&
          (r.status === "tried" || r.status === "want")
      ).length;

      if (statSavedEl) statSavedEl.textContent = saved;
      if (statTriedEl) statTriedEl.textContent = tried;
      if (statToTryEl) statToTryEl.textContent = toTry;
      if (statFavsEl) statFavsEl.textContent = favs;
    } catch (err) {
      console.error("Failed to load stats", err);
      if (statSavedEl) statSavedEl.textContent = "0";
      if (statTriedEl) statTriedEl.textContent = "0";
      if (statToTryEl) statToTryEl.textContent = "0";
      if (statFavsEl) statFavsEl.textContent = "0";
    }
  }

  // Export profile + optional restaurant list as JSON
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const state = store ? store.getProfileState() : {};
      const payload = {
        profile: state,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "biterec-profile-export.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import profile + restaurants from export JSON
  if (importFile) {
    importFile.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        if (imported.profile && store) {
          store.updateProfile(imported.profile);
          paintProfile();
        }

        if (
          imported.restaurants &&
          saveRestaurant &&
          Array.isArray(imported.restaurants) &&
          store
        ) {
          const profileId = store.getActiveProfileId();
          for (const r of imported.restaurants) {
            const payload = { ...r };
            await saveRestaurant(profileId, payload);
          }
          await loadStats();
        }

        alert("Import complete.");
      } catch (err) {
        console.error("Import failed", err);
        alert("Import failed. Make sure this is a BiteRec export JSON file.");
      } finally {
        e.target.value = "";
      }
    });
  }

  // Reset this profile's local settings (keeps AWS data)
  if (btnErase) {
    btnErase.addEventListener("click", async () => {
      if (!store) return;

      const result = await openConfirmModal({
        title: "Erase local profile settings?",
        text: "This will reset the name, initials, ZIP, and confirmation preference for this profile on this device. Your restaurant lists in AWS will not be deleted.",
        okLabel: "Erase settings",
        cancelLabel: "Cancel",
      });

      if (!result.ok) return;

      store.updateProfile({
        displayName: "",
        initials: "BR",
        defaultZip: "83702",
        confirmDelete: true,
      });
      paintProfile();
      alert("Local profile settings for this profile have been reset.");
    });
  }

  // Prefer BiteRecStore.deleteProfile when available
  function deleteProfileViaStore(profileId) {
    if (!store || typeof store.deleteProfile !== "function") return false;
    return store.deleteProfile(profileId);
  }

  // Fallback: remove profile directly from localStorage
  function deleteProfileFromLocalStorage(profileId) {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || list.length <= 1) {
        return false;
      }

      const idx = list.findIndex((p) => p && p.id === profileId);
      if (idx === -1) {
        return false;
      }

      list.splice(idx, 1);
      localStorage.setItem(PROFILES_KEY, JSON.stringify(list));

      const stateRaw = localStorage.getItem(PROFILE_STATE_KEY);
      let state = stateRaw ? JSON.parse(stateRaw) : {};
      if (!state || typeof state !== "object") state = {};

      if (!state.profileId || state.profileId === profileId) {
        const fallback = list[0];
        if (fallback) {
          state = {
            profileId: fallback.id,
            displayName: fallback.displayName || "",
            initials: (fallback.initials || "BR").toUpperCase(),
            defaultZip: fallback.defaultZip || "83702",
            confirmDelete: fallback.confirmDelete !== false,
          };
          localStorage.setItem(PROFILE_STATE_KEY, JSON.stringify(state));

          if (store && typeof store.switchProfile === "function") {
            store.switchProfile(fallback.id);
          }
        }
      }

      return true;
    } catch (err) {
      console.error("deleteProfileFromLocalStorage failed", err);
      return false;
    }
  }

  // Delete current profile and switch to another
  if (btnDeleteProfile) {
    btnDeleteProfile.addEventListener("click", async () => {
      if (!store) return;

      const state = store.getProfileState();
      const id = state.profileId;
      const label = state.displayName || state.profileId || "this profile";

      if (!id) {
        alert("Cannot determine which profile to delete.");
        return;
      }

      const result = await openConfirmModal({
        title: "Delete profile?",
        text: `Delete "${label}" from this browser? Your restaurant data in AWS will be kept, but this profile will be removed from the profile switcher.`,
        okLabel: "Delete profile",
        cancelLabel: "Cancel",
      });

      if (!result.ok) return;

      let ok = deleteProfileViaStore(id);
      if (!ok) {
        ok = deleteProfileFromLocalStorage(id);
      }

      if (!ok) {
        alert(
          "You must keep at least one profile. Create another profile first if you want to delete this one."
        );
        return;
      }

      paintProfile();
      loadStats();
      alert("Profile deleted. Switched to another existing profile.");
    });
  }

  // Initial paint + stats load
  paintProfile();
  loadStats();
})();
