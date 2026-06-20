const WEIGHT_CATEGORIES = ["Pulses"];

function formatWeight(weightG, unit) {
  if (unit === "kg") return `${(weightG / 1000).toFixed(2)} kg`;
  return `${weightG} g`;
}

export default function Cart({ cart, total, customer, onUpdateQty, onUpdateWeight, onCheckout, onClear, orderPlaced }) {
  return (
    <div className="cart-panel">
      <div className="cart-header">
        <h2>🧾 Bill</h2>
        {customer && <span className="cart-customer">{customer}</span>}
      </div>

      {orderPlaced ? (
        <div className="order-success">
          <div className="success-icon">✅</div>
          <p>Order placed!</p>
        </div>
      ) : cart.length === 0 ? (
        <div className="cart-empty">
          <span>🛒</span>
          <p>Cart is empty</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map((c) => {
              const isWeight = WEIGHT_CATEGORIES.includes(c.category);
              return (
                <div key={c.item_name} className="cart-row">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{c.item_name}</div>
                    <div className="cart-item-meta">
                      {isWeight
                        ? `${formatWeight(c.weightG, c.unit)} × ₹${c.price}/kg`
                        : `${c.qty} × ₹${c.price}`
                      }
                    </div>
                  </div>
                  <div className="cart-row-right">
                    {isWeight ? (
                      <button
                        className="cart-remove-btn"
                        onClick={() => onUpdateWeight(c.item_name, 0)}
                        title="Remove"
                      >✕</button>
                    ) : (
                      <div className="cart-qty-controls">
                        <button onClick={() => onUpdateQty(c.item_name, c.qty - 1)}>−</button>
                        <span>{c.qty}</span>
                        <button onClick={() => onUpdateQty(c.item_name, c.qty + 1)}>+</button>
                      </div>
                    )}
                    <div className="cart-item-total">₹{c.amount.toFixed(0)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-divider" />

          <div className="cart-total">
            <span>Total</span>
            <span className="total-amount">₹{total.toFixed(0)}</span>
          </div>

          <button className="checkout-btn" onClick={onCheckout}>✓ Confirm Order</button>
          <button className="clear-cart-btn" onClick={onClear}>Clear Cart</button>
        </>
      )}
    </div>
  );
}
