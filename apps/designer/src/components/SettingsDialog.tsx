import { useState } from "react";
import { passwordMatches, saveLimsPassword } from "../limsPassword";
import { readLimsSession } from "../limsSession";
import {
  pinExpiresOn,
  resetReviewerPin,
  saveReviewerPin,
  useReviewerPin,
} from "../reviewerPin";

function validPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const state = useReviewerPin();
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const expires = pinExpiresOn();

  function save() {
    if (!validPin(pin)) {
      setError("Use 4 to 6 digits.");
      return;
    }
    if (pin !== again) {
      setError("The two PINs do not match.");
      return;
    }
    saveReviewerPin(pin);
    setPin("");
    setAgain("");
    setError("");
    setResetting(false);
  }

  function resetPassword() {
    if (!passwordMatches(currentPassword)) {
      setPasswordError("Current password does not match.");
      setPasswordSaved(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Use at least 8 characters.");
      setPasswordSaved(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The two passwords do not match.");
      setPasswordSaved(false);
      return;
    }
    saveLimsPassword(newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSaved(true);
  }

  const showForm = state !== "active" || resetting;

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="lims-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lims-panel-head">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="lims-modal-body">
          <section className="settings-option">
            <h3>Profile</h3>
            <p>
              {readLimsSession()?.username ?? "M. Chen"} ·{" "}
              {readLimsSession() ? `${readLimsSession()?.clientName} LIMS` : "Lab Analyst"}
            </p>
          </section>
          <section className="settings-option">
            <h3>Password</h3>
            <p>Resets the password used to enter this LIMS environment.</p>
            <div className="settings-pin-fields">
              <label>
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  aria-label="Current password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  aria-label="New password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  aria-label="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
              {passwordError ? <p className="settings-error">{passwordError}</p> : null}
              {passwordSaved ? (
                <p className="settings-saved">Password updated. Use it the next time you sign in.</p>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={resetPassword}>
                Reset password
              </button>
            </div>
          </section>
          <section className="settings-option">
            <h3>Reviewer PIN</h3>
            <p>Confirms your identity when you flag a result. A PIN lasts 90 days.</p>
            {state === "active" && expires && !resetting ? (
              <p>Current PIN expires {expires.toLocaleDateString()}.</p>
            ) : null}
            {state === "expired" ? <p>This PIN has expired. Set a new one.</p> : null}
            {showForm ? (
              <div className="settings-pin-fields">
                <label>
                  New PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    aria-label="New PIN"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                  />
                </label>
                <label>
                  Confirm PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    aria-label="Confirm PIN"
                    value={again}
                    onChange={(event) => setAgain(event.target.value)}
                  />
                </label>
                {error ? <p className="settings-error">{error}</p> : null}
                <button type="button" className="btn btn-primary" onClick={save}>
                  Save PIN
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  resetReviewerPin();
                  setResetting(true);
                }}
              >
                Reset PIN
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
