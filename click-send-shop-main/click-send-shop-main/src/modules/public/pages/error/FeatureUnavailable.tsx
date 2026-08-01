import { Headphones, Home, Settings } from "lucide-react";
import "@/styles/fixed-status-routes.css";

import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

export default function FeatureUnavailable() {
  const navigate = useStorefrontNavigate();
  const capabilities = useSiteCapabilities();
  const supportPath = capabilities.customerServiceDownloadEnabled ? "/support-download?tab=support" : "/help";

  return (
    <main className="sf-next-page-shell sf-next-bottom-safe sf-next-page sf-next-route-page sf-next-feature-unavailable-page">
      <section className="sf-next-feature-unavailable" aria-labelledby="feature-unavailable-title">
        <div className="sf-next-feature-unavailable__icon" aria-hidden>
          <Settings size={24} />
        </div>
        <p className="sf-next-feature-unavailable__eyebrow">当前服务</p>
        <h1 id="feature-unavailable-title">功能暂未开放</h1>
        <p className="sf-next-feature-unavailable__description">
          当前功能暂时不可用，可能是商城模块、支付模块或相关服务还未开启。您可以先返回首页，或联系客服确认。
        </p>
        <div className="sf-next-feature-unavailable__actions">
          <UnifiedButton
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="sf-next-feature-unavailable__action is-primary"
          >
            <Home size={16} aria-hidden />
            返回首页
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={() => navigate(supportPath)}
            className="sf-next-feature-unavailable__action"
          >
            <Headphones size={16} aria-hidden />
            联系客服
          </UnifiedButton>
        </div>
      </section>
    </main>
  );
}
