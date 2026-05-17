import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Percent } from "lucide-react";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import type { MarketingActivitySummary } from "@/services/marketingService";
import { AnimatedSection } from "@/modules/micro-interactions";

export default function MarketingFullReductionSection({ delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const [list, setList] = useState<MarketingActivitySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeBootstrap();
    if (Array.isArray(cached?.marketing?.fullReductionNotices)) {
      setList(cached?.marketing?.fullReductionNotices as MarketingActivitySummary[]);
    }
    homeService.fetchHomeBootstrap().then((bootstrap) => {
      if (cancelled) return;
      if (Array.isArray(bootstrap?.marketing?.fullReductionNotices)) {
        setList(bootstrap.marketing.fullReductionNotices as MarketingActivitySummary[]);
        return;
      }
      return marketingService.fetchFullReductionNotices().then((data) => {
        if (!cancelled) setList(data);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!list.length) return null;

  return (
    <AnimatedSection delay={delay}>
    <section className="w-full">
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
    </AnimatedSection>
  );
}
