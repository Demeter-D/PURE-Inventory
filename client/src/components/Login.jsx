import { useState } from "react";
import { api } from "../lib/api.js";

export default function Login({ collaborators, onLoggedIn }) {
  const [userId, setUserId] = useState(collaborators[0]?.id ?? "");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { user } = await api.login(userId, passcode);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="eyebrow">PURE × Stockley</div>
        <h1>Cabin Shop Inventory</h1>
        <p>Shared inventory sheet for Tom and Lara. Sign in to view and edit.</p>

        {error && <div className="login-error">{error}</div>}

        <div className="field-group">
          <label className="field-label" htmlFor="userId">
            Who are you?
          </label>
          <select
            id="userId"
            className="select-input"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="passcode">
            Passcode
          </label>
          <input
            id="passcode"
            type="password"
            className="text-input"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
          />
        </div>

        <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
