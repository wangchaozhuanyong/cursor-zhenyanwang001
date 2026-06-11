import { describe, expect, it } from "vitest";

import { buildLocationPath, isSafeInternalPath, isSamePath } from "./navigationHistory";

describe("navigationHistory", () => {
  it("allows only safe internal paths", () => {
    expect(isSafeInternalPath("/categories")).toBe(true);
    expect(isSafeInternalPath("/categories?page=1")).toBe(true);
    expect(isSafeInternalPath("https://example.com")).toBe(false);
    expect(isSafeInternalPath("//example.com")).toBe(false);
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
  });

  it("builds location paths", () => {
    expect(
      buildLocationPath({
        pathname: "/categories",
        search: "?page=2",
        hash: "#top",
      }),
    ).toBe("/categories?page=2#top");
  });

  it("compares paths", () => {
    expect(isSamePath("/a", "/a")).toBe(true);
    expect(isSamePath("/a", "/b")).toBe(false);
    expect(isSamePath(undefined, "/b")).toBe(false);
  });
});
