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

function looksLikeMojibake(value: string): boolean {
  if (!value) return false;
  return /�|锟|鈥|銆|鍟|鐧|璇|绠|閫/.test(value);
}

function normalizeText(value: string | undefined, fallback = ""): string {
  const text = (value || "").trim();
  if (!text) return fallback;
  if (looksLikeMojibake(text)) return fallback;
  return text;
}

function IconView({ value }: { value: string }) {
  const v = value.trim();
  if (!v) return <span className="text-sm font-bold text-[var(--theme-text-on-surface)]">—</span>;
  if (v.startsWith("http") || v.startsWith("/")) {
    return <img src={v} alt="" className="h-full w-full object-cover" />;
  }
  return <span className="text-lg leading-none">{v.slice(0, 2)}</span>;
}

export default function HomeOpsBlocks() {
  const navigate = useNavigate();
  const [navItems, setNavItems] = useState<HomeNavItem[]>([]);
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>([]);

  useEffect(() => {
    let alive = true;
    fetchHomeOps()
      .then((data) => {
        if (!alive) return;
        setNavItems(data.navItems || []);
        setAnnouncements(data.announcements || []);
      })
      .catch(() => {
        if (!alive) return;
        setNavItems([]);
        setAnnouncements([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const topAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements]);

  if (!navItems.length && !topAnnouncements.length) return null;

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
                className={`flex w-full items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/85 px-3 py-2.5 text-left shadow-[var(--theme-shadow)] transition-colors active:scale-[0.99] ${
                  hasLink ? "cursor-pointer hover:bg-[var(--theme-surface)]" : "cursor-default"
                }`}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] text-[var(--theme-price)]"
                  aria-hidden
                >
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

      {navItems.length > 0 && (
        <section className="grid grid-cols-4 gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/70 p-3 shadow-[var(--theme-shadow)] sm:grid-cols-6 md:grid-cols-8">
          {navItems.slice(0, 12).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openHomeNavTarget(navigate, item)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors hover:bg-[var(--theme-bg)]/60 active:scale-[0.98]"
            >
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--theme-bg)] text-[var(--theme-price)] ring-1 ring-[var(--theme-border)]">
                <IconView value={item.icon_url} />
              </span>
              <span className="line-clamp-2 text-xs font-medium leading-tight text-[var(--theme-text)]">
                {normalizeText(item.title, "分类")}
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
