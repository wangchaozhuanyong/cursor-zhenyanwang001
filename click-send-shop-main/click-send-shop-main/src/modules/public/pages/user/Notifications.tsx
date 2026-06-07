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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { NotificationType } from "@/types/notification";
import { formatUnreadBadge } from "@/utils/notificationBadge";
import { normalizeNotificationDisplay } from "@/utils/notificationDisplayLabels";
import {
  THEME_BADGE_ACCENT,
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRICE,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
} from "@/utils/themeVisuals";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { AppModal } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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
      <StoreAccountLayout title="消息通知" onBack={goBack} mainClassName="sm:px-4 lg:py-6">
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 py-10 text-center text-muted-foreground">
          <Loader2 size={28} className="animate-spin text-theme-price" aria-label="加载中" />
          <p className="mt-3 text-sm">消息通知加载中...</p>
        </div>
      </StoreAccountLayout>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--theme-danger)]">{error}</p>
        <UnifiedButton
          onClick={() => loadNotifications()}
          className="rounded-full btn-theme-price px-6 py-2.5 text-sm font-bold text-[var(--theme-price-foreground)]"
        >
          重试
        </UnifiedButton>
      </div>
    );
  }

  const notificationTitle = (
    <span className="inline-flex items-center gap-2">
      <span>消息通知</span>
      {unreadBadgeText ? (
        <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-full btn-theme-price px-1.5 text-[10px] font-bold leading-none text-[var(--theme-price-foreground)]">
          {unreadBadgeText}
        </span>
      ) : null}
    </span>
  );

  return (
    <div className="pb-6">
      <StoreAccountLayout
        title={notificationTitle}
        onBack={goBack}
        rightSlot={
          unreadCount > 0 ? (
            <UnifiedButton type="button" onClick={markAllAsRead} className="flex items-center gap-1 text-xs text-theme-price active:opacity-70">
              <Check size={14} /> 全部已读
            </UnifiedButton>
          ) : undefined
        }
        mainClassName="sm:px-4 lg:py-6"
      >
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
              const display = normalizeNotificationDisplay(n.title, n.content);
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleOpenNotification(n.id, n.link_url)}
                  className={`relative rounded-2xl border p-4 transition-all active:bg-muted ${
                    n.is_read ? "border-border bg-card" : "border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_3%,var(--theme-surface))]"
                  }`}
                >
                  {!n.is_read && (
                    <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[var(--theme-price)]" />
                  )}
                  <div className="flex gap-3">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{display.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {display.content}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground/60">{formatDateTime(n.created_at)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </StoreAccountLayout>

      <AppModal
        tier="standard"
        open={Boolean(active)}
        onClose={() => setActiveId(null)}
        title={active ? normalizeNotificationDisplay(active.title, active.content).title : ""}
        height="70vh"
        showCloseButton
      >
        {active ? (
          <div className="whitespace-pre-wrap break-words pb-2 text-sm leading-6 text-[var(--theme-text)]">
            {normalizeNotificationDisplay(active.title, active.content).content}
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}
