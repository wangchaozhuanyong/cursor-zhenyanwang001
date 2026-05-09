import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Gem, Menu, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import ProductCard from "@/components/ProductCard";
import BannerCarousel from "@/components/BannerCarousel";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import type { Product } from "@/types/product";
import type { FooterNavItem } from "@/types/content";

function parseFooterNav(json?: string): FooterNavItem[] | null {
  if (!json || !json.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const items = parsed.filter(
      (it): it is FooterNavItem =>
        it && typeof it.label === "string" && typeof it.path === "string",
    );
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

function FooterLink({
  item,
  onNavigate,
}: {
  item: FooterNavItem;
  onNavigate: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className="block text-left text-[14px] font-medium text-[var(--theme-text-muted)] transition-colors hover:text-[var(--theme-price)]"
    >
      {item.label}
    </button>
  );
}

function AccordionItem({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[var(--theme-border)]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full min-h-[3.25rem] items-center justify-between gap-3 bg-transparent py-3.5 text-left active:bg-[color-mix(in_srgb,var(--theme-text)_4%,transparent)]"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-medium text-[var(--theme-text)]">{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--theme-text-muted)] transition-transform duration-300 ease-out ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {/* grid 0fr/1fr：展开高度随内容增长，避免 max-h 截断导致重叠 */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-5 pl-0.5 pt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function GuestHome() {
  // 首页标题策略：优先使用后台 SEO 标题（seoTitle），未配置时回退站点名
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "大马通";
  const slogan = siteInfo.siteSlogan || "精选全球好物，品质生活";
  const description = siteInfo.siteDescription || "精选全球好物，品质生活购物平台";
  const { banners } = useHomeBanners();
  const now = new Date().toISOString();
  const customNav = useMemo(() => parseFooterNav(siteInfo.footerNav), [siteInfo.footerNav]);
  const supportNav = useMemo(() => {
    if (customNav?.length) return customNav.slice(0, 4);
    return [
      { label: "首页", path: "/" },
      { label: "全部分类", path: "/categories" },
      { label: "购物车", path: "/cart" },
      { label: "我的订单", path: "/orders" },
    ];
  }, [customNav]);

  const policyNav = useMemo(() => {
    const base =
      customNav && customNav.length > 4
        ? customNav.slice(4)
        : [
            { label: "常见问题", path: "/help" },
            { label: "关于我们", path: "/about" },
          ];
    const extra: FooterNavItem[] = [];
    if (siteInfo.privacyPolicyPath)
      extra.push({ label: "隐私政策", path: siteInfo.privacyPolicyPath });
    else if (siteInfo.footerPolicyUrl)
      extra.push({ label: "隐私政策", path: siteInfo.footerPolicyUrl });
    if (siteInfo.termsPath) extra.push({ label: "服务条款", path: siteInfo.termsPath });
    else if (siteInfo.footerTermsUrl)
      extra.push({ label: "服务条款", path: siteInfo.footerTermsUrl });
    return [...base, ...extra];
  }, [
    customNav,
    siteInfo.footerPolicyUrl,
    siteInfo.privacyPolicyPath,
    siteInfo.termsPath,
    siteInfo.footerTermsUrl,
  ]);

  const handleFooterNavigate = (path: string) => {
    if (path.startsWith("http")) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(path);
  };
  const products: Product[] = [
    { id: "g1", title: "曜石黑 机械腕表", subtitle: "经典隽永 瑞士机芯", description: "经典隽永 瑞士机芯", price: 12800, originalPrice: 13800, image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800", categoryId: "guest", stock: 99, sales: 88, tags: [], status: "active", createdAt: now, updatedAt: now },
    { id: "g2", title: "先锋 解构墨镜", subtitle: "抗UV 钛金属镜架", description: "抗UV 钛金属镜架", price: 2450, originalPrice: 2590, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=800", categoryId: "guest", stock: 99, sales: 66, tags: [], status: "active", createdAt: now, updatedAt: now },
    { id: "g3", title: "陨石 降噪耳机", subtitle: "空间音频 沉浸体验", description: "空间音频 沉浸体验", price: 3299, originalPrice: 3599, image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800", categoryId: "guest", stock: 99, sales: 77, tags: [], status: "active", createdAt: now, updatedAt: now },
    { id: "g4", title: "暗物质 胶囊香水", subtitle: "木质冷香 留香持久", description: "木质冷香 留香持久", price: 890, originalPrice: 990, image: "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&q=80&w=600", categoryId: "guest", stock: 99, sales: 52, tags: [], status: "active", createdAt: now, updatedAt: now },
  ];

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] text-[var(--theme-text)]">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 md:hidden" />
            <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate("/welcome")}>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--theme-text-on-surface)]">
                <span className="text-sm font-black text-[var(--theme-bg)]">{siteName.slice(0, 1)}</span>
              </div>
              <h1 className="text-lg font-bold tracking-widest text-[var(--theme-text-on-surface)]">{siteName}</h1>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/login", { state: { from: "/welcome" } })} className="rounded-full bg-[var(--theme-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]">登录 / 注册</button>
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl px-4 pt-[4.5rem]">
        <BannerCarousel banners={banners} />
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

        <footer className="relative z-0 mt-12 w-full overflow-x-hidden border-t border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 pb-4 pt-10 md:mx-auto md:max-w-lg">
          {/* 品牌区：参考图居中 + 句号后红点 */}
          <div className="flex flex-col items-center text-center">
            <h2 className="flex items-end justify-center gap-1 text-3xl font-bold tracking-tight text-[var(--theme-text)]">
              <span>{siteName}</span>
              <span className="translate-y-px text-[var(--theme-text)]">.</span>
              <span
                className="mb-1 inline-block h-2 w-2 shrink-0 rounded-sm bg-red-600"
                aria-hidden
              />
            </h2>
            <div className="mt-4 max-w-[20rem] space-y-1">
              <p className="text-[15px] font-semibold leading-snug text-[var(--theme-text)]">{slogan}</p>
              <p className="text-[13px] leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-md border-t border-[var(--theme-border)]" />

          {/* 折叠导航 */}
          <div className="mx-auto mt-0 max-w-md">
            <AccordionItem title="服务支持">
              <ul className="space-y-3.5">
                {supportNav.map((item, idx) => (
                  <li key={`${item.label}-${idx}`}>
                    <FooterLink item={item} onNavigate={handleFooterNavigate} />
                  </li>
                ))}
              </ul>
            </AccordionItem>

            <AccordionItem title="政策与说明">
              <ul className="space-y-3.5">
                {policyNav.map((item, idx) => (
                  <li key={`${item.label}-${idx}`}>
                    <FooterLink item={item} onNavigate={handleFooterNavigate} />
                  </li>
                ))}
              </ul>
            </AccordionItem>
          </div>

          {/* 联系我们：左标签右内容，避免窄屏重叠 */}
          <div className="mx-auto mt-10 max-w-md">
            <h3 className="mb-4 text-left text-[15px] font-semibold text-[var(--theme-text)]">联系我们</h3>
            <div className="flex flex-col">
              {siteInfo.contactPhone && (
                <div className="flex items-start justify-between gap-4 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-3.5">
                  <span className="shrink-0 pt-0.5 text-[14px] font-medium text-[var(--theme-text-muted)]">客服电话</span>
                  <span className="min-w-0 max-w-[58%] text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-words">
                    {siteInfo.contactPhone}
                  </span>
                </div>
              )}
              {siteInfo.contactEmail && (
                <div className="flex items-start justify-between gap-4 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-3.5">
                  <span className="shrink-0 pt-0.5 text-[14px] font-medium text-[var(--theme-text-muted)]">电子邮箱</span>
                  <span className="min-w-0 max-w-[58%] break-all text-right text-[14px] font-semibold text-[var(--theme-text)]">
                    {siteInfo.contactEmail}
                  </span>
                </div>
              )}
              {siteInfo.contactWhatsApp && (
                <div className="flex items-start justify-between gap-4 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-3.5">
                  <span className="shrink-0 pt-0.5 text-[14px] font-medium text-[var(--theme-text-muted)]">客服专线</span>
                  <span className="min-w-0 max-w-[58%] text-right text-[14px] font-semibold tracking-wide text-[var(--theme-text)] break-words">
                    {siteInfo.contactWhatsApp}
                  </span>
                </div>
              )}
              {siteInfo.businessHours && (
                <div className="flex items-start justify-between gap-4 border-b border-[color-mix(in_srgb,var(--theme-border)_85%,transparent)] py-3.5">
                  <span className="shrink-0 pt-0.5 text-[14px] font-medium text-[var(--theme-text-muted)]">服务时间</span>
                  <span className="min-w-0 max-w-[62%] text-right text-[14px] font-medium leading-snug text-[var(--theme-text)]">
                    {siteInfo.businessHours}
                  </span>
                </div>
              )}
              {siteInfo.address && (
                <div className="flex items-start justify-between gap-4 pt-3.5">
                  <span className="shrink-0 pt-0.5 text-[14px] font-medium text-[var(--theme-text-muted)]">公司地址</span>
                  <span className="min-w-0 max-w-[62%] text-right text-[14px] font-medium leading-snug text-[var(--theme-text)] break-words">
                    {siteInfo.address}
                  </span>
                </div>
              )}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

