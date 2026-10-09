import { useSyncExternalStore } from "react";

const routePattern =
  /^\/(?:teams\/(?<teamId>\d+)(?:\/projects\/(?<projectId>\d+)(?:\/tasks\/(?<taskId>\d+))?)?|messages\/teams\/(?<chatTeamId>\d+)|messages\/direct\/(?<directUserId>\d+))?\/?$/;

function subscribe(onChange) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getPathname() {
  return window.location.pathname;
}

export function useRoute() {
  const pathname = useSyncExternalStore(subscribe, getPathname, () => "/");

  if (pathname === "/login") return { name: "login", pathname };
  if (pathname === "/profile") return { name: "profile", pathname };
  if (pathname === "/forgot-password") return { name: "forgot-password", pathname };
  if (pathname === "/reset-password") {
    return {
      name: "reset-password",
      resetToken: new URLSearchParams(window.location.search).get("token") || "",
      pathname,
    };
  }
  const match = pathname.match(routePattern);
  if (!match) return { name: "not-found", pathname };

  const { teamId, projectId, taskId, chatTeamId, directUserId } = match.groups;
  if (chatTeamId) {
    return { name: "team-chat", teamId: Number(chatTeamId), pathname };
  }
  if (directUserId) {
    return { name: "direct-chat", userId: Number(directUserId), pathname };
  }

  return {
    name: taskId ? "task" : projectId ? "project" : teamId ? "team" : "workspace",
    teamId: teamId ? Number(teamId) : null,
    projectId: projectId ? Number(projectId) : null,
    taskId: taskId ? Number(taskId) : null,
    pathname,
  };
}

export function navigate(path, { replace = false } = {}) {
  if (window.location.pathname === path) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const paths = {
  workspace: () => "/",
  login: () => "/login",
  profile: () => "/profile",
  forgotPassword: () => "/forgot-password",
  resetPassword: (token) => `/reset-password?${new URLSearchParams({ token })}`,
  team: (teamId) => `/teams/${teamId}`,
  project: (teamId, projectId) => `/teams/${teamId}/projects/${projectId}`,
  task: (teamId, projectId, taskId) =>
    `/teams/${teamId}/projects/${projectId}/tasks/${taskId}`,
  teamChat: (teamId) => `/messages/teams/${teamId}`,
  directChat: (userId) => `/messages/direct/${userId}`,
};
