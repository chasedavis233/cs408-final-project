// js/place.js
// Detailed restaurant page – loads one restaurant from backend and lets you edit it.

const PROFILE_ID = "chase";

const params = new URLSearchParams(window.location.search);
const restaurantId = params.get("id");

const imgEl = document.getElementById("pimg");
const nameEl = document.getElementById("pname");
const cuisineEl = document.getElementById("pcuisine");
const cityEl = document.getElementById("pcity");
const priceEl = document.getElementById("pprice");
const ratingEl = document.getElementById("prating");

const favBtn = document.getElementById("btnFav");
const triedBtn = document.getElementById("btnTried");
const toTryBtn = document.getElementById("btnToTry");
const notesEl = document.getElementById("pnotes");
const ratingInput = document.getElementById("pratingInput");
const ratingLabel = document.getElementById("pratingLabel");
const saveBtn = document.getElementById("btnSavePlace");
const deleteBtn = document.getElementById("btnDeletePlace");
const statusEl = document.getElementById("placeStatus");

let restaurant = null;

function applyToUI() {
  if (!restaurant) return;
  const img =
    restaurant.imageUrl ||
    restaurant.img ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80&auto=format&fit=crop";

  imgEl.src = img;
  imgEl.alt = restaurant.name || "Restaurant";

  nameEl.textContent = restaurant.name || "Restaurant";
  cuisineEl.textContent = restaurant.cuisine || "";
  cityEl.textContent = restaurant.city ? `• ${restaurant.city}` : "";
  priceEl.textContent = restaurant.priceCategory || restaurant.price || "";
  ratingEl.textContent = restaurant.rating || "No rating";

  favBtn.textContent = restaurant.favorite ? "★ Favorited" : "♡ Favorite";
  favBtn.classList.toggle("is-fav", !!restaurant.favorite);

  notesEl.value = restaurant.notes || "";
  const ratingVal = Number(restaurant.rating || 0);
  ratingInput.value = String(ratingVal);
  ratingLabel.textContent = ratingVal ? `${ratingVal}/5` : "No rating yet";

  let statusText = "";
  if (restaurant.status === "tried") statusText = "Marked as Tried";
  else if (restaurant.status === "to_try") statusText = "On your To-Try list";
  statusEl.textContent = statusText;
}

async function loadRestaurant() {
  if (!restaurantId) {
    statusEl.textContent = "Missing restaurant id.";
    return;
  }

  try {
    restaurant = await window.BiteRecAPI.fetchRestaurantById(restaurantId);
  } catch (err) {
    console.warn("fetchRestaurantById failed, will try to create stub:", err);
  }

  // If it doesn't exist yet, create a stub based on URL params
  if (!restaurant) {
    restaurant = {
      restaurantId,
      profileId: PROFILE_ID,
      name: params.get("name") || "Restaurant",
      cuisine: params.get("cuisine") || "",
      priceCategory: params.get("price") || "",
      rating: Number(params.get("rating") || 0),
      city: "",
      status: "to_try",
      favorite: false,
      notes: "",
    };
    try {
      restaurant = await window.BiteRecAPI.saveRestaurant(PROFILE_ID, restaurant);
    } catch (err) {
      console.error("Failed to create stub restaurant:", err);
    }
  }

  applyToUI();
}

// ---- event handlers ----
favBtn.addEventListener("click", async () => {
  if (!restaurant) return;
  restaurant.favorite = !restaurant.favorite;
  await save();
});

triedBtn.addEventListener("click", async () => {
  if (!restaurant) return;
  restaurant.status = "tried";
  await save();
});

toTryBtn.addEventListener("click", async () => {
  if (!restaurant) return;
  restaurant.status = "to_try";
  await save();
});

ratingInput.addEventListener("change", () => {
  const v = Number(ratingInput.value || 0);
  ratingLabel.textContent = v ? `${v}/5` : "No rating yet";
});

saveBtn.addEventListener("click", async () => {
  if (!restaurant) return;
  restaurant.notes = notesEl.value;
  restaurant.rating = Number(ratingInput.value || 0);
  await save();
});

deleteBtn.addEventListener("click", async () => {
  if (!restaurantId) return;
  if (!confirm("Remove this place from your list?")) return;
  try {
    await window.BiteRecAPI.deleteRestaurant(restaurantId);
    window.location.href = "lists.html";
  } catch (err) {
    console.error(err);
    alert("Failed to delete.");
  }
});

async function save() {
  try {
    restaurant = await window.BiteRecAPI.saveRestaurant(PROFILE_ID, restaurant);
    applyToUI();
    statusEl.textContent = "Saved.";
    setTimeout(() => (statusEl.textContent = ""), 1500);
  } catch (err) {
    console.error(err);
    alert("Failed to save.");
  }
}

// init
loadRestaurant();
