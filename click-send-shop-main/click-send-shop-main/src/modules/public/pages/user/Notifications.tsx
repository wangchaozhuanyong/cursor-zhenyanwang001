import { useEffect } from "react";
import { ArrowLeft, Bell, Package, Ticket, Megaphone, Check, Loader2, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { NotificationType } from "@/types/notification";

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  order: { icon: Package, color: "bg-blue-500/10 text-blue-500" },
  promotion: { icon: Megaphone, color: "bg-gold/10 text-gold" },
  points: { icon: Ticket, color: "bg-green-500/10 text-green-500" },
  reward: { icon: Gift, color: "bg-orange-500/10 text-orange-500" },
  system: { icon: Bell, color: "bg-primary/10 text-foreground" },
};

const fallbackConfig = { icon: Bell, color: "bg-primary/10 text-foreground" };

export default function Notifications() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { notifications, unreadCount, loading, error, loadNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => loadNotifications()}
          className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-primary-foreground"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-base font-semibold text-foreground">
              消息通知
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs text-gold active:opacity-70">
              <Check size={14} /> 全部已读
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
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
                  onClick={() => markAsRead(n.id)}
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
                      <p className="mt-2 text-[11px] text-muted-foreground/60">{n.created_at}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
