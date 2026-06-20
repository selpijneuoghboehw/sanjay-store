// src/api.js
// Change BASE_URL to your Render backend URL after deploying
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const api = {
  // Inventory
  getInventory: () => request("/api/inventory"),
  addItem: (item) => request("/api/inventory", { method: "POST", body: JSON.stringify(item) }),
  updateItem: (name, item) => request(`/api/inventory/${encodeURIComponent(name)}`, { method: "PUT", body: JSON.stringify(item) }),
  deleteItem: (name) => request(`/api/inventory/${encodeURIComponent(name)}`, { method: "DELETE" }),

  // Orders
  getOrders: () => request("/api/orders"),
  placeOrder: (order) => request("/api/orders", { method: "POST", body: JSON.stringify(order) }),
  editOrder: (idx, edit) => request(`/api/orders/${idx}`, { method: "PUT", body: JSON.stringify(edit) }),
  deleteOrder: (idx) => request(`/api/orders/${idx}`, { method: "DELETE" }),
  clearOrders: () => request("/api/orders", { method: "DELETE" }),

  // Auth
  verifyPin: (pin) => request("/api/auth/verify", { method: "POST", body: JSON.stringify({ pin }) }),
};
