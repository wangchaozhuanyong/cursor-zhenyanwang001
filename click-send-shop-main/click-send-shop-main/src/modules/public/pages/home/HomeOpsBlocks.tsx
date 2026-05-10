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

function IconView({ value }: { value: string }) {
  const v = value.trim();
  if (!v) return <span className="text-sm font-bold text-[var(--theme-text-on-surface)]">•</span>;
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
        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/80 px-3 py-2 shadow-[var(--theme-shadow)]">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-price)]">
              <Bell size={14} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {topAnnouncements.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openTarget(navigate, item.link_url)}
                  className="flex w-full items-center gap-2 text-left text-xs text-[var(--theme-text)]"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <strong className="font-semibold">{item.title || "公告"}</strong>
                    {item.content ? <span className="text-[var(--theme-text-muted)]"> · {item.content}</span> : null}
                  </span>
                  {item.link_url ? <ChevronRight size={14} className="shrink-0 text-[var(--theme-text-muted)]" /> : null}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {navItems.length > 0 && (
        <section className="grid grid-cols-4 gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/70 p-3 shadow-[var(--theme-shadow)] sm:grid-cols-6 md:grid-cols-8">
          {navItems.slice(0, 12).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openTarget(navigate, item.link_url)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors hover:bg-[var(--theme-bg)]/60 active:scale-[0.98]"
            >
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--theme-bg)] text-[var(--theme-price)] ring-1 ring-[var(--theme-border)]">
                <IconView value={item.icon_url} />
              </span>
              <span className="line-clamp-2 text-xs font-medium leading-tight text-[var(--theme-text)]">{item.title}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
