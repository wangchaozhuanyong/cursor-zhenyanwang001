import { useState, useEffect, forwardRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BadgePercent, Crown, Gift, Loader2, RefreshCw, Sparkles, Ticket, Truck } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { motion, AnimatePresence } from "framer-motion";
import { useCouponCenterStore } from "@/stores/useCouponCenterStore";
import { useMyCouponsStore } from "@/stores/useMyCouponsStore";
import { useCartStore } from "@/stores/useCartStore";
import type { CouponDisplayCategory, CouponType, UserCoupon } from "@/types/coupon";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { cn } from "@/lib/utils";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { STORE_SESSION_EXPIRED_MESSAGE } from "@/lib/ensureStoreSession";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";
import { useCouponAction, type CouponActionState } from "@/features/coupon/useCouponAction";
import type { CouponClaimStatus } from "@/types/coupon";
import { THEME_BTN_PRICE } from "@/utils/themeVisuals";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";
import ValueVaultCoupon, {
  type ValueVaultKind,
  type ValueVaultStatus,
} from "@/modules/storefront-v2/design/components/ValueVaultCoupon";
import { copyToClipboard } from "@/utils/clipboard";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";

type DisplayStatus = "available" | "claimed" | "pending" | "used" | "expired" | "invalidated";

interface DisplayCoupon {
  id: string;
  title: string;
  amount: string;
  minSpendText: string;
  scopeText: string;
  expire: string;
  status: DisplayStatus;
  code: string;
  orderNo?: string;
  invalidReason?: string;
  issue_activity_id?: string;
  campaign_id?: string;
  claimable?: boolean;
  claim_status?: CouponClaimStatus;
  claim_reason?: string;
  requires_member?: boolean;
  requires_new_user?: boolean;
  requires_login?: boolean;
  source_campaign_id?: string;
  audience_type?: string;
  couponType: CouponType;
  displayCategory?: CouponDisplayCategory | string;
}

function toDisplayCoupon(uc: UserCoupon): DisplayCoupon {
  const displayStatus: DisplayStatus =
    uc.status === "pending" ? "pending"
    : uc.status === "used" ? "used"
    : uc.status === "expired" ? "expired"
    : uc.status === "invalidated" || uc.status === "cancelled" ? "invalidated"
    : uc.claimed_at ? "claimed"
    : "available";

  const d = userCouponToPremiumDisplay(uc);
  return {
    id: uc.id,
    title: d.title,
    amount: d.amount,
    minSpendText: d.minSpendText,
    scopeText: d.scopeText,
    expire: d.expireText,
    status: displayStatus,
    code: d.code,
    orderNo: uc.order_no,
    invalidReason: uc.invalid_reason,
    issue_activity_id: uc.issue_activity_id || uc.coupon?.issue_activity_id,
    campaign_id: uc.campaign_id || uc.coupon?.campaign_id || uc.coupon?.source_campaign_id,
    source_campaign_id: uc.coupon?.source_campaign_id,
    audience_type: uc.audience_type || uc.coupon?.audience_type,
    claimable: uc.claimable ?? uc.coupon?.claimable,
    claim_status: uc.claim_status || uc.coupon?.claim_status,
    claim_reason: uc.claim_reason || uc.coupon?.claim_reason,
    requires_member: uc.requires_member ?? uc.coupon?.requires_member,
    requires_new_user: uc.requires_new_user ?? uc.coupon?.requires_new_user ?? uc.coupon?.new_user_only,
    requires_login: uc.requires_login ?? uc.coupon?.requires_login,
    couponType: uc.coupon?.type || "fixed",
    displayCategory: uc.display_category || uc.coupon?.display_category,
  };
}

type Tab = "all" | "mine" | "pending" | "used" | "expired" | "invalidated";
type PageView = "mine" | "claimCenter";
type CouponCategory = "recommended" | "all" | "new_user" | "member" | "shipping" | "fixed" | "percentage";

const TAB_ITEMS: Array<{ key: Tab; label: string; badge?: boolean }> = [
  { key: "all", label: "全部" },
  { key: "mine", label: "可使用", badge: true },
  { key: "pending", label: "未生效" },
  { key: "used", label: "已使用" },
  { key: "expired", label: "已过期" },
  { key: "invalidated", label: "已失效" },
];

const EMPTY_STATE_COPY: Record<Tab, { title: string; description?: string }> = {
  all: { title: "暂无优惠券", description: "已领取的优惠券会显示在这里" },
  mine: { title: "暂无可使用优惠券", description: "去领券中心看看有没有新券" },
  pending: { title: "暂无未生效优惠券" },
  used: { title: "暂无已使用优惠券" },
  expired: { title: "暂无已过期优惠券" },
  invalidated: { title: "暂无已失效优惠券" },
};

const COUPON_CATEGORY_ITEMS: Array<{ key: CouponCategory; label: string; icon: typeof Ticket }> = [
  { key: "recommended", label: "推荐", icon: Sparkles },
  { key: "all", label: "全部", icon: Ticket },
  { key: "new_user", label: "新人", icon: Gift },
  { key: "member", label: "会员", icon: Crown },
  { key: "shipping", label: "运费", icon: Truck },
  { key: "fixed", label: "满减", icon: Ticket },
  { key: "percentage", label: "折扣", icon: BadgePercent },
];

const COUPON_DISPLAY_CATEGORY_SET = new Set<CouponCategory>([
  "recommended",
  "new_user",
  "member",
  "shipping",
  "fixed",
  "percentage",
]);

const COUPON_ACTION_LABELS: Record<DisplayStatus, string> = {
  available: "立即领取",
  claimed: "使用",
  pending: "未生效",
  used: "已使用",
  expired: "已过期",
  invalidated: "已失效",
};

function filterByTab(coupons: DisplayCoupon[], tab: Tab): DisplayCoupon[] {
  const owned = coupons;
  switch (tab) {
    case "all":
      return owned;
    case "mine":
      return owned.filter((c) => c.status === "claimed");
    case "pending":
      return owned.filter((c) => c.status === "pending");
    case "used":
      return owned.filter((c) => c.status === "used");
    case "expired":
      return owned.filter((c) => c.status === "expired");
    case "invalidated":
      return owned.filter((c) => c.status === "invalidated");
    default:
      return owned;
  }
}

function getCouponCategories(coupon: DisplayCoupon): CouponCategory[] {
  const categories = new Set<CouponCategory>(["all"]);
  const configuredCategory = normalizeDisplayCategory(coupon.displayCategory);
  if (configuredCategory) {
    categories.add(configuredCategory);
    if (coupon.status === "available" || coupon.status === "claimed" || coupon.claimable !== false) categories.add("recommended");
    return Array.from(categories);
  }

  const title = coupon.title || "";
  if (coupon.status === "available" || coupon.status === "claimed" || coupon.claimable !== false) categories.add("recommended");
  if (
    coupon.requires_new_user
    || coupon.claim_status === "new_user_only"
    || coupon.audience_type === "new_user"
    || /新人|新客|首单/.test(title)
  ) categories.add("new_user");
  if (
    coupon.requires_member
    || coupon.audience_type === "member_level"
    || /会员/.test(title)
  ) categories.add("member");
  if (coupon.couponType === "shipping") categories.add("shipping");
  if (coupon.couponType === "percentage") categories.add("percentage");
  if (coupon.couponType === "fixed") categories.add("fixed");
  return Array.from(categories);
}

function normalizeDisplayCategory(value?: string): CouponCategory | "" {
  const normalized = String(value || "").trim() as CouponCategory;
  return COUPON_DISPLAY_CATEGORY_SET.has(normalized) ? normalized : "";
}

function filterByCategory(coupons: DisplayCoupon[], category: CouponCategory): DisplayCoupon[] {
  if (category === "all") return coupons;
  return coupons.filter((coupon) => getCouponCategories(coupon).includes(category));
}

function toValueVaultKind(couponType: CouponType): ValueVaultKind {
  if (couponType === "percentage") return "percentage";
  if (couponType === "shipping") return "shipping";
  return "fixed";
}

function toValueVaultStatus(status: DisplayStatus): ValueVaultStatus {
  if (status === "available") return "claimable";
  if (status === "claimed") return "available";
  if (status === "pending") return "locked";
  if (status === "invalidated") return "invalid";
  return status;
}

function getValueVaultValue(coupon: DisplayCoupon) {
  if (coupon.couponType === "shipping") return undefined;
  return coupon.amount
    .replace(/^RM\s*/i, "")
    .replace(/%$/, "")
    .trim();
}

export default function Coupons() {
  const navigate = useNavigate();
  const { localizedPath, t } = usePublicLocale();
  const location = useLocation() as { state?: { pageView?: PageView } | null };
  const goBack = useGoBack(localizedPath("/profile"));
  const {
    claimableCoupons,
    myUsableCount,
    loading: centerLoading,
    error: centerError,
    loadCenter,
  } = useCouponCenterStore();
  const {
    coupons: myCoupons,
    loading: myLoading,
    error: myError,
    loadCoupons: loadMyCoupons,
  } = useMyCouponsStore();
  const { claim: claimCouponAction, getActionState } = useCouponAction(localizedPath("/coupons"));
  const selectedCartCount = useCartStore((s) => s.getSelectedItems().length);
  const loadCart = useCartStore((s) => s.loadCart);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const [tab, setTab] = useState<Tab>("mine");
  const [category, setCategory] = useState<CouponCategory>("recommended");
  const [pageView, setPageView] = useState<PageView>(() => (isLoggedIn() ? "mine" : "claimCenter"));
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const canViewOwnedCoupons = isAuthenticated;
  const { containerRef: statusTabsRef, setItemRef: setStatusTabRef, scrollToKey: scrollStatusTabToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(tab, TAB_ITEMS.length);

  useEffect(() => {
    void loadCenter();
  }, [loadCenter]);

  useEffect(() => {
    if (!canViewOwnedCoupons || pageView !== "mine") return;
    void loadMyCoupons(tab === "mine" ? "available" : tab);
  }, [canViewOwnedCoupons, loadMyCoupons, pageView, tab]);

  useEffect(() => {
    if (canViewOwnedCoupons) void loadCart();
  }, [canViewOwnedCoupons, loadCart]);

  useEffect(() => {
    if (authHydrated && !canViewOwnedCoupons) {
      setPageView("claimCenter");
    }
  }, [authHydrated, canViewOwnedCoupons]);

  useEffect(() => {
    if (location.state?.pageView === "claimCenter") {
      setPageView("claimCenter");
    }
  }, [location.state?.pageView]);

  const rawCoupons = pageView === "claimCenter" ? claimableCoupons : myCoupons;
  const loading = pageView === "claimCenter" ? centerLoading : myLoading;
  const error = pageView === "claimCenter" ? centerError : myError;
  const coupons = rawCoupons.map((uc) => toDisplayCoupon(uc));
  const available = claimableCoupons.map((uc) => toDisplayCoupon(uc));
  const isSessionExpired = error === STORE_SESSION_EXPIRED_MESSAGE;

  const handleRetry = useCallback(() => {
    if (isSessionExpired) {
      navigate(localizedPath("/login"), {
        state: {
          from: localizedPath("/coupons"),
          fromState: { pageView: pageView === "claimCenter" ? "claimCenter" : "mine" },
        },
        replace: true,
      });
      return;
    }
    if (pageView === "claimCenter") void loadCenter({ force: true });
    else void loadMyCoupons(tab === "mine" ? "available" : tab, { force: true });
  }, [isSessionExpired, loadCenter, loadMyCoupons, localizedPath, navigate, pageView, tab]);
  const usableCount = pageView === "mine" && tab === "mine"
    ? coupons.filter((c) => c.status === "claimed").length
    : myUsableCount;
  const statusFilteredCoupons = pageView === "claimCenter" ? available : filterByTab(coupons, tab);
  const list = filterByCategory(statusFilteredCoupons, category);
  const blockingError = Boolean(error && rawCoupons.length === 0);

  const handleClaim = async (coupon: DisplayCoupon) => {
    if (!canViewOwnedCoupons) {
      navigate(localizedPath("/login"), { state: { from: localizedPath("/coupons"), fromState: { pageView: "claimCenter" } } });
      return;
    }
    setClaimingId(coupon.id);
    try {
      const claimed = await claimCouponAction(coupon, {
        from: localizedPath("/coupons"),
        successMessage: "领取成功，已添加到我的优惠券",
      });
      if (claimed) {
        void loadCenter({ force: true });
        void loadMyCoupons("available", { force: true });
        setPageView("mine");
        setTab("mine");
      }
    } catch {
      // 统一错误提示在 useCouponAction 内处理
    } finally {
      setClaimingId(null);
    }
  };

  const handleUseCoupon = useCallback((coupon: DisplayCoupon) => {
    if (coupon.status !== "claimed") return;
    if (selectedCartCount > 0) {
      navigate(localizedPath(`/checkout?coupon_id=${coupon.id}`));
      return;
    }
    navigate(localizedPath("/cart"), { state: { coupon_id: coupon.id } });
  }, [localizedPath, navigate, selectedCartCount]);

  const headerRightSlot = pageView === "claimCenter" ? (
    canViewOwnedCoupons ? (
      <UnifiedButton
        type="button"
        onClick={() => setPageView("mine")}
        className="touch-target shrink-0 whitespace-nowrap px-1 text-sm font-medium text-[var(--theme-primary)]"
      >
        我的优惠券
      </UnifiedButton>
    ) : (
      <UnifiedButton
        type="button"
        onClick={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/coupons"), fromState: { pageView: "claimCenter" } } })}
        className="touch-target shrink-0 whitespace-nowrap px-1 text-sm font-medium text-[var(--theme-primary)]"
      >
        登录领取
      </UnifiedButton>
    )
  ) : (
    <ClaimCenterButton count={available.length} onClick={() => setPageView("claimCenter")} />
  );

  if (loading && rawCoupons.length === 0) {
    return (
      <StoreAccountLayout title={t("coupon.myCoupons")} onBack={goBack} className="sf-next-page sf-next-coupons-page-shell" mainClassName="sf-next-account-main">
        <section className="store-account-v12-empty-panel store-account-v12-status-panel store-coupons-v12-state" aria-live="polite">
          <span className="store-account-v12-empty-panel__icon" aria-hidden>
            <Loader2 size={28} className="animate-spin" />
          </span>
          <h2>{t("coupon.loading")}</h2>
          <p>正在同步你的可用优惠、已领取优惠券和领券中心。</p>
        </section>
      </StoreAccountLayout>
    );
  }

  return (
    <StoreAccountLayout
      title={pageView === "claimCenter" ? t("coupon.claimCenter") : t("coupon.myCoupons")}
      onBack={pageView === "claimCenter" ? () => setPageView("mine") : goBack}
      rightSlot={headerRightSlot}
      className="sf-next-page sf-next-coupons-page-shell"
      mainClassName="sf-next-account-main"
    >
      <CouponVaultHero
        pageView={pageView}
        canViewOwnedCoupons={canViewOwnedCoupons}
        availableCount={available.length}
        usableCount={usableCount}
        ownedCount={coupons.length}
        selectedCartCount={selectedCartCount}
        onShowMine={() => setPageView("mine")}
        onShowClaimCenter={() => setPageView("claimCenter")}
        onLogin={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/coupons"), fromState: { pageView: "claimCenter" } } })}
        onGoCart={() => navigate(localizedPath("/cart"))}
      />

      <CouponCategoryRail
        coupons={statusFilteredCoupons}
        active={category}
        onChange={setCategory}
      />

      {pageView === "mine" ? (
        <motion.div
          ref={statusTabsRef}
          className="no-scrollbar mt-5 overflow-x-auto scroll-smooth [-webkit-overflow-scrolling:touch]"
          role="tablist"
          aria-label="优惠券状态筛选"
        >
          <div className="flex min-w-max gap-1 rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] p-1 ring-1 ring-[var(--theme-border)]">
            {TAB_ITEMS.map((t) => {
              const count = t.badge ? usableCount : 0;
              return (
                <UnifiedButton
                  key={t.key}
                  ref={(el) => setStatusTabRef(t.key, el)}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => {
                    scrollStatusTabToKey(t.key);
                    setTab(t.key);
                  }}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    tab === t.key
                      ? "bg-[var(--theme-surface)] text-[var(--theme-text-on-surface)] shadow-[var(--theme-shadow)]"
                      : "text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
                  )}
                >
                  {t.label}
                  {t.badge && count > 0 ? (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        tab === t.key
                          ? THEME_BTN_PRICE
                          : "bg-[color-mix(in_srgb,var(--theme-text-muted)_24%,transparent)] text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </UnifiedButton>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      <div className="mt-4 space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
        <AnimatePresence mode="popLayout">
          {blockingError ? (
            <motion.div
              key={`error-${pageView}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="xl:col-span-2"
            >
              <section className="store-account-v12-empty-panel store-coupons-v12-state" role="alert">
                <span className="store-account-v12-empty-panel__icon" aria-hidden>
                  <Ticket size={28} />
                </span>
                <h2>{t("coupon.loadFailed")}</h2>
                <p>{error || "优惠券暂时无法加载，请稍后再试。"}</p>
                <UnifiedButton type="button" onClick={handleRetry} className="store-account-v12-empty-panel__action">
                  <RefreshCw size={17} aria-hidden />
                  {isSessionExpired ? t("coupon.goLogin") : t("common.retry")}
                </UnifiedButton>
              </section>
            </motion.div>
          ) : list.length === 0 ? (
            <motion.div
              key={`empty-${pageView}-${tab}-${category}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="xl:col-span-2"
            >
              {pageView === "claimCenter" ? (
                <section className="store-account-v12-empty-panel store-coupons-v12-state">
                  <span className="store-account-v12-empty-panel__icon" aria-hidden>
                    <Ticket size={28} />
                  </span>
                  <h2>暂无可领取优惠券</h2>
                  <p>新优惠券上线后会出现在这里。</p>
                </section>
              ) : (
                <section className="store-account-v12-empty-panel store-coupons-v12-state">
                  <span className="store-account-v12-empty-panel__icon" aria-hidden>
                    <Ticket size={28} />
                  </span>
                  <h2>{EMPTY_STATE_COPY[tab].title}</h2>
                  <p>{EMPTY_STATE_COPY[tab].description}</p>
                  {tab === "mine" && available.length > 0 ? (
                    <UnifiedButton type="button" onClick={() => setPageView("claimCenter")} className="store-account-v12-empty-panel__action">
                      <Ticket size={17} aria-hidden />
                      去领券中心
                    </UnifiedButton>
                  ) : null}
                </section>
              )}
            </motion.div>
          ) : null}
          {!blockingError && list.map((coupon, i) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              index={i}
              claiming={claimingId === coupon.id}
              actionState={getActionState(coupon)}
              onClaim={() => handleClaim(coupon)}
              onUse={() => handleUseCoupon(coupon)}
            />
          ))}
        </AnimatePresence>
      </div>
    </StoreAccountLayout>
  );
}

function CouponVaultHero({
  pageView,
  canViewOwnedCoupons,
  availableCount,
  usableCount,
  ownedCount,
  selectedCartCount,
  onShowMine,
  onShowClaimCenter,
  onLogin,
  onGoCart,
}: {
  pageView: PageView;
  canViewOwnedCoupons: boolean;
  availableCount: number;
  usableCount: number;
  ownedCount: number;
  selectedCartCount: number;
  onShowMine: () => void;
  onShowClaimCenter: () => void;
  onLogin: () => void;
  onGoCart: () => void;
}) {
  const primaryActionLabel = pageView === "claimCenter"
    ? canViewOwnedCoupons ? "我的优惠券" : "登录领取"
    : "领券中心";
  const primaryAction = pageView === "claimCenter"
    ? canViewOwnedCoupons ? onShowMine : onLogin
    : onShowClaimCenter;

  return (
    <section className="sf-next-coupon-hero sf-next-sheet" aria-label="优惠券概览">
      <div>
        <div className="sf-next-coupon-hero__metrics">
          <CouponHeroMetric icon={<Ticket size={14} aria-hidden />} label="可领取" value={availableCount} />
          <CouponHeroMetric icon={<BadgePercent size={14} aria-hidden />} label="可使用" value={usableCount} />
          <CouponHeroMetric icon={<Gift size={14} aria-hidden />} label={pageView === "mine" ? "我的券" : "购物车"} value={pageView === "mine" ? ownedCount : selectedCartCount} />
        </div>
        <div className="sf-next-coupon-hero__actions">
          <UnifiedButton
            type="button"
            onClick={primaryAction}
            className="sf-next-coupon-hero__action sf-next-coupon-hero__action--primary"
          >
            {primaryActionLabel}
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={onGoCart}
            className="sf-next-coupon-hero__action sf-next-coupon-hero__action--secondary"
          >
            去购物车
          </UnifiedButton>
        </div>
      </div>
    </section>
  );
}

function CouponHeroMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="sf-next-coupon-hero__metric">
      <span className="sf-next-coupon-hero__metric-label">
        {icon}
        {label}
      </span>
      <strong className="sf-next-coupon-hero__metric-value">{value}</strong>
    </div>
  );
}

type CouponCardProps = {
  coupon: DisplayCoupon;
  index: number;
  claiming: boolean;
  actionState: CouponActionState;
  onClaim: () => void;
  onUse: () => void;
};

const CouponCard = forwardRef<HTMLDivElement, CouponCardProps>(function CouponCard(
  { coupon, index, claiming, actionState, onClaim, onUse },
  ref,
) {
  const isDisabled = coupon.status === "used" || coupon.status === "expired" || coupon.status === "pending" || coupon.status === "invalidated";
  const actionLabel = coupon.status === "available" ? actionState.actionLabel : COUPON_ACTION_LABELS[coupon.status];
  const onAction = coupon.status === "available" ? onClaim : coupon.status === "claimed" ? onUse : undefined;
  const actionDisabled = claiming || isDisabled || (coupon.status === "available" && actionState.disabled);
  const unavailableReason = coupon.invalidReason || (coupon.status === "available" && actionState.disabled ? actionState.statusLabel : undefined);

  const copyCode = async (code: string) => {
    const copied = await copyToClipboard(code);
    if (copied) toast.success("优惠码已复制", toastPresetQuickSuccess);
    else toast.error("复制失败，请手动复制");
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 30 }}
      className="relative min-w-0 overflow-hidden rounded-[var(--sf-radius-lg)]"
    >
      <ValueVaultCoupon
        kind={toValueVaultKind(coupon.couponType)}
        status={toValueVaultStatus(coupon.status)}
        title={coupon.title}
        value={getValueVaultValue(coupon)}
        meta={`${coupon.minSpendText}，${coupon.scopeText}`}
        validText={coupon.expire}
        code={coupon.code}
        unavailableReason={unavailableReason}
        actionLabel={actionLabel}
        loading={claiming}
        disabled={actionDisabled}
        onAction={onAction}
        onCopyCode={copyCode}
      />
      {coupon.orderNo ? <p className="sf-next-coupon-footnote">使用订单：{coupon.orderNo}</p> : null}
    </motion.div>
  );
});

function CouponCategoryRail({
  coupons,
  active,
  onChange,
}: {
  coupons: DisplayCoupon[];
  active: CouponCategory;
  onChange: (category: CouponCategory) => void;
}) {
  const { containerRef: categoryRailRef, setItemRef: setCategoryRef, scrollToKey: scrollCategoryToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(active, COUPON_CATEGORY_ITEMS.length);

  return (
    <motion.div
      ref={categoryRailRef}
      className="no-scrollbar mt-4 overflow-x-auto scroll-smooth [-webkit-overflow-scrolling:touch]"
      role="tablist"
      aria-label="优惠分类"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex min-w-max gap-2">
        {COUPON_CATEGORY_ITEMS.map((item) => {
          const Icon = item.icon;
          const count = filterByCategory(coupons, item.key).length;
          const selected = active === item.key;
          return (
            <UnifiedButton
              key={item.key}
              ref={(el) => setCategoryRef(item.key, el)}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                scrollCategoryToKey(item.key);
                onChange(item.key);
              }}
              className={cn(
                "sf-next-coupon-category-pill",
                selected
                  ? "sf-next-coupon-category-pill--active"
                  : "sf-next-coupon-category-pill--idle",
              )}
            >
              <Icon size={15} aria-hidden />
              <span>{item.label}</span>
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums",
                  selected
                    ? "bg-[color-mix(in_srgb,var(--theme-primary-foreground)_22%,transparent)] text-[var(--theme-primary-foreground)]"
                    : "bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-bg))] text-[var(--theme-text-muted-on-surface)]",
                )}
              >
                {count}
              </span>
            </UnifiedButton>
          );
        })}
      </div>
    </motion.div>
  );
}

function ClaimCenterButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <UnifiedButton
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `领券中心，${count} 张可领取` : "领券中心"}
      className={cn(
        "touch-target inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-transparent p-0",
        "transition-transform active:scale-95",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold",
          "pr-3",
          "border-[color-mix(in_srgb,var(--theme-price)_18%,var(--theme-border))]",
          "bg-[color-mix(in_srgb,var(--theme-price)_5%,var(--theme-surface))]",
          "text-[color-mix(in_srgb,var(--theme-price)_62%,var(--theme-text))]",
          "shadow-[0_5px_14px_-12px_color-mix(in_srgb,var(--theme-price)_36%,transparent)]",
        )}
      >
        <Ticket size={14} strokeWidth={2.2} aria-hidden />
        <span>领券中心</span>
      </span>
      {count > 0 ? (
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_82%,var(--theme-text))] px-1 text-[10px] font-bold leading-none text-[var(--theme-price-foreground)] shadow-sm ring-2 ring-[var(--theme-surface)]">
          {count}
        </span>
      ) : null}
    </UnifiedButton>
  );
}
