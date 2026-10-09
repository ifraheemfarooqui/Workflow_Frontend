import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

function renderSidebar() {
  return render(
    <Sidebar
      teams={[{ id: 2, name: "Design" }]}
      memberships={new Set([2])}
      selectedTeamId={2}
      conversations={[]}
      users={[]}
      currentUserId={5}
      selectedChat={null}
      isDashboard
      isProfile={false}
      onSelectDashboard={vi.fn()}
      onSelectProfile={vi.fn()}
      onSelectTeam={vi.fn()}
      onSelectTeamChat={vi.fn()}
      onSelectDirectChat={vi.fn()}
      onCreateTeam={vi.fn()}
      onJoinTeam={vi.fn()}
      user={{ name: "Taylor", email: "taylor@example.test" }}
      onSignOut={vi.fn()}
    />,
  );
}

describe("Sidebar", () => {
  it("collapses and expands the team navigation", async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.getByText("Design")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /YOUR TEAMS/ }));
    expect(screen.queryByText("Design")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /YOUR TEAMS/ }));
    expect(screen.getByText("Design")).toBeInTheDocument();
  });
});
