import { useEffect } from "react";
import { ArrowLeft, Trash2, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { isLoggedIn } from "@/utils/token";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function History() {
  const navigate = useNavigate();
  const { history, loading, loadHistory, clearHistory } = useHistoryStore();

  useEffect(() => {
    loadHistory().catch(() => toast.error("加载失败"));
  }, [loadHistory]);

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-base font-semibold text-foreground">浏览历史</h1>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-destructive active:opacity-70">
              <Trash2 size={14} /> 清空
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        {!isLoggedIn() && (
          <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs text-foreground">
            <span className="text-muted-foreground">未登录时仅在本机记录浏览；</span>
            <button
              type="button"
              onClick={() => navigate("/login", { state: { from: "/history" } })}
              className="font-semibold text-gold ml-1"
            >
              登录
            </button>
            <span className="text-muted-foreground">后多端同步</span>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Loader2 size={24} className="animate-spin mb-3" />
            <p className="text-sm">加载中…</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Clock size={48} className="mb-3 opacity-30" />
            <p className="text-sm">暂无浏览记录</p>
          </div>
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
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-muted transition-colors"
                >
                  <img src={product.cover_image} alt={product.name} className="h-16 w-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                    <p className="mt-1 text-sm font-bold text-gold">RM {product.price}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
