import { useState, useEffect } from "react";
import { api } from "../api";
import Cart from "../components/Cart";

const CAT_ICONS = {
  Pulses:                 "🌾",
  Groceries:              "🛒",
  "Personal Care":        "🧴",
  "Household & Cleaning": "🧹",
  "Whole Spices":         "🫙",
  "Powdered Spices":      "🌶️",
  Confectionery:          "🍪",
  "Cooking Oils":         "🫒",
};

const WEIGHT_CATEGORIES = ["Pulses"];

function calcAmount(item, weightG) {
  return (item.price / 1000) * weightG;
}

function WeightControl({ item, cartItem, onAdd, onUpdateWeight }) {
  const [grams, setGrams] = useState(cartItem ? cartItem.weightG : 500);
  const [unit, setUnit]   = useState(cartItem ? cartItem.unit : "g");

  const displayGrams = unit === "kg" ? grams / 1000 : grams;

  function handleUnitToggle(u) { setUnit(u); }

  function handleChange(val) {
    const n = parseFloat(val) || 0;
    const g = unit === "kg" ? Math.round(n * 1000) : Math.round(n);
    setGrams(Math.max(0, g));
  }

  function handleAdd() {
    if (grams <= 0) return;
    onAdd(item, grams, unit);
  }

  function handleUpdate() {
    if (grams <= 0) { onUpdateWeight(item.item_name, 0); return; }
    onUpdateWeight(item.item_name, grams, unit);
  }

  const amount = calcAmount(item, grams);

  return (
    <div className="weight-control">
      <div className="weight-unit-toggle">
        <button className={unit === "g" ? "active" : ""} onClick={() => handleUnitToggle("g")}>g</button>
        <button className={unit === "kg" ? "active" : ""} onClick={() => handleUnitToggle("kg")}>kg</button>
      </div>
      <div className="weight-input-row">
        <input
          type="number"
          className="weight-input"
          value={displayGrams || ""}
          min="0"
          step={unit === "kg" ? 0.25 : 100}
          onChange={(e) => handleChange(e.target.value)}
        />
        <span className="weight-unit-label">{unit}</span>
      </div>
      {grams > 0 && <div className="weight-amount">₹{amount.toFixed(0)}</div>}
      {cartItem ? (
        <button className="add-btn" onClick={handleUpdate}>Update</button>
      ) : (
        <button className="add-btn" onClick={handleAdd} disabled={grams <= 0}>+ Add</button>
      )}
    </div>
  );
}

export default function CustomerView() {
  const [inventory, setInventory]     = useState([]);
  const [cart, setCart]               = useState([]);
  const [customer, setCustomer]       = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [cartOpen, setCartOpen]       = useState(false);

  useEffect(() => {
    api.getInventory().then(setInventory).finally(() => setLoading(false));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // Auto-open cart drawer on mobile when item added
  function openCartOnMobile() {
    if (window.innerWidth < 768) setCartOpen(true);
  }

  const categories = [...new Set(inventory.map((i) => i.category))];

  const displayed = inventory.filter((item) => {
    const matchCat    = !selectedCat || item.category === selectedCat;
    const matchSearch = item.item_name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const total     = cart.reduce((s, c) => s + c.amount, 0);
  const cartCount = cart.length;

  function addToCart(item) {
    const isWeight = WEIGHT_CATEGORIES.includes(item.category);
    setCart((prev) => {
      const existing = prev.find((c) => c.item_name === item.item_name);
      if (existing) {
        if (isWeight) return prev;
        return prev.map((c) => c.item_name === item.item_name
          ? { ...c, qty: c.qty + 1, amount: item.price * (c.qty + 1) }
          : c
        );
      }
      return [...prev, {
        ...item,
        qty:     isWeight ? null : 1,
        weightG: isWeight ? 500 : null,
        unit:    isWeight ? "g" : null,
        amount:  isWeight ? calcAmount(item, 500) : item.price,
      }];
    });
    if (!isWeight) {
      showToast(`✓ ${item.item_name} added`);
      openCartOnMobile();
    }
  }

  function addWeightItem(item, weightG, unit) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item_name === item.item_name);
      const amount   = calcAmount(item, weightG);
      if (existing) {
        return prev.map((c) => c.item_name === item.item_name
          ? { ...c, weightG, unit, amount }
          : c
        );
      }
      return [...prev, { ...item, qty: null, weightG, unit, amount }];
    });
    showToast(`✓ ${item.item_name} added`);
    openCartOnMobile();
  }

  function updateWeightItem(itemName, weightG, unit) {
    if (weightG <= 0) {
      setCart((prev) => prev.filter((c) => c.item_name !== itemName));
      return;
    }
    setCart((prev) => prev.map((c) => {
      if (c.item_name !== itemName) return c;
      const inv = inventory.find((i) => i.item_name === itemName);
      return { ...c, weightG, unit, amount: calcAmount(inv, weightG) };
    }));
  }

  function updateQty(itemName, qty) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.item_name !== itemName));
    } else {
      setCart((prev) => prev.map((c) => {
        if (c.item_name !== itemName) return c;
        return { ...c, qty, amount: c.price * qty };
      }));
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    if (!customer.trim()) { showToast("⚠️ Please enter customer name"); return; }
    try {
      await api.placeOrder({ customer, cart, total });
      setOrderPlaced(true);
      setCart([]);
      setCustomer("");
      setCartOpen(false);
      setTimeout(() => setOrderPlaced(false), 3000);
    } catch { showToast("❌ Error placing order"); }
  }

  if (loading) return <div className="loading">Loading inventory…</div>;

  return (
    <div className="customer-layout">
      <div className="inventory-panel">
        <div className="name-bar">
          <input
            className="cust-input"
            placeholder="👤 Customer name (required)"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search items…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedCat(null); }}
          />
        </div>

        {!search && (
          <div className="cat-row">
            <button className={`cat-chip ${!selectedCat ? "active" : ""}`} onClick={() => setSelectedCat(null)}>All</button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`cat-chip ${selectedCat === cat ? "active" : ""}`}
                onClick={() => setSelectedCat(cat === selectedCat ? null : cat)}
              >
                {CAT_ICONS[cat] || "📦"} {cat}
              </button>
            ))}
          </div>
        )}

        {!selectedCat && !search ? (
          <div className="cat-cards-grid">
            {categories.map((cat) => {
              const count = inventory.filter((i) => i.category === cat).length;
              return (
                <div key={cat} className="cat-card" onClick={() => setSelectedCat(cat)}>
                  <div className="cat-card-icon">{CAT_ICONS[cat] || "📦"}</div>
                  <div className="cat-card-name">{cat}</div>
                  <div className="cat-card-count">{count} items</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="items-grid">
            {displayed.length === 0 && <p className="empty-msg">No items found.</p>}
            {displayed.map((item) => {
              const inCart   = cart.find((c) => c.item_name === item.item_name);
              const isWeight = WEIGHT_CATEGORIES.includes(item.category);
              return (
                <div key={item.item_name} className="item-card">
                  <div className="item-emoji">{CAT_ICONS[item.category] || "📦"}</div>
                  <div className="item-name">{item.item_name}</div>
                  <div className="item-cat">{item.category}</div>
                  <div className="item-price">₹{item.price}{isWeight ? "/kg" : ""}</div>
                  {item.barcode && <div className="item-barcode">🔖 {item.barcode}</div>}
                  {isWeight ? (
                    <WeightControl
                      item={item}
                      cartItem={inCart}
                      onAdd={addWeightItem}
                      onUpdateWeight={updateWeightItem}
                    />
                  ) : inCart ? (
                    <div className="qty-controls">
                      <button onClick={() => updateQty(item.item_name, inCart.qty - 1)}>−</button>
                      <span>{inCart.qty}</span>
                      <button onClick={() => updateQty(item.item_name, inCart.qty + 1)}>+</button>
                    </div>
                  ) : (
                    <button className="add-btn" onClick={() => addToCart(item)}>+ Add</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Inline mini cart summary on mobile — sticky at bottom of inventory panel */}
        {cartCount > 0 && (
          <div className="mobile-cart-summary" onClick={() => setCartOpen(true)}>
            <span>🧾 {cartCount} item{cartCount > 1 ? "s" : ""} in cart</span>
            <span className="mobile-cart-total">₹{total.toFixed(0)} · View Bill →</span>
          </div>
        )}
      </div>

      {/* Desktop Cart Sidebar */}
      <div className="cart-panel">
        <Cart
          cart={cart}
          total={total}
          customer={customer}
          onUpdateQty={updateQty}
          onUpdateWeight={updateWeightItem}
          onCheckout={handleCheckout}
          onClear={() => setCart([])}
          orderPlaced={orderPlaced}
        />
      </div>

      {/* Mobile FAB — always visible on mobile when cart has items */}
      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          🧾 <span>{cartCount} item{cartCount > 1 ? "s" : ""}</span>
          <span>₹{total.toFixed(0)}</span>
          <span className="cart-fab-action">Place Order →</span>
        </button>
      )}

      {/* Mobile Drawer */}
      {cartOpen && (
        <div className="cart-drawer-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-handle" />
            <button className="drawer-close" onClick={() => setCartOpen(false)}>✕</button>
            <div className="cart-drawer-content">
              <Cart
                cart={cart}
                total={total}
                customer={customer}
                onUpdateQty={updateQty}
                onUpdateWeight={updateWeightItem}
                onCheckout={handleCheckout}
                onClear={() => { setCart([]); setCartOpen(false); }}
                orderPlaced={orderPlaced}
              />
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
