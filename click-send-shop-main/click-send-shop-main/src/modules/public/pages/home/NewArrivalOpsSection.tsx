import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ProgressiveImage } from "@/modules/micro-interactions";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { useHomeTrackingSessionId } from "@/hooks/useHomeTrackingSessionId";
import * as productService from "@/services/productService";
import type { Product } from "@/types/product";
import type { ThemeConfig } from "@/types/theme";
import {
  NEW_ARRIVAL_AUTO_MS,
  NEW_ARRIVAL_OPS_MAX,
  normalizeNewArrivalHeroCopy,
  resolveNewArrivalImage,
  type NewArrivalClickTarget,
} from "./newArrivalOps";

export interface NewArrivalHeroConfig {
  image?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  brandColor?: string;
  siteSlogan?: string;
}

interface NewArrivalOpsSectionProps {
  products: Product[];
  hero: NewArrivalHeroConfig;
  homeLayout?: ThemeConfig["homeLayout"];
  loading?: boolean;
  className?: string;
}

export default function NewArrivalOpsSection({
  products,
  hero,
  homeLayout = "classic",
  loading = false,
  className = "",
}: NewArrivalOpsSectionProps) {
  const navigate = useNavigate();
  const sessionId = useHomeTrackingSessionId();
  const exposedProductIdsRef = useRef<Set<string>>(new Set());
  const touchStartXRef = useRef(0);

  const items = useMemo(() => products.slice(0, NEW_ARRIVAL_OPS_MAX), [products]);
  const [index, setIndex] = useState(0);
  const active = items.length > 0 ? items[index] : null;

  const heroImage = (hero.image || "").trim();
  const copy = useMemo(
    () => normalizeNewArrivalHeroCopy(hero.title, hero.subtitle, hero.ctaText, hero.siteSlogan),
    [hero.title, hero.subtitle, hero.ctaText, hero.siteSlogan],
  );
  const brandTint = (hero.brandColor || "var(--theme-primary)").trim();

  const shiftProduct = useCallback(
    (delta: 1 | -1) => {
      if (items.length <= 1) return;
      setIndex((prev) => (prev + delta + items.length) % items.length);
    },
    [items.length],
  );

  const handleProductTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleProductTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    shiftProduct(diff > 0 ? 1 : -1);
  };

  const trackClick = useCallback(
    (target: NewArrivalClickTarget, productId?: string, itemIndex = index) => {
      void productService.trackHomeEngagement({
        module: "new_arrivals",
        event: "click",
        product_id: productId ?? active?.id,
        session_id: sessionId,
        meta: { index: itemIndex, target },
      });
    },
    [active?.id, index, sessionId],
  );

  const goListPage = useCallback(() => {
    trackClick("new_arrivals_page");
    navigate("/new-arrivals");
  }, [navigate, trackClick]);

  const goProduct = useCallback(
    (product: Product, itemIndex: number) => {
      trackClick("product", product.id, itemIndex);
      navigate(`/product/${product.id}`);
    },
    [navigate, trackClick],
  );

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, NEW_ARRIVAL_AUTO_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  useEffect(() => {
    if (!active?.id) return;
    if (exposedProductIdsRef.current.has(active.id)) return;
    exposedProductIdsRef.current.add(active.id);
    void productService.trackHomeEngagement({
      module: "new_arrivals",
      event: "impression",
      product_id: active.id,
      session_id: sessionId,
      meta: { index },
    });
  }, [active?.id, index, sessionId]);

  const cardClass =
    homeLayout === "magazine"
      ? "rounded-3xl border border-[var(--theme-border)] shadow-2xl"
      : homeLayout === "premium"
        ? "rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_35%,var(--theme-border))] theme-shadow"
        : "rounded-2xl border border-[var(--theme-border)] theme-shadow";

  if (loading) {
    return (
      <section className={`mt-section ${className}`}>
        <SectionHeader onMore={goListPage} />
        <div
          className={`relative overflow-hidden animate-pulse bg-[var(--theme-surface)] ${cardClass}`}
          style={{ minHeight: "min(72vw, 320px)" }}
          aria-busy="true"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--theme-surface),var(--theme-bg),var(--theme-surface))]" />
          <div className="relative flex min-h-[min(72vw,320px)] flex-col justify-end gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 md:max-w-[45%]">
              <div className="h-5 w-40 rounded-md bg-[var(--theme-bg)]" />
              <div className="h-3 w-56 rounded-md bg-[var(--theme-bg)]" />
              <div className="mt-2 h-9 w-28 rounded-full bg-[var(--theme-bg)]" />
            </div>
            <div className="h-[104px] w-full max-w-[220px] rounded-2xl bg-[var(--theme-bg)] md:h-[128px]" />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={`mt-section ${className}`}>
        <SectionHeader onMore={goListPage} />
        <div
          className={`relative overflow-hidden ${cardClass}`}
          style={{ minHeight: "min(72vw, 200px)" }}
        >
          {heroImage ? (
            <>
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/25" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${brandTint} 88%, black), color-mix(in srgb, ${brandTint} 40%, var(--theme-bg)))`,
              }}
            />
          )}
          <div className="relative flex min-h-[min(72vw,200px)] flex-col justify-end p-5">
            <p className="text-lg font-bold text-white">{copy.title}</p>
            {copy.showSubtitle && copy.subtitle ? (
              <p className="mt-1 line-clamp-2 text-xs text-white/85">{copy.subtitle}</p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                trackClick("hero_cta");
                navigate("/new-arrivals");
              }}
              className="mt-4 w-fit rounded-full bg-white px-5 py-2 text-xs font-bold text-[var(--theme-text)]"
            >
              {copy.ctaText}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const activeImage = resolveNewArrivalImage(active, index);

  return (
    <section className={`mt-section ${className}`}>
      <SectionHeader onMore={goListPage} />
      <div
        className={`relative overflow-hidden ${cardClass}`}
        style={{ minHeight: "min(72vw, 320px)" }}
      >
        {heroImage ? (
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${brandTint} 72%, black), var(--theme-surface))`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/50 to-black/20 md:from-black/70 md:via-black/40 md:to-transparent" />

        <div className="relative flex min-h-[min(72vw,320px)] flex-col p-4 md:flex-row md:items-stretch md:gap-6 md:p-6">
          <div className="flex min-w-0 flex-1 flex-col justify-end md:max-w-[48%] md:justify-center">
            <p className="text-lg font-bold leading-snug text-white md:text-xl">{copy.title}</p>
            {copy.showSubtitle && copy.subtitle ? (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/85 md:text-sm">
                {copy.subtitle}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                trackClick("hero_cta");
                navigate("/new-arrivals");
              }}
              className="mt-4 w-fit rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[var(--theme-text)] shadow-md transition hover:opacity-95"
            >
              {copy.ctaText}
            </button>
          </div>

          <div
            className="mt-4 flex shrink-0 flex-col md:mt-0 md:w-[min(42%,220px)] md:justify-center"
            onTouchStart={handleProductTouchStart}
            onTouchEnd={handleProductTouchEnd}
          >
            <button
              type="button"
              onClick={() => active && goProduct(active, index)}
              className="flex items-center gap-3 rounded-2xl bg-white/12 p-2.5 text-left backdrop-blur-sm ring-1 ring-white/20 transition hover:bg-white/18 md:flex-col md:items-center md:p-3"
              aria-label={active ? `查看 ${active.name}` : "查看新品"}
            >
              <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-[var(--theme-bg)] md:h-[112px] md:w-[112px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active?.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0"
                  >
                    {activeImage ? (
                      <ProgressiveImage
                        src={activeImage}
                        blurDataUrl={PRODUCT_BLUR_PLACEHOLDER}
                        alt={active?.name || "新品"}
                        className="h-full w-full bg-transparent"
                        imgClassName="h-full w-full object-cover"
                      />
                    ) : null}
                  </motion.div>
                </AnimatePresence>
                <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--theme-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--theme-primary-foreground)]">
                  新品
                </span>
              </div>
              <div className="min-w-0 flex-1 md:w-full md:text-center">
                <p className="line-clamp-2 text-sm font-semibold text-white">{active?.name}</p>
                <p className="mt-1 text-base font-black text-[var(--theme-price)] md:text-lg">
                  RM {active?.price}
                </p>
              </div>
            </button>

            {items.length > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 md:justify-center">
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`切换到第 ${i + 1} 个新品`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-5 bg-white" : "w-1.5 bg-white/45"
                    }`}
                  />
                ))}
              </div>
            ) : null}

            {items.length > 1 ? (
              <div className="no-scrollbar mt-3 hidden gap-2 overflow-x-auto md:flex">
                {items.map((item, i) => {
                  const thumb = resolveNewArrivalImage(item, i);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                        i === index ? "ring-white" : "ring-white/30 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-white/10 text-[10px] text-white">
                          新品
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ onMore }: { onMore: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold tracking-widest text-[var(--theme-text-on-surface)]">新品上市</h2>
      <button
        type="button"
        onClick={onMore}
        className="flex items-center gap-1 text-xs font-semibold text-[var(--theme-text-muted)]"
      >
        查看更多
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
