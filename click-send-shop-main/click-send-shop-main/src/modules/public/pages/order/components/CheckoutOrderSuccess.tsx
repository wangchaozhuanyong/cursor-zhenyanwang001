import { formatDateTime } from "@/utils/formatDateTime";
import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, MessageCircle, Phone, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { getCartLinePrice } from "@/stores/useCartStore";
import type { Order } from "@/types/order";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import { OrderSstLines } from "@/components/OrderSstLines";
import { OrderDiscountLines } from "./OrderDiscountLines";
import { OrderPaymentCountdown } from "@/components/order/OrderPaymentCountdown";
import { THEME_ALERT_ERROR_BOX } from "@/utils/themeVisuals";
import { sanitizeClientInstructions } from "@/utils/paymentClientInstructions";
import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

const CHECKOUT_SUCCESS_COPY: Record<PublicLocale, {
  support: string;
  headerPaid: string;
  headerFinishPayment: string;
  headerPendingPayment: string;
  headerSubmitted: string;
  headerOnlineUnavailable: string;
  headerWalletInsufficient: string;
  headingPaid: string;
  headingFinishPayment: string;
  headingSubmitted: string;
  paidHelper: string;
  onlinePendingHelper: string;
  onlineUnavailable: string;
  walletInsufficientWithOnline: (error: string) => string;
  walletInsufficientNoOnline: (error: string) => string;
  walletPendingWithOnline: (balance: number) => string;
  walletPendingNoOnline: (balance: number) => string;
  whatsappPendingWithOnline: string;
  whatsappPendingNoOnline: string;
  pendingHelper: string;
  thanks: string;
  paidBadge: string;
  pendingBadge: string;
  processingBadge: string;
  order: string;
  keyInfo: string;
  paymentMethod: string;
  methodOnline: string;
  methodWallet: string;
  amountDue: string;
  orderTime: string;
  nextActions: string;
  repay: string;
  continuePay: string;
  continueInDetail: string;
  viewOrderDetail: string;
  changePayment: string;
  alternatePaymentWarning: string;
  paying: string;
  tryWallet: (balance: number) => string;
  useWallet: (balance: number) => string;
  switchOnline: string;
  sendWhatsapp: string;
  sendWechat: string;
  copyOrder: string;
  moreWays: string;
  onlinePayment: string;
  walletOption: (balance: number) => string;
  orderDetails: string;
  goodsTotal: string;
  goodsTotalTaxIncluded: string;
  shipping: string;
  standardShipping: string;
  taxExcludedShipping: string;
  freeShipping: string;
  pointsEarned: string;
  viewMyOrders: string;
  continueShopping: string;
}> = {
  zh: {
    support: "联系客服",
    headerPaid: "支付成功",
    headerFinishPayment: "请完成支付",
    headerPendingPayment: "待付款",
    headerSubmitted: "订单已提交",
    headerOnlineUnavailable: "在线支付不可用",
    headerWalletInsufficient: "钱包余额不足",
    headingPaid: "支付成功！",
    headingFinishPayment: "请完成支付",
    headingSubmitted: "订单提交成功！",
    paidHelper: "支付已完成，我们会尽快为您安排发货，可在“我的订单”中实时查看进度。",
    onlinePendingHelper: "已按结算页所选渠道发起支付。若未自动跳转，请点击下方“继续支付”或“重新支付”；也可在订单详情中继续付款。",
    onlineUnavailable: "当前商户暂未开通在线支付，请联系客服协助。",
    walletInsufficientWithOnline: (error) => `${error} 建议改用在线支付完成付款，或联系客服协助。`,
    walletInsufficientNoOnline: (error) => `${error} 当前商户暂未开通在线支付，请联系客服协助。`,
    walletPendingWithOnline: (balance) => `返现钱包可用 RM ${balance.toFixed(2)}。请点击下方完成钱包扣款，或改用在线支付。`,
    walletPendingNoOnline: (balance) => `返现钱包可用 RM ${balance.toFixed(2)}。请点击下方完成钱包扣款，或联系客服协助。`,
    whatsappPendingWithOnline: "请将订单内容发送给客服完成对接。如需在线支付或钱包支付，可展开“更多方式”。",
    whatsappPendingNoOnline: "请将订单内容发送给客服完成对接。如需钱包支付，可展开“更多方式”。",
    pendingHelper: "订单待付款，可在订单详情中继续付款。",
    thanks: "感谢您的下单。",
    paidBadge: "已支付",
    pendingBadge: "待支付",
    processingBadge: "处理中",
    order: "订单",
    keyInfo: "关键信息",
    paymentMethod: "支付方式",
    methodOnline: "在线支付",
    methodWallet: "返现钱包",
    amountDue: "应付金额",
    orderTime: "下单时间",
    nextActions: "下一步操作",
    repay: "重新支付",
    continuePay: "继续支付",
    continueInDetail: "在订单详情里继续付款",
    viewOrderDetail: "查看订单详情",
    changePayment: "更换支付方式",
    alternatePaymentWarning: "以下为备选支付方式，与结算页不一致时请谨慎操作",
    paying: "支付中…",
    tryWallet: (balance) => `尝试返现钱包（可用 RM ${balance.toFixed(2)}）`,
    useWallet: (balance) => `使用返现钱包支付（可用 RM ${balance.toFixed(2)}）`,
    switchOnline: "改用在线支付",
    sendWhatsapp: "发送到 WhatsApp",
    sendWechat: "发送到微信",
    copyOrder: "复制订单内容",
    moreWays: "更多方式",
    onlinePayment: "在线支付",
    walletOption: (balance) => `返现钱包（可用 RM ${balance.toFixed(2)}）`,
    orderDetails: "订单详情",
    goodsTotal: "商品总额",
    goodsTotalTaxIncluded: "商品总额（含税）",
    shipping: "运费",
    standardShipping: "标准",
    taxExcludedShipping: "，不计税",
    freeShipping: "包邮",
    pointsEarned: "获得积分",
    viewMyOrders: "查看我的订单",
    continueShopping: "继续逛逛",
  },
  en: {
    support: "Contact support",
    headerPaid: "Payment successful",
    headerFinishPayment: "Complete payment",
    headerPendingPayment: "Pending payment",
    headerSubmitted: "Order submitted",
    headerOnlineUnavailable: "Online payment unavailable",
    headerWalletInsufficient: "Insufficient wallet balance",
    headingPaid: "Payment successful",
    headingFinishPayment: "Complete payment",
    headingSubmitted: "Order submitted",
    paidHelper: "Payment is complete. We will arrange shipment as soon as possible. You can track progress in My Orders.",
    onlinePendingHelper: "Payment has been started with the channel selected at checkout. If it did not redirect, continue or retry payment below. You can also pay from order details.",
    onlineUnavailable: "Online payment is not enabled. Please contact support.",
    walletInsufficientWithOnline: (error) => `${error} Use online payment instead, or contact support.`,
    walletInsufficientNoOnline: (error) => `${error} Online payment is not enabled. Please contact support.`,
    walletPendingWithOnline: (balance) => `Reward wallet available: RM ${balance.toFixed(2)}. Complete wallet payment below, or switch to online payment.`,
    walletPendingNoOnline: (balance) => `Reward wallet available: RM ${balance.toFixed(2)}. Complete wallet payment below, or contact support.`,
    whatsappPendingWithOnline: "Send the order details to support. For online or wallet payment, expand More ways.",
    whatsappPendingNoOnline: "Send the order details to support. For wallet payment, expand More ways.",
    pendingHelper: "This order is pending payment. You can continue from order details.",
    thanks: "Thank you for your order.",
    paidBadge: "Paid",
    pendingBadge: "To pay",
    processingBadge: "Processing",
    order: "Order",
    keyInfo: "Key information",
    paymentMethod: "Payment method",
    methodOnline: "Online payment",
    methodWallet: "Reward wallet",
    amountDue: "Amount due",
    orderTime: "Order time",
    nextActions: "Next actions",
    repay: "Retry payment",
    continuePay: "Continue payment",
    continueInDetail: "Continue payment in order details",
    viewOrderDetail: "View order details",
    changePayment: "Change payment method",
    alternatePaymentWarning: "These are alternate payment methods. Use carefully if they differ from checkout.",
    paying: "Paying...",
    tryWallet: (balance) => `Try reward wallet (available RM ${balance.toFixed(2)})`,
    useWallet: (balance) => `Pay with reward wallet (available RM ${balance.toFixed(2)})`,
    switchOnline: "Use online payment",
    sendWhatsapp: "Send to WhatsApp",
    sendWechat: "Send to WeChat",
    copyOrder: "Copy order details",
    moreWays: "More ways",
    onlinePayment: "Online payment",
    walletOption: (balance) => `Reward wallet (available RM ${balance.toFixed(2)})`,
    orderDetails: "Order details",
    goodsTotal: "Goods total",
    goodsTotalTaxIncluded: "Goods total (tax included)",
    shipping: "Shipping",
    standardShipping: "Standard",
    taxExcludedShipping: ", not taxed",
    freeShipping: "Free shipping",
    pointsEarned: "Points earned",
    viewMyOrders: "View my orders",
    continueShopping: "Continue shopping",
  },
};

/* ----- Order Success Page ----- */
export function CheckoutOrderSuccess({
  order,
  postSubmitOnlineError,
  postSubmitOnlineNote,
  postSubmitWalletError,
  onCopy,
  onWhatsApp,
  onWeChat,
  onPayOnline,
  onPayRewardWallet,
  rewardBalance,
  payingWallet,
  onHome,
  onViewOrders,
  onViewOrderDetail,
  onPaymentTimeoutExpired,
  onlinePaymentEnabled = true,
}: {
  order: Order;
  postSubmitOnlineError: string | null;
  postSubmitOnlineNote: string | null;
  postSubmitWalletError: string | null;
  onCopy: () => void;
  onWhatsApp: () => void;
  onWeChat: () => void;
  onPayOnline: () => void;
  onPayRewardWallet: () => void;
  rewardBalance: number;
  payingWallet: boolean;
  onHome: () => void;
  onViewOrders: () => void;
  onViewOrderDetail: () => void;
  onPaymentTimeoutExpired?: () => void;
  onlinePaymentEnabled?: boolean;
}) {
  const [alternatePayOpen, setAlternatePayOpen] = useState(false);
  const [moreWaysOpen, setMoreWaysOpen] = useState(false);
  const { locale } = usePublicLocale();
  const copy = CHECKOUT_SUCCESS_COPY[locale];

  const isOnlinePaid = order.payment_method === "online" && order.status === ORDER_STATUS.PAID;
  const isRewardWalletPaid = order.payment_method === "reward_wallet" && order.status === ORDER_STATUS.PAID;
  const isPaid = isOnlinePaid || isRewardWalletPaid;
  const isPending = order.status === ORDER_STATUS.PENDING;
  const isWhatsappOrder = order.payment_method === "whatsapp";
  const isOnlinePending = isPending && order.payment_method === "online";
  const isWalletPending = isPending && order.payment_method === "reward_wallet";
  const isWhatsappPending = isPending && isWhatsappOrder;
  const displayOrderNo = String(order.order_no || "").replace(/^#+/, "");
  const onlinePaymentUnavailableText = copy.onlineUnavailable;

  const headerTitle = isPaid
    ? copy.headerPaid
    : isOnlinePending && onlinePaymentEnabled
      ? copy.headerFinishPayment
      : isWalletPending && postSubmitWalletError
        ? copy.headerPendingPayment
        : copy.headerSubmitted;

  const mainHeading = isPaid
    ? copy.headingPaid
    : isOnlinePending && onlinePaymentEnabled
      ? copy.headingFinishPayment
      : isOnlinePending
        ? copy.headerOnlineUnavailable
      : isWalletPending && postSubmitWalletError
        ? copy.headerWalletInsufficient
        : isWalletPending
          ? copy.headingFinishPayment
          : copy.headingSubmitted;

  const helperText = (() => {
    if (isPaid) {
      return copy.paidHelper;
    }
    if (isOnlinePending) {
      return onlinePaymentEnabled ? copy.onlinePendingHelper : onlinePaymentUnavailableText;
    }
    if (isWalletPending && postSubmitWalletError) {
      return onlinePaymentEnabled
        ? copy.walletInsufficientWithOnline(postSubmitWalletError)
        : copy.walletInsufficientNoOnline(postSubmitWalletError);
    }
    if (isWalletPending) {
      return onlinePaymentEnabled
        ? copy.walletPendingWithOnline(rewardBalance)
        : copy.walletPendingNoOnline(rewardBalance);
    }
    if (isWhatsappPending) {
      return onlinePaymentEnabled ? copy.whatsappPendingWithOnline : copy.whatsappPendingNoOnline;
    }
    if (isPending) {
      return copy.pendingHelper;
    }
    if (isWhatsappOrder) {
      return copy.thanks;
    }
    return "";
  })();
  const statusBadge = isPaid ? copy.paidBadge : isPending ? copy.pendingBadge : copy.processingBadge;
  const primaryActionClass = isPaid
    ? "btn-theme-gradient shadow-lg sf-next-theme-shadow"
    : "btn-theme-price shadow-[0_18px_34px_-26px_var(--theme-price)]";
  const onlineNote = sanitizeClientInstructions(postSubmitOnlineNote);
  const paymentHint =
    isOnlinePending && !postSubmitOnlineError
      ? onlineNote || helperText
      : !isOnlinePending
        ? helperText
        : "";

  return (
    <StoreStandardPageShell
      title={headerTitle}
      onBack={onHome}
      backFallback="/"
      className="sf-next-route-page sf-next-checkout-success-page"
      contentClassName="md:max-w-3xl xl:max-w-4xl"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="sf-next-checkout-success-stack mx-auto w-full max-w-lg space-y-3 pb-8 md:max-w-none"
      >
        {/* 状态摘要：横向紧凑，避免上半区过高 */}
        <div className="sf-next-checkout-success-status-card overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-start gap-3 p-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4, delay: 0.05 }}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                isPaid ? "bg-[color-mix(in_srgb,var(--theme-success)_18%,transparent)]" : "bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]"
              }`}
            >
              <CheckCircle2 size={24} className={isPaid ? "text-[var(--theme-success)]" : "text-theme-price"} />
            </motion.div>
            <div className="min-w-0 flex-1 text-left">
              <h2 className="font-display text-lg font-bold leading-snug text-foreground">{mainHeading}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-0.5 font-semibold text-[var(--theme-text)]">
                  {statusBadge}
                </span>
                <span>
                  {copy.order}{" "}
                  <span className="font-mono font-semibold text-foreground">#{displayOrderNo}</span>
                </span>
              </div>
            </div>
          </div>

          {(postSubmitOnlineError && isOnlinePending) || isOnlinePending || paymentHint ? (
            <div className="space-y-2 border-t border-border px-4 py-3">
              {postSubmitOnlineError && isOnlinePending ? (
                <p className={`text-left text-xs ${THEME_ALERT_ERROR_BOX}`}>{postSubmitOnlineError}</p>
              ) : null}
              {isOnlinePending ? (
                <OrderPaymentCountdown
                  order={order}
                  onExpired={onPaymentTimeoutExpired}
                  compact
                  className="w-full"
                />
              ) : null}
              {paymentHint ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{paymentHint}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="sf-next-checkout-success-info-card rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{copy.keyInfo}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{copy.paymentMethod}</span>
              <span className="font-medium text-foreground">
                {order.payment_method === "online"
                  ? copy.methodOnline
                  : order.payment_method === "reward_wallet"
                    ? copy.methodWallet
                    : copy.support}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{copy.amountDue}</span>
              <span className="font-semibold text-[var(--theme-price)]">RM {order.total_amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{copy.orderTime}</span>
              <span className="font-medium text-foreground">
                {formatDateTime(order.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* 下一步操作 */}
        <div className="sf-next-checkout-success-actions space-y-2.5">
          <p className="px-0.5 text-xs font-semibold text-muted-foreground">{copy.nextActions}</p>
          {isOnlinePending && (
            <>
              {onlinePaymentEnabled ? (
                <UnifiedButton
                  type="button"
                  onClick={onPayOnline}
                  className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
                >
                  {postSubmitOnlineError ? copy.repay : copy.continuePay}
                </UnifiedButton>
              ) : null}
              <UnifiedButton
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full border-2 border-border py-3 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                {onlinePaymentEnabled ? copy.continueInDetail : copy.viewOrderDetail}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={() => setAlternatePayOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {copy.changePayment}
                {alternatePayOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </UnifiedButton>
              {alternatePayOpen && (
                <div className="sf-next-checkout-success-alt-actions space-y-2 rounded-xl border border-border bg-card p-3">
                  <p className="px-1 text-center text-[11px] text-muted-foreground">{copy.alternatePaymentWarning}</p>
                  <UnifiedButton
                    type="button"
                    onClick={onPayRewardWallet}
                    disabled={payingWallet}
                    className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--theme-price)] py-3 text-sm font-semibold text-[var(--theme-price)] transition-all disabled:opacity-60"
                  >
                    {payingWallet ? copy.paying : copy.tryWallet(rewardBalance)}
                  </UnifiedButton>
                  <UnifiedButton
                    type="button"
                    onClick={onWhatsApp}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-[var(--theme-gradient-foreground)] sf-next-theme-shadow"
                   
                  >
                    <Phone size={16} /> {copy.support}
                  </UnifiedButton>
                </div>
              )}
            </>
          )}

          {isWalletPending && postSubmitWalletError && (
            <>
              {onlinePaymentEnabled ? (
                <UnifiedButton
                  type="button"
                  onClick={onPayOnline}
                  className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
                >
                  {copy.switchOnline}
                </UnifiedButton>
              ) : null}
              <UnifiedButton
                type="button"
                onClick={onWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                <Phone size={18} /> {copy.support}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {copy.viewOrderDetail}
              </UnifiedButton>
            </>
          )}

          {isWalletPending && !postSubmitWalletError && (
            <>
              <UnifiedButton
                type="button"
                onClick={onPayRewardWallet}
                disabled={payingWallet}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${primaryActionClass}`}
              >
                {payingWallet ? copy.paying : copy.useWallet(rewardBalance)}
              </UnifiedButton>
              {onlinePaymentEnabled ? (
                <UnifiedButton
                  type="button"
                  onClick={onPayOnline}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
                >
                  {copy.switchOnline}
                </UnifiedButton>
              ) : null}
            </>
          )}

          {isWhatsappPending && (
            <>
              <UnifiedButton
                type="button"
                onClick={onWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold text-[var(--theme-gradient-foreground)] sf-next-theme-shadow transition-all active:scale-[0.98]"
               
              >
                <Phone size={18} /> {copy.sendWhatsapp}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={onWeChat}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[var(--theme-price)] py-4 text-sm font-bold text-[var(--theme-price-foreground)] sf-next-theme-shadow transition-all active:scale-[0.98]"
              >
                <MessageCircle size={18} /> {copy.sendWechat}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={onCopy}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                <Copy size={18} /> {copy.copyOrder}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={() => setMoreWaysOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {copy.moreWays}
                {moreWaysOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </UnifiedButton>
              {moreWaysOpen && (
                <div className="sf-next-checkout-success-alt-actions space-y-2 rounded-xl border border-border bg-card p-3">
                  {onlinePaymentEnabled ? (
                    <UnifiedButton
                      type="button"
                      onClick={onPayOnline}
                      className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-semibold text-foreground hover:bg-secondary"
                    >
                      {copy.onlinePayment}
                    </UnifiedButton>
                  ) : null}
                  <UnifiedButton
                    type="button"
                    onClick={onPayRewardWallet}
                    disabled={payingWallet}
                    className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
                  >
                    {payingWallet ? copy.paying : copy.walletOption(rewardBalance)}
                  </UnifiedButton>
                </div>
              )}
            </>
          )}

          {isPending && !isOnlinePending && !isWalletPending && !isWhatsappPending && onlinePaymentEnabled && (
            <>
              <UnifiedButton
                type="button"
                onClick={onPayOnline}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
              >
                {copy.continuePay}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full border-2 border-border py-3 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                {copy.viewOrderDetail}
              </UnifiedButton>
            </>
          )}

          {!isPending && (
            <UnifiedButton
              type="button"
              onClick={onViewOrderDetail}
              className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
            >
              {copy.viewOrderDetail}
            </UnifiedButton>
          )}

          {!isWhatsappPending && (
            <UnifiedButton
              type="button"
              onClick={onCopy}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
            >
              <Copy size={18} /> {copy.copyOrder}
            </UnifiedButton>
          )}
        </div>

        {/* 订单详情 */}
        <div className="sf-next-checkout-success-products-card rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{copy.orderDetails}</h3>
          {order.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
              <ProductCoverImage
                url={item.product.cover_image}
                alt={item.product.name}
                className="w-10 rounded-lg object-cover"
                imgClassName="object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <span className="text-sm font-bold text-theme-price flex-shrink-0">RM {getCartLinePrice(item)}</span>
            </div>
          ))}
          <div className="mt-4 border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {order.tax_mode === "inclusive" ? copy.goodsTotalTaxIncluded : copy.goodsTotal}
              </span>
              <span className="font-medium text-foreground">RM {order.raw_amount}</span>
            </div>
            <OrderDiscountLines order={order} />
            <OrderSstLines order={order} />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {copy.shipping} ({order.shipping_name || copy.standardShipping}{order.tax_mode === "inclusive" ? copy.taxExcludedShipping : ""})
              </span>
              <span className={`font-medium ${order.shipping_fee === 0 ? "text-[var(--theme-success)]" : "text-foreground"}`}>
                {order.shipping_fee === 0 ? copy.freeShipping : `RM ${order.shipping_fee}`}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-foreground font-medium">{copy.amountDue}</span>
              <span className="text-[18px] font-extrabold text-theme-price sm:text-xl">RM {order.total_amount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{copy.pointsEarned}</span>
              <span className="font-medium text-foreground">+{order.total_points}</span>
            </div>
          </div>
        </div>

        <div className="sf-next-checkout-success-footer-actions space-y-2.5 pt-1">
          <UnifiedButton
            onClick={onViewOrders}
            className="w-full rounded-full border-2 border-border py-3.5 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
          >
            {copy.viewMyOrders}
          </UnifiedButton>
          <UnifiedButton
            onClick={onHome}
            className="w-full rounded-full py-3 text-center text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
          >
            {copy.continueShopping}
          </UnifiedButton>
        </div>
      </motion.div>
    </StoreStandardPageShell>
  );
}
