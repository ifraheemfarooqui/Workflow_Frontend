import { useState } from "react";

export default function AuthenticationPanel({ onAuthenticate, onForgotPassword, notice = "" }) {
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = new FormData(event.currentTarget);
    try {
      await onAuthenticate({
        name: values.get("name"),
        email: values.get("email"),
        password: values.get("password"),
        registering,
      });
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
          <p className="eyebrow">MAKE SPACE FOR YOUR BEST WORK</p>
          <h1>Good work happens when everything clicks.</h1>
          <p className="art-copy">Bring your people, projects, and next steps together.</p>
        </div>
        <div className="art-footer"><span className="art-orbit" /> A calmer way to move work forward.</div>
      </section>
      <section className="auth-side">
        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="eyebrow">{registering ? "GET STARTED" : "WELCOME BACK"}</p>
          <h2>{registering ? "Create your account" : "Sign in to Workflow"}</h2>
          <p className="form-intro">
            {registering ? "Set up your account and start collaborating." : "Pick up right where your team left off."}
          </p>
          {!registering && notice && <p className="form-success" role="status">{notice}</p>}
          {registering && (
            <label>
              Your name
              <input name="name" autoComplete="name" required maxLength={100} placeholder="Alex Morgan" />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required placeholder="Enter your password" />
          </label>
          {!registering && (
            <button className="text-button forgot-password-link" type="button" onClick={onForgotPassword}>
              Forgot password?
            </button>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
            {!busy && <span aria-hidden="true">→</span>}
          </button>
          <p className="auth-switch">
            {registering ? "Already have an account?" : "New to Workflow?"}{" "}
            <button className="text-button" type="button" onClick={() => { setRegistering(!registering); setError(""); }}>
              {registering ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
