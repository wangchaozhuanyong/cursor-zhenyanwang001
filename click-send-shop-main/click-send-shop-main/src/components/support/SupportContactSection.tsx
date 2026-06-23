import { ChevronRight, Clock, Headphones } from "lucide-react";
import { Link } from "react-router-dom";
import WeChatIcon from "@/components/icons/WeChatIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import TelegramIcon from "@/components/icons/TelegramIcon";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";
import { getChannelTitle } from "@/utils/supportChannels";
import { copyToClipboard } from "@/utils/clipboard";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import type { SupportChannelType } from "@/types/content";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type SupportContactSectionProps = {
  className?: string;
  hideDescription?: boolean;
  variant?: "default" | "compact";
};

function SupportChannelIcon({ type }: { type: SupportChannelType }) {
  if (type === "wechat") return <WeChatIcon size={20} />;
  if (type === "whatsapp") return <WhatsAppIcon size={20} />;
  return <TelegramIcon size={20} />;
}

function channelButtonSpanClass(index: number, total: number): string {
  if (total > 1 && total % 2 === 1 && index === total - 1) return "support-contact-v12__channel--wide";
  return "";
}

function getCompactWorkingHours(value: string) {
  const normalized = value.replace(/^服务时间[:：]?/, "").trim();
  const firstSentence = normalized.split(/[。；;]/)[0]?.trim();
  return (firstSentence || normalized).replace(/^工作日\s*/, "");
}

/**
 * 帮助中心、联系我们等页面的统一客服区块（数据来自 supportDownloadConfig）。
 */
export default function SupportContactSection({ className, hideDescription = false, variant = "default" }: SupportContactSectionProps) {
  const {
    channels,
    description,
    workingHours,
    buildSupportPageUrl,
    openChannel,
    isAvailable,
  } = useSupportRuntime();

  const handleChannelClick = async (channelId: string) => {
    const channel = channels.find((item) => item.id === channelId);
    if (!channel) return;
    const result = openChannel(channel);
    if (result === "wechat_copy") {
      const account = channel.account?.trim();
      if (!account) return;
      const [{ toast }, copied] = await Promise.all([import("sonner"), copyToClipboard(account)]);
      if (copied) toast.success("微信号已复制", toastPresetQuickSuccess);
      else toast.error("复制失败，请手动复制微信号");
      return;
    }
    if (result === "none") {
      window.location.assign(buildSupportPageUrl(channelId));
    }
  };

  const compact = variant === "compact";
  const rootClassName = [
    "support-contact-v12",
    compact ? "support-contact-v12--compact" : "",
    className,
  ].filter(Boolean).join(" ");

  if (!isAvailable) {
    return (
      <div className={rootClassName}>
        <p className="support-contact-v12__empty">客服中心暂未开放，请稍后再试或通过站内电话/邮箱联系我们。</p>
      </div>
    );
  }

  const displayWorkingHours = compact && workingHours ? getCompactWorkingHours(workingHours) : workingHours;

  return (
    <div className={rootClassName}>
      <div className="support-contact-v12__head">
        <Headphones size={18} className="support-contact-v12__head-icon" />
        <h3 className="support-contact-v12__title">联系客服</h3>
      </div>

      {!hideDescription && description ? (
        <p className="support-contact-v12__description">{description}</p>
      ) : null}

      {displayWorkingHours ? (
        <div className="support-contact-v12__hours">
          <Clock size={14} className="support-contact-v12__hours-icon" />
          <p className="support-contact-v12__hours-text">
            <span>服务时间</span>
            <strong>{displayWorkingHours}</strong>
          </p>
        </div>
      ) : null}

      {channels.length > 0 ? (
        <div className="support-contact-v12__channels">
          {channels.map((channel, index) => (
            <UnifiedButton
              key={channel.id}
              type="button"
              onClick={() => { void handleChannelClick(channel.id); }}
              className={`support-contact-v12__channel ${channelButtonSpanClass(index, channels.length)}`}
            >
              <span className="support-contact-v12__channel-icon">
                <SupportChannelIcon type={channel.type} />
              </span>
              <span className="support-contact-v12__channel-copy">
                <span className="support-contact-v12__channel-title">
                  {getChannelTitle(channel)}
                </span>
                {!compact ? (
                  <span className="support-contact-v12__channel-hint">点击联系</span>
                ) : null}
              </span>
            </UnifiedButton>
          ))}
        </div>
      ) : null}

      <Link
        to={buildSupportPageUrl()}
        className="support-contact-v12__link"
      >
        <span className="support-contact-v12__link-copy">
          <Headphones size={15} />
          <span>前往客服中心</span>
        </span>
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
