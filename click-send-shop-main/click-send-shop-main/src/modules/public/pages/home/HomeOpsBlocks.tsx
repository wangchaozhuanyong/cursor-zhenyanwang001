import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { fetchHomeOps } from "@/services/contentService";
import { getCategoryIconShellClassName } from "@/utils/themeVisuals";
import type { HomeNavItem } from "@/types/content";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";

function openTarget(navigate: ReturnType<typeof useNavigate>, url: string) {
  const target = url.trim();
  if (!target) return;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noopener,noreferrer");
    return;
  }
  navigate(target.startsWith("/") ? target : `/${target}`);
}

function openHomeNavTarget(navigate: ReturnType<typeof useNavigate>, item: HomeNavItem) {
  if (item.target_type === "category" && item.target_category_id) {
    navigate(`/categories?cat=${item.target_category_id}`);
    return;
  }
  openTarget(navigate, item.link_url || "");
}

function normalizeText(value: string | undefined, fallback = ""): string {
  const text = (value || "").trim();
  return text || fallback;
}

function IconView({ value }: { value: string }) {
  const iconValue = value.trim();
  if (!iconValue) return <span className="text-sm font-bold text-[var(--theme-text-on-surface)]">·</span>;
  if (iconValue.startsWith("http") || iconValue.startsWith("/")) {
    return <img src={iconValue} alt="" className="h-full w-full object-cover" />;
  }
  return <span className="text-lg leading-none">{iconValue.slice(0, 2)}</span>;
}

const fallbackNavItems: HomeNavItem[] = [
  { id: "fallback-1", title: "全部分类", icon_url: "📂", link_url: "/categories", target_type: "link", target_category_id: null, sort_order: 1, enabled: true },
  { id: "fallback-2", title: "新品上市", icon_url: "🆕", link_url: "/new-arrivals", target_type: "link", target_category_id: null, sort_order: 2, enabled: true },
  { id: "fallback-3", title: "热销好物", icon_url: "🔥", link_url: "/categories?sort=sales_desc", target_type: "link", target_category_id: null, sort_order: 3, enabled: true },
  { id: "fallback-4", title: "优惠券", icon_url: "🎟️", link_url: "/coupons", target_type: "link", target_category_id: null, sort_order: 4, enabled: true },
  { id: "fallback-5", title: "我的订单", icon_url: "📦", link_url: "/orders", target_type: "link", target_category_id: null, sort_order: 5, enabled: true },
  { id: "fallback-6", title: "联系客服", icon_url: "💬", link_url: "/content/contact-us", target_type: "link", target_category_id: null, sort_order: 6, enabled: true },
];

export default function HomeOpsBlocks() {
  const { settings: homeModules } = useHomeModuleSettings();
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();

  if (homeModules.modules.nav_grid === false) return null;
  const categoryIconClass = getCategoryIconShellClassName(themeConfig.categoryIconStyle);
  const [navItems, setNavItems] = useState<HomeNavItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetchHomeOps()
      .then((data) => {
        if (!alive) return;
        setNavItems(data.navItems || []);
        setLoadState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setNavItems([]);
        setLoadState("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const navSource =
    loadState === "error" ? (navItems.length > 0 ? navItems : fallbackNavItems) : navItems;

  if (loadState === "loading") return null;
  if (!navSource.length) return null;

  return (
    <div className="px-4">
      <section className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-4 pb-1 [-webkit-overflow-scrolling:touch]">
          {navSource.slice(0, 12).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openHomeNavTarget(navigate, item)}
              className="flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-1 py-2 text-center transition-colors hover:bg-[var(--theme-bg)]/60 active:scale-[0.98]"
            >
              <span
                className={`${categoryIconClass} h-[44px] w-[44px] overflow-hidden text-base`}
                data-theme-category-icon-style={themeConfig.categoryIconStyle}
              >
                <IconView value={item.icon_url} />
              </span>
              <span className="w-full truncate px-1 text-[11px] font-medium leading-tight text-[var(--theme-text)]">
                {normalizeText(item.title, "分类")}
              </span>
            </button>
          ))}
      </section>
    </div>
  );
}
