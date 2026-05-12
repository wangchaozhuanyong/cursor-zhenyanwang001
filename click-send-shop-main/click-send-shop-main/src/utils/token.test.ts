import { beforeEach, describe, expect, test } from "vitest";
import {
  clearAdminTokens,
  clearTokens,
  getAdminAccessToken,
  getAdminRefreshToken,
  getRefreshToken,
  isAdminLoggedIn,
  isLoggedIn,
  setAdminTokens,
  setTokens,
} from "@/utils/token";

describe("token namespace isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("user token operations do not affect admin namespace", () => {
    setAdminTokens("admin-a", "admin-r");
    setTokens("user-a", "user-r");

    expect(isLoggedIn()).toBe(true);
    expect(isAdminLoggedIn()).toBe(true);
    expect(getRefreshToken()).toBeNull();
    expect(getAdminAccessToken()).toBeNull();
    expect(getAdminRefreshToken()).toBeNull();
    expect(localStorage.getItem("user_access_token")).toBeNull();
    expect(localStorage.getItem("admin_access_token")).toBeNull();

    clearTokens();
    expect(isLoggedIn()).toBe(false);
    expect(isAdminLoggedIn()).toBe(true);
    expect(getAdminAccessToken()).toBeNull();
  });

  test("admin logout does not clear user token", () => {
    setTokens("user-a", "user-r");
    setAdminTokens("admin-a", "admin-r");

    clearAdminTokens();
    expect(isAdminLoggedIn()).toBe(false);
    expect(isLoggedIn()).toBe(true);
    expect(getRefreshToken()).toBeNull();
  });
});
