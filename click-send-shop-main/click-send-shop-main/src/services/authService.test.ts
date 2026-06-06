import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { restoreSessionFromCookie } from "@/services/authService";
import { clearTokens } from "@/utils/token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const profilePayload = {
  id: "user-1",
  nickname: "test",
  avatar: "",
  phone: "+8618251314371",
  points_balance: 0,
};

describe("restoreSessionFromCookie", () => {
  beforeEach(() => {
    clearTokens();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
  });

  test("keeps login when refresh fails but current profile cookie is still valid", async () => {
    localStorage.setItem("user_authenticated", "1");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/session")) {
        return jsonResponse({ code: 0, data: { authenticated: true } });
      }
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse({ code: 400, message: "登录状态无效，请重新登录" }, 400);
      }
      if (url.endsWith("/user/profile")) {
        return jsonResponse({ code: 0, data: profilePayload });
      }
      return jsonResponse({}, 404);
    }));

    await expect(restoreSessionFromCookie()).resolves.toBe(true);
    expect(localStorage.getItem("user_authenticated")).toBe("1");
    expect(calls.some((url) => url.endsWith("/user/profile"))).toBe(true);
  });

  test("reuses the same inflight session restore request", async () => {
    localStorage.setItem("user_authenticated", "1");
    let resolveRefresh!: (value: Response) => void;
    const refreshGate = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const calls: string[] = [];

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/session")) {
        return Promise.resolve(jsonResponse({ code: 0, data: { authenticated: true } }));
      }
      if (url.endsWith("/auth/refresh")) {
        return refreshGate;
      }
      if (url.endsWith("/user/profile")) {
        return Promise.resolve(jsonResponse({ code: 0, data: profilePayload }));
      }
      return Promise.resolve(jsonResponse({}, 404));
    }));

    const first = restoreSessionFromCookie();
    const second = restoreSessionFromCookie();
    await vi.waitFor(() => {
      expect(calls.filter((url) => url.endsWith("/auth/session"))).toHaveLength(1);
      expect(calls.filter((url) => url.endsWith("/auth/refresh"))).toHaveLength(1);
    });

    resolveRefresh(jsonResponse({ code: 0, data: { accessToken: "next-token" } }));
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(calls.filter((url) => url.endsWith("/user/profile"))).toHaveLength(1);
  });

  test("clears login only when refresh and profile probe both fail", async () => {
    localStorage.setItem("user_authenticated", "1");
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/session")) {
        return jsonResponse({ code: 0, data: { authenticated: true } });
      }
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse({ code: 400, message: "登录状态无效，请重新登录" }, 400);
      }
      if (url.endsWith("/user/profile")) {
        return jsonResponse({ code: 401, message: "请先登录" }, 401);
      }
      return jsonResponse({}, 404);
    }));

    await expect(restoreSessionFromCookie()).resolves.toBe(false);
    expect(localStorage.getItem("user_authenticated")).toBeNull();
  });

  test("refreshes when session endpoint cannot see path-scoped refresh cookie", async () => {
    localStorage.setItem("user_authenticated", "1");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/session")) {
        return jsonResponse({ code: 0, data: { authenticated: false } });
      }
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse({ code: 0, data: { accessToken: "refreshed-token" } });
      }
      if (url.endsWith("/user/profile")) {
        return jsonResponse({ code: 0, data: profilePayload });
      }
      return jsonResponse({}, 404);
    }));

    await expect(restoreSessionFromCookie()).resolves.toBe(true);
    expect(localStorage.getItem("user_authenticated")).toBe("1");
    expect(calls.filter((url) => url.endsWith("/auth/session"))).toHaveLength(1);
    expect(calls.filter((url) => url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(calls.filter((url) => url.endsWith("/user/profile"))).toHaveLength(1);
  });

  test("clears stale login hint when server session and refresh are both invalid", async () => {
    localStorage.setItem("user_authenticated", "1");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/session")) {
        return jsonResponse({ code: 0, data: { authenticated: false } });
      }
      if (url.endsWith("/auth/refresh/session")) {
        return jsonResponse({ code: 0, data: { authenticated: false } });
      }
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse({ code: 401, message: "璇峰厛鐧诲綍" }, 401);
      }
      return jsonResponse({}, 404);
    }));

    await expect(restoreSessionFromCookie()).resolves.toBe(false);
    expect(localStorage.getItem("user_authenticated")).toBeNull();
    expect(calls.filter((url) => url.endsWith("/auth/session"))).toHaveLength(1);
    expect(calls.filter((url) => url.endsWith("/auth/refresh/session"))).toHaveLength(1);
    expect(calls.filter((url) => url.endsWith("/auth/refresh"))).toHaveLength(0);
    expect(calls.some((url) => url.endsWith("/user/profile"))).toBe(false);
  });
});
