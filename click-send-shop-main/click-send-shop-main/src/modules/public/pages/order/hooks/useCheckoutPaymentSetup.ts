import { useEffect, useState } from "react";
import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import * as paymentService from "@/services/paymentService";
import type { PublicPaymentChannel } from "@/services/paymentService";
import * as loyaltyService from "@/services/loyaltyService";
import { filterUsableOnlinePaymentChannels } from "@/utils/checkoutPaymentMethod";

/** 结算页支付方式与渠道配置加载 */
export function useCheckoutPaymentSetup() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [stripeReady, setStripeReady] = useState(true);
  const [paymentChannels, setPaymentChannels] = useState<PublicPaymentChannel[]>([]);
  const [selectedPaymentChannelCode, setSelectedPaymentChannelCode] = useState("");
  const [paymentConfigLoaded, setPaymentConfigLoaded] = useState(false);
  const [loyaltyConfig, setLoyaltyConfig] = useState<loyaltyService.LoyaltyConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      paymentService.getPaymentConfig().catch(() => null),
      paymentService.getPaymentChannels().catch(() => [] as PublicPaymentChannel[]),
    ])
      .then(([config, channels]) => {
        if (cancelled) return;
        const ready = !!config?.stripeCheckoutReady;
        const onlineChannels = filterUsableOnlinePaymentChannels(
          channels.filter((channel) => channel.provider !== "internal"),
          ready,
        );
        setStripeReady(ready);
        setPaymentChannels(onlineChannels);
        setSelectedPaymentChannelCode((current) => current || onlineChannels[0]?.code || "");
        setPaymentConfigLoaded(true);
        if (onlineChannels.length === 0) {
          setPaymentMethod("whatsapp");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStripeReady(false);
        setPaymentConfigLoaded(true);
        setPaymentMethod("whatsapp");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loyaltyService.fetchLoyaltyConfig()
      .then((cfg) => { if (!cancelled) setLoyaltyConfig(cfg); })
      .catch(() => { if (!cancelled) setLoyaltyConfig(null); });
    return () => { cancelled = true; };
  }, []);

  return {
    paymentMethod,
    setPaymentMethod,
    stripeReady,
    paymentChannels,
    selectedPaymentChannelCode,
    setSelectedPaymentChannelCode,
    paymentConfigLoaded,
    loyaltyConfig,
  };
}
