import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Tag } from "lucide-react";
import * as marketingService from "@/services/marketingService";
import type { MarketingActivitySummary } from "@/services/marketingService";

type Props = {
  position: "cart_notice" | "checkout_notice" | "profile_center";
  className?: string;
};

export default function MarketingPositionNotices({ position, className = "" }: Props) {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<MarketingActivitySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    marketingService
      .fetchMarketingNotices(position)
      .then((list) => {
        if (!cancelled) setNotices(list);
      })
      .catch(() => {
        if (!cancelled) setNotices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [position]);

  if (!notices.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {notices.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => navigate(n.link_url || "/categories")}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--theme-primary)]/25 bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-3 py-2.5 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]">
            <Tag size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--theme-text)]">{n.title}</p>
            <p className="truncate text-xs text-[var(--theme-text-muted)]">{n.promo_label}</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-[var(--theme-text-muted)]" />
        </button>
      ))}
    </div>
  );
}
