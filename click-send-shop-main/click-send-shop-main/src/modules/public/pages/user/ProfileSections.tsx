import type { LucideIcon } from "lucide-react";
import {
  Camera,
  ChevronRight,
  Copy,
  Crown,
  FileText,
  LogOut,
  Send,
  User,
} from "lucide-react";
import NotificationIconButton from "@/components/NotificationIconButton";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { formatProfileHeroName } from "./profileHeroName";
import inviteRewardHeroImage from "@/assets/invite-reward-hero-illustration.svg";
import inviteRewardMiniRedpacketImage from "@/assets/invite-reward-mini-redpacket.svg";

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

  return (
    <section className="store-profile-vip-card">
      <span className="profile-vip-watermark" aria-hidden="true" />
      <div className="profile-vip-header">
        <UnifiedButton type="button" onClick={onAvatarClick} className="profile-avatar-button" aria-label="更换头像">
          <span className="profile-avatar-ring">
            {avatar || logoSrc ? (
              <img src={avatar || logoSrc} alt={userName} className="h-full w-full rounded-full object-cover" />
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
        <span className="profile-avatar-ring">
          {logoSrc ? (
            <img src={logoSrc} alt={siteName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="profile-avatar-fallback">{siteName.slice(0, 1)}</span>
          )}
        </span>
        <div className="profile-vip-copy">
          <p className="profile-vip-name">欢迎来到 {siteName}</p>
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
  return (
    <section className="profile-invite-card">
      <div className="profile-invite-content">
        <div className="profile-invite-copy">
          <div className="profile-invite-heading">
            <span className="profile-invite-heading-icon" aria-hidden="true">
              <img className="profile-invite-heading-art" src={inviteRewardMiniRedpacketImage} alt="" />
            </span>
            <p className="profile-invite-title">邀请好友得奖励</p>
          </div>
          <p className="profile-invite-desc">
            {loggedIn ? "好友成功完成后，你可获得现金返现" : "登录后邀请好友获得现金返现"}
          </p>
        </div>
        <div className="profile-invite-art" aria-hidden="true">
          <img className="profile-invite-art-image" src={inviteRewardHeroImage} alt="" />
        </div>
      </div>

      {loggedIn ? (
        <div className="profile-invite-stats" aria-label="邀请奖励数据">
          <span className="profile-invite-stat-chip">
            <span className="profile-invite-stat-icon profile-invite-stat-icon--people" aria-hidden="true">
              <User size={13} strokeWidth={2.1} />
            </span>
            <span>已邀请</span>
            <b>{inviteCount} 人</b>
          </span>
          <span className="profile-invite-stat-chip">
            <span className="profile-invite-stat-icon profile-invite-stat-icon--cash" aria-hidden="true">¥</span>
            <span>返现金额</span>
            <b>RM {rewardBalance.toFixed(2)}</b>
          </span>
        </div>
      ) : null}

      {loggedIn && inviteCodeVisible ? (
        <div className="profile-invite-code">
          <p>
            邀请码：<span>{inviteCode}</span>
          </p>
          <UnifiedButton type="button" onClick={onCopyInviteCode} disabled={inviteCode === "暂无"}>
            <Copy size={13} />
            复制
          </UnifiedButton>
        </div>
      ) : null}

      <div className={cn("profile-invite-actions", loggedIn ? "profile-invite-actions--triple" : "profile-invite-actions--single")}>
        <UnifiedButton type="button" onClick={onPrimaryClick} className="profile-invite-btn profile-invite-btn--primary">
          <Send size={16} />
          {loggedIn ? "立即邀请" : "去登录"}
        </UnifiedButton>
        {loggedIn ? (
          <>
            <UnifiedButton type="button" onClick={onToggleInviteCode} className="profile-invite-btn profile-invite-btn--secondary">
              <FileText size={16} />
              {inviteCodeVisible ? "隐藏邀请码" : "邀请码"}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={onRecordClick} className="profile-invite-btn profile-invite-btn--secondary">
              <FileText size={16} />
              邀请记录
            </UnifiedButton>
          </>
        ) : null}
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
