import type { ThemeConfig } from "@/types/theme";

export function getMemberCardClassName(style: ThemeConfig["memberCardStyle"]): string {
  switch (style) {
    case "blackGold":
      return "bg-[linear-gradient(110deg,#0d0b08,#1e1812_45%,#2b2016)] text-[#f7e6be]";
    case "gold":
      return "bg-[linear-gradient(110deg,#f4e7c8,#dec08b)] text-[#2f2415]";
    case "fresh":
      return "bg-[linear-gradient(110deg,#edf9f4,#d8efe4)] text-[#173429]";
    case "light":
    default:
      return "bg-[linear-gradient(110deg,#191714,#2a241d)] text-[#f2deab]";
  }
}

export function getCategoryIconShellClassName(style: ThemeConfig["categoryIconStyle"]): string {
  const base = "flex h-10 w-10 items-center justify-center text-xs font-semibold";
  switch (style) {
    case "circle":
      return `${base} rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]`;
    case "soft":
      return `${base} rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] text-[var(--theme-primary)]`;
    case "solid":
      return `${base} rounded-xl bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]`;
    case "outline":
      return `${base} rounded-full border border-[var(--theme-primary)] bg-transparent text-[var(--theme-primary)]`;
    default:
      return `${base} rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]`;
  }
}

export function getBottomNavShellClassName(
  navStyle: ThemeConfig["navStyle"],
  placement: "fixed" | "sticky" | "absolute",
): string {
  const position = placement;
  const base = `${position} bottom-0 left-0 right-0 z-bottom-nav pointer-events-auto`;
  switch (navStyle) {
    case "floating":
      return `${base} border-0 bg-transparent px-3 pb-2 pt-1 shadow-none`;
    case "glass":
      return `${base} border-t border-[color-mix(in_srgb,var(--theme-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_78%,transparent)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md`;
    case "clean":
    default:
      return `${base} border-t border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]`;
  }
}

export function getBottomNavInnerClassName(navStyle: ThemeConfig["navStyle"]): string {
  if (navStyle === "floating") {
    return "mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_8px_32px_rgba(0,0,0,0.14)]";
  }
  return "mx-auto max-w-lg";
}

export function getBannerContainerClassName(bannerStyle: ThemeConfig["bannerStyle"]): string {
  switch (bannerStyle) {
    case "premium":
      return "rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)]";
    case "deal":
      return "rounded-xl ring-2 ring-[color-mix(in_srgb,var(--theme-price)_55%,transparent)]";
    case "dark":
      return "rounded-xl shadow-inner";
    case "fresh":
      return "rounded-2xl border border-[color-mix(in_srgb,var(--theme-primary)_25%,var(--theme-border))] shadow-[0_8px_24px_rgba(0,0,0,0.06)]";
    case "clean":
    default:
      return "";
  }
}

export function getBannerOverlayClassName(bannerStyle: ThemeConfig["bannerStyle"]): string | null {
  switch (bannerStyle) {
    case "premium":
      return "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent";
    case "deal":
      return "pointer-events-none absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--theme-danger)_28%,transparent)] to-transparent";
    case "dark":
      return "pointer-events-none absolute inset-0 bg-black/35";
    case "fresh":
      return "pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-[color-mix(in_srgb,var(--theme-primary)_8%,transparent)]";
    default:
      return null;
  }
}
