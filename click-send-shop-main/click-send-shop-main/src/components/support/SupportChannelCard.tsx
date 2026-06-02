import { useEffect, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Loader2, ScanLine, UserRound } from "lucide-react";
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
    <section className={`support-channel-card support-channel-card--${channel.type}`}>
      <div className="support-channel-title">
        <span className="support-channel-flourish" aria-hidden="true" />
        <h1>{title}</h1>
        <span className="support-channel-flourish" aria-hidden="true" />
        {description ? (
          <p>{description}</p>
        ) : null}
      </div>

      {account ? (
        <div className="support-account-panel">
          <span className="support-account-icon" aria-hidden="true">
            <UserRound size={22} />
          </span>
          <p>
            <span>{getAccountLabel(channel)}：</span>
            <strong>{account}</strong>
          </p>
          <button
            type="button"
            onClick={() => { void onCopyAccount(); }}
            className="support-copy-button"
          >
            <Copy size={17} aria-hidden="true" />
            <span>复制</span>
          </button>
        </div>
      ) : null}

      <div className="support-qr-block">
        <div className="support-qr-stage">
          <div className="support-qr-frame">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`${title}二维码`}
                className="support-qr-image"
              />
            ) : (
              <div className="support-qr-placeholder">暂未配置二维码</div>
            )}
          </div>
        </div>

        {qrUrl ? (
          <p className="support-qr-hint">
            <ScanLine size={18} aria-hidden="true" />
            <span>长按二维码保存或识别</span>
          </p>
        ) : null}

        <div className="support-channel-actions">
          {qrUrl ? (
            <button
              type="button"
              onClick={() => { void onDownloadQr(); }}
              disabled={downloadingQr}
              className="support-download-qr-button"
            >
              {downloadingQr ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Download size={20} aria-hidden="true" />}
              <span>下载二维码</span>
            </button>
          ) : null}

          {openUrl ? (
            <button
              type="button"
              onClick={onOpenLink}
              className="support-open-channel-button"
            >
              <ExternalLink size={18} aria-hidden="true" />
              <span>{getOpenLabel(channel)}</span>
            </button>
          ) : null}
        </div>
      </div>

      {!account && !qrUrl && !openUrl ? (
        <div className="support-channel-empty">当前客服渠道暂未配置联系方式。</div>
      ) : null}
    </section>
  );
}
