export const STOREFRONT_NEXT_SCOPE = "next" as const;

export const storefrontNextLayout = {
  mobileReferenceWidth: 390,
  mobilePageGutter: 16,
  mobileGridGap: 12,
  mobileHeaderHeight: 52,
  mobileBottomNavContentHeight: 60,
  contentMaxWidth: 1280,
  desktopContentMaxWidth: 1280,
  desktopNarrowMaxWidth: 720,
  productMediaRatio: "1 / 1",
  heroMediaRatio: "16 / 9",
  couponMediaRatio: "3 / 2",
} as const;

export const storefrontNextMotion = {
  fastMs: 110,
  standardMs: 180,
  sheetMs: 240,
  easing: [0.2, 0.8, 0.2, 1] as const,
} as const;

export const storefrontNextTypeScale = {
  pageTitle: { sizeRem: 1.375, lineHeight: 1.18, weight: 700 },
  sectionTitle: { sizeRem: 1.0625, lineHeight: 1.25, weight: 700 },
  cardTitle: { sizeRem: 0.9375, lineHeight: 1.35, weight: 650 },
  body: { sizeRem: 0.875, lineHeight: 1.55, weight: 400 },
  meta: { sizeRem: 0.75, lineHeight: 1.35, weight: 500 },
  price: { sizeRem: 1.125, lineHeight: 1.1, weight: 760 },
} as const;

export const storefrontNextSpaceScale = {
  pageXMobile: "clamp(12px, 4vw, 16px)",
  pageXDesktop: "clamp(24px, 3vw, 40px)",
  sectionGapMobile: "1rem",
  sectionGapDesktop: "1.5rem",
  cardPaddingMobile: "0.875rem",
  cardPaddingDesktop: "1rem",
  controlHeight: "2.75rem",
  iconButton: "2.5rem",
} as const;

export const storefrontNextSurfaceScale = {
  pageRadius: "0px",
  sheetRadius: "18px",
  cardRadius: "14px",
  innerRadius: "10px",
  fieldRadius: "12px",
  hairline: "1px",
} as const;

export const storefrontNextComponentContract = {
  pageShell: [
    "Every storefront route uses the same canvas, max-width, safe-area, and no horizontal overflow rules.",
    "Route pages may change module order only through storefront data or explicit route layout, not ad-hoc CSS overrides.",
  ],
  productCard: [
    "Product media owns a stable aspect-ratio before the image loads.",
    "Badges live inside the media area and must not push product title, price, or action layout.",
    "Cart action has a fixed tap target and cannot overlap title, price, or media.",
  ],
  promotionAndCoupon: [
    "Coupon value, usage rule, validity, and unavailable reason must keep a stable card height.",
    "Coupon and promo cards use the shared state panel for loading, empty, and error states.",
  ],
  bottomNavigation: [
    "Only the storefront next bottom navigation classes may define the mobile nav shell.",
    "Pages with their own checkout or detail action bars must reserve bottom inset through the shared next variables.",
  ],
  themeRuntime: [
    "Admin skins can change client palette, texture, density, and component variants.",
    "Admin skins must not change the core type scale, product media ratio, safe-area model, or route shell structure.",
  ],
} as const;

export const storefrontNextAdminThemeFields = [
  "palette",
  "surface",
  "texture",
  "density",
  "motionLevel",
  "navStyle",
  "homeLayout",
  "headerStyle",
  "bannerStyle",
  "productCardVariant",
  "couponStyle",
  "memberCardStyle",
  "categoryIconStyle",
] as const;

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
  "/orders/:id/logistics",
  "/promotions",
  "/promotions/:slug",
  "/coupons",
  "/profile",
  "/member/benefits",
  "/address",
  "/favorites",
  "/history",
  "/notifications",
  "/returns",
  "/returns/:id",
  "/reviews/pending",
  "/points",
  "/points/gifts",
  "/rewards",
  "/wallet",
  "/settings",
  "/feedback",
  "/login",
  "/register",
  "/forgot",
  "/forgot-password",
  "/login/bind-phone",
  "/invite",
  "/help",
  "/support-download",
  "/install",
  "/about",
  "/delivery",
  "/feature-status",
  "/client-design/system",
  "/client-design/coupon-detail",
  "/client-design/share-detail",
  "/client-design/states",
  "/content/:slug",
  "/tiktok",
] as const;

/**
 * This file is visual-only. It must not become a duplicate source of truth for
 * route guards, capabilities, prices, inventory, coupon eligibility, payment,
 * order status, or authentication.
 */
export type StorefrontNextRoute =
  (typeof storefrontNextRouteCoverage)[number];
