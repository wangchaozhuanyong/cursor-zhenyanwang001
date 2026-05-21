import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, Loader2, Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import StorePageHeader from "@/components/store/StorePageHeader";
import { cartLineKey, useCartStore } from "@/stores/useCartStore";
import ProductCoverImage from "@/components/ProductCoverImage";
import { isLoggedIn } from "@/utils/token";
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
    removeItem,
    loadCart,
    isSelected,
    toggleSelect,
    setSelectAll,
    totalAmountSelected,
    totalItemsSelected,
  } = useCartStore();
  const selection = useCartStore((s) => s.selection);
  const siteInfo = useSiteInfo();
  const sstCartNote = (siteInfo.sstCustomerNote || "").trim();
  const showSstCartHint = parseSstEnabled(siteInfo.sstEnabled);
  const [deleteTarget, setDeleteTarget] = useState<{ productId: string; variantId?: string; name: string } | null>(null);

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

  return (
    <div className="store-bottom-cart-space min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0">
      <StorePageHeader
        centerTitle={!loading && items.length === 0}
        eyebrow={!loading && items.length === 0 ? "空空如也" : undefined}
        title={
          <>
            购物车
            {totalQty > 0 ? (
              <span className="ml-1.5 text-sm font-normal text-[var(--theme-text-muted)]">({totalQty})</span>
            ) : null}
          </>
        }
        rightSlot={
          items.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectAll(!allSelected)}
              className="text-xs font-semibold text-[var(--theme-primary)]"
            >
              {allSelected ? "取消全选" : "全选"}
            </button>
          ) : null
        }
      />

      <main className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] md:px-6 md:py-4">
        {/* 桌面端：左商品列表 / 右结算摘要 */}
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8">
          <div>
            <MarketingPositionNotices position="cart_notice" className="mb-3" />
            {!isLoggedIn() && (
              <div className="mb-3 theme-rounded border border-[var(--theme-price)]/30 bg-[var(--theme-price)]/5 px-4 py-3 text-xs text-[var(--theme-text)]">
                <span className="text-muted-foreground">当前未登录，购物车仅保存在本机；</span>
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { from: "/cart" } })}
                  className="font-semibold text-[var(--theme-price)] ml-1"
                >
                  登录
                </button>
                <span className="text-muted-foreground">后同步到账号</span>
              </div>
            )}
            {error && (
              <div className={`mb-3 flex items-center justify-between rounded-lg px-4 py-3 text-sm ${THEME_ALERT_ERROR_SOFT}`}>
                <span>{error}</span>
                <button
                  onClick={() => {
                    clearError();
                    loadCart();
                  }}
                  className="ml-3 text-xs underline"
                >
                  重试
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <Loader2 size={24} className="animate-spin mb-3" />
                <p className="text-sm">加载中…</p>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="购物车空空如也"
                description="快去挑选心仪的商品吧"
                action={{ label: "去逛逛", onClick: () => navigate("/") }}
              />
            ) : (
              <div className="md:theme-rounded md:border md:border-[var(--theme-border)] md:bg-[var(--theme-surface)] md:px-4">
                {/* 桌面：列表头 + 全选 */}
                <div className="hidden items-center justify-between border-b border-[var(--theme-border)] py-3 md:flex">
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
                  {items.map((item) => (
                    <motion.div
                      key={cartLineKey(item.product.id, item.variant_id)}
                      layout
                      exit={{ opacity: 0, x: -100 }}
                      className="flex gap-3 border-b border-[var(--theme-border)] py-4 last:border-b-0"
                    >
                      <SquishButton
                        type="button"
                        variant="ghost"
                        onClick={() => toggleSelect(item.product.id, item.variant_id)}
                        className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 !p-0 transition-colors ${
                          isSelected(item.product.id, item.variant_id)
                            ? "border-gold btn-theme-price"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                        aria-label={isSelected(item.product.id, item.variant_id) ? "取消勾选" : "勾选结算"}
                      >
                        {isSelected(item.product.id, item.variant_id) && <Check size={14} strokeWidth={3} />}
                      </SquishButton>
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${item.product.id}`)}
                        className="h-24 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-0 bg-transparent p-0 md:h-28 md:w-28"
                        aria-label={`查看 ${item.product.name}`}
                      >
                        <ProductCoverImage
                          url={item.product.cover_image}
                          alt={item.product.name}
                          className="h-full w-full"
                          imgClassName="h-full w-full rounded-xl object-cover"
                          loading="eager"
                          fetchPriority="high"
                        />
                      </button>
                      <div className="flex flex-1 flex-col justify-between py-0.5">
                        <div>
                          <h3
                            onClick={() => navigate(`/product/${item.product.id}`)}
                            className="cursor-pointer text-[13px] font-medium leading-tight text-foreground line-clamp-2 hover:text-theme-price md:text-sm"
                          >
                            {item.product.name}
                          </h3>
                          {item.variant_name ? <p className="mt-1 text-[11px] text-muted-foreground">规格：{item.variant_name}</p> : null}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-theme-price md:text-lg">
                            RM {item.product.price}
                          </span>
                          <div className="flex items-center gap-3">
                            <SquishButton
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setDeleteTarget({
                                  productId: item.product.id,
                                  variantId: item.variant_id,
                                  name: item.product.name,
                                })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent hover:bg-[var(--theme-bg)] touch-target !p-0"
                              aria-label="删除"
                            >
                              <Trash2 size={15} className="text-muted-foreground" />
                            </SquishButton>
                            <div className="flex items-center gap-1 rounded-full border border-[var(--theme-border)]">
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
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] touch-target !p-0"
                                aria-label="减少数量"
                              >
                                <Minus size={14} className="text-foreground" />
                              </SquishButton>
                              <span className="min-w-[24px] text-center text-sm font-semibold text-foreground">
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
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent active:bg-[var(--theme-bg)] touch-target !p-0"
                                aria-label="增加数量"
                              >
                                <Plus size={14} className="text-foreground" />
                              </SquishButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* 桌面右侧结算摘要 */}
          {items.length > 0 && (
            <aside className="mt-6 hidden self-start md:sticky md:top-20 md:mt-0 md:block">
              <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
                <h3 className="mb-4 text-base font-semibold text-foreground">结算摘要</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs">
                    <span className="text-muted-foreground">下单前可先领券，结算页自动匹配最优优惠</span>
                    <button
                      type="button"
                      onClick={() => navigate("/coupons")}
                      className="font-semibold text-[var(--theme-price)]"
                    >
                      去领券
                    </button>
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
                    <span className="text-2xl font-bold text-[var(--theme-price)]">
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
        <div className="fixed bottom-[calc(var(--store-bottom-nav-height,72px)+env(safe-area-inset-bottom,0px))] left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md md:hidden">
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
                  <span className="text-xl font-bold text-[var(--theme-price)]">
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
