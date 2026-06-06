import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import WeChatIcon from "@/components/icons/WeChatIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import TelegramIcon from "@/components/icons/TelegramIcon";
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
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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

function SupportChannelVisualIcon({ type }: { type: SupportDownloadChannel["type"] }) {
  if (type === "wechat") return <WeChatIcon size={26} />;
  if (type === "whatsapp") return <WhatsAppIcon size={26} />;
  return <TelegramIcon size={26} />;
}

function getChannelKicker(channel: SupportDownloadChannel) {
  if (channel.type === "wechat") return "微信客服";
  if (channel.type === "whatsapp") return "WhatsApp 客服";
  return "Telegram 客服";
}

function getQrActionHint(channel: SupportDownloadChannel) {
  if (channel.type === "wechat") return "长按二维码保存或识别";
  return "扫码或保存二维码后联系客服";
}

export default function SupportChannelCard({ channel }: Props) {
  const account = cleanSupportText(channel.account);
  const qrUrl = cleanSupportText(channel.qrUrl);
  const description = cleanSupportText(channel.description);
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
      <div className="support-channel-layout">
        <div className="support-channel-info">
          <div className="support-channel-head">
            <span className="support-channel-icon" aria-hidden="true">
              <SupportChannelVisualIcon type={channel.type} />
            </span>
            <div className="support-channel-title-block">
              <span className="support-channel-kicker">{getChannelKicker(channel)}</span>
              <h2>{title}</h2>
            </div>
          </div>

          {description ? (
            <p className="support-channel-description">{description}</p>
          ) : null}

          {account ? (
            <div className="support-account-panel">
              <div className="support-account-copy">
                <span>{getAccountLabel(channel)}</span>
                <strong>{account}</strong>
              </div>
              <UnifiedButton
                type="button"
                onClick={() => { void onCopyAccount(); }}
                className="support-copy-button"
              >
                <Copy size={17} aria-hidden="true" />
                <span>复制</span>
              </UnifiedButton>
            </div>
          ) : null}
        </div>

        <div className="support-qr-block">
          <div className="support-qr-media">
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

          <div className="support-channel-actions">
            {openUrl ? (
              <UnifiedButton
                type="button"
                onClick={onOpenLink}
                className="support-open-channel-button"
              >
                <ExternalLink size={18} aria-hidden="true" />
                <span>{getOpenLabel(channel)}</span>
              </UnifiedButton>
            ) : null}

            {qrUrl ? (
              <UnifiedButton
                type="button"
                onClick={() => { void onDownloadQr(); }}
                disabled={downloadingQr}
                className="support-download-qr-button"
              >
                {downloadingQr ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Download size={20} aria-hidden="true" />}
                <span>保存二维码</span>
              </UnifiedButton>
            ) : null}
          </div>

          <div className="support-qr-safety">
            <BadgeCheck size={15} aria-hidden="true" />
            <span>请认准页面展示的官方客服账号</span>
          </div>
        </div>
      </div>

      {!account && !qrUrl && !openUrl ? (
        <div className="support-channel-empty">当前客服渠道暂未配置联系方式。</div>
      ) : null}
    </section>
  );
}
