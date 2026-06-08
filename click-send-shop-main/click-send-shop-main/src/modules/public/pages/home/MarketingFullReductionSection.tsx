import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Percent } from "lucide-react";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import type { MarketingActivitySummary } from "@/services/marketingService";
import { AnimatedSection } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function MarketingFullReductionSection({ delay = 0, title = "满减特惠" }: { delay?: number; title?: string }) {
  const navigate = useNavigate();
  const [list, setList] = useState<MarketingActivitySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeMarketing();
    if (Array.isArray(cached?.fullReductionNotices)) {
      setList(cached.fullReductionNotices as MarketingActivitySummary[]);
    }
    homeService.fetchHomeMarketing().then((marketing) => {
      if (cancelled) return;
      if (Array.isArray(marketing?.fullReductionNotices)) {
        setList(marketing.fullReductionNotices as MarketingActivitySummary[]);
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
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {list.map((item) => (
          <UnifiedButton
            key={item.id}
            type="button"
            onClick={() => navigate("/categories")}
            className="rounded-full border border-[var(--theme-primary)]/30 bg-[var(--theme-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--theme-primary)]"
          >
            {item.promo_label}
          </UnifiedButton>
        ))}
      </div>
    </section>
    </AnimatedSection>
  );
}
