import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { cn } from "@/lib/utils";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";

type AdminSiteLogoProps = {
  /** sm: 36px; lg: login page 64px */
  size?: "sm" | "lg";
  className?: string;
};

export default function AdminSiteLogo({ size = "sm", className }: AdminSiteLogoProps) {
  const siteInfo = useSiteInfo();
  const { locale } = useAdminTOptional();
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const siteName = siteInfo.siteName?.trim() || "";
  const isEnglish = locale === "en";
  const hasCjkSiteName = /[\u4e00-\u9fff]/.test(siteName);
  const alt = siteName && !(isEnglish && hasCjkSiteName) ? siteName : isEnglish ? "Site logo" : "站点 Logo";
  const fallbackText = isEnglish && hasCjkSiteName ? "A" : alt.slice(0, 1);

  const boxClass =
    size === "lg"
      ? "h-16 w-16 rounded-2xl"
      : "h-9 w-9 rounded-lg";

  if (!logoSrc) {
    return (
      <div
        className={cn(
          boxClass,
          "flex shrink-0 items-center justify-center bg-[var(--theme-surface)] text-sm font-bold text-[var(--theme-text-on-surface)] ring-1 ring-[color-mix(in_srgb,var(--theme-border)_80%,transparent)]",
          className,
        )}
        aria-label={alt}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={cn(
        boxClass,
        "shrink-0 bg-[var(--theme-surface)] object-contain ring-1 ring-[color-mix(in_srgb,var(--theme-border)_80%,transparent)]",
        className,
      )}
      decoding="async"
    />
  );
}
