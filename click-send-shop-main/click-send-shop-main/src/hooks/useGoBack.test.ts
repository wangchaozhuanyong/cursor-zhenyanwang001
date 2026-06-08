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

  it("uses tracked route source before browser history", () => {
    expect(
      resolveGoBackAction({
        pathname: "/product/abc",
        storedFrom: "/favorites?tab=latest",
        locationKey: "abc123",
        fallback: "/",
      }),
    ).toEqual({ kind: "path", path: "/favorites?tab=latest", replace: true });
  });

  it("ignores unsafe external-like source paths", () => {
    expect(
      resolveGoBackAction({
        pathname: "/product/abc",
        stateFrom: "//evil.example/path",
        storedFrom: "/login",
        locationKey: "default",
        fallback: "/",
      }),
    ).toEqual({ kind: "path", path: "/", replace: true });
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

  it("does not send search back into a product detail loop", () => {
    expect(
      resolveGoBackAction({
        pathname: "/search",
        stateFrom: "/product/abc",
        storedFrom: "/product/abc",
        locationKey: "abc123",
        fallback: "/",
        historyIndex: 3,
      }),
    ).toEqual({ kind: "path", path: "/", replace: true });
  });
});
