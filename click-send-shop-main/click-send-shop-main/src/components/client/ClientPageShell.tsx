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
        <header className={cn("client-page-shell__header", headerClassName)}>
          <div className="client-page-shell__header-copy">
            {eyebrow ? <p className="client-page-shell__eyebrow">{eyebrow}</p> : null}
            {title ? <h1 className="client-page-shell__title">{title}</h1> : null}
            {description ? <p className="client-page-shell__desc">{description}</p> : null}
          </div>
          {action ? <div className="client-page-shell__action">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn("client-page-shell__content", contentClassName)}>{children}</div>
    </>
  );

  return (
    <div
      className={cn(
        "client-page client-page-shell",
        withBottomSafeArea && "client-page-shell--bottom-safe",
        className,
      )}
    >
      {withContainer ? (
        <div className={cn("client-container client-page-shell__container", containerClassName)}>
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}
