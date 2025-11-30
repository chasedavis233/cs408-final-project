// Detail view for a single restaurant/place
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  const params = new URLSearchParams(window.location.search);

  // Core identity + basic metadata from query params
  const restaurantId =
    params.get("id") ||
    params.get("restaurantId") ||
    params.get("externalId") ||
    "";

  const name = params.get("name") || "Restaurant";
  const cuisine = params.get("cuisine") || "";
  const amenity = params.get("amenity") || "";
  const city = params.get("city") || "";
  const distMi = params.get("distanceMi") || params.get("dist") || "";

  const housenumber = params.get("housenumber") || params.get("house") || "";
  const street = params.get("street") || "";
  const state = params.get("state") || "";
  const postcode = params.get("postcode") || params.get("zip") || "";

  const phone = params.get("phone") || "";
  const website = params.get("website") || "";
  const openingHours = params.get("openingHours") || params.get("hours") || "";

  const takeaway = params.get("takeaway") || "";
  const delivery = params.get("delivery") || "";
  const driveThrough =
    params.get("drive_through") || params.get("driveThrough") || "";

  // Header: name + subtitle line
  const nameEl = $("place-name");
  const subtitleEl = $("place-subtitle");

  nameEl.textContent = name;

  const subtitleBits = [];
  if (cuisine) subtitleBits.push(cuisine);
  if (city) subtitleBits.push(city);

  subtitleEl.textContent =
    subtitleBits.length > 0 ? subtitleBits.join(" • ") : "Restaurant";

  // Top summary chips (cuisine / amenity / distance)
  const chipCuisine = $("chip-cuisine");
  const chipAmenity = $("chip-amenity");
  const chipDistance = $("chip-distance");

  if (cuisine) {
    chipCuisine.textContent = cuisine;
  } else {
    chipCuisine.style.display = "none";
  }

  const amenityClean = (amenity || "").replace(/_/g, " ").trim().toLowerCase();
  const cuisineClean = (cuisine || "").trim().toLowerCase();

  if (
    amenity &&
    amenityClean &&
    amenityClean !== "restaurant" &&
    amenityClean !== cuisineClean
  ) {
    chipAmenity.textContent = amenity.replace(/_/g, " ");
    chipAmenity.hidden = false;
  } else {
    chipAmenity.hidden = true;
  }

  let distanceLabel = "";
  if (distMi) {
    const n = Number(distMi);
    if (Number.isFinite(n) && n > 0) {
      if (n < 0.2) distanceLabel = "≈0.2 mi away";
      else if (n < 10) distanceLabel = `${n.toFixed(1)} mi away`;
      else distanceLabel = `${Math.round(n)} mi away`;
    }
  }

  if (distanceLabel) {
    chipDistance.textContent = distanceLabel;
    chipDistance.hidden = false;
  } else {
    chipDistance.hidden = true;
  }

  // Location block
  const locationEl = $("location-text");
  const lines = [];

  const line1 = [housenumber, street].filter(Boolean).join(" ");
  if (line1) lines.push(line1);

  const line2 = [city, state, postcode].filter(Boolean).join(" ");
  if (line2) lines.push(line2);

  locationEl.textContent =
    lines.length > 0 ? lines.join("\n") : "No address data.";

  // Contact info (phone + website)
  const contactEl = $("contact-text");
  const contactBits = [];

  if (phone) contactBits.push(`Phone: ${phone}`);
  if (website) contactBits.push(website);

  contactEl.textContent =
    contactBits.length > 0
      ? contactBits.join(" • ")
      : "No contact info available.";

  // Opening hours display (format raw OSM-style string)
  const hoursEl = $("hours-text");

  function formatTime(hh, mm) {
    let h = parseInt(hh, 10);
    const m = parseInt(mm, 10);
    const suffix = h >= 12 ? "pm" : "am";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    const mStr = m.toString().padStart(2, "0");
    return `${h}:${mStr} ${suffix}`;
  }

  function prettyHours(str) {
    if (!str) return "";
    const parts = str
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    const nice = parts.map((p) =>
      p.replace(
        /(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/g,
        (_, h1, m1, h2, m2) =>
          `${formatTime(h1, m1)} – ${formatTime(h2, m2)}`
      )
    );

    return nice.join("\n");
  }

  if (openingHours) {
    const pretty = prettyHours(openingHours);
    hoursEl.textContent = pretty || openingHours;
  } else {
    hoursEl.textContent = "No hours information available.";
  }

  // Extra flags: takeaway / delivery / drive-through
  const detailsEl = $("details-text");
  const detailBits = [];

  function labelFromYesNo(label, value) {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (v === "yes") return label;
    if (v === "no") return null;
    return `${label}: ${value}`;
  }

  [
    labelFromYesNo("Takeaway", takeaway),
    labelFromYesNo("Delivery", delivery),
    labelFromYesNo("Drive-through", driveThrough),
  ].forEach((s) => s && detailBits.push(s));

  detailsEl.textContent =
    detailBits.length > 0
      ? detailBits.join(" • ")
      : "No extra details available.";

  // Local rating slider (1.0–10.0 UI control)
  const ratingRange = $("rating-range");
  const ratingValueEl = $("rating-value");

  function getRatingNumber() {
    if (!ratingRange) return null;
    const v = parseFloat(ratingRange.value || "0");
    return Number.isFinite(v) ? v : null;
  }

  if (ratingRange && ratingValueEl) {
    const updateRating = () => {
      const v = getRatingNumber();
      ratingValueEl.textContent = v != null ? v.toFixed(1) : "0.0";
    };
    ratingRange.addEventListener("input", updateRating);
    updateRating();
  }

  // Add-to-list buttons wired to backend
  const api = window.BiteRecAPI || {};
  const { saveRestaurant } = api;

  function getProfileId() {
    if (
      window.BiteRecStore &&
      typeof window.BiteRecStore.getActiveProfileId === "function"
    ) {
      return window.BiteRecStore.getActiveProfileId();
    }
    return "household-main";
  }

  const btnToTry = $("btn-add-to-try");
  const btnTried = $("btn-add-tried");

  async function addToList(status, buttonEl) {
    if (!saveRestaurant) {
      console.warn("BiteRecAPI.saveRestaurant is not available");
      return;
    }

    const profileId = getProfileId();
    const ratingVal = getRatingNumber();

    const payload = {
      restaurantId: restaurantId || undefined,
      externalId: restaurantId || null,
      name,
      city,
      cuisine: cuisine || amenity || "Restaurant",
      status: status === "tried" ? "tried" : "want",
    };

    if (ratingVal != null && status === "tried") {
      payload.rating = ratingVal;
    }

    buttonEl.disabled = true;

    try {
      await saveRestaurant(profileId, payload);
      if (status === "tried") {
        buttonEl.textContent = "✓ Added to Tried";
        buttonEl.classList.add("btn-tag--success");
      } else {
        buttonEl.textContent = "Saved to To-try";
      }
    } catch (err) {
      console.error("Failed to save from place page", err);
      buttonEl.textContent = "Error, try again";
    } finally {
      setTimeout(() => {
        buttonEl.disabled = false;
      }, 600);
    }
  }

  if (btnToTry) {
    btnToTry.addEventListener("click", () => addToList("want", btnToTry));
  }

  if (btnTried) {
    btnTried.addEventListener("click", () => addToList("tried", btnTried));
  }
})();
