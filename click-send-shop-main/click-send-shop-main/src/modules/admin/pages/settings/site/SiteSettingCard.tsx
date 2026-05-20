import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function SiteSettingCard({ title, description, children, className = "" }: Props) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 space-y-4 ${className}`}>
      {title ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
