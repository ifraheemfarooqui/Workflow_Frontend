import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getAccessToken, getUserId, setAccessToken } from "./src/api/client";
import { navigate, paths, useRoute } from "./src/routing/routes";
import AuthenticationPanel from "./src/components/AuthenticationPanel";
import ChatView from "./src/components/ChatView";
import CreateDialog from "./src/components/CreateDialog";
import Sidebar from "./src/components/Sidebar";
import TaskBoard from "./src/components/TaskBoard";
import TaskDialog from "./src/components/TaskDialog";
import UserProfile from "./src/components/UserProfile";
import ForgotPassword from "./src/components/ForgotPassword";
import ResetPassword from "./src/components/ResetPassword";
import TeamMembersDialog from "./src/components/TeamMembersDialog";
import InviteTeamMemberDialog from "./src/components/InviteTeamMemberDialog";
import ProjectTeamsDialog from "./src/components/ProjectTeamsDialog";
import NotificationsPanel from "./src/components/NotificationsPanel";

export default function App() {
  const route = useRoute();
  const [token, setToken] = useState(getAccessToken());
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [membersByTeam, setMembersByTeam] = useState({});
  const [dialog, setDialog] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pendingInvitesError, setPendingInvitesError] = useState("");
  const [notificationsError, setNotificationsError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [inviteError, setInviteError] = useState("");

  const currentUserId = getUserId();
  const inviteToken = new URLSearchParams(window.location.search).get("invite") || "";
  const memberships = useMemo(() => new Set(
    Object.entries(membersByTeam)
      .filter(([, members]) => members.some((member) => member.user.id === currentUserId))
      .map(([teamId]) => Number(teamId)),
  ), [membersByTeam, currentUserId]);
  const directMessageContacts = useMemo(() => {
    const sharedTeamUserIds = new Set(
      [...memberships].flatMap((teamId) =>
        (membersByTeam[teamId] || []).map((member) => member.user.id),
      ),
    );
    return users.filter((contact) =>
      contact.id !== currentUserId && sharedTeamUserIds.has(contact.id),
    );
  }, [users, memberships, membersByTeam, currentUserId]);
  const user = users.find((item) => item.id === currentUserId) || {
    name: "Your account",
    email: "",
  };

  const selectedTeam = teams.find((team) => team.id === route.teamId);
  const selectedProject = projects.find((project) =>
    project.id === route.projectId && project.teamIds?.includes(route.teamId),
  );
  const selectedMembers = selectedTeam ? membersByTeam[selectedTeam.id] || [] : [];
  const canManageSelectedTeam = selectedMembers.some(
    (member) => member.user.id === currentUserId && member.role_in_team === "manager",
  );
  const managedTeams = teams.filter((team) =>
    membersByTeam[team.id]?.some(
      (member) => member.user.id === currentUserId && member.role_in_team === "manager",
    ),
  );
  const selectedProjectTeams = selectedProject?.teams || [];
  const availableProjectTeams = managedTeams.filter(
    (team) => !selectedProject?.teamIds?.includes(team.id),
  );
  const selectedTeamProjects = projects.filter((project) =>
    project.teamIds?.includes(route.teamId),
  );
  const selectedTask = tasks.find((task) =>
    task.id === route.taskId && task.project_id === route.projectId,
  );
  const directChatUser = route.name === "direct-chat"
    ? directMessageContacts.find((item) => item.id === route.userId)
    : null;
  const selectedChat = route.name === "team-chat"
    ? { type: "team", id: route.teamId }
    : route.name === "direct-chat"
      ? { type: "direct", id: route.userId }
      : null;
  const visibleTasks = tasks.filter((task) => task.project_id === route.projectId);

  const loadWorkspace = useCallback(async () => {
    setBusy(true);
    setHasLoaded(false);
    setError("");
    try {
      const [teamList, projectList, taskList, userList, conversationList, currentUser, inviteResult, notificationResult] = await Promise.all([
        api.listTeams(),
        api.listProjects(),
        api.listTasks(),
        api.listUsers(),
        api.listConversations(),
        api.getCurrentUser(),
        api.listMyInvites().then(
          (invites) => ({ invites, error: "" }),
          (inviteRequestError) => ({ invites: [], error: inviteRequestError.message }),
        ),
        api.listNotifications().then(
          (items) => ({ items, error: "" }),
          (requestError) => ({ items: [], error: requestError.message }),
        ),
      ]);
      const [memberResults, projectTeamLists] = await Promise.all([
        Promise.allSettled(teamList.map((team) => api.listMembers(team.id))),
        Promise.all(projectList.map((project) => api.listProjectTeams(project.id))),
      ]);
      const accessibleTeams = teamList.flatMap((team, index) => {
        const result = memberResults[index];
        return result.status === "fulfilled"
          ? [{ team, members: result.value }]
          : [];
      });

      setTeams(accessibleTeams.map(({ team }) => team));
      setProjects(projectList.map((project, index) => ({
        ...project,
        teams: projectTeamLists[index].map((relation) => relation.team),
        teamIds: projectTeamLists[index].map((relation) => relation.team.id),
      })));
      setTasks(taskList);
      setUsers([...userList, currentUser]);
      setConversations(conversationList);
      setPendingInvites(inviteResult.invites);
      setPendingInvitesError(inviteResult.error);
      setNotifications(notificationResult.items);
      setNotificationsError(notificationResult.error);
      setMembersByTeam(Object.fromEntries(
        accessibleTeams.map(({ team, members }) => [team.id, members]),
      ));
      if (accessibleTeams.length < teamList.length) {
        setError("Some team details could not be loaded. Unavailable teams were hidden; retry to load them again.");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (token) loadWorkspace();
  }, [token, loadWorkspace]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [route.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = window.setInterval(() => {
      api.listNotifications()
        .then((items) => {
          setNotifications(items);
          setNotificationsError("");
        })
        .catch((requestError) => setNotificationsError(requestError.message));
    }, 30000);
    return () => window.clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const publicPasswordRoutes = ["forgot-password", "reset-password"];
    if (!token && route.name !== "login" && !publicPasswordRoutes.includes(route.name)) {
      navigate(paths.login(), { replace: true });
    } else if (token && route.name === "login" && !inviteToken) {
      navigate(paths.workspace(), { replace: true });
    }
  }, [token, route.name, inviteToken]);

  useEffect(() => {
    if (!token || route.name !== "login" || !inviteToken) return undefined;
    let active = true;
    api.acceptInvite(inviteToken)
      .then(() => {
        if (active) navigate(paths.workspace(), { replace: true });
      })
      .catch((requestError) => {
        if (active) {
          setAccessToken(null);
          setToken(null);
          setInviteError(requestError.message);
        }
      });
    return () => {
      active = false;
    };
  }, [token, route.name, inviteToken]);

  useEffect(() => {
    const expireSession = () => setToken(null);
    window.addEventListener("workflow:session-expired", expireSession);
    return () => window.removeEventListener("workflow:session-expired", expireSession);
  }, []);

  useEffect(() => {
    if (!token || busy || !hasLoaded || error) return;

    if (route.name === "not-found") {
      navigate(paths.workspace(), { replace: true });
      return;
    }

    if (["workspace", "login", "profile", "forgot-password", "reset-password"].includes(route.name)) return;

    if (route.name === "direct-chat") {
      if (!directChatUser || directChatUser.id === currentUserId) {
        navigate(paths.workspace(), { replace: true });
      }
      return;
    }

    if (!selectedTeam || !memberships.has(route.teamId)) {
      navigate(paths.workspace(), { replace: true });
      return;
    }

    if (route.name === "team-chat") return;

    if (route.name === "project" || route.name === "task") {
      if (!selectedProject) {
        navigate(paths.team(route.teamId), { replace: true });
        return;
      }
    }

    if (route.name === "task" && !selectedTask) {
      navigate(paths.project(route.teamId, route.projectId), { replace: true });
    }
  }, [
    token, busy, hasLoaded, error, route, selectedTeam, selectedProject, selectedTask,
    directChatUser, currentUserId, memberships,
  ]);

  async function authenticate({ name, email, password, registering, inviteToken: invitation }) {
    if (registering) await api.register(name, email, password, invitation);
    const result = await api.login(email, password);
    setAccessToken(result.access_token);
    if (invitation && !registering) {
      try {
        await api.acceptInvite(invitation);
      } catch (requestError) {
        setAccessToken(null);
        throw requestError;
      }
    }
    setToken(result.access_token);
    navigate(paths.workspace(), { replace: true });
  }

  function signOut() {
    setAccessToken(null);
    setToken(null);
    setTeams([]);
    setProjects([]);
    setTasks([]);
    setMembersByTeam({});
    setError("");
    navigate(paths.login(), { replace: true });
  }

  async function changePassword(currentPassword, newPassword) {
    await api.changePassword(currentPassword, newPassword);
    setLoginNotice("Your password was changed. Please sign in again.");
    signOut();
  }

  async function requestPasswordReset(email) {
    return api.requestPasswordReset(email);
  }

  async function resetPassword(tokenValue, newPassword) {
    return api.resetPassword(tokenValue, newPassword);
  }

  async function requestAccountDeletion(currentPassword) {
    return api.requestAccountDeletion(currentPassword);
  }

  async function confirmAccountDeletion(code) {
    await api.confirmAccountDeletion(code);
    setLoginNotice("Your account has been deleted.");
    signOut();
  }

  async function createTeam({ name }) {
    const created = await api.createTeam(name);
    await loadWorkspace();
    navigate(paths.team(created.id));
  }

  async function createProject({ name, description }) {
    if (!selectedTeam) throw new Error("Choose a team before creating a project.");
    const created = await api.createProject({ name, description, team_id: selectedTeam.id });
    await loadWorkspace();
    navigate(paths.project(selectedTeam.id, created.id));
  }

  async function inviteTeamMember(email) {
    if (!selectedTeam || !canManageSelectedTeam) {
      throw new Error("Only a team manager can invite members.");
    }
    await api.createTeamInvite(selectedTeam.id, email);
    await loadWorkspace();
  }

  async function addProjectTeam(teamId) {
    if (!selectedProject) throw new Error("Choose a project before adding a team.");
    await api.addProjectTeams(selectedProject.id, [teamId]);
    await loadWorkspace();
  }

  async function acceptPendingInvite(invite) {
    setMobileNavOpen(false);
    await api.acceptInvite(invite.token);
    await loadWorkspace();
  }

  async function openNotification(notification) {
    try {
      if (!notification.read_at) {
        const updated = await api.markNotificationRead(notification.id);
        setNotifications((current) => current.map((item) =>
          item.id === updated.id ? updated : item,
        ));
      }
      const project = projects.find((item) => item.id === notification.project_id);
      const teamId = memberships.has(notification.team_id)
        ? notification.team_id
        : project?.teamIds.find((id) => memberships.has(id));
      if (teamId && notification.project_id && project) {
        if (notification.task_id) {
          navigate(paths.task(teamId, notification.project_id, notification.task_id));
        } else {
          navigate(paths.project(teamId, notification.project_id));
        }
      } else if (teamId) {
        navigate(paths.team(teamId));
      } else {
        navigate(paths.workspace());
      }
      setNotificationsError("");
    } catch (requestError) {
      setNotificationsError(requestError.message);
      throw requestError;
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.read_at
        ? item
        : { ...item, read_at: readAt },
      ));
      setNotificationsError("");
    } catch (requestError) {
      setNotificationsError(requestError.message);
    }
  }

  async function joinTeam(teamId) {
    setError("");
    try {
      await api.joinTeam(teamId);
      await loadWorkspace();
      navigate(paths.team(teamId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveProfile(profile) {
    const updatedUser = await api.updateCurrentUser(profile);
    setUsers((current) => current.map((item) =>
      item.id === updatedUser.id ? updatedUser : item,
    ));
    return updatedUser;
  }

  async function createTask(task) {
    const created = await api.createTask(task);
    setTasks((current) => [...current, created]);
  }

  async function changeTaskStatus(task, status) {
    setError("");
    try {
      const updated = await api.updateTask(task.id, { status });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function deleteTask(taskId) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    navigate(paths.project(route.teamId, route.projectId), { replace: true });
  }

  function selectTask(task) {
    navigate(paths.task(route.teamId, route.projectId, task.id));
  }

  function closeTask() {
    navigate(paths.project(route.teamId, route.projectId), { replace: true });
  }

  const handleDirectMessage = useCallback((message) => {
    const partnerId = message.sender_id === currentUserId
      ? message.recipient_id
      : message.sender_id;
    setConversations((current) => [
      message,
      ...current.filter((item) => {
        const itemPartnerId = item.sender_id === currentUserId
          ? item.recipient_id
          : item.sender_id;
        return itemPartnerId !== partnerId;
      }),
    ].sort((first, second) => second.id - first.id));
  }, [currentUserId]);

  useEffect(() => {
    const pageTitle = route.name === "login"
      ? "Sign in | WorkFlow"
      : route.name === "team-chat" && selectedTeam
        ? `${selectedTeam.name} chat | WorkFlow`
        : route.name === "direct-chat" && directChatUser
          ? `${directChatUser.name} | WorkFlow`
          : route.name === "profile"
            ? "Your profile | WorkFlow"
            : route.name === "task" && selectedTask
            ? `${selectedTask.title} | WorkFlow`
            : selectedProject
              ? `${selectedProject.name} | WorkFlow`
              : selectedTeam
                ? `${selectedTeam.name} | WorkFlow`
                : "WorkFlow";
    document.title = pageTitle;
  }, [route.name, selectedTeam, selectedProject, selectedTask, directChatUser]);

  if (route.name === "forgot-password") {
    return <ForgotPassword onSubmit={requestPasswordReset} onSignIn={() => navigate(paths.login())} />;
  }
  if (route.name === "reset-password") {
    return (
      <ResetPassword
        token={route.resetToken}
        onSubmit={resetPassword}
        onSignIn={() => navigate(paths.login())}
      />
    );
  }
  if (!token || route.name === "login") {
    return (
      <AuthenticationPanel
        onAuthenticate={authenticate}
        onForgotPassword={() => navigate(paths.forgotPassword())}
        notice={loginNotice}
        inviteToken={inviteToken}
        inviteError={inviteError}
      />
    );
  }

  return (
    <main className={`app-shell ${mobileNavOpen ? "mobile-nav-open" : ""}`}>
      {mobileNavOpen && (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Dismiss navigation overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar
        mobileNavOpen={mobileNavOpen}
        onCloseMobileNav={() => setMobileNavOpen(false)}
        teams={teams}
        memberships={memberships}
        selectedTeamId={route.teamId}
        conversations={conversations}
        pendingInvites={pendingInvites}
        pendingInvitesError={pendingInvitesError}
        onAcceptInvite={acceptPendingInvite}
        users={users}
        currentUserId={currentUserId}
        selectedChat={selectedChat}
        isDashboard={route.name === "workspace"}
        isProfile={route.name === "profile"}
        onSelectDashboard={() => navigate(paths.workspace())}
        onSelectProfile={() => navigate(paths.profile())}
        onSelectTeam={(teamId) => navigate(paths.team(teamId))}
        onSelectTeamChat={(teamId) => navigate(paths.teamChat(teamId))}
        onSelectDirectChat={(userId) => navigate(paths.directChat(userId))}
        onCreateTeam={() => setDialog({ type: "team" })}
        onJoinTeam={joinTeam}
        user={user}
        onSignOut={signOut}
      />
      <section className="workspace">
        <header className="workspace-header">
          <button
            className="mobile-nav-trigger"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="workspace-sidebar"
            onClick={() => setMobileNavOpen(true)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="breadcrumbs">
            <a href="/" onClick={(event) => { event.preventDefault(); navigate(paths.workspace()); }}>Your workspace</a>
            {route.name === "team-chat" && selectedTeam && <>
              <span className="breadcrumb-slash">/</span>
              <strong>{selectedTeam.name} chat</strong>
            </>}
            {route.name === "direct-chat" && directChatUser && <>
              <span className="breadcrumb-slash">/</span>
              <strong>{directChatUser.name}</strong>
            </>}
            {route.name === "profile" && <>
              <span className="breadcrumb-slash">/</span>
              <strong>Your profile</strong>
            </>}
            {selectedTeam && route.name !== "team-chat" && <>
              <span className="breadcrumb-slash">/</span>
              <a href={paths.team(selectedTeam.id)} onClick={(event) => { event.preventDefault(); navigate(paths.team(selectedTeam.id)); }}>{selectedTeam.name}</a>
            </>}
            {selectedProject && <>
              <span className="breadcrumb-slash">/</span>
              <strong>{selectedProject.name}</strong>
            </>}
            {selectedTask && <>
              <span className="breadcrumb-slash">/</span>
              <strong>{selectedTask.title}</strong>
            </>}
          </div>
          <div className="header-actions">
            <NotificationsPanel
              notifications={notifications}
              error={notificationsError}
              onOpen={openNotification}
              onMarkAllRead={markAllNotificationsRead}
            />
            <span className={`connection-state ${error ? "connection-error" : ""}`}><i />{error ? "Connection issue" : "Synced with API"}</span>
            <span className="header-avatar" title={user.name}>{user.name.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        {error && <div className="alert-banner" role="alert"><span>{error}</span><div><button className="retry-button" onClick={loadWorkspace}>Retry</button><button onClick={() => setError("")} aria-label="Dismiss error">×</button></div></div>}
        <div className="workspace-content">
          {route.name === "profile" ? (
            <UserProfile
              user={user}
              onSave={saveProfile}
              onChangePassword={changePassword}
              onRequestDeletion={requestAccountDeletion}
              onConfirmDeletion={confirmAccountDeletion}
            />
          ) : route.name === "team-chat" && selectedTeam ? (
            <ChatView
              key={`team-${selectedTeam.id}`}
              target={{ type: "team", id: selectedTeam.id, name: selectedTeam.name, memberCount: selectedMembers.length }}
              user={user}
              currentUserId={currentUserId}
              users={users}
            />
          ) : route.name === "direct-chat" && directChatUser ? (
            <ChatView
              key={`direct-${directChatUser.id}`}
              target={{ type: "direct", id: directChatUser.id }}
              user={directChatUser}
              currentUserId={currentUserId}
              users={users}
              onDirectMessage={handleDirectMessage}
            />
          ) : !selectedTeam ? (
            <section className="dashboard-view">
              <div className="dashboard-hero">
                <div className="dashboard-hero-copy">
                  <span className="dashboard-kicker"><span /> YOUR WORKSPACE</span>
                  <h1>Good work starts<br />with a good team.</h1>
                  <p>Bring your people together, share ideas, and keep every project moving.</p>
                  <div className="welcome-actions">
                    <button className="primary" onClick={() => setDialog({ type: "team" })}>Create a team <span>→</span></button>
                    {teams.some((team) => !memberships.has(team.id)) && <span>or explore a team below</span>}
                  </div>
                </div>
                <div className="dashboard-hero-art" aria-hidden="true">
                  <span className="hero-orbit orbit-one" />
                  <span className="hero-orbit orbit-two" />
                  <span className="hero-art-card hero-card-one">✦ <span>Ideas</span></span>
                  <span className="hero-art-card hero-card-two">↗ <span>Momentum</span></span>
                  <span className="hero-art-center">W</span>
                </div>
              </div>
              <div className="dashboard-section-heading">
                <div><span className="dashboard-kicker">YOUR PEOPLE</span><h2>Teams you’re part of</h2></div>
                <span className="dashboard-section-count">{teams.filter((team) => memberships.has(team.id)).length} teams</span>
              </div>
              <div className="dashboard-team-grid">
                {teams.filter((team) => memberships.has(team.id)).map((team, index) => {
                  const teamProjects = projects.filter((project) => project.teamIds?.includes(team.id));
                  const teamTaskCount = tasks.filter((task) =>
                    teamProjects.some((project) => project.id === task.project_id),
                  ).length;
                  return (
                    <button className={`dashboard-team-card team-card-${index % 4}`} key={team.id} onClick={() => navigate(paths.team(team.id))}>
                      <span className="dashboard-card-icon">{team.name.slice(0, 1).toUpperCase()}</span>
                      <span className="dashboard-card-copy">
                        <strong>{team.name}</strong>
                        <small>{teamProjects.length} {teamProjects.length === 1 ? "project" : "projects"} · {teamTaskCount} tasks</small>
                      </span>
                      <span className="dashboard-card-arrow" aria-hidden="true">↗</span>
                    </button>
                  );
                })}
                {teams.filter((team) => memberships.has(team.id)).length === 0 && (
                  <div className="dashboard-empty-card">
                    <span>✦</span><strong>Your next great team starts here.</strong>
                    <small>Create a team or join one from Discover teams in the sidebar.</small>
                  </div>
                )}
              </div>
              {busy && <span className="loading-note">Loading your workspace…</span>}
            </section>
          ) : !selectedProject ? (
            <section className="team-hub">
              <div className={`team-hub-hero team-hero-${selectedTeam.id % 4}`}>
                <div className="team-hub-copy">
                  <span className="dashboard-kicker"><span /> TEAM SPACE</span>
                  <h1>{selectedTeam.name}</h1>
                  <p>A shared home for your team's projects, plans, and progress.</p>
                  <div className="team-hub-actions">
                    <button className="primary" onClick={() => navigate(paths.teamChat(selectedTeam.id))}>Open team chat <span>↗</span></button>
                    {memberships.has(selectedTeam.id) && <button className="team-hub-secondary" onClick={() => setDialog({ type: "project" })}>＋ New project</button>}
                    {canManageSelectedTeam && (
                      <button className="team-hub-secondary" onClick={() => setDialog({ type: "invite-member" })}>
                        ＋ Add members
                      </button>
                    )}
                    {memberships.has(selectedTeam.id) && (
                      <button className="team-hub-secondary" onClick={() => setDialog({ type: "members" })}>
                        View members
                      </button>
                    )}
                  </div>
                </div>
                <div className="team-hub-stats">
                  <div><strong>{selectedTeamProjects.length}</strong><span>PROJECTS</span></div>
                  <div><strong>{selectedMembers.length}</strong><span>TEAMMATES</span></div>
                  <div><strong>{tasks.filter((task) => selectedTeamProjects.some((project) => project.id === task.project_id)).length}</strong><span>TASKS</span></div>
                </div>
              </div>
              <div className="team-projects-heading">
                <div><span className="dashboard-kicker">MAKE IT HAPPEN</span><h2>Projects</h2></div>
                {memberships.has(selectedTeam.id) && <button className="secondary" onClick={() => setDialog({ type: "project" })}>＋ Create project</button>}
              </div>
              {selectedTeamProjects.length === 0 ? (
                <div className="team-projects-empty">
                  <span className="project-empty-icon">◈</span>
                  <h3>A blank canvas for your team.</h3>
                  <p>Create your first project to organize tasks and turn ideas into progress.</p>
                  {memberships.has(selectedTeam.id) && <button className="primary" onClick={() => setDialog({ type: "project" })}>Create the first project <span>→</span></button>}
                </div>
              ) : (
                <div className="team-project-grid">
                  {selectedTeamProjects.map((project, index) => {
                    const projectTaskCount = tasks.filter((task) => task.project_id === project.id).length;
                    return (
                      <button className={`team-project-card project-card-${index % 4}`} key={project.id} onClick={() => navigate(paths.project(selectedTeam.id, project.id))}>
                        <span className="project-card-top"><span className="project-card-icon">◈</span><span className="project-card-arrow">↗</span></span>
                        <strong>{project.name}</strong>
                        <p>{project.description || "A shared space to keep the work moving."}</p>
                        <span className="project-card-meta">{projectTaskCount} {projectTaskCount === 1 ? "task" : "tasks"} <span>·</span> Open board</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <div className="project-view">
              <div className="project-heading">
                <div>
                  <p className="eyebrow">{selectedTeam.name} <span className="heading-divider">/</span> PROJECT BOARD</p>
                  <h1>{selectedProject.name}</h1>
                  <p className="project-description">{selectedProject.description || "A shared space to keep the work moving."}</p>
                </div>
                <div className="project-heading-actions">
                  {availableProjectTeams.length > 0 && canManageSelectedTeam && (
                    <button className="secondary" onClick={() => setDialog({ type: "project-teams" })}>＋ Add team</button>
                  )}
                  <button className="primary add-task-button" onClick={() => setDialog({ type: "task" })}><span>+</span> Add task</button>
                </div>
              </div>
              <div className="board-toolbar">
                <div className="board-summary"><span className="summary-dot" />{visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"} in this project</div>
                <div className="avatar-stack" aria-label="Team members">
                  {selectedMembers.slice(0, 4).map((member) => <span className="stack-avatar" key={member.user.id} title={member.user.name}>{member.user.name.slice(0, 1).toUpperCase()}</span>)}
                  {selectedMembers.length > 4 && <span className="stack-more">+{selectedMembers.length - 4}</span>}
                </div>
              </div>
              <TaskBoard
                tasks={visibleTasks}
                users={users}
                teams={selectedProjectTeams}
                onOpenTask={selectTask}
                onChangeStatus={changeTaskStatus}
                onCreateTask={() => setDialog({ type: "task" })}
              />
            </div>
          )}
        </div>
      </section>
      {dialog?.type === "team" && <CreateDialog type="team" onClose={() => setDialog(null)} onSubmit={createTeam} />}
      {dialog?.type === "project" && <CreateDialog type="project" teamName={selectedTeam?.name} onClose={() => setDialog(null)} onSubmit={createProject} />}
      {dialog?.type === "task" && selectedProject && (
        <TaskDialog
          project={selectedProject}
          members={selectedMembers}
          teams={selectedProjectTeams}
          currentUserId={currentUserId}
          onClose={() => setDialog(null)}
          onTaskCreated={createTask}
        />
      )}
      {dialog?.type === "invite-member" && selectedTeam && canManageSelectedTeam && (
        <InviteTeamMemberDialog
          team={selectedTeam}
          onClose={() => setDialog(null)}
          onSubmit={inviteTeamMember}
        />
      )}
      {dialog?.type === "project-teams" && selectedProject && (
        <ProjectTeamsDialog
          teams={availableProjectTeams}
          projectName={selectedProject.name}
          onClose={() => setDialog(null)}
          onSubmit={addProjectTeam}
        />
      )}
      {dialog?.type === "members" && selectedTeam && memberships.has(selectedTeam.id) && (
        <TeamMembersDialog
          team={selectedTeam}
          members={selectedMembers}
          onClose={() => setDialog(null)}
        />
      )}
      {route.name === "task" && selectedTask && selectedProject && (
        <TaskDialog
          task={selectedTask}
          project={selectedProject}
          members={selectedMembers}
          teams={selectedProjectTeams}
          currentUserId={currentUserId}
          onClose={closeTask}
          onTaskDeleted={deleteTask}
        />
      )}
    </main>
  );
}
