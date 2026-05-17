import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import * as marketingApi from "@/api/modules/marketing";
import type { FlashSaleHomeActivity } from "@/api/modules/marketing";

function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function FlashSaleSection() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<FlashSaleHomeActivity | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    marketingApi
      .getFlashSaleHome("home_flash_sale")
      .then((res) => {
        if (cancelled) return;
        setActivity(res.data ?? null);
        setCountdown(res.data?.countdown_seconds ?? 0);
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
    <section className="mx-auto max-w-screen-xl px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[var(--theme-text)]">{activity.title}</h2>
          {activity.subtitle ? (
            <p className="truncate text-xs text-[var(--theme-text-muted)]">{activity.subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--theme-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--theme-primary)]">
          <Clock size={14} />
          {formatCountdown(countdown)}
        </div>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {activity.items.map((item) => (
          <button
            key={item.product_id}
            type="button"
            onClick={() => navigate(`/product/${item.product_id}`)}
            className="w-[140px] shrink-0 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-left theme-shadow"
          >
            <img src={item.cover_image} alt={item.product_name} className="aspect-square w-full object-cover" />
            <div className="space-y-1 p-2.5">
              <p className="line-clamp-2 text-xs font-medium text-[var(--theme-text)]">{item.product_name}</p>
              <p className="text-sm font-bold text-[var(--theme-price)]">RM {item.flash_price}</p>
              <p className="text-[10px] text-[var(--theme-text-muted)] line-through">RM {item.original_price}</p>
              <p className="text-[10px] text-[var(--theme-text-muted)]">剩 {item.remaining_stock} 件</p>
              <span className="inline-block rounded-full bg-[var(--theme-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-primary-foreground)]">
                立即购买
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
