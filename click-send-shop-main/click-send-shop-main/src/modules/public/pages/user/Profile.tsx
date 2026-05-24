import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  MessageSquare,
  Package,
  Palette,
  Settings,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";
import { isLoggedIn } from "@/utils/token";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import SkinPickerDialog from "@/components/SkinPickerDialog";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import NotificationIconButton from "@/components/NotificationIconButton";
import StorePageHeader from "@/components/store/StorePageHeader";
import StoreAccountNav from "@/components/store/StoreAccountNav";
import { STORE_MOBILE_PAGE_HEADER_CLASS } from "@/constants/storeLayout";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import * as inviteService from "@/services/inviteService";
import * as orderService from "@/services/orderService";
import * as returnService from "@/services/returnService";
import { countActiveReturns } from "@/utils/returnBuyerStatus";
import * as rewardService from "@/services/rewardService";
import * as loyaltyService from "@/services/loyaltyService";
import * as meService from "@/services/meService";
import * as uploadService from "@/services/uploadService";
import type { OrderSummary } from "@/types/order";
import { hasPendingReview } from "@/utils/orderBuyerStatus";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import InvitePromoCard from "@/components/store/InvitePromoCard";
import { formatUnreadBadge } from "@/utils/notificationBadge";
import {
  THEME_ACCENT_ICON_CLASS,
  THEME_ACCENT_ICON_SHELL_CLASS,
  THEME_MEMBER_CARD_MUTED,
  THEME_MEMBER_CARD_SHELL,
} from "@/utils/themeVisuals";
import { THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";

const ProfileWechatBindSection = THIRD_PARTY_LOGIN_ENABLED
  ? lazy(() => import("./ProfileWechatBindSection"))
  : null;

const CARD_CLASS = "rounded-[22px] bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]";
const SECTION_PADDING = "px-[var(--store-card-x)] py-[var(--store-card-y)]";
const MENU_TAP = "transition-transform active:scale-[0.97]";

function gateNavigate(navigate: ReturnType<typeof useNavigate>, path: string, requireAuth = true) {
  if (requireAuth && !isLoggedIn()) {
    navigate("/login", { state: { from: path } });
    return;
  }
  navigate(path, { state: { from: "/profile" } });
}

function SectionTitle({ title, rightLabel, onRightClick }: { title: string; rightLabel?: string; onRightClick?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-semibold tracking-tight text-[var(--theme-text)]">{title}</h3>
      {rightLabel ? (
        <button type="button" onClick={onRightClick} className="inline-flex items-center gap-1 text-xs text-[var(--theme-text-muted-on-surface)]">
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
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  memberLevelName: string;
  code: string;
  onAvatarClick: () => void;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[24px] px-[var(--store-card-x)] py-5 shadow-[var(--theme-shadow)] ${THEME_MEMBER_CARD_SHELL}`}>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-28"
        style={{ background: "var(--theme-member-card-sheen)" }}
      />
      <div className="relative flex min-h-[112px] items-center gap-4">
        <button type="button" onClick={onAvatarClick} className="relative shrink-0" aria-label="更换头像">
          <span
            className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 bg-black/30 p-1"
            style={{ borderColor: "var(--theme-member-card-avatar-ring)" }}
          >
            {avatar || logoSrc ? (
              <img src={avatar || logoSrc} alt={userName} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-black/25 text-lg font-bold">
                {userName.slice(0, 1)}
              </span>
            )}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
            <Camera size={11} />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="store-page-title max-w-full truncate leading-tight">{userName}</p>
            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold shadow-md"
              style={{
                backgroundColor: "var(--theme-member-card-badge-bg)",
                color: "var(--theme-member-card-badge-fg)",
              }}
            >
              {memberLevelName}
            </span>
          </div>
          <p className={`mt-2 inline-flex max-w-full rounded-full bg-black/15 px-3 py-1 text-sm font-semibold ${THEME_MEMBER_CARD_MUTED}`}>
            <span className="truncate">邀请码：{code}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const siteName = siteInfo.siteName || "官方商城";
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const authStore = useAuthStore();
  const { nickname, avatar, pointsBalance, inviteCode, memberLevel, wechatLogin, loadProfile } = useUserStore();
  const { orders, loadOrders } = useOrderStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);

  const [inviteCount, setInviteCount] = useState(0);
  const [rewardBalance, setRewardBalance] = useState(0);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<loyaltyService.LoyaltyConfig | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { themeConfig } = useThemeRuntime();

  useEffect(() => {
    if (!loggedIn) return;

    meService.fetchMeSummary().then((summary) => {
      setInviteCount(Number(summary?.inviteStats?.directCount || 0));
      setRewardBalance(Number(summary?.rewardBalance?.balance || 0));
      setOrderSummary(summary?.orderSummary || null);
      setLoyaltyConfig(summary?.loyaltyConfig || null);
      useNotificationStore.setState({ unreadCount: Number(summary?.unreadCount || 0) });
    }).catch(() => {
      loadProfile().catch(() => {});
      loadOrders().catch(() => {});
      loadCoupons().catch(() => {});
      loadFavorites().catch(() => {});
      useNotificationStore.getState().fetchUnreadCount();
      inviteService.fetchInviteStats().then((s) => setInviteCount(s.directCount || 0)).catch(() => {});
      rewardService.fetchRewardBalance().then((res) => setRewardBalance(Number(res.balance || 0))).catch(() => setRewardBalance(0));
      orderService.fetchOrderSummary().then((res) => setOrderSummary(res)).catch(() => setOrderSummary(null));
      loyaltyService.fetchLoyaltyConfig().then((cfg) => setLoyaltyConfig(cfg)).catch(() => setLoyaltyConfig(null));
    });
  }, [loadCoupons, loadFavorites, loadOrders, loadProfile, loggedIn]);

  useEffect(() => {
    if (!loggedIn) {
      setActiveReturnCount(0);
      return;
    }
    void returnService.fetchReturnRequests({ page: 1, pageSize: 50 })
      .then((r) => setActiveReturnCount(countActiveReturns(r.list || [])))
      .catch(() => setActiveReturnCount(0));
  }, [loggedIn]);

  const handleLogout = async () => {
    await authStore.logout();
    toast.success("已退出登录", toastPresetQuickSuccess);
    navigate("/login");
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadService.uploadSingle(file, { mode: "thumb" });
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
  const couponCount = useMemo(() => coupons.filter((c) => !c.used_at).length, [coupons]);

  const orderPending = useMemo(() => orders.filter((o) => o.status === "pending" && o.payment_status !== "paid").length, [orders]);
  const orderShipping = useMemo(() => orders.filter((o) => o.status === "paid" || (o.payment_status === "paid" && o.status !== "shipped" && o.status !== "completed" && o.status !== "cancelled" && o.status !== "refunding" && o.status !== "refunded")).length, [orders]);
  const orderReceiving = useMemo(() => orders.filter((o) => o.status === "shipped").length, [orders]);
  const pendingReviewCount = useMemo(() => orders.filter((o) => hasPendingReview(o)).length, [orders]);
  const [activeReturnCount, setActiveReturnCount] = useState(0);
  const orderRefundCount = useMemo(
    () => orders.filter((o) => o.status === "refunding" || o.status === "refunded").length,
    [orders],
  );
  const afterSaleCount = Math.max(orderSummary?.after_sale ?? orderRefundCount, activeReturnCount);

  const pointsEnabled = isLoyaltyFeatureEnabled("points", capabilities, loyaltyConfig);
  const rewardsEnabled = isLoyaltyFeatureEnabled("reward", capabilities, loyaltyConfig);
  const inviteEnabled = isLoyaltyFeatureEnabled("referral", capabilities, loyaltyConfig);
  const assetItems = [
    { key: "points", label: "我的积分", value: String(pointsBalance), path: "/points", auth: true },
    { key: "favorites", label: "我的收藏", value: String(favoriteCount), path: "/favorites", auth: false },
    { key: "coupons", label: "优惠礼券", value: String(couponCount), path: "/coupons", auth: true },
    { key: "reward", label: "邀请返现", value: `RM ${rewardBalance.toFixed(2)}`, path: "/rewards", auth: true },
  ].filter((item) => (
    (item.key !== "points" || pointsEnabled)
    && (item.key !== "coupons" || capabilities.couponEnabled)
    && (item.key !== "reward" || rewardsEnabled)
  ));
  const assetGridClass = assetItems.length <= 2
    ? "grid-cols-2"
    : assetItems.length === 3
      ? "grid-cols-3"
      : "grid-cols-4";

  const orderActions = (loggedIn
  ? [
    { label: "待付款", icon: Wallet, count: orderSummary?.pending_payment ?? orderPending, path: "/orders?tab=pending_payment", auth: true },
    { label: "待发货", icon: Package, count: orderSummary?.pending_ship ?? orderShipping, path: "/orders?tab=paid", auth: true },
    { label: "待收货", icon: Truck, count: orderSummary?.pending_receive ?? orderReceiving, path: "/orders?tab=shipped", auth: true },
    { label: "待评价", icon: MessageSquare, count: orderSummary?.pending_review ?? pendingReviewCount, path: "/orders?tab=pending_review", auth: true },
    { label: "退款售后", icon: CircleHelp, count: orderSummary?.after_sale ?? afterSaleCount, path: "/orders?tab=after_sale", auth: true },
  ]
  : [
    { label: "待付款", icon: Wallet, count: 0, path: "/orders?tab=pending_payment", auth: true },
    { label: "待发货", icon: Package, count: 0, path: "/orders?tab=paid", auth: true },
    { label: "待收货", icon: Truck, count: 0, path: "/orders?tab=shipped", auth: true },
    { label: "待评价", icon: MessageSquare, count: 0, path: "/orders?tab=pending_review", auth: true },
    { label: "退款售后", icon: CircleHelp, count: 0, path: "/orders?tab=after_sale", auth: true },
  ]).filter((item) => item.label !== "待评价" || capabilities.reviewEnabled) as Array<{ label: string; icon: typeof Wallet; count?: number; path: string; auth: boolean }>;
  const orderGridClass = "grid-cols-5";
  const notificationBadgeText = formatUnreadBadge(unreadCount);

  return (
    <div className="store-page store-page-shell store-bottom-safe text-[var(--theme-text)]">
      <StorePageHeader
        className={STORE_MOBILE_PAGE_HEADER_CLASS}
        title={
          <span className="inline-flex min-w-0 items-center gap-2.5">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                width={36}
                height={36}
                className="store-brand-logo"
                loading="eager"
                decoding="async"
              />
            ) : null}
            <span className="truncate">个人中心</span>
          </span>
        }
        rightSlot={(
          <>
            {loggedIn ? <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications", { state: { from: "/profile" } })} /> : null}
            <SkinPickerDialog trigger={<button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50 text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]" aria-label="切换皮肤"><Palette size={16} /></button>} />
            {loggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/settings", { state: { from: "/profile" } })}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50 text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]"
                aria-label="设置"
              >
                <Settings size={16} />
              </button>
            ) : null}
          </>
        )}
      />
      <main className="mx-auto w-full max-w-screen-xl space-y-3 px-[var(--store-page-x)] pt-[var(--store-page-y)] sm:max-w-lg sm:space-y-4 sm:px-4 sm:pt-4 lg:grid lg:max-w-none lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0 lg:px-8 lg:pb-12 lg:pt-6">
        <aside className="hidden lg:block">
          <StoreAccountNav className="sticky top-[calc(var(--store-desktop-header-height,4rem)+1.5rem)]" />
        </aside>
        <div className="min-w-0 space-y-3 sm:space-y-4">
        <section className="space-y-3">
          {!loggedIn ? (
            <div className={`${CARD_CLASS} relative overflow-hidden ${SECTION_PADDING}`}>
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--theme-primary)]" />
              <div className="flex items-center gap-3">
                {logoSrc ? (
                  <img src={logoSrc} alt={siteName} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-[var(--theme-border)]" />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">欢迎来到 {siteName}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">登录后可查看订单、积分、优惠券、收藏、返现与邀请奖励</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => navigate("/login", { state: { from: "/profile" } })} className="rounded-2xl bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]">登录</button>
                <button type="button" onClick={() => navigate("/login", { state: { from: "/profile" } })} className="rounded-2xl bg-[var(--theme-bg)] py-3 text-sm font-semibold ring-1 ring-[var(--theme-border)]">注册</button>
              </div>
            </div>
          ) : (
            <>
              <ProfileHeroCard
                logoSrc={logoSrc}
                avatar={avatar}
                userName={userName}
                memberLevelName={memberLevelName}
                code={code}
                onAvatarClick={() => avatarInputRef.current?.click()}
              />
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              {ProfileWechatBindSection ? (
                <Suspense fallback={null}>
                  <ProfileWechatBindSection
                    wechatLogin={wechatLogin}
                    onNavigateSettings={() => navigate("/settings", { state: { from: "/profile" } })}
                    cardClass={CARD_CLASS}
                    menuTapClass={MENU_TAP}
                  />
                </Suspense>
              ) : null}
            </>
          )}
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <SectionTitle title="我的订单" rightLabel="查看全部" onRightClick={() => gateNavigate(navigate, "/orders", true)} />
          <div className={cn("grid gap-2", orderGridClass)}>
            {orderActions.map((item) => (
              <button key={item.label} type="button" onClick={() => gateNavigate(navigate, item.path, item.auth)} className={`relative rounded-2xl px-1 py-2.5 text-center ${MENU_TAP}`}>
                {Number(item.count || 0) > 0 ? <span className="absolute right-3 top-2 min-w-[1rem] rounded-full bg-[var(--theme-danger)] px-1 text-[10px] text-[var(--theme-danger-foreground)]">{item.count}</span> : null}
                <span className={cn("mx-auto flex h-9 w-9 items-center justify-center rounded-2xl", THEME_ACCENT_ICON_SHELL_CLASS)}>
                  <item.icon size={17} strokeWidth={2} />
                </span>
                <p className="store-caption mt-2 truncate whitespace-nowrap font-medium leading-none">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        {loggedIn ? (
        <section className={`${CARD_CLASS} overflow-hidden`}>
          <div className={cn("px-[var(--store-card-x)] pt-[var(--store-card-y)]", inviteEnabled ? "pb-0" : "pb-[var(--store-card-y)]")}>
            <div className={cn("grid px-1 py-1", assetGridClass)}>
              {assetItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => gateNavigate(navigate, item.path, item.auth)}
                  className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 text-center ${MENU_TAP}`}
                >
                  <p className="truncate whitespace-nowrap font-bold leading-tight text-base tabular-nums text-[var(--theme-text-on-surface)]">
                    {item.value}
                  </p>
                  <p className="min-h-[1rem] truncate text-xs font-semibold leading-tight text-[var(--theme-text-muted-on-surface)]">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
          {inviteEnabled ? (
          <div className="border-t border-[color-mix(in_srgb,var(--theme-border)_55%,transparent)] px-[var(--store-card-x)] pb-[var(--store-card-y)] pt-3">
            <InvitePromoCard
              loggedIn={loggedIn}
              inviteCount={inviteCount}
              rewardBalance={rewardBalance}
              className="rounded-2xl"
              onAction={() =>
                loggedIn ? gateNavigate(navigate, "/invite", true) : navigate("/login", { state: { from: "/profile" } })
              }
            />
          </div>
          ) : null}
        </section>
        ) : inviteEnabled ? (
        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <InvitePromoCard
            loggedIn={false}
            inviteCount={0}
            rewardBalance={0}
            onAction={() => navigate("/login", { state: { from: "/profile" } })}
          />
        </section>
        ) : null}

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
            {[
              { key: "address", label: "收货地址", icon: MapPin, path: "/address", auth: true },
              { key: "favorites", label: "我的收藏", icon: Heart, path: "/favorites", auth: false },
              { key: "points", label: "我的积分", icon: Gift, path: "/points", auth: true },
              { key: "invite", label: "邀请有礼", icon: Gift, path: "/invite", auth: true },
              { key: "notifications", label: "消息通知", icon: Bell, path: "/notifications", auth: true, badgeText: notificationBadgeText },
              { key: "history", label: "浏览记录", icon: Clock3, path: "/history", auth: false },
              { key: "help", label: "帮助中心", icon: CircleHelp, path: "/help", auth: false },
              { key: "settings", label: "账户设置", icon: Settings, path: "/settings", auth: true },
            ].filter((item) => (
              (item.path !== "/points" || pointsEnabled)
              && (item.path !== "/invite" || inviteEnabled)
            )).map((item) => (
              <button key={item.key} type="button" onClick={() => gateNavigate(navigate, item.path, item.auth)} className={`relative min-h-[76px] rounded-2xl bg-[var(--theme-bg)] px-1 py-2 text-center ring-1 ring-[color-mix(in_srgb,var(--theme-border)_60%,transparent)] ${MENU_TAP}`}>
                {item.badgeText ? (
                  <span className="absolute right-3 top-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--theme-danger)] px-1 text-[10px] leading-none text-[var(--theme-danger-foreground)]">
                    {item.badgeText}
                  </span>
                ) : null}
                <span className={cn("mx-auto flex h-9 w-9 items-center justify-center rounded-2xl", THEME_ACCENT_ICON_SHELL_CLASS)}>
                  <item.icon size={16} strokeWidth={2} />
                </span>
                <p className="mt-1 text-[11px] leading-4">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { title: "正品保障", desc: "100% 正品保证", icon: ShieldCheck },
              { title: "本地配送", desc: "快速发货", icon: Truck },
              { title: "安全支付", desc: "加密保护", icon: Wallet },
            ].map((item) => (
              <div key={item.title} className="px-1 py-2 text-center">
                <item.icon size={17} strokeWidth={2} className={cn("mx-auto", THEME_ACCENT_ICON_CLASS)} />
                <p className="mt-1 text-xs font-semibold">{item.title}</p>
                <p className="mt-0.5 truncate text-[10px] text-[var(--theme-text-muted-on-surface)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {loggedIn ? (
          <button type="button" onClick={() => setLogoutConfirmOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--theme-danger)_12%,var(--theme-surface))] py-3 text-sm font-semibold text-[var(--theme-danger)]">
            <LogOut size={16} />
            退出登录
          </button>
        ) : null}
        </div>
      </main>

      <BottomSheetConfirm
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        title="退出登录"
        description="确定要退出当前账号吗？"
        confirmText="退出"
        danger
        onConfirm={handleLogout}
      />
    </div>
  );
}
