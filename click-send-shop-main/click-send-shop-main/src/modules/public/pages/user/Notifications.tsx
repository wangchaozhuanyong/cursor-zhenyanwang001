import { formatDateTime } from "@/utils/formatDateTime";
import { useEffect, useState } from "react";
import {
  Bell,
  Package,
  Ticket,
  Megaphone,
  Check,
  Loader2,
  Gift,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { NotificationType } from "@/types/notification";
import { formatUnreadBadge } from "@/utils/notificationBadge";
import {
  THEME_BADGE_ACCENT,
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRICE,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
} from "@/utils/themeVisuals";
import PageHeader from "@/components/PageHeader";

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  order: { icon: Package, color: THEME_BADGE_PRIMARY },
  shipping: { icon: Truck, color: THEME_BADGE_PRIMARY },
  payment: { icon: CreditCard, color: THEME_BADGE_SUCCESS },
  refund: { icon: RotateCcw, color: THEME_BADGE_DANGER },
  after_sale: { icon: ShieldCheck, color: THEME_BADGE_ACCENT },
  promotion: { icon: Megaphone, color: THEME_BADGE_PRICE },
  coupon: { icon: Ticket, color: THEME_BADGE_WARNING },
  points: { icon: Ticket, color: THEME_BADGE_SUCCESS },
  reward: { icon: Gift, color: THEME_BADGE_ACCENT },
  system: { icon: Bell, color: THEME_BADGE_MUTED },
};

const fallbackConfig = { icon: Bell, color: THEME_BADGE_MUTED };

export default function Notifications() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { notifications, unreadCount, loading, error, loadNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = notifications.find((n) => n.id === activeId) || null;
  const unreadBadgeText = formatUnreadBadge(unreadCount);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleOpenNotification = async (id: string, linkUrl?: string | null) => {
    await markAsRead(id);
    if (linkUrl) {
      navigate(linkUrl);
      return;
    }
    setActiveId(id);
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-theme-price" />
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--theme-danger)]">{error}</p>
        <button
          onClick={() => loadNotifications()}
          className="rounded-full btn-theme-price px-6 py-2.5 text-sm font-bold text-primary-foreground"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span>消息通知</span>
            {unreadBadgeText ? (
              <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-full btn-theme-price px-1.5 text-[10px] font-bold leading-none text-primary-foreground">
                {unreadBadgeText}
              </span>
            ) : null}
          </span>
        }
        onBack={goBack}
        rightSlot={
          unreadCount > 0 ? (
            <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs text-theme-price active:opacity-70">
              <Check size={14} /> 全部已读
            </button>
          ) : undefined
        }
      />

      <main className="mx-auto w-full px-[var(--store-page-x)] sm:max-w-lg sm:px-4">
        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Bell size={48} className="mb-3 opacity-20" />
            <p className="text-sm">暂无消息通知</p>
          </div>
        )}
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((n, i) => {
              const config = typeConfig[n.type] || fallbackConfig;
              const Icon = config.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleOpenNotification(n.id, n.link_url)}
                  className={`relative rounded-2xl border p-4 transition-all active:bg-muted ${
                    n.is_read ? "border-border bg-card" : "border-gold/20 bg-gold/[0.03]"
                  }`}
                >
                  {!n.is_read && (
                    <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-gold" />
                  )}
                  <div className="flex gap-3">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {n.content}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground/60">{formatDateTime(n.created_at)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 md:items-center md:justify-center" onClick={() => setActiveId(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[82vh] overflow-y-auto rounded-t-2xl bg-card p-4 md:max-w-lg md:rounded-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground">{active.title}</h3>
              <button type="button" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary" onClick={() => setActiveId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{active.content}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
