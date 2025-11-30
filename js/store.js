// Local demo store for prototype data + theme

const KEY = "biterec-demo";

export const Store = {
  load() {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);

    // Seed demo data on first run
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

// Simple ID helper for new demo places
export function uid() {
  return "p" + Math.random().toString(36).slice(2, 9);
}

// Shorthand DOM helpers
export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

// Initialize theme from stored settings
document.documentElement.dataset.theme = Store.load().settings.dark
  ? "dark"
  : "light";
