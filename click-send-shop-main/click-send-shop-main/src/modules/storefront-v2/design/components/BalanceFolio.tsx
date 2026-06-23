import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BalanceFolioMetaItem = {
  label: ReactNode;
  value: ReactNode;
};

export type BalanceFolioProps = {
  eyebrow: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  caption?: ReactNode;
  action?: ReactNode;
  meta?: readonly BalanceFolioMetaItem[];
  className?: string;
};

/**
 * Points / rewards / wallet / logistics summary visual primitive.
 * It is intentionally data-agnostic and must not calculate balances.
 */
export default function BalanceFolio({
  eyebrow,
  value,
  unit,
  caption,
  action,
  meta,
  className,
}: BalanceFolioProps) {
  return (
    <section className={cn("sf-next-folio", className)}>
      <div className="sf-next-folio__topline">
        <span className="sf-next-folio__eyebrow">{eyebrow}</span>

        {action ? <div>{action}</div> : null}
      </div>

      <div className="sf-next-folio__value-row">
        <strong className="sf-next-folio__value">{value}</strong>
        {unit ? <span className="sf-next-folio__unit">{unit}</span> : null}
      </div>

      {caption ? <p className="sf-next-folio__caption">{caption}</p> : null}

      {meta?.length ? (
        <div className="sf-next-folio__meta">
          {meta.map((item, index) => (
            <div key={index} className="sf-next-folio__meta-item">
              <span className="sf-next-folio__meta-label">{item.label}</span>
              <span className="sf-next-folio__meta-value">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
