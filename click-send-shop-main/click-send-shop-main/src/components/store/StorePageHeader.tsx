import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";

export type StorePageHeaderProps = {
  title: ReactNode;
  leftSlot?: ReactNode;
  /** 与标题同一行、靠右伸展（如分类页搜索框） */
  titleInlineSlot?: ReactNode;
  /** 显示在标题上方；需配合 centerTitle 才能在顶栏水平居中 */
  eyebrow?: ReactNode;
  /** 标题区水平居中（左右 slot 仍贴边，避免与居中标题重叠） */
  centerTitle?: boolean;
  subtitle?: string;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  matchTabHeaderHeight?: boolean;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
};

export default function StorePageHeader({
  title,
  leftSlot,
  titleInlineSlot,
  eyebrow,
  centerTitle = false,
  subtitle,
  rightSlot,
  bottomSlot,
  matchTabHeaderHeight = false,
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
        "sf-next-store-page-header z-header border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]",
        transparent ? "bg-transparent" : surfaceClass,
        className,
      )}
    >
      <div className="sf-next-store-page-header__inner mx-auto w-full max-w-screen-xl px-[var(--store-header-x)]">
        <div
          className={cn(
            "flex items-center gap-3",
            matchTabHeaderHeight
              ? "h-[var(--store-tab-header-height)] min-h-[var(--store-tab-header-height)] py-0"
              : "min-h-14 py-2",
            centerTitle && !titleInlineSlot && "relative justify-center",
          )}
        >
          {leftSlot ? (
            <div
              className={cn(
                "flex shrink-0 items-center",
                titleInlineSlot && "-ml-3",
                centerTitle && !titleInlineSlot && "absolute left-0 top-1/2 z-10 -translate-y-1/2",
              )}
            >
              {leftSlot}
            </div>
          ) : null}
          <div
            className={cn(
              centerTitle && !titleInlineSlot
                ? "flex w-full max-w-full flex-col items-center px-14 text-center sm:px-16"
                : "min-w-0 flex-1",
            )}
          >
            {titleInlineSlot ? (
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <h1 className="sf-next-page-title shrink-0 tracking-tight text-[var(--theme-text)]">{title}</h1>
                <div className="min-w-0 flex-1 overflow-hidden">{titleInlineSlot}</div>
              </div>
            ) : centerTitle ? (
              <div className="flex max-w-full flex-col items-center gap-1">
                {eyebrow ? (
                  <p className="text-xs font-medium leading-none text-[var(--theme-text-muted)]">{eyebrow}</p>
                ) : null}
                <h1 className="sf-next-page-title leading-tight tracking-tight text-[var(--theme-text)]">{title}</h1>
              </div>
            ) : (
              <>
                <h1 className="sf-next-page-title flex min-w-0 items-baseline gap-0 truncate tracking-tight text-[var(--theme-text)]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--theme-text-muted)]">{subtitle}</p>
                ) : null}
              </>
            )}
          </div>
          {rightSlot ? (
            <div
              className={cn(
                "flex shrink-0 items-center gap-2",
                centerTitle && !titleInlineSlot && "absolute right-0 top-1/2 z-10 -translate-y-1/2",
              )}
            >
              {rightSlot}
            </div>
          ) : null}
        </div>
        {bottomSlot ? <div className="pb-2.5">{bottomSlot}</div> : null}
      </div>
    </header>
  );
}
