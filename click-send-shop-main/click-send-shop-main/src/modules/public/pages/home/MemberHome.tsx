import { useEffect, useMemo } from "react";
import { Bell, ChevronRight, Flame, Search, Star, Ticket, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

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
  const { hotProducts, recommendedProducts, loading: homeLoading, loadHomeData } = useProductStore();
  const couponLoading = useCouponStore((s) => s.loading);
  const coupons = useCouponStore((s) => s.coupons);

  useEffect(() => {
    loadHomeData();
    useNotificationStore.getState().fetchUnreadCount();
    useCouponStore.getState().fetchCoupons?.();
  }, [loadHomeData]);

  const hot = useMemo(() => hotProducts.slice(0, 2), [hotProducts]);
  const rec = useMemo(() => recommendedProducts.slice(0, 2), [recommendedProducts]);
  const couponTop = useMemo(() => coupons.slice(0, 4), [coupons]);

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
          <Header title="权益券包" icon={Ticket} subtitle="先领券再下单，叠加更划算" />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {(couponLoading ? Array.from({ length: 4 }) : couponTop).map((c: any, i) => (
              <button key={couponLoading ? i : c.id} type="button" onClick={() => navigate("/coupons")} className="action-card snap-center h-[110px] w-[80vw] shrink-0 rounded-2xl p-5 text-left md:w-[320px]">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold">{couponLoading ? "加载中" : "优惠券"}</span><ChevronRight size={14} /></div>
                <div className="mt-3 text-base font-bold">{couponLoading ? "— —" : c.name || "专享优惠"}</div>
              </button>
            ))}
          </div>
        </section>
        <section className="mt-section px-4">
          <Header title="新品上市" icon={Zap} />
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--theme-border)] md:aspect-[21/9]">
            <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800" className="h-full w-full object-cover opacity-90" alt="New Arrival" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <h3 className="text-lg font-bold text-white md:text-2xl">先锋结构 运动潮鞋</h3>
              <button type="button" onClick={() => navigate("/categories")} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black">立即抢购</button>
            </div>
          </div>
        </section>
        <section className="mt-section px-4"><Header title="今日热销" icon={Flame} /><div className="grid grid-cols-2 gap-4">{homeLoading ? Array.from({ length: 2 }).map((_, i) => <ProductCardSkeleton key={i} />) : hot.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div></section>
        <section className="mt-section px-4"><Header title="猜你喜欢" icon={Star} subtitle="根据你的浏览与偏好推荐" /><div className="grid grid-cols-2 gap-4">{homeLoading ? Array.from({ length: 2 }).map((_, i) => <ProductCardSkeleton key={i} />) : rec.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div></section>
      </main>
    </div>
  );
}

