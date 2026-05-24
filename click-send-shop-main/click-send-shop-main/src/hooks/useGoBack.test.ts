import { describe, expect, it } from "vitest";
import { resolveGoBackAction } from "@/hooks/useGoBack";

describe("resolveGoBackAction", () => {
  it("prefers location.state.from over fallback", () => {
    expect(
      resolveGoBackAction({
        pathname: "/product/abc",
        stateFrom: "/categories?cat=1",
        locationKey: "default",
        fallback: "/",
      }),
    ).toEqual({ kind: "path", path: "/categories?cat=1", replace: true });
  });

  it("uses browser history before fallback when stack can pop", () => {
    expect(
      resolveGoBackAction({
        pathname: "/product/abc",
        locationKey: "abc123",
        fallback: "/",
      }),
    ).toEqual({ kind: "history", delta: -1 });
  });

  it("falls back when there is no history and no state.from", () => {
    expect(
      resolveGoBackAction({
        pathname: "/product/abc",
        locationKey: "default",
        fallback: "/",
      }),
    ).toEqual({ kind: "path", path: "/", replace: true });
  });
});
