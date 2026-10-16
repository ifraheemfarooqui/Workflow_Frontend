import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import PendingInvites from "./PendingInvites";

export default function Sidebar({
  teams,
  memberships,
  selectedTeamId,
  conversations,
  pendingInvites = [],
  pendingInvitesError = "",
  onAcceptInvite,
  mobileNavOpen = false,
  onCloseMobileNav,
  users,
  currentUserId,
  selectedChat,
  isDashboard,
  isProfile,
  onSelectDashboard,
  onSelectProfile,
  onSelectTeam,
  onSelectTeamChat,
  onSelectDirectChat,
  onCreateTeam,
  onJoinTeam,
  user,
  onSignOut,
}) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const searchInputRef = useRef(null);
  const activeTeams = teams.filter((team) => memberships.has(team.id));
  const discoverableTeams = teams.filter((team) => !memberships.has(team.id));
  const directConversations = conversations.map((message) => {
    const userId = message.sender_id === currentUserId ? message.recipient_id : message.sender_id;
    return { userId, user: users.find((item) => item.id === userId) };
  }).filter((conversation) => conversation.user);
  const normalizedSearch = search.trim();

  function selectNavigation(callback, ...args) {
    onCloseMobileNav?.();
    callback(...args);
  }

  useEffect(() => {
    let active = true;
    if (normalizedSearch.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError("");
      return () => { active = false; };
    }

    setSearching(true);
    setSearchError("");
    const timer = window.setTimeout(() => {
      api.listUsers(normalizedSearch)
        .then((results) => {
          if (active) setSearchResults(results);
        })
        .catch((requestError) => {
          if (active) {
            setSearchResults([]);
            setSearchError(requestError.message);
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [normalizedSearch]);

  useEffect(() => {
    function focusSearch(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <aside
      className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}
      id="workspace-sidebar"
      aria-label="Workspace navigation"
    >
      <a className="wordmark sidebar-brand" href="/" aria-label="Workflow home">
        <span className="brand-mark">W</span>
        <span>workflow</span>
        <span className="brand-spark" aria-hidden="true">✦</span>
      </a>
      <button
        className="mobile-nav-close"
        type="button"
        aria-label="Close navigation menu"
        onClick={onCloseMobileNav}
      >
        ×
      </button>

      <div className="sidebar-scroll">
        <div className="sidebar-workspace-label">
          <span className="workspace-presence" />
          YOUR WORKSPACE
        </div>

        <nav className="nav-section primary-navigation" aria-label="Main navigation">
          <button className={`nav-item dashboard-nav-item ${isDashboard ? "selected" : ""}`} onClick={() => selectNavigation(onSelectDashboard)}>
            <span className="nav-icon dashboard-icon">⌂</span>
            <span className="nav-label">Dashboard</span>
            <span className="nav-arrow" aria-hidden="true">↗</span>
          </button>
        </nav>

        <section className="nav-section messaging-section" aria-labelledby="messages-heading">
          <div className="section-heading">
            <span id="messages-heading">MESSAGES</span>
            <span className="section-counter">{directConversations.length + pendingInvites.length}</span>
          </div>
          <PendingInvites
            invites={pendingInvites}
            error={pendingInvitesError}
            onAccept={(invite) => selectNavigation(onAcceptInvite, invite)}
          />
          <label className="contact-search">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <span className="sr-only">Search teammates by name or email</span>
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a teammate…"
              autoComplete="off"
            />
            <span className="search-shortcut" aria-hidden="true">⌘ K</span>
          </label>
          {normalizedSearch.length > 0 && normalizedSearch.length < 2 && (
            <p className="search-hint">Type at least 2 characters to search teammates by name or email.</p>
          )}
          {normalizedSearch.length >= 2 && (
            <div className="contact-search-results" aria-live="polite">
              <span className="search-results-heading">TEAMMATES</span>
              {searching && <p className="sidebar-empty">Searching your teams…</p>}
              {searchError && <p className="sidebar-search-error" role="alert">{searchError}</p>}
              {!searching && !searchError && searchResults.length === 0 && (
                <p className="sidebar-empty">No teammates found. Search only includes people who share a team with you.</p>
              )}
              {searchResults.map((contact) => (
                <button
                  key={contact.id}
                  className="contact-result"
                  onClick={() => {
                    setSearch("");
                    selectNavigation(onSelectDirectChat, contact.id);
                  }}
                >
                  <span className="team-avatar dm-avatar">{contact.name.slice(0, 1).toUpperCase()}</span>
                  <span className="contact-result-copy">
                    <strong>{contact.name}</strong>
                    <small>{contact.email}</small>
                  </span>
                  <span className="contact-result-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}
          {normalizedSearch.length === 0 && (directConversations.length === 0
            ? <p className="sidebar-empty">Start a conversation with someone on your team.</p>
            : <div className="direct-conversation-list">
              {directConversations.map(({ user: contact }) => (
                <button
                  key={contact.id}
                  className={`nav-item direct-nav-item ${selectedChat?.type === "direct" && selectedChat.id === contact.id ? "selected" : ""}`}
                  onClick={() => selectNavigation(onSelectDirectChat, contact.id)}
                >
                  <span className="team-avatar dm-avatar">{contact.name.slice(0, 1).toUpperCase()}</span>
                  <span className="nav-label">{contact.name}</span>
                  <span className="nav-arrow" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="nav-section teams-section" aria-labelledby="teams-heading">
          <div className="section-heading">
            <button
              className="teams-toggle"
              type="button"
              aria-expanded={teamsExpanded}
              aria-controls="teams-navigation"
              onClick={() => setTeamsExpanded((expanded) => !expanded)}
            >
              <span id="teams-heading">YOUR TEAMS</span>
              <span className={`teams-toggle-icon ${teamsExpanded ? "expanded" : ""}`} aria-hidden="true">›</span>
            </button>
            <button className="icon-button create-team-icon" onClick={() => selectNavigation(onCreateTeam)} aria-label="Create a team">+</button>
          </div>
          {teamsExpanded && (
            <div id="teams-navigation">
              {activeTeams.length === 0 && <p className="sidebar-empty">Join or create a team to get started.</p>}
              {activeTeams.map((team, index) => (
                <div className="team-nav-group" key={team.id}>
                  <button
                    className={`nav-item team-nav-item ${team.id === selectedTeamId ? "selected" : ""}`}
                    onClick={() => selectNavigation(onSelectTeam, team.id)}
                  >
                    <span className={`team-avatar team-avatar-${index % 5}`}>{team.name.slice(0, 1).toUpperCase()}</span>
                    <span className="nav-label">{team.name}</span>
                    <span className="nav-arrow" aria-hidden="true">›</span>
                  </button>
                  <button
                    className={`team-chat-link ${selectedChat?.type === "team" && selectedChat.id === team.id ? "selected" : ""}`}
                    onClick={() => selectNavigation(onSelectTeamChat, team.id)}
                  >
                    <span className="team-chat-status" aria-hidden="true" />
                    Team chat
                    <span className="team-chat-label">LIVE</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {discoverableTeams.length > 0 && (
          <section className="nav-section discover-section" aria-labelledby="discover-heading">
            <div className="section-heading"><span id="discover-heading">DISCOVER TEAMS</span></div>
            {discoverableTeams.map((team, index) => (
              <div key={team.id} className="discover-item">
                <span className={`team-avatar muted-avatar team-avatar-${index % 5}`}>{team.name.slice(0, 1).toUpperCase()}</span>
                <span className="nav-label">{team.name}</span>
                <button className="join-button" onClick={() => selectNavigation(onJoinTeam, team.id)}>Join</button>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="sidebar-footer">
        <button
          className={`user-profile-link ${isProfile ? "selected" : ""}`}
          type="button"
          onClick={() => selectNavigation(onSelectProfile)}
          aria-label="Open your profile"
        >
          <span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <span className="user-summary"><strong>{user.name}</strong><small>{user.email}</small></span>
        </button>
        <button className="sign-out" onClick={() => selectNavigation(onSignOut)}>Sign out</button>
      </footer>
    </aside>
  );
}
