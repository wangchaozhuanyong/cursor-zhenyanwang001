import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { cn } from "@/lib/utils";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";

type AdminSiteLogoProps = {
  /** sm: regular admin chrome; lg: login page */
  size?: "sm" | "lg";
  className?: string;
};

function AdminSiteLogoView({
  size,
  className,
  logoSrc,
  alt,
  fallbackText,
}: {
  size: "sm" | "lg";
  className?: string;
  logoSrc?: string;
  alt: string;
  fallbackText: string;
}) {
  const boxClass = size === "lg"
    ? "admin-site-logo admin-site-logo--lg rounded-2xl"
    : "admin-site-logo admin-site-logo--sm rounded-xl";

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

export default function AdminSiteLogo({ size = "sm", className }: AdminSiteLogoProps) {
  const siteInfo = useSiteInfo();
  const { locale } = useAdminTOptional();
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const siteName = siteInfo.siteName?.trim() || "";
  const isEnglish = locale === "en";
  const hasCjkSiteName = /[\u4e00-\u9fff]/.test(siteName);
  const alt = siteName && !(isEnglish && hasCjkSiteName)
    ? siteName
    : isEnglish
      ? "Site logo"
      : "\u7ad9\u70b9 Logo";
  const fallbackText = isEnglish && hasCjkSiteName ? "A" : alt.slice(0, 1);

  return (
    <AdminSiteLogoView
      size={size}
      className={className}
      logoSrc={logoSrc}
      alt={alt}
      fallbackText={fallbackText}
    />
  );
}
