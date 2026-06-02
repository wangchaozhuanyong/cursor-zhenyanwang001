import { RefreshCcw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Tx } from "@/components/admin/AdminText";

const ADMIN_OFFLINE_RETRY_EVENT = "admin:offline-retry";
const RETRY_NOTICE_MS = 3_200;

type AdminOfflineRetryState = "idle" | "waiting" | "retrying" | "success" | "failed";

function getOnlineState() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getMessage(online: boolean, retryState: AdminOfflineRetryState): string {
  if (!online) {
    return "\u7f51\u7edc\u8fde\u63a5\u5df2\u65ad\u5f00\uff0c\u540e\u53f0\u8bfb\u53d6\u6570\u636e\u4f1a\u5728\u6062\u590d\u8054\u7f51\u540e\u5c1d\u8bd5\u81ea\u52a8\u91cd\u8bd5\u3002";
  }
  if (retryState === "waiting") {
    return "\u6b63\u5728\u7b49\u5f85\u7f51\u7edc\u6062\u590d\uff0c\u540e\u53f0\u8bfb\u53d6\u8bf7\u6c42\u4f1a\u81ea\u52a8\u91cd\u8bd5\u3002";
  }
  if (retryState === "retrying") {
    return "\u5df2\u6062\u590d\u8054\u7f51\uff0c\u6b63\u5728\u81ea\u52a8\u91cd\u8bd5\u540e\u53f0\u8bfb\u53d6\u8bf7\u6c42\u3002";
  }
  if (retryState === "success") {
    return "\u7f51\u7edc\u5df2\u6062\u590d\uff0c\u540e\u53f0\u8bfb\u53d6\u8bf7\u6c42\u5df2\u91cd\u8bd5\u6210\u529f\u3002";
  }
  return "\u7f51\u7edc\u5df2\u6062\u590d\uff0c\u4f46\u540e\u53f0\u8bfb\u53d6\u8bf7\u6c42\u91cd\u8bd5\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u5237\u65b0\u5f53\u524d\u9875\u3002";
}

export default function AdminOfflineBanner() {
  const [online, setOnline] = useState(getOnlineState);
  const [retryState, setRetryState] = useState<AdminOfflineRetryState>("idle");

  useEffect(() => {
    const update = () => setOnline(getOnlineState());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleRetry = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: AdminOfflineRetryState }>).detail;
      const state = detail?.state;
      if (!state) return;
      setRetryState(state);
      if (state === "success" || state === "failed") {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setRetryState("idle"), RETRY_NOTICE_MS);
      }
    };

    window.addEventListener(ADMIN_OFFLINE_RETRY_EVENT, handleRetry);
    return () => {
      window.removeEventListener(ADMIN_OFFLINE_RETRY_EVENT, handleRetry);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (online && retryState === "idle") return null;

  const busy = retryState === "waiting" || retryState === "retrying";
  const message = getMessage(online, retryState);

  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-[color-mix(in_srgb,var(--theme-warning)_35%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-warning)_12%,var(--theme-surface))] px-3 py-2 text-xs font-medium text-[var(--theme-text)]"
      role="status"
      aria-live="polite"
    >
      {busy ? <RefreshCcw size={14} className="animate-spin" aria-hidden /> : <WifiOff size={14} aria-hidden />}
      <span>
        <Tx>{message}</Tx>
      </span>
    </div>
  );
}
