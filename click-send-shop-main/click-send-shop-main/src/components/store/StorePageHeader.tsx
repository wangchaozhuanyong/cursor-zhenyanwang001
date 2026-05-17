import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";

export type StorePageHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
};

export default function StorePageHeader({
  title,
  subtitle,
  rightSlot,
  bottomSlot,
  sticky = true,
  transparent = false,
  className,
}: StorePageHeaderProps) {
  const { themeConfig } = useThemeRuntime();
  const surfaceClass = transparent
    ? "border-transparent bg-transparent"
    : getStoreHeaderSurfaceClass(themeConfig);

  return (
    <header
      className={cn(
        sticky ? "sticky top-0" : "relative",
        "z-header border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]",
        transparent ? "bg-transparent" : cn(surfaceClass, "bg-[var(--theme-bg)]/92"),
        className,
      )}
    >
      <div className="mx-auto w-full max-w-screen-xl px-4">
        <div className="flex min-h-14 items-center gap-3 py-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight text-[var(--theme-text)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--theme-text-muted)]">{subtitle}</p>
            ) : null}
          </div>
          {rightSlot ? <div className="flex shrink-0 items-center gap-2">{rightSlot}</div> : null}
        </div>
        {bottomSlot ? <div className="pb-2.5">{bottomSlot}</div> : null}
      </div>
    </header>
  );
}
