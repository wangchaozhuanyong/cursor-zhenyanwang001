import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { trackEvent } from "@/services/analyticsService";

export default function PwaUpdateToast() {
  const trackedAvailableRef = useRef(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });

  useEffect(() => {
    if (!needRefresh || trackedAvailableRef.current) return;
    trackedAvailableRef.current = true;
    void trackEvent({ event_type: "pwa_update_available", module: "pwa", page: window.location.pathname });
  }, [needRefresh]);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] left-1/2 z-toast w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] md:bottom-4">
      <p className="text-sm font-semibold text-[var(--theme-text)]">发现新版本</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">点击刷新后将更新到最新内容。建议先确认当前操作已完成。</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setNeedRefresh(false)} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]">
          稍后
        </button>
        <button
          type="button"
          onClick={() => {
            void trackEvent({ event_type: "pwa_update_accepted", module: "pwa", page: window.location.pathname });
            void updateServiceWorker(true);
          }}
          className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
        >
          刷新更新
        </button>
      </div>
    </div>
  );
}
