export const STOREFRONT_NEXT_SCOPE = "next" as const;

export const storefrontNextLayout = {
  mobileReferenceWidth: 390,
  mobilePageGutter: 16,
  mobileGridGap: 12,
  mobileHeaderHeight: 52,
  mobileBottomNavContentHeight: 68,
  contentMaxWidth: 1280,
} as const;

export const storefrontNextMotion = {
  fastMs: 110,
  standardMs: 180,
  sheetMs: 240,
  easing: [0.2, 0.8, 0.2, 1] as const,
} as const;

export const storefrontNextRouteCoverage = [
  "/",
  "/categories",
  "/search",
  "/product/:id",
  "/cart",
  "/checkout",
  "/payment/result",
  "/orders",
  "/orders/:id",
  "/coupons",
  "/promotions",
  "/promotions/:slug",
  "/profile",
  "/member/benefits",
  "/address",
  "/favorites",
  "/notifications",
  "/help",
  "/login",
  "/register",
  "/invite",
] as const;

/**
 * This file is visual-only. It must not become a duplicate source of truth for
 * route guards, capabilities, prices, inventory, coupon eligibility, payment,
 * order status, or authentication.
 */
export type StorefrontNextRoute =
  (typeof storefrontNextRouteCoverage)[number];
