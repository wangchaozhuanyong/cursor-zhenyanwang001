import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Gift, Loader2, PackageCheck, SlidersHorizontal, Sparkles } from "lucide-react";
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
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import RatioImage from "@/components/client/RatioImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE, THEME_PRODUCT_MEDIA_RATIO } from "@/constants/productMediaAspect";

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
    <article className="sf-next-points-gifts-card">
      <div className="sf-next-points-gifts-card__media">
        {gift.image ? (
          <RatioImage
            src={gift.image}
            alt=""
            ratio={THEME_PRODUCT_MEDIA_RATIO}
            rounded="md"
            className="h-full w-full"
            imgClassName="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="sf-next-points-gifts-card__placeholder" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}>
            <Gift size={24} aria-hidden />
          </div>
        )}
      </div>
      <div className="sf-next-points-gifts-card__body">
        <div className="min-w-0">
          <p className="sf-next-points-gifts-card__title">{gift.title}</p>
          <div className="sf-next-points-gifts-card__price">
            <strong>{gift.required_points}</strong>
            <span>积分</span>
          </div>
          <div className="sf-next-points-gifts-card__meta">
            {gift.cash_amount > 0 ? <span>+ RM {gift.cash_amount}</span> : <span>纯积分</span>}
            {gift.remaining_stock != null ? <span>剩余 {gift.remaining_stock}</span> : <span>不限库存</span>}
            {gift.limit_per_user > 0 ? <span>限兑 {gift.limit_per_user}</span> : null}
          </div>
          {cashHint ? <p className="sf-next-points-gifts-card__hint">{cashHint}</p> : null}
        </div>
        <UnifiedButton
          type="button"
          disabled={disabled}
          onClick={() => onRedeem(gift)}
          className="sf-next-points-gifts-card__button"
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
  const [filter, setFilter] = useState<"all" | "redeemable" | "cash" | "stock">("all");
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
  const redeemableCount = useMemo(
    () => gifts.filter((gift) => !giftRedeemBlockReason(gift, pointsBalance)).length,
    [gifts, pointsBalance],
  );
  const stockCount = useMemo(
    () => gifts.filter((gift) => gift.remaining_stock == null || gift.remaining_stock > 0).length,
    [gifts],
  );
  const cashCount = useMemo(() => gifts.filter((gift) => gift.cash_amount > 0).length, [gifts]);
  const filteredGifts = useMemo(() => {
    if (filter === "redeemable") return gifts.filter((gift) => !giftRedeemBlockReason(gift, pointsBalance));
    if (filter === "cash") return gifts.filter((gift) => gift.cash_amount > 0);
    if (filter === "stock") return gifts.filter((gift) => gift.remaining_stock == null || gift.remaining_stock > 0);
    return gifts;
  }, [filter, gifts, pointsBalance]);
  const filters = [
    { key: "all" as const, label: "全部", count: gifts.length },
    { key: "redeemable" as const, label: "可兑换", count: redeemableCount },
    { key: "cash" as const, label: "含补差", count: cashCount },
    { key: "stock" as const, label: "有库存", count: stockCount },
  ];

  return (
    <StoreAccountLayout
      title="积分兑换"
      backFallback="/points"
      className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-points-gifts-page"
      mainClassName="sf-next-account-main sm:py-6 xl:py-6"
    >
      <div className="sf-next-points-gifts-stack">
        <section className="sf-next-folio sf-next-points-gifts-folio">
          <div className="sf-next-folio__topline">
            <p className="sf-next-folio__eyebrow">可用积分</p>
            <span className="sf-next-folio__status">{redeemableCount} 可兑换</span>
          </div>
          <div className="sf-next-folio__value-row">
            <strong className="sf-next-folio__value sf-next-points-gifts-balance">{pointsBalance}</strong>
            <span className="sf-next-folio__unit">PTS</span>
          </div>
          <div className="sf-next-folio__meta sf-next-points-gifts-folio__stats">
            <span className="sf-next-folio__meta-item">
              <strong className="sf-next-folio__meta-value">{gifts.length}</strong>
              <small className="sf-next-folio__meta-label">礼品</small>
            </span>
            <span className="sf-next-folio__meta-item">
              <strong className="sf-next-folio__meta-value">{redeemableCount}</strong>
              <small className="sf-next-folio__meta-label">可兑换</small>
            </span>
            <span className="sf-next-folio__meta-item">
              <strong className="sf-next-folio__meta-value">{cashCount}</strong>
              <small className="sf-next-folio__meta-label">含补差</small>
            </span>
          </div>
        </section>

        <section className="sf-next-points-gifts-filter" aria-label="积分礼品筛选">
          <div className="sf-next-points-gifts-filter__title">
            <SlidersHorizontal size={16} aria-hidden />
            <span>筛选礼品</span>
          </div>
          <div className="sf-next-points-gifts-filter__chips">
            {filters.map((item) => (
              <UnifiedButton
                key={item.key}
                type="button"
                className={cn("sf-next-points-gifts-filter__chip", filter === item.key && "is-active")}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                <span>{item.count}</span>
              </UnifiedButton>
            ))}
          </div>
        </section>

        <section className="sf-next-points-gifts-catalog" aria-labelledby="points-gifts-heading">
          <div className="sf-next-points-gifts-section-head">
            <div>
              <p>礼品中心</p>
              <h2 id="points-gifts-heading">积分礼品</h2>
            </div>
            <span>{filteredGifts.length}</span>
          </div>

          {loading ? (
            <div className="sf-next-points-gifts-state">
              <Loader2 className="animate-spin text-muted-foreground" aria-label="加载中" />
            </div>
          ) : filteredGifts.length === 0 ? (
            <div className="sf-next-points-gifts-state">
              暂无可兑换礼品
            </div>
          ) : (
            <div className="sf-next-points-gifts-grid">
              {filteredGifts.map((gift) => (
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

        <section className="sf-next-points-gifts-rules">
          <div>
            <span><CheckCircle2 size={16} aria-hidden /></span>
            <p>兑换将使用默认收货地址，缺少地址时会先跳转到地址管理。</p>
          </div>
          <div>
            <span><PackageCheck size={16} aria-hidden /></span>
            <p>纯积分礼品兑换后生成订单；含现金补差的礼品需继续完成支付。</p>
          </div>
          <div>
            <span><Sparkles size={16} aria-hidden /></span>
            <p>库存、限兑和积分不足状态以后台接口返回为准。</p>
          </div>
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
