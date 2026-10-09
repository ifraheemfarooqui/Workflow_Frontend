import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TaskBoard from "./TaskBoard";

describe("TaskBoard", () => {
  it("groups tasks by status and sends status changes to the parent", async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn();
    const task = {
      id: 3,
      title: "Review launch plan",
      description: "Check readiness",
      priority: "high",
      assigned_to: 7,
      status: "todo",
    };
    render(
      <TaskBoard
        tasks={[task, { ...task, id: 4, title: "Ship update", status: "done" }]}
        users={[{ id: 7, name: "Riley" }]}
        onOpenTask={vi.fn()}
        onChangeStatus={onChangeStatus}
        onCreateTask={vi.fn()}
      />,
    );

    const todoColumn = screen.getByRole("heading", { name: "To do" }).closest(".board-column");
    expect(within(todoColumn).getByText("Review launch plan")).toBeInTheDocument();
    expect(within(todoColumn).getByText("Riley")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Change status for Review launch plan" }),
      "in_progress",
    );

    expect(onChangeStatus).toHaveBeenCalledWith(task, "in_progress");
  });

  it("opens the task details when its card is selected", async () => {
    const user = userEvent.setup();
    const task = {
      id: 3,
      title: "Review launch plan",
      description: "",
      priority: "medium",
      assigned_to: null,
      status: "todo",
    };
    const onOpenTask = vi.fn();
    render(
      <TaskBoard
        tasks={[task]}
        users={[]}
        onOpenTask={onOpenTask}
        onChangeStatus={vi.fn()}
        onCreateTask={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Review launch plan").closest("button"));

    expect(onOpenTask).toHaveBeenCalledWith(task);
  });
});
