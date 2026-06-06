import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ChevronRight,
  Crown,
  LogOut,
  User,
} from "lucide-react";
import NotificationIconButton from "@/components/NotificationIconButton";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { formatProfileHeroName } from "./profileHeroName";
import profileVipAvatarImage from "@/assets/profile-vip-avatar-medallion.svg";

export const PROFILE_CARD_CLASS = "store-profile-card rounded-[1.35rem] bg-[var(--theme-surface)]";
export const PROFILE_MENU_TAP = "store-profile-tap transition-transform active:scale-[0.98]";
const PROFILE_SECTION_PADDING = "px-[var(--store-card-x)] py-[var(--store-card-y)]";

export type ProfileOrderAction = {
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

function InviteBadgeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 18h18l-1 2H4l-1-2Zm1.3-9.8 3.8 3.1 3-5 3.2 4.1 4.4-3.2-1.8 8.3H6.1L4.3 8.2Z" fill="currentColor" />
    </svg>
  );
}

function InvitePeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="7.2" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <path d="M4.5 19.2c1.7-3.5 4.4-5.2 7.5-5.2s5.8 1.7 7.5 5.2" fill="none" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function InviteWalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 8.5C3 7.1 4.1 6 5.5 6h11C17.9 6 19 7.1 19 8.5v7c0 1.4-1.1 2.5-2.5 2.5h-11C4.1 18 3 16.9 3 15.5v-7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 9h5v6h-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.5" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

function InviteSendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M22 2 11 13" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" fill="none" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

function InviteCodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="m9 14-2 2 2 2" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="m15 14 2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="m13 13-2 6" fill="none" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

function InviteRecordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="M9 8h6" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.85" />
      <path d="M9 16h4" fill="none" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
}

function InviteCopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="12" height="12" rx="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 15.8V6.2A2.2 2.2 0 0 1 6.2 4h9.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
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
    <div className="profile-section-title">
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
  unreadCount,
  onMessageClick,
  onMemberLevelClick,
  onProfileClick,
  onViewAllBenefits,
  onAvatarClick,
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  memberLevelName: string;
  progress?: ProfileHeroProgress;
  unreadCount: number;
  onMessageClick: () => void;
  onMemberLevelClick: () => void;
  onProfileClick: () => void;
  onViewAllBenefits: () => void;
  onAvatarClick: () => void;
}) {
  const displayName = formatProfileHeroName(userName);
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress?.percent ?? 0)));
  const avatarSrc = avatar || profileVipAvatarImage || logoSrc;

  return (
    <section className="store-profile-vip-card">
      <span className="profile-vip-watermark" aria-hidden="true" />
      <div className="profile-vip-header">
        <UnifiedButton type="button" onClick={onAvatarClick} className="profile-avatar-button" aria-label="更换头像">
          <span className="profile-avatar-ring">
            {avatarSrc ? (
              <img src={avatarSrc} alt={userName} className="profile-avatar-image h-full w-full rounded-full object-cover" />
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
  logoSrc,
  siteName,
  onLogin,
}: {
  logoSrc: string;
  siteName: string;
  onLogin: () => void;
}) {
  return (
    <section className="store-profile-vip-card profile-guest-card">
      <span className="profile-vip-watermark" aria-hidden="true">VIP</span>
      <div className="profile-vip-header">
        <span className="profile-avatar-ring profile-brand-logo-ring">
          {logoSrc ? (
            <img src={logoSrc} alt={siteName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="profile-avatar-fallback">{siteName.slice(0, 1)}</span>
          )}
        </span>
        <div className="profile-vip-copy">
          <p className="profile-vip-name profile-guest-title">欢迎来到 {siteName}</p>
        </div>
      </div>
      <div className="profile-vip-actions">
        <UnifiedButton type="button" onClick={onLogin} className="profile-vip-action profile-vip-action--gold">
          登录 / 注册
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
    <section className={cn(PROFILE_CARD_CLASS, PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title="我的订单" rightLabel="全部订单" onRightClick={onViewAll} />
      <div className="profile-order-grid">
        {items.map((item) => {
          const badge = formatCount(item.count);
          return (
            <UnifiedButton
              key={item.label}
              type="button"
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
    <section className={cn(PROFILE_CARD_CLASS, PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title="我的资产" />
      <div className="profile-asset-grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
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
    <section className="irc-card" aria-label="邀请好友得奖励">
      <div className="irc-layout">
        <div className="irc-left">
          <div className="irc-badge">
            <div className="irc-badgeIcon" aria-hidden="true">
              <InviteBadgeIcon />
            </div>
            <span>INVITE BONUS</span>
          </div>

          <h2 className="irc-title">邀请好友得奖励</h2>
          <p className="irc-subtitle">好友完成有效任务后，现金奖励自动入账</p>

          <div className="irc-stats" aria-label="邀请奖励数据">
            <div className="irc-stat">
              <div className="irc-statIcon irc-teal" aria-hidden="true">
                <InvitePeopleIcon />
              </div>
              <div className="irc-statText">
                <span className="irc-statLabel">已邀请</span>
                <strong className="irc-statValue">{safeInviteCount} 人</strong>
              </div>
            </div>

            <div className="irc-stat">
              <div className="irc-statIcon irc-gold" aria-hidden="true">
                <InviteWalletIcon />
              </div>
              <div className="irc-statText">
                <span className="irc-statLabel">可用返现</span>
                <strong className="irc-statValue">{cashbackAmount}</strong>
              </div>
            </div>
          </div>

          {loggedIn && inviteCodeVisible ? (
            <div className="irc-code">
              <span>
                邀请码：<strong>{inviteCode}</strong>
              </span>
              <button type="button" onClick={onCopyInviteCode} disabled={inviteCode === "暂无"}>
                <InviteCopyIcon />
                复制
              </button>
            </div>
          ) : null}

          <div className="irc-actions">
            <button type="button" onClick={onPrimaryClick} className="irc-action irc-primary">
              <InviteSendIcon />
              <span>立即邀请</span>
            </button>

            <button type="button" onClick={onToggleInviteCode} className="irc-action">
              <InviteCodeIcon />
              <span>邀请码</span>
            </button>

            <button type="button" onClick={onRecordClick} className="irc-action">
              <InviteRecordIcon />
              <span>记录</span>
            </button>
          </div>
        </div>

        <div className="irc-right" aria-hidden="true">
          <div className="irc-heroGlow" />
          <div className="irc-ring" />
          <div className="irc-platform" />

          <div className="irc-ribbon irc-ribbonLeft" />
          <div className="irc-ribbon irc-ribbonRight" />

          <div className="irc-envelope">
            <div className="irc-envelopeFlap" />
            <div className="irc-envelopeTrim" />
            <div className="irc-seal">福</div>
            <div className="irc-wavePattern" />
          </div>

          <div className="irc-gift">
            <div className="irc-giftLid" />
            <div className="irc-giftBow" />
          </div>

          <div className="irc-coin irc-coin1" />
          <div className="irc-coin irc-coin2" />
          <div className="irc-coin irc-coin3" />
          <div className="irc-coin irc-coin4" />

          <span className="irc-spark irc-spark1" />
          <span className="irc-spark irc-spark2" />
          <span className="irc-spark irc-spark3" />
          <span className="irc-spark irc-spark4" />
        </div>
      </div>
    </section>
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
    <section className={cn(PROFILE_CARD_CLASS, PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title={title} />
      <div className="profile-service-grid">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
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
    <section className={cn(PROFILE_CARD_CLASS, PROFILE_SECTION_PADDING)}>
      <ProfileSectionTitle title="更多功能" />
      <div className="profile-secondary-list">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            onClick={() => onNavigate(item)}
            className={cn("profile-secondary-action", PROFILE_MENU_TAP)}
          >
            <span className="profile-secondary-icon">
              <item.icon size={18} strokeWidth={2.1} />
            </span>
            <span className="profile-secondary-label">{item.label}</span>
            {item.badgeText ? <span className="profile-count-badge profile-secondary-badge">{item.badgeText}</span> : null}
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
    <section className="profile-install-shortcut">
      <span className="profile-install-icon">
        <item.icon size={19} strokeWidth={2.1} />
      </span>
      <span className="profile-install-copy">
        <span className="profile-install-title">{item.label}</span>
        <span className="profile-install-desc">手机端快捷访问</span>
      </span>
      <UnifiedButton type="button" onClick={() => onNavigate(item)} className="profile-install-button">
        去添加
      </UnifiedButton>
    </section>
  );
}

export function ProfileTrustStrip({ items }: { items: ProfileTrustItem[] }) {
  return (
    <section className="profile-trust-strip">
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
    <UnifiedButton type="button" onClick={onClick} className="profile-logout-button">
      <LogOut size={19} />
      退出登录
    </UnifiedButton>
  );
}
