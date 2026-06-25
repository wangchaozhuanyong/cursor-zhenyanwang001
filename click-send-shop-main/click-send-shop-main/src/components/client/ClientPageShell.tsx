import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ClientPageShellProps = {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  withContainer?: boolean;
  withBottomSafeArea?: boolean;
};

export default function ClientPageShell({
  children,
  title,
  description,
  action,
  eyebrow,
  className,
  containerClassName,
  headerClassName,
  contentClassName,
  withContainer = true,
  withBottomSafeArea = true,
}: ClientPageShellProps) {
  const hasHeader = Boolean(title || description || action || eyebrow);
  const content = (
    <>
      {hasHeader ? (
        <header className={cn("sf-next-page-shell__header", headerClassName)}>
          <div className="sf-next-page-shell__header-copy">
            {eyebrow ? <p className="sf-next-page-shell__eyebrow">{eyebrow}</p> : null}
            {title ? <h1 className="sf-next-page-shell__title">{title}</h1> : null}
            {description ? <p className="sf-next-page-shell__desc">{description}</p> : null}
          </div>
          {action ? <div className="sf-next-page-shell__action">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn("sf-next-page-shell__content", contentClassName)}>{children}</div>
    </>
  );

  return (
    <div
      className={cn(
        "sf-next-page sf-next-page-shell",
        withBottomSafeArea && "sf-next-page-shell--bottom-safe",
        className,
      )}
    >
      {withContainer ? (
        <div className={cn("sf-next-container sf-next-page-shell__container", containerClassName)}>
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}
