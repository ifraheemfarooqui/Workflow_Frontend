import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useModalDialog } from "../hooks/useModalDialog";

export default function TaskDialog({ task, project, members, teams = [], currentUserId, onClose, onTaskCreated, onTaskDeleted }) {
  const dialogRef = useModalDialog(onClose);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("");
  const [assignedTeamId, setAssignedTeamId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isCreating = !task;

  useEffect(() => {
    if (!task) return;
    let active = true;
    setComments([]);
    setError("");
    api.listComments(task.id)
      .then((result) => {
        if (active) setComments(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [task]);

  async function createTask(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Enter a task name to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onTaskCreated({
        title: title.trim(),
        description: description.trim(),
        priority,
        assigned_to: assignee ? Number(assignee) : null,
        assigned_team_id: assignedTeamId ? Number(assignedTeamId) : null,
        status: "todo",
        project_id: project.id,
      });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError("");
    try {
      const comment = await api.createComment(task.id, content.trim());
      setComments((existing) => [...existing, comment]);
      setContent("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTask() {
    if (!window.confirm("Delete this task? This also removes its comments.")) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteTask(task.id);
      onTaskDeleted(task.id);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={`task-dialog ${isCreating ? "create-dialog" : ""}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1}>
        <header className="dialog-header">
          <div><p className="eyebrow">{isCreating ? "ADD TO PROJECT" : project.name}</p><h2 id="dialog-title">{isCreating ? "Create a task" : task.title}</h2></div>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        {isCreating ? (
          <form className="dialog-form" onSubmit={createTask}>
            <label>Task name<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus placeholder="What needs to get done?" /></label>
            <label>Description <span className="optional">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Add a few details…" /></label>
            <div className="form-row">
              <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label>Person<select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></label>
            </div>
            {teams.length > 0 && (
              <label>Team<select value={assignedTeamId} onChange={(event) => setAssignedTeamId(event.target.value)}>
                <option value="">No team assigned</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select></label>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create task"}</button>
          </form>
        ) : (
          <>
            <div className="task-detail">
              <span className={`priority-label priority-${task.priority}`}>{task.priority} priority</span>
              <p>{task.description || "No description has been added."}</p>
              {task.assigned_team_id && <span className="detail-assignee">{teams.find((team) => team.id === task.assigned_team_id)?.name || "Assigned team"}</span>}
              <span className="detail-assignee">{task.assigned_to ? members.find((member) => member.user.id === task.assigned_to)?.user.name || "Assigned teammate" : "Unassigned"}</span>
            </div>
            <div className="comments-section">
              <h3>Comments <span>{comments.length}</span></h3>
              <div className="comment-list">
                {comments.length === 0 ? <p className="no-comments">Start the conversation on this task.</p> : comments.map((comment) => {
                  const author = comment.user_id == null ? "Deleted user" : members.find((member) => member.user.id === comment.user_id)?.user.name || (comment.user_id === currentUserId ? "You" : "Teammate");
                  return <article className="comment" key={comment.id}><span className="comment-avatar">{author.slice(0, 1).toUpperCase()}</span><div><strong>{author}</strong><p>{comment.content}</p></div></article>;
                })}
              </div>
              <form className="comment-form" onSubmit={addComment}>
                <textarea aria-label="Write a comment" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={2} placeholder="Write a comment…" />
                <button className="primary" type="submit" disabled={busy || !content.trim()}>Comment</button>
              </form>
            </div>
            {error && <p className="form-error dialog-error" role="alert">{error}</p>}
            <footer className="dialog-footer"><button className="delete-button" onClick={deleteTask} disabled={busy}>Delete task</button><button className="secondary" onClick={onClose}>Done</button></footer>
          </>
        )}
      </section>
    </div>
  );
}
