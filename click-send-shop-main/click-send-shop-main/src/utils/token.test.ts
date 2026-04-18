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
    expect(getRefreshToken()).toBe("user-r");
    expect(getAdminAccessToken()).toBe("admin-a");
    expect(getAdminRefreshToken()).toBe("admin-r");

    clearTokens();
    expect(isLoggedIn()).toBe(false);
    expect(isAdminLoggedIn()).toBe(true);
    expect(getAdminAccessToken()).toBe("admin-a");
  });

  test("admin logout does not clear user token", () => {
    setTokens("user-a", "user-r");
    setAdminTokens("admin-a", "admin-r");

    clearAdminTokens();
    expect(isAdminLoggedIn()).toBe(false);
    expect(isLoggedIn()).toBe(true);
    expect(getRefreshToken()).toBe("user-r");
  });
});
