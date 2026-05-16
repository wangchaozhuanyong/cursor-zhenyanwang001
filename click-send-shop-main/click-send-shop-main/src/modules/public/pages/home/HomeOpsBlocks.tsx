import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchHomeOps } from "@/services/contentService";
import type { HomeAnnouncement, HomeNavItem } from "@/types/content";

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
  const navigate = useNavigate();
  const [navItems, setNavItems] = useState<HomeNavItem[]>([]);
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetchHomeOps()
      .then((data) => {
        if (!alive) return;
        setNavItems(data.navItems || []);
        setAnnouncements(data.announcements || []);
        setLoadState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setNavItems([]);
        setAnnouncements([]);
        setLoadState("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const topAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements]);
  const navSource =
    loadState === "error" ? (navItems.length > 0 ? navItems : fallbackNavItems) : navItems;

  if (loadState === "loading") return null;
  if (!topAnnouncements.length && !navSource.length) return null;

  return (
    <div className="space-y-3 px-4">
      {topAnnouncements.length > 0 && (
        <section className="space-y-2">
          {topAnnouncements.map((item) => {
            const hasLink = Boolean(item.link_url?.trim());
            const title = normalizeText(item.title, "公告");
            const content = normalizeText(item.content);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openTarget(navigate, item.link_url)}
                className={`flex w-full items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5 text-left shadow-[var(--theme-shadow)] transition-colors active:scale-[0.99] ${
                  hasLink ? "cursor-pointer hover:bg-[var(--theme-surface)]" : "cursor-default"
                }`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] text-[var(--theme-price)]" aria-hidden>
                  <Bell className="size-[18px] shrink-0" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 text-xs leading-snug text-[var(--theme-text)]">
                  <span className="line-clamp-2">
                    <strong className="font-semibold text-[var(--theme-text)]">{title}</strong>
                    {content ? <span className="text-[var(--theme-text-muted)]"> · {content}</span> : null}
                  </span>
                </span>
                {hasLink ? (
                  <span className="flex size-9 shrink-0 items-center justify-center text-[var(--theme-text-muted)]" aria-hidden>
                    <ChevronRight className="size-[18px] shrink-0" strokeWidth={2} />
                  </span>
                ) : (
                  <span className="size-9 shrink-0" aria-hidden />
                )}
              </button>
            );
          })}
        </section>
      )}

      <section className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-max gap-2">
          {navSource.slice(0, 12).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openHomeNavTarget(navigate, item)}
              className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-1 py-2 text-center transition-colors hover:bg-[var(--theme-bg)]/60 active:scale-[0.98]"
            >
              <span className="flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-2xl bg-[var(--theme-bg)] text-[var(--theme-price)] ring-1 ring-[var(--theme-border)]">
                <IconView value={item.icon_url} />
              </span>
              <span className="w-full truncate px-1 text-[11px] font-medium leading-tight text-[var(--theme-text)]">
                {normalizeText(item.title, "分类")}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
