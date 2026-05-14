import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Clock3,
  Gift,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Settings,
  Ticket,
  Truck,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoWebp from "@/assets/logo.webp";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { isLoggedIn } from "@/utils/token";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import SkinPickerDialog from "@/components/SkinPickerDialog";
import NotificationIconButton from "@/components/NotificationIconButton";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import * as inviteService from "@/services/inviteService";

function BlockTitle({ title, rightLabel, onRightClick }: { title: string; rightLabel?: string; onRightClick?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-lg font-bold text-[var(--theme-text-on-surface)]">{title}</h3>
      {rightLabel ? (
        <button
          type="button"
          onClick={onRightClick}
          className="inline-flex items-center gap-1 text-xs text-[var(--theme-text-muted)]"
        >
          {rightLabel}
          <ChevronRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function ProfileHeroCard({
  logoSrc,
  avatar,
  userName,
  code,
  onSettings,
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  code: string;
  onSettings: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-[var(--theme-border)] p-4"
      style={{
        background:
          "linear-gradient(110deg, color-mix(in srgb, var(--theme-price) 20%, white), color-mix(in srgb, var(--theme-price) 12%, white) 45%, color-mix(in srgb, var(--theme-price) 24%, white))",
      }}
    >
      <div className="pointer-events-none absolute -right-6 -top-8 h-36 w-36 rounded-full bg-white/25 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 right-6 h-24 w-24 rounded-full bg-black/5 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <img src={avatar || logoSrc} alt={userName} className="h-[86px] w-[86px] rounded-full border-2 border-white object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[30px] font-semibold leading-none text-[var(--theme-text-on-surface)]">真烟网会员</p>
            <span className="rounded-full bg-[#9f6f24] px-2.5 py-1 text-[10px] font-semibold text-white">尊享会员</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[var(--theme-text-on-surface)]">{userName}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--theme-text-muted-on-surface)]">邀请码: {code}</p>
            <button type="button" onClick={onSettings} className="shrink-0 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]">
              切换皮肤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "真烟网";
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const authStore = useAuthStore();
  const { nickname, avatar, pointsBalance, inviteCode, loadProfile } = useUserStore();
  const { orders, loadOrders } = useOrderStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn()) return;
    loadProfile().catch(() => {});
    loadOrders().catch(() => {});
    useNotificationStore.getState().fetchUnreadCount();
    inviteService.fetchInviteStats().then((s) => setInviteCount(s.directCount || 0)).catch(() => {});
  }, [loadOrders, loadProfile]);

  const handleLogout = async () => {
    await authStore.logout();
    toast.success("已退出登录", toastPresetQuickSuccess);
    navigate("/login");
  };

  const userName = nickname?.trim() || "会员用户";
  const code = inviteCode?.trim() || "暂无";
  const orderPending = useMemo(() => orders.filter((o) => o.status === "pending_payment").length, [orders]);
  const orderShipping = useMemo(() => orders.filter((o) => o.status === "paid" || o.status === "pending_shipment").length, [orders]);
  const orderReceiving = useMemo(() => orders.filter((o) => o.status === "shipped").length, [orders]);

  if (!isLoggedIn()) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)] text-[var(--theme-text)]">
        <section className="mx-auto max-w-lg rounded-[1.6rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt={siteName} className="h-10 w-10 rounded-xl object-cover" />
              <p className="text-xl font-bold text-[var(--theme-text-on-surface)]">{siteName}</p>
            </div>
            <SkinPickerDialog
              trigger={
                <button type="button" className="rounded-full border border-[var(--theme-border)] p-2">
                  <Palette size={18} />
                </button>
              }
            />
          </div>
          <div className="mt-5 rounded-2xl bg-[color-mix(in_srgb,var(--theme-price)_14%,white)] p-4">
            <p className="text-base font-semibold text-[var(--theme-text-on-surface)]">登录后查看会员权益</p>
            <p className="mt-1 text-xs text-[var(--theme-text-muted)]">订单、积分、优惠券、收藏都在这里管理</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate("/login")} className="rounded-xl bg-[var(--theme-primary)] py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]">
                登录
              </button>
              <button type="button" onClick={() => navigate("/login")} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] py-2.5 text-sm font-semibold text-[var(--theme-text)]">
                注册
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)] text-[var(--theme-text)]">
      <main className="mx-auto max-w-lg rounded-[1.9rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-[var(--theme-shadow)] space-y-3">
        <section className="p-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoSrc} alt={siteName} className="h-9 w-9 rounded-lg object-contain" />
              <p className="text-xl font-bold text-[var(--theme-price)]">{siteName}</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} />
              <button type="button" className="rounded-full border border-[var(--theme-border)] p-2.5" onClick={() => navigate("/settings")}>
                <Settings size={18} />
              </button>
            </div>
          </div>
          <ProfileHeroCard logoSrc={logoSrc} avatar={avatar} userName={userName} code={code} onSettings={() => navigate("/settings")} />
        </section>

        <section className="rounded-[1.45rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <div className="grid grid-cols-4 divide-x divide-[var(--theme-border)]">
            <button type="button" onClick={() => navigate("/points")} className="space-y-1 px-1 text-center">
              <Gift className="mx-auto text-[var(--theme-price)]" size={22} />
              <p className="text-xs">积分</p>
              <p className="text-2xl font-bold">{pointsBalance}</p>
            </button>
            <button type="button" onClick={() => navigate("/coupons")} className="space-y-1 px-1 text-center">
              <Ticket className="mx-auto text-[var(--theme-price)]" size={22} />
              <p className="text-xs">优惠券</p>
              <p className="text-2xl font-bold">12</p>
            </button>
            <button type="button" onClick={() => navigate("/favorites")} className="space-y-1 px-1 text-center">
              <Heart className="mx-auto text-[var(--theme-price)]" size={22} />
              <p className="text-xs">收藏</p>
              <p className="text-2xl font-bold">{favoriteCount}</p>
            </button>
            <button type="button" onClick={() => navigate("/rewards")} className="space-y-1 px-1 text-center">
              <Wallet className="mx-auto text-[var(--theme-price)]" size={22} />
              <p className="text-xs">返现</p>
              <p className="text-2xl font-bold">RM 0</p>
            </button>
          </div>
        </section>

        <section className="rounded-[1.45rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <BlockTitle title="我的订单" rightLabel="查看全部" onRightClick={() => navigate("/orders")} />
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: "待付款", icon: Wallet, value: orderPending, path: "/orders" },
              { label: "待发货", icon: Package, value: orderShipping, path: "/orders" },
              { label: "待收货", icon: Truck, value: orderReceiving, path: "/orders" },
              { label: "待评价", icon: MessageCircle, value: 0, path: "/orders" },
              { label: "售后/退款", icon: CircleHelp, value: 0, path: "/returns" },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)} className="relative rounded-xl p-2">
                {item.value > 0 ? <span className="absolute left-8 top-0 min-w-[1.1rem] rounded-full bg-red-500 px-1 text-[10px] text-white">{item.value}</span> : null}
                <item.icon size={22} className="mx-auto text-[var(--theme-price)]" />
                <p className="mt-1 text-xs">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.45rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <BlockTitle title="常用服务" />
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "收货地址", icon: MapPin, path: "/address" },
              { label: "浏览记录", icon: Clock3, path: "/history" },
              { label: "积分商城", icon: Gift, path: "/points" },
              { label: "邀请有礼", icon: Gift, path: "/invite" },
              { label: "在线客服", icon: Bell, path: "/notifications" },
              { label: "帮助中心", icon: CircleHelp, path: "/help" },
              { label: "账户设置", icon: Settings, path: "/settings" },
              { label: "我的收藏", icon: Heart, path: "/favorites" },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)} className="space-y-1.5 rounded-xl p-1 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_10%,white)] text-[var(--theme-price)]">
                  <item.icon size={20} />
                </span>
                <p className="text-xs">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section
          className="rounded-[1.45rem] border border-[var(--theme-border)] p-4"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--theme-price) 18%, white), color-mix(in srgb, var(--theme-price) 12%, white), color-mix(in srgb, var(--theme-price) 24%, white))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-bold text-[var(--theme-text-on-surface)]">邀请好友得奖励</p>
              <p className="mt-1 line-clamp-1 text-xs text-[var(--theme-text-muted-on-surface)]">已邀请 {inviteCount} 位好友，继续邀请可获得积分和优惠券</p>
            </div>
            <button type="button" onClick={() => navigate("/invite")} className="shrink-0 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]">
              立即邀请
            </button>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 rounded-[1.45rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <div className="text-center">
            <p className="text-sm font-semibold">正品保障</p>
            <p className="text-xs text-[var(--theme-text-muted)]">100%正品保证</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">本地配送</p>
            <p className="text-xs text-[var(--theme-text-muted)]">快速发货</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">安全支付</p>
            <p className="text-xs text-[var(--theme-text-muted)]">多重加密保护</p>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white py-3.5 text-sm font-semibold text-red-600"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </main>
    </div>
  );
}
