import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { navigate, paths, useRoute } from "./routes";

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("workspace routes", () => {
  it("reflects nested team, project, and task locations in the route state", () => {
    window.history.replaceState({}, "", paths.task(4, 12, 31));

    const { result } = renderHook(() => useRoute());

    expect(result.current).toMatchObject({
      name: "task",
      teamId: 4,
      projectId: 12,
      taskId: 31,
      pathname: "/teams/4/projects/12/tasks/31",
    });
  });

  it("updates route state when navigating to a team conversation", () => {
    const { result } = renderHook(() => useRoute());

    act(() => navigate(paths.teamChat(8)));

    expect(result.current).toMatchObject({
      name: "team-chat",
      teamId: 8,
    });
  });
});
