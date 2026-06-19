import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRememberedAdminScrollPositions,
  getRememberedAdminScrollPosition,
  rememberAdminScrollPosition,
} from "./adminScrollRestoration";

describe("adminScrollRestoration", () => {
  beforeEach(() => {
    clearRememberedAdminScrollPositions();
  });

  it("remembers the admin main scroll position by route key", () => {
    const element = document.createElement("main");
    element.scrollTop = 240;

    rememberAdminScrollPosition("/admin/products", element);

    expect(getRememberedAdminScrollPosition("/admin/products")).toBe(240);
    expect(getRememberedAdminScrollPosition("/admin/orders")).toBeUndefined();
  });

  it("keeps the newest value for the same route key", () => {
    const element = document.createElement("main");
    element.scrollTop = 120;
    rememberAdminScrollPosition("/admin/products", element);

    element.scrollTop = 360;
    rememberAdminScrollPosition("/admin/products", element);

    expect(getRememberedAdminScrollPosition("/admin/products")).toBe(360);
  });

  it("hydrates remembered positions from session storage", () => {
    window.sessionStorage.setItem(
      "admin_scroll_positions_v1",
      JSON.stringify([["/admin/orders", 188]]),
    );

    expect(getRememberedAdminScrollPosition("/admin/orders")).toBe(188);
  });
});
