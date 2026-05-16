import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  Package,
  Palette,
  Settings,
  ShieldCheck,
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

const CARD_CLASS = "rounded-[26px] bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]";
const SECTION_PADDING = "p-4";

function gateNavigate(navigate: ReturnType<typeof useNavigate>, path: string, requireAuth = true) {
  if (requireAuth && !isLoggedIn()) {
    navigate("/login", { state: { from: path } });
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
  memberCardStyle,
}: {
  logoSrc: string;
  avatar?: string;
  userName: string;
  memberLevelName: string;
  code: string;
  onAvatarClick: () => void;
  memberCardStyle: "light" | "gold" | "blackGold" | "fresh";
}) {
  const heroStyle =
    memberCardStyle === "blackGold"
      ? "bg-[linear-gradient(110deg,#0d0b08,#1e1812_45%,#2b2016)] text-[#f7e6be]"
      : memberCardStyle === "gold"
        ? "bg-[linear-gradient(110deg,#f4e7c8,#dec08b)] text-[#2f2415]"
        : memberCardStyle === "fresh"
          ? "bg-[linear-gradient(110deg,#edf9f4,#d8efe4)] text-[#173429]"
          : "bg-[linear-gradient(110deg,#191714,#2a241d)] text-[#f2deab]";

  const mutedClass = memberCardStyle === "light" ? "text-[#d7c18f]" : "opacity-85";

  return (
    <section className={`relative overflow-hidden rounded-[30px] px-4 py-5 shadow-[var(--theme-shadow)] ${heroStyle}`}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-[linear-gradient(90deg,transparent,rgba(255,226,166,.16))]" />
      <div className="relative flex min-h-[112px] items-center gap-4">
        <button type="button" onClick={onAvatarClick} className="relative shrink-0" aria-label="更换头像">
          <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-[#d6b774] bg-black/30 p-1">
            <img src={avatar || logoSrc} alt={userName} className="h-full w-full rounded-full object-cover" />
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
            <Camera size={11} />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="max-w-full truncate text-2xl font-bold leading-tight">{userName}</p>
            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#2d2720] shadow-[0_4px_14px_rgba(0,0,0,.18)]">{memberLevelName}</span>
          </div>
          <p className={`mt-2 inline-flex max-w-full rounded-full bg-black/15 px-3 py-1 text-sm font-semibold ${mutedClass}`}>
            <span className="truncate">邀请码：{code}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
export default function Profile() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
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
    if (!loggedIn) return;
    loadProfile().catch(() => {});
    loadOrders().catch(() => {});
    loadCoupons().catch(() => {});
    loadFavorites().catch(() => {});
    useNotificationStore.getState().fetchUnreadCount();
    inviteService.fetchInviteStats().then((s) => setInviteCount(s.directCount || 0)).catch(() => {});
    rewardService.fetchRewardBalance().then((res) => setRewardBalance(Number(res.balance || 0))).catch(() => setRewardBalance(0));
  }, [loadCoupons, loadFavorites, loadOrders, loadProfile, loggedIn]);

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
    { label: "积分", value: String(pointsBalance), path: "/points", auth: true },
    { label: "优惠券", value: String(couponCount), path: "/coupons", auth: true },
    { label: "收藏", value: String(favoriteCount), path: "/favorites", auth: false },
    { label: "返现", value: `RM ${rewardBalance.toFixed(2)}`, path: "/rewards", auth: true },
  ];

  const guestOrderItems = [
    { label: "待付款", icon: Wallet },
    { label: "待发货", icon: Package },
    { label: "待收货", icon: Truck },
    { label: "售后", icon: CircleHelp },
  ];

  return (
    <div className="store-page store-bottom-safe min-h-screen px-4 pt-[max(env(safe-area-inset-top),1rem)] text-[var(--theme-text)]">
      <main className="mx-auto max-w-lg space-y-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <img src={logoSrc} alt={siteName} className="h-10 w-10 rounded-xl object-contain shadow-sm" />
            <div className="flex shrink-0 items-center gap-2">
              {loggedIn ? <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} /> : null}
              <SkinPickerDialog trigger={<button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--theme-surface)] text-[var(--theme-text-muted-on-surface)] shadow-[var(--theme-shadow)]"><Palette size={17} /></button>} />
            </div>
          </div>

          {!loggedIn ? (
            <div className={`${CARD_CLASS} relative overflow-hidden p-4`}>
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--theme-primary)]" />
              <div className="flex items-center gap-3">
                <img src={logoSrc} alt={siteName} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-[var(--theme-border)]" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">欢迎来到 {siteName}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">登录后可查看订单、积分、优惠券、收藏、返现与邀请奖励</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => navigate("/login", { state: { from: "/profile" } })} className="rounded-2xl bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]">登录</button>
                <button type="button" onClick={() => navigate("/login", { state: { from: "/profile" } })} className="rounded-2xl bg-[var(--theme-bg)] py-3 text-sm font-semibold ring-1 ring-[var(--theme-border)]">注册</button>
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
                memberCardStyle={themeConfig.memberCardStyle}
              />
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </>
          )}
        </section>

        <section className={`${CARD_CLASS} overflow-hidden`}>
          <div className="p-4">
            <SectionTitle title="我的权益" />
            <div className="grid grid-cols-4 rounded-2xl bg-[var(--theme-bg)] px-2 py-3 ring-1 ring-[color-mix(in_srgb,var(--theme-border)_65%,transparent)]">
              {assetItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => gateNavigate(navigate, item.path, item.auth)}
                  className="min-w-0 px-1 py-1 text-center"
                >
                  <p className="truncate text-xs font-semibold text-[var(--theme-text-muted-on-surface)]">{item.label}</p>
                  <p className={`mt-2 truncate font-bold text-[var(--theme-text-on-surface)] ${item.label === "返现" ? "text-sm" : "text-base"}`}>
                    {item.value}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="mx-4 mb-4 border-t border-[color-mix(in_srgb,var(--theme-border)_72%,transparent)] pt-3">
            <div
              className="relative overflow-hidden rounded-[22px] border border-[#ead8ad] px-4 py-3"
              style={{ background: "linear-gradient(110deg,#f7edd3,#efdcb8)" }}
            >
              <div className="grid grid-cols-[1fr_88px] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[#2e2417]">邀请好友得奖励</p>
                  <p className="mt-1 truncate text-xs text-[#5b4a30]">{loggedIn ? "好友注册/下单后可获得积分返现" : "登录后邀请好友获得积分返现"}</p>
                  <p className="mt-1 truncate text-xs text-[#5b4a30]">{loggedIn ? `已邀请 ${inviteCount} 人，累计返现 RM ${rewardBalance.toFixed(2)}` : "登录后查看邀请奖励"}</p>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-2">
                  <div className="h-10 w-12 rounded-2xl bg-[linear-gradient(140deg,#f6dfaa,#d8ac62)] shadow-[0_8px_18px_rgba(89,58,8,.18)] ring-1 ring-[#c79547]/30" />
                  <button
                    type="button"
                    onClick={() => (loggedIn ? gateNavigate(navigate, "/invite", true) : navigate("/login", { state: { from: "/profile" } }))}
                    className="w-full rounded-full bg-[linear-gradient(135deg,#2f2d2a,#141414)] px-2 py-1.5 text-xs font-semibold text-[#f5e4bc] shadow-[0_6px_14px_rgba(0,0,0,.22)]"
                  >
                    {loggedIn ? "立即邀请" : "去登录"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <SectionTitle title="我的订单" rightLabel="查看全部" onRightClick={() => gateNavigate(navigate, "/orders", true)} />
          <div className="grid grid-cols-4 gap-2">
            {(loggedIn
              ? [
                  { label: "待付款", icon: Wallet, value: orderPending, path: "/orders" },
                  { label: "待发货", icon: Package, value: orderShipping, path: "/orders" },
                  { label: "待收货", icon: Truck, value: orderReceiving, path: "/orders" },
                  { label: "售后", icon: CircleHelp, value: 0, path: "/returns" },
                ]
              : guestOrderItems.map((it) => ({ ...it, value: 0, path: "/orders" }))).map((item) => (
              <button key={item.label} type="button" onClick={() => gateNavigate(navigate, item.path, true)} className="relative rounded-2xl bg-[var(--theme-bg)] px-1 py-3 text-center ring-1 ring-[color-mix(in_srgb,var(--theme-border)_65%,transparent)]">
                {item.value > 0 ? <span className="absolute right-3 top-2 min-w-[1rem] rounded-full bg-[var(--theme-danger)] px-1 text-[10px] text-white">{item.value}</span> : null}
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-secondary)_10%,var(--theme-surface))] text-[var(--theme-secondary)]">
                  <item.icon size={17} />
                </span>
                <p className="mt-2 text-xs font-medium">{item.label}</p>
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
              { label: "我的收藏", icon: Heart, path: "/favorites", auth: false },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => gateNavigate(navigate, item.path, item.auth)} className="min-h-[76px] rounded-2xl bg-[var(--theme-bg)] px-1 py-2 text-center ring-1 ring-[color-mix(in_srgb,var(--theme-border)_60%,transparent)]">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-secondary)_12%,var(--theme-surface))] text-[var(--theme-secondary)]"><item.icon size={16} /></span>
                <p className="mt-1 text-[11px] leading-4">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={`${CARD_CLASS} ${SECTION_PADDING}`}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { title: "正品保障", desc: "100% 正品保证", icon: ShieldCheck },
              { title: "本地配送", desc: "快速发货", icon: Truck },
              { title: "安全支付", desc: "加密保护", icon: Wallet },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-[var(--theme-bg)] px-2 py-3 text-center">
                <item.icon size={17} className="mx-auto text-[var(--theme-secondary)]" />
                <p className="mt-1 text-xs font-semibold">{item.title}</p>
                <p className="mt-0.5 truncate text-[10px] text-[var(--theme-text-muted-on-surface)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {loggedIn ? (
          <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--theme-danger)_12%,var(--theme-surface))] py-3 text-sm font-semibold text-[var(--theme-danger)]">
            <LogOut size={16} />
            退出登录
          </button>
        ) : null}
      </main>
    </div>
  );
}
