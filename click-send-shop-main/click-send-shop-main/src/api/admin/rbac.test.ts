import { beforeEach, describe, expect, test, vi } from "vitest";
import { resetAdminUserMfa } from "@/api/admin/rbac";

const requestMocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@/api/request", () => requestMocks);

describe("admin RBAC API", () => {
  beforeEach(() => {
    requestMocks.post.mockReset();
  });

  test("resetAdminUserMfa calls the MFA reset endpoint and returns revoked device count", async () => {
    requestMocks.post.mockResolvedValueOnce({
      code: 0,
      message: "已重置 MFA，下次登录需要重新绑定",
      data: { revokedTrustedDeviceCount: 2 },
    });

    const result = await resetAdminUserMfa("admin-1");

    expect(requestMocks.post).toHaveBeenCalledWith(
      "/admin/rbac/admin-users/admin-1/security/mfa-reset",
      {},
    );
    expect(result.data).toEqual({ revokedTrustedDeviceCount: 2 });
  });
});
