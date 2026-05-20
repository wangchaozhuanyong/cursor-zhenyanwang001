import { RefreshCw, Headphones, Grid3X3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { storefrontErrorHint } from "@/utils/storefrontError";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";

type Props = {
  message: string;
  onRetry?: () => void;
  showBrowseCategories?: boolean;
  showContactSupport?: boolean;
  compact?: boolean;
};

export default function StorefrontLoadErrorPanel({
  message,
  onRetry,
  showBrowseCategories = true,
  showContactSupport = true,
  compact = false,
}: Props) {
  const navigate = useNavigate();
  const hint = storefrontErrorHint(message);

  return (
    <div
      className={
        compact
          ? `rounded-xl px-4 py-4 text-center text-sm ${THEME_ALERT_ERROR_SOFT}`
          : `rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-8 text-center ${THEME_ALERT_ERROR_SOFT}`
      }
    >
      <p className="font-medium text-[var(--theme-text)]">{message}</p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]">
          {hint}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
          >
            <RefreshCw size={14} />
            重试
          </button>
        ) : null}
        {showBrowseCategories ? (
          <button
            type="button"
            onClick={() => navigate("/categories")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]"
          >
            <Grid3X3 size={14} />
            浏览分类
          </button>
        ) : null}
        {showContactSupport ? (
          <button
            type="button"
            onClick={() => navigate("/support-download?tab=support")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]"
          >
            <Headphones size={14} />
            联系客服
          </button>
        ) : null}
      </div>
    </div>
  );
}
