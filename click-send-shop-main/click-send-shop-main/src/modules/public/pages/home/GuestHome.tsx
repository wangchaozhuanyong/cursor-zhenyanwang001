import { useEffect, useMemo } from "react";
import { Gem, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import logoWebp from "@/assets/logo.webp";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import BannerCarousel from "@/components/BannerCarousel";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import { useProductStore } from "@/stores/useProductStore";
import GuestMobileFooter from "@/components/GuestMobileFooter";
import HomeOpsBlocks from "./HomeOpsBlocks";
import type { Product } from "@/types/product";
import type { FooterNavItem } from "@/types/content";

const GUEST_HOME_GRID_MAX = 8;

/** 访客首页：热门 → 新品 → 推荐，去重后取前若干条 */
function mergeHomeProductsForGuest(
  hot: Product[],
  newArrivals: Product[],
  recommended: Product[],
  max: number,
): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const list of [hot, newArrivals, recommended]) {
    for (const p of list) {
      if (!p?.id || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= max) return out;
    }
  }
  return out;
}

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

function dedupeFooterNav(items: FooterNavItem[]): FooterNavItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.label}::${it.path}`;
    if (!it.path.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function GuestHome() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "大马通";
  const logoSrc = (siteInfo.logoUrl || "").trim() || logoWebp;
  const slogan = siteInfo.siteSlogan || "精选全球好物，品质生活";
  const description =
    siteInfo.siteDescription || "精选全球好物，品质生活购物平台";
  const { banners } = useHomeBanners();
  const {
    hotProducts,
    newProducts,
    recommendedProducts,
    loading: homeLoading,
    error: homeError,
    loadHomeData,
  } = useProductStore();

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const gridProducts = useMemo(
    () =>
      mergeHomeProductsForGuest(
        hotProducts,
        newProducts,
        recommendedProducts,
        GUEST_HOME_GRID_MAX,
      ),
    [hotProducts, newProducts, recommendedProducts],
  );

  const customNav = useMemo(() => parseFooterNav(siteInfo.footerNav), [siteInfo.footerNav]);

  const supportNav = useMemo(() => {
    if (customNav?.length) return dedupeFooterNav(customNav.slice(0, 4));
    return dedupeFooterNav([
      { label: "首页", path: "/" },
      { label: "全部分类", path: "/categories" },
      { label: "购物车", path: "/cart" },
      { label: "我的订单", path: "/orders" },
    ]);
  }, [customNav]);

  const policyNav = useMemo(() => {
    const base: FooterNavItem[] =
      customNav && customNav.length > 4
        ? customNav.slice(4)
        : [
            { label: "常见问题", path: "/help" },
            { label: "关于我们", path: "/about" },
          ];
    const extra: FooterNavItem[] = [];
    if (siteInfo.privacyPolicyPath)
      extra.push({ label: "隐私政策", path: siteInfo.privacyPolicyPath });
    if (siteInfo.termsPath) extra.push({ label: "服务条款", path: siteInfo.termsPath });

    return dedupeFooterNav([...base, ...extra]);
  }, [
    customNav,
    siteInfo.privacyPolicyPath,
    siteInfo.termsPath,
  ]);

  const handleFooterNavigate = (path: string) => {
    if (path.startsWith("http")) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(path);
  };

  /**
   * 底栏占位：避免页脚内容与 BottomNav / 安全区域重叠；
   * 页脚卡在主内容末尾，整块可滚动读完。
   */
  const bottomNavSafe =
    "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]";

  return (
    <div className={`min-h-screen bg-[var(--theme-bg)] ${bottomNavSafe} text-[var(--theme-text)]`}>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center justify-between px-4">
          <div className="flex min-w-0 cursor-pointer items-center gap-2" onClick={() => navigate("/welcome")}>
            <img
              src={logoSrc}
              alt={siteName}
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-md object-contain"
              loading="eager"
              decoding="async"
            />
            <h1 className="min-w-0 truncate text-lg font-bold tracking-widest text-[var(--theme-text-on-surface)]">{siteName}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login", { state: { from: "/welcome" } })}
            className="shrink-0 rounded-full bg-[var(--theme-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
          >
            登录 / 注册
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-4 pt-[4.5rem]">
        <BannerCarousel banners={banners} />
        <div className="-mx-4 mt-3">
          <HomeOpsBlocks />
        </div>
        <div className="mt-1 flex items-center justify-between px-2 py-5 text-[11px] text-[var(--theme-text-muted)] md:text-sm">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-[var(--theme-price)]" />
            正品保障
          </span>
          <span className="flex items-center gap-1.5">
            <Gem size={16} className="text-[var(--theme-price)]" />
            快速配送
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={16} className="text-[var(--theme-price)]" />
            安心售后
          </span>
        </div>

        <section className="mt-4">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text)]">
            <Sparkles className="h-5 w-5 text-[var(--theme-price)]" />
            全网爆款
          </h2>
          <p className="mt-1 text-xs tracking-wider text-[var(--theme-text-muted)]">大家都在买的热门好物</p>
          {homeError && (
            <div className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center text-sm text-[var(--theme-text-muted)]">
              <p>{homeError}</p>
              <button
                type="button"
                onClick={() => loadHomeData()}
                className="mt-3 rounded-full bg-[var(--theme-primary)] px-5 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
              >
                重试
              </button>
            </div>
          )}
          {homeLoading && !homeError && (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: GUEST_HOME_GRID_MAX }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
          {!homeLoading && !homeError && gridProducts.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-4 py-10 text-center">
              <p className="text-sm text-[var(--theme-text)]">暂无推荐商品</p>
              <p className="mt-2 text-xs text-[var(--theme-text-muted)]">
                请浏览分类或登录后查看；商家上架商品后此处将自动展示。
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/categories")}
                  className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]"
                >
                  全部分类
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { from: "/" } })}
                  className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
                >
                  登录 / 注册
                </button>
              </div>
            </div>
          )}
          {!homeLoading && !homeError && gridProducts.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {gridProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* 负外边距铺满屏宽，与参考稿边缘对齐；不与 fixed 顶栏 z-index 争层 */}
        <div className="-mx-4 mt-14">
          <GuestMobileFooter
            siteName={siteName}
            slogan={slogan}
            description={description}
            supportNav={supportNav}
            policyNav={policyNav}
            contactPhone={siteInfo.contactPhone}
            contactEmail={siteInfo.contactEmail}
            contactWhatsApp={siteInfo.contactWhatsApp}
            businessHours={siteInfo.businessHours}
            address={siteInfo.address}
            whatsappUrl={siteInfo.whatsappUrl}
            wechatId={siteInfo.wechatId}
            instagramUrl={siteInfo.instagramUrl}
            facebookUrl={siteInfo.facebookUrl}
            tiktokUrl={siteInfo.tiktokUrl}
            xhsUrl={siteInfo.xhsUrl}
            onNavigate={handleFooterNavigate}
          />
        </div>
      </main>
    </div>
  );
}
