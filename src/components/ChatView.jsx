import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { api, getAccessToken, openMessageSocket } from "../api/client";

const RECONNECT_LIMIT_MS = 30000;
const EmojiPicker = lazy(() => import("emoji-picker-react"));

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ChatView({ target, user, currentUserId, users, onDirectMessage }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [mutatingMessageId, setMutatingMessageId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const socketRef = useRef(null);
  const messagesRef = useRef(null);
  const composerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectDelayRef = useRef(1000);
  const sendingContentRef = useRef(null);

  useEffect(() => {
    let active = true;
    const socket = openMessageSocket(getAccessToken());
    socketRef.current = socket;
    if (reconnectAttempt === 0) {
      setMessages([]);
      setLoading(true);
    }
    setConnection("connecting");

    socket.addEventListener("open", () => {
      if (!active) return;
      reconnectDelayRef.current = 1000;
      setConnection("connected");
      setError("");
    });
    socket.addEventListener("close", () => {
      if (!active) return;
      setConnection("reconnecting");
      const failedContent = sendingContentRef.current;
      if (failedContent) {
        sendingContentRef.current = null;
        setSending(false);
        setContent((current) => current || failedContent);
        setError("Connection interrupted before the message was confirmed. Your draft was restored.");
      }
      reconnectTimerRef.current = window.setTimeout(() => {
        if (active) setReconnectAttempt((attempt) => attempt + 1);
      }, reconnectDelayRef.current);
      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, RECONNECT_LIMIT_MS);
    });
    socket.addEventListener("error", () => {
      if (!active) return;
      setConnection("reconnecting");
      setError("Connection interrupted. Trying to reconnect…");
      socket.close();
    });
    socket.addEventListener("message", (event) => {
      if (!active) return;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "error") {
          const failedContent = sendingContentRef.current;
          sendingContentRef.current = null;
          setSending(false);
          if (failedContent) {
            setContent((current) => current || failedContent);
          }
          setError(payload.detail || "The message could not be sent.");
          return;
        }
        if (payload.data && (
          payload.type === "message" ||
          payload.type === "message_updated" ||
          payload.type === "message_deleted"
        )) {
          const incoming = payload.data;
          const matchesTarget = target.type === "team"
            ? incoming.team_id === target.id
            : incoming.team_id == null && (
              incoming.sender_id === target.id || incoming.recipient_id === target.id
            );
          if (matchesTarget) {
            if (payload.type === "message") {
              if (incoming.sender_id === currentUserId && sendingContentRef.current) {
                sendingContentRef.current = null;
                setSending(false);
                setContent("");
              }
              if (target.type === "direct") onDirectMessage(incoming);
              setMessages((current) => current.some((message) => message.id === incoming.id)
                ? current
                : [...current, incoming].sort((first, second) => first.id - second.id));
            } else {
              setMessages((current) => current.map((message) =>
                message.id === incoming.id ? incoming : message));
              if (target.type === "direct") onDirectMessage(incoming);
            }
          }
        }
      } catch {
        setError("Received an unreadable message from the API.");
      }
    });

    const loadMessages = target.type === "team"
      ? api.listTeamMessages(target.id)
      : api.listDirectMessages(target.id);
    loadMessages
      .then((history) => {
        if (!active) return;
        setMessages((current) => {
          const byId = new Map(history.map((message) => [message.id, message]));
          current.forEach((message) => byId.set(message.id, message));
          return [...byId.values()].sort((first, second) => first.id - second.id);
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active && reconnectAttempt === 0) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(reconnectTimerRef.current);
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [target.type, target.id, onDirectMessage, currentUserId, reconnectAttempt]);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  function sendMessage(event) {
    event.preventDefault();
    const trimmed = content.trim();
    const socket = socketRef.current;
    if (!trimmed || sending || !socket || socket.readyState !== WebSocket.OPEN) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setError("You are reconnecting. Your message has not been sent.");
      }
      return;
    }

    const payload = target.type === "team"
      ? { team_id: target.id, content: trimmed }
      : { recipient_id: target.id, content: trimmed };
    setError("");
    socket.send(JSON.stringify(payload));
    sendingContentRef.current = trimmed;
    setSending(true);
  }

  async function saveEdit(event, messageId) {
    event.preventDefault();
    if (!editContent.trim()) return;
    setMutatingMessageId(messageId);
    setError("");
    try {
      const updated = await api.updateMessage(messageId, editContent.trim());
      setMessages((current) => current.map((message) =>
        message.id === updated.id ? updated : message));
      if (target.type === "direct") onDirectMessage(updated);
      setEditingMessageId(null);
      setEditContent("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMutatingMessageId(null);
    }
  }

  async function deleteMessage(messageId) {
    if (!window.confirm("Delete this message? It will be replaced with a deleted-message notice.")) return;
    setMutatingMessageId(messageId);
    setError("");
    try {
      const deleted = await api.deleteMessage(messageId);
      setMessages((current) => current.map((message) =>
        message.id === deleted.id ? deleted : message));
      if (target.type === "direct") onDirectMessage(deleted);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMutatingMessageId(null);
    }
  }

  function insertEmoji(emoji) {
    const input = composerRef.current;
    const start = input?.selectionStart ?? content.length;
    const end = input?.selectionEnd ?? content.length;
    const updated = `${content.slice(0, start)}${emoji}${content.slice(end)}`;
    setContent(updated);
    setEmojiPickerOpen(false);
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  const title = target.type === "team" ? target.name : user.name;
  const subtitle = target.type === "team"
    ? `${target.memberCount} ${target.memberCount === 1 ? "member" : "members"}`
    : user.email;

  return (
    <section className="chat-view">
      <header className="chat-header">
        <span className={`chat-avatar ${target.type === "team" ? "chat-team-avatar" : ""}`}>
          {title.slice(0, 1).toUpperCase()}
        </span>
        <div className="chat-title">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <span className={`chat-connection ${connection}`} role="status" aria-live="polite">
          <i />{connection === "connected" ? "Live" : connection === "connecting" ? "Connecting…" : "Reconnecting…"}
          {connection === "reconnecting" && (
            <button className="chat-retry" type="button" onClick={() => {
              window.clearTimeout(reconnectTimerRef.current);
              reconnectDelayRef.current = 1000;
              setConnection("connecting");
              setReconnectAttempt((attempt) => attempt + 1);
            }}>Retry now</button>
          )}
        </span>
      </header>
      <div className="chat-messages" ref={messagesRef} aria-live="polite">
        {loading && <p className="chat-empty">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <div className="chat-welcome">
            <span className="chat-welcome-icon">✳</span>
            <strong>{target.type === "team" ? `Welcome to ${title}` : `Start a conversation with ${user.name}`}</strong>
            <p>Send a message to get the conversation going.</p>
          </div>
        )}
        {!loading && messages.map((message, index) => {
          const sender = users.find((item) => item.id === message.sender_id);
          const ownMessage = message.sender_id === currentUserId;
          const previous = messages[index - 1];
          const showSender = target.type === "team" && (!previous || previous.sender_id !== message.sender_id);
          return (
            <article className={`chat-message ${ownMessage ? "mine" : ""}`} key={message.id}>
              {!ownMessage && showSender && <span className="message-author">{message.sender_id == null ? "Deleted user" : sender?.name || "Teammate"}</span>}
              {editingMessageId === message.id ? (
                <form className="message-edit-form" onSubmit={(event) => saveEdit(event, message.id)}>
                  <textarea
                    aria-label="Edit message"
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    maxLength={2000}
                    autoFocus
                  />
                  <div>
                    <button type="button" onClick={() => setEditingMessageId(null)}>Cancel</button>
                    <button className="message-action-save" type="submit" disabled={!editContent.trim() || mutatingMessageId === message.id}>
                      {mutatingMessageId === message.id ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className={message.deleted_at ? "deleted-message" : ""}>{message.content}</p>
                  <time dateTime={message.created_at}>
                    {formatTime(message.created_at)}
                    {message.edited_at && !message.deleted_at && <span className="edited-label"> · edited</span>}
                  </time>
                  {ownMessage && !message.deleted_at && (
                    <div className="message-actions">
                      <button type="button" disabled={mutatingMessageId === message.id} onClick={() => {
                        setEditingMessageId(message.id);
                        setEditContent(message.content);
                        setError("");
                      }}>Edit</button>
                      <button type="button" disabled={mutatingMessageId === message.id} onClick={() => deleteMessage(message.id)}>
                        {mutatingMessageId === message.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
      {error && <p className="chat-error" role="alert">{error}</p>}
      <form className="chat-composer" onSubmit={sendMessage}>
        <div className="emoji-picker-wrap">
          <button
            className="emoji-toggle"
            type="button"
            aria-label="Choose an emoji"
            aria-expanded={emojiPickerOpen}
            onClick={() => setEmojiPickerOpen((open) => !open)}
          >☺</button>
          {emojiPickerOpen && (
            <div className="emoji-picker-popup">
              <Suspense fallback={<div className="emoji-picker-loading" role="status">Loading emojis…</div>}>
                <EmojiPicker
                  onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                  emojiStyle="native"
                  theme="light"
                  width="min(320px, calc(100vw - 40px))"
                  height={380}
                  previewConfig={{ showPreview: false }}
                />
              </Suspense>
            </div>
          )}
        </div>
        <textarea
          ref={composerRef}
          aria-label={`Message ${title}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
          maxLength={2000}
          rows={1}
          placeholder={`Message ${target.type === "team" ? "the team" : user.name}…`}
        />
        <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>
        <button className="primary" type="submit" disabled={!content.trim() || sending || connection !== "connected"}>
          {sending ? "Sending…" : "Send"} <span aria-hidden="true">↑</span>
        </button>
      </form>
    </section>
  );
}
