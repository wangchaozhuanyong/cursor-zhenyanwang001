import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "tablet-landscape", width: 1180, height: 820 },
  { name: "desktop", width: 1440, height: 900 },
];

const capabilities = {
  mallEnabled: true,
  serviceEnabled: true,
  onlinePaymentEnabled: true,
  pointsEnabled: true,
  couponEnabled: true,
  reviewEnabled: true,
  inventoryEnabled: true,
  shippingEnabled: true,
  memberLevelEnabled: true,
  customerServiceDownloadEnabled: true,
  smsOtpLoginEnabled: true,
  telegramOrderNotifyEnabled: true,
  languageGateEnabled: false,
  storefrontMultilingualEnabled: false,
  restrictedProductComplianceEnabled: true,
  trafficAnalyticsEnabled: false,
  downloadConfirmEnabled: true,
};

function coupon(id: string, title: string, claimability: Record<string, unknown>) {
  return {
    id,
    claimed_at: "",
    status: "available",
    issue_activity_id: `${id}-campaign`,
    campaign_id: `${id}-campaign`,
    ...claimability,
    coupon: {
      id,
      code: `${id}-code`,
      title,
      type: "fixed",
      value: 10,
      min_amount: 100,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "available",
      scope_type: "all",
      category_ids: [],
      category_names: [],
      issue_activity_id: `${id}-campaign`,
      campaign_id: `${id}-campaign`,
      ...claimability,
    },
  };
}

async function mockStoreApis(page: Page, claimedBodies: unknown[] = []) {
  await page.addInitScript(() => {
    localStorage.setItem("user_authenticated", "1");
    localStorage.setItem("auth-storage", JSON.stringify({
      state: { isAuthenticated: true },
      version: 0,
    }));
  });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) {
      return route.continue();
    }
    const path = url.pathname.replace(/^\/api/, "");
    const json = (data: unknown, status = 200) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(status >= 400 ? data : { code: 0, message: "成功", data }),
    });

    if (request.method() === "POST" && path === "/coupons/claim") {
      claimedBodies.push(request.postDataJSON());
      return json(coupon("public", "公开活动券", { claimable: true, claim_status: "claimable" }));
    }
    if (path === "/home/bootstrap-lite" || path === "/home/bootstrap") {
      return json({
        siteInfo: { siteName: "测试商城", supportDownloadConfig: JSON.stringify({ title: "客服中心" }) },
        siteCapabilities: capabilities,
        runtimeConfig: { siteCode: "test", siteName: "测试商城", publicAppUrl: "", features: capabilities, upload: { storage: "local", presignEnabled: false } },
        homeOps: {},
        banners: [],
        categories: [],
        products: { hot: [], new_arrivals: [], recommended: [] },
        marketing: { couponZone: null, couponCenter: null, newUserGift: null },
      });
    }
    if (path === "/auth/session" || path === "/auth/refresh/session") return json({ authenticated: true });
    if (path === "/auth/refresh") return json({ accessToken: "test-access-token" });
    if (path === "/user/profile") return json({ id: "u1", nickname: "普通用户", phone: "1000000000", points_balance: 120 });
    if (path === "/me/summary") {
      return json({
        inviteStats: { directCount: 1 },
        rewardBalance: { balance: 8 },
        unreadCount: 2,
        orderSummary: { pending_payment: 0, pending_ship: 0, pending_receive: 0, pending_review: 0, after_sale: 0 },
        loyaltyConfig: { points: { displayEnabled: true }, reward: { displayEnabled: true, referralEnabled: true } },
      });
    }
    if (path === "/loyalty/config") return json({ points: { displayEnabled: true }, reward: { displayEnabled: true, referralEnabled: true } });
    if (path === "/member/benefits") return json({ current_growth_value: 120, next_level: null });
    if (path === "/coupons/center") {
      return json({
        usable_count: 0,
        claimable_count: 2,
        my_usable_coupons: [],
        claimable_coupons: [
          coupon("public", "公开活动券", { claimable: true, claim_status: "claimable" }),
          coupon("member", "会员专享券", { claimable: false, claim_status: "member_required", claim_reason: "该优惠券仅限会员领取", requires_member: true }),
        ],
      });
    }
    if (path === "/cart") return json([]);
    if (path === "/returns") return json({ list: [], total: 0, page: 1, pageSize: 50 });
    if (path === "/orders") return json({ list: [], total: 0, page: 1, pageSize: 10 });
    return json(null);
  });
}

test.describe("三端业务逻辑一致性", () => {
  for (const viewport of viewports) {
    test(`我的页面核心入口在 ${viewport.name} 可见且带统一 feature key`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockStoreApis(page);
      await page.goto("/profile");
      await expect(page.getByText("购物服务")).toBeVisible({ timeout: 15_000 });

      const keys = await page.locator("[data-feature-key]").evaluateAll((nodes) =>
        [...new Set(nodes
          .filter((node) => {
            const el = node as HTMLElement;
            return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          })
          .map((node) => node.getAttribute("data-feature-key"))
          .filter(Boolean))].sort(),
      );

      for (const key of ["address", "returns", "coupons", "points", "favorites", "history", "notifications", "settings"]) {
        expect(keys, `${viewport.name} missing ${key}`).toContain(key);
      }
    });

    test(`优惠券领取在 ${viewport.name} 使用统一资格和 activity_id`, async ({ page }) => {
      const claimedBodies: unknown[] = [];
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockStoreApis(page, claimedBodies);
      await page.goto("/coupons");
      const claimCenterButton = page.getByRole("button", { name: /领券中心，/ }).first();
      await expect(claimCenterButton).toBeVisible({ timeout: 15_000 });
      await claimCenterButton.click();

      await expect(page.getByText("会员专享券")).toBeVisible();
      await expect(page.getByText("会员专享").first()).toBeVisible();

      await page.getByRole("button", { name: /立\s*即\s*领\s*取/ }).first().click();
      await expect.poll(() => claimedBodies.length).toBeGreaterThan(0);
      expect(claimedBodies[0]).toMatchObject({
        code: "public-code",
        activity_id: "public-campaign",
      });
    });
  }
});
