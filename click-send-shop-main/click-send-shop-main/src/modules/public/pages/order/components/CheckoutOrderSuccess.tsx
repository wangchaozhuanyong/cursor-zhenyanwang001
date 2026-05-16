import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, MessageCircle, Phone, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { getCartLinePrice } from "@/stores/useCartStore";
import type { Order } from "@/types/order";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import { OrderSstLines } from "@/components/OrderSstLines";

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
}) {
  const [alternatePayOpen, setAlternatePayOpen] = useState(false);
  const [moreWaysOpen, setMoreWaysOpen] = useState(false);

  const isOnlinePaid = order.payment_method === "online" && order.status === ORDER_STATUS.PAID;
  const isRewardWalletPaid = order.payment_method === "reward_wallet" && order.status === ORDER_STATUS.PAID;
  const isPaid = isOnlinePaid || isRewardWalletPaid;
  const isPending = order.status === ORDER_STATUS.PENDING;
  const isWhatsappOrder = order.payment_method === "whatsapp";
  const isOnlinePending = isPending && order.payment_method === "online";
  const isWalletPending = isPending && order.payment_method === "reward_wallet";
  const isWhatsappPending = isPending && isWhatsappOrder;

  const headerTitle = isPaid
    ? "支付成功"
    : isOnlinePending
      ? "请完成支付"
      : isWalletPending && postSubmitWalletError
        ? "待付款"
        : "订单已提交";

  const mainHeading = isPaid
    ? "支付成功！"
    : isOnlinePending
      ? "请完成支付"
      : isWalletPending && postSubmitWalletError
        ? "钱包余额不足"
        : isWalletPending
          ? "请完成支付"
          : "订单提交成功！";

  const helperText = (() => {
    if (isPaid) {
      return "支付已完成，我们会尽快为您安排发货，可在“我的订单”中实时查看进度。";
    }
    if (isOnlinePending) {
      return "已按结算页所选渠道发起支付。若未自动跳转，请点击下方“继续支付”或“重新支付”；也可在订单详情中继续付款。";
    }
    if (isWalletPending && postSubmitWalletError) {
      return `${postSubmitWalletError} 建议改用在线支付完成付款，或联系人工客服协助。`;
    }
    if (isWalletPending) {
      return `返现钱包可用 RM ${rewardBalance.toFixed(2)}。请点击下方完成钱包扣款，或改用在线支付。`;
    }
    if (isWhatsappPending) {
      return "请将订单内容发送给客服完成对接。如需在线支付或钱包支付，可展开“更多方式”。";
    }
    if (isPending) {
      return "订单待付款，可在订单详情中继续付款。";
    }
    if (isWhatsappOrder) {
      return "感谢您的下单。";
    }
    return "";
  })();
  const statusBadge = isPaid ? "已支付" : isPending ? "待支付" : "处理中";
  const primaryActionClass = isPaid
    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
    : "bg-gold text-primary-foreground shadow-lg shadow-gold/20";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={onHome} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">{headerTitle}</h1>
        </div>
      </header>

      <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg px-4 py-6">
        {/* Success card */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gold-light"
          >
            <CheckCircle2 size={40} className="text-gold" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-foreground">{mainHeading}</h2>
          <div className="mt-3">
            <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1 text-xs font-semibold text-[var(--theme-text)]">
              状态：{statusBadge}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            订单编号: <span className="font-mono font-semibold text-foreground">{order.order_no}</span>
          </p>
          {postSubmitOnlineError && isOnlinePending && (
            <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-left text-xs text-destructive">
              {postSubmitOnlineError}
            </p>
          )}
          {postSubmitOnlineNote && isOnlinePending && !postSubmitOnlineError && (
            <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground">
              {postSubmitOnlineNote}
            </p>
          )}
          <div className="mt-5 rounded-xl bg-secondary p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">{helperText}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">关键信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">支付方式</span>
              <span className="font-medium text-foreground">
                {order.payment_method === "online"
                  ? "在线支付"
                  : order.payment_method === "reward_wallet"
                    ? "返现钱包"
                    : "联系客服"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">应付金额</span>
              <span className="font-semibold text-[var(--theme-price)]">RM {order.total_amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">下单时间</span>
              <span className="font-medium text-foreground">
                {new Date(order.created_at).toLocaleString("zh-CN")}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">下一步操作</p>
          {isOnlinePending && (
            <>
              <button
                type="button"
                onClick={onPayOnline}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
              >
                {postSubmitOnlineError ? "重新支付" : "继续支付"}
              </button>
              <button
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full border-2 border-border py-3 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                在订单详情里继续付款
              </button>
              <button
                type="button"
                onClick={() => setAlternatePayOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                更换支付方式
                {alternatePayOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {alternatePayOpen && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <p className="px-1 text-center text-[11px] text-muted-foreground">以下为备选支付方式，与结算页不一致时请谨慎操作</p>
                  <button
                    type="button"
                    onClick={onPayRewardWallet}
                    disabled={payingWallet}
                    className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--theme-price)] py-3 text-sm font-semibold text-[var(--theme-price)] transition-all disabled:opacity-60"
                  >
                    {payingWallet ? "支付中…" : `尝试返现钱包（可用 RM ${rewardBalance.toFixed(2)}）`}
                  </button>
                  <button
                    type="button"
                    onClick={onWhatsApp}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-[var(--theme-gradient-foreground)] theme-shadow"
                    style={{ background: "var(--theme-gradient)" }}
                  >
                    <Phone size={16} /> 联系客服下单
                  </button>
                </div>
              )}
            </>
          )}

          {isWalletPending && postSubmitWalletError && (
            <>
              <button
                type="button"
                onClick={onPayOnline}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
              >
                改用在线支付
              </button>
              <button
                type="button"
                onClick={onWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                <Phone size={18} /> 联系客服
              </button>
              <button
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                查看订单详情
              </button>
            </>
          )}

          {isWalletPending && !postSubmitWalletError && (
            <>
              <button
                type="button"
                onClick={onPayRewardWallet}
                disabled={payingWallet}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${primaryActionClass}`}
              >
                {payingWallet ? "支付中…" : `使用返现钱包支付（可用 RM ${rewardBalance.toFixed(2)}）`}
              </button>
              <button
                type="button"
                onClick={onPayOnline}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                改用在线支付
              </button>
            </>
          )}

          {isWhatsappPending && (
            <>
              <button
                type="button"
                onClick={onWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold text-[var(--theme-gradient-foreground)] theme-shadow transition-all active:scale-[0.98]"
                style={{ background: "var(--theme-gradient)" }}
              >
                <Phone size={18} /> 发送到 WhatsApp
              </button>
              <button
                type="button"
                onClick={onWeChat}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[var(--theme-price)] py-4 text-sm font-bold text-[var(--theme-price-foreground)] theme-shadow transition-all active:scale-[0.98]"
              >
                <MessageCircle size={18} /> 发送到微信
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                <Copy size={18} /> 复制订单内容
              </button>
              <button
                type="button"
                onClick={() => setMoreWaysOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                更多方式
                {moreWaysOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {moreWaysOpen && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <button
                    type="button"
                    onClick={onPayOnline}
                    className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    在线支付
                  </button>
                  <button
                    type="button"
                    onClick={onPayRewardWallet}
                    disabled={payingWallet}
                    className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
                  >
                    {payingWallet ? "支付中…" : `返现钱包（可用 RM ${rewardBalance.toFixed(2)}）`}
                  </button>
                </div>
              )}
            </>
          )}

          {isPending && !isOnlinePending && !isWalletPending && !isWhatsappPending && (
            <>
              <button
                type="button"
                onClick={onPayOnline}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
              >
                继续支付
              </button>
              <button
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full border-2 border-border py-3 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                查看订单详情
              </button>
            </>
          )}

          {!isPending && (
            <button
              type="button"
              onClick={onViewOrderDetail}
              className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
            >
              查看订单详情
            </button>
          )}

          {!isWhatsappPending && (
            <button
              type="button"
              onClick={onCopy}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
            >
              <Copy size={18} /> 复制订单内容
            </button>
          )}
        </div>

        {/* Order detail */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">订单详情</h3>
          {order.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
              <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <span className="text-sm font-bold text-gold flex-shrink-0">RM {getCartLinePrice(item)}</span>
            </div>
          ))}
          <div className="mt-4 border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {order.tax_mode === "inclusive" ? "商品总额（含税）" : "商品总额"}
              </span>
              <span className="font-medium text-foreground">RM {order.raw_amount}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">优惠券（{order.coupon_title}）</span>
                <span className="font-medium text-destructive">-RM {order.discount_amount}</span>
              </div>
            )}
            <OrderSstLines order={order} />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                运费（{order.shipping_name || "标准"}{order.tax_mode === "inclusive" ? "，不计税" : ""}）
              </span>
              <span className={`font-medium ${order.shipping_fee === 0 ? "text-emerald-600" : "text-foreground"}`}>
                {order.shipping_fee === 0 ? "包邮" : `RM ${order.shipping_fee}`}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-foreground font-medium">应付金额</span>
              <span className="text-lg font-bold text-gold">RM {order.total_amount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">获得积分</span>
              <span className="font-medium text-foreground">+{order.total_points}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={onViewOrders}
            className="w-full rounded-full border-2 border-border py-4 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
          >
            查看我的订单
          </button>
          <button
            onClick={onHome}
            className="w-full rounded-full py-3 text-center text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
          >
            继续逛逛
          </button>
        </div>
      </motion.main>
    </div>
  );
}


