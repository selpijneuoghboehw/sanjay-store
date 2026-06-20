import { useState } from "react";
import CustomerView from "./pages/CustomerView";
import OwnerView from "./pages/OwnerView";
import PinLock from "./components/PinLock";
import "./index.css";

export default function App() {
  const [view, setView] = useState("customer"); // "customer" | "owner"
  const [ownerAuth, setOwnerAuth] = useState(false);
  const [showPin, setShowPin] = useState(false);

  function handleOwnerClick() {
    if (ownerAuth) {
      setView("owner");
    } else {
      setShowPin(true);
    }
  }

  function handlePinSuccess() {
    setOwnerAuth(true);
    setShowPin(false);
    setView("owner");
  }

  function handleLogout() {
    setOwnerAuth(false);
    setView("customer");
  }

  return (
    <div className="app-root">
      {/* Header */}
      <header className="store-header">
        <div className="header-left">
          <div className="store-logo">🏪</div>
          <div>
            <h1>Sanjay Karyana Store</h1>
            <p>Est. Mashka, Since 2015</p>
          </div>
        </div>
        <nav className="header-nav">
          <button
            className={`nav-btn ${view === "customer" ? "active" : ""}`}
            onClick={() => setView("customer")}
          >
            🛒 Shop
          </button>
          <button
            className={`nav-btn ${view === "owner" ? "active" : ""}`}
            onClick={handleOwnerClick}
          >
            {ownerAuth ? "⚙️ Owner" : "🔒 Owner"}
          </button>
          {ownerAuth && (
            <button className="nav-btn logout" onClick={handleLogout}>
              Sign Out
            </button>
          )}
        </nav>
      </header>

      {/* PIN Modal */}
      {showPin && (
        <PinLock
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPin(false)}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        {view === "customer" ? <CustomerView /> : <OwnerView />}
      </main>
    </div>
  );
}
