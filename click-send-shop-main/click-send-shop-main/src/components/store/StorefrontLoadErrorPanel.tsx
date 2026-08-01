import { RefreshCw, Headphones, Grid3X3 } from "lucide-react";
import { storefrontDisplayErrorMessage, storefrontErrorHint } from "@/utils/storefrontError";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

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
  const navigate = useStorefrontNavigate();
  const { localizedPath, t } = usePublicLocale();
  const hint = storefrontErrorHint(message);
  const displayMessage = storefrontDisplayErrorMessage(message);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        compact
          ? `sf-fixed-load-error is-compact ${THEME_ALERT_ERROR_SOFT}`
          : `sf-fixed-load-error ${THEME_ALERT_ERROR_SOFT}`
      }
    >
      <p className="font-medium text-[var(--theme-text)]">{displayMessage}</p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]">
          {hint}
        </p>
      ) : null}
      <div className="sf-fixed-load-error__actions">
        {onRetry ? (
          <UnifiedButton
            type="button"
            onClick={onRetry}
            className="sf-fixed-overlay-action is-primary"
          >
            <RefreshCw size={14} />
            {t("common.retry")}
          </UnifiedButton>
        ) : null}
        {showBrowseCategories ? (
          <UnifiedButton
            type="button"
            onClick={() => navigate(localizedPath("/categories"))}
            className="sf-fixed-overlay-action"
          >
            <Grid3X3 size={14} />
            {t("common.categories")}
          </UnifiedButton>
        ) : null}
        {showContactSupport ? (
          <UnifiedButton
            type="button"
            onClick={() => navigate(localizedPath("/support-download?tab=support"))}
            className="sf-fixed-overlay-action"
          >
            <Headphones size={14} />
            {t("common.contactSupport")}
          </UnifiedButton>
        ) : null}
      </div>
    </div>
  );
}
