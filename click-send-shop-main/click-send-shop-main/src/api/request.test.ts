import { describe, expect, test } from "vitest";
import { extractResponseMessage, toQueryString } from "@/api/request";

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
