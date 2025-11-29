// js/main.js — shared UI + profile store + hero stats
import { $, $$, toggleFav, data } from './proto.js';

// ---- BiteRecStore: persist active profile + preferences in localStorage ----
const PROFILE_STATE_KEY = "biterec-profile-state-v1";

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

function saveProfileState() {
  localStorage.setItem(PROFILE_STATE_KEY, JSON.stringify(profileState));
}

function emitProfileChanged() {
  window.dispatchEvent(
    new CustomEvent("biterec:profile-changed", {
      detail: { state: { ...profileState } },
    })
  );
}

const BiteRecStore = {
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
    emitProfileChanged();
  },
};

window.BiteRecStore = BiteRecStore;

// ---- Active nav link ----
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

// ---- strengthen glass & orange outline ----
(function () {
  const shell = $(".nav-shell");
  if (!shell) return;
  shell.style.backdropFilter = "blur(var(--glass-blur,14px))";
  shell.style.background =
    "color-mix(in srgb, var(--surface) 38%, transparent)";
  shell.style.border =
    "1px solid color-mix(in srgb, var(--surface) 18%, transparent)";
})();

// ---- Favorite hearts delegate ----
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-heart]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.getAttribute("data-heart");
  const now = toggleFav(id);
  btn.textContent = now ? "❤️" : "🤍";
});

// ---- Nav profile pill + hero stats ----
document.addEventListener("DOMContentLoaded", () => {
  const navList = document.querySelector(".navlinks");
  if (navList) {
    const li = document.createElement("li");
    li.innerHTML = `
      <button class="nav-profile-pill" type="button" aria-label="Active profile">
        <span class="nav-profile-initials"></span>
        <span class="nav-profile-label"></span>
      </button>
    `;
    navList.appendChild(li);

    const btn = li.querySelector(".nav-profile-pill");
    const initialsSpan = li.querySelector(".nav-profile-initials");
    const labelSpan = li.querySelector(".nav-profile-label");

    function paintPill() {
      const state = BiteRecStore.getProfileState();
      initialsSpan.textContent = (state.initials || "BR").toUpperCase();
      labelSpan.textContent =
        state.displayName || state.profileId || "Guest";
      btn.title = `Active profile: ${
        state.displayName || state.profileId || "Guest"
      }`;
    }

    btn.addEventListener("click", () => {
      // simple: jump to profile page to edit / switch
      window.location.href = "profile.html";
    });

    window.addEventListener("biterec:profile-changed", paintPill);
    paintPill();
  }

  initHeroStats();
});

// ---- Hero stats on home page ----
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

    const saved = list.length;
    const tried = list.filter(
      (r) => (r.status || "").toLowerCase() === "tried"
    ).length;
    const favs = list.filter((r) => r.isFavorite || r.favorite).length;

    savedEl.textContent = saved;
    triedEl.textContent = tried;
    favsEl.textContent = favs;
  } catch (err) {
    console.error("Failed to load hero stats", err);
  }
}

window.addEventListener("biterec:profile-changed", initHeroStats);
