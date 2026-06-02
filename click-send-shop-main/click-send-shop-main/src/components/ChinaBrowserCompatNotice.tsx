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
      <div className="mx-auto flex max-w-screen-xl items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 shadow-sm dark:bg-amber-950/90 dark:text-amber-50">
        <p className="min-w-0 flex-1">{hint}</p>
        <UnifiedButton
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded px-2 py-0.5 font-medium text-amber-900/80 hover:bg-amber-200/60 dark:text-amber-100 dark:hover:bg-amber-900"
        >
          知道了
        </UnifiedButton>
      </div>
    </div>
  );
}
