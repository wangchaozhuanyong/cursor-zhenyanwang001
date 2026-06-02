import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Tx } from "@/components/admin/AdminText";

function getOnlineState() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export default function AdminOfflineBanner() {
  const [online, setOnline] = useState(getOnlineState);

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

  if (online) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-[color-mix(in_srgb,var(--theme-warning)_35%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-warning)_12%,var(--theme-surface))] px-3 py-2 text-xs font-medium text-[var(--theme-text)]"
      role="status"
      aria-live="polite"
    >
      <WifiOff size={14} aria-hidden />
      <span>
        <Tx>网络连接已断开，后台数据可能无法刷新。恢复网络后请刷新当前页面。</Tx>
      </span>
    </div>
  );
}
