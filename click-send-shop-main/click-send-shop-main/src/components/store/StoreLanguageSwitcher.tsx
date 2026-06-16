import { Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PUBLIC_LOCALES, type PublicLocale, usePublicLocale } from "@/i18n/publicLocale";

type StoreLanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export default function StoreLanguageSwitcher({
  className,
  compact = false,
}: StoreLanguageSwitcherProps) {
  const { locale, switchLocalePath, t } = usePublicLocale();

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 text-[var(--theme-text)] shadow-sm",
        compact ? "h-10" : "h-10",
        className,
      )}
      aria-label={t("common.selectLanguage")}
      title={t("common.selectLanguage")}
    >
      {!compact ? <Languages size={15} className="ml-2 text-[var(--theme-text-muted)]" aria-hidden /> : null}
      {PUBLIC_LOCALES.map((item) => (
        <LocaleLink
          key={item.value}
          item={item}
          active={locale === item.value}
          to={switchLocalePath(item.value)}
          compact={compact}
        />
      ))}
    </div>
  );
}

function LocaleLink({
  item,
  active,
  to,
  compact,
}: {
  item: { value: PublicLocale; shortLabel: string; label: string };
  active: boolean;
  to: string;
  compact: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "true" : undefined}
      aria-label={item.label}
      className={cn(
        "inline-flex min-w-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
        compact ? "h-8 px-2" : "h-8 px-2.5",
        active
          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
          : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]",
      )}
    >
      {compact ? item.shortLabel : item.value === "zh" ? item.shortLabel : item.label}
    </Link>
  );
}
