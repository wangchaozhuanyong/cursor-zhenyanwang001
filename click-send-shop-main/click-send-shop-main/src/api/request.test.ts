import { describe, expect, test } from "vitest";
import { toQueryString } from "@/api/request";

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
