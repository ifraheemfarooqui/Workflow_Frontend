import { useEffect, useState } from "react";

export default function UserProfile({ user, onSave, onChangePassword, onRequestDeletion, onConfirmDeletion }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [deletionCodeSent, setDeletionCodeSent] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const [deletionMessage, setDeletionMessage] = useState("");

  async function requestDeletion(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setDeletionBusy(true);
    setDeletionError("");
    setDeletionMessage("");
    try {
      const currentPassword = new FormData(form).get("deletionPassword");
      const result = await onRequestDeletion(currentPassword);
      setDeletionCodeSent(true);
      setDeletionMessage(result.message);
      form.reset();
    } catch (requestError) {
      setDeletionError(requestError.message);
    } finally {
      setDeletionBusy(false);
    }
  }

  async function confirmDeletion(event) {
    event.preventDefault();
    setDeletionBusy(true);
    setDeletionError("");
    try {
      const code = new FormData(event.currentTarget).get("deletionCode");
      await onConfirmDeletion(code);
    } catch (confirmationError) {
      setDeletionError(confirmationError.message);
      setDeletionBusy(false);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordError("");
    const values = new FormData(event.currentTarget);
    const currentPassword = values.get("currentPassword");
    const newPassword = values.get("newPassword");
    if (newPassword !== values.get("confirmPassword")) {
      setPasswordError("The new passwords do not match.");
      setPasswordBusy(false);
      return;
    }
    try {
      await onChangePassword(currentPassword, newPassword);
    } catch (changeError) {
      setPasswordError(changeError.message);
      setPasswordBusy(false);
    }
  }

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user.name, user.email]);

  async function submitProfile(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      await onSave({ name: name.trim(), email: email.trim() });
      setFeedback("Your profile has been updated.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-view">
      <div className="profile-heading">
        <span className="dashboard-kicker"><span /> ACCOUNT SETTINGS</span>
        <h1>Your profile</h1>
        <p>Manage the name and email address associated with your account.</p>
      </div>
      <div className="profile-card">
        <div className="profile-card-header">
          <span className="profile-large-avatar">{name.trim().slice(0, 1).toUpperCase() || "U"}</span>
          <div>
            <strong>Personal details</strong>
            <p>These details are visible to your teammates.</p>
          </div>
        </div>
        <form className="profile-form" onSubmit={submitProfile}>
          <label>
            Name
            <input
              type="text"
              autoComplete="name"
              maxLength={100}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              maxLength={255}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <div className="profile-form-footer">
            <span className={`profile-feedback ${error ? "profile-error" : ""}`} role={error ? "alert" : "status"}>
              {error || feedback}
            </span>
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
      <div className="profile-card password-card">
        <div className="profile-card-header">
          <div>
            <strong>Password and security</strong>
            <p>Changing your password signs out other active sessions.</p>
          </div>
        </div>
        <form className="profile-form" onSubmit={submitPasswordChange}>
          <label>
            Current password
            <input name="currentPassword" type="password" autoComplete="current-password" required />
          </label>
          <label>
            New password
            <input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
          </label>
          <label>
            Confirm new password
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
          </label>
          <div className="profile-form-footer">
            <span className={`profile-feedback ${passwordError ? "profile-error" : ""}`} role={passwordError ? "alert" : "status"}>
              {passwordError}
            </span>
            <button className="primary" type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
      <div className="profile-card password-card deletion-card">
        <div className="profile-card-header">
          <div>
            <strong>Delete account</strong>
            <p>Remove your account and memberships. Shared messages and comments are kept with your identity anonymized, and assigned tasks become unassigned.</p>
          </div>
        </div>
        {!deletionCodeSent ? (
          <form className="profile-form" onSubmit={requestDeletion}>
            <label>
              Confirm your current password to request a deletion code
              <input name="deletionPassword" type="password" autoComplete="current-password" required />
            </label>
            {deletionError && <p className="form-error" role="alert">{deletionError}</p>}
            <div className="profile-form-footer">
              <span />
              <button className="delete-button" type="submit" disabled={deletionBusy}>
                {deletionBusy ? "Requesting…" : "Email deletion code"}
              </button>
            </div>
          </form>
        ) : (
          <form className="profile-form" onSubmit={confirmDeletion}>
            {deletionMessage && <p className="form-success" role="status">{deletionMessage}</p>}
            <label>
              Six-digit email confirmation code
              <input name="deletionCode" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required />
            </label>
            {deletionError && <p className="form-error" role="alert">{deletionError}</p>}
            <div className="profile-form-footer">
              <button className="text-button" type="button" onClick={() => { setDeletionCodeSent(false); setDeletionError(""); setDeletionMessage(""); }}>
                Cancel
              </button>
              <button className="delete-button" type="submit" disabled={deletionBusy}>
                {deletionBusy ? "Deleting…" : "Confirm permanent deletion"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
