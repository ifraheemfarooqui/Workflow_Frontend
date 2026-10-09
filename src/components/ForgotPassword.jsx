import { useState } from "react";

export default function ForgotPassword({ onSubmit, onSignIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(new FormData(event.currentTarget).get("email"));
      setSent(true);
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
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1>Get back to your work.</h1>
          <p className="art-copy">We’ll email you a secure link to reset your password.</p>
        </div>
        <div className="art-footer"><span className="art-orbit" /> Your account stays yours.</div>
      </section>
      <section className="auth-side">
        {sent ? (
          <div className="auth-form">
            <p className="eyebrow">CHECK YOUR INBOX</p>
            <h2>Look for a reset link</h2>
            <p className="form-success" role="status">
              If an account exists for that email, password reset instructions have been sent.
            </p>
            <button className="primary auth-submit" type="button" onClick={onSignIn}>Back to sign in</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <p className="eyebrow">ACCOUNT RECOVERY</p>
            <h2>Forgot your password?</h2>
            <p className="form-intro">Enter the email address on your account and we’ll send a reset link.</p>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary auth-submit" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <p className="auth-switch">
              Remembered it? <button className="text-button" type="button" onClick={onSignIn}>Sign in</button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
