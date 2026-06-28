import { useState, useEffect, forwardRef, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BadgePercent, Crown, Gift, Loader2, RefreshCw, ShoppingBag, Sparkles, Ticket, Truck } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { motion } from "framer-motion";
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
  const autoSwitchedToClaimCenterRef = useRef(false);
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

  useEffect(() => {
    if (autoSwitchedToClaimCenterRef.current) return;
    if (!canViewOwnedCoupons || pageView !== "mine") return;
    if (myLoading || centerLoading) return;
    if (myCoupons.length > 0 || claimableCoupons.length === 0) return;
    autoSwitchedToClaimCenterRef.current = true;
    setPageView("claimCenter");
  }, [canViewOwnedCoupons, centerLoading, claimableCoupons.length, myCoupons.length, myLoading, pageView]);

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
  const visibleStatusTabs = pageView === "mine"
    ? TAB_ITEMS.filter((item) => item.key === "mine" || item.key === "used" || item.key === "expired" || filterByTab(coupons, item.key).length > 0)
    : TAB_ITEMS;

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

  if (loading && rawCoupons.length === 0) {
    return (
      <StoreAccountLayout title="优惠券" onBack={goBack} className="sf-next-page sf-next-coupons-page-shell" mainClassName="sf-next-account-main">
        <section className="sf-next-state-panel sf-next-coupon-state" aria-live="polite">
          <span className="sf-next-state-panel__icon" aria-hidden>
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
      title="优惠券"
      onBack={pageView === "claimCenter" ? () => setPageView("mine") : goBack}
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

      {pageView === "mine" ? (
        <motion.div
          ref={statusTabsRef}
          className="sf-next-coupon-status-rail no-scrollbar"
          role="tablist"
          aria-label="优惠券状态筛选"
        >
          <div className="sf-next-coupon-status-rail__inner">
            {visibleStatusTabs.map((t) => {
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
                    "sf-next-coupon-status-tab",
                    tab === t.key
                      ? "sf-next-coupon-status-tab--active"
                      : "sf-next-coupon-status-tab--idle",
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

      <CouponCategoryRail
        coupons={statusFilteredCoupons}
        active={category}
        onChange={setCategory}
      />

      <div className="mt-4 space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
          {blockingError ? (
            <motion.div
              key={`error-${pageView}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="xl:col-span-2"
            >
              <section className="sf-next-state-panel sf-next-coupon-state is-error" role="alert">
                <span className="sf-next-state-panel__icon" aria-hidden>
                  <Ticket size={28} />
                </span>
                <h2>{t("coupon.loadFailed")}</h2>
                <p>{error || "优惠券暂时无法加载，请稍后再试。"}</p>
                <UnifiedButton type="button" onClick={handleRetry} className="sf-next-state-panel__primary">
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
              <CouponEmptyState
                pageView={pageView}
                tab={tab}
                availableCount={available.length}
                ownedCount={coupons.length}
                selectedCartCount={selectedCartCount}
                onShowClaimCenter={() => setPageView("claimCenter")}
                onGoCart={() => navigate(localizedPath("/cart"))}
              />
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
      </div>
    </StoreAccountLayout>
  );
}

function CouponEmptyState({
  pageView,
  tab,
  availableCount,
  ownedCount,
  selectedCartCount,
  onShowClaimCenter,
  onGoCart,
}: {
  pageView: PageView;
  tab: Tab;
  availableCount: number;
  ownedCount: number;
  selectedCartCount: number;
  onShowClaimCenter: () => void;
  onGoCart: () => void;
}) {
  const isClaimCenter = pageView === "claimCenter";
  const title = isClaimCenter ? "暂无可领取优惠券" : EMPTY_STATE_COPY[tab].title;
  const description = isClaimCenter
    ? "新优惠券上线后会出现在这里。"
    : EMPTY_STATE_COPY[tab].description || "当前筛选下没有匹配的优惠券。";
  const shouldShowClaimAction = !isClaimCenter && tab === "mine" && availableCount > 0;
  const shouldShowCartAction = selectedCartCount > 0;

  return (
    <section className="sf-next-coupon-empty" aria-label={title}>
      <div className="sf-next-coupon-empty__pass" aria-hidden>
        <div>
          <span className="sf-next-coupon-empty__pass-label">优惠钱包</span>
          <strong>{isClaimCenter ? availableCount : ownedCount}</strong>
        </div>
        <Ticket size={34} />
      </div>

      <div className="sf-next-coupon-empty__content">
        <span className="sf-next-coupon-empty__icon" aria-hidden>
          <Ticket size={28} />
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="sf-next-coupon-empty__stats" aria-label="优惠券状态">
        <span>
          <strong>{availableCount}</strong>
          <em>可领取</em>
        </span>
        <span>
          <strong>{ownedCount}</strong>
          <em>已领取</em>
        </span>
        <span>
          <strong>{selectedCartCount}</strong>
          <em>购物车</em>
        </span>
      </div>

      {shouldShowClaimAction || shouldShowCartAction ? (
        <div className="sf-next-coupon-empty__actions">
          {shouldShowClaimAction ? (
            <UnifiedButton type="button" onClick={onShowClaimCenter} className="sf-next-coupon-empty__primary">
              <Ticket size={17} aria-hidden />
              去领券中心
            </UnifiedButton>
          ) : null}
          {shouldShowCartAction ? (
            <UnifiedButton type="button" onClick={onGoCart} className="sf-next-coupon-empty__secondary">
              <ShoppingBag size={17} aria-hidden />
              去购物车
            </UnifiedButton>
          ) : null}
        </div>
      ) : null}
    </section>
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
  const walletCount = pageView === "mine" ? usableCount : availableCount;
  const walletUnit = pageView === "mine" ? "张可用" : "张可领";
  const sideLabel = pageView === "mine" ? `领券中心 ${availableCount}` : canViewOwnedCoupons ? `已领取 ${ownedCount}` : "登录后领取";

  return (
    <>
      <section className="sf-next-coupon-hero sf-next-sheet" aria-label="优惠券概览">
        <div className="sf-next-coupon-hero__summary">
          <span className="sf-next-coupon-hero__eyebrow">优惠钱包</span>
          <strong className="sf-next-coupon-hero__value">
            {walletCount} <span>{walletUnit}</span>
          </strong>
        </div>
        <div className="sf-next-coupon-hero__aside">
          <span>{sideLabel}</span>
          {selectedCartCount > 0 ? (
            <UnifiedButton type="button" onClick={onGoCart} className="sf-next-coupon-hero__cart">
              去购物车
            </UnifiedButton>
          ) : null}
        </div>
      </section>
      <div className="sf-next-coupon-view-switch" role="tablist" aria-label="优惠券页面切换">
        <UnifiedButton
          type="button"
          role="tab"
          aria-selected={pageView === "mine"}
          onClick={canViewOwnedCoupons ? onShowMine : onLogin}
          className={cn("sf-next-coupon-view-switch__item", pageView === "mine" && "is-active")}
        >
          我的优惠券
        </UnifiedButton>
        <UnifiedButton
          type="button"
          role="tab"
          aria-selected={pageView === "claimCenter"}
          onClick={onShowClaimCenter}
          className={cn("sf-next-coupon-view-switch__item", pageView === "claimCenter" && "is-active")}
        >
          领券中心
        </UnifiedButton>
      </div>
    </>
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
        meta={(
          <span className="sf-next-value-vault__meta-lines">
            <span>{coupon.minSpendText}</span>
            <span>{coupon.scopeText}</span>
          </span>
        )}
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
      className="sf-next-coupon-category-rail no-scrollbar mt-4 scroll-smooth"
      role="tablist"
      aria-label="优惠分类"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="sf-next-coupon-category-rail__inner">
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
