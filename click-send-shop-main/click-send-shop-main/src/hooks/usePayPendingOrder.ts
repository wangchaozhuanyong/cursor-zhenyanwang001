import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Order } from "@/types/order";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { isPendingPayment } from "@/utils/orderBuyerStatus";
import { generateOrderText } from "@/modules/public/pages/order/utils/checkoutText";
import { copyToClipboard } from "@/utils/clipboard";
import { safeOpenExternal } from "@/utils/safeOpen";
import { paymentInstructionToastMessage } from "@/utils/paymentClientInstructions";
import { canStartOnlinePayment } from "@/utils/checkoutPaymentMethod";

export function usePayPendingOrder() {
  const capabilities = useSiteCapabilities();
  const [paying, setPaying] = useState(false);

  const payPendingOrder = useCallback(async (order: Order, onPaid?: () => void | Promise<void>) => {
    if (!isPendingPayment(order)) {
      toast.error("当前订单不可支付");
      return;
    }

    setPaying(true);
    try {
      const method = order.payment_method || "whatsapp";

      if (canStartOnlinePayment(method, capabilities.onlinePaymentEnabled)) {
        const channels = await paymentService.getPaymentChannels();
        const channelCode = channels[0]?.code || "stripe_checkout";
        const intent = await paymentService.createPaymentIntent({
          orderId: order.id,
          channelCode,
          returnUrl: `${window.location.origin}/orders/${order.id}`,
        });
        if (intent.redirect_url) {
          window.location.assign(intent.redirect_url);
          return;
        }
        toast.message(paymentInstructionToastMessage(intent.client_instructions));
        await onPaid?.();
        return;
      }

      if (method === "reward_wallet") {
        await orderService.payOrder(order.id, "reward_wallet");
        toast.success("返现钱包支付成功");
        await onPaid?.();
        return;
      }

      if ((method === "online" || method === "points_plus_cash") && !capabilities.onlinePaymentEnabled) {
        toast.info("在线支付未开启，请联系客服完成付款");
        const copied = await copyToClipboard(generateOrderText(order));
        if (copied) toast.success("订单内容已复制");
        return;
      }

      const copied = await copyToClipboard(generateOrderText(order));
      if (copied) toast.success("订单内容已复制，请发送给客服完成付款");
      else toast.info("请通过客服渠道完成付款");
      safeOpenExternal(`https://wa.me/?text=${encodeURIComponent(generateOrderText(order))}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发起支付失败");
    } finally {
      setPaying(false);
    }
  }, [capabilities.onlinePaymentEnabled]);

  return { paying, payPendingOrder, canPay: isPendingPayment };
}
