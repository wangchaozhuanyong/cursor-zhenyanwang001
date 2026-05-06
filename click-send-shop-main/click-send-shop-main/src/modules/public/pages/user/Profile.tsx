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

type ThemeMode = "light" | "dark";

function ThemeToggleButton({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-text-on-surface)_6%,transparent)] text-[var(--theme-text-on-surface)] backdrop-blur transition-transform active:scale-90"
      title={theme === "dark" ? "切换亮色" : "切换暗色"}
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

function ProfileAvatar({
  src,
  fallback,
  alt,
}: {
  src?: string;
  fallback: string;
  alt: string;
}) {
  return (
    <div className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-1.5 shadow-sm">
      <img
        src={src || fallback}
        alt={alt}
        className="h-full w-full rounded-2xl object-contain"
      />
    </div>
  );
}

/** 仅亮色模式：在 surface 上叠加极淡主色→价格色渐变，深色模式由 .dark 隐藏 */
function ProfileHeaderLightWash() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 dark:hidden"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 11%, var(--theme-surface)), color-mix(in srgb, var(--theme-price) 7%, var(--theme-surface)))",
      }}
    />
  );
}

function StatChip({
  value,
  label,
  onClick,
  accent = false,
}: {
  value: string | number;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-text-on-surface)_5%,transparent)] px-2 py-3 text-center text-[var(--theme-text-on-surface)] backdrop-blur transition-transform active:scale-95"
    >
      <p
        className="text-lg font-black leading-none"
        style={accent ? { color: "var(--theme-price)" } : undefined}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium text-[var(--theme-text-muted-on-surface)]">{label}</p>
    </button>
  );
}

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
  const goLogin = () => navigate("/login", { state: { from: "/profile" } });
  const guestBenefits = [
    { icon: Package, label: "订单追踪", desc: "实时查看状态" },
    { icon: Star, label: "积分抵扣", desc: "消费累计积分" },
    { icon: Ticket, label: "专属优惠", desc: "会员专享好券" },
  ];
  const guestPreviewItems = [
    { icon: Package, label: "我的订单" },
    { icon: Ticket, label: "优惠券" },
    { icon: Star, label: "积分中心" },
    { icon: Heart, label: "收藏商品" },
  ];

  /** 未登录：与 ProtectedRoute 一致以 token 为准，避免持久化状态与 token 不一致 */
  if (!isLoggedIn()) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] pb-20 text-[var(--theme-text)]">
        <div className="px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <section className="theme-rounded relative mx-auto max-w-lg overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow text-[var(--theme-text-on-surface)]">
            <ProfileHeaderLightWash />
            <div className="pointer-events-none absolute -right-12 -top-14 z-[1] h-36 w-36 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,transparent)] blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 z-[1] h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)] blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <ProfileAvatar src={logoSrc} fallback={logoWebp} alt={siteName} />
                <div className="min-w-0">
                  <p className="mb-2 inline-flex rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-price)]">
                    Member Access
                  </p>
                  <h2 className="text-xl font-black leading-tight text-[var(--theme-text-on-surface)]">登录{siteName}</h2>
                  <p className="mt-1 max-w-[12rem] text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">管理订单、积分、优惠券与会员权益</p>
                </div>
              </div>
              <ThemeToggleButton theme={theme} onToggle={toggle} />
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={goLogin}
                className="rounded-2xl bg-[var(--theme-primary)] py-3.5 text-sm font-black text-[var(--theme-primary-foreground)] shadow-lg shadow-black/10 transition-transform active:scale-[0.98]"
              >
                登录
              </button>
              <button
                type="button"
                onClick={goLogin}
                className="rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_40%,var(--theme-surface))] py-3.5 text-sm font-bold text-[var(--theme-text-on-surface)] transition-transform active:scale-[0.98]"
              >
                注册
              </button>
            </div>
          </section>
        </div>
        <main className="mx-auto max-w-lg space-y-4 px-4 py-1">
          <section className="grid grid-cols-3 gap-2.5">
            {guestBenefits.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={goLogin}
                className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-3 text-center theme-shadow transition-transform active:scale-[0.97]"
              >
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)]">
                  <item.icon size={18} className="text-[var(--theme-price)]" />
                </div>
                <p className="text-xs font-bold text-[var(--theme-text-on-surface)]">{item.label}</p>
                <p className="mt-1 text-[10px] text-theme-muted">{item.desc}</p>
              </button>
            ))}
          </section>

          <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[var(--theme-text-on-surface)]">登录后可用</h3>
                <p className="mt-1 text-xs text-theme-muted">开启你的会员工作台</p>
              </div>
              <button
                type="button"
                onClick={goLogin}
                className="rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--theme-price)]"
              >
                去登录
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {guestPreviewItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={goLogin}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-bg)_58%,var(--theme-surface))] px-3 py-3 text-left transition-transform active:scale-[0.98]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_10%,transparent)]">
                    <item.icon size={17} className="text-[var(--theme-price)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--theme-text-on-surface)]">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => navigate("/help")}
            className="theme-rounded flex w-full items-center gap-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-4 text-left text-sm theme-shadow"
          >
            <HelpCircle size={18} className="text-[var(--theme-price)]" />
            <span className="flex-1 text-[var(--theme-text-on-surface)]">帮助中心</span>
            <ChevronRight size={16} className="text-theme-muted" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/about")}
            className="theme-rounded flex w-full items-center gap-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-4 text-left text-sm theme-shadow"
          >
            <Info size={18} className="text-[var(--theme-price)]" />
            <span className="flex-1 text-[var(--theme-text-on-surface)]">关于我们</span>
            <ChevronRight size={16} className="text-theme-muted" />
          </button>
        </main>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
   *  菜单分级（专业电商优先级）
   *   一级（QuickGrid）：核心购物链路 — 订单 / 收藏 / 地址 / 退换货
   *   二级（Benefits）：会员权益 — 优惠券 / 积分 / 邀请 / 返现
   *   三级（Misc）：系统/帮助 — 浏览历史 / 通知 / 设置 / 帮助 / 关于
   * ───────────────────────────────────────────────────────────────── */
  const quickItems = [
    { icon: Package, label: "全部订单", path: "/orders", desc: `${orders.length} 笔` },
    { icon: Heart, label: "我的收藏", path: "/favorites", desc: favoriteCount > 0 ? `${favoriteCount} 件` : "去收藏" },
    { icon: MapPin, label: "收货地址", path: "/address", desc: "管理" },
    { icon: RotateCcw, label: "退换/售后", path: "/returns", desc: "查询" },
  ];

  const benefitItems = [
    { icon: Ticket, label: "优惠券", path: "/coupons", show: true },
    { icon: Star, label: "积分中心", path: "/points", show: true, hint: `${pointsBalance} 分` },
    { icon: Users, label: "邀请好友", path: "/invite", show: true, hint: subCount > 0 ? `${subCount} 位下级` : undefined },
    { icon: Gift, label: "返现记录", path: "/rewards", show: subordinateEnabled },
  ].filter((m) => m.show);

  const miscItems = [
    { icon: Clock, label: "浏览历史", path: "/history" },
    { icon: Bell, label: "消息通知", path: "/notifications" },
    { icon: Settings, label: "个人资料", path: "/settings" },
    { icon: HelpCircle, label: "帮助中心", path: "/help" },
    { icon: Info, label: "关于我们", path: "/about" },
  ];

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-20 text-[var(--theme-text)]">
      {/* Profile header */}
      <div className="px-4 pb-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <section className="theme-rounded relative mx-auto max-w-lg overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow text-[var(--theme-text-on-surface)]">
          <ProfileHeaderLightWash />
          <div className="pointer-events-none absolute -right-16 top-0 z-[1] h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-4 z-[1] h-36 w-36 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)] blur-2xl" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <ProfileAvatar src={avatar || logoSrc} fallback={logoWebp} alt={nickname || siteName} />
              <div className="min-w-0">
                <p className="mb-2 inline-flex rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-price)]">
                  VIP Account
                </p>
                <h2 className="truncate text-xl font-black leading-tight text-[var(--theme-text-on-surface)]">{nickname || "会员用户"}</h2>
                <p className="mt-1 text-xs text-[var(--theme-text-muted-on-surface)]">邀请码: {inviteCode || "暂无"}</p>
              </div>
            </div>

            <ThemeToggleButton theme={theme} onToggle={toggle} />
          </div>

          {/* Stats: 订单/收藏 优先，积分/下级 次之 */}
          <div className={`relative z-10 mt-6 grid gap-2.5 ${subordinateEnabled ? "grid-cols-4" : "grid-cols-3"}`}>
            <StatChip value={orders.length} label="订单" onClick={() => navigate("/orders")} />
            <StatChip value={favoriteCount} label="收藏" onClick={() => navigate("/favorites")} />
            <StatChip value={pointsBalance} label="积分" onClick={() => navigate("/points")} accent />
            {subordinateEnabled && (
              <StatChip value={subCount} label="下级" onClick={() => navigate("/invite")} />
            )}
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* 一级 - 核心购物入口（九宫格） */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-medium text-muted-foreground">我的购物</h3>
          <div className="grid grid-cols-4 gap-2 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow">
            {quickItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-secondary active:scale-[0.97]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)]">
                  <item.icon size={20} className="text-[var(--theme-price)]" />
                </div>
                <span className="text-[12px] font-medium text-foreground">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 二级 - 会员权益 */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-medium text-muted-foreground">会员权益</h3>
          <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow">
            {benefitItems.map((item, i) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary ${
                  i < benefitItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <item.icon size={18} className="text-[var(--theme-price)]" />
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                {item.hint && (
                  <span className="text-xs text-muted-foreground">{item.hint}</span>
                )}
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        {/* 三级 - 系统 / 帮助 */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-medium text-muted-foreground">其他</h3>
          <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow">
            {miscItems.map((item, i) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary ${
                  i < miscItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <item.icon size={18} className="text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-card py-3.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 active:scale-[0.98]"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </main>
    </div>
  );
}