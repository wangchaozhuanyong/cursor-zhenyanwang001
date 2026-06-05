import { useEffect, useState } from "react";
import { Heart, Minus, Pin, Plus, Share2, Trash2, ShoppingBag, Loader2, Check, LogIn, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import StorePageHeader from "@/components/store/StorePageHeader";
import { STORE_MOBILE_PAGE_HEADER_CLASS } from "@/constants/storeLayout";
import { STORE_COPY } from "@/constants/storeCopy";
import { cartLineKey, useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import ProductCoverImage from "@/components/ProductCoverImage";
import type { CartItem } from "@/types/cart";
import { isLoggedIn } from "@/utils/token";
import { copyToClipboard } from "@/utils/clipboard";
import EmptyState from "@/components/EmptyState";
import TrustInfo from "@/components/TrustInfo";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedNumber, BottomSheetConfirm, SquishButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { parseSstEnabled } from "@/utils/sstTax";
import MarketingPositionNotices from "@/modules/public/components/marketing/MarketingPositionNotices";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const CART_ACTION_WIDTH = 244;
const CART_ACTION_REVEAL_THRESHOLD = 64;

export default function Cart() {
  useDocumentTitle("购物车");
  const navigate = useNavigate();
  const location = useLocation() as { state?: { coupon_id?: string } };
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

  const selectedCount = items.filter((i) => selection[cartLineKey(i.product.id, i.variant_id)] !== false).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const selectedQty = totalItemsSelected();
  const checkoutLabel =
    selectedQty > 0 ? (
      <>
        去结算<span className="ml-0.5 text-[0.85em] font-semibold opacity-90">({selectedQty})</span>
      </>
    ) : (
      "去结算"
    );
  const isEmptyCart = !loading && items.length === 0;
  const headerTitle =
    totalQty > 0 ? (
      <>
        购物车
        <span className="ml-1.5 text-sm font-normal text-[var(--theme-text-muted)]">({totalQty})</span>
      </>
    ) : (
      "购物车"
    );

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleCheckout = () => {
    if (totalItemsSelected() === 0) {
      toast.error("请先勾选要结算的商品");
      return;
    }
    const couponId = location.state?.coupon_id;
    navigate(couponId ? `/checkout?coupon_id=${couponId}` : "/checkout");
  };

  const closeItemActions = () => setOpenActionKey(null);

  const getProductShareUrl = (productId: string) => {
    if (typeof window === "undefined") return `/product/${productId}`;
    return new URL(`/product/${productId}`, window.location.origin).toString();
  };

  const handlePinToTop = async (item: CartItem) => {
    try {
      await pinItemToTop(item.product.id, item.variant_id);
      closeItemActions();
      toast.success("已置顶");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "置顶失败");
    }
  };

  const handleMoveToFavorite = async (item: CartItem) => {
    try {
      if (!isFavoriteProduct(item.product.id)) {
        await toggleFavorite(item.product);
      }
      await removeItem(item.product.id, item.variant_id);
      closeItemActions();
      toast.success("已移入收藏");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "移入收藏失败");
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
    toast[copied ? "success" : "error"](copied ? "商品链接已复制" : "分享失败，请稍后重试");
  };

  return (
    <div className="store-page-shell store-cart-page store-bottom-cart-space bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0 lg:pb-0">
      <StorePageHeader
        className={STORE_MOBILE_PAGE_HEADER_CLASS}
        centerTitle
        title={headerTitle}
        rightSlot={
          !isEmptyCart && items.length > 0 ? (
            <UnifiedButton
              type="button"
              onClick={() => setSelectAll(!allSelected)}
              className="inline-flex min-h-9 items-center rounded-full px-2 text-xs font-semibold text-[var(--theme-primary)]"
            >
              {allSelected ? "取消全选" : "全选"}
            </UnifiedButton>
          ) : null
        }
      />

      <main className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] md:px-6 md:py-4">
        {/* 桌面端：左商品列表 / 右结算摘要 */}
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8">
          <div>
            <MarketingPositionNotices position="cart_notice" className="mb-3" />
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
                        <p className="text-sm font-semibold leading-5 text-[var(--theme-text)]">登录后同步购物车</p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">
                        当前购物车仅保存在本机，登录后可同步到账号。
                      </p>
                    </div>
                  </div>
                  <UnifiedButton
                    type="button"
                    onClick={() => navigate("/login", { state: { from: "/cart" } })}
                    className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-full border border-[var(--theme-price)] bg-[var(--theme-price)] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--theme-price)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-price)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)] sm:w-auto"
                  >
                    <LogIn className="mr-1.5 h-4 w-4" />
                    登录
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
                    loadCart();
                  }}
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-danger)] focus-visible:ring-offset-2"
                >
                  重试
                </UnifiedButton>
              </div>
            )}
            {loading ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground" role="status" aria-live="polite">
                <Loader2 size={24} className="animate-spin mb-3" />
                <p className="text-sm">加载中…</p>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="暂无商品"
                description="快去挑选心仪的商品吧"
                action={{ label: STORE_COPY.browseAllCategories, onClick: () => navigate("/categories") }}
                className="max-w-none !rounded-none !border-0 !bg-transparent px-4 py-20 !shadow-none"
              />
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
                          ? "border-gold btn-theme-price"
                          : someSelected
                            ? "border-gold/60 bg-gold/10"
                            : "border-muted-foreground/40"
                      }`}
                    >
                      {allSelected && <Check size={12} strokeWidth={3} />}
                      {!allSelected && someSelected && (
                        <span className="h-2 w-2 rounded-sm bg-gold" />
                      )}
                    </span>
                    全选 ({selectedCount}/{items.length})
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
                        aria-label={selected ? "取消勾选" : "勾选结算"}
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
                            <span>置顶</span>
                          </UnifiedButton>
                          <UnifiedButton
                            type="button"
                            tabIndex={actionsOpen ? 0 : -1}
                            onClick={() => handleMoveToFavorite(item)}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-l border-[var(--theme-border)] px-1 text-[11px] font-semibold text-[var(--theme-price)]"
                          >
                            <Heart size={15} />
                            <span>移入收藏</span>
                          </UnifiedButton>
                          <UnifiedButton
                            type="button"
                            tabIndex={actionsOpen ? 0 : -1}
                            onClick={() => handleShareProduct(item)}
                            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-l border-[var(--theme-border)] px-1 text-[11px] font-semibold text-[var(--theme-primary)]"
                          >
                            <Share2 size={15} />
                            <span>分享</span>
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
                            <span>删除</span>
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
                              navigate(`/product/${item.product.id}`);
                            }}
                            className="store-cart-media h-[88px] w-[88px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-0 bg-transparent p-0 sm:h-24 sm:w-24 md:h-28 md:w-28"
                            aria-label={`查看 ${item.product.name}`}
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
                                  navigate(`/product/${item.product.id}`);
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
                                      toast.error(e instanceof Error ? e.message : "更新数量失败");
                                    }
                                  }}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] !p-0"
                                  aria-label="减少数量"
                                >
                                  <Minus size={14} className="text-foreground" />
                                </SquishButton>
                                <span className="min-w-[28px] text-center text-sm font-semibold text-foreground">
                                  {item.qty}
                                </span>
                                <SquishButton
                                  type="button"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      await updateQty(item.product.id, item.qty + 1, item.variant_id);
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : "更新数量失败");
                                    }
                                  }}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] !p-0"
                                  aria-label="增加数量"
                                >
                                  <Plus size={14} className="text-foreground" />
                                </SquishButton>
                              </div>
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
          </div>

          {/* 桌面右侧结算摘要 */}
          {items.length > 0 && (
            <aside className="mt-6 hidden self-start md:sticky md:top-20 md:mt-0 md:block">
              <div className="store-checkout-summary theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
                <h3 className="store-section-title mb-4 text-foreground">结算摘要</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs">
                    <span className="text-muted-foreground">下单前可先领券，结算页自动匹配最优优惠</span>
                    <UnifiedButton
                      type="button"
                      onClick={() => navigate("/coupons")}
                      className="font-semibold text-[var(--theme-price)]"
                    >
                      去领券
                    </UnifiedButton>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>已选商品</span>
                    <span>{totalItemsSelected()} 件</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{showSstCartHint ? "商品小计（含税）" : "商品小计"}</span>
                    <span>RM {totalAmountSelected()}</span>
                  </div>
                  {showSstCartHint ? (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {sstCartNote || "商品价格已含 SST，运费不计税。"}
                    </p>
                  ) : null}
                  <div className="my-3 border-t border-[var(--theme-border)]" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-foreground">合计</span>
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
              </div>
            </aside>
          )}
        </div>
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
                    ? "border-gold btn-theme-price"
                    : someSelected
                      ? "border-gold/60 bg-gold/10"
                      : "border-muted-foreground/40"
                }`}
              >
                {allSelected && <Check size={12} strokeWidth={3} />}
                {!allSelected && someSelected && <span className="h-2 w-2 rounded-sm bg-gold" />}
              </span>
              全选
            </SquishButton>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">
                  合计（已选）:{" "}
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
        title="移出购物车？"
        description={deleteTarget ? `确定将「${deleteTarget.name}」从购物车中移除吗？` : undefined}
        confirmText="删除"
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          await removeItem(deleteTarget.productId, deleteTarget.variantId);
          toast.success("已从购物车移除", { duration: 2000 });
        }}
      />
    </div>
  );
}
