import { useState } from "react";
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

export default function Checkout() {
  useDocumentTitle("结算");
  const checkout = useCheckoutPage();
  const siteInfo = useSiteInfo();
  const payTimeout = parseOrderPaymentTimeoutFromSite(siteInfo);
  const paymentTimeoutHint =
    payTimeout.enabled && checkout.paymentMethod === "online"
      ? `在线支付订单需在 ${payTimeout.minutes} 分钟内完成付款，超时将自动取消并释放库存。`
      : null;
  const isMobileSheet = usePreferBottomSheet("standard");
  const addresses = useUserStore((s) => s.addresses);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

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
  const submitDisabled = checkout.submitting || missingContact || shippingBlocked;
  const submitDisabledHint = missingContact
    ? "请先填写收货信息"
    : shippingBlocked
      ? "运费规则同步中"
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
      title="确认订单"
      onBack={checkout.goBack}
      backFallback="/cart"
      desktopBackLabel="返回购物车"
      className="store-conversion-page store-checkout-page store-bottom-action-space bg-[color-mix(in_srgb,var(--theme-bg)_82%,#f7f1e8)] md:pb-0"
      contentClassName="xl:max-w-screen-xl"
      rightSlot={<NotificationIconButton unreadCount={checkout.unreadCount} onClick={checkout.goNotifications} />}
    >
      <main className="w-full">
        <DesktopPurchaseTwoColumn
          contentClassName="space-y-4"
          aside={
            <DesktopPurchaseCard
              title="订单摘要"
              className="store-checkout-card store-checkout-summary rounded-[22px] border-[color-mix(in_srgb,var(--theme-border)_75%,transparent)] shadow-[0_18px_46px_rgba(65,45,28,0.12)]"
              bodyClassName="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-3 text-sm">
                <span className="text-muted-foreground">商品数量</span>
                <span className="font-bold text-foreground">{itemCount} 件</span>
              </div>
              <CheckoutPriceSummary
                rawTotal={checkout.rawTotal}
                discountAmount={checkout.discountAmount}
                discountLines={checkout.discountLines}
                pointsBonusLines={checkout.pointsBonusLines}
                shippingFee={checkout.shippingFee}
                totalPoints={checkout.totalPointsValue}
                finalTotal={checkout.finalTotal}
                sstPreview={checkout.sstPreview}
                sstShowInCatalog={checkout.sstCfg.enabled}
                sstCustomerNote={checkout.sstCfg.customerNote}
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
              <h3 className="mb-3 text-[15px] font-bold text-foreground">金额明细</h3>
              <CheckoutPriceSummary
                rawTotal={checkout.rawTotal}
                discountAmount={checkout.discountAmount}
                discountLines={checkout.discountLines}
                pointsBonusLines={checkout.pointsBonusLines}
                shippingFee={checkout.shippingFee}
                totalPoints={checkout.totalPointsValue}
                finalTotal={checkout.finalTotal}
                sstPreview={checkout.sstPreview}
                sstShowInCatalog={checkout.sstCfg.enabled}
                sstCustomerNote={checkout.sstCfg.customerNote}
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
