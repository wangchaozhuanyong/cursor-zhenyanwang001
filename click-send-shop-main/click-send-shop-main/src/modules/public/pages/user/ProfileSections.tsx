import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  LogOut,
  PackageCheck,
  Pencil,
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

export const PROFILE_CARD_CLASS = "sf-next-profile-card rounded-[1.35rem] bg-[var(--theme-surface)]";
export const PROFILE_MENU_TAP = "sf-next-profile-tap transition-transform active:scale-[0.98]";
const PROFILE_SECTION_PADDING = "px-[var(--sf-card-x)] py-[var(--sf-card-y)]";

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
    <div className="profile-section-title sf-next-profile-section-title">
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

export function ProfileIdentityHeader({
  logoSrc,
  avatar,
  userName,
  onMessageClick,
  onProfileClick,
  onAvatarClick,
  unreadCount,
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  onMessageClick: () => void;
  onProfileClick: () => void;
  onAvatarClick: () => void;
  unreadCount: number;
}) {
  const displayName = formatProfileHeroName(userName);
  const avatarSrc = avatar || profileVipAvatarImage || logoSrc;

  return (
    <section className="sf-next-profile-identity" aria-label="账户资料">
      <UnifiedButton type="button" onClick={onAvatarClick} className="sf-next-profile-identity__avatar" aria-label="更换头像">
        {avatarSrc ? (
          <StableImage
            src={avatarSrc}
            alt={userName}
            className="sf-next-profile-identity__avatar-image"
            imgClassName="object-cover"
          />
        ) : (
          <span>{userName.slice(0, 1)}</span>
        )}
      </UnifiedButton>
      <button type="button" onClick={onProfileClick} className="sf-next-profile-identity__copy">
        <strong title={userName} aria-label={userName}>{displayName}</strong>
      </button>
      <div className="sf-next-profile-identity__actions">
        <NotificationIconButton
          unreadCount={unreadCount}
          onClick={onMessageClick}
          className="sf-next-profile-identity__icon-button"
        />
        <UnifiedButton type="button" onClick={onProfileClick} className="sf-next-profile-identity__icon-button" aria-label="编辑资料">
          <Pencil size={21} aria-hidden />
        </UnifiedButton>
      </div>
    </section>
  );
}

export function ProfileHeroCard({
  memberLevelName,
  assets,
  onMemberLevelClick,
  onAssetNavigate,
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
  const folioAssets = (assets || []).slice(0, 3);

  return (
    <section className="sf-next-profile-hero-card" aria-label={`${memberLevelName}会员权益`}>
      <span className="profile-vip-watermark" aria-hidden="true" />
      <UnifiedButton
        type="button"
        onClick={onMemberLevelClick}
        className="profile-vip-folio-head"
        aria-label={`查看${memberLevelName}会员权益`}
      >
        <span>MEMBER FOLIO</span>
        <h2>{memberLevelName}</h2>
        <p>权益以当前会员配置为准</p>
      </UnifiedButton>

      {folioAssets.length ? (
        <div className="profile-card-assets" aria-label="我的资产">
          {folioAssets.map((item) => (
            <UnifiedButton
              key={item.key}
              type="button"
              data-feature-key={item.key}
              aria-label={`${item.label}：${item.value}`}
              onClick={(event) => {
                event.stopPropagation();
                onAssetNavigate?.(item);
              }}
              onKeyDown={(event) => event.stopPropagation()}
              className="profile-card-asset"
            >
              <span className="profile-card-asset-value">{item.value}</span>
              <span className="profile-card-asset-label">{normalizeAssetLabel(item.label)}</span>
            </UnifiedButton>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function normalizeAssetLabel(label: string) {
  const normalized = label.replace(/^我的/, "").replace(/^可用/, "").trim();
  if (normalized === "返现余额") return "返现";
  return normalized || label;
}

export function ProfileGuestCard({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  const guestHighlights = [
    { label: "订单追踪", desc: "待付款/发货/收货", icon: PackageCheck },
    { label: "优惠资产", desc: "优惠券和积分", icon: Ticket },
    { label: "返现余额", desc: "下单可抵扣", icon: Wallet },
    { label: "售后客服", desc: "退换与安装支持", icon: ShieldCheck },
  ];

  return (
    <section className="sf-next-profile-hero-card sf-next-profile-guest-card">
      <span className="profile-vip-watermark" aria-hidden="true" />
      <div className="profile-vip-header">
        <span className="profile-guest-avatar" aria-hidden="true">
          <User size={22} strokeWidth={2.1} />
        </span>
        <div className="profile-vip-copy">
          <p className="profile-vip-name profile-guest-title">未登录</p>
        </div>
        <div className="profile-guest-auth-actions" aria-label="登录注册入口">
          <UnifiedButton type="button" onClick={onLogin} className="profile-vip-action profile-vip-action--gold">
            登录
          </UnifiedButton>
          <UnifiedButton type="button" onClick={onRegister} className="profile-vip-action profile-vip-action--ghost">
            注册
          </UnifiedButton>
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
    <section className={cn(PROFILE_CARD_CLASS, "sf-next-profile-order-panel", PROFILE_SECTION_PADDING)}>
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
    <section className={cn(PROFILE_CARD_CLASS, "sf-next-profile-asset-panel", PROFILE_SECTION_PADDING)}>
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
    <section className={cn(PROFILE_CARD_CLASS, "sf-next-profile-snapshot-panel", className)}>
      <div className="sf-next-profile-snapshot-head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="sf-next-profile-snapshot-grid">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            data-feature-key={item.key}
            onClick={() => onNavigate(item)}
            className={cn("sf-next-profile-snapshot-card", item.tone && `is-${item.tone}`)}
          >
            <span className="sf-next-profile-snapshot-card__icon" aria-hidden>
              <item.icon size={18} strokeWidth={2.1} />
            </span>
            <span className="sf-next-profile-snapshot-card__copy">
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <em>{item.hint}</em>
            </span>
            <ChevronRight size={16} className="sf-next-profile-snapshot-card__arrow" aria-hidden />
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
    <div className="profile-invite-reward-card sf-next-profile-invite-panel">
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
  rightLabel,
  onRightClick,
}: {
  items: ProfileServiceItem[];
  onNavigate: (item: ProfileServiceItem) => void;
  title?: string;
  rightLabel?: string;
  onRightClick?: () => void;
}) {
  return (
    <section className={cn(PROFILE_CARD_CLASS, "sf-next-profile-service-panel", PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title={title} rightLabel={rightLabel} onRightClick={onRightClick} />
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
  onSupportClick,
}: {
  items: ProfileServiceItem[];
  onNavigate: (item: ProfileServiceItem) => void;
  onSupportClick: () => void;
}) {
  if (!items.length) return null;

  return (
    <section className={cn(PROFILE_CARD_CLASS, "sf-next-profile-more-panel", PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title="更多功能" rightLabel="联系客服" onRightClick={onSupportClick} />
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
    <section className="profile-install-shortcut sf-next-profile-install-shortcut">
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

export function ProfileLogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <UnifiedButton type="button" onClick={onClick} className="profile-logout-button sf-next-profile-logout-button">
      <LogOut size={19} />
      退出登录
    </UnifiedButton>
  );
}
