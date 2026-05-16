import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

type BadgeType = "hot" | "new" | "sale" | "coupon" | "success" | "warning" | "danger" | "neutral";

interface StoreBadgeProps {
  type?: BadgeType;
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
  className,
  children,
}: PropsWithChildren<StoreBadgeProps>) {
  const { themeConfig } = useThemeRuntime();
  const tone = typeTone[type];
  const foreground = typeForeground[type];

  const style =
    themeConfig.badgeStyle === "solid"
      ? { backgroundColor: tone, color: foreground, borderColor: "transparent" }
      : themeConfig.badgeStyle === "outline"
        ? { backgroundColor: "transparent", color: tone, borderColor: tone }
        : { backgroundColor: `color-mix(in srgb, ${tone} 16%, white)`, color: tone, borderColor: "transparent" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
