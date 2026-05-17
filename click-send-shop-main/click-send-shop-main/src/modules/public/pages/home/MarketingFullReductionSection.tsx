import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Percent } from "lucide-react";
import * as marketingService from "@/services/marketingService";
import type { MarketingActivitySummary } from "@/services/marketingService";

export default function MarketingFullReductionSection() {
  const navigate = useNavigate();
  const [list, setList] = useState<MarketingActivitySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    marketingService.fetchFullReductionNotices().then((data) => {
      if (!cancelled) setList(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!list.length) return null;

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-3">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--theme-text)]">
        <Percent size={16} className="text-[var(--theme-primary)]" />
        满减特惠
      </h2>
      <div className="flex flex-wrap gap-2">
        {list.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate("/categories")}
            className="rounded-full border border-[var(--theme-primary)]/30 bg-[var(--theme-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--theme-primary)]"
          >
            {item.promo_label}
          </button>
        ))}
      </div>
    </section>
  );
}
