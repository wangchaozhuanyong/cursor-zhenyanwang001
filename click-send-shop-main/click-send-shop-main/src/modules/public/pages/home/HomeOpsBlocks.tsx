import { useNavigate } from "react-router-dom";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import type { HomeNavItem } from "@/types/content";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import {
  HOME_NAV_ICON_FRAME_CLASS,
  HOME_NAV_ITEM_CLASS,
  HOME_NAV_LABEL_CLASS,
} from "@/constants/homeLayout";

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

const fallbackNavItems: HomeNavItem[] = [
  { id: "fallback-1", title: "全部分类", icon_url: "📂", link_url: "/categories", target_type: "url", target_category_id: null, sort_order: 1, enabled: true },
  { id: "fallback-2", title: "新品上市", icon_url: "🆕", link_url: "/new-arrivals", target_type: "url", target_category_id: null, sort_order: 2, enabled: true },
  { id: "fallback-3", title: "热销好物", icon_url: "🔥", link_url: "/categories?sort=sales_desc", target_type: "url", target_category_id: null, sort_order: 3, enabled: true },
  { id: "fallback-4", title: "优惠券", icon_url: "🎟️", link_url: "/coupons", target_type: "url", target_category_id: null, sort_order: 4, enabled: true },
  { id: "fallback-5", title: "我的订单", icon_url: "📦", link_url: "/orders", target_type: "url", target_category_id: null, sort_order: 5, enabled: true },
  { id: "fallback-6", title: "联系客服", icon_url: "💬", link_url: "/content/contact-us", target_type: "url", target_category_id: null, sort_order: 6, enabled: true },
];

export default function HomeOpsBlocks() {
  const { settings: homeModules, navItems, ready } = useHomeModuleSettings();
  const navigate = useNavigate();

  if (homeModules.modules.nav_grid === false) return null;
  if (!ready) return null;

  const navSource = Array.isArray(navItems) && navItems.length > 0 ? navItems : fallbackNavItems;

  if (!navSource.length) return null;

  return (
    <section className="border-y border-[color-mix(in_srgb,var(--theme-border)_80%,transparent)] bg-[var(--theme-surface)]">
      <div
        className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-hidden scroll-smooth px-3 py-3.5 [-webkit-overflow-scrolling:touch] sm:justify-around sm:gap-0 sm:overflow-x-visible sm:px-4"
        role="navigation"
        aria-label="快捷入口"
      >
        {navSource.slice(0, 12).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openHomeNavTarget(navigate, item)}
            className={`${HOME_NAV_ITEM_CLASS} sm:flex-1 sm:max-w-[5.5rem]`}
          >
            <span className={HOME_NAV_ICON_FRAME_CLASS}>
              <HomeNavIcon value={item.icon_url} />
            </span>
            <span className={HOME_NAV_LABEL_CLASS}>{normalizeText(item.title, "分类")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
