import { useState, useEffect } from "react";
import { api } from "../api";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 30;

export default function PinLock({ onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [remaining, setRemaining] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (lockedUntil <= 0) return;
    const interval = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockedUntil(0);
        setAttempts(0);
        setMessage("");
        clearInterval(interval);
      } else {
        setRemaining(left);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const locked = lockedUntil > Date.now();

  function press(digit) {
    if (locked || pin.length >= 4) return;
    setPin((p) => p + digit);
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  async function submit(currentPin) {
    if (locked) return;
    try {
      await api.verifyPin(currentPin);
      onSuccess();
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");
      triggerShake();
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECS * 1000;
        setLockedUntil(until);
        setRemaining(LOCKOUT_SECS);
        setMessage(`Too many attempts. Locked for ${LOCKOUT_SECS}s.`);
      } else {
        setMessage(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt(s) left.`);
      }
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) submit(pin);
  }, [pin]);

  const dots = Array(4).fill(null).map((_, i) => (
    <div key={i} className={`pin-dot ${pin.length > i ? "filled" : ""}`} />
  ));

  const keys = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["","0","⌫"],
  ];

  return (
    <div className="pin-overlay">
      <div className={`pin-modal ${shake ? "shake" : ""}`}>
        <button className="pin-close" onClick={onCancel}>✕</button>
        <div className="pin-icon">🔐</div>
        <h2>Owner Access</h2>
        <p className="pin-subtitle">Enter your 4-digit PIN</p>

        <div className="pin-dots">{dots}</div>

        {message && (
          <p className={`pin-message ${locked ? "locked" : "error"}`}>
            {locked ? `🔒 Locked — ${remaining}s remaining` : message}
          </p>
        )}

        <div className="pin-grid">
          {keys.map((row, ri) =>
            row.map((k, ki) => {
              if (k === "") return <div key={`${ri}-${ki}`} />;
              if (k === "⌫") return (
                <button key={`${ri}-${ki}`} className="pin-key back" onClick={backspace} disabled={locked}>
                  ⌫
                </button>
              );
              return (
                <button key={`${ri}-${ki}`} className="pin-key" onClick={() => press(k)} disabled={locked}>
                  {k}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
