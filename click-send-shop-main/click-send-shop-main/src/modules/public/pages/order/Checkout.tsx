import { useState } from "react";
import NotificationIconButton from "@/components/NotificationIconButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMediaSheetMode } from "@/modules/micro-interactions";
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
import PageHeader from "@/components/PageHeader";

export default function Checkout() {
  useDocumentTitle("结算");
  const checkout = useCheckoutPage();
  const siteInfo = useSiteInfo();
  const payTimeout = parseOrderPaymentTimeoutFromSite(siteInfo);
  const paymentTimeoutHint =
    payTimeout.enabled && checkout.paymentMethod === "online"
      ? `在线支付订单需在 ${payTimeout.minutes} 分钟内完成付款，超时将自动取消并释放库存。`
      : null;
  const isMobileSheet = useMediaSheetMode();
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
      />
    );
  }

  return (
    <div className="store-bottom-action-space min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0">
      <PageHeader
        title="确认订单"
        onBack={checkout.goBack}
        rightSlot={<NotificationIconButton unreadCount={checkout.unreadCount} onClick={checkout.goNotifications} />}
      />

      <main className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] py-[var(--store-page-y)] md:px-6 md:py-6">
        <div className="md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-8">
          <div className="space-y-4">
            <MarketingPositionNotices position="checkout_notice" />
            <CheckoutAddressCard
              name={checkout.name}
              phone={checkout.phone}
              address={checkout.address}
              note={checkout.note}
              onNameChange={checkout.setName}
              onPhoneChange={checkout.setPhone}
              onAddressChange={checkout.setAddress}
              onNoteChange={checkout.setNote}
              onSelectedAddressChange={checkout.setSelectedAddress}
              onChooseAddress={handleChooseAddress}
            />

            <CheckoutPaymentMethod
              paymentMethod={checkout.paymentMethod}
              onPaymentMethodChange={checkout.setPaymentMethod}
              paymentTimeoutHint={paymentTimeoutHint}
              paymentConfigLoaded={checkout.paymentConfigLoaded}
              paymentChannels={checkout.paymentChannels}
              stripeReady={checkout.stripeReady}
              rewardBalance={checkout.rewardBalance}
              selectedPaymentChannelCode={checkout.selectedPaymentChannelCode}
              onPaymentChannelChange={checkout.setSelectedPaymentChannelCode}
              showOnline={checkout.showOnline}
              showCustomerService={checkout.showCustomerService}
            />

            <CheckoutCouponSection
              rawTotal={checkout.rawTotal}
              shippingFee={checkout.shippingFee}
              selectedCoupon={checkout.selectedCoupon}
              onSelect={checkout.setSelectedCoupon}
              coupons={checkout.pickerCoupons}
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
              shippingRulesLoading={checkout.shippingRulesLoading}
              shippingQuoteLoading={checkout.shippingQuoteLoading}
              shippingRulesError={checkout.shippingRulesError}
              shippingQuoteError={checkout.shippingQuoteError}
            />

            <CheckoutItemsList items={checkout.items} />

            <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 md:hidden theme-shadow">
              <CheckoutPriceSummary
                rawTotal={checkout.rawTotal}
                discountAmount={checkout.discountAmount}
                discountLines={checkout.discountLines}
                shippingFee={checkout.shippingFee}
                totalPoints={checkout.totalPointsValue}
                finalTotal={checkout.finalTotal}
                sstPreview={checkout.sstPreview}
                sstShowInCatalog={checkout.sstCfg.enabled}
                sstCustomerNote={checkout.sstCfg.customerNote}
              />
            </div>
          </div>

          <aside className="mt-6 hidden self-start md:sticky md:top-20 md:mt-0 md:block">
            <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
              <h3 className="mb-4 text-base font-semibold text-foreground">订单摘要</h3>
              <CheckoutPriceSummary
                rawTotal={checkout.rawTotal}
                discountAmount={checkout.discountAmount}
                discountLines={checkout.discountLines}
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
                disabled={checkout.submitting}
                variant="solid"
                className="mt-5 w-full rounded-full py-3.5 text-sm font-bold btn-theme-gradient theme-shadow !min-h-0"
                loadingText={submitCtaLabel(checkout.paymentMethod, true)}
              >
                {submitCtaLabel(checkout.paymentMethod, false)}
              </LoadingButton>
            </div>
          </aside>
        </div>
      </main>

      <CheckoutSubmitBar
        finalTotal={checkout.finalTotal}
        paymentMethod={checkout.paymentMethod}
        submitting={checkout.submitting}
        onSubmit={checkout.handleSubmit}
      />

      <CheckoutAddressPickerSheet
        open={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
        addresses={addresses}
        selectedId={checkout.selectedAddress?.id ?? null}
        onSelect={handlePickAddress}
      />
    </div>
  );
}
