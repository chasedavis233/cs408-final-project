// api.js — BiteRec backend helpers (no bundler required)

(() => {
  const API_BASE = "https://uyjwympg0a.execute-api.us-east-2.amazonaws.com";
  const HOUSEHOLD_USER = "household-main"; // final fallback profile

  // Resolve the active profile ID from the store or localStorage
  function getCurrentProfileId() {
    try {
      const store = window.BiteRecStore;
      if (store && typeof store.getActiveProfileId === "function") {
        const id = store.getActiveProfileId();
        if (id) return id;
      }

      const raw = localStorage.getItem("biterec-profile-state-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.profileId === "string" && parsed.profileId) {
          return parsed.profileId;
        }
      }
    } catch (e) {
      console.warn("getCurrentProfileId fallback failed", e);
    }

    return HOUSEHOLD_USER;
  }

  // Minimal headers: avoid preflight for simple GET/DELETE
  function headersFor(method) {
    if (method === "PUT") {
      return { "Content-Type": "application/json" };
    }
    return {};
  }

  // ---- PROFILE (/me) ----

  async function fetchProfile() {
    const res = await fetch(`${API_BASE}/me`, {
      method: "GET",
      headers: headersFor("GET"),
    });

    if (!res.ok) {
      console.error("fetchProfile failed", res.status, await res.text());
      throw new Error("Failed to load profile");
    }

    return res.json();
  }

  async function saveProfile(profile) {
    const res = await fetch(`${API_BASE}/me`, {
      method: "PUT",
      headers: headersFor("PUT"),
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      console.error("saveProfile failed", res.status, await res.text());
      throw new Error("Failed to save profile");
    }

    return res.json();
  }

  // ---- RESTAURANTS (/restaurants) ----

  // Fetch restaurants for a profile (defaults to active profile)
  async function fetchRestaurants(profileId, { q, status, tag } = {}) {
    const resolvedProfileId = profileId || getCurrentProfileId();

    const params = new URLSearchParams();
    params.set("profileId", resolvedProfileId);

    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (tag) params.set("tag", tag);

    const url = `${API_BASE}/restaurants?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: headersFor("GET"),
    });

    if (!res.ok) {
      console.error("fetchRestaurants failed", res.status, await res.text());
      throw new Error("Failed to load restaurants");
    }

    return res.json();
  }

  // Create or update a restaurant for a profile
  async function saveRestaurant(profileId, restaurant) {
    const resolvedProfileId = profileId || getCurrentProfileId();

    if (!restaurant.restaurantId) {
      restaurant.restaurantId = `r_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    }

    const payload = { ...restaurant, profileId: resolvedProfileId };

    const res = await fetch(
      `${API_BASE}/restaurants/${encodeURIComponent(restaurant.restaurantId)}`,
      {
        method: "PUT",
        headers: headersFor("PUT"),
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      console.error("saveRestaurant failed", res.status, await res.text());
      throw new Error("Failed to save restaurant");
    }

    return res.json();
  }

  // Fetch a single restaurant by ID (optionally for a specific profile)
  async function fetchRestaurantById(
    restaurantId,
    profileId // optional, defaults to active
  ) {
    const resolvedProfileId = profileId || getCurrentProfileId();

    const params = new URLSearchParams();
    if (resolvedProfileId) params.set("profileId", resolvedProfileId);

    const res = await fetch(
      `${API_BASE}/restaurants/${encodeURIComponent(
        restaurantId
      )}?${params.toString()}`,
      {
        method: "GET",
        headers: headersFor("GET"),
      }
    );

    if (!res.ok) {
      console.error("fetchRestaurantById failed", res.status, await res.text());
      throw new Error("Failed to load restaurant");
    }

    return res.json();
  }

  // Delete a restaurant for a profile
  async function deleteRestaurant(profileId, restaurantId) {
    const resolvedProfileId = profileId || getCurrentProfileId();

    const params = new URLSearchParams();
    if (resolvedProfileId) params.set("profileId", resolvedProfileId);

    const res = await fetch(
      `${API_BASE}/restaurants/${encodeURIComponent(
        restaurantId
      )}?${params.toString()}`,
      {
        method: "DELETE",
        headers: headersFor("DELETE"),
      }
    );

    if (!res.ok) {
      console.error("deleteRestaurant failed", res.status, await res.text());
      throw new Error("Failed to delete restaurant");
    }

    // 204 or empty JSON body
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  // ---- PLACE SEARCH (/places/search) ----

  // Search external places via the SearchPlaces Lambda
  async function searchPlaces(zip, q) {
    const params = new URLSearchParams();
    if (zip) params.set("zip", zip);
    if (q) params.set("q", q);

    const res = await fetch(
      `${API_BASE}/places/search?${params.toString()}`,
      {}
    );

    if (!res.ok) {
      console.error("searchPlaces failed", res.status, await res.text());
      throw new Error(`Failed to search places (status ${res.status})`);
    }

    return res.json();
  }

  // Public API used by the front-end pages
  window.BiteRecAPI = {
    fetchProfile,
    saveProfile,
    fetchRestaurants,
    saveRestaurant,
    fetchRestaurantById,
    deleteRestaurant,
    searchPlaces,
  };
})();
