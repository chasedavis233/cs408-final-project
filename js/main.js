// Main shared UI logic: profile store + nav + hero stats
import { $, $$, toggleFav, data } from "./proto.js";

// Profile store backed by localStorage
const PROFILE_STATE_KEY = "biterec-profile-state-v1";
const PROFILES_KEY = "biterec-profiles-v1";

// Load the active profile descriptor
function loadProfileState() {
  try {
    const raw = localStorage.getItem(PROFILE_STATE_KEY);
    if (!raw) {
      return {
        profileId: "household-main",
        displayName: "",
        initials: "BR",
        defaultZip: "83702",
        confirmDelete: true,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      profileId: parsed.profileId || "household-main",
      displayName: parsed.displayName || "",
      initials: (parsed.initials || "BR").toUpperCase(),
      defaultZip: parsed.defaultZip || "83702",
      confirmDelete:
        typeof parsed.confirmDelete === "boolean"
          ? parsed.confirmDelete
          : true,
    };
  } catch {
    return {
      profileId: "household-main",
      displayName: "",
      initials: "BR",
      defaultZip: "83702",
      confirmDelete: true,
    };
  }
}

let profileState = loadProfileState();

// Load list of saved profiles, seeding a default if needed
function loadProfilesList() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      const seed = [
        {
          id: profileState.profileId || "household-main",
          displayName: profileState.displayName || "Profile 1",
          initials: (profileState.initials || "BR").toUpperCase(),
          defaultZip: profileState.defaultZip || "83702",
          confirmDelete: profileState.confirmDelete !== false,
        },
      ];
      localStorage.setItem(PROFILES_KEY, JSON.stringify(seed));
      return seed;
    }

    let parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) parsed = [];

    let cleaned = parsed.filter(
      (p) => p && typeof p.id === "string" && p.id.trim() !== ""
    );

    if (cleaned.length > 1) {
      cleaned = cleaned.filter(
        (p) =>
          !(
            p.id === "household-main" &&
            (!p.displayName || !p.displayName.trim()) &&
            (!p.initials || p.initials.toUpperCase() === "BR")
          )
      );
    }

    if (cleaned.length === 0) {
      const seed = [
        {
          id: profileState.profileId || "household-main",
          displayName: profileState.displayName || "Profile 1",
          initials: (profileState.initials || "BR").toUpperCase(),
          defaultZip: profileState.defaultZip || "83702",
          confirmDelete: profileState.confirmDelete !== false,
        },
      ];
      localStorage.setItem(PROFILES_KEY, JSON.stringify(seed));
      return seed;
    }

    localStorage.setItem(PROFILES_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    const seed = [
      {
        id: profileState.profileId || "household-main",
        displayName: profileState.displayName || "Profile 1",
        initials: (profileState.initials || "BR").toUpperCase(),
        defaultZip: profileState.defaultZip || "83702",
        confirmDelete: profileState.confirmDelete !== false,
      },
    ];
    localStorage.setItem(PROFILES_KEY, JSON.stringify(seed));
    return seed;
  }
}

let profiles = loadProfilesList();

// Ensure active profile refers to an existing profile
if (!profiles.some((p) => p.id === (profileState.profileId || ""))) {
  const first = profiles[0];
  profileState = {
    profileId: first.id,
    displayName: first.displayName || "",
    initials: (first.initials || "BR").toUpperCase(),
    defaultZip: first.defaultZip || "83702",
    confirmDelete: first.confirmDelete !== false,
  };
  localStorage.setItem(PROFILE_STATE_KEY, JSON.stringify(profileState));
}

function saveProfileState() {
  localStorage.setItem(PROFILE_STATE_KEY, JSON.stringify(profileState));
}

function saveProfilesList() {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

// Keep active profile info mirrored into the profiles list
function syncActiveProfileIntoList() {
  const id = profileState.profileId || "household-main";
  const idx = profiles.findIndex((p) => p.id === id);
  const base = {
    id,
    displayName: profileState.displayName || "",
    initials: (profileState.initials || "BR").toUpperCase(),
    defaultZip: profileState.defaultZip || "83702",
    confirmDelete: profileState.confirmDelete !== false,
  };

  if (idx === -1) {
    profiles.push(base);
  } else {
    profiles[idx] = { ...profiles[idx], ...base };
  }
  saveProfilesList();
}

// Notify other pages when the active profile changes
function emitProfileChanged() {
  window.dispatchEvent(
    new CustomEvent("biterec:profile-changed", {
      detail: { state: { ...profileState } },
    })
  );
}

// Central profile API used by the rest of the app
const BiteRecStore = {
  // Read-only accessors
  getProfileState() {
    return { ...profileState };
  },

  getActiveProfileId() {
    return profileState.profileId || "household-main";
  },

  getProfileLabel() {
    if (profileState.displayName) return profileState.displayName;
    return profileState.profileId || "Guest";
  },

  getInitials() {
    return (profileState.initials || "BR").toUpperCase();
  },

  getDefaultZip() {
    return profileState.defaultZip || "83702";
  },

  confirmDeleteEnabled() {
    return profileState.confirmDelete !== false;
  },

  // All known profiles
  listProfiles() {
    return profiles
      .filter(
        (p) => p && typeof p.id === "string" && p.id.trim() !== ""
      )
      .map((p) => ({ ...p }));
  },

  // Update the current profile
  updateProfile(patch) {
    profileState = {
      ...profileState,
      ...patch,
    };

    if (profileState.initials) {
      profileState.initials = profileState.initials.toUpperCase();
    }
    if (!profileState.profileId) {
      profileState.profileId = "household-main";
    }
    if (!profileState.defaultZip) {
      profileState.defaultZip = "83702";
    }

    saveProfileState();
    syncActiveProfileIntoList();
    emitProfileChanged();
  },

  // Create and switch to a new profile
  createProfile(name, initials, defaultZip) {
    const trimmedName = (name || "").trim();
    const baseName = trimmedName || "Profile";

    let idBase = baseName.toLowerCase().replace(/[^\w]+/g, "-");
    idBase = idBase.replace(/^-+|-+$/g, "") || "profile";

    let candidate = idBase;
    let n = 1;
    while (profiles.some((p) => p.id === candidate)) {
      candidate = `${idBase}-${n++}`;
    }

    const init = (initials || baseName.slice(0, 2) || "BR")
      .toUpperCase()
      .slice(0, 3);

    const zip =
      (defaultZip && defaultZip.trim()) ||
      profileState.defaultZip ||
      "83702";

    const newProfile = {
      id: candidate,
      displayName: trimmedName,
      initials: init,
      defaultZip: zip,
      confirmDelete: profileState.confirmDelete !== false,
    };

    profiles.push(newProfile);
    saveProfilesList();

    profileState = {
      profileId: newProfile.id,
      displayName: newProfile.displayName,
      initials: newProfile.initials,
      defaultZip: newProfile.defaultZip,
      confirmDelete: newProfile.confirmDelete,
    };

    saveProfileState();
    emitProfileChanged();
    return { ...newProfile };
  },

  // Switch to an existing profile
  switchProfile(profileId) {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;

    profileState = {
      profileId: target.id,
      displayName: target.displayName || "",
      initials: (target.initials || "BR").toUpperCase(),
      defaultZip: target.defaultZip || "83702",
      confirmDelete: target.confirmDelete !== false,
    };

    saveProfileState();
    emitProfileChanged();
  },

  // Delete a profile and fall back to another one
  deleteProfile(profileId) {
    const idToDelete = profileId || profileState.profileId || "household-main";

    // Keep at least one profile
    if (profiles.length <= 1) {
      return false;
    }

    const idx = profiles.findIndex((p) => p.id === idToDelete);
    if (idx === -1) return false;

    profiles.splice(idx, 1);
    saveProfilesList();

    if (profileState.profileId === idToDelete) {
      const next = profiles[0] || {
        id: "household-main",
        displayName: "Profile 1",
        initials: "BR",
        defaultZip: "83702",
        confirmDelete: true,
      };

      profileState = {
        profileId: next.id,
        displayName: next.displayName || "",
        initials: (next.initials || "BR").toUpperCase(),
        defaultZip: next.defaultZip || "83702",
        confirmDelete: next.confirmDelete !== false,
      };
      saveProfileState();
    }

    emitProfileChanged();
    return true;
  },
};

window.BiteRecStore = BiteRecStore;

// Highlight current nav item based on URL
(function () {
  const path = location.pathname.split("/").pop() || "index.html";
  const map = {
    "index.html": "",
    "explore.html": "explore",
    "lists.html": "lists",
    "profile.html": "profile",
    "place.html": "explore",
  };
  const key = map[path];
  if (!key) return;
  $$(`[data-nav="${key}"]`).forEach((a) => a.classList.add("is-active"));
})();

// Slightly strengthen the glass nav styling
(function () {
  const shell = $(".nav-shell");
  if (!shell) return;
  shell.style.backdropFilter = "blur(var(--glass-blur,14px))";
  shell.style.background =
    "color-mix(in srgb, var(--surface) 38%, transparent)";
  shell.style.border =
    "1px solid color-mix(in srgb, var(--surface) 18%, transparent)";
})();

// Toggle demo favorite hearts (local only)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-heart]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.getAttribute("data-heart");
  const now = toggleFav(id);
  btn.textContent = now ? "❤️" : "🤍";
});

// Nav profile pill + dropdown + profile-creation modal + hero stats
document.addEventListener("DOMContentLoaded", () => {
  const navList = document.querySelector(".navlinks");
  if (navList) {
    // Use reserved slot if present, otherwise fall back to appending
    let li = navList.querySelector(".nav-profile-slot");
    if (!li) {
      li = document.createElement("li");
      navList.appendChild(li);
    }

    li.innerHTML = `
      <button
        class="nav-profile-pill"
        type="button"
        aria-label="Active profile"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span class="nav-profile-initials"></span>
        <span class="nav-profile-label"></span>
        <span class="nav-profile-caret">▾</span>
      </button>
    `;

    const btn = li.querySelector(".nav-profile-pill");
    const initialsSpan = li.querySelector(".nav-profile-initials");
    const labelSpan = li.querySelector(".nav-profile-label");
    const caretSpan = li.querySelector(".nav-profile-caret");

    function paintPill() {
      const state = BiteRecStore.getProfileState();
      initialsSpan.textContent = (state.initials || "BR").toUpperCase();
      labelSpan.textContent = state.displayName || state.profileId || "Guest";
      btn.title = `Active profile: ${
        state.displayName || state.profileId || "Guest"
      }`;
    }

    let dropdown = null;
    let dropdownOpen = false;

    let profileModal = null;
    let profileModalOverlay = null;

    // Build the profile-select dropdown on demand
    function ensureDropdown() {
      if (dropdown) return dropdown;

      dropdown = document.createElement("div");
      dropdown.className = "profile-dropdown";
      dropdown.style.position = "absolute";
      dropdown.style.zIndex = "1500";
      dropdown.style.minWidth = "220px";
      dropdown.style.background = "rgba(15,17,22,0.96)";
      dropdown.style.borderRadius = "14px";
      dropdown.style.border = "1px solid rgba(249,115,22,0.5)";
      dropdown.style.boxShadow = "0 18px 40px rgba(0,0,0,.6)";
      dropdown.style.padding = "6px";
      dropdown.style.fontSize = "0.9rem";
      dropdown.style.color = "#e5e7eb";
      dropdown.style.display = "none";
      document.body.appendChild(dropdown);

      dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
        const profileBtn = e.target.closest("button[data-profile-id]");
        if (profileBtn) {
          const id = profileBtn.getAttribute("data-profile-id");
          BiteRecStore.switchProfile(id);
          paintPill();
          closeDropdown();
          return;
        }
        const createBtn = e.target.closest(
          'button[data-action="create-profile"]'
        );
        if (createBtn) {
          openCreateProfileModal();
        }
      });

      return dropdown;
    }

    // Refresh dropdown contents based on current profile list
    function renderDropdown() {
      const menu = ensureDropdown();
      const state = BiteRecStore.getProfileState();
      const list = BiteRecStore.listProfiles();

      menu.innerHTML = "";

      const header = document.createElement("div");
      header.textContent = "Profiles";
      header.style.fontWeight = "700";
      header.style.fontSize = "0.78rem";
      header.style.textTransform = "uppercase";
      header.style.letterSpacing = "0.08em";
      header.style.opacity = "0.7";
      header.style.padding = "4px 6px 6px";
      menu.appendChild(header);

      list.forEach((p) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-profile-id", p.id);
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.border = "0";
        b.style.outline = "0";
        b.style.background = "transparent";
        b.style.color = "#e5e7eb";
        b.style.padding = "6px 8px";
        b.style.borderRadius = "10px";
        b.style.cursor = "pointer";
        b.style.display = "flex";
        b.style.alignItems = "center";
        b.style.gap = "8px";

        const isActive = state.profileId === p.id;

        const bubble = document.createElement("span");
        bubble.textContent = (p.initials || "BR").toUpperCase().slice(0, 3);
        bubble.style.display = "inline-flex";
        bubble.style.alignItems = "center";
        bubble.style.justifyContent = "center";
        bubble.style.width = "26px";
        bubble.style.height = "26px";
        bubble.style.borderRadius = "999px";
        bubble.style.fontSize = "0.8rem";
        bubble.style.fontWeight = "800";
        bubble.style.background = "rgba(249,115,22,0.16)";
        bubble.style.border = "1px solid rgba(249,115,22,0.6)";

        const label = document.createElement("span");
        label.textContent = p.displayName || p.id;
        if (isActive) {
          label.style.fontWeight = "700";
        }

        b.appendChild(bubble);
        b.appendChild(label);

        if (isActive) {
          b.style.background = "rgba(249,115,22,0.18)";
        }

        b.addEventListener("mouseover", () => {
          if (!isActive) {
            b.style.background = "rgba(31,41,55,0.85)";
          }
        });
        b.addEventListener("mouseout", () => {
          if (isActive) {
            b.style.background = "rgba(249,115,22,0.18)";
          } else {
            b.style.background = "transparent";
          }
        });

        menu.appendChild(b);
      });

      const hr = document.createElement("div");
      hr.style.height = "1px";
      hr.style.margin = "4px 4px 6px";
      hr.style.background = "rgba(148,163,184,0.35)";
      menu.appendChild(hr);

      const createBtn = document.createElement("button");
      createBtn.type = "button";
      createBtn.setAttribute("data-action", "create-profile");
      createBtn.textContent = "＋ Create new profile";
      createBtn.style.width = "100%";
      createBtn.style.textAlign = "left";
      createBtn.style.border = "0";
      createBtn.style.outline = "0";
      createBtn.style.background = "transparent";
      createBtn.style.color = "rgba(248,250,252,0.9)";
      createBtn.style.padding = "6px 8px 8px";
      createBtn.style.borderRadius = "10px";
      createBtn.style.cursor = "pointer";
      createBtn.style.fontWeight = "600";

      createBtn.addEventListener("mouseover", () => {
        createBtn.style.background = "rgba(249,115,22,0.14)";
      });
      createBtn.addEventListener("mouseout", () => {
        createBtn.style.background = "transparent";
      });

      menu.appendChild(createBtn);
    }

    // Position dropdown near the pill
    function positionDropdown() {
      const menu = ensureDropdown();
      const rect = btn.getBoundingClientRect();
      const top = rect.bottom + 8 + window.scrollY;
      const left = rect.right - 240 + window.scrollX;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    }

    function openDropdown() {
      const menu = ensureDropdown();
      renderDropdown();
      positionDropdown();
      menu.style.display = "block";
      dropdownOpen = true;
      btn.setAttribute("aria-expanded", "true");
      caretSpan.style.transform = "rotate(180deg)";

      document.addEventListener("click", onDocClick);
      window.addEventListener("resize", closeDropdown);
      window.addEventListener("scroll", closeDropdown);
    }

    function closeDropdown() {
      if (!dropdownOpen || !dropdown) return;
      dropdown.style.display = "none";
      dropdownOpen = false;
      btn.setAttribute("aria-expanded", "false");
      caretSpan.style.transform = "none";

      document.removeEventListener("click", onDocClick);
      window.removeEventListener("resize", closeDropdown);
      window.removeEventListener("scroll", closeDropdown);
    }

    function onDocClick(e) {
      if (e.target.closest(".nav-profile-pill")) return;
      if (dropdown && dropdown.contains(e.target)) return;
      closeDropdown();
    }

    // Build the "create profile" modal exactly once
    function ensureProfileModal() {
      if (profileModal && profileModalOverlay) return;

      profileModalOverlay = document.createElement("div");
      profileModalOverlay.style.position = "fixed";
      profileModalOverlay.style.inset = "0";
      profileModalOverlay.style.background = "rgba(15,23,42,0.78)";
      profileModalOverlay.style.display = "flex";
      profileModalOverlay.style.alignItems = "center";
      profileModalOverlay.style.justifyContent = "center";
      profileModalOverlay.style.zIndex = "2000";
      profileModalOverlay.style.backdropFilter = "blur(8px)";
      profileModalOverlay.style.opacity = "0";
      profileModalOverlay.style.pointerEvents = "none";
      profileModalOverlay.style.transition = "opacity 0.18s ease-out";

      profileModalOverlay.addEventListener("click", (e) => {
        if (e.target === profileModalOverlay) {
          closeProfileModal();
        }
      });

      profileModal = document.createElement("div");
      profileModal.style.background = "rgba(15,17,22,0.98)";
      profileModal.style.borderRadius = "18px";
      profileModal.style.border = "1px solid rgba(249,115,22,0.7)";
      profileModal.style.boxShadow = "0 24px 60px rgba(0,0,0,0.85)";
      profileModal.style.padding = "18px 20px 16px";
      profileModal.style.width = "min(360px, 92vw)";
      profileModal.style.color = "#e5e7eb";
      profileModal.style.fontSize = "0.95rem";

      profileModal.innerHTML = `
        <h2 style="font-size:1.1rem;margin:0 0 6px;font-weight:700;">
          Create new profile
        </h2>
        <p style="margin:0 0 12px;font-size:0.85rem;color:#9ca3af;">
          Make different profiles for yourself, a partner, or other use cases.
        </p>
        <div style="display:grid;gap:10px;margin-bottom:12px;">
          <label style="display:grid;gap:4px;font-size:0.82rem;font-weight:600;">
            Profile name
            <input
              type="text"
              id="profileModalName"
              placeholder="Profile name"
              style="border-radius:10px;border:1px solid rgba(148,163,184,0.7);
                     padding:7px 9px;background:rgba(15,23,42,0.9);
                     color:#e5e7eb;font:inherit;"
            >
          </label>
          <label style="display:grid;gap:4px;font-size:0.82rem;font-weight:600;">
            Initials (optional)
            <input
              type="text"
              id="profileModalInitials"
              placeholder="Initials"
              maxlength="3"
              style="border-radius:10px;border:1px solid rgba(148,163,184,0.7);
                     padding:7px 9px;background:rgba(15,23,42,0.9);
                     color:#e5e7eb;font:inherit;"
            >
          </label>
          <label style="display:grid;gap:4px;font-size:0.82rem;font-weight:600;">
            Default ZIP (optional)
            <input
              type="text"
              id="profileModalZip"
              placeholder="ZIP code"
              inputmode="numeric"
              style="border-radius:10px;border:1px solid rgba(148,163,184,0.7);
                     padding:7px 9px;background:rgba(15,23,42,0.9);
                     color:#e5e7eb;font:inherit;"
            >
          </label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button
            type="button"
            id="profileModalCancel"
            style="border-radius:999px;border:0;background:transparent;
                   color:#9ca3af;font-size:0.9rem;padding:6px 10px;cursor:pointer;"
          >
            Cancel
          </button>
          <button
            type="button"
            id="profileModalCreate"
            style="border-radius:999px;border:0;background:#f97316;
                   color:#0b0f13;font-size:0.9rem;font-weight:600;
                   padding:7px 14px;cursor:pointer;"
          >
            Create profile
          </button>
        </div>
      `;

      profileModalOverlay.appendChild(profileModal);
      document.body.appendChild(profileModalOverlay);

      const nameInput = profileModal.querySelector("#profileModalName");
      const initialsInput =
        profileModal.querySelector("#profileModalInitials");
      const zipInput = profileModal.querySelector("#profileModalZip");
      const cancelBtn = profileModal.querySelector("#profileModalCancel");
      const createBtn = profileModal.querySelector("#profileModalCreate");

      function handleSubmit() {
        const name = nameInput.value.trim();
        const initials = initialsInput.value.trim();
        const zip = zipInput.value.trim();

        if (!name) {
          nameInput.focus();
          nameInput.style.borderColor = "#f97316";
          setTimeout(() => {
            nameInput.style.borderColor = "rgba(148,163,184,0.7)";
          }, 700);
          return;
        }

        BiteRecStore.createProfile(name, initials, zip);
        paintPill();
        closeProfileModal();
      }

      cancelBtn.addEventListener("click", () => {
        closeProfileModal();
      });

      createBtn.addEventListener("click", handleSubmit);

      const enterHandler = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
      };

      nameInput.addEventListener("keydown", enterHandler);
      initialsInput.addEventListener("keydown", enterHandler);
      zipInput.addEventListener("keydown", enterHandler);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeProfileModal();
        }
      });
    }

    // Show the "create profile" modal prefilled with current defaults
    function openCreateProfileModal() {
      ensureProfileModal();
      const nameInput = document.getElementById("profileModalName");
      const initialsInput = document.getElementById("profileModalInitials");
      const zipInput = document.getElementById("profileModalZip");

      const current = BiteRecStore.getProfileState();
      initialsInput.value = (current.initials || "").slice(0, 3);
      nameInput.value = "";
      zipInput.value = current.defaultZip || "";

      profileModalOverlay.style.pointerEvents = "auto";
      profileModalOverlay.style.opacity = "1";
      nameInput.focus();
    }

    function closeProfileModal() {
      if (!profileModalOverlay) return;
      profileModalOverlay.style.opacity = "0";
      profileModalOverlay.style.pointerEvents = "none";
    }

    // Clicking caret toggles dropdown; clicking pill body goes to profile page
    btn.addEventListener("click", (e) => {
      const onCaret = e.target.closest(".nav-profile-caret");

      if (onCaret) {
        e.stopPropagation();
        if (dropdownOpen) {
          closeDropdown();
        } else {
          openDropdown();
        }
        return;
      }

      window.location.href = "profile.html";
    });

    window.addEventListener("biterec:profile-changed", paintPill);
    paintPill();
  }

  initHeroStats();
});

// Normalize restaurant statuses for stats
function normalizeStatus(status, visited) {
  const s = (status || "").toString().toLowerCase().trim();
  if (s === "tried" || s === "visited") return "tried";
  if (s === "want" || s === "to-try" || s === "to try") return "want";
  if (!s && visited === true) return "tried";
  return s || "want";
}

// Update hero stats on the home page for the active profile
async function initHeroStats() {
  const savedEl = document.getElementById("heroSaved");
  const triedEl = document.getElementById("heroTried");
  const favsEl = document.getElementById("heroFavs");
  if (!savedEl || !triedEl || !favsEl) return;
  if (!window.BiteRecAPI || !window.BiteRecAPI.fetchRestaurants) return;

  const { fetchRestaurants } = window.BiteRecAPI;
  const profileId = BiteRecStore.getActiveProfileId();

  try {
    const raw = await fetchRestaurants(profileId, {});
    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (Array.isArray(raw.restaurants)) list = raw.restaurants;
    else if (Array.isArray(raw.items)) list = raw.items;
    else if (Array.isArray(raw.data)) list = raw.data;

    const normalized = list.map((r) => ({
      ...r,
      status: normalizeStatus(r.status, r.visited),
    }));

    const saved = normalized.length;
    const tried = normalized.filter((r) => r.status === "tried").length;
    const favs = normalized.filter((r) => r.isFavorite || r.favorite).length;

    savedEl.textContent = saved;
    triedEl.textContent = tried;
    favsEl.textContent = favs;
  } catch (err) {
    console.error("Failed to load hero stats", err);
  }
}

window.addEventListener("biterec:profile-changed", initHeroStats);

// Lightweight demo data store (used only by prototype pages)
const KEY = "biterec-demo";

export const Store = {
  load() {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);

    const seed = {
      settings: { priceEnabled: true, dark: false },
      places: [
        {
          id: "p1",
          name: "Pasta Palace",
          zip: "83702",
          status: "tried",
          category: "Italian",
          rating: 4,
          notes: "Carbonara + tiramisu",
          price: 22.5,
          updatedAt: Date.now() - 86400000,
        },
        {
          id: "p2",
          name: "Burger Barn",
          zip: "83706",
          status: "to_try",
          category: "Burger",
          rating: null,
          notes: "Smash burger spot",
          price: null,
          updatedAt: Date.now() - 3600000,
        },
        {
          id: "p3",
          name: "Café Lumen",
          zip: "83702",
          status: "tried",
          category: "Café",
          rating: 5,
          notes: "Cappuccino & croissant",
          price: 8.75,
          updatedAt: Date.now() - 7200000,
        },
      ],
    };
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  },

  save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  },
};

export function uid() {
  return "p" + Math.random().toString(36).slice(2, 9);
}
