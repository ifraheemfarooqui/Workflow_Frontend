import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProjectTeamsDialog from "./ProjectTeamsDialog";

describe("ProjectTeamsDialog", () => {
  it("adds a selected team to the project", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ProjectTeamsDialog
        teams={[{ id: 8, name: "Research" }]}
        projectName="Roadmap"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add team" }));

    expect(onSubmit).toHaveBeenCalledWith(8);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
