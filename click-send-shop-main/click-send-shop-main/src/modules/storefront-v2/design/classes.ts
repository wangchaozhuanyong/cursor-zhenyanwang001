import { cn } from "@/lib/utils";
import { storefrontV2Tokens as t } from "./tokens";

export function storefrontPageClassName(className?: string) {
  return cn(
    "mx-auto w-full pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-8",
    t.page.maxWidth,
    t.page.mobilePadding,
    t.page.desktopPadding,
    className,
  );
}

export function storefrontSectionClassName(className?: string) {
  return cn("w-full", className);
}

export function storefrontCardClassName(className?: string) {
  return cn(
    "bg-[var(--theme-surface)]",
    t.radius.card,
    t.border.soft,
    t.shadow.card,
    "transition duration-200",
    t.shadow.hover,
    className,
  );
}
