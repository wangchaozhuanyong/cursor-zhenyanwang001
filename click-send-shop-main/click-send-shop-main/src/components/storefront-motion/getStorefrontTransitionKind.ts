import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

export type StorefrontTransitionKind =
  | "tab"
  | "detail"
  | "checkout"
  | "payment"
  | "auth"
  | "sensitive"
  | "content"
  | "none";

const TAB_PATHS = new Set(["/", "/categories", "/promotions", "/cart", "/profile"]);
const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot",
  "/forgot-password",
  "/login/bind-phone",
]);
const SENSITIVE_PATHS = new Set([
  "/wallet",
  "/settings",
  "/address",
]);

function normalizeStorefrontPath(pathname: string) {
  const stripped = stripPublicLocaleFromPathname(pathname.split("?")[0] || "/");
  if (!stripped || stripped === "") return "/";
  return stripped.replace(/\/+$/, "") || "/";
}

export function getStorefrontTransitionKind(pathname: string): StorefrontTransitionKind {
  const path = normalizeStorefrontPath(pathname);

  if (TAB_PATHS.has(path)) return "tab";
  if (AUTH_PATHS.has(path)) return "auth";
  if (SENSITIVE_PATHS.has(path)) return "sensitive";
  if (path === "/checkout") return "checkout";
  if (path === "/payment/result") return "payment";

  if (
    /^\/product\/[^/]+$/.test(path) ||
    /^\/orders\/[^/]+$/.test(path) ||
    /^\/orders\/[^/]+\/logistics$/.test(path) ||
    /^\/promotions\/[^/]+$/.test(path) ||
    /^\/returns\/[^/]+$/.test(path)
  ) {
    return "detail";
  }

  if (
    /callback/i.test(path) ||
    path.includes("/oauth") ||
    path.includes("/logout") ||
    path.includes("/permission")
  ) {
    return "sensitive";
  }

  if (path === "/tiktok") return "none";

  return "content";
}

export function isProtectiveStorefrontTransition(kind: StorefrontTransitionKind) {
  return kind === "auth" || kind === "payment" || kind === "sensitive";
}
