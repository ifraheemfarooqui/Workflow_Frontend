import { useState } from "react";

function timeLabel(value) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "";
  return time.toLocaleString();
}

export default function NotificationsPanel({
  notifications,
  error,
  onOpen,
  onMarkAllRead,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  async function openNotification(notification) {
    try {
      await onOpen(notification);
      setIsOpen(false);
    } catch {
      // The parent displays the failed request in the notification panel.
    }
  }

  return (
    <div className="notifications-control">
      <button
        className="notification-trigger"
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">◉</span>
        <span>Notifications</span>
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </button>
      {isOpen && (
        <section className="notification-panel" aria-label="Team activity notifications">
          <header className="notification-panel-header">
            <div>
              <p className="dashboard-kicker">TEAM ACTIVITY</p>
              <h2>Notifications</h2>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="text-button" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </header>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notifications.length === 0 ? (
            <p className="notification-empty">Team and project updates will appear here.</p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <button
                  type="button"
                  className={`notification-item ${notification.read_at ? "" : "unread"}`}
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                >
                  <span className="notification-dot" aria-hidden="true" />
                  <span className="notification-copy">
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                    <time dateTime={notification.created_at}>{timeLabel(notification.created_at)}</time>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
