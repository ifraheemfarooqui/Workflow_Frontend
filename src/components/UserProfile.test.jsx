import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UserProfile from "./UserProfile";

const testUser = {
  name: "Taylor",
  email: "taylor@example.test",
};

describe("UserProfile", () => {
  it("requests a deletion code and submits the confirmation code", async () => {
    const user = userEvent.setup();
    const onRequestDeletion = vi.fn().mockResolvedValue({
      message: "A confirmation code was sent.",
    });
    const onConfirmDeletion = vi.fn().mockResolvedValue(undefined);
    render(
      <UserProfile
        user={testUser}
        onSave={vi.fn()}
        onChangePassword={vi.fn()}
        onRequestDeletion={onRequestDeletion}
        onConfirmDeletion={onConfirmDeletion}
      />,
    );

    await user.type(
      screen.getByLabelText("Confirm your current password to request a deletion code"),
      "disposable-password",
    );
    await user.click(screen.getByRole("button", { name: "Email deletion code" }));

    expect(onRequestDeletion).toHaveBeenCalledWith("disposable-password");
    expect(await screen.findByText("A confirmation code was sent.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Six-digit email confirmation code"), "123456");
    await user.click(screen.getByRole("button", { name: "Confirm permanent deletion" }));

    expect(onConfirmDeletion).toHaveBeenCalledWith("123456");
  });
});
