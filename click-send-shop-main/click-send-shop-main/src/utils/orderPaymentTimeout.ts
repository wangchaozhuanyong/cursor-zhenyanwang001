import type { SiteInfo } from "@/types/content";

export function parseOrderPaymentTimeoutFromSite(site: Pick<SiteInfo, "orderPaymentTimeoutEnabled" | "orderPaymentTimeoutMinutes">) {
  const enabled = site.orderPaymentTimeoutEnabled === "1";
  const raw = parseInt(String(site.orderPaymentTimeoutMinutes ?? "30"), 10);
  const minutes = Number.isFinite(raw) && raw >= 1 ? Math.min(raw, 60 * 24 * 30) : 30;
  return { enabled, minutes };
}

export function formatPaymentCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
