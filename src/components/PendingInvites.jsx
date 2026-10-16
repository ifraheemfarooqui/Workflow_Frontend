import { useState } from "react";

export default function PendingInvites({ invites, onAccept, error: loadError = "" }) {
  const [acceptingId, setAcceptingId] = useState(null);
  const [error, setError] = useState("");

  async function accept(invite) {
    setAcceptingId(invite.id);
    setError("");
    try {
      await onAccept(invite);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAcceptingId(null);
    }
  }

  if (invites.length === 0 && !loadError) return null;

  return (
    <div className="pending-invites pending-invites-messages" aria-labelledby="pending-invites-title">
      <div className="pending-invites-heading">
        <div>
          <h2 id="pending-invites-title">Team invitations</h2>
        </div>
        {invites.length > 0 && <span>{invites.length}</span>}
      </div>
      {invites.map((invite) => (
        <div className="pending-invite" key={invite.id}>
          <div>
            <strong>{invite.team.name}</strong>
            <p>Join this team to see its projects and collaborate with its members.</p>
          </div>
          <button
            className="primary"
            onClick={() => accept(invite)}
            disabled={acceptingId !== null}
          >
            {acceptingId === invite.id ? "Joining…" : "Accept invite"}
          </button>
        </div>
      ))}
      {loadError && <p className="form-error" role="status">Invitations could not be loaded: {loadError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
