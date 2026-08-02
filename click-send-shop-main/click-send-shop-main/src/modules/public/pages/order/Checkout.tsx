import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import AppRouteFallback from "@/components/AppRouteFallback";
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
import { usePublicLocale } from "@/i18n/publicLocale";
import RouteStatePanel from "@/modules/storefront-v2/design/components/RouteStatePanel";
import "@/styles/checkout-route.css";

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

  if (checkout.cartHydrating) {
    return <AppRouteFallback />;
  }

  if (checkout.isEmpty) {
    return (
      <StoreStandardPageShell
        title={t("checkout.confirmOrder")}
        onBack={checkout.goBack}
        backFallback={localizedPath("/cart")}
        desktopBackLabel={t("checkout.backCart")}
        className="sf-next-conversion-page sf-next-route-page sf-next-checkout-page sf-next-checkout-empty-page"
        contentClassName="sf-next-checkout-empty-main"
        rightSlot={<NotificationIconButton unreadCount={checkout.unreadCount} onClick={checkout.goNotifications} />}
      >
        <RouteStatePanel
          icon={<ShoppingBag size={30} aria-hidden />}
          title="暂无可结算商品"
          description="购物车为空或当前没有选中的商品，请返回购物车确认后再提交订单。"
          primaryAction={(
            <button
              type="button"
              className="sf-next-button sf-next-button--primary"
              onClick={() => checkout.navigate(localizedPath("/cart"))}
            >
              返回购物车
            </button>
          )}
          secondaryAction={(
            <button
              type="button"
              className="sf-next-button sf-next-button--secondary"
              onClick={() => checkout.navigate(localizedPath("/categories"))}
            >
              继续选购
            </button>
          )}
        />
      </StoreStandardPageShell>
    );
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
      className="sf-next-conversion-page sf-next-route-page sf-next-checkout-page sf-next-checkout-action-space"
      contentClassName="sf-next-checkout-content"
      rightSlot={<NotificationIconButton unreadCount={checkout.unreadCount} onClick={checkout.goNotifications} />}
    >
      <div className="w-full">
        <DesktopPurchaseTwoColumn
          contentClassName="sf-next-checkout-flow"
          aside={
            <DesktopPurchaseCard
              title={t("checkout.orderSummary")}
              className="sf-next-checkout-card sf-next-checkout-summary"
              bodyClassName="sf-next-checkout-summary__body"
            >
              <div className="sf-next-checkout-summary__count">
                <span>{t("checkout.itemCount")}</span>
                <strong>
                  {itemCount} {t("checkout.unit")}
                </strong>
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
              <LoadingButton
                state={checkout.submitting ? "loading" : "normal"}
                onClick={checkout.handleSubmit}
                disabled={submitDisabled}
                variant="solid"
                className="sf-next-checkout-desktop-submit"
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

            <div className="sf-next-checkout-card sf-next-checkout-summary sf-next-checkout-summary--mobile md:hidden">
              <h2 className="sf-next-checkout-section-title">{t("checkout.amountDetail")}</h2>
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
            </div>
        </DesktopPurchaseTwoColumn>
      </div>

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
