import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InviteTeamMemberDialog from "./InviteTeamMemberDialog";

describe("InviteTeamMemberDialog", () => {
  it("sends an invitation to the entered email", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <InviteTeamMemberDialog
        team={{ id: 2, name: "Design" }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Email address"), "colleague@example.test");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(onSubmit).toHaveBeenCalledWith("colleague@example.test");
    expect(await screen.findByRole("status")).toHaveTextContent("Invitation sent");
  });
});
