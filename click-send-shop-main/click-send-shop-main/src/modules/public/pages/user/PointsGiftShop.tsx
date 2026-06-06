import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { fetchPointsGifts, redeemPointsGift, type PointsGiftCatalogItem } from "@/services/pointsService";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { usePayPendingOrder } from "@/hooks/usePayPendingOrder";
import * as orderService from "@/services/orderService";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import { formatAddressForDisplay } from "@/services/addressService";
import { giftRedeemBlockReason, giftRedeemCashHint } from "@/utils/pointsGiftRedeem";
import { cn } from "@/lib/utils";
import {
  THEME_ACCENT_HERO_LABEL,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_VALUE,
} from "@/utils/themeVisuals";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function GiftCard({
  gift,
  balance,
  onlinePaymentEnabled,
  redeeming,
  onRedeem,
}: {
  gift: PointsGiftCatalogItem;
  balance: number;
  onlinePaymentEnabled: boolean;
  redeeming: boolean;
  onRedeem: (gift: PointsGiftCatalogItem) => void;
}) {
  const blockReason = giftRedeemBlockReason(gift, balance);
  const cashHint = giftRedeemCashHint(gift.cash_amount, onlinePaymentEnabled);
  const disabled = redeeming || Boolean(blockReason);

  return (
    <article className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      {gift.image ? (
        <img src={gift.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Gift size={24} className="text-muted-foreground" aria-hidden />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="break-words font-medium leading-snug text-foreground">{gift.title}</p>
          <p className="text-sm font-semibold text-[var(--theme-price)]">{gift.required_points} 积分</p>
          {gift.cash_amount > 0 ? (
            <p className="text-xs text-muted-foreground">+ RM {gift.cash_amount}</p>
          ) : null}
          {gift.remaining_stock != null ? (
            <p className="text-xs text-muted-foreground">剩余 {gift.remaining_stock}</p>
          ) : null}
          {gift.limit_per_user > 0 ? (
            <p className="text-xs text-muted-foreground">每人限兑 {gift.limit_per_user} 件</p>
          ) : null}
          {cashHint ? <p className="text-xs leading-4 text-muted-foreground">{cashHint}</p> : null}
        </div>
        <UnifiedButton
          type="button"
          disabled={disabled}
          onClick={() => onRedeem(gift)}
          className="self-start rounded-full btn-theme-price px-4 py-1.5 text-xs font-semibold text-[var(--theme-price-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {redeeming ? "兑换中…" : blockReason || "立即兑换"}
        </UnifiedButton>
      </div>
    </article>
  );
}

export default function PointsGiftShop() {
  const navigate = useNavigate();
  const capabilities = useSiteCapabilities();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();
  const { pointsBalance, loadProfile, loadAddresses, addresses, getDefaultAddress, addressLoading } = useUserStore();
  const [gifts, setGifts] = useState<PointsGiftCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemConfirmGift, setRedeemConfirmGift] = useState<PointsGiftCatalogItem | null>(null);
  const { payPendingOrder } = usePayPendingOrder();

  useEffect(() => {
    if (loyaltyLoading) return;
    if (loyaltyConfig && !loyaltyConfig.points.displayEnabled) {
      navigate("/profile", { replace: true });
    }
  }, [loyaltyConfig, loyaltyLoading, navigate]);

  const reloadGifts = useCallback(async () => {
    const list = await fetchPointsGifts();
    setGifts(list);
    return list;
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setBootstrapReady(false);
    try {
      await Promise.all([
        loadProfile().catch(() => {}),
        loadAddresses().catch(() => {}),
        reloadGifts(),
      ]);
    } catch (e) {
      toast.error(toastErrorMessage(e));
    } finally {
      setLoading(false);
      setBootstrapReady(true);
    }
  }, [loadAddresses, loadProfile, reloadGifts]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const requestRedeem = (gift: PointsGiftCatalogItem) => {
    const blockReason = giftRedeemBlockReason(gift, pointsBalance);
    if (blockReason) {
      toast.error(blockReason);
      return;
    }
    if (!bootstrapReady || addressLoading) {
      toast.message("正在加载收货地址，请稍候");
      return;
    }
    const addr = getDefaultAddress() || addresses[0];
    if (!addr) {
      toast.error("请先添加收货地址");
      navigate("/address", { state: { from: "/points/gifts" } });
      return;
    }
    setRedeemConfirmGift(gift);
  };

  const handleRedeem = async (gift: PointsGiftCatalogItem) => {
    const addr = getDefaultAddress() || addresses[0];
    if (!addr) {
      toast.error("请先添加收货地址");
      navigate("/address", { state: { from: "/points/gifts" } });
      return;
    }

    setRedeemingId(gift.id);
    try {
      const res = await redeemPointsGift({
        gift_item_id: gift.id,
        quantity: 1,
        contact_name: addr.recipient_name || "",
        contact_phone: addr.phone || "",
        address: {
          line1: addr.line1 || "",
          line2: addr.line2 || "",
          city: addr.city || "",
          state: addr.state || "",
          postcode: addr.postcode || "",
          country: addr.country || "MY",
        },
      });
      toast.success(res.message || "兑换成功");
      await Promise.all([loadProfile(), reloadGifts()]);
      if (!res.data?.order_id) return;

      const cashDue = Number(res.data.cash_amount || 0);
      if (cashDue > 0 && res.data.payment_status === "pending") {
        const order = await orderService.fetchOrderById(res.data.order_id);
        await payPendingOrder(order);
        navigate(`/orders/${res.data.order_id}`);
        return;
      }
      navigate(`/orders/${res.data.order_id}`);
    } catch (e) {
      toast.error(toastErrorMessage(e));
    } finally {
      setRedeemingId(null);
    }
  };

  const onlinePaymentEnabled = loyaltyConfig?.checkout.onlinePaymentEnabled ?? capabilities.onlinePaymentEnabled;

  return (
    <StoreAccountLayout title="积分兑换" backFallback="/points" mainClassName="sm:py-6 lg:py-6">
      <div className="flex flex-col gap-6">
        <section className={cn("rounded-2xl px-5 py-5 text-center sm:px-8", THEME_ACCENT_HERO_SHELL)}>
          <p className={cn(THEME_ACCENT_HERO_LABEL, "normal-case tracking-normal")}>可用积分</p>
          <p className={cn("store-stat-value mt-1 text-3xl sm:text-4xl", THEME_ACCENT_HERO_VALUE)}>{pointsBalance}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--theme-muted)]">
            兑换将使用默认收货地址；纯积分礼品兑换后立即生效，含现金补差需完成支付。
          </p>
        </section>

        <section className="min-w-0" aria-labelledby="points-gifts-heading">
          <h2 id="points-gifts-heading" className="mb-3 text-sm font-semibold text-foreground">
            可兑换礼品
          </h2>

          {loading ? (
            <div className="flex justify-center rounded-xl border border-border bg-card py-16">
              <Loader2 className="animate-spin text-muted-foreground" aria-label="加载中" />
            </div>
          ) : gifts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
              暂无可兑换礼品
            </div>
          ) : (
            <div className="space-y-3">
              {gifts.map((gift) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  balance={pointsBalance}
                  onlinePaymentEnabled={onlinePaymentEnabled}
                  redeeming={redeemingId === gift.id}
                  onRedeem={requestRedeem}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomSheetConfirm
        open={Boolean(redeemConfirmGift)}
        onClose={() => setRedeemConfirmGift(null)}
        title="确认兑换"
        description={
          redeemConfirmGift ? (
            <span className="block space-y-2 text-left text-sm text-[var(--theme-text-muted)]">
              <span className="block">
                礼品：<strong className="text-[var(--theme-text)]">{redeemConfirmGift.title}</strong>
              </span>
              <span className="block">
                消耗积分：<strong className="text-[var(--theme-price)]">{redeemConfirmGift.required_points}</strong>
                {redeemConfirmGift.cash_amount > 0 ? (
                  <>，另需支付 RM {redeemConfirmGift.cash_amount}</>
                ) : null}
              </span>
              <span className="block">
                收货地址：
                {formatAddressForDisplay(getDefaultAddress() || addresses[0]!)}
              </span>
            </span>
          ) : null
        }
        confirmText="确认兑换"
        cancelText="取消"
        loading={Boolean(redeemConfirmGift && redeemingId === redeemConfirmGift.id)}
        onConfirm={async () => {
          if (!redeemConfirmGift) return;
          const gift = redeemConfirmGift;
          setRedeemConfirmGift(null);
          await handleRedeem(gift);
        }}
      />
    </StoreAccountLayout>
  );
}
