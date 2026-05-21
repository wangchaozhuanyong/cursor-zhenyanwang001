import { useEffect, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Headphones, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SupportDownloadChannel } from "@/types/content";
import { copyToClipboard } from "@/utils/clipboard";
import { downloadImage } from "@/utils/downloadImage";
import {
  buildTelegramLink,
  buildWhatsAppLink,
  buildWeChatLink,
  cleanSupportText,
  getChannelTitle,
  getDefaultChannelDescription,
} from "@/utils/supportChannels";
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

function getOpenLabel(channel: SupportDownloadChannel) {
  if (channel.type === "wechat") return "打开微信";
  if (channel.type === "whatsapp") return "打开 WhatsApp";
  return "打开 Telegram";
}

function getAccountLabel(channel: SupportDownloadChannel) {
  return channel.type === "wechat" ? "微信号" : "账号";
}

function getOpenUrl(channel: SupportDownloadChannel) {
  if (channel.type === "wechat") return buildWeChatLink(channel);
  if (channel.type === "whatsapp") return buildWhatsAppLink(channel);
  return buildTelegramLink(channel);
}

export default function SupportChannelCard({ channel }: Props) {
  const account = cleanSupportText(channel.account);
  const description = cleanSupportText(channel.description) || getDefaultChannelDescription(channel.type);
  const qrUrl = cleanSupportText(channel.qrUrl);
  const openUrl = getOpenUrl(channel);
  const title = getChannelTitle(channel);
  const qrTrackedRef = useRef(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  useEffect(() => {
    if (!qrUrl || qrTrackedRef.current) return;
    qrTrackedRef.current = true;
    void trackEvent({ event_type: "support_qr_view", module: "support", page: "/support-download" });
  }, [qrUrl]);

  const onOpenLink = () => {
    if (!openUrl) return;
    void trackEvent({
      event_type: channel.type === "whatsapp" ? "contact_whatsapp_click" : "support_channel_click",
      module: "support",
      page: "/support-download",
    });
    safeOpenExternal(openUrl);
  };

  const onDownloadQr = async () => {
    if (!qrUrl || downloadingQr) return;
    setDownloadingQr(true);
    void trackEvent({ event_type: "support_qr_download", module: "support", page: "/support-download" });
    try {
      const saved = await downloadImage(qrUrl, `${title}-二维码`);
      if (saved) toast.success("二维码已保存");
      else toast.message("已打开二维码图片，请长按保存");
    } catch {
      toast.error("保存失败，请长按二维码图片保存");
    } finally {
      setDownloadingQr(false);
    }
  };

  const onCopyAccount = async () => {
    void trackEvent({ event_type: "support_channel_click", module: "support", page: "/support-download" });
    await copyWithToast(account, channel.type === "wechat" ? "微信号已复制" : "账号已复制");
  };

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Headphones size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[var(--theme-text)]">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
        </div>
      </div>

      {qrUrl ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl border border-[var(--theme-border)] bg-white p-4 shadow-sm">
          <img src={qrUrl} alt={`${title}二维码`} className="h-52 w-52 max-w-full rounded-2xl object-contain" />
          <p className="text-xs font-medium text-slate-700">长按二维码可保存或识别</p>
        </div>
      ) : null}

      {account ? (
        <p className="mt-4 rounded-2xl bg-[var(--theme-bg)] px-4 py-3 text-sm text-[var(--theme-text)]">
          <span className="font-medium text-[var(--theme-text-muted)]">{getAccountLabel(channel)}：</span>
          <span className="font-semibold">{account}</span>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {channel.type === "wechat" && account ? (
          <button type="button" onClick={() => { void onCopyAccount(); }} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]">
            <Copy size={15} />
            复制微信号
          </button>
        ) : null}
        {channel.type !== "wechat" && openUrl ? (
          <button type="button" onClick={onOpenLink} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]">
            <ExternalLink size={15} />
            {getOpenLabel(channel)}
          </button>
        ) : null}
        {channel.type !== "wechat" && account ? (
          <button type="button" onClick={() => { void onCopyAccount(); }} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text)]">
            <Copy size={15} />
            复制账号
          </button>
        ) : null}
        {channel.type === "wechat" && openUrl ? (
          <button type="button" onClick={onOpenLink} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text)]">
            <ExternalLink size={15} />
            打开微信
          </button>
        ) : null}
        {qrUrl ? (
          <button type="button" onClick={() => { void onDownloadQr(); }} disabled={downloadingQr} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text)] disabled:opacity-60">
            {downloadingQr ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            保存二维码
          </button>
        ) : null}
      </div>
    </section>
  );
}
