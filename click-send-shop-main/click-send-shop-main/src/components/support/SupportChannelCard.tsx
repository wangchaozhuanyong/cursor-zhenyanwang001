import { useEffect, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Loader2 } from "lucide-react";
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

function getCopySuccessMessage(channel: SupportDownloadChannel) {
  return channel.type === "wechat" ? "微信号已复制" : "账号已复制";
}

function getOpenUrl(channel: SupportDownloadChannel) {
  if (channel.type === "wechat") return buildWeChatLink(channel);
  if (channel.type === "whatsapp") return buildWhatsAppLink(channel);
  return buildTelegramLink(channel);
}

export default function SupportChannelCard({ channel }: Props) {
  const account = cleanSupportText(channel.account);
  const description = cleanSupportText(channel.description);
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
      if (saved) toast.success("二维码已下载");
      else toast.message("已打开二维码图片，请长按保存");
    } catch {
      toast.error("下载失败，请长按二维码图片保存");
    } finally {
      setDownloadingQr(false);
    }
  };

  const onCopyAccount = async () => {
    void trackEvent({ event_type: "support_channel_click", module: "support", page: "/support-download" });
    await copyWithToast(account, getCopySuccessMessage(channel));
  };

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 shadow-[var(--theme-shadow)]">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--theme-text)]">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
        ) : null}
      </div>

      {account ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[var(--theme-bg)] px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-[var(--theme-text)]">
            <span className="font-medium text-[var(--theme-text-muted)]">{getAccountLabel(channel)}：</span>
            <span className="break-all font-semibold">{account}</span>
          </p>
          <button
            type="button"
            onClick={() => { void onCopyAccount(); }}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text)]"
          >
            <Copy size={13} />
            复制
          </button>
        </div>
      ) : null}

      {qrUrl ? (
        <div className="mt-5 flex flex-col items-center gap-3">
          <img
            src={qrUrl}
            alt={`${title}二维码`}
            className="h-[min(72vw,260px)] w-[min(72vw,260px)] rounded-2xl object-contain"
          />
          <p className="text-xs font-medium text-[var(--theme-text-muted)]">长按二维码可保存或识别</p>
          <button
            type="button"
            onClick={() => { void onDownloadQr(); }}
            disabled={downloadingQr}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)] disabled:opacity-60"
          >
            {downloadingQr ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            下载二维码
          </button>
        </div>
      ) : null}

      {openUrl ? (
        <button
          type="button"
          onClick={onOpenLink}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        >
          <ExternalLink size={15} />
          {getOpenLabel(channel)}
        </button>
      ) : null}
    </section>
  );
}
