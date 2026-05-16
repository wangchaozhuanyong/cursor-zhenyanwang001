import { ArrowLeft } from "lucide-react";
import NotificationIconButton from "@/components/NotificationIconButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { CheckoutAddressCard } from "./components/CheckoutAddressCard";
import { CheckoutCouponSection } from "./components/CheckoutCouponSection";
import { CheckoutItemsList } from "./components/CheckoutItemsList";
import { CheckoutOrderSuccess } from "./components/CheckoutOrderSuccess";
import { CheckoutPaymentMethod } from "./components/CheckoutPaymentMethod";
import { CheckoutPriceSummary } from "./components/CheckoutPriceSummary";
import { CheckoutShippingSection } from "./components/CheckoutShippingSection";
import { CheckoutSubmitBar } from "./components/CheckoutSubmitBar";
import { useCheckoutPage } from "./hooks/useCheckoutPage";
import { submitCtaLabel } from "./utils/checkoutText";

export default function Checkout() {
  useDocumentTitle("结算");
  const checkout = useCheckoutPage();

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
      />
    );
  }

  return (
    <div className="store-bottom-action-space min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] md:pb-0">
      <header className="sticky top-0 z-40 bg-[var(--theme-surface)]/95 px-4 py-3 backdrop-blur-md md:px-6 border-b border-[var(--theme-border)]">
        <div className="mx-auto flex w-full max-w-screen-xl items-center gap-3">
          <button onClick={checkout.goBack} aria-label="返回购物车" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)] touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-foreground md:text-xl">确认订单</h1>
          <NotificationIconButton unreadCount={checkout.unreadCount} onClick={checkout.goNotifications} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl px-4 py-4 md:px-6 md:py-6">
        <div className="md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-8">
          <div className="space-y-4">
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
              onChooseAddress={checkout.goAddress}
            />

            <CheckoutPaymentMethod
              paymentMethod={checkout.paymentMethod}
              onPaymentMethodChange={checkout.setPaymentMethod}
              paymentConfigLoaded={checkout.paymentConfigLoaded}
              paymentChannels={checkout.paymentChannels}
              stripeReady={checkout.stripeReady}
              rewardBalance={checkout.rewardBalance}
              selectedPaymentChannelCode={checkout.selectedPaymentChannelCode}
              onPaymentChannelChange={checkout.setSelectedPaymentChannelCode}
            />

            <CheckoutCouponSection
              rawTotal={checkout.rawTotal}
              shippingFee={checkout.shippingFee}
              selectedCoupon={checkout.selectedCoupon}
              onSelect={checkout.setSelectedCoupon}
              coupons={checkout.pickerCoupons}
              loading={checkout.pickerCouponsLoading}
            />

            <CheckoutShippingSection
              rawTotal={checkout.rawTotal}
              shippingId={checkout.shippingId}
              shippingRulesLoading={checkout.shippingRulesLoading}
              shippingQuoteLoading={checkout.shippingQuoteLoading}
              shippingRulesError={checkout.shippingRulesError}
              shippingQuoteError={checkout.shippingQuoteError}
              onSelectShipping={checkout.setShippingId}
            />

            <CheckoutItemsList items={checkout.items} />

            <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 md:hidden theme-shadow">
              <CheckoutPriceSummary
                rawTotal={checkout.rawTotal}
                discountAmount={checkout.discountAmount}
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
                shippingFee={checkout.shippingFee}
                totalPoints={checkout.totalPointsValue}
                finalTotal={checkout.finalTotal}
                sstPreview={checkout.sstPreview}
                sstShowInCatalog={checkout.sstCfg.enabled}
                sstCustomerNote={checkout.sstCfg.customerNote}
              />
              <button
                onClick={checkout.handleSubmit}
                disabled={checkout.submitting}
                className="mt-5 w-full rounded-full py-3.5 text-sm font-bold text-white theme-shadow transition-all hover:opacity-95 disabled:opacity-60"
                style={{ background: "var(--theme-gradient)" }}
              >
                {submitCtaLabel(checkout.paymentMethod, checkout.submitting)}
              </button>
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
    </div>
  );
}
