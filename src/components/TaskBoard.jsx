const columns = [
  { id: "todo", title: "To do", tone: "todo" },
  { id: "in_progress", title: "In progress", tone: "progress" },
  { id: "done", title: "Done", tone: "done" },
];

export default function TaskBoard({ tasks, users, onOpenTask, onChangeStatus, onCreateTask }) {
  const userNames = new Map(users.map((user) => [user.id, user.name]));

  return (
    <div className="board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);
        return (
          <section className="board-column" key={column.id}>
            <header className="column-heading">
              <span className={`status-dot ${column.tone}`} />
              <h3>{column.title}</h3><span className="task-count">{columnTasks.length}</span>
              {column.id === "todo" && <button className="column-add" onClick={onCreateTask} aria-label="Create a task">+</button>}
            </header>
            <div className="task-list">
              {columnTasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <button className="task-open" onClick={() => onOpenTask(task)}>
                    <span className={`priority-label priority-${task.priority}`}>{task.priority}</span>
                    <strong>{task.title}</strong>
                    {task.description && <span className="task-description">{task.description}</span>}
                  </button>
                  <div className="task-card-footer">
                    <span className="assignee">{task.assigned_to ? userNames.get(task.assigned_to) || "Teammate" : "Unassigned"}</span>
                    <select aria-label={`Change status for ${task.title}`} value={task.status} onChange={(event) => onChangeStatus(task, event.target.value)}>
                      {columns.map((status) => <option key={status.id} value={status.id}>{status.title}</option>)}
                    </select>
                  </div>
                </article>
              ))}
              {columnTasks.length === 0 && <p className="column-empty">Nothing here yet</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
