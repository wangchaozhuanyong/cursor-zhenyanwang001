import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Bell,
  Camera,
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
  ShieldCheck,
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
import { useCouponStore } from "@/stores/useCouponStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import * as inviteService from "@/services/inviteService";
import * as rewardService from "@/services/rewardService";
import * as uploadService from "@/services/uploadService";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

const CARD_CLASS = "rounded-2xl bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]";
const SECTION_PADDING = "p-4";

function gateNavigate(navigate: ReturnType<typeof useNavigate>, path: string, requireAuth = true) {
  if (requireAuth && !isLoggedIn()) {
    navigate("/login", { state: { from: "/profile" } });
    return;
  }
  navigate(path);
}

function SectionTitle({ title, rightLabel, onRightClick }: { title: string; rightLabel?: string; onRightClick?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-semibold tracking-tight text-[var(--theme-text)]">{title}</h3>
      {rightLabel ? (
        <button type="button" onClick={onRightClick} className="inline-flex items-center gap-1 text-xs text-[var(--theme-text-muted-on-surface)]">
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
  memberLevelName,
  code,
  onAvatarClick,
  skinTrigger,
  memberCardStyle,
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  memberLevelName: string;
  code: string;
  onAvatarClick: () => void;
  skinTrigger: ReactNode;
  memberCardStyle: "light" | "gold" | "blackGold" | "fresh";
}) {
  const heroStyle =
    memberCardStyle === "blackGold"
      ? "bg-[linear-gradient(120deg,#15120f,#2a2218)] text-[#f8e7c0]"
      : memberCardStyle === "gold"
        ? "bg-[linear-gradient(120deg,#f5ead1,#ead6aa)] text-[#332817]"
        : memberCardStyle === "fresh"
          ? "bg-[linear-gradient(120deg,#e9f7f4,#d8efe9)] text-[#17312a]"
          : "bg-[var(--theme-surface)] text-[var(--theme-text-on-surface)]";

  const mutedClass = memberCardStyle === "light" ? "text-[var(--theme-text-muted-on-surface)]" : "opacity-80";

  return (
    <section className={`${CARD_CLASS} ${SECTION_PADDING} ${heroStyle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button type="button" onClick={onAvatarClick} className="relative shrink-0" aria-label="更换头像">
            <img src={avatar || logoSrc} alt={userName} className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--theme-border)]" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
              <Camera size={11} />
            </span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-2xl font-semibold leading-tight">{userName}</p>
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold">{memberLevelName}</span>
            </div>
            <p className={`mt-1 text-sm ${mutedClass}`}>邀请码：{code}</p>
          </div>
        </div>
        <div className="shrink-0">{skinTrigger}</div>
      </div>
    </section>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "真烟网";
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const authStore = useAuthStore();
  const { nickname, avatar, pointsBalance, inviteCode, memberLevel, loadProfile } = useUserStore();
  const { orders, loadOrders } = useOrderStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);

  const [inviteCount, setInviteCount] = useState(0);
  const [rewardBalance, setRewardBalance] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { themeConfig } = useThemeRuntime();

  useEffect(() => {
    if (!isLoggedIn()) return;
    loadProfile().catch(() => {});
    loadOrders().catch(() => {});
    loadCoupons().catch(() => {});
    loadFavorites().catch(() => {});
    useNotificationStore.getState().fetchUnreadCount();
    inviteService.fetchInviteStats().then((s) => setInviteCount(s.directCount || 0)).catch(() => {});
    rewardService.fetchRewardBalance().then((res) => setRewardBalance(Number(res.balance || 0))).catch(() => setRewardBalance(0));
  }, [loadCoupons, loadFavorites, loadOrders, loadProfile]);

  const handleLogout = async () => {
    await authStore.logout();
    toast.success("已退出登录", toastPresetQuickSuccess);
    navigate("/login");
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadService.uploadSingle(file);
      useUserStore.setState({ avatar: data.url });
      await useUserStore.getState().saveProfile();
      toast.success("头像已更新", toastPresetQuickSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "头像上传失败");
    } finally {
      e.target.value = "";
    }
  };

  const userName = nickname?.trim() || "会员用户";
  const memberLevelName = memberLevel?.name?.trim() || "普通会员";
  const code = inviteCode?.trim() || "暂无";
  const couponCount = useMemo(() => coupons.filter((c) => !c.used_at && !c.usedAt).length, [coupons]);

  const orderPending = useMemo(() => orders.filter((o) => o.status === "pending" || o.payment_status === "pending").length, [orders]);
  const orderShipping = useMemo(() => orders.filter((o) => (o.status === "paid" || o.payment_status === "paid") && o.status !== "shipped" && o.status !== "completed").length, [orders]);
  const orderReceiving = useMemo(() => orders.filter((o) => o.status === "shipped").length, [orders]);

  const assetItems = [
    { label: "我的积分", value: String(pointsBalance), hint: "可用于订单抵扣", icon: Gift, path: "/points" },
    { label: "优惠券", value: String(couponCount), hint: "下单时可选择使用", icon: Ticket, path: "/coupons" },
    { label: "我的收藏", value: String(favoriteCount), hint: "你收藏的商品", icon: Heart, path: "/favorites" },
    { label: "返现余额", value: `RM ${rewardBalance.toFixed(2)}`, hint: "邀请奖励累计", icon: Wallet, path: "/rewards" },
  ];

  const guestOrderItems = [
    { label: "待付款", icon: Wallet },
    { label: "待发货", icon: Package },
    { label: "待收货", icon: Truck },
    { label: "售后", icon: CircleHelp },
  ];

  return (
    <div className="store-page min-h-screen px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)] text-[var(--theme-text)]">
      <main className="mx-auto max-w-lg space-y-3">
        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoSrc} alt={siteName} className="h-8 w-8 rounded-lg object-contain" />
              <p className="text-lg font-semibold text-[var(--theme-text)]">{siteName}</p>
            </div>
            <div className="flex items-center gap-2">
              {isLoggedIn() ? <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} /> : null}
              <SkinPickerDialog trigger={<button type="button" className="rounded-full bg-[var(--theme-bg)] p-2 text-[var(--theme-text-muted-on-surface)]"><Palette size={16} /></button>} />
            </div>
          </div>

          {!isLoggedIn() ? (
            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-4">
              <div className="flex items-center gap-3">
                <img src={logoSrc} alt={siteName} className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold">欢迎来到 {siteName}</p>
                  <p className="mt-1 text-xs text-[var(--theme-text-muted-on-surface)]">登录后可查看订单、积分、优惠券、返现与邀请奖励</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => navigate("/login", { state: { from: "/profile" } })} className="rounded-xl bg-[var(--theme-primary)] py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]">登录</button>
                <button type="button" onClick={() => navigate("/login", { state: { from: "/profile" } })} className="rounded-xl ring-1 ring-[var(--theme-border)] bg-[var(--theme-surface)] py-2.5 text-sm font-semibold">注册</button>
              </div>
            </div>
          ) : (
            <>
              <ProfileHeroCard
                logoSrc={logoSrc}
                avatar={avatar}
                userName={userName}
                memberLevelName={memberLevelName}
                code={code}
                onAvatarClick={() => avatarInputRef.current?.click()}
                skinTrigger={<button type="button" className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-medium">切换皮肤</button>}
                memberCardStyle={themeConfig.memberCardStyle}
              />
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </>
          )}
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <SectionTitle title="我的资产" />
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)]">
            {assetItems.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                onClick={() => gateNavigate(navigate, item.path, true)}
                className={`min-h-[84px] px-3 py-3 text-left ${idx % 2 === 0 ? "border-r border-[var(--theme-border)]" : ""} ${idx < 2 ? "border-b border-[var(--theme-border)]" : ""}`}
              >
                <div className="flex items-center gap-2 text-[var(--theme-text-muted-on-surface)]"><item.icon size={15} /> <span className="text-xs">{item.label}</span></div>
                <p className="mt-1 text-lg font-semibold text-[var(--theme-text-on-surface)]">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-[var(--theme-text-muted-on-surface)]">{item.hint}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`} style={{ background: "linear-gradient(100deg,color-mix(in_srgb,var(--theme-secondary)_12%,var(--theme-surface)),var(--theme-surface))" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--theme-text-on-surface)]">邀请好友得奖励</p>
              <p className="mt-1 text-xs text-[var(--theme-text-muted-on-surface)]">好友注册/下单后可获得积分或返现</p>
              <p className="mt-2 text-xs text-[var(--theme-text-muted-on-surface)]">已邀请 {inviteCount} 人，累计返现 RM {rewardBalance.toFixed(2)}</p>
            </div>
            <button type="button" onClick={() => gateNavigate(navigate, "/invite", true)} className="shrink-0 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]">立即邀请</button>
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <SectionTitle title="我的订单" rightLabel="查看全部" onRightClick={() => gateNavigate(navigate, "/orders", true)} />
          <div className="grid grid-cols-4 gap-2 text-center">
            {(isLoggedIn()
              ? [
                  { label: "待付款", icon: Wallet, value: orderPending, path: "/orders" },
                  { label: "待发货", icon: Package, value: orderShipping, path: "/orders" },
                  { label: "待收货", icon: Truck, value: orderReceiving, path: "/orders" },
                  { label: "售后", icon: CircleHelp, value: 0, path: "/returns" },
                ]
              : guestOrderItems.map((it) => ({ ...it, value: 0, path: "/orders" }))).map((item) => (
              <button key={item.label} type="button" onClick={() => gateNavigate(navigate, item.path, true)} className="relative rounded-xl px-1 py-2">
                {item.value > 0 ? <span className="absolute left-7 top-0 min-w-[1rem] rounded-full bg-[var(--theme-danger)] px-1 text-[10px] text-white">{item.value}</span> : null}
                <item.icon size={18} className="mx-auto text-[var(--theme-secondary)]" />
                <p className="mt-1 text-xs">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <SectionTitle title="常用服务" />
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "收货地址", icon: MapPin, path: "/address", auth: true },
              { label: "浏览记录", icon: Clock3, path: "/history", auth: false },
              { label: "我的积分", icon: Gift, path: "/points", auth: true },
              { label: "帮助中心", icon: CircleHelp, path: "/help", auth: false },
              { label: "邀请有礼", icon: Gift, path: "/invite", auth: true },
              { label: "消息通知", icon: Bell, path: "/notifications", auth: true },
              { label: "账户设置", icon: Settings, path: "/settings", auth: true },
              { label: "我的收藏", icon: Heart, path: "/favorites", auth: true },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => gateNavigate(navigate, item.path, item.auth)} className="space-y-1 rounded-xl bg-[var(--theme-bg)] px-1 py-2 text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-secondary)_12%,var(--theme-surface))] text-[var(--theme-secondary)]"><item.icon size={16} /></span>
                <p className="text-[11px]">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-sm font-semibold">正品保障</p><p className="text-xs text-[var(--theme-text-muted-on-surface)]">100% 正品保证</p></div>
            <div><p className="text-sm font-semibold">本地配送</p><p className="text-xs text-[var(--theme-text-muted-on-surface)]">快速发货</p></div>
            <div><p className="text-sm font-semibold">安全支付</p><p className="text-xs text-[var(--theme-text-muted-on-surface)]">多重加密保护</p></div>
          </div>
        </section>

        {isLoggedIn() ? (
          <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--theme-danger)_12%,var(--theme-surface))] py-3 text-sm font-semibold text-[var(--theme-danger)]">
            <LogOut size={16} />
            退出登录
          </button>
        ) : null}
      </main>
    </div>
  );
}
