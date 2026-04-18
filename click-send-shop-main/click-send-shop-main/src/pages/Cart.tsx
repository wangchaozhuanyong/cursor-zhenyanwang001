import { useEffect } from "react";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Loader2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useCartStore } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";
import EmptyState from "@/components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Cart() {
  useDocumentTitle("购物车");
  const navigate = useNavigate();
  const goBack = useGoBack();
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
    totalPointsSelected,
    totalItemsSelected,
  } = useCartStore();
  const selection = useCartStore((s) => s.selection);

  const selectedCount = items.filter((i) => selection[i.product.id] !== false).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0;

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  return (
    <div className="min-h-screen bg-background pb-44">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">购物车</h1>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({someSelected ? `已选 ${selectedCount}/` : ""}{items.reduce((s, i) => s + i.qty, 0)} 件)
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        {!isLoggedIn() && (
          <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs text-foreground">
            <span className="text-muted-foreground">当前未登录，购物车仅保存在本机；</span>
            <button
              type="button"
              onClick={() => navigate("/login", { state: { from: "/cart" } })}
              className="font-semibold text-gold ml-1"
            >
              登录
            </button>
            <span className="text-muted-foreground">后同步到账号</span>
          </div>
        )}
        {error && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <button onClick={() => { clearError(); loadCart(); }} className="ml-3 text-xs underline">重试</button>
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
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                layout
                exit={{ opacity: 0, x: -100 }}
                className="flex gap-3 border-b border-border py-4"
              >
                <button
                  type="button"
                  onClick={() => toggleSelect(item.product.id)}
                  className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    isSelected(item.product.id)
                      ? "border-gold bg-gold text-primary-foreground"
                      : "border-muted-foreground/40 bg-background"
                  }`}
                  aria-label={isSelected(item.product.id) ? "取消勾选" : "勾选结算"}
                >
                  {isSelected(item.product.id) && <Check size={14} strokeWidth={3} />}
                </button>
                <img
                  src={item.product.cover_image}
                  alt={item.product.name}
                  onClick={() => navigate(`/product/${item.product.id}`)}
                  className="h-24 w-24 flex-shrink-0 cursor-pointer rounded-xl object-cover"
                />
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div>
                    <h3 className="text-[13px] font-medium leading-tight text-foreground line-clamp-2">{item.product.name}</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">+{item.product.points}积分</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gold">RM {item.product.price}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary active:bg-muted touch-target"
                      >
                        <Trash2 size={15} className="text-muted-foreground" />
                      </button>
                      <div className="flex items-center gap-1 rounded-full border border-border">
                        <button
                          onClick={() => updateQty(item.product.id, item.qty - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full active:bg-secondary touch-target"
                        >
                          <Minus size={14} className="text-foreground" />
                        </button>
                        <span className="min-w-[24px] text-center text-sm font-semibold text-foreground">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.product.id, item.qty + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full active:bg-secondary touch-target"
                        >
                          <Plus size={14} className="text-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg flex-col gap-2 px-4 py-2.5">
            <button
              type="button"
              onClick={() => setSelectAll(!allSelected)}
              className="flex items-center gap-2 self-start text-xs text-muted-foreground"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                  allSelected ? "border-gold bg-gold text-primary-foreground" : someSelected ? "border-gold/60 bg-gold/10" : "border-muted-foreground/40"
                }`}
              >
                {allSelected && <Check size={12} strokeWidth={3} />}
                {!allSelected && someSelected && <span className="h-2 w-2 rounded-sm bg-gold" />}
              </span>
              全选
            </button>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">
                  合计（已选）: <span className="text-xl font-bold text-gold">RM {totalAmountSelected()}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">可获积分: {totalPointsSelected()}</p>
              </div>
              <button
                onClick={() => {
                  if (totalItemsSelected() === 0) {
                    toast.error("请先勾选要结算的商品");
                    return;
                  }
                  navigate("/checkout");
                }}
                disabled={totalItemsSelected() === 0}
                className="rounded-full bg-gold px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                去结算
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
