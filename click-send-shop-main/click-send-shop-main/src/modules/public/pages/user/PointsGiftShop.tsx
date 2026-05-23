import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { fetchPointsGifts, redeemPointsGift, type PointsGiftCatalogItem } from "@/services/pointsService";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { usePayPendingOrder } from "@/hooks/usePayPendingOrder";
import * as orderService from "@/services/orderService";

export default function PointsGiftShop() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const { pointsBalance, loadProfile, addresses, getDefaultAddress } = useUserStore();
  const [gifts, setGifts] = useState<PointsGiftCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const { payPendingOrder } = usePayPendingOrder();

  useEffect(() => {
    loadProfile().catch(() => {});
    fetchPointsGifts()
      .then(setGifts)
      .catch((e) => toast.error(toastErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  const handleRedeem = async (gift: PointsGiftCatalogItem) => {
    const addr = getDefaultAddress() || addresses[0];
    if (!addr) {
      toast.error("请先添加收货地址");
      navigate("/settings");
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
      await loadProfile();
      if (!res.data?.order_id) return;
      if (Number(res.data.cash_amount || 0) > 0 && res.data.payment_status === "pending") {
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

  return (
    <div className="min-h-screen bg-background pb-8">
      <PageHeader title="积分兑换" onBack={goBack} />
      <main className="mx-auto max-w-lg px-4 pt-4">
        <p className="mb-4 text-sm text-muted-foreground">可用积分：{pointsBalance}</p>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : gifts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">暂无可兑换礼品</p>
        ) : (
          <div className="space-y-3">
            {gifts.map((gift) => (
              <div key={gift.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                {gift.image ? (
                  <img src={gift.image} alt="" className="h-20 w-20 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-secondary"><Gift size={24} /></div>
                )}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="font-medium text-foreground">{gift.title}</p>
                    <p className="mt-1 text-sm text-[var(--theme-price)]">{gift.required_points} 积分</p>
                    {gift.cash_amount > 0 ? <p className="text-xs text-muted-foreground">+ RM {gift.cash_amount}</p> : null}
                    {gift.remaining_stock != null ? (
                      <p className="text-xs text-muted-foreground">剩余 {gift.remaining_stock}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={redeemingId === gift.id || pointsBalance < gift.required_points}
                    onClick={() => handleRedeem(gift)}
                    className="mt-2 self-start rounded-full btn-theme-price px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {redeemingId === gift.id ? "兑换中…" : "立即兑换"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
