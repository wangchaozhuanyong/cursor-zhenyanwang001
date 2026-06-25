import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
};

export default function SectionHeader({
  title,
  description,
  action,
  eyebrow,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("sf-next-section-header", className)}>
      <div className="sf-next-section-header__copy">
        {eyebrow ? <p className="sf-next-section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="sf-next-section-header__title">{title}</h2>
        {description ? <p className="sf-next-section-header__desc">{description}</p> : null}
      </div>
      {action ? <div className="sf-next-section-header__action">{action}</div> : null}
    </div>
  );
}
