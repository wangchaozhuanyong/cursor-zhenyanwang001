import { useEffect, useMemo, useState } from "react";
import { BadgePercent, ChevronRight, Clock3, Gift, Loader2, Ticket, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { usePublicLocale } from "@/i18n/publicLocale";
import * as rewardService from "@/services/rewardService";
import { useCouponStore } from "@/stores/useCouponStore";
import { useUserStore } from "@/stores/useUserStore";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function Wallet() {
  const goBack = useGoBack("/profile");
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const capabilities = useSiteCapabilities();
  const { config: loyaltyConfig } = useLoyaltyVisibility();
  const pointsBalance = useUserStore((s) => s.pointsBalance);
  const loadProfile = useUserStore((s) => s.loadProfile);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);
  const [rewardBalance, setRewardBalance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [loadingReward, setLoadingReward] = useState(true);

  const rewardsEnabled = isLoyaltyFeatureEnabled("reward", capabilities, loyaltyConfig);
  const couponCount = useMemo(() => coupons.filter((item) => !item.used_at).length, [coupons]);

  useEffect(() => {
    void loadProfile();
    if (capabilities.couponEnabled) void loadCoupons();
  }, [capabilities.couponEnabled, loadCoupons, loadProfile]);

  useEffect(() => {
    if (!rewardsEnabled) {
      setLoadingReward(false);
      return;
    }
    let cancelled = false;
    setLoadingReward(true);
    rewardService.fetchRewardBalance()
      .then((res) => {
        if (cancelled) return;
        setRewardBalance(Number(res.balance || 0));
        setPendingAmount(Number(res.pendingAmount || 0));
      })
      .catch(() => {
        if (cancelled) return;
        setRewardBalance(0);
        setPendingAmount(0);
      })
      .finally(() => {
        if (!cancelled) setLoadingReward(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rewardsEnabled]);

  const assets = [
    {
      title: "返现余额",
      value: rewardsEnabled ? `RM ${money(rewardBalance)}` : "未开启",
      description: rewardsEnabled ? "可在结算页按后台规则抵扣" : "返现钱包功能当前关闭",
      href: "/rewards",
      enabled: rewardsEnabled,
      icon: WalletCards,
    },
    {
      title: "积分",
      value: capabilities.pointsEnabled ? String(pointsBalance) : "未开启",
      description: capabilities.pointsEnabled ? "签到、奖励和兑换记录集中管理" : "积分功能当前关闭",
      href: "/points",
      enabled: capabilities.pointsEnabled,
      icon: BadgePercent,
    },
    {
      title: "优惠券",
      value: capabilities.couponEnabled ? `${couponCount} 张` : "未开启",
      description: capabilities.couponEnabled ? "领券后结算页由后端重新校验" : "优惠券功能当前关闭",
      href: "/coupons",
      enabled: capabilities.couponEnabled,
      icon: Ticket,
    },
    {
      title: "礼品卡",
      value: "未接入",
      description: "V12 设计预留入口；当前没有真实后端礼品卡能力",
      href: "/feature-status",
      enabled: true,
      icon: Gift,
    },
  ];
  const enabledAssetCount = assets.filter((item) => item.enabled).length;
  const walletStats = [
    {
      label: "可用返现",
      value: rewardsEnabled ? `RM ${money(rewardBalance)}` : "未开启",
      hint: "结算页后端校验抵扣",
      icon: WalletCards,
    },
    {
      label: "待入账",
      value: `RM ${money(pendingAmount)}`,
      hint: "订单确认后按规则入账",
      icon: Clock3,
    },
    {
      label: "优惠券",
      value: capabilities.couponEnabled ? `${couponCount} 张` : "未开启",
      hint: "最终资格以结算为准",
      icon: Ticket,
    },
    {
      label: "礼品卡",
      value: "预留",
      hint: "未接入真实后台前不参与下单",
      icon: Gift,
    },
  ];

  return (
    <StoreAccountLayout title="余额 / 礼品卡" onBack={goBack} className="store-v12-page store-wallet-v12-page">
      <section className="store-v12-info-hero">
        <span className="store-v12-eyebrow">
          <WalletCards size={15} aria-hidden />
          资产中心
        </span>
        <h2>
          {loadingReward ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              正在同步资产
            </span>
          ) : (
            <>RM {money(rewardBalance)}</>
          )}
        </h2>
        <p>
          返现、积分和优惠券只做展示和入口聚合；是否可用、可抵扣多少、能否叠加，以购物车和结算页后端预览结果为准。
        </p>
        <div className="store-v12-status-strip">
          <span>{enabledAssetCount} 个资产入口可用</span>
          {pendingAmount > 0 ? <span>待入账 RM {money(pendingAmount)}</span> : null}
        </div>
      </section>

      <section className="store-wallet-v12-summary store-orders-v12-stat-grid mt-4" aria-label="资产摘要">
        {walletStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon" aria-hidden>
                <Icon size={17} />
              </span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </div>
          );
        })}
      </section>

      <section className="store-v12-grid mt-4">
        {assets.map((item) => {
          const Icon = item.icon;
          return (
            <UnifiedButton
              key={item.title}
              type="button"
              onClick={item.enabled ? () => navigate(localizedPath(item.href)) : undefined}
              disabled={!item.enabled}
              className="store-v12-info-card store-v12-asset-card"
            >
              <span className="store-v12-card-icon" aria-hidden><Icon size={20} /></span>
              <span className="store-v12-asset-main">
                <strong>{item.title}</strong>
                <b>{item.value}</b>
                <small>{item.description}</small>
              </span>
              {item.enabled ? <ChevronRight size={16} aria-hidden /> : null}
            </UnifiedButton>
          );
        })}
      </section>

      <section className="store-v12-info-card mt-4">
        <div className="store-v12-card-title">结算规则</div>
        <div className="store-v12-list">
          <div className="store-v12-list-row"><span className="store-v12-dot" aria-hidden /><span>返现钱包抵扣必须由结算页后端预览返回。</span></div>
          <div className="store-v12-list-row"><span className="store-v12-dot" aria-hidden /><span>积分和优惠券不可由前端自行决定是否可叠加。</span></div>
          <div className="store-v12-list-row"><span className="store-v12-dot" aria-hidden /><span>礼品卡入口已预留，未接入真实后台前不会参与下单。</span></div>
        </div>
      </section>
    </StoreAccountLayout>
  );
}
