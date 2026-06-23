import { useEffect, useState } from "react";
import { ArrowRight, Clock3, ReceiptText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { usePublicLocale } from "@/i18n/publicLocale";
import * as rewardService from "@/services/rewardService";
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
  const [rewardBalance, setRewardBalance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const rewardsEnabled = isLoyaltyFeatureEnabled("reward", capabilities, loyaltyConfig);
  const inviteEnabled = loyaltyConfig?.reward?.referralEnabled !== false;

  useEffect(() => {
    if (!rewardsEnabled) {
      setRewardBalance(0);
      setPendingAmount(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rewardsEnabled]);

  return (
    <StoreAccountLayout
      title="返现余额"
      onBack={goBack}
      className="sf-next-page store-v12-page store-wallet-v12-page store-account-subpage-v12-page pb-8"
      mainClassName="sf-next-account-main sm:px-4 xl:py-6"
    >
      <section className="sf-next-folio store-wallet-v12-hero" aria-label="返现余额">
        <div className="sf-next-folio__topline">
          <p className="sf-next-folio__eyebrow store-wallet-v12-hero__label">可用返现</p>
          <span className="sf-next-folio__status">{rewardsEnabled ? "购物抵扣" : "未开启"}</span>
        </div>
        <strong className="sf-next-folio__value store-wallet-v12-hero__amount">
          {loading ? "RM --" : rewardsEnabled ? `RM ${money(rewardBalance)}` : "未开启"}
        </strong>
        <div className="sf-next-folio__meta store-wallet-v12-hero__meta">
          <span className="sf-next-folio__meta-item">
            <b className="sf-next-folio__meta-value">{loading ? "RM --" : `RM ${money(pendingAmount)}`}</b>
            <small className="sf-next-folio__meta-label">待入账</small>
          </span>
          <span className="sf-next-folio__meta-item">
            <b className="sf-next-folio__meta-value">{rewardsEnabled ? "可使用" : "未开启"}</b>
            <small className="sf-next-folio__meta-label">结算抵扣</small>
          </span>
        </div>
      </section>

      <section className="store-wallet-v12-actions" aria-label="返现操作">
        <UnifiedButton
          type="button"
          onClick={() => navigate(localizedPath("/rewards"))}
          disabled={!rewardsEnabled}
          className="store-wallet-v12-action"
        >
          <span className="store-wallet-v12-action__icon" aria-hidden><ReceiptText size={20} /></span>
          <span className="store-wallet-v12-action__copy">
            <strong>返现明细</strong>
            <small>查看入账和抵扣记录</small>
          </span>
          <ArrowRight size={16} aria-hidden />
        </UnifiedButton>

        {inviteEnabled ? (
          <UnifiedButton
            type="button"
            onClick={() => navigate(localizedPath("/invite"))}
            disabled={!rewardsEnabled}
            className="store-wallet-v12-action"
          >
            <span className="store-wallet-v12-action__icon" aria-hidden><Users size={20} /></span>
            <span className="store-wallet-v12-action__copy">
              <strong>邀请返现</strong>
              <small>好友下单后自动记录</small>
            </span>
            <ArrowRight size={16} aria-hidden />
          </UnifiedButton>
        ) : null}

        <div className="store-wallet-v12-note">
          <span aria-hidden><Clock3 size={17} /></span>
          <p>待入账返现会在规则确认后进入可用余额。</p>
        </div>
      </section>
    </StoreAccountLayout>
  );
}
