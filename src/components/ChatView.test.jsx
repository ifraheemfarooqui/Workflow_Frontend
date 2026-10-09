import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import ChatView from "./ChatView";

class MockWebSocket {
  static OPEN = 1;
  static instances = [];
  readyState = 0;
  listeners = new Map();
  sent = [];

  constructor() {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, data = {}) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ data, ...data });
    }
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = 3;
  }
}

describe("ChatView", () => {
  afterEach(() => {
    MockWebSocket.instances = [];
    vi.restoreAllMocks();
  });

  it("sends a team message over the live socket and renders its acknowledgement", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "listTeamMessages").mockResolvedValue([]);
    vi.stubGlobal("WebSocket", MockWebSocket);
    render(
      <ChatView
        target={{ type: "team", id: 6, name: "QA Team", memberCount: 1 }}
        user={{ name: "Taylor", email: "taylor@example.test" }}
        currentUserId={8}
        users={[{ id: 8, name: "Taylor" }]}
      />,
    );

    const socket = MockWebSocket.instances[0];
    act(() => {
      socket.readyState = MockWebSocket.OPEN;
      socket.emit("open");
    });
    await user.type(screen.getByRole("textbox", { name: "Message QA Team" }), "Browser chat check");
    await user.click(screen.getByRole("button", { name: /Send/ }));

    expect(JSON.parse(socket.sent[0])).toEqual({
      team_id: 6,
      content: "Browser chat check",
    });

    act(() => socket.emit("message", {
      data: JSON.stringify({
        type: "message",
        data: {
          id: 44,
          sender_id: 8,
          recipient_id: null,
          team_id: 6,
          content: "Browser chat check",
          created_at: "2026-10-09T16:00:00Z",
          edited_at: null,
          deleted_at: null,
        },
      }),
    }));

    expect(await screen.findByText("Browser chat check")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Message QA Team" })).toHaveValue(""));
  });
});
