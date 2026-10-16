import { useState } from "react";
import { useModalDialog } from "../hooks/useModalDialog";

export default function ProjectTeamsDialog({ teams, projectName, onClose, onSubmit }) {
  const dialogRef = useModalDialog(onClose);
  const [teamId, setTeamId] = useState(teams[0] ? String(teams[0].id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!teamId) {
      setError("Choose a team to add.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(Number(teamId));
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="task-dialog create-dialog" role="dialog" aria-modal="true" aria-labelledby="project-teams-title" tabIndex={-1}>
        <header className="dialog-header">
          <div><p className="eyebrow">{projectName}</p><h2 id="project-teams-title">Add a team</h2></div>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <form className="dialog-form" onSubmit={handleSubmit}>
          <label>Team<select value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select></label>
          <p className="form-hint">Members of this team will be able to access this project.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={busy || teams.length === 0}>{busy ? "Adding…" : "Add team"}</button>
        </form>
      </section>
    </div>
  );
}
