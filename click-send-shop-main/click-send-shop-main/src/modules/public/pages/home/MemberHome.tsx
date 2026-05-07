import { useEffect, useMemo, useState, useRef } from "react";
import { Bell, ChevronRight, Clock, Crown, Flame, Gift, RefreshCw, Search, Star, Ticket, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useCartStore } from "@/stores/useCartStore";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import * as productService from "@/services/productService";
import type { UserCoupon } from "@/types/coupon";
import type { Product } from "@/types/product";

function Header({ title, icon: Icon, subtitle }: { title: string; icon?: React.ElementType; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text-on-surface)]">
        {Icon && <Icon className="h-5 w-5 text-[var(--theme-price)]" />}
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs tracking-wider text-[var(--theme-text-muted)]">{subtitle}</p>}
    </div>
  );
}

export default function MemberHome() {
  useDocumentTitle("首页");
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { hotProducts, newProducts, recommendedProducts, loading: homeLoading, loadHomeData } = useProductStore();
  const siteInfo = useSiteInfo();
  const couponLoading = useCouponStore((s) => s.loading);
  const coupons = useCouponStore((s) => s.coupons);
  const claimCoupon = useCouponStore((s) => s.claimCoupon);
  const selectedCartCount = useCartStore((s) => s.getSelectedItems().length);
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);

  useEffect(() => {
    loadHomeData();
    useNotificationStore.getState().fetchUnreadCount();
    useCouponStore.getState().loadCoupons();
  }, [loadHomeData]);

  const newest = useMemo(() => newProducts.slice(0, 6), [newProducts]);
  const couponTop = useMemo(
    () =>
      coupons
        .filter((uc) => uc.status === "available")
        .slice()
        .sort((a, b) => Number(b.coupon?.value || 0) - Number(a.coupon?.value || 0))
        .slice(0, 4),
    [coupons],
  );
  const [newArrivalIndex, setNewArrivalIndex] = useState(0);
  const [hotBatchIndex, setHotBatchIndex] = useState(0);
  const [recBatchIndex, setRecBatchIndex] = useState(0);
  const touchStartXRef = useRef(0);
  const exposedProductIdsRef = useRef<Set<string>>(new Set());
  const HOT_BATCH_SIZE = 4;
  const REC_BATCH_SIZE = 4;

  const trackingSessionId = useMemo(() => {
    const key = "home_tracking_session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `s_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, created);
    return created;
  }, []);

  useEffect(() => {
    if (newest.length <= 1) return;
    const timer = window.setInterval(() => {
      setNewArrivalIndex((prev) => (prev + 1) % newest.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [newest.length]);

  useEffect(() => {
    if (newArrivalIndex >= newest.length) {
      setNewArrivalIndex(0);
    }
  }, [newArrivalIndex, newest.length]);

  const hotList = useMemo(() => hotProducts.slice(0, 16), [hotProducts]);
  const recList = useMemo(() => {
    const hotIds = new Set(hotList.map((p) => p.id));
    return recommendedProducts.filter((p) => !hotIds.has(p.id)).slice(0, 16);
  }, [recommendedProducts, hotList]);
  const hotBatches = useMemo(() => toBatches(hotList, HOT_BATCH_SIZE), [hotList]);
  const recBatches = useMemo(() => toBatches(recList, REC_BATCH_SIZE), [recList]);
  const hot = hotBatches.length > 0 ? hotBatches[hotBatchIndex % hotBatches.length] : [];
  const rec = recBatches.length > 0 ? recBatches[recBatchIndex % recBatches.length] : [];
  const activeNew = newest.length > 0 ? newest[newArrivalIndex] : null;
  const heroImage = (siteInfo.newArrivalHeroImage || "").trim();
  const heroTitle = (siteInfo.newArrivalHeroTitle || "").trim() || activeNew?.name || "新品更新中";
  const heroSubtitle =
    (siteInfo.newArrivalHeroSubtitle || "").trim() ||
    (activeNew ? `RM ${activeNew.price}` : "每周精选新品上架，立即查看");
  const heroCtaText = (siteInfo.newArrivalHeroCtaText || "").trim() || "立即抢购";

  useEffect(() => {
    if (!activeNew?.id) return;
    if (exposedProductIdsRef.current.has(activeNew.id)) return;
    exposedProductIdsRef.current.add(activeNew.id);
    void productService.trackHomeEngagement({
      module: "new_arrivals",
      event: "impression",
      product_id: activeNew.id,
      session_id: trackingSessionId,
      meta: { index: newArrivalIndex },
    });
  }, [activeNew?.id, newArrivalIndex, trackingSessionId]);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-24 text-[var(--theme-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center gap-3 px-4">
          <div className="flex shrink-0 cursor-pointer items-center gap-2" onClick={() => navigate("/")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--theme-text-on-surface)]"><span className="text-sm font-black text-[var(--theme-bg)]">D</span></div>
            <span className="hidden text-lg font-bold tracking-widest text-[var(--theme-text-on-surface)] sm:block">大马通</span>
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center"><Search className="h-4 w-4 text-[var(--theme-text-muted)]" /></div>
            <input type="text" placeholder="搜索商品或品牌..." onFocus={() => navigate("/search")} className="w-full rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1.5 pl-9 pr-4 text-sm text-[var(--theme-text)] focus:border-[var(--theme-price)] focus:outline-none" />
          </div>
          <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50" onClick={() => navigate("/notifications")}>
            <Bell size={16} className="text-[var(--theme-text)]" />
            {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-[var(--theme-bg)] bg-[var(--theme-price)]" />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl pt-5">
        <section className="px-4">
          <Header title="权益券包" icon={Ticket} />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {(couponLoading ? Array.from({ length: 4 }) : couponTop).map((c: UserCoupon | number, i) => {
              if (couponLoading || typeof c === "number") {
                return (
                  <div key={i} className="action-card snap-center h-[128px] w-[80vw] shrink-0 rounded-2xl p-5 text-left md:w-[320px]">
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold">加载中</span><ChevronRight size={14} /></div>
                    <div className="mt-3 text-base font-bold">— —</div>
                  </div>
                );
              }

              const display = formatCouponCard(c);
              const isClaimed = Boolean(c.claimed_at);
              const visual = getCouponVisual(c, i);
              return (
                <div
                  key={c.id}
                  className="snap-center h-[128px] w-[80vw] shrink-0 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] md:w-[320px]"
                >
                  <div className="flex h-full">
                    <div className={`relative flex w-[106px] shrink-0 flex-col items-center justify-center gap-1 ${visual.stripeClass}`}>
                      <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--theme-surface)]" />
                      <visual.Icon size={14} className={visual.mutedTextClass} />
                      <div className={`text-xl font-bold leading-none ${visual.mainTextClass}`}>{display.discount}</div>
                      <div className={`px-2 text-center text-[10px] leading-tight ${visual.mutedTextClass}`}>{display.condition}</div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[var(--theme-text-muted)]">{isClaimed ? "可用优惠券" : "活动优惠券"}</span>
                          <ChevronRight size={12} className="text-[var(--theme-text-muted)]" />
                        </div>
                        <div className="mt-1 line-clamp-1 text-sm font-bold text-[var(--theme-text)]">{display.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--theme-text-muted)]">
                          <Clock size={10} />
                          <span className="line-clamp-1">有效期至 {display.expireText}</span>
                        </div>
                        <div className="mt-1 line-clamp-1 text-[11px] text-[var(--theme-text-muted)]">{display.scopeText}</div>
                      </div>
                      {isClaimed ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedCartCount > 0) navigate(`/checkout?coupon_id=${c.id}`);
                            else navigate("/cart", { state: { coupon_id: c.id } });
                          }}
                          className="inline-flex w-fit items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1 text-xs font-semibold text-[var(--theme-text)]"
                        >
                          去使用
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={claimingCouponId === c.id}
                          onClick={async () => {
                            try {
                              setClaimingCouponId(c.id);
                              await claimCoupon(c.coupon.code);
                            } finally {
                              setClaimingCouponId(null);
                            }
                          }}
                          className="inline-flex w-fit items-center rounded-full bg-[var(--theme-price)] px-3 py-1 text-xs font-semibold text-[var(--theme-price-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {claimingCouponId === c.id ? "领取中..." : "立即领取"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="mt-section px-4">
          <Header title="新品上市" icon={Zap} />
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--theme-border)] md:aspect-[21/9]"
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0]?.clientX ?? 0;
            }}
            onTouchEnd={(e) => {
              if (newest.length <= 1) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
              const diff = touchStartXRef.current - endX;
              if (Math.abs(diff) < 40) return;
              if (diff > 0) setNewArrivalIndex((prev) => (prev + 1) % newest.length);
              else setNewArrivalIndex((prev) => (prev - 1 + newest.length) % newest.length);
            }}
          >
            <img
              src={heroImage || resolveNewArrivalImage(activeNew, newArrivalIndex)}
              className="h-full w-full object-cover opacity-90 transition-all duration-500"
              alt={heroTitle}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="pr-3">
                <h3 className="line-clamp-2 text-lg font-bold text-white md:text-2xl">
                  {heroTitle}
                </h3>
                <p className="mt-1 text-sm font-semibold text-white/85">{heroSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void productService.trackHomeEngagement({
                    module: "new_arrivals",
                    event: "click",
                    product_id: activeNew?.id,
                    session_id: trackingSessionId,
                    meta: { index: newArrivalIndex, target: activeNew ? "product" : "list" },
                  });
                  if (activeNew) navigate(`/product/${activeNew.id}`);
                  else navigate("/categories?is_new=1");
                }}
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black"
              >
                {heroCtaText}
              </button>
            </div>
            {newest.length > 1 ? (
              <div className="absolute bottom-4 right-4 flex gap-1.5">
                {newest.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNewArrivalIndex(idx)}
                    aria-label={`查看新品 ${idx + 1}`}
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: idx === newArrivalIndex ? 18 : 8,
                      backgroundColor:
                        idx === newArrivalIndex
                          ? "var(--theme-price)"
                          : "color-mix(in srgb, #ffffff 45%, transparent)",
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
        <section className="mt-section px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text-on-surface)]">
              <Flame className="h-5 w-5 text-[var(--theme-price)]" />
              今日热销
            </h2>
            {hotBatches.length > 1 ? (
              <button
                type="button"
                onClick={() => setHotBatchIndex((prev) => (prev + 1) % hotBatches.length)}
                className="flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]"
              >
                <RefreshCw size={12} />
                换一批
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {homeLoading
              ? Array.from({ length: HOT_BATCH_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
              : hot.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
        <section className="mt-section px-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text-on-surface)]">
                <Star className="h-5 w-5 text-[var(--theme-price)]" />
                猜你喜欢
              </h2>
              <p className="mt-1 text-xs tracking-wider text-[var(--theme-text-muted)]">根据你的浏览与偏好推荐</p>
            </div>
            {recBatches.length > 1 ? (
              <button
                type="button"
                onClick={() => setRecBatchIndex((prev) => (prev + 1) % recBatches.length)}
                className="flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]"
              >
                <RefreshCw size={12} />
                换一批
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {homeLoading
              ? Array.from({ length: REC_BATCH_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
              : rec.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      </main>
    </div>
  );
}

function formatCouponCard(uc: UserCoupon) {
  const c = uc.coupon;
  const discountText =
    c.type === "percentage"
      ? `${c.value}%`
      : c.type === "shipping"
        ? c.value > 0
          ? `运费减 RM ${c.value}`
          : "免运费"
        : `RM ${c.value}`;
  return {
    title: c.title,
    discount: discountText,
    condition: c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛可用",
    expireText: typeof c.end_date === "string" ? c.end_date.slice(0, 10) : "",
    scopeText:
      c.scope_type === "category"
        ? `适用分类：${Array.isArray(c.category_names) && c.category_names.length ? c.category_names.join(" / ") : "指定分类"}`
        : "适用范围：全场商品",
  };
}

function getCouponVisual(uc: UserCoupon, index: number) {
  const variants = ["gold", "ruby", "sapphire", "emerald"] as const;
  const variant = variants[index % variants.length];
  const colorMap = {
    gold: {
      stripeClass: "bg-theme-coupon-accent",
      mainTextClass: "text-[var(--theme-price-foreground)]",
      mutedTextClass: "text-[color-mix(in_srgb,var(--theme-price-foreground)_72%,transparent)]",
    },
    ruby: {
      stripeClass: "bg-gradient-to-br from-[hsl(350,75%,55%)] to-[hsl(340,70%,45%)]",
      mainTextClass: "text-white",
      mutedTextClass: "text-white/70",
    },
    sapphire: {
      stripeClass: "bg-gradient-to-br from-[hsl(220,70%,55%)] to-[hsl(230,65%,45%)]",
      mainTextClass: "text-white",
      mutedTextClass: "text-white/70",
    },
    emerald: {
      stripeClass: "bg-gradient-to-br from-[hsl(160,60%,42%)] to-[hsl(170,55%,35%)]",
      mainTextClass: "text-white",
      mutedTextClass: "text-white/70",
    },
  } as const;
  const iconByType = {
    fixed: Gift,
    percentage: Crown,
    shipping: Zap,
  } as const;
  return {
    ...colorMap[variant],
    Icon: iconByType[uc.coupon.type] ?? Ticket,
  };
}

function resolveNewArrivalImage(product: Product | null, fallbackIndex: number): string {
  if (!product) {
    return `https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800`;
  }
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (images.length > 0) {
    return images[fallbackIndex % images.length];
  }
  if (product.cover_image) return product.cover_image;
  return `https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800`;
}

function toBatches<T>(list: T[], size: number): T[][] {
  if (!Array.isArray(list) || list.length === 0 || size <= 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

