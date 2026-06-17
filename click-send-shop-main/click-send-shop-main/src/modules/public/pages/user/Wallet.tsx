import { useEffect, useMemo, useState } from "react";
import { BadgePercent, ChevronRight, Clock3, Gift, Ticket, WalletCards } from "lucide-react";
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

  const rewardsEnabled = isLoyaltyFeatureEnabled("reward", capabilities, loyaltyConfig);
  const couponCount = useMemo(() => coupons.filter((item) => !item.used_at).length, [coupons]);

  useEffect(() => {
    void loadProfile();
    if (capabilities.couponEnabled) void loadCoupons();
  }, [capabilities.couponEnabled, loadCoupons, loadProfile]);

  useEffect(() => {
    if (!rewardsEnabled) {
      return;
    }
    let cancelled = false;
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
      });
    return () => {
      cancelled = true;
    };
  }, [rewardsEnabled]);

  const assets = [
    {
      title: "返现余额",
      value: rewardsEnabled ? `RM ${money(rewardBalance)}` : "未开启",
      description: rewardsEnabled ? "" : "返现钱包功能当前关闭",
      href: "/rewards",
      enabled: rewardsEnabled,
      icon: WalletCards,
    },
    {
      title: "积分",
      value: capabilities.pointsEnabled ? String(pointsBalance) : "未开启",
      description: capabilities.pointsEnabled ? "" : "积分功能当前关闭",
      href: "/points",
      enabled: capabilities.pointsEnabled,
      icon: BadgePercent,
    },
    {
      title: "优惠券",
      value: capabilities.couponEnabled ? `${couponCount} 张` : "未开启",
      description: capabilities.couponEnabled ? "" : "优惠券功能当前关闭",
      href: "/coupons",
      enabled: capabilities.couponEnabled,
      icon: Ticket,
    },
    {
      title: "礼品卡",
      value: "敬请期待",
      description: "",
      href: "/feature-status",
      enabled: true,
      icon: Gift,
    },
  ];
  const walletStats = [
    {
      label: "可用返现",
      value: rewardsEnabled ? `RM ${money(rewardBalance)}` : "未开启",
      hint: "",
      icon: WalletCards,
    },
    {
      label: "待入账",
      value: `RM ${money(pendingAmount)}`,
      hint: "",
      icon: Clock3,
    },
    {
      label: "优惠券",
      value: capabilities.couponEnabled ? `${couponCount} 张` : "未开启",
      hint: "",
      icon: Ticket,
    },
    {
      label: "礼品卡",
      value: "敬请期待",
      hint: "",
      icon: Gift,
    },
  ];

  return (
    <StoreAccountLayout title="余额 / 礼品卡" onBack={goBack} className="store-v12-page store-wallet-v12-page">
      <section className="store-wallet-v12-summary store-orders-v12-stat-grid" aria-label="资产摘要">
        {walletStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon" aria-hidden>
                <Icon size={17} />
              </span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              {item.hint ? <small>{item.hint}</small> : null}
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
                {item.description ? <small>{item.description}</small> : null}
              </span>
              {item.enabled ? <ChevronRight size={16} aria-hidden /> : null}
            </UnifiedButton>
          );
        })}
      </section>
    </StoreAccountLayout>
  );
}
