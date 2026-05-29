import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { extractResponseMessage, post, toQueryString } from "@/api/request";
import { clearAdminCsrfToken } from "@/lib/adminCsrf";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("toQueryString", () => {
  test("returns empty string for empty params", () => {
    expect(toQueryString()).toBe("");
    expect(toQueryString({})).toBe("");
  });

  test("serializes defined params", () => {
    expect(toQueryString({ page: 1, q: "hello", empty: "" })).toBe("?page=1&q=hello");
  });

  test("skips null and undefined", () => {
    expect(toQueryString({ a: null, b: undefined, c: "ok" })).toBe("?c=ok");
  });
});

describe("admin MFA request CSRF handling", () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  beforeEach(() => {
    calls.length = 0;
    clearAdminCsrfToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAdminCsrfToken();
  });

  test("adds CSRF header when reverifying admin MFA", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/admin/auth/csrf")) {
        return jsonResponse({ data: { csrfToken: "csrf-one" } });
      }
      return jsonResponse({ data: { ok: true } });
    }));

    await post("/admin/auth/mfa/reverify", { code: "123456" }, { loadingMode: "silent" });

    const reverifyCall = calls.find((call) => call.url.endsWith("/admin/auth/mfa/reverify"));
    expect(reverifyCall?.init?.headers).toMatchObject({ "X-CSRF-Token": "csrf-one" });
  });

  test("does not require CSRF for login MFA verification", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return jsonResponse({ data: { token: "ok" } });
    }));

    await post("/admin/auth/mfa/verify", { mfaTicket: "ticket", code: "123456" }, { loadingMode: "silent" });

    expect(calls).toHaveLength(1);
    expect(calls[0].init?.headers).not.toMatchObject({ "X-CSRF-Token": expect.any(String) });
  });

  test("refreshes stale CSRF token once and retries the MFA reverify request", async () => {
    let csrfFetchCount = 0;
    let reverifyCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/admin/auth/csrf")) {
        csrfFetchCount += 1;
        return jsonResponse({ data: { csrfToken: csrfFetchCount === 1 ? "csrf-old" : "csrf-new" } });
      }
      if (url.endsWith("/admin/auth/mfa/reverify")) {
        reverifyCount += 1;
        if (reverifyCount === 1) {
          return jsonResponse({ code: 403, message: "CSRF token invalid" }, 403);
        }
        return jsonResponse({ data: { ok: true } });
      }
      return jsonResponse({});
    }));

    await post("/admin/auth/mfa/reverify", { code: "123456" }, { loadingMode: "silent" });

    const reverifyCalls = calls.filter((call) => call.url.endsWith("/admin/auth/mfa/reverify"));
    expect(reverifyCalls).toHaveLength(2);
    expect(reverifyCalls[0].init?.headers).toMatchObject({ "X-CSRF-Token": "csrf-old" });
    expect(reverifyCalls[1].init?.headers).toMatchObject({ "X-CSRF-Token": "csrf-new" });
  });
});

describe("extractResponseMessage", () => {
  test("优先展示后端返回的业务错误，而不是 503 网关兜底文案", () => {
    expect(
      extractResponseMessage(
        { message: "数据库结构未与当前代码同步。请在服务器执行：cd server && npm run migrate，然后重启服务。" },
        503,
      ),
    ).toContain("数据库结构未与当前代码同步");
  });

  test("无业务 message 时使用 503 网关兜底文案", () => {
    expect(extractResponseMessage({}, 503)).toBe("服务维护中，请稍后再试");
  });
});
