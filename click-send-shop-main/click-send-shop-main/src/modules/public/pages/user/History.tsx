import { useEffect } from "react";
import { Trash2, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { isLoggedIn } from "@/utils/token";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
import { EmptyState as ClientEmptyState } from "@/components/client";

export default function History() {
  const navigate = useNavigate();
  const { history, loading, loadHistory, clearHistory } = useHistoryStore();

  useEffect(() => {
    loadHistory().catch(() => toast.error("加载失败"));
  }, [loadHistory]);

  return (
    <StoreAccountLayout
      title="浏览历史"
      rightSlot={
        history.length > 0 ? (
          <UnifiedButton type="button" onClick={clearHistory} className="flex items-center gap-1 text-xs text-[var(--theme-danger)] active:opacity-70">
            <Trash2 size={14} /> 清空
          </UnifiedButton>
        ) : undefined
      }
      className="pb-6"
      mainClassName="sm:px-4 xl:py-6"
    >
        {!isLoggedIn() && (
          <div className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--theme-price)_30%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_5%,var(--theme-surface))] px-4 py-3 text-xs text-foreground">
            <span className="text-muted-foreground">未登录时仅在本机记录浏览；</span>
            <UnifiedButton
              type="button"
              onClick={() => navigate("/login", { state: { from: "/history" } })}
              className="ml-1 font-semibold text-theme-price"
            >
              登录
            </UnifiedButton>
            <span className="text-muted-foreground">后多端同步</span>
          </div>
        )}
        {loading && history.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Loader2 size={24} className="mb-3 animate-spin" />
            <p className="text-sm">加载中…</p>
          </div>
        ) : history.length === 0 ? (
          <ClientEmptyState
            title="暂无浏览记录"
            description="浏览过的商品会自动保存在这里，方便你回看。"
            icon={<Clock size={30} />}
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {history.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors active:bg-muted"
                >
                  <ProductCoverImage
                    url={product.cover_image}
                    alt={product.cover_image_alt || product.name}
                    className="w-12 flex-shrink-0 rounded-xl object-cover"
                    imgClassName="object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "low"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{product.description}</p>
                    <p className="mt-1 text-sm font-bold text-theme-price">RM {product.price}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
    </StoreAccountLayout>
  );
}
