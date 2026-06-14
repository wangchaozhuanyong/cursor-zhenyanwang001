import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Flame, ShoppingBag } from "lucide-react";
import * as homeService from "@/services/homeService";
import { fetchFlashSaleHome, type FlashSaleHomeActivity } from "@/services/marketingService";
import ProductCoverImage from "@/components/ProductCoverImage";
import StorePriceAmount from "@/components/store/StorePriceAmount";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { AnimatedSection } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type FlashSaleItem = FlashSaleHomeActivity["items"][number];

function formatMoney(value: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toFixed(2).replace(/\.00$/, "");
}

function padTimePart(value: number) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function getCountdownParts(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (days > 0) {
    return [
      { label: "天", value: String(days) },
      { label: "时", value: padTimePart(hours) },
      { label: "分", value: padTimePart(minutes) },
    ];
  }

  return [
    { label: "时", value: padTimePart(hours) },
    { label: "分", value: padTimePart(minutes) },
    { label: "秒", value: padTimePart(secs) },
  ];
}

function getSoldPercent(item: FlashSaleItem) {
  const stockBase = Number(item.activity_stock) > 0
    ? Number(item.activity_stock)
    : Number(item.sold_count) + Number(item.remaining_stock);
  if (!Number.isFinite(stockBase) || stockBase <= 0) return 0;
  const raw = (Number(item.sold_count) / stockBase) * 100;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(100, Math.max(8, Math.round(raw)));
}

function getDiscountLabel(item: FlashSaleItem) {
  const original = Number(item.original_price);
  const flash = Number(item.flash_price);
  if (!Number.isFinite(original) || !Number.isFinite(flash) || original <= flash || original <= 0) {
    return "限时价";
  }
  return `省 ${Math.round(((original - flash) / original) * 100)}%`;
}

export default function FlashSaleSection({ delay = 0, title = "" }: { delay?: number; title?: string }) {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<FlashSaleHomeActivity | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeMarketing();
    if (cached?.flashSale) {
      const data = cached.flashSale as FlashSaleHomeActivity;
      setActivity(data);
      setCountdown(data?.countdown_seconds ?? 0);
    }
    homeService
      .fetchHomeMarketing()
      .then((marketing) => {
        if (cancelled) return;
        const data = (marketing?.flashSale || null) as FlashSaleHomeActivity | null;
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
  const countdownParts = getCountdownParts(countdown);
  const sectionTitle = title || activity.title || "限时秒杀";
  const sectionSubtitle = activity.subtitle || "今日特价，售完即止";

  return (
    <AnimatedSection delay={delay}>
      <section className="w-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-price)_9%,var(--theme-surface)),var(--theme-surface)_42%,color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-bg)))] p-3.5 theme-shadow sm:p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[var(--theme-price)] text-white shadow-[0_10px_24px_-14px_var(--theme-price)]">
              <Flame size={18} fill="currentColor" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="store-section-title truncate text-[var(--theme-text)]">{sectionTitle}</h2>
                <span className="hidden rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-[var(--theme-price)] ring-1 ring-[color-mix(in_srgb,var(--theme-price)_22%,transparent)] sm:inline-flex">
                  HOT
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--theme-text-muted)]">{sectionSubtitle}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="mb-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-[var(--theme-text-muted)]">
              <Clock size={12} />
              距结束
            </div>
            <div className="flex items-center gap-1">
              {countdownParts.map((part) => (
                <span
                  key={part.label}
                  className="inline-flex min-w-8 flex-col items-center rounded-xl bg-[var(--theme-text)] px-1.5 py-1 text-white shadow-sm"
                >
                  <span className="text-[13px] font-bold tabular-nums leading-none">{part.value}</span>
                  <span className="mt-0.5 text-[9px] leading-none text-white/70">{part.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">
          {activity.items.map((item) => {
            const soldPercent = getSoldPercent(item);
            return (
              <UnifiedButton
                key={item.product_id}
                type="button"
                onClick={() => navigate(`/product/${item.product_id}`)}
                className="group flex w-[176px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--theme-border)_86%,white)] bg-[var(--theme-surface)] text-left transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-price)_42%,var(--theme-border))] hover:shadow-[var(--theme-shadow-hover)]"
              >
                <div className="relative w-full overflow-hidden bg-[var(--store-product-media-bg)]" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}>
                  <ProductCoverImage
                    url={item.cover_image}
                    alt={item.product_name}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="176px"
                    loading="lazy"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[var(--theme-price)] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    {getDiscountLabel(item)}
                  </span>
                </div>
                <div className="flex min-h-[132px] flex-1 flex-col p-3">
                  <p className="line-clamp-2 min-h-[34px] text-xs font-semibold leading-[17px] text-[var(--theme-text)]">
                    {item.product_name}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <StorePriceAmount
                      amount={formatMoney(item.flash_price)}
                      amountClassName="text-[18px] font-extrabold leading-none"
                      currencyClassName="mr-0.5 text-[10px] font-bold leading-none"
                    />
                    {Number(item.original_price) > Number(item.flash_price) ? (
                      <span className="text-[10px] text-[var(--theme-text-muted)] line-through">
                        RM {formatMoney(item.original_price)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-border)_68%,transparent)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--theme-price),var(--theme-primary))]"
                        style={{ width: `${soldPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--theme-text-muted)]">
                      <span className="truncate">已抢 {item.sold_count}</span>
                      <span className="shrink-0">剩 {item.remaining_stock}</span>
                    </div>
                  </div>
                  <span className="mt-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-3 text-xs font-bold text-[var(--theme-primary-foreground)]">
                    <ShoppingBag size={13} />
                    马上抢
                  </span>
                </div>
              </UnifiedButton>
            );
          })}
        </div>
      </section>
    </AnimatedSection>
  );
}
