import { useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, Plus } from "lucide-react";
import "@/styles/product-card-v2.css";
import ProductCoverImage from "@/components/ProductCoverImage";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { showStoreToast } from "@/utils/storeToast";
import { storefrontV2Tokens as t } from "../design/tokens";
import StorefrontBadge from "../components/StorefrontBadge";
import StorefrontPrice from "../components/StorefrontPrice";
import { buildProductCardV2Model } from "./productCardV2Model";
import type { Product } from "@/types/product";

type ProductCardV2Props = {
  product: Product;
  index?: number;
  variant?: "grid" | "compact" | "list";
  className?: string;
  showPrice?: boolean;
  showQuickAction?: boolean;
  onClick?: () => void;
};

export default function ProductCardV2({
  product,
  index = 0,
  variant = "grid",
  className,
  showPrice = true,
  showQuickAction = true,
  onClick,
}: ProductCardV2Props) {
  const vm = buildProductCardV2Model(product);
  const href = vm.href;
  const loading = index < 8 ? "eager" : "lazy";
  const fetchPriority = index === 0 ? "high" : undefined;
  const navigate = useStorefrontNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [adding, setAdding] = useState(false);
  const enabledVariants = product.variants?.filter((candidate) => candidate.enabled !== false) || [];
  const explicitVariantCount = Number(
    product.enabled_sku_count
      ?? product.sku_count
      ?? (product as Product & { variant_count?: number | null }).variant_count
      ?? enabledVariants.length,
  );
  const requiresVariantSelection = Number.isFinite(explicitVariantCount) && explicitVariantCount > 1;
  const defaultVariant = product.default_variant ?? (enabledVariants.length === 1 ? enabledVariants[0] : null);
  const quickActionLabel = vm.soldOut
    ? `${vm.name} 已售罄`
    : requiresVariantSelection
      ? `选择 ${vm.name} 的规格`
      : `加入购物车 ${vm.name}`;

  const handleQuickAction = async () => {
    if (adding || vm.soldOut) return;
    if (requiresVariantSelection) {
      onClick?.();
      navigate(href);
      return;
    }

    setAdding(true);
    try {
      await addItem(product, 1, defaultVariant);
      showStoreToast.success("已加入购物车", toastPresetQuickSuccess);
    } catch (error) {
      showStoreToast.error(error instanceof Error ? error.message : "加入购物车失败");
    } finally {
      setAdding(false);
    }
  };

  if (variant === "list") {
    return (
      <article
        data-product-card-variant={variant}
        className={cn(
          "sf-next-product-card sf-next-product-card--list",
          "group grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] items-stretch gap-3",
          className,
        )}
      >
        <Link
          to={href}
          onClick={onClick}
          className="sf-next-product-card__media h-full min-h-[5.75rem] w-full self-stretch sm:min-h-24"
          aria-label={`查看 ${vm.name}`}
        >
          <ProductCoverImage
            url={vm.imageUrl}
            alt={vm.imageAlt}
            className="h-full w-full"
            imgClassName="h-full w-full"
            fit="cover"
            loading={loading}
            fetchPriority={fetchPriority}
            sizes="96px"
          />
          {vm.soldOut ? <SoldOutMask /> : null}
        </Link>

        <div className="sf-next-product-card__info flex min-h-[5.75rem] min-w-0 flex-col sm:min-h-24">
          <div className="sf-next-product-card__copy min-w-0">
            <Link to={href} onClick={onClick} className="sf-next-product-card__title-link">
              <h3 className={cn(t.text.productTitle, "sf-next-product-card__title")}>{vm.name}</h3>
            </Link>
            <div className="sf-next-product-card__meta-strip">
              <BadgeRow badges={vm.badges} subtle className="sf-next-product-card__badges" />
              <DecisionMetaRow items={vm.decisionTexts} className="sf-next-product-card__decision" />
            </div>
            <ActivityProgressBar
              className="sf-next-product-card__activity"
              percent={vm.activityProgressPercent}
              text={vm.activityProgressText}
            />
          </div>
          {showPrice ? (
            <div className="sf-next-product-card__buy mt-auto flex items-end justify-between gap-2 pt-2">
              <StorefrontPrice amount={vm.priceText} originalAmount={vm.originalPriceText} />
              {showQuickAction ? (
                <UnifiedButton
                  type="button"
                  disabled={vm.soldOut || adding}
                  onClick={() => void handleQuickAction()}
                  aria-label={adding ? `正在加入 ${vm.name}` : quickActionLabel}
                  className={cn(
                    "sf-next-product-card__cart sf-next-product-card__cart--list shrink-0",
                    vm.soldOut && "is-disabled",
                  )}
                >
                  {adding
                    ? <LoaderCircle size={17} className="animate-spin" aria-hidden />
                    : <Plus size={17} strokeWidth={2.4} aria-hidden />}
                </UnifiedButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      data-product-card-variant={variant}
      className={cn(
        "sf-next-product-card sf-next-product-card--grid",
        "group flex min-w-0 flex-col",
        variant === "compact" && "sf-next-product-card--compact",
        className,
      )}
    >
      <Link
        to={href}
        onClick={onClick}
        className="sf-next-product-card__media"
        aria-label={`查看 ${vm.name}`}
      >
        <ProductCoverImage
          url={vm.imageUrl}
          alt={vm.imageAlt}
          className="h-full w-full"
          imgClassName="h-full w-full transition duration-300 group-hover:scale-[1.025]"
          fit="cover"
          loading={loading}
          fetchPriority={fetchPriority}
          sizes="(max-width: 768px) 50vw, 260px"
        />

        <div className="sf-next-product-card__badges-overlay absolute left-2 top-2 flex max-w-[calc(100%-16px)] flex-wrap gap-1">
          {vm.badges.map((badge) => (
            <StorefrontBadge key={badge.key} tone={badge.tone}>
              {badge.label}
            </StorefrontBadge>
          ))}
        </div>

        {vm.soldOut ? <SoldOutMask /> : null}
      </Link>

      <div className="sf-next-product-card__info flex flex-col">
        <Link to={href} onClick={onClick} className="sf-next-product-card__title-link">
          <h3 className={cn(t.text.productTitle, "sf-next-product-card__title")}>{vm.name}</h3>
        </Link>
        {showPrice ? (
          <div className={cn(
            "sf-next-product-card__footer flex items-end justify-between gap-2 pt-2.5",
            !showQuickAction && "sf-next-product-card__footer--price-only",
          )}>
            <StorefrontPrice className="sf-next-product-card__price" amount={vm.priceText} originalAmount={vm.originalPriceText} />
            {showQuickAction ? (
              <UnifiedButton
                type="button"
                disabled={vm.soldOut || adding}
                onClick={() => void handleQuickAction()}
                aria-label={adding ? `正在加入 ${vm.name}` : quickActionLabel}
                className={cn("sf-next-product-card__cart", vm.soldOut && "is-disabled")}
              >
                {adding
                  ? <LoaderCircle size={17} className="animate-spin" aria-hidden />
                  : <Plus size={17} strokeWidth={2.4} aria-hidden />}
              </UnifiedButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ActivityProgressBar({ percent, text, className }: { percent?: number; text?: string; className?: string }) {
  if (!percent && !text) return null;
  const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
  return (
    <div className={cn("mt-2 min-h-[1.1rem]", className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-border)_70%,transparent)]">
        <div
          className="h-full rounded-full bg-[var(--theme-price)] transition-[width]"
          style={{ width: `${safePercent}%` }}
        />
      </div>
      {text ? <p className="mt-1 truncate text-[11px] leading-4 text-[var(--theme-text-muted)]">{text}</p> : null}
    </div>
  );
}

function DecisionMetaRow({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn("mt-1.5 flex min-h-[1rem] min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-[var(--theme-text-muted)]", className)}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1">
          {index > 0 ? <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--theme-border)]" aria-hidden /> : null}
          <span className="truncate">{item}</span>
        </span>
      ))}
    </div>
  );
}

function BadgeRow({ badges, subtle = false, className }: { badges: Array<{ key: string; label: string; tone: "hot" | "new" | "sale" | "normal" }>; subtle?: boolean; className?: string }) {
  if (!badges.length) return null;
  return (
    <div className={cn("mt-1 flex flex-wrap gap-1", className)}>
      {badges.slice(0, 2).map((badge) => (
        <StorefrontBadge key={badge.key} tone={subtle ? "normal" : badge.tone}>
          {badge.label}
        </StorefrontBadge>
      ))}
    </div>
  );
}

function SoldOutMask() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--sf-ink)_42%,transparent)] text-xs font-bold text-[var(--sf-surface)]">
      已售罄
    </div>
  );
}
