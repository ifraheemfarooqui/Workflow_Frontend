import { useState } from "react";

export default function ResetPassword({ token, onSubmit, onSignIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    const values = new FormData(event.currentTarget);
    const newPassword = values.get("newPassword");
    if (newPassword !== values.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(token, newPassword);
      setReset(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-art">
        <div>
          <div className="wordmark"><span className="brand-mark">W</span> workflow</div>
          <p className="eyebrow">SECURE YOUR ACCOUNT</p>
          <h1>Choose a new password.</h1>
          <p className="art-copy">Use at least 8 characters. Your other sessions will be signed out.</p>
        </div>
        <div className="art-footer"><span className="art-orbit" /> A fresh start for your account.</div>
      </section>
      <section className="auth-side">
        {reset ? (
          <div className="auth-form">
            <p className="eyebrow">PASSWORD UPDATED</p>
            <h2>You’re all set</h2>
            <p className="form-success" role="status">Your password has been reset. Sign in with your new password.</p>
            <button className="primary auth-submit" type="button" onClick={onSignIn}>Sign in</button>
          </div>
        ) : !token ? (
          <div className="auth-form">
            <p className="form-error" role="alert">This password reset link is missing or invalid. Request a new one.</p>
            <button className="primary auth-submit" type="button" onClick={onSignIn}>Back to sign in</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <p className="eyebrow">PASSWORD RESET</p>
            <h2>Set a new password</h2>
            <label>
              New password
              <input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            </label>
            <label>
              Confirm new password
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary auth-submit" type="submit" disabled={busy}>
              {busy ? "Updating…" : "Reset password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
