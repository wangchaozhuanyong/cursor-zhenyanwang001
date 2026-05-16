import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ProgressiveImage } from "@/modules/micro-interactions";
import { PRODUCT_BLUR_PLACEHOLDER } from "@/constants/productBlurPlaceholder";
import { useHomeTrackingSessionId } from "@/hooks/useHomeTrackingSessionId";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import StoreButton from "@/components/ui/StoreButton";
import * as productService from "@/services/productService";
import type { Product } from "@/types/product";
import type { ThemeConfig } from "@/types/theme";
import { cn } from "@/lib/utils";
import { onUploadVariantImageError } from "@/utils/uploadImageVariant";
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

/** 首页新品运营卡：整体与主视觉、商品轮播图均为 1:1 */
const OPS_SQUARE = "relative aspect-square w-full overflow-hidden";


export default function NewArrivalOpsSection({
  products,
  hero,
  homeLayout = "classic",
  loading = false,
  className = "",
}: NewArrivalOpsSectionProps) {
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const sessionId = useHomeTrackingSessionId();
  const exposedProductIdsRef = useRef<Set<string>>(new Set());
  const touchStartXRef = useRef(0);

  const [fallbackProducts, setFallbackProducts] = useState<Product[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  useEffect(() => {
    if (loading || products.length > 0) {
      if (products.length > 0) setFallbackProducts([]);
      setFallbackLoading(false);
      return;
    }
    let cancelled = false;
    setFallbackLoading(true);
    (async () => {
      try {
        const tagged = await productService.fetchProducts({
          is_new: true,
          page: 1,
          pageSize: NEW_ARRIVAL_OPS_MAX,
          sort: "newest",
        });
        if (cancelled) return;
        if (tagged.list.length > 0) {
          setFallbackProducts(tagged.list);
          return;
        }
        const recent = await productService.fetchProducts({
          page: 1,
          pageSize: NEW_ARRIVAL_OPS_MAX,
          sort: "newest",
        });
        if (!cancelled) setFallbackProducts(recent.list);
      } catch {
        if (!cancelled) setFallbackProducts([]);
      } finally {
        if (!cancelled) setFallbackLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, products.length]);

  const displayProducts = products.length > 0 ? products : fallbackProducts;
  const items = useMemo(() => displayProducts.slice(0, NEW_ARRIVAL_OPS_MAX), [displayProducts]);
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
    if ((e.target as HTMLElement).closest("[data-new-arrival-product]")) return;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleProductTouchEnd = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("[data-new-arrival-product]")) return;
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

  const onHeroCta = useCallback(() => {
    trackClick("hero_cta");
    navigate("/new-arrivals");
  }, [navigate, trackClick]);

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

  if (loading || fallbackLoading) {
    return (
      <section className={cn("mt-section", className)} data-theme-home-layout={themeConfig.homeLayout}>
        <SectionHeader onMore={goListPage} />
        <div className={cn(OPS_SQUARE, "animate-pulse bg-[var(--theme-surface)]", cardClass)} aria-busy="true">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--theme-surface),var(--theme-bg),var(--theme-surface))]" />
          <div className="relative flex h-full flex-col justify-between p-4 md:p-5">
            <div className="max-w-[70%] space-y-2">
              <div className="h-5 w-3/4 rounded-md bg-white/25" />
              <div className="h-3 w-full rounded-md bg-white/20" />
              <div className="h-9 w-24 rounded-full bg-white/30" />
            </div>
            <div className="aspect-square w-[38%] max-w-[9.5rem] shrink-0 self-end rounded-xl bg-[var(--theme-bg)]" />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={cn("mt-section", className)} data-theme-home-layout={themeConfig.homeLayout}>
        <SectionHeader onMore={goListPage} />
        <div className={cn(OPS_SQUARE, cardClass)}>
          <HeroBackdrop heroImage={heroImage} brandTint={brandTint} />
          <HeroImageOverlay />
          <div className="relative flex h-full flex-col justify-start p-4 md:p-5">
            <HeroCopyPanel copy={copy} onCta={onHeroCta} />
          </div>
        </div>
      </section>
    );
  }

  const activeImage = resolveNewArrivalImage(active, index);

  return (
    <section className={cn("mt-section", className)} data-theme-home-layout={themeConfig.homeLayout}>
      <SectionHeader onMore={goListPage} />
      <div
        className={cn(OPS_SQUARE, cardClass)}
        onTouchStart={handleProductTouchStart}
        onTouchEnd={handleProductTouchEnd}
      >
        <HeroBackdrop heroImage={heroImage} brandTint={brandTint} />
        <HeroImageOverlay />

        <div className="relative z-10 flex h-full flex-col justify-between p-4 md:p-5">
          <HeroCopyPanel copy={copy} onCta={onHeroCta} />

          <div className="flex justify-end">
            <div className="w-[38%] max-w-[9.5rem] shrink-0 md:max-w-[11rem]">
              {active ? (
              <Link
                to={`/product/${active.id}`}
                data-new-arrival-product
                onClick={() => trackClick("product", active.id, index)}
                className="flex w-full flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_92%,transparent)] text-left shadow-sm backdrop-blur-md transition hover:bg-[color-mix(in_srgb,var(--theme-surface)_98%,transparent)]"
                aria-label={`查看 ${active.name}`}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-[var(--theme-bg)]">
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
                <div className="px-2 py-2 text-center">
                  <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--theme-text-on-surface)]">
                    {active?.name}
                  </p>
                  <p className="mt-0.5 text-sm font-black text-[var(--theme-price)]">RM {active?.price}</p>
                </div>
              </Link>
              ) : null}

              {items.length > 1 ? (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {items.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`切换到第 ${i + 1} 个新品`}
                      onClick={() => setIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? "w-5 bg-[var(--theme-primary)]" : "w-1.5 bg-[var(--theme-border)]"
                      }`}
                    />
                  ))}
                </div>
              ) : null}

              {items.length > 1 ? (
                <div className="no-scrollbar mt-2 hidden gap-1.5 overflow-x-auto md:flex">
                  {items.map((item, i) => {
                    const thumb = resolveNewArrivalImage(item, i);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={cn(
                          "aspect-square h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                          i === index
                            ? "ring-[var(--theme-primary)]"
                            : "ring-[var(--theme-border)] opacity-70 hover:opacity-100",
                        )}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => onUploadVariantImageError(e.currentTarget, thumb)}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-[var(--theme-surface)] text-[10px] text-[var(--theme-text-muted)]">
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
      </div>
    </section>
  );
}

const HERO_ON_IMAGE_TEXT =
  "[text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_2px_12px_rgba(0,0,0,0.45)]";

function HeroImageOverlay() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/58 via-black/18 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/22"
        aria-hidden
      />
    </>
  );
}

function HeroCopyPanel({
  copy,
  onCta,
}: {
  copy: ReturnType<typeof normalizeNewArrivalHeroCopy>;
  onCta: () => void;
}) {
  return (
    <div className="max-w-[min(78%,18rem)]">
      <p
        className={cn(
          "text-base font-bold leading-snug text-white md:text-lg",
          HERO_ON_IMAGE_TEXT,
        )}
      >
        {copy.title}
      </p>
      {copy.showSubtitle && copy.subtitle ? (
        <p
          className={cn(
            "mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-white/92 md:text-xs",
            HERO_ON_IMAGE_TEXT,
          )}
        >
          {copy.subtitle}
        </p>
      ) : null}
      <StoreButton
        type="button"
        size="sm"
        className="mt-3 w-fit max-w-full px-4 shadow-[0_2px_10px_rgba(0,0,0,0.35)] ring-1 ring-black/15"
        onClick={onCta}
      >
        {copy.ctaText}
      </StoreButton>
    </div>
  );
}

function HeroBackdrop({ heroImage, brandTint }: { heroImage: string; brandTint: string }) {
  if (heroImage) {
    return (
      <img
        src={heroImage}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${brandTint} 72%, black), var(--theme-surface))`,
      }}
    />
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
