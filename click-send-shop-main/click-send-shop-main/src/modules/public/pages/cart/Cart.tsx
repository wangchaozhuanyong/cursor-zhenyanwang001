import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { BadgePercent, Heart, Minus, Pin, Plus, Share2, Trash2, ShoppingBag, Loader2, Check, LogIn, ShieldCheck, Sparkles, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import StorePageHeader from "@/components/store/StorePageHeader";
import { STORE_MOBILE_PAGE_HEADER_CLASS } from "@/constants/storeLayout";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { cartLineKey, useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import ProductCoverImage from "@/components/ProductCoverImage";
import type { CartItem, CartPromotionPreview } from "@/types/cart";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { SubmitOrderParams } from "@/types/order";
import { isLoggedIn } from "@/utils/token";
import { copyToClipboard } from "@/utils/clipboard";
import TrustInfo from "@/components/TrustInfo";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedNumber, AppModal, BottomSheetConfirm, SquishButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { parseSstEnabled } from "@/utils/sstTax";
import MarketingPositionNotices from "@/modules/public/components/marketing/MarketingPositionNotices";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { DesktopPurchaseCard, DesktopPurchaseTwoColumn } from "@/components/store/DesktopPurchasePattern";
import { usePublicLocale } from "@/i18n/publicLocale";
import CartPromotionNudge from "@/modules/storefront-v2/cart/CartPromotionNudge";
import CouponPicker from "@/components/CouponPicker";
import { useCheckoutPickerCoupons } from "@/hooks/useCheckoutPickerCoupons";
import { estimateCheckoutCouponDiscount } from "@/modules/public/pages/order/utils/checkoutCouponDiscount";
import { fetchCartPromotionPreview } from "@/services/cartService";
import { estimateCartWeightKg } from "@/lib/shippingFee";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";

const CART_ACTION_WIDTH = 244;
const CART_ACTION_REVEAL_THRESHOLD = 64;

export default function Cart() {
  const { localizedPath, t } = usePublicLocale();
  useDocumentTitle(t("common.cart"));
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const capabilities = useSiteCapabilities();
  const {
    items,
    loading,
    error,
    clearError,
    updateQty,
    pinItemToTop,
    removeItem,
    loadCart,
    isSelected,
    toggleSelect,
    setSelectAll,
    totalAmountSelected,
    totalItemsSelected,
    hasLoaded,
  } = useCartStore();
  const selection = useCartStore((s) => s.selection);
  const isFavoriteProduct = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const siteInfo = useSiteInfo();
  const sstCartNote = (siteInfo.sstCustomerNote || "").trim();
  const showSstCartHint = parseSstEnabled(siteInfo.sstEnabled);
  const [deleteTarget, setDeleteTarget] = useState<{ productId: string; variantId?: string; name: string } | null>(null);
  const [openActionKey, setOpenActionKey] = useState<string | null>(null);
  const [quantityTargetKey, setQuantityTargetKey] = useState<string | null>(null);
  const [quantityDraft, setQuantityDraft] = useState("");
  const [cartPreview, setCartPreview] = useState<CartPromotionPreview | null>(null);
  const [cartPreviewLoading, setCartPreviewLoading] = useState(false);
  const [cartPreviewError, setCartPreviewError] = useState<string | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutPickerCoupon | null>(null);
  const [couponSelectionTouched, setCouponSelectionTouched] = useState(false);
  const backgroundSyncStartedRef = useRef(false);

  const selectedCount = items.filter((i) => selection[cartLineKey(i.product.id, i.variant_id)] !== false).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const sortedCartItems = useMemo(() => {
    const available: CartItem[] = [];
    const unavailable: CartItem[] = [];
    items.forEach((item) => {
      if (getCartLineUnavailableReason(item)) unavailable.push(item);
      else available.push(item);
    });
    return [...available, ...unavailable];
  }, [items]);
  const unavailableCount = sortedCartItems.filter((item) => Boolean(getCartLineUnavailableReason(item))).length;
  const selectedQty = totalItemsSelected();
  const selectedAmount = Number(totalAmountSelected() || 0);
  const selectedItems = useMemo(
    () => items.filter((item) => selection[cartLineKey(item.product.id, item.variant_id)] !== false),
    [items, selection],
  );
  const cartPreviewSignature = useMemo(
    () => items.map((item) => `${cartLineKey(item.product.id, item.variant_id)}:${item.qty}`).join("|"),
    [items],
  );
  const couponPreviewParams = useMemo<SubmitOrderParams | null>(() => {
    if (!capabilities.couponEnabled || !isLoggedIn() || selectedItems.length === 0) return null;
    return {
      items: selectedItems.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant_id || undefined,
        sku_code: item.sku_code || undefined,
        qty: item.qty,
      })),
      contact_name: "购物车优惠预览",
      contact_phone: "60000000000",
      address: "MY",
      estimated_weight_kg: estimateCartWeightKg(selectedItems),
      payment_method: "online",
    };
  }, [capabilities.couponEnabled, selectedItems]);
  const {
    coupons: cartCoupons,
    unusableCoupons: cartUnusableCoupons,
    loading: rawCartCouponsLoading,
  } = useCheckoutPickerCoupons(selectedAmount, couponPreviewParams);
  const cartCouponsLoading = capabilities.couponEnabled && Boolean(couponPreviewParams) ? rawCartCouponsLoading : false;
  const usableCartCoupons = useMemo(
    () => cartCoupons.filter((coupon) => isCartCouponUsable(coupon, selectedAmount)),
    [cartCoupons, selectedAmount],
  );
  const bestCartCoupon = useMemo(
    () => usableCartCoupons.reduce<CheckoutPickerCoupon | null>((best, current) => {
      if (!best) return current;
      return getCartCouponDiscount(current, selectedAmount) > getCartCouponDiscount(best, selectedAmount) ? current : best;
    }, null),
    [usableCartCoupons, selectedAmount],
  );
  const selectedCouponDiscount = selectedCoupon ? getCartCouponDiscount(selectedCoupon, selectedAmount) : 0;
  const previewCouponDiscount = Number(cartPreview?.coupon_discount || cartPreview?.order_snapshot?.coupon_discount_amount || 0);
  const previewTotalDiscount = Number(cartPreview?.discount_amount || cartPreview?.order_snapshot?.total_discount_amount || 0);
  const canUseCartPreviewDiscount = allSelected && items.length > 0;
  const previewActivityDiscount = canUseCartPreviewDiscount
    ? Math.max(0, previewTotalDiscount - previewCouponDiscount)
    : 0;
  const estimatedDiscount = Math.min(selectedAmount, Math.max(0, previewActivityDiscount + selectedCouponDiscount));
  const estimatedPayable = Math.max(0, selectedAmount - estimatedDiscount);
  const checkoutLabel =
    selectedQty > 0 ? (
      <>
        {t("cart.checkout")}<span className="ml-0.5 text-[0.85em] font-semibold opacity-90">({selectedQty})</span>
      </>
    ) : (
      t("cart.checkout")
    );
  const quantityTargetItem = quantityTargetKey
    ? items.find((item) => cartLineKey(item.product.id, item.variant_id) === quantityTargetKey) ?? null
    : null;
  const quantityTargetMax = quantityTargetItem ? getCartQuantityMax(quantityTargetItem) : 1;
  const quantityOptions = quantityTargetItem ? buildCartQuantityOptions(quantityTargetItem.qty, quantityTargetMax) : [];
  const headerTitle =
    totalQty > 0 ? (
      <>
        {t("common.cart")}
        <span className="ml-1.5 text-sm font-normal text-[var(--theme-text-muted)]">({totalQty})</span>
      </>
    ) : (
      t("common.cart")
    );

  useEffect(() => {
    void loadCart();
    if (backgroundSyncStartedRef.current || (!hasLoaded && items.length === 0)) return;
    backgroundSyncStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void loadCart({ force: true });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [hasLoaded, items.length, loadCart]);

  useEffect(() => {
    if (!isLoggedIn() || items.length === 0) {
      setCartPreview(null);
      setCartPreviewLoading(false);
      setCartPreviewError(null);
      return;
    }
    let cancelled = false;
    setCartPreviewLoading(true);
    setCartPreviewError(null);
    fetchCartPromotionPreview()
      .then((preview) => {
        if (!cancelled) setCartPreview(preview);
      })
      .catch((err) => {
        if (!cancelled) {
          setCartPreview(null);
          setCartPreviewError(err instanceof Error ? err.message : t("cart.discountPreviewFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setCartPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cartPreviewSignature, items.length, t]);

  useEffect(() => {
    if (selectedQty === 0) {
      setSelectedCoupon(null);
      setCouponSelectionTouched(false);
      return;
    }
    if (!selectedCoupon) return;
    const stillUsable = usableCartCoupons.some((coupon) => coupon.id === selectedCoupon.id);
    if (!stillUsable) {
      setSelectedCoupon(couponSelectionTouched ? null : bestCartCoupon);
    }
  }, [bestCartCoupon, couponSelectionTouched, selectedCoupon, selectedQty, usableCartCoupons]);

  useEffect(() => {
    if (couponSelectionTouched || cartCouponsLoading || selectedQty === 0) return;
    setSelectedCoupon(bestCartCoupon);
  }, [bestCartCoupon, cartCouponsLoading, couponSelectionTouched, selectedQty]);

  const handleCartCouponSelect = (coupon: CheckoutPickerCoupon | null) => {
    setCouponSelectionTouched(true);
    setSelectedCoupon(coupon);
  };

  const handleCheckout = () => {
    if (totalItemsSelected() === 0) {
      toast.error(t("cart.selectItemsFirst"));
      return;
    }
    const couponId = couponSelectionTouched && !selectedCoupon ? "none" : selectedCoupon?.id;
    navigate(couponId ? localizedPath(`/checkout?coupon_id=${couponId}`) : localizedPath("/checkout"), {
      state: { from: currentPath },
    });
  };

  const closeItemActions = () => setOpenActionKey(null);
  const closeQuantitySelector = () => {
    setQuantityTargetKey(null);
    setQuantityDraft("");
  };

  const openQuantitySelector = (item: CartItem) => {
    closeItemActions();
    setQuantityTargetKey(cartLineKey(item.product.id, item.variant_id));
    setQuantityDraft(String(item.qty));
  };

  const getProductShareUrl = (productId: string) => {
    const productPath = localizedPath(`/product/${productId}`);
    if (typeof window === "undefined") return productPath;
    return new URL(productPath, window.location.origin).toString();
  };

  const handlePinToTop = async (item: CartItem) => {
    try {
      await pinItemToTop(item.product.id, item.variant_id);
      closeItemActions();
      toast.success(t("cart.pinned"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("cart.pinFailed"));
    }
  };

  const handleMoveToFavorite = async (item: CartItem) => {
    try {
      if (!isFavoriteProduct(item.product.id)) {
        await toggleFavorite(item.product);
      }
      await removeItem(item.product.id, item.variant_id);
      closeItemActions();
      toast.success(t("cart.movedToFavorites"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("cart.moveToFavoritesFailed"));
    }
  };

  const handleShareProduct = async (item: CartItem) => {
    const url = getProductShareUrl(item.product.id);
    const shareData = {
      title: item.product.name,
      text: item.product.name,
      url,
    };

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        closeItemActions();
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }

    const copied = await copyToClipboard(url);
    closeItemActions();
    toast[copied ? "success" : "error"](copied ? t("cart.linkCopied") : t("cart.shareFailed"));
  };

  const commitQuantitySelection = async (nextQty: number) => {
    if (!quantityTargetItem) return;
    const normalizedQty = Math.floor(nextQty);
    if (!Number.isFinite(normalizedQty) || normalizedQty < 1) {
      toast.error(t("cart.invalidQuantity"));
      return;
    }
    const safeQty = Math.min(normalizedQty, quantityTargetMax);
    if (safeQty !== normalizedQty) {
      toast.error(`${t("cart.maxQuantityToast")} ${quantityTargetMax} ${t("cart.quantityUnit")}`);
      setQuantityDraft(String(safeQty));
      return;
    }
    try {
      await updateQty(quantityTargetItem.product.id, safeQty, quantityTargetItem.variant_id);
      toast.success(`${t("cart.quantityUpdated")} ${safeQty}`);
      closeQuantitySelector();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("cart.updateQuantityFailed"));
    }
  };

  return (
    <div className="sf-next-page sf-next-page-shell sf-next-cart-page bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0 lg:pb-0">
      <StorePageHeader
        className={`${STORE_MOBILE_PAGE_HEADER_CLASS} sf-next-cart-mobile-header sf-next-cart-header`}
        rightSlot={items.length > 0 ? (
          <UnifiedButton
            type="button"
            onClick={() => setSelectAll(!allSelected)}
            aria-label={allSelected ? "取消全选" : t("cart.selectAll")}
            className="sf-next-cart-edit-button"
          >
            <Check size={16} strokeWidth={2.35} aria-hidden />
            <span>{allSelected ? "取消全选" : "全选"}</span>
          </UnifiedButton>
        ) : null}
        title={headerTitle}
      />

      <main className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] md:px-6 md:py-4">
        {/* 桌面端：左商品列表 / 右结算摘要 */}
        {items.length > 0 ? (
          <DesktopPurchaseTwoColumn
            className="xl:grid-cols-[minmax(0,1fr)_360px]"
            aside={
              <DesktopPurchaseCard title={t("cart.summary")} className="sf-next-cart-summary">
                <div className="space-y-2.5 text-sm">
                  <div className="sf-next-cart-summary-discount-callout">
                    <span>{estimatedDiscount > 0 ? t("cart.autoDiscountSaved") : t("cart.autoDiscountTitle")}</span>
                    <strong>{estimatedDiscount > 0 ? `RM ${formatCartMoney(estimatedDiscount)}` : t("cart.discountPending")}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("cart.selectedItems")}</span>
                    <span>
                      {totalItemsSelected()} {t("cart.itemUnit")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{showSstCartHint ? t("cart.subtotalTaxIncluded") : t("cart.subtotal")}</span>
                    <span>RM {formatCartMoney(selectedAmount)}</span>
                  </div>
                  {estimatedDiscount > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("cart.savedAmount")}</span>
                      <span className="font-semibold text-[var(--theme-price)]">-RM {formatCartMoney(estimatedDiscount)}</span>
                    </div>
                  ) : null}
                  {showSstCartHint ? (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {sstCartNote || t("cart.sstIncludedNote")}
                    </p>
                  ) : null}
                  <div className="my-3 border-t border-[var(--theme-border)]" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-foreground">{t("cart.total")}</span>
                    <span className="text-[18px] font-extrabold text-[var(--theme-price)] sm:text-xl">
                      <AnimatedNumber value={estimatedPayable} decimals={2} format={(n) => `RM ${n.toFixed(2)}`} />
                    </span>
                  </div>
                </div>
                <SquishButton
                  type="button"
                  variant="gold"
                  onClick={handleCheckout}
                  disabled={selectedQty === 0}
                  className="mt-5 w-full rounded-full py-3.5 text-sm font-bold transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 !min-h-0"
                >
                  {checkoutLabel}
                </SquishButton>
                <div className="mt-4">
                  <TrustInfo />
                </div>
              </DesktopPurchaseCard>
            }
          >
            <MarketingPositionNotices position="cart_notice" className="mb-3" />
            {!isLoggedIn() && (
              <div className="sf-next-cart-login-strip">
                <span className="sf-next-cart-login-strip__icon" aria-hidden="true">
                  <ShieldCheck size={17} strokeWidth={2.2} />
                </span>
                <p>{t("cart.loginSyncTitle")}</p>
                <UnifiedButton
                  type="button"
                  onClick={() => navigate(localizedPath("/login"), { state: { from: currentPath } })}
                  className="sf-next-cart-login-strip__button"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  {t("common.login")}
                </UnifiedButton>
              </div>
            )}
            {error && (
              <div className={`mb-3 flex flex-col gap-3 rounded-lg px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${THEME_ALERT_ERROR_SOFT}`} role="alert">
                <span className="min-w-0">{error}</span>
                <UnifiedButton
                  onClick={() => {
                    clearError();
                    loadCart({ force: true });
                  }}
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-danger)] focus-visible:ring-offset-2"
                >
                  {t("common.retry")}
                </UnifiedButton>
              </div>
            )}
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground" role="status" aria-live="polite">
                <Loader2 size={24} className="animate-spin mb-3" />
                <p className="text-sm">{t("cart.loading")}</p>
              </div>
            ) : (
              <>
              <div className="sf-next-cart-section-head" aria-label="购物车商品选择">
                <span>购物车商品</span>
                <UnifiedButton
                  type="button"
                  onClick={() => setSelectAll(!allSelected)}
                  className="sf-next-cart-select-all"
                  aria-pressed={allSelected}
                >
                  {allSelected ? "取消全选" : "全选"}
                </UnifiedButton>
              </div>
              <div
                className="sf-next-cart-list"
                style={{ border: 0, borderRadius: 0, background: "transparent", boxShadow: "none" }}
              >
                {/* 桌面：列表头 + 全选 */}
                <div className="hidden items-center justify-between border-b border-[var(--theme-border)] px-1 py-3 md:flex">
                  <SquishButton
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectAll(!allSelected)}
                    className="flex items-center gap-2 rounded-none bg-transparent text-sm text-muted-foreground hover:text-foreground !min-h-0 !px-0 !py-0"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                        allSelected
                          ? "border-[var(--theme-price)] btn-theme-price"
                          : someSelected
                            ? "border-[color-mix(in_srgb,var(--theme-price)_60%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]"
                            : "border-muted-foreground/40"
                      }`}
                    >
                      {allSelected && <Check size={12} strokeWidth={3} />}
                      {!allSelected && someSelected && (
                        <span className="h-2 w-2 rounded-sm bg-[var(--theme-price)]" />
                      )}
                    </span>
                    {t("cart.selectAll")} ({selectedCount}/{items.length})
                  </SquishButton>
                </div>
                <AnimatePresence>
                  {sortedCartItems.map((item, index) => {
                    const lineKey = cartLineKey(item.product.id, item.variant_id);
                    const selected = isSelected(item.product.id, item.variant_id);
                    const actionsOpen = openActionKey === lineKey;
                    const unavailableReason = getCartLineUnavailableReason(item);
                    const isFirstUnavailable = Boolean(unavailableReason) && sortedCartItems
                      .findIndex((entry) => Boolean(getCartLineUnavailableReason(entry))) === index;
                    const isLastItem = index === sortedCartItems.length - 1;

                    return (
                    <Fragment key={lineKey}>
                    {isFirstUnavailable ? (
                      <div className="sf-next-cart-subsection-title">
                        <span>失效商品</span>
                        <small>{unavailableCount} 件</small>
                      </div>
                    ) : null}
                    <motion.div
                      exit={{ opacity: 0, x: -100 }}
                      className="sf-next-cart-item relative flex min-w-0 gap-2.5 py-4 sm:gap-3 md:py-5"
                      data-unavailable={unavailableReason ? "true" : undefined}
                    >
                      <SquishButton
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          closeItemActions();
                          toggleSelect(item.product.id, item.variant_id);
                        }}
                        className="self-center flex h-10 w-7 flex-shrink-0 items-center justify-center rounded-none border-0 bg-transparent shadow-none !p-0"
                        aria-label={selected ? t("cart.unselectForCheckout") : t("cart.selectForCheckout")}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors ${
                            selected
                              ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_12%,var(--theme-surface))] text-[var(--theme-price)]"
                              : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-transparent"
                          }`}
                        >
                          {selected && <Check size={15} strokeWidth={3} />}
                        </span>
                      </SquishButton>
                      <div className="relative min-w-0 flex-1 overflow-hidden">
                        <div
                          className={`absolute inset-y-1 right-0 flex overflow-hidden rounded-r-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_70%,var(--theme-bg))] transition-opacity ${
                            actionsOpen ? "opacity-100" : "opacity-0"
                          }`}
                          style={{ width: CART_ACTION_WIDTH }}
                          aria-hidden={!actionsOpen}
                        >
                          <UnifiedButton
                            type="button"
                            tabIndex={actionsOpen ? 0 : -1}
                            onClick={() => handlePinToTop(item)}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-l border-[var(--theme-border)] px-1 text-[11px] font-semibold text-[var(--theme-text)]"
                          >
                            <Pin size={15} />
                            <span>{t("cart.pin")}</span>
                          </UnifiedButton>
                          <UnifiedButton
                            type="button"
                            tabIndex={actionsOpen ? 0 : -1}
                            onClick={() => handleMoveToFavorite(item)}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-l border-[var(--theme-border)] px-1 text-[11px] font-semibold text-[var(--theme-price)]"
                          >
                            <Heart size={15} />
                            <span>{t("cart.moveToFavorite")}</span>
                          </UnifiedButton>
                          <UnifiedButton
                            type="button"
                            tabIndex={actionsOpen ? 0 : -1}
                            onClick={() => handleShareProduct(item)}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-l border-[var(--theme-border)] px-1 text-[11px] font-semibold text-[var(--theme-primary)]"
                          >
                            <Share2 size={15} />
                            <span>{t("cart.share")}</span>
                          </UnifiedButton>
                          <UnifiedButton
                            type="button"
                            tabIndex={actionsOpen ? 0 : -1}
                            onClick={() => {
                              closeItemActions();
                              setDeleteTarget({
                                productId: item.product.id,
                                variantId: item.variant_id,
                                name: item.product.name,
                              });
                            }}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-l border-[var(--theme-danger)]/20 bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))] px-1 text-[11px] font-semibold text-[var(--theme-danger)]"
                          >
                            <Trash2 size={15} />
                            <span>{t("cart.delete")}</span>
                          </UnifiedButton>
                        </div>
                        <motion.div
                          drag="x"
                          dragConstraints={{ left: -CART_ACTION_WIDTH, right: 0 }}
                          dragDirectionLock
                          dragElastic={0.04}
                          onDragStart={() => setOpenActionKey(lineKey)}
                          onDragEnd={(_, info) => {
                            const shouldOpen = info.offset.x < -CART_ACTION_REVEAL_THRESHOLD || info.velocity.x < -420;
                            const shouldClose = info.offset.x > CART_ACTION_REVEAL_THRESHOLD || info.velocity.x > 420;
                            setOpenActionKey(shouldClose ? null : shouldOpen ? lineKey : actionsOpen ? lineKey : null);
                          }}
                          animate={{ x: actionsOpen ? -CART_ACTION_WIDTH : 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                          className="sf-next-cart-item-row relative z-10 flex min-w-0 gap-2.5 bg-transparent py-0.5 sm:gap-3"
                        >
                          <UnifiedButton
                            type="button"
                            onClick={() => {
                              closeItemActions();
                              navigate(localizedPath(`/product/${item.product.id}`), { state: { from: currentPath } });
                            }}
                            className="sf-next-cart-media sf-next-cart-item-media w-14 flex-shrink-0 self-start cursor-pointer overflow-hidden rounded-xl border-0 bg-transparent p-0 sm:w-16 md:w-16 lg:w-20"
                            style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
                            aria-label={`${t("common.browseProducts")} ${item.product.name}`}
                          >
                            <ProductCoverImage
                              url={item.product.cover_image}
                              alt={item.product.name}
                              className="h-full w-full"
                              imgClassName="h-full w-full rounded-xl object-cover"
                              loading={index === 0 ? "eager" : "lazy"}
                              fetchPriority={index === 0 ? "high" : "low"}
                            />
                          </UnifiedButton>
                          <div className="sf-next-cart-item-content flex min-w-0 flex-1 flex-col justify-between">
                            <div className="sf-next-cart-item-copy min-w-0">
                              <h3
                                onClick={() => {
                                  closeItemActions();
                                  navigate(localizedPath(`/product/${item.product.id}`), { state: { from: currentPath } });
                                }}
                                className="sf-next-cart-item-title cursor-pointer break-words leading-tight text-foreground line-clamp-2 hover:text-theme-price"
                              >
                                {item.product.name}
                              </h3>
                              {item.variant_name ? <p className="sf-next-cart-item-variant mt-1 truncate text-muted-foreground">规格：{item.variant_name}</p> : null}
                              {getCartLineDealLabel(item, t) ? (
                                <span className="sf-next-cart-item-deal-badge">
                                  <BadgePercent size={12} aria-hidden />
                                  {getCartLineDealLabel(item, t)}
                                </span>
                              ) : null}
                              {unavailableReason ? (
                                <p className="sf-next-cart-line-unavailable">{unavailableReason}</p>
                              ) : null}
                            </div>
                            <div className="sf-next-cart-item-bottom mt-2 flex min-w-0 items-center justify-between gap-2">
                              <StorePriceAmount
                                amount={item.product.price}
                                amountClassName="text-[15px] font-extrabold leading-tight sm:text-base"
                              />
                              <div className="sf-next-cart-qty-control flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]">
                                <SquishButton
                                  type="button"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      await updateQty(item.product.id, item.qty - 1, item.variant_id);
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : t("cart.updateQuantityFailed"));
                                    }
                                  }}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] !p-0"
                                  aria-label={t("cart.quantityReduced")}
                                >
                                  <Minus size={14} className="text-foreground" />
                                </SquishButton>
                                <UnifiedButton
                                  type="button"
                                  onClick={() => openQuantitySelector(item)}
                                  className="flex min-w-[34px] items-center justify-center self-stretch px-1 text-center text-sm font-semibold tabular-nums text-foreground"
                                  aria-label={`${t("cart.quantitySelectAria")}, ${t("cart.currentQuantityPrefix")} ${item.qty} ${t("cart.quantityUnit")}`}
                                >
                                  {item.qty}
                                </UnifiedButton>
                                <SquishButton
                                  type="button"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      await updateQty(item.product.id, item.qty + 1, item.variant_id);
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : t("cart.updateQuantityFailed"));
                                    }
                                  }}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] !p-0"
                                  aria-label={t("cart.quantityIncreased")}
                                >
                                  <Plus size={14} className="text-foreground" />
                                </SquishButton>
                              </div>
                            </div>
                            <div className="mt-3 hidden flex-wrap items-center gap-2 md:flex">
                              <UnifiedButton
                                type="button"
                                onClick={() => handlePinToTop(item)}
                                className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-xs font-semibold text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]"
                              >
                                <Pin size={13} />
                                {t("cart.pin")}
                              </UnifiedButton>
                              <UnifiedButton
                                type="button"
                                onClick={() => handleMoveToFavorite(item)}
                                className="inline-flex h-8 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--theme-price)_24%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_6%,var(--theme-surface))] px-3 text-xs font-semibold text-[var(--theme-price)] transition hover:bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]"
                              >
                                <Heart size={13} />
                                {t("cart.moveToFavorite")}
                              </UnifiedButton>
                              <UnifiedButton
                                type="button"
                                onClick={() => handleShareProduct(item)}
                                className="inline-flex h-8 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_24%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] px-3 text-xs font-semibold text-[var(--theme-primary)] transition hover:bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))]"
                              >
                                <Share2 size={13} />
                                {t("cart.share")}
                              </UnifiedButton>
                              <UnifiedButton
                                type="button"
                                onClick={() => {
                                  closeItemActions();
                                  setDeleteTarget({
                                    productId: item.product.id,
                                    variantId: item.variant_id,
                                    name: item.product.name,
                                  });
                                }}
                                className="inline-flex h-8 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--theme-danger)_28%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-danger)_6%,var(--theme-surface))] px-3 text-xs font-semibold text-[var(--theme-danger)] transition hover:bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))]"
                              >
                                <Trash2 size={13} />
                                {t("cart.delete")}
                              </UnifiedButton>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      {!isLastItem && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-0 left-10 right-0 h-px opacity-80"
                          style={{ background: "linear-gradient(90deg, transparent, var(--theme-border), transparent)" }}
                        />
                      )}
                    </motion.div>
                    </Fragment>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="sf-next-cart-discount-section">
                <h2>优惠</h2>
                <CartDiscountPanel
                  selectedAmount={selectedAmount}
                  estimatedDiscount={estimatedDiscount}
                  estimatedPayable={estimatedPayable}
                  activityDiscount={previewActivityDiscount}
                  selectedCoupon={selectedCoupon}
                  selectedCouponDiscount={selectedCouponDiscount}
                  coupons={cartCoupons}
                  unusableCoupons={cartUnusableCoupons}
                  couponsLoading={cartCouponsLoading}
                  previewLoading={cartPreviewLoading}
                  previewError={cartPreviewError}
                  canUseCartPreviewDiscount={canUseCartPreviewDiscount}
                  promotionEvaluation={cartPreview?.promotion_evaluation ?? null}
                  onCouponSelect={handleCartCouponSelect}
                  onBrowse={() => navigate(localizedPath("/categories"))}
                  t={t}
                />
              </div>
              </>
            )}
          </DesktopPurchaseTwoColumn>
        ) : (
          <div className="mx-auto max-w-2xl">
            <MarketingPositionNotices position="cart_notice" className="mb-3" />
            {loading ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground" role="status" aria-live="polite">
                <Loader2 size={24} className="animate-spin mb-3" />
                <p className="text-sm">{t("cart.loading")}</p>
              </div>
            ) : (
              <section className="sf-next-state-panel sf-next-cart-state max-w-none">
                <span className="sf-next-state-panel__icon" aria-hidden>
                  <ShoppingBag size={28} />
                </span>
                <h2>{t("cart.emptyTitle")}</h2>
                <p>{t("cart.emptyDescription")}</p>
                <UnifiedButton
                  type="button"
                  onClick={() => navigate(localizedPath("/categories"))}
                  className="sf-next-state-panel__primary"
                >
                  <ShoppingBag size={17} aria-hidden />
                  {t("cart.browseCategories")}
                </UnifiedButton>
              </section>
            )}
          </div>
        )}
      </main>
      {/* 移动端：结算操作块保持在内容流内，避免遮挡优惠券和商品信息。 */}
      {items.length > 0 && (
        <div className="sf-next-cart-checkout-bar md:hidden">
          <div className="sf-next-cart-checkout-bar__inner">
            <SquishButton
              type="button"
              variant="ghost"
              onClick={() => setSelectAll(!allSelected)}
              aria-pressed={allSelected}
              className="sf-next-cart-checkout-select flex shrink-0 items-center justify-center gap-1.5 rounded-none bg-transparent text-xs font-semibold text-[var(--theme-text-muted)] !min-h-0 !px-0 !py-0"
            >
              <span
                className={`sf-next-cart-checkout-select__box flex items-center justify-center rounded border-2 ${
                  allSelected
                    ? "border-[var(--theme-price)] btn-theme-price"
                    : someSelected
                      ? "border-[color-mix(in_srgb,var(--theme-price)_60%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]"
                      : "border-muted-foreground/40"
                }`}
              >
                {allSelected && <Check size={12} strokeWidth={3} />}
                {!allSelected && someSelected && <span className="h-2 w-2 rounded-sm bg-[var(--theme-price)]" />}
              </span>
              {t("cart.selectAll")}
            </SquishButton>
            <div className="sf-next-cart-checkout-total min-w-0 flex-1" aria-live="polite">
              <span className="sf-next-cart-checkout-total__label">{estimatedDiscount > 0 ? t("cart.estimatedPayable") : t("cart.total")}</span>
              <span className="sf-next-cart-checkout-total__price">
                <AnimatedNumber value={estimatedPayable} decimals={2} format={(n) => `RM ${n.toFixed(2)}`} />
              </span>
              {estimatedDiscount > 0 ? (
                <span className="sf-next-cart-checkout-total__discount">
                  {t("cart.savedAmount")} RM {formatCartMoney(estimatedDiscount)}
                </span>
              ) : null}
            </div>
            <SquishButton
              type="button"
              variant="gold"
              onClick={handleCheckout}
              disabled={selectedQty === 0}
              className="sf-next-cart-checkout-button shrink-0 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 !min-h-0"
            >
              {checkoutLabel}
            </SquishButton>
          </div>
        </div>
      )}

      <BottomSheetConfirm
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("cart.removeConfirmTitle")}
        description={
          deleteTarget
            ? `${t("cart.removeConfirmPrefix")}「${deleteTarget.name}」${t("cart.removeConfirmSuffix")}`
            : undefined
        }
        confirmText={t("cart.delete")}
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          await removeItem(deleteTarget.productId, deleteTarget.variantId);
          toast.success(t("cart.removed"), { duration: 2000 });
        }}
      />
      <AppModal
        tier="standard"
        open={Boolean(quantityTargetItem)}
        onClose={closeQuantitySelector}
        title={t("cart.quantityTitle")}
        height="auto"
        stickyFooter
        showHandle={false}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <UnifiedButton
              type="button"
              onClick={closeQuantitySelector}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-sm font-semibold text-[var(--theme-text)]"
            >
              <X size={16} aria-hidden />
              {t("common.cancel")}
            </UnifiedButton>
            <SquishButton
              type="button"
              variant="gold"
              onClick={() => {
                const parsed = Number.parseInt(quantityDraft.replace(/[^\d]/g, ""), 10);
                void commitQuantitySelection(parsed);
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
            >
              <Check size={16} aria-hidden />
              {t("common.confirm")}
            </SquishButton>
          </div>
        }
      >
        {quantityTargetItem ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-3">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--theme-text)]">
                {quantityTargetItem.product.name}
              </p>
              <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                {t("cart.currentQuantityPrefix")} {quantityTargetItem.qty} {t("cart.quantityUnit")} ·{" "}
                {t("cart.maxQuantityPrefix")} {quantityTargetMax} {t("cart.quantityUnit")}
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {quantityOptions.map((option) => (
                <UnifiedButton
                  key={option}
                  type="button"
                  aria-pressed={Number(quantityDraft) === option}
                  onClick={() => void commitQuantitySelection(option)}
                  className={`min-h-11 rounded-2xl border text-sm font-semibold tabular-nums ${
                    Number(quantityDraft) === option
                      ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_12%,var(--theme-surface))] text-[var(--theme-price)]"
                      : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
                  }`}
                >
                  {option}
                </UnifiedButton>
              ))}
            </div>
            <label className="block text-sm font-semibold text-[var(--theme-text)]">
              {t("cart.customQuantity")}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantityDraft}
                onChange={(event) => setQuantityDraft(event.target.value.replace(/[^\d]/g, ""))}
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-center text-base font-semibold tabular-nums text-[var(--theme-text)] outline-none focus:border-[var(--theme-price)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-price)_18%,transparent)]"
                aria-label={t("cart.customQuantityAria")}
              />
            </label>
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}

function getCartQuantityMax(item: CartItem) {
  const variantStock = item.variant_id
    ? item.product.variants?.find((variant) => variant.id === item.variant_id)?.stock
    : undefined;
  const rawStock = Number(variantStock ?? item.product.stock ?? item.qty);
  const stock = Number.isFinite(rawStock) ? rawStock : item.qty;
  return Math.max(1, Math.min(999, Math.max(item.qty, Math.floor(stock))));
}

function buildCartQuantityOptions(currentQty: number, maxQty: number) {
  const baseOptions = [1, 2, 3, 4, 5, 6, 8, 10, 12, currentQty - 1, currentQty, currentQty + 1];
  const unique = Array.from(new Set(baseOptions.filter((qty) => qty >= 1 && qty <= maxQty)));
  return unique.sort((a, b) => a - b).slice(0, 10);
}

function formatCartMoney(value: number) {
  const n = Number(value || 0);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

function isCartCouponUsable(coupon: CheckoutPickerCoupon, amount: number) {
  return coupon.usable !== false && amount >= coupon.condition && coupon.discountType !== "shipping";
}

function getCartCouponDiscount(coupon: CheckoutPickerCoupon, amount: number) {
  return estimateCheckoutCouponDiscount(coupon, amount, 0);
}

function getCartLineDealLabel(item: CartItem, t: (key: string) => string) {
  const activity = item.product.active_activity;
  if (activity?.type === "flash_sale") return t("cart.lineDealFlashSale");
  if (activity?.type === "limited_time_discount") return t("cart.lineDealLimitedTime");
  if (activity?.type === "member_price") return t("cart.lineDealMemberPrice");
  if (activity?.type === "full_reduction") return t("cart.lineDealFullReduction");
  if (activity?.type === "full_discount") return t("cart.lineDealFullDiscount");
  if (activity) return t("cart.lineDealPromotion");
  return item.product.activity_promo_label || null;
}

function getCartLineUnavailableReason(item: CartItem) {
  const variant = item.variant_id
    ? item.product.variants?.find((entry) => entry.id === item.variant_id)
    : undefined;
  const stock = Number(variant?.stock ?? item.product.stock ?? 0);
  const lineStatus = String(item.line_status || "").toLowerCase();
  if (lineStatus && !["normal", "valid", "available"].includes(lineStatus)) {
    if (lineStatus.includes("stock")) return "库存不足";
    if (lineStatus.includes("off") || lineStatus.includes("inactive")) return "已下架商品";
    return "当前不可结算";
  }
  if (variant?.enabled === false) return "规格已停用";
  if (item.product.lifecycle_status === 2 || item.product.status === "inactive") return "已下架商品";
  if (Number.isFinite(stock) && stock <= 0) return "库存不足";
  return null;
}

function CartDiscountPanel({
  selectedAmount,
  estimatedDiscount,
  estimatedPayable,
  activityDiscount,
  selectedCoupon,
  selectedCouponDiscount,
  coupons,
  unusableCoupons,
  couponsLoading,
  previewLoading,
  previewError,
  canUseCartPreviewDiscount,
  promotionEvaluation,
  onCouponSelect,
  onBrowse,
  t,
}: {
  selectedAmount: number;
  estimatedDiscount: number;
  estimatedPayable: number;
  activityDiscount: number;
  selectedCoupon: CheckoutPickerCoupon | null;
  selectedCouponDiscount: number;
  coupons: CheckoutPickerCoupon[];
  unusableCoupons: CheckoutPickerCoupon[];
  couponsLoading: boolean;
  previewLoading: boolean;
  previewError: string | null;
  canUseCartPreviewDiscount: boolean;
  promotionEvaluation: CartPromotionPreview["promotion_evaluation"] | null;
  onCouponSelect: (coupon: CheckoutPickerCoupon | null) => void;
  onBrowse: () => void;
  t: (key: string) => string;
}) {
  const loading = couponsLoading || previewLoading;
  const hasDiscount = estimatedDiscount > 0;
  const selectedCouponLabel = selectedCoupon
    ? `${t("cart.selectedCoupon")}：${selectedCoupon.title}`
    : couponsLoading
      ? t("cart.couponLoading")
      : coupons.length > 0
        ? t("cart.autoCouponReady")
        : t("cart.noCouponMatched");

  return (
    <section className="sf-next-cart-discount-panel" aria-label={t("cart.discountDetails")}>
      <div className="sf-next-cart-discount-panel__head">
        <span className="sf-next-cart-discount-panel__icon" aria-hidden>
          <Sparkles size={17} />
        </span>
        <div className="sf-next-cart-discount-panel__copy">
          <p>{t("cart.autoDiscountTitle")}</p>
          <strong>
            {loading && !hasDiscount
              ? t("cart.autoDiscountChecking")
              : hasDiscount
                ? `${t("cart.autoDiscountSaved")} RM ${formatCartMoney(estimatedDiscount)}`
                : t("cart.autoDiscountNone")}
          </strong>
          <small>{selectedCouponLabel}</small>
        </div>
        <div className="sf-next-cart-discount-panel__total">
          <small>{t("cart.estimatedPayable")}</small>
          <b>RM {formatCartMoney(estimatedPayable)}</b>
        </div>
      </div>

      <div className="sf-next-cart-discount-panel__rows">
        {activityDiscount > 0 ? (
          <div>
            <span>{t("cart.activityDiscount")}</span>
            <strong>-RM {formatCartMoney(activityDiscount)}</strong>
          </div>
        ) : null}
        {selectedCouponDiscount > 0 ? (
          <div>
            <span>{t("cart.couponDiscount")}</span>
            <strong>-RM {formatCartMoney(selectedCouponDiscount)}</strong>
          </div>
        ) : null}
        {!canUseCartPreviewDiscount ? (
          <p>{t("cart.selectedSubsetDiscountNote")}</p>
        ) : previewError ? (
          <p>{previewError}</p>
        ) : (
          <p>{t("cart.discountEstimateNote")}</p>
        )}
      </div>

      <CouponPicker
        embedded
        totalAmount={selectedAmount}
        selectedCouponId={selectedCoupon?.id ?? null}
        onSelect={onCouponSelect}
        coupons={coupons}
        unusableCoupons={unusableCoupons}
        loading={couponsLoading}
      />

      {canUseCartPreviewDiscount && promotionEvaluation ? (
        <CartPromotionNudge
          campaign={null}
          amount={selectedAmount}
          evaluation={promotionEvaluation}
          className="sf-next-cart-discount-panel__nudge"
          onBrowse={onBrowse}
        />
      ) : null}
    </section>
  );
}
