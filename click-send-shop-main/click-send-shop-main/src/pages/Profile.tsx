import { useEffect, useState } from "react";
import { ChevronRight, Gift, Heart, MapPin, Package, Settings, Star, Users, Ticket, Bell, HelpCircle, RotateCcw, Clock, Info, Moon, Sun, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";
import { useOrderStore } from "@/stores/useOrderStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import logoWebp from "@/assets/logo.webp";
import * as inviteService from "@/services/inviteService";
import { useSiteInfo } from "@/hooks/useSiteInfo";

export default function Profile() {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const siteName = siteInfo.siteName || "真烟网";
  const { nickname, avatar, pointsBalance, inviteCode, subordinateEnabled, loadProfile } = useUserStore();
  const authStore = useAuthStore();
  const { orders, loadOrders } = useOrderStore();
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const { theme, toggle } = useTheme();
  const [subCount, setSubCount] = useState(0);

  useEffect(() => {
    if (isLoggedIn() && authStore.isAuthenticated) {
      loadProfile();
      loadOrders();
      inviteService.fetchInviteStats().then((s) => setSubCount(s.directCount)).catch(() => {});
    }
  }, [authStore.isAuthenticated, loadProfile, loadOrders]);

  const handleLogout = async () => {
    await authStore.logout();
    toast.success("已退出登录");
    navigate("/login");
  };

  /** 未登录：与 ProtectedRoute 一致以 token 为准，避免持久化状态与 token 不一致 */
  if (!isLoggedIn()) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="profile-header-dark rounded-b-3xl px-4 pb-10 pt-12 pt-safe shadow-lg">
          <div className="mx-auto max-w-lg flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/10">
                <img src={logoSrc} alt="" className="h-full w-full object-contain p-2" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">欢迎来到{siteName}</h2>
                <p className="text-xs text-white/60 mt-1">登录后查看订单、积分与优惠</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
              title={theme === "dark" ? "切换亮色" : "切换暗色"}
            >
              {theme === "dark" ? <Sun size={20} className="text-gold" /> : <Moon size={20} className="text-white/80" />}
            </button>
          </div>
          <div className="mx-auto max-w-lg mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/login", { state: { from: "/profile" } })}
              className="flex-1 rounded-2xl bg-gold py-3.5 text-sm font-bold text-primary-foreground shadow-lg"
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => navigate("/login", { state: { from: "/profile" } })}
              className="flex-1 rounded-2xl border border-white/30 bg-white/10 py-3.5 text-sm font-semibold text-white"
            >
              注册
            </button>
          </div>
        </div>
        <main className="mx-auto max-w-lg px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => navigate("/help")}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-left text-sm"
          >
            <HelpCircle size={18} className="text-gold" />
            <span className="flex-1">帮助中心</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/about")}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-left text-sm"
          >
            <Info size={18} className="text-gold" />
            <span className="flex-1">关于我们</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </main>
      </div>
    );
  }

  const menuItems = [
    { icon: Package, label: "我的订单", path: "/orders", show: true },
    { icon: Ticket, label: "优惠券", path: "/coupons", show: true },
    { icon: Star, label: "我的积分", path: "/points", show: true },
    { icon: Bell, label: "消息通知", path: "/notifications", show: true },
    { icon: RotateCcw, label: "退换货", path: "/returns", show: true },
    { icon: Clock, label: "浏览历史", path: "/history", show: true },
    { icon: Users, label: "邀请中心", path: "/invite", show: true },
    { icon: Gift, label: "返现记录", path: "/rewards", show: subordinateEnabled },
    { icon: MapPin, label: "收货地址", path: "/address", show: true },
    { icon: Heart, label: "收藏夹", path: "/favorites", show: true, badge: favoriteCount > 0 ? favoriteCount : undefined },
    { icon: Settings, label: "个人资料", path: "/settings", show: true },
    { icon: HelpCircle, label: "帮助中心", path: "/help", show: true },
    { icon: Info, label: "关于我们", path: "/about", show: true },
  ].filter((m) => m.show);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile header */}
      <div className="profile-header-dark rounded-b-3xl px-4 pb-8 pt-12 pt-safe shadow-lg">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gold text-2xl font-bold text-white">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <img src={logoSrc} alt={siteName} className="h-full w-full object-contain p-1" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{nickname}</h2>
                <p className="text-xs text-white/50">邀请码: {inviteCode}</p>
              </div>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform"
              title={theme === "dark" ? "切换亮色" : "切换暗色"}
            >
              {theme === "dark" ? (
                <Sun size={20} className="text-gold" />
              ) : (
                <Moon size={20} className="text-white/80" />
              )}
            </button>
          </div>

          {/* Stats */}
          <div className={`mt-6 grid gap-4 rounded-xl bg-white/8 backdrop-blur-sm p-4 ${subordinateEnabled ? "grid-cols-4" : "grid-cols-3"}`}>
            <button onClick={() => navigate("/points")} className="text-center active:scale-95 transition-transform">
              <p className="text-xl font-bold text-gold">{pointsBalance}</p>
              <p className="text-[10px] text-white/50">积分</p>
            </button>
            <button onClick={() => navigate("/orders")} className="text-center active:scale-95 transition-transform">
              <p className="text-xl font-bold text-white">{orders.length}</p>
              <p className="text-[10px] text-white/50">订单</p>
            </button>
            <button onClick={() => navigate("/favorites")} className="text-center active:scale-95 transition-transform">
              <p className="text-xl font-bold text-white">{favoriteCount}</p>
              <p className="text-[10px] text-white/50">收藏</p>
            </button>
            {subordinateEnabled && (
              <button onClick={() => navigate("/invite")} className="text-center active:scale-95 transition-transform">
                <p className="text-xl font-bold text-white">{subCount}</p>
                <p className="text-[10px] text-white/50">下级</p>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <main className="mx-auto max-w-lg px-4 py-4">
        <div className="rounded-xl border border-border bg-card">
          {menuItems.map((item, i) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary ${
                i < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <item.icon size={18} className="text-gold" />
              <span className="flex-1 text-sm text-foreground">{item.label}</span>
              {"badge" in item && item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold/10 px-1.5 text-[10px] font-bold text-gold">
                  {item.badge}
                </span>
              )}
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-card py-3.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 active:scale-[0.98]"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </main>
    </div>
  );
}