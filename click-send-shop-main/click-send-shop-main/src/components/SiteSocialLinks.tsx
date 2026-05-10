import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import type { SiteInfo } from "@/types/content";

export type SiteSocialLinksProps = Pick<
  SiteInfo,
  | "whatsappUrl"
  | "contactWhatsApp"
  | "wechatId"
  | "instagramUrl"
  | "facebookUrl"
  | "tiktokUrl"
  | "xhsUrl"
> & {
  className?: string;
  /** pill：卡片页（关于我们）；footer / profile：主题变量，与页脚、个人中心一致 */
  tone?: "pill" | "footer" | "profile";
};

function buildSocialEntries(site: SiteSocialLinksProps) {
  const wechatId = site.wechatId?.trim();
  const wa =
    (site.whatsappUrl || "").trim() ||
    (site.contactWhatsApp
      ? `https://wa.me/${site.contactWhatsApp.replace(/\D/g, "")}`
      : "");
  return [
    { label: "WhatsApp", url: wa, isWechat: false as const },
    { label: "WeChat", url: "", isWechat: true as const },
    { label: "Instagram", url: (site.instagramUrl || "").trim(), isWechat: false as const },
    { label: "Facebook", url: (site.facebookUrl || "").trim(), isWechat: false as const },
    { label: "TikTok", url: (site.tiktokUrl || "").trim(), isWechat: false as const },
    { label: "小红书", url: (site.xhsUrl || "").trim(), isWechat: false as const },
  ].filter((s) => (s.isWechat ? Boolean(wechatId) : Boolean(s.url)));
}

/**
 * 站点设置的社交媒体入口（WhatsApp / 微信复制 / IG / FB / TikTok / 小红书）。
 * 无任一可展示项时不渲染。
 */
export function SiteSocialLinks({ className, tone = "pill", ...site }: SiteSocialLinksProps) {
  const wechatId = site.wechatId?.trim();
  const entries = buildSocialEntries(site);

  if (entries.length === 0) return null;

  const btnClass =
    tone === "pill"
      ? "rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground hover:border-gold/30 active:scale-95 transition-all"
      : tone === "footer"
        ? "rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_40%,var(--theme-surface))] px-4 py-2.5 text-xs font-medium text-[var(--theme-text-muted)] transition-all hover:border-[color-mix(in_srgb,var(--theme-primary)_35%,var(--theme-border))] active:scale-95"
        : "rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_58%,var(--theme-surface))] px-4 py-2.5 text-xs font-semibold text-[var(--theme-text-on-surface)] transition-all active:scale-[0.98]";

  return (
    <div className={cn("flex flex-wrap justify-center gap-3", className)}>
      {entries.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={async () => {
            if (s.url) {
              window.open(s.url, "_blank", "noopener,noreferrer");
            } else if (s.isWechat && wechatId) {
              const [{ toast }, copied] = await Promise.all([import("sonner"), copyToClipboard(wechatId)]);
              if (copied) {
                toast.success("微信号已复制", toastPresetQuickSuccess);
              } else {
                toast.error("复制失败，请手动复制微信号");
              }
            }
          }}
          className={btnClass}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function hasAnySocialLink(site: SiteSocialLinksProps): boolean {
  return buildSocialEntries(site).length > 0;
}
