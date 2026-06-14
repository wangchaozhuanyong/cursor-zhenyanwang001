import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StorefrontBadgeTone = "hot" | "new" | "sale" | "normal";

const toneClassName: Record<StorefrontBadgeTone, string> = {
  hot: "bg-[color-mix(in_srgb,var(--theme-price)_92%,white_8%)] text-[var(--theme-price-foreground)] shadow-[0_6px_16px_color-mix(in_srgb,var(--theme-price)_20%,transparent)]",
  new: "border border-[color-mix(in_srgb,var(--theme-primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] text-[var(--theme-primary)]",
  sale: "bg-[color-mix(in_srgb,var(--theme-price)_92%,white_8%)] text-[var(--theme-price-foreground)] shadow-[0_6px_16px_color-mix(in_srgb,var(--theme-price)_18%,transparent)]",
  normal: "border border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] text-[var(--theme-text-muted)]",
};

type StorefrontBadgeProps = {
  children: ReactNode;
  tone?: StorefrontBadgeTone;
  className?: string;
};

export default function StorefrontBadge({ children, tone = "normal", className }: StorefrontBadgeProps) {
  return (
    <span className={cn("inline-flex h-5 max-w-full items-center rounded-full px-2 text-[10px] font-black leading-none", toneClassName[tone], className)}>
      {children}
    </span>
  );
}
