import { useState } from "react";
import { useModalDialog } from "../hooks/useModalDialog";

export default function InviteTeamMemberDialog({ team, onClose, onSubmit }) {
  const dialogRef = useModalDialog(onClose);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(email.trim());
      setSent(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="task-dialog create-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-member-title" tabIndex={-1}>
        <header className="dialog-header">
          <div><p className="eyebrow">{team.name}</p><h2 id="invite-member-title">Invite a team member</h2></div>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        {sent ? (
          <div className="dialog-form">
            <p role="status">Invitation sent. They can sign in or create an account using the invited email address to join {team.name}.</p>
            <button className="primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="dialog-form" onSubmit={handleSubmit}>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus placeholder="teammate@example.com" /></label>
            <p className="form-hint">We’ll email them a secure link to join this team.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send invitation"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
