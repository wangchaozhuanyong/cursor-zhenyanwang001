import { Headphones, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useSupportRuntime } from "@/hooks/useSupportRuntime";
import { getChannelTitle } from "@/utils/supportChannels";
import { copyToClipboard } from "@/utils/clipboard";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";

type SupportContactSectionProps = {
  className?: string;
};

/**
 * 帮助中心、联系我们等页面的统一客服区块（数据来自 supportDownloadConfig）。
 */
export default function SupportContactSection({ className }: SupportContactSectionProps) {
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

  if (!isAvailable) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">客服中心暂未开放，请稍后再试或通过站内电话/邮箱联系我们。</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {workingHours ? (
        <p className="mt-2 text-xs text-muted-foreground">
          服务时间：{workingHours}
        </p>
      ) : null}
      {channels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => { void handleChannelClick(channel.id); }}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-theme-price"
            >
              <MessageCircle size={14} />
              {getChannelTitle(channel)}
            </button>
          ))}
        </div>
      ) : null}
      <Link
        to={buildSupportPageUrl()}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-theme-price"
      >
        <Headphones size={15} />
        前往客服中心
      </Link>
    </div>
  );
}
