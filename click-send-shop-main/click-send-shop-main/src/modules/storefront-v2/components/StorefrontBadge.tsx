import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StorefrontBadgeTone = "hot" | "new" | "sale" | "normal";

const toneClassName: Record<StorefrontBadgeTone, string> = {
  hot: "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]",
  new: "bg-[color-mix(in_srgb,var(--theme-primary)_16%,var(--theme-surface))] text-[var(--theme-primary)]",
  sale: "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]",
  normal: "border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-muted)]",
};

type StorefrontBadgeProps = {
  children: ReactNode;
  tone?: StorefrontBadgeTone;
  className?: string;
};

export default function StorefrontBadge({ children, tone = "normal", className }: StorefrontBadgeProps) {
  return (
    <span className={cn("inline-flex h-5 max-w-full items-center rounded-full px-2 text-[10px] font-bold leading-none", toneClassName[tone], className)}>
      {children}
    </span>
  );
}
