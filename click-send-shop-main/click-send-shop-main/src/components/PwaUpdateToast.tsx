import { useCallback, useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { trackEvent } from "@/services/analyticsService";

/** 等待 SW 激活的最长时间，超时后仍强制刷新页面 */
const SW_UPDATE_TIMEOUT_MS = 2000;

export default function PwaUpdateToast() {
  const trackedAvailableRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleDismiss = useCallback(() => {
    if (refreshing) return;
    setNeedRefresh(false);
  }, [refreshing, setNeedRefresh]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    void trackEvent({ event_type: "pwa_update_accepted", module: "pwa", page: window.location.pathname });
    setNeedRefresh(false);

    try {
      await Promise.race([
        updateServiceWorker(true),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, SW_UPDATE_TIMEOUT_MS);
        }),
      ]);
    } catch {
      // 忽略 SW 异常，下面仍会整页刷新以加载最新静态资源
    }

    window.location.reload();
  }, [refreshing, setNeedRefresh, updateServiceWorker]);

  if (!needRefresh) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-desc"
      className="pointer-events-auto fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] left-1/2 z-[120] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] md:bottom-4"
    >
      <p id="pwa-update-title" className="text-sm font-semibold text-[var(--theme-text)]">
        发现新版本
      </p>
      <p id="pwa-update-desc" className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
        点击刷新后将更新到最新内容。建议先确认当前操作已完成。
      </p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={refreshing}
          onClick={handleDismiss}
          className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)] disabled:opacity-50"
        >
          稍后
        </button>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => {
            void handleRefresh();
          }}
          className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-70"
        >
          {refreshing ? "正在刷新…" : "刷新更新"}
        </button>
      </div>
    </div>
  );
}
