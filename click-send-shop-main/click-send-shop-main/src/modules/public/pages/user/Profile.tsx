import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import SeoHead from "@/components/SeoHead";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import StoreAccountNav from "@/components/store/StoreAccountNav";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
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
import { formatUnreadBadge } from "@/utils/notificationBadge";
import { THIRD_PARTY_LOGIN_ENABLED } from "@/constants/authLogin";
import { computeUpgradeProgress } from "@/utils/memberBenefitPresentation";
import { scheduleIdleTask } from "@/utils/idleScheduler";
import {
  buildAccountFeaturesByKeys,
  type AccountFeatureContext,
  type AccountFeatureKey,
} from "@/features/account/accountFeatureRegistry";
import { useStoreNavigationGuard } from "@/features/navigation/useStoreNavigationGuard";
import {
  PROFILE_CARD_CLASS,
  PROFILE_MENU_TAP,
  ProfileGuestCard,
  ProfileHeroCard,
  ProfileInviteRewardCard,
  ProfileLogoutButton,
  ProfileOrderPanel,
  ProfileSecondaryLinkPanel,
  ProfileServiceGrid,
  type ProfileAssetItem,
  type ProfileOrderAction,
  type ProfileServiceItem,
} from "./ProfileSections";
import "@/styles/profile-route.css";

const ProfileWechatBindSection = THIRD_PARTY_LOGIN_ENABLED
  ? lazy(() => import("./ProfileWechatBindSection"))
  : null;

let cachedProfileOrderSummary: OrderSummary | null = null;

function formatGrowthValue(value: number) {
  const safeValue = Math.max(0, Math.round(Number(value) || 0));
  return safeValue.toLocaleString("zh-CN");
}

function ProfileAuthLoadingCard() {
  return (
    <section className={`${PROFILE_CARD_CLASS} px-[var(--sf-card-x)] py-[var(--sf-card-y)]`} aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="h-12 w-12 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))]" />
        <span className="grid min-w-0 flex-1 gap-2">
          <span className="h-4 w-28 rounded-full bg-[color-mix(in_srgb,var(--theme-text)_10%,transparent)]" />
          <span className="h-3 w-40 rounded-full bg-[color-mix(in_srgb,var(--theme-text-muted)_12%,transparent)]" />
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-[var(--theme-text-muted)]">正在同步账号状态...</p>
    </section>
  );
}

export default function Profile() {
  const { navigateFeature, navigateStorePath } = useStoreNavigationGuard();
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const loggedIn = authHydrated && isAuthenticated;
  const authPending = !authHydrated;
  const { nickname, avatar, pointsBalance, inviteCode, memberLevel, wechatLogin, loadProfile } = useUserStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);

  const [inviteCount, setInviteCount] = useState(0);
  const [rewardBalance, setRewardBalance] = useState(0);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(() => cachedProfileOrderSummary);
  const [loyaltyConfig, setLoyaltyConfig] = useState<loyaltyService.LoyaltyConfig | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [inviteCodeVisible, setInviteCodeVisible] = useState(false);
  const [activeReturnCount, setActiveReturnCount] = useState(0);
  const [memberBenefitsQueryEnabled, setMemberBenefitsQueryEnabled] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const memberBenefitsQuery = useQuery<MemberBenefitsOverview>({
    queryKey: memberBenefitsService.memberBenefitsQueryKey,
    queryFn: memberBenefitsService.fetchMemberBenefits,
    enabled: memberBenefitsQueryEnabled,
  });
  const memberBenefits = memberBenefitsQuery.data ?? null;

  useEffect(() => {
    if (!authHydrated || !loggedIn || !capabilities.memberLevelEnabled) {
      setMemberBenefitsQueryEnabled(false);
      return;
    }
    setMemberBenefitsQueryEnabled(false);
    return scheduleIdleTask("profile-member-benefits", () => setMemberBenefitsQueryEnabled(true), {
      delayMs: 650,
      timeoutMs: 1800,
      jitterMs: 120,
    });
  }, [authHydrated, capabilities.memberLevelEnabled, loggedIn]);

  useEffect(() => {
    if (!authHydrated) return;
    if (!loggedIn) {
      cachedProfileOrderSummary = null;
      setOrderSummary(null);
      return;
    }
    let cancelled = false;
    const cancelTasks: Array<() => void> = [];

    const scheduleProfileTask = (key: string, task: () => Promise<unknown>, delayMs: number) => {
      const cancel = scheduleIdleTask(`profile-${key}`, () => {
        if (cancelled) return;
        void task().catch(() => {});
      }, {
        delayMs,
        timeoutMs: 1800,
        jitterMs: 160,
      });
      cancelTasks.push(cancel);
    };

    meService.fetchMeSummary().then((summary) => {
      if (cancelled) return;
      setInviteCount(Number(summary?.inviteStats?.directCount || 0));
      setRewardBalance(Number(summary?.rewardBalance?.balance || 0));
      cachedProfileOrderSummary = summary?.orderSummary || null;
      setOrderSummary(cachedProfileOrderSummary);
      setLoyaltyConfig(summary?.loyaltyConfig || null);
      useNotificationStore.setState({ unreadCount: Number(summary?.unreadCount || 0) });
    }).catch(() => {
      if (cancelled) return;
      scheduleProfileTask("profile", () => loadProfile(), 0);
      scheduleProfileTask("coupons", () => loadCoupons(), 220);
      scheduleProfileTask("favorites", () => loadFavorites(), 320);
      scheduleProfileTask("notifications", () => useNotificationStore.getState().fetchUnreadCount(), 420);
      scheduleProfileTask("invite-stats", () => inviteService.fetchInviteStats().then((s) => setInviteCount(s.directCount || 0)), 520);
      scheduleProfileTask("reward-balance", () => rewardService.fetchRewardBalance().then((res) => setRewardBalance(Number(res.balance || 0))), 620);
      scheduleProfileTask("order-summary", () => orderService.fetchOrderSummary().then((res) => {
        cachedProfileOrderSummary = res;
        setOrderSummary(res);
      }), 720);
      scheduleProfileTask("loyalty-config", () => loyaltyService.fetchLoyaltyConfig().then((cfg) => setLoyaltyConfig(cfg)), 820);
    });

    return () => {
      cancelled = true;
      cancelTasks.forEach((cancel) => cancel());
    };
  }, [authHydrated, loadCoupons, loadFavorites, loadProfile, loggedIn]);

  useEffect(() => {
    if (!authHydrated) return;
    if (!loggedIn) {
      setActiveReturnCount(0);
      return;
    }
    let cancelled = false;
    const cancel = scheduleIdleTask("profile-active-returns", () => {
      void returnService.fetchReturnRequests({ page: 1, pageSize: 50 })
        .then((r) => {
          if (!cancelled) setActiveReturnCount(countActiveReturns(r.list || []));
        })
        .catch(() => {
          if (!cancelled) setActiveReturnCount(0);
        });
    }, {
      delayMs: 760,
      timeoutMs: 2200,
      jitterMs: 160,
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }, [authHydrated, loggedIn]);

  const handleLogout = async () => {
    await logout();
    toast.success("已退出登录", toastPresetQuickSuccess);
    navigateStorePath("/login", { from: "/profile" });
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

  const afterSaleCount = Math.max(orderSummary?.after_sale ?? 0, activeReturnCount);

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

  const notificationBadgeText = formatUnreadBadge(unreadCount);

  const accountFeatureCtx = useMemo<AccountFeatureContext>(() => ({
    capabilities,
    loyaltyConfig,
    notificationBadgeText,
    values: {
      points: String(pointsBalance),
      favorites: String(favoriteCount),
      coupons: String(couponCount),
      rewards: `RM ${rewardBalance.toFixed(2)}`,
      wallet: `RM ${rewardBalance.toFixed(2)}`,
    },
    counts: {
      orderPendingPayment: loggedIn ? orderSummary?.pending_payment ?? 0 : 0,
      orderPaid: loggedIn ? orderSummary?.pending_ship ?? 0 : 0,
      orderShipped: loggedIn ? orderSummary?.pending_receive ?? 0 : 0,
      orderPendingReview: loggedIn ? orderSummary?.pending_review ?? 0 : 0,
      orderAfterSale: loggedIn ? orderSummary?.after_sale ?? afterSaleCount : 0,
    },
  }), [
    afterSaleCount,
    capabilities,
    couponCount,
    favoriteCount,
    loggedIn,
    loyaltyConfig,
    notificationBadgeText,
    orderSummary,
    pointsBalance,
    rewardBalance,
  ]);

  const assetItems = useMemo<ProfileAssetItem[]>(
    () => buildAccountFeaturesByKeys(["wallet", "points", "coupons", "favorites"], accountFeatureCtx, "mobile"),
    [accountFeatureCtx],
  );
  const profileStatItems = useMemo<ProfileAssetItem[]>(() => {
    const orderedKeys = ["coupons", "points", "wallet"];
    return orderedKeys
      .map((key) => assetItems.find((item) => item.key === key))
      .filter((item): item is ProfileAssetItem => Boolean(item));
  }, [assetItems]);
  const orderActions = useMemo<ProfileOrderAction[]>(
    () => buildAccountFeaturesByKeys([
      "orderPendingPayment",
      "orderPaid",
      "orderShipped",
      "orderAfterSale",
    ], accountFeatureCtx, "mobile"),
    [accountFeatureCtx],
  );
  const shoppingServiceItems = useMemo<ProfileServiceItem[]>(
    () => buildAccountFeaturesByKeys([
      "editProfile",
      "address",
      "favorites",
      "history",
      "returns",
      "support",
    ], accountFeatureCtx, "mobile"),
    [accountFeatureCtx],
  );
  const hasCouponEntry = shoppingServiceItems.some((item) => item.key === "coupons");
  const secondaryItems = useMemo<ProfileServiceItem[]>(
    () => buildAccountFeaturesByKeys(["help", "feedback", "about", "settings", "notifications"], accountFeatureCtx, "mobile"),
    [accountFeatureCtx],
  );

  const handleFeatureNavigate = (key: string, fallbackPath: string, requireAuth?: boolean) => {
    if (fallbackPath) {
      navigateStorePath(fallbackPath, { requireAuth, from: "/profile" });
      return;
    }
    if (key) navigateFeature(key as AccountFeatureKey);
  };

  return (
    <div className="sf-next-page sf-next-profile-page sf-next-page-shell sf-next-bottom-safe text-[var(--theme-text)]">
      <SeoHead
        title={`我的｜${siteInfo.siteName || "大马通"}`}
        description="查看订单、购物服务、会员权益和账户功能。"
      />
      <main className="sf-next-profile-layout mx-auto grid w-full max-w-screen-xl gap-4 px-[var(--store-page-x)] pb-5 pt-2 sm:px-4 sm:pt-3 md:max-w-5xl md:gap-5 md:px-6 md:pb-8 md:pt-4 lg:max-w-6xl lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-6 xl:max-w-screen-xl xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-8 xl:px-8 xl:pb-12 xl:pt-4">
        <aside className="sf-next-profile-sidebar hidden lg:block">
          <StoreAccountNav className="sticky top-[var(--sf-next-header-tablet-sticky-top)] xl:top-[var(--sf-next-header-desktop-sticky-top)]" />
        </aside>

        <div className="sf-next-profile-stack min-w-0 space-y-3 sm:space-y-4 xl:max-w-4xl">
          {authPending ? (
            <ProfileAuthLoadingCard />
          ) : !loggedIn ? (
            <ProfileGuestCard
              onLogin={() => navigateStorePath("/login", { from: "/profile" })}
              onRegister={() => navigateStorePath("/register", { from: "/profile" })}
            />
          ) : (
            <>
              <ProfileHeroCard
                logoSrc={logoSrc}
                avatar={avatar}
                userName={userName}
                memberLevelName={memberLevelName}
                progress={memberProgress}
                assets={profileStatItems}
                unreadCount={unreadCount}
                onMessageClick={() => navigateStorePath("/notifications", { requireAuth: true, from: "/profile" })}
                onMemberLevelClick={() => handleFeatureNavigate("memberBenefits", "/member/benefits", true)}
                onProfileClick={() => handleFeatureNavigate("settings", "/settings", true)}
                onViewAllBenefits={() => handleFeatureNavigate("memberBenefits", "/member/benefits", true)}
                onAssetNavigate={(item) => handleFeatureNavigate(item.key, item.path, item.auth)}
                onAvatarClick={() => avatarInputRef.current?.click()}
              />
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              {ProfileWechatBindSection ? (
                <Suspense fallback={null}>
                  <ProfileWechatBindSection
                    wechatLogin={wechatLogin}
                    onNavigateSettings={() => handleFeatureNavigate("settings", "/settings", true)}
                    cardClass={PROFILE_CARD_CLASS}
                    menuTapClass={PROFILE_MENU_TAP}
                  />
                </Suspense>
              ) : null}
            </>
          )}

          {!authPending ? <div className="sf-next-profile-dashboard-grid">
            <div className="sf-next-profile-dashboard-main">
              {loggedIn ? (
                <>
                  <ProfileOrderPanel
                    items={orderActions}
                    onViewAll={() => handleFeatureNavigate("orders", "/orders", true)}
                    onNavigate={(item) => handleFeatureNavigate(item.key || "", item.path, item.auth)}
                  />
                </>
              ) : null}

              {loggedIn && inviteEnabled ? (
                <ProfileInviteRewardCard
                  loggedIn={loggedIn}
                  inviteCount={inviteCount}
                  rewardBalance={rewardBalance}
                  inviteCode={code}
                  inviteCodeVisible={inviteCodeVisible}
                  onPrimaryClick={() => loggedIn ? handleFeatureNavigate("invite", "/invite", true) : navigateStorePath("/login", { from: "/profile" })}
                  onToggleInviteCode={() => loggedIn ? setInviteCodeVisible((v) => !v) : navigateStorePath("/login", { from: "/profile" })}
                  onCopyInviteCode={handleCopyInviteCode}
                  onRecordClick={() => handleFeatureNavigate("invite", "/invite", true)}
                />
              ) : null}

              <ProfileServiceGrid
                title="购物服务"
                showTitle={false}
                items={shoppingServiceItems}
                onNavigate={(item) => handleFeatureNavigate(item.key, item.path, item.auth)}
                rightLabel={hasCouponEntry ? "领取礼券" : undefined}
                onRightClick={() => navigateStorePath("/coupons", {
                  requireAuth: true,
                  from: "/profile",
                  state: { pageView: "claimCenter" },
                })}
              />
            </div>

            <aside className="sf-next-profile-dashboard-rail" aria-label="账户状态与更多功能">
              <ProfileSecondaryLinkPanel
                items={secondaryItems}
                onNavigate={(item) => handleFeatureNavigate(item.key, item.path, item.auth)}
                onSupportClick={() => handleFeatureNavigate("support", "/support-download?tab=support", false)}
              />

              {loggedIn ? <ProfileLogoutButton onClick={() => setLogoutConfirmOpen(true)} /> : null}
            </aside>
          </div> : null}
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
