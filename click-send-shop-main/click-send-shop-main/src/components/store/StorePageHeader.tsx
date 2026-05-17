import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";

export type StorePageHeaderProps = {
  title: ReactNode;
  /** 与标题同一行、靠右伸展（如分类页搜索框） */
  titleInlineSlot?: ReactNode;
  subtitle?: string;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
};

export default function StorePageHeader({
  title,
  titleInlineSlot,
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
            {titleInlineSlot ? (
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <h1 className="shrink-0 text-lg font-bold tracking-tight text-[var(--theme-text)]">{title}</h1>
                <div className="min-w-0 flex-1 overflow-hidden">{titleInlineSlot}</div>
              </div>
            ) : (
              <>
                <h1 className="flex min-w-0 items-baseline gap-0 truncate text-lg font-bold tracking-tight text-[var(--theme-text)]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--theme-text-muted)]">{subtitle}</p>
                ) : null}
              </>
            )}
          </div>
          {rightSlot ? <div className="flex shrink-0 items-center gap-2">{rightSlot}</div> : null}
        </div>
        {bottomSlot ? <div className="pb-2.5">{bottomSlot}</div> : null}
      </div>
    </header>
  );
}
