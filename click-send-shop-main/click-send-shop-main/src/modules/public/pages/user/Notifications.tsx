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
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";

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
        className="store-v12-page store-account-subpage-v12-page store-notifications-v12-page"
        mainClassName="sm:px-4 xl:py-6"
      >
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 py-10 text-center text-muted-foreground">
          <Loader2 size={28} className="animate-spin text-theme-price" aria-label="加载中" />
          <p className="mt-3 text-sm">消息通知加载中...</p>
        </div>
      </StoreAccountLayout>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <StoreAccountLayout
        title="消息通知"
        onBack={goBack}
        className="store-v12-page store-account-subpage-v12-page store-notifications-v12-page"
        mainClassName="sm:px-4 xl:py-6"
      >
        <ClientEmptyState
          title="消息加载失败"
          description={error}
          icon={<Bell size={30} />}
          action={
            <ClientButton type="button" onClick={() => loadNotifications()}>
              重试
            </ClientButton>
          }
        />
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
        rightSlot={
          unreadCount > 0 ? (
            <UnifiedButton type="button" onClick={markAllAsRead} className="flex items-center gap-1 text-xs text-theme-price active:opacity-70">
              <Check size={14} /> 全部已读
            </UnifiedButton>
          ) : undefined
        }
        className="store-v12-page store-account-subpage-v12-page store-notifications-v12-page"
        mainClassName="sm:px-4 xl:py-6"
      >
        <section className="store-account-v12-hero store-notifications-v12-hero">
          <span className="store-v12-eyebrow"><Bell size={14} aria-hidden /> 消息中心</span>
          <h2>订单、优惠、售后提醒集中处理</h2>
          <p>消息会按订单、优惠和系统分类展示，点击可直接进入关联页面或查看完整内容。</p>
          <div className="store-v12-status-strip">
            <span>{notifications.length} 条消息</span>
            <span>{unreadCount} 条未读</span>
            <span>{filterCounts.order} 条订单相关</span>
          </div>
        </section>

        {notifications.length > 0 ? (
          <section className="store-account-v12-summary store-orders-v12-stat-grid">
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><Bell size={17} aria-hidden /></span>
              <strong>{notifications.length}</strong>
              <span>全部消息</span>
              <small>系统按时间同步</small>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><Megaphone size={17} aria-hidden /></span>
              <strong>{filterCounts.promotion}</strong>
              <span>优惠提醒</span>
              <small>活动、券和积分</small>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><Package size={17} aria-hidden /></span>
              <strong>{filterCounts.order}</strong>
              <span>订单提醒</span>
              <small>支付、物流、售后</small>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><ShieldCheck size={17} aria-hidden /></span>
              <strong>{filterCounts.system}</strong>
              <span>系统消息</span>
              <small>账户与服务通知</small>
            </div>
          </section>
        ) : null}

        {!loading && notifications.length === 0 && (
          <ClientEmptyState
            title="暂无消息通知"
            description="订单、优惠和系统提醒会显示在这里。"
            icon={<Bell size={30} />}
          />
        )}
        {notifications.length > 0 ? (
          <div className="store-notifications-v12-filters">
            {NOTIFICATION_FILTERS.map((item) => {
              const Icon = item.icon;
              const activeFilter = filter === item.key;
              return (
                <UnifiedButton
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`store-notifications-v12-filter ${activeFilter ? "is-active" : ""}`}
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
        ) : null}
        {notifications.length > 0 && filteredNotifications.length === 0 ? (
          <ClientEmptyState
            title="当前分类暂无消息"
            description="切换到其他分类查看。"
            icon={<Bell size={30} />}
          />
        ) : null}
        <div className="store-notifications-v12-list">
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
                  className={`store-notifications-v12-card ${n.is_read ? "" : "is-unread"}`}
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
