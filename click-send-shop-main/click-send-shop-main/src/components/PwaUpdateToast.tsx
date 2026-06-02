import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { trackEvent } from "@/services/analyticsService";
import { getStoreFixedBottomOffset } from "@/utils/storeBottomInset";
import {
  clearDismissedSwToken,
  fetchSwVersionToken,
  isCurrentUpdateDismissed,
  setDismissedSwToken,
} from "@/lib/pwaUpdateDismiss";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

/** 等待 SW 激活的最长时间，超时后仍强制刷新页面 */
const SW_UPDATE_TIMEOUT_MS = 2000;
/** 后台定期检查 SW 更新（避免 immediate 一进站就频繁弹窗） */
const SW_PERIODIC_CHECK_MS = 60 * 60 * 1000;

const PWA_TOAST_ABOVE_BAR_GAP = "0.75rem";

export default function PwaUpdateToast() {
  const location = useLocation();
  const trackedAvailableRef = useRef(false);
  const reloadStartedRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const periodicCheckRef = useRef<number | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const reloadOnce = useCallback(() => {
    if (reloadStartedRef.current) return;
    reloadStartedRef.current = true;
    window.location.reload();
  }, []);

  const waitForControllerChange = useCallback(() => {
    if (!("serviceWorker" in navigator)) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let settled = false;
      let timeoutId = 0;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        navigator.serviceWorker.removeEventListener("controllerchange", finish);
        resolve();
      };

      timeoutId = window.setTimeout(finish, SW_UPDATE_TIMEOUT_MS);
      navigator.serviceWorker.addEventListener("controllerchange", finish);
    });
  }, []);

  const checkForSwUpdate = useCallback(() => {
    const registration = registrationRef.current;
    if (!registration || registration.installing || !navigator.onLine) return;
    void registration.update();
  }, []);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: false,
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration;
      if (!registration) return;

      if (periodicCheckRef.current) {
        window.clearInterval(periodicCheckRef.current);
      }
      periodicCheckRef.current = window.setInterval(() => {
        checkForSwUpdate();
      }, SW_PERIODIC_CHECK_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (periodicCheckRef.current) {
        window.clearInterval(periodicCheckRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkForSwUpdate();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkForSwUpdate]);

  useEffect(() => {
    if (!needRefresh) {
      setShowPrompt(false);
      trackedAvailableRef.current = false;
      return;
    }

    let cancelled = false;
    void (async () => {
      if (await isCurrentUpdateDismissed()) {
        if (!cancelled) setShowPrompt(false);
        return;
      }
      if (cancelled) return;
      setShowPrompt(true);
      if (!trackedAvailableRef.current) {
        trackedAvailableRef.current = true;
        void trackEvent({
          event_type: "pwa_update_available",
          module: "pwa",
          page: window.location.pathname,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needRefresh]);

  const handleDismiss = useCallback(() => {
    if (refreshing) return;
    void (async () => {
      const token = await fetchSwVersionToken();
      if (token) setDismissedSwToken(token);
      setNeedRefresh(false);
      setShowPrompt(false);
    })();
  }, [refreshing, setNeedRefresh]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    void trackEvent({ event_type: "pwa_update_accepted", module: "pwa", page: window.location.pathname });
    setNeedRefresh(false);
    setShowPrompt(false);
    clearDismissedSwToken();

    const controllerChanged = waitForControllerChange();

    try {
      await updateServiceWorker(true);
      await controllerChanged;
    } catch {
      // 忽略 SW 异常，下面仍会整页刷新以加载最新静态资源
    }

    reloadOnce();
  }, [refreshing, reloadOnce, setNeedRefresh, updateServiceWorker, waitForControllerChange]);

  const mobileBottomStyle = useMemo((): CSSProperties => {
    const barOffset = getStoreFixedBottomOffset(location.pathname);
    return {
      "--pwa-toast-bottom": `calc(${barOffset} + ${PWA_TOAST_ABOVE_BAR_GAP})`,
    } as CSSProperties;
  }, [location.pathname]);

  if (!showPrompt) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-desc"
      style={mobileBottomStyle}
      className="pointer-events-auto fixed left-1/2 z-[120] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] max-lg:bottom-[var(--pwa-toast-bottom,5.75rem)] lg:bottom-4"
    >
      <p id="pwa-update-title" className="text-sm font-semibold text-[var(--theme-text)]">
        发现新版本
      </p>
      <p id="pwa-update-desc" className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
        点击刷新后将更新到最新内容。建议先确认当前操作已完成。
      </p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <UnifiedButton
          type="button"
          disabled={refreshing}
          onClick={handleDismiss}
          className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)] disabled:opacity-50"
        >
          稍后
        </UnifiedButton>
        <UnifiedButton
          type="button"
          disabled={refreshing}
          onClick={() => {
            void handleRefresh();
          }}
          className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-70"
        >
          {refreshing ? "正在刷新…" : "刷新更新"}
        </UnifiedButton>
      </div>
    </div>
  );
}
