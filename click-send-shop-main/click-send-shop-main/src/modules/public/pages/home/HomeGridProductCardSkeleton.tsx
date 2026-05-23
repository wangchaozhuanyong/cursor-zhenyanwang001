import { cn } from "@/lib/utils";
import {
  HOME_PRODUCT_CARD_MEDIA,
  HOME_PRODUCT_CARD_SHELL,
  HOME_PRODUCT_IMAGE_PRODUCT_CLASS,
  HOME_PRODUCT_INFO_CLASS,
} from "@/constants/homeProductCard";

export default function HomeGridProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(HOME_PRODUCT_CARD_SHELL, "animate-pulse", className)} aria-hidden>
      <div className={cn(HOME_PRODUCT_CARD_MEDIA, HOME_PRODUCT_IMAGE_PRODUCT_CLASS)}>
        <div className="h-full w-full bg-[var(--theme-bg)]" />
      </div>
      <div className={HOME_PRODUCT_INFO_CLASS}>
        <div className="h-3.5 w-full rounded bg-[var(--theme-bg)]" />
        <div className="mt-1.5 h-3.5 w-4/5 rounded bg-[var(--theme-bg)]" />
        <div className="mt-2 h-3 w-1/3 rounded bg-[var(--theme-bg)]" />
      </div>
    </div>
  );
}
