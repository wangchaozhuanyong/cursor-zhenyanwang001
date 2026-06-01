import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import type { SiteInfo } from "@/types/content";
import { buildTelegramLink, buildWhatsAppLink, getChannelTitle } from "@/utils/supportChannels";

export type SiteSocialLinksProps = Pick<
  SiteInfo,
  "instagramUrl" | "facebookUrl" | "tiktokUrl" | "xhsUrl"
> & {
  className?: string;
  labelMode?: "default" | "zhOnly";
  /** pill：卡片页（关于我们）；footer / profile：主题变量，与页脚、个人中心一致 */
  tone?: "pill" | "footer" | "profile";
};

type SocialEntry = {
  key: string;
  label: string;
  url: string;
  wechatAccount?: string;
};

function getFooterChannelLabel(channel: Parameters<typeof getChannelTitle>[0], labelMode: SiteSocialLinksProps["labelMode"]) {
  if (labelMode !== "zhOnly") return getChannelTitle(channel);
  const customName = String(channel.name || "").trim();
  if (customName && !/[A-Za-z]/.test(customName)) return customName;
  if (channel.type === "wechat") return "微信客服";
  if (channel.type === "whatsapp") return "即时客服";
  return "社群客服";
}

/**
 * 客服渠道（supportDownloadConfig）+ 纯社交媒体链接。
 */
export function SiteSocialLinks({ className, labelMode = "default", tone = "pill", ...social }: SiteSocialLinksProps) {
  const { channels } = useSupportRuntime();

  const entries = useMemo<SocialEntry[]>(() => {
    const fromChannels: SocialEntry[] = channels
      .map((channel) => {
        const label = getFooterChannelLabel(channel, labelMode);
        if (channel.type === "whatsapp") {
          const url = buildWhatsAppLink(channel);
          return url ? { key: channel.id, label, url } : null;
        }
        if (channel.type === "wechat") {
          const account = channel.account?.trim();
          if (!account) return null;
          return { key: channel.id, label, url: "", wechatAccount: account };
        }
        if (channel.type === "telegram") {
          const url = buildTelegramLink(channel);
          return url ? { key: channel.id, label, url } : null;
        }
        return null;
      })
      .filter((item): item is SocialEntry => Boolean(item));

    const media: SocialEntry[] = [
      { key: "instagram", label: labelMode === "zhOnly" ? "图片动态" : "Instagram", url: (social.instagramUrl || "").trim() },
      { key: "facebook", label: labelMode === "zhOnly" ? "社群主页" : "Facebook", url: (social.facebookUrl || "").trim() },
      { key: "tiktok", label: labelMode === "zhOnly" ? "短视频" : "TikTok", url: (social.tiktokUrl || "").trim() },
      { key: "xhs", label: "小红书", url: (social.xhsUrl || "").trim() },
    ].filter((s) => s.url);

    return [...fromChannels, ...media];
  }, [channels, labelMode, social.facebookUrl, social.instagramUrl, social.tiktokUrl, social.xhsUrl]);

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
          key={s.key}
          type="button"
          onClick={async () => {
            if (s.url) {
              window.open(s.url, "_blank", "noopener,noreferrer");
            } else if (s.wechatAccount) {
              const [{ toast }, copied] = await Promise.all([import("sonner"), copyToClipboard(s.wechatAccount)]);
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

export function hasAnySocialLink(
  site: SiteSocialLinksProps & Pick<SiteInfo, "supportDownloadConfig">,
): boolean {
  const config = site.supportDownloadConfig;
  const hasMedia = Boolean(
    site.instagramUrl?.trim()
    || site.facebookUrl?.trim()
    || site.tiktokUrl?.trim()
    || site.xhsUrl?.trim(),
  );
  if (hasMedia) return true;
  try {
    const parsed = config ? JSON.parse(config) : null;
    const list = parsed?.support?.channels;
    return Array.isArray(list) && list.some((c: { enabled?: boolean }) => c?.enabled !== false);
  } catch {
    return false;
  }
}
