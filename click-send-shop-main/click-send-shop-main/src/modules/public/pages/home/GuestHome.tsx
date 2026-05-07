import { Gem, Menu, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

export default function GuestHome() {
  useDocumentTitle("首页");
  const navigate = useNavigate();
  const now = new Date().toISOString();
  const products: Product[] = [
    { id: "g1", title: "曜石黑 机械腕表", subtitle: "经典隽永 瑞士机芯", description: "经典隽永 瑞士机芯", price: 12800, originalPrice: 13800, image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800", categoryId: "guest", stock: 99, sales: 88, tags: [], status: "active", createdAt: now, updatedAt: now },
    { id: "g2", title: "先锋 解构墨镜", subtitle: "抗UV 钛金属镜架", description: "抗UV 钛金属镜架", price: 2450, originalPrice: 2590, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=800", categoryId: "guest", stock: 99, sales: 66, tags: [], status: "active", createdAt: now, updatedAt: now },
    { id: "g3", title: "陨石 降噪耳机", subtitle: "空间音频 沉浸体验", description: "空间音频 沉浸体验", price: 3299, originalPrice: 3599, image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800", categoryId: "guest", stock: 99, sales: 77, tags: [], status: "active", createdAt: now, updatedAt: now },
    { id: "g4", title: "暗物质 胶囊香水", subtitle: "木质冷香 留香持久", description: "木质冷香 留香持久", price: 890, originalPrice: 990, image: "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&q=80&w=600", categoryId: "guest", stock: 99, sales: 52, tags: [], status: "active", createdAt: now, updatedAt: now },
  ];

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-24 text-[var(--theme-text)]">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 md:hidden" />
            <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate("/welcome")}>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--theme-text-on-surface)]"><span className="text-sm font-black text-[var(--theme-bg)]">D</span></div>
              <h1 className="text-lg font-bold tracking-widest text-[var(--theme-text-on-surface)]">大马通</h1>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/login", { state: { from: "/welcome" } })} className="rounded-full bg-[var(--theme-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]">登录 / 注册</button>
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl px-4 pt-[4.5rem]">
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] md:aspect-[3/1]">
          <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200" className="h-full w-full object-cover opacity-80" alt="Banner" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4"><h2 className="text-sm font-bold tracking-wide text-white md:text-xl">限时抢购 · 精选好物低至5折</h2></div>
        </div>
        <div className="mt-1 flex items-center justify-between px-2 py-5 text-[11px] text-[var(--theme-text-muted)] md:text-sm">
          <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-[var(--theme-price)]" />正品保障</span>
          <span className="flex items-center gap-1.5"><Gem size={16} className="text-[var(--theme-price)]" />快速配送</span>
          <span className="flex items-center gap-1.5"><Sparkles size={16} className="text-[var(--theme-price)]" />安心售后</span>
        </div>
        <section className="mt-4">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text)]"><Sparkles className="h-5 w-5 text-[var(--theme-price)]" />全网爆款</h2>
          <p className="mt-1 text-xs tracking-wider text-[var(--theme-text-muted)]">大家都在买的热门好物</p>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
        </section>
      </main>
    </div>
  );
}

