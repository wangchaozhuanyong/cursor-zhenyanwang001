import { useEffect, useState } from "react";
import { BadgePercent, Calculator, Heart, Minus, PackageCheck, Pin, Plus, Share2, Trash2, ShoppingBag, Loader2, Check, LogIn, ShieldCheck, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import StorePageHeader from "@/components/store/StorePageHeader";
import { STORE_MOBILE_PAGE_HEADER_CLASS } from "@/constants/storeLayout";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { cartLineKey, useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import ProductCoverImage from "@/components/ProductCoverImage";
import type { CartItem } from "@/types/cart";
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
import CartPromotionNudge from "@/modules/storefront-v2/cart/CartPromotionNudge";
import { fetchPrimaryFullReductionCampaign } from "@/modules/storefront-v2/campaign/campaignService";
import type { StorefrontCampaignVm } from "@/modules/storefront-v2/campaign/campaignTypes";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";
import { fetchCartPromotionPreview } from "@/services/cartService";
import type { PromotionEvaluation } from "@/types/orderPreview";
import { usePublicLocale } from "@/i18n/publicLocale";

const CART_ACTION_WIDTH = 244;
const CART_ACTION_REVEAL_THRESHOLD = 64;

export default function Cart() {
  const { localizedPath, t } = usePublicLocale();
  useDocumentTitle(t("common.cart"));
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
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
  const [fullReductionCampaign, setFullReductionCampaign] = useState<StorefrontCampaignVm | null>(null);
  const [promotionEvaluation, setPromotionEvaluation] = useState<PromotionEvaluation | null>(null);

  const selectedCount = items.filter((i) => selection[cartLineKey(i.product.id, i.variant_id)] !== false).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const selectedQty = totalItemsSelected();
  const checkoutLabel =
    selectedQty > 0 ? (
      <>
        {t("cart.checkout")}<span className="ml-0.5 text-[0.85em] font-semibold opacity-90">({selectedQty})</span>
      </>
    ) : (
      t("cart.checkout")
    );
  const isEmptyCart = !loading && items.length === 0;
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
    loadCart({ force: true });
  }, [loadCart]);

  const cartPreviewKey = items.map((item) => `${item.product.id}:${item.variant_id || ""}:${item.qty}`).join("|");

  useEffect(() => {
    let cancelled = false;
    fetchPrimaryFullReductionCampaign()
      .then((campaign) => {
        if (!cancelled) setFullReductionCampaign(campaign);
      })
      .catch(() => {
        if (!cancelled) setFullReductionCampaign(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn() || !items.length) {
      setPromotionEvaluation(null);
      return;
    }
    let cancelled = false;
    fetchCartPromotionPreview()
      .then((preview) => {
        if (!cancelled) setPromotionEvaluation(preview.promotion_evaluation || null);
      })
      .catch(() => {
        if (!cancelled) setPromotionEvaluation(null);
      });

    return () => {
      cancelled = true;
    };
  }, [cartPreviewKey, items.length]);

  const effectivePromotionEvaluation = allSelected ? promotionEvaluation : null;

  const handleCheckout = () => {
    if (totalItemsSelected() === 0) {
      toast.error(t("cart.selectItemsFirst"));
      return;
    }
    const couponId = (location.state as { coupon_id?: string } | null)?.coupon_id;
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
    <div className="store-page-shell store-v12-page store-cart-v12-page store-cart-page store-bottom-cart-space bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0 lg:pb-0">
      <StorePageHeader
        className={`${STORE_MOBILE_PAGE_HEADER_CLASS} store-cart-mobile-header`}
        matchTabHeaderHeight
        centerTitle
        title={headerTitle}
        rightSlot={
          !isEmptyCart && items.length > 0 ? (
            <UnifiedButton
              type="button"
              onClick={() => setSelectAll(!allSelected)}
              className="inline-flex min-h-9 items-center rounded-full px-2 text-xs font-semibold text-[var(--theme-primary)]"
            >
              {allSelected ? t("cart.cancelSelectAll") : t("cart.selectAll")}
            </UnifiedButton>
          ) : null
        }
      />

      <main className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] md:px-6 md:py-4">
        <CartV12Overview
          loading={loading}
          itemCount={items.length}
          selectedLineCount={selectedCount}
          selectedQty={selectedQty}
          selectedAmount={Number(totalAmountSelected() || 0)}
          allSelected={allSelected}
          promotionReady={Boolean(effectivePromotionEvaluation)}
          onPromotions={() => navigate(localizedPath("/promotions"))}
          onCoupons={() => navigate(localizedPath("/coupons"))}
        />
        {/* 桌面端：左商品列表 / 右结算摘要 */}
        {items.length > 0 ? (
          <DesktopPurchaseTwoColumn
            className="xl:grid-cols-[minmax(0,1fr)_360px]"
            aside={
              <DesktopPurchaseCard title={t("cart.summary")} className="store-checkout-summary">
                <div className="space-y-2.5 text-sm">
                  <CartPromotionNudge
                    campaign={fullReductionCampaign}
                    amount={Number(totalAmountSelected() || 0)}
                    evaluation={effectivePromotionEvaluation}
                    onBrowse={() => navigate(localizedPath("/categories"))}
                  />
                  <div className="flex items-center justify-between rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs">
                    <span className="text-muted-foreground">{t("cart.couponHint")}</span>
                    <UnifiedButton
                      type="button"
                      onClick={() => navigate(localizedPath("/coupons"))}
                      className="font-semibold text-[var(--theme-price)]"
                    >
                      {t("cart.claimCoupons")}
                    </UnifiedButton>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("cart.selectedItems")}</span>
                    <span>
                      {totalItemsSelected()} {t("cart.itemUnit")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{showSstCartHint ? t("cart.subtotalTaxIncluded") : t("cart.subtotal")}</span>
                    <span>RM {totalAmountSelected()}</span>
                  </div>
                  {showSstCartHint ? (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {sstCartNote || t("cart.sstIncludedNote")}
                    </p>
                  ) : null}
                  <div className="my-3 border-t border-[var(--theme-border)]" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-foreground">{t("cart.total")}</span>
                    <span className="text-[18px] font-extrabold text-[var(--theme-price)] sm:text-xl">
                      <AnimatedNumber value={totalAmountSelected()} decimals={2} format={(n) => `RM ${n.toFixed(2)}`} />
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
            <CartPromotionNudge
              campaign={fullReductionCampaign}
              amount={Number(totalAmountSelected() || 0)}
              evaluation={effectivePromotionEvaluation}
              className="mb-3 md:hidden"
              onBrowse={() => navigate(localizedPath("/categories"))}
            />
            {!isLoggedIn() && (
              <div
                className="relative mb-4 mt-3 overflow-hidden rounded-[22px] border px-4 py-4 text-[var(--theme-text)]"
                style={{
                  borderColor: "color-mix(in srgb, var(--theme-price) 24%, transparent)",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--theme-surface) 94%, white) 0%, color-mix(in srgb, var(--theme-price) 8%, var(--theme-bg)) 100%)",
                  boxShadow: "0 18px 46px color-mix(in srgb, var(--theme-price) 11%, transparent)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-5 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, color-mix(in srgb, var(--theme-price) 46%, transparent), transparent)",
                  }}
                />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-[var(--theme-surface)] text-[var(--theme-price)] shadow-sm"
                      style={{ borderColor: "color-mix(in srgb, var(--theme-price) 22%, transparent)" }}
                    >
                      <ShieldCheck size={18} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold leading-5 text-[var(--theme-text)]">
                          {t("cart.loginSyncTitle")}
                        </p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">
                        {t("cart.loginSyncDesc")}
                      </p>
                    </div>
                  </div>
                  <UnifiedButton
                    type="button"
                    onClick={() => navigate(localizedPath("/login"), { state: { from: currentPath } })}
                    className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-full border border-[var(--theme-price)] bg-[var(--theme-price)] px-4 text-sm font-semibold text-[var(--theme-price-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--theme-price)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-price)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)] sm:w-auto"
                  >
                    <LogIn className="mr-1.5 h-4 w-4" />
                    {t("common.login")}
                  </UnifiedButton>
                </div>
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
              <div
                className="store-cart-list"
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
                  {items.map((item, index) => {
                    const lineKey = cartLineKey(item.product.id, item.variant_id);
                    const selected = isSelected(item.product.id, item.variant_id);
                    const actionsOpen = openActionKey === lineKey;
                    const isLastItem = index === items.length - 1;

                    return (
                    <motion.div
                      key={lineKey}
                      layout
                      exit={{ opacity: 0, x: -100 }}
                      className="store-cart-item relative flex min-w-0 gap-2.5 py-4 sm:gap-3 md:py-5"
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
                          className="relative z-10 flex min-w-0 gap-2.5 bg-transparent py-0.5 sm:gap-3"
                        >
                          <UnifiedButton
                            type="button"
                            onClick={() => {
                              closeItemActions();
                              navigate(localizedPath(`/product/${item.product.id}`), { state: { from: currentPath } });
                            }}
                            className="store-cart-media w-14 flex-shrink-0 self-start cursor-pointer overflow-hidden rounded-xl border-0 bg-transparent p-0 sm:w-16 md:w-16 lg:w-20"
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
                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div className="min-w-0">
                              <h3
                                onClick={() => {
                                  closeItemActions();
                                  navigate(localizedPath(`/product/${item.product.id}`), { state: { from: currentPath } });
                                }}
                                className="store-card-title cursor-pointer break-words leading-tight text-foreground line-clamp-2 hover:text-theme-price"
                              >
                                {item.product.name}
                              </h3>
                              {item.variant_name ? <p className="store-caption mt-1 truncate text-muted-foreground">规格：{item.variant_name}</p> : null}
                            </div>
                            <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                              <StorePriceAmount
                                amount={item.product.price}
                                amountClassName="text-[15px] font-extrabold leading-tight sm:text-base"
                              />
                              <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]">
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
                    );
                  })}
                </AnimatePresence>
              </div>
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
              <ClientEmptyState
                icon={<ShoppingBag size={30} />}
                title={t("cart.emptyTitle")}
                description={t("cart.emptyDescription")}
                action={
                  <ClientButton type="button" onClick={() => navigate(localizedPath("/categories"))}>
                    {t("cart.browseCategories")}
                  </ClientButton>
                }
                className="max-w-none"
              />
            )}
          </div>
        )}
      </main>
      {/* 移动端：底部固定结算栏 */}
      {items.length > 0 && (
        <div className="store-mobile-submit-bar fixed bottom-[calc(var(--store-bottom-nav-height,78px)+env(safe-area-inset-bottom,0px))] left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md md:hidden">
          <div className="mx-auto flex w-full flex-col gap-2 px-[var(--store-page-x)] py-2.5 sm:max-w-lg sm:px-4">
            <SquishButton
              type="button"
              variant="ghost"
              onClick={() => setSelectAll(!allSelected)}
              className="flex items-center gap-2 self-start rounded-none bg-transparent text-xs text-muted-foreground !min-h-0 !px-0 !py-0"
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
                {!allSelected && someSelected && <span className="h-2 w-2 rounded-sm bg-[var(--theme-price)]" />}
              </span>
              {t("cart.selectAll")}
            </SquishButton>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">
                  {t("cart.totalSelected")}:{" "}
                  <span className="text-[18px] font-extrabold text-[var(--theme-price)]">
                    <AnimatedNumber value={totalAmountSelected()} decimals={2} format={(n) => `RM ${n.toFixed(2)}`} />
                  </span>
                </p>
              </div>
              <SquishButton
                type="button"
                variant="gold"
                onClick={handleCheckout}
                disabled={selectedQty === 0}
                className="rounded-full px-8 py-3.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 !min-h-0"
              >
                {checkoutLabel}
              </SquishButton>
            </div>
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

function CartV12Overview({
  loading,
  itemCount,
  selectedLineCount,
  selectedQty,
  selectedAmount,
  allSelected,
  promotionReady,
  onPromotions,
  onCoupons,
}: {
  loading: boolean;
  itemCount: number;
  selectedLineCount: number;
  selectedQty: number;
  selectedAmount: number;
  allSelected: boolean;
  promotionReady: boolean;
  onPromotions: () => void;
  onCoupons: () => void;
}) {
  const stats = [
    {
      label: "已选商品",
      value: loading ? "同步中" : `${selectedLineCount}/${itemCount}`,
      hint: allSelected && itemCount > 0 ? "已全选" : "可分批结算",
      icon: ShoppingBag,
    },
    {
      label: "结算数量",
      value: `${selectedQty}`,
      hint: "按购物车选中项",
      icon: PackageCheck,
    },
    {
      label: "预估小计",
      value: `RM ${selectedAmount.toFixed(2)}`,
      hint: "最终金额看结算预览",
      icon: Calculator,
    },
    {
      label: "活动校验",
      value: promotionReady ? "已预览" : itemCount > 0 ? "结算复核" : "待选商品",
      hint: "优惠资格由后端判断",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="store-cart-v12-overview" aria-label="购物车工作台">
      <div className="store-cart-v12-overview__copy">
        <span>
          <BadgePercent size={14} aria-hidden />
          购物车工作台
        </span>
        <h1>先选商品，再进入结算预览</h1>
        <p>活动、优惠券、积分、库存和运费会在结算页重新校验，前台只展示后端返回的结果。</p>
      </div>
      <div className="store-cart-v12-overview__stats">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <span aria-hidden>
                <Icon size={15} />
              </span>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
              <em>{item.hint}</em>
            </div>
          );
        })}
      </div>
      <div className="store-cart-v12-overview__actions">
        <UnifiedButton type="button" onClick={onPromotions}>
          活动中心
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onCoupons}>
          先领券
        </UnifiedButton>
      </div>
    </section>
  );
}
