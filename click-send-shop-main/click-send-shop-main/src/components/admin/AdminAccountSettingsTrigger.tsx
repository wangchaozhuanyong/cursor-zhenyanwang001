import type { LucideIcon } from "lucide-react";
import { Fingerprint, Lock, User } from "lucide-react";
import { useAdminT } from "@/hooks/useAdminT";
import type { AdminAccountTab } from "@/components/admin/AdminAccountPanel";
import { useAdminAccountSettings } from "@/modules/admin/context/AdminAccountSettingsContext";

type Variant = "menu" | "inline";

type Props = {
  tab?: AdminAccountTab;
  variant?: Variant;
  /** 打开前回调，例如关闭头像下拉菜单 */
  onBeforeOpen?: () => void;
  className?: string;
};

const TAB_META: Record<AdminAccountTab, { icon: LucideIcon; labelKey?: "layout.accountSettings" | "layout.changePassword"; label?: string }> = {
  profile: { icon: User, labelKey: "layout.accountSettings" },
  password: { icon: Lock, labelKey: "layout.changePassword" },
  security: { icon: Fingerprint, label: "安全验证" },
};

export default function AdminAccountSettingsTrigger({
  tab = "profile",
  variant = "menu",
  onBeforeOpen,
  className,
}: Props) {
  const { t } = useAdminT();
  const { openAccountSettings } = useAdminAccountSettings();
  const meta = TAB_META[tab];
  const Icon = meta.icon;
  const label = meta.labelKey ? t(meta.labelKey) : meta.label || "";

  const handleClick = () => {
    onBeforeOpen?.();
    openAccountSettings(tab);
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={label}
        className={
          className
          || "touch-manipulation inline-flex items-center gap-1 theme-rounded border border-[var(--theme-border)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-[var(--theme-bg)] hover:text-foreground"
        }
      >
        <Icon size={14} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className
        || "flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary"
      }
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
