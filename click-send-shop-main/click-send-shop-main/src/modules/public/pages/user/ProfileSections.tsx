import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ChevronRight,
  Crown,
  LogOut,
  PackageCheck,
  ShieldCheck,
  Ticket,
  User,
  Wallet,
} from "lucide-react";
import NotificationIconButton from "@/components/NotificationIconButton";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StableImage from "@/components/ui/StableImage";
import { formatProfileHeroName } from "./profileHeroName";
import InviteRewardCard from "./InviteRewardCard.final.jsx";
import profileVipAvatarImage from "@/assets/profile-vip-avatar-medallion.svg";

export const PROFILE_CARD_CLASS = "store-profile-card client-profile-card rounded-[1.35rem] bg-[var(--theme-surface)]";
export const PROFILE_MENU_TAP = "store-profile-tap transition-transform active:scale-[0.98]";
const PROFILE_SECTION_PADDING = "px-[var(--store-card-x)] py-[var(--store-card-y)]";

export type ProfileOrderAction = {
  key?: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  path: string;
  auth: boolean;
};

export type ProfileAssetItem = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  path: string;
  auth: boolean;
};

export type ProfileServiceItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  auth: boolean;
  badgeText?: string;
};

export type ProfileTrustItem = {
  title: string;
  desc: string;
  icon: LucideIcon;
};

export type ProfileSnapshotItem = {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  path: string;
  auth: boolean;
  tone?: "primary" | "price" | "success" | "neutral";
};

export type ProfileHeroProgress = {
  label: string;
  value: string;
  percent: number;
};

function formatCount(count?: number) {
  const value = Number(count || 0);
  if (value <= 0) return "";
  return value > 99 ? "99+" : String(value);
}

function ProfileSectionTitle({
  title,
  rightLabel,
  onRightClick,
}: {
  title: string;
  rightLabel?: string;
  onRightClick?: () => void;
}) {
  return (
    <div className="profile-section-title client-profile-section-title">
      <h3>{title}</h3>
      {rightLabel ? (
        <UnifiedButton type="button" onClick={onRightClick} className="profile-section-more">
          {rightLabel}
          <ChevronRight size={15} />
        </UnifiedButton>
      ) : null}
    </div>
  );
}

export function ProfileHeroCard({
  logoSrc,
  avatar,
  userName,
  memberLevelName,
  progress,
  assets,
  unreadCount,
  onMessageClick,
  onMemberLevelClick,
  onProfileClick,
  onViewAllBenefits,
  onAssetNavigate,
  onAvatarClick,
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  memberLevelName: string;
  progress?: ProfileHeroProgress;
  assets?: ProfileAssetItem[];
  unreadCount: number;
  onMessageClick: () => void;
  onMemberLevelClick: () => void;
  onProfileClick: () => void;
  onViewAllBenefits: () => void;
  onAssetNavigate?: (item: ProfileAssetItem) => void;
  onAvatarClick: () => void;
}) {
  const displayName = formatProfileHeroName(userName);
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress?.percent ?? 0)));
  const avatarSrc = avatar || profileVipAvatarImage || logoSrc;

  return (
    <section className="store-profile-vip-card client-profile-hero-card">
      <span className="profile-vip-watermark" aria-hidden="true" />
      <div className="profile-vip-header">
        <UnifiedButton type="button" onClick={onAvatarClick} className="profile-avatar-button" aria-label="更换头像">
          <span className="profile-avatar-ring">
            {avatarSrc ? (
              <StableImage
                src={avatarSrc}
                alt={userName}
                className="profile-avatar-image h-full w-full rounded-full"
                imgClassName="rounded-full object-cover"
              />
            ) : (
              <span className="profile-avatar-fallback">{userName.slice(0, 1)}</span>
            )}
          </span>
          <span className="profile-avatar-camera">
            <Camera size={11} />
          </span>
        </UnifiedButton>

        <div className="profile-vip-copy">
          <div className="profile-vip-name-row">
            <p className="profile-vip-name" title={userName} aria-label={userName}>{displayName}</p>
            <UnifiedButton type="button" onClick={onMemberLevelClick} className="profile-vip-badge">
              <Crown size={13} />
              <span>{memberLevelName}</span>
            </UnifiedButton>
          </div>
          <p className="profile-vip-subtitle">
            <span aria-hidden="true" />
            尊享会员服务
          </p>
        </div>

        <div className="profile-vip-message">
          <NotificationIconButton
            unreadCount={unreadCount}
            onClick={onMessageClick}
            className="profile-vip-notification"
          />
        </div>
      </div>

      {progress ? (
        <div className="profile-vip-progress">
          <div className="profile-vip-progress-meta">
            <span>{progress.label}</span>
            <b>{progress.value}</b>
          </div>
          <div className="profile-vip-progress-track">
            <span
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-label="会员等级进度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            />
          </div>
        </div>
      ) : null}

      {assets?.length ? (
        <div className="profile-card-assets" aria-label="我的资产">
          {assets.map((item) => (
            <UnifiedButton
              key={item.key}
              type="button"
              data-feature-key={item.key}
              onClick={() => onAssetNavigate?.(item)}
              className="profile-card-asset"
            >
              <span className="profile-card-asset-icon" aria-hidden="true">
                <item.icon size={15} strokeWidth={2.2} />
              </span>
              <b>{item.value}</b>
              <span>{item.label}</span>
            </UnifiedButton>
          ))}
        </div>
      ) : null}

      <div className="profile-vip-actions">
        <UnifiedButton type="button" onClick={onProfileClick} className="profile-vip-action profile-vip-action--ghost">
          <User size={19} />
          <span>个人资料</span>
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onViewAllBenefits} className="profile-vip-action profile-vip-action--gold">
          <Crown size={19} />
          <span>会员权益</span>
        </UnifiedButton>
      </div>
    </section>
  );
}

export function ProfileGuestCard({
  siteName,
  onLogin,
  onRegister,
}: {
  siteName: string;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const guestHighlights = [
    { label: "订单追踪", desc: "待付款/发货/收货", icon: PackageCheck },
    { label: "优惠资产", desc: "优惠券和积分", icon: Ticket },
    { label: "账户余额", desc: "余额/礼品卡", icon: Wallet },
    { label: "售后客服", desc: "退换与安装支持", icon: ShieldCheck },
  ];

  return (
    <section className="store-profile-vip-card profile-guest-card client-profile-hero-card client-profile-guest-card">
      <span className="profile-vip-watermark" aria-hidden="true" />
      <div className="profile-vip-header">
        <span className="profile-guest-avatar" aria-hidden="true">?</span>
        <div className="profile-vip-copy">
          <p className="profile-vip-name profile-guest-title">未登录</p>
          <p className="profile-guest-desc">登录后同步 {siteName} 订单、优惠和会员权益</p>
        </div>
      </div>
      <div className="profile-guest-highlights" aria-label="登录后可用能力">
        {guestHighlights.map((item) => (
          <div key={item.label} className="profile-guest-highlight">
            <span>
              <item.icon size={15} strokeWidth={2.2} />
            </span>
            <b>{item.label}</b>
            <small>{item.desc}</small>
          </div>
        ))}
      </div>
      <div className="profile-vip-actions">
        <UnifiedButton type="button" onClick={onLogin} className="profile-vip-action profile-vip-action--gold">
          登录
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onRegister} className="profile-vip-action profile-vip-action--ghost">
          注册
        </UnifiedButton>
      </div>
    </section>
  );
}

export function ProfileOrderPanel({
  items,
  onNavigate,
  onViewAll,
}: {
  items: ProfileOrderAction[];
  onNavigate: (item: ProfileOrderAction) => void;
  onViewAll: () => void;
}) {
  return (
    <section className={cn(PROFILE_CARD_CLASS, "client-profile-order-panel", PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title="我的订单" rightLabel="全部订单" onRightClick={onViewAll} />
      <div className="profile-order-grid">
        {items.map((item) => {
          const badge = formatCount(item.count);
          return (
            <UnifiedButton
              key={item.label}
              type="button"
              data-feature-key={item.key}
              onClick={() => onNavigate(item)}
              className={cn("profile-order-action", PROFILE_MENU_TAP)}
            >
              <span className="profile-order-icon">
                <item.icon size={19} strokeWidth={2.1} />
                {badge ? <span className="profile-count-badge">{badge}</span> : null}
              </span>
              <span className="profile-order-label">{item.label}</span>
            </UnifiedButton>
          );
        })}
      </div>
    </section>
  );
}

export function ProfileAssetPanel({
  items,
  onNavigate,
}: {
  items: ProfileAssetItem[];
  onNavigate: (item: ProfileAssetItem) => void;
}) {
  if (!items.length) return null;

  return (
    <section className={cn(PROFILE_CARD_CLASS, "client-profile-asset-panel", PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title="我的资产" />
      <div className="profile-asset-grid">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            data-feature-key={item.key}
            onClick={() => onNavigate(item)}
            className={cn("profile-asset-action", PROFILE_MENU_TAP)}
          >
            <span className="profile-asset-icon">
              <item.icon size={17} strokeWidth={2.1} />
            </span>
            <span className="profile-asset-value">{item.value}</span>
            <span className="profile-asset-label">{item.label}</span>
          </UnifiedButton>
        ))}
      </div>
    </section>
  );
}

export function ProfileSnapshotPanel({
  items,
  onNavigate,
  className,
  title = "账户总览",
  subtitle,
}: {
  items: ProfileSnapshotItem[];
  onNavigate: (item: ProfileSnapshotItem) => void;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  if (!items.length) return null;

  return (
    <section className={cn(PROFILE_CARD_CLASS, "client-profile-snapshot-panel", className)}>
      <div className="client-profile-snapshot-head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="client-profile-snapshot-grid">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            data-feature-key={item.key}
            onClick={() => onNavigate(item)}
            className={cn("client-profile-snapshot-card", item.tone && `is-${item.tone}`)}
          >
            <span className="client-profile-snapshot-card__icon" aria-hidden>
              <item.icon size={18} strokeWidth={2.1} />
            </span>
            <span className="client-profile-snapshot-card__copy">
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <em>{item.hint}</em>
            </span>
            <ChevronRight size={16} className="client-profile-snapshot-card__arrow" aria-hidden />
          </UnifiedButton>
        ))}
      </div>
    </section>
  );
}

export function ProfileInviteRewardCard({
  loggedIn,
  inviteCount,
  rewardBalance,
  inviteCode,
  inviteCodeVisible,
  onPrimaryClick,
  onToggleInviteCode,
  onCopyInviteCode,
  onRecordClick,
}: {
  loggedIn: boolean;
  inviteCount: number;
  rewardBalance: number;
  inviteCode: string;
  inviteCodeVisible: boolean;
  onPrimaryClick: () => void;
  onToggleInviteCode: () => void;
  onCopyInviteCode: () => void;
  onRecordClick: () => void;
}) {
  const safeInviteCount = Math.max(0, Number(inviteCount) || 0);
  const safeRewardBalance = Math.max(0, Number(rewardBalance) || 0);
  const cashbackAmount = "RM " + safeRewardBalance.toFixed(2);

  return (
    <div className="profile-invite-reward-card client-profile-invite-panel">
      <InviteRewardCard
        invitedCount={safeInviteCount}
        cashbackAmount={cashbackAmount}
        onInvite={onPrimaryClick}
        onCode={onToggleInviteCode}
        onRecords={onRecordClick}
      />

      {loggedIn && inviteCodeVisible ? (
        <div className="profile-invite-code-panel" aria-live="polite">
          <span>
            邀请码：<strong>{inviteCode}</strong>
          </span>
          <button type="button" onClick={onCopyInviteCode} disabled={inviteCode === "暂无"}>
            复制
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ProfileServiceGrid({
  items,
  onNavigate,
  title = "我的服务",
}: {
  items: ProfileServiceItem[];
  onNavigate: (item: ProfileServiceItem) => void;
  title?: string;
}) {
  return (
    <section className={cn(PROFILE_CARD_CLASS, "client-profile-service-panel", PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title={title} />
      <div className="profile-service-grid">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            data-feature-key={item.key}
            onClick={() => onNavigate(item)}
            className={cn("profile-service-action", PROFILE_MENU_TAP)}
          >
            {item.badgeText ? <span className="profile-count-badge profile-service-badge">{item.badgeText}</span> : null}
            <span className="profile-service-icon">
              <item.icon size={18} strokeWidth={2.1} />
            </span>
            <span className="profile-service-label">{item.label}</span>
          </UnifiedButton>
        ))}
      </div>
    </section>
  );
}

export function ProfileSecondaryLinkPanel({
  items,
  onNavigate,
}: {
  items: ProfileServiceItem[];
  onNavigate: (item: ProfileServiceItem) => void;
}) {
  if (!items.length) return null;

  return (
    <section className={cn(PROFILE_CARD_CLASS, "client-profile-more-panel", PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title="更多功能" />
      <div className="profile-secondary-list">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            data-feature-key={item.key}
            onClick={() => onNavigate(item)}
            className={cn("profile-secondary-action", PROFILE_MENU_TAP)}
          >
            <span className="profile-secondary-icon">
              <item.icon size={18} strokeWidth={2.1} />
            </span>
            <span className="profile-secondary-label">
              <span className="profile-secondary-label-text">{item.label}</span>
              {item.badgeText ? <span className="profile-count-badge profile-secondary-badge">{item.badgeText}</span> : null}
            </span>
            <ChevronRight size={16} className="profile-secondary-chevron" />
          </UnifiedButton>
        ))}
      </div>
    </section>
  );
}

export function ProfileInstallShortcut({
  item,
  onNavigate,
}: {
  item: ProfileServiceItem;
  onNavigate: (item: ProfileServiceItem) => void;
}) {
  return (
    <section className="profile-install-shortcut client-profile-install-shortcut">
      <span className="profile-install-icon">
        <item.icon size={19} strokeWidth={2.1} />
      </span>
      <span className="profile-install-copy">
        <span className="profile-install-title">{item.label}</span>
        <span className="profile-install-desc">添加到手机桌面，打开更快</span>
      </span>
      <UnifiedButton type="button" data-feature-key={item.key} onClick={() => onNavigate(item)} className="profile-install-button">
        去添加
      </UnifiedButton>
    </section>
  );
}

export function ProfileTrustStrip({ items }: { items: ProfileTrustItem[] }) {
  return (
    <section className="profile-trust-strip client-profile-trust-strip">
      {items.map((item) => (
        <div key={item.title} className="profile-trust-entry">
          <span className="profile-trust-icon">
            <item.icon size={21} strokeWidth={2.1} />
          </span>
          <span className="profile-trust-copy">
            <span className="profile-trust-title">{item.title}</span>
            <span className="profile-trust-desc">{item.desc}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

export function ProfileLogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <UnifiedButton type="button" onClick={onClick} className="profile-logout-button client-profile-logout-button">
      <LogOut size={19} />
      退出登录
    </UnifiedButton>
  );
}
