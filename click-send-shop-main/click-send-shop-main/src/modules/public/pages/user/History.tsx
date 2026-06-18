import { useEffect, useState } from "react";
import { BadgePercent, Clock, History as HistoryIcon, PackageCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { isLoggedIn } from "@/utils/token";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { EmptyState as ClientEmptyState } from "@/components/client";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import { usePublicLocale } from "@/i18n/publicLocale";
import AccountProductCard, { AccountProductCardSkeleton } from "./components/AccountProductCard";

export default function History() {
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const { history, loading, loadHistory, clearHistory } = useHistoryStore();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const saleableCount = history.filter((item) => Number(item.stock) > 0).length;
  const activityCount = history.filter((item) => item.active_activity || item.activity_promo_label).length;

  useEffect(() => {
    loadHistory().catch(() => toast.error("加载失败"));
  }, [loadHistory]);

  return (
    <>
      <StoreAccountLayout
        title="浏览历史"
        rightSlot={
          history.length > 0 ? (
            <UnifiedButton type="button" onClick={() => setClearConfirmOpen(true)} className="flex items-center gap-1 text-xs text-[var(--theme-danger)] active:opacity-70">
              <Trash2 size={14} /> 清空
            </UnifiedButton>
          ) : undefined
        }
        className="store-v12-page store-account-subpage-v12-page store-history-v12-page pb-6"
        mainClassName="sm:px-4 xl:py-6"
      >
        <div className="mx-auto w-full max-w-lg space-y-3 md:max-w-none">
        <section className="store-account-v12-hero">
          <span className="store-v12-eyebrow"><HistoryIcon size={14} aria-hidden /> 浏览足迹</span>
          <h2>最近看过的商品，继续比较</h2>
          <div className="store-v12-hero-actions">
            {history.length > 0 ? (
              <UnifiedButton
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                className="store-v12-secondary-action"
              >
                <Trash2 size={15} aria-hidden />
                清空历史
              </UnifiedButton>
            ) : (
              <UnifiedButton
                type="button"
                onClick={() => navigate(localizedPath("/categories"))}
                className="store-v12-primary-action"
              >
                去逛商品
              </UnifiedButton>
            )}
          </div>
        </section>

        {!isLoggedIn() && (
          <div className="store-account-v12-notice">
            <span className="store-v12-card-icon"><Clock size={16} aria-hidden /></span>
            <p>未登录时仅在本机记录浏览；登录后多端同步。</p>
            <UnifiedButton
              type="button"
              onClick={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/history") } })}
              className="font-semibold text-theme-price"
            >
              登录
            </UnifiedButton>
          </div>
        )}
        {history.length > 0 ? (
          <section className="store-account-v12-summary store-orders-v12-stat-grid">
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><Clock size={17} aria-hidden /></span>
              <strong>{history.length}</strong>
              <span>最近浏览</span>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><PackageCheck size={17} aria-hidden /></span>
              <strong>{saleableCount}</strong>
              <span>可售商品</span>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><BadgePercent size={17} aria-hidden /></span>
              <strong>{activityCount}</strong>
              <span>活动商品</span>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><HistoryIcon size={17} aria-hidden /></span>
              <strong>{Math.min(history.length, 12)}</strong>
              <span>快速回看</span>
            </div>
          </section>
        ) : null}
        {loading && history.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <AccountProductCardSkeleton variant="history" />
            <AccountProductCardSkeleton variant="history" />
            <AccountProductCardSkeleton variant="history" />
            <AccountProductCardSkeleton variant="history" />
          </div>
        ) : history.length === 0 ? (
          <ClientEmptyState
            title="暂无浏览记录"
            icon={<Clock size={30} />}
          />
        ) : (
          <div className="store-account-v12-product-grid">
            <AnimatePresence>
              {history.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="min-w-0"
                >
                  <AccountProductCard product={product} index={i} variant="history" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        </div>
      </StoreAccountLayout>
      <BottomSheetConfirm
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="清空浏览历史"
        description="清空后，本机浏览记录会立即移除。"
        confirmText="清空"
        danger
        onConfirm={async () => {
          await clearHistory();
          toast.success("浏览历史已清空");
        }}
      />
    </>
  );
}
