import { useEffect, useState } from "react";
import { getChinaBrowserCompatHint } from "@/utils/chinaBrowser";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const DISMISS_KEY = "china-browser-compat-hint-dismissed";

/**
 * 国产浏览器壳 / 兼容模式提示（不阻断使用，仅提醒切换极速模式）。
 */
export default function ChinaBrowserCompatNotice() {
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }
    const message = getChinaBrowserCompatHint();
    if (message) setHint(message);
  }, []);

  if (!hint) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setHint(null);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[9996] px-3 pt-[max(env(safe-area-inset-top,0px),0.5rem)]"
      role="status"
    >
      <div className="mx-auto flex max-w-screen-xl items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--theme-warning)_34%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-warning)_14%,var(--theme-surface))] px-3 py-2 text-xs leading-relaxed text-[color-mix(in_srgb,var(--theme-warning)_78%,var(--theme-text-on-surface))] shadow-sm">
        <p className="min-w-0 flex-1">{hint}</p>
        <UnifiedButton
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded px-2 py-0.5 font-medium text-[color-mix(in_srgb,var(--theme-warning)_78%,var(--theme-text-on-surface))] hover:bg-[color-mix(in_srgb,var(--theme-warning)_20%,var(--theme-surface))]"
        >
          知道了
        </UnifiedButton>
      </div>
    </div>
  );
}
