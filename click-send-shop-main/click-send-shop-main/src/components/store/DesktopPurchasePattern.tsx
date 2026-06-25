import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DesktopPurchaseTwoColumnProps = {
  children: ReactNode;
  aside: ReactNode;
  className?: string;
  contentClassName?: string;
  asideClassName?: string;
};

type DesktopPurchaseCardProps = {
  children: ReactNode;
  title?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function DesktopPurchaseTwoColumn({
  children,
  aside,
  className,
  contentClassName,
  asideClassName,
}: DesktopPurchaseTwoColumnProps) {
  return (
    <div
      className={cn(
        "md:block lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-10",
        className,
      )}
    >
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
      <div className={cn("mt-6 hidden md:block lg:hidden", asideClassName)}>{aside}</div>
      <aside
        className={cn(
          "mt-6 hidden self-start lg:sticky lg:top-[var(--sf-next-header-tablet-sticky-top)] lg:mt-0 lg:block xl:top-[var(--sf-next-header-desktop-sticky-top)]",
          asideClassName,
        )}
      >
        {aside}
      </aside>
    </div>
  );
}

export function DesktopPurchaseCard({
  children,
  title,
  eyebrow,
  footer,
  className,
  bodyClassName,
}: DesktopPurchaseCardProps) {
  return (
    <section
      className={cn(
        "sf-next-theme-radius border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sf-next-theme-shadow",
        className,
      )}
    >
      {title || eyebrow ? (
        <div className="mb-4 rounded-2xl bg-[var(--theme-bg)] px-4 py-3">
          {eyebrow ? <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p> : null}
          {title ? <h2 className="mt-1 text-lg font-extrabold text-foreground">{title}</h2> : null}
        </div>
      ) : null}
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

export function DesktopPurchaseActionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden max-w-xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] md:block",
        className,
      )}
    >
      {children}
    </div>
  );
}
