import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateDialog from "./CreateDialog";

describe("CreateDialog", () => {
  it("submits a trimmed project name and description", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <CreateDialog
        type="project"
        teamName="Product"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Project name"), "  Launch plan  ");
    await user.type(screen.getByLabelText(/Description/), "  Prepare the release  ");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Launch plan",
      description: "Prepare the release",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
