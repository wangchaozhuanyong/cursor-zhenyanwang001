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
  RefreshCw,
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
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";

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

type NotificationFilter = "all" | "order" | "promotion" | "system";

const NOTIFICATION_FILTERS: Array<{
  key: NotificationFilter;
  label: string;
  icon: typeof Bell;
}> = [
  { key: "all", label: "全部", icon: Bell },
  { key: "order", label: "订单", icon: Package },
  { key: "promotion", label: "优惠", icon: Megaphone },
  { key: "system", label: "系统", icon: ShieldCheck },
];

function getNotificationFilter(type: NotificationType): Exclude<NotificationFilter, "all"> {
  if (type === "order" || type === "shipping" || type === "payment" || type === "refund" || type === "after_sale") {
    return "order";
  }
  if (type === "promotion" || type === "coupon" || type === "points" || type === "reward") {
    return "promotion";
  }
  return "system";
}

export default function Notifications() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { notifications, unreadCount, loading, error, loadNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { containerRef: filtersRef, setItemRef: setFilterRef, scrollToKey: scrollFilterToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(filter, NOTIFICATION_FILTERS.length);
  const active = notifications.find((n) => n.id === activeId) || null;
  const unreadBadgeText = formatUnreadBadge(unreadCount);
  const filterCounts = notifications.reduce<Record<NotificationFilter, number>>((acc, item) => {
    acc.all += 1;
    acc[getNotificationFilter(item.type)] += 1;
    return acc;
  }, { all: 0, order: 0, promotion: 0, system: 0 });
  const filteredNotifications = filter === "all"
    ? notifications
    : notifications.filter((item) => getNotificationFilter(item.type) === filter);

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
      <StoreAccountLayout
        title="消息通知"
        onBack={goBack}
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-notifications-page"
        mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      >
        <section className="sf-next-state-panel sf-next-account-status-panel" aria-live="polite">
          <span className="sf-next-state-panel__icon" aria-hidden>
            <Loader2 size={28} className="animate-spin" />
          </span>
          <h2>正在加载消息</h2>
          <p>正在同步订单、优惠和系统通知。</p>
        </section>
      </StoreAccountLayout>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <StoreAccountLayout
        title="消息通知"
        onBack={goBack}
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-notifications-page"
        mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      >
        <section className="sf-next-state-panel sf-next-account-status-panel" role="alert">
          <span className="sf-next-state-panel__icon" aria-hidden>
            <Bell size={28} />
          </span>
          <h2>消息加载失败</h2>
          <p>{error}</p>
          <UnifiedButton type="button" onClick={() => loadNotifications()} className="sf-next-state-panel__primary">
            <RefreshCw size={17} aria-hidden />
            重试
          </UnifiedButton>
        </section>
      </StoreAccountLayout>
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
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-notifications-page"
        mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      >
        <div className="sf-next-notifications-toolbar">
          <div>
            <strong>消息分类</strong>
            <span>{unreadCount > 0 ? `还有 ${unreadCount} 条未读` : "暂无未读消息"}</span>
          </div>
          {unreadCount > 0 ? (
            <UnifiedButton type="button" onClick={markAllAsRead} className="sf-next-notifications-mark-read">
              <Check size={15} aria-hidden />
              <span>全部已读</span>
            </UnifiedButton>
          ) : null}
        </div>
        <div ref={filtersRef} className="sf-next-notifications-filters no-scrollbar">
          {NOTIFICATION_FILTERS.map((item) => {
            const Icon = item.icon;
            const activeFilter = filter === item.key;
            return (
              <UnifiedButton
                key={item.key}
                ref={(el) => setFilterRef(item.key, el)}
                type="button"
                onClick={() => {
                  scrollFilterToKey(item.key);
                  setFilter(item.key);
                }}
                className={`sf-next-notifications-filter ${activeFilter ? "is-active" : ""}`}
              >
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Icon size={14} aria-hidden className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-[11px] font-black">{filterCounts[item.key]}</span>
              </UnifiedButton>
            );
          })}
        </div>
        {!loading && notifications.length === 0 && (
          <section className="sf-next-state-panel sf-next-account-status-panel sf-next-notifications-empty">
            <div className="sf-next-notifications-empty-lines" aria-hidden>
              {[
                ["订单消息", "付款、发货、售后状态"],
                ["优惠提醒", "优惠券、活动和积分更新"],
                ["系统通知", "账号、安全和服务说明"],
              ].map(([title, text]) => (
                <span key={title}>
                  <i />
                  <b>{title}</b>
                  <em>{text}</em>
                </span>
              ))}
            </div>
            <span className="sf-next-state-panel__icon" aria-hidden>
              <Bell size={28} />
            </span>
            <h2>暂无消息通知</h2>
            <p>订单、物流、优惠和系统消息会出现在这里。</p>
          </section>
        )}
        {notifications.length > 0 && filteredNotifications.length === 0 ? (
          <section className="sf-next-state-panel sf-next-account-status-panel">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <Bell size={28} />
            </span>
            <h2>当前分类暂无消息</h2>
            <p>切换到其他分类，或稍后再查看新的提醒。</p>
          </section>
        ) : null}
        <div className="sf-next-notifications-list">
          <AnimatePresence>
            {filteredNotifications.map((n, i) => {
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
                  className={`sf-next-notifications-card ${n.is_read ? "" : "is-unread"}`}
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
