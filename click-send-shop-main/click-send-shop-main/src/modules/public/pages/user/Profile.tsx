import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Bell,
  Camera,
  ChevronRight,
  CircleHelp,
  Clock3,
  Gift,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Settings,
  Ticket,
  Truck,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoWebp from "@/assets/logo.webp";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { isLoggedIn } from "@/utils/token";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import SkinPickerDialog from "@/components/SkinPickerDialog";
import NotificationIconButton from "@/components/NotificationIconButton";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import * as inviteService from "@/services/inviteService";
import * as rewardService from "@/services/rewardService";
import * as uploadService from "@/services/uploadService";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getMutedTextColor, getReadableTextColor } from "@/utils/themeContrast";

const CARD_CLASS = "rounded-2xl bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]";
const SECTION_PADDING = "p-4";
const ICON_SIZE = 18;

function SectionTitle({
  title,
  rightLabel,
  onRightClick,
}: {
  title: string;
  rightLabel?: string;
  onRightClick?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-semibold tracking-tight text-[var(--theme-text)]">{title}</h3>
      {rightLabel ? (
        <button type="button" onClick={onRightClick} className="inline-flex items-center gap-1 text-xs text-[var(--theme-muted)]">
          {rightLabel}
          <ChevronRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function ProfileHeroCard({
  logoSrc,
  avatar,
  userName,
  memberLevelName,
  code,
  onAvatarClick,
  skinTrigger,
  memberCardStyle,
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  memberLevelName: string;
  code: string;
  onAvatarClick: () => void;
  skinTrigger: ReactNode;
  memberCardStyle: "light" | "gold" | "blackGold" | "fresh";
}) {
  const heroStyle =
    memberCardStyle === "blackGold"
      ? "bg-[linear-gradient(120deg,#15120f,#2a2218)]"
      : memberCardStyle === "gold"
        ? "bg-[linear-gradient(120deg,#f5ead1,#ead6aa)]"
        : memberCardStyle === "fresh"
          ? "bg-[linear-gradient(120deg,#e9f7f4,#d8efe9)]"
          : "bg-[var(--theme-bg)]";

  const heroBg =
    memberCardStyle === "blackGold"
      ? "#1b160f"
      : memberCardStyle === "gold"
        ? "#f1dfbd"
        : memberCardStyle === "fresh"
          ? "#e1f3ec"
          : "var(--theme-bg)";

  const heroText = getReadableTextColor(heroBg, undefined, 4.5);
  const heroMuted = getMutedTextColor(heroBg, heroText);
  const badgeBg = `color-mix(in srgb, ${heroText} 14%, transparent)`;
  const switchBg = `color-mix(in srgb, ${heroText} 10%, white)`;
  const switchBorder = `color-mix(in srgb, ${heroText} 20%, transparent)`;

  return (
    <section
      className={`${CARD_CLASS} ${SECTION_PADDING} ${heroStyle}`}
      style={{
        color: heroText,
        ["--hero-text" as string]: heroText,
        ["--hero-muted" as string]: heroMuted,
        ["--hero-badge-bg" as string]: badgeBg,
        ["--hero-switch-bg" as string]: switchBg,
        ["--hero-switch-border" as string]: switchBorder,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" onClick={onAvatarClick} className="relative shrink-0" aria-label="更换头像">
            <img src={avatar || logoSrc} alt={userName} className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--theme-border)]" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
              <Camera size={11} />
            </span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-2xl font-semibold leading-tight text-[var(--hero-text)]">{userName}</p>
              <span className="rounded-full bg-[var(--hero-badge-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--hero-text)]">
                {memberLevelName}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--hero-muted)]">邀请码：{code}</p>
          </div>
        </div>
        <div className="shrink-0 [&_button]:border [&_button]:border-[var(--hero-switch-border)] [&_button]:bg-[var(--hero-switch-bg)] [&_button]:text-[var(--hero-text)]">
          {skinTrigger}
        </div>
      </div>
    </section>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "真烟网";
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const authStore = useAuthStore();
  const { nickname, avatar, pointsBalance, inviteCode, memberLevel, loadProfile } = useUserStore();
  const { orders, loadOrders } = useOrderStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);

  const [inviteCount, setInviteCount] = useState(0);
  const [rewardBalance, setRewardBalance] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { themeConfig } = useThemeRuntime();

  useEffect(() => {
    if (!isLoggedIn()) return;
    loadProfile().catch(() => {});
    loadOrders().catch(() => {});
    loadCoupons().catch(() => {});
    useNotificationStore.getState().fetchUnreadCount();
    inviteService
      .fetchInviteStats()
      .then((s) => setInviteCount(s.directCount || 0))
      .catch(() => {});
    rewardService
      .fetchRewardBalance()
      .then((res) => setRewardBalance(Number(res.balance || 0)))
      .catch(() => setRewardBalance(0));
  }, [loadCoupons, loadOrders, loadProfile]);

  const handleLogout = async () => {
    await authStore.logout();
    toast.success("已退出登录", toastPresetQuickSuccess);
    navigate("/login");
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadService.uploadSingle(file);
      useUserStore.setState({ avatar: data.url });
      await useUserStore.getState().saveProfile();
      toast.success("头像已更新", toastPresetQuickSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "头像上传失败");
    } finally {
      e.target.value = "";
    }
  };

  const userName = nickname?.trim() || "会员用户";
  const memberLevelName = memberLevel?.name?.trim() || "普通会员";
  const code = inviteCode?.trim() || "暂无";
  const couponCount = useMemo(() => coupons.filter((c) => !c.used_at && !c.usedAt).length, [coupons]);
  const cashbackText = `RM ${rewardBalance.toFixed(2)}`;

  const orderPending = useMemo(
    () => orders.filter((o) => o.status === "pending" || o.payment_status === "pending").length,
    [orders],
  );
  const orderShipping = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.status === "paid" || o.payment_status === "paid")
          && o.status !== "shipped"
          && o.status !== "completed",
      ).length,
    [orders],
  );
  const orderReceiving = useMemo(() => orders.filter((o) => o.status === "shipped").length, [orders]);

  if (!isLoggedIn()) {
    return (
      <div className="store-page min-h-screen px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)] text-[var(--theme-text)]">
        <section className={`${CARD_CLASS} mx-auto max-w-lg ${SECTION_PADDING}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt={siteName} className="h-9 w-9 rounded-lg object-cover" />
              <p className="text-lg font-semibold">{siteName}</p>
            </div>
            <SkinPickerDialog trigger={<button type="button" className="rounded-full bg-[var(--theme-bg)] p-2 text-[var(--theme-muted)]"><Palette size={16} /></button>} />
          </div>
          <div className="mt-4 rounded-xl bg-[var(--theme-bg)] p-4">
            <p className="text-base font-semibold">登录后查看会员权益</p>
            <p className="mt-1 text-xs text-[var(--theme-muted)]">订单、积分、优惠券、收藏都在这里管理</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate("/login")} className="rounded-xl bg-[var(--theme-primary)] py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]">登录</button>
              <button type="button" onClick={() => navigate("/login")} className="rounded-xl bg-[var(--theme-surface)] py-2.5 text-sm font-semibold text-[var(--theme-text)] ring-1 ring-[var(--theme-border)]">注册</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const assetItems = [
    { label: "积分", value: String(pointsBalance), icon: Gift, path: "/points" },
    { label: "优惠券", value: String(couponCount), icon: Ticket, path: "/coupons" },
    { label: "收藏", value: String(favoriteCount), icon: Heart, path: "/favorites" },
    { label: "返现", value: cashbackText, icon: Wallet, path: "/rewards" },
  ];

  return (
    <div className="store-page min-h-screen px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)] text-[var(--theme-text)]">
      <main className="mx-auto max-w-lg space-y-3">
        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoSrc} alt={siteName} className="h-8 w-8 rounded-lg object-contain" />
              <p className="text-lg font-semibold text-[var(--theme-text)]">{siteName}</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} />
              <button type="button" className="rounded-full bg-[var(--theme-bg)] p-2 text-[var(--theme-muted)]" onClick={() => navigate("/settings")}>
                <Settings size={16} />
              </button>
            </div>
          </div>

          <ProfileHeroCard
            logoSrc={logoSrc}
            avatar={avatar}
            userName={userName}
            memberLevelName={memberLevelName}
            code={code}
            onAvatarClick={() => avatarInputRef.current?.click()}
            skinTrigger={
              <SkinPickerDialog
                trigger={
                  <button type="button" className="rounded-full bg-[var(--theme-bg)] px-3 py-1.5 text-xs font-medium text-[var(--theme-muted)] ring-1 ring-[var(--theme-border)]">
                    切换皮肤
                  </button>
                }
              />
            }
            memberCardStyle={themeConfig.memberCardStyle}
          />
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="grid grid-cols-4 gap-2">
            {assetItems.map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)} className="rounded-xl bg-[var(--theme-bg)] px-2 py-3 text-center">
                <item.icon className="mx-auto mb-1.5 text-[var(--theme-secondary)]" size={ICON_SIZE} />
                <p className="text-[11px] text-[var(--theme-muted)]">{item.label}</p>
                <p className="mt-1 text-[22px] font-semibold leading-none tracking-tight text-[var(--theme-text)]">{item.value}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <SectionTitle title="我的订单" rightLabel="查看全部" onRightClick={() => navigate("/orders")} />
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: "待付款", icon: Wallet, value: orderPending, path: "/orders" },
              { label: "待发货", icon: Package, value: orderShipping, path: "/orders" },
              { label: "待收货", icon: Truck, value: orderReceiving, path: "/orders" },
              { label: "待评价", icon: MessageCircle, value: 0, path: "/orders" },
              { label: "售后/退款", icon: CircleHelp, value: 0, path: "/returns" },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)} className="relative rounded-xl px-1 py-2">
                {item.value > 0 ? <span className="absolute left-7 top-0 min-w-[1rem] rounded-full bg-[var(--theme-danger)] px-1 text-[10px] text-white">{item.value}</span> : null}
                <item.icon size={ICON_SIZE} className="mx-auto text-[var(--theme-secondary)]" />
                <p className="mt-1 text-xs">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <SectionTitle title="常用服务" />
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "收货地址", icon: MapPin, path: "/address" },
              { label: "浏览记录", icon: Clock3, path: "/history" },
              { label: "积分商城", icon: Gift, path: "/points" },
              { label: "邀请有礼", icon: Gift, path: "/invite" },
              { label: "消息通知", icon: Bell, path: "/notifications" },
              { label: "帮助中心", icon: CircleHelp, path: "/help" },
              { label: "账户设置", icon: Settings, path: "/settings" },
              { label: "我的收藏", icon: Heart, path: "/favorites" },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)} className="space-y-1 rounded-xl bg-[var(--theme-bg)] px-1 py-2 text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-secondary)_12%,white)] text-[var(--theme-secondary)]">
                  <item.icon size={16} />
                </span>
                <p className="text-[11px]">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`} style={{ background: "linear-gradient(90deg,color-mix(in_srgb,var(--theme-secondary)_16%,white),var(--theme-surface))" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold">邀请好友得奖励</p>
              <p className="mt-1 line-clamp-1 text-xs text-[var(--theme-muted)]">已邀请 {inviteCount} 位好友，继续邀请可获得积分和优惠券</p>
            </div>
            <button type="button" onClick={() => navigate("/invite")} className="shrink-0 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]">立即邀请</button>
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-sm font-semibold">正品保障</p><p className="text-xs text-[var(--theme-muted)]">100% 正品保证</p></div>
            <div><p className="text-sm font-semibold">本地配送</p><p className="text-xs text-[var(--theme-muted)]">快速发货</p></div>
            <div><p className="text-sm font-semibold">安全支付</p><p className="text-xs text-[var(--theme-muted)]">多重加密保护</p></div>
          </div>
        </section>

        <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--theme-danger)_12%,white)] py-3 text-sm font-semibold text-[var(--theme-danger)]">
          <LogOut size={16} />
          退出登录
        </button>
      </main>
    </div>
  );
}
