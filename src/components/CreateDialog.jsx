import { useState } from "react";
import { useModalDialog } from "../hooks/useModalDialog";

export default function CreateDialog({ type, teamName, onClose, onSubmit }) {
  const dialogRef = useModalDialog(onClose);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isTeam = type === "team";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter a name to continue.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="task-dialog create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-title" tabIndex={-1}>
        <header className="dialog-header">
          <div><p className="eyebrow">{isTeam ? "WORK BETTER TOGETHER" : teamName}</p><h2 id="create-title">{isTeam ? "Create a team" : "Create a project"}</h2></div>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <form className="dialog-form" onSubmit={handleSubmit}>
          <label>{isTeam ? "Team name" : "Project name"}<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={isTeam ? 100 : 150} autoFocus placeholder={isTeam ? "Design team" : "Website refresh"} /></label>
          {!isTeam && <label>Description <span className="optional">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What is this project about?" /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={busy}>{busy ? "Creating…" : isTeam ? "Create team" : "Create project"}</button>
        </form>
      </section>
    </div>
  );
}
