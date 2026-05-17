import logoWebp from "@/assets/logo.webp";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";

type AdminSiteLogoProps = {
  /** sm：侧栏 36px；lg：登录页 64px */
  size?: "sm" | "lg";
  className?: string;
};

export default function AdminSiteLogo({ size = "sm", className }: AdminSiteLogoProps) {
  const siteInfo = useSiteInfo();
  const logoSrc = (siteInfo.logoUrl || "").trim() || logoWebp;
  const alt = siteInfo.siteName?.trim() || "站点 Logo";

  const boxClass =
    size === "lg"
      ? "h-16 w-16 rounded-2xl"
      : "h-9 w-9 rounded-lg";

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
