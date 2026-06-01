import { Headphones, Home, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FeatureUnavailable() {
  const navigate = useNavigate();

  return (
    <div className="store-page-shell store-bottom-safe flex min-h-[60vh] items-center justify-center bg-[var(--theme-bg)] px-4 py-10 text-[var(--theme-text)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Settings size={26} />
        </div>
        <h1 className="mt-5 text-lg font-semibold">功能暂未开放</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          当前功能暂时不可用，可能是商城模块、支付模块或相关服务还未开启。您可以先返回首页，或联系客服确认。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="inline-flex items-center gap-2 rounded-full btn-theme-price px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Home size={15} />
            返回首页
          </button>
          <button
            type="button"
            onClick={() => navigate("/support-download?tab=support")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text)]"
          >
            <Headphones size={15} />
            联系客服
          </button>
        </div>
      </div>
    </div>
  );
}
