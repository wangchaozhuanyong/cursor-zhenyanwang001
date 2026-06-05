import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import * as homeService from "@/services/homeService";
import { fetchFlashSaleHome, type FlashSaleHomeActivity } from "@/services/marketingService";
import { AnimatedSection } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minsRaw = Math.floor((s % 3600) / 60);
  const mins = s > 0 && days === 0 && hours === 0 ? Math.max(1, minsRaw) : minsRaw;

  if (days > 0) return `${days}天 ${hours}小时 ${mins}分钟`;
  if (hours > 0) return `${hours}小时 ${mins}分钟`;
  return `${mins}分钟`;
}

export default function FlashSaleSection({ delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<FlashSaleHomeActivity | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeBootstrap();
    if (cached?.marketing?.flashSale) {
      const data = cached.marketing.flashSale as FlashSaleHomeActivity;
      setActivity(data);
      setCountdown(data?.countdown_seconds ?? 0);
    }
    homeService
      .fetchHomeBootstrap()
      .then((bootstrap) => {
        if (cancelled) return;
        const data = (bootstrap?.marketing?.flashSale || null) as FlashSaleHomeActivity | null;
        if (data) {
          setActivity(data);
          setCountdown(data?.countdown_seconds ?? 0);
          return;
        }
        return fetchFlashSaleHome("home_flash_sale").then((data) => {
          if (cancelled) return;
          setActivity(data ?? null);
          setCountdown(data?.countdown_seconds ?? 0);
        });
      })
      .catch(() => {
        if (!cancelled) setActivity(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activity || countdown <= 0) return;
    const t = window.setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [activity, countdown]);

  if (!activity?.items?.length) return null;

  return (
    <AnimatedSection delay={delay}>
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="store-section-title truncate text-[var(--theme-text)]">{activity.title}</h2>
          {activity.subtitle ? (
            <p className="truncate text-xs text-[var(--theme-text-muted)]">{activity.subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--theme-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--theme-primary)]">
          <Clock size={14} />
          {formatCountdown(countdown)}
        </div>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {activity.items.map((item) => (
          <UnifiedButton
            key={item.product_id}
            type="button"
            onClick={() => navigate(`/product/${item.product_id}`)}
            className="w-[140px] shrink-0 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-left theme-shadow"
          >
            <img
              src={item.cover_image}
              alt={item.product_name}
              width={280}
              height={280}
              className="aspect-square w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="space-y-1 p-2.5">
              <p className="line-clamp-2 text-xs font-medium text-[var(--theme-text)]">{item.product_name}</p>
              <p className="text-sm font-bold text-[var(--theme-price)]">RM {item.flash_price}</p>
              <p className="text-[10px] text-[var(--theme-text-muted)] line-through">RM {item.original_price}</p>
              <p className="text-[10px] text-[var(--theme-text-muted)]">剩 {item.remaining_stock} 件</p>
              <span className="inline-block rounded-full bg-[var(--theme-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-primary-foreground)]">
                立即购买
              </span>
            </div>
          </UnifiedButton>
        ))}
      </div>
    </section>
    </AnimatedSection>
  );
}
