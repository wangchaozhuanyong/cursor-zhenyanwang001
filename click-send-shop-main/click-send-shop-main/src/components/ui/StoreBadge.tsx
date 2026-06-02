import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

type BadgeType = "hot" | "new" | "sale" | "coupon" | "success" | "warning" | "danger" | "neutral";

interface StoreBadgeProps {
  type?: BadgeType;
  /** 叠在商品图等复杂背景上：使用主题实色 + 自动前景色，忽略半透明 outline/soft */
  onMedia?: boolean;
  className?: string;
}

const typeTone: Record<BadgeType, string> = {
  hot: "var(--theme-price)",
  new: "var(--theme-primary)",
  sale: "var(--theme-secondary)",
  coupon: "var(--theme-accent)",
  success: "var(--theme-success)",
  warning: "var(--theme-warning)",
  danger: "var(--theme-danger)",
  neutral: "var(--theme-text)",
};

const typeForeground: Record<BadgeType, string> = {
  hot: "var(--theme-price-foreground)",
  new: "var(--theme-primary-foreground)",
  sale: "var(--theme-secondary-foreground)",
  coupon: "var(--theme-accent-foreground)",
  success: "var(--theme-success-foreground)",
  warning: "var(--theme-warning-foreground)",
  danger: "var(--theme-danger-foreground)",
  neutral: "var(--theme-text)",
};

export default function StoreBadge({
  type = "neutral",
  onMedia = false,
  className,
  children,
}: PropsWithChildren<StoreBadgeProps>) {
  const { themeConfig } = useThemeRuntime();
  const tone = typeTone[type];
  const foreground = typeForeground[type];

  const style = onMedia
    ? {
        backgroundColor: tone,
        color: foreground,
        borderColor: "color-mix(in srgb, var(--theme-text) 18%, transparent)",
        boxShadow:
          "0 1px 2px color-mix(in srgb, var(--theme-text) 28%, transparent), 0 0 0 1px color-mix(in srgb, var(--theme-surface) 35%, transparent)",
      }
    : themeConfig.badgeStyle === "solid"
      ? { backgroundColor: tone, color: foreground, borderColor: "transparent" }
      : themeConfig.badgeStyle === "outline"
        ? { backgroundColor: "transparent", color: tone, borderColor: tone }
        : { backgroundColor: `color-mix(in srgb, ${tone} 16%, var(--theme-surface))`, color: tone, borderColor: "transparent" };

  return (
    <span
      className={cn(
        "store-badge inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        `store-badge--${type}`,
        onMedia && "store-badge--on-media shadow-sm backdrop-blur-[2px]",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
