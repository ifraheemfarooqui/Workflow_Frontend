import { useModalDialog } from "../hooks/useModalDialog";

export default function TeamMembersDialog({ team, members, onClose }) {
  const dialogRef = useModalDialog(onClose);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={dialogRef}
        className="task-dialog team-members-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-members-title"
        tabIndex={-1}
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{team.name}</p>
            <h2 id="team-members-title">Team members</h2>
          </div>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <ul className="team-members-list">
          {members.map((member) => (
            <li key={member.user.id}>
              <span className="team-avatar">{member.user.name.slice(0, 1).toUpperCase()}</span>
              <span className="team-member-copy">
                <strong>{member.user.name}</strong>
                <small>{member.user.email}</small>
              </span>
              <span className="team-member-role">{member.role_in_team}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
