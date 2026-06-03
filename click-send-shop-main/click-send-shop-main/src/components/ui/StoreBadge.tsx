import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type BadgeType = "hot" | "new" | "sale" | "coupon" | "success" | "warning" | "danger" | "neutral";

interface StoreBadgeProps {
  type?: BadgeType;
  /** 叠在商品图等复杂背景上：使用主题实色 + 自动前景色，忽略半透明 outline/soft */
  onMedia?: boolean;
  className?: string;
}

const typeTone: Record<BadgeType, string> = {
  hot: "#d86a1f",
  new: "#2f9b77",
  sale: "#d94a3a",
  coupon: "#b98525",
  success: "var(--theme-success)",
  warning: "var(--theme-warning)",
  danger: "var(--theme-danger)",
  neutral: "color-mix(in srgb, var(--theme-text) 72%, var(--theme-surface))",
};

const typeForeground: Record<BadgeType, string> = {
  hot: "#fffaf3",
  new: "#f7fffb",
  sale: "#fff7f4",
  coupon: "#fffaf0",
  success: "var(--theme-success-foreground)",
  warning: "var(--theme-warning-foreground)",
  danger: "var(--theme-danger-foreground)",
  neutral: "var(--theme-surface)",
};

export default function StoreBadge({
  type = "neutral",
  onMedia = false,
  className,
  children,
}: PropsWithChildren<StoreBadgeProps>) {
  const tone = typeTone[type];
  const foreground = typeForeground[type];

  const style = {
    backgroundColor: tone,
    color: foreground,
    borderColor: "color-mix(in srgb, white 34%, transparent)",
    boxShadow: onMedia
      ? "0 8px 16px -12px color-mix(in srgb, var(--theme-text) 42%, transparent), 0 0 0 1px color-mix(in srgb, var(--theme-surface) 40%, transparent)"
      : "0 8px 16px -14px color-mix(in srgb, var(--theme-text) 30%, transparent)",
  };

  return (
    <span
      className={cn(
        "store-badge inline-flex h-[22px] max-w-full items-center rounded-full border px-2 text-[10px] font-extrabold leading-none",
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
