import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const mocks = vi.hoisted(() => ({
  api: {
    listTeams: vi.fn(),
    listProjects: vi.fn(),
    listTasks: vi.fn(),
    listUsers: vi.fn(),
    listConversations: vi.fn(),
    getCurrentUser: vi.fn(),
    listMyInvites: vi.fn(),
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    acceptInvite: vi.fn(),
    listMembers: vi.fn(),
    listProjectTeams: vi.fn(),
  },
  getAccessToken: vi.fn(),
  getUserId: vi.fn(),
  setAccessToken: vi.fn(),
}));

vi.mock("./src/api/client", () => mocks);

describe("App workspace loading", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
    mocks.getAccessToken.mockReturnValue("test-token");
    mocks.getUserId.mockReturnValue(1);
    mocks.api.listTeams.mockResolvedValue([
      { id: 1, name: "Available team" },
      { id: 2, name: "Unavailable team" },
    ]);
    mocks.api.listProjects.mockResolvedValue([]);
    mocks.api.listTasks.mockResolvedValue([]);
    mocks.api.listUsers.mockResolvedValue([]);
    mocks.api.listConversations.mockResolvedValue([]);
    mocks.api.getCurrentUser.mockResolvedValue({
      id: 1,
      name: "Test User",
      email: "test@example.com",
    });
    mocks.api.listMyInvites.mockResolvedValue([]);
    mocks.api.listNotifications.mockResolvedValue([]);
    mocks.api.markNotificationRead.mockImplementation(async (id) => ({
      id,
      read_at: new Date().toISOString(),
    }));
    mocks.api.markAllNotificationsRead.mockResolvedValue(undefined);
    mocks.api.listMembers.mockImplementation((teamId) => teamId === 1
      ? Promise.resolve([
        { user: { id: 1, name: "Test User", email: "test@example.com" }, role_in_team: "manager" },
        { user: { id: 2, name: "Alex Member", email: "alex@example.com" }, role_in_team: "member" },
      ])
      : Promise.reject(new Error("Member list unavailable")));
    mocks.api.listProjectTeams.mockResolvedValue([]);
  });

  it("keeps accessible teams visible when one team member request fails", async () => {
    render(<App />);

    const teamsNavigation = within(screen.getByRole("region", { name: "YOUR TEAMS" }));
    expect(await teamsNavigation.findByRole("button", { name: /Available team/ })).toBeInTheDocument();
    expect(screen.queryByText("Unavailable team")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Some team details could not be loaded. Unavailable teams were hidden",
    );
  });

  it("shows the user's teams in the sidebar on a team overview page", async () => {
    window.history.replaceState({}, "", "/teams/1");
    render(<App />);

    const teamLink = await within(screen.getByRole("region", { name: "YOUR TEAMS" }))
      .findByRole("button", { name: /Available team/ });
    expect(teamLink).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "YOUR TEAMS" })).toContainElement(teamLink);
  });

  it("loads the workspace when pending invitations cannot be fetched", async () => {
    mocks.api.listTeams.mockResolvedValue([{ id: 1, name: "Available team" }]);
    mocks.api.listMyInvites.mockRejectedValue(new Error("Not Found"));
    render(<App />);

    expect(await within(screen.getByRole("region", { name: "YOUR TEAMS" }))
      .findByRole("button", { name: /Available team/ })).toBeInTheDocument();
    expect(screen.getByText("Invitations could not be loaded: Not Found")).toBeInTheDocument();
    expect(screen.queryByText("Connection issue")).not.toBeInTheDocument();
  });

  it("lets a team member view the team's member list", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Available team.*project/ }));
    await user.click(await screen.findByRole("button", { name: "View members" }));

    expect(screen.getByRole("dialog", { name: "Team members" })).toBeInTheDocument();
    expect(screen.getByText("Alex Member")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByText("manager")).toBeInTheDocument();
  });

  it("accepts a pending invitation from the workspace and reloads teams", async () => {
    const user = userEvent.setup();
    mocks.api.listMyInvites.mockResolvedValue([
      {
        id: 4,
        token: "invite-token",
        team: { id: 8, name: "Invited team" },
      },
    ]);
    mocks.api.acceptInvite.mockImplementation(async () => {
      mocks.api.listMyInvites.mockResolvedValue([]);
    });
    render(<App />);

    const messages = screen.getByRole("region", { name: "MESSAGES" });
    expect(await within(messages).findByRole("heading", { name: "Team invitations" })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Accept invite" }));

    expect(mocks.api.acceptInvite).toHaveBeenCalledWith("invite-token");
    expect(await screen.findByRole("heading", { name: "Teams you’re part of" })).toBeInTheDocument();
    expect(mocks.api.listTeams).toHaveBeenCalledTimes(2);
  });

  it("opens activity notifications and marks an item read before navigating", async () => {
    const user = userEvent.setup();
    mocks.api.listNotifications.mockResolvedValue([
      {
        id: 12,
        kind: "task_updated",
        title: "Task progress",
        body: "Draft is now done. Project progress: 1/1 tasks complete.",
        team_id: 1,
        project_id: null,
        task_id: null,
        created_at: "2026-10-10T12:00:00Z",
        read_at: null,
      },
    ]);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
    expect(screen.getByText(/Project progress: 1\/1 tasks complete/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Task progress/ }));

    expect(mocks.api.markNotificationRead).toHaveBeenCalledWith(12);
    expect(await screen.findByRole("heading", { name: "Available team" })).toBeInTheDocument();
  });

  it("opens the mobile navigation drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    const menuButton = await screen.findByRole("button", { name: "Open navigation menu" });
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Close navigation menu" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
