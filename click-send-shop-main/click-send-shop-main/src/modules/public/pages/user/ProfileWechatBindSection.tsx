import { UnifiedButton } from "@/components/ui/UnifiedButton";
/**
 * 「我的」页微信绑定入口（THIRD_PARTY_LOGIN_ENABLED 为 true 时由 Profile 挂载）
 */
import { ChevronRight } from "lucide-react";
import WeChatIcon from "@/components/icons/WeChatIcon";
import { THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";
import type { WechatLoginBinding } from "@/types/user";

type Props = {
  wechatLogin: WechatLoginBinding;
  onNavigateSettings: () => void;
  cardClass: string;
  menuTapClass: string;
};

export default function ProfileWechatBindSection({
  wechatLogin,
  onNavigateSettings,
  cardClass,
  menuTapClass,
}: Props) {
  if (!THIRD_PARTY_LOGIN_ENABLED) return null;

  if (!wechatLogin?.bound) {
    return (
      <UnifiedButton
        type="button"
        onClick={onNavigateSettings}
        className={`${cardClass} flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left ${menuTapClass}`}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-[#07C160]">
          <WeChatIcon size={20} />
          绑定微信，扫码快捷登录
        </span>
        <ChevronRight size={16} className="text-[var(--theme-text-muted-on-surface)]" />
      </UnifiedButton>
    );
  }

  return (
    <div className={`${cardClass} flex items-center gap-2 px-4 py-3 text-xs text-[var(--theme-text-muted-on-surface)]`}>
      <WeChatIcon size={18} />
      <span>已绑定微信{wechatLogin.nickname ? `：${wechatLogin.nickname}` : ""}</span>
    </div>
  );
}
