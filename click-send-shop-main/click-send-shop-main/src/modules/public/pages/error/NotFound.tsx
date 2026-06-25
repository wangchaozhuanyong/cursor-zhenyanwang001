import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, RotateCw, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { trackEvent } from "@/services/analyticsService";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useStableBack } from "@/hooks/useStableBack";

export default function NotFound() {
  const navigate = useNavigate();
  const stableBack = useStableBack({ fallbackPath: "/" });

  useEffect(() => {
    void trackEvent({ event_type: "error_404", module: "router", path: window.location.pathname, url: window.location.href, title: "页面不存在" });
  }, []);

  return (
    <div className="sf-next-page-shell sf-next-bottom-safe sf-next-page sf-next-route-page flex min-h-screen items-center justify-center bg-[var(--theme-bg)] px-4 py-12 text-[var(--theme-text)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sf-next-surface-card w-full max-w-md px-6 py-9 text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-primary)] shadow-sm">
          <SearchX size={32} aria-hidden />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">页面不存在</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">这个页面可能已移动、删除，或链接输入有误。你可以返回上一页，或者回到首页继续浏览。</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          <UnifiedButton
            type="button"
            onClick={stableBack}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 text-sm font-semibold text-[var(--theme-text)] transition hover:bg-[var(--theme-bg)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2"
          >
            <ArrowLeft size={16} aria-hidden /> 返回上一页
          </UnifiedButton>
          <UnifiedButton
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 text-sm font-semibold text-[var(--theme-text)] transition hover:bg-[var(--theme-bg)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2"
            onClick={() => window.location.reload()}
          >
            <RotateCw size={16} aria-hidden />
            重新加载
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full btn-theme-price px-5 text-sm font-bold text-[var(--theme-price-foreground)] shadow-[0_18px_34px_-26px_var(--theme-price)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-price)] focus-visible:ring-offset-2"
          >
            <Home size={16} aria-hidden /> 返回首页
          </UnifiedButton>
        </div>
      </motion.div>
    </div>
  );
}
