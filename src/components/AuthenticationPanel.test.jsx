import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuthenticationPanel from "./AuthenticationPanel";

describe("AuthenticationPanel", () => {
  it("switches to registration and submits the entered account details", async () => {
    const user = userEvent.setup();
    const onAuthenticate = vi.fn().mockResolvedValue(undefined);
    render(<AuthenticationPanel onAuthenticate={onAuthenticate} />);

    await user.click(screen.getByRole("button", { name: "Create an account" }));
    await user.type(screen.getByLabelText("Your name"), "Riley Test");
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "riley@example.test");
    await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(onAuthenticate).toHaveBeenCalledWith({
      name: "Riley Test",
      email: "riley@example.test",
      password: "correct-horse-battery",
      registering: true,
    });
  });

  it("shows authentication errors returned by the request", async () => {
    const user = userEvent.setup();
    const onAuthenticate = vi.fn().mockRejectedValue(new Error("Incorrect email or password"));
    render(<AuthenticationPanel onAuthenticate={onAuthenticate} />);

    await user.type(screen.getByLabelText("Email address"), "riley@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
  });
});
