import { useEffect, useRef } from "react";
import { Copy, ExternalLink, Headphones } from "lucide-react";
import { toast } from "sonner";
import type { SupportDownloadChannel } from "@/types/content";
import { copyToClipboard } from "@/utils/clipboard";
import { cleanSupportText, getChannelAction } from "@/utils/supportChannels";
import { safeOpenExternal } from "@/utils/safeOpen";
import { trackEvent } from "@/services/analyticsService";

type Props = {
  channel: SupportDownloadChannel;
};

async function copyWithToast(text: string, successMessage: string) {
  const value = cleanSupportText(text);
  if (!value) {
    toast.error("暂无可复制内容");
    return;
  }
  const ok = await copyToClipboard(value);
  if (ok) toast.success(successMessage);
  else toast.error("复制失败，请长按手动复制");
}

export default function SupportChannelCard({ channel }: Props) {
  const action = getChannelAction(channel);
  const account = cleanSupportText(channel.account);
  const description = cleanSupportText(channel.description);
  const qrUrl = cleanSupportText(channel.qrUrl);
  const showQr = channel.type === "wechat" && !!qrUrl;
  const qrTrackedRef = useRef(false);

  useEffect(() => {
    if (!showQr || qrTrackedRef.current) return;
    qrTrackedRef.current = true;
    void trackEvent({ event_type: "support_qr_view", module: "support", page: "/support-download" });
  }, [showQr]);

  const onPrimary = async () => {
    if (action.primaryMode === "copy-wechat") {
      await copyWithToast(action.copyText, "微信号已复制");
      return;
    }
    if (action.primaryMode === "copy-account") {
      await copyWithToast(action.copyText, "账号已复制");
      return;
    }
    if (action.primaryMode === "open-link" && action.linkUrl) {
      void trackEvent({
        event_type: channel.type === "whatsapp" ? "contact_whatsapp_click" : "support_channel_click",
        module: "support",
        page: "/support-download",
      });
      safeOpenExternal(action.linkUrl);
      toast.success(`正在打开 ${cleanSupportText(channel.name) || "客服"}`);
      return;
    }
    if (action.primaryMode === "copy-wechat" || action.primaryMode === "copy-account") {
      void trackEvent({ event_type: "support_channel_click", module: "support", page: "/support-download" });
    }
    toast.message("该渠道暂未配置可用操作");
  };

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Headphones size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[var(--theme-text)]">{cleanSupportText(channel.name) || "客服"}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>

      {account ? (
        <p className="mt-3 rounded-xl bg-[var(--theme-bg)] px-3 py-2 text-xs text-[var(--theme-text)]">
          <span className="text-[var(--theme-text-muted)]">账号：</span>
          {account}
        </p>
      ) : null}

      {showQr ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <img
            src={qrUrl}
            alt={`${channel.name} 二维码`}
            className="h-40 w-40 rounded-xl border border-[var(--theme-border)] bg-white object-contain p-2"
          />
          <p className="text-[11px] text-[var(--theme-text-muted)]">微信扫码添加客服</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {action.primaryMode !== "none" ? (
          <button
            type="button"
            onClick={() => { void onPrimary(); }}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
          >
            {action.primaryMode === "open-link" ? <ExternalLink size={14} /> : <Copy size={14} />}
            {action.primaryLabel}
          </button>
        ) : null}
        {action.primaryMode === "open-link" && account ? (
          <button
            type="button"
            onClick={() => { void copyWithToast(account, "账号已复制"); }}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]"
          >
            <Copy size={14} />
            复制账号
          </button>
        ) : null}
      </div>
    </section>
  );
}
