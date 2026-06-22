import { useState, useEffect } from "react";
import { api } from "../api";

const CAT_OPTIONS = ["Pulses", "Cleaning", "Grocery", "Snacks", "Other"];

const WEIGHT_CATEGORIES = ["Pulses"];

export default function OwnerView() {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  // New item form
  const [newItem, setNewItem] = useState({ item_name: "", category: "Grocery", price: "" });
  // Edit item inline
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    Promise.all([api.getOrders(), api.getInventory()])
      .then(([o, i]) => { setOrders(o); setInventory(i); })
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  // ── Orders ──────────────────────────────────────────────
  async function handleDeleteOrder(idx) {
    if (!confirm("Delete this order?")) return;
    await api.deleteOrder(idx);
    setOrders((prev) => prev.filter((_, i) => i !== idx));
    showToast("Order deleted");
  }

  async function handleClearOrders() {
    if (!confirm("Clear ALL orders? This cannot be undone.")) return;
    await api.clearOrders();
    setOrders([]);
    showToast("All orders cleared");
  }

  // ── Inventory ───────────────────────────────────────────
  async function handleAddItem() {
    const { item_name, category, price } = newItem;
    if (!item_name.trim() || !price) return showToast("Fill all fields");
    try {
      await api.addItem({ item_name: item_name.trim(), category, price: parseFloat(price) });
      const updated = await api.getInventory();
      setInventory(updated);
      setNewItem({ item_name: "", category: "Grocery", price: "" });
      showToast(`✓ ${item_name} added`);
    } catch (e) {
      showToast(`❌ ${e.message}`);
    }
  }

  async function handleSaveEdit(original) {
    try {
      await api.updateItem(original, editingItem);
      const updated = await api.getInventory();
      setInventory(updated);
      setEditingItem(null);
      showToast("✓ Item updated");
    } catch (e) {
      showToast(`❌ ${e.message}`);
    }
  }

  async function handleDeleteItem(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.deleteItem(name);
    setInventory((prev) => prev.filter((i) => i.item_name !== name));
    showToast("Item deleted");
  }

  // ── Parse order items ────────────────────────────────
  // New orders have cart array, old orders have items string
  function parseOrderItems(order) {
    // New format: cart is an array of objects
    if (order.cart && Array.isArray(order.cart)) {
      return order.cart.map((c) => {
        const isWeight = WEIGHT_CATEGORIES.includes(c.category);
        if (isWeight) {
          const weightDisplay = c.unit === "kg"
            ? `${(c.weightG / 1000).toFixed(2)} kg`
            : `${c.weightG} g`;
          return {
            name: c.item_name,
            qty: weightDisplay,
            rate: `₹${c.price}/kg`,
            amount: c.amount,
          };
        }
        return {
          name: c.item_name,
          qty: c.qty,
          rate: c.price,
          amount: c.amount,
        };
      });
    }
    // Old format: items string like "2x Rice (@₹60.0), 1x Sugar (@₹45.0)"
    if (order.items) {
      return (order.items || "").split(",").map((seg) => {
        seg = seg.trim();
        const match = seg.match(/^(\d+)x\s+(.+?)\s+\(@₹([\d.]+)\)$/);
        if (match) return { name: match[2], qty: parseInt(match[1]), rate: parseFloat(match[3]), amount: parseInt(match[1]) * parseFloat(match[3]) };
        return { name: seg, qty: "", rate: "", amount: "" };
      });
    }
    return [];
  }

  // ── Stats ────────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => (o.time || "").startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);

  const cashOrders = orders.filter((o) => o.paymentMode === "cash");
  const onlineOrders = orders.filter((o) => o.paymentMode === "online");
  const cashRevenue = cashOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const onlineRevenue = onlineOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);

  const filteredInventory = inventory.filter((i) =>
    i.item_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="owner-view">
      {/* Stats */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-val">{orders.length}</div>
          <div className="stat-lbl">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">₹{totalRevenue.toFixed(0)}</div>
          <div className="stat-lbl">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{todayOrders.length}</div>
          <div className="stat-lbl">Today's Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">₹{todayRevenue.toFixed(0)}</div>
          <div className="stat-lbl">Today's Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{inventory.length}</div>
          <div className="stat-lbl">Items in Stock</div>
        </div>
        <div className="stat-card stat-card-cash">
          <div className="stat-val">₹{cashRevenue.toFixed(0)}</div>
          <div className="stat-lbl">💵 Cash</div>
        </div>
        <div className="stat-card stat-card-online">
          <div className="stat-val">₹{onlineRevenue.toFixed(0)}</div>
          <div className="stat-lbl">📱 Online</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="owner-tabs">
        <button className={`owner-tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
          📋 Orders
        </button>
        <button className={`owner-tab ${tab === "inventory" ? "active" : ""}`} onClick={() => setTab("inventory")}>
          📦 Inventory
        </button>
      </div>

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="owner-section">
          <div className="section-top">
            <h3>Order History</h3>
            {orders.length > 0 && (
              <button className="danger-btn" onClick={handleClearOrders}>🗑 Clear All</button>
            )}
          </div>
          {orders.length === 0 ? (
            <p className="empty-msg">No orders yet.</p>
          ) : (
            <div className="orders-list">
              {[...orders].reverse().map((o, ri) => {
                const realIdx = orders.length - 1 - ri;
                const itemRows = parseOrderItems(o);
                const orderTotal = parseFloat(o.total || 0);

                return (
                  <div key={realIdx} className="order-card">
                    {/* Order header */}
                    <div className="order-card-header">
                      <div className="order-meta">
                        <span className="order-num">#{realIdx + 1}</span>
                        <span className="order-customer">{o.customer}</span>
                        <span className="order-time">{o.time}</span>
                      </div>
                      <div className="order-card-right">
                        {/* Payment mode badge */}
                        <span className={`payment-badge ${o.paymentMode === "cash" ? "payment-cash" : o.paymentMode === "online" ? "payment-online" : "payment-unknown"}`}>
                          {o.paymentMode === "cash" ? "💵 Cash" : o.paymentMode === "online" ? "📱 Online" : "❓ N/A"}
                        </span>
                        <span className="order-total">₹{orderTotal.toFixed(0)}</span>
                        <button className="icon-btn red" onClick={() => handleDeleteOrder(realIdx)} title="Delete">🗑</button>
                      </div>
                    </div>

                    {/* Items table */}
                    <table className="order-items-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemRows.map((item, ii) => {
                          const isWeightItem = typeof item.qty === "string";
                          return (
                            <tr key={ii}>
                              <td>{item.name}</td>
                              <td className="center">
                                {isWeightItem ? item.qty : item.qty}
                              </td>
                              <td className="center">
                                {isWeightItem ? item.rate : `₹${item.rate}`}
                              </td>
                              <td className="accent">
                                {item.amount !== "" ? `₹${Number(item.amount).toFixed(0)}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="order-table-total-row">
                          <td colSpan="3" className="order-table-total-label">Total</td>
                          <td className="accent order-table-total-val">₹{orderTotal.toFixed(0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inventory Tab */}
      {tab === "inventory" && (
        <div className="owner-section">
          {/* Add new item */}
          <div className="add-item-form">
            <h3>Add Item</h3>
            <div className="form-row">
              <input
                placeholder="Item name"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              />
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                {CAT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input
                type="number"
                placeholder="Price ₹"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              />
              <button className="add-item-btn" onClick={handleAddItem}>+ Add</button>
            </div>
          </div>

          {/* Search */}
          <div className="search-bar" style={{ marginBottom: "1rem" }}>
            <span className="search-icon">🔍</span>
            <input
              placeholder="Search inventory…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Inventory list */}
          <div className="inv-list">
            {filteredInventory.map((item) => {
              const isEditing = editingItem && editingItem.item_name === item.item_name;
              return (
                <div key={item.item_name} className={`inv-row ${isEditing ? "editing" : ""}`}>
                  {isEditing ? (
                    <>
                      <input
                        value={editingItem.item_name}
                        onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                      />
                      <select
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      >
                        {CAT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <input
                        type="number"
                        value={editingItem.price}
                        onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                      />
                      <div className="row-actions">
                        <button className="icon-btn green" onClick={() => handleSaveEdit(item.item_name)}>✓</button>
                        <button className="icon-btn" onClick={() => setEditingItem(null)}>✕</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inv-name">{item.item_name}</span>
                      <span className="inv-cat">{item.category}</span>
                      <span className="inv-price accent">₹{item.price}</span>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => setEditingItem({ ...item })} title="Edit">✏️</button>
                        <button className="icon-btn red" onClick={() => handleDeleteItem(item.item_name)} title="Delete">🗑</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
