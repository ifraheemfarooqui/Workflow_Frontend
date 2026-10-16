import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TaskDialog from "./TaskDialog";

describe("TaskDialog", () => {
  it("submits a team assignment alongside an individual assignee", async () => {
    const user = userEvent.setup();
    const onTaskCreated = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <TaskDialog
        project={{ id: 4, name: "Website" }}
        members={[{ user: { id: 3, name: "Taylor" } }]}
        teams={[{ id: 7, name: "Design" }]}
        currentUserId={3}
        onClose={onClose}
        onTaskCreated={onTaskCreated}
      />,
    );

    await user.type(screen.getByLabelText("Task name"), "Review design");
    await user.selectOptions(screen.getByLabelText("Person"), "3");
    await user.selectOptions(screen.getByLabelText("Team"), "7");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(onTaskCreated).toHaveBeenCalledWith({
      title: "Review design",
      description: "",
      priority: "medium",
      assigned_to: 3,
      assigned_team_id: 7,
      status: "todo",
      project_id: 4,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
