import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CircleHelp,
  Coins,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
  Ticket,
  Truck,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";
import { isLoggedIn } from "@/utils/token";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import StoreAccountNav from "@/components/store/StoreAccountNav";
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
import * as memberBenefitsService from "@/services/memberBenefitsService";
import * as uploadService from "@/services/uploadService";
import type { MemberBenefitsOverview } from "@/services/memberBenefitsService";
import type { OrderSummary } from "@/types/order";
import { hasPendingReview } from "@/utils/orderBuyerStatus";
import { formatUnreadBadge } from "@/utils/notificationBadge";
import { detectBrowserEnv } from "@/utils/browserEnv";
import { THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";
import { STORE_COPY } from "@/constants/storeCopy";
import { computeUpgradeProgress } from "@/utils/memberBenefitPresentation";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";
import {
  PROFILE_CARD_CLASS,
  PROFILE_MENU_TAP,
  ProfileAssetPanel,
  ProfileGuestCard,
  ProfileHeroCard,
  ProfileInviteRewardCard,
  ProfileInstallShortcut,
  ProfileLogoutButton,
  ProfileOrderPanel,
  ProfileSecondaryLinkPanel,
  ProfileServiceGrid,
  ProfileTrustStrip,
  type ProfileAssetItem,
  type ProfileOrderAction,
  type ProfileServiceItem,
  type ProfileTrustItem,
} from "./ProfileSections";
import { buildInstallShortcutItem, buildProfileSecondaryItems, buildShoppingServiceItems } from "./profileQuickLinks";

const ProfileWechatBindSection = THIRD_PARTY_LOGIN_ENABLED
  ? lazy(() => import("./ProfileWechatBindSection"))
  : null;

function formatGrowthValue(value: number) {
  const safeValue = Math.max(0, Math.round(Number(value) || 0));
  return safeValue.toLocaleString("zh-CN");
}

async function gateNavigate(navigate: ReturnType<typeof useNavigate>, path: string, requireAuth = true) {
  if (requireAuth && !isLoggedIn()) {
    navigate("/login", { state: { from: path } });
    return;
  }
  try {
    await preloadStoreRoute(path);
  } catch {
    // If a chunk preload fails, keep the original navigation path so the app-level recovery can handle it.
  }
  navigate(path, { state: { from: "/profile" } });
}

export default function Profile() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
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
  const [inviteCodeVisible, setInviteCodeVisible] = useState(false);
  const [activeReturnCount, setActiveReturnCount] = useState(0);
  const [browserEnv, setBrowserEnv] = useState(() => detectBrowserEnv());
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const memberBenefitsQuery = useQuery<MemberBenefitsOverview>({
    queryKey: memberBenefitsService.memberBenefitsQueryKey,
    queryFn: memberBenefitsService.fetchMemberBenefits,
    enabled: loggedIn && capabilities.memberLevelEnabled,
  });
  const memberBenefits = memberBenefitsQuery.data ?? null;

  useEffect(() => {
    setBrowserEnv(detectBrowserEnv());
  }, []);

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

  const handleCopyInviteCode = async () => {
    if (!inviteCode?.trim()) return;
    try {
      await navigator.clipboard.writeText(inviteCode.trim());
      toast.success("邀请码已复制", toastPresetQuickSuccess);
    } catch {
      toast.error("复制失败，请手动复制邀请码");
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
  const orderRefundCount = useMemo(
    () => orders.filter((o) => o.status === "refunding" || o.status === "refunded").length,
    [orders],
  );
  const afterSaleCount = Math.max(orderSummary?.after_sale ?? orderRefundCount, activeReturnCount);

  const pointsEnabled = isLoyaltyFeatureEnabled("points", capabilities, loyaltyConfig);
  const rewardsEnabled = isLoyaltyFeatureEnabled("reward", capabilities, loyaltyConfig);
  const inviteEnabled = isLoyaltyFeatureEnabled("referral", capabilities, loyaltyConfig);

  const memberProgress = useMemo(() => {
    const currentGrowth = Number(memberBenefits?.current_growth_value ?? pointsBalance ?? 0);
    const nextLevel = memberBenefits?.next_level;

    if (memberBenefits && nextLevel) {
      const growthToNext = Number(memberBenefits.growth_to_next_level || 0);
      const targetGrowth = currentGrowth + Math.max(0, growthToNext);
      return {
        label: growthToNext > 0
          ? `距离${nextLevel.name}还差 ${formatGrowthValue(growthToNext)} 成长值`
          : `已满足${nextLevel.name}升级条件`,
        value: `${formatGrowthValue(currentGrowth)}/${formatGrowthValue(targetGrowth || currentGrowth || 1)}`,
        percent: computeUpgradeProgress(memberBenefits),
      };
    }

    if (memberBenefits && !nextLevel) {
      return {
        label: "已达到当前最高会员等级",
        value: formatGrowthValue(currentGrowth),
        percent: 100,
      };
    }

    const fallbackTarget = Math.max(1000, Math.ceil(Math.max(currentGrowth, 1) / 1000) * 1000);
    return {
      label: `当前成长值 ${formatGrowthValue(currentGrowth)}`,
      value: `${formatGrowthValue(currentGrowth)}/${formatGrowthValue(fallbackTarget)}`,
      percent: Math.min(100, Math.max(8, Math.round((currentGrowth / fallbackTarget) * 100))),
    };
  }, [memberBenefits, pointsBalance]);

  const assetItems = useMemo<ProfileAssetItem[]>(() => [
    { key: "points", label: "我的积分", value: String(pointsBalance), icon: Coins, path: "/points", auth: true },
    { key: "favorites", label: "我的收藏", value: String(favoriteCount), icon: Star, path: "/favorites", auth: false },
    { key: "coupons", label: "优惠券", value: String(couponCount), icon: Ticket, path: "/coupons", auth: true },
    { key: "reward", label: "返现余额", value: `RM ${rewardBalance.toFixed(2)}`, icon: Wallet, path: "/rewards", auth: true },
  ].filter((item) => (
    (item.key !== "points" || pointsEnabled)
    && (item.key !== "coupons" || capabilities.couponEnabled)
    && (item.key !== "reward" || rewardsEnabled)
  )), [capabilities.couponEnabled, couponCount, favoriteCount, pointsBalance, pointsEnabled, rewardBalance, rewardsEnabled]);

  const orderActions = useMemo<ProfileOrderAction[]>(() => {
    const items: ProfileOrderAction[] = loggedIn
      ? [
        { label: "待付款", icon: Wallet, count: orderSummary?.pending_payment ?? orderPending, path: "/orders?tab=pending_payment", auth: true },
        { label: "待发货", icon: Package, count: orderSummary?.pending_ship ?? orderShipping, path: "/orders?tab=paid", auth: true },
        { label: "待收货", icon: Truck, count: orderSummary?.pending_receive ?? orderReceiving, path: "/orders?tab=shipped", auth: true },
        { label: "待评价", icon: MessageSquare, count: orderSummary?.pending_review ?? pendingReviewCount, path: "/orders?tab=pending_review", auth: true },
        { label: "退款/售后", icon: CircleHelp, count: orderSummary?.after_sale ?? afterSaleCount, path: "/orders?tab=after_sale", auth: true },
      ]
      : [
        { label: "待付款", icon: Wallet, count: 0, path: "/orders?tab=pending_payment", auth: true },
        { label: "待发货", icon: Package, count: 0, path: "/orders?tab=paid", auth: true },
        { label: "待收货", icon: Truck, count: 0, path: "/orders?tab=shipped", auth: true },
        { label: "待评价", icon: MessageSquare, count: 0, path: "/orders?tab=pending_review", auth: true },
        { label: "退款/售后", icon: CircleHelp, count: 0, path: "/orders?tab=after_sale", auth: true },
      ];
    return items.filter((item) => item.label !== "待评价" || capabilities.reviewEnabled);
  }, [afterSaleCount, capabilities.reviewEnabled, loggedIn, orderPending, orderReceiving, orderShipping, orderSummary, pendingReviewCount]);

  const notificationBadgeText = formatUnreadBadge(unreadCount);
  const showInstallShortcut = browserEnv.platform !== "desktop";
  const shoppingServiceItems = useMemo<ProfileServiceItem[]>(
    () => buildShoppingServiceItems(capabilities.customerServiceDownloadEnabled),
    [capabilities.customerServiceDownloadEnabled],
  );
  const secondaryItems = useMemo<ProfileServiceItem[]>(
    () => buildProfileSecondaryItems(notificationBadgeText),
    [notificationBadgeText],
  );
  const installShortcutItem = useMemo<ProfileServiceItem | null>(
    () => buildInstallShortcutItem(showInstallShortcut, capabilities.customerServiceDownloadEnabled),
    [capabilities.customerServiceDownloadEnabled, showInstallShortcut],
  );

  const trustItems = useMemo<ProfileTrustItem[]>(() => [
    { title: "正品保障", desc: "100% 正品保证", icon: ShieldCheck },
    { title: "本地配送", desc: "快速送达", icon: Truck },
    { title: "安全支付", desc: "资金安全支付", icon: Wallet },
  ], []);

  return (
    <div className="store-page store-page-shell store-profile-page store-bottom-safe text-[var(--theme-text)]">
      <main className="mx-auto grid w-full max-w-screen-xl gap-4 px-[var(--store-page-x)] pb-5 pt-2 sm:px-4 sm:pt-3 md:max-w-5xl md:gap-5 md:px-6 md:pb-8 md:pt-4 lg:max-w-6xl lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-6 xl:max-w-screen-xl xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-8 xl:px-8 xl:pb-12 xl:pt-4">
        <aside className="hidden lg:block">
          <StoreAccountNav className="sticky top-[var(--store-tablet-sticky-top)] xl:top-[var(--store-desktop-sticky-top)]" />
        </aside>

        <div className="store-profile-stack min-w-0 space-y-3 sm:space-y-4 xl:max-w-4xl">
          {!loggedIn ? (
            <ProfileGuestCard
              logoSrc={logoSrc}
              siteName={siteName}
              onLogin={() => navigate("/login", { state: { from: "/profile" } })}
            />
          ) : (
            <>
              <ProfileHeroCard
                logoSrc={logoSrc}
                avatar={avatar}
                userName={userName}
                memberLevelName={memberLevelName}
                progress={memberProgress}
                unreadCount={unreadCount}
                onMessageClick={() => gateNavigate(navigate, "/notifications", true)}
                onMemberLevelClick={() => gateNavigate(navigate, "/member/benefits", true)}
                onProfileClick={() => gateNavigate(navigate, "/settings", true)}
                onViewAllBenefits={() => gateNavigate(navigate, "/member/benefits", true)}
                onAvatarClick={() => avatarInputRef.current?.click()}
              />
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              {ProfileWechatBindSection ? (
                <Suspense fallback={null}>
                  <ProfileWechatBindSection
                    wechatLogin={wechatLogin}
                    onNavigateSettings={() => gateNavigate(navigate, "/settings", true)}
                    cardClass={PROFILE_CARD_CLASS}
                    menuTapClass={PROFILE_MENU_TAP}
                  />
                </Suspense>
              ) : null}
            </>
          )}

          <ProfileOrderPanel
            items={orderActions}
            onViewAll={() => gateNavigate(navigate, "/orders", true)}
            onNavigate={(item) => gateNavigate(navigate, item.path, item.auth)}
          />

          {loggedIn ? (
            <ProfileAssetPanel
              items={assetItems}
              onNavigate={(item) => gateNavigate(navigate, item.path, item.auth)}
            />
          ) : null}

          {inviteEnabled ? (
            <ProfileInviteRewardCard
              loggedIn={loggedIn}
              inviteCount={inviteCount}
              rewardBalance={rewardBalance}
              inviteCode={code}
              inviteCodeVisible={inviteCodeVisible}
              onPrimaryClick={() => loggedIn ? gateNavigate(navigate, "/invite", true) : navigate("/login", { state: { from: "/profile" } })}
              onToggleInviteCode={() => loggedIn ? setInviteCodeVisible((v) => !v) : navigate("/login", { state: { from: "/profile" } })}
              onCopyInviteCode={handleCopyInviteCode}
              onRecordClick={() => gateNavigate(navigate, "/invite", true)}
            />
          ) : null}

          <ProfileServiceGrid
            title="购物服务"
            items={shoppingServiceItems}
            onNavigate={(item) => gateNavigate(navigate, item.path, item.auth)}
          />

          {installShortcutItem ? (
            <ProfileInstallShortcut
              item={installShortcutItem}
              onNavigate={(item) => gateNavigate(navigate, item.path, item.auth)}
            />
          ) : null}

          <ProfileSecondaryLinkPanel
            items={secondaryItems}
            onNavigate={(item) => gateNavigate(navigate, item.path, item.auth)}
          />

          <ProfileTrustStrip items={trustItems} />

          {loggedIn ? <ProfileLogoutButton onClick={() => setLogoutConfirmOpen(true)} /> : null}
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
