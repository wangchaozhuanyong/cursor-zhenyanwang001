import { useState } from "react";
import { CheckCircle2, ChevronRight, Clock3, Minus, Plus, ShieldCheck, Ticket } from "lucide-react";
import CouponPicker from "@/components/CouponPicker";
import type { Product, ProductActiveActivity, ProductVariant } from "@/types/product";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import { AppModal } from "@/modules/micro-interactions";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { ensureMediaUrl } from "@/utils/mediaUrl";
import { stripHtml } from "@/utils/seo";
import RatioImage from "@/components/client/RatioImage";
import { THEME_PRODUCT_MEDIA_RATIO } from "@/constants/productMediaAspect";
import { buildProductDisplayPriceModel } from "@/modules/storefront-v2/product/productDisplayPricing";
import { showStoreToast } from "@/utils/storeToast";

type PurchaseIntent = "cart" | "buy";

export type ProductVariantSheetProps = {
  open: boolean;
  onClose: () => void;
  product: Product;
  variants: ProductVariant[];
  selectedVariantId: string;
  onSelectVariant: (id: string) => void;
  qty: number;
  onQtyChange: (qty: number) => void;
  maxQty: number;
  soldOut: boolean;
  intent: PurchaseIntent;
  purchaseCoupon?: {
    enabled: boolean;
    selectedCoupon: CheckoutPickerCoupon | null;
    coupons: CheckoutPickerCoupon[];
    unusableCoupons: CheckoutPickerCoupon[];
    loading: boolean;
    discountAmount: number;
    onSelect: (coupon: CheckoutPickerCoupon | null) => void;
  };
  onConfirm: () => void;
};

function formatMoney(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2).replace(/\.00$/, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatActivityDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityTypeLabel(type: ProductActiveActivity["type"]) {
  if (type === "flash_sale") return "秒杀";
  if (type === "limited_time_discount") return "限时折扣";
  if (type === "member_price") return "会员专享";
  if (type === "full_reduction") return "满减";
  if (type === "full_discount") return "满折";
  if (type === "points_reward") return "积分奖励";
  if (type === "checkin_reward") return "签到奖励";
  return "活动";
}

function activityStatusLabel(activity: ProductActiveActivity) {
  if (activity.status === "scheduled") return "未开始";
  if (activity.status === "ended") return "已结束";
  return activity.status_label || "进行中";
}

function buildProductDetailItems(description?: string) {
  const raw = stripHtml(description || "").trim();
  if (!raw) return ["商品详情正在完善，下单前可联系客服确认规格、配送和售后说明。"];
  const parts = raw
    .split(/\n+|[；;。]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : [raw];
}

export default function ProductVariantSheet({
  open,
  onClose,
  product,
  variants,
  selectedVariantId,
  onSelectVariant,
  qty,
  onQtyChange,
  maxQty,
  soldOut,
  intent,
  purchaseCoupon,
  onConfirm,
}: ProductVariantSheetProps) {
  const [discountDetailOpen, setDiscountDetailOpen] = useState(false);
  const selected = variants.find((v) => v.id === selectedVariantId) ?? null;
  const specGroups = product.spec_groups ?? [];
  const hasMatrix = specGroups.length > 0;
  const selectedValueIds = new Set(selected?.spec_value_ids ?? []);
  const displayPriceModel = buildProductDisplayPriceModel(product, selected);
  const unitPrice = displayPriceModel.amount;
  const originalPrice = Number(displayPriceModel.originalPrice ?? 0) || 0;
  const showOriginalPrice = originalPrice > unitPrice;
  const lineTotal = unitPrice * Math.max(0, qty);
  const originalTotal = (showOriginalPrice ? originalPrice : unitPrice) * Math.max(0, qty);
  const productDiscount = Math.max(0, originalTotal - lineTotal);
  const couponEnabled = intent === "buy" && purchaseCoupon?.enabled;
  const couponDiscount = couponEnabled ? Math.max(0, purchaseCoupon?.discountAmount ?? 0) : 0;
  const payableTotal = Math.max(0, lineTotal - couponDiscount);
  const totalDiscount = productDiscount + couponDiscount;
  const title = intent === "cart" ? "加入购物车" : "立即购买";
  const modalTitle = intent === "buy" ? <span className="sr-only">确认购买</span> : title;
  const isMobile = useMediaQuery("(max-width: 767px)");
  const selectedValueImage = specGroups
    .flatMap((group) => group.values ?? [])
    .find((value) => selectedValueIds.has(value.id) && value.image_url)?.image_url;
  const selectedHeroImage = ensureMediaUrl(selected?.image_url || selectedValueImage || "");
  const productHeroImage = ensureMediaUrl(product.cover_image || product.images?.[0] || "");
  const heroImage = selectedHeroImage || productHeroImage;
  const selectedSpecLabel = selected?.spec_text || selected?.title || selected?.sku_code || "默认规格";
  const productDetailItems = buildProductDetailItems(product.description);
  const selectedCouponLabel = couponEnabled
    ? purchaseCoupon?.selectedCoupon?.title || (purchaseCoupon?.loading ? "优惠加载中" : "未使用优惠")
    : "";
  const currentPrice = intent === "buy" ? payableTotal : lineTotal;
  const footerActionLabel = soldOut ? "已售罄" : intent === "buy" ? "立即支付" : "加入购物车";
  const footerActionContent = intent === "buy" && !soldOut ? (
    <>
      <span>{footerActionLabel}</span>
      <span className="sf-next-variant-submit__amount">
        RM {formatMoney(currentPrice)}
      </span>
    </>
  ) : (
    footerActionLabel
  );
  const activeActivity = product.active_activity ?? null;
  const activityRemaining = Math.max(0, Number(activeActivity?.remaining_stock ?? 0));
  const activitySold = Math.max(0, Number(activeActivity?.sold_count ?? 0));
  const activityStockTotal = Math.max(0, Number(activeActivity?.activity_stock ?? 0) || activityRemaining + activitySold);
  const activityProgressPercent = activeActivity
    ? activeActivity.stock_progress_percent != null
      ? clampPercent(Number(activeActivity.stock_progress_percent || 0))
      : activityStockTotal > 0
        ? clampPercent((activitySold / activityStockTotal) * 100)
        : null
    : null;
  const activityLimit = Math.max(0, Number(activeActivity?.limit_per_user ?? 0));
  const activityPrice = Math.max(0, Number(activeActivity?.activity_price ?? 0));
  const activityThreshold = Math.max(0, Number(activeActivity?.threshold_amount ?? 0));
  const activityDiscount = Math.max(0, Number(activeActivity?.discount_amount ?? 0));
  const activitySavingAmount = Math.max(0, Number(activeActivity?.saving_amount ?? 0));
  const isActivityPriceDeal = activeActivity
    ? activeActivity.type === "flash_sale" ||
      activeActivity.type === "limited_time_discount" ||
      activeActivity.type === "member_price"
    : false;

  const clampQty = (value: number) => {
    if (maxQty <= 0 || soldOut) return 0;
    return Math.max(1, Math.min(value, maxQty));
  };

  const tryChangeQty = (next: number, source: "plus" | "minus" | "input") => {
    if (soldOut || maxQty <= 0) {
      showStoreToast.error("库存不足");
      return;
    }
    if (!Number.isFinite(next)) return;
    if (next > maxQty) {
      onQtyChange(clampQty(next));
      showStoreToast.error(source === "input" ? `最多可购买 ${maxQty} 件` : "已达到库存上限");
      return;
    }
    if (next < 1) {
      onQtyChange(1);
      return;
    }
    onQtyChange(next);
  };

  const matchVariantByValues = (valueIds: string[]) => {
    const wanted = new Set(valueIds.filter(Boolean));
    return (
      variants.find((variant) => {
        const ids = variant.spec_value_ids ?? [];
        return ids.length === specGroups.length && ids.every((id) => wanted.has(id));
      }) ?? null
    );
  };

  const selectSpecValue = (groupId: string, valueId: string) => {
    const nextByGroup = new Map<string, string>();
    for (const spec of selected?.spec_values ?? []) nextByGroup.set(spec.group_id, spec.value_id);
    nextByGroup.set(groupId, valueId);
    const nextIds = specGroups.map((group) => nextByGroup.get(group.id)).filter((id): id is string => !!id);
    const matched = matchVariantByValues(nextIds);
    if (matched) {
      onSelectVariant(matched.id);
      return;
    }
    const partial = variants.find((variant) => nextIds.every((id) => (variant.spec_value_ids ?? []).includes(id)));
    if (partial) onSelectVariant(partial.id);
  };

  const isValueAvailable = (groupId: string, valueId: string) => {
    const nextByGroup = new Map<string, string>();
    for (const spec of selected?.spec_values ?? []) {
      if (spec.group_id !== groupId) nextByGroup.set(spec.group_id, spec.value_id);
    }
    nextByGroup.set(groupId, valueId);
    const picked = [...nextByGroup.values()];
    return variants.some((variant) => {
      if (variant.enabled === false || variant.stock <= 0) return false;
      const ids = variant.spec_value_ids ?? [];
      return picked.every((id) => ids.includes(id));
    });
  };

  const isValueOutOfStock = (groupId: string, valueId: string) => {
    const nextByGroup = new Map<string, string>();
    for (const spec of selected?.spec_values ?? []) {
      if (spec.group_id !== groupId) nextByGroup.set(spec.group_id, spec.value_id);
    }
    nextByGroup.set(groupId, valueId);
    const picked = [...nextByGroup.values()];
    const matched = variants.filter((variant) => {
      if (variant.enabled === false) return false;
      const ids = variant.spec_value_ids ?? [];
      return picked.every((id) => ids.includes(id));
    });
    return matched.length > 0 && matched.every((variant) => Number(variant.stock || 0) <= 0);
  };

  const qtyStepper = (
    <div className="sf-next-variant-qty">
      <UnifiedButton
        type="button"
        disabled={qty <= 1 || soldOut}
        onClick={() => tryChangeQty(qty - 1, "minus")}
        className="sf-next-variant-qty__button"
        aria-label="减少"
      >
        <Minus size={16} />
      </UnifiedButton>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={qty > 0 ? String(qty) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          if (!raw) {
            onQtyChange(1);
            return;
          }
          const parsed = Number.parseInt(raw, 10);
          tryChangeQty(parsed, "input");
        }}
        onBlur={(e) => {
          const parsed = Number.parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
          if (!Number.isFinite(parsed) || parsed < 1) {
            onQtyChange(1);
            return;
          }
          if (parsed > maxQty) onQtyChange(clampQty(parsed));
        }}
        className="sf-next-variant-qty__input"
        aria-label="数量"
      />
      <UnifiedButton
        type="button"
        disabled={soldOut || qty >= maxQty}
        onClick={() => tryChangeQty(qty + 1, "plus")}
        className="sf-next-variant-qty__button"
        aria-label="增加"
      >
        <Plus size={16} />
      </UnifiedButton>
    </div>
  );

  const productSummary = (
    <div className="sf-next-variant-summary">
      <RatioImage
        src={heroImage || undefined}
        fallbackSrc={selectedHeroImage ? productHeroImage : undefined}
        alt={`${product.name} ${selectedSpecLabel}`}
        ratio={THEME_PRODUCT_MEDIA_RATIO}
        rounded="none"
        className="sf-next-variant-summary__media"
        imgClassName="object-contain"
        sizes="(max-width: 767px) calc(100vw - 4rem), 384px"
        loading="eager"
        fetchPriority="high"
      />
      <div className="sf-next-variant-summary__copy">
        <p className="sf-next-variant-summary__title">
          {product.name}
        </p>
        <div className="sf-next-variant-summary__price">
          <span>RM</span>
          <strong>
            {formatMoney(currentPrice)}
          </strong>
          {showOriginalPrice ? (
            <del>
              RM {formatMoney(originalTotal)}
            </del>
          ) : null}
        </div>
        {intent === "buy" && totalDiscount > 0 ? (
          <UnifiedButton
            type="button"
            onClick={() => setDiscountDetailOpen(true)}
            className="sf-next-variant-discount-link"
          >
            共减 RM {formatMoney(totalDiscount)}
            <ChevronRight size={12} />
          </UnifiedButton>
        ) : null}
        <p className="sf-next-variant-summary__selection">
          已选：{selectedSpecLabel}
          {selectedCouponLabel ? ` / ${selectedCouponLabel}` : ""}
        </p>
      </div>
    </div>
  );

  const variantSelector = hasMatrix ? (
    <div className="sf-next-variant-groups">
      {specGroups.map((group) => (
        <div key={group.id}>
          <p className="sf-next-variant-label">{group.name}</p>
          <div className="sf-next-variant-options">
            {(group.values ?? []).map((value) => {
              const active = selectedValueIds.has(value.id);
              const disabled = !isValueAvailable(group.id, value.id);
              const outOfStock = disabled && isValueOutOfStock(group.id, value.id);
              return (
                <UnifiedButton
                  key={value.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectSpecValue(group.id, value.id)}
                  className={cn(
                    "sf-next-variant-option",
                    active && "is-active",
                  )}
                >
                  {value.image_url ? (
                    <span className="mr-2 inline-block w-5 align-middle">
                      <RatioImage
                        src={ensureMediaUrl(value.image_url)}
                        alt={`${group.name} ${value.value}`}
                        ratio={THEME_PRODUCT_MEDIA_RATIO}
                        rounded="sm"
                        imgClassName="object-cover"
                        sizes="20px"
                        loading="lazy"
                      />
                    </span>
                  ) : null}
                  {value.value}
                  {active ? <CheckCircle2 size={13} className="ml-1 inline-block align-[-2px]" /> : null}
                  {outOfStock ? (
                    <span className="sf-next-variant-option__stock">
                      缺货
                    </span>
                  ) : null}
                </UnifiedButton>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  ) : variants.length > 0 ? (
    <div>
      <p className="sf-next-variant-label">规格</p>
      <div className="sf-next-variant-options sf-next-variant-options--grid">
        {variants.map((variant) => {
          const active = variant.id === selectedVariantId;
          const disabled = variant.enabled === false || variant.stock <= 0;
          return (
            <UnifiedButton
              key={variant.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectVariant(variant.id)}
              className={cn(
                "sf-next-variant-option",
                active && "is-active",
              )}
            >
              {variant.image_url ? (
                <span className="w-6 shrink-0">
                  <RatioImage
                    src={ensureMediaUrl(variant.image_url)}
                    alt={variant.spec_text || variant.title || variant.sku_code || "规格图"}
                    ratio={THEME_PRODUCT_MEDIA_RATIO}
                    rounded="sm"
                    imgClassName="object-cover"
                    sizes="24px"
                    loading="lazy"
                  />
                </span>
              ) : null}
              <span className="min-w-0 truncate">
                {variant.spec_text || variant.title || variant.sku_code || "默认规格"}
              </span>
              {active ? <CheckCircle2 size={13} className="shrink-0" /> : null}
              {variant.stock <= 0 ? (
                <span className="sf-next-variant-option__stock">
                  缺货
                </span>
              ) : null}
            </UnifiedButton>
          );
        })}
      </div>
    </div>
  ) : null;

  const couponSelector = couponEnabled && purchaseCoupon ? (
    <div className="sf-next-variant-coupon">
      <div className="sf-next-variant-label">
        <Ticket size={16} className="text-[var(--theme-price)]" />
        优惠
      </div>
      <CouponPicker
        embedded
        totalAmount={lineTotal}
        selectedCouponId={purchaseCoupon.selectedCoupon?.id ?? null}
        onSelect={purchaseCoupon.onSelect}
        coupons={purchaseCoupon.coupons}
        unusableCoupons={purchaseCoupon.unusableCoupons}
        loading={purchaseCoupon.loading}
      />
    </div>
  ) : null;

  const activityRuleCard = activeActivity ? (
    <section className="sf-next-variant-activity" aria-label="当前活动规则">
      <div className="sf-next-variant-activity__head">
        <div className="min-w-0">
          <div className="sf-next-variant-activity__kicker">
            <span>{activityTypeLabel(activeActivity.type)}</span>
            <b>{activityStatusLabel(activeActivity)}</b>
          </div>
          <h3>{activeActivity.title}</h3>
          {activeActivity.description ? <p>{activeActivity.description}</p> : null}
        </div>
        <div className="sf-next-variant-activity__amount">
          {activityPrice > 0 && isActivityPriceDeal ? (
            <>
              <span>活动价</span>
              <strong>RM {formatMoney(activityPrice)}</strong>
            </>
          ) : activityThreshold > 0 && activityDiscount > 0 ? (
            <>
              <span>满减</span>
              <strong>减 RM {formatMoney(activityDiscount)}</strong>
            </>
          ) : (
            <>
              <span>优惠</span>
              <strong>结算匹配</strong>
            </>
          )}
        </div>
      </div>

      <div className="sf-next-variant-activity__facts">
        <span>
          <Clock3 size={14} aria-hidden />
          {formatActivityDateTime(activeActivity.start_at)} - {formatActivityDateTime(activeActivity.end_at)}
        </span>
        <span>
          <ShieldCheck size={14} aria-hidden />
          {activityLimit > 0 ? `每人限购 ${activityLimit} 件` : "下单时确认限购数量"}
        </span>
      </div>

      {activityProgressPercent != null ? (
        <div className="sf-next-variant-activity__progress">
          <div className="sf-next-variant-activity__progress-meta">
            <span>活动库存</span>
            <strong>
              {activityStockTotal > 0
                ? `已售 ${activitySold} / 剩余 ${activityRemaining}`
                : `剩余 ${activityRemaining}`}
            </strong>
          </div>
          <div className="sf-next-variant-activity__track" aria-hidden>
            <span style={{ width: `${activityProgressPercent}%` }} />
          </div>
          {activitySavingAmount > 0 ? (
            <p>当前规格命中活动预计可省 RM {formatMoney(activitySavingAmount)}，结算页会显示最终优惠。</p>
          ) : null}
        </div>
      ) : null}

      <p className="sf-next-variant-activity__safe">
        活动价、库存、限购、优惠券和叠加关系会在结算页确认。
      </p>
    </section>
  ) : null;

  const selectedSummary = (
    <div className="sf-next-variant-selected-summary">
      已选：
      <span className="font-semibold text-[var(--theme-text)]"> {selectedSpecLabel}</span>
      {selectedCouponLabel ? <span>，{selectedCouponLabel}</span> : null}
      <span>，{qty}件</span>
    </div>
  );

  const productDetailList = (
    <div className="sf-next-variant-detail">
      <h3>商品详情</h3>
      <div className="sf-next-variant-detail__list">
        <ul>
          {productDetailItems.map((item, index) => (
            <li key={`${item}-${index}`}>
              <CheckCircle2 size={14} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const purchaseControls = (
    <div className="sf-next-variant-controls">
      {variantSelector}

      {selected ? (
        <p className="sf-next-variant-stock">
          {selected.spec_text || selected.title || selected.sku_code || "默认规格"} · 库存 {selected.stock}
        </p>
      ) : null}

      {activityRuleCard}

      {couponSelector}

      <div className="sf-next-variant-quantity-row">
        <span className="sf-next-variant-label">数量</span>
        {qtyStepper}
      </div>

      {selectedSummary}
    </div>
  );

  return (
    <>
      <AppModal
        tier="immersive"
        open={open}
        onClose={onClose}
        title={modalTitle}
        height="90vh"
        presentation={isMobile ? "sheet" : "dialog"}
        dialogClassName="sm:max-w-[860px]"
        closeButtonPlacement={intent === "buy" ? "outside" : "inside"}
        closeButtonClassName={
          intent === "buy"
            ? "bg-[var(--theme-surface)] shadow-[var(--theme-shadow-control)] hover:bg-[var(--theme-bg)]"
            : undefined
        }
        className={cn(
          "sf-next-variant-sheet",
          intent === "buy" &&
            "[&_.app-bottom-sheet-header]:px-4 [&_.app-bottom-sheet-header]:pb-2 [&_.app-bottom-sheet-header]:pt-1 [&_.app-bottom-sheet-content]:pt-1",
        )}
        stickyFooter
        footer={
          intent === "buy" ? (
            <UnifiedButton
              type="button"
              disabled={soldOut || maxQty <= 0 || (hasMatrix && !selected)}
              onClick={onConfirm}
              className="sf-next-variant-submit"
            >
              {footerActionContent}
            </UnifiedButton>
          ) : (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--theme-text-muted)]">合计</p>
                <p className="truncate text-2xl font-black tabular-nums text-[var(--theme-price)]">
                  RM {formatMoney(currentPrice)}
                </p>
              </div>
              <UnifiedButton
                type="button"
                disabled={soldOut || maxQty <= 0 || (hasMatrix && !selected)}
                onClick={onConfirm}
                className="sf-next-variant-submit sf-next-variant-submit--compact"
              >
                {footerActionContent}
              </UnifiedButton>
            </div>
          )
        }
      >
        <div className="sf-next-variant-sheet__layout">
          <div className="space-y-4">
            {productSummary}
            <div className="hidden lg:block">{productDetailList}</div>
          </div>
          <div className="space-y-5">
            {purchaseControls}
            <div className="lg:hidden">{productDetailList}</div>
          </div>
        </div>
      </AppModal>

      <AppModal
        tier="standard"
        open={discountDetailOpen}
        onClose={() => setDiscountDetailOpen(false)}
        title="优惠明细"
        height="auto"
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-[var(--theme-bg)] px-4 py-3">
            <span className="text-[var(--theme-text-muted)]">商品小计</span>
            <span className="font-semibold tabular-nums text-[var(--theme-text)]">
              RM {formatMoney(originalTotal)}
            </span>
          </div>
          {productDiscount > 0 ? (
            <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--theme-price)_8%,var(--theme-surface))] px-4 py-3">
              <span className="text-[var(--theme-text-muted)]">商品优惠</span>
              <span className="font-semibold tabular-nums text-[var(--theme-price)]">
                -RM {formatMoney(productDiscount)}
              </span>
            </div>
          ) : null}
          {couponDiscount > 0 ? (
            <div className="flex items-start justify-between gap-3 rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[var(--theme-text-muted)]">优惠券</p>
                <p className="mt-0.5 truncate text-xs text-[var(--theme-text-muted)]">
                  {purchaseCoupon?.selectedCoupon?.title || "已使用优惠券"}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-[var(--theme-price)]">
                -RM {formatMoney(couponDiscount)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[var(--theme-border)] px-1 pt-3">
            <span className="font-semibold text-[var(--theme-text)]">预计实付</span>
            <span className="text-xl font-black tabular-nums text-[var(--theme-price)]">
              RM {formatMoney(payableTotal)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--theme-text-muted)]">
            实际优惠和应付金额以结算页为准。
          </p>
        </div>
      </AppModal>
    </>
  );
}
