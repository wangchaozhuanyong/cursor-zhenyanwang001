import { useEffect, useState } from "react";
import { Clock, LogIn, Search, Trash2 } from "lucide-react";

import { useHistoryStore } from "@/stores/useHistoryStore";
import { isLoggedIn } from "@/utils/token";
import { motion, AnimatePresence } from "framer-motion";
import { showStoreToast } from "@/utils/storeToast";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import StorefrontQuietLoading from "@/components/storefront-motion/StorefrontQuietLoading";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import { usePublicLocale } from "@/i18n/publicLocale";
import AccountProductCard from "./components/AccountProductCard";
import "@/styles/favorites-history-route.css";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

export default function History() {
  const navigate = useStorefrontNavigate();
  const { localizedPath } = usePublicLocale();
  const { history, loading, loadHistory, clearHistory } = useHistoryStore();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const saleableCount = history.filter((item) => Number(item.stock) > 0).length;
  const activityCount = history.filter((item) => item.active_activity || item.activity_promo_label).length;

  useEffect(() => {
    loadHistory().catch(() => showStoreToast.error("加载失败"));
  }, [loadHistory]);

  return (
    <>
      <StoreAccountLayout
        title="浏览历史"
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-history-page pb-6"
        mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      >
        <div className="mx-auto w-full max-w-lg space-y-3 md:max-w-none">
        {!isLoggedIn() && (
          <div className="sf-next-notice sf-next-sync-notice">
            <span className="sf-next-card-icon"><Clock size={16} aria-hidden /></span>
            <div>
              <strong>本机浏览记录</strong>
              <p>未登录时只保存在当前设备，登录后可同步到账号。</p>
            </div>
            <UnifiedButton
              type="button"
              onClick={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/history") } })}
              className="sf-next-notice-action"
            >
              <LogIn size={15} aria-hidden />
              <span>登录同步</span>
            </UnifiedButton>
          </div>
        )}
        {history.length > 0 ? (
          <section className="sf-next-history-summary" aria-label="浏览记录摘要">
            <span><strong>{history.length}</strong> 条记录</span>
            <span aria-hidden>·</span>
            <span><strong>{saleableCount}</strong> 件可售</span>
            {activityCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span><strong>{activityCount}</strong> 件活动商品</span>
              </>
            ) : null}
          </section>
        ) : null}
        {loading && history.length === 0 ? (
          <StorefrontQuietLoading label="浏览历史加载中" className="sf-motion-inline-loading--account" />
        ) : history.length === 0 ? (
          <section className="sf-next-state-panel">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <Clock size={24} />
            </span>
            <h2>暂无浏览记录</h2>
            <p>浏览过的商品会出现在这里，方便你回看价格、活动和库存状态。</p>
            <UnifiedButton
              type="button"
              onClick={() => navigate(localizedPath("/categories"))}
              className="sf-next-state-panel__primary"
            >
              <Search size={16} aria-hidden />
              <span>去逛商品</span>
            </UnifiedButton>
          </section>
        ) : (
          <section className="sf-next-history-group" aria-label="最近浏览商品">
            <div className="sf-next-history-group__head">
              <div>
                <h2>最近浏览</h2>
                <small>按最近访问顺序展示</small>
              </div>
              <UnifiedButton
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                className="sf-next-history-clear-inline"
              >
                <Trash2 size={15} aria-hidden />
                <span>清空</span>
              </UnifiedButton>
            </div>
            <div className="sf-next-account-product-grid">
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
          </section>
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
          showStoreToast.success("浏览历史已清空");
        }}
      />
    </>
  );
}
