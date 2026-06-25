import { Headphones, Home, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function FeatureUnavailable() {
  const navigate = useNavigate();

  return (
    <div className="sf-next-page-shell sf-next-bottom-safe sf-next-page sf-next-route-page flex min-h-[60vh] items-center justify-center bg-[var(--theme-bg)] px-4 py-10 text-[var(--theme-text)]">
      <div className="sf-next-surface-card w-full max-w-md px-6 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Settings size={26} />
        </div>
        <h1 className="mt-5 text-lg font-semibold">功能暂未开放</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          当前功能暂时不可用，可能是商城模块、支付模块或相关服务还未开启。您可以先返回首页，或联系客服确认。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <UnifiedButton
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full btn-theme-price px-5 text-sm font-semibold text-[var(--theme-price-foreground)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-price)] focus-visible:ring-offset-2"
          >
            <Home size={15} />
            返回首页
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={() => navigate("/support-download?tab=support")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-5 text-sm font-semibold text-[var(--theme-text)] transition hover:bg-[var(--theme-surface)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2"
          >
            <Headphones size={15} />
            联系客服
          </UnifiedButton>
        </div>
      </div>
    </div>
  );
}
