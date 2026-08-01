import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import "@/styles/fixed-storefront-overlays.css";
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
      className="sf-fixed-compat-notice"
      role="status"
    >
      <div className="sf-fixed-compat-notice__panel">
        <Info size={17} aria-hidden />
        <p>{hint}</p>
        <UnifiedButton
          type="button"
          onClick={dismiss}
          className="sf-fixed-compat-notice__close"
          aria-label="关闭兼容性提示"
        >
          <X size={17} aria-hidden />
        </UnifiedButton>
      </div>
    </div>
  );
}
