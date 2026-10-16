import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PendingInvites from "./PendingInvites";

describe("PendingInvites", () => {
  it("accepts the selected invitation", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn().mockResolvedValue(undefined);
    const invite = { id: 1, token: "token", team: { id: 3, name: "Research" } };
    render(<PendingInvites invites={[invite]} onAccept={onAccept} />);

    await user.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(onAccept).toHaveBeenCalledWith(invite);
  });

  it("shows acceptance errors without hiding the invitation", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn().mockRejectedValue(new Error("Invite expired"));
    render(
      <PendingInvites
        invites={[{ id: 1, token: "token", team: { id: 3, name: "Research" } }]}
        onAccept={onAccept}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Accept invite" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invite expired");
    expect(screen.getByText("Research")).toBeInTheDocument();
  });
});
