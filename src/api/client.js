const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const WEBSOCKET_URL = API_URL.replace(/^http/, "ws");

let accessToken = localStorage.getItem("token");

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

export function getUserId() {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(payload)).sub) || null;
  } catch {
    return null;
  }
}

export function openMessageSocket(token) {
  return new WebSocket(`${WEBSOCKET_URL}/ws?token=${encodeURIComponent(token)}`);
}

async function request(path, { method = "GET", json, form } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(json ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: json ? JSON.stringify(json) : form,
    });
  } catch {
    throw new Error(`Unable to reach Workflow API at ${API_URL}. Check that the API is running.`);
  }

  const data = await response.json().catch(() => null);
  if (response.status === 401 && accessToken) {
    setAccessToken(null);
    window.dispatchEvent(new Event("workflow:session-expired"));
  }
  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(", ")
      : typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      form: new URLSearchParams({ username: email, password }),
    }),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", {
      method: "POST",
      json: { current_password: currentPassword, new_password: newPassword },
    }),
  requestPasswordReset: (email) =>
    request("/auth/forgot-password", { method: "POST", json: { email } }),
  resetPassword: (token, newPassword) =>
    request("/auth/reset-password", { method: "POST", json: { token, new_password: newPassword } }),
  register: (name, email, password, inviteToken) =>
    request("/users/", {
      method: "POST",
      json: { name, email, password, ...(inviteToken ? { invite_token: inviteToken } : {}) },
    }),
  acceptInvite: (token) => request(`/invites/${encodeURIComponent(token)}/accept`, { method: "POST" }),
  listMyInvites: () => request("/invites/mine"),
  listNotifications: () => request("/notifications/?limit=100"),
  markNotificationRead: (notificationId) =>
    request(`/notifications/${notificationId}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),
  getCurrentUser: () => request("/users/me"),
  updateCurrentUser: (profile) => request("/users/me", { method: "PUT", json: profile }),
  requestAccountDeletion: (currentPassword) =>
    request("/users/me/deletion/request", { method: "POST", json: { current_password: currentPassword } }),
  confirmAccountDeletion: (code) =>
    request("/users/me/deletion/confirm", { method: "POST", json: { code } }),
  listTeams: () => request("/teams/?skip=0&limit=100"),
  createTeam: (name) => request("/teams/", { method: "POST", json: { name } }),
  joinTeam: (teamId) => request(`/teams/${teamId}/join`, { method: "POST" }),
  listMembers: (teamId) => request(`/teams/${teamId}/members`),
  createTeamInvite: (teamId, email) =>
    request(`/teams/${teamId}/invites`, { method: "POST", json: { email } }),
  listProjects: () => request("/projects/?skip=0&limit=100"),
  listProjectTeams: (projectId) => request(`/projects/${projectId}/teams`),
  addProjectTeams: (projectId, teamIds) =>
    request(`/projects/${projectId}/teams`, { method: "POST", json: { team_ids: teamIds } }),
  createProject: (project) => request("/projects/", { method: "POST", json: project }),
  listTasks: () => request("/tasks/?skip=0&limit=100"),
  createTask: (task) => request("/tasks/", { method: "POST", json: task }),
  updateTask: (taskId, changes) =>
    request(`/tasks/${taskId}`, { method: "PUT", json: changes }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: "DELETE" }),
  listComments: (taskId) => request(`/comments/?skip=0&limit=100&task_id=${taskId}`),
  createComment: (taskId, content) =>
    request("/comments/", { method: "POST", json: { task_id: taskId, content } }),
  listUsers: (search = "") =>
    request(`/users/?skip=0&limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  listConversations: () => request("/messages/conversations"),
  listTeamMessages: (teamId) => request(`/teams/${teamId}/messages?limit=100`),
  listDirectMessages: (userId) => request(`/messages/direct/${userId}?limit=100`),
  updateMessage: (messageId, content) =>
    request(`/messages/${messageId}`, { method: "PATCH", json: { content } }),
  deleteMessage: (messageId) => request(`/messages/${messageId}`, { method: "DELETE" }),
};
