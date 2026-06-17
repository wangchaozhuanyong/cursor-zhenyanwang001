import { useEffect, useState } from "react";
import NotificationIconButton from "@/components/NotificationIconButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePreferBottomSheet } from "@/modules/micro-interactions";
import { useUserStore } from "@/stores/useUserStore";
import { formatAddressForDisplay } from "@/services/addressService";
import { CheckoutAddressCard } from "./components/CheckoutAddressCard";
import { CheckoutAddressPickerSheet } from "./components/CheckoutAddressPickerSheet";
import { CheckoutCouponSection } from "./components/CheckoutCouponSection";
import { CheckoutItemsList } from "./components/CheckoutItemsList";
import { CheckoutLoyaltySection } from "./components/CheckoutLoyaltySection";
import { CheckoutOrderSuccess } from "./components/CheckoutOrderSuccess";
import { CheckoutPaymentMethod } from "./components/CheckoutPaymentMethod";
import { CheckoutPriceSummary } from "./components/CheckoutPriceSummary";
import { CheckoutShippingSection } from "./components/CheckoutShippingSection";
import { CheckoutSubmitBar } from "./components/CheckoutSubmitBar";
import { useCheckoutPage } from "./hooks/useCheckoutPage";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { parseOrderPaymentTimeoutFromSite } from "@/utils/orderPaymentTimeout";
import { LoadingButton } from "@/modules/micro-interactions";
import { submitCtaLabel } from "./utils/checkoutText";
import MarketingPositionNotices from "@/modules/public/components/marketing/MarketingPositionNotices";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { DesktopPurchaseCard, DesktopPurchaseTwoColumn } from "@/components/store/DesktopPurchasePattern";
import CheckoutPromotionExplanation from "@/modules/storefront-v2/checkout/CheckoutPromotionExplanation";
import { fetchPrimaryFullReductionCampaign } from "@/modules/storefront-v2/campaign/campaignService";
import type { StorefrontCampaignVm } from "@/modules/storefront-v2/campaign/campaignTypes";
import { usePublicLocale } from "@/i18n/publicLocale";
import { BadgeCheck, Calculator, ShieldCheck, Truck } from "lucide-react";

export default function Checkout() {
  const { localizedPath, t } = usePublicLocale();
  useDocumentTitle(t("checkout.documentTitle"));
  const checkout = useCheckoutPage();
  const siteInfo = useSiteInfo();
  const payTimeout = parseOrderPaymentTimeoutFromSite(siteInfo);
  const paymentTimeoutHint =
    payTimeout.enabled && checkout.paymentMethod === "online"
      ? `${t("checkout.paymentTimeoutPrefix")} ${payTimeout.minutes} ${t("checkout.paymentTimeoutSuffix")}`
      : null;
  const isMobileSheet = usePreferBottomSheet("standard");
  const addresses = useUserStore((s) => s.addresses);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [fullReductionCampaign, setFullReductionCampaign] = useState<StorefrontCampaignVm | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPrimaryFullReductionCampaign()
      .then((campaign) => {
        if (!cancelled) setFullReductionCampaign(campaign);
      })
      .catch(() => {
        if (!cancelled) setFullReductionCampaign(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChooseAddress = () => {
    if (isMobileSheet) setAddressSheetOpen(true);
    else checkout.goAddress();
  };

  const handlePickAddress = (addr: (typeof addresses)[number]) => {
    checkout.setName(addr.recipient_name);
    checkout.setPhone(addr.phone);
    checkout.setAddress(formatAddressForDisplay(addr));
    checkout.setSelectedAddress(addr);
  };

  const itemCount = checkout.items.reduce((sum, item) => sum + item.qty, 0);
  const missingContact = !checkout.name.trim() || !checkout.phone.trim() || !checkout.address.trim();
  const shippingBlocked =
    checkout.shippingRulesLoading ||
    checkout.shippingQuoteLoading ||
    !checkout.hasShippingTemplate ||
    Boolean(checkout.shippingRulesError || checkout.shippingQuoteError);
  const pricingBlocked = !checkout.backendPricingReady;
  const submitDisabled = checkout.submitting || missingContact || shippingBlocked || pricingBlocked;
  const submitDisabledHint = missingContact
    ? t("checkout.submitMissingContact")
    : shippingBlocked
      ? t("checkout.shippingSyncing")
      : pricingBlocked
        ? checkout.orderPreviewError || "正在更新订单金额"
      : undefined;

  if (checkout.isEmpty) {
    return null;
  }

  if (checkout.submittedOrder) {
    return (
      <CheckoutOrderSuccess
        order={checkout.submittedOrder}
        postSubmitOnlineError={checkout.postSubmitOnlineError}
        postSubmitOnlineNote={checkout.postSubmitOnlineNote}
        postSubmitWalletError={checkout.postSubmitWalletError}
        onCopy={checkout.copyOrderText}
        onWhatsApp={checkout.openWhatsApp}
        onWeChat={checkout.openWeChat}
        onPayOnline={checkout.payOnlineNow}
        onPayRewardWallet={checkout.payByRewardWallet}
        rewardBalance={checkout.rewardBalance}
        payingWallet={checkout.payingWallet}
        onHome={checkout.goHome}
        onViewOrders={checkout.goOrders}
        onViewOrderDetail={() => checkout.goOrderDetail(checkout.submittedOrder!.id)}
        onPaymentTimeoutExpired={checkout.refreshSubmittedOrder}
        onlinePaymentEnabled={checkout.onlinePaymentEnabled}
      />
    );
  }

  return (
    <StoreStandardPageShell
      title={t("checkout.confirmOrder")}
      onBack={checkout.goBack}
      backFallback={localizedPath("/cart")}
      desktopBackLabel={t("checkout.backCart")}
      className="store-conversion-page store-v12-page store-checkout-v12-page store-checkout-page store-bottom-action-space bg-[color-mix(in_srgb,var(--theme-bg)_82%,#f7f1e8)] md:pb-0"
      contentClassName="xl:max-w-screen-xl"
      rightSlot={<NotificationIconButton unreadCount={checkout.unreadCount} onClick={checkout.goNotifications} />}
    >
      <main className="w-full">
        <DesktopPurchaseTwoColumn
          contentClassName="space-y-4"
          aside={
            <DesktopPurchaseCard
              title={t("checkout.orderSummary")}
              className="store-checkout-card store-checkout-summary rounded-[22px] border-[color-mix(in_srgb,var(--theme-border)_75%,transparent)] shadow-[0_18px_46px_rgba(65,45,28,0.12)]"
              bodyClassName="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3 text-sm">
                <span className="text-muted-foreground">{t("checkout.itemCount")}</span>
                <span className="font-bold text-foreground">
                  {itemCount} {t("checkout.unit")}
                </span>
              </div>
              <CheckoutPriceSummary
                rawTotal={checkout.rawTotal}
                discountAmount={checkout.discountAmount}
                discountLines={checkout.discountLines}
                estimatedCouponDiscount={checkout.estimatedCouponDiscount}
                pricingReady={checkout.backendPricingReady}
                pointsBonusLines={checkout.pointsBonusLines}
                shippingFee={checkout.shippingFee}
                totalPoints={checkout.totalPointsValue}
                finalTotal={checkout.finalTotal}
                sstPreview={checkout.sstPreview}
                sstShowInCatalog={checkout.sstCfg.enabled}
                sstCustomerNote={checkout.sstCfg.customerNote}
              />
              <CheckoutPromotionExplanation
                discountLines={checkout.discountLines}
                pointsBonusLines={checkout.pointsBonusLines}
                promotionEvaluation={checkout.promotionEvaluation}
                orderSnapshot={checkout.orderSnapshot}
                fullReductionCampaign={fullReductionCampaign}
                currentAmount={checkout.rawTotal}
                pricingReady={checkout.backendPricingReady}
                pricingError={checkout.orderPreviewError}
              />
              <LoadingButton
                state={checkout.submitting ? "loading" : "normal"}
                onClick={checkout.handleSubmit}
                disabled={submitDisabled}
                variant="solid"
                className="mt-1 min-h-12 w-full rounded-full py-3 text-sm font-bold btn-theme-gradient theme-shadow disabled:opacity-60"
                loadingText={submitCtaLabel(checkout.paymentMethod, true)}
              >
                {submitDisabled && submitDisabledHint ? submitDisabledHint : submitCtaLabel(checkout.paymentMethod, false)}
              </LoadingButton>
            </DesktopPurchaseCard>
          }
        >
            <MarketingPositionNotices position="checkout_notice" />
            <CheckoutTrustGuardrail
              pricingReady={checkout.backendPricingReady}
              pricingError={checkout.orderPreviewError}
              shippingSyncing={shippingBlocked}
            />
            <CheckoutAddressCard
              name={checkout.name}
              phone={checkout.phone}
              address={checkout.address}
              onNameChange={checkout.setName}
              onPhoneChange={checkout.setPhone}
              onAddressChange={checkout.setAddress}
              onSelectedAddressChange={checkout.setSelectedAddress}
              onChooseAddress={handleChooseAddress}
            />

            <CheckoutItemsList items={checkout.items} />

            <CheckoutCouponSection
              rawTotal={checkout.rawTotal}
              shippingFee={checkout.shippingFee}
              selectedCoupon={checkout.selectedCoupon}
              onSelect={checkout.setSelectedCoupon}
              coupons={checkout.pickerCoupons}
              unusableCoupons={checkout.pickerUnusableCoupons}
              loading={checkout.pickerCouponsLoading}
            />
            <CheckoutLoyaltySection
              pointsRedeemEnabled={checkout.pointsRedeemEnabled}
              rewardCashRedeemEnabled={checkout.rewardCashRedeemEnabled}
              orderPreview={checkout.orderPreview}
              usePoints={checkout.usePoints}
              onUsePointsChange={checkout.setUsePoints}
              pointsToUse={checkout.pointsToUse}
              onPointsToUseChange={checkout.setPointsToUse}
              useRewardCash={checkout.useRewardCash}
              onUseRewardCashChange={checkout.setUseRewardCash}
              rewardCashAmount={checkout.rewardCashAmount}
              onRewardCashAmountChange={checkout.setRewardCashAmount}
            />

            <CheckoutShippingSection
              shippingName={checkout.selectedShippingName}
              note={checkout.note}
              shippingRulesLoading={checkout.shippingRulesLoading}
              shippingQuoteLoading={checkout.shippingQuoteLoading}
              shippingRulesError={checkout.shippingRulesError}
              shippingQuoteError={checkout.shippingQuoteError}
              onNoteChange={checkout.setNote}
            />

            <CheckoutPaymentMethod
              paymentMethod={checkout.paymentMethod}
              onPaymentMethodChange={checkout.setPaymentMethod}
              paymentTimeoutHint={paymentTimeoutHint}
              paymentConfigLoaded={checkout.paymentConfigLoaded}
              paymentChannels={checkout.paymentChannels}
              rewardBalance={checkout.rewardBalance}
              selectedPaymentChannelCode={checkout.selectedPaymentChannelCode}
              onPaymentChannelChange={checkout.setSelectedPaymentChannelCode}
              showOnline={checkout.showOnline}
              showCustomerService={checkout.showCustomerService}
            />

            <div className="store-checkout-card store-checkout-summary rounded-[20px] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[0_14px_38px_rgba(65,45,28,0.08)] md:hidden">
              <h3 className="mb-3 text-[15px] font-bold text-foreground">{t("checkout.amountDetail")}</h3>
              <CheckoutPriceSummary
                rawTotal={checkout.rawTotal}
                discountAmount={checkout.discountAmount}
                discountLines={checkout.discountLines}
                estimatedCouponDiscount={checkout.estimatedCouponDiscount}
                pricingReady={checkout.backendPricingReady}
                pointsBonusLines={checkout.pointsBonusLines}
                shippingFee={checkout.shippingFee}
                totalPoints={checkout.totalPointsValue}
                finalTotal={checkout.finalTotal}
                sstPreview={checkout.sstPreview}
                sstShowInCatalog={checkout.sstCfg.enabled}
                sstCustomerNote={checkout.sstCfg.customerNote}
              />
              <CheckoutPromotionExplanation
                discountLines={checkout.discountLines}
                pointsBonusLines={checkout.pointsBonusLines}
                promotionEvaluation={checkout.promotionEvaluation}
                orderSnapshot={checkout.orderSnapshot}
                fullReductionCampaign={fullReductionCampaign}
                currentAmount={checkout.rawTotal}
                pricingReady={checkout.backendPricingReady}
                pricingError={checkout.orderPreviewError}
                className="mt-4"
              />
            </div>
        </DesktopPurchaseTwoColumn>
      </main>

      <CheckoutSubmitBar
        finalTotal={checkout.finalTotal}
        paymentMethod={checkout.paymentMethod}
        submitting={checkout.submitting}
        disabled={submitDisabled}
        disabledHint={submitDisabledHint}
        onSubmit={checkout.handleSubmit}
      />

      <CheckoutAddressPickerSheet
        open={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
        addresses={addresses}
        selectedId={checkout.selectedAddress?.id ?? null}
        onSelect={handlePickAddress}
      />
    </StoreStandardPageShell>
  );
}

function CheckoutTrustGuardrail({
  pricingReady,
  pricingError,
  shippingSyncing,
}: {
  pricingReady: boolean;
  pricingError?: string | null;
  shippingSyncing: boolean;
}) {
  const blocked = Boolean(pricingError);
  const items = [
    {
      icon: Calculator,
      title: "订单金额",
      value: pricingReady ? "已同步" : blocked ? "需处理" : "同步中",
      hint: pricingError || "商品、优惠、积分和返现已汇总",
      tone: pricingReady ? "is-on" : "is-warn",
    },
    {
      icon: BadgeCheck,
      title: "活动资格",
      value: "自动确认",
      hint: "活动适用范围会自动确认",
      tone: "is-on",
    },
    {
      icon: Truck,
      title: "配送库存",
      value: blocked ? "待确认" : shippingSyncing ? "确认中" : "已确认",
      hint: "运费、地址、库存和限购会在提交订单前确认",
      tone: blocked || shippingSyncing ? "is-warn" : "is-on",
    },
  ];

  return (
    <section className="store-checkout-v12-guardrail" aria-label="结算确认">
      <div className="store-checkout-v12-guardrail__head">
        <span className="store-checkout-v12-guardrail__icon" aria-hidden>
          <ShieldCheck size={17} />
        </span>
        <div>
          <h2>提交前确认订单</h2>
          <p>价格、优惠、库存和配送会在提交前确认。</p>
        </div>
      </div>
      <div className="store-checkout-v12-guardrail__grid">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="store-checkout-v12-guardrail__item">
              <span className={`store-checkout-v12-guardrail__status ${item.tone}`}>
                <Icon size={15} aria-hidden />
              </span>
              <strong>{item.value}</strong>
              <span>{item.title}</span>
              <small>{item.hint}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
