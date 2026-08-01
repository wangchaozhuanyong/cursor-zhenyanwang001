
import { useEffect } from "react";
import { ArrowLeft, Home, RotateCw, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { trackEvent } from "@/services/analyticsService";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useStableBack } from "@/hooks/useStableBack";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

export default function NotFound() {
  const navigate = useStorefrontNavigate();
  const stableBack = useStableBack({ fallbackPath: "/" });

  useEffect(() => {
    void trackEvent({ event_type: "error_404", module: "router", path: window.location.pathname, url: window.location.href, title: "页面不存在" });
  }, []);

  return (
    <main className="sf-next-page-shell sf-next-bottom-safe sf-next-page sf-next-route-page sf-next-not-found-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sf-next-not-found-panel"
      >
        <div className="sf-next-not-found-icon">
          <SearchX size={32} aria-hidden />
        </div>
        <p className="sf-next-not-found-code">404</p>
        <h1>页面不存在</h1>
        <p className="sf-next-not-found-copy">这个页面可能已移动、删除，或链接输入有误。你可以返回上一页，或者回到首页继续浏览。</p>
        <div className="sf-next-not-found-actions">
          <UnifiedButton
            type="button"
            onClick={stableBack}
            className="sf-next-not-found-action"
          >
            <ArrowLeft size={16} aria-hidden /> 返回上一页
          </UnifiedButton>
          <UnifiedButton
            type="button"
            className="sf-next-not-found-action"
            onClick={() => window.location.reload()}
          >
            <RotateCw size={16} aria-hidden />
            重新加载
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="sf-next-not-found-action sf-next-not-found-action--primary"
          >
            <Home size={16} aria-hidden /> 返回首页
          </UnifiedButton>
        </div>
      </motion.div>
    </main>
  );
}
