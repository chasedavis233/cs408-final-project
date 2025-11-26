// api.js — BiteRec backend helpers (no bundler needed)

(() => {
  const API_BASE = "https://uyjwympg0a.execute-api.us-east-2.amazonaws.com";
  const HOUSEHOLD_USER = "household-main"; // kept for reference; backend also defaults

  // Only send headers when we really need them.
  // GET/DELETE: no custom headers -> simple CORS request.
  // PUT: JSON body so we send Content-Type.
  function headersFor(method) {
    if (method === "PUT") {
      return { "Content-Type": "application/json" };
    }
    // GET / DELETE – no headers to avoid preflight
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

  // Get all restaurants for a given profile (e.g. "chase" or "gf")
  async function fetchRestaurants(profileId, { q, status, tag } = {}) {
    const params = new URLSearchParams();
    params.set("profileId", profileId);

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

  // Create or update a restaurant
  async function saveRestaurant(profileId, restaurant) {
    // Make sure we have an id
    if (!restaurant.restaurantId) {
      restaurant.restaurantId =
        `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const payload = { ...restaurant, profileId };

    const res = await fetch(
      `${API_BASE}/restaurants/${encodeURIComponent(
        restaurant.restaurantId
      )}`,
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

  async function fetchRestaurantById(restaurantId) {
    const res = await fetch(
      `${API_BASE}/restaurants/${encodeURIComponent(restaurantId)}`,
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

  async function deleteRestaurant(restaurantId) {
    const res = await fetch(
      `${API_BASE}/restaurants/${encodeURIComponent(restaurantId)}`,
      {
        method: "DELETE",
        headers: headersFor("DELETE"),
      }
    );
    if (!res.ok) {
      console.error("deleteRestaurant failed", res.status, await res.text());
      throw new Error("Failed to delete restaurant");
    }
    return res.json();
  }

  // Expose API on window so your existing scripts can use it
  window.BiteRecAPI = {
    fetchProfile,
    saveProfile,
    fetchRestaurants,
    saveRestaurant,
    fetchRestaurantById,
    deleteRestaurant,
  };
})();
